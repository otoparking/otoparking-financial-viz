import type { LambdaDef, ExternalService } from "@/types/infra";

/**
 * 10 API Lambda functions + 4 job functions from PRD_LAMBDA_MIGRATION.md §4.
 */
export const API_LAMBDAS: LambdaDef[] = [
  { id: "auth", name: "Auth", handler: "AuthLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/auth/*", "/api/account/*"], snapStart: true, description: "Noscera OTP auth, token refresh, logout, account completion" },
  { id: "parking", name: "Parking", handler: "ParkingLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/parking/*", "/api/pricing/*", "/api/tarifs/*", "/api/review/*"], snapStart: true, description: "Lot search, details, pricing, tariffs, reviews" },
  { id: "booking", name: "Booking", handler: "BookingLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/booking/*", "/api/qrcode/*"], snapStart: true, description: "Booking preview, confirm, cancel, extend, QR codes" },
  { id: "wallet", name: "Wallet", handler: "WalletLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/wallet/*"], snapStart: true, description: "Balance, top-up, transaction history" },
  { id: "subscription", name: "Subscription", handler: "SubscriptionLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/subscriptions/*", "/api/subscription/*"], snapStart: true, description: "Subscription management, analytics" },
  { id: "payment", name: "Payment", handler: "PaymentLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/checkout/*", "/api/ecom/*"], snapStart: true, description: "CorpoPay checkout, e-commerce flows" },
  { id: "admin", name: "Admin", handler: "AdminLambdaHandler", memory: 1536, timeout: 30, routes: ["/api/admin/*", "/api/wallets/*", "/api/kiosk/*"], snapStart: true, description: "Admin dashboard, financial overview, settlements, kiosk" },
  { id: "webhook", name: "Webhook", handler: "WebhookLambdaHandler", memory: 1024, timeout: 60, routes: ["/api/webhook/*"], snapStart: false, description: "Inbound CorpoPay webhooks (top-up confirmations)" },
  { id: "ticket", name: "Ticket", handler: "TicketLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/tickets/*"], snapStart: false, description: "Paper ticket digitalization, lookup" },
  { id: "vehicle", name: "Vehicle", handler: "VehicleLambdaHandler", memory: 1024, timeout: 60, routes: ["/api/vehicles/*", "/api/brand/*"], snapStart: false, description: "Vehicle CRUD, brand catalog" },
];

export const JOB_LAMBDAS: LambdaDef[] = [
  { id: "job-expired", name: "Expired Job", handler: "ExpiredJobHandler", memory: 512, timeout: 120, routes: ["rate(3 min)"], snapStart: false, description: "Marks expired bookings — runs every 3 minutes" },
  { id: "job-noshow", name: "No-Show Job", handler: "NoShowJobHandler", memory: 512, timeout: 120, routes: ["rate(15 min)"], snapStart: false, description: "Marks no-show bookings — runs every 15 minutes" },
  { id: "job-forceexit", name: "Force Exit Job", handler: "ForceExitJobHandler", memory: 512, timeout: 120, routes: ["rate(5 min)"], snapStart: false, description: "Auto-closes stuck sessions — runs every 5 minutes" },
  { id: "job-archive", name: "Archive Job", handler: "BookingMonthlyArchiveJobHandler", memory: 512, timeout: 300, routes: ["cron(0 1 1 * ? *)"], snapStart: false, description: "Monthly booking archive — 1st of month at 01:00" },
];

export const GATE_LAMBDA: LambdaDef = {
  id: "gate", name: "Gate", handler: "GateLambdaHandler", memory: 1024, timeout: 30, routes: ["/api/gate/webhook/*", "/api/gate/sessions"], snapStart: true, description: "Vendor gate events, session management",
};

export const EXTERNAL_SERVICES: ExternalService[] = [
  { id: "noscera", name: "Noscera", url: "https://auth.noscera.com", envVar: "NOSCERA_BASE_URL", description: "OTP authentication provider" },
  { id: "corpopay", name: "CorpoPay", url: "https://api.corpopay.site", envVar: "CORPOPAY_API_URL", description: "Payment gateway for wallet top-ups and disbursements" },
  { id: "pushcaster", name: "PushCaster", url: "https://app.pushcaster.site", envVar: "PUSHCASTER_API_URL", description: "Multi-channel notifications (Push, Email, SMS, WhatsApp)" },
  { id: "rds", name: "RDS PostgreSQL", url: "jdbc:postgresql://...", envVar: "DB_URL", description: "Primary database (with PgBouncer pooler)" },
  { id: "s3", name: "S3 Passes", url: "s3://otoparking-passes", envVar: "—", description: "Apple Wallet pass templates and images" },
];
