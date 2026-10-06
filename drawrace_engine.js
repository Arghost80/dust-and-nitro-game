// ============================================================================
// DRAWRACE 3D : CYBER-APEX NEO TOKYO (V5 SCI-FI / CYBERPUNK EDITION)
// Motor 3D de Nueva Generación con Iluminación Neón PBR, IBL Cyberpunk,
// Superdeportivos Futuristas con Underglow Neón, Faros Láser Proyectados,
// Pistas con Pianos LED Emisivos, Rascacielos Neón y Físicas de Inercia
// ============================================================================

if (window.Telegram && window.Telegram.WebApp) {
    try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    } catch(e) {}
}

// ----------------------------------------------------------------------------
// 1. SINTETIZADOR DE AUDIO PROCEDURAL : HÍBRIDO TURBINA ELÉCTRICA / V8
// ----------------------------------------------------------------------------
class CyberAudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.turbineOsc = null;
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

            // V8 Combustión / Plasma
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(54, this.ctx.currentTime);

            // Turbina Eléctrica Sci-Fi
            this.turbineOsc = this.ctx.createOscillator();
            this.turbineOsc.type = 'sine';
            this.turbineOsc.frequency.setValueAtTime(240, this.ctx.currentTime);

            // Sub-bajos de Gravedad
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'triangle';
            this.subOsc.frequency.setValueAtTime(27, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(440, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.engineOsc.connect(this.filter);
            this.turbineOsc.connect(this.filter);
            this.subOsc.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.turbineOsc.start();
            this.subOsc.start();

            // Derrape de Neumáticos en Asfalto Mojado
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(460, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(900, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            // Silbido de Plasma Boost
            this.turboOsc = this.ctx.createOscillator();
            this.turboOsc.type = 'sine';
            this.turboOsc.frequency.setValueAtTime(840, this.ctx.currentTime);

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

        const baseFreq = 50;
        const targetFreq = baseFreq + gRatio * 165;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.turbineOsc.frequency.setTargetAtTime(220 + ratio * 650, now, 0.04);
        this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

        const filterCut = isGas ? 700 + ratio * 1100 : 360;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.055 : 0.024;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        if (isTurbo) {
            this.turboGain.gain.setTargetAtTime(0.055, now, 0.05);
            this.turboOsc.frequency.setTargetAtTime(900 + ratio * 700, now, 0.05);
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
        this.driftOsc.frequency.setTargetAtTime(440 + clamped * 340, now, 0.035);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.16);
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
        osc.frequency.setValueAtTime(isGo ? 960 : 480, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.38 : 0.14));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.38 : 0.14));
    }
}
const drawAudio = new CyberAudioEngine();

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL MOTOR Y SKYLINE CYBERPUNK
// ----------------------------------------------------------------------------
let scene, camera, renderer;
let trackCurve;
let trackWaypoints = [];
let trackBankAngles = [];
let playerVehicle;
let aiVehicles = [];
let particles = [];
let holographicBillboards = [];
let skySearchlights = [];
let sciFiWindmillBlades;

let cameraMode = 'ISOMETRIC'; // 'ISOMETRIC' (Diorama estilo DrawRace 2) o 'CHASE'
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

// Elementos de la interfaz HUD
let hudPosEl, hudLapEl, hudTimeEl, hudSpeedEl, hudGearEl, rpmFillEl, turboFillEl, turboPctEl;
let countdownEl, radarCanvas, radarCtx, speedVignetteEl, lbEntriesEl, btnCamToggleEl;

// Libreas de bólidos Cyberpunk
const CYBER_CARS = [
    { color: 0x00f5d4, accentColor: 0xff007f, neonUnderglow: 0x00f5d4, name: 'APEX PHANTOM', team: 'NEO TOKYO' },
    { color: 0xff0055, accentColor: 0xfee440, neonUnderglow: 0xff0055, name: 'CYBER VIPER', team: 'ARASAKA' },
    { color: 0x7928ca, accentColor: 0x00f5d4, neonUnderglow: 0x7928ca, name: 'VOID RUNNER', team: 'QUANTUM' },
    { color: 0xffb703, accentColor: 0x023047, neonUnderglow: 0xffb703, name: 'SOLAR FLARE', team: 'HYPERION' },
    { color: 0x06d6a0, accentColor: 0x118ab2, neonUnderglow: 0x06d6a0, name: 'NEXUS SHADOW', team: 'CYBERDYNE' },
    { color: 0x4361ee, accentColor: 0xf72585, neonUnderglow: 0x4361ee, name: 'PLASMA APEX', team: 'SYNTH GP' }
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

    // ACES Filmic Tone Mapping para alto rango dinámico (HDR)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Cielo Cyberpunk Medianoche
    scene.fog = new THREE.FogExp2(0x060913, 0.0024);

    // 1. ENVIRONMENT MAP HDR CYBERPUNK PROCEDURAL
    setupCyberpunkEnvironmentMap();

    // 2. CÁMARA DIORAMA CHASE DINÁMICA
    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 24, 18);

    // 3. ILUMINACIÓN CYBERPUNK MULTI-NEÓN
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.85);
    scene.add(ambientLight);

    // Sol luna rasante frío azul eléctrico
    const moonLight = new THREE.DirectionalLight(0x7dd3fc, 1.45);
    moonLight.position.set(70, 95, 45);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 340;
    const d = 135;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0004;
    scene.add(moonLight);

    // Relleno Neón Magenta/Púrpura ambiental
    const neonFill = new THREE.DirectionalLight(0xd946ef, 0.55);
    neonFill.position.set(-60, 45, -50);
    scene.add(neonFill);

    // Focos de cielo que barren el horizonte (Searchlights)
    buildSkySearchlights();

    // Construcción del Mundo Futurista
    buildCyberTerrain();
    build3DCircuitWithNeonCurbs();
    buildHolographicGuardrails();
    buildHolographicGantry();
    buildCyberpunkSkyscrapers();
    buildSciFiWindTurbine();
    buildPaddockAndGrandstand();
    initSkidmarkManager();
    spawnCyberCars();

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

// Mapa de entorno HDRI Cyberpunk con reflejos de rascacielos y neón
function setupCyberpunkEnvironmentMap() {
    try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Gradiente: Índigo espacial -> Neón Magenta y Cian -> Suelo mojado
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#020617');
        grad.addColorStop(0.40, '#0f172a');
        grad.addColorStop(0.48, '#06b6d4');
        grad.addColorStop(0.52, '#d946ef');
        grad.addColorStop(0.56, '#1e1b4b');
        grad.addColorStop(1.0, '#05070e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Franjas de luces de rascacielos
        ctx.fillStyle = '#00f5d4';
        for (let x = 20; x < 500; x += 32) {
            ctx.fillRect(x, 110, 4, 30);
            ctx.fillStyle = (x % 64 === 0) ? '#ff007f' : '#00f5d4';
        }

        const envTexture = new THREE.CanvasTexture(canvas);
        const envMap = pmrem.fromEquirectangular(envTexture).texture;
        scene.environment = envMap;
    } catch(e) {
        console.log('Error generando IBL:', e);
    }
}

// ----------------------------------------------------------------------------
// 3. TERRENO CYBERPUNK, RASCACIELOS Y LUCES DE BÚSQUEDA DEL CIELO
// ----------------------------------------------------------------------------
function buildCyberTerrain() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Suelo de aleación de carbono oscuro con cuadrícula cibernética
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 1024, 1024);

    // Cuadrícula de luz tenue (Grid Sci-Fi)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
    }
    for (let y = 0; y < 1024; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
    }

    // Circuitos de fibra luminosa que recorren el suelo
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
        const x1 = Math.random() * 1024;
        const y1 = Math.random() * 1024;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (Math.random() - 0.5) * 200, y1 + (Math.random() - 0.5) * 200);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const terrainGeo = new THREE.PlaneGeometry(420, 420, 32, 32);
    const terrainMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.35
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.06;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

// Rascacielos futuristas de Neo Tokyo con ventanas de neón
function buildCyberpunkSkyscrapers() {
    const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1d,
        roughness: 0.35,
        metalness: 0.85
    });

    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const neonPink = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const beaconRed = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    for (let i = 0; i < 24; i++) {
        const x = 70 + (Math.random() - 0.5) * 110;
        const z = -65 + (Math.random() - 0.5) * 80;

        // Comprobar que no esté encima del circuito
        let onRoad = false;
        for (let t = 0; t <= 1; t += 0.04) {
            const pt = trackCurve.getPointAt(t);
            if (Math.hypot(x - pt.x, z - pt.z) < BARRIER_LIMIT + 8) {
                onRoad = true;
                break;
            }
        }
        if (onRoad) continue;

        const w = 12 + Math.random() * 16;
        const d = 12 + Math.random() * 16;
        const h = 45 + Math.random() * 65;

        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        scene.add(building);

        // Tiras verticales de luz de neón en las aristas
        const stripMat = Math.random() > 0.5 ? neonCyan : neonPink;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), stripMat);
        strip.position.set(x + w / 2, h / 2, z + d / 2);
        scene.add(strip);

        // Luz de baliza roja parpadeante en la cúspide
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), beaconRed);
        beacon.position.set(x, h + 1, z);
        scene.add(beacon);
    }
}

// Haces de luz de búsqueda que barren el cielo
function buildSkySearchlights() {
    for (let s = 0; s < 3; s++) {
        const beamGeo = new THREE.CylinderGeometry(0.5, 9, 140, 12);
        beamGeo.translate(0, 70, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: s === 0 ? 0x00f5d4 : (s === 1 ? 0xd946ef : 0x38bdf8),
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(-60 + s * 60, 0, -90);
        beam.rotation.z = 0.25 * (s - 1);
        beam.rotation.x = -0.3;
        scene.add(beam);
        skySearchlights.push(beam);
    }
}

// Turbina eólica Sci-Fi con puntas de neón
function buildSciFiWindTurbine() {
    const turbineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 32, 12), turbineMat);
    mast.position.set(-68, 16, -18);
    mast.castShadow = true;
    scene.add(mast);

    sciFiWindmillBlades = new THREE.Group();
    sciFiWindmillBlades.position.set(-68, 32, -16.2);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    for (let b = 0; b < 3; b++) {
        const bGroup = new THREE.Group();
        bGroup.rotation.z = b * (Math.PI * 2 / 3);

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.2), bladeMat);
        blade.position.y = 7;
        bGroup.add(blade);

        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.84, 2.5, 0.24), tipMat);
        tip.position.y = 13;
        bGroup.add(tip);

        sciFiWindmillBlades.add(bGroup);
    }
    scene.add(sciFiWindmillBlades);
}

// ----------------------------------------------------------------------------
// 4. CIRCUITO ASFALTO MOJADO CON PIANOS LED DE NEÓN Y PUENTE SUSPENDIDO
// ----------------------------------------------------------------------------
function build3DCircuitWithNeonCurbs() {
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

    const roadMat = createCyberRoadMaterial();
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Pianos 3D con LED Neón Cian y Magenta brillante
    buildNeonLED3DCurbs();
    buildCyberOverpassBridge();
}

function createCyberRoadMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Asfalto mojado reflectante con grano oscuro
    ctx.fillStyle = '#090c14';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 9000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillStyle = Math.random() > 0.5 ? '#111724' : '#05070c';
        ctx.fillRect(x, y, 2, 2);
    }

    // Trazada engomada oscura
    ctx.fillStyle = '#030508';
    ctx.fillRect(350, 0, 150, 1024);
    ctx.fillRect(524, 0, 150, 1024);

    // Pianos de luz Neón integrada: Cian eléctrico y Rosa/Magenta fluorescente
    for (let y = 0; y < 1024; y += 64) {
        const isCyan = ((y / 64) % 2 === 0);
        ctx.fillStyle = isCyan ? '#00f5d4' : '#ff007f';
        ctx.fillRect(0, y, 84, 64);
        ctx.fillRect(940, y, 84, 64);
    }

    // Líneas de límite de pista láser
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(84, 0, 8, 1024);
    ctx.fillRect(932, 0, 8, 1024);

    // Línea discontinua central de pulsos cian
    ctx.fillStyle = '#38bdf8';
    for (let y = 0; y < 1024; y += 128) {
        ctx.fillRect(508, y + 20, 8, 88);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 48);

    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.35,  // Asfalto mojado reflectante
        metalness: 0.65
    });
}

function buildNeonLED3DCurbs() {
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const curbBoxGeo = new THREE.BoxGeometry(0.85, 0.24, 1.2);

    const apexIndices = [
        { start: 0.11, end: 0.19, side: 1 },
        { start: 0.23, end: 0.31, side: -1 },
        { start: 0.54, end: 0.62, side: 1 },
        { start: 0.66, end: 0.74, side: -1 }
    ];

    apexIndices.forEach(apex => {
        const steps = 24;
        for (let s = 0; s < steps; s++) {
            const t = apex.start + (s / steps) * (apex.end - apex.start);
            const p = trackCurve.getPointAt(t);
            const tan = trackCurve.getTangentAt(t).normalize();
            const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

            const curbPos = p.clone().add(norm.clone().multiplyScalar(apex.side * (TRACK_WIDTH / 2 - 0.4)));
            const curbMesh = new THREE.Mesh(curbBoxGeo, (s % 2 === 0) ? neonCyanMat : neonPinkMat);
            curbMesh.position.set(curbPos.x, curbPos.y + 0.12, curbPos.z);
            curbMesh.lookAt(curbMesh.position.clone().add(tan));
            scene.add(curbMesh);
        }
    });
}

function buildCyberOverpassBridge() {
    const alloyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 1.3, 15), alloyMat);
    deck.position.set(-18, 5.5, -48);
    deck.rotation.y = 0.12;
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Pilares con tiras de luz vertical
    const pierGeo = new THREE.CylinderGeometry(1.2, 1.4, 7.2, 12);
    [
        new THREE.Vector3(-2, 3.6, -40),
        new THREE.Vector3(-34, 3.6, -38),
        new THREE.Vector3(4, 3.6, -56),
        new THREE.Vector3(-38, 3.6, -54)
    ].forEach(pos => {
        const pier = new THREE.Mesh(pierGeo, alloyMat);
        pier.position.copy(pos);
        pier.castShadow = true;
        scene.add(pier);

        // Línea de neón vertical
        const nStrip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7.2, 0.15), new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
        nStrip.position.set(pos.x, pos.y, pos.z + 1.45);
        scene.add(nStrip);
    });
}

// ----------------------------------------------------------------------------
// 5. GUARDARRAÍLES HOLOGRÁFICOS Y PÓRTICO DIGITAL DE SALIDA
// ----------------------------------------------------------------------------
function buildHolographicGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    const railGeo = new THREE.BoxGeometry(0.24, 0.55, 2.4);

    const holoAds = [
        { text: 'ARASAKA MOTORS', color: '#ff0055' },
        { text: 'NEO TOKYO RACING', color: '#00f5d4' },
        { text: 'QUANTUM PROTOCOL', color: '#8b5cf6' },
        { text: 'CYBERDYNE APEX', color: '#38bdf8' },
        { text: 'TELEGRAM 3.0 GP', color: '#00f5d4' }
    ];

    const createHoloTexture = (ad) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, 256, 64);
        ctx.strokeStyle = ad.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 248, 56);
        ctx.fillStyle = ad.color;
        ctx.font = '900 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ad.text, 128, 32);
        return new THREE.CanvasTexture(canvas);
    };

    const holoTextures = holoAds.map(createHoloTexture);

    const steps = 220;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const p = trackCurve.getPointAt(t);
        const tan = trackCurve.getTangentAt(t).normalize();
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        const leftPos = p.clone().add(norm.clone().multiplyScalar(-BARRIER_LIMIT));
        const rightPos = p.clone().add(norm.clone().multiplyScalar(BARRIER_LIMIT));

        const railL = new THREE.Mesh(railGeo, railMat);
        railL.position.copy(leftPos);
        railL.position.y += 0.65;
        railL.lookAt(railL.position.clone().add(tan));
        scene.add(railL);

        const railR = new THREE.Mesh(railGeo, railMat);
        railR.position.copy(rightPos);
        railR.position.y += 0.65;
        railR.lookAt(railR.position.clone().add(tan));
        scene.add(railR);

        // Vallas de hologramas en curvas
        if (i % 5 === 0 && (i < 50 || (i > 100 && i < 160))) {
            const hTex = holoTextures[(i / 5) % holoTextures.length];
            const hMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2.3, 0.8),
                new THREE.MeshBasicMaterial({ map: hTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
            );
            hMesh.position.copy(rightPos);
            hMesh.position.y += 0.85;
            hMesh.lookAt(hMesh.position.clone().add(tan));
            scene.add(hMesh);
            holographicBillboards.push(hMesh);
        }
    }
}

// Pórtico digital holográfico de meta
function buildHolographicGantry() {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(-30, 0, 80);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    const colGeo = new THREE.BoxGeometry(1.0, 9, 1.0);
    const colL = new THREE.Mesh(colGeo, trussMat);
    colL.position.set(0, 4.5, -9);
    gantryGroup.add(colL);

    const colR = new THREE.Mesh(colGeo, trussMat);
    colR.position.set(0, 4.5, 9);
    gantryGroup.add(colR);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 19), trussMat);
    beam.position.set(0, 8.5, 0);
    gantryGroup.add(beam);

    // Cartel Holográfico Digital
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 512;
    gCanvas.height = 64;
    const gCtx = gCanvas.getContext('2d');
    gCtx.fillStyle = '#06b6d4';
    gCtx.fillRect(0, 0, 512, 64);
    gCtx.fillStyle = '#020617';
    gCtx.fillRect(6, 6, 500, 52);
    gCtx.fillStyle = '#00f5d4';
    gCtx.font = '900 32px Arial';
    gCtx.textAlign = 'center';
    gCtx.fillText('★ NEO TOKYO GP : START / FINISH ★', 256, 42);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gCanvas) }));
    sign.position.set(0.72, 8.5, 0);
    sign.rotation.y = Math.PI / 2;
    gantryGroup.add(sign);

    scene.add(gantryGroup);
}

function buildPaddockAndGrandstand() {
    const gpGroup = new THREE.Group();
    gpGroup.position.set(-5, 0, 96);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(58, 7.5, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
    stand.position.set(0, 3.75, 0);
    stand.castShadow = true;
    gpGroup.add(stand);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 15), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }));
    roof.position.set(0, 9.0, -1);
    roof.rotation.x = 0.1;
    gpGroup.add(roof);

    // Tiras de luces de neón en la visera de la tribuna
    const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 0.2), new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
    neonTrim.position.set(0, 8.6, 6.4);
    gpGroup.add(neonTrim);

    scene.add(gpGroup);
}

// ----------------------------------------------------------------------------
// 6. SISTEMA DE HUELLAS INCANDESCENTES Y CHISPAS
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
            skidColor: { value: new THREE.Color(0x020306) }
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
                gl_FragColor = vec4(skidColor, vAlpha * 0.75);
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
// 7. SUPERDEPORTIVOS CYBER-APEX : AERODINÁMICA ESCULPIDA Y NEÓN UNDERGLOW
// ----------------------------------------------------------------------------
function createSoftShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.90)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.60)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

let shadowTex = null;

function buildCyberCarMesh(cfg) {
    if (!shadowTex) shadowTex = createSoftShadowTexture();

    const carRoot = new THREE.Group();

    // 1. Placa de sombra de contacto
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.85, depthWrite: false });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.05;
    carRoot.add(shadowMesh);

    // 2. Luz de Neón Underglow bajo el chasis
    const underglowLight = new THREE.PointLight(cfg.neonUnderglow, 2.4, 6.5);
    underglowLight.position.set(0, 0.25, 0);
    carRoot.add(underglowLight);

    const underglowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 3.8),
        new THREE.MeshBasicMaterial({ color: cfg.neonUnderglow, transparent: true, opacity: 0.45, depthWrite: false })
    );
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.08;
    carRoot.add(underglowMesh);

    // Materiales PBR metalizados
    const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.12,
        metalness: 0.90
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x050a14,
        roughness: 0.03,
        metalness: 0.98
    });

    const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f14,
        roughness: 0.35,
        metalness: 0.88
    });

    const accentMat = new THREE.MeshBasicMaterial({
        color: cfg.accentColor
    });

    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.55;
    carRoot.add(chassisGroup);
    carRoot.chassis = chassisGroup;

    // Chasis aerodinámico afilado en cuña
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.46, 4.4), bodyMat);
    mainBody.castShadow = true;
    chassisGroup.add(mainBody);

    // Canards y pasos de rueda ensanchados
    const fenderGeo = new THREE.BoxGeometry(2.46, 0.38, 1.4);
    const frontFenders = new THREE.Mesh(fenderGeo, bodyMat);
    frontFenders.position.set(0, 0.02, -1.3);
    frontFenders.castShadow = true;
    chassisGroup.add(frontFenders);

    const rearFenders = new THREE.Mesh(fenderGeo, bodyMat);
    rearFenders.position.set(0, 0.04, 1.3);
    rearFenders.castShadow = true;
    chassisGroup.add(rearFenders);

    // Cabina de caza furtivo polarizada
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.54, 2.3), glassMat);
    cabin.position.set(0, 0.46, -0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    // Tira luminosa central de neón en el techo
    const roofNeon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.8), accentMat);
    roofNeon.position.set(0, 0.76, -0.2);
    chassisGroup.add(roofNeon);

    // Alerón biplano de carbono con endplates de neón brillante
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.65), carbonMat);
    wing.position.set(0, 0.78, 1.95);
    wing.castShadow = true;
    chassisGroup.add(wing);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.25), carbonMat);
    postL.position.set(-0.8, 0.50, 1.95);
    const postR = postL.clone();
    postR.position.x = 0.8;
    chassisGroup.add(postL);
    chassisGroup.add(postR);

    // Endplates de neón brillante en los extremos del alerón
    const endL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.7), accentMat);
    endL.position.set(-1.18, 0.78, 1.95);
    const endR = endL.clone();
    endR.position.x = 1.18;
    chassisGroup.add(endL);
    chassisGroup.add(endR);

    // Faros Láser Proyectados (SpotLight cian/blanco hacia el asfalto)
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.1), new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
    hlL.position.set(-0.78, 0.1, -2.22);
    const hlR = hlL.clone();
    hlR.position.x = 0.78;
    chassisGroup.add(hlL);
    chassisGroup.add(hlR);

    const headLightCone = new THREE.SpotLight(0x00f5d4, 1.8, 30, Math.PI / 5.5, 0.5);
    headLightCone.position.set(0, 0.4, -2.0);
    headLightCone.target.position.set(0, 0, -18);
    chassisGroup.add(headLightCone);
    chassisGroup.add(headLightCone.target);

    // Barra LED continua de freno trasera
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
    const brakeBar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.10, 0.1), brakeMat);
    brakeBar.position.set(0, 0.1, 2.22);
    chassisGroup.add(brakeBar);
    carRoot.brakeBar = brakeBar;

    // Escapes de plasma con luz puntual
    const flameLight = new THREE.PointLight(0x00f5d4, 0, 12);
    flameLight.position.set(0, 0.2, 2.8);
    chassisGroup.add(flameLight);
    carRoot.flameLight = flameLight;

    // Ruedas con llantas de aleación y pinzas Brembo
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.40, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1118, roughness: 0.90 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.12 });
    const caliperMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

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

function spawnCyberCars() {
    const startPoint = trackCurve.getPointAt(0);
    const tangent = trackCurve.getTangentAt(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Coche del jugador (P1)
    playerVehicle = buildCyberCarMesh(CYBER_CARS[0]);
    playerVehicle.position.copy(startPoint).add(normal.clone().multiplyScalar(2.6));
    playerAngle = Math.atan2(tangent.x, tangent.z);
    playerVehicle.rotation.y = playerAngle;
    playerVehicle.lap = 1;
    playerVehicle.progress = 0;
    scene.add(playerVehicle);

    // 5 Rivales IA
    aiVehicles = [];
    for (let i = 1; i <= 5; i++) {
        const ai = buildCyberCarMesh(CYBER_CARS[i]);
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
// 8. FÍSICAS DE INERCIA, CONTRAVOLANTE Y TURBO PLASMA
// ----------------------------------------------------------------------------
function updatePlayerPhysics(dt) {
    const left = keys.a || touchLeft;
    const right = keys.d || touchRight;
    const gas = keys.w || touchGas;
    const brake = keys.s || touchBrake;
    const turbo = keys.space || touchTurbo;

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

    // Turbo Boost Plasma
    isTurboActive = false;
    if (turbo && turboAmount > 2 && gas) {
        isTurboActive = true;
        turboAmount = Math.max(0, turboAmount - dt * 26);
        spawnPlasmaFlames(playerVehicle);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 3.2;
        if (speedVignetteEl) speedVignetteEl.classList.add('nitro-active');
        camShake.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 0);
    } else {
        turboAmount = Math.min(100, turboAmount + dt * 10);
        if (playerVehicle.flameLight) playerVehicle.flameLight.intensity = 0;
        if (speedVignetteEl) speedVignetteEl.classList.remove('nitro-active');
    }

    const maxSpeed = (isTurboActive ? 84 : 60) * grip;
    const accelRate = (isTurboActive ? 56 : 34) * grip;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-18, playerSpeed - 44 * dt);
    } else {
        playerSpeed *= 0.985;
    }

    // Barra de freno LED activa
    const isBraking = brake || (playerSpeed > 10 && !gas);
    if (playerVehicle.brakeBar) {
        playerVehicle.brakeBar.material.emissiveIntensity = isBraking ? 2.5 : 0.4;
        playerVehicle.brakeBar.material.emissive.setHex(isBraking ? 0xff0033 : 0x7f1d1d);
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

    const turnFactor = playerSpeed > 5 ? 1 : Math.max(0.1, playerSpeed / 5);
    playerAngle += playerSteerAngle * turnFactor * (playerSpeed >= 0 ? 1 : -1) * dt * 3.0;
    playerVehicle.rotation.y = playerAngle;

    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    const lateralX = Math.cos(playerAngle);
    const lateralZ = -Math.sin(playerAngle);

    // Deriva lateral de derrape (Powerslide)
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

    // Marcas de goma (Skidmarks) y humo de plasma
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
// 9. PARTÍCULAS DE PLASMA Y CHISPAS CIBERNÉTICAS
// ----------------------------------------------------------------------------
function spawnSparks(pos) {
    for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 4, 4), new THREE.MeshBasicMaterial({ color: 0x00f5d4 }));
        s.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y + 0.6, pos.z + (Math.random() - 0.5) * 0.6);
        scene.add(s);
        particles.push({ mesh: s, life: 0.18, grow: false });
    }
}

function spawnDustParticles(pos) {
    const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 })
    );
    puff.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.2, pos.z + (Math.random() - 0.5) * 0.8);
    scene.add(puff);
    particles.push({ mesh: puff, life: 0.32, grow: true });
}

function spawnTireSmoke(veh) {
    const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.45 })
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

function spawnPlasmaFlames(veh) {
    const isCyan = Math.random() > 0.4;
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.80, 6),
        new THREE.MeshBasicMaterial({ color: isCyan ? 0x00f5d4 : 0xff007f })
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
    if (sciFiWindmillBlades) {
        sciFiWindmillBlades.rotation.z += dt * 1.6;
    }
    // Rotación suave de los haces de luz del cielo
    skySearchlights.forEach((beam, idx) => {
        beam.rotation.y += dt * 0.25 * (idx % 2 === 0 ? 1 : -1);
    });
}

// ----------------------------------------------------------------------------
// 10. RIVALES IA Y TABLA DE POSICIONES EN VIVO
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
// 11. CÁMARA CHASE DIORAMA DINÁMICA CON ROTACIÓN SUAVE
// ----------------------------------------------------------------------------
function updateCameraFollow(dt) {
    if (!playerVehicle) return;

    camShake.multiplyScalar(0.85);

    const speedRatio = Math.min(1, Math.abs(playerSpeed) / 80);
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);

    if (cameraMode === 'CHASE') {
        const camDistance = 17 + speedRatio * 3.5;
        const camHeight = 22 + speedRatio * 4;

        const targetCamX = playerVehicle.position.x - forwardX * camDistance + camShake.x;
        const targetCamZ = playerVehicle.position.z - forwardZ * camDistance + camShake.y;
        const targetCamY = playerVehicle.position.y + camHeight;

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

    const targetFOV = 48 + (isTurboActive ? 8 : speedRatio * 4);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 5);
    camera.updateProjectionMatrix();
}

// ----------------------------------------------------------------------------
// 12. HUD, MINIMAPA Y CICLO DE RENDERIZADO A 60 FPS
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

    radarCtx.strokeStyle = '#06b6d4';
    radarCtx.lineWidth = 3.5;
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
        radarCtx.fillStyle = '#ff0055';
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
            countdownEl.style.color = count === 2 ? '#ff007f' : '#00f5d4';
            drawAudio.playCountdown(false);
        } else if (count === 0) {
            countdownEl.innerText = '¡GO!';
            countdownEl.style.color = '#00f5d4';
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
