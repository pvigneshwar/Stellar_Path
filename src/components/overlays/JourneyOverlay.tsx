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
          Free 3D View Movement button (both bottom-8/10). Nudged down twice
          now per follow-up requests (68%/64% -> 76%/72% -> 84%/80%) so it
          reads clearly as sitting below Earth's disk rather than crowding
          its lower edge; still checked against the bottom-8/10 HUD elements
          at each step — 84%/80% is close to that floor on short/mobile
          viewports, so a further push down from here would need shrinking
          or hiding the bottom HUD first rather than just raising the
          percentage again. The launch-phase
          header above is intentionally left at its own top position —
          that one has to stay clear of the ROCKET, not Earth, and moving
          it here would undo that earlier fix. */}
      <div className="absolute top-[84%] sm:top-[80%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-xl px-4">
        {activeSatelliteData && (
          // key={activeSatelliteData.id}: same remount-on-change trick as
          // the launch label above, so the text-materialize effect
          // replays for every satellite transition, not just the first.
          <div key={activeSatelliteData.id} className="animate-fade-in transition-all duration-300">
            <div className="flex items-center justify-center gap-2">
              <span
                className={`hud-bracket inline-flex items-center gap-1.5 border px-3 py-0.5 text-[11px] font-technical font-semibold uppercase tracking-[0.18em] ${
                  getTrajectoryBadge(activeSatelliteData.orbitType).color
                }`}
              >
                <Orbit className="h-3 w-3 animate-spin-slow" />
                {getTrajectoryBadge(activeSatelliteData.orbitType).label}
              </span>
            </div>
            <h3 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_0_14px_rgba(0,180,255,0.3)]">
              {activeSatelliteData.name}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Launched in <span className="font-semibold text-cyan-400">{activeSatelliteData.year}</span> via{" "}
              <span className="font-semibold text-slate-200">{activeSatelliteData.launchVehicle}</span>
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
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-fade-in">
          <p className="font-technical text-5xl sm:text-6xl font-bold tracking-[0.15em] text-cyan-300 drop-shadow-[0_0_18px_rgba(0,200,255,0.4)]">
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
          className={`hud-panel hud-bracket pointer-events-auto bottom-8 right-8 sm:bottom-10 sm:right-10 flex items-center gap-2 px-4 py-2.5 font-technical text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors ${
            freeView ? "text-cyan-300" : "text-slate-300 hover:text-cyan-300"
          }`}
          aria-pressed={freeView}
        >
          <RotateCw className={`h-3.5 w-3.5 ${freeView ? "animate-spin-slow" : ""}`} />
          {freeView ? "Free 3D View Movement: On" : "Free 3D View Movement"}
        </button>
      )}

      {/* ── Flight Telemetry HUD (Bottom Left) — safe-area margins ──
          Instrument-panel framing (hud-panel + hud-bracket corners) in
          place of the rounded glassmorphism card, matching a mission-
          control console rather than a floating app widget. */}
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
