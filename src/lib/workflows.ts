import type { PRDScenario } from "@/types/financial";
import { SCENARIOS } from "./scenarios";

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string[]; // scenario IDs in execution order
  delayMs: number; // delay between each step
}

function s(id: string): PRDScenario {
  return SCENARIOS.find((sc) => sc.id === id)!;
}

/**
 * Real business workflows extracted from the backend service layer.
 * Each workflow chains PRD scenarios in the exact order they execute
 * in production (BookingConfirmationService → CheckoutService →
 * EscrowReleaseService, etc.).
 */
export const WORKFLOWS: Workflow[] = [
  {
    id: "happy-booking",
    name: "Happy Path Booking",
    description:
      "Fund wallet → Book → Gate entry → Gate exit → Escrow releases to lot",
    steps: ["topup", "booking", "booking-completed"],
    delayMs: 8000,
  },
  {
    id: "gate-wallet-flow",
    name: "Gate Wallet (Walk-in)",
    description:
      "Fund wallet → Pay at gate exit (no escrow, direct settlement)",
    steps: ["topup", "gate-wallet"],
    delayMs: 8000,
  },
  {
    id: "gate-cash-flow",
    name: "Gate Cash",
    description:
      "Cash payment at gate → Agent tally incremented + commission tracked. Use Agent→Manager and Manager→Lot buttons to move cash up the chain.",
    steps: ["gate-cash"],
    delayMs: 8000,
  },
  {
    id: "cancel-full-flow",
    name: "Cancel — Full Refund",
    description:
      "Fund wallet → Book → Cancel (full refund: escrow + commission reversed)",
    steps: ["topup", "booking", "cancel-full"],
    delayMs: 8000,
  },
  {
    id: "cancel-partial-flow",
    name: "Cancel — Partial 50%",
    description: "Fund wallet → Book → Cancel (50% back, 50% lot keeps)",
    steps: ["topup", "booking", "cancel-partial"],
    delayMs: 8000,
  },
  {
    id: "cancel-none-flow",
    name: "Cancel — No Refund",
    description: "Fund wallet → Book → Cancel (commission kept, escrow → lot)",
    steps: ["topup", "booking", "cancel-none"],
    delayMs: 8000,
  },
  {
    id: "overstay-flow",
    name: "Overstay Penalty",
    description:
      "Book → Stay past end time → Penalty charged → Escrow releases",
    steps: ["topup", "booking", "overstay", "booking-completed"],
    delayMs: 8000,
  },
  {
    id: "month-end-flow",
    name: "Month-End Settlement",
    description: "Digital revenue wired to tenant → Cash commission netted",
    steps: ["settle-digital", "settle-cash"],
    delayMs: 8000,
  },
];

/** Look up a workflow's scenarios by ID */
export function getWorkflowScenarios(workflow: Workflow): PRDScenario[] {
  return workflow.steps.map((id) => s(id));
}
