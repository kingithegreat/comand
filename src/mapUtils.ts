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
  },
  {
    id: "zero_point",
    name: "Zero Point",
    description: "Wide open combat zone with a tight cluster of scattered barricades at the absolute center.",
    layout: [
      "_______________",
      "_C___________C_",
      "_______________",
      "_______________",
      "_______C_______",
      "__X____C____X__",
      "___X_C_X_C_X___",
      "___CCXXXXXCC___",
      "___X_C_X_C_X___",
      "__X____C____X__",
      "_______C_______",
      "_______________",
      "_______________",
      "_C___________C_",
      "_______________"
    ]
  },
  {
    id: "mirage_strike",
    name: "Mirage Strike",
    description: "Diagonally symmetrical layout providing staggered cover and unpredictable engagement angles.",
    layout: [
      "__C_________X__",
      "___C_______X___",
      "____C_____X____",
      "_____C___X_____",
      "______C_X__C___",
      "_______X_X_____",
      "__XX__C___X____",
      "___XX_______XX_",
      "____X___C__XX__",
      "_____X_X_______",
      "___C__X_C______",
      "_____X___C_____",
      "____X_____C____",
      "___X_______C___",
      "__X_________C__"
    ]
  },
  {
    id: "quadrant_lock",
    name: "Quadrant Lock",
    description: "Four distinct walled-in tactical zones linked by vulnerable open crossings and central barricades.",
    layout: [
      "_C__XXXX_C_____",
      "____X__X_______",
      "_C__X__X_C_X_X_",
      "____XXXX___X_X_",
      "___________X_X_",
      "______C_C__X_X_",
      "_XXX___________",
      "_X_X___C_C_____",
      "_X_X___________",
      "_X_X__XXXX_____",
      "_X_X_C_X_X__C__",
      "_______X_X_____",
      "_____C_XXXX__C_",
      "_______________",
      "_______________"
    ]
  },
  {
    id: "checkmate_lane",
    name: "Checkmate Lane",
    description: "Linear cover formations promoting a chess-like staggered advance toward the enemy lines.",
    layout: [
      "_______________",
      "____C_____C____",
      "__XX_______XX__",
      "_____C___C_____",
      "__C_XX___XX_C__",
      "_______________",
      "_____C___C_____",
      "___XXXX_XXXX___",
      "_____C___C_____",
      "_______________",
      "__C_XX___XX_C__",
      "_____C___C_____",
      "__XX_______XX__",
      "____C_____C____",
      "_______________"
    ]
  },
  {
    id: "shattered_courtyard",
    name: "Shattered Courtyard",
    description: "A partially destroyed central enclosure demanding aggressive flank maneuvers for control.",
    layout: [
      "_______________",
      "__C___XXX___C__",
      "____XX___XX____",
      "_______C_______",
      "___XXXX_XXXX___",
      "___X_______X___",
      "___X_C___C_X___",
      "___C_______C___",
      "___X_C___C_X___",
      "___X_______X___",
      "___XXXX_XXXX___",
      "_______C_______",
      "____XX___XX____",
      "__C___XXX___C__",
      "_______________"
    ]
  },
  {
    id: "neon_alley",
    name: "Neon Alley",
    description: "Long vertical fire corridors ideal for snipers, with minor side-passages for tactical flankers.",
    layout: [
      "__C____C____C__",
      "__X____X____X__",
      "__X__C_X_C__X__",
      "__X____X____X__",
      "__X____X____X__",
      "_______X_______",
      "_XXX___X___XXX_",
      "__C____X____C__",
      "_XXX___X___XXX_",
      "_______X_______",
      "__X____X____X__",
      "__X____X____X__",
      "__X__C_X_C__X__",
      "__X____X____X__",
      "__C____C____C__"
    ]
  },
  {
    id: "hollow_bastion",
    name: "Hollow Bastion",
    description: "A ring of massive fortifications shielding a completely unprotected, high-risk central arena.",
    layout: [
      "__C_________C__",
      "____XXXXXXX____",
      "___X_______X___",
      "__X___C_C___X__",
      "__X_C_____C_X__",
      "_XX_________XX_",
      "__X_________X__",
      "_CX_________XC_",
      "__X_________X__",
      "_XX_________XX_",
      "__X_C_____C_X__",
      "__X___C_C___X__",
      "___X_______X___",
      "____XXXXXXX____",
      "__C_________C__"
    ]
  },
  {
    id: "crescent_divide",
    name: "Crescent Divide",
    description: "Curved walls split the field into two crescent zones. Mobility is required to secure firing lines.",
    layout: [
      "_______________",
      "___________C_X_",
      "_C________X____",
      "_______X_X_____",
      "_____X_C_______",
      "____X___C______",
      "___X___________",
      "___C___X_X___C_",
      "___________X___",
      "______C___X____",
      "_______C_X_____",
      "_____X_X_______",
      "____X________C_",
      "_X_C___________",
      "_______________"
    ]
  },
  {
    id: "urban_gridlock",
    name: "Urban Gridlock",
    description: "Extremely dense cover blocking widespread visibility, favoring shotgunners and stealth tactics.",
    layout: [
      "_______________",
      "__XX_C___C_XX__",
      "__XX_C___C_XX__",
      "____XXXXXXX____",
      "_C___________C_",
      "_XX__XX_XX__XX_",
      "_XX_C_XXX_C_XX_",
      "______C_C______",
      "_XX_C_XXX_C_XX_",
      "_XX__XX_XX__XX_",
      "_C___________C_",
      "____XXXXXXX____",
      "__XX_C___C_XX__",
      "__XX_C___C_XX__",
      "_______________"
    ]
  },
  {
    id: "orbital_platform",
    name: "Orbital Platform",
    description: "Symmetrical platforms with high visibility designed for unpredictable, rapid engagements.",
    layout: [
      "C_____________C",
      "___X_______X___",
      "___X_C___C_X___",
      "___X__XXX__X___",
      "______C_C______",
      "___XXXX_XXXX___",
      "__X_________X__",
      "_CXX___C___XXC_",
      "__X_________X__",
      "___XXXX_XXXX___",
      "______C_C______",
      "___X__XXX__X___",
      "___X_C___C_X___",
      "___X_______X___",
      "C_____________C"
    ]
  },
  {
    id: "frostbite_ridge",
    name: "Frostbite Ridge",
    description: "An icy, jagged terrain forcing players into narrow gullies and heavily trapped choke points.",
    layout: [
      "X_XXX_____XXX_X",
      "_C__X_____X__C_",
      "__X___XXX___X__",
      "__C_______C____",
      "_____XXXXX_____",
      "X____X___X____X",
      "X____C___C____X",
      "X_____XXX_____X",
      "X____C___C____X",
      "X____X___X____X",
      "_____XXXXX_____",
      "__C_______C____",
      "__X___XXX___X__",
      "_C__X_____X__C_",
      "X_XXX_____XXX_X"
    ]
  },
  {
    id: "neon_crossroads",
    name: "Neon Crossroads",
    description: "A futuristic intersection where paths cross over a volatile central hazard zone.",
    layout: [
      "_______________",
      "_X_C_______C_X_",
      "_X___XXXXX___X_",
      "_____C___C_____",
      "___XX_____XX___",
      "____X__X__X____",
      "__X_C__X__C_X__",
      "__X____C____X__",
      "__X_C__X__C_X__",
      "____X__X__X____",
      "___XX_____XX___",
      "_____C___C_____",
      "_X___XXXXX___X_",
      "_X_C_______C_X_",
      "_______________"
    ]
  },
  {
    id: "titan_core",
    name: "Titan Core",
    description: "A massive central structure dominates the map, providing ultimate high ground and absolute cover.",
    layout: [
      "X_C_________C_X",
      "_X___________X_",
      "__C__XXXXX__C__",
      "_____X___X_____",
      "___XXX_C_XXX___",
      "___X_______X___",
      "___X_XXXXX_X___",
      "___C___X___C___",
      "___X_XXXXX_X___",
      "___X_______X___",
      "___XXX_C_XXX___",
      "_____X___X_____",
      "__C__XXXXX__C__",
      "_X___________X_",
      "X_C_________C_X"
    ]
  },
  {
    id: "silent_valley",
    name: "Silent Valley",
    description: "Wide open sightlines divided by sparse, strategically essential crates.",
    layout: [
      "C_____________C",
      "_______________",
      "___C_______C___",
      "______X_X______",
      "_X___________X_",
      "___C_______C___",
      "_______X_______",
      "__C_X__C__X_C__",
      "_______X_______",
      "___C_______C___",
      "_X___________X_",
      "______X_X______",
      "___C_______C___",
      "_______________",
      "C_____________C"
    ]
  },
  {
    id: "overwatch_point",
    name: "Overwatch Point",
    description: "A heavily fortified center requires flanks, while perimeters leave combatants exposed.",
    layout: [
      "_____X_C_X_____",
      "___X_X___X_X___",
      "__X_X_____X_X__",
      "__X_X__C__X_X__",
      "__X___XXX___X__",
      "___XXX___XXX___",
      "_____C___C_____",
      "X_C__X___X__C_X",
      "_____C___C_____",
      "___XXX___XXX___",
      "__X___XXX___X__",
      "__X_X__C__X_X__",
      "__X_X_____X_X__",
      "___X_X___X_X___",
      "_____X_C_X_____"
    ]
  },
  {
    id: "blood_gulch",
    name: "Blood Gulch",
    description: "Two mirrored bases separated by a massive open field of fire.",
    layout: [
      "X_XXX_____XXX_X",
      "X_X_C_____C_X_X",
      "X_X_________X_X",
      "__X__C___C__X__",
      "_______________",
      "_____XX_XX_____",
      "____XX___XX____",
      "____C_____C____",
      "____XX___XX____",
      "_____XX_XX_____",
      "_______________",
      "__X__C___C__X__",
      "X_X_________X_X",
      "X_X_C_____C_X_X",
      "X_XXX_____XXX_X"
    ]
  },
  {
    id: "shatter_dome",
    name: "Shatter Dome",
    description: "A chaotic arena with crumbling walls blocking central pathways.",
    layout: [
      "_______C_______",
      "__XX_XX_XX_XX__",
      "__C_________C__",
      "_XX__X___X__XX_",
      "___X_______X___",
      "__X_X_C_C_X_X__",
      "__X___XXX___X__",
      "C___X__C__X___C",
      "__X___XXX___X__",
      "__X_X_C_C_X_X__",
      "___X_______X___",
      "_XX__X___X__XX_",
      "__C_________C__",
      "__XX_XX_XX_XX__",
      "_______C_______"
    ]
  },
  {
    id: "crimson_divide",
    name: "Crimson Divide",
    description: "A split battlefield featuring multiple narrow bridges that must be crossed.",
    layout: [
      "_C___________C_",
      "_X___XX_XX___X_",
      "_____CX_XC_____",
      "X_____X_X_____X",
      "X_____X_X_____X",
      "XXX___X_X___XXX",
      "__C___X_X___C__",
      "____XX___XX____",
      "__C___X_X___C__",
      "XXX___X_X___XXX",
      "X_____X_X_____X",
      "X_____X_X_____X",
      "_____CX_XC_____",
      "_X___XX_XX___X_",
      "_C___________C_"
    ]
  },
  {
    id: "omega_station",
    name: "Omega Station",
    description: "A complex orbital array offering multiple isolated engagement zones.",
    layout: [
      "__X_C_____C_X__",
      "_X_X_XXXXX_X_X_",
      "_X___X_C_X___X_",
      "__XXX_____XXX__",
      "_X_C_X___X_C_X_",
      "_X___X___X___X_",
      "_X_C_XXXXX_C_X_",
      "_______C_______",
      "_X_C_XXXXX_C_X_",
      "_X___X___X___X_",
      "_X_C_X___X_C_X_",
      "__XXX_____XXX__",
      "_X___X_C_X___X_",
      "_X_X_XXXXX_X_X_",
      "__X_C_____C_X__"
    ]
  },
  {
    id: "vortex_pit",
    name: "Vortex Pit",
    description: "Combatants are funneled constantly inward via an inescapable spiral design.",
    layout: [
      "XXXXXXXXXXXXXXC",
      "C_____________X",
      "X_XXXXXXXXXXX_X",
      "X_X_C_____C_X_X",
      "X_X_XXXXXXX_X_X",
      "X_X_X_C___X_X_X",
      "X_X_X_XXX_X_X_X",
      "X_X_X_XCX_X_X_X",
      "X_X_X_XXX_X_X_X",
      "X_X_X___C_X_X_X",
      "X_X_XXXXXXX_X_X",
      "X_X_________X_X",
      "X_XXXXXXXXXXX_X",
      "X_____________C",
      "CXXXXXXXXXXXXXX"
    ]
  },
  {
    id: "dead_drop",
    name: "Dead Drop",
    description: "An asymmetric extraction zone with scattered debris, tight corners, and a wide-open kill box in the center.",
    layout: [
      "_C_____C_____C_",
      "__XXX_____XXX__",
      "___X_C___C_X___",
      "_X_____________",
      "_X__C_XXX_C__X_",
      "___XX_____XX___",
      "_C_X___C___X_C_",
      "_______________",
      "_C_X___C___X_C_",
      "___XX_____XX___",
      "_X__C_XXX_C__X_",
      "_____________X_",
      "___X_C___C_X___",
      "__XXX_____XXX__",
      "_C_____C_____C_"
    ]
  },
  {
    id: "twin_spires",
    name: "Twin Spires",
    description: "Two mirrored tower structures connected by exposed catwalks. High risk, high reward positioning.",
    layout: [
      "_______________",
      "__XXXXX_XXXXX__",
      "__X_C_X_X_C_X__",
      "__X___X_X___X__",
      "__XXX_X_X_XXX__",
      "______X_X______",
      "_C__C_____C__C_",
      "_______________",
      "_C__C_____C__C_",
      "______X_X______",
      "__XXX_X_X_XXX__",
      "__X___X_X___X__",
      "__X_C_X_X_C_X__",
      "__XXXXX_XXXXX__",
      "_______________"
    ]
  },
  {
    id: "reactor_core",
    name: "Reactor Core",
    description: "A volatile central reactor surrounded by blast shielding. One wrong move and you're in the open.",
    layout: [
      "C_C_________C_C",
      "_X___________X_",
      "C___XXXXXXX___C",
      "___XX_____XX___",
      "___X__C_C__X___",
      "___X_C___C_X___",
      "__XX___X___XX__",
      "__X___XCX___X__",
      "__XX___X___XX__",
      "___X_C___C_X___",
      "___X__C_C__X___",
      "___XX_____XX___",
      "C___XXXXXXX___C",
      "_X___________X_",
      "C_C_________C_C"
    ]
  },
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
