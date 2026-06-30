import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './CameraRig';
import Tiles3D from './Tiles3D';

/**
 * feat/3d-board-spike — self-contained 3D board overlay.
 *
 * Proves the React Three Fiber rendering pipeline end-to-end:
 *   - <Canvas> mounts a WebGL scene with lights + a perspective camera
 *   - an InstancedMesh renders a static 15x15 board (1 draw call)
 *   - OrbitControls let you orbit/zoom (constrained)
 *   - pointer raycast -> tile (x,y) pick (placeholder interaction)
 *
 * NO game logic is touched. This is additive and renders as an overlay so the
 * existing 2D / isometric board is completely unaffected. frameloop="demand"
 * keeps it battery-friendly on mobile (turn-based: render only on change).
 */
export default function Board3DSpike({ onClose }: { onClose?: () => void }) {
  const [lastPick, setLastPick] = useState<{ x: number; y: number } | null>(null);

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
        <CameraRig />
        <Tiles3D onPick={setLastPick} />
      </Canvas>

      {/* Overlay HUD (plain DOM, outside the Canvas) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-lg border border-cyan-500/40 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-cyan-300 backdrop-blur">
          3D BOARD SPIKE · drag to orbit · pinch/scroll to zoom
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
          {lastPick ? `picked tile (${lastPick.x}, ${lastPick.y})` : 'tap a tile to test picking'}
        </div>
      </div>
    </div>
  );
}
