// ============================================================================
// REAL GP MOTORSPORT : OFFICIAL GT3 EDITION (Phaser 3 Engine)
// Construido directamente a partir de la fotografía aérea de referencia:
// - Circuito fotorrealista GP con trazada engomada, pianos azul/blanco, escapatorias y colina con pinos y sombras.
// - 6 Superdeportivos GT3 reales (Ferrari 488 GT3, Porsche 911 GT3 Grello, Aston Martin, BMW M4 GT3, McLaren Gulf, Iron Dames).
// - Telemetría de retransmisión televisiva oficial (Velocímetro, Marchas, RPM, Clasificación en vivo, Radar Minimapa).
// - Físicas con detección de fuera de pista (gravel/césped) y partículas de humo y polvo.
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

            // Aullido principal motor GT3 (Sawtooth)
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(62, this.ctx.currentTime);

            // Armónicos (Triangle)
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(124, this.ctx.currentTime);

            // Sub-bajos de escape
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
        } catch (e) {
            console.log('Audio esperando interacción del usuario');
        }
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
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
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
// 2. CONFIGURACIÓN DEL CIRCUITO FOTORREALISTA (1376 x 768)
// ----------------------------------------------------------------------------
const TRACK_WIDTH = 1376;
const TRACK_HEIGHT = 768;

// Trazado de alta fidelidad que recorre exactamente la trazada de asfalto de real_gp_circuit.jpg
const GP_CIRCUIT_PATH = [
    { x: 688, y: 635 }, // 0. Meta y parrilla principal (recta de meta hacia la izquierda)
    { x: 500, y: 635 }, // 1. Recta principal
    { x: 340, y: 630 }, // 2. Zona de frenada para Curva 1
    { x: 200, y: 600 }, // 3. Entrada Curva Grande (curvón parabólico izquierdo)
    { x: 130, y: 520 }, // 4. Apoyo Curva Grande
    { x: 90, y: 400 },  // 5. Vértice Curva Grande oeste
    { x: 110, y: 280 }, // 6. Salida curvón
    { x: 180, y: 200 }, // 7. Enlace hacia recta trasera
    { x: 320, y: 165 }, // 8. Entrada recta norte (DRS 1)
    { x: 550, y: 160 }, // 9. Máxima aceleración recta norte
    { x: 800, y: 160 }, // 10. Centro recta norte
    { x: 1040, y: 170 },// 11. Frenada para sector Estadio
    { x: 1160, y: 210 },// 12. Curva parabólica este
    { x: 1225, y: 300 },// 13. Vértice exterior estadio
    { x: 1230, y: 410 },// 14. Apoyo peraltado este
    { x: 1180, y: 520 },// 15. Salida de estadio hacia chicane
    { x: 1070, y: 600 },// 16. Curva final de entrada a recta
    { x: 940, y: 635 }, // 17. Aceleración a fondo hacia meta
    { x: 820, y: 635 }  // 18. Línea de llegada
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
let particlesLayer;
let gameState = 'COUNTDOWN';

let playerSpeed = 0;
let playerAngle = Math.PI; // Hacia la izquierda (recta de meta)
let playerLap = 1;
const TOTAL_LAPS = 3;
let currentWaypointIdx = 0;
let lapStartTime = 0;
let isOffTrack = false;

let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// Elementos del DOM HUD
let domSpeed, domGear, domRpm, domPos, domLap, domTime, domLeaderboard, domOfftrack, radarCanvas, radarCtx;

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

    // 1. Fondo del Circuito Fotorrealista
    this.add.image(0, 0, 'real_circuit_bg').setOrigin(0, 0);
    this.physics.world.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    // 2. Extraer los 6 coches GT3 con transparencia perfecta
    sliceGT3Cars(this);

    // 3. Capas de huellas y partículas
    skidLayer = this.add.graphics().setDepth(2);
    particlesLayer = this.add.graphics().setDepth(3);

    // 4. Configurar controles y enlaces DOM
    setupControls(this);
    setupDOM();

    // 5. Instanciar Jugador y Rivales IA
    spawnGT3Vehicles(this);

    // 6. Cámara con seguimiento suave y zoom dinámico
    this.cameras.main.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.cameras.main.startFollow(playerCar.container, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.20);

    // 7. Iniciar secuencia de salida
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
}

// Extrae con precisión los 6 bólidos GT3 eliminando el fondo negro
function sliceGT3Cars(scene) {
    const sourceImg = scene.textures.get('real_cars_sheet').getSourceImage();
    const carWidth = 440;
    const carHeight = 240;
    const startX = [30, 530];
    const startY = [40, 370, 710];
    const carIds = [
        'gt_porsche_grello', // Manthey Porsche 911 GT3 Grello (Amarillo/Verde)
        'gt_ferrari_scuderia',// Ferrari 488 GT3 Rosso Corsa (Rojo)
        'gt_aston_valvoline', // Aston Martin Vantage GT3 Valvoline (Azul marino)
        'gt_bmw_m_motorsport',// BMW M4 GT3 Rowe (Blanco M)
        'gt_iron_dames',      // Iron Dames GT3 (Rosa/Negro)
        'gt_mclaren_gulf'     // McLaren 720S Gulf Racing (Naranja/Azul)
    ];

    let idx = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
            const canvas = document.createElement('canvas');
            canvas.width = carWidth;
            canvas.height = carHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImg, startX[c], startY[r], carWidth, carHeight, 0, 0, carWidth, carHeight);

            // Chroma Key: fondo negro transparente
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
    // 1. Coche del Jugador: Ferrari 488 GT3 Rosso Corsa
    playerCar = createGTCarEntity(scene, 'gt_ferrari_scuderia', 688, 635, 'TÚ (Ferrari 488 GT3)', '#ef4444');
    playerCar.container.setDepth(10);
    playerCar.isPlayer = true;

    // 2. 5 Rivales IA oficiales
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

    // Sombra suave proyectada bajo el coche en el asfalto
    const shadow = scene.add.ellipse(4, 4, 68, 36, 0x000000, 0.60);
    container.add(shadow);

    // Sprite fotorrealista del bólido GT3 (58x32 px)
    const sprite = scene.add.sprite(0, 0, textureKey);
    sprite.setDisplaySize(58, 34);
    // En la textura original el morro apunta a la izquierda; lo giramos 180° para que el frente apunte a 0 rad (derecha)
    sprite.setAngle(180);
    container.add(sprite);

    // Haz de faros LED frontales proyectados sobre el circuito
    const hlG = scene.add.graphics();
    hlG.fillStyle(0xffffff, 0.18);
    hlG.beginPath();
    hlG.moveTo(26, -7);
    hlG.lineTo(125, -34);
    hlG.lineTo(125, 34);
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

    // Iniciar audio en el primer clic o toque de la pantalla
    scene.input.on('pointerdown', () => gtAudio.init());
}

// ----------------------------------------------------------------------------
// 5. UPDATE : FÍSICAS, OFF-TRACK, TELEMETRÍA, DERIVA Y RADAR
// ----------------------------------------------------------------------------
let lastDriftPos = null;
let lastLeaderboardUpdate = 0;
let dustParticles = [];

function realUpdate(time, delta) {
    const dt = delta / 1000;
    if (gameState !== 'RACE') return;

    updatePlayer(dt);
    updateAI(dt);
    updateCameraZoom();
    updateTelemetry(time);
    renderRadar();
    renderParticles(dt);
}

function updatePlayer(dt) {
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    // Comprobación de Fuera de Pista (Distancia a la trazada de asfalto)
    const px = playerCar.container.x;
    const py = playerCar.container.y;
    const distToTrack = getMinDistanceToCircuit(px, py);
    isOffTrack = distToTrack > 56;

    if (domOfftrack) {
        domOfftrack.style.display = isOffTrack ? 'block' : 'none';
    }

    // Rendimiento alterado si se sale del circuito a la hierba o gravilla
    const maxSpeed = isOffTrack ? 220 : 490;
    const accelRate = isOffTrack ? 190 : 400;
    const brakeRate = 540;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-120, playerSpeed - brakeRate * dt);
    } else {
        playerSpeed *= (isOffTrack ? 0.94 : 0.985);
    }

    const turnRate = 4.3;
    if (left) playerAngle -= turnRate * dt * (playerSpeed >= 0 ? 1 : -1);
    if (right) playerAngle += turnRate * dt * (playerSpeed >= 0 ? 1 : -1);

    playerCar.container.x += Math.cos(playerAngle) * playerSpeed * dt;
    playerCar.container.y += Math.sin(playerAngle) * playerSpeed * dt;
    playerCar.container.rotation = playerAngle;
    playerCar.speed = playerSpeed;
    playerCar.angle = playerAngle;

    // Fricción y sonido
    const isDrifting = (left || right) && Math.abs(playerSpeed) > 270;
    gtAudio.setDrift(isDrifting ? 1.0 : 0);
    const audioState = gtAudio.update(playerSpeed, 490, gas);

    // Huellas de goma sobre asfalto
    if (isDrifting || (brake && Math.abs(playerSpeed) > 200)) {
        if (lastDriftPos) {
            skidLayer.lineStyle(4, 0x06080e, 0.70);
            skidLayer.beginPath();
            skidLayer.moveTo(lastDriftPos.x, lastDriftPos.y);
            skidLayer.lineTo(px, py);
            skidLayer.strokePath();
        }
        lastDriftPos = { x: px, y: py };

        // Partículas de humo blanco de goma
        if (Math.random() < 0.6) {
            dustParticles.push({
                x: px - Math.cos(playerAngle) * 20,
                y: py - Math.sin(playerAngle) * 20,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                radius: 4,
                alpha: 0.6,
                color: 0xcccccc,
                life: 0.4
            });
        }
    } else {
        lastDriftPos = null;
    }

    // Partículas de polvo si se sale a la hierba/gravilla
    if (isOffTrack && Math.abs(playerSpeed) > 80 && Math.random() < 0.7) {
        dustParticles.push({
            x: px - Math.cos(playerAngle) * 22,
            y: py - Math.sin(playerAngle) * 22,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            radius: 5,
            alpha: 0.75,
            color: 0xc4a47c,
            life: 0.5
        });
    }

    checkLapProgression(px, py);
    return audioState;
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
            playerSpeed *= 0.84;
            const pushAngle = Math.atan2(playerCar.container.y - ai.container.y, playerCar.container.x - ai.container.x);
            playerCar.container.x += Math.cos(pushAngle) * 8;
            playerCar.container.y += Math.sin(pushAngle) * 8;
        }
    });
}

// Distancia mínima desde (px, py) al circuito cerrado
function getMinDistanceToCircuit(px, py) {
    let minDist = 999999;
    const len = GP_CIRCUIT_PATH.length;
    for (let i = 0; i < len; i++) {
        const p1 = GP_CIRCUIT_PATH[i];
        const p2 = GP_CIRCUIT_PATH[(i + 1) % len];
        const d = distToSegmentSquared({ x: px, y: py }, p1, p2);
        if (d < minDist) minDist = d;
    }
    return Math.sqrt(minDist);
}

function distToSegmentSquared(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
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

function updateCameraZoom() {
    const ratio = Math.abs(playerSpeed) / 490;
    const targetZoom = 1.20 - ratio * 0.16;
    mainScene.cameras.main.zoom = Phaser.Math.Linear(mainScene.cameras.main.zoom, targetZoom, 0.04);
}

// ----------------------------------------------------------------------------
// 6. TELEMETRÍA, CLASIFICACIÓN EN DIRECTO Y RADAR
// ----------------------------------------------------------------------------
function updateTelemetry(time) {
    // 1. Velocímetro y Marcha
    const kmh = Math.round(Math.abs(playerSpeed) * 0.58);
    if (domSpeed) domSpeed.innerText = kmh.toString();
    const ratio = Math.min(1, Math.abs(playerSpeed) / 490);
    const gear = Math.min(5, Math.floor(ratio * 4.9) + 1);
    if (domGear) domGear.innerText = 'G' + gear;
    if (domRpm) domRpm.style.width = Math.round((ratio % 0.25) / 0.25 * 100) + '%';

    // 2. Vuelta y Cronómetro
    if (domLap) domLap.innerText = Math.min(playerLap, TOTAL_LAPS) + '/' + TOTAL_LAPS;
    if (domTime && lapStartTime > 0) {
        const elapsed = Math.max(0, Date.now() - lapStartTime);
        const m = Math.floor(elapsed / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        const ms = Math.floor((elapsed % 1000) / 100);
        domTime.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
    }

    // 3. Clasificación (Actualizada cada 150 ms)
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

// Dibuja el minimapa de radar en el canvas
function renderRadar() {
    if (!radarCtx) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    radarCtx.clearRect(0, 0, w, h);

    const scaleX = w / TRACK_WIDTH;
    const scaleY = h / TRACK_HEIGHT;

    // Dibujar la trazada del circuito
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

    // Rivales IA en el radar (puntos rojos/blancos)
    aiCars.forEach(ai => {
        radarCtx.fillStyle = ai.color;
        radarCtx.beginPath();
        radarCtx.arc(ai.container.x * scaleX, ai.container.y * scaleY, 3, 0, Math.PI * 2);
        radarCtx.fill();
    });

    // Jugador en el radar (punto dorado brillante con halo)
    const px = playerCar.container.x * scaleX;
    const py = playerCar.container.y * scaleY;
    radarCtx.fillStyle = '#fee440';
    radarCtx.beginPath();
    radarCtx.arc(px, py, 4.5, 0, Math.PI * 2);
    radarCtx.fill();
}

function renderParticles(dt) {
    particlesLayer.clear();
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        const p = dustParticles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += dt * 8;
        p.alpha -= dt * 1.5;

        if (p.life <= 0 || p.alpha <= 0) {
            dustParticles.splice(i, 1);
            continue;
        }

        particlesLayer.fillStyle(p.color, p.alpha);
        particlesLayer.fillCircle(p.x, p.y, p.radius);
    }
}

// ----------------------------------------------------------------------------
// 7. SECUENCIA DE SALIDA Y CELEBRACIÓN DE VICTORIA
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
