import fs from "fs";

function replaceColorsInFile(filepath: string) {
  let content = fs.readFileSync(filepath, "utf8");
  content = content.replace(/bg-\[#0e100c\]/g, "bg-zinc-950");
  content = content.replace(/text-\[#0e100c\]/g, "text-zinc-950");
  content = content.replace(/text-\[#dae3ce\]/g, "text-zinc-300");
  content = content.replace(/border-\[#2d3422\]/g, "border-zinc-800 border-opacity-50");
  content = content.replace(/bg-\[#141810\]/g, "bg-zinc-900 bg-opacity-80");
  content = content.replace(/bg-\[#1a2014\]/g, "bg-zinc-800 bg-opacity-80");
  content = content.replace(/border-\[#2d3324\]/g, "border-zinc-800 border-opacity-50");
  content = content.replace(/bg-\[#12150e\]/g, "bg-zinc-900 bg-opacity-80");
  content = content.replace(/bg-\[#151c11\]/g, "bg-zinc-800 bg-opacity-80");
  content = content.replace(/border-\[#1a2014\]/g, "border-zinc-800 border-opacity-50");
  // Also remove tracking-wider if we want to modernize
  fs.writeFileSync(filepath, content, "utf8");
}

["src/App.tsx", "src/components/Game.tsx", "src/components/CampaignMode.tsx", "src/components/TutorialMode.tsx"].forEach(replaceColorsInFile);
