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

// Catálogo de 16 Piezas de Mecánica y Recambios de Taller (Crafting & Tuning)
const WORKSHOP_PIECES_CATALOG = {
    // 1. Motor & Velocidad Punta
    spark_plugs: { id: "spark_plugs", name: "Bujías de Iridio", icon: "🔌", category: "speed_power", desc: "Chispa de encendido de alta frecuencia para combustión óptima", costCr: 250 },
    cylinders: { id: "cylinders", name: "Cilindros Forjados", icon: "🔩", category: "speed_power", desc: "Pistones de compresión reforzada para soportar altas RPM", costCr: 550 },
    engine_block: { id: "engine_block", name: "Bloque Motor V8/Bóxer", icon: "⚙️", category: "speed_power", desc: "Cárter seco y bloque de aleación ultraligero", costCr: 1200 },
    turbocharger: { id: "turbocharger", name: "Turbocompresor Twin-Scroll", icon: "🌪️", category: "speed_power", desc: "Turbina de titanio para máxima presión de sobrealimentación", costCr: 2200 },

    // 2. Sistema de Frenos
    brake_pads: { id: "brake_pads", name: "Pastillas Cerámicas", icon: "🛞", category: "braking", desc: "Compuesto de fricción resistente a fatiga térmica en curvas", costCr: 220 },
    brake_discs: { id: "brake_discs", name: "Discos Perforados Carbono", icon: "💿", category: "braking", desc: "Ranuras de refrigeración activa para detención fulgurante", costCr: 500 },
    brake_calipers: { id: "brake_calipers", name: "Pinzas Brembo Monobloque", icon: "🔴", category: "braking", desc: "6 pistones de mordida instantánea en frenada al límite", costCr: 1100 },

    // 3. Chasis, Neumáticos & Agarre
    slick_tires: { id: "slick_tires", name: "Neumáticos Slick GT3", icon: "🏎️", category: "handling_grip", desc: "Goma blanda de competición para paso por curva impecable", costCr: 260 },
    suspension_springs: { id: "suspension_springs", name: "Muelles Roscados", icon: "🌀", category: "handling_grip", desc: "Amortiguación regulable en compresión y rebote", costCr: 520 },
    antiroll_bars: { id: "antiroll_bars", name: "Barra Estabilizadora", icon: "🔗", category: "handling_grip", desc: "Rigidez torsional contra el balanceo en cambios de apoyo", costCr: 1150 },

    // 4. Transmisión & Aceleración
    racing_clutch: { id: "racing_clutch", name: "Embrague Multidisco", icon: "⚡", category: "accel_traction", desc: "Acople sin pérdidas de par motor en arrancada", costCr: 280 },
    lsd_differential: { id: "lsd_differential", name: "Diferencial Autoblocante LSD", icon: "🔀", category: "accel_traction", desc: "Reparto de par 50/50 a las ruedas motrices", costCr: 580 },
    gearbox_cogs: { id: "gearbox_cogs", name: "Caja de Cambios Secuencial", icon: "⚙️", category: "accel_traction", desc: "Engranajes rectos para cambio de marcha en 30 milisegundos", costCr: 1300 },

    // 5. Aerodinámica & Aligeramiento
    carbon_wing: { id: "carbon_wing", name: "Alerón de Carbono GT", icon: "🪽", category: "aero_lightness", desc: "Carga aerodinámica vertical que pega el tren trasero a la pista", costCr: 300 },
    front_splitter: { id: "front_splitter", name: "Splitter Delantero Venturi", icon: "🛡️", category: "aero_lightness", desc: "Efecto suelo que canaliza el flujo de aire bajo el chasis", costCr: 550 },
    monocoque_frame: { id: "monocoque_frame", name: "Chasis Monocasco Carbono", icon: "🪶", category: "aero_lightness", desc: "Estructura de fibra de carbono peso pluma de competición", costCr: 1400 }
};

// Ramas de Mejora Específicas por Grupo de Estadísticas y Recetas de Piezas Requeridas
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
            { reqs: { spark_plugs: 2, cylinders: 1 }, cr: 600, gems: 0 },
            { reqs: { spark_plugs: 4, cylinders: 2, engine_block: 1 }, cr: 1400, gems: 0 },
            { reqs: { spark_plugs: 6, cylinders: 3, engine_block: 2, turbocharger: 1 }, cr: 2800, gems: 20 },
            { reqs: { spark_plugs: 8, cylinders: 4, engine_block: 3, turbocharger: 2 }, cr: 5000, gems: 50 },
            { reqs: { spark_plugs: 12, cylinders: 6, engine_block: 4, turbocharger: 3 }, cr: 8000, gems: 100 }
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
            { reqs: { brake_pads: 2, brake_discs: 1 }, cr: 550, gems: 0 },
            { reqs: { brake_pads: 4, brake_discs: 2, brake_calipers: 1 }, cr: 1200, gems: 0 },
            { reqs: { brake_pads: 6, brake_discs: 3, brake_calipers: 2 }, cr: 2500, gems: 15 },
            { reqs: { brake_pads: 8, brake_discs: 4, brake_calipers: 3 }, cr: 4500, gems: 45 },
            { reqs: { brake_pads: 12, brake_discs: 6, brake_calipers: 4 }, cr: 7500, gems: 90 }
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
            { reqs: { slick_tires: 2, suspension_springs: 1 }, cr: 550, gems: 0 },
            { reqs: { slick_tires: 4, suspension_springs: 2, antiroll_bars: 1 }, cr: 1300, gems: 0 },
            { reqs: { slick_tires: 6, suspension_springs: 3, antiroll_bars: 2 }, cr: 2600, gems: 15 },
            { reqs: { slick_tires: 8, suspension_springs: 4, antiroll_bars: 3 }, cr: 4800, gems: 45 },
            { reqs: { slick_tires: 12, suspension_springs: 6, antiroll_bars: 4 }, cr: 7800, gems: 90 }
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
            { reqs: { racing_clutch: 2, lsd_differential: 1 }, cr: 600, gems: 0 },
            { reqs: { racing_clutch: 4, lsd_differential: 2, gearbox_cogs: 1 }, cr: 1400, gems: 0 },
            { reqs: { racing_clutch: 6, lsd_differential: 3, gearbox_cogs: 2 }, cr: 2800, gems: 20 },
            { reqs: { racing_clutch: 8, lsd_differential: 4, gearbox_cogs: 3 }, cr: 5000, gems: 50 },
            { reqs: { racing_clutch: 12, lsd_differential: 6, gearbox_cogs: 4 }, cr: 8000, gems: 100 }
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
            { reqs: { carbon_wing: 1, front_splitter: 1 }, cr: 550, gems: 0 },
            { reqs: { carbon_wing: 2, front_splitter: 2, monocoque_frame: 1 }, cr: 1300, gems: 0 },
            { reqs: { carbon_wing: 3, front_splitter: 3, monocoque_frame: 2 }, cr: 2600, gems: 15 },
            { reqs: { carbon_wing: 4, front_splitter: 4, monocoque_frame: 3 }, cr: 4800, gems: 45 },
            { reqs: { carbon_wing: 6, front_splitter: 6, monocoque_frame: 4 }, cr: 7800, gems: 90 }
        ]
    }
};

const DEFAULT_PARTS_INVENTORY = {
    spark_plugs: 16,
    cylinders: 10,
    engine_block: 5,
    turbocharger: 3,
    brake_pads: 14,
    brake_discs: 10,
    brake_calipers: 5,
    slick_tires: 16,
    suspension_springs: 10,
    antiroll_bars: 5,
    racing_clutch: 12,
    lsd_differential: 8,
    gearbox_cogs: 5,
    carbon_wing: 8,
    front_splitter: 8,
    monocoque_frame: 4
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

    // Integración de las 5 ramas de piezas (con retrocompatibilidad)
    const speedPowerLvl = parts.speed_power || Math.max(parts.turbo || 0, parts.ecu || 0);
    const brakingLvl = parts.braking || parts.brakes || 0;
    const handlingGripLvl = parts.handling_grip || Math.max(parts.tires || 0, parts.brakes || 0);
    const accelTractionLvl = parts.accel_traction || Math.max(parts.turbo || 0, parts.tires || 0);
    const aeroLightnessLvl = parts.aero_lightness || parts.chassis || 0;

    const eff = {
        potencia: (rawStats.potencia || 1) + speedPowerLvl + lvlBonus,
        velocidad: (rawStats.velocidad || 1) + speedPowerLvl + lvlBonus,
        aceleracion: (rawStats.aceleracion || 1) + accelTractionLvl + lvlBonus,
        agarre: (rawStats.agarre || 1) + handlingGripLvl + lvlBonus,
        frenada: (rawStats.frenada || 1) + (brakingLvl * 2) + lvlBonus,
        manejo: (rawStats.manejo || 1) + handlingGripLvl + lvlBonus,
        turbo: (rawStats.turbo || 1) + speedPowerLvl + lvlBonus,
        downforce: (rawStats.downforce || 1) + aeroLightnessLvl + lvlBonus,
        traccion: (rawStats.traccion || 1) + accelTractionLvl + lvlBonus,
        ligereza: (rawStats.ligereza || 1) + aeroLightnessLvl + lvlBonus
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
        cost: 500,
        currency: "credits", // $CR
        odds: { common: 0.55, uncommon: 0.35, rare: 0.09, legendary: 0.01 },
        badgeColor: 0xcd7f32
    },
    silver: {
        id: "silver",
        nameKey: "crate_silver_title",
        cost: 2000,
        currency: "credits", // $CR
        odds: { common: 0.30, uncommon: 0.45, rare: 0.22, legendary: 0.03 },
        badgeColor: 0xc0c0c0
    },
    gold: {
        id: "gold",
        nameKey: "crate_gold_title",
        cost: 500,
        currency: "gems", // Gemas $TON
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

    const starterColor = NFT_CAR_COLORS[0];
    const starterModel = NFT_CAR_MODELS[0];
    const starterCar = {
        instanceId: "nft_inst_001",
        modelId: starterModel.id,
        name: starterModel.name,
        rarity: starterModel.rarity,
        visualId: starterModel.visualId || 23,
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
            credits: (data && typeof data.credits === 'number') ? data.credits : 1000000,
            gems: (data && typeof data.gems === 'number') ? data.gems : 50000,
            equippedInstanceId: (data && data.equippedInstanceId) ? data.equippedInstanceId : starterCar.instanceId,
            garage: (data && Array.isArray(data.garage) && data.garage.length > 0) ? data.garage : [starterCar]
        };
        saveNftUserData(data);
    }

    // Auto-recarga para modo pruebas si el saldo es inferior a las cantidades de test
    if (typeof data.credits !== 'number' || data.credits < 500000) data.credits = 1000000;
    if (typeof data.gems !== 'number' || data.gems < 10000) data.gems = 50000;
    if (!Array.isArray(data.garage) || data.garage.length === 0) data.garage = [starterCar];
    if (!data.equippedInstanceId && data.garage[0]) data.equippedInstanceId = data.garage[0].instanceId;

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

        // Inicialización y regeneración pasiva horaria de energía (+1⚡ cada 1 hora)
        if (typeof c.maxEnergy === 'undefined') c.maxEnergy = 10;
        if (typeof c.energy === 'undefined') c.energy = c.maxEnergy;
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

    return data;
}

// Regenerar pasivamente 1 punto de energía cada 1 hora (3600 segundos)
function refreshCarEnergy(car) {
    if (!car) return;
    if (typeof car.maxEnergy === 'undefined') car.maxEnergy = 10;
    if (typeof car.energy === 'undefined') car.energy = car.maxEnergy;
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
        energy: 10,
        maxEnergy: 10,
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
        
        <!-- Render Fotorrealista de Estudio 8K del Vehículo Real -->
        <image href="${imagePath}" xlink:href="${imagePath}" x="2" y="2" width="316" height="156" preserveAspectRatio="xMidYMid meet"/>

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

    userData.partsInventory[partId]--;
    userData.credits += priceCr;

    saveNftUserData(userData);
    return { success: true, partId: partId, earnedCr: priceCr, newCredits: userData.credits };
}

// =========================================================================
// 10. TORNEO SEMANAL OFICIAL GRAND PRIX ASÍNCRONO
// =========================================================================
const WEEKLY_TOURNAMENT_DATA = {
    title: "NEO-TOKYO HARBOR BAY GT GRAND PRIX",
    trackId: "neo_tokyo_bay",
    timeOfDay: "night",
    totalLaps: 3,
    prizeTon: 750,
    prizeCr: 500000,
    entryFeeCr: 500,
    endsIn: "2 días 14 horas",
    registeredPlayers: 1420,
    leaderboard: [
        { rank: 1, pilot: "Hans 'Blitz' Becker", car: "Chiron Pur Sport W16", lapTime: "36.84s", reward: "🏆 350 TON + 200.000 $CR" },
        { rank: 2, pilot: "Phantom_Silva", car: "Hyperion Senna 720S", lapTime: "37.12s", reward: "🥈 200 TON + 150.000 $CR" },
        { rank: 3, pilot: "Marco 'Apex' Rossi", car: "Valkyrie AMR Pro", lapTime: "37.58s", reward: "🥉 100 TON + 75.000 $CR" },
        { rank: 4, pilot: "Torque_Viper", car: "Dodge Viper ACR", lapTime: "38.05s", reward: "⭐ 50 TON + 40.000 $CR" },
        { rank: 5, pilot: "Grello_Manthey", car: "Porsche 911 GT3-RS", lapTime: "38.42s", reward: "⭐ 50 TON + 35.000 $CR" }
    ]
};

function getWeeklyTournamentInfo() {
    return WEEKLY_TOURNAMENT_DATA;
}

function enterWeeklyTournament() {
    const userData = loadNftUserData();
    if (userData.credits < WEEKLY_TOURNAMENT_DATA.entryFeeCr) {
        return { success: false, reason: "credits_insufficient" };
    }

    userData.credits -= WEEKLY_TOURNAMENT_DATA.entryFeeCr;
    userData.enteredWeeklyTournament = true;
    saveNftUserData(userData);
    return { success: true, tournament: WEEKLY_TOURNAMENT_DATA, remainingCredits: userData.credits };
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
