import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import {
  GRID_SIZE,
  TILE_COUNT,
  gridToWorld,
  instanceIdToGrid,
} from './gridToWorld';

/**
 * Static instanced 15x15 board (225 instances, 1 draw call).
 * Spike: checkerboard coloring (no game state read yet — that is phase 2).
 * Placeholder interaction: pointer hover highlights a tile and click reports
 * its grid coords, proving the raycast -> (x,y) pick pipeline works.
 */

const COLOR_LIGHT = new THREE.Color('#1f2937'); // zinc-800
const COLOR_DARK = new THREE.Color('#111827');  // zinc-900
const COLOR_HOVER = new THREE.Color('#0ea5e9'); // sky-500 (app theme)

interface Tiles3DProps {
  onPick?: (coord: { x: number; y: number }) => void;
}

export default function Tiles3D({ onPick }: Tiles3DProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Base (non-hover) color for every instance, computed once.
  const baseColors = useMemo(() => {
    const arr: THREE.Color[] = [];
    for (let id = 0; id < TILE_COUNT; id++) {
      const { x, y } = instanceIdToGrid(id);
      arr.push((x + y) % 2 === 0 ? COLOR_LIGHT : COLOR_DARK);
    }
    return arr;
  }, []);

  // Write per-instance transforms once on mount.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let id = 0; id < TILE_COUNT; id++) {
      const { x, y } = instanceIdToGrid(id);
      const [wx, wy, wz] = gridToWorld(x, y, 0);
      dummy.position.set(wx, wy, wz);
      dummy.updateMatrix();
      mesh.setMatrixAt(id, dummy.matrix);
      mesh.setColorAt(id, baseColors[id]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [baseColors]);

  // Recolor on hover change (only the two affected instances).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let id = 0; id < TILE_COUNT; id++) {
      mesh.setColorAt(id, id === hovered ? COLOR_HOVER : baseColors[id]);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hovered, baseColors]);

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
      {/* thin tile: full width/depth, slight gap via 0.92 scale */}
      <boxGeometry args={[0.92, 0.12, 0.92]} />
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
    </instancedMesh>
  );
}

export { GRID_SIZE };
