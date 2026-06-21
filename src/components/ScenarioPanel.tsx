"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PRDScenario, LogEntry } from "@/types/financial";
import { SCENARIOS } from "@/lib/scenarios";
import {
  WORKFLOWS,
  type Workflow,
  getWorkflowScenarios,
} from "@/lib/workflows";
import {
  Zap,
  PlayCircle,
  Trash2,
  History,
  ArrowRight,
  Unlock,
  Settings2,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

// ─── Design tokens ────────────────────────────────────────────────────────────

// CATEGORY_COLOR is computed inside ScenarioPanel using T tokens

// ─── Category filter config ────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "topup", label: "Top-Up" },
  { value: "booking", label: "Booking" },
  { value: "gate", label: "Gate" },
  { value: "cancellation", label: "Cancel" },
  { value: "overstay", label: "Overstay" },
  { value: "settlement", label: "Settle" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Props interface ───────────────────────────────────────────────────────

interface ScenarioPanelProps {
  onRunScenario: (scenario: PRDScenario) => void;
  onRunWorkflow: (workflow: Workflow) => void;
  onHoverScenario: (scenario: PRDScenario | null) => void;
  onReset: () => void;
  onHardReset: () => void;
  onReleaseEscrow: () => void;
  log: LogEntry[];
}

// ─── Test Accounts component ───────────────────────────────────────────────

const TEST_ACCOUNTS = [
  {
    role: "Driver",
    email: "akarog20230@gmail.com",
    password: "password123",
    api: "Main API (:8080)",
  },
  {
    role: "Tenant",
    email: "test-tenant@otoparking.com",
    password: "Test-Tenant2026",
    api: "Admin API (:8082)",
  },
  {
    role: "Admin",
    email: "admin@otoparking.com",
    password: "Admin@12345",
    api: "Admin API (:8082)",
  },
];

function TestAccounts({ theme: T }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 10px",
        borderRadius: 10,
        background: T.card,
        border: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 7.5,
          color: T.textDim,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Test Accounts
      </span>
      {TEST_ACCOUNTS.map((a) => (
        <div
          key={a.role}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 6px",
            borderRadius: 6,
            background: T.cardHover,
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: T.accent,
              width: 48,
              flexShrink: 0,
            }}
          >
            {a.role}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: T.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.email}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 7,
              color: T.textDim,
              flexShrink: 0,
            }}
          >
            {a.password}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ScenarioPanel({
  onRunScenario,
  onRunWorkflow,
  onHoverScenario,
  onReset,
  onHardReset,
  onReleaseEscrow,
  log,
}: ScenarioPanelProps) {
  const T = useTheme();
  const CATEGORY_COLOR: Record<string, string> = {
    topup: T.green,
    booking: T.blue,
    gate: T.accent,
    cancellation: T.red,
    overstay: T.amber,
    settlement: T.purple,
  };
  const [activeCat, setActiveCat] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "scenarios" | "workflows" | "actions"
  >("scenarios");

  const filteredScenarios =
    activeCat === "all"
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === activeCat);

  // ── Shared number-badge style ──────────────────────────────────────────
  const numBadgeStyle: React.CSSProperties = {
    fontSize: 8.5,
    fontFamily: "monospace",
    fontWeight: 700,
    color: T.accent,
    background: T.accentBg,
    border: `1px solid oklch(0.55 0.12 130 / 0.3)`,
    borderRadius: 3,
    padding: "1px 4px",
    flexShrink: 0,
  };

  // ── Tab config ────────────────────────────────────────────────────────
  const TABS = [
    { id: "scenarios" as const, label: "Scenarios", icon: <Zap size={10} /> },
    {
      id: "workflows" as const,
      label: "Workflows",
      icon: <PlayCircle size={10} />,
    },
    { id: "actions" as const, label: "Actions", icon: <Settings2 size={10} /> },
  ];

  return (
    <div
      style={{
        background: T.bg,
        color: T.text,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        fontFamily: "inherit",
      }}
    >
      {/* ── HEADER BAR (44px) ─────────────────────────────────────────── */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Left: indicator dot + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: T.accent,
              boxShadow: `0 0 6px ${T.accent}80`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.textMuted,
            }}
          >
            Scenarios
          </span>
        </div>

        {/* Right: spacer */}
        <div />
      </div>

      {/* ── TAB BAR (36px) ──────────────────────────────────────────────── */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "stretch",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
                color: isActive ? T.accent : T.textMuted,
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                padding: "0 4px",
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "scenarios" && (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: isActive ? T.bg : T.textDim,
                    background: isActive ? T.accent : T.border,
                    borderRadius: 10,
                    padding: "0px 5px",
                    lineHeight: "14px",
                    transition: "all 0.15s",
                  }}
                >
                  {filteredScenarios.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB BODY (flex-1, scrollable) ────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* ── Scenarios tab ────────────────────────────────────────────── */}
        {activeTab === "scenarios" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Category filter chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                padding: "10px 14px 8px",
                flexShrink: 0,
              }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCat === cat.value;
                const accentColor =
                  cat.value === "all" ? T.accent : CATEGORY_COLOR[cat.value];
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCat(cat.value)}
                    style={{
                      fontSize: 9,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      padding: "3px 9px",
                      borderRadius: 20,
                      border: isActive
                        ? `1px solid ${accentColor}`
                        : `1px solid ${T.border}`,
                      background: isActive ? `${accentColor}18` : "transparent",
                      color: isActive ? accentColor : T.textDim,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Scenario cards */}
            <div style={{ padding: "2px 14px 14px" }}>
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
                    const accent = CATEGORY_COLOR[s.category];
                    return (
                      <motion.button
                        key={s.id}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => onRunScenario(s)}
                        onMouseEnter={() => onHoverScenario(s)}
                        onMouseLeave={() => onHoverScenario(null)}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          background: T.card,
                          border: `1px solid ${T.border}`,
                          borderRadius: 7,
                          overflow: "hidden",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                          width: "100%",
                        }}
                      >
                        {/* Left accent stripe */}
                        <div
                          style={{
                            width: 3,
                            background: accent,
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{ padding: "8px 10px", flex: 1, minWidth: 0 }}
                        >
                          {/* Row 1: number badge + name + category badge */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            <span style={numBadgeStyle}>
                              #{String(s.number).padStart(2, "0")}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
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
                            <span
                              style={{
                                fontSize: 7.5,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: accent,
                                background: `${accent}18`,
                                border: `1px solid ${accent}40`,
                                borderRadius: 3,
                                padding: "1px 5px",
                                flexShrink: 0,
                              }}
                            >
                              {s.category}
                            </span>
                          </div>

                          {/* Row 2: description */}
                          <p
                            style={{
                              fontSize: 9,
                              color: T.textMuted,
                              margin: 0,
                              lineHeight: 1.45,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              marginBottom: 5,
                            }}
                          >
                            {s.description}
                          </p>

                          {/* Row 3: flows count chip */}
                          <span
                            style={{
                              fontSize: 8,
                              fontFamily: "monospace",
                              color: T.textDim,
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderRadius: 3,
                              padding: "1px 6px",
                            }}
                          >
                            {s.flows.length}{" "}
                            {s.flows.length === 1 ? "flow" : "flows"}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Workflows tab ─────────────────────────────────────────────── */}
        {activeTab === "workflows" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "10px 14px",
            }}
          >
            {WORKFLOWS.map((wf) => {
              const wfScenarios = getWorkflowScenarios(wf);
              return (
                <motion.button
                  key={wf.id}
                  whileHover={{ x: 1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onRunWorkflow(wf)}
                  onMouseEnter={() => {
                    if (wfScenarios.length > 0) onHoverScenario(wfScenarios[0]);
                  }}
                  onMouseLeave={() => onHoverScenario(null)}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 0,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 7,
                    overflow: "hidden",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                    width: "100%",
                  }}
                >
                  {/* Left accent stripe */}
                  <div
                    style={{ width: 3, background: T.accent, flexShrink: 0 }}
                  />
                  <div style={{ padding: "8px 10px", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.text,
                        marginBottom: 2,
                      }}
                    >
                      {wf.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: T.textMuted,
                        lineHeight: 1.4,
                        marginBottom: 5,
                      }}
                    >
                      {wf.description}
                    </div>
                    {/* Step chain */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      {wf.steps.map((stepId, i) => {
                        const sc = SCENARIOS.find((s) => s.id === stepId);
                        return (
                          <span
                            key={stepId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <span style={numBadgeStyle}>
                              #{String(sc?.number ?? "?").padStart(2, "0")}
                            </span>
                            {i < wf.steps.length - 1 && (
                              <ArrowRight
                                size={8}
                                style={{ color: T.textDim }}
                              />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ── Actions tab ───────────────────────────────────────────────── */}
        {activeTab === "actions" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "10px 14px",
            }}
          >
            {/* Hard Reset */}
            <motion.button
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onHardReset}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
                width: "100%",
              }}
            >
              <div style={{ width: 3, background: T.red, flexShrink: 0 }} />
              <div
                style={{
                  padding: "10px 12px",
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `${T.red}18`,
                    border: `1px solid ${T.red}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: T.red,
                  }}
                >
                  <Trash2 size={13} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 2,
                    }}
                  >
                    Hard Reset
                  </div>
                  <div style={{ fontSize: 9, color: T.textMuted }}>
                    Wipe all backend test data
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Release Escrow */}
            <motion.button
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReleaseEscrow}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
                width: "100%",
              }}
            >
              <div style={{ width: 3, background: T.escrow, flexShrink: 0 }} />
              <div
                style={{
                  padding: "10px 12px",
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `${T.escrow}18`,
                    border: `1px solid ${T.escrow}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: T.escrow,
                  }}
                >
                  <Unlock size={13} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 2,
                    }}
                  >
                    Release Escrow
                  </div>
                  <div style={{ fontSize: 9, color: T.textMuted }}>
                    Force-release all held escrow
                  </div>
                </div>
              </div>
            </motion.button>

            {/* ── Test Accounts ── */}
            <TestAccounts theme={T} />
          </div>
        )}
      </div>

      {/* ── EVENT LOG (fixed 220px) ───────────────────────────────────── */}
      <div
        style={{
          height: 220,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderTop: `1px solid ${T.border}`,
          background: T.bg,
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            flexShrink: 0,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <History size={12} style={{ color: T.textMuted }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: T.textMuted,
              flex: 1,
            }}
          >
            Event Log
          </span>
          {log.length > 0 && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                color: T.textDim,
                background: T.border,
                borderRadius: 10,
                padding: "0px 6px",
                lineHeight: "14px",
              }}
            >
              {log.length}
            </span>
          )}
        </div>

        {/* Scrollable log entries */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            padding: "6px 10px 8px",
          }}
        >
          {log.length === 0 && (
            <p
              style={{
                fontSize: 10,
                fontStyle: "italic",
                color: T.textDim,
                fontFamily: "monospace",
                margin: 0,
                padding: "8px 4px",
              }}
            >
              Run a scenario to see money flow...
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <AnimatePresence initial={false}>
              {log.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -12, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 5,
                    padding: "5px 8px",
                    display: "flex",
                    gap: 6,
                    alignItems: "baseline",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontSize: 8.5,
                      fontFamily: "monospace",
                      color: T.textDim,
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(entry.timestamp)}
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: T.accent,
                      flexShrink: 0,
                    }}
                  >
                    #{entry.scenario}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {entry.summary}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
