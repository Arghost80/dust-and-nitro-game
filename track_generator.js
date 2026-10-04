// ===== MOTOR DE GENERACIÓN DE CIRCUITOS ORGÁNICOS CURVOS =====
// Genera curvas suaves (Catmull-Rom / Bézier), bordillos de competición, vegetación, vallas y superficies

const TrackThemes = {
    neo_sierra: {
        id: 'neo_sierra',
        name: 'Neo-Sierra Prime (OutRun Synthwave)',
        image: 'assets/neo_sierra_prime.jpg',
        bg: '#140c24',
        road: '#1c1a29',
        roadBorder: '#0b0814',
        curb1: '#ff0055',
        curb2: '#00f5d4',
        accent: '#fee440',
        foliage: ['#ff007f', '#7928ca', '#00f5d4'],
        particleColor: 'rgba(255, 0, 110, 0.7)'
    },
    dirt: {
        id: 'dirt',
        name: 'Mud & Dust Outpost',
        bg: '#3e2723',
        road: '#5d4037',
        roadBorder: '#271914',
        curb1: '#e65100',
        curb2: '#fff3e0',
        accent: '#ff9800',
        foliage: ['#2e7d32', '#1b5e20', '#33691e'],
        particleColor: 'rgba(141, 110, 99, 0.7)'
    },
    asphalt: {
        id: 'asphalt',
        name: 'Neo City Grand Prix',
        bg: '#1a237e',
        road: '#263238',
        roadBorder: '#0d1317',
        curb1: '#d50000',
        curb2: '#ffffff',
        accent: '#00e5ff',
        foliage: ['#00b0ff', '#1de9b6', '#7c4dff'],
        particleColor: 'rgba(200, 200, 200, 0.5)'
    },
    desert: {
        id: 'desert',
        name: 'Canyon Heat 89',
        bg: '#e65100',
        road: '#bf360c',
        roadBorder: '#4e1503',
        curb1: '#ffab00',
        curb2: '#fff8e1',
        accent: '#ffd600',
        foliage: ['#558b2f', '#689f38'],
        particleColor: 'rgba(255, 179, 0, 0.6)'
    },
    pbr_cinematic: {
        id: 'pbr_cinematic',
        name: 'Apex Valley PBR (Iluminación Cinemática & Parallax)',
        bg: '#1c2819',
        road: '#1a1b22',
        dirtRoad: '#9c6f44',
        roadBorder: '#101116',
        curb1: '#d32f2f',
        curb2: '#ffffff',
        accent: '#ffb300',
        foliage: ['#143224', '#1e4835', '#2e6b4d'],
        particleColor: 'rgba(210, 160, 105, 0.85)',
        hasHeadlights: true
    },
    lte_alpine: {
        id: 'lte_alpine',
        name: 'Alpine Ridge Rally (Estilo L.T.E. Dinámico)',
        bg: '#253f20',
        road: '#252630',
        dirtRoad: '#8d633c',
        roadBorder: '#14151a',
        curb1: '#e53935',
        curb2: '#ffffff',
        accent: '#fdd835',
        foliage: ['#1b4332', '#2d6a4f', '#40916c', '#52b788'],
        particleColor: 'rgba(180, 140, 90, 0.75)'
    },
    hyper_loop: {
        id: 'hyper_loop',
        name: 'Hyper-Loop Vertex (Hot Wheels & Trackmania)',
        bg: '#0a0d1a',
        road: '#0d1527',
        roadBorder: '#00f5d4',
        curb1: '#ff6600',
        curb2: '#00f5d4',
        accent: '#ffee00',
        foliage: ['#ff007f', '#00f5d4', '#ff6600'],
        particleColor: 'rgba(255, 102, 0, 0.85)'
    },
    snow: {
        id: 'snow',
        name: 'Frozen Peak',
        bg: '#b0bec5',
        road: '#eceff1',
        roadBorder: '#546e7a',
        curb1: '#0288d1',
        curb2: '#ffffff',
        accent: '#00bcd4',
        foliage: ['#37474f', '#455a64'],
        particleColor: 'rgba(255, 255, 255, 0.8)'
    }
};

const CircuitsCatalog = [
    {
        id: 'pbr_apex_valley',
        name: '✨ Apex Valley PBR (Iluminación & Parallax Real)',
        theme: 'pbr_cinematic',
        roadWidth: 135,
        worldWidth: 2800,
        worldHeight: 2000,
        isDynamicWorld: true,
        hasParallax: true,
        bgImageKey: 'pbr_cinematic_track',
        features: ['Iluminación PBR & Rayos de Sol', 'Capas Parallax Reales', 'Sombra Cinemática & Niebla', 'Entorno Vivo con Viento y Rocas'],
        controlPoints: [
            { x: 520,  y: 450,  surface: 'asphalt', name: 'Grid de Salida PBR' },
            { x: 960,  y: 430,  surface: 'asphalt', name: 'Recta Bosque Soleado' },
            { x: 1380, y: 520,  surface: 'asphalt', name: 'Bajo el Gran Puente PBR' },
            { x: 1820, y: 660,  surface: 'asphalt', name: 'Horquilla de Pinos con Viento' },
            { x: 2260, y: 980,  surface: 'asphalt', name: 'Curva Rápida del Río' },
            { x: 2160, y: 1420, surface: 'dirt',    name: 'Transición a Grava PBR' },
            { x: 1660, y: 1660, surface: 'dirt',    name: 'Sector de Tierra Sur' },
            { x: 1120, y: 1560, surface: 'dirt',    name: 'Chicanes Rocosas' },
            { x: 620,  y: 1360, surface: 'dirt',    name: 'Derrape de Arena y Rocas' },
            { x: 430,  y: 960,  surface: 'asphalt', name: 'Curva Oeste Asfalto Húmedo' },
            { x: 450,  y: 650,  surface: 'asphalt', name: 'Recta hacia Meta' }
        ]
    },
    {
        id: 'lte_alpine_rally',
        name: '🌲 Alpine Ridge Rally (Cámara Dinámica L.T.E.)',
        theme: 'lte_alpine',
        roadWidth: 130,
        worldWidth: 2800,
        worldHeight: 2000,
        isDynamicWorld: true,
        features: ['Cámara Dinámica con Scroll', 'Puente Elevado sobre Pista', 'Tramo Asfalto & Tierra', 'Bosque de Pinos & Rocas'],
        controlPoints: [
            { x: 500,  y: 450,  surface: 'asphalt', name: 'Meta y Recta de Salida' },
            { x: 950,  y: 440,  surface: 'asphalt', name: 'Aproximación al Puente' },
            { x: 1350, y: 520,  surface: 'asphalt', name: 'Bajo el Puente Elevado' },
            { x: 1800, y: 650,  surface: 'asphalt', name: 'Curva del Bosque de Pinos' },
            { x: 2250, y: 950,  surface: 'asphalt', name: 'Curva Rápida Este' },
            { x: 2150, y: 1400, surface: 'dirt',    name: 'Transición a Tierra Rally' },
            { x: 1650, y: 1650, surface: 'dirt',    name: 'Horquilla de Barro Sur' },
            { x: 1100, y: 1550, surface: 'dirt',    name: 'Chicanes entre Rocas' },
            { x: 600,  y: 1350, surface: 'dirt',    name: 'Derrape de Arena' },
            { x: 420,  y: 950,  surface: 'asphalt', name: 'Horquilla Oeste Asfalto' },
            { x: 440,  y: 650,  surface: 'asphalt', name: 'Recta hacia Meta' }
        ]
    },
    {
        id: 'hyper_loop_vertex',
        name: '🌀 Hyper-Loop Vertex (Trackmania & Hot Wheels)',
        theme: 'hyper_loop',
        roadWidth: 125,
        hasCustomImage: true,
        bgImageKey: 'track_extreme',
        features: ['Looping 360°', 'Salto Aéreo Gravitatorio', 'Pads Aceleradores', 'Tramo Antigravedad'],
        controlPoints: [
            { x: 260, y: 440, type: 'start' },
            { x: 150, y: 350, type: 'climb' },
            { x: 180, y: 180, type: 'loop_apex' },
            { x: 280, y: 240, type: 'loop_exit' },
            { x: 420, y: 310, type: 'boost_pad' },
            { x: 540, y: 250, type: 'jump_ramp' },
            { x: 720, y: 160, type: 'mid_air' },
            { x: 840, y: 220, type: 'landing_pad' },
            { x: 820, y: 360, type: 'antigravity' },
            { x: 670, y: 440, type: 'corkscrew' },
            { x: 460, y: 470, type: 'straight' }
        ]
    },
    {
        id: 'neo_sierra_prime',
        name: 'Neo-Sierra Prime (Gran Autopista 4 Carriles)',
        theme: 'neo_sierra',
        roadWidth: 140,
        hasCustomImage: true,
        bgImageKey: 'track_grand_bg',
        controlPoints: [
            { x: 300, y: 150 },
            { x: 550, y: 150 },
            { x: 740, y: 180 },
            { x: 840, y: 270 },
            { x: 780, y: 390 },
            { x: 600, y: 410 },
            { x: 450, y: 370 },
            { x: 330, y: 330 },
            { x: 220, y: 380 },
            { x: 130, y: 350 },
            { x: 110, y: 250 },
            { x: 180, y: 160 }
        ]
    },
    {
        id: 'apex_valley',
        name: 'Apex Valley (Tierra & Barro)',
        theme: 'dirt',
        roadWidth: 90,
        controlPoints: [
            { x: 200, y: 520 },
            { x: 480, y: 530 },
            { x: 780, y: 480 },
            { x: 860, y: 320 },
            { x: 740, y: 160 },
            { x: 500, y: 120 },
            { x: 260, y: 160 },
            { x: 120, y: 320 }
        ]
    },
    {
        id: 'neo_metropolis',
        name: 'Neo Metropolis (Asfalto Urbano)',
        theme: 'asphalt',
        roadWidth: 96,
        controlPoints: [
            { x: 220, y: 540 },
            { x: 540, y: 540 },
            { x: 820, y: 460 },
            { x: 850, y: 240 },
            { x: 620, y: 220 },
            { x: 480, y: 120 },
            { x: 220, y: 140 },
            { x: 100, y: 340 }
        ]
    },
    {
        id: 'red_canyon',
        name: 'Red Canyon (Desierto Extremo)',
        theme: 'desert',
        roadWidth: 86,
        controlPoints: [
            { x: 240, y: 510 },
            { x: 520, y: 530 },
            { x: 760, y: 440 },
            { x: 840, y: 280 },
            { x: 660, y: 180 },
            { x: 440, y: 240 },
            { x: 240, y: 130 },
            { x: 110, y: 300 }
        ]
    }
];

// Generador de curva suave Catmull-Rom para trazados orgánicos
function getSmoothTrackPath(points, numSubdivisions = 24) {
    const smoothPoints = [];
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];

        for (let j = 0; j < numSubdivisions; j++) {
            const t = j / numSubdivisions;
            const t2 = t * t;
            const t3 = t2 * t;

            // Catmull-Rom Spline
            const x = 0.5 * (
                (2 * p1.x) +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            );

            const y = 0.5 * (
                (2 * p1.y) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            );

            smoothPoints.push({ x, y });
        }
    }
    return smoothPoints;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrackThemes, CircuitsCatalog, getSmoothTrackPath };
}
