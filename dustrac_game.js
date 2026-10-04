// ===== MINI RACING ONLINE (MRO) : F1 GRAND PRIX EDITION =====
// Inspirado al 100% en Mini Racing Online (MRO) por Vicente Mas Morant (Kotai):
// - Monoplazas de Formula 1 Open-Wheel de alta precisión (ruedas descubiertas, alerones, suspensiones y casco del piloto).
// - Sistema híbrido KERS / ERS con botón de empuje eléctrico y frenada regenerativa.
// - DRS (Drag Reduction System) automático en rectas para superar los 330 KM/H.
// - Sonido F1 V6 Turbo Hybrid de altas revoluciones con 7 marchas secuenciales.
// - Parrilla de salida con cajones pintados y pianos de carrera Grand Prix.
// - Telemetría estilo retransmisión oficial F1 TV con indicador de batería y torre de tiempos.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ============================================================================
// 1. SINTETIZADOR DE AUDIO F1 V6 TURBO HYBRID & KERS
// ============================================================================
class F1AudioEngine {
    constructor() {
        this.ctx = null;
        this.v6Osc1 = null;
        this.v6Osc2 = null;
        this.kersOsc = null;
        this.kersGain = null;
        this.engineGain = null;
        this.engineFilter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.isReady = false;
        this.currentGear = 1;
        this.gearThresholds = [0.18, 0.35, 0.50, 0.65, 0.78, 0.90, 1.0];
        this.lastThrottle = false;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Oscilador 1: Aullido principal F1 (Sawtooth)
            this.v6Osc1 = this.ctx.createOscillator();
            this.v6Osc1.type = 'sawtooth';
            this.v6Osc1.frequency.setValueAtTime(80, this.ctx.currentTime);

            // Oscilador 2: Armónicos de combustión (Triangle + octava)
            this.v6Osc2 = this.ctx.createOscillator();
            this.v6Osc2.type = 'triangle';
            this.v6Osc2.frequency.setValueAtTime(160, this.ctx.currentTime);

            // Filtro dinámico de escape F1
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(600, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.v6Osc1.connect(this.engineFilter);
            this.v6Osc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.v6Osc1.start();
            this.v6Osc2.start();

            // Zumbido eléctrico KERS / MGU-K
            this.kersOsc = this.ctx.createOscillator();
            this.kersOsc.type = 'sine';
            this.kersOsc.frequency.setValueAtTime(880, this.ctx.currentTime);

            this.kersGain = this.ctx.createGain();
            this.kersGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.kersOsc.connect(this.kersGain);
            this.kersGain.connect(this.ctx.destination);
            this.kersOsc.start();

            // Derrape
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(520, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(900, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio F1 esperando interacción');
        }
    }

    updateEngine(speed, maxSpeed, isGas, isKers) {
        if (!this.ctx || !this.v6Osc1) return { gear: 1, rpmRatio: 0 };
        const now = this.ctx.currentTime;
        const speedRatio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        // 7 Marchas de F1
        let gear = 1;
        let gearLocalRatio = speedRatio / this.gearThresholds[0];
        for (let g = 0; g < this.gearThresholds.length; g++) {
            if (speedRatio <= this.gearThresholds[g] || g === this.gearThresholds.length - 1) {
                gear = g + 1;
                const prev = g === 0 ? 0 : this.gearThresholds[g - 1];
                gearLocalRatio = (speedRatio - prev) / (this.gearThresholds[g] - prev);
                break;
            }
        }

        if (gear !== this.currentGear && isGas) {
            this.playGearShift();
            this.currentGear = gear;
        }
        this.lastThrottle = isGas;

        // Frecuencia F1 (de 85Hz a 420Hz para el aullido V6 Turbo)
        const baseFreq = 75;
        const rpmFreq = baseFreq + gearLocalRatio * 185;
        this.v6Osc1.frequency.setTargetAtTime(rpmFreq, now, 0.035);
        this.v6Osc2.frequency.setTargetAtTime(rpmFreq * 1.5, now, 0.035);

        const filterCut = isGas ? 800 + speedRatio * 1200 : 420;
        this.engineFilter.frequency.setTargetAtTime(filterCut, now, 0.04);

        const targetGain = isGas ? 0.06 : 0.03;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        // Sonido KERS
        if (isKers) {
            this.kersGain.gain.setTargetAtTime(0.045, now, 0.05);
            this.kersOsc.frequency.setTargetAtTime(750 + speedRatio * 450, now, 0.05);
        } else {
            this.kersGain.gain.setTargetAtTime(0.0001, now, 0.08);
        }

        return { gear, rpmRatio: Math.max(0, Math.min(1, gearLocalRatio)) };
    }

    setDriftIntensity(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        const now = this.ctx.currentTime;
        this.driftGain.gain.setTargetAtTime(clamped * 0.03, now, 0.04);
        this.driftOsc.frequency.setTargetAtTime(480 + clamped * 280, now, 0.04);
    }

    playGearShift() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    playKerb() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
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
        [587, 740, 880, 1174].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.06);
            gain.gain.setValueAtTime(0.09, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.25);
        });
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 987 : 493, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.12));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.12));
    }
}
const f1Audio = new F1AudioEngine();

// ============================================================================
// 2. CONFIGURACIÓN DEL JUEGO PHASER 3
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
    scene: { preload: f1Preload, create: f1Create, update: f1Update }
};

const game = new Phaser.Game(CONFIG);

// 6 Escuderías F1 de Mini Racing Online
const F1_TEAMS = [
    { id: 'f1_ferrari', name: 'SCUDERIA ROSSO', team: 'FERRARI GP', primary: '#e10600', accent: '#ffd700', helmet: '#ffff00', speed: 510, accel: 440, handling: 5.4 },
    { id: 'f1_redbull', name: 'APEX BULL RACING', team: 'RED BULL F1', primary: '#081630', accent: '#e51a24', helmet: '#00d2ff', speed: 515, accel: 445, handling: 5.5 },
    { id: 'f1_mclaren', name: 'PAPAYA SPEED RACING', team: 'MCLAREN GP', primary: '#ff8000', accent: '#00b4d8', helmet: '#ffffff', speed: 505, accel: 450, handling: 5.6 },
    { id: 'f1_mercedes', name: 'SILVER ARROW GP', team: 'MERCEDES AMG', primary: '#282b30', accent: '#00f5d4', helmet: '#00f5d4', speed: 508, accel: 442, handling: 5.5 },
    { id: 'f1_aston', name: 'ASTON RACING GREEN', team: 'ASTON MARTIN', primary: '#00594f', accent: '#cfff04', helmet: '#cfff04', speed: 500, accel: 448, handling: 5.7 },
    { id: 'f1_williams', name: 'WILLIAMS CYBER GP', team: 'WILLIAMS F1', primary: '#041e42', accent: '#00a3e0', helmet: '#ff2a2a', speed: 512, accel: 435, handling: 5.3 }
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

// KERS & DRS
let ersBattery = 100; // Porcentaje 0 a 100%
let isKersActive = false;
let isDrsActive = false;

let skidLayer;
let lookAheadTarget;

// HUD F1 Broadcast
let hudContainer;
let hudPosBadge, hudLapText, hudTimerText, hudSpeedText, hudGearText, hudErsBar, hudDrsBadge, hudDeltaText;
let radarGraphics;

// Controles
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false, touchKers = false;

// ============================================================================
// 3. GENERADOR DE MONOPLAZAS F1 OPEN-WHEEL VECTORIAL (MRO STYLE)
// ============================================================================
function createF1CarCanvas(team) {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 44;
    const ctx = canvas.getContext('2d');

    // Limpiar fondo transparente
    ctx.clearRect(0, 0, 80, 44);

    // 1. BRAZOS DE SUSPENSIÓN (Wishbones) en carbono
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    // Delanteras
    ctx.beginPath();
    ctx.moveTo(48, 18); ctx.lineTo(60, 8);
    ctx.moveTo(56, 19); ctx.lineTo(60, 8);
    ctx.moveTo(48, 26); ctx.lineTo(60, 36);
    ctx.moveTo(56, 25); ctx.lineTo(60, 36);
    // Traseras
    ctx.moveTo(22, 19); ctx.lineTo(18, 8);
    ctx.moveTo(28, 19); ctx.lineTo(18, 8);
    ctx.moveTo(22, 25); ctx.lineTo(18, 36);
    ctx.moveTo(28, 25); ctx.lineTo(18, 36);
    ctx.stroke();

    // 2. 4 NEUMÁTICOS PIRELLI SLICK ABIERTOS (Open-Wheel)
    ctx.fillStyle = '#111111';
    // Delantero Izquierdo
    ctx.fillRect(53, 3, 15, 8);
    // Delantero Derecho
    ctx.fillRect(53, 33, 15, 8);
    // Trasero Izquierdo (Más ancho)
    ctx.fillRect(10, 2, 18, 10);
    // Trasero Derecho (Más ancho)
    ctx.fillRect(10, 32, 18, 10);

    // Llantas y tuercas centrales
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(58, 5, 5, 4);
    ctx.fillRect(58, 35, 5, 4);
    ctx.fillRect(16, 4, 6, 6);
    ctx.fillRect(16, 34, 6, 6);

    // Detalle amarillo / rojo en flanco de neumático
    ctx.strokeStyle = team.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(53.5, 3.5, 14, 7);
    ctx.strokeRect(53.5, 33.5, 14, 7);

    // 3. ALERÓN TRASERO CON PLACAS LATERALES Y FLAP DRS
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(5, 5, 8, 34); // Ala principal
    ctx.fillStyle = team.accent;
    ctx.fillRect(5, 4, 8, 3);  // Endplate izq
    ctx.fillRect(5, 37, 8, 3); // Endplate dcho
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 14, 2, 16); // Soporte DRS central

    // 4. CHASIS PRINCIPAL AERODINÁMICO DE F1
    ctx.fillStyle = team.primary;
    ctx.beginPath();
    ctx.moveTo(13, 19);
    ctx.lineTo(24, 13); // Pontón izq
    ctx.lineTo(44, 13);
    ctx.lineTo(50, 18); // Morro estrecho
    ctx.lineTo(72, 20); // Punta morro
    ctx.lineTo(72, 24);
    ctx.lineTo(50, 26);
    ctx.lineTo(44, 31); // Pontón dcho
    ctx.lineTo(24, 31);
    ctx.lineTo(13, 25);
    ctx.closePath();
    ctx.fill();

    // Sombra 3D y relieve de pontones
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(25, 14, 16, 4);
    ctx.fillRect(25, 26, 16, 4);

    // Tomas de aire de radiadores (negro)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(41, 14, 3, 4);
    ctx.fillRect(41, 26, 3, 4);

    // Aleta de tiburón dorsal (Shark Fin)
    ctx.fillStyle = team.accent;
    ctx.fillRect(16, 21, 20, 2);

    // 5. CABINA, HALO DE SEGURIDAD Y CASCO DEL PILOTO
    // Hueco del Cockpit
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(39, 22, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casco del Piloto (Brillante con Visera)
    ctx.fillStyle = team.helmet;
    ctx.beginPath();
    ctx.arc(38, 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Visera oscura del casco
    ctx.fillStyle = '#111111';
    ctx.fillRect(38, 20, 3, 4);

    // Halo bar protector
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(33, 19, 12, 6);

    // Toma de aire superior (Airbox)
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(31, 22, 3, 0, Math.PI * 2);
    ctx.fill();

    // 6. ALERÓN DELANTERO MULTIPLIEGUE (Front Wing)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(68, 5, 6, 34); // Plano principal
    ctx.fillStyle = team.primary;
    ctx.fillRect(71, 5, 3, 34); // Flap superior
    ctx.fillStyle = team.accent;
    ctx.fillRect(67, 3, 8, 3);  // Endplate izq
    ctx.fillRect(67, 38, 8, 3); // Endplate dcho

    // Luz trasera de seguridad roja LED (Rain Light)
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(4, 21, 2, 2);

    return canvas;
}

// ============================================================================
// 4. PRELOAD & CREACIÓN DE RECURSOS
// ============================================================================
function f1Preload() {
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
}

function f1Create() {
    raceScene = this;

    // Generar texturas de los 6 monoplazas F1 en memoria
    F1_TEAMS.forEach(team => {
        const c = createF1CarCanvas(team);
        this.textures.addCanvas(team.id, c);
    });

    keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    setupTouchControls();
    showMenu(this);
}

function setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); f1Audio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); f1Audio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
    bindTouch('btn-kers', () => touchKers = true, () => touchKers = false);
}

// ============================================================================
// 5. MENÚ F1 GRAND PRIX (SELECCIÓN DE CIRCUITO Y ESCUDERÍA)
// ============================================================================
function showMenu(scene) {
    gameState = 'MENU';
    scene.children.removeAll();

    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0d16, 1);
    bg.fillRect(0, 0, 960, 540);

    // Líneas de parrilla decorativas
    bg.lineStyle(1, 0x182033, 0.7);
    for (let x = 0; x < 960; x += 40) bg.lineBetween(x, 0, x, 540);
    for (let y = 0; y < 540; y += 40) bg.lineBetween(0, y, 960, y);

    // Cabecera F1 Oficial
    scene.add.text(480, 36, '🏁 MINI RACING ONLINE : F1 GRAND PRIX 🏁', {
        font: '900 32px Arial',
        fill: '#ffffff',
        stroke: '#e10600',
        strokeThickness: 5
    }).setOrigin(0.5);

    scene.add.text(480, 68, 'OPEN-WHEEL FORMULA RACER • SISTEMA KERS / DRS • RETRANSMISIÓN TV F1', {
        font: 'bold 11px Arial',
        fill: '#00f5d4'
    }).setOrigin(0.5);

    // CIRCUITOS GP
    const tracksList = [
        { id: 'monza', name: 'AUTODROMO DI MONZA', flag: '🇮🇹', diff: 'TEMPLO VELOCIDAD', laps: 3 },
        { id: 'suzuka', name: 'SUZUKA GP CIRCUIT', flag: '🇯🇵', diff: 'CURVAS EN S', laps: 3 },
        { id: 'twineburg', name: 'SILVERSTONE ARENA', flag: '🇬🇧', diff: 'MAGGOTTS & BECKETTS', laps: 3 },
        { id: 'crossroads', name: 'SPA-FRANCORCHAMPS', flag: '🇧🇪', diff: 'EAU ROUGE EXTREME', laps: 3 },
        { id: 'western_valley', name: 'CIRCUIT DE CATALUNYA', flag: '🇪🇸', diff: 'TÉCNICO GP', laps: 3 },
        { id: 'triangle', name: 'RED BULL RING OVAL', flag: '🇦🇹', diff: 'VELOCIDAD PURA', laps: 3 }
    ];

    scene.add.text(60, 105, 'SELECCIONA GRAN PREMIO:', { font: '900 13px Arial', fill: '#e10600' });

    tracksList.forEach((t, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx = 60 + col * 285;
        const by = 132 + row * 78;
        const isSelected = currentTrackId === t.id;

        const card = scene.add.graphics();
        card.fillStyle(isSelected ? 0x1f1118 : 0x111624, 0.95);
        card.fillRoundedRect(bx, by, 270, 66, 6);
        card.lineStyle(2, isSelected ? 0xe10600 : 0x222d45, 1);
        card.strokeRoundedRect(bx, by, 270, 66, 6);

        scene.add.text(bx + 16, by + 13, `${t.flag} ${t.name}`, {
            font: 'bold 14px Arial',
            fill: isSelected ? '#ff4d4d' : '#ffffff'
        });

        scene.add.text(bx + 16, by + 37, `${t.diff} • ${t.laps} VUELTAS`, {
            font: '10px Arial',
            fill: isSelected ? '#ffcdd2' : '#8898b5'
        });

        const hit = scene.add.rectangle(bx + 135, by + 33, 270, 66).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            f1Audio.init();
            currentTrackId = t.id;
            showMenu(scene);
        });
    });

    // SELECCIÓN DE ESCUDERÍA F1
    scene.add.text(60, 312, 'SELECCIONA MONOPLAZA Y ESCUDERÍA:', { font: '900 13px Arial', fill: '#00f5d4' });

    F1_TEAMS.forEach((team, idx) => {
        const cx = 135 + idx * 140;
        const cy = 392;
        const isSel = selectedCarIndex === idx;

        const cBox = scene.add.graphics();
        cBox.fillStyle(isSel ? 0x1a233a : 0x101522, 0.95);
        cBox.fillRoundedRect(cx - 62, cy - 50, 124, 100, 6);
        cBox.lineStyle(2, isSel ? 0x00f5d4 : 0x242e47, 1);
        cBox.strokeRoundedRect(cx - 62, cy - 50, 124, 100, 6);

        // Monoplaza F1 Open-Wheel
        scene.add.ellipse(cx + 4, cy - 18, 42, 22, 0x000000, 0.45);
        scene.add.sprite(cx, cy - 20, team.id).setDisplaySize(40, 22).setAngle(-90);

        scene.add.text(cx, cy + 8, team.name.split(' ')[0], {
            font: 'bold 11px Arial',
            fill: isSel ? '#ffffff' : '#90a4ae'
        }).setOrigin(0.5);

        scene.add.text(cx, cy + 22, team.team, {
            font: '9px Arial',
            fill: team.accent
        }).setOrigin(0.5);

        const hit = scene.add.rectangle(cx, cy, 124, 100).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            f1Audio.init();
            selectedCarIndex = idx;
            showMenu(scene);
        });
    });

    // BOTÓN SALIDA
    const startBox = scene.add.graphics();
    startBox.fillStyle(0xe10600, 1);
    startBox.fillRoundedRect(340, 478, 280, 46, 6);
    startBox.lineStyle(2, 0xffffff, 0.9);
    startBox.strokeRoundedRect(340, 478, 280, 46, 6);

    const startBtn = scene.add.text(480, 501, '¡INICIAR GRAN PREMIO! ▶', {
        font: '900 18px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        f1Audio.init();
        startGrandPrix(scene, currentTrackId, selectedCarIndex);
    });
}

// ============================================================================
// 6. CONSTRUCCIÓN DE PISTA GRAND PRIX CON PARRILLA F1 PINTADA
// ============================================================================
function startGrandPrix(scene, trackId, carIdx) {
    scene.children.removeAll();

    const tracks = window.DustracTracks || {};
    const track = tracks[trackId];
    if (!track) return;

    gameState = 'COUNTDOWN';
    ersBattery = 100;
    isKersActive = false;
    isDrsActive = false;

    scene.physics.world.setBounds(0, 0, track.worldWidth, track.worldHeight);
    scene.cameras.main.setBounds(0, 0, track.worldWidth, track.worldHeight);

    // 1. ASFALTO Y TERRENO OFICIALES (Continuos)
    scene.add.tileSprite(
        track.worldWidth / 2, track.worldHeight / 2,
        track.worldWidth, track.worldHeight,
        'dt_grass'
    ).setDepth(0);

    scene.tileMap = new Map();

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

    // 2. CAJONES DE PARRILLA DE SALIDA F1 (Pintados sobre el asfalto)
    const gridLayer = scene.add.graphics().setDepth(3);
    const n0 = track.nodes[0] || { x: 500, y: 500 };
    const n1 = track.nodes[1] || { x: n0.x, y: n0.y - 100 };
    const startAngleRad = Math.atan2(n1.y - n0.y, n1.x - n0.x);
    const startAngleDeg = Phaser.Math.RadToDeg(startAngleRad);

    const dirX = Math.cos(startAngleRad);
    const dirY = Math.sin(startAngleRad);
    const perpX = -Math.sin(startAngleRad);
    const perpY = Math.cos(startAngleRad);

    // Pintar 6 cajones de salida F1
    gridLayer.lineStyle(2, 0xffffff, 0.85);
    for (let slot = 0; slot < 6; slot++) {
        const row = Math.floor(slot / 2);
        const col = slot % 2 === 0 ? 1 : -1;
        const gx = n0.x - dirX * (row * 60) + perpX * (col * 24);
        const gy = n0.y - dirY * (row * 60) + perpY * (col * 24);

        // Línea frontal de cajón
        gridLayer.lineBetween(gx - perpX * 16, gy - perpY * 16, gx + perpX * 16, gy + perpY * 16);
    }

    // 3. CAPA DE MARCAS DE GOMA DE NEUMÁTICO SLICK F1
    skidLayer = scene.add.graphics().setDepth(4);

    // 4. ELEMENTOS DEL ENTORNO
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            scene.add.ellipse(obj.x + 8, obj.y + 10, 48, 38, 0x000000, 0.35).setDepth(13);
            scene.add.sprite(obj.x, obj.y, 'dt_tree').setDisplaySize(54, 54).setDepth(14);
        } else if (obj.r === 'grandstand') {
            scene.add.rectangle(obj.x + 10, obj.y + 12, 135, 135, 0x000000, 0.35).setAngle(obj.o).setDepth(11);
            scene.add.sprite(obj.x, obj.y, 'dt_grandstand').setDisplaySize(135, 135).setAngle(obj.o).setDepth(12);
        } else if (obj.r === 'tire') {
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(16, 16).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(18, 18).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'pit') {
            scene.add.sprite(obj.x, obj.y, 'dt_pit').setDisplaySize(256, 54).setAngle(obj.o).setDepth(5);
        }
    });

    // 5. PARRILLA DE SALIDA Y SPAWN DE MONOPLAZAS F1 (Pole Position para el Jugador)
    const pTeam = F1_TEAMS[carIdx];
    playerCar = spawnF1Vehicle(scene, n0.x + perpX * 24, n0.y + perpY * 24, pTeam.id, startAngleDeg, true, pTeam);

    // 5 Rivales IA
    aiCars = [];
    const rivals = F1_TEAMS.filter((_, i) => i !== carIdx);
    for (let i = 0; i < 5; i++) {
        const aiTeam = rivals[i % rivals.length];
        const row = Math.floor((i + 1) / 2);
        const col = (i + 1) % 2 === 0 ? 1 : -1;
        const sx = n0.x - dirX * (row * 60) + perpX * (col * 24);
        const sy = n0.y - dirY * (row * 60) + perpY * (col * 24);

        const ai = spawnF1Vehicle(scene, sx, sy, aiTeam.id, startAngleDeg, false, aiTeam);
        ai.targetNodeIdx = 1;
        ai.aiVelocity = 0;
        aiCars.push(ai);
    }

    // 6. CÁMARA CON LOOK-AHEAD
    lookAheadTarget = scene.add.circle(playerCar.x, playerCar.y, 4, 0x000000, 0).setDepth(0);
    scene.cameras.main.startFollow(lookAheadTarget, true, 0.08, 0.08);
    scene.cameras.main.setZoom(0.76); // Visibilidad perfecta de pista y rivales estilo MRO

    // 7. HUD OFICIAL F1 BROADCAST
    setupF1BroadcastHud(scene, track);

    // Semáforo F1 de 5 luces rojas a verde
    startF1Countdown(scene);
}

// Spawnear Monoplaza F1 Open-Wheel (40x22 px)
function spawnF1Vehicle(scene, x, y, textureKey, angleDeg, isPlayer, teamData) {
    const car = scene.physics.add.sprite(x, y, textureKey);
    car.setDisplaySize(40, 22);
    car.setAngle(angleDeg);
    car.setDepth(10);
    car.setCollideWorldBounds(true);
    car.isPlayer = isPlayer;
    car.teamData = teamData;
    car.currentLap = 1;
    car.lastCheckpoint = 0;
    car.driftAmount = 0;

    // Sombra aerodinámica bajo el chasis
    car.shadow = scene.add.ellipse(x + 4, y + 6, 42, 20, 0x000000, 0.45).setDepth(9);

    // Destellos KERS / DRS
    car.fxGfx = scene.add.graphics().setDepth(11);

    return car;
}

// Semáforo F1 oficial (5 luces rojas que se apagan para iniciar)
function startF1Countdown(scene) {
    let count = 3;
    const txt = scene.add.text(480, 230, '🔴 🔴 🔴', {
        font: '900 64px Arial', fill: '#ff1744', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    f1Audio.playCountdown(false);

    const event = scene.time.addEvent({
        delay: 850, repeat: 3,
        callback: () => {
            count--;
            if (count === 2) {
                txt.setText('🔴 🔴 🔴 🔴');
                f1Audio.playCountdown(false);
            } else if (count === 1) {
                txt.setText('🔴 🔴 🔴 🔴 🔴');
                f1Audio.playCountdown(false);
            } else if (count === 0) {
                txt.setText('🟢 LIGHTS OUT & AWAY WE GO! 🟢');
                txt.setFontSize(28);
                txt.setFill('#00e676');
                f1Audio.playCountdown(true);
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
// 7. TELEMETRÍA Y HUD BROADCAST ESTILO F1 TV
// ============================================================================
function setupF1BroadcastHud(scene, track) {
    hudContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Barra F1 superior
    const bar = scene.add.graphics();
    bar.fillStyle(0x0e1320, 0.92);
    bar.fillRect(0, 0, 960, 52);
    bar.lineStyle(2, 0xe10600, 0.95);
    bar.lineBetween(0, 52, 960, 52);
    hudContainer.add(bar);

    // Posición Oficial F1 (P1, P2...)
    hudPosBadge = scene.add.text(25, 12, 'P1', {
        font: '900 26px Arial', fill: '#ffffff', stroke: '#e10600', strokeThickness: 4
    });
    hudContainer.add(hudPosBadge);

    const posSub = scene.add.text(68, 20, '/ 6', {
        font: 'bold 14px Arial', fill: '#90a4ae'
    });
    hudContainer.add(posSub);

    // Vuelta
    hudLapText = scene.add.text(125, 17, `LAP 1/${TOTAL_LAPS}`, {
        font: '900 16px Arial', fill: '#ffffff'
    });
    hudContainer.add(hudLapText);

    // Cronómetro F1
    hudTimerText = scene.add.text(480, 14, '00:00.00', {
        font: '900 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5, 0);
    hudContainer.add(hudTimerText);

    // Delta / Vuelta Rápida
    hudDeltaText = scene.add.text(480, 36, 'BEST: --:--', {
        font: 'bold 11px Arial', fill: '#00f5d4'
    }).setOrigin(0.5, 0);
    hudContainer.add(hudDeltaText);

    // Indicador DRS
    hudDrsBadge = scene.add.text(675, 18, 'DRS OFF', {
        font: '900 13px Arial', fill: '#546e7a'
    });
    hudContainer.add(hudDrsBadge);

    // Velocímetro digital
    hudSpeedText = scene.add.text(825, 12, '0 KM/H', {
        font: '900 22px Arial', fill: '#00e676'
    }).setOrigin(1, 0);
    hudContainer.add(hudSpeedText);

    // Marcha
    hudGearText = scene.add.text(880, 14, 'G1', {
        font: '900 20px Arial', fill: '#ffe600'
    });
    hudContainer.add(hudGearText);

    // Barra de Batería ERS / KERS (Esquina inferior izquierda)
    const ersBox = scene.add.graphics();
    ersBox.fillStyle(0x0a0f1d, 0.88);
    ersBox.fillRoundedRect(18, 470, 190, 48, 6);
    ersBox.lineStyle(1.5, 0x00f5d4, 0.8);
    ersBox.strokeRoundedRect(18, 470, 190, 48, 6);
    hudContainer.add(ersBox);

    const ersLabel = scene.add.text(28, 477, '⚡ ERS HYBRID ENERGY', {
        font: '900 11px Arial', fill: '#00f5d4'
    });
    hudContainer.add(ersLabel);

    hudErsBar = scene.add.graphics();
    hudContainer.add(hudErsBar);

    // Radar Minimapa
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(101);
}

// ============================================================================
// 8. BUCLE UPDATE F1: FÍSICAS, KERS, DRS, CÁMARA Y TELEMETRÍA
// ============================================================================
function f1Update(time, delta) {
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

        if (bestLapTime) {
            const bm = Math.floor(bestLapTime / 60000);
            const bs = Math.floor((bestLapTime % 60000) / 1000);
            const bcs = Math.floor((bestLapTime % 1000) / 10);
            hudDeltaText.setText(`🟣 FASTEST: ${bm < 10 ? '0' : ''}${bm}:${bs < 10 ? '0' : ''}${bs}.${bcs < 10 ? '0' : ''}${bcs}`);
        }
    }

    // 1. Control del F1 del Jugador (Downforce, KERS y DRS)
    updateF1Player(dt, track);

    // 2. IA de Monoplazas Rivales
    if (gameState === 'RACE') {
        aiCars.forEach(ai => updateAiF1(ai, dt, track));
    }

    // 3. Colisiones
    handleCollisions();

    // 4. Cámara F1 Smooth Follow
    updateF1Camera();

    // 5. Gráficos de KERS / DRS y Sombras
    updateF1Visuals();

    // 6. Minimapa
    renderMinimap(track);

    // 7. Clasificación
    updateStandings(track);
}

// Físicas de Monoplaza F1 con Downforce, KERS y DRS
function updateF1Player(dt, track) {
    const pTeam = playerCar.teamData;
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;
    const kersInput = keys.space.isDown || keys.shift.isDown || touchKers;

    // Superficie
    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = raceScene.tileMap.get(`${ti},${tj}`);

    let grip = 1.0;
    if (tile) {
        if (tile.t === 'sand') {
            grip = 0.42;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059, 12);
        } else if (tile.t.startsWith('sandGrass')) {
            grip = 0.65;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8, 10);
        } else if (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45')) {
            const distCenter = Math.hypot(playerCar.x - (ti * 256 + 128), playerCar.y - (tj * 256 + 128));
            if (distCenter > 88 && distCenter < 122) {
                f1Audio.playKerb();
                raceScene.cameras.main.shake(30, 0.0015);
            }
        } else {
            grip = 0.55;
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c, 9);
        }
    } else {
        grip = 0.50;
    }

    // Activación de KERS
    isKersActive = false;
    if (gameState === 'RACE' && kersInput && ersBattery > 2 && gas) {
        isKersActive = true;
        ersBattery = Math.max(0, ersBattery - dt * 22); // Consume batería
    } else if (!isKersActive) {
        // Regeneración MGU-K al frenar o levantar gas
        if (brake) {
            ersBattery = Math.min(100, ersBattery + dt * 18);
        } else if (!gas) {
            ersBattery = Math.min(100, ersBattery + dt * 8);
        }
    }

    // Detección DRS (En rectas a alta velocidad)
    isDrsActive = false;
    if (gameState === 'RACE' && Math.abs(playerSpeed) > 230 && !left && !right && grip > 0.9) {
        isDrsActive = true;
    }

    // Velocidad punta y aceleración con KERS y DRS
    let topSpeed = pTeam.speed * grip;
    let accelRate = pTeam.accel * grip;

    if (isKersActive) {
        topSpeed += 55;   // +55 KM/H con KERS
        accelRate += 160; // Par eléctrico instantáneo
        spawnKersSparks(playerCar.x, playerCar.y, playerCar.angle);
    }
    if (isDrsActive) {
        topSpeed += 30;   // +30 KM/H por menor resistencia al aire
    }

    if (gameState === 'RACE') {
        if (gas) {
            playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
        } else if (brake) {
            playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.6 * dt);
        } else {
            playerSpeed *= 0.986; // Freno motor de F1
        }

        // Dirección de alta carga aerodinámica F1
        const steerSpeedFactor = playerSpeed > 30 ? 1 : Math.max(0.2, playerSpeed / 30);
        const steer = pTeam.handling * steerSpeedFactor;

        if (left) playerCar.angle -= steer;
        if (right) playerCar.angle += steer;

        // Derrape controlado F1
        const isTurning = (left || right) && Math.abs(playerSpeed) > 130;
        if (isTurning || (brake && Math.abs(playerSpeed) > 90)) {
            playerCar.driftAmount = Math.min(1, playerCar.driftAmount + dt * 4.0);
            f1Audio.setDriftIntensity(playerCar.driftAmount);
            drawF1SkidMarks(playerCar.x, playerCar.y, playerCar.angle, playerCar.driftAmount);
        } else {
            playerCar.driftAmount = Math.max(0, playerCar.driftAmount - dt * 5.0);
            f1Audio.setDriftIntensity(playerCar.driftAmount);
        }
    } else {
        playerSpeed = 0;
    }

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    playerCar.setVelocity(Math.cos(rad) * playerSpeed, Math.sin(rad) * playerSpeed);

    // Audio F1 y Telemetría
    const engineData = f1Audio.updateEngine(playerSpeed, pTeam.speed, gas, isKersActive);
    updateF1Telemetry(engineData);

    const kmh = Math.floor(Math.abs(playerSpeed) * 0.65);
    hudSpeedText.setText(`${kmh} KM/H`);

    checkLap(playerCar, track);
}

// Telemetría F1
function updateF1Telemetry(engineData) {
    if (!hudContainer) return;

    const gear = engineData.gear || 1;
    hudGearText.setText(`G${gear}`);

    // Barra de Batería ERS
    if (hudErsBar) {
        hudErsBar.clear();
        const bx = 28, by = 496, bw = 170, bh = 14;
        hudErsBar.fillStyle(0x1a2130, 0.9);
        hudErsBar.fillRect(bx, by, bw, bh);

        const batW = (ersBattery / 100) * bw;
        let batColor = 0x00f5d4;
        if (ersBattery < 25) batColor = 0xff1744;
        else if (ersBattery < 50) batColor = 0xfee440;

        hudErsBar.fillStyle(batColor, 1);
        hudErsBar.fillRect(bx, by, batW, bh);
    }

    // Insignia DRS
    if (hudDrsBadge) {
        if (isDrsActive) {
            hudDrsBadge.setText('🟢 DRS ACTIVE');
            hudDrsBadge.setFill('#00e676');
        } else if (Math.abs(playerSpeed) > 210) {
            hudDrsBadge.setText('⚪ DRS READY');
            hudDrsBadge.setFill('#00f5d4');
        } else {
            hudDrsBadge.setText('DRS OFF');
            hudDrsBadge.setFill('#546e7a');
        }
    }
}

// Cámara F1
function updateF1Camera() {
    if (!raceScene || !raceScene.cameras || !raceScene.cameras.main || !playerCar || !lookAheadTarget) return;

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    const lookDist = (playerSpeed / 520) * 115;
    lookAheadTarget.x = playerCar.x + Math.cos(rad) * lookDist;
    lookAheadTarget.y = playerCar.y + Math.sin(rad) * lookDist;

    const targetZoom = Math.max(0.70, 0.77 - (Math.abs(playerSpeed) / 520) * 0.08);
    raceScene.cameras.main.zoom = Phaser.Math.Linear(raceScene.cameras.main.zoom, targetZoom, 0.05);
}

// Marcas de goma de monoplaza F1
function drawF1SkidMarks(x, y, angleDeg, intensity) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const spread = 9; // Ruedas traseras F1
    const lx = Math.cos(rad) * spread;
    const ly = Math.sin(rad) * spread;

    const alpha = Math.min(0.40, 0.12 + intensity * 0.28);
    skidLayer.fillStyle(0x080a0d, alpha);
    skidLayer.fillCircle(x + lx, y + ly, 2.2);
    skidLayer.fillCircle(x - lx, y - ly, 2.2);
}

// Chispas eléctricas del KERS
function spawnKersSparks(x, y, angleDeg) {
    if (!raceScene) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 180);
    const sx = x + Math.cos(rad) * 16 + (Math.random() - 0.5) * 6;
    const sy = y + Math.sin(rad) * 16 + (Math.random() - 0.5) * 6;

    const spark = raceScene.add.circle(sx, sy, 3, 0x00f5d4, 0.9).setDepth(11);
    raceScene.tweens.add({
        targets: spark,
        radius: 1, alpha: 0,
        x: sx + (Math.random() - 0.5) * 12,
        y: sy + (Math.random() - 0.5) * 12,
        duration: 200,
        onComplete: () => spark.destroy()
    });
}

function updateF1Visuals() {
    const all = [playerCar, ...aiCars];
    all.forEach(car => {
        if (!car || !car.active) return;
        if (car.shadow) {
            car.shadow.x = car.x + 4;
            car.shadow.y = car.y + 6;
            car.shadow.angle = car.angle;
        }

        if (car.fxGfx) {
            car.fxGfx.clear();
            // Si el coche es el jugador y tiene DRS activo, pintar flap abierto verde
            if (car.isPlayer && isDrsActive) {
                const rad = Phaser.Math.DegToRad(car.angle);
                const rx = car.x - Math.cos(rad) * 16;
                const ry = car.y - Math.sin(rad) * 16;
                car.fxGfx.fillStyle(0x00e676, 0.8);
                car.fxGfx.fillCircle(rx, ry, 5);
            }
        }
    });
}

// IA de Monoplazas Rivales
function updateAiF1(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[ai.targetNodeIdx];
    const angleRad = Math.atan2(targetNode.y - ai.y, targetNode.x - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);

    const diff = Phaser.Math.Angle.WrapDegrees(targetDeg - ai.angle);
    const step = ai.teamData.handling * 1.0;
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), step);

    if (Math.abs(diff) > 38) {
        ai.aiVelocity = Math.max(ai.teamData.speed * 0.48, (ai.aiVelocity || 0) - ai.teamData.accel * 1.4 * dt);
    } else {
        const maxSpeed = ai.teamData.speed * 0.94;
        ai.aiVelocity = Math.min(maxSpeed, (ai.aiVelocity || 0) + ai.teamData.accel * 0.9 * dt);
    }

    const rad = Phaser.Math.DegToRad(ai.angle);
    ai.setVelocity(Math.cos(rad) * ai.aiVelocity, Math.sin(rad) * ai.aiVelocity);

    const dist = Math.hypot(ai.x - targetNode.x, ai.y - targetNode.y);
    if (dist < 160) {
        ai.lastCheckpoint = ai.targetNodeIdx;
        ai.targetNodeIdx = (ai.targetNodeIdx + 1) % nodes.length;
        if (ai.targetNodeIdx === 0) ai.currentLap++;
    }
}

// Colisiones
function handleCollisions() {
    aiCars.forEach(ai => {
        const dist = Math.hypot(playerCar.x - ai.x, playerCar.y - ai.y);
        if (dist < 28) {
            f1Audio.playCrash();
            playerSpeed *= 0.85;
            ai.aiVelocity *= 0.85;

            const ang = Math.atan2(playerCar.y - ai.y, playerCar.x - ai.x);
            playerCar.x += Math.cos(ang) * 5;
            playerCar.y += Math.sin(ang) * 5;
            ai.x -= Math.cos(ang) * 5;
            ai.y -= Math.sin(ang) * 5;

            spawnDust(raceScene, (playerCar.x + ai.x) / 2, (playerCar.y + ai.y) / 2, 'dt_sparkle', 0xffea00, 20);
            raceScene.cameras.main.shake(40, 0.003);
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
        duration: 220, onComplete: () => p.destroy()
    });
}

// Paso por meta
function checkLap(car, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[playerNextNodeIdx];
    const dist = Math.hypot(car.x - targetNode.x, car.y - targetNode.y);

    if (dist < 185) {
        car.lastCheckpoint = playerNextNodeIdx;
        playerNextNodeIdx = (playerNextNodeIdx + 1) % nodes.length;

        if (playerNextNodeIdx === 1) {
            f1Audio.playLap();
            playerLap++;

            const lapDuration = Date.now() - lapStartTime;
            if (!bestLapTime || lapDuration < bestLapTime) {
                bestLapTime = lapDuration;
            }

            lapStartTime = Date.now();

            if (playerLap > TOTAL_LAPS) {
                endGrandPrix();
            } else {
                hudLapText.setText(`LAP ${playerLap}/${TOTAL_LAPS}`);
            }
        }
    }
}

// Fin de Gran Premio
function endGrandPrix() {
    gameState = 'FINISHED';
    playerSpeed = 0;
    playerCar.setVelocity(0, 0);

    const overlay = raceScene.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x080c16, 0.9);
    overlay.fillRect(0, 0, 960, 540);

    raceScene.add.text(480, 190, '🏆 GRAND PRIX FINISHED! 🏆', {
        font: '900 36px Arial', fill: '#00f5d4', stroke: '#e10600', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    raceScene.add.text(480, 255, `FINAL POSITION: ${hudPosBadge.text} DE 6`, {
        font: 'bold 22px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const retBtn = raceScene.add.text(480, 345, 'VOLVER AL MENÚ DE CIRCUITOS', {
        font: 'bold 18px Arial', fill: '#fee440', backgroundColor: '#111827', padding: { x: 24, y: 14 }
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
    radarGraphics.fillStyle(0x090d18, 0.9);
    radarGraphics.fillRoundedRect(rx, ry, rw, rh, 6);
    radarGraphics.lineStyle(1.5, 0xe10600, 0.85);
    radarGraphics.strokeRoundedRect(rx, ry, rw, rh, 6);

    const sx = (rw - 20) / track.worldWidth;
    const sy = (rh - 20) / track.worldHeight;

    radarGraphics.lineStyle(2.5, 0x223147, 0.9);
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
    if (hudPosBadge) hudPosBadge.setText(`P${rank}`);
}
