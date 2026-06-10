import * as fs from 'fs';

const filesToProcess = ['src/components/Game.tsx', 'src/App.tsx', 'src/components/SelectedUnitConsole.tsx'];

for (const file of filesToProcess) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace "Red" with "Purple" where it's used as team text
    content = content.replace(/Red Squad/g, 'Purple Squad');
    content = content.replace(/Red Squadron/g, 'Purple Squadron');
    content = content.replace(/RED SQUAD/g, 'PURPLE SQUAD');
    content = content.replace(/RED SQUADRON/g, 'PURPLE SQUADRON');
    content = content.replace(/Blue' : 'Red'/g, "Blue' : 'Purple'");
    content = content.replace(/Blue Squad/g, 'Blue Squad'); // NOOP
    content = content.replace(/'Red' : 'Blue'/g, "'Purple' : 'Blue'");
    
    // Color replacements
    content = content.replace(/text-rose-400/g, 'text-purple-400');
    content = content.replace(/text-rose-350/g, 'text-purple-300');
    content = content.replace(/text-rose-500/g, 'text-purple-500');
    content = content.replace(/bg-rose-500/g, 'bg-purple-500');
    content = content.replace(/bg-rose-955/g, 'bg-purple-950');
    content = content.replace(/bg-rose-950/g, 'bg-purple-950');
    content = content.replace(/border-rose-500/g, 'border-purple-500');
    content = content.replace(/text-red-450/g, 'text-purple-400');
    content = content.replace(/text-red-400/g, 'text-purple-400');
    content = content.replace(/text-red-500/g, 'text-purple-500');
    content = content.replace(/text-red-155/g, 'text-purple-200');
    content = content.replace(/text-red-200/g, 'text-purple-200');
    content = content.replace(/bg-red-500/g, 'bg-purple-500');
    content = content.replace(/bg-red-600/g, 'bg-purple-600');
    content = content.replace(/bg-red-950/g, 'bg-purple-950');
    content = content.replace(/bg-red-955/g, 'bg-purple-950');
    content = content.replace(/bg-red-900/g, 'bg-purple-900');
    content = content.replace(/bg-red-400/g, 'bg-purple-400');
    content = content.replace(/border-red-500/g, 'border-purple-500');
    content = content.replace(/border-red-400/g, 'border-purple-400');
    content = content.replace(/border-red-600/g, 'border-purple-600');
    content = content.replace(/border-red-800/g, 'border-purple-800');
    content = content.replace(/bg-red-550/g, 'bg-purple-500');
    content = content.replace(/rgba\(239,68,68,/g, 'rgba(168,85,247,');  
    fs.writeFileSync(file, content);
  }
}
