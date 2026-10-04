// ============================================================================
// DRAWRACE 3D : ULTIMATE AAA MOTORSPORT & DIORAMA ENGINE (V3)
// Inspirado al 100% en DrawRace 2 (RedLynx / Ubisoft) y Reckless Racing 3
// - Renderizado cinematográfico ACES Filmic con sombras suaves PCF Soft.
// - Cámara diorama tilt-shift a 55° calibrada a escala humana (altura óptima 25m).
// - Sistema dinámico de huellas de derrape (Skidmarks) permanentes en el asfalto.
// - 70+ elementos 3D: Pinos alpinos en capas, árboles de hoja caduca, vallas de publicidad
//   estilo motorsport (Pirelli, Brembo, Red Bull, Shell), estanque reflectante y carteles de frenada.
// - Curvas con peraltes bancados (banking) e inclinación reactiva de suspensión.
// - 6 Superdeportivos con libreas Le Mans, faros xenón con luz proyectada, luces de freno activas
//   y escapes con nitro dual y luz puntual.
// - IA competitiva con trazadas variables y tabla de clasificación en vivo (P1 a P6).
// - Controles táctiles optimizados para Telegram Mini App con respuesta háptica.
// ============================================================================

if (window.Telegram && window.Telegram.WebApp) {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    } catch(e) {}
}

// ----------------------------------------------------------------------------
// 1. SINTETIZADOR DE AUDIO PROCEDURAL V8 / TURBO SPORTS
// ----------------------------------------------------------------------------
class DrawRaceAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineOsc2 = null;
        this.subOsc = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.turboOsc = null;
        this.turboGain = null;
        this.isReady = false;
        this.gearRatios = [0.18, 0.38, 0.60, 0.82, 1.0];
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Sawtooth V8
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(58, this.ctx.currentTime);

            // Armónicos
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(116, this.ctx.currentTime);

            // Sub-bajos
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(29, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(420, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.engineOsc.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.engineOsc2.start();
            this.subOsc.start();

            // Neumáticos chirriando (Drift screech)
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(480, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(920, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            // Silbido de Turbo
            this.turboOsc = this.ctx.createOscillator();
            this.turboOsc.type = 'sine';
            this.turboOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

            this.turboGain = this.ctx.createGain();
            this.turboGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.turboOsc.connect(this.turboGain);
            this.turboGain.connect(this.ctx.destination);
            this.turboOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando interacción táctil');
        }
    }

    update(speed, maxSpeed, isGas, isTurbo) {
        if (!this.ctx || !this.engineOsc) return;
        const now = this.ctx.currentTime;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        let gRatio = ratio / this.gearRatios[0];
        let currentGear = 1;
        for (let g = 0; g < this.gearRatios.length; g++) {
            if (ratio <= this.gearRatios[g] || g === this.gearRatios.length - 1) {
                const prev = g === 0 ? 0 : this.gearRatios[g - 1];
                gRatio = (ratio - prev) / (this.gearRatios[g] - prev);
                currentGear = g + 1;
                break;
            }
        }

        const baseFreq = 54;
        const targetFreq = baseFreq + gRatio * 155;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);
        this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

        const filterCut = isGas ? 650 + ratio * 950 : 350;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.055 : 0.025;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        if (isTurbo) {
            this.turboGain.gain.setTargetAtTime(0.05, now, 0.05);
            this.turboOsc.frequency.setTargetAtTime(850 + ratio * 600, now, 0.05);
        } else {
            this.turboGain.gain.setTargetAtTime(0.0001, now, 0.08);
        }

        return { gear: currentGear, rpmRatio: gRatio };
    }

    setDrift(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        const now = this.ctx.currentTime;
        this.driftGain.gain.setTargetAtTime(clamped * 0.042, now, 0.04);
        this.driftOsc.frequency.setTargetAtTime(450 + clamped * 300, now, 0.04);
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
const drawAudio = new DrawRaceAudio();

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL MOTOR Y ATMÓSFERA CINEMATOGRÁFICA
// ----------------------------------------------------------------------------
let scene, camera, renderer;
let trackCurve;
let trackWaypoints = [];
let trackBankAngles = [];
let playerVehicle;
let aiVehicles = [];
let particles = [];
let skidmarkRibbons = [];
let cameraFlashes = [];
let windmillBlades;

let gameState = 'COUNTDOWN';
let playerSpeed = 0;
let playerAngle = 0;
let playerSteerAngle = 0;
let playerPitch = 0, playerRoll = 0;
let turboAmount = 100;
let isTurboActive = false;
let playerLap = 1;
const TOTAL_LAPS = 3;
let currentWaypointIdx = 0;
let lapStartTime = 0;

const TRACK_WIDTH = 13.5;
const RUNOFF_MARGIN = 1.8;
const BARRIER_LIMIT = TRACK_WIDTH / 2 + RUNOFF_MARGIN;

const keys = { w: false, s: false, a: false, d: false, space: false };
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false, touchTurbo = false;

// HUD Elements
let hudPosEl, hudLapEl, hudTimeEl, hudSpeedEl, hudGearEl, rpmFillEl, turboFillEl, turboPctEl;
let countdownEl, radarCanvas, radarCtx, speedVignetteEl, lbEntriesEl;

// Coches y Libreas
const CARS_CONFIG = [
    { color: 0xdc2626, stripeColor: 0xffffff, number: '7', name: 'Crimson Apex', team: 'APEX GT' },
    { color: 0x0284c7, stripeColor: 0xf97316, number: '12', name: 'Gulf Blue', team: 'GULF RS' },
    { color: 0x18181b, stripeColor: 0x22c55e, number: '99', name: 'Venom Stealth', team: 'VIPER' },
    { color: 0xeab308, stripeColor: 0x1e293b, number: '24', name: 'Solar Gold', team: 'SUNSET' },
    { color: 0xf8fafc, stripeColor: 0xef4444, number: '55', name: 'Martini White', team: 'MARTINI' },
    { color: 0x15803d, stripeColor: 0xeab308, number: '18', name: 'British Emerald', team: 'LOTUS' }
];

function triggerHaptic(type) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        try {
            if (type === 'impact') window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            if (type === 'success') window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } catch(e) {}
    }
}

function initDrawRaceEngine() {
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ACES Filmic Tone Mapping para aspecto cinematográfico de consola
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1420);
    scene.fog = new THREE.FogExp2(0x0e1420, 0.0022);

    // Cámara Diorama Tilt-Shift calibrada a 55° (escala real DrawRace 2)
    // Se posiciona a 25m de altura y 19m de distancia (no a 50m)
    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 26, 20);

    // Iluminación Golden Hour de alto contraste con sombras cálidas
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.70);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff1db, 1.65);
    sunLight.position.set(70, 95, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 320;
    const d = 130;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Luz de relleno azul cielo para contraste de perfiles
    const skyFill = new THREE.DirectionalLight(0x60a5fa, 0.40);
    skyFill.position.set(-60, 45, -50);
    scene.add(skyFill);

    // Construcción del Mundo Diorama AAA
    buildTerrainDiorama();
    build3DCircuitWithPeraltes();
    buildGuardrailsWithMotorsportSponsors();
    buildStartFinishGantry();
    buildLushForestAndVegetation(); // 70+ Pinos y robles 3D
    buildReflectivePond();
    buildWindmillAndFarm();
    buildPaddockAndGrandstand();
    buildMountainCliffs();
    initSkidmarkManager();
    spawn3DCars();

    // Cache HUD
    hudPosEl = document.getElementById('hud-pos');
    hudLapEl = document.getElementById('hud-lap');
    hudTimeEl = document.getElementById('hud-time');
    hudSpeedEl = document.getElementById('hud-speed');
    hudGearEl = document.getElementById('hud-gear');
    rpmFillEl = document.getElementById('rpm-fill');
    turboFillEl = document.getElementById('turbo-fill');
    turboPctEl = document.getElementById('turbo-pct');
    countdownEl = document.getElementById('countdown-overlay');
    speedVignetteEl = document.getElementById('speed-vignette');
    lbEntriesEl = document.getElementById('lb-entries');
    radarCanvas = document.getElementById('radar-canvas');
    if (radarCanvas) radarCtx = radarCanvas.getContext('2d');

    setupInputHandlers();
    startCountdownSequence();

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(renderLoop);
}

// ----------------------------------------------------------------------------
// 3. TERRENO MULTIZONA Y ESTANQUE REFLECTANTE
// ----------------------------------------------------------------------------
function buildTerrainDiorama() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base de hierba verde bosque rica con microvariaciones
    ctx.fillStyle = '#1e3825';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillStyle = Math.random() > 0.5 ? '#24452d' : '#182f1f';
        ctx.fillRect(x, y, 3, 3);
    }

    // Zona de cultivo dorada de la granja (sector suroeste)
    ctx.fillStyle = '#45331e';
    ctx.beginPath();
    ctx.ellipse(310, 720, 230, 170, 0, 0, Math.PI * 2);
    ctx.fill();

    // Surcos de arado rústicos
    ctx.strokeStyle = '#322414';
    ctx.lineWidth = 4;
    for (let y = 580; y < 860; y += 14) {
        ctx.beginPath();
        ctx.moveTo(160, y);
        ctx.lineTo(440, y);
        ctx.stroke();
    }

    // Zona de tierra y grava bajo los boxes
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(430, 830, 240, 130);

    // Escapatorias de arena dorada
    ctx.fillStyle = '#c4a664';
    ctx.beginPath();
    ctx.ellipse(820, 480, 80, 55, 0.4, 0, Math.PI * 2);
    ctx.ellipse(175, 380, 75, 52, -0.3, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const terrainGeo = new THREE.PlaneGeometry(390, 390, 32, 32);
    const terrainMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.92,
        metalness: 0.05
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.06;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

// Estanque de agua reflectante con orilla de juncos y rocas
function buildReflectivePond() {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(-24, 0, 14);

    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.12,
        metalness: 0.85
    });

    const pondGeo = new THREE.CylinderGeometry(14, 16, 0.4, 24);
    const pondMesh = new THREE.Mesh(pondGeo, waterMat);
    pondMesh.position.y = 0.1;
    pondMesh.receiveShadow = true;
    pondGroup.add(pondMesh);

    // Rocas en la orilla del estanque
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const rad = 14 + Math.sin(i * 3) * 1.5;
        const rSize = 0.8 + Math.random() * 1.2;
        const rMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize), rockMat);
        rMesh.position.set(Math.cos(angle) * rad, rSize * 0.4, Math.sin(angle) * rad);
        rMesh.castShadow = true;
        pondGroup.add(rMesh);
    }

    scene.add(pondGroup);
}

// ----------------------------------------------------------------------------
// 4. CIRCUITO 3D CON PERALTES BANCADOS Y PUENTE DE ACERO
// ----------------------------------------------------------------------------
function build3DCircuitWithPeraltes() {
    trackWaypoints = [
        new THREE.Vector3(-30, 0, 80),   // 0. Recta de meta
        new THREE.Vector3(25, 0, 80),    // 1. Final de recta de meta
        new THREE.Vector3(70, 0, 65),    // 2. Curva 1 rápida con peralte exterior (+1.2m)
        new THREE.Vector3(85, 0, 20),    // 3. Peralte este
        new THREE.Vector3(75, 0, -25),   // 4. Curva hacia el norte
        new THREE.Vector3(40, 1.8, -45), // 5. Rampa de subida
        new THREE.Vector3(0, 6.2, -50),  // 6. Puente elevado sobre recta
        new THREE.Vector3(-40, 7.0, -45),// 7. Cima del puente
        new THREE.Vector3(-75, 3.8, -20),// 8. Rampa de bajada
        new THREE.Vector3(-85, 0, 15),   // 9. Horquilla oeste
        new THREE.Vector3(-70, 0, 55),   // 10. Curva suroeste
        new THREE.Vector3(-30, 0, 30),   // 11. Enlace interior
        new THREE.Vector3(0, 0, -5),     // 12. Paso bajo el puente
        new THREE.Vector3(35, 0, -10),   // 13. Curva este
        new THREE.Vector3(45, 0, 40),    // 14. Chicana
        new THREE.Vector3(-5, 0, 65)     // 15. Entrada a meta
    ];

    // Inclinación bancada (Banking) en cada punto
    trackBankAngles = [
        0, 0, 0.16, 0.20, 0.14, 0, 0, 0, 0, -0.18, -0.15, 0.08, 0, 0.12, -0.10, 0
    ];

    trackCurve = new THREE.CatmullRomCurve3(trackWaypoints, true);

    const numSteps = 500;
    const roadVertices = [];
    const roadIndices = [];
    const roadUvs = [];

    for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // Calcular ángulo de peralte interpolado
        const ptIdx = Math.floor(t * trackBankAngles.length) % trackBankAngles.length;
        const bank = trackBankAngles[ptIdx] || 0;

        // Borde izquierdo y derecho con inclinación peraltada
        const halfW = TRACK_WIDTH / 2;
        const left = p.clone().add(normal.clone().multiplyScalar(-halfW));
        const right = p.clone().add(normal.clone().multiplyScalar(halfW));

        left.y += 0.08 - bank * 1.2;
        right.y += 0.08 + bank * 1.2;

        roadVertices.push(left.x, left.y, left.z);
        roadVertices.push(right.x, right.y, right.z);

        roadUvs.push(0, t * 50);
        roadUvs.push(1, t * 50);

        if (i < numSteps) {
            const v1 = i * 2;
            const v2 = v1 + 1;
            const v3 = (i + 1) * 2;
            const v4 = v3 + 1;

            roadIndices.push(v1, v2, v3);
            roadIndices.push(v2, v4, v3);
        }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMat = createHiDefRoadMaterial();
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Puente de Acero Real
    buildSteelTrussBridge();
}

function createHiDefRoadMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Asfalto granulado oscuro de alta tracción
    ctx.fillStyle = '#161922';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 9000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillStyle = Math.random() > 0.5 ? '#1f2430' : '#0c0f16';
        ctx.fillRect(x, y, 2, 2);
    }

    // Trazada de goma negra quemada (Racing Line)
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(350, 0, 150, 1024);
    ctx.fillRect(524, 0, 150, 1024);

    // Pianos tridimensionales rojo/blanco de competición en ambos bordes
    for (let y = 0; y < 1024; y += 64) {
        const isRed = ((y / 64) % 2 === 0);
        ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
        ctx.fillRect(0, y, 84, 64);
        ctx.fillRect(940, y, 84, 64);
    }

    // Líneas blancas continuas limitadoras de asfalto
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(84, 0, 12, 1024);
    ctx.fillRect(928, 0, 12, 1024);

    // Línea discontinua amarilla central
    ctx.fillStyle = '#facc15';
    for (let y = 0; y < 1024; y += 128) {
        ctx.fillRect(507, y + 20, 10, 88);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 48);

    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.74,
        metalness: 0.26
    });
}

function buildSteelTrussBridge() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.28 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });

    // Tablero inferior de hormigón
    const deckGeo = new THREE.BoxGeometry(46, 1.3, 15);
    const deck = new THREE.Mesh(deckGeo, concreteMat);
    deck.position.set(-18, 5.5, -48);
    deck.rotation.y = 0.12;
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Pilares dobles cilíndricos de hormigón
    const pierGeo = new THREE.CylinderGeometry(1.2, 1.4, 7.2, 12);
    [
        new THREE.Vector3(-2, 3.6, -40),
        new THREE.Vector3(-34, 3.6, -38),
        new THREE.Vector3(4, 3.6, -56),
        new THREE.Vector3(-38, 3.6, -54)
    ].forEach(pos => {
        const pier = new THREE.Mesh(pierGeo, concreteMat);
        pier.position.copy(pos);
        pier.castShadow = true;
        scene.add(pier);
    });

    // Vigas de celosía cruzadas en X
    const crossBarGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.0, 6);
    [-7.2, 7.2].forEach(offsetZ => {
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(46, 0.45, 0.45), steelMat);
        topRail.position.set(-18, 9.2, -48 + offsetZ);
        topRail.rotation.y = 0.12;
        topRail.castShadow = true;
        scene.add(topRail);

        for (let x = -38; x <= 2; x += 4.5) {
            const bar1 = new THREE.Mesh(crossBarGeo, steelMat);
            bar1.position.set(x, 7.6, -48 + offsetZ);
            bar1.rotation.z = 0.65;
            bar1.castShadow = true;
            scene.add(bar1);

            const bar2 = new THREE.Mesh(crossBarGeo, steelMat);
            bar2.position.set(x, 7.6, -48 + offsetZ);
            bar2.rotation.z = -0.65;
            bar2.castShadow = true;
            scene.add(bar2);
        }
    });
}

// ----------------------------------------------------------------------------
// 5. GUARDARRAÍLES CON VALLAS DE PUBLICIDAD MOTORSPORT Y CARTELES DE FRENADA
// ----------------------------------------------------------------------------
function buildGuardrailsWithMotorsportSponsors() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.5 });

    const railGeo = new THREE.BoxGeometry(0.24, 0.55, 2.4);
    const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.1, 6);

    // Texturas de patrocinadores para vallas publicitarias estilo F1 / WRC
    const sponsors = [
        { name: 'PIRELLI', bg: '#dc2626', text: '#fee440' },
        { name: 'BREMBO', bg: '#b91c1c', text: '#ffffff' },
        { name: 'RED BULL', bg: '#1e3a8a', text: '#facc15' },
        { name: 'SHELL', bg: '#ca8a04', text: '#dc2626' },
        { name: 'MOTUL', bg: '#dc2626', text: '#ffffff' },
        { name: 'TELEGRAM GP', bg: '#0284c7', text: '#ffffff' }
    ];

    const createSponsorTexture = (sp) => {
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 256;
        sCanvas.height = 64;
        const sCtx = sCanvas.getContext('2d');
        sCtx.fillStyle = sp.bg;
        sCtx.fillRect(0, 0, 256, 64);
        sCtx.fillStyle = sp.text;
        sCtx.font = '900 28px Arial';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText(sp.name, 128, 32);
        return new THREE.CanvasTexture(sCanvas);
    };

    const sponsorTextures = sponsors.map(createSponsorTexture);

    const steps = 220;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const p = trackCurve.getPointAt(t);
        const tan = trackCurve.getTangentAt(t).normalize();
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        const leftPos = p.clone().add(norm.clone().multiplyScalar(-BARRIER_LIMIT));
        const rightPos = p.clone().add(norm.clone().multiplyScalar(BARRIER_LIMIT));

        // Postes
        if (i % 2 === 0) {
            const postL = new THREE.Mesh(postGeo, postMat);
            postL.position.copy(leftPos);
            postL.position.y += 0.55;
            postL.castShadow = true;
            scene.add(postL);

            const postR = new THREE.Mesh(postGeo, postMat);
            postR.position.copy(rightPos);
            postR.position.y += 0.55;
            postR.castShadow = true;
            scene.add(postR);
        }

        // Guardarraíl
        const railL = new THREE.Mesh(railGeo, railMat);
        railL.position.copy(leftPos);
        railL.position.y += 0.65;
        railL.lookAt(railL.position.clone().add(tan));
        railL.castShadow = true;
        scene.add(railL);

        const railR = new THREE.Mesh(railGeo, railMat);
        railR.position.copy(rightPos);
        railR.position.y += 0.65;
        railR.lookAt(railR.position.clone().add(tan));
        railR.castShadow = true;
        scene.add(railR);

        // Vallas de patrocinadores en curvas exteriores
        if (i % 5 === 0 && (i < 50 || (i > 100 && i < 160))) {
            const spTex = sponsorTextures[(i / 5) % sponsorTextures.length];
            const spMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2.3, 0.8),
                new THREE.MeshBasicMaterial({ map: spTex, side: THREE.DoubleSide })
            );
            spMesh.position.copy(rightPos);
            spMesh.position.y += 0.85;
            spMesh.lookAt(spMesh.position.clone().add(tan));
            scene.add(spMesh);
        }
    }

    // Carteles métricos de aproximación a frenada (150m, 100m, 50m)
    const createBrakeBoard = (text, pos, tan) => {
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 128;
        bCanvas.height = 128;
        const bCtx = bCanvas.getContext('2d');
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, 0, 128, 128);
        bCtx.fillStyle = '#0f172a';
        bCtx.font = '900 48px Arial';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText(text, 64, 64);

        const board = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 1.4),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bCanvas), side: THREE.DoubleSide })
        );
        board.position.copy(pos);
        board.position.y += 1.4;
        board.lookAt(board.position.clone().add(tan));
        scene.add(board);

        // Poste de soporte
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), postMat);
        post.position.copy(pos);
        post.position.y += 0.7;
        scene.add(post);
    };

    // Curva 1
    const pCurva1 = trackCurve.getPointAt(0.12);
    const tan1 = trackCurve.getTangentAt(0.12);
    const norm1 = new THREE.Vector3(-tan1.z, 0, tan1.x).normalize();
    createBrakeBoard('150', pCurva1.clone().add(norm1.multiplyScalar(BARRIER_LIMIT + 1.2)), tan1);

    const pCurva2 = trackCurve.getPointAt(0.14);
    const tan2 = trackCurve.getTangentAt(0.14);
    const norm2 = new THREE.Vector3(-tan2.z, 0, tan2.x).normalize();
    createBrakeBoard('100', pCurva2.clone().add(norm2.multiplyScalar(BARRIER_LIMIT + 1.2)), tan2);

    const pCurva3 = trackCurve.getPointAt(0.16);
    const tan3 = trackCurve.getTangentAt(0.16);
    const norm3 = new THREE.Vector3(-tan3.z, 0, tan3.x).normalize();
    createBrakeBoard('50', pCurva3.clone().add(norm3.multiplyScalar(BARRIER_LIMIT + 1.2)), tan3);
}

// ----------------------------------------------------------------------------
// 6. BOSQUE FRONDOSO 3D : 70+ PINOS ALPINOS Y ROBLES CON SOMBRAS
// ----------------------------------------------------------------------------
function buildLushForestAndVegetation() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const pineGreen1 = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 }); // Bosque oscuro
    const pineGreen2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 }); // Verde medio
    const pineGreen3 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });// Verde vivo

    const deciduousMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
    const autumnMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });

    // Constructor de Pino Alpino en Capas Cónicas (Conifer Pine)
    const createLayeredPine = (x, z, scale) => {
        const pine = new THREE.Group();
        pine.position.set(x, 0, z);

        // Tronco
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3 * scale, 8), trunkMat);
        trunk.position.y = 1.5 * scale;
        trunk.castShadow = true;
        pine.add(trunk);

        // 3 Capas de follaje cónico
        const mats = [pineGreen1, pineGreen2, pineGreen3];
        for (let i = 0; i < 3; i++) {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry((2.4 - i * 0.45) * scale, (3.2 - i * 0.3) * scale, 8),
                mats[i]
            );
            cone.position.y = (3.2 + i * 1.8) * scale;
            cone.castShadow = true;
            cone.receiveShadow = true;
            pine.add(cone);
        }
        scene.add(pine);
    };

    // Constructor de Árbol Caducifolio Redondeado (Oak / Birch)
    const createDeciduousTree = (x, z, scale, isAutumn) => {
        const tree = new THREE.Group();
        tree.position.set(x, 0, z);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3.5 * scale, 8), trunkMat);
        trunk.position.y = 1.75 * scale;
        trunk.castShadow = true;
        tree.add(trunk);

        const crown = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.4 * scale, 1),
            isAutumn ? autumnMat : deciduousMat
        );
        crown.position.y = 4.8 * scale;
        crown.castShadow = true;
        crown.receiveShadow = true;
        tree.add(crown);
        scene.add(tree);
    };

    // 1. Bosque denso en la montaña y sector norte (35 pinos)
    for (let i = 0; i < 35; i++) {
        const x = 30 + (Math.random() - 0.5) * 80;
        const z = -60 + (Math.random() - 0.5) * 45;
        // Evitar plantar sobre el asfalto comprobando proximidad
        let onRoad = false;
        for (let t = 0; t <= 1; t += 0.05) {
            const pt = trackCurve.getPointAt(t);
            if (Math.hypot(x - pt.x, z - pt.z) < BARRIER_LIMIT + 3) {
                onRoad = true;
                break;
            }
        }
        if (!onRoad) {
            createLayeredPine(x, z, 0.9 + Math.random() * 0.8);
        }
    }

    // 2. Arboleda del lago y sector oeste (25 árboles mixtos)
    for (let i = 0; i < 25; i++) {
        const x = -45 + (Math.random() - 0.5) * 50;
        const z = 10 + (Math.random() - 0.5) * 45;
        let onRoad = false;
        for (let t = 0; t <= 1; t += 0.05) {
            const pt = trackCurve.getPointAt(t);
            if (Math.hypot(x - pt.x, z - pt.z) < BARRIER_LIMIT + 3) {
                onRoad = true;
                break;
            }
        }
        if (!onRoad) {
            if (Math.random() > 0.4) {
                createLayeredPine(x, z, 0.8 + Math.random() * 0.7);
            } else {
                createDeciduousTree(x, z, 0.85 + Math.random() * 0.5, Math.random() > 0.7);
            }
        }
    }

    // 3. Pinos perimetrales a lo largo de las rectas
    [
        new THREE.Vector3(55, 0, 85),
        new THREE.Vector3(75, 0, 90),
        new THREE.Vector3(-65, 0, 85),
        new THREE.Vector3(-85, 0, 75),
        new THREE.Vector3(95, 0, -10),
        new THREE.Vector3(90, 0, -35),
        new THREE.Vector3(-95, 0, -5),
        new THREE.Vector3(-90, 0, -35)
    ].forEach(p => {
        createLayeredPine(p.x, p.z, 1.3);
    });
}

// ----------------------------------------------------------------------------
// 7. SISTEMA DE HUELLAS DE DERRAPE PERMANENTES (SKIDMARK MANAGER)
// ----------------------------------------------------------------------------
let skidMesh;
let skidPositions = [];
let skidAlphas = [];
const MAX_SKID_POINTS = 3000;
let lastLeftTire = null;
let lastRightTire = null;

function initSkidmarkManager() {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAX_SKID_POINTS * 3), 3));
    geom.setAttribute('alpha', new THREE.Float32BufferAttribute(new Float32Array(MAX_SKID_POINTS), 1));

    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            skidColor: { value: new THREE.Color(0x05070a) }
        },
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 skidColor;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(skidColor, vAlpha * 0.65);
            }
        `
    });

    skidMesh = new THREE.LineSegments(geom, mat);
    scene.add(skidMesh);
}

function addSkidmark(tireL, tireR, intensity) {
    if (!skidMesh) return;
    const posAttr = skidMesh.geometry.attributes.position;
    const alphaAttr = skidMesh.geometry.attributes.alpha;

    if (lastLeftTire && lastRightTire) {
        if (skidPositions.length >= MAX_SKID_POINTS - 4) {
            skidPositions.splice(0, 4);
            skidAlphas.splice(0, 4);
        }

        // Rueda izquierda
        skidPositions.push(lastLeftTire.x, lastLeftTire.y + 0.10, lastLeftTire.z);
        skidPositions.push(tireL.x, tireL.y + 0.10, tireL.z);
        skidAlphas.push(intensity, intensity);

        // Rueda derecha
        skidPositions.push(lastRightTire.x, lastRightTire.y + 0.10, lastRightTire.z);
        skidPositions.push(tireR.x, tireR.y + 0.10, tireR.z);
        skidAlphas.push(intensity, intensity);

        for (let i = 0; i < skidPositions.length; i++) {
            posAttr.array[i] = skidPositions[i];
        }
        for (let i = 0; i < skidAlphas.length; i++) {
            alphaAttr.array[i] = skidAlphas[i];
        }
        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        skidMesh.geometry.setDrawRange(0, skidPositions.length / 3);
    }

    lastLeftTire = tireL.clone();
    lastRightTire = tireR.clone();
}

function clearSkidTireRef() {
    lastLeftTire = null;
    lastRightTire = null;
}

// ----------------------------------------------------------------------------
// 8. ARCO PÓRTICO DE SALIDA / META, GRANERO Y MOLINO DE VIENTO
// ----------------------------------------------------------------------------
function buildStartFinishGantry() {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(-30, 0, 80);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });

    // Postes laterales
    const colGeo = new THREE.BoxGeometry(1.0, 9, 1.0);
    const colL = new THREE.Mesh(colGeo, trussMat);
    colL.position.set(0, 4.5, -9);
    colL.castShadow = true;
    gantryGroup.add(colL);

    const colR = new THREE.Mesh(colGeo, trussMat);
    colR.position.set(0, 4.5, 9);
    colR.castShadow = true;
    gantryGroup.add(colR);

    // Viga horizontal
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 19), trussMat);
    beam.position.set(0, 8.5, 0);
    beam.castShadow = true;
    gantryGroup.add(beam);

    // Panel frontal de meta
    const gantryCanvas = document.createElement('canvas');
    gantryCanvas.width = 512;
    gantryCanvas.height = 64;
    const gCtx = gantryCanvas.getContext('2d');
    gCtx.fillStyle = '#dc2626';
    gCtx.fillRect(0, 0, 512, 64);
    gCtx.fillStyle = '#ffffff';
    gCtx.font = '900 32px Arial';
    gCtx.textAlign = 'center';
    gCtx.fillText('★ START / FINISH ★', 256, 44);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gantryCanvas) }));
    sign.position.set(0.72, 8.5, 0);
    sign.rotation.y = Math.PI / 2;
    gantryGroup.add(sign);

    scene.add(gantryGroup);
}

function buildWindmillAndFarm() {
    const farmGroup = new THREE.Group();
    farmGroup.position.set(-52, 0, -8);

    // Molino de Viento con Aspas Giratorias
    const millTower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 3.6, 18, 12),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
    );
    millTower.position.set(-16, 9, -12);
    millTower.castShadow = true;
    farmGroup.add(millTower);

    const millRoof = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 3.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 })
    );
    millRoof.position.set(-16, 19.5, -12);
    millRoof.castShadow = true;
    farmGroup.add(millRoof);

    windmillBlades = new THREE.Group();
    windmillBlades.position.set(-16, 17.5, -9.4);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.5, 0.1), bladeMat);
        blade.position.y = 3.6;
        const bHolder = new THREE.Group();
        bHolder.rotation.z = b * (Math.PI / 2);
        bHolder.add(blade);
        windmillBlades.add(bHolder);
    }
    farmGroup.add(windmillBlades);

    // Granero Rojo Rústico
    const barnMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 });
    const barn = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 14), barnMat);
    barn.position.set(0, 5, 0);
    barn.castShadow = true;
    farmGroup.add(barn);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(12, 5, 4), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 12.2, 0);
    roof.scale.set(1.15, 1, 1.4);
    roof.castShadow = true;
    farmGroup.add(roof);

    // Portón blanco en cruz
    const door = new THREE.Mesh(new THREE.BoxGeometry(5.5, 6.5, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    door.position.set(0, 3.2, 7.1);
    farmGroup.add(door);

    // Tractor Verde Clásico
    const tractorGroup = new THREE.Group();
    tractorGroup.position.set(16, 0, 8);
    tractorGroup.rotation.y = -0.5;

    const tBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 4.2), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 }));
    tBody.position.y = 1.6;
    tBody.castShadow = true;
    tractorGroup.add(tBody);

    const bigWheelGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.6, 14);
    bigWheelGeo.rotateZ(Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const bwL = new THREE.Mesh(bigWheelGeo, wMat);
    bwL.position.set(-1.4, 1.4, 1.2);
    const bwR = bwL.clone();
    bwR.position.x = 1.4;
    tractorGroup.add(bwL);
    tractorGroup.add(bwR);

    farmGroup.add(tractorGroup);
    scene.add(farmGroup);
}

function buildPaddockAndGrandstand() {
    const gpGroup = new THREE.Group();
    gpGroup.position.set(-5, 0, 96);

    // Tribuna Principal de 60 Metros
    const stand = new THREE.Mesh(new THREE.BoxGeometry(58, 7.5, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
    stand.position.set(0, 3.75, 0);
    stand.castShadow = true;
    gpGroup.add(stand);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 15), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }));
    roof.position.set(0, 9.0, -1);
    roof.rotation.x = 0.1;
    roof.castShadow = true;
    gpGroup.add(roof);

    // Espectadores con camisetas y gorras
    const crowdColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xffffff];
    for (let row = 0; row < 5; row++) {
        for (let col = -26; col <= 26; col += 1.5) {
            const fanMat = new THREE.MeshBasicMaterial({ color: crowdColors[Math.floor(Math.random() * crowdColors.length)] });
            const fan = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), fanMat);
            fan.position.set(col, 3.4 + row * 0.9, -4.5 + row * 2.1);
            gpGroup.add(fan);
        }
    }

    // Flashes de fotógrafos
    for (let f = 0; f < 5; f++) {
        const flashLight = new THREE.PointLight(0xffffff, 0, 25);
        flashLight.position.set(-18 + f * 9, 4.2, -5);
        gpGroup.add(flashLight);
        cameraFlashes.push(flashLight);
    }

    // Edificio de boxes al otro lado
    const pitBuilding = new THREE.Mesh(new THREE.BoxGeometry(50, 6.8, 10), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
    pitBuilding.position.set(0, 3.4, -34);
    pitBuilding.castShadow = true;
    gpGroup.add(pitBuilding);

    const awningMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 5.5), awningMat);
    awning.position.set(0, 4.8, -27);
    awning.rotation.x = 0.12;
    gpGroup.add(awning);

    scene.add(gpGroup);
}

function buildMountainCliffs() {
    const rockMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.9,
        flatShading: true
    });

    for (let i = 0; i < 30; i++) {
        const x = 54 + (Math.random() - 0.5) * 45;
        const z = -38 + (Math.random() - 0.5) * 40;
        const s = 4.5 + Math.random() * 7.5;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockMat);
        rock.position.set(x, s * 0.4, z);
        rock.scale.set(s * 1.3, s * 1.6, s);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}

// ----------------------------------------------------------------------------
// 9. SUPERDEPORTIVOS 3D : LIBREAS LE MANS, FAROS XENÓN Y LUCES DE FRENO
// ----------------------------------------------------------------------------
function build3DVehicleMesh(cfg) {
    const carRoot = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.18,
        metalness: 0.85
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x050810,
        roughness: 0.06,
        metalness: 0.94
    });

    const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f12,
        roughness: 0.40,
        metalness: 0.88
    });

    const stripeMat = new THREE.MeshStandardMaterial({
        color: cfg.stripeColor,
        roughness: 0.25,
        metalness: 0.60
    });

    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.55;
    carRoot.add(chassisGroup);
    carRoot.chassis = chassisGroup;

    // Chasis central aerodinámico
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 4.4), bodyMat);
    mainBody.castShadow = true;
    chassisGroup.add(mainBody);

    // Franja de competición Le Mans central
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 4.42), stripeMat);
    stripe.position.set(0, 0.25, 0);
    chassisGroup.add(stripe);

    // Pasos de rueda ensanchados (Widebody Fenders)
    const fenderGeo = new THREE.BoxGeometry(2.42, 0.38, 1.4);
    const frontFenders = new THREE.Mesh(fenderGeo, bodyMat);
    frontFenders.position.set(0, 0.02, -1.3);
    frontFenders.castShadow = true;
    chassisGroup.add(frontFenders);

    const rearFenders = new THREE.Mesh(fenderGeo, bodyMat);
    rearFenders.position.set(0, 0.04, 1.3);
    rearFenders.castShadow = true;
    chassisGroup.add(rearFenders);

    // Cabina y parabrisas inclinado
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 2.3), glassMat);
    cabin.position.set(0, 0.45, -0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    // Techo y toma de aire
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), bodyMat);
    roof.position.set(0, 0.72, -0.2);
    roof.castShadow = true;
    chassisGroup.add(roof);

    const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 1.82), stripeMat);
    roofStripe.position.set(0, 0.77, -0.2);
    chassisGroup.add(roofStripe);

    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.7), carbonMat);
    scoop.position.set(0, 0.83, -0.4);
    chassisGroup.add(scoop);

    // Alerón biplano de fibra de carbono
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.65), carbonMat);
    wing.position.set(0, 0.74, 1.95);
    wing.castShadow = true;
    chassisGroup.add(wing);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.25), carbonMat);
    postL.position.set(-0.8, 0.47, 1.95);
    const postR = postL.clone();
    postR.position.x = 0.8;
    chassisGroup.add(postL);
    chassisGroup.add(postR);

    // Splitter frontal de carbono y difusor
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.06, 0.5), carbonMat);
    splitter.position.set(0, -0.18, -2.38);
    chassisGroup.add(splitter);

    // Faros Xenón frontales con bombillas brillantes
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.1), hlMat);
    hlL.position.set(-0.78, 0.1, -2.22);
    const hlR = hlL.clone();
    hlR.position.x = 0.78;
    chassisGroup.add(hlL);
    chassisGroup.add(hlR);

    // Haz de luz frontal proyectado sobre la pista
    const headLightCone = new THREE.SpotLight(0xfff5eb, 1.4, 28, Math.PI / 6, 0.6);
    headLightCone.position.set(0, 0.4, -2.0);
    headLightCone.target.position.set(0, 0, -18);
    chassisGroup.add(headLightCone);
    chassisGroup.add(headLightCone.target);

    // Luces de freno traseras reactivas (brillan al frenar)
    const brakeMat = new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.4
    });
    const blL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.1), brakeMat);
    blL.position.set(-0.78, 0.1, 2.22);
    const blR = blL.clone();
    blR.position.x = 0.78;
    chassisGroup.add(blL);
    chassisGroup.add(blR);
    carRoot.brakeL = blL;
    carRoot.brakeR = blR;

    // Escapes gemelos para llamaradas de nitro
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), exhaustMat);
    exL.rotateX(Math.PI / 2);
    exL.position.set(-0.35, -0.05, 2.24);
    const exR = exL.clone();
    exR.position.x = 0.35;
    chassisGroup.add(exL);
    chassisGroup.add(exR);

    // Luz puntual para llamarada de escape
    const flameLight = new THREE.PointLight(0x00f5d4, 0, 10);
    flameLight.position.set(0, 0.2, 2.8);
    chassisGroup.add(flameLight);
    carRoot.flameLight = flameLight;

    // 4 Ruedas 3D con neumáticos, llantas y pinzas rojas Brembo
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.40, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.88, roughness: 0.18 });
    const caliperMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const createWheel = () => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.castShadow = true;
        wGroup.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.41, 10), rimMat);
        rim.rotateZ(Math.PI / 2);
        wGroup.add(rim);

        const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.14), caliperMat);
        caliper.position.set(0, 0.20, 0.16);
        wGroup.add(caliper);

        return wGroup;
    };

    const frontLeftSteer = new THREE.Group();
    frontLeftSteer.position.set(-1.18, 0.46, -1.35);
    const wFL = createWheel();
    frontLeftSteer.add(wFL);
    carRoot.add(frontLeftSteer);

    const frontRightSteer = new THREE.Group();
    frontRightSteer.position.set(1.18, 0.46, -1.35);
    const wFR = createWheel();
    frontRightSteer.add(wFR);
    carRoot.add(frontRightSteer);

    const wRL = createWheel();
    wRL.position.set(-1.18, 0.46, 1.35);
    carRoot.add(wRL);

    const wRR = createWheel();
    wRR.position.set(1.18, 0.46, 1.35);
    carRoot.add(wRR);

    carRoot.steerL = frontLeftSteer;
    carRoot.steerR = frontRightSteer;
    carRoot.wheels = [wFL, wFR, wRL, wRR];
    carRoot.wRL = wRL;
    carRoot.wRR = wRR;

    carRoot.cfg = cfg;
    return carRoot;
}

function spawn3DCars() {
    const startPoint = trackCurve.getPointAt(0);
    const tangent = trackCurve.getTangentAt(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Coche del jugador (P1)
    playerVehicle = build3DVehicleMesh(CARS_CONFIG[0]);
    playerVehicle.position.copy(startPoint).add(normal.clone().multiplyScalar(2.6));
    playerAngle = Math.atan2(tangent.x, tangent.z);
    playerVehicle.rotation.y = playerAngle;
    playerVehicle.lap = 1;
    playerVehicle.progress = 0;
    scene.add(playerVehicle);

    // 5 Rivales IA
    aiVehicles = [];
    for (let i = 1; i <= 5; i++) {
        const ai = build3DVehicleMesh(CARS_CONFIG[i]);
        const row = Math.floor(i / 2);
        const col = (i % 2 === 1) ? -1 : 1;
        const pos = startPoint.clone()
            .add(tangent.clone().multiplyScalar(-row * 11))
            .add(normal.clone().multiplyScalar(col * 3.2));

        ai.position.copy(pos);
        ai.rotation.y = playerAngle;
        ai.progress = (1.0 - (row * 0.038)) % 1.0;
        ai.laneOffset = (Math.random() - 0.5) * 3.2;
        ai.speedFactor = 0.92 + Math.random() * 0.16;
        ai.lap = 1;
        scene.add(ai);
        aiVehicles.push(ai);
    }
}

// ----------------------------------------------------------------------------
// 10. FÍSICAS DE CONDUCCIÓN, MARCAS DE DERRAPE Y NITRO V8
// ----------------------------------------------------------------------------
function updatePlayerPhysics(dt) {
    const left = keys.a || touchLeft;
    const right = keys.d || touchRight;
    const gas = keys.w || touchGas;
    const brake = keys.s || touchBrake;
    const turbo = keys.space || touchTurbo;

    // Calcular distancia al eje del circuito
    let closestDist = Infinity;
    let closestPoint = null;
    let closestT = 0;

    for (let t = 0; t <= 1; t += 0.01) {
        const pt = trackCurve.getPointAt(t);
        const d = Math.hypot(playerVehicle.position.x - pt.x, playerVehicle.position.z - pt.z);
        if (d < closestDist) {
            closestDist = d;
            closestPoint = pt;
            closestT = t;
        }
    }
    playerVehicle.progress = closestT;

    let grip = 1.0;
    if (closestDist > TRACK_WIDTH / 2) {
        grip = 0.52; // Escapatoria de grava
        spawnDustParticles(playerVehicle.position);
    }

    // LÍMITE RÍGIDO: A los 1.8m de escapatoria rebota contra el guardarraíl
    if (closestDist >= BARRIER_LIMIT && closestPoint) {
        drawAudio.playCrash();
        triggerHaptic('impact');
        playerSpeed *= 0.62;

        const toTrack = closestPoint.clone().sub(playerVehicle.position).normalize();
        playerVehicle.position.x += toTrack.x * 0.90;
        playerVehicle.position.z += toTrack.z * 0.90;
        spawnSparks(playerVehicle.position);
    }

    // Turbo Boost / Nitro
    isTurboActive = false;
    if (turbo && turboAmount > 2 && gas) {
        isTurboActive = true;
        turboAmount = Math.max(0, turboAmount - dt * 26);
        spawnExhaustFlames(playerVehicle);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 2.5;
        if (speedVignetteEl) speedVignetteEl.classList.add('nitro-active');
    } else {
        turboAmount = Math.min(100, turboAmount + dt * 10);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 0;
        if (speedVignetteEl) speedVignetteEl.classList.remove('nitro-active');
    }

    const maxSpeed = (isTurboActive ? 80 : 56) * grip;
    const accelRate = (isTurboActive ? 52 : 30) * grip;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-18, playerSpeed - 42 * dt);
    } else {
        playerSpeed *= 0.985;
    }

    // Luces de freno activas
    const isBraking = brake || (playerSpeed > 10 && !gas);
    if (playerVehicle.brakeL && playerVehicle.brakeR) {
        const bIntensity = isBraking ? 1.8 : 0.4;
        const bColor = isBraking ? 0xff1744 : 0x7f1d1d;
        playerVehicle.brakeL.material.emissiveIntensity = bIntensity;
        playerVehicle.brakeL.material.emissive.setHex(bColor);
        playerVehicle.brakeR.material.emissiveIntensity = bIntensity;
        playerVehicle.brakeR.material.emissive.setHex(bColor);
    }

    // Dirección suave
    const steerMax = 0.54;
    let targetSteer = 0;
    if (left) targetSteer = -steerMax;
    if (right) targetSteer = steerMax;
    playerSteerAngle = THREE.MathUtils.lerp(playerSteerAngle, targetSteer, dt * 13);

    if (playerVehicle.steerL && playerVehicle.steerR) {
        playerVehicle.steerL.rotation.y = playerSteerAngle;
        playerVehicle.steerR.rotation.y = playerSteerAngle;
    }

    const turnFactor = playerSpeed > 5 ? 1 : Math.max(0.1, playerSpeed / 5);
    playerAngle += playerSteerAngle * turnFactor * (playerSpeed >= 0 ? 1 : -1) * dt * 2.9;
    playerVehicle.rotation.y = playerAngle;

    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    playerVehicle.position.x += forwardX * playerSpeed * dt;
    playerVehicle.position.z += forwardZ * playerSpeed * dt;

    playerVehicle.wheels.forEach(w => {
        w.children[0].rotation.x += playerSpeed * dt * 2.3;
    });

    // Suspensión reactiva y peralte bancado
    const ptIdx = Math.floor(closestT * trackBankAngles.length) % trackBankAngles.length;
    const currentBank = trackBankAngles[ptIdx] || 0;

    const targetRoll = -playerSteerAngle * (playerSpeed / maxSpeed) * 0.32 + currentBank;
    const targetPitch = gas ? 0.08 : (brake ? -0.14 : 0);
    playerRoll = THREE.MathUtils.lerp(playerRoll, targetRoll, dt * 9);
    playerPitch = THREE.MathUtils.lerp(playerPitch, targetPitch, dt * 9);

    if (playerVehicle.chassis) {
        playerVehicle.chassis.rotation.z = playerRoll;
        playerVehicle.chassis.rotation.x = playerPitch;
    }

    // Derrape y Marcas de goma (Skidmarks)
    const isDrifting = Math.abs(playerSteerAngle) > 0.24 && Math.abs(playerSpeed) > 28;
    if (isDrifting || (brake && Math.abs(playerSpeed) > 30)) {
        drawAudio.setDrift(1.0);
        spawnDustParticles(playerVehicle.position);
        spawnTireSmoke(playerVehicle);

        // Obtener posición en el mundo de las ruedas traseras para huellas de derrape
        const leftTirePos = new THREE.Vector3(-1.18, 0, 1.35).applyMatrix4(playerVehicle.matrixWorld);
        const rightTirePos = new THREE.Vector3(1.18, 0, 1.35).applyMatrix4(playerVehicle.matrixWorld);
        addSkidmark(leftTirePos, rightTirePos, 0.85);
    } else {
        drawAudio.setDrift(0);
        clearSkidTireRef();
    }

    // Elevación sobre puente y rampas
    if (closestPoint && closestDist < BARRIER_LIMIT + 2) {
        playerVehicle.position.y = THREE.MathUtils.lerp(playerVehicle.position.y, closestPoint.y, 0.16);
    } else {
        playerVehicle.position.y = THREE.MathUtils.lerp(playerVehicle.position.y, 0, 0.16);
    }

    const audioTelemetry = drawAudio.update(playerSpeed, maxSpeed, gas, isTurboActive);
    checkLapProgression(playerVehicle.position);

    return audioTelemetry;
}

// ----------------------------------------------------------------------------
// 11. SISTEMA DE PARTÍCULAS VOLUMÉTRICAS Y EFECTOS VISUALES
// ----------------------------------------------------------------------------
function spawnSparks(pos) {
    for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
        s.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y + 0.6, pos.z + (Math.random() - 0.5) * 0.6);
        scene.add(s);
        particles.push({ mesh: s, life: 0.18, grow: false });
    }
}

function spawnDustParticles(pos) {
    const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.40, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xd7ccc8, transparent: true, opacity: 0.38 })
    );
    puff.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.2, pos.z + (Math.random() - 0.5) * 0.8);
    scene.add(puff);
    particles.push({ mesh: puff, life: 0.32, grow: true });
}

function spawnTireSmoke(veh) {
    const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.50 })
    );
    const rad = veh.rotation.y;
    smoke.position.set(
        veh.position.x - Math.sin(rad) * 1.4 + (Math.random() - 0.5) * 0.8,
        veh.position.y + 0.3,
        veh.position.z - Math.cos(rad) * 1.4 + (Math.random() - 0.5) * 0.8
    );
    scene.add(smoke);
    particles.push({ mesh: smoke, life: 0.40, grow: true });
}

function spawnExhaustFlames(veh) {
    const isCyan = Math.random() > 0.4;
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.7, 6),
        new THREE.MeshBasicMaterial({ color: isCyan ? 0x00f5d4 : 0xff7b00 })
    );
    flame.rotateX(Math.PI / 2);
    const rad = veh.rotation.y;
    flame.position.set(
        veh.position.x - Math.sin(rad) * 2.3 + (Math.random() - 0.5) * 0.4,
        veh.position.y + 0.5,
        veh.position.z - Math.cos(rad) * 2.3 + (Math.random() - 0.5) * 0.4
    );
    scene.add(flame);
    particles.push({ mesh: flame, life: 0.12, grow: false });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.grow) {
            p.mesh.scale.multiplyScalar(1.08);
            p.mesh.position.y += dt * 1.1;
        }
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

function updateDioramaAnimations(dt) {
    if (windmillBlades) {
        windmillBlades.rotation.z += dt * 1.6;
    }
    if (cameraFlashes.length > 0 && Math.random() < 0.08) {
        const flash = cameraFlashes[Math.floor(Math.random() * cameraFlashes.length)];
        flash.intensity = 3.6;
        setTimeout(() => flash.intensity = 0, 65);
    }
}

// ----------------------------------------------------------------------------
// 12. RIVALES IA Y TABLA DE POSICIONES EN VIVO
// ----------------------------------------------------------------------------
function updateAIPhysics(dt) {
    if (!trackCurve) return;

    aiVehicles.forEach((ai, idx) => {
        ai.progress = (ai.progress + dt * 0.036 * ai.speedFactor) % 1.0;
        const currentPt = trackCurve.getPointAt(ai.progress);
        const nextPt = trackCurve.getPointAt((ai.progress + 0.01) % 1.0);
        const tangent = nextPt.clone().sub(currentPt).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const targetPos = currentPt.clone().add(normal.clone().multiplyScalar(ai.laneOffset));
        ai.position.lerp(targetPos, 0.16);

        const targetAngle = Math.atan2(tangent.x, tangent.z);
        ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 0.14);

        ai.wheels.forEach(w => {
            w.children[0].rotation.x += dt * 32;
        });

        // Colisión entre jugador y rivales
        const dist = ai.position.distanceTo(playerVehicle.position);
        if (dist < 3.2) {
            drawAudio.playCrash();
            triggerHaptic('impact');
            playerSpeed *= 0.86;
            const pushDir = playerVehicle.position.clone().sub(ai.position).normalize();
            playerVehicle.position.add(pushDir.multiplyScalar(0.65));
        }
    });

    updateLeaderboard();
}

function updateLeaderboard() {
    // Calcular posiciones de todos los coches
    const allCars = [
        { name: playerVehicle.cfg.name, lap: playerLap, progress: playerVehicle.progress, isPlayer: true },
        ...aiVehicles.map(ai => ({ name: ai.cfg.name, lap: ai.lap, progress: ai.progress, isPlayer: false }))
    ];

    allCars.sort((a, b) => {
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.progress - a.progress;
    });

    const playerPosIdx = allCars.findIndex(c => c.isPlayer) + 1;
    if (hudPosEl) hudPosEl.innerText = `${playerPosIdx} / ${allCars.length}`;

    if (lbEntriesEl) {
        lbEntriesEl.innerHTML = allCars.map((c, i) => {
            const gap = i === 0 ? 'LÍDER' : `+${((allCars[0].progress - c.progress) * 12).toFixed(1)}s`;
            return `
                <div class="lb-row ${c.isPlayer ? 'player' : ''}">
                    <span class="lb-pos">P${i + 1}</span>
                    <span class="lb-name">${c.isPlayer ? '★ TÚ' : c.name}</span>
                    <span class="lb-gap">${gap}</span>
                </div>
            `;
        }).join('');
    }
}

// ----------------------------------------------------------------------------
// 13. CÁMARA DIORAMA TILT-SHIFT CALIBRADA (ESTILO DRAWRACE 2)
// ----------------------------------------------------------------------------
function updateCameraFollow(dt) {
    if (!playerVehicle) return;

    // Look-ahead dinámico hacia la curva que se avecina
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    const lookAheadDist = 6 + (playerSpeed / 80) * 12;

    const targetLookAt = new THREE.Vector3(
        playerVehicle.position.x + forwardX * lookAheadDist,
        playerVehicle.position.y + 1.2,
        playerVehicle.position.z + forwardZ * lookAheadDist
    );

    // Cámara a 25m de altura y 19m de distancia (perspectiva diorama cercana)
    const speedRatio = Math.abs(playerSpeed) / 80;
    const camHeight = 24 + speedRatio * 4;
    const camDist = 18 + speedRatio * 4;
    const camOffset = new THREE.Vector3(0, camHeight, camDist);
    const targetCamPos = playerVehicle.position.clone().add(camOffset);

    // FOV dinámico que se expande a alta velocidad
    const targetFOV = 46 + (isTurboActive ? 8 : speedRatio * 4);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 6);
    camera.updateProjectionMatrix();

    camera.position.lerp(targetCamPos, dt * 6.5);
    camera.lookAt(targetLookAt);
}

// ----------------------------------------------------------------------------
// 14. HUD, MINIMAPA Y CICLO DE RENDERIZADO A 60 FPS
// ----------------------------------------------------------------------------
function updateHUD(telemetry) {
    if (hudSpeedEl) {
        const kmh = Math.floor(Math.abs(playerSpeed) * 3.6);
        hudSpeedEl.innerText = `${kmh} KM/H`;
    }
    if (hudGearEl && telemetry) {
        hudGearEl.innerText = `${telemetry.gear}ª`;
    }
    if (rpmFillEl && telemetry) {
        rpmFillEl.style.width = `${Math.floor(telemetry.rpmRatio * 100)}%`;
    }
    if (turboFillEl && turboPctEl) {
        turboFillEl.style.width = `${Math.floor(turboAmount)}%`;
        turboPctEl.innerText = `${Math.floor(turboAmount)}%`;
    }
    if (hudTimeEl && gameState === 'RACE') {
        const ms = Date.now() - lapStartTime;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const cs = Math.floor((ms % 1000) / 10);
        hudTimeEl.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${cs < 10 ? '0' : ''}${cs}`;
    }
}

function checkLapProgression(pos) {
    const startPoint = trackCurve.getPointAt(0);
    const dist = Math.hypot(pos.x - startPoint.x, pos.z - startPoint.z);

    if (dist < 14) {
        if (currentWaypointIdx === 1) {
            currentWaypointIdx = 0;
            playerLap++;
            drawAudio.playCountdown(true);
            triggerHaptic('success');

            if (playerLap > TOTAL_LAPS) {
                gameState = 'FINISHED';
                if (hudPosEl) hudPosEl.innerText = '¡VICTORIA! 🏆';
            } else if (hudLapEl) {
                hudLapEl.innerText = `${playerLap} / ${TOTAL_LAPS}`;
            }
        }
    } else if (dist > 45) {
        currentWaypointIdx = 1;
    }
}

function renderRadar() {
    if (!radarCtx) return;
    radarCtx.clearRect(0, 0, 140, 110);
    const cx = 70, cy = 55, scale = 0.55;

    radarCtx.strokeStyle = '#334155';
    radarCtx.lineWidth = 4;
    radarCtx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
        const p = trackCurve.getPointAt(t);
        const rx = cx + p.x * scale;
        const ry = cy + p.z * scale;
        if (t === 0) radarCtx.moveTo(rx, ry);
        else radarCtx.lineTo(rx, ry);
    }
    radarCtx.closePath();
    radarCtx.stroke();

    aiVehicles.forEach(ai => {
        radarCtx.fillStyle = '#ef4444';
        radarCtx.beginPath();
        radarCtx.arc(cx + ai.position.x * scale, cy + ai.position.z * scale, 3.5, 0, Math.PI * 2);
        radarCtx.fill();
    });

    radarCtx.fillStyle = '#00f5d4';
    radarCtx.beginPath();
    radarCtx.arc(cx + playerVehicle.position.x * scale, cy + playerVehicle.position.z * scale, 5.0, 0, Math.PI * 2);
    radarCtx.fill();
}

function setupInputHandlers() {
    window.addEventListener('keydown', (e) => {
        drawAudio.init();
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.w = true;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.s = true;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.a = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.d = true;
        if (e.key === ' ' || e.key === 'Shift') keys.space = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.w = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.s = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.a = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.d = false;
        if (e.key === ' ' || e.key === 'Shift') keys.space = false;
    });

    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); drawAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); drawAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-gas', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
    bindTouch('btn-turbo', () => touchTurbo = true, () => touchTurbo = false);
}

function startCountdownSequence() {
    let count = 3;
    if (!countdownEl) return;
    countdownEl.style.display = 'block';
    countdownEl.innerText = '3';
    drawAudio.playCountdown(false);

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count.toString();
            countdownEl.style.color = count === 2 ? '#ff9100' : '#fee440';
            drawAudio.playCountdown(false);
        } else if (count === 0) {
            countdownEl.innerText = '¡GO!';
            countdownEl.style.color = '#00e676';
            drawAudio.playCountdown(true);
            triggerHaptic('success');
            gameState = 'RACE';
            lapStartTime = Date.now();
        } else {
            countdownEl.style.display = 'none';
            clearInterval(timer);
        }
    }, 900);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = performance.now();
function renderLoop(now) {
    requestAnimationFrame(renderLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    let telemetry = null;
    if (gameState === 'RACE') {
        telemetry = updatePlayerPhysics(dt);
        updateAIPhysics(dt);
        updateParticles(dt);
        updateDioramaAnimations(dt);
        updateHUD(telemetry);
        renderRadar();
    }

    updateCameraFollow(dt);
    renderer.render(scene, camera);
}

window.addEventListener('load', initDrawRaceEngine);
