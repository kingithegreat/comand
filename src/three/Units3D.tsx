import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import { gridToWorld } from './gridToWorld';
import { teamColor, unitBillboardY, FLOOR_HEIGHT } from './boardMapping';
import {
  slideWorldDelta,
  slideProgress,
  dyingAppearance,
  DYING_DURATION_MS,
} from './effectsMapping';
import type { Unit } from '../types';

/**
 * Phase 2 — team-tinted unit billboards.
 * Phase 4 — slide + death animations driven by the same Game.tsx state the 2D
 * board uses (`slidingUnits` map of grid deltas, `dyingUnits` id set).
 *
 * Renders one camera-facing token per unit at its real grid tile, tinted sky
 * (player) or purple (enemy) to match the 2D board. Each token is a `Billboard`
 * (always faces the camera) holding a rounded standee plane over a dark
 * backing plate, plus a flat ground ring that marks exactly which tile the unit
 * occupies. Dead units (hp <= 0) are skipped UNLESS they are mid death-dissolve.
 * Pure presentational layer — reads unit x/y/team/hp only, never mutates game
 * state. frameloop="demand": animations call invalidate() until they finish.
 */

const TOKEN_W = 0.62;
const TOKEN_H = 1.25;

interface Units3DProps {
  units: Unit[];
  /** Grid-delta the unit slid FROM, keyed by unit id (Game.tsx slidingUnits). */
  slidingUnits?: Map<string, { dx: number; dy: number }>;
  /** Units currently playing the death dissolve (Game.tsx dyingUnits). */
  dyingUnits?: Set<string>;
}

function UnitToken({
  unit,
  slide,
  dying,
}: {
  unit: Unit;
  slide?: { dx: number; dy: number };
  dying: boolean;
}) {
  const color = teamColor(unit.team);
  const [wx, , wz] = gridToWorld(unit.x, unit.y, 0);
  const y = unitBillboardY(TOKEN_H);
  const groupRef = useRef<Group>(null);
  const matRefs = useRef<(MeshBasicMaterial | null)[]>([null, null, null, null]);
  const born = useRef<{ slide?: number; dying?: number }>({});
  if (slide && born.current.slide === undefined) born.current.slide = performance.now();
  if (!slide) born.current.slide = undefined;
  if (dying && born.current.dying === undefined) born.current.dying = performance.now();
  if (!dying) born.current.dying = undefined;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    let active = false;
    // Slide: start displaced by the grid delta, ease into the resting tile.
    if (slide && born.current.slide !== undefined) {
      const p = slideProgress(performance.now() - born.current.slide);
      const [ox, , oz] = slideWorldDelta(slide.dx, slide.dy);
      g.position.set(wx + ox * (1 - p), 0, wz + oz * (1 - p));
      if (p < 1) active = true;
    } else {
      g.position.set(wx, 0, wz);
    }
    // Death dissolve: pop, settle, shrink + fade (mirrors the 2D keyframes).
    if (dying && born.current.dying !== undefined) {
      const elapsed = performance.now() - born.current.dying;
      const { scale, opacity } = dyingAppearance(elapsed);
      g.scale.set(scale, scale, scale);
      for (const m of matRefs.current) {
        if (m) {
          m.transparent = true;
          m.opacity = Math.min(m.userData.baseOpacity ?? 1, opacity);
        }
      }
      if (elapsed < DYING_DURATION_MS) active = true;
    } else {
      g.scale.set(1, 1, 1);
    }
    if (active) state.invalidate();
  });

  const setMat = (i: number) => (m: MeshBasicMaterial | null) => {
    matRefs.current[i] = m;
    if (m && m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
  };

  return (
    <group ref={groupRef} position={[wx, 0, wz]}>
      {/* Standee token — always faces the camera. */}
      <Billboard position={[0, y, 0]}>
        {/* dark backing plate for contrast/outline */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[TOKEN_W + 0.12, TOKEN_H + 0.12]} />
          <meshBasicMaterial ref={setMat(0)} color="#0b0f14" transparent opacity={0.85} />
        </mesh>
        {/* team-tinted face */}
        <mesh>
          <planeGeometry args={[TOKEN_W, TOKEN_H]} />
          <meshBasicMaterial ref={setMat(1)} color={color} toneMapped={false} />
        </mesh>
        {/* head dot for a readable "unit" silhouette */}
        <mesh position={[0, TOKEN_H / 2 - 0.16, 0.01]}>
          <circleGeometry args={[0.16, 24]} />
          <meshBasicMaterial ref={setMat(2)} color="#0b0f14" toneMapped={false} />
        </mesh>
      </Billboard>

      {/* Ground ring on the occupied tile (flat on the board). */}
      <mesh position={[0, FLOOR_HEIGHT + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 28]} />
        <meshBasicMaterial
          ref={setMat(3)}
          color={color}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

export default function Units3D({ units, slidingUnits, dyingUnits }: Units3DProps) {
  const visible = useMemo(
    () =>
      units.filter((u) => {
        const alive = u.hp === undefined ? true : u.hp > 0;
        // Keep dead units on the board while their dissolve is playing.
        return alive || (dyingUnits?.has(u.id) ?? false);
      }),
    [units, dyingUnits],
  );

  return (
    <group>
      {visible.map((u) => (
        <UnitToken
          key={u.id}
          unit={u}
          slide={slidingUnits?.get(u.id)}
          dying={dyingUnits?.has(u.id) ?? false}
        />
      ))}
    </group>
  );
}
