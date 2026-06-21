"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Database,
  Globe,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Trash2,
  PauseCircle,
  PlayCircle,
  Filter,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonitorEventType = "api" | "step" | "db" | "system";

export interface MonitorEvent {
  id: string;
  type: MonitorEventType;
  timestamp: Date;
  label: string;
  detail: string;
  status?: "ok" | "error" | "pending";
  /** Optional structured metadata for verbose display */
  meta?: Record<string, string | number | boolean>;
  /** Response time in ms (if known) */
  durationMs?: number;
}

interface MonitorPanelProps {
  events: MonitorEvent[];
  onClear?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMs(d: Date): string {
  return (
    d.toLocaleTimeString("fr-MA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

function relativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return formatTime(d);
}

// ─── Type config ──────────────────────────────────────────────────────────────

type TypeConfig = {
  label: string;
  shortLabel: string;
  color: string;
  bgAlpha: string;
  icon: (size: number) => React.ReactNode;
  description: string;
};

function useTypeConfig(): Record<MonitorEventType, TypeConfig> {
  const T = useTheme();
  return {
    api: {
      label: "API Call",
      shortLabel: "API",
      color: T.blue,
      bgAlpha: `${T.blue}22`,
      icon: (s) => <Globe style={{ width: s, height: s }} />,
      description: "HTTP requests to backend endpoints",
    },
    step: {
      label: "Scenario Step",
      shortLabel: "STEP",
      color: T.accent,
      bgAlpha: `${T.accent}22`,
      icon: (s) => <Activity style={{ width: s, height: s }} />,
      description: "Simulation scenario execution steps",
    },
    db: {
      label: "Database",
      shortLabel: "DB",
      color: T.amber,
      bgAlpha: `${T.amber}22`,
      icon: (s) => <Database style={{ width: s, height: s }} />,
      description: "Database table reads and writes",
    },
    system: {
      label: "System",
      shortLabel: "SYS",
      color: T.purple,
      bgAlpha: `${T.purple}22`,
      icon: (s) => <Terminal style={{ width: s, height: s }} />,
      description: "Internal system events and state changes",
    },
  };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  size = 13,
}: {
  status?: MonitorEvent["status"];
  size?: number;
}) {
  const T = useTheme();
  if (!status) return null;
  if (status === "ok")
    return (
      <CheckCircle2
        style={{ width: size, height: size, color: T.green, flexShrink: 0 }}
      />
    );
  if (status === "error")
    return (
      <XCircle
        style={{ width: size, height: size, color: T.red, flexShrink: 0 }}
      />
    );
  return (
    <motion.div
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{ duration: 1.1, repeat: Infinity }}
    >
      <Clock
        style={{ width: size, height: size, color: T.amber, flexShrink: 0 }}
      />
    </motion.div>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip({ events }: { events: MonitorEvent[] }) {
  const T = useTheme();
  const TC = useTypeConfig();

  const total = events.length;
  const errors = events.filter((e) => e.status === "error").length;
  const pending = events.filter((e) => e.status === "pending").length;
  const apiCalls = events.filter((e) => e.type === "api").length;
  const dbOps = events.filter((e) => e.type === "db").length;
  const steps = events.filter((e) => e.type === "step").length;

  const stats = [
    { label: "Total", value: total, color: T.textMuted },
    { label: "API", value: apiCalls, color: TC.api.color },
    { label: "DB", value: dbOps, color: TC.db.color },
    { label: "Steps", value: steps, color: TC.step.color },
    {
      label: errors > 0 ? "Errors" : pending > 0 ? "Pending" : "OK",
      value:
        errors > 0 ? errors : pending > 0 ? pending : total - errors - pending,
      color: errors > 0 ? T.red : pending > 0 ? T.amber : T.green,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        borderBottom: `1px solid ${T.borderSubtle}`,
        background: T.isDark
          ? "oklch(0.14 0.03 185 / 0.9)"
          : "oklch(0.92 0.01 185 / 0.9)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "7px 4px",
            borderRight:
              i < stats.length - 1 ? `1px solid ${T.borderSubtle}` : "none",
            gap: 2,
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 15,
              fontWeight: 800,
              color: s.color,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {s.value}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: T.textDim,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type FilterType = MonitorEventType | "all";

function FilterBar({
  active,
  onChange,
  events,
}: {
  active: FilterType;
  onChange: (f: FilterType) => void;
  events: MonitorEvent[];
}) {
  const T = useTheme();
  const TC = useTypeConfig();

  const filters: { id: FilterType; label: string; color: string }[] = [
    { id: "all", label: "All", color: T.textMuted },
    { id: "api", label: "API", color: TC.api.color },
    { id: "step", label: "Steps", color: TC.step.color },
    { id: "db", label: "DB", color: TC.db.color },
    { id: "system", label: "Sys", color: TC.system.color },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        flexShrink: 0,
        borderBottom: `1px solid ${T.borderSubtle}`,
        background: T.panel,
      }}
    >
      <Filter
        style={{ width: 10, height: 10, color: T.textDim, flexShrink: 0 }}
      />
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {filters.map((f) => {
          const count =
            f.id === "all"
              ? events.length
              : events.filter((e) => e.type === f.id).length;
          const isActive = active === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                borderRadius: 99,
                border: `1px solid ${isActive ? f.color + "60" : T.borderSubtle}`,
                background: isActive ? f.color + "18" : "transparent",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 8.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? f.color : T.textDim,
                letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
            >
              {f.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 8,
                    color: isActive ? f.color : T.textDim,
                    opacity: 0.8,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wallet transfer inline card ────────────────────────────────────────────

function WalletTransferCard({ event }: { event: MonitorEvent }) {
  const T = useTheme();
  const meta = event.meta!;
  const op = String(meta.operation ?? "");
  const isDebit = op === "DEBIT";
  const isCredit = op === "CREDIT";
  const opColor = isDebit ? T.red : isCredit ? T.green : T.blue;
  const opBg = isDebit
    ? `${T.red}18`
    : isCredit
      ? `${T.green}18`
      : `${T.blue}18`;
  const deltaStr = String(meta.delta ?? "");
  const isPositive = deltaStr.startsWith("+");
  const isNegative = deltaStr.startsWith("-");
  const deltaColor = isPositive ? T.green : isNegative ? T.red : T.textMuted;

  // Parse before/after numbers for the progress bar
  const parseMad = (s: string) =>
    parseFloat(String(s).replace(/[^0-9.-]/g, "")) || 0;
  const before = parseMad(String(meta.before ?? 0));
  const after = parseMad(String(meta.after ?? 0));
  const maxVal = Math.max(before, after, 0.01);
  const beforePct = Math.min((before / maxVal) * 100, 100);
  const afterPct = Math.min((after / maxVal) * 100, 100);

  return (
    <div
      style={{
        margin: "0 8px 3px",
        borderRadius: 8,
        border: `1px solid ${opColor}40`,
        background: T.isDark
          ? "oklch(0.155 0.04 183 / 0.9)"
          : "oklch(0.975 0.006 185 / 0.97)",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 10px 4px",
          borderBottom: `1px solid ${T.borderSubtle}`,
          background: opBg,
        }}
      >
        {/* Op badge */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            fontWeight: 800,
            color: opColor,
            letterSpacing: "0.10em",
            flexShrink: 0,
          }}
        >
          {op}
        </span>

        {/* Wallet name */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9.5,
            fontWeight: 700,
            color: T.text,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {String(meta.wallet ?? "")}
        </span>

        {/* Delta */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 800,
            color: deltaColor,
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          {deltaStr}
        </span>
      </div>

      {/* Before → After row */}
      <div
        style={{
          padding: "6px 10px 7px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {/* Balance bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Before */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: T.textDim,
              flexShrink: 0,
              minWidth: 52,
              textAlign: "right",
            }}
          >
            {String(meta.before ?? "")}
          </span>

          {/* Bar track */}
          <div
            style={{
              flex: 1,
              height: 5,
              borderRadius: 99,
              background: T.isDark
                ? "oklch(0.22 0.03 183)"
                : "oklch(0.88 0.01 185)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Before fill */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${beforePct}%`,
                background: T.textDim,
                borderRadius: 99,
                opacity: 0.35,
              }}
            />
            {/* After fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${afterPct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                background: opColor,
                borderRadius: 99,
              }}
            />
          </div>

          {/* After */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: opColor,
              flexShrink: 0,
              minWidth: 52,
            }}
          >
            {String(meta.after ?? "")}
          </span>
        </div>

        {/* Field + Table labels */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 7.5,
              color: T.textDim,
              background: T.isDark
                ? "oklch(0.20 0.03 183)"
                : "oklch(0.90 0.01 185)",
              border: `1px solid ${T.borderSubtle}`,
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {String(meta.field ?? "available")}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 7.5,
              color: T.textDim,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {String(meta.table ?? "")}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 7.5,
              color: T.textDim,
              flexShrink: 0,
            }}
          >
            {String(meta.prd ?? "")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Single event row ─────────────────────────────────────────────────────────

function EventRow({ event, isNew }: { event: MonitorEvent; isNew: boolean }) {
  const T = useTheme();
  const TC = useTypeConfig();
  const [expanded, setExpanded] = useState(false);
  const cfg = TC[event.type];

  // Is this a wallet transfer event (has granular before/after)?
  const isTransfer = !!(
    event.meta?.operation &&
    ["DEBIT", "CREDIT", "UPDATE"].includes(String(event.meta.operation)) &&
    event.meta.before !== undefined &&
    event.meta.after !== undefined
  );

  // Auto-expand new pending events
  useEffect(() => {
    if (isNew && event.status === "pending") setExpanded(true);
  }, [isNew, event.status]);

  // Collapse once resolved
  useEffect(() => {
    if (event.status === "ok" || event.status === "error") {
      const t = setTimeout(() => setExpanded(false), 2400);
      return () => clearTimeout(t);
    }
  }, [event.status]);

  const hasExpandable =
    !isTransfer &&
    (event.meta || event.durationMs !== undefined || event.detail.length > 60);

  const statusBorderColor =
    event.status === "error"
      ? T.red
      : event.status === "pending"
        ? T.amber
        : event.status === "ok"
          ? T.green + "40"
          : T.borderSubtle;

  // Transfer events render as their own card
  if (isTransfer) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10, height: 0 }}
        animate={{ opacity: 1, x: 0, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: "hidden", flexShrink: 0 }}
      >
        <WalletTransferCard event={event} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: "hidden", flexShrink: 0 }}
    >
      <div
        style={{
          margin: "3px 8px",
          borderRadius: 8,
          border: `1px solid ${statusBorderColor}`,
          background: T.isDark
            ? "oklch(0.16 0.035 183 / 0.85)"
            : "oklch(0.96 0.008 185 / 0.95)",
          overflow: "hidden",
          transition: "border-color 0.3s",
        }}
      >
        {/* ── Main row ── */}
        <div
          onClick={() => hasExpandable && setExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 10px",
            cursor: hasExpandable ? "pointer" : "default",
          }}
        >
          {/* Type icon */}
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: cfg.bgAlpha,
              border: `1px solid ${cfg.color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: cfg.color,
            }}
          >
            {cfg.icon(11)}
          </div>

          {/* Label + detail */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 7.5,
                  fontWeight: 800,
                  color: cfg.color,
                  background: cfg.bgAlpha,
                  border: `1px solid ${cfg.color}35`,
                  padding: "0px 5px",
                  borderRadius: 3,
                  letterSpacing: "0.08em",
                  flexShrink: 0,
                }}
              >
                {cfg.shortLabel}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {event.label}
              </span>
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: T.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {event.detail}
            </span>
          </div>

          {/* Right side */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <StatusBadge status={event.status} size={12} />
            <span
              style={{ fontFamily: "monospace", fontSize: 8, color: T.textDim }}
            >
              {formatTime(event.timestamp)}
            </span>
            {hasExpandable && (
              <ChevronRight
                style={{
                  width: 11,
                  height: 11,
                  color: T.textDim,
                  transform: expanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            )}
          </div>
        </div>

        {/* ── Expanded detail ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "8px 10px 10px",
                  borderTop: `1px solid ${T.borderSubtle}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: T.isDark
                    ? "oklch(0.13 0.03 185 / 0.6)"
                    : "oklch(0.94 0.008 185 / 0.7)",
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9.5,
                    color: T.textMuted,
                    lineHeight: 1.6,
                    wordBreak: "break-all",
                  }}
                >
                  {event.detail}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <MetaRow
                    label="Timestamp"
                    value={formatMs(event.timestamp)}
                    color={T.textDim}
                  />
                  <MetaRow
                    label="Relative"
                    value={relativeTime(event.timestamp)}
                    color={T.textDim}
                  />
                  {event.durationMs !== undefined && (
                    <MetaRow
                      label="Duration"
                      value={`${event.durationMs}ms`}
                      color={T.green}
                    />
                  )}
                  {event.status && (
                    <MetaRow
                      label="Status"
                      value={event.status.toUpperCase()}
                      color={
                        event.status === "ok"
                          ? T.green
                          : event.status === "error"
                            ? T.red
                            : T.amber
                      }
                    />
                  )}
                </div>
                {event.meta && Object.keys(event.meta).length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "4px 12px",
                      paddingTop: 4,
                      borderTop: `1px solid ${T.borderSubtle}`,
                    }}
                  >
                    {Object.entries(event.meta).map(([k, v]) => (
                      <MetaRow
                        key={k}
                        label={k}
                        value={String(v)}
                        color={T.textMuted}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MetaRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const T = useTheme();
  return (
    <div
      style={{ display: "flex", gap: 6, alignItems: "baseline", minWidth: 0 }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          color: T.textDim,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color,
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  const T = useTheme();
  const TC = useTypeConfig();

  const descriptions: Record<FilterType, string> = {
    all: "Run a scenario from the Scenarios tab to see events here.",
    api: "API calls will appear here when scenarios interact with the backend.",
    step: "Scenario execution steps will appear here when you run a simulation.",
    db: "Database operations will appear here during real API scenarios.",
    system: "Internal system events will appear here during simulations.",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        gap: 10,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background:
            filter === "all"
              ? `${T.textDim}18`
              : `${TC[filter as MonitorEventType]?.color ?? T.textDim}18`,
          border: `1px solid ${
            filter === "all"
              ? T.borderSubtle
              : `${TC[filter as MonitorEventType]?.color ?? T.textDim}30`
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color:
            filter === "all"
              ? T.textDim
              : (TC[filter as MonitorEventType]?.color ?? T.textDim),
        }}
      >
        {filter === "all" ? (
          <Layers style={{ width: 16, height: 16 }} />
        ) : filter === "api" ? (
          <Globe style={{ width: 16, height: 16 }} />
        ) : filter === "step" ? (
          <Activity style={{ width: 16, height: 16 }} />
        ) : filter === "db" ? (
          <Database style={{ width: 16, height: 16 }} />
        ) : (
          <Terminal style={{ width: 16, height: 16 }} />
        )}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            color: T.textMuted,
            letterSpacing: "0.04em",
            marginBottom: 4,
          }}
        >
          No events yet
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "monospace",
            fontSize: 9,
            color: T.textDim,
            lineHeight: 1.6,
            maxWidth: 220,
          }}
        >
          {descriptions[filter]}
        </p>
      </div>
    </div>
  );
}

// ─── Legend panel ─────────────────────────────────────────────────────────────

function LegendPanel({ onClose }: { onClose: () => void }) {
  const T = useTheme();
  const TC = useTypeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "absolute",
        top: 36,
        right: 8,
        zIndex: 20,
        width: 260,
        background: T.isDark
          ? "oklch(0.18 0.04 183 / 0.98)"
          : "oklch(0.97 0.01 185 / 0.98)",
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: `0 8px 32px ${T.isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.14)"}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${T.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: T.textMuted,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          Event Types
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.textDim,
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          x
        </button>
      </div>

      {/* Types */}
      {(Object.entries(TC) as [MonitorEventType, TypeConfig][]).map(
        ([type, cfg]) => (
          <div
            key={type}
            style={{
              padding: "8px 12px",
              borderBottom: `1px solid ${T.borderSubtle}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: cfg.bgAlpha,
                border: `1px solid ${cfg.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: cfg.color,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {cfg.icon(12)}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: cfg.color,
                  marginBottom: 2,
                }}
              >
                {cfg.label}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8.5,
                  color: T.textDim,
                  lineHeight: 1.5,
                }}
              >
                {cfg.description}
              </div>
            </div>
          </div>
        ),
      )}

      {/* Status indicators */}
      <div style={{ padding: "8px 12px" }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 8.5,
            color: T.textDim,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Status Indicators
        </div>
        {[
          {
            icon: (
              <CheckCircle2 style={{ width: 12, height: 12, color: T.green }} />
            ),
            label: "ok",
            desc: "Operation completed successfully",
          },
          {
            icon: <Clock style={{ width: 12, height: 12, color: T.amber }} />,
            label: "pending",
            desc: "Operation in progress",
          },
          {
            icon: <XCircle style={{ width: 12, height: 12, color: T.red }} />,
            label: "error",
            desc: "Operation failed or was rejected",
          },
          {
            icon: <Info style={{ width: 12, height: 12, color: T.textDim }} />,
            label: "—",
            desc: "Informational event, no status",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 4,
            }}
          >
            {s.icon}
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8.5,
                color: T.textMuted,
              }}
            >
              {s.desc}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MonitorPanel({ events, onClear }: MonitorPanelProps) {
  const T = useTheme();
  const [filter, setFilter] = useState<FilterType>("all");
  const [autoscroll, setAutoscroll] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const newEventIds = useRef<Set<string>>(new Set());

  // Track which event ids are "new" (just arrived)
  useEffect(() => {
    const oldCount = prevCountRef.current;
    if (events.length > oldCount) {
      events.slice(0, events.length - oldCount).forEach((e) => {
        newEventIds.current.add(e.id);
        setTimeout(() => newEventIds.current.delete(e.id), 2000);
      });
    }
    prevCountRef.current = events.length;
  }, [events]);

  // Auto-scroll to top (newest events are prepended)
  useEffect(() => {
    if (autoscroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, autoscroll]);

  const filtered =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    // If user scrolled down away from top, pause autoscroll
    if (scrollTop > 60) setAutoscroll(false);
    if (scrollTop === 0) setAutoscroll(true);
  }, []);

  const jumpToTop = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setAutoscroll(true);
  }, []);

  const hasErrors = events.some((e) => e.status === "error");
  const hasPending = events.some((e) => e.status === "pending");

  return (
    <div
      className="flex flex-col"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: T.bg,
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Left: title + live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <motion.div
            animate={
              hasPending
                ? { opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }
                : hasErrors
                  ? { opacity: [1, 0.4, 1] }
                  : events.length > 0
                    ? { opacity: [0.7, 1, 0.7] }
                    : { opacity: 0.3 }
            }
            transition={{ duration: hasPending ? 0.9 : 2, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: hasPending ? T.amber : hasErrors ? T.red : T.green,
              boxShadow: `0 0 6px ${hasPending ? T.amber : hasErrors ? T.red : T.green}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: T.textMuted,
            }}
          >
            Monitor
          </span>
          {events.length > 0 && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: T.textDim,
                background: T.card,
                border: `1px solid ${T.borderSubtle}`,
                padding: "0px 5px",
                borderRadius: 3,
              }}
            >
              {events.length} events
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* Autoscroll toggle */}
          <button
            onClick={() => (autoscroll ? setAutoscroll(false) : jumpToTop())}
            title={autoscroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            style={{
              background: "none",
              border: `1px solid ${autoscroll ? T.accent + "50" : T.borderSubtle}`,
              borderRadius: 4,
              padding: "2px 4px",
              cursor: "pointer",
              color: autoscroll ? T.accent : T.textDim,
              display: "flex",
              alignItems: "center",
            }}
          >
            {autoscroll ? (
              <PauseCircle style={{ width: 10, height: 10 }} />
            ) : (
              <PlayCircle style={{ width: 10, height: 10 }} />
            )}
          </button>

          {/* Legend */}
          <button
            onClick={() => setShowLegend((v) => !v)}
            title="Event legend"
            style={{
              background: "none",
              border: `1px solid ${showLegend ? T.accent + "50" : T.borderSubtle}`,
              borderRadius: 4,
              padding: "2px 4px",
              cursor: "pointer",
              color: showLegend ? T.accent : T.textDim,
              display: "flex",
              alignItems: "center",
            }}
          >
            <AlertTriangle style={{ width: 10, height: 10 }} />
          </button>

          {/* Clear */}
          {onClear && events.length > 0 && (
            <button
              onClick={onClear}
              title="Clear all events"
              style={{
                background: "none",
                border: `1px solid ${T.borderSubtle}`,
                borderRadius: 4,
                padding: "2px 4px",
                cursor: "pointer",
                color: T.textDim,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash2 style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary strip ── */}
      {events.length > 0 && <SummaryStrip events={events} />}

      {/* ── Filter bar ── */}
      <FilterBar active={filter} onChange={setFilter} events={events} />

      {/* ── Event list ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 8,
          scrollbarWidth: "thin",
          scrollbarColor: `${T.border} transparent`,
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                isNew={newEventIds.current.has(e.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Jump-to-top bar (shows when scroll-paused) ── */}
      <AnimatePresence>
        {!autoscroll && filtered.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={jumpToTop}
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 12px",
              borderRadius: 99,
              background: T.accent,
              border: "none",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: T.isDark ? "#0a1a0a" : "#ffffff",
              boxShadow: `0 4px 16px ${T.accent}60`,
              zIndex: 10,
            }}
          >
            <ChevronDown
              style={{ width: 10, height: 10, transform: "rotate(180deg)" }}
            />
            New events
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Legend popup ── */}
      <AnimatePresence>
        {showLegend && <LegendPanel onClose={() => setShowLegend(false)} />}
      </AnimatePresence>
    </div>
  );
}
