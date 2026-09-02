"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Hero Overlay
 *
 * Full-screen introductory overlay shown before the 3D journey begins.
 * Sits on top of the persistent JourneyScene canvas, which renders the
 * Gaganyaan-orbiting-Earth composition (see HeroOrbit in JourneyScene.tsx)
 * behind this overlay pre-journey.
 *
 * Layout notes:
 *  - Title sits in the lower-third so the upper 2/3 of frame stays clear
 *    for the Earth + orbiting satellite composition.
 *  - A bottom gradient scrim (not a hard box) gives the title contrast
 *    against bright Earth/star detail without looking like an opaque panel
 *    bolted onto the scene — consistent with the app's existing
 *    glassmorphism language rather than a new visual pattern.
 *  - The telemetry HUD (bottom-left) mirrors the exact glass-panel pattern
 *    already used in JourneyOverlay's in-journey Flight Telemetry HUD, kept
 *    visible (not hidden) down to small mobile widths per the responsive
 *    requirement, just narrower.
 *  - Fades in on mount (animate-fade-in-up, already defined in
 *    globals.css) so the Loading → Hero handoff reads as an intentional
 *    cinematic transition instead of a hard cut.
 */
import { useJourney } from "@/components/providers/JourneyProvider";
import { SATELLITES } from "@/lib/data/satellites";
import { Activity, Compass, Gauge, Orbit, Radio, Rocket } from "lucide-react";

const GAGANYAAN = SATELLITES.find((s) => s.id === "gaganyaan")!;

export function HeroOverlay() {
  const { started, startJourney } = useJourney();

  if (started) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ pointerEvents: started ? "none" : "auto" }}
    >
      {/* Bottom scrim — soft gradient, not a hard panel, for text contrast */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/*
       * Title block and HUD are stacked in normal document flow (not both
       * independently absolute-positioned) so they can never overlap on
       * narrow viewports — the title block's height pushes the HUD row
       * down rather than the two racing to the same bottom-left corner.
       */}
      <div className="animate-fade-in-up relative z-10 flex flex-col gap-6 pb-10 sm:gap-8 sm:pb-12 md:pb-16">
        {/* ── Mission spotlight badge + title block ── */}
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-slate-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-300 backdrop-blur-md">
          <Rocket className="h-3 w-3" />
          Mission Spotlight · Gaganyaan
        </span>

        <div className="mt-4 mb-8 space-y-2">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] sm:text-6xl">
            STELLAR
          </h1>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-blue-400 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] sm:text-5xl">
            PATH
          </h2>
        </div>

        <p className="mb-10 text-base text-gray-300 sm:text-lg">
          Explore India's journey from its first satellite to the future of space exploration.
        </p>

        <button
          onClick={startJourney}
          className="group cursor-pointer rounded-full border border-blue-400/30 bg-gradient-to-b from-blue-500 to-purple-600 px-8 py-3.5 font-ui text-lg font-semibold text-white shadow-[0_0_40px_rgba(0,212,255,0.3)] transition-all duration-300 hover:border-blue-300 hover:shadow-[0_0_50px_rgba(0,212,255,0.6)] sm:px-10 sm:py-4 sm:text-xl"
        >
          <span className="flex items-center gap-3">
            WITNESS THE JOURNEY
            <span
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </span>
        </button>
        </div>

        {/* ── Telemetry HUD — own row below the title block, safe-area spaced ── */}
        <div className="pointer-events-none pb-2 px-4 sm:pb-4 sm:px-8">
        <div className="w-44 rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-md shadow-2xl sm:w-64 sm:p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase text-cyan-400 sm:gap-2 sm:text-xs">
              <Radio className="h-3 w-3 animate-pulse sm:h-3.5 sm:w-3.5" />
              <span>Mission HUD</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping sm:h-2 sm:w-2" />
          </div>

          <div className="mt-2.5 space-y-1.5 font-mono text-[10px] sm:mt-3 sm:space-y-2 sm:text-xs">
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Compass className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Orbit:
              </span>
              <span className="font-bold text-cyan-400">{GAGANYAAN.orbitAltitude} km LEO</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Orbit className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Inclination:
              </span>
              <span className="font-bold text-purple-400">{GAGANYAAN.inclination}°</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Period:
              </span>
              <span className="font-bold text-white">{GAGANYAAN.orbitalPeriod} min</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Status:
              </span>
              <span className="font-semibold capitalize text-amber-400">Upcoming · {GAGANYAAN.year}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
