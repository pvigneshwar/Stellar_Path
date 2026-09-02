# Performance Fix List — "Ensure the whole site runs more smoothly"

Status: **A1–A3 implemented (01/09/2026)**. **B1 / Phase 5 (adaptive texture variants)** and **B2 / Phase 6 (staged GLB preload)** are both code-scaffolded (01/09/2026), flags off by default — see their sections below for what's still needed from you. B3 still proposed, pending your decision. Findings from a full read-through of the render pipeline (Canvas/GL settings, lighting, textures, GLB loading, scroll/state architecture) on 01/09/2026.

---

## A. Safe code-only fixes (no visual downgrade, no asset changes) — DONE

### A1. Throttle `progress` React state updates during scroll — ✅ implemented
**File:** `src/components/providers/JourneyProvider.tsx`

The smoothing rAF loop calls `setProgress(next)` on almost every animation frame while the eased value is catching up to the raw scroll target — i.e. up to ~60x/second during and just after any scroll. `progress` (the React state, not `progressRef`) is a dependency of `JourneyOverlay.tsx`, which is a fairly heavy JSX tree (label-range lookups, telemetry interpolation, several conditional blocks, HUD panel). That means React re-renders and diffs that entire overlay tree in lockstep with the WebGL frame loop, competing with 3D rendering on the same main thread.

**Fix:** only call `setProgress()` when the value has changed enough to matter for the UI (e.g. round to 3 decimal places and compare against the last emitted value before calling setState), instead of unconditionally every frame. The 3D scene itself is unaffected — `JourneyScene.tsx` already reads the unthrottled `progressRef.current` directly in `useFrame`, never the React `progress` state.

**Expected impact:** likely the single biggest contributor to perceived scroll jank, since it's a per-frame React re-render of a non-trivial component tree, not a GPU cost.

**Implemented as:** `lastEmittedProgressRef` in `JourneyProvider.tsx`, checked in both the smoothing-loop `tick()` and `setProgressDirect()` before calling `setProgress()`.

---

### A2. Gate shadow mapping behind `performanceMode` — ✅ implemented
**Files:** `src/components/scene/SpaceEnvironment.tsx`, `src/components/scene/Earth.tsx`

The main directional light in `SpaceEnvironment.tsx` has `castShadow` with a 2048×2048 shadow map (`shadow-mapSize={[2048, 2048]}`), rendered every frame regardless of `performanceMode`. The *only* mesh in the scene using it is Earth (`castShadow receiveShadow` in `Earth.tsx`) — self-shadowing itself. Earth's day/night look is already produced by the custom atmosphere terminator shader (`ATMOSPHERE_FRAG`), so the actual visual contribution of the real shadow map is minimal, but the render cost (extra shadow-camera pass every frame, 2048² depth buffer) is paid on every device tier including "low".

**Fix:** make `castShadow` on the directional light and `castShadow`/`receiveShadow` on Earth's mesh conditional on `performanceMode` (e.g. off entirely on "low", smaller shadow map on "medium", current behavior only on "high").

**Implemented as:** `castShadow={performanceMode !== "low"}` + `shadow-mapSize` dropping to `[1024,1024]` on non-"high" in `SpaceEnvironment.tsx`; matching `castShadow`/`receiveShadow` gating on Earth's mesh in `Earth.tsx`.

---

### A3. Cap device-pixel-ratio (DPR) on the Canvas — ✅ implemented
**File:** `src/components/scene/JourneyScene.tsx` (the `<Canvas>` element)

`usePerformanceMode.ts` already detects device capability (memory, cores, WebGL tier) but its result is only wired into `gl.powerPreference` — nothing currently caps DPR. On a high-DPI phone (device pixel ratio 3), every render pass draws 9x the pixels of DPR 1 with no quality gate at all.

**Fix:** add `dpr={[1, performanceMode === "high" ? 2 : 1]}` (or similar) to the `<Canvas>` props, scaled by `performanceMode`. Standard R3F performance practice, currently entirely absent from this Canvas config.

**Implemented as:** exactly that — `dpr={[1, performanceMode === "high" ? 2 : 1]}` added to `<Canvas>` in `JourneyScene.tsx`.

---

## B. Bigger wins — need a decision, not just a code edit (not started)

### B1 / Phase 5. Texture payload is ~33MB on disk, much more in decoded VRAM — code scaffolded, disabled by default
**Files:** `public/textures/8k_moon.jpg` (15MB), `8k_mars.jpg` (8.4MB), `8k_sun.jpg` (3.7MB), `8k_earth_daymap.jpg` (4.5MB), `8k_stars_milky_way.jpg` (1.9MB)

`8k_moon.jpg` alone is a 8192×4096 JPEG — once decoded for the GPU that's roughly 130MB+ of raw VRAM for a single texture (JPEG compression doesn't carry over to GPU memory), and Moon/Mars/Sun together occupy a modest fraction of the screen even when active. Combined with Earth and the starfield backdrop, this is likely the largest real contributor to load time and to VRAM pressure on mid/low-end and mobile GPUs.

**Status (01/09/2026):** implemented the code side of `enhanced-space-project-performance-solution.md`'s Phase 5, gated behind `PERFORMANCE_FLAGS.adaptiveTextures` (default `false` — zero behavior change until flipped):
- `src/lib/textures.ts` — `getAdaptiveTexturePath(body, mode)` resolves each body's texture path once from `performanceMode`: low → 2K variant, medium → 4K variant, high (or the flag off) → the untouched original file. Earth/Moon/Mars/Sun/starfield all covered.
- `src/lib/loadTextureWithFallback.ts` — two-stage loader: tries the adaptive variant, retries once against the ORIGINAL file if it 404s, only then falls back to the existing procedural texture. Wired into `Earth.tsx`, `CelestialBody.tsx` (+ its new `fallbackTexturePath` prop, threaded from `JourneyScene.tsx`'s `DestinationBodies`), and `SpaceEnvironment.tsx`'s `StarfieldTexture`.
- `scripts/optimize-textures.mjs` — the actual re-encode, NOT run by this session (no image-processing tool reachable via the filesystem connector). Generates `public/textures/<body>/<stem>-{2k,4k}.webp` from the existing 8K sources via `sharp`, creates new files only, never touches the originals.

**Still needed from you before this does anything:** the texture files have been generated (`npm install --save-dev sharp && node scripts/optimize-textures.mjs` ran successfully — all 10 2K/4K `.webp` variants now exist under `public/textures/{earth,moon,mars,sun,starfield}/`). Flip `adaptiveTextures: true` in `src/lib/performanceFlags.ts` and go through the regression matrix below across all three `performanceMode` tiers (texture load in every tier, no flipped/washed-out/color-shifted results, closest-permitted camera view on each body) before shipping. Until that flag is flipped, every texture still loads exactly as it does today.

---

### B2 / Phase 6. All 23 satellite GLBs preload unconditionally on page load — code scaffolded, disabled by default
**File:** `src/components/scene/SatelliteModel.tsx` (`UNIQUE_GLB_URLS.forEach((url) => useGLTF.preload(url))`)

This warms the model cache so fast-scrolling never hits an un-fetched satellite mid-journey (a deliberate earlier fix — see `state.json` changelog), but it also means the browser fires off ~23 simultaneous GLB downloads immediately on module load, before the user has even started the journey. Could measurably delay time-to-interactive on slower connections.

**Status (01/09/2026):** implemented the code side of `enhanced-space-project-performance-solution.md`'s Phase 6, gated behind `PERFORMANCE_FLAGS.stagedGlbPreload` (default `false` — zero behavior change until flipped; `PRELOAD_BEHIND=2`/`PRELOAD_AHEAD=3` in `performanceFlags.ts` already matched the doc's recommended window):
- `src/components/scene/SatelliteModel.tsx` — `preloadModelWindow(activeIndex)`: warms every GLB from `activeIndex - PRELOAD_BEHIND` to `activeIndex + PRELOAD_AHEAD` (journey order, via a new ordered `JOURNEY_GLB_URLS`, not the existing deduped `UNIQUE_GLB_URLS`). No-ops entirely when the flag is off. With the flag off, the exact previous behavior — every unique GLB preloaded unconditionally at module load — is untouched (this is the doc's required immediate-rollback path). With the flag on, module load instead warms only Aryabhata + its next three neighbors (`preloadModelWindow(0)`, the doc's "startup protection" requirement, satisfied automatically since `PRELOAD_AHEAD=3`).
- `src/components/scene/JourneyScene.tsx`'s `SatelliteEvolution` — calls `preloadModelWindow(satelliteIndex)` in a `useEffect` keyed on `satelliteIndex`, so the window re-centers whenever the active mission changes (not on every animation frame, per the doc's own instruction).
- No eviction logic added anywhere — matches the doc's cache policy ("do not aggressively clear loaded GLBs... only consider eviction after measuring memory pressure on real devices") by simply not implementing any.

**Known gaps versus the full doc spec (§8), left out of this pass as bigger architectural changes needing your input, not blocked on anything technical):**
- **Entry-button gating** ("do not enable the journey entry button until the minimum startup set is ready, or show honest loading progress") — not implemented; the entry button's current ready/enabled logic wasn't touched.
- **Fast-scroll target protection** ("hold the previously valid model... never advance the displayed mission metadata to a model that is not ready") — not implemented; `setActiveSatellite`/the HUD still advance immediately with scroll progress regardless of whether that mission's GLB has actually finished loading. The existing Suspense-based procedural fallback (`GLBModel`'s `<Suspense>` in `SatelliteModel.tsx`) still means nothing ever renders `null` for the visible satellite — that part of the doc's protection already held before this phase and still does — but a fast enough scroll into an un-preloaded model can still show the procedural placeholder briefly instead of holding the last real model, and the mission label can outrun it.

Given the generous window (2 behind + 3 ahead) and no cache eviction, a genuine miss should be rare in practice, but — per the doc's own "immediate rollback condition" list — needs real-device testing (fast forward/reverse scroll, rapid direction changes) before shipping, same as Phase 5.

**Still needed from you before this does anything:** flip `stagedGlbPreload: true` in `src/lib/performanceFlags.ts`, then work through the doc's regression matrix — model correctness across slow/fast/reverse/rapid-alternating scroll, no missing satellite at any tested position, no pop-in, mission info never mismatched with the visible model — and roll straight back to `false` if any of the doc's five rollback conditions show up. Until that flag is flipped, every GLB still preloads exactly as it does today.

---

### B3. Unused dependency: `lenis`
**File:** `package.json`

`lenis` (a smooth-scroll library) is listed as a dependency but doesn't appear to be imported anywhere in `src/` — the project rolls its own scroll handling in `JourneyProvider.tsx`. If confirmed unused, removing it trims install size and bundle surface area slightly.

**Fix (proposed, not started):** confirm no import anywhere, then remove from `package.json` and reinstall lockfile. Low priority, low risk.

---

## Suggested order of execution
1. ~~A1 (throttle progress state)~~ — done 01/09/2026
2. ~~A2 (gate shadows)~~ — done 01/09/2026
3. ~~A3 (DPR cap)~~ — done 01/09/2026
4. B3 (remove `lenis`) — trivial once confirmed unused, awaiting go-ahead
5. ~~B1 / Phase 5 (texture re-encode)~~ — code scaffolded 01/09/2026, flag off by default; you still need to run `scripts/optimize-textures.mjs` locally and flip `PERFORMANCE_FLAGS.adaptiveTextures` before it's actually live
6. ~~B2 / Phase 6 (staged GLB preload)~~ — code scaffolded 01/09/2026, flag off by default; most behavior-sensitive of everything in this doc, so flip `PERFORMANCE_FLAGS.stagedGlbPreload` and go through the fast/reverse/rapid-alternating-scroll regression matrix carefully before shipping
