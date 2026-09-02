"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Celestial Body
 *
 * Generic textured sphere for a destination body (Moon, Mars, Sun) that
 * stays permanently present in the scene from the very start — per
 * explicit request, destination planets are never spawned or created
 * only when their mission appears. They sit stationary at a fixed world
 * position, dimmed and visually inactive, until their own mission
 * segment of the journey is reached (`active` becomes true), at which
 * point this body brightens to full strength. It never moves on its
 * own — camera travel toward it is handled entirely by JourneyScene's
 * CameraController; this component only renders and (optionally) spins
 * slowly in place.
 *
 * Rendering configurations adapted from Earth.tsx:
 *  - Procedural texture fallbacks (createProcedural*Texture) so the body
 *    is never a flat color if the real texture fails to load offline or
 *    404s — mirrors Earth's createProceduralEarthTexture() pattern.
 *  - Proper texture filtering (minFilter = LinearMipmapLinearFilter,
 *    magFilter = LinearFilter, generateMipmaps = true, anisotropy) —
 *    same settings Earth.tsx applies to its texture loader.
 *  - Optional atmosphere terminator shader (AtmosphereSphere) for bodies
 *    with atmospheres — adapted from Earth's AtmosphereSphere GLSL,
 *    parameterized by body color. Mars gets a thin pinkish atmosphere;
 *    the Moon and Sun have no atmosphere so the shader is skipped.
 *  - Tone mapping disabled (toneMapped={false}) to preserve the intended
 *    artistic look of every body, same as Earth.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PerformanceMode } from "@/lib/types";
import { lerp } from "@/lib/utils";
import { loadTextureWithFallback } from "@/lib/loadTextureWithFallback";

interface Props {
  texturePath: string;
  /**
   * Original/full-quality path to retry if `texturePath` (a possibly-
   * adaptive Phase 5 variant, see lib/textures.ts) fails to load. Omit
   * to keep the previous single-stage-loader behavior (falls straight to
   * the procedural texture on error).
   */
  fallbackTexturePath?: string;
  radius: number;
  /** True while this body's own mission segment of the journey is active. */
  active: boolean;
  /** True for the Sun — self-illuminated, unlit material + emitted light. */
  emissive?: boolean;
  /** Fallback/tint color, used if the texture fails to load. */
  color?: number;
  /** Radians/sec idle self-rotation; 0 disables. */
  idleSpinSpeed?: number;
  reducedMotion?: boolean;
  /**
   * Mirrors Earth.tsx's own performanceMode-driven sphere resolution
   * (48 segments low / 96 high) instead of this component's previous
   * hardcoded 64×64 regardless of device performance. Optional so any
   * existing call site without it still renders (falls back to 64×64).
   */
  performanceMode?: PerformanceMode;
  /**
   * Which body this is — controls procedural texture generation, PBR
   * material values, and whether an atmosphere shader is rendered.
   * "moon" → gray cratered procedural texture, no atmosphere.
   * "mars"  → red procedural texture, thin atmosphere (pink glow).
   * "sun"   → solar-procedure texture, no atmosphere (it IS a star).
   * Omitting falls back to a generic gray procedural texture + no atmosphere.
   */
  bodyType?: "moon" | "mars" | "sun" | "generic";
}

// ── Atmosphere Shader (Terminator & Rayleigh Rim Glow) ───────────────────────
// Adapted from Earth.tsx's AtmosphereSphere — same rayleigh-scattering rim
// glow, parameterized by body color so Mars can have a pinkish atmosphere
// instead of Earth's blue.
const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float viewDot = abs(dot(vNormal, viewDir));
    float rim = pow(1.0 - viewDot, 2.5);

    float sunDot = dot(vNormal, normalize(uSunDirection));
    float terminator = smoothstep(-0.3, 0.3, sunDot);

    float intensity = rim * (0.6 + 0.4 * terminator);
    intensity *= 0.85 + 0.15 * sin(uTime * 1.5 + vWorldPosition.x * 2.0);

    if (intensity < 0.01) discard;

    gl_FragColor = vec4(uGlowColor, min(intensity * 0.8, 0.65) * uOpacity);
  }
`;

/**
 * Procedural texture generators — each produces a CanvasTexture fallback
 * so the body renders as a recognizable sphere even if the real 8k texture
 * hasn't loaded yet (or fails with a 404). Mirrors Earth.tsx's
 * createProceduralEarthTexture() pattern.
 */

/** Moon procedural texture — gray cratered surface. */
function createProceduralMoonTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Dark gray lunar highland base
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#383029");
  bgGrad.addColorStop(0.5, "#423a33");
  bgGrad.addColorStop(1, "#383029");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Maria (dark plains) — irregular dark patches
  ctx.fillStyle = "#2a221b";
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * canvas.width + (Math.random() - 0.5) * 60;
    const y = canvas.height * 0.3 + Math.random() * canvas.height * 0.4;
    const r1 = 30 + Math.random() * 50;
    ctx.beginPath();
    ctx.arc(x, y, r1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Highlands (lighter terrain)
  ctx.fillStyle = "#5a524a";
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r1 = 10 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(x, y, r1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crater rays (bright streaks)
  ctx.strokeStyle = "#6a625a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const len = 20 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Mars procedural texture — red/orange surface with dark surface features. */
function createProceduralMarsTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Red-orange atmospheric haze base (Mars' thin atmosphere + surface dust)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#b54a3a");
  bgGrad.addColorStop(0.3, "#c45a4a");
  bgGrad.addColorStop(0.5, "#d66a4a");
  bgGrad.addColorStop(0.7, "#c45a4a");
  bgGrad.addColorStop(1, "#b54a3a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dark surface features (Syrtis Major, Valles Marineris, etc.)
  ctx.fillStyle = "#8b3a2e";
  const features = [
    { x: 0.25, y: 0.35, r: 0.12 },
    { x: 0.55, y: 0.45, r: 0.08 },
    { x: 0.35, y: 0.65, r: 0.1 },
    { x: 0.7, y: 0.55, r: 0.06 },
    { x: 0.6, y: 0.25, r: 0.05 },
    { x: 0.8, y: 0.35, r: 0.07 },
    { x: 0.2, y: 0.55, r: 0.04 },
    { x: 0.45, y: 0.15, r: 0.05 },
  ];
  features.forEach((f) => {
    ctx.beginPath();
    ctx.arc(f.x * canvas.width, f.y * canvas.height, f.r * canvas.width, 0, Math.PI * 2);
    ctx.fill();
  });

  // Subtle polar ice caps
  ctx.fillStyle = "#e8e0d0";
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
  ctx.fillRect(0, canvas.height * 0.92, canvas.width, canvas.height * 0.08);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Sun procedural texture — yellow-white solar disk with dark sunspot regions. */
function createProceduralSunTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Radial gradient — bright yellow center, warmer at edges
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy));
  grad.addColorStop(0, "#fff8d4");
  grad.addColorStop(0.3, "#ffe08c");
  grad.addColorStop(0.6, "#ffcc4d");
  grad.addColorStop(0.85, "#e6a833");
  grad.addColorStop(1, "#c98b2b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sunspots — dark regions
  ctx.fillStyle = "#8a5a2b";
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * canvas.width;
    const y = 20 + Math.random() * (canvas.height - 40);
    const r = 8 + Math.random() * 20;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Sunspot penumbra
    ctx.fillStyle = "#a67843";
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y - r * 0.1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a2b";
  }

  // Solar granulation — tiny bright cells
  ctx.fillStyle = "#fff9e0";
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 0.5 + Math.random() * 1.5;
    ctx.fillRect(x, y, r, r);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Generic procedural texture — gray sphere for unknown body types. */
function createProceduralGenericTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#4a4a5a");
  bgGrad.addColorStop(0.5, "#5a5a6a");
  bgGrad.addColorStop(1, "#4a4a5a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Atmosphere glow sphere — adapted from Earth.tsx's AtmosphereSphere,
 * parameterized by body color. Only rendered for bodies with atmospheres
 * (Mars gets a thin pinkish atmosphere; Moon and Sun have none).
 */
function AtmosphereSphere({
  radius,
  color,
  opacity = 0.55,
}: {
  radius: number;
  color: THREE.Color;
  opacity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunDirection: { value: new THREE.Vector3(25, 20, 25).normalize() },
          uTime: { value: 0 },
          uGlowColor: { value: color },
          uOpacity: { value: opacity },
        },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [color, opacity]
  );

  useFrame((state) => {
    // eslint-disable-next-line react-hooks/immutability -- Three.js: standard pattern for updating shader time uniform each frame
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function CelestialBody({
  texturePath,
  fallbackTexturePath,
  radius,
  active,
  emissive = false,
  color = 0xffffff,
  idleSpinSpeed = 0.02,
  reducedMotion = false,
  performanceMode,
  bodyType = "generic",
}: Props) {
  // Same perf-mode segment scaling Earth.tsx applies to its own
  // sphereGeometry; falls back to the previous fixed 64 when
  // performanceMode isn't passed by a call site.
  const sphereSegments = performanceMode === "low" ? 48 : performanceMode === "high" ? 96 : 64;
  const bodyRef = useRef<THREE.Group>(null!);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Procedural texture fallback — mirrors Earth.tsx's pattern. If the real
  // texture fails to load (404, offline, etc.), the body still renders as
  // a recognizable textured sphere instead of a flat color.
  const proceduralTexture = useMemo(() => {
    if (bodyType === "moon") return createProceduralMoonTexture();
    if (bodyType === "mars") return createProceduralMarsTexture();
    if (bodyType === "sun") return createProceduralSunTexture();
    return createProceduralGenericTexture();
  }, [bodyType]);

  useEffect(() => {
    // Phase 5: retries once against fallbackTexturePath (the body's
    // ORIGINAL file) if texturePath — a possibly-adaptive 2K/4K variant —
    // 404s, before finally falling back to the procedural texture. When
    // fallbackTexturePath is omitted this is a single-stage load, same as
    // before.
    const cancel = loadTextureWithFallback(
      texturePath,
      fallbackTexturePath ?? texturePath,
      (tex) => {
        // Same filtering configuration Earth.tsx uses — mipmaps for smooth
        // minification, linear magnification, high anisotropy for oblique
        // viewing angles.
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = Math.min(16, 8);
        setTexture(tex);
      },
      () => setTexture(null) // fall back to procedural texture
    );
    return cancel;
  }, [texturePath, fallbackTexturePath]);

  useFrame((_, delta) => {
    if (!reducedMotion && idleSpinSpeed && bodyRef.current) {
      bodyRef.current.rotation.y += delta * idleSpinSpeed;
    }
  });

  // Inactive destination bodies read dimmed ("remain stationary and
  // visually inactive until their corresponding mission sequence") —
  // the Sun stays fully bright regardless, since it's meant to read as a
  // constant distant light source, not a mission destination itself.
  //
  // Bug fix ("continuous camera flow" — sudden object appear/interrupt):
  // this was a plain const computed straight from the `active` prop, so
  // the body's brightness (and Mars' atmosphere glow, gated on the same
  // `active` flag below) instantly snapped between 0.5 and 1.0 the exact
  // scroll frame the active mission changed — a discrete pop timed right
  // as the camera arrives at/leaves this body. Eased toward the target
  // brightness in useFrame instead (brightnessRef), same lerp-toward-
  // target pattern already used for the camera's own position/look-at
  // easing in CameraController, so the transition is smooth and
  // continuous no matter which direction the mission changes.
  const targetBrightness = emissive ? 1 : active ? 1 : 0.5;
  const brightnessRef = useRef(targetBrightness);
  useFrame(() => {
    brightnessRef.current = reducedMotion
      ? targetBrightness
      : lerp(brightnessRef.current, targetBrightness, 0.04);
  });
  const brightness = brightnessRef.current;
  const tint = new THREE.Color(brightness, brightness, brightness);

  // ── Per-body PBR material configuration ──────────────────────────────
  // Adapted from Earth.tsx's meshStandardMaterial values, tuned for each
  // body's surface properties.
  // Default to Earth-like values; only used for meshStandardMaterial
  // (emissive bodies like the Sun use meshBasicMaterial and skip these).
  let materialRoughness = 0.85;
  let materialMetalness = 0.05;

  if (!emissive) {
    if (bodyType === "mars") {
      // Mars' surface is dusty and matte
      materialRoughness = 0.92;
      materialMetalness = 0.02;
    }
  }

  // Atmosphere color — only for bodies with an atmosphere.
  // Mars: thin CO₂ atmosphere scatters red light → pinkish glow.
  // Moon: no atmosphere (skip). Sun: no atmosphere (it IS a star, skip).
  const hasAtmosphere = bodyType === "mars" && !emissive;
  const atmosphereColor = hasAtmosphere
    ? new THREE.Color(0xf8a1a1) // soft pink for Mars' thin atmosphere
    : new THREE.Color(0xffffff);

  return (
    <group ref={bodyRef}>
      <mesh>
        <sphereGeometry args={[radius, sphereSegments, sphereSegments]} />
        {emissive ? (
          <meshBasicMaterial
            map={texture ?? proceduralTexture}
            color={texture ? tint : new THREE.Color(color)}
            toneMapped={false}
            fog={false}
          />
        ) : (
          <meshStandardMaterial
            map={texture ?? proceduralTexture}
            color={texture ? tint : new THREE.Color(color).multiplyScalar(brightness)}
            roughness={materialRoughness}
            metalness={materialMetalness}
            toneMapped={false}
          />
        )}
      </mesh>

      {/* Atmosphere glow layer — Mars only (thin atmosphere). Adapted from
          Earth.tsx's AtmosphereSphere pattern. */}
      {hasAtmosphere && active && (
        <AtmosphereSphere
          radius={radius * 1.025}
          color={atmosphereColor}
          opacity={0.5}
        />
      )}
      {hasAtmosphere && active && (
        <AtmosphereSphere
          radius={radius * 1.075}
          color={atmosphereColor}
          opacity={0.35}
        />
      )}

      {emissive && (
        <pointLight color={color} intensity={active ? 2.4 : 1.3} distance={140} decay={2} />
      )}
    </group>
  );
}
