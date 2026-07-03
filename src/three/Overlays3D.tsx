import React from 'react';
import { gridToWorld } from './gridToWorld';
import { FLOOR_HEIGHT } from './boardMapping';
import { reachableMarkers, SELECT_COLOR, type ReachableTile } from './interaction';
import type { Unit } from '../types';

/**
 * Purely presentational move-range + selection overlays for the 3D board
 * (Phase 3). Rings every reachable tile of the selected unit (cyan = 1 AP,
 * amber = 2 AP — same data as the 2D board, via logic.ts getReachableTiles)
 * plus a bright ring under the selected unit. All math lives in interaction.ts.
 */
export default function Overlays3D({
  selected,
  reachable,
}: {
  selected?: Unit | null;
  reachable?: ReachableTile[];
}) {
  const markers = reachableMarkers(selected, reachable);
  const selPos = selected ? gridToWorld(selected.x, selected.y, 0) : null;

  return (
    <group>
      {markers.map((m) => {
        const [wx, , wz] = gridToWorld(m.x, m.y, 0);
        return (
          <mesh
            key={`mv-${m.x}-${m.y}`}
            position={[wx, FLOOR_HEIGHT + 0.03, wz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.3, 0.46, 24]} />
            <meshBasicMaterial color={m.color} toneMapped={false} transparent opacity={0.75} />
          </mesh>
        );
      })}

      {selPos && (
        <mesh position={[selPos[0], FLOOR_HEIGHT + 0.035, selPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.56, 28]} />
          <meshBasicMaterial color={SELECT_COLOR} toneMapped={false} transparent opacity={0.95} />
        </mesh>
      )}
    </group>
  );
}
