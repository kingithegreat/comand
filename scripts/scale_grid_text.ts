import * as fs from 'fs';

const content = fs.readFileSync('src/components/Game.tsx', 'utf8');

const startIndex = content.indexOf('const renderGrid');
const endIndex = content.indexOf('return grid;', startIndex) + 12;

if (startIndex > -1 && endIndex > -1) {
  const before = content.substring(0, startIndex);
  let renderGridSection = content.substring(startIndex, endIndex);
  const after = content.substring(endIndex);

  renderGridSection = renderGridSection
    .replace(/text-\[4\.5px\]/g, 'text-[1.5cqw]')
    .replace(/text-\[5px\]/g, 'text-[1.6cqw]')
    .replace(/text-\[5\.5px\]/g, 'text-[1.8cqw]')
    .replace(/text-\[6px\]/g, 'text-[2cqw]')
    .replace(/text-\[6\.5px\]/g, 'text-[2.2cqw]')
    .replace(/text-\[7px\]/g, 'text-[2.5cqw]')
    .replace(/text-\[7\.5px\]/g, 'text-[2.8cqw]')
    .replace(/text-\[8px\]/g, 'text-[3cqw]')
    .replace(/text-\[8\.5px\]/g, 'text-[3.2cqw]')
    .replace(/text-\[9px\]/g, 'text-[3.5cqw]')
    .replace(/text-\[9\.5px\]/g, 'text-[4cqw]')
    .replace(/text-\[10px\]/g, 'text-[4.5cqw]');

  fs.writeFileSync('src/components/Game.tsx', before + renderGridSection + after);
  console.log('Replaced inside renderGrid');
}
