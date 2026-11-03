// ===== TEST v104: compras de $CR con TON (verificación on-chain simulada) =====
// Arranca un servidor aislado con TON_MOCK_LEDGER_FILE (libro mayor ficticio
// que SOLO se honra fuera de producción) y verifica el flujo completo:
// paquetes/tesorería, auth de dispositivo, creación de pedido, pago no
// detectado con importe insuficiente, detección con importe correcto,
// claim único, repetición segura del claim, reutilización de tx bloqueada y
// límite de pedidos pendientes. La cotización se fija a 5 USDT/TON solo
// para esta prueba: así 0.01 TON = 50 $CR y el cofre de 1 USDT = 0.2 TON.
// Uso: node test_purchases.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TREASURY = 'UQD4ivLM7PJ7XpX_CflUUhoZW361xvOH4WP869C9WghJAN4X';

function deviceSecretFor(userId) {
    return `test-device-secret-v103-${String(userId || 'anonymous')}-0123456789abcdef`;
}

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 700)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

async function requestJson(base, requestPath, options = {}) {
    const response = await fetch(base + requestPath, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { status: response.status, data, text };
}

function postJson(body, headers = {}) {
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

function getWithSecret(userId) {
    return { headers: { 'X-Device-Secret': deviceSecretFor(userId) } };
}

async function waitForServer(proc, base) {
    for (let i = 0; i < 50; i++) {
        try {
            const response = await fetch(base + '/healthz');
            if (response.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor de compras murió al arrancar');
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Timeout esperando al servidor de compras');
}

async function stopServer(proc) {
    if (!proc || proc.exitCode !== null) return;
    proc.kill('SIGTERM');
    await Promise.race([
        new Promise(resolve => proc.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    if (proc.exitCode === null) proc.kill('SIGKILL');
}

function removeIfExists(file) {
    try { fs.unlinkSync(file); } catch (e) {}
}

(async () => {
    const stamp = Date.now();
    const dbFile = path.join(os.tmpdir(), `apex_purchases_db_${stamp}.sqlite`);
    const ledgerFile = path.join(os.tmpdir(), `apex_ton_mock_ledger_${stamp}.json`);
    fs.writeFileSync(ledgerFile, '[]');
    const port = 34100 + Math.floor(Math.random() * 800);
    const base = `http://127.0.0.1:${port}`;

    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            DB_FILE: dbFile,
            NODE_ENV: 'test',
            BOT_TOKEN: '123456:TEST_TOKEN_FOR_HMAC_ONLY',
            ALLOW_INSECURE_DEV_AUTH: 'false',
            ENABLE_LEGACY_WAGER_API: 'false',
            RENDER_EXTERNAL_URL: '',
            TON_MOCK_LEDGER_FILE: ledgerFile,
            TON_USDT_RATE_OVERRIDE: '5'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverLog = '';
    proc.stdout.on('data', chunk => { serverLog += chunk; });
    proc.stderr.on('data', chunk => { serverLog += chunk; });

    const buyerId = 'usr_test_buyer_v103';
    const outsiderId = 'usr_test_outsider_v103';
    const writeLedger = entries => fs.writeFileSync(ledgerFile, JSON.stringify(entries));
    const nowSec = () => Math.floor(Date.now() / 1000);

    try {
        await waitForServer(proc, base);

        // Paquetes públicos y tesorería oficial
        let result = await requestJson(base, '/api/purchases/packages');
        check(result.status === 200 && result.data.treasuryAddress === TREASURY, 'packages expone la tesorería oficial', result.data);
        check(result.data.crPerUsdt === 1000 && result.data.tonUsdtRate === '5' && result.data.rateSource === 'env_override', 'cotización anclada a 1.000 $CR = 1 USDT', result.data);
        check(Array.isArray(result.data.packages) && result.data.packages.length === 3, 'hay 3 paquetes de $CR', result.data.packages);
        const packMini = result.data.packages.find(pkg => pkg.id === 'cr_ton_001');
        check(packMini && packMini.ton === '0.01' && packMini.amountNanotons === '10000000' && packMini.cr === 50 && packMini.priceUsdt === '0.05', 'mínimo 0.01 TON = 50 $CR a 5 USDT/TON', packMini);
        const packOne = result.data.packages.find(pkg => pkg.id === 'cr_ton_1');
        check(packOne && packOne.amountNanotons === '1000000000' && packOne.cr === 5000, '1 TON = 5.000 $CR solo a 5 USDT/TON', packOne);
        check(Array.isArray(result.data.crates) && result.data.crates.length === 3 && result.data.products.length === 6, 'hay 3 cofres pagaderos directamente en TON', result.data.crates);
        const crateBronzeProduct = result.data.crates.find(product => product.id === 'crate_bronze');
        check(crateBronzeProduct && crateBronzeProduct.productType === 'crate' && crateBronzeProduct.crateId === 'bronze' && crateBronzeProduct.priceUsdt === '1' && crateBronzeProduct.priceCr === 1000 && crateBronzeProduct.amountNanotons === '200000000' && crateBronzeProduct.amountTon === '0.2', 'cofre Rookie: 1 USDT = 1.000 $CR = 0.2 TON a 5 USDT/TON', crateBronzeProduct);
        const crateGoldProduct = result.data.crates.find(product => product.id === 'crate_gold');
        check(crateGoldProduct && crateGoldProduct.priceUsdt === '25' && crateGoldProduct.amountNanotons === '5000000000', 'cofre Apex Pro: 25 USDT = 5 TON a 5 USDT/TON', crateGoldProduct);

        // Sin credencial de dispositivo no se puede crear un pedido
        result = await requestJson(base, '/api/purchases/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: buyerId, packageId: 'cr_ton_001' })
        });
        check(result.status === 401, 'crear pedido sin secreto de dispositivo -> 401', result.data);

        // Paquete inexistente
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_millon' }));
        check(result.status === 422 && result.data.error === 'invalid_package', 'paquete inválido -> 422', result.data);

        // Crear pedido válido
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_ton_001' }));
        check(result.status === 200 && result.data.ok === true && result.data.order, 'pedido creado', result.data);
        const order1 = result.data.order;
        const payment1 = result.data.payment;
        check(/^APEX-[0-9A-F]{12}$/.test(order1.id), 'el id de pedido sirve como comentario TON', order1);
        check(order1.status === 'pending' && order1.productType === 'cr' && order1.cr === 50 && order1.amountNanotons === '10000000' && order1.tonUsdtRate === '5' && order1.priceUsdt === '0.05', 'pedido mínimo pending con cotización bloqueada', order1);
        check(payment1.address === TREASURY && payment1.comment === order1.id, 'el pago va a la tesorería con el comentario del pedido', payment1);
        check(payment1.tonkeeperUrl.includes('/transfer/' + TREASURY) && payment1.tonkeeperUrl.includes('amount=10000000') && payment1.tonkeeperUrl.includes(encodeURIComponent(order1.id)), 'enlace Tonkeeper con importe y comentario', payment1);
        check(payment1.tonUrl.startsWith('ton://transfer/' + TREASURY), 'enlace ton:// alternativo', payment1);

        // Otro usuario no puede ver ni reclamar el pedido (404 sin enumeración)
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(outsiderId)}`, getWithSecret(outsiderId));
        check(result.status === 404, 'status de un pedido ajeno -> 404', result.data);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: outsiderId, orderId: order1.id }));
        check(result.status === 404, 'claim de un pedido ajeno -> 404', result.data);

        // Sin pago on-chain: sigue pending y el claim se rechaza
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.status === 200 && result.data.order.status === 'pending', 'sin pago, el pedido sigue pending', result.data.order);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: order1.id }));
        check(result.status === 409 && result.data.error === 'order_not_paid', 'claim antes de pagar -> 409', result.data);

        // Pago con importe insuficiente no acredita
        writeLedger([{ comment: order1.id, amountNanotons: '9000000', txHash: 'txhash_insuficiente', sender: '0:sender', timestamp: nowSec() }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'pending', 'pago de 0.009 TON para el mínimo de 0.01 no acredita', result.data.order);

        // Pago correcto: status pasa a paid y guarda la tx
        writeLedger([{ comment: order1.id, amountNanotons: '10000000', txHash: 'txhash_test_1', sender: '0:sender', timestamp: nowSec() }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order1.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'paid' && result.data.order.txHash === 'txhash_test_1', 'pago correcto detectado on-chain (mock) -> paid', result.data.order);

        // Claim entrega los $CR una vez; repetirlo es seguro y no duplica en servidor
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: order1.id }));
        check(result.status === 200 && result.data.cr === 50 && result.data.productType === 'cr' && result.data.alreadyClaimed === false
            && result.data.economy && result.data.economy.garage.credits === 150,
            'claim acredita 50 $CR en el perfil sellado (100 inicial + 50)', result.data);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: order1.id }));
        check(result.status === 200 && result.data.cr === 50 && result.data.alreadyClaimed === true
            && result.data.economy && result.data.economy.garage.credits === 150,
            'claim repetido responde alreadyClaimed sin duplicar el saldo', result.data);

        // Una misma tx no puede pagar un segundo pedido
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_ton_1' }));
        const order2 = result.data.order;
        check(order2 && order2.amountNanotons === '1000000000', 'segundo pedido de 1 TON creado', order2);
        writeLedger([{ comment: order2.id, amountNanotons: '1000000000', txHash: 'txhash_test_1', sender: '0:sender', timestamp: nowSec() }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order2.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'pending', 'reutilizar la tx del primer pago queda bloqueado', result.data.order);

        // Con su propia tx sí se acredita
        writeLedger([{ comment: order2.id, amountNanotons: '1000000000', txHash: 'txhash_test_2', sender: '0:sender', timestamp: nowSec() }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(order2.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'paid', 'segundo pedido pagado con su propia tx', result.data.order);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: order2.id }));
        check(result.status === 200 && result.data.cr === 5000 && result.data.alreadyClaimed === false
            && result.data.economy && result.data.economy.garage.credits === 5150,
            'claim del segundo pedido suma 5.000 $CR al perfil sellado', result.data);

        // Cofre directo en TON: la cotización bloquea 1 USDT a 0.2 TON
        // (solo porque esta prueba fija TON a 5 USDT). El claim no entrega
        // $CR, sino el derecho a abrir exactamente ese cofre.
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'crate_bronze' }));
        check(result.status === 200 && result.data.ok === true && result.data.order, 'pedido de cofre TON creado', result.data);
        const crateOrder = result.data.order;
        check(crateOrder.productType === 'crate' && crateOrder.crateId === 'bronze' && crateOrder.cr === 0 && crateOrder.priceUsdt === '1' && crateOrder.priceCr === 1000 && crateOrder.amountTon === '0.2' && crateOrder.amountNanotons === '200000000', 'cofre Rookie cotizado en TON desde 1 USDT', crateOrder);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: crateOrder.id }));
        check(result.status === 409 && result.data.error === 'order_not_paid', 'claim de cofre antes de pagar -> 409', result.data);

        // Una transacción fechada después de la ventana de cotización no
        // puede aprovechar un importe calculado con un precio antiguo.
        writeLedger([{ comment: crateOrder.id, amountNanotons: '200000000', txHash: 'txhash_fuera_de_ventana', sender: '0:sender', timestamp: nowSec() + 2 * 60 * 60 }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(crateOrder.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'pending', 'tx fuera de la ventana de cotización no acredita', result.data.order);

        writeLedger([{ comment: crateOrder.id, amountNanotons: '200000000', txHash: 'txhash_test_crate', sender: '0:sender', timestamp: nowSec() }]);
        result = await requestJson(base, `/api/purchases/status?orderId=${encodeURIComponent(crateOrder.id)}&userId=${encodeURIComponent(buyerId)}`, getWithSecret(buyerId));
        check(result.data.order.status === 'paid' && result.data.order.txHash === 'txhash_test_crate', 'pago directo del cofre detectado -> paid', result.data.order);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: crateOrder.id }));
        check(result.status === 200 && result.data.cr === 0 && result.data.productType === 'crate' && result.data.crateId === 'bronze' && result.data.alreadyClaimed === false
            && result.data.economyResult && result.data.economyResult.success === true && result.data.economyResult.car
            && result.data.economy && result.data.economy.garage.garage.length === 2 && result.data.economy.garage.credits === 5150,
            'claim abre el cofre en servidor y devuelve el coche, sin entregar $CR', result.data);
        result = await requestJson(base, '/api/purchases/claim', postJson({ userId: buyerId, orderId: crateOrder.id }));
        check(result.status === 200 && result.data.crateId === 'bronze' && result.data.alreadyClaimed === true
            && result.data.economy && result.data.economy.garage.garage.length === 2,
            'claim repetido del cofre devuelve el mismo resultado sin duplicar coches', result.data);

        // Límite de pedidos pendientes por usuario
        for (let i = 0; i < 3; i++) {
            result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_ton_001' }));
            check(result.status === 200, `pedido pendiente ${i + 1}/3 creado`, result.data);
        }
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_ton_001' }));
        check(result.status === 429 && result.data.error === 'too_many_pending_orders', 'el cuarto pedido pendiente -> 429', result.data);

        // Los pending caducados dejan de consumir el cupo activo. Se simula
        // el paso del tiempo envejeciendo sus filas en SQLite (WAL permite
        // esta escritura acotada mientras el servidor sigue en marcha).
        const SqliteDatabase = require('better-sqlite3');
        const mutableDb = new SqliteDatabase(dbFile);
        try {
            const rows = mutableDb.prepare("SELECT order_id, data_json FROM purchases WHERE user_id = ? AND status = 'pending'").all(buyerId);
            const update = mutableDb.prepare('UPDATE purchases SET data_json = ?, updated_at = ? WHERE order_id = ?');
            for (const row of rows) {
                const order = JSON.parse(row.data_json);
                order.expiresAtMs = 1;
                order.expiresAt = new Date(1).toISOString();
                update.run(JSON.stringify(order), new Date().toISOString(), row.order_id);
            }
        } finally {
            mutableDb.close();
        }
        result = await requestJson(base, '/api/purchases/create', postJson({ userId: buyerId, packageId: 'cr_ton_001' }));
        check(result.status === 200 && result.data.ok === true, 'los pedidos caducados no bloquean nuevos pedidos', result.data);

        // Persistencia: pedidos, tx y perfil económico en SQLite; sin secretos.
        await stopServer(proc);
        const diskDb = new SqliteDatabase(dbFile, { readonly: true });
        try {
            const firstRow = diskDb.prepare('SELECT status, data_json FROM purchases WHERE order_id = ?').get(order1.id);
            const firstStored = firstRow ? JSON.parse(firstRow.data_json) : null;
            const crateRow = diskDb.prepare('SELECT status, data_json FROM purchases WHERE order_id = ?').get(crateOrder.id);
            const crateStored = crateRow ? JSON.parse(crateRow.data_json) : null;
            const processedRows = diskDb.prepare('SELECT tx_hash, order_id FROM processed_ton_tx').all();
            const processed = Object.fromEntries(processedRows.map(row => [row.tx_hash, row.order_id]));
            const profileRow = diskDb.prepare('SELECT garage_json FROM economy_profiles WHERE user_id = ?').get(buyerId);
            const profile = profileRow ? JSON.parse(profileRow.garage_json) : null;
            check(firstStored && firstStored.status === 'claimed', 'el primer pedido queda claimed en SQLite', firstStored);
            check(crateStored && crateStored.status === 'claimed' && crateStored.productType === 'crate' && crateStored.crateId === 'bronze', 'el pedido del cofre queda claimed en SQLite', crateStored);
            check(processed.txhash_test_1 === order1.id && processed.txhash_test_2 === order2.id && processed.txhash_test_crate === crateOrder.id, 'las tx quedan vinculadas a su pedido', processed);
            check(profile && profile.credits === 5150 && profile.garage.length === 2
                && profile.tonPurchaseOrderIds.includes(order1.id)
                && profile.tonPurchaseOrderIds.includes(order2.id)
                && profile.tonPurchaseOrderIds.includes(crateOrder.id),
                'SQLite conserva una sola aplicación económica por pedido', profile);
        } finally {
            diskDb.close();
        }
        const rawDiskFiles = [dbFile, dbFile + '-wal', dbFile + '-shm']
            .filter(file => fs.existsSync(file))
            .map(file => fs.readFileSync(file).toString('latin1')).join('');
        check(!rawDiskFiles.includes(deviceSecretFor(buyerId)), 'SQLite no contiene el secreto de dispositivo en claro');

        console.log('SUCCESS! PURCHASES v104 TESTS PASSED');
    } catch (error) {
        console.error(serverLog.slice(-2000));
        throw error;
    } finally {
        await stopServer(proc);
        removeIfExists(dbFile);
        removeIfExists(dbFile + '-wal');
        removeIfExists(dbFile + '-shm');
        removeIfExists(ledgerFile);
    }
})().catch(error => {
    console.error(error.message || error);
    process.exit(1);
});
