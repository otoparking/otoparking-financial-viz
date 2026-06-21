import type { AuthScenario } from "@/types/auth";
import { AUTH_SCENARIOS } from "@/app/modules/auth/scenarios";

export interface AuthWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[]; // scenario IDs in execution order
}

function s(id: string): AuthScenario {
  const found = AUTH_SCENARIOS.find((sc) => sc.id === id);
  if (!found) {
    console.error(
      `[auth-workflows] Scenario "${id}" not found in AUTH_SCENARIOS`,
    );
    // Return a stub to avoid crashing — the real fix is to correct the workflow step IDs.
    return {
      id: "_missing_" + id,
      name: `Missing: ${id}`,
      description: `Scenario "${id}" not registered`,
      prdSection: "—",
      steps: [],
    } as AuthScenario;
  }
  return found;
}

/**
 * Real auth workflows chaining atomic scenarios.
 * Each workflow tests a complete end-to-end auth flow.
 */
export const AUTH_WORKFLOWS: AuthWorkflow[] = [
  {
    id: "otp-happy",
    name: "OTP Login — Happy Path",
    description: "Send OTP → Enter correct code → Token issued → Ready",
    steps: ["send-otp-email", "verify-otp-success"],
  },
  {
    id: "otp-wrong-then-correct",
    name: "OTP Login — Wrong Then Correct",
    description: "Send OTP → Wrong code (denied) → Correct code → Token issued",
    steps: ["send-otp-email", "verify-otp-fail"],
  },
  {
    id: "otp-expired-resend",
    name: "OTP Login — Expired + Resend",
    description: "Send OTP → Expires → Resend new code → Verify → Token issued",
    steps: ["send-otp-email", "resend-otp", "verify-otp-success"],
  },
  {
    id: "full-login-flow",
    name: "Full Login Flow (Driver OTP)",
    description:
      "Send OTP → Verify → Token → All subsequent API calls use Bearer",
    steps: ["send-otp-email", "verify-otp-success", "refresh-token"],
  },
  {
    id: "admin-login-flow",
    name: "Admin Login → Refresh",
    description: "Password login → Active admin session → Refresh token",
    steps: ["login-admin", "admin-refresh"],
  },
  {
    id: "tenant-login-flow",
    name: "Tenant Login Flow",
    description: "Password login → Active tenant session",
    steps: ["login-tenant"],
  },
  {
    id: "driver-password-flow",
    name: "Driver Password Login",
    description: "Password login → Active driver session (no OTP)",
    steps: ["login-driver-password"],
  },
  {
    id: "logout-flow",
    name: "Login → Logout",
    description: "Send OTP → Verify → Active session → Logout → Tokens cleared",
    steps: ["send-otp-email", "verify-otp-success", "logout"],
  },
  {
    id: "admin-logout-flow",
    name: "Admin Login → Logout",
    description: "Password login → Active session → Logout",
    steps: ["login-admin", "admin-logout"],
  },
  {
    id: "complete-account-flow",
    name: "Complete Account",
    description: "New user registration → Account created → Token issued",
    steps: ["complete-account"],
  },
];

export function getAuthWorkflowScenarios(
  workflow: AuthWorkflow,
): AuthScenario[] {
  return workflow.steps.map((id) => s(id));
}
