// ===== MOTOR ECONÓMICO AUTORITATIVO EN SERVIDOR (v104) =====
// Las reglas de precios, cofres, mejoras y recompensas ya existían en
// nft_cars_data.js, pero se ejecutaban en el navegador sobre localStorage.
// v104 ejecuta ese mismo catálogo/reglas dentro de un contexto VM aislado en
// el servidor, alimentado con el garaje guardado en SQLite. El cliente solo
// pide una acción de una lista blanca; nunca envía el saldo resultante.
//
// La aleatoriedad de cofres/drops se sustituye por crypto.randomInt(), por lo
// que el RNG económico tampoco depende del navegador.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const NFT_DATA_SCRIPT = fs.readFileSync(path.join(__dirname, 'nft_cars_data.js'), 'utf8');
const GARAGE_STORAGE_KEY = 'apex_web3_garage_save';

const SHOP_COMPONENTS = {
    turbo: { costCr: 1200, partId: 'turbocharger', name: 'Turbocompresor Twin-Scroll' },
    tires: { costCr: 1500, partId: 'slick_tires', name: 'Neumáticos Slick GT3' },
    brakes: { costCr: 1800, partId: 'brake_calipers', name: 'Pinzas Apex Monobloque' }
};

const ACTION_EXPRESSIONS = {
    buy_energy_pack: 'buyEnergyPack(__apexArgs.packKey, __apexArgs.targetInstanceId || null)',
    recharge_energy_ad: 'rechargeEnergyWithAd(__apexArgs.instanceId || null)',
    add_nitro_ad: 'addNitroWithAd()',
    buy_nitros: 'buyNitrosWithTokens(__apexArgs.amount)',
    consume_nitro: '({ success: consumeNitroFromInventory(), reason: consumeNitroFromInventory ? undefined : undefined })',
    open_crate: 'openMysteryCrate(__apexArgs.crateKey, {})',
    open_prepaid_crate: 'openMysteryCrate(__apexArgs.crateKey, { prepaidTonOrderId: __apexArgs.orderId })',
    upgrade_branch: 'upgradeCarStatBranch(__apexArgs.instanceId, __apexArgs.branchKey)',
    buy_parts_kit: 'buyPartsKit(__apexArgs.kitKey)',
    claim_milestone: 'claimCarMilestoneStat(__apexArgs.instanceId, __apexArgs.milestoneLevel, __apexArgs.statName)',
    claim_season_tier: 'claimSeasonPassTier(__apexArgs.tier)',
    claim_daily_mission: 'claimDailyMission(__apexArgs.missionId)',
    sign_sponsor: 'signSponsorshipContract(__apexArgs.contractId)',
    claim_sponsor: 'claimSponsorshipReward(__apexArgs.contractId)',
    link_email: 'linkUserEmail(__apexArgs.email)',
    equip_car: `(() => {
        const userData = loadNftUserData();
        const car = (userData.garage || []).find(c => c.instanceId === __apexArgs.instanceId);
        if (!car) return { success: false, reason: 'car_not_found' };
        userData.equippedInstanceId = car.instanceId;
        saveNftUserData(userData);
        return { success: true, equippedInstanceId: car.instanceId };
    })()`,
    grant_ton_credits: `(() => {
        const userData = loadNftUserData();
        if (!Array.isArray(userData.tonPurchaseOrderIds)) userData.tonPurchaseOrderIds = [];
        if (userData.tonPurchaseOrderIds.includes(__apexArgs.orderId)) {
            return { success: false, alreadyApplied: true, reason: 'ton_purchase_already_applied' };
        }
        const cr = Math.max(0, Math.floor(Number(__apexArgs.cr) || 0));
        if (!cr) return { success: false, reason: 'invalid_cr_amount' };
        userData.credits = (Number(userData.credits) || 0) + cr;
        userData.tonPurchaseOrderIds.push(__apexArgs.orderId);
        userData.tonPurchaseOrderIds = userData.tonPurchaseOrderIds.slice(-100);
        saveNftUserData(userData);
        return { success: true, cr, credits: userData.credits, gems: userData.gems };
    })()`,
    grant_stars_credits: `(() => {
        const userData = loadNftUserData();
        if (!Array.isArray(userData.starsPurchaseOrderIds)) userData.starsPurchaseOrderIds = [];
        if (userData.starsPurchaseOrderIds.includes(__apexArgs.orderId)) {
            return { success: false, alreadyApplied: true, reason: 'stars_purchase_already_applied' };
        }
        const cr = Math.max(0, Math.floor(Number(__apexArgs.cr) || 0));
        if (!cr) return { success: false, reason: 'invalid_cr_amount' };
        userData.credits = (Number(userData.credits) || 0) + cr;
        userData.starsPurchaseOrderIds.push(__apexArgs.orderId);
        userData.starsPurchaseOrderIds = userData.starsPurchaseOrderIds.slice(-100);
        saveNftUserData(userData);
        return { success: true, cr, credits: userData.credits, gems: userData.gems, paymentProvider: 'telegram_stars' };
    })()`,
    grant_team_bootstrap: `(() => {
        const userData = loadNftUserData();
        const grantVersion = Math.max(1, Math.floor(Number(__apexArgs.grantVersion) || 1));
        const targetCredits = Math.max(0, Math.min(1000000, Math.floor(Number(__apexArgs.minimumCredits) || 100000)));
        const existingGrant = userData.teamBootstrapGrant && typeof userData.teamBootstrapGrant === 'object'
            ? userData.teamBootstrapGrant
            : null;
        if (existingGrant && Number(existingGrant.version) >= grantVersion) {
            return { success: true, alreadyApplied: true, grantVersion, credits: userData.credits };
        }
        if (!Array.isArray(userData.garage) || userData.garage.length === 0) {
            return { success: false, reason: 'garage_missing' };
        }

        const beforeCredits = Math.max(0, Math.floor(Number(userData.credits) || 0));
        const creditsGranted = Math.max(0, targetCredits - beforeCredits);
        userData.credits = beforeCredits + creditsGranted;

        const statKeys = ['potencia', 'velocidad', 'aceleracion', 'agarre', 'frenada', 'manejo', 'turbo', 'downforce', 'traccion', 'ligereza'];
        const maxParts = {
            ecu: 5,
            tires: 5,
            brakes: 5,
            turbo: 5,
            chassis: 5,
            speed_power: 5,
            braking: 5,
            handling_grip: 5,
            accel_traction: 5,
            aero_lightness: 5
        };
        let milestoneStatsGranted = 0;

        const maximizeCar = (car) => {
            if (!car || typeof car !== 'object') return;
            car.level = 50;
            car.xp = 0;
            car.xpNeeded = 12500;
            car.parts = { ...(car.parts && typeof car.parts === 'object' ? car.parts : {}), ...maxParts };
            car.maxEnergy = (typeof getMaxEnergyForCar === 'function') ? getMaxEnergyForCar(car) : (Number(car.maxEnergy) || 6);
            car.energy = car.maxEnergy;
            car.lastEnergyUpdate = Date.now();

            if (!Array.isArray(car.claimedMilestones)) car.claimedMilestones = [];
            if (!car.milestoneStats || typeof car.milestoneStats !== 'object' || Array.isArray(car.milestoneStats)) car.milestoneStats = {};
            if (!car.milestoneStatChoices || typeof car.milestoneStatChoices !== 'object' || Array.isArray(car.milestoneStatChoices)) car.milestoneStatChoices = {};

            for (let milestoneLevel = 10; milestoneLevel <= 50; milestoneLevel += 10) {
                if (car.claimedMilestones.includes(milestoneLevel)) continue;
                let chosenStat = statKeys[0];
                try {
                    const effective = calculateCarPerformance(car).effectiveStats || {};
                    chosenStat = [...statKeys].sort((a, b) => {
                        const delta = (Number(effective[a]) || 0) - (Number(effective[b]) || 0);
                        return delta !== 0 ? delta : statKeys.indexOf(a) - statKeys.indexOf(b);
                    })[0];
                } catch (e) {}
                car.milestoneStats[chosenStat] = (Number(car.milestoneStats[chosenStat]) || 0) + 1;
                car.milestoneStatChoices[milestoneLevel] = chosenStat;
                car.claimedMilestones.push(milestoneLevel);
                milestoneStatsGranted++;
            }
            car.claimedMilestones.sort((a, b) => Number(a) - Number(b));
        };

        const modelById = new Map(NFT_CAR_MODELS.map(model => [String(model.id), model]));
        const modelByName = new Map(NFT_CAR_MODELS.map(model => [String(model.name || '').toLowerCase(), model]));
        const ownedModelIds = new Set();
        const existingInstanceIds = new Set();
        for (const car of userData.garage) {
            if (!car || typeof car !== 'object') continue;
            if (car.instanceId) existingInstanceIds.add(String(car.instanceId));
            const model = modelById.get(String(car.modelId || '')) || modelByName.get(String(car.name || '').toLowerCase());
            if (model) ownedModelIds.add(String(model.id));
            maximizeCar(car);
        }

        const modelsAdded = [];
        NFT_CAR_MODELS.forEach((model, index) => {
            if (ownedModelIds.has(String(model.id))) return;
            const color = NFT_CAR_COLORS.length ? NFT_CAR_COLORS[index % NFT_CAR_COLORS.length] : null;
            const car = mintProceduralNftCar(model, color);
            let instanceId = 'team_grant_v' + grantVersion + '_' + String(model.id).replace(/[^A-Za-z0-9_.-]/g, '_');
            let suffix = 2;
            const baseInstanceId = instanceId;
            while (existingInstanceIds.has(instanceId)) {
                instanceId = baseInstanceId + '_' + suffix;
                suffix++;
            }
            car.instanceId = instanceId;
            car.obtainedVia = 'team_bootstrap_grant_v' + grantVersion;
            existingInstanceIds.add(instanceId);
            maximizeCar(car);
            userData.garage.push(car);
            ownedModelIds.add(String(model.id));
            modelsAdded.push(String(model.id));
        });

        if (!userData.equippedInstanceId || !userData.garage.some(car => car.instanceId === userData.equippedInstanceId)) {
            userData.equippedInstanceId = userData.garage[0].instanceId;
        }

        const appliedAt = new Date().toISOString();
        userData.teamBootstrapGrant = {
            version: grantVersion,
            appliedAt,
            targetCredits,
            creditsGranted,
            modelsAdded,
            carsMaxed: userData.garage.length,
            milestoneStatsGranted,
            maxLevel: 50,
            maxUpgradeStage: 5
        };
        saveNftUserData(userData);
        return {
            success: true,
            alreadyApplied: false,
            grantVersion,
            appliedAt,
            targetCredits,
            creditsGranted,
            credits: userData.credits,
            modelsAdded,
            carsMaxed: userData.garage.length,
            milestoneStatsGranted
        };
    })()`,
    consume_race_energy: `(() => {
        const userData = loadNftUserData();
        const requestedId = __apexArgs.instanceId || userData.equippedInstanceId;
        const car = (userData.garage || []).find(c => c.instanceId === requestedId) || userData.garage[0];
        if (!car) return { success: false, reason: 'car_not_found' };
        refreshCarEnergy(car);
        if ((Number(car.energy) || 0) <= 0) {
            saveNftUserData(userData);
            return { success: false, reason: 'energy_depleted', carInstanceId: car.instanceId, energy: 0, maxEnergy: car.maxEnergy };
        }
        car.energy = Math.max(0, (Number(car.energy) || 0) - 1);
        if (car.energy < (car.maxEnergy || 0)) car.lastEnergyUpdate = Date.now();
        saveNftUserData(userData);
        return { success: true, carInstanceId: car.instanceId, energy: car.energy, maxEnergy: car.maxEnergy };
    })()`,
    race_complete: `(() => {
        const rank = Math.max(1, Math.min(6, Math.floor(Number(__apexArgs.rank) || 6)));
        const crReward = rank === 1 ? 1000 : (rank === 2 ? 600 : (rank === 3 ? 400 : 200));
        const xpReward = rank === 1 ? 250 : (rank === 2 ? 180 : (rank === 3 ? 120 : 70));
        const userData = loadNftUserData();
        const nitrosUsed = Math.max(0, Math.min(2, Math.floor(Number(__apexArgs.nitrosUsed) || 0)));
        userData.nitros = Math.max(0, (Number(userData.nitros) || 0) - nitrosUsed);
        userData.credits = (Number(userData.credits) || 0) + crReward;

        const cap1 = ['rookie_ring', 'radiator_oval', 'tri_apex_coliseum', 'twister_chicanes'];
        const cap2 = ['red_rock_junction', 'curvastone_park', 'schwarzwald_sprint', 'overpass_figure8'];
        const cap3 = ['desert_canyon', 'sandstorm_dunes', 'badlands_endurance', 'infinity_loops'];
        const cap4 = ['brianza_speedway', 'sakura_ring', 'diamond_apex', 'super_dragway'];
        const cap5 = ['riviera_coast', 'nordkette_pass', 'silverstone_airfield', 'neo_tokyo_bay', 'inter_laguna', 'sarthe_endurance'];
        const trackId = String(__apexArgs.trackId || '');
        const rarity = cap5.includes(trackId) ? 'legendary'
            : cap4.includes(trackId) ? 'epic'
            : cap3.includes(trackId) ? 'rare'
            : cap2.includes(trackId) ? 'uncommon'
            : (cap1.includes(trackId) ? 'common' : 'common');
        const baseRates = { common: 0.15, uncommon: 0.10, rare: 0.06, epic: 0.03, legendary: 0.015 };
        const rankMultiplier = rank === 1 ? 1 : (rank === 2 ? 0.5 : (rank === 3 ? 0.333 : 0));
        const finalRate = (baseRates[rarity] || 0.15) * rankMultiplier;
        let droppedPart = null;
        if (rank <= 3 && Math.random() < finalRate) {
            const pieces = Object.values(WORKSHOP_PIECES_CATALOG).filter(p => p.rarity === rarity);
            if (pieces.length) {
                const chosen = pieces[Math.floor(Math.random() * pieces.length)];
                if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
                userData.partsInventory[chosen.id] = (userData.partsInventory[chosen.id] || 0) + 1;
                droppedPart = {
                    partId: chosen.id,
                    name: chosen.name,
                    icon: chosen.icon,
                    rarity: chosen.rarity,
                    category: chosen.category,
                    serial: 'APEX-' + Math.floor(100000 + Math.random() * 900000),
                    rateRolled: finalRate
                };
            }
        }
        saveNftUserData(userData);

        const xpResult = addXpToEquippedCar(xpReward);
        const completedSponsors = updateSponsorshipProgress({
            rank,
            topSpeed: Math.max(0, Math.min(500, Number(__apexArgs.topSpeed) || 0)),
            drifts: Math.max(0, Math.min(100, Math.floor(Number(__apexArgs.drifts) || 0)))
        });

        const after = loadNftUserData();
        if (after.seasonPass && Array.isArray(after.seasonPass.dailyMissions)) {
            after.seasonPass.dailyMissions.forEach(mission => {
                if (mission.claimed) return;
                if (mission.id === 'm_races') mission.progress = Math.min(mission.target, (Number(mission.progress) || 0) + 1);
                if (mission.id === 'm_drift') mission.progress = Math.min(mission.target, (Number(mission.progress) || 0) + Math.max(0, Math.min(100, Math.floor(Number(__apexArgs.drifts) || 0))));
                if (mission.id === 'm_speed' && Number(__apexArgs.topSpeed) >= 350) mission.progress = mission.target;
                if (Number(mission.progress) >= Number(mission.target)) mission.completed = true;
            });
            saveNftUserData(after);
        }

        return {
            success: true,
            rank,
            crReward,
            xpReward,
            nitrosUsed,
            nitrosRemaining: Math.max(0, Number(after.nitros) || 0),
            xpResult,
            droppedPart,
            completedSponsors: (completedSponsors || []).map(s => ({ id: s.id, name: s.name }))
        };
    })()`
};

function cloneJson(value, fallback = null) {
    if (value == null) return fallback;
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return fallback; }
}

function sanitizeArgs(args) {
    const clean = {};
    if (!args || typeof args !== 'object' || Array.isArray(args)) return clean;
    for (const [key, value] of Object.entries(args).slice(0, 30)) {
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(key)) continue;
        if (value == null || typeof value === 'boolean') clean[key] = value;
        else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
        else if (typeof value === 'string') clean[key] = value.slice(0, 240);
    }
    return clean;
}

function createEconomyContext(initialGarage, args = {}) {
    const storage = {};
    if (initialGarage != null) storage[GARAGE_STORAGE_KEY] = JSON.stringify(initialGarage);

    const sandbox = {
        console: {
            log: () => {},
            warn: () => {},
            error: (...parts) => console.error('[economy-engine]', ...parts)
        },
        URLSearchParams,
        setTimeout: () => 0,
        clearTimeout: () => {},
        setInterval: () => 0,
        clearInterval: () => {},
        __apexArgs: sanitizeArgs(args),
        __apexSecureRandom: () => crypto.randomBytes(6).readUIntBE(0, 6) / (2 ** 48),
        localStorage: {
            getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
            setItem(key, value) { storage[String(key)] = String(value); },
            removeItem(key) { delete storage[String(key)]; }
        }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox, { name: 'apex-authoritative-economy' });
    vm.runInContext(NFT_DATA_SCRIPT, context, { filename: 'nft_cars_data.js', timeout: 1000 });
    vm.runInContext('Math.random = __apexSecureRandom;', context, { timeout: 100 });
    return { context, storage };
}

function readGarage(storage) {
    try {
        return storage[GARAGE_STORAGE_KEY] ? JSON.parse(storage[GARAGE_STORAGE_KEY]) : null;
    } catch (e) {
        return null;
    }
}

function createDefaultGarage(userId, pilotName) {
    const { context, storage } = createEconomyContext(null, {});
    vm.runInContext('loadNftUserData()', context, { timeout: 1000 });
    const garage = readGarage(storage);
    if (!garage) throw new Error('default_garage_unavailable');
    garage.userId = String(userId || garage.userId || '');
    if (typeof pilotName === 'string' && pilotName.trim()) garage.pilotName = pilotName.trim().slice(0, 40);
    // Código estable y prácticamente único por cuenta. No es una credencial:
    // solo identifica al invitante y puede compartirse públicamente.
    const referralSuffix = crypto.createHash('sha256')
        .update(`apex-referral:${garage.userId}`)
        .digest('hex')
        .slice(0, 8)
        .toUpperCase();
    garage.referralCode = `APEX-${referralSuffix}`;
    garage.updatedAt = Date.now();
    return garage;
}

function runAction(garage, action, rawArgs = {}) {
    const expression = ACTION_EXPRESSIONS[action];
    if (!expression) {
        return { success: false, result: { success: false, reason: 'unknown_economy_action' }, garage: cloneJson(garage) };
    }

    // consume_nitro se escribe aparte para no llamar dos veces a la función
    // económica al construir el objeto de resultado.
    const effectiveExpression = action === 'consume_nitro'
        ? '({ success: consumeNitroFromInventory() })'
        : expression;

    const { context, storage } = createEconomyContext(garage, rawArgs);
    let rawResult;
    try {
        rawResult = vm.runInContext(effectiveExpression, context, { filename: `economy-action:${action}`, timeout: 1000 });
    } catch (e) {
        return {
            success: false,
            result: { success: false, reason: 'economy_engine_error', message: String(e.message || e).slice(0, 300) },
            garage: cloneJson(garage)
        };
    }

    const result = cloneJson(rawResult, rawResult == null ? null : { success: false, reason: 'unserializable_result' });
    const nextGarage = readGarage(storage) || cloneJson(garage);
    let success = false;
    if (typeof result === 'boolean') success = result;
    else if (result && typeof result.success === 'boolean') success = result.success;
    else if (result && typeof result === 'object') success = true;

    return {
        success,
        result: typeof result === 'boolean' ? { success: result } : result,
        garage: nextGarage
    };
}

function buyShopComponent(garage, componentKey) {
    const component = SHOP_COMPONENTS[String(componentKey || '')];
    if (!component) return { success: false, result: { success: false, reason: 'invalid_component' }, garage: cloneJson(garage) };
    const next = cloneJson(garage);
    if ((Number(next.credits) || 0) < component.costCr) {
        return { success: false, result: { success: false, reason: 'credits_insufficient', costCr: component.costCr }, garage: next };
    }
    next.credits -= component.costCr;
    if (!next.partsInventory || typeof next.partsInventory !== 'object' || Array.isArray(next.partsInventory)) next.partsInventory = {};
    next.partsInventory[component.partId] = Math.max(0, Math.floor(Number(next.partsInventory[component.partId]) || 0)) + 1;
    next.updatedAt = Date.now();
    return {
        success: true,
        result: {
            success: true,
            component: componentKey,
            partId: component.partId,
            name: component.name,
            costCr: component.costCr,
            remainingCredits: next.credits,
            partsInventory: next.partsInventory
        },
        garage: next
    };
}

function applyAction(garage, action, args = {}) {
    if (action === 'buy_shop_component') return buyShopComponent(garage, args.component || args.type);
    return runAction(garage, action, args);
}

module.exports = {
    createDefaultGarage,
    runAction,
    applyAction,
    SHOP_COMPONENTS,
    SUPPORTED_ACTIONS: [...Object.keys(ACTION_EXPRESSIONS), 'buy_shop_component']
};
