import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

async function generate() {
  const svg192 = readFileSync(resolve(publicDir, 'icon-192.svg'));
  const svg512 = readFileSync(resolve(publicDir, 'icon-512.svg'));

  await sharp(svg192)
    .resize(192, 192)
    .png()
    .toFile(resolve(publicDir, 'icon-192.png'));

  await sharp(svg512)
    .resize(512, 512)
    .png()
    .toFile(resolve(publicDir, 'icon-512.png'));

  // Feature graphic for Play Store (1024x500)
  const featureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <rect width="1024" height="500" fill="#09090b"/>
    <rect x="16" y="16" width="992" height="468" rx="24" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.2"/>
    <g opacity="0.06" stroke="#0ea5e9" stroke-width="1">
      ${Array.from({length: 20}, (_, i) => `<line x1="${i * 52 + 26}" y1="0" x2="${i * 52 + 26}" y2="500"/>`).join('')}
      ${Array.from({length: 10}, (_, i) => `<line x1="0" y1="${i * 52 + 26}" x2="1024" y2="${i * 52 + 26}"/>`).join('')}
    </g>
    <circle cx="320" cy="220" r="90" fill="none" stroke="#0ea5e9" stroke-width="5"/>
    <circle cx="320" cy="220" r="20" fill="#0ea5e9"/>
    <line x1="320" y1="115" x2="320" y2="155" stroke="#0ea5e9" stroke-width="5"/>
    <line x1="320" y1="285" x2="320" y2="325" stroke="#0ea5e9" stroke-width="5"/>
    <line x1="215" y1="220" x2="255" y2="220" stroke="#0ea5e9" stroke-width="5"/>
    <line x1="385" y1="220" x2="425" y2="220" stroke="#0ea5e9" stroke-width="5"/>
    <path d="M200,120 L200,90 L230,90" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0.4"/>
    <path d="M440,120 L440,90 L410,90" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0.4"/>
    <path d="M200,320 L200,350 L230,350" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0.4"/>
    <path d="M440,320 L440,350 L410,350" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0.4"/>
    <text x="660" y="200" text-anchor="middle" fill="#e4e4e7" font-family="monospace" font-size="72" font-weight="900" letter-spacing="8">TACTICAL</text>
    <text x="660" y="280" text-anchor="middle" fill="#0ea5e9" font-family="monospace" font-size="72" font-weight="900" letter-spacing="8">COMMAND</text>
    <text x="660" y="340" text-anchor="middle" fill="#a1a1aa" font-family="monospace" font-size="20" letter-spacing="3">TURN-BASED TACTICAL COMBAT</text>
    <rect x="520" y="380" width="280" height="48" rx="8" fill="#0ea5e9" opacity="0.15"/>
    <text x="660" y="412" text-anchor="middle" fill="#0ea5e9" font-family="monospace" font-size="18" font-weight="700" letter-spacing="2">BUILD • DEPLOY • CONQUER</text>
  </svg>`;

  await sharp(Buffer.from(featureSvg))
    .resize(1024, 500)
    .png()
    .toFile(resolve(publicDir, 'feature-graphic.png'));

  console.log('Generated: icon-192.png, icon-512.png, feature-graphic.png');
}

generate().catch(console.error);
