// ============================================================================
// REAL GP MOTORSPORT : OFFICIAL GT3 EDITION (Phaser 3 Engine V3)
// - Circuito Gran Premio con VALLAS METÁLICAS DE CONTENCIÓN Y MUROS 3D.
// - Trazada Dinámica Guiada (Verde = Acelerar, Rojo = Frenar).
// - Flechas y Carteles Chevron de Curva (<<< y >>>) en cada frenada.
// - Sistema de Navegación de Curvas en el HUD ("HORQUILLA IZQ: FRENAR").
// - Físicas con Rebote en Guardarraíl (el coche NUNCA se pierde del circuito).
// - 6 Superdeportivos GT3 Oficiales con Telemetría de Retransmisión y Minimapa Radar.
// ============================================================================

if (window.Telegram && window.Telegram.WebApp) {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    } catch(e) {}
}

// ----------------------------------------------------------------------------
// 1. SINTETIZADOR DE AUDIO GT3 MOTORSPORT (Web Audio API)
// ----------------------------------------------------------------------------
class GT3AudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.subOsc = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.isReady = false;
        this.currentGear = 1;
        this.gearRatios = [0.20, 0.40, 0.60, 0.80, 1.0];
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Aullido motor GT3
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(62, this.ctx.currentTime);

            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(124, this.ctx.currentTime);

            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(31, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(500, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.048, this.ctx.currentTime);

            this.engineOsc1.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();
            this.subOsc.start();

            // Chirrido de neumáticos
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(480, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(950, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            this.isReady = true;
        } catch (e) {}
    }

    update(speed, maxSpeed, isGas) {
        if (!this.ctx || !this.engineOsc1) return { gear: 1, rpmRatio: 0 };
        const now = this.ctx.currentTime;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        let gRatio = ratio / this.gearRatios[0];
        let gear = 1;
        for (let g = 0; g < this.gearRatios.length; g++) {
            if (ratio <= this.gearRatios[g] || g === this.gearRatios.length - 1) {
                const prev = g === 0 ? 0 : this.gearRatios[g - 1];
                gRatio = (ratio - prev) / (this.gearRatios[g] - prev);
                gear = g + 1;
                break;
            }
        }

        const baseFreq = 58;
        const targetFreq = baseFreq + gRatio * 155;
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);
        this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

        const filterCut = isGas ? 650 + ratio * 900 : 380;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.052 : 0.024;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        return { gear: gear, rpmRatio: gRatio };
    }

    setDrift(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        this.driftGain.gain.setTargetAtTime(clamped * 0.042, this.ctx.currentTime, 0.035);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(34, now + 0.16);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.38 : 0.14));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.38 : 0.14));
    }
}
const gtAudio = new GT3AudioEngine();

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL CIRCUITO Y TRAZADA DE ALTA PRECISIÓN (1376 x 768)
// ----------------------------------------------------------------------------
const TRACK_WIDTH = 1376;
const TRACK_HEIGHT = 768;
const ROAD_HALF_WIDTH = 48; // Ancho máximo de la calzada de asfalto

// Puntos de la trazada con metadatos de curvas, frenadas y consejos
const GP_CIRCUIT_PATH = [
    { x: 688, y: 635, name: 'RECTA DE META', type: 'straight', icon: '⬆', advice: 'GAS A FONDO' },
    { x: 500, y: 635, name: 'RECTA PRINCIPAL', type: 'straight', icon: '⬆', advice: 'GAS A FONDO' },
    { x: 340, y: 630, name: 'FRENADA CURVA 1', type: 'brake', icon: '↰', advice: 'FRENAR' },
    { x: 200, y: 600, name: 'CURVÓN IZQUIERDO', type: 'turn_left', icon: '↰', advice: 'VÉRTICE' },
    { x: 130, y: 520, name: 'CURVA GRANDE', type: 'turn_left', icon: '↰', advice: 'MANTENER' },
    { x: 90, y: 400,  name: 'VÉRTICE OESTE', type: 'turn_left', icon: '↰', advice: 'ACELERAR' },
    { x: 110, y: 280, name: 'SALIDA CURVA 1', type: 'straight', icon: '⬆', advice: 'GAS' },
    { x: 180, y: 200, name: 'ENLACE TRASERO', type: 'turn_right', icon: '↱', advice: 'GIRO SUAVE' },
    { x: 320, y: 165, name: 'RECTA TRASERA (DRS)', type: 'straight', icon: '⬆', advice: 'MÁXIMA VEL' },
    { x: 550, y: 160, name: 'RECTA NORTE', type: 'straight', icon: '⬆', advice: 'GAS A FONDO' },
    { x: 800, y: 160, name: 'CENTRO RECTA NORTE', type: 'straight', icon: '⬆', advice: 'MÁXIMA VEL' },
    { x: 1040, y: 170, name: 'FRENADA HORQUILLA', type: 'brake', icon: '↱', advice: 'FRENAR FUERTE' },
    { x: 1160, y: 210, name: 'HORQUILLA ESTE', type: 'turn_right', icon: '↱', advice: 'VÉRTICE' },
    { x: 1225, y: 300, name: 'CURVA ESTADIO', type: 'turn_right', icon: '↱', advice: 'PERALTE' },
    { x: 1230, y: 410, name: 'DESCENSO ESTADIO', type: 'turn_right', icon: '↱', advice: 'ACELERAR' },
    { x: 1180, y: 520, name: 'CHICANE SUR', type: 'turn_right', icon: '↱', advice: 'TRAZADA' },
    { x: 1070, y: 600, name: 'CURVA FINAL', type: 'turn_right', icon: '↱', advice: 'ENCARAR META' },
    { x: 940, y: 635,  name: 'ACELERACIÓN META', type: 'straight', icon: '⬆', advice: 'GAS A FONDO' },
    { x: 820, y: 635,  name: 'APROXIMACIÓN META', type: 'straight', icon: '⬆', advice: 'A FONDO' }
];

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#0c0e14',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: { preload: realPreload, create: realCreate, update: realUpdate }
};

const game = new Phaser.Game(config);

let mainScene;
let playerCar;
let aiCars = [];
let skidLayer;
let barrierLayer;
let racingLineLayer;
let chevronLayer;
let particlesLayer;
let camTarget;
let gameState = 'COUNTDOWN';

let playerSpeed = 0;
let playerAngle = Math.PI; // Hacia la izquierda (recta de meta)
let playerLap = 1;
const TOTAL_LAPS = 3;
let currentWaypointIdx = 0;
let lapStartTime = 0;

let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// Elementos del DOM HUD
let domSpeed, domGear, domRpm, domPos, domLap, domTime, domLeaderboard, domOfftrack, radarCanvas, radarCtx;
let cornerIconEl, cornerNameEl, cornerActionEl;

// ----------------------------------------------------------------------------
// 3. PRELOAD
// ----------------------------------------------------------------------------
function realPreload() {
    this.load.image('real_circuit_bg', 'assets/real_gp_circuit.jpg');
    this.load.image('real_cars_sheet', 'assets/real_gt_cars.jpg');
}

// ----------------------------------------------------------------------------
// 4. CREATE
// ----------------------------------------------------------------------------
function realCreate() {
    mainScene = this;

    // 1. Fondo de circuito aéreo de base
    this.add.image(0, 0, 'real_circuit_bg').setOrigin(0, 0);
    this.physics.world.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    // 2. Extraer los 6 coches GT3
    sliceGT3Cars(this);

    // 3. Capas gráficas de circuito con jerarquía visual profesional
    racingLineLayer = this.add.graphics().setDepth(1); // Trazada dinámica sobre el asfalto
    skidLayer = this.add.graphics().setDepth(2);       // Marcas de goma negra permanentes
    particlesLayer = this.add.graphics().setDepth(3);  // Humo y chispas de barrera
    barrierLayer = this.add.graphics().setDepth(5);    // Vallas de contención Armco y pianos
    chevronLayer = this.add.graphics().setDepth(6);    // Carteles reflectantes de curva

    // 4. Dibujar barreras físicas y trazada para delimitar 100% la pista
    buildCircuitBarriersAndRacingLine(this);

    // 5. Configurar controles y enlaces DOM
    setupControls(this);
    setupDOM();

    // 6. Instanciar Jugador y Rivales IA
    spawnGT3Vehicles(this);

    // 7. Objeto Dummy para Cámara Predictiva (Lookahead)
    camTarget = this.add.container(playerCar.container.x, playerCar.container.y);
    this.cameras.main.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.cameras.main.startFollow(camTarget, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.22);

    // 8. Iniciar cuenta atrás
    startCountdownSequence(this);
}

function setupDOM() {
    domSpeed = document.getElementById('hud-speed');
    domGear = document.getElementById('hud-gear');
    domRpm = document.getElementById('gt-rpm-fill');
    domPos = document.getElementById('hud-pos');
    domLap = document.getElementById('hud-lap');
    domTime = document.getElementById('hud-time');
    domLeaderboard = document.getElementById('lb-entries');
    domOfftrack = document.getElementById('gt-offtrack');
    radarCanvas = document.getElementById('gt-radar-canvas');
    if (radarCanvas) radarCtx = radarCanvas.getContext('2d');

    cornerIconEl = document.getElementById('corner-icon');
    cornerNameEl = document.getElementById('corner-name');
    cornerActionEl = document.getElementById('corner-action');
}

// ----------------------------------------------------------------------------
// 5. DIBUJO DE BARRERAS ARMCO Y TRAZADA DINÁMICA ILUMINADA
// ----------------------------------------------------------------------------
function buildCircuitBarriersAndRacingLine(scene) {
    const N = GP_CIRCUIT_PATH.length;

    // A) TRAZADA DINÁMICA DE COMPETICIÓN (Ribbon continuo en el asfalto)
    for (let i = 0; i < N; i++) {
        const p1 = GP_CIRCUIT_PATH[i];
        const p2 = GP_CIRCUIT_PATH[(i + 1) % N];

        // Color según sección: Verde en rectas, Amarillo en aproximación, Rojo en frenadas
        let lineColor = 0x22c55e; // Verde
        let alpha = 0.65;
        if (p1.type === 'brake') {
            lineColor = 0xef4444; // Rojo frenada
            alpha = 0.90;
        } else if (p1.type === 'turn_left' || p1.type === 'turn_right') {
            lineColor = 0xf59e0b; // Amarillo/Ámbar
            alpha = 0.80;
        }

        // Trazada central brillante
        racingLineLayer.lineStyle(12, lineColor, alpha);
        racingLineLayer.beginPath();
        racingLineLayer.moveTo(p1.x, p1.y);
        racingLineLayer.lineTo(p2.x, p2.y);
        racingLineLayer.strokePath();

        // Núcleo blanco de alta definición
        racingLineLayer.lineStyle(3, 0xffffff, 0.85);
        racingLineLayer.beginPath();
        racingLineLayer.moveTo(p1.x, p1.y);
        racingLineLayer.lineTo(p2.x, p2.y);
        racingLineLayer.strokePath();

        // Flechitas de dirección pintadas en el asfalto cada tramo
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        drawAsphaltChevron(racingLineLayer, midX, midY, angle, lineColor);
    }

    // B) BARRERAS FÍSICAS DE CONTENCIÓN (ARMCO GUARDRAILS & MUROS DE NEUMÁTICOS)
    for (let i = 0; i < N; i++) {
        const p1 = GP_CIRCUIT_PATH[i];
        const p2 = GP_CIRCUIT_PATH[(i + 1) % N];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Valla exterior (+ROAD_HALF_WIDTH)
        const out1X = p1.x + nx * ROAD_HALF_WIDTH;
        const out1Y = p1.y + ny * ROAD_HALF_WIDTH;
        const out2X = p2.x + nx * ROAD_HALF_WIDTH;
        const out2Y = p2.y + ny * ROAD_HALF_WIDTH;

        // Valla interior (-ROAD_HALF_WIDTH)
        const in1X = p1.x - nx * ROAD_HALF_WIDTH;
        const in1Y = p1.y - ny * ROAD_HALF_WIDTH;
        const in2X = p2.x - nx * ROAD_HALF_WIDTH;
        const in2Y = p2.y - ny * ROAD_HALF_WIDTH;

        // Sombra de valla exterior
        barrierLayer.lineStyle(6, 0x000000, 0.50);
        barrierLayer.beginPath();
        barrierLayer.moveTo(out1X + 3, out1Y + 3);
        barrierLayer.lineTo(out2X + 3, out2Y + 3);
        barrierLayer.strokePath();

        // Raíl metálico exterior (Armco con postes)
        barrierLayer.lineStyle(4, (i % 2 === 0 ? 0xffffff : 0xef4444), 0.95);
        barrierLayer.beginPath();
        barrierLayer.moveTo(out1X, out1Y);
        barrierLayer.lineTo(out2X, out2Y);
        barrierLayer.strokePath();

        // Raíl metálico interior
        barrierLayer.lineStyle(4, (i % 2 === 0 ? 0xffffff : 0x3b82f6), 0.95);
        barrierLayer.beginPath();
        barrierLayer.moveTo(in1X, in1Y);
        barrierLayer.lineTo(in2X, in2Y);
        barrierLayer.strokePath();

        // Postes de soporte cada segmento
        barrierLayer.fillStyle(0x0f172a, 1);
        barrierLayer.fillCircle(out1X, out1Y, 3.5);
        barrierLayer.fillCircle(in1X, in1Y, 3.5);
    }

    // C) PANELES GIGANTES DE FLECHAS CHEVRON (<<< y >>>) EN LAS CURVAS
    const chevronLocations = [
        { x: 310, y: 645, angle: Math.PI * 0.95, text: '◀◀ CURVA 1' },
        { x: 160, y: 580, angle: -Math.PI * 0.70, text: '◀◀ VÉRTICE' },
        { x: 75,  y: 380, angle: -Math.PI * 0.50, text: '▲ RECTA' },
        { x: 1060, y: 155, angle: 0.15, text: '▶▶ HORQUILLA' },
        { x: 1245, y: 280, angle: Math.PI * 0.45, text: '▶▶ ESTADIO' },
        { x: 1200, y: 540, angle: Math.PI * 0.85, text: '▶▶ META' }
    ];

    chevronLocations.forEach(ch => {
        drawTrackChevronSign(chevronLayer, ch.x, ch.y, ch.angle, ch.text);
    });
}

function drawAsphaltChevron(g, x, y, angle, color) {
    g.fillStyle(color, 0.9);
    const size = 10;
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const perpX = -forwardY;
    const perpY = forwardX;

    g.beginPath();
    g.moveTo(x + forwardX * size, y + forwardY * size);
    g.lineTo(x - forwardX * (size * 0.5) + perpX * size, y - forwardY * (size * 0.5) + perpY * size);
    g.lineTo(x - forwardX * (size * 0.2), y - forwardY * (size * 0.2));
    g.lineTo(x - forwardX * (size * 0.5) - perpX * size, y - forwardY * (size * 0.5) - perpY * size);
    g.closePath();
    g.fill();
}

function drawTrackChevronSign(g, x, y, angle, label) {
    g.save();
    // Tablero rectangular con fondo negro y borde reflectante amarillo
    g.fillStyle(0x0a0f1d, 0.95);
    g.lineStyle(2, 0xfacc15, 1);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const w = 48;
    const h = 18;

    // Caja orientada
    g.beginPath();
    g.moveTo(x - cos * w + sin * h, y - sin * w - cos * h);
    g.lineTo(x + cos * w + sin * h, y + sin * w - cos * h);
    g.lineTo(x + cos * w - sin * h, y + sin * w + cos * h);
    g.lineTo(x - cos * w - sin * h, y - sin * w + cos * h);
    g.closePath();
    g.fill();
    g.strokePath();

    // Flechas reflectantes rojas/amarillas en el cartel
    g.fillStyle(0xef4444, 1);
    for (let k = -1; k <= 1; k++) {
        const cx = x + cos * (k * 16);
        const cy = y + sin * (k * 16);
        g.fillCircle(cx, cy, 4);
    }
    g.restore();
}

// ----------------------------------------------------------------------------
// 6. SLICING Y GENERACIÓN DE VEHÍCULOS GT3
// ----------------------------------------------------------------------------
function sliceGT3Cars(scene) {
    const sourceImg = scene.textures.get('real_cars_sheet').getSourceImage();
    const carWidth = 440;
    const carHeight = 240;
    const startX = [30, 530];
    const startY = [40, 370, 710];
    const carIds = [
        'gt_porsche_grello',
        'gt_ferrari_scuderia',
        'gt_aston_valvoline',
        'gt_bmw_m_motorsport',
        'gt_iron_dames',
        'gt_mclaren_gulf'
    ];

    let idx = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
            const canvas = document.createElement('canvas');
            canvas.width = carWidth;
            canvas.height = carHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImg, startX[c], startY[r], carWidth, carHeight, 0, 0, carWidth, carHeight);

            const imgData = ctx.getImageData(0, 0, carWidth, carHeight);
            const data = imgData.data;
            for (let p = 0; p < data.length; p += 4) {
                if (data[p] < 22 && data[p+1] < 22 && data[p+2] < 22) {
                    data[p+3] = 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            scene.textures.addCanvas(carIds[idx], canvas);
            idx++;
        }
    }
}

function spawnGT3Vehicles(scene) {
    playerCar = createGTCarEntity(scene, 'gt_ferrari_scuderia', 688, 635, 'TÚ (Ferrari 488 GT3)', '#ef4444');
    playerCar.container.setDepth(10);
    playerCar.isPlayer = true;

    const aiConfigs = [
        { id: 'gt_porsche_grello', x: 620, y: 620, name: 'Manthey Porsche 911', color: '#a3e635', speed: 435 },
        { id: 'gt_bmw_m_motorsport', x: 560, y: 650, name: 'BMW M4 Rowe GT3', color: '#f8fafc', speed: 425 },
        { id: 'gt_aston_valvoline', x: 500, y: 620, name: 'Aston Martin Vantage', color: '#3b82f6', speed: 430 },
        { id: 'gt_mclaren_gulf', x: 440, y: 650, name: 'McLaren 720S Gulf', color: '#f97316', speed: 420 },
        { id: 'gt_iron_dames', x: 380, y: 620, name: 'Iron Dames GT3', color: '#ec4899', speed: 415 }
    ];

    aiCars = [];
    aiConfigs.forEach(cfg => {
        const ai = createGTCarEntity(scene, cfg.id, cfg.x, cfg.y, cfg.name, cfg.color);
        ai.speed = cfg.speed;
        ai.waypointIdx = 1;
        ai.lap = 1;
        ai.isPlayer = false;
        ai.container.setDepth(9);
        aiCars.push(ai);
    });
}

function createGTCarEntity(scene, textureKey, x, y, name, color) {
    const container = scene.add.container(x, y);

    const shadow = scene.add.ellipse(4, 4, 68, 36, 0x000000, 0.60);
    container.add(shadow);

    const sprite = scene.add.sprite(0, 0, textureKey);
    sprite.setDisplaySize(58, 34);
    sprite.setAngle(180);
    container.add(sprite);

    const hlG = scene.add.graphics();
    hlG.fillStyle(0xffffff, 0.20);
    hlG.beginPath();
    hlG.moveTo(26, -7);
    hlG.lineTo(135, -36);
    hlG.lineTo(135, 36);
    hlG.lineTo(26, 7);
    hlG.closePath();
    hlG.fill();
    container.add(hlG);

    return {
        container: container,
        sprite: sprite,
        name: name,
        color: color,
        speed: 0,
        angle: Math.PI,
        lap: 1,
        waypointIdx: 0,
        totalProgress: 0
    };
}

function setupControls(scene) {
    keys = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D
    });

    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); gtAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); gtAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);

    scene.input.on('pointerdown', () => gtAudio.init());
}

// ----------------------------------------------------------------------------
// 7. UPDATE : FÍSICAS, COLISIÓN CON VALLAS Y NAVEGACIÓN
// ----------------------------------------------------------------------------
let lastDriftPos = null;
let lastLeaderboardUpdate = 0;
let sparksParticles = [];

function realUpdate(time, delta) {
    const dt = delta / 1000;
    if (gameState !== 'RACE') return;

    updatePlayer(dt);
    updateAI(dt);
    updateCameraLookAhead();
    updateTelemetry(time);
    updateCornerNavigator();
    renderRadar();
    renderParticles(dt);
}

function updatePlayer(dt) {
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    const maxSpeed = 490;
    const accelRate = 410;
    const brakeRate = 560;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-120, playerSpeed - brakeRate * dt);
    } else {
        playerSpeed *= 0.985;
    }

    const turnRate = 4.3;
    if (left) playerAngle -= turnRate * dt * (playerSpeed >= 0 ? 1 : -1);
    if (right) playerAngle += turnRate * dt * (playerSpeed >= 0 ? 1 : -1);

    let nextX = playerCar.container.x + Math.cos(playerAngle) * playerSpeed * dt;
    let nextY = playerCar.container.y + Math.sin(playerAngle) * playerSpeed * dt;

    // ========================================================================
    // BARRERA DE CONTENCIÓN FÍSICA : EL COCHE REBOTA Y DESLIZA EN LA VALLA
    // ========================================================================
    const circuitInfo = getClosestCircuitSegment(nextX, nextY);
    const dist = circuitInfo.distance;

    // Si el coche toca el guardarraíl (más allá de ROAD_HALF_WIDTH - 2)
    if (dist > (ROAD_HALF_WIDTH - 3)) {
        // Punto de colisión en la barrera
        const clampRatio = (ROAD_HALF_WIDTH - 4) / dist;
        nextX = circuitInfo.closestX + (nextX - circuitInfo.closestX) * clampRatio;
        nextY = circuitInfo.closestY + (nextY - circuitInfo.closestY) * clampRatio;

        // Fricción y rebote contra la valla
        playerSpeed *= 0.88;
        gtAudio.playCrash();

        // Chispas metálicas al rozar la barrera
        for (let s = 0; s < 4; s++) {
            sparksParticles.push({
                x: nextX,
                y: nextY,
                vx: (Math.random() - 0.5) * 80 + Math.cos(playerAngle) * 30,
                vy: (Math.random() - 0.5) * 80 + Math.sin(playerAngle) * 30,
                radius: 3.5,
                alpha: 1,
                color: Math.random() > 0.5 ? 0xfacc15 : 0xf97316,
                life: 0.28
            });
        }
    }

    playerCar.container.x = nextX;
    playerCar.container.y = nextY;
    playerCar.container.rotation = playerAngle;
    playerCar.speed = playerSpeed;
    playerCar.angle = playerAngle;

    // Fricción y sonido GT3
    const isDrifting = (left || right) && Math.abs(playerSpeed) > 270;
    gtAudio.setDrift(isDrifting ? 1.0 : 0);
    gtAudio.update(playerSpeed, 490, gas);

    // Huellas de goma sobre el asfalto
    if (isDrifting || (brake && Math.abs(playerSpeed) > 200)) {
        if (lastDriftPos) {
            skidLayer.lineStyle(4, 0x06080e, 0.70);
            skidLayer.beginPath();
            skidLayer.moveTo(lastDriftPos.x, lastDriftPos.y);
            skidLayer.lineTo(nextX, nextY);
            skidLayer.strokePath();
        }
        lastDriftPos = { x: nextX, y: nextY };

        // Bocanadas de humo de neumático
        if (Math.random() < 0.6) {
            sparksParticles.push({
                x: nextX - Math.cos(playerAngle) * 20,
                y: nextY - Math.sin(playerAngle) * 20,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                radius: 4.5,
                alpha: 0.6,
                color: 0xcccccc,
                life: 0.38
            });
        }
    } else {
        lastDriftPos = null;
    }

    checkLapProgression(nextX, nextY);
}

function updateAI(dt) {
    aiCars.forEach(ai => {
        const targetPt = GP_CIRCUIT_PATH[ai.waypointIdx];
        const dx = targetPt.x - ai.container.x;
        const dy = targetPt.y - ai.container.y;
        const dist = Math.hypot(dx, dy);

        const targetAngle = Math.atan2(dy, dx);
        ai.angle = Phaser.Math.Angle.RotateTo(ai.angle, targetAngle, 3.8 * dt);

        ai.container.x += Math.cos(ai.angle) * ai.speed * dt;
        ai.container.y += Math.sin(ai.angle) * ai.speed * dt;
        ai.container.rotation = ai.angle;

        if (dist < 85) {
            ai.waypointIdx = (ai.waypointIdx + 1) % GP_CIRCUIT_PATH.length;
            if (ai.waypointIdx === 0) ai.lap++;
        }

        // Colisión entre vehículos
        const pDist = Math.hypot(playerCar.container.x - ai.container.x, playerCar.container.y - ai.container.y);
        if (pDist < 44) {
            gtAudio.playCrash();
            playerSpeed *= 0.85;
            const pushAngle = Math.atan2(playerCar.container.y - ai.container.y, playerCar.container.x - ai.container.x);
            playerCar.container.x += Math.cos(pushAngle) * 8;
            playerCar.container.y += Math.sin(pushAngle) * 8;
        }
    });
}

// Retorna el punto más cercano en el eje del circuito y la distancia perpendicular
function getClosestCircuitSegment(px, py) {
    let minDistSq = 999999;
    let closestX = px, closestY = py;
    let closestIdx = 0;

    const len = GP_CIRCUIT_PATH.length;
    for (let i = 0; i < len; i++) {
        const v = GP_CIRCUIT_PATH[i];
        const w = GP_CIRCUIT_PATH[(i + 1) % len];

        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        let t = l2 === 0 ? 0 : ((px - v.x) * (w.x - v.x) + (py - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));

        const projX = v.x + t * (w.x - v.x);
        const projY = v.y + t * (w.y - v.y);
        const dSq = (px - projX) ** 2 + (py - projY) ** 2;

        if (dSq < minDistSq) {
            minDistSq = dSq;
            closestX = projX;
            closestY = projY;
            closestIdx = i;
        }
    }
    return { distance: Math.sqrt(minDistSq), closestX, closestY, segmentIdx: closestIdx };
}

function updateCameraLookAhead() {
    // La cámara enfoca 220px por delante del coche para que el jugador vea la curva con antelación
    const lookDist = Math.min(220, Math.abs(playerSpeed) * 0.45);
    const targetX = playerCar.container.x + Math.cos(playerAngle) * lookDist;
    const targetY = playerCar.container.y + Math.sin(playerAngle) * lookDist;

    camTarget.x = Phaser.Math.Linear(camTarget.x, targetX, 0.10);
    camTarget.y = Phaser.Math.Linear(camTarget.y, targetY, 0.10);

    const ratio = Math.abs(playerSpeed) / 490;
    const targetZoom = 1.22 - ratio * 0.18;
    mainScene.cameras.main.zoom = Phaser.Math.Linear(mainScene.cameras.main.zoom, targetZoom, 0.04);
}

// Actualiza el cartel animado en el HUD sobre la próxima curva
function updateCornerNavigator() {
    if (!cornerNameEl || !cornerActionEl) return;
    const circuitInfo = getClosestCircuitSegment(playerCar.container.x, playerCar.container.y);
    const nextWpIdx = (circuitInfo.segmentIdx + 1) % GP_CIRCUIT_PATH.length;
    const wp = GP_CIRCUIT_PATH[nextWpIdx];

    cornerIconEl.innerText = wp.icon;
    cornerNameEl.innerText = wp.name;
    cornerActionEl.innerText = wp.advice;

    if (wp.type === 'brake') {
        cornerActionEl.className = 'brake';
    } else {
        cornerActionEl.className = '';
    }
}

function checkLapProgression(x, y) {
    const startPt = GP_CIRCUIT_PATH[0];
    const dist = Math.hypot(x - startPt.x, y - startPt.y);

    if (dist < 95) {
        if (currentWaypointIdx === 1) {
            currentWaypointIdx = 0;
            playerLap++;
            lapStartTime = Date.now();
            gtAudio.playCountdown(true);

            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try { window.Telegram.WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
            }

            if (playerLap > TOTAL_LAPS) {
                gameState = 'FINISHED';
                showVictoryOverlay();
            }
        }
    } else if (dist > 260) {
        currentWaypointIdx = 1;
    }
}

// ----------------------------------------------------------------------------
// 8. TELEMETRÍA, CLASIFICACIÓN Y RADAR
// ----------------------------------------------------------------------------
function updateTelemetry(time) {
    const kmh = Math.round(Math.abs(playerSpeed) * 0.58);
    if (domSpeed) domSpeed.innerText = kmh.toString();
    const ratio = Math.min(1, Math.abs(playerSpeed) / 490);
    const gear = Math.min(5, Math.floor(ratio * 4.9) + 1);
    if (domGear) domGear.innerText = 'G' + gear;
    if (domRpm) domRpm.style.width = Math.round((ratio % 0.25) / 0.25 * 100) + '%';

    if (domLap) domLap.innerText = Math.min(playerLap, TOTAL_LAPS) + '/' + TOTAL_LAPS;
    if (domTime && lapStartTime > 0) {
        const elapsed = Math.max(0, Date.now() - lapStartTime);
        const m = Math.floor(elapsed / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 100);
        domTime.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
    }

    if (time - lastLeaderboardUpdate > 150) {
        lastLeaderboardUpdate = time;

        const allCars = [playerCar, ...aiCars];
        allCars.forEach(car => {
            const nextPt = GP_CIRCUIT_PATH[car.waypointIdx || 0];
            const dist = Math.hypot(car.container.x - nextPt.x, car.container.y - nextPt.y);
            car.totalProgress = car.lap * 10000 + (car.waypointIdx || 0) * 100 - dist;
        });

        allCars.sort((a, b) => b.totalProgress - a.totalProgress);

        const playerRank = allCars.findIndex(c => c.isPlayer) + 1;
        if (domPos) domPos.innerText = 'P' + playerRank;

        if (domLeaderboard) {
            let html = '';
            allCars.forEach((c, idx) => {
                const isP = c.isPlayer;
                const gap = idx === 0 ? 'LÍDER' : `+${(idx * 0.8).toFixed(1)}s`;
                html += `
                    <div class="lb-row ${isP ? 'player' : ''}">
                        <span class="lb-pos" style="color:${c.color}">P${idx + 1}</span>
                        <span class="lb-name">${c.name}</span>
                        <span class="lb-gap">${gap}</span>
                    </div>
                `;
            });
            domLeaderboard.innerHTML = html;
        }
    }
}

function renderRadar() {
    if (!radarCtx) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    radarCtx.clearRect(0, 0, w, h);

    const scaleX = w / TRACK_WIDTH;
    const scaleY = h / TRACK_HEIGHT;

    radarCtx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
    radarCtx.lineWidth = 2.5;
    radarCtx.beginPath();
    GP_CIRCUIT_PATH.forEach((pt, i) => {
        const rx = pt.x * scaleX;
        const ry = pt.y * scaleY;
        if (i === 0) radarCtx.moveTo(rx, ry);
        else radarCtx.lineTo(rx, ry);
    });
    radarCtx.closePath();
    radarCtx.stroke();

    aiCars.forEach(ai => {
        radarCtx.fillStyle = ai.color;
        radarCtx.beginPath();
        radarCtx.arc(ai.container.x * scaleX, ai.container.y * scaleY, 3, 0, Math.PI * 2);
        radarCtx.fill();
    });

    const px = playerCar.container.x * scaleX;
    const py = playerCar.container.y * scaleY;
    radarCtx.fillStyle = '#fee440';
    radarCtx.beginPath();
    radarCtx.arc(px, py, 4.5, 0, Math.PI * 2);
    radarCtx.fill();
}

function renderParticles(dt) {
    particlesLayer.clear();
    for (let i = sparksParticles.length - 1; i >= 0; i--) {
        const p = sparksParticles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius = Math.max(1, p.radius - dt * 4);
        p.alpha -= dt * 2.2;

        if (p.life <= 0 || p.alpha <= 0) {
            sparksParticles.splice(i, 1);
            continue;
        }

        particlesLayer.fillStyle(p.color, p.alpha);
        particlesLayer.fillCircle(p.x, p.y, p.radius);
    }
}

// ----------------------------------------------------------------------------
// 9. CUENTA ATRÁS Y CELEBRACIÓN
// ----------------------------------------------------------------------------
function startCountdownSequence(scene) {
    let count = 3;
    const countText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 50, '3', {
        font: '900 88px Arial',
        fill: '#fee440',
        stroke: '#000000',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    gtAudio.playCountdown(false);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countText.setText(count.toString());
            countText.setFill(count === 2 ? '#ff9100' : '#fee440');
            gtAudio.playCountdown(false);
        } else if (count === 0) {
            countText.setText('¡GO!');
            countText.setFill('#00e676');
            gtAudio.playCountdown(true);
            gameState = 'RACE';
            lapStartTime = Date.now();
        } else {
            countText.destroy();
            clearInterval(timer);
        }
    }, 900);
}

function showVictoryOverlay() {
    mainScene.add.text(mainScene.cameras.main.centerX, mainScene.cameras.main.centerY, '¡VICTORIA! 🏆\nCAMPEÓN GT3', {
        font: '900 64px Arial',
        fill: '#fee440',
        align: 'center',
        stroke: '#020617',
        strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);
}
