import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

async function generate() {
  const svg512 = readFileSync(resolve(publicDir, 'icon-512.svg'));
  const svgMono = readFileSync(resolve(publicDir, 'icon-mono.svg'));

  // Full-bleed launcher icons — same art serves `any` and `maskable`
  // (all marks sit inside the 80% maskable safe zone; background runs edge to edge).
  await sharp(svg512).resize(512, 512).png().toFile(resolve(publicDir, 'icon-512.png'));
  await sharp(svg512).resize(192, 192).png().toFile(resolve(publicDir, 'icon-192.png'));

  // Monochrome for Android 13+ themed icons
  await sharp(svgMono).resize(512, 512).png().toFile(resolve(publicDir, 'icon-mono-512.png'));

  // Play Store feature graphic (1024x500) — amber identity to match the game UI
  const featureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="90%">
        <stop offset="0%" stop-color="#18181b"/>
        <stop offset="100%" stop-color="#09090b"/>
      </radialGradient>
      <linearGradient id="amber" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fde68a"/>
        <stop offset="50%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f97316"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <g opacity="0.06" stroke="#fbbf24" stroke-width="1">
      ${Array.from({length: 20}, (_, i) => `<line x1="${i * 52 + 26}" y1="0" x2="${i * 52 + 26}" y2="500"/>`).join('')}
      ${Array.from({length: 10}, (_, i) => `<line x1="0" y1="${i * 52 + 26}" x2="1024" y2="${i * 52 + 26}"/>`).join('')}
    </g>
    <!-- Reticle, left side -->
    <circle cx="210" cy="250" r="110" fill="none" stroke="url(#amber)" stroke-width="12"/>
    <circle cx="210" cy="250" r="62" fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.4"/>
    <circle cx="210" cy="250" r="24" fill="url(#amber)"/>
    <g stroke="url(#amber)" stroke-width="12" stroke-linecap="round">
      <line x1="210" y1="98" x2="210" y2="152"/>
      <line x1="210" y1="348" x2="210" y2="402"/>
      <line x1="58" y1="250" x2="112" y2="250"/>
      <line x1="308" y1="250" x2="362" y2="250"/>
    </g>
    <!-- Corner brackets -->
    <g fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.5" stroke-linecap="square">
      <path d="M40,80 L40,40 L80,40"/>
      <path d="M984,80 L984,40 L944,40"/>
      <path d="M40,420 L40,460 L80,460"/>
      <path d="M984,420 L984,460 L944,460"/>
    </g>
    <!-- Wordmark -->
    <text x="430" y="235" fill="#f4f4f5" font-family="monospace" font-size="76" font-weight="800" letter-spacing="14">TACTICAL</text>
    <text x="430" y="320" fill="#fbbf24" font-family="monospace" font-size="76" font-weight="800" letter-spacing="14">COMMAND</text>
    <text x="434" y="378" fill="#a1a1aa" font-family="monospace" font-size="24" letter-spacing="8">OUTTHINK. OUTFLANK. OUTLAST.</text>
  </svg>`;
  await sharp(Buffer.from(featureSvg)).resize(1024, 500).png().toFile(resolve(publicDir, 'feature-graphic.png'));

  console.log('Icons + feature graphic generated.');
}

generate().catch((err) => { console.error(err); process.exit(1); });
