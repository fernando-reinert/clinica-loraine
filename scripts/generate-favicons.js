/**
 * Gera favicons e ícones PWA a partir de public/android-chrome-512x512.png
 * Uso: node scripts/generate-favicons.js
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const src = join(publicDir, 'android-chrome-512x512.png');

if (!existsSync(src)) {
  console.error('Fonte não encontrada:', src);
  process.exit(1);
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
];

const buffer = readFileSync(src);

await Promise.all(
  sizes.map(({ name, size }) =>
    sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name))
      .then(() => console.log('Gerado:', name))
  )
);

const png32 = await sharp(buffer).resize(32, 32).png().toBuffer();
const icoBuf = await toIco([png32], { sizes: [32] });
writeFileSync(join(publicDir, 'favicon.ico'), icoBuf);
console.log('Gerado: favicon.ico');

console.log('Concluído.');
