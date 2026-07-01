/**
 * Phase 2 — pure GridMap -> 3D appearance mapping.
 *
 * Turns the game's terrain cells and unit teams into the colors + tile
 * elevations the 3D board renders. Kept free of Three.js / React imports on
 * purpose so it is trivially unit-testable in plain Node (see
 * boardMapping.test.ts). Tiles3D / Units3D consume these values and only do
 * the actual GPU work.
 */

import type { GridCell, Unit } from '../types';

export type TerrainType = GridCell['type']; // 'floor'|'wall'|'crate'|'fire'|'poison'|'barrel'
export type Team = Unit['team']; // 'player' | 'enemy'

export interface TileAppearance {
  /** Hex color for the tile top, mirrors the 2D palette's intent. */
  color: string;
  /** Tile height in world units (thin floor = 0.12, walls stand tall). */
  height: number;
  /** True for hazard tiles that should read as a flat glowing overlay. */
  hazard: boolean;
  /** True for solid cover a unit cannot stand on (wall/crate/barrel). */
  solid: boolean;
}

export const FLOOR_HEIGHT = 0.12; // matches the spike's boxGeometry thickness

/**
 * Deterministic terrain -> appearance table. Colors are chosen to echo the 2D
 * board (walls = slate block, crates = amber, barrels = rust, fire = orange,
 * poison = toxic green, floor = zinc). An unknown type fails safe to floor.
 */
export function tileAppearance(type: TerrainType, x = 0, y = 0): TileAppearance {
  switch (type) {
    case 'wall':
      return { color: '#334155', height: 1.0, hazard: false, solid: true }; // slate-700 block
    case 'crate':
      return { color: '#b45309', height: 0.55, hazard: false, solid: true }; // amber-700 cargo
    case 'barrel':
      return { color: '#9a3412', height: 0.55, hazard: false, solid: true }; // orange-800 drum
    case 'fire':
      return { color: '#f97316', height: FLOOR_HEIGHT, hazard: true, solid: false }; // orange-500
    case 'poison':
      return { color: '#22c55e', height: FLOOR_HEIGHT, hazard: true, solid: false }; // green-500
    case 'floor':
    default: {
      // Subtle checkerboard on floor for depth readability (two zinc shades).
      const light = (x + y) % 2 === 0;
      return {
        color: light ? '#1f2937' : '#111827', // zinc-800 / zinc-900
        height: FLOOR_HEIGHT,
        hazard: false,
        solid: false,
      };
    }
  }
}

/** Team tint for unit billboards — player = sky blue, enemy = purple (2D parity). */
export function teamColor(team: Team): string {
  return team === 'player' ? '#38bdf8' /* sky-400 */ : '#a855f7' /* purple-500 */;
}

/**
 * World-space Y (vertical center) at which a unit billboard should sit so its
 * base rests just above the tile it stands on. Units only occupy floor/hazard
 * tiles, so this is floor-height plus half the sprite height.
 */
export function unitBillboardY(spriteHeight: number): number {
  return FLOOR_HEIGHT / 2 + spriteHeight / 2;
}

/**
 * Convenience: derive the top surface Y of a tile of a given terrain type,
 * used to seat props/units flush on top. Tiles are centered on Y=0, so the top
 * is height/2.
 */
export function tileTopY(type: TerrainType): number {
  return tileAppearance(type).height / 2;
}
