"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PricingScenario, PricingLogEntry } from "@/types/pricing";
import { PRICING_SCENARIOS } from "@/app/modules/pricing/scenarios";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import {
  RotateCcw,
  History,
  Calculator,
  Clock,
  Car,
  Zap,
  ChevronRight,
  Timer,
} from "lucide-react";

interface PricingControlPanelProps {
  onRunScenario: (scenario: PricingScenario) => void;
  onReset: () => void;
  log: PricingLogEntry[];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function padHour(h: number): string {
  return String(h).padStart(2, "0");
}

function fareAccentColor(fare: number, T: ThemeTokens): string {
  if (fare === 0) return T.green;
  if (fare <= 5) return T.accent;
  if (fare <= 10) return T.amber;
  return T.red;
}

/* ── SectionHeader ───────────────────────────────────────────────────── */

function SectionHeader({
  icon,
  label,
  action,
  T,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px 6px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: T.textMuted, display: "flex" }}>{icon}</span>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: T.textMuted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      {action}
    </div>
  );
}

/* ── ResetButton ─────────────────────────────────────────────────────── */

function ResetButton({ onClick, T }: { onClick: () => void; T: ThemeTokens }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 7,
        background: T.card,
        border: `1px solid ${T.border}`,
        cursor: "pointer",
        color: T.textMuted,
      }}
    >
      <RotateCcw style={{ width: 11, height: 11 }} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Reset
      </span>
    </motion.button>
  );
}

/* ── MetaChip ────────────────────────────────────────────────────────── */

function MetaChip({
  icon,
  label,
  accent,
  T,
}: {
  icon?: React.ReactNode;
  label: string;
  accent?: boolean;
  T: ThemeTokens;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "1.5px 6px",
        borderRadius: 4,
        background: accent ? T.accentBg : T.card,
        border: accent
          ? `1px solid ${T.borderActive}`
          : `1px solid ${T.borderSubtle}`,
        fontSize: 7.5,
        fontFamily: "monospace",
        fontWeight: accent ? 700 : 600,
        color: accent ? T.accent : T.textMuted,
        letterSpacing: accent ? "0.04em" : undefined,
      }}
    >
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {label}
    </span>
  );
}

/* ── Divider ─────────────────────────────────────────────────────────── */

function Divider({ T }: { T: ThemeTokens }) {
  return (
    <div
      style={{
        height: 1,
        background: T.borderSubtle,
        margin: "0 14px 8px",
      }}
    />
  );
}

/* ── Algorithm Strip ─────────────────────────────────────────────────── */

const ALGO_STEPS = [
  {
    key: "grace",
    icon: <Timer style={{ width: 12, height: 12 }} />,
    label: "Grace Check",
    sub: "≤ Xm → free",
    colorKey: "green" as const,
  },
  {
    key: "ceil",
    icon: <Zap style={{ width: 12, height: 12 }} />,
    label: "Ceiling Hrs",
    sub: "Math.ceil()",
    colorKey: "accent" as const,
  },
  {
    key: "bracket",
    icon: <Calculator style={{ width: 12, height: 12 }} />,
    label: "Rate Lookup",
    sub: "narrow/wide",
    colorKey: "blue" as const,
  },
];

function AlgorithmStrip({ T }: { T: ThemeTokens }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "8px 14px 10px",
      }}
    >
      {ALGO_STEPS.map((step, i) => {
        const color = T[step.colorKey];
        return (
          <div
            key={step.key}
            style={{ display: "flex", alignItems: "center", flex: 1, gap: 5 }}
          >
            <div
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 9,
                background: `${color}0D`,
                border: `1px solid ${color}28`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  color,
                  marginBottom: 3,
                }}
              >
                {step.icon}
              </div>
              <div
                style={{
                  fontSize: 8.5,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color,
                  letterSpacing: "0.04em",
                  lineHeight: 1.2,
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontSize: 7,
                  fontFamily: "monospace",
                  color,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                {step.sub}
              </div>
            </div>
            {i < ALGO_STEPS.length - 1 && (
              <span
                style={{
                  fontSize: 9,
                  color: T.textDim,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Scenario Card ───────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onRun,
  T,
}: {
  scenario: PricingScenario;
  onRun: () => void;
  T: ThemeTokens;
}) {
  const color = fareAccentColor(scenario.expectedFare, T);
  const fareLabel =
    scenario.expectedFare === 0 ? "FREE" : `${scenario.expectedFare} MAD`;
  const { input } = scenario;
  const timeRange = `${padHour(input.entryHour)}:${String(input.entryMinute).padStart(2, "0")} → ${padHour(input.exitHour)}:${String(input.exitMinute).padStart(2, "0")}`;

  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.15 }}
      onClick={onRun}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        borderRadius: 10,
        overflow: "hidden",
        background: T.card,
        border: `1px solid ${T.border}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}40`;
        (e.currentTarget as HTMLButtonElement).style.background = T.cardHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
        (e.currentTarget as HTMLButtonElement).style.background = T.card;
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: `${color}55`,
          transition: "background 0.2s",
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: "9px 11px", minWidth: 0 }}>
        {/* Top row: name + fare badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: T.text,
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {scenario.name}
          </span>
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 6,
              background: `${color}18`,
              border: `1px solid ${color}35`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                color,
                letterSpacing: "0.03em",
              }}
            >
              {fareLabel}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 9.5,
            color: T.textMuted,
            lineHeight: 1.45,
            margin: "0 0 5px",
          }}
        >
          {scenario.description}
        </p>

        {/* Meta chips */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <MetaChip
            icon={<Clock style={{ width: 9, height: 9 }} />}
            label={timeRange}
            T={T}
          />
          <MetaChip
            icon={<Timer style={{ width: 9, height: 9 }} />}
            label={`Grace ${input.gracePeriodMinutes}m`}
            T={T}
          />
          <MetaChip
            icon={<Car style={{ width: 9, height: 9 }} />}
            label={input.vehicleType}
            T={T}
          />
        </div>
      </div>

      {/* Right arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingRight: 8,
          color: T.textDim,
        }}
      >
        <ChevronRight style={{ width: 14, height: 14 }} />
      </div>
    </motion.button>
  );
}

/* ── Log Entry ───────────────────────────────────────────────────────── */

function LogEntry({ entry, T }: { entry: PricingLogEntry; T: ThemeTokens }) {
  const isPass = entry.event.includes("PASS");
  const isFail = entry.event.includes("FAIL");
  const isResult = entry.event === "RESULT";

  const eventColor = isPass
    ? T.green
    : isFail
      ? T.red
      : isResult
        ? T.accent
        : T.textMuted;

  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 7,
        background: T.card,
        border: `1px solid ${T.borderSubtle}`,
        display: "flex",
        gap: 8,
        alignItems: "baseline",
      }}
    >
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
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          fontWeight: 700,
          color: eventColor,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {entry.event}
      </span>
      <span
        style={{
          fontSize: 9,
          color: T.textMuted,
          lineHeight: 1.35,
          minWidth: 0,
        }}
      >
        {entry.detail}
      </span>
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────────────── */

export default function PricingControlPanel({
  onRunScenario,
  onReset,
  log,
}: PricingControlPanelProps) {
  const T = useTheme();
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ScrollArea className="flex-1">
        {/* ── Scenarios header ── */}
        <SectionHeader
          icon={<Calculator style={{ width: 14, height: 14 }} />}
          label="Test Scenarios"
          action={<ResetButton onClick={onReset} T={T} />}
          T={T}
        />

        {/* ── Algorithm strip label ── */}
        <div style={{ padding: "0 14px 2px" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 7.5,
              color: T.textDim,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Algorithm Reference
          </span>
        </div>
        <AlgorithmStrip T={T} />

        {/* ── Divider ── */}
        <Divider T={T} />

        {/* ── Scenario cards ── */}
        <div
          style={{
            padding: "0 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {PRICING_SCENARIOS.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              onRun={() => onRunScenario(s)}
              T={T}
            />
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              borderTop: `1px solid ${T.borderSubtle}`,
            }}
          />
        </div>

        {/* ── Event log ── */}
        <SectionHeader
          icon={<History style={{ width: 14, height: 14 }} />}
          label="Event Log"
          T={T}
        />

        <div
          style={{
            padding: "0 10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {log.length === 0 && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 9.5,
                color: T.textDim,
                fontStyle: "italic",
                padding: "8px 4px",
              }}
            >
              Run a pricing test to see results...
            </p>
          )}
          <AnimatePresence initial={false}>
            {log.slice(0, 20).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <LogEntry entry={entry} T={T} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
