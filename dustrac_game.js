// ===== DUST RACING 2D: MODERN TELEGRAM MINIAPP EDITION =====
// Adaptación completa y oficial de Dust Racing 2D (Dustrac) para Telegram Mini App.
// Utiliza los assets originales oficiales (.png limpios con canal alfa), niveles reales (.trk)
// y añade mejoras gráficas modernas: sombras ambientales suaves, partículas de humo/chispas,
// marcas de goma permanentes, iluminación de faros dinámicos, minimapa radar e IA de 6 coches.

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// ===== SINTETIZADOR DE AUDIO GT3 MULTI-CAPA MODERNO =====
class DustAudio {
    constructor() {
        this.ctx = null;
        this.isReady = false;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.subOsc = null;
        this.noiseNode = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.distortion = null;
        this.driftNoise = null;
        this.driftFilter = null;
        this.driftGain = null;
        this.gearRatios = [0.18, 0.38, 0.58, 0.78, 1.0];
        this.lastGear = 1;
    }

    init() {
        if (this.isReady) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            // 1. Motor Oscilador Primario V8 / Bóxer (Sawtooth)
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(54, this.ctx.currentTime);

            // 2. Armónicos de escape (Triangle con armónicos pares)
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(108, this.ctx.currentTime);

            // 3. Sub-bajos de escape (Sine profundo a 27 Hz)
            this.subOsc = this.ctx.createOscillator();
            this.subOsc.type = 'sine';
            this.subOsc.frequency.setValueAtTime(27, this.ctx.currentTime);

            // 4. Generador de ruido de combustión (buffer de ruido filtrado)
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.18;
            }
            this.noiseNode = this.ctx.createBufferSource();
            this.noiseNode.buffer = noiseBuffer;
            this.noiseNode.loop = true;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
            noiseFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

            this.noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);

            // 5. Filtro dinámico de motor y saturación suave
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
            this.engineFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

            this.distortion = this.ctx.createWaveShaper();
            this.distortion.curve = this.makeDistortionCurve(16);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.052, this.ctx.currentTime);

            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.subOsc.connect(this.engineFilter);
            noiseGain.connect(this.engineFilter);

            this.engineFilter.connect(this.distortion);
            this.distortion.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();
            this.subOsc.start();
            this.noiseNode.start();

            // 6. Neumáticos : generador continuo de chirrido realista (ruido filtrado)
            const dBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const dData = dBuf.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                dData[i] = (Math.random() * 2 - 1) * 0.25;
            }
            this.driftNoise = this.ctx.createBufferSource();
            this.driftNoise.buffer = dBuf;
            this.driftNoise.loop = true;

            this.driftFilter = this.ctx.createBiquadFilter();
            this.driftFilter.type = 'bandpass';
            this.driftFilter.frequency.setValueAtTime(1150, this.ctx.currentTime);
            this.driftFilter.Q.setValueAtTime(3.8, this.ctx.currentTime);

            this.driftGain = this.ctx.createGain();
            this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.driftNoise.connect(this.driftFilter);
            this.driftFilter.connect(this.driftGain);
            this.driftGain.connect(this.ctx.destination);
            this.driftNoise.start();

            this.isReady = true;
        } catch (e) {
            console.log('Audio esperando interacción del usuario');
        }
    }

    makeDistortionCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineOsc1) return;
        const now = this.ctx.currentTime;
        const ratio = Math.max(0, Math.min(1, Math.abs(speed) / maxSpeed));

        // Marchas automáticas (1ª a 5ª)
        let gear = 1;
        let gRatio = ratio / this.gearRatios[0];
        for (let g = 0; g < this.gearRatios.length; g++) {
            if (ratio <= this.gearRatios[g] || g === this.gearRatios.length - 1) {
                const prev = g === 0 ? 0 : this.gearRatios[g - 1];
                gRatio = (ratio - prev) / (this.gearRatios[g] - prev);
                gear = g + 1;
                break;
            }
        }

        // Petardeo de escape al subir de marcha
        if (gear !== this.lastGear && ratio > 0.20) {
            this.playBackfire();
            if (typeof spawnBackfireFlame === 'function' && typeof raceScene !== 'undefined' && playerCar) {
                spawnBackfireFlame(raceScene, playerCar);
            }
            this.lastGear = gear;
        }

        const baseFreq = 52;
        const targetFreq = baseFreq + gRatio * 165;
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.04);
        this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

        const filterFreq = 380 + ratio * 1350;
        this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

        const gainVal = 0.040 + ratio * 0.035;
        this.engineGain.gain.setTargetAtTime(gainVal, now, 0.06);
    }

    setDriftVolume(intensity) {
        if (!this.ctx || !this.driftGain) return;
        const clamped = Math.max(0, Math.min(1, intensity));
        this.driftGain.gain.setTargetAtTime(clamped * 0.045, this.ctx.currentTime, 0.03);
        if (clamped > 0.1) {
            this.driftFilter.frequency.setTargetAtTime(950 + clamped * 350, this.ctx.currentTime, 0.03);
        }
    }

    playBackfire() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playDrift() {
        this.setDriftVolume(0.8);
    }

    playKerb() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.setValueAtTime(130, now + 0.03);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    playSand() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playCrash() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.16);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playLap() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(784, now + 0.16);
        osc.frequency.setValueAtTime(1046, now + 0.24);
        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    playCountdown(isGo) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.15));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.35 : 0.15));
    }
}
const dustAudio = new DustAudio();

// ===== CONFIGURACIÓN DEL JUEGO =====
const CONFIG = {
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
    scene: { preload: dustPreload, create: dustCreate, update: dustUpdate }
};

const game = new Phaser.Game(CONFIG);

// Catálogo de coches con nombres 100% libres de derechos y diseño motorsport GT3
const DUST_CARS = [
    { id: 'car_red', texture: 'car_red', name: 'CORSA ROSSO 48', subtitle: 'V8 Twin-Turbo • Scuderia Italia', speed: 470, accel: 390, handling: 4.8 },
    { id: 'car_blue', texture: 'car_blue', name: 'VALKYRIE VANTAGE R', subtitle: 'V12 Aero • Apex British Works', speed: 460, accel: 400, handling: 5.0 },
    { id: 'car_yellow', texture: 'car_yellow', name: 'STUTTGART 91-BOXER', subtitle: 'Flat-6 Boxer • Horst Precision', speed: 490, accel: 420, handling: 4.6 },
    { id: 'car_green', texture: 'car_green', name: 'BAVARIA M4 BEAST', subtitle: 'TwinPower L6 • Munich Speed', speed: 450, accel: 410, handling: 5.4 },
    { id: 'car_cyan', texture: 'car_cyan', name: 'HYPERION 72-AERO', subtitle: 'Carbon Cyber • Aerotech Works', speed: 480, accel: 380, handling: 4.9 },
    { id: 'car_orange', texture: 'car_orange', name: 'SOLARIS DAME GT', subtitle: 'Endurance Pro • Solaris Racing', speed: 475, accel: 395, handling: 4.7 }
];

// Configuración completa del MODO HISTORIA (5 Capítulos • 22 Circuitos)
const STORY_CHAPTERS = [
    {
        id: 'cap_1',
        number: 1,
        title: 'CAP. 1: COPA ROOKIE',
        fullName: '🏆 CAPÍTULO 1: COPA ROOKIE REGIONAL',
        subtitle: 'Iniciación en pistas técnicas y óvalos rápidos',
        rival: 'Alex "Rookie" Stone (Valkyrie Vantage)',
        briefing: 'Bienvenido al campeonato. Domina las trazadas y los pianos para dar el salto.',
        tracks: [
            { id: 'rookie_ring', name: 'Rookie Ring Speedway', desc: 'Circuito peraltado con arboleda', laps: 3, tod: 'day' },
            { id: 'radiator_oval', name: 'Radiator Oval Park', desc: 'Óvalo con chicanes de potencia', laps: 3, tod: 'day' },
            { id: 'tri_apex_coliseum', name: 'Tri-Apex Coliseum', desc: 'Tri-óvalo con vértices de 90°', laps: 3, tod: 'sunset' },
            { id: 'twister_chicanes', name: 'Twister S-Chicanes', desc: 'Eses cerradas y escapatorias', laps: 3, tod: 'day' }
        ]
    },
    {
        id: 'cap_2',
        number: 2,
        title: 'CAP. 2: TROFEO CLUBMAN',
        fullName: '🏆 CAPÍTULO 2: TROFEO NACIONAL CLUBMAN',
        subtitle: 'Pistas con cruces a dos niveles, puentes y bosques',
        rival: 'Marcus Vance (Bavaria M4 Beast)',
        briefing: 'El asfalto es más estrecho y los pasos elevados exigen máxima concentración.',
        tracks: [
            { id: 'red_rock_junction', name: 'Red Rock Junction', desc: 'Cruce a dos niveles con puente', laps: 3, tod: 'day' },
            { id: 'curvastone_park', name: 'Curvastone Parkway', desc: 'Parque británico con curvas fluidas', laps: 3, tod: 'sunset' },
            { id: 'schwarzwald_sprint', name: 'Schwarzwald Forest', desc: 'Bosque rápido alemán de alta carga', laps: 3, tod: 'day' },
            { id: 'overpass_figure8', name: 'Overpass Figure-8', desc: 'Figura en 8 con paso elevado', laps: 3, tod: 'night' }
        ]
    },
    {
        id: 'cap_3',
        number: 3,
        title: 'CAP. 3: DESAFÍO DESIERTO',
        fullName: '🏆 CAPÍTULO 3: DESAFÍO DE LA FRONTERA & DESIERTO',
        subtitle: 'Condiciones extremas, arena abrasiva y resistencia',
        rival: 'Elena "Mirage" Rostova (Hyperion 72-Aero)',
        briefing: 'El calor del cañón castiga los frenos. Evita a toda costa la arena suelta.',
        tracks: [
            { id: 'desert_canyon', name: 'Desert Canyon Ridge', desc: 'Desfiladero entre cañones de roca', laps: 3, tod: 'day' },
            { id: 'sandstorm_dunes', name: 'Sandstorm Dunes', desc: 'Pista desértica con escapatorias', laps: 3, tod: 'sunset' },
            { id: 'badlands_endurance', name: 'Badlands Mega-Endurance', desc: 'Circuito colosal de gran distancia', laps: 2, tod: 'sunset' },
            { id: 'infinity_loops', name: 'Infinity Twin-Loops', desc: 'Doble bucle simétrico de precisión', laps: 3, tod: 'day' }
        ]
    },
    {
        id: 'cap_4',
        number: 4,
        title: 'CAP. 4: CAMPEONATO PRO',
        fullName: '🏆 CAPÍTULO 4: CAMPEONATO PRO CONTINENTAL',
        subtitle: 'Templos de velocidad punta y aerodinámica pura',
        rival: 'Viktor "The Wall" Sterling (Stuttgart 91-B)',
        briefing: 'Aquí corren los campeones. Rectas a más de 300 km/h y frenadas límite.',
        tracks: [
            { id: 'brianza_speedway', name: 'Autodromo Brianza', desc: 'El templo legendario de la velocidad', laps: 3, tod: 'day' },
            { id: 'sakura_ring', name: 'Sakura Twin-Ring', desc: 'Curvas en 8 enlazadas y puente overpass', laps: 3, tod: 'day' },
            { id: 'diamond_apex', name: 'Diamond Apex Ring', desc: 'Trazado geométrico en diamante', laps: 3, tod: 'sunset' },
            { id: 'super_dragway', name: 'Super-Straight Dragway', desc: 'Recta infinita y frenadas extremas', laps: 3, tod: 'night' }
        ]
    },
    {
        id: 'cap_5',
        number: 5,
        title: 'CAP. 5: LEYENDAS MUNDIAL',
        fullName: '🏆 CAPÍTULO 5: GRAN FINAL MUNDIAL DE LEYENDAS',
        subtitle: 'Los 6 circuitos definitivos del automovilismo mundial',
        rival: 'Max "Apex God" Kincaid (Corsa Rosso 48)',
        briefing: 'La consagración definitiva. Circuitos míticos donde nacen las leyendas.',
        tracks: [
            { id: 'riviera_coast', name: 'Riviera Monaco Harbor', desc: 'Circuito urbano costero con chicanes', laps: 3, tod: 'day' },
            { id: 'nordkette_pass', name: 'Nordkette Alpine Pass', desc: 'Paso de montaña alpino con horquillas', laps: 3, tod: 'sunset' },
            { id: 'silverstone_airfield', name: 'Aerodrome Apex GP', desc: 'Antiguo aeródromo de alta velocidad', laps: 3, tod: 'day' },
            { id: 'neo_tokyo_bay', name: 'Neo-Tokyo Bay Ring', desc: 'Bahía nocturna iluminada con xenón', laps: 3, tod: 'night' },
            { id: 'inter_laguna', name: 'Inter-Laguna Bowl', desc: 'Autódromo tropical con peraltes', laps: 3, tod: 'day' },
            { id: 'sarthe_endurance', name: 'Sarthe 24H Speedway', desc: 'Mítica recta Mulsanne y resistencia', laps: 2, tod: 'night' }
        ]
    }
];

// Catálogo completo de los 22 circuitos para el Modo Diseñador
const ALL_TRACK_IDS = [
    'rookie_ring', 'radiator_oval', 'tri_apex_coliseum', 'twister_chicanes',
    'red_rock_junction', 'curvastone_park', 'schwarzwald_sprint', 'overpass_figure8',
    'desert_canyon', 'sandstorm_dunes', 'badlands_endurance', 'infinity_loops',
    'brianza_speedway', 'sakura_ring', 'diamond_apex', 'super_dragway',
    'riviera_coast', 'nordkette_pass', 'silverstone_airfield', 'neo_tokyo_bay', 'inter_laguna', 'sarthe_endurance'
];

// Gestión de guardado del Modo Historia en LocalStorage con Modo Diseñador
function loadStoryProgress() {
    let data = null;
    try {
        const raw = localStorage.getItem('dustrac_story_save');
        if (raw) data = JSON.parse(raw);
    } catch(e) {}

    if (!data) {
        data = {
            designerMode: true, // Activado por defecto para el diseñador del juego
            unlockedTracks: [...ALL_TRACK_IDS],
            stars: {},
            bestRanks: {},
            bestTimes: {}
        };
    } else {
        // Si el modo diseñador está activado, asegurar acceso a los 22 circuitos
        if (data.designerMode !== false) {
            data.designerMode = true;
            data.unlockedTracks = [...ALL_TRACK_IDS];
        }
    }
    return data;
}

function saveStoryProgress(data) {
    try {
        localStorage.setItem('dustrac_story_save', JSON.stringify(data));
    } catch(e) {}
}

let currentTrackId = 'rookie_ring';
let selectedCarIndex = 0;
let selectedTimeOfDay = 'day'; // 'day' | 'sunset' | 'night'
let gameState = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'RACE' | 'FINISHED'
let menuMode = 'STORY'; // 'STORY' | 'ARCADE'
let currentChapterIndex = 0;
let arcadeCategoryIndex = 0;
let arcadePage = 0;
let isCurrentRaceStory = true;
let offTrackTimer = 0;
let lastCrashSoundTime = 0;

let raceScene;
let playerCar;
let aiCars = [];
let playerSpeed = 0;
let playerLap = 1;
let TOTAL_LAPS = 3;
let playerNextNodeIdx = 0;
let lapStartTime = 0;
let bestLapTime = null;

let skidLayer;
let radarGraphics;
let hudPosText, hudLapText, hudTimeText, hudSpeedText, hudSurfaceText;

// Controles táctiles y teclado
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false;

// ===== PRELOAD: CARGA DE ASSETS ORIGINALES DE DUSTRACING2D =====
function dustPreload() {
    const p = 'assets/dustrac_clean/';

    // Terreno y Pista
    this.load.image('dt_grass', p + 'grass.png');
    this.load.image('dt_sand', p + 'sand.png');
    this.load.image('dt_sandGrassStraight', p + 'sandGrassStraight.png');
    this.load.image('dt_sandGrassCorner', p + 'sandGrassCorner.png');
    this.load.image('dt_sandGrassCorner2', p + 'sandGrassCorner2.png');
    this.load.image('dt_straight', p + 'straight.png');
    this.load.image('dt_corner90', p + 'corner.png');
    this.load.image('dt_corner45Left', p + 'corner45Left.png');
    this.load.image('dt_corner45Right', p + 'corner45Right.png');
    this.load.image('dt_straight45Male', p + 'straight45Male.png');
    this.load.image('dt_straight45Female', p + 'straight45Female.png');
    this.load.image('dt_finish', p + 'finish.png');

    // Objetos de Decoración y Entorno
    this.load.image('dt_tree', p + 'tree.png');
    this.load.image('dt_tire', p + 'tire.png');
    this.load.image('dt_grandstand', p + 'grandstand.png');
    this.load.image('dt_rock', p + 'rock.png');
    this.load.image('dt_bushArea', p + 'bushArea.png');
    this.load.image('dt_pit', p + 'pit.png');
    this.load.image('dt_skid', p + 'skid.png');
    this.load.image('dt_smoke', p + 'smoke.png');
    this.load.image('dt_sparkle', p + 'sparkle.png');
    this.load.image('dt_startLightOn', p + 'startLightOn.png');
    this.load.image('dt_startLightOff', p + 'startLightOff.png');

    // Coches GT3 fotorrealistas (hoja de sprites nueva)
    this.load.image('gt_cars_sheet', 'assets/real_gt_cars.jpg');

    // Assets HD de Entorno y Escenario
    this.load.image('hd_grass_src', 'assets/dust_hd/hd_grass.jpg');
    this.load.image('hd_sand_src', 'assets/dust_hd/hd_sand.jpg');
    this.load.image('hd_tree_src', 'assets/dust_hd/hd_tree.jpg');
    this.load.image('hd_grandstand_src', 'assets/dust_hd/hd_grandstand.jpg');
    this.load.image('hd_tire_src', 'assets/dust_hd/hd_tire.jpg');
    this.load.image('hd_rock_src', 'assets/dust_hd/hd_rock.jpg');
    this.load.image('hd_bush_src', 'assets/dust_hd/hd_bush.jpg');
}

// Recorta los 6 GT3 de la hoja, quita el fondo negro, recorta al contorno
// y los voltea para que el morro apunte a la derecha (convención de Dust Racing).
// Genera las texturas con las mismas claves que usaba el juego (car_red, car_blue...).
function buildGT3CarTextures(scene) {
    const src = scene.textures.get('gt_cars_sheet').getSourceImage();
    const cellW = 500, cellH = 330;
    const cells = [
        { key: 'car_yellow', c: 0, r: 0 }, // Manthey Porsche 911 GT3 Grello
        { key: 'car_red',    c: 1, r: 0 }, // Ferrari 488 GT3
        { key: 'car_blue',   c: 0, r: 1 }, // Aston Martin Vantage Valvoline
        { key: 'car_green',  c: 1, r: 1 }, // BMW M4 GT3 Rowe
        { key: 'car_orange', c: 0, r: 2 }, // Iron Dames GT3
        { key: 'car_cyan',   c: 1, r: 2 }  // McLaren 720S Gulf
    ];
    const rowY = [20, 350, 690];

    cells.forEach(cell => {
        const sx = cell.c * 512 + 6;
        const sy = rowY[cell.r];
        const w = Math.min(cellW, src.width - sx);
        const h = Math.min(cellH, src.height - sy);

        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);

        const img = tctx.getImageData(0, 0, w, h);
        const d = img.data;
        const lumAt = (p) => Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
        // Flood-fill desde los bordes: solo se borra el fondo/sombra oscura conectada al exterior,
        // así las partes negras del propio coche (cristales, libreas negras) no se agujerean.
        const BG = 42;
        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
        for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
        while (stack.length) {
            const p = stack.pop();
            if (seen[p]) continue;
            seen[p] = 1;
            if (lumAt(p) >= BG) continue;
            d[p * 4 + 3] = 0;
            const x = p % w, y = (p / w) | 0;
            if (x > 0) stack.push(p - 1);
            if (x < w - 1) stack.push(p + 1);
            if (y > 0) stack.push(p - w);
            if (y < h - 1) stack.push(p + w);
        }
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (d[(y * w + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        tctx.putImageData(img, 0, 0);

        const bw = Math.max(1, maxX - minX + 1);
        const bh = Math.max(1, maxY - minY + 1);
        const out = document.createElement('canvas');
        out.width = bw; out.height = bh;
        const octx = out.getContext('2d');
        // Volteo horizontal: en la hoja el morro mira a la izquierda
        octx.translate(bw, 0);
        octx.scale(-1, 1);
        octx.drawImage(tmp, minX, minY, bw, bh, 0, 0, bw, bh);

        if (scene.textures.exists(cell.key)) scene.textures.remove(cell.key);
        scene.textures.addCanvas(cell.key, out);
    });
}

// Genera texturas HD fotorrealistas de césped, grava y objetos ambientales con sombras
function buildHDEnvironmentTextures(scene) {
    // 1. Césped HD Fotorrealista (Mowed Lawn)
    if (scene.textures.exists('hd_grass_src')) {
        const src = scene.textures.get('hd_grass_src').getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0, 512, 512);
        if (scene.textures.exists('dt_grass')) scene.textures.remove('dt_grass');
        scene.textures.addCanvas('dt_grass', canvas);
    }

    // 2. Gravilla / Arena HD de Escapatoria (Gravel Runoff)
    if (scene.textures.exists('hd_sand_src')) {
        const src = scene.textures.get('hd_sand_src').getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(src, 0, 0, 512, 512);
        if (scene.textures.exists('dt_sand')) scene.textures.remove('dt_sand');
        scene.textures.addCanvas('dt_sand', canvas);
    }

    // 3. Limpiador de fondo blanco con preservación de sombra realista
    const cleanWhiteBg = (srcImg, targetKey, whiteThresh = 240, shadowFactor = 0.5) => {
        const w = srcImg.width;
        const h = srcImg.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(srcImg, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
        for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }

        while (stack.length) {
            const p = stack.pop();
            if (seen[p]) continue;
            seen[p] = 1;
            const r = d[p*4], g = d[p*4+1], b = d[p*4+2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);

            if (maxC > 230 && (maxC - minC < 30)) {
                d[p*4+3] = 0; // Fondo blanco eliminado
                const x = p % w, y = (p / w) | 0;
                if (x > 0) stack.push(p - 1);
                if (x < w - 1) stack.push(p + 1);
                if (y > 0) stack.push(p - w);
                if (y < h - 1) stack.push(p + w);
            } else if (maxC > 140 && (maxC - minC < 30)) {
                // Sombra suave proyectada -> convertir a sombra alfa
                const shadowStrength = 1.0 - (maxC / 255);
                d[p*4] = 8;
                d[p*4+1] = 12;
                d[p*4+2] = 18;
                d[p*4+3] = Math.round(shadowStrength * 200 * shadowFactor);
            }
        }

        ctx.putImageData(imgData, 0, 0);
        if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
        scene.textures.addCanvas(targetKey, canvas);
    };

    if (scene.textures.exists('hd_tree_src')) {
        cleanWhiteBg(scene.textures.get('hd_tree_src').getSourceImage(), 'dt_tree', 242, 0.45);
    }
    if (scene.textures.exists('hd_grandstand_src')) {
        cleanWhiteBg(scene.textures.get('hd_grandstand_src').getSourceImage(), 'dt_grandstand', 238, 0.55);
    }
    if (scene.textures.exists('hd_tire_src')) {
        cleanWhiteBg(scene.textures.get('hd_tire_src').getSourceImage(), 'dt_tire', 240, 0.50);
    }
    if (scene.textures.exists('hd_rock_src')) {
        cleanWhiteBg(scene.textures.get('hd_rock_src').getSourceImage(), 'dt_rock', 242, 0.45);
    }
    if (scene.textures.exists('hd_bush_src')) {
        cleanWhiteBg(scene.textures.get('hd_bush_src').getSourceImage(), 'dt_bushArea', 240, 0.40);
    }
}

// Remasteriza las piezas de asfalto y pianos de Dust Racing 2D con textura moderna
function buildHDRoadTextures(scene) {
    const roadTiles = [
        'dt_straight',
        'dt_corner90',
        'dt_corner45Left',
        'dt_corner45Right',
        'dt_straight45Male',
        'dt_straight45Female',
        'dt_finish'
    ];

    roadTiles.forEach(tileKey => {
        if (!scene.textures.exists(tileKey)) return;
        const orig = scene.textures.get(tileKey).getSourceImage();
        const w = orig.width;
        const h = orig.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(orig, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const a = d[i+3];
                if (a === 0) continue;

                const r = d[i], g = d[i+1], b = d[i+2];

                // Pianos rojos FIA con relieve 3D
                if (r > 150 && g < 90 && b < 90) {
                    const bevel = ((x + y) % 8 < 4) ? 22 : -22;
                    d[i] = Math.max(0, Math.min(255, 220 + bevel));
                    d[i+1] = Math.max(0, Math.min(255, 28 + bevel));
                    d[i+2] = Math.max(0, Math.min(255, 42 + bevel));
                }
                // Pianos blancos con relieve
                else if (r > 190 && g > 190 && b > 190) {
                    const bevel = ((x + y) % 8 < 4) ? 14 : -14;
                    d[i] = Math.max(0, Math.min(255, 245 + bevel));
                    d[i+1] = Math.max(0, Math.min(255, 248 + bevel));
                    d[i+2] = Math.max(0, Math.min(255, 252 + bevel));
                }
                // Asfalto moderno con textura de áridos y trazada engomada
                else if (Math.abs(r - g) < 22 && Math.abs(g - b) < 22) {
                    const noise = ((Math.random() - 0.5) * 14) | 0;
                    const centerFactor = Math.sin((x / w) * Math.PI) * Math.sin((y / h) * Math.PI);
                    const rubberTireDarken = Math.round(centerFactor * 16);

                    d[i] = Math.max(12, 36 + noise - rubberTireDarken);
                    d[i+1] = Math.max(14, 40 + noise - rubberTireDarken);
                    d[i+2] = Math.max(18, 48 + noise - rubberTireDarken);
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        scene.textures.remove(tileKey);
        scene.textures.addCanvas(tileKey, canvas);
    });
}

// Generar textura procedural fotorrealista para el tablero del puente elevado
function buildHDBridgeTextures(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Limpiar canvas para que las zonas fuera del tablero del puente sean 100% transparentes
    ctx.clearRect(0, 0, 256, 256);

    // 1. Asfalto de la calzada superior del puente (y: 44 a 212)
    ctx.fillStyle = '#1c2128';
    ctx.fillRect(0, 44, 256, 168);

    // Grano de asfalto fino y árido denso
    const imgData = ctx.getImageData(0, 44, 256, 168);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const noise = ((Math.random() - 0.5) * 14) | 0;
        d[i] = Math.max(12, Math.min(60, d[i] + noise));
        d[i+1] = Math.max(14, Math.min(65, d[i+1] + noise));
        d[i+2] = Math.max(18, Math.min(75, d[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 44);

    // 2. Líneas de goma y trazada central engomada
    const grad = ctx.createLinearGradient(0, 60, 0, 196);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.25, 'rgba(10,12,18,0.45)');
    grad.addColorStop(0.5, 'rgba(5,7,12,0.65)');
    grad.addColorStop(0.75, 'rgba(10,12,18,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 60, 256, 136);

    // 3. Pintura vial: Líneas de borde continuo amarillas y línea discontinua central
    ctx.fillStyle = '#f59e0b'; // Amarillo FIA
    ctx.fillRect(0, 48, 256, 3);
    ctx.fillRect(0, 205, 256, 3);

    // Línea discontinua blanca central
    ctx.fillStyle = '#f8fafc';
    for (let x = 8; x < 256; x += 32) {
        ctx.fillRect(x, 126, 18, 4);
    }

    // 4. Pianos / Rumble Strips FIA en los bordes de la calzada (rojo y blanco con relieve)
    for (let x = 0; x < 256; x += 16) {
        const isRed = (x / 16) % 2 === 0;
        // Piano superior
        ctx.fillStyle = isRed ? '#dc2626' : '#ffffff';
        ctx.fillRect(x, 38, 16, 8);
        ctx.fillStyle = isRed ? '#991b1b' : '#cbd5e1'; // Relieve inferior del piano
        ctx.fillRect(x, 44, 16, 2);

        // Piano inferior
        ctx.fillStyle = isRed ? '#dc2626' : '#ffffff';
        ctx.fillRect(x, 210, 16, 8);
        ctx.fillStyle = isRed ? '#991b1b' : '#cbd5e1';
        ctx.fillRect(x, 210, 16, 2);
    }

    // 5. Juntas de dilatación metálicas dentadas (Finger expansion joints) en los estribos
    // Extremo izquierdo y derecho del puente
    [0, 246].forEach(jx => {
        ctx.fillStyle = '#0f172a'; // Hueco profundo de separación
        ctx.fillRect(jx, 36, 10, 184);

        ctx.fillStyle = '#475569'; // Peine de acero
        ctx.fillRect(jx + 1, 38, 8, 180);

        ctx.fillStyle = '#94a3b8'; // Dientes metálicos entrelazados
        for (let y = 40; y < 216; y += 10) {
            ctx.fillRect(jx + 2, y, 6, 5);
        }
    });

    // 6. Vigas maestras de acero de soporte lateral (Vigas I de perfil arquitectónico)
    // Viga Superior
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 28, 256, 10);
    ctx.fillStyle = '#64748b'; // Bisel metálico superior con reflejo
    ctx.fillRect(0, 28, 256, 2);
    ctx.fillStyle = '#090d16'; // Sombra inferior de la viga
    ctx.fillRect(0, 36, 256, 2);

    // Viga Inferior
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 218, 256, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 218, 256, 2);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 226, 256, 2);

    // Remaches de acero estructurales en las vigas
    ctx.fillStyle = '#cbd5e1';
    for (let x = 12; x < 252; x += 16) {
        ctx.beginPath(); ctx.arc(x, 33, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, 223, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // 7. Quitamiendos y Barandilla FIA con franjas de advertencia amarillo/negro
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 22, 256, 6);
    ctx.fillRect(0, 228, 256, 6);

    for (let x = 0; x < 256; x += 24) {
        ctx.fillStyle = '#eab308'; // Amarillo chevron
        ctx.fillRect(x, 22, 12, 6);
        ctx.fillRect(x, 228, 12, 6);
        ctx.fillStyle = '#18181b'; // Negro
        ctx.fillRect(x + 12, 22, 12, 6);
        ctx.fillRect(x + 12, 228, 12, 6);
    }

    // Pasamanos superior cromado
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 21, 256, 1.5);
    ctx.fillRect(0, 233.5, 256, 1.5);

    if (scene.textures.exists('dt_bridge_deck')) scene.textures.remove('dt_bridge_deck');
    scene.textures.addCanvas('dt_bridge_deck', canvas);
}

function dustCreate() {
    raceScene = this;
    buildGT3CarTextures(this);
    buildHDEnvironmentTextures(this);
    buildHDRoadTextures(this);
    buildHDBridgeTextures(this);

    // Configuración de Teclado
    keys = this.input.keyboard.addKeys({
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

    setupTouchControls();
    showMenu(this);
}

// Configurar botones táctiles en móviles
function setupTouchControls() {
    const bindTouch = (id, onDown, onUp) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); dustAudio.init(); onDown(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); dustAudio.init(); onDown(); });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    };

    bindTouch('btn-left', () => touchLeft = true, () => touchLeft = false);
    bindTouch('btn-right', () => touchRight = true, () => touchRight = false);
    bindTouch('btn-accel', () => touchGas = true, () => touchGas = false);
    bindTouch('btn-brake', () => touchBrake = true, () => touchBrake = false);
}

// ===== MENÚ PRINCIPAL: MODO HISTORIA Y CARRERA LIBRE =====
function showMenu(scene) {
    gameState = 'MENU';
    scene.children.removeAll();

    // Fondo elegante estilo juego de carreras retro-moderno
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0c14, 1);
    bg.fillRect(0, 0, 960, 540);

    // Patrón decorativo de cuadros
    bg.fillStyle(0x121624, 0.45);
    for (let x = 0; x < 960; x += 40) {
        for (let y = 0; y < 540; y += 40) {
            if ((x / 40 + y / 40) % 2 === 0) bg.fillRect(x, y, 40, 40);
        }
    }

    const progress = loadStoryProgress();
    const isDesigner = progress.designerMode !== false;

    // Botón volver al Hub Principal Web3
    const hubBox = scene.add.graphics();
    hubBox.fillStyle(0x0f172a, 0.95);
    hubBox.fillRoundedRect(14, 12, 136, 28, 6);
    hubBox.lineStyle(1.5, 0x00f5d4, 1);
    hubBox.strokeRoundedRect(14, 12, 136, 28, 6);

    const hubBtn = scene.add.text(82, 26, '🏠 HUB PRINCIPAL', {
        font: 'bold 11px Arial',
        fill: '#00f5d4'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    hubBtn.on('pointerdown', () => {
        dustAudio.init();
        if (window.returnToGameHub) window.returnToGameHub();
    });

    // Cabecera Principal
    scene.add.text(420, 22, '🏁 DUST RACING 2D: APEX MOTORSPORT 🏁', {
        font: '900 22px Arial',
        fill: '#ffffff',
        stroke: '#e53935',
        strokeThickness: 5
    }).setOrigin(0.5);

    scene.add.text(420, 43, 'MODO HISTORIA • 5 CAMPEONATOS • 22 CIRCUITOS • VEHÍCULOS GT3', {
        font: 'bold 11px Arial',
        fill: '#00f5d4',
        letterSpacing: 2
    }).setOrigin(0.5);

    // Botón de Alternancia: Modo Diseñador (22 pistas abiertas) vs Modo Jugador (progresivo)
    const desBox = scene.add.graphics();
    desBox.fillStyle(isDesigner ? 0xf59e0b : 0x1f2937, 0.95);
    desBox.fillRoundedRect(722, 12, 226, 28, 6);
    desBox.lineStyle(1.5, isDesigner ? 0xffffff : 0x6b7280, 1);
    desBox.strokeRoundedRect(722, 12, 226, 28, 6);

    const desBtn = scene.add.text(835, 26, isDesigner ? '🛠️ DISEÑADOR: 22 PISTAS ON' : '🎮 JUGADOR: BLOQUEO ON', {
        font: 'bold 10px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    desBtn.on('pointerdown', () => {
        dustAudio.init();
        progress.designerMode = !isDesigner;
        if (progress.designerMode) {
            progress.unlockedTracks = [...ALL_TRACK_IDS];
        } else {
            // Modo jugador: solo la primera pista o las ganadas con estrellas
            const unlocked = ['rookie_ring'];
            STORY_CHAPTERS.forEach(ch => {
                for (let i = 0; i < ch.tracks.length - 1; i++) {
                    const currentId = ch.tracks[i].id;
                    const nextId = ch.tracks[i + 1].id;
                    if ((progress.stars[currentId] || 0) >= 1) {
                        if (!unlocked.includes(nextId)) unlocked.push(nextId);
                    }
                }
            });
            progress.unlockedTracks = unlocked;
        }
        saveStoryProgress(progress);
        showMenu(scene);
    });

    // Selector de Modo Principal: [ 🏆 MODO HISTORIA ] vs [ ⚡ CARRERA LIBRE ]
    const modes = [
        { id: 'STORY', label: '🏆 MODO HISTORIA (CAMPAÑA 22 CIRCUITOS)', x: 310 },
        { id: 'ARCADE', label: '⚡ CARRERA LIBRE (SELECCIÓN LIBRE)', x: 650 }
    ];

    modes.forEach(m => {
        const isSel = menuMode === m.id;
        const mBox = scene.add.graphics();
        mBox.fillStyle(isSel ? 0xd32f2f : 0x161b26, 0.95);
        mBox.fillRoundedRect(m.x - 155, 58, 310, 30, 6);
        mBox.lineStyle(2, isSel ? 0xfee440 : 0x2e384d, 1);
        mBox.strokeRoundedRect(m.x - 155, 58, 310, 30, 6);

        const mBtn = scene.add.text(m.x, 73, m.label, {
            font: '900 12px Arial',
            fill: isSel ? '#ffffff' : '#b0bec5'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        mBtn.on('pointerdown', () => {
            dustAudio.init();
            menuMode = m.id;
            isCurrentRaceStory = (m.id === 'STORY');
            showMenu(scene);
        });
    });

    // -------------------------------------------------------------
    // SECCIÓN 1: VISTA MODO HISTORIA
    // -------------------------------------------------------------
    if (menuMode === 'STORY') {
        // Pestañas de los 5 Capítulos
        STORY_CHAPTERS.forEach((ch, idx) => {
            const bx = 110 + idx * 185;
            const by = 104;
            const isChSel = currentChapterIndex === idx;

            const chBox = scene.add.graphics();
            chBox.fillStyle(isChSel ? 0x2e7d32 : 0x141822, 0.95);
            chBox.fillRoundedRect(bx - 84, by - 12, 168, 24, 5);
            chBox.lineStyle(1.5, isChSel ? 0x00f5d4 : 0x2c3549, 1);
            chBox.strokeRoundedRect(bx - 84, by - 12, 168, 24, 5);

            const chBtn = scene.add.text(bx, by, ch.title, {
                font: 'bold 11px Arial',
                fill: isChSel ? '#ffffff' : '#90a4ae'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            chBtn.on('pointerdown', () => {
                dustAudio.init();
                currentChapterIndex = idx;
                showMenu(scene);
            });
        });

        // Banner informativo del capítulo activo
        const activeCh = STORY_CHAPTERS[currentChapterIndex];
        const chapterTracks = activeCh.tracks;
        let chapterStars = 0;
        chapterTracks.forEach(t => {
            chapterStars += (progress.stars[t.id] || 0);
        });
        const maxStars = chapterTracks.length * 3;

        scene.add.text(480, 126, `${activeCh.fullName} • RIVAL: ${activeCh.rival} • ⭐ ${chapterStars}/${maxStars} ESTRELLAS`, {
            font: 'bold 11px Arial', fill: '#fee440'
        }).setOrigin(0.5);

        // Tarjetas de los circuitos del capítulo
        const isDenseChapter = chapterTracks.length > 4; // Cap 5 tiene 6 pistas
        if (!isDenseChapter) {
            // Fila única de 4 tarjetas
            chapterTracks.forEach((t, idx) => {
                const cx = 135 + idx * 230;
                const cy = 205;
                const isUnlocked = progress.unlockedTracks.includes(t.id);
                const isSel = currentTrackId === t.id;
                const starsCount = progress.stars[t.id] || 0;
                const starsText = starsCount === 3 ? '⭐⭐⭐' : (starsCount === 2 ? '⭐⭐☆' : (starsCount === 1 ? '⭐☆☆' : '☆☆☆'));

                const cBox = scene.add.graphics();
                cBox.fillStyle(isUnlocked ? (isSel ? 0xd32f2f : 0x171d2b) : 0x0f121a, 0.95);
                cBox.fillRoundedRect(cx - 105, cy - 65, 210, 130, 8);
                cBox.lineStyle(2, isSel ? 0xfee440 : (isUnlocked ? 0x2e384d : 0x1e2430), 1);
                cBox.strokeRoundedRect(cx - 105, cy - 65, 210, 130, 8);

                if (isUnlocked) {
                    scene.add.text(cx, cy - 44, `CARRERA ${idx + 1}`, {
                        font: 'bold 10px Arial', fill: '#00f5d4'
                    }).setOrigin(0.5);

                    scene.add.text(cx, cy - 24, t.name, {
                        font: '900 12px Arial', fill: isSel ? '#ffffff' : '#eceff1', align: 'center', wordWrap: { width: 195 }
                    }).setOrigin(0.5);

                    scene.add.text(cx, cy + 6, t.desc, {
                        font: '10px Arial', fill: '#90a4ae', align: 'center', wordWrap: { width: 195 }
                    }).setOrigin(0.5);

                    scene.add.text(cx, cy + 34, starsText, {
                        font: 'bold 16px Arial', fill: '#fee440'
                    }).setOrigin(0.5);

                    scene.add.text(cx, cy + 52, isSel ? '▶ SELECCIONADO' : 'CLICK PARA SELECCIONAR', {
                        font: 'bold 10px Arial', fill: isSel ? '#ffffff' : '#00e676'
                    }).setOrigin(0.5);

                    const hit = scene.add.rectangle(cx, cy, 210, 130).setInteractive({ useHandCursor: true });
                    hit.on('pointerdown', () => {
                        dustAudio.init();
                        currentTrackId = t.id;
                        isCurrentRaceStory = true;
                        showMenu(scene);
                    });
                } else {
                    scene.add.text(cx, cy - 22, '🔒 BLOQUEADO', {
                        font: '900 14px Arial', fill: '#ff5252'
                    }).setOrigin(0.5);
                    scene.add.text(cx, cy + 8, t.name, {
                        font: 'bold 11px Arial', fill: '#546e7a', align: 'center', wordWrap: { width: 180 }
                    }).setOrigin(0.5);
                    scene.add.text(cx, cy + 32, 'Termina la carrera anterior en TOP 3 para desbloquear', {
                        font: '10px Arial', fill: '#455a64', align: 'center', wordWrap: { width: 180 }
                    }).setOrigin(0.5);
                }
            });
        } else {
            // 2 filas de 3 tarjetas para el Capítulo 5 (6 circuitos)
            chapterTracks.forEach((t, idx) => {
                const col = idx % 3;
                const row = Math.floor(idx / 3);
                const cx = 190 + col * 290;
                const cy = 175 + row * 65;
                const isUnlocked = progress.unlockedTracks.includes(t.id);
                const isSel = currentTrackId === t.id;
                const starsCount = progress.stars[t.id] || 0;
                const starsText = starsCount === 3 ? '⭐⭐⭐' : (starsCount === 2 ? '⭐⭐☆' : (starsCount === 1 ? '⭐☆☆' : '☆☆☆'));

                const cBox = scene.add.graphics();
                cBox.fillStyle(isUnlocked ? (isSel ? 0xd32f2f : 0x171d2b) : 0x0f121a, 0.95);
                cBox.fillRoundedRect(cx - 135, cy - 26, 270, 52, 6);
                cBox.lineStyle(1.5, isSel ? 0xfee440 : (isUnlocked ? 0x2e384d : 0x1e2430), 1);
                cBox.strokeRoundedRect(cx - 135, cy - 26, 270, 52, 6);

                if (isUnlocked) {
                    scene.add.text(cx - 120, cy - 10, `${idx + 1}. ${t.name}`, {
                        font: 'bold 12px Arial', fill: isSel ? '#ffffff' : '#cfd8dc'
                    });
                    scene.add.text(cx - 120, cy + 8, t.desc, {
                        font: '10px Arial', fill: '#90a4ae'
                    });
                    scene.add.text(cx + 100, cy, starsText, {
                        font: 'bold 13px Arial', fill: '#fee440'
                    }).setOrigin(0.5);

                    const hit = scene.add.rectangle(cx, cy, 270, 52).setInteractive({ useHandCursor: true });
                    hit.on('pointerdown', () => {
                        dustAudio.init();
                        currentTrackId = t.id;
                        isCurrentRaceStory = true;
                        showMenu(scene);
                    });
                } else {
                    scene.add.text(cx - 120, cy - 8, `🔒 ${idx + 1}. ${t.name}`, {
                        font: 'bold 12px Arial', fill: '#546e7a'
                    });
                    scene.add.text(cx - 120, cy + 9, 'Top 3 en la anterior para desbloquear', {
                        font: '10px Arial', fill: '#37474f'
                    });
                }
            });
        }
    }
    // -------------------------------------------------------------
    // SECCIÓN 2: VISTA CARRERA LIBRE (ARCADE - 22 CIRCUITOS)
    // -------------------------------------------------------------
    else {
        // Categorías de Carrera Libre
        const categories = [
            { id: 0, label: 'TODAS (22)' },
            { id: 1, label: 'ROOKIE (4)' },
            { id: 2, label: 'CLUBMAN (4)' },
            { id: 3, label: 'DESIERTO (4)' },
            { id: 4, label: 'PRO GT (4)' },
            { id: 5, label: 'LEYENDAS (6)' }
        ];

        categories.forEach((cat, idx) => {
            const bx = 100 + idx * 152;
            const by = 104;
            const isCatSel = arcadeCategoryIndex === cat.id;

            const cBox = scene.add.graphics();
            cBox.fillStyle(isCatSel ? 0x0277bd : 0x141822, 0.95);
            cBox.fillRoundedRect(bx - 68, by - 12, 136, 24, 5);
            cBox.lineStyle(1.5, isCatSel ? 0x00f5d4 : 0x2c3549, 1);
            cBox.strokeRoundedRect(bx - 68, by - 12, 136, 24, 5);

            const cBtn = scene.add.text(bx, by, cat.label, {
                font: 'bold 11px Arial',
                fill: isCatSel ? '#ffffff' : '#90a4ae'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            cBtn.on('pointerdown', () => {
                dustAudio.init();
                arcadeCategoryIndex = cat.id;
                arcadePage = 0;
                showMenu(scene);
            });
        });

        // Filtrar lista de circuitos según categoría
        let filteredTracks = [];
        if (arcadeCategoryIndex === 0) {
            STORY_CHAPTERS.forEach(ch => ch.tracks.forEach(t => filteredTracks.push(t)));
        } else {
            const targetCh = STORY_CHAPTERS[arcadeCategoryIndex - 1];
            if (targetCh) filteredTracks = targetCh.tracks;
        }

        const pageSize = 8;
        const totalPages = Math.ceil(filteredTracks.length / pageSize);
        const pageTracks = filteredTracks.slice(arcadePage * pageSize, (arcadePage + 1) * pageSize);

        scene.add.text(480, 126, `CIRCUITOS DISPONIBLES: ${filteredTracks.length} • PÁGINA ${arcadePage + 1} DE ${totalPages}`, {
            font: 'bold 11px Arial', fill: '#00f5d4'
        }).setOrigin(0.5);

        // Rejilla de 2 filas x 4 columnas
        pageTracks.forEach((t, idx) => {
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const cx = 135 + col * 230;
            const cy = 168 + row * 62;
            const isSel = currentTrackId === t.id;

            const cBox = scene.add.graphics();
            cBox.fillStyle(isSel ? 0xd32f2f : 0x171d2b, 0.95);
            cBox.fillRoundedRect(cx - 105, cy - 25, 210, 50, 6);
            cBox.lineStyle(1.5, isSel ? 0xfee440 : 0x2e384d, 1);
            cBox.strokeRoundedRect(cx - 105, cy - 25, 210, 50, 6);

            scene.add.text(cx, cy - 8, t.name, {
                font: '900 11px Arial', fill: isSel ? '#ffffff' : '#eceff1', align: 'center', wordWrap: { width: 195 }
            }).setOrigin(0.5);

            scene.add.text(cx, cy + 10, t.desc, {
                font: '10px Arial', fill: '#90a4ae', align: 'center', wordWrap: { width: 195 }
            }).setOrigin(0.5);

            const hit = scene.add.rectangle(cx, cy, 210, 50).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                dustAudio.init();
                currentTrackId = t.id;
                isCurrentRaceStory = false;
                showMenu(scene);
            });
        });

        // Controles de paginación si hay más de 8 pistas
        if (totalPages > 1) {
            if (arcadePage > 0) {
                const prevBtn = scene.add.text(60, 260, '◀ ANTERIOR', {
                    font: 'bold 11px Arial', fill: '#00f5d4', backgroundColor: '#161b26', padding: { x: 8, y: 4 }
                }).setInteractive({ useHandCursor: true });
                prevBtn.on('pointerdown', () => { arcadePage--; showMenu(scene); });
            }
            if (arcadePage < totalPages - 1) {
                const nextBtn = scene.add.text(820, 260, 'SIGUIENTE ▶', {
                    font: 'bold 11px Arial', fill: '#00f5d4', backgroundColor: '#161b26', padding: { x: 8, y: 4 }
                }).setInteractive({ useHandCursor: true });
                nextBtn.on('pointerdown', () => { arcadePage++; showMenu(scene); });
            }
        }
    }

    // -------------------------------------------------------------
    // SECCIÓN 3: SELECCIÓN DE VEHÍCULO OFICIAL GT3
    // -------------------------------------------------------------
    scene.add.text(480, 298, '--- VEHÍCULO OFICIAL (GT3 ORIGINALES Y LIBRES DE DERECHOS) ---', {
        font: '900 11px Arial', fill: '#fee440'
    }).setOrigin(0.5);

    DUST_CARS.forEach((car, idx) => {
        const cx = 95 + idx * 154;
        const cy = 345;
        const isSel = selectedCarIndex === idx;

        const cBox = scene.add.graphics();
        cBox.fillStyle(isSel ? 0x2e7d32 : 0x141822, 0.92);
        cBox.fillRoundedRect(cx - 70, cy - 32, 140, 64, 8);
        cBox.lineStyle(2, isSel ? 0x00f5d4 : 0x263044, 1);
        cBox.strokeRoundedRect(cx - 70, cy - 32, 140, 64, 8);

        // Sprite oficial del coche escalado a 48x25
        scene.add.sprite(cx, cy - 10, car.texture).setDisplaySize(48, 25).setAngle(-90);

        scene.add.text(cx, cy + 12, car.name, {
            font: 'bold 10px Arial', fill: isSel ? '#ffffff' : '#cfd8dc'
        }).setOrigin(0.5);

        scene.add.text(cx, cy + 23, car.subtitle.split('•')[0].trim(), {
            font: '9px Arial', fill: '#90a4ae'
        }).setOrigin(0.5);

        const hit = scene.add.rectangle(cx, cy, 140, 64).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            dustAudio.init();
            selectedCarIndex = idx;
            showMenu(scene);
        });
    });

    // -------------------------------------------------------------
    // SECCIÓN 4: CONDICIÓN DE LUZ Y AMBIENTE (Día / Atardecer / Noche)
    // -------------------------------------------------------------
    scene.add.text(480, 396, '--- CONDICIÓN DE LUZ Y AMBIENTE ---', {
        font: '900 11px Arial', fill: '#00f5d4'
    }).setOrigin(0.5);

    const timesOfDay = [
        { id: 'day', label: '☀️ MODO DÍA (Luz Natural)', desc: 'Faros Off' },
        { id: 'sunset', label: '🌅 ATARDECER (Golden Hour)', desc: 'Tono Cálido' },
        { id: 'night', label: '🌙 MODO NOCHE (Faros Xenón)', desc: 'Haz Dinámico' }
    ];

    timesOfDay.forEach((tod, idx) => {
        const bx = 260 + idx * 220;
        const by = 428;
        const isSel = selectedTimeOfDay === tod.id;

        const tBox = scene.add.graphics();
        tBox.fillStyle(isSel ? (tod.id === 'night' ? 0x1a237e : 0xef6c00) : 0x141822, 0.95);
        tBox.fillRoundedRect(bx - 95, by - 16, 190, 32, 6);
        tBox.lineStyle(2, isSel ? 0xfee440 : 0x2e384d, 1);
        tBox.strokeRoundedRect(bx - 95, by - 16, 190, 32, 6);

        const tBtn = scene.add.text(bx, by, tod.label, {
            font: 'bold 11px Arial', fill: isSel ? '#ffffff' : '#b0bec5'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        tBtn.on('pointerdown', () => {
            dustAudio.init();
            selectedTimeOfDay = tod.id;
            showMenu(scene);
        });
    });

    // -------------------------------------------------------------
    // SECCIÓN 5: BOTÓN INICIAR CARRERA
    // -------------------------------------------------------------
    const startBox = scene.add.graphics();
    startBox.fillStyle(0x00c853, 1);
    startBox.fillRoundedRect(340, 475, 280, 44, 10);
    startBox.lineStyle(2, 0xffffff, 0.9);
    startBox.strokeRoundedRect(340, 475, 280, 44, 10);

    const startBtnText = menuMode === 'STORY' ? '¡INICIAR PRUEBA DE HISTORIA! ▶' : '¡INICIAR GRAN PREMIO! ▶';
    const startBtn = scene.add.text(480, 497, startBtnText, {
        font: '900 16px Arial', fill: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
        dustAudio.init();
        startRace(scene, currentTrackId, selectedCarIndex, selectedTimeOfDay, isCurrentRaceStory);
    });
}

// ===== INICIAR CARRERA Y CONSTRUIR MUNDO DUSTRAC OFICIAL =====
function startRace(scene, trackId, carIdx, timeOfDay = 'day', isStory = false) {
    scene.children.removeAll();

    selectedTimeOfDay = timeOfDay;
    isCurrentRaceStory = isStory;

    const tracks = window.DustracTracks || {};
    const track = tracks[trackId];
    if (!track) {
        console.error('Circuito no encontrado:', trackId);
        return;
    }

    gameState = 'COUNTDOWN';
    console.log(`🏁 Cargando nivel oficial: ${track.name} (${track.worldWidth}x${track.worldHeight}px)`);

    // Límites de físicas y cámara del mundo
    scene.physics.world.setBounds(0, 0, track.worldWidth, track.worldHeight);
    scene.cameras.main.setBounds(0, 0, track.worldWidth, track.worldHeight);

    // 1. TERRENO BASE: Césped Oficial de Dust Racing 2D
    scene.add.tileSprite(
        track.worldWidth / 2,
        track.worldHeight / 2,
        track.worldWidth,
        track.worldHeight,
        'dt_grass'
    ).setDepth(0);

    // Mapa de colisiones y superficies por celda (i, j)
    scene.tileMap = new Map();
    scene.roadTiles = [];

    // 2. CONSTRUCCIÓN DE TILES DEL CIRCUITO (.trk)
    track.tiles.forEach(tile => {
        const tx = tile.i * 256 + 128;
        const ty = tile.j * 256 + 128;
        scene.tileMap.set(`${tile.i},${tile.j}`, tile);

        // Registrar tiles transitables de carretera para control de límites de pista y anti-atajos
        if (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45') || tile.t === 'bridge') {
            scene.roadTiles.push({ x: tx, y: ty, i: tile.i, j: tile.j, t: tile.t });
        }

        // A) Trampas de Arena y Transiciones Oficiales
        if (tile.t === 'sand') {
            scene.add.sprite(tx, ty, 'dt_sand').setDisplaySize(256, 256).setDepth(1);
        } else if (tile.t === 'sandGrassStraight') {
            scene.add.sprite(tx, ty, 'dt_sandGrassStraight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        } else if (tile.t === 'sandGrassCorner2') {
            scene.add.sprite(tx, ty, 'dt_sandGrassCorner2').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
        }

        // B) Segmentos de Asfalto con Pianos Oficiales Limpios (Transparencia Perfecta)
        if (tile.t === 'straight') {
            scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'finish') {
            scene.add.sprite(tx, ty, 'dt_finish').setDisplaySize(256, 256).setAngle(tile.o).setDepth(3);
        } else if (tile.t === 'corner90') {
            scene.add.sprite(tx, ty, 'dt_corner90').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'corner45Left') {
            scene.add.sprite(tx, ty, 'dt_corner45Left').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'corner45Right') {
            scene.add.sprite(tx, ty, 'dt_corner45Right').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'straight45Male') {
            scene.add.sprite(tx, ty, 'dt_straight45Male').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'straight45Female') {
            scene.add.sprite(tx, ty, 'dt_straight45Female').setDisplaySize(256, 256).setAngle(tile.o).setDepth(2);
        } else if (tile.t === 'bridge') {
            // El puente elevado cruza a desnivel sobre la pista:
            // En Suzuka y Crossroads el tablero elevado transcurre de Norte a Sur (90 deg),
            // y la calzada inferior del túnel transcurre de Este a Oeste (0 deg).
            const deckAngle = 90;
            const underAngle = 0;

            // 1. Asfalto inferior por el que cruzan los coches por el túnel
            scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(underAngle).setDepth(2);

            // 2. Sombra de oclusión ambiental profunda en el paso inferior del túnel
            scene.add.rectangle(tx, ty, 208, 256, 0x000000, 0.45).setDepth(3);

            // 3. Sombra arquitectónica proyectada por la altura del puente sobre el suelo
            scene.add.rectangle(tx + 14, ty + 12, 192, 256, 0x000000, 0.42).setDepth(14);

            // 4. Tablero del puente elevado con textura fotorrealista HD
            scene.add.sprite(tx, ty, 'dt_bridge_deck').setDisplaySize(256, 256).setAngle(deckAngle).setDepth(15);

            // 5. Pilares y estribos de hormigón reforzado (Concrete Abutments) en los 4 extremos del túnel
            const pillarW = 28;
            const pillarH = 34;
            const pillars = [
                { x: tx - 104, y: ty - 88 },
                { x: tx + 104, y: ty - 88 },
                { x: tx - 104, y: ty + 88 },
                { x: tx + 104, y: ty + 88 }
            ];

            pillars.forEach(p => {
                // Sombra del pilar
                scene.add.rectangle(p.x + 4, p.y + 4, pillarW, pillarH, 0x000000, 0.45).setDepth(15);
                // Bloque de hormigón con relieve y franja de seguridad FIA
                const col = scene.add.graphics().setDepth(16);
                col.fillStyle(0x64748b, 1);
                col.fillRoundedRect(p.x - pillarW/2, p.y - pillarH/2, pillarW, pillarH, 4);
                col.fillStyle(0x94a3b8, 1);
                col.fillRect(p.x - pillarW/2 + 2, p.y - pillarH/2 + 2, pillarW - 4, 6);
                col.fillStyle(0xfacc15, 1);
                col.fillRect(p.x - pillarW/2 + 2, p.y + pillarH/2 - 8, pillarW - 4, 6);
                col.fillStyle(0x0f172a, 1);
                col.fillRect(p.x - pillarW/2 + 6, p.y + pillarH/2 - 8, 4, 6);
                col.fillRect(p.x - pillarW/2 + 16, p.y + pillarH/2 - 8, 4, 6);
            });

            // 6. Pórtico de señalización FIA / Gran Premio sobre la barandilla del puente
            const gantry = scene.add.graphics().setDepth(17);
            gantry.fillStyle(0x0f172a, 0.95);
            gantry.fillRoundedRect(tx - 70, ty - 6, 140, 12, 3);
            gantry.lineStyle(1.5, 0x00f5d4, 1);
            gantry.strokeRoundedRect(tx - 70, ty - 6, 140, 12, 3);
        }
    });

    // 3. CAPA DE MARCAS DE GOMA DE DERRAPE PERMANENTES (SKID MARKS)
    skidLayer = scene.add.graphics().setDepth(4);

    // 4. OBJETOS DEL ENTORNO OFICIALES (Árboles, Tribunas, Neumáticos, Rocas)
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            // Sombra suave ambiental proyectada a 45 grados
            scene.add.ellipse(obj.x + 8, obj.y + 10, 58, 48, 0x000000, 0.40).setDepth(13);
            const tree = scene.add.sprite(obj.x, obj.y, 'dt_tree').setDisplaySize(72, 72).setDepth(14);
            // Balanceo sutil de viento
            scene.tweens.add({
                targets: tree,
                angle: (Math.random() - 0.5) * 4,
                duration: 2600 + Math.random() * 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (obj.r === 'grandstand') {
            // Tribuna con público en alta definición:
            // Detectamos si es una sección modular conectada (paso ~128-150px) o una tribuna aislada
            const isIsolated = !track.objects.some(other => other !== obj && other.r === 'grandstand' && Math.hypot(obj.x - other.x, obj.y - other.y) < 220);
            const gsW = isIsolated ? 230 : 160;
            const gsH = isIsolated ? 160 : 130;

            // Sombra arquitectónica proyectada
            scene.add.rectangle(obj.x + 12, obj.y + 16, gsW - 5, gsH - 5, 0x000000, 0.40)
                .setAngle(obj.o)
                .setDepth(11);

            // Sprite de grada en alta definición
            scene.add.sprite(obj.x, obj.y, 'dt_grandstand')
                .setDisplaySize(gsW, gsH)
                .setAngle(obj.o)
                .setDepth(12);
        } else if (obj.r === 'tire') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 26, 26, 0x000000, 0.42).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(28, 28).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 28, 24, 0x000000, 0.38).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(32, 32).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'bushArea') {
            scene.add.ellipse(obj.x + 3, obj.y + 4, 96, 96, 0x000000, 0.30).setDepth(4);
            scene.add.sprite(obj.x, obj.y, 'dt_bushArea').setDisplaySize(100, 100).setAngle(obj.o).setDepth(5);
        } else if (obj.r === 'pit') {
            scene.add.sprite(obj.x, obj.y, 'dt_pit').setDisplaySize(256, 54).setAngle(obj.o).setDepth(5);
        }
    });

    // 5. PARRILLA DE SALIDA Y SPAWN DE COCHES OFICIAL
    // Ubicación oficial de meta: todos los coches salen DETRÁS de la línea de meta mirando hacia adelante
    const finishTile = track.tiles.find(t => t.t === 'finish');
    const fx = finishTile ? finishTile.i * 256 + 128 : (track.nodes[0] ? track.nodes[0].x : 500);
    const fy = finishTile ? finishTile.j * 256 + 128 : (track.nodes[0] ? track.nodes[0].y : 500);

    const n0 = track.nodes[0] || { x: fx, y: fy - 100 };
    let dirX = n0.x - fx;
    let dirY = n0.y - fy;
    const len = Math.hypot(dirX, dirY);
    if (len > 0.001) {
        dirX /= len;
        dirY /= len;
    } else {
        dirX = 0;
        dirY = -1;
    }
    const startAngleRad = Math.atan2(dirY, dirX);
    const startAngleDeg = Phaser.Math.RadToDeg(startAngleRad);

    const perpX = -dirY;
    const perpY = dirX;

    // Resetear variables de carrera
    playerLap = 1;
    playerSpeed = 0;
    playerNextNodeIdx = 0;
    bestLapTime = null;
    offTrackTimer = 0;

    // Coche del Jugador (Pole Position, colocado detrás de la línea de meta)
    const pCarData = DUST_CARS[carIdx];
    const playerDistBehind = 55;
    const playerSideOffset = 22;
    playerCar = spawnVehicle(
        scene,
        fx - dirX * playerDistBehind + perpX * playerSideOffset,
        fy - dirY * playerDistBehind + perpY * playerSideOffset,
        pCarData.texture,
        startAngleDeg,
        true,
        pCarData
    );
    playerCar.targetNodeIdx = 0;
    playerCar.lastCheckpoint = -1;

    // 5 Rivales con Inteligencia Artificial colocados en la parrilla detrás del jugador
    aiCars = [];
    const rivals = DUST_CARS.filter((_, i) => i !== carIdx);
    for (let i = 0; i < 5; i++) {
        const aiData = rivals[i % rivals.length];
        const row = Math.floor((i + 1) / 2);
        const col = (i + 1) % 2 === 1 ? -1 : 1;
        const aiDistBehind = playerDistBehind + (row * 50);
        const aiSideOffset = col * 22;

        const sx = fx - dirX * aiDistBehind + perpX * aiSideOffset;
        const sy = fy - dirY * aiDistBehind + perpY * aiSideOffset;

        const ai = spawnVehicle(scene, sx, sy, aiData.texture, startAngleDeg, false, aiData);
        ai.targetNodeIdx = 0;
        ai.lastCheckpoint = -1;
        ai.aiVelocity = 0;
        aiCars.push(ai);
    }

    // 6. CAPA AMBIENTAL DE ILUMINACIÓN Y OSCURIDAD (Día / Atardecer / Noche)
    if (selectedTimeOfDay === 'night') {
        // Velo nocturno azul profundo cinematográfico sobre el asfalto y entorno
        const nightAmbient = scene.add.rectangle(
            track.worldWidth / 2, track.worldHeight / 2,
            track.worldWidth, track.worldHeight,
            0x050814, 0.78
        ).setDepth(8);
    } else if (selectedTimeOfDay === 'sunset') {
        // Tono dorado cálido al atardecer
        const sunsetAmbient = scene.add.rectangle(
            track.worldWidth / 2, track.worldHeight / 2,
            track.worldWidth, track.worldHeight,
            0xd97706, 0.24
        ).setDepth(8);
    }

    // Cámara con seguimiento suave y look-ahead
    scene.cameras.main.startFollow(playerCar, true, 0.08, 0.08);
    scene.cameras.main.setZoom(1.1);

    // Crear Telemetría e Interfaz HUD
    setupHud(scene, track);

    // Secuencia de Semáforo de Salida (3... 2... 1... GO!)
    startCountdown(scene);
}

// Spawnear vehículo con dimensiones 48x25 exactas de Dust Racing 2D
function spawnVehicle(scene, x, y, textureKey, angleDeg, isPlayer, carData) {
    const car = scene.physics.add.sprite(x, y, textureKey);
    car.setDisplaySize(48, 25);
    car.setAngle(angleDeg);
    car.setDepth(10);
    car.setCollideWorldBounds(true);
    car.isPlayer = isPlayer;
    car.carData = carData;
    car.currentLap = 1;
    car.lastCheckpoint = 0;

    // Sombra suave proyectada bajo el coche
    car.shadow = scene.add.ellipse(x + 3, y + 4, 46, 22, 0x000000, 0.45).setDepth(9);

    // Conos de luz de los faros delanteros
    car.headlights = scene.add.graphics().setDepth(7);

    return car;
}

// Semáforo de Salida
function startCountdown(scene) {
    let count = 3;
    const txt = scene.add.text(480, 240, '3', {
        font: '900 85px Arial',
        fill: '#ff1744',
        stroke: '#ffffff',
        strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    dustAudio.playCountdown(false);

    const event = scene.time.addEvent({
        delay: 900,
        repeat: 3,
        callback: () => {
            count--;
            if (count > 0) {
                txt.setText(count.toString());
                txt.setFill(count === 2 ? '#ff9100' : '#ffea00');
                dustAudio.playCountdown(false);
            } else if (count === 0) {
                txt.setText('¡GO!');
                txt.setFill('#00e676');
                dustAudio.playCountdown(true);
                gameState = 'RACE';
                lapStartTime = Date.now();
            } else {
                txt.destroy();
                event.destroy();
            }
        }
    });
}

// Telemetría HUD Glassmorphism
function setupHud(scene, track) {
    const hud = scene.add.container(0, 0).setScrollFactor(0).setDepth(50);

    // Barra superior
    const bar = scene.add.graphics();
    bar.fillStyle(0x0a0c14, 0.88);
    bar.fillRect(0, 0, 960, 48);
    bar.lineStyle(1, 0x00f5d4, 0.7);
    bar.lineBetween(0, 48, 960, 48);
    hud.add(bar);

    hudPosText = scene.add.text(25, 14, 'POS: 1 / 6', { font: '900 18px Arial', fill: '#00f5d4' });
    hud.add(hudPosText);

    hudLapText = scene.add.text(180, 14, `VUELTA: 1 / ${TOTAL_LAPS}`, { font: 'bold 16px Arial', fill: '#fee440' });
    hud.add(hudLapText);

    hudTimeText = scene.add.text(480, 14, 'TIEMPO: 00:00.00', { font: 'bold 16px Arial', fill: '#ffffff' }).setOrigin(0.5, 0);
    hud.add(hudTimeText);

    hudSpeedText = scene.add.text(800, 14, '0 KM/H', { font: '900 18px Arial', fill: '#ff1744' });
    hud.add(hudSpeedText);

    hudSurfaceText = scene.add.text(480, 505, 'SUPERFICIE: ASFALTO (GRIP 100%)', { font: 'bold 12px Arial', fill: '#00f5d4' }).setOrigin(0.5);
    hud.add(hudSurfaceText);

    // Radar Minimapa en esquina inferior derecha
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(51);
}

// ===== UPDATE: MOTOR FÍSICO Y DE JUEGO A 60 FPS =====
function dustUpdate(time, delta) {
    if (!playerCar || gameState === 'MENU') return;

    const dt = delta / 1000;
    const tracks = window.DustracTracks || {};
    const track = tracks[currentTrackId];
    if (!track) return;

    // Cronómetro de vuelta
    if (gameState === 'RACE') {
        const ms = Date.now() - lapStartTime;
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const csec = Math.floor((ms % 1000) / 10);
        hudTimeText.setText(`TIEMPO: ${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${csec < 10 ? '0' : ''}${csec}`);
    }

    // Zoom adaptativo dinámico según velocidad (sensación de velocidad cinematográfica)
    if (raceScene && raceScene.cameras && raceScene.cameras.main) {
        const targetZoom = Math.max(0.96, 1.15 - (Math.abs(playerSpeed) / 500) * 0.18);
        raceScene.cameras.main.zoom = Phaser.Math.Linear(raceScene.cameras.main.zoom, targetZoom, 0.04);
    }

    // 1. Físicas y control del jugador
    updatePlayer(dt, track);

    // 2. Físicas de los 5 rivales IA
    if (gameState === 'RACE') {
        aiCars.forEach(ai => updateAiCar(ai, dt, track));
    }

    // 3. Colisiones entre vehículos
    handleCollisions();

    // 4. Elevación dinámica de coches en puentes (por arriba o por abajo)
    updateCarsBridgeLayers(track);

    // 5. Luces y sombras de los vehículos (Faros Día/Noche)
    updateCarVisuals();

    // 5. Radar Minimapa
    renderMinimap(track);

    // 6. Clasificación en vivo
    updateStandings(track);
}

// Cálculo rápido de distancia al segmento de carretera más cercano
function getDistanceToRoad(px, py, scene) {
    if (!scene || !scene.roadTiles || scene.roadTiles.length === 0) return { dist: 0, nearestTile: null };
    let minDistSq = Infinity;
    let nearestTile = scene.roadTiles[0];
    for (let i = 0; i < scene.roadTiles.length; i++) {
        const rt = scene.roadTiles[i];
        const dx = px - rt.x;
        const dy = py - rt.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestTile = rt;
        }
    }
    return {
        dist: Math.sqrt(minDistSq),
        nearestTile: nearestTile
    };
}

// Respawn limpio del jugador en la trazada de asfalto ante atajos ilegales
function respawnPlayerOnTrack(track) {
    if (!playerCar || !raceScene) return;

    let spawnX, spawnY, spawnAngleDeg;
    const nodes = track.nodes || [];

    if (nodes.length > 0 && playerCar.lastCheckpoint >= 0 && playerCar.lastCheckpoint < nodes.length) {
        const lastNode = nodes[playerCar.lastCheckpoint];
        const nextNode = nodes[(playerCar.lastCheckpoint + 1) % nodes.length];
        spawnX = lastNode.x;
        spawnY = lastNode.y;
        const ang = Math.atan2(nextNode.y - lastNode.y, nextNode.x - lastNode.x);
        spawnAngleDeg = Phaser.Math.RadToDeg(ang);
    } else {
        const finishTile = track.tiles.find(t => t.t === 'finish');
        spawnX = finishTile ? finishTile.i * 256 + 128 : (nodes[0] ? nodes[0].x : 500);
        spawnY = finishTile ? finishTile.j * 256 + 128 : (nodes[0] ? nodes[0].y : 500);
        const n0 = nodes[0] || { x: spawnX, y: spawnY - 100 };
        const ang = Math.atan2(n0.y - spawnY, n0.x - spawnX);
        spawnAngleDeg = Phaser.Math.RadToDeg(ang);
    }

    playerCar.x = spawnX;
    playerCar.y = spawnY;
    playerCar.angle = spawnAngleDeg;
    playerCar.setVelocity(0, 0);
    playerSpeed = 0;
    offTrackTimer = 0;

    raceScene.cameras.main.flash(220, 255, 255, 255);
    dustAudio.playKerb();
}

// Actualizar coche del jugador con límites de pista y prevención de atajos
function updatePlayer(dt, track) {
    const cData = playerCar.carData;
    const left = keys.left.isDown || keys.a.isDown || touchLeft;
    const right = keys.right.isDown || keys.d.isDown || touchRight;
    const gas = keys.up.isDown || keys.w.isDown || keys.space.isDown || touchGas;
    const brake = keys.down.isDown || keys.s.isDown || touchBrake;

    // Detección de distancia a la carretera más cercana (Límites de pista y Anti-Atajos)
    const roadInfo = getDistanceToRoad(playerCar.x, playerCar.y, raceScene);
    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = raceScene.tileMap.get(`${ti},${tj}`);

    let grip = 1.0;
    let surfaceLabel = 'ASFALTO (GRIP 100%)';

    if (tile && (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45') || tile.t === 'bridge')) {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 2);
        if (tile.t === 'bridge') {
            grip = 1.0;
            surfaceLabel = playerCar.onBridgeDeck ? 'PUENTE ELEVADO (CRUCE SUPERIOR)' : 'TÚNEL DE PISTA (CRUCE INFERIOR)';
        } else {
            const distCenter = Math.hypot(playerCar.x - (ti * 256 + 128), playerCar.y - (tj * 256 + 128));
            if (distCenter > 88 && distCenter < 122) {
                surfaceLabel = 'PIANOS DE CARRERA (RUMBLE STRIP)';
                dustAudio.playKerb();
                raceScene.cameras.main.shake(50, 0.002);
                grip = 0.95;
            } else if (distCenter >= 122) {
                grip = 0.60;
                surfaceLabel = 'BORDE DE ASFALTO (DERIVA)';
                spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c);
            } else {
                grip = 1.0;
                surfaceLabel = 'ASFALTO (GRIP 100%)';
            }
        }
    } else if (tile && tile.t === 'sand') {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 1.5);
        grip = 0.40;
        surfaceLabel = 'TRAMPA DE ARENA (DECELERACIÓN)';
        dustAudio.playSand();
        spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059);
    } else if (tile && tile.t.startsWith('sandGrass')) {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 1.5);
        grip = 0.58;
        surfaceLabel = 'TRANSICIÓN ARENA-CÉSPED';
        spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8);
    } else {
        // Fuera del asfalto: margen permitido de escapatoria ("salirse un poco") vs atajo ilegal
        if (roadInfo.dist <= 175) {
            // Margen permitido de escapatoria o trompo leve (hasta 175px)
            offTrackTimer = Math.max(0, offTrackTimer - dt);
            grip = 0.52;
            surfaceLabel = 'CÉSPED DE ESCAPATORIA (DERIVA)';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x388e3c);
        } else {
            // ATAJO ILEGAL: Fuera de los límites permitidos del trazado
            grip = 0.22;
            surfaceLabel = '⚠️ FUERA DE LÍMITES - RETORNA A PISTA';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0x2e7d32);

            // Frenada drástica y empuje elástico de retorno hacia el circuito
            playerSpeed *= 0.88;
            if (roadInfo.nearestTile) {
                const retAng = Math.atan2(roadInfo.nearestTile.y - playerCar.y, roadInfo.nearestTile.x - playerCar.x);
                playerCar.x += Math.cos(retAng) * 3.5;
                playerCar.y += Math.sin(retAng) * 3.5;
            }

            offTrackTimer += dt;
            if (offTrackTimer > 1.6 || roadInfo.dist > 280) {
                respawnPlayerOnTrack(track);
            }
        }
    }

    hudSurfaceText.setText(`SUPERFICIE: ${surfaceLabel}`);

    // Aceleración y Frenada
    const topSpeed = cData.speed * grip;
    const accelRate = cData.accel * grip;

    if (gameState === 'RACE') {
        if (gas) {
            playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
            if (left || right) {
                dustAudio.playDrift();
                drawSkid(playerCar.x, playerCar.y, playerCar.angle);
                spawnTireSmoke(raceScene, playerCar.x, playerCar.y, playerCar.angle);
            }
        } else if (brake) {
            playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.2 * dt);
            dustAudio.playDrift();
            drawSkid(playerCar.x, playerCar.y, playerCar.angle);
            spawnTireSmoke(raceScene, playerCar.x, playerCar.y, playerCar.angle);
        } else {
            playerSpeed *= 0.982;
        }

        // Giro
        const steer = cData.handling * (playerSpeed > 40 ? 1 : playerSpeed / 40);
        if (left) playerCar.angle -= steer;
        if (right) playerCar.angle += steer;
    } else {
        playerSpeed = 0;
    }

    const rad = Phaser.Math.DegToRad(playerCar.angle);
    playerCar.setVelocity(Math.cos(rad) * playerSpeed, Math.sin(rad) * playerSpeed);

    dustAudio.updateEngine(playerSpeed, cData.speed);

    const kmh = Math.floor(Math.abs(playerSpeed) * 0.65);
    hudSpeedText.setText(`${kmh} KM/H`);

    checkLap(playerCar, track);
}

// Actualizar IA de rivales con sujeción de seguridad al trazado
function updateAiCar(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[ai.targetNodeIdx];
    const angleRad = Math.atan2(targetNode.y - ai.y, targetNode.x - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);

    const diff = Phaser.Math.Angle.WrapDegrees(targetDeg - ai.angle);
    const step = ai.carData.handling * 0.9;
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), step);

    const maxSpeed = ai.carData.speed * 0.88;
    ai.aiVelocity = Math.min(maxSpeed, (ai.aiVelocity || 0) + ai.carData.accel * 0.75 * dt);

    const dist = Math.hypot(ai.x - targetNode.x, ai.y - targetNode.y);

    // Contención de seguridad: si un choque empujó a la IA lejos de la trazada
    if (dist > 350) {
        ai.angle = targetDeg;
        ai.aiVelocity = Math.min(ai.aiVelocity, 120);
    }

    const rad = Phaser.Math.DegToRad(ai.angle);
    ai.setVelocity(Math.cos(rad) * ai.aiVelocity, Math.sin(rad) * ai.aiVelocity);

    if (dist < 150) {
        const prevAiIdx = ai.targetNodeIdx;
        ai.lastCheckpoint = prevAiIdx;
        ai.targetNodeIdx = (ai.targetNodeIdx + 1) % nodes.length;
        if (prevAiIdx === nodes.length - 1) {
            ai.currentLap++;
        }
    }
}

// Dibujar marcas permanentes de derrape
function drawSkid(x, y, angleDeg) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const px = Math.cos(rad) * 11;
    const py = Math.sin(rad) * 11;

    skidLayer.fillStyle(0x0a0c0e, 0.4);
    skidLayer.fillCircle(x + px, y + py, 2.5);
    skidLayer.fillCircle(x - px, y - py, 2.5);
}

// Partículas de polvo y derrape
function spawnDust(scene, x, y, textureKey, tintHex) {
    const p = scene.add.sprite(
        x + (Math.random() - 0.5) * 18,
        y + (Math.random() - 0.5) * 18,
        textureKey
    ).setDisplaySize(16, 16).setDepth(8);

    if (tintHex) p.setTint(tintHex);

    scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 1.8,
        duration: 250,
        onComplete: () => p.destroy()
    });
}

// Emisor de humo blanco/gris de derrape en neumáticos (Tire Smoke)
function spawnTireSmoke(scene, x, y, angleDeg) {
    if (!scene || Math.random() > 0.42) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const px = Math.cos(rad) * 10;
    const py = Math.sin(rad) * 10;
    const offsetSide = Math.random() > 0.5 ? 1 : -1;

    const smoke = scene.add.sprite(
        x + px * offsetSide + (Math.random() - 0.5) * 6,
        y + py * offsetSide + (Math.random() - 0.5) * 6,
        'dt_smoke'
    ).setDisplaySize(14, 14).setDepth(8).setAlpha(0.65);

    smoke.setTint(0xf1f5f9);

    scene.tweens.add({
        targets: smoke,
        alpha: 0,
        scale: 2.8,
        x: smoke.x + (Math.random() - 0.5) * 14,
        y: smoke.y + (Math.random() - 0.5) * 14,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => smoke.destroy()
    });
}

// Llamarada de escape (Backfire Flame) al cambiar de marcha o soltar gas a altas RPM
function spawnBackfireFlame(scene, car) {
    if (!scene || !car || !car.active) return;
    const rad = Phaser.Math.DegToRad(car.angle);
    const rx = car.x - Math.cos(rad) * 23;
    const ry = car.y - Math.sin(rad) * 23;
    const perp = rad + Math.PI / 2;

    [-6, 6].forEach(offset => {
        const fx = rx + Math.cos(perp) * offset;
        const fy = ry + Math.sin(perp) * offset;

        const flame = scene.add.sprite(fx, fy, 'dt_sparkle')
            .setDisplaySize(18, 18)
            .setDepth(13)
            .setTint(0x00f5d4); // Fuego azul/cian de competición GT3

        scene.tweens.add({
            targets: flame,
            scale: 2.4,
            alpha: 0,
            duration: 120,
            onComplete: () => flame.destroy()
        });
    });
}

// Colisiones suaves entre vehículos (físicas estables sin descompensar cámara ni lanzar coches)
function handleCollisions() {
    if (!playerCar || !raceScene) return;
    const now = Date.now();

    // 1. Colisión Jugador vs IA (separación elástica suave sin saltos bruscos)
    aiCars.forEach(ai => {
        const dx = playerCar.x - ai.x;
        const dy = playerCar.y - ai.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 34;

        if (dist < minDist && dist > 0.001) {
            // Sonido de colisión con cooldown de 250ms para evitar saturación de audio
            if (now - lastCrashSoundTime > 250) {
                dustAudio.playCrash();
                lastCrashSoundTime = now;
            }

            // Fricción suave y controlada
            playerSpeed *= 0.94;
            ai.aiVelocity = (ai.aiVelocity || 0) * 0.94;

            // Separación proporcional a la penetración real, acotada a máx 2.2px por frame
            const overlap = minDist - dist;
            const push = Math.min(2.2, overlap * 0.5);
            const ang = Math.atan2(dy, dx);

            playerCar.x += Math.cos(ang) * push;
            playerCar.y += Math.sin(ang) * push;
            ai.x -= Math.cos(ang) * push;
            ai.y -= Math.sin(ang) * push;

            // Chispas de fricción ocasionales
            if (Math.random() > 0.45) {
                spawnDust(raceScene, (playerCar.x + ai.x) / 2, (playerCar.y + ai.y) / 2, 'dt_sparkle', 0xffea00);
            }
        }
    });

    // 2. Colisión IA vs IA (evita que los rivales se apilen o empujen violentamente al jugador)
    for (let i = 0; i < aiCars.length; i++) {
        for (let j = i + 1; j < aiCars.length; j++) {
            const a1 = aiCars[i];
            const a2 = aiCars[j];
            const dx = a1.x - a2.x;
            const dy = a1.y - a2.y;
            const dist = Math.hypot(dx, dy);
            const minDist = 32;

            if (dist < minDist && dist > 0.001) {
                const overlap = minDist - dist;
                const push = Math.min(1.8, overlap * 0.4);
                const ang = Math.atan2(dy, dx);

                a1.x += Math.cos(ang) * push;
                a1.y += Math.sin(ang) * push;
                a2.x -= Math.cos(ang) * push;
                a2.y -= Math.sin(ang) * push;

                a1.aiVelocity = (a1.aiVelocity || 0) * 0.96;
                a2.aiVelocity = (a2.aiVelocity || 0) * 0.96;
            }
        }
    }
}

// Checkpoints y paso de vuelta
function checkLap(car, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const targetNode = nodes[playerNextNodeIdx];
    const dist = Math.hypot(car.x - targetNode.x, car.y - targetNode.y);

    if (dist < 180) {
        const prevIdx = playerNextNodeIdx;
        car.lastCheckpoint = prevIdx;
        playerNextNodeIdx = (playerNextNodeIdx + 1) % nodes.length;

        // Vuelta completada al completar todo el circuito y cruzar meta de nuevo
        if (prevIdx === nodes.length - 1) {
            dustAudio.playLap();
            playerLap++;

            if (!bestLapTime || (Date.now() - lapStartTime) < bestLapTime) {
                bestLapTime = Date.now() - lapStartTime;
            }

            lapStartTime = Date.now();

            if (playerLap > TOTAL_LAPS) {
                endRace();
            } else {
                hudLapText.setText(`VUELTA: ${playerLap} / ${TOTAL_LAPS}`);
            }
        }
    }
}

// Fin de carrera y resultados con integración de Modo Historia
function endRace() {
    gameState = 'FINISHED';
    playerSpeed = 0;
    playerCar.setVelocity(0, 0);

    const overlay = raceScene.add.graphics().setScrollFactor(0).setDepth(200);
    overlay.fillStyle(0x080a10, 0.90);
    overlay.fillRect(0, 0, 960, 540);

    const posMatch = hudPosText ? hudPosText.text.match(/\d+/) : null;
    const playerRank = posMatch ? parseInt(posMatch[0]) : 1;
    const isPodium = playerRank <= 3;

    // Guardar progreso en el Modo Historia
    const progress = loadStoryProgress();
    const prevStars = progress.stars[currentTrackId] || 0;
    const earnedStars = playerRank === 1 ? 3 : (playerRank === 2 ? 2 : (playerRank === 3 ? 1 : 0));
    if (earnedStars > prevStars) {
        progress.stars[currentTrackId] = earnedStars;
    }
    progress.bestRanks[currentTrackId] = Math.min(progress.bestRanks[currentTrackId] || 99, playerRank);

    // Desbloqueo del siguiente circuito de la historia
    let nextTrack = null;
    if (isCurrentRaceStory && isPodium) {
        const allStoryTracks = [];
        STORY_CHAPTERS.forEach(ch => ch.tracks.forEach(t => allStoryTracks.push(t)));
        const currIdx = allStoryTracks.findIndex(t => t.id === currentTrackId);
        if (currIdx !== -1 && currIdx + 1 < allStoryTracks.length) {
            nextTrack = allStoryTracks[currIdx + 1];
            if (!progress.unlockedTracks.includes(nextTrack.id)) {
                progress.unlockedTracks.push(nextTrack.id);
            }
        }
    }
    saveStoryProgress(progress);

    // Título y Trofeo
    const medalEmoji = playerRank === 1 ? '🥇 ¡VICTORIA! 1º PUESTO' : (playerRank === 2 ? '🥈 2º PUESTO (SUBCAMPEÓN)' : (playerRank === 3 ? '🥉 3º PUESTO (PODIO)' : `POSICIÓN ${playerRank}º / 6`));
    const titleColor = playerRank === 1 ? '#fee440' : (playerRank === 2 ? '#e2e8f0' : (playerRank === 3 ? '#ff9800' : '#ef5350'));

    raceScene.add.text(480, 115, isCurrentRaceStory ? '🏆 MODO HISTORIA: RESULTADO DE PRUEBA 🏆' : '🏁 GRAN PREMIO FINALIZADO 🏁', {
        font: '900 22px Arial', fill: '#00f5d4'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    raceScene.add.text(480, 165, medalEmoji, {
        font: '900 34px Arial', fill: titleColor, stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Estrellas
    const starsStr = earnedStars === 3 ? '⭐⭐⭐ (MÁXIMA PUNTUACIÓN)' : (earnedStars === 2 ? '⭐⭐☆ (GRAN RENDIMIENTO)' : (earnedStars === 1 ? '⭐☆☆ (CLASIFICADO)' : '☆☆☆ (SIN ESTRELLAS)'));
    raceScene.add.text(480, 215, `VALORACIÓN: ${starsStr}`, {
        font: 'bold 18px Arial', fill: '#fee440'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Mejor tiempo de vuelta
    const bestSec = bestLapTime ? (bestLapTime / 1000).toFixed(2) + 's' : '--';
    raceScene.add.text(480, 252, `MEJOR VUELTA: ${bestSec} • TIEMPO TOTAL: ${((Date.now() - lapStartTime) / 1000).toFixed(1)}s`, {
        font: 'bold 14px Arial', fill: '#90a4ae'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    let btnY = 360;

    if (isCurrentRaceStory) {
        if (isPodium && nextTrack) {
            raceScene.add.text(480, 292, `¡DESBLOQUEADO NUEVO CIRCUITO: ${nextTrack.name.toUpperCase()}!`, {
                font: '900 15px Arial', fill: '#00e676'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const nextBtn = raceScene.add.text(480, 342, 'CONTINUAR HISTORIA (SIGUIENTE PISTA) ▶', {
                font: '900 16px Arial', fill: '#ffffff', backgroundColor: '#2e7d32', padding: { x: 24, y: 12 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

            nextBtn.on('pointerdown', () => {
                currentTrackId = nextTrack.id;
                startRace(raceScene, currentTrackId, selectedCarIndex, selectedTimeOfDay, true);
            });

            btnY = 412;
        } else if (isPodium && !nextTrack) {
            raceScene.add.text(480, 292, '🏆 ¡FELICIDADES! ¡HAS COMPLETADO LOS 22 CIRCUITOS DEL MODO HISTORIA! 🏆', {
                font: '900 15px Arial', fill: '#fee440'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            btnY = 360;
        } else {
            raceScene.add.text(480, 292, 'Necesitas quedar entre los 3 primeros (Top 3) para avanzar en la historia.', {
                font: 'bold 14px Arial', fill: '#ff5252'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            btnY = 360;
        }
    }

    // Botón Repetir Carrera
    const retryBtn = raceScene.add.text(340, btnY, 'REPETIR CARRERA ↺', {
        font: 'bold 15px Arial', fill: '#ffffff', backgroundColor: '#1e88e5', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
        startRace(raceScene, currentTrackId, selectedCarIndex, selectedTimeOfDay, isCurrentRaceStory);
    });

    // Botón Volver al Menú
    const menuBtn = raceScene.add.text(620, btnY, 'VOLVER AL MENÚ DE PISTAS', {
        font: 'bold 15px Arial', fill: '#fee440', backgroundColor: '#1b202e', padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    // Recompensas Web3 en $CR y Gemas por clasificación
    let crReward = playerRank === 1 ? 1000 : (playerRank === 2 ? 600 : (playerRank === 3 ? 400 : 200));
    let gemReward = playerRank === 1 ? 25 : (playerRank === 2 ? 15 : (playerRank === 3 ? 10 : 0));
    if (typeof loadNftUserData === 'function') {
        const u = loadNftUserData();
        u.credits += crReward;
        u.gems += gemReward;
        saveNftUserData(u);
    }

    raceScene.add.text(480, 276, `💰 +${crReward} $CR  •  💎 +${gemReward} TON RECOMPENSA DE CARRERA`, {
        font: 'bold 13px Arial', fill: '#00f5d4'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    menuBtn.on('pointerdown', () => {
        showMenu(raceScene);
    });

    // Botón Salir al Hub Principal
    const hubBtn = raceScene.add.text(480, btnY + 46, '🏠 SALIR AL HUB PRINCIPAL (GARAJE / CAJAS / TIENDA)', {
        font: 'bold 12px Arial', fill: '#ffffff', backgroundColor: '#e53935', padding: { x: 18, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    hubBtn.on('pointerdown', () => {
        if (window.returnToGameHub) window.returnToGameHub();
    });
}

// Actualizar elevación dinámica en cruces con puente (por arriba o por abajo)
function updateCarsBridgeLayers(track) {
    const bridgeTile = track.tiles ? track.tiles.find(t => t.t === 'bridge') : null;
    if (!bridgeTile) return;

    const bx = bridgeTile.i * 256 + 128;
    const by = bridgeTile.j * 256 + 128;
    // En Suzuka y Crossroads el puente elevado transcurre de Norte a Sur (90 deg)
    const deckAngle = 90;
    const all = [playerCar, ...aiCars];

    all.forEach(car => {
        if (!car || !car.active) return;
        const d = Math.hypot(car.x - bx, car.y - by);

        if (d < 175) {
            // El coche está dentro del cruce del puente:
            const carRad = Phaser.Math.DegToRad(car.angle);
            const carDirX = Math.cos(carRad);
            const carDirY = Math.sin(carRad);

            // Dirección de la pasarela elevada del puente (Norte-Sur, 90 deg)
            const deckRad = Phaser.Math.DegToRad(deckAngle);
            const bDirX = Math.cos(deckRad);
            const bDirY = Math.sin(deckRad);

            // Producto escalar (|dot| > 0.55 indica alineación con el puente superior Norte-Sur)
            const dot = Math.abs(carDirX * bDirX + carDirY * bDirY);

            if (dot > 0.55) {
                // Va en el sentido Norte-Sur -> ¡Pasa POR ARRIBA del puente elevado!
                car.setDepth(18);
                if (car.shadow) car.shadow.setDepth(16);
                if (car.headlights) car.headlights.setDepth(17);
                car.onBridgeDeck = true;
            } else {
                // Va en el sentido Este-Oeste -> ¡Pasa POR DEBAJO por el túnel inferior!
                car.setDepth(10);
                if (car.shadow) car.shadow.setDepth(9);
                if (car.headlights) car.headlights.setDepth(8);
                car.onBridgeDeck = false;
            }
        } else {
            // Fuera del área de cruce del puente: profundidad normal sobre la pista
            car.setDepth(10);
            if (car.shadow) car.shadow.setDepth(9);
            if (car.headlights) car.headlights.setDepth(selectedTimeOfDay === 'night' ? 9.5 : 7);
            car.onBridgeDeck = false;
        }
    });
}

// Actualizar sombras, faros día/noche y llamaradas de escape de todos los coches
function updateCarVisuals() {
    const all = [playerCar, ...aiCars];
    const isPlayerBraking = keys.down.isDown || keys.s.isDown || touchBrake;
    const isNight = selectedTimeOfDay === 'night';
    const isSunset = selectedTimeOfDay === 'sunset';

    all.forEach(car => {
        if (!car || !car.active) return;

        if (car.shadow) {
            car.shadow.x = car.x + 3;
            car.shadow.y = car.y + 4;
            car.shadow.angle = car.angle;
        }

        if (car.headlights) {
            car.headlights.clear();
            const rad = Phaser.Math.DegToRad(car.angle);
            const fx = car.x + Math.cos(rad) * 22;
            const fy = car.y + Math.sin(rad) * 22;

            // Iluminación frontal de faros:
            // DE DÍA: Los faros delanteros están APAGADOS (0 conos).
            // DE NOCHE o ATARDECER: Faros encendidos con haz amplio que rasga la oscuridad.
            if (isNight || isSunset) {
                const cone = 0.38;
                const dist = isNight ? 160 : 110;
                const beamAlpha = isNight ? 0.38 : 0.15;
                const coreAlpha = isNight ? 0.65 : 0.25;

                // Haz ambiental exterior
                car.headlights.fillStyle(0xfff9c4, beamAlpha);
                car.headlights.beginPath();
                car.headlights.moveTo(fx, fy);
                car.headlights.lineTo(fx + Math.cos(rad - cone) * dist, fy + Math.sin(rad - cone) * dist);
                car.headlights.lineTo(fx + Math.cos(rad + cone) * dist, fy + Math.sin(rad + cone) * dist);
                car.headlights.closePath();
                car.headlights.fill();

                // Haz central concentrado de xenón / LED
                car.headlights.fillStyle(0xffffff, coreAlpha);
                car.headlights.beginPath();
                car.headlights.moveTo(fx, fy);
                car.headlights.lineTo(fx + Math.cos(rad - 0.18) * (dist * 0.75), fy + Math.sin(rad - 0.18) * (dist * 0.75));
                car.headlights.lineTo(fx + Math.cos(rad + 0.18) * (dist * 0.75), fy + Math.sin(rad + 0.18) * (dist * 0.75));
                car.headlights.closePath();
                car.headlights.fill();

                // Proyectores ópticos dobles en el morro del GT3
                const perp = rad + Math.PI / 2;
                car.headlights.fillStyle(0xffffff, 0.95);
                car.headlights.fillCircle(fx + Math.cos(perp) * 6, fy + Math.sin(perp) * 6, 2.8);
                car.headlights.fillCircle(fx - Math.cos(perp) * 6, fy - Math.sin(perp) * 6, 2.8);
            }

            // Luces de posición y freno traseras rojas
            const rx = car.x - Math.cos(rad) * 20;
            const ry = car.y - Math.sin(rad) * 20;
            const perp = rad + Math.PI / 2;

            if (car.isPlayer && isPlayerBraking) {
                // Frenada intensa: pilotos traseros de freno al 100% de intensidad
                car.headlights.fillStyle(0xff1744, 0.85);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 5);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 5);
                car.headlights.fillStyle(0xffffff, 0.9);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 2);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 2);
            } else if (isNight || isSunset) {
                // Luz de posición trasera suave permanente de noche o atardecer
                car.headlights.fillStyle(0xd50000, 0.45);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 2.5);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 2.5);
            }
        }
    });
}

// Minimapa Radar
function renderMinimap(track) {
    if (!radarGraphics) return;
    radarGraphics.clear();

    const rx = 810, ry = 400, rw = 130, rh = 110;
    radarGraphics.fillStyle(0x0a0d14, 0.88);
    radarGraphics.fillRoundedRect(rx, ry, rw, rh, 6);
    radarGraphics.lineStyle(1, 0x00f5d4, 0.7);
    radarGraphics.strokeRoundedRect(rx, ry, rw, rh, 6);

    const sx = (rw - 16) / track.worldWidth;
    const sy = (rh - 16) / track.worldHeight;

    radarGraphics.lineStyle(2, 0x546e7a, 0.8);
    const nodes = track.nodes;
    if (nodes && nodes.length > 1) {
        radarGraphics.beginPath();
        radarGraphics.moveTo(rx + 8 + nodes[0].x * sx, ry + 8 + nodes[0].y * sy);
        for (let i = 1; i < nodes.length; i++) {
            radarGraphics.lineTo(rx + 8 + nodes[i].x * sx, ry + 8 + nodes[i].y * sy);
        }
        radarGraphics.closePath();
        radarGraphics.strokePath();
    }

    aiCars.forEach(ai => {
        radarGraphics.fillStyle(0xff1744, 1);
        radarGraphics.fillCircle(rx + 8 + ai.x * sx, ry + 8 + ai.y * sy, 2.5);
    });

    radarGraphics.fillStyle(0xfee440, 1);
    radarGraphics.fillCircle(rx + 8 + playerCar.x * sx, ry + 8 + playerCar.y * sy, 4);
}

// Clasificación de carrera
function updateStandings(track) {
    const list = [
        { car: playerCar, isPlayer: true, lap: playerLap, node: playerNextNodeIdx },
        ...aiCars.map(ai => ({ car: ai, isPlayer: false, lap: ai.currentLap, node: ai.targetNodeIdx }))
    ];

    list.sort((a, b) => {
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.node - a.node;
    });

    const rank = list.findIndex(c => c.isPlayer) + 1;
    if (hudPosText) hudPosText.setText(`POS: ${rank} / 6`);
}
