"use client";

import { motion, AnimatePresence } from "framer-motion";
import type {
  CancellationScenario,
  CancelLogEntry,
  RefundTier,
} from "@/types/cancellation";
import { CANCELLATION_SCENARIOS } from "@/app/modules/cancellation/scenarios";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import {
  RotateCcw,
  History,
  Ban,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  Wallet,
} from "lucide-react";

interface CancellationControlPanelProps {
  onRunScenario: (scenario: CancellationScenario) => void;
  onReset: () => void;
  log: CancelLogEntry[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Tier colours ────────────────────────────────────────────────────── */

function getTierColor(tier: RefundTier, T: ThemeTokens): string {
  const map: Record<RefundTier, string> = {
    FULL: T.green,
    PARTIAL: T.amber,
    NONE: T.red,
    CANNOT_CANCEL: T.textDim,
  };
  return map[tier];
}

const TIER_ICON: Record<RefundTier, React.ReactNode> = {
  FULL: <CheckCircle2 className="size-3.5" />,
  PARTIAL: <AlertTriangle className="size-3.5" />,
  NONE: <XCircle className="size-3.5" />,
  CANNOT_CANCEL: <Ban className="size-3.5" />,
};

const TIER_LABEL: Record<RefundTier, string> = {
  FULL: "Full Refund",
  PARTIAL: "50% Refund",
  NONE: "No Refund",
  CANNOT_CANCEL: "Cannot Cancel",
};

/* ── Policy reference strip ──────────────────────────────────────────── */

const POLICY_WINDOWS = [
  { label: "> 24h", tier: "FULL" as RefundTier, desc: "100% back" },
  { label: "1 – 24h", tier: "PARTIAL" as RefundTier, desc: "50% back" },
  { label: "< 1h", tier: "NONE" as RefundTier, desc: "0% back" },
];

function PolicyStrip({ T }: { T: ThemeTokens }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 14px 10px",
      }}
    >
      {POLICY_WINDOWS.map((w) => {
        const color = getTierColor(w.tier, T);
        return (
          <div
            key={w.label}
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
                fontSize: 9,
                fontFamily: "monospace",
                fontWeight: 700,
                color,
                letterSpacing: "0.05em",
              }}
            >
              {w.label}
            </div>
            <div
              style={{
                fontSize: 7.5,
                fontFamily: "monospace",
                color,
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              {w.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Scenario card ───────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onRun,
  T,
}: {
  scenario: CancellationScenario;
  onRun: () => void;
  T: ThemeTokens;
}) {
  const tier = scenario.expected.tier;
  const color = getTierColor(tier, T);

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
        {/* Top row: name + badge */}
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
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 6,
              background: `${color}18`,
              border: `1px solid ${color}35`,
              flexShrink: 0,
            }}
          >
            <span style={{ color, display: "flex" }}>{TIER_ICON[tier]}</span>
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                color,
                letterSpacing: "0.03em",
              }}
            >
              {TIER_LABEL[tier]}
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
            icon={<Clock className="size-2.5" />}
            label={`${scenario.input.hoursUntilStart}h before`}
            T={T}
          />
          <MetaChip
            icon={<Wallet className="size-2.5" />}
            label={`${scenario.input.bookingAmount} MAD`}
            T={T}
          />
          <MetaChip label={scenario.input.bookingStatus} mono T={T} />
          {scenario.input.isGateSession && (
            <MetaChip label="GATE" accent T={T} />
          )}
          {scenario.input.isExtended && (
            <MetaChip label="EXTENDED" accent T={T} />
          )}
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
        <ChevronRight className="size-3.5" />
      </div>
    </motion.button>
  );
}

function MetaChip({
  icon,
  label,
  mono,
  accent,
  T,
}: {
  icon?: React.ReactNode;
  label: string;
  mono?: boolean;
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
        fontFamily: mono || accent ? "monospace" : undefined,
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

/* ── Log entry ───────────────────────────────────────────────────────── */

function LogEntry({ entry, T }: { entry: CancelLogEntry; T: ThemeTokens }) {
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

/* ── Main panel ──────────────────────────────────────────────────────── */

export default function CancellationControlPanel({
  onRunScenario,
  onReset,
  log,
}: CancellationControlPanelProps) {
  const T = useTheme();
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ScrollArea className="flex-1">
        {/* ── Scenarios header ── */}
        <SectionHeader
          icon={<Ban className="size-3.5" />}
          label="Test Scenarios"
          action={<ResetButton onClick={onReset} T={T} />}
          T={T}
        />

        {/* ── Policy quick reference ── */}
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
            Policy Reference
          </span>
        </div>
        <PolicyStrip T={T} />

        {/* ── Scenario divider ── */}
        <div
          style={{
            height: 1,
            background: T.borderSubtle,
            margin: "0 14px 8px",
          }}
        />

        {/* ── Scenario cards ── */}
        <div
          style={{
            padding: "0 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {CANCELLATION_SCENARIOS.map((s) => (
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
            icon={<History className="size-3.5" />}
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
                Run a cancellation test to see results...
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
