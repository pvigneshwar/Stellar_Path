"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Satellite Explorer & Spacecraft Comparison Suite
 *
 * Full-featured interactive database browser per Section #15 of the Master Prompt.
 * Includes:
 * - Live full-text search across names, missions, years, launch vehicles, payloads
 * - Category filters with visual icons and live count badges
 * - Mission status filter badges (Operational, Completed, Partial, Failed, Future)
 * - Launch vehicle family filter (PSLV, GSLV/LVM3, SLV/ASLV, Foreign)
 * - Decade range filters
 * - Spacecraft Comparison Mode (Side-by-side spec comparison of 2 spacecraft)
 * - Premium interactive satellite cards with full metadata & click-to-modal details
 */
import { useState, useMemo } from "react";
import { SATELLITES } from "@/lib/data/satellites";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/constants";
import { useJourney } from "@/components/providers/JourneyProvider";
import { SatelliteDetails } from "@/components/ui/SatelliteDetails";
import {
  Search,
  Filter,
  Rocket,
  Calendar,
  Sparkles,
  Layers,
  Activity,
  ChevronRight,
  RotateCcw,
  Globe,
  Radio,
  Eye,
  Compass,
  Atom,
  Moon,
  Sun,
  Scale,
  X,
  CheckCircle2,
  Zap,
  Gauge,
} from "lucide-react";
import type { Satellite } from "@/lib/types";

const CATEGORY_ICONS: Record<string, any> = {
  all: Layers,
  communication: Radio,
  "earth-observation": Eye,
  navigation: Compass,
  scientific: Atom,
  experimental: Sparkles,
  lunar: Moon,
  planetary: Globe,
  solar: Sun,
};

const DECADES = [
  { label: "All Eras", value: "all" },
  { label: "1970s", value: "1970" },
  { label: "1980s", value: "1980" },
  { label: "1990s", value: "1990" },
  { label: "2000s", value: "2000" },
  { label: "2010s", value: "2010" },
  { label: "2020s+", value: "2020" },
];

const VEHICLE_FAMILIES = [
  { label: "All Launchers", value: "all" },
  { label: "PSLV Family", value: "pslv" },
  { label: "GSLV / LVM3", value: "gslv" },
  { label: "SLV / ASLV", value: "slv" },
  { label: "Foreign Launchers", value: "foreign" },
];

export default function ExplorerPage() {
  const { openDetails } = useJourney();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  // Comparison State
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);

  // Toggle selection for comparison
  const toggleComparison = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (comparisonIds.includes(id)) {
      setComparisonIds(comparisonIds.filter((item) => item !== id));
    } else {
      if (comparisonIds.length >= 2) {
        setComparisonIds([comparisonIds[1], id]);
      } else {
        setComparisonIds([...comparisonIds, id]);
      }
    }
  };

  // Filter logic
  const filteredSatellites = useMemo(() => {
    return SATELLITES.filter((satellite) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = satellite.name.toLowerCase().includes(q);
        const matchesAlt = satellite.alternateName?.toLowerCase().includes(q);
        const matchesMission = satellite.missionName?.toLowerCase().includes(q);
        const matchesDesc = satellite.description.toLowerCase().includes(q);
        const matchesVehicle = satellite.launchVehicle.toLowerCase().includes(q);
        const matchesYear = satellite.year.toString().includes(q);
        const matchesPayloads = satellite.payloads?.some((p) => p.toLowerCase().includes(q));

        if (!matchesName && !matchesAlt && !matchesMission && !matchesDesc && !matchesVehicle && !matchesYear && !matchesPayloads) {
          return false;
        }
      }

      if (selectedCategory !== "all" && satellite.category !== selectedCategory) {
        return false;
      }

      if (selectedStatus !== "all" && satellite.status !== selectedStatus) {
        return false;
      }

      if (selectedDecade !== "all") {
        const decadeStart = parseInt(selectedDecade, 10);
        if (satellite.year < decadeStart || satellite.year >= decadeStart + 10) {
          return false;
        }
      }

      if (selectedVehicle !== "all") {
        const lv = satellite.launchVehicle.toLowerCase();
        if (selectedVehicle === "pslv" && !lv.includes("pslv")) return false;
        if (selectedVehicle === "gslv" && !lv.includes("gslv") && !lv.includes("lvm3")) return false;
        if (selectedVehicle === "slv" && !lv.includes("slv") && !lv.includes("aslv")) return false;
        if (
          selectedVehicle === "foreign" &&
          (lv.includes("pslv") || lv.includes("gslv") || lv.includes("lvm3") || lv.includes("slv") || lv.includes("aslv"))
        )
          return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedStatus, selectedDecade, selectedVehicle]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedDecade("all");
    setSelectedVehicle("all");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedStatus !== "all" ||
    selectedDecade !== "all" ||
    selectedVehicle !== "all";

  // Spacecraft data for comparison modal
  const comparisonSatellites = useMemo(() => {
    return comparisonIds.map((id) => SATELLITES.find((s) => s.id === id)).filter(Boolean) as Satellite[];
  }, [comparisonIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-28 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Title */}
        <div className="mb-10 text-center sm:text-left">
          <div className="hud-bracket inline-flex items-center gap-2 border border-cyan-500/25 bg-cyan-950/30 px-3 py-1 text-[11px] font-technical uppercase tracking-[0.2em] text-cyan-400 mb-3">
            <Rocket className="h-3 w-3" />
            <span>Master Spacecraft Catalog</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_16px_rgba(0,180,255,0.2)]">
            Satellite Explorer
          </h1>
          <p className="mt-2 text-base text-slate-400 max-w-2xl">
            Explore India's complete spacecraft fleet with verified ISRO telemetry, multi-dimensional filters, and side-by-side mission comparisons.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="hud-panel hud-bracket mb-8 space-y-4 p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by satellite name, mission, year, launch vehicle, or payload instruments..."
              className="w-full border border-white/10 bg-slate-950/80 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {Object.entries({
              all: { label: "All Missions", color: "#00f0ff" },
              ...CATEGORY_CONFIG,
            }).map(([key, cfg]) => {
              const Icon = CATEGORY_ICONS[key] || Layers;
              const isSelected = selectedCategory === key;
              const count =
                key === "all"
                  ? SATELLITES.length
                  : SATELLITES.filter((s) => s.category === key).length;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex items-center gap-2 border px-3.5 py-2 text-xs font-technical uppercase tracking-wide transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                      : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cfg.label}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] ${
                      isSelected ? "bg-cyan-500/20 text-cyan-200" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dropdown Filters & Reset */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Mission Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.icon} {cfg.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(e.target.value)}
              className="border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {DECADES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {VEHICLE_FAMILIES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter count & reset */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>
              Showing <strong className="text-white">{filteredSatellites.length}</strong> of {SATELLITES.length} spacecraft
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all filters
              </button>
            )}
          </div>
        </div>

        {/* Spacecraft Grid */}
        {filteredSatellites.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSatellites.map((satellite) => {
              const statusCfg = STATUS_CONFIG[satellite.status] ?? STATUS_CONFIG.completed;
              const catCfg = CATEGORY_CONFIG[satellite.category] ?? { label: satellite.category, color: "#00f0ff" };
              const isCompared = comparisonIds.includes(satellite.id);

              return (
                <div
                  key={satellite.id}
                  onClick={() => openDetails(satellite.id)}
                  className={`group relative cursor-pointer flex flex-col justify-between overflow-hidden border bg-slate-900/60 p-5 transition-all duration-300 hover:-translate-y-0.5 ${
                    isCompared ? "border-cyan-500 ring-1 ring-cyan-500" : "border-white/10 hover:border-cyan-500/50"
                  }`}
                >
                  {/* Top Bar: Category Pill, Year & Compare Checkbox */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-technical uppercase tracking-wide"
                        style={{
                          color: catCfg.color,
                          backgroundColor: `${catCfg.color}15`,
                          border: `1px solid ${catCfg.color}35`,
                        }}
                      >
                        {catCfg.label}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleComparison(satellite.id, e)}
                          title="Select to compare specs side-by-side"
                          className={`flex items-center gap-1 border px-2 py-0.5 text-[11px] font-technical uppercase tracking-wide transition-all ${
                            isCompared
                              ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                              : "border-white/10 bg-slate-950 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-300"
                          }`}
                        >
                          <Scale className="h-3 w-3" />
                          <span>{isCompared ? "Selected" : "Compare"}</span>
                        </button>
                        <span className="font-technical text-xs font-semibold text-slate-400">
                          {satellite.year}
                        </span>
                      </div>
                    </div>

                    {/* Satellite Name */}
                    <h3 className="font-display text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {satellite.name}
                    </h3>
                    {satellite.subCategory && (
                      <p className="text-xs text-slate-400 mb-2">{satellite.subCategory}</p>
                    )}

                    {/* Description snippet */}
                    <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {satellite.description}
                    </p>
                  </div>

                  {/* Metadata & Footer */}
                  <div className="mt-5 space-y-3 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Rocket className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{satellite.launchVehicle}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">{satellite.orbitType}</span>
                      </div>
                    </div>

                    {/* Status Badge & Action CTA */}
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-technical uppercase tracking-wide"
                        style={{
                          color: statusCfg.color,
                          backgroundColor: `${statusCfg.color}15`,
                          border: `1px solid ${statusCfg.color}35`,
                        }}
                      >
                        <span>{statusCfg.icon}</span>
                        <span>{statusCfg.label}</span>
                      </span>

                      <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                        Explore <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hud-panel flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="font-display text-xl font-bold text-white mb-2">
              No matching spacecraft found
            </h3>
            <p className="max-w-md text-sm text-slate-400 mb-6">
              We couldn't find any satellites matching "{searchQuery}" with the selected filter criteria.
            </p>
            <button
              onClick={resetFilters}
              className="border border-cyan-400/50 bg-cyan-500/10 px-6 py-2.5 text-xs font-technical uppercase tracking-wide text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Floating Comparison Action Bar ── */}
      {comparisonIds.length > 0 && (
        <div className="hud-panel hud-bracket fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 border-cyan-500/40 px-6 py-3 animate-fade-in-up">
          <div className="flex items-center gap-2 text-sm text-white font-technical">
            <Scale className="h-4 w-4 text-cyan-400" />
            <span>
              <strong>{comparisonIds.length}</strong> of 2 spacecraft selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setComparisonModalOpen(true)}
              disabled={comparisonIds.length < 2}
              className={`border px-4 py-1.5 text-xs font-technical font-bold uppercase tracking-wider transition-all ${
                comparisonIds.length === 2
                  ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 cursor-pointer"
                  : "border-white/10 bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {comparisonIds.length === 2 ? "Compare Now" : "Select 1 More"}
            </button>

            <button
              onClick={() => setComparisonIds([])}
              className="border border-white/10 p-1.5 text-slate-400 hover:text-white hover:border-white/30"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Side-by-Side Spacecraft Comparison Modal ── */}
      {comparisonModalOpen && comparisonSatellites.length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="hud-panel hud-bracket relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2 text-cyan-400">
                <Scale className="h-5 w-5" />
                <h2 className="font-display text-2xl font-bold text-white">Spacecraft Telemetry Comparison</h2>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="border border-white/10 p-2 text-slate-400 hover:text-white hover:border-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {comparisonSatellites.map((sat) => {
                const catCfg = CATEGORY_CONFIG[sat.category] ?? { label: sat.category, color: "#00f0ff" };
                const statusCfg = STATUS_CONFIG[sat.status] ?? STATUS_CONFIG.completed;

                return (
                  <div key={sat.id} className="hud-panel space-y-4 p-5">
                    <div>
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-technical uppercase tracking-wide"
                        style={{
                          color: catCfg.color,
                          backgroundColor: `${catCfg.color}15`,
                          border: `1px solid ${catCfg.color}35`,
                        }}
                      >
                        {catCfg.label}
                      </span>
                      <h3 className="mt-2 font-display text-2xl font-bold text-white">{sat.name}</h3>
                      <p className="text-xs text-slate-400">{sat.missionName || sat.alternateName}</p>
                    </div>

                    <div className="space-y-2 text-xs font-technical">
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Launch Year:</span>
                        <span className="text-white font-bold">{sat.year}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Launch Vehicle:</span>
                        <span className="text-cyan-400 font-bold">{sat.launchVehicle}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Spacecraft Mass:</span>
                        <span className="text-white font-bold">{sat.mass ? `${sat.mass.toLocaleString()} kg` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Power Generated:</span>
                        <span className="text-amber-400 font-bold">{sat.power ? `${sat.power.watts} W` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Orbital Altitude:</span>
                        <span className="text-purple-400 font-bold">
                          {sat.orbitAltitude ? `${sat.orbitAltitude.toLocaleString()} km` : sat.orbitType}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Mission Status:</span>
                        <span className="font-semibold" style={{ color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 py-1.5">
                        <span className="text-slate-400">Primary Operator:</span>
                        <span className="text-slate-300">{sat.operator}</span>
                      </div>
                    </div>

                    {sat.achievements && sat.achievements.length > 0 && (
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">Key Achievement</p>
                        <p className="text-xs text-slate-300 leading-relaxed italic">"{sat.achievements[0]}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Global Satellite Detail Modal */}
      <SatelliteDetails />
    </div>
  );
}
