"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Satellite Details Panel
 *
 * Full-screen information interface that appears when a satellite is clicked.
 * Features: status badge, mission data, 7-tabbed sections, glassmorphism design,
 * and an interactive 3D Model inspector preview inside the modal.
 */
import { useJourney } from "@/components/providers/JourneyProvider";
import { SATELLITES } from "@/lib/data/satellites";
import { STATUS_CONFIG } from "@/lib/constants";
import { ChevronLeft, Calendar, Rocket, MapPin, Globe, Activity, X } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SatelliteModel } from "@/components/scene/SatelliteModel";

const TABS = ["Overview", "Mission", "Technical", "Timeline", "Achievements", "Gallery", "3D Model"] as const;
type Tab = (typeof TABS)[number];

export function SatelliteDetails() {
  const { detailsOpen, selectedSatelliteId, closeDetails, restoreJourney } = useJourney();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  useEffect(() => {
    if (detailsOpen) {
      setActiveTab("Overview");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailsOpen]);

  if (!detailsOpen || !selectedSatelliteId) return null;

  const satellite = SATELLITES.find((s) => s.id === selectedSatelliteId);
  if (!satellite) return null;

  const statusConfig = STATUS_CONFIG[satellite.status] ?? STATUS_CONFIG.completed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="hud-panel hud-bracket relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden bg-slate-900">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={restoreJourney}
              className="flex items-center gap-1.5 border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-technical font-semibold uppercase tracking-wider text-cyan-400 hover:text-white hover:border-cyan-500 transition-all cursor-pointer"
              aria-label="Return to journey"
            >
              <ChevronLeft className="h-4 w-4" />
              RETURN TO JOURNEY
            </button>

            <button
              onClick={closeDetails}
              className="border border-white/10 bg-slate-950/60 p-1.5 text-slate-400 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-technical uppercase tracking-wider"
                style={{
                  color: statusConfig.color,
                  backgroundColor: `${statusConfig.color}18`,
                  border: `1px solid ${statusConfig.color}40`,
                }}
              >
                <span>{statusConfig.icon}</span>
                <span>{statusConfig.label}</span>
              </span>

              <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold text-white">
                {satellite.name}
              </h1>

              {satellite.alternateName && (
                <p className="text-xs text-slate-400">{satellite.alternateName}</p>
              )}
            </div>

            <div className="text-right">
              <span className="font-technical text-sm font-bold text-cyan-400">{satellite.year}</span>
            </div>
          </div>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 line-clamp-2">
            {satellite.description}
          </p>
        </div>

        {/* Quick telemetry items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-6 py-3 bg-slate-950/40 text-xs font-technical border-b border-white/5">
          {satellite.launchDate && (
            <InfoItem icon={Calendar} label="Launch Date" value={satellite.launchDate} />
          )}
          {satellite.launchVehicle && (
            <InfoItem icon={Rocket} label="Launch Vehicle" value={satellite.launchVehicle} />
          )}
          {satellite.launchSite && (
            <InfoItem icon={MapPin} label="Launch Site" value={satellite.launchSite} />
          )}
          {satellite.operator && (
            <InfoItem icon={Globe} label="Operator" value={satellite.operator} />
          )}
          {satellite.orbitType && (
            <InfoItem icon={Activity} label="Orbit Mode" value={satellite.orbitType} />
          )}
          {satellite.destination && (
            <InfoItem icon={MapPin} label="Destination" value={satellite.destination} />
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 bg-slate-950/60 px-6">
          <nav className="flex space-x-2 overflow-x-auto py-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-3.5 py-1.5 text-xs font-technical uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "border-cyan-400 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300">
          <TabContent tab={activeTab} satellite={satellite} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
      <span className="text-slate-400">{label}:</span>
      <span className="text-white font-semibold truncate">{value}</span>
    </div>
  );
}

function TabContent({ tab, satellite }: { tab: Tab; satellite: any }) {
  switch (tab) {
    case "Overview":
      return (
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-white">Mission Summary</h3>
          <p className="leading-relaxed">{satellite.description}</p>
          <div className="hud-panel p-4">
            <h4 className="font-display text-sm font-semibold text-cyan-400 mb-2">Primary Objective</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{satellite.missionObjective}</p>
          </div>
        </div>
      );
    case "Mission":
      return (
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-white">Mission Profile</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <TechItem label="Operator" value={satellite.operator || "ISRO"} />
            <TechItem label="Manufacturer" value={satellite.manufacturer || "ISRO"} />
            <TechItem label="Launch Date" value={satellite.launchDate || "N/A"} />
            <TechItem label="Launch Site" value={satellite.launchSite || "SDSC SHAR"} />
            <TechItem label="Launch Vehicle" value={satellite.launchVehicle || "N/A"} />
            <TechItem label="Destination" value={satellite.destination || "Earth Orbit"} />
          </div>
        </div>
      );
    case "Technical":
      return (
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-white">Technical Specifications</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <TechItem label="Mass" value={satellite.mass ? `${satellite.mass} kg` : "N/A"} />
            <TechItem label="Power" value={satellite.power ? `${satellite.power.watts} W` : "N/A"} />
            <TechItem label="Orbit Altitude" value={satellite.orbitAltitude ? `${satellite.orbitAltitude} km` : "N/A"} />
            <TechItem label="Inclination" value={satellite.inclination ? `${satellite.inclination}°` : "N/A"} />
            <TechItem label="Orbital Period" value={satellite.orbitalPeriod ? `${satellite.orbitalPeriod} min` : "N/A"} />
            <TechItem label="Mission Duration" value={satellite.missionDuration || "Operational"} />
          </div>
          {satellite.payloads && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Scientific Payloads & Instruments</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {satellite.payloads.map((p: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 border border-white/5 bg-slate-950/40 p-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    case "Timeline":
      return (
        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold text-white mb-2">Mission Milestones</h3>
          {satellite.timeline && satellite.timeline.length > 0 ? (
            <div className="space-y-3 border-l border-cyan-500/30 pl-4 ml-2">
              {satellite.timeline.map((event: any, i: number) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="font-technical text-[11px] font-semibold text-cyan-400">{event.date}</span>
                  <p className="text-xs font-bold text-white mt-0.5">{event.title}</p>
                  <p className="text-xs text-slate-400">{event.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Timeline milestones recorded.</p>
          )}
        </div>
      );
    case "Achievements":
      return (
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-white">Breakthroughs & Achievements</h3>
          <ul className="space-y-2">
            {satellite.achievements?.map((a: string, i: number) => (
              <li key={i} className="flex gap-2 border border-white/5 bg-slate-950/40 p-3 text-xs text-slate-300">
                <span className="text-cyan-400 font-bold">★</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          {satellite.failureReason && (
            <div className="mt-4 bg-rose-950/30 p-4 border border-rose-500/30">
              <p className="font-semibold text-rose-400 text-xs uppercase tracking-wider">WHAT HAPPENED? — Root Cause Analysis</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">{satellite.failureReason}</p>
            </div>
          )}
        </div>
      );
    case "Gallery":
      return (
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-white">Imagery & Documentation</h3>
          {satellite.gallery && satellite.gallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {satellite.gallery.map((g: any, i: number) => (
                <div key={i} className="overflow-hidden border border-white/10 bg-slate-950 p-2 text-xs text-slate-400">
                  <div className="aspect-video bg-slate-800/40 flex items-center justify-center text-slate-500 font-technical text-[11px]">
                    ISRO Archive Image
                  </div>
                  <p className="mt-2 truncate">{g.caption}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">ISRO documentation archive loaded.</p>
          )}
        </div>
      );
    case "3D Model":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-white">3D Spacecraft Inspection</h3>
            <span className="text-xs text-cyan-400 font-technical uppercase tracking-wider">360° Drag to Rotate</span>
          </div>
          <div className="hud-panel hud-bracket h-64 sm:h-80 w-full overflow-hidden relative">
            <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />
              <Suspense fallback={null}>
                <SatelliteModel satelliteId={satellite.id} interactive={false} scale={1.2} />
              </Suspense>
              <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={1.0} />
            </Canvas>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border border-white/5 bg-slate-950/60 px-3 py-2">
      <span className="text-slate-400">{label}:</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
