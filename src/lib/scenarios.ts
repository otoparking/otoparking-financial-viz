import type { PRDScenario } from "@/types/financial";

/**
 * 11 PRD financial scenarios aligned with the OtoParking backend service layer.
 *
 * Architecture (from backend code):
 *   Driver Wallet   (oto_wallets)           — available balance
 *   Commission      (oto_wallets_platform,   COMMISSION) — available balance
 *   Settlement      (oto_wallets_platform,   SETTLEMENT) — blocked balance (escrow)
 *   Lot Revenue     (oto_wallets_merchant)   — available balance
 *
 * Booking flow (BookingConfirmationService → CheckoutService.bookingCheckoutConfirm):
 *   1. DEBIT  driver.available          — full fare
 *   2. CREDIT commission.available      — rate% × fare
 *   3. CREDIT settlement.blocked        — (100−rate)% × fare  (escrowed)
 *
 * Escrow release (EscrowReleaseService.releaseToMerchant):
 *   1. DEBIT  settlement.blocked        — escrow amount
 *   2. CREDIT lot.available             — escrow amount
 *
 * Cancellation (BookingCancelService):
 *   FULL (>24h):  DEBIT settlement.blocked + commission.available → CREDIT driver
 *   PARTIAL (1–24h): 50% to driver, 50% to lot, proportional commission split
 *   NONE (<1h):  DEBIT settlement.blocked → CREDIT lot (commission kept)
 */

export const SCENARIOS: PRDScenario[] = [
  /* ── §7.1 Driver Top‑Up ──────────────────────────────────────────── */
  {
    id: "topup",
    number: 1,
    category: "topup",
    name: "Driver Top-Up",
    description: "Credits the driver wallet via admin adjustment",
    prdSection: "§7.1",
    concurrent: true,
    flows: [
      {
        id: "t1",
        from: "driver",
        to: "driver",
        amount: 20,
        label: "Top‑up +20",
        stepDescription:
          "CorpoPay acquirer processes the payment and credits 20 MAD directly to the Driver Wallet. Funds are available instantly for bookings and gate sessions.",
      },
    ],
  },

  /* ── §7.2 Pre‑Booking Payment ────────────────────────────────────── */
  {
    id: "booking",
    number: 2,
    category: "booking",
    name: "Pre-Booking",
    description: "Pricing preview → confirm booking → wallet debit + escrow",
    prdSection: "§7.2",
    concurrent: true,
    flows: [
      {
        id: "bb1",
        from: "driver",
        to: "commission",
        amount: 1,
        label: "10% comm",
        stepDescription:
          "Platform deducts 10% (1.00 MAD) as commission, credited immediately to the Commission wallet's available balance. Non-refundable unless cancelled within the eligible window.",
      },
      {
        id: "bb2",
        from: "driver",
        to: "settlement",
        amount: 9,
        label: "90% escrowed",
        stepDescription:
          "Remaining 90% (9.00 MAD) is ring-fenced in the Settlement wallet as blocked balance — fully protected and refundable until the session is COMPLETED and escrow is released to the merchant.",
      },
    ],
  },

  /* ── §7.2 Escrow Release → Lot ───────────────────────────────────── */
  {
    id: "booking-completed",
    number: 3,
    category: "booking",
    name: "Booking Completed",
    description: "Gate entry → gate exit → escrow released to lot",
    prdSection: "§7.2",
    concurrent: true,
    flows: [
      {
        id: "bc1",
        from: "settlement",
        to: "lot",
        amount: 9,
        label: "Released",
        stepDescription:
          "Session marked as COMPLETED by the lot system. The full 9.00 MAD escrow is unlocked from Settlement blocked balance and transferred to the Merchant's Lot Revenue wallet. No refund possible after this point.",
      },
    ],
  },

  /* ── §7.3 Gate Session — Wallet ──────────────────────────────────── */
  {
    id: "gate-wallet",
    number: 4,
    category: "gate",
    name: "Gate Exit — Wallet",
    description: "Walk-in gate session → wallet payment at exit (no escrow)",
    prdSection: "§7.3",
    concurrent: true,
    flows: [
      {
        id: "gw1",
        from: "driver",
        to: "commission",
        amount: 2,
        label: "10% comm",
        stepDescription:
          "10% platform commission (2 MAD) deducted at the exit gate and credited to Commission available balance instantly.",
      },
      {
        id: "gw2",
        from: "driver",
        to: "lot",
        amount: 18,
        label: "90% revenue",
        stepDescription:
          "90% revenue share (18 MAD) goes directly to Lot Revenue. Gate sessions bypass escrow entirely — there is no pre-booking to protect, so funds settle immediately to the merchant.",
      },
    ],
  },

  /* ── §7.4 Gate Session — Cash ────────────────────────────────────── */
  {
    id: "gate-cash",
    number: 5,
    category: "gate",
    name: "Gate Exit — Cash",
    description:
      "Physical cash at gate → lot revenue + cash commission tracker",
    prdSection: "§7.4",
    concurrent: true,
    flows: [
      {
        id: "gc1",
        from: "lot",
        to: "lot",
        amount: 50,
        label: "Cash collected",
        stepDescription:
          "Driver pays 50 MAD in physical cash at the exit gate. The full amount is recorded as Lot Revenue. No digital wallet is debited — cash is handled by the agent at the lot.",
      },
    ],
  },

  /* ── §7.6 Overstay ────────────────────────────────────────────────── */
  {
    id: "overstay",
    number: 6,
    category: "overstay",
    name: "Overstay Penalty",
    description:
      "Driver exceeds booking → penalty charged (10% comm / 90% escrow)",
    prdSection: "§7.6",
    concurrent: true,
    flows: [
      {
        id: "os1",
        from: "driver",
        to: "commission",
        amount: 1.5,
        label: "10% comm",
        stepDescription:
          "10% of the overstay penalty is charged as platform commission.",
      },
      {
        id: "os2",
        from: "driver",
        to: "settlement",
        amount: 13.5,
        label: "90% escrow",
        stepDescription:
          "90% of the penalty is held in escrow until the booking is completed.",
      },
    ],
  },

  /* ── §7.8 Cancellation — Full Refund ────────────────────────────── */
  {
    id: "cancel-full",
    number: 7,
    category: "cancellation",
    name: "Cancel — Full Refund",
    description: "Escrow + commission reversed to driver (>24h before start)",
    prdSection: "§7.8",
    concurrent: true,
    flows: [
      {
        id: "cf1",
        from: "settlement",
        to: "driver",
        amount: 9,
        label: "Return settlement",
        stepDescription:
          "Full 9.00 MAD escrow released from Settlement blocked balance back to the Driver Wallet. Eligible when cancelled > 24 h before the booking start time.",
      },
      {
        id: "cf2",
        from: "commission",
        to: "driver",
        amount: 1,
        label: "Return comm",
        stepDescription:
          "Full 1.00 MAD commission reversed from Commission available balance to the Driver Wallet. Driver is made whole — no penalty applied.",
      },
    ],
  },

  /* ── §7.9 Cancellation — Partial 50% ───────────────────────────── */
  {
    id: "cancel-partial",
    number: 8,
    category: "cancellation",
    name: "Cancel — Partial 50%",
    description: "Half back to driver, half to lot (1–24h before start)",
    prdSection: "§7.9",
    concurrent: true,
    flows: [
      {
        id: "cp1",
        from: "settlement",
        to: "driver",
        amount: 4.5,
        label: "Driver refund",
        stepDescription:
          "50% of the total fare (5.00 MAD) is returned to the Driver: 4.50 MAD from settlement blocked balance + 0.50 MAD from commission reversal.",
      },
      {
        id: "cp2",
        from: "commission",
        to: "driver",
        amount: 0.5,
        label: "50% comm back",
        stepDescription:
          "50% of the original commission (0.50 MAD) is reversed from the Commission wallet to the driver. Platform retains only half the fee.",
      },
      {
        id: "cp3",
        from: "settlement",
        to: "lot",
        amount: 4.5,
        label: "50% lot keeps",
        stepDescription:
          "Remaining 50% of the escrow (4.50 MAD) is transferred to the merchant Lot Revenue as a late-cancellation penalty — compensating the lot for the lost reservation.",
      },
    ],
  },

  /* ── §7.10 Cancellation — No Refund ─────────────────────────────── */
  {
    id: "cancel-none",
    number: 9,
    category: "cancellation",
    name: "Cancel — No Refund",
    description: "Escrow → lot, commission kept (<1h before start)",
    prdSection: "§7.10",
    concurrent: true,
    flows: [
      {
        id: "cn1",
        from: "settlement",
        to: "lot",
        amount: 9,
        label: "Escrow → Lot",
        stepDescription:
          "Driver forfeits the entire booking amount. Full 9.00 MAD escrow is transferred from Settlement blocked balance to Lot Revenue as a no-show penalty. Platform retains its 1.00 MAD commission — untouched.",
      },
    ],
  },

  /* ── §8.1 Month‑End Digital Payout ──────────────────────────────── */
  {
    id: "settle-digital",
    number: 10,
    category: "settlement",
    name: "Month-End — Digital Payout",
    description: "Lot Revenue balance wired to tenant (settlement pipeline)",
    prdSection: "§8.1",
    concurrent: false,
    flows: [
      {
        id: "sd1",
        from: "lot",
        to: "lot",
        amount: 0,
        label: "Gross payout",
        stepDescription:
          "Admin triggers settlement: full Lot Revenue balance is wired to the tenant's bank account. The Lot Revenue wallet resets to zero after successful payout confirmation via the admin settlement pipeline.",
      },
    ],
  },

  /* ── §8.2 Month‑End Cash Netting ────────────────────────────────── */
  {
    id: "settle-cash",
    number: 11,
    category: "settlement",
    name: "Month‑End — Cash Netting",
    description: "Cash Tally → Commission · Wire = Gross − Cash Owed",
    prdSection: "§8.2",
    concurrent: false,
    flows: [
      {
        id: "sc1",
        from: "commission",
        to: "commission",
        amount: 0,
        label: "Cash comm netted",
        stepDescription:
          "Step 1 — Accumulated cash commissions from oto_cash_tally are reconciled and credited to the Commission wallet. The cash tally is marked as settled for the period.",
      },
      {
        id: "sc2",
        from: "lot",
        to: "lot",
        amount: 0,
        label: "Net wire",
        stepDescription:
          "Step 2 — Net wire is sent to the tenant: Gross Lot Revenue minus the total cash commission owed. The settlement is recorded in the admin reconciliation ledger.",
      },
    ],
  },
];

/**
 * Color assigned to each financial entity.
 */
export const WALLET_COLORS: Record<string, string> = {
  driver: "#378ADD",
  commission: "#CBFF00",
  settlement: "#BA7517",
  lot: "#005249",
};

/** Human-readable subtitle for each entity */
export const WALLET_SUBTITLES: Record<string, string> = {
  driver: "Pre‑paid credits, 1 per driver",
  commission: "Platform fees (available)",
  settlement: "Escrowed funds (blocked)",
  lot: "Merchant revenue, 1 per lot",
};
