"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

/* ── Types & persistence ─────────────────────────────────────────────── */

export interface TestSettings {
  topUpAmount: number;
  gateCashFare: number;
  gateCashCommission: number;
  bookingDurationHours: number;
  bookingStartHour: number;
  autoReleaseEscrow: boolean;
  overstayMinutes: number;
  commissionRate: number; // 0–1, e.g. 0.1 = 10% (per-lot rate from CommissionRateService)
}

const DEFAULTS: TestSettings = {
  topUpAmount: 20,
  gateCashFare: 50,
  gateCashCommission: 5,
  bookingDurationHours: 2,
  bookingStartHour: 14,
  autoReleaseEscrow: true,
  overstayMinutes: 90,
  commissionRate: 0.1,
};

const STORAGE_KEY = "otoparking-test-settings";

export function loadSettings(): TestSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

function saveSettings(s: TestSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function useTestSettings(): [TestSettings, (s: TestSettings) => void] {
  const [settings, setSettings] = useState<TestSettings>(() => loadSettings());
  const update = (s: TestSettings) => {
    setSettings(s);
    saveSettings(s);
  };
  return [settings, update];
}

/* ── Component ───────────────────────────────────────────────────────── */

interface SettingsPanelProps {
  settings: TestSettings;
  onChange: (s: TestSettings) => void;
}

/* ── Component ─────────────────────────────────────────────────────────────────── */
export default function SettingsPanel({
  settings,
  onChange,
}: SettingsPanelProps) {
  const T = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: `1px solid ${T.border}`,
        background: T.header,
      }}
    >
      {/* ── Trigger row ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: 8,
        }}
      >
        {/* Left: icon + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: open ? T.cardHover : T.card,
              border: `1px solid ${open ? "oklch(0.38 0.05 175 / 0.4)" : T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 250ms ease",
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal
              style={{
                width: 12,
                height: 12,
                color: open ? T.accent : T.textMuted,
                transition: "color 250ms ease",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: open ? T.text : T.textMuted,
              transition: "color 250ms ease",
            }}
          >
            Simulation Parameters
          </span>
        </div>

        {/* Right: chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{ color: T.textDim, display: "flex", alignItems: "center" }}
        >
          <ChevronDown style={{ width: 13, height: 13 }} />
        </motion.div>
      </button>

      {/* ── Expanded panel ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="settings-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 14px 14px" }}>
              {/* ── Fields grid ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                <Field
                  label="Top-Up"
                  unit="MAD"
                  value={settings.topUpAmount}
                  min={1}
                  max={500}
                  step={5}
                  onChange={(v) => onChange({ ...settings, topUpAmount: v })}
                />
                <Field
                  label="Duration"
                  unit="hrs"
                  value={settings.bookingDurationHours}
                  min={1}
                  max={24}
                  step={1}
                  onChange={(v) =>
                    onChange({ ...settings, bookingDurationHours: v })
                  }
                />
                <Field
                  label="Start Hour"
                  unit="h"
                  value={settings.bookingStartHour}
                  min={0}
                  max={23}
                  step={1}
                  onChange={(v) =>
                    onChange({ ...settings, bookingStartHour: v })
                  }
                />
                <Field
                  label="Cash Fare"
                  unit="MAD"
                  value={settings.gateCashFare}
                  min={1}
                  max={500}
                  step={5}
                  onChange={(v) =>
                    onChange({
                      ...settings,
                      gateCashFare: v,
                      gateCashCommission: Math.round(v * 0.1 * 100) / 100,
                    })
                  }
                />
                <Field
                  label="Commission"
                  unit="MAD"
                  value={settings.gateCashCommission}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={(v) =>
                    onChange({ ...settings, gateCashCommission: v })
                  }
                />
                <Field
                  label="Overstay"
                  unit="min"
                  value={settings.overstayMinutes}
                  min={15}
                  max={480}
                  step={15}
                  onChange={(v) =>
                    onChange({ ...settings, overstayMinutes: v })
                  }
                />

                {/* Commission rate — full width */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 8.5,
                        color: T.textMuted,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Commission Rate
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.accent,
                      }}
                    >
                      {Math.round(settings.commissionRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={Math.round(settings.commissionRate * 100)}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        commissionRate: Number(e.target.value) / 100,
                      })
                    }
                    style={{ width: "100%", accentColor: T.accent }}
                  />
                </div>

                {/* Auto-release toggle — spans full width */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8.5,
                      color: T.textMuted,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Auto-release escrow
                  </span>
                  <Toggle
                    checked={settings.autoReleaseEscrow}
                    onChange={(v) =>
                      onChange({ ...settings, autoReleaseEscrow: v })
                    }
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Field ────────────────────────────────────────────────────────────── */

function Field({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const T = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        padding: "8px 10px",
        borderRadius: 8,
        background: T.card,
        border: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.textDim,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 26,
            padding: "0 7px",
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 700,
            color: T.text,
            background: T.card,
            border: `1px solid oklch(0.32 0.04 175 / 0.25)`,
            borderRadius: 6,
            outline: "none",
            textAlign: "right",
          }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: T.textDim,
            flexShrink: 0,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ── Toggle ───────────────────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const T = useTheme();
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 34,
        height: 18,
        borderRadius: 9,
        border: `1px solid ${checked ? T.borderActive : T.border}`,
        background: checked ? T.accentBg : T.card,
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 220ms ease, border-color 220ms ease",
      }}
    >
      <motion.div
        animate={{ x: checked ? 17 : 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        style={{
          position: "absolute",
          top: 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: checked ? T.accent : T.textMuted,
          boxShadow: checked ? `0 0 6px rgba(203,255,0,0.45)` : "none",
        }}
      />
    </button>
  );
}
