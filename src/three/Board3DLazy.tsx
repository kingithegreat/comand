import React, { Suspense } from 'react';
import type { GridMap, Unit } from '../types';
import type { ReachableTile } from './interaction';

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
  onPick,
  onClose,
}: {
  map?: GridMap;
  units?: Unit[];
  selectedUnitId?: string | null;
  reachableTiles?: ReachableTile[];
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
        onPick={onPick}
        onClose={onClose}
      />
    </Suspense>
  );
}
