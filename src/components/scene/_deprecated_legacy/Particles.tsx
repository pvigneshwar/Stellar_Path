"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Floating cosmic particles with subtle drift for depth.
 */
export function Particles({ count = 200 }: { count?: number }) {
  const ref = useMemo(() => new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    })
  ), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 10 + Math.random() * 40;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const i3 = i * 3;
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [count]);

  const velocities = useMemo(() => {
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      vel[i] = (Math.random() - 0.5) * 0.002;
    }
    return vel;
  }, [count]);

  ref.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  ref.geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

  const geom = ref.geometry;
  useFrame(() => {
    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    const velAttr = geom.getAttribute("velocity") as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const vel = velAttr.array as Float32Array;
    for (let i = 0; i < pos.length; i++) {
      pos[i] += vel[i] * 0.5;
      // Slow drift with wrap-around
      if (pos[i] > 60) pos[i] = -60;
      if (pos[i] < -60) pos[i] = 60;
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={ref} />;
}
