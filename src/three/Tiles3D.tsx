import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import {
  GRID_SIZE,
  TILE_COUNT,
  gridToWorld,
  instanceIdToGrid,
} from './gridToWorld';
import { tileAppearance, FLOOR_HEIGHT } from './boardMapping';
import type { GridMap } from '../types';

/**
 * Instanced 15x15 board (225 instances, 1 draw call).
 *
 * Phase 2: when a `map` (the game's GridMap) is supplied, each tile takes its
 * color AND height from the real terrain — walls stand tall, crates/barrels are
 * mid-height cover, fire/poison are flat glowing hazards, floor checkerboards.
 * With no map it falls back to the spike's flat checkerboard so the standalone
 * spike still renders. Per-instance non-uniform Y scale gives elevation from a
 * single shared box geometry, so it stays 1 draw call.
 */

const BASE_THICKNESS = 0.12; // boxGeometry Y below
const COLOR_HOVER = new THREE.Color('#0ea5e9'); // sky-500 (app theme)
const COLOR_LIGHT = new THREE.Color('#1f2937');
const COLOR_DARK = new THREE.Color('#111827');

interface Tiles3DProps {
  map?: GridMap;
  onPick?: (coord: { x: number; y: number }) => void;
}

interface TileVisual {
  color: THREE.Color;
  height: number;
}

export default function Tiles3D({ map, onPick }: Tiles3DProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Per-instance color + height, derived once from the map (or checkerboard).
  const visuals = useMemo<TileVisual[]>(() => {
    const arr: TileVisual[] = [];
    for (let id = 0; id < TILE_COUNT; id++) {
      const { x, y } = instanceIdToGrid(id);
      const cell = map?.[y]?.[x];
      if (cell) {
        const a = tileAppearance(cell.type, x, y);
        arr.push({ color: new THREE.Color(a.color), height: a.height });
      } else {
        arr.push({
          color: (x + y) % 2 === 0 ? COLOR_LIGHT : COLOR_DARK,
          height: FLOOR_HEIGHT,
        });
      }
    }
    return arr;
  }, [map]);

  // Write per-instance transforms (position + Y scale for height) + colors.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let id = 0; id < TILE_COUNT; id++) {
      const { x, y } = instanceIdToGrid(id);
      const { height, color } = visuals[id];
      const scaleY = height / BASE_THICKNESS;
      // Center the box so its base sits on the ground plane (y=0).
      const [wx, , wz] = gridToWorld(x, y, 0);
      dummy.position.set(wx, height / 2, wz);
      dummy.scale.set(1, scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(id, dummy.matrix);
      mesh.setColorAt(id, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [visuals]);

  // Recolor on hover change (only the hovered instance differs).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let id = 0; id < TILE_COUNT; id++) {
      mesh.setColorAt(id, id === hovered ? COLOR_HOVER : visuals[id].color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hovered, visuals]);

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (typeof e.instanceId === 'number') setHovered(e.instanceId);
  };

  const handleOut = () => setHovered(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (typeof e.instanceId === 'number') {
      onPick?.(instanceIdToGrid(e.instanceId));
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TILE_COUNT]}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      onClick={handleClick}
      castShadow={false}
      receiveShadow={false}
    >
      {/* thin unit tile: full width/depth, slight gap via 0.92 scale; Y scaled per instance */}
      <boxGeometry args={[0.92, BASE_THICKNESS, 0.92]} />
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
    </instancedMesh>
  );
}

export { GRID_SIZE };
