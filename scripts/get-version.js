// scripts/get-version.js
// Lê a versão do package.json e retorna para uso em scripts
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log(packageJson.version);
