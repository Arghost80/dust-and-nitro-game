// ===== TEST v106: MERCADO P2P AUTORITATIVO ENTRE CUENTAS =====
// Ejercita la API real con una SQLite temporal: escrow, compra atómica,
// conservación exacta de la progresión del coche, serie/claim NFT,
// cancelación, caducidad, doble compra, piezas sueltas y bloqueos.
// Uso: node test_marketplace.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

const ADMIN_TOKEN = 'test-admin-token-marketplace-v106-0123456789';
const USERS = {
    seller: 'usr_mkt_seller_v106',
    buyer: 'usr_mkt_buyer_v106',
    third: 'usr_mkt_third_v106',
    poor: 'usr_mkt_poor_v106',
    single: 'usr_mkt_single_v106',
    reset: 'usr_mkt_reset_v106',
    room: 'usr_mkt_room_v106'
};

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail !== undefined ? ` :: ${JSON.stringify(detail).slice(0, 1200)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function deviceSecretFor(userId) {
    return `test-device-secret-v106-${String(userId)}-0123456789abcdef`;
}

function headersFor(userId, extra = {}) {
    return { 'X-Device-Secret': deviceSecretFor(userId), ...extra };
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

async function waitForServer(proc, base) {
    for (let i = 0; i < 70; i++) {
        try {
            const response = await fetch(base + '/healthz');
            if (response.ok) return;
        } catch (e) {}
        if (proc.exitCode !== null) throw new Error('El servidor de mercado murió al arrancar');
        await sleep(150);
    }
    throw new Error('Timeout esperando al servidor de mercado');
}

async function startServer(port, dbFile, marketplaceEnabled = true) {
    const proc = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            DB_FILE: dbFile,
            NODE_ENV: 'test',
            BOT_TOKEN: '',
            SERVER_SECRET_KEY: 'test-server-secret-marketplace-v106-0123456789abcdef',
            ADMIN_AUDIT_TOKEN: ADMIN_TOKEN,
            SUPPORT_CONTACT: '@apex_support_test',
            WEBAPP_URL: 'https://apex.example.test',
            ALLOW_INSECURE_DEV_AUTH: 'false',
            ENABLE_LEGACY_WAGER_API: 'false',
            // Solo para poder crear una sala en memoria y verificar la guarda
            // defensiva del mercado; producción mantiene las apuestas apagadas.
            ENABLE_WAGER_STAKES: 'true',
            ENABLE_MARKETPLACE: marketplaceEnabled ? 'true' : 'false',
            NFT_ENTITLEMENTS_ENABLED: 'true',
            TON_NFT_MINTING_ENABLED: 'false',
            TEAM_BOOTSTRAP_TELEGRAM_IDS: '',
            TEAM_ACCOUNT_IDS: '',
            DB_BACKUP_ENABLED: 'false',
            RENDER_EXTERNAL_URL: ''
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
        sleep(1800)
    ]);
    if (server.proc.exitCode === null) server.proc.kill('SIGKILL');
}

function removeIfExists(file) {
    try { fs.unlinkSync(file); } catch (e) {}
    try { fs.unlinkSync(`${file}-wal`); } catch (e) {}
    try { fs.unlinkSync(`${file}-shm`); } catch (e) {}
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function progressionOf(car) {
    if (!car) return null;
    return {
        modelId: car.modelId,
        name: car.name,
        rarity: car.rarity,
        stats: clone(car.stats || {}),
        level: car.level,
        xp: car.xp,
        xpNeeded: car.xpNeeded,
        parts: clone(car.parts || {}),
        claimedMilestones: clone(car.claimedMilestones || []),
        milestoneStats: clone(car.milestoneStats || {}),
        colorName: car.colorName,
        colorHex: car.colorHex,
        tint: car.tint,
        energy: car.energy,
        maxEnergy: car.maxEnergy,
        lastEnergyUpdate: car.lastEnergyUpdate,
        obtainedAt: car.obtainedAt,
        visualId: car.visualId,
        sprite: car.sprite,
        archetype: car.archetype
    };
}

function customCar(baseCar, overrides) {
    return {
        ...clone(baseCar),
        modelId: 'c_01',
        name: 'Monza Hatch Marketplace',
        rarity: 'common',
        isNft: false,
        chainStatus: 'offchain',
        globalSerial: null,
        nftRegistryId: null,
        nftRegistry: null,
        stats: {
            potencia: 2, velocidad: 2, aceleracion: 1, agarre: 1, frenada: 1,
            manejo: 1, turbo: 1, downforce: 1, traccion: 1, ligereza: 1
        },
        level: 3,
        xp: 40,
        xpNeeded: 500,
        parts: {
            ecu: 1, tires: 1, brakes: 1, turbo: 1, chassis: 1,
            speed_power: 1, braking: 1, handling_grip: 1, accel_traction: 1, aero_lightness: 1
        },
        claimedMilestones: [],
        milestoneStats: {},
        energy: 6,
        maxEnergy: 6,
        lastEnergyUpdate: Date.now(),
        obtainedAt: Date.now() - 86400000,
        colorName: 'Rosso Corsa',
        colorHex: '#e53935',
        tint: 0xe53935,
        sprite: 'car_red',
        visualId: 23,
        archetype: 'hot_hatch',
        ...overrides
    };
}

function seedProfiles(dbFile) {
    const db = new SqliteDatabase(dbFile);
    try {
        db.pragma('busy_timeout = 5000');
        const getRow = db.prepare('SELECT garage_json FROM economy_profiles WHERE user_id = ?');
        const update = db.prepare('UPDATE economy_profiles SET garage_json = ?, updated_at = ? WHERE user_id = ?');
        const nowIso = new Date().toISOString();
        const load = userId => JSON.parse(getRow.get(userId).garage_json);
        const save = (userId, garage) => update.run(JSON.stringify(garage), nowIso, userId);

        const seller = load(USERS.seller);
        const starter = seller.garage[0];
        seller.credits = 1000;
        seller.pilotName = 'Vendedora Test';
        seller.partsInventory = { ...(seller.partsInventory || {}), spark_plugs: 8, brake_pads: 4 };
        seller.garage = [
            starter,
            customCar(starter, {
                instanceId: 'sale_car_exact',
                modelId: 'c_01',
                name: 'Monza Hatch Exacto',
                rarity: 'rare',
                stats: { potencia: 3, velocidad: 3, aceleracion: 2, agarre: 2, frenada: 2, manejo: 2, turbo: 1, downforce: 1, traccion: 2, ligereza: 1 },
                level: 27,
                xp: 123,
                xpNeeded: 1400,
                parts: { ecu: 5, tires: 4, brakes: 3, turbo: 2, chassis: 1, speed_power: 5, braking: 4, handling_grip: 3, accel_traction: 2, aero_lightness: 1 },
                claimedMilestones: [10, 20],
                milestoneStats: { potencia: 1, velocidad: 1 },
                energy: 3,
                maxEnergy: 8,
                colorName: 'Verde Vipera',
                colorHex: '#16a34a',
                tint: 0x16a34a
            }),
            customCar(starter, {
                instanceId: 'prepared_car', modelId: 'c_02', name: 'Spa GT Preparado', rarity: 'rare',
                level: 12, xp: 77, xpNeeded: 800,
                parts: { ecu: 3, tires: 3, brakes: 2, turbo: 2, chassis: 2, speed_power: 3, braking: 3, handling_grip: 2, accel_traction: 2, aero_lightness: 2 },
                claimedMilestones: [10], milestoneStats: { manejo: 1 },
                energy: 5, maxEnergy: 8, colorName: 'Azul Mónaco', colorHex: '#2563eb', tint: 0x2563eb
            }),
            customCar(starter, { instanceId: 'cancel_car', modelId: 'c_03', name: 'Cancel GT', level: 8, xp: 21 }),
            customCar(starter, { instanceId: 'expiry_car', modelId: 'c_04', name: 'Expiry GT', level: 6, xp: 19 }),
            customCar(starter, { instanceId: 'blocked_car', modelId: 'c_05', name: 'Blocked GT', level: 9, xp: 31 }),
            customCar(starter, { instanceId: 'race_car', modelId: 'c_06', name: 'Race GT', level: 5, xp: 10, energy: 6, maxEnergy: 6 })
        ];
        seller.equippedInstanceId = starter.instanceId;
        save(USERS.seller, seller);

        const buyer = load(USERS.buyer);
        buyer.credits = 20000;
        buyer.pilotName = 'Comprador Test';
        buyer.partsInventory = { ...(buyer.partsInventory || {}), spark_plugs: 1 };
        buyer.garage = [
            buyer.garage[0],
            customCar(buyer.garage[0], {
                instanceId: 'sale_car_exact',
                modelId: 'c_99',
                name: 'Collision GT Del Comprador',
                rarity: 'common',
                level: 3,
                xp: 9,
                colorName: 'Gris Colisión',
                colorHex: '#64748b',
                tint: 0x64748b
            })
        ];
        save(USERS.buyer, buyer);

        const third = load(USERS.third);
        third.credits = 20000;
        third.pilotName = 'Tercero Test';
        third.partsInventory = { ...(third.partsInventory || {}), spark_plugs: 0 };
        save(USERS.third, third);

        const poor = load(USERS.poor);
        poor.credits = 25;
        poor.pilotName = 'Pobre Test';
        save(USERS.poor, poor);

        const single = load(USERS.single);
        single.credits = 1000;
        single.pilotName = 'Un Coche Test';
        single.garage = [customCar(single.garage[0], { instanceId: 'only_car', modelId: 'c_07', name: 'Only GT' })];
        single.equippedInstanceId = 'only_car';
        save(USERS.single, single);

        const reset = load(USERS.reset);
        reset.credits = 1000;
        reset.pilotName = 'Reset Test';
        reset.partsInventory = { ...(reset.partsInventory || {}), spark_plugs: 3 };
        reset.garage = [reset.garage[0], customCar(reset.garage[0], { instanceId: 'reset_car', modelId: 'c_08', name: 'Reset GT' })];
        save(USERS.reset, reset);

        const room = load(USERS.room);
        room.credits = 1000;
        room.pilotName = 'Sala Test';
        room.garage = [room.garage[0], customCar(room.garage[0], { instanceId: 'room_car', modelId: 'c_09', name: 'Room GT' })];
        save(USERS.room, room);
    } finally {
        db.close();
    }
}

(async () => {
    const stamp = Date.now();
    const dbFile = path.join(os.tmpdir(), `apex_marketplace_db_${stamp}.sqlite`);
    const portBase = 36300 + Math.floor(Math.random() * 500);
    let server = null;
    let lastServer = null;

    try {
        // Fase A: crear credenciales/perfiles por la API normal.
        server = await startServer(portBase, dbFile, true);
        lastServer = server;
        for (const userId of Object.values(USERS)) {
            const created = await requestJson(server.base, `/api/economy/state?userId=${encodeURIComponent(userId)}`, { headers: headersFor(userId) });
            check(created.status === 200 && created.data.economy.garage.credits === 100, `perfil inicial creado para ${userId}`, created.data);
        }
        await stopServer(server);
        server = null;
        seedProfiles(dbFile);

        // Fase B: flujo principal del mercado.
        server = await startServer(portBase + 1, dbFile, true);
        lastServer = server;
        const base = server.base;
        const post = (userId, url, body = {}) => requestJson(base, url, {
            method: 'POST',
            headers: headersFor(userId, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId, ...body })
        });
        const getEconomy = async userId => {
            const result = await requestJson(base, `/api/economy/state?userId=${encodeURIComponent(userId)}`, { headers: headersFor(userId) });
            check(result.status === 200 && result.data.economy, `economía accesible para ${userId}`, result.data);
            return result.data.economy.garage;
        };
        const getNftEntries = async userId => {
            const result = await requestJson(base, `/api/nft/cars?userId=${encodeURIComponent(userId)}`, { headers: headersFor(userId) });
            check(result.status === 200 && Array.isArray(result.data.entries), `registro NFT accesible para ${userId}`, result.data);
            return result.data;
        };
        const listMarket = (userId, query = '') => requestJson(base, `/api/marketplace/listings?userId=${encodeURIComponent(userId)}${query}`, { headers: headersFor(userId) });
        const createListing = (userId, body) => post(userId, '/api/marketplace/listings', body);
        const buyListing = (userId, listingId) => post(userId, `/api/marketplace/listings/${listingId}/buy`, {});
        const cancelListing = (userId, listingId) => post(userId, `/api/marketplace/listings/${listingId}/cancel`, {});

        let result = await requestJson(base, '/healthz');
        check(result.status === 200 && result.data.version === '1.0.7', '/healthz anuncia la v1.0.7', result.data);
        result = await requestJson(base, '/readyz');
        check(result.status === 200 && result.data.ready === true && result.data.schemaVersion === 106, '/readyz confirma BD y esquema 106', result.data);
        result = await requestJson(base, '/api/config');
        check(result.status === 200 && result.data.features.marketplaceEnabled === true
            && result.data.marketplace.enabled === true && result.data.marketplace.feeBps === 750
            && result.data.marketplace.settlement === 'server_escrow'
            && result.data.marketplace.preservesCarProgression === true,
            '/api/config anuncia el mercado en escrow y su comisión por defecto', result.data.marketplace);

        result = await requestJson(base, `/api/marketplace/listings?userId=${encodeURIComponent(USERS.buyer)}`);
        check(result.status === 401, 'el mercado rechaza peticiones sin credencial de dispositivo', result.data);
        result = await requestJson(base, `/api/marketplace/listings?userId=${encodeURIComponent(USERS.buyer)}`, {
            headers: { 'X-Device-Secret': deviceSecretFor(USERS.third) }
        });
        check(result.status === 401, 'el mercado rechaza la credencial de otro dispositivo', result.data);

        // Guardados espejo para comprobar que compra/venta también los sincroniza.
        for (const userId of [USERS.seller, USERS.buyer]) {
            result = await requestJson(base, `/api/save/${encodeURIComponent(userId)}`, {
                method: 'PUT',
                headers: headersFor(userId, { 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    updatedAt: Date.now(),
                    garage: { userId, credits: 999999, garage: [] },
                    story: { stars: { rookie_ring: 2 } },
                    extra: { dustrac_lang: 'es' }
                })
            });
            check(result.status === 200 && result.data.save.garage.credits !== 999999,
                `el guardado de ${userId} usa el garaje autoritativo, no el propuesto`, result.data.save.garage.credits);
        }

        const sellerNftBefore = await getNftEntries(USERS.seller);
        const buyerNftBefore = await getNftEntries(USERS.buyer);
        const exactEntryBefore = sellerNftBefore.entries.find(entry => entry.registry.carInstanceId === 'sale_car_exact');
        const collisionEntryBefore = buyerNftBefore.entries.find(entry => entry.registry.carInstanceId === 'sale_car_exact');
        check(exactEntryBefore && collisionEntryBefore && exactEntryBefore.registry.serial !== collisionEntryBefore.registry.serial,
            'vendedor y comprador pueden tener la misma instancia interna con series globales distintas', {
                seller: exactEntryBefore && exactEntryBefore.registry,
                buyer: collisionEntryBefore && collisionEntryBefore.registry
            });
        const exactSerial = exactEntryBefore.registry.serial;
        const sellerGarageBefore = sellerNftBefore.economy.garage;
        const exactCarBefore = sellerGarageBefore.garage.find(car => car.instanceId === 'sale_car_exact');
        const exactProgressionBefore = progressionOf(exactCarBefore);
        check(exactCarBefore.globalSerial === exactSerial && exactCarBefore.level === 27,
            'el coche exacto queda registrado antes de venderlo', exactCarBefore);

        result = await post(USERS.seller, '/api/nft/prepare-conversion', { instanceId: 'prepared_car' });
        check(result.status === 200 && result.data.registry.status === 'conversion_prepared'
            && result.data.claim && result.data.claim.status === 'prepared',
            'el segundo coche prepara su conversión NFT antes de venderse', result.data);
        const preparedSerial = result.data.registry.serial;
        const preparedClaimId = result.data.claim.claimId;
        const preparedCarBefore = result.data.economy.garage.garage.find(car => car.instanceId === 'prepared_car');
        const preparedProgressionBefore = progressionOf(preparedCarBefore);

        // ===== Piezas sueltas + doble compra simultánea =====
        result = await createListing(USERS.seller, {
            assetType: 'part', partId: 'spark_plugs', quantity: 2, priceCr: 1000,
            idempotencyKey: 'marketplace-test-part-race-1'
        });
        check(result.status === 200 && result.data.listing && result.data.listing.quantity === 2
            && result.data.listing.feeCr === 75 && result.data.listing.sellerNetCr === 925,
            'una pieza puede publicarse por cantidad con la comisión cotizada', result.data.listing);
        const partListingId = result.data.listing.id;
        check(result.data.economy.garage.partsInventory.spark_plugs === 6,
            'publicar 2 piezas las retira al escrow (8 -> 6)', result.data.economy.garage.partsInventory);

        result = await listMarket(USERS.buyer, '&type=part&q=Buj%C3%ADas');
        const publicPartListing = result.data.listings.find(listing => listing.id === partListingId);
        check(result.status === 200 && publicPartListing && publicPartListing.seller === 'Vendedora Test'
            && !('sellerUserId' in publicPartListing),
            'la vista pública muestra el nombre de piloto, no el ID persistente del vendedor', publicPartListing);

        const sellerCreditsBeforePartRace = (await getEconomy(USERS.seller)).credits;
        const buyerBeforePartRace = await getEconomy(USERS.buyer);
        const thirdBeforePartRace = await getEconomy(USERS.third);
        const [buyerRace, thirdRace] = await Promise.all([
            buyListing(USERS.buyer, partListingId),
            buyListing(USERS.third, partListingId)
        ]);
        const raceOutcomes = [
            { userId: USERS.buyer, before: buyerBeforePartRace, result: buyerRace },
            { userId: USERS.third, before: thirdBeforePartRace, result: thirdRace }
        ];
        const winners = raceOutcomes.filter(outcome => outcome.result.status === 200 && outcome.result.data.ok === true);
        const losers = raceOutcomes.filter(outcome => outcome.result.status === 409);
        check(winners.length === 1 && losers.length === 1,
            'dos compras simultáneas del mismo anuncio solo liquidan una vez', raceOutcomes.map(o => o.result.status));
        const winner = winners[0];
        const loser = losers[0];
        const winnerAfter = await getEconomy(winner.userId);
        const loserAfter = await getEconomy(loser.userId);
        check(winnerAfter.credits === winner.before.credits - 1000
            && winnerAfter.partsInventory.spark_plugs === (winner.before.partsInventory.spark_plugs || 0) + 2,
            'el ganador de la doble compra paga el bruto y recibe exactamente 2 piezas', winnerAfter);
        check(loserAfter.credits === loser.before.credits
            && (loserAfter.partsInventory.spark_plugs || 0) === (loser.before.partsInventory.spark_plugs || 0),
            'el perdedor de la doble compra no paga ni recibe piezas', loserAfter);
        check((await getEconomy(USERS.seller)).credits === sellerCreditsBeforePartRace + 925,
            'el vendedor recibe el neto una sola vez en la doble compra');
        result = await buyListing(winner.userId, partListingId);
        check(result.status === 200 && result.data.duplicate === true
            && (await getEconomy(winner.userId)).credits === winnerAfter.credits,
            'repetir la compra como el mismo comprador es idempotente', result.data);
        result = await buyListing(loser.userId, partListingId);
        check(result.status === 409, 'un tercero no puede recomprar un anuncio ya vendido', result.data);

        // ===== Guardas de publicación =====
        result = await createListing(USERS.seller, { assetType: 'car', instanceId: 'inst_starter_01', priceCr: 1000, idempotencyKey: 'marketplace-test-starter-1' });
        check(result.status === 422 && result.data.error === 'car_not_transferable', 'el coche inicial no es transferible', result.data);
        result = await createListing(USERS.single, { assetType: 'car', instanceId: 'only_car', priceCr: 1000, idempotencyKey: 'marketplace-test-single-1' });
        check(result.status === 409 && result.data.error === 'must_keep_one_car', 'una cuenta no puede vender su único coche jugable', result.data);
        result = await createListing(USERS.seller, { assetType: 'car', instanceId: 'sale_car_exact', priceCr: 49, idempotencyKey: 'marketplace-test-price-1' });
        check(result.status === 422 && result.data.error === 'marketplace_price_out_of_range', 'el servidor impone el precio mínimo de coche', result.data);

        // ===== Coche exacto con progresión y colisión de instancia =====
        const exactCreateBody = {
            assetType: 'car', instanceId: 'sale_car_exact', priceCr: 2000,
            idempotencyKey: 'marketplace-test-exact-car-1'
        };
        result = await createListing(USERS.seller, exactCreateBody);
        check(result.status === 200 && result.data.listing && result.data.listing.registry.serial === exactSerial
            && result.data.listing.feeCr === 150 && result.data.listing.sellerNetCr === 1850,
            'el coche exacto se publica con su serie y neto cotizado', result.data.listing);
        const exactListingId = result.data.listing.id;
        check(!result.data.economy.garage.garage.some(car => car.instanceId === 'sale_car_exact'),
            'al publicar, el coche sale del garaje autoritativo al escrow');
        result = await createListing(USERS.seller, exactCreateBody);
        check(result.status === 200 && result.data.duplicate === true && result.data.listing.id === exactListingId,
            'reintentar la publicación con la misma clave no duplica el escrow', result.data.listing);
        result = await createListing(USERS.seller, { ...exactCreateBody, idempotencyKey: 'marketplace-test-exact-car-2' });
        check(result.status === 404 && result.data.error === 'car_not_found',
            'un coche en escrow no puede volver a publicarse desde el garaje', result.data);
        result = await post(USERS.seller, '/api/nft/prepare-conversion', { instanceId: 'sale_car_exact' });
        check(result.status === 404 && result.data.error === 'car_not_found',
            'un coche en escrow no puede preparar conversión NFT', result.data);
        result = await post(USERS.seller, '/api/economy/action', {
            action: 'equip_car', args: { instanceId: 'sale_car_exact' }, idempotencyKey: 'marketplace-test-equip-escrow-1'
        });
        check(result.status === 404 && result.data.result && result.data.result.success === false
            && result.data.result.reason === 'car_not_found',
            'un coche en escrow no puede equiparse mediante la economía autoritativa', result.data);

        result = await requestJson(base, `/api/marketplace/listings/${exactListingId}?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) });
        check(result.status === 200 && result.data.listing && !('sellerUserId' in result.data.listing)
            && JSON.stringify(progressionOf(result.data.listing.car)) === JSON.stringify(exactProgressionBefore),
            'el detalle público anuncia exactamente el nivel, XP, piezas, hitos, color y energía en escrow', result.data.listing);

        const sellerCreditsBeforeExactBuy = (await getEconomy(USERS.seller)).credits;
        const buyerCreditsBeforeExactBuy = (await getEconomy(USERS.buyer)).credits;
        result = await buyListing(USERS.seller, exactListingId);
        check(result.status === 409 && result.data.error === 'cannot_buy_own_listing', 'el vendedor no puede comprarse a sí mismo', result.data);
        result = await buyListing(USERS.poor, exactListingId);
        check(result.status === 409 && result.data.error === 'credits_insufficient', 'la compra exige saldo autoritativo suficiente', result.data);
        check((await getEconomy(USERS.seller)).credits === sellerCreditsBeforeExactBuy
            && (await getEconomy(USERS.buyer)).credits === buyerCreditsBeforeExactBuy,
            'autocompra e insuficiencia no mueven saldo ni activos');

        result = await buyListing(USERS.buyer, exactListingId);
        check(result.status === 200 && result.data.trade && result.data.trade.grossCr === 2000
            && result.data.trade.feeCr === 150 && result.data.trade.sellerNetCr === 1850,
            'la compra del coche liquida bruto, comisión y neto en servidor', result.data.trade);
        const deliveredInstanceId = result.data.trade.deliveredCarInstanceId;
        check(deliveredInstanceId && deliveredInstanceId !== 'sale_car_exact' && deliveredInstanceId.startsWith('sale_car_exact_mkt_'),
            'la colisión interna del comprador remapea solo instanceId, no la serie global', deliveredInstanceId);
        const buyerGarageAfterExact = result.data.economy.garage;
        const deliveredCar = buyerGarageAfterExact.garage.find(car => car.instanceId === deliveredInstanceId);
        const originalCollisionCar = buyerGarageAfterExact.garage.find(car => car.instanceId === 'sale_car_exact');
        check(deliveredCar && originalCollisionCar && originalCollisionCar.modelId === 'c_99',
            'el comprador conserva su coche previo y recibe además el comprado', buyerGarageAfterExact.garage.map(c => c.instanceId));
        check(JSON.stringify(progressionOf(deliveredCar)) === JSON.stringify(exactProgressionBefore)
            && deliveredCar.globalSerial === exactSerial
            && deliveredCar.nftRegistryId === exactEntryBefore.registry.registryId
            && deliveredCar.marketplaceTradeCount === 1,
            'el coche comprado conserva exactamente progresión y serie; solo cambian instancia interna y procedencia de mercado', deliveredCar);
        check(buyerGarageAfterExact.credits === buyerCreditsBeforeExactBuy - 2000,
            'el comprador paga el precio bruto completo');
        check((await getEconomy(USERS.seller)).credits === sellerCreditsBeforeExactBuy + 1850,
            'el vendedor recibe el neto tras la comisión');

        result = await requestJson(base, `/api/save/${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) });
        check(result.status === 200 && result.data.save.garage.garage.some(car => car.instanceId === deliveredInstanceId)
            && result.data.save.garage.credits === buyerGarageAfterExact.credits,
            'el guardado espejo del comprador también recibe el coche y el saldo liquidado');
        result = await requestJson(base, `/api/save/${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        check(result.status === 200 && !result.data.save.garage.garage.some(car => car.globalSerial === exactSerial),
            'el guardado espejo del vendedor ya no contiene la serie vendida');

        const buyerNftAfterExact = await getNftEntries(USERS.buyer);
        const sellerNftAfterExact = await getNftEntries(USERS.seller);
        check(buyerNftAfterExact.entries.some(entry => entry.registry.serial === exactSerial && entry.registry.carInstanceId === deliveredInstanceId)
            && !sellerNftAfterExact.entries.some(entry => entry.registry.serial === exactSerial),
            'la titularidad del registro global pasa del vendedor al comprador');

        result = await buyListing(USERS.buyer, exactListingId);
        check(result.status === 200 && result.data.duplicate === true
            && (await getEconomy(USERS.buyer)).credits === buyerGarageAfterExact.credits,
            'repetir la compra del coche como comprador no duplica cargo ni coche', result.data);
        result = await buyListing(USERS.third, exactListingId);
        check(result.status === 409, 'otro comprador no puede adquirir el coche ya vendido', result.data);
        result = await requestJson(base, `/api/marketplace/listings/${exactListingId}?userId=${encodeURIComponent(USERS.third)}`, { headers: headersFor(USERS.third) });
        check(result.status === 404, 'un tercero no puede consultar el detalle privado de una venta cerrada', result.data);
        result = await requestJson(base, `/api/marketplace/trades?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) });
        check(result.status === 200 && result.data.trades.some(trade => trade.listingId === exactListingId && trade.deliveredCarInstanceId === deliveredInstanceId),
            'el historial del comprador conserva el trade y la instancia entregada', result.data.trades);

        // ===== Claim de conversión preparada transferido =====
        result = await createListing(USERS.seller, {
            assetType: 'car', instanceId: 'prepared_car', priceCr: 3000,
            idempotencyKey: 'marketplace-test-prepared-car-1'
        });
        check(result.status === 200 && result.data.listing.registry.status === 'conversion_prepared',
            'un coche off-chain con conversión preparada sí puede venderse internamente', result.data.listing);
        const preparedListingId = result.data.listing.id;
        result = await buyListing(USERS.buyer, preparedListingId);
        check(result.status === 200 && result.data.trade.registrySerial === preparedSerial,
            'la compra transfiere también la serie con conversión preparada', result.data.trade);
        const preparedDelivered = result.data.economy.garage.garage.find(car => car.instanceId === 'prepared_car');
        check(preparedDelivered && JSON.stringify(progressionOf(preparedDelivered)) === JSON.stringify(preparedProgressionBefore)
            && preparedDelivered.chainStatus === 'conversion_prepared',
            'el coche preparado conserva progresión y estado de conversión al cambiar de dueño', preparedDelivered);
        result = await requestJson(base, `/api/nft/claims/${preparedClaimId}?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) });
        check(result.status === 200 && result.data.claim.claimId === preparedClaimId,
            'el comprador pasa a ser titular consultable del mismo claim preparado', result.data.claim);
        result = await requestJson(base, `/api/nft/claims/${preparedClaimId}?userId=${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        check(result.status === 404, 'el vendedor deja de poder consultar el claim transferido', result.data);

        // ===== Cancelación exacta =====
        const sellerForCancel = await getEconomy(USERS.seller);
        const cancelCarBefore = sellerForCancel.garage.find(car => car.instanceId === 'cancel_car');
        const cancelProgressionBefore = progressionOf(cancelCarBefore);
        result = await createListing(USERS.seller, {
            assetType: 'car', instanceId: 'cancel_car', priceCr: 900,
            idempotencyKey: 'marketplace-test-cancel-car-1'
        });
        check(result.status === 200, 'el coche de cancelación se publica', result.data.listing);
        const cancelListingId = result.data.listing.id;
        result = await cancelListing(USERS.buyer, cancelListingId);
        check(result.status === 404, 'otro usuario no puede retirar el anuncio ajeno', result.data);
        result = await cancelListing(USERS.seller, cancelListingId);
        const restoredCancelCar = result.data.economy.garage.garage.find(car => car.instanceId === 'cancel_car');
        check(result.status === 200 && restoredCancelCar
            && JSON.stringify(progressionOf(restoredCancelCar)) === JSON.stringify(cancelProgressionBefore),
            'cancelar devuelve exactamente el mismo coche y progreso', restoredCancelCar);
        result = await cancelListing(USERS.seller, cancelListingId);
        check(result.status === 200 && result.data.duplicate === true, 'cancelar dos veces es una repetición segura', result.data);

        // ===== Herramientas admin =====
        result = await createListing(USERS.seller, {
            assetType: 'part', partId: 'brake_pads', quantity: 1, priceCr: 100,
            idempotencyKey: 'marketplace-test-admin-part-1'
        });
        const adminListingId = result.data.listing.id;
        const brakePadsInEscrow = result.data.economy.garage.partsInventory.brake_pads;
        result = await requestJson(base, '/api/admin/marketplace');
        check(result.status === 403, 'las estadísticas/admin del mercado exigen token', result.data);
        result = await requestJson(base, '/api/admin/launch-readiness', { headers: { 'X-Admin-Token': ADMIN_TOKEN } });
        check(result.status === 200 && result.data.launch.version === '1.0.7'
            && result.data.launch.marketplace.config.feeBps === 750,
            'launch-readiness admin expone versión y estado agregado sin secretos', result.data.launch);
        result = await requestJson(base, '/api/admin/marketplace/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN },
            body: JSON.stringify({ listingId: adminListingId, reason: 'test_moderation' })
        });
        check(result.status === 200 && result.data.listing.status === 'cancelled',
            'un admin puede retirar un anuncio y devolver el escrow', result.data.listing);
        check((await getEconomy(USERS.seller)).partsInventory.brake_pads === brakePadsInEscrow + 1,
            'la cancelación admin devuelve la pieza al vendedor');

        // ===== Bloqueos por carrera y sala =====
        result = await post(USERS.seller, '/api/economy/action', {
            action: 'equip_car', args: { instanceId: 'race_car' }, idempotencyKey: 'marketplace-test-equip-race-1'
        });
        check(result.status === 200 && result.data.result && result.data.result.success !== false,
            'el coche de carrera puede equiparse antes de crear sesión', result.data.result);
        result = await post(USERS.seller, '/api/race/session', { trackId: 'rookie_ring', carInstanceId: 'race_car', car: 'Race GT' });
        check(result.status === 200 && result.data.sessionId, 'se crea una sesión oficial para race_car', result.data);
        result = await createListing(USERS.seller, {
            assetType: 'car', instanceId: 'race_car', priceCr: 1000,
            idempotencyKey: 'marketplace-test-race-block-1'
        });
        check(result.status === 409 && result.data.error === 'car_in_active_race_or_room',
            'no se puede vender el coche de una sesión de carrera activa', result.data);

        await getNftEntries(USERS.room);
        result = await post(USERS.room, '/api/multiplayer/public/join', {
            roomId: 'room_bronze', name: 'Sala Test', carName: 'Room GT', colorHex: '#22c55e', archetype: 'dtm_coupe'
        });
        check(result.status === 200 && result.data.lobbyId, 'la cuenta de sala entra en una sala pública', result.data);
        const roomLobbyId = result.data.lobbyId;
        result = await createListing(USERS.room, {
            assetType: 'car', instanceId: 'room_car', priceCr: 1000,
            idempotencyKey: 'marketplace-test-room-block-1'
        });
        check(result.status === 409 && result.data.error === 'car_in_active_race_or_room',
            'mientras el vendedor está en sala, sus coches no pueden entrar en escrow', result.data);
        result = await post(USERS.room, '/api/multiplayer/public/leave', { roomId: 'room_bronze', lobbyId: roomLobbyId });
        check(result.status === 200 && result.data.ok === true, 'la cuenta puede abandonar la sala', result.data);
        result = await createListing(USERS.room, {
            assetType: 'car', instanceId: 'room_car', priceCr: 1000,
            idempotencyKey: 'marketplace-test-room-after-leave-1'
        });
        check(result.status === 200, 'tras abandonar la sala el coche ya puede publicarse', result.data.listing);
        result = await cancelListing(USERS.room, result.data.listing.id);
        check(result.status === 200, 'el anuncio posterior a la sala puede retirarse con normalidad', result.data);

        // Anuncios que la siguiente fase manipulará en BD apagada.
        result = await createListing(USERS.seller, {
            assetType: 'car', instanceId: 'expiry_car', priceCr: 777, durationDays: 1,
            idempotencyKey: 'marketplace-test-expiry-car-1'
        });
        check(result.status === 200, 'el coche de caducidad se publica', result.data.listing);
        const expiryListingId = result.data.listing.id;
        const expiryProgressionBefore = progressionOf(result.data.listing.car);
        result = await createListing(USERS.seller, {
            assetType: 'car', instanceId: 'blocked_car', priceCr: 888,
            idempotencyKey: 'marketplace-test-blocked-car-1'
        });
        check(result.status === 200, 'el coche que pasará a minted primero se publica off-chain', result.data.listing);
        const blockedListingId = result.data.listing.id;
        const blockedSerial = result.data.listing.registry.serial;
        await stopServer(server);
        server = null;

        // Simular el paso del tiempo y una acuñación externa ya registrada.
        const mutateDb = new SqliteDatabase(dbFile);
        try {
            mutateDb.pragma('busy_timeout = 5000');
            mutateDb.prepare('UPDATE marketplace_listings SET expires_at = ? WHERE listing_id = ?')
                .run(new Date(Date.now() - 1000).toISOString(), expiryListingId);
            mutateDb.prepare('UPDATE nft_car_registry SET status = ? WHERE serial = ?')
                .run('minted', blockedSerial);
        } finally {
            mutateDb.close();
        }

        // Fase C: caducidad, bloqueo minted y restablecimiento protegido.
        server = await startServer(portBase + 2, dbFile, true);
        lastServer = server;
        const baseC = server.base;
        const postC = (userId, url, body = {}) => requestJson(baseC, url, {
            method: 'POST', headers: headersFor(userId, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId, ...body })
        });
        result = await requestJson(baseC, `/api/marketplace/listings?userId=${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        const expiredMine = result.data.mine.find(listing => listing.id === expiryListingId);
        check(result.status === 200 && expiredMine && expiredMine.status === 'expired',
            'al consultar el mercado se liquidan las caducidades vencidas', expiredMine);
        result = await requestJson(baseC, `/api/economy/state?userId=${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        const restoredExpiryCar = result.data.economy.garage.garage.find(car => car.instanceId === 'expiry_car');
        check(restoredExpiryCar && JSON.stringify(progressionOf(restoredExpiryCar)) === JSON.stringify(expiryProgressionBefore),
            'la caducidad devuelve exactamente el coche que estaba en escrow', restoredExpiryCar);

        const buyerCreditsBeforeMintedBlock = (await requestJson(baseC, `/api/economy/state?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) })).data.economy.garage.credits;
        result = await postC(USERS.buyer, `/api/marketplace/listings/${blockedListingId}/buy`, {});
        check(result.status === 409 && result.data.error === 'minted_nft_requires_onchain_transfer',
            'si el registro pasa a minted, la liquidación interna se detiene sin fingir traspaso de wallet', result.data);
        check((await requestJson(baseC, `/api/economy/state?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) })).data.economy.garage.credits === buyerCreditsBeforeMintedBlock,
            'el bloqueo minted no cobra al comprador');
        result = await postC(USERS.seller, `/api/marketplace/listings/${blockedListingId}/cancel`, {});
        check(result.status === 200 && result.data.economy.garage.garage.some(car => car.instanceId === 'blocked_car'),
            'el vendedor puede recuperar del escrow el coche que ya no puede liquidarse internamente', result.data.listing);
        result = await postC(USERS.seller, '/api/marketplace/listings', {
            assetType: 'car', instanceId: 'blocked_car', priceCr: 888,
            idempotencyKey: 'marketplace-test-blocked-car-2'
        });
        check(result.status === 409 && result.data.error === 'minted_nft_requires_onchain_transfer',
            'un coche minted tampoco puede volver a publicarse para liquidación solo-SQLite', result.data);

        result = await postC(USERS.reset, '/api/marketplace/listings', {
            assetType: 'part', partId: 'spark_plugs', quantity: 1, priceCr: 100,
            idempotencyKey: 'marketplace-test-reset-1'
        });
        check(result.status === 200, 'la cuenta de reset publica una pieza', result.data.listing);
        const resetListingId = result.data.listing.id;
        result = await requestJson(baseC, `/api/save/${encodeURIComponent(USERS.reset)}`, {
            method: 'DELETE', headers: headersFor(USERS.reset)
        });
        check(result.status === 409 && result.data.error === 'active_marketplace_listings',
            'restablecer una cuenta con escrow activo queda bloqueado', result.data);
        result = await postC(USERS.reset, `/api/marketplace/listings/${resetListingId}/cancel`, {});
        check(result.status === 200, 'la cuenta de reset retira su escrow', result.data);
        result = await requestJson(baseC, `/api/save/${encodeURIComponent(USERS.reset)}`, {
            method: 'DELETE', headers: headersFor(USERS.reset)
        });
        check(result.status === 200 && result.data.ok === true,
            'sin anuncios activos el restablecimiento vuelve a estar permitido', result.data);
        result = await requestJson(baseC, `/api/economy/state?userId=${encodeURIComponent(USERS.reset)}`, { headers: headersFor(USERS.reset) });
        check(result.status === 200 && result.data.economy.garage.credits === 100
            && result.data.economy.garage.garage.length === 1,
            'tras el restablecimiento autorizado la cuenta vuelve al perfil inicial', result.data.economy.garage);

        result = await postC(USERS.seller, '/api/marketplace/listings', {
            assetType: 'part', partId: 'spark_plugs', quantity: 1, priceCr: 111,
            idempotencyKey: 'marketplace-test-recovery-1'
        });
        check(result.status === 200 && result.data.listing,
            'se deja un anuncio activo para probar la pausa de emergencia', result.data.listing);
        const recoveryListingId = result.data.listing.id;
        const sellerRecoveryPartsBefore = result.data.economy.garage.partsInventory.spark_plugs;
        await stopServer(server);
        server = null;

        // Fase D: interruptor de emergencia.
        server = await startServer(portBase + 3, dbFile, false);
        lastServer = server;
        result = await requestJson(server.base, '/api/config');
        check(result.data.features.marketplaceEnabled === false && result.data.marketplace.enabled === false,
            'ENABLE_MARKETPLACE=false apaga la superficie pública del mercado', result.data.marketplace);
        const postD = (userId, url, body = {}) => requestJson(server.base, url, {
            method: 'POST', headers: headersFor(userId, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId, ...body })
        });
        result = await requestJson(server.base, `/api/marketplace/listings?userId=${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        check(result.status === 200 && result.data.recoveryOnly === true && result.data.listings.length === 0
            && result.data.mine.some(listing => listing.id === recoveryListingId && listing.status === 'active'),
            'con el interruptor apagado se oculta el escaparate pero el vendedor sigue viendo su escrow', result.data);
        result = await requestJson(server.base, `/api/marketplace/listings/${recoveryListingId}?userId=${encodeURIComponent(USERS.buyer)}`, { headers: headersFor(USERS.buyer) });
        check(result.status === 503 && result.data.error === 'marketplace_disabled',
            'con el interruptor apagado un tercero no puede consultar el escaparate', result.data);
        result = await postD(USERS.buyer, `/api/marketplace/listings/${recoveryListingId}/buy`, {});
        check(result.status === 503 && result.data.error === 'marketplace_disabled',
            'con el interruptor apagado no se liquidan compras', result.data);
        result = await postD(USERS.seller, '/api/marketplace/listings', {
            assetType: 'part', partId: 'spark_plugs', quantity: 1, priceCr: 100,
            idempotencyKey: 'marketplace-test-disabled-create'
        });
        check(result.status === 503 && result.data.error === 'marketplace_disabled',
            'con el interruptor apagado no se crean anuncios nuevos', result.data);
        result = await requestJson(server.base, `/api/marketplace/trades?userId=${encodeURIComponent(USERS.seller)}`, { headers: headersFor(USERS.seller) });
        check(result.status === 200 && result.data.trades.some(trade => trade.listingId === exactListingId),
            'el historial propio sigue consultable durante la pausa', result.data.trades);
        result = await postD(USERS.seller, `/api/marketplace/listings/${recoveryListingId}/cancel`, {});
        check(result.status === 200 && result.data.marketplacePaused === true
            && result.data.economy.garage.partsInventory.spark_plugs === sellerRecoveryPartsBefore + 1,
            'durante la pausa el vendedor sí puede retirar y recuperar su escrow', result.data);
        await stopServer(server);
        server = null;

        const diskDb = new SqliteDatabase(dbFile, { readonly: true });
        try {
            const schema = diskDb.prepare('SELECT MAX(version) AS version FROM schema_migrations').get();
            check(Number(schema.version) === 106, 'SQLite registra la migración de esquema 106', schema);
            const exactTrade = diskDb.prepare('SELECT * FROM marketplace_trades WHERE listing_id = ?').get(exactListingId);
            check(exactTrade && exactTrade.seller_user_id === USERS.seller && exactTrade.buyer_user_id === USERS.buyer
                && exactTrade.gross_cr === 2000 && exactTrade.fee_cr === 150 && exactTrade.seller_net_cr === 1850,
                'SQLite conserva un único trade atómico para el coche exacto', exactTrade);
            const duplicatedTrades = diskDb.prepare('SELECT listing_id, COUNT(*) AS count FROM marketplace_trades GROUP BY listing_id HAVING count > 1').all();
            check(duplicatedTrades.length === 0, 'ningún anuncio tiene más de un trade persistido', duplicatedTrades);
            const exactRegistry = diskDb.prepare('SELECT * FROM nft_car_registry WHERE serial = ?').get(exactSerial);
            check(exactRegistry.owner_user_id === USERS.buyer && exactRegistry.car_instance_id === deliveredInstanceId,
                'SQLite transfiere owner e instancia del registro sin cambiar la serie', exactRegistry);
            const preparedClaim = diskDb.prepare('SELECT * FROM nft_mint_claims WHERE claim_id = ?').get(preparedClaimId);
            const preparedSnapshot = JSON.parse(preparedClaim.snapshot_json || '{}');
            check(preparedClaim.owner_user_id === USERS.buyer && preparedClaim.car_instance_id === 'prepared_car'
                && preparedClaim.wallet_address === null
                && preparedSnapshot.progressionAtLastTransfer
                && preparedSnapshot.progressionAtLastTransfer.level === preparedProgressionBefore.level,
                'SQLite transfiere el claim preparado, limpia wallet y anota la progresión transferida', preparedClaim);
            const exactLedger = diskDb.prepare("SELECT action, user_id, delta_credits FROM economy_ledger WHERE idempotency_key IN (?, ?) ORDER BY action")
                .all(`marketplace-buy:${exactListingId}:buyer`, `marketplace-buy:${exactListingId}:seller`);
            check(exactLedger.length === 2
                && exactLedger.some(row => row.action === 'marketplace_purchase' && row.user_id === USERS.buyer && row.delta_credits === -2000)
                && exactLedger.some(row => row.action === 'marketplace_sale' && row.user_id === USERS.seller && row.delta_credits === 1850),
                'el ledger conserva por separado cargo bruto del comprador y neto del vendedor', exactLedger);
            const statusRows = diskDb.prepare('SELECT status, COUNT(*) AS count FROM marketplace_listings GROUP BY status').all();
            check(statusRows.some(row => row.status === 'sold') && statusRows.some(row => row.status === 'cancelled')
                && statusRows.some(row => row.status === 'expired'),
                'el historial persistido cubre vendidos, cancelados y caducados', statusRows);
        } finally {
            diskDb.close();
        }

        console.log('✅ TEST MARKETPLACE v106 SUPERADO');
    } catch (error) {
        console.error(error && error.stack ? error.stack : error);
        const active = server || lastServer;
        if (active) {
            console.error('--- Log del servidor de mercado (cola) ---');
            console.error(active.getLog().slice(-5000));
        }
        process.exitCode = 1;
    } finally {
        await stopServer(server);
        removeIfExists(dbFile);
    }
})();
