"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthScenario, AuthLogEntry } from "@/types/auth";
import { AUTH_SCENARIOS } from "@/app/modules/auth/scenarios";
import { AUTH_WORKFLOWS, type AuthWorkflow } from "@/lib/auth-workflows";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RotateCcw,
  History,
  Key,
  Shield,
  ChevronRight,
  User,
  Building2,
  Settings,
  Copy,
  CheckCheck,
  Activity,
  Zap,
  Lock,
} from "lucide-react";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuthControlPanelProps {
  onRunScenario: (scenario: AuthScenario) => void;
  onRunWorkflow: (workflow: AuthWorkflow) => void;
  onReset: () => void;
  log: AuthLogEntry[];
  running: boolean;
  waitingForOtp: boolean;
  onSubmitOtpCode: (code: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "otp", label: "OTP" },
  { value: "token", label: "Tokens" },
  { value: "account", label: "Account" },
] as const;
type CategoryValue = (typeof CATEGORIES)[number]["value"];

function categorize(s: AuthScenario): string {
  if (
    [
      "send-otp-email",
      "send-otp-phone",
      "verify-otp-success",
      "verify-otp-fail",
      "resend-otp",
    ].includes(s.id)
  )
    return "otp";
  if (["refresh-token", "logout"].includes(s.id)) return "token";
  return "account";
}

function accentForCategory(cat: string, T: ThemeTokens): string {
  if (cat === "otp") return T.purple;
  if (cat === "token") return T.amber;
  return T.blue;
}

function eventColor(event: string, T: ThemeTokens): string {
  const e = event.toUpperCase();
  if (["START", "DONE", "WORKFLOW"].some((k) => e.includes(k))) return T.accent;
  if (e.includes("SEND OTP")) return T.blue;
  if (e.includes("VERIFY OTP") && !e.includes("VERIFIED")) return T.purple;
  if (
    e.includes("OTP VERIFIED") ||
    e.includes("TOKEN ISSUED") ||
    e.includes("LOGIN SUCCESS")
  )
    return T.green;
  if (
    e.includes("OTP FAILED") ||
    e.includes("TOKEN EXPIRED") ||
    e.includes("LOGIN FAILED") ||
    e.includes("API ERROR")
  )
    return T.red;
  if (e.includes("TOKEN REFRESHED")) return T.amber;
  if (e.includes("LOGOUT")) return T.textDim;
  if (e === "API") return T.blue;
  if (e.includes("WAIT")) return T.amber;
  if (e.includes("INPUT")) return T.purple;
  if (e.includes("INFO")) return T.textMuted;
  return T.textMuted;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider({ T }: { T: ThemeTokens }) {
  return (
    <div
      style={{
        height: 1,
        background: T.borderSubtle,
        margin: "0 12px",
        flexShrink: 0,
      }}
    />
  );
}

// Test accounts credential table
const TEST_ACCOUNTS = [
  {
    role: "Driver",
    email: "akarog20230@gmail.com",
    password: "TestDriver123!",
    api: "POST /auth/login",
    color: "#378ADD",
    Icon: User,
  },
  {
    role: "Tenant",
    email: "tenant@otoparking.ma",
    password: "TestTenant123!",
    api: "POST /api/admin/auth/login",
    color: "#8B5CF6",
    Icon: Building2,
  },
  {
    role: "Admin",
    email: "admin@otoparking.ma",
    password: "TestAdmin123!",
    api: "POST /api/admin/auth/login",
    color: "#1D9E75",
    Icon: Settings,
  },
];

function TestAccountsSection({
  T,
  copiedRole,
  onCopy,
}: {
  T: ThemeTokens;
  copiedRole: string | null;
  onCopy: (role: string, email: string, password: string) => void;
}) {
  return (
    <div style={{ padding: "10px 12px 12px" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
        }}
      >
        <Lock size={10} style={{ color: T.textDim, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: T.textDim,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Test Credentials
        </span>
      </div>

      {/* Credential table card */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {TEST_ACCOUNTS.map((a, i) => (
          <motion.div
            key={a.role}
            whileHover={{ backgroundColor: T.cardHover }}
            transition={{ duration: 0.15 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderBottom:
                i < TEST_ACCOUNTS.length - 1
                  ? `1px solid ${T.borderSubtle}`
                  : "none",
              cursor: "default",
            }}
          >
            {/* Role icon circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `${a.color}26`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <a.Icon size={13} style={{ color: a.color }} />
            </div>

            {/* Middle: role + email + api */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: "0.02em",
                }}
              >
                {a.role}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: T.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.email}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: T.textDim,
                }}
              >
                {a.api}
              </span>
            </div>

            {/* Copy button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onCopy(a.role, a.email, a.password)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "transparent",
                border: `1px solid ${T.borderSubtle}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                color: copiedRole === a.role ? T.green : T.textDim,
                transition: "color 0.2s, border-color 0.2s",
              }}
              title={`Copy ${a.role} credentials`}
            >
              {copiedRole === a.role ? (
                <CheckCheck size={11} />
              ) : (
                <Copy size={11} />
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// OTP entry card
function OtpEntryCard({
  T,
  otpInput,
  setOtpInput,
  onSubmit,
}: {
  T: ThemeTokens;
  otpInput: string;
  setOtpInput: (v: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = otpInput.length === 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{
        margin: "0 12px 12px",
        borderRadius: 10,
        background: T.card,
        border: `1px solid ${T.purple}60`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Pulse glow */}
      <motion.div
        animate={{ opacity: [0.18, 0.35, 0.18] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 10,
          boxShadow: `0 0 18px 2px ${T.purple}40`,
          pointerEvents: "none",
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 12px 8px",
          borderBottom: `1px solid ${T.purple}30`,
        }}
      >
        {/* Pulsing dot */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: T.purple,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: T.purple,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          OTP Code Required
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px" }}>
        <p
          style={{
            fontSize: 9,
            color: T.textMuted,
            margin: "0 0 10px",
            lineHeight: 1.5,
          }}
        >
          Enter the 6-digit code from the email
        </p>

        {/* Big monospace input */}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpInput}
          onChange={(e) =>
            setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="· · · · · ·"
          style={{
            width: "100%",
            height: 48,
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.32em",
            textAlign: "center",
            color: T.text,
            background: T.bg,
            border: `1.5px solid ${otpInput.length > 0 ? T.purple : T.border}`,
            borderRadius: 8,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
            caretColor: T.purple,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = T.purple;
          }}
          onBlur={(e) => {
            e.target.style.borderColor =
              otpInput.length > 0 ? T.purple : T.border;
          }}
          autoComplete="one-time-code"
        />

        {/* Submit */}
        <motion.button
          whileTap={canSubmit ? { scale: 0.97 } : {}}
          onClick={canSubmit ? onSubmit : undefined}
          disabled={!canSubmit}
          style={{
            marginTop: 8,
            width: "100%",
            height: 36,
            borderRadius: 7,
            background: canSubmit ? T.purple : T.borderSubtle,
            border: "none",
            color: canSubmit ? "#fff" : T.textDim,
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background 0.2s, color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Shield size={12} />
          Submit OTP
        </motion.button>
      </div>
    </motion.div>
  );
}

// Tab switcher
function TabSwitcher({
  tab,
  setTab,
  T,
}: {
  tab: "scenarios" | "workflows";
  setTab: (t: "scenarios" | "workflows") => void;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px 0",
        flexShrink: 0,
      }}
    >
      {(
        [
          { value: "workflows", label: "Workflows", Icon: Zap },
          { value: "scenarios", label: "Scenarios", Icon: Activity },
        ] as const
      ).map(({ value, label, Icon }) => {
        const isActive = tab === value;
        return (
          <motion.button
            key={value}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTab(value)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              height: 28,
              borderRadius: 6,
              background: isActive ? T.accentBg : "transparent",
              border: `1px solid ${isActive ? T.borderActive : T.borderSubtle}`,
              color: isActive ? T.accent : T.textDim,
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <Icon size={10} />
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

// Category chips (for scenarios tab)
function CategoryChips({
  activeCategory,
  setActiveCategory,
  T,
}: {
  activeCategory: CategoryValue;
  setActiveCategory: (v: CategoryValue) => void;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        padding: "8px 12px 4px",
        display: "flex",
        gap: 4,
        flexShrink: 0,
      }}
    >
      {CATEGORIES.map(({ value, label }) => {
        const isActive = activeCategory === value;
        return (
          <motion.button
            key={value}
            whileTap={{ scale: 0.93 }}
            onClick={() => setActiveCategory(value)}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 5,
              background: isActive ? T.accentBg : "transparent",
              border: `1px solid ${isActive ? T.borderActive : T.borderSubtle}`,
              color: isActive ? T.accent : T.textDim,
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.05em",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

// Workflow card
function WorkflowCard({
  workflow,
  onRun,
  running,
  T,
}: {
  workflow: AuthWorkflow;
  onRun: () => void;
  running: boolean;
  T: ThemeTokens;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={!running ? { x: 2 } : {}}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={!running ? onRun : undefined}
      style={{
        borderRadius: 8,
        background: T.card,
        border: `1px solid ${hovered && !running ? T.borderActive : T.border}`,
        cursor: running ? "not-allowed" : "pointer",
        opacity: running ? 0.5 : 1,
        padding: "9px 10px",
        transition: "border-color 0.18s, background 0.18s",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <Zap size={11} style={{ color: T.accent, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            color: T.text,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {workflow.name}
        </span>
        {/* Step count badge */}
        <span
          style={{
            padding: "1px 5px",
            borderRadius: 4,
            background: T.accentBg,
            border: `1px solid ${T.borderActive}`,
            fontFamily: "monospace",
            fontSize: 8,
            fontWeight: 700,
            color: T.accent,
            flexShrink: 0,
          }}
        >
          {workflow.steps.length}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 9,
          color: T.textMuted,
          margin: "0 0 7px",
          lineHeight: 1.45,
        }}
      >
        {workflow.description}
      </p>

      {/* Step chain chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 3,
        }}
      >
        {workflow.steps.map((stepId, i) => (
          <div
            key={stepId}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 7.5,
                padding: "2px 5px",
                borderRadius: 3,
                background: `${T.accent}14`,
                border: `1px solid ${T.accent}28`,
                color: T.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {i + 1}. {stepId}
            </span>
            {i < workflow.steps.length - 1 && (
              <ChevronRight
                size={8}
                style={{ color: T.textDim, flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Scenario card
function ScenarioCard({
  scenario,
  onRun,
  running,
  T,
}: {
  scenario: AuthScenario;
  onRun: () => void;
  running: boolean;
  T: ThemeTokens;
}) {
  const cat = categorize(scenario);
  const color = accentForCategory(cat, T);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16 }}
      whileHover={!running ? { x: 1 } : {}}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={!running ? onRun : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        borderRadius: 8,
        overflow: "hidden",
        background: hovered && !running ? T.cardHover : T.card,
        border: `1px solid ${hovered && !running ? `${color}66` : T.border}`,
        cursor: running ? "not-allowed" : "pointer",
        opacity: running ? 0.5 : 1,
        transition: "border-color 0.18s, background 0.18s",
      }}
    >
      {/* Left accent stripe */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: color,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: "8px 9px", minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.text,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {scenario.name}
          </span>

          {/* Steps badge */}
          <span
            style={{
              padding: "1px 4px",
              borderRadius: 3,
              background: `${color}18`,
              border: `1px solid ${color}38`,
              fontSize: 7.5,
              fontFamily: "monospace",
              fontWeight: 700,
              color: color,
              flexShrink: 0,
            }}
          >
            {scenario.steps.length}
          </span>

          {/* PRD chip */}
          <span
            style={{
              padding: "1px 4px",
              borderRadius: 3,
              background: T.borderSubtle,
              border: `1px solid ${T.border}`,
              fontSize: 7,
              fontFamily: "monospace",
              color: T.textDim,
              flexShrink: 0,
              letterSpacing: "0.02em",
            }}
          >
            {scenario.prdSection}
          </span>
        </div>

        {/* Description */}
        <p
          style={
            {
              fontSize: 8.5,
              color: T.textMuted,
              margin: 0,
              lineHeight: 1.45,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            } as React.CSSProperties
          }
        >
          {scenario.description}
        </p>
      </div>

      {/* Run arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingRight: 8,
          color: hovered && !running ? color : T.textDim,
          transition: "color 0.18s",
        }}
      >
        <ChevronRight size={14} />
      </div>
    </motion.div>
  );
}

// Log entry row
function LogEntry({ entry, T }: { entry: AuthLogEntry; T: ThemeTokens }) {
  const color = eventColor(entry.event, T);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        padding: "4px 6px",
        borderRadius: 5,
        background: "transparent",
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 7.5,
          color: T.textDim,
          flexShrink: 0,
          width: 52,
          lineHeight: 1.6,
          paddingTop: 1,
        }}
      >
        {formatTime(entry.timestamp)}
      </span>

      {/* Event badge */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          fontWeight: 700,
          color: color,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          padding: "0px 4px",
          borderRadius: 3,
          letterSpacing: "0.04em",
          flexShrink: 0,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
        }}
      >
        {entry.event}
      </span>

      {/* Detail */}
      <span
        style={{
          fontSize: 8.5,
          color: T.textMuted,
          lineHeight: 1.5,
          minWidth: 0,
          wordBreak: "break-word",
        }}
      >
        {entry.detail}
      </span>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AuthControlPanel({
  onRunScenario,
  onRunWorkflow,
  onReset,
  log,
  running,
  waitingForOtp,
  onSubmitOtpCode,
}: AuthControlPanelProps) {
  const T = useTheme();
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all");
  const [otpInput, setOtpInput] = useState("");
  const [tab, setTab] = useState<"scenarios" | "workflows">("workflows");
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  const filtered =
    activeCategory === "all"
      ? AUTH_SCENARIOS
      : AUTH_SCENARIOS.filter((s) => categorize(s) === activeCategory);

  function handleCopy(role: string, email: string, password: string) {
    navigator.clipboard.writeText(`${email} / ${password}`).catch(() => {});
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 2000);
  }

  function handleSubmitOtp() {
    if (otpInput.length === 6) {
      onSubmitOtpCode(otpInput);
      setOtpInput("");
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* ── Panel Header ──────────────────────────────────────── */}
      <div
        style={{
          height: 40,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Left: icon + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Key size={12} style={{ color: T.textDim }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: T.textDim,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Auth Scenarios
          </span>
        </div>

        {/* Right: Reset button */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onReset}
          disabled={running}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            borderRadius: 5,
            background: T.card,
            border: `1px solid ${T.border}`,
            color: T.textMuted,
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.5 : 1,
            fontFamily: "monospace",
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <RotateCcw size={10} />
          Reset
        </motion.button>
      </div>

      {/* ── Scrollable content ────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div style={{ paddingBottom: 16 }}>
          {/* ── Test Accounts ───────────────────────────────────── */}
          <TestAccountsSection
            T={T}
            copiedRole={copiedRole}
            onCopy={handleCopy}
          />

          <Divider T={T} />

          {/* ── OTP Entry (when waitingForOtp) ──────────────────── */}
          <AnimatePresence>
            {waitingForOtp && (
              <>
                <div style={{ height: 10 }} />
                <OtpEntryCard
                  T={T}
                  otpInput={otpInput}
                  setOtpInput={setOtpInput}
                  onSubmit={handleSubmitOtp}
                />
                <Divider T={T} />
              </>
            )}
          </AnimatePresence>

          {/* ── Tab Switcher ─────────────────────────────────────── */}
          <TabSwitcher tab={tab} setTab={setTab} T={T} />

          {/* ── Workflows tab ───────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {tab === "workflows" && (
              <motion.div
                key="workflows"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {AUTH_WORKFLOWS.map((wf) => (
                  <WorkflowCard
                    key={wf.id}
                    workflow={wf}
                    onRun={() => onRunWorkflow(wf)}
                    running={running}
                    T={T}
                  />
                ))}
              </motion.div>
            )}

            {/* ── Scenarios tab ─────────────────────────────────── */}
            {tab === "scenarios" && (
              <motion.div
                key="scenarios"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <CategoryChips
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  T={T}
                />
                <div
                  style={{
                    padding: "6px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  {filtered.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onRun={() => onRunScenario(scenario)}
                      running={running}
                      T={T}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Divider T={T} />

          {/* ── Event Log ───────────────────────────────────────── */}
          <div style={{ padding: "10px 12px 0" }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 6,
              }}
            >
              <History size={10} style={{ color: T.textDim }} />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  color: T.textDim,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Event Log
              </span>
              {log.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "monospace",
                    fontSize: 7.5,
                    color: T.textDim,
                  }}
                >
                  {log.length} entries
                </span>
              )}
            </div>

            {/* Log entries */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {log.length === 0 ? (
                <p
                  style={{
                    fontSize: 9,
                    color: T.textDim,
                    fontStyle: "italic",
                    padding: "4px 6px",
                    margin: 0,
                  }}
                >
                  No events yet — run a scenario or workflow above.
                </p>
              ) : (
                [...log]
                  .slice(-30)
                  .map((entry) => (
                    <LogEntry key={entry.id} entry={entry} T={T} />
                  ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
