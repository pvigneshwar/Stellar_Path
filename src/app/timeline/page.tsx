"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Interactive Timeline
 *
 * Chronological journey through India's space program from 1975 to the future.
 * Supports:
 * - Chronological sequence ordered by launch date
 * - Decade marker navigation
 * - Category filter pills
 * - Mission status indicators (including failure callouts per section #14)
 * - Clickable mission nodes opening SatelliteDetails modal
 */
import { useState, useMemo } from "react";
import { SATELLITES } from "@/lib/data/satellites";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/constants";
import { useJourney } from "@/components/providers/JourneyProvider";
import { SatelliteDetails } from "@/components/ui/SatelliteDetails";
import {
  Clock,
  Rocket,
  Search,
  Filter,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export default function TimelinePage() {
  const { openDetails } = useJourney();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Sort chronologically by year / launchDate
  const sortedSatellites = useMemo(() => {
    return [...SATELLITES].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.launchDate.localeCompare(b.launchDate);
    });
  }, []);

  // Filtered list
  const filteredSatellites = useMemo(() => {
    return sortedSatellites.filter((sat) => {
      if (selectedCategory !== "all" && sat.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sat.name.toLowerCase().includes(q) ||
          sat.missionName?.toLowerCase().includes(q) ||
          sat.year.toString().includes(q) ||
          sat.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sortedSatellites, selectedCategory, searchQuery]);

  // Group by decades for visual milestone badges
  const groupedByDecade = useMemo(() => {
    const groups: Record<string, typeof filteredSatellites> = {};
    filteredSatellites.forEach((sat) => {
      const decade = `${Math.floor(sat.year / 10) * 10}s`;
      if (!groups[decade]) groups[decade] = [];
      groups[decade].push(sat);
    });
    return groups;
  }, [filteredSatellites]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-24 px-4 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="hud-bracket inline-flex items-center gap-2 border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-technical uppercase tracking-[0.2em] text-purple-300 mb-3">
            <Clock className="h-3.5 w-3.5" />
            <span>Chronological Space Heritage (1975–Future)</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            MISSION TIMELINE
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-gray-400">
            Journey through half a century of breakthroughs, audacious technological leaps, hard-won lessons, and future planetary ambitions.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="hud-panel hud-bracket mb-12 space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search timeline missions..."
                className="w-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
              />
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap border px-3 py-1.5 text-xs font-technical uppercase tracking-wide transition-all ${
                  selectedCategory === "all"
                    ? "border-purple-400 bg-purple-500/15 text-purple-200"
                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                All Categories
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([catKey, cfg]) => (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`whitespace-nowrap border px-3 py-1.5 text-xs font-technical uppercase tracking-wide transition-all ${
                    selectedCategory === catKey
                      ? "border-purple-400 bg-purple-500/15 text-purple-200"
                      : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Structure */}
        {Object.keys(groupedByDecade).length > 0 ? (
          <div className="relative border-l-2 border-blue-500/20 ml-4 sm:ml-32 space-y-12 pl-6 sm:pl-8">
            {Object.entries(groupedByDecade).map(([decade, satellites]) => (
              <div key={decade} className="relative space-y-6">
                {/* Decade Milestone Marker */}
                <div className="sticky top-20 z-20 -ml-10 sm:-ml-40 flex items-center gap-3">
                  <div className="hud-bracket flex h-10 w-16 sm:w-20 items-center justify-center bg-slate-950/80 font-technical text-sm sm:text-base font-bold text-cyan-300 border border-cyan-400/40">
                    {decade}
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
                </div>

                {/* Satellite cards for this decade */}
                <div className="space-y-4">
                  {satellites.map((sat) => {
                    const statusCfg = STATUS_CONFIG[sat.status] ?? STATUS_CONFIG.completed;
                    const catCfg = CATEGORY_CONFIG[sat.category] ?? { label: sat.category, color: "#3b82f6" };
                    const isFailure = sat.status === "failed" || sat.failureType;

                    return (
                      <div
                        key={sat.id}
                        onClick={() => openDetails(sat.id)}
                        className="hud-panel group relative cursor-pointer p-5 transition-all duration-300 hover:border-blue-400/50 hover:translate-x-1"
                      >
                        {/* Connecting dot to timeline */}
                        <div
                          className="absolute -left-[31px] sm:-left-[39px] top-6 h-3.5 w-3.5 rounded-full border-2 border-black transition-transform group-hover:scale-125"
                          style={{ backgroundColor: isFailure ? "#ef4444" : "#00d4ff" }}
                        />

                        {/* Top Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-technical text-sm font-bold text-blue-400">
                              {sat.year}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span
                              className="px-2 py-0.5 text-[10px] font-technical uppercase tracking-wide"
                              style={{
                                color: catCfg.color,
                                backgroundColor: `${catCfg.color}15`,
                                border: `1px solid ${catCfg.color}35`,
                              }}
                            >
                              {catCfg.label}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-technical uppercase tracking-wide"
                            style={{
                              color: statusCfg.color,
                              backgroundColor: `${statusCfg.color}15`,
                              border: `1px solid ${statusCfg.color}35`,
                            }}
                          >
                            <span>{statusCfg.icon}</span>
                            <span>{statusCfg.label}</span>
                          </span>
                        </div>

                        {/* Satellite Title */}
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                          {sat.name}
                        </h3>

                        {/* Description */}
                        <p className="mt-1.5 text-xs sm:text-sm text-gray-300 leading-relaxed">
                          {sat.description}
                        </p>

                        {/* Failure Callout if applicable (Section #14: What Happened?) */}
                        {sat.failureReason && (
                          <div className="mt-3 border border-red-500/30 bg-red-950/20 p-3 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>WHAT HAPPENED?</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">{sat.failureReason}</p>
                          </div>
                        )}

                        {/* Key achievements or specs */}
                        {sat.achievements && sat.achievements.length > 0 && !isFailure && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sat.achievements.slice(0, 2).map((ach, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 border border-white/5"
                              >
                                <CheckCircle2 className="h-3 w-3 text-blue-400" />
                                <span>{ach}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer details */}
                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Rocket className="h-3.5 w-3.5 text-blue-400" />
                            <span>{sat.launchVehicle}</span>
                          </span>

                          <span className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                            View Mission Specs <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hud-panel py-16 text-center text-gray-400">
            <p>No missions match the current filters.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <SatelliteDetails />
    </div>
  );
}
