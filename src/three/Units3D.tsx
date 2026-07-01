import React, { useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import { gridToWorld } from './gridToWorld';
import { teamColor, unitBillboardY, FLOOR_HEIGHT } from './boardMapping';
import type { Unit } from '../types';

/**
 * Phase 2 — team-tinted unit billboards.
 *
 * Renders one camera-facing token per unit at its real grid tile, tinted sky
 * (player) or purple (enemy) to match the 2D board. Each token is a `Billboard`
 * (always faces the camera) holding a rounded standee plane over a dark
 * backing plate, plus a flat ground ring that marks exactly which tile the unit
 * occupies. Dead units (hp <= 0) are skipped. Pure presentational layer — reads
 * unit x/y/team/hp only, never mutates game state.
 */

const TOKEN_W = 0.62;
const TOKEN_H = 1.25;

interface Units3DProps {
  units: Unit[];
}

export default function Units3D({ units }: Units3DProps) {
  const living = useMemo(
    () => units.filter((u) => (u.hp === undefined ? true : u.hp > 0)),
    [units],
  );

  return (
    <group>
      {living.map((u) => {
        const color = teamColor(u.team);
        const [wx, , wz] = gridToWorld(u.x, u.y, 0);
        const y = unitBillboardY(TOKEN_H);
        return (
          <group key={u.id}>
            {/* Standee token — always faces the camera. */}
            <Billboard position={[wx, y, wz]}>
              {/* dark backing plate for contrast/outline */}
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[TOKEN_W + 0.12, TOKEN_H + 0.12]} />
                <meshBasicMaterial color="#0b0f14" transparent opacity={0.85} />
              </mesh>
              {/* team-tinted face */}
              <mesh>
                <planeGeometry args={[TOKEN_W, TOKEN_H]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
              {/* head dot for a readable "unit" silhouette */}
              <mesh position={[0, TOKEN_H / 2 - 0.16, 0.01]}>
                <circleGeometry args={[0.16, 24]} />
                <meshBasicMaterial color="#0b0f14" toneMapped={false} />
              </mesh>
            </Billboard>

            {/* Ground ring on the occupied tile (flat on the board). */}
            <mesh
              position={[wx, FLOOR_HEIGHT + 0.02, wz]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.30, 0.42, 28]} />
              <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
