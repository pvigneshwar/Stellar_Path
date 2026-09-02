/**
 * INDIA'S JOURNEY BEYOND EARTH — Two-Stage Texture Loader (Phase 5)
 *
 * Shared by Earth.tsx, CelestialBody.tsx, and SpaceEnvironment.tsx's
 * StarfieldTexture. Tries `primaryPath` (which may be an adaptive 2K/4K
 * variant from lib/textures.ts) first; if that fails to load, retries
 * once with `fallbackPath` (the body's ORIGINAL full-quality file)
 * before finally giving up and calling onError — implementing the doc's
 * "fall back to the original file if an optimized variant fails to load"
 * safeguard, so a missing/not-yet-generated variant never breaks a body,
 * it just quietly loads the original instead. When primaryPath and
 * fallbackPath are the same (adaptiveTextures off, or "high" tier —
 * see lib/textures.ts), this behaves exactly like the original
 * single-stage TextureLoader().load() every call site used before.
 */
import * as THREE from "three";

export function loadTextureWithFallback(
  primaryPath: string,
  fallbackPath: string,
  onLoad: (tex: THREE.Texture) => void,
  onError: () => void
): () => void {
  let cancelled = false;
  const loader = new THREE.TextureLoader();

  const tryLoad = (path: string, isFinalAttempt: boolean) => {
    loader.load(
      path,
      (tex) => {
        if (!cancelled) onLoad(tex);
      },
      undefined,
      () => {
        if (cancelled) return;
        if (!isFinalAttempt) {
          tryLoad(fallbackPath, true);
        } else {
          onError();
        }
      }
    );
  };

  tryLoad(primaryPath, primaryPath === fallbackPath);

  return () => {
    cancelled = true;
  };
}
