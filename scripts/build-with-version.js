// scripts/build-with-version.js
// Script para build com versão automática
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler versão do package.json
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Definir variável de ambiente e executar vite build
process.env.VITE_APP_VERSION = version;

console.log(`🚀 Building with version: ${version}`);

// Executar vite build
execSync('vite build', { 
  stdio: 'inherit',
  env: { ...process.env, VITE_APP_VERSION: version }
});
