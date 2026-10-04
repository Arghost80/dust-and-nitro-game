// Generador de Assets Arcade de alta calidad para Badlands (Atari 1989 Remastered)
// Utiliza Phaser 3 Canvas para generar sprites de alta fidelidad pixel-art

function generateExtractedArcadeTextures(scene) {
    // 1. CARRETERAS Y TEXTURAS DE CIRCUITO DE ALTA FIDELIDAD
    // Textura Pista 1: Roca Volcánica Oscura con fisuras
    const gRock = scene.make.graphics({ x: 0, y: 0, add: false });
    gRock.fillStyle(0x2d3a42, 1);
    gRock.fillRect(0, 0, 64, 64);
    gRock.fillStyle(0x242e35, 1);
    gRock.fillRect(0, 0, 32, 32); gRock.fillRect(32, 32, 32, 32);
    gRock.lineStyle(1, 0x1a2228, 0.6);
    gRock.strokeRect(0, 0, 64, 64);
    // Grietas y detalles rocosos
    gRock.lineStyle(1, 0x425561, 0.4);
    gRock.lineBetween(8, 12, 24, 28);
    gRock.lineBetween(40, 48, 56, 38);
    gRock.generateTexture('tile_volcano_ground', 64, 64);

    // Textura Pista 2: Asfalto de Autopista con grietas y marcas
    const gAsphalt = scene.make.graphics({ x: 0, y: 0, add: false });
    gAsphalt.fillStyle(0x1e2429, 1);
    gAsphalt.fillRect(0, 0, 64, 64);
    gAsphalt.fillStyle(0x272f36, 1);
    gAsphalt.fillRect(0, 0, 32, 32); gAsphalt.fillRect(32, 32, 32, 32);
    // Ruido pixelado de asfalto
    gAsphalt.fillStyle(0x38444e, 0.5);
    gAsphalt.fillRect(10, 14, 4, 4); gAsphalt.fillRect(44, 20, 6, 4);
    gAsphalt.fillRect(22, 50, 4, 6); gAsphalt.fillRect(52, 42, 4, 4);
    gAsphalt.generateTexture('tile_asphalt', 64, 64);

    // 2. VEHÍCULOS PIXEL-ART ESTILO ATARI BADLANDS (VEC-CARS DETALLADOS)
    const drawBadlandsCar = (key, mainColorHex, darkColorHex, lightColorHex, decalColorHex) => {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        // Sombra proyectada por el vehículo (Efecto Retro Arcade)
        g.fillStyle(0x000000, 0.4);
        g.fillRoundedRect(6, 6, 26, 46, 6);

        // Chasis principal aerodinámico de carreras armadas
        g.fillStyle(darkColorHex, 1);
        g.fillRoundedRect(4, 4, 24, 44, 5);
        g.fillStyle(mainColorHex, 1);
        g.fillRoundedRect(6, 6, 20, 40, 4);

        // Capó y brillos metálicos superiores
        g.fillStyle(lightColorHex, 1);
        g.fillRect(10, 8, 12, 14);

        // Franja de carreras / Decal
        g.fillStyle(decalColorHex, 1);
        g.fillRect(14, 4, 4, 44);

        // Cañón frontal gemelo armado (Estilo Badlands 1989)
        g.fillStyle(0x111111, 1);
        g.fillRect(10, 0, 3, 10);
        g.fillRect(19, 0, 3, 10);
        g.fillStyle(0x777777, 1);
        g.fillRect(11, 2, 1, 6);
        g.fillRect(20, 2, 1, 6);

        // Parabrisas polarizado arcade con reflejo
        g.fillStyle(0x112233, 1);
        g.fillRect(9, 18, 14, 10);
        g.fillStyle(0x4488bb, 1);
        g.fillRect(10, 19, 4, 8);

        // Ruedas anchas de carreras
        g.fillStyle(0x0a0a0a, 1);
        g.fillRect(1, 8, 5, 11);   // Delantera izq
        g.fillRect(26, 8, 5, 11);  // Delantera der
        g.fillRect(1, 31, 5, 12);  // Trasera izq
        g.fillRect(26, 31, 5, 12); // Trasera der

        // Detalle llantas cromadas
        g.fillStyle(0xcccccc, 1);
        g.fillRect(2, 12, 3, 3);   g.fillRect(27, 12, 3, 3);
        g.fillRect(2, 35, 3, 4);   g.fillRect(27, 35, 3, 4);

        // Alerón trasero deportivo armado
        g.fillStyle(darkColorHex, 1);
        g.fillRect(4, 43, 24, 5);
        g.fillStyle(decalColorHex, 1);
        g.fillRect(6, 44, 20, 3);

        g.generateTexture(key, 32, 52);
    };

    // Generar 5 vehículos únicos idénticos a los coches del recreativo Atari Badlands
    drawBadlandsCar('car_grey', 0x99aab8, 0x556677, 0xcce0f0, 0xcc2222);   // Player 1: Interceptor V8
    drawBadlandsCar('car_cyan', 0x00ccff, 0x006699, 0x88eeff, 0xffea00);   // Player 2: Cyan Thunder
    drawBadlandsCar('car_red', 0xee2222, 0x880000, 0xff6666, 0xffffff);    // Player 3: Road Warrior
    drawBadlandsCar('car_yellow', 0xffcc00, 0x997700, 0xffee77, 0x222222); // Player 4: Neon Viper
    drawBadlandsCar('car_green', 0x00cc44, 0x006622, 0x66ff99, 0x00ffff);  // Player 5: Green Destroyer

    // 3. OBJETOS DE PISTA Y POWER-UPS
    // Llave Inglesa (Wrench) Arcade 1989 brillante
    const gWrench = scene.make.graphics({ x: 0, y: 0, add: false });
    gWrench.fillStyle(0x000000, 0.3);
    gWrench.fillCircle(11, 11, 9);
    gWrench.fillStyle(0xffd700, 1); // Oro amarillo Atari
    gWrench.fillRect(8, 2, 4, 16);
    gWrench.fillRect(4, 2, 12, 5);
    gWrench.fillRect(4, 13, 12, 5);
    gWrench.fillStyle(0xffffff, 1); // Brillo
    gWrench.fillRect(9, 4, 2, 12);
    gWrench.generateTexture('badlands_wrench', 20, 22);

    // Misil de combate con fuego trasero animable
    const gMissile = scene.make.graphics({ x: 0, y: 0, add: false });
    gMissile.fillStyle(0xcc0000, 1);
    gMissile.fillTriangle(6, 0, 1, 8, 11, 8);
    gMissile.fillStyle(0xdddddd, 1);
    gMissile.fillRect(3, 8, 6, 12);
    gMissile.fillStyle(0xff6600, 1);
    gMissile.fillTriangle(6, 24, 2, 20, 10, 20); // Llama trasera
    gMissile.generateTexture('badlands_missile', 12, 24);

    // Bala de cañón doble con destello
    const gBullet = scene.make.graphics({ x: 0, y: 0, add: false });
    gBullet.fillStyle(0xffff00, 1);
    gBullet.fillCircle(4, 4, 4);
    gBullet.fillStyle(0xffffff, 1);
    gBullet.fillCircle(4, 4, 2);
    gBullet.generateTexture('bullet', 8, 8);

    // Animación de Explosión Retro (Partículas)
    const gExp = scene.make.graphics({ x: 0, y: 0, add: false });
    gExp.fillStyle(0xff3300, 1);
    gExp.fillCircle(12, 12, 12);
    gExp.fillStyle(0xffcc00, 1);
    gExp.fillCircle(12, 12, 7);
    gExp.fillStyle(0xffffff, 1);
    gExp.fillCircle(12, 12, 3);
    gExp.generateTexture('explosion_particle', 24, 24);
}
