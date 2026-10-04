// ===== PREPARE CLEAN TRANSPARENT ASSETS FROM DUSTRACING2D =====
// Decodes original Dust Racing 2D PNG tiles and replaces green chroma-key with full transparency
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(buffer) {
    let pos = 8; // skip PNG signature
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks = [];

    while (pos < buffer.length) {
        const len = buffer.readUInt32BE(pos);
        const type = buffer.toString('ascii', pos + 4, pos + 8);
        const data = buffer.slice(pos + 8, pos + 8 + len);

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
        } else if (type === 'IDAT') {
            idatChunks.push(data);
        }
        pos += 12 + len;
    }

    const compressed = Buffer.concat(idatChunks);
    const raw = zlib.inflateSync(compressed);

    const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 4);
    const rgba = Buffer.alloc(width * height * 4);

    let rawIdx = 0;
    const scanlineLength = width * bpp;
    const prevScanline = Buffer.alloc(scanlineLength);
    const currScanline = Buffer.alloc(scanlineLength);

    for (let y = 0; y < height; y++) {
        const filter = raw[rawIdx++];
        for (let x = 0; x < scanlineLength; x++) {
            const val = raw[rawIdx++];
            const a = x >= bpp ? currScanline[x - bpp] : 0;
            const b = prevScanline[x];
            const c = x >= bpp ? prevScanline[x - bpp] : 0;

            let recon = val;
            if (filter === 1) recon = (val + a) & 0xff;
            else if (filter === 2) recon = (val + b) & 0xff;
            else if (filter === 3) recon = (val + Math.floor((a + b) / 2)) & 0xff;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                let pr = a;
                if (pb < pa && pb < pc) pr = b;
                else if (pc < pa) pr = c;
                recon = (val + pr) & 0xff;
            }
            currScanline[x] = recon;
        }

        for (let x = 0; x < width; x++) {
            const outIdx = (y * width + x) * 4;
            if (bpp === 4) {
                rgba[outIdx] = currScanline[x * 4];
                rgba[outIdx + 1] = currScanline[x * 4 + 1];
                rgba[outIdx + 2] = currScanline[x * 4 + 2];
                rgba[outIdx + 3] = currScanline[x * 4 + 3];
            } else if (bpp === 3) {
                rgba[outIdx] = currScanline[x * 3];
                rgba[outIdx + 1] = currScanline[x * 3 + 1];
                rgba[outIdx + 2] = currScanline[x * 3 + 2];
                rgba[outIdx + 3] = 255;
            }
        }
        currScanline.copy(prevScanline);
    }

    return { width, height, data: rgba };
}

function encodePNG(width, height, rgbaBuffer) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // 8-bit depth
    ihdrData[9] = 6; // RGBA color type
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdrChunk = createChunk('IHDR', ihdrData);

    // IDAT
    const rowLength = width * 4 + 1;
    const rawData = Buffer.alloc(height * rowLength);
    for (let y = 0; y < height; y++) {
        rawData[y * rowLength] = 0; // No filter (0)
        rgbaBuffer.copy(rawData, y * rowLength + 1, y * width * 4, (y + 1) * width * 4);
    }
    const compressed = zlib.deflateSync(rawData);
    const idatChunk = createChunk('IDAT', compressed);

    // IEND
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
}

function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        let byte = buf[i];
        for (let j = 0; j < 8; j++) {
            if ((crc ^ byte) & 1) {
                crc = (crc >>> 1) ^ 0xedb88320;
            } else {
                crc = crc >>> 1;
            }
            byte = byte >>> 1;
        }
    }
    return (crc ^ -1) >>> 0;
}

// Procesar todos los tiles
const outDir = path.join(__dirname, 'assets', 'dustrac_clean');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const inDir = path.join(__dirname, 'assets', 'dustrac');
const filesToProcess = [
    'straight.png',
    'corner.png',
    'corner45Left.png',
    'corner45Right.png',
    'straight45Male.png',
    'straight45Female.png',
    'finish.png'
];

filesToProcess.forEach(fileName => {
    const inPath = path.join(inDir, fileName);
    if (!fs.existsSync(inPath)) return;

    const fileBuf = fs.readFileSync(inPath);
    const decoded = decodePNG(fileBuf);

    // Aplicar la lógica exacta del shader de Dust Racing 2D:
    // if ((color0.r + color0.b) <= color0.g) -> verde chroma key
    const d = decoded.data;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Detección de verde cromático (#00ff00 de Dust Racing 2D)
        if ((r + b) <= g && g > 40) {
            d[i + 3] = 0; // Totalmente transparente
        }
    }

    const outBuf = encodePNG(decoded.width, decoded.height, decoded.data);
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, outBuf);
    console.log(`Processed ${fileName} -> ${decoded.width}x${decoded.height}, saved to ${outPath}`);
});

console.log('All clean tiles generated successfully.');
