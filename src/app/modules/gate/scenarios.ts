import type { GateScenario } from "@/types/gate";

/**
 * All 9 OtoGate use cases from PRD_GATE_V2.md §10.
 * Each scenario is a sequence of gate events that can be stepped through.
 */
export const GATE_SCENARIOS: GateScenario[] = [
  /* ── UC1: Walk-In (Registered, No Booking) ───────────────────────── */
  {
    id: "walkin",
    number: "UC1",
    name: "Walk-In Entry",
    description: "Registered driver, no booking — plate scanned, entry granted",
    prdSection: "§10 UC1",
    steps: [
      {
        id: "uc1-1",
        type: "entry-scan",
        description: "Camera scans plate 99999-A-1 at entry lane",
        delayMs: 800,
      },
      {
        id: "uc1-2",
        type: "info",
        description: "Plate matched → Driver found, wallet: 200 MAD",
        delayMs: 600,
      },
      {
        id: "uc1-3",
        type: "entry-granted",
        description: "Barrier opens · Session created · Gate sends push notification",
        delayMs: 1000,
      },
    ],
  },

  /* ── UC2: Booking Activation on Entry ────────────────────────────── */
  {
    id: "booking-entry",
    number: "UC2",
    name: "Booking Activation",
    description: "Pre-booked driver arrives → booking activates → entry granted",
    prdSection: "§10 UC2",
    steps: [
      {
        id: "uc2-1",
        type: "entry-scan",
        description: "Camera scans plate 77777-B-7 at entry lane",
        delayMs: 800,
      },
      {
        id: "uc2-2",
        type: "info",
        description: "Active booking found: lot Oulfa, 12:00–14:00, 45 MAD pre-paid",
        delayMs: 700,
      },
      {
        id: "uc2-3",
        type: "entry-granted",
        description: "Booking status → ACTIVE · Barrier opens · Timer starts",
        delayMs: 1000,
      },
    ],
  },

  /* ── UC3: Session A → Session B Transition ───────────────────────── */
  {
    id: "session-switch",
    number: "UC3",
    name: "Session Switch",
    description: "Agent switches driver from session A to session B",
    prdSection: "§10 UC3",
    steps: [
      {
        id: "uc3-1",
        type: "info",
        description: "Agent opens active session: 99999-A-1, in since 10:00, fare 18 MAD",
        delayMs: 500,
      },
      {
        id: "uc3-2",
        type: "session-switch",
        description: "Agent selects Session B (77777-B-7) · Switch confirmed",
        delayMs: 800,
      },
      {
        id: "uc3-3",
        type: "info",
        description: "Session A closed · Fare 18 MAD charged to Session B's vehicle",
        delayMs: 600,
      },
    ],
  },

  /* ── UC4: Ticket Digitalization ──────────────────────────────────── */
  {
    id: "ticket-digitalize",
    number: "UC4",
    name: "Ticket Digitalization",
    description: "Paper ticket scanned → digital session created for tracking",
    prdSection: "§10 UC4",
    steps: [
      {
        id: "uc4-1",
        type: "entry-scan",
        description: "Driver presents paper ticket QR at entry kiosk",
        delayMs: 600,
      },
      {
        id: "uc4-2",
        type: "ticket-digitalize",
        description: "Ticket #T-4821 digitalized → Session linked to driver account",
        delayMs: 800,
      },
      {
        id: "uc4-3",
        type: "entry-granted",
        description: "Digital session active · Barrier opens · Entry logged",
        delayMs: 1000,
      },
    ],
  },

  /* ── UC5: Unknown / No-App Entry ─────────────────────────────────── */
  {
    id: "unknown-entry",
    number: "UC5",
    name: "Unknown Plate Entry",
    description: "Plate not in system → manual registration or ticket issued",
    prdSection: "§10 UC5",
    steps: [
      {
        id: "uc5-1",
        type: "entry-scan",
        description: "Camera scans plate 11111-X-9 — No match in database",
        delayMs: 800,
      },
      {
        id: "uc5-2",
        type: "entry-denied",
        description: "Plate unknown · Agent alerted on mobile app",
        delayMs: 600,
      },
      {
        id: "uc5-3",
        type: "info",
        description: "Agent issues paper ticket #T-9102 · Manual entry logged",
        delayMs: 800,
      },
    ],
  },

  /* ── UC6: Normal Exit (Wallet Sufficient) ────────────────────────── */
  {
    id: "normal-exit",
    number: "UC6",
    name: "Normal Wallet Exit",
    description: "Exit scan → fare calculated → wallet debited → barrier opens",
    prdSection: "§10 UC6",
    steps: [
      {
        id: "uc6-1",
        type: "exit-scan",
        description: "Camera scans plate 99999-A-1 at exit lane",
        delayMs: 800,
      },
      {
        id: "uc6-2",
        type: "info",
        description: "Session: 2h 15m · Fare: 20 MAD · Wallet: 200 MAD ✓",
        delayMs: 700,
      },
      {
        id: "uc6-3",
        type: "exit-granted",
        description: "Wallet −20 MAD · Commission +2 MAD · Lot +18 MAD · Barrier opens",
        delayMs: 1200,
      },
    ],
  },

  /* ── UC7: Exit Denied (Insufficient Wallet) ──────────────────────── */
  {
    id: "exit-denied",
    number: "UC7",
    name: "Exit Denied",
    description: "Wallet too low → top-up prompt → gate stays closed",
    prdSection: "§10 UC7",
    steps: [
      {
        id: "uc7-1",
        type: "exit-scan",
        description: "Camera scans plate 77777-B-7 at exit lane",
        delayMs: 800,
      },
      {
        id: "uc7-2",
        type: "info",
        description: "Session: 3h 40m · Fare: 35 MAD · Wallet: 12 MAD ✗",
        delayMs: 700,
      },
      {
        id: "uc7-3",
        type: "exit-denied",
        description: "Insufficient funds · Barrier stays closed · Top-up prompt sent",
        delayMs: 1000,
      },
      {
        id: "uc7-4",
        type: "info",
        description: "Driver tops up +50 MAD · Retry exit scan now possible",
        delayMs: 800,
      },
    ],
  },

  /* ── UC8: Agent Cash Payment Exit ────────────────────────────────── */
  {
    id: "cash-exit",
    number: "UC8",
    name: "Agent Cash Exit",
    description: "Cash collected by agent → session closed → Cash Tracker updated",
    prdSection: "§10 UC8",
    steps: [
      {
        id: "uc8-1",
        type: "exit-scan",
        description: "Camera scans plate 11111-X-9 at exit lane",
        delayMs: 800,
      },
      {
        id: "uc8-2",
        type: "info",
        description: "Session: 1h 30m · Fare: 50 MAD · No wallet linked",
        delayMs: 600,
      },
      {
        id: "uc8-3",
        type: "cash-payment",
        description: "Agent collects 50 MAD cash · Tally updated · 5 MAD to Cash Tracker",
        delayMs: 1000,
      },
      {
        id: "uc8-4",
        type: "exit-granted",
        description: "Payment confirmed · Barrier opens · Shift tally +50 MAD",
        delayMs: 1000,
      },
    ],
  },

  /* ── UC9: Orphan Session ─────────────────────────────────────────── */
  {
    id: "orphan",
    number: "UC9",
    name: "Orphan Session",
    description: "No exit scan detected (tailgating) → system marks as orphan after 24h",
    prdSection: "§10 UC9",
    steps: [
      {
        id: "uc9-1",
        type: "info",
        description: "Session 99999-A-1 active for 25h — no exit scan ever received",
        delayMs: 800,
      },
      {
        id: "uc9-2",
        type: "orphan-detected",
        description: "Hourly job detects orphan · Status → ORPHAN · Max fare capped at 24h",
        delayMs: 1000,
      },
      {
        id: "uc9-3",
        type: "info",
        description: "Orphan notification sent to driver · Admin alerted · Manual review needed",
        delayMs: 800,
      },
    ],
  },
];
