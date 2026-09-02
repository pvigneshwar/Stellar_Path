/**
 * INDIA'S JOURNEY BEYOND EARTH — Journey Sequence
 *
 * Defines the continuous scroll-driven satellite evolution sequence
 * per Section #6 of the Master Prompt.
 *
 * Sequence (chronological, all 23 satellites in the database):
 * Aryabhata → Bhaskara-I → Rohini (RS-1) → APPLE → INSAT-1A → INSAT-1B
 * → IRS-1A → Oceansat-1 → Resourcesat-1 → Cartosat-1 → Chandrayaan-1
 * → GSAT-5P → Mars Orbiter Mission → AstroSat → Pratham → IRNSS-1H
 * → NavIC → Chandrayaan-2 → Chandrayaan-3 → Aditya-L1 → XPoSat → NISAR
 * → Gaganyaan (Future)
 *
 * Includes the 4 failed/partial missions (INSAT-1A, GSAT-5P, IRNSS-1H)
 * and 2 minor experimental satellites (Rohini, APPLE, Pratham) that were
 * previously only shown in Explorer/Timeline/Statistics but excluded
 * from this scroll journey — added per explicit request to include all
 * 23 satellites chronologically.
 */
import type { JourneySatellite } from '../types';

export const JOURNEY_SATELLITES: JourneySatellite[] = [
  {
    id: 'aryabhata',
    name: 'Aryabhata',
    year: 1975,
    category: 'scientific',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 4],
    orbitType: 'leo',
  },
  {
    id: 'bhaskara-1',
    name: 'Bhaskara-I',
    year: 1979,
    category: 'earth-observation',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 4.5],
    orbitType: 'leo',
  },
  {
    id: 'rohini',
    name: 'Rohini (RS-1)',
    year: 1980,
    category: 'experimental',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 4],
    orbitType: 'leo',
  },
  {
    id: 'apple',
    name: 'APPLE',
    year: 1981,
    category: 'communication',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'insat-1a-failed',
    name: 'INSAT-1A',
    year: 1982,
    category: 'communication',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'insat-1b',
    name: 'INSAT-1B',
    year: 1983,
    category: 'communication',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'irs-1a',
    name: 'IRS-1A',
    year: 1988,
    category: 'earth-observation',
    transformationType: 'component-separate',
    cameraPosition: [0, 0, 5],
    orbitType: 'leo',
  },
  {
    id: 'oceansat-1',
    name: 'Oceansat-1 (IRS-P4)',
    year: 1999,
    category: 'earth-observation',
    transformationType: 'component-separate',
    cameraPosition: [0, 0, 5],
    orbitType: 'leo',
  },
  {
    id: 'resourcesat-1',
    name: 'Resourcesat-1',
    year: 2003,
    category: 'earth-observation',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 5],
    orbitType: 'leo',
  },
  {
    id: 'cartosat-1',
    name: 'Cartosat-1',
    year: 2005,
    category: 'earth-observation',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 5],
    orbitType: 'leo',
  },
  {
    id: 'chandrayaan-1',
    name: 'Chandrayaan-1',
    year: 2008,
    category: 'lunar',
    transformationType: 'orbit-shift',
    cameraPosition: [0, 0, 6],
    orbitType: 'lunar',
  },
  {
    id: 'gsat-5p-failed',
    name: 'GSAT-5P',
    year: 2010,
    category: 'communication',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'mars-orbiter-mission',
    name: 'Mars Orbiter Mission (Mangalyaan)',
    year: 2013,
    category: 'planetary',
    transformationType: 'orbit-shift',
    cameraPosition: [0, 0, 6.5],
    orbitType: 'mars',
  },
  {
    id: 'astrosat',
    name: 'AstroSat',
    year: 2015,
    category: 'scientific',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 5],
    orbitType: 'leo',
  },
  {
    id: 'pratham',
    name: 'Pratham',
    year: 2016,
    category: 'experimental',
    transformationType: 'scale-pulse',
    cameraPosition: [0, 0, 4],
    orbitType: 'leo',
  },
  {
    id: 'irnss-1h-failed',
    name: 'IRNSS-1H',
    year: 2017,
    category: 'navigation',
    transformationType: 'particle-swirl',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'navic',
    name: 'NavIC (IRNSS-1I)',
    year: 2018,
    category: 'navigation',
    transformationType: 'component-separate',
    cameraPosition: [0, 0, 5.5],
    orbitType: 'geo',
  },
  {
    id: 'chandrayaan-2',
    name: 'Chandrayaan-2',
    year: 2019,
    category: 'lunar',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 6],
    orbitType: 'lunar',
  },
  {
    id: 'chandrayaan-3',
    name: 'Chandrayaan-3',
    year: 2023,
    category: 'lunar',
    transformationType: 'component-separate',
    cameraPosition: [0, 0, 6],
    orbitType: 'lunar',
  },
  {
    id: 'aditya-l1',
    name: 'Aditya-L1',
    year: 2023,
    category: 'solar',
    transformationType: 'orbit-shift',
    cameraPosition: [0, 0, 6],
    orbitType: 'l1',
  },
  {
    id: 'xposat',
    name: 'XPoSat',
    year: 2024,
    category: 'scientific',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 4.5],
    orbitType: 'leo',
  },
  {
    id: 'nisar',
    name: 'NISAR',
    year: 2025,
    category: 'earth-observation',
    transformationType: 'unfold',
    cameraPosition: [0, 0, 6],
    orbitType: 'leo',
  },
  {
    id: 'gaganyaan',
    name: 'Gaganyaan (Crewed Spaceflight)',
    year: 2026,
    category: 'experimental',
    transformationType: 'disintegrate-reform',
    cameraPosition: [0, 0, 6],
    orbitType: 'leo',
  },
];

/** List of all interactive satellite IDs in the journey. */
export const INTERACTABLE_SATELLITE_IDS = JOURNEY_SATELLITES.map((s) => s.id);
