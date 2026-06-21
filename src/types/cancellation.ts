export type RefundTier = "FULL" | "PARTIAL" | "NONE" | "CANNOT_CANCEL";

export interface CancellationInput {
  hoursUntilStart: number;
  bookingStatus: "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  bookingAmount: number;
  isGateSession: boolean;
  isExtended: boolean;
}

export interface CancellationResult {
  tier: RefundTier;
  driverRecovers: number;
  platformKeeps: number;
  lotReceives: number;
  reason: string;
}

export interface CancellationScenario {
  id: string;
  name: string;
  description: string;
  input: CancellationInput;
  expected: CancellationResult;
}

export interface CancelLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}
