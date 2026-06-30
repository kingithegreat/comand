import React from 'react';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';

/**
 * Perspective camera looking down at the board origin, with a constrained
 * orbit (can't go under the board; limited azimuth for readability) and
 * pinch / wheel zoom. Mobile-first: damping on, pan disabled.
 */
export default function CameraRig() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 12, 12]} fov={50} near={0.1} far={100} />
      <OrbitControls
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
