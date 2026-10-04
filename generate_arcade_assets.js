const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

console.log("Generador de assets iniciado...");
