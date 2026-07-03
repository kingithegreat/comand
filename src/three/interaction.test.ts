/**
 * Pure-logic assertions for the 3D interaction helpers (Phase 3).
 * Run: node --experimental-strip-types src/three/interaction.test.ts (or tsx).
 */
import {
  moveCostColor,
  reachableMarkers,
  isUnitSelected,
  isMoveTarget,
  MOVE_COLOR_1AP,
  MOVE_COLOR_2AP,
  type ReachableTile,
} from './interaction';
import type { Unit } from '../types';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) { passed++; } else { failed++; console.error(`  ✗ ${label}`); }
}

const unit = { id: 'u1', x: 3, y: 4 } as unknown as Unit;
const reachable: ReachableTile[] = [
  { x: 3, y: 4, apCost: 1 }, // own tile — must be excluded
  { x: 3, y: 5, apCost: 1 },
  { x: 4, y: 4, apCost: 1 },
  { x: 3, y: 6, apCost: 2 },
];

// moveCostColor
assert(moveCostColor(1) === MOVE_COLOR_1AP, 'moveCostColor 1 AP is cyan');
assert(moveCostColor(2) === MOVE_COLOR_2AP, 'moveCostColor 2 AP is amber');
assert(moveCostColor(3) === MOVE_COLOR_2AP, 'moveCostColor >2 AP clamps to amber');

// reachableMarkers
const markers = reachableMarkers(unit, reachable);
assert(markers.length === 3, 'own tile excluded from markers');
assert(!markers.some((m) => m.x === 3 && m.y === 4), 'no marker on the selected unit tile');
assert(markers.find((m) => m.x === 3 && m.y === 5)?.color === MOVE_COLOR_1AP, '1 AP tile is cyan');
assert(markers.find((m) => m.x === 3 && m.y === 6)?.color === MOVE_COLOR_2AP, '2 AP tile is amber');
assert(markers.every((m) => typeof m.apCost === 'number'), 'markers carry apCost through');
assert(reachableMarkers(null, reachable).length === 0, 'no selection -> no markers');
assert(reachableMarkers(unit, null).length === 0, 'null reachable -> no markers');
assert(reachableMarkers(unit, []).length === 0, 'empty reachable -> no markers');

// isUnitSelected
assert(isUnitSelected(unit, 'u1') === true, 'matching id selects');
assert(isUnitSelected(unit, 'u2') === false, 'non-matching id does not select');
assert(isUnitSelected(unit, null) === false, 'null selection id selects nothing');
assert(isUnitSelected(unit, undefined) === false, 'undefined selection id selects nothing');

// isMoveTarget
assert(isMoveTarget(reachable, 3, 5) === true, 'reachable tile is a move target');
assert(isMoveTarget(reachable, 9, 9) === false, 'unreachable tile is not a move target');
assert(isMoveTarget(null, 3, 5) === false, 'null reachable -> never a target');

console.log(`interaction.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
