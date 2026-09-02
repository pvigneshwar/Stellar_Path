/**
 * INDIA'S JOURNEY BEYOND EARTH — Space Environment
 *
 * Creates the deep-space backdrop: starfield (shader with twinkling),
 * blue/purple nebula (gradient quads + noise), distant galaxies (sprites),
 * floating particles, subtle volumetric fog, and cinematic lighting.
 *
 * All elements respect performanceMode to scale gracefully on weaker devices.
 */
"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import type { PerformanceMode } from "@/lib/types";
import { seededRandom } from "@/lib/utils";
import { getAdaptiveTexturePath, getOriginalTexturePath } from "@/lib/textures";
import { loadTextureWithFallback } from "@/lib/loadTextureWithFallback";

// ── Shader source ─────────────────────────────────────────────────────
const STAR_VERT = `
  attribute float a_size;
  attribute float a_twinkle;
  attribute vec3 a_color;
  uniform float u_time;
  uniform float u_twinkle_speed;
  varying vec3 v_color;

  void main() {
    v_color = a_color;
    float tw = 0.3 * sin(u_time * u_twinkle_speed + a_twinkle);
    float sz = a_size * (1.0 + tw);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, sz * (1.0 / -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAG = `
  varying vec3 v_color;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha * alpha;
    gl_FragColor = vec4(v_color, alpha);
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────

/** Generate random points distributed on a sphere shell. */
function generateSpherePoints(count: number, minRadius: number, maxRadius: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Star color temperature palette — mostly white/blue, some warm
  const starColors = [
    [1.0, 1.0, 1.0],
    [0.7, 0.85, 1.0],
    [0.55, 0.75, 1.0],
    [1.0, 0.9, 0.75],
    [1.0, 0.8, 0.6],
  ];

  for (let i = 0; i < count; i++) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);

    positions[i * 3] = radius * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = radius * sinPhi * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    sizes[i] = 0.5 + Math.random() * 2.5;
    twinkles[i] = Math.random() * Math.PI * 2;

    const c = starColors[Math.floor(Math.random() * starColors.length)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  return { positions, sizes, twinkles, colors };
}

/**
 * Soft circular sprite for point particles. Three.js's default
 * PointsMaterial renders each point as a hard-edged square; without an
 * alpha map that reads as visible "square particles" over bright detail
 * (e.g. Earth's surface). This generates a small radial-gradient alpha
 * mask so particles render as soft circular dots instead.
 */
function createParticleSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Generate a small set of points for foreground floating particles. */
function generateFloatingParticles(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);
    positions[i * 3] = r * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

/** Create a nebula cloud texture via canvas (blue/purple gradient + noise). */
function createNebulaTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;

  // Radial gradient — deep blue to purple to transparent
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0, "rgba(20, 40, 100, 0.55)");
  grad.addColorStop(0.35, "rgba(80, 50, 140, 0.45)");
  grad.addColorStop(0.65, "rgba(120, 80, 160, 0.35)");
  grad.addColorStop(1, "rgba(10, 15, 40, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Add procedural noise for organic texture — RGB channels only.
  //
  // Bug fix: this previously also perturbed the alpha channel
  // (data[i+3] += noise * 0.5). The radial gradient above intentionally
  // fades alpha to exactly 0 at the plane's edges/corners so the quad
  // is invisible there; adding +/-15 of random noise to that already-zero
  // alpha gave every "transparent" corner pixel a small nonzero alpha.
  // At normal viewing distance those individual noisy texels are
  // invisible, but once the GPU generates mipmaps (minFilter is
  // LinearMipmapLinearFilter below) each lower mip level averages many
  // texels together — averaging thousands of small-but-nonzero noise
  // values produces a uniform, flat, nonzero alpha across what should be
  // a fully transparent square. The result renders as a hard-edged,
  // uniformly-tinted square silhouette exactly matching the plane's
  // geometry bounds — the "floating rectangular artifact" bug. Leaving
  // alpha untouched keeps the corners genuinely at alpha=0 at every mip
  // level, so only the soft circular gradient core remains visible.
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.min(255, data[i] + noise);
    data[i + 1] = Math.min(255, data[i + 1] + noise);
    data[i + 2] = Math.min(255, data[i + 2] + noise);
    // alpha channel intentionally left untouched — see comment above
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Create a galaxy sprite texture. */
function createGalaxyTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;
  const outerRad = size * 0.4;

  // Spiral arms
  for (let i = 0; i < 2; i++) {
    const rotation = (i * Math.PI) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const armGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRad);
    armGrad.addColorStop(0, "rgba(80, 120, 200, 0.6)");
    armGrad.addColorStop(0.5, "rgba(120, 80, 200, 0.4)");
    armGrad.addColorStop(1, "rgba(60, 50, 120, 0)");

    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.arc(outerRad * 0.3, 0, outerRad * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ── Sub-components ───────────────────────────────────────────────────

/** Deep-space starfield sphere using a high-resolution Milky Way panorama. */
function StarfieldTexture({ performanceMode }: { performanceMode: PerformanceMode }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Perf fix (Phase 5 — adaptive texture variants, behind
  // PERFORMANCE_FLAGS.adaptiveTextures): resolved once from
  // performanceMode; falls back to the ORIGINAL starfield file whenever
  // the flag is off, on "high", or if the adaptive variant 404s (not yet
  // generated by scripts/optimize-textures.mjs) — see lib/textures.ts.
  const texturePath = useMemo(() => getAdaptiveTexturePath("starfield", performanceMode), [performanceMode]);

  useEffect(() => {
    const cancel = loadTextureWithFallback(
      texturePath,
      getOriginalTexturePath("starfield"),
      (tex) => {
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        setTexture(tex);
      },
      () => setTexture(null)
    );
    return cancel;
  }, [texturePath]);

  if (!texture) return null;

  return (
    <mesh position={[0, 0, 0]} scale={[-1, -1, -1]} frustumCulled={false}>
      <sphereGeometry args={[118, 64, 64]} />
      <meshBasicMaterial
        attach="material"
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);
  const geometryRef = useRef<THREE.BufferGeometry>(null!);

  const starData = useMemo(
    () => generateSpherePoints(count, 30, 120),
    [count]
  );

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_twinkle_speed: { value: 1.0 + seededRandom(count) * 2 },
    }),
    [count]
  );

  useFrame((state) => {
    uniforms.u_time.value = state.clock.elapsedTime;
  });

  return (
    <points ref={ref}>
      <bufferGeometry ref={geometryRef} attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[starData.positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-a_size"
          args={[starData.sizes, 1]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-a_twinkle"
          args={[starData.twinkles, 1]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-a_color"
          args={[starData.colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <shaderMaterial
        attach="material"
        uniforms={uniforms}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

function NebulaClouds() {
  const textures = useMemo(
    () => [createNebulaTexture(512), createNebulaTexture(512), createNebulaTexture(512)],
    []
  );

  return (
    <>
      {/* Nebula quad 1 — left rear */}
      <mesh position={[-40, 10, -50]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[60, 60, 1, 1]} />
        <meshBasicMaterial
          map={textures[0]}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Nebula quad 2 — right rear */}
      <mesh position={[50, -15, -60]} rotation={[0, -0.4, 0]}>
        <planeGeometry args={[70, 70, 1, 1]} />
        <meshBasicMaterial
          map={textures[1]}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Nebula quad 3 — front upper */}
      <mesh position={[0, 35, -40]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[50, 50, 1, 1]} />
        <meshBasicMaterial
          map={textures[2]}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

function Galaxies() {
  const tex = useMemo(() => createGalaxyTexture(256), []);
  const positions = useMemo(
    () => [
      [-100, 30, -120],
      [120, -20, -140],
      [-130, -40, -160],
      [90, 50, -130],
    ],
    []
  );

  return positions.map((pos, i) => (
    <sprite key={i} position={pos as [number, number, number]} scale={[18, 18, 18]}>
      <primitive object={tex} attach="map" />
      <spriteMaterial
        attach="material"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        color={new THREE.Color(0.4, 0.5, 0.8)}
      />
    </sprite>
  ));
}

function FloatingParticles({ count, opacityScale = 1 }: { count: number; opacityScale?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(
    () => generateFloatingParticles(count, 60),
    [count]
  );
  const spriteTexture = useMemo(() => createParticleSpriteTexture(), []);

  useFrame(({ clock, camera }) => {
    if (ref.current) {
      // Subtle rotation for parallax depth
      ref.current.rotation.y = clock.elapsedTime * 0.02;
      ref.current.rotation.x = clock.elapsedTime * 0.013;
    }
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        attach="material"
        map={spriteTexture}
        alphaMap={spriteTexture}
        size={0.12}
        sizeAttenuation={true}
        color={new THREE.Color(0.6, 0.7, 1.0)}
        transparent
        opacity={0.25 * opacityScale}
        depthWrite={false}
      />
    </points>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface Props {
  performanceMode: PerformanceMode;
  /**
   * True during the pre-journey hero/loading state. The hero composition
   * needs to stay readable and uncluttered behind the title/HUD text and
   * the orbiting satellite, so density and opacity are dialed back further
   * than the full in-journey scene.
   */
  reduceDensity?: boolean;
}

export function SpaceEnvironment({ performanceMode, reduceDensity = false }: Props) {
  const starCount =
    performanceMode === "high"
      ? 1500
      : performanceMode === "medium"
        ? 800
        : 400;
  const particleCount =
    performanceMode === "high" ? 60 : performanceMode === "medium" ? 30 : 15;

  // During the hero / pre-journey phase, dial back density and opacity so
  // the Earth, satellite, and HUD text are not obscured by a noisy starfield.
  const heroStarCount = reduceDensity ? Math.round(starCount * 0.3) : starCount;
  const heroParticleCount = reduceDensity ? Math.round(particleCount * 0.25) : particleCount;
  const heroOpacityScale = reduceDensity ? 0.5 : 1;

  return (
    <>
      {/* Cinematic lighting */}
      <ambientLight intensity={0.25} color={new THREE.Color(0.3, 0.4, 0.7)} />
      {/* Perf fix (fix.md A2): the only mesh in the whole scene that
          actually uses this light's shadow is Earth casting/receiving its
          own shadow (see castShadow/receiveShadow in Earth.tsx) — and
          Earth's day/night terminator is already produced by its custom
          atmosphere shader, so the real shadow map buys very little
          visible benefit for its cost. That cost (a full 2048² shadow-
          camera render pass every frame) was previously paid on every
          device tier, including "low". Shadows are now skipped entirely
          on "low", and rendered at a smaller 1024² map on "medium" —
          "high" keeps the original full-quality 2048² shadow untouched. */}
      <directionalLight
        position={[30, 30, 30]}
        intensity={0.6}
        color={new THREE.Color(1, 0.95, 0.85)}
        castShadow={performanceMode !== "low"}
        shadow-mapSize={performanceMode === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-far={200}
        shadow-camera-near={0.5}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-left={-50}
        shadow-camera-right={50}
      />
      {/* Fill light — raised from 0.15 to counter near-black shadow-side
          satellites (see matching lighting comment in JourneyScene.tsx). */}
      <directionalLight
        position={[-20, -20, -15]}
        intensity={0.3}
        color={new THREE.Color(0.3, 0.4, 0.9)}
      />

      {/* Deep-space fog for depth */}
      <FogAttach />

      {/* High-resolution Milky Way starfield backdrop */}
      <StarfieldTexture performanceMode={performanceMode} />

      {/* Starfield with twinkling */}
      <Starfield count={heroStarCount} />

      {/* Nebula clouds (skip on low perf) */}
      {performanceMode !== "low" && <NebulaClouds />}

      {/* Distant galaxies (skip on low perf) */}
      {performanceMode !== "low" && <Galaxies />}

      {/* Floating particles */}
      <FloatingParticles count={heroParticleCount} opacityScale={heroOpacityScale} />
    </>
  );
}

/** Fog component — subtle volumetric depth cue. */
function FogAttach() {
  return (
    <mesh position={[0, 0, 0]} scale={[-1, -1, -1]} frustumCulled={false}>
      <sphereGeometry args={[120, 64, 64]} />
      <meshBasicMaterial
        attach="material"
        color={new THREE.Color(0.03, 0.04, 0.08)}
        side={THREE.BackSide}
        transparent
        opacity={0.25}
        depthWrite={false}
      />
    </mesh>
  );
}
