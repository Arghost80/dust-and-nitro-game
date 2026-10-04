// ===== DUST RACING 2D : RUSH RUSH RALLY ARCADE EDITION =====
// Inspirado en Rush Rush Rally Racing (Dreamcast/WiiWare), Neo Drift Out y Micro Machines.
// - Coches compactos de rally arcade (32x17 px) para agilidad y sensación de pista ancha.
// - Cámara panorámica gran angular (zoom 0.72x) que muestra mucho más circuito y anticipa curvas.
// - Flechas arcade dinámicas de aviso de curva (Chevrons >>>) en pista y en HUD.
// - Físicas de rally arcade "pick up and play": derrapes rápidos, contravolante y recuperación fluida.
// - Trazados oficiales 100% continuos y sin cortes.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ============================================================================
// 1. AUDIO PROCEDURAL ARCADE RALLY (WEB AUDIO API)
// ============================================================================
class ArcadeAudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.driftFilter = null;
        this.isReady = false;
        this.currentGear = 1;
        this.gearThresholds = [0.26, 0.52, 0.78, 1.0];
        this.lastThrottle = false;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(65, this.ctx.currentTime);

            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(500, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.engineOsc1.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();

            // Derrape
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(500, this.ctx.currentTime);

            this.driftFilter = this.ctx.createBiquadFilter();
            this.driftFilter.type = 'bandpass';
            this.driftFilter.frequency.setValueAtTime(850, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(this.driftFilter);
            this.driftFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando interacción');
        }
    }

    updateEngine(speed, maxSpeed, isGas, isBrake) {
        if (!this.ctx || !this.engineOsc1) return { gear: 1, rpmRatio: 0 };
        const now = this.ctx.currentTime;
        const speedRatio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        let gear = 1;
        let gearLocalRatio = speedRatio / this.gearThresholds[0];
        for (let g = 0; g < this.gearThresholds.length; g++) {
            if (speedRatio <= this.gearThresholds[g] || g === this.gearThresholds.length - 1) {
                gear = g + 1;
                const prevThresh = g === 0 ? 0 : this.gearThresholds[g - 1];
                gearLocalRatio = (speedRatio - prevThresh) / (this.gearThresholds[g] - prevThresh);
                break;
            }
        }

        if (gear !== this.currentGear && isGas) {
            this.playGearShift();
            this.currentGear = gear;
        }
        if (this.lastThrottle && !isGas && speedRatio > 0.65) {
            this.playTurboPop();
        }
        this.lastThrottle = isGas;

        const baseFreq = 62;
        const rpmFreq = baseFreq + gearLocalRatio * 155;
        this.engineOsc1.frequency.setTargetAtTime(rpmFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(rpmFreq * 1.5, now, 0.04);

        const filterCutoff = isGas ? 700 + speedRatio * 900 : 380;
        this.filter.frequency.setTargetAtTime(filterCutoff, now, 0.05);

        const targetGain = isGas ? 0.055 : 0.03;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.07);

        return { gear, rpmRatio: Math.max(0, Math.min(1, gearLocalRatio)) };
    }

    setDriftIntensity(intensity) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, intensity));
        const now = this.ctx.currentTime;
        this.driftGain.gain.setTargetAtTime(clamped * 0.035, now, 0.04);
        this.driftOsc.frequency.setTargetAtTime(450 + clamped * 260, now, 0.04);
    }

    playGearShift() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.07);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    playTurboPop() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playKerb() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playSand() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playLap() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523, 659, 784, 1046].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.07);
            gain.gain.setValueAtTime(0.08, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.28);
        });
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 920 : 460, now);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.14));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.14));
    }
}
const arcadeAudio = new ArcadeAudioEngine();

// ============================================================================
// 2. CONFIGURACIÓN DEL JUEGO
// ============================================================================
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

// Catálogo de coches de rally compactos estilo Rush Rush Rally Racing
const RALLY_CARS = [
    { id: 'car_red', texture: 'car_red', name: 'RED RALLYE GT', speed: 490, accel: 430, handling: 5.4, color: '#ff2a2a' },
    { id: 'car_blue', texture: 'car_blue', name: 'SUBARU APEX RS', speed: 480, accel: 440, handling: 5.6, color: '#00c3ff' },
    { id: 'car_yellow', texture: 'car_yellow', name: 'NEON SPRINT V6', speed: 510, accel: 450, handling: 5.1, color: '#ffe600' },
    { id: 'car_green', texture: 'car_green', name: 'CELICA TURBO 4WD', speed: 475, accel: 445, handling: 5.8, color: '#00e676' },
    { id: 'car_cyan', texture: 'car_cyan', name: 'COSWORTH RACER', speed: 500, accel: 420, handling: 5.3, color: '#00f5d4' },
    { id: 'car_orange', texture: 'car_orange', name: 'LANCIA DELTA EVO', speed: 495, accel: 435, handling: 5.2, color: '#ff9100' }
];

let currentTrackId = 'monza';
let selectedCarIndex = 0;
let gameState = 'MENU';

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
let lookAheadTarget;

// HUD Estilo Rush Rush Rally
let hudContainer;
let hudPosText, hudLapText, hudTimerText, hudSpeedText, hudGearText, hudTachGfx;
let hudTurnAlert;
let radarGraphics;

// Controles
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// ============================================================================
// 3. PRELOAD
// ============================================================================
function dustPreload() {
    const p = 'assets/dustrac_clean/';

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

    this.load.image('car_red', p + 'carRed.png');
    this.load.image('car_blue', p + 'carBlue.png');
    this.load.image('car_yellow', p + 'carYellow.png');
    this.load.image('car_green', p + 'carGreen.png');
    this.load.image('car_cyan', p + 'carCyan.png');
    this.load.image('car_orange', p + 'carOrange.png');
}

function dustCreate() {
    raceScene = this;

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

function setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); arcadeAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); arcadeAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
}

// ============================================================================
// 4. MENÚ RUSH RUSH RALLY: VIBRANTE Y ARCADE
// ============================================================================
function showMenu(scene) {
    gameState = 'MENU';
    scene.children.removeAll();

    const bg = scene.add.graphics();
    bg.fillStyle(0x0e1320, 1);
    bg.fillRect(0, 0, 960, 540);

    // Patrón cuadriculado estilo arcade Dreamcast
    bg.fillStyle(0x151c30, 0.45);
    for (let x = 0; x < 960; x += 36) {
        for (let y = 0; y < 540; y += 36) {
            if ((x / 36 + y / 36) % 2 === 0) bg.fillRect(x, y, 36, 36);
        }
    }

    // Cabecera tipo arcade de rally
    scene.add.text(480, 36, '🏁 RUSH RUSH RALLY 2D 🏁', {
        font: '900 34px Arial',
        fill: '#ffe600',
        stroke: '#e52521',
        strokeThickness: 6
    }).setOrigin(0.5);

    scene.add.text(480, 70, 'TOP-DOWN ARCADE RACER • COCHES COMPACTOS • CÁMARA PANORÁMICA', {
        font: 'bold 12px Arial',
        fill: '#00f5d4'
    }).setOrigin(0.5);

    // CIRCUITOS
    const tracksList = [
        { id: 'monza', name: 'MONZA GP', flag: '🇮🇹', diff: 'RÁPIDO', laps: 3 },
        { id: 'suzuka', name: 'SUZUKA CIRCUIT', flag: '🇯🇵', diff: 'TÉCNICO', laps: 3 },
        { id: 'twineburg', name: 'TWINEBURG', flag: '🇩🇪', diff: 'EQUILIBRADO', laps: 3 },
        { id: 'crossroads', name: 'CROSSROADS', flag: '🇺🇸', diff: 'EXTREMO', laps: 3 },
        { id: 'western_valley', name: 'WESTERN VALLEY', flag: '🇬🇧', diff: 'CURVAS LARGAS', laps: 3 },
        { id: 'triangle', name: 'TRIANGLE RING', flag: '🇪🇸', diff: 'OVALO VELOZ', laps: 3 }
    ];

    scene.add.text(60, 105, 'SELECCIONA ETAPA DE RALLY:', { font: '900 13px Arial', fill: '#ffffff' });

    tracksList.forEach((t, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx = 60 + col * 285;
        const by = 132 + row * 78;
        const isSelected = currentTrackId === t.id;

        const card = scene.add.graphics();
        card.fillStyle(isSelected ? 0x1f3d2e : 0x141b2a, 0.95);
        card.fillRoundedRect(bx, by, 270, 66, 8);
        card.lineStyle(2, isSelected ? 0x00f5d4 : 0x27344d, 1);
        card.strokeRoundedRect(bx, by, 270, 66, 8);

        scene.add.text(bx + 16, by + 13, `${t.flag} ${t.name}`, {
            font: 'bold 15px Arial',
            fill: isSelected ? '#00f5d4' : '#ffffff'
        });

        scene.add.text(bx + 16, by + 37, `RALLY: ${t.diff} • ${t.laps} VUELTAS`, {
            font: '11px Arial',
            fill: isSelected ? '#a7f3d0' : '#8898b5'
        });

        const hit = scene.add.rectangle(bx + 135, by + 33, 270, 66).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            arcadeAudio.init();
            currentTrackId = t.id;
            showMenu(scene);
        });
    });

    // SELECCIÓN DE COCHES COMPACTOS RALLY (32x17 px)
    scene.add.text(60, 312, 'SELECCIONA COCHE DE RALLY (ESCALA COMPACTA):', { font: '900 13px Arial', fill: '#ffffff' });

    RALLY_CARS.forEach((car, idx) => {
        const cx = 135 + idx * 140;
        const cy = 392;
        const isSel = selectedCarIndex === idx;

        const cBox = scene.add.graphics();
        cBox.fillStyle(isSel ? 0x224230 : 0x141b2a, 0.95);
        cBox.fillRoundedRect(cx - 62, cy - 50, 124, 100, 8);
        cBox.lineStyle(2, isSel ? 0x00e676 : 0x2a374f, 1);
        cBox.strokeRoundedRect(cx - 62, cy - 50, 124, 100, 8);

        // Coche escala compacta 32x17
        scene.add.ellipse(cx + 3, cy - 18, 34, 18, 0x000000, 0.45);
        scene.add.sprite(cx, cy - 20, car.texture).setDisplaySize(32, 17).setAngle(-90);

        scene.add.text(cx, cy + 8, car.name.split(' ')[0], {
            font: 'bold 11px Arial',
            fill: isSel ? '#ffffff' : '#90a4ae'
        }).setOrigin(0.5);

        // Barras
        const vRatio = (car.speed - 450) / 70;
        const hRatio = (car.handling - 4.8) / 1.1;

        cBox.fillStyle(0x374151, 1);
        cBox.fillRect(cx - 45, cy + 22, 90, 4);
        cBox.fillRect(cx - 45, cy + 32, 90, 4);

        cBox.fillStyle(0xff1744, 1);
        cBox.fillRect(cx - 45, cy + 22, 90 * vRatio, 4);
        cBox.fillStyle(0x00f5d4, 1);
        cBox.fillRect(cx - 45, cy + 32, 90 * hRatio, 4);

        const hit = scene.add.rectangle(cx, cy, 124, 100).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            arcadeAudio.init();
            selectedCarIndex = idx;
            showMenu(scene);
        });
    });

    // BOTÓN PLAY
    const startBox = scene.add.graphics();
    startBox.fillStyle(0x00c853, 1);
    startBox.fillRoundedRect(340, 478, 280, 46, 8);
    startBox.lineStyle(2, 0xffffff, 0.9);
    startBox.strokeRoundedRect(340, 478, 280, 46, 8);

    const startBtn = scene.add.text(480, 501, '¡INICIAR RALLY! ▶', {
        font: '900 18px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        arcadeAudio.init();
        startRace(scene, currentTrackId, selectedCarIndex);
    });
}

// ============================================================================
// 5. CONSTRUCCIÓN DE LA PISTA Y FLECHAS ARCADE (CHEVRONS >>>)
// ============================================================================
function startRace(scene, trackId, carIdx) {
    scene.children.removeAll();

    const tracks = window.DustracTracks || {};
    const track = tracks[trackId];
    if (!track) return;

    gameState = 'COUNTDOWN';
    scene.physics.world.setBounds(0, 0, track.worldWidth, track.worldHeight);
    scene.cameras.main.setBounds(0, 0, track.worldWidth, track.worldHeight);

    // 1. TERRENO BASE: Césped Oficial
    scene.add.tileSprite(
        track.worldWidth / 2,
        track.worldHeight / 2,
        track.worldWidth,
        track.worldHeight,
        'dt_grass'
    ).setDepth(0);

    scene.tileMap = new Map();

    // 2. TILES OFICIALES (Continuos)
    track.tiles.forEach(tile => {
        const tx = tile.i * 256 + 128;
        const ty = tile.j * 256 + 128;
        scene.tileMap.set(`${tile.i},${tile.j}`, tile);

        if (tile.t === 'sand') {
            scene.add.sprite(tx, ty, 'dt_sand').setDisplaySize(256, 256).setDepth(1);
        } else if (tile.t === 'sandGrassStraight') {
            scene.add.sprite(tx, ty, 'dt_sandGrassStraight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner2') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner2').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        }

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
            const bridge = scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(20);
            bridge.setTint(0x90caf9);
        }
    });

    // 3. SEÑALES ARCADE DE CURVA (CHEVRONS >>>) ESTILO RUSH RUSH RALLY
    spawnArcadeChevrons(scene, track);

    // 4. MARCAS DE GOMA COMPACTAS
    skidLayer = scene.add.graphics().setDepth(4);

    // 5. OBJETOS DEL ENTORNO
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            scene.add.ellipse(obj.x + 8, obj.y + 10, 48, 38, 0x000000, 0.35).setDepth(13);
            const tree = scene.add.sprite(obj.x, obj.y, 'dt_tree').setDisplaySize(54, 54).setDepth(14);
            scene.tweens.add({
                targets: tree,
                angle: (Math.random() - 0.5) * 3,
                duration: 2600 + Math.random() * 1000,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        } else if (obj.r === 'grandstand') {
            scene.add.rectangle(obj.x + 10, obj.y + 12, 135, 135, 0x000000, 0.35).setAngle(obj.o).setDepth(11);
            scene.add.sprite(obj.x, obj.y, 'dt_grandstand').setDisplaySize(135, 135).setAngle(obj.o).setDepth(12);
        } else if (obj.r === 'tire') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 16, 16, 0x000000, 0.4).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(16, 16).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 18, 15, 0x000000, 0.35).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(18, 18).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'bushArea') {
            scene.add.sprite(obj.x, obj.y, 'dt_bushArea').setDisplaySize(88, 88).setAngle(obj.o).setDepth(5);
        } else if (obj.r === 'pit') {
            scene.add.sprite(obj.x, obj.y, 'dt_pit').setDisplaySize(256, 54).setAngle(obj.o).setDepth(5);
        }
    });

    // 6. SPAWN DE COCHES COMPACTOS (32x17 px)
    const n0 = track.nodes[0] || { x: 500, y: 500 };
    const n1 = track.nodes[1] || { x: n0.x, y: n0.y - 100 };
    const startAngleRad = Math.atan2(n1.y - n0.y, n1.x - n0.x);
    const startAngleDeg = Phaser.Math.RadToDeg(startAngleRad);

    const dirX = Math.cos(startAngleRad);
    const dirY = Math.sin(startAngleRad);
    const perpX = -Math.sin(startAngleRad);
    const perpY = Math.cos(startAngleRad);

    // Coche Jugador
    const pCarData = RALLY_CARS[carIdx];
    playerCar = spawnVehicle(scene, n0.x + perpX * 20, n0.y + perpY * 20, pCarData.texture, startAngleDeg, true, pCarData);

    // 5 Rivales IA
    aiCars = [];
    const rivals = RALLY_CARS.filter((_, i) => i !== carIdx);
    for (let i = 0; i < 5; i++) {
        const aiData = rivals[i % rivals.length];
        const row = Math.floor((i + 1) / 2);
        const col = (i + 1) % 2 === 1 ? -1 : 1;
        const sx = n0.x - dirX * (row * 50) + perpX * (col * 30);
        const sy = n0.y - dirY * (row * 50) + perpY * (col * 30);

        const ai = spawnVehicle(scene, sx, sy, aiData.texture, startAngleDeg, false, aiData);
        ai.targetNodeIdx = 1;
        ai.aiVelocity = 0;
        aiCars.push(ai);
    }

    // 7. CÁMARA PANORÁMICA GRAN ANGULAR (Zoom 0.72x)
    lookAheadTarget = scene.add.circle(playerCar.x, playerCar.y, 4, 0x000000, 0).setDepth(0);
    scene.cameras.main.startFollow(lookAheadTarget, true, 0.09, 0.09);
    scene.cameras.main.setZoom(0.72); // Pista mucho más ancha y panorámica

    // 8. HUD ARCADE RALLY
    setupArcadeHud(scene, track);

    // Semáforo
    startCountdown(scene);
}

// Colocar señales de flecha en pista (Chevrons)
function spawnArcadeChevrons(scene, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length < 3) return;

    for (let i = 0; i < nodes.length; i++) {
        const prev = nodes[(i - 1 + nodes.length) % nodes.length];
        const curr = nodes[i];
        const next = nodes[(i + 1) % nodes.length];

        const inAng = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const outAng = Math.atan2(next.y - curr.y, next.x - curr.x);
        let turnDiff = Phaser.Math.Angle.Wrap(outAng - inAng);

        // Si es curva cerrada (> 35 grados)
        if (Math.abs(turnDiff) > 0.6) {
            const midAng = inAng + turnDiff * 0.5;
            const perpDist = 110;
            const signX = curr.x + Math.sin(midAng) * (turnDiff > 0 ? -perpDist : perpDist);
            const signY = curr.y - Math.cos(midAng) * (turnDiff > 0 ? -perpDist : perpDist);

            const arrowText = turnDiff > 0 ? '▶▶▶' : '◀◀◀';
            const chevron = scene.add.text(signX, signY, arrowText, {
                font: '900 20px Arial',
                fill: '#ffe600',
                stroke: '#e52521',
                strokeThickness: 5
            }).setOrigin(0.5).setRotation(outAng).setDepth(5);

            scene.tweens.add({
                targets: chevron,
                alpha: 0.45,
                duration: 400,
                yoyo: true, repeat: -1
            });
        }
    }
}

// Spawnear coche de rally compacto (32x17 px)
function spawnVehicle(scene, x, y, textureKey, angleDeg, isPlayer, carData) {
    const car = scene.physics.add.sprite(x, y, textureKey);
    car.setDisplaySize(32, 17); // Tamaño compacto arcade
    car.setAngle(angleDeg);
    car.setDepth(10);
    car.setCollideWorldBounds(true);
    car.isPlayer = isPlayer;
    car.carData = carData;
    car.currentLap = 1;
    car.lastCheckpoint = 0;
    car.driftAmount = 0;

    // Sombra compacta centrada
    car.shadow = scene.add.ellipse(x + 4, y + 5, 34, 17, 0x000000, 0.45).setDepth(9);

    // Faros delanteros y luces de freno estilizadas
    car.lights = scene.add.graphics().setDepth(8);

    return car;
}

// Semáforo Arcade
function startCountdown(scene) {
    let count = 3;
    const txt = scene.add.text(480, 240, '3', {
        font: '900 85px Arial',
        fill: '#ff1744',
        stroke: '#ffffff',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    arcadeAudio.playCountdown(false);

    const event = scene.time.addEvent({
        delay: 900, repeat: 3,
        callback: () => {
            count--;
            if (count > 0) {
                txt.setText(count.toString());
                txt.setFill(count === 2 ? '#ff9100' : '#ffea00');
                arcadeAudio.playCountdown(false);
            } else if (count === 0) {
                txt.setText('¡GO!');
                txt.setFill('#00e676');
                arcadeAudio.playCountdown(true);
                gameState = 'RACE';
                lapStartTime = Date.now();
            } else {
                txt.destroy();
                event.destroy();
            }
        }
    });
}

// ============================================================================
// 6. HUD RUSH RUSH RALLY (ESTILO CONSOLA ARCADE)
// ============================================================================
function setupArcadeHud(scene, track) {
    hudContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Barra superior arcade
    const bar = scene.add.graphics();
    bar.fillStyle(0x0c111e, 0.88);
    bar.fillRect(0, 0, 960, 48);
    bar.lineStyle(2, 0xffe600, 0.9);
    bar.lineBetween(0, 48, 960, 48);
    hudContainer.add(bar);

    // Insignia de Posición Grande (1ST, 2ND, etc.)
    hudPosText = scene.add.text(25, 12, '1ST', {
        font: '900 24px Arial', fill: '#ffe600', stroke: '#000000', strokeThickness: 4
    });
    hudContainer.add(hudPosText);

    const totalText = scene.add.text(78, 18, '/ 6', {
        font: 'bold 15px Arial', fill: '#90a4ae'
    });
    hudContainer.add(totalText);

    // Vuelta
    hudLapText = scene.add.text(150, 16, `LAP 1/${TOTAL_LAPS}`, {
        font: '900 16px Arial', fill: '#ffffff'
    });
    hudContainer.add(hudLapText);

    // Cronómetro
    hudTimerText = scene.add.text(480, 14, '00:00.00', {
        font: '900 22px Arial', fill: '#00f5d4'
    }).setOrigin(0.5, 0);
    hudContainer.add(hudTimerText);

    // Velocímetro y Marcha
    hudSpeedText = scene.add.text(820, 12, '0 KM/H', {
        font: '900 22px Arial', fill: '#ff1744'
    }).setOrigin(1, 0);
    hudContainer.add(hudSpeedText);

    hudGearText = scene.add.text(880, 14, 'G1', {
        font: '900 20px Arial', fill: '#ffe600'
    });
    hudContainer.add(hudGearText);

    // Tacómetro LED
    hudTachGfx = scene.add.graphics();
    hudContainer.add(hudTachGfx);

    // Aviso de curva en pantalla (Flashing Turn Chevron)
    hudTurnAlert = scene.add.text(480, 110, '', {
        font: '900 36px Arial', fill: '#ffe600', stroke: '#e52521', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(110);

    // Radar Minimapa
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(101);
}

// ============================================================================
// 7. BUCLE UPDATE: FÍSICAS RALLY Y CÁMARA PANORÁMICA
// ============================================================================
function dustUpdate(time, delta) {
    if (!playerCar || gameState === 'MENU') return;

    const dt = delta / 1000;
    const tracks = window.DustracTracks || {};
    const track = tracks[currentTrackId];
    if (!track) return;

    // Cronómetro
    if (gameState === 'RACE') {
        const ms = Date.now() - lapStartTime;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const csec = Math.floor((ms % 1000) / 10);
        hudTimerText.setText(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${csec < 10 ? '0' : ''}${csec}`);
    }

    // 1. Control del Jugador (Físicas Rally Arcade)
    updatePlayerRally(dt, track);

    // 2. IA Rivales
    if (gameState === 'RACE') {
        aiCars.forEach(ai => updateAiRally(ai, dt, track));
    }

    // 3. Colisiones
    handleCollisions();

    // 4. Cámara Panorámica Gran Angular (Zoom 0.72x)
    updatePanoramicCamera();

    // 5. Luces y Sombras Compactas
    updateCarLightsAndShadows();

    // 6. Alerta de Curva Próxima en HUD
    updateTurnAlert(track);

    // 7. Minimapa
    renderMinimap(track);

    // 8. Posiciones
    updateStandings(track);
}

// Físicas ágiles de rally arcade
function updatePlayerRally(dt, track) {
    const cData = playerCar.carData;
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || keys.space.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = raceScene.tileMap.get(`${ti},${tj}`);

    let grip = 1.0;
    if (tile) {
        if (tile.t === 'sand') {
            grip = 0.48;
            arcadeAudio.playSand();
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059, 12);
        } else if (tile.t.startsWith('sandGrass')) {
            grip = 0.68;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8, 10);
        } else if (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45')) {
            const distCenter = Math.hypot(playerCar.x - (ti * 256 + 128), playerCar.y - (tj * 256 + 128));
            if (distCenter > 88 && distCenter < 122) {
                arcadeAudio.playKerb();
                raceScene.cameras.main.shake(30, 0.0015);
            }
        } else {
            grip = 0.62;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c, 9);
        }
    } else {
        grip = 0.58;
    }

    const topSpeed = cData.speed * grip;
    const accelRate = cData.accel * grip;

    if (gameState === 'RACE') {
        if (gas) {
            playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
        } else if (brake) {
            playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.5 * dt);
        } else {
            playerSpeed *= 0.985;
        }

        // Giro ágil de rally arcade
        const steerSpeedFactor = playerSpeed > 25 ? 1 : Math.max(0.15, playerSpeed / 25);
        const steer = cData.handling * steerSpeedFactor;

        if (left) playerCar.angle -= steer;
        if (right) playerCar.angle += steer;

        // Derrape arcade con contravolante
        const isTurning = (left || right) && Math.abs(playerSpeed) > 110;
        if (isTurning || (brake && Math.abs(playerSpeed) > 75)) {
            playerCar.driftAmount = Math.min(1, playerCar.driftAmount + dt * 4.5);
            arcadeAudio.setDriftIntensity(playerCar.driftAmount);
            drawCompactSkidMarks(playerCar.x, playerCar.y, playerCar.angle, playerCar.driftAmount);
            spawnTireSmoke(playerCar.x, playerCar.y, playerCar.angle);
        } else {
            playerCar.driftAmount = Math.max(0, playerCar.driftAmount - dt * 5.0);
            arcadeAudio.setDriftIntensity(playerCar.driftAmount);
        }
    } else {
        playerSpeed = 0;
        playerCar.driftAmount = 0;
        arcadeAudio.setDriftIntensity(0);
    }

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    playerCar.setVelocity(Math.cos(rad) * playerSpeed, Math.sin(rad) * playerSpeed);

    // Audio y Tacómetro
    const engineData = arcadeAudio.updateEngine(playerSpeed, cData.speed, gas, brake);
    updateTachometer(engineData);

    const kmh = Math.floor(Math.abs(playerSpeed) * 0.65);
    hudSpeedText.setText(`${kmh} KM/H`);

    checkLap(playerCar, track);
}

function updateTachometer(engineData) {
    if (!hudTachGfx || !engineData) return;
    hudTachGfx.clear();

    const gear = engineData.gear || 1;
    const rpm = engineData.rpmRatio || 0;
    hudGearText.setText(`G${gear}`);

    const bx = 680, by = 35, bw = 110, bh = 7;
    hudTachGfx.fillStyle(0x1a2130, 0.9);
    hudTachGfx.fillRect(bx, by, bw, bh);

    const numLeds = 10;
    const activeLeds = Math.floor(rpm * numLeds);
    const ledW = bw / numLeds - 2;

    for (let i = 0; i < numLeds; i++) {
        const lx = bx + i * (ledW + 2);
        if (i < activeLeds) {
            let color = 0x00e676;
            if (i >= 6 && i < 8) color = 0xfee440;
            if (i >= 8) color = 0xff1744;
            hudTachGfx.fillStyle(color, 1);
            hudTachGfx.fillRect(lx, by, ledW, bh);
        }
    }
}

// Cámara Panorámica Gran Angular (Zoom 0.72x)
function updatePanoramicCamera() {
    if (!raceScene || !raceScene.cameras || !raceScene.cameras.main || !playerCar || !lookAheadTarget) return;

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    const lookDist = (playerSpeed / 500) * 110;
    lookAheadTarget.x = playerCar.x + Math.cos(rad) * lookDist;
    lookAheadTarget.y = playerCar.y + Math.sin(rad) * lookDist;

    // Zoom amplio constante alrededor de 0.72x
    const targetZoom = Math.max(0.66, 0.74 - (Math.abs(playerSpeed) / 500) * 0.08);
    raceScene.cameras.main.zoom = Phaser.Math.Linear(raceScene.cameras.main.zoom, targetZoom, 0.05);
}

// Marcas de derrape compactas
function drawCompactSkidMarks(x, y, angleDeg, intensity) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const spread = 7; // Proporcional a los 17 px de ancho del coche
    const lx = Math.cos(rad) * spread;
    const ly = Math.sin(rad) * spread;

    const alpha = Math.min(0.42, 0.12 + intensity * 0.3);
    skidLayer.fillStyle(0x0a0c10, alpha);
    skidLayer.fillCircle(x + lx, y + ly, 2.0);
    skidLayer.fillCircle(x - lx, y - ly, 2.0);
}

function spawnTireSmoke(x, y, angleDeg) {
    if (!raceScene) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 180);
    const sx = x + Math.cos(rad) * 12 + (Math.random() - 0.5) * 6;
    const sy = y + Math.sin(rad) * 12 + (Math.random() - 0.5) * 6;

    const puff = raceScene.add.circle(sx, sy, 5, 0xecf0f1, 0.35).setDepth(6);
    raceScene.tweens.add({
        targets: puff,
        radius: 14, alpha: 0,
        x: sx + (Math.random() - 0.5) * 10,
        y: sy + (Math.random() - 0.5) * 10,
        duration: 280, ease: 'Quad.easeOut',
        onComplete: () => puff.destroy()
    });
}

// Luces y Sombras Proporcionales
function updateCarLightsAndShadows() {
    const all = [playerCar, ...aiCars];
    const isPlayerBraking = keys.down.isDown || keys.s.isDown || touchBrake;

    all.forEach(car => {
        if (!car || !car.active) return;

        if (car.shadow) {
            car.shadow.x = car.x + 4;
            car.shadow.y = car.y + 5;
            car.shadow.angle = car.angle;
        }

        if (car.lights) {
            car.lights.clear();
            const rad = Phaser.Math.DegToRad(car.angle);

            // Faros delanteros compactos
            const fx = car.x + Math.cos(rad) * 15;
            const fy = car.y + Math.sin(rad) * 15;
            const cone = 0.32;
            const dist = 95;

            car.lights.fillStyle(0xfffde7, 0.12);
            car.lights.beginPath();
            car.lights.moveTo(fx, fy);
            car.lights.lineTo(fx + Math.cos(rad - cone) * dist, fy + Math.sin(rad - cone) * dist);
            car.lights.lineTo(fx + Math.cos(rad + cone) * dist, fy + Math.sin(rad + cone) * dist);
            car.lights.closePath();
            car.lights.fill();

            // Luces de freno rojas
            const isBraking = car.isPlayer ? isPlayerBraking : (car.aiBraking || false);
            const rx = car.x - Math.cos(rad) * 14;
            const ry = car.y - Math.sin(rad) * 14;
            const perp = rad + Math.PI / 2;

            if (isBraking) {
                car.lights.fillStyle(0xff1744, 0.7);
                car.lights.fillCircle(rx + Math.cos(perp) * 6, ry + Math.sin(perp) * 6, 6);
                car.lights.fillCircle(rx - Math.cos(perp) * 6, ry - Math.sin(perp) * 6, 6);
            }
        }
    });
}

// Aviso de Curva en HUD
function updateTurnAlert(track) {
    if (!hudTurnAlert) return;
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const nextNode = nodes[playerNextNodeIdx];
    const afterNode = nodes[(playerNextNodeIdx + 1) % nodes.length];

    const inAng = Math.atan2(nextNode.y - playerCar.y, nextNode.x - playerCar.x);
    const outAng = Math.atan2(afterNode.y - nextNode.y, afterNode.x - nextNode.x);
    const diff = Phaser.Math.Angle.Wrap(outAng - inAng);

    const distToNode = Math.hypot(playerCar.x - nextNode.x, playerCar.y - nextNode.y);

    if (distToNode < 260 && Math.abs(diff) > 0.65 && playerSpeed > 150) {
        hudTurnAlert.setText(diff > 0 ? '▶▶ TURN RIGHT ▶▶' : '◀◀ TURN LEFT ◀◀');
        hudTurnAlert.setFill(Math.abs(diff) > 1.2 ? '#ff1744' : '#ffe600');
    } else {
        hudTurnAlert.setText('');
    }
}

// IA de Rivales
function updateAiRally(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[ai.targetNodeIdx];
    const angleRad = Math.atan2(targetNode.y - ai.y, targetNode.x - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);

    const diff = Phaser.Math.Angle.WrapDegrees(targetDeg - ai.angle);
    const step = ai.carData.handling * 1.0;
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), step);

    if (Math.abs(diff) > 42) {
        ai.aiBraking = true;
        ai.aiVelocity = Math.max(ai.carData.speed * 0.5, (ai.aiVelocity || 0) - ai.carData.accel * 1.4 * dt);
    } else {
        ai.aiBraking = false;
        const maxSpeed = ai.carData.speed * 0.92;
        ai.aiVelocity = Math.min(maxSpeed, (ai.aiVelocity || 0) + ai.carData.accel * 0.85 * dt);
    }

    const rad = Phaser.Math.DegToRad(ai.angle);
    ai.setVelocity(Math.cos(rad) * ai.aiVelocity, Math.sin(rad) * ai.aiVelocity);

    const dist = Math.hypot(ai.x - targetNode.x, ai.y - targetNode.y);
    if (dist < 155) {
        ai.lastCheckpoint = ai.targetNodeIdx;
        ai.targetNodeIdx = (ai.targetNodeIdx + 1) % nodes.length;
        if (ai.targetNodeIdx === 0) ai.currentLap++;
    }
}

// Colisiones
function handleCollisions() {
    aiCars.forEach(ai => {
        const dist = Math.hypot(playerCar.x - ai.x, playerCar.y - ai.y);
        if (dist < 26) {
            arcadeAudio.playCrash();
            playerSpeed *= 0.84;
            ai.aiVelocity *= 0.84;

            const ang = Math.atan2(playerCar.y - ai.y, playerCar.x - ai.x);
            playerCar.x += Math.cos(ang) * 5;
            playerCar.y += Math.sin(ang) * 5;
            ai.x -= Math.cos(ang) * 5;
            ai.y -= Math.sin(ang) * 5;

            spawnDust(raceScene, (playerCar.x + ai.x) / 2, (playerCar.y + ai.y) / 2, 'dt_sparkle', 0xffea00, 18);
            raceScene.cameras.main.shake(50, 0.004);
        }
    });
}

function spawnDust(scene, x, y, textureKey, tintHex, size = 12) {
    const p = scene.add.sprite(
        x + (Math.random() - 0.5) * 14,
        y + (Math.random() - 0.5) * 14,
        textureKey
    ).setDisplaySize(size, size).setDepth(8);

    if (tintHex) p.setTint(tintHex);

    scene.tweens.add({
        targets: p, alpha: 0, scale: 1.8,
        duration: 240, onComplete: () => p.destroy()
    });
}

// Checkpoints
function checkLap(car, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[playerNextNodeIdx];
    const dist = Math.hypot(car.x - targetNode.x, car.y - targetNode.y);

    if (dist < 185) {
        car.lastCheckpoint = playerNextNodeIdx;
        playerNextNodeIdx = (playerNextNodeIdx + 1) % nodes.length;

        if (playerNextNodeIdx === 1) {
            arcadeAudio.playLap();
            playerLap++;

            const lapDuration = Date.now() - lapStartTime;
            if (!bestLapTime || lapDuration < bestLapTime) {
                bestLapTime = lapDuration;
            }

            lapStartTime = Date.now();

            if (playerLap > TOTAL_LAPS) {
                endRace();
            } else {
                hudLapText.setText(`LAP ${playerLap}/${TOTAL_LAPS}`);
            }
        }
    }
}

// Fin de Carrera
function endRace() {
    gameState = 'FINISHED';
    playerSpeed = 0;
    playerCar.setVelocity(0, 0);

    const overlay = raceScene.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x0a0f1d, 0.88);
    overlay.fillRect(0, 0, 960, 540);

    raceScene.add.text(480, 190, '🏆 RALLY FINISHED! 🏆', {
        font: '900 36px Arial', fill: '#ffe600', stroke: '#e52521', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    raceScene.add.text(480, 255, `FINAL POSITION: ${hudPosText.text} OF 6`, {
        font: 'bold 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const retBtn = raceScene.add.text(480, 345, 'VOLVER AL MENÚ DE ETAPAS', {
        font: 'bold 18px Arial', fill: '#00f5d4', backgroundColor: '#141c2c', padding: { x: 24, y: 14 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    retBtn.on('pointerdown', () => {
        showMenu(raceScene);
    });
}

// Minimapa
function renderMinimap(track) {
    if (!radarGraphics) return;
    radarGraphics.clear();

    const rx = 805, ry = 395, rw = 135, rh = 115;
    radarGraphics.fillStyle(0x0a101e, 0.88);
    radarGraphics.fillRoundedRect(rx, ry, rw, rh, 8);
    radarGraphics.lineStyle(1.5, 0xffe600, 0.8);
    radarGraphics.strokeRoundedRect(rx, ry, rw, rh, 8);

    const sx = (rw - 20) / track.worldWidth;
    const sy = (rh - 20) / track.worldHeight;

    radarGraphics.lineStyle(2.5, 0x273b57, 0.9);
    const nodes = track.nodes;
    if (nodes && nodes.length > 1) {
        radarGraphics.beginPath();
        radarGraphics.moveTo(rx + 10 + nodes[0].x * sx, ry + 10 + nodes[0].y * sy);
        for (let i = 1; i < nodes.length; i++) {
            radarGraphics.lineTo(rx + 10 + nodes[i].x * sx, ry + 10 + nodes[i].y * sy);
        }
        radarGraphics.closePath();
        radarGraphics.strokePath();
    }

    aiCars.forEach(ai => {
        radarGraphics.fillStyle(0xff1744, 1);
        radarGraphics.fillCircle(rx + 10 + ai.x * sx, ry + 10 + ai.y * sy, 2.5);
    });

    radarGraphics.fillStyle(0x00f5d4, 0.4);
    radarGraphics.fillCircle(rx + 10 + playerCar.x * sx, ry + 10 + playerCar.y * sy, 6);
    radarGraphics.fillStyle(0x00f5d4, 1);
    radarGraphics.fillCircle(rx + 10 + playerCar.x * sx, ry + 10 + playerCar.y * sy, 3.5);
}

// Clasificación
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
    const suffixes = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
    if (hudPosText) hudPosText.setText(suffixes[rank - 1] || `${rank}TH`);
}
