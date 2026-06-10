import * as fs from 'fs';

const content = fs.readFileSync('src/components/Game.tsx', 'utf8');

const updated = content
  // inside renderGrid and other places
  .replace(/text-\[4\.5px\]/g, 'text-[1cqw]')
  .replace(/text-\[5px\]/g, 'text-[1.2cqw]')
  .replace(/text-\[5\.5px\]/g, 'text-[1.5cqw]')
  .replace(/text-\[6px\]/g, 'text-[1.6cqw]')
  .replace(/text-\[6\.5px\]/g, 'text-[1.8cqw]')
  .replace(/text-\[7px\]/g, 'text-[1.8cqw]')
  .replace(/text-\[7\.5px\]/g, 'text-[2cqw]')
  .replace(/text-\[8px\]/g, 'text-[2cqw]')
  .replace(/text-\[8\.5px\]/g, 'text-[2.2cqw]')
  .replace(/text-\[9px\]/g, 'text-[2.4cqw]')
  .replace(/text-\[9\.5px\]/g, 'text-[2.5cqw]')
  .replace(/text-\[10px\]/g, 'text-[2.6cqw]')
  .replace(/text-\[11px\]/g, 'text-[2.8cqw]')
  .replace(/text-\[12px\]/g, 'text-[3cqw]');

fs.writeFileSync('src/components/Game.tsx', updated);
console.log('Done');
