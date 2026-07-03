import React, { useEffect, useRef } from 'react';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { shakeOffset, zoomToCameraDistance, SHAKE_DURATION_MS } from './effectsMapping';

/**
 * Perspective camera looking down at the board origin, with a constrained
 * orbit (can't go under the board; limited azimuth for readability) and
 * pinch / wheel zoom. Mobile-first: damping on, pan disabled.
 *
 * Phase 4 additions (both optional, both pure-presentation):
 *  - `shake`: while Game.tsx's shake flag is up, the orbit target jitters with
 *    a damped sinusoid and returns exactly to rest (impact feedback).
 *  - `zoomLevel`: the existing 2D zoom UI (100% / 140%) dollies the camera —
 *    the [Z] zoom button keeps working in 3D.
 */
export default function CameraRig({
  shake = false,
  zoomLevel,
}: {
  shake?: boolean;
  zoomLevel?: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const shakeStart = useRef<number | null>(null);

  // Rising edge of the shake flag starts a new shake.
  useEffect(() => {
    if (shake) {
      shakeStart.current = performance.now();
      invalidate();
    }
  }, [shake, invalidate]);

  // Zoom binding: dolly the camera to the distance mapped from zoomLevel.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || zoomLevel === undefined) return;
    const camera = controls.object;
    const distance = zoomToCameraDistance(zoomLevel);
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() === 0) return;
    dir.setLength(distance);
    camera.position.copy(controls.target).add(dir);
    controls.update();
    invalidate();
  }, [zoomLevel, invalidate]);

  // Damped shake on the orbit target; restores (0,0,0) exactly at the end.
  useEffect(() => {
    if (!shake || shakeStart.current === null) return;
    let raf = 0;
    const tick = () => {
      const controls = controlsRef.current;
      const started = shakeStart.current;
      if (!controls || started === null) return;
      const elapsed = performance.now() - started;
      const [ox, oz] = shakeOffset(elapsed);
      controls.target.set(ox, 0, oz);
      controls.update();
      invalidate();
      if (elapsed < SHAKE_DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        controls.target.set(0, 0, 0);
        controls.update();
        invalidate();
        shakeStart.current = null;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shake, invalidate]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 12, 12]} fov={50} near={0.1} far={100} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={26}
        // Clamp polar so the camera stays above the board.
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.35}
        // Limit azimuth to +/-35deg for a readable, tactical-table feel.
        minAzimuthAngle={-Math.PI / 5.14}
        maxAzimuthAngle={Math.PI / 5.14}
      />
    </>
  );
}
