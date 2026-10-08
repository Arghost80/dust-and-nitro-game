// ===== CATÁLOGO DE 75+ VEHÍCULOS NFT WEB3, CAJAS MISTERIOSAS Y GARAJE =====

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

// 73 Modelos Base detallados clasificados por Rareza
const NFT_CAR_MODELS = [
    // --- 28 COMUNES (Utilitarios, Compactos, Hatchbacks, Berlinas urbanas) ---
    { id: "c_01", name: "Monza Hatch 1.4", rarity: "common", speed: 285, accel: 155, handling: 3.3, sprite: "car_red", desc: "Compacto ágil urbano ideal para principiantes" },
    { id: "c_02", name: "Tokyo Metro Turbo", rarity: "common", speed: 290, accel: 160, handling: 3.4, sprite: "car_blue", desc: "Hatchback japonés con turbo ligero" },
    { id: "c_03", name: "Bavaria Compact 318", rarity: "common", speed: 292, accel: 158, handling: 3.4, sprite: "car_green", desc: "Tracción trasera equilibrada con chasis noble" },
    { id: "c_04", name: "Detroit Rebel Coupe", rarity: "common", speed: 298, accel: 150, handling: 3.2, sprite: "car_yellow", desc: "Cupé americano con par motor a bajas vueltas" },
    { id: "c_05", name: "Iberian Sport 16V", rarity: "common", speed: 288, accel: 162, handling: 3.5, sprite: "car_orange", desc: "Tracción delantera deportiva de copa monomarca" },
    { id: "c_06", name: "Nordic City Wagon", rarity: "common", speed: 284, accel: 154, handling: 3.3, sprite: "car_cyan", desc: "Familiar sueco reforzado con estabilidad en agua" },
    { id: "c_07", name: "Riviera Sprint Micro", rarity: "common", speed: 280, accel: 168, handling: 3.6, sprite: "car_red", desc: "Peso pluma hiperreactivo en curvas ratoneras" },
    { id: "c_08", name: "Shibuya Cruiser 1.8", rarity: "common", speed: 294, accel: 156, handling: 3.3, sprite: "car_blue", desc: "Sedán urbano japonés fiable y dócil" },
    { id: "c_09", name: "Verona Eco Pulse", rarity: "common", speed: 282, accel: 164, handling: 3.5, sprite: "car_green", desc: "Híbrido de aceleración instantánea en salida" },
    { id: "c_10", name: "Saxon Classic 1.6", rarity: "common", speed: 286, accel: 155, handling: 3.3, sprite: "car_yellow", desc: "Berlina tradicional de ingeniería alemana básica" },
    { id: "c_11", name: "Corsica Street Boy", rarity: "common", speed: 289, accel: 160, handling: 3.4, sprite: "car_orange", desc: "Preparación de calle con escape deportivo homologado" },
    { id: "c_12", name: "Osaka Swift R", rarity: "common", speed: 291, accel: 165, handling: 3.5, sprite: "car_cyan", desc: "Divertido y ligero para tramos de montaña" },
    { id: "c_13", name: "Autobahn Star 180", rarity: "common", speed: 302, accel: 148, handling: 3.2, sprite: "car_red", desc: "Aerodinámica optimizada para cruceros rápidos" },
    { id: "c_14", name: "Nevada Dust Pickup", rarity: "common", speed: 280, accel: 152, handling: 3.1, sprite: "car_blue", desc: "Robusto chasis de largueros resistente a impactos" },
    { id: "c_15", name: "Roma Piccolo GT", rarity: "common", speed: 287, accel: 162, handling: 3.5, sprite: "car_green", desc: "Estilo italiano elegante con motor puntiagudo" },
    { id: "c_16", name: "Lyon Tourer 2.0", rarity: "common", speed: 293, accel: 158, handling: 3.3, sprite: "car_yellow", desc: "Excelente amortiguación para bordillos y baches" },
    { id: "c_17", name: "Baltic Rally Cup", rarity: "common", speed: 285, accel: 166, handling: 3.6, sprite: "car_orange", desc: "Ajuste de suspensión elevada para tierra y gravilla" },
    { id: "c_18", name: "Kyoto Breeze", rarity: "common", speed: 288, accel: 159, handling: 3.4, sprite: "car_cyan", desc: "Silencioso pero con paso por curva progresivo" },
    { id: "c_19", name: "Texas Cargo Custom", rarity: "common", speed: 296, accel: 151, handling: 3.2, sprite: "car_red", desc: "Fuerza bruta con eje rígido trasero" },
    { id: "c_20", name: "Britannia City 1.2", rarity: "common", speed: 281, accel: 161, handling: 3.5, sprite: "car_blue", desc: "Herencia británica compacta con tacto directo" },
    { id: "c_21", name: "Alpine Glacier Mini", rarity: "common", speed: 283, accel: 163, handling: 3.6, sprite: "car_green", desc: "Gran agarre mecánico sobre asfalto húmedo" },
    { id: "c_22", name: "Andes Trail 4x4", rarity: "common", speed: 282, accel: 157, handling: 3.3, sprite: "car_yellow", desc: "Tracción integral permanente básica" },
    { id: "c_23", name: "Sahara Dune Runner", rarity: "common", speed: 289, accel: 159, handling: 3.4, sprite: "car_orange", desc: "Filtro de aire para tormentas de polvo" },
    { id: "c_24", name: "Thames Classic Van", rarity: "common", speed: 278, accel: 150, handling: 3.1, sprite: "car_cyan", desc: "Furgoneta clásica de carreras con centro de gravedad bajo" },
    { id: "c_25", name: "Madrid Urban Go", rarity: "common", speed: 286, accel: 162, handling: 3.5, sprite: "car_red", desc: "Relación de marchas corta para acelerar entre horquillas" },
    { id: "c_26", name: "Stuttgart Urban A", rarity: "common", speed: 295, accel: 159, handling: 3.4, sprite: "car_blue", desc: "Construcción sólida y frenada equilibrada" },
    { id: "c_27", name: "Seoul Spark GT", rarity: "common", speed: 290, accel: 164, handling: 3.5, sprite: "car_green", desc: "Electrónica moderna con control de tracción deportivo" },
    { id: "c_28", name: "Pacific Coast Rover", rarity: "common", speed: 292, accel: 156, handling: 3.3, sprite: "car_yellow", desc: "Estabilidad en línea recta con vientos cruzados" },

    // --- 20 INFRECUENTES (Deportivos de Calle, JDM Tuning, Muscle Cars, Rally Turbos) ---
    { id: "u_01", name: "Fuji Silhouette RS", rarity: "uncommon", speed: 332, accel: 205, handling: 3.9, sprite: "car_blue", desc: "Ícono JDM con turbo de doble entrada y tracción total" },
    { id: "u_02", name: "Stuttgart Boxer 718", rarity: "uncommon", speed: 338, accel: 210, handling: 4.1, sprite: "car_yellow", desc: "Motor bóxer central con reparto de masas ideal 50:50" },
    { id: "u_03", name: "Detroit V8 Interceptor", rarity: "uncommon", speed: 345, accel: 198, handling: 3.7, sprite: "car_red", desc: "Bloque motor V8 atmosférico con rugido ensordecedor" },
    { id: "u_04", name: "Briton Falcon Sprint", rarity: "uncommon", speed: 334, accel: 202, handling: 4.0, sprite: "car_green", desc: "Chasis tubular de aluminio con agilidad felina" },
    { id: "u_05", name: "Rally Evo Integrale", rarity: "uncommon", speed: 328, accel: 218, handling: 4.1, sprite: "car_orange", desc: "Tracción integral con diferenciales activos de rally" },
    { id: "u_06", name: "Alpine Apex A110", rarity: "uncommon", speed: 330, accel: 212, handling: 4.2, sprite: "car_cyan", desc: "Ultraligero francés con pasos por curva hipnóticos" },
    { id: "u_07", name: "Scandia Turbo Polar", rarity: "uncommon", speed: 340, accel: 200, handling: 3.8, sprite: "car_blue", desc: "Motor de 5 cilindros con enorme empuje a medio régimen" },
    { id: "u_08", name: "Milan Veloce 2.0T", rarity: "uncommon", speed: 336, accel: 206, handling: 4.0, sprite: "car_red", desc: "Diseño pasional italiano con dirección hipersensible" },
    { id: "u_09", name: "Tokyo Drift Spec-S", rarity: "uncommon", speed: 331, accel: 214, handling: 4.1, sprite: "car_orange", desc: "Diferencial autoblocante tarado al 80% para drift" },
    { id: "u_10", name: "Bavaria M-Sport Coupe", rarity: "uncommon", speed: 342, accel: 208, handling: 3.9, sprite: "car_green", desc: "Seis cilindros en línea biturbo afinado en circuito" },
    { id: "u_11", name: "Iberian Cupra R", rarity: "uncommon", speed: 335, accel: 211, handling: 4.0, sprite: "car_yellow", desc: "Autoblocante mecánico delantero VAQ invencible" },
    { id: "u_12", name: "Mustang Canyon Mach", rarity: "uncommon", speed: 346, accel: 196, handling: 3.7, sprite: "car_red", desc: "Músculo puro optimizado para aceleraciones en recta" },
    { id: "u_13", name: "Yokohama Silvia 200", rarity: "uncommon", speed: 333, accel: 209, handling: 4.0, sprite: "car_cyan", desc: "Tracción trasera legendaria para enlazar curvas" },
    { id: "u_14", name: "Modena Spider Sport", rarity: "uncommon", speed: 339, accel: 207, handling: 4.0, sprite: "car_red", desc: "Carrocería descapotable con centro de gravedad rebajado" },
    { id: "u_15", name: "Coventry Eagle V6", rarity: "uncommon", speed: 341, accel: 204, handling: 3.9, sprite: "car_green", desc: "Compresor volumétrico con respuesta instantánea al acelerador" },
    { id: "u_16", name: "Nürburg Clubsport 230", rarity: "uncommon", speed: 337, accel: 212, handling: 4.1, sprite: "car_yellow", desc: "Jaula antivuelco integrada y frenos perforados" },
    { id: "u_17", name: "Sahara Raider Trophy", rarity: "uncommon", speed: 326, accel: 215, handling: 3.8, sprite: "car_orange", desc: "Amortiguadores de triple bypass para saltos y peraltes" },
    { id: "u_18", name: "Suzuka Circuit R", rarity: "uncommon", speed: 338, accel: 213, handling: 4.2, sprite: "car_blue", desc: "Alerón regulable en 5 posiciones para apoyo aerodinámico" },
    { id: "u_19", name: "Black Forest Turbo", rarity: "uncommon", speed: 344, accel: 205, handling: 3.9, sprite: "car_cyan", desc: "Intercooler sobredimensionado para rendir al 100% en calor" },
    { id: "u_20", name: "Daytona Pace Car", rarity: "uncommon", speed: 343, accel: 201, handling: 3.8, sprite: "car_yellow", desc: "Luces estroboscópicas de seguridad y chasis reforzado" },

    // --- 15 RAROS (Competición GT4, Turismos TCR Oficiales, Superdeportivos de Circuito) ---
    { id: "r_01", name: "Corsa GT4 Clubsport", rarity: "rare", speed: 375, accel: 245, handling: 4.5, sprite: "car_red", desc: "Bólido oficial de copa GT4 con frenos cerámicos Brembo" },
    { id: "r_02", name: "Nürburg M4 Competition", rarity: "rare", speed: 382, accel: 242, handling: 4.4, sprite: "car_green", desc: "Aerodinámica de fibra de carbono probada en el Infierno Verde" },
    { id: "r_03", name: "Silverstone Vantage AMR", rarity: "rare", speed: 378, accel: 248, handling: 4.5, sprite: "car_blue", desc: "División de carreras británica con cambio secuencial" },
    { id: "r_04", name: "Scuderia 458 Challenge", rarity: "rare", speed: 384, accel: 250, handling: 4.6, sprite: "car_red", desc: "V8 atmosférico girando a 9.000 RPM en circuito" },
    { id: "r_05", name: "Yokohama GT-R Spec-V", rarity: "rare", speed: 388, accel: 255, handling: 4.4, sprite: "car_cyan", desc: "Monstruo de tracción integral ATTESA E-TS Pro" },
    { id: "r_06", name: "Stuttgart Carrera GTS", rarity: "rare", speed: 380, accel: 246, handling: 4.6, sprite: "car_yellow", desc: "Ancho de vías ensanchado y llantas monotuerca de magnesio" },
    { id: "r_07", name: "Detroit Z06 Track Edition", rarity: "rare", speed: 389, accel: 240, handling: 4.3, sprite: "car_orange", desc: "V8 con cigüeñal plano y splitters aerodinámicos masivos" },
    { id: "r_08", name: "Briton Superleggera GT", rarity: "rare", speed: 382, accel: 252, handling: 4.5, sprite: "car_blue", desc: "Construcción aligerada en titanio para una relación peso/potencia récord" },
    { id: "r_09", name: "Monza Cup Trofeo", rarity: "rare", speed: 376, accel: 247, handling: 4.5, sprite: "car_red", desc: "Puesta a punto radical para chicanes de alta velocidad" },
    { id: "r_10", name: "Hyperion Aero Sport", rarity: "rare", speed: 385, accel: 249, handling: 4.6, sprite: "car_cyan", desc: "Fondo plano con efecto suelo y difusor de carbono venturi" },
    { id: "r_11", name: "Alpine Endurance Cup", rarity: "rare", speed: 372, accel: 256, handling: 4.7, sprite: "car_blue", desc: "Diseñado para pruebas de resistencia de 24 horas continuas" },
    { id: "r_12", name: "Bavaria DTM Silhouette", rarity: "rare", speed: 386, accel: 244, handling: 4.5, sprite: "car_green", desc: "DRS activable y carrocería de fibra de carbono monocasco" },
    { id: "r_13", name: "Sakura GT500 Concept", rarity: "rare", speed: 387, accel: 252, handling: 4.6, sprite: "car_orange", desc: "Prototipo japonés de la categoría reina Super GT" },
    { id: "r_14", name: "Sarthe Prototype Lite", rarity: "rare", speed: 381, accel: 258, handling: 4.7, sprite: "car_yellow", desc: "Cockpit cerrado con aerodinámica de prototipo LMP3" },
    { id: "r_15", name: "Interlagos Formula Apex", rarity: "rare", speed: 389, accel: 254, handling: 4.6, sprite: "car_red", desc: "Ajuste agresivo de suspensión para cambios de rasante bruscos" },

    // --- 10 LEGENDARIOS (Hypercars Exóticos, Prototipos Le Mans LMH y Bólidos GT3 de Élite) ---
    { id: "leg_01", name: "HYPERION 720 SENNA GT", rarity: "legendary", speed: 435, accel: 305, handling: 5.1, sprite: "car_cyan", desc: "Hypercar de 800 CV con aerodinámica activa y frenada regenerative KERS" },
    { id: "leg_02", name: "CORSA ROSSO 488 GT3 PISTA", rarity: "legendary", speed: 428, accel: 298, handling: 5.0, sprite: "car_red", desc: "Campeón de las 24H de Spa con motor V8 Twin-Turbo optimizado" },
    { id: "leg_03", name: "STUTTGART 911 GT3-R GRELLO", rarity: "legendary", speed: 432, accel: 302, handling: 5.2, sprite: "car_yellow", desc: "La leyenda del Nürburgring con el legendario esquema Manthey Racing" },
    { id: "leg_04", name: "VALKYRIE AMR PRO V12", rarity: "legendary", speed: 440, accel: 310, handling: 5.1, sprite: "car_blue", desc: "Monstruo V12 atmosférico de 1.000 CV que desafía las leyes de la física" },
    { id: "leg_05", name: "BAVARIA M4 BEAST GT3 ROWE", rarity: "legendary", speed: 430, accel: 295, handling: 4.9, sprite: "car_green", desc: "Acorazado alemán ganador de campeonatos de resistencia mundial" },
    { id: "leg_06", name: "SOLARIS DAME GT3 LE MANS", rarity: "legendary", speed: 426, accel: 300, handling: 5.0, sprite: "car_orange", desc: "Bólido del equipo Iron Dames con librea rosa-magenta de alta tecnología" },
    { id: "leg_07", name: "CHIRON PUR SPORT APEX", rarity: "legendary", speed: 442, accel: 315, handling: 4.8, sprite: "car_blue", desc: "Motor W16 Quad-Turbo de 1.500 CV con alerón fijo masivo de 1.9 metros" },
    { id: "leg_08", name: "LA CORSA HYPER HYBRID", rarity: "legendary", speed: 436, accel: 308, handling: 5.1, sprite: "car_red", desc: "Potencia híbrida combinada de 963 CV con monocasco de fibra de carbono T800" },
    { id: "leg_09", name: "SARTHE HYPERCAR LMH-01", rarity: "legendary", speed: 438, accel: 312, handling: 5.2, sprite: "car_yellow", desc: "Prototipo de la categoría reina de las 24 Horas de Le Mans" },
    { id: "leg_10", name: "VENOM F5 ABSOLUTE AERO", rarity: "legendary", speed: 445, accel: 320, handling: 4.9, sprite: "car_cyan", desc: "El vehículo de producción más rápido del planeta con coeficiente aerodinámico 0.33" }
];

// Definición de las 3 Cajas Misteriosas NFT (Web3 Loot Boxes)
const NFT_CRATES = {
    bronze: {
        id: "bronze",
        nameKey: "crate_bronze_title",
        cost: 500,
        currency: "credits", // $CR
        odds: { common: 0.80, uncommon: 0.18, rare: 0.02, legendary: 0.00 },
        badgeColor: 0xcd7f32
    },
    silver: {
        id: "silver",
        nameKey: "crate_silver_title",
        cost: 1500,
        currency: "credits", // $CR
        odds: { common: 0.35, uncommon: 0.45, rare: 0.18, legendary: 0.02 },
        badgeColor: 0xc0c0c0
    },
    gold: {
        id: "gold",
        nameKey: "crate_gold_title",
        cost: 250,
        currency: "gems", // Gemas $TON
        odds: { common: 0.05, uncommon: 0.25, rare: 0.50, legendary: 0.20 },
        badgeColor: 0xffd700
    }
};

// Guardado del Usuario Web3 (Créditos, Gemas, Garaje de NFTs coleccionados)
function loadNftUserData() {
    let data = null;
    try {
        const raw = localStorage.getItem('apex_web3_garage_save');
        if (raw) data = JSON.parse(raw);
    } catch(e) {}

    if (!data) {
        // Estado inicial de nuevo jugador: 3,000 $CR, 600 Gemas y coche inicial Monza Hatch
        const starterColor = NFT_CAR_COLORS[0];
        const starterCar = {
            instanceId: "nft_inst_001",
            modelId: "c_01",
            name: "Monza Hatch 1.4",
            rarity: "common",
            colorName: starterColor.name,
            colorHex: starterColor.hex,
            tint: starterColor.tint,
            mintNumber: 1042,
            tokenHash: "0x7a3f89b...c41e",
            speed: 285,
            accel: 155,
            handling: 3.3,
            sprite: "car_red",
            obtainedAt: Date.now()
        };

        data = {
            credits: 3500,
            gems: 600,
            equippedInstanceId: starterCar.instanceId,
            garage: [starterCar]
        };
        saveNftUserData(data);
    }
    return data;
}

function saveNftUserData(data) {
    try {
        localStorage.setItem('apex_web3_garage_save', JSON.stringify(data));
    } catch(e) {}
}

// Acuñar (Mint) un coche NFT con token hash, número de serie y color aleatorio
function mintProceduralNftCar(modelDef, forcedColor = null) {
    const chosenColor = forcedColor || NFT_CAR_COLORS[Math.floor(Math.random() * NFT_CAR_COLORS.length)];
    const mintNum = Math.floor(1000 + Math.random() * 8999);
    const randomHex = Math.floor(Math.random() * 0xffffffffff).toString(16).padStart(10, '0');
    const tokenHash = `0x${randomHex.slice(0, 4)}...${randomHex.slice(-4)}`;

    // Ligera variación procedural de estadísticas (+/- 2% en rendimiento según tirada)
    const statVar = (Math.random() - 0.5) * 0.04;
    const finalSpeed = Math.round(modelDef.speed * (1 + statVar));
    const finalAccel = Math.round(modelDef.accel * (1 + statVar));
    const finalHandling = parseFloat((modelDef.handling * (1 + statVar * 0.5)).toFixed(2));

    return {
        instanceId: `nft_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        modelId: modelDef.id,
        name: modelDef.name,
        rarity: modelDef.rarity,
        desc: modelDef.desc,
        colorName: chosenColor.name,
        colorHex: chosenColor.hex,
        tint: chosenColor.tint,
        mintNumber: mintNum,
        tokenHash: tokenHash,
        speed: finalSpeed,
        accel: finalAccel,
        handling: finalHandling,
        sprite: modelDef.sprite,
        obtainedAt: Date.now()
    };
}

// Abrir una Caja Misteriosa NFT con cálculo de probabilidades
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

    // Tirada de rareza según odds
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

    // Filtrar modelos disponibles para esa rareza
    const pool = NFT_CAR_MODELS.filter(m => m.rarity === pickedRarity);
    const chosenModel = pool[Math.floor(Math.random() * pool.length)] || NFT_CAR_MODELS[0];

    // Acuñar el vehículo
    const mintedCar = mintProceduralNftCar(chosenModel);

    // Guardar en el garaje del usuario
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

// Obtener el coche actualmente equipado para correr en pista
function getEquippedNftCar() {
    const userData = loadNftUserData();
    const equipped = userData.garage.find(c => c.instanceId === userData.equippedInstanceId);
    if (equipped) return equipped;
    return userData.garage[0];
}
