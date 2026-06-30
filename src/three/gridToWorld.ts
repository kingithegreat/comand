/**
 * Pure coordinate helpers for the 3D board spike.
 * Centralizes grid<->world conversion so every 3D component agrees.
 * No Three.js / React imports here on purpose -> trivially unit-testable.
 */

export const GRID_SIZE = 15;
export const TILE_SIZE = 1; // 1 world unit per tile
const HALF = (GRID_SIZE - 1) / 2; // 7 for a 15x15 board centered on origin

/** Grid (x,y) with x,y in [0..14] -> world position on the XZ plane, Y up. */
export function gridToWorld(x: number, y: number, elevation = 0): [number, number, number] {
  // Flip Z so grid "up" (y=0) points away from a camera placed at +Z.
  return [x - HALF, elevation, (GRID_SIZE - 1 - y) - HALF];
}

/** Decode an InstancedMesh instanceId (row-major) back to grid coords. */
export function instanceIdToGrid(id: number): { x: number; y: number } {
  return { x: id % GRID_SIZE, y: Math.floor(id / GRID_SIZE) };
}

/** Encode grid coords to a row-major instanceId. */
export function gridToInstanceId(x: number, y: number): number {
  return y * GRID_SIZE + x;
}

export const TILE_COUNT = GRID_SIZE * GRID_SIZE; // 225
