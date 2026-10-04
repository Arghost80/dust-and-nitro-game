// ===== BASE DE DATOS Y PERSISTENCIA (SQLITE / JSON ROBUSTO) =====
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'game_database.json');

// Estructura por defecto
const defaultData = {
    users: {},
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

function loadDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error cargando database:', e);
        return defaultData;
    }
}

function saveDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error guardando database:', e);
    }
}

function getUser(userId, username) {
    const db = loadDatabase();
    if (!db.users[userId]) {
        db.users[userId] = {
            id: userId,
            username: username || 'Racer_' + userId,
            coins: 200,
            selectedCar: 'v8_interceptor',
            unlockedCars: ['v8_interceptor'],
            stats: { races: 0, wins: 0, bestTime: null },
            createdAt: new Date().toISOString()
        };
        saveDatabase(db);
    }
    return db.users[userId];
}

function recordRaceResult(userId, username, trackName, time) {
    const db = loadDatabase();
    const user = getUser(userId, username);
    user.stats.races++;
    user.coins += 150; // Recompensa por carrera

    if (!user.stats.bestTime || time < user.stats.bestTime) {
        user.stats.bestTime = time;
    }

    // Añadir a leaderboard
    db.leaderboard.push({
        username: user.username,
        track: trackName,
        time: parseFloat(time.toFixed(2)),
        car: user.selectedCar
    });

    db.leaderboard.sort((a, b) => a.time - b.time);
    if (db.leaderboard.length > 20) db.leaderboard = db.leaderboard.slice(0, 20);

    saveDatabase(db);
    return { user, coinsEarned: 150 };
}

function getLeaderboard() {
    const db = loadDatabase();
    return db.leaderboard;
}

function getCars() {
    const db = loadDatabase();
    return db.carsCatalog;
}

module.exports = {
    getUser,
    recordRaceResult,
    getLeaderboard,
    getCars
};
