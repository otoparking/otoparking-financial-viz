"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  AuthScenario,
  AuthLogEntry,
  AuthStepType,
  TokenState,
  OtpState,
} from "@/types/auth";
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  clearTokens,
  getRefreshToken,
  loginAdmin,
  loginTenant,
  loginDriver,
  completeAccount,
  type AuthRole,
} from "@/lib/auth-service";
import AuthCanvas from "@/components/AuthCanvas";
import AuthControlPanel from "@/components/AuthControlPanel";
import {
  AUTH_WORKFLOWS,
  type AuthWorkflow,
  getAuthWorkflowScenarios,
} from "@/lib/auth-workflows";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const INITIAL_TOKEN: TokenState = {
  accessToken: null,
  refreshToken: null,
  sessionId: null,
  expiresIn: 0,
  status: "none",
};

const INITIAL_OTP: OtpState = {
  loginSessionId: null,
  email: "akarog20230@gmail.com",
  otpSent: false,
  otpVerified: false,
  attempts: 0,
  expiresAt: null,
};

export default function AuthModule({ onActivity }: ModulePageProps) {
  const [token, setToken] = useState<TokenState>(INITIAL_TOKEN);
  const [otp, setOtp] = useState<OtpState>(INITIAL_OTP);
  const [log, setLog] = useState<AuthLogEntry[]>([]);
  const [activeStep, setActiveStep] = useState<AuthStepType | null>(null);
  const [currentStepId, setCurrentStepId] = useState("");
  const [running, setRunning] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false);

  // Resolve function for the OTP-waiting promise
  const otpResolveRef = useRef<((code: string) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Mutable ref so chained workflows always read the latest loginSessionId
  const otpSessionRef = useRef<string | null>(null);
  // Mutable ref so visual steps in the same run can read the token set by API steps
  const tokenRef = useRef<TokenState>(INITIAL_TOKEN);

  // Keep the ref in sync with state so closure reads always get the latest token
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  /** Waits for the tester to type an OTP code in the control panel. */
  const waitForOtpCode = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      otpResolveRef.current = resolve;
      setWaitingForOtp(true);
    });
  }, []);

  /** Called by AuthControlPanel when tester submits an OTP code. */
  const submitOtpCode = useCallback((code: string) => {
    setWaitingForOtp(false);
    otpResolveRef.current?.(code);
    otpResolveRef.current = null;
  }, []);

  const runScenario = useCallback(
    async (scenario: AuthScenario) => {
      clearTimeouts();
      setRunning(true);
      setActiveStep(null);

      onActivity(scenario.name);
      toast(scenario.name, { description: scenario.description });
      addLog("START", `${scenario.name}`);

      try {
        for (const step of scenario.steps) {
          setActiveStep(step.type);
          setCurrentStepId(step.id);

          // ── Execute real API calls based on step type ──────────────

          // Steps that call the backend — log their description upfront
          const isApiStep =
            step.type === "send-otp" ||
            step.type === "verify-otp" ||
            step.type === "resend-otp" ||
            step.type === "login-password" ||
            step.type === "logout" ||
            step.type === "token-refreshed" ||
            step.type === "complete-account" ||
            step.type === "info";
          if (isApiStep) {
            addLog(
              step.type.replace(/-/g, " ").toUpperCase(),
              step.description,
            );
          }

          if (step.type === "send-otp") {
            // New OTP session — invalidate any old token
            setToken(INITIAL_TOKEN);
            setOtp((prev) => ({
              ...prev,
              otpSent: false,
              otpVerified: false,
              attempts: 0,
            }));
            const result = await sendOtp(otp.email);
            if (result.success && result.loginSessionId) {
              const sid = result.loginSessionId ?? null;
              otpSessionRef.current = sid;
              setOtp((prev) => ({
                ...prev,
                otpSent: true,
                loginSessionId: result.loginSessionId ?? null,
                expiresAt: Date.now() + 300_000,
              }));
              addLog(
                "API",
                `OTP sent to ${otp.email} — session: ${result.loginSessionId.slice(0, 8)}...`,
              );
            } else {
              addLog("API ERROR", result.message ?? "Send OTP failed");
              setOtp((prev) => ({ ...prev, otpSent: false }));
            }
          }

          if (step.type === "login-password") {
            // New login session — invalidate any old token
            setToken(INITIAL_TOKEN);
            // Determine which role to log in based on scenario context
            const scenarioId =
              scenario.id === "login-admin"
                ? "admin"
                : scenario.id === "login-tenant"
                  ? "tenant"
                  : "driver";

            const accounts: Record<
              string,
              { email: string; password: string }
            > = {
              admin: {
                email: "admin@otoparking.com",
                password: "Admin@12345",
              },
              tenant: {
                email: "test-tenant@otoparking.com",
                password: "Test-Tenant2026",
              },
              driver: {
                email: "akarog20230@gmail.com",
                password: "password123",
              },
            };
            const acct = accounts[scenarioId];

            let result: {
              success: boolean;
              token?: string;
              message?: string;
            };
            if (scenarioId === "admin") {
              result = await loginAdmin(acct.email, acct.password);
            } else if (scenarioId === "tenant") {
              result = await loginTenant(acct.email, acct.password);
            } else {
              result = await loginDriver(acct.email, acct.password);
            }

            if (result.success && result.token) {
              setToken({
                accessToken: result.token,
                refreshToken: getRefreshToken(scenarioId as AuthRole),
                sessionId: null,
                expiresIn: 86400,
                status: "active",
              });
              addLog(
                "API",
                `${scenarioId} login ✓ — token issued (expires in 86400s)`,
              );
            } else {
              addLog(
                "API ERROR",
                result.message ?? `${scenarioId} login failed`,
              );
            }
          }

          if (step.type === "login-success") {
            if (tokenRef.current.accessToken) {
              addLog(
                "API",
                `Token active — ${tokenRef.current.accessToken.slice(0, 8)}…`,
              );
            } else {
              addLog("INFO", "No token issued — login required first");
            }
          }

          if (step.type === "login-failed") {
            setToken({ ...INITIAL_TOKEN });
          }

          if (step.type === "verify-otp") {
            setOtp((prev) => ({ ...prev, attempts: prev.attempts + 1 }));
            // Wait for tester to type the OTP code
            addLog("WAIT", "Waiting for tester to enter OTP code...");
            const code = await waitForOtpCode();
            addLog("INPUT", `Tester submitted code: ${code}`);

            if (!otpSessionRef.current) {
              addLog("API ERROR", "No login session — run Send OTP first");
              continue;
            }
            const result = await verifyOtp(
              otp.email,
              code,
              otpSessionRef.current,
            );
            if (result.success && result.accessToken) {
              setOtp((prev) => ({ ...prev, otpVerified: true }));
              setToken({
                accessToken: result.accessToken,
                refreshToken: result.refreshToken ?? null,
                sessionId: otp.loginSessionId,
                expiresIn: result.expiresIn ?? 3600,
                status: "active",
              });
              addLog(
                "API",
                `OTP verified ✓ — token issued (expires in ${result.expiresIn ?? 3600}s)`,
              );
            } else {
              setOtp((prev) => ({ ...prev, otpVerified: false }));
              addLog("API ERROR", result.message ?? "OTP verification failed");
            }
          }

          if (step.type === "otp-verified") {
            // Only mark verified if the API actually returned a token
            if (tokenRef.current.accessToken) {
              setOtp((prev) => ({ ...prev, otpVerified: true }));
            } else {
              setOtp((prev) => ({ ...prev, otpVerified: false }));
              addLog("INFO", "OTP verification did not produce a token");
            }
          }

          if (step.type === "otp-failed") {
            setOtp((prev) => ({ ...prev, otpVerified: false, otpSent: false }));
          }

          if (step.type === "resend-otp") {
            // New OTP session — invalidate any old token
            setToken(INITIAL_TOKEN);
            // Backend /auth/resend has a validation issue — reuse /auth/otp/request
            const result = await sendOtp(otp.email);
            if (result.success) {
              setOtp((prev) => ({
                ...prev,
                otpSent: true,
                expiresAt: Date.now() + 300_000,
              }));
              addLog("API", "OTP resent — new code sent");
            } else {
              addLog("API ERROR", result.message ?? "Resend failed");
            }
          }

          if (step.type === "token-issued") {
            if (tokenRef.current.accessToken) {
              addLog(
                "API",
                `Token active — ${tokenRef.current.accessToken.slice(0, 8)}…`,
              );
            } else {
              addLog(
                "INFO",
                "No token issued — OTP verification required first",
              );
            }
          }

          if (step.type === "complete-account") {
            // New user registration — requires tempId from a previous OTP verify.
            // For the test center, we use a mock flow since we can't get a real tempId.
            addLog(
              "INFO",
              "Complete account requires a tempId from OTP verify (new user path). " +
                "This endpoint is wired — use it with a real tempId from a new-phone-number registration.",
            );
          }

          if (step.type === "token-refreshed") {
            const rt =
              tokenRef.current.refreshToken ?? getRefreshToken("driver");
            const role: AuthRole = tokenRef.current.sessionId
              ? "driver"
              : "admin";
            const result = await refreshToken(role, rt ?? undefined);
            if (result.success && result.token) {
              setToken((prev) => ({
                ...prev,
                accessToken: result.token!,
                refreshToken: result.refreshToken ?? prev.refreshToken,
                expiresIn: 3600,
                status: "active",
              }));
              addLog("API", "Token refreshed ✓");
            } else {
              addLog(
                "API ERROR",
                "Token refresh failed — no refresh token available",
              );
            }
          }

          if (step.type === "token-expired") {
            setToken((prev) => ({ ...prev, status: "expired", expiresIn: 0 }));
          }

          if (step.type === "logout") {
            // Determine which role to log out based on scenario context
            const logoutRole: AuthRole =
              scenario.id === "admin-logout"
                ? "admin"
                : scenario.id === "logout"
                  ? "driver"
                  : tokenRef.current.sessionId
                    ? "driver"
                    : "admin";
            await logout(logoutRole);
            setToken({ ...INITIAL_TOKEN });
            setOtp({ ...INITIAL_OTP });
            otpSessionRef.current = null;
            addLog("API", `Logged out — ${logoutRole} tokens invalidated`);
          }

          // Small pause between steps for visual pacing
          await new Promise((r) => setTimeout(r, 400));
        }

        addLog("DONE", `${scenario.name} complete`);
      } catch (err) {
        addLog("ERROR", `Scenario failed: ${err}`);
        toast.error("Scenario failed", { description: String(err) });
      } finally {
        setRunning(false);
        setActiveStep(null);
        setCurrentStepId("");
        onActivity(null as unknown as string);
      }
    },
    [clearTimeouts, onActivity, addLog, otp, token, waitForOtpCode],
  );

  /** Runs a workflow: chains multiple scenarios sequentially. */
  const runWorkflow = useCallback(
    async (workflow: AuthWorkflow) => {
      const scenarios = getAuthWorkflowScenarios(workflow);
      onActivity(workflow.name);
      addLog("WORKFLOW", `${workflow.name} — ${scenarios.length} step(s)`);
      for (const scenario of scenarios) {
        await runScenario(scenario);
      }
      addLog("WORKFLOW DONE", `${workflow.name} complete`);
      onActivity(null as unknown as string);
    },
    [runScenario, onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    clearTimeouts();
    setRunning(false);
    setToken(INITIAL_TOKEN);
    setOtp(INITIAL_OTP);
    otpSessionRef.current = null;
    tokenRef.current = INITIAL_TOKEN;
    setLog([]);
    setActiveStep(null);
    setCurrentStepId("");
    setWaitingForOtp(false);
    clearTokens();
    onActivity(null as unknown as string);
    toast("Auth reset", { description: "Tokens cleared." });
  }, [clearTimeouts, onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <AuthCanvas
          token={token}
          otp={otp}
          activeStep={activeStep}
          currentStepId={currentStepId}
          running={running}
          log={log}
        />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <AuthControlPanel
          onRunScenario={runScenario}
          onRunWorkflow={runWorkflow}
          onReset={resetSim}
          log={log}
          running={running}
          waitingForOtp={waitingForOtp}
          onSubmitOtpCode={submitOtpCode}
        />
      </div>
    </div>
  );
}
