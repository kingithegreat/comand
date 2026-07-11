import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { gridToWorld } from './gridToWorld';
import { teamColor, FLOOR_HEIGHT } from './boardMapping';
import { archetypeSilhouette } from './archetypeSilhouette';
import {
  slideWorldDelta,
  slideProgress,
  dyingAppearance,
  DYING_DURATION_MS,
} from './effectsMapping';
import type { Unit } from '../types';

/**
 * Phase 2 — team-tinted unit tokens.
 * Phase 4 — slide + death animations driven by the same Game.tsx state the 2D
 * board uses (`slidingUnits` map of grid deltas, `dyingUnits` id set).
 * Phase 6 (visual upgrade, optional) — low-poly per-archetype bodies replace
 * the previous flat billboard: every unit now renders a real 3D torso + head
 * + archetype-specific accessory shapes (see archetypeSilhouette.ts), still
 * team-tinted, still sitting on the same ground ring that marks its tile.
 *
 * Renders one low-poly body per unit at its real grid tile, tinted sky
 * (player) or purple (enemy) to match the 2D board, plus a flat ground ring
 * that marks exactly which tile the unit occupies. Dead units (hp <= 0) are
 * skipped UNLESS they are mid death-dissolve. Pure presentational layer —
 * reads unit x/y/team/hp/class only, never mutates game state.
 * frameloop="demand": animations call invalidate() until they finish.
 */

const GROUND_Y = FLOOR_HEIGHT / 2; // top surface of a floor tile — where feet rest

type BodyMaterial = MeshBasicMaterial | MeshStandardMaterial;

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
  const spec = useMemo(() => archetypeSilhouette(unit.class.archetype), [unit.class.archetype]);
  const [wx, , wz] = gridToWorld(unit.x, unit.y, 0);
  const groupRef = useRef<Group>(null);
  // Sized for: torso + head + ground ring + N accessories, filled by index below.
  const matRefs = useRef<(BodyMaterial | null)[]>(
    Array(3 + spec.accessories.length).fill(null),
  );
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

  const setMat = (i: number) => (m: BodyMaterial | null) => {
    matRefs.current[i] = m;
    if (m && m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
  };

  const torsoCenterY = GROUND_Y + spec.torso[1] / 2;
  const headCenterY = GROUND_Y + spec.torso[1] + spec.headRadius;

  return (
    <group ref={groupRef} position={[wx, 0, wz]}>
      {/* Low-poly body: torso box + head sphere, both lit (matches Tiles3D's material) so units read as part of the same 3D scene rather than a flat sprite. */}
      <mesh position={[0, torsoCenterY, 0]}>
        <boxGeometry args={spec.torso} />
        <meshStandardMaterial ref={setMat(0)} color={color} roughness={0.7} metalness={0.1} emissive={color} emissiveIntensity={0.38} />
      </mesh>
      <mesh position={[0, headCenterY, 0]}>
        <sphereGeometry args={[spec.headRadius, 12, 10]} />
        <meshStandardMaterial ref={setMat(1)} color={color} roughness={0.7} metalness={0.1} emissive={color} emissiveIntensity={0.38} />
      </mesh>

      {/* Archetype-specific accessories — the actual silhouette differentiator (see archetypeSilhouette.ts). */}
      {spec.accessories.map((part, i) => {
        const pos: [number, number, number] = [part.position[0], GROUND_Y + part.position[1], part.position[2]];
        const rot = part.rotation ?? [0, 0, 0];
        const geometry =
          part.kind === 'box' ? (
            <boxGeometry args={part.size} />
          ) : part.kind === 'sphere' ? (
            <sphereGeometry args={[part.size[0], 10, 8]} />
          ) : part.kind === 'cone' ? (
            <coneGeometry args={[part.size[0], part.size[1], 10]} />
          ) : (
            <cylinderGeometry args={[part.size[0], part.size[0], part.size[1], 10]} />
          );
        return (
          <mesh key={i} position={pos} rotation={rot}>
            {geometry}
            <meshStandardMaterial ref={setMat(2 + i)} color={color} roughness={0.7} metalness={0.1} emissive={color} emissiveIntensity={0.38} />
          </mesh>
        );
      })}

      {/* Ground ring on the occupied tile (flat, unlit — unchanged from the previous version). */}
      <mesh position={[0, FLOOR_HEIGHT + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 28]} />
        <meshBasicMaterial
          ref={setMat(2 + spec.accessories.length)}
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
