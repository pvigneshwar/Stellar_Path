"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Loading Screen
 *
 * Immersive loading experience with step-by-step status messages.
 * Shows while 3D assets (textures, models) are being fetched.
 */
import { useEffect, useState } from "react";
import { useJourney } from "@/components/providers/JourneyProvider";

const LOADING_STEPS = [
  "Initializing space journey...",
  "Loading Earth...",
  "Loading spacecraft...",
  "Preparing orbital systems...",
  "Synchronizing mission data...",
  "READY",
];

export function LoadingScreen({ onReady, fadingOut = false }: { onReady?: () => void; fadingOut?: boolean }) {
  const { started, startJourney } = useJourney();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (started) return;

    const timer = setTimeout(() => {
      if (step < LOADING_STEPS.length - 1) {
        setStep(step + 1);
        setProgress(((step + 1) / (LOADING_STEPS.length - 1)) * 100);
      }
    }, 500 + Math.random() * 300);

    return () => clearTimeout(timer);
  }, [step, started]);

  if (started) return null;

  return (
    // Semi-transparent black (90%) lets the 3D scene breathe through during
    // loading, avoiding a hard blackout before the cinematic handoff.
    // Fades out when assetsLoaded (parent passes fadingOut=true) or when
    // the user clicks the CTA (started=true).
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white transition-opacity duration-700 ${
      started || fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
    }`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-transparent blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-800/20 to-transparent blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* "STELLAR PATH" */}
        <div className="space-y-1 text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            STELLAR
          </h1>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-blue-400 sm:text-5xl md:text-6xl">
            PATH
          </h2>
        </div>

        {/* Loading bars */}
        <div className="w-64 space-y-3">
          <div className="relative h-0.5 w-full bg-gray-800/50">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="font-mono text-xs text-gray-400">
            {LOADING_STEPS[step]}
          </div>

          <div className="flex justify-between text-[10px] text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* CTA — appears when loading is "complete" */}
        {step === LOADING_STEPS.length - 1 && (
          <button
            onClick={() => {
              if (onReady) onReady();
              startJourney();
            }}
            className="group cursor-pointer rounded-full border border-blue-400/30 bg-gradient-to-b from-blue-500 to-purple-600 px-8 py-3 font-ui text-lg font-semibold text-white transition-all duration-300 hover:border-blue-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]"
          >
            <span className="flex items-center gap-2">
              WITNESS THE JOURNEY
              <span className="text-xs">→</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
