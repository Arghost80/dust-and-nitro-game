// ===== DUST RACING 2D: MODERN TELEGRAM MINIAPP EDITION =====
// Adaptación completa y oficial de Dust Racing 2D (Dustrac) para Telegram Mini App.
// Utiliza los assets originales oficiales (.png limpios con canal alfa), niveles reales (.trk)
// y añade mejoras gráficas modernas: sombras ambientales suaves, partículas de humo/chispas,
// marcas de goma permanentes, iluminación de faros dinámicos, minimapa radar e IA de 6 coches.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ===== SINTETIZADOR DE AUDIO WEB AUDIO API =====
class DustAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.isReady = false;
    }
    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();
            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando interacción');
        }
    }
    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineOsc) return;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));
        const freq = 65 + ratio * 190;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
    }
    playDrift() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(460 + Math.random() * 80, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }
    playKerb() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.setValueAtTime(140, now + 0.03);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }
    playSand() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.025, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }
    playLap() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(784, now + 0.16);
        osc.frequency.setValueAtTime(1046, now + 0.24);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }
    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.15));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.15));
    }
}
const dustAudio = new DustAudio();

// ===== CONFIGURACIÓN DEL JUEGO =====
const CONFIG = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: { preload: dustPreload, create: dustCreate, update: dustUpdate }
};

const game = new Phaser.Game(CONFIG);

// Catálogo de coches con assets originales de Dust Racing 2D
const DUST_CARS = [
    { id: 'car_red', texture: 'car_red', name: 'FERRARI 488 GT3', speed: 470, accel: 390, handling: 4.8 },
    { id: 'car_blue', texture: 'car_blue', name: 'ASTON VANTAGE GT3', speed: 460, accel: 400, handling: 5.0 },
    { id: 'car_yellow', texture: 'car_yellow', name: 'PORSCHE 911 GT3', speed: 490, accel: 420, handling: 4.6 },
    { id: 'car_green', texture: 'car_green', name: 'BMW M4 GT3', speed: 450, accel: 410, handling: 5.4 },
    { id: 'car_cyan', texture: 'car_cyan', name: 'MCLAREN 720S GT3', speed: 480, accel: 380, handling: 4.9 },
    { id: 'car_orange', texture: 'car_orange', name: 'IRON DAMES GT3', speed: 475, accel: 395, handling: 4.7 }
];

let currentTrackId = 'monza';
let selectedCarIndex = 0;
let gameState = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACE' | 'FINISHED'

let raceScene;
let playerCar;
let aiCars = [];
let playerSpeed = 0;
let playerLap = 1;
const TOTAL_LAPS = 3;
let playerNextNodeIdx = 1;
let lapStartTime = 0;
let bestLapTime = null;

let skidLayer;
let radarGraphics;
let hudPosText, hudLapText, hudTimeText, hudSpeedText, hudSurfaceText;

// Controles táctiles y teclado
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// ===== PRELOAD: CARGA DE ASSETS ORIGINALES DE DUSTRACING2D =====
function dustPreload() {
    const p = 'assets/dustrac_clean/';

    // Terreno y Pista
    this.load.image('dt_grass', p + 'grass.png');
    this.load.image('dt_sand', p + 'sand.png');
    this.load.image('dt_sandGrassStraight', p + 'sandGrassStraight.png');
    this.load.image('dt_sandGrassCorner', p + 'sandGrassCorner.png');
    this.load.image('dt_sandGrassCorner2', p + 'sandGrassCorner2.png');
    this.load.image('dt_straight', p + 'straight.png');
    this.load.image('dt_corner90', p + 'corner.png');
    this.load.image('dt_corner45Left', p + 'corner45Left.png');
    this.load.image('dt_corner45Right', p + 'corner45Right.png');
    this.load.image('dt_straight45Male', p + 'straight45Male.png');
    this.load.image('dt_straight45Female', p + 'straight45Female.png');
    this.load.image('dt_finish', p + 'finish.png');

    // Objetos de Decoración y Entorno
    this.load.image('dt_tree', p + 'tree.png');
    this.load.image('dt_tire', p + 'tire.png');
    this.load.image('dt_grandstand', p + 'grandstand.png');
    this.load.image('dt_rock', p + 'rock.png');
    this.load.image('dt_bushArea', p + 'bushArea.png');
    this.load.image('dt_pit', p + 'pit.png');
    this.load.image('dt_skid', p + 'skid.png');
    this.load.image('dt_smoke', p + 'smoke.png');
    this.load.image('dt_sparkle', p + 'sparkle.png');
    this.load.image('dt_startLightOn', p + 'startLightOn.png');
    this.load.image('dt_startLightOff', p + 'startLightOff.png');

    // Coches GT3 fotorrealistas (hoja de sprites nueva)
    this.load.image('gt_cars_sheet', 'assets/real_gt_cars.jpg');
}

// Recorta los 6 GT3 de la hoja, quita el fondo negro, recorta al contorno
// y los voltea para que el morro apunte a la derecha (convención de Dust Racing).
// Genera las texturas con las mismas claves que usaba el juego (car_red, car_blue...).
function buildGT3CarTextures(scene) {
    const src = scene.textures.get('gt_cars_sheet').getSourceImage();
    const cellW = 500, cellH = 330;
    const cells = [
        { key: 'car_yellow', c: 0, r: 0 }, // Manthey Porsche 911 GT3 Grello
        { key: 'car_red',    c: 1, r: 0 }, // Ferrari 488 GT3
        { key: 'car_blue',   c: 0, r: 1 }, // Aston Martin Vantage Valvoline
        { key: 'car_green',  c: 1, r: 1 }, // BMW M4 GT3 Rowe
        { key: 'car_orange', c: 0, r: 2 }, // Iron Dames GT3
        { key: 'car_cyan',   c: 1, r: 2 }  // McLaren 720S Gulf
    ];
    const rowY = [20, 350, 690];

    cells.forEach(cell => {
        const sx = cell.c * 512 + 6;
        const sy = rowY[cell.r];
        const w = Math.min(cellW, src.width - sx);
        const h = Math.min(cellH, src.height - sy);

        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);

        const img = tctx.getImageData(0, 0, w, h);
        const d = img.data;
        const lumAt = (p) => Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
        // Flood-fill desde los bordes: solo se borra el fondo/sombra oscura conectada al exterior,
        // así las partes negras del propio coche (cristales, libreas negras) no se agujerean.
        const BG = 42;
        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
        for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
        while (stack.length) {
            const p = stack.pop();
            if (seen[p]) continue;
            seen[p] = 1;
            if (lumAt(p) >= BG) continue;
            d[p * 4 + 3] = 0;
            const x = p % w, y = (p / w) | 0;
            if (x > 0) stack.push(p - 1);
            if (x < w - 1) stack.push(p + 1);
            if (y > 0) stack.push(p - w);
            if (y < h - 1) stack.push(p + w);
        }
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (d[(y * w + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        tctx.putImageData(img, 0, 0);

        const bw = Math.max(1, maxX - minX + 1);
        const bh = Math.max(1, maxY - minY + 1);
        const out = document.createElement('canvas');
        out.width = bw; out.height = bh;
        const octx = out.getContext('2d');
        // Volteo horizontal: en la hoja el morro mira a la izquierda
        octx.translate(bw, 0);
        octx.scale(-1, 1);
        octx.drawImage(tmp, minX, minY, bw, bh, 0, 0, bw, bh);

        if (scene.textures.exists(cell.key)) scene.textures.remove(cell.key);
        scene.textures.addCanvas(cell.key, out);
    });
}

function dustCreate() {
    raceScene = this;
    buildGT3CarTextures(this);

    // Configuración de Teclado
    keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    setupTouchControls();
    showMenu(this);
}

// Configurar botones táctiles en móviles
function setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); dustAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); dustAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
}

// ===== MENÚ PRINCIPAL: SELECCIÓN DE CIRCUITO Y COCHE =====
function showMenu(scene) {
    gameState = 'MENU';
    scene.children.removeAll();

    // Fondo elegante estilo juego de carreras retro-moderno
    const bg = scene.add.graphics();
    bg.fillStyle(0x0c0e14, 1);
    bg.fillRect(0, 0, 960, 540);

    // Patrón decorativo de cuadros
    bg.fillStyle(0x141824, 0.4);
    for (let x = 0; x < 960; x += 40) {
        for (let y = 0; y < 540; y += 40) {
            if ((x / 40 + y / 40) % 2 === 0) bg.fillRect(x, y, 40, 40);
        }
    }

    // Cabecera
    scene.add.text(480, 45, '🏁 DUST RACING 2D 🏁', {
        font: '900 36px Arial',
        fill: '#ffffff',
        stroke: '#e53935',
        strokeThickness: 6
    }).setOrigin(0.5);

    scene.add.text(480, 84, 'TELEGRAM MINI APP EDITION • CIRCUITOS Y ASSETS OFICIALES', {
        font: 'bold 12px Arial',
        fill: '#00f5d4',
        letterSpacing: 2
    }).setOrigin(0.5);

    // Selección de Circuitos Oficiales
    scene.add.text(480, 125, '--- SELECCIONA CIRCUITO OFICIAL ---', {
        font: '900 13px Arial', fill: '#fee440'
    }).setOrigin(0.5);

    const circuitList = [
        { id: 'monza', name: '🇮🇹 MONZA (Templo de la Velocidad)' },
        { id: 'suzuka', name: '🇯🇵 SUZUKA (Curvas en S & Puente)' },
        { id: 'twineburg', name: '🇩🇪 TWINEBURG (Circuito Rápido Bosque)' },
        { id: 'crossroads', name: '🇺🇸 CROSSROADS (Cruce & Chicanes)' },
        { id: 'western_valley', name: '🏜️ WESTERN VALLEY (Cañón & Arena)' },
        { id: 'triangle', name: '🏁 TRIANGLE (Tri-Óvalo Técnico)' }
    ];

    circuitList.forEach((c, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = col === 0 ? 270 : 690;
        const by = 165 + row * 45;
        const isSel = currentTrackId === c.id;

        const btnBox = scene.add.graphics();
        btnBox.fillStyle(isSel ? 0xd32f2f : 0x1b202e, 0.95);
        btnBox.fillRoundedRect(bx - 190, by - 16, 380, 34, 6);
        btnBox.lineStyle(2, isSel ? 0xfee440 : 0x2e384d, 1);
        btnBox.strokeRoundedRect(bx - 190, by - 16, 380, 34, 6);

        const btnTxt = scene.add.text(bx, by, c.name, {
            font: 'bold 13px Arial',
            fill: isSel ? '#ffffff' : '#cfd8dc'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnTxt.on('pointerdown', () => {
            dustAudio.init();
            currentTrackId = c.id;
            showMenu(scene);
        });
    });

    // Selección de Coches Oficiales de Dust Racing 2D
    scene.add.text(480, 320, '--- SELECCIONA VEHÍCULO OFICIAL ---', {
        font: '900 13px Arial', fill: '#fee440'
    }).setOrigin(0.5);

    DUST_CARS.forEach((car, idx) => {
        const cx = 160 + idx * 128;
        const cy = 380;
        const isSel = selectedCarIndex === idx;

        const cBox = scene.add.graphics();
        cBox.fillStyle(isSel ? 0x2e7d32 : 0x151922, 0.9);
        cBox.fillRoundedRect(cx - 55, cy - 35, 110, 75, 8);
        cBox.lineStyle(2, isSel ? 0x00f5d4 : 0x2e384d, 1);
        cBox.strokeRoundedRect(cx - 55, cy - 35, 110, 75, 8);

        // Sprite oficial del coche escalado a 48x25
        scene.add.sprite(cx, cy - 10, car.texture).setDisplaySize(48, 25).setAngle(-90);

        scene.add.text(cx, cy + 20, car.name.split(' ')[0], {
            font: 'bold 11px Arial',
            fill: isSel ? '#ffffff' : '#90a4ae'
        }).setOrigin(0.5);

        const hit = scene.add.rectangle(cx, cy, 110, 75).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            dustAudio.init();
            selectedCarIndex = idx;
            showMenu(scene);
        });
    });

    // Botón Iniciar Gran Premio
    const startBox = scene.add.graphics();
    startBox.fillStyle(0x00c853, 1);
    startBox.fillRoundedRect(340, 465, 280, 48, 10);
    startBox.lineStyle(2, 0xffffff, 0.8);
    startBox.strokeRoundedRect(340, 465, 280, 48, 10);

    const startBtn = scene.add.text(480, 489, '¡INICIAR GRAN PREMIO! ▶', {
        font: '900 18px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        dustAudio.init();
        startRace(scene, currentTrackId, selectedCarIndex);
    });
}

// ===== INICIAR CARRERA Y CONSTRUIR MUNDO DUSTRAC OFICIAL =====
function startRace(scene, trackId, carIdx) {
    scene.children.removeAll();

    const tracks = window.DustracTracks || {};
    const track = tracks[trackId];
    if (!track) {
        console.error('Circuito no encontrado:', trackId);
        return;
    }

    gameState = 'COUNTDOWN';
    console.log(`🏁 Cargando nivel oficial: ${track.name} (${track.worldWidth}x${track.worldHeight}px)`);

    // Límites de físicas y cámara del mundo
    scene.physics.world.setBounds(0, 0, track.worldWidth, track.worldHeight);
    scene.cameras.main.setBounds(0, 0, track.worldWidth, track.worldHeight);

    // 1. TERRENO BASE: Césped Oficial de Dust Racing 2D
    scene.add.tileSprite(
        track.worldWidth / 2,
        track.worldHeight / 2,
        track.worldWidth,
        track.worldHeight,
        'dt_grass'
    ).setDepth(0);

    // Mapa de colisiones y superficies por celda (i, j)
    scene.tileMap = new Map();

    // 2. CONSTRUCCIÓN DE TILES DEL CIRCUITO (.trk)
    track.tiles.forEach(tile => {
        const tx = tile.i * 256 + 128;
        const ty = tile.j * 256 + 128;
        scene.tileMap.set(`${tile.i},${tile.j}`, tile);

        // A) Trampas de Arena y Transiciones Oficiales
        if (tile.t === 'sand') {
            scene.add.sprite(tx, ty, 'dt_sand').setDisplaySize(256, 256).setDepth(1);
        } else if (tile.t === 'sandGrassStraight') {
            scene.add.sprite(tx, ty, 'dt_sandGrassStraight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner2') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner2').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        }

        // B) Segmentos de Asfalto con Pianos Oficiales Limpios (Transparencia Perfecta)
        if (tile.t === 'straight') {
            scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'finish') {
            scene.add.sprite(tx, ty, 'dt_finish').setDisplaySize(256, 256).setAngle(tile.o).setDepth(3);
        } else if (tile.t === 'corner90') {
            scene.add.sprite(tx, ty, 'dt_corner90').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'corner45Left') {
            scene.add.sprite(tx, ty, 'dt_corner45Left').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'corner45Right') {
            scene.add.sprite(tx, ty, 'dt_corner45Right').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'straight45Male') {
            scene.add.sprite(tx, ty, 'dt_straight45Male').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'straight45Female') {
            scene.add.sprite(tx, ty, 'dt_straight45Female').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'bridge') {
            // El puente elevado cruza por encima de la pista
            const bridge = scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(20);
            bridge.setTint(0x90caf9);
        }
    });

    // 3. CAPA DE MARCAS DE GOMA DE DERRAPE PERMANENTES (SKID MARKS)
    skidLayer = scene.add.graphics().setDepth(4);

    // 4. OBJETOS DEL ENTORNO OFICIALES (Árboles, Tribunas, Neumáticos, Rocas)
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            // Sombra suave ambiental proyectada a 45 grados
            scene.add.ellipse(obj.x + 8, obj.y + 10, 48, 40, 0x000000, 0.35).setDepth(13);
            const tree = scene.add.sprite(obj.x, obj.y, 'dt_tree').setDisplaySize(56, 56).setDepth(14);
            // Balanceo sutil de viento
            scene.tweens.add({
                targets: tree,
                angle: (Math.random() - 0.5) * 3,
                duration: 2400 + Math.random() * 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (obj.r === 'grandstand') {
            // Sombra de tribuna
            scene.add.rectangle(obj.x + 8, obj.y + 12, 140, 140, 0x000000, 0.3).setAngle(obj.o).setDepth(11);
            scene.add.sprite(obj.x, obj.y, 'dt_grandstand').setDisplaySize(140, 140).setAngle(obj.o).setDepth(12);
        } else if (obj.r === 'tire') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 18, 18, 0x000000, 0.4).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(18, 18).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 20, 16, 0x000000, 0.35).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(20, 20).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'bushArea') {
            scene.add.sprite(obj.x, obj.y, 'dt_bushArea').setDisplaySize(90, 90).setAngle(obj.o).setDepth(5);
        } else if (obj.r === 'pit') {
            scene.add.sprite(obj.x, obj.y, 'dt_pit').setDisplaySize(256, 54).setAngle(obj.o).setDepth(5);
        }
    });

    // 5. PARRILLA DE SALIDA Y SPAWN DE COCHES
    const n0 = track.nodes[0] || { x: 500, y: 500 };
    const n1 = track.nodes[1] || { x: n0.x, y: n0.y - 100 };
    const startAngleRad = Math.atan2(n1.y - n0.y, n1.x - n0.x);
    const startAngleDeg = Phaser.Math.RadToDeg(startAngleRad);

    const dirX = Math.cos(startAngleRad);
    const dirY = Math.sin(startAngleRad);
    const perpX = -Math.sin(startAngleRad);
    const perpY = Math.cos(startAngleRad);

    // Coche del Jugador (Pole Position)
    const pCarData = DUST_CARS[carIdx];
    playerCar = spawnVehicle(scene, n0.x + perpX * 22, n0.y + perpY * 22, pCarData.texture, startAngleDeg, true, pCarData);

    // 5 Rivales con Inteligencia Artificial
    aiCars = [];
    const rivals = DUST_CARS.filter((_, i) => i !== carIdx);
    for (let i = 0; i < 5; i++) {
        const aiData = rivals[i % rivals.length];
        const row = Math.floor((i + 1) / 2);
        const col = (i + 1) % 2 === 1 ? -1 : 1;
        const sx = n0.x - dirX * (row * 65) + perpX * (col * 35);
        const sy = n0.y - dirY * (row * 65) + perpY * (col * 35);

        const ai = spawnVehicle(scene, sx, sy, aiData.texture, startAngleDeg, false, aiData);
        ai.targetNodeIdx = 1;
        ai.aiVelocity = 0;
        aiCars.push(ai);
    }

    // Cámara con seguimiento suave y look-ahead
    scene.cameras.main.startFollow(playerCar, true, 0.08, 0.08);
    scene.cameras.main.setZoom(1.1);

    // Crear Telemetría e Interfaz HUD
    setupHud(scene, track);

    // Secuencia de Semáforo de Salida (3... 2... 1... GO!)
    startCountdown(scene);
}

// Spawnear vehículo con dimensiones 48x25 exactas de Dust Racing 2D
function spawnVehicle(scene, x, y, textureKey, angleDeg, isPlayer, carData) {
    const car = scene.physics.add.sprite(x, y, textureKey);
    car.setDisplaySize(48, 25);
    car.setAngle(angleDeg);
    car.setDepth(10);
    car.setCollideWorldBounds(true);
    car.isPlayer = isPlayer;
    car.carData = carData;
    car.currentLap = 1;
    car.lastCheckpoint = 0;

    // Sombra suave proyectada bajo el coche
    car.shadow = scene.add.ellipse(x + 3, y + 4, 46, 22, 0x000000, 0.45).setDepth(9);

    // Conos de luz de los faros delanteros
    car.headlights = scene.add.graphics().setDepth(7);

    return car;
}

// Semáforo de Salida
function startCountdown(scene) {
    let count = 3;
    const txt = scene.add.text(480, 240, '3', {
        font: '900 85px Arial',
        fill: '#ff1744',
        stroke: '#ffffff',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    dustAudio.playCountdown(false);

    const event = scene.time.addEvent({
        delay: 900,
        repeat: 3,
        callback: () => {
            count--;
            if (count > 0) {
                txt.setText(count.toString());
                txt.setFill(count === 2 ? '#ff9100' : '#ffea00');
                dustAudio.playCountdown(false);
            } else if (count === 0) {
                txt.setText('¡GO!');
                txt.setFill('#00e676');
                dustAudio.playCountdown(true);
                gameState = 'RACE';
                lapStartTime = Date.now();
            } else {
                txt.destroy();
                event.destroy();
            }
        }
    });
}

// Telemetría HUD Glassmorphism
function setupHud(scene, track) {
    const hud = scene.add.container(0, 0).setScrollFactor(0).setDepth(50);

    // Barra superior
    const bar = scene.add.graphics();
    bar.fillStyle(0x0a0c14, 0.88);
    bar.fillRect(0, 0, 960, 48);
    bar.lineStyle(1, 0x00f5d4, 0.7);
    bar.lineBetween(0, 48, 960, 48);
    hud.add(bar);

    hudPosText = scene.add.text(25, 14, 'POS: 1 / 6', { font: '900 18px Arial', fill: '#00f5d4' });
    hud.add(hudPosText);

    hudLapText = scene.add.text(180, 14, `VUELTA: 1 / ${TOTAL_LAPS}`, { font: 'bold 16px Arial', fill: '#fee440' });
    hud.add(hudLapText);

    hudTimeText = scene.add.text(480, 14, 'TIEMPO: 00:00.00', { font: 'bold 16px Arial', fill: '#ffffff' }).setOrigin(0.5, 0);
    hud.add(hudTimeText);

    hudSpeedText = scene.add.text(800, 14, '0 KM/H', { font: '900 18px Arial', fill: '#ff1744' });
    hud.add(hudSpeedText);

    hudSurfaceText = scene.add.text(480, 505, 'SUPERFICIE: ASFALTO (GRIP 100%)', { font: 'bold 12px Arial', fill: '#00f5d4' }).setOrigin(0.5);
    hud.add(hudSurfaceText);

    // Radar Minimapa en esquina inferior derecha
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(51);
}

// ===== UPDATE: MOTOR FÍSICO Y DE JUEGO A 60 FPS =====
function dustUpdate(time, delta) {
    if (!playerCar || gameState === 'MENU') return;

    const dt = delta / 1000;
    const tracks = window.DustracTracks || {};
    const track = tracks[currentTrackId];
    if (!track) return;

    // Cronómetro de vuelta
    if (gameState === 'RACE') {
        const ms = Date.now() - lapStartTime;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const csec = Math.floor((ms % 1000) / 10);
        hudTimeText.setText(`TIEMPO: ${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${csec < 10 ? '0' : ''}${csec}`);
    }

    // Zoom adaptativo dinámico según velocidad (sensación de velocidad cinematográfica)
    if (raceScene && raceScene.cameras && raceScene.cameras.main) {
        const targetZoom = Math.max(0.96, 1.15 - (Math.abs(playerSpeed) / 500) * 0.18);
        raceScene.cameras.main.zoom = Phaser.Math.Linear(raceScene.cameras.main.zoom, targetZoom, 0.04);
    }

    // 1. Físicas y control del jugador
    updatePlayer(dt, track);

    // 2. Físicas de los 5 rivales IA
    if (gameState === 'RACE') {
        aiCars.forEach(ai => updateAiCar(ai, dt, track));
    }

    // 3. Colisiones entre vehículos
    handleCollisions();

    // 4. Luces y sombras de los vehículos
    updateCarVisuals();

    // 5. Radar Minimapa
    renderMinimap(track);

    // 6. Clasificación en vivo
    updateStandings(track);
}

// Actualizar coche del jugador
function updatePlayer(dt, track) {
    const cData = playerCar.carData;
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || keys.space.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    // Detección de superficie bajo el coche
    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = raceScene.tileMap.get(`${ti},${tj}`);

    let grip = 1.0;
    let surfaceLabel = 'ASFALTO (GRIP 100%)';

    if (tile) {
        if (tile.t === 'sand') {
            grip = 0.45;
            surfaceLabel = 'TRAMPA DE ARENA (DECELERACIÓN)';
            dustAudio.playSand();
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059);
        } else if (tile.t.startsWith('sandGrass')) {
            grip = 0.65;
            surfaceLabel = 'TRANSICIÓN ARENA-CÉSPED';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8);
        } else if (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45')) {
            // Comprobar si pisa los pianos de borde
            const distCenter = Math.hypot(playerCar.x - (ti * 256 + 128), playerCar.y - (tj * 256 + 128));
            if (distCenter > 88 && distCenter < 122) {
                surfaceLabel = 'PIANOS DE CARRERA (RUMBLE STRIP)';
                dustAudio.playKerb();
                raceScene.cameras.main.shake(50, 0.002);
            } else {
                surfaceLabel = 'ASFALTO (GRIP 100%)';
            }
        } else {
            grip = 0.60;
            surfaceLabel = 'CÉSPED EXTERIOR (DERIVA)';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c);
        }
    } else {
        grip = 0.55;
        surfaceLabel = 'FUERA DE PISTA';
    }

    hudSurfaceText.setText(`SUPERFICIE: ${surfaceLabel}`);

    // Aceleración y Frenada
    const topSpeed = cData.speed * grip;
    const accelRate = cData.accel * grip;

    if (gameState === 'RACE') {
        if (gas) {
            playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
            if (left || right) {
                dustAudio.playDrift();
                drawSkid(playerCar.x, playerCar.y, playerCar.angle);
            }
        } else if (brake) {
            playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.2 * dt);
            dustAudio.playDrift();
            drawSkid(playerCar.x, playerCar.y, playerCar.angle);
        } else {
            playerSpeed *= 0.982;
        }

        // Giro
        const steer = cData.handling * (playerSpeed > 40 ? 1 : playerSpeed / 40);
        if (left) playerCar.angle -= steer;
        if (right) playerCar.angle += steer;
    } else {
        playerSpeed = 0;
    }

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    playerCar.setVelocity(Math.cos(rad) * playerSpeed, Math.sin(rad) * playerSpeed);

    dustAudio.updateEngine(playerSpeed, cData.speed);

    const kmh = Math.floor(Math.abs(playerSpeed) * 0.65);
    hudSpeedText.setText(`${kmh} KM/H`);

    checkLap(playerCar, track);
}

// Actualizar IA de rivales
function updateAiCar(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[ai.targetNodeIdx];
    const angleRad = Math.atan2(targetNode.y - ai.y, targetNode.x - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);

    const diff = Phaser.Math.Angle.WrapDegrees(targetDeg - ai.angle);
    const step = ai.carData.handling * 0.9;
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), step);

    const maxSpeed = ai.carData.speed * 0.88;
    ai.aiVelocity = Math.min(maxSpeed, (ai.aiVelocity || 0) + ai.carData.accel * 0.75 * dt);

    const rad = Phaser.Math.DegToRad(ai.angle);
    ai.setVelocity(Math.cos(rad) * ai.aiVelocity, Math.sin(rad) * ai.aiVelocity);

    const dist = Math.hypot(ai.x - targetNode.x, ai.y - targetNode.y);
    if (dist < 150) {
        ai.lastCheckpoint = ai.targetNodeIdx;
        ai.targetNodeIdx = (ai.targetNodeIdx + 1) % nodes.length;
        if (ai.targetNodeIdx === 0) ai.currentLap++;
    }
}

// Dibujar marcas permanentes de derrape
function drawSkid(x, y, angleDeg) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const px = Math.cos(rad) * 11;
    const py = Math.sin(rad) * 11;

    skidLayer.fillStyle(0x0a0c0e, 0.4);
    skidLayer.fillCircle(x + px, y + py, 2.5);
    skidLayer.fillCircle(x - px, y - py, 2.5);
}

// Partículas de polvo y derrape
function spawnDust(scene, x, y, textureKey, tintHex) {
    const p = scene.add.sprite(
        x + (Math.random() - 0.5) * 18,
        y + (Math.random() - 0.5) * 18,
        textureKey
    ).setDisplaySize(16, 16).setDepth(8);

    if (tintHex) p.setTint(tintHex);

    scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 1.8,
        duration: 250,
        onComplete: () => p.destroy()
    });
}

// Colisiones entre vehículos
function handleCollisions() {
    aiCars.forEach(ai => {
        const dist = Math.hypot(playerCar.x - ai.x, playerCar.y - ai.y);
        if (dist < 34) {
            dustAudio.playCrash();
            playerSpeed *= 0.82;
            ai.aiVelocity *= 0.82;

            const ang = Math.atan2(playerCar.y - ai.y, playerCar.x - ai.x);
            playerCar.x += Math.cos(ang) * 6;
            playerCar.y += Math.sin(ang) * 6;
            ai.x -= Math.cos(ang) * 6;
            ai.y -= Math.sin(ang) * 6;

            // Chispas de fricción
            spawnDust(raceScene, (playerCar.x + ai.x) / 2, (playerCar.y + ai.y) / 2, 'dt_sparkle', 0xffea00);
        }
    });
}

// Checkpoints y paso de vuelta
function checkLap(car, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[playerNextNodeIdx];
    const dist = Math.hypot(car.x - targetNode.x, car.y - targetNode.y);

    if (dist < 180) {
        car.lastCheckpoint = playerNextNodeIdx;
        playerNextNodeIdx = (playerNextNodeIdx + 1) % nodes.length;

        if (playerNextNodeIdx === 1) {
            dustAudio.playLap();
            playerLap++;

            if (!bestLapTime || (Date.now() - lapStartTime) < bestLapTime) {
                bestLapTime = Date.now() - lapStartTime;
            }

            lapStartTime = Date.now();

            if (playerLap > TOTAL_LAPS) {
                endRace();
            } else {
                hudLapText.setText(`VUELTA: ${playerLap} / ${TOTAL_LAPS}`);
            }
        }
    }
}

// Fin de carrera
function endRace() {
    gameState = 'FINISHED';
    playerSpeed = 0;
    playerCar.setVelocity(0, 0);

    const overlay = raceScene.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, 960, 540);

    raceScene.add.text(480, 200, '🏁 ¡GRAN PREMIO FINALIZADO! 🏁', {
        font: '900 36px Arial', fill: '#00f5d4', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    raceScene.add.text(480, 260, `POSICIÓN: ${hudPosText.text}`, {
        font: 'bold 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const retBtn = raceScene.add.text(480, 340, 'VOLVER AL MENÚ DE CIRCUITOS', {
        font: 'bold 18px Arial', fill: '#fee440', backgroundColor: '#1b202e', padding: { x: 20, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    retBtn.on('pointerdown', () => {
        showMenu(raceScene);
    });
}

// Actualizar sombras y faros de todos los coches
function updateCarVisuals() {
    const all = [playerCar, ...aiCars];
    const isPlayerBraking = keys.down.isDown || keys.s.isDown || touchBrake;

    all.forEach(car => {
        if (!car || !car.active) return;

        if (car.shadow) {
            car.shadow.x = car.x + 3;
            car.shadow.y = car.y + 4;
            car.shadow.angle = car.angle;
        }

        if (car.headlights) {
            car.headlights.clear();
            const rad = Phaser.Math.DegToRad(car.angle);
            const fx = car.x + Math.cos(rad) * 22;
            const fy = car.y + Math.sin(rad) * 22;

            // Haz de luz amplio de faros de xenón
            const cone = 0.35;
            const dist = 115;
            car.headlights.fillStyle(0xfff9c4, 0.11);
            car.headlights.beginPath();
            car.headlights.moveTo(fx, fy);
            car.headlights.lineTo(fx + Math.cos(rad - cone) * dist, fy + Math.sin(rad - cone) * dist);
            car.headlights.lineTo(fx + Math.cos(rad + cone) * dist, fy + Math.sin(rad + cone) * dist);
            car.headlights.closePath();
            car.headlights.fill();

            // Haz central brillante
            car.headlights.fillStyle(0xffffff, 0.16);
            car.headlights.beginPath();
            car.headlights.moveTo(fx, fy);
            car.headlights.lineTo(fx + Math.cos(rad - 0.18) * (dist * 0.7), fy + Math.sin(rad - 0.18) * (dist * 0.7));
            car.headlights.lineTo(fx + Math.cos(rad + 0.18) * (dist * 0.7), fy + Math.sin(rad + 0.18) * (dist * 0.7));
            car.headlights.closePath();
            car.headlights.fill();

            // Luces de freno traseras rojas activas al decelerar
            if (car.isPlayer && isPlayerBraking) {
                const rx = car.x - Math.cos(rad) * 20;
                const ry = car.y - Math.sin(rad) * 20;
                const perp = rad + Math.PI / 2;
                car.headlights.fillStyle(0xff1744, 0.5);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 8);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 8);
            }
        }
    });
}

// Minimapa Radar
function renderMinimap(track) {
    if (!radarGraphics) return;
    radarGraphics.clear();

    const rx = 810, ry = 400, rw = 130, rh = 110;
    radarGraphics.fillStyle(0x0a0d14, 0.88);
    radarGraphics.fillRoundedRect(rx, ry, rw, rh, 6);
    radarGraphics.lineStyle(1, 0x00f5d4, 0.7);
    radarGraphics.strokeRoundedRect(rx, ry, rw, rh, 6);

    const sx = (rw - 16) / track.worldWidth;
    const sy = (rh - 16) / track.worldHeight;

    radarGraphics.lineStyle(2, 0x546e7a, 0.8);
    const nodes = track.nodes;
    if (nodes && nodes.length > 1) {
        radarGraphics.beginPath();
        radarGraphics.moveTo(rx + 8 + nodes[0].x * sx, ry + 8 + nodes[0].y * sy);
        for (let i = 1; i < nodes.length; i++) {
            radarGraphics.lineTo(rx + 8 + nodes[i].x * sx, ry + 8 + nodes[i].y * sy);
        }
        radarGraphics.closePath();
        radarGraphics.strokePath();
    }

    aiCars.forEach(ai => {
        radarGraphics.fillStyle(0xff1744, 1);
        radarGraphics.fillCircle(rx + 8 + ai.x * sx, ry + 8 + ai.y * sy, 2.5);
    });

    radarGraphics.fillStyle(0xfee440, 1);
    radarGraphics.fillCircle(rx + 8 + playerCar.x * sx, ry + 8 + playerCar.y * sy, 4);
}

// Clasificación de carrera
function updateStandings(track) {
    const list = [
        { car: playerCar, isPlayer: true, lap: playerLap, node: playerNextNodeIdx },
        ...aiCars.map(ai => ({ car: ai, isPlayer: false, lap: ai.currentLap, node: ai.targetNodeIdx }))
    ];

    list.sort((a, b) => {
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.node - a.node;
    });

    const rank = list.findIndex(c => c.isPlayer) + 1;
    if (hudPosText) hudPosText.setText(`POS: ${rank} / 6`);
}
