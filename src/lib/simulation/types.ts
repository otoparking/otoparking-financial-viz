/**
 * Simulation scenario format — the JSON schema for defining multi-actor
 * financial simulations with checkpoints and invariants.
 *
 * @module lib/simulation/types
 */

export interface SimAccount {
  label: string;
  accountId: string;
  email: string;
  password: string;
  role: "driver" | "agent";
  token?: string;
  walletId?: number;
  guardianId?: number;
}

export interface ActorPool {
  drivers: SimAccount[];
  agents: SimAccount[];
}

export interface SimStep {
  /** Which actor runs this step (e.g. "driver-1", "agent-1") */
  actor: string;
  /** Action to perform */
  action:
    | "topup"
    | "booking"
    | "booking-completed"
    | "gate-wallet"
    | "gate-cash"
    | "cancel"
    | "overstay"
    | "settle-digital"
    | "settle-cash"
    | "release-to-manager"
    | "release-to-tenant";
  /** Milliseconds before executing (same delay = concurrent) */
  delay: number;
  /** Action-specific parameters */
  params?: Record<string, unknown>;
}

export interface Checkpoint {
  /** Human-readable label */
  label: string;
  /** Run this checkpoint after N steps complete */
  afterStep: number;
}

export interface SimScenario {
  name: string;
  description: string;
  steps: SimStep[];
  checkpoints: Checkpoint[];
}

export interface AuditEntry {
  stepIndex: number;
  actor: string;
  action: string;
  timestamp: Date;
  durationMs: number;
  success: boolean;
  message: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

export interface InvariantResult {
  name: string;
  pass: boolean;
  actual: string;
  expected: string;
  detail: string;
}

export interface CheckpointResult {
  label: string;
  invariants: InvariantResult[];
  allPass: boolean;
}

export interface SimulationResult {
  scenario: string;
  stepsTotal: number;
  stepsPassed: number;
  stepsFailed: number;
  durationMs: number;
  audit: AuditEntry[];
  checkpoints: CheckpointResult[];
}
