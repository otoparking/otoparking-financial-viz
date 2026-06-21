"use client";

import { motion, AnimatePresence } from "framer-motion";
import type {
  SettlementScenario,
  SettlementLogEntry,
  SettlementStatus,
} from "@/types/settlement";
import { SETTLEMENT_SCENARIOS } from "@/app/modules/settlement/scenarios";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import {
  RotateCcw,
  History,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Banknote,
  TrendingDown,
} from "lucide-react";

interface SettlementControlPanelProps {
  onRunScenario: (scenario: SettlementScenario) => void;
  onReset: () => void;
  log: SettlementLogEntry[];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Status config ───────────────────────────────────────────────────── */

function getStatusColor(status: SettlementStatus, T: ThemeTokens): string {
  const map: Record<SettlementStatus, string> = {
    PAID: T.green,
    PAYOUT_FAILED: T.red,
    CARRY_FORWARD: T.purple,
    PENDING: T.escrow,
    APPROVED: T.blue,
    PAYOUT_INITIATED: T.amber,
  };
  return map[status];
}

const STATUS_ICON: Record<SettlementStatus, React.ReactNode> = {
  PAID: <BadgeCheck style={{ width: 11, height: 11 }} />,
  PAYOUT_FAILED: <AlertTriangle style={{ width: 11, height: 11 }} />,
  CARRY_FORWARD: <RotateCcw style={{ width: 11, height: 11 }} />,
  PENDING: <Clock style={{ width: 11, height: 11 }} />,
  APPROVED: <CheckCircle2 style={{ width: 11, height: 11 }} />,
  PAYOUT_INITIATED: <ArrowRight style={{ width: 11, height: 11 }} />,
};

const STATUS_LABEL: Record<SettlementStatus, string> = {
  PAID: "Paid",
  PAYOUT_FAILED: "Failed",
  CARRY_FORWARD: "Carry Fwd",
  PENDING: "Pending",
  APPROVED: "Approved",
  PAYOUT_INITIATED: "Initiated",
};

/* ── Formula reference strip ─────────────────────────────────────────── */

function FormulaStrip({ T }: { T: ThemeTokens }) {
  const cells = [
    { symbol: "B", label: "Lot Rev", example: "5 000", color: T.accent },
    { symbol: "−C", label: "Cash Owed", example: "300", color: T.amber },
    { symbol: "= Net", label: "Wire Out", example: "4 700", color: T.green },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        padding: "6px 14px 10px",
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.symbol}
          style={{
            flex: 1,
            padding: "7px 8px 6px",
            borderRadius: 9,
            background: `${cell.color}0D`,
            border: `1px solid ${cell.color}28`,
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 800,
              color: cell.color,
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            {cell.symbol}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 7,
              color: cell.color,
              opacity: 0.55,
              marginTop: 3,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {cell.label}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: cell.color,
              opacity: 0.7,
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {cell.example}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Meta chip ───────────────────────────────────────────────────────── */

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
        whiteSpace: "nowrap",
      }}
    >
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {label}
    </span>
  );
}

/* ── Scenario card ───────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onRun,
  T,
}: {
  scenario: SettlementScenario;
  onRun: () => void;
  T: ThemeTokens;
}) {
  const status = scenario.expected.status;
  const color = getStatusColor(status, T);

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
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: "9px 10px", minWidth: 0 }}>
        {/* Top row: name + status badge */}
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

          {/* Status badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 6px",
              borderRadius: 6,
              background: `${color}18`,
              border: `1px solid ${color}35`,
              flexShrink: 0,
            }}
          >
            <span style={{ color, display: "flex" }}>
              {STATUS_ICON[status]}
            </span>
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                color,
                letterSpacing: "0.03em",
              }}
            >
              {STATUS_LABEL[status]}
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
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <MetaChip
            icon={<Clock style={{ width: 9, height: 9 }} />}
            label={scenario.input.month}
            T={T}
          />
          <MetaChip
            icon={<Banknote style={{ width: 9, height: 9 }} />}
            label={`B=${scenario.input.lotRevenueBalance}`}
            T={T}
          />
          <MetaChip
            icon={<TrendingDown style={{ width: 9, height: 9 }} />}
            label={`C=${scenario.input.cashCommissionTracker}`}
            T={T}
          />
          <MetaChip label={scenario.prdRef} accent T={T} />
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

/* ── Log entry ───────────────────────────────────────────────────────── */

function LogEntry({ entry, T }: { entry: SettlementLogEntry; T: ThemeTokens }) {
  const isPass = entry.event.includes("PASS");
  const isMismatch =
    entry.event.includes("MISMATCH") || entry.event.includes("FAIL");
  const isResult = entry.event === "RESULT";

  const eventColor = isPass
    ? T.green
    : isMismatch
      ? T.red
      : isResult
        ? T.accent
        : T.textMuted;

  return (
    <div
      style={{
        padding: "5px 10px",
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

/* ── Section header ──────────────────────────────────────────────────── */

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

/* ── Reset button ────────────────────────────────────────────────────── */

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

/* ── Divider ─────────────────────────────────────────────────────────── */

function Divider({
  spacing = "0 14px 8px",
  T,
}: {
  spacing?: string;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        height: 1,
        background: T.borderSubtle,
        margin: spacing,
      }}
    />
  );
}

/* ── Main panel ──────────────────────────────────────────────────────── */

export default function SettlementControlPanel({
  onRunScenario,
  onReset,
  log,
}: SettlementControlPanelProps) {
  const T = useTheme();
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ScrollArea className="flex-1">
        {/* ── Header ── */}
        <SectionHeader
          icon={<Landmark style={{ width: 14, height: 14 }} />}
          label="Month-End Settlement"
          action={<ResetButton onClick={onReset} T={T} />}
          T={T}
        />

        {/* ── Formula reference sub-label ── */}
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
            Settlement Formula
          </span>
        </div>

        {/* ── Formula strip ── */}
        <FormulaStrip T={T} />

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
          {SETTLEMENT_SCENARIOS.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              onRun={() => onRunScenario(s)}
              T={T}
            />
          ))}
        </div>

        {/* ── Event log ── */}
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${T.borderSubtle}`,
          }}
        >
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
            {log.length === 0 ? (
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  color: T.textDim,
                  fontStyle: "italic",
                  padding: "8px 4px",
                }}
              >
                Run a settlement scenario to see results…
              </p>
            ) : null}

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
        </div>
      </ScrollArea>
    </div>
  );
}
