import type { CancellationScenario } from "@/types/cancellation";

/** Cancellation test scenarios from CANCELLATION_POLICY.md */
export const CANCELLATION_SCENARIOS: CancellationScenario[] = [
  {
    id: "full-refund",
    name: "Full Refund — >24h",
    description: "Cancelled 48h before start → 100% back",
    input: { hoursUntilStart: 48, bookingStatus: "CONFIRMED", bookingAmount: 100, isGateSession: false, isExtended: false },
    expected: { tier: "FULL", driverRecovers: 100, platformKeeps: 0, lotReceives: 0, reason: "More than 24h before start" },
  },
  {
    id: "partial-refund",
    name: "Partial 50% — 12h",
    description: "Cancelled 12h before start → 50% back, lot gets 45%",
    input: { hoursUntilStart: 12, bookingStatus: "CONFIRMED", bookingAmount: 100, isGateSession: false, isExtended: false },
    expected: { tier: "PARTIAL", driverRecovers: 50, platformKeeps: 5, lotReceives: 45, reason: "1–24h before start → 50% refund" },
  },
  {
    id: "no-refund",
    name: "No Refund — <1h",
    description: "Cancelled 30 min before start → nothing back",
    input: { hoursUntilStart: 0.5, bookingStatus: "CONFIRMED", bookingAmount: 100, isGateSession: false, isExtended: false },
    expected: { tier: "NONE", driverRecovers: 0, platformKeeps: 10, lotReceives: 90, reason: "Less than 1h before start" },
  },
  {
    id: "cannot-cancel-completed",
    name: "Cannot Cancel — Completed",
    description: "Booking already COMPLETED → no reversal possible",
    input: { hoursUntilStart: 0, bookingStatus: "COMPLETED", bookingAmount: 100, isGateSession: false, isExtended: false },
    expected: { tier: "CANNOT_CANCEL", driverRecovers: 0, platformKeeps: 0, lotReceives: 0, reason: "Booking already completed" },
  },
  {
    id: "cannot-cancel-gate",
    name: "Cannot Cancel — Gate Session",
    description: "Walk-in gate session → no pre-payment to refund",
    input: { hoursUntilStart: 0, bookingStatus: "CONFIRMED", bookingAmount: 0, isGateSession: true, isExtended: false },
    expected: { tier: "CANNOT_CANCEL", driverRecovers: 0, platformKeeps: 0, lotReceives: 0, reason: "Gate/walk-in session — no pre-payment exists" },
  },
  {
    id: "full-refund-boundary",
    name: "Full Refund — Exactly 24h",
    description: "Boundary: cancelled at exactly 24h → FULL refund",
    input: { hoursUntilStart: 24, bookingStatus: "CONFIRMED", bookingAmount: 100, isGateSession: false, isExtended: false },
    expected: { tier: "FULL", driverRecovers: 100, platformKeeps: 0, lotReceives: 0, reason: "24h or more before start → full refund" },
  },
  {
    id: "no-refund-extended",
    name: "Extended — No Refund",
    description: "Extension booking → always cancellable, never refundable",
    input: { hoursUntilStart: 48, bookingStatus: "CONFIRMED", bookingAmount: 30, isGateSession: false, isExtended: true },
    expected: { tier: "NONE", driverRecovers: 0, platformKeeps: 0, lotReceives: 0, reason: "Extended bookings — always cancellable, never refundable" },
  },
];
