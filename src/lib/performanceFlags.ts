/**
 * INDIA'S JOURNEY BEYOND EARTH — Centralized Performance Feature Flags
 *
 * Behavior-sensitive optimizations live here so they can be toggled
 * individually without touching scene/render code. Each flag defaults
 * to the safest setting; enable only after verifying the corresponding
 * feature in its own test release.
 *
 * Derived from: enhanced-space-project-performance-solution.md §12
 */
export const PERFORMANCE_FLAGS = {
  adaptiveDpr: true,       // Phase 2: cap DPR by performance mode
  adaptiveShadows: true,   // Phase 3: gate shadow maps by performance mode
  adaptiveTextures: false, // Phase 5: use 2K/4K texture variants instead of 8K originals
  stagedGlbPreload: false,  // Phase 6: sliding-window GLB preload instead of full preload
} as const;

/**
 * Window sizes (in model count) for the staged GLB preload window.
 * Active index is always included. PRELOAD_BEHIND models preceding and
 * PRELOAD_AHEAD models following are kept warm.
 *
 * Derived from: enhanced-space-project-performance-solution.md §8
 */
export const PRELOAD_BEHIND = 2;
export const PRELOAD_AHEAD = 3;
