// ===== DRAWRACE 3D : DIORAMA GRAND PRIX & FARM EDITION =====
// Inspirado en DrawRace 2 (RedLynx / Ubisoft) y Reckless Racing:
// - Pista 3D ribbon continua y limpia: pianos rojo/blanco integrados en textura (cero bloques flotantes).
// - Límites de pista estrictos: máximo 1.8 metros de escapatoria de grava con rebote en guardarraíles.
// - Entorno Diorama rico y vivo:
//   * Sector Granja: Granero rojo de madera, silo metálico, pacas de paja y vallas rústicas.
//   * Sector Competición: Gran tribuna con público, torre de control acristalada y carpas de boxes.
//   * Sector Montaña: Formaciones de rocas 3D y trampas de arena en escapatorias.
//   * Suelo multicapa con césped, arena y zonas de cultivo.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ============================================================================
// 1. SINTETIZADOR DE AUDIO PROCEDURAL (WEB AUDIO API)
// ============================================================================
class DrawRaceAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.filter = null;
        this.driftOsc = null;
        this.driftGain = null;
        this.turboOsc = null;
        this.turboGain = null;
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
            this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.engineOsc.connect(this.filter);
            this.engineOsc2.connect(this.filter);
            this.filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.engineOsc2.start();

            // Derrape
            this.driftOsc = this.ctx.createOscillator();
            this.driftOsc.type = 'square';
            this.driftOsc.frequency.setValueAtTime(480, this.ctx.currentTime);

            const dFilter = this.ctx.createBiquadFilter();
            dFilter.type = 'bandpass';
            dFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftOsc.connect(dFilter);
            dFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftOsc.start();

            // Turbo
            this.turboOsc = this.ctx.createOscillator();
            this.turboOsc.type = 'sine';
            this.turboOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

            this.turboGain = this.ctx.createGain();
            this.turboGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.turboOsc.connect(this.turboGain);
            this.turboGain.connect(this.ctx.destination);
            this.turboOsc.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio 3D esperando interacción');
        }
    }

    update(speed, maxSpeed, isGas, isTurbo) {
        if (!this.ctx || !this.engineOsc) return;
        const now = this.ctx.currentTime;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        const gearRatios = [0.22, 0.45, 0.68, 0.88, 1.0];
        let gRatio = ratio / gearRatios[0];
        for (let g = 0; g < gearRatios.length; g++) {
            if (ratio <= gearRatios[g] || g === gearRatios.length - 1) {
                const prev = g === 0 ? 0 : gearRatios[g - 1];
                gRatio = (ratio - prev) / (gearRatios[g] - prev);
                break;
            }
        }

        const baseFreq = 62;
        const targetFreq = baseFreq + gRatio * 140;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);

        const filterCut = isGas ? 580 + ratio * 850 : 340;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.055 : 0.028;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        if (isTurbo) {
            this.turboGain.gain.setTargetAtTime(0.04, now, 0.05);
            this.turboOsc.frequency.setTargetAtTime(800 + ratio * 500, now, 0.05);
        } else {
            this.turboGain.gain.setTargetAtTime(0.0001, now, 0.08);
        }
    }

    setDrift(val) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, val));
        const now = this.ctx.currentTime;
        this.driftGain.gain.setTargetAtTime(clamped * 0.035, now, 0.04);
        this.driftOsc.frequency.setTargetAtTime(440 + clamped * 260, now, 0.04);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, now);
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
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.14));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.14));
    }
}
const drawAudio = new DrawRaceAudio();

// ============================================================================
// 2. CONFIGURACIÓN DEL MOTOR THREE.JS Y CÁMARA TILT-SHIFT 65°
// ============================================================================
let scene, camera, renderer;
let trackCurve;
let trackWaypoints = [];
let playerVehicle;
let aiVehicles = [];
let particles = [];

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

const TRACK_WIDTH = 13.0; // Ancho del asfalto
const RUNOFF_MARGIN = 1.8; // Escapatoria máxima (1.8 metros)
const BARRIER_LIMIT = TRACK_WIDTH / 2 + RUNOFF_MARGIN; // Límite rígido de rebote

const keys = { w: false, s: false, a: false, d: false, space: false };
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false, touchTurbo = false;

let hudPosEl, hudLapEl, hudTimeEl, hudSpeedEl, turboFillEl, turboPctEl, countdownEl, radarCanvas, radarCtx;

function initDrawRaceEngine() {
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1017);
    scene.fog = new THREE.FogExp2(0x0c1017, 0.0025);

    // Cámara cenital inclinada a 65° (Tilt-Shift Diorama)
    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 52, 34);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xdde8f2, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e6, 1.3);
    sunLight.position.set(70, 120, 60);
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
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x4a6b8f, 0.4);
    skyFill.position.set(-60, 40, -60);
    scene.add(skyFill);

    // Construcción del circuito y diorama rico
    buildRichTerrain();
    build3DCircuitWithIntegratedCurbs();
    buildGuardrails();
    buildRuralFarmSector();
    buildGrandPrixComplex();
    buildMountainAndRocksSector();
    spawn3DCars();

    // Cache HUD
    hudPosEl = document.getElementById('hud-pos');
    hudLapEl = document.getElementById('hud-lap');
    hudTimeEl = document.getElementById('hud-time');
    hudSpeedEl = document.getElementById('hud-speed');
    turboFillEl = document.getElementById('turbo-fill');
    turboPctEl = document.getElementById('turbo-pct');
    countdownEl = document.getElementById('countdown-overlay');
    radarCanvas = document.getElementById('radar-canvas');
    if (radarCanvas) radarCtx = radarCanvas.getContext('2d');

    setupInputHandlers();
    startCountdownSequence();

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(renderLoop);
}

// ============================================================================
// 3. TERRENO MULTIZONA (CÉSPED, TIERRA RÚSTICA, ARENA Y ASFALTO)
// ============================================================================
function buildRichTerrain() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base de hierba verde suave
    ctx.fillStyle = '#233d28';
    ctx.fillRect(0, 0, 1024, 1024);

    // Zona este: Tierra dorada de cultivo de la granja
    ctx.fillStyle = '#4a3821';
    ctx.beginPath();
    ctx.ellipse(320, 720, 220, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Líneas de arado de la granja
    ctx.strokeStyle = '#382a17';
    ctx.lineWidth = 3;
    for (let y = 600; y < 850; y += 14) {
        ctx.beginPath();
        ctx.moveTo(180, y);
        ctx.lineTo(460, y);
        ctx.stroke();
    }

    // Zona norte: Grava y roca grisácea
    ctx.fillStyle = '#323942';
    ctx.beginPath();
    ctx.ellipse(512, 220, 280, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trampas de arena en escapatorias
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.ellipse(820, 480, 80, 60, 0.4, 0, Math.PI * 2); // Curva 1
    ctx.ellipse(180, 380, 70, 50, -0.3, 0, Math.PI * 2); // Horquilla
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const terrainGeo = new THREE.PlaneGeometry(380, 380, 40, 40);
    const terrainMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.05
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

// ============================================================================
// 4. CIRCUITO 3D CONTINUO: PIANOS ROJO/BLANCO INTEGRADOS EN TEXTURA
// ============================================================================
function build3DCircuitWithIntegratedCurbs() {
    trackWaypoints = [
        new THREE.Vector3(-30, 0, 80),   // 0. Recta de meta
        new THREE.Vector3(25, 0, 80),    // 1. Final de recta
        new THREE.Vector3(70, 0, 65),    // 2. Curva 1 rápida (con piano)
        new THREE.Vector3(85, 0, 20),    // 3. Peralte este
        new THREE.Vector3(75, 0, -25),   // 4. Curva hacia el norte
        new THREE.Vector3(40, 1.5, -45), // 5. Rampa de subida
        new THREE.Vector3(0, 5.8, -50),  // 6. Puente elevado (Overpass)
        new THREE.Vector3(-40, 6.8, -45),// 7. Cima del puente
        new THREE.Vector3(-75, 3.8, -20),// 8. Rampa de bajada
        new THREE.Vector3(-85, 0, 15),   // 9. Horquilla oeste
        new THREE.Vector3(-70, 0, 55),   // 10. Curva suroeste
        new THREE.Vector3(-30, 0, 30),   // 11. Enlace interior
        new THREE.Vector3(0, 0, -5),     // 12. Paso bajo el puente
        new THREE.Vector3(35, 0, -10),   // 13. Curva este
        new THREE.Vector3(45, 0, 40),    // 14. Chicana
        new THREE.Vector3(-5, 0, 65)     // 15. Entrada a meta
    ];

    trackCurve = new THREE.CatmullRomCurve3(trackWaypoints, true);

    const numSteps = 450;
    const roadVertices = [];
    const roadIndices = [];
    const roadUvs = [];

    // Extrusión continua
    for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const left = p.clone().add(normal.clone().multiplyScalar(-TRACK_WIDTH / 2));
        const right = p.clone().add(normal.clone().multiplyScalar(TRACK_WIDTH / 2));

        roadVertices.push(left.x, left.y + 0.08, left.z);
        roadVertices.push(right.x, right.y + 0.08, right.z);

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

    // Textura maestra con asfalto, líneas de carrera y pianos rojo/blanco integrados
    const roadMat = createIntegratedRoadMaterial();
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Pilares del puente
    const pillarGeo = new THREE.CylinderGeometry(0.9, 1.1, 7.2, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    [new THREE.Vector3(-3, 3.0, -42), new THREE.Vector3(-35, 3.5, -40), new THREE.Vector3(5, 3.0, -58), new THREE.Vector3(-42, 3.5, -52)].forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.copy(pos);
        pillar.castShadow = true;
        scene.add(pillar);
    });
}

// Textura maestra: Pianos en los bordes (rojo/blanco) + asfalto de competición
function createIntegratedRoadMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Asfalto oscuro granulado
    ctx.fillStyle = '#1c202a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? '#242a38' : '#141822';
        ctx.fillRect(x, y, 2, 2);
    }

    // 2. Pianos Rojo y Blanco integrados en el borde izquierdo (X: 0 a 44)
    for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = ((y / 32) % 2 === 0) ? '#e52521' : '#ffffff';
        ctx.fillRect(0, y, 44, 32);
    }
    // Línea blanca separadora de borde
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(44, 0, 8, 512);

    // 3. Pianos Rojo y Blanco integrados en el borde derecho (X: 468 a 512)
    for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = ((y / 32) % 2 === 0) ? '#e52521' : '#ffffff';
        ctx.fillRect(468, y, 44, 32);
    }
    // Línea blanca separadora de borde
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(460, 0, 8, 512);

    // 4. Línea discontinua amarilla central
    ctx.fillStyle = '#fee440';
    for (let y = 0; y < 512; y += 64) {
        ctx.fillRect(253, y + 10, 6, 44);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 45);

    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.15
    });
}

// ============================================================================
// 5. GUARDARRAÍLES METÁLICOS CONTINUOS (LÍMITE RÍGIDO DE 1.8 METROS)
// ============================================================================
function buildGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.6 });

    const railGeo = new THREE.BoxGeometry(0.2, 0.45, 2.2);
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6);

    const steps = 180;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const p = trackCurve.getPointAt(t);
        const tan = trackCurve.getTangentAt(t).normalize();
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        // Guardarraíl exterior a 1.8m del asfalto (Límite infranqueable)
        const leftPos = p.clone().add(norm.clone().multiplyScalar(-BARRIER_LIMIT));
        const rightPos = p.clone().add(norm.clone().multiplyScalar(BARRIER_LIMIT));

        // Solo colocar postes cada 2 tramos
        if (i % 2 === 0) {
            const postL = new THREE.Mesh(postGeo, postMat);
            postL.position.copy(leftPos);
            postL.position.y += 0.45;
            postL.castShadow = true;
            scene.add(postL);

            const postR = new THREE.Mesh(postGeo, postMat);
            postR.position.copy(rightPos);
            postR.position.y += 0.45;
            postR.castShadow = true;
            scene.add(postR);
        }

        // Vallas metálicas longitudinales
        const railL = new THREE.Mesh(railGeo, railMat);
        railL.position.copy(leftPos);
        railL.position.y += 0.55;
        railL.lookAt(railL.position.clone().add(tan));
        railL.castShadow = true;
        scene.add(railL);

        const railR = new THREE.Mesh(railGeo, railMat);
        railR.position.copy(rightPos);
        railR.position.y += 0.55;
        railR.lookAt(railR.position.clone().add(tan));
        railR.castShadow = true;
        scene.add(railR);
    }
}

// ============================================================================
// 6. SECTOR GRANJA RURAL (RECKLESS RACING STYLE: GRANERO, SILO Y VALLAS)
// ============================================================================
function buildRuralFarmSector() {
    const farmGroup = new THREE.Group();
    farmGroup.position.set(-50, 0, -10);

    // 1. Granero rojo rústico de madera (Big Red Barn)
    const barnMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const whiteWoodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    // Cuerpo del granero
    const barnBody = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 12), barnMat);
    barnBody.position.y = 4.5;
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;
    farmGroup.add(barnBody);

    // Tejado a dos aguas del granero
    const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 4.5, 4), roofMat);
    barnRoof.rotation.y = Math.PI / 4;
    barnRoof.position.y = 10.5;
    barnRoof.scale.set(1.1, 1, 1.4);
    barnRoof.castShadow = true;
    farmGroup.add(barnRoof);

    // Gran portón blanco de granero con cruz en X
    const door = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 0.3), whiteWoodMat);
    door.position.set(0, 3, 6.1);
    farmGroup.add(door);

    // 2. Silo de grano metálico cilíndrico
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 16, 16), siloMat);
    siloBody.position.set(12, 8, 0);
    siloBody.castShadow = true;
    farmGroup.add(siloBody);

    // Cúpula del silo
    const siloDome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
    siloDome.position.set(12, 16, 0);
    siloDome.castShadow = true;
    farmGroup.add(siloDome);

    // 3. Pacas de heno cilíndricas doradas
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.95 });
    const hayGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 10);
    hayGeo.rotateZ(Math.PI / 2);

    [
        new THREE.Vector3(-11, 1.1, 4),
        new THREE.Vector3(-11, 1.1, 7),
        new THREE.Vector3(-11, 3.2, 5.5),
        new THREE.Vector3(-14, 1.1, 5)
    ].forEach(p => {
        const hay = new THREE.Mesh(hayGeo, hayMat);
        hay.position.copy(p);
        hay.castShadow = true;
        farmGroup.add(hay);
    });

    // 4. Vallas de madera perimetrales estilo rancho
    const fenceWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    for (let x = -25; x <= 20; x += 5) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), fenceWoodMat);
        post.position.set(x, 1.1, 14);
        post.castShadow = true;
        farmGroup.add(post);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 0.15), fenceWoodMat);
        rail.position.set(x + 2.5, 1.6, 14);
        farmGroup.add(rail);
    }

    scene.add(farmGroup);
}

// ============================================================================
// 7. SECTOR GRAND PRIX: GRADAS CON PÚBLICO Y TORRE DE CONTROL
// ============================================================================
function buildGrandPrixComplex() {
    const gpGroup = new THREE.Group();
    gpGroup.position.set(-5, 0, 95); // Frente a la recta de meta

    // 1. Gran Tribuna Techada de Espectadores
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });

    // Estructura escalonada
    const stand = new THREE.Mesh(new THREE.BoxGeometry(45, 6, 12), standMat);
    stand.position.set(0, 3, 0);
    stand.castShadow = true;
    stand.receiveShadow = true;
    gpGroup.add(stand);

    // Techo voladizo
    const roof = new THREE.Mesh(new THREE.BoxGeometry(47, 0.6, 14), roofMat);
    roof.position.set(0, 7.5, -1);
    roof.rotation.x = 0.1;
    roof.castShadow = true;
    gpGroup.add(roof);

    // Multitud de aficionados (Puntos de color en las gradas)
    const crowdColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xffffff];
    for (let row = 0; row < 4; row++) {
        for (let col = -20; col <= 20; col += 1.8) {
            const fanMat = new THREE.MeshBasicMaterial({ color: crowdColors[Math.floor(Math.random() * crowdColors.length)] });
            const fan = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), fanMat);
            fan.position.set(col, 2.8 + row * 0.9, -4 + row * 2.2);
            gpGroup.add(fan);
        }
    }

    // Pancarta de patrocinador gigante frontal
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 64;
    const bCtx = bannerCanvas.getContext('2d');
    bCtx.fillStyle = '#e10600';
    bCtx.fillRect(0, 0, 512, 64);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = '900 36px Arial';
    bCtx.textAlign = 'center';
    bCtx.fillText('★ DRAWRACE GRAND PRIX ★', 256, 45);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(42, 3), new THREE.MeshBasicMaterial({ map: bannerTex }));
    banner.position.set(0, 4.5, -6.1);
    gpGroup.add(banner);

    // 2. Torre de Control de Carrera (Race Control Tower)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-30, 0, -14);

    const towerBody = new THREE.Mesh(new THREE.BoxGeometry(6, 14, 6), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
    towerBody.position.y = 7;
    towerBody.castShadow = true;
    towerGroup.add(towerBody);

    // Cabina acristalada superior
    const glassCabin = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 7), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 }));
    glassCabin.position.y = 14;
    glassCabin.castShadow = true;
    towerGroup.add(glassCabin);

    // Antena de telemetría
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    antenna.position.y = 18.5;
    towerGroup.add(antenna);

    gpGroup.add(towerGroup);

    scene.add(gpGroup);
}

// ============================================================================
// 8. SECTOR MONTAÑA Y FORMACIONES ROCOSAS 3D (LOW-POLY FACETED)
// ============================================================================
function buildMountainAndRocksSector() {
    const rockMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.85,
        flatShading: true
    });

    const spawnRock = (x, y, z, scaleX, scaleY, scaleZ) => {
        const rockGeo = new THREE.DodecahedronGeometry(1, 1);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, y, z);
        rock.scale.set(scaleX, scaleY, scaleZ);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    };

    // Macizo rocoso en la curva norte (zona de montaña)
    for (let i = 0; i < 22; i++) {
        const x = 50 + (Math.random() - 0.5) * 45;
        const z = -35 + (Math.random() - 0.5) * 40;
        const s = 4 + Math.random() * 6;
        spawnRock(x, s * 0.4, z, s * 1.2, s * 1.5, s);
    }

    // Rocas cerca de la horquilla oeste
    for (let i = 0; i < 14; i++) {
        const x = -88 + (Math.random() - 0.5) * 25;
        const z = 20 + (Math.random() - 0.5) * 40;
        const s = 3 + Math.random() * 4.5;
        spawnRock(x, s * 0.4, z, s, s * 1.3, s * 1.1);
    }
}

// ============================================================================
// 9. COCHES 3D Y FÍSICAS CON LÍMITES ESTRICTOS (MÁXIMO 1.8M DE PISTA)
// ============================================================================
function build3DVehicleMesh(colorHex, name) {
    const carRoot = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.22,
        metalness: 0.75
    });
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1d,
        roughness: 0.1,
        metalness: 0.9
    });
    const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.8
    });

    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.55;
    carRoot.add(chassisGroup);
    carRoot.chassis = chassisGroup;

    // Carrocería deportiva GT
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 4.4), bodyMat);
    lowerBody.castShadow = true;
    chassisGroup.add(lowerBody);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.48, 2.2), glassMat);
    cabin.position.set(0, 0.42, -0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), bodyMat);
    roof.position.set(0, 0.68, -0.2);
    roof.castShadow = true;
    chassisGroup.add(roof);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.6), carbonMat);
    wing.position.set(0, 0.65, 1.85);
    wing.castShadow = true;
    chassisGroup.add(wing);

    // Faros delanteros xenón y luces de freno
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlL.position.set(-0.75, 0.1, -2.2);
    const hlR = hlL.clone();
    hlR.position.x = 0.75;
    chassisGroup.add(hlL);
    chassisGroup.add(hlR);

    const blL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    blL.position.set(-0.75, 0.1, 2.2);
    const blR = blL.clone();
    blR.position.x = 0.75;
    chassisGroup.add(blL);
    chassisGroup.add(blR);

    // 4 Ruedas 3D con neumáticos y llantas
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xdde6ed, metalness: 0.85, roughness: 0.2 });

    const createWheel = () => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.castShadow = true;
        wGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8), rimMat);
        rim.rotateZ(Math.PI / 2);
        wGroup.add(rim);
        return wGroup;
    };

    const frontLeftSteer = new THREE.Group();
    frontLeftSteer.position.set(-1.08, 0.42, -1.35);
    const wFL = createWheel();
    frontLeftSteer.add(wFL);
    carRoot.add(frontLeftSteer);

    const frontRightSteer = new THREE.Group();
    frontRightSteer.position.set(1.08, 0.42, -1.35);
    const wFR = createWheel();
    frontRightSteer.add(wFR);
    carRoot.add(frontRightSteer);

    const wRL = createWheel();
    wRL.position.set(-1.08, 0.42, 1.35);
    carRoot.add(wRL);

    const wRR = createWheel();
    wRR.position.set(1.08, 0.42, 1.35);
    carRoot.add(wRR);

    carRoot.steerL = frontLeftSteer;
    carRoot.steerR = frontRightSteer;
    carRoot.wheels = [wFL, wFR, wRL, wRR];

    return carRoot;
}

function spawn3DCars() {
    const carsConfig = [
        { color: 0xe52521, name: 'RED APEX GT' },
        { color: 0x00c0ff, name: 'GULF BLUE RS' },
        { color: 0xfee440, name: 'VIPER YELLOW' },
        { color: 0x00e676, name: 'LOTUS GREEN' },
        { color: 0xff7b00, name: 'ORANGE DRIFT' },
        { color: 0x9c27b0, name: 'CYBER PURPLE' }
    ];

    const startPoint = trackCurve.getPointAt(0);
    const tangent = trackCurve.getTangentAt(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    playerVehicle = build3DVehicleMesh(carsConfig[0].color, carsConfig[0].name);
    playerVehicle.position.copy(startPoint).add(normal.clone().multiplyScalar(2.8));
    playerAngle = Math.atan2(tangent.x, tangent.z);
    playerVehicle.rotation.y = playerAngle;
    scene.add(playerVehicle);

    aiVehicles = [];
    for (let i = 1; i <= 5; i++) {
        const ai = build3DVehicleMesh(carsConfig[i].color, carsConfig[i].name);
        const row = Math.floor(i / 2);
        const col = i % 2 === 1 ? -1 : 1;
        const pos = startPoint.clone()
            .add(tangent.clone().multiplyScalar(-row * 10))
            .add(normal.clone().multiplyScalar(col * 3.2));

        ai.position.copy(pos);
        ai.rotation.y = playerAngle;
        ai.progress = (1.0 - (row * 0.035)) % 1.0;
        ai.laneOffset = (Math.random() - 0.5) * 3.5;
        scene.add(ai);
        aiVehicles.push(ai);
    }
}

// ============================================================================
// 10. BUCLE DE FÍSICAS CON LÍMITES ESTRICTOS (MÁXIMO 1.8M DE SALIDA)
// ============================================================================
function updatePlayerPhysics(dt) {
    const left = keys.a || touchLeft;
    const right = keys.d || touchRight;
    const gas = keys.w || touchGas;
    const brake = keys.s || touchBrake;
    const turbo = keys.space || touchTurbo;

    // 1. CÁLCULO DE DISTANCIA AL CENTRO DEL CIRCUITO (LÍMITES FÍSICOS)
    let closestDist = Infinity;
    let closestPoint = null;
    let closestTangent = null;

    // Muestreo rápido de los puntos de la curva
    for (let t = 0; t <= 1; t += 0.01) {
        const pt = trackCurve.getPointAt(t);
        const d = Math.hypot(playerVehicle.position.x - pt.x, playerVehicle.position.z - pt.z);
        if (d < closestDist) {
            closestDist = d;
            closestPoint = pt;
            closestTangent = trackCurve.getTangentAt(t).normalize();
        }
    }

    // Grip según si está en asfalto o en escapatoria (máx 1.8m)
    let grip = 1.0;
    if (closestDist > TRACK_WIDTH / 2) {
        // En escapatoria de grava (hasta 1.8 metros)
        grip = 0.52;
        spawnDustParticles(playerVehicle.position);
    }

    // REBOTE CONTRA GUARDARRAÍL SI LLEGA AL TOPE DE 1.8 METROS
    if (closestDist >= BARRIER_LIMIT && closestPoint) {
        drawAudio.playCrash();
        playerSpeed *= 0.60; // Desaceleración inmediata

        // Empujar hacia adentro de la pista
        const toTrack = closestPoint.clone().sub(playerVehicle.position).normalize();
        playerVehicle.position.x += toTrack.x * 0.8;
        playerVehicle.position.z += toTrack.z * 0.8;

        // Chispas de fricción contra el guardarraíl
        spawnSparks(playerVehicle.position);
    }

    // Gestión del Turbo
    isTurboActive = false;
    if (turbo && turboAmount > 2 && gas) {
        isTurboActive = true;
        turboAmount = Math.max(0, turboAmount - dt * 28);
        spawnExhaustFlames(playerVehicle);
    } else {
        turboAmount = Math.min(100, turboAmount + dt * 10);
    }

    const maxSpeed = (isTurboActive ? 75 : 54) * grip;
    const accelRate = (isTurboActive ? 48 : 28) * grip;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-18, playerSpeed - 38 * dt);
    } else {
        playerSpeed *= 0.985;
    }

    // Dirección
    const steerMax = 0.52;
    let targetSteer = 0;
    if (left) targetSteer = -steerMax;
    if (right) targetSteer = steerMax;
    playerSteerAngle = THREE.MathUtils.lerp(playerSteerAngle, targetSteer, dt * 12);

    if (playerVehicle.steerL && playerVehicle.steerR) {
        playerVehicle.steerL.rotation.y = playerSteerAngle;
        playerVehicle.steerR.rotation.y = playerSteerAngle;
    }

    const turnFactor = playerSpeed > 5 ? 1 : Math.max(0.1, playerSpeed / 5);
    playerAngle += playerSteerAngle * turnFactor * (playerSpeed >= 0 ? 1 : -1) * dt * 2.8;
    playerVehicle.rotation.y = playerAngle;

    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    playerVehicle.position.x += forwardX * playerSpeed * dt;
    playerVehicle.position.z += forwardZ * playerSpeed * dt;

    playerVehicle.wheels.forEach(w => {
        w.children[0].rotation.x += playerSpeed * dt * 2.2;
    });

    // Suspensión reactiva 3D
    const targetRoll = -playerSteerAngle * (playerSpeed / maxSpeed) * 0.28;
    const targetPitch = gas ? 0.08 : (brake ? -0.12 : 0);
    playerRoll = THREE.MathUtils.lerp(playerRoll, targetRoll, dt * 8);
    playerPitch = THREE.MathUtils.lerp(playerPitch, targetPitch, dt * 8);

    if (playerVehicle.chassis) {
        playerVehicle.chassis.rotation.z = playerRoll;
        playerVehicle.chassis.rotation.x = playerPitch;
    }

    // Derrape
    const isDrifting = Math.abs(playerSteerAngle) > 0.28 && Math.abs(playerSpeed) > 30;
    if (isDrifting) {
        drawAudio.setDrift(1.0);
        spawnDustParticles(playerVehicle.position);
    } else {
        drawAudio.setDrift(0);
    }

    // Elevación Y del puente
    if (closestPoint && closestDist < BARRIER_LIMIT + 2) {
        playerVehicle.position.y = THREE.MathUtils.lerp(playerVehicle.position.y, closestPoint.y, 0.15);
    } else {
        playerVehicle.position.y = THREE.MathUtils.lerp(playerVehicle.position.y, 0, 0.15);
    }

    drawAudio.update(playerSpeed, maxSpeed, gas, isTurboActive);
    checkLapProgression(playerVehicle.position);
}

// Chispas al golpear el guardarraíl
function spawnSparks(pos) {
    for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
        s.position.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 0.6, pos.z + (Math.random() - 0.5) * 0.5);
        scene.add(s);
        particles.push({ mesh: s, life: 0.18, grow: false });
    }
}

function spawnDustParticles(pos) {
    const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xd7ccc8, transparent: true, opacity: 0.4 })
    );
    puff.position.set(pos.x + (Math.random() - 0.5), pos.y + 0.2, pos.z + (Math.random() - 0.5));
    scene.add(puff);
    particles.push({ mesh: puff, life: 0.3, grow: true });
}

function spawnExhaustFlames(veh) {
    const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 6, 6),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff3d00 : 0xffea00 })
    );
    const rad = veh.rotation.y;
    flame.position.set(
        veh.position.x - Math.sin(rad) * 2.2 + (Math.random() - 0.5) * 0.5,
        veh.position.y + 0.5,
        veh.position.z - Math.cos(rad) * 2.2 + (Math.random() - 0.5) * 0.5
    );
    scene.add(flame);
    particles.push({ mesh: flame, life: 0.16, grow: false });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.grow) {
            p.mesh.scale.multiplyScalar(1.08);
            p.mesh.position.y += dt * 1.2;
        }
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

// Rivales IA
function updateAIPhysics(dt) {
    if (!trackCurve) return;

    aiVehicles.forEach((ai, idx) => {
        ai.progress = (ai.progress + dt * 0.038 * (1.0 + idx * 0.02)) % 1.0;
        const currentPt = trackCurve.getPointAt(ai.progress);
        const nextPt = trackCurve.getPointAt((ai.progress + 0.01) % 1.0);
        const tangent = nextPt.clone().sub(currentPt).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const targetPos = currentPt.clone().add(normal.clone().multiplyScalar(ai.laneOffset));
        ai.position.lerp(targetPos, 0.15);

        const targetAngle = Math.atan2(tangent.x, tangent.z);
        ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 0.12);

        ai.wheels.forEach(w => {
            w.children[0].rotation.x += dt * 30;
        });

        // Colisión con el jugador
        const dist = ai.position.distanceTo(playerVehicle.position);
        if (dist < 3.2) {
            drawAudio.playCrash();
            playerSpeed *= 0.85;
            const pushDir = playerVehicle.position.clone().sub(ai.position).normalize();
            playerVehicle.position.add(pushDir.multiplyScalar(0.6));
        }
    });
}

// Cámara Cenital Inclinada a 65° con Seguimiento Suave (Diorama Tilt-Shift)
function updateCameraFollow(dt) {
    if (!playerVehicle) return;

    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    const lookDist = (playerSpeed / 75) * 14;

    const targetLookAt = new THREE.Vector3(
        playerVehicle.position.x + forwardX * lookDist,
        playerVehicle.position.y + 1.5,
        playerVehicle.position.z + forwardZ * lookDist
    );

    const camOffset = new THREE.Vector3(0, 50, 32);
    const targetCamPos = playerVehicle.position.clone().add(camOffset);

    camera.position.lerp(targetCamPos, dt * 5.0);
    camera.lookAt(targetLookAt);
}

// Bucle de renderizado
let lastTime = performance.now();
function renderLoop(now) {
    requestAnimationFrame(renderLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (gameState === 'RACE') {
        updatePlayerPhysics(dt);
        updateAIPhysics(dt);
        updateParticles(dt);
        updateHUD();
        renderRadar();
    }

    updateCameraFollow(dt);
    renderer.render(scene, camera);
}

function updateHUD() {
    if (hudSpeedEl) {
        const kmh = Math.floor(Math.abs(playerSpeed) * 3.6);
        hudSpeedEl.innerText = `${kmh} KM/H`;
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
        radarCtx.fillStyle = '#ff1744';
        radarCtx.beginPath();
        radarCtx.arc(cx + ai.position.x * scale, cy + ai.position.z * scale, 3, 0, Math.PI * 2);
        radarCtx.fill();
    });

    radarCtx.fillStyle = '#00f5d4';
    radarCtx.beginPath();
    radarCtx.arc(cx + playerVehicle.position.x * scale, cy + playerVehicle.position.z * scale, 4.5, 0, Math.PI * 2);
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

window.addEventListener('load', initDrawRaceEngine);
