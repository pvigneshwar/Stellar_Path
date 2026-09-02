/**
 * INDIA'S JOURNEY BEYOND EARTH — Constants
 */

// ─�─ Journey scroll segments (0–1 progress) ──────────────────────────
// The entire scroll journey from Earth approach to payload focus.
export const JOURNEY_SEGMENTS = {
  EARTH_APPROACH: { start: 0.0, end: 0.10 },
  ROCKET_REVEAL: { start: 0.10, end: 0.20 },
  IGNITION:      { start: 0.20, end: 0.30 },
  LAUNCH:        { start: 0.30, end: 0.45 },
  ATMOSPHERE:    { start: 0.45, end: 0.60 },
  SPACE:         { start: 0.60, end: 0.70 },
  STAGE_SEP:     { start: 0.70, end: 0.80 },
  PAYLOAD:       { start: 0.80, end: 1.00 },
} as const;

// ── Satellite evolution journey (scroll continues past payload) ───────
// Each satellite occupies a scroll band. These continue AFTER the
// initial rocket launch (i.e. journey progress 1.0 → 2.0+ normalized).
//
// This is also the exact scroll range one satellite's orbital sweep is
// mapped across (see ORBIT_SWEEP in JourneyScene.tsx) — the satellite
// completes exactly ONE full revolution of its trajectory over this
// whole band, not per individual wheel/trackpad scroll tick. Raised from
// 0.12 to 0.8 (paired with the dynamic SCROLL_TRACK_HEIGHT in page.tsx,
// which scales with this constant) so that single revolution now spans
// enough physical scroll distance (~144vh at the current VH_PER_PROGRESS_UNIT)
// that it takes several scroll actions to complete — previously 0.12
// mapped to only ~22vh, so the whole orbit (and the automatic-looking
// multi-revolution sweep before this fix) finished within a single
// scroll gesture.
export const SATELLITE_TRANSITION_BAND = 0.8; // scroll fraction per satellite (= one full orbital revolution)

// ── Launch countdown window (rocket rise from inside Earth to the pad) ──
// Shared between JourneyScene.tsx (rocket position) and JourneyOverlay.tsx
// (T-minus countdown display) so they stay perfectly in sync — the rocket
// finishes rising from inside the globe to the surface at exactly the same
// progress value the countdown UI reaches "LIFTOFF".
export const COUNTDOWN_START = 0.14;
export const COUNTDOWN_END = 0.20;

// Number of T-minus stages shown by the countdown UI (T-05, T-04, T-03,
// T-02, T-01, LIFTOFF) — must match COUNTDOWN_STAGES.length in
// JourneyOverlay.tsx. Used below to compute ROCKET_RISE_START.
export const COUNTDOWN_STAGE_COUNT = 6;

// Bug fix: the rocket previously rose from inside the globe across the
// ENTIRE COUNTDOWN_START–COUNTDOWN_END window using an ease-out curve
// (fast at first, slowing down). Ease-out front-loads the motion, so by
// the START of the 4th of 6 stages (T-02) the eased progress was already
// 75% of the way up — the rocket read as "already revealed" three stages
// before LIFTOFF, instead of staying hidden until the countdown actually
// completes. Rocket now stays fully hidden inside the globe through every
// stage except the very last (LIFTOFF) one, and only rises during that
// final stage's window — ROCKET_RISE_START is the progress value where
// the LIFTOFF stage begins.
export const ROCKET_RISE_START =
  COUNTDOWN_END - (COUNTDOWN_END - COUNTDOWN_START) / COUNTDOWN_STAGE_COUNT;

// Extra physical-scroll density applied ONLY within the countdown window
// above (COUNTDOWN_START–COUNTDOWN_END) — see progressFromScrollFraction()
// in lib/utils.ts, used by JourneyProvider's scroll handler. This is the
// same "scroll method" fix applied to satellite orbits (compare
// SATELLITE_TRANSITION_BAND/ORBIT_SWEEP above): the six T-minus countdown
// stages (T-05…LIFTOFF) previously lived in a razor-thin 0.06-progress
// window that, even after the satellite-orbit scroll-density fix, worked
// out to under 11vh of physical scroll — the whole countdown flashed by
// within a single scroll gesture.
//
// Tuning history: started at 8× (~86vh total, ~14vh/stage) — reduced to
// 4× (~43vh total, ~7vh/stage) for feeling like it needed too much
// scrolling — raised to 10× (~108vh total, ~18vh/stage) after 4× read as
// advancing too fast — raised again to 20× (~206vh total, ~34vh/stage)
// since 10× still wasn't slow enough. COUNTDOWN_START/END themselves, and
// every other launch-phase progress boundary (Ignition, Launch,
// Atmosphere, etc.), are unaffected by this value regardless of where
// it's tuned.
export const COUNTDOWN_SCROLL_WEIGHT = 20;

// Extra physical-scroll density applied to the PAYLOAD phase
// (JOURNEY_SEGMENTS.PAYLOAD, 0.80–1.00) — the stage-separation-to-
// satellite-evolution camera hand-off (see CameraController's p<1.0
// branch in JourneyScene.tsx, which now lerps the look-at target from
// the rocket's resting point down to the satellite-orbit origin across
// this exact window). That lerp was fixed to be continuous, but at the
// journey's normal (unweighted) scroll density it still only gets this
// phase's raw 0.20 progress-units of physical scroll, same as every
// other non-countdown phase — which reads as too fast for a transition
// this large (~43–44 world units of camera travel). Applying the same
// scroll-weighting treatment already used for the launch countdown
// (COUNTDOWN_SCROLL_WEIGHT above) and satellite orbits
// (SATELLITE_TRANSITION_BAND) gives it more physical-scroll room without
// moving the 0.80/1.00 phase boundaries themselves.
export const PAYLOAD_SCROLL_WEIGHT = 6;

// Extra physical-scroll density applied to the LAUNCH / "MAX-Q ASCENT"
// phase (JOURNEY_SEGMENTS.LAUNCH, 0.30–0.45 — matches the "MAX-Q ASCENT"
// label window in JourneyOverlay.tsx's LAUNCH_LABELS). This is the
// rocket's climb away from the pad, through maximum aerodynamic
// pressure — a lot of camera + rocket + HUD-telemetry motion is packed
// into this phase, and at the journey's normal (unweighted) scroll
// density it only gets its raw 0.15 progress-units of physical scroll,
// same as any other non-weighted phase, which reads as rushing past the
// ascent too quickly. Applying the same scroll-weighting treatment
// already used for the launch countdown (COUNTDOWN_SCROLL_WEIGHT) and the
// payload hand-off (PAYLOAD_SCROLL_WEIGHT) slows the effective scroll
// speed through this window without moving the 0.30/0.45 phase
// boundaries themselves.
//
// Bug fix / feature (user follow-up: "still too fast through MAX-Q
// ASCENT"): raised from 4x to 8x, doubling the physical-scroll room this
// phase gets (roughly ~31vh -> ~62vh of scroll at the current
// VH_PER_PROGRESS_UNIT=260) without touching PAYLOAD_SCROLL_WEIGHT/
// COUNTDOWN_SCROLL_WEIGHT or any phase boundary.
export const MAXQ_SCROLL_WEIGHT = 8;

// ── Colors ────────────────────────────────────────────────────────────
export const COLORS = {
  space: '#000000',
  nebulaBlue: '#0a1428',
  nebulaPurple: '#1a0a3a',
  accentBlue: '#00d4ff',
  accentViolet: '#8a2be2',
  earthBlue: '#0a3d62',
  earthGreen: '#1a7f37',
  indiaGlow: '#ff9933',
  rocketMetal: '#888888',
  rocketOrange: '#ff6600',
} as const;

// ── Earth constants ───────────────────────────────────────────────────
export const EARTH_RADIUS_KM = 6371;
export const EARTH_SCALE = 1; // Three.js units (1 unit = 1 km for the journey)

// ── Status badge helpers ──────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  operational:           { label: 'Operational', color: '#10b981', icon: '🟢' },
  completed:             { label: 'Completed', color: '#3b82f6', icon: '🔵' },
  partial:               { label: 'Partially Successful', color: '#f59e0b', icon: '🟡' },
  'non-operational':     { label: 'Non-operational', color: '#ea580c', icon: '🟠' },
  failed:                { label: 'Launch Unsuccessful', color: '#ef4444', icon: '🔴' },
  'launch-unsuccessful': { label: 'Launch Unsuccessful', color: '#ef4444', icon: '🔴' },
  retired:               { label: 'Retired', color: '#374151', icon: '⚫' },
  future:                { label: 'Future Mission', color: '#a855f7', icon: '🟣' },
};

// ── Category config ───────────────────────────────────────────────────
export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  communication:     { label: 'Communication', color: '#3b82f6' },
  'earth-observation': { label: 'Earth Observation', color: '#22c55e' },
  navigation:        { label: 'Navigation', color: '#f59e0b' },
  scientific:        { label: 'Scientific', color: '#a855f7' },
  experimental:      { label: 'Experimental', color: '#ef4444' },
  lunar:             { label: 'Lunar', color: '#8b5cf6' },
  planetary:         { label: 'Planetary', color: '#ec4899' },
  solar:             { label: 'Solar', color: '#f59e0b' },
};

// ── Animation durations (seconds) ─────────────────────────────────────
export const ANIM = {
  cameraMove: 2.4,
  transformation: 2.0,
  stageSeparation: 1.6,
  aryabhataReveal: 2.0,
  orbitPeriod: 120,
} as const;

// ── Performance thresholds ────────────────────────────────────────────
export const DEVICE_MEMORY_THRESHOLD = 4; // GB
export const MAX_PARTICLES_MOBILE = 1500;
export const MAX_PARTICLES_DESKTOP = 4000;

// ── Asset fallbacks ───────────────────────────────────────────────────
export const FALLBACK_EARTH_TEXTURE =
  'https://threejs.org/examples/textures/earth_atmos_2048.jpg';
export const FALLBACK_EARTH_SPECULAR =
  'https://threejs.org/examples/textures/earth_specular_2048.jpg';
// FALLBACK_CLOUDS removed: Earth's cloud layer was removed from Earth.tsx
// per explicit request, and this fallback URL was dead code left behind
// with nothing importing it.

// ── Local high-resolution textures ─────────────────────────────────────
export const LOCAL_EARTH_TEXTURE = '/textures/8k_earth_daymap.jpg';
export const LOCAL_STARFIELD_TEXTURE = '/textures/8k_stars_milky_way.jpg';
export const LOCAL_ROCKET_TEXTURE = '/textures/rocketship_texturepack.jpg';
// Destination celestial body textures (Moon, Mars, Sun) — all present in
// public/textures/, used by the persistent CelestialBody instances in
// JourneyScene.tsx (DestinationBodies). No procedural fallback texture is
// generated for these; CelestialBody only falls back to a flat tinted
// color if a file genuinely fails to load at runtime.
export const LOCAL_MOON_TEXTURE = '/textures/8k_moon.jpg';
export const LOCAL_MARS_TEXTURE = '/textures/8k_mars.jpg';
export const LOCAL_SUN_TEXTURE = '/textures/8k_sun.jpg';

// ── 3D Models ──────────────────────────────────────────────────────────
export const LOCAL_PSLV_ROCKET_MODEL = '/models/pslv_rocket.glb';
