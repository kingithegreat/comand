import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import type { Mesh, MeshBasicMaterial } from 'three';
import { gridToWorld } from './gridToWorld';
import {
  damageTextAppearance,
  damageTextMotion,
  hitEffectAppearance,
  easeOutCubic,
  clamp01,
  MUZZLE_COLOR,
  MUZZLE_DURATION_MS,
  DAMAGE_TEXT_DURATION_MS,
  type DamageTextState,
  type HitEffectState,
  type MuzzleFlashState,
} from './effectsMapping';

/**
 * Phase 4 — combat feedback in the 3D view.
 *
 * Renders the exact same effect state the 2D board consumes (Game.tsx owns
 * the arrays and their expiry timeouts — this layer never mutates them):
 *  - damageTexts   -> rising, fading world-space labels (drei <Html>)
 *  - hitEffects    -> expanding rings (red hit / zinc miss / purple death)
 *  - muzzleFlashes -> brief additive flash dot at the shooter tile
 *
 * frameloop="demand": every animated child calls state.invalidate() from its
 * useFrame while it is still alive, so the canvas keeps rendering exactly as
 * long as an effect is active and goes back to sleep afterwards.
 */

/** Per-id spawn clock, so each effect animates from its own birth. */
function useSpawnClock(ids: string[]): Map<string, number> {
  const clock = useRef(new Map<string, number>());
  const now = performance.now();
  const live = new Set(ids);
  for (const id of ids) {
    if (!clock.current.has(id)) clock.current.set(id, now);
  }
  for (const id of clock.current.keys()) {
    if (!live.has(id)) clock.current.delete(id);
  }
  return clock.current;
}

const TEXT_BASE_Y = 1.55; // above the unit billboards

function DamageTexts({ texts }: { texts: DamageTextState[] }) {
  const spawns = useSpawnClock(texts.map((t) => t.id));
  const groupRefs = useRef(new Map<string, Mesh>());
  useFrame((state) => {
    if (texts.length === 0) return;
    const now = performance.now();
    for (const t of texts) {
      const anchor = groupRefs.current.get(t.id);
      const born = spawns.get(t.id) ?? now;
      if (!anchor) continue;
      const { rise } = damageTextMotion(now - born);
      const [wx, , wz] = gridToWorld(t.x, t.y);
      anchor.position.set(wx, TEXT_BASE_Y + rise, wz);
    }
    state.invalidate();
  });
  return (
    <group>
      {texts.map((t) => {
        const { text, color } = damageTextAppearance(t.amount);
        const [wx, , wz] = gridToWorld(t.x, t.y);
        return (
          <mesh
            key={t.id}
            position={[wx, TEXT_BASE_Y, wz]}
            ref={(m) => {
              if (m) groupRefs.current.set(t.id, m);
              else groupRefs.current.delete(t.id);
            }}
          >
            <Html center zIndexRange={[60, 40]} style={{ pointerEvents: 'none' }}>
              <span
                className="font-black text-lg whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-out fade-out fill-mode-forwards"
                style={{ color, animationDuration: `${DAMAGE_TEXT_DURATION_MS}ms` }}
              >
                {text}
              </span>
            </Html>
          </mesh>
        );
      })}
    </group>
  );
}

function HitPulse({ effect, born }: { effect: HitEffectState; born: number }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const { color, maxRadius, durationMs } = hitEffectAppearance(effect.type);
  const [wx, , wz] = gridToWorld(effect.x, effect.y);
  useFrame((state) => {
    const t = clamp01((performance.now() - born) / durationMs);
    const eased = easeOutCubic(t);
    if (meshRef.current) {
      const s = Math.max(0.05, eased * maxRadius) / maxRadius;
      meshRef.current.scale.set(s, s, s);
    }
    if (matRef.current) matRef.current.opacity = 0.9 * (1 - t);
    if (t < 1) state.invalidate();
  });
  return (
    <mesh ref={meshRef} position={[wx, 0.18, wz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[maxRadius * 0.55, maxRadius, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.9}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function MuzzleFlash({ flash, born }: { flash: MuzzleFlashState; born: number }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const [wx, , wz] = gridToWorld(flash.x, flash.y);
  useFrame((state) => {
    const t = clamp01((performance.now() - born) / MUZZLE_DURATION_MS);
    if (meshRef.current) {
      // Quick pop (t<0.3) then shrink away.
      const s = t < 0.3 ? 0.4 + 2.0 * t : 1.0 - easeOutCubic((t - 0.3) / 0.7) * 0.9;
      meshRef.current.scale.set(s, s, s);
    }
    if (matRef.current) matRef.current.opacity = 1 - t;
    if (t < 1) state.invalidate();
  });
  return (
    <Billboard position={[wx, 0.95, wz]}>
      <mesh ref={meshRef}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial
          ref={matRef}
          color={MUZZLE_COLOR}
          transparent
          opacity={1}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}

interface Effects3DProps {
  damageTexts?: DamageTextState[];
  hitEffects?: HitEffectState[];
  muzzleFlashes?: MuzzleFlashState[];
}

export default function Effects3D({
  damageTexts = [],
  hitEffects = [],
  muzzleFlashes = [],
}: Effects3DProps) {
  const hitSpawns = useSpawnClock(hitEffects.map((e) => e.id));
  const muzzleSpawns = useSpawnClock(muzzleFlashes.map((m) => m.id));
  const now = performance.now();
  return (
    <group>
      <DamageTexts texts={damageTexts} />
      {hitEffects.map((e) => (
        <HitPulse key={e.id} effect={e} born={hitSpawns.get(e.id) ?? now} />
      ))}
      {muzzleFlashes.map((m) => (
        <MuzzleFlash key={m.id} flash={m} born={muzzleSpawns.get(m.id) ?? now} />
      ))}
    </group>
  );
}
