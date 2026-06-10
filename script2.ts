import fs from "fs";

function updateBody(filepath) {
  let content = fs.readFileSync(filepath, "utf8");
  content = content.replace(/className="min-h-screen bg-zinc-950/g, 'className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950');
  content = content.replace(/rounded-lg/g, "rounded-2xl");
  content = content.replace(/rounded-md/g, "rounded-xl");
  content = content.replace(/rounded/g, "rounded-lg");
  // Let's restore any broken strings
  content = content.replace(/rounded-lg-2xl/g, "rounded-2xl");
  content = content.replace(/rounded-lg-xl/g, "rounded-xl");
  content = content.replace(/rounded-lg-lg/g, "rounded-lg");
  content = content.replace(/rounded-lg-sm/g, "rounded-md");
  content = content.replace(/rounded-lg-full/g, "rounded-full");
  content = content.replace(/rounded-lg-none/g, "rounded-none");
  content = content.replace(/rounded-lg-t-lg/g, "rounded-t-2xl");
  
  fs.writeFileSync(filepath, content, "utf8");
}

["src/App.tsx", "src/components/Game.tsx"].forEach(updateBody);
