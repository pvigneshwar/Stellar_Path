"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Journey 3D Scene
 *
 * The persistent R3F Canvas that drives the entire scroll-controlled journey.
 * Reads scroll progress from JourneyContext (progressRef) and animates:
 *
 *  Scroll phase          Progress range   What happens
 *  ─────────────────────────────────────────────────────────
 *  Earth approach        0.00–0.10       Camera approaches Earth
 *  Rocket reveal         0.10–0.20       Camera moves to the globe's top point; rocket emerges from it
 *  Ignition              0.20–0.30       Flame, smoke, heat glow, camera shake
 *  Launch                0.30–0.45       Rocket ascends from the globe's top, camera follows
 *  Atmosphere            0.45–0.60       Earth recedes, sky darkens
 *  Space                 0.60–0.70       Stars prominent, rocket in vacuum
 *  Stage separation      0.70–0.80       Boosters and core separate
 *  Payload → Aryabhata   0.80–1.00       Payload transforms into satellite
 *  Satellite evolution   1.00–end        Mission-accurate trajectory simulations (LEO, GEO, Lunar, Mars, L1) —
 *                                        each satellite gets one full SATELLITE_TRANSITION_BAND-wide scroll
 *                                        segment (see lib/constants.ts) mapped to exactly one orbital revolution
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { Earth } from "./Earth";
import { SpaceEnvironment } from "./SpaceEnvironment";
import { SatelliteModel, OrbitLine, preloadModelWindow } from "./SatelliteModel";
import { RocketGLB } from "./RocketGLB";
import { CelestialBody } from "./CelestialBody";
import { useJourney } from "@/components/providers/JourneyProvider";
import {
  SATELLITE_TRANSITION_BAND,
  COLORS,
  LOCAL_ROCKET_TEXTURE,
  ROCKET_RISE_START,
  COUNTDOWN_END,
} from "@/lib/constants";
import { JOURNEY_SATELLITES } from "@/lib/data/journey";
import { lerp, seededRandom, smoothstep } from "@/lib/utils";
import { PERFORMANCE_FLAGS } from "@/lib/performanceFlags";
import { getAdaptiveTexturePath, getOriginalTexturePath } from "@/lib/textures";
import type { PerformanceMode } from "@/lib/types";

// ── Scene constants ─────────────────────────────────────────────────────
// Earth lowered and pushed back slightly to reduce screen dominance
// and create safe margins above the navbar and below the HUD.
const EARTH_POS: [number, number, number] = [0, -3, -14];
const EARTH_SCALE = 1;

// ── Rocket reveal location (CHANGE REQUEST: reveal from the globe's
// exact top/polar point, replacing the previous off-center front-facing
// site) ──────────────────────────────────────────────────────────────────
// EARTH_RADIUS_WORLD matches Earth.tsx's actual mesh radius (`const
// earthRadius = 6.371`) at EARTH_SCALE=1. GLOBE_TOP is EARTH_POS shifted
// straight up by that radius — the exact geometric top of the globe, not
// an arbitrary screen position. Earth only ever rotates about its own
// world +Y axis (see Earth.tsx), and a point sitting ON that axis (the
// pole) is invariant under a Y-axis rotation, so GLOBE_TOP stays fixed in
// world space regardless of Earth's spin.
//
// GLOBE_TOP also sits directly along world +Y from Earth's center, which
// is exactly the rocket's own default "up" axis — so the rocket needs no
// extra alignment rotation to match the local surface normal here (the
// previous off-axis site never computed one either, which was a latent
// inaccuracy this change resolves as a side effect).
const EARTH_RADIUS_WORLD = 6.371;
const GLOBE_TOP: [number, number, number] = [
  EARTH_POS[0],
  EARTH_POS[1] + EARTH_RADIUS_WORLD,
  EARTH_POS[2],
];
const LAUNCH_SITE: [number, number, number] = GLOBE_TOP;
const ROCKET_GROUND_Y = GLOBE_TOP[1];
const ROCKET_END_Y = ROCKET_GROUND_Y + 20; // same 20-unit climb as before, now measured from the new (higher) pad height

// Rocket hidden-inside-Earth position (see "place the rocket inside the
// globe until the countdown" change below). LAUNCH_SITE already sits
// exactly ON Earth's surface (it IS EARTH_POS + radius along +Y), so 35%
// of the way from Earth's center to LAUNCH_SITE is safely enclosed within
// the opaque globe mesh — occluded by Earth's own geometry rather than a
// visibility toggle. Lerping straight from EARTH_POS to the new polar
// LAUNCH_SITE keeps this on the same +Y axis the rocket later launches
// on, so it emerges vertically rather than sliding in at an angle.
const ROCKET_INSIDE_POS: [number, number, number] = [
  lerp(EARTH_POS[0], LAUNCH_SITE[0], 0.35),
  lerp(EARTH_POS[1], LAUNCH_SITE[1], 0.35),
  lerp(EARTH_POS[2], LAUNCH_SITE[2], 0.35),
];
// COUNTDOWN_START / COUNTDOWN_END now come from lib/constants.ts, shared
// with JourneyOverlay.tsx's T-minus display — see comment there.

// ── Camera waypoints (all driven by scroll progress) ────────────────────
// CAMERA_START pulled back to [0,0,38] from the previous [0,0,28].
// Distance to Earth center = 38 + 14 = 52 → Earth's angular diameter
// drops from ~18° to ~14°, a ~22% reduction in screen coverage.
// Camera-distance change (not mesh rescale) preserves full texture detail
// and applies identically at any aspect ratio since vertical FOV is
// constant.
const CAMERA_START: [number, number, number] = [0, 0, 38];
const CAMERA_EARTH_APPROACH: [number, number, number] = [0, 0, 12];
// CHANGE REQUEST — camera choreography rebuilt around GLOBE_TOP instead
// of the old off-center rocket-view framing:
//   CAMERA_TOP_APPROACH — a genuine overhead/polar shot: height (24) is
//     much larger than the horizontal offset from GLOBE_TOP's own z
//     (-15 vs GLOBE_TOP's -14, i.e. only 1 unit of horizontal offset
//     against ~21 units of vertical drop to the target). A previous
//     version used [0, 14, -6] — 8 units of horizontal offset against
//     only ~10.6 vertical, a shallow ~40° angle that read as a front-on
//     3/4 view of the globe rather than looking down its pole, which is
//     what made the reveal look like it was coming from the front
//     instead of straight from above (req #3 "Top Reveal View").
//   CAMERA_IGNITION — still steep/overhead (horizontal offset stays
//     small relative to height) but lower and slightly off-axis so the
//     engine glow/flame at GLOBE_TOP reads with some depth once ignition
//     starts, rather than a flat plan view.
//   CAMERA_LAUNCH_FOLLOW — pulled back and up further so both the
//     climbing rocket AND the globe stay in frame together as it rises
//     away from the pole (req #7 "keeping both rocket and globe
//     visible"), starting to open up out of the steep overhead angle
//     toward the more cinematic side-on follow used in later phases.
const CAMERA_TOP_APPROACH: [number, number, number] = [0, 24, -15];
const CAMERA_IGNITION: [number, number, number] = [3, 18, -13];
const CAMERA_LAUNCH_FOLLOW: [number, number, number] = [6, 20, -16];
const CAMERA_ATMOSPHERE: [number, number, number] = [2, 12, 5];
const CAMERA_SPACE: [number, number, number] = [0, 8, 8];
// CAMERA_SATELLITE re-anchored around EARTH_POS (was a fixed [0,0,6],
// framing empty space at the world origin from before the satellite
// evolution orbits were moved to revolve around the actual rendered
// globe — see SAT_ORBIT_* / SatelliteEvolution below). Offset chosen so
// the camera sits far enough back to keep the largest orbit (Mars,
// radius SAT_ORBIT_MARS_A=15) inside frame alongside Earth itself.
const CAMERA_SATELLITE: [number, number, number] = [
  EARTH_POS[0],
  EARTH_POS[1] + 10,
  EARTH_POS[2] + 34,
];

// ── Destination celestial bodies (Moon, Mars, Sun/L1) ───────────────────
// CHANGE REQUEST: destination planets/regions must already exist in the
// scene from the very start, positioned on either side of Earth at
// appropriate distances — never spawned only when their mission appears.
// Placed well outside the satellite-evolution orbit tracks (SAT_ORBIT_*
// below, all ≤15 units from EARTH_POS — those still show each mission's
// own orbital/transfer path around Earth, untouched) so the two visual
// layers never overlap: these are the actual faraway bodies the camera
// travels toward once a mission destined for them becomes active: Moon to
// one side of Earth, Mars to the other, and the Sun (standing in for the
// Sun-Earth L1 region) further out along a third axis.
const MOON_POS: [number, number, number] = [EARTH_POS[0] - 55, EARTH_POS[1] + 6, EARTH_POS[2] + 6];
const MARS_POS: [number, number, number] = [EARTH_POS[0] + 70, EARTH_POS[1] + 9, EARTH_POS[2] - 30];
const SUN_POS: [number, number, number] = [EARTH_POS[0], EARTH_POS[1] + 22, EARTH_POS[2] - 150];
const MOON_RADIUS = 3.2;
const MARS_RADIUS = 5.0;
const SUN_RADIUS = 18;

// Local-space equivalents of the three positions above, expressed
// relative to EARTH_POS rather than world space. SatelliteEvolution's
// own root group renders at position={EARTH_POS} (see SAT_ORBIT_* below),
// so anything drawn inside it — orbit lines, the active satellite, the
// tracking grid — has to target these LOCAL vectors, not MOON_POS/
// MARS_POS/SUN_POS themselves, to actually land on the real body's
// world-space position. This is the root fix for the reported bug
// ("other planets' satellites revolve around Earth"): every
// interplanetary orbit was previously drawn around this group's own
// local origin — Earth's position — instead of around the real distant
// body it was supposed to represent.
const MOON_LOCAL: [number, number, number] = [
  MOON_POS[0] - EARTH_POS[0],
  MOON_POS[1] - EARTH_POS[1],
  MOON_POS[2] - EARTH_POS[2],
];
const MARS_LOCAL: [number, number, number] = [
  MARS_POS[0] - EARTH_POS[0],
  MARS_POS[1] - EARTH_POS[1],
  MARS_POS[2] - EARTH_POS[2],
];
const SUN_LOCAL: [number, number, number] = [
  SUN_POS[0] - EARTH_POS[0],
  SUN_POS[1] - EARTH_POS[1],
  SUN_POS[2] - EARTH_POS[2],
];

// Fixed camera-to-satellite offset used once the camera is actively
// tracking a destination-orbit satellite (see CameraController's p>=1.0
// branch below) -- NOT an offset from the body itself anymore.
//
// Bug fix (user follow-up: "still couldn't see the satellite on other
// planets"): the camera previously looked at the STATIC body position
// (MOON_POS/MARS_POS/SUN_POS) the entire time a mission was active, never
// the satellite itself. Since the satellite sweeps a full orbit (radius
// up to SAT_ORBIT_MARS_A=11 / SAT_ORBIT_L1_R=24) around that body while
// the camera held a fixed framing on the body's center, the satellite
// spent much of each scroll pass outside the frustum entirely -- a much
// bigger visibility problem than raw size. The camera now tracks the
// satellite's actual computed world position every frame (see
// getOrbitLocalPosition below) and orbits it can never lose, with these
// offsets kept small so the tracked satellite reads at a good size too.
// Tightened from [7,3,10]/[10,5,13]/[11,5,25] — those were sized to
// frame the whole planet from the old static body-centered view. Now
// that the camera tracks the SATELLITE itself (see
// getSatelliteLocalOffset/getActiveSatelliteSweepT below), a smaller
// offset keeps the spacecraft the dominant subject in frame rather than
// a speck near a huge planet.
// CHANGE: camera for Moon/Mars/Sun missions is now FIXED relative to
// the body's own stationary world position — mirroring exactly how
// CAMERA_SATELLITE is a fixed offset from EARTH_POS for leo/geo below,
// rather than tracking the satellite's live orbital position every
// frame.
//
// Bug fix ("satellites not found on their own planet"): a fixed camera
// has to be far enough back that the satellite's FULL orbit stays
// inside the frustum at every point along it, not just close enough to
// see the planet. The first pass here only checked the vertical FOV
// (50°) against each orbit's rough extent, but a PerspectiveCamera's
// horizontal FOV is narrower than its vertical FOV on any
// portrait/narrow-aspect viewport (phones especially) — 
// halfWidthVisible = distance * aspect * tan(verticalFOV/2). At the
// previous, tighter distances that horizontal half-width fell short of
// the orbit's true extent on a phone-shaped canvas (aspect ≈ 0.5),
// clipping the satellite out of frame horizontally for a large part of
// every orbit even though it stayed within the vertical bounds. Each
// offset below is now sized so `distance * 0.5 * tan(25°)` clears
// that orbit's true maximum distance from its body's center, with a
// ~20% safety margin on top:
//   Moon: orbit bounding radius ≈7.5 (ellipse a=6, inclined 28°)  -> needs d≈38
//   Mars: orbit bounding radius ≈13 (ellipse a=11, inclined 12°) -> needs d≈67
//   Sun:  orbit is a true circle, radius = SAT_ORBIT_L1_R = 24     -> needs d≈124
// Direction kept the same as before (mostly +y/+z, staying on the same
// audience-facing side of the body that CAMERA_SATELLITE uses against
// Earth), just scaled out to these larger distances.
const MOON_CAM_OFFSET: [number, number, number] = [0, 11, 37];
const MARS_CAM_OFFSET: [number, number, number] = [0, 19, 64];
const SUN_CAM_OFFSET: [number, number, number] = [0, 35, 118];

// How far (world units) the camera must still be from its current target
// before CameraController's useFrame switches from the gentle 0.03
// per-frame lerp rate to the fast 0.12 catch-up rate — see the "camera
// transition ... rolls out twice as long" bug-fix comment at the bottom
// of CameraController below for the full rationale. Ordinary within-
// phase camera moves (e.g. CAMERA_START->CAMERA_EARTH_APPROACH, ~26
// units, closed gradually as p increases every frame) stay under this
// threshold almost immediately; only the large discrete jumps to/from a
// destination body (Moon/Mars/Sun, 40-190+ units from CAMERA_SATELLITE)
// spend many consecutive frames above it.
const DESTINATION_LERP_DISTANCE_THRESHOLD = 20;

/**
 * Which mission (by orbitType) is currently active, purely as a function
 * of scroll progress — mirrors the same activeSatellite/orbitType
 * derivation SatelliteEvolution already performs (kept in sync manually;
 * see that component below), so the persistent destination bodies and the
 * camera agree with the satellite-evolution scene about which mission is
 * "current" without threading new props through the render tree. Returns
 * null before the satellite-evolution phase begins (p ≤ 0.96), matching
 * SatelliteEvolution's own visibility threshold.
 */
function getActiveMissionOrbitType(p: number): string | null {
  if (p <= 0.96) return null;
  const evolutionProgress = Math.max(0, p - 1.0);
  const satelliteIndex = Math.min(
    Math.floor(evolutionProgress / SATELLITE_TRANSITION_BAND),
    JOURNEY_SATELLITES.length - 1
  );
  const activeSatellite = JOURNEY_SATELLITES[Math.max(0, satelliteIndex)];
  return activeSatellite?.orbitType || "leo";
}

// ── Progress helpers ────────────────────────────────────────────────────
function remapped(t: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (t - min) / (max - min)));
}

function lerpV3(
  out: THREE.Vector3,
  a: [number, number, number],
  b: [number, number, number],
  t: number
) {
  out.set(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  );
}

/**
 * Soft circular alpha-mask sprite, shared by LaunchSmoke and
 * TransformationParticles below. Bug fix: both previously used a plain
 * <pointsMaterial> with no map/alphaMap — Three.js renders points with no
 * texture as hard-edged squares, which is exactly the "square particle"
 * artifact the ISRO-site bug report calls out (visible during ignition
 * smoke and satellite-transformation bursts). A tiny radial-gradient
 * canvas texture used as both map and alphaMap makes each point render as
 * a soft circular dot instead.
 */
function createSoftDotTexture(): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Main persistent 3D scene — never unmounts during the journey. */
export function JourneyScene() {
  const { progressRef, started, detailsOpen, reducedMotion, performanceMode, progress, freeView } = useJourney();

  // ── Free 3D View Movement target ────────────────────────────────────────────
  // While Free 3D View Movement is active during the satellite-evolution
  // phase (progress >= 1.0), OrbitControls below orbits around whichever
  // body the currently active mission actually belongs to — Earth itself
  // for leo/geo, or the real Moon/Mars/Sun for lunar/mars/l1 — computed
  // with the same getActiveMissionOrbitType() helper CameraController and
  // DestinationBodies already use, so it always centers on the same
  // subject the scripted camera would otherwise be framing.
  const inFreeView = freeView && started && !detailsOpen && progress >= 1.0;
  const freeViewOrbitType = inFreeView ? getActiveMissionOrbitType(progress) : null;
  const freeViewTarget: [number, number, number] =
    freeViewOrbitType === "lunar"
      ? MOON_POS
      : freeViewOrbitType === "mars"
        ? MARS_POS
        : freeViewOrbitType === "l1"
          ? SUN_POS
          : EARTH_POS;

  // Perf fix (Phase 2): Adaptive Device Pixel Ratio — cap the upper bound
  // by performanceMode so low/medium-tier devices pay fewer fragment-shader
  // cycles per frame. Never render at the device's unrestricted DPR on
  // mobile; DPR 3 renders roughly nine times the pixels of DPR 1.
  //   Low:    [1, 1.25]  — minimal pixel overhead
  //   Medium: [1, 1.5]   — balanced crispness / performance
  //   High:   [1, 2]     — full crispness, already a sensible ceiling for
  //                        a scroll-driven background scene
  // powerPreference is always "high-performance" — this flag only affects
  // GPU driver selection, not pixel cost, and high-performance GPUs handle
  // the workload either way; the real savings come from the DPR cap and the
  // antialias toggle below.
  const canvasDpr: [number, number] =
    !PERFORMANCE_FLAGS.adaptiveDpr
      ? [1, 2]
      : performanceMode === "high"
        ? [1, 2]
        : performanceMode === "medium"
          ? [1, 1.5]
          : [1, 1.25];

  return (
    <Canvas
      camera={{ position: CAMERA_START, fov: 50, near: 0.1, far: 500 }}
      dpr={canvasDpr}
      gl={{
        antialias: !PERFORMANCE_FLAGS.adaptiveDpr || performanceMode !== "low",
        // alpha:false — the scene always draws an explicit opaque <color>
        // background below, so a transparent GL context buys nothing and
        // only adds a compositing edge case (a possible source of a
        // flashed/blank frame on context init or restore).
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: detailsOpen ? "none" : "auto",
      }}
    >
      <color attach="background" args={[COLORS.space]} />
      <fog attach="fog" args={[COLORS.space, 10, 300]} />

      <Suspense fallback={null}>
        {/* Persistent space backdrop */}
        <SpaceEnvironment performanceMode={performanceMode} reduceDensity={!started} />

        {/* Earth — positioned in orbit */}
        <group position={EARTH_POS} scale={EARTH_SCALE}>
          <Earth
            performanceMode={performanceMode}
            reducedMotion={reducedMotion}
            progressRef={progressRef}
          />
        </group>

        {/* Destination celestial bodies — Moon, Mars, Sun (Sun-Earth L1);
            persistent from the very start of the journey, dimmed until
            their own mission becomes active. See DestinationBodies. */}
        <DestinationBodies progressRef={progressRef} reducedMotion={reducedMotion} performanceMode={performanceMode} />

        {/* Hero composition — Gaganyaan orbiting Earth, shown only before the journey starts */}
        <group position={EARTH_POS}>
          <HeroOrbit visible={!started && !detailsOpen} reducedMotion={reducedMotion} />
        </group>

        {/* Scroll-driven camera controller */}
        <CameraController
          progressRef={progressRef}
          started={started}
          detailsOpen={detailsOpen}
          reducedMotion={reducedMotion}
          freeView={inFreeView}
        />

        {/* Rocket + launch sequence */}
        <RocketLaunch
          position={LAUNCH_SITE}
          groundY={ROCKET_GROUND_Y}
          progressRef={progressRef}
        />

        {/* Mission-accurate satellite evolution & trajectories */}
        <SatelliteEvolution
          progressRef={progressRef}
          detailsOpen={detailsOpen}
          reducedMotion={reducedMotion}
        />

        {/* Lights — combined with SpaceEnvironment's own lights below.
            Bug fix: satellites (real GLB models with dark/rough PBR
            materials) were rendering as near-black silhouettes whenever
          their shadow side faced the camera — the previous total
          illumination (this ambient 0.15 + directional 0.3, plus
          SpaceEnvironment's ambient 0.25 + key 0.6 + a very weak 0.15
          fill) left the unlit side of any spacecraft essentially black.
          Raising this ambient/fill (which affects every surface
          regardless of angle, unlike the directional key light) keeps
          shadow-side detail visible without washing out the lit side. */}
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 10, 10]} intensity={0.4} />
      </Suspense>

      {/* Bug fix / feature (Free 3D View Movement): this previously only
          ever allowed rotate-only orbiting before the journey starts or
          while the satellite-details panel is open (the hero-composition
          free-look), with a fixed default target ([0,0,0]) and zoom/pan
          always off. Extended to double as the Free 3D View Movement
          control surface during the satellite-evolution phase: when
          inFreeView is true, zoom is enabled and the target follows
          freeViewTarget (the real Earth/Moon/Mars/Sun position the active
          mission belongs to, computed above) instead of the origin, so
          the user can freely orbit and zoom around the current body + its
          satellite. A single OrbitControls instance is reused for both
          purposes rather than mounting a second one, since two
          simultaneous OrbitControls on the same camera/dom element would
          fight each other. Panning stays off in both cases — this is a
          look-around control, not a way to drift the camera off the
          journey's subject. */}
      {!reducedMotion && (
        <OrbitControls
          target={inFreeView ? freeViewTarget : [0, 0, 0]}
          enableZoom={inFreeView}
          enablePan={false}
          enableRotate={!started || detailsOpen || inFreeView}
        />
      )}
    </Canvas>
  );
}

// ── Hero orbit constants (pre-journey composition) ──────────────────────
// Orbit radius (8.8) keeps the satellite well outside Earth's radius
// (6.371) so the ring/satellite never intersect the globe.
// Inclination lowered to 42° so the satellite's peak Y stays well
// below the navbar safe-zone (critical on desktop and mobile).
const HERO_ORBIT_RADIUS = 8.8;
const HERO_ORBIT_INCLINATION = 42; // degrees — lower peak, stays below navbar
const HERO_ORBIT_SPEED = 0.06; // rad/sec — slow, cinematic, not a distracting spin

/**
 * Pre-journey hero composition: Gaganyaan orbiting Earth on a matching
 * orbital ring, shown behind the Hero/Loading overlays before the user
 * clicks "WITNESS THE JOURNEY".
 *
 * Positioning is camera-FOV-relative rather than fixed pixel coordinates:
 * the satellite's vertical excursion (±~7.8 world units around Earth's
 * center) stays well inside the vertical frustum at the hero camera
 * distance, so it can never reach the navbar — and because a
 * PerspectiveCamera's fov is a *vertical* angle, that safety margin is
 * identical at any viewport aspect ratio (mobile just narrows the
 * horizontal frustum, not the vertical one). The ring/satellite use
 * real depth-tested 3D geometry, so Three.js automatically occludes the
 * satellite correctly when it swings behind Earth — no manual
 * visibility toggling needed to avoid it "floating" in front of Earth
 * unintentionally.
 */
function HeroOrbit({
  visible,
  reducedMotion,
}: {
  visible: boolean;
  reducedMotion: boolean;
}) {
  const satRef = useRef<THREE.Group>(null!);
  const thetaRef = useRef(2.1); // start upper-left on the ring

  // Compute the starting position up front so the satellite never renders
  // at the group origin (Earth's center) for a stray first frame.
  // Uses the constant initial theta value (2.1) rather than thetaRef.current
  // to keep useMemo pure — the ref is only mutated in useFrame after render.
  const initialPos = useMemo((): [number, number, number] => {
    const incRad = (HERO_ORBIT_INCLINATION * Math.PI) / 180;
    const theta = 2.1;
    const zBase = Math.sin(theta) * HERO_ORBIT_RADIUS;
    return [
      Math.cos(theta) * HERO_ORBIT_RADIUS,
      zBase * Math.sin(incRad),
      zBase * Math.cos(incRad),
    ];
  }, []);

  useFrame((_, delta) => {
    if (!satRef.current) return;
    satRef.current.visible = visible;
    if (!visible) return;

    if (!reducedMotion) {
      thetaRef.current += delta * HERO_ORBIT_SPEED;
    }
    const incRad = (HERO_ORBIT_INCLINATION * Math.PI) / 180;
    const zBase = Math.sin(thetaRef.current) * HERO_ORBIT_RADIUS;
    const x = Math.cos(thetaRef.current) * HERO_ORBIT_RADIUS;
    const y = zBase * Math.sin(incRad);
    const z = zBase * Math.cos(incRad);
    satRef.current.position.set(x, y, z);
  });

  return (
    <group visible={visible}>
      <OrbitLine
        radius={HERO_ORBIT_RADIUS}
        inclination={HERO_ORBIT_INCLINATION}
        color={0x38bdf8}
      />
      <group ref={satRef} position={initialPos}>
        <SatelliteModel satelliteId="gaganyaan" scale={0.65} interactive={false} />
      </group>
    </group>
  );
}

/**
 * Persistent destination celestial bodies — the Moon, Mars, and the Sun
 * (standing in for the Sun-Earth L1 region) exist in the scene from the
 * very start, per explicit requirement: destination planets must never
 * be spawned only when their mission appears. Each sits stationary at a
 * fixed world position (MOON_POS/MARS_POS/SUN_POS above) and stays
 * dimmed (see CelestialBody.tsx) until its own mission's satellite
 * becomes the active one — at which point it brightens. They never move
 * themselves; only the camera travels toward whichever one is currently
 * relevant (see CameraController's destination-travel branch above).
 * While one is the active focus, the other two simply remain as they
 * were — nothing here ever repositions or animates them beyond their own
 * slow idle spin.
 */
function DestinationBodies({
  progressRef,
  reducedMotion,
  performanceMode,
}: {
  progressRef: { current: number };
  reducedMotion: boolean;
  performanceMode: PerformanceMode;
}) {
  // eslint-disable-next-line react-hooks/refs -- same established pattern as SatelliteEvolution below: derive render-time props from scroll progress
  const orbitType = getActiveMissionOrbitType(progressRef.current);

  // Perf fix (Phase 5 — adaptive texture variants, behind
  // PERFORMANCE_FLAGS.adaptiveTextures): resolved once per performanceMode
  // change, not per-frame. CelestialBody retries fallbackTexturePath (the
  // ORIGINAL file) if the adaptive variant 404s — see lib/textures.ts and
  // CelestialBody.tsx's own loader comment.
  const moonTexturePath = useMemo(() => getAdaptiveTexturePath("moon", performanceMode), [performanceMode]);
  const marsTexturePath = useMemo(() => getAdaptiveTexturePath("mars", performanceMode), [performanceMode]);
  const sunTexturePath = useMemo(() => getAdaptiveTexturePath("sun", performanceMode), [performanceMode]);

  return (
    <group>
      <group position={MOON_POS}>
        <CelestialBody
          texturePath={moonTexturePath}
          fallbackTexturePath={getOriginalTexturePath("moon")}
          radius={MOON_RADIUS}
          active={orbitType === "lunar"}
          color={0xd1d5db}
          // Bug fix ("over rotation of planets"): was 0.015 rad/s — ~37x
          // Earth's own idle rate (Earth.tsx's earthSpeed=0.0004). Since
          // the camera holds a completely FIXED shot on the Moon for the
          // entire lunar mission's scroll segment (see CameraController's
          // lunar/mars/l1 destination branch), any dwell time at that rate
          // read as the Moon visibly spinning fast in place, breaking the
          // otherwise-static establishing shot. Brought down to the same
          // order of magnitude as Earth's rate instead.
          idleSpinSpeed={0.0006}
          reducedMotion={reducedMotion}
          performanceMode={performanceMode}
          bodyType="moon"
        />
      </group>
      <group position={MARS_POS}>
        <CelestialBody
          texturePath={marsTexturePath}
          fallbackTexturePath={getOriginalTexturePath("mars")}
          radius={MARS_RADIUS}
          active={orbitType === "mars"}
          color={0xc2410c}
          // Bug fix ("over rotation of planets") — same rationale as the
          // Moon above; was 0.012 rad/s (~30x Earth's own idle rate).
          idleSpinSpeed={0.0005}
          reducedMotion={reducedMotion}
          performanceMode={performanceMode}
          bodyType="mars"
        />
      </group>
      <group position={SUN_POS}>
        <CelestialBody
          texturePath={sunTexturePath}
          fallbackTexturePath={getOriginalTexturePath("sun")}
          radius={SUN_RADIUS}
          active={orbitType === "l1"}
          emissive
          color={0xfff2cc}
          // Bug fix ("over rotation of planets") — same rationale as the
          // Moon above; was 0.01 rad/s (~25x Earth's own idle rate).
          idleSpinSpeed={0.0004}
          reducedMotion={reducedMotion}
          performanceMode={performanceMode}
          bodyType="sun"
        />
      </group>
    </group>
  );
}

// ── Satellite-evolution orbit constants ────────────────────────────────────────────
// CHANGE REQUEST: satellites should visibly revolve AROUND the rendered
// Earth (and be occluded behind it when their path swings out of view),
// not orbit an empty point at the world origin far from the globe.
// Previously every radius here (2.2–5.8) was SMALLER than
// EARTH_RADIUS_WORLD (6.371), and — worse — the whole SatelliteEvolution
// group rendered with no position offset at all, i.e. centered on the
// world origin, nowhere near EARTH_POS ([0,-3,-14]) where the actual
// Earth mesh lives. So satellites never orbited the globe at all; they
// orbited empty space near the camera, with Earth sitting, unrelated, far
// in the background.
// Fix: SatelliteEvolution's root group now renders at position={EARTH_POS}
// (same anchor Earth's own group uses), and every orbit radius below is
// enlarged well past EARTH_RADIUS_WORLD with a comfortable clearance
// margin (verified: each orbit's closest approach to the shared center
// stays several units outside Earth's surface — see per-type minimum-
// distance math in OrbitingSatellite below) so a satellite's path can
// never clip through the globe. Because both groups share the same
// EARTH_POS anchor and Earth's sphere is an ordinary opaque, depth-tested
// mesh, Three.js's standard depth buffer does the rest automatically:
// a satellite whose orbit swings behind the globe from the camera's
// current angle is correctly hidden behind it, with no manual
// visibility/occlusion logic needed.
const SAT_ORBIT_LEO_R = 8.6;
const SAT_ORBIT_GEO_R = 10.8;
// Lunar/Mars trajectories are drawn as eccentric ellipses (see the
// <OrbitLine eccentricity={...}> calls below), and OrbitLine derives its
// REAL minor-axis internally as `radius * sqrt(1 - eccentricity^2)` --
// not from a separately-guessed constant. A previous pass set these two
// constants (radius/"a") assuming a near-circular ~1.4x-body-radius
// clearance without accounting for eccentricity shrinking the minor axis,
// which left the ring's true closest approach INSIDE the planet's own
// radius for Mars (a=7, e=0.78 -> minor axis 4.38, less than
// MARS_RADIUS=5.0) -- the ring was clipping through the opaque sphere at
// that point and effectively disappearing, exactly matching the reported
// "orbital line not in the correct position" bug. LUNAR_ECC/MARS_ECC are
// now named constants (shared with the <OrbitLine> JSX and the satellite
// position math below, instead of duplicated magic numbers), and "a" is
// sized so the ellipse's REAL minor axis clears its planet with the same
// ~1.35x-radius margin LEO/GEO already use against Earth.
const LUNAR_ECC = 0.65;
const MARS_ECC = 0.78;
// Inclinations shared between the drawn <OrbitLine> ring and the
// satellite's own flight-path math below (OrbitingSatellite) —
// previously each used a different, uncoordinated formula for the
// tilt/wobble, so the satellite never actually traced the visible ring
// it was supposed to be flying along. Single source of truth now.
const LUNAR_INCLINATION = 28;
const MARS_INCLINATION = 12;
// Inclination for the Sun-Earth L1 halo orbit visualization — matched
// between the OrbitLine ring and the OrbitingSatellite/getSatelliteLocalOffset
// math (same single-source-of-truth pattern as LUNAR/MARS_INCLINATION above).
// An inclined circle is a reasonable simplified representation of an L1 halo
// orbit; the critical requirement is that the drawn orbit line and the
// spacecraft position use the SAME formula, so the satellite visibly traces
// the ring it's supposed to be flying along.
const L1_INCLINATION = 45;
function ellipseMinorAxis(a: number, e: number): number {
  return a * Math.sqrt(1 - Math.min(0.9, e * e));
}
const SAT_ORBIT_LUNAR_A = 6; // minor axis = 6*sqrt(1-0.65^2) ≈ 4.56 (≈1.43x MOON_RADIUS)
const SAT_ORBIT_LUNAR_B = ellipseMinorAxis(SAT_ORBIT_LUNAR_A, LUNAR_ECC);
const SAT_ORBIT_MARS_A = 11; // minor axis = 11*sqrt(1-0.78^2) ≈ 6.88 (≈1.38x MARS_RADIUS)
const SAT_ORBIT_MARS_B = ellipseMinorAxis(SAT_ORBIT_MARS_A, MARS_ECC);
// Bug fix: this was 12.5 — SMALLER than SUN_RADIUS (18) — so once this
// orbit is re-centered on the real Sun body (see destCenter in
// SatelliteEvolution below) the l1 satellite's path sat entirely inside
// the Sun's own sphere, embedded/invisible rather than visibly orbiting
// it. Sized to clear the Sun's surface with margin, matching the same
// clearance pattern SAT_ORBIT_LEO_R/GEO_R already use against
// EARTH_RADIUS_WORLD.
const SAT_ORBIT_L1_R = SUN_RADIUS + 6;
// Bug fix / feature (user follow-up: "satellite size is too small" +
// "couldn't see the satellite on other planets"): now that
// SatelliteModel.tsx's scale-prop-discarding bug is fixed (see that
// file's changelog comment) and every GLB is normalized to a shared
// NORMALIZED_MODEL_SIZE (2.2 world units), this constant is a genuine,
// working multiplier. 0.65 (raised from 0.22 in an earlier session) was
// still reading as too small once satellites are actually visible next
// to Moon/Mars/Sun (radius 3.2/5.0/18) instead of lost off-camera.
// Raised again to 1.3 (final on-screen size ~2.86 world units) so the
// spacecraft reads clearly as the foreground subject once the camera is
// framed tight on it (see MOON_CAM_OFFSET/MARS_CAM_OFFSET/SUN_CAM_OFFSET
// above), rather than a speck dwarfed by the destination body.
const SAT_MODEL_SCALE = 1.3;
// Bug fix / feature (user request: Aditya-L1 reads far too small against
// the Sun — SUN_RADIUS=18 dwarfs the shared 1.3 baseline that was tuned
// against the much smaller Moon/Mars/leo/geo subjects). Per-orbitType
// override on top of SAT_MODEL_SCALE, keyed by orbitType rather than
// satelliteId since "l1" only ever belongs to one mission in
// JOURNEY_SATELLITES (Aditya-L1) — every other mission/orbitType falls
// through to the shared baseline below, untouched.
const SAT_MODEL_SCALE_OVERRIDES: Partial<Record<string, number>> = {
  l1: 2.6, // 2x the 1.3 baseline
};

/**
 * Scroll-driven camera animation.
 * Smoothly moves the camera through defined waypoints based on journey progress.
 */
function CameraController({
  progressRef,
  started,
  detailsOpen,
  reducedMotion,
  freeView,
}: {
  progressRef: { current: number };
  started: boolean;
  detailsOpen: boolean;
  reducedMotion: boolean;
  /** True while Free 3D View Movement is active (see JourneyScene's inFreeView). */
  freeView: boolean;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...CAMERA_START));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!started || detailsOpen) return;
    // Feature (Free 3D View Movement): while active, OrbitControls
    // (rendered in JourneyScene) owns the camera entirely — skip this
    // controller's own scripted position/look-at updates so it doesn't
    // fight the user's drag/zoom every frame. The automatic idle-spin on
    // each body (CelestialBody's idleSpinSpeed) and the satellite's own
    // scroll-driven orbital motion (OrbitingSatellite) are untouched by
    // this and keep running underneath the free-look camera exactly as
    // before.
    if (freeView) return;

    const p = progressRef.current;

    if (p < 0.10) {
      const t = remapped(p, 0, 0.10);
      lerpV3(targetPos.current, CAMERA_START, CAMERA_EARTH_APPROACH, t);
      lookTarget.current.set(0, -3, -14);
    } else if (p < 0.20) {
      const t = remapped(p, 0.10, 0.20);
      lerpV3(targetPos.current, CAMERA_EARTH_APPROACH, CAMERA_TOP_APPROACH, t);
      lookTarget.current.set(
        lerp(0, GLOBE_TOP[0], t),
        lerp(-3, GLOBE_TOP[1], t),
        lerp(-14, GLOBE_TOP[2], t)
      );
    } else if (p < 0.30) {
      const t = remapped(p, 0.20, 0.30);
      lerpV3(targetPos.current, CAMERA_TOP_APPROACH, CAMERA_IGNITION, t);
      if (!reducedMotion) {
        const shake = Math.sin(t * 80) * 0.04 * (1 - t);
        targetPos.current.x += shake;
        targetPos.current.y += shake * 0.5;
      }
      lookTarget.current.set(GLOBE_TOP[0], ROCKET_GROUND_Y + 2, GLOBE_TOP[2]);
    } else if (p < 0.45) {
      const t = remapped(p, 0.30, 0.45);
      lerpV3(targetPos.current, CAMERA_IGNITION, CAMERA_LAUNCH_FOLLOW, t);
      // Bug fix: this previously started the lerp flat at ROCKET_GROUND_Y,
      // but the IGNITION phase just above ends its look-at target at
      // ROCKET_GROUND_Y + 2 (aimed slightly above the pad so the flame/base
      // reads with depth), so the target snapped down 2 units the instant
      // this phase began. Starting from that same +2 value and lerping to
      // ROCKET_END_Y keeps the 0.30 hand-off continuous.
      const rocketY = lerp(ROCKET_GROUND_Y + 2, ROCKET_END_Y, t);
      lookTarget.current.set(GLOBE_TOP[0], rocketY, GLOBE_TOP[2]);
    } else if (p < 0.60) {
      const t = remapped(p, 0.45, 0.60);
      lerpV3(targetPos.current, CAMERA_LAUNCH_FOLLOW, CAMERA_ATMOSPHERE, t);
      // Bug fix: this end value was hardcoded to -38, but the rocket's
      // actual world z at the end of this phase (see RocketLaunch's own
      // `atmos` lerp below: position[2] → position[2] - 30, i.e.
      // LAUNCH_SITE[2] - 30) is -44. The very next phase (p >= 0.60,
      // SPACE/STAGE_SEP below) already correctly targets LAUNCH_SITE[2] - 30
      // as a constant, so the look-at target snapped 6 units in z right at
      // the 0.60 boundary — the "discrete" jump between launch/atmosphere
      // and stage separation. Ending this lerp at the same LAUNCH_SITE[2] -
      // 30 value the next phase already uses makes the hand-off continuous.
      lookTarget.current.set(
        GLOBE_TOP[0],
        lerp(ROCKET_END_Y, ROCKET_END_Y + 20, t),
        lerp(GLOBE_TOP[2], LAUNCH_SITE[2] - 30, t)
      );
    } else if (p < 0.80) {
      const t = remapped(p, 0.60, 0.80);
      lerpV3(targetPos.current, CAMERA_ATMOSPHERE, CAMERA_SPACE, t);
      // Bug fix: this previously snapped lookTarget to a fixed point,
      // (0, 0, -20), completely disconnected from where the rocket
      // actually is. RocketLaunch's own useFrame moves the rocket group
      // to (position[0], ROCKET_END_Y + 20, position[2] - 30) as soon as
      // the atmosphere phase (p > 0.45) reaches its end at p = 0.60, and
      // holds it there for the rest of this "space" phase (0.60–0.80) —
      // see the `atmos` lerp clamped at t=1 in RocketLaunch below. So for
      // this entire phase the camera was staring at empty space (0,0,-20)
      // while the actual rocket sat far off at roughly (0, 35, -38),
      // outside the frustum — reading as a black/dead section since
      // nothing but faint background starfield was ever in view. Aiming
      // at the rocket's actual (now-static) resting position keeps it in
      // frame continuously through this phase instead of losing it.
      lookTarget.current.set(
        LAUNCH_SITE[0],
        ROCKET_END_Y + 20,
        LAUNCH_SITE[2] - 30
      );
    } else if (p < 1.0) {
      const t = remapped(p, 0.80, 1.0);
      lerpV3(targetPos.current, CAMERA_SPACE, CAMERA_SATELLITE, t);
      // Bug fix: this previously snapped lookTarget straight to (0,0,0)
      // the instant this phase began (t=0), with no lerp at all — while
      // the STAGE_SEP phase just above holds the look-at target fixed at
      // the rocket's actual resting point (LAUNCH_SITE[0], ROCKET_END_Y +
      // 20, LAUNCH_SITE[2] - 30) ≈ (0, 43.4, -44) for the whole 0.60-0.80
      // range. Satellite evolution orbits are centered on the world
      // origin (SatelliteEvolution/OrbitingSatellite render unpositioned,
      // i.e. at (0,0,0)), so (0,0,0) is the correct END point here — but
      // jumping to it immediately produced the same kind of discrete cut
      // already fixed at the 0.60 boundary above, here ~43-44 world units
      // in y/z: the camera would still be looking at the rocket's resting
      // point one frame, then instantly at empty space near the satellite
      // orbit center the next, before the satellite itself was even in
      // frame — reading as the satellite scene suddenly appearing already
      // mid-orbit once it faded in, instead of the camera settling onto it.
      // Lerping from that same resting point down to EARTH_POS across
      // this phase (ending exactly there by t=1, matching the satellite-
      // evolution phase below — satellite orbits are now anchored on
      // EARTH_POS rather than the world origin, see SAT_ORBIT_* above)
      // makes the hand-off continuous.
      lookTarget.current.set(
        lerp(LAUNCH_SITE[0], EARTH_POS[0], t),
        lerp(ROCKET_END_Y + 20, EARTH_POS[1], t),
        lerp(LAUNCH_SITE[2] - 30, EARTH_POS[2], t)
      );
    } else {
      // CHANGE REQUEST: when the currently active satellite belongs to a
      // destination beyond Earth orbit (Moon/Mars/Sun-L1), smoothly move
      // the camera away from Earth toward that destination instead of
      // holding the same Earth-centered CAMERA_SATELLITE view for every
      // mission. Missions that stay in Earth orbit (leo/geo) keep the
      // existing Earth-focused framing untouched. Reusing the same
      // continuous camera.position.lerp() below (already used for every
      // other phase transition in this controller) is what makes this
      // travel gradual and cinematic rather than an instant cut — as the
      // active mission changes, only the lerp's target changes; the
      // interpolation itself is unchanged, so the journey from Earth to
      // (say) Mars, and back again on scroll-up, is always eased.
      const orbitType = getActiveMissionOrbitType(p);
      if (orbitType === "lunar" || orbitType === "mars" || orbitType === "l1") {
        // CHANGE: camera now holds a FIXED position/look-at on the
        // destination body itself — exactly the same pattern the leo/geo
        // branch below already uses (a constant offset from EARTH_POS,
        // looking at EARTH_POS, never chasing the satellite's live orbit
        // position). Previously this recomputed the satellite's moving
        // world position every frame and followed it, which meant the
        // camera itself panned/tracked during each mission instead of
        // holding a stable establishing shot the way the Earth missions
        // do. MOON_POS/MARS_POS/SUN_POS are the bodies' own constant
        // world positions (see DestinationBodies above — they never
        // move), so this framing is now just as static as CAMERA_SATELLITE
        // is against EARTH_POS.
        const bodyPos =
          orbitType === "lunar" ? MOON_POS : orbitType === "mars" ? MARS_POS : SUN_POS;
        const camOffset =
          orbitType === "lunar" ? MOON_CAM_OFFSET : orbitType === "mars" ? MARS_CAM_OFFSET : SUN_CAM_OFFSET;
        targetPos.current.set(
          bodyPos[0] + camOffset[0],
          bodyPos[1] + camOffset[1],
          bodyPos[2] + camOffset[2]
        );
        lookTarget.current.set(bodyPos[0], bodyPos[1], bodyPos[2]);
      } else {
        // leo / geo — mission stays in Earth orbit, camera stays put.
        targetPos.current.set(...CAMERA_SATELLITE);
        lookTarget.current.set(...EARTH_POS);
      }
    }

    // Bug fix ("satellite is in free space, not at the planet" — seen
    // even after the faster 0.08 catch-up rate above): a straight-line
    // position LERP between two very distant fixed points (Earth's
    // CAMERA_SATELLITE vs Moon/Mars/Sun's own vantage, 40–190+ world
    // units apart) still passes through intermediate frames where the
    // camera can be transiently very close to OTHER scene geometry along
    // that path (e.g. grazing distance from Mars while still easing
    // toward its final framing) — no fixed easing RATE fully eliminates
    // that, only reduces how long it lasts. Since lookAt already snaps
    // to the destination instantly every frame with no easing at all,
    // snapping the camera's POSITION the same way for these destination
    // missions removes the transit path (and the bad intermediate
    // frames on it) entirely — the camera is simply always exactly at
    // the verified-correct MOON/MARS/SUN_CAM_OFFSET distance the instant
    // a lunar/mars/l1 mission becomes active, with no possible frame
    // where it's still "on the way". LEO/GEO (which never leave the same
    // near-Earth vantage for the entire rocket-launch cinematic) keep
    // the smooth 0.03 easing — only the long cross-body jumps are cut.
    //
    // Bug fix ("camera transition between the Sun and Earth rolls out
    // twice as long", and the same underlying issue at Mars Orbiter
    // Mission -> AstroSat): an earlier version of this fast-vs-slow
    // decision tracked a one-frame "was the LAST frame a destination
    // shot" flag (prevMissionKindRef) instead of actual remaining
    // distance. That flag was written at the very bottom of THIS SAME
    // useFrame call, so by the very next frame it had already flipped
    // back to "earth" — the fast 0.12 rate only ever applied for the
    // single frame the mission label changed, and the entire multi-
    // hundred-frame return leg from the Sun (SUN_CAM_OFFSET is ~170
    // units from CAMERA_SATELLITE) crawled back at the slow 0.03 rate
    // instead — roughly 4x longer than intended, reading as the
    // transition "taking twice as long" (and more) compared to shorter
    // destination legs like Moon/Mars. Driving the rate off the camera's
    // actual remaining distance to targetPos.current fixes this
    // symmetrically in both directions with no flag to expire early: the
    // fast rate stays active every single frame the camera is still far
    // from its target, for as many frames as that takes, and only eases
    // back to the gentle 0.03 rate once the camera has actually closed
    // most of the distance — whether it's arriving at a destination or
    // leaving one, and regardless of how many frames the leg takes.
    const distanceToTarget = camera.position.distanceTo(targetPos.current);
    const lerpRate = reducedMotion
      ? 0.1
      : distanceToTarget > DESTINATION_LERP_DISTANCE_THRESHOLD
        ? 0.12
        : 0.03;
    camera.position.lerp(targetPos.current, lerpRate);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

/**
 * Rocket launch sequence driven by scroll progress.
 */
function RocketLaunch({
  position,
  groundY,
  progressRef,
}: {
  position: [number, number, number];
  groundY: number;
  progressRef: { current: number };
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const flameRef = useRef<THREE.Mesh>(null!);
  const stage1Ref = useRef<THREE.Group>(null!);
  const stage2Ref = useRef<THREE.Group>(null!);
  const payloadRef = useRef<THREE.Group>(null!);
  const stowedPayloadRef = useRef<THREE.Group>(null!);
  const deployedPayloadRef = useRef<THREE.Group>(null!);
  const fairingLeftRef = useRef<THREE.Mesh>(null!);
  const fairingRightRef = useRef<THREE.Mesh>(null!);

  // Load the rocket texture pack — used solely for the fairing flag-decal
  // crop below (the rocket body renders from the real PSLV GLB model).
  //
  // BUG FIX (runtime crash): this previously used useLoader(), which
  // suspends until the load settles and re-throws into the nearest error
  // boundary on failure — /textures/rocketship_texturepack.jpg does not
  // exist anywhere in public/textures/ (it was never actually part of the
  // asset set, unlike the planet textures), so every mount of this
  // component threw and took down the whole 3D scene via ErrorBoundary.
  // This decal is purely decorative (the rocket body itself is the real
  // GLB model), so a missing file should degrade gracefully instead of
  // crashing — switched to the same non-throwing TextureLoader().load()
  // pattern already used elsewhere in this codebase for exactly this
  // reason (see CelestialBody.tsx, SpaceEnvironment.tsx's
  // StarfieldTexture): on failure it just leaves the texture null, and
  // the fairing meshes below fall back to their existing plain-white
  // material instead of a decal.
  const [rocketTexture, setRocketTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      LOCAL_ROCKET_TEXTURE,
      (tex) => {
        if (!cancelled) setRocketTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) setRocketTexture(null); // file missing — fairing renders plain white instead of crashing
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // The texture pack is a photo-reference sprite sheet (1024×1536) of the
  // full rocket assembly. It's now used solely for the fairing flag-decal
  // crop below — the rocket body itself renders from the real PSLV GLB
  // model via <RocketGLB>.
  //
  // IMPORTANT: a cone's UV apex is a single pinch point — every pixel
  // along the crop's top edge collapses into that one vertex. The first
  // crop used pixel rect [64,64]-[192,256], which put ~8px of the sprite
  // sheet's transparent-black background (the photo cutout's tip hadn't
  // started yet at y=64 — it starts around y=71) right at that pinch
  // point, producing a stray dark/fringed dot at the rendered cone's tip.
  // It also let black background bleed in along the sides, since the
  // photographed cone's silhouette is narrower than that bounding box for
  // most of its height.
  //
  // Fix: crop tight to pixel rect [85,195]-[185,256] instead — verified
  // (by direct pixel sampling) to stay fully inside the solid white
  // object at every edge across its whole height, so the apex pinches
  // into clean white rather than background, while still capturing the
  // flag decal + emblem band.
  const fairingTexture = useMemo(() => {
    if (!rocketTexture) return null;
    const t = rocketTexture.clone();
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.offset.set(0.083, 0.8333);
    t.repeat.set(0.0977, 0.0397);
    t.needsUpdate = true;
    return t;
  }, [rocketTexture]);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = progressRef.current;

    groupRef.current.visible = p > 0.08 && p < 0.98;

    // Bug fix ("continuous camera flow" — sudden object appear): this
    // group previously popped fully into view the instant p crossed 0.08
    // (and vanished just as abruptly past 0.98) via the hard `visible`
    // boolean above alone — a discrete, jarring appear/disappear with no
    // transition. Layering a short scale ramp (ROCKET_FADE_WINDOW wide)
    // at each edge turns that into a soft materialize/dematerialize
    // instead, without touching the visible-window boundaries themselves
    // (every other threshold in this function — flame, stage separation,
    // fairing, payload reveal — is untouched). Scaling the whole group
    // from a point is a lightweight stand-in for a true opacity fade,
    // which would require traversing and toggling transparency on every
    // material across the 89-mesh PSLV GLB (RocketGLB) plus the fairings/
    // payload meshes here.
    const ROCKET_FADE_WINDOW = 0.025;
    let fadeScale = 1;
    if (p < 0.08 + ROCKET_FADE_WINDOW) {
      fadeScale = remapped(p, 0.08, 0.08 + ROCKET_FADE_WINDOW);
    } else if (p > 0.98 - ROCKET_FADE_WINDOW) {
      fadeScale = 1 - remapped(p, 0.98 - ROCKET_FADE_WINDOW, 0.98);
    }
    groupRef.current.scale.setScalar(Math.max(0.001, fadeScale));

    if (groupRef.current.visible) {
      // Bug fix / feature: rocket now stays hidden INSIDE the Earth globe
      // (occluded by Earth's own opaque geometry, not a visibility flag)
      // from journey-start all the way through the T-05–T-01 countdown
      // stages, only rising during the final LIFTOFF stage's window
      // (ROCKET_RISE_START–COUNTDOWN_END). Previously this rose across the
      // ENTIRE COUNTDOWN_START–COUNTDOWN_END window with an ease-out curve,
      // which front-loads the motion — by the 4th of 6 stages the rocket
      // was already ~75% risen, well before LIFTOFF. Narrowing the actual
      // rise window to just the last stage keeps it hidden until liftoff
      // is imminent, matching the countdown UI.
      if (p < ROCKET_RISE_START) {
        groupRef.current.position.set(...ROCKET_INSIDE_POS);
      } else if (p < COUNTDOWN_END) {
        const riseT = remapped(p, ROCKET_RISE_START, COUNTDOWN_END);
        // Ease-out so the final emergence onto the pad feels deliberate
        // rather than linear/mechanical.
        const eased = 1 - Math.pow(1 - riseT, 2);
        groupRef.current.position.x = lerp(ROCKET_INSIDE_POS[0], LAUNCH_SITE[0], eased);
        groupRef.current.position.y = lerp(ROCKET_INSIDE_POS[1], LAUNCH_SITE[1], eased);
        groupRef.current.position.z = lerp(ROCKET_INSIDE_POS[2], LAUNCH_SITE[2], eased);
      } else {
        groupRef.current.position.set(...LAUNCH_SITE);
      }
      groupRef.current.rotation.z = 0;

      if (flameRef.current) {
        flameRef.current.visible = p > 0.18;
        const mat = flameRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          const ignition = remapped(p, 0.20, 0.30);
          mat.opacity = Math.min(1, ignition * 1.5);
        }
      }

      if (p > 0.30) {
        const launchProg = remapped(p, 0.30, 0.45);
        const yPos = lerp(groundY, ROCKET_END_Y, launchProg);
        groupRef.current.position.y = yPos;
        groupRef.current.rotation.z = lerp(0, -0.1, launchProg);
      }

      if (p > 0.45) {
        const atmos = remapped(p, 0.45, 0.60);
        groupRef.current.position.z = lerp(position[2], position[2] - 30, atmos);
        groupRef.current.position.y = lerp(ROCKET_END_Y, ROCKET_END_Y + 20, atmos);
        groupRef.current.rotation.z = lerp(-0.1, -0.05, atmos);
      }

      if (stage1Ref.current) {
        if (p > 0.70) {
          const sep = remapped(p, 0.70, 0.80);
          stage1Ref.current.position.y = -sep * 15;
          stage1Ref.current.position.x = -sep * 6;
          stage1Ref.current.rotation.z = sep * 0.6;
        } else {
          stage1Ref.current.position.set(0, 0, 0);
          stage1Ref.current.rotation.set(0, 0, 0);
        }
      }

      if (fairingLeftRef.current && fairingRightRef.current) {
        if (p > 0.75) {
          const fsep = remapped(p, 0.75, 0.85);
          fairingLeftRef.current.position.x = -fsep * 4;
          fairingLeftRef.current.rotation.z = fsep * 0.8;
          fairingRightRef.current.position.x = fsep * 4;
          fairingRightRef.current.rotation.z = -fsep * 0.8;
        } else {
          fairingLeftRef.current.position.set(0, 0, 0);
          fairingLeftRef.current.rotation.set(0, 0, 0);
          fairingRightRef.current.position.set(0, 0, 0);
          fairingRightRef.current.rotation.set(0, 0, 0);
        }
      }

      if (payloadRef.current) {
        // Fairing inner radius at the payload's mounting height (world Y=1.4,
        // fairing base r=0.42 @ world Y=0.9 tapering to 0 @ Y=2.7) is ≈0.30.
        // The fully deployed satellite's solar panels reach ≈0.39 at this
        // scale — wider than the fairing — so a compact stowed capsule
        // (real spacecraft launch with panels folded flat, never deployed)
        // is shown until fairing separation/reveal, then swapped for the
        // real deployed model exactly at the existing reveal threshold.
        const revealed = p > 0.80;
        if (stowedPayloadRef.current) stowedPayloadRef.current.visible = !revealed;
        if (deployedPayloadRef.current) {
          deployedPayloadRef.current.visible = revealed;
          if (revealed) {
            const pProg = remapped(p, 0.80, 0.98);
            deployedPayloadRef.current.rotation.y = pProg * Math.PI * 2;
            deployedPayloadRef.current.scale.setScalar(lerp(1, 1.2, pProg));
          } else {
            deployedPayloadRef.current.rotation.set(0, 0, 0);
            deployedPayloadRef.current.scale.setScalar(1);
          }
        }
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Smoke particle system */}
      <LaunchSmoke progressRef={progressRef} />

      {/* Real PSLV rocket GLB — boosters + core stages + engines + flame.
          The <RocketGLB> component loads /models/pslv_rocket.glb and
          distributes its 89 mesh nodes across stage1Ref (boosters + lower
          core, separates) and stage2Ref (upper stage, stays), plus renders
          the engine flame inside stage1 so it separates with the boosters. */}
      <Suspense fallback={null}>
        <RocketGLB
          stage1Ref={stage1Ref}
          stage2Ref={stage2Ref}
          flameRef={flameRef}
        />
      </Suspense>

      {/* Payload fairings — flag-decal nose-cone crop from the texture pack.
          fairingTexture is null if rocketship_texturepack.jpg failed to
          load (see the loader fix above) — meshStandardMaterial with
          map={undefined} just renders the plain white/metal base color
          instead of crashing. */}
      <mesh ref={fairingLeftRef} position={[0, 1.8, 0]}>
        <coneGeometry args={[0.42, 1.8, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial map={fairingTexture ?? undefined} color={0xffffff} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh ref={fairingRightRef} position={[0, 1.8, 0]}>
        <coneGeometry args={[0.42, 1.8, 16, 1, false, Math.PI, Math.PI]} />
        <meshStandardMaterial map={fairingTexture ?? undefined} color={0xffffff} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Payload — stowed (folded panels) while enclosed, swaps to the
          real deployed satellite model at fairing separation/reveal */}
      <group ref={payloadRef} position={[0, 1.4, 0]}>
        <group ref={stowedPayloadRef}>
          <StowedPayload />
        </group>
        <group ref={deployedPayloadRef} visible={false}>
          <SatelliteModel satelliteId="aryabhata" scale={0.4} interactive={false} />
        </group>
      </group>
    </group>
  );
}

/**
 * Compact stowed-configuration payload shown while enclosed inside the
 * closed fairing. Real spacecraft always launch with solar panels folded
 * flat against the body — never deployed inside the fairing — so this
 * keeps every surface within radius ≈0.17, comfortably inside the
 * fairing's ≈0.30 inner radius at the payload's mounting height (see the
 * comment at the reveal/visibility logic above for the full calculation).
 * It swaps for the real, fully-deployed SatelliteModel once the payload
 * is revealed after fairing separation.
 */
function StowedPayload() {
  const foldedPanelAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  return (
    <group>
      {/* Satellite bus, folded/stowed configuration */}
      <mesh>
        <cylinderGeometry args={[0.13, 0.15, 0.5, 16]} />
        <meshStandardMaterial color={0xd97706} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Folded solar panels — flush against the body, not extended outward */}
      {foldedPanelAngles.map((rot, i) => (
        <mesh
          key={i}
          position={[Math.cos(rot) * 0.15, 0, Math.sin(rot) * 0.15]}
          rotation={[0, rot, 0]}
        >
          <boxGeometry args={[0.02, 0.46, 0.14]} />
          <meshStandardMaterial color={0x1e3a8a} metalness={0.4} roughness={0.25} />
        </mesh>
      ))}
      {/* Stowed antenna tip */}
      <mesh position={[0, 0.28, 0]}>
        <coneGeometry args={[0.07, 0.14, 12]} />
        <meshStandardMaterial color={0xe2e8f0} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Launch smoke particles during ignition/launch */
function LaunchSmoke({ progressRef }: { progressRef: { current: number } }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 180;
  const dotTexture = useMemo(() => createSoftDotTexture(), []);

  const { geometry } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (seededRandom(i * 13.37) - 0.5) * 0.4;
      pos[i * 3 + 1] = -4.5 - seededRandom(i * 29.11) * 0.5;
      pos[i * 3 + 2] = (seededRandom(i * 7.91) - 0.5) * 0.4;
      vel[i * 3] = (seededRandom(i * 41.23) - 0.5) * 0.03;
      vel[i * 3 + 1] = -0.06 - seededRandom(i * 17.81) * 0.05;
      vel[i * 3 + 2] = (seededRandom(i * 23.47) - 0.5) * 0.03;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("velocity", new THREE.BufferAttribute(vel, 3));
    return { geometry: g };
  }, [count]);

  useFrame(() => {
    if (!ref.current) return;
    const p = progressRef.current;
    ref.current.visible = p > 0.18 && p < 0.65;
    if (!ref.current.visible) return;

    const mat = ref.current.material as THREE.PointsMaterial;
    const intensity = remapped(p, 0.18, 0.30) * (1 - remapped(p, 0.55, 0.70));
    mat.opacity = Math.max(0, intensity * 0.6);
  });

  return (
    <points ref={ref} geometry={geometry} visible={false}>
      <pointsMaterial
        map={dotTexture}
        alphaMap={dotTexture}
        size={0.2}
        color={0x777777}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Satellite evolution — after the rocket launch (progress > 1.0).
 * Simulates mission-accurate orbital trajectories (LEO, GEO, Lunar Transfer, Mars Transit, L1 Halo).
 */
function SatelliteEvolution({
  progressRef,
  detailsOpen,
  reducedMotion,
}: {
  progressRef: { current: number };
  detailsOpen: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  // Bug fix ("satellite/orbit ring displaced further and further from
  // the real Moon/Mars/Sun the deeper into the journey a mission sits" —
  // e.g. Aditya-L1, reached after ~15 leo/geo missions' worth of spin,
  // showing far more displacement than Chandrayaan-1 earlier in the
  // journey): restricting the PREVIOUS idle-spin rotation to leo/geo
  // only stopped it from accumulating FURTHER during lunar/mars/l1
  // missions, but groupRef is a single persistent object that's never
  // unmounted across the whole journey — any rotation already built up
  // from every earlier leo/geo mission stayed applied indefinitely,
  // since nothing ever reset it back to 0. destCenter (the Moon/Mars/Sun
  // offset, see the JSX below) is positioned as a CHILD of groupRef, so
  // that leftover rotation swings the entire destination-body offset
  // around EARTH_POS's Y axis by however much had accumulated by that
  // point — worse the later in the journey a lunar/mars/l1 mission
  // falls, exactly matching the growing displacement reported (mild for
  // Chandrayaan-1, severe for Aditya-L1). The real fix isn't which
  // missions are ALLOWED to keep spinning it — it's that destCenter must
  // never sit inside a group that rotates at ALL. spinGroupRef now wraps
  // only the orbit lines/satellite/tracking grid, nested INSIDE the
  // destCenter-positioned group (see the JSX below) rather than around
  // it, so the idle spin still visually rotates leo/geo's own contents
  // around Earth's local origin (harmless, since destCenter=[0,0,0]
  // there), while the destination-body offset itself can never be
  // touched by any amount of accumulated rotation, however deep into the
  // journey.
  const spinGroupRef = useRef<THREE.Group>(null!);
  const { setActiveSatellite } = useJourney();

  useFrame(() => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const visible = p > 0.96 && !detailsOpen;
    groupRef.current.visible = visible;

    // Bug fix ("continuous camera flow" — sudden object appear): the
    // entire satellite-evolution scene (orbit lines, tracking, active
    // spacecraft) previously popped fully into view the instant p crossed
    // 0.96 via the hard `visible` boolean above alone. Ramping this
    // group's scale up from 0 across the same 0.96–0.98 window the
    // PAYLOAD camera hand-off already uses to arrive at this scene (see
    // CameraController's p<1.0 branch) turns that into a soft
    // materialize timed to land exactly as the camera settles, instead of
    // a discrete cut. Reversible on scroll-up: fadeScale is recomputed
    // every frame from the current p, so scrolling back through this
    // window shrinks it back toward 0 right as `visible` flips false —
    // no pop in either direction.
    if (visible) {
      const fadeScale = p < 0.98 ? remapped(p, 0.96, 0.98) : 1;
      groupRef.current.scale.setScalar(Math.max(0.001, fadeScale));
    }

    if (visible) {
      const evolutionProgress = Math.max(0, p - 1.0);
      const satelliteIndex = Math.min(
        Math.floor(evolutionProgress / SATELLITE_TRANSITION_BAND),
        JOURNEY_SATELLITES.length - 1
      );
      setActiveSatellite(satelliteIndex);

      const spinOrbitType = getActiveMissionOrbitType(p);
      if (spinGroupRef.current && !reducedMotion && (spinOrbitType === "leo" || spinOrbitType === "geo")) {
        spinGroupRef.current.rotation.y += 0.0002;
      }
    }
  });

  // eslint-disable-next-line react-hooks/refs -- R3F pattern: read scroll progress during render to derive child props
  const evolutionProgress = Math.max(0, progressRef.current - 1.0);
  const satelliteIndex = Math.min(
    Math.floor(evolutionProgress / SATELLITE_TRANSITION_BAND),
    JOURNEY_SATELLITES.length - 1
  );
  const activeSatellite = JOURNEY_SATELLITES[Math.max(0, satelliteIndex)];
  const transitionProgress = (evolutionProgress % SATELLITE_TRANSITION_BAND) / SATELLITE_TRANSITION_BAND;

  // Perf fix (Phase 6 — staged sliding-window GLB preload, behind
  // PERFORMANCE_FLAGS.stagedGlbPreload, default false): warm the GLB
  // window around the active satellite whenever satelliteIndex actually
  // changes, mirroring the doc's "call the manager when the active
  // satellite index changes, not on every animation frame" requirement
  // (§8). preloadModelWindow itself no-ops entirely when the flag is off
  // (the full-preload path already warmed everything at module load
  // instead), so this effect is inert until the flag flips. Declared
  // here (after satelliteIndex, not before) since this is a plain
  // render-time const, not a hook — referencing it earlier in this
  // function body would hit the temporal dead zone.
  useEffect(() => {
    preloadModelWindow(satelliteIndex);
  }, [satelliteIndex]);

  if (!activeSatellite) return null;

  const orbitType = activeSatellite.orbitType || "leo";

  // Which body this orbit is actually centered on, in the same
  // EARTH_POS-relative local space this component renders in. leo/geo
  // stay centered on Earth itself ([0,0,0] in this local space); lunar/
  // mars/l1 are re-centered on the real Moon/Mars/Sun bodies rendered by
  // DestinationBodies (MOON_LOCAL/MARS_LOCAL/SUN_LOCAL combine with this
  // group's own EARTH_POS offset to land exactly on those bodies' real
  // world position). THIS is the fix for satellites visually orbiting
  // Earth even once their mission has arrived at a different body.
  const destCenter: [number, number, number] =
    orbitType === "lunar"
      ? MOON_LOCAL
      : orbitType === "mars"
        ? MARS_LOCAL
        : orbitType === "l1"
          ? SUN_LOCAL
          : [0, 0, 0];

  return (
    // Anchored at EARTH_POS — the exact same world-space anchor Earth's
    // own group uses — so every orbit below actually revolves around the
    // rendered globe instead of an unrelated point at the world origin.
    // See the SAT_ORBIT_* comment block above for the full rationale.
    <group ref={groupRef} visible={false} position={EARTH_POS}>
      {/* Re-centered on destCenter — Earth's own local origin for leo/geo,
          or the actual Moon/Mars/Sun position for lunar/mars/l1. The
          tracking grid, every orbit line, the active satellite, and the
          transformation particles all live inside this ONE group so they
          move together onto whichever body the current mission is
          actually orbiting, instead of staying anchored on Earth
          regardless of which planet the mission has reached. */}
      <group position={destCenter}>
        {/* spinGroupRef wraps everything visual — orbit lines, tracking
            grid, the active satellite, transformation particles — but
            sits INSIDE the destCenter position above rather than around
            it (see the spinGroupRef comment above for the full
            rationale). The idle spin below only ever rotates this inner
            group's own local origin, which for leo/geo IS Earth's local
            origin (harmless), and for lunar/mars/l1 is simply not
            rotated at all — destCenter's world position is fixed by the
            parent <group> above and can never be swung off the real
            body by any amount of accumulated spin. */}
        <group ref={spinGroupRef}>
          {/* ── Mission-Accurate Trajectory Tracks ── */}
          {orbitType === "leo" && (
            <group>
              <OrbitLine radius={SAT_ORBIT_LEO_R} inclination={55} color={0x00f0ff} />
              <OrbitLine radius={SAT_ORBIT_LEO_R + 0.4} inclination={98} color={0x38bdf8} />
            </group>
          )}

          {orbitType === "geo" && (
            <group>
              <OrbitLine radius={SAT_ORBIT_GEO_R} inclination={15} color={0x818cf8} />
              <OrbitLine radius={SAT_ORBIT_GEO_R + 0.3} inclination={29} color={0xa855f7} />
            </group>
          )}

          {orbitType === "lunar" && (
            // Translunar Elliptical Transfer Arc — centered on the real Moon
            // (destCenter === MOON_LOCAL here). The old "Moon Destination
            // Proxy Beacon" stand-in sphere is gone: it only ever existed
            // to represent a Moon that wasn't actually present at this
            // position — now that this whole group sits exactly on the
            // real Moon rendered by DestinationBodies, a second sphere here
            // would just duplicate/z-fight with it.
            <OrbitLine radius={SAT_ORBIT_LUNAR_A} eccentricity={LUNAR_ECC} inclination={LUNAR_INCLINATION} color={0x38bdf8} />
          )}

          {orbitType === "mars" && (
            // Hohmann Interplanetary Transfer Arc — centered on the real
            // Mars (destCenter === MARS_LOCAL here); see the lunar comment
            // above for why the old proxy beacon sphere was removed.
            <OrbitLine radius={SAT_ORBIT_MARS_A} eccentricity={MARS_ECC} inclination={MARS_INCLINATION} color={0xf97316} />
          )}

          {orbitType === "l1" && (
            // Sun-Earth L1 Halo Orbit visualization — centered on the Sun
            // stand-in body (destCenter === SUN_LOCAL here); see the lunar
            // comment above for why the old proxy marker was removed.
            <OrbitLine radius={SAT_ORBIT_L1_R} inclination={L1_INCLINATION} color={0xfacc15} />
          )}

          {/* Active Spacecraft in Dynamic Flight — position driven by scroll
              progress within this satellite's band, not elapsed time. See the
              "SCROLL-CONTROLLED MOTION" fix documented on OrbitingSatellite
              below. Rendered inside the destCenter group above, so its own
              internal orbit math (see OrbitingSatellite) only needs to
              circle its own local origin — that origin already IS the
              correct body for whichever mission is currently active. */}
          <OrbitingSatellite
            satelliteId={activeSatellite.id}
            orbitType={orbitType}
            // eslint-disable-next-line react-hooks/refs
            visible={progressRef.current > 0.96}
            progress={transitionProgress}
          />

          {/* Transformation particles */}
          {transitionProgress > 0.1 && transitionProgress < 0.9 && (
            <TransformationParticles
              progress={transitionProgress}
              orbitRadius={orbitType === "mars" ? 5.0 : orbitType === "lunar" ? 4.2 : 2.5}
              color={orbitType === "mars" ? 0xf97316 : orbitType === "l1" ? 0xfacc15 : 0x00f0ff}
            />
          )}
        </group>
      </group>
    </group>
  );
}

// ── Scroll-controlled orbital motion constants ──────────────────────────
// Total angle (radians) the satellite sweeps along its trajectory across
// the ENTIRE scroll range devoted to it (progress 0→1, one full
// SATELLITE_TRANSITION_BAND — now 0.8 of journey progress, backed by a
// proportionally taller scroll track in page.tsx). Exactly one full
// revolution (2π) per satellite: reaching the end of that satellite's
// scroll segment completes precisely ONE orbit, no more — previously
// this held >1 revolution's worth of angle (up to 1.6×) packed into a
// much narrower scroll band, so a single scroll gesture could spin a
// satellite through more than a full lap. One clean revolution per
// scroll segment, requiring several scroll actions to complete, reads as
// a deliberate scroll-driven orbit instead of an automatic spin.
const ORBIT_SWEEP: Record<string, number> = {
  leo: Math.PI * 2,
  geo: Math.PI * 2,
  lunar: Math.PI * 2,
  mars: Math.PI * 2,
  l1: Math.PI * 2,
};
// Body-spin-to-orbit-sweep ratio, applied uniformly across every
// orbitType (per explicit request: every satellite's scroll rate should
// match). ORBIT_SWEEP above and SATELLITE_TRANSITION_BAND
// (lib/constants.ts) were already identical for every mission -- each
// satellite already gets the same 0.8-progress scroll band mapped to
// exactly one full 2π orbital revolution, so the ORBIT itself already
// advanced at the same rate per unit of scroll for every mission. This
// was the one remaining per-orbitType variable affecting how fast a
// satellite reads as moving during scroll -- previously ranged 0.714–1.2
// (leo 0.75, geo 1.2, lunar 0.8, mars 0.833, l1 0.714, matching the
// elapsedTime-based rotation/orbit speed ratios from before the scroll-
// controlled-motion fix above), now a single shared value for every type.
const SPIN_RATIO_UNIFORM = 0.8;

/**
 * A satellite in orbital motion, positioned along its trajectory by
 * SCROLL PROGRESS rather than elapsed time.
 *
 * BUG FIX / feature (automatic → scroll-controlled satellite motion):
 * this previously derived its position from `clock.elapsedTime` inside
 * useFrame, so the satellite kept orbiting under its own power regardless
 * of whether — or in which direction — the user was scrolling. `progress`
 * is this satellite's fraction (0→1) of scroll travelled through its own
 * SATELLITE_TRANSITION_BAND, computed upstream in SatelliteEvolution from
 * progressRef — the same scroll-derived value that already drives which
 * satellite is active and the camera, so this stays perfectly in sync
 * with them. Reading `progress` directly instead of integrating time
 * means:
 *   • scrolling down → progress increases → the satellite advances
 *     forward along its path;
 *   • scrolling up → progress decreases → the satellite retraces the
 *     SAME path backward (true reversibility, not a different forward
 *     path);
 *   • the user stops scrolling → progress stops changing → every frame
 *     recomputes the exact same position, so the satellite holds
 *     perfectly still with no residual/automatic drift.
 * Because satelliteIndex/orbitType only change once `progress` (i.e.
 * evolutionProgress % SATELLITE_TRANSITION_BAND) has swept through a full
 * 0→1 pass, the satellite always completes one full deterministic motion
 * along its current trajectory before SatelliteEvolution transforms it
 * into the next mission — it can never jump mid-motion.
 * The gentle self-rotation applied to the whole group in
 * SatelliteEvolution's own useFrame (`groupRef.current.rotation.y +=
 * 0.0002`) is a separate idle-spin stylistic touch, not the satellite's
 * trajectory, so it's intentionally left time-based and untouched here.
 */
function OrbitingSatellite({
  satelliteId,
  orbitType,
  visible,
  progress,
}: {
  satelliteId: string;
  orbitType: string;
  visible: boolean;
  progress: number;
}) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = visible;
    if (!visible) return;

    const sweep = ORBIT_SWEEP[orbitType] ?? ORBIT_SWEEP.leo!;
    // Deterministic function of scroll progress — NOT accumulated time.
    const t = progress * sweep;

    // BUG FIX ("satellite should go behind the Earth, not penetrate it"):
    // every branch below previously used its own small hardcoded radius
    // (2.25–5.6, plus an l1 center of 4.2) that was SMALLER than
    // EARTH_RADIUS_WORLD (6.371) — completely disconnected from the much
    // larger SAT_ORBIT_* constants the matching <OrbitLine> trajectories
    // above are actually drawn with (8.6–15). That meant the satellite's
    // real flight path sat entirely INSIDE the opaque Earth sphere, so it
    // rendered embedded in / clipping through the globe rather than ever
    // correctly passing in front of and behind it. Reusing the same
    // SAT_ORBIT_* constants the trajectory lines use puts the satellite
    // exactly back on its drawn path, comfortably outside Earth's radius
    // at every point — so Three.js's normal depth-tested rendering now
    // correctly occludes it behind the globe on the far side of each orbit
    // instead of it poking through the surface.
    if (orbitType === "lunar") {
      // Translunar orbital ellipse — centered on this group's own local
      // origin (0,0,0), which SatelliteEvolution now positions exactly on
      // the real Moon for lunar missions (see destCenter there). Bug fix:
      // this previously used its own hand-approximated wobble instead of
      // the exact inclined-ellipse formula OrbitLine draws the visible
      // ring with (y = zBase*sin(inclination), z = zBase*cos(inclination))
      // — so the satellite never actually flew along the ring it was
      // supposed to be following. Reusing that same formula (with the
      // same LUNAR_INCLINATION constant the ring uses) makes the two
      // coincide exactly.
      const a = SAT_ORBIT_LUNAR_A;
      const b = SAT_ORBIT_LUNAR_B;
      const incRad = (LUNAR_INCLINATION * Math.PI) / 180;
      const zBase = Math.sin(t) * b;
      ref.current.position.set(
        Math.cos(t) * a,
        zBase * Math.sin(incRad),
        zBase * Math.cos(incRad)
      );
      ref.current.rotation.y = t * SPIN_RATIO_UNIFORM;
    } else if (orbitType === "mars") {
      // Interplanetary transfer arc — centered on this group's own local
      // origin, now the real Mars position for Mars missions (see
      // destCenter in SatelliteEvolution). Same exact-formula fix as the
      // lunar branch above, using MARS_INCLINATION to match its own ring.
      const a = SAT_ORBIT_MARS_A;
      const b = SAT_ORBIT_MARS_B;
      const incRad = (MARS_INCLINATION * Math.PI) / 180;
      const zBase = Math.sin(t) * b;
      ref.current.position.set(
        Math.cos(t) * a,
        zBase * Math.sin(incRad),
        zBase * Math.cos(incRad)
      );
      ref.current.rotation.y = t * SPIN_RATIO_UNIFORM;
    } else if (orbitType === "l1") {
      // Sun-Earth L1 Halo orbit — centered on this group's own local
      // origin, now the real Sun stand-in position for l1 missions (see
      // destCenter in SatelliteEvolution). Bug fix: this previously used
      // a figure-8 formula (sin(t*2) for the y-coordinate) that did NOT
      // match the drawn OrbitLine ring, which uses the standard
      // inclined-circle formula — so the spacecraft appeared to float near
      // the ring without ever following it, exactly matching the reported
      // "orbit path and spacecraft position do not match" symptom. Now
      // uses the exact same inclined-circle formula the ring is drawn with
      // (a=b=SAT_ORBIT_L1_R since eccentricity=0, inclination=L1_INCLINATION),
      // keeping the satellite visibly on its drawn trajectory path just
      // like the lunar/mars branches already do.
      const r = SAT_ORBIT_L1_R;
      const incRad = (L1_INCLINATION * Math.PI) / 180;
      const zBase = Math.sin(t) * r;
      ref.current.position.set(
        Math.cos(t) * r,
        zBase * Math.sin(incRad),
        zBase * Math.cos(incRad)
      );
      ref.current.rotation.y = t * SPIN_RATIO_UNIFORM;
    } else if (orbitType === "geo") {
      // Geostationary Orbit
      const r = SAT_ORBIT_GEO_R;
      ref.current.position.set(
        Math.cos(t) * r,
        Math.sin(t) * r * 0.25,
        Math.sin(t) * r * 0.95
      );
      ref.current.rotation.y = t * SPIN_RATIO_UNIFORM;
    } else {
      // LEO Orbit (fast, inclined)
      const r = SAT_ORBIT_LEO_R;
      ref.current.position.set(
        Math.cos(t) * r,
        Math.sin(t) * r * 0.8,
        Math.sin(t) * r * 0.55
      );
      ref.current.rotation.y = t * SPIN_RATIO_UNIFORM;
    }
  });

  return (
    <group ref={ref}>
      {/* Bug fix: this previously hardcoded scale={0.55} directly, which
          silently ignored the SAT_MODEL_SCALE constant above (added in an
          earlier session to shrink satellites but never actually wired
          in). Reading SAT_MODEL_SCALE here makes that constant the single
          source of truth for orbiting-satellite size again. SAT_MODEL_SCALE_OVERRIDES
          lets one orbitType (currently just "l1"/Aditya-L1) size up from that
          shared baseline without touching every other satellite. */}
      <SatelliteModel
        satelliteId={satelliteId}
        scale={SAT_MODEL_SCALE_OVERRIDES[orbitType] ?? SAT_MODEL_SCALE}
        interactive={true}
      />
    </group>
  );
}

/** Transformation particle bursts */
function TransformationParticles({
  progress,
  orbitRadius,
  color,
}: {
  progress: number;
  orbitRadius: number;
  color: number;
}) {
  const ref = useRef<THREE.Points>(null!);
  const count = 120;
  const dotTexture = useMemo(() => createSoftDotTexture(), []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = (i / count) * Math.PI * 2;
      const r = orbitRadius * (0.6 + seededRandom(i * 19.73) * 0.4);
      positions[i3] = Math.cos(angle) * r;
      positions[i3 + 1] = (seededRandom(i * 31.87) - 0.5) * r * 0.6;
      positions[i3 + 2] = Math.sin(angle) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count, orbitRadius]);

  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = Math.sin(progress * Math.PI) * 0.45;
    mat.size = 0.08 + progress * 0.05;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        map={dotTexture}
        alphaMap={dotTexture}
        size={0.12}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
