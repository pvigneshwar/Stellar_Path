/**
 * INDIA'S JOURNEY BEYOND EARTH — TypeScript Type Definitions
 *
 * All types are centralized here for maintainability.
 * Data logic is separated from 3D logic from UI logic.
 */

// ──────────────────────────────────────────────
// Satellite data model
// ──────────────────────────────────────────────

export type SatelliteStatus =
  | 'operational'            // 🟢 Operational
  | 'completed'              // 🔵 Completed
  | 'partial'                // 🟡 Partially successful
  | 'non-operational'        // 🟠 Non-operational
  | 'failed'                 // 🔴 Launch unsuccessful / On-orbit failure
  | 'retired'                // ⚫ Retired
  | 'future';                // future / approved mission

export type SatelliteCategory =
  | 'communication'
  | 'earth-observation'
  | 'navigation'
  | 'scientific'
  | 'experimental'
  | 'lunar'
  | 'planetary'
  | 'solar';

export type FailureType =
  | 'launch-failure'
  | 'on-orbit-failure'
  | 'partial-success';

export type TransformationType =
  | 'disintegrate-reform'
  | 'component-separate'
  | 'particle-swirl'
  | 'unfold'
  | 'scale-pulse'
  | 'orbit-shift';

export interface MissionEvent {
  date: string;          // ISO date or year string
  title: string;
  description: string;
}

export interface GalleryItem {
  type: 'image' | 'video';
  url: string;
  caption: string;
}

export interface SatelliteDimensions {
  length?: number;   // metres
  width?: number;    // metres
  height?: number;   // metres
  diameter?: number; // metres (for cylindrical bodies)
}

export interface SatellitePower {
  watts: number;
  panels: string;
}

/** Full data record for a satellite (used by Explorer / Details / Database) */
export interface Satellite {
  // identity
  id: string;
  name: string;
  alternateName?: string;
  missionName?: string;
  category: SatelliteCategory;
  subCategory?: string;
  color?: string;           // hex for 3D rendering fallback

  // mission data
  launchDate: string;       // ISO date
  year: number;
  launchVehicle: string;
  launchSite: string;
  operator: string;
  manufacturer?: string;

  // physical
  mass: number;             // kg
  dimensions: SatelliteDimensions;
  power?: SatellitePower;

  // orbit
  orbitType: string;        // e.g. "LEO", "GEO", "HEO"
  orbitAltitude?: number;   // km
  inclination?: number;    // degrees
  orbitalPeriod?: number;   // minutes
  destination?: string;     // e.g. "Moon", "Mars", "L1"

  // narrative
  missionObjective: string;
  description: string;
  payloads?: string[];
  achievements: string[];

  // status
  status: SatelliteStatus;
  statusReason?: string;
  failureType?: FailureType;
  failureReason?: string;

  // timeline
  missionStart?: string;
  missionEnd?: string;
  missionDuration?: string;
  timeline: MissionEvent[];
  gallery: GalleryItem[];
  sources: string[];

  // journey (3D) — optional, present when the satellite is part of the scroll journey
  transformationType?: TransformationType;
  cameraPosition?: [number, number, number];
  orbitPath?: string;  // 'leo' | 'geo' | 'lunar' | 'mars' | 'l1' | 'earth-sun'

  // assets
  image: string;       // detail image URL
  thumbnail: string;   // thumbnail URL
  model3D?: string;    // GLB model URL (optional, fallback to procedural)
}

// ──────────────────────────────────────────────
// Journey (scroll-driven sequence)
// ──────────────────────────────────────────────

export interface JourneySatellite {
  id: string;
  name: string;
  year: number;
  category: SatelliteCategory;
  transformationType: TransformationType;
  cameraPosition: [number, number, number];
  orbitType: string;
}

export interface ScrollSegment {
  start: number;     // 0–1 scroll progress
  end: number;       // 0–1 scroll progress
  label?: string;
  color?: string;
}

// ──────────────────────────────────────────────
// Journey runtime state
// ──────────────────────────────────────────────

export type PerformanceMode = 'high' | 'medium' | 'low';

export interface JourneyState {
  // scroll progress 0–1 across the entire journey
  progress: number;
  // has the user clicked "Witness the Journey"
  started: boolean;
  // which journey-satellite is currently active (index into JOURNEY_SATELLITES)
  activeSatelliteIndex: number;
  // which satellite's details panel is open
  detailsOpen: boolean;
  selectedSatelliteId: string | null;
  // saved scroll position when details opened
  savedProgress: number;
  // device preferences
  reducedMotion: boolean;
  performanceMode: PerformanceMode;
  // true while the "Restart Journey" cinematic transition (rocket flies
  // across the screen, fog covers it, journey resets underneath, fog
  // clears) is playing — see RestartTransition.tsx
  isRestarting: boolean;
  // Free 3D View Movement: when true (and only while the satellite-evolution phase
  // is active, progress >= 1.0), the scroll-driven CameraController stops
  // forcing camera position/look-at every frame and OrbitControls takes
  // over instead, letting the user freely rotate/zoom around whichever
  // body + satellite is currently active (Earth for leo/geo, or the real
  // Moon/Mars/Sun for lunar/mars/l1 missions) — on top of, not replacing,
  // each body's existing automatic idle-spin rotation (CelestialBody's
  // idleSpinSpeed) and the satellite's own scroll-driven orbital motion,
  // both of which keep running underneath the free-look camera exactly as
  // before. See CameraController / the unified OrbitControls in
  // JourneyScene.tsx.
  freeView: boolean; // exposed name kept as freeView; user-facing feature label is "Free 3D View Movement"
}

import type { MutableRefObject, RefObject } from 'react';

export interface JourneyContextValue extends JourneyState {
  // refs (read by 3D scene in useFrame, no re-render)
  progressRef: MutableRefObject<number>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;

  // actions
  setProgress: (p: number) => void;
  startJourney: () => void;
  setActiveSatellite: (index: number) => void;
  openDetails: (satelliteId: string) => void;
  closeDetails: () => void;
  toggleDetails: (satelliteId: string | null) => void;
  restoreJourney: () => void;
  // Restarts the whole journey from the beginning, back to the Hero
  // screen — plays the RestartTransition cinematic (rocket flight + fog
  // cover) before resetting progress/scroll/started underneath, then
  // fades the fog back out. See isRestarting above and
  // RestartTransition.tsx.
  restartJourney: () => void;
  setReducedMotion: (v: boolean) => void;
  setPerformanceMode: (v: PerformanceMode) => void;
  // Toggles Free 3D View Movement on/off (see JourneyState.freeView above).
  toggleFreeView: () => void;
}
