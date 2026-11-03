// ===== TEST v104: Guardado SQLite + economía sellada + credencial =====
// Arranca server.js en un puerto libre con una BD temporal y verifica:
//  1) PUT/GET /api/save/:id            2) Conflicto: gana el guardado más nuevo
//  3) DELETE /api/save/:id             4) sesión + /api/race/result sin monedas
//  5) gzip en JS                       6) Caché inmutable en assets ?v=
//  7) updatedAt futuro limitado       8) archivos internos no se sirven
//  9) el ID usr_... por sí solo ya no abre la partida de otro dispositivo
// Uso: node test_cloud_save.js
const { spawn } = require('child_process');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 34671;
const tmpDb = path.join(os.tmpdir(), `apex_test_db_${Date.now()}.sqlite`);
const base = `http://127.0.0.1:${PORT}`;

function rawGet(urlPath, headers) {
    return new Promise((resolve, reject) => {
        http.get(base + urlPath, { headers: headers || {} }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        }).on('error', reject);
    });
}

async function waitForServer(proc) {
    for (let i = 0; i < 50; i++) {
        try {
            const r = await fetch(base + '/api/leaderboard');
            if (r.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor murió al arrancar');
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('Timeout esperando al servidor');
}

function check(cond, msg) {
    if (!cond) throw new Error('FALLO: ' + msg);
    console.log('✓ ' + msg);
}

(async () => {
    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: String(PORT), DB_FILE: tmpDb, BOT_TOKEN: '', NODE_ENV: 'test', RACE_SESSION_MIN_AGE_MS: '0' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverLog = '';
    proc.stdout.on('data', d => serverLog += d);
    proc.stderr.on('data', d => serverLog += d);

    try {
        await waitForServer(proc);
        const id = 'usr_test_v100';
        const deviceSecret = 'test-device-secret-v102-0123456789abcdef';
        const json = { 'Content-Type': 'application/json', 'X-Device-Secret': deviceSecret };

        // 1) Conocer solo el ID usr_... ya no basta; con la credencial del
        // dispositivo, una cuenta sin partida previa devuelve 404.
        let r = await fetch(`${base}/api/save/${id}`);
        check(r.status === 401, 'GET con solo el ID de dispositivo devuelve 401');
        r = await fetch(`${base}/api/save/${id}`, { headers: json });
        check(r.status === 404, 'GET autorizado sin partida previa devuelve 404');

        // 2) Subir partida y recuperarla
        const saveV1 = { updatedAt: 1000000, garage: { userId: id, credits: 777, gems: 0, garage: [{ instanceId: 'x' }] }, story: { stars: { rookie_ring: 3 } }, extra: { dustrac_lang: 'es' } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(saveV1) });
        check(r.status === 200, 'PUT guarda la partida');
        r = await fetch(`${base}/api/save/${id}`, { headers: json });
        const got = await r.json();
        check(r.status === 200 && got.save.story.stars.rookie_ring === 3 && got.save.extra.dustrac_lang === 'es',
            'GET recupera historia + ajustes tal cual');
        check(got.save.garage.credits === 100 && got.save.garage.gems === 0
            && Array.isArray(got.save.garage.garage) && got.save.garage.garage.length === 1
            && !got.save.garage.garage.some(car => car.instanceId === 'x'),
            'El garaje económico subido por el cliente es sustituido por el perfil sellado inicial');
        r = await fetch(`${base}/api/save/${id}`, { headers: { 'X-Device-Secret': 'wrong-device-secret-v102-0123456789abcdef' } });
        check(r.status === 401, 'Una credencial de dispositivo incorrecta no abre la partida');

        // 3) Un dispositivo antiguo NO puede pisar una partida más nueva
        const older = { ...saveV1, updatedAt: 500, garage: { ...saveV1.garage, credits: 1 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(older) });
        check(r.status === 409, 'PUT con updatedAt antiguo es rechazado (409)');
        r = await fetch(`${base}/api/save/${id}`, { headers: json });
        const still = await r.json();
        check(still.save.garage.credits === 100 && still.save.story.stars.rookie_ring === 3,
            'Tras el conflicto siguen ganando la historia más nueva y el garaje sellado');

        // 4) Una partida más nueva sí actualiza
        const saveV2 = { ...saveV1, updatedAt: 2000000, garage: { ...saveV1.garage, credits: 900 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(saveV2) });
        check(r.status === 200, 'PUT más reciente sí se acepta');

        // 5) Un updatedAt absurdamente futuro queda limitado para no bloquear
        // sincronizaciones legítimas posteriores.
        const futureSave = { ...saveV2, updatedAt: 9999999999999, garage: { ...saveV2.garage, credits: 901 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(futureSave) });
        check(r.status === 200, 'PUT con updatedAt futuro se acepta con límite');
        r = await fetch(`${base}/api/save/${id}`, { headers: json });
        const futureGot = await r.json();
        check(futureGot.save.garage.credits === 100 && futureGot.save.updatedAt <= Date.now() + 61000,
            'El updatedAt futuro se limita y el saldo propuesto por cliente sigue ignorado');

        // 6) /api/race/result: registra ranking y acredita solo la recompensa
        // fija calculada por el motor económico del servidor (último puesto: 200).
        const raceUserId = 'usr_test_race_v101';
        r = await fetch(`${base}/api/race/session`, {
            method: 'POST', headers: json,
            body: JSON.stringify({ userId: raceUserId, trackId: 'rookie_ring', car: 'Apex Cadet 1.0' })
        });
        const raceSession = await r.json();
        check(r.status === 200 && raceSession.ok === true && typeof raceSession.sessionId === 'string',
            'La sesión de carrera se registra antes de enviar el resultado');
        r = await fetch(`${base}/api/race/result`, {
            method: 'POST', headers: json,
            body: JSON.stringify({ userId: raceUserId, sessionId: raceSession.sessionId, username: 'PilotoTest', trackId: 'rookie_ring', trackName: 'Rookie Ring', time: 55.5, car: 'Apex Cadet 1.0', rank: 6, topSpeed: 300, drifts: 1, nitrosUsed: 1 })
        });
        const race = await r.json();
        check(r.status === 200 && race.recorded === true && race.stats.races === 1 && race.stats.bestTime === 55.5
            && race.economyReward && race.economyReward.success === true && race.economyReward.crReward === 200
            && race.economyReward.nitrosUsed === 1 && race.economy && race.economy.garage.credits === 300,
            'El resultado suma stats y acredita solo la recompensa fija de servidor');
        r = await fetch(`${base}/api/leaderboard`);
        const lb = await r.json();
        check(lb.some(e => e.username === 'PilotoTest' && e.car === 'Apex Cadet 1.0'), 'El ranking global recoge la carrera y el coche');

        // 7) gzip + caché versionada
        const gz = await rawGet('/game_hub.js?v=103', { 'Accept-Encoding': 'gzip' });
        check(gz.status === 200 && gz.headers['content-encoding'] === 'gzip', 'Los JS se sirven con gzip');
        const plain = zlib.gunzipSync(gz.body).toString('utf8');
        check(plain.includes('renderHubHeader'), 'El JS descomprimido es válido');
        check(String(gz.headers['cache-control']).includes('immutable'), 'Los assets ?v= llevan caché inmutable');
        const html = await rawGet('/', {});
        check(String(html.headers['cache-control']).includes('no-cache'), 'El HTML nunca se cachea (siempre entra la última versión)');

        // 8) La lista blanca estática no expone BD ni código del servidor
        const deniedDb = await rawGet('/game_database.json', {});
        const deniedServer = await rawGet('/server.js', {});
        check(deniedDb.status === 404 && deniedServer.status === 404, 'La BD y el código del servidor no se sirven por HTTP');

        // 9) DELETE (restablecer progreso)
        r = await fetch(`${base}/api/save/${id}`, { method: 'DELETE', headers: json });
        check(r.status === 200, 'DELETE borra la partida');
        r = await fetch(`${base}/api/save/${id}`, { headers: json });
        check(r.status === 404, 'Tras DELETE la partida ya no existe');

        // 10) Persistencia real en disco (SQLite)
        const SqliteDatabase = require('better-sqlite3');
        const diskDb = new SqliteDatabase(tmpDb, { readonly: true });
        try {
            const raceUserRow = diskDb.prepare('SELECT data_json FROM users WHERE user_id = ?').get(raceUserId);
            const raceUser = raceUserRow ? JSON.parse(raceUserRow.data_json) : null;
            const raceProfileRow = diskDb.prepare('SELECT garage_json FROM economy_profiles WHERE user_id = ?').get(raceUserId);
            const raceProfile = raceProfileRow ? JSON.parse(raceProfileRow.garage_json) : null;
            const credentialRow = diskDb.prepare('SELECT hash FROM device_credentials WHERE user_id = ?').get(id);
            check(raceUser && raceUser.stats.races === 1,
                'SQLite contiene las estadísticas de carrera (persistencia real)');
            check(raceProfile && raceProfile.credits === 300 && raceProfile.nitros === 1,
                'SQLite contiene la recompensa fija y descuenta el nitro usado');
            check(credentialRow && /^[a-f0-9]{64}$/.test(credentialRow.hash),
                'SQLite conserva solo el hash de la credencial de dispositivo');
        } finally {
            diskDb.close();
        }
        const rawDiskFiles = [tmpDb, tmpDb + '-wal', tmpDb + '-shm']
            .filter(file => fs.existsSync(file))
            .map(file => fs.readFileSync(file).toString('latin1')).join('');
        check(!rawDiskFiles.includes(deviceSecret), 'El secreto de dispositivo nunca aparece en claro en disco');

        console.log('\n========================================');
        console.log('SUCCESS! CLOUD SAVE v104 TESTS PASSED');
        console.log('========================================');
    } catch (err) {
        console.error('\n' + err.message);
        console.error('--- Log del servidor ---\n' + serverLog.slice(-2000));
        process.exitCode = 1;
    } finally {
        proc.kill('SIGTERM');
        try { fs.unlinkSync(tmpDb); } catch (e) {}
        try { fs.unlinkSync(tmpDb + '-wal'); } catch (e) {}
        try { fs.unlinkSync(tmpDb + '-shm'); } catch (e) {}
    }
})();
