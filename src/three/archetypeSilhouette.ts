/**
 * Phase 6 (visual upgrade, optional) — low-poly unit silhouettes.
 *
 * Units3D previously rendered every unit as an identical flat team-tinted
 * billboard regardless of class — a genuinely empty visual slot flagged in
 * the Rebuild Plan and lesson #41 (cosmetics parity was about board themes,
 * not this). This module is the pure, testable half of the fix: it maps each
 * of the game's 5 archetypes (13 classes group into 5) to a low-poly body
 * spec built from plain primitives (box/cylinder/sphere/cone) — no imported
 * meshes, no asset pipeline, matching the game's existing low-poly-primitive
 * aesthetic (see boardMapping.ts's tile blocks). Kept free of Three.js/React
 * imports on purpose so it's trivially unit-testable in plain Node, same
 * convention as boardMapping.ts / effectsMapping.ts.
 *
 * Scope note: differentiates by ARCHETYPE (5 shapes), not by all 13 individual
 * class names — a deliberate scope decision to ship a real, distinct-per-role
 * silhouette without a much larger per-class design pass. Every class already
 * carries an archetype (src/data.ts), so this covers 100% of units with 5
 * shapes rather than 13.
 */

import type { Archetype } from '../types';

export type PrimitiveKind = 'box' | 'cylinder' | 'sphere' | 'cone';

export interface AccessoryPart {
  kind: PrimitiveKind;
  /** [width/radiusTop, height, depth/radiusBottom] — interpreted per kind. */
  size: [number, number, number];
  /** Local position offset from the unit's origin (feet-center at y=0). */
  position: [number, number, number];
  /** Local rotation in radians [x, y, z]. Defaults to no rotation. */
  rotation?: [number, number, number];
}

export interface SilhouetteSpec {
  /** Torso box: [width, height, depth]. */
  torso: [number, number, number];
  /** Head sphere radius. */
  headRadius: number;
  /** Total standing height (feet to top of head) — drives ground-ring/label placement. */
  totalHeight: number;
  /** Archetype-specific attachments rendered in the unit's own team color. */
  accessories: AccessoryPart[];
}

const BASE_TORSO_W = 0.34;
const BASE_TORSO_H = 0.62;
const BASE_TORSO_D = 0.22;
const BASE_HEAD_R = 0.16;

/**
 * Archetype -> low-poly body spec. Every spec's totalHeight and torso are
 * close variations on a shared base so units read as the same "scale" of
 * character; accessories are what actually distinguish the silhouette.
 */
export function archetypeSilhouette(archetype: Archetype): SilhouetteSpec {
  switch (archetype) {
    case 'Long Range': {
      // Sniper: slightly taller/slimmer body + a long thin barrel forward.
      const torso: [number, number, number] = [BASE_TORSO_W * 0.85, BASE_TORSO_H * 1.08, BASE_TORSO_D * 0.85];
      return {
        torso,
        headRadius: BASE_HEAD_R * 0.95,
        totalHeight: BASE_TORSO_H * 1.08 + BASE_HEAD_R * 1.9,
        accessories: [
          {
            kind: 'cylinder',
            size: [0.025, 0.62, 0.025],
            position: [0.16, BASE_TORSO_H * 0.66, 0.22],
            rotation: [Math.PI / 2 - 0.35, 0, 0.08],
          },
        ],
      };
    }
    case 'Explosives': {
      // Demoman: bulkier body + a box pack riding the back + a stubby forward tip.
      const torso: [number, number, number] = [BASE_TORSO_W * 1.15, BASE_TORSO_H * 0.98, BASE_TORSO_D * 1.15];
      return {
        torso,
        headRadius: BASE_HEAD_R,
        totalHeight: BASE_TORSO_H * 0.98 + BASE_HEAD_R * 1.9,
        accessories: [
          {
            kind: 'box',
            size: [0.24, 0.32, 0.14],
            position: [0, BASE_TORSO_H * 0.55, -0.2],
          },
          {
            kind: 'cone',
            size: [0.06, 0.18, 0.06],
            position: [0, BASE_TORSO_H * 0.4, 0.22],
            rotation: [Math.PI / 2, 0, 0],
          },
        ],
      };
    }
    case 'Assault': {
      // Assault / Heavy / Vanguard: broad shoulders, standard-to-bulky frame.
      const torso: [number, number, number] = [BASE_TORSO_W * 1.2, BASE_TORSO_H, BASE_TORSO_D * 1.1];
      return {
        torso,
        headRadius: BASE_HEAD_R,
        totalHeight: BASE_TORSO_H + BASE_HEAD_R * 1.9,
        accessories: [
          {
            // Chest plate — small forward box for a bulkier read.
            kind: 'box',
            size: [BASE_TORSO_W * 1.0, BASE_TORSO_H * 0.5, 0.06],
            position: [0, BASE_TORSO_H * 0.62, BASE_TORSO_D * 0.62],
          },
        ],
      };
    }
    case 'Support': {
      // Medic / Technician / Support / Phantom: standard body + a small orb marker above the head.
      const torso: [number, number, number] = [BASE_TORSO_W * 0.95, BASE_TORSO_H * 0.95, BASE_TORSO_D * 0.95];
      const bodyHeight = BASE_TORSO_H * 0.95 + BASE_HEAD_R * 1.9;
      return {
        torso,
        headRadius: BASE_HEAD_R,
        totalHeight: bodyHeight + 0.22,
        accessories: [
          {
            kind: 'sphere',
            size: [0.08, 0.08, 0.08],
            position: [0, bodyHeight + 0.14, 0],
          },
        ],
      };
    }
    case 'Short Range':
    default: {
      // Scout / Shotgunner / Flamethrower / Assassin: compact body + a short wide forward weapon.
      const torso: [number, number, number] = [BASE_TORSO_W * 0.9, BASE_TORSO_H * 0.9, BASE_TORSO_D * 0.9];
      return {
        torso,
        headRadius: BASE_HEAD_R * 0.9,
        totalHeight: BASE_TORSO_H * 0.9 + BASE_HEAD_R * 1.8,
        accessories: [
          {
            kind: 'cylinder',
            size: [0.05, 0.22, 0.05],
            position: [0.14, BASE_TORSO_H * 0.5, 0.16],
            rotation: [Math.PI / 2 - 0.2, 0, 0.15],
          },
        ],
      };
    }
  }
}
