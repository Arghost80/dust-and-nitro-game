// ===== TEST v102: regresiones HTTP de seguridad =====
// Arranca servidores aislados con bases de datos temporales y verifica que
// los fallos de las auditorías v100/v101 no vuelven: estáticos, auth Telegram,
// credenciales de dispositivo, sesiones de carrera, endpoints legacy,
// anuncios, multijugador seudonimizado y guardados.
// Uso: node test_security.js
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

const BOT_TOKEN = '123456:TEST_TOKEN_FOR_HMAC_ONLY';
const ADMIN_TOKEN = 'test-admin-token-v102';
const ADS_SECRET = 'test-ads-secret-v102';
const DEVICE_SECRET_PREFIX = 'test-device-secret-v102';

function deviceSecretFor(userId) {
    return `${DEVICE_SECRET_PREFIX}-${String(userId || 'anonymous')}-0123456789abcdef`;
}

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 700)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function makeTelegramInitData(user, authDate = Math.floor(Date.now() / 1000)) {
    const params = new URLSearchParams({
        auth_date: String(authDate),
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
    const autoHeaders = {};
    if (body && typeof body === 'object' && String(body.userId || '').startsWith('usr_')) {
        autoHeaders['X-Device-Secret'] = deviceSecretFor(body.userId);
    }
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...autoHeaders, ...headers },
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
            RACE_SESSION_MIN_AGE_MS: '0',
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
    const dbFile = path.join(os.tmpdir(), `apex_security_db_${stamp}.sqlite`);
    const corruptDbFile = path.join(os.tmpdir(), `apex_security_corrupt_${stamp}.sqlite`);
    let server = null;
    let fallbackServer = null;

    try {
        // El servidor principal habilita solo en este entorno aislado la
        // orquestación heredada de salas para seguir probando saneamiento y
        // seudonimización. La puerta por defecto (apagada) se verifica abajo
        // en el servidor fail-closed; no debe activarse en producción hasta
        // completar escrow y liquidación autoritativa.
        server = await startServer(34672, dbFile, { ENABLE_WAGER_STAKES: 'true' });
        const { base } = server;

        // Salud y cabeceras
        let result = await requestJson(base, '/healthz');
        check(result.status === 200 && result.data.ok === true && result.data.version === '1.0.6', '/healthz responde sin exponer datos internos', result.data);
        check(String(result.headers.get('cache-control') || '').includes('no-store'), '/healthz usa Cache-Control: no-store');
        const head = await rawRequest(34672, { method: 'HEAD', path: '/healthz' });
        check(head.status === 200 && head.body === '', 'HEAD /healthz funciona para el health check');
        const home = await rawRequest(34672, { path: '/' });
        check(home.headers['x-content-type-options'] === 'nosniff' && home.headers['content-security-policy'], 'La portada incluye cabeceras de seguridad');
        check(String(home.headers['content-security-policy'] || '').includes("object-src 'none'")
            && String(home.headers['content-security-policy'] || '').includes('frame-ancestors'),
            'La CSP enforce bloquea objetos y encuadre no autorizado', home.headers['content-security-policy']);
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
        const sameOriginOptions = await rawRequest(34672, {
            method: 'OPTIONS',
            path: '/api/race/result',
            headers: {
                Origin: base,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, X-Device-Secret'
            }
        });
        check(sameOriginOptions.status === 204 && String(sameOriginOptions.headers['access-control-allow-headers'] || '').includes('X-Device-Secret'),
            'CORS same-origin permite la cabecera de credencial de dispositivo', sameOriginOptions.headers);
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
        check(result.status === 422 && result.data.error === 'invalid_adsgram_user_id', 'El webhook autenticado solo acepta el ID numérico de Telegram', result.data);
        result = await requestJson(base, '/api/ad-reward?userid=123456789&reward=nitro&event_id=security-ad-1', { headers: { 'x-adsgram-secret': ADS_SECRET } });
        check(result.status === 200 && result.data.status === 'reward_entitlement_created' && result.data.duplicate === false,
            'El webhook autenticado crea un derecho reclamable, sin acreditar saldo todavía', result.data);
        result = await requestJson(base, '/api/ad-reward?userid=123456789&reward=nitro&event_id=security-ad-1', { headers: { 'x-adsgram-secret': ADS_SECRET } });
        check(result.status === 200 && result.data.duplicate === true, 'La repetición del mismo evento publicitario no crea un segundo derecho', result.data);

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
        result = await requestJson(base, '/api/economy/state?userId=123456789', { headers: { 'x-telegram-init-data': validInitData } });
        check(result.status === 200 && result.data.economy.garage.nitros === 2,
            'El webhook publicitario por sí solo todavía no cambia el inventario', result.data);
        result = await requestJson(base, '/api/ads/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': validInitData },
            body: JSON.stringify({ userId: '123456789', rewardType: 'nitro' })
        });
        check(result.status === 200 && result.data.economy.garage.nitros === 3,
            'La reclamación autenticada aplica una sola recompensa verificada', result.data);
        result = await requestJson(base, '/api/ads/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': validInitData },
            body: JSON.stringify({ userId: '123456789', rewardType: 'nitro' })
        });
        check(result.status === 202 && result.data.error === 'ad_reward_not_verified_yet',
            'La segunda reclamación sin otro webhook no concede otro nitro', result.data);
        const futureInitData = makeTelegramInitData(telegramUser, Math.floor(Date.now() / 1000) + 3600);
        result = await requestJson(base, '/api/save/123456789', { headers: { 'x-telegram-init-data': futureInitData } });
        check(result.status === 403 && result.data.error === 'invalid_telegram_init_data', 'Un initData con auth_date futuro se rechaza', result.data);
        result = await requestJson(base, '/api/save/usuario_arbitrario');
        check(result.status === 401 && result.data.error === 'unsupported_user_id', 'Los ID arbitrarios no son credenciales de guardado', result.data);

        const deviceId = 'usr_security_device_v101';
        result = await requestJson(base, `/api/save/${deviceId}`);
        check(result.status === 401 && result.data.error === 'missing_device_secret', 'Un ID usr_... sin secreto no accede al guardado', result.data);
        result = await requestJson(base, `/api/save/${deviceId}`, { headers: { 'x-device-secret': deviceSecretFor(deviceId) } });
        check(result.status === 404 && result.data.error === 'not_found', 'La primera credencial de dispositivo válida se vincula a la cuenta', result.data);
        result = await requestJson(base, `/api/save/${deviceId}`, { headers: { 'x-device-secret': deviceSecretFor('usr_otro_dispositivo') } });
        check(result.status === 401 && result.data.error === 'invalid_device_secret', 'Otra credencial no abre el guardado de este dispositivo', result.data);
        result = await requestJson(base, `/api/save/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Device-Secret': deviceSecretFor(deviceId) },
            body: JSON.stringify({ updatedAt: Date.now(), garage: { credits: 2000000001, gems: 0, garage: [] }, story: {} })
        });
        check(result.status === 400 && result.data.error === 'invalid_save_shape', 'Un guardado con saldo fuera de rango se rechaza', result.data);
        const protoAttempt = await rawRequest(34672, {
            method: 'PUT',
            path: `/api/save/${deviceId}`,
            headers: { 'Content-Type': 'application/json', 'X-Device-Secret': deviceSecretFor(deviceId) },
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
            username: 'Sin sesión',
            trackId: 'rookie_ring',
            time: 55.5,
            car: 'Apex'
        }));
        check(result.status === 422 && result.data.error === 'invalid_race_session', 'Un resultado plausible sin sesión registrada se rechaza', result.data);
        result = await requestJson(base, '/api/race/session', jsonOptions({
            userId: deviceId,
            trackId: 'rookie_ring',
            car: 'Apex'
        }, { 'X-Device-Secret': deviceSecretFor('usr_dispositivo_ajeno') }));
        check(result.status === 401 && result.data.error === 'invalid_device_secret', 'No se crean sesiones de carrera con la credencial de otro dispositivo', result.data);
        result = await requestJson(base, '/api/race/session', jsonOptions({
            userId: deviceId,
            trackId: 'circuito_inexistente',
            car: 'Apex'
        }));
        check(result.status === 422 && result.data.error === 'invalid_race_session', 'No se crean sesiones para circuitos fuera del catálogo', result.data);
        result = await requestJson(base, '/api/race/session', jsonOptions({
            userId: deviceId,
            trackId: 'rookie_ring',
            car: 'Apex'
        }));
        check(result.status === 200 && typeof result.data.sessionId === 'string' && result.data.minAllowedTime === 27,
            'La sesión de carrera vincula piloto, circuito y tiempo mínimo', result.data);
        const deviceRaceSessionId = result.data.sessionId;
        result = await requestJson(base, '/api/race/result', jsonOptions({
            userId: deviceId,
            sessionId: deviceRaceSessionId,
            username: '<img src=x onerror=alert(1)>Piloto',
            trackId: 'rookie_ring',
            time: 55.5,
            car: '<script>alert(1)</script>Apex'
        }));
        check(result.status === 200 && result.data.recorded === true && result.data.coinsEarned === 0, 'La carrera válida registra stats sin acuñar monedas', result.data);
        result = await requestJson(base, '/api/race/result', jsonOptions({
            userId: deviceId,
            sessionId: deviceRaceSessionId,
            username: 'Replay',
            trackId: 'rookie_ring',
            time: 54.5,
            car: 'Apex'
        }));
        check(result.status === 422 && result.data.error === 'invalid_race_session', 'Una sesión de carrera no puede reutilizarse (anti-replay)', result.data);
        result = await requestJson(base, '/api/race/session', {
            ...jsonOptions({ userId: '123456789', trackId: 'rookie_ring', car: 'Apex TG' }),
            headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': validInitData }
        });
        check(result.status === 200 && typeof result.data.sessionId === 'string', 'Telegram firmado también registra su sesión de carrera', result.data);
        const telegramRaceSessionId = result.data.sessionId;
        result = await requestJson(base, '/api/race/result', {
            ...jsonOptions({ userId: '123456789', sessionId: telegramRaceSessionId, username: 'NombreFalso', trackId: 'rookie_ring', time: 56.5, car: 'Apex TG' }),
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
        check(publicSlot.userId === deviceId && publicSlot.isSelf === true && !String(publicSlot.id).includes(deviceId),
            'El propio slot se marca isSelf sin incrustar el ID persistente en el DOM id', publicSlot);
        const publicLobbyId = result.data.lobbyId;
        const peerId = 'usr_security_peer_v102';
        result = await requestJson(base, '/api/multiplayer/public/join', jsonOptions({
            userId: peerId,
            roomId: 'room_bronze',
            name: 'Piloto Rival',
            carName: 'GT Rival',
            colorHex: '#22c55e',
            archetype: 'jdm_supra'
        }));
        const peerSlots = result.data && Array.isArray(result.data.slots) ? result.data.slots : [];
        const peerSelf = peerSlots.find(slot => slot.isSelf === true);
        const peerOther = peerSlots.find(slot => slot.isSelf !== true && slot.isAI !== true);
        check(result.status === 200 && peerSelf && peerSelf.userId === peerId && peerOther && /^pub_/.test(peerOther.userId)
            && !JSON.stringify(peerSlots).includes(deviceId),
            'Un rival ve seudónimos pub_... y no el ID persistente de los demás', peerSlots);
        result = await requestJson(base, `/api/multiplayer/public/status?roomId=room_bronze&lobbyId=${publicLobbyId}`);
        check(result.status === 200 && Array.isArray(result.data.slots)
            && result.data.slots.every(slot => slot.isAI === true || /^pub_/.test(slot.userId))
            && !JSON.stringify(result.data.slots).includes(deviceId)
            && !JSON.stringify(result.data.slots).includes(peerId),
            'El polling sin credencial no expone IDs persistentes de sala', result.data);
        result = await requestJson(base, `/api/multiplayer/public/status?roomId=room_bronze&lobbyId=${publicLobbyId}&userId=${deviceId}`, {
            headers: { 'x-device-secret': deviceSecretFor(deviceId) }
        });
        check(result.status === 200 && result.data.slots.some(slot => slot.userId === deviceId && slot.isSelf === true),
            'El polling autenticado sí reconoce el propio slot', result.data);
        result = await requestJson(base, '/api/multiplayer/public/leave', jsonOptions({ userId: peerId, roomId: 'room_bronze', lobbyId: publicLobbyId }));
        check(result.status === 200 && result.data.ok === true, 'El rival también puede salir con su credencial', result.data);
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
        check(result.data.duel.isHost === true && result.data.duel.hostUserId === hostId && result.data.duel.slots[0].isSelf === true,
            'El anfitrión recibe su propia vista isHost/isSelf', result.data.duel);
        const duelCode = result.data.code;
        result = await requestJson(base, `/api/multiplayer/duel/status?code=${duelCode}&userId=${guestId}`, {
            headers: { 'x-device-secret': deviceSecretFor(guestId) }
        });
        check(result.status === 200 && result.data.duel.isHost === false && /^pub_/.test(result.data.duel.hostUserId)
            && !JSON.stringify(result.data.duel).includes(hostId),
            'El invitado no recibe el ID persistente del anfitrión del duelo', result.data.duel);

        result = await requestJson(base, '/api/multiplayer/duel/cancel', jsonOptions({ userId: outsiderId, code: duelCode }));
        check(result.status === 403, 'Un tercero no puede cancelar un duelo ajeno', result.data);
        result = await requestJson(base, '/api/multiplayer/duel/join', jsonOptions({ userId: guestId, code: duelCode, name: 'Invitado', carName: 'GT Invitado' }));
        check(result.status === 200 && result.data.duel.status === 'STARTING', 'El invitado puede unirse al duelo', result.data);
        check(result.data.duel.slots.some(slot => slot.userId === guestId && slot.isSelf === true)
            && !JSON.stringify(result.data.duel).includes(hostId),
            'Al unirse, el invitado solo ve en claro su propio ID', result.data.duel);
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

        // Persistencia: una escritura SQLite de otro proceso en WAL se ve al
        // instante; ya no existe una caché JSON completa en memoria.
        const externalDb = new SqliteDatabase(dbFile);
        try {
            externalDb.pragma('busy_timeout = 5000');
            externalDb.prepare(`INSERT INTO leaderboard_entries
                (user_id, username, track_id, track_name, time_seconds, car_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, track_id) DO UPDATE SET
                    username = excluded.username,
                    track_name = excluded.track_name,
                    time_seconds = excluded.time_seconds,
                    car_name = excluded.car_name,
                    updated_at = excluded.updated_at`)
                .run('usr_external_writer_v104', 'RecargaExterna', 'rookie_ring', 'Rookie Ring', 44.44,
                    'Bot Externo', new Date().toISOString(), new Date().toISOString());
        } finally {
            externalDb.close();
        }
        result = await requestJson(base, '/api/leaderboard?trackId=rookie_ring');
        check(result.status === 200 && result.data.some(row => row.username === 'RecargaExterna'),
            'SQLite/WAL expone cambios persistidos por otro proceso sin reiniciar', result.data);

        // Persistencia: sin usuarios inventados por el webhook, derecho de
        // anuncio consumido una vez, solo hash de dispositivo y archivo 0600.
        const diskDb = new SqliteDatabase(dbFile, { readonly: true });
        try {
            const adsUser = diskDb.prepare('SELECT user_id FROM users WHERE user_id = ?').get('usr_ads_test');
            const credential = diskDb.prepare('SELECT hash FROM device_credentials WHERE user_id = ?').get(deviceId);
            const adEntitlement = diskDb.prepare(`SELECT status FROM ad_reward_entitlements
                WHERE user_id = ? AND reward_type = 'nitro' ORDER BY created_at DESC LIMIT 1`).get('123456789');
            check(!adsUser, 'El webhook de anuncios rechazado no crea usuarios básicos');
            check(adEntitlement && adEntitlement.status === 'claimed',
                'SQLite marca el derecho publicitario verificado como reclamado una sola vez', adEntitlement);
            check(credential && /^[a-f0-9]{64}$/.test(credential.hash),
                'SQLite contiene el hash de la credencial de dispositivo');
        } finally {
            diskDb.close();
        }
        const rawDiskFiles = [dbFile, dbFile + '-wal', dbFile + '-shm']
            .filter(file => fs.existsSync(file))
            .map(file => fs.readFileSync(file).toString('latin1')).join('');
        check(!rawDiskFiles.includes(deviceSecretFor(deviceId)),
            'Los archivos SQLite/WAL no contienen secretos de dispositivo en claro');
        const mode = fs.statSync(dbFile).mode & 0o777;
        check(mode === 0o600, `SQLite se persiste con permisos 0600 (actual ${mode.toString(8)})`);

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
        check(result.status === 503 && result.data.error === 'admin_not_configured', 'Sin ADMIN_AUDIT_TOKEN, la auditoría queda deshabilitada', result.data);
        result = await requestJson(fallbackServer.base, '/api/ad-reward?userid=usr_ads_test');
        check(result.status === 503 && result.data.error === 'ad_reward_not_configured', 'Sin ADSGRAM_WEBHOOK_SECRET, el webhook queda deshabilitado', result.data);
        result = await requestJson(fallbackServer.base, '/api/multiplayer/public/join', jsonOptions({
            userId: 'usr_default_gate_v104', roomId: 'room_bronze', name: 'Puerta cerrada'
        }));
        check(result.status === 410 && result.data.error === 'wager_stakes_disabled',
            'Por defecto, las salas públicas con apuesta permanecen cerradas', result.data);
        result = await requestJson(fallbackServer.base, '/api/multiplayer/duel/create', jsonOptions({
            userId: 'usr_default_gate_v104', name: 'Puerta cerrada', trackId: 'rookie_ring', betAmount: 100
        }));
        check(result.status === 410 && result.data.error === 'wager_stakes_disabled',
            'Por defecto, los duelos con apuesta permanecen cerrados', result.data);
        result = await requestJson(fallbackServer.base, '/api/leaderboard');
        check(result.status === 200 && Array.isArray(result.data), 'Una BD corrupta no tumba el servidor', result.data);
        const corruptBackups = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(path.basename(corruptDbFile) + '.corrupt-'));
        check(corruptBackups.length >= 1, 'La BD corrupta se conserva como copia .corrupt-*', corruptBackups);
        for (const backup of corruptBackups) removeIfExists(path.join(os.tmpdir(), backup));

        console.log('\n========================================');
        console.log('SUCCESS! SECURITY v105 TESTS PASSED');
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
        removeIfExists(dbFile + '-wal');
        removeIfExists(dbFile + '-shm');
        removeIfExists(corruptDbFile);
        removeIfExists(corruptDbFile + '-wal');
        removeIfExists(corruptDbFile + '-shm');
    }
})();
