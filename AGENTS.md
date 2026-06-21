# OtoParking Financial Test Center — Agent Reference

## Overview

The Financial Test Center is a React Flow-based visualization tool that drives real OtoParking backend APIs to test the wallet/escrow/commission architecture. Every workflow button executes actual API calls against Docker containers (`otoparking-api:8080`, `otoparking-admin-api:8082`) on a live Neon PostgreSQL database. The React Flow canvas animates in sync with real transactions, with live data polling every 10 seconds.

**Test accounts:**
| Role | Email | Password |
|------|-------|----------|
| Driver | `akarog20230@gmail.com` | `password123` |
| Tenant | `test-tenant@otoparking.com` | `Test-Tenant2026` |
| Super Admin | `admin@otoparking.com` | `Admin@12345` |

**Test data:** Parking lot 61, Vehicle 159, Plate `12345-A-0`, Driver `account_id = 6a33014db68486ccc9606985`

---

## 4-Wallet Architecture

```
Driver Wallet    (oto_wallets)               — available balance
Commission       (oto_wallets_platform,  COMMISSION) — available balance
Settlement       (oto_wallets_platform,  SETTLEMENT) — blocked balance (escrow)
Lot Revenue      (oto_wallets_merchant)       — available balance
```

### Booking flow (production path):
```
1. DEBIT  driver.available          — full fare
2. CREDIT commission.available      — lot_rate% × fare
3. CREDIT settlement.blocked        — (100−lot_rate)% × fare  (escrowed)
```

### Escrow release (on booking COMPLETED):
```
1. DEBIT  settlement.blocked        — escrow amount
2. CREDIT lot.available             — escrow amount
```

### Refund tiers (backend-determined by minutes until start):
- **FULL** (>24h): 100% back to driver, commission reversed
- **PARTIAL** (1–24h): 50% driver / 50% lot, proportional commission split
- **NONE** (<1h): escrow → lot, commission kept

---

## File Map

```
src/
├── app/modules/financial/
│   └── page.tsx              # ~1250 lines — orchestrator: state, polling, workflow runner
├── lib/
│   ├── api.ts                # ~900 lines — all backend API calls + auth
│   ├── scenarios.ts          # ~350 lines — 11 PRD scenario definitions (flows + amounts)
│   ├── workflows.ts          # ~90 lines  — 8 workflow chains (sequences of scenarios)
│   ├── scenario-handlers.ts  # ~300 lines — one async handler per scenario (monitor emits + API)
│   └── flow-amounts.ts       # ~40 lines  — pure calculation helpers for visual amounts
├── components/
│   ├── FlowCanvas.tsx        # React Flow 4-wallet canvas with animated edges
│   ├── ScenarioPanel.tsx     # Right panel: scenario/workflow buttons + activity log
│   ├── SettingsPanel.tsx     # Collapsible parameter editor (topUpAmount, duration, etc.)
│   ├── LedgerPanel.tsx       # 3-metric overlay (circulation, commission, lot revenue)
│   ├── MonitorPanel.tsx      # 4-tab (API/Step/DB/System) collapsible event stream
│   └── MetricsBar.tsx        # Top metrics bar
├── types/
│   └── financial.ts          # WalletState, PRDScenario, FlowDefinition, etc.
└── app/api/reset-test-data/
    └── route.ts              # Hard reset — direct Neon SQL cleanup
```

### Backend (Java — Docker containers):
```
otoparking-backend/src/main/java/com/otoparking/
├── booking/service/
│   ├── BookingExtensionService.java   # Extension/overstay confirm (comm split via CommissionRateService)
│   ├── BookingCancelService.java      # Cancel preview + confirm (FULL/PARTIAL/NONE tiers)
│   └── ...
├── booking/dao/
│   └── BookingExtensionDAO.java       # Wallet locks, debit/credit, transaction inserts
├── checkout/service/
│   └── CheckoutService.java           # Booking confirm — reference for commission split pattern
├── commission/service/
│   └── CommissionRateService.java     # Resolves lot rate → tenant override → platform default → 10%
└── escrow/dao/
    └── EscrowDAO.java                 # Escrow lifecycle: create, addAmount, release, reverse
```

---

## Key Patterns

### Adding a new scenario handler (if a new scenario needs API calls)

1. **Create handler** in `lib/scenario-handlers.ts`:
```ts
export async function handleNewScenario(
  settings: TestSettings,
  emit: EmitFn,
): Promise<ScenarioResult> {
  emit("api", "POST /path", "Description", "pending", { ... });
  const result = await executeNewApi(...);
  emit("api", "POST /path", result.success ? "OK" : "Failed", result.success ? "ok" : "error", { ... });
  return result;
}
```

2. **Add scenario ID** to the `isReal` list in `page.tsx` (line ~800):
```ts
const isReal = scenario.id === "topup" || ... || scenario.id === "new-scenario";
```

3. **Add dispatch** in the if/else chain (line ~845):
```ts
} else if (scenario.id === "new-scenario") {
  result = await handleNewScenario(settings, emit);
}
```

### Adding a new workflow

1. Define scenario(s) in `lib/scenarios.ts` (PRDScenario with flows)
2. Add workflow entry in `lib/workflows.ts`:
```ts
{ id: "my-flow", name: "My Flow", steps: ["topup", "booking", "my-scenario"], delayMs: 8000 }
```
3. If the scenario needs real API: follow steps above for handler + isReal + dispatch

### Visual simulation amounts

The visual runs BEFORE the API call. Amounts are computed from settings + scenario flows:

- `bookingFlowAmount()` — fare = durationHours × 5 MAD/hr, 10% comm + 90% escrow
- `cancelFlowAmount()` — derived from same fare, split per refund tier
- `overstayFlowAmount()` — pre-fetches backend preview API for the actual fare, falls back to 5 MAD/hr estimate

### simDepthRef — preventing poll/refresh overwrites during animation

`simDepthRef` is a ref-count that blocks live polls and live refreshes from writing wallet state while a visual simulation or workflow is running:

- **+1** when a scenario starts (line ~800)
- **+1** when a workflow starts (line ~1240)
- **−1** after visual hold-then-clear (line ~765)
- **−1** after workflow completes (line ~1260, 5s delay)
- **−1** on early abort (error guards)

The live poll at line ~258 checks `simDepthRef.current === 0` before writing wallets.
The live refresh guard checks `simDepthRef.current > 0` (returns early without decrementing).

### finish() — async-aware scenario sequencing

Each `runScenario` now resolves via a `finish()` helper that waits for:
1. The API call to complete (via async handler)
2. The visual animation window to elapse (`minVisualMs = flows.length × 1800 + 3200`)

This prevents the next scenario in a workflow from starting before the current one's API call finishes — critical for cancel workflows where `lastBookingRef` must be set before the cancel step.

---

## Workflow Reference

| Workflow | Steps | Backend Effect |
|----------|-------|---------------|
| `happy-booking` | topup → booking → booking-completed | Full lifecycle: fund → escrow → release to lot |
| `gate-wallet-flow` | topup → gate-wallet | Walk-in: direct wallet payment at gate exit |
| `gate-cash-flow` | topup → gate-cash | Cash payment: lot credited, commission tracked |
| `cancel-full-flow` | topup → booking → cancel-full | Books tomorrow (>24h) → FULL refund |
| `cancel-partial-flow` | topup → booking → cancel-partial | Books today (3h+ ahead) → PARTIAL 50% refund |
| `cancel-none-flow` | topup → booking → cancel-none | Books today (next hour) → NONE refund |
| `overstay-flow` | topup → booking → overstay → booking-completed | Extension API: adds to escrow → released |
| `month-end-flow` | settle-digital → settle-cash | Visual-only (no real API yet) |

---

## Settings (localStorage key: `otoparking-test-settings`)

| Field | Default | Description |
|-------|---------|-------------|
| `topUpAmount` | 20 | MAD credited per top-up |
| `bookingDurationHours` | 2 | Booking length |
| `bookingStartHour` | 14 | Target start hour (0-23) |
| `autoReleaseEscrow` | true | If false, booking-completed holds escrow |
| `gateCashFare` | 50 | Cash gate fare |
| `gateCashCommission` | 5 | Cash gate commission |
| `overstayMinutes` | 90 | Extension minutes for overstay |

---

## Backend API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Driver auth |
| POST | `/wallet/info` | Driver balance |
| POST | `/pricing/preview` | Calculate booking fare |
| POST | `/booking/confirm` | Confirm booking, create escrow |
| POST | `/booking/cancel/preview` | Check cancellation eligibility |
| POST | `/booking/cancel/confirm` | Execute cancellation + refund |
| POST | `/booking/extension/preview` | Calculate extension cost |
| POST | `/booking/extension/confirm` | Execute extension, split commission |
| POST | `/booking/list` | List driver bookings |
| POST | `/parking/book/list` | List all bookings |
| POST | `/api/admin/auth/login` | Admin/tenant auth |
| GET | `/api/admin/tenant/financial/wallet` | Tenant wallet summary |
| GET | `/api/admin/tenant/financial/cash-ledger` | Cash tally + commission |
| GET | `/api/admin/tenant/financial/dashboard` | Dashboard stats |
| POST | `/api/admin/financial/adjust` | Manual wallet adjustment |

**Next.js proxy:** `/api/backend/:path*` → `http://localhost:8080/api/:path*`, `/api/admin/:path*` → `http://localhost:8082/api/admin/:path*`

---

## Common Pitfalls

1. **Cancel refund tier is backend-determined** by `minutesUntilStart`, NOT by scenario ID. To hit a specific tier:
   - FULL: book for tomorrow (`bookToday=false`)
   - PARTIAL: book for today with 3h minimum buffer (`bookToday=true`, default)
   - NONE: book for today with no buffer (`bookToday=true`, `noMinBuffer=true`, next hour)

2. **`simDepthRef` must never go negative** — all decrements use `Math.max(0, ...)`. The guard at the live refresh checks but does NOT decrement (it would consume the workflow-level ref).

3. **`lastBookingRef`** is set by the booking handler when `result.bookingReference` is truthy. Cancel handlers clear it after use. In cancel workflows, it's cleared before the booking step to avoid stale refs.

4. **Extension confirm** requires `extension_preview_id` from the preview response, NOT `extension_minutes`.

5. **`oto_gate_sessions` vs `oto_parking_gate_access_requests`** — active sessions are in the latter; hard reset handles both.

6. **Docker containers auto-reload** on Java file changes (Quarkus dev mode with bind mounts). Touch the changed file if hot-reload doesn't trigger.

7. **Frontend needs hard refresh** (Cmd+Shift+R) after TypeScript module structure changes to clear module cache.
