export type WalletType =
  | "driver"
  | "commission"
  | "settlement"
  | "lot"
  | "cash-tracker";

export interface WalletState {
  id: WalletType;
  label: string;
  subtitle?: string;
  /** Available balance (can be spent/refunded) */
  balance: number;
  /** Blocked balance (escrowed, not yet released to lot) */
  blocked: number;
  previousBalance: number;
  previousBlocked: number;
  color: string;
  x: number;
  y: number;
  /** "wallet" for money-holding wallets, "ledger" for tracking-only */
  kind: "wallet" | "ledger";
}

export interface FlowDefinition {
  id: string;
  from: WalletType;
  to: WalletType;
  amount: number;
  label: string;
  /** Full description of this individual transfer step shown in the info panel */
  stepDescription: string;
}

export interface PRDScenario {
  id: string;
  number: number;
  name: string;
  description: string;
  flows: FlowDefinition[];
  category:
    | "topup"
    | "booking"
    | "gate"
    | "cancellation"
    | "overstay"
    | "settlement";
  /** Scenario source in the PRD */
  prdSection: string;
  /** true = all flows fire in one atomic transaction; false = steps execute in order */
  concurrent: boolean;
}

export interface PlatformData {
  totalDriverBalance: number;
  totalMerchantBalance: number;
  totalCommissionAllTime: number;
  totalCommissionThisMonth: number;
  pendingSettlements: number;
  commissionWalletBalance: number | null;
  settlementWalletBalance: number | null;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  scenario: string;
  summary: string;
}

export interface ParticleData {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  color: string;
  amount: number;
}

export interface ParticleDataV2 {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  amount: number;
  startTime: number;
}

export type MetricKey =
  | "circulation"
  | "commission"
  | "escrow"
  | "lotRevenue"
  | "cashCommission"
  | "agentTally";

export interface MetricCard {
  key: MetricKey;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}
