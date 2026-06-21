/** Gate session status */
export type GateSessionStatus =
  | "pending"
  | "active"
  | "exiting"
  | "completed"
  | "orphan";

/** Payment method used at exit */
export type PaymentMethod = "wallet" | "cash";

/** Gate event types matching PRD_GATE_V2 §10 use cases */
export type GateEventType =
  | "entry-scan"
  | "entry-granted"
  | "entry-denied"
  | "exit-scan"
  | "exit-granted"
  | "exit-denied"
  | "session-switch"
  | "ticket-digitalize"
  | "cash-payment"
  | "orphan-detected"
  | "info";

/** A single step in a gate scenario */
export interface GateStep {
  id: string;
  type: GateEventType;
  description: string;
  delayMs?: number;
}

/** A gate simulation scenario */
export interface GateScenario {
  id: string;
  number: string;
  name: string;
  description: string;
  prdSection: string;
  steps: GateStep[];
}

/** Runtime state of a gate session during simulation */
export interface GateSession {
  id: string;
  plate: string;
  vehicleType: string;
  entryTime: number | null;
  exitTime: number | null;
  status: GateSessionStatus;
  paymentMethod: PaymentMethod | null;
  fare: number;
  hasBooking: boolean;
}

/** Log entry for gate events */
export interface GateLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}

/** Car animation data for the canvas */
export interface CarAnimData {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startTime: number;
  color: string;
  plate: string;
  entering: boolean;
}
