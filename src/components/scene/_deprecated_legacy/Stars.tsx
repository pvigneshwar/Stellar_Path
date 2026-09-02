"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Dense, performant starfield using Points.
 * Stars are distributed in a spherical shell around the origin.
 */
export function Stars({ count = 4000 }: { count?: number }) {
  const ref = useMemo(() => new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
    })
  ), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 40 + Math.random() * 60;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const i3 = i * 3;
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [count]);

  ref.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Subtle twinkling
  const sizes = ref.material as THREE.PointsMaterial;
  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    sizes.size = 0.02 + Math.abs(Math.sin(elapsed * 0.5 + positions[0]) * 0.02);
  });

  return <points ref={ref} />;
}
