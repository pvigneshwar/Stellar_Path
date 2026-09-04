"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — High-Fidelity 3D Satellite Models (.GLB & PBR)
 *
 * Loads real binary .glb models from /models/satellites/ — one dedicated,
 * mission-accurate model per spacecraft (23 total) — with seamless
 * fallback to procedural PBR geometry while a model is loading.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { SATELLITES } from "@/lib/data/satellites";
import { JOURNEY_SATELLITES } from "@/lib/data/journey";
import { useJourney } from "@/components/providers/JourneyProvider";
import { PERFORMANCE_FLAGS, PRELOAD_BEHIND, PRELOAD_AHEAD } from "@/lib/performanceFlags";

const SATELLITE_COLORS = {
  bus: 0x3b4252,
  panel: 0x0f172a,
  antenna: 0x94a3b8,
  instrument: 0x64748b,
  solar: 0x1e3a8a,
  lens: 0x38bdf8,
  goldFoil: 0xd97706,
  silverFoil: 0xe2e8f0,
  thruster: 0x1e293b,
  copper: 0xb45309,
};

const GLOW_COLOR = new THREE.Color(0x00f0ff);
const HOVER_SCALE = 1.15;
const NORMAL_SCALE = 1.0;

// GLB model mapping — one dedicated real model per satellite id, sourced
// from /public/models/satellites/. Spaces in original filenames are
// URL-encoded (%20) since these are fetched as URLs, not filesystem paths.
const GLB_MODELS: Record<string, string> = {
  "aryabhata": "/models/satellites/ARYABHATA.glb",
  "bhaskara-1": "/models/satellites/BHASKARA-I.glb",
  "rohini": "/models/satellites/ROHINI%20RS-1.glb",
  "apple": "/models/satellites/APPLE.glb",
  "insat-1a-failed": "/models/satellites/INSAT-1A.glb",
  "insat-1b": "/models/satellites/INSAT-1B.glb",
  "irs-1a": "/models/satellites/IRS-1A.glb",
  "oceansat-1": "/models/satellites/OCEANSAT-1.glb",
  "resourcesat-1": "/models/satellites/RESOURCESAT-1.glb",
  "cartosat-1": "/models/satellites/CARTOSAT-1.glb",
  "chandrayaan-1": "/models/satellites/CHANDRAYAAN-1.glb",
  "gsat-5p-failed": "/models/satellites/GSAT-5P.glb",
  "mars-orbiter-mission": "/models/satellites/MANGALYAAN.glb",
  "astrosat": "/models/satellites/ASTROSAT.glb",
  "pratham": "/models/satellites/PRATHAM.glb",
  "irnss-1h-failed": "/models/satellites/IRNSS-1H.glb",
  "navic": "/models/satellites/NAVIC.glb",
  "chandrayaan-2": "/models/satellites/CHANDRAYAAN-2.glb",
  "chandrayaan-3": "/models/satellites/CHANDRAYAAN-3.glb",
  "aditya-l1": "/models/satellites/ADITYA-L1.glb",
  "xposat": "/models/satellites/XPOSAT.glb",
  "nisar": "/models/satellites/NISAR.glb",
  "gaganyaan": "/models/satellites/GAGANYAAN.glb",
};

// Bug fix (fast-scroll causes objects to fail to render): these GLBs
// previously only started downloading the first time their Suspense
// boundary actually mounted — i.e. the first time SatelliteEvolution's
// scroll-driven satelliteIndex landed on that mission. A fast scroll can
// jump straight to a satellite whose model was never touched before, so
// the Suspense boundary has to wait for a fresh fetch+parse with nothing
// (or the plain procedural fallback) shown until it resolves.
//
// Perf fix (Phase 6 — staged sliding-window GLB preload, behind
// PERFORMANCE_FLAGS.stagedGlbPreload, default false — see
// enhanced-space-project-performance-solution.md §8): loading all 23
// GLBs (several MB each) unconditionally on module load is the
// "existing full-preload path" the doc requires stays available as an
// immediate rollback — that's exactly what the flag-off branch below
// still does, unchanged from before. The flag-on branch instead warms
// only a sliding window around the active mission (PRELOAD_BEHIND=2
// behind, PRELOAD_AHEAD=3 ahead, from performanceFlags.ts — the doc's
// own recommended window), called via preloadModelWindow() below
// whenever the active satellite index changes (JourneyScene.tsx's
// SatelliteEvolution), plus once here at module load for Aryabhata (the
// journey's first mission) and its next three — the doc's "startup
// protection" requirement.
const UNIQUE_GLB_URLS = Array.from(new Set(Object.values(GLB_MODELS)));

// Ordered (not deduped) list matching JOURNEY_SATELLITES' own sequence —
// preloadModelWindow needs positional neighbors ("the next 3", "the
// previous 2"), which a Set/dedup pass can't give since it doesn't
// preserve journey order relative to a specific index.
const JOURNEY_GLB_URLS = JOURNEY_SATELLITES.map((s) => GLB_MODELS[s.id]).filter(
  (url): url is string => Boolean(url)
);

const preloadedGlbUrls = new Set<string>();
function preloadGlbUrl(url: string) {
  if (preloadedGlbUrls.has(url)) return;
  preloadedGlbUrls.add(url);
  useGLTF.preload(url);
}

/**
 * Warms every GLB in a window of PRELOAD_BEHIND models before and
 * PRELOAD_AHEAD models after `activeIndex` (both clamped to the journey's
 * bounds), per the doc's "Preload manager pattern" (§8). Safe to call
 * repeatedly with the same or overlapping windows — preloadGlbUrl no-ops
 * on a URL it's already started. Intended to be called when the active
 * satellite index CHANGES, not on every animation frame (see
 * JourneyScene.tsx's SatelliteEvolution).
 *
 * No-ops if PERFORMANCE_FLAGS.stagedGlbPreload is off, since in that mode
 * every model is already preloaded up front (the full-preload path
 * below) and a partial window would only be redundant, never harmful.
 */
export function preloadModelWindow(activeIndex: number) {
  if (!PERFORMANCE_FLAGS.stagedGlbPreload) return;
  const start = Math.max(0, activeIndex - PRELOAD_BEHIND);
  const end = Math.min(JOURNEY_GLB_URLS.length - 1, activeIndex + PRELOAD_AHEAD);
  for (let index = start; index <= end; index += 1) {
    const url = JOURNEY_GLB_URLS[index];
    if (url) preloadGlbUrl(url);
  }
}

if (PERFORMANCE_FLAGS.stagedGlbPreload) {
  // Startup protection (doc §8): warm Aryabhata (journey index 0) and its
  // next three neighbors immediately, before the user has scrolled at
  // all — PRELOAD_AHEAD=3 makes this warm exactly indices 0-3.
  preloadModelWindow(0);
} else {
  // Existing full-preload path — unconditionally warms every unique GLB
  // up front. This is the doc's required immediate-rollback target: with
  // the flag off (the default), behavior is byte-for-byte identical to
  // before this phase existed.
  UNIQUE_GLB_URLS.forEach((url) => preloadGlbUrl(url));
}

// Uniform world-unit footprint every real GLB model's BUS (spacecraft
// body only -- explicitly excluding solar panels/arrays) is normalized
// to, BEFORE the caller's own `scale` prop (SAT_MODEL_SCALE, hero-orbit
// 0.65, deployed-payload 0.4, etc. in JourneyScene.tsx) is applied on
// top.
//
// BUG FIX (satellites too small / huge white circle / inconsistent scale
// between GLTF files / rotating around the wrong point): GLBModel
// previously cloned and rendered each model's raw scene graph exactly as
// authored, with no bounding-box normalization at all. The satellite
// GLBs come from different export pipelines with different native scales
// (some modeled in meters, some in centimeters -- 100x+ apart) and
// different origins (some centered on the spacecraft body, some offset
// far from the actual geometry). Applying the same flat SAT_MODEL_SCALE
// constant on top of that raw geometry produced drastically different
// on-screen sizes per satellite, and in the worst case (a model authored
// at a much larger native scale) an enormous mesh that could enclose the
// camera -- exactly the reported "huge white circle fills most of the
// screen" bug. An off-center native origin also meant the parent's
// rotation swung the model around a point nowhere near its visual
// center.
//
// FOLLOW-UP FIX (user request: normalize the BUS size, not total model
// size including panels): normalizing against the FULL model's largest
// dimension (bus + deployed solar panels/arrays) meant satellites whose
// panels span wide (the comms/nav types with two large flat arrays) had
// their BUS scaled down more than satellites with small or no panels
// (e.g. AstroSat's compact cylinder) -- panel span was dominating
// "largest dimension" for the whole model, so the spacecraft bodies
// themselves read as visibly different sizes even though that's exactly
// what should look consistent across missions. Panels legitimately vary
// in span per mission (that's real/accurate) and stay excluded from this
// calculation on purpose -- only the bus itself is being equalized.
//
// Fix: compute each model's BUS-ONLY bounding box once (every mesh whose
// name doesn't match the panel-name heuristic below), then normalize:
//   1. An inner group offsets the geometry by -center (the BUS box's
//      center, not the full model's), so the bus's own visual center --
//      not whatever arbitrary point the GLB used as its root origin, and
//      not skewed off-center by an asymmetric panel -- sits at local
//      (0,0,0). This is what the parent SatelliteModel's rotation then
//      pivots around.
//   2. An outer group scales the whole thing (bus AND its attached
//      panels together, so they stay correctly proportioned/attached) so
//      the BUS's largest dimension becomes exactly NORMALIZED_BUS_SIZE
//      world units -- one shared target bus size for every satellite
//      regardless of native GLB scale or how far its panels extend --
//      before the caller's own `scale` prop does its normal per-context
//      sizing.
const NORMALIZED_BUS_SIZE = 2.2;

// Name-based heuristic for excluding solar panels/arrays from the bus
// bounding-box calculation -- the same case-insensitive substring-match
// pattern already used elsewhere in this codebase for GLB node
// identification (see RocketGLB.tsx's floor/ground/platform/pad/base
// plate filter). Node-naming conventions vary across the 23 GLBs' export
// pipelines, so this errs toward the common terms real spacecraft-model
// exports use for these parts.
function isPanelLikeName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("panel") ||
    n.includes("solar") ||
    n.includes("array") ||
    n.includes("wing") ||
    n.includes("sap")
  );
}

// Perf fix (Stage 12 audit item #2): the bus-only bounding-box traversal
// below is expensive (a full mesh traverse + Box3 expansion per call) and
// its result — centerOffset/scaleFactor — depends only on the SOURCE
// scene's geometry, which never changes for a given url. Previously this
// ran fresh on every GLBModel mount, including every time the satellite-
// evolution scroll swaps `satelliteId` on an already-mounted GLBModel
// instance (OrbitingSatellite keeps the same component instance alive
// across transitions, only changing its `url` prop) — so the same GLB's
// box got re-measured repeatedly over a long scroll session. The actual
// Object3D clone still happens on every mount (required — the same
// scene graph can be mounted in more than one place at once, e.g. the
// hero-orbit Gaganyaan and a later orbiting Gaganyaan instance both exist
// in the tree simultaneously, just toggled invisible, and Three.js
// objects can only have one parent), but cloning alone is cheap: THREE's
// Object3D.clone() shares geometry/material references rather than
// duplicating buffer data. Caching just the measurement removes the
// expensive part while keeping every instance's own independent clone.
const glbTransformCache = new Map<string, { centerOffset: THREE.Vector3; scaleFactor: number }>();

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const { normalizedObject, centerOffset, scaleFactor } = useMemo(() => {
    const cloned = scene.clone();

    let cached = glbTransformCache.get(url);
    if (!cached) {
      // Bus-only box: expand across every mesh EXCEPT ones whose name
      // matches the panel heuristic above, so a satellite's panel span can
      // never influence the bus's own normalized size.
      const busBox = new THREE.Box3();
      let hasBusGeometry = false;
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (isPanelLikeName(child.name)) return;
        busBox.expandByObject(child);
        hasBusGeometry = true;
      });
      // Fallback: if a GLB has no name metadata (or every mesh happens to
      // match the panel heuristic), fall back to the full-model box rather
      // than normalizing against an empty/degenerate one.
      const box = hasBusGeometry ? busBox : new THREE.Box3().setFromObject(scene);

      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      // Guard against a degenerate/empty bounding box -- fall back to no
      // rescale rather than dividing by zero or producing a NaN/Infinity
      // scale that would vanish the model.
      const safeMaxDim = Number.isFinite(maxDim) && maxDim > 1e-6 ? maxDim : NORMALIZED_BUS_SIZE;
      cached = { centerOffset: center, scaleFactor: NORMALIZED_BUS_SIZE / safeMaxDim };
      glbTransformCache.set(url, cached);
    }

    return {
      normalizedObject: cloned,
      centerOffset: cached.centerOffset,
      scaleFactor: cached.scaleFactor,
    };
  }, [scene, url]);

  return (
    <group scale={scaleFactor}>
      <group position={[-centerOffset.x, -centerOffset.y, -centerOffset.z]}>
        <primitive object={normalizedObject} />
      </group>
    </group>
  );
}

// ── PBR Material Generators ─────────────────────────────────────────────────
function metalMat(color: number, roughness = 0.25, metalness = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    envMapIntensity: 1.8,
  });
}

function goldMliMat() {
  return new THREE.MeshStandardMaterial({
    color: SATELLITE_COLORS.goldFoil,
    metalness: 0.9,
    roughness: 0.35,
    envMapIntensity: 2.2,
  });
}

function silverMliMat() {
  return new THREE.MeshStandardMaterial({
    color: SATELLITE_COLORS.silverFoil,
    metalness: 0.95,
    roughness: 0.2,
    envMapIntensity: 2.0,
  });
}

function panelMat() {
  return new THREE.MeshStandardMaterial({
    color: SATELLITE_COLORS.solar,
    metalness: 0.4,
    roughness: 0.2,
    emissive: new THREE.Color(0x0a192f),
    emissiveIntensity: 0.2,
  });
}

function lensMat() {
  return new THREE.MeshPhysicalMaterial({
    color: SATELLITE_COLORS.lens,
    transmission: 0.6,
    opacity: 0.9,
    transparent: true,
    roughness: 0.1,
    metalness: 0.1,
    ior: 1.5,
  });
}

/**
 * Procedural 3D model for a satellite, generated from its verified data record.
 * Supports hover (glow + dynamic HTML badge) and click (triggers 7-tab modal).
 */
export function SatelliteModel({
  satelliteId,
  interactive = true,
  scale = 1,
  ...props
}: {
  satelliteId: string;
  interactive?: boolean;
  position?: [number, number, number];
  scale?: number;
}) {
  const data = SATELLITES.find((s) => s.id === satelliteId) ?? SATELLITES[0]!;
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const [hovered, setHovered] = useState(false);
  // BUG FIX (satellites rendering at the wrong/inconsistent size,
  // mistakeprompt.md #4/#8/#9/#19): this ref previously held an ABSOLUTE
  // scale value (NORMAL_SCALE=1.0 or HOVER_SCALE=1.15) that the useFrame
  // hook below wrote straight onto groupRef every single frame via
  // `.setScalar()` -- completely overwriting, not multiplying, whatever
  // `scale` prop the caller passed in (SAT_MODEL_SCALE=0.22 for orbiting
  // satellites, 0.65 for the hero-orbit Gaganyaan, 0.4 for the stowed
  // launch payload, etc.). So every SatelliteModel instance actually
  // rendered at ~1.0x its (already GLB-normalized) size regardless of
  // the scale its caller specified, the instant the first frame ran --
  // the per-context sizing callers relied on never took visual effect at
  // all. currentScale now tracks the same ABSOLUTE value but is computed
  // each frame as `scale * (hovered ? HOVER_SCALE : NORMAL_SCALE)` (see
  // useFrame below), i.e. the caller's scale prop times a small
  // 1.0/1.15 hover multiplier, restoring per-context sizing while
  // keeping the existing smooth hover-grow behavior.
  const currentScale = useRef(scale * NORMAL_SCALE);
  const { openDetails } = useJourney();

  const glbUrl = GLB_MODELS[satelliteId];

  // Subtle real-world orbital rotation and micro-wobble
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.12;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.03;

    // Smooth scale interpolation on hover -- target is the caller's own
    // `scale` prop multiplied by the hover factor, not a bare hover
    // factor on its own (see the currentScale comment above for why).
    const target = scale * (hovered ? HOVER_SCALE : NORMAL_SCALE);
    currentScale.current += (target - currentScale.current) * 0.15;
    groupRef.current.scale.setScalar(currentScale.current);

    // Glow light dynamics
    if (glowRef.current) {
      const glowTarget = hovered ? 2.5 : 0.4;
      glowRef.current.intensity += (glowTarget - glowRef.current.intensity) * 0.2;
    }
  });

  const handlePointerOver = useCallback(() => {
    if (!interactive) return;
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, [interactive]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(
    (e: THREE.Event) => {
      if (!interactive) return;
      if (e && typeof (e as any).stopPropagation === "function") {
        (e as any).stopPropagation();
      }
      openDetails(satelliteId);
    },
    [interactive, openDetails, satelliteId]
  );

  // Procedural geometry selector
  const proceduralModel = useMemo(() => {
    const category = data.category;
    const baseSize = 1.0;

    if (category === "lunar") return buildChandrayaanLander(baseSize);
    if (category === "planetary") return buildMangalyaanOrbiter(baseSize);
    if (category === "solar") return buildAdityaSolar(baseSize);
    if (category === "communication" || category === "navigation") return buildCommsNavSatellite(baseSize);
    if (category === "scientific") return buildAstroSatScience(baseSize);
    return buildEarthObservationSatellite(baseSize);
  }, [data.category]);

  return (
    <group
      ref={groupRef}
      {...props}
      name={`satellite-${satelliteId}`}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Real GLB 3D model if available, with procedural fallback */}
      {glbUrl ? (
        <Suspense
          fallback={
            <group name="fallback-procedural">
              {proceduralModel.body}
              {proceduralModel.solarPanels}
              {proceduralModel.antennas}
              {proceduralModel.instruments}
              {proceduralModel.thrusters}
            </group>
          }
        >
          <GLBModel url={glbUrl} />
        </Suspense>
      ) : (
        <group name="procedural-pbr">
          {proceduralModel.body}
          {proceduralModel.solarPanels}
          {proceduralModel.antennas}
          {proceduralModel.instruments}
          {proceduralModel.thrusters}
        </group>
      )}

      {/* Dynamic Proximity Lighting */}
      <pointLight
        ref={glowRef}
        color={GLOW_COLOR}
        intensity={0.4}
        distance={4.5}
        decay={2}
      />

      {/* Floating Interactive Label */}
      {hovered && interactive && (
        <Html
          center
          distanceFactor={6}
          style={{ pointerEvents: "none" }}
        >
          <div className="animate-fade-in-up whitespace-nowrap rounded-xl border border-cyan-500/40 bg-slate-950/80 px-4 py-2 text-center shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md">
            <p className="font-display text-sm font-bold tracking-wide text-white">
              {data.name}
            </p>
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Click to inspect mission</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Procedural PBR Geometry Implementations ─────────────────────────────────
function buildEarthObservationSatellite(size: number) {
  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size * 0.9, size * 1.1, size * 0.9]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
      <mesh position={[0, size * 0.6, 0]}>
        <boxGeometry args={[size * 0.7, 0.15, size * 0.7]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(size * 0.55 + 0.5), 0, 0]}>
        <boxGeometry args={[1.0, size * 0.9, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
      <mesh position={[size * 0.55 + 0.5, 0, 0]}>
        <boxGeometry args={[1.0, size * 0.9, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  const instruments = (
    <group>
      <mesh position={[0, -(size * 0.6), size * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.35, 24]} />
        <primitive object={metalMat(SATELLITE_COLORS.bus)} attach="material" />
      </mesh>
      <mesh position={[0, -(size * 0.78), size * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 24]} />
        <primitive object={lensMat()} attach="material" />
      </mesh>
    </group>
  );

  const antennas = (
    <group>
      <mesh position={[0, size * 0.75, 0]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.35, 0.15, 24]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
      <mesh position={[size * 0.35, size * 0.7, size * 0.35]}>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
        <primitive object={metalMat(SATELLITE_COLORS.antenna)} attach="material" />
      </mesh>
    </group>
  );

  const thrusters = (
    <group>
      {[-0.35, 0.35].map((x, i) =>
        [-0.35, 0.35].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, -(size * 0.58), z]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.05, 0.12, 12]} />
            <primitive object={metalMat(SATELLITE_COLORS.thruster)} attach="material" />
          </mesh>
        ))
      )}
    </group>
  );

  return { body, solarPanels, antennas, instruments, thrusters };
}

function buildChandrayaanLander(size: number) {
  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[size * 0.7, size * 0.85, size * 0.9, 8]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
      <mesh position={[0, size * 0.5, 0]}>
        <boxGeometry args={[size * 0.6, 0.15, size * 0.6]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
      <mesh position={[size * 0.6, -0.1, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.1, size * 0.6, size * 0.4]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(size * 0.72), 0, 0]}>
        <boxGeometry args={[0.05, size * 0.8, size * 0.7]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  const instruments = (
    <group>
      <mesh position={[0, -size * 0.35, size * 0.75]}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <primitive object={metalMat(SATELLITE_COLORS.instrument)} attach="material" />
      </mesh>
    </group>
  );

  const thrusters = (
    <group>
      {[
        [-0.45, -0.45],
        [0.45, -0.45],
        [-0.45, 0.45],
        [0.45, 0.45],
      ].map(([x, z], idx) => (
        <mesh key={idx} position={[x, -(size * 0.55), z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.25, 16]} />
          <primitive object={metalMat(SATELLITE_COLORS.thruster, 0.3, 0.95)} attach="material" />
        </mesh>
      ))}
    </group>
  );

  return { body, solarPanels, antennas: null, instruments, thrusters };
}

function buildMangalyaanOrbiter(size: number) {
  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size * 1.1, size * 1.1, size * 1.1]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(size * 0.6 + 0.75), 0, 0]}>
        <boxGeometry args={[1.5, size * 1.0, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  const antennas = (
    <group>
      <mesh position={[0, size * 0.7, 0]} rotation={[0.3, 0.5, 0]}>
        <coneGeometry args={[0.65, 0.22, 32]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
    </group>
  );

  return { body, solarPanels, antennas, instruments: null, thrusters: null };
}

function buildAdityaSolar(size: number) {
  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size * 0.95, size * 1.4, size * 0.95]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
      <mesh position={[0, size * 0.85, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 24]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(size * 0.6 + 0.6), 0, 0]}>
        <boxGeometry args={[1.2, size * 1.2, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
      <mesh position={[size * 0.6 + 0.6, 0, 0]}>
        <boxGeometry args={[1.2, size * 1.2, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  return { body, solarPanels, antennas: null, instruments: null, thrusters: null };
}

function buildCommsNavSatellite(size: number) {
  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size * 1.2, size * 0.9, size * 0.9]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(size * 0.65 + 0.8), 0, 0]}>
        <boxGeometry args={[1.6, size * 0.85, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
      <mesh position={[size * 0.65 + 0.8, 0, 0]}>
        <boxGeometry args={[1.6, size * 0.85, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  const antennas = (
    <group>
      <mesh position={[0, size * 0.65, size * 0.3]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.55, 0.18, 24]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
    </group>
  );

  return { body, solarPanels, antennas, instruments: null, thrusters: null };
}

function buildAstroSatScience(size: number) {
  const radius = size * 0.5;

  const body = (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius * 1.1, size * 1.3, 16]} />
        <primitive object={silverMliMat()} attach="material" />
      </mesh>
      <mesh position={[0, -(size * 0.65), 0]}>
        <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.2, 16]} />
        <primitive object={goldMliMat()} attach="material" />
      </mesh>
    </group>
  );

  const solarPanels = (
    <group>
      <mesh position={[-(radius + 0.45), 0, 0]}>
        <boxGeometry args={[0.9, size * 1.1, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
      <mesh position={[radius + 0.45, 0, 0]}>
        <boxGeometry args={[0.9, size * 1.1, 0.03]} />
        <primitive object={panelMat()} attach="material" />
      </mesh>
    </group>
  );

  return { body, solarPanels, antennas: null, instruments: null, thrusters: null };
}

/** Orbit line helper */
export function OrbitLine({
  radius = 3,
  inclination = 0,
  eccentricity = 0,
  color = 0x00d4ff,
  segments = 160,
}: {
  radius?: number;
  inclination?: number;
  eccentricity?: number;
  color?: number;
  segments?: number;
}) {
  // R3F doesn't auto-register THREE.Line in its JSX catalogue (it's
  // deliberately excluded from the default extend() set because the tag
  // name `line` collides with the SVG element), so `<threeLine>` /
  // `<line>` here throws "is not part of the THREE namespace". Build the
  // THREE.Line object imperatively instead and mount it with <primitive>.
  // This also fixes a second, latent bug: LineDashedMaterial requires
  // computeLineDistances() to be called on the line, or the dash pattern
  // never actually computes and the line renders solid regardless of
  // dashSize/gapSize.
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = radius;
    const b = radius * Math.sqrt(1 - Math.min(0.9, eccentricity * eccentricity));

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * a;
      const zBase = Math.sin(theta) * b;
      const y = zBase * Math.sin(degToRad(inclination));
      const z = zBase * Math.cos(degToRad(inclination));
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    geom.computeBoundingSphere();

    // depthWrite=false: the orbit ring's own depth was being written to
    // the depth buffer, so as it passed directly behind/through a
    // satellite's silhouette it could win depth ties against the
    // spacecraft's thin antenna/panel geometry and draw ON TOP of it
    // rather than being cleanly occluded — reading as the ring
    // "cutting through" the spacecraft. depthTest stays on (so the ring
    // still correctly hides behind Earth/solid bodies), it just no
    // longer writes depth that can incorrectly out-compete
    // thin/coplanar spacecraft geometry. renderOrder={-1} plus a lower
    // opacity keeps it visually behind and subordinate to the model.
    const material = new THREE.LineDashedMaterial({
      color,
      opacity: 0.45,
      transparent: true,
      depthWrite: false,
      dashSize: 0.25,
      gapSize: 0.1,
      toneMapped: false,
    });

    const obj = new THREE.Line(geom, material);
    obj.computeLineDistances();
    obj.renderOrder = -1;
    return obj;
  }, [radius, inclination, eccentricity, segments, color]);

  // Perf fix (Stage 12 audit item #10): <primitive> mounts an existing
  // object as-is — unlike JSX-managed geometry/material props elsewhere
  // in this codebase (e.g. LaunchSmoke/TransformationParticles' <points
  // geometry={...}>), R3F does NOT auto-dispose objects passed via
  // <primitive> on unmount, since it can't assume they're safe to free
  // (they might be shared). This `line`'s geometry/material are freshly
  // created above and never shared elsewhere, so they're safe to dispose
  // explicitly whenever a new `line` replaces this one (radius/
  // inclination/eccentricity/segments/color change) or on final unmount.
  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export type { JourneySatellite } from "@/lib/types";
