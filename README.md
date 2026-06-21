# OtoParking — Test Center

Multi-module testing and quality-check dashboard for the OtoParking smart parking platform. Each module runs **real API calls against live Docker backends** while showing visual simulations, step-by-step scenario execution, and a tabbed monitor panel for debugging.

```
┌──────────────┬────────────────────────────────────┬──────────────────┐
│  🧭 Sidebar  │          🎨 Canvas (65%)           │  🎛️ Panel (35%)  │
│              │                                    │                  │
│  Finance     │  ┌─────────────────────────────┐   │  Settings        │
│  Gate        │  │   ReactFlow wallet graph     │   │  Metrics Bar     │
│  Auth        │  │   + Live balance badges      │   │  Scenarios       │
│  Notif'ns    │  │   + Ledger table overlay     │   │  Workflows       │
│  Admin       │  │   + Active booking indicator │   │  Event Log       │
│  Pricing     │  │   + Amber pulse animation    │   │  Controls        │
│  Cancel      │  └─────────────────────────────┘   │                  │
│  Settlement  │                                    │                  │
│  API Tester  │                                    │                  │
│  Infra       │                                    │                  │
├──────────────┴────────────────────────────────────┴──────────────────┤
│  📊 Monitor  ·  API | Steps | DB | System  ·  tabbed event stream     │
└──────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Prerequisites:** Docker containers `otoparking-api` (port 8080) and `otoparking-admin-api` (port 8082) must be running.

## Core Architecture

### Dual-Layer Execution

Every scenario runs in two layers simultaneously:

| Layer | Purpose | Timing |
|---|---|---|
| **Visual simulation** | Animates coins, lights edges, updates balances in canvas | Runs first, cinematic step-by-step (1.8s per step + 3.2s hold) |
| **Real API execution** | Makes HTTP calls to the running backends, mutates the database | Fires in parallel, results displayed in toasts + monitor panel |

After both complete, a delayed live poll refreshes canvas values from the database.

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Next.js App     │────▶│  otoparking-api   │────▶│  Neon PostgreSQL  │
│  (port 3000)     │     │  (port 8080)      │     │  (cloud)          │
│                  │     │  Java/Quarkus     │     │                   │
│  /api/backend/*  │     └──────────────────┘     └──────────────────┘
│  /api/admin/*    │────▶┌──────────────────┐
│                  │     │  admin-api        │
│  /api/reset-*    │▶DB  │  (port 8082)      │
└─────────────────┘     │  Java/Quarkus     │
                        └──────────────────┘
```

## Test Accounts & Data

| Role | Email | Password | Notes |
|---|---|---|---|
| Driver | `akarog20230@gmail.com` | `password123` | account_id `6a33014db68486ccc9606985` |
| Tenant | `test-tenant@otoparking.com` | `Test-Tenant2026` | tenantId 6 |
| Super Admin | `admin@otoparking.com` | `Admin@12345` | Used for top-up + cash adjustments |
| Manager | `test-manager@otoparking.com` | `TestManager2026@` | Not yet wired into workflows |

**Test data:** Parking lot 61, Vehicle 159, Plate `12345-A-0`

## Modules

| # | Module | Status | Description |
|---|--------|--------|-------------|
| 🏦 | **Finance** | ✅ Backend-integrated | 4 wallets · 11 PRD scenarios · 8 workflows · live API sync · monitor panel |
| 🚗 | **Gate** | ✅ Phase 0 | OtoGate simulator · 9 use cases · car entry/exit animations |
| 🔐 | **Auth** | ✅ Phase 0 | OTP flow tester · token lifecycle · Noscera integration |
| 🔔 | **Notifications** | ✅ Phase 0 | PushCaster · 15 workflow combos · push/email/SMS |
| 🏢 | **Admin** | ✅ Phase 0 | RBAC visualizer · 13 modules · 3 roles |
| 🧮 | **Pricing** | ✅ Phase 0 | Tariff engine · grace/bracket computation |
| 🚫 | **Cancel** | 🚧 Placeholder | Decision tree visualizer · refund tiers |
| 🏛️ | **Settlement** | 🚧 Placeholder | Month-end payout pipeline |
| 🔌 | **API Tester** | 🚧 Placeholder | Endpoint catalog |
| 🖥️ | **Infra** | 🚧 Placeholder | Lambda topology map |

## Finance Module — Backend-Integrated

### 4 Wallet Canvas

The React Flow canvas displays 4 wallet nodes, each bound to a real database table:

| Canvas Node | Backend Table | Shows | Color |
|---|---|---|---|
| **Driver Wallet** | `oto_wallets` | `balance_available` | `#378ADD` (blue) |
| **Commission** | `oto_wallets_platform` | Today's commission from `oto_booking_payment` | `#CBFF00` (lime) |
| **Settlement** | `oto_wallets_platform` | `blocked` = escrowed funds not yet released | `#BA7517` (amber) |
| **Lot Revenue** | `oto_wallets_merchant` | `balance_available` for lot 61 | `#005249` (green) |

### 3 Ledger Overlay (top-left of canvas)

| Metric | Source | Meaning |
|---|---|---|
| **Cash Tally** | `oto_cash_commission_tracker.commission_owed` | Accumulated cash commission owed this month |
| **Escrow Active** | Tenant dashboard `escrow.total` | Total MAD held in escrow |
| **Open Debts** | `oto_session_debts` with `status='OPEN'` | Unreconciled cash session debts |

### Scenario Execution Engine

Each of the 11 PRD scenarios fires real API calls:

| # | Scenario | API Calls | Auth |
|---|---|---|---|
| 1 | **Driver Top-Up** | `POST /api/admin/financial/adjust` (CREDIT DRIVER) | Admin |
| 2 | **Pre-Booking** | `POST /api/pricing/preview` → `POST /api/booking/confirm` | Driver |
| 3 | **Booking Completed** | `POST /api/gate/sessions/start` → `POST /api/gate/sessions/end` | Driver |
| 4 | **Gate Exit — Wallet** | `POST /api/gate/sessions/start` (WALK_IN) → end | Driver |
| 5 | **Gate Exit — Cash** | `POST /api/admin/financial/adjust` (MERCHANT) + `POST /api/admin/test/cash-session` | Admin |
| 6 | **Overstay Penalty** | Visual only (no dedicated API) | — |
| 7 | **Cancel — Full** | `POST /api/booking/cancel/preview` → confirm | Driver |
| 8 | **Cancel — Partial 50%** | Same cancel flow (backend determines tier) | Driver |
| 9 | **Cancel — No Refund** | Same cancel flow (backend determines tier) | Driver |
| 10 | **Month-End Digital** | Visual only (settlement pipeline) | — |
| 11 | **Month-End Cash Netting** | Visual only (settlement pipeline) | — |

**Important:** Cancel tier (full/partial/none) is determined by the **backend** based on time-to-start thresholds, not by the scenario ID. The visual animations show the expected split, but the actual refund amount comes from `BookingCancelService.determineEligibility`.

### 8 Workflows

| Workflow | Steps | Real Backend? |
|---|---|---|
| **Happy Path Booking** | topup → booking → booking-completed | ✅ Full |
| **Gate Wallet Walk-in** | topup → gate-wallet | ✅ Full |
| **Gate Cash** | topup → gate-cash | ✅ Full (needs admin backend) |
| **Cancel Full Refund** | topup → booking → cancel-full | ✅ Full |
| **Cancel Partial 50%** | topup → booking → cancel-partial | ✅ Full |
| **Cancel No Refund** | topup → booking → cancel-none | ✅ Full |
| **Overstay Penalty** | topup → booking → overstay → booking-completed | Mixed (overstay visual) |
| **Month-End Settlement** | settle-digital → settle-cash | Visual only |

### Active Booking Guard

When a booking has gate entry but no exit:
- Amber **"ACTIVE"** badge appears on canvas bottom-left with booking ref + escrow amount
- Workflows involving new bookings/gate sessions are **blocked** with a toast
- Cancel workflows are exempt (they create then cancel their own booking)
- Individual scenario buttons for booking/gate/overstay are also blocked

### Settings Panel

Collapsible at the top of the right panel. All values persisted to `localStorage`:

| Setting | Default | Controls |
|---|---|---|
| Top-Up | 20 MAD | Amount credited per top-up scenario |
| Duration | 2 hrs | Booking duration (rate: 5 MAD/h) |
| Start Hour | 14:00 | Tomorrow's booking start hour |
| Cash Fare | 50 MAD | Cash gate fare amount |
| Commission | 5 MAD | Cash commission (auto: 10% of fare) |
| Auto-release escrow | ON | When OFF, bookings stay ACTIVE after gate entry |

### Hard Reset

`POST /api/reset-test-data` runs a server-side PostgreSQL transaction that:

1. Deletes debts → cash tracker rows
2. Closes active access requests + gate sessions for lot 61
3. Deletes escrow records, payment traces, booking items, bookings for the test driver
4. Resets driver wallet and merchant wallet to 0
5. Deletes transactions and ledger entries

### Monitor Panel

4-tabbed event stream at the bottom of the page (collapsible):

- **API** — HTTP request/response tracking (endpoint, result)
- **Steps** — Scenario execution progress
- **DB** — Database mutations (table, operation, result)
- **System** — Connection status, poll cycles, resets

### Auto-Release Escrow Toggle

- **ON** (default): Gate entry → Gate exit immediately → Booking COMPLETED → Escrow → Lot Revenue
- **OFF**: Gate entry only → Booking stays ACTIVE → Escrow held until manual **Release Escrow** button

The release button calls `GET /api/gate/sessions/active` and does `executeGateExit()` for each.

## Backend Code Changes (Java — requires Docker rebuild)

| File | Change |
|---|---|
| `TenantLotDAO.java` | `ensureMerchantWallet()` — auto-creates `oto_wallets_merchant` on lot assignment |
| `TenantFinancialResource.java` | `GET /cash-ledger` — cash tally + open debts + today's lot commission |
| `TestCenterResource.java` | `POST /api/admin/test/cash-session` — records cash gate sessions with session + debt |

## Project Structure

```
otoparking-financial-viz/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (dark theme, fonts, tooltips, toaster)
│   │   ├── globals.css             # Theme tokens, shadcn/ui variables, animations
│   │   ├── page.tsx                # Test Center shell (sidebar + canvas + panel + monitor)
│   │   ├── api/
│   │   │   └── reset-test-data/route.ts  # Hard reset SQL endpoint (Neon direct connection)
│   │   └── modules/                # 10 module orchestrators
│   │       ├── financial/page.tsx  # Main orchestrator (~990 lines)
│   │       ├── gate/page.tsx
│   │       ├── auth/page.tsx
│   │       ├── notifications/page.tsx
│   │       ├── admin/page.tsx
│   │       ├── pricing/page.tsx
│   │       ├── cancellation/page.tsx     # 🚧 placeholder
│   │       ├── settlement/page.tsx       # 🚧 placeholder
│   │       ├── api/page.tsx              # 🚧 placeholder
│   │       └── infra/page.tsx            # 🚧 placeholder
│   ├── components/
│   │   ├── shared/                 # ModuleSidebar, ModuleHeader, StatusBar
│   │   ├── ui/                     # shadcn/ui primitives (button, card, tabs, etc.)
│   │   ├── FlowCanvas.tsx          # Finance: 4-wallet ReactFlow canvas + active badge
│   │   ├── ScenarioPanel.tsx       # Finance: scenarios, workflows, event log, controls
│   │   ├── MetricsBar.tsx          # Finance: 4-metric summary bar
│   │   ├── SettingsPanel.tsx       # Finance: collapsible parameter editor
│   │   ├── LedgerPanel.tsx         # Finance: 3-metric ledger overlay
│   │   ├── MonitorPanel.tsx        # 4-tab event monitor (API/Step/DB/System)
│   │   ├── LiveBadge.tsx           # Connection indicator dot
│   │   ├── GateCanvas.tsx
│   │   ├── GateControlPanel.tsx
│   │   ├── AuthCanvas.tsx
│   │   ├── AuthControlPanel.tsx
│   │   ├── NotificationsCanvas.tsx
│   │   ├── NotificationsControlPanel.tsx
│   │   ├── AdminCanvas.tsx
│   │   ├── AdminControlPanel.tsx
│   │   ├── PricingCanvas.tsx
│   │   └── PricingControlPanel.tsx
│   ├── hooks/                      # (reserved)
│   ├── lib/
│   │   ├── modules.tsx             # 10-module registry
│   │   ├── scenarios.ts            # 11 PRD financial scenario definitions
│   │   ├── workflows.ts            # 8 business workflow chains
│   │   ├── api.ts                  # All API functions, dual auth, live polling (~810 lines)
│   │   ├── animate.ts              # Particle animation engine + easing
│   │   └── utils.ts                # Tailwind class merge
│   └── types/
│       ├── modules.ts              # ModuleId, ModuleMeta, ModulePageProps (incl. onMonitor)
│       ├── financial.ts            # Wallet, Flow, Scenario, Particle types
│       ├── gate.ts
│       ├── auth.ts
│       ├── notifications.ts
│       ├── admin.ts
│       ├── pricing.ts
│       └── cancellation.ts
├── next.config.ts                  # Proxy rewrites to localhost:8080 and 8082
├── package.json
└── README.md
```

## Known Issues & Investigation Notes

### 1. Commission Shows 0 on Page Refresh
**Root cause:** The cash-ledger endpoint returns `lotCommission` from `oto_booking_payment WHERE created_at::date = CURRENT_DATE`. If no bookings were made today, it returns 0. Previously it returned 1.0 MAD (from today's bookings). The data is correct — it's a daily metric, not cumulative.

**Current DB value:** 1.00 MAD (from 2 bookings today at 0.50 MAD each)

### 2. Escrow Shows 9 Instead of Expected 18
**Root cause:** The settings were changed from 2h duration (10 MAD fare, 9 MAD escrow) to 1h duration (5 MAD fare, 4.50 MAD escrow). Two bookings × 4.50 = 9 MAD. This is correct. The UI persisted the changed settings.

### 3. Partial Refund Mismatch
**Root cause:** The backend `BookingCancelService` determines full/partial/none based on time-to-start, not the scenario ID. Test bookings are for tomorrow, so they always fall into the FULL refund window (>24h). The visual animation shows the expected 50% split but the backend returns a full refund. The cancel scenarios (7/8/9) all call the same API — the tier is backend-determined.

### 4. Active Bookings After Reset
**Root cause confirmed:** The hard reset was not properly closing `oto_parking_gate_access_requests` (the table for active sessions). **Now fixed** — the reset route closes ACTIVE → COMPLETED for both `oto_gate_sessions` and `oto_parking_gate_access_requests` before deleting.

### 5. Cash Tally Returns 0
**Root cause:** The `TestCenterResource.java` that records cash sessions is part of the admin backend. If the Docker container hasn't been rebuilt since adding this endpoint, the `POST /api/admin/test/cash-session` call silently fails. Additionally, the cash tracker query filters by `billing_period = TO_CHAR(NOW(), 'YYYY-MM')`, so only current-month data is returned.

### 6. Two Tables for Gate Sessions
- `oto_gate_sessions` (legacy) — used by TestCenterResource for cash session recording
- `oto_parking_gate_access_requests` — used by the real gate flow (BOOKING_ACTIVATION, WALK_IN)

The active session API (`GET /api/gate/sessions/active`) queries `oto_parking_gate_access_requests`, not `oto_gate_sessions`.

## Live Data Polling

The Finance module polls every 10 seconds:
- `POST /api/wallet/info` (driver token) — driver balance
- `GET /api/admin/tenant/financial/wallet` (tenant token) — merchant balance
- `GET /api/admin/tenant/financial/dashboard` (tenant token) — escrow, cash commission, live ops
- `GET /api/admin/tenant/financial/cash-ledger` (tenant token) — cash tally, open debts, today's commission
- `POST /api/booking/list` + `GET /api/gate/sessions/active` — active booking check

Polling is **suppressed** during active simulations (`simDepthRef > 0`) to prevent live data from overwriting mid-animation state.

## Available Backend Endpoints (for curl testing)

```bash
# Driver auth + wallet
curl -X POST localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"akarog20230@gmail.com","password":"password123"}'

# Tenant auth + financial data
curl -X POST localhost:8082/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-tenant@otoparking.com","password":"Test-Tenant2026"}'

# Cash ledger (tenant token)
curl localhost:8082/api/admin/tenant/financial/cash-ledger \
  -H "Authorization: Bearer <TENANT_TOKEN>"

# Admin auth (for top-up + cash adjustments)
curl -X POST localhost:8082/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@otoparking.com","password":"Admin@12345"}'

# Top-up driver wallet (admin token)
curl -X POST localhost:8082/api/admin/financial/adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"walletType":"DRIVER","targetId":"6a33014db68486ccc9606985","action":"CREDIT","amount":20,"currency":"MAD","reason":"test"}'
```

## Related Projects

| Project | Description |
|---------|-------------|
| `otoparking-backend` | Core platform API (Java/Quarkus, port 8080) |
| `otoparking-admin-backend` | Admin API (Java/Quarkus, port 8082) |
| `otoparking-admin` | Admin dashboard (Next.js) |
| `otoparking-mobile` | Driver mobile app |
| `PRD_FINANCIAL_ARCHITECTURE.md` | Authoritative financial spec |
| `FINANCIAL_MODULE_PRD.md` | Full product requirements |
