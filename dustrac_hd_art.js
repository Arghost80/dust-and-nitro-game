// ===== DUST RACING 2D: MODERN ULTRA-HD ARTWORK GENERATOR =====
// Genera texturas de alta resolución (HD), sombreado 3D, pianos biselados con relieve,
// césped con rayas de corte profesionales y coches deportivos con acabado metálico brillante.

function createDustracHDArt(scene) {
    const tm = scene.textures;

    function getCvs(key, w, h) {
        if (tm.exists(key)) tm.remove(key);
        const cvs = tm.createCanvas(key, w, h);
        const ctx = cvs.context || (cvs.canvas && cvs.canvas.getContext('2d'));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        return { cvs, ctx, w, h };
    }

    // =========================================================================
    // 1. CÉSPED ULTRA-HD PROFESIONAL CON RAYAS DE CORTE (512x512)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_grass', 512, 512);

        // Fondo verde deportivo base
        ctx.fillStyle = '#265c2e';
        ctx.fillRect(0, 0, 512, 512);

        // Rayas de corte de césped tipo circuito de Fórmula 1 (mowing stripes)
        const stripeWidth = 64;
        for (let x = 0; x < 512; x += stripeWidth) {
            const isLight = (Math.floor(x / stripeWidth) % 2 === 0);
            ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.055)' : 'rgba(0, 0, 0, 0.065)';
            ctx.fillRect(x, 0, stripeWidth, 512);
        }

        // Micro-textura orgánica de briznas de hierba
        for (let i = 0; i < 900; i++) {
            const rx = Math.random() * 512;
            const ry = Math.random() * 512;
            const isBright = Math.random() > 0.45;
            ctx.fillStyle = isBright ? 'rgba(129, 199, 132, 0.35)' : 'rgba(27, 94, 32, 0.35)';
            ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 3 + 1);
        }

        cvs.refresh();
    }

    // =========================================================================
    // 2. TRAMPA DE ARENA / GRAVA HD CON ONDULACIONES (512x512)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_sand', 512, 512);
        ctx.fillStyle = '#c7a25d';
        ctx.fillRect(0, 0, 512, 512);

        // Ondulaciones suaves de rastrillo en la arena
        for (let y = 0; y < 512; y += 12) {
            ctx.fillStyle = (y % 24 === 0) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(93, 64, 55, 0.08)';
            ctx.fillRect(0, y, 512, 6);
        }

        // Grano fino de gravilla
        for (let i = 0; i < 800; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(78, 52, 46, 0.25)';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        cvs.refresh();
    }

    // =========================================================================
    // 3. TRANSICIONES ARENA - CÉSPED HD (512x512)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_sandGrassStraight', 512, 512);
        ctx.fillStyle = '#265c2e';
        ctx.fillRect(0, 0, 512, 512);

        const grad = ctx.createLinearGradient(0, 0, 512, 0);
        grad.addColorStop(0, '#c7a25d');
        grad.addColorStop(0.55, '#c7a25d');
        grad.addColorStop(0.8, 'rgba(199, 162, 93, 0.5)');
        grad.addColorStop(1, 'rgba(199, 162, 93, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        cvs.refresh();

        const { cvs: cvsC, ctx: ctxC } = getCvs('dt_sandGrassCorner', 512, 512);
        ctxC.fillStyle = '#265c2e';
        ctxC.fillRect(0, 0, 512, 512);
        const rGrad = ctxC.createRadialGradient(0, 0, 40, 0, 0, 460);
        rGrad.addColorStop(0, '#c7a25d');
        rGrad.addColorStop(0.7, '#c7a25d');
        rGrad.addColorStop(1, 'rgba(199, 162, 93, 0)');
        ctxC.fillStyle = rGrad;
        ctxC.fillRect(0, 0, 512, 512);
        cvsC.refresh();

        const { cvs: cvsC2, ctx: ctxC2 } = getCvs('dt_sandGrassCorner2', 512, 512);
        ctxC2.fillStyle = '#c7a25d';
        ctxC2.fillRect(0, 0, 512, 512);
        const rGrad2 = ctxC2.createRadialGradient(512, 512, 40, 512, 512, 460);
        rGrad2.addColorStop(0, '#265c2e');
        rGrad2.addColorStop(0.7, '#265c2e');
        rGrad2.addColorStop(1, 'rgba(38, 92, 46, 0)');
        ctxC2.fillStyle = rGrad2;
        ctxC2.fillRect(0, 0, 512, 512);
        cvsC2.refresh();
    }

    // Helper para pintar pianos 3D con relieve, bisel e iluminación cenital
    function draw3DRumbleKerb(ctx, x, y, w, h, isVertical) {
        const seg = 24;
        if (isVertical) {
            for (let sy = y; sy < y + h; sy += seg) {
                const isRed = (Math.floor(sy / seg) % 2 === 0);
                ctx.fillStyle = isRed ? '#d32f2f' : '#ffffff';
                ctx.fillRect(x, sy, w, seg);

                // Relieve 3D biselado: luz superior blanca, sombra inferior oscura
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.fillRect(x, sy, w, 3);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(x, sy + seg - 3, w, 3);

                // Ranura transversal
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(x, sy + seg / 2 - 1, w, 2);
            }
        } else {
            for (let sx = x; sx < x + w; sx += seg) {
                const isRed = (Math.floor(sx / seg) % 2 === 0);
                ctx.fillStyle = isRed ? '#d32f2f' : '#ffffff';
                ctx.fillRect(sx, y, seg, h);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.fillRect(sx, y, seg, 3);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(sx, y + h - 3, seg, 3);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(sx + seg / 2 - 1, y, 2, h);
            }
        }
    }

    // =========================================================================
    // 4. RECTA DE ASFALTO MODERNO HD CON PIANOS 3D (512x512)
    // =========================================================================
    // En coordenadas 512x512, el asfalto va centrado (de x=64 a x=448, ancho=384px)
    {
        const { cvs, ctx } = getCvs('dt_straight', 512, 512);
        ctx.clearRect(0, 0, 512, 512);

        // Pianos exteriores a los lados con relieve 3D
        draw3DRumbleKerb(ctx, 42, 0, 24, 512, true);
        draw3DRumbleKerb(ctx, 446, 0, 24, 512, true);

        // Asfalto moderno oscuro de alta adherencia
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(66, 0, 380, 512);

        // Trazadas de goma oscura donde pasan los neumáticos (Racing Groove)
        ctx.fillStyle = 'rgba(10, 12, 16, 0.5)';
        ctx.fillRect(130, 0, 75, 512);
        ctx.fillRect(305, 0, 75, 512);

        // Granulado de asfalto
        for (let i = 0; i < 600; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(66 + Math.random() * 380, Math.random() * 512, 2, 2);
        }

        // Líneas blancas continuas laterales
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(70, 0, 6, 512);
        ctx.fillRect(436, 0, 6, 512);

        // Línea discontinua central
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        for (let y = 0; y < 512; y += 64) {
            ctx.fillRect(253, y + 10, 6, 44);
        }

        cvs.refresh();
    }

    // =========================================================================
    // 5. META / SALIDA CON DAMERO Y PARRILLA HD (512x512)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_finish', 512, 512);
        ctx.clearRect(0, 0, 512, 512);

        // Base de asfalto y pianos
        draw3DRumbleKerb(ctx, 42, 0, 24, 512, true);
        draw3DRumbleKerb(ctx, 446, 0, 24, 512, true);
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(66, 0, 380, 512);

        // Damero de meta blanco y negro de doble fila
        const sq = 24;
        for (let x = 70; x < 436; x += sq) {
            for (let r = 0; r < 2; r++) {
                const isWhite = ((Math.floor((x - 70) / sq) + r) % 2 === 0);
                ctx.fillStyle = isWhite ? '#ffffff' : '#0f1115';
                ctx.fillRect(x, 244 + r * sq, sq, sq);
            }
        }

        // Cajones de salida numerados
        const slots = [
            { x: 155, y: 110, num: '1' },
            { x: 315, y: 170, num: '2' },
            { x: 155, y: 340, num: '3' },
            { x: 315, y: 400, num: '4' }
        ];
        slots.forEach(s => {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(s.x - 36, s.y - 28, 72, 56);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.num, s.x, s.y);
        });

        // Estructura de pórtico con semáforo LED de 5 luces
        ctx.fillStyle = 'rgba(15, 17, 23, 0.95)';
        ctx.fillRect(30, 225, 452, 22);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 225, 452, 22);

        for (let i = 0; i < 5; i++) {
            const lx = 160 + i * 48;
            ctx.beginPath();
            ctx.arc(lx, 236, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#ff1744';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        cvs.refresh();
    }

    // =========================================================================
    // 6. CURVA 90 GRADOS HD CON PIANOS 3D CURVADOS (512x512)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_corner90', 512, 512);
        ctx.clearRect(0, 0, 512, 512);

        const cx = 0, cy = 0;
        const rIn = 256, rOut = 448; // Ancho de calzada = 192px

        // Asfalto curvado oscuro
        ctx.beginPath();
        ctx.arc(cx, cy, rOut, 0, Math.PI / 2, false);
        ctx.arc(cx, cy, rIn, Math.PI / 2, 0, true);
        ctx.closePath();
        ctx.fillStyle = '#1c1f24';
        ctx.fill();

        // Trazada de goma en el vértice
        ctx.beginPath();
        ctx.arc(cx, cy, (rIn + rOut) / 2, 0, Math.PI / 2, false);
        ctx.strokeStyle = 'rgba(10, 12, 16, 0.55)';
        ctx.lineWidth = 80;
        ctx.stroke();

        // Líneas blancas continuas interior y exterior
        ctx.beginPath();
        ctx.arc(cx, cy, rOut - 6, 0, Math.PI / 2, false);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, rIn + 6, 0, Math.PI / 2, false);
        ctx.stroke();

        // Pianos dentados 3D en el vértice interior
        const inSteps = 32;
        for (let s = 0; s < inSteps; s++) {
            const a1 = (s / inSteps) * (Math.PI / 2);
            const a2 = ((s + 1) / inSteps) * (Math.PI / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, rIn, a1, a2, false);
            ctx.arc(cx, cy, rIn - 20, a2, a1, true);
            ctx.closePath();
            ctx.fillStyle = (s % 2 === 0) ? '#d32f2f' : '#ffffff';
            ctx.fill();
        }

        // Pianos dentados 3D en la salida exterior
        const outSteps = 48;
        for (let s = 0; s < outSteps; s++) {
            const a1 = (s / outSteps) * (Math.PI / 2);
            const a2 = ((s + 1) / outSteps) * (Math.PI / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, rOut + 20, a1, a2, false);
            ctx.arc(cx, cy, rOut, a2, a1, true);
            ctx.closePath();
            ctx.fillStyle = (s % 2 === 0) ? '#d32f2f' : '#ffffff';
            ctx.fill();
        }

        cvs.refresh();
    }

    // =========================================================================
    // 7. CURVAS 45 GRADOS Y RECTAS DIAGONALES HD (512x512)
    // =========================================================================
    {
        const { cvs: c45L, ctx: ctx45L } = getCvs('dt_corner45Left', 512, 512);
        ctx45L.clearRect(0, 0, 512, 512);
        ctx45L.beginPath();
        ctx45L.arc(0, 0, 448, 0, Math.PI / 4, false);
        ctx45L.arc(0, 0, 256, Math.PI / 4, 0, true);
        ctx45L.closePath();
        ctx45L.fillStyle = '#1c1f24';
        ctx45L.fill();
        c45L.refresh();

        const { cvs: c45R, ctx: ctx45R } = getCvs('dt_corner45Right', 512, 512);
        ctx45R.clearRect(0, 0, 512, 512);
        ctx45R.beginPath();
        ctx45R.arc(512, 0, 448, Math.PI * 0.75, Math.PI, false);
        ctx45R.arc(512, 0, 256, Math.PI, Math.PI * 0.75, true);
        ctx45R.closePath();
        ctx45R.fillStyle = '#1c1f24';
        ctx45R.fill();
        c45R.refresh();

        const { cvs: sM, ctx: ctxM } = getCvs('dt_straight45Male', 512, 512);
        ctxM.clearRect(0, 0, 512, 512);
        ctxM.save();
        ctxM.translate(256, 256);
        ctxM.rotate(Math.PI / 4);
        ctxM.fillStyle = '#1c1f24';
        ctxM.fillRect(-192, -400, 384, 800);
        ctxM.fillStyle = '#ffffff';
        ctxM.fillRect(-188, -400, 6, 800);
        ctxM.fillRect(182, -400, 6, 800);
        ctxM.restore();
        sM.refresh();

        const { cvs: sF, ctx: ctxF } = getCvs('dt_straight45Female', 512, 512);
        ctxF.clearRect(0, 0, 512, 512);
        ctxF.save();
        ctxF.translate(256, 256);
        ctxF.rotate(-Math.PI / 4);
        ctxF.fillStyle = '#1c1f24';
        ctxF.fillRect(-192, -400, 384, 800);
        ctxF.fillStyle = '#ffffff';
        ctxF.fillRect(-188, -400, 6, 800);
        ctxF.fillRect(182, -400, 6, 800);
        ctxF.restore();
        sF.refresh();
    }

    // =========================================================================
    // 8. ÁRBOLES 3D CON VOLUMEN Y SOMBRA PROYECTADA (128x128)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_tree', 128, 128);
        ctx.clearRect(0, 0, 128, 128);

        // Sombra suave proyectada a 45 grados
        ctx.beginPath();
        ctx.ellipse(74, 76, 40, 28, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fill();

        // Copa de árbol con volumen radial realista (luz solar superior-izquierda)
        const radG = ctx.createRadialGradient(50, 48, 8, 60, 58, 48);
        radG.addColorStop(0, '#81c784');
        radG.addColorStop(0.45, '#388e3c');
        radG.addColorStop(0.85, '#1b5e20');
        radG.addColorStop(1, '#0b3812');
        ctx.beginPath();
        ctx.arc(60, 58, 48, 0, Math.PI * 2);
        ctx.fillStyle = radG;
        ctx.fill();

        // Racimos de follaje orgánico
        const foliage = [
            { x: 48, y: 44, r: 22 },
            { x: 74, y: 48, r: 23 },
            { x: 52, y: 72, r: 24 },
            { x: 76, y: 68, r: 20 }
        ];
        foliage.forEach(f => {
            const fg = ctx.createRadialGradient(f.x - 4, f.y - 4, 3, f.x, f.y, f.r);
            fg.addColorStop(0, 'rgba(165, 214, 167, 0.65)');
            fg.addColorStop(1, 'rgba(27, 94, 32, 0.25)');
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fillStyle = fg;
            ctx.fill();
        });

        cvs.refresh();
    }

    // =========================================================================
    // 9. TRIBUNA MODERNA CON MULTITUD Y DOSEL (512x256)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_grandstand', 512, 256);
        ctx.clearRect(0, 0, 512, 256);

        // Sombra de tribuna
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.fillRect(16, 24, 480, 220);

        // Filas de asientos escalonados
        const colors = ['#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#2196f3'];
        for (let r = 0; r < 5; r++) {
            ctx.fillStyle = colors[r];
            ctx.fillRect(24, 35 + r * 38, 464, 35);

            // Espectadores animados en las gradas
            for (let c = 34; c < 480; c += 14) {
                ctx.beginPath();
                ctx.arc(c, 48 + r * 38, 5.5, 0, Math.PI * 2);
                const fanColors = ['#e53935', '#ffeb3b', '#ffffff', '#ff9800', '#00e676', '#e040fb'];
                ctx.fillStyle = fanColors[(c + r) % fanColors.length];
                ctx.fill();
            }
        }

        // Techo voladizo de la tribuna (dosel blanco con soporte)
        ctx.fillStyle = 'rgba(245, 245, 245, 0.96)';
        ctx.fillRect(18, 15, 476, 40);
        ctx.strokeStyle = '#90caf9';
        ctx.lineWidth = 3;
        ctx.strokeRect(18, 15, 476, 40);

        ctx.fillStyle = '#0d47a1';
        ctx.font = '900 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏁 GRANDSTAND VIP // DUST RACING 2D 🏁', 256, 40);

        cvs.refresh();
    }

    // =========================================================================
    // 10. PILAS DE NEUMÁTICOS 3D (64x64)
    // =========================================================================
    {
        const { cvs, ctx } = getCvs('dt_tire', 64, 64);
        ctx.clearRect(0, 0, 64, 64);

        ctx.beginPath();
        ctx.ellipse(36, 36, 24, 20, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fill();

        const tires = [
            { x: 24, y: 24, c: '#e53935' },
            { x: 40, y: 24, c: '#ffffff' },
            { x: 32, y: 40, c: '#1e88e5' }
        ];
        tires.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
            ctx.fillStyle = t.c;
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Orificio central
            ctx.beginPath();
            ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0a0a';
            ctx.fill();
        });

        cvs.refresh();
    }

    // =========================================================================
    // 11. COCHES DEPORTIVOS GT ULTRA-HD CON ACABADO METÁLICO (120x60)
    // =========================================================================
    const liveries = [
        { key: 'car_red', body: '#d32f2f', stripe: '#ffffff', glass: '#0c2238' },
        { key: 'car_blue', body: '#0288d1', stripe: '#ffeb3b', glass: '#061625' },
        { key: 'car_yellow', body: '#fbc02d', stripe: '#111111', glass: '#0c1b2a' },
        { key: 'car_green', body: '#2e7d32', stripe: '#ffffff', glass: '#051810' },
        { key: 'car_cyan', body: '#00b4d8', stripe: '#ff0055', glass: '#061b2b' },
        { key: 'car_orange', body: '#f57c00', stripe: '#ffffff', glass: '#120d06' }
    ];

    liveries.forEach(liv => {
        const { cvs, ctx } = getCvs(liv.key, 120, 60);
        ctx.clearRect(0, 0, 120, 60);

        // Carrocería deportiva aerodinámica GT
        ctx.beginPath();
        ctx.roundRect(10, 6, 100, 48, 12);
        const bodyGrad = ctx.createLinearGradient(10, 6, 10, 54);
        bodyGrad.addColorStop(0, liv.body);
        bodyGrad.addColorStop(0.35, '#ffffff'); // Reflejo de luz solar metálica
        bodyGrad.addColorStop(0.5, liv.body);
        bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Franja de competición en el capó
        ctx.fillStyle = liv.stripe;
        ctx.fillRect(20, 24, 80, 12);

        // Parabrisas y cabina aerodinámica
        ctx.beginPath();
        ctx.roundRect(40, 14, 40, 32, 6);
        ctx.fillStyle = liv.glass;
        ctx.fill();

        // Destello de sol en el parabrisas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.moveTo(45, 16);
        ctx.lineTo(60, 16);
        ctx.lineTo(50, 44);
        ctx.lineTo(40, 44);
        ctx.closePath();
        ctx.fill();

        // Faros delanteros de xenón
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(106, 12, 6, 10);
        ctx.fillRect(106, 38, 6, 10);

        // Pilotos traseros LED rojos
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(8, 12, 4, 10);
        ctx.fillRect(8, 38, 4, 10);

        // Alerón trasero de carbono
        ctx.fillStyle = '#111111';
        ctx.fillRect(4, 6, 6, 48);

        cvs.refresh();
    });

    console.log('✨ [Dust Racing 2D HD] Todos los assets HD generados con acabado ultra-definido.');
}

if (typeof window !== 'undefined') {
    window.createDustracHDArt = createDustracHDArt;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDustracHDArt };
}
