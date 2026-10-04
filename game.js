// ===== DUST & NITRO - MOTOR RETRO-MODERNIZADO 2D (4 CARRILES & FÍSICAS PRO) =====
// Inspirado en Horizon Chase, Badlands y OutRun con colisiones de límite, 4 carriles y coches 48x48

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ===== SINTETIZADOR DE AUDIO RETRO NATIVO (WEB AUDIO API) =====
class RetroAudioSynth {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.isInitialized = false;
    }
    init() {
        if (this.isInitialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();
            this.isInitialized = true;
        } catch (e) {
            console.log('Audio en espera de interacción');
        }
    }
    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineOsc) return;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));
        const freq = 55 + ratio * 155;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }
    playDrift() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(420 + Math.random() * 90, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }
    playTurbo() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
    playWallHit() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.14);
    }
    playCheckpoint() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
    }
}
const audioSynth = new RetroAudioSynth();

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
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
let currentTrackIndex = 0;
let currentLap = 1;
const TOTAL_LAPS = 3;
let raceStartTime = 0;

let player, npcs = [];
let playerStats = { speed: 0, turboCharges: 3, lap: 1 };
let nextWaypointIndex = 0;
let smoothTrackPoints = [];
let keys = {};
let isTouchLeft = false, isTouchRight = false, isTouchAccel = false, isTouchBrake = false;
let touchInitialized = false;
let hudSpeedText, hudLapText, hudTurboText, hudPosText;
let minimapGraphics;
let playerHeadlights;
let vignetteOverlay;

let selectedCarIndex = 0;
const CARS = [
    { id: 'v8_interceptor', name: 'INTERCEPTOR V8', texture: 'car_v8', colorHex: 0xe63946, speed: 430, handling: 4.8, accel: 370 },
    { id: 'cyan_phantom', name: 'CYAN PHANTOM', texture: 'car_cyan', colorHex: 0x00f5d4, speed: 460, handling: 4.5, accel: 390 },
    { id: 'neon_viper', name: 'NEON VIPER', texture: 'car_neon', colorHex: 0xfee440, speed: 480, handling: 5.2, accel: 420 },
    { id: 'shadow_titan', name: 'SHADOW TITAN', texture: 'car_shadow', colorHex: 0x7209b7, speed: 500, handling: 4.3, accel: 450 }
];

function preload() {
    this.load.image('pbr_cinematic_track', 'assets/pbr_cinematic_track.jpg');
    this.load.image('track_lte_bg', 'assets/lte_rally_track.jpg');
    this.load.image('track_extreme', 'assets/trackmania_extreme.jpg');
    this.load.image('track_grand_bg', 'assets/grand_wide_track.jpg');
    this.load.image('track_neo_sierra', 'assets/neo_sierra_prime.jpg');
    this.load.image('compact_cars_sheet', 'assets/compact_cars.jpg');
    generateRetroModernAssets(this);
}

function create() {
    currentScene = this;
    extractCompactCars(this);
    showMainMenu();
}

function extractCompactCars(scene) {
    if (!scene.textures.exists('compact_cars_sheet')) return;
    try {
        const sheetImg = scene.textures.get('compact_cars_sheet').getSourceImage();
        const carCoords = [
            { key: 'car_v8', sx: 50, sy: 15, sw: 150, sh: 220 },
            { key: 'car_cyan', sx: 305, sy: 15, sw: 150, sh: 220 },
            { key: 'car_neon', sx: 555, sy: 15, sw: 150, sh: 220 },
            { key: 'car_shadow', sx: 805, sy: 15, sw: 150, sh: 220 }
        ];

        carCoords.forEach(c => {
            if (scene.textures.exists(c.key)) {
                scene.textures.remove(c.key);
            }
            const cvs = scene.textures.createCanvas(c.key, c.sw, c.sh);
            const ctx = cvs.context || (cvs.canvas && cvs.canvas.getContext('2d'));
            if (!ctx) return;
            ctx.drawImage(sheetImg, c.sx, c.sy, c.sw, c.sh, 0, 0, c.sw, c.sh);
            const imgData = ctx.getImageData(0, 0, c.sw, c.sh);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                // Eliminar fondo blanco para obtener un sprite con transparencia perfecta
                if (d[i] > 225 && d[i+1] > 225 && d[i+2] > 225) {
                    d[i+3] = 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            cvs.refresh();
        });
    } catch (e) {
        console.warn('Fallback a coches vectoriales:', e);
    }
}

// ===== MOTOR DE COLISIÓN CON BORDES DE LA CARRETERA (BOUNDARY LIMITS) =====

function getTrackCenterAndNormal(px, py) {
    if (!smoothTrackPoints || smoothTrackPoints.length === 0) return null;
    let minDistSq = Infinity;
    let nearestIdx = 0;

    for (let i = 0; i < smoothTrackPoints.length; i++) {
        const pt = smoothTrackPoints[i];
        const dSq = (px - pt.x) * (px - pt.x) + (py - pt.y) * (py - pt.y);
        if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestIdx = i;
        }
    }

    const n = smoothTrackPoints.length;
    const centerPt = smoothTrackPoints[nearestIdx];
    const nextPt = smoothTrackPoints[(nearestIdx + 1) % n];
    const prevPt = smoothTrackPoints[(nearestIdx - 1 + n) % n];

    const tangentX = nextPt.x - prevPt.x;
    const tangentY = nextPt.y - prevPt.y;
    const tangentLen = Math.hypot(tangentX, tangentY) || 1;

    // Normal perpendicular a la dirección de la pista
    const normX = -tangentY / tangentLen;
    const normY = tangentX / tangentLen;

    const dx = px - centerPt.x;
    const dy = py - centerPt.y;
    const lateralDist = dx * normX + dy * normY;

    return { centerPt, nearestIdx, lateralDist, normX, normY };
}

function enforceRoadBoundary(carObj, isPlayer = false) {
    const circuit = CircuitsCatalog[currentTrackIndex];
    const maxLateral = (circuit.roadWidth / 2) - 14; // Límite exacto de los quitamiedos

    const info = getTrackCenterAndNormal(carObj.x, carObj.y);
    if (!info) return;

    if (Math.abs(info.lateralDist) > maxLateral) {
        const sign = Math.sign(info.lateralDist);
        // Recolocar el coche dentro del asfalto (imposible salirse al desierto)
        carObj.x = info.centerPt.x + info.normX * (maxLateral * sign);
        carObj.y = info.centerPt.y + info.normY * (maxLateral * sign);

        if (isPlayer) {
            playerStats.speed *= 0.82; // Freno por impacto contra el guardarraíl
            audioSynth.playWallHit();
            spawnWallSparks(currentScene, carObj.x, carObj.y, info.normX * sign, info.normY * sign);
        }
    } else if (Math.abs(info.lateralDist) > maxLateral - 10 && isPlayer) {
        // En los pianos exteriores: ligera vibración y arrastre
        playerStats.speed *= 0.985;
    }
}

function spawnWallSparks(scene, x, y, nx, ny) {
    for (let i = 0; i < 5; i++) {
        const spark = scene.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffee00, 0.95);
        scene.tweens.add({
            targets: spark,
            x: x - nx * Phaser.Math.Between(10, 24) + (Math.random() - 0.5) * 14,
            y: y - ny * Phaser.Math.Between(10, 24) + (Math.random() - 0.5) * 14,
            alpha: 0,
            scale: 0.1,
            duration: 220,
            onComplete: () => spark.destroy()
        });
    }
}

function update(time, delta) {
    if (gameState !== 'RACE' || !player) return;

    const dt = delta / 1000;
    const carData = CARS[selectedCarIndex];

    const left = this.keyA.isDown || this.cursors.left.isDown || isTouchLeft;
    const right = this.keyD.isDown || this.cursors.right.isDown || isTouchRight;
    const accel = this.keySpace.isDown || this.cursors.up.isDown || isTouchAccel;
    const brake = this.keyS.isDown || this.cursors.down.isDown || isTouchBrake;
    const turbo = Phaser.Input.Keyboard.JustDown(this.keyQ);

    // Activación de Turbo Nitro
    if (turbo && playerStats.turboCharges > 0) {
        playerStats.turboCharges--;
        playerStats.speed = carData.speed * 1.35;
        if (hudTurboText) hudTurboText.setText(`⚡ TURBO: ${playerStats.turboCharges}`);
        audioSynth.playTurbo();
        spawnTurboBurst(currentScene, player.x, player.y, player.angle);
    }

    // Físicas arcade con giro y derrape
    const turnRate = carData.handling;
    if (left) player.angle -= turnRate;
    if (right) player.angle += turnRate;

    const maxSpeed = carData.speed;
    const accelRate = carData.accel;

    if (accel) {
        playerStats.speed = Math.min(maxSpeed, playerStats.speed + accelRate * dt);
        if (left || right) {
            audioSynth.playDrift();
            spawnDriftDust(currentScene, player.x, player.y, player.angle);
            spawnSkidMark(currentScene, player.x, player.y, player.angle);
        }
    } else if (brake) {
        playerStats.speed = Math.max(-maxSpeed / 3, playerStats.speed - accelRate * 2.2 * dt);
        audioSynth.playDrift();
        spawnSkidMark(currentScene, player.x, player.y, player.angle);
    } else {
        playerStats.speed *= 0.98;
    }

    const rad = Phaser.Math.DegToRad(player.angle - 90);
    player.setVelocity(Math.cos(rad) * playerStats.speed, Math.sin(rad) * playerStats.speed);

    // ✅ APLICAR LÍMITE DE PISTA ESTRICTO (EL COCHE NUNCA SE SALE)
    enforceRoadBoundary(player, true);

    // MECÁNICAS EXTREMAS DE HYPER-LOOP VERTEX (JUMP RAMPS & BOOST PADS)
    const circuit = CircuitsCatalog[currentTrackIndex];
    if (circuit.id === 'hyper_loop_vertex') {
        // 1. Boost Pad a 420, 310
        const distToBoost = Phaser.Math.Distance.Between(player.x, player.y, 420, 310);
        if (distToBoost < 45 && Date.now() - (this.lastBoostPadTime || 0) > 2000) {
            this.lastBoostPadTime = Date.now();
            playerStats.speed = carData.speed * 1.55;
            audioSynth.playTurbo();
            spawnTurboBurst(currentScene, player.x, player.y, player.angle);
            this.cameras.main.shake(180, 0.008);
        }

        // 2. Rampa de Salto Imposible a 540, 250 -> Vuelo aéreo
        const distToJump = Phaser.Math.Distance.Between(player.x, player.y, 540, 250);
        if (distToJump < 50 && !this.isJumping && playerStats.speed > 180) {
            this.isJumping = true;
            audioSynth.playTurbo();
            this.tweens.add({
                targets: player,
                scaleX: 0.35,
                scaleY: 0.35,
                duration: 480,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.isJumping = false;
                    player.setScale(0.19);
                    audioSynth.playWallHit();
                    spawnWallSparks(currentScene, player.x, player.y, 0, 1);
                    this.cameras.main.shake(150, 0.012);
                }
            });
        }
    }

    // ✅ FAROS DINÁMICOS CON ILUMINACIÓN SOBRE EL ASFALTO
    if (playerHeadlights && player) {
        playerHeadlights.clear();
        const fx = player.x + Math.cos(rad) * 14;
        const fy = player.y + Math.sin(rad) * 14;
        playerHeadlights.fillStyle(0xfff9db, 0.16);
        playerHeadlights.beginPath();
        playerHeadlights.moveTo(fx, fy);
        playerHeadlights.lineTo(fx + Math.cos(rad - 0.26) * 180, fy + Math.sin(rad - 0.26) * 180);
        playerHeadlights.lineTo(fx + Math.cos(rad + 0.26) * 180, fy + Math.sin(rad + 0.26) * 180);
        playerHeadlights.closePath();
        playerHeadlights.fillPath();
    }

    // ✅ CÁMARA DINÁMICA CON SCROLL, ZOOM POR VELOCIDAD Y TEMBLOR (SPEED SHAKE)
    if (circuit.isDynamicWorld) {
        const leadDist = Math.min(100, (playerStats.speed / carData.speed) * 90);
        this.cameras.main.setFollowOffset(-Math.cos(rad) * leadDist, -Math.sin(rad) * leadDist);

        // Zoom dinámico: se aleja al acelerar a fondo para maximizar vértigo y sensación de velocidad
        const speedRatio = Math.min(1, Math.abs(playerStats.speed) / carData.speed);
        const targetZoom = 1.22 - speedRatio * 0.14;
        this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.05);

        // Vibración sutil de cámara a más de 180 km/h (speed rumble)
        if (Math.abs(playerStats.speed) > carData.speed * 0.85) {
            this.cameras.main.shake(40, 0.0016);
        }
    }

    // Actualizar Mini-mapa en tiempo real
    updateMinimap();

    // Sonido motor adaptativo
    audioSynth.updateEngine(playerStats.speed, maxSpeed);

    // Actualizar HUD
    if (hudSpeedText) hudSpeedText.setText(`${Math.floor(playerStats.speed / 2.6)} KM/H`);

    // Comprobar vueltas
    checkLapProgress();

    // IA fluida de rivales en sus respectivos carriles
    npcs.forEach((npc) => {
        if (!npc || !npc.active) return;
        const targetPt = circuit.controlPoints[npc.targetWaypoint];

        // Añadir offset de carril al NPC para que no vayan todos en fila india
        const angleToTarget = Phaser.Math.Angle.Between(npc.x, npc.y, targetPt.x, targetPt.y);
        const targetDeg = Phaser.Math.RadToDeg(angleToTarget) + 90;

        npc.angle = Phaser.Math.Angle.RotateTo(npc.angle, targetDeg, 3.8);
        const npcRad = Phaser.Math.DegToRad(npc.angle - 90);
        npc.setVelocity(Math.cos(npcRad) * npc.speedBonus, Math.sin(npcRad) * npc.speedBonus);

        // Clamping de seguridad para rivales
        enforceRoadBoundary(npc, false);

        const dist = Phaser.Math.Distance.Between(npc.x, npc.y, targetPt.x, targetPt.y);
        if (dist < 90) {
            npc.targetWaypoint = (npc.targetWaypoint + 1) % circuit.controlPoints.length;
        }
    });
}

// ===== RENDERIZADOR DE CIRCUITO ANCHO DE 4 CARRILES CON ESCENARIOS PRO =====

function drawOrganicCircuit(scene, circuit) {
    const theme = TrackThemes[circuit.theme];
    const worldW = circuit.worldWidth || 960;
    const worldH = circuit.worldHeight || 540;

    // Fondo ambiental (hierba alpina en mundo dinámico o imagen)
    if (circuit.isDynamicWorld) {
        const bg = scene.add.graphics();
        bg.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
        bg.fillRect(0, 0, worldW, worldH);

        // Cuadrícula sutil de terreno
        bg.lineStyle(1, 0x000000, 0.04);
        for (let x = 0; x < worldW; x += 60) {
            for (let y = 0; y < worldH; y += 60) bg.strokeRect(x, y, 60, 60);
        }
    } else {
        const bgKey = (circuit.bgImageKey && scene.textures.exists(circuit.bgImageKey))
            ? circuit.bgImageKey
            : (scene.textures.exists('track_grand_bg') ? 'track_grand_bg' : 'track_neo_sierra');
        if (scene.textures.exists(bgKey)) {
            const bgImg = scene.add.image(480, 270, bgKey);
            bgImg.setDisplaySize(960, 540);
            bgImg.setDepth(0);
        } else {
            const bg = scene.add.graphics();
            bg.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
            bg.fillRect(0, 0, 960, 540);
        }
    }

    smoothTrackPoints = getSmoothTrackPath(circuit.controlPoints, 22);

    const g = scene.add.graphics();
    const rw = circuit.roadWidth; // 130-140px

    // 1. Quitamiedos metálicos y barreras exteriores con borde neón
    g.lineStyle(rw + 26, 0x2c3340, 0.95);
    g.strokePoints(smoothTrackPoints, true, true);
    g.lineStyle(rw + 18, 0x00f5d4, 0.85); // Línea de neón cian en los bordes
    g.strokePoints(smoothTrackPoints, true, true);

    // 2. Pianos bicolores de competición (rojo y blanco/amarillo)
    g.lineStyle(rw + 10, 0xff0055, 1);
    g.strokePoints(smoothTrackPoints, true, true);
    g.lineStyle(rw + 2, 0xffffff, 1);
    g.strokePoints(smoothTrackPoints, true, true);

    // 3. Asfalto principal oscuro con grano de adherencia
    g.lineStyle(rw, 0x161520, 1);
    g.strokePoints(smoothTrackPoints, true, true);

    // 4. Trazar los 4 carriles claramente diferenciados con 3 líneas divisorias
    const laneOffsets = [-rw * 0.25, 0, rw * 0.25];
    laneOffsets.forEach((offset, idx) => {
        const lanePoints = [];
        const n = smoothTrackPoints.length;
        for (let i = 0; i < n; i++) {
            const pt = smoothTrackPoints[i];
            const next = smoothTrackPoints[(i + 1) % n];
            const prev = smoothTrackPoints[(i - 1 + n) % n];
            const tx = next.x - prev.x;
            const ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len;
            const ny = tx / len;
            lanePoints.push({ x: pt.x + nx * offset, y: pt.y + ny * offset });
        }

        if (idx === 1) {
            // Línea central (amarillo neón doble)
            g.lineStyle(2, 0xfee440, 0.8);
            g.strokePoints(lanePoints, true, true);
        } else {
            // Líneas divisorias de carril (blanco discontínuo)
            g.lineStyle(2, 0xffffff, 0.55);
            g.strokePoints(lanePoints, true, true);
        }
    });

    // 5. Señales luminosas en las curvas exteriores
    const makeChevron = (x, y, angleDeg) => {
        const t = scene.add.text(x, y, '◀◀◀', {
            font: '900 18px Arial',
            fill: '#ff0055',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5).setAngle(angleDeg).setDepth(5);
        scene.tweens.add({
            targets: t,
            alpha: 0.25,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    };

    makeChevron(865, 230, 45);
    makeChevron(875, 290, 90);
    makeChevron(860, 350, 135);
    makeChevron(90, 210, -45);
    makeChevron(80, 270, -90);
    makeChevron(95, 330, -135);

    // 6. Línea de Meta Damero a 4 carriles (x: 300, y: 150)
    const startPt = circuit.controlPoints[0];
    const halfW = rw / 2;
    for (let i = 0; i < 10; i++) {
        g.fillStyle(i % 2 === 0 ? 0xffffff : 0x000000, 1);
        g.fillRect(startPt.x - 70 + i * 14, startPt.y - 12, 14, 12);
        g.fillStyle(i % 2 === 1 ? 0xffffff : 0x000000, 1);
        g.fillRect(startPt.x - 70 + i * 14, startPt.y, 14, 12);
    }

    // 7. Arco Monumental "PRIME GATE" de 4 Carriles
    const gateG = scene.add.graphics();
    gateG.fillStyle(0x0a0c16, 0.95);
    gateG.fillRect(startPt.x - 85, startPt.y - 38, 170, 16);
    gateG.lineStyle(2, 0x00f5d4, 1);
    gateG.strokeRect(startPt.x - 85, startPt.y - 38, 170, 16);
    gateG.setDepth(20);

    const banner = scene.add.text(startPt.x, startPt.y - 30, '⚡ PRIME GRAND PRIX // 🏁 META ⚡', {
        font: '900 11px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5).setDepth(21);

    scene.tweens.add({
        targets: banner,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 500,
        yoyo: true,
        repeat: -1
    });

    // Palmeras y farolas cyberpunk a los márgenes
    circuit.controlPoints.forEach((pt, i) => {
        if (i % 2 === 0) {
            const glow = scene.add.circle(pt.x + 85, pt.y + 45, 50, 0x00f5d4, 0.08);
            glow.setDepth(2);
        }
    });

    // ===== ELEMENTOS ESCENOGRÁFICOS EXCLUSIVOS L.T.E. & PBR CINEMATIC =====
    if (circuit.theme === 'lte_alpine' || circuit.theme === 'pbr_cinematic') {
        // A) Tramo de tierra y arena (curvas 5 a 9)
        if (theme.dirtRoad) {
            const dirtG = scene.add.graphics();
            const n = smoothTrackPoints.length;
            const startDirtIdx = Math.floor(n * 0.45);
            const endDirtIdx = Math.floor(n * 0.82);
            const dirtPoints = [];
            for (let i = startDirtIdx; i <= endDirtIdx; i++) dirtPoints.push(smoothTrackPoints[i]);

            dirtG.lineStyle(rw - 4, Phaser.Display.Color.HexStringToColor(theme.dirtRoad).color, 1);
            dirtG.strokePoints(dirtPoints, false, false);
            dirtG.setDepth(2);
        }

        // B) Bosques de pinos vivos con balanceo de viento y rocas
        for (let i = 0; i < circuit.controlPoints.length; i++) {
            const pt = circuit.controlPoints[i];
            const p1 = scene.add.sprite(pt.x + 105, pt.y + 75, 'lte_pine').setDepth(pt.y > 1000 ? 16 : 4);
            const p2 = scene.add.sprite(pt.x - 95, pt.y - 70, 'lte_pine').setDepth(pt.y > 1000 ? 16 : 4);
            const p3 = scene.add.sprite(pt.x + 135, pt.y - 95, 'lte_pine').setDepth(pt.y > 1000 ? 16 : 4);

            // Animación viva de viento suave en los pinos
            scene.tweens.add({ targets: p1, angle: 2.2, duration: 2400 + (i % 4) * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            scene.tweens.add({ targets: p2, angle: -1.8, duration: 2100 + (i % 4) * 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

            if (i % 2 === 0) {
                scene.add.sprite(pt.x + 80, pt.y - 45, 'lte_rock').setDepth(5);
            }
        }

        // C) PUENTE ELEVADO DE MADERA / ACERO SOBRE LA PISTA
        const bridgePt = circuit.controlPoints[2] || { x: 1350, y: 520 };
        // Sombra proyectada en el asfalto inferior
        const bShadow = scene.add.graphics();
        bShadow.fillStyle(0x000000, 0.45);
        bShadow.fillRect(bridgePt.x - 55, bridgePt.y - 90, 110, 180);
        bShadow.setDepth(3);

        // Estructura y barandillas elevadas del puente (por encima de los coches)
        const bridgeG = scene.add.graphics();
        bridgeG.fillStyle(0x4e342e, 1);
        bridgeG.fillRect(bridgePt.x - 50, bridgePt.y - 95, 100, 190);
        bridgeG.lineStyle(4, 0x8d6e63, 1);
        for (let by = bridgePt.y - 90; by < bridgePt.y + 90; by += 22) {
            bridgeG.lineBetween(bridgePt.x - 50, by, bridgePt.x + 50, by);
        }
        bridgeG.lineStyle(6, 0xe53935, 1);
        bridgeG.lineBetween(bridgePt.x - 50, bridgePt.y - 95, bridgePt.x - 50, bridgePt.y + 95);
        bridgeG.lineBetween(bridgePt.x + 50, bridgePt.y - 95, bridgePt.x + 50, bridgePt.y + 95);
        bridgeG.setDepth(30); // Los coches pasan POR DEBAJO del puente

        scene.add.text(bridgePt.x, bridgePt.y, 'OVERPASS BRIDGE', {
            font: 'bold 11px Arial', fill: '#ffffff'
        }).setOrigin(0.5).setAngle(90).setDepth(31);

        // D) Público animado con destellos de flash en la recta
        for (let i = 0; i < 16; i++) {
            const px = startPt.x + 80 + i * 35;
            const py = startPt.y - 85;
            scene.add.text(px, py, (i % 2 === 0 ? '🧍' : '📸'), { font: '15px Arial' }).setOrigin(0.5).setDepth(7);

            if (i % 3 === 0) {
                scene.time.addEvent({
                    delay: Phaser.Math.Between(1500, 3500),
                    loop: true,
                    callback: () => {
                        const flash = scene.add.circle(px, py, 14, 0xffffff, 0.9).setDepth(25);
                        scene.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 150, onComplete: () => flash.destroy() });
                    }
                });
            }
        }
    }

    // Elementos visuales extremos de Trackmania & Hot Wheels
    if (circuit.id === 'hyper_loop_vertex') {
        const bp = scene.add.text(420, 310, '⚡ >>> BOOST >>> ⚡', {
            font: '900 12px Arial',
            fill: '#ffffff',
            backgroundColor: '#ff6600',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(6);
        scene.tweens.add({ targets: bp, alpha: 0.35, duration: 250, yoyo: true, repeat: -1 });

        const ramp = scene.add.text(540, 250, '🚀 MEGA JUMP RAMP 🚀', {
            font: '900 12px Arial',
            fill: '#000000',
            backgroundColor: '#00f5d4',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(6);
        scene.tweens.add({ targets: ramp, scaleX: 1.08, scaleY: 1.08, duration: 400, yoyo: true, repeat: -1 });

        scene.add.text(840, 220, '🎯 LANDING ZONE', {
            font: '900 11px Arial',
            fill: '#00ffcc',
            backgroundColor: '#0a0d1a',
            padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setDepth(6);

        scene.add.text(180, 180, '🌀 360° VERTICAL LOOP', {
            font: '900 12px Arial',
            fill: '#ff007f',
            backgroundColor: '#120b22',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(6);
    }
}

// ===== EFECTOS VISUALES: DERRAPES, POLVO Y NITRO =====

function spawnDriftDust(scene, x, y, angle) {
    const rad = Phaser.Math.DegToRad(angle + 180);
    const dustX = x + Math.cos(rad) * 12;
    const dustY = y + Math.sin(rad) * 12;

    const circuit = CircuitsCatalog[currentTrackIndex];
    const isNeo = circuit.theme === 'neo_sierra';
    const color = isNeo ? (Math.random() > 0.5 ? 0x00f5d4 : 0xff007f) : 0xddb088;

    const dust = scene.add.circle(dustX, dustY, Phaser.Math.Between(3, 6), color, 0.7);
    scene.tweens.add({
        targets: dust,
        scale: 2.2,
        alpha: 0,
        duration: 320,
        onComplete: () => dust.destroy()
    });
}

function spawnSkidMark(scene, x, y, angle) {
    const mark = scene.add.rectangle(x, y, 3, 8, 0x111111, 0.35);
    mark.angle = angle;
    mark.setDepth(1);
    scene.time.delayedCall(4000, () => mark.destroy());
}

function spawnTurboBurst(scene, x, y, angle) {
    const rad = Phaser.Math.DegToRad(angle + 180);
    for (let i = 0; i < 8; i++) {
        const flame = scene.add.circle(x + Math.cos(rad) * 14, y + Math.sin(rad) * 14, 5, 0x00f5d4, 0.9);
        scene.tweens.add({
            targets: flame,
            x: flame.x + (Math.random() - 0.5) * 28,
            y: flame.y + (Math.random() - 0.5) * 28,
            scale: 0.1,
            alpha: 0,
            duration: 300,
            onComplete: () => flame.destroy()
        });
    }
}

function checkLapProgress() {
    const circuit = CircuitsCatalog[currentTrackIndex];
    const targetPt = circuit.controlPoints[nextWaypointIndex];
    const dist = Phaser.Math.Distance.Between(player.x, player.y, targetPt.x, targetPt.y);

    if (dist < 85) {
        nextWaypointIndex = (nextWaypointIndex + 1) % circuit.controlPoints.length;
        audioSynth.playCheckpoint();

        if (nextWaypointIndex === 1) {
            currentLap++;
            if (currentLap > TOTAL_LAPS) {
                const totalTime = ((Date.now() - raceStartTime) / 1000).toFixed(2);
                saveRaceResult(totalTime);
            } else {
                if (hudLapText) hudLapText.setText(`VUELTA: ${currentLap}/${TOTAL_LAPS}`);
            }
        }
    }
}

function saveRaceResult(timeSec) {
    const circuit = CircuitsCatalog[currentTrackIndex];
    fetch('/api/race/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest_user',
            username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'Piloto Retro',
            track: circuit.name,
            time: parseFloat(timeSec)
        })
    }).then(res => res.json()).then(data => {
        showVictoryScreen(timeSec, data.coinsEarned || 200);
    }).catch(() => {
        showVictoryScreen(timeSec, 200);
    });
}

function showVictoryScreen(timeSec, coins) {
    gameState = 'VICTORY';
    currentScene.children.removeAll();

    currentScene.cameras.main.stopFollow();
    currentScene.cameras.main.setScroll(0, 0);
    currentScene.cameras.main.setZoom(1);

    const bg = currentScene.add.graphics();
    bg.fillStyle(0x0e131e, 0.95);
    bg.fillRect(0, 0, 960, 540);

    currentScene.add.text(480, 110, '🏁 ¡CARRERA COMPLETADA! 🏁', { font: '900 38px Arial', fill: '#00ffcc' }).setOrigin(0.5);
    currentScene.add.text(480, 190, `TIEMPO FINAL: ${timeSec} SEGUNDOS`, { font: 'bold 22px Courier', fill: '#ffcc00' }).setOrigin(0.5);
    currentScene.add.text(480, 245, `💰 RECOMPENSA: +${coins} MONEDAS`, { font: 'bold 18px Arial', fill: '#00ff55' }).setOrigin(0.5);

    const restartBtn = currentScene.add.text(480, 360, '🔄 VOLVER AL MENÚ', {
        font: 'bold 20px Arial', fill: '#fff', backgroundColor: '#00b33c', padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => showMainMenu());
}

// ===== ASSETS VECTORIALES DE RESPALDO =====

function generateRetroModernAssets(scene) {
    const drawCar = (key, bodyHex, stripeHex, lightHex) => {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x000000, 0.4);
        g.fillRoundedRect(3, 3, 22, 38, 5);
        g.fillStyle(0x111111, 1);
        g.fillRoundedRect(2, 2, 20, 36, 5);
        g.fillStyle(bodyHex, 1);
        g.fillRoundedRect(3, 3, 18, 34, 4);
        g.fillStyle(stripeHex, 1);
        g.fillRect(10, 2, 4, 36);
        g.fillStyle(0x112233, 1);
        g.fillRoundedRect(5, 12, 14, 10, 2);
        g.fillStyle(0xddffff, 1);
        g.fillRect(3, 2, 4, 3); g.fillRect(17, 2, 4, 3);
        g.fillStyle(0xff1100, 1);
        g.fillRect(3, 35, 4, 3); g.fillRect(17, 35, 4, 3);
        g.generateTexture(key, 24, 40);
    };

    drawCar('car_v8_vec', 0xe63946, 0xffffff, 0xff8896);
    drawCar('car_cyan_vec', 0x00f5d4, 0x111111, 0x88ffee);
    drawCar('car_neon_vec', 0xfee440, 0x000000, 0xfffaa0);
    drawCar('car_shadow_vec', 0x7209b7, 0x00f5d4, 0xb565e6);

    // Pino Alpino Estilo L.T.E. (64x64) con sombra suave
    const gPine = scene.make.graphics({ x: 0, y: 0, add: false });
    gPine.fillStyle(0x000000, 0.35);
    gPine.fillCircle(38, 38, 22);
    gPine.fillStyle(0x1b4332, 1);
    gPine.fillCircle(32, 32, 22);
    gPine.fillStyle(0x2d6a4f, 1);
    gPine.fillCircle(30, 28, 16);
    gPine.fillStyle(0x40916c, 1);
    gPine.fillCircle(28, 24, 11);
    gPine.fillStyle(0x74c69d, 0.9);
    gPine.fillCircle(26, 21, 6);
    gPine.generateTexture('lte_pine', 64, 64);

    // Roca de Granito Estilo L.T.E. (48x48)
    const gRock = scene.make.graphics({ x: 0, y: 0, add: false });
    gRock.fillStyle(0x000000, 0.35);
    gRock.fillRoundedRect(8, 8, 32, 28, 8);
    gRock.fillStyle(0x4a5568, 1);
    gRock.fillRoundedRect(6, 6, 32, 28, 7);
    gRock.fillStyle(0x718096, 1);
    gRock.fillRoundedRect(7, 7, 24, 18, 5);
    gRock.fillStyle(0xa0aec0, 0.8);
    gRock.fillRect(10, 9, 12, 6);
    gRock.generateTexture('lte_rock', 48, 48);
}

// ===== MENÚ PRINCIPAL =====

function showMainMenu() {
    gameState = 'MENU';
    currentScene.children.removeAll();

    currentScene.cameras.main.stopFollow();
    currentScene.cameras.main.setScroll(0, 0);
    currentScene.cameras.main.setZoom(1);

    const bg = currentScene.add.graphics();
    bg.fillStyle(0x0e131e, 1);
    bg.fillRect(0, 0, 960, 540);

    const circuit = CircuitsCatalog[currentTrackIndex];
    const bgKey = (circuit.bgImageKey && currentScene.textures.exists(circuit.bgImageKey))
        ? circuit.bgImageKey
        : (currentScene.textures.exists('track_lte_bg') ? 'track_lte_bg' : (currentScene.textures.exists('track_grand_bg') ? 'track_grand_bg' : 'track_neo_sierra'));
    if (currentScene.textures.exists(bgKey)) {
        const bgPreview = currentScene.add.image(480, 270, bgKey);
        bgPreview.setDisplaySize(960, 540);
        bgPreview.setAlpha(0.28);
    }

    currentScene.add.text(480, 55, 'DUST & NITRO RACING', { font: '900 44px Arial', fill: '#ffcc00' }).setOrigin(0.5);
    currentScene.add.text(480, 100, 'DYNAMIC SCROLLING ENGINE // ESTILO L.T.E. & ART OF RALLY', { font: 'bold 12px Courier', fill: '#00ffcc' }).setOrigin(0.5);

    // Tarjeta del circuito
    const trackCard = currentScene.add.graphics();
    trackCard.fillStyle(0x161f2d, 0.95);
    trackCard.fillRoundedRect(300, 135, 360, 75, 10);
    trackCard.lineStyle(2, 0x00ffcc, 1);
    trackCard.strokeRoundedRect(300, 135, 360, 75, 10);

    currentScene.add.text(480, 160, `🏁 ${circuit.name}`, { font: 'bold 13px Arial', fill: '#ffcc00' }).setOrigin(0.5);
    const switchTrackBtn = currentScene.add.text(480, 190, '🔄 CAMBIAR CIRCUITO', {
        font: 'bold 11px Arial', fill: '#fff', backgroundColor: '#27384e', padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    switchTrackBtn.on('pointerdown', () => {
        currentTrackIndex = (currentTrackIndex + 1) % CircuitsCatalog.length;
        showMainMenu();
    });

    // Tarjeta del vehículo (48x48 compacto)
    const car = CARS[selectedCarIndex];
    const carCard = currentScene.add.graphics();
    carCard.fillStyle(0x161f2d, 0.95);
    carCard.fillRoundedRect(300, 225, 360, 115, 10);
    carCard.lineStyle(2, 0xffcc00, 1);
    carCard.strokeRoundedRect(300, 225, 360, 115, 10);

    const carTextureKey = currentScene.textures.exists(car.texture) ? car.texture : `${car.texture}_vec`;
    const carSprite = currentScene.add.sprite(360, 282, carTextureKey);
    carSprite.setScale(0.32);

    currentScene.add.text(460, 245, `${car.name} (48x48 PRO)`, { font: 'bold 13px Arial', fill: '#ffcc00' });
    currentScene.add.text(460, 270, `VEL: ${car.speed} | AGARRE: ${car.handling}`, { font: '11px Arial', fill: '#ffffff' });

    const switchCarBtn = currentScene.add.text(460, 305, '🏎️ CAMBIAR VEHÍCULO', {
        font: 'bold 11px Arial', fill: '#fff', backgroundColor: '#27384e', padding: { x: 10, y: 4 }
    }).setInteractive({ useHandCursor: true });

    switchCarBtn.on('pointerdown', () => {
        selectedCarIndex = (selectedCarIndex + 1) % CARS.length;
        showMainMenu();
    });

    // Botón Empezar Carrera
    const startBtn = currentScene.add.text(480, 395, '▶ EMPEZAR CARRERA', {
        font: 'bold 22px Arial', fill: '#ffffff', backgroundColor: '#00b33c', padding: { x: 45, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        audioSynth.init();
        startRace();
    });

    // Botón Web3 TON
    const tonBtn = currentScene.add.text(480, 475, '💎 CONECTAR TON WALLET (RECOMPENSAS Y NFTS)', {
        font: 'bold 12px Arial', fill: '#00ffff', backgroundColor: '#141d2c', padding: { x: 18, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tonBtn.on('pointerdown', () => {
        tonBtn.setText('✅ TON WALLET CONECTADA (MODO WEB3 ACTIVO)');
    });
}

function startRace() {
    gameState = 'RACE';
    currentLap = 1;
    nextWaypointIndex = 0;
    playerStats.speed = 0;
    playerStats.turboCharges = 3;
    raceStartTime = Date.now();

    currentScene.children.removeAll();

    const circuit = CircuitsCatalog[currentTrackIndex];
    const worldW = circuit.worldWidth || 960;
    const worldH = circuit.worldHeight || 540;

    currentScene.physics.world.setBounds(0, 0, worldW, worldH);

    drawOrganicCircuit(currentScene, circuit);

    // Spawn Jugador en la salida
    const startPt = circuit.controlPoints[0];
    const car = CARS[selectedCarIndex];
    const carTextureKey = currentScene.textures.exists(car.texture) ? car.texture : `${car.texture}_vec`;

    // Jugador compacto (48x48 proporciones)
    player = currentScene.physics.add.sprite(startPt.x + 14, startPt.y, carTextureKey);
    player.setScale(0.19);
    player.setCollideWorldBounds(true);
    player.setDamping(true);
    player.setDrag(0.97);
    player.angle = 90;
    player.setDepth(15);

    // ✅ FAROS DINÁMICOS DEL COCHE
    playerHeadlights = currentScene.add.graphics().setDepth(14);

    // ✅ CAPAS PARALLAX SI EL CIRCUITO LO SOPORTA
    if (circuit.hasParallax) {
        // 1. Capa Parallax lejana: Montañas y horizonte (scrollFactor 0.32)
        const bgParallax = currentScene.add.graphics();
        bgParallax.fillStyle(0x131f18, 0.9);
        bgParallax.fillPoints([
            {x: 0, y: 300}, {x: 600, y: 120}, {x: 1200, y: 280},
            {x: 1800, y: 140}, {x: 2400, y: 260}, {x: 3000, y: 150},
            {x: 3000, y: 600}, {x: 0, y: 600}
        ], true);
        bgParallax.setScrollFactor(0.32).setDepth(1);

        // 2. Rayos de sol volumétricos (God Rays) a través del dosel
        const sunRays = currentScene.add.graphics();
        sunRays.fillStyle(0xfff7cc, 0.08);
        for (let rx = 100; rx < 3000; rx += 350) {
            sunRays.fillPoints([
                { x: rx, y: 0 }, { x: rx + 140, y: 0 },
                { x: rx + 380, y: 1800 }, { x: rx + 240, y: 1800 }
            ], true);
        }
        sunRays.setScrollFactor(0.42).setDepth(28).setBlendMode(Phaser.BlendModes.ADD);

        // 3. Sombras de nubes en deriva continua sobre el asfalto (scrollFactor 0.65)
        for (let ci = 0; ci < 6; ci++) {
            const cloudX = Phaser.Math.Between(200, 2600);
            const cloudY = Phaser.Math.Between(200, 1800);
            const cloudS = currentScene.add.circle(cloudX, cloudY, Phaser.Math.Between(180, 290), 0x000000, 0.12);
            cloudS.setScrollFactor(0.65).setDepth(3);
            currentScene.tweens.add({
                targets: cloudS,
                x: cloudX + 400,
                duration: Phaser.Math.Between(35000, 55000),
                repeat: -1
            });
        }

        // 4. Viñeta cinemática fija en pantalla
        vignetteOverlay = currentScene.add.graphics().setDepth(120).setScrollFactor(0);
        vignetteOverlay.lineStyle(24, 0x000000, 0.35);
        vignetteOverlay.strokeRect(0, 0, 960, 540);
    }

    // ✅ ACTIVAR CÁMARA DINÁMICA CON SEGUIMIENTO FLUIDO Y ZOOM
    if (circuit.isDynamicWorld) {
        currentScene.cameras.main.setBounds(0, 0, worldW, worldH);
        currentScene.cameras.main.startFollow(player, true, 0.08, 0.08);
        currentScene.cameras.main.setZoom(1.15);
    } else {
        currentScene.cameras.main.setBounds(0, 0, 960, 540);
        currentScene.cameras.main.stopFollow();
        currentScene.cameras.main.setScroll(0, 0);
        currentScene.cameras.main.setZoom(1);
    }

    // Spawn Rivales IA en sus respectivos carriles
    npcs = [];
    const npcTextures = ['car_cyan', 'car_neon', 'car_shadow'];
    const laneOffsets = [-40, -15, 38];

    for (let i = 0; i < 3; i++) {
        const texKey = currentScene.textures.exists(npcTextures[i]) ? npcTextures[i] : `${npcTextures[i]}_vec`;
        const npc = currentScene.physics.add.sprite(startPt.x + laneOffsets[i], startPt.y - (i + 1) * 35, texKey);
        npc.setScale(0.19);
        npc.angle = 90;
        npc.targetWaypoint = 1;
        npc.speedBonus = 260 + i * 25;
        npc.setCollideWorldBounds(true);
        npc.setDepth(15);
        npcs.push(npc);
    }

    currentScene.physics.add.collider(player, npcs);

    // Controles
    currentScene.cursors = currentScene.input.keyboard.createCursorKeys();
    currentScene.keyA = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    currentScene.keyD = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    currentScene.keyS = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    currentScene.keyW = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    currentScene.keySpace = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    currentScene.keyQ = currentScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    setupTouchControls();
    createHUD(currentScene);
}

function createHUD(scene) {
    const hud = scene.add.graphics();
    hud.fillStyle(0x0a0e17, 0.88);
    hud.fillRect(0, 0, 960, 38);
    hud.setDepth(100);
    hud.setScrollFactor(0); // Fijo en pantalla mientras el mundo se desplaza

    hudPosText = scene.add.text(20, 10, 'POSICIÓN: 1/4', { font: 'bold 14px Arial', fill: '#00ffcc' }).setDepth(101).setScrollFactor(0);
    hudLapText = scene.add.text(220, 10, `VUELTA: 1/${TOTAL_LAPS}`, { font: 'bold 14px Arial', fill: '#ffffff' }).setDepth(101).setScrollFactor(0);
    hudTurboText = scene.add.text(420, 10, `⚡ TURBO: ${playerStats.turboCharges}`, { font: 'bold 14px Arial', fill: '#ffcc00' }).setDepth(101).setScrollFactor(0);
    hudSpeedText = scene.add.text(620, 10, '0 KM/H', { font: 'bold 15px Arial', fill: '#00ff55' }).setDepth(101).setScrollFactor(0);

    minimapGraphics = scene.add.graphics().setDepth(101).setScrollFactor(0);
}

function updateMinimap() {
    if (!minimapGraphics || !smoothTrackPoints || smoothTrackPoints.length === 0) return;
    const circuit = CircuitsCatalog[currentTrackIndex];
    const worldW = circuit.worldWidth || 960;
    const worldH = circuit.worldHeight || 540;

    const mapX = 835, mapY = 8, mapW = 110, mapH = 75;
    minimapGraphics.clear();
    minimapGraphics.fillStyle(0x0a101d, 0.85);
    minimapGraphics.fillRoundedRect(mapX, mapY, mapW, mapH, 6);
    minimapGraphics.lineStyle(1, 0x00ffcc, 0.8);
    minimapGraphics.strokeRoundedRect(mapX, mapY, mapW, mapH, 6);

    const scaleX = (mapW - 16) / worldW;
    const scaleY = (mapH - 16) / worldH;

    minimapGraphics.lineStyle(2, 0xffffff, 0.6);
    for (let i = 0; i < smoothTrackPoints.length; i += 4) {
        const pt = smoothTrackPoints[i];
        const mx = mapX + 8 + pt.x * scaleX;
        const my = mapY + 8 + pt.y * scaleY;
        if (i === 0) minimapGraphics.moveTo(mx, my);
        else minimapGraphics.lineTo(mx, my);
    }
    minimapGraphics.strokePath();

    if (player) {
        minimapGraphics.fillStyle(0x00ff55, 1);
        minimapGraphics.fillCircle(mapX + 8 + player.x * scaleX, mapY + 8 + player.y * scaleY, 3);
    }

    npcs.forEach(npc => {
        if (npc && npc.active) {
            minimapGraphics.fillStyle(0xff3333, 1);
            minimapGraphics.fillCircle(mapX + 8 + npc.x * scaleX, mapY + 8 + npc.y * scaleY, 2.5);
        }
    });
}

function setupTouchControls() {
    if (touchInitialized) return;
    touchInitialized = true;

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

    const btnTurbo = document.getElementById('btn-turbo');
    if (btnTurbo) {
        btnTurbo.onclick = () => {
            if (playerStats.turboCharges > 0) {
                playerStats.turboCharges--;
                playerStats.speed *= 1.35;
                if (hudTurboText) hudTurboText.setText(`⚡ TURBO: ${playerStats.turboCharges}`);
                audioSynth.playTurbo();
                spawnTurboBurst(currentScene, player.x, player.y, player.angle);
            }
        };
    }
}
