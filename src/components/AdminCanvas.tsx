"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";
import {
  Crown,
  Building2,
  UserCog,
  Shield,
  Eye,
  Pencil,
  Trash2,
  Lock,
  LayoutDashboard,
  Building,
  ParkingSquare,
  DollarSign,
  BookOpen,
  Wallet,
  User,
  Users,
  Star,
  Bell,
  ScrollText,
  Settings,
} from "lucide-react";
import type { AdminRole, AdminPermission } from "@/types/admin";
import { ADMIN_MODULES } from "@/app/modules/admin/scenarios";

/* ── Constants ──────────────────────────────────────────────────────────── */

const ALL_ROLES: AdminRole[] = ["super_admin", "tenant_admin", "manager"];

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  manager: "Manager",
};

const ROLE_LABELS_UPPER: Record<AdminRole, string> = {
  super_admin: "SUPER ADMIN",
  tenant_admin: "TENANT ADMIN",
  manager: "MANAGER",
};

// ROLE_COLORS kept for identity reference.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: "#CBFF00",
  tenant_admin: "#378ADD",
  manager: "#BA7517",
};

function roleColor(role: AdminRole, T: ThemeTokens): string {
  if (role === "super_admin") return T.accent;
  if (role === "tenant_admin") return T.blue;
  return T.escrow;
}

const ROLE_ICONS: Record<AdminRole, React.ReactNode> = {
  super_admin: <Crown className="size-4" />,
  tenant_admin: <Building2 className="size-4" />,
  manager: <UserCog className="size-4" />,
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "Full platform access",
  tenant_admin: "Tenant-scoped access",
  manager: "Operational access",
};

/* ── Module icon map ────────────────────────────────────────────────────── */

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="size-3.5" />,
  tenants: <Building className="size-3.5" />,
  "parking-lots": <ParkingSquare className="size-3.5" />,
  pricing: <DollarSign className="size-3.5" />,
  bookings: <BookOpen className="size-3.5" />,
  financial: <Wallet className="size-3.5" />,
  drivers: <User className="size-3.5" />,
  agents: <Shield className="size-3.5" />,
  "sub-users": <Users className="size-3.5" />,
  reviews: <Star className="size-3.5" />,
  notifications: <Bell className="size-3.5" />,
  audit: <ScrollText className="size-3.5" />,
  settings: <Settings className="size-3.5" />,
};

/* ── Permission badge config (kept for reference; runtime cfg built in PermBadge) ── */

interface PermConfig {
  bg: string;
  border: string;
  color: string;
  label: string;
  icon: React.ReactNode;
}

// PERM_CONFIG is intentionally unused at module level; PermBadge builds
// its config inline using theme tokens.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PERM_CONFIG: Record<AdminPermission, PermConfig> = {
  write: {
    bg: "rgba(29,158,117,0.14)",
    border: "1px solid rgba(29,158,117,0.35)",
    color: "#1D9E75",
    label: "R / W",
    icon: <Pencil className="size-3" />,
  },
  read: {
    bg: "rgba(55,138,221,0.14)",
    border: "1px solid rgba(55,138,221,0.35)",
    color: "#378ADD",
    label: "Read",
    icon: <Eye className="size-3" />,
  },
  none: {
    bg: "oklch(0.16 0.02 183 / 0.3)",
    border: "1px solid oklch(0.26 0.03 175 / 0.12)",
    color: "oklch(0.38 0.02 172)",
    label: "—",
    icon: <Lock className="size-3" />,
  },
  delete: {
    bg: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#EF4444",
    label: "Full",
    icon: <Trash2 className="size-3" />,
  },
};

/* ── PermBadge ──────────────────────────────────────────────────────────── */

interface PermBadgeProps {
  perm: AdminPermission;
  isActiveColumn: boolean;
  theme: ThemeTokens;
}

function PermBadge({ perm, isActiveColumn, theme: T }: PermBadgeProps) {
  const cfg: Record<
    AdminPermission,
    {
      bg: string;
      border: string;
      color: string;
      label: string;
      icon: React.ReactNode;
    }
  > = {
    write: {
      bg: `${T.green}24`,
      border: `1px solid ${T.green}59`,
      color: T.green,
      label: "R / W",
      icon: <Pencil className="size-3" />,
    },
    read: {
      bg: `${T.blue}24`,
      border: `1px solid ${T.blue}59`,
      color: T.blue,
      label: "Read",
      icon: <Eye className="size-3" />,
    },
    none: {
      bg: T.card,
      border: `1px solid ${T.borderSubtle}`,
      color: T.textDim,
      label: "—",
      icon: <Lock className="size-3" />,
    },
    delete: {
      bg: `${T.red}24`,
      border: `1px solid ${T.red}59`,
      color: T.red,
      label: "Full",
      icon: <Trash2 className="size-3" />,
    },
  };
  const entry = cfg[perm];

  return (
    <motion.div
      animate={{ scale: isActiveColumn ? 1.05 : 1 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        background: entry.bg,
        border: entry.border,
        color: entry.color,
      }}
    >
      {entry.icon}
      <span
        style={{
          fontSize: 8,
          fontFamily: "monospace",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {entry.label}
      </span>
    </motion.div>
  );
}

/* ── Props ──────────────────────────────────────────────────────────────── */

interface AdminCanvasProps {
  activeRole: AdminRole | null;
  visibleModules: string[];
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function AdminCanvas({
  activeRole,
  visibleModules,
}: AdminCanvasProps) {
  const T = useTheme();
  const activeRoleIndex =
    activeRole !== null ? ALL_ROLES.indexOf(activeRole) : -1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: T.bg,
      }}
    >
      {/* ── Zone 1: Header bar ──────────────────────────────────────────── */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Left — indicator + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: T.accent,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: T.textMuted,
            }}
          >
            RBAC Admin Matrix
          </span>
        </div>

        {/* Right — active role badge */}
        <AnimatePresence mode="wait">
          {activeRole ? (
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 9px",
                borderRadius: 6,
                background: roleColor(activeRole, T) + "18",
                border: `1px solid ${roleColor(activeRole, T)}35`,
              }}
            >
              <span
                style={{ color: roleColor(activeRole, T), display: "flex" }}
              >
                {ROLE_ICONS[activeRole]}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: roleColor(activeRole, T),
                }}
              >
                {ROLE_LABELS_UPPER[activeRole]}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="no-role"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: "3px 9px",
                borderRadius: 6,
                background: T.card,
                border: `1px solid ${T.border}`,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: T.textDim,
                }}
              >
                NO ROLE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zone 2: Role cards ──────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px 8px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 10,
        }}
      >
        {ALL_ROLES.map((role) => {
          const isActive = activeRole === role;
          const color = roleColor(role, T);
          const moduleCount = ADMIN_MODULES.filter(
            (m) => m.permissions[role] !== "none",
          ).length;

          return (
            <motion.div
              key={role}
              animate={{
                borderColor: isActive ? color : T.border,
                boxShadow: isActive
                  ? `0 0 24px ${color}33`
                  : "0 0 0 transparent",
              }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                border: `${isActive ? "1.5px" : "1px"} solid ${
                  isActive ? color : T.border
                }`,
                background: isActive ? color + "18" : T.card,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: "default",
                transition: "background 0.3s ease",
              }}
            >
              {/* Top row: icon + label + pulsing dot */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isActive ? color + "22" : T.card,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isActive ? color : T.textMuted,
                    flexShrink: 0,
                    transition: "background 0.3s ease, color 0.3s ease",
                  }}
                >
                  {ROLE_ICONS[role]}
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: isActive ? color : T.textMuted,
                    transition: "color 0.3s ease",
                    flex: 1,
                  }}
                >
                  {ROLE_LABELS[role]}
                </span>

                {/* Pulsing dot */}
                {isActive && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {/* Row 2: description */}
              <span
                style={{
                  fontSize: 8.5,
                  color: isActive ? T.textMuted : T.textDim,
                  lineHeight: 1.4,
                  transition: "color 0.3s ease",
                  paddingLeft: 35,
                }}
              >
                {ROLE_DESCRIPTIONS[role]}
              </span>

              {/* Row 3: module count chip */}
              <div style={{ paddingLeft: 35 }}>
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: isActive ? color : T.textDim,
                    transition: "color 0.3s ease",
                  }}
                >
                  {moduleCount} modules
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Zone 3: Permission matrix ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 20px",
        }}
      >
        {/* Sticky column headers */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: T.header,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            height: 36,
          }}
        >
          {/* Module column header */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: T.textMuted,
              }}
            >
              MODULE
            </span>
          </div>

          {/* Role column headers */}
          {ALL_ROLES.map((role, idx) => {
            const isActiveCol = idx === activeRoleIndex;
            const color = roleColor(role, T);
            return (
              <div
                key={role}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  background: isActiveCol ? color + "12" : "transparent",
                  transition: "background 0.3s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: isActiveCol ? color : T.textMuted,
                    transition: "color 0.3s ease",
                  }}
                >
                  {ROLE_LABELS_UPPER[role]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Matrix rows */}
        {ADMIN_MODULES.map((mod, index) => {
          const isVisible = visibleModules.includes(mod.id);
          const moduleIcon = MODULE_ICONS[mod.id] ?? (
            <Settings className="size-3.5" />
          );

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: isVisible ? 1 : 0.45,
                x: 0,
              }}
              transition={{
                opacity: { duration: 0.35, ease: "easeOut" },
                x: { duration: 0.3, delay: index * 0.03, ease: "easeOut" },
              }}
              style={{
                display: "flex",
                alignItems: "center",
                height: 52,
                borderBottom: `1px solid ${T.borderSubtle}`,
                background: isVisible ? T.card : "transparent",
                transition: "background 0.35s ease",
              }}
            >
              {/* Module name cell */}
              <div
                style={{
                  width: 200,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  paddingRight: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      color: T.textMuted,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    {moduleIcon}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: isVisible ? T.text : T.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "color 0.35s ease",
                    }}
                  >
                    {mod.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 8,
                    color: T.textDim,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    paddingLeft: 22,
                  }}
                >
                  {mod.description}
                </span>
              </div>

              {/* Permission cells — one per role */}
              {ALL_ROLES.map((role, idx) => {
                const perm = mod.permissions[role];
                const isActiveCol = idx === activeRoleIndex;
                const color = roleColor(role, T);

                return (
                  <div
                    key={role}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      background: isActiveCol ? color + "08" : "transparent",
                      transition: "background 0.3s ease",
                    }}
                  >
                    <PermBadge
                      perm={perm}
                      isActiveColumn={isActiveCol}
                      theme={T}
                    />
                  </div>
                );
              })}
            </motion.div>
          );
        })}

        {/* Bottom padding inside scrollable zone */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Zone 4: Legend strip ────────────────────────────────────────── */}
      <div
        style={{
          height: 42,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontFamily: "monospace",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: T.textDim,
            marginRight: 4,
          }}
        >
          Legend:
        </span>

        {/* Full / delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.red,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              color: T.red,
            }}
          >
            Full
          </span>
        </div>

        {/* R/W / write */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.green,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              color: T.green,
            }}
          >
            R / W
          </span>
        </div>

        {/* Read */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.blue,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              color: T.blue,
            }}
          >
            Read
          </span>
        </div>

        {/* None */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.textDim,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              color: T.textDim,
            }}
          >
            None
          </span>
        </div>
      </div>
    </div>
  );
}
