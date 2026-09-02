"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Restart Journey Cinematic Transition
 *
 * Purely presentational — mounted only while `isRestarting` is true (see
 * restartJourney() in JourneyProvider.tsx), so every restart gets a fresh
 * mount and its CSS animations always play from the very beginning.
 *
 * Sequence (durations live in globals.css and MUST stay in sync with
 * RESTART_RESET_MS / RESTART_END_MS in JourneyProvider.tsx):
 *   0.0s – 1.0s   A rocket (nose-first, flame trailing) streaks across the
 *                 screen from right to left.
 *   0.6s – 1.3s   A fog/smoke layer fades in, fully covering the screen —
 *                 overlapping the rocket's tail end so there's no bare
 *                 gap between "rocket visible" and "screen covered".
 *   1.3s          Screen fully covered — JourneyProvider resets progress /
 *                 scroll / started underneath at exactly this moment,
 *                 invisibly, so nothing has to visibly catch up.
 *   1.3s – 2.0s   Fog fades back out, revealing the reset Hero screen.
 *
 * Bug fix: the rocket + flame previously used two separate elements (a
 * plain flex row: flame div, then rocket svg). Flex row order put the
 * flame BEFORE the rocket, i.e. on the leading side of travel, with the
 * nose cone pointing further right (away from the flame) — so the rocket
 * visually flew tail/flame-first while moving right→left, reading as
 * backwards/"upside down". Rebuilt as a single SVG with the nose fixed on
 * the left (the direction of travel) and the flame anchored to the right
 * (trailing edge, opposite of travel) so DOM order can no longer desync
 * from visual order — and sized substantially larger.
 */
import { useJourney } from "@/components/providers/JourneyProvider";

export function RestartTransition() {
  const { isRestarting } = useJourney();

  if (!isRestarting) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {/* Rocket + flame, animates right -> left across the screen, nose leading */}
      <div className="restart-rocket absolute top-1/2 -translate-y-1/2">
        <svg
          viewBox="0 0 300 120"
          className="w-[260px] sm:w-[340px] md:w-[420px] h-auto relative z-10 drop-shadow-[0_0_28px_rgba(0,212,255,0.55)]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="restartFlameGrad" x1="200" y1="60" x2="298" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="22%" stopColor="#ffe08a" />
              <stop offset="55%" stopColor="#ff9933" />
              <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Flame — trails behind the tail (right side), flickers via CSS
              scale from its attachment point (transform-origin: left) */}
          <g className="restart-flame">
            <path
              d="M200 32 C 232 40, 268 46, 298 60 C 268 74, 232 80, 200 88 C 212 76, 212 44, 200 32 Z"
              fill="url(#restartFlameGrad)"
            />
          </g>

          {/* Tail fins (rear, right side — opposite the nose) */}
          <path d="M150 25 L195 6 L176 40 Z" fill="#8a2be2" />
          <path d="M150 95 L195 114 L176 80 Z" fill="#8a2be2" />

          {/* Engine nozzle */}
          <rect x="184" y="34" width="26" height="52" rx="6" fill="#475569" />

          {/* Main hull */}
          <rect x="40" y="24" width="150" height="72" rx="20" fill="#cbd5e1" />

          {/* Accent stripe */}
          <rect x="96" y="24" width="22" height="72" fill="#00d4ff" />

          {/* Cockpit window */}
          <circle cx="68" cy="60" r="17" fill="#0a3d62" />
          <circle cx="62" cy="54" r="6" fill="#38bdf8" opacity="0.85" />

          {/* Nose cone — leading edge, points LEFT (direction of travel) */}
          <path d="M8 60 L46 20 L46 100 Z" fill="#e2e8f0" />
        </svg>
      </div>

      {/* Fog / smoke — fades in to fully cover the screen, then clears */}
      <div className="restart-fog absolute inset-0" aria-hidden="true" />
    </div>
  );
}
