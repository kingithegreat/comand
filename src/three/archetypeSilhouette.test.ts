/**
 * Node-runnable assertions for the pure archetype silhouette mapping.
 * Run: node --experimental-strip-types src/three/archetypeSilhouette.test.ts
 * (No Three.js / DOM — pure data, so it executes in plain Node.)
 */
import assert from 'node:assert/strict';
import { archetypeSilhouette } from './archetypeSilhouette.ts';
import type { Archetype } from '../types.ts';

let n = 0;
const ok = (label: string) => { n++; };

const ALL_ARCHETYPES: Archetype[] = ['Short Range', 'Long Range', 'Support', 'Explosives', 'Assault'];

// --- every archetype returns a well-formed spec ---
for (const a of ALL_ARCHETYPES) {
  const spec = archetypeSilhouette(a);
  assert.ok(spec.torso.length === 3, `${a}: torso is a 3-tuple`);
  assert.ok(spec.torso.every((v) => v > 0), `${a}: torso dims are positive`);
  assert.ok(spec.headRadius > 0, `${a}: headRadius positive`);
  assert.ok(spec.totalHeight > 0, `${a}: totalHeight positive`);
  assert.ok(Array.isArray(spec.accessories), `${a}: accessories is an array`);
  ok(`${a}-wellformed`);
}

// --- every archetype has at least one distinguishing accessory ---
// (the whole point of this module — a flat body with zero accessories would
// look identical to the old plain billboard, defeating the purpose)
for (const a of ALL_ARCHETYPES) {
  const spec = archetypeSilhouette(a);
  assert.ok(spec.accessories.length >= 1, `${a}: has at least one accessory shape`);
  ok(`${a}-has-accessory`);
}

// --- accessory geometry is well-formed (positive sizes, 3-tuple positions) ---
for (const a of ALL_ARCHETYPES) {
  const spec = archetypeSilhouette(a);
  for (const part of spec.accessories) {
    assert.ok(['box', 'cylinder', 'sphere', 'cone'].includes(part.kind), `${a}: accessory kind is a known primitive`);
    assert.equal(part.size.length, 3, `${a}: accessory size is a 3-tuple`);
    assert.ok(part.size.every((v) => v > 0), `${a}: accessory size values are positive`);
    assert.equal(part.position.length, 3, `${a}: accessory position is a 3-tuple`);
  }
  ok(`${a}-accessory-geometry`);
}

// --- Long Range (Sniper) reads taller/slimmer than Assault (broad) — a real silhouette difference ---
const sniper = archetypeSilhouette('Long Range');
const assaultSpec = archetypeSilhouette('Assault');
assert.ok(sniper.torso[0] < assaultSpec.torso[0], 'Long Range torso is narrower than Assault');
ok('long-range-narrower-than-assault');

// --- Short Range (compact) is shorter than Long Range (tall) ---
const shortRange = archetypeSilhouette('Short Range');
assert.ok(shortRange.totalHeight < sniper.totalHeight, 'Short Range is shorter than Long Range');
ok('short-range-shorter-than-long-range');

// --- unknown archetype string fails safe to the Short Range default, not a throw ---
// @ts-expect-error deliberately passing an invalid value to exercise the fail-safe default branch
const fallback = archetypeSilhouette('Nonexistent');
assert.deepEqual(fallback, archetypeSilhouette('Short Range'), 'unknown archetype falls back to Short Range spec, does not throw');
ok('unknown-archetype-fails-safe');

// --- every spec's totalHeight is in a plausible, similar-scale range (units should look like the same "cast") ---
for (const a of ALL_ARCHETYPES) {
  const spec = archetypeSilhouette(a);
  assert.ok(spec.totalHeight > 0.5 && spec.totalHeight < 1.5, `${a}: totalHeight (${spec.totalHeight.toFixed(2)}) is in the shared-scale range`);
  ok(`${a}-plausible-scale`);
}

console.log(`archetypeSilhouette.test.ts: ${n} assertion groups passed`);
