"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Ethereal blue/purple nebula made of layered translucent particle planes.
 * Uses additive blending for a cinematic glow.
 */
export function Nebula({ depth = 60 }: { depth?: number }) {
  return (
    <group>
      <NebulaPlane depth={depth} color={0x0a1428} scale={1.0} />
      <NebulaPlane depth={depth * 0.7} color={0x1a0a3a} scale={0.7} />
      <NebulaPlane depth={depth * 0.4} color={0x3a0a4a} scale={0.4} />
    </group>
  );
}

function NebulaPlane({
  depth,
  color,
  scale,
}: {
  depth: number;
  color: number;
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const time = useRef(0);

  const { positions, uv } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 1, 1);
    return {
      positions: geo.attributes.position.array as Float32Array,
      uv: geo.attributes.uv.array as Float32Array,
    };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uScale: { value: scale },
          uDepth: { value: depth },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uScale;
          uniform float uDepth;
          void main() {
            vUv = uv;
            vec3 pos = position;
            // Gentle undulation
            pos.z += sin(uv.x * 3.14159 * 2.0 + uTime * 0.2) * 0.01;
            pos.y += cos(uv.y * 3.14159 * 2.0 + uTime * 0.15) * 0.01;
            gl_Position = vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uScale;
          uniform float uDepth;
          // Classic 2D noise
          float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = rand(i);
            float b = rand(i + vec2(1.0, 0.0));
            float c = rand(i + vec2(0.0, 1.0));
            float d = rand(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          void main() {
            float n = noise(vUv * 3.0 + uTime * 0.02);
            vec3 col = uColor * n * uScale * 0.5;
            float alpha = n * 0.3 * uScale;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      }),
    [color, scale, depth]
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return <mesh ref={meshRef} material={material}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
    </bufferGeometry>
  </mesh>;
}
