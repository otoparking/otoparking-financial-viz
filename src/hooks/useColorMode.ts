"use client";

import { useState, useEffect } from "react";

function getColorMode(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
}

/** Returns "dark" or "light" based on the current <html> class.
 *  Defers the DOM read to after mount so SSR and the initial client
 *  render produce the same value, avoiding a hydration mismatch. */
export function useReactFlowColorMode(): "dark" | "light" {
  const [mode, setMode] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Sync to the real value after hydration
    setMode(getColorMode());

    // Keep in sync if the theme class changes at runtime
    const observer = new MutationObserver(() => setMode(getColorMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return mode;
}

/** Returns a subtle dot color for the React Flow background grid */
export function useBackgroundDotColor(): string {
  const mode = useReactFlowColorMode();
  return mode === "dark" ? "rgba(203,255,0,0.06)" : "rgba(0,0,0,0.06)";
}
