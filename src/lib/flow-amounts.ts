/** Pure calculation helpers for visual simulation flow amounts. */

/** Returns 1 - commissionRate (the escrow portion). */
function escrowRate(commissionRate: number): number {
  return Math.round((1 - commissionRate) * 100) / 100;
}

export function bookingFlowAmount(
  flow: { id: string; amount: number },
  settings: { bookingDurationHours: number; commissionRate?: number },
): number {
  const fare = settings.bookingDurationHours * 5;
  const rate = settings.commissionRate ?? 0.1;
  if (flow.id === "bb1") return Math.round(fare * rate * 100) / 100; // commission
  if (flow.id === "bb2") return Math.round(fare * escrowRate(rate) * 100) / 100; // escrow
  return flow.amount;
}

export function cancelFlowAmount(
  flow: { id: string; amount: number },
  settings: { bookingDurationHours: number; commissionRate?: number },
): number {
  const fare = settings.bookingDurationHours * 5;
  const rate = settings.commissionRate ?? 0.1;
  const comm = Math.round(fare * rate * 100) / 100;
  const escrow = Math.round(fare * escrowRate(rate) * 100) / 100;
  if (flow.id === "cf1") return escrow;
  if (flow.id === "cf2") return comm;
  if (flow.id === "cp1") return Math.round(escrow * 0.5 * 100) / 100;
  if (flow.id === "cp2") return Math.round(comm * 0.5 * 100) / 100;
  if (flow.id === "cp3") return Math.round(escrow * 0.5 * 100) / 100;
  if (flow.id === "cn1") return escrow;
  return flow.amount;
}

export function overstayFlowAmount(
  flow: { id: string; amount: number },
  settings: { overstayMinutes?: number; commissionRate?: number },
  apiFare?: number | null,
): number {
  const fare =
    apiFare ??
    Math.round(((settings.overstayMinutes ?? 90) / 60) * 5 * 100) / 100;
  const rate = settings.commissionRate ?? 0.1;
  const comm = Math.round(fare * rate * 100) / 100;
  const escrow = Math.round(fare * escrowRate(rate) * 100) / 100;
  if (flow.id === "os1") return comm;
  if (flow.id === "os2") return escrow;
  return flow.amount;
}
