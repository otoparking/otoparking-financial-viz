export type SettlementStatus = "PENDING" | "APPROVED" | "PAYOUT_INITIATED" | "PAID" | "PAYOUT_FAILED" | "CARRY_FORWARD";

export interface SettlementInput {
  lotRevenueBalance: number;
  cashCommissionTracker: number;
  tenantName: string;
  month: string;
}

export interface SettlementResult {
  grossRevenue: number;
  cashOwed: number;
  netWire: number;
  carryForward: number;
  lotWalletAfter: number;
  commissionAfter: number;
  cashTrackerAfter: number;
  status: SettlementStatus;
  reason: string;
}

export interface SettlementScenario {
  id: string;
  name: string;
  description: string;
  prdRef: string;
  input: SettlementInput;
  expected: SettlementResult;
}

export interface SettlementLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}
