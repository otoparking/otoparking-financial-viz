/**
 * Pre-built simulation scenarios. Each defines a multi-actor financial
 * flow with checkpoints for invariant verification.
 *
 * @module lib/simulation/presets
 */

import type { SimScenario } from "./types";

export const PRESETS: SimScenario[] = [
  {
    name: "Peak Hour — 3 Drivers, 1 Agent",
    description:
      "3 concurrent bookings + 2 cash exits. Verifies concurrency handling and booking availability.",
    checkpoints: [
      { label: "All bookings placed", afterStep: 6 },
      { label: "All exits complete", afterStep: 8 },
    ],
    steps: [
      { actor: "driver-1", action: "topup", delay: 0, params: { amount: 50 } },
      { actor: "driver-2", action: "topup", delay: 0, params: { amount: 50 } },
      { actor: "driver-3", action: "topup", delay: 0, params: { amount: 50 } },
      {
        actor: "driver-1",
        action: "booking",
        delay: 500,
        params: { duration: 2, startHour: 10 },
      },
      {
        actor: "driver-2",
        action: "booking",
        delay: 500,
        params: { duration: 2, startHour: 14 },
      },
      {
        actor: "driver-3",
        action: "booking",
        delay: 500,
        params: { duration: 2, startHour: 18 },
      },
      {
        actor: "agent-1",
        action: "gate-cash",
        delay: 2000,
        params: {},
      },
      {
        actor: "agent-1",
        action: "gate-cash",
        delay: 2500,
        params: {},
      },
    ],
  },

  {
    name: "Full Day — Book, Extend, Cancel, Settle",
    description:
      "Happy path → overstay → cancel partial → month-end settlement. Verifies the full financial lifecycle.",
    checkpoints: [
      { label: "Booking completed", afterStep: 3 },
      { label: "Overstay + cancel done", afterStep: 6 },
      { label: "Month-end settled", afterStep: 8 },
    ],
    steps: [
      { actor: "driver-1", action: "topup", delay: 0, params: { amount: 100 } },
      {
        actor: "driver-1",
        action: "booking",
        delay: 500,
        params: { duration: 2, bookTomorrow: true },
      },
      {
        actor: "driver-1",
        action: "booking-completed",
        delay: 2000,
        params: {},
      },
      // Second booking for overstay + cancel
      {
        actor: "driver-1",
        action: "booking",
        delay: 4000,
        params: { duration: 1, startHour: 20, bookTomorrow: true },
      },
      {
        actor: "driver-1",
        action: "overstay",
        delay: 6000,
        params: { extensionMinutes: 60, bookingRef: "__auto__" },
      },
      {
        actor: "driver-1",
        action: "cancel",
        delay: 8000,
        params: { bookingRef: "__auto__" },
      },
      {
        actor: "driver-1",
        action: "settle-digital",
        delay: 10000,
        params: {},
      },
      {
        actor: "driver-1",
        action: "settle-cash",
        delay: 12000,
        params: {},
      },
    ],
  },

  {
    name: "Race Condition — 2 Drivers, Same Slot",
    description:
      "Two drivers attempt to book the same time slot. The second should fail with Conflict — verifying backend concurrency guards.",
    checkpoints: [{ label: "Both booking attempts done", afterStep: 4 }],
    steps: [
      { actor: "driver-1", action: "topup", delay: 0, params: { amount: 50 } },
      { actor: "driver-2", action: "topup", delay: 0, params: { amount: 50 } },
      {
        actor: "driver-1",
        action: "booking",
        delay: 100,
        params: { duration: 2, startHour: 10 },
      },
      {
        actor: "driver-2",
        action: "booking",
        delay: 100,
        params: { duration: 2, startHour: 10 },
      },
    ],
  },

  {
    name: "Cash Chain — Agent → Manager → Tenant",
    description:
      "Gate cash → release to manager → release to tenant. Verifies the physical cash handoff chain.",
    checkpoints: [
      { label: "Cash collected", afterStep: 2 },
      { label: "Cash at tenant", afterStep: 4 },
    ],
    steps: [
      {
        actor: "agent-1",
        action: "gate-cash",
        delay: 0,
        params: {},
      },
      {
        actor: "agent-1",
        action: "gate-cash",
        delay: 500,
        params: {},
      },
      {
        actor: "agent-1",
        action: "release-to-manager",
        delay: 2000,
        params: {},
      },
      {
        actor: "agent-1",
        action: "release-to-tenant",
        delay: 3000,
        params: {},
      },
    ],
  },
];
