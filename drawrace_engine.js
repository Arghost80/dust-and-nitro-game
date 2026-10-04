// ============================================================================
// DRAWRACE 3D : NEXT-GEN DIORAMA RACING ENGINE (V4)
// Sistema de Gráficos PBR, Reflejos IBL, Sombras de Contacto,
// Cámara Chase Cinemática Dinámica y Físicas de Inercia y Derrape
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
        this.currentGear = 1;
        this.gearRatios = [0.18, 0.38, 0.60, 0.82, 1.0];
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // V8 Sawtooth
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(56, this.ctx.currentTime);

            // Armónicos
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(112, this.ctx.currentTime);

            // Sub-bajos de potencia
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(28, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(420, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.048, this.ctx.currentTime);

            this.engineOsc.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
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

            // Turbo Boost
            this.turboOsc = this.ctx.createOscillator();
            this.turboOsc.type = 'sine';
            this.turboOsc.frequency.setValueAtTime(820, this.ctx.currentTime);

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
        if (!this.ctx || !this.engineOsc) return { gear: 1, rpmRatio: 0 };
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

        const baseFreq = 52;
        const targetFreq = baseFreq + gRatio * 160;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);
        this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

        const filterCut = isGas ? 680 + ratio * 1000 : 340;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.058 : 0.026;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        if (isTurbo) {
            this.turboGain.gain.setTargetAtTime(0.05, now, 0.05);
            this.turboOsc.frequency.setTargetAtTime(880 + ratio * 620, now, 0.05);
        } else {
            this.turboGain.gain.setTargetAtTime(0.0001, now, 0.08);
        }

        return { gear: gear, rpmRatio: gRatio };
    }

    setDrift(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        const now = this.ctx.currentTime;
        this.driftGain.gain.setTargetAtTime(clamped * 0.045, now, 0.035);
        this.driftOsc.frequency.setTargetAtTime(460 + clamped * 320, now, 0.035);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.16);
        gain.gain.setValueAtTime(0.20, now);
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
const drawAudio = new DrawRaceAudio();

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL MOTOR THREE.JS Y ENVIRONMENT MAP (IBL)
// ----------------------------------------------------------------------------
let scene, camera, renderer;
let trackCurve;
let trackWaypoints = [];
let trackBankAngles = [];
let playerVehicle;
let aiVehicles = [];
let particles = [];
let cameraFlashes = [];
let windmillBlades;

let cameraMode = 'CHASE'; // 'CHASE' o 'ISOMETRIC'
let camLookAtTarget = new THREE.Vector3();
let camShake = new THREE.Vector3();

let gameState = 'COUNTDOWN';
let playerSpeed = 0;
let playerLateralSpeed = 0;
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
let countdownEl, radarCanvas, radarCtx, speedVignetteEl, lbEntriesEl, btnCamToggleEl;

// Libreas de coches
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

    // ACES Filmic Tone Mapping cinematográfico
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1420);
    scene.fog = new THREE.FogExp2(0x0e1420, 0.0020);

    // 1. GENERACIÓN DE ENVIRONMENT MAP PROCEDURAL (IBL PARA REFLEJOS REALES)
    setupProceduralEnvironmentMap();

    // 2. CÁMARA DIORAMA CHASE DINÁMICA
    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 24, 18);

    // 3. ILUMINACIÓN MULTIDIRECCIONAL PBR
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.75);
    sunLight.position.set(75, 100, 48);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 340;
    const d = 135;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Luz de relleno azul cielo
    const skyFill = new THREE.DirectionalLight(0x60a5fa, 0.45);
    skyFill.position.set(-60, 45, -50);
    scene.add(skyFill);

    // Luz de rebote cálida desde el asfalto
    const groundBounce = new THREE.DirectionalLight(0x422006, 0.25);
    groundBounce.position.set(0, -10, 0);
    scene.add(groundBounce);

    // Construcción del Mundo Diorama AAA V4
    buildTerrainDiorama();
    build3DCircuitWith3DCurbs();
    buildGuardrailsWithMotorsportSponsors();
    buildStartFinishGantryAndGrid();
    buildFloodlightTowers();
    buildLushForestAndVegetation();
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

    btnCamToggleEl = document.getElementById('btn-cam-toggle');
    if (btnCamToggleEl) {
        btnCamToggleEl.addEventListener('click', () => {
            cameraMode = (cameraMode === 'CHASE') ? 'ISOMETRIC' : 'CHASE';
            btnCamToggleEl.querySelector('span').innerText = `📷 CÁMARA: ${cameraMode}`;
        });
    }

    setupInputHandlers();
    startCountdownSequence();

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(renderLoop);
}

// Genera un Environment Map equirrectangular para reflejos metálicos reales
function setupProceduralEnvironmentMap() {
    try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Gradiente: Cielo azul profundo -> Horizonte dorado -> Suelo oscuro reflectante
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#0284c7');
        grad.addColorStop(0.42, '#38bdf8');
        grad.addColorStop(0.50, '#fef08a');
        grad.addColorStop(0.53, '#f97316');
        grad.addColorStop(0.56, '#334155');
        grad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Destello del Sol
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(200, 100, 36, 0, Math.PI * 2);
        ctx.fill();

        const envTexture = new THREE.CanvasTexture(canvas);
        const envMap = pmrem.fromEquirectangular(envTexture).texture;
        scene.environment = envMap;
    } catch(e) {
        console.log('Error generando IBL:', e);
    }
}

// ----------------------------------------------------------------------------
// 3. TERRENO, ESTANQUE REFLECTANTE Y TORRES DE ILUMINACIÓN
// ----------------------------------------------------------------------------
function buildTerrainDiorama() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Hierba verde rica con micrograno
    ctx.fillStyle = '#1e3825';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 7000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillStyle = Math.random() > 0.5 ? '#254a2e' : '#172d1d';
        ctx.fillRect(x, y, 3, 3);
    }

    // Campo de cultivo dorado
    ctx.fillStyle = '#45331e';
    ctx.beginPath();
    ctx.ellipse(310, 720, 230, 170, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#322414';
    ctx.lineWidth = 4;
    for (let y = 580; y < 860; y += 14) {
        ctx.beginPath();
        ctx.moveTo(160, y);
        ctx.lineTo(440, y);
        ctx.stroke();
    }

    // Suelo de boxes
    ctx.fillStyle = '#262a33';
    ctx.fillRect(430, 830, 240, 130);

    // Escapatorias de arena
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

function buildReflectivePond() {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(-24, 0, 14);

    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.10,
        metalness: 0.88
    });

    const pondGeo = new THREE.CylinderGeometry(14, 16, 0.4, 24);
    const pondMesh = new THREE.Mesh(pondGeo, waterMat);
    pondMesh.position.y = 0.1;
    pondMesh.receiveShadow = true;
    pondGroup.add(pondMesh);

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

// 4 Torres de Iluminación de Estadio de Competición
function buildFloodlightTowers() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [
        new THREE.Vector3(45, 0, 95),
        new THREE.Vector3(-60, 0, 95),
        new THREE.Vector3(95, 0, -15),
        new THREE.Vector3(-95, 0, 20)
    ].forEach(pos => {
        const tower = new THREE.Group();
        tower.position.copy(pos);

        // Mástil de celosía
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 24, 8), steelMat);
        mast.position.y = 12;
        mast.castShadow = true;
        tower.add(mast);

        // Cabezal de focos
        const head = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 1.2), steelMat);
        head.position.y = 24;
        head.castShadow = true;
        tower.add(head);

        // Focos brillantes emisivos
        for (let row = 0; row < 2; row++) {
            for (let col = -1.6; col <= 1.6; col += 1.6) {
                const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), lampMat);
                lamp.position.set(col, 23.5 + row * 1.0, 0.62);
                tower.add(lamp);
            }
        }

        scene.add(tower);
    });
}

// ----------------------------------------------------------------------------
// 4. CIRCUITO 3D CON PIANOS POLIGONALES 3D CON ALTURA Y PUENTE DE ACERO
// ----------------------------------------------------------------------------
function build3DCircuitWith3DCurbs() {
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

        const ptIdx = Math.floor(t * trackBankAngles.length) % trackBankAngles.length;
        const bank = trackBankAngles[ptIdx] || 0;

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

    // Pianos 3D con volumen poligonal (altura achaflanada de 0.25m) en ápices
    build3DCurbGeometry();
    buildSteelTrussBridge();
}

function createHiDefRoadMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Asfalto granulado PBR
    ctx.fillStyle = '#171a22';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 9500; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillStyle = Math.random() > 0.5 ? '#202632' : '#0e1117';
        ctx.fillRect(x, y, 2, 2);
    }

    // Trazada de goma quemada
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(350, 0, 150, 1024);
    ctx.fillRect(524, 0, 150, 1024);

    // Pianos integrados en el mapa UV
    for (let y = 0; y < 1024; y += 64) {
        const isRed = ((y / 64) % 2 === 0);
        ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
        ctx.fillRect(0, y, 84, 64);
        ctx.fillRect(940, y, 84, 64);
    }

    // Líneas blancas y amarilla
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(84, 0, 12, 1024);
    ctx.fillRect(928, 0, 12, 1024);

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
        roughness: 0.72,
        metalness: 0.28
    });
}

// Pianos 3D con relieve poligonal en ápices de curvas
function build3DCurbGeometry() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

    const curbBoxGeo = new THREE.BoxGeometry(0.85, 0.22, 1.2);

    const apexIndices = [
        { start: 0.11, end: 0.19, side: 1 },  // Curva 1
        { start: 0.23, end: 0.31, side: -1 }, // Curva norte
        { start: 0.54, end: 0.62, side: 1 },  // Horquilla oeste
        { start: 0.66, end: 0.74, side: -1 }  // Enlace interior
    ];

    apexIndices.forEach(apex => {
        const steps = 24;
        for (let s = 0; s < steps; s++) {
            const t = apex.start + (s / steps) * (apex.end - apex.start);
            const p = trackCurve.getPointAt(t);
            const tan = trackCurve.getTangentAt(t).normalize();
            const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

            const curbPos = p.clone().add(norm.clone().multiplyScalar(apex.side * (TRACK_WIDTH / 2 - 0.4)));
            const curbMesh = new THREE.Mesh(curbBoxGeo, (s % 2 === 0) ? redMat : whiteMat);
            curbMesh.position.set(curbPos.x, curbPos.y + 0.11, curbPos.z);
            curbMesh.lookAt(curbMesh.position.clone().add(tan));
            curbMesh.castShadow = true;
            curbMesh.receiveShadow = true;
            scene.add(curbMesh);
        }
    });
}

function buildSteelTrussBridge() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.28 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });

    const deckGeo = new THREE.BoxGeometry(46, 1.3, 15);
    const deck = new THREE.Mesh(deckGeo, concreteMat);
    deck.position.set(-18, 5.5, -48);
    deck.rotation.y = 0.12;
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

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
// 5. GUARDARRAÍLES CON SPONSORS Y PARRILLES DE SALIDA
// ----------------------------------------------------------------------------
function buildGuardrailsWithMotorsportSponsors() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.5 });

    const railGeo = new THREE.BoxGeometry(0.24, 0.55, 2.4);
    const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.1, 6);

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
}

// Parrilla de salida con cajetines 1 a 6 y pórtico
function buildStartFinishGantryAndGrid() {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(-30, 0, 80);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });

    const colGeo = new THREE.BoxGeometry(1.0, 9, 1.0);
    const colL = new THREE.Mesh(colGeo, trussMat);
    colL.position.set(0, 4.5, -9);
    colL.castShadow = true;
    gantryGroup.add(colL);

    const colR = new THREE.Mesh(colGeo, trussMat);
    colR.position.set(0, 4.5, 9);
    colR.castShadow = true;
    gantryGroup.add(colR);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 19), trussMat);
    beam.position.set(0, 8.5, 0);
    beam.castShadow = true;
    gantryGroup.add(beam);

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

    // Cajetines de parrilla en el asfalto (P1 a P6)
    const gridLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let row = 0; row < 3; row++) {
        [-2.8, 2.8].forEach((colOffset, cIdx) => {
            const gridBox = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), gridLineMat);
            gridBox.rotation.x = -Math.PI / 2;
            gridBox.rotation.z = Math.PI / 2;
            gridBox.position.set(-30 - (row * 10), 0.12, 80 + colOffset);
            scene.add(gridBox);
        });
    }
}

// ----------------------------------------------------------------------------
// 6. BOSQUE FRONDOSO 3D Y DECORACIÓN DIORAMA
// ----------------------------------------------------------------------------
function buildLushForestAndVegetation() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const pineGreen1 = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
    const pineGreen2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    const pineGreen3 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });

    const deciduousMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
    const autumnMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });

    const createLayeredPine = (x, z, scale) => {
        const pine = new THREE.Group();
        pine.position.set(x, 0, z);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3 * scale, 8), trunkMat);
        trunk.position.y = 1.5 * scale;
        trunk.castShadow = true;
        pine.add(trunk);

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

    for (let i = 0; i < 35; i++) {
        const x = 30 + (Math.random() - 0.5) * 80;
        const z = -60 + (Math.random() - 0.5) * 45;
        let onRoad = false;
        for (let t = 0; t <= 1; t += 0.05) {
            const pt = trackCurve.getPointAt(t);
            if (Math.hypot(x - pt.x, z - pt.z) < BARRIER_LIMIT + 3) {
                onRoad = true;
                break;
            }
        }
        if (!onRoad) createLayeredPine(x, z, 0.9 + Math.random() * 0.8);
    }

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
            if (Math.random() > 0.4) createLayeredPine(x, z, 0.8 + Math.random() * 0.7);
            else createDeciduousTree(x, z, 0.85 + Math.random() * 0.5, Math.random() > 0.7);
        }
    }
}

function buildWindmillAndFarm() {
    const farmGroup = new THREE.Group();
    farmGroup.position.set(-52, 0, -8);

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

    const door = new THREE.Mesh(new THREE.BoxGeometry(5.5, 6.5, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    door.position.set(0, 3.2, 7.1);
    farmGroup.add(door);

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

    const stand = new THREE.Mesh(new THREE.BoxGeometry(58, 7.5, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
    stand.position.set(0, 3.75, 0);
    stand.castShadow = true;
    gpGroup.add(stand);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 15), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }));
    roof.position.set(0, 9.0, -1);
    roof.rotation.x = 0.1;
    roof.castShadow = true;
    gpGroup.add(roof);

    const crowdColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xffffff];
    for (let row = 0; row < 5; row++) {
        for (let col = -26; col <= 26; col += 1.5) {
            const fanMat = new THREE.MeshBasicMaterial({ color: crowdColors[Math.floor(Math.random() * crowdColors.length)] });
            const fan = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), fanMat);
            fan.position.set(col, 3.4 + row * 0.9, -4.5 + row * 2.1);
            gpGroup.add(fan);
        }
    }

    for (let f = 0; f < 5; f++) {
        const flashLight = new THREE.PointLight(0xffffff, 0, 25);
        flashLight.position.set(-18 + f * 9, 4.2, -5);
        gpGroup.add(flashLight);
        cameraFlashes.push(flashLight);
    }

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
// 7. SISTEMA DE HUELLAS DE DERRAPE PERMANENTES (SKIDMARK MANAGER)
// ----------------------------------------------------------------------------
let skidMesh;
let skidPositions = [];
let skidAlphas = [];
const MAX_SKID_POINTS = 3600;
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
            skidColor: { value: new THREE.Color(0x06080d) }
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
                gl_FragColor = vec4(skidColor, vAlpha * 0.70);
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

        skidPositions.push(lastLeftTire.x, lastLeftTire.y + 0.11, lastLeftTire.z);
        skidPositions.push(tireL.x, tireL.y + 0.11, tireL.z);
        skidAlphas.push(intensity, intensity);

        skidPositions.push(lastRightTire.x, lastRightTire.y + 0.11, lastRightTire.z);
        skidPositions.push(tireR.x, tireR.y + 0.11, tireR.z);
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
// 8. MODELADO DE COCHES CON SOMBRA DE CONTACTO PBR Y LIBREAS DE COMPETICIÓN
// ----------------------------------------------------------------------------
// Generador de textura suave de sombra de contacto (Ambient Occlusion Plaque)
function createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

let contactShadowTex = null;

function build3DVehicleMesh(cfg) {
    if (!contactShadowTex) contactShadowTex = createContactShadowTexture();

    const carRoot = new THREE.Group();

    // 1. PLACA DE SOMBRA DE CONTACTO INFERIOR (ANCLA EL COCHE AL SUELO)
    const shadowMat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.80,
        depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.05;
    carRoot.add(shadowMesh);

    // Materiales con reflejos IBL activos
    const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.14,
        metalness: 0.88
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x070b14,
        roughness: 0.04,
        metalness: 0.96
    });

    const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f12,
        roughness: 0.38,
        metalness: 0.85
    });

    const stripeMat = new THREE.MeshStandardMaterial({
        color: cfg.stripeColor,
        roughness: 0.20,
        metalness: 0.65
    });

    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.55;
    carRoot.add(chassisGroup);
    carRoot.chassis = chassisGroup;

    // Chasis central aerodinámico
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 4.4), bodyMat);
    mainBody.castShadow = true;
    chassisGroup.add(mainBody);

    // Franja Le Mans
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 4.42), stripeMat);
    stripe.position.set(0, 0.25, 0);
    chassisGroup.add(stripe);

    // Pasos de rueda ensanchados (Widebody Fenders)
    const fenderGeo = new THREE.BoxGeometry(2.44, 0.38, 1.4);
    const frontFenders = new THREE.Mesh(fenderGeo, bodyMat);
    frontFenders.position.set(0, 0.02, -1.3);
    frontFenders.castShadow = true;
    chassisGroup.add(frontFenders);

    const rearFenders = new THREE.Mesh(fenderGeo, bodyMat);
    rearFenders.position.set(0, 0.04, 1.3);
    rearFenders.castShadow = true;
    chassisGroup.add(rearFenders);

    // Cabina y parabrisas inclinado
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.54, 2.3), glassMat);
    cabin.position.set(0, 0.46, -0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    // Techo y toma de aire
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), bodyMat);
    roof.position.set(0, 0.74, -0.2);
    roof.castShadow = true;
    chassisGroup.add(roof);

    const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 1.82), stripeMat);
    roofStripe.position.set(0, 0.79, -0.2);
    chassisGroup.add(roofStripe);

    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.7), carbonMat);
    scoop.position.set(0, 0.85, -0.4);
    chassisGroup.add(scoop);

    // Alerón biplano de fibra de carbono
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.65), carbonMat);
    wing.position.set(0, 0.76, 1.95);
    wing.castShadow = true;
    chassisGroup.add(wing);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.25), carbonMat);
    postL.position.set(-0.8, 0.48, 1.95);
    const postR = postL.clone();
    postR.position.x = 0.8;
    chassisGroup.add(postL);
    chassisGroup.add(postR);

    // Splitter frontal de carbono y difusor
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 0.5), carbonMat);
    splitter.position.set(0, -0.18, -2.40);
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

    // Luces de freno traseras reactivas
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

    const flameLight = new THREE.PointLight(0x00f5d4, 0, 10);
    flameLight.position.set(0, 0.2, 2.8);
    chassisGroup.add(flameLight);
    carRoot.flameLight = flameLight;

    // 4 Ruedas 3D con neumáticos, llantas y pinzas rojas Brembo
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.40, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.90, roughness: 0.14 });
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

    carRoot.cfg = cfg;
    return carRoot;
}

function spawn3DCars() {
    const startPoint = trackCurve.getPointAt(0);
    const tangent = trackCurve.getTangentAt(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Jugador (P1)
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
        ai.speedFactor = 0.94 + Math.random() * 0.14;
        ai.lap = 1;
        scene.add(ai);
        aiVehicles.push(ai);
    }
}

// ----------------------------------------------------------------------------
// 9. FÍSICAS DE INERCIA, TRANSFERENCIA DE PESOS Y DERRAPES CONTROLABLES
// ----------------------------------------------------------------------------
function updatePlayerPhysics(dt) {
    const left = keys.a || touchLeft;
    const right = keys.d || touchRight;
    const gas = keys.w || touchGas;
    const brake = keys.s || touchBrake;
    const turbo = keys.space || touchTurbo;

    // Distancia al eje de la pista
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
        grip = 0.52;
        spawnDustParticles(playerVehicle.position);
    }

    // LÍMITE RÍGIDO DE 1.8M DE ESCAPATORIA
    if (closestDist >= BARRIER_LIMIT && closestPoint) {
        drawAudio.playCrash();
        triggerHaptic('impact');
        playerSpeed *= 0.60;
        camShake.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, 0);

        const toTrack = closestPoint.clone().sub(playerVehicle.position).normalize();
        playerVehicle.position.x += toTrack.x * 0.95;
        playerVehicle.position.z += toTrack.z * 0.95;
        spawnSparks(playerVehicle.position);
    }

    // Turbo Boost
    isTurboActive = false;
    if (turbo && turboAmount > 2 && gas) {
        isTurboActive = true;
        turboAmount = Math.max(0, turboAmount - dt * 26);
        spawnExhaustFlames(playerVehicle);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 2.8;
        if (speedVignetteEl) speedVignetteEl.classList.add('nitro-active');
        camShake.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 0);
    } else {
        turboAmount = Math.min(100, turboAmount + dt * 10);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 0;
        if (speedVignetteEl) speedVignetteEl.classList.remove('nitro-active');
    }

    const maxSpeed = (isTurboActive ? 82 : 58) * grip;
    const accelRate = (isTurboActive ? 54 : 32) * grip;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-18, playerSpeed - 44 * dt);
    } else {
        playerSpeed *= 0.985;
    }

    // Luces de freno activas
    const isBraking = brake || (playerSpeed > 10 && !gas);
    if (playerVehicle.brakeL && playerVehicle.brakeR) {
        const bIntensity = isBraking ? 2.0 : 0.4;
        const bColor = isBraking ? 0xff1744 : 0x7f1d1d;
        playerVehicle.brakeL.material.emissiveIntensity = bIntensity;
        playerVehicle.brakeL.material.emissive.setHex(bColor);
        playerVehicle.brakeR.material.emissiveIntensity = bIntensity;
        playerVehicle.brakeR.material.emissive.setHex(bColor);
    }

    // Dirección suave
    const steerMax = 0.55;
    let targetSteer = 0;
    if (left) targetSteer = -steerMax;
    if (right) targetSteer = steerMax;
    playerSteerAngle = THREE.MathUtils.lerp(playerSteerAngle, targetSteer, dt * 14);

    if (playerVehicle.steerL && playerVehicle.steerR) {
        playerVehicle.steerL.rotation.y = playerSteerAngle;
        playerVehicle.steerR.rotation.y = playerSteerAngle;
    }

    // Giro con inercia angular
    const turnFactor = playerSpeed > 5 ? 1 : Math.max(0.1, playerSpeed / 5);
    playerAngle += playerSteerAngle * turnFactor * (playerSpeed >= 0 ? 1 : -1) * dt * 3.0;
    playerVehicle.rotation.y = playerAngle;

    // Desplazamiento longitudinal y deriva lateral
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    const lateralX = Math.cos(playerAngle);
    const lateralZ = -Math.sin(playerAngle);

    // Inercia de derrape (Powerslide)
    const isDrifting = Math.abs(playerSteerAngle) > 0.22 && Math.abs(playerSpeed) > 28;
    const targetLateral = isDrifting ? -playerSteerAngle * playerSpeed * 0.35 : 0;
    playerLateralSpeed = THREE.MathUtils.lerp(playerLateralSpeed, targetLateral, dt * 6);

    playerVehicle.position.x += (forwardX * playerSpeed + lateralX * playerLateralSpeed) * dt;
    playerVehicle.position.z += (forwardZ * playerSpeed + lateralZ * playerLateralSpeed) * dt;

    playerVehicle.wheels.forEach(w => {
        w.children[0].rotation.x += playerSpeed * dt * 2.3;
    });

    // Suspensión reactiva y peralte
    const ptIdx = Math.floor(closestT * trackBankAngles.length) % trackBankAngles.length;
    const currentBank = trackBankAngles[ptIdx] || 0;

    const targetRoll = -playerSteerAngle * (playerSpeed / maxSpeed) * 0.36 + currentBank;
    const targetPitch = gas ? 0.08 : (brake ? -0.15 : 0);
    playerRoll = THREE.MathUtils.lerp(playerRoll, targetRoll, dt * 9);
    playerPitch = THREE.MathUtils.lerp(playerPitch, targetPitch, dt * 9);

    if (playerVehicle.chassis) {
        playerVehicle.chassis.rotation.z = playerRoll;
        playerVehicle.chassis.rotation.x = playerPitch;
    }

    // Marcas de goma (Skidmarks) y nubes de humo denso
    if (isDrifting || (brake && Math.abs(playerSpeed) > 26)) {
        drawAudio.setDrift(1.0);
        spawnDustParticles(playerVehicle.position);
        spawnTireSmoke(playerVehicle);

        const leftTirePos = new THREE.Vector3(-1.18, 0, 1.35).applyMatrix4(playerVehicle.matrixWorld);
        const rightTirePos = new THREE.Vector3(1.18, 0, 1.35).applyMatrix4(playerVehicle.matrixWorld);
        addSkidmark(leftTirePos, rightTirePos, 0.88);
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
// 10. PARTÍCULAS VOLUMÉTRICAS Y DECORACIÓN
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
        new THREE.SphereGeometry(0.42, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xd7ccc8, transparent: true, opacity: 0.38 })
    );
    puff.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.2, pos.z + (Math.random() - 0.5) * 0.8);
    scene.add(puff);
    particles.push({ mesh: puff, life: 0.32, grow: true });
}

function spawnTireSmoke(veh) {
    const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.55 })
    );
    const rad = veh.rotation.y;
    smoke.position.set(
        veh.position.x - Math.sin(rad) * 1.4 + (Math.random() - 0.5) * 0.8,
        veh.position.y + 0.3,
        veh.position.z - Math.cos(rad) * 1.4 + (Math.random() - 0.5) * 0.8
    );
    scene.add(smoke);
    particles.push({ mesh: smoke, life: 0.42, grow: true });
}

function spawnExhaustFlames(veh) {
    const isCyan = Math.random() > 0.4;
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.75, 6),
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
        flash.intensity = 3.8;
        setTimeout(() => flash.intensity = 0, 65);
    }
}

// ----------------------------------------------------------------------------
// 11. RIVALES IA Y TABLA DE POSICIONES EN VIVO
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

        // Colisión entre jugador e IA
        const dist = ai.position.distanceTo(playerVehicle.position);
        if (dist < 3.2) {
            drawAudio.playCrash();
            triggerHaptic('impact');
            playerSpeed *= 0.86;
            camShake.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0);
            const pushDir = playerVehicle.position.clone().sub(ai.position).normalize();
            playerVehicle.position.add(pushDir.multiplyScalar(0.65));
        }
    });

    updateLeaderboard();
}

function updateLeaderboard() {
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
// 12. CÁMARA CHASE DIORAMA DINÁMICA CON ROTACIÓN SUAVE
// ----------------------------------------------------------------------------
function updateCameraFollow(dt) {
    if (!playerVehicle) return;

    // Disipación de sacudidas de cámara
    camShake.multiplyScalar(0.85);

    const speedRatio = Math.min(1, Math.abs(playerSpeed) / 80);
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);

    if (cameraMode === 'CHASE') {
        // CÁMARA CHASE DINÁMICA: Rota suavemente siguiendo la trasera del vehículo
        const camDistance = 17 + speedRatio * 3.5;
        const camHeight = 22 + speedRatio * 4;

        const targetCamX = playerVehicle.position.x - forwardX * camDistance + camShake.x;
        const targetCamZ = playerVehicle.position.z - forwardZ * camDistance + camShake.y;
        const targetCamY = playerVehicle.position.y + camHeight;

        // Look-ahead predictivo adelantado
        const lookDist = 7 + speedRatio * 11;
        const targetLookX = playerVehicle.position.x + forwardX * lookDist;
        const targetLookZ = playerVehicle.position.z + forwardZ * lookDist;
        const targetLookY = playerVehicle.position.y + 1.2;

        const targetCamPos = new THREE.Vector3(targetCamX, targetCamY, targetCamZ);
        const targetLookAt = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);

        camera.position.lerp(targetCamPos, dt * 5.5);
        camLookAtTarget.lerp(targetLookAt, dt * 7.0);
        camera.lookAt(camLookAtTarget);
    } else {
        // CÁMARA ISOMÉTRICA FIJA DIORAMA (55°)
        const camOffset = new THREE.Vector3(0, 26 + speedRatio * 4, 20 + speedRatio * 4).add(camShake);
        const targetCamPos = playerVehicle.position.clone().add(camOffset);

        const lookDist = 5 + speedRatio * 8;
        const targetLookAt = new THREE.Vector3(
            playerVehicle.position.x + forwardX * lookDist,
            playerVehicle.position.y + 1.2,
            playerVehicle.position.z + forwardZ * lookDist
        );

        camera.position.lerp(targetCamPos, dt * 6.0);
        camLookAtTarget.lerp(targetLookAt, dt * 7.5);
        camera.lookAt(camLookAtTarget);
    }

    // FOV elástico proporcional a la velocidad
    const targetFOV = 48 + (isTurboActive ? 8 : speedRatio * 4);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 5);
    camera.updateProjectionMatrix();
}

// ----------------------------------------------------------------------------
// 13. HUD, MINIMAPA Y CICLO DE RENDERIZADO A 60 FPS
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
