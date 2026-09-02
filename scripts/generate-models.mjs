/**
 * INDIA'S JOURNEY BEYOND EARTH — GLB Model Generator
 *
 * Uses Three.js & GLTFExporter to construct high-detail, authentic 3D spacecraft
 * models and exports them as binary .glb files into /public/models/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../public/models');

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// ── Materials ───────────────────────────────────────────────────────────────
const goldMli = new THREE.MeshStandardMaterial({
  color: 0xd97706,
  metalness: 0.92,
  roughness: 0.3,
  name: 'Gold_MLI_Thermal_Foil',
});

const silverMli = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  metalness: 0.95,
  roughness: 0.2,
  name: 'Silver_Reflective_Blanket',
});

const solarPanel = new THREE.MeshStandardMaterial({
  color: 0x1e3a8a,
  metalness: 0.5,
  roughness: 0.25,
  emissive: new THREE.Color(0x0c1b33),
  emissiveIntensity: 0.3,
  name: 'Silicon_Solar_Array',
});

const darkChassis = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.8,
  roughness: 0.4,
  name: 'Titanium_Chassis',
});

const thrusterMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  metalness: 0.9,
  roughness: 0.15,
  name: 'Niobium_Engine_Nozzle',
});

const lensMat = new THREE.MeshPhysicalMaterial({
  color: 0x38bdf8,
  transmission: 0.7,
  opacity: 0.9,
  transparent: true,
  roughness: 0.1,
  metalness: 0.1,
  name: 'Optical_Sensor_Lens',
});

const copperMat = new THREE.MeshStandardMaterial({
  color: 0xb45309,
  metalness: 0.85,
  roughness: 0.25,
  name: 'Copper_Feed_Horn',
});

const rocketWhite = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  metalness: 0.3,
  roughness: 0.4,
  name: 'Rocket_Fuselage_White',
});

const rocketOrange = new THREE.MeshStandardMaterial({
  color: 0xc2410c,
  metalness: 0.4,
  roughness: 0.4,
  name: 'Booster_Band_Orange',
});

// ── 1. Chandrayaan-3 (Vikram Lander & Pragyan Rover) ─────────────────────────
function createChandrayaan3() {
  const root = new THREE.Group();
  root.name = 'Chandrayaan_3_Vikram_Lander';

  // Octagonal Main Body
  const bodyGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.9, 8);
  const body = new THREE.Mesh(bodyGeo, goldMli);
  root.add(body);

  // Top Deck Avionics
  const deckGeo = new THREE.BoxGeometry(0.65, 0.15, 0.65);
  const deck = new THREE.Mesh(deckGeo, silverMli);
  deck.position.y = 0.52;
  root.add(deck);

  // Body Solar Array
  const panelGeo = new THREE.BoxGeometry(0.04, 0.8, 0.7);
  const panel = new THREE.Mesh(panelGeo, solarPanel);
  panel.position.set(-0.72, 0, 0);
  root.add(panel);

  // Pragyan Rover Ramp (Deployable side panel)
  const rampGeo = new THREE.BoxGeometry(0.08, 0.6, 0.45);
  const ramp = new THREE.Mesh(rampGeo, silverMli);
  ramp.position.set(0.65, -0.1, 0);
  ramp.rotation.z = -0.35;
  root.add(ramp);

  // 4 800N Throttleable Engines
  const thrusterGeo = new THREE.ConeGeometry(0.1, 0.25, 16);
  const positions = [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ];
  positions.forEach(([x, z]) => {
    const t = new THREE.Mesh(thrusterGeo, thrusterMat);
    t.position.set(x, -0.55, z);
    t.rotation.x = Math.PI;
    root.add(t);
  });

  // 4 Landing Struts & Footpads
  const strutGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.85, 8);
  const padGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16);
  positions.forEach(([x, z]) => {
    const s = new THREE.Mesh(strutGeo, darkChassis);
    s.position.set(x * 1.3, -0.45, z * 1.3);
    s.rotation.set(z * 0.4, 0, -x * 0.4);
    root.add(s);

    const p = new THREE.Mesh(padGeo, silverMli);
    p.position.set(x * 1.6, -0.85, z * 1.6);
    root.add(p);
  });

  // Payloads (ChaSTE, ILSA, Hazard Detection Camera)
  const camGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const cam = new THREE.Mesh(camGeo, darkChassis);
  cam.position.set(0, -0.3, 0.75);
  const lensGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.3, 0.83);
  root.add(cam);
  root.add(lens);

  return root;
}

// ── 2. Mars Orbiter Mission (Mangalyaan) ─────────────────────────────────────
function createMangalyaan() {
  const root = new THREE.Group();
  root.name = 'Mars_Orbiter_Mission_Mangalyaan';

  // Cubical Main Core
  const coreGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const core = new THREE.Mesh(coreGeo, goldMli);
  root.add(core);

  // Large 2.2m Parabolic High Gain Antenna Dish
  const dishGeo = new THREE.ConeGeometry(0.7, 0.22, 32);
  const dish = new THREE.Mesh(dishGeo, silverMli);
  dish.position.set(0, 0.75, 0);
  dish.rotation.set(0.35, 0.4, 0);
  root.add(dish);

  const feedGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
  const feed = new THREE.Mesh(feedGeo, copperMat);
  feed.position.set(0, 0.95, 0);
  feed.rotation.set(0.35, 0.4, 0);
  root.add(feed);

  // 3-Panel Solar Array Wing
  const wingGeo = new THREE.BoxGeometry(1.6, 1.0, 0.03);
  const wing = new THREE.Mesh(wingGeo, solarPanel);
  wing.position.set(-(0.55 + 0.8), 0, 0);
  root.add(wing);

  // 440N Liquid Apogee Motor (LAM)
  const lamGeo = new THREE.ConeGeometry(0.22, 0.45, 24);
  const lam = new THREE.Mesh(lamGeo, thrusterMat);
  lam.position.set(0, -0.7, 0);
  lam.rotation.x = Math.PI;
  root.add(lam);

  // Mars Colour Camera (MCC)
  const mccGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.3, 24);
  const mcc = new THREE.Mesh(mccGeo, darkChassis);
  mcc.position.set(0, 0, 0.68);
  mcc.rotation.x = Math.PI / 2;
  root.add(mcc);

  const mccLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24), lensMat);
  mccLens.position.set(0, 0, 0.84);
  mccLens.rotation.x = Math.PI / 2;
  root.add(mccLens);

  return root;
}

// ── 3. Aryabhata (1975) ─────────────────────────────────────────────────────
function createAryabhata() {
  const root = new THREE.Group();
  root.name = 'Aryabhata_1975';

  // 26-sided Polyhedron Bus
  const busGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.1, 16);
  const bus = new THREE.Mesh(busGeo, silverMli);
  root.add(bus);

  // Solar Panels covering body
  const spGeo = new THREE.BoxGeometry(0.35, 1.05, 0.02);
  [-0.66, 0.66].forEach((x) => {
    const sp = new THREE.Mesh(spGeo, solarPanel);
    sp.position.set(x, 0, 0);
    root.add(sp);
  });

  // Top & Bottom End Caps
  const capGeo = new THREE.ConeGeometry(0.65, 0.25, 16);
  const topCap = new THREE.Mesh(capGeo, goldMli);
  topCap.position.y = 0.65;
  root.add(topCap);

  const bottomCap = new THREE.Mesh(capGeo, goldMli);
  bottomCap.position.y = -0.65;
  bottomCap.rotation.x = Math.PI;
  root.add(bottomCap);

  // 4 Monopole Antennas
  const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const ant = new THREE.Mesh(antGeo, darkChassis);
    ant.position.set(Math.cos(angle) * 0.6, 0.7, Math.sin(angle) * 0.6);
    ant.rotation.set(Math.sin(angle) * 0.4, 0, -Math.cos(angle) * 0.4);
    root.add(ant);
  }

  return root;
}

// ── 4. Aditya-L1 Solar Observatory ──────────────────────────────────────────
function createAdityaL1() {
  const root = new THREE.Group();
  root.name = 'Aditya_L1_Observatory';

  // Core Bus
  const busGeo = new THREE.BoxGeometry(0.95, 1.35, 0.95);
  const bus = new THREE.Mesh(busGeo, goldMli);
  root.add(bus);

  // VELC Solar Aperture & Sunshield
  const velcGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.32, 24);
  const velc = new THREE.Mesh(velcGeo, silverMli);
  velc.position.y = 0.82;
  root.add(velc);

  const aperture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24), thrusterMat);
  aperture.position.y = 0.99;
  root.add(aperture);

  // Dual Sun-Tracking Solar Array Wings
  const wingGeo = new THREE.BoxGeometry(1.25, 1.25, 0.03);
  const leftWing = new THREE.Mesh(wingGeo, solarPanel);
  leftWing.position.set(-1.15, 0, 0);
  const rightWing = new THREE.Mesh(wingGeo, solarPanel);
  rightWing.position.set(1.15, 0, 0);
  root.add(leftWing);
  root.add(rightWing);

  // Magnetometer 6-Meter Boom
  const boomGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
  const boom = new THREE.Mesh(boomGeo, darkChassis);
  boom.position.set(0.45, -0.6, 0);
  boom.rotation.z = -0.6;
  root.add(boom);

  return root;
}

// ── 5. PSLV Launch Vehicle ──────────────────────────────────────────────────
function createPSLVRocket() {
  const root = new THREE.Group();
  root.name = 'PSLV_Launch_Vehicle';

  // First Stage (PS1 Core)
  const ps1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 24), rocketWhite);
  ps1.position.y = -2.2;
  root.add(ps1);

  // 6 Solid Strap-on Boosters (PSOM-XL)
  const strapGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.4, 16);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const strap = new THREE.Mesh(strapGeo, rocketOrange);
    strap.position.set(Math.cos(angle) * 0.62, -2.6, Math.sin(angle) * 0.62);
    root.add(strap);
  }

  // Second Stage (PS2 Vikas Engine Section)
  const ps2 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 2.2, 24), rocketWhite);
  ps2.position.y = 0.5;
  root.add(ps2);

  // Third Stage (PS3) & Fourth Stage (PS4)
  const ps34 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 1.5, 24), darkChassis);
  ps34.position.y = 2.35;
  root.add(ps34);

  // Payload Fairing (Heat Shield)
  const fairing = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.8, 24), rocketWhite);
  fairing.position.y = 4.0;
  root.add(fairing);

  return root;
}

// ── Export Function ─────────────────────────────────────────────────────────
async function exportGLB(object3D, filename) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object3D,
      (gltf) => {
        const filePath = path.join(MODELS_DIR, filename);
        const buffer = Buffer.from(gltf);
        fs.writeFileSync(filePath, buffer);
        console.log(`[GLB GENERATED] -> ${filename} (${buffer.byteLength} bytes)`);
        resolve(filePath);
      },
      (err) => {
        console.error(`[GLB EXPORT ERROR] ${filename}:`, err);
        reject(err);
      },
      { binary: true }
    );
  });
}

// ── Main Execution ──────────────────────────────────────────────────────────
export async function generateAllModels() {
  console.log('🚀 Generating 3D GLB Spacecraft Models for India\'s Journey Beyond Earth...');

  await exportGLB(createChandrayaan3(), 'chandrayaan3.glb');
  await exportGLB(createMangalyaan(), 'mangalyaan.glb');
  await exportGLB(createAryabhata(), 'aryabhata.glb');
  await exportGLB(createAdityaL1(), 'aditya_l1.glb');
  await exportGLB(createPSLVRocket(), 'pslv_rocket.glb');

  console.log('✅ All 5 Production GLB Models generated successfully in public/models/!');
}

// If run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllModels().catch(console.error);
}
