// ===== BATTLE DERBY 3D: ENGINE & COMBAT SIMULATOR =====
// Gráficos 3D estilizados en tiempo real inspirados en Battle Derby (Triple O Games) y Brawl Stars.
// Desarrollado con Three.js, físicas 3D de saltos en rampas, torretas automáticas, barriles explosivos y demolición.

let scene, camera, renderer;
let playerVehicle;
let aiVehicles = [];
let bullets = [];
let particles = [];
let barrels = [];
let boostPads = [];
let clock;

let derbyState = 'MENU'; // 'MENU' | 'BATTLE' | 'GAME_OVER'
let selectedCarType = 0;
let killsCount = 0;
let nitroFuel = 100;
let isBoosting = false;

// Audio Web Audio API
class DerbyAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
    }
    init() {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
            this.engineOsc.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();
        } catch (e) {}
    }
    setEnginePitch(ratio) {
        if (!this.ctx || !this.engineOsc) return;
        const freq = 60 + Math.min(1, Math.max(0, ratio)) * 160;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }
    playGun() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }
    playHit() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    }
    playExplosion() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}
const sfx = new DerbyAudio();

// Controles
const keys = { forward: false, backward: false, left: false, right: false, fire: false, nitro: false };

window.addEventListener('keydown', (e) => {
    sfx.init();
    if (e.key === 'w' || e.key === 'ArrowUp') keys.forward = true;
    if (e.key === 's' || e.key === 'ArrowDown') keys.backward = true;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === ' ' || e.key === 'Shift' || e.key === 'q') keys.nitro = true;
    if (e.key === 'e' || e.key === 'f') keys.fire = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') keys.forward = false;
    if (e.key === 's' || e.key === 'ArrowDown') keys.backward = false;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === ' ' || e.key === 'Shift' || e.key === 'q') keys.nitro = false;
    if (e.key === 'e' || e.key === 'f') keys.fire = false;
});

// Setup táctil móvil
function initTouchControls() {
    const bind = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); sfx.init(); keys[key] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
        el.addEventListener('mousedown', (e) => { e.preventDefault(); sfx.init(); keys[key] = true; });
        el.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
    };
    bind('b-left', 'left');
    bind('b-right', 'right');
    bind('b-gas', 'forward');
    bind('b-brake', 'backward');
    bind('b-nitro', 'nitro');
    bind('b-fire', 'fire');
}

// Configuración de Coches 3D
const DERBY_CARS_CONFIG = [
    { name: 'INTERCEPTOR', color: 0xd32f2f, maxSpeed: 38, accel: 34, hp: 100, scale: [1.8, 0.7, 3.4] },
    { name: 'BULLDOZER V8', color: 0x0288d1, maxSpeed: 32, accel: 28, hp: 140, scale: [2.1, 0.9, 3.6] },
    { name: 'CYBER TRUCK', color: 0x37474f, maxSpeed: 34, accel: 30, hp: 130, scale: [2.0, 0.85, 3.8] },
    { name: 'DESERT BUGGY', color: 0xfbc02d, maxSpeed: 42, accel: 40, hp: 85, scale: [1.7, 0.75, 3.0] }
];

function selectDerbyCar(idx) {
    sfx.init();
    selectedCarType = idx;
    document.querySelectorAll('.car-card').forEach((c, i) => {
        c.classList.toggle('selected', i === idx);
    });
}

// ===== INICIALIZACIÓN DEL MOTOR 3D THREE.JS =====
function init3DEngine() {
    const container = document.getElementById('webgl-container');
    clock = new THREE.Clock();

    // 1. Escena y Niebla de Profundidad
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c101a);
    scene.fog = new THREE.FogExp2(0x0c101a, 0.012);

    // 2. Cámara 3D Isométrica Tilted
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 22, 20);

    // 3. Renderer WebGL con Sombras Suaves (PCFSoft)
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Iluminación Cinematográfica
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.2);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 5. Construir Arena de Combate 3D
    build3DArena();

    window.addEventListener('resize', onWindowResize);
    initTouchControls();
}

// ===== CONSTRUIR ARENA 3D CON RAMPAS, BARRERAS Y SALTOS =====
function build3DArena() {
    // A) Suelo de Arena y Asfalto
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x181c24,
        roughness: 0.85,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // B) Pistas y Líneas de Asfalto con Pianos Rojiblancos 3D
    const ringGeo = new THREE.RingGeometry(35, 65, 48);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x242832,
        roughness: 0.7,
        metalness: 0.2
    });
    const trackRing = new THREE.Mesh(ringGeo, ringMat);
    trackRing.rotation.x = -Math.PI / 2;
    trackRing.position.y = 0.05;
    trackRing.receiveShadow = true;
    scene.add(trackRing);

    // Pianos 3D de borde exterior e interior
    build3DCurbs(35, 64, true);
    build3DCurbs(65, 96, false);

    // C) Rampas de Salto 3D (Jump Ramps)
    createJumpRamp(-25, 0, Math.PI / 2);
    createJumpRamp(25, 0, -Math.PI / 2);

    // D) Barriles Explosivos (TNT)
    createExplosiveBarrel(-15, 15);
    createExplosiveBarrel(15, 15);
    createExplosiveBarrel(-15, -15);
    createExplosiveBarrel(15, -15);
    createExplosiveBarrel(0, 30);
    createExplosiveBarrel(0, -30);

    // E) Bandas Nitro Boost Neon
    createBoostPad(-35, 20, 0);
    createBoostPad(35, -20, Math.PI);

    // F) Vallas Perimetrales y Biondas Metálicas
    createPerimeterWalls(78);

    // G) Árboles 3D y Rocas alrededor del estadio
    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const rad = 82 + (i % 3) * 6;
        create3DTree(Math.cos(angle) * rad, Math.sin(angle) * rad);
    }
}

// Pianos 3D biselados alrededor de la pista
function build3DCurbs(radius, segments, isInner) {
    const curbGeo = new THREE.BoxGeometry(1.2, 0.35, 2.5);
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const isRed = (i % 2 === 0);
        const curbMat = new THREE.MeshStandardMaterial({
            color: isRed ? 0xd32f2f : 0xffffff,
            roughness: 0.5
        });
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius);
        curb.rotation.y = -angle;
        curb.castShadow = true;
        curb.receiveShadow = true;
        scene.add(curb);
    }
}

// Rampa de Salto 3D
function createJumpRamp(x, z, rotY) {
    const rampGroup = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(6, 0);
    shape.lineTo(6, 2.5);
    shape.closePath();

    const extrudeSettings = { depth: 8, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff9100, roughness: 0.4, metalness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(-4, 0, -3);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rampGroup.add(mesh);

    rampGroup.position.set(x, 0, z);
    rampGroup.rotation.y = rotY;
    scene.add(rampGroup);
}

// Barril Explosivo 3D
function createExplosiveBarrel(x, z) {
    const bGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.4, 16);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.3, metalness: 0.6 });
    const barrel = new THREE.Mesh(bGeo, bMat);
    barrel.position.set(x, 1.2, z);
    barrel.castShadow = true;
    barrel.isBarrel = true;
    barrel.hp = 25;
    scene.add(barrel);
    barrels.push(barrel);
}

// Banda de Nitro Boost Neon
function createBoostPad(x, z, rotY) {
    const padGeo = new THREE.PlaneGeometry(5, 10);
    const padMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, side: THREE.DoubleSide });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = rotY;
    pad.position.set(x, 0.08, z);
    scene.add(pad);
    boostPads.push({ mesh: pad, x, z });
}

// Muros perimetrales
function createPerimeterWalls(radius) {
    const wallGeo = new THREE.BoxGeometry(6, 3.5, 1);
    const count = 48;
    for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const mat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.6, metalness: 0.8 });
        const wall = new THREE.Mesh(wallGeo, mat);
        wall.position.set(Math.cos(ang) * radius, 1.75, Math.sin(ang) * radius);
        wall.rotation.y = -ang + Math.PI / 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    }
}

// Árbol 3D estilizado
function create3DTree(x, z) {
    const treeGroup = new THREE.Group();
    // Tronco
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Follaje cónico estilizado en 3 pisos
    for (let i = 0; i < 3; i++) {
        const fGeo = new THREE.ConeGeometry(3.5 - i * 0.7, 3.2, 8);
        const fMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
        const fCone = new THREE.Mesh(fGeo, fMat);
        fCone.position.y = 3.5 + i * 1.8;
        fCone.castShadow = true;
        treeGroup.add(fCone);
    }

    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
}

// ===== CONSTRUCTOR DE COCHE 3D ESTILIZADO =====
function build3DCarMesh(cfg) {
    const carGroup = new THREE.Group();

    // 1. Chasis Principal Metálico
    const bodyGeo = new THREE.BoxGeometry(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.25,
        metalness: 0.75
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = cfg.scale[1] / 2 + 0.35;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // 2. Cabina y Parabrisas Tintado
    const cabinGeo = new THREE.BoxGeometry(cfg.scale[0] * 0.82, cfg.scale[1] * 0.75, cfg.scale[2] * 0.5);
    const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x0a1420,
        roughness: 0.1,
        metalness: 0.9
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, bodyMesh.position.y + cfg.scale[1] * 0.65, -0.2);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // 3. Torretas de Metralleta en el Techo
    const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
    const gunL = new THREE.Mesh(gunGeo, gunMat);
    gunL.rotation.x = Math.PI / 2;
    gunL.position.set(-0.35, cabinMesh.position.y + 0.35, 0.4);
    carGroup.add(gunL);

    const gunR = new THREE.Mesh(gunGeo, gunMat);
    gunR.rotation.x = Math.PI / 2;
    gunR.position.set(0.35, cabinMesh.position.y + 0.35, 0.4);
    carGroup.add(gunR);

    // 4. Parachoques Delantero Heavy Duty (Bullbar)
    const rammerGeo = new THREE.BoxGeometry(cfg.scale[0] * 1.05, 0.35, 0.4);
    const rammerMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.95 });
    const rammer = new THREE.Mesh(rammerGeo, rammerMat);
    rammer.position.set(0, 0.45, cfg.scale[2] / 2 + 0.15);
    rammer.castShadow = true;
    carGroup.add(rammer);

    // 5. Ruedas 3D con Llanta Metálica
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const wheelPositions = [
        [-cfg.scale[0] / 2 - 0.12, 0.45, cfg.scale[2] / 3],
        [cfg.scale[0] / 2 + 0.12, 0.45, cfg.scale[2] / 3],
        [-cfg.scale[0] / 2 - 0.12, 0.45, -cfg.scale[2] / 3],
        [cfg.scale[0] / 2 + 0.12, 0.45, -cfg.scale[2] / 3]
    ];
    carGroup.wheels = [];
    wheelPositions.forEach(wp => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...wp);
        w.castShadow = true;
        carGroup.add(w);
        carGroup.wheels.push(w);
    });

    // 6. Tubos de Escape Nitro
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x424242, metalness: 0.9 });
    const exh = new THREE.Mesh(exhaustGeo, exhaustMat);
    exh.rotation.x = Math.PI / 2;
    exh.position.set(0, 0.4, -cfg.scale[2] / 2 - 0.15);
    carGroup.add(exh);

    return carGroup;
}

// ===== INICIAR COMBATE BATTLE DERBY =====
function startBattleDerby() {
    sfx.init();
    derbyState = 'BATTLE';

    document.getElementById('derby-menu').style.display = 'none';
    document.getElementById('hud-overlay').style.display = 'block';
    if (window.innerWidth < 1024) {
        document.getElementById('touch-ui').style.display = 'flex';
    }

    const pCfg = DERBY_CARS_CONFIG[selectedCarType];
    const pMesh = build3DCarMesh(pCfg);
    pMesh.position.set(0, 0, -45);
    pMesh.rotation.y = Math.PI / 2;
    scene.add(pMesh);

    playerVehicle = {
        mesh: pMesh,
        cfg: pCfg,
        speed: 0,
        vy: 0,
        hp: pCfg.hp,
        maxHp: pCfg.hp,
        isGrounded: true,
        lastShootTime: 0
    };

    // Crear 5 Coches Rivales IA con diferentes skins y armas
    aiVehicles = [];
    const aiConfigs = [
        DERBY_CARS_CONFIG[1],
        DERBY_CARS_CONFIG[2],
        DERBY_CARS_CONFIG[3],
        DERBY_CARS_CONFIG[0],
        DERBY_CARS_CONFIG[1]
    ];
    for (let i = 0; i < 5; i++) {
        const cfg = aiConfigs[i];
        const ang = (i / 5) * Math.PI * 2;
        const rad = 45;
        const aiMesh = build3DCarMesh(cfg);
        aiMesh.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
        aiMesh.rotation.y = ang + Math.PI / 2;
        scene.add(aiMesh);

        aiVehicles.push({
            mesh: aiMesh,
            cfg: cfg,
            speed: 0,
            vy: 0,
            hp: cfg.hp,
            maxHp: cfg.hp,
            targetAngle: ang,
            isGrounded: true,
            lastShootTime: 0
        });
    }

    animate();
}

// ===== DISPARO DE METRALLETA Y BALAS TRACER =====
function shootBullets(carObj, isPlayer) {
    const now = Date.now();
    if (now - carObj.lastShootTime < 180) return;
    carObj.lastShootTime = now;

    if (isPlayer) sfx.playGun();

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carObj.mesh.rotation.y);
    const leftPerp = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), carObj.mesh.rotation.y);

    [-0.35, 0.35].forEach(side => {
        const bGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const bMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffeb3b : 0xff1744 });
        const bullet = new THREE.Mesh(bGeo, bMat);

        bullet.position.copy(carObj.mesh.position);
        bullet.position.addScaledVector(forward, 1.8);
        bullet.position.addScaledVector(leftPerp, side);
        bullet.position.y += 1.1;

        bullet.vel = forward.clone().multiplyScalar(75);
        bullet.isPlayer = isPlayer;
        bullet.born = now;
        scene.add(bullet);
        bullets.push(bullet);
    });
}

// ===== CREAR EXPLOSIÓN Y FUEGO 3D =====
function spawnExplosion(x, y, z) {
    sfx.playExplosion();

    for (let i = 0; i < 28; i++) {
        const pGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.4, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.4 ? 0xff5722 : 0xffeb3b,
            transparent: true,
            opacity: 0.95
        });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(x, y + 0.5, z);
        p.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 22,
            Math.random() * 18 + 4,
            (Math.random() - 0.5) * 22
        );
        p.life = 0.5 + Math.random() * 0.3;
        scene.add(p);
        particles.push(p);
    }
}

// ===== BUCLE DE ANIMACIÓN 3D Y FÍSICAS A 60 FPS =====
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (derbyState === 'BATTLE' && playerVehicle) {
        updatePlayerVehicle(delta);
        updateAiVehicles(delta);
        updateBullets(delta);
        updateParticles(delta);
        checkArenaCollisions();
        updateCameraFollow();
        updateHUD();
    }

    renderer.render(scene, camera);
}

// Físicas del coche del jugador
function updatePlayerVehicle(dt) {
    const p = playerVehicle;

    // Aceleración y Nitro Boost
    let targetMaxSpeed = p.cfg.maxSpeed;
    if (keys.nitro && nitroFuel > 5) {
        targetMaxSpeed *= 1.45;
        nitroFuel = Math.max(0, nitroFuel - dt * 25);
        isBoosting = true;
    } else {
        isBoosting = false;
        nitroFuel = Math.min(100, nitroFuel + dt * 10);
    }

    if (keys.forward) {
        p.speed = Math.min(targetMaxSpeed, p.speed + p.cfg.accel * dt);
    } else if (keys.backward) {
        p.speed = Math.max(-targetMaxSpeed * 0.4, p.speed - p.cfg.accel * 1.8 * dt);
    } else {
        p.speed *= 0.96;
    }

    // Dirección con derrape
    const steerSpeed = 2.8 * (Math.abs(p.speed) > 2 ? 1 : Math.abs(p.speed) / 2);
    if (keys.left) p.mesh.rotation.y += steerSpeed * dt;
    if (keys.right) p.mesh.rotation.y -= steerSpeed * dt;

    // Disparo de metralleta
    if (keys.fire) {
        shootBullets(p, true);
    }

    // Movimiento 3D en el plano X-Z
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.mesh.rotation.y);
    p.mesh.position.addScaledVector(forward, p.speed * dt);

    // Salto 3D y Gravedad
    if (!p.isGrounded) {
        p.vy -= 24 * dt;
        p.mesh.position.y += p.vy * dt;
        if (p.mesh.position.y <= 0) {
            p.mesh.position.y = 0;
            p.vy = 0;
            p.isGrounded = true;
        }
    }

    // Rotación de ruedas al avanzar
    if (p.mesh.wheels) {
        p.mesh.wheels.forEach(w => w.rotation.x += p.speed * dt * 0.8);
    }

    // Sonido motor reactivo
    sfx.setEnginePitch(Math.abs(p.speed) / p.cfg.maxSpeed);

    // Detección de Boost Pads
    boostPads.forEach(bp => {
        const d = Math.hypot(p.mesh.position.x - bp.x, p.mesh.position.z - bp.z);
        if (d < 3.5) {
            p.speed = p.cfg.maxSpeed * 1.6;
        }
    });

    // Rampas de salto (a x=-25 o x=25)
    if (p.isGrounded && Math.abs(p.mesh.position.x) > 22 && Math.abs(p.mesh.position.x) < 28 && Math.abs(p.mesh.position.z) < 4) {
        p.vy = 14;
        p.isGrounded = false;
        p.speed *= 1.15;
    }
}

// Físicas e Inteligencia Artificial de Rivales
function updateAiVehicles(dt) {
    aiVehicles.forEach(ai => {
        if (ai.hp <= 0) return;

        // Comportamiento agresivo: perseguir al jugador o a rivales cercanos
        const target = playerVehicle;
        const dx = target.mesh.position.x - ai.mesh.position.x;
        const dz = target.mesh.position.z - ai.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        const desiredAng = Math.atan2(dx, dz);
        const angDiff = THREE.MathUtils.euclideanModulo(desiredAng - ai.mesh.rotation.y + Math.PI, Math.PI * 2) - Math.PI;

        ai.mesh.rotation.y += Math.sign(angDiff) * Math.min(Math.abs(angDiff), 2.4 * dt);
        ai.speed = Math.min(ai.cfg.maxSpeed * 0.85, ai.speed + ai.cfg.accel * 0.7 * dt);

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ai.mesh.rotation.y);
        ai.mesh.position.addScaledVector(forward, ai.speed * dt);

        // Disparar si el jugador está en su línea de visión
        if (dist < 32 && Math.abs(angDiff) < 0.4) {
            shootBullets(ai, false);
        }

        // Ruedas
        if (ai.mesh.wheels) {
            ai.mesh.wheels.forEach(w => w.rotation.x += ai.speed * dt * 0.8);
        }
    });
}

// Actualizar balas y colisiones
function updateBullets(dt) {
    const now = Date.now();
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.position.addScaledVector(b.vel, dt);

        // Comprobar colisión con el jugador
        if (!b.isPlayer && playerVehicle && playerVehicle.hp > 0) {
            const d = b.position.distanceTo(playerVehicle.mesh.position);
            if (d < 1.8) {
                playerVehicle.hp -= 6;
                sfx.playHit();
                destroyBullet(i);
                continue;
            }
        }

        // Comprobar colisión con rivales
        if (b.isPlayer) {
            let hit = false;
            for (let j = 0; j < aiVehicles.length; j++) {
                const ai = aiVehicles[j];
                if (ai.hp <= 0) continue;
                if (b.position.distanceTo(ai.mesh.position) < 2.0) {
                    ai.hp -= 12;
                    sfx.playHit();
                    if (ai.hp <= 0) {
                        spawnExplosion(ai.mesh.position.x, ai.mesh.position.y, ai.mesh.position.z);
                        scene.remove(ai.mesh);
                        killsCount++;
                    }
                    destroyBullet(i);
                    hit = true;
                    break;
                }
            }
            if (hit) continue;
        }

        // Comprobar colisión con barriles explosivos
        barrels.forEach((bar, bIdx) => {
            if (bar.hp > 0 && b.position.distanceTo(bar.position) < 1.6) {
                bar.hp -= 15;
                if (bar.hp <= 0) {
                    spawnExplosion(bar.position.x, bar.position.y, bar.position.z);
                    scene.remove(bar);
                    barrels.splice(bIdx, 1);
                }
                destroyBullet(i);
            }
        });

        // Vida máxima de bala
        if (now - b.born > 1400) {
            destroyBullet(i);
        }
    }
}

function destroyBullet(idx) {
    if (bullets[idx]) {
        scene.remove(bullets[idx]);
        bullets.splice(idx, 1);
    }
}

// Actualizar partículas de fuego
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.addScaledVector(p.vel, dt);
        p.vel.y -= 12 * dt;
        p.scale.multiplyScalar(0.96);
        p.life -= dt;
        if (p.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

// Colisiones de demolición entre coches (Ramming Damage)
function checkArenaCollisions() {
    aiVehicles.forEach(ai => {
        if (ai.hp <= 0) return;
        const d = playerVehicle.mesh.position.distanceTo(ai.mesh.position);
        if (d < 3.2) {
            sfx.playHit();
            const ramDamage = Math.floor(Math.abs(playerVehicle.speed) * 0.45);
            ai.hp -= ramDamage;
            playerVehicle.hp -= Math.floor(ramDamage * 0.4);

            // Separación elástica
            const push = new THREE.Vector3().subVectors(playerVehicle.mesh.position, ai.mesh.position).normalize();
            playerVehicle.mesh.position.addScaledVector(push, 1.2);
            ai.mesh.position.addScaledVector(push, -1.2);

            playerVehicle.speed *= 0.6;
            ai.speed *= 0.6;

            if (ai.hp <= 0) {
                spawnExplosion(ai.mesh.position.x, ai.mesh.position.y, ai.mesh.position.z);
                scene.remove(ai.mesh);
                killsCount++;
            }
        }
    });

    // Muros perimetrales
    const pDist = Math.hypot(playerVehicle.mesh.position.x, playerVehicle.mesh.position.z);
    if (pDist > 76) {
        const norm = new THREE.Vector3(playerVehicle.mesh.position.x, 0, playerVehicle.mesh.position.z).normalize();
        playerVehicle.mesh.position.copy(norm.multiplyScalar(76));
        playerVehicle.speed *= -0.4;
        sfx.playHit();
    }
}

// Cámara Isométrica Suave con Look-Ahead
function updateCameraFollow() {
    if (!playerVehicle) return;
    const pPos = playerVehicle.mesh.position;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerVehicle.mesh.rotation.y);

    const camOffset = new THREE.Vector3(0, 20, 18);
    if (isBoosting) camOffset.multiplyScalar(1.15); // Zoom dinámico de aceleración

    const targetCamPos = pPos.clone().add(camOffset).sub(forward.clone().multiplyScalar(4));
    camera.position.lerp(targetCamPos, 0.08);
    camera.lookAt(pPos.x + forward.x * 4, pPos.y + 1, pPos.z + forward.z * 4);
}

// Actualizar barra de vida e interfaz HUD
function updateHUD() {
    const hpRatio = Math.max(0, playerVehicle.hp / playerVehicle.maxHp);
    document.getElementById('player-hp-bar').style.width = (hpRatio * 100) + '%';
    document.getElementById('player-hp-text').innerText = Math.max(0, Math.floor(playerVehicle.hp)) + ' HP';
    document.getElementById('nitro-text').innerText = Math.floor(nitroFuel) + '%';
    document.getElementById('kills-text').innerText = killsCount;

    const aliveCount = (playerVehicle.hp > 0 ? 1 : 0) + aiVehicles.filter(ai => ai.hp > 0).length;
    document.getElementById('alive-text').innerText = `${aliveCount} / 6`;

    if (playerVehicle.hp <= 0 && derbyState === 'BATTLE') {
        derbyState = 'GAME_OVER';
        spawnExplosion(playerVehicle.mesh.position.x, playerVehicle.mesh.position.y, playerVehicle.mesh.position.z);
        scene.remove(playerVehicle.mesh);
        setTimeout(() => {
            alert('💀 ¡VEHÍCULO DESTRUIDO! Reiniciando combate...');
            location.reload();
        }, 1500);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('DOMContentLoaded', () => {
    init3DEngine();
});
