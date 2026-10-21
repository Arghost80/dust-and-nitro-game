// ===== CATÁLOGO DE 73 VEHÍCULOS NFT WEB3, 10 ESTADÍSTICAS POR PUNTOS, SISTEMA DE NIVELES Y PIEZAS =====

const NFT_CAR_COLORS = [
    { name: "Rosso Corsa", hex: "#e53935", tint: 0xe53935 },
    { name: "Neon Cyber Pink", hex: "#ec4899", tint: 0xec4899 },
    { name: "Miami Blue GT", hex: "#0284c7", tint: 0x0284c7 },
    { name: "Electric Sky Blue", hex: "#38bdf8", tint: 0x38bdf8 },
    { name: "Deep Royal Blue", hex: "#1d4ed8", tint: 0x1d4ed8 },
    { name: "Cyber Magenta", hex: "#d946ef", tint: 0xd946ef },
    { name: "Grello Acid Yellow", hex: "#facc15", tint: 0xfacc15 },
    { name: "British Racing Green", hex: "#15803d", tint: 0x15803d },
    { name: "Toxic Lime Green", hex: "#a3e635", tint: 0xa3e635 },
    { name: "Papaya Orange", hex: "#ea580c", tint: 0xea580c },
    { name: "Cyberpunk Cyan", hex: "#06b6d4", tint: 0x06b6d4 },
    { name: "Midnight Purple", hex: "#7e22ce", tint: 0x7e22ce },
    { name: "Ultraviolet Purple", hex: "#8b5cf6", tint: 0x8b5cf6 },
    { name: "Gold Edition 24K", hex: "#eab308", tint: 0xeab308 },
    { name: "Champagne Gold", hex: "#fde047", tint: 0xfde047 },
    { name: "Ruby Crimson Metallic", hex: "#991b1b", tint: 0x991b1b },
    { name: "Stealth Matte Black", hex: "#1e293b", tint: 0x1e293b },
    { name: "Pure Pearl White", hex: "#f8fafc", tint: 0xf8fafc },
    { name: "Nardo Grey Pro", hex: "#64748b", tint: 0x64748b },
    { name: "Bubblegum Pink", hex: "#f472b6", tint: 0xf472b6 }
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

// 73 Modelos Base clasificados por Rareza y Presupuesto de Puntos con 24 siluetas visuales únicas:
// Comunes: 10 a 12 Puntos | Infrecuentes: 15 a 16 Puntos | Raros: 20 a 22 Puntos | Legendarios: 26 a 28 Puntos
const NFT_CAR_MODELS = [
    // --- VEHÍCULO INICIAL FREE-TO-PLAY (No-NFT / Presupuesto: 7 Puntos) ---
    { id: "s_01", name: "Apex Cadet 1.0", rarity: "starter", isNft: false, sprite: "car_grey", visualId: 23, desc: "Vehículo escuela de iniciación. No es NFT pero se puede tunear y potenciar en el taller.", stats: makeStats(1,1,1,1,1,1,0,0,1,0) },

    // --- 28 COMUNES (Presupuesto: 10 - 12 Puntos) ---
    { id: "c_01", name: "Monza Hatch 1.4", rarity: "common", sprite: "car_red", visualId: 23, desc: "Compacto ágil urbano ideal para principiantes", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_02", name: "Tokyo Metro Turbo", rarity: "common", sprite: "car_blue", visualId: 13, desc: "Hatchback japonés con turbo ligero", stats: makeStats(1,2,2,1,1,1,1,1,1,1) },
    { id: "c_03", name: "Bavaria Compact 318", rarity: "common", sprite: "car_green", visualId: 4, desc: "Tracción trasera equilibrada con chasis noble", stats: makeStats(1,2,1,2,1,1,1,1,1,1) },
    { id: "c_04", name: "Detroit Rebel Coupe", rarity: "common", sprite: "car_yellow", visualId: 24, desc: "Cupé americano con par motor a bajas vueltas", stats: makeStats(2,2,1,1,1,1,1,1,1,1) },
    { id: "c_05", name: "Iberian Sport 16V", rarity: "common", sprite: "car_orange", visualId: 21, desc: "Tracción delantera deportiva de copa monomarca", stats: makeStats(1,1,2,1,1,2,1,1,1,1) },
    { id: "c_06", name: "Nordic City Wagon", rarity: "common", sprite: "car_cyan", visualId: 20, desc: "Familiar sueco reforzado con estabilidad en agua", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_07", name: "Riviera Sprint Micro", rarity: "common", sprite: "car_red", visualId: 23, desc: "Peso pluma hiperreactivo en curvas ratoneras", stats: makeStats(1,1,2,1,1,1,1,1,1,2) },
    { id: "c_08", name: "Shibuya Cruiser 1.8", rarity: "common", sprite: "car_blue", visualId: 18, desc: "Sedán urbano japonés fiable y dócil", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_09", name: "Verona Eco Pulse", rarity: "common", sprite: "car_green", visualId: 15, desc: "Híbrido de aceleración instantánea en salida", stats: makeStats(1,1,2,1,1,1,1,1,2,1) },
    { id: "c_10", name: "Saxon Classic 1.6", rarity: "common", sprite: "car_yellow", visualId: 3, desc: "Berlina tradicional de ingeniería alemana básica", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_11", name: "Corsica Street Boy", rarity: "common", sprite: "car_orange", visualId: 17, desc: "Preparación de calle con escape deportivo homologado", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_12", name: "Osaka Swift R", rarity: "common", sprite: "car_cyan", visualId: 14, desc: "Divertido y ligero para tramos de montaña", stats: makeStats(1,1,2,1,1,2,1,1,1,1) },
    { id: "c_13", name: "Autobahn Star 180", rarity: "common", sprite: "car_red", visualId: 1, desc: "Aerodinámica optimizada para cruceros rápidos", stats: makeStats(1,3,1,1,1,1,1,1,1,1) },
    { id: "c_14", name: "Nevada Dust Pickup", rarity: "common", sprite: "car_blue", visualId: 19, desc: "Robusto chasis de largueros resistente a impactos", stats: makeStats(1,1,1,1,1,1,1,1,2,1) },
    { id: "c_15", name: "Roma Piccolo GT", rarity: "common", sprite: "car_green", visualId: 2, desc: "Estilo italiano elegante con motor puntiagudo", stats: makeStats(1,2,1,1,1,2,1,1,1,1) },
    { id: "c_16", name: "Lyon Tourer 2.0", rarity: "common", sprite: "car_yellow", visualId: 5, desc: "Excelente amortiguación para bordillos y baches", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_17", name: "Baltic Rally Cup", rarity: "common", sprite: "car_orange", visualId: 21, desc: "Ajuste de suspensión elevada para tierra y gravilla", stats: makeStats(1,1,2,1,1,1,1,1,2,1) },
    { id: "c_18", name: "Kyoto Breeze", rarity: "common", sprite: "car_cyan", visualId: 16, desc: "Silencioso pero con paso por curva progresivo", stats: makeStats(1,1,1,2,1,1,1,1,1,1) },
    { id: "c_19", name: "Texas Cargo Custom", rarity: "common", sprite: "car_red", visualId: 19, desc: "Fuerza bruta con eje rígido trasero", stats: makeStats(2,1,1,1,1,1,1,1,1,1) },
    { id: "c_20", name: "Britannia City 1.2", rarity: "common", sprite: "car_blue", visualId: 23, desc: "Herencia británica compacta con tacto directo", stats: makeStats(1,1,1,1,1,2,1,1,1,1) },
    { id: "c_21", name: "Alpine Glacier Mini", rarity: "common", sprite: "car_green", visualId: 20, desc: "Gran agarre mecánico sobre asfalto húmedo", stats: makeStats(1,1,1,2,1,1,1,1,1,1) },
    { id: "c_22", name: "Andes Trail 4x4", rarity: "common", sprite: "car_yellow", visualId: 22, desc: "Tracción integral permanente básica", stats: makeStats(1,1,1,1,1,1,1,1,2,1) },
    { id: "c_23", name: "Sahara Dune Runner", rarity: "common", sprite: "car_orange", visualId: 22, desc: "Filtro de aire para tormentas de polvo", stats: makeStats(1,1,1,1,1,1,1,1,2,1) },
    { id: "c_24", name: "Thames Classic Van", rarity: "common", sprite: "car_cyan", visualId: 17, desc: "Furgoneta clásica de carreras con centro de gravedad bajo", stats: makeStats(1,1,1,1,1,1,1,1,1,1) },
    { id: "c_25", name: "Madrid Urban Go", rarity: "common", sprite: "car_red", visualId: 15, desc: "Relación de marchas corta para acelerar entre horquillas", stats: makeStats(1,1,2,1,1,1,1,1,1,1) },
    { id: "c_26", name: "Stuttgart Urban A", rarity: "common", sprite: "car_blue", visualId: 4, desc: "Construcción sólida y frenada equilibrada", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },
    { id: "c_27", name: "Seoul Spark GT", rarity: "common", sprite: "car_green", visualId: 13, desc: "Electrónica moderna con control de tracción deportivo", stats: makeStats(1,1,2,1,1,1,1,1,1,1) },
    { id: "c_28", name: "Pacific Coast Rover", rarity: "common", sprite: "car_yellow", visualId: 18, desc: "Estabilidad en línea recta con vientos cruzados", stats: makeStats(1,2,1,1,1,1,1,1,1,1) },

    // --- 20 INFRECUENTES (Presupuesto: 15 - 16 Puntos) ---
    { id: "u_01", name: "Fuji Silhouette RS", rarity: "uncommon", sprite: "car_blue", visualId: 13, desc: "Ícono JDM con turbo de doble entrada y tracción total", stats: makeStats(2,2,2,2,1,2,1,1,2,1) },
    { id: "u_02", name: "Stuttgart Boxer 718", rarity: "uncommon", sprite: "car_yellow", visualId: 1, desc: "Motor bóxer central con reparto de masas ideal 50:50", stats: makeStats(2,2,2,2,1,2,1,1,1,2) },
    { id: "u_03", name: "Detroit V8 Interceptor", rarity: "uncommon", sprite: "car_red", visualId: 24, desc: "Bloque motor V8 atmosférico con rugido ensordecedor", stats: makeStats(3,2,2,1,1,1,1,1,2,1) },
    { id: "u_04", name: "Briton Falcon Sprint", rarity: "uncommon", sprite: "car_green", visualId: 3, desc: "Chasis tubular de aluminio con agilidad felina", stats: makeStats(2,2,2,2,1,2,1,1,1,2) },
    { id: "u_05", name: "Rally Evo Integrale", rarity: "uncommon", sprite: "car_orange", visualId: 21, desc: "Tracción integral con diferenciales activos de rally", stats: makeStats(2,2,2,2,1,1,1,1,3,1) },
    { id: "u_06", name: "Alpine Apex A110", rarity: "uncommon", sprite: "car_cyan", visualId: 6, desc: "Ultraligero francés con pasos por curva hipnóticos", stats: makeStats(1,2,2,2,1,2,1,1,1,3) },
    { id: "u_07", name: "Scandia Turbo Polar", rarity: "uncommon", sprite: "car_blue", visualId: 20, desc: "Motor de 5 cilindros con enorme empuje a medio régimen", stats: makeStats(2,2,2,1,1,1,2,1,2,1) },
    { id: "u_08", name: "Milan Veloce 2.0T", rarity: "uncommon", sprite: "car_red", visualId: 2, desc: "Diseño pasional italiano con dirección hipersensible", stats: makeStats(2,2,2,2,1,2,1,1,1,1) },
    { id: "u_09", name: "Tokyo Drift Spec-S", rarity: "uncommon", sprite: "car_orange", visualId: 15, desc: "Diferencial autoblocante tarado al 80% para drift", stats: makeStats(2,2,2,2,1,2,1,1,1,2) },
    { id: "u_10", name: "Bavaria M-Sport Coupe", rarity: "uncommon", sprite: "car_green", visualId: 4, desc: "Seis cilindros en línea biturbo afinado en circuito", stats: makeStats(2,3,2,1,1,2,1,1,2,1) },
    { id: "u_11", name: "Iberian Cupra R", rarity: "uncommon", sprite: "car_yellow", visualId: 17, desc: "Autoblocante mecánico delantero VAQ invencible", stats: makeStats(2,2,2,2,1,2,1,1,2,1) },
    { id: "u_12", name: "Mustang Canyon Mach", rarity: "uncommon", sprite: "car_red", visualId: 24, desc: "Músculo puro optimizado para aceleraciones en recta", stats: makeStats(3,2,2,1,1,1,1,1,2,1) },
    { id: "u_13", name: "Yokohama Silvia 200", rarity: "uncommon", sprite: "car_cyan", visualId: 14, desc: "Tracción trasera legendaria para enlazar curvas", stats: makeStats(2,2,2,2,1,2,1,1,1,2) },
    { id: "u_14", name: "Modena Spider Sport", rarity: "uncommon", sprite: "car_red", visualId: 2, desc: "Carrocería descapotable con centro de gravedad rebajado", stats: makeStats(2,2,2,2,1,2,1,1,1,1) },
    { id: "u_15", name: "Coventry Eagle V6", rarity: "uncommon", sprite: "car_green", visualId: 3, desc: "Compresor volumétrico con respuesta instantánea al acelerador", stats: makeStats(2,2,2,2,1,2,1,1,1,1) },
    { id: "u_16", name: "Nürburg Clubsport 230", rarity: "uncommon", sprite: "car_yellow", visualId: 1, desc: "Jaula antivuelco integrada y frenos perforados", stats: makeStats(2,2,2,2,2,2,1,1,1,1) },
    { id: "u_17", name: "Sahara Raider Trophy", rarity: "uncommon", sprite: "car_orange", visualId: 22, desc: "Amortiguadores de triple bypass para saltos y peraltes", stats: makeStats(2,1,2,1,1,1,1,1,3,2) },
    { id: "u_18", name: "Suzuka Circuit R", rarity: "uncommon", sprite: "car_blue", visualId: 16, desc: "Alerón regulable en 5 posiciones para apoyo aerodinámico", stats: makeStats(2,2,2,2,1,2,1,2,1,1) },
    { id: "u_19", name: "Black Forest Turbo", rarity: "uncommon", sprite: "car_cyan", visualId: 18, desc: "Intercooler sobredimensionado para rendir al 100% en calor", stats: makeStats(2,2,2,1,1,2,2,1,1,1) },
    { id: "u_20", name: "Daytona Pace Car", rarity: "uncommon", sprite: "car_yellow", visualId: 5, desc: "Luces estroboscópicas de seguridad y chasis reforzado", stats: makeStats(2,2,2,2,1,2,1,1,1,1) },

    // --- 15 RAROS (Presupuesto: 20 - 22 Puntos) ---
    { id: "r_01", name: "Corsa GT4 Clubsport", rarity: "rare", sprite: "car_red", visualId: 1, desc: "Bólido oficial de copa GT4 con frenos cerámicos Brembo", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_02", name: "Nürburg M4 Competition", rarity: "rare", sprite: "car_green", visualId: 4, desc: "Aerodinámica de fibra de carbono probada en el Infierno Verde", stats: makeStats(3,3,2,2,2,2,2,2,2,1) },
    { id: "r_03", name: "Silverstone Vantage AMR", rarity: "rare", sprite: "car_blue", visualId: 3, desc: "División de carreras británica con cambio secuencial", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_04", name: "Scuderia 458 Challenge", rarity: "rare", sprite: "car_red", visualId: 2, desc: "V8 atmosférico girando a 9.000 RPM en circuito", stats: makeStats(3,3,3,2,2,2,2,2,2,1) },
    { id: "r_05", name: "Yokohama GT-R Spec-V", rarity: "rare", sprite: "car_cyan", visualId: 13, desc: "Monstruo de tracción integral ATTESA E-TS Pro", stats: makeStats(3,3,3,2,2,2,2,1,3,1) },
    { id: "r_06", name: "Stuttgart Carrera GTS", rarity: "rare", sprite: "car_yellow", visualId: 1, desc: "Ancho de vías ensanchado y llantas monotuerca de magnesio", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_07", name: "Detroit Z06 Track Edition", rarity: "rare", sprite: "car_orange", visualId: 24, desc: "V8 con cigüeñal plano y splitters aerodinámicos masivos", stats: makeStats(4,3,2,2,2,1,2,2,2,1) },
    { id: "r_08", name: "Briton Superleggera GT", rarity: "rare", sprite: "car_blue", visualId: 3, desc: "Construcción aligerada en titanio para una relación peso/potencia récord", stats: makeStats(3,3,2,2,2,2,2,2,2,2) },
    { id: "r_09", name: "Monza Cup Trofeo", rarity: "rare", sprite: "car_red", visualId: 2, desc: "Puesta a punto radical para chicanes de alta velocidad", stats: makeStats(3,3,2,2,2,2,2,2,2,1) },
    { id: "r_10", name: "Hyperion Aero Sport", rarity: "rare", sprite: "car_cyan", visualId: 6, desc: "Fondo plano con efecto suelo y difusor de carbono venturi", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_11", name: "Alpine Endurance Cup", rarity: "rare", sprite: "car_blue", visualId: 5, desc: "Diseñado para pruebas de resistencia de 24 horas continuas", stats: makeStats(2,3,2,3,2,2,2,2,2,1) },
    { id: "r_12", name: "Bavaria DTM Silhouette", rarity: "rare", sprite: "car_green", visualId: 4, desc: "DRS activable y carrocería de fibra de carbono monocasco", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_13", name: "Sakura GT500 Concept", rarity: "rare", sprite: "car_orange", visualId: 16, desc: "Prototipo japonés de la categoría reina Super GT", stats: makeStats(3,3,3,2,2,2,2,2,2,1) },
    { id: "r_14", name: "Sarthe Prototype Lite", rarity: "rare", sprite: "car_yellow", visualId: 12, desc: "Cockpit cerrado con aerodinámica de prototipo LMP3", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "r_15", name: "Interlagos Formula Apex", rarity: "rare", sprite: "car_red", visualId: 10, desc: "Ajuste agresivo de suspensión para cambios de rasante bruscos", stats: makeStats(3,3,2,2,2,2,2,2,2,1) },

    // --- 10 LEGENDARIOS (Presupuesto: 26 - 28 Puntos - Superdeportivos e Hypercars) ---
    { id: "leg_01", name: "HYPERION 720 SENNA GT", rarity: "legendary", sprite: "car_cyan", visualId: 6, desc: "Hypercar de 800 CV con aerodinámica activa y KERS", stats: makeStats(4,4,3,3,3,3,2,2,3,1) },
    { id: "leg_02", name: "CORSA ROSSO 488 GT3 PISTA", rarity: "legendary", sprite: "car_red", visualId: 2, desc: "Campeón de las 24H de Spa con motor V8 Twin-Turbo", stats: makeStats(4,4,3,3,3,3,2,2,3,1) },
    { id: "leg_03", name: "STUTTGART 911 GT3-R GRELLO", rarity: "legendary", sprite: "car_yellow", visualId: 1, desc: "La leyenda de Nürburgring con esquema Manthey", stats: makeStats(4,4,3,3,3,3,2,3,2,1) },
    { id: "leg_04", name: "VALKYRIE AMR PRO V12", rarity: "legendary", sprite: "car_blue", visualId: 3, desc: "Monstruo V12 atmosférico de 1.000 CV que desafía la física", stats: makeStats(4,4,3,3,3,3,2,2,3,1) },
    { id: "leg_05", name: "BAVARIA M4 BEAST GT3 ROWE", rarity: "legendary", sprite: "car_green", visualId: 4, desc: "Acorazado alemán ganador de campeonatos mundiales", stats: makeStats(4,3,3,3,3,3,2,2,3,1) },
    { id: "leg_06", name: "SOLARIS DAME GT3 LE MANS", rarity: "legendary", sprite: "car_orange", visualId: 5, desc: "Bólido del equipo Iron Dames de alta tecnología", stats: makeStats(4,3,3,3,3,3,2,2,3,1) },
    { id: "leg_07", name: "CHIRON PUR SPORT APEX", rarity: "legendary", sprite: "car_blue", visualId: 11, desc: "Motor W16 Quad-Turbo de 1.500 CV con alerón masivo", stats: makeStats(5,4,3,2,3,2,3,2,3,1) },
    { id: "leg_08", name: "LA CORSA HYPER HYBRID", rarity: "legendary", sprite: "car_red", visualId: 8, desc: "Potencia híbrida combinada de 963 CV con chasis T800", stats: makeStats(4,4,3,3,3,3,2,2,3,1) },
    { id: "leg_09", name: "SARTHE HYPERCAR LMH-01", rarity: "legendary", sprite: "car_yellow", visualId: 12, desc: "Prototipo de la categoría reina de Le Mans", stats: makeStats(4,4,3,3,3,3,2,2,3,1) },
    { id: "leg_10", name: "VENOM F5 ABSOLUTE AERO", rarity: "legendary", sprite: "car_cyan", visualId: 10, desc: "Bólido récord mundial con aerodinámica extrema", stats: makeStats(5,4,3,2,3,2,3,2,3,1) },

    // --- 16 NUEVAS LEYENDAS MOTORSPORT (LAMBORGHINI, FERRARI, PORSCHE, VIPER, MITSUBISHI, TOYOTA, BUGATTI, BENTLEY) ---
    { id: "leg_lambo_svj", name: "LAMBORGHINI AVENTADOR SVJ", rarity: "legendary", sprite: "car_yellow", visualId: 10, desc: "Monstruo V12 de 770 CV con aerodinámica activa ALA 2.0 y tracción integral", stats: makeStats(5,4,3,3,3,3,2,2,3,1) },
    { id: "r_lambo_huracan", name: "LAMBORGHINI HURACÁN GT3 EVO2", rarity: "rare", sprite: "car_green", visualId: 6, desc: "V10 atmosférico de competición GT3 con toma de aire superior hexagonal", stats: makeStats(3,3,3,2,2,2,2,2,2,1) },
    { id: "leg_ferrari_sp3", name: "FERRARI DAYTONA SP3 ICONA", rarity: "legendary", sprite: "car_red", visualId: 2, desc: "Homenaje de 840 CV a los prototipos de Daytona de 1967 con V12 a 9.500 RPM", stats: makeStats(5,4,3,3,3,3,2,2,3,1) },
    { id: "r_ferrari_f40", name: "FERRARI F40 LM COMPETIZIONE", rarity: "rare", sprite: "car_red", visualId: 2, desc: "El mito del V8 Twin-Turbo con alerón ajustable y peso pluma de 1.050 kg", stats: makeStats(4,3,3,2,2,2,2,1,2,1) },
    { id: "leg_porsche_gt3rs", name: "PORSCHE 911 GT3 RS WEISSACH", rarity: "legendary", sprite: "car_yellow", visualId: 1, desc: "Aero DRS activo y chasis de carreras matriculado de Nürburgring Nordschleife", stats: makeStats(4,4,3,3,3,3,2,3,2,1) },
    { id: "r_porsche_cgt", name: "PORSCHE CARRERA GT V10", rarity: "rare", sprite: "car_grey", visualId: 1, desc: "Motor V10 atmosférico derivado de Le Mans con chasis monocasco de carbono", stats: makeStats(4,3,2,2,2,2,2,1,2,2) },
    { id: "r_viper_acr", name: "DODGE VIPER ACR EXTREME", rarity: "rare", sprite: "car_red", visualId: 24, desc: "Monstruo V10 de 8.4L con paquete Extreme Aero y 1.000 kg de downforce", stats: makeStats(4,3,2,2,2,2,2,2,2,1) },
    { id: "u_viper_gts", name: "DODGE VIPER GTS AMERICAN V10", rarity: "uncommon", sprite: "car_blue", visualId: 24, desc: "Carrocería cupé con techo de doble burbuja y par motor devastador", stats: makeStats(3,2,2,1,1,1,1,1,2,1) },
    { id: "r_mitsu_evo6", name: "MITSUBISHI LANCER EVO VI TME", rarity: "rare", sprite: "car_red", visualId: 17, desc: "Edición Tommi Mäkinen con turbina de titanio y tracción total 4WD activa", stats: makeStats(3,3,2,2,2,2,2,1,3,1) },
    { id: "u_mitsu_evo10", name: "MITSUBISHI LANCER EVO X FQ-440", rarity: "uncommon", sprite: "car_grey", visualId: 17, desc: "S-AWC Super All Wheel Control con 440 CV y turbo de doble entrada", stats: makeStats(2,2,2,2,1,2,1,1,2,1) },
    { id: "r_toyota_supra_mk4", name: "TOYOTA SUPRA MK4 TWIN-TURBO", rarity: "rare", sprite: "car_orange", visualId: 14, desc: "El legendario motor 2JZ-GTE biturbo icono indiscutible del tuning JDM", stats: makeStats(4,3,2,2,2,2,2,1,2,1) },
    { id: "u_toyota_gr_yaris", name: "TOYOTA GR YARIS RALLY1 HYBRID", rarity: "uncommon", sprite: "car_cyan", visualId: 21, desc: "Nacido del Campeonato Mundial de Rallyes con tracción GR-FOUR y techo de carbono", stats: makeStats(2,2,2,2,1,2,1,1,2,1) },
    { id: "leg_bugatti_bolide", name: "BUGATTI BOLIDE TRACK W16", rarity: "legendary", sprite: "car_blue", visualId: 11, desc: "Hypercar de circuito con 1.850 CV y relación peso-potencia de 0,67 kg/CV", stats: makeStats(5,4,3,2,3,2,3,2,3,1) },
    { id: "r_bugatti_veyron_ss", name: "BUGATTI VEYRON SUPER SPORT", rarity: "rare", sprite: "car_orange", visualId: 11, desc: "1.200 CV y aerodinámica optimizada récord de velocidad con cuatro turbos", stats: makeStats(4,3,2,2,2,1,2,2,2,1) },
    { id: "r_bentley_cont_gt3", name: "BENTLEY CONTINENTAL GT3 SPEED", rarity: "rare", sprite: "car_green", visualId: 5, desc: "V8 Twin-Turbo de 4.0L con carrocería ensanchada y alerón de fibra de carbono", stats: makeStats(3,3,2,3,2,2,2,2,2,1) },
    { id: "leg_bentley_speed8", name: "BENTLEY SPEED 8 LE MANS", rarity: "legendary", sprite: "car_green", visualId: 12, desc: "El mítico prototipo británico ganador absoluto de las 24 Horas de Le Mans", stats: makeStats(4,4,3,3,3,3,2,2,3,1) }
];

// Catálogo Extendido de 65 Piezas de Mecánica y Recambios de Taller Motorsport (5 Niveles de Rareza)
const WORKSHOP_PIECES_CATALOG = {
    // -------------------------------------------------------------
    // 1. MOTOR & VELOCIDAD PUNTA (speed_power)
    // -------------------------------------------------------------
    // Común (Tier 1 • Capítulo 1 Rookie)
    spark_plugs: { id: "spark_plugs", name: "Bujías de Iridio NGK", icon: "🔌", category: "speed_power", rarity: "common", desc: "Chispa de alta frecuencia para combustión óptima", costCr: 250 },
    air_filter_sport: { id: "air_filter_sport", name: "Filtro Cónico K&N Sport", icon: "🌪️", category: "speed_power", rarity: "common", desc: "Mayor flujo de admisión de aire frío", costCr: 280 },
    ecu_chip_stage1: { id: "ecu_chip_stage1", name: "Reprogramación ECU Stage 1", icon: "💻", category: "speed_power", rarity: "common", desc: "Curva de encendido e inyección optimizada", costCr: 320 },
    throttle_body_sport: { id: "throttle_body_sport", name: "Mariposa de Admisión Agrandada 70mm", icon: "🚪", category: "speed_power", rarity: "common", desc: "Respuesta inmediata al acelerador en aperturas bruscas", costCr: 270 },

    // Infrecuente (Tier 2 • Capítulo 2 Clubman)
    cylinders: { id: "cylinders", name: "Pistones Forjados Wössner", icon: "🔩", category: "speed_power", rarity: "uncommon", desc: "Pistones de compresión reforzada para altas RPM", costCr: 550 },
    fuel_injectors_high: { id: "fuel_injectors_high", name: "Inyectores Bosch Motorsport", icon: "💉", category: "speed_power", rarity: "uncommon", desc: "Inyección atomizada a 4.5 bar de presión", costCr: 600 },
    exhaust_manifold_sport: { id: "exhaust_manifold_sport", name: "Colectores 4-en-1 Acero Inox", icon: "💨", category: "speed_power", rarity: "uncommon", desc: "Evacuación de gases sin contrapresión", costCr: 650 },
    fuel_pump_highflow: { id: "fuel_pump_highflow", name: "Bomba de Gasolina Walbro 450 LPH", icon: "⛽", category: "speed_power", rarity: "uncommon", desc: "Caudal constante de combustible sin caídas de presión", costCr: 570 },

    // Rara (Tier 3 • Capítulo 3 Desierto)
    engine_block: { id: "engine_block", name: "Bloque Motor V8/Bóxer Aligerado", icon: "⚙️", category: "speed_power", rarity: "rare", desc: "Cárter seco y bloque de aleación ultraligero", costCr: 1200 },
    camshaft_racing: { id: "camshaft_racing", name: "Árbol de Levas Cruzado 284°", icon: "🪵", category: "speed_power", rarity: "rare", desc: "Mayor alzada de válvulas a 8.500 RPM", costCr: 1300 },
    intercooler_forge: { id: "intercooler_forge", name: "Intercooler Frontal Forge", icon: "❄️", category: "speed_power", rarity: "rare", desc: "Enfriamiento criogénico de la admisión", costCr: 1400 },
    blow_off_valve_hks: { id: "blow_off_valve_hks", name: "Válvula Blow-Off HKS SSQV", icon: "💨", category: "speed_power", rarity: "rare", desc: "Protege el compresor y reduce el lag entre cambios", costCr: 1250 },

    // Épica (Tier 4 • Capítulo 4 Pro)
    turbocharger: { id: "turbocharger", name: "Turbocompresor Garrett G35-900", icon: "🔥", category: "speed_power", rarity: "epic", desc: "Turbina de titanio y soplado a 2.4 bar", costCr: 2200 },
    motec_ecu_pro: { id: "motec_ecu_pro", name: "Centralita MoTeC M150 Pro GT", icon: "🧠", category: "speed_power", rarity: "epic", desc: "Telemetría en tiempo real y anti-lag launch control", costCr: 2500 },
    titanium_valves_springs: { id: "titanium_valves_springs", name: "Válvulas y Muelles de Titanio Ferrea", icon: "✨", category: "speed_power", rarity: "epic", desc: "Distribución resistente a regímenes extremos de 10.000 RPM", costCr: 2400 },

    // Legendaria (Tier 5 • Capítulo 5 Leyendas Mundial)
    billet_engine_v8: { id: "billet_engine_v8", name: "Bloque Motor CNC V8 Billet 1200HP", icon: "👑", category: "speed_power", rarity: "legendary", desc: "Mecanizado aeroespacial para más de 1.200 CV sin límite", costCr: 5500 },
    water_meth_injection: { id: "water_meth_injection", name: "Inyección de Metanol Snow Performance", icon: "💧", category: "speed_power", rarity: "legendary", desc: "Elimina detonación permitiendo avance de encendido máximo", costCr: 6000 },
    twin_turbo_hybrid_f1: { id: "twin_turbo_hybrid_f1", name: "Turbocompresor Híbrido F1 MGU-H", icon: "⚡", category: "speed_power", rarity: "legendary", desc: "Cero lag turbo mediante recuperación eléctrica térmica", costCr: 6200 },

    // -------------------------------------------------------------
    // 2. SISTEMA DE FRENOS (braking)
    // -------------------------------------------------------------
    // Común (Tier 1 • Capítulo 1 Rookie)
    brake_pads: { id: "brake_pads", name: "Pastillas Cerámicas Ferodo Racing", icon: "🛞", category: "braking", rarity: "common", desc: "Compuesto resistente a fatiga térmica en curvas", costCr: 220 },
    brake_fluid_dot5: { id: "brake_fluid_dot5", name: "Líquido de Frenos Motul RBF 660", icon: "🧪", category: "braking", rarity: "common", desc: "Punto de ebullición a 325°C para tacto duro de pedal", costCr: 240 },
    brake_bias_valve: { id: "brake_bias_valve", name: "Repartidor de Frenada Manual Tilton", icon: "⚖️", category: "braking", rarity: "common", desc: "Regulación milimétrica de balance delantero/trasero", costCr: 230 },

    // Infrecuente (Tier 2 • Capítulo 2 Clubman)
    brake_discs: { id: "brake_discs", name: "Discos Perforados Girodisc", icon: "💿", category: "braking", rarity: "uncommon", desc: "Ranuras de refrigeración activa para detención fulgurante", costCr: 500 },
    braided_brake_lines: { id: "braided_brake_lines", name: "Latiguillos Metálicos Goodridge", icon: "⛓️", category: "braking", rarity: "uncommon", desc: "Trenzados de acero inoxidable sin expansión volumétrica", costCr: 520 },
    master_cylinder_race: { id: "master_cylinder_race", name: "Doble Bomba de Freno AP Racing", icon: "🪛", category: "braking", rarity: "uncommon", desc: "Circuitos hidráulicos dobles independientes para máxima seguridad", costCr: 530 },

    // Rara (Tier 3 • Capítulo 3 Desierto)
    brake_calipers: { id: "brake_calipers", name: "Pinzas Brembo Monobloque 4-Pistones", icon: "🔴", category: "braking", rarity: "rare", desc: "Mordida instantánea en frenadas a final de recta", costCr: 1100 },
    ventilated_floating_discs: { id: "ventilated_floating_discs", name: "Discos Flotantes AP Racing 380mm", icon: "📀", category: "braking", rarity: "rare", desc: "Campana de ergal flotante con dilatación libre", costCr: 1250 },
    titanium_brake_shims: { id: "titanium_brake_shims", name: "Aislantes Térmicos de Titanio", icon: "🛡️", category: "braking", rarity: "rare", desc: "Barrera térmica que evita la transferencia de calor al líquido", costCr: 1180 },

    // Épica (Tier 4 • Capítulo 4 Pro)
    carbon_ceramic_calipers: { id: "carbon_ceramic_calipers", name: "Pinzas Brembo GT-R Monobloque 6P", icon: "🛑", category: "braking", rarity: "epic", desc: "Mecanizadas de un bloque sólido de aluminio forjado", costCr: 2300 },
    cooling_ducts_brakes: { id: "cooling_ducts_brakes", name: "Conductos de Aire de Carbono", icon: "🌬️", category: "braking", rarity: "epic", desc: "Túneles de refrigeración forzada a los discos", costCr: 2400 },
    carbon_cooling_fans: { id: "carbon_cooling_fans", name: "Turbinas de Enfriamiento Dinámico", icon: "🌀", category: "braking", rarity: "epic", desc: "Aspas integradas en llantas para disipar calor a alta velocidad", costCr: 2350 },

    // Legendaria (Tier 5 • Capítulo 5 Leyendas Mundial)
    carbon_ceramic_brembo: { id: "carbon_ceramic_brembo", name: "Frenos Carbono-Cerámicos Brembo CCM-R", icon: "💎", category: "braking", rarity: "legendary", desc: "Resistencia térmica absoluta sin fading a más de 1.000°C", costCr: 5400 },
    kers_f1_regen: { id: "kers_f1_regen", name: "MGU-K Regeneración Eléctrica F1", icon: "⚡", category: "braking", rarity: "legendary", desc: "Freno motor electromagnético de 160 CV con recarga", costCr: 5800 },
    f1_brake_by_wire: { id: "f1_brake_by_wire", name: "Sistema de Freno F1 Brake-By-Wire", icon: "🖲️", category: "braking", rarity: "legendary", desc: "Modulación electrónica por microsegundo sin bloqueo de ruedas", costCr: 5900 },

    // -------------------------------------------------------------
    // 3. CHASIS, NEUMÁTICOS & AGARRE (handling_grip)
    // -------------------------------------------------------------
    // Común (Tier 1 • Capítulo 1 Rookie)
    slick_tires: { id: "slick_tires", name: "Neumáticos Semi-Slick Sport", icon: "🏎️", category: "handling_grip", rarity: "common", desc: "Goma deportiva blanda con flanco reforzado", costCr: 260 },
    lowering_springs: { id: "lowering_springs", name: "Muelles Pro-Kit Eibach", icon: "〰️", category: "handling_grip", rarity: "common", desc: "Baja el centro de gravedad en 35mm para menos balanceo", costCr: 270 },
    wheel_spacers_hubcentric: { id: "wheel_spacers_hubcentric", name: "Separadores de Vía Ensanchada Eibach", icon: "📏", category: "handling_grip", rarity: "common", desc: "Ensancha la pisada en 20mm para mayor aplomo", costCr: 250 },

    // Infrecuente (Tier 2 • Capítulo 2 Clubman)
    suspension_springs: { id: "suspension_springs", name: "Muelles Roscados Coilover", icon: "🌀", category: "handling_grip", rarity: "uncommon", desc: "Amortiguación regulable en compresión y rebote", costCr: 520 },
    strut_brace_front: { id: "strut_brace_front", name: "Barra de Torretas Delantera Carbono", icon: "➖", category: "handling_grip", rarity: "uncommon", desc: "Elimina la flexión del chasis en apoyos violentos", costCr: 540 },
    camber_plates_adjustable: { id: "camber_plates_adjustable", name: "Copelas Regulables de Caída Dinámica", icon: "📐", category: "handling_grip", rarity: "uncommon", desc: "Caída negativa precisa para apoyo en curva máxima", costCr: 530 },

    // Rara (Tier 3 • Capítulo 3 Desierto)
    antiroll_bars: { id: "antiroll_bars", name: "Barra Estabilizadora H&R Gruesa", icon: "🔗", category: "handling_grip", rarity: "rare", desc: "Rigidez torsional contra el balanceo en cambios de apoyo", costCr: 1150 },
    adjustable_coilovers: { id: "adjustable_coilovers", name: "Coilovers KW Competition 3-Vías", icon: "🎛️", category: "handling_grip", rarity: "rare", desc: "Ajuste milimétrico de alta/baja velocidad y rebote", costCr: 1300 },
    polyurethane_bushings_kit: { id: "polyurethane_bushings_kit", name: "Silentblocks de Poliuretano Powerflex", icon: "🧱", category: "handling_grip", rarity: "rare", desc: "Cero holguras en los brazos de suspensión bajo carga", costCr: 1200 },

    // Épica (Tier 4 • Capítulo 4 Pro)
    michelin_cup_slicks: { id: "michelin_cup_slicks", name: "Slicks Lisos Michelin Pilot Sport GT", icon: "🏁", category: "handling_grip", rarity: "epic", desc: "Compuesto puro de goma slick para soportar 2.4G", costCr: 2450 },
    pushrod_suspension: { id: "pushrod_suspension", name: "Suspensión Inboard Push-Rod", icon: "📐", category: "handling_grip", rarity: "epic", desc: "Amortiguadores horizontales dentro del habitáculo", costCr: 2600 },
    magnesium_forged_wheels: { id: "magnesium_forged_wheels", name: "Llantas Forjadas de Magnesio BBS", icon: "🛞", category: "handling_grip", rarity: "epic", desc: "Masa no suspendida reducida a la mitad para giros veloces", costCr: 2550 },

    // Legendaria (Tier 5 • Capítulo 5 Leyendas Mundial)
    pirelli_f1_slicks: { id: "pirelli_f1_slicks", name: "Slicks F1 Pirelli P-Zero Rosso Corsa", icon: "🏆", category: "handling_grip", rarity: "legendary", desc: "Adherencia molecular térmica de monoplaza de GP", costCr: 5600 },
    monocoque_chassis_gt: { id: "monocoque_chassis_gt", name: "Chasis Monocasco Carbono-Titanio LMP", icon: "🛡️", category: "handling_grip", rarity: "legendary", desc: "Rigidez espacial de 50.000 Nm/grado con peso mínimo", costCr: 6200 },
    active_magnetic_dampers: { id: "active_magnetic_dampers", name: "Amortiguadores Magnetoreológicos Activos", icon: "🧲", category: "handling_grip", rarity: "legendary", desc: "Ajuste de viscosidad por campo electromagnético en 1ms", costCr: 6000 },

    // -------------------------------------------------------------
    // 4. TRANSMISIÓN & ACELERACIÓN (accel_traction)
    // -------------------------------------------------------------
    // Común (Tier 1 • Capítulo 1 Rookie)
    racing_clutch: { id: "racing_clutch", name: "Embrague Reforzado Monodisco", icon: "⚡", category: "accel_traction", rarity: "common", desc: "Acople sin pérdidas de par motor en arrancada", costCr: 280 },
    short_shifter_kit: { id: "short_shifter_kit", name: "Varillaje Corto Quick-Shift", icon: "🕹️", category: "accel_traction", rarity: "common", desc: "Recorrido de palanca reducido un 40% para cambios rápidos", costCr: 290 },
    polyurethane_trans_mounts: { id: "polyurethane_trans_mounts", name: "Soportes Rígidos de Transmisión", icon: "🔩", category: "accel_traction", rarity: "common", desc: "Evita pérdidas de empuje por cabeceo de motor y caja", costCr: 270 },

    // Infrecuente (Tier 2 • Capítulo 2 Clubman)
    lsd_differential: { id: "lsd_differential", name: "Diferencial Autoblocante LSD 1.5-Way", icon: "🔀", category: "accel_traction", rarity: "uncommon", desc: "Reparto de par 50/50 a las ruedas motrices", costCr: 580 },
    light_flywheel_crmo: { id: "light_flywheel_crmo", name: "Volante de Inercia Aligerado CrMo", icon: "💿", category: "accel_traction", rarity: "uncommon", desc: "Subidas de vueltas instantáneas al acelerar", costCr: 620 },
    final_drive_short_gear: { id: "final_drive_short_gear", name: "Grupo Cónico Corto Rápido 4.44", icon: "⚙️", category: "accel_traction", rarity: "uncommon", desc: "Aceleración demoledora a costa de velocidad punta", costCr: 590 },

    // Rara (Tier 3 • Capítulo 3 Desierto)
    gearbox_cogs: { id: "gearbox_cogs", name: "Caja de Cambios Secuencial Quaife", icon: "⚙️", category: "accel_traction", rarity: "rare", desc: "Engranajes rectos para cambio de marcha en 30 milisegundos", costCr: 1300 },
    carbon_driveshaft: { id: "carbon_driveshaft", name: "Árbol de Transmisión de Carbono", icon: "🥢", category: "accel_traction", rarity: "rare", desc: "Eje de transmisión peso pluma que absorbe picos de par", costCr: 1350 },
    launch_control_module: { id: "launch_control_module", name: "Módulo de Salida Launch Control 2-Step", icon: "🚀", category: "accel_traction", rarity: "rare", desc: "Salidas perfectas desde parado sin patinaje de neumáticos", costCr: 1280 },

    // Épica (Tier 4 • Capítulo 4 Pro)
    sequential_dogbox: { id: "sequential_dogbox", name: "Caja Secuencial Holinger 6-Vel", icon: "🕹️", category: "accel_traction", rarity: "epic", desc: "Cambios de marcha sin pisar embrague en 25ms", costCr: 2500 },
    triple_plate_clutch: { id: "triple_plate_clutch", name: "Embrague Triple-Disco Tilton Carbon", icon: "🔘", category: "accel_traction", rarity: "epic", desc: "Capaz de transferir hasta 1.500 Nm de par motor", costCr: 2600 },
    pneumatic_paddle_shifters: { id: "pneumatic_paddle_shifters", name: "Levas Neumáticas Magneti Marelli", icon: "🎮", category: "accel_traction", rarity: "epic", desc: "Actuador neumático que engrana marchas por aire comprimido", costCr: 2550 },

    // Legendaria (Tier 5 • Capítulo 5 Leyendas Mundial)
    f1_dual_clutch_transaxle: { id: "f1_dual_clutch_transaxle", name: "Transmisión Transaxle Dual-Clutch F1", icon: "🚀", category: "accel_traction", rarity: "legendary", desc: "Cero interrupción de empuje y levas magnéticas de titanio", costCr: 5800 },
    vectoring_ediff: { id: "vectoring_ediff", name: "Diferencial Vectorial E-Diff Activo", icon: "⚡", category: "accel_traction", rarity: "legendary", desc: "Vectorización de par activa por rueda para rotación milimétrica", costCr: 6200 },
    carbon_matrix_differential: { id: "carbon_matrix_differential", name: "Diferencial de Discos Matriz de Carbono", icon: "💎", category: "accel_traction", rarity: "legendary", desc: "Tracción total simétrica que devora las curvas rápidas", costCr: 6100 },

    // -------------------------------------------------------------
    // 5. AERODINÁMICA & DOWNFORCE (aero_lightness)
    // -------------------------------------------------------------
    // Común (Tier 1 • Capítulo 1 Rookie)
    carbon_wing: { id: "carbon_wing", name: "Alerón de Carbono GT", icon: "🪽", category: "aero_lightness", rarity: "common", desc: "Carga aerodinámica vertical que pega el tren trasero a la pista", costCr: 300 },
    hood_louvers_aero: { id: "hood_louvers_aero", name: "Branquias de Evacuación Capó", icon: "🪟", category: "aero_lightness", rarity: "common", desc: "Reduce la sustentación de morro evacuando calor y presión", costCr: 310 },
    roof_vortex_generator: { id: "roof_vortex_generator", name: "Generador de Vórtices Shark-Fin", icon: "🦈", category: "aero_lightness", rarity: "common", desc: "Micro-aletas en techo que dirigen flujo de aire limpio al alerón", costCr: 280 },

    // Infrecuente (Tier 2 • Capítulo 2 Clubman)
    front_splitter: { id: "front_splitter", name: "Splitter Delantero Venturi", icon: "🛡️", category: "aero_lightness", rarity: "uncommon", desc: "Efecto suelo que canaliza el flujo de aire bajo el chasis", costCr: 550 },
    rear_diffuser_race: { id: "rear_diffuser_race", name: "Difusor Trasero Multicanal GT3", icon: "🪜", category: "aero_lightness", rarity: "uncommon", desc: "Acelera el flujo inferior succionando el coche al suelo", costCr: 590 },
    carbon_side_skirts: { id: "carbon_side_skirts", name: "Taloneras Aerodinámicas de Carbono", icon: "🛹", category: "aero_lightness", rarity: "uncommon", desc: "Sellado aerodinámico inferior para impedir entrada de turbulencias", costCr: 560 },

    // Rara (Tier 3 • Capítulo 3 Desierto)
    monocoque_frame: { id: "monocoque_frame", name: "Chasis Monocasco Carbono", icon: "🪶", category: "aero_lightness", rarity: "rare", desc: "Estructura de fibra de carbono peso pluma de competición", costCr: 1400 },
    canards_vortex: { id: "canards_vortex", name: "Generadores de Vórtices Canards", icon: "🔪", category: "aero_lightness", rarity: "rare", desc: "Aletas laterales que sellan aerodinámicamente el lateral", costCr: 1350 },
    titanium_exhaust_system: { id: "titanium_exhaust_system", name: "Escape Completo Akrapovic Titanio", icon: "🎺", category: "aero_lightness", rarity: "rare", desc: "Ahorra 18 kg de peso suspendido y optimiza flujo aerodinámico", costCr: 1380 },

    // Épica (Tier 4 • Capítulo 4 Pro)
    flat_floor_undertray: { id: "flat_floor_undertray", name: "Fondo Plano de Carbono con Túneles Venturi", icon: "🛹", category: "aero_lightness", rarity: "epic", desc: "Efecto suelo integral que duplica el agarre en curva rápida", costCr: 2400 },
    polycarbonate_windows: { id: "polycarbonate_windows", name: "Lunas de Policarbonato Lexan", icon: "🪟", category: "aero_lightness", rarity: "epic", desc: "Aligera 30 kg en la parte alta para bajar el centro de masas", costCr: 2300 },
    carbon_fiber_doors: { id: "carbon_fiber_doors", name: "Puertas Ultraligeras de Carbono Seco", icon: "🚪", category: "aero_lightness", rarity: "epic", desc: "Reducción masiva de 45 kg en la cintura del vehículo", costCr: 2450 },

    // Legendaria (Tier 5 • Capítulo 5 Leyendas Mundial)
    active_drs_wing: { id: "active_drs_wing", name: "Alerón Activo con Sistema DRS F1", icon: "🪽", category: "aero_lightness", rarity: "legendary", desc: "Abre flap en rectas para +25 km/h y actúa como aerofreno", costCr: 5900 },
    lmp1_aero_body: { id: "lmp1_aero_body", name: "Carrocería Completa Fibra de Carbono LMP1", icon: "👑", category: "aero_lightness", rarity: "legendary", desc: "Estructura autoclave de 900 kg con aerodinámica de Le Mans", costCr: 6500 },
    active_ground_effect_fan: { id: "active_ground_effect_fan", name: "Turbina de Efecto Suelo Brabham Fan-Car", icon: "🌀", category: "aero_lightness", rarity: "legendary", desc: "Succión activa por ventilador de turbina para adherencia ilimitada", costCr: 6600 }
};

// Ramas de Mejora Específicas: Stage 1 (Común), Stage 2 (Infrecuente), Stage 3 (Rara), Stage 4 (Épica), Stage 5 (Legendaria)
const STAT_UPGRADE_BRANCHES = {
    speed_power: {
        id: "speed_power",
        name: "Motor & Velocidad Punta",
        icon: "🏁",
        statsKeyText: "Velocidad (+1) y Potencia (+1)",
        statsBoosted: { velocidad: 1, potencia: 1 },
        desc: "Aumenta la velocidad máxima y la fuerza del motor mediante piezas de combustión",
        maxLevel: 5,
        stages: [
            // Stage 1: Requiere piezas COMUNES (Cap. 1 Rookie)
            { reqs: { spark_plugs: 2, air_filter_sport: 1 }, cr: 600, gems: 0, rarityRequired: "common" },
            // Stage 2: Requiere piezas INFRECUENTES (Cap. 2 Clubman)
            { reqs: { cylinders: 2, fuel_injectors_high: 1 }, cr: 1400, gems: 0, rarityRequired: "uncommon" },
            // Stage 3: Requiere piezas RARAS (Cap. 3 Desierto)
            { reqs: { engine_block: 2, camshaft_racing: 1 }, cr: 2800, gems: 0, rarityRequired: "rare" },
            // Stage 4: Requiere piezas ÉPICAS (Cap. 4 Pro)
            { reqs: { turbocharger: 2, motec_ecu_pro: 1 }, cr: 5000, gems: 0, rarityRequired: "epic" },
            // Stage 5: Requiere piezas LEGENDARIAS (Cap. 5 Leyendas Mundial)
            { reqs: { billet_engine_v8: 1, water_meth_injection: 1 }, cr: 8000, gems: 0, rarityRequired: "legendary" }
        ]
    },
    braking: {
        id: "braking",
        name: "Sistema de Frenada",
        icon: "🛑",
        statsKeyText: "Frenada (+2)",
        statsBoosted: { frenada: 2 },
        desc: "Reduce drásticamente la distancia de frenado y permite apurar las curvas al límite",
        maxLevel: 5,
        stages: [
            // Stage 1: Común
            { reqs: { brake_pads: 2, brake_fluid_dot5: 1 }, cr: 550, gems: 0, rarityRequired: "common" },
            // Stage 2: Infrecuente
            { reqs: { brake_discs: 2, braided_brake_lines: 1 }, cr: 1200, gems: 0, rarityRequired: "uncommon" },
            // Stage 3: Rara
            { reqs: { brake_calipers: 2, ventilated_floating_discs: 1 }, cr: 2500, gems: 0, rarityRequired: "rare" },
            // Stage 4: Épica
            { reqs: { carbon_ceramic_calipers: 2, cooling_ducts_brakes: 1 }, cr: 4500, gems: 0, rarityRequired: "epic" },
            // Stage 5: Legendaria
            { reqs: { carbon_ceramic_brembo: 1, kers_f1_regen: 1 }, cr: 7500, gems: 0, rarityRequired: "legendary" }
        ]
    },
    handling_grip: {
        id: "handling_grip",
        name: "Agarre & Manejo en Curva",
        icon: "🏎️",
        statsKeyText: "Agarre (+1) y Manejo (+1)",
        statsBoosted: { agarre: 1, manejo: 1 },
        desc: "Optimiza la trazada en peraltes y evita deslizamientos involuntarios",
        maxLevel: 5,
        stages: [
            // Stage 1: Común
            { reqs: { slick_tires: 2, lowering_springs: 1 }, cr: 550, gems: 0, rarityRequired: "common" },
            // Stage 2: Infrecuente
            { reqs: { suspension_springs: 2, strut_brace_front: 1 }, cr: 1300, gems: 0, rarityRequired: "uncommon" },
            // Stage 3: Rara
            { reqs: { antiroll_bars: 2, adjustable_coilovers: 1 }, cr: 2600, gems: 0, rarityRequired: "rare" },
            // Stage 4: Épica
            { reqs: { michelin_cup_slicks: 2, pushrod_suspension: 1 }, cr: 4800, gems: 0, rarityRequired: "epic" },
            // Stage 5: Legendaria
            { reqs: { pirelli_f1_slicks: 1, monocoque_chassis_gt: 1 }, cr: 7800, gems: 0, rarityRequired: "legendary" }
        ]
    },
    accel_traction: {
        id: "accel_traction",
        name: "Aceleración & Tracción",
        icon: "🚀",
        statsKeyText: "Aceleración (+1) y Tracción (+1)",
        statsBoosted: { aceleracion: 1, traccion: 1 },
        desc: "Salida fulgurante en rectas y aceleración inmediata tras salir de las curvas",
        maxLevel: 5,
        stages: [
            // Stage 1: Común
            { reqs: { racing_clutch: 2, short_shifter_kit: 1 }, cr: 600, gems: 0, rarityRequired: "common" },
            // Stage 2: Infrecuente
            { reqs: { lsd_differential: 2, light_flywheel_crmo: 1 }, cr: 1400, gems: 0, rarityRequired: "uncommon" },
            // Stage 3: Rara
            { reqs: { gearbox_cogs: 2, carbon_driveshaft: 1 }, cr: 2800, gems: 0, rarityRequired: "rare" },
            // Stage 4: Épica
            { reqs: { sequential_dogbox: 2, triple_plate_clutch: 1 }, cr: 5000, gems: 0, rarityRequired: "epic" },
            // Stage 5: Legendaria
            { reqs: { f1_dual_clutch_transaxle: 1, vectoring_ediff: 1 }, cr: 8000, gems: 0, rarityRequired: "legendary" }
        ]
    },
    aero_lightness: {
        id: "aero_lightness",
        name: "Downforce & Ligereza",
        icon: "🪽",
        statsKeyText: "Downforce (+1) y Ligereza (+1)",
        statsBoosted: { downforce: 1, ligereza: 1 },
        desc: "Aligera la masa total del chasis y genera sustentación negativa para mayor estabilidad",
        maxLevel: 5,
        stages: [
            // Stage 1: Común
            { reqs: { carbon_wing: 1, hood_louvers_aero: 1 }, cr: 550, gems: 0, rarityRequired: "common" },
            // Stage 2: Infrecuente
            { reqs: { front_splitter: 1, rear_diffuser_race: 1 }, cr: 1300, gems: 0, rarityRequired: "uncommon" },
            // Stage 3: Rara
            { reqs: { monocoque_frame: 1, canards_vortex: 1 }, cr: 2600, gems: 0, rarityRequired: "rare" },
            // Stage 4: Épica
            { reqs: { flat_floor_undertray: 1, polycarbonate_windows: 1 }, cr: 4800, gems: 0, rarityRequired: "epic" },
            // Stage 5: Legendaria
            { reqs: { active_drs_wing: 1, lmp1_aero_body: 1 }, cr: 7800, gems: 0, rarityRequired: "legendary" }
        ]
    }
};

const DEFAULT_PARTS_INVENTORY = {
    // Comunes
    spark_plugs: 16,
    air_filter_sport: 10,
    ecu_chip_stage1: 8,
    throttle_body_sport: 8,
    brake_pads: 14,
    brake_fluid_dot5: 10,
    brake_bias_valve: 8,
    slick_tires: 16,
    lowering_springs: 10,
    wheel_spacers_hubcentric: 8,
    racing_clutch: 12,
    short_shifter_kit: 10,
    polyurethane_trans_mounts: 8,
    carbon_wing: 8,
    hood_louvers_aero: 8,
    roof_vortex_generator: 8,

    // Infrecuentes
    cylinders: 10,
    fuel_injectors_high: 6,
    exhaust_manifold_sport: 6,
    fuel_pump_highflow: 5,
    brake_discs: 10,
    braided_brake_lines: 6,
    master_cylinder_race: 5,
    suspension_springs: 10,
    strut_brace_front: 6,
    camber_plates_adjustable: 5,
    lsd_differential: 8,
    light_flywheel_crmo: 6,
    final_drive_short_gear: 5,
    front_splitter: 8,
    rear_diffuser_race: 6,
    carbon_side_skirts: 5,

    // Raras
    engine_block: 5,
    camshaft_racing: 4,
    intercooler_forge: 4,
    blow_off_valve_hks: 3,
    brake_calipers: 5,
    ventilated_floating_discs: 4,
    titanium_brake_shims: 3,
    antiroll_bars: 5,
    adjustable_coilovers: 4,
    polyurethane_bushings_kit: 3,
    gearbox_cogs: 5,
    carbon_driveshaft: 4,
    launch_control_module: 3,
    monocoque_frame: 4,
    canards_vortex: 4,
    titanium_exhaust_system: 3,

    // Épicas
    turbocharger: 3,
    motec_ecu_pro: 2,
    titanium_valves_springs: 2,
    carbon_ceramic_calipers: 3,
    cooling_ducts_brakes: 2,
    carbon_cooling_fans: 2,
    michelin_cup_slicks: 3,
    pushrod_suspension: 2,
    magnesium_forged_wheels: 2,
    sequential_dogbox: 3,
    triple_plate_clutch: 2,
    pneumatic_paddle_shifters: 2,
    flat_floor_undertray: 3,
    polycarbonate_windows: 2,
    carbon_fiber_doors: 2,

    // Legendarias
    billet_engine_v8: 1,
    water_meth_injection: 1,
    twin_turbo_hybrid_f1: 1,
    carbon_ceramic_brembo: 1,
    kers_f1_regen: 1,
    f1_brake_by_wire: 1,
    pirelli_f1_slicks: 1,
    monocoque_chassis_gt: 1,
    active_magnetic_dampers: 1,
    f1_dual_clutch_transaxle: 1,
    vectoring_ediff: 1,
    carbon_matrix_differential: 1,
    active_drs_wing: 1,
    lmp1_aero_body: 1,
    active_ground_effect_fan: 1
};

// Packs de Piezas para la Tienda Oficial Web3
const SHOP_PARTS_KITS = {
    kit_engine: {
        id: "kit_engine",
        name: "Pack de Motor Pro",
        icon: "🔌",
        desc: "Contiene: 6 Bujías de Iridio, 3 Cilindros y 1 Bloque Motor",
        costCr: 2500,
        parts: { spark_plugs: 6, cylinders: 3, engine_block: 1 }
    },
    kit_brakes: {
        id: "kit_brakes",
        name: "Pack de Frenada Brembo",
        icon: "🛑",
        desc: "Contiene: 6 Pastillas Cerámicas, 3 Discos Perforados y 1 Pinza Brembo",
        costCr: 2200,
        parts: { brake_pads: 6, brake_discs: 3, brake_calipers: 1 }
    },
    kit_handling: {
        id: "kit_handling",
        name: "Pack de Chasis & Slicks",
        icon: "🏎️",
        desc: "Contiene: 6 Neumáticos Slicks, 3 Muelles y 1 Barra Estabilizadora",
        costCr: 2400,
        parts: { slick_tires: 6, suspension_springs: 3, antiroll_bars: 1 }
    },
    kit_transmission: {
        id: "kit_transmission",
        name: "Pack de Transmisión LSD",
        icon: "🚀",
        desc: "Contiene: 6 Embragues, 3 Diferenciales y 1 Caja Secuencial",
        costCr: 2600,
        parts: { racing_clutch: 6, lsd_differential: 3, gearbox_cogs: 1 }
    },
    kit_aero: {
        id: "kit_aero",
        name: "Pack Aero de Carbono",
        icon: "🪽",
        desc: "Contiene: 3 Alerones, 3 Splitters y 1 Chasis Monocasco",
        costCr: 2800,
        parts: { carbon_wing: 3, front_splitter: 3, monocoque_frame: 1 }
    }
};

// Configuración retrocompatible de piezas
const UPGRADE_PARTS_CONFIG = {
    ecu: { nameKey: "parts_ecu", icon: "🔌", maxStage: 5, boosts: { potencia: 1, turbo: 1 } },
    tires: { nameKey: "parts_tires", icon: "🏎️", maxStage: 5, boosts: { agarre: 1, traccion: 1 } },
    brakes: { nameKey: "parts_brakes", icon: "🛑", maxStage: 5, boosts: { frenada: 2 } },
    turbo: { nameKey: "parts_turbo", icon: "🌪️", maxStage: 5, boosts: { aceleracion: 1, velocidad: 1 } },
    chassis: { nameKey: "parts_chassis", icon: "🪶", maxStage: 5, boosts: { ligereza: 1, downforce: 1 } }
};

// Cálculo dinámico de rendimiento de un coche basado en sus 10 estadísticas y piezas equipadas
function calculateCarPerformance(car) {
    const rawStats = car.stats || makeStats(1,1,1,1,1,1,1,1,1,1);
    const parts = car.parts || {};
    const level = car.level || 1;

    // Bonificación de nivel: +1 punto distribuido por cada 2 niveles superados
    const lvlBonus = Math.floor((level - 1) / 2);

    // Puntos de Hito de Maestría por Nivel (Cada 10 niveles: +1 punto personalizado con tokens $CR)
    const mStats = car.milestoneStats || {};

    // Integración de las 5 ramas de piezas (con retrocompatibilidad)
    const speedPowerLvl = parts.speed_power || Math.max(parts.turbo || 0, parts.ecu || 0);
    const brakingLvl = parts.braking || parts.brakes || 0;
    const handlingGripLvl = parts.handling_grip || Math.max(parts.tires || 0, parts.brakes || 0);
    const accelTractionLvl = parts.accel_traction || Math.max(parts.turbo || 0, parts.tires || 0);
    const aeroLightnessLvl = parts.aero_lightness || parts.chassis || 0;

    const eff = {
        potencia: (rawStats.potencia || 1) + speedPowerLvl + lvlBonus + (mStats.potencia || 0),
        velocidad: (rawStats.velocidad || 1) + speedPowerLvl + lvlBonus + (mStats.velocidad || 0),
        aceleracion: (rawStats.aceleracion || 1) + accelTractionLvl + lvlBonus + (mStats.aceleracion || 0),
        agarre: (rawStats.agarre || 1) + handlingGripLvl + lvlBonus + (mStats.agarre || 0),
        frenada: (rawStats.frenada || 1) + (brakingLvl * 2) + lvlBonus + (mStats.frenada || 0),
        manejo: (rawStats.manejo || 1) + handlingGripLvl + lvlBonus + (mStats.manejo || 0),
        turbo: (rawStats.turbo || 1) + speedPowerLvl + lvlBonus + (mStats.turbo || 0),
        downforce: (rawStats.downforce || 1) + aeroLightnessLvl + lvlBonus + (mStats.downforce || 0),
        traccion: (rawStats.traccion || 1) + accelTractionLvl + lvlBonus + (mStats.traccion || 0),
        ligereza: (rawStats.ligereza || 1) + aeroLightnessLvl + lvlBonus + (mStats.ligereza || 0)
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

// Cajas Misteriosas NFT (Loot Boxes) calibradas para máxima variedad de entregas
const NFT_CRATES = {
    bronze: {
        id: "bronze",
        nameKey: "crate_bronze_title",
        cost: 1000,
        currency: "credits", // $CR (~1.00 USDT)
        odds: { common: 0.55, uncommon: 0.35, rare: 0.09, legendary: 0.01 },
        badgeColor: 0xcd7f32
    },
    silver: {
        id: "silver",
        nameKey: "crate_silver_title",
        cost: 5000,
        currency: "credits", // $CR (~5.00 USDT)
        odds: { common: 0.30, uncommon: 0.45, rare: 0.22, legendary: 0.03 },
        badgeColor: 0xc0c0c0
    },
    gold: {
        id: "gold",
        nameKey: "crate_gold_title",
        cost: 25000,
        currency: "credits", // $CR (~25.00 USDT)
        odds: { common: 0.08, uncommon: 0.32, rare: 0.45, legendary: 0.15 },
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

    const starterColor = NFT_CAR_COLORS.find(c => c.name.includes("Grey")) || NFT_CAR_COLORS[0];
    const starterModel = NFT_CAR_MODELS.find(m => m.id === "s_01") || NFT_CAR_MODELS[0];
    const starterCar = {
        instanceId: "inst_starter_01",
        modelId: starterModel.id,
        name: starterModel.name,
        rarity: starterModel.rarity || "starter",
        isNft: false,
        visualId: starterModel.visualId || 23,
        stats: { ...starterModel.stats },
        level: 1,
        xp: 0,
        xpNeeded: 150,
        energy: 5,
        maxEnergy: 5,
        lastEnergyUpdate: Date.now(),
        parts: { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 },
        colorName: starterColor.name,
        colorHex: starterColor.hex,
        tint: starterColor.tint,
        mintNumber: 0,
        tokenHash: "NO-NFT (SERIE)",
        sprite: starterModel.sprite || "car_grey",
        obtainedAt: Date.now()
    };

    if (!data || typeof data.credits !== 'number' || typeof data.gems !== 'number' || !Array.isArray(data.garage) || data.garage.length === 0) {
        data = {
            credits: (data && typeof data.credits === 'number') ? data.credits : 100,
            gems: (data && typeof data.gems === 'number') ? data.gems : 10,
            equippedInstanceId: (data && data.equippedInstanceId) ? data.equippedInstanceId : starterCar.instanceId,
            garage: (data && Array.isArray(data.garage) && data.garage.length > 0) ? data.garage : [starterCar]
        };
        saveNftUserData(data);
    }

    if (typeof data.credits !== 'number') data.credits = 100;
    if (typeof data.gems !== 'number') data.gems = 10;
    if (!Array.isArray(data.garage) || data.garage.length === 0) data.garage = [starterCar];
    if (!data.equippedInstanceId && data.garage[0]) data.equippedInstanceId = data.garage[0].instanceId;
    if (typeof data.nitros !== 'number') data.nitros = 2;

    // Nombre de piloto personalizado del usuario
    if (!data.pilotName || typeof data.pilotName !== 'string' || !data.pilotName.trim()) {
        let tgName = null;
        try {
            const tgUser = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) ? window.Telegram.WebApp.initDataUnsafe.user : null;
            if (tgUser) {
                if (tgUser.username) tgName = '@' + tgUser.username;
                else if (tgUser.first_name) tgName = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
            }
        } catch(e) {}
        data.pilotName = tgName || (typeof localStorage !== 'undefined' && localStorage.getItem('apex_pilot_name')) || 'PILOTO GT #44';
    }

    // Inventario de Piezas y Recambios de Taller del Jugador
    if (!data.partsInventory || typeof data.partsInventory !== 'object') {
        data.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
    }
    Object.keys(DEFAULT_PARTS_INVENTORY).forEach(pk => {
        if (typeof data.partsInventory[pk] !== 'number' || data.partsInventory[pk] < 5) {
            data.partsInventory[pk] = Math.max(data.partsInventory[pk] || 0, DEFAULT_PARTS_INVENTORY[pk]);
        }
    });

    // Pase de Temporada (Season Pass: "Neon Apex - Temporada 1")
    if (!data.seasonPass || typeof data.seasonPass !== 'object') {
        data.seasonPass = {
            seasonName: "Temporada 1: Neon Apex",
            level: 2,
            xp: 120,
            xpNeeded: 200,
            claimedTiers: [1],
            dailyMissions: [
                { id: "m_races", name: "Disputar 2 carreras oficiales", progress: 2, target: 2, xp: 60, completed: true, claimed: false },
                { id: "m_slipstream", name: "Adelantar con Rebufo Aerodinámico", progress: 2, target: 2, xp: 80, completed: true, claimed: true },
                { id: "m_drift", name: "Derrapar en horquillas con Freno de Mano", progress: 3, target: 3, xp: 70, completed: true, claimed: false },
                { id: "m_speed", name: "Alcanzar 350 km/h en recta", progress: 0, target: 1, xp: 90, completed: false, claimed: false }
            ]
        };
    }

    // Asegurar retrocompatibilidad para coches existentes sin los 10 atributos o piezas
    data.garage.forEach(c => {
        if (!c.visualId) {
            const m = NFT_CAR_MODELS.find(mod => mod.id === c.modelId);
            c.visualId = m ? m.visualId : ((hashString(c.name || c.id) % 24) + 1);
        }
        if (!c.stats || typeof c.stats.potencia !== 'number') {
            const m = NFT_CAR_MODELS.find(mod => mod.id === c.modelId || mod.name === c.name) || starterModel;
            c.stats = { ...m.stats };
        }
        if (!c.parts) c.parts = { speed_power: 0, braking: 0, handling_grip: 0, accel_traction: 0, aero_lightness: 0 };
        if (typeof c.parts.speed_power !== 'number') {
            c.parts.speed_power = Math.max(c.parts.turbo || 0, c.parts.ecu || 0);
            c.parts.braking = c.parts.brakes || 0;
            c.parts.handling_grip = Math.max(c.parts.tires || 0, c.parts.brakes || 0);
            c.parts.accel_traction = Math.max(c.parts.turbo || 0, c.parts.tires || 0);
            c.parts.aero_lightness = c.parts.chassis || 0;
        }
        if (!c.level) c.level = 1;
        if (typeof c.xp !== 'number') c.xp = 0;
        if (!c.xpNeeded) c.xpNeeded = c.level * 250;

        // Inicialización y regeneración pasiva horaria de energía según rareza del vehículo
        const correctMax = getMaxEnergyForCar(c);
        if (typeof c.maxEnergy === 'undefined' || (c.maxEnergy === 10 && c.rarity !== 'legendary')) {
            c.maxEnergy = correctMax;
        }
        if (typeof c.energy === 'undefined') c.energy = c.maxEnergy;
        if (c.energy > c.maxEnergy) c.energy = c.maxEnergy;
        if (!c.lastEnergyUpdate) c.lastEnergyUpdate = Date.now();
        refreshCarEnergy(c);
    });

    if (!data.wagerStats || typeof data.wagerStats !== 'object') {
        data.wagerStats = {
            totalRaces: 0,
            wins: 0,
            podiums: 0,
            totalWon: 0,
            burnedTokens: 0,
            devFees: 0,
            rewardsFees: 0
        };
    }

    // Código de invitación único del usuario y estadísticas de referidos
    let needsSave = false;
    if (!data.referralCode || typeof data.referralCode !== 'string') {
        const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        data.referralCode = 'APEX-' + randStr;
        needsSave = true;
    }
    if (typeof data.referralsCount !== 'number') {
        data.referralsCount = 0;
        needsSave = true;
    }
    if (!Array.isArray(data.referralHistory)) {
        data.referralHistory = [];
        needsSave = true;
    }
    if (typeof data.invitedBy === 'undefined') {
        data.invitedBy = null;
        needsSave = true;
    }
    if (typeof data.email === 'undefined') {
        data.email = null;
        needsSave = true;
    }
    if (typeof data.emailLinkedRewardClaimed !== 'boolean') {
        data.emailLinkedRewardClaimed = false;
        needsSave = true;
    }
    if (needsSave) {
        saveNftUserData(data);
    }

    return data;
}

// Capacidad máxima de energía individual según el tipo y rareza del vehículo
function getMaxEnergyForCar(car) {
    if (!car) return 6;
    const rarity = car.rarity || 'common';
    if (rarity === 'starter') return 5;
    if (rarity === 'common') return 6;
    if (rarity === 'uncommon') return 7;
    if (rarity === 'rare') return 8;
    if (rarity === 'legendary') return 10;
    return 6;
}
if (typeof window !== 'undefined') window.getMaxEnergyForCar = getMaxEnergyForCar;

// Regenerar pasivamente 1 punto de energía cada 1 hora (3600 segundos) para el coche específico
function refreshCarEnergy(car) {
    if (!car) return;
    const maxE = getMaxEnergyForCar(car);
    if (typeof car.maxEnergy === 'undefined' || (car.maxEnergy === 10 && car.rarity !== 'legendary')) {
        car.maxEnergy = maxE;
    }
    if (typeof car.energy === 'undefined') car.energy = car.maxEnergy;
    if (car.energy > car.maxEnergy) car.energy = car.maxEnergy;
    if (!car.lastEnergyUpdate) car.lastEnergyUpdate = Date.now();

    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;
    const elapsed = now - car.lastEnergyUpdate;
    if (elapsed >= ONE_HOUR && car.energy < car.maxEnergy) {
        const pointsGained = Math.floor(elapsed / ONE_HOUR);
        car.energy = Math.min(car.maxEnergy, car.energy + pointsGained);
        if (car.energy >= car.maxEnergy) {
            car.lastEnergyUpdate = now;
        } else {
            car.lastEnergyUpdate += pointsGained * ONE_HOUR;
        }
    }
}

// Tiempo restante para el siguiente punto de energía
function getTimeUntilNextEnergy(car) {
    refreshCarEnergy(car);
    if (!car || car.energy >= (car.maxEnergy || 10)) return null;
    const ONE_HOUR = 3600 * 1000;
    const elapsed = Date.now() - (car.lastEnergyUpdate || Date.now());
    const remainingMs = Math.max(0, ONE_HOUR - (elapsed % ONE_HOUR));
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

function saveNftUserData(data) {
    try {
        localStorage.setItem('apex_web3_garage_save', JSON.stringify(data));
    } catch(e) {}
}

// Obtener y cambiar nombre del piloto con persistencia Web3/Local
function getPlayerName() {
    try {
        const u = loadNftUserData();
        if (u && u.pilotName && typeof u.pilotName === 'string' && u.pilotName.trim()) {
            return u.pilotName.trim();
        }
        if (typeof localStorage !== 'undefined') {
            const local = localStorage.getItem('apex_pilot_name');
            if (local && local.trim()) return local.trim();
        }
    } catch(e) {}
    return 'PILOTO GT #44';
}

function setPlayerName(newName) {
    if (!newName) return false;
    let clean = String(newName).trim().substring(0, 24);
    if (!clean) return false;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('apex_pilot_name', clean);
        }
        const u = loadNftUserData();
        if (u) {
            u.pilotName = clean;
            saveNftUserData(u);
        }
        return true;
    } catch(e) {
        return false;
    }
}

// Catálogo de Baterías de Energía en la Tienda Oficial ($CR Tokens)
const SHOP_ENERGY_PACKS = {
    pack_energy_boost: {
        id: 'pack_energy_boost',
        name: 'Batería Boost (+2⚡)',
        energy: 2,
        costCr: 200,
        icon: '⚡',
        desc: 'Recarga rápida de 2 puntos de energía para salir a pista de inmediato'
    },
    pack_energy_super: {
        id: 'pack_energy_super',
        name: 'Supercargador Apex (+5⚡)',
        energy: 5,
        costCr: 450,
        icon: '🔋',
        desc: 'Inyección de 5 puntos de energía para tandas largas de competición'
    },
    pack_energy_full: {
        id: 'pack_energy_full',
        name: 'Batería 100% Full (+10⚡)',
        energy: 10,
        costCr: 800,
        icon: '⚡⚡',
        desc: 'Recarga total al 100% de la capacidad de tu vehículo NFT'
    }
};

// Comprar pack de energía con tokens $CR del juego
function buyEnergyPack(packKey, targetInstanceId = null) {
    const pack = SHOP_ENERGY_PACKS[packKey];
    if (!pack) return { success: false, reason: "Pack de energía no válido" };

    const userData = loadNftUserData();
    if (userData.credits < pack.costCr) return { success: false, reason: "credits_insufficient" };

    const carId = targetInstanceId || userData.equippedInstanceId || (userData.garage[0] && userData.garage[0].instanceId);
    const car = (userData.garage || []).find(c => c.instanceId === carId);
    if (!car) return { success: false, reason: "Coche no encontrado" };

    refreshCarEnergy(car);
    if (car.energy >= (car.maxEnergy || 10)) {
        return { success: false, reason: "energy_already_full" };
    }

    userData.credits -= pack.costCr;
    car.energy = Math.min(car.maxEnergy || 10, (car.energy || 0) + pack.energy);
    car.lastEnergyUpdate = Date.now();

    saveNftUserData(userData);
    return {
        success: true,
        pack: pack,
        car: car,
        newEnergy: car.energy,
        remainingCredits: userData.credits
    };
}

// Reclamar +1⚡ de energía al ver un anuncio
function rechargeEnergyWithAd(instanceId = null) {
    const userData = loadNftUserData();
    const carId = instanceId || userData.equippedInstanceId || (userData.garage[0] && userData.garage[0].instanceId);
    const car = (userData.garage || []).find(c => c.instanceId === carId);
    if (!car) return { success: false, reason: "Coche no encontrado" };

    refreshCarEnergy(car);
    if (car.energy >= (car.maxEnergy || 10)) {
        return { success: false, reason: "energy_already_full" };
    }

    car.energy = Math.min(car.maxEnergy || 10, (car.energy || 0) + 1);
    car.lastEnergyUpdate = Date.now();

    saveNftUserData(userData);
    return {
        success: true,
        car: car,
        newEnergy: car.energy
    };
}

// Obtener total de cápsulas de Nitro N2O en inventario
function getAvailableNitros() {
    const userData = loadNftUserData();
    if (typeof userData.nitros !== 'number') {
        userData.nitros = 2;
        saveNftUserData(userData);
    }
    return userData.nitros;
}

// Reclamar +1 Nitro al ver un anuncio (1 Anuncio = 1 Nitro)
function addNitroWithAd() {
    const userData = loadNftUserData();
    if (typeof userData.nitros !== 'number') userData.nitros = 2;
    userData.nitros += 1;
    saveNftUserData(userData);
    return {
        success: true,
        newNitros: userData.nitros
    };
}

// Comprar cápsulas de Nitro con tokens ($CR)
function buyNitrosWithTokens(amount = 1) {
    const userData = loadNftUserData();
    if (typeof userData.nitros !== 'number') userData.nitros = 2;
    const costPerUnit = 50; // 0.05 USDT
    const cost = amount === 20 ? 700 : (amount === 5 ? 200 : amount * costPerUnit);
    if (userData.credits < cost) {
        return { success: false, reason: "credits_insufficient", cost: cost };
    }
    userData.credits -= cost;
    userData.nitros += amount;
    userData.burnedTokens = (userData.burnedTokens || 0) + Math.round(cost * 0.20);
    saveNftUserData(userData);
    return {
        success: true,
        amount: amount,
        cost: cost,
        newNitros: userData.nitros,
        remainingCredits: userData.credits
    };
}

// Consumir 1 Nitro en carrera
function consumeNitroFromInventory() {
    const userData = loadNftUserData();
    if (typeof userData.nitros !== 'number') userData.nitros = 2;
    if (userData.nitros > 0) {
        userData.nitros -= 1;
        saveNftUserData(userData);
        return true;
    }
    return false;
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
        visualId: modelDef.visualId || ((hashString(modelDef.id || modelDef.name) % 24) + 1),
        desc: modelDef.desc,
        stats: { ...modelDef.stats },
        level: 1,
        xp: 0,
        xpNeeded: 250,
        energy: getMaxEnergyForCar(modelDef),
        maxEnergy: getMaxEnergyForCar(modelDef),
        lastEnergyUpdate: Date.now(),
        parts: { speed_power: 0, braking: 0, handling_grip: 0, accel_traction: 0, aero_lightness: 0 },
        colorName: chosenColor.name,
        colorHex: chosenColor.hex,
        tint: chosenColor.tint,
        mintNumber: mintNum,
        tokenHash: tokenHash,
        sprite: modelDef.sprite,
        obtainedAt: Date.now()
    };
}

// Abrir una Caja Misteriosa NFT con probabilidades calibradas y botín de piezas de taller
function openMysteryCrate(crateKey) {
    const crate = NFT_CRATES[crateKey];
    if (!crate) return { success: false, reason: "Caja no válida" };

    const userData = loadNftUserData();
    if (crate.currency === "credits") {
        if (userData.credits < crate.cost) return { success: false, reason: "credits_insufficient" };
        userData.credits -= crate.cost;
        userData.burnedTokens = (userData.burnedTokens || 0) + Math.round(crate.cost * 0.20);
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

    // Otorgar lote de piezas de taller de regalo con la caja
    const partsCount = crateKey === 'gold' ? 12 : (crateKey === 'silver' ? 6 : 3);
    const awardedParts = {};
    const catalogKeys = Object.keys(WORKSHOP_PIECES_CATALOG);
    if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
    for (let i = 0; i < partsCount; i++) {
        const pk = catalogKeys[Math.floor(Math.random() * catalogKeys.length)];
        awardedParts[pk] = (awardedParts[pk] || 0) + 1;
        userData.partsInventory[pk] = (userData.partsInventory[pk] || 0) + 1;
    }

    saveNftUserData(userData);

    return {
        success: true,
        car: mintedCar,
        crate: crate,
        awardedParts: awardedParts,
        remainingCredits: userData.credits,
        remainingGems: userData.gems,
        partsInventory: userData.partsInventory
    };
}

// Mejorar una rama de estadísticas del coche usando sus piezas mecánicas específicas requeridas
function upgradeCarStatBranch(instanceId, branchKey) {
    const branchCfg = STAT_UPGRADE_BRANCHES[branchKey];
    if (!branchCfg) return { success: false, reason: "Rama de mejora no válida" };

    const userData = loadNftUserData();
    const car = (userData.garage || []).find(c => c.instanceId === instanceId);
    if (!car) return { success: false, reason: "Coche no encontrado" };

    if (!car.parts) car.parts = { speed_power: 0, braking: 0, handling_grip: 0, accel_traction: 0, aero_lightness: 0 };
    const curLvl = car.parts[branchKey] || 0;
    if (curLvl >= branchCfg.maxLevel) return { success: false, reason: "¡Nivel máximo alcanzado en esta rama!" };

    const stageCfg = branchCfg.stages[curLvl];
    if (!stageCfg) return { success: false, reason: "Etapa no configurada" };

    // 1. Verificar créditos y gemas
    if (userData.credits < stageCfg.cr) return { success: false, reason: "credits_insufficient" };
    if (userData.gems < stageCfg.gems) return { success: false, reason: "gems_insufficient" };

    // 2. Verificar piezas de taller requeridas
    if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
    for (const [partId, countNeeded] of Object.entries(stageCfg.reqs)) {
        const curCount = userData.partsInventory[partId] || 0;
        if (curCount < countNeeded) {
            const partInfo = WORKSHOP_PIECES_CATALOG[partId] || { name: partId };
            return {
                success: false,
                reason: `Te faltan ${partInfo.name} (${curCount}/${countNeeded})`
            };
        }
    }

    // 3. Consumir piezas del inventario y fondos
    for (const [partId, countNeeded] of Object.entries(stageCfg.reqs)) {
        userData.partsInventory[partId] -= countNeeded;
    }
    userData.credits -= stageCfg.cr;
    userData.gems -= stageCfg.gems;

    // 4. Aplicar mejora al coche
    car.parts[branchKey] = curLvl + 1;
    saveNftUserData(userData);

    return {
        success: true,
        car: car,
        branchKey: branchKey,
        newStage: car.parts[branchKey],
        remainingCredits: userData.credits,
        remainingGems: userData.gems,
        partsInventory: userData.partsInventory
    };
}

// Comprar un pack de piezas en la tienda
function buyPartsKit(kitKey) {
    const kit = SHOP_PARTS_KITS[kitKey];
    if (!kit) return { success: false, reason: "Pack no válido" };

    const userData = loadNftUserData();
    if (userData.credits < kit.costCr) return { success: false, reason: "credits_insufficient" };

    userData.credits -= kit.costCr;
    if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };

    for (const [partId, count] of Object.entries(kit.parts)) {
        userData.partsInventory[partId] = (userData.partsInventory[partId] || 0) + count;
    }

    saveNftUserData(userData);
    return {
        success: true,
        kit: kit,
        remainingCredits: userData.credits,
        partsInventory: userData.partsInventory
    };
}

// Retrocompatibilidad con función antigua
function upgradeCarPart(instanceId, partKey) {
    const map = {
        ecu: 'speed_power',
        turbo: 'speed_power',
        brakes: 'braking',
        tires: 'handling_grip',
        chassis: 'aero_lightness'
    };
    return upgradeCarStatBranch(instanceId, map[partKey] || 'speed_power');
}

// Añadir XP al coche actualmente equipado tras una carrera (hasta nivel 50)
function addXpToEquippedCar(xpAmount) {
    const userData = loadNftUserData();
    const car = userData.garage.find(c => c.instanceId === userData.equippedInstanceId) || userData.garage[0];
    if (!car) return null;

    if (!car.level) car.level = 1;
    if (typeof car.xp !== 'number') car.xp = 0;
    if (!car.xpNeeded) car.xpNeeded = car.level * 250;

    car.xp += xpAmount;
    let leveledUp = false;
    const oldLevel = car.level;

    // Límite de nivel aumentado a 50 para hitos de maestría
    while (car.xp >= car.xpNeeded && car.level < 50) {
        car.xp -= car.xpNeeded;
        car.level++;
        car.xpNeeded = car.level * 250;
        leveledUp = true;
    }

    // Comprobar si se ha alcanzado un nuevo hito de maestría (múltiplo de 10)
    let milestoneUnlocked = null;
    for (let m = 10; m <= 50; m += 10) {
        if (oldLevel < m && car.level >= m) {
            milestoneUnlocked = m;
        }
    }

    saveNftUserData(userData);
    return {
        leveledUp: leveledUp,
        newLevel: car.level,
        oldLevel: oldLevel,
        currentXp: car.xp,
        xpNeeded: car.xpNeeded,
        milestoneUnlocked: milestoneUnlocked
    };
}

// =========================================================================
// 8.1 HITOS DE MAESTRÍA POR NIVEL DE COCHE (CADA 10 NIVELES: +1 STAT A ELECCIÓN)
// =========================================================================
const VALID_CAR_STATS = [
    'potencia', 'velocidad', 'aceleracion', 'agarre', 'frenada',
    'manejo', 'turbo', 'downforce', 'traccion', 'ligereza'
];

function getCarMilestones(car) {
    if (!car) return [];
    const lvl = car.level || 1;
    const claimed = car.claimedMilestones || [];
    const milestones = [];
    for (let m = 10; m <= 50; m += 10) {
        const cost = (m / 10) * 1000;
        const isUnlocked = lvl >= m;
        const isClaimed = claimed.includes(m);
        milestones.push({
            level: m,
            costCr: cost,
            isUnlocked: isUnlocked,
            isClaimed: isClaimed,
            claimedStat: (car.milestoneStatChoices && car.milestoneStatChoices[m]) || null
        });
    }
    return milestones;
}

function getCarPendingMilestones(car) {
    if (!car) return [];
    return getCarMilestones(car).filter(m => m.isUnlocked && !m.isClaimed);
}

function claimCarMilestoneStat(instanceId, milestoneLevel, statName) {
    const userData = loadNftUserData();
    const car = (userData.garage || []).find(c => c.instanceId === instanceId);
    if (!car) return { success: false, reason: "car_not_found" };

    const mLevel = parseInt(milestoneLevel, 10);
    if (isNaN(mLevel) || mLevel % 10 !== 0 || mLevel < 10 || mLevel > 50) {
        return { success: false, reason: "invalid_milestone" };
    }

    if ((car.level || 1) < mLevel) {
        return { success: false, reason: "level_insufficient", requiredLevel: mLevel, currentLevel: car.level || 1 };
    }

    if (!car.claimedMilestones) car.claimedMilestones = [];
    if (car.claimedMilestones.includes(mLevel)) {
        return { success: false, reason: "milestone_already_claimed" };
    }

    if (!VALID_CAR_STATS.includes(statName)) {
        return { success: false, reason: "invalid_stat" };
    }

    // Coste escalonado en $CR: Nivel 10 -> 1.000 $CR, Nivel 20 -> 2.000 $CR, Nivel 30 -> 3.000 $CR, etc.
    const costCr = (mLevel / 10) * 1000;
    if ((userData.credits || 0) < costCr) {
        return { success: false, reason: "credits_insufficient", costCr: costCr, credits: userData.credits || 0 };
    }

    // Cobrar tokens $CR
    userData.credits -= costCr;
    car.claimedMilestones.push(mLevel);

    if (!car.milestoneStats) car.milestoneStats = {};
    car.milestoneStats[statName] = (car.milestoneStats[statName] || 0) + 1;

    if (!car.milestoneStatChoices) car.milestoneStatChoices = {};
    car.milestoneStatChoices[mLevel] = statName;

    // Recalcular rendimiento efectivo del coche
    const perf = calculateCarPerformance(car);

    saveNftUserData(userData);
    return {
        success: true,
        car: car,
        milestoneLevel: mLevel,
        chosenStat: statName,
        statValue: car.milestoneStats[statName],
        costCr: costCr,
        remainingCredits: userData.credits,
        newPerf: perf
    };
}

// Obtener el coche actualmente equipado
function getEquippedNftCar() {
    const userData = loadNftUserData();
    const equipped = userData.garage.find(c => c.instanceId === userData.equippedInstanceId);
    if (equipped) return equipped;
    return userData.garage[0];
}

// ===== RENDERIZADOR VECTORIAL DE VEHÍCULOS DE ALTA DEFINICIÓN (SVG) =====
function hexToRgba(hex, alpha) {
    hex = (hex || '#e53935').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustHex(hex, percent) {
    hex = (hex || '#e53935').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 255) + Math.round(255 * (percent / 100));
    let b = (num & 255) + Math.round(255 * (percent / 100));
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hashString(str) {
    let hash = 0;
    if (!str) return 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getCarArchetype(car) {
    if (!car) return 'lambo_wedge';
    const name = (car.name || '').toLowerCase();
    const id = (car.modelId || car.id || '').toLowerCase();

    // 1. Marcas y modelos específicos:
    if (name.includes('lambo') || name.includes('aventador') || name.includes('hurac') || name.includes('svj') || name.includes('venom')) {
        return 'lambo_wedge';
    }
    if (name.includes('ferrari') || name.includes('f40') || name.includes('sp3') || name.includes('daytona') || name.includes('488') || name.includes('corsa rosso') || name.includes('scuderia') || name.includes('la corsa') || name.includes('pista')) {
        return 'ferrari_corsa';
    }
    if (name.includes('porsche') || name.includes('911') || name.includes('carrera') || name.includes('gt3 rs') || name.includes('grello') || name.includes('boxer') || name.includes('stuttgart')) {
        return 'porsche_boxer';
    }
    if (name.includes('viper') || name.includes('mustang') || name.includes('rebel') || name.includes('z06') || name.includes('interceptor') || name.includes('mach')) {
        return 'viper_acr';
    }
    if (name.includes('mitsu') || name.includes('lancer') || name.includes('evo') || name.includes('impreza') || name.includes('integrale') || name.includes('rally evo')) {
        return 'rally_evo';
    }
    if (name.includes('supra') || name.includes('skyline') || name.includes('gt-r') || name.includes('r34') || name.includes('silvia') || name.includes('rx-7') || name.includes('fuji') || name.includes('drift')) {
        return 'jdm_supra';
    }
    if (name.includes('bugatti') || name.includes('bolide') || name.includes('veyron') || name.includes('chiron') || name.includes('pur sport') || name.includes('hyperion')) {
        return 'bugatti_w16';
    }
    if (name.includes('bentley') || name.includes('continental') || name.includes('falcon') || name.includes('eagle') || name.includes('superleggera')) {
        return 'bentley_gt3';
    }
    if (name.includes('pickup') || name.includes('cargo') || name.includes('dakar') || name.includes('raider') || name.includes('runner') || name.includes('trail') || name.includes('nevada') || name.includes('texas')) {
        return 'dakar_truck';
    }
    if (name.includes('speed 8') || name.includes('valkyrie') || name.includes('lmh') || name.includes('sarthe') || name.includes('prototype') || name.includes('le mans')) {
        return 'le_mans_proto';
    }
    if (name.includes('hatch') || name.includes('mini') || name.includes('cooper') || name.includes('yaris') || name.includes('metro') || name.includes('micro') || name.includes('swift') || name.includes('piccolo') || name.includes('spark')) {
        return 'hot_hatch';
    }
    if (name.includes('bavaria') || name.includes('m4') || name.includes('dtm') || name.includes('cupra') || name.includes('vantage') || name.includes('solaris') || name.includes('dame')) {
        return 'dtm_coupe';
    }

    const archetypes = [
        'lambo_wedge', 'ferrari_corsa', 'porsche_boxer', 'viper_acr',
        'rally_evo', 'jdm_supra', 'bugatti_w16', 'bentley_gt3',
        'hot_hatch', 'dakar_truck', 'le_mans_proto', 'dtm_coupe'
    ];
    const visual = car.visualId || ((hashString(name || id) % archetypes.length) + 1);
    return archetypes[(visual - 1) % archetypes.length];
}

function getCarPhotorealModelId(car) {
    if (!car) return 1;
    if (typeof car.visualId === 'number' && car.visualId >= 1 && car.visualId <= 24) return car.visualId;
    const name = (car.name || '').toLowerCase();
    const id = (car.modelId || car.id || '').toLowerCase();
    return (hashString(name || id) % 24) + 1;
}

// ===== RENDERIZADOR VECTORIAL DE COFRES NFT (SVG DE ALTA DEFINICIÓN) =====
function generateChestSvg(tier = 'bronze', width = 80, height = 70) {
    const t = (tier || 'bronze').toLowerCase();
    const uid = 'c_' + t + '_' + Math.floor(Math.random() * 100000);

    let baseColors, strapColors, lockColors, rimColors, glowColor, coreGlow;
    if (t === 'gold') {
        baseColors = ['#1a1005', '#2d1c07', '#452b0b', '#1a1005'];
        strapColors = ['#fef08a', '#facc15', '#eab308', '#a16207'];
        rimColors = ['#fde047', '#eab308', '#854d0e'];
        lockColors = ['#fffbeb', '#facc15', '#b45309'];
        glowColor = 'rgba(250, 204, 21, 0.45)';
        coreGlow = '#ffffff';
    } else if (t === 'silver') {
        baseColors = ['#0f172a', '#1e293b', '#334155', '#0f172a'];
        strapColors = ['#ffffff', '#e2e8f0', '#94a3b8', '#475569'];
        rimColors = ['#f8fafc', '#cbd5e1', '#64748b'];
        lockColors = ['#ffffff', '#00f5d4', '#0284c7'];
        glowColor = 'rgba(0, 245, 212, 0.45)';
        coreGlow = '#00f5d4';
    } else {
        // Bronze / Rookie
        baseColors = ['#2c1407', '#4a230c', '#683312', '#2c1407'];
        strapColors = ['#fed7aa', '#d97706', '#b45309', '#78350f'];
        rimColors = ['#fbb77a', '#c26214', '#78350f'];
        lockColors = ['#fef3c7', '#d97706', '#92400e'];
        glowColor = 'rgba(217, 119, 6, 0.45)';
        coreGlow = '#fbbf24';
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="${width}" height="${height}" class="rendered-chest-svg chest-tier-${t}" style="display: inline-block; vertical-align: middle; filter: drop-shadow(0 6px 12px ${glowColor});">
        <defs>
            <linearGradient id="baseGrad_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${baseColors[2]}"/>
                <stop offset="40%" stop-color="${baseColors[1]}"/>
                <stop offset="100%" stop-color="${baseColors[0]}"/>
            </linearGradient>
            <linearGradient id="lidGrad_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${baseColors[2]}"/>
                <stop offset="50%" stop-color="${baseColors[1]}"/>
                <stop offset="100%" stop-color="${baseColors[0]}"/>
            </linearGradient>
            <linearGradient id="strapGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${strapColors[0]}"/>
                <stop offset="35%" stop-color="${strapColors[1]}"/>
                <stop offset="75%" stop-color="${strapColors[2]}"/>
                <stop offset="100%" stop-color="${strapColors[3]}"/>
            </linearGradient>
            <linearGradient id="rimGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${rimColors[0]}"/>
                <stop offset="50%" stop-color="${rimColors[1]}"/>
                <stop offset="100%" stop-color="${rimColors[2]}"/>
            </linearGradient>
            <radialGradient id="lockGrad_${uid}" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stop-color="${lockColors[0]}"/>
                <stop offset="60%" stop-color="${lockColors[1]}"/>
                <stop offset="100%" stop-color="${lockColors[2]}"/>
            </radialGradient>
            <radialGradient id="aura_${uid}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${coreGlow}" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="${coreGlow}" stop-opacity="0"/>
            </radialGradient>
        </defs>

        <!-- Sombra en suelo -->
        <ellipse cx="60" cy="91" rx="44" ry="7" fill="rgba(0,0,0,0.55)" />

        <!-- Cuerpo inferior del cofre (Base Container) -->
        <path d="M 18 48 L 22 84 Q 23 88 28 88 L 92 88 Q 97 88 98 84 L 102 48 Z" fill="url(#baseGrad_${uid})" stroke="${baseColors[0]}" stroke-width="1.5" />

        <!-- Ranuras de panel del cuerpo -->
        <line x1="20" y1="62" x2="100" y2="62" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" />
        <line x1="21" y1="74" x2="99" y2="74" stroke="rgba(0,0,0,0.4)" stroke-width="1.5" />

        <!-- Tapa abovedada del cofre (Curved Domed Lid) -->
        <path d="M 15 47 Q 15 16 60 14 Q 105 16 105 47 Z" fill="url(#lidGrad_${uid})" stroke="${baseColors[0]}" stroke-width="1.5" />

        <!-- Reflejo curvo superior de la tapa -->
        <path d="M 24 43 Q 24 22 60 20 Q 96 22 96 43" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2" stroke-linecap="round" />

        <!-- Borde / Llanta de Cierre Metálica (Lid Rim / Lip) -->
        <rect x="13" y="44" width="94" height="7" rx="3" fill="url(#rimGrad_${uid})" stroke="rgba(0,0,0,0.45)" stroke-width="1" />

        <!-- Herrajes Verticales Metálicos (Straps) -->
        <!-- Correa Izquierda -->
        <path d="M 33 19 Q 31 32 30 44 L 38 44 Q 39 32 41 19 Z" fill="url(#strapGrad_${uid})" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />
        <path d="M 30 50 L 32 87 L 39 87 L 38 50 Z" fill="url(#strapGrad_${uid})" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />

        <!-- Correa Derecha -->
        <path d="M 79 19 Q 81 32 82 44 L 90 44 Q 89 32 87 19 Z" fill="url(#strapGrad_${uid})" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />
        <path d="M 82 50 L 81 87 L 88 87 L 90 50 Z" fill="url(#strapGrad_${uid})" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />

        <!-- Remaches 3D en correas (Rivets) -->
        <circle cx="35" cy="27" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="34" cy="38" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="35" cy="57" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="36" cy="71" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="36" cy="82" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>

        <circle cx="85" cy="27" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="86" cy="38" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="85" cy="57" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="84" cy="71" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>
        <circle cx="84" cy="82" r="1.6" fill="${strapColors[0]}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6"/>

        <!-- Esquineras de refuerzo inferiores -->
        <path d="M 19 76 L 22 84 Q 23 88 28 88 L 32 88 L 30 76 Z" fill="url(#strapGrad_${uid})" opacity="0.9" />
        <path d="M 101 76 L 98 84 Q 97 88 92 88 L 88 88 L 90 76 Z" fill="url(#strapGrad_${uid})" opacity="0.9" />

        <!-- Cierre Central y Candado / Broche (Central Hasp & Lock) -->
        <rect x="53" y="38" width="14" height="11" rx="2.5" fill="url(#strapGrad_${uid})" stroke="rgba(0,0,0,0.4)" stroke-width="0.8" />
        <rect x="50" y="47" width="20" height="20" rx="4" fill="url(#lockGrad_${uid})" stroke="rgba(0,0,0,0.5)" stroke-width="1.2" />

        <!-- Aura de brillo en cerradura -->
        <circle cx="60" cy="57" r="10" fill="url(#aura_${uid})" />

        <!-- Ojo de cerradura (Keyhole) -->
        <circle cx="60" cy="55" r="2.8" fill="#090d16" />
        <polygon points="58.5,55 61.5,55 62.5,62 57.5,62" fill="#090d16" />

        <!-- Destello de energía o gema central -->
        <circle cx="60" cy="55" r="1.2" fill="${coreGlow}" />
    </svg>`;
}

function generateCarSvg(car, width = 240, height = 120) {
    if (!car) return '';
    const archetype = getCarArchetype(car);
    const hex = car.colorHex || '#38bdf8';
    const safeId = 'car_' + String(car.instanceId || car.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '_');
    const rarity = car.rarity || 'common';
    const mintNum = (car.mintNumber || 44) % 1000;

    const rarityColors = {
        common: '#94a3b8',
        uncommon: '#10b981',
        rare: '#3b82f6',
        legendary: '#f59e0b'
    };
    const badgeColor = rarityColors[rarity] || '#00f5d4';
    const imagePath = `assets/cars_side/${archetype}.jpg`;

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 160" width="${width}" height="${height}" class="rendered-car-real photoreal-car-svg">
    <defs>
        <radialGradient id="${safeId}_glow" cx="50%" cy="85%" r="60%">
            <stop offset="0%" stop-color="${hex}" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="${hex}" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#070a12" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${safeId}_tint" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${hex}" stop-opacity="0.18"/>
            <stop offset="60%" stop-color="${hex}" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#05070e" stop-opacity="0.80"/>
        </linearGradient>
        <clipPath id="${safeId}_clip">
            <rect x="0" y="0" width="320" height="160" rx="10"/>
        </clipPath>
    </defs>
    <g clip-path="url(#${safeId}_clip)">
        <!-- Fondo de Estudio Pro -->
        <rect x="0" y="0" width="320" height="160" fill="#080b13"/>
        <ellipse cx="160" cy="140" rx="145" ry="18" fill="url(#${safeId}_glow)"/>
        
        <!-- Silueta Vectorial GT3 de Respaldo Alta Definición (Garantiza cero iconos rotos) -->
        <g class="fallback-vector-car" opacity="0.95">
            <!-- Chasis aerodinámico base -->
            <path d="M 35 120 L 40 102 Q 46 92 68 88 L 105 86 Q 130 68 178 68 L 225 68 Q 252 74 272 88 L 290 100 Q 295 108 290 120 Z" fill="${hex}" opacity="0.9"/>
            <!-- Cabina y lunas tintadas -->
            <path d="M 112 85 Q 135 72 178 72 L 222 72 Q 244 76 258 85 Z" fill="#0b1120" stroke="${hex}" stroke-width="1.5" opacity="0.85"/>
            <!-- Alerón trasero de competición GT3 -->
            <path d="M 270 82 L 296 78 L 294 85 L 268 88 Z" fill="#0f172a" stroke="${hex}" stroke-width="1"/>
            <rect x="274" y="86" width="3" height="12" fill="#0f172a"/>
            <!-- Ruedas y llantas deportivas -->
            <circle cx="76" cy="120" r="19" fill="#090d16" stroke="#334155" stroke-width="3"/>
            <circle cx="76" cy="120" r="10" fill="#1e293b" stroke="${hex}" stroke-width="1.5"/>
            <circle cx="248" cy="120" r="19" fill="#090d16" stroke="#334155" stroke-width="3"/>
            <circle cx="248" cy="120" r="10" fill="#1e293b" stroke="${hex}" stroke-width="1.5"/>
            <!-- Óptica y luz frontal -->
            <polygon points="38,103 26,106 26,112 40,108" fill="${hex}" opacity="0.9"/>
        </g>
        
        <!-- Render Fotorrealista de Estudio 8K del Vehículo Real con protección contra fallos -->
        <image href="${imagePath}" xlink:href="${imagePath}" x="2" y="2" width="316" height="156" preserveAspectRatio="xMidYMid meet" onerror="this.style.display='none';"/>

        <!-- Tinte del NFT sutil sobre la iluminación -->
        <rect x="0" y="0" width="320" height="160" fill="url(#${safeId}_tint)" style="mix-blend-mode: overlay; pointer-events: none;"/>

        <!-- Luz de Neón en el suelo con el color exacto del NFT -->
        <ellipse cx="160" cy="148" rx="80" ry="7" fill="${hex}" opacity="0.45"/>

        <!-- Insignia Oficial de Mint NFT -->
        <rect x="254" y="8" width="58" height="20" rx="5" fill="rgba(8, 12, 20, 0.90)" stroke="${badgeColor}" stroke-width="1.2"/>
        <text x="283" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="11" fill="#f8fafc" text-anchor="middle">#${mintNum}</text>
    </g>
</svg>`;
}

// =========================================================================
// 8. PASE DE TEMPORADA WEB3 (SEASON BATTLE PASS - NEON APEX)
// =========================================================================
const SEASON_PASS_TIERS = [
    { tier: 1, xpReq: 0, rewardType: "credits", amount: 2500, label: "💰 +2.500 $CR", icon: "💰" },
    { tier: 2, xpReq: 100, rewardType: "parts", parts: { brake_pads: 2, spark_plugs: 2 }, label: "⚙️ 2x Pastillas + 2x Bujías", icon: "⚙️" },
    { tier: 3, xpReq: 250, rewardType: "crate", crateKey: "silver", label: "🧰 Caja de Plata Clubman", icon: "🧰" },
    { tier: 4, xpReq: 450, rewardType: "gems", amount: 25, label: "💎 +25 Tokens TON", icon: "💎" },
    { tier: 5, xpReq: 700, rewardType: "exclusive_car", modelId: "leg_04", label: "👑 Valkyrie AMR Pro Neon Edition", icon: "🏎️" }
];

function claimSeasonPassTier(tierNum) {
    const userData = loadNftUserData();
    if (!userData.seasonPass) return { success: false, reason: "No pass data" };

    const tierDef = SEASON_PASS_TIERS.find(t => t.tier === tierNum);
    if (!tierDef) return { success: false, reason: "Nivel no válido" };

    if (userData.seasonPass.level < tierNum) {
        return { success: false, reason: "level_locked", needed: tierDef.xpReq };
    }

    if (!userData.seasonPass.claimedTiers) userData.seasonPass.claimedTiers = [];
    if (userData.seasonPass.claimedTiers.includes(tierNum)) {
        return { success: false, reason: "already_claimed" };
    }

    userData.seasonPass.claimedTiers.push(tierNum);

    // Otorgar recompensa
    if (tierDef.rewardType === "credits") {
        userData.credits += tierDef.amount;
    } else if (tierDef.rewardType === "gems") {
        userData.gems += tierDef.amount;
    } else if (tierDef.rewardType === "parts") {
        if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
        for (const [pId, cnt] of Object.entries(tierDef.parts)) {
            userData.partsInventory[pId] = (userData.partsInventory[pId] || 0) + cnt;
        }
    } else if (tierDef.rewardType === "crate") {
        userData.credits += 3000; // Bono equivalente si no se abre directamente
    } else if (tierDef.rewardType === "exclusive_car") {
        const specialCar = {
            instanceId: "nft_season1_valkyrie_" + Date.now().toString(36),
            modelId: "leg_04",
            name: "VALKYRIE AMR PRO NEON EDITION",
            rarity: "legendary",
            visualId: 3,
            stats: makeStats(5,5,4,4,3,3,2,3,3,2),
            level: 1,
            xp: 0,
            xpNeeded: 250,
            parts: { speed_power: 1, braking: 1, handling_grip: 1, accel_traction: 1, aero_lightness: 1 },
            colorName: "Verde Neón Oficial",
            colorHex: "#00f5d4",
            tint: 0x00f5d4,
            mintNumber: 1,
            tokenHash: "0xapex_neon_s1_exclusive",
            sprite: "car_cyan",
            obtainedAt: Date.now()
        };
        userData.garage.push(specialCar);
    }

    saveNftUserData(userData);
    return { success: true, tier: tierDef, seasonPass: userData.seasonPass };
}

function claimDailyMission(missionId) {
    const userData = loadNftUserData();
    if (!userData.seasonPass || !userData.seasonPass.dailyMissions) return { success: false };

    const mission = userData.seasonPass.dailyMissions.find(m => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) return { success: false };

    mission.claimed = true;
    userData.seasonPass.xp = (userData.seasonPass.xp || 0) + mission.xp;

    // Comprobar subida de nivel del pase
    while (userData.seasonPass.xp >= userData.seasonPass.xpNeeded && userData.seasonPass.level < 5) {
        userData.seasonPass.xp -= userData.seasonPass.xpNeeded;
        userData.seasonPass.level++;
        userData.seasonPass.xpNeeded = Math.round(userData.seasonPass.xpNeeded * 1.35);
    }

    saveNftUserData(userData);
    return { success: true, mission: mission, seasonPass: userData.seasonPass };
}

// =========================================================================
// 9. MERCADO P2P DE PIEZAS MECÁNICAS (COMMUNITY PARTS MARKETPLACE)
// =========================================================================
let COMMUNITY_MARKETPLACE_LISTINGS = [
    { id: "lst_01", seller: "@Phantom_Silva", partId: "turbocharger", name: "Turbocompresor Twin-Scroll", icon: "🌪️", category: "Motor & Turbo", priceCr: 1850, verified: true, timeAgo: "hace 12m" },
    { id: "lst_02", seller: "@ApexDrift_Tokyo", partId: "slick_tires", name: "Neumáticos Slick GT3", icon: "🏎️", category: "Neumáticos", priceCr: 210, verified: true, timeAgo: "hace 24m" },
    { id: "lst_03", seller: "@Viper_King_USA", partId: "brake_calipers", name: "Pinzas Brembo Monobloque", icon: "🔴", category: "Frenos", priceCr: 950, verified: true, timeAgo: "hace 45m" },
    { id: "lst_04", seller: "@Klaus_Precision", partId: "engine_block", name: "Bloque Motor V8 Bóxer", icon: "⚙️", category: "Motor & Turbo", priceCr: 1050, verified: true, timeAgo: "hace 1h" },
    { id: "lst_05", seller: "@Sophie_Laurent", partId: "carbon_splitter", name: "Splitter de Fibra de Carbono", icon: "📐", category: "Aerodinámica", priceCr: 450, verified: true, timeAgo: "hace 2h" },
    { id: "lst_06", seller: "@Tarek_Mansour", partId: "spark_plugs", name: "Bujías de Iridio (x2)", icon: "🔌", category: "Encendido", priceCr: 190, verified: true, timeAgo: "hace 3h" }
];

function getMarketplaceListings() {
    return COMMUNITY_MARKETPLACE_LISTINGS;
}

function buyMarketplacePart(listingId) {
    const userData = loadNftUserData();
    const idx = COMMUNITY_MARKETPLACE_LISTINGS.findIndex(l => l.id === listingId);
    if (idx === -1) return { success: false, reason: "Oferta no disponible o ya adquirida" };

    const listing = COMMUNITY_MARKETPLACE_LISTINGS[idx];
    if (userData.credits < listing.priceCr) {
        return { success: false, reason: "credits_insufficient" };
    }

    userData.credits -= listing.priceCr;
    if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
    userData.partsInventory[listing.partId] = (userData.partsInventory[listing.partId] || 0) + 1;

    // Retirar del tablón comunitario
    COMMUNITY_MARKETPLACE_LISTINGS.splice(idx, 1);

    saveNftUserData(userData);
    return { success: true, listing: listing, remainingCredits: userData.credits };
}

function sellPartToMarketplace(partId, priceCr) {
    const userData = loadNftUserData();
    if (!userData.partsInventory || (userData.partsInventory[partId] || 0) <= 0) {
        return { success: false, reason: "No posees unidades de esta pieza en tu inventario" };
    }

    const feeRate = 0.075; // 7.5% comisión de plataforma / royalty para los creadores
    const royaltyFee = Math.round(priceCr * feeRate);
    const netCr = Math.max(1, priceCr - royaltyFee);

    userData.partsInventory[partId]--;
    userData.credits += netCr;
    userData.platformTreasuryFees = (userData.platformTreasuryFees || 0) + royaltyFee;

    saveNftUserData(userData);
    return {
        success: true,
        partId: partId,
        grossCr: priceCr,
        royaltyFee: royaltyFee,
        earnedCr: netCr,
        newCredits: userData.credits
    };
}

// =========================================================================
// 9.1 BILLETERA WEB3 & TON CONNECT (GESTIÓN ON-CHAIN Y TOKENS $CR / TON)
// =========================================================================
function connectTonWallet(walletProvider = 'telegram_wallet') {
    const userData = loadNftUserData();
    const mockAddr = 'EQB' + Math.random().toString(36).substring(2, 8).toUpperCase() + '...' + Math.random().toString(36).substring(2, 6).toUpperCase();
    userData.walletConnected = true;
    userData.walletAddress = mockAddr;
    userData.walletProvider = walletProvider;
    saveNftUserData(userData);
    return { success: true, address: mockAddr, provider: walletProvider };
}

function disconnectTonWallet() {
    const userData = loadNftUserData();
    userData.walletConnected = false;
    userData.walletAddress = null;
    userData.walletProvider = null;
    saveNftUserData(userData);
    return { success: true };
}

function buyCrWithTon(tonAmount) {
    const userData = loadNftUserData();
    if ((userData.gems || 0) < tonAmount) {
        return { success: false, reason: "ton_insufficient" };
    }
    const crGained = Math.round(tonAmount * 12500); // Tasa: 1 TON = 12.500 $CR
    userData.gems -= tonAmount;
    userData.credits += crGained;
    saveNftUserData(userData);
    return { success: true, tonSpent: tonAmount, crGained: crGained, credits: userData.credits, gems: userData.gems };
}

// =========================================================================
// 9. SISTEMA ANTI-BOT DE RETIRO: COOLDOWN 7 DÍAS, 50% BURN Y HOLDING MÍNIMO
// =========================================================================
const MIN_HOLDING_BALANCE = 500; // Saldo de seguridad obligatorio que debe quedar en wallet tras retiro
const WITHDRAW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días completos (604.800.000 ms)
const EARLY_WITHDRAW_BURN_PCT = 0.50; // Quema inmediata del 50% si se retira antes de los 7 días

function getWithdrawStatus() {
    const userData = loadNftUserData();
    const lastWithdraw = userData.lastWithdrawTimestamp || 0;
    const now = Date.now();
    const elapsed = now - lastWithdraw;
    const isEarly = lastWithdraw > 0 && elapsed < WITHDRAW_COOLDOWN_MS;
    const remainingMs = isEarly ? (WITHDRAW_COOLDOWN_MS - elapsed) : 0;
    
    return {
        isEarly,
        remainingMs,
        lastWithdraw,
        cooldownMs: WITHDRAW_COOLDOWN_MS,
        minHolding: MIN_HOLDING_BALANCE,
        burnPct: EARLY_WITHDRAW_BURN_PCT
    };
}

function withdrawCrToTon(crAmount, forceEarly = false) {
    const userData = loadNftUserData();
    if (!userData.walletConnected) {
        return { success: false, reason: "wallet_not_connected" };
    }
    const minWithdraw = 1000;
    if (crAmount < minWithdraw) {
        return { success: false, reason: "min_withdraw_not_met", min: minWithdraw };
    }
    if ((userData.credits || 0) < crAmount) {
        return { success: false, reason: "credits_insufficient" };
    }

    // 1. REGLA DE SALDO MÍNIMO EN WALLET (HOLDING MÍNIMO DE SEGURIDAD: 500 $CR)
    // El usuario no puede vaciar su cuenta; deben quedar al menos 500 $CR en la wallet tras el retiro
    if ((userData.credits - crAmount) < MIN_HOLDING_BALANCE) {
        return { 
            success: false, 
            reason: "holding_reserve_required", 
            minHolding: MIN_HOLDING_BALANCE,
            currentBalance: userData.credits,
            maxAllowedWithdraw: Math.max(0, userData.credits - MIN_HOLDING_BALANCE)
        };
    }

    // 2. REGLA DE COOLDOWN DE 7 DÍAS & QUEMA DEL 50% POR RETIRO ANTICIPADO
    const now = Date.now();
    const lastWithdraw = userData.lastWithdrawTimestamp || 0;
    const elapsed = now - lastWithdraw;
    const isEarly = lastWithdraw > 0 && elapsed < WITHDRAW_COOLDOWN_MS;

    if (isEarly && !forceEarly) {
        const remainingMs = WITHDRAW_COOLDOWN_MS - elapsed;
        const burnCr = Math.round(crAmount * EARLY_WITHDRAW_BURN_PCT);
        const netCr = crAmount - burnCr;
        const netTon = Number((netCr / 12500).toFixed(4));
        return {
            success: false,
            reason: "early_withdraw_warning",
            remainingMs: remainingMs,
            burnRate: EARLY_WITHDRAW_BURN_PCT,
            burnCr: burnCr,
            netCr: netCr,
            netTon: netTon,
            crAmount: crAmount
        };
    }

    // Proceso de Retiro:
    let burnedCr = 0;
    let netCrAmount = crAmount;
    if (isEarly && forceEarly) {
        // Quema del 50% de los tokens retirados antes de 7 días
        burnedCr = Math.round(crAmount * EARLY_WITHDRAW_BURN_PCT);
        netCrAmount = crAmount - burnedCr;
        userData.totalBurnedTokens = (userData.totalBurnedTokens || 0) + burnedCr;
    }

    const tonGained = Number((netCrAmount / 12500).toFixed(4));
    userData.credits -= crAmount; // Se deducen los tokens solicitados
    userData.gems = (userData.gems || 0) + tonGained;
    userData.lastWithdrawTimestamp = now;
    saveNftUserData(userData);

    return { 
        success: true, 
        isEarly: isEarly,
        crSpent: crAmount, 
        burnedCr: burnedCr,
        netCr: netCrAmount,
        tonGained: tonGained, 
        credits: userData.credits, 
        gems: userData.gems 
    };
}

// =========================================================================
// 10. TORNEO SEMANAL OFICIAL GRAND PRIX ASÍNCRONO CON BOTE DINÁMICO & FEE 5%
// =========================================================================
const WEEKLY_TOURNAMENT_CONFIG = {
    title: "NEO-TOKYO HARBOR BAY GT GRAND PRIX",
    trackId: "neo_tokyo_bay",
    timeOfDay: "night",
    totalLaps: 3,
    entryFeeCr: 20,       // Inscripción: 20 $CR por piloto
    houseBonusCr: 200,    // Aportación de la casa / patrocinador al bote
    sponsorTon: 25,       // Bote adicional en TON de sponsors
    endsIn: "2 días 14 horas",
    platformFeePct: 0.05  // 5% comisión recuperada por la plataforma
};

function getWeeklyTournamentInfo() {
    let savedTourney = null;
    try {
        const raw = localStorage.getItem('dustrac_tournament_state');
        if (raw) savedTourney = JSON.parse(raw);
    } catch(e) {}

    const registeredPlayers = (savedTourney && savedTourney.registeredPlayers) || 124;
    const playerBestTime = (savedTourney && savedTourney.playerBestTime) || null;

    const totalCollectedCr = registeredPlayers * WEEKLY_TOURNAMENT_CONFIG.entryFeeCr;
    const grossPotCr = totalCollectedCr + WEEKLY_TOURNAMENT_CONFIG.houseBonusCr;
    const devFeeCr = Math.round(grossPotCr * WEEKLY_TOURNAMENT_CONFIG.platformFeePct); // 5% dev fee
    const netPrizePotCr = grossPotCr - devFeeCr; // 95% repartido entre los mejores tiempos

    // Distribución: Si hay más de 50 corredores, premia al Top 10. Si no, al Top 5.
    const isTop10 = registeredPlayers >= 50;
    const shareDistribution = isTop10 ? [
        { rank: 1, pct: 0.30, pilot: "Hans 'Blitz' Becker", car: "Chiron Pur Sport W16", lapTime: "36.84s" },
        { rank: 2, pct: 0.20, pilot: "Phantom_Silva", car: "Hyperion Senna 720S", lapTime: "37.12s" },
        { rank: 3, pct: 0.15, pilot: "Marco 'Apex' Rossi", car: "Valkyrie AMR Pro", lapTime: "37.58s" },
        { rank: 4, pct: 0.10, pilot: "Torque_Viper", car: "Dodge Viper ACR", lapTime: "38.05s" },
        { rank: 5, pct: 0.07, pilot: "Grello_Manthey", car: "Porsche 911 GT3-RS", lapTime: "38.42s" },
        { rank: 6, pct: 0.05, pilot: "Klaus_Weber", car: "Bavaria M4 Beast", lapTime: "38.75s" },
        { rank: 7, pct: 0.04, pilot: "Ayrton_GT", car: "Ferrari Daytona SP3", lapTime: "38.92s" },
        { rank: 8, pct: 0.03, pilot: "Drift_Master_Ken", car: "Lancer Evo VI TME", lapTime: "39.10s" },
        { rank: 9, pct: 0.03, pilot: "Speedy_Gonzalo", car: "Lamborghini SVJ", lapTime: "39.28s" },
        { rank: 10, pct: 0.03, pilot: "Nordic_Racer", car: "Bentley Continental GT3", lapTime: "39.45s" }
    ] : [
        { rank: 1, pct: 0.40, pilot: "Hans 'Blitz' Becker", car: "Chiron Pur Sport W16", lapTime: "36.84s" },
        { rank: 2, pct: 0.25, pilot: "Phantom_Silva", car: "Hyperion Senna 720S", lapTime: "37.12s" },
        { rank: 3, pct: 0.15, pilot: "Marco 'Apex' Rossi", car: "Valkyrie AMR Pro", lapTime: "37.58s" },
        { rank: 4, pct: 0.12, pilot: "Torque_Viper", car: "Dodge Viper ACR", lapTime: "38.05s" },
        { rank: 5, pct: 0.08, pilot: "Grello_Manthey", car: "Porsche 911 GT3-RS", lapTime: "38.42s" }
    ];

    const leaderboard = shareDistribution.map(entry => {
        const prizeCr = Math.round(netPrizePotCr * entry.pct);
        const prizeTon = Number((WEEKLY_TOURNAMENT_CONFIG.sponsorTon * entry.pct).toFixed(2));
        const medal = entry.rank === 1 ? '🥇' : (entry.rank === 2 ? '🥈' : (entry.rank === 3 ? '🥉' : '⭐'));
        return {
            rank: entry.rank,
            pilot: entry.pilot,
            car: entry.car,
            lapTime: entry.lapTime,
            prizeCr: prizeCr,
            prizeTon: prizeTon,
            rewardText: `${medal} +${prizeCr.toLocaleString()} $CR ${prizeTon > 0 ? `+ ${prizeTon} TON` : ''}`
        };
    });

    return {
        ...WEEKLY_TOURNAMENT_CONFIG,
        registeredPlayers: registeredPlayers,
        totalCollectedCr: totalCollectedCr,
        grossPotCr: grossPotCr,
        devFeeCr: devFeeCr,
        netPrizePotCr: netPrizePotCr,
        prizeCr: grossPotCr,
        prizeTon: WEEKLY_TOURNAMENT_CONFIG.sponsorTon,
        leaderboard: leaderboard,
        playerBestTime: playerBestTime,
        isTop10: isTop10
    };
}

const WEEKLY_TOURNAMENT_DATA = getWeeklyTournamentInfo();

function enterWeeklyTournament() {
    const userData = loadNftUserData();
    const tourneyInfo = getWeeklyTournamentInfo();
    const fee = tourneyInfo.entryFeeCr || 20;

    if ((userData.credits || 0) < fee) {
        return { success: false, reason: "credits_insufficient", required: fee, credits: userData.credits || 0 };
    }

    userData.credits -= fee;
    userData.enteredWeeklyTournament = true;

    // 5% recuperado por la plataforma añadido a la tesorería
    const platformShare = Math.round(fee * WEEKLY_TOURNAMENT_CONFIG.platformFeePct);
    userData.platformTreasuryFees = (userData.platformTreasuryFees || 0) + platformShare;

    // Actualizar participantes en LocalStorage
    let savedTourney = { registeredPlayers: tourneyInfo.registeredPlayers + 1 };
    try {
        localStorage.setItem('dustrac_tournament_state', JSON.stringify(savedTourney));
    } catch(e) {}

    saveNftUserData(userData);
    const updatedTourney = getWeeklyTournamentInfo();
    return {
        success: true,
        tournament: updatedTourney,
        feePaid: fee,
        platformFeeAccrued: platformShare,
        remainingCredits: userData.credits
    };
}

// =========================================================================
// 11. SISTEMA DE CONTRATOS DE PATROCINIO PARA EL PILOTO (SPONSORSHIPS)
// =========================================================================
const SPONSORSHIP_CONTRACTS_DATA = [
    {
        id: 'sp_pirelli',
        name: 'Pirelli P-Zero Motorsport',
        badge: '🟡 PIRELLI RACING',
        brand: 'Pirelli',
        icon: '🛞',
        color: '#facc15',
        desc: 'El fabricante oficial de neumáticos busca pilotos que dominen el derrape y aprovechen el impulso en curva.',
        goalType: 'drifts',
        goalTarget: 3,
        goalLabel: 'Realizar 3 derrapes con turbo boost en carrera',
        rewardCredits: 500,
        rewardTon: 0.05,
        rewardPartId: 'slick_tires',
        rewardPartName: 'Neumáticos Slick GT3',
        tier: 'PRO'
    },
    {
        id: 'sp_brembo',
        name: 'Brembo Racing Brakes',
        badge: '🔴 BREMBO BRAKES',
        brand: 'Brembo',
        icon: '🛑',
        color: '#ef4444',
        desc: 'Demuestra frenadas quirúrgicas subiendo al cajón del podio en cualquier prueba oficial.',
        goalType: 'podium',
        goalTarget: 1,
        goalLabel: 'Terminar en el Podio (Top 3) de la clasificación',
        rewardCredits: 750,
        rewardTon: 0.08,
        rewardPartId: 'brake_calipers',
        rewardPartName: 'Pinzas Brembo Monobloque',
        tier: 'ELITE'
    },
    {
        id: 'sp_castrol',
        name: 'Castrol Edge Titanium',
        badge: '🟢 CASTROL EDGE',
        brand: 'Castrol',
        icon: '⚡',
        color: '#10b981',
        desc: 'Rendimiento térmico extremo de motor: exprime al máximo la velocidad punta en recta.',
        goalType: 'top_speed',
        goalTarget: 360,
        goalLabel: 'Alcanzar más de 360 km/h en recta durante la carrera',
        rewardCredits: 650,
        rewardTon: 0.06,
        rewardPartId: 'turbocharger',
        rewardPartName: 'Turbocompresor Garrett Twin-Scroll',
        tier: 'PRO'
    },
    {
        id: 'sp_redbull',
        name: 'Red Bull Apex GP Racing',
        badge: '🔵 RED BULL APEX',
        brand: 'Red Bull',
        icon: '🐂',
        color: '#38bdf8',
        desc: 'Contrato exclusivo de escudería campeona: consigue la victoria absoluta en 1º puesto.',
        goalType: 'win',
        goalTarget: 1,
        goalLabel: 'Ganar el 1º Puesto (Victoria Absoluta) en carrera',
        rewardCredits: 1200,
        rewardTon: 0.15,
        rewardPartId: 'ecu_chip',
        rewardPartName: 'ECU Stage 3 Racing',
        tier: 'LEGEND'
    }
];

function getSponsorshipContracts() {
    const userData = loadNftUserData();
    if (!userData.activeSponsors || !Array.isArray(userData.activeSponsors)) {
        userData.activeSponsors = SPONSORSHIP_CONTRACTS_DATA.map((sp, idx) => ({
            id: sp.id,
            signed: idx < 2,
            progress: idx === 0 ? 1 : 0,
            target: sp.goalTarget,
            completed: false,
            claimed: false
        }));
        saveNftUserData(userData);
    }
    return SPONSORSHIP_CONTRACTS_DATA.map(def => {
        const userState = userData.activeSponsors.find(s => s.id === def.id) || {
            id: def.id, signed: false, progress: 0, target: def.goalTarget, completed: false, claimed: false
        };
        return { ...def, ...userState };
    });
}

function signSponsorshipContract(contractId) {
    const userData = loadNftUserData();
    if (!userData.activeSponsors) getSponsorshipContracts();
    const c = userData.activeSponsors.find(s => s.id === contractId);
    if (!c) return { success: false, reason: "Contrato no encontrado" };
    c.signed = true;
    saveNftUserData(userData);
    return { success: true, contract: c };
}

function claimSponsorshipReward(contractId) {
    const userData = loadNftUserData();
    if (!userData.activeSponsors) return { success: false, reason: "No hay contratos" };
    const c = userData.activeSponsors.find(s => s.id === contractId);
    if (!c || !c.completed || c.claimed) return { success: false, reason: "No completado o ya reclamado" };

    const def = SPONSORSHIP_CONTRACTS_DATA.find(d => d.id === contractId);
    if (!def) return { success: false, reason: "Definición no encontrada" };

    c.claimed = true;
    userData.credits = (userData.credits || 0) + def.rewardCredits;
    userData.gems = (userData.gems || 0) + Math.round(def.rewardTon * 100);

    if (def.rewardPartId) {
        if (!userData.partsInventory) userData.partsInventory = { ...DEFAULT_PARTS_INVENTORY };
        userData.partsInventory[def.rewardPartId] = (userData.partsInventory[def.rewardPartId] || 0) + 1;
    }

    saveNftUserData(userData);
    return { success: true, contract: def, credits: userData.credits, gems: userData.gems };
}

function updateSponsorshipProgress(raceData) {
    const userData = loadNftUserData();
    if (!userData.activeSponsors) return [];
    const completedNow = [];

    userData.activeSponsors.forEach(s => {
        if (!s.signed || s.claimed) return;
        const def = SPONSORSHIP_CONTRACTS_DATA.find(d => d.id === s.id);
        if (!def) return;

        if (def.goalType === 'drifts' && raceData.drifts) {
            s.progress = Math.min(s.target, (s.progress || 0) + raceData.drifts);
        } else if (def.goalType === 'podium' && raceData.rank <= 3) {
            s.progress = 1;
        } else if (def.goalType === 'win' && raceData.rank === 1) {
            s.progress = 1;
        } else if (def.goalType === 'top_speed' && raceData.topSpeed) {
            s.progress = Math.max(s.progress || 0, Math.round(raceData.topSpeed));
        }

        if (s.progress >= s.target && !s.completed) {
            s.completed = true;
            completedNow.push(def);
        }
    });

    saveNftUserData(userData);
    return completedNow;
}

// =========================================================================
// 10. SISTEMA VIRAL DE INVITACIONES, TORNEO DE LANZAMIENTO (2 MESES) Y CORREO
// =========================================================================
const REFERRAL_TOURNAMENT_DURATION_MS = 60 * 24 * 60 * 60 * 1000; // 60 días completos (2 meses)

function getReferralTournamentData() {
    const userData = loadNftUserData();
    let launchEpoch = 1761000000000;
    try {
        const savedLaunch = localStorage.getItem('apex_launch_epoch');
        if (savedLaunch) launchEpoch = parseInt(savedLaunch);
        else localStorage.setItem('apex_launch_epoch', launchEpoch.toString());
    } catch(e) {}

    const now = Date.now();
    const elapsed = Math.max(0, now - launchEpoch);
    const remainingMs = Math.max(0, REFERRAL_TOURNAMENT_DURATION_MS - (elapsed % REFERRAL_TOURNAMENT_DURATION_MS));
    const remainingDays = Math.floor(remainingMs / (24 * 3600 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 3600 * 1000)) / (3600 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

    const baseRacers = [
        { name: "Apex_TurboKing", flag: "🇪🇸", invites: 46 },
        { name: "Klaus_Weber", flag: "🇩🇪", invites: 41 },
        { name: "Elena_Rostova", flag: "🇫🇷", invites: 37 },
        { name: "Marco_Apex99", flag: "🇮🇹", invites: 32 },
        { name: "Tarek_Mansour", flag: "🇦🇪", invites: 29 },
        { name: "Sophie_Laurent", flag: "🇨🇭", invites: 26 },
        { name: "Ayrton_Silva", flag: "🇧🇷", invites: 24 },
        { name: "Matteo_Fire", flag: "🇪🇸", invites: 21 },
        { name: "Jean_Cruiser", flag: "🇧🇪", invites: 19 },
        { name: "Kenji_Drift", flag: "🇯🇵", invites: 17 },
        { name: "Liam_Racer", flag: "🇬🇧", invites: 15 },
        { name: "Lucas_GT", flag: "🇦🇷", invites: 13 },
        { name: "Carlos_Speed", flag: "🇲🇽", invites: 11 },
        { name: "David_Pro", flag: "🇺🇸", invites: 10 },
        { name: "Nico_Apex", flag: "🇩🇪", invites: 8 },
        { name: "Valtteri_Ice", flag: "🇫🇮", invites: 7 },
        { name: "Hugo_Motorsport", flag: "🇵🇹", invites: 6 },
        { name: "Pablo_Torque", flag: "🇨🇱", invites: 5 },
        { name: "Sergio_V8", flag: "🇨🇴", invites: 4 },
        { name: "Max_Nitro", flag: "🇳🇱", invites: 3 }
    ];

    const userPilotName = userData.pilotName || 'PILOTO (TÚ)';
    const userInvites = userData.referralsCount || 0;

    let racersList = [...baseRacers];
    const userEntry = {
        name: `${userPilotName} (TÚ)`,
        flag: "🏁",
        invites: userInvites,
        isUser: true
    };
    racersList.push(userEntry);
    racersList.sort((a, b) => b.invites - a.invites);

    const userRank = racersList.findIndex(r => r.isUser) + 1;
    const top20 = racersList.slice(0, 20);

    const formattedLeaderboard = top20.map((r, idx) => {
        const rank = idx + 1;
        let prizeTier = 'bronze';
        let prizeName = 'Cofre Común (Rookie)';

        if (rank <= 3) {
            prizeTier = 'gold';
            prizeName = 'Cofre Raro (VIP Oro)';
        } else if (rank <= 10) {
            prizeTier = 'silver';
            prizeName = 'Cofre de Plata (Clubman)';
        }
        const prizeIcon = generateChestSvg(prizeTier, 20, 18);

        return {
            rank,
            name: r.name,
            flag: r.flag,
            invites: r.invites,
            isUser: !!r.isUser,
            prizeTier,
            prizeName,
            prizeIcon
        };
    });

    let userPrize = null;
    if (userRank <= 3) userPrize = { tier: 'gold', name: 'Cofre Raro (VIP Oro)', icon: generateChestSvg('gold', 20, 18) };
    else if (userRank <= 10) userPrize = { tier: 'silver', name: 'Cofre de Plata (Clubman)', icon: generateChestSvg('silver', 20, 18) };
    else if (userRank <= 20) userPrize = { tier: 'bronze', name: 'Cofre Común (Rookie)', icon: generateChestSvg('bronze', 20, 18) };

    return {
        remainingDays,
        remainingHours,
        remainingMinutes,
        remainingMs,
        userRank,
        userInvites,
        userPrize,
        userCode: userData.referralCode,
        invitedBy: userData.invitedBy,
        email: userData.email,
        emailLinkedRewardClaimed: userData.emailLinkedRewardClaimed,
        leaderboard: formattedLeaderboard,
        referralHistory: userData.referralHistory || []
    };
}

function redeemInviteCode(inputCode) {
    const userData = loadNftUserData();
    const code = (inputCode || '').trim().toUpperCase();
    if (!code || !code.startsWith('APEX-') || code.length < 8) {
        return { success: false, reason: "invalid_format" };
    }
    if (code === userData.referralCode.toUpperCase()) {
        return { success: false, reason: "cannot_invite_self" };
    }
    if (userData.invitedBy) {
        return { success: false, reason: "already_redeemed", code: userData.invitedBy };
    }

    const bonusNitros = 2; // +2 Cápsulas de Nitro N2O de bienvenida (4s de boost)
    userData.invitedBy = code;
    userData.nitros = (userData.nitros || 0) + bonusNitros;
    saveNftUserData(userData);

    return {
        success: true,
        code: code,
        bonusNitros: bonusNitros,
        totalNitros: userData.nitros
    };
}

function simulateFriendJoined(friendName) {
    const userData = loadNftUserData();
    const bonusNitros = 1; // +1 Nitro N2O por cada amigo invitado
    userData.referralsCount = (userData.referralsCount || 0) + 1;
    userData.nitros = (userData.nitros || 0) + bonusNitros;
    if (!Array.isArray(userData.referralHistory)) userData.referralHistory = [];
    const fName = friendName || (`Piloto_${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    userData.referralHistory.unshift({
        name: fName,
        joinedAt: Date.now(),
        reward: '+1 NITRO N₂O'
    });
    saveNftUserData(userData);

    return {
        success: true,
        friendName: fName,
        referralsCount: userData.referralsCount,
        bonusNitros: bonusNitros,
        totalNitros: userData.nitros
    };
}

function linkUserEmail(emailInput) {
    const userData = loadNftUserData();
    const email = (emailInput || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, reason: "invalid_email" };
    }

    const isFirstTime = !userData.emailLinkedRewardClaimed;
    const bonusNitros = isFirstTime ? 2 : 0; // +2 Nitros N2O por vincular correo
    if (isFirstTime) {
        userData.nitros = (userData.nitros || 0) + bonusNitros;
        userData.emailLinkedRewardClaimed = true;
    }
    userData.email = email;
    saveNftUserData(userData);

    return {
        success: true,
        email: email,
        isFirstTime: isFirstTime,
        bonusNitros: bonusNitros,
        totalNitros: userData.nitros
    };
}

if (typeof window !== 'undefined') {
    window.getAvailableNitros = getAvailableNitros;
    window.addNitroWithAd = addNitroWithAd;
    window.buyNitrosWithTokens = buyNitrosWithTokens;
    window.consumeNitroFromInventory = consumeNitroFromInventory;
    window.VALID_CAR_STATS = VALID_CAR_STATS;
    window.getCarMilestones = getCarMilestones;
    window.getCarPendingMilestones = getCarPendingMilestones;
    window.claimCarMilestoneStat = claimCarMilestoneStat;
    window.getWeeklyTournamentInfo = getWeeklyTournamentInfo;
    window.enterWeeklyTournament = enterWeeklyTournament;
    window.WEEKLY_TOURNAMENT_CONFIG = WEEKLY_TOURNAMENT_CONFIG;
    window.getWithdrawStatus = getWithdrawStatus;
    window.withdrawCrToTon = withdrawCrToTon;
    window.MIN_HOLDING_BALANCE = MIN_HOLDING_BALANCE;
    window.WITHDRAW_COOLDOWN_MS = WITHDRAW_COOLDOWN_MS;
    window.EARLY_WITHDRAW_BURN_PCT = EARLY_WITHDRAW_BURN_PCT;
    window.REFERRAL_TOURNAMENT_DURATION_MS = REFERRAL_TOURNAMENT_DURATION_MS;
    window.getReferralTournamentData = getReferralTournamentData;
    window.redeemInviteCode = redeemInviteCode;
    window.simulateFriendJoined = simulateFriendJoined;
    window.linkUserEmail = linkUserEmail;
    window.generateChestSvg = generateChestSvg;
}

