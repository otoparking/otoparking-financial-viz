/** Pure calculation helpers for visual simulation flow amounts. */

/** Returns 1 - commissionRate (the escrow portion). */
function escrowRate(commissionRate: number): number {
  return Math.round((1 - commissionRate) * 100) / 100;
}

/**
 * Gate fare: computed from hourly rate × 1h minimum billing.
 * Matches ParkingFareService → PricingCalculator (Math.ceil(min/60)).
 */
export function gateFareAmount(hourlyRate: number = 5): number {
  return hourlyRate; // 1h minimum × rate/hr
}

export function gateFlowAmount(
  flow: { id: string; amount: number },
  hourlyRate: number = 5,
  commissionRate: number = 0.1,
): number {
  const fare = gateFareAmount(hourlyRate);
  const comm = Math.round(fare * commissionRate * 100) / 100;
  const net = Math.round(fare * (1 - commissionRate) * 100) / 100;
  if (flow.id === "gw1") return comm; // commission
  if (flow.id === "gw2") return net; // lot revenue
  return flow.amount;
}

export function gateCashFlowAmount(
  flow: { id: string; amount: number },
  hourlyRate: number = 5,
  commissionRate: number = 0.1,
): number {
  const fare = gateFareAmount(hourlyRate);
  const comm = Math.round(fare * commissionRate * 100) / 100;
  if (flow.id === "gc1") return fare; // cash collected
  if (flow.id === "gc2") return comm; // commission tracked
  return flow.amount;
}

export function bookingFlowAmount(
  flow: { id: string; amount: number },
  settings: { bookingDurationHours: number; commissionRate?: number },
): number {
  const fare = settings.bookingDurationHours * 5;
  const rate = settings.commissionRate ?? 0.1;
  if (flow.id === "bb1") return Math.round(fare * rate * 100) / 100; // commission
  if (flow.id === "bb2") return Math.round(fare * escrowRate(rate) * 100) / 100; // escrow
  if (flow.id === "bc1") return Math.round(fare * escrowRate(rate) * 100) / 100; // escrow release
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
