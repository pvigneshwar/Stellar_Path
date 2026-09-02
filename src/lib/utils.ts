/**
 * INDIA'S JOURNEY BEYOND EARTH — Utility Functions
 */
import { COUNTDOWN_START, COUNTDOWN_END, COUNTDOWN_SCROLL_WEIGHT, JOURNEY_SEGMENTS, PAYLOAD_SCROLL_WEIGHT, MAXQ_SCROLL_WEIGHT } from "./constants";

/** Clamp a number between min and max. */
export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between two numbers. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(0, t, 1);
}

/** Remap a value from one range to another. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, t);
}

/** Convert degrees to radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Format a date string to a human-readable format. */
export function formatDate(dateString: string, locale = "en-IN"): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/** Format a duration string (e.g. "5 years"). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)} hours`;
  if (ms < 31536000000) return `${Math.round(ms / 86400000)} days`;
  return `${Math.round(ms / 31536000000)} years`;
}

/** Generate a simple hash from a string (for deterministic seeds). */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Clamp a value to 0–1 range. */
export function saturate(value: number): number {
  return clamp(0, value, 1);
}

/** Smoothstep — Hermite interpolation for smooth transitions. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Generate a pseudo-random number in [0, 1) from a seed. */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Scroll-to-progress mapping (weighted for the launch countdown and
// the stage-separation → satellite hand-off) ──────────────────────────
//
// The journey's progress domain (0…totalJourneyEnd) is mapped linearly to
// physical scroll distance EVERYWHERE except a small set of deliberately
// "weighted" windows, each given extra physical scroll distance per unit
// of progress than the rest of the journey. This is the general form of
// the fix originally added just for the launch-countdown window
// (COUNTDOWN_START–COUNTDOWN_END) — it now also covers the PAYLOAD phase
// (JOURNEY_SEGMENTS.PAYLOAD, 0.80–1.00), whose stage-separation →
// satellite-evolution camera hand-off needs the same "several deliberate
// scroll actions instead of one gesture" treatment (see
// PAYLOAD_SCROLL_WEIGHT in constants.ts for why). Adding further weighted
// windows in the future only means adding an entry to WEIGHTED_WINDOWS
// below — every other launch-phase progress boundary is unaffected by
// any of these regardless of how they're tuned.
const WEIGHTED_WINDOWS: { start: number; end: number; weight: number }[] = [
  { start: COUNTDOWN_START, end: COUNTDOWN_END, weight: COUNTDOWN_SCROLL_WEIGHT },
  { start: JOURNEY_SEGMENTS.LAUNCH.start, end: JOURNEY_SEGMENTS.LAUNCH.end, weight: MAXQ_SCROLL_WEIGHT },
  { start: JOURNEY_SEGMENTS.PAYLOAD.start, end: JOURNEY_SEGMENTS.PAYLOAD.end, weight: PAYLOAD_SCROLL_WEIGHT },
];

function getWeightedJourneySegments(totalJourneyEnd: number) {
  const windows = [...WEIGHTED_WINDOWS]
    .filter((w) => w.start < totalJourneyEnd)
    .map((w) => ({ ...w, end: Math.min(w.end, totalJourneyEnd) }))
    .sort((a, b) => a.start - b.start);

  const segments: { start: number; end: number; weight: number }[] = [];
  let cursor = 0;
  for (const w of windows) {
    if (w.start > cursor) segments.push({ start: cursor, end: w.start, weight: 1 });
    segments.push({ start: w.start, end: w.end, weight: w.weight });
    cursor = w.end;
  }
  if (cursor < totalJourneyEnd) segments.push({ start: cursor, end: totalJourneyEnd, weight: 1 });
  return segments;
}

/**
 * Total "weighted" journey length for a given totalJourneyEnd — use this
 * (not totalJourneyEnd itself) when sizing the physical scroll track, so
 * the countdown window gets its extra vh of real scroll room. See
 * page.tsx's SCROLL_TRACK_HEIGHT.
 */
export function computeWeightedJourneyLength(totalJourneyEnd: number): number {
  return getWeightedJourneySegments(totalJourneyEnd).reduce(
    (sum, seg) => sum + (seg.end - seg.start) * seg.weight,
    0
  );
}

/**
 * Convert a raw 0–1 physical-scroll fraction (scrollTop / maxScroll) into
 * a journey progress value (0…totalJourneyEnd), respecting the countdown
 * window's extra scroll weight. Exact inverse of the mapping
 * computeWeightedJourneyLength() sizes the track for — used by
 * JourneyProvider's scroll handler in place of a flat `raw * totalJourneyEnd`.
 */
export function progressFromScrollFraction(raw: number, totalJourneyEnd: number): number {
  const segments = getWeightedJourneySegments(totalJourneyEnd);
  const weightedTotal = segments.reduce((sum, seg) => sum + (seg.end - seg.start) * seg.weight, 0);
  const targetWeighted = saturate(raw) * weightedTotal;

  let cumWeighted = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const segWeightedLen = (seg.end - seg.start) * seg.weight;
    const isLast = i === segments.length - 1;
    if (targetWeighted <= cumWeighted + segWeightedLen || isLast) {
      const withinWeighted = targetWeighted - cumWeighted;
      const withinProgress = seg.weight > 0 ? withinWeighted / seg.weight : 0;
      return clamp(0, seg.start + withinProgress, totalJourneyEnd);
    }
    cumWeighted += segWeightedLen;
  }
  return totalJourneyEnd;
}
