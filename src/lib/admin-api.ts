/**
 * Admin Backend API Layer — bridges the test center to the full OtoParking admin backend.
 *
 * All calls go through Next.js rewrites: /api/admin/* → http://localhost:8082/api/admin/*
 * Auth uses the shared auth-service for admin/manager/agent tokens.
 *
 * @module lib/admin-api
 */

import { getToken, loginAdmin, loginTenant } from "@/lib/auth-service";

const ADMIN_API = "/api/admin";

/* ── Test accounts ──────────────────────────────────────────────────── */
const ADMIN_EMAIL = "admin@otoparking.com";
const ADMIN_PASSWORD = "Admin@12345";
const TENANT_EMAIL = "test-tenant@otoparking.com";
const TENANT_PASSWORD = "Test-Tenant2026";

const AGENT_ID = 15;
const PARKING_ID = 61;

/* ── Auth helpers ───────────────────────────────────────────────────── */

async function getAdminToken(): Promise<string | null> {
  let token = await getToken("admin");
  if (!token) {
    const result = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (result.success && result.token) token = result.token;
  }
  return token;
}

async function fetchAdmin<T>(
  path: string,
  token: string | null,
  options?: RequestInit,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  if (!token) return { ok: false, data: null, error: "No admin token" };
  try {
    const res = await fetch(`${ADMIN_API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        data: null,
        error: json?.message ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, data: json.data as T };
  } catch (e) {
    return { ok: false, data: null, error: String(e) };
  }
}

/* ── Types ──────────────────────────────────────────────────────────── */

export interface CashTrackerRow {
  id: string;
  lotId: number;
  billingPeriod: string;
  totalCashSessions: number;
  totalCashFare: number;
  commissionOwed: number;
  commissionCollected: number;
  commissionOutstanding?: number;
  carryForward: number;
  lastUpdatedAt: string;
}

export interface AgentTallyDTO {
  id: string;
  agentId: number;
  lotId: number;
  shiftDate: string;
  shiftNumber: number;
  floatAmount: number;
  totalCollected: number;
  expectedAmount: number;
  sessionCount: number;
  status: string;
  confirmedAmount: number | null;
  discrepancyAmount: number | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
}

export interface CashLedgerData {
  cashTally: number;
  cashCollected: number;
  openDebts: Array<{
    id: string;
    driverId: string;
    amountOwed: number;
    status: string;
  }>;
  lotCommission: {
    totalCashFare: number;
    commissionOwed: number;
    commissionCollected: number;
    billingPeriod: string;
  };
}

export interface GateSessionRow {
  sessionId: string;
  lotId: number;
  driverId: string;
  status: string;
  paymentMethod: string | null;
  fareAmount: number | null;
  exitMethod?: string;
  createdAt: string;
}

export interface AgentStatusData {
  id: number;
  accountId: string;
  firstName: string;
  lastName: string;
  status: string;
  assignedLots: Array<{ parkingId: number; parkingName: string }>;
  activeParkingId: number | null;
  activeParkingName: string | null;
  todayCashCollected: number;
  todayCashSessions: number;
  todayWalletCollected: number;
  todayWalletSessions: number;
  shiftHistory: Array<{
    date: string;
    status: string;
    cashSessions: number;
    cashCollected: number;
  }>;
}

export interface FinancialOverview {
  totalDriverBalance: number;
  totalMerchantBalance: number;
  totalCommissionAllTime: number;
  totalCommissionThisMonth: number;
  pendingSettlements: number;
  cashTallyOpenShifts: number;
  openDebtCount: number;
}

/* ── Cash Tracker ───────────────────────────────────────────────────── */

export async function fetchCashTracker(
  lotId: number = PARKING_ID,
  billingPeriod?: string,
): Promise<CashTrackerRow | null> {
  const token = await getAdminToken();
  const params = new URLSearchParams({ lotId: String(lotId) });
  if (billingPeriod) params.set("billingPeriod", billingPeriod);
  const { ok, data } = await fetchAdmin<{ items: CashTrackerRow[] }>(
    `/financial/cash-tracker?${params}`,
    token,
  );
  if (ok && data?.items?.length) return data.items[0];
  return null;
}

/* ── Agent Tally ────────────────────────────────────────────────────── */

/**
 * Fetches agent cash tally from the tenant cash-ledger endpoint.
 * This endpoint returns the tally for the tenant's lot(s).
 */
export async function fetchAgentTallyFromLedger(): Promise<{
  cashTally: number;
  cashCollected: number;
  sessionCount: number;
} | null> {
  const ledger = await fetchCashLedger();
  if (!ledger) return null;
  return {
    cashTally: ledger.cashTally,
    cashCollected: ledger.cashCollected,
    sessionCount: 0, // ledger doesn't expose session count per agent
  };
}

/* ── Agent Status ───────────────────────────────────────────────────── */

export async function fetchAgentStatus(
  agentId: number = AGENT_ID,
): Promise<AgentStatusData | null> {
  const token = await getAdminToken();
  const { ok, data } = await fetchAdmin<AgentStatusData>(
    `/agents/${agentId}`,
    token,
  );
  return ok ? data : null;
}

/* ── Cash Ledger (Tenant view) ──────────────────────────────────────── */

export async function fetchCashLedger(): Promise<CashLedgerData | null> {
  // Use tenant token since this is a tenant endpoint
  let token = await getToken("tenant");
  if (!token) {
    const result = await loginTenant(TENANT_EMAIL, TENANT_PASSWORD);
    if (result.success && result.token) token = result.token;
  }
  if (!token) return null;
  const { ok, data } = await fetchAdmin<CashLedgerData>(
    `/tenant/financial/cash-ledger`,
    token,
  );
  return ok ? data : null;
}

/* ── Financial Overview ─────────────────────────────────────────────── */

export async function fetchFinancialOverview(): Promise<FinancialOverview | null> {
  const token = await getAdminToken();
  const { ok, data } = await fetchAdmin<FinancialOverview>(
    `/financial/overview`,
    token,
  );
  return ok ? data : null;
}

/* ── Gate Sessions ──────────────────────────────────────────────────── */

export async function fetchGateSessions(
  lotId: number = PARKING_ID,
  limit: number = 10,
): Promise<GateSessionRow[]> {
  const token = await getAdminToken();
  const params = new URLSearchParams({
    lotId: String(lotId),
    pageSize: String(limit),
    page: "1",
  });
  const { ok, data } = await fetchAdmin<{ items: GateSessionRow[] }>(
    `/financial/sessions/list?${params}`,
    token,
  );
  if (ok && data?.items) return data.items;
  // Fallback: try direct gate session endpoint
  const { ok: ok2, data: data2 } = await fetchAdmin<GateSessionRow[]>(
    `/gate/feed?parkingId=${lotId}`,
    token,
  );
  return ok2 && data2 ? data2 : [];
}

/* ── Full Agent + Cash state snapshot ───────────────────────────────── */

export interface AgentCashSnapshot {
  agent: AgentStatusData | null;
  tally: AgentTallyDTO | null;
  cashTracker: CashTrackerRow | null;
  cashLedger: CashLedgerData | null;
  overview: FinancialOverview | null;
  agentOperational: boolean;
  issues: string[];
}

export async function fetchAgentCashSnapshot(): Promise<AgentCashSnapshot> {
  const [agent, cashTracker, cashLedger, overview] = await Promise.all([
    fetchAgentStatus().catch(() => null),
    fetchCashTracker().catch(() => null),
    fetchCashLedger().catch(() => null),
    fetchFinancialOverview().catch(() => null),
  ]);

  const issues: string[] = [];
  let agentOperational = true;

  if (!agent) {
    issues.push("Agent not found");
    agentOperational = false;
  } else {
    if (agent.status !== "A") {
      issues.push(`Agent status is ${agent.status} (not active)`);
      agentOperational = false;
    }
    if (!agent.activeParkingId) {
      issues.push("Agent has no active lot set");
      agentOperational = false;
    }
    if (agent.todayCashSessions === 0 && agent.todayWalletSessions === 0) {
      // Only flag as issue if tally doesn't exist either — shift may just have started
    }
  }

  // Build tally from agent data + cash ledger
  let tally: AgentTallyDTO | null = null;
  if (agent && cashLedger) {
    tally = {
      id: "",
      agentId: AGENT_ID,
      lotId: PARKING_ID,
      shiftDate: new Date().toISOString().split("T")[0],
      shiftNumber: 1,
      floatAmount: 200.0,
      totalCollected: cashLedger.cashCollected,
      expectedAmount: 200.0 + cashLedger.cashCollected,
      sessionCount: agent.todayCashSessions,
      status: agent.todayCashSessions > 0 ? "OPEN" : "AWAITING_FLOAT",
      confirmedAmount: null,
      discrepancyAmount: null,
      reconciledBy: null,
      reconciledAt: null,
    };
  }

  return {
    agent,
    tally,
    cashTracker,
    cashLedger,
    overview,
    agentOperational,
    issues,
  };
}
