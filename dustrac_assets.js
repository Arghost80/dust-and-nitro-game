// ===== DUST RACING 2D MODERN ASSET GENERATOR =====
// Genera texturas HD vectoriales/procedurales nativas para todos los tiles y objetos de Dust Racing 2D

function createDustracModernAssets(scene) {
    const tm = scene.textures;

    // Helper para crear canvas si no existe
    function getCanvas(key, w, h) {
        if (tm.exists(key)) tm.remove(key);
        const cvs = tm.createCanvas(key, w, h);
        const ctx = cvs.context || (cvs.canvas && cvs.canvas.getContext('2d'));
        return { cvs, ctx, w, h };
    }

    // 1. TIERRA / CÉSPED MODERNO HD (256x256)
    {
        const { cvs, ctx } = getCanvas('dt_grass', 256, 256);
        // Base verde frondoso
        ctx.fillStyle = '#2d6a36';
        ctx.fillRect(0, 0, 256, 256);

        // Rayas de corte de césped tipo circuito profesional (mowing stripes)
        for (let x = 0; x < 256; x += 32) {
            ctx.fillStyle = ((x / 32) % 2 === 0) ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(x, 0, 32, 256);
        }

        // Micro-textura orgánica de hierba
        for (let i = 0; i < 400; i++) {
            const rx = Math.random() * 256;
            const ry = Math.random() * 256;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(76, 175, 80, 0.25)' : 'rgba(27, 94, 32, 0.3)';
            ctx.fillRect(rx, ry, 2, 2);
        }
        cvs.refresh();
    }

    // 2. TRAMPA DE ARENA / GRAVA HD (256x256)
    {
        const { cvs, ctx } = getCanvas('dt_sand', 256, 256);
        ctx.fillStyle = '#c5a059';
        ctx.fillRect(0, 0, 256, 256);

        // Ondulaciones de grava
        for (let y = 0; y < 256; y += 8) {
            ctx.fillStyle = (y % 16 === 0) ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.07)';
            ctx.fillRect(0, y, 256, 4);
        }
        // Grano de arena
        for (let i = 0; i < 500; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(93, 64, 55, 0.2)';
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        cvs.refresh();
    }

    // 3. TRANSICIÓN ARENA-CÉSPED RECTA (256x256)
    {
        const { cvs, ctx } = getCanvas('dt_sandGrassStraight', 256, 256);
        ctx.fillStyle = '#2d6a36';
        ctx.fillRect(0, 0, 256, 256);

        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, '#c5a059');
        grad.addColorStop(0.5, '#c5a059');
        grad.addColorStop(0.75, 'rgba(197, 160, 89, 0.5)');
        grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        cvs.refresh();
    }

    // 4. TRANSICIONES DE ESQUINA ARENA-CÉSPED (256x256)
    {
        const { cvs: cvsC, ctx: ctxC } = getCanvas('dt_sandGrassCorner', 256, 256);
        ctxC.fillStyle = '#2d6a36';
        ctxC.fillRect(0, 0, 256, 256);
        const rGrad1 = ctxC.createRadialGradient(0, 0, 20, 0, 0, 220);
        rGrad1.addColorStop(0, '#c5a059');
        rGrad1.addColorStop(0.7, '#c5a059');
        rGrad1.addColorStop(1, 'rgba(197, 160, 89, 0)');
        ctxC.fillStyle = rGrad1;
        ctxC.fillRect(0, 0, 256, 256);
        cvsC.refresh();

        const { cvs: cvsC2, ctx: ctxC2 } = getCanvas('dt_sandGrassCorner2', 256, 256);
        ctxC2.fillStyle = '#c5a059';
        ctxC2.fillRect(0, 0, 256, 256);
        const rGrad2 = ctxC2.createRadialGradient(256, 256, 20, 256, 256, 220);
        rGrad2.addColorStop(0, '#2d6a36');
        rGrad2.addColorStop(0.7, '#2d6a36');
        rGrad2.addColorStop(1, 'rgba(45, 106, 54, 0)');
        ctxC2.fillStyle = rGrad2;
        ctxC2.fillRect(0, 0, 256, 256);
        cvsC2.refresh();
    }

    // Helper para dibujar pianos 3D dentados en rojo y blanco
    function draw3DKerbs(ctx, x, y, w, h, isVertical) {
        const segSize = 16;
        if (isVertical) {
            for (let sy = y; sy < y + h; sy += segSize) {
                const isRed = (Math.floor(sy / segSize) % 2 === 0);
                ctx.fillStyle = isRed ? '#d32f2f' : '#f5f5f5';
                ctx.fillRect(x, sy, w, segSize);

                // Relieve 3D (luz arriba, sombra abajo)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(x, sy, w, 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(x, sy + segSize - 2, w, 2);
            }
        } else {
            for (let sx = x; sx < x + w; sx += segSize) {
                const isRed = (Math.floor(sx / segSize) % 2 === 0);
                ctx.fillStyle = isRed ? '#d32f2f' : '#f5f5f5';
                ctx.fillRect(sx, y, segSize, h);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(sx, y, segSize, 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(sx, y + h - 2, segSize, 2);
            }
        }
    }

    // 5. TILE RECTA DE ASFALTO MODERNO (256x256)
    // El asfalto va centrado de x=32 a x=224 (ancho=192px)
    {
        const { cvs, ctx } = getCanvas('dt_straight', 256, 256);
        ctx.clearRect(0, 0, 256, 256);

        // Fondo transparente o sutil
        // Pianos exteriores a los lados (x=24..34 y x=222..232)
        draw3DKerbs(ctx, 22, 0, 12, 256, true);
        draw3DKerbs(ctx, 222, 0, 12, 256, true);

        // Capa de asfalto oscuro de alta gama
        ctx.fillStyle = '#212529';
        ctx.fillRect(34, 0, 188, 256);

        // Huella de rodadura de goma (racing line oscura)
        ctx.fillStyle = 'rgba(10, 12, 14, 0.45)';
        ctx.fillRect(70, 0, 40, 256);
        ctx.fillRect(146, 0, 40, 256);

        // Grano de asfalto
        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(34 + Math.random() * 188, Math.random() * 256, 2, 2);
        }

        // Líneas blancas continuas laterales
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(36, 0, 4, 256);
        ctx.fillRect(216, 0, 4, 256);

        // Línea discontinua central
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let y = 0; y < 256; y += 32) {
            ctx.fillRect(126, y + 6, 4, 20);
        }

        cvs.refresh();
    }

    // 6. TILE LÍNEA DE META / SALIDA CON DAMERO Y PARRILLA (256x256)
    {
        const { cvs, ctx } = getCanvas('dt_finish', 256, 256);
        ctx.clearRect(0, 0, 256, 256);

        // Base idéntica a recta
        draw3DKerbs(ctx, 22, 0, 12, 256, true);
        draw3DKerbs(ctx, 222, 0, 12, 256, true);
        ctx.fillStyle = '#212529';
        ctx.fillRect(34, 0, 188, 256);

        // Línea de meta de cuadros (damero blanco y negro)
        const sqSize = 12;
        for (let x = 36; x < 216; x += sqSize) {
            for (let r = 0; r < 2; r++) {
                const isWhite = ((Math.floor((x - 36) / sqSize) + r) % 2 === 0);
                ctx.fillStyle = isWhite ? '#ffffff' : '#111111';
                ctx.fillRect(x, 122 + r * sqSize, sqSize, sqSize);
            }
        }

        // Cajas de salida de parrilla (Starting Grid Slots 1, 2, 3, 4)
        const gridPositions = [
            { x: 75, y: 55, num: '1' },
            { x: 155, y: 85, num: '2' },
            { x: 75, y: 170, num: '3' },
            { x: 155, y: 200, num: '4' }
        ];
        gridPositions.forEach(slot => {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(slot.x - 18, slot.y - 14, 36, 28);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slot.num, slot.x, slot.y);
        });

        // Estructura de pórtico de salida (Gantry con 5 semáforos)
        ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
        ctx.fillRect(15, 110, 226, 12);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 110, 226, 12);

        // 5 Luces LED rojas de salida
        for (let i = 0; i < 5; i++) {
            const lx = 80 + i * 24;
            ctx.beginPath();
            ctx.arc(lx, 116, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff1744';
            ctx.fill();
        }

        cvs.refresh();
    }

    // 7. TILE CURVA 90 GRADOS HD (512x512 renderizado en alta definición)
    {
        const { cvs, ctx } = getCanvas('dt_corner90', 512, 512);
        ctx.clearRect(0, 0, 512, 512);

        // Curva cuadrante (de 0 a 90 grados):
        // Centro del arco en (0, 512) o (0, 0).
        // En Dust Racing 2D, el radio exterior es ~448 y el radio interior es ~256 (ancho = 192px)
        const cx = 0, cy = 0;
        const rIn = 256, rOut = 448;

        // Asfalto curvado
        ctx.beginPath();
        ctx.arc(cx, cy, rOut, 0, Math.PI / 2, false);
        ctx.arc(cx, cy, rIn, Math.PI / 2, 0, true);
        ctx.closePath();
        ctx.fillStyle = '#212529';
        ctx.fill();

        // Huellas de derrape curvadas
        ctx.beginPath();
        ctx.arc(cx, cy, (rIn + rOut) / 2, 0, Math.PI / 2, false);
        ctx.strokeStyle = 'rgba(10, 12, 14, 0.5)';
        ctx.lineWidth = 45;
        ctx.stroke();

        // Líneas blancas bordes
        ctx.beginPath();
        ctx.arc(cx, cy, rOut - 4, 0, Math.PI / 2, false);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, rIn + 4, 0, Math.PI / 2, false);
        ctx.stroke();

        // Pianos dentados en arco interior
        const steps = 24;
        for (let s = 0; s < steps; s++) {
            const a1 = (s / steps) * (Math.PI / 2);
            const a2 = ((s + 1) / steps) * (Math.PI / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, rIn, a1, a2, false);
            ctx.arc(cx, cy, rIn - 14, a2, a1, true);
            ctx.closePath();
            ctx.fillStyle = (s % 2 === 0) ? '#d32f2f' : '#f5f5f5';
            ctx.fill();
        }

        // Pianos dentados en arco exterior
        for (let s = 0; s < steps * 1.5; s++) {
            const a1 = (s / (steps * 1.5)) * (Math.PI / 2);
            const a2 = ((s + 1) / (steps * 1.5)) * (Math.PI / 2);
            ctx.beginPath();
            ctx.arc(cx, cy, rOut + 14, a1, a2, false);
            ctx.arc(cx, cy, rOut, a2, a1, true);
            ctx.closePath();
            ctx.fillStyle = (s % 2 === 0) ? '#d32f2f' : '#f5f5f5';
            ctx.fill();
        }

        cvs.refresh();
    }

    // 8. CURVAS 45 GRADOS & RECTAS DIAGONALES (512x512 & 256x256)
    {
        const { cvs: cvs45L, ctx: ctx45L } = getCanvas('dt_corner45Left', 512, 512);
        ctx45L.clearRect(0, 0, 512, 512);
        ctx45L.beginPath();
        ctx45L.arc(0, 0, 448, 0, Math.PI / 4, false);
        ctx45L.arc(0, 0, 256, Math.PI / 4, 0, true);
        ctx45L.closePath();
        ctx45L.fillStyle = '#212529';
        ctx45L.fill();
        cvs45L.refresh();

        const { cvs: cvs45R, ctx: ctx45R } = getCanvas('dt_corner45Right', 512, 512);
        ctx45R.clearRect(0, 0, 512, 512);
        ctx45R.beginPath();
        ctx45R.arc(512, 0, 448, Math.PI * 0.75, Math.PI, false);
        ctx45R.arc(512, 0, 256, Math.PI, Math.PI * 0.75, true);
        ctx45R.closePath();
        ctx45R.fillStyle = '#212529';
        ctx45R.fill();
        cvs45R.refresh();

        const { cvs: cvsM, ctx: ctxM } = getCanvas('dt_straight45Male', 256, 256);
        ctxM.clearRect(0, 0, 256, 256);
        ctxM.save();
        ctxM.translate(128, 128);
        ctxM.rotate(Math.PI / 4);
        ctxM.fillStyle = '#212529';
        ctxM.fillRect(-96, -200, 192, 400);
        ctxM.fillStyle = '#ffffff';
        ctxM.fillRect(-92, -200, 4, 400);
        ctxM.fillRect(88, -200, 4, 400);
        ctxM.restore();
        cvsM.refresh();

        const { cvs: cvsF, ctx: ctxF } = getCanvas('dt_straight45Female', 256, 256);
        ctxF.clearRect(0, 0, 256, 256);
        ctxF.save();
        ctxF.translate(128, 128);
        ctxF.rotate(-Math.PI / 4);
        ctxF.fillStyle = '#212529';
        ctxF.fillRect(-96, -200, 192, 400);
        ctxF.fillStyle = '#ffffff';
        ctxF.fillRect(-92, -200, 4, 400);
        ctxF.fillRect(88, -200, 4, 400);
        ctxF.restore();
        cvsF.refresh();
    }

    // 9. TILE PUENTE ELEVADO (256x256)
    {
        const { cvs, ctx } = getCanvas('dt_bridge', 256, 256);
        ctx.clearRect(0, 0, 256, 256);
        // Sombra sobre asfalto inferior
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(20, 30, 216, 196);
        // Estructura de vigas de acero
        ctx.fillStyle = '#37474f';
        ctx.fillRect(32, 20, 192, 216);
        ctx.strokeStyle = '#b0bec5';
        ctx.lineWidth = 4;
        ctx.strokeRect(32, 20, 192, 216);
        // Barandillas rojas de seguridad
        ctx.fillStyle = '#e53935';
        ctx.fillRect(28, 16, 200, 8);
        ctx.fillRect(28, 232, 200, 8);
        cvs.refresh();
    }

    // 10. OBJETOS DEL ENTORNO: ÁRBOLES 3D CON SOMBRA PROYECTADA (96x96)
    {
        const { cvs, ctx } = getCanvas('obj_tree', 96, 96);
        ctx.clearRect(0, 0, 96, 96);

        // Sombra suave a 45 grados (desplazada hacia abajo y a la derecha)
        ctx.beginPath();
        ctx.ellipse(56, 56, 28, 20, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Copa de árbol con volumen radial 3D (iluminación solar cenital superior-izquierda)
        const radG = ctx.createRadialGradient(38, 38, 6, 44, 44, 34);
        radG.addColorStop(0, '#66bb6a');
        radG.addColorStop(0.5, '#388e3c');
        radG.addColorStop(0.85, '#1b5e20');
        radG.addColorStop(1, '#0d3813');
        ctx.beginPath();
        ctx.arc(44, 44, 34, 0, Math.PI * 2);
        ctx.fillStyle = radG;
        ctx.fill();

        // Detalle de racimos de follaje
        const clusters = [
            { x: 35, y: 32, r: 14 },
            { x: 52, y: 36, r: 15 },
            { x: 38, y: 52, r: 16 },
            { x: 54, y: 50, r: 13 }
        ];
        clusters.forEach(c => {
            const cg = ctx.createRadialGradient(c.x - 2, c.y - 2, 2, c.x, c.y, c.r);
            cg.addColorStop(0, 'rgba(129, 199, 132, 0.7)');
            cg.addColorStop(1, 'rgba(27, 94, 32, 0.2)');
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fillStyle = cg;
            ctx.fill();
        });

        cvs.refresh();
    }

    // 11. OBJETOS: TRIBUNA CON PÚBLICO (256x128)
    {
        const { cvs, ctx } = getCanvas('obj_grandstand', 256, 128);
        ctx.clearRect(0, 0, 256, 128);

        // Sombra de tribuna
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(8, 12, 240, 110);

        // Estructura de gradas escalonadas
        const rowColors = ['#1565c0', '#0d47a1', '#1976d2', '#1e88e5'];
        for (let r = 0; r < 4; r++) {
            ctx.fillStyle = rowColors[r];
            ctx.fillRect(16, 20 + r * 22, 224, 20);

            // Cabezas de espectadores sentados con colores vibrantes
            for (let c = 24; c < 232; c += 10) {
                ctx.beginPath();
                ctx.arc(c, 28 + r * 22, 3.5, 0, Math.PI * 2);
                const colors = ['#f44336', '#ffeb3b', '#ffffff', '#ff9800', '#4caf50'];
                ctx.fillStyle = colors[(c + r) % colors.length];
                ctx.fill();
            }
        }

        // Techo voladizo de la tribuna (dosel blanco con nervios)
        ctx.fillStyle = 'rgba(245, 245, 245, 0.95)';
        ctx.fillRect(12, 10, 232, 22);
        ctx.strokeStyle = '#90caf9';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 10, 232, 22);

        // Rótulo publicitario de tribuna
        ctx.fillStyle = '#0d47a1';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏁 GRANDSTAND // DUST RACING 2D 🏁', 128, 25);

        cvs.refresh();
    }

    // 12. OBJETOS: PILA DE NEUMÁTICOS DE SEGURIDAD (32x32)
    {
        const { cvs, ctx } = getCanvas('obj_tire', 32, 32);
        ctx.clearRect(0, 0, 32, 32);

        // Sombra
        ctx.beginPath();
        ctx.ellipse(18, 18, 12, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // 3 neumáticos apilados en pirámide (rojo y blanco de competición)
        const tires = [
            { x: 12, y: 12, color: '#e53935' },
            { x: 20, y: 12, color: '#f5f5f5' },
            { x: 16, y: 20, color: '#1e88e5' }
        ];
        tires.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = t.color;
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Orificio central del neumático
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#111';
            ctx.fill();
        });

        cvs.refresh();
    }

    // 13. OBJETOS: QUITAMIEDOS / GUARDARRAÍL METÁLICO (64x16 y 256x16)
    {
        const { cvs: cvsW, ctx: ctxW } = getCanvas('obj_wall', 64, 16);
        ctxW.clearRect(0, 0, 64, 16);
        ctxW.fillStyle = '#90a4ae';
        ctxW.fillRect(0, 2, 64, 12);
        // Brillo metálico
        ctxW.fillStyle = '#eceff1';
        ctxW.fillRect(0, 4, 64, 3);
        ctxW.fillStyle = '#546e7a';
        ctxW.fillRect(0, 11, 64, 3);
        // Postes de anclaje
        for (let px = 8; px < 64; px += 24) {
            ctxW.fillStyle = '#263238';
            ctxW.fillRect(px, 0, 4, 16);
        }
        cvsW.refresh();

        const { cvs: cvsWL, ctx: ctxWL } = getCanvas('obj_wallLong', 256, 16);
        ctxWL.clearRect(0, 0, 256, 16);
        ctxWL.fillStyle = '#90a4ae';
        ctxWL.fillRect(0, 2, 256, 12);
        ctxWL.fillStyle = '#eceff1';
        ctxWL.fillRect(0, 4, 256, 3);
        ctxWL.fillStyle = '#546e7a';
        ctxWL.fillRect(0, 11, 256, 3);
        for (let px = 8; px < 256; px += 32) {
            ctxWL.fillStyle = '#263238';
            ctxWL.fillRect(px, 0, 4, 16);
        }
        cvsWL.refresh();
    }

    // 14. PANCARTAS PUBLICITARIAS DE CIRCUITO (256x24)
    {
        const { cvs, ctx } = getCanvas('obj_banner', 256, 24);
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(0, 0, 256, 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 252, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('APEX TIRES  •  APEX BRAKES  •  NITRO CLUB  •  DUST RACING', 128, 12);
        cvs.refresh();
    }

    // 15. PIT LANE / BOXES (256x64)
    {
        const { cvs, ctx } = getCanvas('obj_pit', 256, 64);
        ctx.fillStyle = '#37474f';
        ctx.fillRect(0, 0, 256, 64);
        // Franja amarilla de boxes
        ctx.fillStyle = '#fee440';
        for (let x = 0; x < 256; x += 24) {
            ctx.fillRect(x, 0, 12, 6);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PIT STOP ZONE // 60 KM/H', 128, 35);
        cvs.refresh();
    }

    // 16. COCHES DEPORTIVOS MODERNOS GT (48x24) CON VOLUMEN 3D Y DETALLES
    const carPalette = [
        { key: 'car_dt_red', base: '#e63946', trim: '#ffffff', glass: '#0f2b46' },
        { key: 'car_dt_blue', base: '#00b4d8', trim: '#fee440', glass: '#071828' },
        { key: 'car_dt_yellow', base: '#ffd166', trim: '#111111', glass: '#102030' },
        { key: 'car_dt_green', base: '#06d6a0', trim: '#ffffff', glass: '#051c14' },
        { key: 'car_dt_purple', base: '#9d4edd', trim: '#00f5d4', glass: '#130924' },
        { key: 'car_dt_silver', base: '#e0e1dd', trim: '#e63946', glass: '#0d1b2a' }
    ];

    carPalette.forEach(cp => {
        const { cvs, ctx } = getCanvas(cp.key, 48, 24);
        ctx.clearRect(0, 0, 48, 24);

        // Carrocería aerodinámica moderna GT
        ctx.beginPath();
        ctx.roundRect(4, 2, 40, 20, 5);
        ctx.fillStyle = cp.base;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Franja de competición en el capó y techo
        ctx.fillStyle = cp.trim;
        ctx.fillRect(8, 9, 32, 6);

        // Parabrisas y cabina con reflejo celeste
        ctx.beginPath();
        ctx.roundRect(16, 5, 16, 14, 3);
        ctx.fillStyle = cp.glass;
        ctx.fill();

        // Destello de sol en el parabrisas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(18, 6);
        ctx.lineTo(24, 6);
        ctx.lineTo(20, 18);
        ctx.lineTo(16, 18);
        ctx.closePath();
        ctx.fill();

        // Faros delanteros (a la derecha en rotación 0)
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(42, 4, 3, 4);
        ctx.fillRect(42, 16, 3, 4);

        // Pilotos traseros rojos (a la izquierda)
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(3, 4, 2, 4);
        ctx.fillRect(3, 16, 2, 4);

        // Alerón trasero aerodinámico
        ctx.fillStyle = '#111111';
        ctx.fillRect(2, 2, 3, 20);

        cvs.refresh();
    });

    console.log('🏁 [Dust Racing 2D Modern] Todos los tiles, texturas y coches HD generados con éxito.');
}

if (typeof window !== 'undefined') {
    window.createDustracModernAssets = createDustracModernAssets;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDustracModernAssets };
}
