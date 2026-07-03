/**
 * Phase 4 — pure effect-state -> 3D appearance mapping.
 *
 * Three-free and node-testable on purpose, mirroring boardMapping.ts (Phase 2)
 * and interaction.ts (Phase 3). Everything the effects layer needs to compute
 * — damage-text labels/colors, pulse colors/durations, slide/death easing,
 * camera shake offsets and the zoomLevel->camera-distance binding — lives here
 * so Effects3D.tsx / Units3D.tsx / CameraRig.tsx stay purely presentational.
 *
 * Semantics are mirrored 1:1 from the 2D board render in Game.tsx (~line 4207)
 * and its effect timeouts (~lines 489-508) so both views read identically.
 */

/** Shape of Game.tsx `damageTexts` state items. */
export interface DamageTextState {
  id: string;
  x: number;
  y: number;
  amount: number;
}

/** Shape of Game.tsx `hitEffects` state items. */
export interface HitEffectState {
  id: string;
  x: number;
  y: number;
  type: 'hit' | 'miss' | 'death';
}

/** Shape of Game.tsx `muzzleFlashes` state items. */
export interface MuzzleFlashState {
  id: string;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Durations — MUST stay in sync with the setTimeout clears in Game.tsx.
// ---------------------------------------------------------------------------

export const DAMAGE_TEXT_DURATION_MS = 1000; // Game.tsx damage-text timeout
export const HIT_DURATION_MS = 450; // hit / miss flash timeout
export const DEATH_DURATION_MS = 700; // death flash + dyingUnits timeout
export const MUZZLE_DURATION_MS = 300; // muzzle flash timeout
export const SLIDE_DURATION_MS = 350; // slidingUnits timeout
export const DYING_DURATION_MS = 700; // dyingUnits timeout
export const SHAKE_DURATION_MS = 250; // shake resets after 200-300ms in Game.tsx
export const SHAKE_MAGNITUDE = 0.16; // world units of camera-target jitter

// ---------------------------------------------------------------------------
// Damage texts — label + color, mirrored exactly from the 2D render.
// ---------------------------------------------------------------------------

export interface DamageTextAppearance {
  text: string;
  /** Hex color (tailwind palette values used by the 2D classes). */
  color: string;
}

/**
 * amount > 0  -> "-N" purple (damage)
 * amount == 0 -> "MISS" zinc
 * amount == -1 -> "+1 AP" amber
 * amount == -2 -> "DEPLOYED" cyan
 * other negatives -> "+N HP" emerald (heals)
 */
export function damageTextAppearance(amount: number): DamageTextAppearance {
  if (amount < 0) {
    if (amount === -1) return { text: '+1 AP', color: '#fbbf24' }; // amber-400
    if (amount === -2) return { text: 'DEPLOYED', color: '#22d3ee' }; // cyan-400
    return { text: `+${Math.abs(amount)} HP`, color: '#34d399' }; // emerald-400
  }
  if (amount === 0) return { text: 'MISS', color: '#a1a1aa' }; // zinc-400
  return { text: `-${amount}`, color: '#a855f7' }; // purple-500
}

// ---------------------------------------------------------------------------
// Hit / miss / death pulses + muzzle flashes.
// ---------------------------------------------------------------------------

export interface PulseAppearance {
  color: string;
  /** Final ring radius in world units. */
  maxRadius: number;
  durationMs: number;
}

export function hitEffectAppearance(type: HitEffectState['type']): PulseAppearance {
  switch (type) {
    case 'death':
      return { color: '#c084fc', maxRadius: 0.85, durationMs: DEATH_DURATION_MS }; // purple-400
    case 'miss':
      return { color: '#a1a1aa', maxRadius: 0.5, durationMs: HIT_DURATION_MS }; // zinc-400
    case 'hit':
    default:
      return { color: '#f87171', maxRadius: 0.6, durationMs: HIT_DURATION_MS }; // red-400
  }
}

export const MUZZLE_COLOR = '#fde047'; // yellow-300, matches the 2D flash dot

// ---------------------------------------------------------------------------
// Easing + animation progress helpers (pure, deterministic).
// ---------------------------------------------------------------------------

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

/**
 * Where a sliding unit STARTS relative to its destination tile, in world
 * units. The 2D CSS animation translates from (dx*100%, dy*100%) to rest;
 * CSS +y is "down the grid" (grid +y) and world Z is flipped vs grid y
 * (see gridToWorld), so grid offset (dx, dy) -> world offset (dx, 0, -dy).
 */
export function slideWorldDelta(
  dx: number,
  dy: number,
  tileSize = 1,
): [number, number, number] {
  return [dx * tileSize, 0, -dy * tileSize];
}

/** Slide progress [0..1] at `elapsedMs`, eased like the 2D ease-out slide. */
export function slideProgress(elapsedMs: number): number {
  return easeOutCubic(elapsedMs / SLIDE_DURATION_MS);
}

/**
 * Death-dissolve at `elapsedMs`: scale pops to 1.15, settles, then shrinks to
 * 0.5 while fading out — a piecewise mirror of the 2D `death-dissolve`
 * keyframes (0% s1/o1, 20% s1.15/o1, 50% s1.1/o0.6, 100% s0.5/o0).
 */
export function dyingAppearance(elapsedMs: number): { scale: number; opacity: number } {
  const t = clamp01(elapsedMs / DYING_DURATION_MS);
  if (t < 0.2) {
    const k = t / 0.2;
    return { scale: 1 + 0.15 * k, opacity: 1 };
  }
  if (t < 0.5) {
    const k = (t - 0.2) / 0.3;
    return { scale: 1.15 - 0.05 * k, opacity: 1 - 0.4 * k };
  }
  const k = (t - 0.5) / 0.5;
  return { scale: 1.1 - 0.6 * k, opacity: 0.6 * (1 - k) };
}

/**
 * Rising damage-text motion: world-units risen + opacity at `elapsedMs`.
 * Rises ~0.9 units and holds full opacity for 60% of its life, then fades.
 */
export function damageTextMotion(elapsedMs: number): { rise: number; opacity: number } {
  const t = clamp01(elapsedMs / DAMAGE_TEXT_DURATION_MS);
  return {
    rise: 0.9 * easeOutCubic(t),
    opacity: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4,
  };
}

/**
 * Deterministic damped-sinusoid camera shake. Returns the [x, z] world offset
 * to apply to the camera target; decays to exactly [0, 0] at the end so the
 * camera always comes back to rest.
 */
export function shakeOffset(
  elapsedMs: number,
  magnitude = SHAKE_MAGNITUDE,
  durationMs = SHAKE_DURATION_MS,
): [number, number] {
  const t = clamp01(elapsedMs / durationMs);
  if (t >= 1) return [0, 0];
  const decay = 1 - t;
  return [
    Math.sin(t * Math.PI * 8) * magnitude * decay,
    Math.cos(t * Math.PI * 6) * magnitude * 0.6 * decay,
  ];
}

// ---------------------------------------------------------------------------
// Zoom binding — the existing zoomLevel UI (100% / 140%) drives camera dolly.
// ---------------------------------------------------------------------------

/** Default camera distance (|[0,12,12]| ≈ 17). Keep in sync with CameraRig. */
export const ZOOM_BASE_DISTANCE = 17;
/** Must match CameraRig's OrbitControls minDistance / maxDistance. */
export const ZOOM_MIN_DISTANCE = 8;
export const ZOOM_MAX_DISTANCE = 26;

/**
 * zoomLevel % -> camera distance: 100% = base, 140% ≈ 12.1 (closer), clamped
 * to the orbit-controls range. Garbage input falls back to 100%.
 */
export function zoomToCameraDistance(zoomLevel: number): number {
  const z = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 100;
  const d = ZOOM_BASE_DISTANCE * (100 / z);
  return Math.min(ZOOM_MAX_DISTANCE, Math.max(ZOOM_MIN_DISTANCE, d));
}
