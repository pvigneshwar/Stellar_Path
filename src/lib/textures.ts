/**
 * INDIA'S JOURNEY BEYOND EARTH — Adaptive Texture Selection (Phase 5)
 *
 * Behind PERFORMANCE_FLAGS.adaptiveTextures (default false — see
 * performanceFlags.ts). When enabled, each body's texture path is chosen
 * ONCE from performanceMode (device tier only changes on an explicit
 * settings change, never mid-scroll — see the "safe texture loader
 * policy" note below) instead of always loading the original file.
 *
 * The 2K/4K .webp variant files this module references are NOT generated
 * by this codebase — see scripts/optimize-textures.mjs for how to produce
 * them locally (requires `npm install --save-dev sharp`, run outside the
 * filesystem-connector session that wrote this). Until those files exist
 * on disk, loadTextureWithFallback() (loadTextureWithFallback.ts)
 * transparently falls back to each body's ORIGINAL file the first time a
 * variant 404s — so enabling the flag before running the script is a
 * safe no-op (everything just keeps loading the original), never a
 * broken image.
 *
 * Selection policy (enhanced-space-project-performance-solution.md §7):
 *   Moon/Mars/Sun : low → 2K, medium → 4K, high → original (as shipped)
 *   Earth         : low → 2K, medium → 4K, high → original (8K)
 *   Starfield     : low → 2K, medium → 2K, high → original (8K)
 * "high" always keeps the untouched original file untouched — capable
 * devices see zero quality change from this phase; only low/medium ever
 * move off the original.
 *
 * Safe texture loader policy: the tier is resolved once from
 * performanceMode (a value that itself only changes on an explicit
 * settings change — see usePerformanceMode.ts), never re-evaluated or
 * swapped mid-scroll.
 */
import type { PerformanceMode } from "./types";
import { PERFORMANCE_FLAGS } from "./performanceFlags";
import {
  LOCAL_EARTH_TEXTURE,
  LOCAL_MOON_TEXTURE,
  LOCAL_MARS_TEXTURE,
  LOCAL_SUN_TEXTURE,
  LOCAL_STARFIELD_TEXTURE,
} from "./constants";

export type AdaptiveTextureBody = "earth" | "moon" | "mars" | "sun" | "starfield";

const ORIGINAL: Record<AdaptiveTextureBody, string> = {
  earth: LOCAL_EARTH_TEXTURE,
  moon: LOCAL_MOON_TEXTURE,
  mars: LOCAL_MARS_TEXTURE,
  sun: LOCAL_SUN_TEXTURE,
  starfield: LOCAL_STARFIELD_TEXTURE,
};

// File-name stem used under public/textures/<body>/<stem>-{2k,4k}.webp —
// matches the folder layout in
// enhanced-space-project-performance-solution.md §7 (earth's stem is
// "earth-day" to match that doc's example tree; every other body's stem
// is just its own name).
const STEM: Record<AdaptiveTextureBody, string> = {
  earth: "earth-day",
  moon: "moon",
  mars: "mars",
  sun: "sun",
  starfield: "starfield",
};

function variantPath(body: AdaptiveTextureBody, size: "2k" | "4k"): string {
  return `/textures/${body}/${STEM[body]}-${size}.webp`;
}

/**
 * The adaptive path for a body at the given performance tier. Returns the
 * ORIGINAL untouched file whenever PERFORMANCE_FLAGS.adaptiveTextures is
 * off, or on "high" regardless of the flag. Call once per mount (e.g. via
 * useMemo keyed on performanceMode) — never per-frame.
 */
export function getAdaptiveTexturePath(body: AdaptiveTextureBody, mode: PerformanceMode): string {
  if (!PERFORMANCE_FLAGS.adaptiveTextures) return ORIGINAL[body];
  if (mode === "high") return ORIGINAL[body];
  if (mode === "medium") return body === "starfield" ? variantPath(body, "2k") : variantPath(body, "4k");
  return variantPath(body, "2k");
}

/**
 * The original/full-quality path for a body — used as the second-stage
 * fallback (loadTextureWithFallback.ts) when an adaptive variant fails to
 * load, per the doc's "fall back to the original file if an optimized
 * variant fails to load" safeguard.
 */
export function getOriginalTexturePath(body: AdaptiveTextureBody): string {
  return ORIGINAL[body];
}
