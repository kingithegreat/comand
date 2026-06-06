import { GridCell, GridMap } from "./types";

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  layout: string[];
}

export const MAPS: MapPreset[] = [
  {
    id: "sector_alpha",
    name: "Sector Alpha",
    description: "The classic symmetrical layout with central fortified cargo warehousing and open flank routes.",
    layout: [
      "_______________",
      "_XX_C_____C_XX_",
      "_XX_________XX_",
      "______XXX______",
      "___C_______C___",
      "_____XXXXX_____",
      "_C___X___X___C_",
      "_____X_C_X_____",
      "_C___X___X___C_",
      "_____XXXXX_____",
      "___C_______C___",
      "______XXX______",
      "_XX_________XX_",
      "_XX_C_____C_XX_",
      "_______________",
    ]
  },
  {
    id: "choke_point",
    name: "Choke Point",
    description: "Symmetrical battlefield with a thick central blockade, forcing teams into dangerous corridor tactics.",
    layout: [
      "_______________",
      "__C_________C__",
      "____XXXXXXX____",
      "_______________",
      "_XX_C_____C_XX_",
      "_XX_________XX_",
      "_____X_C_X_____",
      "_XX_C_____C_XX_",
      "_____X_C_X_____",
      "_XX_________XX_",
      "_XX_C_____C_XX_",
      "_______________",
      "____XXXXXXX____",
      "__C_________C__",
      "_______________"
    ]
  },
  {
    id: "iron_fortress",
    name: "Iron Fortress",
    description: "A heavily protected central bunker with multiple access doors. Favors close-quarters engagement.",
    layout: [
      "_______________",
      "___XXXXXXXXX___",
      "___X_C___C_X___",
      "___X_______X___",
      "___X__XXX__X___",
      "______X_X______",
      "__C___X_X___C__",
      "______X_X______",
      "__C___X_X___C__",
      "______X_X______",
      "___X__XXX__X___",
      "___X_______X___",
      "___X_C___C_X___",
      "___XXXXXXXXX___",
      "_______________"
    ]
  },
  {
    id: "pillars_of_war",
    name: "Pillars of War",
    description: "Symmetrical columns of massive block structures with scattered crate barricades for balanced fire lanes.",
    layout: [
      "_______________",
      "_C___________C_",
      "___X_X_X_X_X___",
      "_______________",
      "__C___C___C____",
      "___X_X_X_X_X___",
      "_______________",
      "__C_C_C_C_C_C__",
      "_______________",
      "___X_X_X_X_X___",
      "____C___C___C__",
      "_______________",
      "___X_X_X_X_X___",
      "_C___________C_",
      "_______________"
    ]
  },
  {
    id: "labyrinth_zone",
    name: "Labyrinth Zone",
    description: "Winding maze corridors and narrow pathways with dense wall structures, optimizing close combat.",
    layout: [
      "_______________",
      "_XXXX_C_C_XXXX_",
      "_X___________X_",
      "_X_C_XXXXX_C_X_",
      "___X_______X___",
      "_X_X___C___X_X_",
      "_X_X_XXXXX_X_X_",
      "_______________",
      "_X_X_XXXXX_X_X_",
      "_X_X___C___X_X_",
      "___X_______X___",
      "_X_C_XXXXX_C_X_",
      "_X___________X_",
      "_XXXX_C_C_XXXX_",
      "_______________"
    ]
  },
  {
    id: "outpost_sniper",
    name: "Outpost Sniper",
    description: "Clear, expansive center lane with elevated flank fortifications encouraging long-range standoffs.",
    layout: [
      "_______________",
      "_XX_________XX_",
      "_XX_C_____C_XX_",
      "_______________",
      "_____XXXXX_____",
      "____XX_C_XX____",
      "_______________",
      "__C_C_____C_C__",
      "_______________",
      "____XX_C_XX____",
      "_____XXXXX_____",
      "_______________",
      "_XX_C_____C_XX_",
      "_XX_________XX_",
      "_______________"
    ]
  },
  {
    id: "crossed_swords",
    name: "Crossed Swords",
    description: "Diagonal wall barricades dividing the tactical grid into four equal quadrants and a central battleground.",
    layout: [
      "_______________",
      "__XX_______XX__",
      "___XX_____XX___",
      "____XX___XX____",
      "_____XX_XX_____",
      "______XXX______",
      "__C____C____C__",
      "_______C_______",
      "__C____C____C__",
      "______XXX______",
      "_____XX_XX_____",
      "____XX___XX____",
      "___XX_____XX___",
      "__XX_______XX__",
      "_______________"
    ]
  },
  {
    id: "the_hangar",
    name: "The Hangar",
    description: "Containment rooms on the flanks, divided by a high-intensity open runway down the center.",
    layout: [
      "_______________",
      "___XXX___XXX___",
      "_C_X_X___X_X_C_",
      "___X_X___X_X___",
      "___XXX___XXX___",
      "_______________",
      "_C__C_C_C_C__C_",
      "_______________",
      "_C__C_C_C_C__C_",
      "_______________",
      "___XXX___XXX___",
      "___X_X___X_X___",
      "_C_X_X___X_X_C_",
      "___XXX___XXX___",
      "_______________"
    ]
  },
  {
    id: "wasteland_dunes",
    name: "Wasteland Dunes",
    description: "Symmetrically scattered ruins, debris piles and rusted crates simulating a depleted warfare landscape.",
    layout: [
      "_______________",
      "___C___C___C___",
      "__XXX_____XXX__",
      "____C_____C____",
      "__C___XXX___C__",
      "______C_C______",
      "_XX_________XX_",
      "_____C___C_____",
      "_XX_________XX_",
      "______C_C______",
      "__C___XXX___C__",
      "____C_____C____",
      "__XXX_____XXX__",
      "___C___C___C___",
      "_______________"
    ]
  },
  {
    id: "fort_echo",
    name: "Fort Echo",
    description: "Heavy symmetrical trench-line fortification walls with narrow side doors for breach operations.",
    layout: [
      "_______________",
      "_XXXXXX_XXXXXX_",
      "__C_C_____C_C__",
      "_____XXXXX_____",
      "_______________",
      "__X_________X__",
      "__X_C_X_X_C_X__",
      "______X_X______",
      "__X_C_X_X_C_X__",
      "__X_________X__",
      "_______________",
      "_____XXXXX_____",
      "__C_C_____C_C__",
      "_XXXXXX_XXXXXX_",
      "_______________"
    ]
  },
  {
    id: "sector_aegis",
    name: "Sector Aegis",
    description: "A symmetrical central fortress wall shielding defensive barricades, designed for heavy defense lines.",
    layout: [
      "_______________",
      "_X_C_______C_X_",
      "___XXXXXXXXX___",
      "___X_C___C_X___",
      "___X_______X___",
      "_C_X___C___X_C_",
      "___X__XXX__X___",
      "______C_C______",
      "___X__XXX__X___",
      "_C_X___C___X_C_",
      "___X_______X___",
      "___X_C___C_X___",
      "___XXXXXXXXX___",
      "_X_C_______C_X_",
      "_______________"
    ]
  }
];

export const generateMap = (layout?: string[]): GridMap => {
  const finalLayout = layout || MAPS[0].layout;
  const map: GridCell[][] = [];
  for (let y = 0; y < 15; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < 15; x++) {
      const char = finalLayout[y]?.[x] || '_';
      let type: 'floor' | 'wall' | 'crate' = 'floor';
      if (char === 'X') type = 'wall';
      else if (char === 'C') type = 'crate';
      row.push({ x, y, type });
    }
    map.push(row);
  }
  return map;
};
