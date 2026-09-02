"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Main Page
 *
 * The page renders:
 * 1. A fixed scroll container (height: 100vh, overflow-y-auto) that drives the journey
 * 2. A tall scroll track providing scroll distance for the full journey
 * 3. The fixed 3D Canvas (JourneyScene) underneath everything
 * 4. Overlays on top: LoadingScreen → HeroOverlay → JourneyOverlay
 * 5. SatelliteDetails (slides in on click)
 * 6. FinalExperience (revealed after satellite evolution completes)
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { JourneyScene } from "@/components/scene/JourneyScene";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingScreen } from "@/components/overlays/LoadingScreen";
import { HeroOverlay } from "@/components/overlays/HeroOverlay";
import { JourneyOverlay } from "@/components/overlays/JourneyOverlay";
import { RestartTransition } from "@/components/overlays/RestartTransition";
import { SatelliteDetails } from "@/components/ui/SatelliteDetails";
import { useJourney } from "@/components/providers/JourneyProvider";
import { JOURNEY_SATELLITES } from "@/lib/data/journey";
import { SATELLITE_TRANSITION_BAND } from "@/lib/constants";
import { computeWeightedJourneyLength } from "@/lib/utils";

// Scroll track height — needs to accommodate:
//   - 0.0–1.0 rocket launch
//   - 1.0–N satellite evolution (each satellite takes one full
//     SATELLITE_TRANSITION_BAND — now also exactly one orbital revolution,
//     see ORBIT_SWEEP in JourneyScene.tsx)
// Total journey length (in progress units) = 1.0 + (num satellites * band) + buffer.
//
// Bug fix / feature (satellite rotation completing within a single scroll
// gesture): this was previously a flat "600vh" constant, chosen without
// regard for how many progress-units the journey actually spans. With 17
// satellites at the old BAND (0.12) that put barely ~22vh of physical
// scroll behind each satellite's entire orbit — well under one scroll
// wheel notch. Deriving the track height from VH_PER_PROGRESS_UNIT ×
// totalJourneyEnd instead keeps a CONSTANT physical-scroll density across
// the whole journey (so the rocket-launch pacing is unchanged from
// before) while automatically giving each satellite's now-larger BAND
// (0.8) enough real scroll distance that completing its one orbital
// revolution takes several deliberate scroll actions, not a single
// swipe — and it stays correct automatically if satellites are ever
// added/removed or BAND is retuned again, instead of silently drifting
// out of sync with a hand-picked "600vh".
//
// Bug fix / feature (launch-countdown same treatment): the track height
// is now sized from the WEIGHTED journey length (computeWeightedJourneyLength,
// lib/utils.ts) rather than the raw progress total, so the countdown
// window's extra COUNTDOWN_SCROLL_WEIGHT gets its own real vh added on
// top — the same physical-scroll-density fix as the satellite orbit,
// applied to the countdown instead of layered as a separate calculation.
// Bug fix / feature (journey scrolling too fast overall): VH_PER_PROGRESS_UNIT
// is the master scroll-speed dial for the whole journey — it's vh of
// physical scroll distance per unit of progress, applied uniformly
// everywhere except the countdown window's extra weighting above. Raised
// from 180 to 260 (≈+44%) so the same scroll/swipe distance advances the
// journey noticeably less, i.e. the whole experience takes more scrolling
// to get through — a straightforward density increase, not a change to
// any phase boundary, easing curve, or the countdown's own weighting.
const VH_PER_PROGRESS_UNIT = 260;
const TOTAL_JOURNEY_PROGRESS = 1.0 + JOURNEY_SATELLITES.length * SATELLITE_TRANSITION_BAND + 0.3;
const WEIGHTED_JOURNEY_LENGTH = computeWeightedJourneyLength(TOTAL_JOURNEY_PROGRESS);
const SCROLL_TRACK_HEIGHT = `${Math.round(WEIGHTED_JOURNEY_LENGTH * VH_PER_PROGRESS_UNIT)}vh`;

export default function Home() {
  const {
    started,
    startJourney,
    detailsOpen,
    scrollContainerRef,
    restoreJourney,
    progress,
    freeView,
  } = useJourney();

  // Bug fix (Free 3D View Movement toggle appeared to do nothing): the
  // scroll container below is `fixed inset-0 z-10`, covering the ENTIRE
  // viewport above the 3D <Canvas> (`fixed inset-0 z-0`). With no
  // pointer-events override it intercepts every mouse/touch event on the
  // whole screen before the canvas ever sees them, so OrbitControls
  // (which listens on the canvas's own DOM element) never received the
  // drag/wheel input Free 3D View Movement is supposed to enable. The
  // toggle button itself still worked (it has an explicit pointer-events-
  // auto override, see JourneyOverlay.tsx), which is why the button
  // appeared responsive while the orbit/zoom action it promised silently
  // never fired. Mirrors the same inFreeView gate JourneyScene.tsx and
  // JourneyOverlay.tsx already use, so this container only stops
  // capturing pointer events for exactly the window free view is active.
  const inFreeView = freeView && started && !detailsOpen && progress >= 1.0;
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  // Simulate asset loading — in production this would use drei's useProgress
  useEffect(() => {
    const timer = setTimeout(() => {
      setAssetsLoaded(true);
      // Delay unmount to allow fade-out transition (700ms matches
      // the duration-700 transition in LoadingScreen)
      const fadeTimer = setTimeout(() => setShowLoading(false), 700);
      return () => clearTimeout(fadeTimer);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Escape key closes details panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailsOpen) {
        restoreJourney();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [detailsOpen, restoreJourney]);

  return (
    <>
      {/* Loading Screen — shows until assets are loaded, then fades out */}
      {showLoading && <LoadingScreen onReady={() => setAssetsLoaded(true)} fadingOut={assetsLoaded} />}

      {/* Hero Overlay — shows after loading, before journey starts */}
      {assetsLoaded && !started && <HeroOverlay />}

      {/* Scroll container — drives the 3D journey */}
      <main
        ref={scrollContainerRef}
        className="fixed inset-0 z-10 overflow-y-auto"
        style={{
          height: "100vh",
          // Disable smooth scroll — we need precise frame-level control
          scrollBehavior: "auto",
          // Bug fix: let mouse/touch input pass through to the <Canvas>
          // beneath while Free 3D View Movement is active, so drag-to-
          // orbit and wheel-to-zoom actually reach OrbitControls instead
          // of being captured by this full-viewport scroll container.
          // JourneyOverlay's toggle button keeps working regardless (its
          // own pointer-events-auto override wins over this parent value).
          pointerEvents: inFreeView ? "none" : "auto",
        }}
      >
        {/* Tall scroll track — provides scroll distance */}
        <div style={{ height: SCROLL_TRACK_HEIGHT }}>
          {/* Journey text overlay (shows during scroll) */}
          <JourneyOverlay />

          {/* Final experience screen */}
          {!detailsOpen && <FinalExperience />}
        </div>
      </main>

      {/* Fixed 3D Canvas — the persistent space scene */}
      <div className="fixed inset-0 z-0">
        <ErrorBoundary is3DScene>
          <JourneyScene />
        </ErrorBoundary>
      </div>

      {/* Satellite Details Panel */}
      <SatelliteDetails />

      {/* Restart Journey cinematic transition — rocket flies across,
          fog covers the screen, journey resets underneath, fog clears */}
      <RestartTransition />
    </>
  );
}

/** Final "The Journey Continues..." screen at the end of the scroll. */
function FinalExperience() {
  const { progress, started, detailsOpen, restartJourney } = useJourney();

  // Calculate when the final experience should show
  // After all satellites in the journey have been traversed
  const totalJourneyEnd = 1.0 + JOURNEY_SATELLITES.length * SATELLITE_TRANSITION_BAND;
  const showFinal = started && progress > totalJourneyEnd - 0.1;

  if (!showFinal || detailsOpen) return null;

  const opacity = Math.max(0, Math.min(1, (progress - (totalJourneyEnd - 0.1)) / 0.3));

  return (
    <div
      // Bug fix: bg-black/85 + backdrop-blur-md nearly fully occluded the
      // persistent 3D canvas behind this screen, reading as "the final
      // scene goes dark" — spec asks the ending to still show space/Earth/
      // context, not just UI on black. Lighter scrim + lighter blur keeps
      // the starfield/nebula faintly visible through the text for
      // continuity, while still giving the CTA text enough contrast.
      className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in-up"
      style={{ opacity }}
    >
      <h2 className="font-display mb-4 text-4xl font-bold text-white sm:text-5xl">
        THE JOURNEY CONTINUES...
      </h2>
      <p className="mb-8 max-w-md text-center text-gray-300">
        From the first satellite to the next frontier.
      </p>
      <div className="flex gap-4">
        <Link
          href="/explorer"
          className="inline-flex items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-b from-blue-500 to-purple-600 px-6 py-3 font-ui text-sm font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] hover:scale-105"
        >
          EXPLORE ALL SATELLITES
        </Link>
        <button
          onClick={restartJourney}
          className="rounded-full border border-white/20 bg-transparent px-6 py-3 font-ui text-sm font-semibold text-white transition-all hover:border-blue-400/50"
        >
          RESTART JOURNEY
        </button>
      </div>
    </div>
  );
}
