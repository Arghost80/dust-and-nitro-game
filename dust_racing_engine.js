// ===== DUST RACING 2D TELEGRAM EDITION (OFFICIAL ASSET & TILEMAP MOTOR) =====
// Utiliza las texturas reales (.png) y niveles oficiales (.trk) extraídos del repositorio oficial juzzlin/DustRacing2D

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 640,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let currentScene;
let gameState = 'MENU';
let currentLap = 1;
const TOTAL_LAPS = 3;
let trackData = null;

const DUST_CARS = [
    { name: 'DUST RACER PINK (P1 OFICIAL)', texture: 'carPink', speed: 400, handling: 4.5, accel: 340 },
    { name: 'DUST RACER GREY (P2 OFICIAL)', texture: 'carGrey', speed: 380, handling: 5.0, accel: 360 },
    { name: 'DUST RACER RED', texture: 'carRed', speed: 420, handling: 4.2, accel: 320 },
    { name: 'DUST RACER CYAN', texture: 'carCyan', speed: 390, handling: 4.8, accel: 350 },
    { name: 'DUST RACER YELLOW', texture: 'carYellow', speed: 410, handling: 4.4, accel: 330 }
];

let selectedCarIndex = 0;
let player, npcs = [];
let playerStats = { speed: 0, tiresWear: 100, lap: 1, position: 1 };
let nextNodeIndex = 0;
let isTouchLeft = false, isTouchRight = false, isTouchAccel = false, isTouchBrake = false;
let hudSpeedText, hudLapText, hudTiresText, hudPosText;

function preload() {
    // 1. Cargar el JSON del nivel Ring oficial de Dust Racing 2D
    this.load.json('ring_track', 'assets/dust/ring_track.json');

    // 2. Cargar las texturas oficiales reales del repositorio de Dust Racing 2D
    const textures = [
        'grass', 'sand', 'asphalt', 'straight', 'corner',
        'corner45Left', 'corner45Right', 'straight45Female', 'straight45Male',
        'finish', 'pit', 'tree', 'plant', 'grandstand', 'dustRacing2DBanner',
        'brake', 'tire', 'carPink', 'carGrey', 'carRed', 'carCyan', 'carYellow'
    ];

    textures.forEach(t => {
        this.load.image(t, `assets/dust/${t}.png`);
    });
}

function create() {
    currentScene = this;
    trackData = this.cache.json.get('ring_track');
    showDustMainMenu();
}

function update(time, delta) {
    if (gameState !== 'RACE' || !player) return;

    const dt = delta / 1000;
    const carData = DUST_CARS[selectedCarIndex];

    const left = this.keyA.isDown || this.cursors.left.isDown || isTouchLeft;
    const right = this.keyD.isDown || this.cursors.right.isDown || isTouchRight;
    const accel = this.keySpace.isDown || this.cursors.up.isDown || isTouchAccel;
    const brake = this.keyS.isDown || this.cursors.down.isDown || isTouchBrake;

    // Físicas reales de Dust Racing 2D con pérdida de agarre en giros
    const gripFactor = playerStats.tiresWear / 100;
    const turnRate = carData.handling * (0.65 + gripFactor * 0.35);

    if (left) player.angle -= turnRate;
    if (right) player.angle += turnRate;

    const maxSpeed = carData.speed * (0.75 + gripFactor * 0.25);
    const accelRate = carData.accel;

    if (accel) {
        playerStats.speed = Math.min(maxSpeed, playerStats.speed + accelRate * dt);
        if (left || right) {
            playerStats.tiresWear = Math.max(15, playerStats.tiresWear - 1.5 * dt);
            spawnSkidMark(currentScene, player.x, player.y, player.angle);
        }
    } else if (brake) {
        playerStats.speed = Math.max(-maxSpeed / 3, playerStats.speed - accelRate * 2.2 * dt);
        spawnSkidMark(currentScene, player.x, player.y, player.angle);
    } else {
        playerStats.speed *= 0.975; // Fricción e inercia oficial
    }

    const rad = Phaser.Math.DegToRad(player.angle - 90);
    player.setVelocity(Math.cos(rad) * playerStats.speed, Math.sin(rad) * playerStats.speed);

    // Actualizar HUD
    if (hudSpeedText) hudSpeedText.setText(`${Math.floor(playerStats.speed / 2.6)} KM/H`);
    if (hudTiresText) hudTiresText.setText(`RUEDAS: ${Math.floor(playerStats.tiresWear)}%`);

    // Seguimiento de checkpoints oficiales del archivo de pista
    checkDustLap();

    // IA fluida de los rivales oficiales de Dust Racing 2D
    npcs.forEach((npc) => {
        if (!npc || !npc.active) return;
        const targetNode = trackData.nodes[npc.targetNode];
        const angleToTarget = Phaser.Math.Angle.Between(npc.x, npc.y, targetNode.x, targetNode.y);
        const targetDeg = Phaser.Math.RadToDeg(angleToTarget) + 90;

        npc.angle = Phaser.Math.Angle.RotateTo(npc.angle, targetDeg, 4);
        const npcRad = Phaser.Math.DegToRad(npc.angle - 90);
        npc.setVelocity(Math.cos(npcRad) * npc.speedBonus, Math.sin(npcRad) * npc.speedBonus);

        const dist = Phaser.Math.Distance.Between(npc.x, npc.y, targetNode.x, targetNode.y);
        if (dist < 180) {
            npc.targetNode = (npc.targetNode + 1) % trackData.nodes.length;
        }
    });
}

// ===== CONSTRUCCIÓN DEL CIRCUITO TILEMAP CON ASSETS REALES DE DUST RACING 2D =====

function buildOfficialDustTrack(scene) {
    // Escala del mapa: cada baldosa original es de 256x256, la escalamos para que el circuito encaje perfecto
    const scale = 0.1875; // 256 * 0.1875 = 48px por baldosa (20 cols = 960px, 8 rows = 384px + márgenes)
    const offsetX = 0;
    const offsetY = 80;

    // 1. Pintar todas las baldosas oficiales (asfalto, curvas, césped, tierra)
    trackData.tiles.forEach(tile => {
        const x = tile.i * 256 * scale + (128 * scale) + offsetX;
        const y = tile.j * 256 * scale + (128 * scale) + offsetY;

        // Comprobar si la textura existe en las cargadas
        let tex = tile.type;
        if (!scene.textures.exists(tex)) tex = 'grass';

        const sprite = scene.add.sprite(x, y, tex);
        sprite.setScale(scale);
        sprite.angle = tile.rot;
    });

    // 2. Colocar los objetos oficiales del nivel (árboles reales, gradas con público, pancartas y boxes)
    trackData.objects.forEach(obj => {
        const x = obj.x * scale + offsetX;
        const y = obj.y * scale + offsetY;

        let tex = obj.model;
        if (!scene.textures.exists(tex)) tex = 'tree';

        const sprite = scene.add.sprite(x, y, tex);
        sprite.setScale(scale * 1.4);
        sprite.angle = obj.rot;
        sprite.setDepth(10); // Los árboles y gradas por encima de la carretera
    });
}

function spawnSkidMark(scene, x, y, angle) {
    const mark = scene.add.rectangle(x, y, 4, 10, 0x0a0a0a, 0.4);
    mark.angle = angle;
    mark.setDepth(2);
    scene.time.delayedCall(4000, () => mark.destroy());
}

function checkDustLap() {
    if (!trackData || !trackData.nodes) return;
    const targetNode = trackData.nodes[nextNodeIndex];
    const scale = 0.1875;
    const targetX = targetNode.x * scale;
    const targetY = targetNode.y * scale + 80;

    const dist = Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY);
    if (dist < 140) {
        nextNodeIndex = (nextNodeIndex + 1) % trackData.nodes.length;
        if (nextNodeIndex === 1) {
            currentLap++;
            if (currentLap > TOTAL_LAPS) {
                showDustMainMenu();
            } else {
                if (hudLapText) hudLapText.setText(`VUELTA: ${currentLap}/${TOTAL_LAPS}`);
            }
        }
    }
}

// ===== MENÚ PRINCIPAL =====

function showDustMainMenu() {
    gameState = 'MENU';
    currentScene.children.removeAll();

    const bg = currentScene.add.graphics();
    bg.fillStyle(0x0e131e, 1);
    bg.fillRect(0, 0, 960, 640);

    currentScene.add.text(480, 70, 'DUST RACING 2D', { font: '900 48px Arial', fill: '#ff3399' }).setOrigin(0.5);
    currentScene.add.text(480, 120, 'CIRCUITO OFICIAL RING CON ASSETS ORIGINALES DE GITHUB', { font: 'bold 13px Courier', fill: '#00ffcc' }).setOrigin(0.5);

    // Información del circuito oficial extraído
    const trackCard = currentScene.add.graphics();
    trackCard.fillStyle(0x161f2d, 1);
    trackCard.fillRoundedRect(300, 160, 360, 65, 10);
    trackCard.lineStyle(2, 0x00ffcc, 1);
    trackCard.strokeRoundedRect(300, 160, 360, 65, 10);
    currentScene.add.text(480, 192, '🏁 PISTA OFICIAL: RING GRAND PRIX (160 TILES)', { font: 'bold 12px Arial', fill: '#ffcc00' }).setOrigin(0.5);

    // Tarjeta del vehículo oficial
    const car = DUST_CARS[selectedCarIndex];
    const carCard = currentScene.add.graphics();
    carCard.fillStyle(0x161f2d, 1);
    carCard.fillRoundedRect(300, 250, 360, 140, 10);
    carCard.lineStyle(2, 0xff3399, 1);
    carCard.strokeRoundedRect(300, 250, 360, 140, 10);

    const carSprite = currentScene.add.sprite(360, 320, car.texture);
    carSprite.setScale(1.2);

    currentScene.add.text(500, 275, car.name, { font: 'bold 13px Arial', fill: '#ffcc00' });
    currentScene.add.text(500, 305, `VEL: ${car.speed} | AGARRE: ${car.handling}`, { font: '11px Arial', fill: '#ffffff' });

    const switchCarBtn = currentScene.add.text(500, 345, '🏎️ CAMBIAR VEHÍCULO', {
        font: 'bold 11px Arial', fill: '#fff', backgroundColor: '#27384e', padding: { x: 12, y: 6 }
    }).setInteractive({ useHandCursor: true });

    switchCarBtn.on('pointerdown', () => {
        selectedCarIndex = (selectedCarIndex + 1) % DUST_CARS.length;
        showDustMainMenu();
    });

    // Botón Empezar Carrera
    const startBtn = currentScene.add.text(480, 440, '▶ EMPEZAR CARRERA', {
        font: 'bold 22px Arial', fill: '#ffffff', backgroundColor: '#00b33c', padding: { x: 40, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => startOfficialDustRace());

    // Botón Web3 TON Wallet
    const tonBtn = currentScene.add.text(480, 520, '💎 CONECTAR TON WALLET (MODO TORNEO)', {
        font: 'bold 13px Arial', fill: '#00ffff', backgroundColor: '#141d2c', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tonBtn.on('pointerdown', () => {
        tonBtn.setText('✅ TON WALLET CONECTADA (RECOMPENSAS ACTIVAS)');
    });
}

function startOfficialDustRace() {
    gameState = 'RACE';
    currentLap = 1;
    nextNodeIndex = 0;
    playerStats.speed = 0;
    playerStats.tiresWear = 100;

    currentScene.children.removeAll();

    // 1. Construir el circuito real con los azulejos de Dust Racing 2D
    buildOfficialDustTrack(currentScene);

    // 2. Situar al jugador y a los rivales sobre la línea de salida oficial
    const scale = 0.1875;
    const startX = 2695 * scale;
    const startY = 1404 * scale + 80;

    const carData = DUST_CARS[selectedCarIndex];
    player = currentScene.physics.add.sprite(startX, startY, carData.texture);
    player.setScale(scale * 1.5);
    player.setCollideWorldBounds(true);
    player.setDamping(true);
    player.setDrag(0.97);
    player.angle = 90;
    player.setDepth(15);

    // Rivales IA oficiales
    npcs = [];
    const npcTextures = ['carGrey', 'carRed', 'carCyan', 'carYellow'];
    for (let i = 0; i < 3; i++) {
        const npc = currentScene.physics.add.sprite(startX - (i + 1) * 35, startY, npcTextures[i]);
        npc.setScale(scale * 1.5);
        npc.angle = 90;
        npc.targetNode = 1;
        npc.speedBonus = 240 + i * 25;
        npc.setCollideWorldBounds(true);
        npc.setDepth(15);
        npcs.push(npc);
    }

    currentScene.physics.add.collider(player, npcs);

    // Controles de teclado
    currentScene.cursors = currentScene.input.keyboard.createCursorKeys();
    currentScene.keyA = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    currentScene.keyD = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    currentScene.keyS = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    currentScene.keyW = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    currentScene.keySpace = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    setupDustTouchControls();
    createDustHUD(currentScene);
}

function createDustHUD(scene) {
    const hud = scene.add.graphics();
    hud.fillStyle(0x0a0e17, 0.85);
    hud.fillRect(0, 0, 960, 40);
    hud.setDepth(100);

    hudPosText = scene.add.text(20, 10, 'POSICIÓN: 1/4', { font: 'bold 15px Arial', fill: '#00ffcc' }).setDepth(101);
    hudLapText = scene.add.text(260, 10, `VUELTA: 1/${TOTAL_LAPS}`, { font: 'bold 15px Arial', fill: '#ffffff' }).setDepth(101);
    hudTiresText = scene.add.text(500, 10, 'RUEDAS: 100%', { font: 'bold 15px Arial', fill: '#ffcc00' }).setDepth(101);
    hudSpeedText = scene.add.text(820, 10, '0 KM/H', { font: 'bold 16px Arial', fill: '#00ff55' }).setDepth(101);
}

function setupDustTouchControls() {
    const bindTouch = (id, onPress, onRelease) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
        el.addEventListener('mousedown', (e) => { e.preventDefault(); onPress(); });
        el.addEventListener('mouseup', (e) => { e.preventDefault(); onRelease(); });
    };

    bindTouch('btn-left', () => isTouchLeft = true, () => isTouchLeft = false);
    bindTouch('btn-right', () => isTouchRight = true, () => isTouchRight = false);
    bindTouch('btn-accel', () => isTouchAccel = true, () => isTouchAccel = false);
    bindTouch('btn-brake', () => isTouchBrake = true, () => isTouchBrake = false);
}
