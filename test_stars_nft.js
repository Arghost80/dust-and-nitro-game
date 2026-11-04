// ===== TEST v105: Telegram Stars + registro/conversión NFT =====
// Levanta un mock local de la Bot API y el servidor real (con su bot en el
// mismo proceso, como en Render). El mock solo se usa fuera de producción
// mediante TELEGRAM_BOT_API_BASE_URL. Se comprueba el flujo completo:
// factura XTR -> pre-checkout -> successful_payment -> entrega única,
// duplicados/reembolsos, recuperación por status, separación de las rutas
// TON y el registro global/claim NFT sin fingir una acuñación.
// Uso: node test_stars_nft.js
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

const BOT_TOKEN = '123456:TEST_TOKEN_FOR_STARS_NFT';
const ADMIN_TOKEN = 'test-admin-token-v105';
const TELEGRAM_USER = { id: 123456789, first_name: 'Piloto', username: 'piloto_stars' };
const OUTSIDER_USER = { id: 987654321, first_name: 'Otro', username: 'otro_piloto' };
const SUPPORT_OPERATOR_USER = { id: 555123456, first_name: 'Operador', username: 'operador_soporte' };
const BROWSER_USER_ID = 'usr_test_browser_v105';

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 900)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function makeTelegramInitData(user) {
    const params = new URLSearchParams({
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'test-stars-query',
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

function deviceSecretFor(userId) {
    return `test-device-secret-v105-${String(userId || 'anonymous')}-0123456789abcdef`;
}

async function requestJson(base, requestPath, options = {}) {
    const response = await fetch(base + requestPath, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { status: response.status, data, text, headers: response.headers };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(predicate, description, timeoutMs = 8000) {
    const started = Date.now();
    let lastValue;
    while (Date.now() - started < timeoutMs) {
        lastValue = await predicate();
        if (lastValue) return lastValue;
        await sleep(100);
    }
    throw new Error(`Timeout esperando: ${description}`);
}

async function waitForServer(proc, base) {
    for (let i = 0; i < 70; i++) {
        try {
            const response = await fetch(base + '/healthz');
            if (response.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor v105 murió al arrancar');
        await sleep(150);
    }
    throw new Error('Timeout esperando al servidor v105');
}

async function stopChild(proc) {
    if (!proc || proc.exitCode !== null) return;
    proc.kill('SIGTERM');
    await Promise.race([
        new Promise(resolve => proc.once('exit', resolve)),
        sleep(1800)
    ]);
    if (proc.exitCode === null) proc.kill('SIGKILL');
}

function removeIfExists(file) {
    try { fs.unlinkSync(file); } catch (e) {}
    try { fs.unlinkSync(`${file}-wal`); } catch (e) {}
    try { fs.unlinkSync(`${file}-shm`); } catch (e) {}
}

function createTelegramMock() {
    let nextUpdateId = 1000;
    let invoiceCounter = 0;
    const updates = [];
    const waiters = new Set();
    const calls = [];
    const getUpdatesOffsets = [];

    function wakeWaiters() {
        for (const wake of Array.from(waiters)) wake();
        waiters.clear();
    }

    function enqueue(update) {
        const stored = { update_id: nextUpdateId++, ...update };
        updates.push(stored);
        wakeWaiters();
        return stored;
    }

    const server = http.createServer(async (req, res) => {
        const match = /^\/bot[^/]+\/([A-Za-z]+)$/.exec(req.url || '');
        if (!match || req.method !== 'POST') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error_code: 404, description: 'mock_not_found' }));
            return;
        }
        const method = match[1];
        let raw = '';
        req.setEncoding('utf8');
        for await (const chunk of req) raw += chunk;
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch (e) {}

        let result = true;
        if (method === 'getUpdates') {
            const offset = Number(body.offset) || 0;
            getUpdatesOffsets.push(offset);
            if (getUpdatesOffsets.length > 500) getUpdatesOffsets.shift();
            let available = updates.filter(update => update.update_id >= offset);
            if (!available.length) {
                await new Promise(resolve => {
                    const timer = setTimeout(resolve, 80);
                    waiters.add(() => { clearTimeout(timer); resolve(); });
                });
                available = updates.filter(update => update.update_id >= offset);
            }
            result = available.slice(0, 100);
        } else {
            calls.push({ method, body, at: Date.now() });
            if (method === 'createInvoiceLink') {
                invoiceCounter++;
                result = `https://t.me/$ApexStarsTest${invoiceCounter}`;
            } else if (method === 'sendMessage') {
                result = { message_id: calls.length + 10000, chat: { id: body.chat_id, type: 'private' } };
            }
        }

        if (!res.destroyed) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result }));
        }
    });

    return {
        server,
        enqueue,
        calls,
        getUpdatesOffsets,
        callsFor(method) { return calls.filter(call => call.method === method); },
        lastUpdateId() { return nextUpdateId - 1; }
    };
}

(async () => {
    const stamp = Date.now();
    const dbFile = path.join(os.tmpdir(), `apex_stars_nft_db_${stamp}.sqlite`);
    const mock = createTelegramMock();
    await new Promise(resolve => mock.server.listen(0, '127.0.0.1', resolve));
    const mockPort = mock.server.address().port;
    const port = 35200 + Math.floor(Math.random() * 700);
    const base = `http://127.0.0.1:${port}`;

    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            DB_FILE: dbFile,
            NODE_ENV: 'test',
            BOT_TOKEN,
            TELEGRAM_BOT_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
            WEBAPP_URL: 'https://apex.example.test',
            ENABLE_SUPPORT_TICKETS: 'true',
            SUPPORT_OPERATOR_TELEGRAM_IDS: '',
            SUPPORT_OPERATOR_TELEGRAM_ID: String(SUPPORT_OPERATOR_USER.id),
            SUPPORT_TICKET_CHAT_ID: '',
            SUPPORT_TICKET_COOLDOWN_SEC: '0',
            ADMIN_AUDIT_TOKEN: ADMIN_TOKEN,
            ALLOW_INSECURE_DEV_AUTH: 'false',
            ENABLE_LEGACY_WAGER_API: 'false',
            RENDER_EXTERNAL_URL: '',
            TELEGRAM_TON_PURCHASES_ENABLED: 'false',
            TELEGRAM_STARS_PURCHASES_ENABLED: 'true',
            NFT_ENTITLEMENTS_ENABLED: 'true',
            TON_NFT_MINTING_ENABLED: 'false',
            TON_NFT_NETWORK: 'ton-testnet',
            TON_USDT_RATE_OVERRIDE: '5',
            DB_BACKUP_ENABLED: 'false'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverLog = '';
    proc.stdout.on('data', chunk => { serverLog += chunk; });
    proc.stderr.on('data', chunk => { serverLog += chunk; });

    const userId = String(TELEGRAM_USER.id);
    const outsiderId = String(OUTSIDER_USER.id);
    const initData = makeTelegramInitData(TELEGRAM_USER);
    const outsiderInitData = makeTelegramInitData(OUTSIDER_USER);
    const telegramHeaders = { 'X-Telegram-Init-Data': initData };
    const outsiderHeaders = { 'X-Telegram-Init-Data': outsiderInitData };
    const post = (url, body, headers = telegramHeaders) => requestJson(base, url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    });
    const economyCredits = async () => {
        const result = await requestJson(base, `/api/economy/state?userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        return result.data && result.data.economy && result.data.economy.garage ? Number(result.data.economy.garage.credits) : null;
    };

    try {
        await waitForServer(proc, base);
        await waitFor(() => mock.getUpdatesOffsets.length > 0, 'el bot empieza el polling contra el mock');

        let result = await requestJson(base, '/healthz');
        check(result.status === 200 && result.data.version === '1.0.7', '/healthz anuncia la v1.0.7', result.data);

        result = await requestJson(base, '/api/config');
        check(result.status === 200 && result.data.version === '1.0.7', '/api/config anuncia la v1.0.7', result.data);
        check(result.data.features.telegramStarsPurchasesEnabled === true
            && result.data.features.nftEntitlementsEnabled === true
            && result.data.features.nftMintingEnabled === false,
            'features: Stars y registro NFT activos, acuñación desactivada', result.data.features);
        const expectedPackages = [[100, 1000], [500, 5000], [1000, 10000], [2500, 25000]];
        check(JSON.stringify(result.data.telegramStars.packages.map(pkg => [pkg.priceStars, pkg.cr])) === JSON.stringify(expectedPackages),
            'catálogo Stars lineal aprobado: 1 Star = 10 $CR, sin descuentos', result.data.telegramStars.packages);
        check(result.data.nft.mintingEnabled === false && result.data.nft.mintingConfigured === false
            && result.data.nft.network === 'ton-testnet' && result.data.nft.royaltyPercent === 5
            && result.data.nft.claimAmountNanotons === '40000000',
            'config NFT: testnet, regalía 5 %, referencia 0,04 TON y sin mint', result.data.nft);

        result = await requestJson(base, `/api/economy/state?userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.economy.garage.credits === 100, 'perfil Telegram inicial: 100 $CR', result.data.economy.garage);

        // La cuenta de navegador nunca puede recibir una compra Stars.
        const invoiceCallsBeforeBrowser = mock.callsFor('createInvoiceLink').length;
        result = await post('/api/telegram-stars/create', { userId: BROWSER_USER_ID, packageId: 'cr_stars_100' }, {
            'X-Device-Secret': deviceSecretFor(BROWSER_USER_ID)
        });
        check(result.status === 403 && result.data.error === 'telegram_account_required', 'una cuenta usr_… no puede crear facturas Stars', result.data);
        check(mock.callsFor('createInvoiceLink').length === invoiceCallsBeforeBrowser, 'el rechazo de usr_… no llama a createInvoiceLink');

        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_100' }, {});
        check(result.status === 401 && result.data.error === 'missing_telegram_init_data', 'crear Stars sin initData -> 401', result.data);
        result = await post('/api/telegram-stars/create', { userId, packageId: 'stars_gratis' });
        check(result.status === 422 && result.data.error === 'invalid_package', 'paquete Stars inventado -> 422', result.data);

        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_100' });
        check(result.status === 200 && result.data.ok === true && result.data.order, 'pedido Stars de 100 creado', result.data);
        const order1 = result.data.order;
        check(/^APEX-[0-9A-F]{12}$/.test(order1.id) && order1.paymentProvider === 'telegram_stars'
            && order1.priceStars === 100 && order1.cr === 1000 && order1.status === 'pending'
            && /^https:\/\/t\.me\//.test(order1.invoiceUrl),
            'el pedido fija 100 Stars -> 1.000 $CR y una factura t.me', order1);
        const payload1 = `apex_stars_v1:${order1.id}`;
        const invoiceCall1 = mock.callsFor('createInvoiceLink').at(-1);
        check(invoiceCall1.body.currency === 'XTR' && invoiceCall1.body.provider_token === ''
            && invoiceCall1.body.payload === payload1
            && Array.isArray(invoiceCall1.body.prices) && invoiceCall1.body.prices.length === 1
            && invoiceCall1.body.prices[0].amount === 100,
            'createInvoiceLink usa XTR, provider_token vacío, un precio y el payload interno', invoiceCall1.body);

        const invoiceCountAfterFirst = mock.callsFor('createInvoiceLink').length;
        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_100' });
        check(result.status === 200 && result.data.reused === true && result.data.order.id === order1.id
            && result.data.order.invoiceUrl === order1.invoiceUrl,
            'crear el mismo paquete reutiliza el pedido/factura pendientes', result.data);
        check(mock.callsFor('createInvoiceLink').length === invoiceCountAfterFirst, 'la reutilización no crea una segunda factura');

        // Las rutas genéricas TON no deben verificar ni reclamar un Stars.
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.order.paymentProvider === 'telegram_stars' && result.data.order.status === 'pending',
            'el status genérico deriva un pedido Stars sin buscar un pago TON', result.data);
        result = await post('/api/purchases/claim', { userId, orderId: order1.id });
        check(result.status === 409 && result.data.error === 'telegram_stars_payment_not_confirmed',
            'el claim TON no entrega un pedido Stars pendiente', result.data);
        result = await requestJson(base, `/api/purchases/list?userId=${encodeURIComponent(userId)}&limit=50`, { headers: telegramHeaders });
        check(result.status === 200 && !result.data.orders.some(entry => entry.order.id === order1.id),
            'la lista genérica TON excluye pedidos Stars', result.data.orders);

        result = await requestJson(base, `/api/telegram-stars/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(outsiderId)}`, { headers: outsiderHeaders });
        check(result.status === 404, 'otro usuario no puede leer el pedido Stars', result.data);

        // Pre-checkout: importe incorrecto rechazado y correcto aprobado.
        mock.enqueue({ pre_checkout_query: { id: 'pre_wrong_amount', from: { id: TELEGRAM_USER.id }, currency: 'XTR', total_amount: 99, invoice_payload: payload1 } });
        await waitFor(() => mock.callsFor('answerPreCheckoutQuery').find(call => call.body.pre_checkout_query_id === 'pre_wrong_amount' && call.body.ok === false),
            'pre-checkout con importe incorrecto rechazado');
        check(true, 'pre-checkout con 99 Stars se rechaza');
        mock.enqueue({ pre_checkout_query: { id: 'pre_ok_1', from: { id: TELEGRAM_USER.id }, currency: 'XTR', total_amount: 100, invoice_payload: payload1 } });
        await waitFor(() => mock.callsFor('answerPreCheckoutQuery').find(call => call.body.pre_checkout_query_id === 'pre_ok_1' && call.body.ok === true),
            'pre-checkout correcto aprobado');
        check(true, 'pre-checkout correcto se aprueba sin entregar todavía');
        check((await economyCredits()) === 100, 'pre-checkout por sí solo no acredita $CR');

        const successfulPayment1 = {
            currency: 'XTR',
            total_amount: 100,
            invoice_payload: payload1,
            telegram_payment_charge_id: 'charge_primary_1',
            provider_payment_charge_id: 'provider_primary_1'
        };
        mock.enqueue({
            message: {
                message_id: 1,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                successful_payment: successfulPayment1
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call => String(call.body.text || '').includes(order1.id)
            && String(call.body.text || '').includes('COMPRA CON TELEGRAM STARS CONFIRMADA')),
            'el bot confirma la primera compra Stars');
        check(true, 'successful_payment llega al bot y confirma la compra');

        result = await requestJson(base, `/api/telegram-stars/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.order.status === 'claimed'
            && result.data.order.telegramPaymentChargeId === 'charge_primary_1'
            && result.data.economy.garage.credits === 1100,
            'status devuelve claimed y el garaje autoritativo con 1.100 $CR', result.data);
        result = await post('/api/purchases/claim', { userId, orderId: order1.id });
        check(result.status === 200 && result.data.alreadyClaimed === true && result.data.economy.garage.credits === 1100,
            'un claim genérico posterior reconoce la entrega Stars sin duplicarla', result.data);

        const confirmedMessagesBeforeDuplicate = mock.callsFor('sendMessage')
            .filter(call => String(call.body.text || '').includes(order1.id)).length;
        mock.enqueue({
            message: {
                message_id: 2,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                successful_payment: successfulPayment1
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').filter(call => String(call.body.text || '').includes(order1.id)).length > confirmedMessagesBeforeDuplicate,
            'la actualización duplicada se procesa');
        check((await economyCredits()) === 1100, 'la misma successful_payment duplicada no duplica $CR');

        const duplicateCharge = 'charge_duplicate_distinct_1';
        mock.enqueue({
            message: {
                message_id: 3,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                successful_payment: { ...successfulPayment1, telegram_payment_charge_id: duplicateCharge, provider_payment_charge_id: 'provider_duplicate_1' }
            }
        });
        await waitFor(() => mock.callsFor('refundStarPayment').find(call => call.body.telegram_payment_charge_id === duplicateCharge),
            'reembolso automático del cargo duplicado');
        const refundCall = mock.callsFor('refundStarPayment').find(call => call.body.telegram_payment_charge_id === duplicateCharge);
        check(Number(refundCall.body.user_id) === TELEGRAM_USER.id, 'un segundo cargo distinto para el mismo pedido se reembolsa al pagador', refundCall.body);
        check((await economyCredits()) === 1100, 'el cargo duplicado reembolsado no acredita una segunda vez');

        mock.enqueue({
            message: {
                message_id: 4,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                refunded_payment: { ...successfulPayment1, telegram_payment_charge_id: duplicateCharge, provider_payment_charge_id: 'provider_duplicate_1' }
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call => String(call.body.text || '').includes('REEMBOLSO DE TELEGRAM STARS REGISTRADO')
            && String(call.body.text || '').includes(order1.id)), 'refunded_payment del duplicado registrado');
        check((await economyCredits()) === 1100, 'refunded_payment del duplicado no altera la entrega principal');

        // ===== NFT: starter excluido, caja -> coche jugable -> registro =====
        result = await requestJson(base, `/api/nft/cars?userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.entries.length === 0, 'con solo el starter no hay coches registrables NFT', result.data.entries);
        const starter = result.data.economy.garage.garage[0];
        result = await post('/api/nft/prepare-conversion', { userId, instanceId: starter.instanceId });
        check(result.status === 422 && result.data.error === 'car_not_nft_eligible', 'el Apex Cadet inicial permanece NO-NFT', { status: result.status, error: result.data && result.data.error });

        result = await post('/api/economy/action', {
            userId,
            action: 'open_crate',
            args: { crateKey: 'bronze' },
            idempotencyKey: 'test-v105-open-bronze-1'
        });
        check(result.status === 200 && result.data.ok === true && result.data.result && result.data.result.car,
            'la caja Rookie se abre en servidor con el saldo Stars', result.data);
        const crateCar = result.data.result.car;
        const creditsAfterCrate = Number(result.data.economy.garage.credits);
        check(creditsAfterCrate === 100, 'abrir la caja de 1.000 $CR deja el saldo correcto', result.data.economy.garage);
        check(crateCar.mintNumber === 0 && crateCar.tokenHash === 'OFF-CHAIN',
            'el coche nuevo no inventa número de mint ni hash blockchain', crateCar);

        result = await requestJson(base, `/api/nft/cars?userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.entries.length === 1, 'el coche de caja aparece en el registro global', result.data.entries);
        const registryEntry = result.data.entries[0];
        const registry = registryEntry.registry;
        check(registry.carInstanceId === crateCar.instanceId && registry.serial === 1
            && registry.registryId === 'APEX-CAR-000001' && registry.nftIndex === 0
            && registry.status === 'offchain' && registry.snapshot
            && registry.snapshot.modelId === crateCar.modelId
            && registry.snapshot.colorName === crateCar.colorName,
            'serie global 1 con snapshot de identidad base', registry);
        const registeredCar = result.data.economy.garage.garage.find(car => car.instanceId === crateCar.instanceId);
        check(registeredCar.globalSerial === 1 && registeredCar.nftRegistryId === 'APEX-CAR-000001'
            && registeredCar.chainStatus === 'offchain' && registeredCar.isNft === false,
            'el garaje autoritativo refleja registro off-chain, no un NFT', registeredCar);

        result = await requestJson(base, '/api/nft/metadata/1');
        check(result.status === 404, 'los metadatos públicos no se exponen antes de preparar la conversión', result.data);
        result = await requestJson(base, '/api/nft/collection-metadata');
        check(result.status === 200 && result.data.name === 'Apex Motorsport GT Cars', 'metadatos públicos de colección disponibles', result.data);

        result = await post('/api/nft/prepare-conversion', { userId, instanceId: crateCar.instanceId });
        check(result.status === 200 && result.data.registry.status === 'conversion_prepared'
            && result.data.claim && /^APXNFT-[0-9A-F]{12}$/.test(result.data.claim.claimId)
            && result.data.claim.status === 'prepared'
            && result.data.config.mintingEnabled === false,
            'preparar crea un único claim y sigue sin acuñar', result.data);
        const claimId = result.data.claim.claimId;
        const preparedCar = result.data.economy.garage.garage.find(car => car.instanceId === crateCar.instanceId);
        check(preparedCar.chainStatus === 'conversion_prepared' && preparedCar.isNft === false,
            'el coche preparado sigue jugable y no se marca NFT', preparedCar);

        result = await post('/api/nft/prepare-conversion', { userId, instanceId: crateCar.instanceId });
        check(result.status === 200 && result.data.alreadyPrepared === true && result.data.claim.claimId === claimId,
            'preparar dos veces devuelve el mismo claim único', result.data);
        result = await requestJson(base, '/api/nft/metadata/1');
        check(result.status === 200 && String(result.data.name || '').includes('#1')
            && result.data.attributes.some(attr => attr.trait_type === 'Registry ID' && attr.value === 'APEX-CAR-000001'),
            'tras preparar, los metadatos públicos muestran la identidad global sin datos de cuenta', result.data);
        check(!JSON.stringify(result.data).includes(userId) && !JSON.stringify(result.data).includes(crateCar.instanceId),
            'los metadatos públicos no filtran ID de cuenta ni instancia interna');

        result = await requestJson(base, `/api/nft/claims/${claimId}?userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.claim.claimId === claimId, 'el propietario puede consultar su claim', result.data);
        result = await requestJson(base, `/api/nft/claims/${claimId}?userId=${encodeURIComponent(outsiderId)}`, { headers: outsiderHeaders });
        check(result.status === 404, 'otro usuario no puede consultar el claim', result.data);
        result = await post('/api/nft/prepare-conversion', { userId: outsiderId, instanceId: crateCar.instanceId }, outsiderHeaders);
        check(result.status === 404 && result.data.error === 'car_not_found', 'otro usuario no puede preparar el coche ajeno', result.data);

        result = await post('/api/nft/cancel-conversion', { userId, instanceId: crateCar.instanceId });
        check(result.status === 200 && result.data.registry.status === 'offchain' && result.data.claim.status === 'cancelled',
            'cancelar devuelve el registro a off-chain y cancela el claim', result.data);
        result = await requestJson(base, '/api/nft/metadata/1');
        check(result.status === 404, 'al cancelar dejan de exponerse los metadatos de conversión', result.data);
        result = await post('/api/nft/prepare-conversion', { userId, instanceId: crateCar.instanceId });
        check(result.status === 200 && result.data.claim.claimId === claimId && result.data.claim.status === 'prepared',
            'volver a preparar reutiliza la misma fila de claim por serie', result.data);

        // ===== Segundo paquete: pagador/importe incorrectos no entregan =====
        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_500' });
        check(result.status === 200 && result.data.order && result.data.order.priceStars === 500, 'segundo pedido Stars de 500 creado', result.data);
        const order2 = result.data.order;
        const payload2 = `apex_stars_v1:${order2.id}`;
        const wrongPayerCharge = 'charge_wrong_payer_1';
        mock.enqueue({
            message: {
                message_id: 10,
                date: Math.floor(Date.now() / 1000),
                chat: { id: OUTSIDER_USER.id, type: 'private' },
                from: { id: OUTSIDER_USER.id, first_name: 'Otro' },
                successful_payment: {
                    currency: 'XTR', total_amount: 500, invoice_payload: payload2,
                    telegram_payment_charge_id: wrongPayerCharge, provider_payment_charge_id: 'provider_wrong_payer'
                }
            }
        });
        await waitFor(() => mock.callsFor('refundStarPayment').find(call => call.body.telegram_payment_charge_id === wrongPayerCharge),
            'reembolso del pago de otro usuario');
        check((await economyCredits()) === creditsAfterCrate, 'un successful_payment de otro pagador no acredita al dueño del pedido');

        const wrongAmountCharge = 'charge_wrong_amount_1';
        mock.enqueue({
            message: {
                message_id: 11,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                successful_payment: {
                    currency: 'XTR', total_amount: 499, invoice_payload: payload2,
                    telegram_payment_charge_id: wrongAmountCharge, provider_payment_charge_id: 'provider_wrong_amount'
                }
            }
        });
        await waitFor(() => mock.callsFor('refundStarPayment').find(call => call.body.telegram_payment_charge_id === wrongAmountCharge),
            'reembolso del importe incorrecto');
        check((await economyCredits()) === creditsAfterCrate, 'un importe Stars incorrecto no acredita $CR');

        mock.enqueue({ pre_checkout_query: { id: 'pre_ok_2', from: { id: TELEGRAM_USER.id }, currency: 'XTR', total_amount: 500, invoice_payload: payload2 } });
        await waitFor(() => mock.callsFor('answerPreCheckoutQuery').find(call => call.body.pre_checkout_query_id === 'pre_ok_2' && call.body.ok === true),
            'pre-checkout del segundo pedido aprobado');
        mock.enqueue({
            message: {
                message_id: 12,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                successful_payment: {
                    currency: 'XTR', total_amount: 500, invoice_payload: payload2,
                    telegram_payment_charge_id: 'charge_primary_2', provider_payment_charge_id: 'provider_primary_2'
                }
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call => String(call.body.text || '').includes(order2.id)
            && String(call.body.text || '').includes('COMPRA CON TELEGRAM STARS CONFIRMADA')),
            'el bot confirma el segundo pedido');
        result = await requestJson(base, `/api/telegram-stars/status?orderId=${encodeURIComponent(order2.id)}&userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.data.order.status === 'claimed' && result.data.economy.garage.credits === creditsAfterCrate + 5000,
            'tras rechazar cargos inválidos, el pago correcto acredita 5.000 $CR una vez', result.data);
        const creditsAfterSecondOrder = creditsAfterCrate + 5000;

        result = await requestJson(base, `/api/telegram-stars/list?userId=${encodeURIComponent(userId)}&limit=50`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.orders.some(entry => entry.order.id === order1.id)
            && result.data.orders.some(entry => entry.order.id === order2.id),
            'la recuperación Stars lista los pedidos del propietario', result.data.orders);

        // Caducidad y máximo de pedidos pendientes.
        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_1000' });
        const expiringOrder = result.data.order;
        check(result.status === 200 && expiringOrder, 'pedido para caducidad creado', result.data);
        const mutableDb = new SqliteDatabase(dbFile);
        try {
            mutableDb.pragma('busy_timeout = 5000');
            const row = mutableDb.prepare('SELECT data_json FROM purchases WHERE order_id = ?').get(expiringOrder.id);
            const order = JSON.parse(row.data_json);
            order.expiresAtMs = 1;
            order.expiresAt = new Date(1).toISOString();
            mutableDb.prepare('UPDATE purchases SET data_json = ?, updated_at = ? WHERE order_id = ?')
                .run(JSON.stringify(order), new Date().toISOString(), expiringOrder.id);
        } finally {
            mutableDb.close();
        }
        result = await requestJson(base, `/api/telegram-stars/status?orderId=${encodeURIComponent(expiringOrder.id)}&userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
        check(result.status === 200 && result.data.order.status === 'expired', 'un pedido Stars vencido pasa a expired sin entregar', result.data.order);
        check((await economyCredits()) === creditsAfterSecondOrder, 'la caducidad no cambia el saldo');

        for (const packageId of ['cr_stars_100', 'cr_stars_500', 'cr_stars_1000']) {
            result = await post('/api/telegram-stars/create', { userId, packageId });
            check(result.status === 200 && result.data.ok === true, `pedido pendiente ${packageId} dentro del cupo`, result.data);
        }
        result = await post('/api/telegram-stars/create', { userId, packageId: 'cr_stars_2500' });
        check(result.status === 429 && result.data.error === 'too_many_pending_orders', 'el cuarto pedido Stars pendiente -> 429', result.data);

        // Admin: recheck y reembolso del cargo principal solo con permiso expreso.
        result = await post('/api/admin/purchases/refund-stars', { orderId: order1.id, chargeId: 'charge_primary_1' }, {});
        check(result.status === 403, 'refund-stars sin token admin -> 403', result.data);
        const primaryRefundCallsBefore = mock.callsFor('refundStarPayment')
            .filter(call => call.body.telegram_payment_charge_id === 'charge_primary_1').length;
        result = await post('/api/admin/purchases/refund-stars', { orderId: order1.id, chargeId: 'charge_primary_1' }, { 'x-admin-token': ADMIN_TOKEN });
        check(result.status === 409 && result.data.results[0].error === 'claimed_primary_refund_requires_force',
            'el cargo principal ya entregado no se reembolsa sin autorización expresa', result.data);
        check(mock.callsFor('refundStarPayment').filter(call => call.body.telegram_payment_charge_id === 'charge_primary_1').length === primaryRefundCallsBefore,
            'la protección admin no llama a refundStarPayment');
        result = await post('/api/admin/purchases/recheck', { orderId: order1.id }, { 'x-admin-token': ADMIN_TOKEN });
        check(result.status === 200 && result.data.found === true
            && result.data.charges.some(charge => charge.chargeId === 'charge_primary_1' && charge.status === 'fulfilled')
            && result.data.charges.some(charge => charge.chargeId === duplicateCharge && charge.status === 'refunded'),
            'admin recheck muestra cargo principal entregado y duplicado reembolsado', result.data);

        result = await post('/api/admin/purchases/refund-stars', {
            orderId: order1.id,
            chargeId: 'charge_primary_1',
            allowClaimedPrimary: true
        }, { 'x-admin-token': ADMIN_TOKEN });
        check(result.status === 200 && result.data.ok === true, 'con autorización expresa sí puede reembolsarse el cargo principal', result.data);
        mock.enqueue({
            message: {
                message_id: 20,
                date: Math.floor(Date.now() / 1000),
                chat: { id: TELEGRAM_USER.id, type: 'private' },
                from: { id: TELEGRAM_USER.id, first_name: 'Piloto' },
                refunded_payment: successfulPayment1
            }
        });
        result = await waitFor(async () => {
            const checked = await requestJson(base, `/api/telegram-stars/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(userId)}`, { headers: telegramHeaders });
            return checked.data && checked.data.order && checked.data.order.refundReviewRequired === true ? checked : null;
        }, 'reembolso principal marcado para revisión');
        check(result.data.order.status === 'claimed' && (await economyCredits()) === creditsAfterSecondOrder,
            'un reembolso tras entregar no hace clawback automático: queda para revisión', result.data.order);

        // ===== Tickets privados de soporte en el bot =====
        result = await requestJson(base, '/api/config');
        check(result.status === 200 && result.data.support && result.data.support.tickets
            && result.data.support.tickets.ready === true,
            '/api/config anuncia tickets privados listos sin filtrar el ID del operador', result.data.support);
        check(!JSON.stringify(result.data.support).includes(String(SUPPORT_OPERATOR_USER.id)),
            '/api/config no expone el ID del operador de soporte');

        const privateMessage = (user, messageId, text) => ({
            message: {
                message_id: messageId,
                date: Math.floor(Date.now() / 1000),
                chat: { id: user.id, type: 'private' },
                from: { id: user.id, first_name: user.first_name, username: user.username },
                text
            }
        });
        const supportSecretText = 'TicketSupportPrivateBodyXYZ';
        const followupSecretText = 'TicketFollowupPrivateBodyXYZ';
        const operatorSecretReply = 'OperatorReplyPrivateBodyXYZ';

        mock.enqueue(privateMessage(TELEGRAM_USER, 88, '/support'));
        const supportMenu = await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes('Hablar con soporte')
            && JSON.stringify(call.body.reply_markup || {}).includes('cmd_ticket')), 'menú de soporte con botón de ticket');
        check(Boolean(supportMenu), '/support ofrece “Escribir a soporte” cuando los tickets están listos');
        mock.enqueue({
            callback_query: {
                id: 'callback_ticket_prompt',
                from: { id: TELEGRAM_USER.id, first_name: TELEGRAM_USER.first_name, username: TELEGRAM_USER.username },
                message: { message_id: 89, chat: { id: TELEGRAM_USER.id, type: 'private' } },
                data: 'cmd_ticket'
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes('ESCRIBIR A SOPORTE')), 'el botón pide el texto del ticket en un solo mensaje');

        mock.enqueue(privateMessage(TELEGRAM_USER, 90, `${supportSecretText} necesito ayuda con una compra`));
        const operatorDelivery = await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === String(SUPPORT_OPERATOR_USER.id)
            && String(call.body.text || '').includes('NUEVO TICKET DE SOPORTE')
            && String(call.body.text || '').includes(supportSecretText)), 'entrega del ticket al operador');
        const ticketMatch = /SUP-[0-9A-F]{8}/.exec(String(operatorDelivery.body.text || ''));
        check(Boolean(ticketMatch), 'el operador recibe una referencia SUP-…', operatorDelivery.body);
        const supportTicketId = ticketMatch[0];
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes('Ticket creado')
            && String(call.body.text || '').includes(supportTicketId)), 'confirmación del ticket al jugador');

        mock.enqueue(privateMessage(TELEGRAM_USER, 91, `/ticket ${followupSecretText} añado más datos al mismo problema`));
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === String(SUPPORT_OPERATOR_USER.id)
            && String(call.body.text || '').includes(followupSecretText)
            && String(call.body.text || '').includes(supportTicketId)), 'el follow-up usa el mismo ticket abierto');

        mock.enqueue(privateMessage(OUTSIDER_USER, 92, `/reply ${supportTicketId} respuesta no autorizada`));
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === outsiderId
            && String(call.body.text || '').includes('solo puede usarlo el operador')), 'un no-operador no puede responder tickets');

        const wrongChatSecretReply = 'OperatorReplyFromWrongChatXYZ';
        mock.enqueue({
            message: {
                message_id: 96,
                date: Math.floor(Date.now() / 1000),
                chat: { id: -100777888999, type: 'group' },
                from: { id: SUPPORT_OPERATOR_USER.id, first_name: SUPPORT_OPERATOR_USER.first_name, username: SUPPORT_OPERATOR_USER.username },
                text: `/reply ${supportTicketId} ${wrongChatSecretReply}`
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === '-100777888999'
            && String(call.body.text || '').includes('usa ese comando en tu chat privado')), 'el operador no puede responder desde un grupo no configurado');
        check(!mock.callsFor('sendMessage').some(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes(wrongChatSecretReply)),
            'una respuesta desde un grupo no configurado no llega al jugador');

        mock.enqueue(privateMessage(SUPPORT_OPERATOR_USER, 93, `/reply ${supportTicketId} ${operatorSecretReply} ya lo estamos revisando`));
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes('RESPUESTA DE SOPORTE')
            && String(call.body.text || '').includes(operatorSecretReply)), 'respuesta del operador entregada al jugador');
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === String(SUPPORT_OPERATOR_USER.id)
            && String(call.body.text || '').includes('Respuesta enviada al jugador')), 'acuse de respuesta al operador');

        mock.enqueue(privateMessage(SUPPORT_OPERATOR_USER, 94, `/close ${supportTicketId} Incidencia revisada en el servidor`));
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === userId
            && String(call.body.text || '').includes('TICKET CERRADO')
            && String(call.body.text || '').includes(supportTicketId)), 'cierre del ticket avisado al jugador');
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === String(SUPPORT_OPERATOR_USER.id)
            && String(call.body.text || '').includes('cerrado y jugador avisado')), 'acuse de cierre al operador');

        const groupSecretText = 'GroupTicketMustNotBeForwardedXYZ';
        mock.enqueue({
            message: {
                message_id: 95,
                date: Math.floor(Date.now() / 1000),
                chat: { id: -100777888999, type: 'group' },
                from: { id: TELEGRAM_USER.id, first_name: TELEGRAM_USER.first_name, username: TELEGRAM_USER.username },
                text: `/ticket ${groupSecretText}`
            }
        });
        await waitFor(() => mock.callsFor('sendMessage').find(call =>
            String(call.body.chat_id) === '-100777888999'
            && String(call.body.text || '').includes('Por privacidad')), 'los tickets solo se aceptan en chat privado');
        check(!mock.callsFor('sendMessage').some(call =>
            String(call.body.chat_id) === String(SUPPORT_OPERATOR_USER.id)
            && String(call.body.text || '').includes(groupSecretText)),
            'un intento desde grupo no reenvía el cuerpo al operador');

        const lastUpdateId = mock.lastUpdateId();
        await waitFor(() => mock.getUpdatesOffsets.some(offset => offset > lastUpdateId), 'el polling confirma el último update');
        await stopChild(proc);

        const diskDb = new SqliteDatabase(dbFile, { readonly: true });
        try {
            const schema = diskDb.prepare('SELECT MAX(version) AS version FROM schema_migrations').get();
            check(Number(schema.version) >= 105, 'la migración SQLite v105 queda registrada', schema);
            const tables = diskDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
            check(tables.includes('processed_payment_charges') && tables.includes('nft_car_registry') && tables.includes('nft_mint_claims'),
                'existen tablas de cargos, registro NFT y claims', tables);
            const charges = diskDb.prepare("SELECT charge_id, status FROM processed_payment_charges WHERE provider = 'telegram_stars' ORDER BY charge_id").all();
            check(charges.filter(charge => charge.charge_id === 'charge_primary_1').length === 1
                && charges.filter(charge => charge.charge_id === duplicateCharge).length === 1,
                'cada cargo Telegram procesado existe una sola vez', charges);
            const registryRows = diskDb.prepare('SELECT serial, registry_id, status FROM nft_car_registry ORDER BY serial').all();
            const claimRows = diskDb.prepare('SELECT claim_id, registry_serial, status FROM nft_mint_claims ORDER BY registry_serial').all();
            check(registryRows.length === 1 && registryRows[0].registry_id === 'APEX-CAR-000001'
                && claimRows.length === 1 && claimRows[0].registry_serial === 1,
                'SQLite conserva un registro y un claim por coche', { registryRows, claimRows });
            const offsetRow = diskDb.prepare('SELECT value_json FROM meta WHERE key = ?').get('telegramBotLastUpdateId');
            check(offsetRow && Number(JSON.parse(offsetRow.value_json)) >= lastUpdateId,
                'el offset del bot queda persistido para no reprocesar pagos al reiniciar', offsetRow);
            const rawDbText = diskDb.prepare('SELECT garage_json FROM economy_profiles WHERE user_id = ?').get(userId).garage_json;
            check(!rawDbText.includes(BOT_TOKEN), 'el BOT_TOKEN no se guarda en el perfil');
            const supportTicketRow = diskDb.prepare('SELECT value_json FROM meta WHERE key = ?').get(`supportTicket:${supportTicketId}`);
            const supportTicket = supportTicketRow ? JSON.parse(supportTicketRow.value_json) : null;
            check(Boolean(supportTicket && supportTicket.status === 'closed' && supportTicket.messageCount === 2),
                'SQLite conserva solo metadatos/estado del ticket cerrado', supportTicket);
            const serializedSupportState = JSON.stringify({
                meta: diskDb.prepare("SELECT key, value_json FROM meta WHERE key LIKE 'supportTicket%'").all(),
                audit: diskDb.prepare("SELECT event, details_json FROM audit_events WHERE event LIKE 'SUPPORT_TICKET%'").all()
            });
            check(!serializedSupportState.includes(supportSecretText)
                && !serializedSupportState.includes(followupSecretText)
                && !serializedSupportState.includes(operatorSecretReply),
                'el texto de tickets/respuestas no se guarda en SQLite ni en auditoría');
            check(serializedSupportState.includes('SUPPORT_TICKET_REPLY_UNAUTHORIZED'),
                'un intento de respuesta no autorizado queda auditado sin su texto');
        } finally {
            diskDb.close();
        }

        console.log('✅ TEST STARS/NFT v105 SUPERADO');
    } catch (error) {
        console.error(error.stack || error.message);
        console.error('--- Log del servidor v105 (cola) ---');
        console.error(serverLog.slice(-5000));
        process.exitCode = 1;
    } finally {
        await stopChild(proc);
        await new Promise(resolve => mock.server.close(resolve));
        removeIfExists(dbFile);
    }
})();
