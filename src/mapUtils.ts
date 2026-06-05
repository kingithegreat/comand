import { GridCell, GridMap } from "./types";

const INITIAL_LAYOUT = [
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
];

export const generateMap = (): GridMap => {
  const map: GridCell[][] = [];
  for (let y = 0; y < 15; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < 15; x++) {
      const char = INITIAL_LAYOUT[y][x];
      let type: 'floor' | 'wall' | 'crate' = 'floor';
      if (char === 'X') type = 'wall';
      else if (char === 'C') type = 'crate';
      row.push({ x, y, type });
    }
    map.push(row);
  }
  return map;
};
