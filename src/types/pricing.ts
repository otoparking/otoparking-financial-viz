export type TariffType = "HOURLY" | "PERIOD";

export interface TariffBracket {
  hourStart: number;
  hourEnd: number;
  price: number;
  span: number;
  type: "Narrow" | "Wide";
}

export interface PricingInput {
  parkingId: number;
  lotName: string;
  vehicleType: string;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  gracePeriodMinutes: number;
}

export interface PricingResult {
  durationMinutes: number;
  withinGrace: boolean;
  totalFare: number;
  bracketUsed: TariffBracket | null;
  steps: PricingStep[];
}

export interface PricingStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "done" | "skipped";
}

export interface PricingScenario {
  id: string;
  name: string;
  description: string;
  input: PricingInput;
  expectedFare: number;
}

export interface PricingLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}
