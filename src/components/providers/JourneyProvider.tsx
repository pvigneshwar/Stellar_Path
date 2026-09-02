/**
 * INDIA'S JOURNEY BEYOND EARTH — Journey Provider
 *
 * Central state container for the entire scroll-driven 3D journey.
 * Persists across the full experience — no page reloads between satellites.
 *
 * Architecture:
 *   - progressRef (mutable ref)   → read by 3D scene in useFrame (no re-render)
 *   - progress (React state)      → drives UI overlays (throttled updates)
 *   - All other state (started, activeSatellite, details) is in React state
 *
 * The scroll tracking is set up lazily once the user starts the journey,
 * to avoid interfering with the initial Hero / Loading state.
 */
"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { JourneyContextValue, PerformanceMode, JourneyState } from "@/lib/types";
import { JOURNEY_SATELLITES } from "@/lib/data/journey";
import { SATELLITE_TRANSITION_BAND } from "@/lib/constants";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { clamp, progressFromScrollFraction } from "@/lib/utils";

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) {
    throw new Error("useJourney must be used within a JourneyProvider");
  }
  return ctx;
}

interface Props {
  children: ReactNode;
}

/**
 * Default journey state (used before the user starts).
 */
const DEFAULT_STATE: JourneyState = {
  progress: 0,
  started: false,
  activeSatelliteIndex: 0,
  detailsOpen: false,
  selectedSatelliteId: null,
  savedProgress: 0,
  reducedMotion: false,
  performanceMode: "high",
  isRestarting: false,
  freeView: false,
};

// Cinematic restart timing — MUST stay in sync with the CSS animation
// durations in globals.css (.restart-rocket / .restart-fog) and with
// RestartTransition.tsx, which just mounts/unmounts on `isRestarting`
// and lets these CSS animations play out on their own schedule.
//   0 -> RESTART_RESET_MS        rocket flies across + fog fades in
//   RESTART_RESET_MS             fully covered — reset progress/scroll/
//                                 started underneath, invisibly
//   RESTART_RESET_MS -> RESTART_END_MS   fog fades back out
const RESTART_RESET_MS = 1300;
const RESTART_END_MS = 2000;

export function JourneyProvider({ children }: Props) {
  // ── Refs (mutable, read by 3D loop — no re-render on update) ──
  const progressRef = useRef(0);
  // Bug fix (fast-scroll causes objects to fail to render): rawProgressRef
  // holds the immediate, precise scroll-derived value (still computed
  // instantly from scrollTop, so the scrollbar mapping itself has no lag).
  // progressRef — the value the 3D scene actually reads every frame — is
  // now a SMOOTHED value that a persistent rAF loop below eases toward
  // rawProgressRef at a bounded, frame-rate-independent rate. Previously
  // progressRef was set directly from the raw scroll position on every
  // scroll event, so a fast flick could jump it by a large amount between
  // two consecutive frames — since every phase transition, GLB Suspense
  // mount, and stage-separation trigger in JourneyScene reads
  // progressRef.current directly (not time-integrated), a big jump skips
  // straight over the intermediate progress values where those objects
  // were supposed to mount/render. Sweeping continuously through every
  // intermediate value instead of teleporting fixes that regardless of
  // scroll speed.
  const rawProgressRef = useRef(0);
  // Perf fix (fix.md A1 — throttle React state updates during scroll):
  // remembers the last `progress` value actually pushed into React state,
  // rounded to 3 decimal places. The smoothing loop below still runs and
  // advances progressRef.current every single animation frame (the 3D
  // scene keeps reading that directly, completely unaffected by this),
  // but it only calls setProgress() — which re-renders JourneyOverlay's
  // full JSX tree — when the rounded value has actually moved, instead of
  // unconditionally on every frame.
  const lastEmittedProgressRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // ── React state (drives UI) ──
  const [progress, setProgress] = useState(DEFAULT_STATE.progress);
  const [started, setStarted] = useState(DEFAULT_STATE.started);
  const [activeSatelliteIndex, setActiveSatIdx] = useState(DEFAULT_STATE.activeSatelliteIndex);
  const [detailsOpen, setDetailsOpen] = useState(DEFAULT_STATE.detailsOpen);
  const [selectedSatelliteId, setSelectedSatId] = useState(DEFAULT_STATE.selectedSatelliteId);
  const [savedProgress, setSavedProgress] = useState(DEFAULT_STATE.savedProgress);
  const [isRestarting, setIsRestarting] = useState(DEFAULT_STATE.isRestarting);
  const [freeView, setFreeView] = useState(DEFAULT_STATE.freeView);
  const restartTimeoutsRef = useRef<number[]>([]);

  const reducedMotion = useReducedMotion();
  const detectedPerfMode = usePerformanceMode();
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(detectedPerfMode);

  // Sync detected performance mode into state
  useEffect(() => {
    setPerformanceMode(detectedPerfMode);
  }, [detectedPerfMode]);

  // Throttled scroll handler — computes the RAW target progress from
  // scrollTop. No longer writes progressRef/setProgress directly (see the
  // smoothing rAF loop below) — this only updates the target the
  // smoothing loop eases toward.
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const raw = maxScroll > 0 ? scrollTop / maxScroll : 0;

    // Total journey range:
    //   0–1.0 = rocket launch sequence
    //   1.0–N = satellite evolution (each satellite takes SATELLITE_TRANSITION_BAND)
    const totalJourneyEnd = 1.0 + JOURNEY_SATELLITES.length * SATELLITE_TRANSITION_BAND + 0.3;
    // Bug fix / feature (countdown flashing by in a single scroll gesture):
    // this used to be a flat `raw * totalJourneyEnd`, so every progress
    // unit — including the six-stage T-minus countdown's narrow window —
    // got identical physical-scroll density. progressFromScrollFraction()
    // instead gives the countdown window (COUNTDOWN_START–COUNTDOWN_END)
    // extra scroll density (see lib/utils.ts and COUNTDOWN_SCROLL_WEIGHT in
    // lib/constants.ts) while leaving every other progress value's mapping
    // unchanged — same scroll-controlled, reversible, freezes-on-stop
    // behavior as before, just paced differently through that one window.
    const p = progressFromScrollFraction(raw, totalJourneyEnd);

    rawProgressRef.current = p;
  }, []);

  const setProgressDirect = useCallback((p: number) => {
    // Deliberate teleport (e.g. restoreJourney after closing satellite
    // details) — set both raw AND smoothed progress instantly, bypassing
    // the smoothing loop, since this isn't organic scrolling and should
    // snap back exactly where the user left off.
    const totalJourneyEnd = 1.0 + JOURNEY_SATELLITES.length * SATELLITE_TRANSITION_BAND + 0.3;
    const clamped = clamp(0, p, totalJourneyEnd);
    rawProgressRef.current = clamped;
    progressRef.current = clamped;
    lastEmittedProgressRef.current = Math.round(clamped * 1000) / 1000;
    setProgress(clamped);
  }, []);

  // ── Smoothing loop — eases progressRef toward rawProgressRef every
  //    frame, independent of scroll event frequency. Runs continuously
  //    while the journey is active so it keeps catching up for a few
  //    frames even after the user stops scrolling. Exponential decay
  //    (frame-rate independent via delta time) rather than a fixed-step
  //    lerp, so it behaves the same at 30fps or 144fps. ──
  useEffect(() => {
    if (!started) return;
    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      // Clamp dt so a dropped/backgrounded tab doesn't cause one huge
      // catch-up jump when the tab regains focus.
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const current = progressRef.current;
      const target = rawProgressRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.0001) {
        // Rate tuned so even a huge jump (start-to-end scrollbar drag)
        // fully catches up within roughly a quarter second — fast enough
        // to feel responsive, slow enough that every intermediate
        // progress value still gets at least one rendered frame.
        const smoothingRate = 12;
        const expStep = diff * (1 - Math.exp(-smoothingRate * dt));

        // Bug fix (satellite transformation still skipped under fast
        // scroll): pure percentage-based easing bounds the TOTAL catch-up
        // time, but not how much ground a single frame covers. Each
        // satellite occupies a narrow SATELLITE_TRANSITION_BAND (0.12) of
        // progress — on a very fast flick the exponential step for the
        // first couple of frames alone can be wider than several bands
        // combined, so multiple satellites' OrbitingSatellite/SatelliteModel
        // mount and unmount within 1–2 rendered frames each, which reads
        // as "failing to render" since nothing lingers long enough to
        // actually paint. Capping the per-frame step to an absolute max
        // speed guarantees a minimum dwell time for every band it passes
        // through, regardless of how large the initial jump is — large
        // jumps just take proportionally longer to finish catching up.
        const maxSpeed = 0.6; // progress units per second
        const maxStepMag = maxSpeed * dt;
        const step = Math.sign(diff) * Math.min(Math.abs(expStep), maxStepMag, Math.abs(diff));

        const next = current + step;
        progressRef.current = next;
        // Perf fix (fix.md A1): only push to React state — and therefore
        // only re-render JourneyOverlay — when progress has moved enough
        // to matter for the UI (3 decimal places), rather than on every
        // single frame of the smoothing loop.
        const rounded = Math.round(next * 1000) / 1000;
        if (rounded !== lastEmittedProgressRef.current) {
          lastEmittedProgressRef.current = rounded;
          setProgress(next);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  // ── Scroll listener setup ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !started) return;

    // Throttle using requestAnimationFrame for smoothness
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(handleScroll);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    // Also listen to wheel/touch for immediate feedback
    container.addEventListener("wheel", onScroll, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("wheel", onScroll);
    };
  }, [started, handleScroll]);

  // ── Actions ──
  const startJourney = useCallback(() => {
    setStarted(true);
  }, []);

  const setActiveSatellite = useCallback((index: number) => {
    setActiveSatIdx(clamp(0, index, JOURNEY_SATELLITES.length - 1));
  }, []);

  const openDetails = useCallback((satelliteId: string) => {
    setSavedProgress(progressRef.current);
    setSelectedSatId(satelliteId);
    setDetailsOpen(true);
    // Bug fix (would-be conflict): the satellite details panel opens its
    // own dedicated camera framing (see SatelliteDetails.tsx), which would
    // fight a still-active Free 3D View Movement OrbitControls for control
    // of the camera. Turning it off here — the same way isDestinationMission
    // etc. are handled as one-way state transitions elsewhere in this
    // provider — keeps that hand-off clean; the user can turn it back on
    // again once they return to the journey.
    setFreeView(false);
  }, []);

  const toggleFreeView = useCallback(() => {
    setFreeView((v) => !v);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedSatId(null);
  }, []);

  const toggleDetails = useCallback((satelliteId: string | null) => {
    if (satelliteId && !detailsOpen) {
      setSavedProgress(progressRef.current);
      setSelectedSatId(satelliteId);
      setDetailsOpen(true);
    } else if (!satelliteId && detailsOpen) {
      setDetailsOpen(false);
      setSelectedSatId(null);
    }
  }, [detailsOpen]);

  const restoreJourney = useCallback(() => {
    setDetailsOpen(false);
    setSelectedSatId(null);
    // Restore scroll position
    setProgressDirect(savedProgress);
  }, [savedProgress, setProgressDirect]);

  // Bug fix: the "RESTART JOURNEY" button previously just set
  // scrollContainerRef.current.scrollTop = 0 directly. That DOES retarget
  // rawProgressRef to 0 via the scroll listener, but progressRef — the
  // value everything (camera, rocket, satellites, HUD) actually reads —
  // is only ever eased toward its target by the smoothing loop above,
  // which caps its speed at maxSpeed=0.6 progress units/sec. Late in the
  // journey (progress can be ~14+ once all 17 satellites are behind you)
  // that catch-up alone takes over 20 seconds, which reads as "the button
  // doesn't do anything." restartJourney() plays a short cinematic cover
  // (rocket flies across the screen, fog fully covers it — see
  // RestartTransition.tsx) and performs the reset with setProgressDirect
  // (the same instant-teleport path restoreJourney already uses above)
  // while the screen is covered, so nothing needs to visibly catch up.
  const restartJourney = useCallback(() => {
    // Ignore re-triggers while a restart is already in flight.
    if (isRestarting) return;

    // Respect the user's reduced-motion preference — skip the cinematic
    // entirely and just reset instantly, same as every other
    // reduced-motion path in this app (see CameraController, HeroOrbit).
    if (reducedMotion) {
      setStarted(false);
      setDetailsOpen(false);
      setSelectedSatId(null);
      setSavedProgress(0);
      setActiveSatIdx(0);
      setProgressDirect(0);
      setFreeView(false);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      return;
    }

    setIsRestarting(true);

    const resetId = window.setTimeout(() => {
      setStarted(false);
      setDetailsOpen(false);
      setSelectedSatId(null);
      setSavedProgress(0);
      setActiveSatIdx(0);
      setProgressDirect(0);
      setFreeView(false);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, RESTART_RESET_MS);

    const endId = window.setTimeout(() => {
      setIsRestarting(false);
    }, RESTART_END_MS);

    restartTimeoutsRef.current = [resetId, endId];
  }, [isRestarting, reducedMotion, setProgressDirect]);

  // Clear any pending restart timers if the provider ever unmounts
  // mid-transition, so they don't fire against stale setters.
  useEffect(() => {
    return () => {
      restartTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Expose progress ref for the 3D scene to read directly
  const contextValue: JourneyContextValue = {
    // state
    progress,
    started,
    activeSatelliteIndex,
    detailsOpen,
    selectedSatelliteId,
    savedProgress,
    reducedMotion,
    performanceMode,
    isRestarting,
    freeView,
    // refs (for 3D consumption)
    progressRef,
    scrollContainerRef,
    // actions
    setProgress: setProgressDirect,
    startJourney,
    setActiveSatellite,
    openDetails,
    closeDetails,
    toggleDetails,
    restoreJourney,
    restartJourney,
    setReducedMotion: () => {}, // read-only from preference
    setPerformanceMode,
    toggleFreeView,
  };

  return (
    <JourneyContext.Provider value={contextValue}>
      {children}
    </JourneyContext.Provider>
  );
}
