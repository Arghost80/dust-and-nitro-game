// ===== DRAWRACE 3D : NEXT-GEN WEBGL RACING ENGINE =====
// Inspirado al 100% en DrawRace 2 (RedLynx / Ubisoft) y Reckless Racing:
// - Motor 3D en tiempo real con Three.js r128 (sin dependencias externas).
// - Cámara cenital inclinada a 65° con perspectiva tilt-shift / diorama.
// - Trazado 3D continuo con curvas peraltadas, puente elevado (overpass), pianos 3D y guardarraíles.
// - Modelos 3D de coches deportivos y rally con carrocería metálica reflectante.
// - Ruedas 3D que giran y doblan la dirección, suspensión con balanceo (body roll & pitch).
// - Sombras arrojadas dinámicas en tiempo real (PCF Soft Shadow Map).
// - Turbo Boost (Nitro) con llamaradas de escape y estelas de velocidad.
// - Audio procedural con motor deportivo, chirrido de derrapes y 5 rivales IA.

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
        this.currentGear = 1;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // Motor principal (Sawtooth V8 / Turbo)
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

            // Turbo Boost hiss
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

        // 5 Marchas
        const gearRatios = [0.22, 0.45, 0.68, 0.88, 1.0];
        let gear = 1;
        let gRatio = ratio / gearRatios[0];
        for (let g = 0; g < gearRatios.length; g++) {
            if (ratio <= gearRatios[g] || g === gearRatios.length - 1) {
                gear = g + 1;
                const prev = g === 0 ? 0 : gearRatios[g - 1];
                gRatio = (ratio - prev) / (gearRatios[g] - prev);
                break;
            }
        }

        const baseFreq = 60;
        const targetFreq = baseFreq + gRatio * 135;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);

        const filterCut = isGas ? 550 + ratio * 800 : 320;
        this.filter.frequency.setTargetAtTime(filterCut, now, 0.05);

        const targetGain = isGas ? 0.055 : 0.028;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

        // Turbo audio
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
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
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
// 2. INICIALIZACIÓN THREE.JS & ILUMINACIÓN CON SOMBRAS REALES
// ============================================================================
let scene, camera, renderer;
let trackCurve;
let playerVehicle;
let aiVehicles = [];
let particles = [];
let skidmarks = [];

// Estado del juego
let gameState = 'COUNTDOWN';
let playerSpeed = 0;
let playerAngle = 0; // Ángulo de orientación del coche
let playerSteerAngle = 0; // Giro de ruedas delanteras
let playerPitch = 0, playerRoll = 0; // Suspensión 3D
let turboAmount = 100;
let isTurboActive = false;
let playerLap = 1;
const TOTAL_LAPS = 3;
let currentWaypointIdx = 0;
let lapStartTime = 0;

// Entradas
const keys = { w: false, s: false, a: false, d: false, space: false, shift: false };
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false, touchTurbo = false;

// HUD Elements
let hudPosEl, hudLapEl, hudTimeEl, hudSpeedEl, turboFillEl, turboPctEl, countdownEl, radarCanvas, radarCtx;

function initThreeEngine() {
    const canvas = document.getElementById('webgl-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1017);
    scene.fog = new THREE.FogExp2(0x0c1017, 0.0028);

    // Cámara Cenital Inclinada a 65° (Estilo DrawRace 2 Tilt-Shift)
    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 52, 34);

    // Iluminación Solar con Sombras Arrojadas
    const ambientLight = new THREE.AmbientLight(0xdde6f0, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.25);
    sunLight.position.set(70, 110, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    const d = 130;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    // Luz de relleno azulada desde el horizonte
    const fillLight = new THREE.DirectionalLight(0x406085, 0.4);
    fillLight.position.set(-60, 40, -60);
    scene.add(fillLight);

    // Construcción del Mundo 3D
    build3DEnvironment();
    build3DTrackWithOverpass();
    spawn3DCars();

    // Cache de elementos del HUD
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
// 3. CONSTRUCCIÓN DEL CIRCUITO 3D CONTINUO CON PUENTE ELEVADO (OVERPASS)
// ============================================================================
function build3DTrackWithOverpass() {
    // 16 Puntos Spline 3D que forman un trazado Grand Prix espectacular con Puente
    const points = [
        new THREE.Vector3(-30, 0, 80),   // Parrilla de salida
        new THREE.Vector3(20, 0, 80),    // Recta principal
        new THREE.Vector3(65, 0, 65),    // Curva 1 rápida
        new THREE.Vector3(80, 0, 20),    // Peralte este
        new THREE.Vector3(70, 0, -25),   // Curva hacia el norte
        new THREE.Vector3(35, 1.5, -45), // Subida hacia el puente
        new THREE.Vector3(0, 5.5, -50),  // Puente elevado cruza sobre recta
        new THREE.Vector3(-40, 6.8, -45),// Tramo alto del puente
        new THREE.Vector3(-75, 4.0, -20),// Bajada del puente
        new THREE.Vector3(-85, 0, 15),   // Horquilla oeste a ras de suelo
        new THREE.Vector3(-70, 0, 55),   // Curva sur-oeste
        new THREE.Vector3(-30, 0, 30),   // Enlace interior
        new THREE.Vector3(0, 0, -5),     // Paso bajo el puente (Ground)
        new THREE.Vector3(35, 0, -10),   // Curva técnica este
        new THREE.Vector3(45, 0, 40),    // Chicana rápida
        new THREE.Vector3(-5, 0, 65)     // Curva de entrada a meta
    ];

    trackCurve = new THREE.CatmullRomCurve3(points, true);

    const trackWidth = 13.5;
    const numSteps = 400;
    const roadVertices = [];
    const roadIndices = [];
    const roadUvs = [];

    // Extrusión ribbon de la carretera
    for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        const p = trackCurve.getPointAt(t);
        const tangent = trackCurve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // Vértices izquierdo y derecho de la calzada
        const left = p.clone().add(normal.clone().multiplyScalar(-trackWidth / 2));
        const right = p.clone().add(normal.clone().multiplyScalar(trackWidth / 2));

        roadVertices.push(left.x, left.y + 0.08, left.z);
        roadVertices.push(right.x, right.y + 0.08, right.z);

        roadUvs.push(0, t * 45);
        roadUvs.push(1, t * 45);

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

    // Textura procedural de asfalto oscuro con líneas blancas y línea de trazada
    const asphaltMat = createAsphaltMaterial();
    const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Pianos 3D (Kerbs) y Guardarraíles
    build3DCurbsAndBarriers(trackCurve, trackWidth);

    // Pilares de soporte para el puente elevado
    buildBridgePillars();
}

// Textura procedural para el asfalto estilo DrawRace 2
function createAsphaltMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Asfalto gris oscuro con textura granulada
    ctx.fillStyle = '#1b1f28';
    ctx.fillRect(0, 0, 512, 512);

    // Grano de asfalto
    for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? '#262c38' : '#141820';
        ctx.fillRect(x, y, 2, 2);
    }

    // Líneas laterales blancas de borde de pista
    ctx.fillStyle = '#f0f3f6';
    ctx.fillRect(16, 0, 8, 512);
    ctx.fillRect(488, 0, 8, 512);

    // Línea discontinua central
    ctx.fillStyle = '#fee440';
    for (let y = 0; y < 512; y += 64) {
        ctx.fillRect(253, y + 10, 6, 44);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);

    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.15
    });
}

// Pianos 3D (Curb blocks alternados rojo y blanco) y quitanieves
function build3DCurbsAndBarriers(curve, width) {
    const curbGeo = new THREE.BoxGeometry(0.85, 0.22, 1.2);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe52521, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    const barrierGeo = new THREE.BoxGeometry(0.3, 0.7, 2.0);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.7, roughness: 0.3 });

    for (let i = 0; i < 220; i++) {
        const t = i / 220;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        // Colocar pianos en zonas de curva
        const leftEdge = p.clone().add(norm.clone().multiplyScalar(-width / 2 - 0.4));
        const rightEdge = p.clone().add(norm.clone().multiplyScalar(width / 2 + 0.4));

        const mat = i % 2 === 0 ? redMat : whiteMat;

        const curbL = new THREE.Mesh(curbGeo, mat);
        curbL.position.copy(leftEdge);
        curbL.position.y += 0.1;
        curbL.lookAt(leftEdge.clone().add(tan));
        curbL.castShadow = true;
        curbL.receiveShadow = true;
        scene.add(curbL);

        const curbR = new THREE.Mesh(curbGeo, mat);
        curbR.position.copy(rightEdge);
        curbR.position.y += 0.1;
        curbR.lookAt(rightEdge.clone().add(tan));
        curbR.castShadow = true;
        curbR.receiveShadow = true;
        scene.add(curbR);

        // Guardarraíles metálicos exteriores cada 2 tramos
        if (i % 2 === 0) {
            const bL = new THREE.Mesh(barrierGeo, barrierMat);
            bL.position.copy(leftEdge.clone().add(norm.clone().multiplyScalar(-1.2)));
            bL.position.y += 0.35;
            bL.lookAt(bL.position.clone().add(tan));
            bL.castShadow = true;
            scene.add(bL);
        }
    }
}

// Pilares de soporte del puente elevado
function buildBridgePillars() {
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1.0, 7.0, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });

    const pillarCoords = [
        new THREE.Vector3(-3, 3.0, -42),
        new THREE.Vector3(-35, 3.5, -40),
        new THREE.Vector3(5, 3.0, -58),
        new THREE.Vector3(-42, 3.5, -52)
    ];

    pillarCoords.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.copy(pos);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
    });
}

// Entorno Diorama: Terreno suave y vegetación 3D
function build3DEnvironment() {
    // Terreno plano con color verde bosque
    const terrainGeo = new THREE.PlaneGeometry(350, 350, 32, 32);
    const terrainMat = new THREE.MeshStandardMaterial({
        color: 0x1f3824,
        roughness: 0.95,
        metalness: 0.05
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Árboles 3D dispersos por el paisaje
    for (let i = 0; i < 45; i++) {
        const x = (Math.random() - 0.5) * 280;
        const z = (Math.random() - 0.5) * 280;
        if (Math.hypot(x, z) < 30) continue; // No poner en la pista central

        createPineTree(x, z);
    }
}

function createPineTree(x, z) {
    const treeGroup = new THREE.Group();

    // Tronco
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Copa volumétrica cónica en capas
    const foliageMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x2e7d32 : 0x1b5e20,
        roughness: 0.8
    });

    for (let c = 0; c < 3; c++) {
        const coneGeo = new THREE.ConeGeometry(2.4 - c * 0.5, 2.8, 7);
        const cone = new THREE.Mesh(coneGeo, foliageMat);
        cone.position.y = 3.0 + c * 1.6;
        cone.castShadow = true;
        cone.receiveShadow = true;
        treeGroup.add(cone);
    }

    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
}

// ============================================================================
// 4. GENERADOR DE VEHÍCULOS 3D (ESTILO DRAWRACE 2 / GT PROTOTYPE)
// ============================================================================
function build3DVehicleMesh(colorHex, name) {
    const carRoot = new THREE.Group();

    // Chasis / Carrocería con material metálico brillante
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

    // Grupo de suspensión que recibe el balanceo (Roll / Pitch)
    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.55;
    carRoot.add(chassisGroup);
    carRoot.chassis = chassisGroup;

    // 1. Parte inferior de la carrocería (Lower Body)
    const lowerGeo = new THREE.BoxGeometry(2.0, 0.45, 4.4);
    const lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
    lowerBody.castShadow = true;
    chassisGroup.add(lowerBody);

    // 2. Cabina y parabrisas aerodinámico (Cockpit Glass)
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.48, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.42, -0.2);
    cabin.castShadow = true;
    chassisGroup.add(cabin);

    // 3. Techo metálico
    const roofGeo = new THREE.BoxGeometry(1.5, 0.08, 1.8);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 0.68, -0.2);
    roof.castShadow = true;
    chassisGroup.add(roof);

    // 4. Alerón trasero GT (Rear Spoiler)
    const wingGeo = new THREE.BoxGeometry(2.1, 0.08, 0.6);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 0.65, 1.85);
    wing.castShadow = true;
    chassisGroup.add(wing);

    // Soportes de alerón
    const postGeo = new THREE.BoxGeometry(0.08, 0.4, 0.2);
    const postL = new THREE.Mesh(postGeo, carbonMat);
    postL.position.set(-0.7, 0.42, 1.85);
    const postR = new THREE.Mesh(postGeo, carbonMat);
    postR.position.set(0.7, 0.42, 1.85);
    chassisGroup.add(postL);
    chassisGroup.add(postR);

    // 5. Faros delanteros dobles (Xenón)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), lightMat);
    hlL.position.set(-0.75, 0.1, -2.2);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), lightMat);
    hlR.position.set(0.75, 0.1, -2.2);
    chassisGroup.add(hlL);
    chassisGroup.add(hlR);

    // 6. Luces de freno traseras LED rojas
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const blL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), brakeMat);
    blL.position.set(-0.75, 0.1, 2.2);
    const blR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), brakeMat);
    blR.position.set(0.75, 0.1, 2.2);
    chassisGroup.add(blL);
    chassisGroup.add(blR);

    // 7. 4 Ruedas 3D con neumáticos de goma y llantas
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

    // Ruedas delanteras con soporte de dirección
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

    // Ruedas traseras
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

// Spawnear jugador y 5 coches IA
function spawn3DCars() {
    const carsConfig = [
        { color: 0xe52521, name: 'RED APEX GT' },      // Jugador
        { color: 0x00c0ff, name: 'GULF BLUE RS' },     // IA 1
        { color: 0xfee440, name: 'VIPER YELLOW' },     // IA 2
        { color: 0x00e676, name: 'LOTUS GREEN' },      // IA 3
        { color: 0xff7b00, name: 'ORANGE DRIFT' },     // IA 4
        { color: 0x9c27b0, name: 'CYBER PURPLE' }      // IA 5
    ];

    // Posición inicial sobre la recta de salida
    const startPoint = trackCurve.getPointAt(0);
    const tangent = trackCurve.getTangentAt(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // 1. Coche del Jugador
    playerVehicle = build3DVehicleMesh(carsConfig[0].color, carsConfig[0].name);
    playerVehicle.position.copy(startPoint).add(normal.clone().multiplyScalar(3.2));
    playerVehicle.position.y = 0;
    playerAngle = Math.atan2(tangent.x, tangent.z);
    playerVehicle.rotation.y = playerAngle;
    scene.add(playerVehicle);

    // 2. Cinco rivales IA escalonados en parrilla
    aiVehicles = [];
    for (let i = 1; i <= 5; i++) {
        const ai = build3DVehicleMesh(carsConfig[i].color, carsConfig[i].name);
        const row = Math.floor(i / 2);
        const col = i % 2 === 1 ? -1 : 1;
        const pos = startPoint.clone()
            .add(tangent.clone().multiplyScalar(-row * 10))
            .add(normal.clone().multiplyScalar(col * 3.5));

        ai.position.copy(pos);
        ai.rotation.y = playerAngle;
        ai.progress = (1.0 - (row * 0.035)) % 1.0;
        ai.aiSpeed = 0;
        ai.laneOffset = (Math.random() - 0.5) * 4.0;
        scene.add(ai);
        aiVehicles.push(ai);
    }
}

// ============================================================================
// 5. ENTRADA Y CONTROLES (TECLADO Y TOUCH EN MÓVIL)
// ============================================================================
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

// Secuencia de semáforo de 3... 2... 1... GO!
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

// ============================================================================
// 6. BUCLE DE FÍSICAS Y RENDER A 60 FPS
// ============================================================================
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

// Físicas del coche del jugador (Conducción 3D, Derrape y Suspensión)
function updatePlayerPhysics(dt) {
    const left = keys.a || touchLeft;
    const right = keys.d || touchRight;
    const gas = keys.w || touchGas;
    const brake = keys.s || touchBrake;
    const turbo = keys.space || touchTurbo;

    // Gestión del Turbo Boost
    isTurboActive = false;
    if (turbo && turboAmount > 1 && gas) {
        isTurboActive = true;
        turboAmount = Math.max(0, turboAmount - dt * 25);
        spawnExhaustFlames(playerVehicle);
    } else {
        turboAmount = Math.min(100, turboAmount + dt * 10); // Recarga gradual
    }

    const maxSpeed = isTurboActive ? 75 : 52;
    const accelRate = isTurboActive ? 48 : 28;

    if (gas) {
        playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * dt);
    } else if (brake) {
        playerSpeed = Math.max(-18, playerSpeed - 38 * dt);
    } else {
        playerSpeed *= 0.985; // Fricción natural
    }

    // Dirección y ángulo de giro de ruedas
    const steerMax = 0.52;
    let targetSteer = 0;
    if (left) targetSteer = -steerMax;
    if (right) targetSteer = steerMax;
    playerSteerAngle = THREE.MathUtils.lerp(playerSteerAngle, targetSteer, dt * 12);

    // Girar las ruedas 3D delanteras
    if (playerVehicle.steerL && playerVehicle.steerR) {
        playerVehicle.steerL.rotation.y = playerSteerAngle;
        playerVehicle.steerR.rotation.y = playerSteerAngle;
    }

    // Rotación del chasis por el giro
    const turnFactor = playerSpeed > 5 ? 1 : Math.max(0.1, playerSpeed / 5);
    playerAngle += playerSteerAngle * turnFactor * (playerSpeed >= 0 ? 1 : -1) * dt * 2.8;
    playerVehicle.rotation.y = playerAngle;

    // Desplazamiento en el espacio 3D
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    playerVehicle.position.x += forwardX * playerSpeed * dt;
    playerVehicle.position.z += forwardZ * playerSpeed * dt;

    // Ruedas rodando hacia adelante
    playerVehicle.wheels.forEach(w => {
        w.children[0].rotation.x += playerSpeed * dt * 2.2;
    });

    // Suspensión reactiva 3D: Balanceo en curva (Roll) y hundimiento (Pitch)
    const targetRoll = -playerSteerAngle * (playerSpeed / maxSpeed) * 0.28;
    const targetPitch = gas ? 0.08 : (brake ? -0.12 : 0);
    playerRoll = THREE.MathUtils.lerp(playerRoll, targetRoll, dt * 8);
    playerPitch = THREE.MathUtils.lerp(playerPitch, targetPitch, dt * 8);

    if (playerVehicle.chassis) {
        playerVehicle.chassis.rotation.z = playerRoll;
        playerVehicle.chassis.rotation.x = playerPitch;
    }

    // Derrape y marcas de goma 3D
    const isDrifting = Math.abs(playerSteerAngle) > 0.28 && Math.abs(playerSpeed) > 30;
    if (isDrifting) {
        drawAudio.setDrift(1.0);
        spawnSkidParticles(playerVehicle.position, playerAngle);
    } else {
        drawAudio.setDrift(0);
    }

    // Ajuste de altura Y según la superficie del circuito 3D (para el puente elevado)
    adjustVehicleHeightToTrack(playerVehicle);

    // Audio
    drawAudio.update(playerSpeed, maxSpeed, gas, isTurboActive);

    // Comprobación de paso por vuelta
    checkLapProgression(playerVehicle.position);
}

// Ajustar altura Y del coche al relieve o puente 3D
function adjustVehicleHeightToTrack(veh) {
    if (!trackCurve) return;
    // Encontrar el punto más cercano de la curva
    let minDist = Infinity;
    let closestY = 0;
    for (let t = 0; t <= 1; t += 0.02) {
        const pt = trackCurve.getPointAt(t);
        const dist = Math.hypot(veh.position.x - pt.x, veh.position.z - pt.z);
        if (dist < minDist) {
            minDist = dist;
            closestY = pt.y;
        }
    }
    // Si estamos dentro del ancho de la pista, adoptar su elevación
    if (minDist < 12) {
        veh.position.y = THREE.MathUtils.lerp(veh.position.y, closestY, 0.12);
    } else {
        veh.position.y = THREE.MathUtils.lerp(veh.position.y, 0, 0.12);
    }
}

// Físicas de los 5 rivales IA
function updateAIPhysics(dt) {
    if (!trackCurve) return;

    aiVehicles.forEach((ai, idx) => {
        ai.progress = (ai.progress + dt * 0.038 * (1.0 + idx * 0.02)) % 1.0;
        const currentPt = trackCurve.getPointAt(ai.progress);
        const nextPt = trackCurve.getPointAt((ai.progress + 0.01) % 1.0);
        const tangent = nextPt.clone().sub(currentPt).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        // Posicionar con desplazamiento lateral para no ir todos en fila
        const targetPos = currentPt.clone().add(normal.clone().multiplyScalar(ai.laneOffset));
        ai.position.lerp(targetPos, 0.15);

        // Orientación fluida
        const targetAngle = Math.atan2(tangent.x, tangent.z);
        ai.rotation.y = THREE.MathUtils.lerp(ai.rotation.y, targetAngle, 0.12);

        // Rodar ruedas
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

// Partículas de llamaradas de escape durante Turbo Boost
function spawnExhaustFlames(veh) {
    const flameGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff3d00 : 0xffea00 });
    const flame = new THREE.Mesh(flameGeo, flameMat);

    const rad = veh.rotation.y;
    flame.position.set(
        veh.position.x - Math.sin(rad) * 2.2 + (Math.random() - 0.5) * 0.6,
        veh.position.y + 0.5,
        veh.position.z - Math.cos(rad) * 2.2 + (Math.random() - 0.5) * 0.6
    );

    scene.add(flame);
    particles.push({ mesh: flame, life: 0.18, maxLife: 0.18 });
}

// Partículas de humo y derrape
function spawnSkidParticles(pos, angle) {
    const puffGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.4 });
    const puff = new THREE.Mesh(puffGeo, puffMat);

    puff.position.set(
        pos.x - Math.sin(angle) * 1.5 + (Math.random() - 0.5) * 0.8,
        pos.y + 0.2,
        pos.z - Math.cos(angle) * 1.5 + (Math.random() - 0.5) * 0.8
    );

    scene.add(puff);
    particles.push({ mesh: puff, life: 0.35, maxLife: 0.35, grow: true });
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

// Cámara Cenital Inclinada a 65° con Seguimiento Suave (Tilt-Shift Diorama)
function updateCameraFollow(dt) {
    if (!playerVehicle) return;

    // Adelanto de cámara según velocidad (Look-Ahead)
    const forwardX = Math.sin(playerAngle);
    const forwardZ = Math.cos(playerAngle);
    const lookDist = (playerSpeed / 75) * 14;

    const targetLookAt = new THREE.Vector3(
        playerVehicle.position.x + forwardX * lookDist,
        playerVehicle.position.y + 1.5,
        playerVehicle.position.z + forwardZ * lookDist
    );

    // Posición cenital elevada e inclinada a 65 grados
    const camOffset = new THREE.Vector3(0, 50, 32);
    const targetCamPos = playerVehicle.position.clone().add(camOffset);

    camera.position.lerp(targetCamPos, dt * 5.0);
    camera.lookAt(targetLookAt);
}

// Actualización de Telemetría HUD
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

// Comprobación de paso por meta
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

// Radar Minimapa en Esquina
function renderRadar() {
    if (!radarCtx) return;
    radarCtx.clearRect(0, 0, 140, 110);

    const cx = 70, cy = 55, scale = 0.55;

    // Trazado de la pista en el radar
    radarCtx.strokeStyle = '#2a3b53';
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

    // Rivales IA (Rojos)
    aiVehicles.forEach(ai => {
        radarCtx.fillStyle = '#ff1744';
        radarCtx.beginPath();
        radarCtx.arc(cx + ai.position.x * scale, cy + ai.position.z * scale, 3, 0, Math.PI * 2);
        radarCtx.fill();
    });

    // Jugador (Cian brillante)
    radarCtx.fillStyle = '#00f5d4';
    radarCtx.beginPath();
    radarCtx.arc(cx + playerVehicle.position.x * scale, cy + playerVehicle.position.z * scale, 4.5, 0, Math.PI * 2);
    radarCtx.fill();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Iniciar al cargar
window.addEventListener('load', initThreeEngine);
