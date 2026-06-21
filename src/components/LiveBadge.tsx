"use client";

import { Radio, WifiOff } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface LiveBadgeProps {
  connected: boolean;
  lastSynced: Date | null;
}

export default function LiveBadge({ connected, lastSynced }: LiveBadgeProps) {
  const T = useTheme();

  const timeStr = lastSynced
    ? lastSynced.toLocaleTimeString("fr-MA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      className="absolute top-3 right-3 z-50 pointer-events-none"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: T.card,
        border: `1px solid ${connected ? T.green + "44" : T.border}`,
        borderRadius: 8,
        padding: "4px 10px",
        backdropFilter: "blur(10px)",
        boxShadow: T.isDark
          ? "0 2px 12px rgba(0,0,0,0.4)"
          : "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      {/* Pulsing dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: connected ? T.green : T.textDim,
          boxShadow: connected ? `0 0 6px ${T.green}99` : "none",
          animation: connected ? "live-pulse 2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {connected ? (
        <>
          <Radio style={{ width: 12, height: 12, color: T.green }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              color: T.green,
            }}
          >
            LIVE
          </span>
        </>
      ) : (
        <>
          <WifiOff style={{ width: 12, height: 12, color: T.textDim }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              color: T.textDim,
            }}
          >
            OFFLINE
          </span>
        </>
      )}
      {timeStr && (
        <span
          style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: T.textMuted,
          }}
        >
          {timeStr}
        </span>
      )}
    </div>
  );
}
