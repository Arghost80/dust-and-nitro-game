// ===== MOTOR PROCEDURAL DE TEXTURAS PBR Y GRÁFICOS DE ALTA CALIDAD PARA WEBGL =====

const TextureForge = {
    // Generador de Asfalto Realista con marcas de neumáticos, granulado y línea vial
    createAsphaltTexture: function(hasLine = false, isFinishLine = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Color base asfalto oscuro
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(0, 0, 512, 512);

        // Ruido y grava fotorealista
        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 28;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        // Grietas y parches de alquitrán
        ctx.strokeStyle = 'rgba(10, 12, 14, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 20); ctx.lineTo(140, 180); ctx.lineTo(190, 260);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(380, 300); ctx.lineTo(440, 420);
        ctx.stroke();

        // Líneas viales desgastadas
        if (hasLine) {
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 4;
            ctx.fillRect(244, 40, 24, 180);
            ctx.fillRect(244, 300, 24, 180);
        }

        // Línea de meta damero
        if (isFinishLine) {
            const size = 32;
            for (let y = 0; y < 512; y += size) {
                for (let x = 0; x < 512; x += size) {
                    if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(x, y, size, size);
                    } else {
                        ctx.fillStyle = '#111111';
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        }

        // Marcas de frenada quemadas (skidmarks)
        ctx.strokeStyle = 'rgba(5, 5, 5, 0.35)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(120, 0); ctx.bezierCurveTo(130, 200, 160, 400, 180, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(160, 0); ctx.bezierCurveTo(170, 200, 200, 400, 220, 512);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    },

    // Generador de Fachadas de Edificios / Rascacielos con iluminación nocturna
    createBuildingFacade: function(style = 'modern') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Color de hormigón/cristal
        ctx.fillStyle = style === 'modern' ? '#1b263b' : '#33272a';
        ctx.fillRect(0, 0, 512, 1024);

        // Ventanas estructuradas con oficinas encendidas y apagadas
        const winW = 28;
        const winH = 40;
        const gapX = 14;
        const gapY = 22;

        for (let y = 30; y < 1000; y += winH + gapY) {
            for (let x = 20; x < 490; x += winW + gapX) {
                const isLit = Math.random() > 0.45;
                if (isLit) {
                    const warm = Math.random() > 0.3;
                    ctx.fillStyle = warm ? 'rgba(255, 220, 140, 0.9)' : 'rgba(160, 225, 255, 0.9)';
                    ctx.shadowColor = warm ? '#ffbb44' : '#00ccff';
                    ctx.shadowBlur = 6;
                } else {
                    ctx.fillStyle = 'rgba(15, 20, 28, 0.95)';
                    ctx.shadowBlur = 0;
                }
                ctx.fillRect(x, y, winW, winH);

                // Marco de aluminio de la ventana
                ctx.strokeStyle = '#0d1117';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, winW, winH);
            }
        }

        // Carteles publicitarios de neón en planta baja
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 36px Arial';
        ctx.fillText('CYBER MOTORS', 40, 980);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    },

    // Generador de pianos / bordillos de competición (curbs) rojo y blanco
    createCurbTexture: function() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const step = 32;
        for (let x = 0; x < 256; x += step) {
            ctx.fillStyle = (Math.floor(x / step) % 2 === 0) ? '#d90429' : '#edf2f4';
            ctx.fillRect(x, 0, step, 64);
        }

        // Relieve y suciedad
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 50, 256, 14);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    },

    // Acera de baldosas urbanas
    createSidewalkTexture: function() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#6c757d';
        ctx.fillRect(0, 0, 256, 256);

        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 3;
        for (let i = 0; i <= 256; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }
};
