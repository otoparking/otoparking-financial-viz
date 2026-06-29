import type { PlatformData } from "@/types/financial";
import {
  getToken,
  setToken,
  loginAdmin,
  loginTenant,
  loginDriver,
  loginAgent,
  type AuthRole,
} from "@/lib/auth-service";

/**
 * Financial Test Center — Backend API Layer
 *
 * All backend API calls for the OtoParking financial module.
 * Auth tokens come from the shared auth-service (which the Auth Module populates
 * via real OTP flows, or auto-login via hardcoded test credentials for admin).
 * Uses Next.js proxy (`/api/backend` → :8080, `/api/admin` → :8082).
 *
 * @module lib/api
 */

const MAIN_API = "/api/backend";
const ADMIN_API = "/api/admin";

/* ── Test accounts (fallback — real auth via Auth Module) ────────────── */
const DRIVER_EMAIL = "akarog20230@gmail.com";
const DRIVER_PASSWORD = "password123";
const TENANT_EMAIL = "test-tenant@otoparking.com";
const TENANT_PASSWORD = "Test-Tenant2026";
const ADMIN_EMAIL = "admin@otoparking.com";
const ADMIN_PASSWORD = "Admin@12345";
const AGENT_EMAIL = "test-agent@otoparking.com";
const AGENT_PASSWORD = "54ea7aa5c314";

/* ── Test data ─────────────────────────────────────────────────────── */
const PARKING_ID = 61;
const VEHICLE_ID = 159;
const DRIVER_ACCOUNT_ID = "6a33014db68486ccc9606985";

/* ── Auth state (uses shared auth-service) ──────────────────────────── */

export async function getDriverToken(): Promise<string | null> {
  let token = await getToken("driver");
  if (!token) {
    // Auto-login with test credentials (bypasses OTP for test center convenience)
    const result = await loginDriver(DRIVER_EMAIL, DRIVER_PASSWORD);
    if (result.success && result.token) {
      return result.token;
    }
    return null;
  }
  return token;
}

async function getTenantToken(): Promise<string | null> {
  let token = await getToken("tenant");
  if (!token) {
    const result = await loginTenant(TENANT_EMAIL, TENANT_PASSWORD);
    if (result.success && result.token) {
      return result.token;
    }
    return null;
  }
  return token;
}

async function getAdminToken(): Promise<string | null> {
  let token = await getToken("admin");
  if (!token) {
    // Auto-login with test credentials
    const result = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (result.success && result.token) {
      return result.token;
    }
    return null;
  }
  return token;
}

async function getAgentToken(): Promise<string | null> {
  let token = await getToken("agent");
  if (!token) {
    const result = await loginAgent(AGENT_EMAIL, AGENT_PASSWORD);
    if (result.success && result.token) return result.token;
    return null;
  }
  return token;
}

/* ── Types ─────────────────────────────────────────────────────────── */

export interface LiveDriverData {
  balance: number;
  walletNumber: string;
  currency: string;
}

export interface LiveTenantData {
  merchantBalance: number;
  commissionPaid: number;
  pendingSettlements: number;
  recentTxCount: number;
  escrowTotal: number;
  escrowCount: number;
  cashCommissionOwed: number;
  cashInAgentsHands: number;
  activeTickets: number;
  agentsOnShift: number;
  pendingReconciliations: number;
}

export interface LiveData {
  driver: LiveDriverData | null;
  tenant: LiveTenantData | null;
  connected: boolean;
}

export interface ScenarioResult {
  success: boolean;
  message: string;
  bookingReference?: string;
  bookingId?: number;
  previewId?: string;
  sessionToken?: string;
}

/* ── Fetch helpers ─────────────────────────────────────────────────── */

async function fetchWithAuth(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function postWithAuth(
  url: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

/* ── Live data polling ─────────────────────────────────────────────── */

async function fetchDriverWallet(): Promise<LiveDriverData | null> {
  const token = await getDriverToken();
  if (!token) return null;
  try {
    const res = await fetch(`${MAIN_API}/wallet/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const w = json.data?.wallet;
    if (!w) return null;
    return {
      balance: w.balance_available,
      walletNumber: w.wallet_number,
      currency: w.currency_code,
    };
  } catch {
    return null;
  }
}

async function fetchTenantWallet(): Promise<{
  merchantBalance: number;
  commissionPaid: number;
  pendingSettlements: number;
} | null> {
  const token = await getTenantToken();
  if (!token) return null;
  const d = (await fetchWithAuth(
    `${ADMIN_API}/tenant/financial/wallet`,
    token,
  )) as Record<string, unknown> | null;
  if (!d) return null;
  return {
    merchantBalance: (d.totalBalance as number) ?? 0,
    commissionPaid: (d.totalCommissionPaid as number) ?? 0,
    pendingSettlements: (d.pendingSettlementCount as number) ?? 0,
  };
}

async function fetchTenantDashboard(): Promise<{
  escrowTotal: number;
  escrowCount: number;
  cashCommissionOwed: number;
  cashInAgentsHands: number;
  activeTickets: number;
  agentsOnShift: number;
  pendingReconciliations: number;
} | null> {
  const token = await getTenantToken();
  if (!token) return null;
  const d = (await fetchWithAuth(
    `${ADMIN_API}/tenant/financial/dashboard`,
    token,
  )) as Record<string, unknown> | null;
  if (!d) return null;
  const escrow = d.escrow as Record<string, unknown> | undefined;
  const liveOps = d.liveOps as Record<string, unknown> | undefined;
  return {
    escrowTotal: (escrow?.total as number) ?? 0,
    escrowCount: (escrow?.count as number) ?? 0,
    cashCommissionOwed: (d.cashCommissionOutstanding as number) ?? 0,
    cashInAgentsHands: (liveOps?.cashInAgentsHands as number) ?? 0,
    activeTickets: (liveOps?.activeTickets as number) ?? 0,
    agentsOnShift: Array.isArray(liveOps?.agentsOnShift)
      ? liveOps!.agentsOnShift.length
      : 0,
    pendingReconciliations: (liveOps?.pendingReconciliations as number) ?? 0,
  };
}

async function fetchTenantTxCount(): Promise<number> {
  const token = await getTenantToken();
  if (!token) return 0;
  const d = (await fetchWithAuth(
    `${ADMIN_API}/tenant/financial/transactions?page=1&pageSize=1`,
    token,
  )) as Record<string, unknown> | null;
  return (d?.total as number) ?? 0;
}

/**
 * Fetches live wallet + dashboard data from all three roles in parallel.
 * Returns the driver wallet, tenant wallet, and dashboard metrics.
 */
export async function fetchLiveData(): Promise<LiveData> {
  // Call driver wallet FIRST (triggers auth + sets connected baseline)
  const driver = await fetchDriverWallet();
  const [wallet, dashboard, txCount] = await Promise.all([
    fetchTenantWallet(),
    fetchTenantDashboard(),
    fetchTenantTxCount(),
  ]);
  const tenant: LiveTenantData | null = wallet
    ? {
        ...wallet,
        recentTxCount: txCount,
        escrowTotal: dashboard?.escrowTotal ?? 0,
        escrowCount: dashboard?.escrowCount ?? 0,
        cashCommissionOwed: dashboard?.cashCommissionOwed ?? 0,
        cashInAgentsHands: dashboard?.cashInAgentsHands ?? 0,
        activeTickets: dashboard?.activeTickets ?? 0,
        agentsOnShift: dashboard?.agentsOnShift ?? 0,
        pendingReconciliations: dashboard?.pendingReconciliations ?? 0,
      }
    : null;
  return {
    driver,
    tenant,
    connected: driver !== null && tenant !== null,
  };
}

/* ── Cash flow state (agent + manager nodes) ──────────────────────── */

export async function fetchCashFlowState(): Promise<{
  agentCash: number;
  managerCash: number;
}> {
  try {
    const token = await getAdminToken();
    const res = await fetch(
      `${ADMIN_API}/financial/cash-flow?lotId=${PARKING_ID}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    const json = await res.json();
    const data = json.data ?? json;
    return {
      agentCash: parseFloat(data.agentCash ?? 0),
      managerCash: parseFloat(data.managerCash ?? 0),
    };
  } catch {
    return { agentCash: 0, managerCash: 0 };
  }
}

export async function releaseAgentToManager(): Promise<ScenarioResult> {
  const token = await getAdminToken();
  if (!token) return { success: false, message: "Auth failed" };
  const res = await fetch(
    `${ADMIN_API}/financial/cash-flow/release-to-manager`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lotId: PARKING_ID }),
    },
  );
  const json = await res.json();
  return {
    success: res.ok && (json.success ?? true),
    message: json.message ?? json.data?.message ?? "Unknown",
  };
}

export async function releaseManagerToTenant(): Promise<ScenarioResult> {
  const token = await getAdminToken();
  if (!token) return { success: false, message: "Auth failed" };
  const res = await fetch(
    `${ADMIN_API}/financial/cash-flow/release-to-tenant`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lotId: PARKING_ID }),
    },
  );
  const json = await res.json();
  return {
    success: res.ok && (json.success ?? true),
    message: json.message ?? json.data?.message ?? "Unknown",
  };
}

/* ── Scenario execution — REAL API calls ───────────────────────────── */

/**
 * Credits the test driver wallet via admin financial adjust.
 * @param amount - MAD to credit
 */
export async function executeTopUp(amount: number): Promise<ScenarioResult> {
  const token = await getAdminToken();
  if (!token) return { success: false, message: "Admin auth failed" };
  const ref = `TEST-TOPUP-${Date.now()}`;
  const { ok, data } = await postWithAuth(
    `${ADMIN_API}/financial/adjust`,
    token,
    {
      walletType: "DRIVER",
      targetId: DRIVER_ACCOUNT_ID,
      action: "CREDIT",
      amount,
      currency: "MAD",
      reason: `Test Center simulation — wallet top-up of ${amount} MAD`,
      relatedReference: ref,
    },
  );
  const msg = (data as Record<string, unknown>)?.message as string;
  return { success: ok, message: msg ?? "Unknown" };
}

/**
 * Pre-booking flow: pricing preview → booking confirm.
 * @param durationHours - booking length in hours
 * @param startHour - target start hour (0-23)
 * @param bookToday - if true, book for today; false = tomorrow
 * @param noMinBuffer - if true, skip the 3h minimum buffer (for NONE refund tier)
 */
export async function executeBooking(
  durationHours: number = 2,
  startHour: number = 14,
  bookToday: boolean = false,
  noMinBuffer: boolean = false,
): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  // Step 1: pricing preview
  const now = new Date();
  const start = new Date(now);
  // bookToday=false → tomorrow; bookToday=true → today (for testing partial refund)
  if (!bookToday) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(startHour, 0, 0, 0);
  // When booking for today with PARTIAL intent, push to at least 3 h from now
  // so the cancel lands in the PARTIAL window (>60 min, <24 h).
  // When noMinBuffer is true (NONE intent), book as-is for <60 min window.
  if (bookToday && !noMinBuffer) {
    const minHour = now.getHours() + 3;
    if (start.getHours() < minHour || start <= now) {
      start.setHours(Math.min(minHour, 22), 0, 0, 0);
    }
  } else if (!bookToday && start <= now) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(start.getHours() + durationHours, 0, 0, 0);
  const fmt = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+01:00`;
    console.log("[fmt]", s, "|", "ISO:", d.toISOString());
    return s;
  };

  console.log("[executeBooking] sending preview", {
    start: fmt(start),
    end: fmt(end),
    durationHours,
    bookToday,
  });
  const previewRes = await fetch(`${MAIN_API}/pricing/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-UTC-Offset": "+01:00",
    },
    body: JSON.stringify({
      parking_id: PARKING_ID,
      vehicle_id: VEHICLE_ID,
      start_date: fmt(start),
      end_date: fmt(end),
      include_order_details: "Y",
    }),
  });
  if (!previewRes.ok) {
    const err = await previewRes.json();
    console.error("[executeBooking] preview FAILED", err);
    const msg =
      ((err as Record<string, unknown>)?.message as string) ??
      ((err as Record<string, unknown>)?.status as string) ??
      "Preview failed";
    return { success: false, message: `Preview: ${msg}` };
  }
  const previewJson = await previewRes.json();
  const previewId = previewJson.data?.preview_id as string;
  if (!previewId) return { success: false, message: "No preview_id returned" };

  // Step 2: confirm booking
  const confirmRes = await fetch(`${MAIN_API}/booking/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-UTC-Offset": "+01:00",
    },
    body: JSON.stringify({ preview_id: previewId }),
  });
  const confirmJson = await confirmRes.json();
  console.log(
    "[executeBooking] confirm",
    confirmRes.ok ? "OK:" + confirmJson.data?.booking_reference : "FAIL:",
    confirmRes.ok ? "" : confirmJson,
  );
  const bookingRef = confirmJson.data?.booking_reference as string;
  const confirmMsg =
    ((confirmJson as Record<string, unknown>)?.message as string) ??
    ((confirmJson as Record<string, unknown>)?.status as string) ??
    "Confirm failed";

  // Look up the booking database ID (needed for gate entry)
  let bookingId: number | undefined;
  if (confirmRes.ok && bookingRef) {
    const listRes = await fetch(`${MAIN_API}/booking/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ page: 1, pageSize: 5 }),
    });
    if (listRes.ok) {
      const listJson = await listRes.json();
      const items =
        (listJson.data?.items as Array<Record<string, unknown>>) ?? [];
      const found = items.find((i) => i.booking_reference === bookingRef);
      bookingId = found?.booking_id as number | undefined;
    }
  }

  return {
    success: confirmRes.ok,
    message: confirmRes.ok
      ? `Booking ${bookingRef} confirmed`
      : `Confirm: ${confirmMsg}`,
    bookingReference: bookingRef,
    bookingId,
    previewId,
  };
}

/**
 * Cancels a booking via preview → confirm.
 * Refund tier is backend-determined by minutesUntilStart.
 * @param bookingRef - the booking reference to cancel
 */
export async function executeCancel(
  bookingRef: string,
): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  // Step 1: cancel preview (read-only check)
  const previewRes = await fetch(`${MAIN_API}/booking/cancel/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ booking_reference: bookingRef }),
  });
  const previewJson = await previewRes.json();
  if (!previewRes.ok || previewJson.data?.status !== "ELIGIBLE") {
    return {
      success: false,
      message:
        ((previewJson as Record<string, unknown>)?.message as string) ??
        "Not eligible for cancellation",
    };
  }

  // Step 2: cancel confirm
  const confirmRes = await fetch(`${MAIN_API}/booking/cancel/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      booking_reference: bookingRef,
      reason: "Test Center simulation cancellation",
    }),
  });
  const confirmJson = await confirmRes.json();
  return {
    success: confirmRes.ok,
    message: confirmRes.ok
      ? `Cancelled ${bookingRef}`
      : (((confirmJson as Record<string, unknown>)?.message as string) ??
        "Cancel failed"),
    bookingReference: bookingRef,
  };
}

/**
 * Extension/overstay: preview → confirm via the booking extension API.
 * Splits payment per lot commission rate (CommissionRateService).
 * @param bookingRef - the booking to extend
 * @param extensionMinutes - minutes to add
 */
export async function executeOverstay(
  bookingRef: string,
  extensionMinutes: number,
): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  // Step 1: extension preview
  const previewRes = await fetch(`${MAIN_API}/booking/extension/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      booking_reference: bookingRef,
      extension_minutes: extensionMinutes,
    }),
  });
  const previewJson = await previewRes.json();
  const previewId = previewJson.data?.extension_preview_id as string;
  if (!previewRes.ok || !previewJson.data?.can_extend) {
    return {
      success: false,
      message:
        ((previewJson as Record<string, unknown>)?.message as string) ??
        "Extension not eligible",
    };
  }

  // Step 2: extension confirm (requires preview_id from step 1)
  const confirmRes = await fetch(`${MAIN_API}/booking/extension/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      booking_reference: bookingRef,
      extension_preview_id: previewId,
    }),
  });
  const confirmJson = await confirmRes.json();
  const fare = previewJson.data?.extension_amount as number;
  return {
    success: confirmRes.ok,
    message: confirmRes.ok
      ? `Overstay ${extensionMinutes}min charged ${fare} MAD`
      : (((confirmJson as Record<string, unknown>)?.message as string) ??
        "Extension failed"),
    bookingReference: bookingRef,
  };
}

/**
 * Gate Entry: activates a CONFIRMED booking by starting a gate session.
 * This mirrors the driver scanning the entry QR code at the lot.
 * The booking transitions CONFIRMED → ACTIVE.
 */
export async function executeGateEntry(
  bookingId: number,
): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  const { ok, data } = await postWithAuth(
    `${MAIN_API}/gate/sessions/start`,
    token,
    {
      lotId: PARKING_ID,
      vehicleId: VEHICLE_ID,
      sessionType: "BOOKING_ACTIVATION",
      bookingRefId: bookingId,
      laneId: "TEST-LANE-01",
    },
  );
  const d = data as Record<string, unknown>;
  const inner = (d?.data ?? d) as Record<string, unknown>;
  const sessionToken = inner?.sessionToken as string | undefined;
  return {
    success: ok,
    message: ok
      ? `Gate entry — session active`
      : `Gate entry failed: ${(d?.message as string) ?? "Unknown"}`,
    sessionToken,
  };
}

/**
 * Gate Exit: ends an active gate session.
 * This mirrors the driver scanning the exit QR code.
 * The booking transitions ACTIVE → COMPLETED and escrow is released to the lot.
 */
export async function executeGateExit(
  sessionToken: string,
): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  const { ok, data } = await postWithAuth(
    `${MAIN_API}/gate/sessions/end`,
    token,
    { sessionToken },
  );
  const d = data as Record<string, unknown>;
  return {
    success: ok,
    message: ok
      ? `Gate exit — session completed, escrow released`
      : `Gate exit failed: ${(d?.message as string) ?? "Unknown"}`,
  };
}

/**
 * Full booking lifecycle: creates a booking, then gate entry → exit.
 * Used by the standalone "Booking Completed" scenario button.
 */
export async function executeBookingLifecycle(): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];

  const booking = await executeBooking();
  results.push(booking);
  if (!booking.success || !booking.bookingId) return results;

  await new Promise((r) => setTimeout(r, 500));

  const entry = await executeGateEntry(booking.bookingId);
  results.push(entry);
  if (!entry.success || !entry.sessionToken) return results;

  const exit = await executeGateExit(entry.sessionToken);
  results.push(exit);
  return results;
}

/**
 * Completes the latest CONFIRMED booking: gate entry, then gate exit if
 * auto-release is enabled. When disabled, only does entry (booking → ACTIVE)
 * leaving escrow locked until manual release.
 */
export async function executeBookingCompleted(
  autoRelease: boolean = true,
): Promise<ScenarioResult> {
  const ref = await fetchLatestBooking();
  if (!ref) return { success: false, message: "No CONFIRMED booking found" };

  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  const listRes = await fetch(`${MAIN_API}/booking/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ page: 1, pageSize: 5 }),
  });
  if (!listRes.ok)
    return { success: false, message: "Failed to list bookings" };
  const listJson = await listRes.json();
  const items = (listJson.data?.items as Array<Record<string, unknown>>) ?? [];
  const found = items.find((i) => i.booking_reference === ref);
  const bookingId = found?.booking_id as number | undefined;
  if (!bookingId)
    return { success: false, message: `Could not resolve ID for ${ref}` };

  const entry = await executeGateEntry(bookingId);
  if (!entry.success || !entry.sessionToken) return entry;

  if (!autoRelease) {
    return {
      success: true,
      message: `Gate entry — booking ACTIVE. Escrow held (auto-release OFF).`,
      sessionToken: entry.sessionToken,
    };
  }

  return executeGateExit(entry.sessionToken);
}

/**
 * Releases all held escrow: finds the latest ACTIVE booking and does gate exit.
 */
export async function releaseAllEscrow(): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  // Find ACTIVE bookings (ones with gate entry but no exit)
  const listRes = await fetch(`${MAIN_API}/booking/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ page: 1, pageSize: 10 }),
  });
  if (!listRes.ok)
    return { success: false, message: "Failed to list bookings" };
  const listJson = await listRes.json();
  const items = (listJson.data?.items as Array<Record<string, unknown>>) ?? [];
  const active = items.find((i) => i.status === "ACTIVE");
  if (!active)
    return { success: false, message: "No ACTIVE booking with held escrow" };

  // Find active gate session
  const sessionsRes = await fetch(`${MAIN_API}/gate/sessions/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sessionsRes.ok)
    return { success: false, message: "Failed to list sessions" };
  const sessionsJson = await sessionsRes.json();
  const sessions = (sessionsJson.data as Array<Record<string, unknown>>) ?? [];

  let released = 0;
  for (const s of sessions) {
    const st = s.sessionToken as string;
    if (!st) continue;
    const exit = await executeGateExit(st);
    if (exit.success) released++;
  }

  return {
    success: released > 0,
    message:
      released > 0
        ? `Released ${released} escrow(s) — bookings now COMPLETED`
        : "No sessions to release",
  };
}

/**
 * Gate Walk-In: starts a WALK_IN gate session, then ends it.
 * Unlike booking flow, this bypasses escrow — fare is deducted from wallet
 * and settled directly to the lot at exit.
 */
export async function executeGateWalkIn(): Promise<ScenarioResult> {
  const token = await getDriverToken();
  if (!token) return { success: false, message: "Driver auth failed" };

  // Step 1: start walk-in session
  const startRes = await postWithAuth(
    `${MAIN_API}/gate/sessions/start`,
    token,
    {
      lotId: PARKING_ID,
      vehicleId: VEHICLE_ID,
      sessionType: "WALK_IN",
      laneId: "TEST-LANE-01",
    },
  );
  const startD = startRes.data as Record<string, unknown>;
  const inner = (startD?.data ?? startD) as Record<string, unknown>;
  const sessionToken = inner?.sessionToken as string | undefined;

  if (!startRes.ok || !sessionToken) {
    return {
      success: false,
      message: `Gate entry failed: ${(startD?.message as string) ?? "Unknown"}`,
    };
  }

  // Step 2: end session immediately (fare may be 0 if under grace period)
  const endRes = await postWithAuth(`${MAIN_API}/gate/sessions/end`, token, {
    sessionToken,
  });
  const endD = endRes.data as Record<string, unknown>;
  const endInner = (endD?.data ?? endD) as Record<string, unknown>;
  const fare = (endInner?.fare as number) ?? 0;
  const exitMethod = (endInner?.exitMethod as string) ?? "UNKNOWN";

  return {
    success: endRes.ok,
    message: endRes.ok
      ? `Walk-in exit — ${exitMethod}, fare ${fare} MAD`
      : `Gate exit failed: ${(endD?.message as string) ?? "Unknown"}`,
  };
}

/**
 * Realistic Gate Cash flow: driver walk-in → agent collects cash → tally updates.
 * Uses the agent's JWT for the cash close. The backend handles fare computation,
 * commission tracking, and agent tally updates atomically.
 */
export async function executeGateCashAgent(): Promise<ScenarioResult> {
  const driverToken = await getDriverToken();
  if (!driverToken) return { success: false, message: "Driver auth failed" };
  const agentToken = await getAgentToken();
  if (!agentToken) return { success: false, message: "Agent auth failed" };

  // Step 1: Driver starts walk-in session
  const { data: startD } = await postWithAuth(
    `${MAIN_API}/gate/sessions/start`,
    driverToken,
    {
      lotId: PARKING_ID,
      vehicleId: VEHICLE_ID,
      sessionType: "WALK_IN",
      laneId: "TEST-LANE-01",
    },
  );
  const inner = ((startD as Record<string, unknown>)?.data ?? startD) as Record<
    string,
    unknown
  >;
  const sessionToken = inner?.sessionToken as string | undefined;
  if (!sessionToken)
    return {
      success: false,
      message: `Walk-in start failed: ${((startD as Record<string, unknown>)?.message as string) ?? "Unknown"}`,
    };

  // Step 2: Agent closes the session as CASH
  const cashRes = await fetch(`${MAIN_API}/gate/payment/close/cash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${agentToken}`,
    },
    body: JSON.stringify({ sessionToken, parkingId: PARKING_ID }),
  });
  const cashJson = await cashRes.json();
  const cashData = (cashJson.data ?? cashJson) as Record<string, unknown>;
  const fare = (cashData?.fare as number) ?? 0;

  if (!cashRes.ok) {
    return {
      success: false,
      message: `Cash close failed: ${(cashJson?.message as string) ?? "Unknown"}`,
    };
  }

  // Step 3: Return the real backend result
  return {
    success: true,
    message: `Agent collected ${fare} MAD cash · Tally +${fare} · Commission tracked`,
  };
}
export async function executeGateCash(
  fare: number = 50,
  commission: number = 5,
): Promise<ScenarioResult> {
  const token = await getAdminToken();
  if (!token) return { success: false, message: "Admin auth failed" };

  const ref = `TEST-CASH-${Date.now()}`;

  // Credit lot revenue
  const { ok, data } = await postWithAuth(
    `${ADMIN_API}/financial/adjust`,
    token,
    {
      walletType: "MERCHANT",
      targetId: String(PARKING_ID),
      action: "CREDIT",
      amount: fare,
      currency: "MAD",
      reason: `Test Center — simulated cash payment at gate (${fare} MAD to lot ${PARKING_ID})`,
      relatedReference: ref,
    },
  );

  // Also insert real cash tracker + debt records via admin backend
  const cashToken = await getAdminToken();
  if (cashToken) {
    const params = new URLSearchParams({
      fare: String(fare),
      commission: String(commission),
    });
    await fetch(`${ADMIN_API}/test/cash-session?${params}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cashToken}` },
    });
  }

  const msg = (data as Record<string, unknown>)?.message as string;
  return {
    success: ok,
    message: ok
      ? `Cash gate — lot +${fare} MAD, cash commission owed +${commission} MAD`
      : `Cash gate failed: ${msg ?? "Unknown"}`,
  };
}

/**
 * Fetches the tenant's cash ledger: tally, debts, and lot commission.
 * Includes booking commissions and extension commissions.
 */
export async function fetchCashLedger(): Promise<{
  cashTally: number;
  cashCollected: number;
  openDebts: number;
  lotCommission: number;
} | null> {
  const token = await getTenantToken();
  if (!token) return null;
  const d = (await fetchWithAuth(
    `${ADMIN_API}/tenant/financial/cash-ledger`,
    token,
  )) as Record<string, unknown> | null;
  if (!d) return null;
  return {
    cashTally: (d.cashTally as number) ?? 0,
    cashCollected: (d.cashCollected as number) ?? 0,
    openDebts: (d.openDebts as number) ?? 0,
    lotCommission: (d.lotCommission as number) ?? 0,
  };
}

// ── Month-End Settlement ────────────────────────────────────────────────

/**
 * Executes the full digital payout flow (PRD §8.1).
 * Tenant requests a settlement → Super Admin auto-approves → payout executed.
 * Uses the real admin backend settlement pipeline.
 */
export async function executeSettleDigital(): Promise<ScenarioResult> {
  try {
    // Step 1: Get tenant token
    const tenantToken = await getTenantToken();
    if (!tenantToken) return { success: false, message: "Tenant auth failed" };

    // Step 2: Tenant requests settlement
    const reqRes = await fetch(`${ADMIN_API}/tenant/financial/settlements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tenantToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankDetails: "VIZ-DEV",
        tenantNote: "VIZ month-end digital payout",
      }),
    });
    const reqJson = await reqRes.json();
    if (!reqRes.ok) {
      return {
        success: false,
        message: reqJson.message ?? "Settlement request failed",
      };
    }
    const settlementId = reqJson.data?.id;
    if (!settlementId) {
      return { success: false, message: "No settlement ID in response" };
    }

    // Step 3: Super admin approves the settlement (triggers payout)
    const adminToken = await getAdminToken();
    if (!adminToken) return { success: false, message: "Admin auth failed" };

    const approveRes = await fetch(
      `${ADMIN_API}/financial/settlements/${settlementId}/approve`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewNote: "VIZ auto-approved" }),
      },
    );
    const approveJson = await approveRes.json();
    return {
      success: approveRes.ok,
      message:
        approveJson.message ??
        (approveRes.ok
          ? "Settlement approved and payout executed"
          : "Approval failed"),
    };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

/**
 * Executes cash commission netting (PRD §8.2).
 * Marks commission_collected = commission_owed for the current billing period.
 *
 * Note: The new settlement approval endpoint also handles cash netting as part
 * of the digital payout. This standalone function remains for testing §8.2 in
 * isolation and still uses the dev-only direct-DB route until a standalone
 * backend endpoint is added.
 */
export async function executeSettleCash(): Promise<ScenarioResult> {
  try {
    const res = await fetch("/api/settlement/cash", { method: "POST" });
    const json = await res.json();
    return {
      success: json.success ?? res.ok,
      message: json.message ?? "Unknown",
    };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

/**
 * Fetch the most recent CONFIRMED or ACTIVE booking for the test driver.
 */
export async function fetchLatestBooking(): Promise<string | null> {
  const token = await getDriverToken();
  if (!token) return null;
  const res = await fetch(`${MAIN_API}/booking/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ page: 1, pageSize: 5 }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const items = (json.data?.items as Array<Record<string, unknown>>) ?? [];
  const confirmed = items.find(
    (i) => i.status === "CONFIRMED" || i.status === "ACTIVE",
  );
  return (confirmed?.booking_reference as string) ?? null;
}

/**
 * Checks if the test driver has an ACTIVE booking (escrow not yet released).
 */
export async function checkActiveBooking(
  commissionRate: number = 0.1,
): Promise<{
  hasActive: boolean;
  bookingRef: string | null;
  escrowAmount: number;
} | null> {
  const token = await getDriverToken();
  if (!token) return null;

  // Check via booking list API — status 'A' in DB appears as CONFIRMED in API,
  // but bookings with gate entry have escrow that hasn't been released.
  // We check escrow + no gate exit as the signal.
  const res = await fetch(`${MAIN_API}/booking/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ page: 1, pageSize: 5 }),
  });
  if (!res.ok) return { hasActive: false, bookingRef: null, escrowAmount: 0 };
  const json = await res.json();
  const items = (json.data?.items as Array<Record<string, unknown>>) ?? [];

  // Also check gate sessions as secondary signal
  const sRes = await fetch(`${MAIN_API}/gate/sessions/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let hasActiveSession = false;
  if (sRes.ok) {
    const sJson = await sRes.json();
    const sessions = (sJson.data as Array<Record<string, unknown>>) ?? [];
    hasActiveSession = sessions.some(
      (s) => s.status === "ACTIVE" && s.sessionType === "BOOKING_ACTIVATION",
    );
  }

  // An active booking = ACTIVE/CONFIRMED booking with an active gate session
  // (gate entry done but no exit — escrow held)
  const activeBooking = items.find(
    (i) => i.status === "CONFIRMED" || i.status === "ACTIVE",
  );
  if (activeBooking && hasActiveSession) {
    return {
      hasActive: true,
      bookingRef: (activeBooking.booking_reference as string) ?? null,
      escrowAmount:
        Math.round(
          ((activeBooking.amount as number) ?? 0) * (1 - commissionRate) * 100,
        ) / 100,
    };
  }

  return { hasActive: false, bookingRef: null, escrowAmount: 0 };
}

/* ── Test data reset ───────────────────────────────────────────────── */

/** Hard reset: zeroes out all test account data via server-side SQL */
export async function resetTestData(): Promise<ScenarioResult> {
  const res = await fetch("/api/reset-test-data", { method: "POST" });
  const json = await res.json();
  return {
    success: json.success,
    message: json.message ?? "Unknown",
  };
}

/* ── Legacy ────────────────────────────────────────────────────────── */

export async function fetchFinancialOverview(
  signal: AbortSignal,
): Promise<PlatformData | null> {
  if (signal.aborted) return null;
  const live = await fetchLiveData();
  if (!live.connected) return null;
  return {
    totalDriverBalance: live.driver?.balance ?? 0,
    totalMerchantBalance: live.tenant?.merchantBalance ?? 0,
    totalCommissionAllTime: live.tenant?.commissionPaid ?? 0,
    totalCommissionThisMonth: 0,
    pendingSettlements: live.tenant?.pendingSettlements ?? 0,
    commissionWalletBalance: null,
    settlementWalletBalance: null,
  };
}
