"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Statistics Dashboard
 *
 * Visual analytics dashboard calculated directly from the structured database.
 * per Section #17 of the Master Prompt.
 * Updates dynamically when missions are added to the database.
 */
import { useMemo } from "react";
import { SATELLITES } from "@/lib/data/satellites";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/constants";
import Link from "next/link";
import {
  BarChart3,
  Rocket,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Globe,
  Radio,
  Eye,
  Compass,
  Atom,
  Moon,
  Sun,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export default function StatisticsPage() {
  const stats = useMemo(() => {
    const total = SATELLITES.length;

    // Status counts
    const operational = SATELLITES.filter((s) => s.status === "operational").length;
    const completed = SATELLITES.filter((s) => s.status === "completed").length;
    const partial = SATELLITES.filter((s) => s.status === "partial").length;
    const failed = SATELLITES.filter((s) => s.status === "failed").length;
    const future = SATELLITES.filter((s) => s.status === "future").length;

    const successfulMissions = completed + operational;
    const historicalAttempts = total - future;
    const successRate = historicalAttempts > 0 ? Math.round((successfulMissions / historicalAttempts) * 100) : 0;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    SATELLITES.forEach((s) => {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    });

    // Decade breakdown
    const decadeCounts: Record<string, number> = {
      "1970s": 0,
      "1980s": 0,
      "1990s": 0,
      "2000s": 0,
      "2010s": 0,
      "2020s+": 0,
    };
    SATELLITES.forEach((s) => {
      if (s.year < 1980) decadeCounts["1970s"]++;
      else if (s.year < 1990) decadeCounts["1980s"]++;
      else if (s.year < 2000) decadeCounts["1990s"]++;
      else if (s.year < 2010) decadeCounts["2000s"]++;
      else if (s.year < 2020) decadeCounts["2010s"]++;
      else decadeCounts["2020s+"]++;
    });

    // Launch vehicle breakdown
    const vehicleCounts: Record<string, number> = {
      "PSLV Family": 0,
      "GSLV / LVM3": 0,
      "SLV / ASLV": 0,
      "Foreign Launchers": 0,
    };
    SATELLITES.forEach((s) => {
      const lv = s.launchVehicle.toLowerCase();
      if (lv.includes("pslv")) vehicleCounts["PSLV Family"]++;
      else if (lv.includes("gslv") || lv.includes("lvm3")) vehicleCounts["GSLV / LVM3"]++;
      else if (lv.includes("slv") || lv.includes("aslv")) vehicleCounts["SLV / ASLV"]++;
      else vehicleCounts["Foreign Launchers"]++;
    });

    // Orbit breakdown
    const orbitCounts: Record<string, number> = {
      "Low Earth Orbit (LEO)": 0,
      "Geostationary / GTO (GEO)": 0,
      "Lunar Exploration": 0,
      "Deep Space (Mars / L1)": 0,
    };
    SATELLITES.forEach((s) => {
      const o = s.orbitType.toUpperCase();
      if (o.includes("LEO")) orbitCounts["Low Earth Orbit (LEO)"]++;
      else if (o.includes("GEO")) orbitCounts["Geostationary / GTO (GEO)"]++;
      else if (o.includes("LUNAR")) orbitCounts["Lunar Exploration"]++;
      else orbitCounts["Deep Space (Mars / L1)"]++;
    });

    return {
      total,
      operational,
      completed,
      partial,
      failed,
      future,
      successRate,
      categoryCounts,
      decadeCounts,
      vehicleCounts,
      orbitCounts,
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-24 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="hud-bracket inline-flex items-center gap-2 border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-[11px] font-technical uppercase tracking-[0.2em] text-blue-300 mb-3">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Real-time Spacecraft Analytics</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            MISSION METRICS & ANALYTICS
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-gray-400">
            Real-time statistical synthesis computed directly from the catalog database spanning 50 years of Indian space missions.
          </p>
        </div>

        {/* Top Key Performance Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8">
          {/* Total Spacecraft */}
          <div className="hud-panel hud-bracket p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-technical uppercase tracking-wider">Total Spacecraft</span>
              <Rocket className="h-4 w-4 text-blue-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              {stats.total}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">1975 to Approved Future</p>
          </div>

          {/* Success Rate */}
          <div className="hud-panel hud-bracket p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-technical uppercase tracking-wider">Success Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-400">
              {stats.successRate}%
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              {stats.completed + stats.operational} successful of {stats.total - stats.future} flown
            </p>
          </div>

          {/* Operational Today */}
          <div className="hud-panel hud-bracket p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-technical uppercase tracking-wider">Active in Orbit</span>
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-blue-400">
              {stats.operational}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">Transmitting Telemetry</p>
          </div>

          {/* Future Frontiers */}
          <div className="hud-panel hud-bracket p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-technical uppercase tracking-wider">Next Frontier</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-purple-400">
              {stats.future}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">NISAR, Gaganyaan, SPADEX</p>
          </div>
        </div>

        {/* Charts & Analytical Breakdowns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Category Distribution */}
          <div className="hud-panel hud-bracket p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Missions by Category</span>
              <span className="text-xs font-normal text-gray-400">Portfolio Diversity</span>
            </h3>

            <div className="space-y-3.5">
              {Object.entries(CATEGORY_CONFIG).map(([catKey, cfg]) => {
                const count = stats.categoryCounts[catKey] || 0;
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                if (count === 0) return null;

                return (
                  <div key={catKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                      </span>
                      <span className="font-technical text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden bg-white/5 border border-white/5">
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cfg.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missions by Decade */}
          <div className="hud-panel hud-bracket p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Missions by Decade</span>
              <span className="text-xs font-normal text-gray-400">Launch Frequency</span>
            </h3>

            <div className="space-y-3.5">
              {Object.entries(stats.decadeCounts).map(([decade, count]) => {
                const maxCount = Math.max(...Object.values(stats.decadeCounts), 1);
                const barWidth = Math.round((count / maxCount) * 100);

                return (
                  <div key={decade} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-technical font-medium text-gray-200">{decade}</span>
                      <span className="font-technical text-gray-400">{count} spacecraft</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden bg-white/5 border border-white/5">
                      <div
                        className="h-full bg-cyan-400/70 transition-all duration-700"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Launch Vehicle Distribution */}
          <div className="hud-panel hud-bracket p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Launch Vehicle Family Distribution</span>
              <span className="text-xs font-normal text-gray-400">Rocket Fleet</span>
            </h3>

            <div className="space-y-3.5">
              {Object.entries(stats.vehicleCounts).map(([family, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                return (
                  <div key={family} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-200">{family}</span>
                      <span className="font-technical text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden bg-white/5 border border-white/5">
                      <div
                        className="h-full bg-cyan-400/70 transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orbital Regimes */}
          <div className="hud-panel hud-bracket p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Orbital Destinations & Regimes</span>
              <span className="text-xs font-normal text-gray-400">Orbital Altitude</span>
            </h3>

            <div className="space-y-3.5">
              {Object.entries(stats.orbitCounts).map(([regime, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                return (
                  <div key={regime} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-200">{regime}</span>
                      <span className="font-technical text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden bg-white/5 border border-white/5">
                      <div
                        className="h-full bg-purple-400/70 transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="hud-panel hud-bracket p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <h3 className="font-display text-2xl font-bold text-white mb-1">
              Explore the full spacecraft database
            </h3>
            <p className="text-sm text-gray-400 max-w-xl">
              Inspect technical blueprints, payload instruments, historical flight timelines, and high-resolution photo archives.
            </p>
          </div>
          <div className="mt-6 sm:mt-0">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-500/10 px-6 py-3 font-technical text-sm font-semibold uppercase tracking-wide text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              <span>Launch Explorer</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
