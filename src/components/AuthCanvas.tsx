"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { AuthStepType, TokenState, OtpState } from "@/types/auth";
import { useTheme, type ThemeTokens } from "@/hooks/useTheme";

/* ─────────────────────────────────────────────────────────────────────────
   Step metadata
───────────────────────────────────────────────────────────────────────── */

const STEP_COLORS: Record<AuthStepType, string> = {
  "send-otp": "#378ADD",
  "verify-otp": "#BA7517",
  "otp-verified": "#1D9E75",
  "otp-failed": "#EF4444",
  "resend-otp": "#8B5CF6",
  "token-issued": "#1D9E75",
  "token-refreshed": "#F59E0B",
  "token-expired": "#EF4444",
  logout: "#6B7280",
  "complete-account": "#378ADD",
  "login-password": "#378ADD",
  "login-success": "#1D9E75",
  "login-failed": "#EF4444",
  info: "#6B7280",
};

const STEP_LABELS: Record<AuthStepType, string> = {
  "send-otp": "Send OTP",
  "verify-otp": "Verify OTP",
  "otp-verified": "OTP Verified",
  "otp-failed": "OTP Failed",
  "resend-otp": "Resend OTP",
  "token-issued": "Token Issued",
  "token-refreshed": "Token Refreshed",
  "token-expired": "Token Expired",
  logout: "Logout",
  "complete-account": "Complete Account",
  "login-password": "Password Login",
  "login-success": "Login Success",
  "login-failed": "Login Failed",
  info: "Info",
};

const STEP_DESCRIPTIONS: Record<AuthStepType, string> = {
  "send-otp":
    "Client sends an OTP request to Noscera's auth provider with the user's email address.",
  "verify-otp":
    "Client submits the one-time password entered by the user for verification.",
  "otp-verified":
    "Noscera confirms the OTP is valid, creates a login session, and issues auth tokens.",
  "otp-failed":
    "The submitted OTP did not match or has expired. Authentication attempt rejected.",
  "resend-otp":
    "Client requests a new OTP code to be sent to the user's email.",
  "token-issued":
    "Auth tokens (access + refresh) issued and delivered to the OtoParking backend.",
  "token-refreshed":
    "Expired access token successfully renewed using the refresh token.",
  "token-expired":
    "Access token TTL reached zero. Session requires re-authentication or token refresh.",
  logout:
    "User session terminated. Tokens revoked and session cleared from OtoParking backend.",
  "complete-account":
    "Post-auth account setup completed. Profile details synchronized with OtoParking.",
  "login-password":
    "Email + password sent to auth endpoint. Backend validates and issues JWT.",
  "login-success":
    "Credentials accepted. Access token stored and ready for authenticated API calls.",
  "login-failed":
    "Credentials rejected. Invalid email/password or account disabled.",
  info: "Informational event — no auth state change.",
};

/* ─────────────────────────────────────────────────────────────────────────
   Actor active steps
───────────────────────────────────────────────────────────────────────── */

const CLIENT_ACTIVE_STEPS: AuthStepType[] = [
  "send-otp",
  "verify-otp",
  "resend-otp",
  "login-password",
];
const NOSCERA_ACTIVE_STEPS: AuthStepType[] = [
  "otp-verified",
  "otp-failed",
  "token-issued",
  "token-refreshed",
  "complete-account",
];
const OTOPARKING_ACTIVE_STEPS: AuthStepType[] = [
  "token-issued",
  "token-refreshed",
  "login-password",
  "login-success",
  "login-failed",
  "logout",
  "complete-account",
];

const PASSWORD_STEPS: AuthStepType[] = [
  "login-password",
  "login-success",
  "login-failed",
];

function isPasswordFlow(step: AuthStepType | null): boolean {
  return step !== null && PASSWORD_STEPS.includes(step);
}

/* Arrow label per step (arrow1 = Client→Noscera, arrow2 = Noscera→OtoParking) */
function getArrowLabels(step: AuthStepType | null): {
  arrow1: string;
  arrow2: string;
} {
  if (!step) return { arrow1: "", arrow2: "" };
  switch (step) {
    case "send-otp":
    case "resend-otp":
      return { arrow1: "OTP Request", arrow2: "" };
    case "verify-otp":
      return { arrow1: "Verify Code", arrow2: "" };
    case "otp-verified":
      return { arrow1: "Token Response", arrow2: "Token Relay" };
    case "token-issued":
      return { arrow1: "", arrow2: "Token Issued" };
    case "token-refreshed":
      return { arrow1: "Refresh", arrow2: "New Token" };
    case "login-password":
      return { arrow1: "Login Request", arrow2: "" };
    case "login-success":
      return { arrow1: "Token Issued", arrow2: "" };
    case "logout":
      return { arrow1: "", arrow2: "Session End" };
    default:
      return { arrow1: "", arrow2: "" };
  }
}

const DIGIT_PLACEHOLDERS = ["•", "•", "•", "•", "•", "•"];

/* ─────────────────────────────────────────────────────────────────────────
   Event chip color helper
───────────────────────────────────────────────────────────────────────── */

function getEventChipColor(event: string, T: ThemeTokens): string {
  if (event.includes("ERROR") || event.includes("FAIL")) return T.red;
  if (
    event.includes("DONE") ||
    event.includes("WORKFLOW") ||
    event.includes("SUCCESS")
  )
    return T.green;
  if (event.includes("OTP") || event.includes("SEND")) return T.blue;
  if (event.includes("REFRESH") || event.includes("TOKEN")) return T.amber;
  if (event.includes("LOGOUT") || event.includes("EXPIRE")) return "#6B7280";
  return T.textDim;
}

/* ─────────────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────────────── */

interface AuthCanvasProps {
  token: TokenState;
  otp: OtpState;
  activeStep: AuthStepType | null;
  currentStepId: string;
  running: boolean;
  log: Array<{ event: string; detail: string; timestamp: Date }>;
}

/* ═════════════════════════════════════════════════════════════════════════
   AuthCanvas — main component
═════════════════════════════════════════════════════════════════════════ */

export default function AuthCanvas({
  token,
  otp,
  activeStep,
  currentStepId,
  running,
  log,
}: AuthCanvasProps) {
  const T = useTheme();

  /* ── OTP countdown ─────────────────────────────────────────────────── */
  const [otpRemainingSecs, setOtpRemainingSecs] = useState<number | null>(null);
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      if (otp.expiresAt) {
        setOtpRemainingSecs(
          Math.max(0, Math.floor((otp.expiresAt - Date.now()) / 1000)),
        );
      } else {
        setOtpRemainingSecs(null);
      }
    };
    tick();
    otpTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, [otp.expiresAt]);

  /* ── Derived actor activity ────────────────────────────────────────── */
  const clientActive =
    activeStep !== null && CLIENT_ACTIVE_STEPS.includes(activeStep);
  const nosceraActive =
    activeStep !== null && NOSCERA_ACTIVE_STEPS.includes(activeStep);
  const otoparkingActive =
    activeStep !== null && OTOPARKING_ACTIVE_STEPS.includes(activeStep);

  const arrow1Active = clientActive || nosceraActive;
  const arrow2Active = nosceraActive || otoparkingActive;

  const arrowLabels = getArrowLabels(activeStep);

  /* ── Token state helpers ───────────────────────────────────────────── */
  const ttlPct = Math.min(100, Math.max(0, (token.expiresIn / 3600) * 100));
  const ttlColor = token.expiresIn > 300 ? T.green : T.red;

  const tokenStatusColor =
    token.status === "active"
      ? T.green
      : token.status === "refreshing"
        ? T.amber
        : token.status === "expired"
          ? T.red
          : token.status === "logged-out"
            ? "#6B7280"
            : T.textDim;

  const tokenBorderColor =
    token.status === "active"
      ? "rgba(29,158,117,0.35)"
      : token.status === "refreshing"
        ? "rgba(245,158,11,0.30)"
        : token.status === "expired"
          ? "rgba(239,68,68,0.35)"
          : T.border;

  const tokenLeftAccent = token.status === "active" ? T.green : "transparent";

  const tokenStatusLabel =
    token.status === "active"
      ? "ACTIVE"
      : token.status === "refreshing"
        ? "REFRESHING"
        : token.status === "expired"
          ? "EXPIRED"
          : token.status === "logged-out"
            ? "LOGGED OUT"
            : "NONE";

  /* ── OTP state helpers ─────────────────────────────────────────────── */
  const otpFailed = activeStep === "otp-failed";
  const otpBorderColor = otp.otpVerified
    ? "rgba(29,158,117,0.5)"
    : otpFailed
      ? "rgba(239,68,68,0.5)"
      : otp.otpSent
        ? "rgba(55,138,221,0.35)"
        : T.border;

  /* ═══════════════════════════════════════════════════════════════════
     Render
  ═══════════════════════════════════════════════════════════════════ */
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
      {/* ══════════════════════════════════════════════════════════════
          Zone 1 — Header bar (44px)
      ══════════════════════════════════════════════════════════════ */}
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
        {/* Left: running dot + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div
            animate={
              running
                ? {
                    backgroundColor: [T.accent, `${T.accent}66`, T.accent],
                    boxShadow: [
                      `0 0 8px ${T.accent}cc`,
                      `0 0 3px ${T.accent}33`,
                      `0 0 8px ${T.accent}cc`,
                    ],
                  }
                : { backgroundColor: T.textDim, boxShadow: "none" }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: T.text,
            }}
          >
            Auth Engine
          </span>
        </div>

        {/* Right: animated status badge */}
        <AnimatePresence mode="wait">
          {running && activeStep ? (
            <motion.div
              key={`running-${activeStep}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <motion.div
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: STEP_COLORS[activeStep],
                  boxShadow: `0 0 6px ${STEP_COLORS[activeStep]}99`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: STEP_COLORS[activeStep],
                }}
              >
                {STEP_LABELS[activeStep]}
              </span>
            </motion.div>
          ) : token.status === "active" ? (
            <motion.div
              key="session-active"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <CheckCircle2 size={10} color={T.green} />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: T.green,
                }}
              >
                SESSION ACTIVE
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  color: T.textDim,
                }}
              >
                IDLE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Zone 2 — Actor diagram
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 20px 10px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            height: 120,
          }}
        >
          {/* Client actor */}
          <ActorCard
            label="Client"
            subLabel="Mobile App / Browser"
            endpoint="Mobile App / Browser"
            icon={<Smartphone size={20} />}
            color={T.blue}
            isActive={clientActive}
            theme={T}
          />

          {isPasswordFlow(activeStep) ? (
            <>
              <SignalArrow
                isActive={clientActive || otoparkingActive}
                label={arrowLabels.arrow1}
                theme={T}
              />
              <ActorCard
                label="OtoParking"
                subLabel="Backend Server"
                endpoint="POST /api/backend"
                icon={<Key size={20} />}
                color={T.green}
                isActive={otoparkingActive}
                theme={T}
              />
            </>
          ) : (
            <>
              <SignalArrow
                isActive={arrow1Active}
                label={arrowLabels.arrow1}
                theme={T}
              />
              <ActorCard
                label="Noscera"
                subLabel="Auth Provider"
                endpoint="POST /auth/login · /verify"
                icon={<Shield size={20} />}
                color={T.purple}
                isActive={nosceraActive}
                theme={T}
              />
              <SignalArrow
                isActive={arrow2Active}
                label={arrowLabels.arrow2}
                theme={T}
              />
              <ActorCard
                label="OtoParking"
                subLabel="Backend Server"
                endpoint="POST /api/backend"
                icon={<Key size={20} />}
                color={T.green}
                isActive={otoparkingActive}
                theme={T}
              />
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Zone 3 — Live State Cards
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px 10px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 10,
        }}
      >
        {/* OTP Card — hidden for password flows */}
        {!isPasswordFlow(activeStep) && (
          <motion.div
            animate={{ borderColor: otpBorderColor }}
            transition={{ duration: 0.35 }}
            style={{
              flex: 1,
              background: T.card,
              border: `1px solid ${otpBorderColor}`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {/* OTP card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.textMuted,
                }}
              >
                One-Time Password
              </span>
              {/* Countdown with clock icon */}
              {otp.otpSent && !otp.otpVerified && otpRemainingSecs !== null && (
                <motion.div
                  animate={{ opacity: [1, 0.45, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Clock size={9} color={T.amber} />
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: T.amber,
                    }}
                  >
                    {otpRemainingSecs}s
                  </span>
                </motion.div>
              )}
            </div>

            {/* Digit boxes */}
            <div
              style={{
                display: "flex",
                gap: 5,
                justifyContent: "center",
                marginBottom: 9,
              }}
            >
              {DIGIT_PLACEHOLDERS.map((placeholder, i) => {
                const showDigit = otp.otpSent || otp.otpVerified || otpFailed;
                const borderColor = otp.otpVerified
                  ? T.green
                  : otpFailed
                    ? T.red
                    : otp.otpSent
                      ? T.accent
                      : T.border;
                const bg = otp.otpVerified
                  ? "rgba(29,158,117,0.14)"
                  : otpFailed
                    ? "rgba(239,68,68,0.12)"
                    : otp.otpSent
                      ? `${T.accent}14`
                      : T.card;
                const textColor = otp.otpVerified
                  ? T.green
                  : otpFailed
                    ? T.red
                    : otp.otpSent
                      ? T.accent
                      : T.textDim;

                return (
                  <motion.div
                    key={i}
                    animate={otpFailed ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
                    transition={
                      otpFailed
                        ? { duration: 0.4, delay: i * 0.04 }
                        : { duration: 0.3 }
                    }
                    style={{
                      width: 34,
                      height: 42,
                      borderRadius: 7,
                      border: `1.5px solid ${borderColor}`,
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: textColor,
                      boxShadow:
                        otp.otpSent && !otp.otpVerified && !otpFailed
                          ? `inset 0 0 8px ${T.accent}18`
                          : otp.otpVerified
                            ? `inset 0 0 8px rgba(29,158,117,0.15)`
                            : otpFailed
                              ? `inset 0 0 8px rgba(239,68,68,0.12)`
                              : "none",
                    }}
                  >
                    {showDigit ? (
                      otp.otpVerified ? (
                        <CheckCircle2 size={13} color={T.green} />
                      ) : otpFailed ? (
                        <XCircle size={13} color={T.red} />
                      ) : (
                        placeholder
                      )
                    ) : (
                      "—"
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Status pill */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 9,
              }}
            >
              <AnimatePresence mode="wait">
                {otp.otpVerified ? (
                  <motion.div
                    key="verified"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.12 },
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      color: T.green,
                      background: "rgba(29,158,117,0.14)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    <CheckCircle2 size={8} />
                    VERIFIED
                  </motion.div>
                ) : otpFailed ? (
                  <motion.div
                    key="failed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.12 },
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      color: T.red,
                      background: "rgba(239,68,68,0.12)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    <XCircle size={8} />
                    FAILED
                  </motion.div>
                ) : otp.otpSent ? (
                  <motion.div
                    key="awaiting"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.1 },
                    }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      color: T.amber,
                      background: "rgba(245,158,11,0.12)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    <Clock size={8} />
                    AWAITING
                  </motion.div>
                ) : (
                  <motion.div
                    key="not-sent"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.12 },
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      color: T.textDim,
                      background: T.borderSubtle,
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    NOT SENT
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer: email + attempts */}
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
                  fontFamily: "monospace",
                  color: T.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "65%",
                }}
              >
                {otp.email || "—"}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: otp.attempts > 0 ? T.amber : T.textDim,
                  flexShrink: 0,
                }}
              >
                {otp.attempts}/3
              </span>
            </div>
          </motion.div>
        )}

        {/* Token Card */}
        <motion.div
          animate={{
            borderColor: tokenBorderColor,
            boxShadow:
              token.status === "active"
                ? "0 0 0 1px rgba(29,158,117,0.15)"
                : "none",
          }}
          transition={{ duration: 0.4 }}
          style={{
            flex: 1,
            background: T.card,
            border: `1px solid ${tokenBorderColor}`,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
          }}
        >
          {/* Left accent stripe for ACTIVE status */}
          <motion.div
            animate={{ background: tokenLeftAccent }}
            transition={{ duration: 0.4 }}
            style={{ width: 3, flexShrink: 0 }}
          />

          {/* Card content */}
          <div style={{ flex: 1, padding: "12px 14px" }}>
            {/* Token card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 11,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.textMuted,
                }}
              >
                Auth Token
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={token.status}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: tokenStatusColor,
                    background: `${tokenStatusColor}1a`,
                    padding: "3px 8px",
                    borderRadius: 20,
                  }}
                >
                  {tokenStatusLabel}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Token bars */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <TokenBar
                label="Access"
                fillPct={token.accessToken ? 100 : 0}
                color={T.blue}
                valueLabel={
                  token.accessToken
                    ? token.accessToken.slice(0, 10) + "…"
                    : null
                }
                theme={T}
              />
              <TokenBar
                label="Refresh"
                fillPct={token.refreshToken ? 100 : 0}
                color={T.escrow}
                valueLabel={
                  token.refreshToken
                    ? token.refreshToken.slice(0, 10) + "…"
                    : null
                }
                theme={T}
              />
              <TokenBar
                label="TTL"
                fillPct={ttlPct}
                color={ttlColor}
                valueLabel={token.expiresIn > 0 ? `${token.expiresIn}s` : null}
                theme={T}
              />
            </div>

            {/* Session ID row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingTop: 8,
                borderTop: `1px solid ${T.borderSubtle}`,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: T.textMuted,
                  width: 48,
                  flexShrink: 0,
                }}
              >
                Session
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: token.sessionId ? T.text : T.textDim,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {token.sessionId ?? "—"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Zone 4 — Step feed (scrollable)
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {/* Idle placeholder */}
        {!activeStep && log.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: T.textDim,
                textAlign: "center",
                letterSpacing: "0.03em",
              }}
            >
              Select a workflow from the panel to begin
            </span>
          </div>
        )}

        {/* Active step hero card */}
        <AnimatePresence>
          {activeStep && (
            <motion.div
              key={`active-${currentStepId}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                background: `${STEP_COLORS[activeStep]}10`,
                border: `1px solid ${STEP_COLORS[activeStep]}40`,
                borderRadius: 11,
                overflow: "hidden",
                display: "flex",
                flexShrink: 0,
              }}
            >
              {/* Left vertical accent stripe */}
              <div
                style={{
                  width: 4,
                  background: STEP_COLORS[activeStep],
                  flexShrink: 0,
                }}
              />
              <div style={{ padding: "11px 14px", flex: 1 }}>
                {/* NOW badge + step label + LIVE dot */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: STEP_COLORS[activeStep],
                      background: `${STEP_COLORS[activeStep]}22`,
                      padding: "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    NOW
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: STEP_COLORS[activeStep],
                      fontFamily: "monospace",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {STEP_LABELS[activeStep]}
                  </span>
                  <div style={{ flex: 1 }} />
                  {/* LIVE pulsing dot */}
                  <motion.div
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.85, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STEP_COLORS[activeStep],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 7.5,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: STEP_COLORS[activeStep],
                      opacity: 0.75,
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 9.5,
                    lineHeight: 1.55,
                    color: T.textMuted,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {STEP_DESCRIPTIONS[activeStep]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History entries */}
        <AnimatePresence initial={false}>
          {log.slice(0, 25).map((entry, i) => {
            const chipColor = getEventChipColor(entry.event, T);
            const ts = entry.timestamp;
            const hh = String(ts.getHours()).padStart(2, "0");
            const mm = String(ts.getMinutes()).padStart(2, "0");
            const ss = String(ts.getSeconds()).padStart(2, "0");

            return (
              <motion.div
                key={`${entry.timestamp.getTime()}-${i}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  paddingLeft: 0,
                }}
              >
                {/* Timestamp */}
                <span
                  style={{
                    fontSize: 7.5,
                    fontFamily: "monospace",
                    color: T.textDim,
                    flexShrink: 0,
                    width: 54,
                    paddingTop: 2,
                  }}
                >
                  {hh}:{mm}:{ss}
                </span>

                {/* Event chip */}
                <span
                  style={{
                    fontSize: 7.5,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: chipColor,
                    background: `${chipColor}18`,
                    padding: "1px 7px",
                    borderRadius: 10,
                    flexShrink: 0,
                    maxWidth: 90,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    alignSelf: "flex-start",
                    marginTop: 1,
                  }}
                >
                  {entry.event}
                </span>

                {/* Detail text */}
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "system-ui, sans-serif",
                    color: T.textMuted,
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {entry.detail}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────────────── */

/* ── ActorCard ─────────────────────────────────────────────────────────── */

interface ActorCardProps {
  label: string;
  subLabel: string;
  endpoint: string;
  icon: React.ReactNode;
  color: string;
  isActive: boolean;
  theme: ThemeTokens;
}

function ActorCard({
  label,
  subLabel,
  endpoint,
  icon,
  color,
  isActive,
  theme: T,
}: ActorCardProps) {
  return (
    <motion.div
      animate={{
        background: isActive ? `${color}14` : T.card,
        borderColor: isActive ? color : T.border,
        boxShadow: isActive
          ? `0 0 20px ${color}30, 0 0 6px ${color}20`
          : "none",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        flex: 1,
        minHeight: 120,
        borderRadius: 14,
        padding: "14px 12px 12px",
        border: `1.5px solid ${isActive ? color : T.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      {/* Icon circle with animated glow */}
      <motion.div
        animate={{
          background: isActive ? `${color}22` : T.borderSubtle,
          boxShadow: isActive ? `0 0 14px ${color}44` : "none",
          color: isActive ? color : T.textDim,
        }}
        transition={{ duration: 0.3 }}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </motion.div>

      {/* Actor label */}
      <motion.span
        animate={{ color: isActive ? color : T.text }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 12,
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {label}
      </motion.span>

      {/* Sub-label role badge */}
      <span
        style={{
          fontSize: 9,
          fontFamily: "monospace",
          color: T.textDim,
          letterSpacing: "0.03em",
          textAlign: "center",
          background: T.borderSubtle,
          padding: "2px 8px",
          borderRadius: 20,
          lineHeight: 1.3,
        }}
      >
        {subLabel}
      </span>

      {/* Endpoint label */}
      <span
        style={{
          fontSize: 7.5,
          fontFamily: "monospace",
          color: isActive ? `${color}bb` : T.textDim,
          letterSpacing: "0.02em",
          textAlign: "center",
          lineHeight: 1.3,
          opacity: 0.9,
        }}
      >
        {endpoint}
      </span>
    </motion.div>
  );
}

/* ── SignalArrow ───────────────────────────────────────────────────────── */

interface SignalArrowProps {
  isActive: boolean;
  label: string;
  theme: ThemeTokens;
}

function SignalArrow({ isActive, label, theme: T }: SignalArrowProps) {
  const ARROW_WIDTH = 76;
  const LINE_WIDTH = ARROW_WIDTH - 10;

  return (
    <div
      style={{
        width: ARROW_WIDTH,
        minHeight: 120,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        gap: 6,
      }}
    >
      {/* Directional label above the line */}
      <AnimatePresence mode="wait">
        {isActive && label ? (
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: 7.5,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: T.accent,
              textAlign: "center",
              whiteSpace: "nowrap",
              maxWidth: ARROW_WIDTH + 10,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </motion.span>
        ) : (
          <span style={{ height: 14 }} />
        )}
      </AnimatePresence>

      {/* Arrow line */}
      <div
        style={{
          position: "relative",
          width: LINE_WIDTH,
          height: 2,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Base line */}
        <motion.div
          animate={{
            background: isActive
              ? `linear-gradient(90deg, ${T.accent}55, ${T.accent}cc)`
              : T.border,
            boxShadow: isActive ? `0 0 10px ${T.accent}44` : "none",
          }}
          transition={{ duration: 0.35 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "100%",
            borderRadius: 2,
          }}
        />

        {/* Flowing highlight overlay */}
        {isActive && (
          <motion.div
            animate={{ x: [-LINE_WIDTH, LINE_WIDTH] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              left: 0,
              width: 24,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
              borderRadius: 1,
            }}
          />
        )}

        {/* Traveling pulse dot — 8px, bright */}
        {isActive && (
          <motion.div
            initial={{ x: 0, opacity: 0 }}
            animate={{
              x: [0, LINE_WIDTH - 10],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: T.accent,
              boxShadow: `0 0 10px ${T.accent}cc, 0 0 4px ${T.accent}`,
            }}
          />
        )}

        {/* Arrowhead */}
        <motion.div
          animate={{
            borderLeftColor: isActive ? T.accent : T.border,
          }}
          transition={{ duration: 0.35 }}
          style={{
            position: "absolute",
            right: -5,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderLeft: `7px solid ${isActive ? T.accent : T.border}`,
          }}
        />
      </div>
    </div>
  );
}

/* ── TokenBar ──────────────────────────────────────────────────────────── */

interface TokenBarProps {
  label: string;
  fillPct: number;
  color: string;
  valueLabel: string | null;
  theme: ThemeTokens;
}

function TokenBar({
  label,
  fillPct,
  color,
  valueLabel,
  theme: T,
}: TokenBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Label */}
      <span
        style={{
          fontSize: 8.5,
          fontFamily: "monospace",
          color: T.textMuted,
          width: 46,
          flexShrink: 0,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>

      {/* Bar track */}
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: T.borderSubtle,
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 3,
            background: color,
            opacity: 0.9,
          }}
        />
      </div>

      {/* Value */}
      {valueLabel && (
        <span
          style={{
            fontSize: 8,
            fontFamily: "monospace",
            color: T.textMuted,
            width: 60,
            flexShrink: 0,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {valueLabel}
        </span>
      )}
    </div>
  );
}
