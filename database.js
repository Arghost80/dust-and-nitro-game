// ===== BASE DE DATOS Y PERSISTENCIA (JSON ROBUSTO v100) =====
// Cambios v100 (Guardado en servidor):
//  - La BD se carga UNA vez en memoria (antes se leía el archivo entero en cada llamada
//    y recordRaceResult perdía las estadísticas del jugador por trabajar con dos copias).
//  - Escritura atómica: se escribe a un archivo temporal y se renombra, para que un
//    corte de luz/reinicio a mitad de escritura nunca corrompa el archivo principal.
//  - Ubicación configurable con las variables de entorno DB_FILE o DATA_DIR.
//    En Render con disco persistente: DATA_DIR=/var/datos (montar el disco ahí).
//  - Nueva colección `saves`: guardado completo del jugador (garaje, historia y ajustes)
//    sincronizado desde la Mini App por cloud_save.js.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || process.env.DB_DIR || __dirname;
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'game_database.json');

try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
} catch (e) {
    console.warn('⚠️ No se pudo crear la carpeta de datos:', e.message);
}

// Estructura por defecto
const defaultData = {
    users: {},
    saves: {},
    leaderboard: [
        { username: 'AlexPro_89', track: 'Apex Valley', time: 42.15, car: 'Interceptor V8' },
        { username: 'DriftQueen', track: 'Apex Valley', time: 43.40, car: 'Cyan Phantom' },
        { username: 'Badlander', track: 'Apex Valley', time: 45.10, car: 'Road Monster' }
    ],
    carsCatalog: [
        { id: 'v8_interceptor', name: 'INTERCEPTOR V8', price: 0, speed: 380, handling: 4.8, accel: 320, color: '#e63946', unlocked: true },
        { id: 'cyan_phantom', name: 'CYAN PHANTOM', price: 500, speed: 410, handling: 4.5, accel: 350, color: '#00f5d4', unlocked: false },
        { id: 'neon_viper', name: 'NEON VIPER', price: 1200, speed: 430, handling: 5.2, accel: 380, color: '#fee440', unlocked: false },
        { id: 'shadow_titan', name: 'SHADOW TITAN', price: 2500, speed: 450, handling: 4.2, accel: 420, color: '#7209b7', unlocked: false }
    ]
};

let cache = null;

function loadDatabase() {
    if (cache) return cache;
    try {
        if (!fs.existsSync(DB_FILE)) {
            cache = JSON.parse(JSON.stringify(defaultData));
            persistNow(cache);
            return cache;
        }
        const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        cache = parsed;
    } catch (e) {
        console.error('Error cargando database (se usan valores por defecto):', e.message);
        // Preservar el archivo dañado para recuperación manual antes de que una
        // escritura posterior lo sobrescriba con la estructura por defecto.
        try {
            if (fs.existsSync(DB_FILE)) {
                const backupFile = `${DB_FILE}.corrupt-${Date.now()}`;
                fs.renameSync(DB_FILE, backupFile);
                console.error('Copia del archivo dañado guardada en:', backupFile);
            }
        } catch (backupError) {
            console.error('No se pudo preservar la BD dañada:', backupError.message);
        }
        cache = JSON.parse(JSON.stringify(defaultData));
    }
    // Migración suave de archivos antiguos (v99 y anteriores no tenían `saves`)
    if (!cache.users || typeof cache.users !== 'object') cache.users = {};
    if (!cache.saves || typeof cache.saves !== 'object') cache.saves = {};
    if (!Array.isArray(cache.leaderboard)) cache.leaderboard = [...defaultData.leaderboard];
    if (!Array.isArray(cache.carsCatalog)) cache.carsCatalog = [...defaultData.carsCatalog];
    return cache;
}

// Escritura atómica: temporal + rename (en el mismo disco, rename es atómico)
function persistNow(data) {
    try {
        const tmpFile = DB_FILE + '.tmp';
        fs.writeFileSync(tmpFile, JSON.stringify(data), { mode: 0o600 });
        fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
        console.error('Error guardando database:', e.message);
    }
}

function saveDatabase(data) {
    cache = data;
    persistNow(data);
}

function cleanDbText(value, maxLength = 80, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, maxLength);
    return text || fallback;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Validación estructural del guardado. No convierte la economía cliente en
// autoritativa, pero evita tipos imposibles, estructuras gigantes, claves
// peligrosas y marcas de tiempo que bloquearían sincronizaciones futuras.
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

function getOrCreateUser(db, userId, username) {
    const key = String(userId);
    const cleanUsername = cleanDbText(username, 40);
    if (!db.users[key]) {
        db.users[key] = {
            id: userId,
            username: cleanUsername || 'Racer_' + userId,
            coins: 200,
            selectedCar: 'v8_interceptor',
            unlockedCars: ['v8_interceptor'],
            stats: { races: 0, wins: 0, bestTime: null },
            createdAt: new Date().toISOString()
        };
    } else if (cleanUsername && db.users[key].username !== cleanUsername) {
        db.users[key].username = cleanUsername;
    }
    return db.users[key];
}

function getUser(userId, username) {
    const db = loadDatabase();
    const previous = db.users[String(userId)] || null;
    const previousName = previous ? previous.username : null;
    const user = getOrCreateUser(db, userId, username);
    if (!previous || previousName !== user.username) persistNow(db);
    return user;
}

function recordRaceResult(userId, username, trackName, time, carName) {
    const db = loadDatabase();
    const user = getOrCreateUser(db, userId, username);
    const cleanTime = Number(time);
    if (!user.stats || typeof user.stats !== 'object') user.stats = { races: 0, wins: 0, bestTime: null };

    if (!Number.isFinite(cleanTime) || cleanTime <= 0 || cleanTime > 3600) {
        return {
            coinsEarned: 0,
            recorded: false,
            stats: { races: Number(user.stats.races) || 0, bestTime: user.stats.bestTime || null },
            leaderboardPosition: null
        };
    }

    user.stats.races = (Number(user.stats.races) || 0) + 1;
    // v101: el resultado HTTP ya no acuña monedas. Hasta que exista una sesión
    // de carrera y un ledger autoritativos en servidor, este endpoint solo
    // registra estadísticas/ranking de pilotos autenticados.
    const roundedTime = parseFloat(cleanTime.toFixed(2));
    if (!user.stats.bestTime || roundedTime < user.stats.bestTime) {
        user.stats.bestTime = roundedTime;
    }

    const entry = {
        username: cleanDbText(user.username, 40, 'Piloto'),
        track: cleanDbText(trackName, 80, 'Circuito'),
        time: roundedTime,
        car: cleanDbText(carName || user.selectedCar, 80, 'Coche')
    };
    db.leaderboard.push(entry);
    db.leaderboard.sort((a, b) => Number(a.time) - Number(b.time));
    const position = db.leaderboard.indexOf(entry);
    if (db.leaderboard.length > 20) db.leaderboard = db.leaderboard.slice(0, 20);

    persistNow(db);
    return {
        coinsEarned: 0,
        recorded: true,
        stats: { races: user.stats.races, bestTime: user.stats.bestTime },
        leaderboardPosition: position >= 0 && position < 20 ? position + 1 : null
    };
}

function getLeaderboard() {
    const rows = loadDatabase().leaderboard;
    if (!Array.isArray(rows)) return [];
    return rows
        .filter(row => row && Number.isFinite(Number(row.time)) && Number(row.time) > 0)
        .slice(0, 20)
        .map(row => ({
            username: cleanDbText(row.username, 40, 'Piloto'),
            track: cleanDbText(row.track, 80, 'Circuito'),
            time: parseFloat(Number(row.time).toFixed(2)),
            car: cleanDbText(row.car, 80, 'Coche')
        }));
}

function getCars() {
    return loadDatabase().carsCatalog;
}

// ===== GUARDADO COMPLETO DEL JUGADOR (cloud save v100) =====
// Un "save" es el paquete que envía cloud_save.js:
// { updatedAt, garage, story, extra }  -> el servidor añade serverSavedAt.
function getPlayerSave(userId) {
    const db = loadDatabase();
    const save = db.saves[String(userId)] || null;
    if (!save) return null;
    // No propagar timestamps absurdamente futuros de guardados antiguos.
    return { ...save, updatedAt: normalizedSaveTimestamp(save.updatedAt) };
}

// Devuelve { ok:true, save } o { ok:false, conflict:true, save } si el servidor
// ya tiene una versión MÁS NUEVA (otro dispositivo jugó después): gana la más reciente.
function putPlayerSave(userId, incoming) {
    const validation = validatePlayerSave(incoming);
    if (!validation.ok) return validation;

    const db = loadDatabase();
    const key = String(userId);
    const existing = db.saves[key] || null;
    const now = Date.now();
    const incomingTs = normalizedSaveTimestamp(incoming.updatedAt, now);
    const existingTs = existing ? normalizedSaveTimestamp(existing.updatedAt, now) : 0;

    if (existing && existingTs > incomingTs) {
        return { ok: false, conflict: true, save: { ...existing, updatedAt: existingTs } };
    }

    const save = {
        userId: key,
        updatedAt: incomingTs,
        garage: isPlainObject(incoming.garage) ? incoming.garage : null,
        story: isPlainObject(incoming.story) ? incoming.story : null,
        extra: isPlainObject(incoming.extra) ? incoming.extra : {},
        serverSavedAt: new Date(now).toISOString()
    };
    db.saves[key] = save;

    // Mantener también el perfil básico del bot al día (nombre de piloto)
    const pilotName = save.garage && typeof save.garage.pilotName === 'string' ? cleanDbText(save.garage.pilotName, 40) : undefined;
    getOrCreateUser(db, key, pilotName);

    persistNow(db);
    return { ok: true, save };
}

function deletePlayerSave(userId) {
    const db = loadDatabase();
    const existed = Boolean(db.saves[String(userId)]);
    delete db.saves[String(userId)];
    if (existed) persistNow(db);
    return existed;
}

module.exports = {
    DB_FILE,
    getUser,
    recordRaceResult,
    getLeaderboard,
    getCars,
    getPlayerSave,
    putPlayerSave,
    deletePlayerSave
};
