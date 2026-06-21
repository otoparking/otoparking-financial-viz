"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  History,
  Plug,
  RotateCcw,
  Activity,
  Circle,
} from "lucide-react";
import type { ApiEndpoint, ApiLogEntry } from "@/types/api-tester";
import { API_MODULES } from "@/app/modules/api/endpoints";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ApiTesterControlPanelProps {
  onSelectEndpoint: (endpoint: ApiEndpoint) => void;
  onReset: () => void;
  log: ApiLogEntry[];
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function methodColor(method: string, T: ThemeTokens): string {
  const map: Record<string, string> = {
    GET: T.green,
    POST: T.blue,
    PUT: T.amber,
    DELETE: T.red,
  };
  return map[method] ?? T.textMuted;
}

function methodBg(method: string, T: ThemeTokens): string {
  return `${methodColor(method, T)}22`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ T }: { T: ThemeTokens }) {
  return (
    <div
      style={{
        position: "relative",
        height: 1,
        margin: "14px 0",
        flexShrink: 0,
        background: `linear-gradient(to right, transparent, ${T.borderSubtle} 20%, ${T.border} 50%, ${T.borderSubtle} 80%, transparent)`,
      }}
    />
  );
}

// ─── Section header label ──────────────────────────────────────────────────────

function SectionLabel({
  icon,
  label,
  T,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  T: ThemeTokens;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: T.textMuted,
            textTransform: "uppercase" as const,
          }}
        >
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

// ─── EndpointRow ──────────────────────────────────────────────────────────────

function EndpointRow({
  ep,
  onClick,
  T,
}: {
  ep: ApiEndpoint;
  onClick: () => void;
  T: ThemeTokens;
}) {
  const color = methodColor(ep.method, T);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}50`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          T.borderSubtle;
      }}
      style={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        background: T.card,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left" as const,
        padding: 0,
        marginBottom: 5,
        transition: "border-color 0.18s, background 0.18s",
      }}
    >
      {/* Left color stripe */}
      <div
        style={{
          width: 4,
          background: color,
          flexShrink: 0,
        }}
      />

      {/* Right content */}
      <div
        style={{
          flex: 1,
          padding: "7px 10px",
          minWidth: 0,
        }}
      >
        {/* Row 1: method badge + path + chevron */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 3,
          }}
        >
          {/* Method badge */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color,
              background: methodBg(ep.method, T),
              border: `1px solid ${color}40`,
              borderRadius: 4,
              padding: "1px 6px",
              flexShrink: 0,
              lineHeight: "1.5",
            }}
          >
            {ep.method}
          </span>

          {/* Path */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9.5,
              color: T.textMuted,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}
          >
            {ep.path}
          </span>

          {/* Arrow */}
          <ChevronRight size={11} style={{ color: T.textDim, flexShrink: 0 }} />
        </div>

        {/* Row 2: description */}
        <p
          style={{
            margin: 0,
            fontSize: 9,
            color: T.textDim,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
            lineHeight: "1.4",
          }}
        >
          {ep.description}
        </p>
      </div>
    </motion.button>
  );
}

// ─── LogEntry ─────────────────────────────────────────────────────────────────

function LogEntry({ entry, T }: { entry: ApiLogEntry; T: ThemeTokens }) {
  const color = methodColor(entry.method, T);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderRadius: 7,
          background: T.card,
          border: `1px solid ${T.borderSubtle}`,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        {/* Timeline dot */}
        <Circle
          size={6}
          style={{
            color,
            fill: color,
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
          }}
        >
          {formatTime(entry.timestamp)}
        </span>

        {/* Method badge */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color,
            background: methodBg(entry.method, T),
            border: `1px solid ${color}40`,
            borderRadius: 4,
            padding: "1px 6px",
            flexShrink: 0,
            lineHeight: "1.5",
          }}
        >
          {entry.method}
        </span>

        {/* Path */}
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: T.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
            flex: 1,
          }}
        >
          {entry.path}
        </span>

        {/* Detail */}
        <span
          style={{
            fontSize: 9,
            color: T.textDim,
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
            maxWidth: 80,
          }}
        >
          {entry.detail}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Module pill ──────────────────────────────────────────────────────────────

function ModulePill({
  label,
  isActive,
  onClick,
  T,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  T: ThemeTokens;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.12 }}
      style={{
        flexShrink: 0,
        padding: "3px 10px",
        borderRadius: 20,
        cursor: "pointer",
        fontFamily: "monospace",
        fontSize: 9.5,
        fontWeight: isActive ? 700 : 500,
        letterSpacing: "0.04em",
        transition: "background 0.18s, border-color 0.18s, color 0.18s",
        background: isActive ? T.accentBg : T.card,
        border: `1px solid ${isActive ? T.borderActive : T.border}`,
        color: isActive ? T.accent : T.textMuted,
      }}
    >
      {label}
    </motion.button>
  );
}

// ─── Reset button ─────────────────────────────────────────────────────────────

function ResetButton({ onReset, T }: { onReset: () => void; T: ThemeTokens }) {
  return (
    <motion.button
      onClick={onReset}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.13 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          T.borderActive;
        (e.currentTarget as HTMLButtonElement).style.color = T.accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
        (e.currentTarget as HTMLButtonElement).style.color = T.textMuted;
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 9px",
        borderRadius: 6,
        background: T.card,
        border: `1px solid ${T.border}`,
        cursor: "pointer",
        color: T.textMuted,
        transition: "border-color 0.18s, color 0.18s",
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
        }}
      >
        Reset
      </span>
      <RotateCcw size={10} />
    </motion.button>
  );
}

// ─── Log count badge ─────────────────────────────────────────────────────────

function LogCountBadge({ count, T }: { count: number; T: ThemeTokens }) {
  if (count === 0) return null;
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: 8,
        fontWeight: 700,
        color: T.accent,
        background: T.accentBg,
        border: `1px solid ${T.borderActive}`,
        borderRadius: 10,
        padding: "1px 6px",
        letterSpacing: "0.04em",
      }}
    >
      {count}
    </span>
  );
}

// ─── Endpoint count badge ────────────────────────────────────────────────────

function EndpointCountBadge({ count, T }: { count: number; T: ThemeTokens }) {
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: 8,
        fontWeight: 600,
        color: T.textDim,
        background: T.borderSubtle,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "1px 6px",
        letterSpacing: "0.03em",
      }}
    >
      {count}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApiTesterControlPanel({
  onSelectEndpoint,
  onReset,
  log,
}: ApiTesterControlPanelProps) {
  const T = useTheme();
  const [activeModule, setActiveModule] = useState(API_MODULES[0].name);
  const filtered =
    API_MODULES.find((m) => m.name === activeModule) ?? API_MODULES[0];

  return (
    <div
      className="flex flex-col w-full overflow-hidden min-h-0"
      style={{ background: T.bg, height: "100%" }}
    >
      <div
        className="flex-1 overflow-hidden min-h-0"
        style={{
          overflowY: "auto",
          padding: "14px 12px",
          scrollbarWidth: "thin",
          scrollbarColor: `${T.border} transparent`,
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: T.accentBg,
                border: `1px solid ${T.borderActive}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Plug size={12} style={{ color: T.accent }} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: T.text,
                  textTransform: "uppercase" as const,
                  lineHeight: "1.2",
                }}
              >
                Endpoint Catalog
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: T.textDim,
                  letterSpacing: "0.06em",
                  lineHeight: "1.3",
                }}
              >
                {API_MODULES.length} modules
              </div>
            </div>
          </div>

          <ResetButton onReset={onReset} T={T} />
        </div>

        {/* ── Module filter pills ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            overflowX: "auto",
            paddingBottom: 6,
            marginBottom: 12,
            scrollbarWidth: "none" as const,
          }}
        >
          {API_MODULES.map((m) => (
            <ModulePill
              key={m.name}
              label={m.name}
              isActive={m.name === activeModule}
              onClick={() => setActiveModule(m.name)}
              T={T}
            />
          ))}
        </div>

        {/* ── Endpoint list section header ── */}
        <SectionLabel
          icon={
            <Activity size={12} style={{ color: T.accent, flexShrink: 0 }} />
          }
          label={filtered.name}
          T={T}
          right={<EndpointCountBadge count={filtered.endpoints.length} T={T} />}
        />

        {/* ── Endpoint list ── */}
        <div style={{ marginBottom: 4 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {filtered.endpoints.map((ep) => (
                <EndpointRow
                  key={ep.id}
                  ep={ep}
                  onClick={() => onSelectEndpoint(ep)}
                  T={T}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Divider ── */}
        <Divider T={T} />

        {/* ── Request log section ── */}
        <div>
          <SectionLabel
            icon={
              <History
                size={12}
                style={{ color: T.textMuted, flexShrink: 0 }}
              />
            }
            label="Request Log"
            T={T}
            right={<LogCountBadge count={log.length} T={T} />}
          />

          {/* Empty state */}
          {log.length === 0 && (
            <p
              style={{
                margin: 0,
                fontFamily: "monospace",
                fontSize: 9.5,
                fontStyle: "italic",
                color: T.textDim,
                padding: "6px 2px",
              }}
            >
              Click an endpoint to inspect it...
            </p>
          )}

          {/* Log entries */}
          <AnimatePresence initial={false}>
            {log.slice(0, 12).map((entry) => (
              <LogEntry key={entry.id} entry={entry} T={T} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
