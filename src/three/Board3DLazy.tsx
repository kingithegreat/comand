import React, { Suspense } from 'react';
import type { GridMap, Unit } from '../types';
import type { ReachableTile } from './interaction';
import type {
  DamageTextState,
  HitEffectState,
  MuzzleFlashState,
} from './effectsMapping';

/**
 * Lazy-load the entire Three.js scene so it is code-split into its own async
 * chunk. 2D / isometric users never download Three.js. (See vite.config.ts
 * manualChunks 'three' entry.) Forwards the live map + units to the scene.
 */
const Board3DSpike = React.lazy(() => import('./Board3DSpike'));

export default function Board3DLazy({
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
  boardTheme,
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
  /** Equipped Armory board theme id (BOARD_THEMES), for scene ambience parity with the 2D board frame. */
  boardTheme?: string;
  onPick?: (coord: { x: number; y: number }) => void;
  onClose?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 font-mono text-xs uppercase tracking-wider text-cyan-400">
          loading 3D board…
        </div>
      }
    >
      <Board3DSpike
        map={map}
        units={units}
        selectedUnitId={selectedUnitId}
        reachableTiles={reachableTiles}
        damageTexts={damageTexts}
        hitEffects={hitEffects}
        muzzleFlashes={muzzleFlashes}
        slidingUnits={slidingUnits}
        dyingUnits={dyingUnits}
        shake={shake}
        zoomLevel={zoomLevel}
        boardTheme={boardTheme}
        onPick={onPick}
        onClose={onClose}
      />
    </Suspense>
  );
}
