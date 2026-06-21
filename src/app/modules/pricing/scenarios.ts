import type { PricingScenario, TariffBracket } from "@/types/pricing";

/** Oulfa tariff brackets from PRICING_ARCHITECTURE.md */
export const OULFA_TARIFF: TariffBracket[] = [
  { hourStart: 0, hourEnd: 1, price: 3, span: 1, type: "Narrow" },
  { hourStart: 1, hourEnd: 2, price: 5, span: 1, type: "Narrow" },
  { hourStart: 2, hourEnd: 3, price: 7, span: 1, type: "Narrow" },
  { hourStart: 3, hourEnd: 24, price: 2, span: 21, type: "Wide" },
];

/** Pricing test scenarios from PRICING_ARCHITECTURE.md */
export const PRICING_SCENARIOS: PricingScenario[] = [
  {
    id: "grace-free",
    name: "Grace Period — Free",
    description: "1 min session → within 10 min grace → fare = 0 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 10, exitMinute: 1, gracePeriodMinutes: 10 },
    expectedFare: 0,
  },
  {
    id: "grace-boundary",
    name: "Grace Boundary — 11 min",
    description: "1 min past grace → 1 hour = 3 MAD (ceiling applies)",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 10, exitMinute: 11, gracePeriodMinutes: 10 },
    expectedFare: 3,
  },
  {
    id: "one-hour",
    name: "1 Hour — 3 MAD",
    description: "Exactly 1 hour → narrow bracket [0,1] → 3 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 11, exitMinute: 0, gracePeriodMinutes: 10 },
    expectedFare: 3,
  },
  {
    id: "two-hours",
    name: "2 Hours — 5 MAD",
    description: "2 hours → narrow bracket [1,2] → 5 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 12, exitMinute: 0, gracePeriodMinutes: 10 },
    expectedFare: 5,
  },
  {
    id: "three-hours",
    name: "3 Hours — 7 MAD",
    description: "3 hours → narrow bracket [2,3] → 7 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 13, exitMinute: 0, gracePeriodMinutes: 10 },
    expectedFare: 7,
  },
  {
    id: "five-hours",
    name: "5 Hours — 11 MAD",
    description: "5h → lastNarrow=7 MAD + 2×2 overflow = 11 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 15, exitMinute: 0, gracePeriodMinutes: 10 },
    expectedFare: 11,
  },
  {
    id: "ceiling-demo",
    name: "Ceiling — 1m = 1h",
    description: "1 min session past grace → Math.ceil(1/60) = 1 hour = 3 MAD",
    input: { parkingId: 6, lotName: "Oulfa", vehicleType: "CAR", entryHour: 10, entryMinute: 0, exitHour: 10, exitMinute: 11, gracePeriodMinutes: 10 },
    expectedFare: 3,
  },
];
