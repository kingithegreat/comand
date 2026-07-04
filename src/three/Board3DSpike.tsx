import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './CameraRig';
import Tiles3D from './Tiles3D';
import Units3D from './Units3D';
import Overlays3D from './Overlays3D';
import Effects3D from './Effects3D';
import type { ReachableTile } from './interaction';
import type {
  DamageTextState,
  HitEffectState,
  MuzzleFlashState,
} from './effectsMapping';
import type { GridMap, Unit } from '../types';

/**
 * 3D board overlay (React Three Fiber).
 *
 * Phase 1 (spike) proved the pipeline: <Canvas> + lights + camera, an
 * InstancedMesh 15x15 board (1 draw call), constrained orbit/zoom, and
 * raycast -> tile (x,y) picking.
 *
 * Phase 2 makes it show the REAL match: the live `map` colors + elevates every
 * tile (walls tall, crates/barrels cover, fire/poison flat hazards) and `units`
 * render as team-tinted billboards on their actual tiles. Both are optional, so
 * the standalone spike still renders with a flat checkerboard + no units.
 *
 * Phase 4 adds combat feedback: damage texts, muzzle flashes, hit/miss/death
 * pulses, slide + death animations, camera shake and the zoomLevel binding —
 * all driven by the exact same Game.tsx state the 2D board consumes.
 *
 * NO game logic is touched — additive overlay; the 2D / isometric board is
 * unaffected. frameloop="demand" keeps it battery-friendly (turn-based: render
 * only on change).
 */
export default function Board3DSpike({
  map,
  units,
  selectedUnitId,
  reachableTiles,
  damageTexts,
  hitEffects,
  muzzleFlashes,
  slidingUnits,
  dyingUnits,
  shake,
  zoomLevel,
  onPick,
  onClose,
}: {
  map?: GridMap;
  units?: Unit[];
  selectedUnitId?: string | null;
  reachableTiles?: ReachableTile[];
  damageTexts?: DamageTextState[];
  hitEffects?: HitEffectState[];
  muzzleFlashes?: MuzzleFlashState[];
  slidingUnits?: Map<string, { dx: number; dy: number }>;
  dyingUnits?: Set<string>;
  shake?: boolean;
  zoomLevel?: number;
  onPick?: (coord: { x: number; y: number }) => void;
  onClose?: () => void;
}) {
  const [lastPick, setLastPick] = useState<{ x: number; y: number } | null>(null);
  const unitList = units ?? [];
  const selected = selectedUnitId ? unitList.find((u) => u.id === selectedUnitId) ?? null : null;
  const live = Boolean(map && map.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#09090b']} />
        <hemisphereLight args={['#cbd5e1', '#0b1120', 0.9]} />
        <directionalLight position={[6, 14, 8]} intensity={1.1} />
        <CameraRig shake={shake} zoomLevel={zoomLevel} />
        <Tiles3D
          map={map}
          onPick={(coord) => {
            setLastPick(coord);
            onPick?.(coord);
          }}
        />
        <Units3D units={unitList} slidingUnits={slidingUnits} dyingUnits={dyingUnits} />
        <Overlays3D selected={selected} reachable={reachableTiles} />
        <Effects3D
          damageTexts={damageTexts}
          hitEffects={hitEffects}
          muzzleFlashes={muzzleFlashes}
        />
      </Canvas>

      {/* Overlay HUD (plain DOM, outside the Canvas) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-lg border border-cyan-500/40 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-cyan-300 backdrop-blur">
          {live ? '3D BOARD' : '3D BOARD SPIKE'} · drag to orbit · pinch/scroll to zoom
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto rounded-lg border border-zinc-600/60 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-zinc-300 backdrop-blur transition-colors hover:text-white active:scale-95"
          >
            EXIT 3D [V]
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
        <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] text-zinc-400 backdrop-blur">
          {selected
            ? `selected ${selected.name ?? selected.class.className} · tap a highlighted tile to move`
            : lastPick
              ? `picked tile (${lastPick.x}, ${lastPick.y})`
              : live
                ? `${unitList.length} units deployed · tap a unit to select`
                : 'tap a tile to test picking'}
        </div>
      </div>
    </div>
  );
}
