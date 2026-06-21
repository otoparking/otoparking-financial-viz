"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LambdaDef, InfraLogEntry } from "@/types/infra";
import {
  API_LAMBDAS,
  JOB_LAMBDAS,
  GATE_LAMBDA,
  EXTERNAL_SERVICES,
} from "@/app/modules/infra/topology";
import {
  RotateCcw,
  History,
  Server,
  Zap,
  Clock,
  Database,
  CreditCard,
  Bell,
  Shield,
  Archive,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

/* ─────────────────────── types ─────────────────────── */
interface InfraControlPanelProps {
  onSelectLambda: (lambda: LambdaDef) => void;
  onReset: () => void;
  log: InfraLogEntry[];
}

/* ─────────────────────── constants ─────────────────── */
const ALL_API_LAMBDAS = [...API_LAMBDAS, GATE_LAMBDA].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const SERVICE_META: Record<string, { color: string; icon: React.ReactNode }> = {
  noscera: {
    color: "#8B5CF6",
    icon: <Shield style={{ width: 12, height: 12 }} />,
  },
  corpopay: {
    color: "#F59E0B",
    icon: <CreditCard style={{ width: 12, height: 12 }} />,
  },
  pushcaster: {
    color: "#378ADD",
    icon: <Bell style={{ width: 12, height: 12 }} />,
  },
  rds: {
    color: "#378ADD",
    icon: <Database style={{ width: 12, height: 12 }} />,
  },
  s3: { color: "#BA7517", icon: <Archive style={{ width: 12, height: 12 }} /> },
};

/* ─────────────────────── helpers ───────────────────── */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ─────────────────────── sub-components ────────────── */
function Divider({ theme: T }: { theme: ThemeTokens }) {
  return (
    <div
      style={{ borderTop: `1px solid ${T.borderSubtle}`, margin: "2px 0" }}
    />
  );
}

function SectionHeader({
  icon,
  label,
  count,
  badgeColor,
  theme: T,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  badgeColor: string;
  theme: ThemeTokens;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px 6px",
      }}
    >
      <span
        style={{ color: badgeColor, display: "flex", alignItems: "center" }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.textDim,
          fontFamily: "monospace",
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          fontFamily: "monospace",
          color: badgeColor,
          background: `${badgeColor}18`,
          border: `1px solid ${badgeColor}30`,
          borderRadius: 4,
          padding: "1px 5px",
          lineHeight: 1.4,
        }}
      >
        {count}
      </span>
    </div>
  );
}

/* ─────────────────────── main component ────────────── */
export default function InfraControlPanel({
  onSelectLambda,
  onReset,
  log,
}: InfraControlPanelProps) {
  const T = useTheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      {/* ── 1. Top header ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Server style={{ width: 13, height: 13, color: T.accent }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.textDim,
              fontFamily: "monospace",
            }}
          >
            Lambda Functions
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            cursor: "pointer",
            color: T.textDim,
          }}
        >
          <RotateCcw style={{ width: 9, height: 9 }} />
          <span
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            RESET
          </span>
        </motion.button>
      </div>

      {/* ── 2. Reference strip ────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
          padding: "0 10px 10px",
        }}
      >
        {/* API count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            padding: "5px 7px",
          }}
        >
          <Zap
            style={{ width: 9, height: 9, color: T.accent, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.accent,
              fontFamily: "monospace",
            }}
          >
            11
          </span>
          <span style={{ fontSize: 8, color: T.textDim }}>API</span>
        </div>
        {/* Jobs count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            padding: "5px 7px",
          }}
        >
          <Clock
            style={{ width: 9, height: 9, color: T.amber, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.amber,
              fontFamily: "monospace",
            }}
          >
            4
          </span>
          <span style={{ fontSize: 8, color: T.textDim }}>Jobs</span>
        </div>
        {/* Services count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            padding: "5px 7px",
          }}
        >
          <Globe
            style={{ width: 9, height: 9, color: T.blue, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.blue,
              fontFamily: "monospace",
            }}
          >
            5
          </span>
          <span style={{ fontSize: 8, color: T.textDim }}>Svcs</span>
        </div>
      </div>

      <Divider theme={T} />

      {/* ── 4. API Lambdas ────────────────────────────── */}
      <SectionHeader
        icon={<Zap style={{ width: 11, height: 11 }} />}
        label="API Lambdas"
        count={ALL_API_LAMBDAS.length}
        badgeColor={T.accent}
        theme={T}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {ALL_API_LAMBDAS.map((l) => {
          const isHovered = hoveredId === l.id;
          const hoverBorder = l.snapStart ? `${T.green}40` : `${T.accent}33`;
          return (
            <motion.button
              key={l.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectLambda(l)}
              onMouseEnter={() => setHoveredId(l.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex",
                alignItems: "stretch",
                background: isHovered ? T.cardHover : T.card,
                border: `1px solid ${isHovered ? hoverBorder : T.border}`,
                borderRadius: 7,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                width: "100%",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {/* Left stripe */}
              <div
                style={{
                  width: 3,
                  flexShrink: 0,
                  background: l.snapStart ? T.green : T.textDim,
                }}
              />
              {/* Content */}
              <div style={{ flex: 1, padding: "6px 8px 5px", minWidth: 0 }}>
                {/* Row 1: name + memory */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.name}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: T.textDim,
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
                    {l.memory}MB
                  </span>
                </div>
                {/* Row 2: snapstart badge + routes */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {l.snapStart && (
                      <span
                        style={{
                          fontSize: 7,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: T.green,
                          background: `${T.green}26`,
                          border: `1px solid ${T.green}4d`,
                          borderRadius: 3,
                          padding: "1px 4px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        SNAP
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 8,
                      color: T.textDim,
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
                    {l.routes.length} route{l.routes.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {/* Chevron */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingRight: 6,
                }}
              >
                <ChevronRight
                  style={{ width: 10, height: 10, color: T.textDim }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      <Divider theme={T} />

      {/* ── 6. Scheduled Jobs ─────────────────────────── */}
      <SectionHeader
        icon={<Clock style={{ width: 11, height: 11 }} />}
        label="Scheduled Jobs"
        count={JOB_LAMBDAS.length}
        badgeColor={T.amber}
        theme={T}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {JOB_LAMBDAS.map((l) => {
          const isHovered = hoveredId === l.id;
          return (
            <motion.button
              key={l.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectLambda(l)}
              onMouseEnter={() => setHoveredId(l.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex",
                alignItems: "stretch",
                background: isHovered ? T.cardHover : T.card,
                border: `1px solid ${isHovered ? `${T.amber}40` : T.border}`,
                borderRadius: 7,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                width: "100%",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {/* Left stripe */}
              <div style={{ width: 3, flexShrink: 0, background: T.amber }} />
              {/* Content */}
              <div style={{ flex: 1, padding: "6px 8px 5px", minWidth: 0 }}>
                {/* Row 1: name + schedule */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l.name}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      color: T.amber,
                      flexShrink: 0,
                    }}
                  >
                    {l.routes[0]}
                  </span>
                </div>
                {/* Row 2: description */}
                <div style={{ marginTop: 2 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textDim,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {l.description}
                  </span>
                </div>
              </div>
              {/* Chevron */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingRight: 6,
                }}
              >
                <ChevronRight
                  style={{ width: 10, height: 10, color: T.textDim }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      <Divider theme={T} />

      {/* ── 8. External Services ──────────────────────── */}
      <SectionHeader
        icon={<Globe style={{ width: 11, height: 11 }} />}
        label="External Services"
        count={EXTERNAL_SERVICES.length}
        badgeColor={T.blue}
        theme={T}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {EXTERNAL_SERVICES.map((s) => {
          const meta = SERVICE_META[s.id] ?? { color: T.textDim, icon: null };
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "stretch",
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                overflow: "hidden",
              }}
            >
              {/* Left stripe */}
              <div
                style={{ width: 3, flexShrink: 0, background: meta.color }}
              />
              {/* Icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 7px",
                  color: meta.color,
                }}
              >
                {meta.icon}
              </div>
              {/* Content */}
              <div style={{ flex: 1, padding: "6px 4px 5px", minWidth: 0 }}>
                {/* Row 1: name + envVar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: 7,
                      fontFamily: "monospace",
                      color: T.textDim,
                      flexShrink: 0,
                      opacity: 0.7,
                    }}
                  >
                    {s.envVar}
                  </span>
                </div>
                {/* Row 2: description */}
                <div style={{ marginTop: 2 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: T.textDim,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {s.description}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Divider theme={T} />

      {/* ── 10. Event log ─────────────────────────────── */}
      <div
        style={{
          padding: "8px 12px 4px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <History style={{ width: 11, height: 11, color: T.textDim }} />
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.textDim,
            fontFamily: "monospace",
          }}
        >
          Access Log
        </span>
      </div>

      <div
        style={{
          padding: "0 8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: 52,
        }}
      >
        {log.length === 0 && (
          <p
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              fontStyle: "italic",
              color: T.textDim,
              opacity: 0.55,
              padding: "6px 4px",
              margin: 0,
            }}
          >
            Click a Lambda to view its details...
          </p>
        )}

        <AnimatePresence initial={false}>
          {log.slice(0, 20).map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 10, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 7,
                padding: "6px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: 7.5,
                  fontFamily: "monospace",
                  color: T.textDim,
                }}
              >
                {formatTime(entry.timestamp)}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: T.accent,
                  letterSpacing: "0.06em",
                }}
              >
                {entry.event}
              </span>
              <span style={{ fontSize: 9, color: T.textMuted }}>
                {entry.detail}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
