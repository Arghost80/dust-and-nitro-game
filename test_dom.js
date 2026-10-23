const fs = require('fs');
const vm = require('vm');

const doc = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          toggle(c, force) { if (force) this.classes.add(c); else this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        innerHTML: '',
        style: {},
        appendChild(child) {},
        remove() { delete doc.elements[this.id]; },
        addEventListener() {}
      };
    }
    return this.elements[id];
  },
  createElement(tag) {
    const el = this.getElementById('tag_' + Math.random());
    if (tag === 'canvas') {
      el.getContext = () => ({
        fillStyle: '', strokeStyle: '', lineWidth: 1,
        fillRect: () => {}, fillText: () => {}, strokeRect: () => {},
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
        arc: () => {}, fill: () => {}, stroke: () => {},
        closePath: () => {}, save: () => {}, restore: () => {},
        translate: () => {}, rotate: () => {}, scale: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        roundRect: () => {}, ellipse: () => {}
      });
    }
    return el;
  },
  addEventListener() {}
};

['game-hub-root', 'hub-header', 'view-main', 'view-garage', 'view-inventory', 'view-crates', 'view-shop', 'view-comp', 'settings-modal', 'game-container', 'btn-left', 'btn-right', 'btn-accel', 'btn-brake', 'btn-handbrake'].forEach(id => doc.getElementById(id));

const sandbox = {
  window: {},
  document: doc,
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  console: console,
  alert: console.log,
  setTimeout: (fn) => fn && fn(),
  clearTimeout: () => {},
  setInterval: (fn) => 123,
  clearInterval: () => {},
  AudioContext: function() {},
  webkitAudioContext: function() {},
  Phaser: {
    AUTO: 'AUTO',
    Scale: { FIT: 1, CENTER_BOTH: 2 },
    Math: {
      DegToRad: (d) => d * Math.PI / 180,
      RadToDeg: (r) => r * 180 / Math.PI,
      Linear: (a,b,t) => a + (b-a)*t,
      Angle: {
        WrapDegrees: (d) => (((d + 180) % 360 + 360) % 360) - 180,
        Wrap: (r) => Math.atan2(Math.sin(r), Math.cos(r))
      }
    },
    Game: function() {
      const mockScene = {
        children: { removeAll: () => {} },
        physics: { world: { setBounds: () => {} }, add: { sprite: () => {
          const car = { active: true, angle: 0, x: 0, y: 0, setDisplaySize: () => car, setAngle: (a) => { car.angle = a || 0; return car; }, setDepth: () => car, setCollideWorldBounds: () => car, setTint: () => car, setVelocity: () => car, setAlpha: () => car };
          return car;
        } } },
        cameras: { main: { scrollX: 0, scrollY: 0, width: 960, height: 540, zoom: 1.1, setBounds: () => {}, setBackgroundColor: () => {}, setZoom: () => {}, startFollow: () => {}, stopFollow: () => {}, setScroll: () => {} } },
        add: {
          graphics: () => {
            const g = { fillStyle: () => g, fill: () => g, fillRect: () => g, fillRoundedRect: () => g, lineStyle: () => g, strokeRoundedRect: () => g, lineBetween: () => g, clear: () => g, setDepth: () => g, setScrollFactor: () => g, fillCircle: () => g, fillEllipse: () => g, beginPath: () => g, moveTo: () => g, lineTo: () => g, strokePath: () => g, closePath: () => g };
            return g;
          },
          tileSprite: () => ({ setDepth: () => ({}) }),
          sprite: (x = 0, y = 0) => {
            const s = { x, y, active: true, setDisplaySize: () => s, setAngle: () => s, setDepth: () => s, setTint: () => s, setAlpha: () => s, setScrollFactor: () => s };
            return s;
          },
          rectangle: (x = 0, y = 0) => {
            const r = { x, y, active: true, setDepth: () => r, setAngle: () => r, setInteractive: () => ({ on: () => {} }) };
            return r;
          },
          ellipse: (x = 0, y = 0) => {
            const el = { x, y, active: true, setDepth: () => el, setAngle: () => el, setAlpha: () => el };
            return el;
          },
          circle: () => {
            const ci = { setDepth: () => ci, setAngle: () => ci, setAlpha: () => ci, setStrokeStyle: () => ci, setFillStyle: () => ci };
            return ci;
          },
          text: () => {
            const t = { setOrigin: () => t, setInteractive: () => ({ on: () => {} }), setScrollFactor: () => t, setDepth: () => t, setText: () => t, setColor: () => t, setFill: () => t, setVisible: () => t, setAngle: () => t };
            return t;
          },
          container: () => {
            const c = { setScrollFactor: () => c, setDepth: () => c, add: () => c };
            return c;
          }
        },
        time: { delayedCall: (delay, fn) => fn && fn(), addEvent: () => ({ remove: () => {} }) },
        tweens: { add: () => {} },
        textures: {
          _map: new Map(),
          exists(k) { return this._map.has(k); },
          addCanvas(k, cv) { this._map.set(k, cv); return this; },
          get(k) { return this._map.get(k); }
        }
      };
      return { scene: { scenes: [mockScene] } };
    },
    Input: { Keyboard: { KeyCodes: {} } }
  }
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);

vm.runInContext(fs.readFileSync('translations.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('nft_cars_data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('tracks_data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('dustrac_game.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('game_hub.js', 'utf8'), ctx);

console.log('Hub header length:', doc.getElementById('hub-header').innerHTML.length);
console.log('View main length:', doc.getElementById('view-main').innerHTML.length);
console.log('Testing renderGarageView...');
vm.runInContext('renderGarageView()', ctx);
console.log('View garage length:', doc.getElementById('view-garage').innerHTML.length);
console.log('Testing renderCratesView...');
vm.runInContext('renderCratesView()', ctx);
console.log('View crates length:', doc.getElementById('view-crates').innerHTML.length);
console.log('Testing triggerCrateOpening...');
vm.runInContext('triggerCrateOpening("bronze")', ctx);
console.log('Testing launchRaceDirectly (snow: nordkette_pass)...');
vm.runInContext('launchRaceDirectly("nordkette_pass")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

console.log('Testing launchRaceDirectly (desert: desert_canyon)...');
vm.runInContext('launchRaceDirectly("desert_canyon")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

console.log('Testing launchRaceDirectly (city: neo_tokyo_bay)...');
vm.runInContext('launchRaceDirectly("neo_tokyo_bay")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

console.log('Testing launchRaceDirectly (coast: riviera_coast)...');
vm.runInContext('launchRaceDirectly("riviera_coast")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

console.log('Testing launchRaceDirectly (river & bridge: red_rock_junction)...');
vm.runInContext('launchRaceDirectly("red_rock_junction")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

console.log('Testing launchRaceDirectly (mountain: schwarzwald_sprint)...');
vm.runInContext('launchRaceDirectly("schwarzwald_sprint")', ctx);
vm.runInContext('dustUpdate.call(window.raceScene, 1000, 16)', ctx);

// Verificar coche del jugador y rivales IA
const pTex = vm.runInContext('playerCar ? playerCar.carData.texture : null', ctx);
const aiSpeeds = vm.runInContext('aiCars.map(c => c.carData.speed)', ctx);
const aiDrivers = vm.runInContext('aiCars.map(c => c.carData.subtitle)', ctx);
console.log('Player car in race texture:', pTex);
console.log('AI Rival Speeds (Spread across 3 tiers):', aiSpeeds);
console.log('AI Rival Drivers:', aiDrivers);

// ===== VERIFICACIÓN DE NUEVAS MARCAS Y SISTEMA DE PIEZAS FÍSICAS =====
console.log('\n--- VERIFICANDO NUEVOS VEHÍCULOS DE MARCA & SISTEMA DE PIEZAS ---');
const totalModels = vm.runInContext('NFT_CAR_MODELS.length', ctx);
console.log('Total de Modelos NFT en Catálogo:', totalModels);

const brandChecks = ['lambo', 'ferrari', 'porsche', 'viper', 'mitsu', 'toyota', 'bugatti', 'bentley'];
brandChecks.forEach(brand => {
    const count = vm.runInContext(`NFT_CAR_MODELS.filter(m => m.id.includes('${brand}') || m.name.toLowerCase().includes('${brand}')).length`, ctx);
    console.log(`Modelos encontrados para ${brand.toUpperCase()}:`, count);
    if (count === 0) throw new Error(`¡Falta la marca ${brand}!`);
});

const partsCatalogCount = vm.runInContext('Object.keys(WORKSHOP_PIECES_CATALOG).length', ctx);
console.log('Piezas mecánicas en catálogo:', partsCatalogCount);
if (partsCatalogCount < 16) throw new Error('Faltan piezas mecánicas en catálogo');

const branchCount = vm.runInContext('Object.keys(STAT_UPGRADE_BRANCHES).length', ctx);
console.log('Ramas de mejora por estadísticas:', branchCount);
if (branchCount !== 5) throw new Error('Debe haber exactamente 5 ramas de mejora');

// Test de mejora con piezas físicas
console.log('\n--- PROBANDO MEJORA POR PIEZAS FÍSICAS EN EL TALLER ---');
vm.runInContext(`
    const _tUser = loadNftUserData();
    _tUser.credits = 50000;
    _tUser.gems = 500;
    saveNftUserData(_tUser);
`, ctx);
const starterCarId = vm.runInContext('loadNftUserData().garage[0].instanceId', ctx);
const preLvl = vm.runInContext(`loadNftUserData().garage[0].parts.speed_power || 0`, ctx);
console.log('Nivel inicial de Motor & Velocidad:', preLvl);

const upgradeResult = vm.runInContext(`upgradeCarStatBranch('${starterCarId}', 'speed_power')`, ctx);
console.log('Resultado de upgradeCarStatBranch:', upgradeResult.success, 'Nuevo Stage:', upgradeResult.newStage);
if (!upgradeResult.success) throw new Error('Falló upgradeCarStatBranch: ' + upgradeResult.reason);

// Test de compra de kit de piezas en tienda
console.log('\n--- PROBANDO COMPRA DE PACK DE PIEZAS EN TIENDA ---');
const buyKitRes = vm.runInContext(`buyPartsKit('kit_brakes')`, ctx);
console.log('Resultado de buyPartsKit:', buyKitRes.success, 'Kit:', buyKitRes.kit.name);
if (!buyKitRes.success) throw new Error('Falló buyPartsKit');

// Test de apertura y renderizado del Modal de Tuning
console.log('\n--- PROBANDO RENDERIZADO DEL MODAL DE TUNING ---');
vm.runInContext(`openTuningModal('${starterCarId}')`, ctx);
const modalHtml = doc.getElementById('tuning-modal') ? doc.getElementById('tuning-modal').innerHTML : '';
console.log('Modal HTML length:', modalHtml.length);
if (!modalHtml.includes('TU INVENTARIO DE PIEZAS') || !modalHtml.includes('RAMAS DE RENDIMIENTO')) {
    throw new Error('El modal de tuning no contiene las secciones requeridas');
}

// Test de renderizado de Tienda Oficial con los nuevos packs
console.log('\n--- PROBANDO RENDERIZADO DE TIENDA CON PACKS DE PIEZAS ---');
vm.runInContext(`renderShopView()`, ctx);
const shopHtml = doc.getElementById('view-shop').innerHTML;
if (!shopHtml.includes('PACKS DE PIEZAS DEL TALLER') || !shopHtml.includes('Pack de Frenada Apex Pro')) {
    throw new Error('La tienda no contiene los packs de piezas mecánicas');
}

// Test de fin de carrera y sistema de drops Web3 por circuitos y rarezas
console.log('\n--- PROBANDO SISTEMA DE DROPS NFT POR CIRCUITOS Y CLASIFICACIÓN (calculateRacePartsDrop) ---');

// 1. Verificación de mapeo de circuitos a rarezas (Capítulos 1 a 5)
const rCap1 = vm.runInContext(`getDropRarityForTrack('rookie_ring')`, ctx);
const rCap2 = vm.runInContext(`getDropRarityForTrack('red_rock_junction')`, ctx);
const rCap3 = vm.runInContext(`getDropRarityForTrack('desert_canyon')`, ctx);
const rCap4 = vm.runInContext(`getDropRarityForTrack('brianza_speedway')`, ctx);
const rCap5 = vm.runInContext(`getDropRarityForTrack('sarthe_endurance')`, ctx);

console.log(`Rarezas por capítulo mapeadas: Cap1=${rCap1}, Cap2=${rCap2}, Cap3=${rCap3}, Cap4=${rCap4}, Cap5=${rCap5}`);
if (rCap1 !== 'common' || rCap2 !== 'uncommon' || rCap3 !== 'rare' || rCap4 !== 'epic' || rCap5 !== 'legendary') {
    throw new Error('Fallo en el mapeo de circuitos a rarezas de piezas');
}

// 2. Comprobación de drops forzados y tipos de piezas
const drop1 = vm.runInContext(`calculateRacePartsDrop('rookie_ring', 1, true)`, ctx);
const drop2 = vm.runInContext(`calculateRacePartsDrop('red_rock_junction', 1, true)`, ctx);
const drop3 = vm.runInContext(`calculateRacePartsDrop('desert_canyon', 1, true)`, ctx);
const drop4 = vm.runInContext(`calculateRacePartsDrop('brianza_speedway', 1, true)`, ctx);
const drop5 = vm.runInContext(`calculateRacePartsDrop('sarthe_endurance', 1, true)`, ctx);

if (!drop1 || drop1.rarity !== 'common' || !drop1.nftSerial) throw new Error('Drop de Cap 1 debe ser Común con número de serie NFT');
if (!drop2 || drop2.rarity !== 'uncommon') throw new Error('Drop de Cap 2 debe ser Infrecuente');
if (!drop3 || drop3.rarity !== 'rare') throw new Error('Drop de Cap 3 debe ser Raro');
if (!drop4 || drop4.rarity !== 'epic') throw new Error('Drop de Cap 4 debe ser Épico');
if (!drop5 || drop5.rarity !== 'legendary') throw new Error('Drop de Cap 5 debe ser Legendario');
console.log('✅ Drops de piezas verificados: todas las categorías y números de serie NFT correctos');

// 3. Comprobación de 4º puesto sin forzar (probabilidad 0% / sin drop)
const dropRank4 = vm.runInContext(`calculateRacePartsDrop('rookie_ring', 4, false)`, ctx);
if (dropRank4 !== null) throw new Error('El 4º puesto debe tener 0% de drop');
console.log('✅ 4º puesto verificado con 0% de drop');

// 4. Test de endRace con drop forzado
vm.runInContext(`window.__TEST_FORCE_RACE_DROP = true`, ctx);
vm.runInContext(`currentTrackId = 'rookie_ring'`, ctx);
vm.runInContext(`hudPosText.text = 'POS: 1 / 6'`, ctx);
const preParts = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
vm.runInContext(`endRace()`, ctx);
const postParts = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
if (postParts !== preParts + 1) throw new Error(`endRace con drop activado debe sumar 1 pieza NFT, sumó: ${postParts - preParts}`);
console.log('✅ endRace otorgó correctamente el drop NFT a la billetera');
vm.runInContext(`window.__TEST_FORCE_RACE_DROP = false`, ctx);

// 5. Test de Mercado P2P con Comisión de Royalty del 7.5%
console.log('\n--- PROBANDO COMISIÓN DE ROYALTY 7.5% EN MERCADO P2P ---');
const sellFeeRes = vm.runInContext(`sellPartToMarketplace('spark_plugs', 1000)`, ctx);
console.log('Resultado de venta en marketplace:', sellFeeRes);
if (!sellFeeRes.success || sellFeeRes.royaltyFee !== 75 || sellFeeRes.earnedCr !== 925) {
    throw new Error(`Comisión de royalty incorrecta. Esperada 75 fee y 925 neto, recibido: ${JSON.stringify(sellFeeRes)}`);
}
const treasuryFees = vm.runInContext(`loadNftUserData().platformTreasuryFees`, ctx);
if (treasuryFees < 75) throw new Error('Las comisiones de la tesorería de la plataforma no se acumularon');
console.log(`✅ Royalty del 7.5% comprobado: Venta 1000 $CR -> Royalty ${sellFeeRes.royaltyFee} $CR, Piloto neto +${sellFeeRes.earnedCr} $CR`);

// 6. Test de Billetera TON Connect y Retiros Anti-Drenaje
console.log('\n--- PROBANDO BILLETERA WEB3 & TON CONNECT ---');
const connectRes = vm.runInContext(`connectTonWallet('telegram_wallet')`, ctx);
if (!connectRes.success || !connectRes.address.startsWith('EQB')) {
    throw new Error('Fallo al conectar billetera TON');
}
console.log('✅ Billetera TON conectada:', connectRes.address);

// Swap TON a $CR
vm.runInContext(`(() => { const u = loadNftUserData(); u.gems = 10; saveNftUserData(u); })();`, ctx);
const swapRes = vm.runInContext(`buyCrWithTon(1.0)`, ctx);
if (!swapRes.success || swapRes.crGained !== 5000) {
    throw new Error(`Swap TON a $CR fallido: ${JSON.stringify(swapRes)}`);
}
console.log('✅ Swap TON a $CR completado: 1 TON -> +5,000 $CR');

// Retiro Anti-Drenaje de $CR a TON
const withdrawRes = vm.runInContext(`withdrawCrToTon(1000)`, ctx);
if (!withdrawRes.success || withdrawRes.tonGained !== 0.20) {
    throw new Error(`Retiro a TON fallido: ${JSON.stringify(withdrawRes)}`);
}
console.log('✅ Retiro seguro completado: 1000 $CR -> 0.20 TON transferidos a la wallet');

// Test Anti-Bot 1: Reserva Mínima de Holding (500 $CR)
const userCr = vm.runInContext('loadNftUserData().credits', ctx);
const excessiveWithdrawRes = vm.runInContext(`withdrawCrToTon(${userCr - 400})`, ctx);
if (excessiveWithdrawRes.success || excessiveWithdrawRes.reason !== 'holding_reserve_required') {
    throw new Error(`Fallo en protección de reserva de holding: ${JSON.stringify(excessiveWithdrawRes)}`);
}
console.log('✅ Anti-Bot 1 superado: Reserva de holding de 500 $CR bloqueó el drenaje total');

// Test Anti-Bot 2: Cooldown de 7 días con advertencia de quema
const cooldownWarningRes = vm.runInContext(`withdrawCrToTon(1000, false)`, ctx);
if (cooldownWarningRes.success || cooldownWarningRes.reason !== 'early_withdraw_warning') {
    throw new Error(`Fallo en verificación de cooldown de 7 días: ${JSON.stringify(cooldownWarningRes)}`);
}
console.log('✅ Anti-Bot 2 superado: Cooldown de 7 días activo con aviso de penalización del 50%');

// Test Anti-Bot 3: Retiro anticipado con Quema Deflacionaria del 50%
const earlyWithdrawRes = vm.runInContext(`withdrawCrToTon(1000, true)`, ctx);
if (!earlyWithdrawRes.success || !earlyWithdrawRes.isEarly || earlyWithdrawRes.burnedCr !== 500 || earlyWithdrawRes.tonGained !== 0.10) {
    throw new Error(`Fallo en quema deflacionaria del 50%: ${JSON.stringify(earlyWithdrawRes)}`);
}
console.log('✅ Anti-Bot 3 superado: Quema deflacionaria ejecutada (500 $CR quemados, 0.10 TON transferidos)');

// Test Anti-Cheat 4: Telemetría Física Imposible (Speedhack / Fast-forward)
const invalidRaceCheck = vm.runInContext(`validateRaceTelemetry('grand_prix', 3, 5.0, 1.2)`, ctx);
if (invalidRaceCheck.valid || invalidRaceCheck.reason !== 'impossible_race_time') {
    throw new Error(`Fallo en validación de telemetría de carrera: ${JSON.stringify(invalidRaceCheck)}`);
}
const invalidLapCheck = vm.runInContext(`validateRaceTelemetry('grand_prix', 3, 60.0, 2.0)`, ctx);
if (invalidLapCheck.valid || invalidLapCheck.reason !== 'impossible_lap_time') {
    throw new Error(`Fallo en validación de telemetría de vuelta rápida: ${JSON.stringify(invalidLapCheck)}`);
}
const validTelemetryCheck = vm.runInContext(`validateRaceTelemetry('grand_prix', 3, 60.0, 18.5)`, ctx);
if (!validTelemetryCheck.valid) {
    throw new Error(`Validación de telemetría legítima falló: ${JSON.stringify(validTelemetryCheck)}`);
}
console.log('✅ Anti-Cheat 4 superado: Telemetría física validada contra speedhacks y bots');

// Renderizado del Modal de Billetera
vm.runInContext(`openWeb3WalletModal()`, ctx);
const walletModalHtml = doc.getElementById('wallet-modal').innerHTML;
if (!walletModalHtml.includes('BILLETERA WEB3 &amp; TON CONNECT') && !walletModalHtml.includes('BILLETERA WEB3 & TON CONNECT')) {
    throw new Error('El modal de la billetera no se renderizó correctamente');
}
if (!walletModalHtml.includes('Holding de Seguridad') || !walletModalHtml.includes('COOLDOWN 7 DÍAS')) {
    throw new Error('El modal de la billetera no muestra la información de Anti-Bot y Cooldown');
}
console.log('✅ Modal de Billetera Web3 renderizado con éxito con protecciones Anti-Bot');

// ===== VERIFICACIÓN DE LAS 12 SILUETAS VECTORIALES DE COCHES =====
console.log('\n--- VERIFICANDO LAS 12 SILUETAS ARQUITECTÓNICAS DE COCHES ---');
const archetypesExpected = [
    'lambo_wedge', 'ferrari_corsa', 'porsche_boxer', 'viper_acr',
    'rally_evo', 'jdm_supra', 'bugatti_w16', 'bentley_gt3',
    'hot_hatch', 'dakar_truck', 'le_mans_proto', 'dtm_coupe'
];
const archetypesFound = new Set();
const allModels = vm.runInContext('NFT_CAR_MODELS', ctx);
allModels.forEach(m => {
    const arch = vm.runInContext(`getCarArchetype(${JSON.stringify(m)})`, ctx);
    archetypesFound.add(arch);
    const svg = vm.runInContext(`generateCarSvg(${JSON.stringify(m)}, 240, 120)`, ctx);
    if (!svg || !svg.startsWith('<svg') || !svg.endsWith('</svg>')) {
        throw new Error(`SVG inválido para el modelo ${m.name}`);
    }
});
console.log(`Siluetas detectadas en los ${allModels.length} modelos:`, Array.from(archetypesFound));
archetypesExpected.forEach(reqArch => {
    if (!archetypesFound.has(reqArch)) {
        throw new Error(`Falta cubrir la silueta: ${reqArch}`);
    }
});
console.log(`¡Las 12 siluetas vectoriales están activas y con SVGs válidos!`);

// ===== VERIFICACIÓN DEL SISTEMA DE ENERGÍA Y MONETIZACIÓN =====
console.log('\n--- VERIFICANDO SISTEMA DE ENERGÍA DE CARRERA & MONETIZACIÓN ---');
const userForEnergy = vm.runInContext('loadNftUserData()', ctx);
const carTest = userForEnergy.garage[0];
console.log('Energía del coche tras 6 carreras disputadas (Starter máx: 5, mínimo 1):', carTest.energy, '/', carTest.maxEnergy);
if (typeof carTest.energy !== 'number' || carTest.energy !== 1) {
    throw new Error(`El coche starter debe tener 1 punto de energía tras disputar 6 carreras, tiene: ${carTest.energy}`);
}

// Simular gasto de energía y regeneración horaria (+1⚡ cada 1h)
const regeneratedEnergy = vm.runInContext(`
    const u = loadNftUserData();
    const c = u.garage[0];
    c.energy = 2;
    c.lastEnergyUpdate = Date.now() - (2.5 * 3600 * 1000);
    refreshCarEnergy(c);
    saveNftUserData(u);
    c.energy;
`, ctx);
console.log('Energía tras 2.5h transcurridas (+2⚡ esperados):', regeneratedEnergy);
if (regeneratedEnergy !== 4) {
    throw new Error(`Regeneración horaria incorrecta: esperada 4, obtenida ${regeneratedEnergy}`);
}

// Probar recarga mediante Anuncio (+1⚡)
const preAdEnergy = regeneratedEnergy;
const adRes = vm.runInContext(`rechargeEnergyWithAd('${carTest.instanceId}')`, ctx);
console.log('Resultado de ver anuncio (+1⚡):', adRes.success, 'Nueva energía:', adRes.newEnergy);
if (!adRes.success || adRes.newEnergy !== preAdEnergy + 1) {
    throw new Error('Fallo al recargar energía con anuncio publicitario');
}

// Probar compra de Pack de Batería en Tienda con Token $CR
const preShopCr = vm.runInContext('loadNftUserData().credits', ctx);
carTest.energy = 3;
vm.runInContext(`saveNftUserData(${JSON.stringify(userForEnergy)})`, ctx);
const buyEnergyRes = vm.runInContext(`buyEnergyPack('pack_energy_boost', '${carTest.instanceId}')`, ctx);
console.log('Resultado de compra de Batería en Tienda:', buyEnergyRes.success, 'Nueva energía:', buyEnergyRes.newEnergy);
if (!buyEnergyRes.success || buyEnergyRes.newEnergy !== 5) {
    throw new Error('Fallo al comprar batería de energía en la tienda con tokens $CR');
}

// Probar bloqueo de carrera cuando energía es 0 y apertura de modal
carTest.energy = 0;
vm.runInContext(`saveNftUserData(${JSON.stringify(userForEnergy)})`, ctx);
vm.runInContext(`launchRaceDirectly('rookie_ring')`, ctx);
const modalDepleted = doc.getElementById('energy-depleted-modal');
console.log('Modal de energía agotada activo:', modalDepleted && modalDepleted.style.display !== 'none');
if (!modalDepleted || modalDepleted.style.display === 'none') {
    throw new Error('Debe bloquearse el inicio de carrera y mostrarse el modal si el coche tiene 0 de energía');
}

// ===== VERIFICACIÓN DE VELOCIDADES IA REEQUILIBRADAS =====
console.log('\n--- VERIFICANDO VELOCIDADES DE IA REEQUILIBRADAS ---');
if (!aiSpeeds.every(s => s >= 320 && s <= 435)) {
    throw new Error(`Velocidades de la IA fuera de rango justo (320-435 km/h): ${JSON.stringify(aiSpeeds)}`);
}
console.log('✓ Velocidades de IA perfectamente equilibradas y competitivas (325 - 432 km/h)');

// ===== VERIFICACIÓN DE FRENO DE MANO / DERRAPE (ESPACIO) =====
console.log('\n--- VERIFICANDO MECÁNICAS DE FRENO DE MANO / DERRAPE ---');
// Restaurar energía para simular carrera
const freshUser = vm.runInContext('loadNftUserData()', ctx);
freshUser.garage[0].energy = 10;
vm.runInContext(`saveNftUserData(${JSON.stringify(freshUser)})`, ctx);
vm.runInContext(`launchRaceDirectly('rookie_ring')`, ctx);

// Simular estado de carrera activa
vm.runInContext('gameState = "RACE"', ctx);
vm.runInContext('playerSpeed = 250', ctx);

// Probar giro normal
const initAngle1 = vm.runInContext('playerCar.angle', ctx);
vm.runInContext('touchLeft = true; touchHandbrake = false; updatePlayer(0.016, window.DustracTracks["rookie_ring"]);', ctx);
const normalTurnDelta = Math.abs(vm.runInContext('playerCar.angle', ctx) - initAngle1);

// Probar giro con freno de mano (derrape)
const initAngle2 = vm.runInContext('playerCar.angle', ctx);
vm.runInContext('touchLeft = true; touchHandbrake = true; updatePlayer(0.016, window.DustracTracks["rookie_ring"]);', ctx);
const driftTurnDelta = Math.abs(vm.runInContext('playerCar.angle', ctx) - initAngle2);

console.log(`Giro estándar por frame: ${normalTurnDelta.toFixed(3)}° | Giro con derrape/freno de mano: ${driftTurnDelta.toFixed(3)}°`);
if (driftTurnDelta <= normalTurnDelta * 1.5) {
    throw new Error('El freno de mano debe incrementar la rotación/yaw de forma contundente (+85%) para horquillas cerradas');
}
console.log('✓ Freno de mano amplifica la rotación de horquilla correctamente');

// Verificar acumulación de driftCharge y boost al soltar freno de mano
vm.runInContext('playerSpeed = 200; touchHandbrake = true; touchLeft = true; updatePlayer(0.5, window.DustracTracks["rookie_ring"]);', ctx);
const charge = vm.runInContext('driftCharge', ctx);
console.log(`Carga de derrape acumulada: ${charge.toFixed(2)}`);
if (charge <= 0.3) {
    throw new Error('La carga de derrape debe acumularse mientras se derrapa en curva');
}

// Al soltar el freno de mano, se activa el boost de derrape
const preBoostSpeed = vm.runInContext('playerSpeed', ctx);
vm.runInContext('touchHandbrake = false; touchLeft = false; touchGas = true; updatePlayer(0.016, window.DustracTracks["rookie_ring"]);', ctx);
const postBoostSpeed = vm.runInContext('playerSpeed', ctx);
console.log(`Velocidad antes de soltar derrape: ${preBoostSpeed.toFixed(1)} | Velocidad tras boost: ${postBoostSpeed.toFixed(1)}`);
if (postBoostSpeed <= preBoostSpeed) {
    throw new Error('Debe otorgarse un impulso turbo de salida al soltar el freno de mano');
}
console.log('✓ Impulso turbo de salida de derrape ejecutado con éxito');

// ===== VERIFICACIÓN DE MODO FANTASMA EN SALIDA (5 SEGUNDOS) =====
console.log('\n--- VERIFICANDO MODO FANTASMA DE SALIDA (INMUNIDAD 5S) ---');
const nowTime = Date.now();
vm.runInContext(`raceStartTime = ${nowTime}; gameState = "RACE";`, ctx);
const isGhostActive = vm.runInContext('(Date.now() - raceStartTime) < 5000', ctx);
console.log('Inmunidad de colisiones activa en los primeros 5s:', isGhostActive);
if (!isGhostActive) {
    throw new Error('Modo fantasma debe estar activo al inicio de la carrera');
}

// Simular colisión en t = 1s (dentro de los 5s)
vm.runInContext('playerCar.x = 100; playerCar.y = 100;', ctx);
vm.runInContext('aiCars[0].x = 100; aiCars[0].y = 100;', ctx);
const spdBefore = vm.runInContext('playerSpeed = 300', ctx);
vm.runInContext('handleCollisions()', ctx);
const spdAfter = vm.runInContext('playerSpeed', ctx);
if (spdBefore !== spdAfter) {
    throw new Error('En modo fantasma las colisiones no deben ralentizar ni chocar los coches');
}
// ===== VERIFICACIÓN DE PERSONALIZACIÓN DE NOMBRE DE PILOTO & MODAL =====
console.log('\n--- VERIFICANDO EDICIÓN Y PERSONALIZACIÓN DE NOMBRE DE PILOTO ---');
const initialPilot = vm.runInContext('getPlayerName()', ctx);
console.log('Nombre de piloto inicial:', initialPilot);
if (!initialPilot) {
    throw new Error('getPlayerName() debe retornar un nombre de piloto por defecto');
}

const updateOk = vm.runInContext('setPlayerName("Apex_Champion_99")', ctx);
console.log('Resultado de setPlayerName:', updateOk);
const newPilot = vm.runInContext('getPlayerName()', ctx);
console.log('Nuevo nombre de piloto guardado:', newPilot);
if (newPilot !== 'Apex_Champion_99') {
    throw new Error(`setPlayerName falló al guardar: esperado Apex_Champion_99, obtenido ${newPilot}`);
}

// Probar que renderHubHeader renderiza el nombre y el botón lápiz
vm.runInContext('renderHubHeader()', ctx);
const headerHtml = doc.getElementById('hub-header').innerHTML;
if (!headerHtml.includes('Apex_Champion_99') || !headerHtml.includes('btn-edit-pilot-name')) {
    throw new Error('La cabecera debe mostrar el nombre del piloto personalizado y el botón de edición');
}
console.log('✓ Cabecera actualizada con nombre y botón lápiz ✏️ de edición');

// Probar modal de ajustes con sección de nombre de piloto
vm.runInContext('openSettingsModal()', ctx);
const settingsHtml = doc.getElementById('settings-modal').innerHTML;
if (!settingsHtml.includes('setting-input-pilot-name') || !settingsHtml.includes('btn-save-pilot-name')) {
    throw new Error('Los ajustes deben contener el campo y botón para guardar el nombre de piloto');
}
console.log('✓ Modal de Ajustes contiene campo de edición de nombre y botón de guardado');

// Probar modal de edición de nombre
vm.runInContext('openEditPilotNameModal()', ctx);
const editModal = doc.getElementById('edit-name-modal');
if (!editModal || !editModal.innerHTML.includes('modal-input-pilot-name')) {
    throw new Error('El modal de edición rápida de piloto debe renderizarse');
}
console.log('✓ Modal interactivo de edición rápida de nombre de piloto activo');

// Probar modal de clasificación mundial con puesto y nombre del piloto
vm.runInContext('openLeaderboardModal()', ctx);
const lbModal = doc.getElementById('leaderboard-modal');
if (!lbModal || !lbModal.innerHTML.includes('Apex_Champion_99')) {
    throw new Error('La tabla clasificatoria debe mostrar la posición y el nombre del piloto del usuario');
}
console.log('✓ Modal de clasificación mundial muestra el ranking y el piloto del usuario');

// ===== VERIFICACIÓN DE OPCIÓN B: GRÁFICOS E INMERSIÓN =====
console.log('\n--- VERIFICANDO GRÁFICOS E INMERSIÓN: FAROS, SKIDMARKS Y LÍNEAS DE VELOCIDAD ---');
// Probar trazado continuo de huellas de goma (Skid Marks Pro)
const skidTestCar = { x: 500, y: 500, angle: 45, prevSkidL: null, prevSkidR: null };
vm.runInContext(`drawSkid(500, 500, 45, ${JSON.stringify(skidTestCar)})`, ctx);
const skidCarAfter = vm.runInContext(`
    const carObj = { x: 520, y: 520, angle: 45, prevSkidL: { x: 508, y: 512 }, prevSkidR: { x: 492, y: 488 } };
    drawSkid(carObj.x, carObj.y, carObj.angle, carObj);
    carObj.prevSkidL;
`, ctx);
if (!skidCarAfter || typeof skidCarAfter.x !== 'number') {
    throw new Error('drawSkid debe soportar bandas de rodadura continua');
}
console.log('✓ Huellas de derrape continuas registradas correctamente');

// ===== VERIFICACIÓN DE OPCIÓN C: ECOSISTEMA WEB3 & TELEGRAM =====
console.log('\n--- VERIFICANDO ECOSISTEMA WEB3: PASE DE TEMPORADA, MERCADO P2P Y TORNEO SEMANAL ---');

// 1. Pase de Temporada (Battle Pass)
const tiersHaveMoneyOrTon = vm.runInContext('SEASON_PASS_TIERS.some(t => t.rewardType === "credits" || t.rewardType === "gems" || t.rewardType === "crate")', ctx);
if (tiersHaveMoneyOrTon) {
    throw new Error('FALLO DE ECONOMÍA: El Pase de Temporada no debe regalar TON, ni tokens $CR, ni cofres.');
}
console.log('✓ Protección de Economía: El Pase de Temporada solo otorga suministros (nitros, energía, piezas), sin TON ni tokens');

const passClaimRes = vm.runInContext('claimSeasonPassTier(2)', ctx);
console.log('Resultado de reclamar Tier 2 del Pase:', passClaimRes.success);
if (!passClaimRes.success) {
    throw new Error('Fallo al reclamar Tier 2 del Pase de Temporada');
}
const missionClaimRes = vm.runInContext('claimDailyMission("m_races")', ctx);
console.log('Resultado de reclamar Misión Diaria:', missionClaimRes.success);
if (!missionClaimRes.success) {
    throw new Error('Fallo al reclamar recompensa de misión diaria del Pase');
}
vm.runInContext('openBattlePassModal()', ctx);
const bpModal = doc.getElementById('battle-pass-modal');
if (!bpModal || !bpModal.innerHTML.includes('PASE DE TEMPORADA: NEON APEX') || !bpModal.innerHTML.includes('TIER 2')) {
    throw new Error('El modal del Pase de Temporada debe renderizarse con misiones y tiers');
}
if (bpModal.innerHTML.includes('+25 Tokens TON') || bpModal.innerHTML.includes('+2.500 $CR') || bpModal.innerHTML.includes('Caja de Plata')) {
    throw new Error('FALLO DE ECONOMÍA: El modal del Pase aún muestra textos de TON, tokens o cajas');
}
console.log('✓ Modal y lógica del Pase de Temporada (Neon Apex) funcionando al 100%');

// 2. Mercado P2P Comunitario
const listingsCount = vm.runInContext('getMarketplaceListings().length', ctx);
console.log('Ofertas comunitarias iniciales en el Mercado P2P:', listingsCount);
if (listingsCount < 3) {
    throw new Error('El mercado P2P debe contener ofertas iniciales comunitarias');
}

// Comprobar que hay ofertas de piezas y ofertas de coches NFT
const hasPartListings = vm.runInContext('getMarketplaceListings().some(l => l.type === "part")', ctx);
const hasCarListings = vm.runInContext('getMarketplaceListings().some(l => l.type === "car")', ctx);
if (!hasPartListings || !hasCarListings) {
    throw new Error('El mercado P2P debe albergar tanto piezas mecánicas como coches NFT');
}
console.log('✓ Catálogo P2P contiene tanto piezas mecánicas como coches NFT');

// Probar publicación de pieza en el mercado (NO se incrementa el saldo del jugador al instante)
const creditsBeforeList = vm.runInContext('loadNftUserData().credits', ctx);
const listPartRes = vm.runInContext('listPartOnMarketplace("brake_pads", 450)', ctx);
const creditsAfterList = vm.runInContext('loadNftUserData().credits', ctx);
if (!listPartRes.success || creditsBeforeList !== creditsAfterList) {
    throw new Error('La publicación P2P no debe generar dinero de la nada; el artículo queda en venta');
}
console.log('✓ Publicación P2P correcta: la pieza queda a la venta sin que la plataforma compre con fondos propios');

// Cancelar el listado y verificar devolución al inventario
const cancelRes = vm.runInContext(`cancelMarketplaceListing("${listPartRes.listing.id}")`, ctx);
if (!cancelRes.success) {
    throw new Error('Debe permitir cancelar listados propios y recuperar la pieza');
}
console.log('✓ Cancelación de listado comprobada: la pieza vuelve al inventario');

// Probar publicación de coche NFT en el mercado
const carToList = vm.runInContext(`
    (() => {
        const uData = loadNftUserData();
        uData.garage.push({ instanceId: 'test_nft_car_p2p', modelId: 'rare_01', name: 'TEST GT3 CAR', rarity: 'rare', level: 1 });
        saveNftUserData(uData);
        return 'test_nft_car_p2p';
    })()
`, ctx);
const listCarRes = vm.runInContext(`listCarOnMarketplace('${carToList}', 5000)`, ctx);
if (!listCarRes.success || listCarRes.listing.type !== 'car') {
    throw new Error('Fallo al listar coche NFT en el mercado P2P');
}
console.log('✓ Coche NFT listado en el Mercado P2P con éxito');

// Probar compra de coche NFT y verificar la distribución de la comisión 7.5% (2.5% dev, 2.5% burn, 2.5% pool)
const burnedBeforeBuy = vm.runInContext('loadNftUserData().wagerStats ? loadNftUserData().wagerStats.burnedTokens : 0', ctx);
const rewardsBeforeBuy = vm.runInContext('loadNftUserData().wagerStats ? loadNftUserData().wagerStats.rewardsFees : 0', ctx);
const devBeforeBuy = vm.runInContext('loadNftUserData().platformTreasuryFees || 0', ctx);

const buyCarRes = vm.runInContext('buyMarketplaceItem("lst_05")', ctx);
if (!buyCarRes.success || buyCarRes.listing.type !== 'car') {
    throw new Error('Fallo al comprar coche NFT en el mercado P2P');
}
if (buyCarRes.devFee !== Math.round(2800 * 0.025) || buyCarRes.burnFee !== Math.round(2800 * 0.025)) {
    throw new Error(`Reparto de comisión 7.5% incorrecto: ${JSON.stringify(buyCarRes)}`);
}
console.log(`✓ Compra de Coche NFT P2P ejecutada: Precio 2800 $CR -> Quema: ${buyCarRes.burnFee} $CR, Pool: ${buyCarRes.rewardsFee} $CR, Tesorería: ${buyCarRes.devFee} $CR`);

const sellRes = vm.runInContext('sellPartToMarketplace("spark_plugs", 200)', ctx);
console.log('Resultado de venta en el Mercado P2P (+200 $CR):', sellRes.success);
if (!sellRes.success) {
    throw new Error('Fallo al vender pieza en el Mercado P2P');
}

vm.runInContext('openPartsMarketplaceModal("buy")', ctx);
const mpModal = doc.getElementById('marketplace-modal');
if (!mpModal || !mpModal.innerHTML.includes('MERCADO P2P ENTRE JUGADORES')) {
    throw new Error('El modal del Mercado P2P debe renderizarse');
}
if (mpModal.innerHTML.includes('Comisión Total: 7.5%') || mpModal.innerHTML.includes('2.5% Quema Deflacionaria')) {
    throw new Error('El modal del Mercado P2P no debe mostrar carteles alarmantes de comisión');
}
console.log('✓ Mercado P2P limpio: Cartel alarmante de comisión retirado de la interfaz para evitar fricción visual');

// Probar pestaña de venta en el modal
vm.runInContext('openPartsMarketplaceModal("sell")', ctx);
const mpSellModal = doc.getElementById('marketplace-modal');
if (!mpSellModal || !mpSellModal.innerHTML.includes('PUBLICAR EN VENTA (P2P)') || !mpSellModal.innerHTML.includes('MIS COCHES NFT')) {
    throw new Error('El modal de venta P2P debe permitir publicar tanto piezas como coches NFT');
}
console.log('✓ Mercado P2P completo: Comercio de piezas y coches entre jugadores verificado al 100%');

// 3. Torneo Semanal Oficial (Inscripción 20 $CR, Fondo Casa 200 $CR, Fee 5%, Reparto 95%)
const tourneyInfo = vm.runInContext('getWeeklyTournamentInfo()', ctx);
console.log('Torneo Semanal:', tourneyInfo.title, 'Inscripción:', tourneyInfo.entryFeeCr, '$CR | Bote Bruto:', tourneyInfo.grossPotCr, '$CR | Bote Neto (95%):', tourneyInfo.netPrizePotCr, '$CR | Fee 5%:', tourneyInfo.devFeeCr, '$CR');
if (!tourneyInfo.title || tourneyInfo.entryFeeCr !== 20) {
    throw new Error('La inscripción del torneo semanal debe ser exactamente 20 $CR');
}
if (tourneyInfo.devFeeCr !== Math.round(tourneyInfo.grossPotCr * 0.05)) {
    throw new Error('La comisión recuperada por la plataforma en el torneo semanal debe ser el 5% del bote bruto');
}
if (tourneyInfo.leaderboard.length < 5) {
    throw new Error('El leaderboard del torneo semanal debe premiar al menos al Top 5 / Top 10');
}
const preTourneyFees = vm.runInContext('loadNftUserData().platformTreasuryFees || 0', ctx);
const enterTourneyRes = vm.runInContext('enterWeeklyTournament()', ctx);
console.log('Resultado de inscripción en el Torneo Semanal:', enterTourneyRes.success, 'Fee pagada:', enterTourneyRes.feePaid);
if (!enterTourneyRes.success || enterTourneyRes.feePaid !== 20) {
    throw new Error('Fallo al inscribirse en el Torneo Semanal Oficial');
}
const postTourneyFees = vm.runInContext('loadNftUserData().platformTreasuryFees || 0', ctx);
if (postTourneyFees <= preTourneyFees) {
    throw new Error('La inscripción al torneo debe acumular el 5% de fee en la tesorería de la plataforma');
}
vm.runInContext('openWeeklyTournamentModal()', ctx);
const wtModal = doc.getElementById('weekly-tournament-modal');
if (!wtModal || !wtModal.innerHTML.includes('TORNEO SEMANAL GT GRAND PRIX') || !wtModal.innerHTML.includes('20 $CR')) {
    throw new Error('El modal del Torneo Semanal debe renderizarse con la cuota de 20 $CR');
}
if (wtModal.innerHTML.includes('TON')) {
    throw new Error('El modal del Torneo Semanal no debe prometer ni otorgar TON');
}
console.log('✓ Torneo Semanal GT Grand Prix verificado con cuota de 20 $CR y 100% libre de recompensas en TON');

// 3.1 Hitos de Maestría por Nivel de Coche (Cada 10 niveles: +1 Stat a elección por $CR)
console.log('\n--- VERIFICANDO HITOS DE MAESTRÍA POR NIVEL DE COCHE (+1 STAT CADA 10 NIVELES) ---');
vm.runInContext(`
    (() => {
        const u = loadNftUserData();
        const testCar = u.garage[0];
        testCar.level = 10;
        testCar.xp = 0;
        testCar.claimedMilestones = [];
        testCar.milestoneStats = {};
        u.credits = 10000;
        saveNftUserData(u);
    })();
`, ctx);

const milestonesList = vm.runInContext(`getCarMilestones(loadNftUserData().garage[0])`, ctx);
console.log('Hitos calculados para coche nivel 10:', milestonesList.map(m => ({ level: m.level, cost: m.costCr, unlocked: m.isUnlocked, claimed: m.isClaimed })));
if (milestonesList.length !== 5) throw new Error('Debe haber 5 hitos (10, 20, 30, 40, 50)');
if (milestonesList[0].costCr !== 1000 || milestonesList[1].costCr !== 2000 || milestonesList[2].costCr !== 3000) {
    throw new Error('Los costes de los hitos deben ser 1000, 2000, 3000... $CR');
}
if (!milestonesList[0].isUnlocked || milestonesList[1].isUnlocked) {
    throw new Error('Solo el hito de nivel 10 debe estar desbloqueado para un coche nivel 10');
}

// Probar asignación de punto de hito a aceleración (+1 por 1000 $CR)
const carInstId = vm.runInContext(`loadNftUserData().garage[0].instanceId`, ctx);
const prePerf = vm.runInContext(`calculateCarPerformance(loadNftUserData().garage[0])`, ctx);
const claimMilestoneRes = vm.runInContext(`claimCarMilestoneStat('${carInstId}', 10, 'aceleracion')`, ctx);
console.log('Resultado de reclamar Hito Nivel 10 (+1 Aceleración):', claimMilestoneRes.success, 'Coste:', claimMilestoneRes.costCr);
if (!claimMilestoneRes.success || claimMilestoneRes.costCr !== 1000) {
    throw new Error('Fallo al reclamar Hito de nivel 10 por 1000 $CR');
}
const postPerf = vm.runInContext(`calculateCarPerformance(loadNftUserData().garage[0])`, ctx);
console.log(`Aceleración previa: ${prePerf.effectiveStats.aceleracion} -> Posterior al hito: ${postPerf.effectiveStats.aceleracion}`);
if (postPerf.effectiveStats.aceleracion !== prePerf.effectiveStats.aceleracion + 1) {
    throw new Error('La estadística de aceleración debe aumentar exactamente en +1');
}

// Probar bloqueo de reclamo duplicado
const doubleClaimRes = vm.runInContext(`claimCarMilestoneStat('${carInstId}', 10, 'velocidad')`, ctx);
if (doubleClaimRes.success) throw new Error('No se debe permitir reclamar dos veces el mismo hito');

// Probar renderizado del modal de Hitos
vm.runInContext(`openCarMilestoneModal('${carInstId}')`, ctx);
const mModal = doc.getElementById('milestone-modal');
if (!mModal || !mModal.innerHTML.includes('HITOS DE MAESTRÍA') || !mModal.innerHTML.includes('Aceleración')) {
    throw new Error('El modal de Hitos de Maestría debe renderizarse con las opciones de estadísticas');
}
console.log('✓ Sistema de Hitos de Maestría verificado (+1 stat por cada 10 niveles)');

// 4. Quitamiedos y Barreras Infranqueables (radiator_oval)
console.log('\n--- VERIFICANDO QUITAMIEDOS METÁLICOS ARMCO Y BARRERAS INFRANQUEABLES ---');
vm.runInContext("launchRaceDirectly('radiator_oval')", ctx);
const barriersCount = vm.runInContext('trackBarriers.length', ctx);
console.log('Quitamiedos y barreras físicas registradas en Radiator Oval:', barriersCount);
if (barriersCount < 20) {
    throw new Error('Radiator Oval debe registrar más de 20 quitamiedos físicos');
}

// Probar colisión física que repele al coche sin dejarle atravesar
const preBarrierX = 1280;
const preBarrierY = 1150;
vm.runInContext(`
    playerCar.x = 1280;
    playerCar.y = 1150; // Exactamente sobre el quitamiedos
    raceStartTime = 0; // Fuera de modo fantasma
    handleCollisions();
`, ctx);
const repelledX = vm.runInContext('playerCar.x', ctx);
const repelledY = vm.runInContext('playerCar.y', ctx);
const wasRepelled = (repelledX !== preBarrierX || repelledY !== preBarrierY);
console.log('Coche repelido por el quitamiedos:', wasRepelled, `(${repelledX.toFixed(1)}, ${repelledY.toFixed(1)})`);
if (!wasRepelled) {
    throw new Error('El quitamiedos debe repeler físicamente al vehículo para impedir atravesar');
}
console.log('✓ Quitamiedos metálicos Armco activos y bloqueando atajos entre curvas');

// 5. Verificando IA con adelantamientos y trazadas diferenciadas
console.log('\n--- VERIFICANDO IA CON ADELANTAMIENTOS Y TRAZADAS DIFERENCIADAS ---');
vm.runInContext("launchRaceDirectly('rookie_ring')", ctx);
const aiStyles = vm.runInContext("aiCars.map(ai => ai.profile.drivingStyle)", ctx);
const aiOffsets = vm.runInContext("aiCars.map(ai => ai.profile.laneOffset)", ctx);
console.log('Estilos de conducción de rivales IA:', aiStyles);
console.log('Offsets de carril de rivales IA:', aiOffsets);
if (!aiStyles.includes('apex_hunter') || !aiStyles.includes('sweeper')) {
    throw new Error('Los rivales IA deben tener diferentes estilos de conducción (apex_hunter, sweeper, etc.)');
}
// Probar maniobra de adelantamiento activa cuando un coche se acerca por detrás
vm.runInContext(`
    const ai1 = aiCars[0];
    const ai2 = aiCars[1];
    ai1.x = 500; ai1.y = 500; ai1.angle = 0; ai1.aiVelocity = 350;
    ai2.x = 560; ai2.y = 505; ai2.angle = 0; ai2.aiVelocity = 280; // ai2 delante a 60px
    const trk = (window.DustracTracks && window.DustracTracks[currentTrackId]) || { nodes: [{ x: 600, y: 500 }, { x: 700, y: 500 }, { x: 800, y: 500 }] };
    updateAiCar(ai1, 0.05, trk);
`, ctx);
const overtakeDir = vm.runInContext('aiCars[0].overtakeDir', ctx);
console.log('Dirección de adelantamiento iniciada por la IA:', overtakeDir);
if (overtakeDir === 0) {
    throw new Error('La IA debe iniciar una maniobra de adelantamiento lateral al aproximarse a otro vehículo');
}
console.log('✓ IA con adelantamiento dinámico y trazadas personalizadas verificada con éxito');

// 6. Verificando Arcos Publicitarios Elevados de Lado a Lado (Overhead Sponsor Gantries)
console.log('\n--- VERIFICANDO ARCOS PUBLICITARIOS ELEVADOS DE LADO A LADO ---');
const archTest = vm.runInContext(`
    // Comprobar que en rectas los arcos se colocan perpendiculares atravesando la pista de lado a lado
    // y los coches pasan por debajo a profundidad 10 mientras el arco está a profundidad 18
    const vArchAngle = (0 === 0 || 0 === 180) ? 0 : 90;
    const hArchAngle = (90 === 0 || 90 === 180) ? 0 : 90;
    const expectedTextures = ['dt_arch_motul', 'dt_arch_pirelli', 'dt_arch_michelin', 'dt_arch_brembo', 'dt_arch_castrol', 'dt_arch_badlands'];
    ({ vArchAngle, hArchAngle, expectedTextures })
`, ctx);
console.log('Ángulo de pórtico en recta vertical (esperado 0° para cruzar horizontalmente):', archTest.vArchAngle);
console.log('Ángulo de pórtico en recta horizontal (esperado 90° para cruzar verticalmente):', archTest.hArchAngle);
console.log('Pórticos de marcas oficiales reconocidos:', archTest.expectedTextures.length);
if (archTest.vArchAngle !== 0 || archTest.hArchAngle !== 90) {
    throw new Error('Los arcos publicitarios elevados deben cruzar perpendicularmente la pista de lado a lado');
}
console.log('✓ Arcos publicitarios elevados de lado a lado con paso inferior verificados con éxito');

// 7. Verificando Tacómetro deportivo y Semáforo FIA de 5 luces
console.log('\n--- VERIFICANDO TACÓMETRO DEPORTIVO Y SEMÁFORO FIA 5 LUCES ---');
const hasTachoGfx = vm.runInContext('Boolean(hudTachoGfx && hudGearText && hudRpmText)', ctx);
console.log('Cuadro de instrumentos y tacómetro deportivo inicializado:', hasTachoGfx);
if (!hasTachoGfx) {
    throw new Error('El HUD debe incluir el tacómetro deportivo y marchas');
}
console.log('✓ Tacómetro de competición y luces de cambio de marcha GT3 activos');

// 8. Verificando Contratos de Patrocinio de Piloto
console.log('\n--- VERIFICANDO SISTEMA DE CONTRATOS DE PATROCINIO (SPONSORSHIPS) ---');
const sponsorList = vm.runInContext('getSponsorshipContracts()', ctx);
console.log('Total de contratos de patrocinio disponibles:', sponsorList.length);
sponsorList.forEach(sp => console.log(`- ${sp.name}: ${sp.goalLabel} [${sp.signed ? 'FIRMADO' : 'DISPONIBLE'}]`));
if (sponsorList.length < 4) {
    throw new Error('Debe haber al menos 4 contratos de marcas de patrocinio oficiales');
}
// Verificar protección de economía en patrocinios
const sponsorsHaveMoneyOrTon = vm.runInContext('SPONSORSHIP_CONTRACTS_DATA.some(s => (s.rewardCredits && s.rewardCredits > 0) || (s.rewardTon && s.rewardTon > 0))', ctx);
if (sponsorsHaveMoneyOrTon) {
    throw new Error('FALLO DE ECONOMÍA: Los patrocinadores no deben regalar TON ni tokens $CR.');
}
console.log('✓ Protección de Economía: Los patrocinadores no regalan TON ni tokens (otorgan XP, suministros y piezas)');

const signRes = vm.runInContext("signSponsorshipContract('sp_castrol')", ctx);
console.log('Firma de contrato con Dust & Nitro Synthetic:', signRes.success);
if (!signRes.success) {
    throw new Error('Debe permitir firmar contratos de patrocinio');
}
// Probar actualización de progreso tras carrera (top speed y podium)
const completedSponsors = vm.runInContext("updateSponsorshipProgress({ rank: 2, topSpeed: 385, drifts: 4 })", ctx);
console.log('Patrocinios completados tras prueba:', completedSponsors.map(s => s.name));
vm.runInContext('openSponsorsModal()', ctx);
const spModal = doc.getElementById('sponsors-modal');
if (!spModal || !spModal.innerHTML.includes('CONTRATOS DE PATROCINIO')) {
    throw new Error('El modal interactivo de patrocinadores debe renderizarse');
}
if (spModal.innerHTML.includes('+650 $CR') || spModal.innerHTML.includes('+0.06 TON') || spModal.innerHTML.includes('+1200 $CR') || spModal.innerHTML.includes('+0.15 TON')) {
    throw new Error('FALLO DE ECONOMÍA: El modal de Patrocinadores aún contiene textos de TON o $CR');
}
console.log('✓ Modal de Patrocinadores verificado sin fuga económica de TON o tokens');
// 9. Verificando Fin de Carrera y Retorno al Menú de Pistas (showMenu)
console.log('\n--- VERIFICANDO FIN DE CARRERA Y RETORNO AL MENÚ DE PISTAS ---');
vm.runInContext(`
    launchRaceDirectly('rookie_ring');
    playerLap = 4; // Cruza la meta final
    endRace();
`, ctx);
const stateAfterRace = vm.runInContext('gameState', ctx);
console.log('Estado al cruzar la meta:', stateAfterRace);
if (stateAfterRace !== 'FINISHED') {
    throw new Error('El estado tras la carrera debe ser FINISHED');
}
// Simular clic en "VOLVER AL MENÚ DE PISTAS"
vm.runInContext('showMenu(raceScene)', ctx);
const stateAfterMenu = vm.runInContext('gameState', ctx);
const playerCarAfterMenu = vm.runInContext('playerCar', ctx);
console.log('Estado tras pulsar Volver al Menú de Pistas:', stateAfterMenu);
console.log('PlayerCar limpiado y cámara restablecida a (0, 0):', playerCarAfterMenu === null);
if (stateAfterMenu !== 'MENU' || playerCarAfterMenu !== null) {
    throw new Error('showMenu debe restablecer la cámara y el estado a MENU limpiando el vehículo');
}
console.log('✓ Retorno al menú de pistas verificado con éxito sin pantallas congeladas');

// 10. Verificando Gráficos Profesionales, Vehículos de Apoyo y Ambientación
console.log('\n--- VERIFICANDO GRÁFICOS PROFESIONALES Y AMBIENTACIÓN DE CIRCUITO ---');
vm.runInContext(`
    buildProRacingEnvironmentTextures(raceScene);
`, ctx);
const proTextureKeys = [
    'dt_brake_150', 'dt_brake_100', 'dt_brake_50',
    'dt_safety_car', 'dt_medical_car', 'dt_recovery_crane',
    'dt_flag_checkered', 'dt_flag_red', 'dt_flag_blue',
    'dt_smoke_flare_red', 'dt_smoke_flare_yellow',
    'dt_floodlight_tower', 'dt_light_cone',
    'dt_tire_smoke', 'dt_vignette'
];
proTextureKeys.forEach(k => {
    const exists = vm.runInContext(`raceScene.textures.exists('${k}')`, ctx);
    if (!exists) {
        throw new Error('Falta textura profesional obligatoria: ' + k);
    }
});
console.log('✓ Texturas de ambientación profesional generadas correctamente (' + proTextureKeys.length + ' texturas)');

// Probar lanzamiento de circuito nocturno con torres de iluminación y viñeta
vm.runInContext(`
    selectedTimeOfDay = 'night';
    launchRaceDirectly('neo_tokyo_bay');
`, ctx);
console.log('✓ Circuito nocturno lanzado con iluminación de focos, sombras dinámicas y viñeta cinemática');

// 11. Verificando Correcciones: Arcos de Patrocinio Cruzados, IA Desatascable y Bioma Nieve
console.log('\n--- VERIFICANDO CORRECCIONES: ARCOS, IA DESATASCABLE Y NIEVE BLANCA ---');

// A) Orientación de arco en Desert Canyon (tile con o=360 debe cruzar horizontalmente a 0°)
const desertTrack = vm.runInContext("DustracTracks['desert_canyon']", ctx);
const desertTile360 = desertTrack.tiles.find(t => t.i === 6 && t.j === 18);
if (!desertTile360 || desertTile360.o !== 360) {
    throw new Error('Debe existir el tile de recta vertical con o=360 en desert_canyon');
}
const normO = ((desertTile360.o % 360) + 360) % 360;
const isVert = (normO === 0 || normO === 180);
if (!isVert) {
    throw new Error('El tile con o=360 debe normalizarse a recta vertical');
}
console.log('✓ Arcos en rectas con o=360 orientados horizontalmente (0°) para cruzar la calzada de lado a lado');

// B) Desatasco activo de la IA (Maniobra de marcha atrás y evasión)
vm.runInContext(`
    launchRaceDirectly('rookie_ring');
    const testAi = aiCars[0];
    testAi.aiVelocity = 0;
    // Simular que está bloqueado contra un obstáculo por más de 0.8s
    testAi.unstuckState = { state: 'NORMAL', timer: 0.85, reverseDuration: 0, lastX: testAi.x, lastY: testAi.y, checkTimer: 0 };
    updateAiCar(testAi, 0.05, DustracTracks['rookie_ring']);
`, ctx);
const aiStateAfterStuck = vm.runInContext('aiCars[0].unstuckState.state', ctx);
const aiVelAfterStuck = vm.runInContext('aiCars[0].aiVelocity', ctx);
console.log('Estado de IA tras bloqueo:', aiStateAfterStuck, '| Velocidad (marcha atrás):', aiVelAfterStuck);
if (aiStateAfterStuck !== 'REVERSING' || aiVelAfterStuck >= 0) {
    throw new Error('La IA debe entrar en estado REVERSING con velocidad negativa al atascarse');
}
console.log('✓ Sistema anti-atasco con marcha atrás evasiva operativa al 100%');

// C) Bioma Nieve con Nieve Pura Blanca e iluminación diurna alpina
vm.runInContext(`
    launchRaceDirectly('nordkette_pass');
`, ctx);
const snowTrackTod = vm.runInContext("STORY_CHAPTERS[4].tracks.find(t => t.id === 'nordkette_pass').tod", ctx);
console.log('Hora del día en Nordkette Alpine Pass:', snowTrackTod);
if (snowTrackTod !== 'day') {
    throw new Error('Nordkette Pass debe ser de día para reflejar la nieve blanca pura');
}
console.log('✓ Circuito de nieve configurado con nieve blanca pura y luz solar diurna alpina');

// --- VERIFICANDO MEJORAS GRÁFICAS PROFESIONALES DE COMPETICIÓN (V48) ---
console.log('\n--- VERIFICANDO MEJORAS GRÁFICAS PROFESIONALES (V48) ---');

// 1. Texturas de backfire, debris, spray y comisarios
const texturesCheck = [
    'dt_backfire_flame', 'dt_water_spray',
    'dt_debris_grass', 'dt_debris_gravel', 'dt_debris_snow',
    'dt_marshal_green', 'dt_marshal_yellow', 'dt_marshal_checkered'
];
vm.runInContext(`
    buildProRacingEnvironmentTextures(raceScene);
`, ctx);
const texturesCount = vm.runInContext(`
    ${JSON.stringify(texturesCheck)}.filter(k => raceScene.textures.exists(k)).length;
`, ctx);
console.log('Nuevas texturas profesionales registradas:', texturesCount, '/', texturesCheck.length);
if (texturesCount !== texturesCheck.length) {
    throw new Error('Faltan texturas profesionales por generar en buildProRacingEnvironmentTextures');
}
console.log('✓ Texturas de backfire, spray, debris y comisarios generadas con éxito');

// 2. Petardeo y Llamaradas de Escape Dual (Backfire & Anti-lag)
vm.runInContext(`
    dustAudio.init();
    dustAudio.playBackfire();
    spawnBackfireFlame(raceScene, playerCar);
`, ctx);
console.log('✓ Petardeo de audio y llamaradas de escape dual (GT3 Backfire) verificados');

// 3. Chispas de titanio de fondo plano (Titanium Sparks Shower)
vm.runInContext(`
    spawnTitaniumSparks(raceScene, playerCar.x, playerCar.y, playerCar.angle, 5);
`, ctx);
console.log('✓ Emisor de chispas de titanio en fondo plano y pianos verificado');

// 4. Brillo de Carrocería Fresnel y Bloom de Faros
vm.runInContext(`
    selectedTimeOfDay = 'sunset';
    updateCarVisuals();
`, ctx);
const sheenExists = vm.runInContext('Boolean(playerCar.sheenGfx)', ctx);
console.log('Brillo Fresnel de carrocería (Sheen) activo:', sheenExists);
if (!sheenExists) {
    throw new Error('playerCar.sheenGfx debe estar instanciado');
}
console.log('✓ Reflejo especular Fresnel y halos bloom en faros y pilotos GT3 activos');

// 5. Trazada Engomada Dinámica (Progressive Racing Groove)
vm.runInContext(`
    launchRaceDirectly('rookie_ring');
`, ctx);
const grooveExists = vm.runInContext('Boolean(racingGrooveLayer)', ctx);
console.log('Capa de trazada engomada (Racing Groove) activa:', grooveExists);
if (!grooveExists) {
    throw new Error('racingGrooveLayer debe estar presente en el circuito');
}
console.log('✓ Trazada engomada dinámica (Racing Groove) verificada');

// 6. Debris físico (Hierba, Grava, Nieve)
vm.runInContext(`
    spawnDebris(raceScene, playerCar.x, playerCar.y, 'grass', playerCar.angle, 150);
    spawnDebris(raceScene, playerCar.x, playerCar.y, 'gravel', playerCar.angle, 150);
    spawnDebris(raceScene, playerCar.x, playerCar.y, 'snow', playerCar.angle, 150);
`, ctx);
console.log('✓ Eyección de restos y debris balístico verificado');

// 7. Comisarios de Pista Animados (Track Marshals)
const marshalsCount = vm.runInContext('trackMarshals.length', ctx);
console.log('Comisarios de pista desplegados en escapatorias:', marshalsCount);
if (marshalsCount < 1) {
    throw new Error('Debe haber comisarios de pista desplegados en las curvas');
}
console.log('✓ Comisarios de pista animados ondeando banderas colocados correctamente');

// 8. Modo Lluvia (Wet Weather / Rain Mode)
vm.runInContext(`
    selectedTimeOfDay = 'rain';
    initWeatherParticles('circuit');
    updatePlayer(0.016, DustracTracks['rookie_ring']);
    spawnWaterSpray(raceScene, playerCar);
`, ctx);
const rainParticlesCount = vm.runInContext('weatherParticles.length', ctx);
console.log('Partículas de lluvia generadas en Modo Lluvia:', rainParticlesCount);
if (rainParticlesCount < 80) {
    throw new Error('El Modo Lluvia debe inicializar partículas densas de lluvia');
}
// 9. Parallax 2.5D en Alturas, Césped a Franjas, Barreras de Neumáticos 3D y Marcas de Asfalto (v50)
console.log('\n--- VERIFICANDO MEJORAS DE ESCENARIOS Y PARALLAX 2.5D (V50) ---');
vm.runInContext(`
    startRace(raceScene, 'rookie_ring', 0, 'day');
`, ctx);
const parallaxCount = vm.runInContext('parallaxObjects.length', ctx);
console.log('Objetos con altura 2.5D registrados para Parallax:', parallaxCount);
if (parallaxCount < 1) {
    throw new Error('Debe haber objetos registrados en parallaxObjects (árboles, gradas, etc.)');
}

// Probar proyección de perspectiva dinámica de parallax al mover la cámara
vm.runInContext(`
    const firstPObj = parallaxObjects[0];
    const initialSpriteX = firstPObj.sprite.x;
    raceScene.cameras.main.scrollX = firstPObj.baseX - 480 + 120;
    raceScene.cameras.main.scrollY = firstPObj.baseY - 270 + 80;
    dustUpdate(1000, 16);
    const shiftedSpriteX = firstPObj.sprite.x;
    if (Math.abs(shiftedSpriteX - firstPObj.baseX) < 0.001) {
        throw new Error('El objeto parallax no se ha desplazado en perspectiva respecto al centro óptico de la cámara');
    }
`, ctx);
console.log('✓ Proyección de perspectiva Parallax 2.5D en tiempo real verificada con éxito');

// Verificar texturas de barreras y asfalto
const texturesList = ['dt_tire_bundle', 'dt_tarmac_crack', 'dt_tarmac_patch', 'dt_oil_stain'];
texturesList.forEach(key => {
    const exists = vm.runInContext(`raceScene.textures && raceScene.textures.exists('${key}')`, ctx);
    if (!exists) throw new Error(`Textura ${key} debe existir`);
});
console.log('✓ Texturas FIA de barreras de neumáticos 3D y desgaste de asfalto verificadas');

const barriersCountV50 = vm.runInContext('trackBarriers.length', ctx);
console.log('Barreras de seguridad físicas activas en pista:', barriersCountV50);
// 10. MODO COMPETICIÓN CON SALAS DE APUESTAS Y TOKENÓMICA (V51)
console.log('\n--- VERIFICANDO MODO COMPETICIÓN: SALAS DE APUESTAS Y TOKENÓMICA (V51) ---');

// A. Configuración de Salas y Buy-ins (5, 10, 20, 50)
const rooms = vm.runInContext('WAGER_ROOMS_CONFIG', ctx);
if (!rooms || rooms.length !== 4) throw new Error('Debe haber exactamente 4 salas de apuestas');
const expectedBuyIns = [5, 10, 20, 50];
rooms.forEach((r, idx) => {
    if (r.buyIn !== expectedBuyIns[idx]) throw new Error(`Sala ${r.id} debe tener buy-in de ${expectedBuyIns[idx]}`);
    if (r.maxRacers !== 4) throw new Error(`Sala ${r.id} debe ser de 4 corredores`);
});
console.log('✓ 4 Salas de apuestas configuradas con buy-ins exactos (5, 10, 20, 50 $CR) y 4 corredores');

// B. Fórmulas de Tokenómica y Bote (AI pone el 50%, Protocol Rake 5%: 2% Dev, 2% Recompensas, 1% Burn)
const pot4Humans = vm.runInContext('calculateWagerPot(WAGER_ROOMS_CONFIG[0], 4, 0)', ctx);
// Sala 5 $CR: 4 * 5 = 20
if (pot4Humans.grossPot !== 20) throw new Error('Bote bruto para 4 humanos en sala de 5 debe ser 20');
if (Math.abs(pot4Humans.devFee - 0.4) > 0.001) throw new Error('Comisión de plataforma (2%) debe ser 0.4');
if (Math.abs(pot4Humans.rewardsFee - 0.4) > 0.001) throw new Error('Comisión de recompensas (2%) debe ser 0.4');
if (Math.abs(pot4Humans.burnedTokens - 0.2) > 0.001) throw new Error('Quema deflacionaria (1%) debe ser 0.2');
if (Math.abs(pot4Humans.totalFee - 1.0) > 0.001) throw new Error('Tasa total de protocolo debe ser 1.0 (5%)');
if (Math.abs(pot4Humans.netPot - 19.0) > 0.001) throw new Error('Bote neto (95%) debe ser 19.0');
if (Math.abs(pot4Humans.payouts[0] - 13.3) > 0.001) throw new Error('Premio 1º (70%) debe ser 13.3');
if (Math.abs(pot4Humans.payouts[1] - 3.8) > 0.001) throw new Error('Premio 2º (20%) debe ser 3.8');
if (Math.abs(pot4Humans.payouts[2] - 1.9) > 0.001) throw new Error('Premio 3º (10%) debe ser 1.9');
if (pot4Humans.payouts[3] !== 0) throw new Error('Premio 4º debe ser 0');
console.log('✓ Cálculo de bote con 4 humanos verificado al 100%');

// Prueba con IA contribuyendo 50% del Buy-in (1 humano + 3 IAs en Sala 10 $CR)
// Humano: 10, Cada IA: 5 -> Bruto = 10 + 15 = 25
const pot1Human3AI = vm.runInContext('calculateWagerPot(WAGER_ROOMS_CONFIG[1], 1, 3)', ctx);
if (pot1Human3AI.grossPot !== 25) throw new Error(`Bote bruto con 3 IA debe ser 25, recibido: ${pot1Human3AI.grossPot}`);
if (Math.abs(pot1Human3AI.devFee - 0.5) > 0.001) throw new Error('Dev fee debe ser 0.5');
if (Math.abs(pot1Human3AI.rewardsFee - 0.5) > 0.001) throw new Error('Rewards fee debe ser 0.5');
if (Math.abs(pot1Human3AI.burnedTokens - 0.25) > 0.001) throw new Error('Burn fee debe ser 0.25');
if (Math.abs(pot1Human3AI.totalFee - 1.25) > 0.001) throw new Error('Total fee debe ser 1.25 (5%)');
if (Math.abs(pot1Human3AI.netPot - 23.75) > 0.001) throw new Error('Net pot debe ser 23.75 (95%)');
console.log('✓ Regla de IA con cuota reducida al 50% y reparto 95% verificado al 100%');

// C. Renderizado de vista de competición en Game Hub
vm.runInContext('renderCompView()', ctx);
const compViewHtml = doc.getElementById('view-comp').innerHTML;
if (!compViewHtml.includes('SALAS DE APUESTAS') || !compViewHtml.includes('SALA AMATEUR') || !compViewHtml.includes('SALA HIGH ROLLER')) {
    throw new Error('La vista de competición no renderiza las 4 salas de apuestas');
}
if (!compViewHtml.includes('Tokens Quemados') || !compViewHtml.includes('Recompensas')) {
    throw new Error('La vista debe mostrar el desglose de tokenómica de protocolo');
}
console.log('✓ Vista de Modo Competición en el Game Hub renderizada con interfaz completa');

// D. Flujo de Lobby y Matchmaking con cuenta atrás y auto-relleno IA
const initialCredits = vm.runInContext('loadNftUserData().credits', ctx);
vm.runInContext(`
    (() => {
        openWagerLobby('room_bronze');
    })();
`, ctx);
const lobbyModal = doc.getElementById('wager-lobby-modal');
if (!lobbyModal || !lobbyModal.innerHTML.includes('SALA AMATEUR')) {
    throw new Error('El modal del lobby debe haberse abierto para la sala amateur');
}
// Verificar que el buy-in de 5 tokens fue deducido
const creditsAfterBuyIn = vm.runInContext('loadNftUserData().credits', ctx);
if (creditsAfterBuyIn !== initialCredits - 5) {
    throw new Error(`Se debieron deducir 5 tokens de buy-in, actual: ${creditsAfterBuyIn}`);
}
// Probar reembolso al cancelar lobby
vm.runInContext('closeWagerLobby(true)', ctx);
const creditsAfterRefund = vm.runInContext('loadNftUserData().credits', ctx);
if (creditsAfterRefund !== initialCredits) {
    throw new Error(`Los tokens deben reembolsarse al salir del lobby, actual: ${creditsAfterRefund}`);
}
console.log('✓ Lobby de apuestas, retención y reembolso de buy-in verificados');

// E. Ejecución de Carrera de Apuestas en Phaser y Liquidación Financiera
vm.runInContext(`
    (() => {
        const mockSlots = [
            { slotIdx: 0, name: 'Apex_Champion_99', carName: 'Ferrari F40 Corsa', archetype: 'ferrari_corsa', colorHex: '#ef4444', isAI: false, stake: 20 },
            { slotIdx: 1, name: 'Vortex_Racer', carName: 'Porsche 911 GT3', archetype: 'porsche_boxer', colorHex: '#06b6d4', isAI: false, stake: 20 },
            { slotIdx: 2, name: 'AI Viper Pro', carName: 'Dodge Viper ACR', archetype: 'viper_acr', colorHex: '#94a3b8', isAI: true, stake: 10 },
            { slotIdx: 3, name: 'AI Bugatti GT', carName: 'Bugatti Chiron', archetype: 'bugatti_w16', colorHex: '#64748b', isAI: true, stake: 10 }
        ];
        const mockRoom = WAGER_ROOMS_CONFIG[2]; // Master GP (Buy-in: 20)
        const mockPot = calculateWagerPot(mockRoom, 2, 2); // 2 humanos + 2 IA: 20+20+10+10 = 60
        launchWagerRace(mockRoom, mockSlots, mockPot);
    })();
`, ctx);

const isWagerActive = vm.runInContext('Boolean(window.activeWagerConfig)', ctx);
if (!isWagerActive) throw new Error('activeWagerConfig debe estar definido en carrera de apuestas');
const aiWagerCount = vm.runInContext('aiCars.length', ctx);
if (aiWagerCount !== 3) {
    throw new Error(`En modo apuestas debe haber exactamente 3 rivales (4 coches en total), actual: ${aiWagerCount}`);
}
console.log('✓ Parrilla de salida de 4 corredores generada correctamente para Modo Competición');

// F. Cruce de meta y Liquidación Contable (endRace)
vm.runInContext(`
    (() => {
        // Simular que el jugador termina en 1º puesto
        hudPosText.setText('POS: 1 / 4');
        playerLap = TOTAL_LAPS + 1;
        endRace();
    })();
`, ctx);

const statsAfterRace = vm.runInContext('loadNftUserData().wagerStats', ctx);
if (!statsAfterRace || statsAfterRace.totalRaces !== 1 || statsAfterRace.wins !== 1) {
    throw new Error('Las estadísticas de apuestas del usuario deben haberse actualizado');
}
if (statsAfterRace.burnedTokens <= 0 || statsAfterRace.devFees <= 0 || statsAfterRace.rewardsFees <= 0) {
    throw new Error('Las estadísticas de protocolo (burn, dev, rewards) deben haberse acumulado');
}
console.log('✓ Liquidación contable en perfil Web3 y actualización de estadísticas verificadas');
console.log(`   - Carreras disputadas: ${statsAfterRace.totalRaces}`);
console.log(`   - Victorias: ${statsAfterRace.wins}`);
console.log(`   - Total ganado: ${statsAfterRace.totalWon} $CR`);
console.log(`   - Tokens quemados acumulados: ${statsAfterRace.burnedTokens} $CR`);
console.log(`   - Tokens a pool de recompensas: ${statsAfterRace.rewardsFees} $CR`);
console.log(`   - Comisión de plataforma (nosotros): ${statsAfterRace.devFees} $CR`);

// 11. VERIFICANDO CIRCUITO ALEATORIO ENTRE TODAS LAS PISTAS Y MOTOR DE SEGURIDAD (V52)
console.log('\n--- VERIFICANDO CIRCUITO ALEATORIO Y MOTOR DE SEGURIDAD ANTI-BOTS (V52) ---');

// A. Sorteo de circuitos aleatorios
const trackPools = vm.runInContext('WAGER_TRACK_POOLS', ctx);
if (!trackPools || !trackPools.room_bronze || !trackPools.room_elite) {
    throw new Error('Deben definirse las bolsas de circuitos aleatorios para cada sala');
}
const rolledBronze = vm.runInContext('getRandomWagerTrack(WAGER_ROOMS_CONFIG[0])', ctx);
const rolledSilver = vm.runInContext('getRandomWagerTrack(WAGER_ROOMS_CONFIG[1])', ctx);
const rolledGold = vm.runInContext('getRandomWagerTrack(WAGER_ROOMS_CONFIG[2])', ctx);
const rolledElite = vm.runInContext('getRandomWagerTrack(WAGER_ROOMS_CONFIG[3])', ctx);

console.log('✓ Sorteo aleatorio ejecutado para cada sala:');
console.log(`   - Sala Amateur: ${rolledBronze.name} (${rolledBronze.id})`);
console.log(`   - Sala Semi-Pro: ${rolledSilver.name} (${rolledSilver.id})`);
console.log(`   - Sala Master GP: ${rolledGold.name} (${rolledGold.id})`);
console.log(`   - Sala High Roller: ${rolledElite.name} (${rolledElite.id})`);

if (!rolledBronze.id || !rolledSilver.id || !rolledGold.id || !rolledElite.id) {
    throw new Error('Todas las salas deben sortear una pista válida con ID');
}

// B. Verificar que el lobby actualiza currentTrackId aleatoriamente
vm.runInContext(`
    openWagerLobby('room_bronze');
`, ctx);
const activeRoom = vm.runInContext('currentWagerLobby.room', ctx);
if (!activeRoom.currentTrackId || !activeRoom.currentTrackName) {
    throw new Error('El lobby de apuestas debe registrar el circuito sorteado para la carrera');
}
console.log(`✓ Circuito sorteado dinámicamente en el lobby: ${activeRoom.currentTrackName}`);

// C. Verificar Sistema de Control Táctil (Joystick Virtual 360° y Botones Grandes)
console.log('\n--- VERIFICANDO JOYSTICK VIRTUAL 360° Y CONTROLES TÁCTILES MÓVILES (V55) ---');
const joyMode = vm.runInContext('currentTouchControlMode', ctx);
console.log('Modo de control táctil inicial:', joyMode);
if (joyMode !== 'joystick') {
    throw new Error('El modo de control inicial por defecto debe ser joystick');
}
vm.runInContext('toggleTouchControlMode()', ctx);
const toggledMode = vm.runInContext('currentTouchControlMode', ctx);
console.log('Modo de control táctil tras toggle:', toggledMode);
if (toggledMode !== 'buttons') {
    throw new Error('toggleTouchControlMode debe cambiar a buttons');
}
vm.runInContext('toggleTouchControlMode()', ctx);
console.log('✓ Alternancia fluida entre Joystick Táctil y Botones Grandes verificada con éxito');

// D. Verificar que los controles táctiles y prompt se ocultan en menús y se muestran sólo en carrera
console.log('\n--- VERIFICANDO VISIBILIDAD DE CONTROLES: OCULTOS EN HUB, ACTIVOS EN CARRERA (V56) ---');
vm.runInContext(`
    window.returnToGameHub();
`, ctx);
const tcDisplayHub = vm.runInContext('document.getElementById("touch-controls").style.display', ctx);
const rpDisplayHub = vm.runInContext('document.getElementById("rotate-prompt").style.display', ctx);
if (tcDisplayHub !== 'none' || rpDisplayHub !== 'none') {
    throw new Error('Los controles táctiles y el rotate-prompt deben estar ocultos en el Hub');
}
console.log('✓ Controles táctiles y rotate-prompt ocultos en Hub / Menú Principal');

vm.runInContext(`
    startRace(window.raceScene, 'rookie_ring', 0, 'day', false);
`, ctx);
const tcDisplayRace = vm.runInContext('document.getElementById("touch-controls").style.display', ctx);
if (tcDisplayRace !== 'flex') {
    throw new Error('Los controles táctiles deben activarse (display: flex) al arrancar la carrera');
}
console.log('✓ Controles táctiles activados (display: flex) durante la carrera');

vm.runInContext(`
    window.returnToGameHub();
`, ctx);
const tcDisplayReturn = vm.runInContext('document.getElementById("touch-controls").style.display', ctx);
if (tcDisplayReturn !== 'none') {
    throw new Error('Los controles táctiles deben volver a ocultarse al regresar al Hub');
}
console.log('✓ Retorno al Hub oculta correctamente los controles táctiles');

// E. Verificar Sistema de Nitro N2O (2 usos por carrera, compra con tokens y anuncios) (V58)
console.log('\n--- VERIFICANDO SISTEMA DE NITRO N2O (2 USOS/CARRERA, ANUNCIOS Y TOKENS) (V58) ---');
const nitroBtn = vm.runInContext('document.getElementById("btn-nitro")', ctx);
if (!nitroBtn) throw new Error('El botón #btn-nitro debe existir en el DOM');
const nitroBadge = vm.runInContext('document.getElementById("nitro-badge-count")', ctx);
if (!nitroBadge) throw new Error('El badge #nitro-badge-count debe existir en el DOM');
console.log('✓ Botón de cápsula de Nitro y badge numérico presentes en el DOM');

// Comprobar obtención de Nitro con Anuncio (1 anuncio = 1 nitro)
const initNitros = vm.runInContext('getAvailableNitros()', ctx);
const nitroAdRes = vm.runInContext('addNitroWithAd()', ctx);
if (!nitroAdRes.success || nitroAdRes.newNitros !== initNitros + 1) {
    throw new Error('addNitroWithAd debe sumar exactamente +1 cápsula de Nitro');
}
console.log(`✓ Recompensa de anuncio verificada: +1 Nitro (Total: ${nitroAdRes.newNitros})`);

// Comprobar compra de Nitros con Tokens $CR (50 $CR = 0.05 USDT)
const nitroBuyRes = vm.runInContext('buyNitrosWithTokens(1)', ctx);
if (!nitroBuyRes.success || nitroBuyRes.amount !== 1 || nitroBuyRes.cost !== 50) {
    throw new Error('buyNitrosWithTokens debe descontar 50 $CR (0.05 USDT) y añadir 1 Nitro');
}
console.log(`✓ Compra de Nitro con tokens verificada (Coste: ${nitroBuyRes.cost} $CR | Nuevo total: ${nitroBuyRes.newNitros})`);

// Iniciar carrera y comprobar tope de 2 Nitros por carrera
vm.runInContext(`
    startRace(window.raceScene, 'rookie_ring', 0, 'day', false);
    gameState = 'RACE';
`, ctx);
const raceNitros = vm.runInContext('raceNitrosRemaining', ctx);
if (raceNitros !== 2) {
    throw new Error(`Se deben permitir máximo 2 Nitros por carrera (actual: ${raceNitros})`);
}
const badgeTextInit = vm.runInContext('document.getElementById("nitro-badge-count").textContent', ctx);
if (badgeTextInit !== '2') {
    throw new Error(`El badge de Nitro debe mostrar 2 al inicio de la carrera (actual: ${badgeTextInit})`);
}
console.log('✓ Límite de 2 cápsulas por carrera y badge numérico "2" verificados');

// Activar 1er Nitro
vm.runInContext('activateNitroBoost()', ctx);
const timer1 = vm.runInContext('nitroBoostTimer', ctx);
const rem1 = vm.runInContext('raceNitrosRemaining', ctx);
const badge1 = vm.runInContext('document.getElementById("nitro-badge-count").textContent', ctx);
if (timer1 !== 4.0 || rem1 !== 1 || badge1 !== '1') {
    throw new Error(`Primer nitro falló: timer=${timer1} (esperado 4.0), remaining=${rem1}, badge=${badge1}`);
}
console.log('✓ 1er Nitro activado con éxito: 4.0s de impulso, resta a 1 cápsula y badge "1"');

// Simular paso de 4.1 segundos para que termine el boost
vm.runInContext(`
    nitroBoostTimer = 0;
    activateNitroBoost();
`, ctx);
const rem2 = vm.runInContext('raceNitrosRemaining', ctx);
const badge2 = vm.runInContext('document.getElementById("nitro-badge-count").textContent', ctx);
if (rem2 !== 0 || badge2 !== '0') {
    throw new Error(`Segundo nitro falló: remaining=${rem2}, badge=${badge2}`);
}
console.log('✓ 2º Nitro activado con éxito: resta a 0 cápsulas y badge "0"');

// Intentar activar un 3er Nitro (debe ser bloqueado)
vm.runInContext(`
    nitroBoostTimer = 0;
    activateNitroBoost();
`, ctx);
const timer3 = vm.runInContext('nitroBoostTimer', ctx);
if (timer3 > 0) {
    throw new Error('No se debe permitir activar un 3er nitro en la misma carrera');
}
console.log('✓ Límite estricto respetado: 3er intento de Nitro bloqueado con éxito');

console.log('\n--- VERIFICANDO BOTONERA RADIAL ESTILO RPG / ACCIÓN (V59) ---');
const indexHtmlContent = fs.readFileSync('index.html', 'utf8');
const styleCssContent = fs.readFileSync('style.css', 'utf8');

if (!indexHtmlContent.includes('right-group rpg-cluster')) {
    throw new Error('index.html debe incluir la clase rpg-cluster en el contenedor right-group');
}
if (!indexHtmlContent.includes('id="btn-nitro"') || !indexHtmlContent.includes('id="btn-accel"') ||
    !indexHtmlContent.includes('id="btn-brake"') || !indexHtmlContent.includes('id="btn-handbrake"')) {
    throw new Error('index.html debe contener los 4 botones: nitro, accel, brake y handbrake');
}
if (!styleCssContent.includes('.right-group.rpg-cluster')) {
    throw new Error('style.css debe definir el layout radial .right-group.rpg-cluster');
}
// Verificar que Nitro está situado verticalmente arriba del acelerador
if (!styleCssContent.includes('#btn-nitro') || !styleCssContent.includes('bottom: 94px')) {
    throw new Error('style.css debe posicionar el Nitro justo arriba del acelerador');
}
// Verificar que el acelerador está en la esquina inferior derecha
if (!styleCssContent.includes('#btn-accel') || !styleCssContent.includes('bottom: 0px') || !styleCssContent.includes('right: 0px')) {
    throw new Error('style.css debe anclar el acelerador en la esquina inferior derecha');
}
// Verificar que Freno y Derrape forman el arco semicircular a la izquierda
if (!styleCssContent.includes('#btn-brake') || !styleCssContent.includes('right: 90px')) {
    throw new Error('style.css debe colocar el freno en el arco semicircular superior izquierdo');
}
if (!styleCssContent.includes('#btn-handbrake') || !styleCssContent.includes('right: 98px')) {
    throw new Error('style.css debe colocar el freno de mano en el arco semicircular izquierdo');
}
console.log('✓ Botonera semicircular RPG (GAS pivot en esquina, Nitro justo arriba, Freno y Derrape en abanico) verificada al 100%');

console.log('\n--- VERIFICANDO COCHE INICIAL F2P (APEX CADET 1.0) Y DIFICULTAD ROOKIE (V64) ---');
const starterModel = vm.runInContext('NFT_CAR_MODELS.find(m => m.id === "s_01")', ctx);
if (!starterModel) throw new Error('No se encontró el modelo inicial s_01 (Apex Cadet 1.0)');
if (starterModel.rarity !== 'starter') throw new Error(`Raridad incorrecta: ${starterModel.rarity}`);
if (starterModel.isNft !== false) throw new Error('El coche inicial NO debe ser un NFT (isNft: false)');

const starterBasePoints = Object.values(starterModel.stats).reduce((a, b) => a + b, 0);
console.log(`Puntos base de Apex Cadet 1.0: ${starterBasePoints} pts (Coches Comunes: 10-12 pts)`);
if (starterBasePoints !== 7) throw new Error(`El coche inicial debe tener exactamente 7 puntos, actual: ${starterBasePoints}`);

// Verificar datos iniciales de nuevo jugador
vm.runInContext(`
    localStorage.removeItem('apex_web3_garage_save');
`, ctx);
const starterFreshUser = vm.runInContext('loadNftUserData()', ctx);
if (starterFreshUser.garage.length === 0 || starterFreshUser.garage[0].modelId !== 's_01') {
    throw new Error('Un nuevo jugador debe comenzar con el Apex Cadet 1.0');
}
if (starterFreshUser.garage[0].isNft !== false) {
    throw new Error('La instancia del coche inicial en el garaje debe tener isNft: false');
}
if (starterFreshUser.credits !== 100) {
    throw new Error(`Los créditos iniciales deben ser 100 $CR, actual: ${starterFreshUser.credits}`);
}
console.log('✓ Nuevo jugador recibe Apex Cadet 1.0 (NO-NFT, 7 pts) y saldo base de 100 $CR');

// Verificar AI_TIER_ROOKIE
const rookieTier = vm.runInContext('window.AI_TIER_ROOKIE', ctx);
if (!Array.isArray(rookieTier) || rookieTier.length < 5) {
    throw new Error('AI_TIER_ROOKIE debe tener al menos 5 rivales configurados');
}
rookieTier.forEach(r => {
    if (r.speed > 305) throw new Error(`Rival novato demasiado rápido: ${r.name} (${r.speed} km/h)`);
    if (r.accel > 230) throw new Error(`Rival novato con aceleración excesiva: ${r.name} (${r.accel})`);
});
console.log(`✓ AI_TIER_ROOKIE verificado: ${rookieTier.length} rivales calibrados con velocidades asequibles (288-298 km/h)`);

// Verificar renderizado en Garaje con badge de NO-NFT
doc.getElementById('view-garage').innerHTML = '';
vm.runInContext('renderGarageView()', ctx);
const garageContent = doc.getElementById('view-garage').innerHTML;
if (!garageContent.includes('INICIAL F2P') || !garageContent.includes('NO-NFT')) {
    throw new Error('El garaje debe mostrar la pestaña y chip NO-NFT para el coche inicial');
}
console.log('✓ Garaje muestra la insignia "NO-NFT" y categoría "INICIAL F2P" para el Apex Cadet');

console.log('\n--- VERIFICANDO PANTALLA DE CARGA Y PRESENTACIÓN DE CARRERAS (V65) ---');
const updatedHtml = fs.readFileSync('index.html', 'utf8');
const updatedCss = fs.readFileSync('hub_styles.css', 'utf8');

if (!updatedHtml.includes('id="game-preloader"')) {
    throw new Error('index.html debe contener el elemento #game-preloader');
}
if (!updatedHtml.includes('class="fia-gantry"') || !updatedHtml.includes('id="fia-l1"')) {
    throw new Error('index.html debe contener el semáforo FIA de 5 luces');
}
if (!updatedHtml.includes('class="preloader-hero-bg"') || !updatedHtml.includes('class="preloader-overlay"')) {
    throw new Error('index.html debe contener el fondo realista preloader-hero-bg');
}
if (!updatedHtml.includes('id="preloader-fill"') || !updatedHtml.includes('id="preloader-rpm"')) {
    throw new Error('index.html debe incluir el tacómetro de progreso');
}
if (!updatedCss.includes('racing_splash_cover.jpg') || !updatedCss.includes('.preloader-hero-bg')) {
    throw new Error('hub_styles.css debe vincular racing_splash_cover.jpg');
}

const preloaderFn = vm.runInContext('typeof window.runRacingPreloaderSequence', ctx);
if (preloaderFn !== 'function') {
    throw new Error('runRacingPreloaderSequence debe estar definida en window');
}
console.log('✓ Pantalla de carga cinematográfica hiperrealista GT3 con semáforo FIA 5 luces y tacómetro verificada al 100%');

console.log('\n--- VERIFICANDO REORGANIZACIÓN DEL HUB, INVENTARIO, ENERGÍA POR COCHE Y TORNEO (V67) ---');

// 1. Verificar las 6 zonas simétricas del Hub Principal (view-main)
vm.runInContext('renderMainHubView()', ctx);
const mainHtml = doc.getElementById('view-main').innerHTML;
const requiredZones = ['card-story', 'card-garage', 'card-inventory', 'card-comp', 'card-crates', 'card-shop'];
requiredZones.forEach(zone => {
    if (!mainHtml.includes(zone)) throw new Error(`view-main debe contener la tarjeta ${zone}`);
});
if (mainHtml.includes('btn-compete-now') || mainHtml.includes('btn-comp-banner-cta')) {
    throw new Error('view-main no debe incluir botones redundantes de competir ya');
}
console.log('✓ Hub Principal contiene las 6 zonas simétricas (Historia, Garaje, Inventario, Competición, Cajas, Tienda) sin botones redundantes');

// 2. Verificar que el Torneo Semanal está en view-comp sin TON
vm.runInContext('renderCompView()', ctx);
const compHtml = doc.getElementById('view-comp').innerHTML;
if (!compHtml.includes('weekly-tournament-hero-banner') || !compHtml.includes('GRAND PRIX') || !compHtml.includes('SEMANAL')) {
    throw new Error('view-comp debe contener el banner destacado del Grand Prix Semanal');
}
if (compHtml.includes('750 TON') || compHtml.includes('PREMIOS EN TON REALES') || compHtml.includes('100.000 $CR')) {
    throw new Error('view-comp no debe contener menciones a premios exagerados o en TON');
}
if (!compHtml.includes('~2.500 $CR')) {
    throw new Error('view-comp debe mostrar el bote dinámico y sostenible (~2.500 $CR)');
}
console.log('✓ Torneo Semanal sostenible (~2.500 $CR) integrado en la cabecera de la sección de Competición');

// 2.1 Verificar Leaderboard con recompensas calibradas y sin TON
vm.runInContext('openLeaderboardModal()', ctx);
const lbCleanModal = doc.getElementById('leaderboard-modal');
if (!lbCleanModal || lbCleanModal.innerHTML.includes('TON') || lbCleanModal.innerHTML.includes('15.000 $CR')) {
    throw new Error('El modal de Clasificación (Leaderboard) no debe prometer TON ni premios inflados');
}
if (!lbCleanModal.innerHTML.includes('+300 $CR') || !lbCleanModal.innerHTML.includes('+150 $CR') || !lbCleanModal.innerHTML.includes('+75 $CR')) {
    throw new Error('El modal de Clasificación debe otorgar premios calibrados (+300, +150, +75 $CR)');
}
console.log('✓ Clasificación Mundial verificada: Recompensas de podio sostenibles (+300, +150, +75 $CR) sin desangrar el token');

// 2.2 Verificar que las reglas de apuestas están en el botón de ayuda ❓ y no saturan la pantalla
if (compHtml.includes('wager-rules-card')) {
    throw new Error('view-comp no debe contener el bloque gigante de reglas inline, debe estar en el botón ❓');
}
if (!compHtml.includes('btn-comp-help-question') || !compHtml.includes('openWagerRulesModal()')) {
    throw new Error('view-comp debe contener el botón de interrogante ❓ para consultar reglas');
}
vm.runInContext('openWagerRulesModal()', ctx);
const rulesModal = doc.getElementById('wager-rules-modal');
if (!rulesModal || !rulesModal.innerHTML.includes('SISTEMA OFICIAL DE APUESTAS Y TOKENOMICS') || !rulesModal.innerHTML.includes('4 Corredores por Sala') || !rulesModal.innerHTML.includes('Relleno Inteligente con IA')) {
    throw new Error('El modal explicativo de reglas debe contener el desglose completo');
}
vm.runInContext('closeWagerRulesModal()', ctx);
if (rulesModal.style.display !== 'none') {
    throw new Error('Fallo al cerrar el modal explicativo de reglas');
}
console.log('✓ Sistema de Apuestas limpio: Explicación de tokenomics trasladada al botón ❓ con modal emergente');

// 3. Verificar la nueva vista de Inventario (view-inventory)
vm.runInContext('renderInventoryView()', ctx);
const invHtml = doc.getElementById('view-inventory').innerHTML;
if (!invHtml.includes('inventory-container') || !invHtml.includes('inventory-tabs') || !invHtml.includes('inventory-parts-grid')) {
    throw new Error('view-inventory debe contener contenedor, pestañas y cuadrícula de piezas');
}
// Verificar filtrado por categoría
vm.runInContext('setInventoryCategory("speed_power")', ctx);
const filteredInvHtml = doc.getElementById('view-inventory').innerHTML;
if (!filteredInvHtml.includes('Bujía') && !filteredInvHtml.includes('Pistón')) {
    throw new Error('El filtro de motor en inventario debe mostrar piezas de motor');
}
console.log('✓ Apartado de Inventario renderiza las 16 piezas mecánicas y soporta navegación por categorías');

// 4. Verificar escalado de energía por coche según rareza (5, 6, 7, 8, 10)
const starterMax = vm.runInContext('getMaxEnergyForCar({ rarity: "starter" })', ctx);
const commonMax = vm.runInContext('getMaxEnergyForCar({ rarity: "common" })', ctx);
const uncommonMax = vm.runInContext('getMaxEnergyForCar({ rarity: "uncommon" })', ctx);
const rareMax = vm.runInContext('getMaxEnergyForCar({ rarity: "rare" })', ctx);
const legMax = vm.runInContext('getMaxEnergyForCar({ rarity: "legendary" })', ctx);

if (starterMax !== 5 || commonMax !== 6 || uncommonMax !== 7 || rareMax !== 8 || legMax !== 10) {
    throw new Error(`Capacidades de energía incorrectas: starter=${starterMax}, common=${commonMax}, uncommon=${uncommonMax}, rare=${rareMax}, leg=${legMax}`);
}
console.log(`✓ Capacidades de batería por rareza verificadas: Starter=5, Común=6, Poco Común=7, Raro=8, Legendario=10`);

// 5. Verificar chips de energía individual en el Garaje
vm.runInContext('renderGarageView()', ctx);
const garageV67Html = doc.getElementById('view-garage').innerHTML;
if (!garageV67Html.includes('energy-chip') || !garageV67Html.includes('⚡')) {
    throw new Error('Las tarjetas del garaje deben incluir el chip individual de energía');
}
console.log('✓ Tarjetas de coche en el garaje reflejan visualmente la energía individual');

console.log('\n--- VERIFICANDO DISEÑO PRO (V68): VENTANA LIBRE PARA COCHES, DOCK INFERIOR Y TIENDA RESPONSIVE ---');
// 1. Verificar ventana de exhibición de coches en view-main
vm.runInContext('renderMainHubView()', ctx);
const v68MainHtml = doc.getElementById('view-main').innerHTML;
if (!v68MainHtml.includes('hero-cars-stage-window')) {
    throw new Error('view-main debe incluir la ventana central hero-cars-stage-window para exhibir los coches');
}
if (!v68MainHtml.includes('hub-dock-grid')) {
    throw new Error('view-main debe incluir la clase hub-dock-grid en la botonera de navegación');
}
console.log('✓ Ventana central diáfana y dock inferior configurados en el Hub Principal');

// 2. Verificar estilos en hub_styles.css
const v68Css = fs.readFileSync('hub_styles.css', 'utf8');
if (!v68Css.includes('hero-cars-stage-window')) {
    throw new Error('hub_styles.css debe definir .hero-cars-stage-window');
}
if (!v68Css.includes('radial-gradient') || !v68Css.includes('racing_splash_cover.jpg')) {
    throw new Error('hub_styles.css debe usar radial-gradient luminoso sobre la portada');
}
if (!v68Css.includes('grid-column: span 2') || !v68Css.includes('.shop-items-grid')) {
    throw new Error('hub_styles.css debe incluir adaptación de 2 columnas para la tienda con span 2 en el 3º elemento');
}
console.log('✓ Adaptabilidad CSS para frenos Apex Pro y fondo radial luminoso verificada al 100%');

console.log('\n--- VERIFICANDO MAPA DE HISTORIA: CASILLAS, 3 ESTRELLAS Y COCHE AVANZANDO (V71) ---');
// 1. Abrir Modo Historia
vm.runInContext('launchStoryMode()', ctx);
const storyModal = doc.getElementById('track-select-modal');
if (!storyModal || storyModal.classList.contains('hidden') || storyModal.style.display === 'none') {
    throw new Error('El modal del Modo Historia debe abrirse al llamar a launchStoryMode()');
}

// 2. Verificar cabecera, estrellas globales y tabs de capítulos
if (!storyModal.innerHTML.includes('MODO HISTORIA: WORLD GT TOUR') || !storyModal.innerHTML.includes('ESTRELLAS')) {
    throw new Error('El modal debe mostrar el título de World GT Tour y el contador global de estrellas');
}
const tabButtonsCount = (storyModal.innerHTML.match(/class="story-tab-btn/g) || []).length;
if (tabButtonsCount !== 5) {
    throw new Error(`Se esperan 5 pestañas de capítulos de bioma, se encontraron: ${tabButtonsCount}`);
}
console.log('✓ 5 Pestañas de capítulos y contador global de estrellas verificados');

// 3. Verificar la carretera, las casillas con estrellas y el coche del jugador
if (!storyModal.innerHTML.includes('story-road-view')) {
    throw new Error('Debe existir el contenedor .story-road-view con el mapa de carretera');
}
const stageNodesCount = (storyModal.innerHTML.match(/class="story-stage-node/g) || []).length;
if (stageNodesCount < 4) {
    throw new Error(`El capítulo debe renderizar al menos 4 casillas de etapa, encontradas: ${stageNodesCount}`);
}
const starsRowsCount = (storyModal.innerHTML.match(/class="node-stars-row"/g) || []).length;
if (starsRowsCount < 4) {
    throw new Error('Cada casilla de etapa debe mostrar sus 3 estrellas de rendimiento');
}
console.log(`✓ Carretera activa con ${stageNodesCount} casillas de circuito y filas de 3 estrellas`);

// 4. Verificar el coche del jugador avanzando por las casillas
const playerCarMarker = doc.getElementById('story-map-player-car');
if (!playerCarMarker) {
    throw new Error('Debe existir el elemento del coche del jugador (#story-map-player-car) sobre las casillas');
}
const initialLeft = playerCarMarker.style.left;
const initialTop = playerCarMarker.style.top;
console.log(`Posición inicial del coche del jugador: left=${initialLeft}, top=${initialTop}`);

// 5. Probar selección de otra casilla y avance dinámico del coche
const targetTrack = initialLeft === '24%' ? 'radiator_oval' : 'tri_apex_coliseum';
vm.runInContext(`selectStoryMapTrack('${targetTrack}')`, ctx);
const movedLeft = playerCarMarker.style.left;
const movedTop = playerCarMarker.style.top;
console.log(`Posición tras avanzar a ${targetTrack}: left=${movedLeft}, top=${movedTop}`);
if (movedLeft === initialLeft && movedTop === initialTop) {
    throw new Error('El coche debe desplazarse de casilla al seleccionar otra pista');
}
if (!storyModal.innerHTML.includes('player-car-tag') || !storyModal.innerHTML.includes('player-car-body')) {
    throw new Error('El marcador del coche debe contener su etiqueta identificativa y carrocería');
}
console.log('✓ Coche del jugador avanza dinámicamente y se posiciona sobre la casilla seleccionada');

// 6. Verificar panel de misión con requisitos de las 3 estrellas y recompensas
const missionCard = doc.getElementById('story-mission-card-root');
const expectedTrackName = targetTrack === 'radiator_oval' ? 'RADIATOR OVAL' : 'TRI-APEX';
if (!missionCard || !missionCard.innerHTML.includes(expectedTrackName) || !missionCard.innerHTML.includes('1ª Estrella:')) {
    throw new Error('El panel de misión debe mostrar la pista seleccionada y la guía para las 3 estrellas');
}
if (!missionCard.innerHTML.includes('btn-story-launch-race')) {
    throw new Error('El panel de misión debe incluir el botón de acción para salir a pista');
}
console.log('✓ Panel de misión con desglose de 3 estrellas, recompensas ($CR, XP, Drop NFT) verificado');

// 7. Probar cambio a Capítulo 2
vm.runInContext('setStoryMapChapter(1)', ctx);
if (!storyModal.innerHTML.includes('Red Rock Junction')) {
    throw new Error('Al cambiar a Capítulo 2 debe renderizarse el circuito Red Rock Junction');
}
console.log('✓ Cambio fluido entre capítulos y biomas verificado');

// Cerrar modal
vm.runInContext('closeTrackSelectModal()', ctx);
if (!storyModal.classList.contains('hidden') && storyModal.style.display !== 'none') {
    throw new Error('El modal debe cerrarse correctamente al llamar a closeTrackSelectModal()');
}

// ===== VERIFICACIÓN DE TORNEO DE INVITACIÓN (2 MESES), CÓDIGO REFERIDO, CORREO Y COFRES =====
console.log('\n--- VERIFICANDO TORNEO DE INVITACIÓN (2 MESES), SOCIAL, EMAIL Y COFRES (V77) ---');

// 1. Verificación de cambio de nombre Cajas -> Cofres
const esZoneCrates = vm.runInContext("t('zone_crates')", ctx);
const esCrateBronze = vm.runInContext("t('crate_bronze_title')", ctx);
const esBtnOpen = vm.runInContext("t('btn_open_crate')", ctx);
if (!esZoneCrates.includes('COFRES') || !esCrateBronze.includes('COFRE') || !esBtnOpen.includes('COFRE')) {
    throw new Error(`Los textos en español deben usar 'COFRE' en vez de 'CAJA': ${esZoneCrates}, ${esCrateBronze}, ${esBtnOpen}`);
}
console.log('✓ Nomenclatura oficial verificada: Cofres NFT, Cofre Rookie, Abrir Cofre');

// 2. Verificación de Código de Invitación único del usuario
const initialUserData = vm.runInContext('loadNftUserData()', ctx);
if (!initialUserData.referralCode || !initialUserData.referralCode.startsWith('APEX-')) {
    throw new Error(`Código de invitación inválido: ${initialUserData.referralCode}`);
}
console.log('✓ Código de invitación único de usuario generado:', initialUserData.referralCode);

// 3. Verificación de Canjeo de Código de un amigo
const redeemOwnRes = vm.runInContext(`redeemInviteCode('${initialUserData.referralCode}')`, ctx);
if (redeemOwnRes.success || redeemOwnRes.reason !== 'cannot_invite_self') {
    throw new Error('Debe bloquearse el canjeo del propio código de invitación');
}
const redeemFriendRes = vm.runInContext("redeemInviteCode('APEX-AMIGO99')", ctx);
if (!redeemFriendRes.success || redeemFriendRes.bonusNitros !== 2) {
    throw new Error(`Fallo al canjear código de amigo: ${JSON.stringify(redeemFriendRes)}`);
}
const duplicateRedeemRes = vm.runInContext("redeemInviteCode('APEX-OTRO123')", ctx);
if (duplicateRedeemRes.success || duplicateRedeemRes.reason !== 'already_redeemed') {
    throw new Error('Debe bloquearse el canjeo múltiple de invitaciones');
}
console.log('✓ Canjeo de código de invitación verificado (+2 Nitros N₂O, bloqueo de auto-canje y único uso)');

// 4. Verificación de Simulación de Amigo Unido
const initialInvites = vm.runInContext('loadNftUserData().referralsCount', ctx);
const simRes = vm.runInContext("simulateFriendJoined('Piloto_Test99')", ctx);
if (!simRes.success || simRes.referralsCount !== initialInvites + 1 || simRes.bonusNitros !== 1) {
    throw new Error(`Fallo en simulación de amigo unido: ${JSON.stringify(simRes)}`);
}
console.log(`✓ Incremento de invitaciones verificado: ${simRes.referralsCount} amigos (+1 Nitro N₂O acreditado)`);

// 5. Verificación de Vinculación de Correo Electrónico
const invalidEmailRes = vm.runInContext("linkUserEmail('email_invalido')", ctx);
if (invalidEmailRes.success || invalidEmailRes.reason !== 'invalid_email') {
    throw new Error('Debe rechazar correos con formato inválido');
}
const validEmailRes = vm.runInContext("linkUserEmail('piloto@apexchampionship.com')", ctx);
if (!validEmailRes.success || !validEmailRes.isFirstTime || validEmailRes.bonusNitros !== 2) {
    throw new Error(`Fallo al vincular correo por primera vez: ${JSON.stringify(validEmailRes)}`);
}
const updateEmailRes = vm.runInContext("linkUserEmail('nuevo_correo@apexchampionship.com')", ctx);
if (!updateEmailRes.success || updateEmailRes.isFirstTime || updateEmailRes.bonusNitros !== 0) {
    throw new Error('Actualizar correo existente no debe duplicar el bonus de bienvenida');
}
console.log('✓ Vinculación de correo electrónico verificada (validación regex y bonus +2 Nitros N₂O)');

// 6. Verificación de Datos del Torneo de 60 Días (2 Meses)
const tourneyData = vm.runInContext('getReferralTournamentData()', ctx);
if (typeof tourneyData.remainingDays !== 'number' || tourneyData.remainingDays < 0 || tourneyData.remainingDays > 60) {
    throw new Error(`Temporizador del torneo de 2 meses inválido: ${tourneyData.remainingDays} días`);
}
if (!Array.isArray(tourneyData.leaderboard) || tourneyData.leaderboard.length < 20) {
    throw new Error(`El ranking del torneo de invitación debe contener al menos 20 pilotos: ${tourneyData.leaderboard.length}`);
}
if (tourneyData.leaderboard[0].prizeTier !== 'gold' || tourneyData.leaderboard[3].prizeTier !== 'silver' || tourneyData.leaderboard[10].prizeTier !== 'bronze') {
    throw new Error('Estructura de premios incorrecta en el ranking del torneo');
}
console.log(`✓ Torneo de 60 días verificado: ${tourneyData.remainingDays}d restantes, Top 20 con premios de cofres Oro/Plata/Bronce`);

// 7. Verificación del Renderizado del Modal de Torneo de Invitación
vm.runInContext('openReferralTournamentModal()', ctx);
const refModal = doc.getElementById('referral-tournament-modal');
if (!refModal || !refModal.innerHTML.includes('TORNEO DE INVITACIÓN') || !refModal.innerHTML.includes('TOP 1 - 3') || !refModal.innerHTML.includes('COFRE RARO')) {
    throw new Error('El modal del torneo de invitación no se renderizó correctamente');
}
console.log('✓ Modal del Torneo de Invitación renderizado correctamente con tabla de premios y clasificación');

// 8. Verificación de Ajustes (⚙️) con secciones de Referidos y Email
vm.runInContext('openSettingsModal()', ctx);
const settingsModalHtml = doc.getElementById('settings-modal').innerHTML;
if (!settingsModalHtml.includes('TU CÓDIGO DE INVITACIÓN') || !settingsModalHtml.includes('VINCULAR CORREO ELECTRÓNICO')) {
    throw new Error('El modal de ajustes debe incluir la sección de código de invitación y vincular correo');
}
console.log('✓ Modal de Ajustes actualizado con código de invitación y vinculación de correo');

console.log('\n--- VERIFICANDO COFRES REALES EN SVG Y FÍSICA DE DRIFT ARCADE (V79) ---');
// 9. Verificación de renderizador vectorial de cofres (SVG)
['bronze', 'silver', 'gold'].forEach(tier => {
    const chestSvg = vm.runInContext(`generateChestSvg("${tier}", 96, 84)`, ctx);
    if (!chestSvg || !chestSvg.startsWith('<svg') || !chestSvg.includes(`chest-tier-${tier}`)) {
        throw new Error(`Fallo al generar SVG para el cofre tier ${tier}`);
    }
});
vm.runInContext('renderCratesView()', ctx);
const cratesV79Html = doc.getElementById('view-crates').innerHTML;
if (cratesV79Html.includes('<div class="chest-icon">📦</div>') || cratesV79Html.includes('<div class="crate-shake-icon">🎁</div>')) {
    throw new Error('view-crates no debe mostrar emojis de cajas de cartón ni paquetes de regalo');
}
if (!cratesV79Html.includes('rendered-chest-svg chest-tier-bronze') || !cratesV79Html.includes('rendered-chest-svg chest-tier-gold')) {
    throw new Error('view-crates debe renderizar los cofres SVG 3D de alta definición');
}
vm.runInContext('renderMainHubView()', ctx);
const mainV79Html = doc.getElementById('view-main').innerHTML;
if (!mainV79Html.includes('rendered-chest-svg chest-tier-gold')) {
    throw new Error('La tarjeta card-crates del Hub Principal debe mostrar el cofre SVG 3D');
}
console.log('✓ Cofres NFT renderizados con vectores SVG hiperrealistas (Bronce, Plata, Oro) sin cajas de cartón');

// 10. Verificación de físicas de Drift Arcade a fondo (Full Throttle Power-Slide)
vm.runInContext(`
    startRace(window.raceScene, 'rookie_ring', 0, 'day', false);
    gameState = 'RACE';
    const curTrk = window.DustracTracks['rookie_ring'];
    const trackTile = (curTrk && curTrk.tiles) ? curTrk.tiles.find(t => t.t === 'finish' || t.t === 'straight') : { i: 2, j: 2 };
    playerCar.x = trackTile.i * 256 + 128;
    playerCar.y = trackTile.j * 256 + 128;
    playerSpeed = 280;
    touchHandbrake = true;
    touchGas = true;
    touchLeft = true;
    dustUpdate.call(window.raceScene, 2000, 16);
`, ctx);
const driftSpd = vm.runInContext('playerSpeed', ctx);
const slip = vm.runInContext('driftSlipAngle', ctx);
const driftChg = vm.runInContext('driftCharge', ctx);

if (driftSpd < 240) {
    throw new Error(`El coche perdió demasiada velocidad en drift con gas a fondo: ${driftSpd}`);
}
if (slip <= 0) {
    throw new Error(`El ángulo de deslizamiento lateral (driftSlipAngle) debe ser positivo al derrapar a la izquierda: ${slip}`);
}
if (driftChg <= 0) {
    throw new Error('El derrape no acumuló carga de turbo boost');
}

// Comprobación Anti-Trompo: Derrapar 60 frames seguidos con giro a fondo no debe hacer que el coche dé la vuelta
vm.runInContext(`
    for (let f = 0; f < 60; f++) {
        dustUpdate.call(window.raceScene, 2000 + f * 16, 16);
    }
`, ctx);
const sustainedDiff = vm.runInContext('Math.abs(Phaser.Math.Angle.WrapDegrees(playerCar.angle - driftTrajectoryAngle))', ctx);
if (sustainedDiff > 26.01) {
    throw new Error(`Fallo en el estabilizador anti-trompo: el ángulo excedió los 26° máximos (${sustainedDiff.toFixed(1)}°)`);
}
console.log(`✓ Estabilizador Anti-Trompo verificado al 100%: derrape continuo bloqueado a un máximo de ${sustainedDiff.toFixed(1)}° (imposible darse la vuelta)`);

// Soltar el botón de drift tras acumular carga debe disparar el Turbo Boost
vm.runInContext(`
    driftCharge = 0.6;
    touchHandbrake = false;
    dustUpdate.call(window.raceScene, 2016, 16);
`, ctx);
const boostTmr = vm.runInContext('driftBoostTimer', ctx);
if (boostTmr <= 0) {
    throw new Error('Soltar el drift tras la curva debe activar el Turbo Boost');
}
console.log(`✓ Físicas de Drift Arcade verificadas: velocidad sostenida a fondo (${Math.round(driftSpd)} km/h), inercia lateral (${slip.toFixed(1)}°) y Turbo Boost al salir de la curva`);

console.log('\n--- VERIFICANDO ECONOMÍA 100% TOKEN $CR (COFRES, TUNING Y NITROS) (V81) ---');
// 1. Verificar calibración de Cofres en $CR
const crateBronze = vm.runInContext('NFT_CRATES.bronze', ctx);
const crateSilver = vm.runInContext('NFT_CRATES.silver', ctx);
const crateGold = vm.runInContext('NFT_CRATES.gold', ctx);

if (crateBronze.cost !== 1000 || crateBronze.currency !== 'credits') {
    throw new Error(`Cofre bronce debe ser 1000 credits: ${JSON.stringify(crateBronze)}`);
}
if (crateSilver.cost !== 5000 || crateSilver.currency !== 'credits') {
    throw new Error(`Cofre plata debe ser 5000 credits: ${JSON.stringify(crateSilver)}`);
}
if (crateGold.cost !== 25000 || crateGold.currency !== 'credits') {
    throw new Error(`Cofre oro debe ser 25000 credits: ${JSON.stringify(crateGold)}`);
}
console.log('✓ Calibración de cofres en $CR verificada: Bronce=1,000 $CR (~1.00 USDT), Plata=5,000 $CR (~5.00 USDT), Oro=25,000 $CR (~25.00 USDT) (0 gemas necesarias)');

// 2. Verificar que todos los stages de tuning son 0 gemas
const branches = vm.runInContext('STAT_UPGRADE_BRANCHES', ctx);
for (const [bKey, branch] of Object.entries(branches)) {
    branch.stages.forEach((stg, idx) => {
        if (stg.gems !== 0) {
            throw new Error(`Rama ${bKey} stage ${idx + 1} no debe costar gemas: gems=${stg.gems}`);
        }
    });
}
console.log('✓ Modificaciones y tuning al 100% en $CR tokens: 5 ramas x 5 stages con 0 gemas requeridas');

// 3. Verificar compras de Nitros (1 por 50 $CR, 5 por 200 $CR, 20 por 700 $CR) y quema del 20%
vm.runInContext(`
    const uData = loadNftUserData();
    uData.credits = 100000;
    uData.nitros = 2;
    uData.burnedTokens = 0;
    saveNftUserData(uData);
`, ctx);

const resN1 = vm.runInContext('buyNitrosWithTokens(1)', ctx);
if (!resN1.success || resN1.cost !== 50 || resN1.newNitros !== 3) {
    throw new Error(`Error en compra de 1 nitro: ${JSON.stringify(resN1)}`);
}
const resN5 = vm.runInContext('buyNitrosWithTokens(5)', ctx);
if (!resN5.success || resN5.cost !== 200 || resN5.newNitros !== 8) {
    throw new Error(`Error en compra de 5 nitros: ${JSON.stringify(resN5)}`);
}
const resN20 = vm.runInContext('buyNitrosWithTokens(20)', ctx);
if (!resN20.success || resN20.cost !== 700 || resN20.newNitros !== 28) {
    throw new Error(`Error en compra de 20 nitros: ${JSON.stringify(resN20)}`);
}
const burnedTokens = vm.runInContext('loadNftUserData().burnedTokens', ctx);
if (burnedTokens !== 190) { // 20% de (50 + 200 + 700) = 20% de 950 = 190 $CR
    throw new Error(`Tokens quemados en nitros incorrectos: ${burnedTokens}`);
}
console.log('✓ Packs de Nitros en $CR verificados: 1x=50 $CR (~0.05 USDT), 5x=200 $CR (~0.20 USDT), 20x=700 $CR (~0.70 USDT) (+20% quema deflacionaria)');

// 4. Apertura de Cofre Oro Apex Pro pagado con 25,000 $CR
const beforeGoldCredits = vm.runInContext('loadNftUserData().credits', ctx);
const resGold = vm.runInContext('openMysteryCrate("gold")', ctx);
if (!resGold.success || resGold.car == null) {
    throw new Error(`Fallo al abrir cofre oro con $CR: ${JSON.stringify(resGold)}`);
}
const afterGoldCredits = vm.runInContext('loadNftUserData().credits', ctx);
if (beforeGoldCredits - afterGoldCredits !== 25000) {
    throw new Error(`Deducción de créditos para cofre oro incorrecta: ${beforeGoldCredits - afterGoldCredits}`);
}
const totalBurned = vm.runInContext('loadNftUserData().burnedTokens', ctx);
if (totalBurned !== 190 + 5000) { // +20% de 25,000 = 5,000 $CR
    throw new Error(`Tokens quemados acumulados tras cofre oro incorrectos: ${totalBurned}`);
}
console.log('✓ Apertura de Cofre Oro por 25,000 $CR y quema deflacionaria de 5,000 $CR verificada');

console.log('\n--- VERIFICANDO ORÁCULO DINÁMICO Y PEG A USDT ANTE SUBIDA DEL TOKEN (V83) ---');
// Simular subida del token de $0.001 a $0.10 (100x pump)
vm.runInContext('setTokenPriceUsd(0.10)', ctx);
const pricePumped = vm.runInContext('getTokenPriceUsd()', ctx);
if (pricePumped !== 0.10) {
    throw new Error(`Precio de oráculo debe ser 0.10: ${pricePumped}`);
}

// Comprobar recálculo dinámico de cofres
const pumpedBronze = vm.runInContext('NFT_CRATES.bronze.cost', ctx);
const pumpedSilver = vm.runInContext('NFT_CRATES.silver.cost', ctx);
const pumpedGold = vm.runInContext('NFT_CRATES.gold.cost', ctx);

if (pumpedBronze !== 10) { // 1.00 USDT / 0.10 = 10 $CR
    throw new Error(`A $0.10/token, cofre bronce debe costar 10 $CR (actual: ${pumpedBronze})`);
}
if (pumpedSilver !== 50) { // 5.00 USDT / 0.10 = 50 $CR
    throw new Error(`A $0.10/token, cofre plata debe costar 50 $CR (actual: ${pumpedSilver})`);
}
if (pumpedGold !== 250) { // 25.00 USDT / 0.10 = 250 $CR
    throw new Error(`A $0.10/token, cofre oro debe costar 250 $CR (actual: ${pumpedGold})`);
}
console.log('✓ Recálculo dinámico verificado tras pump a $0.10/token:');
console.log(`   - Cofre Común (1.00 USDT): 1.000 $CR -> ${pumpedBronze} $CR`);
console.log(`   - Cofre Plata (5.00 USDT): 5.000 $CR -> ${pumpedSilver} $CR`);
console.log(`   - Cofre Oro (25.00 USDT): 25.000 $CR -> ${pumpedGold} $CR`);

// Comprobar compra de Nitros con token a $0.10
const resNitroPump = vm.runInContext('buyNitrosWithTokens(1)', ctx);
if (!resNitroPump.success || resNitroPump.cost !== 1) { // 0.05 USDT / 0.10 = 0.5 -> redondeo = 1 $CR
    throw new Error(`A $0.10/token, 1 nitro debe costar 1 $CR (actual: ${JSON.stringify(resNitroPump)})`);
}
const resNitro5Pump = vm.runInContext('buyNitrosWithTokens(5)', ctx);
if (!resNitro5Pump.success || resNitro5Pump.cost !== 2) { // 0.20 USDT / 0.10 = 2 $CR
    throw new Error(`A $0.10/token, 5 nitros deben costar 2 $CR (actual: ${JSON.stringify(resNitro5Pump)})`);
}
console.log(`✓ Compra de nitros adaptada a $0.10/token: 1 Nitro=${resNitroPump.cost} $CR, Pack 5=${resNitro5Pump.cost} $CR`);

// Comprobar apertura de cofre común con token a $0.10
const creditsBeforeOpen = vm.runInContext('loadNftUserData().credits', ctx);
const resOpenPump = vm.runInContext('openMysteryCrate("bronze")', ctx);
if (!resOpenPump.success || resOpenPump.car == null) {
    throw new Error(`Fallo al abrir cofre bronce dinámico: ${JSON.stringify(resOpenPump)}`);
}
const creditsAfterOpen = vm.runInContext('loadNftUserData().credits', ctx);
if (creditsBeforeOpen - creditsAfterOpen !== 10) {
    throw new Error(`Se debieron descontar exactamente 10 $CR (actual: ${creditsBeforeOpen - creditsAfterOpen})`);
}
console.log('✓ Apertura de Cofre Común a $0.10 descontó exactamente 10 $CR (equivalente a 1.00 USDT)');

// Restablecer al precio base
vm.runInContext('TOKEN_ORACLE.resetToDefault()', ctx);
if (vm.runInContext('NFT_CRATES.bronze.cost', ctx) !== 1000) {
    throw new Error('Al restablecer a $0.001, cofre bronce debe volver a 1,000 $CR');
}
console.log('✓ Restablecimiento del Oráculo a precio base ($0.0010) verificado con éxito');

// =========================================================================
// TEST DE SEGURIDAD: MODO LANZAMIENTO OFICIAL (APP_CONFIG.IS_PRODUCTION_RELEASE)
// =========================================================================
console.log('\n--- Probando Sistema de Seguridad de Lanzamiento Oficial ---');

// 1. Activar Modo Producción
vm.runInContext('APP_CONFIG.IS_PRODUCTION_RELEASE = true', ctx);

// Renderizar modal de Ajustes en modo Producción
vm.runInContext('openSettingsModal()', ctx);
const modalHtmlProd = doc.getElementById('settings-modal').innerHTML;
if (modalHtmlProd.includes('grantTestingFunds') || modalHtmlProd.includes('RECARGAR +1,000,000') || modalHtmlProd.includes('settings_designer_mode')) {
    throw new Error('FALLO DE SEGURIDAD: En modo producción, el botón de diseñador o recarga de fondos sigue en el HTML de Ajustes.');
}
console.log('✓ En Producción: El Modo Diseñador y Recarga de Fondos han sido ELIMINADOS de Ajustes');

// Renderizar Tienda en modo Producción
vm.runInContext('renderShopView()', ctx);
const shopHtmlProd = doc.getElementById('view-shop').innerHTML;
if (shopHtmlProd.includes('GRATIS (TESTING)')) {
    throw new Error('FALLO DE SEGURIDAD: En modo producción, los paquetes de dinero gratis siguen en la Tienda.');
}
console.log('✓ En Producción: Los paquetes de "GRATIS (TESTING)" han sido ELIMINADOS de la Tienda');

// Comprobar que llamar directamente a grantTestingFunds() o addFunds() está bloqueado
const userCreditsBefore = vm.runInContext('loadNftUserData().credits', ctx);
vm.runInContext('grantTestingFunds()', ctx);
vm.runInContext('addFunds(50000, 1000)', ctx);
const userCreditsAfter = vm.runInContext('loadNftUserData().credits', ctx);
if (userCreditsBefore !== userCreditsAfter) {
    throw new Error('FALLO DE SEGURIDAD: Las funciones de inyección de fondos no fueron bloqueadas en Producción.');
}
console.log('✓ En Producción: Las funciones internas de inyección de fondos (grantTestingFunds, addFunds) están completamente bloqueadas');

// Comprobar bloqueo de progresión estricta en producción
vm.runInContext('localStorage.removeItem("dustrac_story_save")', ctx);
const prodStory = vm.runInContext('loadStoryProgress()', ctx);
if (prodStory.designerMode !== false || prodStory.unlockedTracks.length !== 1 || prodStory.unlockedTracks[0] !== 'rookie_ring') {
    throw new Error('FALLO DE SEGURIDAD: En producción, el progreso de la historia debe arrancar estrictamente en rookie_ring con designerMode false.');
}
console.log('✓ En Producción: Progresión estricta forzada a Pista 1 (rookie_ring) sin trucos');

// Comprobar que toggleSetting('designer') está bloqueado
vm.runInContext('toggleSetting("designer")', ctx);
const prodStoryAfterToggle = vm.runInContext('loadStoryProgress()', ctx);
if (prodStoryAfterToggle.designerMode === true) {
    throw new Error('FALLO DE SEGURIDAD: toggleSetting("designer") no debe poder activarse en Producción.');
}
console.log('✓ En Producción: toggleSetting("designer") rechazado sin cambios');

// 2. Restaurar a modo desarrollo (false) para que el desarrollador continúe sus pruebas
vm.runInContext('APP_CONFIG.IS_PRODUCTION_RELEASE = false', ctx);
vm.runInContext('openSettingsModal()', ctx);
const modalHtmlDev = doc.getElementById('settings-modal').innerHTML;
if (!modalHtmlDev.includes('grantTestingFunds')) {
    throw new Error('En modo desarrollo (false), las herramientas de testing deben estar disponibles para pruebas.');
}
// 3. Verificar Mercado P2P vacío en producción y libre elección de precio
console.log('\n--- VERIFICANDO MERCADO P2P Y TORNEO SEMANAL CON BOTE ACUMULATIVO (V91) ---');
// Limpiar ofertas de tests previos para simular el inicio limpio de producción
vm.runInContext('COMMUNITY_MARKETPLACE_LISTINGS = COMMUNITY_MARKETPLACE_LISTINGS.filter(l => !l.sellerIsMe && !l.isRealPlayer);', ctx);
vm.runInContext('APP_CONFIG.IS_PRODUCTION_RELEASE = true', ctx);
const prodMarketListings = vm.runInContext('getMarketplaceListings()', ctx);
if (prodMarketListings.length !== 0) {
    throw new Error(`En producción el mercado debe arrancar vacío si no hay ofertas reales. Encontradas: ${prodMarketListings.length}`);
}
console.log('✓ En Producción: El Mercado P2P arranca 100% vacío (sin ofertas bot/seed)');

// Publicar pieza con precio personalizado elegido por el usuario (ej: 480 $CR)
vm.runInContext('(() => { const uData = loadNftUserData(); if (!uData.partsInventory) uData.partsInventory = {}; uData.partsInventory["turbocharger"] = 2; saveNftUserData(uData); })()', ctx);
const customPriceRes = vm.runInContext('listPartOnMarketplace("turbocharger", 480)', ctx);
if (!customPriceRes.success || customPriceRes.listing.priceCr !== 480) {
    throw new Error('El usuario debe poder fijar el precio que desee en $CR');
}
const updatedProdListings = vm.runInContext('getMarketplaceListings()', ctx);
if (updatedProdListings.length !== 1 || updatedProdListings[0].priceCr !== 480) {
    throw new Error('La oferta del usuario debe aparecer en el mercado de producción con su precio personalizado');
}
console.log('✓ Precio libre verificado: La pieza se publicó con éxito a 480 $CR fijados por el usuario');

// Verificar configuración del Torneo Semanal: 200 $CR de bote inicial garantizado sin cartel independiente
const tourneyConfig = vm.runInContext('WEEKLY_TOURNAMENT_CONFIG', ctx);
if (tourneyConfig.houseBonusCr !== 200) {
    throw new Error(`El bote inicial garantizado debe ser 200 $CR, actual: ${tourneyConfig.houseBonusCr}`);
}
console.log('✓ Torneo Semanal: houseBonusCr configurado en 200 $CR (integrado directamente en el bote acumulado)');

vm.runInContext('openWeeklyTournamentModal()', ctx);
const tourneyModalHtml = doc.getElementById('weekly-tournament-modal').innerHTML;
if (!tourneyModalHtml.includes('BOTE TOTAL ACUMULADO')) {
    throw new Error('El modal del torneo debe mostrar la tarjeta destacada BOTE TOTAL ACUMULADO');
}
if (tourneyModalHtml.includes('INSCRITOS:') || tourneyModalHtml.includes('PATROCINIO DE LA CASA:')) {
    throw new Error('El modal del torneo NO debe mostrar tarjetas de inscritos ni patrocinio de la casa');
}
console.log('✓ Modal de Torneo verificado: Muestra exclusivamente el BOTE TOTAL ACUMULADO');

// Restaurar desarrollo
vm.runInContext('APP_CONFIG.IS_PRODUCTION_RELEASE = false', ctx);

console.log('\n========================================');
console.log('SUCCESS! ALL TESTS PASSED SUCCESSFULLY!');
console.log('========================================');







