// ===== SERVIDOR AUTOCONTENIDO NATIVO (SIN DEPENDENCIAS EXTERNAS) =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const db = require('./database');
const economyEngine = require('./economy_engine');
const telegramStars = require('./telegram_stars');
// Catálogo jugable canónico: tracks_data.json es la fuente de la que también
// se genera tracks_data.js. El catálogo orgánico legacy de track_generator.js
// no se acepta para rankings ni se anuncia como circuitos jugables.
let RaceTracksCatalog = {};
try {
    RaceTracksCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'tracks_data.json'), 'utf8'));
} catch (e) {
    console.warn('⚠️ No se pudo cargar tracks_data.json para validar resultados:', e.message);
}
const PlayableTracksCatalog = Object.values(RaceTracksCatalog || {})
    .filter(track => track && typeof track.id === 'string' && typeof track.name === 'string')
    .map(track => ({
        id: track.id,
        name: track.name,
        cols: Number(track.cols) || 0,
        rows: Number(track.rows) || 0,
        tileSize: Number(track.tileSize) || 256,
        worldWidth: Number(track.worldWidth) || 0,
        worldHeight: Number(track.worldHeight) || 0
    }));

const APP_VERSION = '1.0.5';
const PORT = process.env.PORT || 3000;

function envFlag(name, defaultValue) {
    const raw = String(process.env[name] ?? '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
    if (['0', 'false', 'no', 'off'].includes(raw)) return false;
    return defaultValue;
}

// Interruptores operativos v105. Permiten apagar una superficie económica sin
// desplegar código nuevo. Las apuestas, el mercado P2P y el torneo semanal
// quedan apagados hasta tener liquidación/escrow autoritativos completos.
const FEATURES = {
    economyActionsEnabled: envFlag('ECONOMY_ACTIONS_ENABLED', true),
    tonPurchasesEnabled: envFlag('TON_PURCHASES_ENABLED', true),
    telegramTonPurchasesEnabled: envFlag('TELEGRAM_TON_PURCHASES_ENABLED', false),
    telegramStarsPurchasesEnabled: envFlag('TELEGRAM_STARS_PURCHASES_ENABLED', true),
    nftEntitlementsEnabled: envFlag('NFT_ENTITLEMENTS_ENABLED', true),
    nftMintingEnabled: envFlag('TON_NFT_MINTING_ENABLED', false),
    wagerStakesEnabled: envFlag('ENABLE_WAGER_STAKES', false),
    marketplaceEnabled: envFlag('ENABLE_MARKETPLACE', false),
    weeklyTournamentEnabled: envFlag('ENABLE_WEEKLY_TOURNAMENT', false),
    referralRewardsEnabled: envFlag('ENABLE_REFERRAL_REWARDS', true),
    adRewardsEnabled: envFlag('ENABLE_AD_REWARDS', true)
};
const SUPPORT_CONTACT = String(process.env.SUPPORT_CONTACT || '').trim().slice(0, 120);
const SUPPORT_URL = String(process.env.SUPPORT_URL || '').trim().slice(0, 300);
const DB_BACKUP_ENABLED = envFlag('DB_BACKUP_ENABLED', true);
const DB_BACKUP_INTERVAL_MS = Math.max(15 * 60 * 1000, (Number(process.env.DB_BACKUP_INTERVAL_HOURS) || 6) * 60 * 60 * 1000);
const DB_BACKUP_RETENTION = Math.max(1, Math.min(100, Math.floor(Number(process.env.DB_BACKUP_RETENTION) || 14)));
const DB_BACKUP_DIR = process.env.DB_BACKUP_DIR
    ? path.resolve(process.env.DB_BACKUP_DIR)
    : path.join(path.dirname(db.DB_FILE), 'apex_backups');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER_EXTERNAL_URL);
const ALLOW_INSECURE_DEV_AUTH = process.env.ALLOW_INSECURE_DEV_AUTH === 'true' && !IS_PRODUCTION;
const ENABLE_LEGACY_WAGER_API = process.env.ENABLE_LEGACY_WAGER_API === 'true';
const ADMIN_AUDIT_TOKEN = process.env.ADMIN_AUDIT_TOKEN || '';
const ADSGRAM_WEBHOOK_SECRET = process.env.ADSGRAM_WEBHOOK_SECRET || '';
const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || Boolean(process.env.RENDER_EXTERNAL_URL);
const MAX_API_BODY_BYTES = 64 * 1024;
// Solo para la suite local: permite no esperar la duración física mínima de
// una carrera al probar sesiones. En producción se ignora siempre.
const RACE_SESSION_MIN_AGE_MS = (!IS_PRODUCTION && process.env.RACE_SESSION_MIN_AGE_MS !== undefined)
    ? Math.max(0, Number(process.env.RACE_SESSION_MIN_AGE_MS) || 0)
    : null;
const RACE_SESSION_TTL_MS = 60 * 60 * 1000;

// ===== TESORERÍA TON Y PAQUETES $CR (v103) =====
// Wallet oficial del proyecto: recibe los pagos TON de los paquetes de $CR.
// Es una dirección pública de recepción; se puede sobrescribir por entorno.
// Ningún $CR se acredita hasta que el servidor verifica on-chain una
// transferencia entrante con el comentario (= id de pedido) e importe >=
// el del paquete. Los $CR siguen siendo moneda interna sin retirada a TON.
const TREASURY_WALLET_ADDRESS = process.env.TREASURY_WALLET_ADDRESS || 'UQD4ivLM7PJ7XpX_CflUUhoZW361xvOH4WP869C9WghJAN4X';
// v105 solo prepara la conversión NFT: identidad global, snapshot y
// entitlement único. TON_NFT_MINTING_ENABLED seguirá en false hasta tener el
// contrato auditado/probado en testnet y TON Connect con ton_proof; ningún
// endpoint debe fingir que un coche ya está acuñado sin esa configuración.
function positiveNanotonEnv(name, fallback) {
    const value = String(process.env[name] || '').trim();
    return /^[1-9]\d{0,18}$/.test(value) ? value : fallback;
}
const NFT_CONFIG = {
    network: String(process.env.TON_NFT_NETWORK || 'ton-testnet').trim() === 'ton-mainnet' ? 'ton-mainnet' : 'ton-testnet',
    collectionAddress: String(process.env.TON_NFT_COLLECTION_ADDRESS || '').trim().slice(0, 120) || null,
    collectionOwnerAddress: String(process.env.TON_NFT_COLLECTION_OWNER_ADDRESS || TREASURY_WALLET_ADDRESS).trim().slice(0, 120),
    royaltyFactor: 50,
    royaltyBase: 1000,
    royaltyPercent: 5,
    royaltyAddress: String(process.env.TON_NFT_ROYALTY_ADDRESS || TREASURY_WALLET_ADDRESS).trim().slice(0, 120),
    claimAmountNanotons: positiveNanotonEnv('TON_NFT_CLAIM_AMOUNT_NANOTONS', '40000000'),
    itemReserveNanotons: positiveNanotonEnv('TON_NFT_ITEM_RESERVE_NANOTONS', '15000000'),
    collectionReserveNanotons: positiveNanotonEnv('TON_NFT_COLLECTION_RESERVE_NANOTONS', '5000000'),
    metadataBaseUrl: String(process.env.TON_NFT_METADATA_BASE_URL || '').trim().replace(/\/+$/, '').slice(0, 300) || null
};
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
const TONAPI_KEY = process.env.TONAPI_KEY || '';
// Solo fuera de producción: libro mayor ficticio para probar el flujo de
// compra sin tocar la red TON real. En producción se ignora siempre.
const TON_MOCK_LEDGER_FILE = (!IS_PRODUCTION && process.env.TON_MOCK_LEDGER_FILE) ? process.env.TON_MOCK_LEDGER_FILE : '';
// Ancla económica aprobada para la tienda: 1.000 $CR = 1 USDT. El importe
// en TON nunca es una equivalencia fija: el servidor consulta TON/USDT al
// crear el pedido y bloquea cotización, nanotons y entrega en ese pedido.
const CR_PER_USDT = 1000;
const TON_USDT_RATE_OVERRIDE = String(process.env.TON_USDT_RATE_OVERRIDE || '').trim();
const TON_RATE_CACHE_MS = 60 * 1000;
const TON_RATE_STALE_MAX_MS = 10 * 60 * 1000;
const TON_QUOTE_GRACE_SEC = 120;
const TON_CR_PACKAGES = [
    { id: 'cr_ton_001', productType: 'cr', name: 'Mini bolsa $CR', ton: '0.01', amountNanotons: '10000000' },
    { id: 'cr_ton_1', productType: 'cr', name: 'Bolsa $CR', ton: '1', amountNanotons: '1000000000' },
    { id: 'cr_ton_5', productType: 'cr', name: 'Baúl $CR', ton: '5', amountNanotons: '5000000000' }
];
const TON_CRATE_PRODUCTS = [
    { id: 'crate_bronze', productType: 'crate', crateId: 'bronze', priceUsdt: '1', priceCr: 1000, label: 'Cofre Rookie NFT' },
    { id: 'crate_silver', productType: 'crate', crateId: 'silver', priceUsdt: '5', priceCr: 5000, label: 'Cofre Clubman NFT' },
    { id: 'crate_gold', productType: 'crate', crateId: 'gold', priceUsdt: '25', priceCr: 25000, label: 'Cofre Apex Pro NFT' }
];
const PURCHASE_PRODUCTS = [...TON_CR_PACKAGES, ...TON_CRATE_PRODUCTS];
const PURCHASE_ORDER_TTL_MS = 60 * 60 * 1000;
const PURCHASE_MAX_PENDING_PER_USER = 3;
const purchaseVerifyCache = new Map(); // orderId -> última verificación on-chain (ms)
let tonUsdtRateCache = null;
let tonUsdtRatePromise = null;

// ===== MOTOR DE SEGURIDAD, AUDITORÍA Y PROTECCIÓN ANTI-BOTS =====
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const activeMatchTickets = new Map();
const rateLimitMap = new Map();
// Compatibilidad con los puntos antiguos de registro: ahora cada evento se
// persiste en SQLite en vez de vivir solo en un array en memoria.
const securityAuditLogs = {
    push(entry) {
        try {
            const details = { ...(entry || {}) };
            const event = details.event || 'security_event';
            const userId = details.userId || details.saveId || null;
            delete details.event;
            delete details.userId;
            delete details.saveId;
            delete details.time;
            delete details.timeStamp;
            db.recordAuditEvent(userId, event, details);
        } catch (e) {}
    }
};

// ===== SISTEMA MULTIJUGADOR REAL: SALAS PÚBLICAS Y DUELOS PRIVADOS =====
const publicLobbies = new Map(); // roomId -> active lobby
const privateDuels = new Map();  // duelCode -> private duel room
const raceSessions = new Map();  // sessionId -> carrera registrada y de un solo uso

const AI_BOT_POOL = [
    { name: "🤖 Bot_Klaus", carName: "Bavaria ROWE M4", archetype: "dtm_coupe", colorHex: "#15803d" },
    { name: "🤖 Bot_Matteo", carName: "Scuderia 488 GT3", archetype: "ferrari_corsa", colorHex: "#e53935" },
    { name: "🤖 Bot_Kenji", carName: "Tokyo Supra Turbo", archetype: "jdm_supra", colorHex: "#a855f7" },
    { name: "🤖 Bot_Lucas", carName: "Valkyrie AMR Pro", archetype: "le_mans_proto", colorHex: "#0284c7" }
];

const WAGER_CIRCUITS_DEFAULT = [
    { id: 'rookie_ring', name: 'Rookie Ring Speedway', env: 'asphalt' },
    { id: 'radiator_oval', name: 'Radiator Oval Park', env: 'asphalt' },
    { id: 'curvastone_park', name: 'Curvastone GP Park', env: 'asphalt' },
    { id: 'monza', name: 'Monza Speed Ring', env: 'asphalt' }
];

function getRandomCircuit() {
    return WAGER_CIRCUITS_DEFAULT[Math.floor(Math.random() * WAGER_CIRCUITS_DEFAULT.length)];
}

// Salas públicas autorizadas y su buy-in oficial; el cliente no puede crear
// salas arbitrarias ni alterar el importe que verán otros jugadores.
const PUBLIC_WAGER_ROOMS = {
    room_bronze: 5,
    room_silver: 10,
    room_gold: 20,
    room_elite: 50
};

function createDuelCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(8);
    let suffix = '';
    for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % alphabet.length];
    return 'DUEL-' + suffix;
}

function cleanDuelCode(value) {
    const code = String(value || '').toUpperCase().trim();
    return /^DUEL-[A-Z0-9-]{4,16}$/.test(code) ? code : '';
}

function sanitizeSlot(slot) {
    if (!slot || typeof slot !== 'object') return slot;
    const cleanId = value => String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    const rawStake = Number(slot.stake);
    // Lista blanca explícita, alineada con el cliente: no se reenvían campos
    // arbitrarios de red ni stakes fuera del rango permitido en duelos/salas.
    return {
        id: cleanId(slot.id),
        userId: cleanId(slot.userId),
        name: cleanText(slot.name, 40, 'PILOTO'),
        carName: cleanText(slot.carName, 80, 'GT3 Racer'),
        colorHex: cleanColorHex(slot.colorHex),
        archetype: cleanArchetype(slot.archetype),
        roleLabel: cleanText(slot.roleLabel, 80, 'JUGADOR'),
        status: cleanText(slot.status, 30, 'LISTO'),
        stake: Number.isFinite(rawStake) ? Math.max(0, Math.min(10000, rawStake)) : 0,
        isAI: slot.isAI === true,
        isPlayer: slot.isPlayer === true,
        isSelf: slot.isSelf === true
    };
}

function publicUserId(rawUserId, viewerUserId = '') {
    const id = String(rawUserId || '');
    if (!id || id === String(viewerUserId || '') || id.startsWith('ai_')) return id;
    // Los demás jugadores solo necesitan distinguir slots, no conocer el ID
    // persistente de la cuenta. El seudónimo es estable dentro del servidor
    // mientras SERVER_SECRET_KEY no cambie, pero no sirve como credencial.
    return 'pub_' + crypto.createHmac('sha256', SERVER_SECRET_KEY)
        .update(`public-user:${id}`)
        .digest('hex')
        .slice(0, 24);
}

function publicSlotView(slot, viewerUserId = '') {
    const clean = sanitizeSlot(slot);
    if (!clean || typeof clean !== 'object') return clean;
    const rawUserId = String(slot && slot.userId || '');
    const maskedUserId = publicUserId(rawUserId, viewerUserId);
    return {
        ...clean,
        id: rawUserId && clean.id === `player_${rawUserId}` ? `player_${maskedUserId}` : clean.id,
        userId: maskedUserId,
        isSelf: Boolean(viewerUserId && rawUserId === String(viewerUserId))
    };
}

function publicLobbyView(lobby, viewerUserId = '') {
    if (!lobby) return lobby;
    return {
        id: cleanText(lobby.id, 80),
        roomId: cleanText(lobby.roomId, 40),
        buyIn: Number(lobby.buyIn) || 0,
        circuit: lobby.circuit ? {
            id: cleanText(lobby.circuit.id, 60),
            name: cleanText(lobby.circuit.name, 80, 'Circuito')
        } : lobby.circuit,
        createdAt: Number(lobby.createdAt) || 0,
        expiresAt: Number(lobby.expiresAt) || 0,
        status: cleanText(lobby.status, 30, 'WAITING'),
        slots: Array.isArray(lobby.slots) ? lobby.slots.map(slot => publicSlotView(slot, viewerUserId)) : []
    };
}

function publicDuelView(duel, viewerUserId = '') {
    if (!duel) return duel;
    const slots = Array.isArray(duel.slots) ? duel.slots : [];
    const viewer = String(viewerUserId || '');
    return {
        code: cleanDuelCode(duel.code),
        betAmount: Math.max(0, Math.min(10000, Number(duel.betAmount) || 0)),
        circuit: duel.circuit ? {
            id: cleanText(duel.circuit.id, 60),
            name: cleanText(duel.circuit.name, 80, 'Circuito')
        } : duel.circuit,
        createdAt: Number(duel.createdAt) || 0,
        expiresAt: Number(duel.expiresAt) || 0,
        hostUserId: publicUserId(duel.hostUserId, viewer),
        isHost: Boolean(viewer && String(duel.hostUserId || '') === viewer),
        isParticipant: Boolean(viewer && slots.some(slot => slot && String(slot.userId || '') === viewer)),
        status: cleanText(duel.status, 30, 'WAITING'),
        slots: slots.map(slot => publicSlotView(slot, viewer))
    };
}

// Cortafuegos de seguridad de tesorería (Emergency Circuit Breaker)
const emergencyCircuitBreaker = {
    isTriggered: false,
    hourlyVolumePaid: 0,
    hourlyLimit: 50000, // Máximo 50.000 $CR repartidos por hora antes de auto-bloqueo preventivo
    lastReset: Date.now(),
    blockedAttemptsCount: 0
};

// Límites físicos mínimos por vuelta para detección de teletransporte / speedhack
const TRACK_PHYSICAL_LIMITS = {
    'rookie_ring': { minLapSeconds: 12.0, totalLaps: 3 },
    'radiator_oval': { minLapSeconds: 11.0, totalLaps: 3 },
    'curvastone_park': { minLapSeconds: 16.0, totalLaps: 3 },
    'twister_chicanes': { minLapSeconds: 18.0, totalLaps: 3 },
    'neo_tokyo_bay': { minLapSeconds: 22.0, totalLaps: 3 },
    'monza': { minLapSeconds: 19.0, totalLaps: 3 },
    'default': { minLapSeconds: 12.0, totalLaps: 3 }
};

// Verificación de firma criptográfica de Telegram WebApp
function verifyTelegramWebAppData(initDataString, botToken) {
    if (!botToken) {
        return { valid: false, notConfigured: true, reason: 'BOT_TOKEN no configurado en el servidor' };
    }
    if (!initDataString) {
        return { valid: false, reason: 'Falta initData de Telegram' };
    }
    try {
        const urlParams = new URLSearchParams(initDataString);
        const hash = urlParams.get('hash');
        if (!hash) return { valid: false, reason: 'Falta hash criptográfico de Telegram' };

        urlParams.delete('hash');
        const sortedParams = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');

        if (!timingSafeEqualString(calculatedHash, hash)) {
            return { valid: false, reason: 'Firma HMAC adulterada (posible bot o suplantación)' };
        }

        const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
        const nowSeconds = Date.now() / 1000;
        if (!Number.isFinite(authDate) || authDate <= 0 || nowSeconds - authDate > 86400) {
            return { valid: false, reason: 'Sesión expirada (>24h anti-replay)' };
        }
        if (authDate - nowSeconds > 300) {
            return { valid: false, reason: 'auth_date de Telegram está en el futuro' };
        }

        return { valid: true, user: JSON.parse(urlParams.get('user') || '{}') };
    } catch (e) {
        return { valid: false, reason: e.message };
    }
}

// Limitador de tasa anti-fuerza bruta y anti-scraping.
// La clave incluye endpoint/usuario para que el polling de estado no consuma
// el presupuesto de mutaciones y para purgar entradas caducadas.
function getClientIp(req) {
    if (TRUST_PROXY) {
        const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        if (forwarded) return forwarded.slice(0, 64);
    }
    return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(key, limitPerMinute = 30) {
    const now = Date.now();
    if (rateLimitMap.size > 5000) {
        for (const [k, v] of rateLimitMap.entries()) {
            if (now > v.resetAt) rateLimitMap.delete(k);
        }
    }
    const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + 60000 };
    if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + 60000;
        rateLimitMap.set(key, entry);
        return { allowed: true };
    }
    entry.count++;
    rateLimitMap.set(key, entry);
    if (entry.count > limitPerMinute) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { allowed: true };
}

function sendJson(res, status, payload) {
    if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function cleanText(value, maxLength = 80, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, maxLength);
    return text || fallback;
}

function cleanColorHex(value, fallback = '#00f5d4') {
    const text = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function cleanArchetype(value) {
    const text = String(value || '').trim().toLowerCase();
    return /^[a-z0-9_-]{2,40}$/.test(text) ? text : 'ferrari_corsa';
}

function timingSafeEqualString(a, b) {
    const aa = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

// ===== GUARDADO EN SERVIDOR (v100): utilidades =====
// Lee un cuerpo JSON con límite de tamaño (evita abusos / DoS con cuerpos gigantes)
function readJsonBody(req, res, maxBytes, onOk) {
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        sendJson(res, 413, { ok: false, error: 'payload_too_large', message: 'La petición supera el tamaño máximo permitido' });
        req.destroy();
        return;
    }
    let body = '';
    let bodyBytes = 0;
    let aborted = false;
    req.on('data', chunk => {
        if (aborted) return;
        bodyBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
        if (bodyBytes > maxBytes) {
            aborted = true;
            sendJson(res, 413, { ok: false, error: 'payload_too_large', message: 'La petición supera el tamaño máximo permitido' });
            req.destroy();
            return;
        }
        body += chunk;
    });
    req.on('end', () => {
        if (aborted) return;
        try {
            onOk(JSON.parse(body || '{}'));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'invalid_json', message: e.message }));
        }
    });
    req.on('error', () => {});
}

function isValidSaveId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{3,64}$/.test(id);
}

function isTelegramNumericId(id) {
    return /^\d{3,20}$/.test(String(id || ''));
}

function isDeviceId(id) {
    return /^usr_[A-Za-z0-9_-]{4,60}$/.test(String(id || ''));
}

function getTelegramInitData(req, body) {
    return req.headers['x-telegram-init-data'] || (body && typeof body.initData === 'string' ? body.initData : '');
}

// Autorización común para acciones de usuario:
// - ID numérico: debe coincidir con un initData de Telegram firmado.
// - usr_...: ID público de dispositivo + X-Device-Secret aleatorio separado.
//   El servidor conserva solo el hash del secreto; ver el ID en una sala ya no
//   permite leer o sobrescribir la partida.
// - Sin BOT_TOKEN, las acciones con ID numérico fallan cerradas salvo
//   ALLOW_INSECURE_DEV_AUTH=true en un entorno no productivo.
function authorizeKnownUser(req, userId, body) {
    const id = String(userId || '');
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) {
        return { ok: false, status: 400, error: 'invalid_user_id', reason: 'userId no válido' };
    }
    if (isTelegramNumericId(id)) {
        if (!BOT_TOKEN) {
            if (ALLOW_INSECURE_DEV_AUTH) return { ok: true, userId: id, authMode: 'insecure_dev' };
            return { ok: false, status: 503, error: 'auth_not_configured', reason: 'BOT_TOKEN no configurado; autenticación Telegram no disponible' };
        }
        const initData = getTelegramInitData(req, body);
        if (!initData) return { ok: false, status: 401, error: 'missing_telegram_init_data', reason: 'Falta initData de Telegram para este ID' };
        const check = verifyTelegramWebAppData(initData, BOT_TOKEN);
        if (!check.valid) return { ok: false, status: 403, error: 'invalid_telegram_init_data', reason: check.reason || 'initData no válido' };
        if (!check.user || String(check.user.id) !== id) {
            return { ok: false, status: 403, error: 'telegram_user_mismatch', reason: 'El usuario de Telegram no coincide con el recurso' };
        }
        return { ok: true, userId: id, authMode: 'telegram', telegramUser: check.user };
    }
    if (isDeviceId(id)) {
        const deviceSecret = req && req.headers ? req.headers['x-device-secret'] : '';
        if (!deviceSecret && ALLOW_INSECURE_DEV_AUTH) {
            return { ok: true, userId: id, authMode: 'insecure_dev' };
        }
        if (typeof db.verifyOrRegisterDeviceSecret !== 'function') {
            return { ok: false, status: 503, error: 'device_auth_not_configured', reason: 'Autenticación de dispositivo no disponible' };
        }
        const deviceCheck = db.verifyOrRegisterDeviceSecret(id, deviceSecret);
        if (!deviceCheck.ok) {
            return {
                ok: false,
                status: 401,
                error: deviceSecret ? 'invalid_device_secret' : 'missing_device_secret',
                reason: 'Se requiere la credencial secreta de este dispositivo'
            };
        }
        return {
            ok: true,
            userId: id,
            authMode: 'device_secret',
            deviceCredentialRegistered: deviceCheck.registered === true
        };
    }
    if (ALLOW_INSECURE_DEV_AUTH) return { ok: true, userId: id, authMode: 'insecure_dev' };
    return { ok: false, status: 401, error: 'unsupported_user_id', reason: 'Se requiere un ID de Telegram verificado o un ID de dispositivo usr_' };
}

function authorizeSaveAccess(req, saveId) {
    return authorizeKnownUser(req, saveId);
}

function requireKnownUser(req, res, userId, body) {
    const auth = authorizeKnownUser(req, userId, body);
    if (!auth.ok) {
        securityAuditLogs.push({ event: 'USER_AUTH_FAILED', userId: String(userId || '').slice(0, 64), error: auth.error, time: new Date().toISOString() });
        sendJson(res, auth.status || 403, { ok: false, success: false, error: auth.error || 'forbidden', reason: auth.reason });
        return null;
    }
    return auth;
}

// Para polling de salas: si el cliente se identifica correctamente puede ver
// su propio ID/isSelf; si no, recibe la misma vista con todos los IDs ajenos
// seudonimizados. Nunca se confía en un userId de query sin credencial.
function optionalViewerUserId(req, rawUserId) {
    const id = String(rawUserId || '').trim();
    if (!id) return '';
    const auth = authorizeKnownUser(req, id);
    return auth.ok ? auth.userId : '';
}

function economyProfileResponse(profile) {
    if (!profile) return null;
    return {
        version: profile.version,
        garage: profile.garage,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
    };
}

function applyServerEconomyAction(userId, action, args = {}, idempotencyKey = null, details = {}) {
    return db.applyEconomyMutation(userId, action, idempotencyKey, (garage) => {
        return economyEngine.applyAction(garage, action, args);
    }, details);
}

function isAdminRequest(req) {
    if (!ADMIN_AUDIT_TOKEN) return false;
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const suppliedToken = req.headers['x-admin-token'] || bearer;
    return timingSafeEqualString(suppliedToken, ADMIN_AUDIT_TOKEN);
}

function requireAdminRequest(req, res) {
    if (!ADMIN_AUDIT_TOKEN) {
        sendJson(res, 503, { ok: false, error: 'admin_not_configured', message: 'Configura ADMIN_AUDIT_TOKEN para habilitar herramientas administrativas' });
        return false;
    }
    if (!isAdminRequest(req)) {
        securityAuditLogs.push({ event: 'ADMIN_AUTH_FAILED', ip: getClientIp(req), time: new Date().toISOString() });
        sendJson(res, 403, { ok: false, error: 'forbidden' });
        return false;
    }
    return true;
}

const PUBLIC_ECONOMY_ACTIONS = new Set([
    'buy_energy_pack', 'buy_nitros', 'consume_nitro', 'open_crate',
    'upgrade_branch', 'buy_parts_kit', 'buy_shop_component', 'claim_milestone',
    'claim_season_tier', 'claim_daily_mission', 'sign_sponsor',
    'claim_sponsor', 'equip_car', 'link_email'
]);

function validateEconomyActionArgs(action, args) {
    const isId = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(value);
    const isKey = value => typeof value === 'string' && /^[a-z0-9_-]{1,80}$/i.test(value);
    switch (action) {
        case 'buy_energy_pack':
            return isKey(args.packKey) && (args.targetInstanceId == null || isId(args.targetInstanceId));
        case 'buy_nitros':
            return [1, 5, 20].includes(Number(args.amount));
        case 'consume_nitro':
            return true;
        case 'open_crate':
            return ['bronze', 'silver', 'gold'].includes(String(args.crateKey || ''));
        case 'upgrade_branch':
            return isId(args.instanceId) && ['speed_power', 'braking', 'handling_grip', 'accel_traction', 'aero_lightness'].includes(String(args.branchKey || ''));
        case 'buy_parts_kit':
            return isKey(args.kitKey);
        case 'buy_shop_component':
            return ['turbo', 'tires', 'brakes'].includes(String(args.component || args.type || ''));
        case 'claim_milestone':
            return isId(args.instanceId) && [10, 20, 30, 40, 50].includes(Number(args.milestoneLevel))
                && ['potencia', 'velocidad', 'aceleracion', 'agarre', 'frenada', 'manejo', 'turbo', 'downforce', 'traccion', 'ligereza'].includes(String(args.statName || ''));
        case 'claim_season_tier':
            return Number.isInteger(Number(args.tier)) && Number(args.tier) >= 1 && Number(args.tier) <= 5;
        case 'claim_daily_mission':
            return ['m_races', 'm_slipstream', 'm_drift', 'm_speed'].includes(String(args.missionId || ''));
        case 'sign_sponsor':
        case 'claim_sponsor':
            return isKey(args.contractId);
        case 'equip_car':
            return isId(args.instanceId);
        case 'link_email':
            return typeof args.email === 'string' && args.email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email);
        default:
            return false;
    }
}

async function createScheduledDatabaseBackup(reason = 'scheduled') {
    if (!DB_BACKUP_ENABLED && reason === 'scheduled') return null;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(DB_BACKUP_DIR, `apex-sqlite-${stamp}.sqlite`);
    await db.backupDatabaseTo(destination);
    try {
        const files = fs.readdirSync(DB_BACKUP_DIR)
            .filter(name => /^apex-sqlite-.*\.sqlite$/.test(name))
            .map(name => ({ name, mtime: fs.statSync(path.join(DB_BACKUP_DIR, name)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        for (const stale of files.slice(DB_BACKUP_RETENTION)) {
            try { fs.unlinkSync(path.join(DB_BACKUP_DIR, stale.name)); } catch (e) {}
        }
    } catch (e) {}
    console.log(`💾 Copia SQLite (${reason}) creada: ${destination}`);
    return destination;
}

function scheduleDatabaseBackups() {
    if (!DB_BACKUP_ENABLED) return;
    const initial = setTimeout(() => {
        createScheduledDatabaseBackup('startup').catch(e => console.warn('⚠️ Copia SQLite inicial falló:', e.message));
    }, 60 * 1000);
    if (typeof initial.unref === 'function') initial.unref();
    const timer = setInterval(() => {
        createScheduledDatabaseBackup('scheduled').catch(e => console.warn('⚠️ Copia SQLite programada falló:', e.message));
    }, DB_BACKUP_INTERVAL_MS);
    if (typeof timer.unref === 'function') timer.unref();
}

// ===== VERIFICACIÓN ON-CHAIN DE PAGOS TON (v103) =====
// El pedido usa su propio id como comentario de la transferencia. El
// servidor busca en indexadores públicos una transferencia entrante a la
// tesorería con ese comentario exacto e importe suficiente posterior a la
// creación del pedido. Sin coincidencia no hay $CR: el cliente no puede
// "declarar" un pago.
function tonFriendlyToRaw(address) {
    try {
        const buf = Buffer.from(String(address).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        if (buf.length !== 36) return '';
        const workchain = buf[1] > 127 ? buf[1] - 256 : buf[1];
        return `${workchain}:${buf.subarray(2, 34).toString('hex')}`;
    } catch (e) {
        return '';
    }
}

function normalizeTonAddress(address) {
    const raw = String(address || '').trim().toLowerCase();
    if (/^-?\d+:[0-9a-f]{64}$/.test(raw)) return raw;
    return tonFriendlyToRaw(address).toLowerCase();
}

const TREASURY_RAW_ADDRESS = normalizeTonAddress(TREASURY_WALLET_ADDRESS);

async function fetchJsonWithTimeout(url, headers = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

function tonAmountGte(seen, expected) {
    try {
        return BigInt(String(seen)) >= BigInt(String(expected));
    } catch (e) {
        return false;
    }
}

function formatScaledDecimal(value, scaleDigits) {
    let scaled;
    try {
        scaled = BigInt(String(value));
    } catch (e) {
        return '0';
    }
    const negative = scaled < 0n;
    const absolute = negative ? -scaled : scaled;
    const scale = 10n ** BigInt(scaleDigits);
    const whole = absolute / scale;
    const fraction = (absolute % scale).toString().padStart(scaleDigits, '0').replace(/0+$/, '');
    return `${negative ? '-' : ''}${whole}${fraction ? '.' + fraction : ''}`;
}

function formatNanotonsToTon(amountNanotons) {
    return formatScaledDecimal(amountNanotons, 9);
}

function makeTonUsdtQuote(rawRate, source) {
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate < 0.01 || rate > 100) {
        throw new Error('ton_rate_out_of_range');
    }
    const rateMicro = BigInt(Math.round(rate * 1000000));
    if (rateMicro <= 0n) throw new Error('ton_rate_out_of_range');
    const fetchedAtMs = Date.now();
    return {
        rate: formatScaledDecimal(rateMicro, 6),
        rateMicro,
        source,
        fetchedAt: new Date(fetchedAtMs).toISOString(),
        fetchedAtMs,
        stale: false
    };
}

async function fetchTonUsdtQuoteFromTonapi() {
    const headers = { Accept: 'application/json' };
    if (TONAPI_KEY) headers.Authorization = `Bearer ${TONAPI_KEY}`;
    const data = await fetchJsonWithTimeout(
        'https://tonapi.io/v2/rates?tokens=ton&currencies=usdt,usd',
        headers,
        6000
    );
    const prices = data && data.rates && data.rates.TON && data.rates.TON.prices
        ? data.rates.TON.prices
        : {};
    if (prices.USDT !== undefined) return makeTonUsdtQuote(prices.USDT, 'tonapi_usdt');
    if (prices.USD !== undefined) return makeTonUsdtQuote(prices.USD, 'tonapi_usd_proxy');
    throw new Error('tonapi_rate_missing');
}

async function fetchTonUsdtQuoteFromCoingecko() {
    const data = await fetchJsonWithTimeout(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
        { Accept: 'application/json' },
        6000
    );
    const usd = data && data['the-open-network'] ? data['the-open-network'].usd : undefined;
    if (usd === undefined) throw new Error('coingecko_rate_missing');
    return makeTonUsdtQuote(usd, 'coingecko_usd_proxy');
}

async function getTonUsdtQuote() {
    if (TON_USDT_RATE_OVERRIDE) {
        return makeTonUsdtQuote(TON_USDT_RATE_OVERRIDE, 'env_override');
    }

    const now = Date.now();
    if (tonUsdtRateCache && now - tonUsdtRateCache.fetchedAtMs < TON_RATE_CACHE_MS) {
        return tonUsdtRateCache;
    }
    if (tonUsdtRatePromise) return tonUsdtRatePromise;

    tonUsdtRatePromise = (async () => {
        const failures = [];
        try {
            const quote = await fetchTonUsdtQuoteFromTonapi();
            tonUsdtRateCache = quote;
            return quote;
        } catch (e) {
            failures.push(e.message || 'tonapi_failed');
        }
        try {
            const quote = await fetchTonUsdtQuoteFromCoingecko();
            tonUsdtRateCache = quote;
            return quote;
        } catch (e) {
            failures.push(e.message || 'coingecko_failed');
        }

        // Una cotización reciente (<=10 min) es preferible a vender a ciegas;
        // más allá de ese margen no se crea ningún pedido ni instrucción.
        if (tonUsdtRateCache && Date.now() - tonUsdtRateCache.fetchedAtMs <= TON_RATE_STALE_MAX_MS) {
            return { ...tonUsdtRateCache, stale: true };
        }
        throw new Error('ton_rate_unavailable:' + failures.join(','));
    })();

    const clearPromise = () => { tonUsdtRatePromise = null; };
    tonUsdtRatePromise.then(clearPromise, clearPromise);
    return tonUsdtRatePromise;
}

function buildPurchaseProductView(definition, quote) {
    let amountNanotons;
    let cr = 0;
    let priceUsdt;
    let priceCr = null;
    let label = definition.label || definition.name || definition.id;

    if (definition.productType === 'crate') {
        const numerator = BigInt(definition.priceUsdt) * 1000000000000000n;
        amountNanotons = (numerator + quote.rateMicro - 1n) / quote.rateMicro;
        priceUsdt = definition.priceUsdt;
        priceCr = definition.priceCr;
    } else {
        amountNanotons = BigInt(definition.amountNanotons);
        // $CR = TON * (USDT/TON) * 1.000. En enteros:
        // nanotons * microUSDT / 10^12, redondeando hacia abajo.
        const crAmount = (amountNanotons * quote.rateMicro) / 1000000000000n;
        cr = Number(crAmount);
        const priceUsdtMicro = (amountNanotons * quote.rateMicro) / 1000000000n;
        priceUsdt = formatScaledDecimal(priceUsdtMicro, 6);
        label = `${definition.name} · ${cr.toLocaleString('es-ES')} $CR`;
    }

    const amountTon = formatNanotonsToTon(amountNanotons);
    return {
        id: definition.id,
        packageId: definition.id,
        productType: definition.productType,
        crateId: definition.crateId || null,
        label,
        ton: amountTon,
        amountTon,
        amountNanotons: amountNanotons.toString(),
        cr,
        priceUsdt,
        priceCr,
        crPerUsdt: CR_PER_USDT,
        tonUsdtRate: quote.rate,
        tonUsdtRateMicro: quote.rateMicro.toString(),
        rateSource: quote.source,
        quotedAt: quote.fetchedAt,
        quoteStale: quote.stale === true
    };
}

function findPurchaseProduct(productId) {
    return PURCHASE_PRODUCTS.find(entry => entry.id === String(productId || '')) || null;
}

function purchaseQuotePublicFields(quote) {
    return {
        crPerUsdt: CR_PER_USDT,
        tonUsdtRate: quote.rate,
        rateSource: quote.source,
        quotedAt: quote.fetchedAt,
        quoteStale: quote.stale === true
    };
}

function isPaymentTimestampInWindow(timestamp, minTimestampSec, maxTimestampSec) {
    const ts = Number(timestamp || 0);
    if (ts > 0) {
        return ts >= minTimestampSec && (!maxTimestampSec || ts <= maxTimestampSec);
    }
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= minTimestampSec && (!maxTimestampSec || nowSec <= maxTimestampSec);
}

async function findTonPaymentViaToncenter(order, minTimestampSec, maxTimestampSec) {
    const headers = { Accept: 'application/json' };
    if (TONCENTER_API_KEY) headers['X-Api-Key'] = TONCENTER_API_KEY;
    const data = await fetchJsonWithTimeout(
        `https://toncenter.com/api/v3/transactions?account=${encodeURIComponent(TREASURY_WALLET_ADDRESS)}&limit=100&sort=desc`,
        headers
    );
    const transactions = Array.isArray(data && data.transactions) ? data.transactions : [];
    for (const tx of transactions) {
        const inMsg = tx && tx.in_msg;
        if (!inMsg || !inMsg.source) continue;
        const timestamp = Number(tx.now || 0);
        if (!isPaymentTimestampInWindow(timestamp, minTimestampSec, maxTimestampSec)) continue;
        if (inMsg.destination && normalizeTonAddress(inMsg.destination) !== TREASURY_RAW_ADDRESS) continue;

        const decoded = (inMsg.message_content && inMsg.message_content.decoded) || inMsg.decoded_body || inMsg.decoded || null;
        let comment = decoded && typeof decoded.comment === 'string' ? decoded.comment : '';
        if (comment !== order.id) {
            // Respaldo: el cuerpo BOC de un comentario de texto contiene los
            // bytes UTF-8 en claro, así que puede localizarse el id sin un
            // decodificador de celdas completo.
            const bodyB64 = inMsg.message_content && inMsg.message_content.body;
            if (bodyB64) {
                try {
                    if (Buffer.from(String(bodyB64), 'base64').includes(Buffer.from(order.id, 'utf8'))) comment = order.id;
                } catch (e) {}
            }
        }
        if (comment !== order.id) continue;
        if (!tonAmountGte(inMsg.value, order.amountNanotons)) continue;
        return {
            txHash: String(tx.hash || ''),
            amountNanotons: String(inMsg.value || ''),
            sender: String(inMsg.source || ''),
            timestamp
        };
    }
    return null;
}

async function findTonPaymentViaTonapi(order, minTimestampSec, maxTimestampSec) {
    const headers = { Accept: 'application/json' };
    if (TONAPI_KEY) headers.Authorization = `Bearer ${TONAPI_KEY}`;
    const data = await fetchJsonWithTimeout(
        `https://tonapi.io/v2/accounts/${encodeURIComponent(TREASURY_WALLET_ADDRESS)}/events?limit=100&start_date=${minTimestampSec}`,
        headers
    );
    const events = Array.isArray(data && data.events) ? data.events : [];
    for (const event of events) {
        const timestamp = Number(event && event.timestamp || 0);
        if (!isPaymentTimestampInWindow(timestamp, minTimestampSec, maxTimestampSec)) continue;
        const actions = Array.isArray(event && event.actions) ? event.actions : [];
        for (const action of actions) {
            if (!action || action.type !== 'TonTransfer' || !action.TonTransfer) continue;
            const transfer = action.TonTransfer;
            const recipient = transfer.recipient && transfer.recipient.address;
            if (!recipient || normalizeTonAddress(recipient) !== TREASURY_RAW_ADDRESS) continue;
            if (String(transfer.comment || '') !== order.id) continue;
            if (!tonAmountGte(transfer.amount, order.amountNanotons)) continue;
            return {
                txHash: String(event.event_id || ''),
                amountNanotons: String(transfer.amount || ''),
                sender: String((transfer.sender && transfer.sender.address) || ''),
                timestamp
            };
        }
    }
    return null;
}

// Solo tests (TON_MOCK_LEDGER_FILE está vacío en producción): lee un JSON
// [{comment, amountNanotons, txHash, sender, timestamp}] como si fuera la red.
function findTonPaymentInMockLedger(order, minTimestampSec, maxTimestampSec) {
    try {
        const entries = JSON.parse(fs.readFileSync(TON_MOCK_LEDGER_FILE, 'utf8'));
        if (!Array.isArray(entries)) return null;
        for (const entry of entries) {
            if (!entry || String(entry.comment || '') !== order.id) continue;
            const timestamp = Number(entry.timestamp || 0);
            if (!isPaymentTimestampInWindow(timestamp, minTimestampSec, maxTimestampSec)) continue;
            if (!tonAmountGte(entry.amountNanotons, order.amountNanotons)) continue;
            return {
                txHash: String(entry.txHash || ('mock_' + order.id)),
                amountNanotons: String(entry.amountNanotons || ''),
                sender: String(entry.sender || ''),
                timestamp
            };
        }
    } catch (e) {}
    return null;
}

async function findTonPayment(order) {
    const minTimestampSec = Math.max(0, Math.floor(Number(order.createdAtMs || Date.now()) / 1000) - 120);
    const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
    // La cotización bloqueada solo se honra si la transacción entró dentro
    // de su ventana (más 120 s de gracia). Detectarla tarde sí es válido;
    // pagar meses después con un importe calculado a otro precio, no.
    const maxTimestampSec = expiresAtMs ? Math.floor(expiresAtMs / 1000) + TON_QUOTE_GRACE_SEC : 0;
    if (TON_MOCK_LEDGER_FILE) return findTonPaymentInMockLedger(order, minTimestampSec, maxTimestampSec);
    try {
        const viaToncenter = await findTonPaymentViaToncenter(order, minTimestampSec, maxTimestampSec);
        if (viaToncenter) return viaToncenter;
    } catch (e) {
        console.warn('⚠️ Toncenter no disponible para verificar un pago:', e.message);
    }
    try {
        return await findTonPaymentViaTonapi(order, minTimestampSec, maxTimestampSec);
    } catch (e) {
        console.warn('⚠️ TonAPI no disponible para verificar un pago:', e.message);
        return null;
    }
}

function purchaseIsTelegramStars(order) {
    return Boolean(order && order.paymentProvider === 'telegram_stars');
}

function publicPurchaseView(order) {
    if (!order) return null;
    if (purchaseIsTelegramStars(order)) return telegramStars.publicStarsOrder(order);
    const productType = order.productType || 'cr';
    const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
    return {
        id: order.id,
        packageId: order.packageId,
        productId: order.packageId,
        paymentProvider: 'ton',
        productType,
        crateId: order.crateId || null,
        label: order.label || (productType === 'crate' ? 'Cofre NFT' : 'Paquete $CR'),
        cr: Number(order.cr || 0),
        priceUsdt: order.priceUsdt || undefined,
        priceCr: order.priceCr === undefined ? null : order.priceCr,
        crPerUsdt: Number(order.crPerUsdt || CR_PER_USDT),
        tonUsdtRate: order.tonUsdtRate || undefined,
        tonUsdtRateMicro: order.tonUsdtRateMicro || undefined,
        rateSource: order.rateSource || undefined,
        quotedAt: order.quotedAt || undefined,
        quoteStale: order.quoteStale === true,
        amountTon: order.amountTon || formatNanotonsToTon(order.amountNanotons),
        amountNanotons: order.amountNanotons,
        status: order.status,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        expiresAtMs: expiresAtMs || undefined,
        quoteExpired: order.status === 'pending' && expiresAtMs > 0 && Date.now() > expiresAtMs + TON_QUOTE_GRACE_SEC * 1000,
        txHash: order.txHash || undefined
    };
}

function purchasePaymentLinks(order) {
    if (purchaseIsTelegramStars(order)) {
        return {
            paymentProvider: 'telegram_stars',
            currency: 'XTR',
            priceStars: Math.floor(Number(order.priceStars) || 0),
            invoiceUrl: order.status === 'pending' ? (order.invoiceUrl || null) : null
        };
    }
    const text = encodeURIComponent(order.id);
    return {
        address: TREASURY_WALLET_ADDRESS,
        amountTon: order.amountTon,
        amountNanotons: order.amountNanotons,
        comment: order.id,
        tonkeeperUrl: `https://app.tonkeeper.com/transfer/${TREASURY_WALLET_ADDRESS}?amount=${order.amountNanotons}&text=${text}`,
        tonUrl: `ton://transfer/${TREASURY_WALLET_ADDRESS}?amount=${order.amountNanotons}&text=${text}`
    };
}

function publicBaseUrl(req) {
    const configured = String(process.env.PUBLIC_BASE_URL || process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
    if (configured) return configured;
    const proto = TRUST_PROXY && req.headers['x-forwarded-proto']
        ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
        : 'http';
    const host = String(req.headers.host || 'localhost').replace(/[^A-Za-z0-9.:-]/g, '').slice(0, 120);
    return `${proto === 'https' ? 'https' : 'http'}://${host || 'localhost'}`;
}

const NFT_METADATA_ARCHETYPES = new Set([
    'viper_acr', 'le_mans_proto', 'jdm_supra', 'rally_evo', 'hot_hatch',
    'ferrari_corsa', 'porsche_boxer', 'bentley_gt3', 'dakar_truck',
    'lambo_wedge', 'bugatti_w16', 'dtm_coupe'
]);

function nftPublicConfig(req) {
    const baseUrl = NFT_CONFIG.metadataBaseUrl || publicBaseUrl(req);
    const mintingConfigured = Boolean(NFT_CONFIG.collectionAddress);
    return {
        entitlementsEnabled: FEATURES.nftEntitlementsEnabled,
        mintingEnabled: FEATURES.nftMintingEnabled && mintingConfigured,
        mintingConfigured,
        network: NFT_CONFIG.network,
        collectionAddress: NFT_CONFIG.collectionAddress,
        collectionOwnerAddress: NFT_CONFIG.collectionOwnerAddress,
        royaltyFactor: NFT_CONFIG.royaltyFactor,
        royaltyBase: NFT_CONFIG.royaltyBase,
        royaltyPercent: NFT_CONFIG.royaltyPercent,
        royaltyAddress: NFT_CONFIG.royaltyAddress,
        claimAmountNanotons: NFT_CONFIG.claimAmountNanotons,
        claimAmountTon: formatNanotonsToTon(NFT_CONFIG.claimAmountNanotons),
        itemReserveNanotons: NFT_CONFIG.itemReserveNanotons,
        collectionReserveNanotons: NFT_CONFIG.collectionReserveNanotons,
        metadataBaseUrl: baseUrl,
        collectionMetadataUrl: `${baseUrl}/api/nft/collection-metadata`
    };
}

function publicNftRegistryView(registry) {
    if (!registry) return null;
    return {
        serial: registry.serial,
        registryId: registry.registryId,
        carInstanceId: registry.carInstanceId,
        status: registry.status,
        chainNetwork: registry.chainNetwork,
        collectionAddress: registry.collectionAddress,
        nftItemAddress: registry.nftItemAddress,
        nftIndex: registry.nftIndex,
        ownerWalletAddress: registry.ownerWalletAddress,
        mintTxHash: registry.mintTxHash,
        metadataHash: registry.metadataHash,
        snapshot: registry.snapshot,
        createdAt: registry.createdAt,
        updatedAt: registry.updatedAt
    };
}

function publicNftClaimView(claim, req) {
    if (!claim) return null;
    const config = nftPublicConfig(req);
    return {
        claimId: claim.claimId,
        registrySerial: claim.registrySerial,
        carInstanceId: claim.carInstanceId,
        status: claim.status,
        network: claim.network,
        walletAddress: claim.walletAddress,
        walletVerifiedAt: claim.walletVerifiedAt,
        metadataUri: claim.metadataUri || `${config.metadataBaseUrl}/api/nft/metadata/${claim.registrySerial}`,
        metadataHash: claim.metadataHash,
        snapshot: claim.snapshot,
        txHash: claim.txHash,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt
    };
}

function nftMetadataForEntry(req, entry) {
    const config = nftPublicConfig(req);
    const registry = entry.registry;
    const snapshot = registry.snapshot || {};
    const archetype = NFT_METADATA_ARCHETYPES.has(String(snapshot.archetype || ''))
        ? String(snapshot.archetype)
        : null;
    const image = archetype
        ? `${config.metadataBaseUrl}/assets/cars_side/${archetype}.jpg`
        : `${config.metadataBaseUrl}/assets/apex_cr_coin_256.jpg`;
    const stats = snapshot.baseStats || {};
    const attributes = [
        { trait_type: 'Registry ID', value: registry.registryId },
        { trait_type: 'Global Serial', value: registry.serial },
        { trait_type: 'NFT Index', value: registry.nftIndex },
        { trait_type: 'Model ID', value: snapshot.modelId || '' },
        { trait_type: 'Rarity', value: snapshot.rarity || '' },
        { trait_type: 'Color', value: snapshot.colorName || '' },
        { trait_type: 'Color Hex', value: snapshot.colorHex || '' },
        { trait_type: 'Visual ID', value: snapshot.visualId == null ? '' : snapshot.visualId },
        ...Object.entries(stats).map(([key, value]) => ({ trait_type: `Base ${key}`, value: Number(value) || 0 }))
    ];
    return {
        name: `Apex Motorsport — ${snapshot.name || 'Apex GT'} #${registry.serial}`,
        description: 'Coche jugable de Apex Motorsport con identidad global registrada en servidor. El modelo, rareza, color y estadísticas base de esta ficha son la foto inmutable preparada para su conversión opcional a NFT en TON; nivel, XP, energía y mejoras se conservan fuera de cadena por identidad del coche.',
        image,
        external_url: config.metadataBaseUrl,
        attributes
    };
}

// Limpieza periódica para evitar crecimiento indefinido de estado en memoria.
function cleanupEphemeralState() {
    const now = Date.now();
    for (const [ticketId, ticket] of activeMatchTickets.entries()) {
        if (!ticket || now - Number(ticket.issuedAt || 0) > 30 * 60 * 1000) activeMatchTickets.delete(ticketId);
    }
    for (const [code, duel] of privateDuels.entries()) {
        if (!duel || now > Number(duel.expiresAt || 0) + 5 * 60 * 1000) privateDuels.delete(code);
    }
    for (const [roomId, lobby] of publicLobbies.entries()) {
        if (!lobby || now > Number(lobby.expiresAt || 0) + 5 * 60 * 1000) publicLobbies.delete(roomId);
    }
    for (const [sessionId, session] of raceSessions.entries()) {
        if (!session || now > Number(session.expiresAt || 0)) raceSessions.delete(sessionId);
    }
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > Number(entry.resetAt || 0)) rateLimitMap.delete(key);
    }
    for (const [orderId, checkedAt] of purchaseVerifyCache.entries()) {
        if (now - Number(checkedAt || 0) > 2 * 60 * 60 * 1000) purchaseVerifyCache.delete(orderId);
    }
}
const cleanupTimer = setInterval(cleanupEphemeralState, 60 * 1000);
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

// Lista blanca estática: solo el cliente activo y sus assets públicos.
// Nunca se sirven código de servidor, BD, tests, documentación, checkpoints
// ni archivos ocultos/.git desde la raíz del repositorio.
const PUBLIC_ROOT_FILES = new Set([
    'index.html',
    'style.css',
    'hub_styles.css',
    'translations.js',
    'nft_cars_data.js',
    'cloud_save.js',
    'tracks_data.js',
    'dustrac_game.js',
    'game_hub.js',
    'favicon.svg',
    'favicon.ico',
    'terms.html',
    'privacy.html',
    'support.html'
]);
const PUBLIC_ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.mp3', '.ogg', '.wav', '.js', '.json']);

function resolvePublicStaticPath(rawPathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(rawPathname || '/');
    } catch (e) {
        return null;
    }
    if (decoded === '/' || decoded === '') return path.join(__dirname, 'index.html');
    if (decoded === '/favicon.ico') return path.join(__dirname, 'favicon.svg');

    const relative = decoded.replace(/^\/+/, '');
    const normalized = path.normalize(relative);
    if (!normalized || normalized === '.' || normalized.startsWith('..' + path.sep) || path.isAbsolute(normalized)) return null;
    const segments = normalized.split(path.sep);
    if (segments.some(segment => !segment || segment.startsWith('.'))) return null;

    if (segments.length === 1 && PUBLIC_ROOT_FILES.has(normalized)) {
        return path.join(__dirname, normalized);
    }
    if (segments[0] === 'assets' && PUBLIC_ASSET_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
        return path.join(__dirname, normalized);
    }
    return null;
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const clientIp = getClientIp(req);

    // Cabeceras de seguridad. Se aplica ya en modo enforce el subconjunto que
    // no depende de retirar handlers inline (objetos, base, formularios y
    // encuadre). La política completa sigue en Report-Only hasta eliminar los
    // handlers inline y retestar todos los dominios reales de Adsgram.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // v104: política completa ya en modo enforce. Todavía permite inline
    // porque la UI histórica usa handlers inline; retirar 'unsafe-inline'
    // queda como endurecimiento posterior, pero ya se bloquean scripts,
    // objetos, conexiones y encuadres fuera de la lista permitida.
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org https://sad.adsgram.ai https://*.adsgram.ai",
        "script-src-attr 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://telegram.org https://*.telegram.org wss://*.telegram.org https://sad.adsgram.ai https://*.adsgram.ai",
        "frame-src 'self' https://*.telegram.org https://*.adsgram.ai",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '));
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || String(process.env.RENDER_EXTERNAL_URL || '').startsWith('https://');
    if (IS_PRODUCTION && isHttps) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // CORS restrictivo: el juego usa la API same-origin. Solo se reflejan
    // orígenes del mismo host o los configurados en ALLOWED_ORIGINS.
    const requestOrigin = req.headers.origin;
    const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
    let originAllowed = false;
    if (requestOrigin) {
        try {
            const originUrl = new URL(requestOrigin);
            originAllowed = originUrl.host === req.headers.host || configuredOrigins.includes(requestOrigin);
        } catch (e) { originAllowed = false; }
    }
    if (originAllowed) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, X-Device-Secret, X-Admin-Token, X-Adsgram-Secret');
    }

    if (req.method === 'OPTIONS') {
        if (!pathname.startsWith('/api/') || (requestOrigin && !originAllowed)) {
            sendJson(res, 403, { ok: false, error: 'cors_forbidden' });
            return;
        }
        res.writeHead(204);
        res.end();
        return;
    }

    // Limitador por IP + endpoint. El polling de salas tiene su propio cubo
    // para no agotar el presupuesto de guardado/mutaciones.
    if (pathname.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
        const isStatusPoll = pathname === '/api/multiplayer/public/status' || pathname === '/api/multiplayer/duel/status';
        const isReadOnly = req.method === 'GET';
        const actor = cleanText(parsedUrl.searchParams.get('userId') || parsedUrl.searchParams.get('code') || '', 64);
        const bucket = `${clientIp}:${req.method}:${pathname}:${actor}`;
        const limit = isStatusPoll ? 240 : (isReadOnly ? 120 : 60);
        const rateCheck = checkRateLimit(bucket, limit);
        if (!rateCheck.allowed) {
            res.setHeader('Retry-After', String(rateCheck.retryAfter));
            sendJson(res, 429, { ok: false, error: 'too_many_requests', message: 'Tasa de peticiones excedida (protección anti-bots)', retryAfter: rateCheck.retryAfter });
            return;
        }
        if (requestOrigin && !originAllowed && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            sendJson(res, 403, { ok: false, error: 'cors_forbidden' });
            return;
        }
    }

    if (pathname === '/healthz') {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
            return;
        }
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'HEAD') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end();
            return;
        }
        sendJson(res, 200, { ok: true, service: 'apex-motorsport', version: APP_VERSION, uptimeSeconds: Math.round(process.uptime()) });
        return;
    }

    // ===== RUTAS DE API =====
    // Webhook de recompensa publicitaria. Crea un derecho de un solo uso en
    // SQLite; el cliente lo reclama después y el servidor aplica la recompensa.
    if (pathname === '/api/ad-reward') {
        if (req.method !== 'POST' && req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
            return;
        }
        if (!ADSGRAM_WEBHOOK_SECRET) {
            sendJson(res, 503, { ok: false, error: 'ad_reward_not_configured', message: 'Webhook publicitario deshabilitado: falta ADSGRAM_WEBHOOK_SECRET' });
            return;
        }
        const suppliedSecret = req.headers['x-adsgram-secret'] || parsedUrl.searchParams.get('secret') || '';
        if (!timingSafeEqualString(suppliedSecret, ADSGRAM_WEBHOOK_SECRET)) {
            securityAuditLogs.push({ event: 'AD_REWARD_AUTH_FAILED', ip: clientIp, time: new Date().toISOString() });
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
        }
        const userId = cleanText(parsedUrl.searchParams.get('userid') || parsedUrl.searchParams.get('userId') || '', 64);
        // Adsgram sustituye [userId] por el ID de Telegram. Sin ese ID no hay
        // cuenta a la que asignar la recompensa; no se aceptan IDs inventados.
        if (!isTelegramNumericId(userId)) {
            sendJson(res, 422, { ok: false, error: 'invalid_adsgram_user_id' });
            return;
        }
        const rewardTypeRaw = String(parsedUrl.searchParams.get('reward') || parsedUrl.searchParams.get('rewardType') || 'generic').toLowerCase();
        const rewardType = ['energy', 'nitro', 'generic'].includes(rewardTypeRaw) ? rewardTypeRaw : 'generic';
        const explicitSource = parsedUrl.searchParams.get('event_id')
            || parsedUrl.searchParams.get('transaction_id')
            || parsedUrl.searchParams.get('impression_id')
            || parsedUrl.searchParams.get('id')
            || '';
        // Adsgram no documenta un ID único obligatorio en su Reward URL. Si
        // no llega ninguno, una ventana de 30 s absorbe reintentos inmediatos
        // sin convertir cada reintento en una segunda recompensa.
        const sourceId = explicitSource
            ? `adsgram:${String(explicitSource).slice(0, 120)}`
            : `adsgram:${userId}:${rewardType}:${Math.floor(Date.now() / 30000)}`;
        const entitlement = FEATURES.adRewardsEnabled
            ? db.createAdRewardEntitlement(userId, rewardType, sourceId)
            : { ok: false, error: 'ad_rewards_disabled' };
        securityAuditLogs.push({ event: entitlement.duplicate ? 'AD_REWARD_DUPLICATE' : 'AD_REWARD_ENTITLEMENT_CREATED', userId, rewardType, duplicate: Boolean(entitlement.duplicate), time: new Date().toISOString() });
        console.log(`💰 Adsgram Reward Webhook autenticado para userId: ${userId}`);
        sendJson(res, 200, {
            ok: Boolean(entitlement.ok),
            status: entitlement.ok ? 'reward_entitlement_created' : 'ad_rewards_disabled',
            duplicate: Boolean(entitlement.duplicate),
            userId,
            rewardType,
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Estado interno de seguridad: solo con token de administrador. No se
    // publican logs, tickets, tesorería ni el detalle de defensas.
    if (pathname === '/api/security/audit') {
        if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
            return;
        }
        if (!requireAdminRequest(req, res)) return;
        sendJson(res, 200, {
            ok: true,
            status: 'admin_only',
            timestamp: new Date().toISOString(),
            telegramAuthConfigured: Boolean(BOT_TOKEN),
            insecureDevAuthEnabled: ALLOW_INSECURE_DEV_AUTH,
            legacyWagerApiEnabled: ENABLE_LEGACY_WAGER_API,
            features: FEATURES,
            database: db.getDatabaseHealth(),
            audit: db.getAuditSummary(10),
            circuitBreakerTriggered: emergencyCircuitBreaker.isTriggered,
            activeTicketsInFlight: activeMatchTickets.size,
            activePublicLobbies: publicLobbies.size,
            activePrivateDuels: privateDuels.size,
            activeRaceSessions: raceSessions.size
        });
        return;
    }

    // Configuración pública y banderas operativas. No contiene secretos.
    if (pathname === '/api/config') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, {
            ok: true,
            version: APP_VERSION,
            features: FEATURES,
            telegramStars: telegramStars.publicStarsCatalog(),
            nft: nftPublicConfig(req),
            support: {
                contact: SUPPORT_CONTACT || null,
                url: SUPPORT_URL || null,
                botCommand: '/paysupport'
            },
            legal: { termsUrl: '/terms.html', privacyUrl: '/privacy.html', supportUrl: '/support.html' }
        });
        return;
    }

    // Estado económico autoritativo. El cliente puede representar este garaje,
    // pero ya no puede subir saldos/coches como fuente de verdad.
    if (pathname === '/api/economy/state') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        const telegramName = auth.telegramUser
            ? (auth.telegramUser.username ? '@' + auth.telegramUser.username : [auth.telegramUser.first_name, auth.telegramUser.last_name].filter(Boolean).join(' '))
            : undefined;
        const profile = db.getOrCreateEconomyProfile(auth.userId, { pilotName: telegramName || undefined });
        sendJson(res, 200, { ok: true, economy: economyProfileResponse(profile) });
        return;
    }

    // Única puerta pública para mutaciones económicas ordinarias.
    if (pathname === '/api/economy/action' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!FEATURES.economyActionsEnabled) {
                sendJson(res, 503, { ok: false, error: 'economy_actions_disabled', message: 'Las acciones económicas están pausadas temporalmente' });
                return;
            }
            const action = String(data.action || '').trim();
            const args = data.args && typeof data.args === 'object' && !Array.isArray(data.args) ? data.args : {};
            if (!PUBLIC_ECONOMY_ACTIONS.has(action) || !validateEconomyActionArgs(action, args)) {
                sendJson(res, 422, { ok: false, error: 'invalid_economy_action', action });
                return;
            }
            let idempotencyKey = typeof data.idempotencyKey === 'string' && /^[A-Za-z0-9_.:-]{8,180}$/.test(data.idempotencyKey)
                ? data.idempotencyKey
                : null;
            if (!idempotencyKey && action.startsWith('claim_')) {
                const subject = args.tier ?? args.missionId ?? args.contractId ?? `${args.instanceId || ''}:${args.milestoneLevel || ''}:${args.statName || ''}`;
                idempotencyKey = `${action}:${auth.userId}:${subject}`;
            }
            try {
                const outcome = applyServerEconomyAction(auth.userId, action, args, idempotencyKey, { source: 'client_action' });
                if (!outcome.ok) {
                    const reason = (outcome.result && outcome.result.reason) || outcome.error || 'economy_action_failed';
                    const status = reason === 'car_not_found' || String(reason).includes('no encontrado') ? 404 : 409;
                    sendJson(res, status, {
                        ok: false,
                        error: reason,
                        result: outcome.result || null,
                        economy: economyProfileResponse(outcome.profile)
                    });
                    return;
                }
                sendJson(res, 200, {
                    ok: true,
                    action,
                    duplicate: outcome.duplicate === true,
                    result: outcome.result,
                    economy: economyProfileResponse(outcome.profile)
                });
            } catch (e) {
                console.error('Error aplicando acción económica:', e);
                securityAuditLogs.push({ event: 'ECONOMY_ACTION_ERROR', userId: auth.userId, action, message: String(e.message || e).slice(0, 240), time: new Date().toISOString() });
                sendJson(res, 500, { ok: false, error: 'economy_action_failed' });
            }
        });
        return;
    }

    // Reclamar una recompensa publicitaria solo tras el webhook servidor.
    if (pathname === '/api/ads/claim' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!FEATURES.adRewardsEnabled) {
                sendJson(res, 503, { ok: false, error: 'ad_rewards_disabled' });
                return;
            }
            const rewardType = String(data.rewardType || data.type || '').toLowerCase();
            if (!['energy', 'nitro'].includes(rewardType)) {
                sendJson(res, 422, { ok: false, error: 'invalid_ad_reward_type' });
                return;
            }
            const instanceId = typeof data.instanceId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(data.instanceId) ? data.instanceId : null;
            const outcome = db.claimAdReward(auth.userId, rewardType, ({ garage }) => {
                return rewardType === 'energy'
                    ? economyEngine.applyAction(garage, 'recharge_energy_ad', { instanceId })
                    : economyEngine.applyAction(garage, 'add_nitro_ad', {});
            });
            if (!outcome.ok) {
                const status = outcome.error === 'ad_reward_not_verified_yet' ? 202 : 409;
                sendJson(res, status, { ok: false, error: outcome.error, result: outcome.economyResult || null });
                return;
            }
            sendJson(res, 200, {
                ok: true,
                rewardType,
                result: outcome.economyResult,
                economy: economyProfileResponse(outcome.profile)
            });
        });
        return;
    }

    // Referidos reales en servidor: sin pilotos sembrados ni botón de test.
    if (pathname === '/api/referrals/leaderboard' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, leaders: db.listReferralLeaders(parsedUrl.searchParams.get('limit') || 20) });
        return;
    }
    if (pathname === '/api/referrals/redeem' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!FEATURES.referralRewardsEnabled) {
                sendJson(res, 503, { ok: false, error: 'referral_rewards_disabled' });
                return;
            }
            const code = String(data.code || data.referralCode || '').trim().toUpperCase();
            if (!/^APEX-[A-Z0-9-]{4,24}$/.test(code)) {
                sendJson(res, 422, { ok: false, error: 'invalid_referral_code' });
                return;
            }
            const outcome = db.redeemReferralOnServer(auth.userId, code);
            if (!outcome.ok) {
                sendJson(res, outcome.error === 'referral_code_not_found' ? 404 : 409, {
                    ok: false,
                    error: outcome.error,
                    economy: economyProfileResponse(outcome.profile)
                });
                return;
            }
            sendJson(res, 200, {
                ok: true,
                inviteeNitrosGranted: outcome.inviteeNitrosGranted,
                economy: economyProfileResponse(outcome.profile)
            });
        });
        return;
    }

    // Recuperación de cuentas de navegador. El código se muestra una sola vez
    // y en servidor solo queda su hash. La recuperación rota la credencial.
    if (pathname === '/api/account/recovery-code' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!isDeviceId(auth.userId)) {
                sendJson(res, 422, { ok: false, error: 'recovery_only_for_device_accounts' });
                return;
            }
            const result = db.createDeviceRecoveryCode(auth.userId);
            sendJson(res, result.ok ? 200 : 409, result);
        });
        return;
    }
    if (pathname === '/api/account/recover-device' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const userId = String(data.userId || '');
            const rate = checkRateLimit(`account-recover:${clientIp}:${userId}`, 5);
            if (!rate.allowed) {
                res.setHeader('Retry-After', String(rate.retryAfter));
                sendJson(res, 429, { ok: false, error: 'too_many_requests', retryAfter: rate.retryAfter });
                return;
            }
            const result = db.resetDeviceSecretWithRecovery(userId, data.recoveryCode, data.newDeviceSecret);
            sendJson(res, result.ok ? 200 : 401, result);
        });
        return;
    }
    if (pathname === '/api/account/rotate-device-secret' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!isDeviceId(auth.userId)) {
                sendJson(res, 422, { ok: false, error: 'rotation_only_for_device_accounts' });
                return;
            }
            const result = db.rotateDeviceSecret(auth.userId, data.newDeviceSecret);
            sendJson(res, result.ok ? 200 : 409, result);
        });
        return;
    }

    // Herramientas de soporte/operación con token de administrador.
    if (pathname === '/api/admin/purchases' && req.method === 'GET') {
        if (!requireAdminRequest(req, res)) return;
        const orderId = cleanText(parsedUrl.searchParams.get('orderId'), 40);
        const txHash = cleanText(parsedUrl.searchParams.get('txHash'), 140);
        const userId = cleanText(parsedUrl.searchParams.get('userId'), 64);
        if (orderId) {
            const order = db.getPurchaseOrder(orderId);
            sendJson(res, order ? 200 : 404, order ? { ok: true, orders: [order] } : { ok: false, error: 'order_not_found' });
            return;
        }
        if (txHash) {
            const order = db.getPurchaseOrderByTxHash(txHash);
            sendJson(res, order ? 200 : 404, order ? { ok: true, orders: [order] } : { ok: false, error: 'order_not_found' });
            return;
        }
        if (userId) {
            sendJson(res, 200, { ok: true, orders: db.listPurchaseOrdersByUser(userId, { limit: 100 }) });
            return;
        }
        sendJson(res, 400, { ok: false, error: 'missing_purchase_query' });
        return;
    }
    if (pathname === '/api/admin/purchases/recheck' && req.method === 'POST') {
        if (!requireAdminRequest(req, res)) return;
        readJsonBody(req, res, 16 * 1024, (data) => {
            const orderId = cleanText(data.orderId, 40);
            const order = db.getPurchaseOrder(orderId);
            if (!order) { sendJson(res, 404, { ok: false, error: 'order_not_found' }); return; }
            if (purchaseIsTelegramStars(order)) {
                telegramStars.attemptRefundsForOrder(order.id)
                    .catch(() => [])
                    .then(refunds => {
                        const checked = telegramStars.getStarsOrderForUser(order.id, order.userId);
                        const current = checked.ok ? checked.order : db.getPurchaseOrder(order.id);
                        securityAuditLogs.push({
                            event: 'ADMIN_TELEGRAM_STARS_RECHECK',
                            userId: order.userId,
                            orderId: order.id,
                            status: current ? current.status : undefined,
                            refundAttempts: refunds.length,
                            time: new Date().toISOString()
                        });
                        sendJson(res, 200, {
                            ok: true,
                            found: Boolean(current && current.telegramPaymentChargeId),
                            order: publicPurchaseView(current),
                            charges: db.listTelegramStarsChargesForOrder(order.id)
                        });
                    });
                return;
            }
            if (order.status !== 'pending') { sendJson(res, 200, { ok: true, order: publicPurchaseView(order) }); return; }
            findTonPayment(order)
                .then(payment => {
                    let current = order;
                    if (payment && payment.txHash) {
                        const marked = db.markPurchasePaid(order.id, payment.txHash, payment);
                        if (marked.ok) current = marked.order;
                    }
                    securityAuditLogs.push({ event: 'ADMIN_PURCHASE_RECHECK', userId: order.userId, orderId: order.id, found: Boolean(payment), time: new Date().toISOString() });
                    sendJson(res, 200, { ok: true, found: Boolean(payment), order: publicPurchaseView(current) });
                })
                .catch(error => sendJson(res, 502, { ok: false, error: 'payment_recheck_failed', message: String(error.message || error).slice(0, 240) }));
        });
        return;
    }
    if (pathname === '/api/admin/purchases/refund-stars' && req.method === 'POST') {
        if (!requireAdminRequest(req, res)) return;
        readJsonBody(req, res, 16 * 1024, (data) => {
            const orderId = cleanText(data.orderId, 40);
            const chargeId = cleanText(data.chargeId || data.telegramPaymentChargeId, 180);
            const options = {
                orderId: orderId || undefined,
                chargeId,
                allowUnfulfilled: data.allowUnfulfilled === true,
                allowClaimedPrimary: data.allowClaimedPrimary === true
            };
            const work = chargeId
                ? telegramStars.attemptRefundForCharge(options).then(result => [result])
                : (orderId ? telegramStars.attemptRefundsForOrder(orderId) : Promise.resolve([]));
            work.then(results => {
                const order = orderId ? db.getPurchaseOrder(orderId) : (results[0] && results[0].order);
                securityAuditLogs.push({
                    event: 'ADMIN_TELEGRAM_STARS_REFUND',
                    userId: order ? order.userId : undefined,
                    orderId: orderId || undefined,
                    chargeId: chargeId || undefined,
                    refunded: results.filter(result => result.ok).length,
                    time: new Date().toISOString()
                });
                sendJson(res, results.length && results.every(result => result.ok) ? 200 : 409, {
                    ok: results.length > 0 && results.every(result => result.ok),
                    results: results.map(result => ({
                        ok: result.ok === true,
                        error: result.error || undefined,
                        chargeId: result.charge ? result.charge.chargeId : chargeId,
                        status: result.charge ? result.charge.status : undefined
                    })),
                    order: order ? publicPurchaseView(order) : undefined
                });
            }).catch(error => sendJson(res, 502, { ok: false, error: 'telegram_stars_refund_failed', message: String(error.message || error).slice(0, 240) }));
        });
        return;
    }
    if (pathname === '/api/admin/backup' && req.method === 'POST') {
        if (!requireAdminRequest(req, res)) return;
        createScheduledDatabaseBackup('manual')
            .then(destination => sendJson(res, 200, { ok: true, backupCreated: Boolean(destination) }))
            .catch(error => sendJson(res, 500, { ok: false, error: 'backup_failed', message: String(error.message || error).slice(0, 240) }));
        return;
    }

    // Emisión legacy de tickets. Deshabilitada por defecto: el cliente no la
    // usa y una liquidación económica exige ledger/resultado servidor.
    if (pathname === '/api/wager/ticket' && req.method === 'POST') {
        if (!ENABLE_LEGACY_WAGER_API) {
            sendJson(res, 410, { ok: false, success: false, error: 'legacy_wager_api_disabled', message: 'La API legacy de apuestas está deshabilitada' });
            return;
        }
        readJsonBody(req, res, 16 * 1024, (data) => {
            try {
                const { userId, username, roomId, buyIn, trackId } = data;
                const auth = requireKnownUser(req, res, userId, data);
                if (!auth) return;
                const cleanUsername = cleanText(username, 40, 'PILOTO');
                const cleanRoomId = /^[a-zA-Z0-9_-]{3,40}$/.test(String(roomId || '')) ? String(roomId) : null;
                const cleanTrackId = /^[a-zA-Z0-9_-]{2,60}$/.test(String(trackId || '')) ? String(trackId) : null;
                const cleanBuyIn = [5, 25, 100, 500].includes(Number(buyIn)) ? Number(buyIn) : null;
                if (!cleanRoomId || !cleanTrackId || !cleanBuyIn || !TRACK_PHYSICAL_LIMITS[cleanTrackId]) {
                    sendJson(res, 400, { ok: false, success: false, error: 'invalid_wager_ticket_request' });
                    return;
                }

                // 2. Comprobar Cortafuegos de Tesorería
                if (emergencyCircuitBreaker.isTriggered) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Circuit breaker active', message: 'Sistema de apuestas temporalmente pausado por auditoría de tesorería' }));
                    return;
                }

                // 3. Generar Ticket de Carrera Criptográficamente Firmado
                const ticketId = 'wgr_' + crypto.randomBytes(8).toString('hex');
                const nonce = crypto.randomBytes(16).toString('hex');
                const issuedAt = Date.now();
                const limits = TRACK_PHYSICAL_LIMITS[cleanTrackId];
                const minAllowedTime = limits.minLapSeconds * limits.totalLaps;

                // Firma HMAC del ticket por el servidor
                const payloadToSign = `${ticketId}:${auth.userId}:${cleanRoomId}:${cleanTrackId}:${cleanBuyIn}:${issuedAt}:${nonce}`;
                const signature = crypto.createHmac('sha256', SERVER_SECRET_KEY).update(payloadToSign).digest('hex');

                const ticketRecord = {
                    ticketId,
                    userId: auth.userId,
                    username: cleanUsername,
                    roomId: cleanRoomId,
                    buyIn: cleanBuyIn,
                    trackId: cleanTrackId,
                    issuedAt,
                    expiresAt: issuedAt + 15 * 60 * 1000,
                    nonce,
                    signature,
                    minAllowedTime,
                    // En esta API legacy no hay orquestación de carrera en servidor;
                    // el bote autorizado se limita a 1 humano + 3 IA al 50%.
                    authorizedHumanCount: 1,
                    authorizedAiCount: 3,
                    status: 'ISSUED'
                };
                activeMatchTickets.set(ticketId, ticketRecord);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    ticketId,
                    signature,
                    nonce,
                    issuedAt,
                    minAllowedTime,
                    trackId: cleanTrackId
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
            }
        });
        return;
    }

    // Liquidación legacy, deshabilitada por defecto (ver ticket).
    if (pathname === '/api/wager/settle' && req.method === 'POST') {
        if (!ENABLE_LEGACY_WAGER_API) {
            sendJson(res, 410, { ok: false, success: false, error: 'legacy_wager_api_disabled', message: 'La API legacy de apuestas está deshabilitada' });
            return;
        }
        readJsonBody(req, res, 16 * 1024, (data) => {
            try {
                const { ticketId, signature, rank, totalTimeSec } = data;
                const cleanRank = Number(rank);
                const cleanTime = Number(totalTimeSec);
                if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(ticketId || '')) || ![1, 2, 3, 4].includes(cleanRank) || !Number.isFinite(cleanTime) || cleanTime <= 0 || cleanTime > 3600) {
                    sendJson(res, 400, { ok: false, success: false, error: 'invalid_wager_settlement_request' });
                    return;
                }

                const ticket = activeMatchTickets.get(ticketId);
                if (!ticket) {
                    securityAuditLogs.push({ event: 'INVALID_TICKET_SETTLE', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ticket not found or expired' }));
                    return;
                }

                if (ticket.expiresAt && Date.now() > ticket.expiresAt) {
                    ticket.status = 'EXPIRED';
                    sendJson(res, 410, { ok: false, success: false, error: 'ticket_expired' });
                    return;
                }
                const auth = requireKnownUser(req, res, ticket.userId, data);
                if (!auth) return;

                // A. Anti-Replay Attack: Validar que no haya sido ya canjeado
                if (ticket.status !== 'ISSUED') {
                    securityAuditLogs.push({ event: 'REPLAY_ATTACK_PREVENTED', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ticket already settled', message: 'Este ticket de carrera ya fue liquidado (doble gasto bloqueado)' }));
                    return;
                }

                // B. Verificación de Firma HMAC del Servidor
                const expectedPayload = `${ticket.ticketId}:${ticket.userId}:${ticket.roomId}:${ticket.trackId}:${ticket.buyIn}:${ticket.issuedAt}:${ticket.nonce}`;
                const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET_KEY).update(expectedPayload).digest('hex');
                if (!timingSafeEqualString(signature, expectedSignature)) {
                    securityAuditLogs.push({ event: 'SIGNATURE_FORGERY_DETECTED', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Signature mismatch', message: 'Firma digital adulterada' }));
                    return;
                }

                // C. Motor Anti-Cheat / Sanity Check Físico (Detección de Speedhack y Teletransporte)
                const elapsedRealSec = (Date.now() - ticket.issuedAt) / 1000;
                const isRealTimeCheat = elapsedRealSec < (ticket.minAllowedTime * 0.75);
                if (cleanTime < (ticket.minAllowedTime * 0.75) || isRealTimeCheat) {
                    ticket.status = 'DISQUALIFIED_CHEAT';
                    emergencyCircuitBreaker.blockedAttemptsCount++;
                    securityAuditLogs.push({
                        event: 'SPEEDHACK_BLOCKED',
                        ticketId,
                        userId: ticket.userId,
                        reportedTime: cleanTime,
                        minAllowed: ticket.minAllowedTime,
                        ip: clientIp,
                        time: new Date().toISOString()
                    });
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Anti-cheat flag triggered',
                        message: `Tiempo de carrera no fisiológicamente posible (${cleanTime}s vs mínimo físico de ${ticket.minAllowedTime}s). Liquidación cancelada por fraude.`,
                        disqualified: true
                    }));
                    return;
                }

                // D. Cálculo Autorizado del Bote en el Servidor (Regla 50% IA, 5% Rake, 95% Podio)
                const buyIn = ticket.buyIn;
                const grossPot = ((ticket.authorizedHumanCount || 1) * buyIn) + ((ticket.authorizedAiCount || 3) * (buyIn * 0.5));
                const devFee = Math.round(grossPot * 0.02 * 100) / 100;
                const rewardsFee = Math.round(grossPot * 0.02 * 100) / 100;
                const burnFee = Math.round(grossPot * 0.01 * 100) / 100;
                const netPot = Math.round((grossPot - (devFee + rewardsFee + burnFee)) * 100) / 100;

                let playerPrize = 0;
                if (cleanRank === 1) playerPrize = Math.round(netPot * 0.70 * 100) / 100;
                else if (cleanRank === 2) playerPrize = Math.round(netPot * 0.20 * 100) / 100;
                else if (cleanRank === 3) playerPrize = Math.round(netPot * 0.10 * 100) / 100;

                // E. Cortafuegos de Tesorería (Prevenir Drenaje Masivo)
                if (Date.now() - emergencyCircuitBreaker.lastReset > 3600000) {
                    emergencyCircuitBreaker.hourlyVolumePaid = 0;
                    emergencyCircuitBreaker.lastReset = Date.now();
                }
                if (emergencyCircuitBreaker.hourlyVolumePaid + playerPrize > emergencyCircuitBreaker.hourlyLimit) {
                    emergencyCircuitBreaker.isTriggered = true;
                    securityAuditLogs.push({ event: 'CIRCUIT_BREAKER_TRIGGERED', hourlyVolume: emergencyCircuitBreaker.hourlyVolumePaid, time: new Date().toISOString() });
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Circuit breaker triggered', message: 'Límite de seguridad por hora alcanzado. Pago congelado para auditoría manual.' }));
                    return;
                }

                emergencyCircuitBreaker.hourlyVolumePaid += playerPrize;
                ticket.status = 'SETTLED';
                ticket.settledAt = Date.now();
                ticket.playerRank = cleanRank;
                ticket.playerPrize = playerPrize;

                const settlementReceipt = crypto.createHmac('sha256', SERVER_SECRET_KEY)
                    .update(`RECEIPT:${ticket.ticketId}:${playerPrize}:${Date.now()}`)
                    .digest('hex');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    verified: true,
                    ticketId: ticket.ticketId,
                    rank: cleanRank,
                    playerPrize,
                    grossPot,
                    netPot,
                    devFee,
                    rewardsFee,
                    burnFee,
                    settlementReceipt
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
            }
        });
        return;
    }

    // Endpoint legacy eliminado de la superficie pública: permitía crear o
    // renombrar usuarios con un GET sin autenticación. El bot sigue usando
    // database.getUser internamente con IDs procedentes de Telegram.
    if (pathname.startsWith('/api/user/')) {
        sendJson(res, 410, { ok: false, error: 'legacy_user_endpoint_disabled' });
        return;
    }

    // Sesión de carrera de un solo uso. No convierte la telemetría cliente en
    // autoritativa, pero impide replay/envíos instantáneos sin haber iniciado
    // una carrera y vincula usuario + circuito + ventana temporal en servidor.
    if (pathname === '/api/race/session' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;

            const rawTrack = String(data.trackId || data.track || '').trim();
            const jsonTrack = RaceTracksCatalog && typeof RaceTracksCatalog === 'object' ? RaceTracksCatalog[rawTrack] : null;
            if (!jsonTrack) {
                sendJson(res, 422, { ok: false, error: 'invalid_race_session', message: 'Circuito no válido para iniciar una sesión' });
                return;
            }
            const trackId = jsonTrack.id || rawTrack;
            const limits = TRACK_PHYSICAL_LIMITS[trackId] || TRACK_PHYSICAL_LIMITS.default;
            const minAllowedTime = limits.minLapSeconds * limits.totalLaps * 0.75;
            const now = Date.now();

            // Una sola sesión activa por piloto: reiniciar sustituye la previa
            // y evita acumular sesiones en espera para canjearlas en ráfaga.
            for (const [existingId, existing] of raceSessions.entries()) {
                if (!existing || existing.userId === auth.userId || now > Number(existing.expiresAt || 0)) {
                    raceSessions.delete(existingId);
                }
            }
            if (raceSessions.size >= 5000) {
                const oldest = raceSessions.keys().next().value;
                if (oldest) raceSessions.delete(oldest);
            }

            const sessionId = crypto.randomBytes(18).toString('hex');
            const requestedCarInstanceId = typeof (data.carInstanceId || data.instanceId) === 'string'
                && /^[A-Za-z0-9_.:-]{1,120}$/.test(data.carInstanceId || data.instanceId)
                ? (data.carInstanceId || data.instanceId)
                : null;
            const energyOutcome = applyServerEconomyAction(
                auth.userId,
                'consume_race_energy',
                { instanceId: requestedCarInstanceId },
                `race-energy:${sessionId}`,
                { trackId }
            );
            if (!energyOutcome.ok) {
                sendJson(res, 409, {
                    ok: false,
                    error: (energyOutcome.result && energyOutcome.result.reason) || 'energy_depleted',
                    message: 'El coche no tiene energía suficiente para una carrera oficial',
                    economy: economyProfileResponse(energyOutcome.profile)
                });
                return;
            }
            const session = {
                id: sessionId,
                userId: auth.userId,
                trackId,
                carName: cleanText(data.car || data.carName, 80, ''),
                carInstanceId: energyOutcome.result && energyOutcome.result.carInstanceId
                    ? String(energyOutcome.result.carInstanceId)
                    : requestedCarInstanceId,
                startedAt: now,
                expiresAt: now + RACE_SESSION_TTL_MS
            };
            raceSessions.set(sessionId, session);
            sendJson(res, 200, {
                ok: true,
                sessionId,
                trackId,
                startedAt: new Date(session.startedAt).toISOString(),
                expiresAt: new Date(session.expiresAt).toISOString(),
                minAllowedTime: Math.round(minAllowedTime * 100) / 100,
                economy: economyProfileResponse(energyOutcome.profile)
            });
        });
        return;
    }

    // ===== COMPRAS DE $CR CON TELEGRAM STARS (v105) =====
    // El servidor crea primero el pedido y después la factura XTR. El bot es
    // quien recibe pre_checkout_query/successful_payment; este status solo
    // lee SQLite y, si el pago quedó paid_unfulfilled, reintenta la entrega
    // idempotente. El cliente nunca puede declarar que ha pagado.
    if (pathname === '/api/telegram-stars/packages') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, {
            ok: true,
            ...telegramStars.publicStarsCatalog(),
            supportContact: SUPPORT_CONTACT || undefined,
            supportUrl: SUPPORT_URL || undefined
        });
        return;
    }

    if (pathname === '/api/telegram-stars/create' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!FEATURES.telegramStarsPurchasesEnabled) {
                sendJson(res, 503, { ok: false, error: 'telegram_stars_purchases_disabled', message: 'Las compras con Telegram Stars están pausadas temporalmente.' });
                return;
            }
            if (!isTelegramNumericId(auth.userId)) {
                sendJson(res, 403, {
                    ok: false,
                    error: 'telegram_account_required',
                    message: 'Telegram Stars solo puede usarse con tu cuenta verificada dentro de Telegram.'
                });
                return;
            }
            telegramStars.createStarsOrder(auth.userId, data.packageId || data.productId || data.packId || '')
                .then(result => {
                    if (!result.ok) {
                        sendJson(res, result.status || 502, {
                            ok: false,
                            error: result.error || 'telegram_stars_order_failed',
                            message: result.message || 'No se pudo crear la factura de Telegram Stars.'
                        });
                        return;
                    }
                    const publicOrder = telegramStars.publicStarsOrder(result.order);
                    sendJson(res, 200, {
                        ok: true,
                        reused: result.reused === true,
                        order: publicOrder,
                        invoiceUrl: publicOrder.invoiceUrl,
                        payment: {
                            paymentProvider: 'telegram_stars',
                            currency: 'XTR',
                            priceStars: publicOrder.priceStars,
                            invoiceUrl: publicOrder.invoiceUrl
                        }
                    });
                })
                .catch(error => {
                    console.warn('⚠️ No se pudo crear una factura Telegram Stars:', error.message);
                    sendJson(res, 502, { ok: false, error: 'telegram_stars_invoice_failed', message: 'Telegram no ha podido crear la factura. No se ha cobrado nada.' });
                });
        });
        return;
    }

    if (pathname === '/api/telegram-stars/status' && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        if (!isTelegramNumericId(auth.userId)) { sendJson(res, 403, { ok: false, error: 'telegram_account_required' }); return; }
        const result = telegramStars.getStarsOrderForUser(cleanText(parsedUrl.searchParams.get('orderId'), 40), auth.userId);
        if (!result.ok) { sendJson(res, 404, { ok: false, error: 'order_not_found' }); return; }
        sendJson(res, 200, {
            ok: true,
            order: telegramStars.publicStarsOrder(result.order),
            payment: purchasePaymentLinks(result.order),
            fulfillmentPending: result.order.status === 'paid_unfulfilled',
            economy: result.profile ? economyProfileResponse(result.profile) : undefined
        });
        return;
    }

    if (pathname === '/api/telegram-stars/list' && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        if (!isTelegramNumericId(auth.userId)) { sendJson(res, 403, { ok: false, error: 'telegram_account_required' }); return; }
        const orders = telegramStars.listStarsOrdersForUser(auth.userId, parsedUrl.searchParams.get('limit') || 50)
            .map(order => ({ order: telegramStars.publicStarsOrder(order), payment: purchasePaymentLinks(order) }));
        sendJson(res, 200, { ok: true, orders });
        return;
    }

    // ===== REGISTRO Y CONVERSIÓN NFT TON (base v105) =====
    if (pathname === '/api/nft/collection-metadata' && req.method === 'GET') {
        const config = nftPublicConfig(req);
        sendJson(res, 200, {
            name: 'Apex Motorsport GT Cars',
            description: 'Colección oficial de coches jugables de Apex Motorsport. Cada coche nace como objeto interno del juego y solo se convierte en NFT de TON si su propietario decide acuñarlo.',
            image: `${config.metadataBaseUrl}/assets/apex_cr_coin_256.jpg`,
            external_url: config.metadataBaseUrl,
            social_links: []
        });
        return;
    }

    if (pathname.startsWith('/api/nft/metadata/') && req.method === 'GET') {
        const serialRaw = decodeURIComponent(pathname.replace('/api/nft/metadata/', ''));
        if (!/^\d{1,12}$/.test(serialRaw)) { sendJson(res, 404, { ok: false, error: 'nft_metadata_not_found' }); return; }
        const entry = db.getPublicNftRegistryEntry(Number(serialRaw));
        if (!entry) { sendJson(res, 404, { ok: false, error: 'nft_metadata_not_found' }); return; }
        sendJson(res, 200, nftMetadataForEntry(req, entry));
        return;
    }

    if (pathname === '/api/nft/cars' && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        if (!FEATURES.nftEntitlementsEnabled) { sendJson(res, 503, { ok: false, error: 'nft_entitlements_disabled' }); return; }
        const synced = db.syncNftRegistryForUser(auth.userId);
        sendJson(res, 200, {
            ok: true,
            config: nftPublicConfig(req),
            entries: synced.entries.map(entry => ({
                registry: publicNftRegistryView(entry.registry),
                claim: publicNftClaimView(entry.claim, req)
            })),
            economy: economyProfileResponse(synced.profile)
        });
        return;
    }

    if (pathname === '/api/nft/prepare-conversion' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            if (!FEATURES.nftEntitlementsEnabled) { sendJson(res, 503, { ok: false, error: 'nft_entitlements_disabled' }); return; }
            const instanceId = typeof data.instanceId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(data.instanceId) ? data.instanceId : '';
            if (!instanceId) { sendJson(res, 422, { ok: false, error: 'invalid_car_instance_id' }); return; }
            const result = db.prepareNftConversion(auth.userId, instanceId, { network: NFT_CONFIG.network });
            if (!result.ok) {
                sendJson(res, result.error === 'car_not_found' ? 404 : 422, {
                    ok: false,
                    error: result.error || 'nft_conversion_prepare_failed',
                    economy: result.profile ? economyProfileResponse(result.profile) : undefined
                });
                return;
            }
            securityAuditLogs.push({
                event: result.alreadyMinted ? 'NFT_CONVERSION_ALREADY_MINTED' : 'NFT_CONVERSION_PREPARED',
                userId: auth.userId,
                instanceId,
                registryId: result.registry.registryId,
                claimId: result.claim ? result.claim.claimId : undefined,
                time: new Date().toISOString()
            });
            sendJson(res, 200, {
                ok: true,
                alreadyPrepared: result.alreadyPrepared === true,
                alreadyMinted: result.alreadyMinted === true,
                registry: publicNftRegistryView(result.registry),
                claim: publicNftClaimView(result.claim, req),
                config: nftPublicConfig(req),
                economy: economyProfileResponse(result.profile)
            });
        });
        return;
    }

    if (pathname === '/api/nft/cancel-conversion' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            const instanceId = typeof data.instanceId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(data.instanceId) ? data.instanceId : '';
            if (!instanceId) { sendJson(res, 422, { ok: false, error: 'invalid_car_instance_id' }); return; }
            const result = db.cancelNftConversionPreparation(auth.userId, instanceId);
            if (!result.ok) {
                sendJson(res, result.error === 'car_not_found' ? 404 : 409, { ok: false, error: result.error || 'nft_conversion_cancel_failed' });
                return;
            }
            sendJson(res, 200, {
                ok: true,
                registry: publicNftRegistryView(result.registry),
                claim: publicNftClaimView(result.claim, req),
                config: nftPublicConfig(req),
                economy: economyProfileResponse(result.profile)
            });
        });
        return;
    }

    if (pathname.startsWith('/api/nft/claims/') && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        const claimId = cleanText(decodeURIComponent(pathname.replace('/api/nft/claims/', '')), 40).toUpperCase();
        const entry = db.getNftClaimForUser(auth.userId, claimId);
        if (!entry) { sendJson(res, 404, { ok: false, error: 'nft_claim_not_found' }); return; }
        sendJson(res, 200, {
            ok: true,
            registry: publicNftRegistryView(entry.registry),
            claim: publicNftClaimView(entry.claim, req),
            config: nftPublicConfig(req)
        });
        return;
    }

    // ===== COMPRAS DE $CR CON TON REAL (v103) =====
    // Flujo: create -> el jugador paga a la tesorería con el comentario del
    // pedido -> status verifica on-chain y marca 'paid' -> claim entrega los
    // $CR/caja una sola vez dentro de la misma transacción SQLite. Si la
    // respuesta se pierde, repetir claim devuelve el mismo resultado guardado.
    if (pathname === '/api/purchases/packages' && req.method === 'GET') {
        if (!FEATURES.tonPurchasesEnabled) {
            sendJson(res, 503, { ok: false, error: 'ton_purchases_disabled', message: 'Las compras TON están pausadas temporalmente. No envíes ningún pago.' });
            return;
        }
        getTonUsdtQuote()
            .then(quote => {
                const packages = TON_CR_PACKAGES.map(definition => buildPurchaseProductView(definition, quote));
                const crates = TON_CRATE_PRODUCTS.map(definition => buildPurchaseProductView(definition, quote));
                sendJson(res, 200, {
                    ok: true,
                    treasuryAddress: TREASURY_WALLET_ADDRESS,
                    telegramTonPurchasesEnabled: FEATURES.telegramTonPurchasesEnabled,
                    supportContact: SUPPORT_CONTACT || undefined,
                    supportUrl: SUPPORT_URL || undefined,
                    ...purchaseQuotePublicFields(quote),
                    packages,
                    crates,
                    products: [...packages, ...crates]
                });
            })
            .catch(error => {
                console.warn('⚠️ Cotización TON/USDT no disponible:', error.message);
                sendJson(res, 503, {
                    ok: false,
                    error: 'ton_rate_unavailable',
                    message: 'La cotización TON/USDT no está disponible ahora. No envíes ningún pago todavía.'
                });
            });
        return;
    }

    if (pathname === '/api/purchases/create' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;

            if (!FEATURES.tonPurchasesEnabled) {
                sendJson(res, 503, { ok: false, error: 'ton_purchases_disabled', message: 'Las compras TON están pausadas temporalmente. No envíes ningún pago.' });
                return;
            }
            // Dentro de Telegram, los bienes digitales deben venderse con
            // Telegram Stars. Hasta implantar esa vía, el pago TON directo se
            // bloquea para sesiones Telegram verificadas (la web externa puede
            // seguir usando la tesorería si el operador lo decide).
            if (auth.authMode === 'telegram' && !FEATURES.telegramTonPurchasesEnabled) {
                sendJson(res, 403, {
                    ok: false,
                    error: 'telegram_ton_purchases_disabled',
                    message: 'Las compras con TON dentro de Telegram están pausadas hasta habilitar Telegram Stars. No envíes ningún pago.'
                });
                return;
            }

            const product = findPurchaseProduct(data.packageId || data.productId || data.packId || '');
            if (!product) {
                sendJson(res, 422, { ok: false, error: 'invalid_package', message: 'Producto no válido' });
                return;
            }

            const countPending = () => (typeof db.countPurchaseOrdersByUser === 'function'
                ? db.countPurchaseOrdersByUser(auth.userId, 'pending')
                : 0);
            const sendTooManyPending = () => sendJson(res, 429, {
                ok: false,
                error: 'too_many_pending_orders',
                message: 'Ya tienes pedidos pendientes de pago. Completa uno o espera a que caduque antes de crear otro.'
            });
            if (countPending() >= PURCHASE_MAX_PENDING_PER_USER) {
                sendTooManyPending();
                return;
            }

            getTonUsdtQuote()
                .then(quote => {
                    // Recomprobar tras la espera de red: otra petición del
                    // mismo usuario pudo crear pedidos mientras tanto.
                    if (countPending() >= PURCHASE_MAX_PENDING_PER_USER) {
                        sendTooManyPending();
                        return;
                    }

                    const priced = buildPurchaseProductView(product, quote);
                    if (priced.productType === 'cr' && priced.cr < 1) {
                        sendJson(res, 503, {
                            ok: false,
                            error: 'ton_quote_too_small',
                            message: 'La cotización actual no permite acreditar ni 1 $CR en este paquete. No envíes ningún pago.'
                        });
                        return;
                    }

                    const now = Date.now();
                    let order = null;
                    for (let attempt = 0; attempt < 5 && !order; attempt++) {
                        order = db.createPurchaseOrder({
                            id: 'APEX-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
                            userId: auth.userId,
                            packageId: priced.id,
                            productType: priced.productType,
                            crateId: priced.crateId,
                            label: priced.label,
                            cr: priced.cr,
                            priceUsdt: priced.priceUsdt,
                            priceCr: priced.priceCr,
                            crPerUsdt: priced.crPerUsdt,
                            tonUsdtRate: priced.tonUsdtRate,
                            tonUsdtRateMicro: priced.tonUsdtRateMicro,
                            rateSource: priced.rateSource,
                            quotedAt: priced.quotedAt,
                            quoteStale: priced.quoteStale,
                            amountTon: priced.amountTon,
                            amountNanotons: priced.amountNanotons,
                            treasuryAddress: TREASURY_WALLET_ADDRESS,
                            status: 'pending',
                            createdAt: new Date(now).toISOString(),
                            createdAtMs: now,
                            expiresAt: new Date(now + PURCHASE_ORDER_TTL_MS).toISOString(),
                            expiresAtMs: now + PURCHASE_ORDER_TTL_MS
                        });
                    }
                    if (!order) {
                        sendJson(res, 500, { ok: false, error: 'order_create_failed' });
                        return;
                    }
                    securityAuditLogs.push({
                        event: 'PURCHASE_ORDER_CREATED',
                        userId: auth.userId,
                        orderId: order.id,
                        packageId: priced.id,
                        productType: priced.productType,
                        crateId: priced.crateId || undefined,
                        amountNanotons: priced.amountNanotons,
                        tonUsdtRate: priced.tonUsdtRate,
                        time: new Date().toISOString()
                    });
                    sendJson(res, 200, { ok: true, order: publicPurchaseView(order), payment: purchasePaymentLinks(order) });
                })
                .catch(error => {
                    console.warn('⚠️ No se creó pedido por falta de cotización TON/USDT:', error.message);
                    sendJson(res, 503, {
                        ok: false,
                        error: 'ton_rate_unavailable',
                        message: 'La cotización TON/USDT no está disponible ahora. No se ha creado ningún pedido; no envíes TON todavía.'
                    });
                });
        });
        return;
    }

    if (pathname === '/api/purchases/list' && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        const status = ['pending', 'paid', 'claimed'].includes(String(parsedUrl.searchParams.get('status') || ''))
            ? String(parsedUrl.searchParams.get('status'))
            : null;
        const orders = db.listPurchaseOrdersByUser(auth.userId, {
            status,
            limit: parsedUrl.searchParams.get('limit') || 50
        }).filter(order => !purchaseIsTelegramStars(order)).map(order => ({
            order: publicPurchaseView(order),
            payment: purchasePaymentLinks(order)
        }));
        sendJson(res, 200, { ok: true, orders });
        return;
    }

    if (pathname === '/api/purchases/status' && req.method === 'GET') {
        const auth = requireKnownUser(req, res, parsedUrl.searchParams.get('userId') || '');
        if (!auth) return;
        const orderId = cleanText(parsedUrl.searchParams.get('orderId'), 40);
        let order = db.getPurchaseOrder(orderId);
        if (!order || order.userId !== auth.userId) {
            sendJson(res, 404, { ok: false, error: 'order_not_found' });
            return;
        }
        if (purchaseIsTelegramStars(order)) {
            const checked = telegramStars.getStarsOrderForUser(order.id, auth.userId);
            const current = checked.ok ? checked.order : order;
            sendJson(res, 200, {
                ok: true,
                order: publicPurchaseView(current),
                payment: purchasePaymentLinks(current),
                fulfillmentPending: current.status === 'paid_unfulfilled',
                economy: checked.profile ? economyProfileResponse(checked.profile) : undefined
            });
            return;
        }
        if (order.status !== 'pending') {
            sendJson(res, 200, { ok: true, order: publicPurchaseView(order), payment: purchasePaymentLinks(order) });
            return;
        }

        // No martillear los indexadores: una verificación on-chain cada 8 s
        // por pedido como máximo (el mock de tests no necesita espera).
        const lastCheck = purchaseVerifyCache.get(order.id) || 0;
        const minIntervalMs = TON_MOCK_LEDGER_FILE ? 0 : 8000;
        if (Date.now() - lastCheck < minIntervalMs) {
            sendJson(res, 200, { ok: true, order: publicPurchaseView(order), payment: purchasePaymentLinks(order), verificationPending: true });
            return;
        }
        purchaseVerifyCache.set(order.id, Date.now());

        findTonPayment(order)
            .then(payment => {
                if (payment && payment.txHash) {
                    const marked = db.markPurchasePaid(order.id, payment.txHash, payment);
                    if (marked.ok) {
                        order = marked.order;
                        securityAuditLogs.push({ event: 'PURCHASE_PAID', userId: auth.userId, orderId: order.id, txHash: payment.txHash, time: new Date().toISOString() });
                    } else if (marked.error === 'tx_already_used') {
                        securityAuditLogs.push({ event: 'PURCHASE_TX_REUSE_BLOCKED', userId: auth.userId, orderId: order.id, txHash: payment.txHash, time: new Date().toISOString() });
                    }
                }
                sendJson(res, 200, { ok: true, order: publicPurchaseView(order), payment: purchasePaymentLinks(order) });
            })
            .catch(() => {
                sendJson(res, 200, { ok: true, order: publicPurchaseView(order), payment: purchasePaymentLinks(order), verificationPending: true });
            });
        return;
    }

    if (pathname === '/api/purchases/claim' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            const orderId = cleanText(data.orderId, 40);
            const existingOrder = db.getPurchaseOrder(orderId);
            if (existingOrder && existingOrder.userId === auth.userId && purchaseIsTelegramStars(existingOrder)) {
                const checked = telegramStars.getStarsOrderForUser(orderId, auth.userId);
                const current = checked.ok ? checked.order : existingOrder;
                if (current.status !== 'claimed') {
                    sendJson(res, 409, {
                        ok: false,
                        error: 'telegram_stars_payment_not_confirmed',
                        message: 'El pago de Telegram Stars aún no está confirmado y entregado por el servidor',
                        order: publicPurchaseView(current),
                        payment: purchasePaymentLinks(current)
                    });
                    return;
                }
                sendJson(res, 200, {
                    ok: true,
                    orderId,
                    cr: Number(current.cr || 0),
                    productType: 'cr',
                    crateId: null,
                    label: current.label,
                    alreadyClaimed: true,
                    economyResult: null,
                    economy: checked.profile ? economyProfileResponse(checked.profile) : undefined,
                    order: publicPurchaseView(current),
                    payment: purchasePaymentLinks(current)
                });
                return;
            }
            const result = db.claimPurchaseOrder(orderId, auth.userId, ({ order, garage }) => {
                if ((order.productType || 'cr') === 'crate') {
                    return economyEngine.applyAction(garage, 'open_prepaid_crate', {
                        crateKey: order.crateId,
                        orderId: order.id
                    });
                }
                return economyEngine.applyAction(garage, 'grant_ton_credits', {
                    orderId: order.id,
                    cr: Number(order.cr || 0)
                });
            });
            if (!result.ok) {
                const notPaid = result.error === 'order_not_paid' || result.error === 'wrong_payment_provider';
                sendJson(res, notPaid ? 409 : 404, {
                    ok: false,
                    error: result.error || 'claim_failed',
                    message: notPaid ? 'El pago aún no está confirmado on-chain' : 'Pedido no encontrado'
                });
                return;
            }
            securityAuditLogs.push({
                event: result.alreadyClaimed ? 'PURCHASE_CLAIM_REPEAT' : 'PURCHASE_CLAIMED',
                userId: auth.userId,
                orderId,
                cr: result.cr,
                productType: result.productType,
                crateId: result.crateId || undefined,
                time: new Date().toISOString()
            });
            sendJson(res, 200, {
                ok: true,
                orderId,
                cr: result.cr,
                productType: result.productType,
                crateId: result.crateId,
                label: result.order ? result.order.label : undefined,
                alreadyClaimed: result.alreadyClaimed === true,
                economyResult: result.economyResult || null,
                economy: economyProfileResponse(result.profile),
                order: publicPurchaseView(result.order)
            });
        });
        return;
    }

    if (pathname === '/api/race/result' && req.method === 'POST') {
        readJsonBody(req, res, 16 * 1024, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;

            const rawTrack = String(data.trackId || data.track || '').trim();
            const jsonTrack = RaceTracksCatalog && typeof RaceTracksCatalog === 'object' ? RaceTracksCatalog[rawTrack] : null;
            let trackId = '';
            let trackName = '';
            if (jsonTrack) {
                trackId = jsonTrack.id || rawTrack;
                trackName = jsonTrack.name || rawTrack;
            }

            const cleanTime = Number(data.time);
            const limits = TRACK_PHYSICAL_LIMITS[trackId] || TRACK_PHYSICAL_LIMITS.default;
            const minAllowedTime = limits.minLapSeconds * limits.totalLaps * 0.75;
            const basicResultValid = Boolean(trackId)
                && Number.isFinite(cleanTime)
                && cleanTime >= minAllowedTime
                && cleanTime <= 3600;

            const sessionId = String(data.sessionId || '').trim();
            const session = /^[a-f0-9]{32,64}$/.test(sessionId) ? raceSessions.get(sessionId) : null;
            const now = Date.now();
            let raceSessionValid = false;
            if (session && session.userId === auth.userId && session.trackId === trackId && now <= Number(session.expiresAt || 0)) {
                // Un solo uso: una sesión coincidente se consume aunque el
                // tiempo posterior sea inválido, para que no sirva de oráculo.
                raceSessions.delete(sessionId);
                const ageSeconds = Math.max(0, (now - Number(session.startedAt || now)) / 1000);
                raceSessionValid = RACE_SESSION_MIN_AGE_MS !== null
                    ? ageSeconds * 1000 >= RACE_SESSION_MIN_AGE_MS
                    : ageSeconds >= minAllowedTime && cleanTime <= ageSeconds + 10;
            }

            if (!basicResultValid || !raceSessionValid) {
                const error = basicResultValid ? 'invalid_race_session' : 'invalid_race_result';
                securityAuditLogs.push({ event: basicResultValid ? 'INVALID_RACE_SESSION' : 'INVALID_RACE_RESULT', userId: auth.userId, trackId: trackId || rawTrack.slice(0, 80), time: cleanTime, ip: clientIp, timeStamp: new Date().toISOString() });
                sendJson(res, 422, {
                    ok: false,
                    error,
                    message: basicResultValid ? 'Sesión de carrera ausente, expirada o ya utilizada' : 'Circuito o tiempo de carrera no válido',
                    minAllowedTime: Math.round(minAllowedTime * 100) / 100
                });
                return;
            }

            const telegramName = auth.telegramUser
                ? (auth.telegramUser.username || [auth.telegramUser.first_name, auth.telegramUser.last_name].filter(Boolean).join(' '))
                : '';
            const username = cleanText(telegramName || data.username, 40, 'Piloto');
            const carName = cleanText(data.car, 80, '');
            const result = db.recordRaceResult(auth.userId, username, trackName, cleanTime, carName, trackId);
            const rankRaw = Number(data.rank);
            const rank = Number.isInteger(rankRaw) && rankRaw >= 1 && rankRaw <= 6 ? rankRaw : 6;
            const topSpeed = Math.max(0, Math.min(500, Number(data.topSpeed) || 0));
            const drifts = Math.max(0, Math.min(100, Math.floor(Number(data.drifts) || 0)));
            const nitrosUsed = Math.max(0, Math.min(2, Math.floor(Number(data.nitrosUsed) || 0)));
            let economyReward = null;
            let economyProfile = null;
            let economyError = null;
            try {
                const economyOutcome = db.applyEconomyMutation(
                    auth.userId,
                    'race_complete',
                    `race-complete:${sessionId}`,
                    (garage) => {
                        if (session && session.carInstanceId && Array.isArray(garage.garage)
                            && garage.garage.some(car => car && car.instanceId === session.carInstanceId)) {
                            garage.equippedInstanceId = session.carInstanceId;
                        }
                        return economyEngine.applyAction(garage, 'race_complete', {
                            rank,
                            trackId,
                            topSpeed,
                            drifts,
                            nitrosUsed
                        });
                    },
                    { trackId, time: cleanTime, rank }
                );
                if (economyOutcome.ok) {
                    economyReward = economyOutcome.result;
                    economyProfile = economyProfileResponse(economyOutcome.profile);
                } else {
                    economyError = (economyOutcome.result && economyOutcome.result.reason) || economyOutcome.error || 'race_reward_failed';
                    economyProfile = economyProfileResponse(economyOutcome.profile);
                }
            } catch (e) {
                economyError = 'race_reward_failed';
                console.error('Error acreditando recompensa de carrera:', e);
            }
            sendJson(res, 200, {
                ok: true,
                trackId,
                track: trackName,
                ...result,
                economyReward,
                economyError,
                economy: economyProfile
            });
        });
        return;
    }

    if (pathname === '/api/leaderboard') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, db.getLeaderboard({
            trackId: parsedUrl.searchParams.get('trackId') || undefined,
            limit: parsedUrl.searchParams.get('limit') || 20
        }));
        return;
    }

    if (pathname === '/api/tracks') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, PlayableTracksCatalog);
        return;
    }

    if (pathname === '/api/cars') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, db.getCars());
        return;
    }

    // ===== RUTAS DE MULTIJUGADOR REAL: SALAS PÚBLICAS (60s) Y DUELOS PRIVADOS =====

    // 1. Unirse a cola de sala pública (Tiempo: 60s antes de auto-rellenar con IA)
    if (pathname === '/api/multiplayer/public/join' && req.method === 'POST') {
        readJsonBody(req, res, MAX_API_BODY_BYTES, (data) => {
            try {
                const auth = requireKnownUser(req, res, data.userId, data);
                if (!auth) return;
                const roomId = Object.prototype.hasOwnProperty.call(PUBLIC_WAGER_ROOMS, data.roomId) ? data.roomId : null;
                if (!roomId) {
                    sendJson(res, 400, { ok: false, error: 'invalid_room' });
                    return;
                }
                if (!FEATURES.wagerStakesEnabled) {
                    sendJson(res, 410, { ok: false, error: 'wager_stakes_disabled', message: 'Las apuestas están pausadas hasta completar la liquidación autoritativa en servidor' });
                    return;
                }
                const userId = auth.userId;
                const name = cleanText(data.name, 40, 'PILOTO');
                const carName = cleanText(data.carName, 80, 'GT3 Racer');
                const colorHex = cleanColorHex(data.colorHex);
                const archetype = cleanArchetype(data.archetype);
                const officialBuyIn = PUBLIC_WAGER_ROOMS[roomId];

                let lobby = publicLobbies.get(roomId);
                const now = Date.now();

                // Si no existe lobby o expiró o ya empezó, crear uno nuevo
                if (!lobby || now > lobby.expiresAt || lobby.status !== 'WAITING') {
                    const randomCircuit = getRandomCircuit();
                    lobby = {
                        id: 'pub_' + crypto.randomBytes(6).toString('hex'),
                        roomId,
                        buyIn: officialBuyIn,
                        circuit: randomCircuit,
                        createdAt: now,
                        expiresAt: now + 60000, // 60 segundos completos de espera
                        slots: [],
                        status: 'WAITING'
                    };
                    publicLobbies.set(roomId, lobby);
                }

                // Añadir al jugador si no está ya en la sala
                const existingIdx = lobby.slots.findIndex(s => s && s.userId === userId);
                if (existingIdx === -1) {
                    if (lobby.slots.length < 4) {
                        lobby.slots.push({
                            id: 'player_' + crypto.randomBytes(6).toString('hex'),
                            userId,
                            name,
                            carName,
                            colorHex,
                            archetype,
                            isAI: false,
                            isPlayer: true,
                            stake: lobby.buyIn,
                            roleLabel: '👤 JUGADOR REAL P2P',
                            status: 'LISTO'
                        });
                    }
                }

                // Si se llena con 4 jugadores reales, iniciar inmediatamente
                if (lobby.slots.length >= 4) {
                    lobby.status = 'STARTING';
                }

                const countdown = Math.max(0, Math.ceil((lobby.expiresAt - Date.now()) / 1000));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ok: true,
                    lobbyId: lobby.id,
                    roomId: lobby.roomId,
                    circuit: lobby.circuit,
                    countdown,
                    slots: lobby.slots.map(slot => publicSlotView(slot, auth.userId)),
                    status: lobby.status
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
            }
        });
        return;
    }

    // 2. Estado en vivo de sala pública (Polling cada 1s)
    if (pathname === '/api/multiplayer/public/status') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        const requestedRoom = parsedUrl.searchParams.get('roomId') || 'room_bronze';
        const roomId = Object.prototype.hasOwnProperty.call(PUBLIC_WAGER_ROOMS, requestedRoom) ? requestedRoom : '';
        const lobbyId = cleanText(parsedUrl.searchParams.get('lobbyId'), 80);
        if (!roomId) { sendJson(res, 400, { ok: false, error: 'invalid_room' }); return; }
        const viewerUserId = optionalViewerUserId(req, parsedUrl.searchParams.get('userId'));
        let lobby = publicLobbies.get(roomId);

        if (!lobby || (lobbyId && lobby.id !== lobbyId)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, status: 'EXPIRED' }));
            return;
        }

        const now = Date.now();
        // Si expiraron los 60s y sigue en espera, auto-rellenar con IA
        if (now >= lobby.expiresAt && lobby.status === 'WAITING') {
            for (let i = lobby.slots.length; i < 4; i++) {
                const botDef = AI_BOT_POOL[i] || AI_BOT_POOL[0];
                lobby.slots.push({
                    id: 'ai_' + i,
                    userId: 'ai_' + i,
                    name: botDef.name,
                    carName: botDef.carName,
                    colorHex: botDef.colorHex,
                    archetype: botDef.archetype,
                    isAI: true,
                    isPlayer: false,
                    stake: lobby.buyIn * 0.5,
                    roleLabel: `🤖 IA (APORTE 50%: ${lobby.buyIn * 0.5} $CR)`,
                    status: 'AUTO-RELLENO'
                });
            }
            lobby.status = 'STARTING';
        }

        const countdown = Math.max(0, Math.ceil((lobby.expiresAt - now) / 1000));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            lobbyId: lobby.id,
            roomId: lobby.roomId,
            circuit: lobby.circuit,
            countdown,
            slots: lobby.slots.map(slot => publicSlotView(slot, viewerUserId)),
            status: lobby.status
        }));
        return;
    }

    // 3. Salir de sala pública / Cancelar
    if (pathname === '/api/multiplayer/public/leave' && req.method === 'POST') {
        readJsonBody(req, res, MAX_API_BODY_BYTES, (data) => {
            try {
                const auth = requireKnownUser(req, res, data.userId, data);
                if (!auth) return;
                const roomId = Object.prototype.hasOwnProperty.call(PUBLIC_WAGER_ROOMS, data.roomId) ? data.roomId : null;
                if (!roomId) { sendJson(res, 400, { ok: false, error: 'invalid_room' }); return; }
                const lobby = publicLobbies.get(roomId);
                if (lobby && (!data.lobbyId || lobby.id === cleanText(data.lobbyId, 80))) {
                    lobby.slots = lobby.slots.filter(s => s && s.userId !== auth.userId);
                    if (lobby.slots.length === 0) {
                        publicLobbies.delete(roomId);
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, refunded: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // 4. Crear Duelo Privado con Apuesta Personalizada (Amigos / Familia)
    if (pathname === '/api/multiplayer/duel/create' && req.method === 'POST') {
        readJsonBody(req, res, MAX_API_BODY_BYTES, (data) => {
            try {
                const auth = requireKnownUser(req, res, data.userId, data);
                if (!auth) return;
                const userId = auth.userId;
                const name = cleanText(data.name, 40, 'PILOTO');
                const carName = cleanText(data.carName, 80, 'GT3 Racer');
                const colorHex = cleanColorHex(data.colorHex);
                const archetype = cleanArchetype(data.archetype);

                if (!FEATURES.wagerStakesEnabled) {
                    sendJson(res, 410, { ok: false, error: 'wager_stakes_disabled', message: 'Los duelos con apuesta están pausados hasta completar escrow y liquidación en servidor' });
                    return;
                }
                let code = createDuelCode();
                while (privateDuels.has(code)) code = createDuelCode();
                const requestedTrackId = String(data.trackId || '').trim();
                const jsonTrack = RaceTracksCatalog && RaceTracksCatalog[requestedTrackId] ? RaceTracksCatalog[requestedTrackId] : null;
                const defaultCircuit = WAGER_CIRCUITS_DEFAULT.find(t => t.id === requestedTrackId) || null;
                const circuit = jsonTrack
                    ? { id: jsonTrack.id || requestedTrackId, name: cleanText(jsonTrack.name, 80, requestedTrackId) }
                    : (defaultCircuit || getRandomCircuit());
                const requestedBet = Math.round(Number(data.betAmount));
                const cleanBet = Number.isFinite(requestedBet) ? Math.min(10000, Math.max(10, requestedBet)) : 100;

                const duel = {
                    code,
                    betAmount: cleanBet,
                    circuit,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 600000, // 10 minutos de validez
                    hostUserId: userId,
                    slots: [
                        {
                            id: 'host',
                            userId,
                            name,
                            carName,
                            colorHex,
                            archetype,
                            isAI: false,
                            isPlayer: true,
                            stake: cleanBet,
                            roleLabel: '👑 ANFITRIÓN (TÚ)',
                            status: 'LISTO'
                        }
                    ],
                    status: 'WAITING',
                    results: {}
                };

                privateDuels.set(code, duel);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, code, duel: publicDuelView(duel, auth.userId) }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // 5. Unirse a Duelo Privado con Código
    if (pathname === '/api/multiplayer/duel/join' && req.method === 'POST') {
        readJsonBody(req, res, MAX_API_BODY_BYTES, (data) => {
            try {
                const auth = requireKnownUser(req, res, data.userId, data);
                if (!auth) return;
                const userId = auth.userId;
                const name = cleanText(data.name, 40, 'PILOTO');
                const carName = cleanText(data.carName, 80, 'GT3 Racer');
                const colorHex = cleanColorHex(data.colorHex);
                const archetype = cleanArchetype(data.archetype);
                if (!FEATURES.wagerStakesEnabled) {
                    sendJson(res, 410, { ok: false, error: 'wager_stakes_disabled', message: 'Los duelos con apuesta están pausados hasta completar escrow y liquidación en servidor' });
                    return;
                }
                const cleanCode = cleanDuelCode(data.code);
                const duel = cleanCode ? privateDuels.get(cleanCode) : null;

                if (!duel) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'not_found', message: 'Código de duelo no encontrado o expirado' }));
                    return;
                }

                if (Date.now() > Number(duel.expiresAt || 0)) {
                    privateDuels.delete(cleanCode);
                    sendJson(res, 410, { ok: false, error: 'expired', message: 'Código de duelo expirado' });
                    return;
                }

                if (duel.status !== 'WAITING') {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'already_started', message: 'La sala de duelo ya está en juego' }));
                    return;
                }

                if (duel.hostUserId === userId) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, code: cleanCode, duel: publicDuelView(duel, auth.userId) }));
                    return;
                }

                if (duel.slots.some(s => s && s.userId === userId)) {
                    sendJson(res, 200, { ok: true, code: cleanCode, duel: publicDuelView(duel, auth.userId) });
                    return;
                }
                if (duel.slots.length >= 2) {
                    sendJson(res, 409, { ok: false, error: 'duel_full', message: 'La sala de duelo ya está completa' });
                    return;
                }

                // Añadir rival desafiante
                duel.slots.push({
                    id: 'guest',
                    userId,
                    name,
                    carName,
                    colorHex,
                    archetype,
                    isAI: false,
                    isPlayer: false,
                    stake: duel.betAmount,
                    roleLabel: '⚔️ RIVAL RETADOR',
                    status: 'LISTO'
                });

                duel.status = 'STARTING';
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, code: cleanCode, duel: publicDuelView(duel, auth.userId) }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // 6. Consultar estado del Duelo Privado (Polling cada 1s)
    if (pathname === '/api/multiplayer/duel/status') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        const code = cleanDuelCode(parsedUrl.searchParams.get('code'));
        const duel = code ? privateDuels.get(code) : null;

        if (!duel) {
            sendJson(res, 200, { ok: false, status: 'NOT_FOUND' });
            return;
        }
        if (Date.now() > Number(duel.expiresAt || 0)) {
            privateDuels.delete(code);
            sendJson(res, 200, { ok: false, status: 'EXPIRED' });
            return;
        }

        const viewerUserId = optionalViewerUserId(req, parsedUrl.searchParams.get('userId'));
        const view = publicDuelView(duel, viewerUserId);
        sendJson(res, 200, { ok: true, duel: view, status: duel.status, slots: view.slots });
        return;
    }

    // 7. Cancelar Duelo Privado
    if (pathname === '/api/multiplayer/duel/cancel' && req.method === 'POST') {
        readJsonBody(req, res, MAX_API_BODY_BYTES, (data) => {
            const auth = requireKnownUser(req, res, data.userId, data);
            if (!auth) return;
            const cleanCode = cleanDuelCode(data.code);
            const duel = cleanCode ? privateDuels.get(cleanCode) : null;
            if (!duel) {
                sendJson(res, 404, { ok: false, error: 'not_found' });
                return;
            }
            if (duel.hostUserId === auth.userId) {
                privateDuels.delete(cleanCode);
                sendJson(res, 200, { ok: true, cancelled: true });
                return;
            }
            const guestIndex = duel.slots.findIndex(s => s && s.userId === auth.userId);
            if (guestIndex >= 0) {
                duel.slots.splice(guestIndex, 1);
                duel.status = 'WAITING';
                sendJson(res, 200, { ok: true, left: true });
                return;
            }
            securityAuditLogs.push({ event: 'DUEL_CANCEL_FORBIDDEN', code: cleanCode, userId: auth.userId, ip: clientIp, time: new Date().toISOString() });
            sendJson(res, 403, { ok: false, error: 'forbidden', message: 'Solo un participante puede cancelar o salir del duelo' });
        });
        return;
    }

    // ===== GUARDADO EN SERVIDOR DEL JUGADOR (v100 - cloud_save.js) =====
    // GET    /api/save/:userId  -> descargar guardado (garaje + historia + ajustes)
    // PUT    /api/save/:userId  -> subir guardado (POST también, para sendBeacon al salir)
    // DELETE /api/save/:userId  -> borrar (botón "restablecer progreso" en Ajustes)
    if (pathname.startsWith('/api/save/')) {
        const saveId = decodeURIComponent(pathname.replace('/api/save/', ''));
        if (!isValidSaveId(saveId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'invalid_id' }));
            return;
        }
        const authz = authorizeSaveAccess(req, saveId);
        if (!authz.ok) {
            securityAuditLogs.push({ event: 'SAVE_AUTH_FAILED', saveId, ip: clientIp, error: authz.error, time: new Date().toISOString() });
            sendJson(res, authz.status || 403, { ok: false, error: authz.error || 'forbidden', reason: authz.reason });
            return;
        }

        if (req.method === 'GET') {
            const save = db.getPlayerSave(saveId);
            if (!save) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'not_found' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, save }));
            return;
        }

        if (req.method === 'DELETE') {
            const existed = db.deletePlayerSave(saveId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, deleted: existed }));
            return;
        }

        if (req.method === 'PUT' || req.method === 'POST') {
            readJsonBody(req, res, 1024 * 1024, (data) => {
                if (!data || typeof data !== 'object' || Array.isArray(data) ||
                    (data.garage != null && (typeof data.garage !== 'object' || Array.isArray(data.garage))) ||
                    (data.story != null && (typeof data.story !== 'object' || Array.isArray(data.story))) ||
                    (data.extra != null && (typeof data.extra !== 'object' || Array.isArray(data.extra)))) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'invalid_save_shape' }));
                    return;
                }
                const result = db.putPlayerSave(saveId, data);
                if (!result.ok && result.error) {
                    sendJson(res, 400, { ok: false, error: result.error, message: result.message || 'Guardado no válido' });
                    return;
                }
                if (!result.ok) {
                    // Otro dispositivo guardó después: gana la versión más nueva
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, conflict: true, save: result.save }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, updatedAt: result.save.updatedAt, serverSavedAt: result.save.serverSavedAt, save: result.save }));
            });
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
        return;
    }

    if (pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: 'api_not_found' });
        return;
    }

    // ===== RUTAS ESTÁTICAS =====
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('405 Method Not Allowed');
        return;
    }
    const filePath = resolvePublicStaticPath(pathname);
    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Caché optimizado (v100):
        // - Multimedia: 1 día + revalidación en segundo plano.
        // - JS/CSS versionados (?v=100): 7 días inmutables -> las reaperturas en Telegram son casi instantáneas.
        // - El resto (HTML y recursos sin versión): siempre fresco.
        const isMedia = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp3', '.ogg', '.wav'].includes(ext);
        const isVersionedAsset = parsedUrl.searchParams.has('v') && ['.js', '.css'].includes(ext);
        const cacheHeader = isMedia
            ? 'public, max-age=86400, stale-while-revalidate=604800'
            : (isVersionedAsset
                ? 'public, max-age=604800, immutable'
                : 'no-cache, no-store, must-revalidate');

        // Compresión gzip (v100): tracks_data.js y compañía pesan ~2,8 MB sin comprimir;
        // con gzip la primera carga en el móvil se reduce en torno a un 70 %.
        const isCompressible = ['.html', '.css', '.js', '.json', '.svg', '.txt'].includes(ext);
        const acceptsGzip = typeof req.headers['accept-encoding'] === 'string' && req.headers['accept-encoding'].includes('gzip');

        const headers = {
            'Content-Type': contentType,
            'Cache-Control': cacheHeader,
            'Pragma': (isMedia || isVersionedAsset) ? 'public' : 'no-cache',
            'Vary': 'Accept-Encoding'
        };

        if (req.method === 'HEAD') {
            headers['Content-Length'] = stats.size;
            res.writeHead(200, headers);
            res.end();
            return;
        }

        const streamError = () => {
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            } else {
                res.destroy();
            }
        };
        if (isCompressible && acceptsGzip) {
            headers['Content-Encoding'] = 'gzip';
            res.writeHead(200, headers);
            fs.createReadStream(filePath).on('error', streamError).pipe(zlib.createGzip({ level: 6 })).on('error', streamError).pipe(res);
        } else {
            headers['Content-Length'] = stats.size;
            res.writeHead(200, headers);
            fs.createReadStream(filePath).on('error', streamError).pipe(res);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🏁 APEX MOTORSPORT - Servidor Web & Game Hub listo`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 URL IPv4:  http://127.0.0.1:${PORT}`);
    console.log(`💾 Base SQLite y guardados en: ${db.DB_FILE}`);
    try { console.log('🗄️ Estado BD:', db.getDatabaseHealth()); } catch (e) {}
    scheduleDatabaseBackups();
    console.log(`=======================================================`);

    if (process.env.BOT_TOKEN) {
        console.log(`🤖 BOT_TOKEN detectado. Iniciando Bot de Telegram en el mismo proceso...`);
        try {
            require('./bot');
        } catch (botErr) {
            console.error('Error arrancando bot.js:', botErr);
        }
    }
});
