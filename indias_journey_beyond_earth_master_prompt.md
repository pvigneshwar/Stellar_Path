# INDIA'S JOURNEY BEYOND EARTH

## Master Prompt — 3D Interactive Satellite Explorer

Create a production-quality, immersive, responsive web application called:

**INDIA'S JOURNEY BEYOND EARTH**

The website is an interactive 3D visualization of India's satellite and space-mission history.

The core experience must feel like the user is **travelling through India's space history**, not browsing a conventional website.

## CORE INTERACTION

**SCROLL = JOURNEY**

**CLICK = INFORMATION**

The entire main journey must be one continuous scroll-controlled 3D experience.

Do NOT divide the main journey into conventional static webpage sections where the 3D scene disappears and another section loads.

The 3D environment should persist throughout the journey.

\---

# 1\. TECHNOLOGY STACK

Use:

* Next.js
* React
* TypeScript
* React Three Fiber
* Three.js
* @react-three/drei
* GSAP
* GSAP ScrollTrigger
* Tailwind CSS
* Lucide React icons

Use a clean component architecture.

Use JSON initially for the satellite database, but structure the code so the data can later be moved to PostgreSQL/API without rewriting the UI.

Use reusable components and TypeScript interfaces.

\---

# 2\. WEBSITE EXPERIENCE

The experience begins in deep space.

The entire background should be:

* Deep black space
* Blue/purple nebula
* Dense but elegant starfield
* Floating particles
* Distant galaxies
* Subtle volumetric atmosphere
* Cinematic lighting

Avoid excessive neon.

The website should feel:

* Cinematic
* Scientific
* Premium
* Futuristic
* Minimal
* Educational
* ISRO-inspired without copying their exact website design

\---

# 3\. HERO / ENTRY SCREEN

Create a full-screen opening scene.

Show:

* 3D Earth
* India visible on the night side
* Atmospheric glow
* Stars
* Nebula
* Slow Earth rotation
* Slow camera movement

Display:

**INDIA'S JOURNEY**

Large heading:

**BEYOND EARTH**

Supporting text:

"Explore India's journey from its first satellite to the future of space exploration."

Add a large CTA:

**WITNESS THE JOURNEY →**

When clicked:

1. Start the 3D experience.
2. Smoothly transition the camera toward Earth.
3. Enable the scroll-controlled journey.
4. Remove or minimize the hero overlay.

\---

# 4\. SCROLL-CONTROLLED ROCKET LAUNCH

The scroll position controls the 3D animation.

Do NOT use ordinary page scrolling as the primary animation.

Use GSAP ScrollTrigger or an equivalent robust scroll-progress system.

### Sequence

### 0–10%

Camera approaches Earth.

Earth rotates slowly.

### 10–20%

Reveal the rocket at an Indian launch site.

Show subtle UI text:

**THE JOURNEY BEGINS**

### 20–30%

Rocket engine ignition.

Add:

* Flame
* Heat glow
* Smoke
* Particle effects
* Small camera shake

### 30–45%

Rocket launches upward.

Camera follows the rocket.

### 45–60%

Rocket passes through Earth's atmosphere.

Earth becomes smaller below.

Atmosphere changes from blue to dark space.

### 60–70%

Rocket reaches space.

Stars become prominent.

### 70–80%

Rocket stages separate.

Each stage should move away naturally.

### 80–100%

Payload remains.

Camera focuses on the payload.

\---

# 5\. ROCKET → SATELLITE TRANSFORMATION

At the end of the launch sequence, the rocket payload must transform into:

**ARYABHATA**

Do not simply fade one object out and another object in.

Create a cinematic transformation:

1. Payload separates.
2. Components move outward.
3. Components rotate.
4. Geometry rearranges.
5. New satellite structure forms.
6. Solar/structural elements appear.
7. Aryabhata becomes fully visible.
8. Camera slowly rotates around it.

Display:

**1975**

**ARYABHATA**

"India's first satellite."

Then remove the text gradually.

IMPORTANT:

**THE PAGE MUST NOT END HERE.**

The user must continue scrolling.

\---

# 6\. CONTINUOUS SATELLITE EVOLUTION

This is the defining feature of the website.

As the user continues scrolling, the current satellite must transform into another important Indian satellite/spacecraft.

Example journey:

ARYABHATA
↓
BHASKARA-I
↓
IRS-1A
↓
INSAT
↓
RESOURCESAT
↓
CARTOSAT
↓
OCEANSAT
↓
CHANDRAYAAN-1
↓
MARS ORBITER MISSION
↓
ASTROSAT
↓
NAVIC
↓
CHANDRAYAAN-2
↓
CHANDRAYAAN-3
↓
ADITYA-L1
↓
XPOSAT
↓
NISAR
↓
FUTURE MISSIONS

The sequence must remain one continuous 3D environment.

Do not navigate to a new page after every satellite.

Do not reload the scene.

\---

# 7\. SATELLITE TRANSFORMATION ENGINE

Build the transformation system as a reusable component.

Create a data-driven journey structure.

Example TypeScript structure:

```ts
interface JourneySatellite {
  id: string;
  name: string;
  year: number;
  modelPath: string;
  category: string;
  transformationType: string;
  cameraPosition: \[number, number, number];
  orbitType?: string;
}
```

The animation system should read this data.

Do not hard-code every satellite animation separately.

If true mesh morphing between models is technically difficult because of different topology, use a cinematic transformation:

* Particle disintegration
* Component separation
* Rotation
* Reassembly
* New satellite formation

The transition must feel intentional and cinematic.

\---

# 8\. SATELLITE ORBITAL MOTION

After each transformation, the satellite should interact naturally with Earth.

Depending on mission type:

* LEO satellites move in lower orbit.
* GEO satellites move in higher orbit.
* Navigation satellites appear in appropriate orbital configurations.
* Lunar missions can transition toward the Moon.
* Mars missions can show an Earth-to-Mars trajectory.
* Aditya-L1 can transition toward the Sun/L1 visualization.

Use subtle orbital lines.

Do not overload the scene with graphics.

\---

# 9\. SATELLITE HOVER INTERACTION

When the cursor moves over a satellite:

* Satellite glows subtly.
* Scale increases slightly.
* Cursor changes.
* Display a small floating label.

Example:

**CHANDRAYAAN-3**

"Click to explore"

Do not interrupt the scroll animation.

\---

# 10\. SATELLITE CLICK INTERACTION

When a user clicks a satellite:

1. Pause/smoothly freeze the scroll-driven animation.
2. Camera moves toward the selected satellite.
3. Satellite becomes the visual focus.
4. Background becomes slightly darker.
5. Open a full-screen satellite information interface.

The information interface should feel integrated into the 3D scene.

Do NOT send the user to a completely unrelated page unless necessary.

\---

# 11\. SATELLITE DETAILS INTERFACE

Create a premium information panel.

Example:

# CHANDRAYAAN-3

**LUNAR EXPLORATION MISSION**

Status badge:

🟢 SUCCESSFUL

Display:

* Launch date
* Launch vehicle
* Launch site
* Organisation
* Mission type
* Destination
* Status

Create tabs:

**OVERVIEW**

**MISSION**

**TECHNICAL**

**TIMELINE**

**ACHIEVEMENTS**

**GALLERY**

**3D MODEL**

Use clean typography and glassmorphism carefully.

Do not cover the entire satellite unnecessarily.

\---

# 12\. RETURN TO JOURNEY

Add:

**← RETURN TO JOURNEY**

When clicked:

* Close the information interface.
* Restore the 3D environment.
* Restore the camera.
* Restore the selected satellite.
* Return to exactly the previous scroll position.
* Allow the user to continue scrolling.

This is essential.

\---

# 13\. SATELLITE DATABASE

Create a complete structured satellite data system.

Each satellite object should support:

```ts
{
  id,
  name,
  alternateName,
  missionName,
  category,
  subCategory,
  launchDate,
  year,
  launchVehicle,
  launchSite,
  operator,
  manufacturer,
  mass,
  dimensions,
  power,
  orbitType,
  orbitAltitude,
  inclination,
  orbitalPeriod,
  destination,
  missionObjective,
  description,
  payloads,
  achievements,
  status,
  statusReason,
  failureType,
  failureReason,
  missionStart,
  missionEnd,
  missionDuration,
  image,
  thumbnail,
  model3D,
  timeline,
  gallery,
  sources
}
```

Use accurate information.

Do not invent satellite specifications.

Use official ISRO information wherever available.

\---

# 14\. IMPORTANT: INCLUDE FAILED MISSIONS

The database must include:

* Successful missions
* Operational missions
* Completed missions
* Partially successful missions
* Failed missions
* Launch failures
* On-orbit failures
* Non-operational spacecraft
* Future/approved missions

Use visual status categories:

🟢 Operational

🔵 Completed

🟡 Partially successful

🟠 Non-operational

🔴 Launch unsuccessful

⚫ Retired

For failed missions, display:

**WHAT HAPPENED?**

Explain the failure in simple language.

Never hide unsuccessful missions.

\---

# 15\. SATELLITE EXPLORER

Create a separate accessible explorer section.

Add:

Search bar:

**Search satellites, missions, years...**

Filters:

### Category

* Communication
* Earth Observation
* Navigation
* Scientific
* Experimental
* Lunar
* Planetary
* Solar

### Status

* Operational
* Completed
* Partial
* Failed
* Retired
* Future

### Year

Interactive year slider.

### Launch vehicle

* PSLV
* GSLV
* LVM3
* SLV
* ASLV
* Foreign launch vehicles

Display results as premium satellite cards.

Clicking a card should open the same satellite details interface.

\---

# 16\. TIMELINE

Create an interactive timeline from India's first satellite to present/future missions.

Timeline should support:

* Horizontal desktop layout
* Vertical mobile layout
* Search
* Category filtering
* Clickable missions

Example:

1975 → Aryabhata

1980 → Rohini

1981 → APPLE

1988 → IRS-1A

2008 → Chandrayaan-1

2013 → Mars Orbiter Mission

2015 → AstroSat

2023 → Chandrayaan-3 / Aditya-L1

2024 → XPoSat

2025 → NISAR

2026+ → Future missions

Do not hard-code incorrect future launch dates.

\---

# 17\. STATISTICS DASHBOARD

Create a visual data section.

Show dynamic statistics calculated from the database:

* Total spacecraft
* Earth observation missions
* Communication missions
* Navigation missions
* Scientific missions
* Lunar missions
* Planetary missions
* Successful missions
* Partial missions
* Failed missions
* Operational spacecraft
* Retired spacecraft

Add charts:

* Missions by decade
* Missions by category
* Mission status
* Launch vehicle distribution

Charts should update automatically when the database changes.

\---

# 18\. FINAL EXPERIENCE

After the satellite evolution reaches the modern/future stage:

Move the camera away from the satellite.

Reveal Earth.

Show many spacecraft orbiting Earth.

Camera slowly pulls backward into deep space.

Display:

# THE JOURNEY CONTINUES...

Supporting text:

"From the first satellite to the next frontier."

Buttons:

**EXPLORE ALL SATELLITES**

**RESTART JOURNEY**

\---

# 19\. VISUAL DESIGN

## Background

Near-black space.

Deep blue and purple nebula.

## Accent

Electric blue.

Secondary violet.

## Typography

Use a modern futuristic display font for headings.

Use a clean readable font for body text.

Suggested:

* Space Grotesk
* Inter
* Manrope

Do not use excessive futuristic fonts.

## UI

Use:

* Thin borders
* Transparent panels
* Soft glow
* Subtle blur
* Minimal icons
* Large whitespace

The 3D object must remain the hero.

\---

# 20\. 3D QUALITY

Use realistic 3D assets.

Earth:

* High-quality texture
* Clouds
* Atmosphere
* Day/night lighting

Rocket:

* Detailed body
* Engines
* Stages
* Payload

Satellites:

* Accurate proportions where reliable
* Metallic materials
* Solar panels
* Antennas
* Instruments

Use `.glb`/`.gltf`.

If an accurate 3D model is unavailable, create a visually representative model and clearly structure the asset system so it can be replaced later.

Do not fabricate technical specifications.

\---

# 21\. PERFORMANCE

This is a very important requirement.

Optimize for desktop and mobile.

Use:

* GLB compression
* Draco
* Lazy loading
* Level of Detail
* Compressed textures
* Instanced particles
* Dynamic model loading
* GPU-friendly shaders

Do not load every satellite model simultaneously.

Load models based on the current journey position.

Provide a reduced-performance mode for weaker devices.

\---

# 22\. RESPONSIVE DESIGN

Desktop:

Full cinematic 3D experience.

Tablet:

Reduced effects where necessary.

Mobile:

Keep the same story but simplify:

* Particle count
* Texture resolution
* 3D complexity
* Post-processing

Touch/swipe should control the journey.

All satellite details must remain fully usable on mobile.

\---

# 23\. LOADING EXPERIENCE

Create an immersive loading screen.

Display:

**INITIALIZING SPACE JOURNEY...**

Progress:

`Loading Earth...`

`Loading spacecraft...`

`Preparing orbital systems...`

`Synchronizing mission data...`

Then:

**READY**

**WITNESS THE JOURNEY →**

Do not leave users staring at a blank screen while 3D assets load.

\---

# 24\. ERROR HANDLING

If a 3D model fails:

Do not crash the website.

Show a fallback:

**3D MODEL UNAVAILABLE**

and continue the experience.

If satellite information is missing:

Show:

**Mission information currently unavailable.**

Never display undefined values.

\---

# 25\. ACCESSIBILITY

Provide:

* Keyboard navigation
* Visible focus states
* Accessible buttons
* ARIA labels
* Reduced motion mode
* High-contrast text
* Screen-reader-friendly satellite information

Add:

**REDUCE MOTION**

for users who don't want intense 3D movement.

\---

# 26\. REDUCED MOTION MODE

If the user has `prefers-reduced-motion` enabled:

Replace complex scroll animations with:

* Simple fades
* Slow transitions
* Static satellite models
* Standard page navigation

The content must remain completely accessible.

\---

# 27\. CODE QUALITY

Use:

* TypeScript
* Strong types
* Reusable components
* Clean hooks
* No duplicated code
* No giant single component
* Proper error boundaries
* Environment variables for external APIs
* Clear comments for complex 3D logic

Separate:

**UI logic**

from

**3D logic**

from

**data logic**

from

**animation logic**

\---

# 28\. DEVELOPMENT ORDER

Build the application in this exact order.

### STEP 1

Create the Next.js application.

### STEP 2

Build the space environment.

### STEP 3

Add Earth.

### STEP 4

Add rocket.

### STEP 5

Implement scroll-controlled rocket launch.

### STEP 6

Implement stage separation.

### STEP 7

Implement Rocket → Aryabhata transformation.

### STEP 8

Implement satellite → satellite transformation.

Initially use only:

Aryabhata → Bhaskara → Chandrayaan-3.

### STEP 9

Implement satellite hover.

### STEP 10

Implement satellite click.

### STEP 11

Implement satellite details interface.

### STEP 12

Implement return-to-journey state restoration.

### STEP 13

Create satellite database.

### STEP 14

Add Explorer.

### STEP 15

Add Timeline.

### STEP 16

Add Statistics.

### STEP 17

Add modern/future missions.

### STEP 18

Optimize.

### STEP 19

Test desktop/mobile.

### STEP 20

Polish animations and UI.

\---

# 29\. FIRST MVP

Do NOT attempt the entire satellite database immediately.

First make this exact prototype work:

```text
EARTH
 ↓
ROCKET
 ↓
IGNITION
 ↓
LAUNCH
 ↓
ATMOSPHERE
 ↓
SPACE
 ↓
STAGE SEPARATION
 ↓
ARYABHATA
 ↓
BHASKARA
 ↓
CHANDRAYAAN-3
 ↓
CLICK
 ↓
DETAILS
 ↓
RETURN
 ↓
CONTINUE SCROLL
```

Once this works smoothly, expand the database and satellite sequence.

\---

# 30\. FINAL QUALITY REQUIREMENT

The result must NOT look like:

* A normal dashboard
* A generic portfolio
* A simple satellite gallery
* A slideshow
* A collection of static cards
* A conventional scrolling webpage

It must feel like:

**A cinematic 3D journey through India's space history.**

The visitor should feel:

> "I am travelling through India's journey into space."

Prioritize **smoothness, storytelling, 3D depth, cinematic transitions, accurate data, and intuitive interaction** over adding unnecessary UI elements.

Build the application incrementally, keep the project runnable at every stage, and avoid placeholder functionality being presented as complete functionality.

