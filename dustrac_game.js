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
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
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
        this.playRumbleStrip(180);
    }

    playRumbleStrip(speedKmh = 180) {
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
        const now = this.ctx.currentTime;
        if (this._lastRumbleTime && now - this._lastRumbleTime < 0.065) return;
        this._lastRumbleTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const baseFreq = 75 + Math.min(60, (speedKmh / 420) * 60);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 1.35, now + 0.025);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        if (this.ctx.createBiquadFilter) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(340, now);
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playGearShift(gear = 2) {
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160 + gear * 18, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playSand() {
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
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
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
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
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
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
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
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

    playBoost() {
        if (!this.ctx || typeof this.ctx.createOscillator !== 'function') return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.22);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
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
window.phaserGame = game;
window.startRace = startRace;
window.showMenu = showMenu;

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
            { id: 'nordkette_pass', name: 'Nordkette Alpine Pass', desc: 'Paso de montaña alpino con horquillas', laps: 3, tod: 'day' },
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
window.STORY_CHAPTERS = STORY_CHAPTERS;
window.ALL_TRACK_IDS = ALL_TRACK_IDS;

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

let skidLayer, racingGrooveLayer, radarGraphics;
let trackBarriers = [];
let trackMarshals = [];
let hudPosText, hudLapText, hudTimeText, hudSpeedText, hudSurfaceText, hudGhostBadge, hudDriftBadge, hudSlipstreamBadge, hudTachoGfx, hudGearText, hudRpmText, lastPlayerGear = 1;
let playerInSlipstream = false;
let speedLinesGraphics, weatherGraphics;
let weatherParticles = [];

// Controles táctiles, freno de mano (derrape) y teclado
let keys = {};
let touchLeft = false, touchRight = false, touchGas = false, touchBrake = false, touchHandbrake = false;
let raceStartTime = 0;
let driftCharge = 0;
let driftBoostTimer = 0;

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

    // Coches base limpios con transparencia oficial inmediata
    this.load.image('car_red', p + 'carRed.png');
    this.load.image('car_blue', p + 'carBlue.png');
    this.load.image('car_yellow', p + 'carYellow.png');
    this.load.image('car_green', p + 'carGreen.png');
    this.load.image('car_cyan', p + 'carCyan.png');
    this.load.image('car_orange', p + 'carOrange.png');
    this.load.image('car_pink', p + 'carPink.png');
    this.load.image('car_grey', p + 'carGrey.png');

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
    if (!scene.textures.exists('gt_cars_sheet')) return;
    const tex = scene.textures.get('gt_cars_sheet');
    const src = tex ? tex.getSourceImage() : null;
    if (!src || !src.width) return;
    const cellW = 500, cellH = 330;
    const cells = [
        { key: 'car_yellow', c: 0, r: 0 }, // Manthey Porsche 911 GT3 Grello
        { key: 'car_red',    c: 1, r: 0 }, // Ferrari 488 GT3
        { key: 'car_blue',   c: 0, r: 1 }, // Aston Martin Vantage Valvoline
        { key: 'car_green',  c: 1, r: 1 }, // BMW M4 GT3 Rowe
        { key: 'car_pink',   c: 0, r: 2 }, // Iron Dames Lamborghini GT3
        { key: 'car_cyan',   c: 1, r: 2 }  // McLaren 720S Gulf
    ];
    const rowY = [20, 350, 690];

    cells.forEach(cell => {
        try {
            const sx = cell.c * 512 + 6;
            const sy = rowY[cell.r];
            const w = Math.min(cellW, src.width - sx);
            const h = Math.min(cellH, src.height - sy);
            if (w <= 0 || h <= 0) return;

            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);

            const img = tctx.getImageData(0, 0, w, h);
            const d = img.data;
            const lumAt = (p) => Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
            const BG = 38;
            const seen = new Uint8Array(w * h);
            const stack = [];
            for (let x = 0; x < w; x++) {
                stack.push(x); seen[x] = 1;
                const bottom = (h - 1) * w + x;
                stack.push(bottom); seen[bottom] = 1;
            }
            for (let y = 0; y < h; y++) {
                const left = y * w;
                if (!seen[left]) { stack.push(left); seen[left] = 1; }
                const right = y * w + w - 1;
                if (!seen[right]) { stack.push(right); seen[right] = 1; }
            }
            while (stack.length) {
                const p = stack.pop();
                if (lumAt(p) >= BG) continue;
                d[p * 4 + 3] = 0;
                const x = p % w, y = (p / w) | 0;
                if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
                if (x < w - 1 && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
                if (y > 0 && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
                if (y < h - 1 && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
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
            octx.translate(bw, 0);
            octx.scale(-1, 1);
            octx.drawImage(tmp, minX, minY, bw, bh, 0, 0, bw, bh);

            if (scene.textures.exists(cell.key)) scene.textures.remove(cell.key);
            scene.textures.addCanvas(cell.key, out);

            // Registrar alias para McLaren y compatibilidad
            if (cell.key === 'car_cyan') {
                if (scene.textures.exists('car_orange')) scene.textures.remove('car_orange');
                scene.textures.addCanvas('car_orange', out);
            }
            if (cell.key === 'car_green') {
                // Generar variante Gris / Plata metálico oficial para car_grey
                const greyCv = document.createElement('canvas');
                greyCv.width = bw; greyCv.height = bh;
                const gctx = greyCv.getContext('2d');
                gctx.drawImage(out, 0, 0);
                const gImg = gctx.getImageData(0, 0, bw, bh);
                const gd = gImg.data;
                for (let p = 0; p < gd.length; p += 4) {
                    if (gd[p + 3] > 10) {
                        const lum = (0.299 * gd[p] + 0.587 * gd[p+1] + 0.114 * gd[p+2]) | 0;
                        gd[p] = (gd[p] * 0.25 + lum * 0.75) | 0;
                        gd[p+1] = (gd[p+1] * 0.25 + lum * 0.75) | 0;
                        gd[p+2] = (gd[p+2] * 0.25 + lum * 0.75) | 0;
                    }
                }
                gctx.putImageData(gImg, 0, 0);
                if (scene.textures.exists('car_grey')) scene.textures.remove('car_grey');
                scene.textures.addCanvas('car_grey', greyCv);
            }
        } catch(err) {
            console.warn('Error recortando sprite GT3:', cell.key, err);
        }
    });
}

// Ajustar brillo de un color hexadecimal
function adjustBrightness(hex, percent) {
    if (!hex) return '#333333';
    let clean = String(hex).replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    if (isNaN(num)) return hex;
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Generador procedural de coches cenitales GT3 y superdeportivos de ultra alta resolución (140x70px)
function renderTopDownArchetypeCanvas(colorHex, archetype = 'lambo_wedge') {
    return null;

    const baseColor = colorHex || '#e53935';
    const darkShade = adjustBrightness(baseColor, -35);
    const midDark = adjustBrightness(baseColor, -15);
    const lightGleam = adjustBrightness(baseColor, 40);

    // 1. Sombra suave bajo el chasis (Ambient Occlusion & difusor)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 1, 58, 27, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Ruedas de competición anchas (Pirelli P-Zero / Michelin slicks con pinzas Brembo y llantas BBS)
    const wheels = [
        { x: 104, y: 10 },
        { x: 104, y: 60 },
        { x: 34, y: 9 },
        { x: 34, y: 61 }
    ];

    wheels.forEach(wh => {
        // Goma del neumático (slick ancho)
        ctx.fillStyle = '#0f131a';
        ctx.fillRect(wh.x - 13, wh.y - 5.5, 26, 11);

        // Flanco oscuro
        ctx.fillStyle = '#1e2430';
        ctx.fillRect(wh.x - 11, wh.y - 4.5, 22, 9);

        // Disco de freno perforado de carbono-cerámica
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(wh.x, wh.y, 6.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pinza de freno Brembo en rojo o amarillo de carreras
        ctx.fillStyle = (archetype === 'ferrari_corsa' || archetype === 'porsche_boxer') ? '#eab308' : '#dc2626';
        ctx.fillRect(wh.x + 2, wh.y - 3.5, 4, 7);

        // Llanta multirradio grafito / titanio
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(wh.x, wh.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b'; // Tuerca central de bloqueo de rueda monotuerca
        ctx.beginPath();
        ctx.arc(wh.x, wh.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Carrocería aerodinámica según arquetipo
    ctx.save();
    const bodyGrad = ctx.createLinearGradient(0, 10, 0, 60);
    bodyGrad.addColorStop(0, darkShade);
    bodyGrad.addColorStop(0.20, baseColor);
    bodyGrad.addColorStop(0.50, lightGleam);
    bodyGrad.addColorStop(0.80, baseColor);
    bodyGrad.addColorStop(1, darkShade);

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    if (archetype === 'lambo_wedge') {
        ctx.moveTo(126, 35);
        ctx.lineTo(116, 16);
        ctx.lineTo(92, 13);
        ctx.lineTo(74, 16);
        ctx.lineTo(50, 13);
        ctx.lineTo(24, 14);
        ctx.lineTo(14, 20);
        ctx.lineTo(10, 35);
        ctx.lineTo(14, 50);
        ctx.lineTo(24, 56);
        ctx.lineTo(50, 57);
        ctx.lineTo(74, 54);
        ctx.lineTo(92, 57);
        ctx.lineTo(116, 54);
        ctx.closePath();
    } else if (archetype === 'ferrari_corsa') {
        ctx.moveTo(127, 35);
        ctx.quadraticCurveTo(124, 15, 108, 14);
        ctx.lineTo(90, 13);
        ctx.quadraticCurveTo(72, 18, 54, 14);
        ctx.quadraticCurveTo(34, 12, 18, 18);
        ctx.lineTo(12, 35);
        ctx.lineTo(18, 52);
        ctx.quadraticCurveTo(34, 58, 54, 56);
        ctx.quadraticCurveTo(72, 52, 90, 57);
        ctx.quadraticCurveTo(124, 55, 127, 35);
        ctx.closePath();
    } else if (archetype === 'porsche_boxer') {
        ctx.moveTo(124, 35);
        ctx.quadraticCurveTo(122, 16, 105, 15);
        ctx.lineTo(85, 14);
        ctx.quadraticCurveTo(68, 17, 52, 15);
        ctx.quadraticCurveTo(30, 10, 16, 18);
        ctx.quadraticCurveTo(10, 26, 10, 35);
        ctx.quadraticCurveTo(10, 44, 16, 52);
        ctx.quadraticCurveTo(30, 60, 52, 55);
        ctx.quadraticCurveTo(68, 53, 85, 56);
        ctx.quadraticCurveTo(122, 54, 124, 35);
        ctx.closePath();
    } else if (archetype === 'viper_acr') {
        ctx.moveTo(126, 35);
        ctx.lineTo(120, 17);
        ctx.lineTo(68, 14);
        ctx.lineTo(50, 16);
        ctx.lineTo(26, 13);
        ctx.lineTo(12, 19);
        ctx.lineTo(10, 35);
        ctx.lineTo(12, 51);
        ctx.lineTo(26, 57);
        ctx.lineTo(50, 54);
        ctx.lineTo(68, 56);
        ctx.lineTo(120, 53);
        ctx.closePath();
    } else if (archetype === 'bugatti_w16') {
        ctx.moveTo(127, 35);
        ctx.quadraticCurveTo(125, 15, 106, 14);
        ctx.lineTo(80, 13);
        ctx.quadraticCurveTo(62, 19, 44, 14);
        ctx.quadraticCurveTo(22, 12, 12, 22);
        ctx.lineTo(8, 35);
        ctx.lineTo(12, 48);
        ctx.quadraticCurveTo(22, 58, 44, 56);
        ctx.quadraticCurveTo(62, 51, 80, 57);
        ctx.quadraticCurveTo(125, 55, 127, 35);
        ctx.closePath();
    } else if (archetype === 'le_mans_proto') {
        ctx.moveTo(128, 35);
        ctx.lineTo(122, 14);
        ctx.lineTo(98, 12);
        ctx.lineTo(86, 17);
        ctx.lineTo(40, 17);
        ctx.lineTo(24, 11);
        ctx.lineTo(10, 14);
        ctx.lineTo(8, 35);
        ctx.lineTo(10, 56);
        ctx.lineTo(24, 59);
        ctx.lineTo(40, 53);
        ctx.lineTo(86, 53);
        ctx.lineTo(98, 58);
        ctx.lineTo(122, 56);
        ctx.closePath();
    } else if (archetype === 'dakar_truck') {
        ctx.moveTo(122, 35);
        ctx.lineTo(118, 13);
        ctx.lineTo(48, 12);
        ctx.lineTo(20, 12);
        ctx.lineTo(16, 35);
        ctx.lineTo(20, 58);
        ctx.lineTo(48, 58);
        ctx.lineTo(118, 57);
        ctx.closePath();
    } else {
        // Superdeportivo GT estándar / DTM / JDM
        ctx.moveTo(126, 35);
        ctx.lineTo(118, 17);
        ctx.lineTo(86, 14);
        ctx.lineTo(64, 15);
        ctx.lineTo(26, 13);
        ctx.lineTo(14, 18);
        ctx.lineTo(10, 35);
        ctx.lineTo(14, 52);
        ctx.lineTo(26, 57);
        ctx.lineTo(64, 55);
        ctx.lineTo(86, 56);
        ctx.lineTo(118, 53);
        ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // 4. Franja doble de competición GT (Racing Stripes en contraste)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.fillRect(20, 32, 100, 2);
    ctx.fillRect(20, 36, 100, 2);

    // 5. Splitter frontal de fibra de carbono y canards
    ctx.fillStyle = '#090d16';
    ctx.fillRect(122, 26, 6, 18);
    ctx.fillRect(118, 15, 6, 4);
    ctx.fillRect(118, 51, 6, 4);

    // Difusor trasero con aletas verticales
    ctx.fillRect(8, 22, 8, 26);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 26, 6, 2);
    ctx.fillRect(8, 34, 6, 2);
    ctx.fillRect(8, 42, 6, 2);

    // 6. Retrovisores aerodinámicos de carbono
    ctx.fillStyle = '#090d16';
    ctx.fillRect(88, 10, 4, 3);
    ctx.fillRect(88, 57, 4, 3);
    ctx.fillStyle = baseColor;
    ctx.fillRect(87, 8, 6, 3);
    ctx.fillRect(87, 59, 6, 3);

    // 7. Cabina y Cristales tintados con curvatura realista y reflejo especular
    const glassGrad = ctx.createLinearGradient(45, 20, 95, 50);
    glassGrad.addColorStop(0, '#060a12');
    glassGrad.addColorStop(0.5, '#1e293b');
    glassGrad.addColorStop(1, '#060a12');
    ctx.fillStyle = glassGrad;

    ctx.beginPath();
    ctx.moveTo(96, 35);
    ctx.lineTo(84, 21);
    ctx.lineTo(54, 20);
    ctx.lineTo(40, 24);
    ctx.lineTo(36, 35);
    ctx.lineTo(40, 46);
    ctx.lineTo(54, 50);
    ctx.lineTo(84, 49);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Reflejos especulares blancos estilizados en el parabrisas
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(90, 24);
    ctx.lineTo(68, 44);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(92, 29);
    ctx.lineTo(76, 44);
    ctx.stroke();

    // Escobilla del limpiaparabrisas
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(86, 35);
    ctx.lineTo(72, 26);
    ctx.stroke();

    // Asientos baquet de competición visibles en el habitáculo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(52, 25, 8, 7);
    ctx.fillRect(52, 38, 8, 7);
    ctx.fillStyle = '#dc2626'; // Arneses de 6 puntos rojos
    ctx.fillRect(55, 27, 2, 5);
    ctx.fillRect(55, 40, 2, 5);

    // Techo central de fibra de carbono
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(56, 25, 22, 20);

    // 8. Louvers / Extractores de aire del capó
    ctx.fillStyle = '#090d16';
    ctx.fillRect(106, 27, 8, 2);
    ctx.fillRect(106, 41, 8, 2);
    ctx.fillRect(100, 29, 6, 2);
    ctx.fillRect(100, 39, 6, 2);

    // 9. Tapa motor trasera y admisión de colectores V8/V10/V12
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(38, 28, 12, 14);
    ctx.fillStyle = '#cbd5e1'; // Colectores cromados
    ctx.fillRect(40, 30, 8, 2);
    ctx.fillRect(40, 34, 8, 2);
    ctx.fillRect(40, 38, 8, 2);

    // 10. Alerón trasero GT3 de carbono con soportes de cuello de cisne
    if (archetype !== 'hot_hatch') {
        const wingX = (archetype === 'viper_acr' || archetype === 'le_mans_proto') ? 14 : 18;
        // Hoja del alerón en carbono
        ctx.fillStyle = '#060a12';
        ctx.fillRect(wingX - 4, 13, 8, 44);
        // Soportes metálicos
        ctx.fillStyle = '#475569';
        ctx.fillRect(wingX, 28, 5, 2.5);
        ctx.fillRect(wingX, 39, 5, 2.5);
        // Endplates aerodinámicos en el color del coche
        ctx.fillStyle = baseColor;
        ctx.fillRect(wingX - 6, 11, 11, 3.5);
        ctx.fillRect(wingX - 6, 55, 11, 3.5);
    }

    // 11. Escapes de titanio con halo de calor azulado
    ctx.fillStyle = '#0284c7'; // Azul titanio
    ctx.beginPath();
    ctx.arc(10, 31, 2.4, 0, Math.PI * 2);
    ctx.arc(10, 39, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a'; // Interior hueco del tubo de escape
    ctx.beginPath();
    ctx.arc(10, 31, 1.4, 0, Math.PI * 2);
    ctx.arc(10, 39, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 12. Faros delanteros proyectores LED Xenón
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(118, 19, 5, 3.5);
    ctx.fillRect(118, 47, 5, 3.5);
    ctx.fillStyle = '#38bdf8'; // Halo LED azul cielo
    ctx.fillRect(115, 19, 3, 3.5);
    ctx.fillRect(115, 47, 3, 3.5);

    // 13. Barra LED trasera roja de freno
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(12, 20, 3.5, 5);
    ctx.fillRect(12, 45, 3.5, 5);
    ctx.fillRect(11, 25, 2, 20); // Tira central de luz continua

    ctx.restore();
    return cv;
}

// Obtener textura de supercoche GT3 fotorrealista con silueta de arquetipo y color exacto
function getOrCreateColoredCarTexture(scene, colorHex, fallbackKey = 'car_red', archetype = 'lambo_wedge') {
    if (!scene || !scene.textures) return fallbackKey;
    if (!colorHex) return fallbackKey;

    const cleanHex = String(colorHex).toLowerCase().replace('#', '');
    const cleanArch = String(archetype || 'lambo_wedge').toLowerCase();
    const customKey = `car_gt3_${cleanArch}_${cleanHex}`;
    if (scene.textures.exists(customKey)) return customKey;

    // 1. Determinar el modelo GT3 fotorrealista base según el arquetipo / fabricante:
    let baseKey = 'car_red'; // Por defecto Ferrari 488 GT3
    if (cleanArch.includes('porsche') || cleanArch.includes('boxer')) {
        baseKey = 'car_yellow'; // Porsche 911 GT3 Manthey Grello
    } else if (cleanArch.includes('ferrari') || cleanArch.includes('corsa') || cleanArch.includes('proto')) {
        baseKey = 'car_red';    // Ferrari 488 GT3 Scuderia
    } else if (cleanArch.includes('lambo') || cleanArch.includes('wedge') || cleanArch.includes('dakar')) {
        baseKey = 'car_pink';   // Lamborghini Huracán GT3 (Iron Dames)
    } else if (cleanArch.includes('mclaren') || cleanArch.includes('bugatti') || cleanArch.includes('supra') || cleanArch.includes('cyan')) {
        baseKey = 'car_cyan';   // McLaren 720S Gulf GT3
    } else if (cleanArch.includes('bmw') || cleanArch.includes('coupe') || cleanArch.includes('rally') || cleanArch.includes('hatch')) {
        baseKey = 'car_green';  // BMW M4 GT3 ROWE Motorsport
    } else if (cleanArch.includes('bentley') || cleanArch.includes('viper') || cleanArch.includes('aston')) {
        baseKey = 'car_blue';   // Aston Martin Vantage AMR GT3
    }

    // 2. Mapeo directo por color si coincide con los colores oficiales de las marcas GT3:
    const colorToKeyMap = {
        'ec4899': 'car_pink', 'f472b6': 'car_pink', 'd946ef': 'car_pink',
        '0284c7': 'car_blue', '1d4ed8': 'car_blue', '38bdf8': 'car_blue',
        '06b6d4': 'car_cyan', '00f5d4': 'car_cyan',
        'facc15': 'car_yellow', 'eab308': 'car_yellow', 'fde047': 'car_yellow',
        '15803d': 'car_green', '84cc16': 'car_green', 'a3e635': 'car_green',
        'ea580c': 'car_orange', 'f97316': 'car_orange',
        'e53935': 'car_red', '991b1b': 'car_red', 'ef4444': 'car_red',
        '1e293b': 'car_grey', '64748b': 'car_grey', '94a3b8': 'car_grey', 'f8fafc': 'car_grey'
    };

    if (colorToKeyMap[cleanHex] && scene.textures.exists(colorToKeyMap[cleanHex])) {
        return colorToKeyMap[cleanHex];
    }

    // 3. Si es un color personalizado, tintar sobre el superdeportivo GT3 fotorrealista base:
    try {
        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
            if (!scene.textures.exists(baseKey)) {
                const pool = ['car_red', 'car_blue', 'car_yellow', 'car_green', 'car_cyan', 'car_pink'];
                for (const k of pool) {
                    if (scene.textures.exists(k)) { baseKey = k; break; }
                }
            }

            if (scene.textures.exists(baseKey)) {
                const baseTex = scene.textures.get(baseKey);
                const src = baseTex ? baseTex.getSourceImage() : null;
                if (src && src.width && src.height) {
                    const cv = document.createElement('canvas');
                    cv.width = src.width;
                    cv.height = src.height;
                    const ctx = cv.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(src, 0, 0);

                        // Tinte con preservación de sombras, transparencias y elementos mecánicos
                        const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
                        const d = imgData.data;

                        const rT = parseInt(cleanHex.slice(0, 2), 16) || 200;
                        const gT = parseInt(cleanHex.slice(2, 4), 16) || 50;
                        const bT = parseInt(cleanHex.slice(4, 6), 16) || 50;

                        for (let p = 0; p < d.length; p += 4) {
                            const a = d[p + 3];
                            if (a > 15) {
                                const r = d[p], g = d[p + 1], b = d[p + 2];
                                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                                const maxC = Math.max(r, g, b);
                                const minC = Math.min(r, g, b);
                                const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

                                // No tintar sombras oscuras / neumáticos / fibra de carbono (lum < 30)
                                // ni reflejos blancos del parabrisas (lum > 230 con muy baja saturación)
                                if (lum > 30 && !(lum > 230 && sat < 0.12)) {
                                    const blend = Math.min(1.0, Math.max(0.40, sat * 1.15));
                                    d[p] = Math.round(r * (1 - blend) + ((rT * lum) / 255) * blend);
                                    d[p + 1] = Math.round(g * (1 - blend) + ((gT * lum) / 255) * blend);
                                    d[p + 2] = Math.round(b * (1 - blend) + ((bT * lum) / 255) * blend);
                                }
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);

                        if (scene.textures.exists(customKey)) scene.textures.remove(customKey);
                        scene.textures.addCanvas(customKey, cv);
                        return customKey;
                    }
                }
            }
        }
    } catch(e) {
        console.warn('Error tintando coche GT3:', e);
    }

    return scene.textures.exists(baseKey) ? baseKey : fallbackKey;
}

// Inicializar partículas climáticas dinámicas según bioma y meteorología (Lluvia, Nieve, Polvo)
function initWeatherParticles(biome) {
    weatherParticles = [];
    const isRain = selectedTimeOfDay === 'rain';
    const count = isRain ? 95 : 45;
    for (let i = 0; i < count; i++) {
        weatherParticles.push({
            x: Math.random() * 960,
            y: Math.random() * 540,
            vx: isRain ? -2.2 - Math.random() * 1.8 : (Math.random() - 0.5) * 1.5,
            vy: isRain ? 9.5 + Math.random() * 6.5 : 1.5 + Math.random() * 2.5,
            size: isRain ? 14 + Math.random() * 10 : 1.5 + Math.random() * 2.5,
            alpha: isRain ? 0.45 + Math.random() * 0.45 : 0.3 + Math.random() * 0.5,
            wiggle: Math.random() * Math.PI * 2
        });
    }
}

// Generar texturas HD profesionales de cartelería, vallas, Tecpro y pórtico
function buildProRacingEnvironmentTextures(scene) {
    if (!scene || !scene.textures || typeof document === 'undefined' || !document.createElement) return;

    const makeTex = (key, w, h, drawFn) => {
        try {
            if (scene.textures.exists(key)) return;
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext ? cv.getContext('2d') : null;
            if (!ctx) return;
            drawFn(ctx, w, h);
            scene.textures.addCanvas(key, cv);
        } catch(e) {}
    };

    // 1. Valla PIRELLI (Amarillo y Rojo Motorsport)
    makeTex('dt_billboard_pirelli', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#facc15'; ctx.fillRect(2, 2, w - 4, 3); ctx.fillRect(2, h - 5, w - 4, 3);
        ctx.font = '900 18px Arial Black, sans-serif';
        ctx.fillStyle = '#dc2626'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PIRELLI', w / 2, h / 2);
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1; ctx.strokeText('PIRELLI', w / 2, h / 2);
    });

    // 2. Valla BREMBO (Rojo y Blanco)
    makeTex('dt_billboard_brembo', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 4, 14, 14);
        ctx.beginPath(); ctx.arc(11, 11, 5, 0, Math.PI * 2); ctx.fillStyle = '#dc2626'; ctx.fill();
        ctx.font = 'bold 17px Arial, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('brembo', w / 2 + 8, h / 2);
    });

    // 3. Valla MOTUL 300V
    makeTex('dt_billboard_motul', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#be123c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(w - 10, 0); ctx.lineTo(w - 20, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        ctx.font = '900 18px Arial Black, sans-serif';
        ctx.fillStyle = '#be123c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('MOTUL', w / 2 - 10, h / 2);
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px Arial'; ctx.fillText('300V', w - 24, h / 2);
    });

    // 4. Valla DUSTRAC GT (Carbon & Neon Cyan)
    makeTex('dt_billboard_dustrac', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#00f5d4'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.font = '900 16px Arial, sans-serif';
        ctx.fillStyle = '#00f5d4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('DUSTRAC GT', w / 2, h / 2);
    });

    // 5. Valla MICHELIN (Azul Real y Amarillo)
    makeTex('dt_billboard_michelin', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fde047'; ctx.fillRect(0, h - 6, w, 6);
        ctx.font = '900 16px Arial, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('MICHELIN', w / 2, h / 2 - 2);
    });

    // 6. Valla BADLANDS APEX (Negro y Oro)
    makeTex('dt_billboard_badlands', 130, 36, (ctx, w, h) => {
        ctx.fillStyle = '#18181b'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.font = '900 15px Arial, sans-serif';
        ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('BADLANDS APEX', w / 2, h / 2);
    });

    // 7. Barrera de Seguridad Tecpro (Rojo y Blanco)
    makeTex('dt_tecpro_barrier', 96, 26, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
        const segW = 16;
        for (let x = 0; x < w; x += segW) {
            const isRed = (x / segW) % 2 === 0;
            ctx.fillStyle = isRed ? '#dc2626' : '#ffffff';
            ctx.fillRect(x + 1, 2, segW - 2, h - 4);
            ctx.fillStyle = isRed ? '#991b1b' : '#cbd5e1';
            ctx.fillRect(x + 1, h - 6, segW - 2, 4);
        }
        ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, h - 2, w, 2);
    });

    // 7.1 Quitamiedos Metálico de Doble Onda Armco (256px y 96px)
    makeTex('dt_armco_long', 256, 22, (ctx, w, h) => {
        // Base de sombra metálica
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, w, h);
        // Chapa ondulada galvanizada
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 2, w, h - 4);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, 4, w, 4); // Brillo superior
        ctx.fillStyle = '#64748b'; ctx.fillRect(0, 11, w, 5); // Hendidura de onda
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 16, w, 2); // Reborde inferior
        // Postes verticales y reflectores cada 32px
        for (let x = 8; x < w; x += 32) {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(x - 2, 0, 4, h); // Poste de acero
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(x - 1, 2, 2, 4); // Reflector azul/blanco
            ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 1, 14, 2, 4); // Reflector rojo
        }
    });

    makeTex('dt_armco_short', 96, 22, (ctx, w, h) => {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 2, w, h - 4);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, 4, w, 4);
        ctx.fillStyle = '#64748b'; ctx.fillRect(0, 11, w, 5);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 16, w, 2);
        for (let x = 8; x < w; x += 24) {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(x - 2, 0, 4, h);
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(x - 1, 2, 2, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 1, 14, 2, 4);
        }
    });

    // 8. Flechas de Horquilla Chevron (>>>)
    makeTex('dt_corner_chevron', 48, 32, (ctx, w, h) => {
        ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#facc15'; ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#090d16';
        [8, 22, 36].forEach(cx => {
            ctx.beginPath();
            ctx.moveTo(cx - 5, 6); ctx.lineTo(cx + 3, 16); ctx.lineTo(cx - 5, 26);
            ctx.lineTo(cx - 1, 26); ctx.lineTo(cx + 7, 16); ctx.lineTo(cx - 1, 6);
            ctx.closePath(); ctx.fill();
        });
    });

    // 9. Puesto de Comisario con Bandera
    makeTex('dt_marshal_stand', 52, 52, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 36, 36);
        ctx.fillStyle = '#334155'; ctx.fillRect(10, 10, 32, 32);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 32, 32);
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(26, 26, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e'; ctx.fillRect(32, 12, 12, 8);
    });

    // 10. Pórtico de Meta Elevado (Gantry Truss)
    makeTex('dt_gantry_overhead', 280, 52, (ctx, w, h) => {
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.strokeRect(1, 1, w - 2, h - 2);
        for (let x = 10; x < w; x += 24) {
            ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + 16, h - 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 16, 2); ctx.lineTo(x, h - 2); ctx.stroke();
        }
        ctx.fillStyle = '#090d16'; ctx.fillRect(50, 8, 180, 36);
        ctx.strokeStyle = '#00f5d4'; ctx.lineWidth = 2; ctx.strokeRect(50, 8, 180, 36);
        ctx.font = '900 16px Arial Black, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('START  🏁  FINISH', w / 2, h / 2 - 4);
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.fillStyle = '#00f5d4'; ctx.fillText('DUSTRAC WORLD CHAMPIONSHIP', w / 2, h / 2 + 10);
        [240, 248, 256, 264, 272].forEach(lx => {
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(lx, 26, 3, 0, Math.PI * 2); ctx.fill();
        });
        [8, 16, 24, 32, 40].forEach(lx => {
            ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(lx, 26, 3, 0, Math.PI * 2); ctx.fill();
        });
    });

    // 11. Arcos y Pórticos de Patrocinio de lado a lado sobre la pista (280x52px)
    const makeOverheadArch = (key, drawBrandBanner) => {
        makeTex(key, 280, 52, (ctx, w, h) => {
            // Estructura de celosía metálica de acero
            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.strokeRect(1, 1, w - 2, h - 2);

            // Celosía cruzada
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2;
            for (let x = 8; x < w; x += 20) {
                ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + 14, h - 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + 14, 2); ctx.lineTo(x, h - 2); ctx.stroke();
            }

            // Pilar izquierdo sobre el césped
            ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 36, h);
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 32, h - 4);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(5, 6, 26, 6); ctx.fillRect(5, 22, 26, 6); ctx.fillRect(5, 38, 26, 6);

            // Pilar derecho sobre el césped
            ctx.fillStyle = '#1e293b'; ctx.fillRect(w - 36, 0, 36, h);
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect(w - 34, 2, 32, h - 4);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(w - 31, 6, 26, 6); ctx.fillRect(w - 31, 22, 26, 6); ctx.fillRect(w - 31, 38, 26, 6);

            // Panel central de patrocinador (ancho 200px, centrado sobre el asfalto)
            const bx = 40, by = 6, bw = 200, bh = 40;
            ctx.save();
            ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
            drawBrandBanner(ctx, bx, by, bw, bh);
            ctx.restore();

            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
        });
    };

    // MOTUL 300V Arch
    makeOverheadArch('dt_arch_motul', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#be123c'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(bx + 14, by); ctx.lineTo(bx + bw - 14, by); ctx.lineTo(bx + bw - 28, by + bh); ctx.lineTo(bx, by + bh);
        ctx.closePath(); ctx.fill();
        ctx.font = '900 20px Arial Black, sans-serif';
        ctx.fillStyle = '#be123c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('MOTUL', bx + bw / 2 - 16, by + bh / 2);
        ctx.fillStyle = '#0f172a'; ctx.font = '900 13px Arial';
        ctx.fillText('300V', bx + bw - 32, by + bh / 2);
    });

    // PIRELLI Arch
    makeOverheadArch('dt_arch_pirelli', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#facc15'; ctx.fillRect(bx, by, bw, 3); ctx.fillRect(bx, by + bh - 4, bw, 3);
        ctx.font = '900 21px Arial Black, sans-serif';
        ctx.fillStyle = '#dc2626'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PIRELLI', bx + bw / 2, by + bh / 2);
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1; ctx.strokeText('PIRELLI', bx + bw / 2, by + bh / 2);
    });

    // MICHELIN Arch
    makeOverheadArch('dt_arch_michelin', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#fde047'; ctx.fillRect(bx, by + bh - 6, bw, 6);
        ctx.font = '900 20px Arial, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('MICHELIN', bx + bw / 2, by + bh / 2 - 2);
    });

    // BREMBO Arch
    makeOverheadArch('dt_arch_brembo', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#dc2626'; ctx.fillRect(bx, by, bw, bh);
        ctx.font = '900 19px Arial, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('brembo RACING', bx + bw / 2, by + bh / 2);
    });

    // CASTROL EDGE Arch
    makeOverheadArch('dt_arch_castrol', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#059669'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(bx, by, bw, 3);
        ctx.font = '900 19px Arial Black, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CASTROL EDGE', bx + bw / 2, by + bh / 2);
    });

    // BADLANDS APEX Arch
    makeOverheadArch('dt_arch_badlands', (ctx, bx, by, bw, bh) => {
        ctx.fillStyle = '#111827'; ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
        ctx.font = '900 18px Arial, sans-serif';
        ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('BADLANDS APEX GP', bx + bw / 2, by + bh / 2);
    });

    // 12. Paneles de Distancia de Frenada (150m, 100m, 50m) estilo FIA GT
    makeTex('dt_brake_150', 38, 22, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1, 1, w - 2, h - 2);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(w - 7, 2, 4, h - 4);
        ctx.fillRect(w - 13, 2, 4, h - 4);
        ctx.fillRect(w - 19, 2, 4, h - 4);
        ctx.fillStyle = '#090d16'; ctx.font = '900 13px Arial Black, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('150', 3, h / 2);
    });

    makeTex('dt_brake_100', 38, 22, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1, 1, w - 2, h - 2);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(w - 7, 2, 4, h - 4);
        ctx.fillRect(w - 13, 2, 4, h - 4);
        ctx.fillStyle = '#090d16'; ctx.font = '900 13px Arial Black, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('100', 3, h / 2);
    });

    makeTex('dt_brake_50', 38, 22, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1, 1, w - 2, h - 2);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(w - 7, 2, 4, h - 4);
        ctx.fillStyle = '#090d16'; ctx.font = '900 13px Arial Black, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('50', 5, h / 2);
    });

    // 13. Vehículos Oficiales de Pista: Safety Car GT3
    makeTex('dt_safety_car', 64, 28, (ctx, w, h) => {
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(4, 3, w - 8, h - 6);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(12, 5, 20, h - 10);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(14, 7, 16, h - 14);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(20, 2, 8, 3); ctx.fillRect(20, h - 5, 8, 3);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(23, 2, 2, 3); ctx.fillRect(23, h - 5, 2, 3);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(0, 11, w, 6);
        ctx.fillStyle = '#000000'; ctx.font = '900 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('SAFETY CAR', w / 2 + 6, h / 2);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(w - 4, 4, 3, 4); ctx.fillRect(w - 4, h - 8, 3, 4);
    });

    // 14. Vehículo Oficial de Intervención Rápida / Médico
    makeTex('dt_medical_car', 60, 26, (ctx, w, h) => {
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(4, 3, w - 8, h - 6);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(12, 5, 22, h - 10);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(14, 7, 18, h - 14);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(w - 14, h / 2 - 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(w - 12, h / 2 - 1, 4, 2); ctx.fillRect(w - 11, h / 2 - 2, 2, 4);
        ctx.fillStyle = '#0284c7'; ctx.fillRect(22, 2, 8, 3); ctx.fillRect(22, h - 5, 8, 3);
    });

    // 15. Camión Grúa de Asistencia FIA
    makeTex('dt_recovery_crane', 66, 30, (ctx, w, h) => {
        ctx.fillStyle = '#eab308'; ctx.fillRect(2, 4, 26, h - 8);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(6, 6, 12, h - 12);
        ctx.fillStyle = '#475569'; ctx.fillRect(28, 5, w - 30, h - 10);
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(34, h / 2); ctx.lineTo(w - 6, h / 2 - 5); ctx.stroke();
        ctx.fillStyle = '#dc2626'; ctx.fillRect(w - 4, 6, 3, h - 12);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(w - 4, 9, 3, 3); ctx.fillRect(w - 4, h - 12, 3, 3);
    });

    // 16. Banderas ondeantes de circuito para las gradas
    makeTex('dt_flag_checkered', 26, 16, (ctx, w, h) => {
        ctx.fillStyle = '#475569'; ctx.fillRect(0, 0, 2, h);
        for (let x = 2; x < w; x += 6) {
            for (let y = 0; y < h; y += 4) {
                const isBlack = (Math.floor((x - 2) / 6) + Math.floor(y / 4)) % 2 === 0;
                ctx.fillStyle = isBlack ? '#090d16' : '#ffffff';
                ctx.fillRect(x, y, 6, 4);
            }
        }
    });

    makeTex('dt_flag_red', 26, 16, (ctx, w, h) => {
        ctx.fillStyle = '#475569'; ctx.fillRect(0, 0, 2, h);
        ctx.fillStyle = '#dc2626'; ctx.fillRect(2, 0, w - 2, h);
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(14, h / 2, 4, 0, Math.PI * 2); ctx.fill();
    });

    makeTex('dt_flag_blue', 26, 16, (ctx, w, h) => {
        ctx.fillStyle = '#475569'; ctx.fillRect(0, 0, 2, h);
        ctx.fillStyle = '#0284c7'; ctx.fillRect(2, 0, w - 2, h);
        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(4, 0); ctx.lineTo(w, h - 4); ctx.lineTo(w, h); ctx.lineTo(4, 4); ctx.fill();
    });

    // 17. Bengalas de celebración y humo de gradas (Tifosi Smoke)
    makeTex('dt_smoke_flare_red', 32, 48, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.beginPath(); ctx.arc(w / 2, 16, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.55)';
        ctx.beginPath(); ctx.arc(w / 2 - 4, 28, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(185, 28, 28, 0.35)';
        ctx.beginPath(); ctx.arc(w / 2 + 4, 38, 8, 0, Math.PI * 2); ctx.fill();
    });

    makeTex('dt_smoke_flare_yellow', 32, 48, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.75)';
        ctx.beginPath(); ctx.arc(w / 2, 16, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.beginPath(); ctx.arc(w / 2 - 4, 28, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
        ctx.beginPath(); ctx.arc(w / 2 + 4, 38, 8, 0, Math.PI * 2); ctx.fill();
    });

    // 18. Torre de Iluminación de Estadio con Focos de Alta Potencia (Floodlight)
    makeTex('dt_floodlight_tower', 44, 44, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(16, 16, 12, 26);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.strokeRect(17, 17, 10, 24);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 4, 40, 10);
        ctx.strokeStyle = '#94a3b8'; ctx.strokeRect(2, 4, 40, 10);
        [6, 16, 26, 36].forEach(bx => {
            ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(bx, 9, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, 9, 1.8, 0, Math.PI * 2); ctx.fill();
        });
    });

    // 19. Cono de Luz Suave sobre el Asfalto (Night Light Pool)
    makeTex('dt_light_cone', 180, 180, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2); ctx.fill();
    });

    // 20. Humo Volumétrico Suave de Derrape / Neumático
    makeTex('dt_tire_smoke', 36, 36, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2); ctx.fill();
    });

    // 21. Viñeteado Cinematográfico de Retransmisión TV (Vignette Overlay)
    makeTex('dt_vignette', 960, 540, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.40)';
        ctx.fillRect(0, 0, w, 28);
        ctx.fillRect(0, h - 28, w, 28);
        ctx.fillRect(0, 0, 36, h);
        ctx.fillRect(w - 36, 0, 36, h);
    });

    // 22. Llamarada de escape Backfire (Dual core GT3 flame)
    makeTex('dt_backfire_flame', 32, 32, (ctx, w, h) => {
        const grad = ctx.createRadialGradient(w/2, h/2, 2, w/2, h/2, 14);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.3, 'rgba(0, 245, 212, 0.9)');
        grad.addColorStop(0.65, 'rgba(255, 107, 0, 0.85)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w/2, h/2, 15, 0, Math.PI * 2);
        ctx.fill();
    });

    // 23. Spray de agua volumétrico de rueda (Wet weather rooster tail)
    makeTex('dt_water_spray', 32, 32, (ctx, w, h) => {
        const grad = ctx.createRadialGradient(w/2, h/2, 1, w/2, h/2, 15);
        grad.addColorStop(0, 'rgba(240, 249, 255, 0.85)');
        grad.addColorStop(0.4, 'rgba(186, 230, 253, 0.55)');
        grad.addColorStop(0.8, 'rgba(125, 211, 252, 0.25)');
        grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w/2, h/2, 15, 0, Math.PI * 2);
        ctx.fill();
    });

    // 24. Debris de Césped (Briznas volando fuera de pista)
    makeTex('dt_debris_grass', 16, 16, (ctx, w, h) => {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(3, 14); ctx.lineTo(8, 2); ctx.lineTo(11, 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(7, 14); ctx.lineTo(13, 4); ctx.lineTo(15, 14); ctx.closePath(); ctx.fill();
    });

    // 25. Debris de Gravilla / Arena (Guijarros de escapatoria)
    makeTex('dt_debris_gravel', 14, 14, (ctx, w, h) => {
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.moveTo(4, 2); ctx.lineTo(12, 4); ctx.lineTo(11, 12); ctx.lineTo(3, 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(5, 4, 3, 3);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(8, 7, 3, 3);
    });

    // 26. Debris de Nieve (Copos compactos de escapatoria)
    makeTex('dt_debris_snow', 14, 14, (ctx, w, h) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(8, 8, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 27. Comisarios de Pista Animados (Track Marshals ondeando banderas)
    makeTex('dt_marshal_green', 48, 48, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 32, 32);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5; ctx.strokeRect(8, 8, 32, 32);
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(38, 14); ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.moveTo(38, 14); ctx.lineTo(46, 17); ctx.lineTo(39, 26); ctx.lineTo(34, 22); ctx.closePath(); ctx.fill();
    });

    makeTex('dt_marshal_yellow', 48, 48, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 32, 32);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5; ctx.strokeRect(8, 8, 32, 32);
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(38, 14); ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.moveTo(38, 14); ctx.lineTo(46, 17); ctx.lineTo(39, 26); ctx.lineTo(34, 22); ctx.closePath(); ctx.fill();
    });

    makeTex('dt_marshal_checkered', 48, 48, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 8, 32, 32);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5; ctx.strokeRect(8, 8, 32, 32);
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(38, 14); ctx.stroke();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.fillStyle = ((i + j) % 2 === 0) ? '#ffffff' : '#090d16';
                ctx.fillRect(34 + i * 4, 14 + j * 5, 4, 5);
            }
        }
    });
}

// Genera texturas HD fotorrealistas de césped y grava de forma instantánea sin bloqueos
function buildHDEnvironmentTextures(scene) {
    // 1. Césped HD Fotorrealista (Mowed Lawn)
    try {
        if (scene.textures.exists('hd_grass_src')) {
            const src = scene.textures.get('hd_grass_src').getSourceImage();
            if (src && src.width) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(src, 0, 0, 512, 512);
                if (scene.textures.exists('dt_grass')) scene.textures.remove('dt_grass');
                scene.textures.addCanvas('dt_grass', canvas);
            }
        }
    } catch(e) { console.warn('hd_grass_src warn:', e); }

    // 2. Gravilla / Arena HD de Escapatoria (Gravel Runoff)
    try {
        if (scene.textures.exists('hd_sand_src')) {
            const src = scene.textures.get('hd_sand_src').getSourceImage();
            if (src && src.width) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(src, 0, 0, 512, 512);
                if (scene.textures.exists('dt_sand')) scene.textures.remove('dt_sand');
                scene.textures.addCanvas('dt_sand', canvas);
            }
        }
    } catch(e) { console.warn('hd_sand_src warn:', e); }

    // NOTA: Los objetos ambientales (dt_tree, dt_grandstand, dt_tire, dt_rock, dt_bushArea)
    // usan directamente sus texturas transparentes nativas pre-cargadas de assets/dustrac_clean/,
    // evitando bucles de flood-fill de CPU en el hilo principal que provocaban la pantalla en negro.
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

                // Pianos rojos FIA con relieve 3D de alta definición y biselado
                if (r > 150 && g < 90 && b < 90) {
                    const isGroove = ((x + y) % 16 < 2);
                    const bevel = isGroove ? -38 : (((x + y) % 16 < 8) ? 30 : -22);
                    d[i] = Math.max(0, Math.min(255, 220 + bevel));
                    d[i+1] = Math.max(0, Math.min(255, 28 + Math.round(bevel * 0.4)));
                    d[i+2] = Math.max(0, Math.min(255, 42 + Math.round(bevel * 0.4)));
                }
                // Pianos blancos con relieve 3D y biselado
                else if (r > 190 && g > 190 && b > 190) {
                    const isGroove = ((x + y) % 16 < 2);
                    const bevel = isGroove ? -44 : (((x + y) % 16 < 8) ? 20 : -20);
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

        if (tileKey === 'dt_corner90') {
            // Dibujar piano semicircular FIA profesional en el borde interior de la curva
            const cx = w, cy = h;
            const rInner = 60;
            const rOuter = 96;
            const totalStripes = 14;
            for (let s = 0; s < totalStripes; s++) {
                const startAng = Math.PI + (s / totalStripes) * (Math.PI / 2);
                const endAng = Math.PI + ((s + 1) / totalStripes) * (Math.PI / 2);
                const isRed = (s % 2 === 0);

                ctx.beginPath();
                ctx.arc(cx, cy, rOuter, startAng, endAng, false);
                ctx.arc(cx, cy, rInner, endAng, startAng, true);
                ctx.closePath();

                ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
                ctx.fill();

                // Relieve 3D biselado del piano: sombra en el borde interior, brillo en el exterior
                ctx.strokeStyle = isRed ? '#991b1b' : '#cbd5e1';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Ranura física de separación entre bloques de bordillo
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(startAng) * rInner, cy + Math.sin(startAng) * rInner);
                ctx.lineTo(cx + Math.cos(startAng) * rOuter, cy + Math.sin(startAng) * rOuter);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Borde exterior delimitador con brillo especular (arista superior)
            ctx.beginPath();
            ctx.arc(cx, cy, rOuter, Math.PI, Math.PI * 1.5, false);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Sombra física profunda proyectada sobre el interior
            ctx.beginPath();
            ctx.arc(cx, cy, rInner - 2, Math.PI, Math.PI * 1.5, false);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

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

// Genera texturas HD y elementos procedurales para los distintos biomas (Nieve, Desierto, Ciudad, Montaña, Costa, Río y Puente de Piedra)
function buildHDBiomeTextures(scene) {
    if (!scene || !scene.textures) return;

    // 1. BIOMA NIEVE: Suelo de Nieve y Hielo Brillante Glaciar (dt_snow_ground)
    try {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        if (ctx) {
            // Nieve alpina blanca pura inmaculada
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);

            // Dunas de nieve en polvo con matices glaciales muy sutiles
            for (let i = 0; i < 45; i++) {
                const rx = Math.random() * 512, ry = Math.random() * 512;
                const rad = 30 + Math.random() * 65;
                const g = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
                g.addColorStop(0, 'rgba(240, 249, 255, 0.75)'); // Hielo ártico azulado muy suave
                g.addColorStop(0.6, 'rgba(248, 250, 252, 0.40)');
                g.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(rx, ry, rad, 0, Math.PI * 2); ctx.fill();
            }

            // Destellos de cristales de nieve y escarcha brillante
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 600; i++) {
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }
            ctx.fillStyle = '#e0f2fe';
            for (let i = 0; i < 250; i++) {
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
            }

            if (scene.textures.exists('dt_snow_ground')) scene.textures.remove('dt_snow_ground');
            scene.textures.addCanvas('dt_snow_ground', cv);
        }
    } catch(e) { console.warn('snow ground tex error:', e); }

    // 2. BIOMA NIEVE: Pino Nevado de Montaña (dt_snow_pine)
    try {
        const cv = document.createElement('canvas');
        cv.width = 80; cv.height = 80;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.beginPath(); ctx.arc(44, 46, 32, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1e392a';
            ctx.beginPath(); ctx.arc(40, 40, 32, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.arc(40, 40, 26, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#162e22';
            ctx.beginPath(); ctx.arc(40, 40, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(40, 40, 14, 0, Math.PI * 2); ctx.fill();
            if (scene.textures.exists('dt_snow_pine')) scene.textures.remove('dt_snow_pine');
            scene.textures.addCanvas('dt_snow_pine', cv);
        }
    } catch(e) { console.warn('snow pine tex error:', e); }

    // 3. BIOMA DESIERTO: Dunas de Arena Cálida (dt_desert_sand)
    try {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#d97706';
            ctx.fillRect(0, 0, 512, 512);
            for (let y = 0; y < 512; y += 18) {
                const shift = Math.sin(y / 24) * 12;
                ctx.fillStyle = (y % 36 === 0) ? '#b45309' : '#f59e0b';
                ctx.globalAlpha = 0.35;
                ctx.fillRect(0, y + shift, 512, 8);
            }
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#78350f';
            for (let i = 0; i < 400; i++) {
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
            }
            if (scene.textures.exists('dt_desert_sand')) scene.textures.remove('dt_desert_sand');
            scene.textures.addCanvas('dt_desert_sand', cv);
        }
    } catch(e) { console.warn('desert sand tex error:', e); }

    // 4. BIOMA DESIERTO: Cactus Gigante Saguaro (dt_cactus)
    try {
        const cv = document.createElement('canvas');
        cv.width = 64; cv.height = 64;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(67, 20, 7, 0.40)';
            ctx.beginPath(); ctx.ellipse(36, 42, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d';
            ctx.beginPath(); ctx.arc(18, 26, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(18, 26, 12, 8);
            ctx.beginPath(); ctx.arc(46, 20, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(34, 20, 12, 8);
            ctx.fillStyle = '#166534';
            ctx.beginPath(); ctx.arc(32, 32, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#86efac';
            ctx.fillRect(31, 20, 2, 24);
            ctx.fillRect(25, 24, 2, 16);
            ctx.fillRect(37, 24, 2, 16);
            if (scene.textures.exists('dt_cactus')) scene.textures.remove('dt_cactus');
            scene.textures.addCanvas('dt_cactus', cv);
        }
    } catch(e) { console.warn('cactus tex error:', e); }

    // 5. BIOMA CIUDAD: Pavimento y Aceras Urbanas (dt_city_ground)
    try {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            for (let x = 0; x <= 512; x += 64) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = 0; y <= 512; y += 64) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
            ctx.fillStyle = '#475569';
            for (let x = 0; x < 512; x += 128) {
                ctx.fillRect(x, 0, 4, 512);
            }
            if (scene.textures.exists('dt_city_ground')) scene.textures.remove('dt_city_ground');
            scene.textures.addCanvas('dt_city_ground', cv);
        }
    } catch(e) { console.warn('city ground tex error:', e); }

    // 6. BIOMA CIUDAD: Rascacielos Moderno con Helipuerto (dt_skyscraper)
    try {
        const cv = document.createElement('canvas');
        cv.width = 160; cv.height = 160;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(10, 10, 150, 150);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 150, 150);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(8, 8, 134, 134);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(75, 75, 34, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('H', 75, 75);
            ctx.fillStyle = '#475569';
            ctx.fillRect(16, 16, 26, 22);
            ctx.fillRect(108, 16, 26, 22);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(6, 6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(144, 6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, 144, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(144, 144, 4, 0, Math.PI * 2); ctx.fill();
            if (scene.textures.exists('dt_skyscraper')) scene.textures.remove('dt_skyscraper');
            scene.textures.addCanvas('dt_skyscraper', cv);
        }
    } catch(e) { console.warn('skyscraper tex error:', e); }

    // 7. BIOMA CIUDAD: Farola Doble de Autopista (dt_streetlight)
    try {
        const cv = document.createElement('canvas');
        cv.width = 48; cv.height = 48;
        const ctx = cv.getContext('2d');
        if (ctx) {
            const halo = ctx.createRadialGradient(24, 24, 4, 24, 24, 22);
            halo.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
            halo.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(24, 24, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.arc(24, 24, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.arc(14, 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(34, 24, 3, 0, Math.PI * 2); ctx.fill();
            if (scene.textures.exists('dt_streetlight')) scene.textures.remove('dt_streetlight');
            scene.textures.addCanvas('dt_streetlight', cv);
        }
    } catch(e) { console.warn('streetlight tex error:', e); }

    // 8. BIOMA MONTAÑA: Pradera Alpina y Laderas Rocosas (dt_mountain_ground)
    try {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1c3121';
            ctx.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 30; i++) {
                const rx = Math.random() * 512, ry = Math.random() * 512;
                const rw = 30 + Math.random() * 50, rh = 20 + Math.random() * 35;
                ctx.fillStyle = '#334155';
                ctx.beginPath(); ctx.ellipse(rx, ry, rw/2, rh/2, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
            }
            if (scene.textures.exists('dt_mountain_ground')) scene.textures.remove('dt_mountain_ground');
            scene.textures.addCanvas('dt_mountain_ground', cv);
        }
    } catch(e) { console.warn('mountain ground tex error:', e); }

    // 9. BIOMA COSTA: Palmera Tropical de la Riviera (dt_palm_tree)
    try {
        const cv = document.createElement('canvas');
        cv.width = 80; cv.height = 80;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.beginPath(); ctx.arc(44, 46, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#059669';
            for (let i = 0; i < 8; i++) {
                const ang = (i * Math.PI) / 4;
                ctx.save();
                ctx.translate(40, 40);
                ctx.rotate(ang);
                ctx.beginPath();
                ctx.ellipse(22, 0, 18, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#34d399';
                ctx.fillRect(6, -1, 30, 2);
                ctx.restore();
            }
            ctx.fillStyle = '#78350f';
            ctx.beginPath(); ctx.arc(40, 40, 8, 0, Math.PI * 2); ctx.fill();
            if (scene.textures.exists('dt_palm_tree')) scene.textures.remove('dt_palm_tree');
            scene.textures.addCanvas('dt_palm_tree', cv);
        }
    } catch(e) { console.warn('palm tree tex error:', e); }

    // 10. BIOMA COSTA: Yate / Barco en el Mar (dt_boat)
    try {
        const cv = document.createElement('canvas');
        cv.width = 54; cv.height = 96;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(2, 44, 34, 0.45)';
            ctx.beginPath(); ctx.ellipse(30, 52, 22, 42, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(27, 4);
            ctx.bezierCurveTo(46, 24, 46, 80, 40, 92);
            ctx.lineTo(14, 92);
            ctx.bezierCurveTo(8, 80, 8, 24, 27, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#d97706';
            ctx.fillRect(16, 24, 22, 54);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(18, 38, 18, 26);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(20, 40, 14, 8);
            if (scene.textures.exists('dt_boat')) scene.textures.remove('dt_boat');
            scene.textures.addCanvas('dt_boat', cv);
        }
    } catch(e) { console.warn('boat tex error:', e); }

    // 11. AGUA: Mar / Océano Azul Turquesa (dt_water_ocean)
    try {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        if (ctx) {
            const grad = ctx.createLinearGradient(0, 0, 512, 512);
            grad.addColorStop(0, '#0369a1');
            grad.addColorStop(0.5, '#0284c7');
            grad.addColorStop(1, '#0891b2');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = '#e0f2fe';
            ctx.globalAlpha = 0.35;
            for (let y = 16; y < 512; y += 32) {
                for (let x = 8; x < 512; x += 64) {
                    ctx.beginPath();
                    ctx.ellipse(x + Math.sin(y)*10, y, 22, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;
            if (scene.textures.exists('dt_water_ocean')) scene.textures.remove('dt_water_ocean');
            scene.textures.addCanvas('dt_water_ocean', cv);
        }
    } catch(e) { console.warn('ocean tex error:', e); }

    // 12. AGUA: Río Fluvial Agua Dulce (dt_water_river)
    try {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#38bdf8';
            ctx.globalAlpha = 0.40;
            for (let y = 8; y < 256; y += 20) {
                ctx.fillRect(0, y + Math.sin(y)*4, 256, 6);
            }
            ctx.globalAlpha = 1.0;
            if (scene.textures.exists('dt_water_river')) scene.textures.remove('dt_water_river');
            scene.textures.addCanvas('dt_water_river', cv);
        }
    } catch(e) { console.warn('river tex error:', e); }

    // 13. PUENTE DE PIEDRA: Tablero Histórico con Adoquines y Pretiles de Sillería (dt_stone_bridge_deck)
    try {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        const ctx = cv.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 256, 256);
            ctx.fillStyle = '#334155';
            ctx.fillRect(0, 44, 256, 168);
            for (let y = 46; y < 210; y += 12) {
                const rowShift = (y % 24 === 0) ? 0 : 8;
                for (let x = -8 + rowShift; x < 256; x += 16) {
                    ctx.fillStyle = (Math.random() > 0.5) ? '#475569' : '#3f4c5e';
                    ctx.fillRect(x + 1, y + 1, 14, 10);
                }
            }
            ctx.fillStyle = '#cbd5e1';
            for (let x = 8; x < 256; x += 32) {
                ctx.fillRect(x, 126, 16, 4);
            }
            [26, 212].forEach(py => {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, py - 2, 256, 22);
                ctx.fillStyle = '#64748b';
                ctx.fillRect(0, py, 256, 18);
                ctx.fillStyle = '#334155';
                for (let x = 0; x < 256; x += 28) {
                    ctx.fillRect(x, py, 2, 18);
                }
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(0, py, 256, 4);
            });
            if (scene.textures.exists('dt_stone_bridge_deck')) scene.textures.remove('dt_stone_bridge_deck');
            scene.textures.addCanvas('dt_stone_bridge_deck', cv);
        }
    } catch(e) { console.warn('stone bridge tex error:', e); }
}

// Determinar el bioma del circuito
function getTrackBiome(track) {
    if (!track) return 'grassland';
    if (track.biome) return track.biome;
    const id = (track.id || '').toLowerCase();
    if (id.includes('nordkette') || id.includes('snow') || id.includes('winter') || id.includes('ice')) return 'snow';
    if (id.includes('desert') || id.includes('sandstorm') || id.includes('badlands') || id.includes('western') || id.includes('dune')) return 'desert';
    if (id.includes('tokyo') || id.includes('city') || id.includes('twister') || id.includes('urban')) return 'city';
    if (id.includes('riviera') || id.includes('coast') || id.includes('beach') || id.includes('monaco')) return 'coast';
    if (id.includes('red_rock') || id.includes('crossroads') || id.includes('figure8') || id.includes('bridge') || id.includes('river')) return 'river_stone_bridge';
    if (id.includes('schwarzwald') || id.includes('twineburg') || id.includes('mountain') || id.includes('pass') || id.includes('alpine')) return 'mountain';
    return 'grassland';
}

function dustCreate() {
    raceScene = this;
    window.raceScene = this;
    try { buildGT3CarTextures(this); } catch(e) { console.warn('GT3 car tex build error:', e); }
    try { buildHDEnvironmentTextures(this); } catch(e) { console.warn('HD env tex build error:', e); }
    try { buildHDRoadTextures(this); } catch(e) { console.warn('HD road tex build error:', e); }
    try { buildHDBridgeTextures(this); } catch(e) { console.warn('HD bridge tex build error:', e); }
    try { buildHDBiomeTextures(this); } catch(e) { console.warn('HD biome tex build error:', e); }

    // Configuración de Teclado (con salvaguarda para móviles y Telegram WebApp)
    if (this.input && this.input.keyboard && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.KeyCodes) {
        try {
            keys = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.UP,
                down: Phaser.Input.Keyboard.KeyCodes.DOWN,
                left: Phaser.Input.Keyboard.KeyCodes.LEFT,
                right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                w: Phaser.Input.Keyboard.KeyCodes.W,
                s: Phaser.Input.Keyboard.KeyCodes.S,
                a: Phaser.Input.Keyboard.KeyCodes.A,
                d: Phaser.Input.Keyboard.KeyCodes.D,
                space: Phaser.Input.Keyboard.KeyCodes.SPACE,
                shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
            }) || {};
        } catch(e) {
            keys = {};
        }
    } else {
        keys = {};
    }

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
    bindTouch('btn-handbrake', () => touchHandbrake = true, () => touchHandbrake = false);
}

// ===== MENÚ PRINCIPAL: MODO HISTORIA Y CARRERA LIBRE =====
function showMenu(scene) {
    if (!scene || !scene.children || typeof scene.children.removeAll !== 'function') {
        setTimeout(() => {
            const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes && window.phaserGame.scene.scenes[0]);
            if (sc && sc.children && typeof sc.children.removeAll === 'function') {
                showMenu(sc);
            }
        }, 100);
        return;
    }
    gameState = 'MENU';
    scene.children.removeAll();

    // 1. Resetear completamente la cámara al origen de pantalla (0, 0), zoom 1:1 y desvincularla del coche
    if (scene.cameras && scene.cameras.main) {
        if (typeof scene.cameras.main.stopFollow === 'function') scene.cameras.main.stopFollow();
        if (typeof scene.cameras.main.setScroll === 'function') scene.cameras.main.setScroll(0, 0);
        if (typeof scene.cameras.main.setZoom === 'function') scene.cameras.main.setZoom(1);
        if (typeof scene.cameras.main.setBounds === 'function') scene.cameras.main.setBounds(0, 0, 960, 540);
        if (typeof scene.cameras.main.setBackgroundColor === 'function') scene.cameras.main.setBackgroundColor('#0a0c14');
    }

    // 2. Limpiar referencias a objetos de la carrera anterior
    playerCar = null;
    aiCars = [];
    trackBarriers = [];
    trackObstacles = [];
    skidmarks = [];
    hudTachoGfx = null;
    hudGearText = null;
    hudRpmText = null;
    hudGhostBadge = null;
    hudDriftBadge = null;
    hudSlipstreamBadge = null;
    weatherGraphics = null;
    speedLinesGraphics = null;
    skidLayer = null;
    gridGfx = null;

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

                    scene.add.text(cx, cy + 52, isSel ? '▶ SELECCIONADO (CORRER)' : '▶ CLIC PARA CORRER', {
                        font: 'bold 10px Arial', fill: isSel ? '#00f5d4' : '#00e676'
                    }).setOrigin(0.5);

                    const hit = scene.add.rectangle(cx, cy, 210, 130).setInteractive({ useHandCursor: true });
                    hit.on('pointerdown', () => {
                        dustAudio.init();
                        currentTrackId = t.id;
                        isCurrentRaceStory = true;
                        // Iniciar la carrera inmediatamente con el circuito pulsado
                        startRace(scene, t.id, selectedCarIndex, selectedTimeOfDay, true);
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
                        // Iniciar la carrera inmediatamente con el circuito pulsado
                        startRace(scene, t.id, selectedCarIndex, selectedTimeOfDay, true);
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
                startRace(scene, t.id, selectedCarIndex, selectedTimeOfDay, false);
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
        { id: 'day', label: '☀️ DÍA (Luz Natural)', desc: 'Faros Off' },
        { id: 'sunset', label: '🌅 ATARDECER (Golden)', desc: 'Tono Cálido' },
        { id: 'night', label: '🌙 NOCHE (Faros Xenón)', desc: 'Haz Dinámico' },
        { id: 'rain', label: '🌧️ LLUVIA (Wet Track)', desc: 'Spray y Grip' }
    ];

    timesOfDay.forEach((tod, idx) => {
        const bx = 160 + idx * 215;
        const by = 428;
        const isSel = selectedTimeOfDay === tod.id;

        const tBox = scene.add.graphics();
        let boxColor = 0x141822;
        if (isSel) {
            if (tod.id === 'night') boxColor = 0x1a237e;
            else if (tod.id === 'rain') boxColor = 0x0284c7;
            else boxColor = 0xef6c00;
        }
        tBox.fillStyle(boxColor, 0.95);
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
function startRace(scene, trackId, carIdx = 0, timeOfDay = 'day', isStory = false) {
    if (!scene || !scene.children || typeof scene.children.removeAll !== 'function') {
        console.warn('Escena no preparada todavía para startRace. Reintentando...');
        setTimeout(() => {
            const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes && window.phaserGame.scene.scenes[0]);
            if (sc && sc.children && typeof sc.children.removeAll === 'function') {
                startRace(sc, trackId, carIdx, timeOfDay, isStory);
            }
        }, 100);
        return;
    }

    scene.children.removeAll();

    raceScene = scene;
    window.raceScene = scene;

    currentTrackId = trackId;
    selectedTimeOfDay = timeOfDay;
    isCurrentRaceStory = isStory;
    selectedCarIndex = carIdx;

    const tracks = window.DustracTracks || {};
    let track = tracks[trackId] || tracks['rookie_ring'] || Object.values(tracks)[0];
    if (!track) {
        console.error('Circuito no encontrado:', trackId);
        return;
    }
    trackId = track.id || trackId;
    currentTrackId = trackId;

    gameState = 'COUNTDOWN';
    console.log(`🏁 Cargando nivel oficial: ${track.name} (${track.worldWidth}x${track.worldHeight}px)`);

    // Límites de físicas del mundo y cámara sin bloqueo perimetral
    scene.physics.world.setBounds(0, 0, track.worldWidth, track.worldHeight);
    scene.cameras.main.setBounds(-2500, -2500, track.worldWidth + 5000, track.worldHeight + 5000);
    const biome = getTrackBiome(track);
    if (biome === 'snow') {
        scene.cameras.main.setBackgroundColor('#f8fafc');
    } else {
        scene.cameras.main.setBackgroundColor('#0d121d');
    }
    scene.cameras.main.setZoom(1.1);

    // 1. TERRENO BASE Y BIOMA AMBIENTAL (Nieve, Desierto, Ciudad, Montaña, Costa, Río y Puente de Piedra)
    let baseGroundKey = 'dt_grass';
    if (biome === 'snow') baseGroundKey = 'dt_snow_ground';
    else if (biome === 'desert') baseGroundKey = 'dt_desert_sand';
    else if (biome === 'city') baseGroundKey = 'dt_city_ground';
    else if (biome === 'mountain') baseGroundKey = 'dt_mountain_ground';
    else if (biome === 'coast') baseGroundKey = 'dt_sand';
    else if (biome === 'river_stone_bridge') baseGroundKey = 'dt_grass';

    scene.add.tileSprite(
        track.worldWidth / 2,
        track.worldHeight / 2,
        track.worldWidth,
        track.worldHeight,
        baseGroundKey
    ).setDepth(0);

    // DECORADO ESPECIAL: COSTA Y OCÉANO AZUL TURQUESA (biome === 'coast')
    if (biome === 'coast') {
        const oceanH = Math.min(880, Math.floor(track.worldHeight * 0.36));
        const ocean = scene.add.tileSprite(
            track.worldWidth / 2,
            oceanH / 2,
            track.worldWidth,
            oceanH,
            'dt_water_ocean'
        ).setDepth(0.3);

        scene.tweens.add({
            targets: ocean,
            tilePositionX: 512,
            duration: 18000,
            repeat: -1,
            ease: 'Linear'
        });

        // Yates y veleros de lujo fondeados en el mar
        for (let b = 0; b < 6; b++) {
            const bx = 320 + (b * (track.worldWidth - 640) / 5);
            const by = oceanH * 0.35 + (b % 2) * 55;
            const boat = scene.add.sprite(bx, by, 'dt_boat').setDepth(0.5).setAngle(b % 2 === 0 ? 30 : -25);
            scene.tweens.add({
                targets: boat,
                angle: boat.angle + 4,
                y: by + 6,
                duration: 2600 + b * 250,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    // DECORADO ESPECIAL: RÍO FLUVIAL CON AGUA AZUL (biome === 'river_stone_bridge')
    if (biome === 'river_stone_bridge') {
        const bridgeTile = track.tiles.find(t => t.t === 'bridge');
        const riverX = bridgeTile ? (bridgeTile.i * 256 + 128) : (track.worldWidth / 2);
        const river = scene.add.tileSprite(
            riverX,
            track.worldHeight / 2,
            280,
            track.worldHeight,
            'dt_water_river'
        ).setDepth(0.3);

        // Orillas de piedra del río
        scene.add.rectangle(riverX - 144, track.worldHeight / 2, 8, track.worldHeight, 0x475569, 0.85).setDepth(0.4);
        scene.add.rectangle(riverX + 144, track.worldHeight / 2, 8, track.worldHeight, 0x475569, 0.85).setDepth(0.4);

        scene.tweens.add({
            targets: river,
            tilePositionY: 256,
            duration: 9000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    // DECORADO ESPECIAL: RASCACIELOS Y EDIFICIOS URBANOS PERIFÉRICOS (biome === 'city')
    if (biome === 'city') {
        const citySpots = [
            { x: 180, y: 180 }, { x: track.worldWidth - 180, y: 180 },
            { x: 180, y: track.worldHeight - 180 }, { x: track.worldWidth - 180, y: track.worldHeight - 180 },
            { x: track.worldWidth / 2, y: 160 }, { x: track.worldWidth / 2, y: track.worldHeight - 160 }
        ];
        citySpots.forEach(sp => {
            if (sp.x > 0 && sp.x < track.worldWidth && sp.y > 0 && sp.y < track.worldHeight) {
                scene.add.sprite(sp.x, sp.y, 'dt_skyscraper').setDisplaySize(180, 180).setDepth(10);
            }
        });
    }

    // DECORADO ESPECIAL: VENTISCA DE COPOS DE NIEVE (biome === 'snow')
    if (biome === 'snow') {
        for (let s = 0; s < 45; s++) {
            const sx = Math.random() * track.worldWidth;
            const sy = Math.random() * track.worldHeight;
            const flake = scene.add.circle(sx, sy, 1.5 + Math.random() * 2, 0xffffff, 0.75).setDepth(25);
            scene.tweens.add({
                targets: flake,
                x: sx + 120 + Math.random() * 80,
                y: sy + 180 + Math.random() * 120,
                duration: 2200 + Math.random() * 1800,
                repeat: -1,
                ease: 'Linear',
                onRepeat: () => {
                    flake.x = Math.random() * track.worldWidth;
                    flake.y = Math.random() * track.worldHeight;
                }
            });
        }
    }

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

        // A) Trampas de Arena y Escapatorias de Nieve / Grava
        if (tile.t === 'sand') {
            if (biome === 'snow') {
                scene.add.sprite(tx, ty, 'dt_snow_ground').setDisplaySize(256, 256).setDepth(1);
            } else {
                scene.add.sprite(tx, ty, 'dt_sand').setDisplaySize(256, 256).setDepth(1);
            }
        } else if (tile.t === 'sandGrassStraight' || tile.t === 'sandGrassCorner' || tile.t === 'sandGrassCorner2') {
            if (biome === 'snow') {
                scene.add.sprite(tx, ty, 'dt_snow_ground').setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
            } else {
                scene.add.sprite(tx, ty, `dt_${tile.t}`).setDisplaySize(256, 256).setAngle(tile.o).setDepth(1);
            }
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
            // El puente elevado cruza a desnivel sobre la pista o sobre el río:
            const isStoneBridge = (biome === 'river_stone_bridge');
            const deckTexture = isStoneBridge ? 'dt_stone_bridge_deck' : 'dt_bridge_deck';
            const deckAngle = 90;
            const underAngle = 0;

            // 1. Asfalto o corriente inferior
            scene.add.sprite(tx, ty, 'dt_straight').setDisplaySize(256, 256).setAngle(underAngle).setDepth(2);

            // 2. Sombra de oclusión ambiental profunda en el paso inferior
            scene.add.rectangle(tx, ty, 208, 256, 0x000000, 0.45).setDepth(3);

            // 3. Sombra arquitectónica proyectada por la altura del puente sobre el suelo
            scene.add.rectangle(tx + 14, ty + 12, 192, 256, 0x000000, 0.42).setDepth(14);

            // 4. Tablero del puente elevado con textura HD (puente de piedra o puente GP)
            scene.add.sprite(tx, ty, deckTexture).setDisplaySize(256, 256).setAngle(deckAngle).setDepth(15);

            // 5. Pilares y estribos de piedra o de hormigón reforzado
            const pillarW = 28;
            const pillarH = 34;
            const pillars = [
                { x: tx - 104, y: ty - 88 },
                { x: tx + 104, y: ty - 88 },
                { x: tx - 104, y: ty + 88 },
                { x: tx + 104, y: ty + 88 }
            ];

            pillars.forEach(p => {
                scene.add.rectangle(p.x + 4, p.y + 4, pillarW, pillarH, 0x000000, 0.45).setDepth(15);
                const col = scene.add.graphics().setDepth(16);
                if (isStoneBridge) {
                    col.fillStyle(0x475569, 1);
                    col.fillRoundedRect(p.x - pillarW/2, p.y - pillarH/2, pillarW, pillarH, 4);
                    col.fillStyle(0x64748b, 1);
                    col.fillRect(p.x - pillarW/2 + 2, p.y - pillarH/2 + 2, pillarW - 4, 8);
                } else {
                    col.fillStyle(0x64748b, 1);
                    col.fillRoundedRect(p.x - pillarW/2, p.y - pillarH/2, pillarW, pillarH, 4);
                    col.fillStyle(0x94a3b8, 1);
                    col.fillRect(p.x - pillarW/2 + 2, p.y - pillarH/2 + 2, pillarW - 4, 6);
                    col.fillStyle(0xfacc15, 1);
                    col.fillRect(p.x - pillarW/2 + 2, p.y + pillarH/2 - 8, pillarW - 4, 6);
                    col.fillStyle(0x0f172a, 1);
                    col.fillRect(p.x - pillarW/2 + 6, p.y + pillarH/2 - 8, 4, 6);
                    col.fillRect(p.x - pillarW/2 + 16, p.y + pillarH/2 - 8, 4, 6);
                }

                // Registrar pilar de puente como obstáculo físico sólido
                trackBarriers.push({
                    x: p.x,
                    y: p.y,
                    width: pillarW,
                    height: pillarH,
                    angle: 0,
                    halfW: pillarW / 2,
                    halfH: pillarH / 2,
                    isPillar: true
                });
            });

            // 6. Pórtico de señalización
            const gantry = scene.add.graphics().setDepth(17);
            gantry.fillStyle(0x0f172a, 0.95);
            gantry.fillRoundedRect(tx - 70, ty - 6, 140, 12, 3);
            gantry.lineStyle(1.5, isStoneBridge ? 0xf59e0b : 0x00f5d4, 1);
            gantry.strokeRoundedRect(tx - 70, ty - 6, 140, 12, 3);
        }
    });

    // 3. CAPA DE MARCAS DE GOMA DE DERRAPE PERMANENTES Y TRAZADA ENGOMADA PROGRESIVA
    skidLayer = scene.add.graphics().setDepth(4);
    racingGrooveLayer = scene.add.graphics().setDepth(3.45);

    // Configuración de Iluminación y Sombras Coherentes según la Hora del Día
    const lightConfig = {
        day: {
            shadowDx: 12, shadowDy: 14, shadowAlpha: 0.36,
            tint: null, vignetteAlpha: 0.16
        },
        sunset: {
            shadowDx: 26, shadowDy: 26, shadowAlpha: 0.48,
            tint: 0xd97706, tintAlpha: 0.14, vignetteAlpha: 0.28
        },
        night: {
            shadowDx: 6, shadowDy: 8, shadowAlpha: 0.65,
            tint: 0x0369a1, tintAlpha: 0.18, vignetteAlpha: 0.38
        },
        rain: {
            shadowDx: 8, shadowDy: 10, shadowAlpha: 0.28,
            tint: 0x38bdf8, tintAlpha: 0.14, vignetteAlpha: 0.24
        }
    }[selectedTimeOfDay] || { shadowDx: 12, shadowDy: 14, shadowAlpha: 0.36, tint: null, vignetteAlpha: 0.16 };

    // En circuitos alpinos de nieve, mantener la luz diurna blanca y nítida
    if (biome === 'snow' && lightConfig.tint === 0xd97706) {
        lightConfig.tint = null;
    }

    // 4. OBJETOS DEL ENTORNO OFICIALES Y TEMÁTICOS SEGÚN BIOMA
    track.objects.forEach(obj => {
        if (obj.r === 'tree') {
            scene.add.ellipse(obj.x + lightConfig.shadowDx, obj.y + lightConfig.shadowDy, 64, 52, 0x000000, lightConfig.shadowAlpha).setDepth(13);
            let treeKey = 'dt_tree';
            let treeSize = 72;
            if (biome === 'snow') {
                treeKey = 'dt_snow_pine';
                treeSize = 78;
            } else if (biome === 'desert') {
                treeKey = 'dt_cactus';
                treeSize = 64;
            } else if (biome === 'coast') {
                treeKey = 'dt_palm_tree';
                treeSize = 80;
            }
            const tree = scene.add.sprite(obj.x, obj.y, treeKey).setDisplaySize(treeSize, treeSize).setDepth(14);
            scene.tweens.add({
                targets: tree,
                angle: (Math.random() - 0.5) * 4,
                duration: 2600 + Math.random() * 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (obj.r === 'grandstand') {
            const isIsolated = !track.objects.some(other => other !== obj && other.r === 'grandstand' && Math.hypot(obj.x - other.x, obj.y - other.y) < 220);
            const gsW = isIsolated ? 230 : 160;
            const gsH = isIsolated ? 160 : 130;

            scene.add.rectangle(obj.x + lightConfig.shadowDx, obj.y + lightConfig.shadowDy, gsW - 5, gsH - 5, 0x000000, lightConfig.shadowAlpha)
                .setAngle(obj.o)
                .setDepth(11);

            scene.add.sprite(obj.x, obj.y, 'dt_grandstand')
                .setDisplaySize(gsW, gsH)
                .setAngle(obj.o)
                .setDepth(12);

            // Banderas ondeantes de competición sobre la cubierta de la tribuna
            if (scene.textures && scene.textures.exists('dt_flag_checkered')) {
                const flagKeys = ['dt_flag_checkered', 'dt_flag_red', 'dt_flag_blue'];
                const f1 = scene.add.sprite(obj.x - 36, obj.y - 24, flagKeys[Math.floor(Math.random() * flagKeys.length)]).setAngle(obj.o).setDepth(13);
                const f2 = scene.add.sprite(obj.x + 36, obj.y - 24, flagKeys[Math.floor(Math.random() * flagKeys.length)]).setAngle(obj.o).setDepth(13);
                scene.tweens.add({ targets: [f1, f2], angle: obj.o + 6, duration: 1200 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }

            // Bengalas de celebración Tifosi en tribunas
            if (Math.random() < 0.45 && scene.textures && scene.textures.exists('dt_smoke_flare_red')) {
                const flareKey = Math.random() < 0.5 ? 'dt_smoke_flare_red' : 'dt_smoke_flare_yellow';
                const flare = scene.add.sprite(obj.x, obj.y - 32, flareKey).setDepth(14).setAlpha(0.72);
                scene.tweens.add({ targets: flare, y: obj.y - 42, alpha: 0.45, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
        } else if (obj.r === 'tire') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 26, 26, 0x000000, 0.42).setDepth(5);
            scene.add.sprite(obj.x, obj.y, 'dt_tire').setDisplaySize(28, 28).setAngle(obj.o).setDepth(6);
        } else if (obj.r === 'rock') {
            scene.add.ellipse(obj.x + 2, obj.y + 3, 28, 24, 0x000000, 0.38).setDepth(5);
            const rock = scene.add.sprite(obj.x, obj.y, 'dt_rock').setDisplaySize(32, 32).setAngle(obj.o).setDepth(6);
            if (biome === 'desert') rock.setTint(0xca8a04);
            else if (biome === 'snow') rock.setTint(0xe2e8f0);
        } else if (obj.r === 'bushArea') {
            scene.add.ellipse(obj.x + 3, obj.y + 4, 96, 96, 0x000000, 0.30).setDepth(4);
            const bush = scene.add.sprite(obj.x, obj.y, 'dt_bushArea').setDisplaySize(100, 100).setAngle(obj.o).setDepth(5);
            if (biome === 'snow') bush.setTint(0xe2e8f0);
            else if (biome === 'desert') bush.setTint(0xb45309);
        } else if (obj.r === 'pit') {
            scene.add.sprite(obj.x, obj.y, 'dt_pit').setDisplaySize(256, 54).setAngle(obj.o).setDepth(5);
        } else if (obj.r === 'wallLong' || obj.r === 'wall') {
            const isLong = (obj.r === 'wallLong');
            const bW = isLong ? 256 : 96;
            const bH = 22;
            const texKey = isLong ? 'dt_armco_long' : 'dt_armco_short';

            // Sombra arquitectónica bajo el quitamiedos metálico coherente con el sol
            scene.add.rectangle(obj.x + lightConfig.shadowDx * 0.35, obj.y + lightConfig.shadowDy * 0.35, bW, bH, 0x000000, lightConfig.shadowAlpha)
                .setAngle(obj.o)
                .setDepth(11);

            scene.add.sprite(obj.x, obj.y, texKey)
                .setDisplaySize(bW, bH)
                .setAngle(obj.o)
                .setDepth(12);

            // Registrar en lista de barreras físicas infranqueables
            trackBarriers.push({
                x: obj.x,
                y: obj.y,
                width: bW,
                height: bH,
                angle: obj.o,
                halfW: bW / 2,
                halfH: bH / 2,
                isLong: isLong
            });
        } else if (obj.r === 'dustRacing2DBanner') {
            scene.add.rectangle(obj.x + 3, obj.y + 4, 115, 26, 0x000000, 0.40)
                .setAngle(obj.o)
                .setDepth(11);
            scene.add.sprite(obj.x, obj.y, 'dt_billboard_dustrac')
                .setDisplaySize(115, 28)
                .setAngle(obj.o)
                .setDepth(12);
        }
    });

    // 4.1 COORDENADAS OFICIALES DE SALIDA / META
    const finishTile = track.tiles.find(t => t.t === 'finish');
    const fx = finishTile ? finishTile.i * 256 + 128 : (track.nodes[0] ? track.nodes[0].x : 500);
    const fy = finishTile ? finishTile.j * 256 + 128 : (track.nodes[0] ? track.nodes[0].y : 500);

    let closestNodeIdx = 0, minDist = Infinity;
    const allNodes = track.nodes || [];
    allNodes.forEach((n, idx) => {
        const d = Math.hypot(n.x - fx, n.y - fy);
        if (d < minDist) { minDist = d; closestNodeIdx = idx; }
    });
    const nextNode = allNodes[(closestNodeIdx + 1) % allNodes.length] || { x: fx + 100, y: fy };
    const prevNode = allNodes[(closestNodeIdx - 1 + allNodes.length) % allNodes.length] || { x: fx - 100, y: fy };
    const flowX = nextNode.x - prevNode.x;
    const flowY = nextNode.y - prevNode.y;

    const normO = finishTile ? (((finishTile.o % 360) + 360) % 360) : 0;
    let dirX = 0, dirY = 0, startAngleDeg = 0;
    if (normO === 90 || normO === 270) {
        dirX = flowX >= 0 ? 1 : -1;
        dirY = 0;
        startAngleDeg = dirX > 0 ? 0 : 180;
    } else {
        dirX = 0;
        dirY = flowY >= 0 ? 1 : -1;
        startAngleDeg = dirY > 0 ? 90 : -90;
    }

    const perpX = -dirY;
    const perpY = dirX;

    // 4.2 AMBIENTACIÓN MOTORSPORT PROFESIONAL Y OBJETOS REALISTAS DEL CIRCUITO
    try { buildProRacingEnvironmentTextures(scene); } catch(e) {}
    try { initWeatherParticles(biome); } catch(e) {}

    // A) Pórtico de salida/meta elevado perfectamente perpendicular a la pista
    if (scene.textures && scene.textures.exists('dt_gantry_overhead')) {
        scene.add.sprite(fx, fy, 'dt_gantry_overhead')
            .setDisplaySize(280, 52)
            .setAngle(startAngleDeg + 90)
            .setDepth(18);
        scene.add.rectangle(fx - dirX * 10, fy - dirY * 10, 280, 16, 0x000000, 0.40)
            .setAngle(startAngleDeg + 90)
            .setDepth(3.6);
    }

    // B) Parrilla de salida con cajetines numerados en el asfalto (P1 a P6) alineados a la recta
    const gridGfx = scene.add.graphics().setDepth(3.5);
    const gridOffsets = [
        { dist: 55, side: 22, pos: '1' },
        { dist: 55, side: -22, pos: '2' },
        { dist: 115, side: 22, pos: '3' },
        { dist: 115, side: -22, pos: '4' },
        { dist: 175, side: 22, pos: '5' },
        { dist: 175, side: -22, pos: '6' }
    ];

    const boxW = (dirX !== 0) ? 44 : 30;
    const boxH = (dirX !== 0) ? 30 : 44;

    gridOffsets.forEach(box => {
        const bx = fx - dirX * box.dist + perpX * box.side;
        const by = fy - dirY * box.dist + perpY * box.side;

        // Cajetín blanco de salida
        gridGfx.lineStyle(2, 0xffffff, 0.85);
        gridGfx.strokeRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 4);

        // Texto del número de posición
        const txt = scene.add.text(bx, by, box.pos, {
            font: '900 14px Arial Black',
            fill: '#fde047',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(3.6);
        if (txt && typeof txt.setAngle === 'function') txt.setAngle(startAngleDeg);
    });

    // C) Trazada engomada de competición (Rubbered Racing Line) a lo largo de las curvas
    const nodes = track.nodes || [];
    if (nodes.length > 2 && skidLayer) {
        skidLayer.lineStyle(26, 0x07090f, 0.22);
        for (let i = 0; i < nodes.length; i++) {
            const nA = nodes[i];
            const nB = nodes[(i + 1) % nodes.length];
            const nPrev = nodes[(i - 1 + nodes.length) % nodes.length];

            const a1 = Math.atan2(nA.y - nPrev.y, nA.x - nPrev.x);
            const a2 = Math.atan2(nB.y - nA.y, nB.x - nA.x);
            let diffAng = Math.abs(a2 - a1);
            if (diffAng > Math.PI) diffAng = Math.PI * 2 - diffAng;

            if (diffAng > 0.18) {
                skidLayer.lineBetween(nA.x, nA.y, nB.x, nB.y);
            }
        }
    }

    // D) Arcos y Pórticos de Patrocinio elevados de lado a lado (Overhead Gantries: los coches pasan por debajo)
    const archesList = [
        'dt_arch_motul', 'dt_arch_pirelli', 'dt_arch_michelin',
        'dt_arch_brembo', 'dt_arch_castrol', 'dt_arch_badlands'
    ];
    let archIdx = 0;

    track.tiles.forEach(tile => {
        const tx = tile.i * 256 + 128;
        const ty = tile.j * 256 + 128;

        // Situar arcos de patrocinador en rectas espaciadas, lejos de la meta y de puentes
        if (tile.t === 'straight' && (tile.i + tile.j) % 6 === 0) {
            const archKey = archesList[archIdx % archesList.length];
            archIdx++;

            const isNearFinish = Math.hypot(tx - fx, ty - fy) < 420;
            const hasConflict = (track.objects || []).some(obj => Math.hypot(obj.x - tx, obj.y - ty) < 140);

            if (!isNearFinish && !hasConflict) {
                // El arco mide 280px y cruza la calzada de 200px de lado a lado:
                // Sus torres descansan sobre el césped a ambos lados y el panel central cuelga sobre la pista.
                // - En recta vertical (o=0, 180, 360): el arco cruza horizontalmente Este-Oeste (ángulo 0°).
                // - En recta horizontal (o=90, 270, -90): el arco cruza verticalmente Norte-Sur (ángulo 90°).
                const normO = ((tile.o % 360) + 360) % 360;
                const hasRoadAboveOrBelow = track.tiles.some(t => t.i === tile.i && (t.j === tile.j - 1 || t.j === tile.j + 1) && (t.t === 'straight' || t.t === 'finish' || t.t.startsWith('corner')));
                const hasRoadLeftOrRight = track.tiles.some(t => (t.i === tile.i - 1 || t.i === tile.i + 1) && t.j === tile.j && (t.t === 'straight' || t.t === 'finish' || t.t.startsWith('corner')));
                const isVerticalRoad = (normO === 0 || normO === 180) || (hasRoadAboveOrBelow && !hasRoadLeftOrRight);
                const archAngle = isVerticalRoad ? 0 : 90;

                // 1. Sombra arquitectónica proyectada sobre el asfalto (profundidad 3.6: los coches pasan SOBRE la sombra)
                if (isVerticalRoad) {
                    scene.add.rectangle(tx, ty + 12, 260, 20, 0x000000, 0.40).setDepth(3.6);
                } else {
                    scene.add.rectangle(tx + 12, ty, 260, 20, 0x000000, 0.40).setAngle(90).setDepth(3.6);
                }

                // 2. Arco de patrocinio elevado con torretas de seguridad (profundidad 18: los coches pasan POR DEBAJO)
                scene.add.sprite(tx, ty, archKey)
                    .setDisplaySize(280, 52)
                    .setAngle(archAngle)
                    .setDepth(18);
            }
        }
    });

    // E) Comisarios de pista animados (Animated Track Marshals con banderas FIA)
    trackMarshals = [];
    if (nodes && nodes.length > 4 && scene.textures && scene.textures.exists('dt_marshal_green')) {
        const step = Math.max(1, Math.floor(nodes.length / 6));
        for (let m = 0; m < nodes.length; m += step) {
            const nA = nodes[m];
            const nB = nodes[(m + 1) % nodes.length];
            const ang = Math.atan2(nB.y - nA.y, nB.x - nA.x);
            const perpX = -Math.sin(ang);
            const perpY = Math.cos(ang);
            const mx = nA.x + perpX * 145;
            const my = nA.y + perpY * 145;

            const roadD = getDistanceToRoad(mx, my, scene);
            if (roadD.dist > 110 && mx > 60 && mx < track.worldWidth - 60 && my > 60 && my < track.worldHeight - 60) {
                const marshal = scene.add.sprite(mx, my, 'dt_marshal_green')
                    .setDisplaySize(42, 42)
                    .setDepth(12);

                scene.tweens.add({
                    targets: marshal,
                    angle: { from: -8, to: 8 },
                    duration: 650 + (m % 3) * 120,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                trackMarshals.push(marshal);
            }
        }
    }

    // Helper seguro para verificar si una coordenada toca asfalto o pianos
    const isPointOnRoad = (px, py) => {
        const ti = Math.floor(px / 256);
        const tj = Math.floor(py / 256);
        if (scene.tileMap && typeof scene.tileMap.get === 'function') {
            const t = scene.tileMap.get(`${ti},${tj}`);
            if (t && (t.t === 'straight' || t.t === 'finish' || t.t.startsWith('corner') || t.t.startsWith('straight45') || t.t === 'bridge')) {
                return true;
            }
        }
        return false;
    };

    const isBoxSafeFromRoad = (px, py, halfW, halfH) => {
        if (!track || px < 40 || px >= track.worldWidth - 40 || py < 40 || py >= track.worldHeight - 40) return false;
        if (isPointOnRoad(px, py)) return false;
        if (isPointOnRoad(px + halfW, py + halfH)) return false;
        if (isPointOnRoad(px - halfW, py - halfH)) return false;
        if (isPointOnRoad(px + halfW, py - halfH)) return false;
        if (isPointOnRoad(px - halfW, py + halfH)) return false;
        return true;
    };

    // E) Paneles de Distancia de Frenada FIA (150m, 100m, 50m) ANTES de Curvas Pronunciadas
    // Colocados exclusivamente en la recta de aproximación exterior y FUERA del asfalto/pianos
    if (nodes && nodes.length > 4) {
        let lastBrakeIdx = -999;
        for (let i = 0; i < nodes.length; i++) {
            // Evitar duplicar paneles en secuencias de curvas enlazadas o chicanes
            if (i - lastBrakeIdx < 4) continue;

            const curr = nodes[i];
            const prev = nodes[(i - 1 + nodes.length) % nodes.length];
            const next = nodes[(i + 1) % nodes.length];

            const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            let turnAngle = Math.abs(a2 - a1);
            if (turnAngle > Math.PI) turnAngle = Math.PI * 2 - turnAngle;

            // Únicamente en curvas significativas (> 0.45 rad / ~26°)
            if (turnAngle < 0.45) continue;

            // Medir la distancia recta de aproximación antes de la curva
            let straightDist = 0;
            let k = i;
            while (straightDist < 600) {
                const p1 = nodes[(k - 1 + nodes.length) % nodes.length];
                const p2 = nodes[(k - 2 + nodes.length) % nodes.length];
                const stepAngle = Math.abs(Math.atan2(p1.y - p2.y, p1.x - p2.x) - a1);
                const normStepAngle = stepAngle > Math.PI ? Math.PI * 2 - stepAngle : stepAngle;
                if (normStepAngle > 0.35) break; // Termina el tramo recto
                straightDist += Math.hypot(p1.x - p2.x, p1.y - p2.y);
                k = (k - 1 + nodes.length) % nodes.length;
            }
            straightDist += Math.hypot(curr.x - prev.x, curr.y - prev.y);

            // Debe ser una aproximación recta real (mínimo ~380px)
            if (straightDist < 380) continue;

            const dirX = Math.cos(a1);
            const dirY = Math.sin(a1);
            const exitX = Math.cos(a2);
            const exitY = Math.sin(a2);
            const cross = dirX * exitY - dirY * exitX;
            if (Math.abs(cross) < 0.05) continue;

            // Vector perpendicular orientado ESTRICTAMENTE hacia el exterior de la curva
            const turnSign = cross > 0 ? 1 : -1;
            const outX = dirY * turnSign;
            const outY = -dirX * turnSign;

            // Orientación del panel legible a lo largo del margen exterior
            let bAngle = Phaser.Math.RadToDeg(a1);
            if (bAngle > 90) bAngle -= 180;
            else if (bAngle < -90) bAngle += 180;

            const boardDistances = [
                { dist: Math.min(straightDist * 0.70, 340), key: 'dt_brake_150' },
                { dist: Math.min(straightDist * 0.48, 230), key: 'dt_brake_100' },
                { dist: Math.min(straightDist * 0.26, 120), key: 'dt_brake_50' }
            ];

            let placedAny = false;
            boardDistances.forEach(bd => {
                // Probar offsets en el césped exterior para asegurar que jamás invada el asfalto o pianos
                for (let offset = 180; offset <= 270; offset += 30) {
                    const bx = curr.x - dirX * bd.dist + outX * offset;
                    const by = curr.y - dirY * bd.dist + outY * offset;

                    // Validación estricta: libre de asfalto y pianos
                    if (isBoxSafeFromRoad(bx, by, 22, 14)) {
                        const roadDist = (typeof getDistanceToRoad === 'function') ? getDistanceToRoad(bx, by, scene).dist : 200;
                        if (roadDist >= 160) {
                            // Sombra direccional en el césped
                            scene.add.rectangle(bx + lightConfig.shadowDx * 0.3, by + lightConfig.shadowDy * 0.3, 38, 22, 0x000000, lightConfig.shadowAlpha)
                                .setAngle(bAngle)
                                .setDepth(5);
                            // Panel de distancia FIA
                            scene.add.sprite(bx, by, bd.key)
                                .setDisplaySize(38, 22)
                                .setAngle(bAngle)
                                .setDepth(6);
                            placedAny = true;
                            break;
                        }
                    }
                }
            });

            if (placedAny) {
                lastBrakeIdx = i;
            }
        }
    }

    // F) Vehículos Oficiales de Asistencia de Circuito en Escapatorias Seguras
    // Estacionados únicamente en la zona de Paddock / Pit Lane o en escapatorias a más de 220px del asfalto
    if (nodes && nodes.length > 2) {
        // 1. Safety Car GT3 oficial: buscar aparcamiento en la calle de boxes o en escapatoria exterior segura
        let scPlaced = false;
        const pitObj = (track.objects || []).find(o => o.r === 'pit');
        if (pitObj) {
            const scX = pitObj.x;
            const scY = pitObj.y;
            const pitDist = (typeof getDistanceToRoad === 'function') ? getDistanceToRoad(scX, scY, scene).dist : 250;
            if (isBoxSafeFromRoad(scX, scY, 36, 18) && pitDist >= 170) {
                scene.add.rectangle(scX + lightConfig.shadowDx * 0.4, scY + lightConfig.shadowDy * 0.4, 64, 28, 0x000000, lightConfig.shadowAlpha).setAngle(pitObj.o || 0).setDepth(5);
                scene.add.sprite(scX, scY, 'dt_safety_car').setDisplaySize(64, 28).setAngle(pitObj.o || 0).setDepth(6);
                const strobe = scene.add.circle(scX, scY, 4, 0xf59e0b, 0.95).setDepth(7);
                scene.tweens.add({ targets: strobe, alpha: 0.15, duration: 420, yoyo: true, repeat: -1 });
                scPlaced = true;
            }
        }

        if (!scPlaced) {
            for (const side of [-1, 1]) {
                for (let offset = 220; offset <= 320; offset += 35) {
                    const scX = fx - dirX * 130 + perpX * offset * side;
                    const scY = fy - dirY * 130 + perpY * offset * side;
                    const scDist = (typeof getDistanceToRoad === 'function') ? getDistanceToRoad(scX, scY, scene).dist : 250;
                    if (isBoxSafeFromRoad(scX, scY, 36, 18) && scDist >= 220) {
                        scene.add.rectangle(scX + lightConfig.shadowDx * 0.4, scY + lightConfig.shadowDy * 0.4, 64, 28, 0x000000, lightConfig.shadowAlpha).setAngle(startAngleDeg).setDepth(5);
                        scene.add.sprite(scX, scY, 'dt_safety_car').setDisplaySize(64, 28).setAngle(startAngleDeg).setDepth(6);
                        const strobe = scene.add.circle(scX, scY, 4, 0xf59e0b, 0.95).setDepth(7);
                        scene.tweens.add({ targets: strobe, alpha: 0.15, duration: 420, yoyo: true, repeat: -1 });
                        scPlaced = true;
                        break;
                    }
                }
                if (scPlaced) break;
            }
        }

        // 2. Coche Médico y Grúa de Asistencia en el outfield exterior profundo (distancia >= 230px de la pista)
        const midNode = nodes[Math.floor(nodes.length * 0.5)];
        if (midNode) {
            let medPlaced = false;
            for (let offset = 240; offset <= 360; offset += 40) {
                for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                    const medX = midNode.x + dx * offset;
                    const medY = midNode.y + dy * offset;
                    const craneX = medX + 75;
                    const craneY = medY + 12;
                    const medDist = (typeof getDistanceToRoad === 'function') ? getDistanceToRoad(medX, medY, scene).dist : 300;
                    const craneDist = (typeof getDistanceToRoad === 'function') ? getDistanceToRoad(craneX, craneY, scene).dist : 300;
                    if (isBoxSafeFromRoad(medX, medY, 36, 18) && isBoxSafeFromRoad(craneX, craneY, 38, 20) && medDist >= 230 && craneDist >= 230) {
                        scene.add.rectangle(medX + lightConfig.shadowDx * 0.4, medY + lightConfig.shadowDy * 0.4, 60, 26, 0x000000, lightConfig.shadowAlpha).setDepth(5);
                        scene.add.sprite(medX, medY, 'dt_medical_car').setDisplaySize(60, 26).setDepth(6);

                        scene.add.rectangle(craneX + lightConfig.shadowDx * 0.4, craneY + lightConfig.shadowDy * 0.4, 66, 30, 0x000000, lightConfig.shadowAlpha).setDepth(5);
                        scene.add.sprite(craneX, craneY, 'dt_recovery_crane').setDisplaySize(66, 30).setDepth(6);
                        medPlaced = true;
                        break;
                    }
                }
                if (medPlaced) break;
            }
        }
    }

    // G) Torres de Iluminación de Estadio y Focos con Conos de Luz (Modo Noche)
    if ((selectedTimeOfDay === 'night' || (track && track.tod === 'night')) && nodes && nodes.length > 4) {
        const step = Math.max(2, Math.floor(nodes.length / 8));
        for (let i = 0; i < nodes.length; i += step) {
            const n = nodes[i];
            // Cono de luz sobre el asfalto (profundidad 3.2: bajo los coches pero sobre el asfalto)
            scene.add.sprite(n.x, n.y, 'dt_light_cone').setDisplaySize(210, 210).setDepth(3.2);

            // Torre de focos colocada de forma segura fuera del trazado
            let towerPlaced = false;
            for (let tOffset = 180; tOffset <= 280; tOffset += 35) {
                for (const [tdx, tdy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                    const towerX = n.x + tdx * tOffset;
                    const towerY = n.y + tdy * tOffset;
                    if (isBoxSafeFromRoad(towerX, towerY, 26, 26)) {
                        scene.add.rectangle(towerX + 4, towerY + 6, 44, 44, 0x000000, 0.65).setDepth(13);
                        scene.add.sprite(towerX, towerY, 'dt_floodlight_tower').setDisplaySize(44, 44).setDepth(14);
                        towerPlaced = true;
                        break;
                    }
                }
                if (towerPlaced) break;
            }
        }
    }

    // 5. PARRILLA DE SALIDA Y SPAWN DE COCHES OFICIAL
    // Ubicación oficial de meta: todos los coches salen DETRÁS de la línea de meta mirando hacia adelante

    // Resetear variables de carrera
    playerLap = 1;
    playerSpeed = 0;
    playerNextNodeIdx = 0;
    bestLapTime = null;
    offTrackTimer = 0;
    driftCharge = 0;
    driftBoostTimer = 0;
    raceStartTime = 0;

    // Coche del Jugador (Pole Position, colocado detrás de la línea de meta)
    let pCarData = DUST_CARS[carIdx] || DUST_CARS[0];
    if (typeof getEquippedNftCar === 'function' && typeof calculateCarPerformance === 'function') {
        const nftCar = getEquippedNftCar();
        if (nftCar) {
            const perf = calculateCarPerformance(nftCar);
            const pArch = (typeof getCarArchetype === 'function') ? getCarArchetype(nftCar) : 'lambo_wedge';
            const coloredTex = getOrCreateColoredCarTexture(scene, nftCar.colorHex, nftCar.sprite || 'car_red', pArch);
            pCarData = {
                id: nftCar.id,
                texture: coloredTex,
                hasCustomTexture: true,
                colorHex: nftCar.colorHex,
                name: nftCar.name,
                subtitle: `Niv. ${nftCar.level || 1} • ${nftCar.colorName}`,
                speed: perf.speedKmh,
                accel: perf.accelVal,
                handling: perf.handlingVal,
                braking: perf.brakingVal,
                tint: null
            };
        }
    }
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

    // 5 Rivales con Selección Aleatoria, 3 Niveles de Rendimiento Equilibrados y Siluetas Únicas
    aiCars = [];
    const AI_TIER_A = [
        { name: "Valkyrie AMR Pro", texture: "car_blue", colorHex: "#0284c7", archetype: "le_mans_proto", speed: 430, accel: 355, handling: 4.9, driver: "Marco 'Apex' Rossi", laneOffset: -24, drivingStyle: "apex_hunter" },
        { name: "Stuttgart Manthey 911", texture: "car_yellow", colorHex: "#facc15", archetype: "porsche_boxer", speed: 425, accel: 350, handling: 4.8, driver: "Klaus 'Precision' Weber", laneOffset: 24, drivingStyle: "sweeper" },
        { name: "Hyperion Senna 720S", texture: "car_cyan", colorHex: "#06b6d4", archetype: "ferrari_corsa", speed: 420, accel: 345, handling: 4.9, driver: "Ayrton 'Phantom' Silva", laneOffset: -16, drivingStyle: "apex_hunter" },
        { name: "Chiron Pur Sport Apex", texture: "car_blue", colorHex: "#1d4ed8", archetype: "bugatti_w16", speed: 432, accel: 360, handling: 4.7, driver: "Hans 'Blitz' Becker", laneOffset: 16, drivingStyle: "draft_passer" }
    ];

    const AI_TIER_B = [
        { name: "Bavaria ROWE M4", texture: "car_green", colorHex: "#15803d", archetype: "dtm_coupe", speed: 385, accel: 310, handling: 4.6, driver: "Matteo 'Fire' Bruno", laneOffset: -18, drivingStyle: "apex_hunter" },
        { name: "Scuderia 488 GT3", texture: "car_red", colorHex: "#e53935", archetype: "ferrari_corsa", speed: 378, accel: 305, handling: 4.5, driver: "Carlos 'Torque' Vega", laneOffset: 20, drivingStyle: "sweeper" },
        { name: "Solaris Dames GT", texture: "car_orange", colorHex: "#ea580c", archetype: "bentley_gt3", speed: 370, accel: 298, handling: 4.7, driver: "Sophie 'Viper' Laurent", laneOffset: 0, drivingStyle: "draft_passer" }
    ];

    const AI_TIER_C = [
        { name: "Tokyo Metro Turbo", texture: "car_pink", colorHex: "#ec4899", archetype: "jdm_supra", speed: 340, accel: 270, handling: 4.3, driver: "Kenji 'Rookie' Takahashi", laneOffset: -22, drivingStyle: "draft_passer" },
        { name: "Britannia Mini Cup", texture: "car_pink", colorHex: "#f472b6", archetype: "hot_hatch", speed: 335, accel: 265, handling: 4.4, driver: "Elena 'Mirage' Rostova", laneOffset: 22, drivingStyle: "sweeper" },
        { name: "Monza Urban Hatch", texture: "car_grey", colorHex: "#64748b", archetype: "rally_evo", speed: 325, accel: 255, handling: 4.2, driver: "Jean 'Cruiser' Dupont", laneOffset: -14, drivingStyle: "apex_hunter" },
        { name: "Sahara Dune Runner", texture: "car_orange", colorHex: "#ea580c", archetype: "dakar_truck", speed: 342, accel: 272, handling: 4.1, driver: "Tarek 'Sand' Mansour", laneOffset: 14, drivingStyle: "draft_passer" }
    ];

    // Mezclar y elegir exactamente: 2 Coches Buenos (Tier A), 1 Medio (Tier B), 2 Coches Lentos (Tier C)
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const chosenA = shuffle(AI_TIER_A).slice(0, 2);
    const chosenB = shuffle(AI_TIER_B).slice(0, 1);
    const chosenC = shuffle(AI_TIER_C).slice(0, 2);
    let gridRivals = shuffle([...chosenA, ...chosenB, ...chosenC]);

    // Garantizar máxima diversidad táctica en la parrilla (al menos 1 cazador de ápice y 1 trazada amplia)
    const currentStyles = gridRivals.map(r => r.drivingStyle);
    if (!currentStyles.includes('sweeper')) {
        const swp = [...AI_TIER_A, ...AI_TIER_B, ...AI_TIER_C].find(r => r.drivingStyle === 'sweeper');
        if (swp) gridRivals[gridRivals.length - 1] = swp;
    }
    if (!currentStyles.includes('apex_hunter')) {
        const apx = [...AI_TIER_A, ...AI_TIER_B, ...AI_TIER_C].find(r => r.drivingStyle === 'apex_hunter');
        if (apx) gridRivals[0] = apx;
    }

    for (let i = 0; i < 5; i++) {
        const rivalDef = gridRivals[i] || AI_TIER_B[0];
        const texKey = getOrCreateColoredCarTexture(scene, rivalDef.colorHex, rivalDef.texture, rivalDef.archetype);
        const aiData = {
            id: 'ai_' + i,
            texture: texKey,
            hasCustomTexture: true,
            colorHex: rivalDef.colorHex,
            name: rivalDef.name,
            subtitle: rivalDef.driver,
            speed: rivalDef.speed,
            accel: rivalDef.accel,
            handling: rivalDef.handling,
            braking: 3.5,
            tint: null
        };

        const row = Math.floor((i + 1) / 2);
        const col = (i + 1) % 2 === 1 ? -1 : 1;
        const aiDistBehind = playerDistBehind + (row * 50);
        const aiSideOffset = col * 26;

        const sx = fx - dirX * aiDistBehind + perpX * aiSideOffset;
        const sy = fy - dirY * aiDistBehind + perpY * aiSideOffset;

        const ai = spawnVehicle(scene, sx, sy, texKey, startAngleDeg, false, aiData);
        ai.targetNodeIdx = 0;
        ai.lastCheckpoint = -1;
        ai.aiVelocity = 0;
        ai.profile = {
            driver: rivalDef.driver,
            speedFactor: 1.0,
            accelFactor: 1.0,
            handlingFactor: 1.0,
            laneOffset: rivalDef.laneOffset || 0,
            drivingStyle: rivalDef.drivingStyle || 'balanced'
        };
        ai.laneOffset = ai.profile.laneOffset;
        ai.overtakeTimer = 0;
        ai.overtakeDir = 0;
        aiCars.push(ai);
    }

    // 6. CAPA AMBIENTAL DE ILUMINACIÓN Y OSCURIDAD (Día / Atardecer / Noche)
    const isNightTrack = (selectedTimeOfDay === 'night' || (track && track.tod === 'night') || trackId === 'neo_tokyo_bay');
    if (isNightTrack) {
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

    // Cámara fija 1:1 centrada perfectamente en el coche sin retardo ni desfase
    scene.cameras.main.startFollow(playerCar, false, 1.0, 1.0);
    if (typeof scene.cameras.main.setFollowOffset === 'function') {
        scene.cameras.main.setFollowOffset(0, 0);
    }
    scene.cameras.main.setZoom(1.1);

    // Crear Telemetría e Interfaz HUD
    setupHud(scene, track);

    // H) Viñeteado Cinematográfico de Retransmisión TV y Filtro de Atmósfera
    if (scene.textures && scene.textures.exists('dt_vignette')) {
        scene.add.sprite(480, 270, 'dt_vignette')
            .setScrollFactor(0)
            .setDepth(195)
            .setAlpha(lightConfig.vignetteAlpha);
    }

    if (lightConfig.tint) {
        scene.add.rectangle(480, 270, 960, 540, lightConfig.tint, lightConfig.tintAlpha)
            .setScrollFactor(0)
            .setDepth(194);
    }

    // Secuencia de Semáforo de Salida (3... 2... 1... GO!)
    startCountdown(scene);
}

// Spawnear vehículo con dimensiones supercar realistas (68x34) para asfalto de 256px
function spawnVehicle(scene, x, y, textureKey, angleDeg, isPlayer, carData) {
    const car = scene.physics.add.sprite(x, y, textureKey);
    car.setDisplaySize(68, 34);
    if (car.body) car.body.setSize(58, 26);
    car.setAngle(angleDeg);
    car.setDepth(10);
    car.setCollideWorldBounds(true);
    car.isPlayer = isPlayer;
    car.carData = carData;
    car.currentLap = 1;
    car.lastCheckpoint = 0;

    if (carData && carData.tint && !carData.hasCustomTexture) {
        try {
            const tintNum = typeof carData.tint === 'string' ? parseInt(carData.tint.replace('#', '0x'), 16) : carData.tint;
            if (!isNaN(tintNum)) car.setTint(tintNum);
        } catch(e) {}
    }

    // Sombra suave proyectada bajo el coche (contacto directo con suelo sin efecto de coche duplicado)
    car.shadow = scene.add.ellipse(x + 1, y + 1, 56, 24, 0x000000, 0.18).setDepth(9);

    // Neón Underglow bajo el chasis (Nocturno / Atardecer)
    car.underglow = scene.add.graphics().setDepth(8.5);

    // Discos de freno incandescentes al clavar frenos / derrapar
    car.brakesGlow = scene.add.graphics().setDepth(11.5);

    // Conos de luz de los faros delanteros (por encima del velo nocturno de profundidad 8)
    car.headlights = scene.add.graphics().setDepth(8.5);

    return car;
}

// Semáforo Oficial FIA Grand Prix de 5 Luces Rojas
function startCountdown(scene) {
    const gantry = scene.add.container(480, 110).setScrollFactor(0).setDepth(100);

    // Caja y soporte metálico del pórtico
    const box = scene.add.graphics();
    box.fillStyle(0x0a0d14, 0.94);
    box.fillRoundedRect(-165, -36, 330, 72, 10);
    box.lineStyle(2, 0x334155, 1);
    box.strokeRoundedRect(-165, -36, 330, 72, 10);

    // Título superior del pórtico
    const headerTxt = scene.add.text(0, -22, 'FIA STARTING SYSTEM', {
        font: '900 10px Arial Black',
        fill: '#94a3b8'
    }).setOrigin(0.5);
    gantry.add([box, headerTxt]);

    // 5 Luces FIA (cada una con círculo apagado)
    const lights = [];
    const startX = -120;
    const spacing = 60;
    for (let i = 0; i < 5; i++) {
        const lx = startX + i * spacing;
        const ly = 12;

        // Bisel exterior oscuro
        const bezel = scene.add.circle(lx, ly, 18, 0x1e293b);
        if (bezel && typeof bezel.setStrokeStyle === 'function') bezel.setStrokeStyle(1.5, 0x0f172a);
        // Luz apagada (rojo muy oscuro/negro)
        const bulb = scene.add.circle(lx, ly, 14, 0x220505);
        gantry.add([bezel, bulb]);
        lights.push(bulb);
    }

    let litCount = 0;
    const lightTimer = scene.time.addEvent({
        delay: 850,
        repeat: 4,
        callback: () => {
            if (litCount < 5) {
                // Encender luz roja i con beep
                if (lights[litCount].setFillStyle) lights[litCount].setFillStyle(0xff0033);
                if (lights[litCount].setStrokeStyle) lights[litCount].setStrokeStyle(3, 0xff8899);
                dustAudio.playCountdown(false);
                litCount++;

                if (litCount === 5) {
                    // Todas las 5 luces rojas encendidas: pausa de tensión aleatoria FIA (0.8s - 1.4s)
                    const randomHoldMs = 800 + Math.random() * 600;
                    scene.time.delayedCall(randomHoldMs, () => {
                        // ¡LIGHTS OUT! Se apagan todas de golpe y arranca la carrera
                        lights.forEach(l => {
                            if (l.setFillStyle) l.setFillStyle(0x00e676);
                            if (l.setStrokeStyle) l.setStrokeStyle(2, 0x003311);
                        });
                        dustAudio.playCountdown(true);
                        dustAudio.playBoost();

                        const goText = scene.add.text(0, 56, '¡LIGHTS OUT & AWAY WE GO!', {
                            font: '900 18px Arial Black',
                            fill: '#00f5d4',
                            stroke: '#000000',
                            strokeThickness: 4
                        }).setOrigin(0.5);
                        gantry.add(goText);

                        gameState = 'RACE';
                        raceStartTime = Date.now();
                        lapStartTime = Date.now();

                        // Desvanecer pórtico tras 1.2 segundos
                        scene.time.delayedCall(1200, () => {
                            if (scene.tweens && typeof scene.tweens.add === 'function') {
                                scene.tweens.add({
                                    targets: gantry,
                                    alpha: 0,
                                    y: 80,
                                    duration: 400,
                                    onComplete: () => gantry.destroy()
                                });
                            } else {
                                gantry.destroy();
                            }
                        });
                    });
                }
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

    // Badge de Modo Fantasma de Salida (Inmunidad a colisiones 5s)
    hudGhostBadge = scene.add.text(480, 68, '', {
        font: '900 15px Arial',
        fill: '#00f5d4',
        stroke: '#0a0c14',
        strokeThickness: 4,
        backgroundColor: '#0a0c14cc',
        padding: { x: 14, y: 6 }
    }).setOrigin(0.5, 0).setDepth(52);
    hudGhostBadge.setVisible(false);
    hud.add(hudGhostBadge);

    // Badge de Derrape / Mini-Turbo
    hudDriftBadge = scene.add.text(480, 478, '', {
        font: '900 13px Arial',
        fill: '#fee440',
        stroke: '#0a0c14',
        strokeThickness: 3,
        backgroundColor: '#0a0c14b0',
        padding: { x: 10, y: 4 }
    }).setOrigin(0.5, 0).setDepth(52);
    hudDriftBadge.setVisible(false);
    hud.add(hudDriftBadge);

    // Badge de Rebufo Aerodinámico (Slipstream / Drafting)
    hudSlipstreamBadge = scene.add.text(480, 448, '', {
        font: '900 13px Arial',
        fill: '#00f5d4',
        stroke: '#0a0c14',
        strokeThickness: 3,
        backgroundColor: '#0a0c14b0',
        padding: { x: 10, y: 4 }
    }).setOrigin(0.5, 0).setDepth(52);
    hudSlipstreamBadge.setVisible(false);
    hud.add(hudSlipstreamBadge);

    // Efectos de atmósfera meteorológica (Nieve, Arena, Lluvia nocturna, Brisa marina)
    weatherGraphics = scene.add.graphics().setScrollFactor(0).setDepth(48);

    // Líneas de velocidad aerodinámicas a alta velocidad (Speed Streaks)
    speedLinesGraphics = scene.add.graphics().setScrollFactor(0).setDepth(49);

    // Radar Minimapa en esquina inferior derecha
    radarGraphics = scene.add.graphics().setScrollFactor(0).setDepth(51);

    // Tacómetro y Cockpit Instrument Cluster GT3 (Top-Right bajo la barra superior)
    hudTachoGfx = scene.add.graphics().setScrollFactor(0).setDepth(52);
    hud.add(hudTachoGfx);

    hudGearText = scene.add.text(785, 56, 'GEAR 1', {
        font: '900 12px Arial Black',
        fill: '#00f5d4',
        backgroundColor: '#0a0d14dd',
        padding: { x: 7, y: 3 }
    }).setOrigin(0.5, 0).setDepth(53);
    hud.add(hudGearText);

    hudRpmText = scene.add.text(880, 56, '1800 RPM', {
        font: 'bold 11px Arial',
        fill: '#f8fafc'
    }).setOrigin(0.5, 0).setDepth(53);
    hud.add(hudRpmText);
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

    // Actualizar badges de HUD (Modo Fantasma inicial y Derrape/Turbo)
    if (hudGhostBadge) {
        const isGhostMode = (gameState === 'RACE' && (Date.now() - raceStartTime) < 5000);
        if (isGhostMode) {
            const remSec = Math.ceil((5000 - (Date.now() - raceStartTime)) / 1000);
            hudGhostBadge.setText(`👻 MODO FANTASMA: ${remSec}s (SALIDA LIMPIA SIN CHOQUES)`).setFill('#00f5d4').setVisible(true);
        } else if (gameState === 'RACE' && (Date.now() - raceStartTime) < 6500) {
            hudGhostBadge.setText(`🛡️ COLISIÓN Y CONTACTO ACTIVADOS`).setFill('#fee440').setVisible(true);
        } else {
            hudGhostBadge.setVisible(false);
        }
    }

    if (hudDriftBadge) {
        if (driftBoostTimer > 0) {
            hudDriftBadge.setText(`🚀 ¡BOOST DE DERRAPE ACTIVO!`).setFill('#00f5d4').setVisible(true);
        } else if (driftCharge >= 0.35) {
            hudDriftBadge.setText(`⚡ DERRAPE CARGADO • ¡SUELTA PARA TURBO!`).setFill('#fee440').setVisible(true);
        } else if (touchHandbrake || (keys && ((keys.space && keys.space.isDown) || (keys.shift && keys.shift.isDown)))) {
            hudDriftBadge.setText(`💨 DERRAPANDO...`).setFill('#ffffff').setVisible(true);
        } else {
            hudDriftBadge.setVisible(false);
        }
    }

    if (hudSlipstreamBadge) {
        if (playerInSlipstream && gameState === 'RACE') {
            hudSlipstreamBadge.setText(`💨 REBUFO AERODINÁMICO (+14% VELOCIDAD)`).setVisible(true);
        } else {
            hudSlipstreamBadge.setVisible(false);
        }
    }

    // Efecto de líneas de velocidad aerodinámicas desactivado para una visión 100% limpia y sin distracciones
    if (speedLinesGraphics) {
        speedLinesGraphics.clear();
    }

    // Partículas meteorológicas dinámicas por bioma (Nieve, Arena, Lluvia, Brisa)
    if (weatherGraphics && gameState === 'RACE' && weatherParticles.length > 0) {
        weatherGraphics.clear();
        const biome = getTrackBiome(track);
        const isNight = selectedTimeOfDay === 'night';

        if (selectedTimeOfDay === 'rain') {
            weatherGraphics.lineStyle(1.8, 0xbae6fd, 0.58);
            weatherParticles.forEach(p => {
                p.y += p.vy;
                p.x += p.vx;
                if (p.y > 540) { p.y = -20; p.x = Math.random() * 960; }
                if (p.x < -20) p.x = 980;
                weatherGraphics.lineBetween(p.x, p.y, p.x + p.vx * 1.8, p.y + p.size);
            });
        } else if (biome === 'snow') {
            weatherGraphics.fillStyle(0xffffff, 0.75);
            weatherParticles.forEach(p => {
                p.y += p.vy * 0.95;
                p.x += Math.sin(p.wiggle) * 0.8 - 0.4;
                p.wiggle += 0.05;
                if (p.y > 540) { p.y = -10; p.x = Math.random() * 960; }
                if (p.x < -10) p.x = 970;
                weatherGraphics.fillCircle(p.x, p.y, p.size);
            });
        } else if (biome === 'desert') {
            weatherGraphics.fillStyle(0xfde68a, 0.52);
            weatherParticles.forEach(p => {
                p.x += (p.vy * 1.5) + 1.2;
                p.y += Math.sin(p.wiggle) * 0.6;
                p.wiggle += 0.04;
                if (p.x > 960) { p.x = -10; p.y = Math.random() * 540; }
                weatherGraphics.fillCircle(p.x, p.y, p.size * 0.85);
            });
        } else if (biome === 'city' || isNight) {
            weatherGraphics.lineStyle(1.4, 0x38bdf8, 0.42);
            weatherParticles.forEach(p => {
                p.y += p.vy * 2.5;
                p.x -= 0.8;
                if (p.y > 540) { p.y = -15; p.x = Math.random() * 960; }
                weatherGraphics.lineBetween(p.x, p.y, p.x - 2, p.y + 12);
            });
        } else if (biome === 'coast') {
            weatherGraphics.fillStyle(0xe0f2fe, 0.48);
            weatherParticles.forEach(p => {
                p.x += (p.vy * 0.9);
                p.y += Math.sin(p.wiggle) * 0.8;
                p.wiggle += 0.03;
                if (p.x > 960) { p.x = -10; p.y = Math.random() * 540; }
                weatherGraphics.fillCircle(p.x, p.y, p.size * 0.7);
            });
        }
    }

    // Actualización dinámica de banderas en los puestos de comisarios (Track Marshals)
    if (trackMarshals && trackMarshals.length > 0) {
        const isIncident = (offTrackTimer > 0.45) || (Math.abs(playerSpeed) < 35 && gameState === 'RACE') || (lastCrashSoundTime && Date.now() - lastCrashSoundTime < 1800);
        const isFinish = (gameState === 'FINISHED' || gameState === 'GAME_OVER');
        const targetTex = isFinish ? 'dt_marshal_checkered' : (isIncident ? 'dt_marshal_yellow' : 'dt_marshal_green');
        trackMarshals.forEach(m => {
            if (m && m.active && m.texture && m.texture.key !== targetTex) {
                m.setTexture(targetTex);
            }
        });
    }

    // Flashes fotográficos de espectadores en las tribunas
    if (Math.random() < 0.05 && track && track.objects && raceScene && typeof raceScene.add === 'object' && raceScene.add.sprite) {
        const grandstands = track.objects.filter(o => o.r === 'grandstand');
        if (grandstands.length > 0) {
            const gs = grandstands[Math.floor(Math.random() * grandstands.length)];
            const flashX = gs.x + (Math.random() - 0.5) * 110;
            const flashY = gs.y + (Math.random() - 0.5) * 60;
            const fl = raceScene.add.sprite(flashX, flashY, 'dt_sparkle');
            if (fl && fl.setDisplaySize) {
                fl.setDisplaySize(16, 16);
                if (fl.setTint) fl.setTint(0xffffff);
                if (fl.setDepth) fl.setDepth(20);
                if (raceScene.tweens && typeof raceScene.tweens.add === 'function') {
                    raceScene.tweens.add({
                        targets: fl,
                        alpha: 0,
                        scale: 2.2,
                        duration: 90,
                        onComplete: () => fl.destroy && fl.destroy()
                    });
                }
            }
        }
    }

    // 1. Físicas y control del jugador
    updatePlayer(dt, track);

    // Bloqueo total de cámara: el coche siempre va exactamente en el centro de la pantalla
    if (raceScene && raceScene.cameras && raceScene.cameras.main && typeof raceScene.cameras.main.centerOn === 'function' && playerCar) {
        raceScene.cameras.main.centerOn(playerCar.x, playerCar.y);
    }

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

    if (raceScene && raceScene.cameras && raceScene.cameras.main && typeof raceScene.cameras.main.flash === 'function') {
        raceScene.cameras.main.flash(220, 255, 255, 255);
    }
    dustAudio.playKerb();
}

// Actualizar coche del jugador con límites de pista y prevención de atajos
function updatePlayer(dt, track) {
    if (!playerCar || !raceScene) return;
    const cData = playerCar.carData || {};
    const biome = getTrackBiome(track);
    const left = Boolean((keys && keys.left && keys.left.isDown) || (keys && keys.a && keys.a.isDown) || touchLeft);
    const right = Boolean((keys && keys.right && keys.right.isDown) || (keys && keys.d && keys.d.isDown) || touchRight);
    const gas = Boolean((keys && keys.up && keys.up.isDown) || (keys && keys.w && keys.w.isDown) || touchGas);
    const brake = Boolean((keys && keys.down && keys.down.isDown) || (keys && keys.s && keys.s.isDown) || touchBrake);
    const handbrake = Boolean((keys && keys.space && keys.space.isDown) || (keys && keys.shift && keys.shift.isDown) || touchHandbrake);

    // Detección de distancia a la carretera más cercana (Límites de pista y Anti-Atajos)
    const roadInfo = getDistanceToRoad(playerCar.x, playerCar.y, raceScene);
    const ti = Math.floor(playerCar.x / 256);
    const tj = Math.floor(playerCar.y / 256);
    const tile = (raceScene.tileMap && typeof raceScene.tileMap.get === 'function') ? raceScene.tileMap.get(`${ti},${tj}`) : null;

    let grip = 1.0;
    let surfaceLabel = 'ASFALTO (GRIP 100%)';

    if (tile && (tile.t === 'straight' || tile.t === 'finish' || tile.t.startsWith('corner') || tile.t.startsWith('straight45') || tile.t === 'bridge')) {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 2);
        grip = 1.0;
        if (tile.t === 'bridge') {
            surfaceLabel = playerCar.onBridgeDeck ? 'PUENTE ELEVADO (CRUCE SUPERIOR)' : 'TÚNEL DE PISTA (CRUCE INFERIOR)';
        } else {
            surfaceLabel = 'ASFALTO (GRIP 100%)';
        }

        // Detección de pisada de pianos / bordillos de competición (Rumble Strips)
        const isBitingCurb = (roadInfo.dist >= 74 && roadInfo.dist <= 120 && Math.abs(playerSpeed) > 40);
        if (isBitingCurb) {
            surfaceLabel = 'PIANO DE CURVA (RUMBLE STRIP)';
            dustAudio.playRumbleStrip(Math.round(Math.abs(playerSpeed) * 0.65));
            // Microvibración háptica y de suspensión en el chasis
            playerCar.x += (Math.random() - 0.5) * 1.2;
            playerCar.y += (Math.random() - 0.5) * 1.2;
            // Chispas de titanio al morder bordillos a velocidad
            if (Math.abs(playerSpeed) > 110 && Math.random() < 0.6) {
                spawnTitaniumSparks(raceScene, playerCar.x, playerCar.y, playerCar.angle, 3);
            }
            if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
                try { window.navigator.vibrate(10); } catch(e) {}
            }
        }
    } else if (tile && tile.t === 'sand') {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 1.5);
        grip = 0.40;
        surfaceLabel = 'TRAMPA DE ARENA (DECELERACIÓN)';
        dustAudio.playSand();
        spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xc5a059);
        spawnDebris(raceScene, playerCar.x, playerCar.y, (biome === 'snow') ? 'snow' : 'gravel', playerCar.angle, playerSpeed);
    } else if (tile && tile.t.startsWith('sandGrass')) {
        offTrackTimer = Math.max(0, offTrackTimer - dt * 1.5);
        grip = 0.58;
        surfaceLabel = 'TRANSICIÓN ARENA-CÉSPED';
        spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', 0xd7ccc8);
        spawnDebris(raceScene, playerCar.x, playerCar.y, (biome === 'snow') ? 'snow' : 'grass', playerCar.angle, playerSpeed);
    } else {
        // Fuera del asfalto: margen permitido de escapatoria ("salirse un poco") vs atajo ilegal
        if (roadInfo.dist <= 175) {
            // Margen permitido de escapatoria o trompo leve (hasta 175px)
            offTrackTimer = Math.max(0, offTrackTimer - dt);
            grip = 0.52;
            surfaceLabel = 'CÉSPED DE ESCAPATORIA (DERIVA)';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', (biome === 'snow') ? 0xf8fafc : 0x388e3c);
            spawnDebris(raceScene, playerCar.x, playerCar.y, (biome === 'snow') ? 'snow' : 'grass', playerCar.angle, playerSpeed);
        } else {
            // ATAJO ILEGAL: Fuera de los límites permitidos del trazado
            grip = 0.22;
            surfaceLabel = '⚠️ FUERA DE LÍMITES - RETORNA A PISTA';
            spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_smoke', (biome === 'snow') ? 0xf8fafc : 0x2e7d32);
            spawnDebris(raceScene, playerCar.x, playerCar.y, (biome === 'snow') ? 'snow' : 'grass', playerCar.angle, playerSpeed);

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

    // Efecto de lluvia (Wet Track): agarre reducido y spray de agua detrás de neumáticos
    if (selectedTimeOfDay === 'rain') {
        grip *= 0.84;
        if (Math.abs(playerSpeed) > 75 && Math.random() < 0.42) {
            spawnWaterSpray(raceScene, playerCar);
        }
    }

    // Trazada engomada dinámica (Racing Groove): acumulación sutil de goma en apoyos fuertes
    if (racingGrooveLayer && Math.abs(playerSpeed) > 120 && (left || right || brake || handbrake) && Math.random() < 0.20) {
        racingGrooveLayer.fillStyle(0x05070a, 0.032);
        racingGrooveLayer.fillCircle(playerCar.x, playerCar.y, 14);
    }

    // Petardeo de escape al soltar el acelerador a alta velocidad (Anti-lag GT3)
    if (playerCar.wasGas && !gas && Math.abs(playerSpeed) > 160) {
        dustAudio.playBackfire();
        spawnBackfireFlame(raceScene, playerCar);
    }
    playerCar.wasGas = gas;

    hudSurfaceText.setText(`SUPERFICIE: ${surfaceLabel}`);

    // Detección de Rebufo Aerodinámico (Slipstream / Drafting)
    let inDraftingZone = false;
    if (aiCars && aiCars.length > 0 && gameState === 'RACE') {
        const pRad = Phaser.Math.DegToRad(playerCar.angle);
        const pCos = Math.cos(pRad);
        const pSin = Math.sin(pRad);
        for (let a = 0; a < aiCars.length; a++) {
            const ai = aiCars[a];
            if (!ai || !ai.active) continue;
            const dx = ai.x - playerCar.x;
            const dy = ai.y - playerCar.y;
            const fwd = dx * pCos + dy * pSin;
            const lat = Math.abs(-dx * pSin + dy * pCos);
            if (fwd > 28 && fwd < 135 && lat < 28) {
                inDraftingZone = true;
                if (Math.random() < 0.28) {
                    spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_sparkle', 0x00f5d4);
                }
                break;
            }
        }
    }
    playerInSlipstream = inDraftingZone;

    // Aceleración, Frenada y Freno de Mano (Derrape)
    const slipstreamSpeedBonus = playerInSlipstream ? 1.14 : 1.0;
    const slipstreamAccelBonus = playerInSlipstream ? 1.28 : 1.0;
    const topSpeed = cData.speed * grip * slipstreamSpeedBonus;
    const accelRate = cData.accel * grip * slipstreamAccelBonus;

    if (gameState === 'RACE') {
        const isTurning = left || right;

        if (handbrake) {
            // Freno de mano / Derrape activo:
            // Permite un ángulo de rotación mucho más agresivo en curvas muy cerradas (+85% yaw rate)
            // Manteniendo la inercia sin clavar las ruedas a 0
            if (gas) {
                // Power slide (gas + freno de mano para sostener el derrape en alta velocidad)
                playerSpeed = Math.max(topSpeed * 0.45, Math.min(topSpeed * 0.92, playerSpeed + accelRate * 0.35 * dt));
            } else {
                // Derrape por inercia
                playerSpeed = Math.max(topSpeed * 0.30, playerSpeed - accelRate * 0.70 * dt);
            }

            dustAudio.playDrift();
            drawSkid(playerCar.x, playerCar.y, playerCar.angle, playerCar);
            spawnTireSmoke(raceScene, playerCar.x, playerCar.y, playerCar.angle);

            // Cargar impulso de salida del derrape (Mini-Turbo)
            if (isTurning && playerSpeed > 90) {
                driftCharge = Math.min(1.5, driftCharge + dt * 1.2);
            }
        } else {
            // Al soltar el freno de mano tras un derrape sostenido: ¡impulso de salida turbo!
            if (driftCharge >= 0.35) {
                const boostPower = Math.min(85, Math.round(driftCharge * 60));
                playerSpeed = Math.min(topSpeed * 1.15, playerSpeed + boostPower);
                driftBoostTimer = 0.5;
                spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_sparkle', 0x00f5d4);
                try { if (dustAudio && typeof dustAudio.playBoost === 'function') dustAudio.playBoost(); } catch(e) {}
            }
            driftCharge = 0;

            if (driftBoostTimer > 0) {
                driftBoostTimer = Math.max(0, driftBoostTimer - dt);
                spawnDust(raceScene, playerCar.x, playerCar.y, 'dt_sparkle', 0x00f5d4);
            }

            if (gas) {
                playerSpeed = Math.min(topSpeed, playerSpeed + accelRate * dt);
                if (isTurning && playerSpeed > 180) {
                    dustAudio.playDrift();
                    drawSkid(playerCar.x, playerCar.y, playerCar.angle, playerCar);
                    spawnTireSmoke(raceScene, playerCar.x, playerCar.y, playerCar.angle);
                } else if (playerCar) {
                    playerCar.prevSkidL = null;
                    playerCar.prevSkidR = null;
                }
            } else if (brake) {
                playerSpeed = Math.max(-topSpeed * 0.35, playerSpeed - accelRate * 2.2 * dt);
                dustAudio.playDrift();
                drawSkid(playerCar.x, playerCar.y, playerCar.angle, playerCar);
                spawnTireSmoke(raceScene, playerCar.x, playerCar.y, playerCar.angle);
            } else {
                playerSpeed *= 0.982;
                if (playerCar) {
                    playerCar.prevSkidL = null;
                    playerCar.prevSkidR = null;
                }
            }
        }

        // Giro: el freno de mano multiplica la capacidad de giro (yaw) para clavar horquillas
        const yawMultiplier = handbrake ? 1.85 : 1.0;
        const steer = cData.handling * yawMultiplier * (playerSpeed > 40 ? 1 : playerSpeed / 40);
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
    if (playerCar) playerCar.maxReachedSpeed = Math.max(playerCar.maxReachedSpeed || 0, kmh);

    // Actualizar Tacómetro Cockpit GT3, Marchas y LEDs de Régimen
    const maxKmh = Math.max(360, (cData.speed || 380) * 0.65);
    let gear = 1;
    let gearRpmRatio = 0;

    if (kmh < 65) {
        gear = 1;
        gearRpmRatio = kmh / 65;
    } else if (kmh < 130) {
        gear = 2;
        gearRpmRatio = (kmh - 65) / 65;
    } else if (kmh < 205) {
        gear = 3;
        gearRpmRatio = (kmh - 130) / 75;
    } else if (kmh < 280) {
        gear = 4;
        gearRpmRatio = (kmh - 205) / 75;
    } else if (kmh < 350) {
        gear = 5;
        gearRpmRatio = (kmh - 280) / 70;
    } else {
        gear = 6;
        gearRpmRatio = Math.min(1.0, (kmh - 350) / 90);
    }

    if (gear !== lastPlayerGear && kmh > 15) {
        dustAudio.playGearShift(gear);
        lastPlayerGear = gear;
    }

    const currentRpm = Math.floor(2200 + gearRpmRatio * 6800);
    if (hudGearText) hudGearText.setText(`GEAR ${gear}`);
    if (hudRpmText) {
        hudRpmText.setText(`${currentRpm} RPM`);
        hudRpmText.setFill(gearRpmRatio > 0.88 ? '#ff1744' : (gearRpmRatio > 0.70 ? '#facc15' : '#f8fafc'));
    }

    // Tira de 8 LEDs de Régimen FIA/GT3
    if (hudTachoGfx) {
        hudTachoGfx.clear();
        const tx = 750, ty = 76, ledW = 20, ledH = 8, gap = 4;
        hudTachoGfx.fillStyle(0x0a0d14, 0.85);
        hudTachoGfx.fillRoundedRect(tx - 6, ty - 4, (ledW + gap) * 8 + 8, ledH + 8, 4);

        const litLeds = Math.floor(gearRpmRatio * 8.5);
        for (let li = 0; li < 8; li++) {
            const lx = tx + li * (ledW + gap);
            let ledColor = 0x1e293b;
            if (li < litLeds) {
                if (li < 3) ledColor = 0x10b981; // Verde
                else if (li < 6) ledColor = 0xf59e0b; // Ámbar
                else ledColor = (gearRpmRatio > 0.94 && Math.floor(Date.now() / 80) % 2 === 0) ? 0x38bdf8 : 0xef4444; // Destello al corte
            }
            hudTachoGfx.fillStyle(ledColor, 1);
            hudTachoGfx.fillRoundedRect(lx, ty, ledW, ledH, 2);
        }
    }

    checkLap(playerCar, track);
}

function wrapAngleDeg(deg) {
    let d = (deg + 180) % 360;
    if (d < 0) d += 360;
    return d - 180;
}

// Actualizar IA de rivales: sólida, competitiva, con adelantamientos dinámicos y trazadas diversas
function updateAiCar(ai, dt, track) {
    const nodes = track.nodes;
    if (!nodes || nodes.length === 0) return;

    const profile = ai.profile || { speedFactor: 1.0, accelFactor: 1.0, handlingFactor: 1.0, laneOffset: 0, drivingStyle: 'balanced' };
    const targetNode = nodes[ai.targetNodeIdx];
    if (!targetNode) return;

    // 1. Detección de curvatura y dirección de giro
    const prevNode = nodes[(ai.targetNodeIdx - 1 + nodes.length) % nodes.length] || targetNode;
    const nextNode = nodes[(ai.targetNodeIdx + 1) % nodes.length] || targetNode;
    const inAngle = Math.atan2(targetNode.y - prevNode.y, targetNode.x - prevNode.x);
    const outAngle = Math.atan2(nextNode.y - targetNode.y, nextNode.x - targetNode.x);
    const cornerDeg = wrapAngleDeg(Phaser.Math.RadToDeg(outAngle - inAngle));
    const isSharpTurn = Math.abs(cornerDeg) > 18;
    const turnDir = Math.sign(cornerDeg) || 1; // 1 = giro a derecha, -1 = giro a izquierda

    // 2. Detección de tráfico próximo (adelantamientos activos, rebufo y espacio lateral)
    const curRad = Phaser.Math.DegToRad(ai.angle);
    const forwardCos = Math.cos(curRad);
    const forwardSin = Math.sin(curRad);
    let carDirectlyAhead = false;
    let closestAheadCar = null;
    let inAiDrafting = false;
    let closestAheadDist = Infinity;
    let aheadCarLatSide = 0; // -1 si el coche delantero está a la izquierda, +1 si a la derecha
    let sideRepulsion = 0;

    const allVehicles = (typeof raceScene !== 'undefined' && raceScene) ? [playerCar, ...aiCars] : [];
    for (let j = 0; j < allVehicles.length; j++) {
        const other = allVehicles[j];
        if (!other || other === ai || !other.active) continue;
        const odx = other.x - ai.x;
        const ody = other.y - ai.y;
        const fwdDist = odx * forwardCos + ody * forwardSin;
        const latDist = -odx * forwardSin + ody * forwardCos; // Positivo a la derecha, negativo a la izquierda

        // Coche directamente delante en línea de choque (distancia < 125px)
        if (fwdDist > 0 && fwdDist < 125 && Math.abs(latDist) < 32) {
            if (fwdDist < closestAheadDist) {
                closestAheadDist = fwdDist;
                closestAheadCar = other;
                aheadCarLatSide = latDist >= 0 ? 1 : -1;
            }
            if (fwdDist < 42 && Math.abs(latDist) < 24) {
                carDirectlyAhead = true; // Parachoques con parachoques
            } else if (fwdDist >= 42) {
                inAiDrafting = true; // Rebufo y preparación de adelantamiento
            }
        }

        // Coches en paralelo / lucha rueda a rueda: darse espacio lateral
        if (Math.abs(fwdDist) < 48 && Math.abs(latDist) < 36) {
            sideRepulsion += (latDist > 0 ? -1 : 1) * 8;
        }
    }

    // 3. Sistema de Adelantamiento Activo y Trazada Diferenciada por Piloto
    if (ai.overtakeTimer > 0) ai.overtakeTimer -= dt;

    if (closestAheadDist < 125) {
        // El coche delantero está cerca: buscar carril despejado para adelantar
        if (!ai.overtakeDir || ai.overtakeTimer <= 0) {
            // Si el rival va por la derecha, adelantar por la izquierda (-1); si va por la izquierda, por la derecha (+1)
            ai.overtakeDir = aheadCarLatSide >= 0 ? -1 : 1;
            ai.overtakeTimer = 1.35; // Mantener la maniobra durante 1.35s para no zigzaguear
        }
    } else if (ai.overtakeTimer <= 0) {
        ai.overtakeDir = 0;
    }

    // Cálculo del offset lateral dinámico según personalidad y trazada de curva
    let dynamicLaneOffset = profile.laneOffset || 0;
    if (isSharpTurn) {
        // En curvas, cada piloto traza según su estilo propio para no hacer fila india:
        if (profile.drivingStyle === 'apex_hunter') {
            dynamicLaneOffset = -turnDir * 24; // Se tira al vértice interior de la curva
        } else if (profile.drivingStyle === 'sweeper') {
            dynamicLaneOffset = turnDir * 22;  // Trazada exterior amplia con mayor velocidad de paso
        } else {
            dynamicLaneOffset = (profile.laneOffset || 0) * 0.85; // Mantiene su carril intermedio
        }
    }

    // Si está adelantando, abrir carril hasta 32px en el lado libre
    if (ai.overtakeDir !== 0) {
        dynamicLaneOffset += ai.overtakeDir * 32;
    }

    // Añadir repulsión lateral rueda a rueda
    if (sideRepulsion !== 0) {
        dynamicLaneOffset += sideRepulsion;
    }

    // Limitar offset seguro dentro del ancho del asfalto (máx ±36px de 100px disponibles)
    dynamicLaneOffset = Math.max(-36, Math.min(36, dynamicLaneOffset));

    // Posición objetivo en la trazada de asfalto
    let tx = targetNode.x;
    let ty = targetNode.y;
    if (dynamicLaneOffset !== 0) {
        const dx = nextNode.x - targetNode.x;
        const dy = nextNode.y - targetNode.y;
        const len = Math.hypot(dx, dy) || 1;
        tx += (-dy / len) * dynamicLaneOffset;
        ty += (dx / len) * dynamicLaneOffset;
    }

    const angleRad = Math.atan2(ty - ai.y, tx - ai.x);
    const targetDeg = Phaser.Math.RadToDeg(angleRad);
    const diff = wrapAngleDeg(targetDeg - ai.angle);

    // Giro reactivo y preciso
    const turnStep = ai.carData.handling * (profile.handlingFactor || 1.0) * (isSharpTurn ? 1.20 : 1.08);
    ai.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnStep);

    // 4. Velocidad y Rebufo para Adelantar
    const aiRoad = getDistanceToRoad(ai.x, ai.y, raceScene);
    const isAiOffTrack = aiRoad.dist > 130;

    let baseTopSpeed = ai.carData.speed * (profile.speedFactor || 1.0);
    if (inAiDrafting || ai.overtakeDir !== 0) {
        baseTopSpeed *= 1.10; // Impulso de rebufo (+10%) para completar el adelantamiento
    }

    const curveScrub = isSharpTurn ? (Math.abs(diff) > 22 ? 0.84 : 0.94) : (Math.abs(diff) > 28 ? 0.92 : 1.0);
    let targetVel = baseTopSpeed * curveScrub;

    // Frenada inteligente: si hay un coche delantero detenido o muy lento, no seguir empujándolo
    if (carDirectlyAhead && closestAheadCar) {
        const otherSpeed = Math.abs(closestAheadCar.aiVelocity !== undefined ? closestAheadCar.aiVelocity : (typeof playerSpeed !== 'undefined' ? playerSpeed : 0));
        if (otherSpeed < 60) {
            // Coche delantero frenado o atascado: FRENADA A 0 (no empujar ni amontonarse)
            targetVel = 0;
            // Forzar búsqueda de hueco lateral para esquivar
            ai.overtakeDir = aheadCarLatSide >= 0 ? -1 : 1;
            ai.overtakeTimer = 1.8;
        } else {
            targetVel = Math.min(targetVel, otherSpeed * 0.90);
        }
    }
    if (isAiOffTrack) targetVel *= 0.50; // Pérdida drástica de agarre en hierba

    // Aceleración y deceleración
    ai.aiVelocity = ai.aiVelocity || 0;
    if (ai.aiVelocity < targetVel) {
        ai.aiVelocity = Math.min(targetVel, ai.aiVelocity + ai.carData.accel * (profile.accelFactor || 1.0) * dt);
    } else {
        ai.aiVelocity = Math.max(targetVel, ai.aiVelocity - ai.carData.accel * (isAiOffTrack ? 1.6 : 0.55) * dt);
    }

    // 4. Máquina de Estados Anti-Atasco (Watchdog): detecta colisión/bloqueo y ejecuta maniobra de desatasco real
    if (!ai.unstuckState) {
        ai.unstuckState = {
            state: 'NORMAL',
            timer: 0,
            reverseDuration: 0,
            reverseSteer: 0,
            lastX: ai.x,
            lastY: ai.y,
            checkTimer: 0
        };
    }

    const uState = ai.unstuckState;
    uState.checkTimer += dt;

    if (uState.checkTimer >= 0.20) {
        const movedDist = Math.hypot(ai.x - uState.lastX, ai.y - uState.lastY);
        uState.lastX = ai.x;
        uState.lastY = ai.y;
        uState.checkTimer = 0;

        // Si el coche apenas se desplazó (< 8px en 0.20s, es decir < 40px/s)
        if (movedDist < 8) {
            uState.timer += 0.20;
        } else if (uState.state === 'NORMAL') {
            uState.timer = Math.max(0, uState.timer - 0.20);
        }
    }

    // Transición de estados de desatasco
    if (uState.state === 'NORMAL') {
        if (uState.timer >= 0.70) {
            // Iniciar marcha atrás de desatasco por 1 segundo completo
            uState.state = 'REVERSING';
            uState.reverseDuration = 1.0;
            uState.reverseSteer = (ai.targetNodeIdx % 2 === 0 ? 1 : -1) * 55;
            ai.aiVelocity = -150;
        }
    } else if (uState.state === 'REVERSING') {
        uState.reverseDuration -= dt;
        uState.timer += dt; // Continúa acumulando tiempo total de bloqueo

        // Potente marcha atrás con giro evasivo para desclavar el morro del obstáculo
        ai.aiVelocity = -150;
        ai.angle += uState.reverseSteer * dt * 2;

        if (uState.reverseDuration <= 0) {
            // Fin de marcha atrás: intentar reanudar marcha hacia adelante
            uState.state = 'NORMAL';
            uState.reverseDuration = 0;
            ai.aiVelocity = 90;
        }
    }

    // Si lleva más de 2.0s bloqueado o atrapado en una montonera: Reposición limpia e inmediata en el circuito
    if (uState.timer >= 2.0) {
        ai.x = targetNode.x;
        ai.y = targetNode.y;
        const respawnAng = Math.atan2(nextNode.y - targetNode.y, nextNode.x - targetNode.x);
        ai.angle = Phaser.Math.RadToDeg(respawnAng);
        ai.aiVelocity = 190;
        uState.state = 'NORMAL';
        uState.timer = 0;
        uState.reverseDuration = 0;
        if (raceScene) spawnDust(raceScene, ai.x, ai.y, 'dt_sparkle', 0x00f5d4);
    }

    const rad = Phaser.Math.DegToRad(ai.angle);
    ai.setVelocity(Math.cos(rad) * ai.aiVelocity, Math.sin(rad) * ai.aiVelocity);

    // Huellas y humo de derrape en curvas
    if (Math.abs(diff) > 26 && ai.aiVelocity > 160) {
        drawSkid(ai.x, ai.y, ai.angle, ai);
        spawnTireSmoke(raceScene, ai.x, ai.y, ai.angle);
    } else {
        ai.prevSkidL = null;
        ai.prevSkidR = null;
    }

    // 5. Radio de paso de nodo estricto: 68px en curvas (garantiza paso por asfalto sin atajos) y 110px en rectas
    const waypointRadius = isSharpTurn ? 68 : 110;
    const dist = Math.hypot(ai.x - tx, ai.y - ty);

    if (dist < waypointRadius) {
        const prevAiIdx = ai.targetNodeIdx;
        ai.lastCheckpoint = prevAiIdx;
        ai.targetNodeIdx = (ai.targetNodeIdx + 1) % nodes.length;
        if (prevAiIdx === nodes.length - 1) {
            ai.currentLap = (ai.currentLap || 0) + 1;
        }
    }
}

// Dibujar marcas permanentes de derrape con bandas de rodadura continua (Skid Marks Pro)
function drawSkid(x, y, angleDeg, carObj) {
    if (!skidLayer) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const px = Math.cos(rad) * 12;
    const py = Math.sin(rad) * 12;
    const wL = { x: x + px, y: y + py };
    const wR = { x: x - px, y: y - py };

    if (carObj && carObj.prevSkidL && carObj.prevSkidR) {
        const dL = Math.hypot(wL.x - carObj.prevSkidL.x, wL.y - carObj.prevSkidL.y);
        if (dL < 48 && dL > 1.5) {
            skidLayer.lineStyle(5.2, 0x07090e, 0.52);
            skidLayer.lineBetween(carObj.prevSkidL.x, carObj.prevSkidL.y, wL.x, wL.y);
            skidLayer.lineBetween(carObj.prevSkidR.x, carObj.prevSkidR.y, wR.x, wR.y);
        }
    } else {
        skidLayer.fillStyle(0x07090e, 0.52);
        skidLayer.fillCircle(wL.x, wL.y, 2.6);
        skidLayer.fillCircle(wR.x, wR.y, 2.6);
    }

    if (carObj) {
        carObj.prevSkidL = wL;
        carObj.prevSkidR = wR;
    }
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

// Emisor de humo volumétrico de derrape en neumáticos (Volumetric Tire Smoke)
function spawnTireSmoke(scene, x, y, angleDeg) {
    if (!scene || Math.random() > 0.38) return;
    const rad = Phaser.Math.DegToRad(angleDeg + 90);
    const px = Math.cos(rad) * 11;
    const py = Math.sin(rad) * 11;
    const offsetSide = Math.random() > 0.5 ? 1 : -1;

    const tex = (scene.textures && scene.textures.exists('dt_tire_smoke')) ? 'dt_tire_smoke' : 'dt_smoke';
    const smoke = scene.add.sprite(
        x + px * offsetSide + (Math.random() - 0.5) * 6,
        y + py * offsetSide + (Math.random() - 0.5) * 6,
        tex
    ).setDisplaySize(16, 16).setDepth(8).setAlpha(0.72);

    scene.tweens.add({
        targets: smoke,
        alpha: 0,
        scale: 3.4,
        x: smoke.x + (Math.random() - 0.5) * 20,
        y: smoke.y + (Math.random() - 0.5) * 20,
        duration: 480,
        ease: 'Quad.easeOut',
        onComplete: () => smoke.destroy()
    });
}

// Llamarada de escape dual y petardeo (Dual-Core Anti-lag Backfire Flame)
function spawnBackfireFlame(scene, car) {
    if (!scene || !car || !car.active) return;
    const rad = Phaser.Math.DegToRad(car.angle);
    const rx = car.x - Math.cos(rad) * 23;
    const ry = car.y - Math.sin(rad) * 23;
    const perp = rad + Math.PI / 2;

    [-6.5, 6.5].forEach(offset => {
        const fx = rx + Math.cos(perp) * offset;
        const fy = ry + Math.sin(perp) * offset;

        // Corona exterior de fuego naranja / incandescente GT3
        const flameOuter = scene.add.sprite(fx, fy, (scene.textures && scene.textures.exists('dt_backfire_flame')) ? 'dt_backfire_flame' : 'dt_sparkle')
            .setDisplaySize(20, 20)
            .setDepth(13)
            .setTint(0xff6b00);

        scene.tweens.add({
            targets: flameOuter,
            scale: 2.2,
            alpha: 0,
            duration: 130,
            onComplete: () => flameOuter.destroy()
        });

        // Núcleo ultra-caliente cian / azul eléctrico de competición
        const flameCore = scene.add.sprite(fx, fy, 'dt_sparkle')
            .setDisplaySize(11, 11)
            .setDepth(13.1)
            .setTint(0x00f5d4);

        scene.tweens.add({
            targets: flameCore,
            scale: 1.6,
            alpha: 0,
            duration: 90,
            onComplete: () => flameCore.destroy()
        });

        // Micro-chispas de escape eyectadas hacia atrás
        for (let s = 0; s < 2; s++) {
            const spkAng = rad + Math.PI + (Math.random() - 0.5) * 0.7;
            const sp = scene.add.sprite(fx, fy, 'dt_sparkle')
                .setDisplaySize(7, 7)
                .setDepth(13.2)
                .setTint(Math.random() > 0.5 ? 0xffd700 : 0xff3d00);
            scene.tweens.add({
                targets: sp,
                x: fx + Math.cos(spkAng) * (18 + Math.random() * 22),
                y: fy + Math.sin(spkAng) * (18 + Math.random() * 22),
                scale: 0.1,
                alpha: 0,
                duration: 130 + Math.random() * 70,
                onComplete: () => sp.destroy()
            });
        }
    });
}

// Eyección física de restos del terreno al salirse de pista (Physical Debris: Hierba, Grava, Nieve)
function spawnDebris(scene, x, y, type = 'grass', carAngle = 0, carSpeed = 100) {
    if (!scene || Math.random() > 0.45) return;
    const texMap = {
        grass: 'dt_debris_grass',
        gravel: 'dt_debris_gravel',
        snow: 'dt_debris_snow'
    };
    const key = (scene.textures && scene.textures.exists(texMap[type])) ? texMap[type] : 'dt_sparkle';
    const rad = Phaser.Math.DegToRad(carAngle + 180 + (Math.random() - 0.5) * 60);
    const spd = Math.min(65, (Math.abs(carSpeed) / 4) + 16 + Math.random() * 22);

    const p = scene.add.sprite(
        x + (Math.random() - 0.5) * 12,
        y + (Math.random() - 0.5) * 12,
        key
    ).setDisplaySize(12, 12).setDepth(12);

    scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(rad) * spd,
        y: p.y + Math.sin(rad) * spd,
        angle: p.angle + (Math.random() - 0.5) * 360,
        alpha: 0,
        scale: 0.35,
        duration: 240 + Math.random() * 120,
        onComplete: () => p.destroy()
    });
}

// Spray de agua volumétrico detrás de neumáticos en pista mojada (Rooster Tails)
function spawnWaterSpray(scene, car) {
    if (!scene || !car || !car.active) return;
    const rad = Phaser.Math.DegToRad(car.angle);
    const rx = car.x - Math.cos(rad) * 20;
    const ry = car.y - Math.sin(rad) * 20;
    const perp = rad + Math.PI / 2;
    const tex = (scene.textures && scene.textures.exists('dt_water_spray')) ? 'dt_water_spray' : 'dt_smoke';

    [-6.5, 6.5].forEach(offset => {
        const sx = rx + Math.cos(perp) * offset;
        const sy = ry + Math.sin(perp) * offset;
        const sprayAngle = rad + Math.PI + (Math.random() - 0.5) * 0.45;
        const dist = 24 + Math.random() * 32;

        const sp = scene.add.sprite(sx, sy, tex)
            .setDisplaySize(18, 18)
            .setDepth(11.5)
            .setAlpha(0.45);

        scene.tweens.add({
            targets: sp,
            x: sx + Math.cos(sprayAngle) * dist,
            y: sy + Math.sin(sprayAngle) * dist,
            scale: 2.3,
            alpha: 0,
            duration: 220 + Math.random() * 90,
            onComplete: () => sp.destroy()
        });
    });
}

// Colisiones suaves entre vehículos (físicas estables sin descompensar cámara ni lanzar coches)
function handleCollisions() {
    if (!playerCar || !raceScene) return;
    const now = Date.now();

    // Inmunidad a colisiones durante los primeros 5 segundos de carrera (Modo Fantasma de salida limpia)
    if (gameState === 'RACE' && (now - raceStartTime) < 5000) {
        return;
    }

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
            }
        }
    }

    // 3. Colisión de Coches vs Quitamiedos y Barreras de Seguridad Infranqueables (evita atajos por el césped)
    if (trackBarriers && trackBarriers.length > 0) {
        const allCars = [playerCar, ...aiCars];
        const carRadius = 18;

        allCars.forEach(car => {
            if (!car || !car.active) return;

            trackBarriers.forEach(b => {
                const rad = Phaser.Math.DegToRad(-b.angle);
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const dx = car.x - b.x;
                const dy = car.y - b.y;

                const localX = cos * dx - sin * dy;
                const localY = sin * dx + cos * dy;

                const clampedX = Math.min(b.halfW, Math.max(-b.halfW, localX));
                const clampedY = Math.min(b.halfH, Math.max(-b.halfH, localY));

                const diffX = localX - clampedX;
                const diffY = localY - clampedY;
                const dist = Math.hypot(diffX, diffY);

                if (dist < carRadius) {
                    let normX = 0, normY = 0;
                    let pen = carRadius - dist;

                    if (dist > 0.001) {
                        normX = diffX / dist;
                        normY = diffY / dist;
                    } else {
                        const penY = (b.halfH + carRadius) - Math.abs(localY);
                        const penX = (b.halfW + carRadius) - Math.abs(localX);
                        if (penY < penX) {
                            normY = localY >= 0 ? 1 : -1;
                            pen = penY;
                        } else {
                            normX = localX >= 0 ? 1 : -1;
                            pen = penX;
                        }
                    }

                    const invRad = Phaser.Math.DegToRad(b.angle);
                    const invCos = Math.cos(invRad);
                    const invSin = Math.sin(invRad);

                    const pushLocalX = normX * pen;
                    const pushLocalY = normY * pen;

                    const pushWorldX = invCos * pushLocalX - invSin * pushLocalY;
                    const pushWorldY = invSin * pushLocalX + invCos * pushLocalY;

                    car.x += pushWorldX;
                    car.y += pushWorldY;

                    if (car.isPlayer) {
                        playerSpeed *= 0.88;
                        if (now - lastCrashSoundTime > 220) {
                            dustAudio.playCrash();
                            lastCrashSoundTime = now;
                        }
                        if (raceScene && raceScene.cameras && raceScene.cameras.main && Math.abs(playerSpeed) > 100) {
                            raceScene.cameras.main.shake(70, 0.004);
                        }
                    } else {
                        car.aiVelocity = (car.aiVelocity || 0) * 0.88;
                    }

                    if (Math.random() > 0.3) {
                        spawnDust(raceScene, car.x, car.y, 'dt_sparkle', 0xffd700);
                    }
                }
            });
        });
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

    const posMatch = (hudPosText && typeof hudPosText.text === 'string') ? hudPosText.text.match(/\d+/) : null;
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

    // Título, Piloto y Trofeo
    const curPilot = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO';
    raceScene.add.text(480, 82, `PILOTO OFICIAL: ${curPilot.toUpperCase()}`, {
        font: '900 15px Arial Black', fill: '#facc15', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

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

    // Mejor tiempo de vuelta y Tiempo Total oficial
    const bestSec = bestLapTime ? (bestLapTime / 1000).toFixed(2) + 's' : '--';
    const totalRaceSec = raceStartTime ? ((Date.now() - raceStartTime) / 1000).toFixed(1) : ((Date.now() - lapStartTime) / 1000).toFixed(1);
    raceScene.add.text(480, 245, `MEJOR VUELTA: ${bestSec} • TIEMPO TOTAL: ${totalRaceSec}s`, {
        font: 'bold 13px Arial', fill: '#90a4ae'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // Recompensas Web3 en $CR, Gemas y Piezas Mecánicas por clasificación
    let crReward = playerRank === 1 ? 1000 : (playerRank === 2 ? 600 : (playerRank === 3 ? 400 : 200));
    let gemReward = playerRank === 1 ? 25 : (playerRank === 2 ? 15 : (playerRank === 3 ? 10 : 0));
    let xpReward = playerRank === 1 ? 250 : (playerRank === 2 ? 180 : (playerRank === 3 ? 120 : 70));
    let xpResult = null;
    let partsWonSummary = [];

    if (typeof loadNftUserData === 'function') {
        const u = loadNftUserData();
        u.credits = (u.credits || 0) + crReward;
        u.gems = (u.gems || 0) + gemReward;

        // Botín de piezas mecánicas del taller: 1º (4), 2º (3), 3º (2), Resto (1)
        const partsWonCount = playerRank === 1 ? 4 : (playerRank === 2 ? 3 : (playerRank === 3 ? 2 : 1));
        if (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && partsWonCount > 0) {
            if (!u.partsInventory) u.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
            const catalogKeys = Object.keys(WORKSHOP_PIECES_CATALOG);
            for (let i = 0; i < partsWonCount; i++) {
                const pKey = catalogKeys[Math.floor(Math.random() * catalogKeys.length)];
                u.partsInventory[pKey] = (u.partsInventory[pKey] || 0) + 1;
                const pDef = WORKSHOP_PIECES_CATALOG[pKey] || { name: pKey, icon: '🔧' };
                partsWonSummary.push(`${pDef.icon} ${pDef.name}`);
            }
        }
        saveNftUserData(u);
    }

    if (typeof addXpToEquippedCar === 'function') {
        xpResult = addXpToEquippedCar(xpReward);
    }

    let xpText = `⭐ +${xpReward} XP`;
    if (xpResult && xpResult.leveledUp) {
        xpText = `🔥 ¡NIV. ${xpResult.newLevel}! (+${xpReward} XP)`;
    }

    raceScene.add.text(480, 268, `💰 +${crReward} $CR  •  💎 +${gemReward} TON  •  ${xpText}`, {
        font: 'bold 13px Arial', fill: '#00f5d4'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    let completedSponsors = [];
    if (typeof updateSponsorshipProgress === 'function') {
        completedSponsors = updateSponsorshipProgress({
            rank: playerRank,
            topSpeed: playerCar ? (playerCar.maxReachedSpeed || 320) : 320,
            drifts: playerCar ? (playerCar.driftBoostCount || 1) : 1
        });
    }

    if (partsWonSummary.length > 0) {
        const partsText = `📦 BOTÍN DE TALLER: +${partsWonSummary.length} PIEZAS (${partsWonSummary.slice(0, 3).join(', ')}${partsWonSummary.length > 3 ? '...' : ''})`;
        raceScene.add.text(480, 288, partsText, {
            font: 'bold 12px Arial', fill: '#facc15'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    }

    if (completedSponsors.length > 0) {
        const spNames = completedSponsors.map(s => s.name).join(', ');
        raceScene.add.text(480, 306, `🤝 ¡OBJETIVO DE PATROCINIO COMPLETADO: ${spNames}!`, {
            font: '900 12px Arial', fill: '#00f5d4', backgroundColor: '#0a0d14dd', padding: { x: 8, y: 3 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    }

    let btnY = 376;

    if (isCurrentRaceStory) {
        if (isPodium && nextTrack) {
            raceScene.add.text(480, 314, `¡DESBLOQUEADO NUEVO CIRCUITO: ${nextTrack.name.toUpperCase()}!`, {
                font: '900 14px Arial', fill: '#00e676'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

            const nextBtn = raceScene.add.text(480, 356, 'CONTINUAR HISTORIA (SIGUIENTE PISTA) ▶', {
                font: '900 15px Arial', fill: '#ffffff', backgroundColor: '#2e7d32', padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

            nextBtn.on('pointerdown', () => {
                currentTrackId = nextTrack.id;
                startRace(raceScene, currentTrackId, selectedCarIndex, selectedTimeOfDay, true);
            });

            btnY = 416;
        } else if (isPodium && !nextTrack) {
            raceScene.add.text(480, 314, '🏆 ¡FELICIDADES! ¡HAS COMPLETADO LOS 22 CIRCUITOS DEL MODO HISTORIA! 🏆', {
                font: '900 14px Arial', fill: '#fee440'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            btnY = 370;
        } else {
            raceScene.add.text(480, 314, 'Necesitas quedar entre los 3 primeros (Top 3) para avanzar en la historia.', {
                font: 'bold 13px Arial', fill: '#ff5252'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            btnY = 370;
        }
    }

    // Botón Repetir Carrera
    const retryBtn = raceScene.add.text(340, btnY, 'REPETIR CARRERA ↺', {
        font: 'bold 14px Arial', fill: '#ffffff', backgroundColor: '#1e88e5', padding: { x: 16, y: 9 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
        startRace(raceScene, currentTrackId, selectedCarIndex, selectedTimeOfDay, isCurrentRaceStory);
    });

    // Botón Volver al Menú
    const menuBtn = raceScene.add.text(620, btnY, 'VOLVER AL MENÚ DE PISTAS', {
        font: 'bold 14px Arial', fill: '#fee440', backgroundColor: '#1b202e', padding: { x: 16, y: 9 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
        showMenu(raceScene);
    });

    // Botón Salir al Hub Principal
    const hubBtn = raceScene.add.text(480, btnY + 44, '🏠 SALIR AL HUB PRINCIPAL (GARAJE / CAJAS / TIENDA)', {
        font: 'bold 11px Arial', fill: '#ffffff', backgroundColor: '#e53935', padding: { x: 16, y: 7 }
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

// Emisor de chispas de titanio en el fondo plano / pianos de circuito (Titanium Sparks Shower)
function spawnTitaniumSparks(scene, x, y, angleDeg, count = 4) {
    if (!scene) return;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const rearX = x - Math.cos(rad) * 16;
    const rearY = y - Math.sin(rad) * 16;

    for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 0.75;
        const sparkAngle = rad + Math.PI + spread;
        const dist = 26 + Math.random() * 38;
        const tint = Math.random() < 0.35 ? 0xffffff : (Math.random() < 0.7 ? 0xffd700 : 0xff7700);

        const p = scene.add.sprite(
            rearX + (Math.random() - 0.5) * 8,
            rearY + (Math.random() - 0.5) * 8,
            'dt_sparkle'
        ).setDisplaySize(9 + Math.random() * 5, 9 + Math.random() * 5).setDepth(12).setTint(tint);

        scene.tweens.add({
            targets: p,
            x: rearX + Math.cos(sparkAngle) * dist,
            y: rearY + Math.sin(sparkAngle) * dist,
            alpha: 0,
            scale: 0.15,
            duration: 140 + Math.random() * 90,
            onComplete: () => p.destroy()
        });
    }
}

// Actualizar sombras, faros día/noche, destellos Fresnel y llamaradas de escape de todos los coches
function updateCarVisuals() {
    const all = [playerCar, ...aiCars];
    const isPlayerBraking = Boolean((keys && keys.down && keys.down.isDown) || (keys && keys.s && keys.s.isDown) || touchBrake || (keys && keys.space && keys.space.isDown) || (keys && keys.shift && keys.shift.isDown) || touchHandbrake);
    const curTrk = (typeof tracks !== 'undefined' && tracks[currentTrackId]) || (typeof TRACKS_DATA !== 'undefined' && TRACKS_DATA[currentTrackId]) || null;
    const isNight = selectedTimeOfDay === 'night' || (curTrk && curTrk.tod === 'night') || (currentTrackId === 'neo_tokyo_bay');
    const isSunset = selectedTimeOfDay === 'sunset';
    const isRain = selectedTimeOfDay === 'rain';
    const isGhostMode = (gameState === 'RACE' && (Date.now() - raceStartTime) < 5000);
    const carAlpha = isGhostMode ? 0.72 : 1.0;

    all.forEach(car => {
        if (!car || !car.active) return;
        if (typeof car.setAlpha === 'function') car.setAlpha(carAlpha);

        if (car.shadow) {
            car.shadow.x = car.x + 1;
            car.shadow.y = car.y + 1;
            car.shadow.angle = car.angle;
        }

        // Brillo de carrocería fotorrealista (Fresnel Highlight según sol)
        if (!car.sheenGfx && raceScene && typeof raceScene.add === 'object' && raceScene.add.graphics) {
            car.sheenGfx = raceScene.add.graphics().setDepth(10.5);
        }
        if (car.sheenGfx) {
            car.sheenGfx.clear();
            if (selectedTimeOfDay !== 'night') {
                const sunAngle = selectedTimeOfDay === 'sunset' ? 1.2 : 0.785;
                const carRad = Phaser.Math.DegToRad(car.angle);
                const dot = Math.abs(Math.cos(carRad - sunAngle));
                if (dot > 0.25) {
                    const sheenAlpha = (dot - 0.25) * (selectedTimeOfDay === 'sunset' ? 0.42 : 0.32);
                    car.sheenGfx.fillStyle(0xffffff, sheenAlpha);
                    car.sheenGfx.fillEllipse(car.x, car.y, 24, 9);
                    if (dot > 0.75) {
                        car.sheenGfx.fillStyle(0xffffff, (dot - 0.75) * 0.75);
                        car.sheenGfx.fillCircle(car.x + Math.cos(carRad) * 6, car.y + Math.sin(carRad) * 6, 2.5);
                    }
                }
            }
        }

        // Neón Underglow bajo el chasis (Nocturno / Atardecer / Lluvia)
        if (car.underglow) {
            car.underglow.clear();
            if (isNight || isSunset || isRain) {
                const hexColor = (car.carData && car.carData.colorHex) ? car.carData.colorHex : '#00f5d4';
                const cInt = parseInt(String(hexColor).replace('#', ''), 16) || 0x00f5d4;
                const ugAlpha = isNight ? 0.38 : (isRain ? 0.25 : 0.18);
                car.underglow.fillStyle(cInt, ugAlpha);
                car.underglow.fillEllipse(car.x, car.y, 44, 26);
                car.underglow.fillStyle(cInt, ugAlpha * 0.45);
                car.underglow.fillEllipse(car.x, car.y, 58, 36);
            }
        }

        // Discos de freno al rojo vivo (Brake Glow) al frenar fuerte o derrapar
        if (car.brakesGlow) {
            car.brakesGlow.clear();
            const isBrakingHard = (car.isPlayer ? (isPlayerBraking || touchHandbrake) : false) && Math.abs(playerSpeed) > 130;
            if (isBrakingHard) {
                const heatFactor = Math.min(1.0, (Math.abs(playerSpeed) - 130) / 180);
                const rad = Phaser.Math.DegToRad(car.angle);
                const perp = rad + Math.PI / 2;
                const cosA = Math.cos(rad), sinA = Math.sin(rad);
                const cosP = Math.cos(perp), sinP = Math.sin(perp);

                const wheels = [
                    { x: car.x + cosA * 16 + cosP * 9, y: car.y + sinA * 16 + sinP * 9 },
                    { x: car.x + cosA * 16 - cosP * 9, y: car.y + sinA * 16 - sinP * 9 },
                    { x: car.x - cosA * 15 + cosP * 10, y: car.y - sinA * 15 + sinP * 10 },
                    { x: car.x - cosA * 15 - cosP * 10, y: car.y - sinA * 15 - sinP * 10 }
                ];

                car.brakesGlow.fillStyle(0xff3d00, 0.85 * heatFactor);
                wheels.forEach(wh => car.brakesGlow.fillCircle(wh.x, wh.y, 3.2));
                car.brakesGlow.fillStyle(0xffea00, 0.95 * heatFactor);
                wheels.forEach(wh => car.brakesGlow.fillCircle(wh.x, wh.y, 1.6));

                // Chispas de titanio al derrapar o clavar frenos a alta velocidad
                if (touchHandbrake || (keys && keys.space && keys.space.isDown) || Math.abs(playerSpeed) > 230) {
                    spawnTitaniumSparks(raceScene, car.x, car.y, car.angle, 4);
                }
            }
        }

        if (car.headlights) {
            car.headlights.clear();
            const rad = Phaser.Math.DegToRad(car.angle);
            const fx = car.x + Math.cos(rad) * 22;
            const fy = car.y + Math.sin(rad) * 22;

            // Iluminación frontal de faros (Noche, Atardecer o Lluvia FIA):
            if (isNight || isSunset || isRain) {
                const cone = 0.38;
                const dist = isNight ? 160 : (isRain ? 130 : 110);
                const beamAlpha = isNight ? 0.38 : (isRain ? 0.22 : 0.15);
                const coreAlpha = isNight ? 0.65 : (isRain ? 0.40 : 0.25);

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

                // Proyectores ópticos dobles con halo bloom xenón suave
                const perp = rad + Math.PI / 2;
                car.headlights.fillStyle(0x38bdf8, 0.35);
                car.headlights.fillCircle(fx + Math.cos(perp) * 6, fy + Math.sin(perp) * 6, 7.5);
                car.headlights.fillCircle(fx - Math.cos(perp) * 6, fy - Math.sin(perp) * 6, 7.5);
                car.headlights.fillStyle(0xffffff, 0.95);
                car.headlights.fillCircle(fx + Math.cos(perp) * 6, fy + Math.sin(perp) * 6, 2.8);
                car.headlights.fillCircle(fx - Math.cos(perp) * 6, fy - Math.sin(perp) * 6, 2.8);
            }

            // Luces de posición y freno traseras rojas con bloom difuso
            const rx = car.x - Math.cos(rad) * 20;
            const ry = car.y - Math.sin(rad) * 20;
            const perp = rad + Math.PI / 2;

            if (car.isPlayer && isPlayerBraking) {
                // Frenada intensa: halo bloom exterior difuso + LED rojo + centro blanco
                car.headlights.fillStyle(0xff1744, 0.32);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 12);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 12);
                car.headlights.fillStyle(0xff1744, 0.90);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 5.5);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 5.5);
                car.headlights.fillStyle(0xffffff, 0.95);
                car.headlights.fillCircle(rx + Math.cos(perp) * 8, ry + Math.sin(perp) * 8, 2.2);
                car.headlights.fillCircle(rx - Math.cos(perp) * 8, ry - Math.sin(perp) * 8, 2.2);
            } else if (isNight || isSunset || isRain) {
                // Luz de posición trasera permanente suave
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
