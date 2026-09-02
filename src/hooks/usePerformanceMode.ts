/**
 * INDIA'S JOURNEY BEYOND EARTH — usePerformanceMode Hook
 *
 * Detects device capability and returns a performance mode string.
 * Used for quality scaling (particle counts, texture resolution, post-processing).
 */
import { useState, useEffect } from "react";
import type { PerformanceMode } from "@/lib/types";

export function usePerformanceMode(): PerformanceMode {
  const [mode, setMode] = useState<PerformanceMode>("high");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let score = 0;

    // Device memory (if available)
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (deviceMemory !== undefined) {
      if (deviceMemory >= 8) score += 2;
      else if (deviceMemory >= 4) score += 1;
      else score -= 1;
    }

    // Hardware concurrency
    const cores = navigator.hardwareConcurrency ?? 4;
    if (cores >= 8) score += 2;
    else if (cores >= 4) score += 1;
    else score -= 1;

    // Touch capability hint
    if ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 1) score -= 1;

    // WebGL support check (lightweight)
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) score -= 3;
      else {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const info = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (typeof info === "string" && info.includes("SwiftShader")) score -= 2;
        }
      }
      canvas.remove();
    } catch {
      score -= 1;
    }

    // Determine mode
    if (score >= 3) setMode("high");
    else if (score >= 0) setMode("medium");
    else setMode("low");
  }, []);

  return mode;
}
