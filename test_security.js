// ===== TEST v101: regresiones HTTP de seguridad =====
// Arranca servidores aislados con bases de datos temporales y verifica que
// los fallos de la auditoría v100 no vuelven: estáticos, auth Telegram,
// endpoints legacy, anuncios, carreras, multijugador y guardados.
// Uso: node test_security.js
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const BOT_TOKEN = '123456:TEST_TOKEN_FOR_HMAC_ONLY';
const ADMIN_TOKEN = 'test-admin-token-v101';
const ADS_SECRET = 'test-ads-secret-v101';

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 700)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function makeTelegramInitData(user) {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'test-query-id',
        user: JSON.stringify(user)
    });
    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
}

function rawRequest(port, { method = 'GET', path: requestPath = '/', headers = {}, body = '' } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port, method, path: requestPath, headers }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function requestJson(base, requestPath, options = {}) {
    const response = await fetch(base + requestPath, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { status: response.status, headers: response.headers, data, text };
}

function jsonOptions(body, headers = {}) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    };
}

async function waitForServer(proc, base) {
    for (let i = 0; i < 50; i++) {
        try {
            const response = await fetch(base + '/healthz');
            if (response.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor de seguridad murió al arrancar');
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Timeout esperando al servidor de seguridad');
}

async function startServer(port, dbFile, extraEnv = {}) {
    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            DB_FILE: dbFile,
            NODE_ENV: 'test',
            BOT_TOKEN,
            ADMIN_AUDIT_TOKEN: ADMIN_TOKEN,
            ADSGRAM_WEBHOOK_SECRET: ADS_SECRET,
            ALLOW_INSECURE_DEV_AUTH: 'false',
            ENABLE_LEGACY_WAGER_API: 'false',
            ALLOWED_ORIGINS: '',
            RENDER_EXTERNAL_URL: '',
            ...extraEnv
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let log = '';
    proc.stdout.on('data', data => { log += data; });
    proc.stderr.on('data', data => { log += data; });
    const base = `http://127.0.0.1:${port}`;
    await waitForServer(proc, base);
    return { proc, base, getLog: () => log };
}

async function stopServer(server) {
    if (!server || server.proc.exitCode !== null) return;
    server.proc.kill('SIGTERM');
    await Promise.race([
        new Promise(resolve => server.proc.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    if (server.proc.exitCode === null) server.proc.kill('SIGKILL');
}

function removeIfExists(file) {
    try { fs.unlinkSync(file); } catch (e) {}
}

(async () => {
    const stamp = Date.now();
    const dbFile = path.join(os.tmpdir(), `apex_security_db_${stamp}.json`);
    const corruptDbFile = path.join(os.tmpdir(), `apex_security_corrupt_${stamp}.json`);
    let server = null;
    let fallbackServer = null;

    try {
        server = await startServer(34672, dbFile);
        const { base } = server;

        // Salud y cabeceras
        let result = await requestJson(base, '/healthz');
        check(result.status === 200 && result.data.ok === true && result.data.version === '1.0.1', '/healthz responde sin exponer datos internos', result.data);
        check(String(result.headers.get('cache-control') || '').includes('no-store'), '/healthz usa Cache-Control: no-store');
        const head = await rawRequest(34672, { method: 'HEAD', path: '/healthz' });
        check(head.status === 200 && head.body === '', 'HEAD /healthz funciona para el health check');
        const home = await rawRequest(34672, { path: '/' });
        check(home.headers['x-content-type-options'] === 'nosniff' && home.headers['content-security-policy-report-only'], 'La portada incluye cabeceras de seguridad');
        check(home.headers['access-control-allow-origin'] !== '*', 'CORS no usa comodín *');

        // Lista blanca estática y traversal
        for (const deniedPath of [
            '/server.js', '/database.js', '/bot.js', '/game_database.json',
            '/test_security.js', '/AUDITORIA_SEGURIDAD_MOVIL_v100.md',
            '/assets/dustrac/levels/triangle.trk', '/..%2fserver.js',
            '/%2e%2e/server.js', '/assets/../server.js', '/assets/%2e%2e/database.js'
        ]) {
            const denied = await rawRequest(34672, { path: deniedPath });
            check(denied.status === 404, `Estático denegado: ${deniedPath}`, { status: denied.status });
        }
        const favicon = await rawRequest(34672, { path: '/favicon.ico' });
        check(favicon.status === 200 && favicon.body.includes('<svg'), '/favicon.ico sirve el SVG local permitido');
        const staticPost = await rawRequest(34672, { method: 'POST', path: '/index.html' });
        check(staticPost.status === 405, 'Los estáticos solo aceptan GET/HEAD');

        // CORS y 404 de API
        const evilOptions = await rawRequest(34672, {
            method: 'OPTIONS',
            path: '/api/race/result',
            headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' }
        });
        check(evilOptions.status === 403 && evilOptions.headers['access-control-allow-origin'] !== '*', 'CORS rechaza orígenes externos no configurados');
        result = await requestJson(base, '/api/no-existe-v101');
        check(result.status === 404 && result.data.error === 'api_not_found', 'Las rutas API desconocidas devuelven JSON 404', result.data);

        // Legacy, auditoría administrativa y webhook de anuncios
        result = await requestJson(base, '/api/user/999999?username=Renombrado');
        check(result.status === 410 && result.data.error === 'legacy_user_endpoint_disabled', 'El endpoint legacy de usuario está deshabilitado', result.data);
        result = await requestJson(base, '/api/wager/ticket', jsonOptions({ userId: 'usr_legacy_test' }));
        check(result.status === 410 && result.data.error === 'legacy_wager_api_disabled', 'Los tickets legacy están deshabilitados por defecto', result.data);
        result = await requestJson(base, '/api/wager/settle', jsonOptions({ ticketId: 'fake_ticket' }));
        check(result.status === 410 && result.data.error === 'legacy_wager_api_disabled', 'La liquidación legacy está deshabilitada por defecto', result.data);

        result = await requestJson(base, '/api/security/audit');
        check(result.status === 403, 'La auditoría interna exige token de administrador');
        result = await requestJson(base, '/api/security/audit', { headers: { 'x-admin-token': 'incorrecto' } });
        check(result.status === 403, 'La auditoría interna rechaza tokens incorrectos');
        result = await requestJson(base, '/api/security/audit', { headers: { 'x-admin-token': ADMIN_TOKEN } });
        check(result.status === 200 && result.data.status === 'admin_only' && !('logs' in result.data), 'La auditoría autorizada solo devuelve un resumen', result.data);

        result = await requestJson(base, '/api/ad-reward?userid=usr_ads_test');
        check(result.status === 403, 'El webhook de anuncios rechaza llamadas sin secreto');
        result = await requestJson(base, '/api/ad-reward?userid=usr_ads_test', { headers: { 'x-adsgram-secret': ADS_SECRET } });
        check(result.status === 200 && result.data.status === 'reward_not_granted_server_ledger_required', 'El webhook autenticado no concede saldo por sí solo', result.data);

        // Autorización de guardados
        const telegramUser = { id: 123456789, first_name: 'Piloto', username: 'piloto_seguro' };
        const validInitData = makeTelegramInitData(telegramUser);
        result = await requestJson(base, '/api/save/123456789');
        check(result.status === 401 && result.data.error === 'missing_telegram_init_data', 'Un ID de Telegram sin initData no accede al guardado', result.data);
        result = await requestJson(base, '/api/save/123456789', { headers: { 'x-telegram-init-data': validInitData.replace('piloto_seguro', 'suplantado') } });
        check(result.status === 403 && result.data.error === 'invalid_telegram_init_data', 'Un initData manipulado se rechaza', result.data);
        result = await requestJson(base, '/api/save/987654321', { headers: { 'x-telegram-init-data': validInitData } });
        check(result.status === 403 && result.data.error === 'telegram_user_mismatch', 'Un initData válido no abre el guardado de otro usuario', result.data);
        result = await requestJson(base, '/api/save/123456789', { headers: { 'x-telegram-init-data': validInitData } });
        check(result.status === 404 && result.data.error === 'not_found', 'Un initData válido y coincidente sí pasa la autorización', result.data);
        result = await requestJson(base, '/api/save/usuario_arbitrario');
        check(result.status === 401 && result.data.error === 'unsupported_user_id', 'Los ID arbitrarios no son credenciales de guardado', result.data);

        const deviceId = 'usr_security_device_v101';
        result = await requestJson(base, `/api/save/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedAt: Date.now(), garage: { credits: 2000000001, gems: 0, garage: [] }, story: {} })
        });
        check(result.status === 400 && result.data.error === 'invalid_save_shape', 'Un guardado con saldo fuera de rango se rechaza', result.data);
        const protoAttempt = await rawRequest(34672, {
            method: 'PUT',
            path: `/api/save/${deviceId}`,
            headers: { 'Content-Type': 'application/json' },
            body: '{"updatedAt":1,"garage":{"__proto__":{"polluted":true},"credits":1,"garage":[]},"story":{}}'
        });
        check(protoAttempt.status === 400 && ({}).polluted === undefined, 'Un guardado con __proto__ se rechaza sin contaminar objetos', protoAttempt);

        // Carreras: identidad, plausibilidad, saneamiento y cero monedas
        result = await requestJson(base, '/api/race/result', jsonOptions({ userId: 'piloto_arbitrario', username: 'Fake', trackId: 'rookie_ring', time: 55.5, car: 'Apex' }));
        check(result.status === 401, 'Una carrera con ID arbitrario se rechaza', result.data);
        result = await requestJson(base, '/api/race/result', jsonOptions({ userId: deviceId, username: 'Imposible', trackId: 'rookie_ring', time: 1, car: 'Apex' }));
        check(result.status === 422 && result.data.error === 'invalid_race_result', 'Un tiempo físicamente imposible se rechaza', result.data);
        result = await requestJson(base, '/api/race/result', jsonOptions({ userId: deviceId, username: 'Fantasma', trackId: 'circuito_inexistente', time: 55.5, car: 'Apex' }));
        check(result.status === 422 && result.data.error === 'invalid_race_result', 'Un circuito fuera del catálogo canónico se rechaza', result.data);
        result = await requestJson(base, '/api/tracks');
        check(result.status === 200 && Array.isArray(result.data) && result.data.length === 28
            && result.data.some(track => track.id === 'rookie_ring')
            && result.data.every(track => track.id && track.name && !('tiles' in track) && !('controlPoints' in track)),
            '/api/tracks expone solo metadatos de los 28 circuitos jugables', result.data && result.data.length);
        result = await requestJson(base, '/api/race/result', jsonOptions({
            userId: deviceId,
            username: '<img src=x onerror=alert(1)>Piloto',
            trackId: 'rookie_ring',
            time: 55.5,
            car: '<script>alert(1)</script>Apex'
        }));
        check(result.status === 200 && result.data.recorded === true && result.data.coinsEarned === 0, 'La carrera válida registra stats sin acuñar monedas', result.data);
        result = await requestJson(base, '/api/race/result', {
            ...jsonOptions({ userId: '123456789', username: 'NombreFalso', trackId: 'rookie_ring', time: 56.5, car: 'Apex TG' }),
            headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': validInitData }
        });
        check(result.status === 200 && result.data.recorded === true, 'La carrera de Telegram firmada se registra', result.data);
        result = await requestJson(base, '/api/leaderboard');
        check(Array.isArray(result.data) && result.data.some(row => row.username === 'piloto_seguro'), 'El ranking usa el nombre verificado de Telegram');
        check(!JSON.stringify(result.data).includes('<img') && !JSON.stringify(result.data).includes('<script'), 'El ranking no conserva HTML de nombres/coches');

        // Cuerpos JSON malformados y gigantes
        const malformed = await rawRequest(34672, {
            method: 'POST',
            path: '/api/multiplayer/duel/create',
            headers: { 'Content-Type': 'application/json' },
            body: '{json roto'
        });
        check(malformed.status === 400 && malformed.body.includes('invalid_json'), 'El JSON malformado devuelve 400 controlado', malformed);
        const hugeBody = JSON.stringify({ userId: deviceId, username: 'x'.repeat(20 * 1024), trackId: 'rookie_ring', time: 55, car: 'Apex' });
        const huge = await rawRequest(34672, {
            method: 'POST',
            path: '/api/race/result',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(hugeBody) },
            body: hugeBody
        });
        check(huge.status === 413, 'Los cuerpos API gigantes se rechazan con 413', huge);

        // Salas públicas: importe oficial y saneamiento de red
        result = await requestJson(base, '/api/multiplayer/public/join', jsonOptions({
            userId: deviceId,
            roomId: '__proto__',
            name: 'Piloto'
        }));
        check(result.status === 400 && result.data.error === 'invalid_room', 'Las salas públicas rechazan roomId no oficiales', result.data);
        result = await requestJson(base, '/api/multiplayer/public/join', jsonOptions({
            userId: deviceId,
            roomId: 'room_bronze',
            buyIn: 999999,
            name: '<b>Piloto Público</b>',
            carName: '<i>Apex</i>',
            colorHex: 'url(javascript:alert(1))',
            archetype: '"><script>alert(1)</script>'
        }));
        const publicSlot = result.data && Array.isArray(result.data.slots) ? result.data.slots[0] : null;
        check(result.status === 200 && publicSlot && publicSlot.stake === 5, 'La sala pública ignora el buy-in del cliente y usa 5 $CR', result.data);
        check(publicSlot && !publicSlot.name.includes('<') && publicSlot.colorHex === '#00f5d4' && publicSlot.archetype === 'ferrari_corsa', 'La sala pública sanea nombre, color y arquetipo', publicSlot);
        const publicLobbyId = result.data.lobbyId;
        result = await requestJson(base, '/api/multiplayer/public/status?roomId=sala_inventada');
        check(result.status === 400 && result.data.error === 'invalid_room', 'El estado público rechaza salas inventadas', result.data);
        result = await requestJson(base, '/api/multiplayer/public/leave', jsonOptions({ userId: deviceId, roomId: 'room_bronze', lobbyId: publicLobbyId }));
        check(result.status === 200 && result.data.ok === true, 'El participante puede salir de la sala pública', result.data);

        // Duelos: código fuerte, apuesta limitada y cancelación solo participante
        const hostId = 'usr_duel_host_v101';
        const guestId = 'usr_duel_guest_v101';
        const outsiderId = 'usr_duel_outsider_v101';
        result = await requestJson(base, '/api/multiplayer/duel/create', jsonOptions({
            userId: hostId,
            name: '<u>Anfitrión</u>',
            carName: 'GT Seguro',
            colorHex: '#123abc',
            archetype: 'dtm_coupe',
            trackId: 'rookie_ring',
            betAmount: 999999
        }));
        check(result.status === 200 && /^DUEL-[A-Z2-9]{8}$/.test(result.data.code), 'Los duelos usan códigos aleatorios de 8 caracteres', result.data);
        check(result.data.duel.betAmount === 10000 && !result.data.duel.slots[0].name.includes('<'), 'El duelo limita la apuesta y sanea el anfitrión', result.data.duel);
        const duelCode = result.data.code;

        result = await requestJson(base, '/api/multiplayer/duel/cancel', jsonOptions({ userId: outsiderId, code: duelCode }));
        check(result.status === 403, 'Un tercero no puede cancelar un duelo ajeno', result.data);
        result = await requestJson(base, '/api/multiplayer/duel/join', jsonOptions({ userId: guestId, code: duelCode, name: 'Invitado', carName: 'GT Invitado' }));
        check(result.status === 200 && result.data.duel.status === 'STARTING', 'El invitado puede unirse al duelo', result.data);
        result = await requestJson(base, '/api/multiplayer/duel/join', jsonOptions({ userId: outsiderId, code: duelCode, name: 'Tercero', carName: 'GT Tercero' }));
        check(result.status === 409, 'Un tercer jugador no entra en un duelo completo/iniciado', result.data);
        result = await requestJson(base, '/api/multiplayer/duel/cancel', jsonOptions({ userId: guestId, code: duelCode }));
        check(result.status === 200 && result.data.left === true, 'El invitado puede abandonar el duelo', result.data);
        result = await requestJson(base, '/api/multiplayer/duel/cancel', jsonOptions({ userId: hostId, code: duelCode }));
        check(result.status === 200 && result.data.cancelled === true, 'El anfitrión puede cancelar su duelo', result.data);

        // Rate limit por endpoint/IP
        let sawRateLimit = false;
        for (let i = 0; i < 62; i++) {
            const limited = await requestJson(base, '/api/rate-limit-probe-v101', jsonOptions({ probe: i }));
            if (limited.status === 429) { sawRateLimit = true; break; }
        }
        check(sawRateLimit, 'El límite de tasa devuelve 429 al abusar de un endpoint');

        // Persistencia: sin usuarios de anuncios y con permisos restrictivos
        const onDisk = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        check(!onDisk.users || !onDisk.users.usr_ads_test, 'El webhook de anuncios no crea ni acredita usuarios');
        const mode = fs.statSync(dbFile).mode & 0o777;
        check(mode === 0o600, `La BD se persiste con permisos 0600 (actual ${mode.toString(8)})`);

        await stopServer(server);
        server = null;

        // Fail-closed sin BOT_TOKEN + recuperación de BD corrupta
        fs.writeFileSync(corruptDbFile, '{json corrupto', 'utf8');
        fallbackServer = await startServer(34673, corruptDbFile, {
            BOT_TOKEN: '',
            ADMIN_AUDIT_TOKEN: '',
            ADSGRAM_WEBHOOK_SECRET: ''
        });
        result = await requestJson(fallbackServer.base, '/api/save/123456789');
        check(result.status === 503 && result.data.error === 'auth_not_configured', 'Sin BOT_TOKEN, Telegram falla cerrado (503)', result.data);
        result = await requestJson(fallbackServer.base, '/api/security/audit');
        check(result.status === 503 && result.data.error === 'admin_audit_not_configured', 'Sin ADMIN_AUDIT_TOKEN, la auditoría queda deshabilitada', result.data);
        result = await requestJson(fallbackServer.base, '/api/ad-reward?userid=usr_ads_test');
        check(result.status === 503 && result.data.error === 'ad_reward_not_configured', 'Sin ADSGRAM_WEBHOOK_SECRET, el webhook queda deshabilitado', result.data);
        result = await requestJson(fallbackServer.base, '/api/leaderboard');
        check(result.status === 200 && Array.isArray(result.data), 'Una BD corrupta no tumba el servidor', result.data);
        const corruptBackups = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(path.basename(corruptDbFile) + '.corrupt-'));
        check(corruptBackups.length >= 1, 'La BD corrupta se conserva como copia .corrupt-*', corruptBackups);
        for (const backup of corruptBackups) removeIfExists(path.join(os.tmpdir(), backup));

        console.log('\n========================================');
        console.log('SUCCESS! SECURITY v101 TESTS PASSED');
        console.log('========================================');
    } catch (error) {
        console.error(`\n${error.message}`);
        if (server) console.error('--- Log servidor principal ---\n' + server.getLog().slice(-2500));
        if (fallbackServer) console.error('--- Log servidor fail-closed ---\n' + fallbackServer.getLog().slice(-2500));
        process.exitCode = 1;
    } finally {
        await stopServer(server);
        await stopServer(fallbackServer);
        removeIfExists(dbFile);
        removeIfExists(dbFile + '.tmp');
        removeIfExists(corruptDbFile);
        removeIfExists(corruptDbFile + '.tmp');
    }
})();
