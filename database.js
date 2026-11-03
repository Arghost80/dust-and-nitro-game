// ===== BASE DE DATOS TRANSACCIONAL SQLITE (v104) =====
// La v103 guardaba todo el estado en un único JSON que se reescribía entero.
// Era suficiente para una beta pequeña, pero no para pedidos pagados ni para
// una economía autoritativa: una compra, su hash on-chain y el abono al
// jugador deben confirmarse en la MISMA transacción.
//
// v104 usa SQLite en modo WAL mediante better-sqlite3 (API síncrona, igual
// que el resto del servidor) y migra automáticamente el JSON anterior:
//   - DATA_DIR/game_database.json  -> DATA_DIR/game_database.sqlite
//   - Si DB_FILE apunta a un JSON existente, se importa y ese mismo archivo
//     pasa a contener SQLite (el JSON original se conserva renombrado).
// Los archivos corruptos se preservan con sufijo .corrupt-<timestamp>, como
// hacía la capa JSON, para permitir recuperación manual.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SqliteDatabase = require('better-sqlite3');

const SCHEMA_VERSION = 106;
const DATA_DIR = process.env.DATA_DIR || process.env.DB_DIR || __dirname;
const EXPLICIT_DB_FILE = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : null;
const DB_FILE = EXPLICIT_DB_FILE || path.join(DATA_DIR, 'game_database.sqlite');
const LEGACY_DB_FILE = EXPLICIT_DB_FILE || path.join(DATA_DIR, 'game_database.json');

// Dotación inicial finita para cuentas internas/de equipo. Los IDs reales no
// viven en el repositorio: se configuran en el proveedor de despliegue con
// TEAM_BOOTSTRAP_TELEGRAM_IDS (o el alias TEAM_ACCOUNT_IDS), separados por
// comas. Solo se aceptan IDs numéricos de Telegram y la autenticidad sigue
// dependiendo de la verificación normal de initData; conocer un ID no basta.
const TEAM_BOOTSTRAP_GRANT_VERSION = 1;
const TEAM_BOOTSTRAP_MINIMUM_CREDITS = 100000;
const TEAM_BOOTSTRAP_ACCOUNT_IDS = new Set(
    String(process.env.TEAM_BOOTSTRAP_TELEGRAM_IDS || process.env.TEAM_ACCOUNT_IDS || '')
        .split(/[\s,;]+/)
        .map(value => String(value || '').trim())
        .filter(value => /^\d{5,20}$/.test(value))
);

function isTeamBootstrapAccount(userId) {
    return TEAM_BOOTSTRAP_ACCOUNT_IDS.has(String(userId || ''));
}

function boundedIntEnv(name, fallback, min, max) {
    const value = Math.floor(Number(process.env[name]));
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

// Mercado interno autoritativo (v106). La comisión histórica del cliente era
// 7,5 % y ahora queda fijada en servidor: el comprador paga el precio íntegro,
// el vendedor recibe el neto y la diferencia sale de circulación registrada
// como plataforma/quema/pool en la fila de la operación.
const MARKETPLACE_CONFIG = Object.freeze({
    feeBps: boundedIntEnv('MARKETPLACE_FEE_BPS', 750, 0, 3000),
    minCarPriceCr: boundedIntEnv('MARKETPLACE_MIN_CAR_PRICE_CR', 50, 1, 1000000),
    minPartPriceCr: boundedIntEnv('MARKETPLACE_MIN_PART_PRICE_CR', 10, 1, 1000000),
    maxPriceCr: boundedIntEnv('MARKETPLACE_MAX_PRICE_CR', 10000000, 1000, 1000000000),
    maxActiveListingsPerUser: boundedIntEnv('MARKETPLACE_MAX_ACTIVE_LISTINGS', 20, 1, 100),
    defaultListingDays: boundedIntEnv('MARKETPLACE_LISTING_DAYS', 30, 1, 90),
    maxPartQuantity: boundedIntEnv('MARKETPLACE_MAX_PART_QUANTITY', 999, 1, 10000)
});

const DEFAULT_CARS_CATALOG = [
    { id: 'v8_interceptor', name: 'INTERCEPTOR V8', price: 0, speed: 380, handling: 4.8, accel: 320, color: '#e63946', unlocked: true },
    { id: 'cyan_phantom', name: 'CYAN PHANTOM', price: 500, speed: 410, handling: 4.5, accel: 350, color: '#00f5d4', unlocked: false },
    { id: 'neon_viper', name: 'NEON VIPER', price: 1200, speed: 430, handling: 5.2, accel: 380, color: '#fee440', unlocked: false },
    { id: 'shadow_titan', name: 'SHADOW TITAN', price: 2500, speed: 450, handling: 4.2, accel: 420, color: '#7209b7', unlocked: false }
];

// Filas de demostración que la capa JSON sembraba en bases de datos nuevas.
// Se reconocen y se descartan durante la migración: un ranking oficial no
// debe mostrar pilotos inventados.
const LEGACY_SEEDED_LEADERBOARD = new Set([
    'AlexPro_89|Apex Valley|42.15|Interceptor V8',
    'DriftQueen|Apex Valley|43.4|Cyan Phantom',
    'Badlander|Apex Valley|45.1|Road Monster'
]);

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value, fallback = null) {
    if (value == null) return fallback;
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return fallback; }
}

function parseJsonColumn(value, fallback = null) {
    if (value == null || value === '') return cloneJson(fallback);
    try { return JSON.parse(String(value)); } catch (e) { return cloneJson(fallback); }
}

function nowIso(nowMs = Date.now()) {
    return new Date(nowMs).toISOString();
}

function cleanDbText(value, maxLength = 80, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, maxLength);
    return text || fallback;
}

function hashWithDomain(domain, userId, secret) {
    return crypto.createHash('sha256')
        .update(`${domain}:${String(userId)}:${String(secret)}`)
        .digest('hex');
}

function hashDeviceSecret(userId, secret) {
    return hashWithDomain('apex-device-v1', userId, secret);
}

function timingSafeHexEqual(a, b) {
    try {
        const left = Buffer.from(String(a || ''), 'hex');
        const right = Buffer.from(String(b || ''), 'hex');
        return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
    } catch (e) {
        return false;
    }
}

function validateJsonValue(value, depth, state) {
    if (depth > 12) return false;
    state.nodes += 1;
    if (state.nodes > 30000) return false;
    if (value === null || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.length <= 20000;
    if (Array.isArray(value)) {
        if (value.length > 5000) return false;
        return value.every(item => validateJsonValue(item, depth + 1, state));
    }
    if (isPlainObject(value)) {
        const keys = Object.keys(value);
        if (keys.length > 1000) return false;
        return keys.every(key => {
            if (key.length > 120 || key === '__proto__' || key === 'prototype' || key === 'constructor') return false;
            return validateJsonValue(value[key], depth + 1, state);
        });
    }
    return false;
}

function normalizedSaveTimestamp(value, now = Date.now()) {
    const ts = Number(value);
    if (!Number.isFinite(ts) || ts <= 0) return now;
    return Math.min(ts, now + 60 * 1000);
}

function validatePlayerSave(incoming) {
    if (!isPlainObject(incoming)) return { ok: false, error: 'invalid_save_shape', message: 'El guardado debe ser un objeto JSON' };
    if (incoming.garage != null && !isPlainObject(incoming.garage)) return { ok: false, error: 'invalid_save_shape', message: 'garage debe ser un objeto' };
    if (incoming.story != null && !isPlainObject(incoming.story)) return { ok: false, error: 'invalid_save_shape', message: 'story debe ser un objeto' };
    if (incoming.extra != null && !isPlainObject(incoming.extra)) return { ok: false, error: 'invalid_save_shape', message: 'extra debe ser un objeto' };
    if (!incoming.garage && !incoming.story) return { ok: false, error: 'invalid_save_shape', message: 'El guardado no contiene garaje ni historia' };
    if (!validateJsonValue(incoming, 0, { nodes: 0 })) {
        return { ok: false, error: 'invalid_save_shape', message: 'El guardado contiene valores o una estructura no permitida' };
    }
    const garage = incoming.garage || {};
    for (const field of ['credits', 'gems']) {
        if (garage[field] != null && (!Number.isFinite(Number(garage[field])) || Number(garage[field]) < 0 || Number(garage[field]) > 1000000000)) {
            return { ok: false, error: 'invalid_save_shape', message: `${field} está fuera de rango` };
        }
    }
    if (garage.garage != null && !Array.isArray(garage.garage)) {
        return { ok: false, error: 'invalid_save_shape', message: 'garage.garage debe ser una lista' };
    }
    return { ok: true };
}

function validateGarageShape(garage) {
    if (!isPlainObject(garage)) return false;
    if (!Array.isArray(garage.garage) || garage.garage.length < 1 || garage.garage.length > 1000) return false;
    if (!garage.garage.every(car => isPlainObject(car) && typeof car.instanceId === 'string' && car.instanceId.length >= 1 && car.instanceId.length <= 120)) return false;
    for (const field of ['credits', 'gems']) {
        const value = Number(garage[field]);
        if (!Number.isFinite(value) || value < 0 || value > 1000000000) return false;
    }
    if (garage.partsInventory != null && !isPlainObject(garage.partsInventory)) return false;
    return validateJsonValue(garage, 0, { nodes: 0 });
}

function ensureDataDirectory() {
    try {
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true, mode: 0o700 });
    } catch (e) {
        console.warn('⚠️ No se pudo crear la carpeta de datos:', e.message);
    }
}

function secureFile(file) {
    try { if (fs.existsSync(file)) fs.chmodSync(file, 0o600); } catch (e) {}
}

function secureDatabaseFiles() {
    secureFile(DB_FILE);
    secureFile(DB_FILE + '-wal');
    secureFile(DB_FILE + '-shm');
}

function fileLooksLikeSqlite(file) {
    try {
        if (!fs.existsSync(file)) return false;
        const fd = fs.openSync(file, 'r');
        try {
            const header = Buffer.alloc(16);
            const read = fs.readSync(fd, header, 0, 16, 0);
            return read === 16 && header.toString('utf8') === 'SQLite format 3\u0000';
        } finally {
            fs.closeSync(fd);
        }
    } catch (e) {
        return false;
    }
}

function preserveCorruptFile(file) {
    const backupFile = `${file}.corrupt-${Date.now()}`;
    fs.renameSync(file, backupFile);
    secureFile(backupFile);
    return backupFile;
}

let sqlite = null;
let statements = null;

function createSchema(db) {
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL DEFAULT '',
            data_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS saves (
            user_id TEXT PRIMARY KEY,
            updated_at INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            server_saved_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS device_credentials (
            user_id TEXT PRIMARY KEY,
            hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            recovery_hash TEXT,
            recovery_created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS economy_profiles (
            user_id TEXT PRIMARY KEY,
            version INTEGER NOT NULL DEFAULT 1,
            garage_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS economy_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            idempotency_key TEXT UNIQUE,
            delta_credits REAL NOT NULL DEFAULT 0,
            delta_gems REAL NOT NULL DEFAULT 0,
            details_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_economy_ledger_user_created
            ON economy_ledger(user_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS purchases (
            order_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL,
            tx_hash TEXT UNIQUE,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_purchases_user_status
            ON purchases(user_id, status, created_at DESC);
        CREATE TABLE IF NOT EXISTS processed_ton_tx (
            tx_hash TEXT PRIMARY KEY,
            order_id TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS processed_payment_charges (
            provider TEXT NOT NULL,
            charge_id TEXT NOT NULL,
            order_id TEXT,
            user_id TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL,
            data_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(provider, charge_id)
        );
        CREATE INDEX IF NOT EXISTS idx_processed_payment_charges_order
            ON processed_payment_charges(provider, order_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_processed_payment_charges_user
            ON processed_payment_charges(provider, user_id, status, created_at DESC);
        CREATE TABLE IF NOT EXISTS nft_car_registry (
            serial INTEGER PRIMARY KEY AUTOINCREMENT,
            registry_id TEXT UNIQUE,
            owner_user_id TEXT NOT NULL,
            car_instance_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'offchain',
            chain_network TEXT,
            collection_address TEXT,
            nft_item_address TEXT,
            nft_index INTEGER UNIQUE,
            owner_wallet_address TEXT,
            mint_tx_hash TEXT,
            metadata_hash TEXT,
            snapshot_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(owner_user_id, car_instance_id)
        );
        CREATE INDEX IF NOT EXISTS idx_nft_car_registry_owner
            ON nft_car_registry(owner_user_id, serial ASC);
        CREATE INDEX IF NOT EXISTS idx_nft_car_registry_status
            ON nft_car_registry(status, serial ASC);
        CREATE TABLE IF NOT EXISTS nft_mint_claims (
            claim_id TEXT PRIMARY KEY,
            registry_serial INTEGER NOT NULL UNIQUE,
            owner_user_id TEXT NOT NULL,
            car_instance_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'prepared',
            network TEXT NOT NULL,
            wallet_address TEXT,
            wallet_verified_at TEXT,
            metadata_uri TEXT,
            metadata_hash TEXT,
            snapshot_json TEXT NOT NULL DEFAULT '{}',
            claim_nonce_hash TEXT NOT NULL,
            tx_hash TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(registry_serial) REFERENCES nft_car_registry(serial)
        );
        CREATE INDEX IF NOT EXISTS idx_nft_mint_claims_owner
            ON nft_mint_claims(owner_user_id, status, created_at DESC);
        CREATE TABLE IF NOT EXISTS marketplace_listings (
            listing_id TEXT PRIMARY KEY,
            seller_user_id TEXT NOT NULL,
            seller_pilot_name TEXT NOT NULL DEFAULT '',
            asset_type TEXT NOT NULL CHECK(asset_type IN ('car', 'part')),
            car_instance_id TEXT,
            registry_serial INTEGER REFERENCES nft_car_registry(serial),
            part_id TEXT,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
            price_cr INTEGER NOT NULL CHECK(price_cr > 0),
            status TEXT NOT NULL DEFAULT 'active',
            asset_json TEXT NOT NULL,
            public_snapshot_json TEXT NOT NULL DEFAULT '{}',
            idempotency_key TEXT,
            buyer_user_id TEXT,
            gross_cr INTEGER,
            fee_bps INTEGER,
            fee_cr INTEGER,
            platform_fee_cr INTEGER,
            burn_fee_cr INTEGER,
            rewards_fee_cr INTEGER,
            seller_net_cr INTEGER,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sold_at TEXT,
            cancelled_at TEXT,
            cancel_reason TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_marketplace_status_created
            ON marketplace_listings(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketplace_seller_status
            ON marketplace_listings(seller_user_id, status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketplace_buyer_status
            ON marketplace_listings(buyer_user_id, status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketplace_expiry
            ON marketplace_listings(status, expires_at ASC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_seller_idempotency
            ON marketplace_listings(seller_user_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_active_car_instance
            ON marketplace_listings(seller_user_id, car_instance_id)
            WHERE status = 'active' AND asset_type = 'car' AND car_instance_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_active_registry
            ON marketplace_listings(registry_serial)
            WHERE status = 'active' AND registry_serial IS NOT NULL;
        CREATE TABLE IF NOT EXISTS marketplace_trades (
            trade_id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL UNIQUE REFERENCES marketplace_listings(listing_id),
            seller_user_id TEXT NOT NULL,
            buyer_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL CHECK(asset_type IN ('car', 'part')),
            registry_serial INTEGER REFERENCES nft_car_registry(serial),
            source_car_instance_id TEXT,
            delivered_car_instance_id TEXT,
            part_id TEXT,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
            gross_cr INTEGER NOT NULL,
            fee_cr INTEGER NOT NULL,
            platform_fee_cr INTEGER NOT NULL,
            burn_fee_cr INTEGER NOT NULL,
            rewards_fee_cr INTEGER NOT NULL,
            seller_net_cr INTEGER NOT NULL,
            asset_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_marketplace_trades_seller
            ON marketplace_trades(seller_user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketplace_trades_buyer
            ON marketplace_trades(buyer_user_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            track_id TEXT NOT NULL,
            track_name TEXT NOT NULL,
            time_seconds REAL NOT NULL,
            car_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, track_id)
        );
        CREATE INDEX IF NOT EXISTS idx_leaderboard_track_time
            ON leaderboard_entries(track_id, time_seconds ASC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_time
            ON leaderboard_entries(time_seconds ASC);
        CREATE TABLE IF NOT EXISTS ad_reward_entitlements (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            source_id TEXT UNIQUE,
            created_at TEXT NOT NULL,
            claimed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_status
            ON ad_reward_entitlements(user_id, status, created_at ASC);
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            event TEXT NOT NULL,
            details_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created
            ON audit_events(created_at DESC);
    `);
    db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)')
        .run(SCHEMA_VERSION, nowIso());
    const existingCatalog = db.prepare('SELECT value_json FROM meta WHERE key = ?').get('carsCatalog');
    if (!existingCatalog) {
        db.prepare('INSERT INTO meta(key, value_json) VALUES (?, ?)').run('carsCatalog', JSON.stringify(DEFAULT_CARS_CATALOG));
    }
}

function prepareStatements(db) {
    return {
        getMeta: db.prepare('SELECT value_json FROM meta WHERE key = ?'),
        setMeta: db.prepare('INSERT INTO meta(key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json'),
        getUser: db.prepare('SELECT data_json FROM users WHERE user_id = ?'),
        upsertUser: db.prepare(`INSERT INTO users(user_id, username, data_json, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, data_json = excluded.data_json, updated_at = excluded.updated_at`),
        getSave: db.prepare('SELECT data_json, updated_at FROM saves WHERE user_id = ?'),
        upsertSave: db.prepare(`INSERT INTO saves(user_id, updated_at, data_json, server_saved_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at, data_json = excluded.data_json, server_saved_at = excluded.server_saved_at`),
        deleteSave: db.prepare('DELETE FROM saves WHERE user_id = ?'),
        getDeviceCredential: db.prepare('SELECT * FROM device_credentials WHERE user_id = ?'),
        insertDeviceCredential: db.prepare('INSERT INTO device_credentials(user_id, hash, created_at) VALUES (?, ?, ?)'),
        updateDeviceHash: db.prepare('UPDATE device_credentials SET hash = ?, recovery_hash = NULL, recovery_created_at = NULL WHERE user_id = ?'),
        setRecoveryHash: db.prepare('UPDATE device_credentials SET recovery_hash = ?, recovery_created_at = ? WHERE user_id = ?'),
        getEconomyProfile: db.prepare('SELECT * FROM economy_profiles WHERE user_id = ?'),
        insertEconomyProfile: db.prepare('INSERT INTO economy_profiles(user_id, version, garage_json, created_at, updated_at) VALUES (?, 1, ?, ?, ?)'),
        updateEconomyProfile: db.prepare('UPDATE economy_profiles SET version = version + 1, garage_json = ?, updated_at = ? WHERE user_id = ?'),
        deleteEconomyProfile: db.prepare('DELETE FROM economy_profiles WHERE user_id = ?'),
        listEconomyProfiles: db.prepare('SELECT * FROM economy_profiles ORDER BY updated_at DESC Limit ?'),
        getLedgerByKey: db.prepare('SELECT * FROM economy_ledger WHERE idempotency_key = ?'),
        insertLedger: db.prepare('INSERT INTO economy_ledger(user_id, action, idempotency_key, delta_credits, delta_gems, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
        listLedger: db.prepare('SELECT * FROM economy_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
        insertPurchase: db.prepare('INSERT INTO purchases(order_id, user_id, status, tx_hash, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
        getPurchase: db.prepare('SELECT data_json FROM purchases WHERE order_id = ?'),
        getPurchaseByTx: db.prepare('SELECT data_json FROM purchases WHERE tx_hash = ?'),
        updatePurchase: db.prepare('UPDATE purchases SET status = ?, tx_hash = ?, data_json = ?, updated_at = ? WHERE order_id = ?'),
        listPurchasesByUser: db.prepare('SELECT data_json FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
        listPurchasesByUserStatus: db.prepare('SELECT data_json FROM purchases WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?'),
        getProcessedTx: db.prepare('SELECT order_id FROM processed_ton_tx WHERE tx_hash = ?'),
        insertProcessedTx: db.prepare('INSERT INTO processed_ton_tx(tx_hash, order_id) VALUES (?, ?)'),
        getProcessedPaymentCharge: db.prepare('SELECT * FROM processed_payment_charges WHERE provider = ? AND charge_id = ?'),
        insertProcessedPaymentCharge: db.prepare('INSERT INTO processed_payment_charges(provider, charge_id, order_id, user_id, status, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
        updateProcessedPaymentCharge: db.prepare('UPDATE processed_payment_charges SET order_id = ?, status = ?, data_json = ?, updated_at = ? WHERE provider = ? AND charge_id = ?'),
        listProcessedPaymentChargesByOrder: db.prepare('SELECT * FROM processed_payment_charges WHERE provider = ? AND order_id = ? ORDER BY created_at ASC'),
        insertNftRegistry: db.prepare('INSERT INTO nft_car_registry(registry_id, owner_user_id, car_instance_id, status, nft_index, metadata_hash, snapshot_json, created_at, updated_at) VALUES (NULL, ?, ?, \'offchain\', NULL, ?, ?, ?, ?)'),
        finalizeNftRegistryIdentity: db.prepare('UPDATE nft_car_registry SET registry_id = ?, nft_index = ? WHERE serial = ?'),
        getNftRegistryByOwnerInstance: db.prepare('SELECT * FROM nft_car_registry WHERE owner_user_id = ? AND car_instance_id = ?'),
        getNftRegistryBySerial: db.prepare('SELECT * FROM nft_car_registry WHERE serial = ?'),
        listNftRegistryByOwner: db.prepare('SELECT * FROM nft_car_registry WHERE owner_user_id = ? ORDER BY serial ASC'),
        updateNftRegistryStatus: db.prepare('UPDATE nft_car_registry SET status = ?, updated_at = ? WHERE serial = ?'),
        getNftMintClaimBySerial: db.prepare('SELECT * FROM nft_mint_claims WHERE registry_serial = ?'),
        getNftMintClaimById: db.prepare('SELECT * FROM nft_mint_claims WHERE claim_id = ?'),
        insertNftMintClaim: db.prepare('INSERT INTO nft_mint_claims(claim_id, registry_serial, owner_user_id, car_instance_id, status, network, metadata_hash, snapshot_json, claim_nonce_hash, created_at, updated_at) VALUES (?, ?, ?, ?, \'prepared\', ?, ?, ?, ?, ?, ?)'),
        updateNftMintClaimPreparation: db.prepare('UPDATE nft_mint_claims SET owner_user_id = ?, car_instance_id = ?, status = \'prepared\', network = ?, metadata_hash = ?, snapshot_json = ?, claim_nonce_hash = ?, updated_at = ? WHERE registry_serial = ?'),
        updateNftMintClaimStatus: db.prepare('UPDATE nft_mint_claims SET status = ?, updated_at = ? WHERE claim_id = ?'),
        transferNftRegistryOwner: db.prepare('UPDATE nft_car_registry SET owner_user_id = ?, car_instance_id = ?, updated_at = ? WHERE serial = ? AND owner_user_id = ?'),
        transferNftMintClaimOwner: db.prepare('UPDATE nft_mint_claims SET owner_user_id = ?, car_instance_id = ?, wallet_address = NULL, wallet_verified_at = NULL, snapshot_json = ?, claim_nonce_hash = ?, updated_at = ? WHERE registry_serial = ?'),
        insertMarketplaceListing: db.prepare(`INSERT INTO marketplace_listings(
            listing_id, seller_user_id, seller_pilot_name, asset_type, car_instance_id,
            registry_serial, part_id, quantity, price_cr, status, asset_json,
            public_snapshot_json, idempotency_key, gross_cr, fee_bps, fee_cr,
            platform_fee_cr, burn_fee_cr, rewards_fee_cr, seller_net_cr,
            created_at, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        getMarketplaceListing: db.prepare('SELECT * FROM marketplace_listings WHERE listing_id = ?'),
        getMarketplaceListingByIdempotency: db.prepare('SELECT * FROM marketplace_listings WHERE seller_user_id = ? AND idempotency_key = ?'),
        getActiveMarketplaceListingBySellerCar: db.prepare("SELECT * FROM marketplace_listings WHERE seller_user_id = ? AND car_instance_id = ? AND status = 'active'"),
        getActiveMarketplaceListingBySerial: db.prepare("SELECT * FROM marketplace_listings WHERE registry_serial = ? AND status = 'active'"),
        countActiveMarketplaceListingsBySeller: db.prepare("SELECT COUNT(*) AS count FROM marketplace_listings WHERE seller_user_id = ? AND status = 'active'"),
        listActiveMarketplaceListings: db.prepare("SELECT * FROM marketplace_listings WHERE status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?"),
        listMarketplaceListingsBySeller: db.prepare('SELECT * FROM marketplace_listings WHERE seller_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'),
        listExpiredMarketplaceListings: db.prepare("SELECT * FROM marketplace_listings WHERE status = 'active' AND expires_at <= ? ORDER BY expires_at ASC LIMIT ?"),
        markMarketplaceListingCancelled: db.prepare("UPDATE marketplace_listings SET status = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ? WHERE listing_id = ? AND status = 'active'"),
        markMarketplaceListingSold: db.prepare(`UPDATE marketplace_listings SET status = 'sold', buyer_user_id = ?, gross_cr = ?,
            fee_cr = ?, platform_fee_cr = ?, burn_fee_cr = ?, rewards_fee_cr = ?, seller_net_cr = ?,
            sold_at = ?, updated_at = ? WHERE listing_id = ? AND status = 'active'`),
        insertMarketplaceTrade: db.prepare(`INSERT INTO marketplace_trades(
            trade_id, listing_id, seller_user_id, buyer_user_id, asset_type, registry_serial,
            source_car_instance_id, delivered_car_instance_id, part_id, quantity, gross_cr,
            fee_cr, platform_fee_cr, burn_fee_cr, rewards_fee_cr, seller_net_cr, asset_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        getMarketplaceTradeByListing: db.prepare('SELECT * FROM marketplace_trades WHERE listing_id = ?'),
        listMarketplaceTradesByUser: db.prepare('SELECT * FROM marketplace_trades WHERE seller_user_id = ? OR buyer_user_id = ? ORDER BY created_at DESC LIMIT ?'),
        getLeaderboardEntry: db.prepare('SELECT * FROM leaderboard_entries WHERE user_id = ? AND track_id = ?'),
        insertLeaderboardEntry: db.prepare('INSERT INTO leaderboard_entries(user_id, username, track_id, track_name, time_seconds, car_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
        updateLeaderboardEntry: db.prepare('UPDATE leaderboard_entries SET username = ?, track_name = ?, time_seconds = ?, car_name = ?, updated_at = ? WHERE user_id = ? AND track_id = ?'),
        countFasterOnTrack: db.prepare('SELECT COUNT(*) AS count FROM leaderboard_entries WHERE track_id = ? AND time_seconds < ?'),
        insertAudit: db.prepare('INSERT INTO audit_events(user_id, event, details_json, created_at) VALUES (?, ?, ?, ?)'),
        insertAdEntitlement: db.prepare('INSERT INTO ad_reward_entitlements(id, user_id, reward_type, status, source_id, created_at) VALUES (?, ?, ?, \'pending\', ?, ?)'),
        getAdEntitlementBySource: db.prepare('SELECT * FROM ad_reward_entitlements WHERE source_id = ?'),
        getOldestPendingAd: db.prepare("SELECT * FROM ad_reward_entitlements WHERE user_id = ? AND status = 'pending' AND (reward_type = ? OR reward_type = 'generic') ORDER BY created_at ASC LIMIT 1"),
        markAdClaimed: db.prepare("UPDATE ad_reward_entitlements SET status = 'claimed', claimed_at = ? WHERE id = ? AND status = 'pending'")
    };
}

function importLegacyDatabase(db, legacy) {
    const data = isPlainObject(legacy) ? legacy : {};
    const runImport = db.transaction(() => {
        if (Array.isArray(data.carsCatalog) && data.carsCatalog.length) {
            db.prepare('INSERT INTO meta(key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
                .run('carsCatalog', JSON.stringify(data.carsCatalog));
        }

        const insertUser = db.prepare('INSERT OR REPLACE INTO users(user_id, username, data_json, updated_at) VALUES (?, ?, ?, ?)');
        if (isPlainObject(data.users)) {
            for (const [userId, user] of Object.entries(data.users)) {
                if (!isPlainObject(user)) continue;
                insertUser.run(String(userId), cleanDbText(user.username, 40), JSON.stringify(user), nowIso());
            }
        }

        const insertSave = db.prepare('INSERT OR REPLACE INTO saves(user_id, updated_at, data_json, server_saved_at) VALUES (?, ?, ?, ?)');
        const insertProfile = db.prepare('INSERT OR IGNORE INTO economy_profiles(user_id, version, garage_json, created_at, updated_at) VALUES (?, 1, ?, ?, ?)');
        const insertLedger = db.prepare('INSERT INTO economy_ledger(user_id, action, idempotency_key, delta_credits, delta_gems, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        if (isPlainObject(data.saves)) {
            for (const [userId, save] of Object.entries(data.saves)) {
                if (!isPlainObject(save)) continue;
                const ts = normalizedSaveTimestamp(save.updatedAt);
                insertSave.run(String(userId), ts, JSON.stringify(save), save.serverSavedAt || nowIso(ts));
                // Los guardados que YA estaban en el servidor antes de v104 son
                // la única semilla económica heredada que se acepta. A partir de
                // aquí, el cliente ya no puede reescribir saldos ni garaje.
                if (isPlainObject(save.garage) && validateGarageShape(save.garage)) {
                    const garage = cloneJson(save.garage);
                    garage.userId = String(userId);
                    const inserted = insertProfile.run(String(userId), JSON.stringify(garage), nowIso(ts), nowIso(ts));
                    if (inserted.changes) {
                        insertLedger.run(
                            String(userId),
                            'legacy_profile_migration',
                            `legacy-profile:${String(userId)}`,
                            Number(garage.credits) || 0,
                            Number(garage.gems) || 0,
                            JSON.stringify({ source: 'game_database_json', migratedAt: nowIso() }),
                            nowIso()
                        );
                    }
                }
            }
        }

        const insertCredential = db.prepare('INSERT OR REPLACE INTO device_credentials(user_id, hash, created_at, recovery_hash, recovery_created_at) VALUES (?, ?, ?, NULL, NULL)');
        if (isPlainObject(data.deviceCredentials)) {
            for (const [userId, credential] of Object.entries(data.deviceCredentials)) {
                if (!isPlainObject(credential) || typeof credential.hash !== 'string') continue;
                insertCredential.run(String(userId), credential.hash, credential.createdAt || nowIso());
            }
        }

        const insertPurchase = db.prepare('INSERT OR REPLACE INTO purchases(order_id, user_id, status, tx_hash, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const insertProcessed = db.prepare('INSERT OR IGNORE INTO processed_ton_tx(tx_hash, order_id) VALUES (?, ?)');
        if (isPlainObject(data.purchases)) {
            for (const [orderId, order] of Object.entries(data.purchases)) {
                if (!isPlainObject(order)) continue;
                const created = order.createdAt || nowIso(order.createdAtMs || Date.now());
                insertPurchase.run(
                    String(orderId),
                    String(order.userId || ''),
                    String(order.status || 'pending'),
                    order.txHash ? String(order.txHash) : null,
                    JSON.stringify(order),
                    created,
                    order.claimedAt || order.paidAt || created
                );
                if (order.txHash) insertProcessed.run(String(order.txHash), String(orderId));
            }
        }
        if (isPlainObject(data.processedTonTx)) {
            for (const [txHash, orderId] of Object.entries(data.processedTonTx)) {
                insertProcessed.run(String(txHash), String(orderId));
            }
        }

        const insertLeaderboard = db.prepare('INSERT OR IGNORE INTO leaderboard_entries(user_id, username, track_id, track_name, time_seconds, car_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        if (Array.isArray(data.leaderboard)) {
            data.leaderboard.forEach((row, index) => {
                if (!isPlainObject(row) || !Number.isFinite(Number(row.time))) return;
                const key = `${row.username}|${row.track}|${Number(row.time)}|${row.car}`;
                if (LEGACY_SEEDED_LEADERBOARD.has(key)) return;
                const legacyUserId = 'legacy_' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
                insertLeaderboard.run(
                    `${legacyUserId}_${index}`,
                    cleanDbText(row.username, 40, 'Piloto'),
                    'legacy',
                    cleanDbText(row.track, 80, 'Circuito'),
                    parseFloat(Number(row.time).toFixed(2)),
                    cleanDbText(row.car, 80, 'Coche'),
                    nowIso(),
                    nowIso()
                );
            });
        }

        db.prepare('INSERT INTO meta(key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json')
            .run('legacyJsonImportedAt', JSON.stringify(nowIso()));
    });
    runImport();
}

function openSqliteAt(file, legacyData = null) {
    const db = new SqliteDatabase(file);
    createSchema(db);
    if (legacyData) importLegacyDatabase(db, legacyData);
    // Fuerza la creación del WAL y valida que el archivo responde.
    db.prepare('SELECT 1 AS ok').get();
    return db;
}

function initializeDatabase() {
    ensureDataDirectory();

    const sqliteExists = fileLooksLikeSqlite(DB_FILE);
    const dbFileExists = fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 0;
    const legacyIsSameFile = path.resolve(LEGACY_DB_FILE) === path.resolve(DB_FILE);

    if (sqliteExists) {
        try {
            sqlite = openSqliteAt(DB_FILE);
        } catch (e) {
            console.error('SQLite corrupto; se conserva y se crea una base nueva:', e.message);
            try {
                const backup = preserveCorruptFile(DB_FILE);
                console.error('Copia SQLite dañada guardada en:', backup);
            } catch (backupError) {
                console.error('No se pudo preservar SQLite dañado:', backupError.message);
            }
            sqlite = openSqliteAt(DB_FILE);
        }
    } else if (legacyIsSameFile && dbFileExists) {
        // DB_FILE explícito apunta todavía al JSON de v103 (o a un archivo dañado).
        let legacyData = null;
        let legacyParsed = false;
        try {
            legacyData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            legacyParsed = isPlainObject(legacyData);
        } catch (e) {
            legacyParsed = false;
        }

        if (legacyParsed) {
            const tempFile = `${DB_FILE}.sqlite-migrating-${process.pid}`;
            try { fs.unlinkSync(tempFile); } catch (e) {}
            const tempDb = openSqliteAt(tempFile, legacyData);
            tempDb.close();
            const legacyBackup = `${DB_FILE}.legacy-imported-${Date.now()}`;
            fs.renameSync(DB_FILE, legacyBackup);
            secureFile(legacyBackup);
            fs.renameSync(tempFile, DB_FILE);
            console.log(`💾 BD JSON migrada a SQLite. Copia heredada: ${legacyBackup}`);
            sqlite = openSqliteAt(DB_FILE);
        } else {
            const backup = preserveCorruptFile(DB_FILE);
            console.error('Copia del archivo de BD dañado guardada en:', backup);
            sqlite = openSqliteAt(DB_FILE);
        }
    } else if (!dbFileExists && fs.existsSync(LEGACY_DB_FILE)) {
        let legacyData = null;
        try { legacyData = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8')); } catch (e) {}
        if (isPlainObject(legacyData)) {
            sqlite = openSqliteAt(DB_FILE, legacyData);
            try {
                const legacyBackup = `${LEGACY_DB_FILE}.legacy-imported-${Date.now()}`;
                fs.renameSync(LEGACY_DB_FILE, legacyBackup);
                secureFile(legacyBackup);
                console.log(`💾 BD JSON migrada a SQLite. Copia heredada: ${legacyBackup}`);
            } catch (e) {
                console.warn('⚠️ La BD se migró, pero no se pudo renombrar el JSON heredado:', e.message);
            }
        } else {
            try {
                const backup = preserveCorruptFile(LEGACY_DB_FILE);
                console.error('Copia del JSON heredado dañado guardada en:', backup);
            } catch (e) {}
            sqlite = openSqliteAt(DB_FILE);
        }
    } else {
        if (dbFileExists) {
            // Existe algo en la ruta SQLite que no es SQLite: no se sobrescribe
            // sin conservarlo primero.
            const backup = preserveCorruptFile(DB_FILE);
            console.error('Archivo no SQLite preservado en:', backup);
        }
        sqlite = openSqliteAt(DB_FILE);
    }

    statements = prepareStatements(sqlite);
    secureDatabaseFiles();
}

initializeDatabase();

function transaction(fn) {
    return sqlite.transaction(fn)();
}

function recordAuditEvent(userId, event, details = {}) {
    try {
        statements.insertAudit.run(
            userId == null ? null : String(userId),
            cleanDbText(event, 80, 'event'),
            JSON.stringify(isPlainObject(details) ? details : { value: String(details) }).slice(0, 20000),
            nowIso()
        );
    } catch (e) {
        console.warn('⚠️ No se pudo registrar un evento de auditoría:', e.message);
    }
}

function getAuditSummary(limit = 20) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)));
    const totals = sqlite.prepare("SELECT event, COUNT(*) AS count FROM audit_events GROUP BY event ORDER BY count DESC LIMIT 50").all();
    const latest = sqlite.prepare('SELECT event, created_at FROM audit_events ORDER BY id DESC LIMIT ?').all(safeLimit);
    return { totals, latest };
}

function getMetaValue(key, fallback = null) {
    const row = statements.getMeta.get(String(key || ''));
    if (!row) return cloneJson(fallback);
    return parseJsonColumn(row.value_json, fallback);
}

function setMetaValue(key, value) {
    statements.setMeta.run(String(key || ''), JSON.stringify(value == null ? null : value));
    return value;
}

function getDatabaseHealth() {
    const count = (table) => Number(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count || 0);
    return {
        engine: 'sqlite',
        schemaVersion: SCHEMA_VERSION,
        file: DB_FILE,
        users: count('users'),
        saves: count('saves'),
        economyProfiles: count('economy_profiles'),
        purchases: count('purchases'),
        processedTonTx: count('processed_ton_tx'),
        processedPaymentCharges: count('processed_payment_charges'),
        nftRegisteredCars: count('nft_car_registry'),
        nftMintClaims: count('nft_mint_claims'),
        marketplaceListings: count('marketplace_listings'),
        marketplaceTrades: count('marketplace_trades'),
        leaderboardEntries: count('leaderboard_entries')
    };
}

async function backupDatabaseTo(destination) {
    const target = path.resolve(String(destination || ''));
    if (!target || target === path.resolve(DB_FILE)) throw new Error('invalid_backup_destination');
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    await sqlite.backup(target);
    secureFile(target);
    return target;
}

// ===== CREDENCIAL DE DISPOSITIVO Y RECUPERACIÓN =====
function isValidDeviceIdentity(userId, secret) {
    return /^usr_[A-Za-z0-9_-]{4,60}$/.test(String(userId || ''))
        && typeof secret === 'string'
        && /^[A-Za-z0-9_-]{32,128}$/.test(secret);
}

function verifyOrRegisterDeviceSecret(userId, secret) {
    const key = String(userId || '');
    if (!isValidDeviceIdentity(key, secret)) {
        return { ok: false, registered: false, error: 'invalid_device_secret' };
    }

    const candidate = hashDeviceSecret(key, secret);
    const existing = statements.getDeviceCredential.get(key);
    if (!existing || typeof existing.hash !== 'string') {
        statements.insertDeviceCredential.run(key, candidate, nowIso());
        return { ok: true, registered: true };
    }

    const ok = timingSafeHexEqual(candidate, existing.hash);
    return { ok, registered: false, error: ok ? undefined : 'invalid_device_secret' };
}

function createDeviceRecoveryCode(userId) {
    const key = String(userId || '');
    if (!/^usr_[A-Za-z0-9_-]{4,60}$/.test(key)) return { ok: false, error: 'unsupported_user_id' };
    const existing = statements.getDeviceCredential.get(key);
    if (!existing) return { ok: false, error: 'device_credential_not_registered' };

    const hex = crypto.randomBytes(10).toString('hex').toUpperCase();
    const code = `APEX-RC-${hex.match(/.{1,4}/g).join('-')}`;
    statements.setRecoveryHash.run(hashWithDomain('apex-device-recovery-v1', key, code), nowIso(), key);
    recordAuditEvent(key, 'device_recovery_code_created', {});
    return { ok: true, recoveryCode: code, createdAt: nowIso() };
}

function resetDeviceSecretWithRecovery(userId, recoveryCode, newSecret) {
    const key = String(userId || '');
    if (!isValidDeviceIdentity(key, newSecret)) return { ok: false, error: 'invalid_device_secret' };
    const cleanCode = String(recoveryCode || '').trim().toUpperCase();
    if (!/^APEX-RC-(?:[0-9A-F]{4}-){4}[0-9A-F]{4}$/.test(cleanCode)) {
        return { ok: false, error: 'invalid_recovery_code' };
    }
    const existing = statements.getDeviceCredential.get(key);
    if (!existing || !existing.recovery_hash) return { ok: false, error: 'recovery_not_available' };
    const candidate = hashWithDomain('apex-device-recovery-v1', key, cleanCode);
    if (!timingSafeHexEqual(candidate, existing.recovery_hash)) {
        recordAuditEvent(key, 'device_recovery_failed', {});
        return { ok: false, error: 'invalid_recovery_code' };
    }
    statements.updateDeviceHash.run(hashDeviceSecret(key, newSecret), key);
    recordAuditEvent(key, 'device_secret_recovered', {});
    return { ok: true };
}

function rotateDeviceSecret(userId, newSecret) {
    const key = String(userId || '');
    if (!isValidDeviceIdentity(key, newSecret)) return { ok: false, error: 'invalid_device_secret' };
    const existing = statements.getDeviceCredential.get(key);
    if (!existing) return { ok: false, error: 'device_credential_not_registered' };
    statements.updateDeviceHash.run(hashDeviceSecret(key, newSecret), key);
    recordAuditEvent(key, 'device_secret_rotated', {});
    return { ok: true };
}

// ===== USUARIOS BÁSICOS DEL BOT / RANKING =====
function getOrCreateUserWithin(userId, username) {
    const key = String(userId);
    const cleanUsername = cleanDbText(username, 40);
    const row = statements.getUser.get(key);
    let user = row ? parseJsonColumn(row.data_json, null) : null;
    if (!isPlainObject(user)) {
        user = {
            id: userId,
            username: cleanUsername || 'Racer_' + userId,
            coins: 200,
            selectedCar: 'v8_interceptor',
            unlockedCars: ['v8_interceptor'],
            stats: { races: 0, wins: 0, bestTime: null },
            createdAt: nowIso()
        };
    } else if (cleanUsername && user.username !== cleanUsername) {
        user.username = cleanUsername;
    }
    if (!isPlainObject(user.stats)) user.stats = { races: 0, wins: 0, bestTime: null };
    statements.upsertUser.run(key, cleanDbText(user.username, 40), JSON.stringify(user), nowIso());
    return cloneJson(user);
}

function getUser(userId, username) {
    return getOrCreateUserWithin(userId, username);
}

function cleanTrackId(trackId, trackName) {
    const explicit = String(trackId || '').trim().toLowerCase();
    if (/^[a-z0-9_-]{2,80}$/.test(explicit)) return explicit;
    const slug = cleanDbText(trackName, 80, 'circuit').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return slug ? `name_${slug}` : 'unknown_track';
}

function recordRaceResult(userId, username, trackName, time, carName, trackId) {
    const key = String(userId);
    const cleanTime = Number(time);
    const run = sqlite.transaction(() => {
        const user = getOrCreateUserWithin(key, username);
        if (!Number.isFinite(cleanTime) || cleanTime <= 0 || cleanTime > 3600) {
            return {
                coinsEarned: 0,
                recorded: false,
                stats: { races: Number(user.stats.races) || 0, bestTime: user.stats.bestTime || null },
                leaderboardPosition: null
            };
        }

        const roundedTime = parseFloat(cleanTime.toFixed(2));
        user.stats.races = (Number(user.stats.races) || 0) + 1;
        if (!user.stats.bestTime || roundedTime < Number(user.stats.bestTime)) user.stats.bestTime = roundedTime;
        statements.upsertUser.run(key, cleanDbText(user.username, 40), JSON.stringify(user), nowIso());

        const cleanTrackName = cleanDbText(trackName, 80, 'Circuito');
        const cleanTrack = cleanTrackId(trackId, cleanTrackName);
        const cleanCar = cleanDbText(carName || user.selectedCar, 80, 'Coche');
        const existing = statements.getLeaderboardEntry.get(key, cleanTrack);
        let bestForTrack = roundedTime;
        if (!existing) {
            statements.insertLeaderboardEntry.run(key, cleanDbText(user.username, 40, 'Piloto'), cleanTrack, cleanTrackName, roundedTime, cleanCar, nowIso(), nowIso());
        } else if (roundedTime < Number(existing.time_seconds)) {
            statements.updateLeaderboardEntry.run(cleanDbText(user.username, 40, 'Piloto'), cleanTrackName, roundedTime, cleanCar, nowIso(), key, cleanTrack);
        } else {
            bestForTrack = Number(existing.time_seconds);
            // Aunque no mejore el tiempo, el nombre público puede haberse actualizado.
            statements.updateLeaderboardEntry.run(cleanDbText(user.username, 40, 'Piloto'), cleanTrackName, bestForTrack, existing.car_name, nowIso(), key, cleanTrack);
        }

        const faster = Number(statements.countFasterOnTrack.get(cleanTrack, bestForTrack).count || 0);
        const position = faster + 1;
        return {
            coinsEarned: 0,
            recorded: true,
            stats: { races: user.stats.races, bestTime: user.stats.bestTime },
            trackId: cleanTrack,
            bestForTrack,
            improvedTrackBest: !existing || roundedTime < Number(existing.time_seconds),
            leaderboardPosition: position <= 20 ? position : null
        };
    });
    return run();
}

function getLeaderboard(options = {}) {
    let trackId = null;
    let limit = 20;
    if (typeof options === 'number') limit = options;
    if (isPlainObject(options)) {
        if (options.trackId) trackId = cleanTrackId(options.trackId, options.trackId);
        if (options.limit != null) limit = Number(options.limit);
    }
    limit = Math.max(1, Math.min(100, Math.floor(limit) || 20));
    const rows = trackId
        ? sqlite.prepare('SELECT * FROM leaderboard_entries WHERE track_id = ? ORDER BY time_seconds ASC LIMIT ?').all(trackId, limit)
        : sqlite.prepare('SELECT * FROM leaderboard_entries ORDER BY time_seconds ASC LIMIT ?').all(limit);
    return rows.map(row => ({
        username: cleanDbText(row.username, 40, 'Piloto'),
        track: cleanDbText(row.track_name, 80, 'Circuito'),
        trackId: cleanDbText(row.track_id, 80, ''),
        time: parseFloat(Number(row.time_seconds).toFixed(2)),
        car: cleanDbText(row.car_name, 80, 'Coche')
    }));
}

function getCars() {
    const row = statements.getMeta.get('carsCatalog');
    const catalog = row ? parseJsonColumn(row.value_json, DEFAULT_CARS_CATALOG) : DEFAULT_CARS_CATALOG;
    return cloneJson(Array.isArray(catalog) ? catalog : DEFAULT_CARS_CATALOG);
}

// ===== ECONOMÍA AUTORITATIVA =====
function profileFromRow(row) {
    if (!row) return null;
    return {
        userId: String(row.user_id),
        version: Number(row.version) || 1,
        garage: parseJsonColumn(row.garage_json, null),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function insertLedgerWithin(userId, action, idempotencyKey, beforeGarage, afterGarage, details = {}) {
    const deltaCredits = Math.round(((Number(afterGarage && afterGarage.credits) || 0) - (Number(beforeGarage && beforeGarage.credits) || 0)) * 100) / 100;
    const deltaGems = Math.round(((Number(afterGarage && afterGarage.gems) || 0) - (Number(beforeGarage && beforeGarage.gems) || 0)) * 100) / 100;
    statements.insertLedger.run(
        String(userId),
        cleanDbText(action, 80, 'economy_action'),
        idempotencyKey ? String(idempotencyKey).slice(0, 180) : null,
        deltaCredits,
        deltaGems,
        JSON.stringify(isPlainObject(details) ? details : {}).slice(0, 20000),
        nowIso()
    );
    return { deltaCredits, deltaGems };
}

function syncSaveGarageWithin(userId, garage) {
    const row = statements.getSave.get(String(userId));
    if (!row) return;
    const save = parseJsonColumn(row.data_json, null);
    if (!isPlainObject(save)) return;
    save.garage = cloneJson(garage);
    save.updatedAt = Math.max(Number(row.updated_at) || 0, Date.now());
    save.serverSavedAt = nowIso(save.updatedAt);
    statements.upsertSave.run(String(userId), save.updatedAt, JSON.stringify(save), save.serverSavedAt);
}

// ===== REGISTRO GLOBAL DE COCHES Y CONVERSIÓN NFT (v105) =====
// El registro no acuña nada: solo asigna una identidad global estable al
// coche jugable y congela su foto base. Así, cuando el jugador pulse
// «Convertir en NFT», el servidor no depende del mintNumber local ni puede
// emitir dos derechos para el mismo coche.
const NFT_BASE_STAT_KEYS = [
    'potencia', 'velocidad', 'aceleracion', 'agarre', 'frenada',
    'manejo', 'turbo', 'downforce', 'traccion', 'ligereza'
];

function isNftEligibleCar(car) {
    if (!isPlainObject(car) || typeof car.instanceId !== 'string' || !car.instanceId) return false;
    const rarity = String(car.rarity || '').toLowerCase();
    return rarity !== 'starter' && car.instanceId !== 'inst_starter_01';
}

function nftBaseStatsSnapshot(stats) {
    const source = isPlainObject(stats) ? stats : {};
    const snapshot = {};
    for (const key of NFT_BASE_STAT_KEYS) {
        const value = Number(source[key]);
        snapshot[key] = Number.isFinite(value) ? value : 0;
    }
    return snapshot;
}

function createNftCarSnapshot(car, source = 'server_registry') {
    return {
        version: 1,
        source: cleanDbText(source, 60, 'server_registry'),
        instanceId: String(car.instanceId || '').slice(0, 120),
        modelId: cleanDbText(car.modelId || car.id, 80),
        name: cleanDbText(car.name, 100, 'Apex GT'),
        rarity: cleanDbText(car.rarity, 30, 'common').toLowerCase(),
        visualId: Number.isFinite(Number(car.visualId)) ? Number(car.visualId) : null,
        archetype: cleanDbText(car.archetype, 60),
        sprite: cleanDbText(car.sprite, 80),
        colorName: cleanDbText(car.colorName, 80),
        colorHex: /^#[0-9a-fA-F]{6}$/.test(String(car.colorHex || '')) ? String(car.colorHex) : '',
        tint: Number.isFinite(Number(car.tint)) ? Number(car.tint) : null,
        baseStats: nftBaseStatsSnapshot(car.stats),
        legacyLocalMintNumber: Number.isFinite(Number(car.mintNumber)) ? Number(car.mintNumber) : null,
        obtainedAt: Number.isFinite(Number(car.obtainedAt)) ? Number(car.obtainedAt) : null
    };
}

function hashNftCarSnapshot(snapshot) {
    const canonical = {
        modelId: snapshot.modelId,
        name: snapshot.name,
        rarity: snapshot.rarity,
        visualId: snapshot.visualId,
        archetype: snapshot.archetype,
        sprite: snapshot.sprite,
        colorName: snapshot.colorName,
        colorHex: snapshot.colorHex,
        baseStats: snapshot.baseStats
    };
    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function nftRegistryFromRow(row) {
    if (!row) return null;
    return {
        serial: Number(row.serial),
        registryId: row.registry_id || null,
        ownerUserId: row.owner_user_id,
        carInstanceId: row.car_instance_id,
        status: row.status,
        chainNetwork: row.chain_network || null,
        collectionAddress: row.collection_address || null,
        nftItemAddress: row.nft_item_address || null,
        nftIndex: row.nft_index == null ? null : Number(row.nft_index),
        ownerWalletAddress: row.owner_wallet_address || null,
        mintTxHash: row.mint_tx_hash || null,
        metadataHash: row.metadata_hash || null,
        snapshot: parseJsonColumn(row.snapshot_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function nftMintClaimFromRow(row) {
    if (!row) return null;
    return {
        claimId: row.claim_id,
        registrySerial: Number(row.registry_serial),
        ownerUserId: row.owner_user_id,
        carInstanceId: row.car_instance_id,
        status: row.status,
        network: row.network,
        walletAddress: row.wallet_address || null,
        walletVerifiedAt: row.wallet_verified_at || null,
        metadataUri: row.metadata_uri || null,
        metadataHash: row.metadata_hash || null,
        snapshot: parseJsonColumn(row.snapshot_json, {}),
        txHash: row.tx_hash || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function patchCarWithNftRegistry(car, registry) {
    if (!isPlainObject(car)) return false;
    let changed = false;
    const setField = (field, value) => {
        if (car[field] !== value) { car[field] = value; changed = true; }
    };
    if (!registry) {
        setField('nftEligible', false);
        setField('chainStatus', 'not_eligible');
        setField('isNft', false);
        return changed;
    }
    const publicRegistry = {
        registryId: registry.registryId,
        serial: registry.serial,
        nftIndex: registry.nftIndex,
        status: registry.status,
        metadataHash: registry.metadataHash,
        nftItemAddress: registry.nftItemAddress || null,
        collectionAddress: registry.collectionAddress || null
    };
    setField('nftEligible', true);
    setField('globalSerial', registry.serial);
    setField('nftIndex', registry.nftIndex);
    setField('nftRegistryId', registry.registryId);
    setField('chainStatus', registry.status);
    setField('isNft', registry.status === 'minted');
    if (JSON.stringify(car.nftRegistry || null) !== JSON.stringify(publicRegistry)) {
        car.nftRegistry = publicRegistry;
        changed = true;
    }
    return changed;
}

function registerEligibleCarsWithin(userId, garage, source = 'server_registry') {
    const key = String(userId || '');
    const result = { changed: false, registeredSerials: [] };
    if (!key || !isPlainObject(garage) || !Array.isArray(garage.garage)) return result;

    for (const car of garage.garage) {
        if (!isNftEligibleCar(car)) {
            if (patchCarWithNftRegistry(car, null)) result.changed = true;
            continue;
        }
        let row = statements.getNftRegistryByOwnerInstance.get(key, String(car.instanceId));
        if (!row) {
            const snapshot = createNftCarSnapshot(car, source);
            const metadataHash = hashNftCarSnapshot(snapshot);
            const inserted = statements.insertNftRegistry.run(
                key,
                String(car.instanceId),
                metadataHash,
                JSON.stringify(snapshot),
                nowIso(),
                nowIso()
            );
            const serial = Number(inserted.lastInsertRowid);
            const registryId = `APEX-CAR-${String(serial).padStart(6, '0')}`;
            statements.finalizeNftRegistryIdentity.run(registryId, serial - 1, serial);
            row = statements.getNftRegistryBySerial.get(serial);
            result.registeredSerials.push(serial);
            result.changed = true;
        } else if (!row.registry_id || row.nft_index == null) {
            const serial = Number(row.serial);
            statements.finalizeNftRegistryIdentity.run(`APEX-CAR-${String(serial).padStart(6, '0')}`, serial - 1, serial);
            row = statements.getNftRegistryBySerial.get(serial);
            result.changed = true;
        }
        if (patchCarWithNftRegistry(car, nftRegistryFromRow(row))) result.changed = true;
    }
    return result;
}

function persistEconomyGarageWithin(userId, garage) {
    const key = String(userId || '');
    garage.userId = key;
    garage.updatedAt = Date.now();
    statements.updateEconomyProfile.run(JSON.stringify(garage), nowIso(), key);
    const profile = profileFromRow(statements.getEconomyProfile.get(key));
    if (profile) syncSaveGarageWithin(key, profile.garage);
    return profile;
}

function syncNftRegistryForUser(userId) {
    const key = String(userId || '');
    return transaction(() => {
        const before = ensureEconomyProfileWithin(key);
        const garage = cloneJson(before.garage);
        const registered = registerEligibleCarsWithin(key, garage, 'registry_sync');
        let profile = before;
        if (registered.changed) {
            profile = persistEconomyGarageWithin(key, garage);
            if (registered.registeredSerials.length) {
                insertLedgerWithin(key, 'nft_registry_sync', null, before.garage, profile.garage, {
                    registeredSerials: registered.registeredSerials
                });
            }
        }
        const entries = statements.listNftRegistryByOwner.all(key).map(row => {
            const registry = nftRegistryFromRow(row);
            const claim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial));
            return { registry, claim };
        });
        return { ok: true, profile, entries, registeredSerials: registered.registeredSerials };
    });
}

function nftProgressionSnapshot(car) {
    return {
        level: Math.max(1, Math.floor(Number(car && car.level) || 1)),
        xp: Math.max(0, Math.floor(Number(car && car.xp) || 0)),
        parts: isPlainObject(car && car.parts) ? cloneJson(car.parts, {}) : {},
        energy: Math.max(0, Math.floor(Number(car && car.energy) || 0)),
        maxEnergy: Math.max(0, Math.floor(Number(car && car.maxEnergy) || 0))
    };
}

function prepareNftConversion(userId, instanceId, options = {}) {
    const key = String(userId || '');
    const targetInstanceId = String(instanceId || '');
    const network = cleanDbText(options.network, 30, 'ton-testnet') || 'ton-testnet';
    return transaction(() => {
        const before = ensureEconomyProfileWithin(key);
        const garage = cloneJson(before.garage);
        registerEligibleCarsWithin(key, garage, 'conversion_prepare');
        const car = garage.garage.find(entry => entry && entry.instanceId === targetInstanceId);
        if (!car) return { ok: false, error: 'car_not_found', profile: before };
        if (!isNftEligibleCar(car)) return { ok: false, error: 'car_not_nft_eligible', profile: before };

        const registryRow = statements.getNftRegistryByOwnerInstance.get(key, targetInstanceId);
        const registry = nftRegistryFromRow(registryRow);
        if (!registry) return { ok: false, error: 'nft_registry_missing', profile: before };
        if (registry.status === 'minted') {
            return {
                ok: true,
                alreadyMinted: true,
                registry,
                claim: nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial)),
                profile: persistEconomyGarageWithin(key, garage)
            };
        }

        const existingClaim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial));
        const claimSnapshot = {
            version: 1,
            registry: registry.snapshot,
            progressionAtPrepare: nftProgressionSnapshot(car),
            preparedAt: nowIso()
        };
        const nonceHash = crypto.createHash('sha256')
            .update(`apex-nft-claim-v1:${registry.serial}:${crypto.randomBytes(32).toString('hex')}`)
            .digest('hex');
        let claim = existingClaim;
        let created = false;
        if (!claim) {
            const claimId = `APXNFT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
            statements.insertNftMintClaim.run(
                claimId,
                registry.serial,
                key,
                targetInstanceId,
                network,
                registry.metadataHash,
                JSON.stringify(claimSnapshot),
                nonceHash,
                nowIso(),
                nowIso()
            );
            created = true;
        } else if (!['prepared', 'wallet_required', 'ready', 'submitted', 'minted'].includes(claim.status)) {
            statements.updateNftMintClaimPreparation.run(
                key,
                targetInstanceId,
                network,
                registry.metadataHash,
                JSON.stringify(claimSnapshot),
                nonceHash,
                nowIso(),
                registry.serial
            );
        }
        claim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial));

        if (registry.status !== 'conversion_prepared') {
            statements.updateNftRegistryStatus.run('conversion_prepared', nowIso(), registry.serial);
        }
        const updatedRegistry = nftRegistryFromRow(statements.getNftRegistryBySerial.get(registry.serial));
        patchCarWithNftRegistry(car, updatedRegistry);
        const profile = persistEconomyGarageWithin(key, garage);
        insertLedgerWithin(key, created ? 'nft_conversion_prepared' : 'nft_conversion_prepare_repeat', null, before.garage, profile.garage, {
            registryId: updatedRegistry.registryId,
            serial: updatedRegistry.serial,
            claimId: claim.claimId,
            created
        });
        return { ok: true, alreadyPrepared: !created, created, registry: updatedRegistry, claim, profile };
    });
}

function cancelNftConversionPreparation(userId, instanceId) {
    const key = String(userId || '');
    const targetInstanceId = String(instanceId || '');
    return transaction(() => {
        const before = ensureEconomyProfileWithin(key);
        const garage = cloneJson(before.garage);
        registerEligibleCarsWithin(key, garage, 'conversion_cancel');
        const car = garage.garage.find(entry => entry && entry.instanceId === targetInstanceId);
        if (!car) return { ok: false, error: 'car_not_found', profile: before };
        const registry = nftRegistryFromRow(statements.getNftRegistryByOwnerInstance.get(key, targetInstanceId));
        if (!registry) return { ok: false, error: 'nft_registry_missing', profile: before };
        if (registry.status === 'minted') return { ok: false, error: 'nft_already_minted', registry, profile: before };
        const claim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial));
        if (claim && ['submitted', 'minted'].includes(claim.status)) {
            return { ok: false, error: 'nft_claim_not_cancellable', registry, claim, profile: before };
        }
        if (claim) statements.updateNftMintClaimStatus.run('cancelled', nowIso(), claim.claimId);
        statements.updateNftRegistryStatus.run('offchain', nowIso(), registry.serial);
        const updatedRegistry = nftRegistryFromRow(statements.getNftRegistryBySerial.get(registry.serial));
        patchCarWithNftRegistry(car, updatedRegistry);
        const profile = persistEconomyGarageWithin(key, garage);
        return {
            ok: true,
            registry: updatedRegistry,
            claim: nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial)),
            profile
        };
    });
}

function getNftClaimForUser(userId, claimId) {
    const claim = nftMintClaimFromRow(statements.getNftMintClaimById.get(String(claimId || '')));
    if (!claim || claim.ownerUserId !== String(userId || '')) return null;
    return {
        claim,
        registry: nftRegistryFromRow(statements.getNftRegistryBySerial.get(claim.registrySerial))
    };
}

function getPublicNftRegistryEntry(serial) {
    const registry = nftRegistryFromRow(statements.getNftRegistryBySerial.get(Math.floor(Number(serial) || 0)));
    if (!registry || !['conversion_prepared', 'mint_pending', 'minted'].includes(registry.status)) return null;
    return {
        registry,
        claim: nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial))
    };
}

// ===== MERCADO INTERNO ENTRE JUGADORES (v106) =====
// Publicar mueve el activo fuera del garaje/inventario a una fila de escrow.
// Así no puede correr, mejorarse ni venderse dos veces mientras el anuncio
// está activo. Comprar transfiere exactamente ese objeto: en un coche se
// conservan instancia, serie/índice NFT, nivel, XP, energía, ramas de piezas,
// hitos, color y estadísticas. Un coche ya acuñado o con la acuñación enviada
// no se liquida aquí fingiendo un traspaso de wallet: requiere la
// transferencia/indexación on-chain que se añadirá con el mint real.
function marketplacePartDefinition(partId) {
    try {
        const economyEngine = require('./economy_engine');
        if (typeof economyEngine.getWorkshopPartsCatalog === 'function') {
            return economyEngine.getWorkshopPartsCatalog()[String(partId || '')] || null;
        }
    } catch (e) {}
    return null;
}

function marketplaceFeeBreakdown(priceCr) {
    const price = Math.max(0, Math.floor(Number(priceCr) || 0));
    const feeCr = Math.floor((price * MARKETPLACE_CONFIG.feeBps + 5000) / 10000);
    const platformFeeCr = Math.floor(feeCr / 3);
    const burnFeeCr = Math.floor(feeCr / 3);
    const rewardsFeeCr = Math.max(0, feeCr - platformFeeCr - burnFeeCr);
    return {
        priceCr: price,
        grossCr: price,
        feeBps: MARKETPLACE_CONFIG.feeBps,
        feeCr,
        platformFeeCr,
        burnFeeCr,
        rewardsFeeCr,
        sellerNetCr: price - feeCr
    };
}

function publicMarketplaceRegistry(registry) {
    if (!registry) return null;
    return {
        serial: registry.serial,
        registryId: registry.registryId,
        status: registry.status,
        chainNetwork: registry.chainNetwork,
        collectionAddress: registry.collectionAddress,
        nftItemAddress: registry.nftItemAddress,
        nftIndex: registry.nftIndex,
        metadataHash: registry.metadataHash,
        snapshot: registry.snapshot
    };
}

function marketplaceListingFromRow(row, viewerUserId = '', options = {}) {
    if (!row) return null;
    const viewer = String(viewerUserId || '');
    const isSeller = viewer !== '' && viewer === String(row.seller_user_id || '');
    const isBuyer = viewer !== '' && viewer === String(row.buyer_user_id || '');
    const asset = parseJsonColumn(row.asset_json, null);
    const snapshot = parseJsonColumn(row.public_snapshot_json, {});
    const registry = row.registry_serial != null
        ? publicMarketplaceRegistry(nftRegistryFromRow(statements.getNftRegistryBySerial.get(Number(row.registry_serial))))
        : null;
    const fees = marketplaceFeeBreakdown(row.price_cr);
    const listing = {
        id: row.listing_id,
        listingId: row.listing_id,
        type: row.asset_type,
        assetType: row.asset_type,
        status: row.status,
        seller: cleanDbText(row.seller_pilot_name, 60, 'Piloto Apex'),
        sellerPilotName: cleanDbText(row.seller_pilot_name, 60, 'Piloto Apex'),
        sellerIsMe: isSeller,
        isSeller,
        isBuyer,
        priceCr: Math.floor(Number(row.price_cr) || 0),
        feeBps: row.fee_bps == null ? MARKETPLACE_CONFIG.feeBps : Math.floor(Number(row.fee_bps) || 0),
        feeCr: row.fee_cr == null ? fees.feeCr : Math.floor(Number(row.fee_cr) || 0),
        platformFeeCr: row.platform_fee_cr == null ? fees.platformFeeCr : Math.floor(Number(row.platform_fee_cr) || 0),
        burnFeeCr: row.burn_fee_cr == null ? fees.burnFeeCr : Math.floor(Number(row.burn_fee_cr) || 0),
        rewardsFeeCr: row.rewards_fee_cr == null ? fees.rewardsFeeCr : Math.floor(Number(row.rewards_fee_cr) || 0),
        sellerNetCr: row.seller_net_cr == null ? fees.sellerNetCr : Math.floor(Number(row.seller_net_cr) || 0),
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        updatedAt: row.updated_at,
        soldAt: row.sold_at || null,
        cancelledAt: row.cancelled_at || null,
        registry,
        snapshot
    };
    if (row.asset_type === 'car') {
        listing.car = isPlainObject(asset) ? asset : null;
        listing.carData = listing.car;
        listing.carInstanceId = row.car_instance_id || (listing.car && listing.car.instanceId) || null;
        listing.name = cleanDbText(snapshot.name || (listing.car && listing.car.name), 100, 'Coche Apex');
        listing.icon = '🏎️';
        listing.category = registry && registry.status === 'minted' ? 'Vehículo NFT TON' : 'Vehículo registrado';
        listing.rarity = cleanDbText(snapshot.rarity || (listing.car && listing.car.rarity), 30, 'common').toLowerCase();
    } else {
        listing.partId = row.part_id || (asset && asset.partId) || null;
        listing.part = snapshot || null;
        listing.name = cleanDbText(snapshot.name, 100, listing.partId || 'Pieza');
        listing.icon = cleanDbText(snapshot.icon, 12, '🔧') || '🔧';
        listing.category = cleanDbText(snapshot.category, 80, 'Pieza');
        listing.rarity = cleanDbText(snapshot.rarity, 30, 'common').toLowerCase();
    }
    if (isSeller || isBuyer || options.includeAccountIds === true) {
        listing.sellerUserId = String(row.seller_user_id || '');
        listing.buyerUserId = row.buyer_user_id ? String(row.buyer_user_id) : null;
    }
    return listing;
}

function marketplaceTradeFromRow(row, viewerUserId = '') {
    if (!row) return null;
    const viewer = String(viewerUserId || '');
    const isParty = viewer === String(row.seller_user_id || '') || viewer === String(row.buyer_user_id || '');
    return {
        tradeId: row.trade_id,
        listingId: row.listing_id,
        assetType: row.asset_type,
        registrySerial: row.registry_serial == null ? null : Number(row.registry_serial),
        sourceCarInstanceId: isParty ? (row.source_car_instance_id || null) : undefined,
        deliveredCarInstanceId: isParty ? (row.delivered_car_instance_id || null) : undefined,
        partId: row.part_id || null,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        grossCr: Math.floor(Number(row.gross_cr) || 0),
        feeCr: Math.floor(Number(row.fee_cr) || 0),
        platformFeeCr: Math.floor(Number(row.platform_fee_cr) || 0),
        burnFeeCr: Math.floor(Number(row.burn_fee_cr) || 0),
        rewardsFeeCr: Math.floor(Number(row.rewards_fee_cr) || 0),
        sellerNetCr: Math.floor(Number(row.seller_net_cr) || 0),
        sellerIsMe: viewer === String(row.seller_user_id || ''),
        buyerIsMe: viewer === String(row.buyer_user_id || ''),
        createdAt: row.created_at
    };
}

function findAvailableCarInstanceId(ownerUserId, garage, seed) {
    const owner = String(ownerUserId || '');
    const cars = garage && Array.isArray(garage.garage) ? garage.garage : [];
    const base = String(seed || 'marketplace_car').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 72) || 'marketplace_car';
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = `${base}_mkt_${crypto.randomBytes(5).toString('hex')}`.slice(0, 120);
        if (cars.some(car => car && car.instanceId === candidate)) continue;
        if (statements.getNftRegistryByOwnerInstance.get(owner, candidate)) continue;
        return candidate;
    }
    throw new Error('marketplace_instance_collision');
}

function transferRegistryAndClaimInstanceWithin(serial, fromOwnerUserId, toOwnerUserId, newInstanceId, car) {
    const safeSerial = Math.floor(Number(serial) || 0);
    if (!safeSerial) return null;
    const changed = statements.transferNftRegistryOwner.run(
        String(toOwnerUserId),
        String(newInstanceId),
        nowIso(),
        safeSerial,
        String(fromOwnerUserId)
    );
    if (!changed || changed.changes !== 1) throw new Error('nft_registry_transfer_conflict');
    const registry = nftRegistryFromRow(statements.getNftRegistryBySerial.get(safeSerial));
    const claim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(safeSerial));
    if (claim) {
        const snapshot = isPlainObject(claim.snapshot) ? cloneJson(claim.snapshot, {}) : {};
        snapshot.progressionAtLastTransfer = nftProgressionSnapshot(car);
        snapshot.lastTransferredAt = nowIso();
        const nonceHash = crypto.createHash('sha256')
            .update(`apex-nft-claim-transfer-v1:${safeSerial}:${crypto.randomBytes(32).toString('hex')}`)
            .digest('hex');
        statements.transferNftMintClaimOwner.run(
            String(toOwnerUserId),
            String(newInstanceId),
            JSON.stringify(snapshot),
            nonceHash,
            nowIso(),
            safeSerial
        );
    }
    if (car) patchCarWithNftRegistry(car, registry);
    return {
        registry,
        claim: nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(safeSerial))
    };
}

function returnMarketplaceAssetWithin(listingRow, garage, ownerUserId) {
    const owner = String(ownerUserId || '');
    const asset = parseJsonColumn(listingRow.asset_json, null);
    if (!isPlainObject(asset)) throw new Error('marketplace_asset_missing');
    if (listingRow.asset_type === 'part') {
        const partId = String(listingRow.part_id || asset.partId || '');
        const quantity = Math.max(1, Math.floor(Number(listingRow.quantity) || 1));
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(partId)) throw new Error('marketplace_part_invalid');
        if (!isPlainObject(garage.partsInventory)) garage.partsInventory = {};
        garage.partsInventory[partId] = Math.max(0, Math.floor(Number(garage.partsInventory[partId]) || 0)) + quantity;
        return { asset: { partId, quantity }, deliveredInstanceId: null, remappedInstanceId: false };
    }
    const car = cloneJson(asset, null);
    if (!car || typeof car.instanceId !== 'string') throw new Error('marketplace_car_invalid');
    const originalInstanceId = String(car.instanceId);
    let deliveredInstanceId = originalInstanceId;
    const collidesInGarage = garage.garage.some(entry => entry && entry.instanceId === deliveredInstanceId);
    const registryRow = listingRow.registry_serial == null
        ? null
        : statements.getNftRegistryBySerial.get(Number(listingRow.registry_serial));
    const collidesInRegistry = Boolean(
        statements.getNftRegistryByOwnerInstance.get(owner, deliveredInstanceId)
        && (!registryRow || Number(statements.getNftRegistryByOwnerInstance.get(owner, deliveredInstanceId).serial) !== Number(registryRow.serial))
    );
    if (collidesInGarage || collidesInRegistry) {
        deliveredInstanceId = findAvailableCarInstanceId(owner, garage, originalInstanceId);
        car.instanceId = deliveredInstanceId;
    }
    garage.garage.push(car);
    if (registryRow && (deliveredInstanceId !== originalInstanceId || String(registryRow.owner_user_id) !== owner)) {
        transferRegistryAndClaimInstanceWithin(
            Number(registryRow.serial),
            String(registryRow.owner_user_id),
            owner,
            deliveredInstanceId,
            car
        );
    } else if (registryRow) {
        patchCarWithNftRegistry(car, nftRegistryFromRow(registryRow));
    }
    if (!garage.equippedInstanceId || !garage.garage.some(entry => entry && entry.instanceId === garage.equippedInstanceId)) {
        garage.equippedInstanceId = garage.garage[0].instanceId;
    }
    return { asset: car, deliveredInstanceId, remappedInstanceId: deliveredInstanceId !== originalInstanceId };
}

function settleExpiredMarketplaceListingsWithin(limit = 100, nowMs = Date.now()) {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 100)));
    const rows = statements.listExpiredMarketplaceListings.all(nowIso(nowMs), safeLimit);
    const settled = [];
    for (const row of rows) {
        const sellerId = String(row.seller_user_id || '');
        try {
            // Savepoint por anuncio: un activo corrupto no puede dejar a medias
            // la devolución ni bloquear la caducidad de los demás.
            sqlite.transaction(() => {
                const before = ensureEconomyProfileWithin(sellerId);
                const garage = cloneJson(before.garage);
                const returned = returnMarketplaceAssetWithin(row, garage, sellerId);
                if (!validateGarageShape(garage)) throw new Error('marketplace_expiry_invalid_garage');
                const changed = statements.markMarketplaceListingCancelled.run('expired', nowIso(nowMs), 'expired', nowIso(nowMs), row.listing_id);
                if (!changed || changed.changes !== 1) throw new Error('marketplace_listing_not_active');
                const profile = persistEconomyGarageWithin(sellerId, garage);
                insertLedgerWithin(sellerId, 'marketplace_listing_expired', `marketplace-expire:${row.listing_id}`, before.garage, profile.garage, {
                    listingId: row.listing_id,
                    assetType: row.asset_type,
                    deliveredInstanceId: returned.deliveredInstanceId || undefined
                });
                recordAuditEvent(sellerId, 'MARKETPLACE_LISTING_EXPIRED_RETURNED', {
                    listingId: row.listing_id,
                    assetType: row.asset_type,
                    registrySerial: row.registry_serial || undefined
                });
            })();
            settled.push(row.listing_id);
        } catch (e) {
            try {
                statements.markMarketplaceListingCancelled.run('expired_unreturned', nowIso(nowMs), String(e.message || e).slice(0, 120), nowIso(nowMs), row.listing_id);
            } catch (ignored) {}
            recordAuditEvent(sellerId || null, 'MARKETPLACE_LISTING_EXPIRY_FAILED', {
                listingId: row.listing_id,
                error: String(e.message || e).slice(0, 200)
            });
        }
    }
    return settled;
}

function createMarketplaceListingWithin(sellerUserId, input = {}) {
    settleExpiredMarketplaceListingsWithin(25);
    const sellerId = String(sellerUserId || '');
    const before = ensureEconomyProfileWithin(sellerId);
    const idempotencyKey = typeof input.idempotencyKey === 'string' && /^[A-Za-z0-9_.:-]{8,180}$/.test(input.idempotencyKey)
        ? input.idempotencyKey
        : null;
    if (idempotencyKey) {
        const existing = statements.getMarketplaceListingByIdempotency.get(sellerId, idempotencyKey);
        if (existing) {
            return {
                ok: true,
                duplicate: true,
                listing: marketplaceListingFromRow(existing, sellerId),
                profile: before
            };
        }
    }
    const activeCount = Number(statements.countActiveMarketplaceListingsBySeller.get(sellerId).count || 0);
    if (activeCount >= MARKETPLACE_CONFIG.maxActiveListingsPerUser) {
        return { ok: false, error: 'marketplace_listing_limit_reached', profile: before };
    }
    const assetType = input.assetType === 'part' || input.type === 'part' ? 'part' : 'car';
    const priceCr = Math.floor(Number(input.priceCr) || 0);
    const minimum = assetType === 'car' ? MARKETPLACE_CONFIG.minCarPriceCr : MARKETPLACE_CONFIG.minPartPriceCr;
    if (!Number.isFinite(priceCr) || priceCr < minimum || priceCr > MARKETPLACE_CONFIG.maxPriceCr) {
        return { ok: false, error: 'marketplace_price_out_of_range', profile: before };
    }
    const quotedFees = marketplaceFeeBreakdown(priceCr);
    if (quotedFees.sellerNetCr <= 0) {
        return { ok: false, error: 'marketplace_price_too_low', profile: before };
    }
    const durationDays = Math.max(1, Math.min(90, Math.floor(Number(input.durationDays) || MARKETPLACE_CONFIG.defaultListingDays)));
    const nowMs = Date.now();
    const expiresAtMs = nowMs + durationDays * 24 * 60 * 60 * 1000;
    const garage = cloneJson(before.garage);
    const sellerPilotName = cleanDbText(garage.pilotName, 60, 'Piloto Apex');

    let carInstanceId = null;
    let registrySerial = null;
    let partId = null;
    let quantity = 1;
    let asset = null;
    let publicSnapshot = {};

    if (assetType === 'car') {
        registerEligibleCarsWithin(sellerId, garage, 'marketplace_listing');
        carInstanceId = typeof (input.instanceId || input.carInstanceId) === 'string'
            ? String(input.instanceId || input.carInstanceId)
            : '';
        const carIndex = garage.garage.findIndex(car => car && car.instanceId === carInstanceId);
        if (carIndex < 0) return { ok: false, error: 'car_not_found', profile: before };
        const car = garage.garage[carIndex];
        if (!isNftEligibleCar(car)) return { ok: false, error: 'car_not_transferable', profile: before };
        if (garage.garage.length <= 1) return { ok: false, error: 'must_keep_one_car', profile: before };
        const registry = nftRegistryFromRow(statements.getNftRegistryByOwnerInstance.get(sellerId, carInstanceId));
        if (!registry) return { ok: false, error: 'nft_registry_missing', profile: before };
        registrySerial = registry.serial;
        const claim = nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(registry.serial));
        if (['minted', 'mint_pending', 'mint_submitted', 'submitted'].includes(registry.status)
            || (claim && ['submitted', 'minted'].includes(claim.status))) {
            return {
                ok: false,
                error: 'minted_nft_requires_onchain_transfer',
                registry: publicMarketplaceRegistry(registry),
                profile: before
            };
        }
        if (statements.getActiveMarketplaceListingBySellerCar.get(sellerId, carInstanceId)
            || statements.getActiveMarketplaceListingBySerial.get(registry.serial)) {
            return { ok: false, error: 'car_already_listed', profile: before };
        }
        patchCarWithNftRegistry(car, registry);
        asset = cloneJson(car, null);
        publicSnapshot = {
            ...createNftCarSnapshot(car, 'marketplace_listing'),
            progression: {
                ...nftProgressionSnapshot(car),
                xpNeeded: Math.max(0, Math.floor(Number(car.xpNeeded) || 0)),
                claimedMilestones: Array.isArray(car.claimedMilestones) ? cloneJson(car.claimedMilestones, []) : [],
                milestoneStats: isPlainObject(car.milestoneStats) ? cloneJson(car.milestoneStats, {}) : {}
            },
            registryStatus: registry.status,
            registryId: registry.registryId,
            serial: registry.serial
        };
        garage.garage.splice(carIndex, 1);
        if (garage.equippedInstanceId === carInstanceId) {
            const starter = garage.garage.find(entry => entry && (entry.rarity === 'starter' || entry.instanceId === 'inst_starter_01'));
            garage.equippedInstanceId = (starter || garage.garage[0]).instanceId;
        }
    } else {
        partId = typeof input.partId === 'string' ? input.partId.trim() : '';
        quantity = Math.max(1, Math.min(MARKETPLACE_CONFIG.maxPartQuantity, Math.floor(Number(input.quantity) || 1)));
        const definition = marketplacePartDefinition(partId);
        if (!definition || !/^[A-Za-z0-9_-]{1,80}$/.test(partId)) {
            return { ok: false, error: 'invalid_part', profile: before };
        }
        if (!isPlainObject(garage.partsInventory)) garage.partsInventory = {};
        const available = Math.max(0, Math.floor(Number(garage.partsInventory[partId]) || 0));
        if (available < quantity) return { ok: false, error: 'part_not_enough', profile: before };
        garage.partsInventory[partId] = available - quantity;
        asset = { partId, quantity };
        publicSnapshot = {
            partId,
            name: cleanDbText(definition.name, 100, partId),
            icon: cleanDbText(definition.icon, 12, '🔧') || '🔧',
            category: cleanDbText(definition.category, 80, 'Pieza'),
            rarity: cleanDbText(definition.rarity, 30, 'common').toLowerCase(),
            desc: cleanDbText(definition.desc, 240)
        };
    }

    if (!asset || !validateGarageShape(garage)) {
        return { ok: false, error: 'marketplace_asset_invalid', profile: before };
    }

    let listingId = null;
    for (let attempt = 0; attempt < 5 && !listingId; attempt++) {
        const candidate = `MKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        if (!statements.getMarketplaceListing.get(candidate)) listingId = candidate;
    }
    if (!listingId) return { ok: false, error: 'marketplace_listing_id_failed', profile: before };

    statements.insertMarketplaceListing.run(
        listingId,
        sellerId,
        sellerPilotName,
        assetType,
        carInstanceId,
        registrySerial,
        partId,
        quantity,
        priceCr,
        JSON.stringify(asset),
        JSON.stringify(publicSnapshot),
        idempotencyKey,
        quotedFees.grossCr,
        quotedFees.feeBps,
        quotedFees.feeCr,
        quotedFees.platformFeeCr,
        quotedFees.burnFeeCr,
        quotedFees.rewardsFeeCr,
        quotedFees.sellerNetCr,
        nowIso(nowMs),
        nowIso(expiresAtMs),
        nowIso(nowMs)
    );
    const profile = persistEconomyGarageWithin(sellerId, garage);
    insertLedgerWithin(sellerId, 'marketplace_listing_created', `marketplace-list:${listingId}`, before.garage, profile.garage, {
        listingId,
        assetType,
        carInstanceId: carInstanceId || undefined,
        registrySerial: registrySerial || undefined,
        partId: partId || undefined,
        quantity,
        priceCr,
        expiresAt: nowIso(expiresAtMs)
    });
    recordAuditEvent(sellerId, 'MARKETPLACE_LISTING_CREATED', {
        listingId,
        assetType,
        registrySerial: registrySerial || undefined,
        partId: partId || undefined,
        quantity,
        priceCr
    });
    return {
        ok: true,
        listing: marketplaceListingFromRow(statements.getMarketplaceListing.get(listingId), sellerId),
        profile
    };
}

function createMarketplaceListing(sellerUserId, input = {}) {
    return transaction(() => createMarketplaceListingWithin(sellerUserId, input));
}

function cancelMarketplaceListingWithin(actorUserId, listingId, options = {}) {
    settleExpiredMarketplaceListingsWithin(25);
    const row = statements.getMarketplaceListing.get(String(listingId || ''));
    if (!row) return { ok: false, error: 'marketplace_listing_not_found' };
    const sellerId = String(row.seller_user_id || '');
    const actorId = String(actorUserId || '');
    const isAdmin = options.admin === true;
    if (!isAdmin && actorId !== sellerId) return { ok: false, error: 'marketplace_listing_not_found' };
    if (row.status === 'cancelled' || row.status === 'expired') {
        return {
            ok: true,
            duplicate: true,
            listing: marketplaceListingFromRow(row, actorId),
            profile: ensureEconomyProfileWithin(sellerId)
        };
    }
    if (row.status !== 'active') {
        return { ok: false, error: 'marketplace_listing_not_active', listing: marketplaceListingFromRow(row, actorId) };
    }
    const before = ensureEconomyProfileWithin(sellerId);
    const garage = cloneJson(before.garage);
    const returned = returnMarketplaceAssetWithin(row, garage, sellerId);
    if (!validateGarageShape(garage)) throw new Error('marketplace_return_invalid_garage');
    const reason = cleanDbText(options.reason, 80, isAdmin ? 'admin_cancelled' : 'seller_cancelled');
    const changed = statements.markMarketplaceListingCancelled.run('cancelled', nowIso(), reason, nowIso(), row.listing_id);
    if (!changed || changed.changes !== 1) return { ok: false, error: 'marketplace_listing_not_active', profile: before };
    const profile = persistEconomyGarageWithin(sellerId, garage);
    insertLedgerWithin(sellerId, isAdmin ? 'marketplace_listing_admin_cancelled' : 'marketplace_listing_cancelled', `marketplace-cancel:${row.listing_id}`, before.garage, profile.garage, {
        listingId: row.listing_id,
        assetType: row.asset_type,
        deliveredInstanceId: returned.deliveredInstanceId || undefined,
        admin: isAdmin || undefined,
        reason
    });
    recordAuditEvent(sellerId, isAdmin ? 'MARKETPLACE_LISTING_ADMIN_CANCELLED' : 'MARKETPLACE_LISTING_CANCELLED', {
        listingId: row.listing_id,
        actorUserId: actorId || undefined,
        assetType: row.asset_type,
        registrySerial: row.registry_serial || undefined,
        reason
    });
    return {
        ok: true,
        listing: marketplaceListingFromRow(statements.getMarketplaceListing.get(row.listing_id), actorId),
        profile
    };
}

function cancelMarketplaceListing(actorUserId, listingId, options = {}) {
    try {
        return transaction(() => cancelMarketplaceListingWithin(actorUserId, listingId, options));
    } catch (e) {
        if (e && e.message === 'marketplace_return_invalid_garage') {
            return { ok: false, error: e.message };
        }
        throw e;
    }
}

function buyMarketplaceListingWithin(buyerUserId, listingId) {
    settleExpiredMarketplaceListingsWithin(25);
    const buyerId = String(buyerUserId || '');
    let row = statements.getMarketplaceListing.get(String(listingId || ''));
    if (!row) return { ok: false, error: 'marketplace_listing_not_found' };
    if (row.status === 'sold' && String(row.buyer_user_id || '') === buyerId) {
        return {
            ok: true,
            duplicate: true,
            listing: marketplaceListingFromRow(row, buyerId),
            trade: marketplaceTradeFromRow(statements.getMarketplaceTradeByListing.get(row.listing_id), buyerId),
            buyerProfile: ensureEconomyProfileWithin(buyerId),
            sellerProfile: ensureEconomyProfileWithin(String(row.seller_user_id || ''))
        };
    }
    if (row.status !== 'active') {
        return { ok: false, error: 'marketplace_listing_not_available', listing: marketplaceListingFromRow(row, buyerId) };
    }
    const sellerId = String(row.seller_user_id || '');
    if (!sellerId || sellerId === buyerId) return { ok: false, error: 'cannot_buy_own_listing', listing: marketplaceListingFromRow(row, buyerId) };

    const sellerBefore = ensureEconomyProfileWithin(sellerId);
    const buyerBefore = ensureEconomyProfileWithin(buyerId);
    const sellerGarage = cloneJson(sellerBefore.garage);
    const buyerGarage = cloneJson(buyerBefore.garage);
    const priceCr = Math.floor(Number(row.price_cr) || 0);
    const currentFees = marketplaceFeeBreakdown(priceCr);
    // Los anuncios nuevos guardan la comisión cotizada al publicarse. Usarla
    // aquí evita que un cambio posterior de configuración altere el neto que
    // el vendedor vio y aceptó. Filas antiguas sin cotización usan la actual.
    const fees = row.seller_net_cr == null || row.fee_cr == null
        ? currentFees
        : {
            priceCr,
            grossCr: Math.floor(Number(row.gross_cr) || priceCr),
            feeBps: row.fee_bps == null ? currentFees.feeBps : Math.floor(Number(row.fee_bps) || 0),
            feeCr: Math.max(0, Math.floor(Number(row.fee_cr) || 0)),
            platformFeeCr: Math.max(0, Math.floor(Number(row.platform_fee_cr) || 0)),
            burnFeeCr: Math.max(0, Math.floor(Number(row.burn_fee_cr) || 0)),
            rewardsFeeCr: Math.max(0, Math.floor(Number(row.rewards_fee_cr) || 0)),
            sellerNetCr: Math.max(0, Math.floor(Number(row.seller_net_cr) || 0))
        };
    if (fees.grossCr !== priceCr || fees.feeCr !== fees.platformFeeCr + fees.burnFeeCr + fees.rewardsFeeCr
        || fees.sellerNetCr !== priceCr - fees.feeCr) {
        return { ok: false, error: 'marketplace_price_invalid', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
    }
    if (priceCr <= 0 || fees.sellerNetCr <= 0) return { ok: false, error: 'marketplace_price_invalid', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
    if (Math.floor(Number(buyerGarage.credits) || 0) < priceCr) {
        return { ok: false, error: 'credits_insufficient', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
    }

    const asset = parseJsonColumn(row.asset_json, null);
    if (!isPlainObject(asset)) return { ok: false, error: 'marketplace_asset_missing', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
    let deliveredAsset = cloneJson(asset, null);
    let deliveredInstanceId = null;
    let registryRowForTransfer = null;

    if (row.asset_type === 'car') {
        if (!deliveredAsset || typeof deliveredAsset.instanceId !== 'string') {
            return { ok: false, error: 'marketplace_car_invalid', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
        }
        if (sellerGarage.garage.some(car => car && car.instanceId === deliveredAsset.instanceId)) {
            return { ok: false, error: 'marketplace_asset_integrity_error', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
        }
        registryRowForTransfer = row.registry_serial == null
            ? null
            : statements.getNftRegistryBySerial.get(Number(row.registry_serial));
        const registryRow = registryRowForTransfer;
        if (row.registry_serial != null && (!registryRow || String(registryRow.owner_user_id) !== sellerId)) {
            return { ok: false, error: 'marketplace_registry_owner_mismatch', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
        }
        const claim = registryRow ? nftMintClaimFromRow(statements.getNftMintClaimBySerial.get(Number(registryRow.serial))) : null;
        if (registryRow && (['minted', 'mint_pending', 'mint_submitted', 'submitted'].includes(registryRow.status)
            || (claim && ['submitted', 'minted'].includes(claim.status)))) {
            return { ok: false, error: 'minted_nft_requires_onchain_transfer', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
        }
        deliveredInstanceId = String(deliveredAsset.instanceId);
        const collidesInGarage = buyerGarage.garage.some(car => car && car.instanceId === deliveredInstanceId);
        const buyerRegistryCollision = statements.getNftRegistryByOwnerInstance.get(buyerId, deliveredInstanceId);
        if (collidesInGarage || (buyerRegistryCollision && Number(buyerRegistryCollision.serial) !== Number(row.registry_serial))) {
            deliveredInstanceId = findAvailableCarInstanceId(buyerId, buyerGarage, deliveredInstanceId);
            deliveredAsset.instanceId = deliveredInstanceId;
        }
        deliveredAsset.marketplaceTradeCount = Math.max(0, Math.floor(Number(deliveredAsset.marketplaceTradeCount) || 0)) + 1;
        deliveredAsset.lastMarketplaceAcquiredAt = Date.now();
        buyerGarage.garage.push(deliveredAsset);
        // La transferencia SQL del registro/claim se hace más abajo, después
        // de validar ambos garajes ya liquidados en memoria. Así, un error de
        // validación ordinario no puede confirmar solo la mitad on-chain/off-chain.
    } else {
        const partId = String(row.part_id || deliveredAsset.partId || '');
        const quantity = Math.max(1, Math.floor(Number(row.quantity) || 1));
        const definition = marketplacePartDefinition(partId);
        if (!definition) return { ok: false, error: 'marketplace_part_invalid', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
        if (!isPlainObject(buyerGarage.partsInventory)) buyerGarage.partsInventory = {};
        buyerGarage.partsInventory[partId] = Math.max(0, Math.floor(Number(buyerGarage.partsInventory[partId]) || 0)) + quantity;
        deliveredAsset = { partId, quantity };
    }

    const tradeId = `TRD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    if (row.asset_type === 'car') deliveredAsset.lastMarketplaceTradeId = tradeId;
    buyerGarage.credits = Math.floor(Number(buyerGarage.credits) || 0) - priceCr;
    sellerGarage.credits = Math.floor(Number(sellerGarage.credits) || 0) + fees.sellerNetCr;
    if (!validateGarageShape(buyerGarage) || !validateGarageShape(sellerGarage)) {
        return { ok: false, error: 'marketplace_transfer_invalid_garage', buyerProfile: buyerBefore, sellerProfile: sellerBefore };
    }

    if (row.asset_type === 'car') {
        if (registryRowForTransfer) {
            transferRegistryAndClaimInstanceWithin(
                Number(registryRowForTransfer.serial),
                sellerId,
                buyerId,
                deliveredInstanceId,
                deliveredAsset
            );
        } else {
            registerEligibleCarsWithin(buyerId, buyerGarage, 'marketplace_purchase');
        }
        if (!validateGarageShape(buyerGarage) || !validateGarageShape(sellerGarage)) {
            // Ya hay SQL de titularidad ejecutado: debe lanzarse para que la
            // transacción completa haga rollback, no devolver y confirmar.
            throw new Error('marketplace_transfer_invalid_garage');
        }
    }

    const sellerProfile = persistEconomyGarageWithin(sellerId, sellerGarage);
    const buyerProfile = persistEconomyGarageWithin(buyerId, buyerGarage);
    const soldChanged = statements.markMarketplaceListingSold.run(
        buyerId,
        priceCr,
        fees.feeCr,
        fees.platformFeeCr,
        fees.burnFeeCr,
        fees.rewardsFeeCr,
        fees.sellerNetCr,
        nowIso(),
        nowIso(),
        row.listing_id
    );
    if (!soldChanged || soldChanged.changes !== 1) throw new Error('marketplace_listing_sale_conflict');
    statements.insertMarketplaceTrade.run(
        tradeId,
        row.listing_id,
        sellerId,
        buyerId,
        row.asset_type,
        row.registry_serial == null ? null : Number(row.registry_serial),
        row.car_instance_id || null,
        deliveredInstanceId,
        row.part_id || null,
        Math.max(1, Math.floor(Number(row.quantity) || 1)),
        priceCr,
        fees.feeCr,
        fees.platformFeeCr,
        fees.burnFeeCr,
        fees.rewardsFeeCr,
        fees.sellerNetCr,
        JSON.stringify(deliveredAsset),
        nowIso()
    );
    insertLedgerWithin(buyerId, 'marketplace_purchase', `marketplace-buy:${row.listing_id}:buyer`, buyerBefore.garage, buyerProfile.garage, {
        listingId: row.listing_id,
        tradeId,
        assetType: row.asset_type,
        registrySerial: row.registry_serial || undefined,
        partId: row.part_id || undefined,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        priceCr,
        deliveredInstanceId: deliveredInstanceId || undefined
    });
    insertLedgerWithin(sellerId, 'marketplace_sale', `marketplace-buy:${row.listing_id}:seller`, sellerBefore.garage, sellerProfile.garage, {
        listingId: row.listing_id,
        tradeId,
        assetType: row.asset_type,
        registrySerial: row.registry_serial || undefined,
        partId: row.part_id || undefined,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        grossCr: priceCr,
        feeCr: fees.feeCr,
        sellerNetCr: fees.sellerNetCr
    });
    recordAuditEvent(buyerId, 'MARKETPLACE_PURCHASE_COMPLETED', {
        listingId: row.listing_id,
        tradeId,
        assetType: row.asset_type,
        registrySerial: row.registry_serial || undefined,
        priceCr
    });
    recordAuditEvent(sellerId, 'MARKETPLACE_SALE_COMPLETED', {
        listingId: row.listing_id,
        tradeId,
        assetType: row.asset_type,
        registrySerial: row.registry_serial || undefined,
        priceCr,
        sellerNetCr: fees.sellerNetCr
    });
    row = statements.getMarketplaceListing.get(row.listing_id);
    return {
        ok: true,
        listing: marketplaceListingFromRow(row, buyerId),
        trade: marketplaceTradeFromRow(statements.getMarketplaceTradeByListing.get(row.listing_id), buyerId),
        buyerProfile,
        sellerProfile,
        fees
    };
}

function buyMarketplaceListing(buyerUserId, listingId) {
    try {
        return transaction(() => buyMarketplaceListingWithin(buyerUserId, listingId));
    } catch (e) {
        if (e && e.message === 'marketplace_transfer_invalid_garage') {
            return { ok: false, error: e.message };
        }
        throw e;
    }
}

function listMarketplaceListings(viewerUserId, options = {}) {
    return transaction(() => {
        settleExpiredMarketplaceListingsWithin(50);
        const viewer = String(viewerUserId || '');
        const type = ['car', 'part'].includes(options.type) ? options.type : 'all';
        const rarity = typeof options.rarity === 'string' ? options.rarity.trim().toLowerCase().slice(0, 30) : '';
        const query = typeof options.q === 'string' ? options.q.trim().toLowerCase().slice(0, 80) : '';
        const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 50)));
        const sort = ['price_asc', 'price_desc', 'oldest'].includes(options.sort) ? options.sort : 'newest';
        const rows = statements.listActiveMarketplaceListings.all(500, 0);
        const counts = { all: rows.length, cars: 0, parts: 0, mine: 0 };
        let listings = rows.map(row => {
            if (row.asset_type === 'car') counts.cars++;
            if (row.asset_type === 'part') counts.parts++;
            if (String(row.seller_user_id || '') === viewer) counts.mine++;
            return marketplaceListingFromRow(row, viewer);
        });
        listings = listings.filter(listing => {
            if (type !== 'all' && listing.type !== type) return false;
            if (rarity && listing.rarity !== rarity) return false;
            if (query) {
                const haystack = `${listing.name} ${listing.category} ${listing.seller} ${listing.partId || ''} ${listing.registry ? listing.registry.registryId || '' : ''}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });
        if (sort === 'price_asc') listings.sort((a, b) => a.priceCr - b.priceCr || String(b.createdAt).localeCompare(String(a.createdAt)));
        else if (sort === 'price_desc') listings.sort((a, b) => b.priceCr - a.priceCr || String(b.createdAt).localeCompare(String(a.createdAt)));
        else if (sort === 'oldest') listings.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const total = listings.length;
        const offset = Math.max(0, Math.min(total, Math.floor(Number(options.offset) || 0)));
        const mine = viewer
            ? statements.listMarketplaceListingsBySeller.all(viewer, 100, 0).map(row => marketplaceListingFromRow(row, viewer))
            : [];
        return {
            ok: true,
            listings: listings.slice(offset, offset + limit),
            mine,
            counts,
            total,
            limit,
            offset,
            config: { ...MARKETPLACE_CONFIG }
        };
    });
}

function getMarketplaceListingForUser(viewerUserId, listingId, options = {}) {
    return transaction(() => {
        settleExpiredMarketplaceListingsWithin(25);
        const row = statements.getMarketplaceListing.get(String(listingId || ''));
        if (!row) return null;
        const viewer = String(viewerUserId || '');
        const party = viewer === String(row.seller_user_id || '') || viewer === String(row.buyer_user_id || '');
        if (row.status !== 'active' && !party && options.admin !== true) return null;
        return {
            listing: marketplaceListingFromRow(row, viewer, { includeAccountIds: options.admin === true }),
            trade: marketplaceTradeFromRow(statements.getMarketplaceTradeByListing.get(row.listing_id), viewer)
        };
    });
}

function listMarketplaceTradesForUser(userId, limit = 50) {
    const key = String(userId || '');
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
    return statements.listMarketplaceTradesByUser.all(key, key, safeLimit)
        .map(row => marketplaceTradeFromRow(row, key));
}

function countActiveMarketplaceListingsForUser(userId) {
    return transaction(() => {
        settleExpiredMarketplaceListingsWithin(25);
        return Number(statements.countActiveMarketplaceListingsBySeller.get(String(userId || '')).count || 0);
    });
}

function getMarketplaceStats() {
    const statusRows = sqlite.prepare('SELECT status, COUNT(*) AS count FROM marketplace_listings GROUP BY status').all();
    const totals = sqlite.prepare(`SELECT COUNT(*) AS trades, COALESCE(SUM(gross_cr), 0) AS grossCr,
        COALESCE(SUM(fee_cr), 0) AS feeCr, COALESCE(SUM(seller_net_cr), 0) AS sellerNetCr
        FROM marketplace_trades`).get();
    return {
        listingsByStatus: Object.fromEntries(statusRows.map(row => [row.status, Number(row.count || 0)])),
        trades: Number(totals.trades || 0),
        grossCr: Number(totals.grossCr || 0),
        feeCr: Number(totals.feeCr || 0),
        sellerNetCr: Number(totals.sellerNetCr || 0),
        config: { ...MARKETPLACE_CONFIG }
    };
}

function expireMarketplaceListings(limit = 100) {
    return transaction(() => settleExpiredMarketplaceListingsWithin(limit));
}

function createDefaultGarage(userId, pilotName) {
    // Carga diferida para evitar un ciclo database -> economy_engine en el arranque.
    const economyEngine = require('./economy_engine');
    return economyEngine.createDefaultGarage(String(userId), pilotName);
}

function maybeApplyTeamBootstrapWithin(userId, profile) {
    const key = String(userId || '');
    if (!profile || !profile.garage || !isTeamBootstrapAccount(key)) return profile;

    const ledgerKey = `team-bootstrap-v${TEAM_BOOTSTRAP_GRANT_VERSION}:${key}`;
    const previousLedger = statements.getLedgerByKey.get(ledgerKey);
    if (previousLedger) {
        const garage = cloneJson(profile.garage);
        const marker = isPlainObject(garage.teamBootstrapGrant) ? garage.teamBootstrapGrant : null;
        if (!marker || Number(marker.version) < TEAM_BOOTSTRAP_GRANT_VERSION) {
            garage.teamBootstrapGrant = {
                version: TEAM_BOOTSTRAP_GRANT_VERSION,
                appliedAt: previousLedger.created_at || nowIso(),
                restoredFromLedger: true
            };
            garage.updatedAt = Date.now();
            statements.updateEconomyProfile.run(JSON.stringify(garage), nowIso(), key);
            const restored = profileFromRow(statements.getEconomyProfile.get(key));
            if (restored) syncSaveGarageWithin(key, restored.garage);
            return restored || profile;
        }
        return profile;
    }

    let outcome = null;
    try {
        // Carga diferida, igual que createDefaultGarage, para no crear un
        // ciclo de require durante el arranque del módulo de BD.
        const economyEngine = require('./economy_engine');
        outcome = economyEngine.applyAction(cloneJson(profile.garage), 'grant_team_bootstrap', {
            grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
            minimumCredits: TEAM_BOOTSTRAP_MINIMUM_CREDITS
        });
    } catch (error) {
        console.warn('⚠️ No se pudo aplicar la dotación de equipo:', error.message);
        recordAuditEvent(key, 'TEAM_BOOTSTRAP_GRANT_FAILED', {
            grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
            error: String(error.message || error).slice(0, 240)
        });
        return profile;
    }

    const result = outcome && outcome.result ? outcome.result : null;
    if (!outcome || outcome.success !== true || !result || result.success !== true || !validateGarageShape(outcome.garage)) {
        console.warn('⚠️ La dotación de equipo devolvió un garaje no válido; no se ha aplicado.');
        recordAuditEvent(key, 'TEAM_BOOTSTRAP_GRANT_FAILED', {
            grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
            error: cleanDbText(result && (result.reason || result.error), 120, 'invalid_team_grant_result')
        });
        return profile;
    }

    const beforeGarage = cloneJson(profile.garage);
    const nextGarage = cloneJson(outcome.garage);
    nextGarage.userId = key;
    let registered;
    try {
        // Savepoint/transacción anidada: si el garaje ya parcheado con las
        // series no validara, también se revierten esas filas del registro;
        // nunca deben quedar series globales de coches que no se entregaron.
        registered = transaction(() => {
            const registeredCars = registerEligibleCarsWithin(key, nextGarage, 'team_bootstrap_grant');
            nextGarage.updatedAt = Date.now();
            if (!validateGarageShape(nextGarage)) {
                throw new Error('invalid_registered_team_garage');
            }
            statements.updateEconomyProfile.run(JSON.stringify(nextGarage), nowIso(), key);
            insertLedgerWithin(key, 'team_bootstrap_grant', ledgerKey, beforeGarage, nextGarage, {
                result: cloneJson(result, { success: true }),
                grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
                minimumCredits: TEAM_BOOTSTRAP_MINIMUM_CREDITS,
                registeredNftSerials: registeredCars.registeredSerials
            });
            return registeredCars;
        });
    } catch (error) {
        console.warn('⚠️ La dotación de equipo no supera la validación tras registrar los coches; no se ha aplicado.');
        recordAuditEvent(key, 'TEAM_BOOTSTRAP_GRANT_FAILED', {
            grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
            error: cleanDbText(error && error.message, 120, 'invalid_registered_team_garage')
        });
        return profile;
    }
    recordAuditEvent(key, 'TEAM_BOOTSTRAP_GRANT_APPLIED', {
        grantVersion: TEAM_BOOTSTRAP_GRANT_VERSION,
        creditsGranted: Number(result.creditsGranted) || 0,
        modelsAdded: Array.isArray(result.modelsAdded) ? result.modelsAdded.length : 0,
        carsMaxed: Number(result.carsMaxed) || nextGarage.garage.length,
        registeredNftSerials: registered.registeredSerials.length
    });

    const grantedProfile = profileFromRow(statements.getEconomyProfile.get(key));
    if (grantedProfile) syncSaveGarageWithin(key, grantedProfile.garage);
    return grantedProfile || profile;
}

function ensureEconomyProfileWithin(userId, options = {}) {
    const key = String(userId || '');
    if (!key) throw new Error('missing_user_id');
    const existing = profileFromRow(statements.getEconomyProfile.get(key));
    if (existing && validateGarageShape(existing.garage)) return maybeApplyTeamBootstrapWithin(key, existing);

    let garage = null;
    let action = 'profile_created';
    if (options.trustedSeed && isPlainObject(options.seedGarage) && validateGarageShape(options.seedGarage)) {
        garage = cloneJson(options.seedGarage);
        action = 'legacy_profile_bootstrap';
    } else {
        garage = createDefaultGarage(key, options.pilotName);
    }
    if (!validateGarageShape(garage)) throw new Error('invalid_default_garage');
    garage.userId = key;
    if (options.pilotName) garage.pilotName = cleanDbText(options.pilotName, 40, garage.pilotName || 'PILOTO GT #44');
    garage.updatedAt = Date.now();

    if (existing) statements.deleteEconomyProfile.run(key);
    statements.insertEconomyProfile.run(key, JSON.stringify(garage), nowIso(), nowIso());
    const registered = registerEligibleCarsWithin(key, garage, action);
    if (registered.changed) {
        garage.updatedAt = Date.now();
        statements.updateEconomyProfile.run(JSON.stringify(garage), nowIso(), key);
    }
    // La clave debe ser única por encarnación del perfil: el ledger histórico
    // se conserva tras un restablecimiento, así que reutilizar
    // `${action}:${key}` haría imposible recrear la cuenta al volver a entrar.
    const profileLedgerKey = `${action}:${key}:${crypto.randomBytes(8).toString('hex')}`;
    insertLedgerWithin(key, action, profileLedgerKey, { credits: 0, gems: 0 }, garage, {
        trustedSeed: Boolean(options.trustedSeed),
        registeredNftSerials: registered.registeredSerials
    });
    const profile = profileFromRow(statements.getEconomyProfile.get(key));
    syncSaveGarageWithin(key, profile.garage);
    return maybeApplyTeamBootstrapWithin(key, profile);
}

function getEconomyProfile(userId) {
    return profileFromRow(statements.getEconomyProfile.get(String(userId || '')));
}

function getOrCreateEconomyProfile(userId, options = {}) {
    return transaction(() => ensureEconomyProfileWithin(userId, options));
}

function applyEconomyMutationWithin(userId, action, idempotencyKey, mutator, details = {}) {
    const key = String(userId || '');
    if (!key || typeof mutator !== 'function') return { ok: false, error: 'invalid_economy_mutation' };

    if (idempotencyKey) {
        const previousLedger = statements.getLedgerByKey.get(String(idempotencyKey).slice(0, 180));
        if (previousLedger) {
            const profile = ensureEconomyProfileWithin(key);
            const previousDetails = parseJsonColumn(previousLedger.details_json, {});
            return {
                ok: true,
                duplicate: true,
                result: previousDetails.result || { success: true, duplicate: true },
                profile
            };
        }
    }

    const before = ensureEconomyProfileWithin(key, details && details._profileOptions ? details._profileOptions : {});
    const beforeGarage = cloneJson(before.garage);
    const workingGarage = cloneJson(before.garage);
    const outcome = mutator(workingGarage, before) || {};
    const success = outcome.success === true || outcome.ok === true;
    const result = outcome.result != null ? outcome.result : outcome;
    if (!success) {
        return { ok: false, error: outcome.error || (result && result.reason) || 'economy_action_failed', result, profile: before };
    }

    const nextGarage = cloneJson(outcome.garage || workingGarage);
    const registeredNftCars = registerEligibleCarsWithin(key, nextGarage, action);
    if (result && isPlainObject(result.car) && typeof result.car.instanceId === 'string') {
        const registeredCar = nextGarage.garage.find(car => car && car.instanceId === result.car.instanceId);
        if (registeredCar && registeredCar.nftRegistry) {
            patchCarWithNftRegistry(result.car, nftRegistryFromRow(
                statements.getNftRegistryByOwnerInstance.get(key, registeredCar.instanceId)
            ));
        }
    }
    if (!validateGarageShape(nextGarage)) {
        throw new Error('economy_mutation_produced_invalid_garage');
    }
    nextGarage.userId = key;
    nextGarage.updatedAt = Date.now();
    statements.updateEconomyProfile.run(JSON.stringify(nextGarage), nowIso(), key);

    const publicDetails = { ...(isPlainObject(details) ? details : {}) };
    delete publicDetails._profileOptions;
    // Guardar un resumen del resultado hace que una repetición idempotente pueda
    // devolver, por ejemplo, el mismo coche de una caja sin volver a tirar RNG.
    publicDetails.result = cloneJson(result, { success: true });
    const ledger = insertLedgerWithin(key, action, idempotencyKey, beforeGarage, nextGarage, publicDetails);
    const profile = profileFromRow(statements.getEconomyProfile.get(key));
    syncSaveGarageWithin(key, profile.garage);
    return { ok: true, duplicate: false, result, profile, ledger };
}

function applyEconomyMutation(userId, action, idempotencyKey, mutator, details = {}) {
    return transaction(() => applyEconomyMutationWithin(userId, action, idempotencyKey, mutator, details));
}

function getEconomyLedger(userId, limit = 50) {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(Number(limit) || 50)));
    return statements.listLedger.all(String(userId || ''), safeLimit).map(row => ({
        id: Number(row.id),
        action: row.action,
        deltaCredits: Number(row.delta_credits) || 0,
        deltaGems: Number(row.delta_gems) || 0,
        createdAt: row.created_at
    }));
}

function listReferralLeaders(limit = 20) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)));
    const profiles = statements.listEconomyProfiles.all(5000).map(profileFromRow).filter(Boolean);
    return profiles
        .map(profile => ({
            pilotName: cleanDbText(profile.garage && profile.garage.pilotName, 40, 'Piloto'),
            referrals: Math.max(0, Math.floor(Number(profile.garage && profile.garage.referralsCount) || 0))
        }))
        .filter(entry => entry.referrals > 0)
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, safeLimit);
}

function findEconomyProfileByReferralCode(referralCode) {
    const code = String(referralCode || '').trim().toUpperCase();
    if (!/^APEX-[A-Z0-9-]{4,24}$/.test(code)) return null;
    const rows = statements.listEconomyProfiles.all(5000);
    for (const row of rows) {
        const profile = profileFromRow(row);
        if (profile && String(profile.garage.referralCode || '').toUpperCase() === code) return profile;
    }
    return null;
}

function redeemReferralOnServer(inviteeUserId, referralCode) {
    const inviteeId = String(inviteeUserId || '');
    const code = String(referralCode || '').trim().toUpperCase();
    return transaction(() => {
        const invitee = ensureEconomyProfileWithin(inviteeId);
        if (invitee.garage.invitedBy) return { ok: false, error: 'referral_already_redeemed', profile: invitee };
        if (String(invitee.garage.referralCode || '').toUpperCase() === code) {
            return { ok: false, error: 'cannot_refer_self', profile: invitee };
        }
        const inviter = findEconomyProfileByReferralCode(code);
        if (!inviter) return { ok: false, error: 'referral_code_not_found', profile: invitee };
        if (inviter.userId === inviteeId) return { ok: false, error: 'cannot_refer_self', profile: invitee };

        const inviteeGrant = applyEconomyMutationWithin(inviteeId, 'referral_invitee_bonus', `referral-invitee:${inviteeId}`, (garage) => {
            garage.invitedBy = code;
            garage.nitros = Math.max(0, Math.floor(Number(garage.nitros) || 0)) + 2;
            return { success: true, result: { success: true, nitrosGranted: 2 } };
        }, { referralCode: code });

        const inviterGrant = applyEconomyMutationWithin(inviter.userId, 'referral_inviter_bonus', `referral-inviter:${inviteeId}`, (garage) => {
            garage.referralsCount = Math.max(0, Math.floor(Number(garage.referralsCount) || 0)) + 1;
            garage.nitros = Math.max(0, Math.floor(Number(garage.nitros) || 0)) + 1;
            if (!Array.isArray(garage.referralHistory)) garage.referralHistory = [];
            garage.referralHistory.push({
                pilotName: cleanDbText(invitee.garage.pilotName, 40, 'Piloto'),
                joinedAt: nowIso()
            });
            garage.referralHistory = garage.referralHistory.slice(-100);
            return { success: true, result: { success: true, nitrosGranted: 1 } };
        }, { inviteeProfileCreated: true });

        return {
            ok: inviteeGrant.ok && inviterGrant.ok,
            profile: inviteeGrant.profile,
            inviterNitrosGranted: 1,
            inviteeNitrosGranted: 2
        };
    });
}

// ===== GUARDADO EN LA NUBE =====
function overlayAuthoritativeGarage(userId, save) {
    if (!isPlainObject(save)) return save;
    const profile = getEconomyProfile(userId);
    if (profile && validateGarageShape(profile.garage)) {
        return { ...save, garage: cloneJson(profile.garage), economyVersion: profile.version };
    }
    return save;
}

function getPlayerSave(userId) {
    const key = String(userId);
    const row = statements.getSave.get(key);
    if (!row) return null;
    const save = parseJsonColumn(row.data_json, null);
    if (!isPlainObject(save)) return null;
    return overlayAuthoritativeGarage(key, { ...save, updatedAt: normalizedSaveTimestamp(row.updated_at) });
}

function putPlayerSave(userId, incoming) {
    const validation = validatePlayerSave(incoming);
    if (!validation.ok) return validation;

    const run = sqlite.transaction(() => {
        const key = String(userId);
        const existingRow = statements.getSave.get(key);
        const existing = existingRow ? parseJsonColumn(existingRow.data_json, null) : null;
        const now = Date.now();
        const incomingTs = normalizedSaveTimestamp(incoming.updatedAt, now);
        const existingTs = existingRow ? normalizedSaveTimestamp(existingRow.updated_at, now) : 0;

        if (existing && existingTs > incomingTs) {
            return {
                ok: false,
                conflict: true,
                save: overlayAuthoritativeGarage(key, { ...existing, updatedAt: existingTs })
            };
        }

        const incomingGarage = isPlainObject(incoming.garage) ? incoming.garage : {};
        const pilotName = typeof incomingGarage.pilotName === 'string'
            ? cleanDbText(incomingGarage.pilotName, 40)
            : undefined;

        let profile = getEconomyProfile(key);
        if (!profile) {
            // Solo un guardado que ya existía en servidor puede sembrar el perfil
            // heredado. Una primera subida nueva recibe el perfil inicial creado
            // por el servidor, nunca saldos/coches declarados por el cliente.
            const canTrustExistingServerSave = Boolean(existing && isPlainObject(existing.garage) && validateGarageShape(existing.garage));
            profile = ensureEconomyProfileWithin(key, {
                pilotName,
                trustedSeed: canTrustExistingServerSave,
                seedGarage: canTrustExistingServerSave ? existing.garage : null
            });
        }

        // Campos no económicos que el cliente sí puede proponer: nombre público
        // y coche equipado, siempre que ese coche exista en el perfil servidor.
        const nextGarage = cloneJson(profile.garage);
        let profileChanged = false;
        if (pilotName && nextGarage.pilotName !== pilotName) {
            nextGarage.pilotName = pilotName;
            profileChanged = true;
        }
        const requestedEquipped = typeof incomingGarage.equippedInstanceId === 'string' ? incomingGarage.equippedInstanceId : null;
        if (requestedEquipped && nextGarage.garage.some(car => car.instanceId === requestedEquipped)
            && nextGarage.equippedInstanceId !== requestedEquipped) {
            nextGarage.equippedInstanceId = requestedEquipped;
            profileChanged = true;
        }
        if (profileChanged) {
            nextGarage.updatedAt = Date.now();
            statements.updateEconomyProfile.run(JSON.stringify(nextGarage), nowIso(), key);
            insertLedgerWithin(key, 'profile_preferences', null, profile.garage, nextGarage, {});
            profile = profileFromRow(statements.getEconomyProfile.get(key));
        }

        const save = {
            userId: key,
            updatedAt: incomingTs,
            garage: cloneJson(profile.garage),
            story: isPlainObject(incoming.story) ? incoming.story : (existing && isPlainObject(existing.story) ? existing.story : null),
            extra: isPlainObject(incoming.extra) ? incoming.extra : {},
            serverSavedAt: nowIso(now),
            economyVersion: profile.version
        };
        statements.upsertSave.run(key, save.updatedAt, JSON.stringify(save), save.serverSavedAt);
        getOrCreateUserWithin(key, pilotName);
        return { ok: true, save };
    });
    return run();
}

function deletePlayerSave(userId) {
    const key = String(userId);
    return transaction(() => {
        settleExpiredMarketplaceListingsWithin(25);
        const activeMarketplaceListings = Number(statements.countActiveMarketplaceListingsBySeller.get(key).count || 0);
        if (activeMarketplaceListings > 0) {
            recordAuditEvent(key, 'player_save_delete_blocked_marketplace', { activeMarketplaceListings });
            return false;
        }
        const existed = Boolean(statements.getSave.get(key));
        statements.deleteSave.run(key);
        const profileExisted = Boolean(statements.getEconomyProfile.get(key));
        if (profileExisted) {
            statements.deleteEconomyProfile.run(key);
            // El ledger se conserva como historial auditable; el siguiente perfil
            // empezará limpio cuando el jugador vuelva a entrar.
            statements.insertLedger.run(key, 'profile_reset', null, 0, 0, JSON.stringify({}), nowIso());
        }
        if (existed || profileExisted) recordAuditEvent(key, 'player_save_deleted', {});
        return existed;
    });
}

// ===== COMPRAS TON =====
function clonePurchase(order) {
    return cloneJson(order, null);
}

function createPurchaseOrder(order) {
    if (!isPlainObject(order) || typeof order.id !== 'string' || !order.id) return null;
    const stored = clonePurchase(order);
    const created = stored.createdAt || nowIso(stored.createdAtMs || Date.now());
    try {
        statements.insertPurchase.run(
            String(stored.id),
            String(stored.userId || ''),
            String(stored.status || 'pending'),
            stored.txHash ? String(stored.txHash) : null,
            JSON.stringify(stored),
            created,
            created
        );
        return clonePurchase(stored);
    } catch (e) {
        return null;
    }
}

function getPurchaseOrder(orderId) {
    const row = statements.getPurchase.get(String(orderId || ''));
    return row ? clonePurchase(parseJsonColumn(row.data_json, null)) : null;
}

function getPurchaseOrderByTxHash(txHash) {
    const row = statements.getPurchaseByTx.get(String(txHash || ''));
    return row ? clonePurchase(parseJsonColumn(row.data_json, null)) : null;
}

function listPurchaseOrdersByUser(userId, options = {}) {
    const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit) || 50)));
    const status = typeof options.status === 'string' ? options.status : null;
    const rows = status
        ? statements.listPurchasesByUserStatus.all(String(userId || ''), status, limit)
        : statements.listPurchasesByUser.all(String(userId || ''), limit);
    return rows.map(row => clonePurchase(parseJsonColumn(row.data_json, null))).filter(Boolean);
}

function countPurchaseOrdersByUser(userId, status) {
    const key = String(userId || '');
    const now = Date.now();
    const orders = statements.listPurchasesByUser.all(key, 1000)
        .map(row => parseJsonColumn(row.data_json, null))
        .filter(Boolean);
    let count = 0;
    for (const order of orders) {
        if (status && order.status !== status) continue;
        if (status === 'pending') {
            const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
            if (expiresAtMs && expiresAtMs <= now) continue;
        }
        count++;
    }
    return count;
}

function updatePurchaseWithin(order) {
    statements.updatePurchase.run(
        String(order.status || 'pending'),
        order.txHash ? String(order.txHash) : null,
        JSON.stringify(order),
        nowIso(),
        String(order.id)
    );
}

function updatePurchaseOrder(order) {
    if (!isPlainObject(order) || typeof order.id !== 'string' || !order.id) return null;
    return transaction(() => {
        const existing = getPurchaseOrder(order.id);
        if (!existing) return null;
        const stored = clonePurchase(order);
        updatePurchaseWithin(stored);
        return clonePurchase(stored);
    });
}

function markPurchasePaid(orderId, txHash, details) {
    const run = sqlite.transaction(() => {
        const key = String(orderId || '');
        const hash = String(txHash || '').trim();
        const row = statements.getPurchase.get(key);
        const order = row ? parseJsonColumn(row.data_json, null) : null;
        if (!order || !hash) return { ok: false, error: 'order_or_tx_missing' };
        if (order.paymentProvider === 'telegram_stars') return { ok: false, error: 'wrong_payment_provider' };

        const used = statements.getProcessedTx.get(hash);
        if (used && String(used.order_id) !== key) return { ok: false, error: 'tx_already_used' };
        if (order.status === 'paid' || order.status === 'claimed') {
            return order.txHash === hash
                ? { ok: true, already: true, order: clonePurchase(order) }
                : { ok: false, error: 'order_already_paid_other_tx' };
        }
        if (order.status !== 'pending') return { ok: false, error: 'order_not_pending' };

        statements.insertProcessedTx.run(hash, key);
        order.status = 'paid';
        order.txHash = hash;
        order.paidAt = nowIso();
        if (details && typeof details.sender === 'string') order.sender = details.sender.slice(0, 120);
        if (details && details.amountNanotons !== undefined) order.amountNanotonsSeen = String(details.amountNanotons);
        updatePurchaseWithin(order);
        return { ok: true, already: false, order: clonePurchase(order) };
    });
    return run();
}

function claimPurchaseOrder(orderId, userId, economyMutator) {
    const run = sqlite.transaction(() => {
        const key = String(orderId || '');
        const owner = String(userId || '');
        const row = statements.getPurchase.get(key);
        const order = row ? parseJsonColumn(row.data_json, null) : null;
        if (!order || order.userId !== owner) return { ok: false, error: 'order_not_found' };
        if (order.paymentProvider === 'telegram_stars') {
            // La vía TON nunca debe reclamar un pedido Stars: su entrega usa
            // fulfillTelegramStarsPurchase y otra barrera de idempotencia.
            return { ok: false, error: 'wrong_payment_provider', order: clonePurchase(order) };
        }

        if (order.status === 'claimed') {
            return {
                ok: true,
                alreadyClaimed: true,
                cr: Number(order.cr || 0),
                productType: order.productType || 'cr',
                crateId: order.crateId || null,
                order: clonePurchase(order),
                profile: getEconomyProfile(owner),
                economyResult: order.claimResult || null
            };
        }
        if (order.status !== 'paid') return { ok: false, error: 'order_not_paid' };

        let economy = null;
        if (typeof economyMutator === 'function') {
            economy = applyEconomyMutationWithin(owner, 'ton_purchase_claim', `purchase:${key}`, (garage) => {
                return economyMutator({ order: clonePurchase(order), garage });
            }, {
                orderId: key,
                txHash: order.txHash || null,
                productType: order.productType || 'cr',
                crateId: order.crateId || null,
                cr: Number(order.cr || 0)
            });
            if (!economy.ok) {
                // Lanzar revierte también cualquier cambio parcial. El pedido
                // permanece 'paid' y puede reintentarse sin perder el pago.
                const error = new Error(economy.error || 'economy_claim_failed');
                error.code = economy.error || 'economy_claim_failed';
                error.economyResult = economy.result || null;
                throw error;
            }
            order.claimResult = cloneJson(economy.result, { success: true });
            order.economyAppliedAt = nowIso();
        }

        order.status = 'claimed';
        order.claimedAt = nowIso();
        updatePurchaseWithin(order);
        return {
            ok: true,
            alreadyClaimed: false,
            cr: Number(order.cr || 0),
            productType: order.productType || 'cr',
            crateId: order.crateId || null,
            order: clonePurchase(order),
            profile: economy ? economy.profile : getEconomyProfile(owner),
            economyResult: economy ? economy.result : null
        };
    });

    try {
        return run();
    } catch (e) {
        return {
            ok: false,
            error: e.code || 'economy_claim_failed',
            economyResult: e.economyResult || null
        };
    }
}

// ===== COMPRAS CON TELEGRAM STARS (v105) =====
// El pedido se crea antes que la factura. Telegram devuelve dos eventos al
// bot: pre_checkout_query (solo autoriza, no entrega nada) y
// successful_payment (único evento que puede mover el saldo). El cargo se
// guarda primero como paid_unfulfilled; la entrega posterior es idempotente
// y puede reintentarse desde status/admin sin duplicar $CR.
const TELEGRAM_STARS_PROVIDER = 'telegram_stars';
const TELEGRAM_STARS_SUCCESS_GRACE_MS = 120 * 1000;
const TELEGRAM_STARS_CHECKOUT_RESERVATION_MS = 60 * 1000;

function parseTelegramStarsInvoicePayload(payload) {
    const match = /^apex_stars_v1:(APEX-[0-9A-F]{12})$/.exec(String(payload || ''));
    return match ? match[1] : null;
}

function getPurchaseOrderByInvoicePayload(payload) {
    const orderId = parseTelegramStarsInvoicePayload(payload);
    if (!orderId) return null;
    const order = getPurchaseOrder(orderId);
    if (!order || order.paymentProvider !== TELEGRAM_STARS_PROVIDER || order.invoicePayload !== String(payload)) return null;
    return order;
}

function processedPaymentChargeFromRow(row) {
    if (!row) return null;
    return {
        provider: row.provider,
        chargeId: row.charge_id,
        orderId: row.order_id || null,
        userId: row.user_id,
        status: row.status,
        data: parseJsonColumn(row.data_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function insertProcessedPaymentChargeWithin(charge) {
    statements.insertProcessedPaymentCharge.run(
        TELEGRAM_STARS_PROVIDER,
        String(charge.chargeId),
        charge.orderId ? String(charge.orderId) : null,
        String(charge.userId || ''),
        String(charge.status || 'received'),
        JSON.stringify(isPlainObject(charge.data) ? charge.data : {}).slice(0, 20000),
        nowIso(),
        nowIso()
    );
    return processedPaymentChargeFromRow(
        statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, String(charge.chargeId))
    );
}

function updateProcessedPaymentChargeWithin(chargeId, status, dataPatch = {}, orderId = undefined) {
    const existing = processedPaymentChargeFromRow(
        statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, String(chargeId || ''))
    );
    if (!existing) return null;
    const data = { ...existing.data, ...(isPlainObject(dataPatch) ? dataPatch : {}) };
    statements.updateProcessedPaymentCharge.run(
        orderId === undefined ? existing.orderId : (orderId ? String(orderId) : null),
        String(status || existing.status),
        JSON.stringify(data).slice(0, 20000),
        nowIso(),
        TELEGRAM_STARS_PROVIDER,
        String(chargeId)
    );
    return processedPaymentChargeFromRow(
        statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, String(chargeId))
    );
}

function appendTelegramStarsChargeToOrder(order, field, entry) {
    if (!Array.isArray(order[field])) order[field] = [];
    const existing = order[field].find(item => item && item.chargeId === entry.chargeId);
    if (existing) Object.assign(existing, entry);
    else order[field].push(entry);
    order[field] = order[field].slice(-20);
}

function validateTelegramStarsPreCheckout(input = {}) {
    const payerUserId = String(input.userId || '');
    const queryId = String(input.queryId || '').slice(0, 160);
    const currency = String(input.currency || '');
    const totalAmount = Number(input.totalAmount);
    return transaction(() => {
        const order = getPurchaseOrderByInvoicePayload(input.invoicePayload);
        if (!order) return { ok: false, error: 'invalid_invoice_payload', message: 'Este pedido de Apex Motorsport ya no es válido. Crea uno nuevo desde el juego.' };
        if (!queryId) return { ok: false, error: 'missing_pre_checkout_query_id', message: 'Telegram no ha identificado esta comprobación de pago. Inténtalo de nuevo.', order: clonePurchase(order) };
        if (String(order.userId) !== payerUserId) return { ok: false, error: 'payer_mismatch', message: 'Esta factura pertenece a otra cuenta de Telegram. Ábrela desde tu propio juego.', order: clonePurchase(order) };
        if (currency !== 'XTR') return { ok: false, error: 'invalid_currency', message: 'Esta compra solo puede pagarse con Telegram Stars (XTR).', order: clonePurchase(order) };
        if (!Number.isInteger(totalAmount) || totalAmount !== Math.floor(Number(order.priceStars) || 0)) {
            return { ok: false, error: 'amount_mismatch', message: 'El importe de la factura no coincide con el pedido. No se ha cobrado nada.', order: clonePurchase(order) };
        }
        if (order.status === 'claimed' || order.status === 'paid_unfulfilled') {
            return { ok: false, error: 'order_already_paid', message: 'Este pedido ya está pagado. No vuelvas a pagarlo; abre la billetera del juego para comprobarlo.', order: clonePurchase(order) };
        }
        if (order.status !== 'pending') {
            return { ok: false, error: 'order_not_payable', message: 'Este pedido ya no puede pagarse. Crea uno nuevo desde el juego.', order: clonePurchase(order) };
        }
        if (!order.invoiceUrl) {
            return { ok: false, error: 'invoice_not_ready', message: 'La factura aún no está lista. Espera unos segundos y vuelve a intentarlo.', order: clonePurchase(order) };
        }
        const now = Date.now();
        const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
        if (expiresAtMs && now > expiresAtMs) {
            order.status = 'expired';
            updatePurchaseWithin(order);
            return { ok: false, error: 'order_expired', message: 'Este pedido ha caducado. Crea uno nuevo desde el juego; no reutilices esta factura.', order: clonePurchase(order) };
        }
        const reservedUntil = Number(order.checkoutReservedUntilMs || 0);
        if (reservedUntil > now && order.preCheckoutQueryId && order.preCheckoutQueryId !== queryId) {
            return { ok: false, error: 'checkout_in_progress', message: 'Ya hay un pago de este pedido en curso. Espera unos segundos y comprueba la billetera.', order: clonePurchase(order) };
        }
        order.preCheckoutQueryId = queryId;
        order.preCheckoutAt = nowIso(now);
        order.checkoutReservedUntilMs = now + TELEGRAM_STARS_CHECKOUT_RESERVATION_MS;
        updatePurchaseWithin(order);
        return { ok: true, order: clonePurchase(order) };
    });
}

function recordTelegramStarsSuccessfulPayment(input = {}) {
    const payerUserId = String(input.userId || '');
    const chargeId = String(input.telegramPaymentChargeId || '').trim().slice(0, 180);
    const providerChargeId = String(input.providerPaymentChargeId || '').trim().slice(0, 180);
    const currency = String(input.currency || '');
    const totalAmount = Number(input.totalAmount);
    const invoicePayload = String(input.invoicePayload || '');
    if (!chargeId) return { ok: false, error: 'missing_telegram_payment_charge_id' };

    return transaction(() => {
        const existingCharge = processedPaymentChargeFromRow(
            statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, chargeId)
        );
        const orderIdFromPayload = parseTelegramStarsInvoicePayload(invoicePayload);
        let order = getPurchaseOrderByInvoicePayload(invoicePayload);

        if (existingCharge) {
            if (existingCharge.userId !== payerUserId || (existingCharge.orderId && orderIdFromPayload && existingCharge.orderId !== orderIdFromPayload)) {
                return { ok: false, error: 'charge_already_used', charge: existingCharge, order: order ? clonePurchase(order) : null };
            }
            if (!order && existingCharge.orderId) order = getPurchaseOrder(existingCharge.orderId);
            const disposition = existingCharge.status === 'fulfilled'
                ? 'fulfilled'
                : (existingCharge.status === 'received'
                    ? 'ready_to_fulfill'
                    : (existingCharge.status === 'refunded' ? 'already_refunded' : 'refund_required'));
            return {
                ok: existingCharge.status !== 'refunded',
                duplicate: true,
                disposition,
                refundRequired: disposition === 'refund_required',
                charge: existingCharge,
                order: order ? clonePurchase(order) : null
            };
        }

        const paymentData = {
            invoicePayload,
            currency,
            totalAmount: Number.isInteger(totalAmount) ? totalAmount : null,
            providerPaymentChargeId: providerChargeId || null,
            receivedAt: nowIso()
        };

        if (!order) {
            const charge = insertProcessedPaymentChargeWithin({
                chargeId,
                orderId: orderIdFromPayload,
                userId: payerUserId,
                status: 'refund_required',
                data: { ...paymentData, reason: 'order_not_found' }
            });
            return { ok: false, disposition: 'refund_required', refundRequired: true, error: 'order_not_found', charge, order: null };
        }

        let invalidReason = null;
        if (String(order.userId) !== payerUserId) invalidReason = 'payer_mismatch';
        else if (currency !== 'XTR') invalidReason = 'invalid_currency';
        else if (!Number.isInteger(totalAmount) || totalAmount !== Math.floor(Number(order.priceStars) || 0)) invalidReason = 'amount_mismatch';
        else if (order.telegramPaymentChargeId && order.telegramPaymentChargeId !== chargeId) invalidReason = 'duplicate_payment';
        else if (order.status === 'pending') {
            const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
            if (!order.invoiceUrl) invalidReason = 'invoice_not_ready';
            else if (expiresAtMs && Date.now() > expiresAtMs + TELEGRAM_STARS_SUCCESS_GRACE_MS) invalidReason = 'order_expired';
        } else {
            invalidReason = 'order_not_payable';
        }

        if (invalidReason) {
            const charge = insertProcessedPaymentChargeWithin({
                chargeId,
                orderId: order.id,
                userId: payerUserId,
                status: 'refund_required',
                data: { ...paymentData, reason: invalidReason }
            });
            appendTelegramStarsChargeToOrder(order, 'refundRequiredCharges', {
                chargeId,
                providerPaymentChargeId: providerChargeId || null,
                totalAmount: Number.isInteger(totalAmount) ? totalAmount : null,
                currency,
                reason: invalidReason,
                recordedAt: nowIso()
            });
            if (invalidReason === 'order_expired' && order.status === 'pending') order.status = 'expired';
            updatePurchaseWithin(order);
            return {
                ok: false,
                disposition: 'refund_required',
                refundRequired: true,
                error: invalidReason,
                charge,
                order: clonePurchase(order)
            };
        }

        const charge = insertProcessedPaymentChargeWithin({
            chargeId,
            orderId: order.id,
            userId: payerUserId,
            status: 'received',
            data: paymentData
        });
        order.status = 'paid_unfulfilled';
        order.telegramPaymentChargeId = chargeId;
        order.providerPaymentChargeId = providerChargeId || null;
        order.paidAmountStars = totalAmount;
        order.paidAt = nowIso();
        order.checkoutReservedUntilMs = 0;
        updatePurchaseWithin(order);
        return {
            ok: true,
            disposition: 'ready_to_fulfill',
            duplicate: false,
            charge,
            order: clonePurchase(order)
        };
    });
}

function fulfillTelegramStarsPurchase(orderId, economyMutator) {
    const run = sqlite.transaction(() => {
        const key = String(orderId || '');
        const order = getPurchaseOrder(key);
        if (!order || order.paymentProvider !== TELEGRAM_STARS_PROVIDER) return { ok: false, error: 'order_not_found' };
        if (order.status === 'claimed') {
            const charge = order.telegramPaymentChargeId
                ? processedPaymentChargeFromRow(statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, order.telegramPaymentChargeId))
                : null;
            return {
                ok: true,
                alreadyClaimed: true,
                duplicate: true,
                cr: Number(order.cr || 0),
                order: clonePurchase(order),
                charge,
                profile: getEconomyProfile(order.userId),
                economyResult: order.claimResult || null
            };
        }
        if (order.status !== 'paid_unfulfilled') return { ok: false, error: 'order_not_paid', order: clonePurchase(order) };
        if (typeof economyMutator !== 'function') return { ok: false, error: 'missing_economy_mutator', order: clonePurchase(order) };

        const chargeId = String(order.telegramPaymentChargeId || '');
        const charge = chargeId
            ? processedPaymentChargeFromRow(statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, chargeId))
            : null;
        if (!charge || charge.orderId !== order.id || charge.userId !== String(order.userId) || !['received', 'fulfilled'].includes(charge.status)) {
            return { ok: false, error: 'payment_charge_not_verified', order: clonePurchase(order), charge };
        }

        const economy = applyEconomyMutationWithin(order.userId, 'telegram_stars_purchase', `telegram-stars-purchase:${order.id}`, (garage) => {
            return economyMutator({ order: clonePurchase(order), garage, charge: cloneJson(charge) });
        }, {
            orderId: order.id,
            telegramPaymentChargeId: chargeId,
            priceStars: Math.floor(Number(order.priceStars) || 0),
            cr: Number(order.cr || 0)
        });
        if (!economy.ok) {
            const error = new Error(economy.error || 'telegram_stars_fulfillment_failed');
            error.code = economy.error || 'telegram_stars_fulfillment_failed';
            error.economyResult = economy.result || null;
            throw error;
        }

        const fulfilledCharge = updateProcessedPaymentChargeWithin(chargeId, 'fulfilled', { fulfilledAt: nowIso() }, order.id);
        order.status = 'claimed';
        order.claimedAt = nowIso();
        order.economyAppliedAt = order.claimedAt;
        order.claimResult = cloneJson(economy.result, { success: true });
        updatePurchaseWithin(order);
        return {
            ok: true,
            alreadyClaimed: economy.duplicate === true,
            duplicate: economy.duplicate === true,
            cr: Number(order.cr || 0),
            order: clonePurchase(order),
            charge: fulfilledCharge,
            profile: economy.profile,
            economyResult: economy.result
        };
    });

    try {
        return run();
    } catch (e) {
        return { ok: false, error: e.code || 'telegram_stars_fulfillment_failed', economyResult: e.economyResult || null };
    }
}

function getTelegramStarsCharge(chargeId) {
    return processedPaymentChargeFromRow(
        statements.getProcessedPaymentCharge.get(TELEGRAM_STARS_PROVIDER, String(chargeId || ''))
    );
}

function listTelegramStarsChargesForOrder(orderId) {
    return statements.listProcessedPaymentChargesByOrder.all(TELEGRAM_STARS_PROVIDER, String(orderId || ''))
        .map(processedPaymentChargeFromRow)
        .filter(Boolean);
}

function expireTelegramStarsOrderIfNeeded(orderId) {
    const key = String(orderId || '');
    return transaction(() => {
        const order = getPurchaseOrder(key);
        if (!order || order.paymentProvider !== TELEGRAM_STARS_PROVIDER) return order;
        const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
        if (order.status === 'pending' && expiresAtMs && Date.now() > expiresAtMs + TELEGRAM_STARS_SUCCESS_GRACE_MS) {
            order.status = 'expired';
            updatePurchaseWithin(order);
        }
        return clonePurchase(order);
    });
}

function recordTelegramStarsRefundedPayment(input = {}) {
    const chargeId = String(input.telegramPaymentChargeId || '').trim().slice(0, 180);
    if (!chargeId) return { ok: false, error: 'missing_telegram_payment_charge_id' };
    const payerUserId = String(input.userId || '');
    const invoicePayload = String(input.invoicePayload || '');
    const totalAmount = Number(input.totalAmount);

    return transaction(() => {
        let charge = getTelegramStarsCharge(chargeId);
        let order = getPurchaseOrderByInvoicePayload(invoicePayload);
        if (!order && charge && charge.orderId) order = getPurchaseOrder(charge.orderId);
        const refundedAt = nowIso();
        const data = {
            invoicePayload: invoicePayload || (charge && charge.data.invoicePayload) || null,
            totalAmount: Number.isInteger(totalAmount) ? totalAmount : null,
            currency: String(input.currency || 'XTR'),
            providerPaymentChargeId: String(input.providerPaymentChargeId || '').slice(0, 180) || null,
            refundedAt,
            refundSource: cleanDbText(input.source, 40, 'telegram')
        };
        if (!charge) {
            charge = insertProcessedPaymentChargeWithin({
                chargeId,
                orderId: order ? order.id : parseTelegramStarsInvoicePayload(invoicePayload),
                userId: payerUserId || (order ? order.userId : ''),
                status: 'refunded',
                data
            });
        } else {
            charge = updateProcessedPaymentChargeWithin(chargeId, 'refunded', data, order ? order.id : charge.orderId);
        }

        if (order) {
            appendTelegramStarsChargeToOrder(order, 'refundedCharges', {
                chargeId,
                totalAmount: Number.isInteger(totalAmount) ? totalAmount : null,
                refundedAt
            });
            if (Array.isArray(order.refundRequiredCharges)) {
                for (const entry of order.refundRequiredCharges) {
                    if (entry && entry.chargeId === chargeId) entry.status = 'refunded';
                }
            }
            if (order.telegramPaymentChargeId === chargeId) {
                order.paymentRefundedAt = refundedAt;
                // Un chargeback posterior a entregar $CR no revierte saldo
                // automáticamente: el jugador pudo gastarlo legítimamente y
                // una resta ciega dejaría saldos negativos o quitaría coches.
                // Queda marcado para revisión manual/auditoría.
                order.refundReviewRequired = order.status === 'claimed';
                if (order.status === 'paid_unfulfilled' || order.status === 'pending') order.status = 'refunded';
            }
            updatePurchaseWithin(order);
        }
        return { ok: true, charge, order: order ? clonePurchase(order) : null };
    });
}

// ===== RECOMPENSAS PUBLICITARIAS VERIFICADAS POR WEBHOOK =====
function createAdRewardEntitlement(userId, rewardType, sourceId) {
    const key = String(userId || '');
    const type = ['energy', 'nitro', 'generic'].includes(String(rewardType)) ? String(rewardType) : 'generic';
    const source = sourceId ? String(sourceId).slice(0, 180) : null;
    if (source) {
        const existing = statements.getAdEntitlementBySource.get(source);
        if (existing) return { ok: true, duplicate: true, entitlementId: existing.id };
    }
    const id = 'ad_' + crypto.randomBytes(12).toString('hex');
    statements.insertAdEntitlement.run(id, key, type, source, nowIso());
    return { ok: true, duplicate: false, entitlementId: id };
}

function claimAdReward(userId, rewardType, economyMutator) {
    const key = String(userId || '');
    const type = ['energy', 'nitro'].includes(String(rewardType)) ? String(rewardType) : null;
    if (!type || typeof economyMutator !== 'function') return { ok: false, error: 'invalid_ad_reward_type' };

    const run = sqlite.transaction(() => {
        const entitlement = statements.getOldestPendingAd.get(key, type);
        if (!entitlement) return { ok: false, error: 'ad_reward_not_verified_yet' };
        const ageMs = Date.now() - Date.parse(entitlement.created_at || '');
        if (!Number.isFinite(ageMs) || ageMs > 60 * 60 * 1000) {
            sqlite.prepare("UPDATE ad_reward_entitlements SET status = 'expired' WHERE id = ?").run(entitlement.id);
            return { ok: false, error: 'ad_reward_expired' };
        }

        const economy = applyEconomyMutationWithin(key, `ad_reward_${type}`, `ad-reward:${entitlement.id}`, (garage) => {
            return economyMutator({ garage, rewardType: type, entitlement: { ...entitlement } });
        }, { entitlementId: entitlement.id, source: 'adsgram_webhook' });
        if (!economy.ok) {
            const error = new Error(economy.error || 'ad_reward_apply_failed');
            error.code = economy.error || 'ad_reward_apply_failed';
            error.economyResult = economy.result || null;
            throw error;
        }

        const marked = statements.markAdClaimed.run(nowIso(), entitlement.id);
        if (!marked.changes) throw new Error('ad_reward_already_claimed');
        return { ok: true, entitlementId: entitlement.id, profile: economy.profile, economyResult: economy.result };
    });

    try {
        return run();
    } catch (e) {
        return { ok: false, error: e.code || 'ad_reward_apply_failed', economyResult: e.economyResult || null };
    }
}

function closeDatabase() {
    try { sqlite.close(); } catch (e) {}
}

module.exports = {
    DB_FILE,
    LEGACY_DB_FILE,
    SCHEMA_VERSION,
    getUser,
    recordRaceResult,
    getLeaderboard,
    getCars,
    getPlayerSave,
    putPlayerSave,
    deletePlayerSave,
    verifyOrRegisterDeviceSecret,
    createDeviceRecoveryCode,
    resetDeviceSecretWithRecovery,
    rotateDeviceSecret,
    createPurchaseOrder,
    getPurchaseOrder,
    getPurchaseOrderByTxHash,
    getPurchaseOrderByInvoicePayload,
    listPurchaseOrdersByUser,
    countPurchaseOrdersByUser,
    updatePurchaseOrder,
    markPurchasePaid,
    claimPurchaseOrder,
    parseTelegramStarsInvoicePayload,
    validateTelegramStarsPreCheckout,
    recordTelegramStarsSuccessfulPayment,
    fulfillTelegramStarsPurchase,
    getTelegramStarsCharge,
    listTelegramStarsChargesForOrder,
    expireTelegramStarsOrderIfNeeded,
    recordTelegramStarsRefundedPayment,
    syncNftRegistryForUser,
    prepareNftConversion,
    cancelNftConversionPreparation,
    getNftClaimForUser,
    getPublicNftRegistryEntry,
    MARKETPLACE_CONFIG,
    marketplaceFeeBreakdown,
    expireMarketplaceListings,
    createMarketplaceListing,
    cancelMarketplaceListing,
    buyMarketplaceListing,
    listMarketplaceListings,
    getMarketplaceListingForUser,
    listMarketplaceTradesForUser,
    countActiveMarketplaceListingsForUser,
    getMarketplaceStats,
    getMetaValue,
    setMetaValue,
    getEconomyProfile,
    getOrCreateEconomyProfile,
    isTeamBootstrapAccount,
    applyEconomyMutation,
    getEconomyLedger,
    listReferralLeaders,
    findEconomyProfileByReferralCode,
    redeemReferralOnServer,
    createAdRewardEntitlement,
    claimAdReward,
    recordAuditEvent,
    getAuditSummary,
    getDatabaseHealth,
    backupDatabaseTo,
    closeDatabase
};
