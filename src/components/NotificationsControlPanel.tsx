"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import type {
  NotifLogEntry,
  NotificationScenario,
  NotificationChannel,
} from "@/types/notifications";
import { NOTIFICATION_SCENARIOS } from "@/app/modules/notifications/workflows";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RotateCcw,
  History,
  Bell,
  Smartphone,
  Mail,
  MessageSquare,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ── Props ───────────────────────────────────────────────────────────── */

interface NotificationsControlPanelProps {
  onRunScenario: (scenario: NotificationScenario) => void;
  onReset: () => void;
  log: NotifLogEntry[];
  running: boolean;
}

/* ── Channel config ──────────────────────────────────────────────────── */

const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  push: "#378ADD",
  email: "#BA7517",
  sms: "#F59E0B",
  whatsapp: "#1D9E75",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  push: "Push",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  push: <Smartphone style={{ width: 10, height: 10 }} />,
  email: <Mail style={{ width: 10, height: 10 }} />,
  sms: <MessageSquare style={{ width: 10, height: 10 }} />,
  whatsapp: <MessageCircle style={{ width: 10, height: 10 }} />,
};

/* ── Categories + helpers ────────────────────────────────────────────── */

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "gate", label: "Gate" },
  { value: "transfer", label: "Transfer" },
  { value: "booking", label: "Booking" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function categorize(s: NotificationScenario): string {
  if (s.id.startsWith("gate")) return "gate";
  if (s.id.startsWith("transfer")) return "transfer";
  return "booking";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Channel Summary Strip ───────────────────────────────────────────── */

function ChannelSummaryStrip() {
  const T = useTheme();
  const channels: NotificationChannel[] = ["push", "email", "sms", "whatsapp"];
  return (
    <div style={{ padding: "10px 16px 4px" }}>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 7,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 6,
        }}
      >
        Channels
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {channels.map((ch) => {
          const color = CHANNEL_COLORS[ch];
          return (
            <div
              key={ch}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span style={{ color }}>{CHANNEL_ICONS[ch]}</span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  fontWeight: 700,
                  color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {CHANNEL_LABELS[ch]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Divider ─────────────────────────────────────────────────────────── */

function Divider() {
  const T = useTheme();
  return (
    <div
      style={{
        height: 1,
        background: T.borderSubtle,
        margin: "8px 14px 8px",
      }}
    />
  );
}

/* ── Category filter ─────────────────────────────────────────────────── */

function CategoryFilter({
  activeCat,
  setActiveCat,
}: {
  activeCat: Category;
  setActiveCat: (c: Category) => void;
}) {
  const T = useTheme();
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        padding: "2px 14px 8px",
        flexWrap: "wrap",
      }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = activeCat === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => setActiveCat(cat.value)}
            style={{
              padding: "3px 9px",
              borderRadius: 6,
              background: isActive ? `${T.accent}12` : "transparent",
              border: `1px solid ${isActive ? `${T.accent}35` : T.border}`,
              cursor: "pointer",
              fontSize: 8,
              fontFamily: "monospace",
              fontWeight: 700,
              color: isActive ? T.accent : T.textMuted,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Scenario card ───────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onRun,
  running,
}: {
  scenario: NotificationScenario;
  onRun: () => void;
  running: boolean;
}) {
  const T = useTheme();
  const [hovered, setHovered] = useState(false);

  const channels = scenario.workflowId.split("-") as NotificationChannel[];
  const primaryColor = CHANNEL_COLORS[channels[0]] ?? T.accent;

  return (
    <motion.button
      onClick={onRun}
      disabled={running}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={false}
      animate={{ scale: hovered && !running ? 1.005 : 1 }}
      transition={{ duration: 0.12 }}
      style={{
        width: "100%",
        display: "block",
        borderRadius: 10,
        background: hovered && !running ? T.cardHover : T.card,
        border: `1px solid ${hovered && !running ? `${primaryColor}50` : T.border}`,
        cursor: running ? "not-allowed" : "pointer",
        textAlign: "left",
        opacity: running ? 0.45 : 1,
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        boxShadow:
          hovered && !running
            ? "0 2px 12px rgba(0,0,0,0.06)"
            : "0 1px 3px rgba(0,0,0,0.03)",
        padding: "10px 14px",
      }}
    >
      {/* Top row: name + channel pills */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 6,
          marginBottom: 5,
        }}
      >
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
          {scenario.name}
        </span>

        {/* Channel label pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
          }}
        >
          {channels.slice(0, 4).map((ch) => {
            const color = CHANNEL_COLORS[ch] ?? T.accent;
            return (
              <span
                key={ch}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  fontSize: 7,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {CHANNEL_LABELS[ch]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 9,
          color: T.textMuted,
          lineHeight: 1.4,
          margin: "0 0 6px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {scenario.description}
      </p>

      {/* Bottom row: sourceClass + chevron */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 7,
            color: T.textDim,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "85%",
          }}
        >
          {scenario.sourceClass}
        </span>
        <ChevronRight
          style={{
            width: 10,
            height: 10,
            color: T.textDim,
            flexShrink: 0,
          }}
        />
      </div>
    </motion.button>
  );
}

/* ── Log entry ───────────────────────────────────────────────────────── */

function LogEntry({
  entry,
  isLast,
}: {
  entry: NotifLogEntry;
  isLast: boolean;
}) {
  const T = useTheme();

  const isSuccess = entry.success;
  const event = entry.event.toUpperCase();

  const eventColor = (() => {
    if (event === "TRIGGER") return T.accent;
    if (event === "DELIVERED") return T.green;
    if (event === "DONE") return T.blue;
    if (event.includes("PUSHCASTER") || event.includes("SENDER")) {
      return isSuccess ? T.blue : T.red;
    }
    if (!isSuccess) return T.red;
    return T.textMuted;
  })();

  const chColor = (() => {
    const ch = entry.channel.toLowerCase() as NotificationChannel;
    return CHANNEL_COLORS[ch] ?? T.accent;
  })();

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "5px 14px",
        borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      }}
    >
      {/* Colored dot */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: chColor,
          flexShrink: 0,
        }}
      />

      {/* Timestamp */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 7.5,
          color: T.textDim,
          flexShrink: 0,
          width: 50,
        }}
      >
        {formatTime(entry.timestamp)}
      </span>

      {/* Event label — colored text only, no pill */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          fontWeight: 700,
          color: eventColor,
          flexShrink: 0,
          letterSpacing: "0.03em",
          minWidth: 52,
        }}
      >
        {event}
      </span>

      {/* Detail */}
      <span
        style={{
          fontSize: 9,
          color: T.textMuted,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          lineHeight: 1.3,
        }}
      >
        {entry.detail}
      </span>

      {/* Success / fail icon */}
      {isSuccess ? (
        <CheckCircle2
          style={{ width: 9, height: 9, color: T.green, flexShrink: 0 }}
        />
      ) : (
        <XCircle style={{ width: 9, height: 9, color: T.red, flexShrink: 0 }} />
      )}
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function NotificationsControlPanel({
  onRunScenario,
  onReset,
  log,
  running,
}: NotificationsControlPanelProps) {
  const T = useTheme();
  const [activeCat, setActiveCat] = useState<Category>("all");

  const filtered =
    activeCat === "all"
      ? NOTIFICATION_SCENARIOS
      : NOTIFICATION_SCENARIOS.filter((s) => categorize(s) === activeCat);

  const visibleLog = log.slice(-30);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* ── Fixed header bar ── */}
      <div
        style={{
          height: 40,
          background: T.header,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          flexShrink: 0,
          borderBottom: `1px solid ${T.borderSubtle}`,
        }}
      >
        {/* Left: icon + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bell style={{ width: 12, height: 12, color: T.textDim }} />
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
            Notifications
          </span>
        </div>

        {/* Right: Reset button */}
        <motion.button
          onClick={onReset}
          disabled={running}
          whileTap={!running ? { scale: 0.94 } : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 9px",
            borderRadius: 7,
            background: T.card,
            border: `1px solid ${T.border}`,
            cursor: running ? "not-allowed" : "pointer",
            color: T.textMuted,
            opacity: running ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <RotateCcw style={{ width: 9, height: 9 }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Reset
          </span>
        </motion.button>
      </div>

      {/* ── Scrollable content ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div style={{ padding: "0 0 16px" }}>
          {/* Channel summary strip */}
          <ChannelSummaryStrip />

          <Divider />

          {/* Category filter */}
          <CategoryFilter activeCat={activeCat} setActiveCat={setActiveCat} />

          {/* Scenario cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "0 10px",
            }}
          >
            <AnimatePresence initial={false}>
              {filtered.map((scenario) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <ScenarioCard
                    scenario={scenario}
                    onRun={() => onRunScenario(scenario)}
                    running={running}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Delivery Log ── */}
          <div style={{ marginTop: 14 }}>
            {/* Log header */}
            <div
              style={{
                borderTop: `1px solid ${T.borderSubtle}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px 6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <History style={{ width: 12, height: 12, color: T.textDim }} />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    color: T.textMuted,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Delivery Log
                </span>
              </div>

              {log.length > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 20,
                    height: 16,
                    padding: "0 5px",
                    borderRadius: 8,
                    background: T.cardHover,
                    border: `1px solid ${T.borderSubtle}`,
                    fontFamily: "monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    color: T.textDim,
                  }}
                >
                  {log.length}
                </span>
              )}
            </div>

            {/* Empty state */}
            {log.length === 0 && (
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  color: T.textDim,
                  fontStyle: "italic",
                  padding: "8px 4px 14px 18px",
                  margin: 0,
                }}
              >
                Run a scenario to see delivery events
              </p>
            )}

            {/* Log entries */}
            <AnimatePresence initial={false}>
              {visibleLog.map((entry, i) => (
                <LogEntry
                  key={entry.id}
                  entry={entry}
                  isLast={i === visibleLog.length - 1}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
