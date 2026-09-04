"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Flight Telemetry & Journey HUD Overlay
 *
 * Real-time flight HUD displaying active spacecraft telemetry:
 *   - Mission Title, Category, Year & Launch Vehicle
 *   - Real-Time Orbital Altitude (km), Velocity (km/s), and Period
 *   - Trajectory Mode badge (LEO, GEO, Lunar Transfer, Mars Transit, L1 Halo)
 *   - Phase transitions and launch progress indicators
 */
import { useJourney } from "@/components/providers/JourneyProvider";
import { SATELLITE_TRANSITION_BAND, COUNTDOWN_START, COUNTDOWN_END } from "@/lib/constants";
import { JOURNEY_SATELLITES } from "@/lib/data/journey";
import { SATELLITES } from "@/lib/data/satellites";
import { lerp } from "@/lib/utils";
import { Activity, Compass, Gauge, Orbit, Radio, Rocket, RotateCw } from "lucide-react";

type JourneyLabel = {
  range: [number, number];
  text: string;
  subtitle: string;
  telemetry?: {
    /** Altitude in km at the START of this label's range — interpolated, see interpolateLaunchTelemetry(). */
    altitudeKm: number;
    /** Velocity in km/s at the START of this label's range — interpolated, see interpolateLaunchTelemetry(). */
    velocityKmS: number;
    stage: string;
  };
};

// Numeric altitude/velocity keyframes at each phase boundary. Previously
// these were fixed per-label strings (e.g. "0.4 km/s" jumping straight to
// "1.8 km/s" the instant progress crossed into the next band), which read
// as sudden, physically-jarring jumps in the HUD. interpolateLaunchTelemetry()
// below linearly interpolates between consecutive keyframes based on the
// exact scroll progress, so the numbers climb smoothly instead of stepping.
const LAUNCH_LABELS: JourneyLabel[] = [
  {
    range: [0.10, 0.20],
    text: "THE JOURNEY BEGINS",
    subtitle: "Satish Dhawan Space Centre (SDSC-SHAR), Sriharikota",
    telemetry: { altitudeKm: 0, velocityKmS: 0.0, stage: "Pre-Launch Checks" },
  },
  {
    range: [0.20, 0.30],
    text: "IGNITION",
    subtitle: "Solid rocket boosters & core engine ignition",
    telemetry: { altitudeKm: 0.5, velocityKmS: 0.4, stage: "Booster Ignition" },
  },
  {
    range: [0.30, 0.45],
    text: "MAX-Q ASCENT",
    subtitle: "Ascending through maximum aerodynamic pressure",
    telemetry: { altitudeKm: 35, velocityKmS: 1.8, stage: "Atmospheric Ascent" },
  },
  {
    range: [0.45, 0.60],
    text: "MESOSPHERE CROSSING",
    subtitle: "Breaking through Earth's upper atmosphere into vacuum",
    telemetry: { altitudeKm: 85, velocityKmS: 3.6, stage: "Atmospheric Exit" },
  },
  {
    range: [0.60, 0.70],
    text: "SPACE INSERTION",
    subtitle: "Reaching Low Earth Orbit injection velocity",
    telemetry: { altitudeKm: 180, velocityKmS: 7.2, stage: "Orbital Insertion" },
  },
  {
    range: [0.70, 0.80],
    text: "STAGE SEPARATION",
    subtitle: "Booster jettison & payload fairing separation",
    telemetry: { altitudeKm: 240, velocityKmS: 7.8, stage: "Fairing Jettison" },
  },
  {
    range: [0.80, 1.00],
    text: "ARYABHATA (1975)",
    subtitle: "India's First Satellite deployed into Earth Orbit",
    telemetry: { altitudeKm: 594, velocityKmS: 7.56, stage: "Spacecraft Operational" },
  },
];

/**
 * Smoothly interpolate altitude/velocity between this label's keyframe and
 * the next label's keyframe based on exactly where `p` sits within the
 * current label's [start, end) range, instead of snapping straight to the
 * next label's fixed value the instant its range starts.
 */
function interpolateLaunchTelemetry(
  p: number,
  activeIndex: number
): { altitudeKm: number; velocityKmS: number } {
  const current = LAUNCH_LABELS[activeIndex]?.telemetry;
  const next = LAUNCH_LABELS[activeIndex + 1]?.telemetry;
  if (!current) return { altitudeKm: 0, velocityKmS: 0 };
  if (!next) return { altitudeKm: current.altitudeKm, velocityKmS: current.velocityKmS };

  const [start, end] = LAUNCH_LABELS[activeIndex]!.range;
  const t = end > start ? (p - start) / (end - start) : 0;
  return {
    altitudeKm: lerp(current.altitudeKm, next.altitudeKm, t),
    velocityKmS: lerp(current.velocityKmS, next.velocityKmS, t),
  };
}

export function JourneyOverlay() {
  const { progress, started, detailsOpen, freeView, toggleFreeView } = useJourney();

  if (!started || detailsOpen) return null;

  const p = progress;
  let activeLaunchLabel: JourneyLabel | null = null;
  let activeLaunchLabelIndex = -1;
  let activeSatelliteData: (typeof SATELLITES)[0] | null = null;
  let activeJourneySat: (typeof JOURNEY_SATELLITES)[0] | null = null;
  // Stage 7 (scrollytelling enhancement) — index into JOURNEY_SATELLITES
  // for the new right-edge progress rail below. Lifted out of the `else`
  // branch's local `satIndex` const so it's readable from the render
  // return further down; does not change how satIndex itself is derived.
  let activeSatelliteIndex = -1;

  if (p < 1.0) {
    for (let i = 0; i < LAUNCH_LABELS.length; i++) {
      const l = LAUNCH_LABELS[i]!;
      if (p >= l.range[0] && p < l.range[1]) {
        activeLaunchLabel = l;
        activeLaunchLabelIndex = i;
        break;
      }
    }
  } else {
    const evoProgress = p - 1.0;
    const satIndex = Math.min(
      Math.floor(evoProgress / SATELLITE_TRANSITION_BAND),
      JOURNEY_SATELLITES.length - 1
    );
    activeSatelliteIndex = satIndex;
    activeJourneySat = JOURNEY_SATELLITES[satIndex] ?? null;
    if (activeJourneySat) {
      activeSatelliteData = SATELLITES.find((s) => s.id === activeJourneySat?.id) ?? null;
    }
  }

  const liveTelemetry =
    activeLaunchLabelIndex >= 0 ? interpolateLaunchTelemetry(p, activeLaunchLabelIndex) : null;

  // ── Launch countdown — rocket stays hidden inside the Earth globe
  //     (see RocketLaunch in JourneyScene.tsx) until this T-minus readout
  //     reaches LIFTOFF, at which point the rocket has fully risen to the
  //     launch-pad surface and Ignition begins. Both windows share the
  //     same COUNTDOWN_START/END constants so they land in sync.
  const inCountdown = p >= COUNTDOWN_START && p < COUNTDOWN_END;
  const COUNTDOWN_STAGES = ["T-05", "T-04", "T-03", "T-02", "T-01", "LIFTOFF"];
  const countdownIndex = inCountdown
    ? Math.min(
        COUNTDOWN_STAGES.length - 1,
        Math.floor(
          ((p - COUNTDOWN_START) / (COUNTDOWN_END - COUNTDOWN_START)) * COUNTDOWN_STAGES.length
        )
      )
    : -1;

  // Trajectory title badge
  const getTrajectoryBadge = (orbitType: string) => {
    switch (orbitType.toUpperCase()) {
      case "LUNAR":
        return { label: "Translunar Injection Arc", color: "border-cyan-500/40 text-cyan-400 bg-cyan-950/40" };
      case "MARS":
        return { label: "Interplanetary Hohmann Transfer", color: "border-orange-500/40 text-orange-400 bg-orange-950/40" };
      case "L1":
        return { label: "Sun-Earth L1 Halo Orbit", color: "border-yellow-500/40 text-yellow-400 bg-yellow-950/40" };
      case "GEO":
        return { label: "Geostationary Synchronous Orbit", color: "border-purple-500/40 text-purple-400 bg-purple-950/40" };
      default:
        return { label: "Low Earth Orbit (LEO)", color: "border-blue-500/40 text-blue-400 bg-blue-950/40" };
    }
  };

  // Stage 10 (Holographic Details) — compact altitude readout for the new
  // small "object tracking" badge below, mirroring the same orbitType-based
  // fallback values already used in the Telemetry HUD panel further down.
  // Kept as its own small helper rather than refactoring that existing
  // inline ternary, so this addition stays isolated and low-risk.
  const getAltitudeLabel = (sat: (typeof SATELLITES)[0]) => {
    if (sat.orbitAltitude) return `${sat.orbitAltitude.toLocaleString()} KM`;
    switch (sat.orbitType.toUpperCase()) {
      case "LUNAR":
        return "384,400 KM";
      case "MARS":
        return "225M KM";
      case "L1":
        return "1.5M KM";
      default:
        return "600 KM";
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* ── Countdown blink (full-screen flash on every T-minus tick) ──
          Keyed to the countdown digit itself: whenever countdownIndex
          changes — in EITHER scroll direction, since it's derived purely
          from scroll progress like everything else in this component —
          React remounts this div and its `animate-countdown-blink`
          animation restarts from scratch. No timers or effects needed;
          it's just as scroll-driven/reversible as the countdown text
          itself. z-40 so the flash reads across the whole screen (3D
          canvas included), not just this overlay's own content. */}
      {countdownIndex >= 0 && (
        <div
          key={`countdown-blink-${countdownIndex}`}
          className="fixed inset-0 z-40 bg-black animate-countdown-blink"
        />
      )}

      {/* ── Main Narrative Header ──
          Moved from bottom-center to top (below the fixed navbar) so it
          never overlaps the 3D subject. The rocket/satellite/Earth are
          framed through the vertical center and lower-middle of the
          viewport throughout the journey (see CameraController in
          JourneyScene.tsx), so anchoring this text under the navbar
          keeps a clean UI safe-zone above the subject at every scroll
          position instead of sitting on top of it (e.g. previously the
          "IGNITION" label rendered directly over the rocket body). The
          Telemetry HUD stays bottom-left, which never overlapped. */}
      <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 text-center w-full max-w-xl px-4">
        {activeLaunchLabel && (
          // key={activeLaunchLabel.text}: forces React to remount this div
          // whenever the active launch-phase label changes, so the
          // text-materialize animation (see globals.css .animate-fade-in)
          // actually replays at each transition instead of only ever
          // playing once on first mount — same declarative remount-on-
          // change trick already used for the countdown-blink flash below.
          <div key={activeLaunchLabel.text} className="animate-fade-in transition-all duration-300">
            <span className="hud-bracket inline-flex items-center gap-1.5 border border-cyan-500/25 bg-slate-950/60 px-3 py-1 text-[11px] font-technical uppercase tracking-[0.2em] text-cyan-400">
              <Rocket className="h-3 w-3" />
              Launch Sequence
            </span>
            <h3 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_14px_rgba(0,180,255,0.25)]">
              {activeLaunchLabel.text}
            </h3>
            {activeLaunchLabel.subtitle && (
              <p className="mt-1 text-sm text-slate-300 drop-shadow">
                {activeLaunchLabel.subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Satellite Mission Naming (Below Earth) ──
          Moved out of the top safe-zone above and given its own position,
          per explicit request: during the satellite-evolution phase the
          camera (CAMERA_SATELLITE in JourneyScene.tsx) always looks
          directly at EARTH_POS via camera.lookAt(), so Earth renders
          centered in frame regardless of scroll position — its disk
          occupies roughly the middle ~40% of viewport height at the
          camera's fixed distance/FOV. top-[68%] sits safely below that
          disk while still clearing the bottom-anchored Telemetry HUD and
          Free 3D View Movement button. Nudged down twice per follow-up
          requests (68%/64% -> 76%/72% -> 84%/80%), but 84% on mobile
          collided with the button (bottom-8 at the time) on short
          viewports, so mobile was pulled back up to 72% and the button
          itself moved to bottom-20 (mobile only) with a shortened
          "Free View" label to free up room in that corner — sm: and up
          stay at 80%/bottom-10 unchanged. If this needs to move again,
          check both sides of that gap together rather than only this
          value. The launch-phase
          header above is intentionally left at its own top position —
          that one has to stay clear of the ROCKET, not Earth, and moving
          it here would undo that earlier fix. */}
      <div className="absolute top-[72%] sm:top-[80%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-xl px-4">
        {activeSatelliteData && (
          // Stage 9 (metamorphic transitions): this wrapper no longer carries
          // a per-satellite `key`, so React keeps the SAME frame mounted
          // across satellite changes instead of tearing it down and
          // rebuilding it -- the badge borders/backgrounds below now carry
          // `transition-colors duration-500` so a changed orbitType/category
          // value EASES between its old and new color instead of popping.
          // Only the actual label/name/year/vehicle TEXT still remounts (via
          // its own small key + the existing animate-fade-in/text-materialize
          // effect, 700ms, within the 300-800ms range), so the reader still
          // gets a clear "new content" cue without the whole panel
          // disappearing and reappearing.
          <div className="transition-all duration-500 ease-out">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={`hud-bracket inline-flex items-center gap-1.5 border px-3 py-0.5 text-[11px] font-technical font-semibold uppercase tracking-[0.18em] transition-colors duration-500 ease-out ${
                  getTrajectoryBadge(activeSatelliteData.orbitType).color
                }`}
              >
                <Orbit className="h-3 w-3 animate-spin-slow" />
                <span key={`${activeSatelliteData.id}-badge`} className="animate-fade-in">
                  {getTrajectoryBadge(activeSatelliteData.orbitType).label}
                </span>
              </span>
              {/* Stage 7 — mission category, from the same satellites.ts
                  record already being read for name/year/launchVehicle above.
                  Plain slate styling (not a trajectory color) so it doesn't
                  compete with the orbit badge for attention. */}
              <span className="hud-bracket inline-flex items-center border border-slate-500/25 bg-slate-950/50 px-3 py-0.5 text-[11px] font-technical font-semibold uppercase tracking-[0.18em] text-slate-300 transition-colors duration-500 ease-out">
                <span key={`${activeSatelliteData.id}-category`} className="animate-fade-in">
                  {activeSatelliteData.category.replace("-", " ")}
                </span>
              </span>
              {/* Stage 10 (Holographic Details) — a small decorative
                  "object tracking" indicator: a soft pulsing reticle dot
                  (Tailwind's built-in animate-ping, no new keyframes needed)
                  plus a compact altitude readout, styled muted/restrained
                  per the instructions' "subtle HUD" guidance rather than a
                  large targeting graphic. Decorative only — does not track
                  the satellite's actual on-screen position, since the
                  camera-relative screen position isn't available here. */}
              <span className="hud-bracket inline-flex items-center gap-1.5 border border-cyan-500/20 bg-slate-950/50 px-3 py-0.5 text-[11px] font-technical font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400/60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span key={`${activeSatelliteData.id}-tracking`} className="animate-fade-in">
                  Tracking · {getAltitudeLabel(activeSatelliteData)}
                </span>
              </span>
            </div>
            <h3 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_0_14px_rgba(0,180,255,0.3)]">
              <span key={activeSatelliteData.id} className="inline-block animate-fade-in">
                {activeSatelliteData.name}
              </span>
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Launched in{" "}
              <span key={`${activeSatelliteData.id}-year`} className="inline-block font-semibold text-cyan-400 animate-fade-in">
                {activeSatelliteData.year}
              </span>{" "}
              via{" "}
              <span key={`${activeSatelliteData.id}-vehicle`} className="inline-block font-semibold text-slate-200 animate-fade-in">
                {activeSatelliteData.launchVehicle}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Launch Countdown (center screen) ──
          Shown only while the rocket is still rising from inside the Earth
          globe to the launch pad (COUNTDOWN_START–COUNTDOWN_END). Placed
          in the vertical middle rather than the top safe-zone (already used
          by the "THE JOURNEY BEGINS" title above) or the bottom-left HUD,
          so it doesn't collide with either — and center-screen is exactly
          where the viewer's eye already is, since the rocket itself isn't
          visible yet to look at (it's still inside the globe). */}
      {countdownIndex >= 0 && (
        /* Stage 11 (responsive audit): this block previously had no width
           constraint and only one font-size step (text-5xl sm:text-6xl).
           At the 390px/430px mobile breakpoints, "LIFTOFF" (7 chars) at
           3rem with tracking-[0.15em] ran close to/at the viewport edge.
           Added a max-w/px-4 safe area (matching the pattern already used
           by the launch-label header above) and a smaller mobile-only font
           size + tighter tracking, both easing up to the original 5xl/6xl
           values from sm: upward -- unchanged on tablet/laptop/desktop. */
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs px-4 text-center animate-fade-in sm:max-w-none">
          {/* countdown-glitch-text (globals.css) runs continuously for as
              long as this block is mounted (i.e. the whole T-05→LIFTOFF
              span, not just on each digit change): a slow, low-frequency
              chromatic-split glitch that also flickers the text's own
              font-family briefly through the site's other two local faces
              (IBM Plex Mono Local, Space Grotesk) before settling back on
              the display face (Orbitron) -- all three are the fonts
              already self-hosted from public/fonts/, no new assets.
              data-text mirrors the visible content so the two ghost-copy
              pseudo-elements have something to render; dropped the old
              font-technical class since the glitch animation now owns
              font-family for this element. */}
          <p
            data-text={COUNTDOWN_STAGES[countdownIndex]}
            className="countdown-glitch-text text-4xl font-bold tracking-[0.08em] text-cyan-300 drop-shadow-[0_0_18px_rgba(0,200,255,0.4)] sm:text-5xl sm:tracking-[0.15em] md:text-6xl"
          >
            {COUNTDOWN_STAGES[countdownIndex]}
          </p>
        </div>
      )}

      {/* ── Free 3D View Movement toggle (Bottom Right) — mirrors the Telemetry
          HUD's safe-area margins on the opposite corner. Only shown once
          the satellite-evolution phase is reached (p >= 1.0), matching
          JourneyScene's own inFreeView gate (freeView && progress >= 1.0)
          — before that, there's no destination body/satellite yet for
          Free 3D View Movement to orbit around. pointer-events-auto since
          this overlay's root wrapper is pointer-events-none. Toggling
          this does not stop each body's own automatic idle-spin rotation
          or the satellite's scroll-driven orbital motion — it only hands
          camera control to the user, on top of that existing motion. */}
      {p >= 1.0 && (
        <button
          type="button"
          onClick={toggleFreeView}
          style={{ position: "fixed", zIndex: 9999 }}
          className={`hud-panel hud-bracket pointer-events-auto bottom-20 right-4 sm:bottom-10 sm:right-10 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 font-technical text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors ${
            freeView ? "text-cyan-300" : "text-slate-300 hover:text-cyan-300"
          }`}
          aria-pressed={freeView}
        >
          <RotateCw className={`h-3.5 w-3.5 ${freeView ? "animate-spin-slow" : ""}`} />
          <span className="sm:hidden">{freeView ? "Free View: On" : "Free View"}</span>
          <span className="hidden sm:inline">{freeView ? "Free 3D View Movement: On" : "Free 3D View Movement"}</span>
        </button>
      )}

      {/* ── Flight Telemetry HUD (Bottom Left) — safe-area margins ──
          Instrument-panel framing (hud-panel + hud-bracket corners) in
          place of the rounded glassmorphism card, matching a mission-
          control console rather than a floating app widget. */}
      {p >= 1.0 && activeSatelliteIndex >= 0 && (
        <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3 pointer-events-none">
          <span className="font-technical text-[10px] tracking-[0.15em] text-slate-400">
            {String(activeSatelliteIndex + 1).padStart(2, "0")}/{JOURNEY_SATELLITES.length}
          </span>
          <div className="flex flex-col items-center gap-1.5">
            {JOURNEY_SATELLITES.map((sat, i) => {
              const isActive = i === activeSatelliteIndex;
              const isPast = i < activeSatelliteIndex;
              return (
                <span
                  key={sat.id}
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? "h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.8)]"
                      : isPast
                        ? "h-1 w-1 bg-slate-300/70"
                        : "h-1 w-1 bg-slate-600/40"
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="absolute bottom-8 left-8 sm:bottom-10 sm:left-10 hidden sm:block">
        <div className="hud-panel hud-bracket p-4 w-64">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-[11px] font-technical font-semibold uppercase tracking-[0.15em] text-cyan-400">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Telemetry</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="mt-3 space-y-2 font-technical text-xs">
            {/* "Velocity" (not "Speed") throughout — matches the label used
                once the satellite-evolution phase takes over below, so the
                HUD never switches terminology mid-journey. Values are the
                smoothly-interpolated numbers from liveTelemetry rather than
                the fixed per-phase strings, so they climb continuously
                instead of jumping at each phase boundary. */}
            {p < 1.0 && activeLaunchLabel?.telemetry && liveTelemetry && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Velocity:</span>
                  <span className="text-white font-bold">{liveTelemetry.velocityKmS.toFixed(2)} km/s</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" /> Altitude:</span>
                  <span className="text-cyan-400 font-bold">
                    {liveTelemetry.altitudeKm < 1
                      ? `${Math.round(liveTelemetry.altitudeKm * 1000)} m`
                      : `${liveTelemetry.altitudeKm.toFixed(1)} km`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Phase:</span>
                  <span className="text-emerald-400 font-semibold">{activeLaunchLabel.telemetry.stage}</span>
                </div>
              </>
            )}

            {p >= 1.0 && activeSatelliteData && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Velocity:</span>
                  <span className="text-white font-bold">
                    {activeSatelliteData.orbitType.toUpperCase() === "GEO"
                      ? "3.07 km/s"
                      : activeSatelliteData.orbitType.toUpperCase() === "LUNAR"
                      ? "1.68 km/s"
                      : activeSatelliteData.orbitType.toUpperCase() === "MARS"
                      ? "4.40 km/s"
                      : "7.58 km/s"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" /> Altitude:</span>
                  <span className="text-cyan-400 font-bold">
                    {activeSatelliteData.orbitAltitude
                      ? `${activeSatelliteData.orbitAltitude.toLocaleString()} km`
                      : activeSatelliteData.orbitType.toUpperCase() === "LUNAR"
                      ? "384,400 km"
                      : activeSatelliteData.orbitType.toUpperCase() === "MARS"
                      ? "225M km"
                      : activeSatelliteData.orbitType.toUpperCase() === "L1"
                      ? "1.5M km"
                      : "600 km"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Orbit className="h-3.5 w-3.5" /> Inclination:</span>
                  <span className="text-purple-400 font-bold">
                    {activeSatelliteData.inclination ? `${activeSatelliteData.inclination}°` : "Equatorial"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      activeSatelliteData.status === "operational"
                        ? "text-emerald-400"
                        : activeSatelliteData.status === "completed"
                        ? "text-blue-400"
                        : activeSatelliteData.status === "failed"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {activeSatelliteData.status}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
