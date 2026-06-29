/**
 * Agent auto-setup tools — one-click agent readiness for testing.
 * Handles: schedule creation, active lot, shift opening, float issuance.
 *
 * @module lib/agent-setup
 */

import { getToken, loginAdmin, loginTenant } from "@/lib/auth-service";

const ADMIN_API = "/api/admin";

const AGENT_EMAIL = "test-agent@otoparking.com";
const AGENT_PASSWORD = "54ea7aa5c314";
const AGENT_ID = 15;
const PARKING_ID = 61;
const TENANT_EMAIL = "test-tenant@otoparking.com";
const TENANT_PASSWORD = "Test-Tenant2026";

async function fetchAdmin(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
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
    return {
      ok: res.ok,
      data: json.data ?? json,
      error: res.ok ? undefined : ((json?.message as string) ?? `HTTP ${res.status}`),
    };
  } catch (e) {
    return { ok: false, data: null, error: String(e) };
  }
}

async function getTenantToken(): Promise<string | null> {
  let token = await getToken("tenant");
  if (!token) {
    const result = await loginTenant(TENANT_EMAIL, TENANT_PASSWORD);
    if (result.success && result.token) token = result.token;
  }
  return token;
}

export interface SetupResult {
  step: string;
  success: boolean;
  detail: string;
}

/**
 * Full agent setup pipeline: schedule → active lot → shift open → float.
 * Uses admin backend endpoints where available, falls back to DB for shift/float.
 */
export async function setupAgentForShift(
  shiftDate?: string,
): Promise<SetupResult[]> {
  const results: SetupResult[] = [];
  const today = shiftDate ?? new Date().toISOString().split("T")[0];

  // Get tenant token (needed for schedule creation)
  const tenantToken = await getTenantToken();
  if (!tenantToken) {
    results.push({ step: "auth", success: false, detail: "Tenant auth failed" });
    return results;
  }

  // ── Step 1: Create schedule for today if one doesn't exist ──
  const scheduleRes = await fetchAdmin(
    `/schedules?guardianId=${AGENT_ID}&dateFrom=${today}&dateTo=${today}`,
    tenantToken,
  );
  const schedules = (scheduleRes.data as Record<string, unknown>)?.items as Array<Record<string, unknown>> | undefined;
  const hasSchedule = schedules && schedules.length > 0;

  if (!hasSchedule) {
    const createRes = await fetchAdmin(`/schedules`, tenantToken, {
      method: "POST",
      body: JSON.stringify({
        guardianId: AGENT_ID,
        parkingId: PARKING_ID,
        scheduledDate: today,
        startTime: "08:00",
        endTime: "20:00",
      }),
    });
    results.push({
      step: "schedule",
      success: createRes.ok,
      detail: createRes.ok ? `Schedule created: ${today} 08:00–20:00` : (createRes.error ?? "Failed"),
    });
  } else {
    results.push({
      step: "schedule",
      success: true,
      detail: `Schedule already exists for ${today}`,
    });
  }

  // ── Step 2: Set agent active lot to 61 ──
  const activeLotRes = await fetchAdmin(
    `/agents/${AGENT_ID}/active-lot`,
    tenantToken,
    {
      method: "PUT",
      body: JSON.stringify({ parkingId: PARKING_ID }),
    },
  );
  results.push({
    step: "active-lot",
    success: activeLotRes.ok,
    detail: activeLotRes.ok ? "Active lot set to 61" : (activeLotRes.error ?? "Failed"),
  });

  // ── Step 3: Open shift + issue float via DB (direct call) ──
  const shiftRes = await fetch("/api/agent-setup/shift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId: AGENT_ID, lotId: PARKING_ID, floatAmount: 200 }),
  });
  const shiftJson = await shiftRes.json();
  results.push({
    step: "shift",
    success: shiftRes.ok,
    detail: shiftRes.ok ? "Shift opened · Float 200 MAD issued" : (shiftJson?.message ?? "Failed"),
  });

  return results;
}

/**
 * Reset agent shift: mark tally as reconciled and clear active lot.
 */
export async function resetAgentShift(): Promise<SetupResult[]> {
  const results: SetupResult[] = [];

  const res = await fetch("/api/agent-setup/reset", { method: "POST" });
  const json = await res.json();
  results.push({
    step: "reset",
    success: res.ok,
    detail: res.ok ? "Agent shift reset" : (json?.message ?? "Failed"),
  });

  return results;
}
