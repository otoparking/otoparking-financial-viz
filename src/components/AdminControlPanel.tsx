"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import type { AdminScenario, AdminLogEntry, AdminRole } from "@/types/admin";
import { ADMIN_SCENARIOS } from "@/app/modules/admin/scenarios";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RotateCcw,
  History,
  Shield,
  Crown,
  Building2,
  UserCog,
  ChevronRight,
  Eye,
  Pencil,
  Lock,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AdminControlPanelProps {
  onRunScenario: (scenario: AdminScenario) => void;
  onReset: () => void;
  log: AdminLogEntry[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Role config ─────────────────────────────────────────────────────────── */

// ROLE_COLOR kept for identity reference; use getRoleColor(role, T) at render time.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ROLE_COLOR: Record<AdminRole, string> = {
  super_admin: "#CBFF00",
  tenant_admin: "#378ADD",
  manager: "#BA7517",
};

function getRoleColor(role: AdminRole, T: ThemeTokens): string {
  if (role === "super_admin") return T.accent;
  if (role === "tenant_admin") return T.blue;
  return T.escrow;
}

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  manager: "Manager",
};

function RoleIcon({
  role,
  size = 14,
  theme: T,
}: {
  role: AdminRole;
  size?: number;
  theme: ThemeTokens;
}) {
  const color = getRoleColor(role, T);
  const style = { width: size, height: size, color } as React.CSSProperties;
  if (role === "super_admin") return <Crown style={style} />;
  if (role === "tenant_admin") return <Building2 style={style} />;
  return <UserCog style={style} />;
}

/* ── Section header ──────────────────────────────────────────────────────── */

function SectionHeader({
  icon,
  label,
  action,
  theme: T,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  theme: ThemeTokens;
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

/* ── Reset button ────────────────────────────────────────────────────────── */

function ResetButton({
  onClick,
  theme: T,
}: {
  onClick: () => void;
  theme: ThemeTokens;
}) {
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

/* ── Divider ─────────────────────────────────────────────────────────────── */

function Divider({ theme: T }: { theme: ThemeTokens }) {
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

/* ── Meta chip ───────────────────────────────────────────────────────────── */

function MetaChip({
  icon,
  label,
  accent,
  theme: T,
}: {
  icon?: React.ReactNode;
  label: string;
  accent?: string;
  theme: ThemeTokens;
}) {
  const isAccent = !!accent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "1.5px 6px",
        borderRadius: 4,
        background: isAccent ? `${accent}15` : T.card,
        border: isAccent
          ? `1px solid ${accent}35`
          : `1px solid ${T.borderSubtle}`,
        fontSize: 7.5,
        fontFamily: "monospace",
        fontWeight: isAccent ? 700 : 600,
        color: isAccent ? accent : T.textMuted,
        letterSpacing: isAccent ? "0.04em" : undefined,
      }}
    >
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      {label}
    </span>
  );
}

/* ── RBAC legend strip ───────────────────────────────────────────────────── */

function RbacLegend({ theme: T }: { theme: ThemeTokens }) {
  const cells = [
    {
      badge: "R / W",
      color: T.green,
      icon: <Pencil className="size-3.5" />,
      label: "Read/Write",
      sub: "full access",
    },
    {
      badge: "Read",
      color: T.blue,
      icon: <Eye className="size-3.5" />,
      label: "Read Only",
      sub: "view only",
    },
    {
      badge: "—",
      color: T.textMuted,
      icon: <Lock className="size-3.5" />,
      label: "No Access",
      sub: "hidden",
    },
  ];
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 14px 10px" }}>
      {cells.map((cell) => (
        <div
          key={cell.badge}
          style={{
            flex: 1,
            padding: "7px 8px",
            borderRadius: 9,
            background: `${cell.color}0D`,
            border: `1px solid ${cell.color}28`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              color: cell.color,
              marginBottom: 3,
            }}
          >
            {cell.icon}
          </div>
          <div
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              fontWeight: 700,
              color: cell.color,
              letterSpacing: "0.05em",
            }}
          >
            {cell.label}
          </div>
          <div
            style={{
              fontSize: 7.5,
              fontFamily: "monospace",
              color: cell.color,
              opacity: 0.6,
              marginTop: 2,
            }}
          >
            {cell.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Role scenario card ──────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onRun,
  theme: T,
}: {
  scenario: AdminScenario;
  onRun: () => void;
  theme: ThemeTokens;
}) {
  const color = getRoleColor(scenario.role, T);
  const roleLabel = ROLE_LABEL[scenario.role];

  return (
    <motion.button
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
      <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
        {/* Top row: role icon + name + module badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <RoleIcon role={scenario.role} size={14} theme={T} />
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
          {/* Module count badge */}
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
              {scenario.modules.length} modules
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
          <MetaChip label={roleLabel} accent={color} theme={T} />
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

/* ── Log entry ───────────────────────────────────────────────────────────── */

function LogEntry({
  entry,
  theme: T,
}: {
  entry: AdminLogEntry;
  theme: ThemeTokens;
}) {
  const isPass = entry.event.includes("PASS");
  const isFail = entry.event.includes("FAIL");
  const isRole = entry.event === "ROLE";

  const eventColor = isPass
    ? T.green
    : isFail
      ? T.red
      : isRole
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

/* ── Main panel ──────────────────────────────────────────────────────────── */

export default function AdminControlPanel({
  onRunScenario,
  onReset,
  log,
}: AdminControlPanelProps) {
  const T = useTheme();
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <ScrollArea className="flex-1">
        {/* ── Role Views header ── */}
        <SectionHeader
          icon={<Shield className="size-3.5" />}
          label="Role Views"
          action={<ResetButton onClick={onReset} theme={T} />}
          theme={T}
        />

        {/* ── RBAC legend strip label ── */}
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
            Permission Levels
          </span>
        </div>

        {/* ── RBAC legend ── */}
        <RbacLegend theme={T} />

        {/* ── Divider ── */}
        <Divider theme={T} />

        {/* ── Role scenario cards ── */}
        <div
          style={{
            padding: "0 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {ADMIN_SCENARIOS.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              onRun={() => onRunScenario(s)}
              theme={T}
            />
          ))}
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${T.borderSubtle}`,
          }}
        >
          {/* ── Event log ── */}
          <SectionHeader
            icon={<History className="size-3.5" />}
            label="Event Log"
            theme={T}
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
                Select a role to see access events...
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
                  <LogEntry entry={entry} theme={T} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
