// ===== LITTLE RACERS TELEGRAM 3D ENGINE (THREE.JS + CANNON.JS) =====

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

let scene, camera, renderer, world;
let playerMesh, playerBody;
let npcs = [];
let keys = { left: false, right: false, accel: false, brake: false, cannon: false, missile: false };
let gameState = 'MENU';

const CAR_MODELS = [
    { name: 'ROAD VIPER 3D', color: 0xff2222, speed: 28, accel: 35, handling: 2.2, rarity: 'NFT RARO' },
    { name: 'CYAN PHANTOM 3D', color: 0x00ccff, speed: 32, accel: 40, handling: 2.5, rarity: 'NFT ÉPICO' },
    { name: 'NEON WARRIOR 3D', color: 0xffcc00, speed: 30, accel: 45, handling: 2.0, rarity: 'NFT LEGENDARIO' },
    { name: 'SHADOW MONSTER 3D', color: 0x22aa44, speed: 35, accel: 38, handling: 2.8, rarity: 'NFT MÍTICO' }
];

let selectedCarIndex = 0;
let playerStats = { speed: 0, wrenches: 0, missiles: 8, lap: 1, totalLaps: 3 };

window.onload = function() {
    init3DEngine();
    createMainMenuUI();
};

function init3DEngine() {
    const container = document.getElementById('game-container');
    container.innerHTML = '';

    // 1. Escena Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111625);
    scene.fog = new THREE.FogExp2(0x111625, 0.012);

    // 2. Cámara Cenital / Top-down 3D (Estilo Little Racers STREET)
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 45, 30);
    camera.lookAt(0, 0, 0);

    // 3. Renderizador WebGL con iluminación fotorealista
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // 4. Luces 3D
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 5. Motor de física Cannon.js
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    setupInputs();
    window.addEventListener('resize', onWindowResize);

    animate();
}

// ===== CONSTRUCCIÓN DEL CIRCUITO 3D ESTILO LITTLE RACERS STREET =====

const TRACK_CONFIGS_3D = [
    { name: '1. CITY STREETS (CIUDAD CON RASCACIELOS)', type: 'city', skyColor: 0x1a2436, roadColor: 0x222830, curbsColor: 0xcc2222 },
    { name: '2. CANYON DUST (DESIERTO CON ROCAS)', type: 'canyon', skyColor: 0x3d271d, roadColor: 0x3a3028, curbsColor: 0xffaa00 },
    { name: '3. NEON NIGHTS (CIRCUITO NOCTURNO PRO)', type: 'neon', skyColor: 0x050814, roadColor: 0x111625, curbsColor: 0x00ffcc }
];

let currentTrack3DIndex = 0;

function create3DTrack() {
    const config = TRACK_CONFIGS_3D[currentTrack3DIndex];
    scene.background = new THREE.Color(config.skyColor);

    // Suelo base del terreno con textura de acera/grava
    const groundGeo = new THREE.PlaneGeometry(200, 180);
    const groundMat = new THREE.MeshStandardMaterial({
        color: config.type === 'canyon' ? 0x3d271d : 0x161c24,
        roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const trackGroup = new THREE.Group();

    // Texturas fotorealistas de asfalto con marcas viales y de frenada
    const asphaltTex = TextureForge.createAsphaltTexture(true, false);
    asphaltTex.repeat.set(2, 4);
    const finishLineTex = TextureForge.createAsphaltTexture(false, true);
    finishLineTex.repeat.set(1, 1);
    const curbTex = TextureForge.createCurbTexture();
    curbTex.repeat.set(6, 1);

    // 1. Trazado de carretera urbana con asfalto detallado
    createTexturedRoadSegment(trackGroup, 0, 30, 70, 16, asphaltTex);
    createTexturedRoadSegment(trackGroup, 0, -30, 70, 16, asphaltTex);
    createTexturedRoadSegment(trackGroup, 35, 0, 16, 60, asphaltTex);
    createTexturedRoadSegment(trackGroup, -35, 0, 16, 60, finishLineTex); // Línea de meta damero

    // 2. Bordillos de circuito (Pianos rojo/blanco con relieve)
    createCurbSegment(trackGroup, 35, 30, 18, curbTex);
    createCurbSegment(trackGroup, -35, 30, 18, curbTex);
    createCurbSegment(trackGroup, 35, -30, 18, curbTex);
    createCurbSegment(trackGroup, -35, -30, 18, curbTex);

    // 3. Decoración del entorno con texturas
    if (config.type === 'city') {
        const facadeTex1 = TextureForge.createBuildingFacade('modern');
        const facadeTex2 = TextureForge.createBuildingFacade('classic');

        // Filas de Rascacielos y Edificios urbanos con oficinas iluminadas
        for (let z = -60; z <= 60; z += 24) {
            createTexturedSkyscraper(-54, z, 18, 38, 18, facadeTex1);
            createTexturedSkyscraper(54, z, 18, 44, 18, facadeTex2);
        }

        for (let x = -30; x <= 30; x += 24) {
            createTexturedSkyscraper(x, 56, 18, 32, 18, facadeTex2);
            createTexturedSkyscraper(x, -56, 18, 36, 18, facadeTex1);
        }

        // Farolas 3D con haz de luz en las aceras
        for (let z = -45; z <= 45; z += 15) {
            create3DLampPost(-26, z);
            create3DLampPost(26, z);
        }
    } else if (config.type === 'canyon') {
        for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            const x = Math.cos(angle) * 58;
            const z = Math.sin(angle) * 48;
            create3DRockFormation(x, z);
        }
    } else {
        create3DNeonFence(trackGroup, -26, 0, 60);
        create3DNeonFence(trackGroup, 26, 0, 60);
    }

    scene.add(trackGroup);
}

function createTexturedRoadSegment(group, x, z, w, d, texture) {
    const geo = new THREE.BoxGeometry(w, 0.15, d);
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.08, z);
    mesh.receiveShadow = true;
    group.add(mesh);
}

function createCurbSegment(group, x, z, radius, texture) {
    const geo = new THREE.CylinderGeometry(radius, radius, 0.25, 16);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.12, z);
    group.add(mesh);
}

function createTexturedSkyscraper(x, z, w, h, d, texture) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function create3DLampPost(x, z) {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3, z);
    pole.castShadow = true;

    const light = new THREE.PointLight(0xffea99, 1.2, 18);
    light.position.set(x, 5.8, z);
    scene.add(pole);
    scene.add(light);
}

function create3DRockFormation(x, z) {
    const geo = new THREE.DodecahedronGeometry(5 + Math.random() * 4, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6e4933, roughness: 0.9 });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, 3, z);
    rock.scale.set(1, 1.8, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}

function create3DNeonFence(group, x, z, length) {
    const geo = new THREE.BoxGeometry(0.4, 1.5, length);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const fence = new THREE.Mesh(geo, mat);
    fence.position.set(x, 0.75, z);
    group.add(fence);
}

function create3DWall(x, z, rx, rz, height) {
    const wallGeo = new THREE.BoxGeometry(rx * 2, height, rz * 2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.5, roughness: 0.3 });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x, height / 2, z);
    // Visualmente transparente solo marco borde
}

function create3DTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;

    const leavesGeo = new THREE.ConeGeometry(2, 4, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.6 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 4.5, z);
    leaves.castShadow = true;

    scene.add(trunk);
    scene.add(leaves);
}

// ===== CONSTRUCCIÓN DE COCHES 3D REALES =====

function create3DCar(colorHex, x, z) {
    const carGroup = new THREE.Group();

    // Carrocería 3D
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.0, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    carGroup.add(body);

    // Cabina / Parabrisas 3D
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2.0);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.9, roughness: 0.1 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.5, -0.3);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Cañones de combate frontales
    const gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
    const gun1 = new THREE.Mesh(gunGeo, gunMat);
    gun1.rotation.x = Math.PI / 2;
    gun1.position.set(-0.6, 1.0, 2.2);
    const gun2 = gun1.clone();
    gun2.position.set(0.6, 1.0, 2.2);
    carGroup.add(gun1);
    carGroup.add(gun2);

    // Faros delanteros LED con brillo emisivo
    const headlightGeo = new THREE.BoxGeometry(0.5, 0.25, 0.1);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xddffff });
    const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
    hlLeft.position.set(-0.7, 0.8, 2.15);
    const hlRight = hlLeft.clone();
    hlRight.position.set(0.7, 0.8, 2.15);
    carGroup.add(hlLeft);
    carGroup.add(hlRight);

    // Luces traseras de freno rojas
    const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const blLeft = new THREE.Mesh(headlightGeo, brakeLightMat);
    blLeft.position.set(-0.7, 0.8, -2.15);
    const blRight = blLeft.clone();
    blRight.position.set(0.7, 0.8, -2.15);
    carGroup.add(blLeft);
    carGroup.add(blRight);

    // Alerón trasero deportivo de competición (Spoiler)
    const spoilerGeo = new THREE.BoxGeometry(2.4, 0.1, 0.6);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
    const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
    spoiler.position.set(0, 1.8, -1.8);
    spoiler.castShadow = true;
    carGroup.add(spoiler);

    const spoilerStandGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6);
    const stand1 = new THREE.Mesh(spoilerStandGeo, spoilerMat);
    stand1.position.set(-0.8, 1.45, -1.8);
    const stand2 = stand1.clone();
    stand2.position.set(0.8, 1.45, -1.8);
    carGroup.add(stand1);
    carGroup.add(stand2);

    // Ruedas 3D con llantas de aleación cromadas
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const rimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.47, 16);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });

    const pos = [
        [-1.2, 0.55, 1.3], [1.2, 0.55, 1.3],
        [-1.2, 0.55, -1.3], [1.2, 0.55, -1.3]
    ];

    pos.forEach(p => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheel.add(rim);
        wheel.position.set(p[0], p[1], p[2]);
        wheel.castShadow = true;
        carGroup.add(wheel);
    });

    carGroup.position.set(x, 0, z);
    scene.add(carGroup);

    return carGroup;
}

// ===== BUCLE DE JUEGO Y FÍSICA =====

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'RACE' && playerMesh) {
        // Control de rotación del coche jugador
        if (keys.left) playerMesh.rotation.y += 0.045;
        if (keys.right) playerMesh.rotation.y -= 0.045;

        // Aceleración y freno
        if (keys.accel) {
            playerStats.speed = Math.min(38, playerStats.speed + 0.6);
        } else if (keys.brake) {
            playerStats.speed = Math.max(-10, playerStats.speed - 0.8);
        } else {
            playerStats.speed *= 0.96;
        }

        // Desplazamiento en la dirección orientada
        const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerMesh.rotation.y);
        playerMesh.position.addScaledVector(dir, playerStats.speed * 0.016);

        // Cámara 3D con perspectiva isométrica cinematográfica estilo Little Racers STREET
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerMesh.position.x, 0.12);
        camera.position.y = 30;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, playerMesh.position.z + 24, 0.12);
        camera.lookAt(playerMesh.position.x, 1.2, playerMesh.position.z);

        // Movimiento de rivales IA 3D en pista
        npcs.forEach((npc, idx) => {
            npc.mesh.rotation.y += (Math.sin(Date.now() * 0.001 + idx) * 0.01);
            const npcDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), npc.mesh.rotation.y);
            npc.mesh.position.addScaledVector(npcDir, npc.speed * 0.016);
        });

        // Actualizar HUD
        const spdElem = document.getElementById('hud-speed');
        if (spdElem) spdElem.innerText = Math.floor(playerStats.speed * 3);
    }

    renderer.render(scene, camera);
}

// ===== INTERFAZ MENÚ NATIVO TELEGRAM WEB3 =====

function createMainMenuUI() {
    const container = document.getElementById('game-container');

    const menuDiv = document.createElement('div');
    menuDiv.id = 'main-menu-3d';
    menuDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(10,14,26,0.85);display:flex;flex-direction:column;align-items:center;justify-center:center;z-index:100;color:#fff;font-family:Arial,sans-serif;text-align:center;padding:20px;box-sizing:border-box;';

    menuDiv.innerHTML = `
        <h1 style="color:#ffcc00;font-size:30px;margin-bottom:5px;text-shadow:0 0 10px #ff9900;">LITTLE RACERS 3D WEB3</h1>
        <p style="color:#00ffcc;font-size:13px;margin-bottom:20px;font-weight:bold;">CLON NATIVO 3D PARA TELEGRAM MINI APP</p>

        <div style="background:#162032;border:2px solid #00ffcc;padding:15px;border-radius:12px;margin-bottom:15px;max-width:340px;width:100%;">
            <h3 id="track-name-display" style="color:#ffcc00;margin:0 0 10px 0;">${TRACK_CONFIGS_3D[0].name}</h3>
            <button id="btn-next-track" style="background:#283a54;color:#fff;border:1px solid #00ffcc;padding:8px 16px;border-radius:6px;cursor:pointer;">🏁 CAMBIAR CIRCUITO 3D</button>
        </div>

        <div style="background:#162032;border:2px solid #00ffcc;padding:15px;border-radius:12px;margin-bottom:20px;max-width:340px;width:100%;">
            <h3 id="car-name-display" style="color:#ffcc00;margin:0 0 5px 0;">${CAR_MODELS[0].name}</h3>
            <p id="car-rarity-display" style="color:#00ffcc;font-weight:bold;margin:4px 0;">${CAR_MODELS[0].rarity}</p>
            <p id="car-speed-display" style="margin:4px 0;">VELOCIDAD: ${CAR_MODELS[0].speed} MAX</p>
            <button id="btn-next-car" style="background:#283a54;color:#fff;border:1px solid #00ffcc;padding:8px 16px;border-radius:6px;margin-top:6px;cursor:pointer;">🏎️ CAMBIAR COCHE</button>
        </div>

        <button id="btn-start-race-3d" style="background:#00b33c;color:#fff;font-size:20px;font-weight:bold;border:none;padding:14px 38px;border-radius:30px;cursor:pointer;box-shadow:0 4px 15px rgba(0,179,60,0.4);margin-bottom:12px;">▶ EMPEZAR CARRERA 3D</button>
        <button id="btn-connect-ton" style="background:#1a2b4c;color:#00ffff;border:1px solid #00ffff;padding:10px 20px;border-radius:20px;cursor:pointer;">💎 CONECTAR TON WALLET</button>
    `;

    container.appendChild(menuDiv);

    document.getElementById('btn-next-track').onclick = function() {
        currentTrack3DIndex = (currentTrack3DIndex + 1) % TRACK_CONFIGS_3D.length;
        document.getElementById('track-name-display').innerText = TRACK_CONFIGS_3D[currentTrack3DIndex].name;
    };

    document.getElementById('btn-next-car').onclick = function() {
        selectedCarIndex = (selectedCarIndex + 1) % CAR_MODELS.length;
        const car = CAR_MODELS[selectedCarIndex];
        document.getElementById('car-name-display').innerText = car.name;
        document.getElementById('car-rarity-display').innerText = car.rarity;
        document.getElementById('car-speed-display').innerText = `VELOCIDAD: ${car.speed} MAX`;
    };

    document.getElementById('btn-connect-ton').onclick = function() {
        this.innerText = '✅ TON WALLET CONECTADA';
    };

    document.getElementById('btn-start-race-3d').onclick = function() {
        menuDiv.style.display = 'none';
        start3DRace();
    };
}

function start3DRace() {
    gameState = 'RACE';
    document.getElementById('hud-overlay').style.display = 'flex';

    create3DTrack();

    const carData = CAR_MODELS[selectedCarIndex];
    playerMesh = create3DCar(carData.color, 0, 24);

    // Spawn de 3 rivales IA en 3D
    npcs = [
        { mesh: create3DCar(0x00ccff, -4, 24), speed: 26 },
        { mesh: create3DCar(0xffcc00, 4, 24), speed: 24 },
        { mesh: create3DCar(0x22aa44, 0, 28), speed: 27 }
    ];
}

function setupInputs() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
        if (e.key === ' ' || e.key === 'ArrowUp') keys.accel = true;
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.brake = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
        if (e.key === ' ' || e.key === 'ArrowUp') keys.accel = false;
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.brake = false;
    });

    // Controles táctiles pantalla móvil
    const bindTouch = (id, onPress, onRelease) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
        el.addEventListener('mousedown', (e) => { e.preventDefault(); onPress(); });
        el.addEventListener('mouseup', (e) => { e.preventDefault(); onRelease(); });
    };

    bindTouch('btn-left', () => keys.left = true, () => keys.left = false);
    bindTouch('btn-right', () => keys.right = true, () => keys.right = false);
    bindTouch('btn-accel', () => keys.accel = true, () => keys.accel = false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
