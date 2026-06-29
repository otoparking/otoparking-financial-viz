/**
 * Scenario Handlers — one async function per PRD scenario.
 *
 * Each handler follows the same pattern:
 *   1. Emit monitor events ("pending" status)
 *   2. Call the backend API
 *   3. Emit result events ("ok" / "error" status)
 *   4. Return ScenarioResult
 *
 * These are called by page.tsx's runScenario if/else dispatcher.
 *
 * @module lib/scenario-handlers
 */

import type { ScenarioResult } from "@/lib/api";
import {
  executeTopUp,
  executeBooking,
  executeBookingCompleted,
  executeGateWalkIn,
  executeGateCashAgent,
  executeGateCash,
  executeOverstay,
  executeCancel,
  executeSettleDigital,
  executeSettleCash,
  fetchLatestBooking,
} from "@/lib/api";
import type { TestSettings } from "@/components/SettingsPanel";
import type { MonitorEvent } from "@/components/MonitorPanel";
import { toast } from "sonner";

type EmitFn = (
  category: MonitorEvent["type"],
  title: string,
  message: string,
  status: "pending" | "ok" | "error",
  meta?: Record<string, string | number | boolean>,
) => void;

// ── Top-Up ────────────────────────────────────────────────────────────

/**
 * Credits the driver wallet via admin financial adjust.
 * @param settings - test settings (topUpAmount)
 * @param emit - monitor event emitter
 */
export async function handleTopup(
  settings: TestSettings,
  emit: EmitFn,
): Promise<ScenarioResult> {
  emit(
    "api",
    "POST /admin/financial/adjust",
    `Top-up ${settings.topUpAmount} MAD`,
    "pending",
    {
      method: "POST",
      endpoint: "/admin/financial/adjust",
      amount: `${settings.topUpAmount} MAD`,
      purpose: "wallet credit",
    },
  );
  const result = await executeTopUp(settings.topUpAmount);
  emit(
    "api",
    "POST /admin/financial/adjust",
    result.success
      ? `Credited ${settings.topUpAmount} MAD`
      : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? {
          amount: `${settings.topUpAmount} MAD`,
          wallet: "driver",
          operation: "credit",
        }
      : { error: result.message ?? "unknown" },
  );
  return result;
}

// ── Booking ───────────────────────────────────────────────────────────

export interface BookingContext {
  bookToday: boolean;
  noMinBuffer: boolean;
}

/**
 * Pre-booking: pricing preview → confirm with auto-retry on slot conflicts.
 * @param settings - test settings (durationHours, startHour)
 * @param ctx - bookToday / noMinBuffer flags
 * @param emit - monitor event emitter
 * @returns ScenarioResult with bookingReference on success
 */
export async function handleBooking(
  settings: TestSettings,
  ctx: BookingContext,
  emit: EmitFn,
): Promise<ScenarioResult> {
  emit("api", "POST /pricing/preview", "Computing fare", "pending", {
    method: "POST",
    endpoint: "/pricing/preview",
    duration: `${settings.bookingDurationHours}h`,
    parkingId: 6,
  });
  emit(
    "db",
    "oto_booking_payment",
    "Will insert payment trace + escrow",
    "pending",
    {
      table: "oto_booking_payment",
      operation: "INSERT",
      willEscrow: true,
    },
  );

  let hour = settings.bookingStartHour;
  console.log(
    "[executeBooking] duration=",
    settings.bookingDurationHours,
    "startHour=",
    hour,
    "bookToday=",
    ctx.bookToday,
  );
  let result: ScenarioResult = await executeBooking(
    settings.bookingDurationHours,
    hour,
    ctx.bookToday,
    ctx.noMinBuffer,
  );

  let retries = 0;
  while (
    result &&
    !result.success &&
    (result.message.includes("Conflict") ||
      result.message.includes("Preview")) &&
    retries < 12
  ) {
    hour += 2;
    if (hour > 22) hour = 6;
    retries++;
    console.log(`[booking retry ${retries}/12] trying hour=${hour}`);
    toast("⚠️ Slot conflict", { description: `Retrying at ${hour}:00...` });
    result = await executeBooking(
      settings.bookingDurationHours,
      hour,
      ctx.bookToday,
      ctx.noMinBuffer,
    );
  }

  if (result && !result.success) {
    console.error("[booking] all retries exhausted", result);
    toast("⚠️ Booking failed", {
      description:
        result.message ||
        "No free time slots. Release escrow or Hard Reset first.",
    });
    return result;
  }

  emit(
    "api",
    "POST /booking/confirm",
    result.success
      ? `Confirmed ${result.bookingReference}`
      : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? {
          bookingRef: result.bookingReference ?? "",
          status: "CONFIRMED",
          fare: `${settings.bookingDurationHours * 5} MAD`,
        }
      : { error: result.message ?? "unknown" },
  );
  emit(
    "db",
    "oto_booking_payment",
    result.success ? "Payment trace + escrow inserted" : "Rolled back",
    result.success ? "ok" : "error",
    result.success
      ? {
          table: "oto_booking_payment",
          operation: "INSERT",
          escrow: `${settings.bookingDurationHours * 5} MAD`,
        }
      : { table: "oto_booking_payment", operation: "ROLLBACK" },
  );
  return result;
}

// ── Booking Completed ─────────────────────────────────────────────────

/**
 * Triggers escrow release for the latest booking (gate entry + exit simulation).
 * @param settings - test settings (autoReleaseEscrow)
 */
export async function handleBookingCompleted(
  settings: TestSettings,
): Promise<ScenarioResult> {
  return executeBookingCompleted(settings.autoReleaseEscrow);
}

// ── Gate Wallet ───────────────────────────────────────────────────────

/**
 * Walk-in gate session: start → wallet payment → end.
 */
export async function handleGateWallet(): Promise<ScenarioResult> {
  return executeGateWalkIn();
}

// ── Gate Cash ─────────────────────────────────────────────────────────

/**
 * Realistic Gate Cash: driver walk-in → agent collects cash.
 * The agent closes the session as CASH via the gate payment endpoint.
 * Agent tally + cash tracker update automatically server-side.
 */
export async function handleGateCash(
  _settings: TestSettings,
  emit: EmitFn,
): Promise<ScenarioResult> {
  emit("api", "POST /gate/sessions/start", "Driver walk-in entry", "pending", {
    method: "POST",
    endpoint: "/gate/sessions/start",
    sessionType: "WALK_IN",
  });
  emit("db", "oto_agent_cash_tally", "Agent will collect cash", "pending", {
    table: "oto_agent_cash_tally",
    operation: "UPDATE",
    agent: "Test Agent",
  });

  const result = await executeGateCashAgent();

  emit(
    "api",
    "POST /gate/payment/close/cash",
    result.success
      ? `Agent closed session as CASH`
      : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? { channel: "agent-cash", agent: "Test Agent", operation: "cash close" }
      : { error: result.message ?? "unknown" },
  );

  if (result.success) {
    emit("db", "oto_agent_cash_tally", "Agent tally updated", "ok", {
      table: "oto_agent_cash_tally",
      operation: "increment",
      note: "Cash in agent's hands increased",
    });
    emit("db", "oto_cash_commission_tracker", "Cash commission tracked", "ok", {
      table: "oto_cash_commission_tracker",
      operation: "UPSERT",
      note: "10% of fare owed to platform",
    });
  }

  return result;
}

// ── Overstay ──────────────────────────────────────────────────────────

/**
 * Extension/overstay: finds the booking ref, calls extension preview → confirm.
 * @param settings - test settings (overstayMinutes)
 * @param emit - monitor event emitter
 * @param bookingRef - booking to extend (from workflow's booking step)
 */
export async function handleOverstay(
  settings: TestSettings,
  emit: EmitFn,
  bookingRef: string | null,
): Promise<ScenarioResult> {
  emit(
    "api",
    "POST /booking/extension/preview → confirm",
    `Overstay ${settings.overstayMinutes} min`,
    "pending",
    {
      method: "POST",
      endpoint: "/booking/extension/confirm",
      minutes: settings.overstayMinutes,
      split: "10% comm / 90% escrow",
    },
  );

  const ref = bookingRef ?? (await fetchLatestBooking());
  let result: ScenarioResult;
  if (ref) {
    result = await executeOverstay(ref, settings.overstayMinutes ?? 90);
  } else {
    result = {
      success: false,
      message: "No booking found for overstay. Run a booking first.",
    };
  }

  emit(
    "api",
    "POST /booking/extension/confirm",
    result.success
      ? `Charged overstay ${settings.overstayMinutes} min`
      : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? { minutes: settings.overstayMinutes, split: "10% comm / 90% escrow" }
      : { error: result.message ?? "unknown" },
  );
  return result;
}

// ── Cancel ──────────────────────────────────────────────────

/**
 * Cancels a booking. Uses workflow's booking ref, falls back to fetchLatestBooking.
 * @param bookingRef - booking to cancel (from workflow's booking step)
 */
export async function handleCancel(
  bookingRef: string | null,
): Promise<ScenarioResult> {
  if (bookingRef) {
    return executeCancel(bookingRef);
  }
  const ref = await fetchLatestBooking();
  if (ref) {
    return executeCancel(ref);
  }
  return {
    success: false,
    message: "No booking found to cancel. Run a booking first.",
  };
}

// ── Month-End Settlement ──────────────────────────────────────────────

/**
 * Executes Month-End Digital Payout (PRD §8.1):
 * Tenant requests settlement → SA auto-approves → merchant wallet zeroed.
 */
export async function handleSettleDigital(
  emit: EmitFn,
): Promise<ScenarioResult> {
  emit(
    "api",
    "POST /tenant/financial/settlements → PUT /financial/settlements/{id}/approve",
    "Requesting + auto-approving month-end digital payout",
    "pending",
    { flow: "settle-digital", section: "§8.1" },
  );
  const result = await executeSettleDigital();
  emit(
    "api",
    "Settlement payout",
    result.success ? result.message : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? { status: "APPROVED", walletOp: "merchant wallet debited" }
      : { error: result.message },
  );
  return result;
}

/**
 * Executes Month-End Cash Netting (PRD §8.2):
 * Marks accumulated cash commissions as collected for the current period.
 */
export async function handleSettleCash(emit: EmitFn): Promise<ScenarioResult> {
  emit(
    "db",
    "oto_cash_commission_tracker",
    "Marking cash commission as collected for current billing period",
    "pending",
    {
      table: "oto_cash_commission_tracker",
      operation: "UPDATE commission_collected",
      section: "§8.2",
    },
  );
  const result = await executeSettleCash();
  emit(
    "db",
    "oto_cash_commission_tracker",
    result.success ? result.message : (result.message ?? "Failed"),
    result.success ? "ok" : "error",
    result.success
      ? { operation: "commission_collected updated", status: "netted" }
      : { error: result.message },
  );
  return result;
}
