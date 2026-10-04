// ===== DUST RACING 2D: NEXT-GEN PRO MOTORSPORT EDITION =====
// Basado en el motor original oficial de Dust Racing 2D (Dustrac) para Telegram Mini App.
// Salto generacional de 30 años: iluminación 2.5D, sombras solares dinámicas, faros xenón dobles,
// luces de freno LED reactivas, humo volumétrico y marcas de derrape gemelas, cámara predictiva
// con look-ahead y zoom reactivo por velocidad, audio de 4 marchas con turbo blow-off,
// tacómetro LED digital, telemetría F1 y minimapa neón de alta visibilidad.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ============================================================================
// 1. SISTEMA DE AUDIO DE ALTA FIDELIDAD: MULTI-OSCILADOR, 4 MARCHAS Y EFECTOS
// ============================================================================
class ModernAudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.subOsc = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.driftFilter = null;
        this.isReady = false;
        this.currentGear = 1;
        this.gearThresholds = [0.28, 0.55, 0.80, 1.0];
        this.lastThrottle = false;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Oscilador 1: Tono de combustión principal (Sawtooth)
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);

            // Oscilador 2: Armónicos de cilindros (Triangle + 1 octava)
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);

            // Oscilador Sub-Bass: Potencia de bajos profundos
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(30, this.ctx.currentTime);

            // Filtro de paso bajo dinámico para simular escape cerrado/abierto
            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.engineOsc1.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();
            this.subOsc.start();

            // Canal continuo para derrape de neumáticos
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(480, this.ctx.currentTime);

            this.driftFilter = this.ctx.createBiquadFilter();
            this.driftFilter.type = 'bandpass';
            this.driftFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
            this.driftFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(this.driftFilter);
            this.driftFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando interacción del usuario');
        }
    }

    updateEngine(speed, maxSpeed, isGas, isBrake) {
        if (!this.ctx || !this.engineOsc1) return { gear: 1, rpmRatio: 0 };
        const now = this.ctx.currentTime;
        const speedRatio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        // Determinación de Marcha Simulada (1ª a 4ª)
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

        // Detección de cambio de marcha para sonido de escape
        if (gear !== this.currentGear && isGas) {
            this.playGearShift();
            this.currentGear = gear;
        }

        // Turbo Blow-Off: Al soltar acelerador tras altas RPM
        if (this.lastThrottle && !isGas && speedRatio > 0.65) {
            this.playTurboBlowoff();
        }
        this.lastThrottle = isGas;

        // Frecuencia de RPM dinámica
        const baseFreq = 55;
        const rpmFreq = baseFreq + gearLocalRatio * 140;
        this.engineOsc1.frequency.setTargetAtTime(rpmFreq, now, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(rpmFreq * 1.5, now, 0.05);
        this.subOsc.frequency.setTargetAtTime(rpmFreq * 0.5, now, 0.05);

        // Modulación de filtro y ganancia según carga del motor
        const filterCutoff = isGas ? 650 + speedRatio * 800 : 350;
        this.filter.frequency.setTargetAtTime(filterCutoff, now, 0.06);

        const targetGain = isGas ? 0.06 : 0.032;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);

        return { gear, rpmRatio: Math.max(0, Math.min(1, gearLocalRatio)) };
    }

    setDriftIntensity(intensity) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, intensity));
        const now = this.ctx.currentTime;
        const targetVol = clamped * 0.04;
        const targetFreq = 420 + clamped * 280;
        this.driftGain.gain.setTargetAtTime(targetVol, now, 0.04);
        this.driftOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
    }

    playGearShift() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playTurboBlowoff() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.18);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    playKerb() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.setValueAtTime(155, now + 0.03);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
    }

    playSand() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        gain.gain.setValueAtTime(0.03, now);
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
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playLap() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1046];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.08, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.3);
        });
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.38 : 0.15));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.38 : 0.15));
    }
}
const modernAudio = new ModernAudioEngine();

// ============================================================================
// 2. CONFIGURACIÓN DEL MOTOR DE JUEGO (PHASER 3 HIGH FPS)
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

// Fichas técnicas avanzadas de vehículos
const DUST_CARS = [
    { id: 'car_red', texture: 'car_red', name: 'RED PHANTOM GT', speed: 475, accel: 395, handling: 4.9, color: '#ff1744' },
    { id: 'car_blue', texture: 'car_blue', name: 'GULF APEX RS', speed: 465, accel: 405, handling: 5.1, color: '#00d2ff' },
    { id: 'car_yellow', texture: 'car_yellow', name: 'VIPER NEON GTS', speed: 495, accel: 425, handling: 4.6, color: '#fee440' },
    { id: 'car_green', texture: 'car_green', name: 'LOTUS EVORA R', speed: 455, accel: 415, handling: 5.4, color: '#00e676' },
    { id: 'car_cyan', texture: 'car_cyan', name: 'CYBER TURBO GT', speed: 485, accel: 385, handling: 4.9, color: '#00f5d4' },
    { id: 'car_orange', texture: 'car_orange', name: 'SUNSET DRIFT V8', speed: 480, accel: 400, handling: 4.8, color: '#ff9100' }
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
let vignetteOverlay;
let lookAheadTarget;

// Elementos de la Telemetría Moderna
let hudContainer;
let hudPosBadge, hudLapText, hudTimerText, hudDeltaText, hudSpeedNum, hudGearText, hudTachBar;
let radarGraphics;

// Controles
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// ============================================================================
// 3. PRELOAD: CARGA DE RECURSOS LIMPIOS Y TEXTURAS OFICIALES
// ============================================================================
function dustPreload() {
    const p = 'assets/dustrac_clean/';

    // Terreno y Pista Oficial
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

    // Objetos y Entorno
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

    // Coches Oficiales
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
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); modernAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); modernAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
}

// ============================================================================
// 4. MENÚ PRINCIPAL MODERNO: SELECCIÓN DE CIRCUITO Y COCHE CON STATS
// ============================================================================
function showMenu(scene) {
    gameState = 'MENU';
    scene.children.removeAll();

    // Fondo elegante fibra de carbono
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0c13, 1);
    bg.fillRect(0, 0, 960, 540);

    // Rejilla deportiva luminosa
    bg.lineStyle(1, 0x171c2b, 0.8);
    for (let x = 0; x < 960; x += 32) bg.lineBetween(x, 0, x, 540);
    for (let y = 0; y < 540; y += 32) bg.lineBetween(0, y, 960, y);

    // Cabecera Neón
    scene.add.text(480, 36, '🏁 DUST RACING 2D : PRO EDITION 🏁', {
        font: '900 32px Arial',
        fill: '#ffffff',
        stroke: '#ff1744',
        strokeThickness: 5
    }).setOrigin(0.5);

    scene.add.text(480, 68, 'MOTOR DE ALTA FIDELIDAD • FÍSICAS PRO • ILUMINACIÓN Y AUDIO 2.5D', {
        font: 'bold 11px Arial',
        fill: '#00f5d4'
    }).setOrigin(0.5);

    // SELECTOR DE CIRCUITOS
    const tracksList = [
        { id: 'monza', name: 'MONZA GP', flag: '🇮🇹', diff: 'RÁPIDO', laps: 3 },
        { id: 'suzuka', name: 'SUZUKA CIRCUIT', flag: '🇯🇵', diff: 'TÉCNICO', laps: 3 },
        { id: 'twineburg', name: 'TWINEBURG SPEEDWAY', flag: '🇩🇪', diff: 'EQUILIBRADO', laps: 3 },
        { id: 'crossroads', name: 'CROSSROADS ARENA', flag: '🇺🇸', diff: 'EXTREMO', laps: 3 },
        { id: 'western_valley', name: 'WESTERN VALLEY', flag: '🇬🇧', diff: 'CURVAS LARGAS', laps: 3 },
        { id: 'triangle', name: 'TRIANGLE SPEEDWAY', flag: '🇪🇸', diff: 'OVALO VELOZ', laps: 3 }
    ];

    scene.add.text(60, 105, 'SELECCIONA CIRCUITO:', { font: '900 13px Arial', fill: '#fee440' });

    tracksList.forEach((t, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx = 60 + col * 285;
        const by = 135 + row * 80;
        const isSelected = currentTrackId === t.id;

        const card = scene.add.graphics();
        card.fillStyle(isSelected ? 0x132e27 : 0x111622, 0.95);
        card.fillRoundedRect(bx, by, 270, 68, 8);
        card.lineStyle(2, isSelected ? 0x00f5d4 : 0x222a3d, 1);
        card.strokeRoundedRect(bx, by, 270, 68, 8);

        scene.add.text(bx + 16, by + 14, `${t.flag} ${t.name}`, {
            font: 'bold 14px Arial',
            fill: isSelected ? '#00f5d4' : '#ffffff'
        });

        scene.add.text(bx + 16, by + 38, `DIFICULTAD: ${t.diff} • ${t.laps} VUELTAS`, {
            font: '10px Arial',
            fill: isSelected ? '#a7f3d0' : '#8892b0'
        });

        const hit = scene.add.rectangle(bx + 135, by + 34, 270, 68).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            modernAudio.init();
            currentTrackId = t.id;
            showMenu(scene);
        });
    });

    // SELECTOR DE VEHÍCULOS CON BARRAS DE RENDIMIENTO
    scene.add.text(60, 315, 'SELECCIONA TU VEHÍCULO:', { font: '900 13px Arial', fill: '#fee440' });

    DUST_CARS.forEach((car, idx) => {
        const cx = 135 + idx * 140;
        const cy = 390;
        const isSel = selectedCarIndex === idx;

        const cBox = scene.add.graphics();
        cBox.fillStyle(isSel ? 0x183020 : 0x121724, 0.95);
        cBox.fillRoundedRect(cx - 62, cy - 50, 124, 100, 8);
        cBox.lineStyle(2, isSel ? 0x00e676 : 0x263045, 1);
        cBox.strokeRoundedRect(cx - 62, cy - 50, 124, 100, 8);

        // Sprite oficial del coche con sombra
        scene.add.ellipse(cx + 3, cy - 18, 48, 22, 0x000000, 0.45);
        scene.add.sprite(cx, cy - 20, car.texture).setDisplaySize(48, 25).setAngle(-90);

        scene.add.text(cx, cy + 8, car.name.split(' ')[0], {
            font: 'bold 11px Arial',
            fill: isSel ? '#ffffff' : '#90a4ae'
        }).setOrigin(0.5);

        // Barras de telemetría (Velocidad / Manejo)
        const vRatio = (car.speed - 440) / 60;
        const hRatio = (car.handling - 4.4) / 1.1;

        cBox.fillStyle(0x374151, 1);
        cBox.fillRect(cx - 45, cy + 22, 90, 4);
        cBox.fillRect(cx - 45, cy + 32, 90, 4);

        cBox.fillStyle(0xff1744, 1);
        cBox.fillRect(cx - 45, cy + 22, 90 * vRatio, 4);
        cBox.fillStyle(0x00f5d4, 1);
        cBox.fillRect(cx - 45, cy + 32, 90 * hRatio, 4);

        const hit = scene.add.rectangle(cx, cy, 124, 100).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            modernAudio.init();
            selectedCarIndex = idx;
            showMenu(scene);
        });
    });

    // BOTÓN DE SALIDA A PISTA
    const startBox = scene.add.graphics();
    startBox.fillStyle(0x00c853, 1);
    startBox.fillRoundedRect(340, 475, 280, 46, 8);
    startBox.lineStyle(2, 0xffffff, 0.9);
    startBox.strokeRoundedRect(340, 475, 280, 46, 8);

    const startBtn = scene.add.text(480, 498, '¡SALIR A PISTA! ▶', {
        font: '900 18px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        modernAudio.init();
        startRace(scene, currentTrackId, selectedCarIndex);
    });
}

// ============================================================================
// 5. CONSTRUCCIÓN DE CARRERA CON ILUMINACIÓN 2.5D Y ASSETS OFICIALES CONTINUOS
// ============================================================================
function startRace(scene, trackId, carIdx) {
    scene.children.removeAll();

    const tracks = window.DustracTracks || {};
    const track = tracks[trackId];
    if (!track) {
        console.error('Circuito no encontrado:', trackId);
        return;
    }

    gameState = 'COUNTDOWN';
    console.log(`🏁 Gran Premio: ${track.name} (${track.worldWidth}x${track.worldHeight}px)`);

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

    // 2. CAPA DE TILES OFICIALES (Continuos y sin saltos)
    track.tiles.forEach(tile => {
        const tx = tile.i * 256 + 128;
        const ty = tile.j * 256 + 128;
        scene.tileMap.set(`${tile.i},${tile.j}`, tile);

        // Trampas de arena
        if (tile.t === 'sand') {
            scene.add.sprite(tx, ty, 'dt_sand').setDisplaySize(256, 256).setDepth(1);
        } else if (tile.t === 'sandGrassStraight') {
            scene.add.sprite(tx, ty, 'dt_sandGrassStraight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner2') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner2').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        }

        // Tramos de Asfalto Oficiales Limpios
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

    // 3. CAPA DE MARCAS DE GOMA DE DERRAPE GEMELAS (Twin Skid Marks)
    skidLayer = scene.add.graphics().setDepth(4);

    // 4. OBJETOS DEL ENTORNO CON SOMBRA SOLAR REALISTA
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            scene.add.ellipse(obj.x + 10, obj.y + 14, 52, 42, 0x000000, 0.38).setDepth(13);
            const tree = scene.add.sprite(obj.x, obj.y, 'dt_tree').setDisplaySize(58, 58).setDepth(14);
            scene.tweens.add({
                targets: tree,
                angle: (Math.random() - 0.5) * 4,
                duration: 2500 + Math.random() * 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (obj.r === 'grandstand') {
            scene.add.rectangle(obj.x + 12, obj.y + 16, 140, 140, 0x000000, 0.35).setAngle(obj.o).setDepth(11);
            scene.add.sprite(obj.x, obj.y, 'dt_grandstand').setDisplaySize(140, 140).setAngle(obj.o).setDepth(12);
        } else if (obj.r === 'tire') {
            scene.add.ellipse(obj.x + 3, obj.y + 4, 18, 18, 0x000000, 0.45).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(18, 18).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.ellipse(obj.x + 3, obj.y + 4, 22, 18, 0x000000, 0.4).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(20, 20).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'bushArea') {
            scene.add.sprite(obj.x, obj.y, 'dt_bushArea').setDisplaySize(92, 92).setAngle(obj.o).setDepth(5);
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

    // Coche Jugador
    const pCarData = DUST_CARS[carIdx];
    playerCar = spawnVehicle(scene, n0.x + perpX * 22, n0.y + perpY * 22, pCarData.texture, startAngleDeg, true, pCarData);

    // 5 Rivales IA
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

    // Objetivo dinámico de Cámara Predictiva (Look-Ahead)
    lookAheadTarget = scene.add.circle(playerCar.x, playerCar.y, 4, 0x000000, 0).setDepth(0);
    scene.cameras.main.startFollow(lookAheadTarget, true, 0.1, 0.1);
    scene.cameras.main.setZoom(1.15);

    // HUD y Telemetría F1
    setupModernHud(scene, track);

    // Semáforo de salida
    startCountdown(scene);
}

// Spawnear vehículo con suspensión 2.5D y sombras
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
    car.driftAmount = 0;
    car.bodyRoll = 0;

    // Sombra solar direccional proyectada hacia el sureste
    car.shadow = scene.add.ellipse(x + 6, y + 8, 48, 23, 0x000000, 0.45).setDepth(9);

    // Gráficos propios para faros delanteros y luces de freno
    car.lights = scene.add.graphics().setDepth(8);

    return car;
}

// Semáforo Moderno F1
function startCountdown(scene) {
    let count = 3;
    const txt = scene.add.text(480, 240, '3', {
        font: '900 90px Arial',
        fill: '#ff1744',
        stroke: '#ffffff',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    modernAudio.playCountdown(false);

    const event = scene.time.addEvent({
        delay: 900,
        repeat: 3,
        callback: () => {
            count--;
            if (count > 0) {
                txt.setText(count.toString());
                txt.setFill(count === 2 ? '#ff9100' : '#ffea00');
                modernAudio.playCountdown(false);
            } else if (count === 0) {
                txt.setText('¡GO!');
                txt.setFill('#00e676');
                modernAudio.playCountdown(true);
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
// 6. TELEMETRÍA Y HUD DE ALTA COMPETICIÓN (F1 / MOTORSPORT)
// ============================================================================
function setupModernHud(scene, track) {
    hudContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Barra de Vidrio Oscuro Superior
    const topBar = scene.add.graphics();
    topBar.fillStyle(0x080b12, 0.88);
    topBar.fillRect(0, 0, 960, 52);
    topBar.lineStyle(2, 0x00f5d4, 0.85);
    topBar.lineBetween(0, 52, 960, 52);
    hudContainer.add(topBar);

    // Placa de Posición con Estilo Medalla
    hudPosBadge = scene.add.text(24, 13, 'P1', {
        font: '900 24px Arial', fill: '#fee440', stroke: '#000000', strokeThickness: 4
    });
    hudContainer.add(hudPosBadge);

    const posSub = scene.add.text(62, 20, '/ 6', {
        font: 'bold 14px Arial', fill: '#90a4ae'
    });
    hudContainer.add(posSub);

    // Vuelta Actual
    hudLapText = scene.add.text(140, 17, `VUELTA 1/${TOTAL_LAPS}`, {
        font: '900 16px Arial', fill: '#ffffff'
    });
    hudContainer.add(hudLapText);

    // Cronómetro Principal
    hudTimerText = scene.add.text(480, 14, '00:00.00', {
        font: '900 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5, 0);
    hudContainer.add(hudTimerText);

    // Delta de Vuelta en Tiempo Real
    hudDeltaText = scene.add.text(480, 36, 'MEJOR VUELTA: --:--', {
        font: 'bold 11px Arial', fill: '#00f5d4'
    }).setOrigin(0.5, 0);
    hudContainer.add(hudDeltaText);

    // Tacómetro LED y Velocímetro Digital
    hudSpeedNum = scene.add.text(825, 12, '0', {
        font: '900 24px Arial', fill: '#00e676'
    }).setOrigin(1, 0);
    hudContainer.add(hudSpeedNum);

    const kmhLabel = scene.add.text(830, 20, 'KM/H', {
        font: 'bold 12px Arial', fill: '#90a4ae'
    });
    hudContainer.add(kmhLabel);

    hudGearText = scene.add.text(885, 14, 'G1', {
        font: '900 20px Arial', fill: '#fee440'
    });
    hudContainer.add(hudGearText);

    // Barra de Tacómetro de RPM (LEDs tipo Fórmula 1)
    hudTachBar = scene.add.graphics();
    hudContainer.add(hudTachBar);

    // Radar Minimapa Neón en esquina inferior derecha
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(101);

    // Viñeta de Desenfoque Periférico a Alta Velocidad
    vignetteOverlay = scene.add.graphics().setScrollFactor(0).setDepth(99);
}

// ============================================================================
// 7. BUCLE DE ACTUALIZACIÓN A 60 FPS (FÍSICAS, CÁMARA, AUDIO Y RENDER)
// ============================================================================
function dustUpdate(time, delta) {
    if (!playerCar || gameState === 'MENU') return;

    const dt = delta / 1000;
    const tracks = window.DustracTracks || {};
    const track = tracks[currentTrackId];
    if (!track) return;

    // Cronómetro y Deltas
    if (gameState === 'RACE') {
        const ms = Date.now() - lapStartTime;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const csec = Math.floor((ms % 1000) / 10);
        const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${csec < 10 ? '0' : ''}${csec}`;
        hudTimerText.setText(timeStr);

        if (bestLapTime) {
            const bestM = Math.floor(bestLapTime / 60000);
            const bestS = Math.floor((bestLapTime % 60000) / 1000);
            const bestCs = Math.floor((bestLapTime % 1000) / 10);
            hudDeltaText.setText(`MEJOR: ${bestM < 10 ? '0' : ''}${bestM}:${bestS < 10 ? '0' : ''}${bestS}.${bestCs < 10 ? '0' : ''}${bestCs}`);
        }
    }

    // 1. FÍSICAS Y CONTROLES DEL JUGADOR
    updatePlayer(dt, track);

    // 2. FÍSICAS DE LA IA RIVAL
    if (gameState === 'RACE') {
        aiCars.forEach(ai => updateAiCar(ai, dt, track));
    }

    // 3. COLISIONES DINÁMICAS Y CHISPAS
    handleCollisions();

    // 4. CÁMARA PREDICTIVA (LOOK-AHEAD) Y ZOOM REACTIVO
    updatePredictiveCamera();

    // 5. ILUMINACIÓN DINÁMICA (FAROS XENÓN Y LUCES DE FRENO)
    updateLightingAndShadows();

    // 6. VIÑETA DE ALTA VELOCIDAD
    updateSpeedVignette();

    // 7. RADAR MINIMAPA NEÓN
    renderMinimap(track);

    // 8. CLASIFICACIÓN EN TIEMPO REAL
    updateStandings(track);
}

// Físicas del Coche del Jugador con Fricción Lateral y Contravolante
function updatePlayer(dt, track) {
    const cData = playerCar.carData;
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || keys.space.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    // Detección de Terreno y Superficie
    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = raceScene.tileMap.get(`${ti},${tj}`);

    let grip = 1.0;

    if (tile) {
        if (tile.t === 'sand') {
            grip = 0.44;
            modernAudio.playSand();
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059, 14);
        } else if (tile.t.startsWith('sandGrass')) {
            grip = 0.65;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8, 12);
        } else if (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45')) {
            const distCenter = Math.hypot(playerCar.x - (ti * 256 + 128), playerCar.y - (tj * 256 + 128));
            if (distCenter > 88 && distCenter < 122) {
                modernAudio.playKerb();
                raceScene.cameras.main.shake(40, 0.002);
            }
        } else {
            grip = 0.58;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c, 10);
        }
    } else {
        grip = 0.55;
    }

    const topSpeed = cData.speed * grip;
    const accelRate = cData.accel * grip;

    // Aceleración y Frenada
    if (gameState === 'RACE') {
        if (gas) {
            playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
        } else if (brake) {
            playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.4 * dt);
        } else {
            playerSpeed *= 0.984; // Fricción natural por inercia
        }

        // Giro con Respuesta Dinámica
        const steerSpeedFactor = playerSpeed > 30 ? 1 : Math.max(0.1, playerSpeed / 30);
        const steer = cData.handling * steerSpeedFactor;

        if (left) {
            playerCar.angle -= steer;
            playerCar.bodyRoll = Phaser.Math.Linear(playerCar.bodyRoll, -1, 0.15);
        } else if (right) {
            playerCar.angle += steer;
            playerCar.bodyRoll = Phaser.Math.Linear(playerCar.bodyRoll, 1, 0.15);
        } else {
            playerCar.bodyRoll = Phaser.Math.Linear(playerCar.bodyRoll, 0, 0.15);
        }

        // Detección de Derrape Dinámico (Lateral Slip)
        const isTurning = (left || right) && Math.abs(playerSpeed) > 130;
        if (isTurning || (brake && Math.abs(playerSpeed) > 90)) {
            playerCar.driftAmount = Math.min(1, playerCar.driftAmount + dt * 4.0);
            modernAudio.setDriftIntensity(playerCar.driftAmount);
            drawTwinSkidMarks(playerCar.x, playerCar.y, playerCar.angle, playerCar.driftAmount);
            spawnTireSmoke(playerCar.x, playerCar.y, playerCar.angle);
        } else {
            playerCar.driftAmount = Math.max(0, playerCar.driftAmount - dt * 5.0);
            modernAudio.setDriftIntensity(playerCar.driftAmount);
        }
    } else {
        playerSpeed = 0;
        playerCar.driftAmount = 0;
        modernAudio.setDriftIntensity(0);
    }

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    playerCar.setVelocity(Math.cos(rad) * playerSpeed, Math.sin(rad) * playerSpeed);

    // Audio de 4 Marchas y Tacómetro
    const engineData = modernAudio.updateEngine(playerSpeed, cData.speed, gas, brake);
    updateTachometer(engineData);

    const kmh = Math.floor(Math.abs(playerSpeed) * 0.65);
    hudSpeedNum.setText(kmh.toString());

    // Inclinación de Carrocería (Body Roll)
    playerCar.setScale(1.0, 1.0 + Math.abs(playerCar.bodyRoll) * 0.08);

    checkLap(playerCar, track);
}

// Tacómetro LED Fórmula 1
function updateTachometer(engineData) {
    if (!hudTachBar || !engineData) return;
    hudTachBar.clear();

    const gear = engineData.gear || 1;
    const rpm = engineData.rpmRatio || 0;
    hudGearText.setText(`G${gear}`);

    const bx = 710, by = 38, bw = 115, bh = 8;
    hudTachBar.fillStyle(0x1a2130, 0.9);
    hudTachBar.fillRect(bx, by, bw, bh);

    // Segmentos LED
    const numLeds = 12;
    const activeLeds = Math.floor(rpm * numLeds);
    const ledW = bw / numLeds - 2;

    for (let i = 0; i < numLeds; i++) {
        const lx = bx + i * (ledW + 2);
        if (i < activeLeds) {
            let color = 0x00e676; // Verde
            if (i >= 7 && i < 10) color = 0xfee440; // Amarillo
            if (i >= 10) color = 0xff1744; // Rojo (Corte)
            hudTachBar.fillStyle(color, 1);
            hudTachBar.fillRect(lx, by, ledW, bh);
        } else {
            hudTachBar.fillStyle(0x2a3245, 0.4);
            hudTachBar.fillRect(lx, by, ledW, bh);
        }
    }
}

// Cámara Predictiva con Anticipación a Curvas (Look-Ahead)
function updatePredictiveCamera() {
    if (!raceScene || !raceScene.cameras || !raceScene.cameras.main || !playerCar || !lookAheadTarget) return;

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    const lookDist = (playerSpeed / 500) * 125;
    lookAheadTarget.x = playerCar.x + Math.cos(rad) * lookDist;
    lookAheadTarget.y = playerCar.y + Math.sin(rad) * lookDist;

    // Zoom Reactivo
    const targetZoom = Math.max(0.94, 1.15 - (Math.abs(playerSpeed) / 500) * 0.21);
    raceScene.cameras.main.zoom = Phaser.Math.Linear(raceScene.cameras.main.zoom, targetZoom, 0.05);
}

// Marcas de Goma Gemelas Continuas (Twin Skid Marks)
function drawTwinSkidMarks(x, y, angleDeg, intensity) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const spread = 10;
    const lx = Math.cos(rad) * spread;
    const ly = Math.sin(rad) * spread;

    const alpha = Math.min(0.45, 0.15 + intensity * 0.3);
    skidLayer.fillStyle(0x080a0d, alpha);
    skidLayer.fillCircle(x + lx, y + ly, 2.8);
    skidLayer.fillCircle(x - lx, y - ly, 2.8);
}

// Humo Volumétrico de Derrape
function spawnTireSmoke(x, y, angleDeg) {
    if (!raceScene) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 180);
    const sx = x + Math.cos(rad) * 16 + (Math.random() - 0.5) * 8;
    const sy = y + Math.sin(rad) * 16 + (Math.random() - 0.5) * 8;

    const puff = raceScene.add.circle(sx, sy, 7, 0xecf0f1, 0.35).setDepth(6);
    raceScene.tweens.add({
        targets: puff,
        radius: 18,
        alpha: 0,
        x: sx + (Math.random() - 0.5) * 14,
        y: sy + (Math.random() - 0.5) * 14,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy()
    });
}

// Iluminación Dinámica: Faros Dobles de Xenón y Luces de Freno LED
function updateLightingAndShadows() {
    const all = [playerCar, ...aiCars];
    const isPlayerBraking = keys.down.isDown || keys.s.isDown || touchBrake;

    all.forEach(car => {
        if (!car || !car.active) return;

        // Sombra Solar con Desplazamiento Sureste Suave
        if (car.shadow) {
            car.shadow.x = car.x + 6;
            car.shadow.y = car.y + 8;
            car.shadow.angle = car.angle;
        }

        if (car.lights) {
            car.lights.clear();
            const rad = Phaser.Math.DegToRad(car.angle);

            // Faros Delanteros Dobles (Proyectores de Xenón)
            const fx = car.x + Math.cos(rad) * 22;
            const fy = car.y + Math.sin(rad) * 22;
            const cone = 0.32;
            const dist = 130;

            // Halo suave ambiental
            car.lights.fillStyle(0xfffde7, 0.12);
            car.lights.beginPath();
            car.lights.moveTo(fx, fy);
            car.lights.lineTo(fx + Math.cos(rad - cone) * dist, fy + Math.sin(rad - cone) * dist);
            car.lights.lineTo(fx + Math.cos(rad + cone) * dist, fy + Math.sin(rad + cone) * dist);
            car.lights.closePath();
            car.lights.fill();

            // Haz principal intenso
            car.lights.fillStyle(0xffffff, 0.22);
            car.lights.beginPath();
            car.lights.moveTo(fx, fy);
            car.lights.lineTo(fx + Math.cos(rad - 0.14) * (dist * 0.75), fy + Math.sin(rad - 0.14) * (dist * 0.75));
            car.lights.lineTo(fx + Math.cos(rad + 0.14) * (dist * 0.75), fy + Math.sin(rad + 0.14) * (dist * 0.75));
            car.lights.closePath();
            car.lights.fill();

            // Luces de Freno LED Rojas Reactivas
            const isBraking = car.isPlayer ? isPlayerBraking : (car.aiBraking || false);
            const rx = car.x - Math.cos(rad) * 20;
            const ry = car.y - Math.sin(rad) * 20;
            const perp = rad + Math.PI / 2;

            if (isBraking) {
                // Resplandor de Freno Intenso
                car.lights.fillStyle(0xff1744, 0.7);
                car.lights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 9);
                car.lights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 9);

                car.lights.fillStyle(0xff5252, 0.4);
                car.lights.fillCircle(rx, ry, 22);
            } else {
                // Luces de posición traseras tenues
                car.lights.fillStyle(0xd50000, 0.35);
                car.lights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 4);
                car.lights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 4);
            }
        }
    });
}

// Viñeta Dinámica de Alta Velocidad (Sensación de Túnel)
function updateSpeedVignette() {
    if (!vignetteOverlay) return;
    vignetteOverlay.clear();

    const speedRatio = Math.max(0, (Math.abs(playerSpeed) - 340) / 160);
    if (speedRatio > 0.05) {
        vignetteOverlay.lineStyle(24 * speedRatio, 0x00f5d4, 0.18 * speedRatio);
        vignetteOverlay.strokeRect(0, 0, 960, 540);
    }
}

// Inteligencia Artificial de Rivales Optimizada
function updateAiCar(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[ai.targetNodeIdx];
    const angleRad = Math.atan2(targetNode.y - ai.y, targetNode.x - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);

    const diff = Phaser.Math.Angle.WrapDegrees(targetDeg - ai.angle);
    const step = ai.carData.handling * 0.95;
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), step);

    // Frenada de IA en curvas cerradas
    if (Math.abs(diff) > 40) {
        ai.aiBraking = true;
        ai.aiVelocity = Math.max(ai.carData.speed * 0.45, (ai.aiVelocity || 0) - ai.carData.accel * 1.5 * dt);
    } else {
        ai.aiBraking = false;
        const maxSpeed = ai.carData.speed * 0.90;
        ai.aiVelocity = Math.min(maxSpeed, (ai.aiVelocity || 0) + ai.carData.accel * 0.8 * dt);
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

// Colisiones y Chispas
function handleCollisions() {
    aiCars.forEach(ai => {
        const dist = Math.hypot(playerCar.x - ai.x, playerCar.y - ai.y);
        if (dist < 34) {
            modernAudio.playCrash();
            playerSpeed *= 0.82;
            ai.aiVelocity *= 0.82;

            const ang = Math.atan2(playerCar.y - ai.y, playerCar.x - ai.x);
            playerCar.x += Math.cos(ang) * 7;
            playerCar.y += Math.sin(ang) * 7;
            ai.x -= Math.cos(ang) * 7;
            ai.y -= Math.sin(ang) * 7;

            // Chispas metálicas brillantes
            spawnDust(raceScene, (playerCar.x + ai.x) / 2, (playerCar.y + ai.y) / 2, 'dt_sparkle', 0xffea00, 22);
            raceScene.cameras.main.shake(70, 0.005);
        }
    });
}

function spawnDust(scene, x, y, textureKey, tintHex, size = 16) {
    const p = scene.add.sprite(
        x + (Math.random() - 0.5) * 18,
        y + (Math.random() - 0.5) * 18,
        textureKey
    ).setDisplaySize(size, size).setDepth(8);

    if (tintHex) p.setTint(tintHex);

    scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 1.9,
        duration: 260,
        onComplete: () => p.destroy()
    });
}

// Checkpoints y Registro de Tiempos
function checkLap(car, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[playerNextNodeIdx];
    const dist = Math.hypot(car.x - targetNode.x, car.y - targetNode.y);

    if (dist < 185) {
        car.lastCheckpoint = playerNextNodeIdx;
        playerNextNodeIdx = (playerNextNodeIdx + 1) % nodes.length;

        if (playerNextNodeIdx === 1) {
            modernAudio.playLap();
            playerLap++;

            const lapDuration = Date.now() - lapStartTime;
            if (!bestLapTime || lapDuration < bestLapTime) {
                bestLapTime = lapDuration;
            }

            lapStartTime = Date.now();

            if (playerLap > TOTAL_LAPS) {
                endRace();
            } else {
                hudLapText.setText(`VUELTA ${playerLap}/${TOTAL_LAPS}`);
            }
        }
    }
}

// Fin de Carrera con Podio
function endRace() {
    gameState = 'FINISHED';
    playerSpeed = 0;
    playerCar.setVelocity(0, 0);

    const overlay = raceScene.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x060810, 0.88);
    overlay.fillRect(0, 0, 960, 540);

    raceScene.add.text(480, 190, '🏆 ¡CARRERA FINALIZADA! 🏆', {
        font: '900 36px Arial', fill: '#00f5d4', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    raceScene.add.text(480, 255, `POSICIÓN FINAL: ${hudPosBadge.text} DE 6`, {
        font: 'bold 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const retBtn = raceScene.add.text(480, 345, 'VOLVER AL MENÚ DE CIRCUITOS', {
        font: 'bold 18px Arial', fill: '#fee440', backgroundColor: '#131c2b', padding: { x: 24, y: 14 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    retBtn.on('pointerdown', () => {
        showMenu(raceScene);
    });
}

// Minimapa Neón con Trazado y Puntos en Tiempo Real
function renderMinimap(track) {
    if (!radarGraphics) return;
    radarGraphics.clear();

    const rx = 805, ry = 395, rw = 135, rh = 115;
    radarGraphics.fillStyle(0x070a12, 0.88);
    radarGraphics.fillRoundedRect(rx, ry, rw, rh, 8);
    radarGraphics.lineStyle(1.5, 0x00f5d4, 0.8);
    radarGraphics.strokeRoundedRect(rx, ry, rw, rh, 8);

    const sx = (rw - 20) / track.worldWidth;
    const sy = (rh - 20) / track.worldHeight;

    // Trazado de Pista Neón
    radarGraphics.lineStyle(2.5, 0x22354c, 0.9);
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

    // Rivales (Puntos Rojos)
    aiCars.forEach(ai => {
        radarGraphics.fillStyle(0xff1744, 1);
        radarGraphics.fillCircle(rx + 10 + ai.x * sx, ry + 10 + ai.y * sy, 2.5);
    });

    // Jugador (Punto Amarillo con Halo)
    radarGraphics.fillStyle(0xfee440, 0.4);
    radarGraphics.fillCircle(rx + 10 + playerCar.x * sx, ry + 10 + playerCar.y * sy, 6);
    radarGraphics.fillStyle(0xfee440, 1);
    radarGraphics.fillCircle(rx + 10 + playerCar.x * sx, ry + 10 + playerCar.y * sy, 3.5);
}

// Clasificación en Vivo
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
    if (hudPosBadge) hudPosBadge.setText(`P${rank}`);
}
