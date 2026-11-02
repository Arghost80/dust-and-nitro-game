// ===== SERVIDOR AUTOCONTENIDO NATIVO (SIN DEPENDENCIAS EXTERNAS) =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const db = require('./database');
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

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER_EXTERNAL_URL);
const ALLOW_INSECURE_DEV_AUTH = process.env.ALLOW_INSECURE_DEV_AUTH === 'true' && !IS_PRODUCTION;
const ENABLE_LEGACY_WAGER_API = process.env.ENABLE_LEGACY_WAGER_API === 'true';
const ADMIN_AUDIT_TOKEN = process.env.ADMIN_AUDIT_TOKEN || '';
const ADSGRAM_WEBHOOK_SECRET = process.env.ADSGRAM_WEBHOOK_SECRET || '';
const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || Boolean(process.env.RENDER_EXTERNAL_URL);
const MAX_API_BODY_BYTES = 64 * 1024;
// Billetera Oficial de Tesorería del Proyecto (Receptora de fondos del juego, swaps y Ads)
const TREASURY_WALLET_ADDRESS = process.env.TREASURY_WALLET_ADDRESS || 'UQD4ivLM7PJ7XpX_CflUUhoZW361xvOH4WP869C9WghJAN4X';

// ===== MOTOR DE SEGURIDAD, AUDITORÍA Y PROTECCIÓN ANTI-BOTS =====
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const activeMatchTickets = new Map();
const rateLimitMap = new Map();
const securityAuditLogs = [];

// ===== SISTEMA MULTIJUGADOR REAL: SALAS PÚBLICAS Y DUELOS PRIVADOS =====
const publicLobbies = new Map(); // roomId -> active lobby
const privateDuels = new Map();  // duelCode -> private duel room

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
        isPlayer: slot.isPlayer === true
    };
}

function publicDuelView(duel) {
    if (!duel) return duel;
    return {
        ...duel,
        circuit: duel.circuit ? {
            id: cleanText(duel.circuit.id, 60),
            name: cleanText(duel.circuit.name, 80, 'Circuito')
        } : duel.circuit,
        slots: Array.isArray(duel.slots) ? duel.slots.map(sanitizeSlot) : []
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

        if (calculatedHash !== hash) {
            return { valid: false, reason: 'Firma HMAC adulterada (posible bot o suplantación)' };
        }

        const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
        if (Date.now() / 1000 - authDate > 86400) {
            return { valid: false, reason: 'Sesión expirada (>24h anti-replay)' };
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
// - usr_...: credencial bearer de dispositivo (no debe filtrarse).
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
    if (isDeviceId(id)) return { ok: true, userId: id, authMode: 'device_bearer' };
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
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > Number(entry.resetAt || 0)) rateLimitMap.delete(key);
    }
    if (securityAuditLogs.length > 200) securityAuditLogs.splice(0, securityAuditLogs.length - 200);
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
    'favicon.ico'
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

    // Cabeceras de seguridad. La CSP se envía en Report-Only mientras el
    // frontend conserva handlers inline; ya documenta el perímetro permitido
    // y permite endurecerla sin romper Telegram/Adsgram de forma abrupta.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy-Report-Only', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org https://sad.adsgram.ai",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://telegram.org https://*.telegram.org https://sad.adsgram.ai",
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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, X-Admin-Token, X-Adsgram-Secret');
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
        sendJson(res, 200, { ok: true, service: 'apex-motorsport', version: '1.0.1', uptimeSeconds: Math.round(process.uptime()) });
        return;
    }

    // ===== RUTAS DE API =====
    // Webhook de recompensa publicitaria: deshabilitado hasta verificar la
    // firma/secreto oficial del proveedor. Nunca concede saldo por sí solo.
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
        const userId = cleanText(parsedUrl.searchParams.get('userid') || 'unknown', 64, 'unknown');
        console.log(`💰 Adsgram Reward Webhook autenticado para userId: ${userId}`);
        sendJson(res, 200, { ok: true, status: 'reward_not_granted_server_ledger_required', userId, timestamp: new Date().toISOString() });
        return;
    }

    // Estado interno de seguridad: solo con token de administrador. No se
    // publican logs, tickets, tesorería ni el detalle de defensas.
    if (pathname === '/api/security/audit') {
        if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
            return;
        }
        if (!ADMIN_AUDIT_TOKEN) {
            sendJson(res, 503, { ok: false, error: 'admin_audit_not_configured', message: 'Configura ADMIN_AUDIT_TOKEN para habilitar este endpoint' });
            return;
        }
        const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const suppliedToken = req.headers['x-admin-token'] || bearer;
        if (!timingSafeEqualString(suppliedToken, ADMIN_AUDIT_TOKEN)) {
            securityAuditLogs.push({ event: 'ADMIN_AUDIT_AUTH_FAILED', ip: clientIp, time: new Date().toISOString() });
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
        }
        sendJson(res, 200, {
            ok: true,
            status: 'admin_only',
            timestamp: new Date().toISOString(),
            telegramAuthConfigured: Boolean(BOT_TOKEN),
            insecureDevAuthEnabled: ALLOW_INSECURE_DEV_AUTH,
            legacyWagerApiEnabled: ENABLE_LEGACY_WAGER_API,
            circuitBreakerTriggered: emergencyCircuitBreaker.isTriggered,
            activeTicketsInFlight: activeMatchTickets.size,
            activePublicLobbies: publicLobbies.size,
            activePrivateDuels: privateDuels.size
        });
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
            if (!trackId || !Number.isFinite(cleanTime) || cleanTime < minAllowedTime || cleanTime > 3600) {
                securityAuditLogs.push({ event: 'INVALID_RACE_RESULT', userId: auth.userId, trackId: trackId || rawTrack.slice(0, 80), time: cleanTime, ip: clientIp, timeStamp: new Date().toISOString() });
                sendJson(res, 422, { ok: false, error: 'invalid_race_result', message: 'Circuito o tiempo de carrera no válido', minAllowedTime: Math.round(minAllowedTime * 100) / 100 });
                return;
            }

            const telegramName = auth.telegramUser
                ? (auth.telegramUser.username || [auth.telegramUser.first_name, auth.telegramUser.last_name].filter(Boolean).join(' '))
                : '';
            const username = cleanText(telegramName || data.username, 40, 'Piloto');
            const carName = cleanText(data.car, 80, '');
            const result = db.recordRaceResult(auth.userId, username, trackName, cleanTime, carName);
            sendJson(res, 200, { ok: true, trackId, track: trackName, ...result });
        });
        return;
    }

    if (pathname === '/api/leaderboard') {
        if (req.method !== 'GET') { sendJson(res, 405, { ok: false, error: 'method_not_allowed' }); return; }
        sendJson(res, 200, db.getLeaderboard());
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
                            id: 'player_' + userId,
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
                    slots: lobby.slots,
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
            slots: lobby.slots,
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
                res.end(JSON.stringify({ ok: true, code, duel }));
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
                    res.end(JSON.stringify({ ok: true, code: cleanCode, duel }));
                    return;
                }

                if (duel.slots.some(s => s && s.userId === userId)) {
                    sendJson(res, 200, { ok: true, code: cleanCode, duel: publicDuelView(duel) });
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
                res.end(JSON.stringify({ ok: true, code: cleanCode, duel }));
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

        const view = publicDuelView(duel);
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
                res.end(JSON.stringify({ ok: true, updatedAt: result.save.updatedAt, serverSavedAt: result.save.serverSavedAt }));
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
    console.log(`💾 Guardados de jugadores en: ${db.DB_FILE}`);
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
