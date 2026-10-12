with open('nft_cars_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'function generateCarSvg(car, width = 180, height = 90) {'
pos = content.find(target)
if pos == -1:
    print('Target not found!')
else:
    print('Found target at position:', pos)
    prefix = content[:pos]
    
    new_code = '''function hashString(str) {
    let hash = 0;
    if (!str) return 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getCarPhotorealModelId(car) {
    if (!car) return 1;
    const name = (car.name || '').toLowerCase();
    const rarity = car.rarity || 'common';
    const id = (car.id || '').toLowerCase();

    // 1. Coincidencias específicas por modelo y competición real:
    if (name.includes('senna') || name.includes('hyperion') || name.includes('720') || name.includes('mclaren')) return 6; // McLaren 720S Gulf
    if (name.includes('488') || name.includes('corsa rosso') || name.includes('ferrari') || name.includes('la corsa') || name.includes('pista')) return 2; // Ferrari 296 GT3 Corsa
    if (name.includes('911') || name.includes('grello') || name.includes('stuttgart') || name.includes('porsche')) return 1; // Porsche 911 GT3-R Manthey Grello
    if (name.includes('valkyrie') || name.includes('amr') || name.includes('aston')) return 3; // Aston Martin Vantage GT3
    if (name.includes('m4') || name.includes('bavaria') || name.includes('rowe') || name.includes('bmw')) return 4; // BMW M4 GT3 ROWE
    if (name.includes('dame') || name.includes('solaris') || name.includes('amg') || name.includes('iron')) return 5; // Mercedes AMG GT3 Iron Dames
    if (name.includes('chiron') || name.includes('pur sport') || name.includes('bugatti')) return 11; // Velocity Aero Hypercar
    if (name.includes('lmh') || name.includes('sarthe') || name.includes('le mans')) return 12; // Astroty LMH Prototype
    if (name.includes('venom') || name.includes('f5') || name.includes('hennessey')) return 10; // Nexus Trackday Prototype
    if (name.includes('quantum')) return 7; // Quantum Le Mans Hypercar
    if (name.includes('challenger')) return 8; // Challenger Cyber Hypercar
    if (name.includes('e-force') || name.includes('hybrid')) return 9; // E-Force Endurance Prototype

    // JDM & Street Tuner Legends:
    if (name.includes('skyline') || name.includes('gt-r') || name.includes('r34') || name.includes('tokyo') || name.includes('shibuya')) return 13; // Nissan Skyline GT-R R34
    if (name.includes('supra') || name.includes('boost')) return 14; // Toyota Supra MK4 Carbon
    if (name.includes('rx-7') || name.includes('rx') || name.includes('phantom') || name.includes('drift')) return 15; // Mazda RX-7 FD Spirit R
    if (name.includes('nsx') || name.includes('type-r') || name.includes('championship')) return 16; // Honda NSX Type-R
    if (name.includes('lancer') || name.includes('evo')) return 17; // Mitsubishi Lancer Evo IX
    if (name.includes('impreza') || name.includes('wrx') || name.includes('boxer') || name.includes('kyoto') || name.includes('osaka')) return 18; // Subaru Impreza WRX STI

    // Trophy Trucks, Dakar & Offroad:
    if (name.includes('pickup') || name.includes('cargo') || name.includes('dune') || name.includes('runner') || name.includes('sahara') || name.includes('nevada') || name.includes('texas')) return 19; // Ford Raptor Trophy Truck con ruedas traseras de repuesto
    if (name.includes('dakar') || name.includes('raider') || name.includes('buggy')) return 22; // Dakar Buggy Orange

    // Rally Legends & Hatchbacks:
    if (name.includes('quattro') || name.includes('group b') || name.includes('s1') || name.includes('audi')) return 20; // Audi Sport Quattro S1 E2
    if (name.includes('integrale') || name.includes('martini') || name.includes('lancia') || name.includes('baltic')) return 21; // Lancia Delta Integrale Martini
    if (name.includes('cooper') || name.includes('mini') || name.includes('britannia') || name.includes('monza') || name.includes('micro') || name.includes('hatch')) return 23; // Classic Mini Cooper Rally
    if (name.includes('viper') || name.includes('rebel') || name.includes('detroit')) return 24; // Dodge Viper ACR Extreme

    // 2. Fallbacks equilibrados por rareza para los 73 coches:
    const hash = hashString(name || id);
    if (rarity === 'legendary') {
        const pool = [6, 2, 1, 3, 4, 5, 11, 9, 12, 10];
        return pool[hash % pool.length];
    }
    if (rarity === 'rare') {
        const pool = [1, 2, 3, 4, 5, 24, 13, 14, 15, 16];
        return pool[hash % pool.length];
    }
    if (rarity === 'uncommon') {
        const pool = [13, 14, 15, 17, 18, 20, 21, 24];
        return pool[hash % pool.length];
    }
    // common
    const pool = [13, 15, 17, 18, 19, 21, 22, 23];
    return pool[hash % pool.length];
}

function generateCarSvg(car, width = 180, height = 90) {
    if (!car) return '';
    const modelId = getCarPhotorealModelId(car);
    const imgSrc = `assets/cars/car_${modelId}.png`;
    const mintNum = (car.mintNumber || 44) % 100;
    const safeId = 'car_glow_' + String(car.instanceId || car.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '_');
    const glowColor = car.colorHex || '#38bdf8';
    const rarity = car.rarity || 'common';

    const rarityBadgeColors = {
        common: '#94a3b8',
        uncommon: '#10b981',
        rare: '#3b82f6',
        legendary: '#f59e0b'
    };
    const badgeColor = rarityBadgeColors[rarity] || '#38bdf8';

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 110" width="${width}" height="${height}" class="rendered-car-vector photoreal-car-svg">
    <defs>
        <!-- Resplandor Neón de Estudio en la Base del Garaje -->
        <radialGradient id="${safeId}_neon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.35"/>
            <stop offset="65%" stop-color="${glowColor}" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="${glowColor}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${safeId}_contact" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.75"/>
            <stop offset="65%" stop-color="#000000" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
    </defs>

    <!-- 1. Pedestal de exhibición de estudio con halo de luz -->
    <ellipse cx="120" cy="55" rx="108" ry="42" fill="url(#${safeId}_neon)"/>
    <ellipse cx="120" cy="62" rx="92" ry="24" fill="url(#${safeId}_contact)"/>

    <!-- 2. Coche Fotorrealista de Competición en Alta Definición (Transparencia Real) -->
    <image href="${imgSrc}" xlink:href="${imgSrc}" x="12" y="6" width="216" height="98" preserveAspectRatio="xMidYMid meet" class="photoreal-car-texture"/>

    <!-- 3. Insignia Oficial de Carrera / Dorsal Mint NFT -->
    <rect x="190" y="6" width="44" height="17" rx="4" fill="rgba(15, 23, 42, 0.88)" stroke="${badgeColor}" stroke-width="1"/>
    <text x="212" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="9.5" fill="#f8fafc" text-anchor="middle">#${mintNum}</text>
</svg>`;
}
'''
    with open('nft_cars_data.js', 'w', encoding='utf-8') as f:
        f.write(prefix + new_code)
    print('Updated nft_cars_data.js successfully!')
