/**
 * Simulation engine — executes multi-actor financial scenarios with
 * concurrency, audit trail, and invariant checks.
 *
 * @module lib/simulation/engine
 */

import type {
  SimScenario,
  SimStep,
  SimAccount,
  ActorPool,
  AuditEntry,
  CheckpointResult,
  SimulationResult,
} from "./types";
import { checkInvariants, type InvariantContext } from "./invariants";
import { getToken, loginDriver, setToken } from "@/lib/auth-service";

const MAIN_API = "/api/backend";
const ADMIN_API = "/api/admin";
const PARKING_ID = 61;
const VEHICLE_ID = 159;
const ADMIN_EMAIL = "admin@otoparking.com";
const ADMIN_PASSWORD = "Admin@12345";

/* ── Actor Resolution ──────────────────────────────────────────────── */

function resolveActor(pool: ActorPool, actorKey: string): SimAccount {
  // Parse "driver-1" → role=driver, index=0
  const parts = actorKey.split("-");
  const role = parts[0];
  const idx = parseInt(parts[1] ?? "1", 10) - 1;
  const list = role === "driver" ? pool.drivers : pool.agents;
  if (idx < 0 || idx >= list.length) {
    throw new Error(`Actor ${actorKey} not found in pool`);
  }
  return list[idx];
}

async function getOrRefreshToken(account: SimAccount): Promise<string> {
  if (account.token) {
    // Verify token is still valid by checking cache
    const cached = await getToken(account.role);
    if (cached) return cached;
  }
  // Re-login
  const result = await loginDriver(account.email, account.password);
  if (!result.success || !result.token) {
    throw new Error(`Login failed for ${account.email}`);
  }
  account.token = result.token;
  setToken(account.role, result.token, 86400);
  return result.token;
}

async function getAdminToken(): Promise<string> {
  const cached = await getToken("admin");
  if (cached) return cached;
  const { loginAdmin } = await import("@/lib/auth-service");
  const result = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!result.success || !result.token) throw new Error("Admin login failed");
  setToken("admin", result.token, 86400);
  return result.token;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

async function fetchLatestBookingForActor(
  token: string,
): Promise<string | null> {
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

/* ── Step Execution ─────────────────────────────────────────────────── */

async function executeStep(
  step: SimStep,
  account: SimAccount,
  stepIndex: number,
): Promise<AuditEntry> {
  const start = performance.now();
  const audit: AuditEntry = {
    stepIndex,
    actor: step.actor,
    action: step.action,
    timestamp: new Date(),
    durationMs: 0,
    success: false,
    message: "",
  };

  try {
    const result = await dispatchAction(
      step.action,
      step.params ?? {},
      account,
    );
    audit.success = result.success;
    audit.message = result.message;
    audit.request = result.request;
    audit.response = result.response;
  } catch (e) {
    audit.success = false;
    audit.message = String(e);
  }

  audit.durationMs = Math.round(performance.now() - start);
  return audit;
}

interface ActionResult {
  success: boolean;
  message: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

async function dispatchAction(
  action: string,
  params: Record<string, unknown>,
  account: SimAccount,
): Promise<ActionResult> {
  const token = await getOrRefreshToken(account);

  switch (action) {
    /* ── Top-up ─────────────────────────────────────────────────── */
    case "topup": {
      const amount = (params.amount as number) ?? 20;
      const adminToken = await getAdminToken();
      const req = {
        walletType: "driver",
        targetId: account.accountId,
        action: "credit",
        amount,
        relatedReference: `SIM-${Date.now()}`,
        reason: "Simulation test top-up",
      };
      const res = await fetch(`${ADMIN_API}/financial/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(req),
      });
      const json = await res.json();
      return {
        success: res.ok,
        message: res.ok ? `Top-up ${amount} MAD` : (json.message ?? "Failed"),
        request: req,
        response: json,
      };
    }

    /* ── Booking ────────────────────────────────────────────────── */
    case "booking": {
      const duration = (params.duration as number) ?? 2;
      const startHour = (params.startHour as number) ?? 14;
      const bookTomorrow = (params.bookTomorrow as boolean) ?? true;
      const start = new Date();
      if (bookTomorrow) start.setDate(start.getDate() + 1);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start.getTime() + duration * 3600_000);
      const fmt = (d: Date) => d.toISOString().replace("Z", "");

      const req = {
        parking_id: PARKING_ID,
        vehicle_id: VEHICLE_ID,
        start_date: fmt(start),
        end_date: fmt(end),
        include_order_details: true,
      };
      const previewRes = await fetch(`${MAIN_API}/pricing/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-UTC-Offset": "0",
        },
        body: JSON.stringify(req),
      });
      const previewJson = await previewRes.json();
      if (!previewRes.ok) {
        return {
          success: false,
          message: `Pricing: ${previewJson.message ?? "failed"}`,
          request: req,
          response: previewJson,
        };
      }
      const previewId = previewJson.data?.preview_id as string;
      if (!previewId) {
        return {
          success: false,
          message: "No preview_id in response",
          response: previewJson,
        };
      }

      const confirmRes = await fetch(`${MAIN_API}/booking/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-UTC-Offset": "0",
        },
        body: JSON.stringify({ preview_id: previewId }),
      });
      const confirmJson = await confirmRes.json();
      return {
        success: confirmRes.ok,
        message: confirmRes.ok
          ? `Booked ${duration}h`
          : (confirmJson.message ?? "Failed"),
        request: { preview_id: previewId },
        response: confirmJson,
      };
    }

    /* ── Booking Completed ──────────────────────────────────────── */
    case "booking-completed": {
      const bookingRef = await fetchLatestBookingForActor(token);
      if (!bookingRef) {
        return { success: false, message: "No confirmed booking found" };
      }
      // Fetch booking ID
      const listRes = await fetch(`${MAIN_API}/booking/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page: 1, pageSize: 5 }),
      });
      const listJson = await listRes.json();
      const items =
        (listJson.data?.items as Array<Record<string, unknown>>) ?? [];
      const found = items.find((i) => i.booking_reference === bookingRef);
      const bookingId = found?.booking_id as number;
      if (!bookingId) {
        return { success: false, message: "Could not resolve booking ID" };
      }

      // Entry
      const entryRes = await fetch(`${MAIN_API}/gate/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lotId: PARKING_ID,
          vehicleId: VEHICLE_ID,
          sessionType: "BOOKING_ACTIVATION",
          bookingRefId: bookingId,
          laneId: "SIM-LANE-01",
        }),
      });
      const entryJson = await entryRes.json();
      const inner = (entryJson.data ?? entryJson) as Record<string, unknown>;
      const sessionToken = inner?.sessionToken as string;
      if (!sessionToken) {
        return {
          success: false,
          message: `Entry failed: ${entryJson.message ?? "unknown"}`,
        };
      }

      // Exit
      const exitRes = await fetch(`${MAIN_API}/gate/sessions/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionToken }),
      });
      const exitJson = await exitRes.json();
      return {
        success: exitRes.ok,
        message: exitRes.ok
          ? `Completed ${bookingRef}`
          : (exitJson.message ?? "Exit failed"),
        response: exitJson,
      };
    }

    /* ── Gate Wallet ────────────────────────────────────────────── */
    case "gate-wallet": {
      const entryRes = await fetch(`${MAIN_API}/gate/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lotId: PARKING_ID,
          vehicleId: VEHICLE_ID,
          sessionType: "WALK_IN",
          laneId: "SIM-LANE-01",
        }),
      });
      const entryJson = await entryRes.json();
      const inner = (entryJson.data ?? entryJson) as Record<string, unknown>;
      const sessionToken = inner?.sessionToken as string;
      if (!sessionToken) {
        return {
          success: false,
          message: `Walk-in start failed: ${entryJson.message ?? "unknown"}`,
        };
      }

      const exitRes = await fetch(`${MAIN_API}/gate/sessions/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionToken }),
      });
      const exitJson = await exitRes.json();
      return {
        success: exitRes.ok,
        message: exitRes.ok
          ? `Walk-in exit`
          : (exitJson.message ?? "Exit failed"),
        response: exitJson,
      };
    }

    /* ── Gate Cash (uses agent) ──────────────────────────────────── */
    case "gate-cash": {
      // Driver starts session
      const entryRes = await fetch(`${MAIN_API}/gate/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lotId: PARKING_ID,
          vehicleId: VEHICLE_ID,
          sessionType: "WALK_IN",
          laneId: "SIM-LANE-01",
        }),
      });
      const entryJson = await entryRes.json();
      const inner = (entryJson.data ?? entryJson) as Record<string, unknown>;
      const sessionToken = inner?.sessionToken as string;
      if (!sessionToken) {
        return {
          success: false,
          message: `Walk-in start failed: ${entryJson.message ?? "unknown"}`,
        };
      }

      // Agent closes as cash
      const agentAccount = account; // The actor IS the agent
      const agentToken = await getOrRefreshToken(agentAccount);

      const cashRes = await fetch(`${MAIN_API}/gate/payment/close/cash`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agentToken}`,
        },
        body: JSON.stringify({ sessionToken, parkingId: PARKING_ID }),
      });
      const cashJson = await cashRes.json();
      return {
        success: cashRes.ok,
        message: cashRes.ok
          ? `Cash closed`
          : (cashJson.message ?? "Cash close failed"),
        response: cashJson,
      };
    }

    /* ── Cancel ──────────────────────────────────────────────────── */
    case "cancel": {
      let bookingRef = params.bookingRef as string;
      if (!bookingRef || bookingRef === "__auto__") {
        const latest = await fetchLatestBookingForActor(token);
        if (!latest)
          return { success: false, message: "No booking found to cancel" };
        bookingRef = latest;
      }
      const previewRes = await fetch(`${MAIN_API}/booking/cancel/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_reference: bookingRef }),
      });
      const previewJson = await previewRes.json();
      if (!previewRes.ok) {
        return {
          success: false,
          message: `Cancel preview: ${previewJson.message ?? "failed"}`,
        };
      }

      const confirmRes = await fetch(`${MAIN_API}/booking/cancel/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_reference: bookingRef,
          reason: "Simulation",
        }),
      });
      const confirmJson = await confirmRes.json();
      return {
        success: confirmRes.ok,
        message: confirmRes.ok
          ? `Cancelled ${bookingRef}`
          : (confirmJson.message ?? "Failed"),
        response: confirmJson,
      };
    }

    /* ── Overstay ────────────────────────────────────────────────── */
    case "overstay": {
      const extensionMinutes = (params.extensionMinutes as number) ?? 90;
      let bookingRef = params.bookingRef as string;
      if (!bookingRef || bookingRef === "__auto__") {
        const latest = await fetchLatestBookingForActor(token);
        if (!latest)
          return { success: false, message: "No booking found to extend" };
        bookingRef = latest;
      }
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
      if (!previewRes.ok) {
        return {
          success: false,
          message: `Extension preview: ${previewJson.message ?? "failed"}`,
        };
      }
      const previewId = previewJson.data?.extension_preview_id as string;

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
      return {
        success: confirmRes.ok,
        message: confirmRes.ok
          ? `Overstay ${extensionMinutes}min`
          : (confirmJson.message ?? "Failed"),
        response: confirmJson,
      };
    }

    /* ── Settle Digital ──────────────────────────────────────────── */
    case "settle-digital": {
      // Use tenant token for settlement request, admin for approval
      const {
        loginTenant,
        getToken: gt,
        setToken: st,
      } = await import("@/lib/auth-service");
      let tenantTok = await gt("tenant" as any);
      if (!tenantTok) {
        const r = await loginTenant(
          "test-tenant@otoparking.com",
          "Test-Tenant2026",
        );
        if (r.success && r.token) {
          tenantTok = r.token;
          st("tenant" as any, tenantTok, 86400);
        }
      }
      if (!tenantTok) return { success: false, message: "Tenant auth failed" };

      const adminToken = await getAdminToken();
      // Tenant requests settlement
      const reqRes = await fetch(`${ADMIN_API}/tenant/financial/settlements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantTok}`,
        },
        body: JSON.stringify({
          bankDetails: "SIM-DEV",
          tenantNote: "Simulation settlement",
        }),
      });
      const reqJson = await reqRes.json();
      if (!reqRes.ok) {
        return {
          success: false,
          message: `Settlement request: ${reqJson.message ?? "failed"}`,
        };
      }
      const settlementId = reqJson.data?.id as number;
      if (!settlementId) {
        return { success: false, message: "No settlement ID" };
      }

      // Admin approves
      const approveRes = await fetch(
        `${ADMIN_API}/financial/settlements/${settlementId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ reviewNote: "Simulation auto-approve" }),
        },
      );
      const approveJson = await approveRes.json();
      return {
        success: approveRes.ok,
        message: approveRes.ok
          ? "Settlement approved"
          : (approveJson.message ?? "Failed"),
        response: approveJson,
      };
    }

    /* ── Settle Cash ─────────────────────────────────────────────── */
    case "settle-cash": {
      // Uses the dev-only route since no standalone backend endpoint yet
      const res = await fetch("/api/settlement/cash", { method: "POST" });
      const json = await res.json();
      return {
        success: json.success ?? res.ok,
        message: json.message ?? "Cash netted",
        response: json,
      };
    }

    /* ── Release to Manager ──────────────────────────────────────── */
    case "release-to-manager": {
      const adminToken = await getAdminToken();
      const res = await fetch(
        `${ADMIN_API}/financial/cash-flow/release-to-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ lotId: PARKING_ID }),
        },
      );
      const json = await res.json();
      return {
        success: res.ok,
        message: json.message ?? "Released to manager",
        response: json,
      };
    }

    /* ── Release to Tenant ───────────────────────────────────────── */
    case "release-to-tenant": {
      const adminToken = await getAdminToken();
      const res = await fetch(
        `${ADMIN_API}/financial/cash-flow/release-to-tenant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ lotId: PARKING_ID }),
        },
      );
      const json = await res.json();
      return {
        success: res.ok,
        message: json.message ?? "Released to tenant",
        response: json,
      };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

/* ── Simulation Runner ─────────────────────────────────────────────── */

export async function runSimulation(
  scenario: SimScenario,
  pool: ActorPool,
  onProgress?: (step: number, total: number, audit: AuditEntry) => void,
  onCheckpoint?: (cp: CheckpointResult) => void,
): Promise<SimulationResult> {
  const startTime = performance.now();
  const audit: AuditEntry[] = [];
  const checkpointResults: CheckpointResult[] = [];

  // Group steps by delay for concurrency
  const delayGroups = new Map<number, { step: SimStep; index: number }[]>();
  scenario.steps.forEach((step, i) => {
    const group = delayGroups.get(step.delay) ?? [];
    group.push({ step, index: i });
    delayGroups.set(step.delay, group);
  });

  const sortedDelays = [...delayGroups.keys()].sort((a, b) => a - b);
  let completedCount = 0;

  for (const delay of sortedDelays) {
    const group = delayGroups.get(delay)!;

    // Wait for this delay group's time
    await new Promise((r) => setTimeout(r, delay));

    // Execute all steps in this delay group concurrently
    const results = await Promise.all(
      group.map(async ({ step, index }) => {
        try {
          const account = resolveActor(pool, step.actor);
          const entry = await executeStep(step, account, index);
          return { ...entry, index };
        } catch (e) {
          return {
            stepIndex: index,
            actor: step.actor,
            action: step.action,
            timestamp: new Date(),
            durationMs: 0,
            success: false,
            message: `Actor resolution failed: ${e}`,
            index,
          } as AuditEntry & { index: number };
        }
      }),
    );

    // Record audit entries in step order
    results.sort((a, b) => a.index - b.index);
    for (const r of results) {
      const { index, ...entry } = r;
      audit.push(entry);
      completedCount++;
      onProgress?.(completedCount, scenario.steps.length, entry);
    }

    // Check checkpoints after this delay group
    for (const cp of scenario.checkpoints) {
      if (cp.afterStep === completedCount || cp.afterStep < completedCount) {
        // Only run each checkpoint once
        if (checkpointResults.find((r) => r.label === cp.label)) continue;

        const ctx: InvariantContext = { pool };
        const invariants = await checkInvariants(ctx);
        const allPass = invariants.every((i) => i.pass);
        const result: CheckpointResult = {
          label: cp.label,
          invariants,
          allPass,
        };
        checkpointResults.push(result);
        onCheckpoint?.(result);
      }
    }
  }

  const passed = audit.filter((a) => a.success).length;
  return {
    scenario: scenario.name,
    stepsTotal: scenario.steps.length,
    stepsPassed: passed,
    stepsFailed: scenario.steps.length - passed,
    durationMs: Math.round(performance.now() - startTime),
    audit,
    checkpoints: checkpointResults,
  };
}
