#!/usr/bin/env node
/**
 * INDIA'S JOURNEY BEYOND EARTH — Phase 5 texture-variant generator
 * Derived from: enhanced-space-project-performance-solution.md §7
 *
 * Generates 2K/4K WebP variants of the project's original texture files
 * into public/textures/<body>/<stem>-{2k,4k}.webp, matching the file
 * layout lib/textures.ts expects. This script ONLY creates new files —
 * it never modifies or deletes any existing original (8k_*.jpg) file,
 * per the doc's explicit safeguard.
 *
 * NOT run automatically by this codebase or by any build step. Run it
 * yourself, locally, once:
 *
 *   npm install --save-dev sharp
 *   node scripts/optimize-textures.mjs
 *
 * After it finishes, flip PERFORMANCE_FLAGS.adaptiveTextures to true in
 * src/lib/performanceFlags.ts and go through fix.md's full regression
 * matrix across all three performanceMode tiers before shipping — until
 * you do, the flag stays false and every texture loads exactly as it
 * does today (see lib/textures.ts / loadTextureWithFallback.ts, which
 * both treat a missing variant as a no-op fallback to the original).
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_TEXTURES = join(__dirname, "..", "public", "textures");

// [source file under public/textures/, output subfolder, output stem]
// Stems match lib/textures.ts's STEM map exactly.
const JOBS = [
  ["8k_earth_daymap.jpg", "earth", "earth-day"],
  ["8k_moon.jpg", "moon", "moon"],
  ["8k_mars.jpg", "mars", "mars"],
  ["8k_sun.jpg", "sun", "sun"],
  ["8k_stars_milky_way.jpg", "starfield", "starfield"],
];

// Target width in pixels — height is derived automatically so the
// original aspect ratio is always preserved (doc safeguard: "preserve
// aspect ratio when resizing").
const SIZES = { "2k": 2048, "4k": 4096 };

async function run() {
  let wrote = 0;
  let skippedExisting = 0;
  let skippedMissing = 0;

  for (const [sourceFile, folder, stem] of JOBS) {
    const sourcePath = join(PUBLIC_TEXTURES, sourceFile);
    if (!existsSync(sourcePath)) {
      console.warn(`skip (source not found): ${sourceFile}`);
      skippedMissing += 1;
      continue;
    }

    const outDir = join(PUBLIC_TEXTURES, folder);
    mkdirSync(outDir, { recursive: true });

    for (const [label, width] of Object.entries(SIZES)) {
      const outPath = join(outDir, `${stem}-${label}.webp`);
      if (existsSync(outPath)) {
        console.log(`skip (already exists): ${outPath}`);
        skippedExisting += 1;
        continue;
      }

      // withoutEnlargement guards the (unlikely, given these are all 8K
      // sources) case of a source smaller than the target width — sharp
      // will just keep the source size rather than upscale and blur it.
      // .webp() color-space is left at sharp's default (sRGB), correct
      // for these color textures; none of the five source files here are
      // normal/roughness/data maps, so no non-color-space handling is
      // needed (see the doc's texture-quality-safeguards note for when
      // it would be).
      await sharp(sourcePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);
      console.log(`wrote: ${outPath}`);
      wrote += 1;
    }
  }

  console.log(
    `\nDone — ${wrote} file(s) written, ${skippedExisting} already present, ${skippedMissing} source(s) missing.`
  );
  console.log("Original .jpg files in public/textures/ were not modified or deleted.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
