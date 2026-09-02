"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Global Navigation Header
 *
 * Mission-control instrument bar with links to:
 * - 3D Journey (/)
 * - Explorer (/explorer)
 * - Timeline (/timeline)
 * - Statistics (/statistics)
 *
 * Uses the hud-panel/hud-bracket framing (near-square panel, corner
 * brackets, faint reference grid) established in globals.css in place of
 * the previous rounded-full glassmorphism pill — console hardware, not
 * app chrome.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Clock, BarChart3, Rocket } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "3D Journey", icon: Rocket },
  { href: "/explorer", label: "Explorer", icon: Compass },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 sm:px-8">
      <div className="hud-panel hud-bracket mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        {/* Brand / Mission insignia — official Stellar Path mark. This is a
            compact ~21KB nav-specific export (200×175, WebP re-encode
            wrapped in the same SVG-embedded-image pattern used by the
            source file) generated from the full ~5.4MB
            stellar_path_logo.svg so the header doesn't ship a multi-MB
            asset for a 36–40px icon. The original full-resolution file is
            left untouched in public/logo/ for any larger placement (e.g.
            a hero/loading-screen treatment) that can justify its size.
            Fixed h-w box with object-contain preserves aspect ratio at any
            viewport instead of stretching it. */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
            <img
              src="/logo/stellar_path_logo-nav.svg"
              alt="Stellar Path"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-bold tracking-wider text-white sm:text-base">
              STELLAR
            </span>
            <span className="font-display text-sm font-bold tracking-wider text-cyan-400 sm:text-base">
              PATH
            </span>
          </div>
        </Link>

        {/* Nav Links — rectangular selectors, active state marked with a
            bottom-edge accent line rather than a glowing filled pill. */}
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-technical uppercase tracking-wider transition-all sm:text-[13px] sm:px-4 sm:py-2 ${
                  isActive
                    ? "border-cyan-400 text-white"
                    : "border-transparent text-gray-400 hover:text-white hover:border-white/20"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? "text-cyan-400" : ""}`} />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
