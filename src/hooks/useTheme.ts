"use client";

import { useEffect, useState } from "react";

export interface ThemeTokens {
  isDark: boolean;

  /* ── Canvas / panel backgrounds ── */
  bg: string; // page / canvas fill
  panel: string; // right-side panel bg
  header: string; // 44-px header bar bg
  card: string; // card surface
  cardHover: string; // card surface on hover

  /* ── Borders ── */
  border: string; // standard border
  borderSubtle: string; // very faint divider
  borderActive: string; // accent-colored border

  /* ── Text ── */
  text: string; // primary readable text
  textMuted: string; // secondary / label text
  textDim: string; // tertiary / placeholder

  /* ── Accent (lime in dark, teal-green in light) ── */
  accent: string; // #CBFF00 / #1a7a3a
  accentBg: string; // accent at low opacity

  /* ── Semantic ── */
  green: string;
  blue: string;
  amber: string;
  red: string;
  purple: string;
  escrow: string;

  /* ── Road / infrastructure scene ── */
  roadSurface: string;
  roadLine: string;
  sky: string;
  grass: string;
  concrete: string;
  asphalt: string;
}

export const DARK: ThemeTokens = {
  isDark: true,

  bg: "oklch(0.12 0.03 185)",
  panel: "oklch(0.13 0.03 185 / 0.97)",
  header: "oklch(0.13 0.03 185 / 0.92)",
  card: "oklch(0.19 0.045 183 / 0.97)",
  cardHover: "oklch(0.21 0.05 183 / 0.98)",

  border: "oklch(0.28 0.04 175 / 0.22)",
  borderSubtle: "oklch(0.28 0.04 175 / 0.12)",
  borderActive: "#CBFF0055",

  text: "oklch(0.88 0.02 172)",
  textMuted: "oklch(0.55 0.03 172)",
  textDim: "oklch(0.38 0.03 172)",

  accent: "#CBFF00",
  accentBg: "oklch(0.19 0.06 130 / 0.35)",

  green: "#1D9E75",
  blue: "#378ADD",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  escrow: "#BA7517",

  roadSurface: "#1a2028",
  roadLine: "#f0e040",
  sky: "#0d1a2e",
  grass: "#0d2218",
  concrete: "#1e2530",
  asphalt: "#161c24",
};

export const LIGHT: ThemeTokens = {
  isDark: false,

  bg: "oklch(0.95 0.008 185)",
  panel: "oklch(0.98 0.004 185 / 0.97)",
  header: "oklch(0.97 0.006 185 / 0.95)",
  card: "oklch(1 0 0 / 0.97)",
  cardHover: "oklch(0.97 0.006 185 / 0.98)",

  border: "oklch(0.78 0.025 185 / 0.55)",
  borderSubtle: "oklch(0.82 0.02 185 / 0.35)",
  borderActive: "#1a7a3a55",

  text: "oklch(0.18 0.03 200)",
  textMuted: "oklch(0.40 0.03 200)",
  textDim: "oklch(0.58 0.02 200)",

  accent: "#1a7a3a",
  accentBg: "oklch(0.88 0.08 150 / 0.25)",

  green: "#1a7a3a",
  blue: "#1e5fb5",
  amber: "#b45309",
  red: "#b91c1c",
  purple: "#6d28d9",
  escrow: "#92400e",

  roadSurface: "#c8cdd6",
  roadLine: "#d4a017",
  sky: "#d4e8f7",
  grass: "#b8dfc0",
  concrete: "#d8dde5",
  asphalt: "#b8bfc8",
};

/**
 * Read the current theme from the <html> class.
 * Safe to call on server (returns DARK) and on client.
 * Never used as a useState initializer — only called inside useEffect.
 */
function readTokens(): ThemeTokens {
  if (typeof document === "undefined") return DARK;
  return document.documentElement.classList.contains("light") ? LIGHT : DARK;
}

/**
 * Returns theme tokens that are always consistent between server and client
 * on the initial render, then update reactively whenever the theme changes.
 *
 * Strategy:
 *   - useState always starts with DARK — this matches what the server renders,
 *     so React hydration never sees a mismatch.
 *   - useEffect fires after hydration and immediately syncs to the real theme
 *     (the inline script in layout.tsx has already set the correct html class
 *     before React runs, so this correction happens in the first effect flush,
 *     which is sub-frame on the client).
 *   - A MutationObserver keeps it reactive for subsequent toggles.
 */
export function useTheme(): ThemeTokens {
  // Always initialize with DARK — matches SSR output, no hydration mismatch.
  const [tokens, setTokens] = useState<ThemeTokens>(DARK);

  useEffect(() => {
    // Immediately correct to the real client-side theme after hydration.
    setTokens(readTokens());

    // Stay reactive to future toggles.
    const observer = new MutationObserver(() => setTokens(readTokens()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return tokens;
}
