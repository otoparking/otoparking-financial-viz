import type { WorkflowMeta, NotificationScenario } from "@/types/notifications";

/**
 * All 15 registered PushCaster workflows from NOTIFICATIONS.md.
 * These are the only valid workflow IDs — never invent new ones.
 */
export const WORKFLOWS: WorkflowMeta[] = [
  {
    id: "push",
    channels: ["push"],
    label: "Push Only",
    useCase: "Silent mobile alert, no email trail",
  },
  {
    id: "email",
    channels: ["email"],
    label: "Email Only",
    useCase: "Formal notifications, receipts",
  },
  {
    id: "sms",
    channels: ["sms"],
    label: "SMS Only",
    useCase: "Time-sensitive alerts without app",
  },
  {
    id: "whatsapp",
    channels: ["whatsapp"],
    label: "WhatsApp Only",
    useCase: "WhatsApp-first markets",
  },
  {
    id: "push-email",
    channels: ["push", "email"],
    label: "Push + Email",
    useCase: "Important events (transfers, bookings)",
  },
  {
    id: "push-sms",
    channels: ["push", "sms"],
    label: "Push + SMS",
    useCase: "Alerts needing SMS fallback",
  },
  {
    id: "push-whatsapp",
    channels: ["push", "whatsapp"],
    label: "Push + WhatsApp",
    useCase: "",
  },
  {
    id: "email-sms",
    channels: ["email", "sms"],
    label: "Email + SMS",
    useCase: "",
  },
  {
    id: "email-whatsapp",
    channels: ["email", "whatsapp"],
    label: "Email + WhatsApp",
    useCase: "",
  },
  {
    id: "whatsapp-sms",
    channels: ["whatsapp", "sms"],
    label: "WhatsApp + SMS",
    useCase: "",
  },
  {
    id: "push-email-sms",
    channels: ["push", "email", "sms"],
    label: "Push + Email + SMS",
    useCase: "",
  },
  {
    id: "push-email-whatsapp",
    channels: ["push", "email", "whatsapp"],
    label: "Push + Email + WhatsApp",
    useCase: "",
  },
  {
    id: "push-whatsapp-sms",
    channels: ["push", "whatsapp", "sms"],
    label: "Push + WhatsApp + SMS",
    useCase: "",
  },
  {
    id: "email-whatsapp-sms",
    channels: ["email", "whatsapp", "sms"],
    label: "Email + WhatsApp + SMS",
    useCase: "",
  },
  {
    id: "push-email-whatsapp-sms",
    channels: ["push", "email", "whatsapp", "sms"],
    label: "Full Broadcast",
    useCase: "All channels",
  },
];

/**
 * 9 notification scenarios for testing through the OtoParking backend.
 *
 * The first 7 scenarios use dedicated backend endpoints
 * (e.g. POST /api/test/notifications/transfer-sent) that call the real
 * PushcasterService.notifyXxx() methods — identical to production.
 * The remaining 2 use the generic trigger with raw payloads.
 *
 * To test: select a scenario → it hits the backend → backend calls Pushcaster
 * → check the target device/email for the delivered notification.
 */
export const NOTIFICATION_SCENARIOS: NotificationScenario[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Transfer scenarios — production-identical (backend calls notifyXxx())
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "transfer-sent",
    name: "Transfer Sent",
    description: "Wallet transfer committed → notify sender (push + email)",
    workflowId: "push-email",
    sourceClass: "TransferSentNotification",
    triggerEvent: "Wallet transfer confirmed on-chain",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },
  {
    id: "transfer-received",
    name: "Transfer Received",
    description: "Wallet transfer received → notify receiver (push + email)",
    workflowId: "push-email",
    sourceClass: "TransferReceivedNotification",
    triggerEvent: "Wallet transfer credited to recipient",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },
  {
    id: "transfer-pending",
    name: "Transfer Pending",
    description: "E-transfer waiting to be claimed (push + email)",
    workflowId: "push-email",
    sourceClass: "TransferPendingNotification",
    triggerEvent: "E-transfer created but not yet claimed",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Gate scenarios — production-identical (backend calls notifyXxx())
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "gate-entry",
    name: "Gate Entry",
    description: "Vehicle entered via gate → push notification",
    workflowId: "push",
    sourceClass: "GateEntryNotification",
    triggerEvent: "Plate scanned at entry, barrier opens",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },
  {
    id: "gate-exit",
    name: "Gate Exit",
    description: "Driver exited, wallet charged → push notification",
    workflowId: "push",
    sourceClass: "GateExitNotification",
    triggerEvent: "Exit scan, wallet debited, barrier opens",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },
  {
    id: "gate-exit-denied",
    name: "Exit Denied",
    description: "Insufficient wallet → push notification",
    workflowId: "push",
    sourceClass: "GateExitDeniedNotification",
    triggerEvent: "Exit scan, insufficient funds",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },
  {
    id: "gate-orphan",
    name: "Orphan Session",
    description: "Session stuck active > 24h → push notification",
    workflowId: "push",
    sourceClass: "GateOrphanNotification",
    triggerEvent: "Hourly job detects orphan session",
    payload: {
      pushSubject: "",
      pushBody: "",
      emailSubject: "",
      emailBody: "",
      route: "",
      smsBody: "",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Booking scenario (push + email + SMS) — raw payload (no template yet)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "booking-confirmed",
    name: "Booking Confirmed",
    description:
      "Booking created → cross-channel notification (push + email + SMS)",
    workflowId: "push-email-sms",
    sourceClass: "CustomTestNotification",
    triggerEvent: "Pre-booking payment captured (test simulation)",
    payload: {
      pushSubject: "Réservation confirmée 🅿️",
      pushBody: "Lot Oulfa · 12:00–14:00 · 45 MAD. Présentez le QR au portail.",
      emailSubject: "OtoParking — Réservation confirmée #BK-4821",
      emailBody:
        "<h2>Réservation Confirmée</h2><p><strong>Lot Oulfa</strong></p><p>12:00 – 14:00 · 45 MAD</p><p>Présentez le QR code à l'entrée.</p>",
      route: "/booking/BK-4821",
      smsBody:
        "OtoParking: Réservation confirmée à Lot Oulfa, 12:00–14:00, 45 MAD. Présentez le QR à l'entrée.",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Full broadcast — raw payload (test all channels)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "full-broadcast",
    name: "Full Broadcast (Test)",
    description: "Test notification sent to all 4 channels",
    workflowId: "push-email-whatsapp-sms",
    sourceClass: "CustomTestNotification",
    triggerEvent: "Manual test from OtoParking Test Center",
    payload: {
      pushSubject: "🧪 Test Center — Full Broadcast",
      pushBody:
        "This is a test notification from the OtoParking Test Center. If you received this, PushCaster is working correctly.",
      emailSubject: "OtoParking Test — Full Broadcast",
      emailBody:
        "<h2>Test Notification</h2><p>This is a test from the <strong>OtoParking Test Center</strong>. PushCaster multi-channel delivery is working.</p>",
      route: "/test-center",
      smsBody:
        "OtoParking Test: Full broadcast notification. PushCaster is working.",
    },
  },
];
