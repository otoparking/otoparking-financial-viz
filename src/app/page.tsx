"use client";

import { useState, useCallback, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronRight } from "lucide-react";
import type { ModuleId } from "@/types/modules";
import { getModule } from "@/lib/modules";
import { useTheme } from "@/hooks/useTheme";
import ModuleSidebar from "@/components/shared/ModuleSidebar";
import ModuleHeader from "@/components/shared/ModuleHeader";
import StatusBar from "@/components/shared/StatusBar";
import ThemeToggle from "@/components/ThemeToggle";

import FinancialModule from "./modules/financial/page";
import GateModule from "./modules/gate/page";
import AuthModule from "./modules/auth/page";
import NotificationsModule from "./modules/notifications/page";
import AdminModule from "./modules/admin/page";
import PricingModule from "./modules/pricing/page";
import CancellationModule from "./modules/cancellation/page";
import SettlementModule from "./modules/settlement/page";
import ApiModule from "./modules/api/page";
import InfraModule from "./modules/infra/page";

import { type MonitorEvent } from "@/components/MonitorPanel";

// ---------------------------------------------------------------------------
// SessionClock — live HH:MM:SS ticker
// ---------------------------------------------------------------------------
function SessionClock({ theme: T }: { theme: ReturnType<typeof useTheme> }) {
  // Initialize to null so SSR and the first client render both produce the
  // same output (no time string), avoiding a hydration mismatch from the
  // server capturing a different second than the client.
  const [time, setTime] = useState<Date | null>(null);

  useLayoutEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const str = time
    ? `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
    : "--:--:--";

  return (
    <div
      className="flex items-center shrink-0"
      style={{
        gap: 5,
        background: T.card,
        border: `1px solid ${T.borderSubtle}`,
        padding: "3px 9px",
        borderRadius: 6,
      }}
    >
      <Clock size={10} style={{ color: T.textDim, flexShrink: 0 }} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: T.textDim,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {str}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OtoParking Test Center — main shell
//
// Holds the 3-column layout:
//   Left   → ModuleSidebar (200px)
//   Center → Active module's canvas + right panel
//   Bottom → StatusBar
// ---------------------------------------------------------------------------
export default function TestCenterPage() {
  const T = useTheme();

  const [activeModuleId, setActiveModuleId] = useState<ModuleId>("financial");
  const [activity, setActivity] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);

  const addMonitorEvent = useCallback(
    (
      type: MonitorEvent["type"],
      label: string,
      detail: string,
      status?: MonitorEvent["status"],
      meta?: MonitorEvent["meta"],
      durationMs?: number,
    ) => {
      setMonitorEvents((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          timestamp: new Date(),
          label,
          detail,
          status,
          meta,
          durationMs,
        },
        ...prev,
      ]);
    },
    [],
  );

  const moduleMeta = getModule(activeModuleId);

  const handleActivity = useCallback((label: string) => {
    if (!label) {
      setActivity(null);
    } else {
      setActivity(label);
    }
  }, []);

  const renderModule = () => {
    const props = { onActivity: handleActivity, onMonitor: addMonitorEvent };
    switch (activeModuleId) {
      case "financial":
        return <FinancialModule {...props} />;
      case "gate":
        return <GateModule {...props} />;
      case "auth":
        return <AuthModule {...props} />;
      case "notifications":
        return <NotificationsModule {...props} />;
      case "admin":
        return <AdminModule {...props} />;
      case "pricing":
        return <PricingModule {...props} />;
      case "cancellation":
        return <CancellationModule {...props} />;
      case "settlement":
        return <SettlementModule {...props} />;
      case "api":
        return <ApiModule {...props} />;
      case "infra":
        return <InfraModule {...props} />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Top header bar                                                       */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="flex items-center justify-between shrink-0"
        style={{
          position: "relative",
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Subtle bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${T.accent}30, transparent)`,
            pointerEvents: "none",
          }}
        />

        {/* ---- LEFT ZONE ---- */}
        <div className="flex items-center shrink-0" style={{ gap: 12 }}>
          {/* Brand mark — OtoParking logo */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: `0 0 16px ${T.accent}40`,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/otoparking-green.png"
              alt="OtoParking"
              width={32}
              height={32}
              style={{ width: 32, height: 32, display: "block" }}
            />
          </div>

          {/* Brand text block */}
          <div className="flex flex-col shrink-0" style={{ gap: 1 }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                color: T.text,
                letterSpacing: "0.06em",
                lineHeight: 1.2,
              }}
            >
              OtoParking
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 700,
                color: T.accent,
                letterSpacing: "0.18em",
                lineHeight: 1.2,
              }}
            >
              TEST CENTER
            </span>
          </div>

          {/* Vertical divider */}
          <div
            className="shrink-0"
            style={{
              width: 1,
              height: 22,
              background: T.border,
              marginLeft: 4,
              marginRight: 4,
            }}
          />

          {/* Module header */}
          <ModuleHeader module={moduleMeta} activity={activity} />
        </div>

        {/* ---- CENTER ZONE — breadcrumb ---- */}
        <div
          className="flex items-center shrink-0"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            gap: 6,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: T.textDim,
              lineHeight: 1,
            }}
          >
            OtoParking
          </span>
          <ChevronRight size={10} style={{ color: T.textDim, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: T.text,
              lineHeight: 1,
            }}
          >
            {moduleMeta.headerLabel}
          </span>
        </div>

        {/* ---- RIGHT ZONE ---- */}
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          {/* Session clock */}
          <SessionClock theme={T} />

          {/* System status — LIVE indicator */}
          <div
            className="flex items-center shrink-0"
            style={{
              gap: 6,
              background: T.isDark ? `${T.green}15` : `${T.green}18`,
              border: `1px solid ${T.green}40`,
              padding: "3px 9px",
              borderRadius: 99,
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: T.green,
                boxShadow: `0 0 8px ${T.green}80`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                fontWeight: 700,
                color: T.green,
                letterSpacing: "0.12em",
                lineHeight: 1,
              }}
            >
              LIVE
            </span>
          </div>

          {/* Module count badge */}
          <div
            className="flex items-center shrink-0"
            style={{
              background: T.card,
              border: `1px solid ${T.borderSubtle}`,
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: T.textDim,
                lineHeight: 1,
                letterSpacing: "0.04em",
              }}
            >
              10 modules
            </span>
          </div>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main 3-column body */}
      <div className="flex-1 flex overflow-hidden">
        <ModuleSidebar
          activeModule={activeModuleId}
          onSelectModule={setActiveModuleId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        {renderModule()}
      </div>

      <StatusBar />
    </div>
  );
}
