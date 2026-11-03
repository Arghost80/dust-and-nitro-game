// ===== TEST v105: dotación privada de cuentas de equipo =====
// TEAM_BOOTSTRAP_TELEGRAM_IDS contiene aquí solo IDs ficticios. La dotación
// debe aplicarse en servidor una sola vez por cuenta: completa el catálogo,
// maximiza los coches presentes en ese momento y sube el saldo hasta
// 100.000 $CR sin borrar progreso ni recargar después de gastar.
// Uso: node test_team_bootstrap.js
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

const BOT_TOKEN = '123456:TEST_TOKEN_FOR_TEAM_BOOTSTRAP';
const TEAM_A = { id: 111111111, first_name: 'Equipo A', username: 'equipo_a' };
const TEAM_B = { id: 222222222, first_name: 'Equipo B', username: 'equipo_b' };
const PLAYER = { id: 333333333, first_name: 'Jugador', username: 'jugador_normal' };
const MAX_BRANCHES = ['speed_power', 'braking', 'handling_grip', 'accel_traction', 'aero_lightness'];

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 900)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function makeTelegramInitData(user) {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'test-team-query',
        user: JSON.stringify(user)
    });
    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
    return params.toString();
}

async function requestJson(base, requestPath, options = {}) {
    const response = await fetch(base + requestPath, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { status: response.status, data, text };
}

async function waitForServer(proc, base) {
    for (let i = 0; i < 60; i++) {
        try {
            const response = await fetch(base + '/healthz');
            if (response.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor de equipo murió al arrancar');
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Timeout esperando al servidor de equipo');
}

async function startServer(port, dbFile, teamIds) {
    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            DB_FILE: dbFile,
            NODE_ENV: 'test',
            BOT_TOKEN,
            // Puerto local cerrado: el bot embebido falla cerrado y no toca
            // la red real durante esta prueba; la auth HMAC sigue activa.
            TELEGRAM_BOT_API_BASE_URL: 'http://127.0.0.1:65534',
            ALLOW_INSECURE_DEV_AUTH: 'false',
            ENABLE_LEGACY_WAGER_API: 'false',
            RENDER_EXTERNAL_URL: '',
            TEAM_BOOTSTRAP_TELEGRAM_IDS: teamIds,
            TEAM_ACCOUNT_IDS: '',
            DB_BACKUP_ENABLED: 'false'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let log = '';
    proc.stdout.on('data', chunk => { log += chunk; });
    proc.stderr.on('data', chunk => { log += chunk; });
    const base = `http://127.0.0.1:${port}`;
    await waitForServer(proc, base);
    return { proc, base, getLog: () => log };
}

async function stopServer(server) {
    if (!server || server.proc.exitCode !== null) return;
    server.proc.kill('SIGTERM');
    await Promise.race([
        new Promise(resolve => server.proc.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 1800))
    ]);
    if (server.proc.exitCode === null) server.proc.kill('SIGKILL');
}

function removeIfExists(file) {
    try { fs.unlinkSync(file); } catch (e) {}
    try { fs.unlinkSync(`${file}-wal`); } catch (e) {}
    try { fs.unlinkSync(`${file}-shm`); } catch (e) {}
}

function headersFor(user) {
    return { 'X-Telegram-Init-Data': makeTelegramInitData(user) };
}

function assertFullyMaxed(cars, message) {
    check(cars.every(car => car.level === 50
        && MAX_BRANCHES.every(branch => Number(car.parts && car.parts[branch]) === 5)
        && ['ecu', 'tires', 'brakes', 'turbo', 'chassis'].every(part => Number(car.parts && car.parts[part]) === 5)
        && Array.isArray(car.claimedMilestones) && car.claimedMilestones.length === 5
        && Number(car.energy) === Number(car.maxEnergy)), message, cars.slice(0, 2));
}

(async () => {
    const stamp = Date.now();
    const dbFile = path.join(os.tmpdir(), `apex_team_bootstrap_db_${stamp}.sqlite`);
    const portA = 35900 + Math.floor(Math.random() * 250);
    const portB = portA + 300;
    let phaseA = null;
    let phaseB = null;

    try {
        // Fase A: crear una cuenta normal antes de configurar el equipo.
        phaseA = await startServer(portA, dbFile, '');
        let result = await requestJson(phaseA.base, `/api/economy/state?userId=${TEAM_A.id}`, { headers: headersFor(TEAM_A) });
        check(result.status === 200 && result.data.economy.garage.credits === 100
            && result.data.economy.garage.garage.length === 1,
            'sin allowlist, la futura cuenta de equipo empieza como una cuenta normal', result.data.economy.garage);
        await stopServer(phaseA);
        phaseA = null;

        // Sembrar progreso preexistente: más de 100.000 $CR y un coche c_01
        // propio. La dotación debe conservar ambos y no duplicar ese modelo.
        const seedDb = new SqliteDatabase(dbFile);
        try {
            seedDb.pragma('busy_timeout = 5000');
            const row = seedDb.prepare('SELECT garage_json FROM economy_profiles WHERE user_id = ?').get(String(TEAM_A.id));
            const garage = JSON.parse(row.garage_json);
            garage.credits = 150000;
            const starter = garage.garage[0];
            garage.garage.push({
                ...starter,
                instanceId: 'existing_team_car_1',
                modelId: 'c_01',
                name: 'Monza Hatch 1.4',
                rarity: 'common',
                isNft: false,
                visualId: 23,
                stats: { potencia: 1, velocidad: 2, aceleracion: 1, agarre: 1, frenada: 1, manejo: 1, turbo: 1, downforce: 1, traccion: 1, ligereza: 1 },
                level: 7,
                xp: 12,
                xpNeeded: 1750,
                energy: 1,
                maxEnergy: 6,
                parts: { ecu: 1, tires: 1, brakes: 1, turbo: 1, chassis: 1, speed_power: 1, braking: 1, handling_grip: 1, accel_traction: 1, aero_lightness: 1 },
                colorName: 'Rosso Corsa',
                colorHex: '#e53935',
                tint: 0xe53935,
                sprite: 'car_red',
                obtainedAt: Date.now() - 1000
            });
            seedDb.prepare('UPDATE economy_profiles SET garage_json = ?, updated_at = ? WHERE user_id = ?')
                .run(JSON.stringify(garage), new Date().toISOString(), String(TEAM_A.id));
        } finally {
            seedDb.close();
        }

        // Fase B: allowlist con las dos cuentas ficticias de equipo.
        phaseB = await startServer(portB, dbFile, `${TEAM_A.id},${TEAM_B.id}`);
        const { base } = phaseB;

        result = await requestJson(base, '/api/config');
        check(result.status === 200 && !JSON.stringify(result.data).includes(String(TEAM_A.id))
            && !JSON.stringify(result.data).includes(String(TEAM_B.id)),
            '/api/config no filtra los IDs de la allowlist privada');

        result = await requestJson(base, `/api/economy/state?userId=${TEAM_A.id}`, { headers: headersFor(TEAM_A) });
        check(result.status === 200 && result.data.economy, 'la cuenta A recupera su perfil', result.data);
        const garageA = result.data.economy.garage;
        check(garageA.credits === 150000, 'si ya supera 100.000 $CR, la dotación no reduce el saldo', garageA.credits);
        check(garageA.teamBootstrapGrant && garageA.teamBootstrapGrant.version === 1
            && garageA.teamBootstrapGrant.creditsGranted === 0
            && garageA.teamBootstrapGrant.modelsAdded.length === 88,
            'la cuenta existente recibe solo los 88 modelos que le faltaban', garageA.teamBootstrapGrant);
        check(garageA.garage.length === 90 && new Set(garageA.garage.map(car => car.modelId)).size === 90
            && new Set(garageA.garage.map(car => car.instanceId)).size === 90,
            'la cuenta A queda con uno de cada uno de los 90 modelos y sin instancias duplicadas', {
                cars: garageA.garage.length,
                models: new Set(garageA.garage.map(car => car.modelId)).size
            });
        const existingCar = garageA.garage.find(car => car.instanceId === 'existing_team_car_1');
        check(existingCar && existingCar.colorName === 'Rosso Corsa' && existingCar.level === 50,
            'el coche preexistente se conserva y se maximiza, sin sustituirlo', existingCar);
        assertFullyMaxed(garageA.garage, 'los 90 coches de A quedan a nivel 50, ramas 5/5 e hitos completos');
        const markerA = garageA.teamBootstrapGrant.appliedAt;

        result = await requestJson(base, `/api/nft/cars?userId=${TEAM_A.id}`, { headers: headersFor(TEAM_A) });
        check(result.status === 200 && result.data.entries.length === 89
            && new Set(result.data.entries.map(entry => entry.registry.serial)).size === 89,
            'los 89 coches elegibles de A reciben serie global única; el starter no', result.data.entries.slice(0, 2));
        const serialsA = new Set(result.data.entries.map(entry => entry.registry.serial));

        result = await requestJson(base, `/api/economy/state?userId=${TEAM_A.id}`, { headers: headersFor(TEAM_A) });
        check(result.data.economy.garage.credits === 150000
            && result.data.economy.garage.garage.length === 90
            && result.data.economy.garage.teamBootstrapGrant.appliedAt === markerA,
            'volver a entrar no reaplica la dotación de A');

        result = await requestJson(base, `/api/economy/state?userId=${TEAM_B.id}`, { headers: headersFor(TEAM_B) });
        const garageB = result.data.economy.garage;
        check(result.status === 200 && garageB.credits === 100000
            && garageB.teamBootstrapGrant.creditsGranted === 99900
            && garageB.teamBootstrapGrant.modelsAdded.length === 89,
            'una cuenta de equipo nueva empieza con el catálogo completo y 100.000 $CR', garageB.teamBootstrapGrant);
        check(garageB.garage.length === 90 && new Set(garageB.garage.map(car => car.modelId)).size === 90,
            'la cuenta B también recibe un coche de cada modelo');
        assertFullyMaxed(garageB.garage, 'los 90 coches de B quedan al máximo');

        result = await requestJson(base, `/api/nft/cars?userId=${TEAM_B.id}`, { headers: headersFor(TEAM_B) });
        check(result.status === 200 && result.data.entries.length === 89, 'B registra sus 89 coches elegibles');
        check(result.data.entries.every(entry => !serialsA.has(entry.registry.serial)),
            'las series globales de A y B no se solapan');

        // La dotación es finita: gastar 25.000 en una caja no recarga a
        // 100.000 ni maximiza el coche obtenido después.
        result = await requestJson(base, '/api/economy/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headersFor(TEAM_B) },
            body: JSON.stringify({
                userId: String(TEAM_B.id),
                action: 'open_crate',
                args: { crateKey: 'gold' },
                idempotencyKey: 'test-team-b-open-gold-1'
            })
        });
        check(result.status === 200 && result.data.result && result.data.result.car
            && result.data.economy.garage.credits === 75000
            && result.data.result.car.level === 1,
            'B puede gastar su dotación en una caja normal', result.data);
        const laterCarId = result.data.result.car.instanceId;
        result = await requestJson(base, `/api/economy/state?userId=${TEAM_B.id}`, { headers: headersFor(TEAM_B) });
        const laterGarage = result.data.economy.garage;
        const laterCar = laterGarage.garage.find(car => car.instanceId === laterCarId);
        check(laterGarage.credits === 75000 && laterCar && laterCar.level === 1,
            'la dotación no se recarga tras gastar ni maximiza coches posteriores', {
                credits: laterGarage.credits,
                laterLevel: laterCar && laterCar.level
            });

        // Una cuenta normal no recibe nada y nadie puede invocar la acción
        // interna desde la API pública de economía.
        result = await requestJson(base, `/api/economy/state?userId=${PLAYER.id}`, { headers: headersFor(PLAYER) });
        check(result.status === 200 && result.data.economy.garage.credits === 100
            && result.data.economy.garage.garage.length === 1
            && !result.data.economy.garage.teamBootstrapGrant,
            'una cuenta no incluida en la allowlist sigue empezando normal', result.data.economy.garage);
        for (const user of [TEAM_A, PLAYER]) {
            result = await requestJson(base, '/api/economy/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headersFor(user) },
                body: JSON.stringify({
                    userId: String(user.id),
                    action: 'grant_team_bootstrap',
                    args: {},
                    idempotencyKey: `test-public-team-grant-${user.id}`
                })
            });
            check(result.status === 422 && result.data.error === 'invalid_economy_action',
                `la acción interna no es invocable desde la API pública (${user.id})`, result.data);
        }

        await stopServer(phaseB);
        phaseB = null;
        const diskDb = new SqliteDatabase(dbFile, { readonly: true });
        try {
            const grants = diskDb.prepare("SELECT user_id, idempotency_key, delta_credits FROM economy_ledger WHERE action = 'team_bootstrap_grant' ORDER BY user_id").all();
            check(grants.length === 2 && grants.every(grant => grant.idempotency_key === `team-bootstrap-v1:${grant.user_id}`),
                'SQLite conserva exactamente una dotación auditada por cuenta de equipo', grants);
            const audit = diskDb.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE event = 'TEAM_BOOTSTRAP_GRANT_APPLIED'").get();
            check(Number(audit.count) === 2, 'cada dotación deja evento de auditoría', audit);
        } finally {
            diskDb.close();
        }

        console.log('✅ TEST TEAM BOOTSTRAP v105 SUPERADO');
    } catch (error) {
        console.error(error.stack || error.message);
        if (phaseA) console.error('--- Log fase A (cola) ---\n' + phaseA.getLog().slice(-3000));
        if (phaseB) console.error('--- Log fase B (cola) ---\n' + phaseB.getLog().slice(-5000));
        process.exitCode = 1;
    } finally {
        await stopServer(phaseA);
        await stopServer(phaseB);
        removeIfExists(dbFile);
    }
})();
