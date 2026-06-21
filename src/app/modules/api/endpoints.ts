import type { ApiModuleGroup } from "@/types/api-tester";

/**
 * Complete API endpoint catalog from PRD_INTEGRATION.md §5.
 * All real backend endpoints across 10 Lambda modules.
 */
export const API_MODULES: ApiModuleGroup[] = [
  {
    name: "Auth",
    prefix: "/api/auth",
    endpoints: [
      { id: "auth-send-otp", method: "POST", path: "/api/auth/send-otp", module: "auth", description: "Send OTP to email or phone via Noscera", requestBody: { email: "driver@otoparking.ma" }, responseExample: { success: true, authFlow: "OTP", loginSessionId: "ls-abc123", nextStep: { action: "VERIFY_OTP", method: "EMAIL", expiresIn: 300 } } },
      { id: "auth-verify-otp", method: "POST", path: "/api/auth/verify-otp", module: "auth", description: "Verify OTP and receive tokens", requestBody: { email: "driver@otoparking.ma", otpCode: "482917", loginSessionId: "ls-abc123" }, responseExample: { success: true, accessToken: "eyJhbG...", refreshToken: "rf_...", expiresIn: 3600, sessionId: "sess-xyz", accountId: "acc-456", profile: { email: "driver@otoparking.ma", roles: ["DRIVER"], status: "ACTIVE" } } },
      { id: "auth-resend", method: "POST", path: "/api/auth/resend", module: "auth", description: "Resend OTP, invalidates old code", requestBody: { email: "driver@otoparking.ma", loginSessionId: "ls-abc123", verificationType: "OTP" }, responseExample: { success: true, message: "OTP resent" } },
      { id: "auth-refresh", method: "POST", path: "/api/auth/refresh", module: "auth", description: "Refresh expired access token", requestBody: { refreshToken: "rf_..." }, responseExample: { accessToken: "eyJhbG_new...", expiresIn: 3600 } },
      { id: "auth-logout", method: "POST", path: "/api/auth/logout", module: "auth", description: "Terminate session, invalidate tokens", requestBody: { sessionId: "sess-xyz", logoutType: "USER", reason: "manual" }, responseExample: { success: true, sessionsTerminated: 1 } },
      { id: "auth-complete", method: "POST", path: "/api/auth/complete-account", module: "auth", description: "Complete new account registration", requestBody: { tempId: "tmp-789", firstName: "Ahmed", lastName: "Alaoui", password: "***", termsAccepted: true }, responseExample: { success: true, accessToken: "eyJhbG...", refreshToken: "rf_..." } },
    ],
  },
  {
    name: "Account",
    prefix: "/api/account",
    endpoints: [
      { id: "account-profile", method: "GET", path: "/api/account/profile", module: "auth", description: "Get authenticated user profile", responseExample: { id: "acc-456", firstName: "Ahmed", lastName: "Alaoui", email: "driver@otoparking.ma", phone: "+212600000001", role: "DRIVER", status: "ACTIVE" } },
      { id: "account-update", method: "PUT", path: "/api/account/profile", module: "auth", description: "Update profile fields", requestBody: { firstName: "Ahmed", phone: "+212600000002" }, responseExample: { success: true } },
    ],
  },
  {
    name: "Parking",
    prefix: "/api/parking",
    endpoints: [
      { id: "parking-nearby", method: "GET", path: "/api/parking/nearby?lat=33.57&lon=-7.58&radius=5000", module: "parking", description: "List nearby parking lots", responseExample: { items: [{ id: 6, name: "Oulfa", address: "Bd Oulfa, Casablanca", distance: 1.2, availableSpots: 45, hourlyRate: 3, rating: 4.2 }] } },
      { id: "parking-detail", method: "GET", path: "/api/parking/6", module: "parking", description: "Get lot details, tariffs, photos", responseExample: { id: 6, name: "Oulfa", address: "Bd Oulfa, Casablanca", totalSpots: 100, availableSpots: 45, tariffs: [{ type: "HOURLY", rates: [{ hourStart: 0, hourEnd: 1, price: 3 }] }], coordinates: { lat: 33.57, lon: -7.58 } } },
      { id: "parking-search", method: "GET", path: "/api/parking/search?q=Oulfa", module: "parking", description: "Search parking lots by name", responseExample: { items: [{ id: 6, name: "Oulfa", address: "Bd Oulfa, Casablanca" }] } },
    ],
  },
  {
    name: "Booking",
    prefix: "/api/booking",
    endpoints: [
      { id: "booking-preview", method: "POST", path: "/api/booking/preview", module: "booking", description: "Preview booking cost before confirming", requestBody: { parkingId: 6, vehicleType: "CAR", startTime: "2026-06-20T12:00:00Z", endTime: "2026-06-20T14:00:00Z" }, responseExample: { previewId: "prev-001", totalFare: 5, fare: 5, commission: 0.5, deposit: 4.5, duration: "2h 0m" } },
      { id: "booking-confirm", method: "POST", path: "/api/booking/confirm", module: "booking", description: "Confirm booking and capture payment", requestBody: { previewId: "prev-001", paymentMethod: "WALLET" }, responseExample: { bookingId: "BK-4821", status: "CONFIRMED", reference: "BK-4821", fare: 5 } },
      { id: "booking-list", method: "GET", path: "/api/booking/list?status=CONFIRMED", module: "booking", description: "List driver's bookings", responseExample: { items: [{ id: "BK-4821", parkingId: 6, status: "CONFIRMED", startTime: "2026-06-20T12:00:00Z", endTime: "2026-06-20T14:00:00Z", fare: 5 }] } },
      { id: "booking-active", method: "GET", path: "/api/booking/active", module: "booking", description: "Get driver's active session", responseExample: { id: "BK-4821", status: "ACTIVE", entryTime: "2026-06-20T12:05:00Z", currentFare: 3 } },
      { id: "booking-cancel", method: "POST", path: "/api/booking/cancel/BK-4821", module: "booking", description: "Cancel a booking", requestBody: { reason: "CHANGE_OF_PLANS" }, responseExample: { status: "CANCELLED_FULL_REFUND", refundAmount: 5, refundTier: "FULL" } },
      { id: "booking-extend", method: "POST", path: "/api/booking/extend/BK-4821", module: "booking", description: "Extend an active booking", requestBody: { newEndTime: "2026-06-20T16:00:00Z" }, responseExample: { extensionFare: 3, newTotal: 8 } },
    ],
  },
  {
    name: "Wallet",
    prefix: "/api/wallet",
    endpoints: [
      { id: "wallet-balance", method: "GET", path: "/api/wallet/balance", module: "wallet", description: "Get wallet balance and status", responseExample: { walletId: "w-123", balance: 200, currency: "MAD", status: "ACTIVE" } },
      { id: "wallet-topup", method: "POST", path: "/api/wallet/topup", module: "wallet", description: "Initiate top-up via CorpoPay", requestBody: { amount: 100, currency: "MAD" }, responseExample: { checkoutUrl: "https://pay.corpopay.site/...", transactionId: "txn-789", status: "PENDING" } },
      { id: "wallet-history", method: "GET", path: "/api/wallet/history?page=1&pageSize=20", module: "wallet", description: "Transaction history with pagination", responseExample: { items: [{ id: "txn-001", type: "TOPUP", amount: 200, balanceAfter: 200, timestamp: "2026-06-19T10:00:00Z" }], nextCursor: null } },
    ],
  },
  {
    name: "Vehicles",
    prefix: "/api/vehicles",
    endpoints: [
      { id: "vehicle-list", method: "GET", path: "/api/vehicles", module: "vehicle", description: "List driver's registered vehicles", responseExample: { items: [{ id: "v-001", plateNumber: "99999-A-1", brandName: "BMW", modelName: "M4", colorName: "Noir", energy: "DIESEL", manufactureYear: 2023 }] } },
      { id: "vehicle-add", method: "POST", path: "/api/vehicles", module: "vehicle", description: "Register a new vehicle", requestBody: { plateNumber: "88888-C-3", brandName: "Audi", modelName: "A5", colorCode: "#1A1A1A", energy: "ESSENCE", manufactureYear: 2024 }, responseExample: { id: "v-002", plateNumber: "88888-C-3" } },
      { id: "vehicle-delete", method: "DELETE", path: "/api/vehicles/v-001", module: "vehicle", description: "Remove a vehicle", responseExample: { success: true } },
    ],
  },
  {
    name: "Gate",
    prefix: "/api/gate",
    endpoints: [
      { id: "gate-webhook", method: "POST", path: "/api/gate/webhook", module: "gate", description: "Receive vendor gate event (entry/exit)", requestBody: { eventType: "ENTRY", plateRaw: "99999-A-1", gateId: "GATE-01", parkingId: 6 }, responseExample: { sessionId: "sess-456", status: "ACTIVE", barrierCommand: "OPEN" } },
    ],
  },
  {
    name: "Admin",
    prefix: "/api/admin",
    endpoints: [
      { id: "admin-overview", method: "GET", path: "/api/admin/financial/overview", module: "admin", description: "Platform financial overview (requires admin token)", responseExample: { totalDriverBalance: 45200, totalMerchantBalance: 12800, totalCommissionAllTime: 8900, totalCommissionThisMonth: 1240, pendingSettlements: 3, commissionWalletBalance: 5200, settlementWalletBalance: 15600 } },
      { id: "admin-settlements", method: "GET", path: "/api/admin/settlements?status=PENDING", module: "admin", description: "List settlements by status", responseExample: { items: [{ id: "set-001", lotName: "Oulfa", amount: 5000, status: "PENDING", month: "2026-06" }] } },
    ],
  },
];
