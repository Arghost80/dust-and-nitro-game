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
        fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
        fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
        console.error('Error guardando database:', e.message);
    }
}

function saveDatabase(data) {
    cache = data;
    persistNow(data);
}

function getOrCreateUser(db, userId, username) {
    const key = String(userId);
    if (!db.users[key]) {
        db.users[key] = {
            id: userId,
            username: username || 'Racer_' + userId,
            coins: 200,
            selectedCar: 'v8_interceptor',
            unlockedCars: ['v8_interceptor'],
            stats: { races: 0, wins: 0, bestTime: null },
            createdAt: new Date().toISOString()
        };
    } else if (username && db.users[key].username !== username) {
        db.users[key].username = username;
    }
    return db.users[key];
}

function getUser(userId, username) {
    const db = loadDatabase();
    const existed = Boolean(db.users[String(userId)]);
    const user = getOrCreateUser(db, userId, username);
    if (!existed) persistNow(db);
    return user;
}

function recordRaceResult(userId, username, trackName, time, carName) {
    const db = loadDatabase();
    // CORREGIDO v100: antes se mutaba el usuario de OTRA copia cargada por getUser()
    // y las estadísticas/monedas se perdían al guardar esta copia.
    const user = getOrCreateUser(db, userId, username);
    const cleanTime = Number(time);

    user.stats.races++;
    user.coins += 150; // Recompensa por carrera (economía clásica del bot)

    if (Number.isFinite(cleanTime) && cleanTime > 0) {
        if (!user.stats.bestTime || cleanTime < user.stats.bestTime) {
            user.stats.bestTime = cleanTime;
        }
        db.leaderboard.push({
            username: user.username,
            track: trackName,
            time: parseFloat(cleanTime.toFixed(2)),
            car: carName || user.selectedCar
        });
        db.leaderboard.sort((a, b) => a.time - b.time);
        if (db.leaderboard.length > 20) db.leaderboard = db.leaderboard.slice(0, 20);
    }

    persistNow(db);
    return { user, coinsEarned: 150 };
}

function getLeaderboard() {
    return loadDatabase().leaderboard;
}

function getCars() {
    return loadDatabase().carsCatalog;
}

// ===== GUARDADO COMPLETO DEL JUGADOR (cloud save v100) =====
// Un "save" es el paquete que envía cloud_save.js:
// { updatedAt, garage, story, extra }  -> el servidor añade serverSavedAt.
function getPlayerSave(userId) {
    const db = loadDatabase();
    return db.saves[String(userId)] || null;
}

// Devuelve { ok:true, save } o { ok:false, conflict:true, save } si el servidor
// ya tiene una versión MÁS NUEVA (otro dispositivo jugó después): gana la más reciente.
function putPlayerSave(userId, incoming) {
    const db = loadDatabase();
    const key = String(userId);
    const existing = db.saves[key] || null;
    const incomingTs = Number(incoming && incoming.updatedAt) || 0;

    if (existing && Number(existing.updatedAt || 0) > incomingTs) {
        return { ok: false, conflict: true, save: existing };
    }

    const save = {
        userId: key,
        updatedAt: incomingTs || Date.now(),
        garage: (incoming && typeof incoming.garage === 'object') ? incoming.garage : null,
        story: (incoming && typeof incoming.story === 'object') ? incoming.story : null,
        extra: (incoming && typeof incoming.extra === 'object' && !Array.isArray(incoming.extra)) ? incoming.extra : {},
        serverSavedAt: new Date().toISOString()
    };
    db.saves[key] = save;

    // Mantener también el perfil básico del bot al día (nombre de piloto)
    const pilotName = save.garage && typeof save.garage.pilotName === 'string' ? save.garage.pilotName : undefined;
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
