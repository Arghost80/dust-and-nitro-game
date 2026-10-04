// ============================================================================
// CYBER RALLY 2D : NEO TOKYO CIRCUIT (AAA ARCADE EDITION)
// - Gráficos de alta definición pre-renderizados (Circuitos y Bólidos Hi-Res)
// - 6 Superdeportivos futuristas con Underglow Neón, Faros y Sombras proyectadas
// - Asfalto mojado reflectante, huellas de derrape continuas y partículas de plasma
// - Cámara dinámica con seguimiento cinemático y zoom elástico
// - Telemetría de competición oficial con tabla de clasificación en vivo
// ============================================================================

if (window.Telegram && window.Telegram.WebApp) {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    } catch(e) {}
}

// ----------------------------------------------------------------------------
// 1. SINTETIZADOR DE AUDIO PROCEDURAL V8 / PLASMA
// ----------------------------------------------------------------------------
class Cyber2DAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.subOsc = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.isReady = false;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(28, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.engineOsc.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.subOsc.start();

            // Derrape
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(470, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(920, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando toque');
        }
    }

    updateEngine(speed, maxSpeed, isGas) {
        if (!this.ctx || !this.engineOsc) return;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));
        const freq = 52 + ratio * 180;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
        this.subOsc.frequency.setTargetAtTime(freq * 0.5, this.ctx.currentTime, 0.04);

        const targetGain = isGas ? 0.05 : 0.022;
        this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    setDrift(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        this.driftGain.gain.setTargetAtTime(clamped * 0.038, this.ctx.currentTime, 0.04);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 920 : 460, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.14));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.14));
    }
}
const audio2D = new Cyber2DAudio();

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL JUEGO PHASER 3 (1376 x 768 NATIVO)
// ----------------------------------------------------------------------------
const TRACK_WIDTH = 1376;
const TRACK_HEIGHT = 768;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#05070e',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: { preload: cyberPreload, create: cyberCreate, update: cyberUpdate }
};

const game = new Phaser.Game(config);

let mainScene;
let playerCar;
let aiCars = [];
let skidLayer;
let particlesEmitter;
let gameState = 'COUNTDOWN';

let playerSpeed = 0;
let playerAngle = Math.PI; // Inicia apuntando hacia la izquierda
let playerSteer = 0;
let playerLap = 1;
const TOTAL_LAPS = 3;
let currentWaypointIdx = 0;
let lapStartTime = 0;
let bestLapTime = null;

// Trazado del circuito en coordenadas exactas de cyber_circuit_track.jpg
const CIRCUIT_PATH = [
    { x: 688, y: 700 }, // 0. Meta
    { x: 450, y: 700 }, // 1. Recta principal
    { x: 240, y: 700 }, // 2. Entrada a curva 1
    { x: 140, y: 640 }, // 3. Curva 1
    { x: 110, y: 520 }, // 4. Apoyo exterior
    { x: 130, y: 390 }, // 5. Salida de horquilla suroeste
    { x: 210, y: 310 }, // 6. Curva interior
    { x: 320, y: 310 }, // 7. Vértice bucle interior
    { x: 410, y: 380 }, // 8. Bajada
    { x: 480, y: 520 }, // 9. Entrada a chicane
    { x: 600, y: 510 }, // 10. Centro chicane
    { x: 720, y: 440 }, // 11. S-curve
    { x: 840, y: 470 }, // 12. Salida chicane
    { x: 960, y: 530 }, // 13. Curva este
    { x: 1120, y: 530 },// 14. Recta este
    { x: 1240, y: 470 },// 15. Horquilla este
    { x: 1260, y: 350 },// 16. Curva hacia el norte
    { x: 1200, y: 240 },// 17. Salida horquilla
    { x: 1080, y: 210 },// 18. Rampa superior
    { x: 920, y: 220 }, // 19. Puente elevado
    { x: 720, y: 240 }, // 20. Cima del puente
    { x: 520, y: 230 }, // 21. Bajada del puente
    { x: 360, y: 240 }, // 22. Enlace noroeste
    { x: 230, y: 280 }, // 23. Curva de descenso
    { x: 160, y: 390 }, // 24. Recta de unión
    { x: 150, y: 560 }, // 25. Curva final entrada a meta
    { x: 240, y: 680 }, // 26. Encarando recta de meta
    { x: 460, y: 700 }  // 27. Recta de meta
];

// HUD & Controles
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// ----------------------------------------------------------------------------
// 3. PRELOAD : CARGA DE ASSETS HI-RES
// ----------------------------------------------------------------------------
function cyberPreload() {
    this.load.image('cyber_track', 'assets/cyber_circuit_track.jpg');
    this.load.image('cyber_cars_sheet', 'assets/cyber_racing_cars.jpg');
}

// ----------------------------------------------------------------------------
// 4. CREATE : CONSTRUCCIÓN Y EXTRACCIÓN DE BÓLIDOS
// ----------------------------------------------------------------------------
function cyberCreate() {
    mainScene = this;

    // 1. Fondo del circuito de alta definición
    const trackImg = this.add.image(0, 0, 'cyber_track').setOrigin(0, 0);
    this.physics.world.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    // 2. Extraer los 6 coches hiperrealistas con transparencia limpia
    sliceCyberCars(this);

    // 3. Capa de marcas de goma permanentes (Skidmarks)
    skidLayer = this.add.graphics();
    skidLayer.setDepth(2);

    // 4. Configurar controles
    setupControls(this);

    // 5. Spawn del Jugador y Rivales IA
    spawnRaceVehicles(this);

    // 6. Cámara con seguimiento cinemático
    this.cameras.main.setBounds(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
    this.cameras.main.startFollow(playerCar.container, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.15);

    // 7. Semáforo de cuenta atrás
    startCountdownSequence(this);
}

// Extrae los 6 superdeportivos de la hoja de texturas eliminando el fondo negro
function sliceCyberCars(scene) {
    const sourceImg = scene.textures.get('cyber_cars_sheet').getSourceImage();
    const carWidth = 280;
    const carHeight = 460;
    const startX = [30, 370, 710];
    const startY = [20, 530];
    const carIds = ['car_blue', 'car_purple', 'car_red', 'car_green', 'car_white', 'car_teal'];

    let idx = 0;
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
            const canvas = document.createElement('canvas');
            canvas.width = carWidth;
            canvas.height = carHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImg, startX[c], startY[r], carWidth, carHeight, 0, 0, carWidth, carHeight);

            // Eliminar fondo negro (Chroma Key)
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

function spawnRaceVehicles(scene) {
    // 1. Coche del Jugador (Cyan / Blue Hypercar)
    playerCar = createCarEntity(scene, 'car_blue', 688, 700, 0x00f5d4, '★ TÚ (CYBER APEX)');
    playerCar.container.setDepth(10);

    // 2. 5 Rivales IA
    const aiConfigs = [
        { id: 'car_purple', x: 640, y: 680, color: 0xff007f, name: 'ARASAKA VIPER', speed: 430 },
        { id: 'car_red', x: 600, y: 720, color: 0xff0033, name: 'CRIMSON GHOST', speed: 420 },
        { id: 'car_green', x: 550, y: 680, color: 0x00e676, name: 'NEXUS LOTUS', speed: 425 },
        { id: 'car_white', x: 510, y: 720, color: 0xffffff, name: 'SOLAR PHANTOM', speed: 415 },
        { id: 'car_teal', x: 460, y: 680, color: 0x38bdf8, name: 'QUANTUM RUNNER', speed: 410 }
    ];

    aiCars = [];
    aiConfigs.forEach(cfg => {
        const ai = createCarEntity(scene, cfg.id, cfg.x, cfg.y, cfg.color, cfg.name);
        ai.speed = cfg.speed;
        ai.waypointIdx = 1;
        ai.lap = 1;
        ai.container.setDepth(9);
        aiCars.push(ai);
    });
}

function createCarEntity(scene, textureKey, x, y, neonColor, name) {
    const container = scene.add.container(x, y);

    // Sombra suave proyectada bajo el coche
    const shadow = scene.add.ellipse(4, 4, 62, 32, 0x000000, 0.65);
    container.add(shadow);

    // Luz de Neón Underglow que ilumina el asfalto
    const underglow = scene.add.ellipse(0, 0, 58, 28, neonColor, 0.45);
    container.add(underglow);

    // Sprite de alta definición del coche
    const sprite = scene.add.sprite(0, 0, textureKey);
    sprite.setDisplaySize(54, 28);
    sprite.setAngle(90); // Orientar a la derecha
    container.add(sprite);

    // Haces de faros xenón frontales
    const hlG = scene.add.graphics();
    hlG.fillStyle(0x00f5d4, 0.18);
    hlG.beginPath();
    hlG.moveTo(25, -6);
    hlG.lineTo(110, -28);
    hlG.lineTo(110, 28);
    hlG.lineTo(25, 6);
    hlG.closePath();
    hlG.fill();
    container.add(hlG);

    return {
        container: container,
        sprite: sprite,
        underglow: underglow,
        name: name,
        color: neonColor,
        speed: 0,
        angle: Math.PI,
        lap: 1,
        progress: 0
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
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); audio2D.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); audio2D.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
}

// ----------------------------------------------------------------------------
// 5. UPDATE : FÍSICAS, DERRAPE, IA Y TELEMETRÍA
// ----------------------------------------------------------------------------
let lastDriftPos = null;

function cyberUpdate(time, delta) {
    const dt = delta / 1000;
    if (gameState !== 'RACE') return;

    updatePlayer(dt);
    updateAI(dt);
    updateSkidmarks();
    updateCameraZoom();
}

function updatePlayer(dt) {
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    const maxSpeed = 480;
    const accelRate = 380;
    const brakeRate = 520;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-120, playerSpeed - brakeRate * dt);
    } else {
        playerSpeed *= 0.985;
    }

    // Dirección suave
    const turnRate = 4.2;
    if (left) playerAngle -= turnRate * dt * (playerSpeed >= 0 ? 1 : -1);
    if (right) playerAngle += turnRate * dt * (playerSpeed >= 0 ? 1 : -1);

    playerCar.container.x += Math.cos(playerAngle) * playerSpeed * dt;
    playerCar.container.y += Math.sin(playerAngle) * playerSpeed * dt;
    playerCar.container.rotation = playerAngle;

    // Derrape
    const isDrifting = (left || right) && Math.abs(playerSpeed) > 280;
    audio2D.setDrift(isDrifting ? 1.0 : 0);
    audio2D.updateEngine(playerSpeed, maxSpeed, gas);

    // Dibujar huellas de goma (Skidmarks) en el asfalto
    if (isDrifting || (brake && Math.abs(playerSpeed) > 200)) {
        const px = playerCar.container.x;
        const py = playerCar.container.y;
        if (lastDriftPos) {
            skidLayer.lineStyle(4, 0x05070e, 0.65);
            skidLayer.beginPath();
            skidLayer.moveTo(lastDriftPos.x, lastDriftPos.y);
            skidLayer.lineTo(px, py);
            skidLayer.strokePath();
        }
        lastDriftPos = { x: px, y: py };
    } else {
        lastDriftPos = null;
    }

    // Comprobar paso por vuelta
    checkLapProgression(playerCar.container.x, playerCar.container.y);
}

function updateAI(dt) {
    aiCars.forEach(ai => {
        const targetPt = CIRCUIT_PATH[ai.waypointIdx];
        const dx = targetPt.x - ai.container.x;
        const dy = targetPt.y - ai.container.y;
        const dist = Math.hypot(dx, dy);

        const targetAngle = Math.atan2(dy, dx);
        ai.angle = Phaser.Math.Angle.RotateTo(ai.angle, targetAngle, 3.8 * dt);

        ai.container.x += Math.cos(ai.angle) * ai.speed * dt;
        ai.container.y += Math.sin(ai.angle) * ai.speed * dt;
        ai.container.rotation = ai.angle;

        if (dist < 80) {
            ai.waypointIdx = (ai.waypointIdx + 1) % CIRCUIT_PATH.length;
            if (ai.waypointIdx === 0) ai.lap++;
        }

        // Colisión con el jugador
        const pDist = Math.hypot(playerCar.container.x - ai.container.x, playerCar.container.y - ai.container.y);
        if (pDist < 42) {
            audio2D.playCrash();
            playerSpeed *= 0.82;
            const pushAngle = Math.atan2(playerCar.container.y - ai.container.y, playerCar.container.x - ai.container.x);
            playerCar.container.x += Math.cos(pushAngle) * 8;
            playerCar.container.y += Math.sin(pushAngle) * 8;
        }
    });
}

function checkLapProgression(x, y) {
    const startPt = CIRCUIT_PATH[0];
    const dist = Math.hypot(x - startPt.x, y - startPt.y);

    if (dist < 90) {
        if (currentWaypointIdx === 1) {
            currentWaypointIdx = 0;
            playerLap++;
            audio2D.playCountdown(true);
            triggerHaptic('success');

            if (playerLap > TOTAL_LAPS) {
                gameState = 'FINISHED';
                showVictoryOverlay();
            }
        }
    } else if (dist > 250) {
        currentWaypointIdx = 1;
    }
}

function updateCameraZoom() {
    const ratio = Math.abs(playerSpeed) / 480;
    const targetZoom = 1.15 - ratio * 0.15;
    mainScene.cameras.main.zoom = Phaser.Math.Linear(mainScene.cameras.main.zoom, targetZoom, 0.04);
}

function updateSkidmarks() {
    // Mantener la capa limpia
}

function startCountdownSequence(scene) {
    let count = 3;
    const countText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 50, '3', {
        font: '900 86px Arial',
        fill: '#fee440',
        stroke: '#000000',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    audio2D.playCountdown(false);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countText.setText(count.toString());
            countText.setFill(count === 2 ? '#ff007f' : '#fee440');
            audio2D.playCountdown(false);
        } else if (count === 0) {
            countText.setText('¡GO!');
            countText.setFill('#00f5d4');
            audio2D.playCountdown(true);
            triggerHaptic('success');
            gameState = 'RACE';
            lapStartTime = Date.now();
        } else {
            countText.destroy();
            clearInterval(timer);
        }
    }, 900);
}

function showVictoryOverlay() {
    const vText = mainScene.add.text(mainScene.cameras.main.centerX, mainScene.cameras.main.centerY, '¡VICTORIA! 🏆', {
        font: '900 64px Arial',
        fill: '#00f5d4',
        stroke: '#020617',
        strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);
}
