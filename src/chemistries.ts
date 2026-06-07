export interface ChemistryDuo {
  id: string;
  name: string;
  description: string;
  classes: [string, string];
  buffText: string;
  // Apply changes to stats based on presence of the partner class in the squad
  applyBuffs: (className: string, stats: { maxHP: number; damage: number; range: number; mobility: number; accuracy: number }) => { maxHP: number; damage: number; range: number; mobility: number; accuracy: number };
}

export const CHEMISTRIES: ChemistryDuo[] = [
  {
    id: "infiltrators",
    name: "Coordinated Recon Duo",
    description: "Sniper + Scout pairing. Fuses stealth surveillance with precision execution.",
    classes: ["Sniper", "Scout"],
    buffText: "Scout receives +15 Max HP and Sniper receives +1 Mobility.",
    applyBuffs: (className, stats) => {
      const newStats = { ...stats };
      if (className === "Scout") {
        newStats.maxHP += 15;
      }
      if (className === "Sniper") {
        newStats.mobility += 1;
      }
      return newStats;
    }
  },
  {
    id: "heavy_medic",
    name: "Nanite Juggernaut Guard",
    description: "Heavy + Medic pairing. Combines thick armor plating with constant bio-regeneration.",
    classes: ["Heavy", "Medic"],
    buffText: "Medic receives +5 Damage, Heavy receives +1 Range to defensive abilities.",
    applyBuffs: (className, stats) => {
      const newStats = { ...stats };
      if (className === "Medic") {
        newStats.damage += 5;
      }
      if (className === "Heavy") {
        newStats.range += 1;
      }
      return newStats;
    }
  },
  {
    id: "tech_support",
    name: "Smart Grid Overlock",
    description: "Technician + Support pairing. Unlocks synchronized defense sensors and lock-on grids.",
    classes: ["Technician", "Support"],
    buffText: "Both classes receive +15% Accuracy and +10 Max HP.",
    applyBuffs: (className, stats) => {
      const newStats = { ...stats };
      if (className === "Technician" || className === "Support") {
        newStats.accuracy += 15;
        newStats.maxHP += 10;
      }
      return newStats;
    }
  },
  {
    id: "breachers",
    name: "CQC Pyrotechnic Breachers",
    description: "Shotgunner + Flamethrower pairing. Leverages extreme close-range threat synergy.",
    classes: ["Shotgunner", "Flamethrower"],
    buffText: "Both classes receive +1 Mobility to close-in flanking vectors quickly.",
    applyBuffs: (className, stats) => {
      const newStats = { ...stats };
      if (className === "Shotgunner" || className === "Flamethrower") {
        newStats.mobility += 1;
      }
      return newStats;
    }
  },
  {
    id: "artillery",
    name: "Assault Artillery Vanguard",
    description: "Assault + Demoman pairing. Combines heavy infantry suppression with long-range mortar support.",
    classes: ["Assault", "Demoman"],
    buffText: "Assault receives +15 Max HP; Demoman receives +5% Accuracy and +1 Range.",
    applyBuffs: (className, stats) => {
      const newStats = { ...stats };
      if (className === "Assault") {
        newStats.maxHP += 15;
      }
      if (className === "Demoman") {
        newStats.accuracy += 5;
        newStats.range += 1;
      }
      return newStats;
    }
  }
];

export const getActiveChemistries = (classNames: string[]): ChemistryDuo[] => {
  const active: ChemistryDuo[] = [];
  const uniqueClasses = new Set(classNames);
  for (const duo of CHEMISTRIES) {
    if (uniqueClasses.has(duo.classes[0]) && uniqueClasses.has(duo.classes[1])) {
      active.push(duo);
    }
  }
  return active;
};

export const applyChemistryBuffsToStats = (
  className: string,
  baseStats: { maxHP: number; damage: number; range: number; mobility: number; accuracy: number },
  squadClassNames: string[]
) => {
  let stats = { ...baseStats };
  const activeChemistries = getActiveChemistries(squadClassNames);
  for (const chemistry of activeChemistries) {
    if (chemistry.classes.includes(className)) {
      stats = chemistry.applyBuffs(className, stats);
    }
  }
  return stats;
};
