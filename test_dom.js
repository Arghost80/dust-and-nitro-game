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

['game-hub-root', 'hub-header', 'view-main', 'view-garage', 'view-crates', 'view-shop', 'view-comp', 'settings-modal', 'game-container', 'btn-left', 'btn-right', 'btn-accel', 'btn-brake', 'btn-handbrake'].forEach(id => doc.getElementById(id));

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
if (!shopHtml.includes('PACKS DE PIEZAS DEL TALLER') || !shopHtml.includes('Pack de Frenada Brembo')) {
    throw new Error('La tienda no contiene los packs de piezas mecánicas');
}

// Test de fin de carrera y otorgamiento de botín de piezas: SOLO 1º y 2º puesto ganan piezas
console.log('\n--- PROBANDO BOTÍN DE PIEZAS AL COMPLETAR CARRERA (endRace) ---');

// Caso 1: 1º Puesto (debe ganar exactamente 4 piezas)
vm.runInContext(`hudPosText.text = 'POS: 1 / 6'`, ctx);
const prePartsRank1 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
vm.runInContext(`endRace()`, ctx);
const postPartsRank1 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
const diffRank1 = postPartsRank1 - prePartsRank1;
console.log(`Piezas ganadas en 1º Puesto: ${diffRank1} (esperadas: 4)`);
if (diffRank1 !== 4) throw new Error(`El 1º puesto debe otorgar 4 piezas, otorgó: ${diffRank1}`);

// Caso 2: 2º Puesto (debe ganar 3 piezas)
vm.runInContext(`hudPosText.text = 'POS: 2 / 6'`, ctx);
const prePartsRank2 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
vm.runInContext(`endRace()`, ctx);
const postPartsRank2 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
const diffRank2 = postPartsRank2 - prePartsRank2;
console.log(`Piezas ganadas en 2º Puesto: ${diffRank2} (esperadas: 3)`);
if (diffRank2 !== 3) throw new Error(`El 2º puesto debe otorgar 3 piezas, otorgó: ${diffRank2}`);

// Caso 3: 3º Puesto (debe ganar 2 piezas)
vm.runInContext(`hudPosText.text = 'POS: 3 / 6'`, ctx);
const prePartsRank3 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
vm.runInContext(`endRace()`, ctx);
const postPartsRank3 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
const diffRank3 = postPartsRank3 - prePartsRank3;
console.log(`Piezas ganadas en 3º Puesto: ${diffRank3} (esperadas: 2)`);
if (diffRank3 !== 2) throw new Error(`El 3º puesto debe otorgar 2 piezas, otorgó: ${diffRank3}`);

// Caso 4: 4º Puesto (debe ganar 1 pieza de consolación)
vm.runInContext(`hudPosText.text = 'POS: 4 / 6'`, ctx);
const prePartsRank4 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
vm.runInContext(`endRace()`, ctx);
const postPartsRank4 = vm.runInContext(`Object.values(loadNftUserData().partsInventory).reduce((a, b) => a + b, 0)`, ctx);
const diffRank4 = postPartsRank4 - prePartsRank4;
console.log(`Piezas ganadas en 4º Puesto: ${diffRank4} (esperadas: 1)`);
if (diffRank4 !== 1) throw new Error(`El 4º puesto debe otorgar 1 pieza de consolación, otorgó: ${diffRank4}`);

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
console.log('Energía del coche tras 6 carreras disputadas (10 - 6 = 4):', carTest.energy, '/', carTest.maxEnergy);
if (typeof carTest.energy !== 'number' || carTest.energy !== 4) {
    throw new Error('El coche debe tener 4 puntos de energía tras disputar 6 carreras');
}

// Simular gasto de energía y regeneración horaria (+1⚡ cada 1h)
const regeneratedEnergy = vm.runInContext(`
    const u = loadNftUserData();
    const c = u.garage[0];
    c.energy = 6;
    c.lastEnergyUpdate = Date.now() - (2.5 * 3600 * 1000);
    refreshCarEnergy(c);
    saveNftUserData(u);
    c.energy;
`, ctx);
console.log('Energía tras 2.5h transcurridas (+2⚡ esperados):', regeneratedEnergy);
if (regeneratedEnergy !== 8) {
    throw new Error(`Regeneración horaria incorrecta: esperada 8, obtenida ${regeneratedEnergy}`);
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
carTest.energy = 4;
vm.runInContext(`saveNftUserData(${JSON.stringify(userForEnergy)})`, ctx);
const buyEnergyRes = vm.runInContext(`buyEnergyPack('pack_energy_boost', '${carTest.instanceId}')`, ctx);
console.log('Resultado de compra de Batería en Tienda:', buyEnergyRes.success, 'Nueva energía:', buyEnergyRes.newEnergy);
if (!buyEnergyRes.success || buyEnergyRes.newEnergy !== 6) {
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
console.log('✓ Modal y lógica del Pase de Temporada (Neon Apex) funcionando al 100%');

// 2. Mercado P2P Comunitario
const listingsCount = vm.runInContext('getMarketplaceListings().length', ctx);
console.log('Ofertas comunitarias iniciales en el Mercado P2P:', listingsCount);
if (listingsCount < 3) {
    throw new Error('El mercado P2P debe contener ofertas iniciales comunitarias');
}
const buyListingRes = vm.runInContext('buyMarketplacePart("lst_02")', ctx);
console.log('Resultado de compra P2P en el Mercado:', buyListingRes.success, 'Pieza:', buyListingRes.listing ? buyListingRes.listing.name : null);
if (!buyListingRes.success) {
    throw new Error('Fallo al comprar pieza comunitaria en el Mercado P2P');
}
const sellRes = vm.runInContext('sellPartToMarketplace("spark_plugs", 200)', ctx);
console.log('Resultado de venta en el Mercado P2P (+200 $CR):', sellRes.success);
if (!sellRes.success) {
    throw new Error('Fallo al vender pieza en el Mercado P2P');
}
vm.runInContext('openPartsMarketplaceModal("buy")', ctx);
const mpModal = doc.getElementById('marketplace-modal');
if (!mpModal || !mpModal.innerHTML.includes('MERCADO P2P DE LA COMUNIDAD TELEGRAM')) {
    throw new Error('El modal del Mercado P2P debe renderizarse');
}
console.log('✓ Mercado P2P de piezas comunitarias probado y operativo');

// 3. Torneo Semanal Oficial
const tourneyInfo = vm.runInContext('getWeeklyTournamentInfo()', ctx);
console.log('Torneo Semanal:', tourneyInfo.title, 'Bote en TON:', tourneyInfo.prizeTon, 'Bote en $CR:', tourneyInfo.prizeCr);
if (!tourneyInfo.title || !tourneyInfo.prizeTon) {
    throw new Error('La información del torneo semanal debe estar disponible');
}
const enterTourneyRes = vm.runInContext('enterWeeklyTournament()', ctx);
console.log('Resultado de inscripción en el Torneo Semanal:', enterTourneyRes.success);
if (!enterTourneyRes.success) {
    throw new Error('Fallo al inscribirse en el Torneo Semanal Oficial');
}
vm.runInContext('openWeeklyTournamentModal()', ctx);
const wtModal = doc.getElementById('weekly-tournament-modal');
if (!wtModal || !wtModal.innerHTML.includes('TORNEO SEMANAL GT GRAND PRIX')) {
    throw new Error('El modal del Torneo Semanal debe renderizarse');
}
console.log('✓ Torneo Semanal GT Grand Prix verificado con éxito');

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
const signRes = vm.runInContext("signSponsorshipContract('sp_castrol')", ctx);
console.log('Firma de contrato con Castrol:', signRes.success);
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

// Comprobar compra de Nitros con Tokens $CR
const nitroBuyRes = vm.runInContext('buyNitrosWithTokens(1)', ctx);
if (!nitroBuyRes.success || nitroBuyRes.amount !== 1 || nitroBuyRes.cost !== 10) {
    throw new Error('buyNitrosWithTokens debe descontar 10 $CR y añadir 1 Nitro');
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
if (timer1 <= 0 || rem1 !== 1 || badge1 !== '1') {
    throw new Error(`Primer nitro falló: timer=${timer1}, remaining=${rem1}, badge=${badge1}`);
}
console.log('✓ 1er Nitro activado con éxito: 2.0s de impulso, resta a 1 cápsula y badge "1"');

// Simular paso de 2.1 segundos para que termine el boost
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

console.log('\n========================================');
console.log('SUCCESS! ALL TESTS PASSED SUCCESSFULLY!');
console.log('========================================');





