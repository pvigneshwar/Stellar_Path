/**
 * INDIA'S JOURNEY BEYOND EARTH — Comprehensive Satellite & Spacecraft Database
 *
 * Complete structured database of Indian spacecraft, historical milestones,
 * earth observation series, communications constellations, deep space explorers,
 * student satellites, launch failures, on-orbit failures, and future frontiers.
 *
 * Data compiled in strict adherence to official ISRO records & historical archives.
 * Structured for direct migration to PostgreSQL / REST API / GraphQL.
 */
import type { Satellite } from "@/lib/types";

export const SATELLITES: Satellite[] = [
  // ──────────────────────────────────────────────
  // 1970s — FOUNDATION ERA
  // ──────────────────────────────────────────────
  {
    id: "aryabhata",
    name: "Aryabhata",
    missionName: "Aryabhata",
    category: "scientific",
    subCategory: "Space Physics & Astronomy",
    launchDate: "1975-04-19",
    year: 1975,
    launchVehicle: "Kosmos-3M (11K65M)",
    launchSite: "Kapustin Yar Cosmodrome, USSR (Site 107/2)",
    operator: "ISRO",
    manufacturer: "ISRO Satellite Centre (ISAC), Bangalore",
    mass: 360,
    dimensions: { length: 1.4, width: 1.4, height: 1.16, diameter: 1.4 },
    power: { watts: 46, panels: "26 solar panels covering 24 of 26 polyhedral facets" },
    orbitType: "LEO",
    orbitAltitude: 568,
    inclination: 50.7,
    orbitalPeriod: 96.3,
    missionObjective:
      "Indigenous design and fabrication of a space-worthy satellite, with scientific experiments in X-ray astronomy, aeronomy, and solar physics.",
    description:
      "India's historic first satellite, named after the 5th-century Indian astronomer-mathematician. Formed as a 26-sided quasi-spherical polyhedron. Launched under a Soviet-Indian cooperation agreement. Although a power failure halted scientific telemetry on Day 5, the core spacecraft systems functioned perfectly for months, proving India's satellite engineering capability.",
    payloads: [
      "X-ray Astronomy Proportional Counter",
      "Solar Neutron & Gamma Ray Detector",
      "Aeronomy Ionospheric Sounder & Suprathermal Electron Analyzer"
    ],
    achievements: [
      "India's first satellite in history",
      "Successfully demonstrated telemetry, tracking, and ground control systems",
      "Featured on the reverse of the Indian 2-rupee banknote from 1976 to 1997"
    ],
    status: "completed",
    missionStart: "1975-04-19",
    missionEnd: "1981-03-31",
    missionDuration: "6 years in orbit (decayed Feb 11, 1992)",
    image: "/images/satellites/aryabhata.jpg",
    thumbnail: "/images/satellites/aryabhata-thumb.jpg",
    model3D: "/models/satellites/ARYABHATA.glb",
    timeline: [
      { date: "1975-04-19", title: "Liftoff", description: "Launched aboard Soviet Kosmos-3M from Kapustin Yar" },
      { date: "1975-04-24", title: "Scientific Telemetry Interrupted", description: "Power regulator line failed after 5 days of rich data" },
      { date: "1981-03-31", title: "Main Tracking Concluded", description: "Tracking continued until mainframe deactivation in 1981" },
      { date: "1992-02-11", title: "Atmospheric Re-entry", description: "Orbital decay caused re-entry after 17 years in space" }
    ],
    gallery: [
      { type: "image", url: "/images/satellites/aryabhata.jpg", caption: "Aryabhata flight model ready for payload integration" }
    ],
    sources: ["https://www.isro.gov.in/aryabhata", "https://en.wikipedia.org/wiki/Aryabhata_(satellite)"]
  },
  {
    id: "bhaskara-1",
    name: "Bhaskara-I",
    missionName: "Bhaskara-I (SEO)",
    category: "earth-observation",
    subCategory: "Satellite for Earth Observations",
    launchDate: "1979-06-07",
    year: 1979,
    launchVehicle: "C-1 Intercosmos (Kosmos-3M)",
    launchSite: "Kapustin Yar Cosmodrome, USSR",
    operator: "ISRO",
    manufacturer: "ISRO",
    mass: 442,
    dimensions: { length: 1.66, width: 1.66, height: 1.55 },
    power: { watts: 47, panels: "Solar cells on 24 exterior polyhedral panels" },
    orbitType: "LEO",
    orbitAltitude: 512,
    inclination: 50.7,
    orbitalPeriod: 95.2,
    missionObjective:
      "Conduct pioneering Earth observation in hydrology, forestry, snow cover, and oceanography using two-band TV cameras and satellite microwave radiometers (SAMIR).",
    description:
      "India's first experimental remote sensing satellite. Carried two television cameras operating in visible and near-infrared bands alongside a two-frequency microwave radiometer (SAMIR). Provided vital baseline data for ocean surface temperature, atmospheric water vapor, and land resources.",
    payloads: [
      "Two-band Television Camera System (0.54-0.66 µm and 0.75-0.85 µm)",
      "Satellite Microwave Radiometer (SAMIR at 19.35 GHz and 22.235 GHz)",
      "Data Collection Platform (DCP) Transponder"
    ],
    achievements: [
      "Pioneered satellite remote sensing for India",
      "SAMIR collected over 300,000 radiometer observations",
      "Paved the way for the operational IRS satellite series"
    ],
    status: "completed",
    missionStart: "1979-06-07",
    missionEnd: "1989-02-17",
    missionDuration: "10 years (re-entered Feb 17, 1989)",
    image: "/images/satellites/bhaskara-1.jpg",
    thumbnail: "/images/satellites/bhaskara-1-thumb.jpg",
    model3D: "/models/satellites/BHASKARA-I.glb",
    timeline: [
      { date: "1979-06-07", title: "Launch", description: "Launched into 512 km orbit via Soviet Kosmos rocket" },
      { date: "1980-05-16", title: "TV Cameras Activated", description: "TV camera subsystem successfully turned on after in-orbit debugging" },
      { date: "1989-02-17", title: "Decayed", description: "Re-entered Earth's atmosphere after a decade in orbit" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/bhaskara-1.jpg", caption: "Bhaskara-I mock-up and sensor layout" }],
    sources: ["https://www.isro.gov.in/bhaskara-I", "https://en.wikipedia.org/wiki/Bhaskara_(satellite)"]
  },

  // ──────────────────────────────────────────────
  // 1980s — INDIGENOUS LAUNCH & EXPERIMENTAL MASTERY
  // ──────────────────────────────────────────────
  {
    id: "rohini",
    name: "Rohini (RS-1)",
    missionName: "Rohini Satellite-1",
    category: "experimental",
    subCategory: "Launch Vehicle Validation",
    launchDate: "1980-07-18",
    year: 1980,
    launchVehicle: "SLV-3 (E2)",
    launchSite: "Satish Dhawan Space Centre, Sriharikota (SDSC-SHAR)",
    operator: "ISRO",
    manufacturer: "ISRO Satellite Centre (ISAC)",
    mass: 35,
    dimensions: { length: 0.8, diameter: 0.56 },
    power: { watts: 16, panels: "Body-mounted solar arrays" },
    orbitType: "LEO",
    orbitAltitude: 305,
    inclination: 44.7,
    orbitalPeriod: 90.6,
    missionObjective:
      "Evaluate the in-flight performance of India's indigenous four-stage solid-propellant Satellite Launch Vehicle (SLV-3).",
    description:
      "On July 18, 1980, SLV-3 successfully placed the Rohini RS-1 satellite into low Earth orbit from Sriharikota under the leadership of Project Director Dr. A.P.J. Abdul Kalam. This historic triumph made India the sixth nation in the world with independent satellite launch capability.",
    payloads: ["Launch Vehicle Health Monitoring Sensors", "Micro-accelerometers", "Orbital Telemetry Encoder"],
    achievements: [
      "First satellite successfully placed into orbit by an Indian rocket",
      "Propelled India into the elite club of spacefaring nations with independent launch capability",
      "Led by Project Director Dr. A.P.J. Abdul Kalam"
    ],
    status: "completed",
    missionStart: "1980-07-18",
    missionEnd: "1981-05-20",
    missionDuration: "10 months (decayed May 20, 1981)",
    image: "/images/satellites/rohini.jpg",
    thumbnail: "/images/satellites/rohini-thumb.jpg",
    timeline: [
      { date: "1979-08-10", title: "SLV-3 E1 Experimental Attempt", description: "First test flight failed due to faulty valve in second stage" },
      { date: "1980-07-18", title: "Historic SLV-3 E2 Success", description: "Rohini RS-1 successfully injected into orbit" },
      { date: "1981-05-20", title: "Re-entry", description: "Orbit decayed following 20 months in space" }
    ],
    model3D: "/models/satellites/ROHINI%20RS-1.glb",
    gallery: [{ type: "image", url: "/images/satellites/rohini.jpg", caption: "Rohini RS-1 integration on SLV-3 fourth stage" }],
    sources: ["https://www.isro.gov.in/rohini-satellite-rs-1", "https://en.wikipedia.org/wiki/Rohini_(satellite)"]
  },
  {
    id: "apple",
    name: "APPLE",
    missionName: "Ariane Passenger Payload Experiment",
    category: "communication",
    subCategory: "Three-Axis Stabilised Geostationary Testbed",
    launchDate: "1981-06-19",
    year: 1981,
    launchVehicle: "Ariane-1 (V-3)",
    launchSite: "Guiana Space Centre, Kourou, French Guiana",
    operator: "ISRO",
    manufacturer: "ISRO",
    mass: 670,
    dimensions: { length: 1.2, width: 1.2, height: 1.2, diameter: 1.2 },
    power: { watts: 210, panels: "Deployable solar array wings" },
    orbitType: "GEO",
    orbitAltitude: 35786,
    inclination: 0.1,
    orbitalPeriod: 1436,
    missionObjective:
      "Acquire hands-on experience in building and operating three-axis body-stabilized geostationary communication satellites with momentum wheel attitude control.",
    description:
      "APPLE was India's first experimental geostationary communication satellite. Famously tested for antenna pattern cleanliness on a non-magnetic wooden bullock cart before flight. Launched alongside Meteosat-2 on Ariane flight L03. Despite one solar panel failing to deploy, engineers skillfully managed power to conduct nationwide educational TV, disaster warning, and emergency communication experiments.",
    payloads: ["Two C-band Transponders (6/4 GHz)", "0.9m Diameter Parabolic Reflector Antenna"],
    achievements: [
      "India's first geostationary satellite",
      "Pioneered three-axis stabilization technology used across all subsequent INSAT/GSAT series",
      "Conducted historic live tele-education and emergency network trials across India"
    ],
    status: "completed",
    missionStart: "1981-06-19",
    missionEnd: "1983-09-20",
    missionDuration: "2 years 3 months",
    image: "/images/satellites/apple.jpg",
    thumbnail: "/images/satellites/apple-thumb.jpg",
    timeline: [
      { date: "1981-06-19", title: "Liftoff from Kourou", description: "Injected into Geostationary Transfer Orbit by Ariane-1" },
      { date: "1981-06-22", title: "Apogee Boost Motor Firing", description: "Successfully circularized orbit to 35,786 km GEO" },
      { date: "1983-09-20", title: "Mission Decommissioned", description: "De-orbited after fulfilling all mission objectives" }
    ],
    model3D: "/models/satellites/APPLE.glb",
    gallery: [{ type: "image", url: "/images/satellites/apple.jpg", caption: "APPLE satellite on its iconic wooden bullock cart test range" }],
    sources: ["https://www.isro.gov.in/apple", "https://en.wikipedia.org/wiki/APPLE_(satellite)"]
  },
  {
    id: "insat-1a-failed",
    name: "INSAT-1A",
    missionName: "INSAT-1A",
    category: "communication",
    subCategory: "Multipurpose Geostationary Satellite",
    launchDate: "1982-04-10",
    year: 1982,
    launchVehicle: "Delta 3914",
    launchSite: "Cape Canaveral SLC-17A, USA",
    operator: "ISRO / DoT / IMD / Doordarshan",
    manufacturer: "Ford Aerospace (USA) under ISRO specifications",
    mass: 1152,
    dimensions: { length: 2.18, width: 1.42, height: 1.55 },
    power: { watts: 1000, panels: "Single solar array wing + solar sail" },
    orbitType: "GEO",
    orbitAltitude: 35786,
    destination: "74°E Geostationary Slot",
    missionObjective:
      "First multipurpose satellite combining domestic telecommunications, TV broadcasting, and meteorological imaging with Data Collection Platforms.",
    description:
      "The first of the first-generation INSAT series. Conceived as a unique multipurpose platform serving telecommunications, nationwide TV relay, and weather imaging simultaneously. In orbit, the C-band antenna and solar sail faced partial deployment anomalies, and orientation thruster fuel was exhausted prematurely during sensor tracking on September 4, 1983.",
    payloads: [
      "12 C-band Transponders",
      "2 S-band High-Power Broadcast Transponders",
      "Very High Resolution Radiometer (VHRR) for Visible & IR weather imaging",
      "Data Collection Platform (DCP) Relay"
    ],
    achievements: [
      "Established the revolutionary multipurpose single-satellite architecture",
      "Provided crucial engineering lessons that turned INSAT-1B into a roaring success"
    ],
    status: "failed",
    statusReason: "Premature mission loss after 18 months due to solar sail deployment jam & propellant exhaustion.",
    failureType: "on-orbit-failure",
    failureReason:
      "The solar solar-sail failed to deploy fully in orbit, inducing an asymmetric solar radiation pressure torque. On Sept 4, 1983, a moon-sensing attitude control anomaly caused the thrusters to fire continuously, expending all remaining attitude control propellant.",
    missionStart: "1982-04-10",
    missionEnd: "1983-09-06",
    missionDuration: "18 months",
    image: "/images/satellites/insat-1a.jpg",
    thumbnail: "/images/satellites/insat-1a-thumb.jpg",
    timeline: [
      { date: "1982-04-10", title: "Launch", description: "Launched from Cape Canaveral atop Delta 3914" },
      { date: "1982-04-20", title: "Solar Sail Anomaly", description: "Solar sail failed to deploy completely, causing torque imbalance" },
      { date: "1983-09-04", title: "Propellant Exhaustion", description: "Attitude sensor lock-loss led to total fuel exhaustion" }
    ],
    model3D: "/models/satellites/INSAT-1A.glb",
    gallery: [],
    sources: ["https://en.wikipedia.org/wiki/INSAT-1A", "https://www.isro.gov.in"]
  },
  {
    id: "insat-1b",
    name: "INSAT-1B",
    missionName: "INSAT-1B",
    category: "communication",
    subCategory: "Multipurpose Operational Satellite",
    launchDate: "1983-08-30",
    year: 1983,
    launchVehicle: "Space Shuttle Challenger (STS-8)",
    launchSite: "Kennedy Space Center LC-39A, USA",
    operator: "ISRO / DoT / IMD / All India Radio",
    manufacturer: "Ford Aerospace (USA) under ISRO specifications",
    mass: 1152,
    dimensions: { length: 2.18, width: 1.42, height: 1.55 },
    power: { watts: 1000, panels: "Deployable solar array with solar sail" },
    orbitType: "GEO",
    orbitAltitude: 35786,
    inclination: 0.1,
    orbitalPeriod: 1436,
    destination: "74°E Longitude",
    missionObjective:
      "Revolutionize India's telecommunications infrastructure, direct-to-home TV broadcasting, and disaster warning weather telemetry.",
    description:
      "INSAT-1B was a game-changer for modern India. Deployed from Space Shuttle Challenger by the STS-8 crew, it became the backbone of India's communication and broadcasting revolution. It linked remote villages, enabled real-time cyclone warnings that saved tens of thousands of lives, and operated flawlessly for over a decade.",
    payloads: [
      "12 C-band Transponders",
      "2 S-band Broadcast Transponders",
      "VHRR Meteorological Radiometer",
      "Disaster Warning System (DWS) Transceiver"
    ],
    achievements: [
      "Transformed Indian television, networking 400+ TV transmitters across the nation",
      "Pioneered satellite-based Cyclone Warning Dissemination System (CWDS) along the east coast",
      "Operated for more than 10 years (design life: 7 years)"
    ],
    status: "completed",
    missionStart: "1983-08-30",
    missionEnd: "1993-08-01",
    missionDuration: "10 years",
    image: "/images/satellites/insat-1b.jpg",
    thumbnail: "/images/satellites/insat-1b-thumb.jpg",
    model3D: "/models/satellites/INSAT-1B.glb",
    timeline: [
      { date: "1983-08-30", title: "Deployed from Space Shuttle", description: "Ejected from Challenger cargo bay (STS-8)" },
      { date: "1983-10-15", title: "Fully Operational", description: "Commenced commercial telecom & weather services" },
      { date: "1993-08-01", title: "Retired", description: "Successfully phased out as INSAT-2 series took over" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/insat-1b.jpg", caption: "INSAT-1B deployment from Space Shuttle Challenger" }],
    sources: ["https://www.isro.gov.in", "https://en.wikipedia.org/wiki/INSAT-1B"]
  },
  {
    id: "irs-1a",
    name: "IRS-1A",
    missionName: "Indian Remote Sensing Satellite - 1A",
    category: "earth-observation",
    subCategory: "Operational Earth Observation",
    launchDate: "1988-03-17",
    year: 1988,
    launchVehicle: "Vostok-2M (8A92M)",
    launchSite: "Baikonur Cosmodrome Site 31/6, USSR",
    operator: "ISRO / National Remote Sensing Centre (NRSC)",
    manufacturer: "ISRO",
    mass: 975,
    dimensions: { length: 2.4, width: 1.6, height: 1.5 },
    power: { watts: 700, panels: "Two deployable solar panels (8.58 sq m)" },
    orbitType: "LEO",
    orbitAltitude: 904,
    inclination: 99.0,
    orbitalPeriod: 103.2,
    missionObjective:
      "Inaugurate India's National Natural Resources Management System (NNRMS) with high-quality multi-spectral spaceborne imagery for agriculture, forestry, hydrology, and geology.",
    description:
      "IRS-1A marked India's entry into operational civilian Earth observation. Carried indigenous Linear Imaging Self-Scanning (LISS-I & LISS-II) cameras using state-of-the-art Charge Coupled Device (CCD) arrays. It inaugurated a remote sensing dynasty that eventually grew into one of the largest constellations of Earth observation satellites in the world.",
    payloads: [
      "LISS-I Camera (72.5 m spatial resolution, 4 spectral bands, 148 km swath)",
      "LISS-IIA & LISS-IIB Cameras (36.25 m spatial resolution, 4 bands, 74 km swath each)"
    ],
    achievements: [
      "First operational Indian Remote Sensing satellite",
      "Founded the world's most comprehensive civilian Earth observation data pipeline",
      "Operated for 8 years, double its intended 3-year design life"
    ],
    status: "completed",
    missionStart: "1988-03-17",
    missionEnd: "1996-05-01",
    missionDuration: "8 years",
    image: "/images/satellites/irs-1a.jpg",
    thumbnail: "/images/satellites/irs-1a-thumb.jpg",
    model3D: "/models/satellites/IRS-1A.glb",
    timeline: [
      { date: "1988-03-17", title: "Launch", description: "Successfully injected into 904 km Sun-synchronous orbit from Baikonur" },
      { date: "1988-04-07", title: "First Imagery", description: "First LISS-I images received at NRSC Shadnagar station" },
      { date: "1996-05-01", title: "Decommissioned", description: "Retired after 8 years of exemplary continuous mapping" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/irs-1a.jpg", caption: "IRS-1A spacecraft with deployed solar wings in cleanroom" }],
    sources: ["https://www.isro.gov.in/irs-1a", "https://en.wikipedia.org/wiki/IRS-1A"]
  },

  // ──────────────────────────────────────────────
  // 1990s — MATURATION & EXPANSION
  // ──────────────────────────────────────────────
  {
    id: "oceansat-1",
    name: "Oceansat-1",
    missionName: "IRS-P4 (Oceansat-1)",
    category: "earth-observation",
    subCategory: "Oceanographic & Marine Mapping",
    launchDate: "1999-05-26",
    year: 1999,
    launchVehicle: "PSLV-C2",
    launchSite: "Satish Dhawan Space Centre (SDSC-SHAR)",
    operator: "ISRO / Ministry of Earth Sciences",
    manufacturer: "ISRO",
    mass: 1050,
    dimensions: { length: 2.2, width: 1.8, height: 1.7 },
    power: { watts: 750, panels: "Two solar array panels" },
    orbitType: "LEO",
    orbitAltitude: 720,
    inclination: 98.28,
    orbitalPeriod: 99.31,
    missionObjective:
      "Gather multi-spectral ocean color observations for potential fishing zone (PFZ) advisories and measure sea surface winds via multi-frequency scanning radiometer.",
    description:
      "India's first satellite dedicated exclusively to ocean applications. Launched on PSLV's first operational commercial mission alongside South Korea's KITSAT-3 and Germany's DLR-TUBSAT. Equipped with an Ocean Colour Monitor (OCM) and Multi-frequency Scanning Microwave Radiometer (MSMR).",
    payloads: [
      "Ocean Colour Monitor (OCM - 8 spectral bands, 360 m spatial resolution)",
      "Multi-frequency Scanning Microwave Radiometer (MSMR - 6.6, 10.65, 18.0 & 21.0 GHz)"
    ],
    achievements: [
      "First Indian ocean observation satellite",
      "Generated daily Potential Fishing Zone (PFZ) forecasts benefiting coastal fishermen",
      "Operated for 11 years (design life: 5 years)"
    ],
    status: "completed",
    missionStart: "1999-05-26",
    missionEnd: "2010-08-08",
    missionDuration: "11 years 2 months",
    image: "/images/satellites/oceansat-1.jpg",
    thumbnail: "/images/satellites/oceansat-1-thumb.jpg",
    model3D: "/models/satellites/OCEANSAT-1.glb",
    timeline: [
      { date: "1999-05-26", title: "Launch", description: "Launched on PSLV-C2 along with 2 foreign co-passengers" },
      { date: "2010-08-08", title: "Mission Completion", description: "Decommissioned after 11 years of valuable ocean data" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/oceansat-1.jpg", caption: "Oceansat-1 payload testing" }],
    sources: ["https://www.isro.gov.in", "https://en.wikipedia.org/wiki/Oceansat-1"]
  },

  // ──────────────────────────────────────────────
  // 2000s — HIGH RESOLUTION & DEEP SPACE INCEPTION
  // ──────────────────────────────────────────────
  {
    id: "resourcesat-1",
    name: "Resourcesat-1",
    missionName: "IRS-P6 (Resourcesat-1)",
    category: "earth-observation",
    subCategory: "Multi-Resolution Resource Monitoring",
    launchDate: "2003-10-17",
    year: 2003,
    launchVehicle: "PSLV-C5",
    launchSite: "Satish Dhawan Space Centre (SDSC-SHAR)",
    operator: "ISRO",
    manufacturer: "ISRO",
    mass: 1360,
    dimensions: { length: 2.0, width: 1.8, height: 1.8 },
    power: { watts: 1250, panels: "Two solar array panels" },
    orbitType: "LEO",
    orbitAltitude: 817,
    inclination: 98.7,
    orbitalPeriod: 101.35,
    missionObjective:
      "Provide integrated multi-resolution imaging for agricultural yield estimates, water resource budgeting, disaster management, and land-use mapping.",
    description:
      "The state-of-the-art continuation of the IRS series. Carried three advanced optical sensors: the high-resolution LISS-4 (5.8m resolution), LISS-3 (23.5m resolution), and the wide-swath AWiFS (56m resolution with a massive 740 km footprint).",
    payloads: [
      "LISS-4 Multispectral/Mono Camera (5.8 m resolution, 23.9 km / 70 km swath)",
      "LISS-3 Multispectral Camera (23.5 m resolution, 141 km swath)",
      "Advanced Wide Field Sensor (AWiFS - 56 m resolution, 740 km swath)"
    ],
    achievements: [
      "Introduced sub-6m multispectral civilian imaging in India",
      "Global benchmark for national agricultural inventory mapping",
      "Operated for over 10 years"
    ],
    status: "completed",
    missionStart: "2003-10-17",
    missionEnd: "2013-10-01",
    missionDuration: "10 years",
    image: "/images/satellites/resourcesat-1.jpg",
    thumbnail: "/images/satellites/resourcesat-1-thumb.jpg",
    model3D: "/models/satellites/RESOURCESAT-1.glb",
    timeline: [
      { date: "2003-10-17", title: "Launch", description: "Successfully launched into Sun-synchronous orbit via PSLV-C5" }
    ],
    gallery: [],
    sources: ["https://www.isro.gov.in", "https://en.wikipedia.org/wiki/Resourcesat-1"]
  },
  {
    id: "cartosat-1",
    name: "Cartosat-1",
    missionName: "IRS-P5 (Cartosat-1)",
    category: "earth-observation",
    subCategory: "Stereo Cartographic Mapping",
    launchDate: "2005-05-05",
    year: 2005,
    launchVehicle: "PSLV-C6",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO / Survey of India",
    manufacturer: "ISRO",
    mass: 1560,
    dimensions: { length: 2.5, width: 2.0, height: 2.0 },
    power: { watts: 1100, panels: "Two solar array panels" },
    orbitType: "LEO",
    orbitAltitude: 618,
    inclination: 97.87,
    orbitalPeriod: 97.0,
    missionObjective:
      "Generate high-resolution stereoscopic imagery (2.5m resolution) for Digital Elevation Models (DEM), urban cadastral mapping, and terrain modeling.",
    description:
      "India's dedicated stereoscopic cartography spacecraft. Carried two panchromatic cameras mounted with a fore-and-aft tilt (+26° and -5°) along the flight track to simultaneously acquire 3D stereo imagery of Earth's topography in a single pass.",
    payloads: [
      "PAN-Fore Camera (2.5 m resolution, tilted +26° forward)",
      "PAN-Aft Camera (2.5 m resolution, tilted -5° backward)"
    ],
    achievements: [
      "Inaugurated national high-precision 3D digital elevation mapping",
      "First operational launch from Sriharikota's Second Launch Pad (SLP)",
      "Operated for 14 years (design life: 5 years)"
    ],
    status: "completed",
    missionStart: "2005-05-05",
    missionEnd: "2019-05-01",
    missionDuration: "14 years",
    image: "/images/satellites/cartosat-1.jpg",
    thumbnail: "/images/satellites/cartosat-1-thumb.jpg",
    model3D: "/models/satellites/CARTOSAT-1.glb",
    timeline: [
      { date: "2005-05-05", title: "Inaugural Launch from SLP", description: "PSLV-C6 launched from newly built Second Launch Pad" }
    ],
    gallery: [],
    sources: ["https://www.isro.gov.in", "https://en.wikipedia.org/wiki/Cartosat-1"]
  },
  {
    id: "chandrayaan-1",
    name: "Chandrayaan-1",
    missionName: "Chandrayaan-1 Lunar Orbiter",
    category: "lunar",
    subCategory: "Lunar Discovery Mission",
    launchDate: "2008-10-22",
    year: 2008,
    launchVehicle: "PSLV-XL (C11)",
    launchSite: "Satish Dhawan Space Centre (SDSC-SHAR)",
    operator: "ISRO",
    manufacturer: "ISRO Satellite Centre (ISAC)",
    mass: 1380,
    dimensions: { length: 1.5, width: 1.5, height: 1.5 },
    power: { watts: 700, panels: "Single cantilevered solar array (2.15m x 1.8m)" },
    orbitType: "Lunar",
    orbitAltitude: 100,
    inclination: 90,
    orbitalPeriod: 118,
    destination: "Moon Polar Orbit (100 km)",
    missionObjective:
      "Perform high-resolution chemical, mineralogical, and photo-geological mapping of the entire lunar surface and investigate the presence of water ice at lunar poles.",
    description:
      "India's historic first deep-space mission to the Moon. Carried 11 scientific instruments (5 Indian, 6 international including NASA and ESA). On November 14, 2008, the Moon Impact Probe (MIP) separated and struck the lunar south pole near Shackleton Crater, directly discovering hydroxyl/water molecules in the thin lunar exosphere prior to impact. The aboard NASA Moon Mineralogy Mapper (M3) confirmed widespread surface water-ice signatures.",
    payloads: [
      "Terrain Mapping Camera (TMC - 5m stereo resolution)",
      "Moon Impact Probe (MIP - with mass spectrometer & video camera)",
      "Moon Mineralogy Mapper (M3 - NASA Imaging Spectrometer)",
      "Miniature Synthetic Aperture Radar (Mini-SAR - NASA)",
      "Sub-keV Atom Reflecting Analyzer (SARA - ESA/ISRO)",
      "Moon Mineralogy Mapper (MoonM3)",
      "Hyper Spectral Imager (HySI)",
      "Lunar Laser Ranging Instrument (LLRI)",
      "High Energy X-ray Spectrometer (HEX)"
    ],
    achievements: [
      "First spacecraft in human history to conclusively confirm water molecules (H2O and OH) on the Moon",
      "Moon Impact Probe (MIP) planted the Indian Tricolour on the lunar south pole (named Point Jawahar)",
      "Completed over 3,400 lunar orbits and generated the most detailed 3D chemical lunar atlas"
    ],
    status: "completed",
    missionStart: "2008-10-22",
    missionEnd: "2009-08-29",
    missionDuration: "312 days (exceeded critical goals)",
    image: "/images/satellites/chandrayaan-1.jpg",
    thumbnail: "/images/satellites/chandrayaan-1-thumb.jpg",
    model3D: "/models/satellites/CHANDRAYAAN-1.glb",
    timeline: [
      { date: "2008-10-22", title: "Launch from Sriharikota", description: "Launched atop PSLV-XL C11 into elliptical Earth orbit" },
      { date: "2008-11-08", title: "Lunar Orbit Insertion (LOI)", description: "Captured into lunar gravity via retro-burn" },
      { date: "2008-11-14", title: "MIP Lunar South Pole Impact", description: "Impact probe struck south pole, detecting water signatures in transit" },
      { date: "2009-08-29", title: "Telemetry Lost", description: "Contact lost due to star sensor thermal degradation; 95% science achieved" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/chandrayaan-1.jpg", caption: "Chandrayaan-1 in cleanroom integration with Moon Impact Probe" }],
    sources: ["https://www.isro.gov.in/chandrayaan-1", "https://en.wikipedia.org/wiki/Chandrayaan-1"]
  },

  // ──────────────────────────────────────────────
  // 2010s — PLANETARY EXPLORATION & REGIONAL AUTONOMY
  // ──────────────────────────────────────────────
  {
    id: "gsat-5p-failed",
    name: "GSAT-5P",
    missionName: "GSAT-5P / GSLV-F06",
    category: "communication",
    subCategory: "Heavy C-band Communications",
    launchDate: "2010-12-25",
    year: 2010,
    launchVehicle: "GSLV-Mk II (F06)",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO",
    manufacturer: "ISRO",
    mass: 2310,
    dimensions: { length: 2.4, width: 1.7, height: 1.7 },
    orbitType: "GEO",
    destination: "55°E Geostationary Slot",
    missionObjective: "Augment high-power C-band transponder capacity for television, VSAT networking, and tele-health.",
    description:
      "A heavy communications spacecraft designed to carry 24 C-band and 12 Extended C-band transponders. Launched on Christmas Day 2010 aboard GSLV-F06. Shortly after liftoff, the rocket lost control command signals to the liquid strap-on boosters, triggering automatic range safety destruct.",
    payloads: ["24 Standard C-band Transponders", "12 Extended C-band Transponders"],
    achievements: [],
    status: "failed",
    statusReason: "Launch vehicle failure at T+47 seconds due to broken connectors in the avionics bay.",
    failureType: "launch-failure",
    failureReason:
      "At 47.5 seconds into flight, the electrical connector carrying control signals from the equipment bay to the four liquid strap-on motors snapped due to aerodynamic load. Vehicle lost control and was destroyed by Range Safety at T+63.8 seconds.",
    missionStart: "2010-12-25",
    missionEnd: "2010-12-25",
    missionDuration: "64 seconds",
    image: "/images/satellites/gsat-5p.jpg",
    thumbnail: "/images/satellites/gsat-5p-thumb.jpg",
    timeline: [
      { date: "2010-12-25", title: "Launch Failure", description: "GSLV-F06 lost vehicle control at 47 seconds and was terminated over the Bay of Bengal" }
    ],
    model3D: "/models/satellites/GSAT-5P.glb",
    gallery: [],
    sources: ["https://en.wikipedia.org/wiki/GSAT-5P", "https://www.isro.gov.in"]
  },
  {
    id: "mars-orbiter-mission",
    name: "Mars Orbiter Mission",
    missionName: "Mangalyaan (MOM)",
    alternateName: "Mangalyaan",
    category: "planetary",
    subCategory: "Interplanetary Mars Exploration",
    launchDate: "2013-11-05",
    year: 2013,
    launchVehicle: "PSLV-XL (C25)",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "ISRO",
    manufacturer: "U R Rao Satellite Centre (URSC)",
    mass: 1337,
    dimensions: { length: 1.5, width: 1.5, height: 1.5 },
    power: { watts: 840, panels: "Three solar array panels (1.8m x 1.4m each)" },
    orbitType: "Mars",
    orbitAltitude: 420,
    inclination: 150,
    orbitalPeriod: 4320,
    destination: "Mars Orbit (420 km x 76,993 km)",
    missionObjective:
      "Develop technologies required for design, planning, management, and operations of an interplanetary mission; explore Martian surface features, morphology, mineralogy, and atmosphere.",
    description:
      "India's historic first interplanetary mission. Launched on November 5, 2013, MOM achieved Mars Orbit Insertion on September 24, 2014 on its maiden attempt. With a total budget of just $74 million (less than the budget of the Hollywood movie Gravity), ISRO became the first Asian nation to reach Mars orbit and the first in the world to do so on its very first attempt. Designed for a 6-month lifespan, the orbiter operated for nearly 8 years.",
    payloads: [
      "Mars Colour Camera (MCC - Tri-color imaging)",
      "Thermal Infrared Imaging Spectrometer (TIS)",
      "Methane Sensor for Mars (MSM)",
      "Mars Exospheric Neutral Composition Analyzer (MENCA)",
      "Lyman Alpha Photometer (LAP)"
    ],
    achievements: [
      "First nation in the world to reach Mars orbit on its maiden attempt",
      "First Asian nation to successfully reach the Red Planet",
      "Most cost-effective interplanetary mission ever accomplished ($74 million USD)",
      "Operated for 7.5 years (planned: 6 months), capturing full-globe Martian dust storm transitions and Deimos pictures"
    ],
    status: "completed",
    missionStart: "2013-11-05",
    missionEnd: "2022-10-02",
    missionDuration: "7 years 11 months in Mars orbit",
    image: "/images/satellites/mom.jpg",
    thumbnail: "/images/satellites/mom-thumb.jpg",
    model3D: "/models/satellites/MANGALYAAN.glb",
    timeline: [
      { date: "2013-11-05", title: "Launch from Sriharikota", description: "Injected into highly elliptical Earth orbit by PSLV-XL C25" },
      { date: "2013-12-01", title: "Trans-Mars Injection (TMI)", description: "Liquid Apogee Motor fired to leave Earth orbit on heliocentric trajectory" },
      { date: "2014-09-24", title: "Mars Orbit Insertion (MOI)", description: "LAM engine fired for 24 minutes; flawlessly entered Martian orbit" },
      { date: "2022-10-02", title: "Mission Concluded", description: "Propellant exhausted following eclipse maneuvers after 8 years of science" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/mom.jpg", caption: "Mangalyaan fully integrated with high-gain antenna deployed" }],
    sources: ["https://www.isro.gov.in/pslv-c25-mars-orbiter-mission", "https://en.wikipedia.org/wiki/Mars_Orbiter_Mission"]
  },
  {
    id: "astrosat",
    name: "AstroSat",
    missionName: "AstroSat Space Observatory",
    category: "scientific",
    subCategory: "Multi-wavelength Space Observatory",
    launchDate: "2015-09-28",
    year: 2015,
    launchVehicle: "PSLV-XL (C30)",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "ISRO / IUCAA / TIFR / IIA / RRI",
    manufacturer: "ISRO / U R Rao Satellite Centre",
    mass: 1513,
    dimensions: { length: 1.96, width: 1.75, height: 1.3 },
    power: { watts: 1600, panels: "Two solar array wings (12 sq m)" },
    orbitType: "LEO",
    orbitAltitude: 650,
    inclination: 6.0,
    orbitalPeriod: 97.7,
    missionObjective:
      "Operate a world-class multi-wavelength astronomy observatory to study compact stellar remnants, black holes, neutron stars, active galactic nuclei, and starburst galaxies across optical, UV, soft X-ray, and hard X-ray bands simultaneously.",
    description:
      "India's first dedicated multi-wavelength space astronomy observatory. AstroSat observes the cosmos simultaneously across five energy bands (optical, near-UV, far-UV, soft X-ray, and hard X-ray). As of 2026, it remains fully operational in orbit, serving astronomers worldwide and publishing hundreds of breakthrough astrophysics discoveries.",
    payloads: [
      "Ultra Violet Imaging Telescope (UVIT - Dual FUV & NUV/Visible telescopes)",
      "Large Area X-ray Proportional Counter (LAXPC - 3-80 keV)",
      "Soft X-ray Telescope (SXT - 0.3-8.0 keV with grazing incidence X-ray mirrors)",
      "Cadmium Zinc Telluride Imager (CZTI - 10-150 keV hard X-ray polarimeter)",
      "Scanning Sky Monitor (SSM - 2.5-10 keV transient alert instrument)"
    ],
    achievements: [
      "India's premier space telescope, operating continuously for over 10 years",
      "Discovered extreme-UV radiation from a galaxy 9.3 billion light-years away (AUDFs01)",
      "Observed thousands of cosmic events, black hole binary bursts, and gamma-ray flashes"
    ],
    status: "operational",
    missionStart: "2015-09-28",
    image: "/images/satellites/astrosat.jpg",
    thumbnail: "/images/satellites/astrosat-thumb.jpg",
    model3D: "/models/satellites/ASTROSAT.glb",
    timeline: [
      { date: "2015-09-28", title: "Launch", description: "Launched into 650 km, 6° low-inclination orbit via PSLV-XL C30" },
      { date: "2015-10-06", title: "First Light", description: "CZTI detector opened and recorded first Crab Nebula X-ray pulse" },
      { date: "2020-09-28", title: "5-Year Mark", description: "Completed design life; mission extended indefinitely" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/astrosat.jpg", caption: "AstroSat payload deck with UVIT and SXT optics" }],
    sources: ["https://www.isro.gov.in/astrosat-0", "https://en.wikipedia.org/wiki/AstroSat"]
  },
  {
    id: "pratham",
    name: "Pratham",
    missionName: "Pratham Student Satellite",
    category: "experimental",
    subCategory: "University Micro-Satellite",
    launchDate: "2016-09-26",
    year: 2016,
    launchVehicle: "PSLV-C35",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "IIT Bombay / ISRO",
    manufacturer: "IIT Bombay Student Team",
    mass: 10.15,
    dimensions: { length: 0.3, width: 0.3, height: 0.3 },
    power: { watts: 12, panels: "Body-mounted solar cells" },
    orbitType: "LEO",
    orbitAltitude: 670,
    inclination: 98.18,
    orbitalPeriod: 98.2,
    missionObjective:
      "Empower students in satellite engineering and measure Total Electron Content (TEC) across the ionosphere over India and Paris.",
    description:
      "A landmark student satellite fully designed, fabricated, and integrated by undergraduate and postgraduate students of IIT Bombay with mentorship from ISRO scientists. Transmitted dual-frequency beacon signals to map ionospheric electron density.",
    payloads: ["Dual Frequency Radio Beacon (145.98 MHz & 437.45 MHz)"],
    achievements: [
      "Pioneered high-reliability university student satellite culture in India",
      "Successfully received radio beacons by amateur radio operators worldwide"
    ],
    status: "completed",
    missionStart: "2016-09-26",
    missionEnd: "2017-02-01",
    missionDuration: "4 months",
    image: "/images/satellites/pratham.jpg",
    thumbnail: "/images/satellites/pratham-thumb.jpg",
    timeline: [
      { date: "2016-09-26", title: "Launch", description: "Launched as co-passenger on PSLV-C35" }
    ],
    model3D: "/models/satellites/PRATHAM.glb",
    gallery: [],
    sources: ["https://www.isro.gov.in", "https://en.wikipedia.org/wiki/Pratham_(satellite)"]
  },
  {
    id: "irnss-1h-failed",
    name: "IRNSS-1H",
    missionName: "IRNSS-1H Navigation Satellite",
    category: "navigation",
    subCategory: "Regional Positioning System",
    launchDate: "2017-08-31",
    year: 2017,
    launchVehicle: "PSLV-XL (C39)",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO",
    manufacturer: "ISRO / Consortium of Indian Industries",
    mass: 1425,
    dimensions: { length: 1.58, width: 1.5, height: 1.5 },
    orbitType: "GEO",
    destination: "Sub-Geosynchronous Transfer Orbit",
    missionObjective: "Replace failed atomic clocks on IRNSS-1A in the NavIC constellation.",
    description:
      "Intended to replenish the NavIC navigation constellation. During launch aboard PSLV-C39, the payload fairing (heat shield) failed to separate during the second stage burn. The trapped satellite was injected into a useless low orbit inside the closed fairing.",
    payloads: ["L5 and S-band Navigation Transmitters", "Rubidium Atomic Clocks", "C-band Ranging Transponder"],
    achievements: [],
    status: "failed",
    statusReason: "Payload fairing failed to separate at T+3m 24s; satellite trapped inside dead heat shield.",
    failureType: "launch-failure",
    failureReason:
      "The payload fairing pyrotechnic separation system failed to initiate. The extra 1,182 kg mass of the unseparated heat shield reduced velocity increment, leaving the satellite trapped inside the nosecone in an unusable low Earth orbit.",
    missionStart: "2017-08-31",
    missionEnd: "2017-08-31",
    missionDuration: "20 minutes (decayed in atmosphere)",
    image: "/images/satellites/irnss-1h.jpg",
    thumbnail: "/images/satellites/irnss-1h-thumb.jpg",
    timeline: [
      { date: "2017-08-31", title: "Launch Anomaly", description: "Heat shield failed to separate; satellite declared lost" }
    ],
    model3D: "/models/satellites/IRNSS-1H.glb",
    gallery: [],
    sources: ["https://en.wikipedia.org/wiki/IRNSS-1H", "https://www.isro.gov.in"]
  },
  {
    id: "navic",
    name: "NavIC (IRNSS-1I)",
    missionName: "IRNSS-1I (NavIC Constellation)",
    alternateName: "IRNSS-1I",
    category: "navigation",
    subCategory: "Autonomous Satellite Navigation",
    launchDate: "2018-04-12",
    year: 2018,
    launchVehicle: "PSLV-XL (C41)",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "ISRO",
    manufacturer: "ISRO with Alpha Design Technologies consortium",
    mass: 1425,
    dimensions: { length: 1.58, width: 1.5, height: 1.5 },
    power: { watts: 1660, panels: "Two solar array wings" },
    orbitType: "GEO",
    orbitAltitude: 36000,
    inclination: 29.0,
    orbitalPeriod: 1436,
    destination: "Geosynchronous Orbit (55°E Slot)",
    missionObjective:
      "Provide sovereign, high-precision positioning, navigation, and timing (PNT) services across the Indian landmass and 1,500 km beyond its borders.",
    description:
      "The critical satellite that completed the initial 7-satellite constellation of NavIC (Navigation with Indian Constellation). Built with private Indian industry collaboration. NavIC provides both Standard Positioning Service (SPS) for civilians and encrypted Restricted Service (RS) for strategic defense applications.",
    payloads: [
      "Navigation Payload (L5 band 1176.45 MHz & S band 2492.028 MHz)",
      "High-accuracy Rubidium Atomic Frequency Standards (RAFS)",
      "Corner Cube Retroreflectors for Laser Ranging"
    ],
    achievements: [
      "Completed India's sovereign satellite navigation constellation (NavIC)",
      "Provides sub-5 meter positioning accuracy across South Asia",
      "Mandated in all Indian commercial vehicles, navigation devices, and 5G smartphones"
    ],
    status: "operational",
    missionStart: "2018-04-12",
    image: "/images/satellites/navic.jpg",
    thumbnail: "/images/satellites/navic-thumb.jpg",
    model3D: "/models/satellites/NAVIC.glb",
    timeline: [
      { date: "2018-04-12", title: "Flawless Injection", description: "PSLV-C41 successfully injected IRNSS-1I into Sub-GTO" },
      { date: "2018-04-20", title: "Operational in NavIC Grid", description: "Successfully positioned in inclined geosynchronous orbit" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/navic.jpg", caption: "IRNSS-1I spacecraft undergoing solar array deployment tests" }],
    sources: ["https://www.isro.gov.in/irnss-1i", "https://en.wikipedia.org/wiki/IRNSS-1I"]
  },
  {
    id: "chandrayaan-2",
    name: "Chandrayaan-2",
    missionName: "Chandrayaan-2 (Orbiter, Vikram & Pragyan)",
    category: "lunar",
    subCategory: "Integrated Lunar Explorer",
    launchDate: "2019-07-22",
    year: 2019,
    launchVehicle: "GSLV-Mk III (M1) / LVM3",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO",
    manufacturer: "ISRO",
    mass: 3850,
    dimensions: { length: 3.1, width: 3.1, height: 5.8 },
    power: { watts: 1000, panels: "Orbiter solar array + Lander panels" },
    orbitType: "Lunar",
    orbitAltitude: 100,
    inclination: 90,
    orbitalPeriod: 118,
    destination: "Lunar Polar Orbit (Orbiter) / 70.9°S Lunar Surface (Lander)",
    missionObjective:
      "Demonstrate soft-landing capability near the lunar south pole, deploy the Pragyan rover, and conduct ultra-high-resolution multi-spectral orbiter mapping.",
    description:
      "India's most complex space exploration mission at the time, combining an advanced Orbiter, the Vikram Lander, and the Pragyan Rover. On September 6, 2019, during the final '15 minutes of terror' powered descent, Vikram encountered software braking anomalies at 2.1 km altitude and made a hard landing. However, the Chandrayaan-2 Orbiter with its 8 cutting-edge instruments was placed into a pristine 100 km orbit, where it continues to operate as the highest-resolution mapping satellite around the Moon.",
    payloads: [
      "Orbiter High Resolution Camera (OHRC - 0.25 m resolution, highest around Moon)",
      "Terrain Mapping Camera-2 (TMC-2)",
      "Dual Frequency Synthetic Aperture Radar (DFSAR - L & S band)",
      "Chandra's Atmospheric Composition Explorer-2 (CHACE-2)",
      "CLASS X-ray Spectrometer",
      "Vikram Lander (with ChaSTE, RAMBHA, ILSA)",
      "Pragyan Rover (with APXS & LIBS)"
    ],
    achievements: [
      "Chandrayaan-2 Orbiter remains the highest resolution imaging platform around the Moon (0.25 m/pixel)",
      "Identified permanently shadowed craters with extensive water-ice deposits",
      "Relayed critical high-resolution landing site mapping for Chandrayaan-3's historic landing"
    ],
    status: "partial",
    statusReason: "Orbiter 100% operational in lunar orbit. Vikram lander crashed during final touchdown on Sept 6, 2019.",
    failureType: "partial-success",
    failureReason:
      "During Phase 2 of powered descent (Rough Braking to Fine Braking), thrust reduction exceeded design limits, causing accumulated velocity errors. The navigation software attempted rapid trajectory correction, exceeding orientation rates and causing a hard landing at 70.9°S.",
    missionStart: "2019-07-22",
    image: "/images/satellites/chandrayaan-2.jpg",
    thumbnail: "/images/satellites/chandrayaan-2-thumb.jpg",
    model3D: "/models/satellites/CHANDRAYAAN-2.glb",
    timeline: [
      { date: "2019-07-22", title: "Launch", description: "Launched aboard inaugural operational GSLV-Mk III M1" },
      { date: "2019-08-20", title: "Lunar Orbit Insertion", description: "Successfully circularized into 100 km polar lunar orbit" },
      { date: "2019-09-02", title: "Vikram Separation", description: "Vikram lander separated from Orbiter for descent" },
      { date: "2019-09-06", title: "Powered Descent Hard Landing", description: "Contact lost at 2.1 km altitude; Orbiter safe and fully functional" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/chandrayaan-2.jpg", caption: "Chandrayaan-2 Orbiter and Vikram Lander stacked together" }],
    sources: ["https://www.isro.gov.in/chandrayaan2-home", "https://en.wikipedia.org/wiki/Chandrayaan-2"]
  },

  // ──────────────────────────────────────────────
  // 2020s — GOLDEN ERA & HISTORIC FIRSTS
  // ──────────────────────────────────────────────
  {
    id: "chandrayaan-3",
    name: "Chandrayaan-3",
    missionName: "Chandrayaan-3 Lunar South Pole Landing",
    category: "lunar",
    subCategory: "Lunar South Pole Soft Lander & Rover",
    launchDate: "2023-07-14",
    year: 2023,
    launchVehicle: "LVM3 (M4)",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO",
    manufacturer: "ISRO / URSC / VSSC / LPSC / SAC",
    mass: 3900,
    dimensions: { length: 2.0, width: 2.0, height: 2.5 },
    power: { watts: 738, panels: "Lander (738W) & Rover (50W) solar arrays" },
    orbitType: "Lunar",
    orbitAltitude: 0,
    destination: "Moon South Pole (69.373° S, 32.319° E - Shiv Shakti Point)",
    missionObjective:
      "Demonstrate safe and soft landing near the lunar south pole, conduct in-situ roving with Pragyan, and measure lunar surface thermal conductivity, seismicity, and elemental composition.",
    description:
      "On August 23, 2023 at 18:04 IST, Chandrayaan-3's Vikram lander made history by achieving the world's first soft landing near the Moon's South Pole. This landmark achievement made India only the fourth nation to soft-land on the Moon and the first ever in the southern polar region. The Pragyan rover rolled down the ramp, traveled 103 meters across the lunar regolith, confirmed the presence of Sulfur, Aluminum, Calcium, Iron, and Titanium, and conducted the historic 'Hop Experiment' before entering planned sleep mode.",
    payloads: [
      "ChaSTE (Chandra's Surface Thermophysical Experiment - first thermal depth profile)",
      "ILSA (Instrument for Lunar Seismic Activity - recorded lunar micro-quakes)",
      "LP (Langmuir Probe - measured lunar surface plasma density)",
      "LIBS (Laser Induced Breakdown Spectroscope on Pragyan Rover - detected Sulfur)",
      "APXS (Alpha Particle X-Ray Spectrometer on Rover)",
      "SHAPE (Spectro-polarimetry of Habitable Planet Earth on Propulsion Module)"
    ],
    achievements: [
      "First country in human history to land near the lunar South Pole",
      "Landing site officially designated 'Shiv Shakti Point' by the International Astronomical Union",
      "August 23 declared India's 'National Space Day'",
      "First in-situ direct confirmation of Sulfur (S) on lunar south polar regolith",
      "Successfully performed in-situ 'Hop Experiment', firing lander engines to lift 40 cm and re-land"
    ],
    status: "completed",
    missionStart: "2023-07-14",
    missionEnd: "2023-09-22",
    missionDuration: "1 Lunar Day (14 Earth days active operations; completed 100% goals)",
    image: "/images/satellites/chandrayaan-3.jpg",
    thumbnail: "/images/satellites/chandrayaan-3-thumb.jpg",
    model3D: "/models/satellites/CHANDRAYAAN-3.glb",
    timeline: [
      { date: "2023-07-14", title: "Launch aboard LVM3-M4", description: "Flawless injection into Earth orbit from Sriharikota" },
      { date: "2023-08-05", title: "Lunar Orbit Insertion", description: "Captured into lunar orbit following translunar injection" },
      { date: "2023-08-23", title: "Historic Touchdown", description: "Soft-landed at Shiv Shakti Point (69.373° S, 32.319° E) at 18:04 IST" },
      { date: "2023-08-24", title: "Pragyan Rover Rollout", description: "Rover ramp deployed; Pragyan rolled onto lunar regolith" },
      { date: "2023-09-03", title: "Lander Hop Experiment", description: "Vikram fired engines, hopped 40 cm up and touched down safely" },
      { date: "2023-09-04", title: "Lunar Night Sleep Mode", description: "Pay-loads safely put to sleep after completing all mission objectives" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/chandrayaan-3.jpg", caption: "Vikram Lander on the lunar surface captured by Pragyan Rover" }],
    sources: ["https://www.isro.gov.in/Chandrayaan3.html", "https://en.wikipedia.org/wiki/Chandrayaan-3"]
  },
  {
    id: "aditya-l1",
    name: "Aditya-L1",
    missionName: "Aditya-L1 Solar Coronagraphy & Heliophysics Observatory",
    category: "solar",
    subCategory: "Sun-Earth Lagrange Point 1 Observatory",
    launchDate: "2023-09-02",
    year: 2023,
    launchVehicle: "PSLV-XL (C57)",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO / IIA / IUCAA / VSSC",
    manufacturer: "ISRO / URSC",
    mass: 1475,
    dimensions: { length: 2.5, width: 2.0, height: 1.8 },
    power: { watts: 1670, panels: "Two solar array wings" },
    orbitType: "L1",
    orbitAltitude: 1500000,
    destination: "Sun-Earth Lagrange Point 1 Halo Orbit",
    missionObjective:
      "Uninterrupted 24/7 observation of the Sun without eclipses, studying solar coronal heating, coronal mass ejections (CMEs), solar wind dynamics, and space weather forecasting.",
    description:
      "India's first dedicated solar observatory spacecraft. Stationed in a periodic halo orbit around the first Sun-Earth Lagrange Point (L1), 1.5 million kilometers from Earth. Equipped with seven advanced instruments (4 remote sensing telescopes and 3 in-situ particle/magnetic sensors). Successfully arrived in L1 halo orbit on January 6, 2024.",
    payloads: [
      "VELC (Visible Emission Line Coronagraph - captures 1 CME image per minute)",
      "SUIT (Solar Ultraviolet Imaging Telescope - 200-400 nm full-disk solar disk imager)",
      "ASPEX (Aditya Solar wind Particle Experiment)",
      "PAPA (Plasma Analyser Package for Aditya)",
      "SoLEXS (Solar Low Energy X-ray Spectrometer)",
      "HEL1OS (High Energy L1 Orbiting X-ray Spectrometer)",
      "Digital Fluxgate Magnetometer"
    ],
    achievements: [
      "India's first solar space observatory",
      "Successfully placed into halo orbit around Sun-Earth L1 (1.5 million km away)",
      "Captured historic full-disk ultraviolet solar images during the intense May 2024 geomagnetic storms"
    ],
    status: "operational",
    missionStart: "2023-09-02",
    image: "/images/satellites/aditya-l1.jpg",
    thumbnail: "/images/satellites/aditya-l1-thumb.jpg",
    model3D: "/models/satellites/ADITYA-L1.glb",
    timeline: [
      { date: "2023-09-02", title: "Launch on PSLV-C57", description: "Injected into eccentric Earth parking orbit" },
      { date: "2023-09-19", title: "Trans-Lagrangean 1 Insertion", description: "Departed Earth orbit on transfer trajectory to L1" },
      { date: "2024-01-06", title: "L1 Halo Orbit Insertion", description: "Successfully executed burn to enter halo orbit around L1" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/aditya-l1.jpg", caption: "Aditya-L1 spacecraft with SUIT and VELC optics in cleanroom" }],
    sources: ["https://www.isro.gov.in/Aditya_L1.html", "https://en.wikipedia.org/wiki/Aditya-L1"]
  },
  {
    id: "xposat",
    name: "XPoSat",
    missionName: "X-ray Polarimeter Satellite",
    alternateName: "XPoSat",
    category: "scientific",
    subCategory: "X-ray Polarimetry Space Observatory",
    launchDate: "2024-01-01",
    year: 2024,
    launchVehicle: "PSLV-DL (C58)",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "ISRO / Raman Research Institute (RRI)",
    manufacturer: "ISRO / URSC / RRI",
    mass: 469,
    dimensions: { length: 1.3, width: 1.3, height: 1.4 },
    power: { watts: 450, panels: "Two solar array panels" },
    orbitType: "LEO",
    orbitAltitude: 650,
    inclination: 6.0,
    orbitalPeriod: 97.5,
    missionObjective:
      "Investigate the polarization of X-rays emitted by cosmic sources (black holes, neutron star pulsars, active galactic nuclei) in the 8-30 keV medium energy band.",
    description:
      "Launched on New Year's Day 2024, XPoSat is India's first dedicated polarimetry space mission and only the world's second dedicated X-ray polarimeter spacecraft (after NASA's IXPE). Equipped with POLIX (polarimeter in 8-30 keV) and XSPECT (spectroscopy in 0.8-15 keV).",
    payloads: [
      "POLIX (Polarimeter Instrument in X-rays - 8-30 keV Thomson scattering polarimeter)",
      "XSPECT (X-ray Spectroscopy and Timing instrument - 0.8-15 keV SDD spectrometer)"
    ],
    achievements: [
      "Only the second dedicated X-ray polarimetry space observatory in the world",
      "Pioneered medium-energy (8-30 keV) cosmic X-ray polarization measurements"
    ],
    status: "operational",
    missionStart: "2024-01-01",
    image: "/images/satellites/xposat.jpg",
    thumbnail: "/images/satellites/xposat-thumb.jpg",
    model3D: "/models/satellites/XPOSAT.glb",
    timeline: [
      { date: "2024-01-01", title: "New Year Liftoff", description: "Successfully injected into 650 km 6° orbit by PSLV-C58" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/xposat.jpg", caption: "XPoSat flight model ready for payload fairing encapsulation" }],
    sources: ["https://www.isro.gov.in/XPoSat.html", "https://en.wikipedia.org/wiki/XPoSat"]
  },

  // ──────────────────────────────────────────────
  // FUTURE FRONTIERS — 2025 AND BEYOND
  // ──────────────────────────────────────────────
  {
    id: "nisar",
    name: "NISAR",
    missionName: "NASA-ISRO Synthetic Aperture Radar",
    alternateName: "NISAR",
    category: "earth-observation",
    subCategory: "Dual-Frequency Radar Earth Observer",
    launchDate: "2025-06-01",
    year: 2025,
    launchVehicle: "GSLV-Mk II",
    launchSite: "Satish Dhawan Space Centre (Second Launch Pad)",
    operator: "ISRO / NASA (JPL)",
    manufacturer: "ISRO (URSC/SAC) & NASA Jet Propulsion Laboratory",
    mass: 2800,
    dimensions: { length: 3.5, width: 3.0, height: 3.0, diameter: 12.0 },
    power: { watts: 4000, panels: "Deployable high-efficiency solar arrays" },
    orbitType: "LEO",
    orbitAltitude: 747,
    inclination: 98.4,
    orbitalPeriod: 100.0,
    missionObjective:
      "Map the entire globe every 12 days to measure millimeter-scale changes in Earth's land surfaces, tectonic fault movements, glacier ice velocity, forest biomass, and disaster zones.",
    description:
      "A flagship joint Earth-observing mission between NASA and ISRO. Featuring a massive 12-meter deployable mesh radar reflector, NISAR is the first radar satellite to combine both L-band (NASA 24 cm wavelength) and S-band (ISRO 9 cm wavelength) dual-polarimetric Synthetic Aperture Radars.",
    payloads: [
      "L-band SweepSAR Synthetic Aperture Radar (NASA-JPL)",
      "S-band SweepSAR Synthetic Aperture Radar (ISRO-SAC)",
      "12-meter Deployable Radar Reflector Antenna"
    ],
    achievements: [
      "World's first dual-frequency (L+S band) SweepSAR radar satellite",
      "Most advanced civilian radar Earth-observing spacecraft in history"
    ],
    status: "future",
    missionStart: "2025-06-01",
    image: "/images/satellites/nisar.jpg",
    thumbnail: "/images/satellites/nisar-thumb.jpg",
    model3D: "/models/satellites/NISAR.glb",
    timeline: [
      { date: "2023-03-08", title: "NASA JPL Radar Arrival in India", description: "L-band radar delivered to URSC Bangalore for integration with S-band payload" },
      { date: "2025-06-01", title: "Targeted Launch", description: "Scheduled launch aboard GSLV-Mk II from Sriharikota" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/nisar.jpg", caption: "NISAR with deployed 12-meter golden radar reflector" }],
    sources: ["https://nisar.jpl.nasa.gov", "https://www.isro.gov.in"]
  },
  {
    id: "gaganyaan",
    name: "Gaganyaan",
    missionName: "Gaganyaan Crewed Spaceflight Mission",
    alternateName: "Gaganyaan Orbital Module",
    category: "experimental",
    subCategory: "Human Spaceflight Program",
    launchDate: "2026-03-01",
    year: 2026,
    launchVehicle: "Human-Rated LVM3 (HLVM3)",
    launchSite: "Satish Dhawan Space Centre (First Launch Pad)",
    operator: "ISRO / Human Space Flight Centre (HSFC)",
    manufacturer: "ISRO / HAL / L&T",
    mass: 8200,
    dimensions: { length: 7.0, width: 3.8, height: 3.8, diameter: 3.8 },
    power: { watts: 5400, panels: "Two deployable solar panels on Service Module" },
    orbitType: "LEO",
    orbitAltitude: 400,
    inclination: 51.5,
    orbitalPeriod: 92.5,
    destination: "400 km Low Earth Orbit",
    missionObjective:
      "Demonstrate human spaceflight capability by launching a 3-member astronaut crew into a 400 km orbit for a 3-day mission and returning them safely to Earth with a splashdown in the Arabian Sea.",
    description:
      "India's flagship Human Spaceflight Program. The spacecraft consists of a pressurized Crew Module (housing life support systems, astronaut avionics, and parachutes) and an unpressurized Service Module. Preceded by uncrewed test flights carrying the humanoid robot 'Vyommitra' and pad abort / in-flight abort demonstrations.",
    payloads: [
      "Pressurized Crew Module (ECLSS Environmental Control & Life Support)",
      "Crew Escape System (CES - quick-reaction solid rocket abort towers)",
      "Humanoid Robot Astronaut 'Vyommitra' (uncrewed validation flights)",
      "Apex Parachute & Ocean Splashdown Recovery Systems"
    ],
    achievements: [
      "Will make India only the fourth nation in history to independently launch humans into space",
      "Successfully conducted Flight Test Vehicle Abort Mission-1 (TV-D1) on Oct 21, 2023",
      "Four designated Indian Air Force astronaut designates unveiled by Prime Minister in 2024"
    ],
    status: "future",
    missionStart: "2026-03-01",
    image: "/images/satellites/gaganyaan.jpg",
    thumbnail: "/images/satellites/gaganyaan-thumb.jpg",
    model3D: "/models/satellites/GAGANYAAN.glb",
    timeline: [
      { date: "2023-10-21", title: "TV-D1 Abort Test Success", description: "Successful transonic in-flight abort test at Mach 1.2" },
      { date: "2025-2026", title: "Uncrewed Orbital Flights (G1 & G2)", description: "Orbital validation flights carrying humanoid Vyommitra" },
      { date: "2026+", title: "First Crewed Spaceflight (H1)", description: "Indian astronauts launched to 400 km orbit on HLVM3" }
    ],
    gallery: [{ type: "image", url: "/images/satellites/gaganyaan.jpg", caption: "Gaganyaan Crew Module and Service Module in full orbital configuration" }],
    sources: ["https://www.isro.gov.in/Gaganyaan.html", "https://en.wikipedia.org/wiki/Gaganyaan"]
  }
];
