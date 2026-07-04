/**
 * Pure-logic assertions for the 3D effects helpers (Phase 4).
 * Run: node --experimental-strip-types src/three/effectsMapping.test.ts (or tsx).
 * (On Node versions where extensionless TS imports fail, copy src/three/*.ts to a
 * scratch dir with explicit .ts import extensions — see playbook lesson #38.)
 */
import {
  damageTextAppearance,
  hitEffectAppearance,
  slideWorldDelta,
  slideProgress,
  dyingAppearance,
  damageTextMotion,
  shakeOffset,
  zoomToCameraDistance,
  clamp01,
  easeOutCubic,
  MUZZLE_COLOR,
  HIT_DURATION_MS,
  DEATH_DURATION_MS,
  SLIDE_DURATION_MS,
  DYING_DURATION_MS,
  DAMAGE_TEXT_DURATION_MS,
  MUZZLE_DURATION_MS,
  SHAKE_MAGNITUDE,
  ZOOM_MIN_DISTANCE,
  ZOOM_MAX_DISTANCE,
  ZOOM_BASE_DISTANCE,
} from './effectsMapping';
import { gridToWorld } from './gridToWorld';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) { passed++; } else { failed++; console.error(`  ✗ ${label}`); }
}
function close(a: number, b: number, eps = 1e-9) { return Math.abs(a - b) < eps; }

// damageTextAppearance — mirrors the 2D board render exactly.
assert(damageTextAppearance(12).text === '-12', 'positive amount renders as damage');
assert(damageTextAppearance(12).color === '#a855f7', 'damage is purple');
assert(damageTextAppearance(0).text === 'MISS', 'zero renders MISS');
assert(damageTextAppearance(0).color === '#a1a1aa', 'MISS is zinc');
assert(damageTextAppearance(-1).text === '+1 AP', '-1 renders +1 AP');
assert(damageTextAppearance(-1).color === '#fbbf24', '+1 AP is amber');
assert(damageTextAppearance(-2).text === 'DEPLOYED', '-2 renders DEPLOYED');
assert(damageTextAppearance(-2).color === '#22d3ee', 'DEPLOYED is cyan');
assert(damageTextAppearance(-7).text === '+7 HP', 'other negatives render heals');
assert(damageTextAppearance(-7).color === '#34d399', 'heal is emerald');

// hitEffectAppearance — durations must match the Game.tsx setTimeout clears.
assert(hitEffectAppearance('hit').durationMs === HIT_DURATION_MS, 'hit duration 450ms');
assert(hitEffectAppearance('miss').durationMs === HIT_DURATION_MS, 'miss duration 450ms');
assert(hitEffectAppearance('death').durationMs === DEATH_DURATION_MS, 'death duration 700ms');
assert(hitEffectAppearance('death').maxRadius > hitEffectAppearance('hit').maxRadius,
  'death pulse reads bigger than hit');
assert(HIT_DURATION_MS === 450 && DEATH_DURATION_MS === 700 && MUZZLE_DURATION_MS === 300
  && SLIDE_DURATION_MS === 350 && DYING_DURATION_MS === 700 && DAMAGE_TEXT_DURATION_MS === 1000,
  'durations stay in sync with Game.tsx timeouts');
assert(MUZZLE_COLOR === '#fde047', 'muzzle flash is yellow-300 like the 2D dot');

// slideWorldDelta — grid offset (dx,dy) -> world offset with the Z flip.
assert(JSON.stringify(slideWorldDelta(1, 0)) === '[1,0,0]', '+dx slides along +X');
assert(JSON.stringify(slideWorldDelta(0, 1)) === '[0,0,-1]', '+dy (grid down) is -Z in world');
assert(JSON.stringify(slideWorldDelta(-2, 3, 2)) === '[-4,0,-6]', 'scales by tileSize');
// Cross-check against gridToWorld: start tile (x+dx, y+dy) minus dest (x, y).
{
  const dest = gridToWorld(4, 5);
  const start = gridToWorld(5, 6);
  const delta = slideWorldDelta(1, 1);
  assert(close(dest[0] + delta[0], start[0]) && close(dest[2] + delta[2], start[2]),
    'slideWorldDelta agrees with gridToWorld for the origin tile');
}

// easing
assert(clamp01(-1) === 0 && clamp01(2) === 1 && clamp01(0.5) === 0.5, 'clamp01 clamps');
assert(easeOutCubic(0) === 0 && easeOutCubic(1) === 1, 'easeOutCubic endpoints');
assert(easeOutCubic(0.5) > 0.5, 'easeOutCubic front-loads motion');
assert(slideProgress(0) === 0 && slideProgress(SLIDE_DURATION_MS) === 1
  && slideProgress(SLIDE_DURATION_MS * 2) === 1, 'slideProgress clamps at 1');

// dyingAppearance — mirrors the 2D death-dissolve keyframes.
{
  const start = dyingAppearance(0);
  const pop = dyingAppearance(DYING_DURATION_MS * 0.2);
  const mid = dyingAppearance(DYING_DURATION_MS * 0.5);
  const end = dyingAppearance(DYING_DURATION_MS);
  assert(close(start.scale, 1) && close(start.opacity, 1), 'dying starts at rest');
  assert(close(pop.scale, 1.15), 'dying pops to 1.15 at 20%');
  assert(close(mid.scale, 1.1) && close(mid.opacity, 0.6), 'dying settles 1.1/0.6 at 50%');
  assert(close(end.scale, 0.5) && close(end.opacity, 0), 'dying ends shrunk + invisible');
  assert(dyingAppearance(DYING_DURATION_MS * 99).opacity === 0, 'stays gone after the end');
}

// damageTextMotion — rises and fades out completely.
{
  const start = damageTextMotion(0);
  const hold = damageTextMotion(DAMAGE_TEXT_DURATION_MS * 0.5);
  const end = damageTextMotion(DAMAGE_TEXT_DURATION_MS);
  assert(close(start.rise, 0) && close(start.opacity, 1), 'text starts at tile, opaque');
  assert(hold.rise > 0 && close(hold.opacity, 1), 'text holds opacity while rising');
  assert(close(end.rise, 0.9) && close(end.opacity, 0), 'text ends risen + faded');
}

// shakeOffset — bounded, active mid-shake, exactly zero at/after the end.
{
  const [mx, mz] = shakeOffset(60);
  assert(Math.abs(mx) <= SHAKE_MAGNITUDE && Math.abs(mz) <= SHAKE_MAGNITUDE,
    'shake bounded by magnitude');
  assert(Math.abs(mx) + Math.abs(mz) > 0, 'shake is nonzero mid-shake');
  const [ex, ez] = shakeOffset(10_000);
  assert(ex === 0 && ez === 0, 'shake decays to exactly zero');
  const [ax, az] = shakeOffset(60);
  assert(ax === mx && az === mz, 'shake is deterministic');
}

// zoomToCameraDistance — 100% = base, 140% closer, clamped, garbage-safe.
assert(close(zoomToCameraDistance(100), ZOOM_BASE_DISTANCE), '100% is base distance');
assert(zoomToCameraDistance(140) < zoomToCameraDistance(100), '140% dollies closer');
assert(close(zoomToCameraDistance(140), Math.max(ZOOM_MIN_DISTANCE, ZOOM_BASE_DISTANCE * 100 / 140)),
  '140% maps linearly');
assert(zoomToCameraDistance(1_000_000) === ZOOM_MIN_DISTANCE, 'clamps to min');
assert(zoomToCameraDistance(1) === ZOOM_MAX_DISTANCE, 'clamps to max');
assert(close(zoomToCameraDistance(NaN), ZOOM_BASE_DISTANCE), 'NaN falls back to 100%');
assert(close(zoomToCameraDistance(-5), ZOOM_BASE_DISTANCE), 'negative falls back to 100%');

console.log(`effectsMapping.test: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
