# OtoParking Financial Module — Infrastructure Knowledge Base

> **Purpose**: Single-source truth for the entire OtoParking financial architecture. Read this first — it covers the database schema, wallet system, all 11 PRD scenarios, backend API surfaces, commission resolution, reconciliation invariant, cash flow chain, and how the three codebases interconnect. After reading, you can jump into any financial task across all three projects.

---

## 1. System Topology

Three projects, one shared Neon PostgreSQL database, two Docker containers:

```
┌───────────────────────────────────────────────────────────────────┐
│  otoparking-financial-viz  (Next.js 15 · localhost:3000)          │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│  │ app/modules/        │  │ app/api/*  (Next.js API routes)  │   │
│  │   financial/        │  │   cash-flow/  settlement/         │   │
│  │   settlement/       │  │   agent-setup/ cash-session/      │   │
│  │   admin/ auth/ ...  │  │   reset-test-data/               │   │
│  └───────┬─────────────┘  └──────────────┬───────────────────┘   │
│          │  lib/api.ts                   │  DIRECT DB             │
│          │  (via Next.js rewrites)       │  @neondatabase/serverless
│          ▼                               ▼                        │
├──────────┼───────────────────────────────┼────────────────────────┤
│          │                               │                        │
│  ┌───────▼──────────────────────┐        │                        │
│  │ otoparking-api :8080 (Docker)│        │                        │
│  │  Java / Quarkus              │        │                        │
│  │  Booking, Gate, Pricing,     │        │                        │
│  │  CommissionRateService,      │        │                        │
│  │  WebhookService,             │        │                        │
│  │  BankDepositService          │◄───────┼────────────────────────┤
│  └──────────────────────────────┘        │                        │
│                                          │                        │
│  ┌──────────────────────────────┐        │     ┌──────────────────┤
│  │ otoparking-admin-api :8082   │        │     │                  │
│  │  → :8081 (Docker)            │────────┼─────┤                  │
│  │  Java / Quarkus              │        │     │  Neon PostgreSQL  │
│  │  AdminFinancialResource,     │        │     │  (AWS eu-central) │
│  │  TenantFinancialResource,    │  JDBC  │     │                  │
│  │  ReconciliationService,      │────────┼─────┤  neondb          │
│  │  TestCenterResource,         │        │     │                  │
│  │  DailyReconciliationJob      │        │     │                  │
│  └──────────────────────────────┘        │     └──────────────────┘
└──────────────────────────────────────────┘
```

### Which project does what

| Project | Role | Port | Framework |
|---------|------|------|-----------|
| `otoparking-financial-viz` | Financial test center UI + dev-only API routes | `:3000` | Next.js 15 |
| `otoparking-backend` (`otoparking-api`) | Main platform API: booking, gate, pricing, escrow, commission | `:8080` | Java/Quarkus |
| `otoparking-admin-backend` (`otoparking-admin-api`) | Admin portal API: financial oversight, settlements, reconciliation, tenant management | `:8082→:8081` | Java/Quarkus |

### How the frontend reaches the backends

- **Main backend** — Next.js rewrites: `/api/backend/:path*` → `http://localhost:8080/api/:path*`. Used via `lib/api.ts`.
- **Admin backend** — Next.js rewrites: `/api/admin/:path*` → `http://localhost:8082/api/admin/:path*`. Used via `lib/admin-api.ts`.
- **Direct DB** — 5 Next.js API routes in `app/api/` bypass both backends and use `@neondatabase/serverless` to talk directly to Neon PostgreSQL. These are dev/test-only convenience routes.

---

## 2. Database Schema — Financial Tables

All tables live in a single Neon PostgreSQL database. Environment: `DB_URL` in `otoparking-backend/.env`.

### Core Wallet Tables

```
oto_wallets                   — Driver wallets (one per user, wallet_type='MAIN')
  ├── id, account_id, wallet_number, wallet_type
  ├── balance_available, balance_blocked
  └── currency, status, date_create, date_update

oto_wallets_platform          — Platform wallets (two rows per platform_code)
  ├── id, platform_code, wallet_type ('COMMISSION' | 'SETTLEMENT')
  ├── balance_available, balance_blocked
  └── currency, status, date_create, date_update

oto_wallets_merchant          — Lot Revenue wallets (one per parking lot)
  ├── id, merchant_id (=parking_id), wallet_number
  ├── balance_available
  ├── commission_rate (lot-specific override, nullable)
  ├── total_commission_paid (all-time)
  └── status, date_create, date_update
```

**Key insight**: `oto_wallets_platform` has exactly **two** active rows for `platform_code='OTOPARKING'`:
- `wallet_type = 'COMMISSION'` — holds platform fees (available, spendable)
- `wallet_type = 'SETTLEMENT'` — holds escrowed funds (blocked until booking completes)

### Transaction & Escrow Tables

```
oto_wallet_ledger             — Immutable transaction log (append-only)
  ├── id, source_wallet_id, target_wallet_id
  ├── amount, tx_type, tx_status, tx_ref
  ├── booking_reference, account_id, parking_id
  └── note, created_at, date_create

oto_booking_payment           — Payment trace per booking
  ├── id, booking_reference, account_id
  ├── amount, currency, status
  └── created_at

oto_escrow_records            — Escrow lifecycle tracking
  ├── id, booking_reference, account_id
  ├── amount, status ('ESCROWED' | 'RELEASED' | 'REVERSED')
  ├── refund_pending_reserve (solvency flag, Phase 3)
  └── created_at, updated_at
```

### Agent Cash Tally & Commission (Physical Cash Flow)

```
oto_agent_cash_tally          — Per-agent per-shift cash tracking
  ├── id, agent_id, lot_id
  ├── shift_date, shift_number
  ├── float_amount (starting cash)
  ├── total_collected (cash collected this shift)
  ├── expected_amount (float + collected)
  ├── status ('OPEN' | 'RECONCILED' | 'DISCREPANCY' | 'AWAITING_FLOAT')
  ├── confirmed_amount, discrepancy_amount
  ├── reconciled_by, reconciled_at
  └── created_at, updated_at

oto_cash_commission_tracker   — Lot-level cash commission per billing period
  ├── lot_id, billing_period (UNIQUE constraint on both)
  ├── total_cash_sessions, total_cash_fare
  ├── commission_owed, commission_collected
  ├── carry_forward
  └── last_updated_at

oto_session_debts             — Unpaid gate session debts
  ├── id, session_id, driver_id, lot_id
  ├── amount_owed, currency, status ('OPEN' | 'PAID' | 'WRITTEN_OFF')
  └── created_at, updated_at
```

### Settlement & Reconciliation

```
adm_settlements               — Settlement requests/approvals
  ├── id, tenant_id, requested_by_user_id
  ├── gross_amount, gross_digital_revenue
  ├── cash_commission_owed, commission_deducted
  ├── net_amount, net_payout_amount
  ├── carry_forward_from_prev, settlement_type
  ├── billing_period, lot_id, bank_details, tenant_note
  ├── status ('PENDING' | 'APPROVED' | 'REJECTED' | 'PAID')
  ├── reviewed_by_admin_id, review_note
  ├── corpopay_disbursement_ref, paid_at
  └── created_at, updated_at

adm_reconciliation_log        — Append-only reconciliation runs
  ├── id, run_at, run_type ('SCHEDULED' | 'MANUAL')
  ├── driver_wallets_total, settlement_wallet_total
  ├── commission_wallet_total, merchant_wallets_total
  ├── internal_total, corpopay_balance, discrepancy
  ├── is_balanced, notes, triggered_by
  └── created_at
```

### Dev-Only Test Table

```
oto_test_manager_cash         — Bridge table for agent→manager→tenant cash flow (VIZ dev only)
  ├── id (PRIMARY KEY DEFAULT 1), lot_id (UNIQUE)
  ├── manager_cash NUMERIC(10,2) DEFAULT 0
  └── updated_at
```

This table is **created on-the-fly** by the frontend API routes (`CREATE TABLE IF NOT EXISTS`). The real backends do not know about it. It exists solely to visualize the cash handoff chain in the financial viz.

### Other Referenced Tables

```
oto_topups                    — CorpoPay top-up history
oto_gate_sessions             — Gate entry/exit sessions
oto_parking_gate_access_requests — Active gate access requests
adm_tenants                   — Tenant records (commission_rate_override)
adm_tenant_lot_assignments    — Lot↔tenant mapping
adm_platform_settings         — Platform-wide config (commission rate, CorpoPay balance)
adm_users                     — Admin/manager user accounts
```

---

## 3. Wallet Architecture — The Four Wallets

The financial model centers on four wallets that mirror actual DB tables:

```
                        ┌──────────────────┐
                        │   Driver Wallet   │  oto_wallets (MAIN)
                        │  Pre-paid credits │  balance_available
                        └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │ 10%        │            │ 90%
                    ▼            │            ▼
          ┌─────────────┐       │    ┌─────────────┐
          │  Commission  │       │    │  Settlement  │  oto_wallets_platform
          │  (available) │       │    │  (blocked)   │  COMMISSION / SETTLEMENT
          └─────────────┘       │    └──────┬──────┘
                                │           │ escrow release
                                │           ▼
                                │    ┌─────────────┐
                                │    │ Lot Revenue  │  oto_wallets_merchant
                                │    │ (available)  │  balance_available
                                │    └─────────────┘
                                │
         Gate Wallet (walk-in): 90% goes directly to Lot Revenue (bypasses escrow)
```

### How funds flow per transaction type

**Booking** (CheckoutService.bookingCheckoutConfirm):
1. `DEBIT driver.balance_available` — full fare
2. `CREDIT commission.balance_available` — `rate% × fare`
3. `CREDIT settlement.balance_available` — `(100−rate)% × fare` (escrowed)

**Escrow Release** (EscrowReleaseService.releaseToMerchant):
1. `DEBIT settlement.balance_available` — escrow amount
2. `CREDIT lot.balance_available` — escrow amount

**Gate Wallet (walk-in)**:
1. `DEBIT driver.balance_available` — fare
2. `CREDIT commission.balance_available` — `rate% × fare`
3. `CREDIT lot.balance_available` — `(100−rate)% × fare`
   (No escrow — gate sessions settle immediately)

**Gate Cash**:
- Driver pays physical cash at agent
- `oto_agent_cash_tally.total_collected` incremented
- `oto_cash_commission_tracker` upserted with `commission_owed`

**Cancellation** (BookingCancelService — refund tier determined by `minutesUntilStart`):
| Tier | Window | Settlement | Commission | Lot gets? |
|------|--------|-----------|------------|-----------|
| FULL | >24h before start | 100% → driver | 100% → driver | Nothing |
| PARTIAL | 1–24h before start | 50% → driver, 50% → lot | 50% → driver | 50% of settlement |
| NONE | <1h before start | 100% → lot | Kept by platform | 100% of settlement |

---

## 4. Commission Rate Resolution

`CommissionRateService` (in `otoparking-backend`) has a 4-tier fallback:

```
Priority 1: oto_wallets_merchant.commission_rate      (lot-specific override)
Priority 2: adm_tenants.commission_rate_override        (tenant-level, via lot assignment)
Priority 3: adm_platform_settings.platform_commission_rate  (platform default)
Priority 4: 10.00%                                     (hardcoded emergency fallback)
```

All computations use `BigDecimal` with `RoundingMode.HALF_UP` at 2 decimal places. Never floats/doubles.

The admin backend (`AdminFinancialResource`) also has a `GET /commission-rate` endpoint and `PUT /commission-rate` via `CommissionRateDAO` to manage these values.

---

## 5. The 11 PRD Financial Scenarios

Defined in `otoparking-financial-viz/src/lib/scenarios.ts`. Each scenario has a `category`, named flows between wallets, and a `prdSection` reference.

### §7.1 — Top-Up
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 1 | `topup` | Driver Top-Up | CorpoPay → `driver` (+20 MAD default) | `topup` |

Backend: `POST /api/admin/financial/adjust` (credits `oto_wallets.balance_available`)

### §7.2 — Booking Lifecycle
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 2 | `booking` | Pre-Booking | `driver` → `commission` (10%) + `settlement` (90%) | `booking` |
| 3 | `booking-completed` | Booking Completed | `settlement` → `lot` (escrow release) | `booking` |

Backend: `POST /pricing/preview` → `POST /booking/confirm` creates escrow. Gate entry + exit triggers escrow release via `EscrowReleaseService`.

### §7.3–§7.4 — Gate Sessions
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 4 | `gate-wallet` | Gate Exit — Wallet | `driver` → `commission` + `lot` (no escrow) | `gate` |
| 5 | `gate-cash` | Gate Exit — Cash | Cash in `agent-cash` + tracked in `cash-tracker` | `gate` |

Backend: `POST /gate/sessions/start` → `POST /gate/payment/close/cash`. Cash sessions bypass digital wallets entirely.

### §7.6 — Overstay
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 6 | `overstay` | Overstay Penalty | `driver` → `commission` (10%) + `settlement` (90%) | `overstay` |

Backend: `POST /booking/extension/preview` → `POST /booking/extension/confirm`. The extension amount is added to existing escrow via `EscrowDAO.addAmount()`.

### §7.8–§7.10 — Cancellation
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 7 | `cancel-full` | Cancel — Full Refund | `settlement` + `commission` → `driver` | `cancellation` |
| 8 | `cancel-partial` | Cancel — Partial 50% | 50% driver, 50% lot, 50% commission back | `cancellation` |
| 9 | `cancel-none` | Cancel — No Refund | `settlement` → `lot` (driver forfeits) | `cancellation` |

Backend: `POST /booking/cancel/preview` → `POST /booking/cancel/confirm`. The refund tier is **backend-determined** by `minutesUntilStart`, not by scenario ID. To hit a specific tier: book for tomorrow = FULL, book today with buffer = PARTIAL, book today without buffer = NONE.

### §8.1–§8.2 — Month-End Settlement
| # | ID | Name | Flow | Category |
|---|----|------|------|----------|
| 10 | `settle-digital` | Month-End Digital Payout | `lot` → tenant bank (net = gross − cash owed) | `settlement` |
| 11 | `settle-cash` | Month-End Cash Netting | Cash tally → Commission (netted) | `settlement` |

Backend: `POST /api/admin/tenant/financial/settlements` → `PUT /api/admin/financial/settlements/{id}/approve`. Cash netting: `POST /api/settlement/cash` marks `commission_collected = commission_owed` in `oto_cash_commission_tracker`.

---

## 6. Complete API Surface

### 6A. Main Backend (`otoparking-api :8080`)

All endpoints require auth (Bearer JWT). Used by the frontend via `lib/api.ts`.

| Method | Path | Purpose | Wallet Impact |
|--------|------|---------|---------------|
| `POST` | `/auth/login` | Driver/agent auth | — |
| `POST` | `/wallet/info` | Get driver wallet balance | — |
| `POST` | `/pricing/preview` | Calculate booking fare | — |
| `POST` | `/booking/confirm` | Confirm booking | DEBIT driver, CREDIT commission + settlement |
| `POST` | `/booking/list` | List driver bookings | — |
| `POST` | `/parking/book/list` | List all bookings for a lot | — |
| `POST` | `/booking/cancel/preview` | Check cancel eligibility | — |
| `POST` | `/booking/cancel/confirm` | Execute cancellation | See cancel tiers above |
| `POST` | `/booking/extension/preview` | Calculate extension cost | — |
| `POST` | `/booking/extension/confirm` | Execute extension | DEBIT driver, CREDIT commission + settlement |
| `POST` | `/gate/sessions/start` | Start gate session | — |
| `POST` | `/gate/payment/close/wallet` | Close session with wallet | DEBIT driver, CREDIT commission + lot |
| `POST` | `/gate/payment/close/cash` | Close session with cash | Agent tally + commission tracker updated |
| `POST` | `/gate/sessions/feed` | List gate sessions | — |
| `POST` | `/api/admin/auth/login` | Admin/tenant/manager login | — |

### 6B. Admin Backend (`otoparking-admin-api :8082`)

All endpoints require admin/tenant auth with role guards. Used by the frontend via `lib/admin-api.ts`.

**Super Admin** (`/api/admin/financial`):
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/overview` | 16 KPIs: driver/merchant/commission/settlement balances, escrow, cash owed, open shifts, debts, reconciliation last-run |
| `GET` | `/revenue/by-lot` | Revenue per parking lot (filterable by date range) |
| `GET` | `/revenue/by-tenant` | Revenue per tenant |
| `GET` | `/revenue/time-series` | Revenue over time (day/week/month/year granularity) |
| `GET` | `/revenue/export` | CSV export by lot |
| `GET` | `/settlements` | Paginated settlement list (filterable by status/tenant) |
| `GET` | `/settlements/{id}` | Full settlement detail |
| `PUT` | `/settlements/{id}/approve` | Approve a pending settlement |
| `PUT` | `/settlements/{id}/reject` | Reject a settlement with review note |
| `POST` | `/adjust` | Manual wallet credit/debit (audited) |
| `GET` | `/topups` | Paginated CorpoPay top-up history |
| `GET` | `/drivers/search` | Driver search for manual adjustments |
| `GET` | `/reconciliation` | Run reconciliation invariant on-demand |
| `GET` | `/sessions/list` | Paginated gate session list |
| `GET` | `/commission-rate` | Get commission rates |
| `PUT` | `/commission-rate` | Set commission rate override |

**Tenant Admin** (`/api/admin/tenant/financial`):
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/wallet` | Merchant wallet summary (balance + stats, scoped to tenant's lots) |
| `GET` | `/revenue` | Revenue KPIs + per-lot breakdown |
| `GET` | `/settlements` | Settlement history |
| `POST` | `/settlements` | Request a new settlement payout |
| `GET` | `/transactions` | Wallet transaction history (paginated) |
| `GET` | `/dashboard` | Live ops dashboard: escrow totals, active tickets, agents on shift, cash commission owed |
| `GET` | `/cash-ledger` | Cash tally + commission owed/collected + open debts |
| `POST` | `/write-off-debt` | Write off an uncollectible debt |
| `POST` | `/resolve-settlement` | Resolve a settlement with custom note |

**Test Center** (`/api/admin/test`):
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/cash-session?fare=X&commission=Y` | Simulate a completed CASH gate session (creates gate session + upserts commission tracker + inserts debt) |

### 6C. Next.js API Routes (Direct DB — Dev Only)

These 7 routes in `otoparking-financial-viz/src/app/api/` bypass both backends and talk directly to Neon PostgreSQL:

| Method | Path | Purpose | Tables Touched |
|--------|------|---------|----------------|
| `GET` | `/cash-flow/state` | Read agent + manager cash totals | `oto_agent_cash_tally`, `oto_test_manager_cash` |
| `POST` | `/cash-flow/agent-to-manager` | Close all OPEN tallies → move cash to manager | `oto_agent_cash_tally`, `oto_test_manager_cash` |
| `POST` | `/cash-flow/manager-to-tenant` | Clear manager cash → credit Lot Revenue | `oto_test_manager_cash`, `oto_wallets_merchant` |
| `POST` | `/settlement/digital` | Full digital settlement: zero lot wallet, net cash, insert adm_settlements | `oto_wallets_merchant`, `oto_cash_commission_tracker`, `adm_settlements` |
| `POST` | `/settlement/cash` | Mark cash commission as collected | `oto_cash_commission_tracker` |
| `POST` | `/cash-session` | Record a cash session (upsert tracker + insert debt) | `oto_cash_commission_tracker`, `oto_session_debts` |
| `POST` | `/reset-test-data` | Hard reset: clear test bookings, escrow, gate sessions, adjust wallets | Multiple tables |
| `POST` | `/agent-setup/tally-bump` | Increment agent tally for testing | `oto_agent_cash_tally` |
| `POST` | `/agent-setup/shift` | Force agent shift status | `oto_agent_cash_tally` |
| `POST` | `/agent-setup/reset` | Reset agent data | `oto_agent_cash_tally` |

**⚠️ These routes embed the DB credentials inline.** They are dev-only convenience endpoints and should never be deployed to production.

---

## 7. Cash Flow Chain (Agent → Manager → Tenant)

The physical cash flow is separate from digital wallet flows. Money moves through three stages:

```
Stage 1: Agent collects cash at gate
  ┌─────────────────────────┐
  │ oto_agent_cash_tally    │  status='OPEN', total_collected += fare
  │ (Agent's physical cash) │
  └───────────┬─────────────┘
              │ Agent hands cash to manager
              │ POST /cash-flow/agent-to-manager
              ▼
Stage 2: Manager holds aggregated cash
  ┌─────────────────────────┐
  │ oto_test_manager_cash   │  manager_cash += all agent totals
  │ (Manager's float)       │  All tallies → RECONCILED
  └───────────┬─────────────┘
              │ Manager deposits to merchant
              │ POST /cash-flow/manager-to-tenant
              ▼
Stage 3: Cash converted to digital value
  ┌─────────────────────────┐
  │ oto_wallets_merchant    │  balance_available += manager_cash
  │ (Lot Revenue wallet)    │  manager_cash reset to 0
  └─────────────────────────┘
```

Meanwhile, `oto_cash_commission_tracker` tracks `commission_owed` per lot per billing period. At month-end settlement:
- **Digital payout** (PRD §8.1): Gross Lot Revenue − outstanding cash commission = Net wire to tenant
- **Cash netting** (PRD §8.2): `commission_collected` set to `commission_owed` (cash comm marked as recovered)

---

## 8. The Reconciliation Invariant (PRD §5)

Implemented in `ReconciliationService` (admin-backend):

```
CorpoPay Account Balance
  = SUM(Driver Wallets)                    — oto_wallets WHERE wallet_type='MAIN'
  + Settlement Wallet                      — oto_wallets_platform SETTLEMENT ACTIVE
  + Commission Wallet                      — oto_wallets_platform COMMISSION ACTIVE
  + SUM(Lot Revenue Wallets)               — oto_wallets_merchant WHERE status='ACTIVE'
```

Every run appends one row to `adm_reconciliation_log` with the computed `internal_total`, known `corpopay_balance` (from `adm_platform_settings`), `discrepancy`, and `is_balanced`. Runs on schedule via `DailyReconciliationJob` and on-demand via `GET /api/admin/financial/reconciliation`.

All arithmetic uses `BigDecimal` with `RoundingMode.HALF_UP` at 2 decimal places.

---

## 9. Frontend File Map — Financial Viz

```
otoparking-financial-viz/src/
├── app/
│   ├── modules/financial/page.tsx      — Main orchestrator: wallets state, scenarios, workflows, polling
│   ├── modules/settlement/page.tsx     — Settlement visualization (separate module)
│   ├── modules/admin/page.tsx          — Admin portal visualization
│   ├── modules/auth/page.tsx           — Auth flow visualization
│   └── api/                            — Dev-only Next.js API routes (see section 6C)
├── lib/
│   ├── api.ts                          — All main backend API calls + auth token management
│   ├── admin-api.ts                    — All admin backend API calls + agent cash snapshot
│   ├── scenarios.ts                    — 11 PRD scenario definitions (flows, amounts, categories)
│   ├── scenario-handlers.ts            — Async handlers (one per scenario): API call + monitor events
│   ├── workflows.ts                    — Workflow chains (sequences of scenarios with delays)
│   ├── flow-amounts.ts                 — Pure calculation helpers for visual amounts
│   ├── auth-service.ts                 — Auth token caching + login functions
│   └── agent-setup.ts                  — Agent shift setup helpers
├── components/
│   ├── FlowCanvas.tsx                  — React Flow canvas with animated wallet nodes + particle edges
│   ├── ScenarioPanel.tsx               — Scenario/workflow buttons + activity log
│   ├── SettingsPanel.tsx               — Parameter editor (topUpAmount, duration, etc.)
│   ├── LedgerPanel.tsx                 — 3-metric overlay (circulation, commission, lot revenue)
│   ├── MonitorPanel.tsx                — 4-tab event stream (API/Step/DB/System)
│   ├── MetricsBar.tsx                  — 5 live KPIs bar
│   ├── AgentCashPanel.tsx              — Agent cash status + shift management
│   ├── ApiDbMap.tsx                    — API→DB visual mapping
│   ├── ApiDbFlowCanvas.tsx             — API→DB animated flow canvas
│   └── WalletNodeContent.tsx           — Wallet node rendering with balance/badge
├── types/
│   ├── financial.ts                    — WalletState, PRDScenario, FlowDefinition, etc.
│   ├── settlement.ts                   — Settlement-specific types
│   ├── admin.ts                        — Admin-specific types
│   ├── auth.ts                         — Auth types
│   └── modules.ts                      — Module page props
└── hooks/
    ├── useColorMode.ts                 — Color mode management
    └── useTheme.ts                     — Theme management
```

---

## 10. Test Data & Accounts

These are hardcoded across `api.ts`, `admin-api.ts`, and the API routes:

| Entity | Value |
|--------|-------|
| Parking Lot | `PARKING_ID = 61` |
| Vehicle | `VEHICLE_ID = 159` |
| Plate | `12345-A-0` |
| Driver Account | `6a33014db68486ccc9606985` |
| Agent | `AGENT_ID = 15` |
| Tenant ID | `TENANT_ID = 6` |
| Tenant User ID | `TENANT_USER_ID = 9` |

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Driver | `akarog20230@gmail.com` | `password123` |
| Tenant | `test-tenant@otoparking.com` | `Test-Tenant2026` |
| Super Admin | `admin@otoparking.com` | `Admin@12345` |
| Agent | `test-agent@otoparking.com` | `Test-Agent2026` |

---

## 11. Key Design Decisions & Gotchas

### Architecture Decisions

1. **All monetary values are `BigDecimal`** (Java backends) — never float/double. Rounding is always `HALF_UP` at 2 decimal places.

2. **`oto_wallets_platform` has exactly two rows** for OTOPARKING: one COMMISSION, one SETTLEMENT. The SETTLEMENT wallet's `balance_available` is the sum of all escrowed funds.

3. **Escrow is NOT a separate wallet balance** — it's stored in `oto_escrow_records` with status tracking. The Settlement wallet's balance should equal `SUM(oto_escrow_records WHERE status='ESCROWED')`.

4. **Gate sessions bypass escrow entirely** — they settle immediately to Lot Revenue (PRD §7.3). This is intentional: no pre-booking means no refund protection needed.

5. **Cancellation tiers are backend-determined** — the frontend cannot choose the tier. `BookingCancelService` computes `minutesUntilStart` and applies FIFO logic to escrow records.

6. **Commission rates cascade**: lot-specific → tenant override → platform default → 10% hardcoded. No rate means 10%.

### Common Pitfalls

1. **Cancel refund tier is determined by `minutesUntilStart`**, NOT by scenario ID. To get a specific tier:
   - FULL: book for tomorrow (`bookToday = false`)
   - PARTIAL: book for today with ≥3h buffer (`bookToday = true`)
   - NONE: book for today with no buffer (`bookToday = true`, `noMinBuffer = true`)

2. **Extension confirm** requires `extension_preview_id` from the preview response, NOT `extension_minutes`.

3. **`oto_gate_sessions` vs `oto_parking_gate_access_requests`** — active sessions may be in either table. Hard reset handles both.

4. **Docker containers auto-reload** on Java file changes (Quarkus dev mode with bind mounts). Sometimes need to touch the changed file to trigger.

5. **Frontend needs hard refresh** (Cmd+Shift+R) after TypeScript module structure changes to clear Next.js module cache.

6. **`simDepthRef` in the financial page** blocks live polls from overwriting wallet state during animations. Must never go negative — all decrements use `Math.max(0, ...)`.

7. **The 5 Next.js API routes embed DB credentials inline** — they are dev-only. Any production deployment must remove or secure these.

8. **`oto_test_manager_cash` is a dev-only table** created on-the-fly. Does not exist in the real backend's data model.

---

## 12. Quick Start — Common Tasks

### Run a full booking lifecycle test
```
1. Open http://localhost:3000 → Financial module
2. Click "Happy Booking" workflow (topup → booking → booking-completed)
3. Watch FlowCanvas animate: driver debited, commission + settlement credited, escrow released to lot
```

### Test cash gate flow
```
1. Click "Gate Cash" workflow (topup → gate-cash)
2. Agent cash tally incremented, commission tracker upserted
3. Click agent-cash → manager-cash → lot buttons to move physical cash through the chain
```

### Check platform financial health
```
1. Open http://localhost:3000 → Admin module
2. See Platform Overview: all wallet balances, escrow totals, cash owed, pending settlements
3. Click "Run Reconciliation" to verify the invariant
```

### Add a new financial scenario
```
1. Define flows in lib/scenarios.ts
2. Create handler in lib/scenario-handlers.ts (if it needs real API calls)
3. Add scenario ID to the isReal list in financial/page.tsx
4. Add dispatch case in the runScenario if/else chain
5. Add workflow in lib/workflows.ts if it's part of a sequence
```

---

## 13. Reference — PRD Sections Mapped

| PRD Section | Topic | Backend Impl | Frontend Viz |
|-------------|-------|-------------|-------------|
| §5 | Reconciliation Invariant | `ReconciliationService` | Admin module overview tab |
| §7.1 | Driver Top-Up | `AdminFinancialResource.adjust` | Scenario #1 |
| §7.2 | Pre-Booking + Escrow | `CheckoutService`, `EscrowReleaseService` | Scenarios #2–3 |
| §7.3 | Gate Exit — Wallet | `GateController` | Scenario #4 |
| §7.4 | Gate Exit — Cash | `GateController` + `TestCenterResource` | Scenario #5 |
| §7.6 | Overstay/Extension | `BookingExtensionService` | Scenario #6 |
| §7.8–7.10 | Cancellation Tiers | `BookingCancelService` | Scenarios #7–9 |
| §8.1 | Month-End Digital Payout | `TenantFinancialResource` settlements + approval | Scenario #10 |
| §8.2 | Month-End Cash Netting | `oto_cash_commission_tracker` update | Scenario #11 |
| §9 | Financial Dashboard | `AdminFinancialDAO.getPlatformOverview` | MetricsBar + LedgerPanel |
