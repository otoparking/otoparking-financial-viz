import type { SettlementScenario } from "@/types/settlement";

/**
 * Month-end settlement scenarios from FINANCIAL_MODULE_PRD.md §8.
 */
export const SETTLEMENT_SCENARIOS: SettlementScenario[] = [
  {
    id: "digital-payout",
    name: "Digital Payout — Clean",
    description: "No cash sessions this month → full lot revenue wired",
    prdRef: "§8.1",
    input: { lotRevenueBalance: 5000, cashCommissionTracker: 0, tenantName: "Lot Oulfa", month: "June 2026" },
    expected: { grossRevenue: 5000, cashOwed: 0, netWire: 5000, carryForward: 0, lotWalletAfter: 0, commissionAfter: 0, cashTrackerAfter: 0, status: "PAID", reason: "Full Lot Revenue wired to tenant bank" },
  },
  {
    id: "cash-netting",
    name: "Cash Netting — C < B",
    description: "Cash commission < lot revenue → net wire = B − C",
    prdRef: "§8.2 · Scenario 14",
    input: { lotRevenueBalance: 5000, cashCommissionTracker: 300, tenantName: "Lot Oulfa", month: "June 2026" },
    expected: { grossRevenue: 5000, cashOwed: 300, netWire: 4700, carryForward: 0, lotWalletAfter: 0, commissionAfter: 300, cashTrackerAfter: 0, status: "PAID", reason: "Net wire: 5000 − 300 = 4700 MAD" },
  },
  {
    id: "cash-shortfall",
    name: "Cash Shortfall — C > B",
    description: "Cash owed exceeds lot revenue → carry forward deficit",
    prdRef: "§8.3 · Scenario 15",
    input: { lotRevenueBalance: 200, cashCommissionTracker: 500, tenantName: "Lot Oulfa", month: "June 2026" },
    expected: { grossRevenue: 200, cashOwed: 500, netWire: 0, carryForward: 300, lotWalletAfter: 0, commissionAfter: 200, cashTrackerAfter: 300, status: "CARRY_FORWARD", reason: "Cash owed (500) > lot revenue (200) → 300 MAD carried forward" },
  },
  {
    id: "no-revenue",
    name: "No Revenue — Zero Balances",
    description: "Lot had no activity → nothing to settle",
    prdRef: "§8.1 edge",
    input: { lotRevenueBalance: 0, cashCommissionTracker: 0, tenantName: "Lot Oulfa", month: "June 2026" },
    expected: { grossRevenue: 0, cashOwed: 0, netWire: 0, carryForward: 0, lotWalletAfter: 0, commissionAfter: 0, cashTrackerAfter: 0, status: "PENDING", reason: "Zero balances — nothing to settle" },
  },
  {
    id: "failed-payout",
    name: "Failed Payout — Retry",
    description: "Bank transfer fails → PAYOUT_FAILED → manual retry",
    prdRef: "§8.4",
    input: { lotRevenueBalance: 5000, cashCommissionTracker: 0, tenantName: "Lot Oulfa", month: "June 2026" },
    expected: { grossRevenue: 5000, cashOwed: 0, netWire: 5000, carryForward: 0, lotWalletAfter: 0, commissionAfter: 0, cashTrackerAfter: 0, status: "PAYOUT_FAILED", reason: "Bank rejects transfer → Finance retries (max 2 auto retries)" },
  },
  {
    id: "carry-forward-resolved",
    name: "Carry Forward — Next Month",
    description: "Last month's C > B deficit resolved this month",
    prdRef: "§8.3 · CARRY_FORWARD → PENDING",
    input: { lotRevenueBalance: 1000, cashCommissionTracker: 0, tenantName: "Lot Oulfa", month: "July 2026" },
    expected: { grossRevenue: 1000, cashOwed: 0, netWire: 1000, carryForward: 0, lotWalletAfter: 0, commissionAfter: 0, cashTrackerAfter: 0, status: "PAID", reason: "Carry forward from June cleared · Full payout this month" },
  },
];
