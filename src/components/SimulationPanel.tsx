"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Play,
  Square,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Zap,
  LogIn,
  LogOut,
  Circle,
} from "lucide-react";
import type {
  SimScenario,
  AuditEntry,
  CheckpointResult,
  SimulationResult,
  ActorPool,
} from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";
import { seedSimAccounts, loadSimAccounts } from "@/lib/simulation/accounts";
import { PRESETS } from "@/lib/simulation/presets";
import {
  loginDriver,
  loginAdmin,
  loginTenant,
  loginAgent,
  getToken,
  clearTokens,
} from "@/lib/auth-service";
import { useTheme } from "@/hooks/useTheme";

/* ── Native test accounts ─────────────────────────────────────────── */

const NATIVE_ACCOUNTS = [
  {
    key: "driver",
    label: "Test Driver",
    email: "akarog20230@gmail.com",
    password: "password123",
    role: "driver" as const,
  },
  {
    key: "admin",
    label: "Super Admin",
    email: "admin@otoparking.com",
    password: "Admin@12345",
    role: "admin" as const,
    loginFn: loginAdmin,
  },
  {
    key: "tenant",
    label: "Test Tenant",
    email: "test-tenant@otoparking.com",
    password: "Test-Tenant2026",
    role: "tenant" as const,
    loginFn: loginTenant,
  },
  {
    key: "agent",
    label: "Test Agent",
    email: "test-agent@otoparking.com",
    password: "54ea7aa5c314",
    role: "agent" as const,
    loginFn: loginAgent,
  },
];

interface ActiveUser {
  key: string;
  label: string;
  role: string;
}

interface SimulationPanelProps {
  onLog?: (label: string, detail: string, ok: boolean) => void;
}

export default function SimulationPanel({ onLog }: SimulationPanelProps) {
  const [pool, setPool] = useState<ActorPool | null>(() => loadSimAccounts());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [liveAudit, setLiveAudit] = useState<AuditEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);
  const [loginBusy, setLoginBusy] = useState<string | null>(null);
  const T = useTheme();

  const scenario = PRESETS[selectedPreset];

  const handleLogin = useCallback(
    async (
      key: string,
      role: string,
      label: string,
      email: string,
      password: string,
    ) => {
      setLoginBusy(key);
      try {
        let fn: (
          e: string,
          p: string,
        ) => Promise<{ success: boolean; token?: string }>;
        switch (role) {
          case "admin":
            fn = loginAdmin;
            break;
          case "tenant":
            fn = loginTenant;
            break;
          case "agent":
            fn = loginAgent;
            break;
          default:
            fn = loginDriver;
            break;
        }
        const result = await fn(email, password);
        if (result.success) {
          setActiveUser({ key, label, role });
          onLog?.("Auth", `Logged in as ${label} (${role})`, true);
        } else {
          onLog?.(
            "Auth",
            `Login failed: ${result.token ? "OK" : "Failed"}`,
            false,
          );
        }
      } catch (e) {
        onLog?.("Auth", `Login error: ${e}`, false);
      } finally {
        setLoginBusy(null);
      }
    },
    [onLog],
  );

  const handleLogout = useCallback(
    async (key: string) => {
      clearTokens();
      if (activeUser?.key === key) setActiveUser(null);
      onLog?.("Auth", "Logged out", true);
    },
    [activeUser, onLog],
  );

  const handleLoginAll = useCallback(async () => {
    const allAccounts = [
      ...NATIVE_ACCOUNTS,
      ...(pool?.drivers ?? []).map((d, i) => ({
        key: `sim-d-${i}`,
        label: d.label,
        role: "driver" as const,
        email: d.email,
        password: d.password,
      })),
      ...(pool?.agents ?? []).map((a, i) => ({
        key: `sim-a-${i}`,
        label: a.label,
        role: "agent" as const,
        email: a.email,
        password: a.password,
      })),
    ];
    for (const acc of allAccounts) {
      await handleLogin(acc.key, acc.role, acc.label, acc.email, acc.password);
    }
    onLog?.("Auth", `Logged in ${allAccounts.length} accounts`, true);
  }, [pool, handleLogin, onLog]);

  const handleSeed = useCallback(async () => {
    setLiveAudit([]);
    setResult(null);
    const p = await seedSimAccounts(3, 2);
    setPool(p);
    onLog?.("Seed", "Created 3 drivers + 2 agents", true);
  }, [onLog]);

  const handleRun = useCallback(async () => {
    if (!pool) {
      onLog?.("Simulation", "Seed accounts first", false);
      return;
    }
    setRunning(true);
    setLiveAudit([]);
    setResult(null);
    setProgress({ done: 0, total: scenario.steps.length });

    const res = await runSimulation(
      scenario,
      pool,
      (done, total, entry) => {
        setProgress({ done, total });
        setLiveAudit((prev) => [...prev, entry]);
        onLog?.(
          `[${entry.actor}] ${entry.action}`,
          `${entry.success ? "✅" : "❌"} ${entry.message} (${entry.durationMs}ms)`,
          entry.success,
        );
      },
      (cp) => {
        onLog?.(
          `Checkpoint: ${cp.label}`,
          cp.allPass
            ? "✅ All invariants pass"
            : `❌ ${cp.invariants.filter((i) => !i.pass).length} failures`,
          cp.allPass,
        );
      },
    );
    setResult(res);
    setRunning(false);
  }, [pool, scenario, onLog]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sim-${result.scenario.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "10px 14px",
        fontSize: 11,
        fontFamily: "monospace",
        height: "100%",
        overflow: "auto",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.textMuted,
          }}
        >
          Simulation
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {!pool && (
            <button onClick={handleSeed} style={btnStyle(T.accent, T.bg)}>
              <Zap size={11} /> Seed
            </button>
          )}
          {pool && (
            <>
              <span
                style={{ fontSize: 9, color: T.textMuted, alignSelf: "center" }}
              >
                {pool.drivers.length}D {pool.agents.length}A
              </span>
              <button
                onClick={handleRun}
                disabled={running}
                style={btnStyle(
                  running ? T.border : T.accent,
                  running ? T.textMuted : T.bg,
                )}
              >
                {running ? <Clock size={11} /> : <Play size={11} />}
                {running ? "Running..." : "Run"}
              </button>
              <button
                onClick={handleExport}
                disabled={!result}
                style={btnStyle(T.border, T.text)}
              >
                <Download size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Active User ──────────────────────────────────────────── */}
      {activeUser && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            borderRadius: 6,
            background: `${T.accent}10`,
            border: "1px solid #cbff0030",
          }}
        >
          <Circle size={8} style={{ color: T.accent, fill: T.accent }} />
          <span style={{ fontSize: 10, color: T.accent, fontWeight: 600 }}>
            {activeUser.label}
          </span>
          <span style={{ fontSize: 8, color: T.textMuted }}>
            ({activeUser.role})
          </span>
        </div>
      )}

      {/* ── Active Users ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Users
          </span>
          <button
            onClick={handleLoginAll}
            disabled={!!loginBusy}
            style={btnStyle(T.border, loginBusy ? T.textDim : T.text)}
          >
            <LogIn size={9} /> All
          </button>
        </div>

        {/* Native accounts */}
        {NATIVE_ACCOUNTS.map((acc) => (
          <UserRow
            key={acc.key}
            userKey={acc.key}
            label={acc.label}
            role={acc.role}
            email={acc.email}
            password={acc.password}
            isActive={activeUser?.key === acc.key}
            busy={loginBusy === acc.key}
            onLogin={handleLogin}
            T={T}
            onLogout={handleLogout}
          />
        ))}

        {/* Separator */}
        {pool && (
          <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
        )}

        {/* Sim drivers */}
        {pool?.drivers.map((d, i) => (
          <UserRow
            key={`sim-d-${i}`}
            userKey={`sim-d-${i}`}
            label={d.label}
            role="driver"
            email={d.email}
            password={d.password}
            isActive={activeUser?.key === `sim-d-${i}`}
            busy={loginBusy === `sim-d-${i}`}
            onLogin={handleLogin}
            T={T}
            onLogout={handleLogout}
          />
        ))}

        {/* Sim agents */}
        {pool?.agents.map((a, i) => (
          <UserRow
            key={`sim-a-${i}`}
            userKey={`sim-a-${i}`}
            label={a.label}
            role="agent"
            email={a.email}
            password={a.password}
            isActive={activeUser?.key === `sim-a-${i}`}
            busy={loginBusy === `sim-a-${i}`}
            onLogin={handleLogin}
            T={T}
            onLogout={handleLogout}
          />
        ))}
      </div>

      {/* ── Preset Selector ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => {
              setSelectedPreset(i);
              setResult(null);
              setLiveAudit([]);
            }}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${i === selectedPreset ? T.accent : T.border}`,
              background: i === selectedPreset ? `${T.accent}15` : "transparent",
              color: i === selectedPreset ? T.accent : T.textMuted,
              fontSize: 9,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────── */}
      {running && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
            }}
          >
            <span style={{ color: T.textMuted }}>
              {progress.done}/{progress.total} steps
            </span>
            <span style={{ color: T.accent }}>
              {Math.round((progress.done / progress.total) * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: T.border,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(progress.done / progress.total) * 100}%`,
                background: T.accent,
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Result Summary ───────────────────────────────────────── */}
      {result && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            background: result.stepsFailed === 0 ? "#00524920" : "#7f1d1d20",
            border: `1px solid ${result.stepsFailed === 0 ? "#005249" : "#7f1d1d"}`,
          }}
        >
          <span
            style={{
              color: result.stepsFailed === 0 ? "#005249" : "#ef4444",
              fontWeight: 700,
            }}
          >
            {result.stepsFailed === 0 ? "✅" : "❌"}
          </span>
          <span style={{ color: T.text, fontSize: 10 }}>
            {result.stepsPassed}/{result.stepsTotal} passed ·{" "}
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* ── Audit Trail + Checkpoints ────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {liveAudit.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 6px",
              borderRadius: 4,
              background: entry.success ? "transparent" : "#7f1d1d10",
              fontSize: 9,
            }}
          >
            <span
              style={{
                color: entry.success ? "#005249" : "#ef4444",
                width: 14,
              }}
            >
              {entry.success ? (
                <CheckCircle2 size={11} />
              ) : (
                <XCircle size={11} />
              )}
            </span>
            <User size={10} style={{ color: T.textMuted }} />
            <span style={{ color: T.text, minWidth: 60 }}>{entry.actor}</span>
            <span style={{ color: T.textMuted, minWidth: 100 }}>
              {entry.action}
            </span>
            <span style={{ color: T.textMuted, flex: 1 }}>{entry.message}</span>
            <span style={{ color: T.textDim, fontSize: 8 }}>
              {entry.durationMs}ms
            </span>
          </div>
        ))}
      </div>

      {result?.checkpoints.map((cp, i) => (
        <div
          key={i}
          style={{
            padding: "6px 8px",
            borderRadius: 6,
            background: cp.allPass ? "#00524910" : "#7f1d1d10",
            border: `1px solid ${cp.allPass ? "#00524950" : "#7f1d1d50"}`,
          }}
        >
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
                color: cp.allPass ? "#005249" : "#ef4444",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              {cp.allPass ? "✅" : "❌"}
            </span>
            <span style={{ color: T.text, fontSize: 10 }}>{cp.label}</span>
          </div>
          {cp.invariants.map((inv, j) => (
            <div
              key={j}
              style={{
                fontSize: 8,
                color: inv.pass ? T.textMuted : "#ef4444",
                paddingLeft: 22,
              }}
            >
              {inv.pass ? "✓" : "✗"} {inv.name}: {inv.actual} ({inv.detail})
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── User Row Component ─────────────────────────────────────────── */

function UserRow({
  T,
  userKey,
  label,
  role,
  email,
  password,
  isActive,
  busy,
  onLogin,
  onLogout,
}: {
  T: any;
  userKey: string;
  label: string;
  role: string;
  email: string;
  password: string;
  isActive: boolean;
  busy: boolean;
  onLogin: (
    key: string,
    role: string,
    label: string,
    email: string,
    password: string,
  ) => void;
  onLogout: (key: string) => void;
}) {
  // Check token on mount

  const loggedIn = isActive;
  const roleColor =
    role === "driver"
      ? "#378ADD"
      : role === "agent"
        ? "#F59E0B"
        : role === "admin"
          ? "#ef4444"
          : "#14B8A6";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 4px",
      }}
    >
      <Circle
        size={7}
        style={{
          color: isActive || loggedIn ? T.accent : T.border,
          fill: isActive || loggedIn ? T.accent : "transparent",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 9,
          color: T.text,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 7,
          color: roleColor,
          fontWeight: 600,
          textTransform: "uppercase",
          minWidth: 35,
          textAlign: "right",
        }}
      >
        {role}
      </span>
      {isActive ? (
        <button
          onClick={() => onLogout(userKey)}
          style={btnSm(T.border, T.text)}
        >
          <LogOut size={9} />
        </button>
      ) : (
        <button
          onClick={() => onLogin(userKey, role, label, email, password)}
          disabled={busy}
          style={btnSm(T.border, busy ? T.textDim : T.text)}
        >
          {busy ? <Clock size={9} /> : <LogIn size={9} />}
        </button>
      )}
    </div>
  );
}

function btnStyle(bg: string, fg: string, T?: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    borderRadius: 5,
    background: bg,
    color: fg,
    border: "none",
    cursor: "pointer",
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: 600,
  };
}

function btnSm(bg: string, fg: string, T?: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 4,
    background: bg,
    color: fg,
    border: "none",
    cursor: "pointer",
    padding: 0,
  };
}
