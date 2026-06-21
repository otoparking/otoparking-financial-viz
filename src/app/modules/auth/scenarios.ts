import type { AuthScenario } from "@/types/auth";

/**
 * Auth flow scenarios — each step type triggers a real API call in page.tsx.
 *
 * Step type → API mapping:
 *   send-otp        → POST /auth/otp/request  (sends OTP to email)
 *   verify-otp      → Pauses, waits for tester to type code
 *   otp-verified    → Visual (API happened inside verify-otp)
 *   otp-failed      → Visual only (API returned error, shown in log)
 *   resend-otp      → POST /auth/otp/request  (resends OTP)
 *   token-issued    → Visual only (token already stored)
 *   token-refreshed → POST /auth/refresh
 *   token-expired   → Visual only (status change)
 *   logout          → POST /auth/logout
 *   complete-account → POST /auth/complete-account
 *   login-password  → POST /auth/login or /api/admin/auth/login (pwd)
 *   login-success   → Visual (token stored)
 *   login-failed    → Visual (API returned error)
 *   info            → Log entry only, no API call
 */
export const AUTH_SCENARIOS: AuthScenario[] = [
  /* ── Send OTP (Email) ────────────────────────────── */
  {
    id: "send-otp-email",
    name: "Send OTP — Email",
    description: "POST /auth/login → Backend sends 6-digit code to email",
    prdSection: "§POST /auth/login",
    steps: [
      {
        id: "otp1-1",
        type: "send-otp",
        description:
          "POST /auth/login { email } → OTP sent to akarog20230@gmail.com",
      },
      {
        id: "otp1-2",
        type: "info",
        description: "Check email for 6-digit code — expires in 5 minutes",
      },
    ],
  },

  /* ── Verify OTP Success ──────────────────────────── */
  {
    id: "verify-otp-success",
    name: "Verify OTP — Success",
    description:
      "Enter correct code → Token issued → Financial module can use it",
    prdSection: "§POST /auth/otp/verify",
    steps: [
      {
        id: "vfy1-1",
        type: "verify-otp",
        description:
          "Tester enters 6-digit code from email → POST /auth/otp/verify",
      },
      {
        id: "vfy1-2",
        type: "otp-verified",
        description: "OTP valid ✓ → accessToken returned",
      },
      {
        id: "vfy1-3",
        type: "token-issued",
        description:
          "Token stored in shared auth-service — Financial Module ready",
      },
    ],
  },

  /* ── Verify OTP Failure ──────────────────────────── */
  {
    id: "verify-otp-fail",
    name: "Verify OTP — Wrong Code",
    description: "Enter wrong code → denied → retry with correct code",
    prdSection: "§POST /auth/otp/verify",
    steps: [
      {
        id: "vfy2-1",
        type: "verify-otp",
        description: "Tester enters WRONG code → POST /auth/otp/verify",
      },
      {
        id: "vfy2-2",
        type: "otp-failed",
        description: "Backend rejects: 'Invalid OTP' · Attempt 1/3",
      },
      {
        id: "vfy2-3",
        type: "verify-otp",
        description: "Tester enters CORRECT code (second attempt)",
      },
      {
        id: "vfy2-4",
        type: "otp-verified",
        description: "OTP accepted on attempt 2 ✓ → Token issued",
      },
    ],
  },

  /* ── Resend OTP ─────────────────────────────────── */
  {
    id: "resend-otp",
    name: "Resend OTP",
    description: "POST /auth/login → New code sent, old code invalidated",
    prdSection: "§POST /auth/login",
    steps: [
      {
        id: "res1-1",
        type: "info",
        description: "Previous OTP expired (5 min) · Requesting new code",
      },
      {
        id: "res1-2",
        type: "resend-otp",
        description: "POST /auth/login → New 6-digit code sent to email",
      },
      {
        id: "res1-3",
        type: "info",
        description: "Previous code now invalid — use new code from email",
      },
    ],
  },

  /* ── Refresh Token ───────────────────────────────── */
  {
    id: "refresh-token",
    name: "Refresh Token",
    description: "POST /auth/refresh → New accessToken from refreshToken",
    prdSection: "§POST /auth/refresh",
    steps: [
      {
        id: "ref1-1",
        type: "token-expired",
        description: "accessToken expired after 3600s",
      },
      {
        id: "ref1-2",
        type: "token-refreshed",
        description: "POST /auth/refresh → New accessToken + expiresIn: 3600",
      },
    ],
  },

  /* ── Logout ─────────────────────────────────────── */
  {
    id: "logout",
    name: "Logout",
    description: "POST /auth/logout → Session terminated, tokens invalidated",
    prdSection: "§POST /auth/logout",
    steps: [
      {
        id: "out1-1",
        type: "info",
        description: "Active session — invalidating tokens",
      },
      {
        id: "out1-2",
        type: "logout",
        description: "POST /auth/logout → Tokens cleared from auth-service",
      },
    ],
  },

  /* ── Complete Account ──────────────────────────────── */
  {
    id: "complete-account",
    name: "Complete Account",
    description: "POST /auth/complete-account → New user finishes registration",
    prdSection: "§POST /auth/complete-account",
    steps: [
      {
        id: "cmp1-1",
        type: "info",
        description: "Invited user arrives with tempId from email link",
      },
      {
        id: "cmp1-2",
        type: "complete-account",
        description: "POST /auth/complete-account { tempId, firstName, … }",
      },
      {
        id: "cmp1-3",
        type: "token-issued",
        description: "Account created · accessToken returned",
      },
    ],
  },

  /* ── Full Login Flow (Happy Path) ──────────────────────── */
  {
    id: "full-login-flow",
    name: "Full Login Flow",
    description: "End-to-end: Send OTP → Verify → Token → Access granted",
    prdSection: "§Auth Flow",
    steps: [
      {
        id: "ful1-1",
        type: "send-otp",
        description: "POST /auth/otp/request { email } → OTP sent",
      },
      {
        id: "ful1-2",
        type: "verify-otp",
        description: "Tester enters code from email",
      },
      {
        id: "ful1-3",
        type: "otp-verified",
        description: "OTP valid ✓ → Token issued",
      },
      {
        id: "ful1-4",
        type: "token-issued",
        description: "Financial Module can now make authenticated API calls",
      },
    ],
  },

  /* ── Admin Login (Password) ──────────────────────────── */
  {
    id: "login-admin",
    name: "Admin Login — Password",
    description: "POST /api/admin/auth/login → JWT → Admin operations ready",
    prdSection: "§AdminAuth /login",
    steps: [
      {
        id: "adm1-1",
        type: "login-password",
        description:
          "POST /api/admin/auth/login { email, password } → accessToken + refresh cookie",
      },
      {
        id: "adm1-2",
        type: "login-success",
        description: "Admin token stored — Financial Module top-up ready",
      },
    ],
  },

  /* ── Admin Token Refresh ─────────────────────────────── */
  {
    id: "admin-refresh",
    name: "Admin — Refresh Token",
    description: "POST /api/admin/auth/refresh → New accessToken",
    prdSection: "§AdminAuth /refresh",
    steps: [
      {
        id: "adr1-1",
        type: "token-expired",
        description: "Admin accessToken expired after 86400s",
      },
      {
        id: "adr1-2",
        type: "token-refreshed",
        description:
          "POST /api/admin/auth/refresh → New accessToken + refresh cookie",
      },
    ],
  },

  /* ── Admin Logout ────────────────────────────────────── */
  {
    id: "admin-logout",
    name: "Admin — Logout",
    description: "POST /api/admin/auth/logout → Session terminated",
    prdSection: "§AdminAuth /logout",
    steps: [
      {
        id: "ado1-1",
        type: "info",
        description: "Active admin session — invalidating tokens",
      },
      {
        id: "ado1-2",
        type: "logout",
        description: "POST /api/admin/auth/logout → Bearer + cookie cleared",
      },
    ],
  },

  /* ── Tenant Login (Password) ────────────────────────── */
  {
    id: "login-tenant",
    name: "Tenant Login — Password",
    description: "POST /api/admin/auth/login → JWT → Dashboard ready",
    prdSection: "§AdminAuth /login",
    steps: [
      {
        id: "tnt1-1",
        type: "login-password",
        description:
          "POST /api/admin/auth/login { email, password } as tenant → accessToken",
      },
      {
        id: "tnt1-2",
        type: "login-success",
        description: "Tenant token stored — Dashboard / wallet queries ready",
      },
    ],
  },

  /* ── Driver Password Login (no OTP) ──────────────────── */
  {
    id: "login-driver-password",
    name: "Driver Login — Password",
    description: "POST /auth/login → Direct JWT (bypasses OTP)",
    prdSection: "§Auth /login",
    steps: [
      {
        id: "drv1-1",
        type: "login-password",
        description: "POST /auth/login { email, password } → accessToken",
      },
      {
        id: "drv1-2",
        type: "login-success",
        description: "Driver token stored — Booking / wallet ready",
      },
    ],
  },
];
