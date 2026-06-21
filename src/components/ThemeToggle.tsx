"use client";

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

function readStoredTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("op_theme") as "dark" | "light" | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable
  }
  return "dark";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

/**
 * Pill-shaped theme toggle: Sun (light) / Moon (dark).
 * Persists preference to localStorage and applies CSS classes on <html>.
 *
 * Uses a `mounted` flag to avoid hydration mismatch:
 * the server always renders the neutral (unselected) state, and the
 * client picks the correct stored theme immediately after mount.
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // On first client render, read the stored theme
  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  // Sync theme class and localStorage whenever theme changes
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    try {
      localStorage.setItem("op_theme", theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme, mounted]);

  const setLight = useCallback(() => setTheme("light"), []);
  const setDark = useCallback(() => setTheme("dark"), []);

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      <button
        className={`theme-toggle-option ${mounted && theme === "light" ? "active" : ""}`}
        onClick={setLight}
        aria-label="Light mode"
        role="radio"
        aria-checked={mounted && theme === "light"}
      >
        <Sun size={12} />
      </button>
      <button
        className={`theme-toggle-option ${mounted && theme === "dark" ? "active" : ""}`}
        onClick={setDark}
        aria-label="Dark mode"
        role="radio"
        aria-checked={mounted && theme === "dark"}
      >
        <Moon size={12} />
      </button>
    </div>
  );
}
