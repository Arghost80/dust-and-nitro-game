// ===== TEST v101: Guardado en servidor + seguridad básica =====
// Arranca server.js en un puerto libre con una BD temporal y verifica:
//  1) PUT/GET /api/save/:id            2) Conflicto: gana el guardado más nuevo
//  3) DELETE /api/save/:id             4) /api/race/result no acuña monedas
//  5) gzip en JS                       6) Caché inmutable en assets ?v=
//  7) updatedAt futuro limitado       8) archivos internos no se sirven
// Uso: node test_cloud_save.js
const { spawn } = require('child_process');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 34671;
const tmpDb = path.join(os.tmpdir(), `apex_test_db_${Date.now()}.json`);
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
        env: { ...process.env, PORT: String(PORT), DB_FILE: tmpDb, BOT_TOKEN: '' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverLog = '';
    proc.stdout.on('data', d => serverLog += d);
    proc.stderr.on('data', d => serverLog += d);

    try {
        await waitForServer(proc);
        const id = 'usr_test_v100';
        const json = { 'Content-Type': 'application/json' };

        // 1) Sin guardado previo -> 404
        let r = await fetch(`${base}/api/save/${id}`);
        check(r.status === 404, 'GET sin partida previa devuelve 404');

        // 2) Subir partida y recuperarla
        const saveV1 = { updatedAt: 1000000, garage: { userId: id, credits: 777, gems: 0, garage: [{ instanceId: 'x' }] }, story: { stars: { rookie_ring: 3 } }, extra: { dustrac_lang: 'es' } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(saveV1) });
        check(r.status === 200, 'PUT guarda la partida');
        r = await fetch(`${base}/api/save/${id}`);
        const got = await r.json();
        check(r.status === 200 && got.save.garage.credits === 777 && got.save.story.stars.rookie_ring === 3 && got.save.extra.dustrac_lang === 'es',
            'GET recupera garaje + historia + ajustes tal cual');

        // 3) Un dispositivo antiguo NO puede pisar una partida más nueva
        const older = { ...saveV1, updatedAt: 500, garage: { ...saveV1.garage, credits: 1 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(older) });
        check(r.status === 409, 'PUT con updatedAt antiguo es rechazado (409)');
        r = await fetch(`${base}/api/save/${id}`);
        const still = await r.json();
        check(still.save.garage.credits === 777, 'Tras el conflicto sigue ganando la partida más nueva');

        // 4) Una partida más nueva sí actualiza
        const saveV2 = { ...saveV1, updatedAt: 2000000, garage: { ...saveV1.garage, credits: 900 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(saveV2) });
        check(r.status === 200, 'PUT más reciente sí se acepta');

        // 5) Un updatedAt absurdamente futuro queda limitado para no bloquear
        // sincronizaciones legítimas posteriores.
        const futureSave = { ...saveV2, updatedAt: 9999999999999, garage: { ...saveV2.garage, credits: 901 } };
        r = await fetch(`${base}/api/save/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(futureSave) });
        check(r.status === 200, 'PUT con updatedAt futuro se acepta con límite');
        r = await fetch(`${base}/api/save/${id}`);
        const futureGot = await r.json();
        check(futureGot.save.garage.credits === 901 && futureGot.save.updatedAt <= Date.now() + 61000,
            'El updatedAt futuro se limita a un margen razonable');

        // 6) /api/race/result: registra ranking sin perder stats, pero no acuña
        // monedas porque todavía no existe ledger autoritativo en servidor.
        const raceUserId = 'usr_test_race_v101';
        r = await fetch(`${base}/api/race/result`, {
            method: 'POST', headers: json,
            body: JSON.stringify({ userId: raceUserId, username: 'PilotoTest', trackId: 'rookie_ring', trackName: 'Rookie Ring', time: 55.5, car: 'Apex Cadet 1.0' })
        });
        const race = await r.json();
        check(r.status === 200 && race.recorded === true && race.coinsEarned === 0 && race.stats.races === 1 && race.stats.bestTime === 55.5,
            'El resultado de carrera suma stats/mejor tiempo sin acuñar monedas');
        r = await fetch(`${base}/api/leaderboard`);
        const lb = await r.json();
        check(lb.some(e => e.username === 'PilotoTest' && e.car === 'Apex Cadet 1.0'), 'El ranking global recoge la carrera y el coche');

        // 7) gzip + caché versionada
        const gz = await rawGet('/game_hub.js?v=101', { 'Accept-Encoding': 'gzip' });
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
        r = await fetch(`${base}/api/save/${id}`, { method: 'DELETE' });
        check(r.status === 200, 'DELETE borra la partida');
        r = await fetch(`${base}/api/save/${id}`);
        check(r.status === 404, 'Tras DELETE la partida ya no existe');

        // 10) Persistencia real en disco
        const onDisk = JSON.parse(fs.readFileSync(tmpDb, 'utf8'));
        check(onDisk.users && onDisk.users[raceUserId] && onDisk.users[raceUserId].stats.races === 1 && onDisk.users[raceUserId].coins === 200,
            'La BD temporal en disco contiene stats sin acuñar monedas (persistencia real)');

        console.log('\n========================================');
        console.log('SUCCESS! CLOUD SAVE v101 TESTS PASSED');
        console.log('========================================');
    } catch (err) {
        console.error('\n' + err.message);
        console.error('--- Log del servidor ---\n' + serverLog.slice(-2000));
        process.exitCode = 1;
    } finally {
        proc.kill('SIGTERM');
        try { fs.unlinkSync(tmpDb); } catch (e) {}
        try { fs.unlinkSync(tmpDb + '.tmp'); } catch (e) {}
    }
})();
