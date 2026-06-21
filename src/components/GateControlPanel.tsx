"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GateScenario, GateLogEntry } from "@/types/gate";
import { GATE_SCENARIOS } from "@/app/modules/gate/scenarios";
import { RotateCcw, History, TrafficCone, ChevronRight } from "lucide-react";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

interface GateControlPanelProps {
  onRunScenario: (scenario: GateScenario) => void;
  onReset: () => void;
  log: GateLogEntry[];
  running: boolean;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "entry", label: "Entry" },
  { value: "exit", label: "Exit" },
  { value: "agent", label: "Agent" },
  { value: "edge", label: "Edge" },
] as const;

function categorize(scenario: GateScenario): string {
  const id = scenario.id;
  if (
    ["walkin", "booking-entry", "unknown-entry", "ticket-digitalize"].includes(
      id,
    )
  )
    return "entry";
  if (["normal-exit", "exit-denied", "cash-exit"].includes(id)) return "exit";
  if (["session-switch", "cash-exit"].includes(id)) return "agent";
  return "edge";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function catAccent(cat: string, T: ThemeTokens): string {
  if (cat === "entry") return T.green;
  if (cat === "exit") return T.amber;
  if (cat === "agent") return T.purple;
  if (cat === "edge") return T.red;
  return T.blue;
}

function stepColor(type: string, T: ThemeTokens): string {
  if (type === "entry-granted" || type === "exit-granted") return T.green;
  if (
    type === "entry-denied" ||
    type === "exit-denied" ||
    type === "orphan-detected"
  )
    return T.red;
  if (type === "cash-payment") return T.amber;
  if (type === "entry-scan" || type === "exit-scan") return T.blue;
  if (type === "session-switch") return T.purple;
  return "#6B7280";
}

function logEventColor(event: string, T: ThemeTokens): string {
  const e = event.toUpperCase();
  if (e.includes("START") || e.includes("DONE")) return T.accent;
  if (e.includes("DENIED")) return T.red;
  if (e.includes("GRANTED")) return T.green;
  if (e.includes("CASH")) return T.amber;
  return T.textMuted;
}

// Count scenarios per category
function countInCat(cat: string): number {
  if (cat === "all") return GATE_SCENARIOS.length;
  return GATE_SCENARIOS.filter((s) => categorize(s) === cat).length;
}

export default function GateControlPanel({
  onRunScenario,
  onReset,
  log,
  running,
}: GateControlPanelProps) {
  const T = useTheme();
  const [activeCat, setActiveCat] = useState("all");

  const filteredScenarios =
    activeCat === "all"
      ? GATE_SCENARIOS
      : GATE_SCENARIOS.filter((s) => categorize(s) === activeCat);

  const refCells = [
    { cat: "entry", label: "Entry" },
    { cat: "exit", label: "Exit" },
    { cat: "agent", label: "Agent" },
    { cat: "edge", label: "Edge" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        background: T.bg,
      }}
    >
      {/* ── 1. Section header ─────────────────────────────────────────── */}
      <div style={{ padding: "14px 16px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <TrafficCone size={13} style={{ color: T.accent, flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: T.textMuted,
                textTransform: "uppercase",
              }}
            >
              Gate Scenarios
            </span>
          </div>

          {/* Reset button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            disabled={running}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.card,
              color: running ? T.textDim : T.textMuted,
              cursor: running ? "not-allowed" : "pointer",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              opacity: running ? 0.5 : 1,
            }}
          >
            <RotateCcw size={10} />
            RESET
          </motion.button>
        </div>

        {/* ── 2. Reference strip — 2×2 grid ─────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 5,
            marginBottom: 12,
          }}
        >
          {refCells.map(({ cat, label }) => {
            const accent = catAccent(cat, T);
            return (
              <div
                key={cat}
                style={{
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: `1px solid ${accent}28`,
                  background: `${accent}0d`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: accent,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: accent,
                    opacity: 0.75,
                  }}
                >
                  {countInCat(cat)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── 3. Divider ────────────────────────────────────────────── */}
        <div
          style={{
            height: 1,
            background: T.borderSubtle,
            marginBottom: 10,
          }}
        />

        {/* ── 4. Category filter chips ──────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCat === cat.value;
            const accent =
              cat.value === "all" || !isActive
                ? T.accent
                : catAccent(cat.value, T);
            return (
              <button
                key={cat.value}
                onClick={() => !running && setActiveCat(cat.value)}
                disabled={running}
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: isActive
                    ? `1px solid ${accent}`
                    : `1px solid ${T.borderSubtle}`,
                  background: isActive
                    ? cat.value === "all"
                      ? `${T.accent}1a`
                      : `${catAccent(cat.value, T)}18`
                    : T.card,
                  color: isActive ? accent : T.textMuted,
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.08em",
                  cursor: running ? "not-allowed" : "pointer",
                  opacity: running ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Scenario cards ─────────────────────────────────────────── */}
      <div style={{ padding: "0 12px 12px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCat}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ display: "flex", flexDirection: "column", gap: 5 }}
          >
            {filteredScenarios.map((s) => {
              const cat = categorize(s);
              const accent = catAccent(cat, T);
              return (
                <motion.button
                  key={s.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onRunScenario(s)}
                  disabled={running}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    width: "100%",
                    textAlign: "left",
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: running ? "not-allowed" : "pointer",
                    opacity: running ? 0.5 : 1,
                    pointerEvents: running ? "none" : "auto",
                    padding: 0,
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!running) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        `${accent}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      T.border;
                  }}
                >
                  {/* Left accent stripe */}
                  <div
                    style={{
                      width: 3,
                      flexShrink: 0,
                      background: accent,
                      borderRadius: "0 0 0 0",
                    }}
                  />

                  {/* Card content */}
                  <div style={{ flex: 1, padding: "8px 10px", minWidth: 0 }}>
                    {/* Top row: badge + name + step count */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      {/* UC badge */}
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: T.accent,
                          background: `${T.accent}1f`,
                          border: `1px solid ${T.accent}33`,
                          borderRadius: 4,
                          padding: "1px 5px",
                          flexShrink: 0,
                        }}
                      >
                        {s.number}
                      </span>

                      {/* Name */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.text,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </span>

                      {/* Step count */}
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 8,
                          color: T.textDim,
                          flexShrink: 0,
                        }}
                      >
                        {s.steps.length} steps
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: 9,
                        color: T.textMuted,
                        lineHeight: 1.45,
                        margin: 0,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        marginBottom: 6,
                      }}
                    >
                      {s.description}
                    </p>

                    {/* Step dots */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      {s.steps.slice(0, 5).map((step) => (
                        <span
                          key={step.id}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: stepColor(step.type, T),
                          }}
                        />
                      ))}
                      {s.steps.length > 5 && (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 8,
                            color: T.textDim,
                          }}
                        >
                          +{s.steps.length - 5}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      paddingRight: 8,
                    }}
                  >
                    <ChevronRight size={11} style={{ color: T.textDim }} />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 6. Divider ────────────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background: T.borderSubtle,
          margin: "0 12px",
        }}
      />

      {/* ── 7. Event log ──────────────────────────────────────────────── */}
      <div style={{ padding: "10px 12px 16px" }}>
        {/* Log header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 8,
          }}
        >
          <History size={12} style={{ color: T.textMuted, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: T.textMuted,
              textTransform: "uppercase",
            }}
          >
            Event Log
          </span>
        </div>

        {/* Empty state */}
        {log.length === 0 && (
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: T.textDim,
              fontStyle: "italic",
              margin: "8px 0",
            }}
          >
            Run a gate scenario to see events...
          </p>
        )}

        {/* Log entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    background: T.card,
                    border: `1px solid ${T.borderSubtle}`,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Timestamp */}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 7.5,
                      color: T.textDim,
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(entry.timestamp)}
                  </span>

                  {/* Event label */}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      color: logEventColor(entry.event, T),
                      flexShrink: 0,
                    }}
                  >
                    {entry.event}
                  </span>

                  {/* Detail */}
                  {entry.detail && (
                    <span
                      style={{
                        fontSize: 9,
                        color: T.textMuted,
                        lineHeight: 1.4,
                      }}
                    >
                      {entry.detail}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
