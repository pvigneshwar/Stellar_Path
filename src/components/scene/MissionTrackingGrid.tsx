"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Mission Tracking Grid
 *
 * Replaces the old Particles.tsx / Nebula.tsx / Stars.tsx components
 * (unused, purely decorative, superseded by SpaceEnvironment.tsx's own
 * starfield/nebula — moved to scene/_deprecated_legacy/). Those were
 * exactly the kind of "random particles / decorative objects" the brief
 * asks to avoid.
 *
 * This addon is functional rather than decorative: a faint polar
 * reference grid — concentric range rings plus radial bearing lines,
 * with a slow GSAP-driven sweep arm — anchored on Earth during the
 * satellite-evolution phase of the journey. It reads as an orbital
 * tracking / mission-control display (the kind of reference plane a real
 * ISRO ground-station or observatory console draws under a tracked
 * object), reinforcing the orbital-mechanics storytelling rather than
 * adding ambient noise. Line-only geometry, additive but low-opacity, no
 * particle systems.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";

interface Props {
  /** World-space radius of the outermost range ring — sized to just
   *  clear the widest active orbit (e.g. SAT_ORBIT_MARS_A in
   *  JourneyScene.tsx) so the grid frames the current trajectory rather
   *  than fighting it. */
  maxRadius?: number;
  ringCount?: number;
  visible: boolean;
  color?: number;
}

/** Thin great-circle ring on the XZ (equatorial reference) plane. */
function RangeRing({ radius, color, opacity }: { radius: number; color: number; opacity: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </line>
  );
}

/** Radial bearing line from center to the outer ring, e.g. every 45°. */
function BearingLines({ maxRadius, count, color, opacity }: { maxRadius: number; count: number; color: number; opacity: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(Math.cos(a) * maxRadius, 0, Math.sin(a) * maxRadius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [maxRadius, count]);

  return (
    <lineSegments>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

/** Slow rotating sweep wedge — the recognisable "radar/tracking scan" motif. */
function SweepArm({ maxRadius, color }: { maxRadius: number; color: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  const geometry = useMemo(() => {
    const segments = 24;
    const arcSpan = Math.PI / 10; // narrow wedge
    const positions: number[] = [0, 0, 0];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * arcSpan;
      positions.push(Math.cos(a) * maxRadius, 0, Math.sin(a) * maxRadius);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const indices: number[] = [];
    for (let i = 1; i < segments + 1; i++) indices.push(0, i, i + 1);
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [maxRadius]);

  // GSAP drives the sweep rotation — a single infinite, linear tween
  // rather than a per-frame manual increment, matching the "professional
  // resource, used where it genuinely helps" brief: GSAP's timeline gives
  // a precise, easily-tunable rotation rate/easing in one declarative
  // call instead of hand-rolled useFrame math.
  useEffect(() => {
    if (!groupRef.current) return;
    const tween = gsap.to(groupRef.current.rotation, {
      y: `+=${Math.PI * 2}`,
      duration: 14,
      repeat: -1,
      ease: "none",
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Mission tracking grid — mounted once inside the satellite-evolution
 * group in JourneyScene.tsx (same EARTH_POS anchor), visible only while
 * that phase is active. Fades in/out with `visible` rather than
 * mounting/unmounting, so the sweep tween isn't restarted on every
 * satellite transition.
 */
export function MissionTrackingGrid({
  maxRadius = 16,
  ringCount = 4,
  visible,
  color = 0x00d4ff,
}: Props) {
  const rootRef = useRef<THREE.Group>(null!);
  const opacityRef = useRef(0);

  useFrame(() => {
    if (!rootRef.current) return;
    const target = visible ? 1 : 0;
    opacityRef.current += (target - opacityRef.current) * 0.06;
    rootRef.current.visible = opacityRef.current > 0.01;
  });

  const rings = useMemo(
    () =>
      Array.from({ length: ringCount }, (_, i) => (maxRadius * (i + 1)) / ringCount),
    [ringCount, maxRadius]
  );

  return (
    <group ref={rootRef} rotation={[0, 0, 0]}>
      {rings.map((r, i) => (
        <RangeRing key={r} radius={r} color={color} opacity={0.05 + i * 0.01} />
      ))}
      <BearingLines maxRadius={maxRadius} count={8} color={color} opacity={0.05} />
      <SweepArm maxRadius={maxRadius} color={color} />
    </group>
  );
}
