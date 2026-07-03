import type { Unit } from '../types';

/**
 * Pure interaction helpers for the 3D board (Phase 3).
 *
 * Three-free and node-testable on purpose — mirrors Phase 2's boardMapping.ts.
 * All overlay math lives here so Overlays3D.tsx stays purely presentational.
 */

/** A tile the selected unit can reach this turn (shape of logic.ts getReachableTiles items). */
export interface ReachableTile {
  x: number;
  y: number;
  apCost: number;
}

/** A ring marker to draw on the 3D board. */
export interface TileMarker {
  x: number;
  y: number;
  apCost: number;
  color: string;
}

/** Cyan ring — reachable for 1 AP. */
export const MOVE_COLOR_1AP = '#22d3ee';
/** Amber ring — reachable for 2 AP. */
export const MOVE_COLOR_2AP = '#f59e0b';
/** Bright ring under the currently selected unit. */
export const SELECT_COLOR = '#e2e8f0';

/** Marker color for a reachable tile, by AP cost. */
export function moveCostColor(apCost: number): string {
  return apCost >= 2 ? MOVE_COLOR_2AP : MOVE_COLOR_1AP;
}

/**
 * Build the ring markers for every reachable tile of the selected unit.
 * The unit's own tile is excluded — the selection ring already marks it.
 */
export function reachableMarkers(
  selected: Unit | null | undefined,
  reachable: ReachableTile[] | null | undefined,
): TileMarker[] {
  if (!selected || !reachable || reachable.length === 0) return [];
  const markers: TileMarker[] = [];
  for (const t of reachable) {
    if (t.x === selected.x && t.y === selected.y) continue;
    markers.push({ x: t.x, y: t.y, apCost: t.apCost, color: moveCostColor(t.apCost) });
  }
  return markers;
}

/** True when this unit is the currently selected one. */
export function isUnitSelected(unit: Unit, selectedUnitId: string | null | undefined): boolean {
  return !!selectedUnitId && unit.id === selectedUnitId;
}

/** True when (x, y) is a legal move target for the current selection. */
export function isMoveTarget(
  reachable: ReachableTile[] | null | undefined,
  x: number,
  y: number,
): boolean {
  return !!reachable && reachable.some((t) => t.x === x && t.y === y);
}
