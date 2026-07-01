/**
 * Node-runnable assertions for the pure Phase 2 board mapping.
 * Run: node --experimental-strip-types src/three/boardMapping.test.ts
 * (No Three.js / DOM — pure data, so it executes in plain Node.)
 */
import assert from 'node:assert/strict';
import {
  tileAppearance,
  teamColor,
  unitBillboardY,
  tileTopY,
  FLOOR_HEIGHT,
} from './boardMapping.ts';

let n = 0;
const ok = (label: string) => { n++; };

// --- walls stand tall and are solid ---
const wall = tileAppearance('wall');
assert.equal(wall.height, 1.0, 'wall is 1.0 tall');
assert.equal(wall.solid, true, 'wall is solid');
assert.equal(wall.hazard, false, 'wall is not a hazard');
ok('wall');

// --- crate & barrel are mid-height solid cover ---
for (const t of ['crate', 'barrel'] as const) {
  const a = tileAppearance(t);
  assert.equal(a.solid, true, `${t} is solid`);
  assert.equal(a.hazard, false, `${t} is not a hazard`);
  assert.ok(a.height > FLOOR_HEIGHT && a.height < 1.0, `${t} mid-height`);
  ok(t);
}

// --- fire & poison are flat hazards, not solid ---
for (const t of ['fire', 'poison'] as const) {
  const a = tileAppearance(t);
  assert.equal(a.hazard, true, `${t} is a hazard`);
  assert.equal(a.solid, false, `${t} is not solid`);
  assert.equal(a.height, FLOOR_HEIGHT, `${t} is flat`);
  ok(t);
}

// --- floor is thin, walkable, and checkerboards by parity ---
const even = tileAppearance('floor', 0, 0); // (0+0)%2==0 -> light
const odd = tileAppearance('floor', 1, 0);  // (1+0)%2==1 -> dark
assert.equal(even.height, FLOOR_HEIGHT, 'floor thin');
assert.equal(even.solid, false, 'floor walkable');
assert.notEqual(even.color, odd.color, 'floor checkerboards by parity');
assert.equal(tileAppearance('floor', 2, 2).color, even.color, 'same parity -> same shade');
ok('floor-checker');

// --- unknown terrain fails safe to floor ---
// @ts-expect-error deliberately passing a bad type to test the default branch
const unknown = tileAppearance('lava', 0, 0);
assert.equal(unknown.solid, false, 'unknown fails safe to walkable');
assert.equal(unknown.height, FLOOR_HEIGHT, 'unknown fails safe to floor height');
ok('unknown-failsafe');

// --- team tint parity with the 2D board (player=sky, enemy=purple) ---
assert.equal(teamColor('player'), '#38bdf8', 'player is sky-400');
assert.equal(teamColor('enemy'), '#a855f7', 'enemy is purple-500');
assert.notEqual(teamColor('player'), teamColor('enemy'), 'teams are distinct');
ok('team-color');

// --- billboard sits on top of the floor, tile tops are height/2 ---
assert.ok(unitBillboardY(1.4) > FLOOR_HEIGHT / 2, 'billboard rests above floor');
assert.equal(tileTopY('wall'), 0.5, 'wall top is height/2');
assert.equal(tileTopY('floor'), FLOOR_HEIGHT / 2, 'floor top is height/2');
ok('seating');

console.log(`boardMapping: ${n} assertion groups passed`);
