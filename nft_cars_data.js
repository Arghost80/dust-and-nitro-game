// ===== CATÁLOGO DE 73 VEHÍCULOS NFT WEB3, 10 ESTADÍSTICAS POR PUNTOS, SISTEMA DE NIVELES Y PIEZAS =====

const NFT_CAR_COLORS = [
    { name: "Rosso Corsa", hex: "#e53935", tint: 0xe53935 },
    { name: "Grello Acid Yellow", hex: "#facc15", tint: 0xfacc15 },
    { name: "Miami Blue GT", hex: "#0284c7", tint: 0x0284c7 },
    { name: "British Racing Green", hex: "#15803d", tint: 0x15803d },
    { name: "Papaya Orange", hex: "#ea580c", tint: 0xea580c },
    { name: "Cyberpunk Cyan", hex: "#06b6d4", tint: 0x06b6d4 },
    { name: "Nardo Grey Pro", hex: "#64748b", tint: 0x64748b },
    { name: "Stealth Matte Black", hex: "#1e293b", tint: 0x1e293b },
    { name: "Pure Pearl White", hex: "#f8fafc", tint: 0xf8fafc },
    { name: "Midnight Purple", hex: "#7e22ce", tint: 0x7e22ce },
    { name: "Gold Edition 24K", hex: "#eab308", tint: 0xeab308 },
    { name: "Electrum Titanium", hex: "#94a3b8", tint: 0x94a3b8 },
    { name: "Ruby Crimson Metallic", hex: "#991b1b", tint: 0x991b1b },
    { name: "Acid Lime Green", hex: "#84cc16", tint: 0x84cc16 }
];

// Helper para crear los 10 atributos de forma balanceada con el presupuesto exacto de puntos
// 10 Atributos: potencia, velocidad, aceleracion, agarre, frenada, manejo, turbo, downforce, traccion, ligereza
function makeStats(p, v, a, ag, f, m, t, d, tr, l) {
    return {
        potencia: p,
        velocidad: v,
        aceleracion: a,
        agarre: ag,
        frenada: f,
        manejo: m,
        turbo: t,
        downforce: d,
        traccion: tr,
        ligereza: l
    };
}

// 73 Modelos Base clasificados por Rareza y Presupuesto de Puntos:
// Comunes: 10 a 12 Puntos | Infrecuentes: 15 a 16 Puntos | Raros: 20 a 22 Puntos | Legendarios: 26 a 28 Puntos
const NFT_CAR_MODELS = [
    // --- 28 COMUNES (Presupuesto: 10 - 12 Puntos) ---
    { id: "c_01", name: "Monza Hatch 1.4", rarity: "common", sprite: "car_red", desc: "Compacto ágil urbano ideal para principiantes", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_02", name: "Tokyo Metro Turbo", rarity: "common", sprite: "car_blue", desc: "Hatchback japonés con turbo ligero", stats: makeStats(1,2,2,1,1,1,1,1,1,1) }, // 12 pts
    { id: "c_03", name: "Bavaria Compact 318", rarity: "common", sprite: "car_green", desc: "Tracción trasera equilibrada con chasis noble", stats: makeStats(1,2,1,2,1,1,1,1,1,1) }, // 12 pts
    { id: "c_04", name: "Detroit Rebel Coupe", rarity: "common", sprite: "car_yellow", desc: "Cupé americano con par motor a bajas vueltas", stats: makeStats(2,2,1,1,1,1,1,1,1,1) }, // 12 pts
    { id: "c_05", name: "Iberian Sport 16V", rarity: "common", sprite: "car_orange", desc: "Tracción delantera deportiva de copa monomarca", stats: makeStats(1,1,2,1,1,2,1,1,1,1) }, // 12 pts
    { id: "c_06", name: "Nordic City Wagon", rarity: "common", sprite: "car_cyan", desc: "Familiar sueco reforzado con estabilidad en agua", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_07", name: "Riviera Sprint Micro", rarity: "common", sprite: "car_red", desc: "Peso pluma hiperreactivo en curvas ratoneras", stats: makeStats(1,1,2,1,1,1,1,1,1,2) }, // 12 pts
    { id: "c_08", name: "Shibuya Cruiser 1.8", rarity: "common", sprite: "car_blue", desc: "Sedán urbano japonés fiable y dócil", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_09", name: "Verona Eco Pulse", rarity: "common", sprite: "car_green", desc: "Híbrido de aceleración instantánea en salida", stats: makeStats(1,1,2,1,1,1,1,1,2,1) }, // 12 pts
    { id: "c_10", name: "Saxon Classic 1.6", rarity: "common", sprite: "car_yellow", desc: "Berlina tradicional de ingeniería alemana básica", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_11", name: "Corsica Street Boy", rarity: "common", sprite: "car_orange", desc: "Preparación de calle con escape deportivo homologado", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_12", name: "Osaka Swift R", rarity: "common", sprite: "car_cyan", desc: "Divertido y ligero para tramos de montaña", stats: makeStats(1,1,2,1,1,2,1,1,1,1) }, // 12 pts
    { id: "c_13", name: "Autobahn Star 180", rarity: "common", sprite: "car_red", desc: "Aerodinámica optimizada para cruceros rápidos", stats: makeStats(1,3,1,1,1,1,1,1,1,1) }, // 12 pts
    { id: "c_14", name: "Nevada Dust Pickup", rarity: "common", sprite: "car_blue", desc: "Robusto chasis de largueros resistente a impactos", stats: makeStats(1,1,1,1,1,1,1,1,2,1) }, // 11 pts
    { id: "c_15", name: "Roma Piccolo GT", rarity: "common", sprite: "car_green", desc: "Estilo italiano elegante con motor puntiagudo", stats: makeStats(1,2,1,1,1,2,1,1,1,1) }, // 12 pts
    { id: "c_16", name: "Lyon Tourer 2.0", rarity: "common", sprite: "car_yellow", desc: "Excelente amortiguación para bordillos y baches", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_17", name: "Baltic Rally Cup", rarity: "common", sprite: "car_orange", desc: "Ajuste de suspensión elevada para tierra y gravilla", stats: makeStats(1,1,2,1,1,1,1,1,2,1) }, // 12 pts
    { id: "c_18", name: "Kyoto Breeze", rarity: "common", sprite: "car_cyan", desc: "Silencioso pero con paso por curva progresivo", stats: makeStats(1,1,1,2,1,1,1,1,1,1) }, // 11 pts
    { id: "c_19", name: "Texas Cargo Custom", rarity: "common", sprite: "car_red", desc: "Fuerza bruta con eje rígido trasero", stats: makeStats(2,1,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_20", name: "Britannia City 1.2", rarity: "common", sprite: "car_blue", desc: "Herencia británica compacta con tacto directo", stats: makeStats(1,1,1,1,1,2,1,1,1,1) }, // 11 pts
    { id: "c_21", name: "Alpine Glacier Mini", rarity: "common", sprite: "car_green", desc: "Gran agarre mecánico sobre asfalto húmedo", stats: makeStats(1,1,1,2,1,1,1,1,1,1) }, // 11 pts
    { id: "c_22", name: "Andes Trail 4x4", rarity: "common", sprite: "car_yellow", desc: "Tracción integral permanente básica", stats: makeStats(1,1,1,1,1,1,1,1,2,1) }, // 11 pts
    { id: "c_23", name: "Sahara Dune Runner", rarity: "common", sprite: "car_orange", desc: "Filtro de aire para tormentas de polvo", stats: makeStats(1,1,1,1,1,1,1,1,2,1) }, // 11 pts
    { id: "c_24", name: "Thames Classic Van", rarity: "common", sprite: "car_cyan", desc: "Furgoneta clásica de carreras con centro de gravedad bajo", stats: makeStats(1,1,1,1,1,1,1,1,1,1) }, // 10 pts
    { id: "c_25", name: "Madrid Urban Go", rarity: "common", sprite: "car_red", desc: "Relación de marchas corta para acelerar entre horquillas", stats: makeStats(1,1,2,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_26", name: "Stuttgart Urban A", rarity: "common", sprite: "car_blue", desc: "Construcción sólida y frenada equilibrada", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_27", name: "Seoul Spark GT", rarity: "common", sprite: "car_green", desc: "Electrónica moderna con control de tracción deportivo", stats: makeStats(1,1,2,1,1,1,1,1,1,1) }, // 11 pts
    { id: "c_28", name: "Pacific Coast Rover", rarity: "common", sprite: "car_yellow", desc: "Estabilidad en línea recta con vientos cruzados", stats: makeStats(1,2,1,1,1,1,1,1,1,1) }, // 11 pts

    // --- 20 INFRECUENTES (Presupuesto: 15 - 16 Puntos) ---
    { id: "u_01", name: "Fuji Silhouette RS", rarity: "uncommon", sprite: "car_blue", desc: "Ícono JDM con turbo de doble entrada y tracción total", stats: makeStats(2,2,2,2,1,2,1,1,2,1) }, // 16 pts
    { id: "u_02", name: "Stuttgart Boxer 718", rarity: "uncommon", sprite: "car_yellow", desc: "Motor bóxer central con reparto de masas ideal 50:50", stats: makeStats(2,2,2,2,1,2,1,1,1,2) }, // 16 pts
    { id: "u_03", name: "Detroit V8 Interceptor", rarity: "uncommon", sprite: "car_red", desc: "Bloque motor V8 atmosférico con rugido ensordecedor", stats: makeStats(3,2,2,1,1,1,1,1,2,1) }, // 15 pts
    { id: "u_04", name: "Briton Falcon Sprint", rarity: "uncommon", sprite: "car_green", desc: "Chasis tubular de aluminio con agilidad felina", stats: makeStats(2,2,2,2,1,2,1,1,1,2) }, // 16 pts
    { id: "u_05", name: "Rally Evo Integrale", rarity: "uncommon", sprite: "car_orange", desc: "Tracción integral con diferenciales activos de rally", stats: makeStats(2,2,2,2,1,1,1,1,3,1) }, // 16 pts
    { id: "u_06", name: "Alpine Apex A110", rarity: "uncommon", sprite: "car_cyan", desc: "Ultraligero francés con pasos por curva hipnóticos", stats: makeStats(1,2,2,2,1,2,1,1,1,3) }, // 16 pts
    { id: "u_07", name: "Scandia Turbo Polar", rarity: "uncommon", sprite: "car_blue", desc: "Motor de 5 cilindros con enorme empuje a medio régimen", stats: makeStats(2,2,2,1,1,1,2,1,2,1) }, // 15 pts
    { id: "u_08", name: "Milan Veloce 2.0T", rarity: "uncommon", sprite: "car_red", desc: "Diseño pasional italiano con dirección hipersensible", stats: makeStats(2,2,2,2,1,2,1,1,1,1) }, // 15 pts
    { id: "u_09", name: "Tokyo Drift Spec-S", rarity: "uncommon", sprite: "car_orange", desc: "Diferencial autoblocante tarado al 80% para drift", stats: makeStats(2,2,2,2,1,2,1,1,1,2) }, // 16 pts
    { id: "u_10", name: "Bavaria M-Sport Coupe", rarity: "uncommon", sprite: "car_green", desc: "Seis cilindros en línea biturbo afinado en circuito", stats: makeStats(2,3,2,1,1,2,1,1,2,1) }, // 16 pts
    { id: "u_11", name: "Iberian Cupra R", rarity: "uncommon", sprite: "car_yellow", desc: "Autoblocante mecánico delantero VAQ invencible", stats: makeStats(2,2,2,2,1,2,1,1,2,1) }, // 16 pts
    { id: "u_12", name: "Mustang Canyon Mach", rarity: "uncommon", sprite: "car_red", desc: "Músculo puro optimizado para aceleraciones en recta", stats: makeStats(3,2,2,1,1,1,1,1,2,1) }, // 15 pts
    { id: "u_13", name: "Yokohama Silvia 200", rarity: "uncommon", sprite: "car_cyan", desc: "Tracción trasera legendaria para enlazar curvas", stats: makeStats(2,2,2,2,1,2,1,1,1,2) }, // 16 pts
    { id: "u_14", name: "Modena Spider Sport", rarity: "uncommon", sprite: "car_red", desc: "Carrocería descapotable con centro de gravedad rebajado", stats: makeStats(2,2,2,2,1,2,1,1,1,1) }, // 15 pts
    { id: "u_15", name: "Coventry Eagle V6", rarity: "uncommon", sprite: "car_green", desc: "Compresor volumétrico con respuesta instantánea al acelerador", stats: makeStats(2,2,2,2,1,2,1,1,1,1) }, // 15 pts
    { id: "u_16", name: "Nürburg Clubsport 230", rarity: "uncommon", sprite: "car_yellow", desc: "Jaula antivuelco integrada y frenos perforados", stats: makeStats(2,2,2,2,2,2,1,1,1,1) }, // 16 pts
    { id: "u_17", name: "Sahara Raider Trophy", rarity: "uncommon", sprite: "car_orange", desc: "Amortiguadores de triple bypass para saltos y peraltes", stats: makeStats(2,1,2,1,1,1,1,1,3,2) }, // 15 pts
    { id: "u_18", name: "Suzuka Circuit R", rarity: "uncommon", sprite: "car_blue", desc: "Alerón regulable en 5 posiciones para apoyo aerodinámico", stats: makeStats(2,2,2,2,1,2,1,2,1,1) }, // 16 pts
    { id: "u_19", name: "Black Forest Turbo", rarity: "uncommon", sprite: "car_cyan", desc: "Intercooler sobredimensionado para rendir al 100% en calor", stats: makeStats(2,2,2,1,1,2,2,1,1,1) }, // 15 pts
    { id: "u_20", name: "Daytona Pace Car", rarity: "uncommon", sprite: "car_yellow", desc: "Luces estroboscópicas de seguridad y chasis reforzado", stats: makeStats(2,2,2,2,1,2,1,1,1,1) }, // 15 pts

    // --- 15 RAROS (Presupuesto: 20 - 22 Puntos) ---
    { id: "r_01", name: "Corsa GT4 Clubsport", rarity: "rare", sprite: "car_red", desc: "Bólido oficial de copa GT4 con frenos cerámicos Brembo", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_02", name: "Nürburg M4 Competition", rarity: "rare", sprite: "car_green", desc: "Aerodinámica de fibra de carbono probada en el Infierno Verde", stats: makeStats(3,3,2,2,2,2,2,2,2,1) }, // 21 pts
    { id: "r_03", name: "Silverstone Vantage AMR", rarity: "rare", sprite: "car_blue", desc: "División de carreras británica con cambio secuencial", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_04", name: "Scuderia 458 Challenge", rarity: "rare", sprite: "car_red", desc: "V8 atmosférico girando a 9.000 RPM en circuito", stats: makeStats(3,3,3,2,2,2,2,2,2,1) }, // 22 pts
    { id: "r_05", name: "Yokohama GT-R Spec-V", rarity: "rare", sprite: "car_cyan", desc: "Monstruo de tracción integral ATTESA E-TS Pro", stats: makeStats(3,3,3,2,2,2,2,1,3,1) }, // 22 pts
    { id: "r_06", name: "Stuttgart Carrera GTS", rarity: "rare", sprite: "car_yellow", desc: "Ancho de vías ensanchado y llantas monotuerca de magnesio", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_07", name: "Detroit Z06 Track Edition", rarity: "rare", sprite: "car_orange", desc: "V8 con cigüeñal plano y splitters aerodinámicos masivos", stats: makeStats(4,3,2,2,2,1,2,2,2,1) }, // 21 pts
    { id: "r_08", name: "Briton Superleggera GT", rarity: "rare", sprite: "car_blue", desc: "Construcción aligerada en titanio para una relación peso/potencia récord", stats: makeStats(3,3,2,2,2,2,2,2,2,2) }, // 22 pts
    { id: "r_09", name: "Monza Cup Trofeo", rarity: "rare", sprite: "car_red", desc: "Puesta a punto radical para chicanes de alta velocidad", stats: makeStats(3,3,2,2,2,2,2,2,2,1) }, // 21 pts
    { id: "r_10", name: "Hyperion Aero Sport", rarity: "rare", sprite: "car_cyan", desc: "Fondo plano con efecto suelo y difusor de carbono venturi", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_11", name: "Alpine Endurance Cup", rarity: "rare", sprite: "car_blue", desc: "Diseñado para pruebas de resistencia de 24 horas continuas", stats: makeStats(2,3,2,3,2,2,2,2,2,1) }, // 21 pts
    { id: "r_12", name: "Bavaria DTM Silhouette", rarity: "rare", sprite: "car_green", desc: "DRS activable y carrocería de fibra de carbono monocasco", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_13", name: "Sakura GT500 Concept", rarity: "rare", sprite: "car_orange", desc: "Prototipo japonés de la categoría reina Super GT", stats: makeStats(3,3,3,2,2,2,2,2,2,1) }, // 22 pts
    { id: "r_14", name: "Sarthe Prototype Lite", rarity: "rare", sprite: "car_yellow", desc: "Cockpit cerrado con aerodinámica de prototipo LMP3", stats: makeStats(3,3,2,3,2,2,2,2,2,1) }, // 22 pts
    { id: "r_15", name: "Interlagos Formula Apex", rarity: "rare", sprite: "car_red", desc: "Ajuste agresivo de suspensión para cambios de rasante bruscos", stats: makeStats(3,3,2,2,2,2,2,2,2,1) }, // 21 pts

    // --- 10 LEGENDARIOS (Presupuesto: 26 - 28 Puntos - Superdeportivos e Hypercars) ---
    { id: "leg_01", name: "HYPERION 720 SENNA GT", rarity: "legendary", sprite: "car_cyan", desc: "Hypercar de 800 CV con aerodinámica activa y KERS", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }, // 28 pts
    { id: "leg_02", name: "CORSA ROSSO 488 GT3 PISTA", rarity: "legendary", sprite: "car_red", desc: "Campeón de las 24H de Spa con motor V8 Twin-Turbo", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }, // 28 pts
    { id: "leg_03", name: "STUTTGART 911 GT3-R GRELLO", rarity: "legendary", sprite: "car_yellow", desc: "La leyenda de Nürburgring con esquema Manthey", stats: makeStats(4,4,3,3,3,3,2,3,2,1) }, // 28 pts
    { id: "leg_04", name: "VALKYRIE AMR PRO V12", rarity: "legendary", sprite: "car_blue", desc: "Monstruo V12 atmosférico de 1.000 CV que desafía la física", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }, // 28 pts
    { id: "leg_05", name: "BAVARIA M4 BEAST GT3 ROWE", rarity: "legendary", sprite: "car_green", desc: "Acorazado alemán ganador de campeonatos mundiales", stats: makeStats(4,3,3,3,3,3,2,2,3,1) }, // 27 pts
    { id: "leg_06", name: "SOLARIS DAME GT3 LE MANS", rarity: "legendary", sprite: "car_orange", desc: "Bólido del equipo Iron Dames de alta tecnología", stats: makeStats(4,3,3,3,3,3,2,2,3,1) }, // 27 pts
    { id: "leg_07", name: "CHIRON PUR SPORT APEX", rarity: "legendary", sprite: "car_blue", desc: "Motor W16 Quad-Turbo de 1.500 CV con alerón masivo", stats: makeStats(5,4,3,2,3,2,3,2,3,1) }, // 28 pts
    { id: "leg_08", name: "LA CORSA HYPER HYBRID", rarity: "legendary", sprite: "car_red", desc: "Potencia híbrida combinada de 963 CV con chasis T800", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }, // 28 pts
    { id: "leg_09", name: "SARTHE HYPERCAR LMH-01", rarity: "legendary", sprite: "car_yellow", desc: "Prototipo de la categoría reina de Le Mans", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }, // 28 pts
    { id: "leg_10", name: "VENOM F5 ABSOLUTE AERO", rarity: "legendary", sprite: "car_cyan", desc: "Bólido récord mundial con aerodinámica extrema", stats: makeStats(5,4,3,2,3,2,3,2,3,1) }  // 28 pts
];

// Configuración de las 5 Piezas de Mejora / Taller Web3
const UPGRADE_PARTS_CONFIG = {
    ecu: {
        nameKey: "parts_ecu",
        icon: "🔌",
        maxStage: 4,
        boosts: { potencia: 1, turbo: 1 },
        costs: [
            { cr: 800, gems: 0 },
            { cr: 1800, gems: 0 },
            { cr: 3500, gems: 30 },
            { cr: 6000, gems: 80 }
        ]
    },
    tires: {
        nameKey: "parts_tires",
        icon: "🏎️",
        maxStage: 4,
        boosts: { agarre: 1, traccion: 1 },
        costs: [
            { cr: 800, gems: 0 },
            { cr: 1800, gems: 0 },
            { cr: 3500, gems: 30 },
            { cr: 6000, gems: 80 }
        ]
    },
    brakes: {
        nameKey: "parts_brakes",
        icon: "🛑",
        maxStage: 4,
        boosts: { frenada: 1, manejo: 1 },
        costs: [
            { cr: 750, gems: 0 },
            { cr: 1700, gems: 0 },
            { cr: 3200, gems: 25 },
            { cr: 5500, gems: 70 }
        ]
    },
    turbo: {
        nameKey: "parts_turbo",
        icon: "🌪️",
        maxStage: 4,
        boosts: { aceleracion: 1, velocidad: 1 },
        costs: [
            { cr: 950, gems: 0 },
            { cr: 2200, gems: 0 },
            { cr: 4000, gems: 40 },
            { cr: 7500, gems: 100 }
        ]
    },
    chassis: {
        nameKey: "parts_chassis",
        icon: "🪶",
        maxStage: 4,
        boosts: { ligereza: 1, downforce: 1 },
        costs: [
            { cr: 900, gems: 0 },
            { cr: 2000, gems: 0 },
            { cr: 3800, gems: 35 },
            { cr: 7000, gems: 90 }
        ]
    }
};

// Cálculo dinámico de rendimiento de un coche basado en sus 10 estadísticas y piezas equipadas
function calculateCarPerformance(car) {
    const rawStats = car.stats || makeStats(1,1,1,1,1,1,1,1,1,1);
    const parts = car.parts || { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 };
    const level = car.level || 1;

    // Bonificación de nivel: +1 punto distribuido por cada 2 niveles superados
    const lvlBonus = Math.floor((level - 1) / 2);

    const eff = {
        potencia: (rawStats.potencia || 1) + (parts.ecu || 0) + lvlBonus,
        velocidad: (rawStats.velocidad || 1) + (parts.turbo || 0) + lvlBonus,
        aceleracion: (rawStats.aceleracion || 1) + (parts.turbo || 0) + lvlBonus,
        agarre: (rawStats.agarre || 1) + (parts.tires || 0) + lvlBonus,
        frenada: (rawStats.frenada || 1) + (parts.brakes || 0) + lvlBonus,
        manejo: (rawStats.manejo || 1) + (parts.brakes || 0) + lvlBonus,
        turbo: (rawStats.turbo || 1) + (parts.ecu || 0) + lvlBonus,
        downforce: (rawStats.downforce || 1) + (parts.chassis || 0) + lvlBonus,
        traccion: (rawStats.traccion || 1) + (parts.tires || 0) + lvlBonus,
        ligereza: (rawStats.ligereza || 1) + (parts.chassis || 0) + lvlBonus
    };

    const totalPoints = Object.values(eff).reduce((sum, v) => sum + v, 0);

    // Conversión matemática a físicas para el motor del juego
    const speedKmh = Math.round(280 + (eff.potencia * 10) + (eff.velocidad * 14) + (eff.turbo * 6));
    const accelVal = Math.round(180 + (eff.aceleracion * 14) + (eff.traccion * 12) + (eff.turbo * 8));
    const handlingVal = parseFloat((3.2 + (eff.agarre * 0.18) + (eff.manejo * 0.14) + (eff.downforce * 0.10)).toFixed(2));
    const brakingVal = parseFloat((2.5 + (eff.frenada * 0.25) + (eff.ligereza * 0.15)).toFixed(2));

    return {
        effectiveStats: eff,
        totalPoints: totalPoints,
        speedKmh: speedKmh,
        accelVal: accelVal,
        handlingVal: handlingVal,
        brakingVal: brakingVal
    };
}

// Cajas Misteriosas NFT (Loot Boxes)
const NFT_CRATES = {
    bronze: {
        id: "bronze",
        nameKey: "crate_bronze_title",
        cost: 500,
        currency: "credits", // $CR
        odds: { common: 0.88, uncommon: 0.115, rare: 0.005, legendary: 0.00 },
        badgeColor: 0xcd7f32
    },
    silver: {
        id: "silver",
        nameKey: "crate_silver_title",
        cost: 2000,
        currency: "credits", // $CR
        odds: { common: 0.62, uncommon: 0.33, rare: 0.049, legendary: 0.001 },
        badgeColor: 0xc0c0c0
    },
    gold: {
        id: "gold",
        nameKey: "crate_gold_title",
        cost: 500,
        currency: "gems", // Gemas $TON
        odds: { common: 0.28, uncommon: 0.52, rare: 0.185, legendary: 0.015 },
        badgeColor: 0xffd700
    }
};

// Guardado del Usuario Web3
function loadNftUserData() {
    let data = null;
    try {
        const raw = localStorage.getItem('apex_web3_garage_save');
        if (raw) data = JSON.parse(raw);
    } catch(e) {}

    const starterColor = NFT_CAR_COLORS[0];
    const starterModel = NFT_CAR_MODELS[0];
    const starterCar = {
        instanceId: "nft_inst_001",
        modelId: starterModel.id,
        name: starterModel.name,
        rarity: starterModel.rarity,
        stats: { ...starterModel.stats },
        level: 1,
        xp: 0,
        xpNeeded: 250,
        parts: { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 },
        colorName: starterColor.name,
        colorHex: starterColor.hex,
        tint: starterColor.tint,
        mintNumber: 1042,
        tokenHash: "0x7a3f89b...c41e",
        sprite: starterModel.sprite,
        obtainedAt: Date.now()
    };

    if (!data || typeof data.credits !== 'number' || typeof data.gems !== 'number' || !Array.isArray(data.garage) || data.garage.length === 0) {
        data = {
            credits: (data && typeof data.credits === 'number') ? data.credits : 2000,
            gems: (data && typeof data.gems === 'number') ? data.gems : 300,
            equippedInstanceId: (data && data.equippedInstanceId) ? data.equippedInstanceId : starterCar.instanceId,
            garage: (data && Array.isArray(data.garage) && data.garage.length > 0) ? data.garage : [starterCar]
        };
        saveNftUserData(data);
    }

    if (typeof data.credits !== 'number') data.credits = 2000;
    if (typeof data.gems !== 'number') data.gems = 300;
    if (!Array.isArray(data.garage) || data.garage.length === 0) data.garage = [starterCar];
    if (!data.equippedInstanceId && data.garage[0]) data.equippedInstanceId = data.garage[0].instanceId;

    // Asegurar retrocompatibilidad para coches existentes sin los 10 atributos o piezas
    data.garage.forEach(c => {
        if (!c.stats) {
            const m = NFT_CAR_MODELS.find(mod => mod.id === c.modelId) || starterModel;
            c.stats = { ...m.stats };
        }
        if (!c.parts) c.parts = { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 };
        if (!c.level) c.level = 1;
        if (typeof c.xp !== 'number') c.xp = 0;
        if (!c.xpNeeded) c.xpNeeded = c.level * 250;
    });

    return data;
}

function saveNftUserData(data) {
    try {
        localStorage.setItem('apex_web3_garage_save', JSON.stringify(data));
    } catch(e) {}
}

// Acuñar (Mint) un coche NFT con sus 10 estadísticas y ranuras de piezas
function mintProceduralNftCar(modelDef, forcedColor = null) {
    const chosenColor = forcedColor || NFT_CAR_COLORS[Math.floor(Math.random() * NFT_CAR_COLORS.length)];
    const mintNum = Math.floor(1000 + Math.random() * 8999);
    const randomHex = Math.floor(Math.random() * 0xffffffffff).toString(16).padStart(10, '0');
    const tokenHash = `0x${randomHex.slice(0, 4)}...${randomHex.slice(-4)}`;

    return {
        instanceId: `nft_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        modelId: modelDef.id,
        name: modelDef.name,
        rarity: modelDef.rarity,
        desc: modelDef.desc,
        stats: { ...modelDef.stats },
        level: 1,
        xp: 0,
        xpNeeded: 250,
        parts: { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 },
        colorName: chosenColor.name,
        colorHex: chosenColor.hex,
        tint: chosenColor.tint,
        mintNumber: mintNum,
        tokenHash: tokenHash,
        sprite: modelDef.sprite,
        obtainedAt: Date.now()
    };
}

// Abrir una Caja Misteriosa NFT con probabilidades calibradas
function openMysteryCrate(crateKey) {
    const crate = NFT_CRATES[crateKey];
    if (!crate) return { success: false, reason: "Caja no válida" };

    const userData = loadNftUserData();
    if (crate.currency === "credits") {
        if (userData.credits < crate.cost) return { success: false, reason: "credits_insufficient" };
        userData.credits -= crate.cost;
    } else {
        if (userData.gems < crate.cost) return { success: false, reason: "gems_insufficient" };
        userData.gems -= crate.cost;
    }

    const roll = Math.random();
    let pickedRarity = "common";
    let cum = 0;
    const odds = crate.odds;

    if (roll < (cum += odds.legendary)) {
        pickedRarity = "legendary";
    } else if (roll < (cum += odds.rare)) {
        pickedRarity = "rare";
    } else if (roll < (cum += odds.uncommon)) {
        pickedRarity = "uncommon";
    } else {
        pickedRarity = "common";
    }

    const pool = NFT_CAR_MODELS.filter(m => m.rarity === pickedRarity);
    const chosenModel = pool[Math.floor(Math.random() * pool.length)] || NFT_CAR_MODELS[0];

    const mintedCar = mintProceduralNftCar(chosenModel);
    userData.garage.push(mintedCar);
    saveNftUserData(userData);

    return {
        success: true,
        car: mintedCar,
        crate: crate,
        remainingCredits: userData.credits,
        remainingGems: userData.gems
    };
}

// Mejorar una pieza de un coche (Taller Web3)
function upgradeCarPart(instanceId, partKey) {
    const partCfg = UPGRADE_PARTS_CONFIG[partKey];
    if (!partCfg) return { success: false, reason: "Pieza inválida" };

    const userData = loadNftUserData();
    const car = userData.garage.find(c => c.instanceId === instanceId);
    if (!car) return { success: false, reason: "Coche no encontrado" };

    if (!car.parts) car.parts = { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 };
    const currentStage = car.parts[partKey] || 0;
    if (currentStage >= partCfg.maxStage) return { success: false, reason: "¡Nivel máximo alcanzado!" };

    const costInfo = partCfg.costs[currentStage];
    if (userData.credits < costInfo.cr) return { success: false, reason: "credits_insufficient" };
    if (userData.gems < costInfo.gems) return { success: false, reason: "gems_insufficient" };

    userData.credits -= costInfo.cr;
    userData.gems -= costInfo.gems;
    car.parts[partKey] = currentStage + 1;

    saveNftUserData(userData);
    return {
        success: true,
        car: car,
        newStage: car.parts[partKey],
        remainingCredits: userData.credits,
        remainingGems: userData.gems
    };
}

// Añadir XP al coche actualmente equipado tras una carrera
function addXpToEquippedCar(xpAmount) {
    const userData = loadNftUserData();
    const car = userData.garage.find(c => c.instanceId === userData.equippedInstanceId) || userData.garage[0];
    if (!car) return null;

    if (!car.level) car.level = 1;
    if (typeof car.xp !== 'number') car.xp = 0;
    if (!car.xpNeeded) car.xpNeeded = car.level * 250;

    car.xp += xpAmount;
    let leveledUp = false;

    while (car.xp >= car.xpNeeded && car.level < 10) {
        car.xp -= car.xpNeeded;
        car.level++;
        car.xpNeeded = car.level * 250;
        leveledUp = true;
    }

    saveNftUserData(userData);
    return {
        leveledUp: leveledUp,
        newLevel: car.level,
        currentXp: car.xp,
        xpNeeded: car.xpNeeded
    };
}

// Obtener el coche actualmente equipado
function getEquippedNftCar() {
    const userData = loadNftUserData();
    const equipped = userData.garage.find(c => c.instanceId === userData.equippedInstanceId);
    if (equipped) return equipped;
    return userData.garage[0];
}
