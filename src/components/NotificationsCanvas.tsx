"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import type {
  NotificationChannel,
  ChannelAnimData,
  NotificationPayload,
} from "@/types/notifications";
import {
  Smartphone,
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  CheckCircle2,
  Bell,
  ArrowRight,
} from "lucide-react";

/* ── Props ───────────────────────────────────────────────────────────── */

interface NotificationsCanvasProps {
  activeChannels: NotificationChannel[];
  activePayload: NotificationPayload | null;
  animations: ChannelAnimData[];
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

const CHANNEL_SUBLABELS: Record<NotificationChannel, string> = {
  push: "Mobile App",
  email: "Inbox",
  sms: "SMS Gateway",
  whatsapp: "WhatsApp API",
};

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  push: <Smartphone />,
  email: <Mail />,
  sms: <MessageSquare />,
  whatsapp: <MessageCircle />,
};

const ALL_CHANNELS: NotificationChannel[] = [
  "push",
  "email",
  "sms",
  "whatsapp",
];

/* ── Diagram geometry (coordinate space 560 × 390) ──────────────────── */

const CX = 280;
const CY = 190;
const HUB_R = 48;

const SATELLITE: Record<NotificationChannel, { x: number; y: number }> = {
  push: { x: 280, y: 48 },
  email: { x: 464, y: 190 },
  sms: { x: 96, y: 190 },
  whatsapp: { x: 280, y: 332 },
};

const SAT_W = 110;
const SAT_H = 76;

/* ── Utility: point on the hub circumference toward a satellite ──────── */

function hubEdgePoint(sat: { x: number; y: number }) {
  const dx = sat.x - CX;
  const dy = sat.y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return {
    x: CX + (dx / dist) * HUB_R,
    y: CY + (dy / dist) * HUB_R,
  };
}

/* ── Channel satellite node ──────────────────────────────────────────── */

function ChannelSatellite({
  channel,
  isActive,
  delivered,
  theme: T,
}: {
  channel: NotificationChannel;
  isActive: boolean;
  delivered: boolean;
  theme: ThemeTokens;
}) {
  const color = CHANNEL_COLORS[channel];
  const pos = SATELLITE[channel];

  return (
    <g>
      {/* Outer glow ring — pulses when active */}
      <AnimatePresence>
        {isActive && (
          <motion.rect
            key="glow-ring"
            x={pos.x - SAT_W / 2 - 4}
            y={pos.y - SAT_H / 2 - 4}
            width={SAT_W + 8}
            height={SAT_H + 8}
            rx={20}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 0.15, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Card background */}
      <motion.rect
        x={pos.x - SAT_W / 2}
        y={pos.y - SAT_H / 2}
        width={SAT_W}
        height={SAT_H}
        rx={13}
        fill={T.card}
        stroke={isActive ? color : T.border}
        strokeWidth={isActive ? 1.5 : 1}
        style={{
          filter: isActive ? `drop-shadow(0 0 14px ${color}44)` : "none",
          transition: "stroke 0.35s ease, filter 0.35s ease",
        }}
      />

      {/* Active tint overlay */}
      {isActive && (
        <rect
          x={pos.x - SAT_W / 2}
          y={pos.y - SAT_H / 2}
          width={SAT_W}
          height={SAT_H}
          rx={13}
          fill={`${color}18`}
        />
      )}

      {/* Top color bar (4px) */}
      <rect
        x={pos.x - SAT_W / 2 + 1}
        y={pos.y - SAT_H / 2 + 1}
        width={SAT_W - 2}
        height={4}
        rx={2.5}
        fill={isActive ? color : `${color}33`}
        style={{ transition: "fill 0.35s ease" }}
      />

      {/* Channel icon */}
      <foreignObject
        x={pos.x - 11}
        y={pos.y - SAT_H / 2 + 12}
        width={22}
        height={22}
      >
        <div
          style={{
            color: isActive ? color : T.textDim,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.35s ease",
          }}
        >
          <div style={{ width: 22, height: 22 }}>{CHANNEL_ICONS[channel]}</div>
        </div>
      </foreignObject>

      {/* Main label */}
      <text
        x={pos.x}
        y={pos.y + 8}
        textAnchor="middle"
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: 700,
          fill: isActive ? color : T.textMuted,
          transition: "fill 0.35s ease",
          letterSpacing: "0.05em",
        }}
      >
        {CHANNEL_LABELS[channel]}
      </text>

      {/* Sub-label */}
      <text
        x={pos.x}
        y={pos.y + 21}
        textAnchor="middle"
        style={{
          fontSize: 8,
          fontFamily: "monospace",
          fill: T.textDim,
          letterSpacing: "0.03em",
        }}
      >
        {CHANNEL_SUBLABELS[channel]}
      </text>

      {/* Delivered checkmark badge */}
      <AnimatePresence>
        {delivered && (
          <motion.g
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              transformOrigin: `${pos.x + SAT_W / 2 - 8}px ${
                pos.y - SAT_H / 2 + 8
              }px`,
            }}
          >
            <circle
              cx={pos.x + SAT_W / 2 - 8}
              cy={pos.y - SAT_H / 2 + 8}
              r={9}
              fill={T.green}
              style={{ filter: `drop-shadow(0 0 4px ${T.green}88)` }}
            />
            <foreignObject
              x={pos.x + SAT_W / 2 - 17}
              y={pos.y - SAT_H / 2 - 1}
              width={18}
              height={18}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <CheckCircle2
                  style={{ width: 11, height: 11, color: "#fff" }}
                />
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}

/* ── PushCaster hub ──────────────────────────────────────────────────── */

function PushCasterHub({
  running,
  theme: T,
}: {
  running: boolean;
  theme: ThemeTokens;
}) {
  const hubFill = T.isDark
    ? running
      ? "oklch(0.22 0.06 175 / 0.85)"
      : "oklch(0.18 0.04 180 / 0.75)"
    : running
      ? "oklch(0.90 0.04 175 / 0.90)"
      : "oklch(0.93 0.02 180 / 0.90)";

  const hubStroke = running
    ? T.accent
    : T.isDark
      ? "oklch(0.38 0.06 172 / 0.5)"
      : T.border;

  return (
    <g>
      {/* Expanding pulse rings when running */}
      <AnimatePresence>
        {running && (
          <>
            <motion.circle
              key="pulse-1"
              cx={CX}
              cy={CY}
              r={HUB_R + 14}
              fill="none"
              stroke={`${T.accent}4D`}
              strokeWidth={1.5}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            />
            <motion.circle
              key="pulse-2"
              cx={CX}
              cy={CY}
              r={HUB_R + 10}
              fill="none"
              stroke={`${T.accent}33`}
              strokeWidth={1}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.4,
              }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Hub circle */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={HUB_R}
        fill={hubFill}
        stroke={hubStroke}
        strokeWidth={running ? 2 : 1.5}
        style={{
          filter:
            running && T.isDark
              ? `drop-shadow(0 0 20px ${T.accent}55)`
              : running
                ? `drop-shadow(0 0 12px ${T.accent}44)`
                : "none",
          transition: "fill 0.4s ease, stroke 0.4s ease, filter 0.4s ease",
        }}
        animate={running ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={
          running ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : {}
        }
      />

      {/* Send icon */}
      <foreignObject x={CX - 10} y={CY - 22} width={20} height={20}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: running
              ? T.accent
              : T.isDark
                ? "oklch(0.65 0.06 172)"
                : T.textDim,
          }}
        >
          <Send style={{ width: 20, height: 20 }} />
        </div>
      </foreignObject>

      {/* "PUSHCASTER" label */}
      <text
        x={CX}
        y={CY + 16}
        textAnchor="middle"
        style={{
          fontSize: 8,
          fontFamily: "monospace",
          fontWeight: 700,
          fill: running
            ? T.accent
            : T.isDark
              ? "oklch(0.6 0.05 172)"
              : T.textMuted,
          letterSpacing: "0.06em",
        }}
      >
        PUSHCASTER
      </text>

      {/* Pulsing "DISPATCHING" sub-label */}
      <AnimatePresence>
        {running && (
          <motion.text
            key="dispatching"
            x={CX}
            y={CY + 28}
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              fontSize: 7,
              fontFamily: "monospace",
              fill: `${T.accent}99`,
              letterSpacing: "0.04em",
            }}
          >
            DISPATCHING
          </motion.text>
        )}
      </AnimatePresence>
    </g>
  );
}

/* ── Connection arm between hub and satellite ────────────────────────── */

function ConnectionArm({
  channel,
  isActive,
  theme: T,
}: {
  channel: NotificationChannel;
  isActive: boolean;
  theme: ThemeTokens;
}) {
  const color = CHANNEL_COLORS[channel];
  const sat = SATELLITE[channel];
  const edge = hubEdgePoint(sat);

  const dx = sat.x - CX;
  const dy = sat.y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const satEdge = {
    x: sat.x - (dx / dist) * (SAT_W / 2 + 2),
    y: sat.y - (dy / dist) * (SAT_H / 2 + 2),
  };

  const d = `M ${edge.x} ${edge.y} L ${satEdge.x} ${satEdge.y}`;

  return (
    <g>
      {/* Base line */}
      <path
        d={d}
        stroke={isActive ? color : T.border}
        strokeWidth={isActive ? 2.5 : 1.5}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: isActive ? `drop-shadow(0 0 5px ${color}88)` : "none",
          transition:
            "stroke 0.35s ease, stroke-width 0.35s ease, filter 0.35s ease",
        }}
      />

      {/* Flowing dash overlay when active */}
      {isActive && (
        <path
          d={d}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 8"
          style={{
            animation: "flowDash 0.7s linear infinite",
            opacity: 0.6,
          }}
        />
      )}
    </g>
  );
}

/* ── Delivery feed overlay (top-right of diagram) ────────────────────── */

function DeliveryFeed({
  activeChannels,
}: {
  activeChannels: NotificationChannel[];
  theme: ThemeTokens;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <AnimatePresence>
        {activeChannels.map((ch, i) => {
          const color = CHANNEL_COLORS[ch];
          return (
            <motion.div
              key={ch}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.12, duration: 0.28 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px 5px 8px",
                borderRadius: 8,
                background: `${color}14`,
                border: `1px solid ${color}35`,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Small channel icon */}
              <div
                style={{
                  color,
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 12, height: 12 }}>{CHANNEL_ICONS[ch]}</div>
              </div>

              {/* Pulsing dot */}
              <motion.div
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                  flexShrink: 0,
                }}
              />

              {/* Label */}
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {CHANNEL_LABELS[ch]}
              </span>

              {/* "SENT" suffix */}
              <span
                style={{
                  fontSize: 7.5,
                  fontFamily: "monospace",
                  color: `${color}99`,
                  letterSpacing: "0.04em",
                }}
              >
                SENT
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ── Payload preview panel ───────────────────────────────────────────── */

function PayloadPanel({
  payload,
  theme: T,
}: {
  payload: NotificationPayload;
  theme: ThemeTokens;
}) {
  return (
    <div
      style={{
        height: "100%",
        padding: "12px 20px 14px",
        background: T.card,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "monospace",
            fontWeight: 700,
            color: T.textMuted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Notification Payload
        </span>

        {/* Workflow badge */}
        <span
          style={{
            fontSize: 7.5,
            fontFamily: "monospace",
            fontWeight: 700,
            color: T.accent,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: `${T.accent}18`,
            border: `1px solid ${T.accent}40`,
            borderRadius: 5,
            padding: "2px 7px",
          }}
        >
          PushCaster
        </span>
      </div>

      {/* Field rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          flex: 1,
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Push subject */}
        {payload.pushSubject && (
          <PayloadRow
            label="PUSH"
            value={payload.pushSubject}
            color={CHANNEL_COLORS.push}
            theme={T}
          />
        )}

        {/* Push body (if different from subject) */}
        {payload.pushBody && payload.pushBody !== payload.pushSubject && (
          <div style={{ paddingLeft: 16 }}>
            <PayloadRow
              label=""
              value={payload.pushBody}
              color={CHANNEL_COLORS.push}
              theme={T}
              indent
            />
          </div>
        )}

        {/* Email subject */}
        {payload.emailSubject && (
          <PayloadRow
            label="EMAIL"
            value={payload.emailSubject}
            color={CHANNEL_COLORS.email}
            theme={T}
          />
        )}

        {/* SMS body */}
        {payload.smsBody && (
          <PayloadRow
            label="SMS"
            value={payload.smsBody}
            color={CHANNEL_COLORS.sms}
            theme={T}
          />
        )}

        {/* Route */}
        {payload.route && (
          <PayloadRow
            label="ROUTE"
            value={payload.route}
            color={T.accent}
            theme={T}
          />
        )}
      </div>

      {/* Footer */}
      {payload.emailBody && (
        <div
          style={{
            fontSize: 8,
            fontFamily: "monospace",
            color: `${T.green}BB`,
            letterSpacing: "0.04em",
            marginTop: 6,
            paddingTop: 6,
            borderTop: `1px solid ${T.borderSubtle}`,
          }}
        >
          ✓ Email template set
        </div>
      )}
    </div>
  );
}

function PayloadRow({
  label,
  value,
  color,
  theme: T,
  indent = false,
}: {
  label: string;
  value: string;
  color: string;
  theme: ThemeTokens;
  indent?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {/* Channel color pill label */}
      {label ? (
        <span
          style={{
            fontSize: 7,
            fontFamily: "monospace",
            fontWeight: 700,
            color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: 4,
            padding: "1.5px 5px",
            flexShrink: 0,
            minWidth: 36,
            textAlign: "center",
          }}
        >
          {label}
        </span>
      ) : (
        <span style={{ width: 36 + 2, flexShrink: 0 }} />
      )}

      {/* Arrow */}
      <ArrowRight
        style={{
          width: 9,
          height: 9,
          color: T.textDim,
          flexShrink: 0,
          opacity: indent ? 0 : 1,
        }}
      />

      {/* Value */}
      <span
        style={{
          fontSize: 9,
          fontFamily: "monospace",
          color: label === "ROUTE" ? T.accent : T.text,
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Empty payload panel ─────────────────────────────────────────────── */

function EmptyPayloadPanel({ theme: T }: { theme: ThemeTokens }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        background: T.card,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <Bell style={{ width: 20, height: 20, color: T.textDim }} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: T.textDim,
          letterSpacing: "0.04em",
        }}
      >
        Select a scenario to send a notification
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          color: T.textDim,
          letterSpacing: "0.03em",
          opacity: 0.65,
        }}
      >
        15 PushCaster workflows available
      </span>
    </div>
  );
}

/* ── Main canvas ─────────────────────────────────────────────────────── */

export default function NotificationsCanvas({
  activeChannels,
  activePayload,
  animations,
  running,
}: NotificationsCanvasProps) {
  const activeSet = new Set(activeChannels);
  const deliveredSet = new Set(activeChannels);
  const T = useTheme();
  const prevAnimLen = useRef(0);

  useEffect(() => {
    prevAnimLen.current = animations.length;
  }, [animations]);

  const dotFill = T.isDark ? `${T.accent}0E` : `${T.accent}14`;

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      {/* ── CSS for flowing dash animation ── */}
      <style>{`
        @keyframes flowDash {
          from { stroke-dashoffset: 14; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ── Zone 1: Header bar (44px) ── */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${T.border}`,
          background: T.header,
        }}
      >
        {/* Left: status square + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Animated status square */}
          <motion.div
            animate={
              running
                ? { opacity: [1, 0.5, 1], scale: [1, 1.15, 1] }
                : { opacity: 0.45, scale: 1 }
            }
            transition={
              running
                ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: running ? T.accent : T.textDim,
              boxShadow: running ? `0 0 10px 2px ${T.accent}70` : "none",
              transition: "background 0.3s, box-shadow 0.3s",
              flexShrink: 0,
            }}
          />

          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              color: T.textMuted,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Notification Dispatcher
          </span>
        </div>

        {/* Right: badge + channel count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Channel count when running */}
          <AnimatePresence>
            {running && activeChannels.length > 0 && (
              <motion.span
                key="ch-count"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: T.textDim,
                  letterSpacing: "0.05em",
                }}
              >
                {activeChannels.length} channel
                {activeChannels.length !== 1 ? "s" : ""}
              </motion.span>
            )}
          </AnimatePresence>

          {/* DELIVERING / IDLE badge */}
          <AnimatePresence mode="wait">
            {running ? (
              <motion.div
                key="running"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: `${T.accent}1A`,
                  border: `1px solid ${T.accent}4D`,
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: T.accent,
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: T.accent,
                    letterSpacing: "0.08em",
                  }}
                >
                  DELIVERING
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: T.textDim,
                  letterSpacing: "0.08em",
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid ${T.borderSubtle}`,
                }}
              >
                IDLE
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Zone 2: Diagram (flex-1) ── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* Dot-grid background SVG */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <pattern
              id="notif-dots"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill={dotFill} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#notif-dots)" />
        </svg>

        {/* Main diagram SVG */}
        <svg
          viewBox="0 0 560 390"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection arms (behind everything) */}
          {ALL_CHANNELS.map((ch) => (
            <ConnectionArm
              key={ch}
              channel={ch}
              isActive={activeSet.has(ch)}
              theme={T}
            />
          ))}

          {/* Signal pulses traveling from hub edge to satellite edge */}
          <AnimatePresence>
            {animations.map((anim) => {
              const ch = anim.toChannel as NotificationChannel;
              const sat = SATELLITE[ch];
              const edge = hubEdgePoint(sat);
              const dx = sat.x - CX;
              const dy = sat.y - CY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const satEdge = {
                x: sat.x - (dx / dist) * (SAT_W / 2 + 2),
                y: sat.y - (dy / dist) * (SAT_H / 2 + 2),
              };
              const color = CHANNEL_COLORS[ch];

              return (
                <g key={anim.id}>
                  {/* Trailing ghost dot */}
                  <motion.circle
                    r={3}
                    fill={color}
                    opacity={0.4}
                    style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}
                    initial={{ cx: edge.x, cy: edge.y, opacity: 0 }}
                    animate={{
                      cx: satEdge.x,
                      cy: satEdge.y,
                      opacity: [0, 0.4, 0.4, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.75,
                      ease: "easeInOut",
                      delay: 0.06,
                      opacity: { times: [0, 0.1, 0.8, 1] },
                    }}
                  />

                  {/* Main pulse dot */}
                  <motion.circle
                    r={6}
                    fill={color}
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                    initial={{
                      cx: edge.x,
                      cy: edge.y,
                      opacity: 0,
                      scale: 1,
                    }}
                    animate={{
                      cx: satEdge.x,
                      cy: satEdge.y,
                      opacity: [0, 1, 1, 0],
                      scale: [1, 1.3, 1, 0.5],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.75,
                      ease: "easeInOut",
                      opacity: { times: [0, 0.1, 0.8, 1] },
                    }}
                  />
                </g>
              );
            })}
          </AnimatePresence>

          {/* Channel satellites */}
          {ALL_CHANNELS.map((ch) => (
            <ChannelSatellite
              key={ch}
              channel={ch}
              isActive={activeSet.has(ch)}
              delivered={
                deliveredSet.has(ch) && !running && activeChannels.length > 0
              }
              theme={T}
            />
          ))}

          {/* PushCaster hub (rendered last — on top) */}
          <PushCasterHub running={running} theme={T} />
        </svg>

        {/* Delivery feed overlay */}
        <DeliveryFeed activeChannels={activeChannels} theme={T} />
      </div>

      {/* ── Zone 3: Payload panel (180px) ── */}
      <div style={{ height: 180, flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          {activePayload ? (
            <motion.div
              key="payload"
              style={{ height: "100%" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <PayloadPanel payload={activePayload} theme={T} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              style={{ height: "100%" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyPayloadPanel theme={T} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
