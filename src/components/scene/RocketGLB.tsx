"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — PSLV Rocket GLB Model
 *
 * Loads the real binary PSLV rocket .glb model from /models/pslv_rocket.glb
 * and distributes its 89 individual mesh nodes into logical stage groups
 * (stage1 = boosters + core lower stage + engines, stage2 = upper stage)
 * so the parent RocketLaunch component can drive scroll-based stage
 * separation with the same ref-backed animation it already uses.
 *
 * The studio floor, nose fairing, fairing collar, and payload adapter are
 * hidden here — they are replaced by procedural elements (flame, fairing
 * cones, stowed/deployed payload) that the parent component controls for
 * smooth separation animations.
 */
import { type Ref, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { LOCAL_PSLV_ROCKET_MODEL } from "@/lib/constants";

// ── Positioning ──────────────────────────────────────────────────────
// Scale matches the existing procedural rocket's visual footprint next to
// Earth (radius ≈ 6.37 scene units). The GLB stands ~18 world units tall
// (excluding the studio floor); 0.35 brings it to ≈ 6.3, on par with the
// old procedural cylinder stack.
const MODEL_SCALE = 0.35;
// Y offset aligns the lower stage centre with where the procedural
// stage-1 cylinder sat (Y = -2.5 relative to the rocket group).
const MODEL_Y_OFFSET = -4.0;

// ── Node categorisation ──────────────────────────────────────────────
/** GLB nodes hidden because the parent renders procedural replacements. */
const HIDDEN_NODE_NAMES = new Set([
  "Studio Floor",        // ground plane — not needed in the scene
  "Core Nose Fairing",   // replaced by procedural fairing cones
  "Fairing Collar",      // replaced by procedural fairing cones
  "Payload Adapter",     // replaced by procedural payload
]);

// Bug fix: the black square "plate" visible under the rocket was this
// exact same Studio Floor ground-plane mesh from the GLB, still rendering
// unlit/dark. HIDDEN_NODE_NAMES only matches an EXACT string, so any
// variation in the actual exported node name — a Blender duplicate suffix
// like "Studio Floor.001", different casing, a trailing space — silently
// fails to match and the floor renders. This substring/case-insensitive
// check catches those variants regardless of exact naming.
const HIDDEN_NAME_SUBSTRINGS = ["floor", "ground", "platform", "pad", "base plate"];

function isHiddenNode(name: string): boolean {
  if (HIDDEN_NODE_NAMES.has(name)) return true;
  const lower = name.toLowerCase();
  return HIDDEN_NAME_SUBSTRINGS.some((s) => lower.includes(s));
}

/** Name substrings that mark a node as part of separable Stage 1. */
const STAGE1_NAME_PATTERNS = [
  "Booster",
  "Side Booster",
  "Side Engine",
  "Core Lower",
  "Core Engine",
  "Main Engine Plate",
  "Engine Mount",
  "Engine Nozzle",
  "Nozzle Hot",
];

function isStage1Part(name: string): boolean {
  return STAGE1_NAME_PATTERNS.some((p) => name.includes(p));
}

// ── Component ───────────────────────────────────────────────────────

interface RocketGLBProps {
  stage1Ref: Ref<THREE.Group>;
  stage2Ref: Ref<THREE.Group>;
  flameRef: Ref<THREE.Mesh>;
}

export function RocketGLB({ stage1Ref, stage2Ref, flameRef }: RocketGLBProps) {
  const { scene } = useGLTF(LOCAL_PSLV_ROCKET_MODEL);

  const { stage1Children, stage2Children } = useMemo(() => {
    const clone = scene.clone();
    const stage1: THREE.Object3D[] = [];
    const stage2: THREE.Object3D[] = [];

    clone.children.forEach((child) => {
      const name = child.name;

      // Skip parts that are handled procedurally by the parent component,
      // or that are stray ground/floor/platform geometry from the GLB
      // (see isHiddenNode / HIDDEN_NAME_SUBSTRINGS above).
      if (isHiddenNode(name)) return;

      // Scale each child to match the procedural rocket's visual size.
      // Position is scaled then offset so the lower stage centre aligns
      // with the procedural cylinder position.
      child.position.set(
        child.position.x * MODEL_SCALE,
        child.position.y * MODEL_SCALE + MODEL_Y_OFFSET,
        child.position.z * MODEL_SCALE
      );
      child.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
      child.traverse((c) => {
        c.castShadow = true;
        c.receiveShadow = true;
      });

      if (isStage1Part(name)) {
        stage1.push(child);
      } else {
        stage2.push(child);
      }
    });

    return { stage1Children: stage1, stage2Children: stage2 };
  }, [scene]);

  return (
    <>
      {/* ── Stage 1: boosters + core lower stage + engines ── */}
      <group ref={stage1Ref}>
        {stage1Children.map((child, i) => (
          <primitive key={`s1-${i}`} object={child} />
        ))}
        {/* Engine flame — sibling of GLB parts, moves with stage1 during separation */}
        <mesh
          ref={flameRef}
          position={[0, -4.8, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <coneGeometry args={[0.4, 2.2, 16]} />
          <meshBasicMaterial
            color={0xff6600}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* ── Stage 2: upper stage + markings ── */}
      <group ref={stage2Ref}>
        {stage2Children.map((child, i) => (
          <primitive key={`s2-${i}`} object={child} />
        ))}
      </group>
    </>
  );
}

// Start loading the 2.6 MB model as soon as the module is imported so
// it's ready by the time the rocket reveal phase begins.
useGLTF.preload(LOCAL_PSLV_ROCKET_MODEL);
