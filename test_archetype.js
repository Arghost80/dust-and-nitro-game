// Full validation test for generateCarSvg

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

function generateCarSvg(car, width = 180, height = 90) {
    if (!car) return '';
    const hex = car.colorHex || '#e53935';
    const lightColor = adjustHex(hex, 36);
    const darkColor = adjustHex(hex, -42);
    const safeId = 'car_' + String(car.instanceId || car.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '_');

    const name = (car.name || '').toLowerCase();
    const rarity = car.rarity || 'common';
    const parts = car.parts || { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 };

    let archetype = 'sports_sedan';
    if (name.includes('pickup') || name.includes('cargo')) archetype = 'pickup';
    else if (name.includes('rally') || name.includes('raider')) archetype = 'rally';
    else if (name.includes('hatch') || name.includes('metro') || name.includes('micro') || name.includes('swift')) archetype = 'hatchback';
    else if (rarity === 'legendary' || name.includes('hyper') || name.includes('senna') || name.includes('chiron') || name.includes('venom') || name.includes('lmh') || name.includes('valkyrie')) archetype = 'hypercar';
    else if (rarity === 'rare' || name.includes('gt3') || name.includes('gt4') || name.includes('challenge') || name.includes('cup') || name.includes('clubsport') || name.includes('dtm')) archetype = 'gt_pro';
    else if (name.includes('silvia') || name.includes('gt-r') || name.includes('turbo') || name.includes('spider') || name.includes('coupe')) archetype = 'tuner_coupe';

    const mintNum = (car.mintNumber || 44) % 100;
    const caliperColor = (parts.brakes && parts.brakes >= 3) ? '#eab308' : (parts.brakes && parts.brakes >= 1 ? '#ef4444' : '#f97316');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 110" width="${width}" height="${height}" class="rendered-car-vector">
    <defs>
        <linearGradient id="${safeId}_body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${lightColor}"/>
            <stop offset="22%" stop-color="${hex}"/>
            <stop offset="68%" stop-color="${hex}"/>
            <stop offset="100%" stop-color="${darkColor}"/>
        </linearGradient>

        <linearGradient id="${safeId}_glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="30%" stop-color="#38bdf8" stop-opacity="0.85"/>
            <stop offset="70%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
        </linearGradient>

        <linearGradient id="${safeId}_carbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#090d16"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#090d16"/>
        </linearGradient>

        <linearGradient id="${safeId}_wheel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#27272a"/>
            <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>

        <linearGradient id="${safeId}_headlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
        </linearGradient>
    </defs>

    <!-- 1. Suelo: Sombra de contacto suave + Neón de bajos -->
    <ellipse cx="118" cy="55" rx="104" ry="46" fill="rgba(0,0,0,0.72)"/>
    <ellipse cx="118" cy="55" rx="86" ry="34" fill="${hexToRgba(hex, 0.42)}"/>

    <!-- 2. Ruedas de Competición (4 Neumáticos Anchos con Llantas y Pinzas de Freno) -->
    <!-- Rueda Delantera Izq -->
    <g transform="translate(148, 7)">
        <rect x="0" y="0" width="34" height="15" rx="4" fill="url(#${safeId}_wheel)" stroke="#3f3f46" stroke-width="1"/>
        <line x1="6" y1="0" x2="6" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <line x1="14" y1="0" x2="14" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <line x1="22" y1="0" x2="22" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <rect x="7" y="2" width="20" height="11" rx="2" fill="#71717a"/>
        <circle cx="17" cy="7.5" r="4.2" fill="#d4d4d8"/>
        <circle cx="17" cy="7.5" r="1.5" fill="#18181b"/>
        <rect x="8" y="3" width="4" height="9" rx="1" fill="${caliperColor}"/>
        ${parts.tires > 0 ? `<line x1="0" y1="1" x2="34" y2="1" stroke="#facc15" stroke-width="1.2"/>` : ''}
    </g>

    <!-- Rueda Delantera Der -->
    <g transform="translate(148, 88)">
        <rect x="0" y="0" width="34" height="15" rx="4" fill="url(#${safeId}_wheel)" stroke="#3f3f46" stroke-width="1"/>
        <line x1="6" y1="0" x2="6" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <line x1="14" y1="0" x2="14" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <line x1="22" y1="0" x2="22" y2="15" stroke="#18181b" stroke-width="1.5"/>
        <rect x="7" y="2" width="20" height="11" rx="2" fill="#71717a"/>
        <circle cx="17" cy="7.5" r="4.2" fill="#d4d4d8"/>
        <circle cx="17" cy="7.5" r="1.5" fill="#18181b"/>
        <rect x="8" y="3" width="4" height="9" rx="1" fill="${caliperColor}"/>
        ${parts.tires > 0 ? `<line x1="0" y1="14" x2="34" y2="14" stroke="#facc15" stroke-width="1.2"/>` : ''}
    </g>

    <!-- Rueda Trasera Izq -->
    <g transform="translate(46, 5)">
        <rect x="0" y="0" width="38" height="17" rx="4" fill="url(#${safeId}_wheel)" stroke="#3f3f46" stroke-width="1"/>
        <line x1="7" y1="0" x2="7" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <line x1="16" y1="0" x2="16" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <line x1="25" y1="0" x2="25" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <rect x="8" y="2.5" width="22" height="12" rx="2" fill="#71717a"/>
        <circle cx="19" cy="8.5" r="4.8" fill="#d4d4d8"/>
        <circle cx="19" cy="8.5" r="2" fill="#18181b"/>
        <rect x="9" y="4" width="4" height="9" rx="1" fill="${caliperColor}"/>
        ${parts.tires > 0 ? `<line x1="0" y1="1" x2="38" y2="1" stroke="#facc15" stroke-width="1.2"/>` : ''}
    </g>

    <!-- Rueda Trasera Der -->
    <g transform="translate(46, 88)">
        <rect x="0" y="0" width="38" height="17" rx="4" fill="url(#${safeId}_wheel)" stroke="#3f3f46" stroke-width="1"/>
        <line x1="7" y1="0" x2="7" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <line x1="16" y1="0" x2="16" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <line x1="25" y1="0" x2="25" y2="17" stroke="#18181b" stroke-width="1.5"/>
        <rect x="8" y="2.5" width="22" height="12" rx="2" fill="#71717a"/>
        <circle cx="19" cy="8.5" r="4.8" fill="#d4d4d8"/>
        <circle cx="19" cy="8.5" r="2" fill="#18181b"/>
        <rect x="9" y="4" width="4" height="9" rx="1" fill="${caliperColor}"/>
        ${parts.tires > 0 ? `<line x1="0" y1="16" x2="38" y2="16" stroke="#facc15" stroke-width="1.2"/>` : ''}
    </g>

    <!-- 3. Splitter Delantero y Difusor Trasero de Competición -->
    <path d="M 216 38 L 225 47 Q 227 55 225 63 L 216 72 L 206 74 L 206 36 Z" fill="url(#${safeId}_carbon)" stroke="#334155" stroke-width="1"/>
    <!-- Canards frontales -->
    <polygon points="212,31 223,35 210,39" fill="#090d16"/>
    <polygon points="212,79 223,75 210,71" fill="#090d16"/>
    <!-- Difusor trasero con aletas de carbono -->
    <rect x="22" y="37" width="12" height="36" rx="2" fill="#090d16" stroke="#334155" stroke-width="1"/>
    <line x1="22" y1="44" x2="32" y2="44" stroke="#475569" stroke-width="1.5"/>
    <line x1="22" y1="55" x2="32" y2="55" stroke="#475569" stroke-width="1.5"/>
    <line x1="22" y1="66" x2="32" y2="66" stroke="#475569" stroke-width="1.5"/>
    <!-- Tubos de escape gemelos de titanio -->
    <circle cx="21" cy="45" r="3.5" fill="#18181b" stroke="#38bdf8" stroke-width="1.2"/>
    <circle cx="21" cy="65" r="3.5" fill="#18181b" stroke="#38bdf8" stroke-width="1.2"/>

    <!-- 4. Carrocería Principal Esculpida según Arquetipo -->
    ${archetype === 'pickup' ? `
        <!-- Pickup: Chasis de Largueros y Cabina -->
        <path d="M 30 27 L 195 27 Q 212 36 214 55 Q 212 74 195 83 L 30 83 Q 24 74 24 55 Q 24 36 30 27 Z"
              fill="url(#${safeId}_body)" stroke="${lightColor}" stroke-width="1.5"/>
        <!-- Caja trasera abierta con acabado estriado -->
        <rect x="34" y="33" width="70" height="44" rx="4" fill="#111827" stroke="#374151" stroke-width="2"/>
        <line x1="38" y1="42" x2="98" y2="42" stroke="#1f2937" stroke-width="2"/>
        <line x1="38" y1="55" x2="98" y2="55" stroke="#1f2937" stroke-width="2"/>
        <line x1="38" y1="68" x2="98" y2="68" stroke="#1f2937" stroke-width="2"/>
        <!-- Rueda de repuesto offroad en la caja -->
        <circle cx="68" cy="55" r="14" fill="#18181b" stroke="#4b5563" stroke-width="2"/>
        <circle cx="68" cy="55" r="7" fill="#71717a"/>
        <!-- Barra tubular con focos -->
        <rect x="104" y="31" width="6" height="48" rx="2" fill="#9ca3af"/>
        <circle cx="106" cy="42" r="3.5" fill="#facc15" stroke="#1f2937" stroke-width="1"/>
        <circle cx="106" cy="68" r="3.5" fill="#facc15" stroke="#1f2937" stroke-width="1"/>
    ` : (archetype === 'hatchback' ? `
        <!-- Hot Hatchback Compacto Deportivo -->
        <path d="M 32 25 L 192 26 Q 212 37 214 55 Q 212 73 192 84 L 32 85 Q 23 73 23 55 Q 23 37 32 25 Z"
              fill="url(#${safeId}_body)" stroke="${lightColor}" stroke-width="1.5"/>
        <!-- Alerón de techo deportivo -->
        <path d="M 22 28 L 32 30 L 32 80 L 22 82 Z" fill="url(#${safeId}_carbon)" stroke="#475569" stroke-width="1"/>
    ` : `
        <!-- Superdeportivo / GT3 / Hypercar Esculpido -->
        <path d="M 30 25
                 C 55 23, 75 30, 100 30
                 C 130 30, 155 24, 185 26
                 C 205 28, 216 42, 216 55
                 C 216 68, 205 82, 185 84
                 C 155 86, 130 80, 100 80
                 C 75 80, 55 87, 30 85
                 C 22 72, 22 38, 30 25 Z"
              fill="url(#${safeId}_body)" stroke="${lightColor}" stroke-width="1.5"/>
    `)}

    <!-- Pasos de rueda ensanchados -->
    <path d="M 140 25 L 190 25 L 186 30 L 144 30 Z" fill="#090d16" opacity="0.55"/>
    <path d="M 140 85 L 190 85 L 186 80 L 144 80 Z" fill="#090d16" opacity="0.55"/>
    <path d="M 38 24 L 90 24 L 86 29 L 42 29 Z" fill="#090d16" opacity="0.55"/>
    <path d="M 38 86 L 90 86 L 86 81 L 42 81 Z" fill="#090d16" opacity="0.55"/>

    <!-- 5. Franjas Racing y Diseños de Pintura -->
    ${rarity === 'legendary' || rarity === 'rare' ? `
        <line x1="28" y1="51" x2="214" y2="51" stroke="rgba(255,255,255,0.75)" stroke-width="3"/>
        <line x1="28" y1="59" x2="214" y2="59" stroke="rgba(255,255,255,0.75)" stroke-width="3"/>
    ` : (rarity === 'uncommon' ? `
        <line x1="30" y1="55" x2="210" y2="55" stroke="rgba(255,255,255,0.6)" stroke-width="5"/>
        <line x1="30" y1="55" x2="210" y2="55" stroke="${lightColor}" stroke-width="1.8"/>
    ` : '')}

    <!-- 6. Capó Delantero con Branquias y Tomas de Aire -->
    <path d="M 170 38 L 196 42 Q 204 55 196 68 L 170 72 Z" fill="#000000" opacity="0.18"/>
    <rect x="175" y="44" width="12" height="4" rx="1" fill="#090d16" stroke="#334155" stroke-width="0.8"/>
    <rect x="175" y="62" width="12" height="4" rx="1" fill="#090d16" stroke="#334155" stroke-width="0.8"/>

    ${archetype === 'rally' ? `
        <!-- Focos auxiliares rally en el capó -->
        <circle cx="206" cy="44" r="4.5" fill="#fef08a" stroke="#1f2937" stroke-width="1"/>
        <circle cx="208" cy="51" r="4.5" fill="#fef08a" stroke="#1f2937" stroke-width="1"/>
        <circle cx="208" cy="59" r="4.5" fill="#fef08a" stroke="#1f2937" stroke-width="1"/>
        <circle cx="206" cy="66" r="4.5" fill="#fef08a" stroke="#1f2937" stroke-width="1"/>
    ` : ''}

    <!-- 7. Cockpit & Cúpula Panorámica con Reflejo Glare -->
    <path d="M 148 37 C 158 40, 166 48, 166 55 C 166 62, 158 70, 148 73 L 138 73 C 146 66, 148 58, 148 55 C 148 52, 146 44, 138 37 Z"
          fill="url(#${safeId}_glass)" stroke="#475569" stroke-width="1"/>
    <path d="M 152 40 L 162 48 L 158 52 L 148 44 Z" fill="rgba(255,255,255,0.4)"/>

    <!-- Techo del Habitáculo -->
    <rect x="94" y="37" width="46" height="36" rx="4" fill="url(#${safeId}_body)" stroke="#1e293b" stroke-width="1"/>
    <path d="M 136 36 L 98 36 L 102 32 L 134 32 Z" fill="#090d16"/>
    <path d="M 136 74 L 98 74 L 102 78 L 134 78 Z" fill="#090d16"/>

    <!-- Retrovisores de Fibra de Carbono -->
    <ellipse cx="145" cy="30" rx="5" ry="3" fill="#090d16" stroke="#475569" stroke-width="0.8"/>
    <ellipse cx="145" cy="80" rx="5" ry="3" fill="#090d16" stroke="#475569" stroke-width="0.8"/>

    <!-- Dorsal Oficial / Roundel en el Techo -->
    <circle cx="117" cy="55" r="11" fill="#ffffff" stroke="#090d16" stroke-width="1.5"/>
    <text x="117" y="59" font-family="Arial, sans-serif" font-weight="900" font-size="10" fill="#090d16" text-anchor="middle">${mintNum}</text>

    <!-- Luna Trasera o Cubierta de Motor Central -->
    ${archetype === 'hypercar' || archetype === 'gt_pro' ? `
        <polygon points="92,38 92,72 60,67 60,43" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <line x1="86" y1="43" x2="66" y2="47" stroke="#ef4444" stroke-width="2"/>
        <line x1="86" y1="55" x2="66" y2="55" stroke="#94a3b8" stroke-width="2"/>
        <line x1="86" y1="67" x2="66" y2="63" stroke="#ef4444" stroke-width="2"/>
        <rect x="96" y="52" width="14" height="6" rx="2" fill="#090d16" stroke="#38bdf8" stroke-width="1"/>
    ` : `
        <polygon points="92,38 92,72 65,68 65,42" fill="url(#${safeId}_glass)" stroke="#475569" stroke-width="1"/>
        <line x1="88" y1="46" x2="70" y2="48" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <line x1="88" y1="55" x2="70" y2="55" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <line x1="88" y1="64" x2="70" y2="62" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    `}

    <!-- 8. Alerón Trasero GT / Hypercar -->
    ${archetype === 'hypercar' ? `
        <line x1="42" y1="44" x2="28" y2="44" stroke="#64748b" stroke-width="2.5"/>
        <line x1="42" y1="66" x2="28" y2="66" stroke="#64748b" stroke-width="2.5"/>
        <rect x="22" y="20" width="8" height="70" rx="3" fill="url(#${safeId}_carbon)" stroke="#94a3b8" stroke-width="1"/>
        <rect x="18" y="18" width="14" height="6" rx="1.5" fill="${hex}" stroke="#ffffff" stroke-width="0.8"/>
        <rect x="18" y="86" width="14" height="6" rx="1.5" fill="${hex}" stroke="#ffffff" stroke-width="0.8"/>
        <line x1="56" y1="55" x2="26" y2="55" stroke="url(#${safeId}_carbon)" stroke-width="3"/>
    ` : (archetype === 'gt_pro' || archetype === 'tuner_coupe' ? `
        <line x1="38" y1="45" x2="28" y2="45" stroke="#475569" stroke-width="2"/>
        <line x1="38" y1="65" x2="28" y2="65" stroke="#475569" stroke-width="2"/>
        <rect x="24" y="24" width="7" height="62" rx="2.5" fill="url(#${safeId}_carbon)" stroke="#cbd5e1" stroke-width="1"/>
        <rect x="22" y="23" width="11" height="4" rx="1" fill="${darkColor}"/>
        <rect x="22" y="83" width="11" height="4" rx="1" fill="${darkColor}"/>
    ` : (archetype !== 'pickup' ? `
        <rect x="28" y="34" width="4" height="42" rx="1.5" fill="#090d16" stroke="#475569" stroke-width="0.8"/>
    ` : ''))}

    <!-- 9. Faros LED Proyectores Delanteros y Pilotos Traseros Neón -->
    <path d="M 200 36 L 210 40 L 204 46 L 196 42 Z" fill="#ffffff"/>
    <path d="M 200 74 L 210 70 L 204 64 L 196 68 Z" fill="#ffffff"/>
    <polygon points="212,38 238,26 238,46 210,43" fill="url(#${safeId}_headlight)" opacity="0.6"/>
    <polygon points="212,72 238,64 238,84 210,67" fill="url(#${safeId}_headlight)" opacity="0.6"/>

    <rect x="27" y="33" width="3" height="10" rx="1" fill="#ff1744"/>
    <rect x="27" y="67" width="3" height="10" rx="1" fill="#ff1744"/>
    <line x1="28" y1="43" x2="28" y2="67" stroke="#ff1744" stroke-width="1.5" opacity="0.85"/>
</svg>`;
}

const testCars = [
    { name: "Monza Hatch 1.4", rarity: "common", colorHex: "#e53935", mintNumber: 1042 },
    { name: "Nevada Dust Pickup", rarity: "common", colorHex: "#e53935", mintNumber: 8565 },
    { name: "Baltic Rally Cup", rarity: "common", colorHex: "#991b1b", mintNumber: 5265 },
    { name: "HYPERION 720 SENNA GT", rarity: "legendary", colorHex: "#06b6d4", mintNumber: 1001 }
];

testCars.forEach(c => {
    const s = generateCarSvg(c, 200, 100);
    console.log(`Rendered: ${c.name} (${c.rarity}) -> SVG length: ${s.length} chars, valid: ${s.includes('</svg>')}`);
});
