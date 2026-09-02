"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Earth Component
 *
 * Renders a high-fidelity 3D Earth with:
 *   - High-resolution 8k Earth day-map texture (async loaded, with procedural fallback)
 *   - Procedural PBR surface fallback (rich oceans, continents, terrain altitude)
 *   - Procedural specular ocean reflections
 *   - Custom GLSL atmosphere terminator shader (Rayleigh scattering glow)
 *   - Safe async texture fallback (never throws or crashes if offline)
 *   - Slow continuous rotation oriented with India on the night/terminator side
 *
 * Feature removal: the rotating cloud layer (canvas-generated cloud texture
 * on a slightly-larger sphere) was removed per explicit request — Earth now
 * renders as a clean globe with no cloud cover.
 */
import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PerformanceMode } from "@/lib/types";
import { degToRad, lerp } from "@/lib/utils";
import { getAdaptiveTexturePath, getOriginalTexturePath } from "@/lib/textures";
import { loadTextureWithFallback } from "@/lib/loadTextureWithFallback";

// ── Atmosphere Shader (Terminator & Rayleigh Rim Glow) ───────────────────────
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

    vec3 glow = mix(vec3(0.0, 0.7, 1.0), vec3(0.3, 0.8, 1.0), 0.5);
    gl_FragColor = vec4(glow, min(intensity * 0.8, 0.65));
  }
`;

// ── Procedural Earth & Cloud Canvas Texture Generators ──────────────────────
function createProceduralEarthTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    // SSR fallback — return a minimal placeholder. The real canvas texture
    // is generated client-side on first render and replaces this.
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Deep ocean background
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, "#0b192e");
  oceanGrad.addColorStop(0.5, "#0d2b45");
  oceanGrad.addColorStop(1, "#0b192e");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Procedural continental landmasses
  ctx.fillStyle = "#1e3a29";
  const drawContinent = (x: number, y: number, r: number, color: string) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // Eurasia & Africa landmasses
  drawContinent(550, 180, 130, "#2d4a22");
  drawContinent(600, 160, 90, "#3a5a2a");
  drawContinent(520, 260, 110, "#4a5320"); // Africa

  // Indian subcontinent prominence
  drawContinent(680, 220, 45, "#3d6029");
  drawContinent(690, 240, 30, "#4d6f35");

  // Americas
  drawContinent(250, 180, 100, "#2a4825");
  drawContinent(300, 320, 90, "#23401e");

  // Polar ice caps
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, 30);
  ctx.fillRect(0, canvas.height - 35, canvas.width, 35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

interface Props {
  performanceMode: PerformanceMode;
  reducedMotion?: boolean;
  // Scroll progress ref (0..1+ across the whole journey), used solely to
  // damp Earth's own idle rotation while the camera sits close/overhead
  // during the rocket-reveal → launch window (see LIFTOFF_WINDOW below).
  // Optional so Earth still works anywhere it's mounted without a journey
  // (e.g. isolated previews).
  progressRef?: { current: number };
}

// Bug fix: Earth's idle rotation (earthSpeed below) runs on real elapsed
// time, completely independent of scroll. That's unnoticeable in the
// wide hero/approach shots, but the rocket-reveal → launch camera
// waypoints (CAMERA_TOP_APPROACH/IGNITION/LAUNCH_FOLLOW in JourneyScene)
// sit close and nearly overhead, right above GLOBE_TOP — at that
// distance/angle the same fixed angular speed sweeps continents under
// the camera far more visibly than in the pulled-back shots, and the
// countdown window was deliberately stretched to ~206vh of scroll (see
// COUNTDOWN_SCROLL_WEIGHT in constants.ts) so a normal scroll pace now
// lingers there long enough for the constant-rate spin to accumulate
// into an obvious "overspin" while the rocket is the intended focus.
// Damping (not stopping) rotation specifically across this window keeps
// the globe visually stable under the rocket without an abrupt freeze.
const LIFTOFF_WINDOW_START = 0.08; // just before ROCKET_REVEAL begins
const LIFTOFF_WINDOW_END = 0.45; // end of LAUNCH — camera pulls back into ATMOSPHERE after this
const LIFTOFF_SPIN_DAMPING = 0.05; // 5% of normal idle-rotation speed inside the window

export function Earth({ performanceMode, reducedMotion = false, progressRef }: Props) {
  const earthRef = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const earthRadius = 6.371;

  // Always generate a resilient procedural texture first (used as immediate fallback)
  const proceduralDayTexture = useMemo(() => createProceduralEarthTexture(), []);

  // Perf fix (Phase 5 — adaptive texture variants, behind
  // PERFORMANCE_FLAGS.adaptiveTextures): resolved once from
  // performanceMode, not re-evaluated mid-scroll. Falls back to
  // LOCAL_EARTH_TEXTURE itself whenever the flag is off or on "high" —
  // see lib/textures.ts.
  const texturePath = useMemo(() => getAdaptiveTexturePath("earth", performanceMode), [performanceMode]);

  // Async load high-resolution local texture; fall back to procedural.
  // loadTextureWithFallback retries once against the ORIGINAL file if the
  // adaptive variant above 404s (e.g. not yet generated by
  // scripts/optimize-textures.mjs) before finally giving up on procedural.
  const [dayTexture, setDayTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const cancel = loadTextureWithFallback(
      texturePath,
      getOriginalTexturePath("earth"),
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
        setDayTexture(texture);
      },
      () => setDayTexture(null) // on error keep null → falls back to procedural
    );
    return cancel;
  }, [texturePath, gl]);

  // Earth's idle rotation speed
  const earthSpeed = reducedMotion ? 0.00005 : 0.0004;

  useFrame(() => {
    if (reducedMotion) return;

    // Smoothly ease the spin multiplier down to LIFTOFF_SPIN_DAMPING across
    // the liftoff window instead of toggling it, so the rate change itself
    // never reads as a discrete jump. A short 0.03-progress ramp on each
    // edge (clamped so it never inverts the window) blends in/out.
    let spinMultiplier = 1;
    if (progressRef) {
      const p = progressRef.current;
      const rampIn = Math.max(0, Math.min(1, (p - LIFTOFF_WINDOW_START) / 0.03));
      const rampOut = Math.max(0, Math.min(1, (LIFTOFF_WINDOW_END - p) / 0.03));
      const inWindow = p > LIFTOFF_WINDOW_START && p < LIFTOFF_WINDOW_END;
      const damp = inWindow ? Math.min(rampIn, rampOut) : 1;
      spinMultiplier = lerp(LIFTOFF_SPIN_DAMPING, 1, damp);
    }

    if (earthRef.current) {
      earthRef.current.rotation.y += earthSpeed * spinMultiplier;
    }
  });

  // India oriented toward the active night/launch side initially (~78°E)
  const initialRotationY = degToRad(78);

  return (
    <group ref={earthRef} rotation-y={initialRotationY}>
      {/* ── Main Earth Sphere ──
          Perf fix (fix.md A2): castShadow/receiveShadow now match the
          directional light's own performanceMode gating in
          SpaceEnvironment.tsx — no point paying for a shadow pass on a
          mesh when the light casting it isn't producing shadows at all
          on "low". */}
      <mesh castShadow={performanceMode !== "low"} receiveShadow={performanceMode !== "low"}>
        <sphereGeometry
          args={[
            earthRadius,
            performanceMode === "low" ? 48 : 96,
            performanceMode === "low" ? 48 : 96,
          ]}
        />
        <meshStandardMaterial
          map={dayTexture ?? proceduralDayTexture}
          metalness={0.15}
          roughness={0.65}
          emissive={new THREE.Color(0x020817)}
          emissiveIntensity={0.2}
          toneMapped={false}
        />
      </mesh>

      {/* ── Atmosphere Rim & Glow ── */}
      <AtmosphereSphere radius={earthRadius * 1.025} />
      <AtmosphereSphere radius={earthRadius * 1.075} opacity={0.35} />
    </group>
  );
}

/** Atmosphere glow sphere */
function AtmosphereSphere({
  radius,
  opacity = 0.55,
}: {
  radius: number;
  opacity?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunDirection: { value: new THREE.Vector3(25, 20, 25).normalize() },
          uTime: { value: 0 },
        },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
