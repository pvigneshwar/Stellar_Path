/**
 * INDIA'S JOURNEY BEYOND EARTH — useReducedMotion Hook
 *
 * Detects the user's prefers-reduced-motion preference.
 */
import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mediaQuery.matches);

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reduced;
}
