/**
 * Shared Auth Service — single source of truth for all auth tokens.
 *
 * Used by both the Auth Module (login/OTP flows) and the Financial Module
 * (booking/cancel/extension API calls). Tokens are stored at module level
 * and accessible via getter/setter functions.
 *
 * Two roles, each with independent token state:
 *   - DRIVER  → main API (booking, cancel, extension, gate, wallet)
 *   - TENANT  → admin API tenant endpoints (wallet, dashboard, cash-ledger)
 *   - ADMIN   → admin API admin endpoints (top-up, gate cash, adjustments)
 *
 * OTP flow: the Auth Module triggers sendOtp(), the tester types the code,
 * the Auth Module calls verifyOtp(code), the token is stored here,
 * and the Financial Module picks it up automatically.
 *
 * @module lib/auth-service
 */

const MAIN_API = "/api/backend";
const ADMIN_API = "/api/admin";

// ── Token state (module-level, shared across all imports) ──────────────

interface TokenEntry {
  token: string;
  refreshToken: string | null;
  expiresAt: number; // Date.now() value when token expires
}

const tokens: Record<string, TokenEntry | null> = {
  driver: null,
  tenant: null,
  admin: null,
  agent: null,
};

// ── Generic auth helpers ───────────────────────────────────────────────

async function postJson(
  url: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, data: json as Record<string, unknown> };
}

// ── Public API ─────────────────────────────────────────────────────────

export type AuthRole = "driver" | "tenant" | "admin" | "agent";

/**
 * Returns a valid token for the given role, refreshing if expired.
 * Financial module calls this before every API call.
 */
export async function getToken(role: AuthRole): Promise<string | null> {
  const entry = tokens[role];
  if (entry && Date.now() < entry.expiresAt - 60_000) {
    return entry.token; // cached, still valid
  }
  return null; // no valid token — user must authenticate via Auth Module
}

/**
 * Stores a token obtained externally (e.g. from Auth Module's OTP flow).
 */
export function setToken(
  role: AuthRole,
  token: string,
  expiresInSec: number,
  refreshToken?: string,
): void {
  tokens[role] = {
    token,
    refreshToken: refreshToken ?? tokens[role]?.refreshToken ?? null,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

/** Returns the stored refresh token for the given role, if any. */
export function getRefreshToken(role: AuthRole): string | null {
  return tokens[role]?.refreshToken ?? null;
}

/** Clears all tokens (logout). */
export function clearTokens(): void {
  tokens.driver = null;
  tokens.tenant = null;
  tokens.admin = null;
  tokens.agent = null;
}

/**
 * Initiates login for the given email. Returns a loginSessionId
 * which the Auth Module uses to track the OTP flow.
 * The backend sends an OTP to the user's email/phone.
 */
export async function sendOtp(email: string): Promise<{
  success: boolean;
  loginSessionId?: string;
  message?: string;
}> {
  const { ok, data } = await postJson(`${MAIN_API}/auth/otp/request`, {
    email,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Send OTP failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  return {
    success: true,
    loginSessionId: inner?.loginSessionId as string,
  };
}

/**
 * Verifies the OTP code and, on success, stores the resulting token.
 */
export async function verifyOtp(
  email: string,
  code: string,
  loginSessionId: string,
): Promise<{
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const { ok, data } = await postJson(`${MAIN_API}/auth/otp/verify`, {
    email,
    otpCode: code,
    loginSessionId,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "OTP verification failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const accessToken = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  const expiresIn = (inner?.expiresIn as number) ?? 3600;
  if (accessToken) {
    setToken("driver", accessToken, expiresIn, refreshToken);
  }
  return { success: true, accessToken, refreshToken, expiresIn };
}

/**
 * Admin login — email + password (no OTP, direct JWT).
 */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; message?: string }> {
  const { ok, data } = await postJson(`${ADMIN_API}/auth/login`, {
    email,
    password,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Admin login failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const token = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  if (token) {
    setToken("admin", token, 86400, refreshToken); // 24h
  }
  return { success: true, token };
}

/**
 * Driver direct login — email + password (no OTP, direct JWT).
 */
export async function loginDriver(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; message?: string }> {
  const { ok, data } = await postJson(`${MAIN_API}/auth/login`, {
    email,
    password,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Driver login failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const token = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  if (token) {
    setToken("driver", token, 86400, refreshToken); // 24h
  }
  return { success: true, token };
}

/**
 * Tenant login — email + password (no OTP, direct JWT).
 */
export async function loginTenant(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; message?: string }> {
  const { ok, data } = await postJson(`${ADMIN_API}/auth/login`, {
    email,
    password,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Tenant login failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const token = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  if (token) {
    setToken("tenant", token, 86400, refreshToken); // 24h
  }
  return { success: true, token };
}

/**
 * Agent login — email + password via main API.
 */
export async function loginAgent(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; message?: string }> {
  const { ok, data } = await postJson(`${MAIN_API}/auth/login`, {
    email,
    password,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Agent login failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const token = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  if (token) {
    setToken("agent", token, 86400, refreshToken); // 24h
  }
  return { success: true, token };
}

/**
 * Completes a new user account after OTP verification.
 * POST /auth/complete-account — sends tempId + profile fields.
 */
export async function completeAccount(params: {
  email: string;
  tempId: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
}> {
  const { ok, data } = await postJson(`${MAIN_API}/auth/complete-account`, {
    email: params.email,
    tempId: params.tempId,
    password: params.password,
    firstName: params.firstName,
    lastName: params.lastName,
    termsAccepted: true,
    privacyPolicyAccepted: true,
  });
  if (!ok) {
    return {
      success: false,
      message: (data.message as string) ?? "Complete account failed",
    };
  }
  const inner = data.data as Record<string, unknown> | undefined;
  const accessToken = inner?.accessToken as string;
  const refreshToken = inner?.refreshToken as string | undefined;
  if (accessToken) {
    setToken("driver", accessToken, 3600, refreshToken);
  }
  return { success: true, accessToken, refreshToken };
}

/**
 * Refreshes an expired token using the refresh endpoint.
 */
export async function refreshToken(
  role: AuthRole,
  refreshTokenStr?: string,
): Promise<{ success: boolean; token?: string; refreshToken?: string }> {
  const rt = refreshTokenStr ?? getRefreshToken(role);
  if (!rt) return { success: false };
  const api = role === "admin" || role === "tenant" ? ADMIN_API : MAIN_API;
  const { ok, data } = await postJson(`${api}/auth/refresh`, {
    refreshToken: rt,
  });
  if (!ok) return { success: false };
  const inner = data.data as Record<string, unknown> | undefined;
  const token = inner?.accessToken as string;
  const newRefreshToken = inner?.refreshToken as string | undefined;
  const expiresIn = (inner?.expiresIn as number) ?? 3600;
  if (token) setToken(role, token, expiresIn, newRefreshToken);
  return { success: true, token, refreshToken: newRefreshToken };
}

/**
 * Logs out the given role (invalidates token server-side if needed).
 */
export async function logout(role: AuthRole): Promise<void> {
  const entry = tokens[role];
  if (entry) {
    const api = role === "admin" ? ADMIN_API : MAIN_API;
    await postJson(`${api}/auth/logout`, {}, entry.token).catch(() => {});
  }
  tokens[role] = null;
}

/** Returns whether the given role has a valid cached token. */
export function hasToken(role: AuthRole): boolean {
  const entry = tokens[role];
  return !!(entry && Date.now() < entry.expiresAt - 60_000);
}
