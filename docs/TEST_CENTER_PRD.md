# OtoParking Test Center — Product Requirements Document

**Document Type:** Internal Developer Tool PRD  
**Platform:** Next.js 16 / React 19  
**Status:** Active Development  
**Audience:** Backend Developers, QA Engineers, Integration Testers  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Module Specifications](#3-module-specifications)
   - 3a. [Finance Module](#3a-finance-module-financial)
   - 3b. [Gate Module](#3b-gate-module-gate)
   - 3c. [Auth Module](#3c-auth-module-auth)
   - 3d. [Notifications Module](#3d-notifications-module-notifications)
   - 3e. [Admin RBAC Module](#3e-admin-rbac-module-admin)
   - 3f. [Pricing Module](#3f-pricing-module-pricing)
   - 3g. [Cancellation Module](#3g-cancellation-module-cancellation)
   - 3h. [Settlement Module](#3h-settlement-module-settlement)
   - 3i. [API Tester Module](#3i-api-tester-module-api)
   - 3j. [Infra Module](#3j-infra-module-infra)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Backend Integration Layer](#5-backend-integration-layer)
6. [Data Flow](#6-data-flow)
7. [Upgrade Roadmap](#7-upgrade-roadmap)
8. [Cross-Module Opportunity Map](#8-cross-module-opportunity-map)
9. [Technical Constraints](#9-technical-constraints)
10. [Environment & Deployment](#10-environment--deployment)

---

## 1. Overview

### What Is the Test Center?

The OtoParking Test Center is an internal, developer-facing simulation and inspection tool built with Next.js 16 and React 19. It provides a unified, browser-based interface for testing, visualizing, and debugging every major subsystem of the OtoParking smart parking platform.

The Test Center is **not** a production UI. It is not intended for end users, operators, or any non-technical stakeholders. Its purpose is strictly to accelerate development velocity, enable integration testing, and make the behavior of complex backend subsystems observable and reproducible.

### Who Uses It?

| Role | Primary Use Cases |
|---|---|
| Backend Developers | Trigger real API calls, inspect payloads, verify state transitions |
| QA Engineers | Execute predefined scenarios, verify financial flows, reproduce edge cases |
| Integration Testers | Validate cross-service interactions, inspect token flows, test notification delivery |

### Why Does It Exist?

The OtoParking platform comprises at least 10 distinct subsystems — finance, gate control, authentication, notifications, admin RBAC, pricing, cancellation, settlement, REST API catalog, and cloud infrastructure. Each subsystem has its own rules, state machine, and backend contract. Testing these systems individually using raw API calls (cURL, Postman) is slow, error-prone, and produces no visual feedback.

The Test Center solves this by:

- Providing **scenario-driven test execution** for each subsystem via a guided UI
- Rendering **visual state machines** so developers can observe how the system transitions between states in real time
- Connecting to a **real backend** and executing **real API calls** that produce real state changes (not mocks)
- Logging all events in a **structured monitor panel** for post-execution inspection
- Serving as a **living reference implementation** of how each subsystem's API is supposed to be called

### Important Caveats

- The Test Center connects to a real backend and **can trigger real state changes** — wallet balances will change, sessions will be created, tokens will be issued.
- All 10 modules are currently **fully isolated** from one another. There is no cross-module state sharing, event bus, or shared context.
- Several modules use **hardcoded constants** (credentials, entity IDs, fares) that are flagged for externalization in the upgrade roadmap.

---

## 2. Architecture

### Shell Layout

The Test Center uses a fixed shell layout with three primary regions:

```
+--------+--------------------------------------------------+
|        |  HEADER (52px)                                   |
|  LEFT  +------------------------------+-------------------+
|  NAV   |                              |                   |
|  60px  |   CANVAS (65% width)         |  PANEL (35%)      |
|        |                              |                   |
|        |                              |                   |
|        |                              |                   |
+--------+------------------------------+-------------------+
|  STATUS BAR (bottom)                                      |
+-----------------------------------------------------------+
```

- **Left Sidebar Nav:** 60px wide, fixed, contains the OtoParking logo and module navigation icons
- **Header:** 52px tall, displays the active module identity, an activity badge, and a live session clock
- **Main Area:** Splits into a left canvas region (65% of available width) and a right panel (35%)
- **Status Bar:** Fixed to the bottom of the viewport

### Module Routing

Each module corresponds to a Next.js App Router page:

```
src/app/modules/{module}/page.tsx
```

| Module Slug | File Path |
|---|---|
| `financial` | `src/app/modules/financial/page.tsx` |
| `gate` | `src/app/modules/gate/page.tsx` |
| `auth` | `src/app/modules/auth/page.tsx` |
| `notifications` | `src/app/modules/notifications/page.tsx` |
| `admin` | `src/app/modules/admin/page.tsx` |
| `pricing` | `src/app/modules/pricing/page.tsx` |
| `cancellation` | `src/app/modules/cancellation/page.tsx` |
| `settlement` | `src/app/modules/settlement/page.tsx` |
| `api` | `src/app/modules/api/page.tsx` |
| `infra` | `src/app/modules/infra/page.tsx` |

### Theme System

The theme system is implemented via a `useTheme()` hook and follows a strict hydration-safe pattern:

- The theme **always initializes to `DARK`** in `useState` — never reads from `localStorage` during initialization
- A `useEffect` runs after mount to read `localStorage` and correct the theme if needed
- The exported constants are `DARK` and `LIGHT` (not boolean flags)
- `readIsDark()` must never be called inside a `useState` initializer — doing so causes hydration mismatches

```typescript
// Correct pattern
const [theme, setTheme] = useState(DARK); // always DARK on init
useEffect(() => {
  const stored = readIsDark();
  if (!stored) setTheme(LIGHT);
}, []);
```

### Backend Proxy

The Test Center proxies all backend traffic through Next.js rewrites defined in `next.config.ts`:

| Proxy Path | Target |
|---|---|
| `/api/backend` | `http://localhost:8080` |
| `/api/admin` | `http://localhost:8082` |

This means all fetch calls from the frontend hit the Next.js dev server, which forwards them to the appropriate backend port. No direct cross-origin requests are made from the browser.

### Styling Conventions

The Test Center enforces a strict two-tier styling rule:

- **Inline styles** — used for all visual styling: colors, borders, backgrounds, shadows, typography, spacing within components
- **Tailwind CSS** — used for layout structure only: flex, grid, positioning, overflow, sizing containers

This rule is strictly enforced. Do not use Tailwind utility classes for colors, borders, or visual appearance.

### Icon Convention

No emojis are used anywhere in the Test Center UI. All iconography uses `lucide-react` components exclusively.

---

## 3. Module Specifications

---

### 3a. Finance Module (`financial`)

**PRD Reference:** `PRD_FINANCIAL_ARCHITECTURE.md`

#### Purpose

The Finance module is the most complex module in the Test Center. It provides a full visual simulation environment for the OtoParking financial system, including wallet management, payment processing, ledger inspection, and real-time event monitoring. Unlike most other modules, the Finance module executes **real API calls** that produce **real backend state changes**.

#### Canvas Components

| Component | Description |
|---|---|
| `FlowCanvas` | ReactFlow-based directed graph showing wallet nodes, transaction edges, and flow states |
| `LedgerPanel` | Tabular ledger view showing all wallet transactions with timestamps, amounts, and types |
| `MonitorPanel` | Verbose event log with inline `WalletTransferCard` components for each financial event |
| `ScenarioPanel` | Scenario and workflow selector with execution controls |
| `MetricsBar` | Fixed bar showing 4 live financial metrics |

#### Scenarios and Workflows

The Finance module implements **11 PRD scenarios** organized into **8 workflows**:

1. Driver wallet top-up
2. Parking payment deduction
3. Tenant payout
4. Platform fee collection
5. Refund processing
6. Insufficient balance rejection
7. Wallet freeze and unfreeze
8. Cross-wallet transfer audit
9. Ledger reconciliation
10. Settlement trigger
11. Carry-forward balance

Each workflow is selectable from `ScenarioPanel` and executes a sequence of API calls with animated transitions on the `FlowCanvas`.

#### Live Data

- Wallet balances are fetched from the real backend
- Data is polled every **10 seconds**
- The `MetricsBar` refreshes on each poll cycle

#### Monitor Panel

The `MonitorPanel` logs every financial event triggered during the session. Events include:

- API call initiation and response
- Wallet state transitions
- Error conditions and rejection reasons
- Inline `WalletTransferCard` components embedded in the log for each transfer event

**Important:** MonitorPanel events are **local to the financial page only**. They are not shared across modules and do not persist across navigation.

#### Known Limitations

| Limitation | Description |
|---|---|
| Local-only monitor events | Events logged in MonitorPanel are not accessible from any other module |
| Hardcoded entity IDs | `PARKING_ID`, `VEHICLE_ID`, and `DRIVER_ACCOUNT_ID` are hardcoded in `api.ts` |
| No replay | Executed scenarios cannot be replayed without manually resetting backend state |

---

### 3b. Gate Module (`gate`)

**PRD Reference:** `PRD_GATE_V2.md`

#### Purpose

The Gate module simulates the physical gate lifecycle of a parking session: vehicle entry, session management, and exit with fare calculation. It provides animated visualizations of car movement and real-time session state tracking.

#### Scenarios

The Gate module implements **9 scenarios**:

| # | Scenario | Description |
|---|---|---|
| 1 | Entry — Valid Plate | Vehicle with a registered plate enters successfully |
| 2 | Entry — Invalid Plate | Unrecognized plate rejected at entry gate |
| 3 | Exit — Sufficient Balance | Vehicle exits, wallet deducted successfully |
| 4 | Exit — Insufficient Balance | Vehicle exits, wallet balance too low to cover fare |
| 5 | Orphan Session | Session exists with no matching active vehicle (192 MAD fare) |
| 6 | Cash Payment | Driver pays fare in cash at exit (50 MAD fare) |
| 7 | QR Code Entry | Vehicle enters via QR code scan |
| 8 | QR Code Exit | Vehicle exits via QR code scan |
| 9 | Session State Inspection | Inspector views current session state without triggering entry/exit |

#### Canvas Behavior

- **Car animations** render on the canvas to represent vehicle approach, gate open/close, and departure
- **Session state tracking** shows the current session lifecycle stage
- **Fare display** renders the computed fare amount on the canvas at exit

#### Known Limitations

| Limitation | Description |
|---|---|
| Hardcoded fares | Orphan session fare is hardcoded at 192 MAD; cash payment fare is hardcoded at 50 MAD |
| No Pricing integration | Fares are not derived from `computeFare()` in the Pricing module |
| Simulated execution | Gate API calls are simulated, not real backend invocations |

---

### 3c. Auth Module (`auth`)

**PRD Reference:** `AUTH_NOSCERA.md`

#### Purpose

The Auth module implements and visualizes the full OtoParking authentication flow using the Noscera auth provider. It issues **real tokens** via **real API calls** — the tokens displayed in the UI are valid, live access and refresh tokens.

#### Roles

The Auth module tests authentication for all **3 platform roles**:

| Role | Description |
|---|---|
| `driver` | End-user driver account |
| `tenant_admin` | Parking lot operator account |
| `super_admin` | Platform administrator account |

#### OTP Flow

The authentication flow is a multi-step OTP sequence:

1. Phone number or email submission
2. OTP code dispatch via Noscera
3. OTP code entry and verification
4. Token issuance — access token + refresh token displayed

Each step renders as an animated transition on the canvas.

#### History Cards

Authentication attempt history is displayed as cards below the active flow. History cards are rendered at:

- **Full opacity** — never dimmed
- **Full size** — never shrunk or collapsed
- **Scrollable** — the history list scrolls independently

This is a deliberate design requirement. History cards must never use reduced opacity or scale transforms to indicate "past" state.

#### Known Limitations

| Limitation | Description |
|---|---|
| No cross-module propagation | Tokens issued by the Auth module are not accessible in any other module (e.g., API Tester does not auto-populate with issued tokens) |

---

### 3d. Notifications Module (`notifications`)

**PRD Reference:** `NOTIFICATIONS.md`

#### Purpose

The Notifications module tests the OtoParking notification delivery system powered by **PushCaster**. It simulates sending notifications across all supported channels and visualizes per-channel delivery status with staggered animations.

#### Workflows

The Notifications module implements **15 PushCaster workflows** covering:

- Driver arrival confirmation
- Session start notification
- Session end + fare summary
- Insufficient balance alert
- Top-up confirmation
- Cancellation confirmation
- Payout notification
- Marketing messages
- System alerts
- OTP delivery
- QR code delivery
- Booking confirmation
- Booking reminder
- Refund confirmation
- Account verification

#### Channels

| Channel | Type |
|---|---|
| Push | Mobile push notification |
| Email | SMTP-based email delivery |
| SMS | SMS via Noscera |
| WhatsApp | WhatsApp message via provider |

Each workflow triggers a **staggered send animation** per channel — channels animate in sequence rather than simultaneously.

#### Known Limitations

| Limitation | Description |
|---|---|
| No cross-module triggering | Notifications are never automatically triggered by other modules. Gate exit, Auth OTP verification, and financial events do not fire notifications into this module. |

---

### 3e. Admin RBAC Module (`admin`)

**PRD Reference:** `PRD_ADMIN.md`

#### Purpose

The Admin module visualizes the OtoParking role-based access control system. It allows testers to simulate different administrative roles and inspect what permissions each role grants across the platform.

#### Roles

| Role | Description |
|---|---|
| `super_admin` | Full platform access; can manage tenants, drivers, and system config |
| `tenant_admin` | Scoped to their parking lot; can manage sessions, staff, and pricing |
| `manager` | Operational access; can view reports and manage daily operations |

#### Module Permission Matrix

The canvas renders a **permission matrix** showing which actions each role can perform across each module. The matrix is presented as a table or grid with role columns and module/action rows, with visual indicators (check/cross) per cell.

#### Known Limitations

| Limitation | Description |
|---|---|
| No shell nav propagation | RBAC does not affect the Test Center shell navigation. All 10 modules are always accessible in the left nav regardless of which role is active in this module. |

---

### 3f. Pricing Module (`pricing`)

**PRD Reference:** `PRICING_ARCHITECTURE.md`

#### Purpose

The Pricing module tests and visualizes the `computeFare()` function — the core pricing engine that determines parking fees based on stay duration, vehicle type, time brackets, and pricing tiers.

#### `computeFare()` Logic

The implementation covers the full pricing algorithm:

1. **Grace check** — if stay duration is within the grace period, fare is 0
2. **Ceiling hours** — duration is capped at the maximum billable hours per day
3. **Narrow bracket evaluation** — applies fine-grained time-based pricing tiers
4. **Wide bracket evaluation** — applies coarser daily/weekly pricing tiers
5. **Final fare composition** — sums bracket charges with applicable fees

#### Test Runner

The Pricing module includes a **pass/fail test runner** that executes a predefined suite of test cases against `computeFare()` and reports:

- Input parameters (entry time, exit time, vehicle type, pricing config)
- Expected output
- Actual output
- Pass/fail status per test case

#### Known Limitations

| Limitation | Description |
|---|---|
| Cross-midnight bug | Stays that span midnight produce a negative duration. The duration calculation does not account for day rollover. |
| vehicleType ignored | The `vehicleType` parameter is accepted but not used in the fare computation logic |

---

### 3g. Cancellation Module (`cancellation`)

**PRD Reference:** `CANCELLATION_POLICY.md`

#### Purpose

The Cancellation module tests the `computeCancellation()` function, which determines the financial outcome of a booking cancellation based on timing, policy tier, and amount.

#### Cancellation Tiers

| Tier | Description |
|---|---|
| `FULL` | Full refund to the driver |
| `PARTIAL` | Partial refund with platform fee retained |
| `NONE` | No refund — cancellation fee applies |
| `CANNOT_CANCEL` | Cancellation is not permitted at this stage |

#### Financial Split Visualization

The canvas renders a **financial split diagram** showing how the cancellation amount is distributed:

- **Platform fee** — amount retained by OtoParking
- **Driver compensation** — amount refunded to the driver
- **Tenant refund** — amount returned to the tenant

Each segment is rendered proportionally with labeled values.

#### Known Limitations

| Limitation | Description |
|---|---|
| No feedback into Finance | Cancellation results are not fed into the Finance module — no actual refund execution occurs |
| No feedback into Settlement | Cancellation records are not fed into the Settlement module |

---

### 3h. Settlement Module (`settlement`)

**PRD Reference:** `FINANCIAL_MODULE_PRD.md`

#### Purpose

The Settlement module tests the `computeSettlement()` function, which calculates end-of-period financial settlements between OtoParking and its tenants, accounting for digital payments, cash sessions, and carry-forward balances.

#### `computeSettlement()` Logic

The settlement computation covers:

1. **Digital payout** — sum of all digital payments for the period
2. **Cash netting** — cash sessions are netted against platform fees owed
3. **Carry-forward logic** — unpaid balances carry forward to the next settlement period
4. **Final payout** — net amount owed to the tenant or owed to the platform

#### Visualization

The canvas renders a **period-based settlement visualization** showing:

- Input: session records for the period
- Processing: digital vs. cash breakdown
- Output: payout amount, carry-forward balance, settlement status

#### Known Limitations

| Limitation | Description |
|---|---|
| Hardcoded sample data | The module uses hardcoded sample session data; it does not pull real settlement records from the backend |

---

### 3i. API Tester Module (`api`)

**PRD Reference:** `PRD_INTEGRATION.md`

#### Purpose

The API Tester module provides a full catalog of OtoParking REST API endpoints and allows testers to construct, send, and inspect HTTP requests directly from the browser. It is the closest equivalent to Postman within the Test Center.

#### Endpoint Catalog

The catalog covers **10 modules** and **40+ endpoints**:

| Module | Endpoint Count (approx.) |
|---|---|
| Auth | 4 |
| Driver | 5 |
| Vehicle | 4 |
| Parking | 6 |
| Session | 5 |
| Gate | 4 |
| Finance / Wallet | 6 |
| Notifications | 4 |
| Admin | 5 |
| Settlement | 3 |

#### Network Flow Diagram

The canvas renders a **network flow diagram** showing the request path:

```
CLIENT → API GATEWAY → LAMBDA
```

Each hop is labeled with the relevant service name, method, and status when a request is in flight.

#### Request / Response Viewer

- JSON request body is editable in a syntax-highlighted editor pane
- JSON response is rendered in the right panel with status code, latency, and headers

#### Known Limitations

| Limitation | Description |
|---|---|
| No request history | Past requests are not stored or accessible after navigation |
| No environment variables | Base URLs, auth tokens, and IDs cannot be parameterized via environment fields |
| No diff/compare | Responses cannot be compared against previous runs or expected outputs |

#### Technical Note

The `mc.text` color key was renamed to `mc.textDark` / `mc.textLight` in `ApiTesterCanvas.tsx`. Any reference to `mc.text` in this file will cause a runtime error.

---

### 3j. Infra Module (`infra`)

**PRD Reference:** `PRD_LAMBDA_MIGRATION.md`

#### Purpose

The Infra module provides a static visualization of the OtoParking cloud infrastructure. It maps the Lambda function architecture, AWS SAM configuration, and external service dependencies to give developers a single-pane-of-glass view of the platform's infrastructure topology.

#### Lambda Architecture Map

The canvas renders a directed graph of:

- Lambda function names and their triggers (API Gateway routes, S3 events, scheduled events)
- Function groupings by domain (auth, finance, gate, notifications, etc.)
- Invocation relationships between functions

#### SAM / AWS Visualization

The module renders a simplified view of the AWS SAM template structure, showing:

- Stack name and deployment region
- Resource types (Lambda, API Gateway, DynamoDB, S3, SQS, etc.)
- Environment configuration per function

#### External Service Dependency Graph

A separate dependency graph shows all external third-party services consumed by the platform:

| Service | Role |
|---|---|
| Noscera | OTP and SMS delivery, authentication provider |
| PushCaster | Push notification delivery |
| Stripe | Payment processing |
| S3 | Document and asset storage |
| Other AWS services | SQS, DynamoDB, CloudWatch, etc. |

#### Known Limitations

| Limitation | Description |
|---|---|
| Static only | The visualization is entirely static. No live Lambda invocation data, no CloudWatch metrics, no real-time health indicators. |

---

## 4. Shared Infrastructure

The following components are shared across the shell and are not specific to any single module.

---

### `ModuleSidebar.tsx`

**Location:** `src/components/shell/ModuleSidebar.tsx`

The primary navigation component. Renders as a fixed 60px-wide vertical strip on the left edge of the viewport.

**Contains:**
- OtoParking logo at the top
- One icon button per module (10 total), using `lucide-react` icons
- Active module highlighted with theme-appropriate styling
- Navigation uses Next.js `Link` for client-side routing

---

### `ModuleHeader.tsx`

**Location:** `src/components/shell/ModuleHeader.tsx`

The top header bar (52px tall) that identifies the currently active module.

**Contains:**
- Active module name and description
- Activity badge — animated indicator when a scenario is running
- Live session clock — counts elapsed time since page load

---

### `StatusBar.tsx`

**Location:** `src/components/shell/StatusBar.tsx`

A fixed bottom status bar showing global application state.

**Contains:**
- Backend connection status
- Current theme indicator
- Optional module-specific status messages

---

### `ThemeToggle.tsx`

**Location:** `src/components/shell/ThemeToggle.tsx`

A toggle button that switches between `DARK` and `LIGHT` themes.

**Behavior:**
- Renders a Sun icon in dark mode, Moon icon in light mode (`lucide-react`)
- On toggle, updates theme state via `useTheme()` hook
- Persists selection to `localStorage` under a consistent key
- Does not cause hydration errors because initial state is always `DARK`

---

### `SettingsPanel.tsx`

**Location:** `src/components/shell/SettingsPanel.tsx`

A settings overlay panel.

**Behavior:**
- Settings are persisted to `localStorage`
- Currently, settings **only affect the Financial module** — no other module reads from the settings store
- Intended future use: expose `DRIVER_ID`, `VEHICLE_ID`, `PARKING_ID`, and credentials as editable fields

---

### `MonitorPanel.tsx`

**Location:** `src/app/modules/financial/components/MonitorPanel.tsx`

A structured event log for the Financial module. Not a shared shell component.

**Behavior:**
- Logs every API call, state transition, and error during financial scenario execution
- Embeds inline `WalletTransferCard` components for transfer events
- Events are local to the financial page — navigating away clears the log
- Log is not exported or persisted (export is a Tier 1 roadmap item)

---

### `ScenarioPanel.tsx`

**Location:** `src/app/modules/financial/components/ScenarioPanel.tsx`

The scenario control panel for the Financial module. Not a shared shell component.

**Contains:**
- Scenario selector dropdown
- Workflow selector (filtered by selected scenario)
- Action buttons for executing, resetting, and inspecting scenarios
- Execution state indicator

---

### `MetricsBar.tsx`

**Location:** `src/app/modules/financial/components/MetricsBar.tsx`

A fixed metrics bar displayed above or below the canvas in the Financial module.

**Contains four live metrics:**
1. Driver wallet balance
2. Tenant wallet balance
3. Platform wallet balance
4. Pending settlement amount

Metrics refresh every 10 seconds via the polling interval shared with the main wallet data fetch.

---

## 5. Backend Integration Layer

### `api.ts`

**Location:** `src/lib/api.ts`

This file contains all backend API call implementations. It is the single source of truth for how the Test Center communicates with the OtoParking backend.

**Responsibilities:**
- Constructs and sends HTTP requests via the Next.js proxy (`/api/backend`, `/api/admin`)
- Caches authentication tokens per role to avoid redundant login calls
- Exports typed response interfaces for all API endpoints

### `auth-service.ts`

**Location:** `src/lib/auth-service.ts`

Handles the authentication lifecycle for all three platform roles. Used by `api.ts` to obtain and refresh tokens before making authenticated requests.

### Hardcoded Test Credentials

The following credentials are hardcoded in `api.ts`. They are flagged for externalization in the Tier 1 upgrade roadmap.

```typescript
// Driver
email: "akarog20230@gmail.com"
password: "password123"

// Tenant Admin
email: "test-tenant@otoparking.com"
password: "Test-Tenant2026"

// Super Admin
email: "admin@otoparking.com"
password: "Admin@12345"
```

> **Security Notice:** These credentials are for a local development environment only. They must not be committed to any shared repository branch or deployed to any environment beyond a developer's local machine.

### Hardcoded Entity Constants

The following constants are hardcoded in `api.ts`:

```typescript
const PARKING_ID = 61;
const VEHICLE_ID = 159;
const DRIVER_ACCOUNT_ID = "6a33014db68486ccc9606985";
```

These values correspond to specific test entities in the local development database. They are flagged for externalization in the Tier 1 upgrade roadmap.

### Token TTL Inconsistency

There is a known inconsistency in token time-to-live configuration:

| Role | TTL Value | Effective Duration |
|---|---|---|
| `driver` | 86,400,000 ms | 24 hours |
| `tenant_admin` | 890,000 ms | ~15 minutes |
| `super_admin` | 890,000 ms | ~15 minutes |

This inconsistency means tenant and admin tokens expire roughly 96x faster than driver tokens, causing unexpected re-authentication behavior during longer testing sessions. This is flagged as a Tier 1 fix.

---

## 6. Data Flow

### Within Modules

Each module manages its own state using local React state (`useState`, `useReducer`, `useRef`). There is no Redux, Zustand, Jotai, or any global state management library in use.

### Across Modules

**There is currently no cross-module data sharing.** All 10 modules are fully isolated. Navigating between modules does not carry any state, tokens, session IDs, or event data from one module to another.

This is the most significant architectural gap in the current implementation and is the subject of multiple Tier 2 roadmap items.

### Backend → UI Data Flow

| Module | Pattern | Details |
|---|---|---|
| Finance | Polling | Wallet data fetched every 10 seconds |
| API Tester | On-demand fetch | Request sent only when user clicks "Send" |
| Gate | Real-time simulation | Animated state machine, simulated timing |
| Auth | Real-time | Step-by-step animation tied to real API call responses |
| Notifications | Real-time simulation | Staggered channel animation on send |
| All others | On-demand | Data fetched when scenario is triggered |

### UI → Backend Data Flow

| Module | Backend Interaction |
|---|---|
| Finance | Real API calls — real backend state changes |
| Auth | Real API calls — real token issuance |
| API Tester | Real API calls — real backend state changes |
| Gate | Simulated — no real backend calls |
| Notifications | Simulated — no real backend calls |
| Pricing | Local computation only — no backend calls |
| Cancellation | Local computation only — no backend calls |
| Settlement | Local computation only — no backend calls |
| Admin | Simulated — no real backend calls |
| Infra | Static visualization — no backend calls |

---

## 7. Upgrade Roadmap

The following roadmap items are organized into three tiers based on implementation impact and estimated effort.

---

### Tier 1 — High Impact, Low Effort

These items can be implemented quickly and provide immediate, high-value improvements to developer experience and correctness.

---

#### 1. Externalize Hardcoded Test Credentials and IDs

**Problem:** Test credentials (`email`, `password`) and entity IDs (`PARKING_ID`, `VEHICLE_ID`, `DRIVER_ACCOUNT_ID`) are hardcoded in `api.ts`. This makes the tool brittle when test entities change and creates a security risk if the file is shared.

**Solution:**
- Move all credentials and IDs to `.env.local`
- Expose them as editable fields in `SettingsPanel.tsx`
- Read from environment variables at startup, with Settings override

**Files affected:** `src/lib/api.ts`, `src/components/shell/SettingsPanel.tsx`, `.env.local` (new)

---

#### 2. Add Log Export to MonitorPanel

**Problem:** Financial scenario events logged in `MonitorPanel` cannot be exported. Developers must manually screenshot or copy the log, which is slow and lossy.

**Solution:**
- Add a "Download Log" button to `MonitorPanel`
- On click, serialize all log entries to a JSON array and trigger a browser file download
- Include timestamp, event type, payload, and status in each exported entry

**Files affected:** `src/app/modules/financial/components/MonitorPanel.tsx`

---

#### 3. Fix Token TTL Inconsistency

**Problem:** Driver tokens have a TTL of 86,400,000ms (24h) while tenant and admin tokens have a TTL of 890,000ms (~15 minutes). This causes unexpected re-authentication for tenant/admin roles during longer testing sessions.

**Solution:**
- Audit the intended TTL for each role against the backend's token issuance configuration
- Standardize TTL values in `api.ts` to match backend behavior
- Document the correct TTL per role

**Files affected:** `src/lib/api.ts`

---

#### 4. Add Scenario Running Guard

**Problem:** A user can click a scenario execution button while a scenario is already running, which can cause duplicate API calls and corrupted state.

**Solution:**
- Track an `isRunning` boolean in `ScenarioPanel` state
- Disable all execution buttons and scenario/workflow selectors while `isRunning` is true
- Display a visual indicator (spinner, badge) to communicate that execution is in progress

**Files affected:** `src/app/modules/financial/components/ScenarioPanel.tsx`

---

#### 5. Fix Pricing Cross-Midnight Duration Bug

**Problem:** If a parking session spans midnight (e.g., entry at 23:00, exit at 01:00), the duration calculation produces a negative number because exit timestamp < entry timestamp in naive subtraction.

**Solution:**
- Add a midnight-crossing check in `computeFare()`
- If `exitTime < entryTime`, add 24 hours (86,400 seconds) to the duration

**Files affected:** Pricing module computation logic

---

### Tier 2 — High Impact, Medium Effort

These items require more design and implementation work but address fundamental architectural gaps.

---

#### 6. Cross-Module Event Bus

**Problem:** All 10 modules are fully isolated. Events generated in Gate, Auth, Finance, and other modules cannot be observed from a central location.

**Solution:**
- Implement a lightweight shared event emitter (e.g., a React context with an event queue, or a module-level EventEmitter)
- Allow any module to publish events to the bus
- `MonitorPanel` subscribes to the bus and renders events from all modules

**Files affected:** New `src/lib/event-bus.ts`, all module pages, `MonitorPanel.tsx`

---

#### 7. Settings Propagation to All Modules

**Problem:** `SettingsPanel` settings (driver ID, vehicle ID, parking ID) currently only affect the Financial module. All other modules use hardcoded values from `api.ts`.

**Solution:**
- Expose settings values via React context at the shell level
- All modules read entity IDs from settings context instead of hardcoded constants
- `SettingsPanel` becomes the authoritative source for all test entity configuration

**Files affected:** `src/components/shell/SettingsPanel.tsx`, all module pages, `src/lib/api.ts`

---

#### 8. Gate Fare Derivation from Pricing Module

**Problem:** Gate module fares are hardcoded (192 MAD for orphan sessions, 50 MAD for cash payment). These values are not derived from the Pricing module's `computeFare()` function.

**Solution:**
- Import and call `computeFare()` from the Pricing module within the Gate module's exit flow
- Pass session duration, vehicle type, and parking lot pricing config to compute the fare dynamically
- Display the computed fare breakdown on the canvas alongside the total

**Files affected:** `src/app/modules/gate/page.tsx`, Pricing module computation logic

---

#### 9. Notifications Triggered by Module Events

**Problem:** The Notifications module is never triggered by other modules. In production, Gate exits, Auth OTP verifications, and financial events all trigger notifications.

**Solution:**
- After cross-module event bus (item 6) is implemented, subscribe Notifications module to relevant events
- Gate exit event → send session-end notification
- Auth OTP verification → send confirmation email/SMS
- Finance top-up → send top-up confirmation
- Define an event-to-workflow mapping in Notifications module config

**Files affected:** `src/app/modules/notifications/page.tsx`, event bus integration

---

#### 10. Admin RBAC Propagation to Shell Nav

**Problem:** The shell navigation always shows all 10 modules regardless of which role is active in the Admin module. In a real application, role permissions would restrict which modules are accessible.

**Solution:**
- Read the active role from Admin module state (or a shared context once item 7 is complete)
- Filter the module list in `ModuleSidebar` based on the active role's permissions
- Show a lock icon or greyed state for inaccessible modules rather than hiding them (to preserve discoverability)

**Files affected:** `src/components/shell/ModuleSidebar.tsx`, Admin module state

---

### Tier 3 — Strategic, Higher Effort

These items require significant design, implementation, or external integration work.

---

#### 11. Keyboard Shortcuts

**Problem:** Power users executing repeated test scenarios have no keyboard access — every interaction requires mouse navigation.

**Solution:**
- Define a shortcut map (e.g., `Cmd+Enter` = run scenario, `Cmd+R` = reset, `Cmd+[1-0]` = navigate to module)
- Implement via a global `keydown` listener in the shell layout
- Display shortcut hints in `ModuleHeader` and `ScenarioPanel`

**Files affected:** Shell layout, `ModuleHeader.tsx`, `ScenarioPanel.tsx`

---

#### 12. Request History in API Tester

**Problem:** The API Tester has no request history. Each navigation away from the module loses all previous request/response data.

**Solution:**
- Store the last N requests (recommended: 50) in a session-scoped store (React context or `sessionStorage`)
- Render a history sidebar within the API Tester module
- Each history entry shows timestamp, method, endpoint, status code, and latency
- Allow the user to re-load a past request into the editor and view its response

**Files affected:** `src/app/modules/api/page.tsx`, new history store

---

#### 13. Live Lambda Invocation Data in Infra Module

**Problem:** The Infra module is entirely static. It shows architecture diagrams but no live data about Lambda health, invocation counts, error rates, or latency.

**Solution:**
- Integrate AWS CloudWatch API (via a backend proxy) to fetch Lambda metrics
- Overlay live metrics (invocation count, error rate, P99 latency) on the Lambda architecture map
- Add a refresh interval control

**Files affected:** `src/app/modules/infra/page.tsx`, new backend proxy endpoint for CloudWatch

---

#### 14. Cancellation Results Fed into Finance and Settlement

**Problem:** The Cancellation module computes refund amounts and financial splits but does not execute them. In production, a cancellation would trigger a refund in Finance and a record in Settlement.

**Solution:**
- Add an "Execute Refund" action button to the Cancellation module result view
- On click, call the Finance module's refund API endpoint with the computed amounts
- Emit a cancellation event to the Settlement module's period record

**Files affected:** `src/app/modules/cancellation/page.tsx`, `src/lib/api.ts`

---

#### 15. Fix `getWorkflowScenarios()` Non-Null Assertion

**Problem:** `getWorkflowScenarios()` uses a non-null assertion (`!`) when looking up workflow data. If the workflow key does not exist in the map, this causes an unhandled runtime crash with no user-facing error message.

**Solution:**
- Replace the non-null assertion with a safe lookup using optional chaining
- Add a runtime error boundary around `ScenarioPanel` that catches lookup failures
- Display a descriptive error message (e.g., "Workflow not found: [key]") instead of crashing the page

**Files affected:** Scenario/workflow data lookup utility, `ScenarioPanel.tsx`

---

## 8. Cross-Module Opportunity Map

The following table documents what each module currently produces and what other modules could consume from it if cross-module integration were implemented.

| Producer | Produces | Could Feed |
|---|---|---|
| Auth | Access token, refresh token, user role | API Tester (auto-populate auth header), Finance (authenticated calls), Admin (role propagation to shell nav) |
| Gate | Session ID, fare amount, entry/exit events | Finance (payment trigger on exit), Notifications (session-end alert), Settlement (session record for period) |
| Pricing | Computed fare, fare breakdown by bracket | Gate (replace hardcoded fares with dynamic computation), Settlement (fare record with full breakdown) |
| Cancellation | Refund amount, financial split (platform/driver/tenant) | Finance (execute refund transaction), Notifications (send cancellation confirmation alert) |
| Finance | Wallet balances, ledger entries, transfer events | Settlement (period total aggregation), MonitorPanel (real-time event stream) |
| Settlement | Payout amount, carry-forward balance | Finance (disbursement trigger), Notifications (payout confirmation alert) |
| Admin | Active role, permission set | Shell nav (module visibility filtering), API Tester (inject auth header for active role), all modules (UI guard based on permissions) |
| Notifications | Delivery receipts, per-channel status | MonitorPanel (notification delivery events in event log) |
| API Tester | Raw HTTP request/response pairs | MonitorPanel (request log entries with method, status, latency) |
| Infra | (static visualization only) | Nothing currently; future: live CloudWatch data could feed a global health indicator |

### Integration Priority

Based on development impact, the highest-value cross-module integrations to implement first are:

1. **Auth → API Tester** — eliminates manual token copy-paste, which is the most frequent friction point for API testing
2. **Gate → Finance** — enables end-to-end session payment testing without manual Finance module interaction
3. **Pricing → Gate** — fixes the hardcoded fare issue and makes Gate tests reflect real pricing logic
4. **Finance → Settlement** — enables period reconciliation testing with real financial data

---

## 9. Technical Constraints

The following constraints are enforced across the entire Test Center codebase. Violating these constraints will cause runtime errors, hydration failures, or inconsistent rendering.

---

### Hydration Safety — `useTheme()`

**Constraint:** `useTheme()` must always initialize to `DARK`. The `readIsDark()` function must never be called inside a `useState` initializer.

**Reason:** Next.js server-side rendering produces HTML with the initial state. If the initial state reads from `localStorage` (which is not available on the server), the server-rendered HTML will differ from the client-rendered HTML, causing a React hydration error.

**Correct pattern:**
```typescript
const [isDark, setIsDark] = useState(true); // always true (DARK) on init
useEffect(() => {
  const stored = readIsDark();
  setIsDark(stored);
}, []);
```

**Incorrect pattern:**
```typescript
const [isDark, setIsDark] = useState(readIsDark()); // NEVER do this
```

---

### Inline Styles vs. Tailwind CSS

**Constraint:** All visual styling must use inline styles. Tailwind CSS is permitted only for layout structure.

| Use Case | Correct Approach |
|---|---|
| Background color | `style={{ backgroundColor: mc.bg }}` |
| Text color | `style={{ color: mc.text }}` |
| Border color | `style={{ border: '1px solid ' + mc.border }}` |
| Border radius | `style={{ borderRadius: 8 }}` |
| Flexbox container | `className="flex items-center gap-2"` (Tailwind OK) |
| Grid layout | `className="grid grid-cols-2"` (Tailwind OK) |
| Overflow | `className="overflow-auto"` (Tailwind OK) |

---

### No Emojis

**Constraint:** No emoji characters may appear anywhere in the UI — not in rendered text, button labels, log entries, or status messages.

**Correct approach:** Use `lucide-react` icon components for all iconography.

---

### `buildEdges()` in `FlowCanvas.tsx`

**Constraint:** `buildEdges()` is defined at module level (outside any React component), so it cannot call `useTheme()`. The `markerEnd.color` property for ReactFlow edges is hardcoded.

**Reason:** React hooks can only be called inside function components or custom hooks. A module-level function is neither.

**Implication:** Edge arrow colors do not respond to theme changes. If theme-aware edge colors are needed in the future, `buildEdges` must be converted to a hook or called from inside a component with the theme value passed as a parameter.

---

### ReactFlow Node Data Type

**Constraint:** ReactFlow node `data` properties must use `as Record<string, unknown>` cast.

**Correct pattern:**
```typescript
const node = {
  id: "wallet-driver",
  data: { label: "Driver Wallet", balance: 100 } as Record<string, unknown>,
};
```

**Do not use:**
```typescript
// 'satisfies' does not work with ReactFlow's node type system in this codebase
data: { label: "Driver Wallet" } satisfies Record<string, unknown>
```

---

### `mc.text` Renamed in `ApiTesterCanvas.tsx`

**Constraint:** The `mc.text` color key was renamed to `mc.textDark` and `mc.textLight` in `ApiTesterCanvas.tsx`. Any reference to `mc.text` in this file will cause a runtime error.

**Correct usage in `ApiTesterCanvas.tsx`:**
```typescript
style={{ color: isDark ? mc.textDark : mc.textLight }}
```

---

## 10. Environment & Deployment

### Development Setup

The Test Center is a local development tool. There is no staging, preview, or production deployment.

**Start the dev server:**
```bash
npm run dev
```

The application is served at `http://localhost:3000`.

### Backend Requirements

The Test Center requires two backend services to be running locally:

| Service | Port | Proxy Path |
|---|---|---|
| Main backend (Spring Boot / Node) | `:8080` | `/api/backend` |
| Admin backend | `:8082` | `/api/admin` |

If either backend is not running, API calls from Finance, Auth, and API Tester modules will fail. Other modules (Gate, Pricing, Cancellation, Settlement, Infra) do not require backend connectivity for their primary functionality.

### Proxy Configuration

The Next.js proxy rewrites are defined in `next.config.ts`:

```typescript
// next.config.ts (abbreviated)
module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:8080/:path*",
      },
      {
        source: "/api/admin/:path*",
        destination: "http://localhost:8082/:path*",
      },
    ];
  },
};
```

### Environment Variables

**Currently, the Test Center uses no environment variables.** All configuration values — including credentials, entity IDs, and backend URLs — are hardcoded in `src/lib/api.ts`.

This is flagged as a critical remediation item in the Tier 1 upgrade roadmap. The intended end state is:

```bash
# .env.local (target state — not yet implemented)
DRIVER_EMAIL=akarog20230@gmail.com
DRIVER_PASSWORD=password123
TENANT_EMAIL=test-tenant@otoparking.com
TENANT_PASSWORD=Test-Tenant2026
ADMIN_EMAIL=admin@otoparking.com
ADMIN_PASSWORD=Admin@12345
PARKING_ID=61
VEHICLE_ID=159
DRIVER_ACCOUNT_ID=6a33014db68486ccc9606985
BACKEND_URL=http://localhost:8080
ADMIN_URL=http://localhost:8082
```

### CI/CD

There is no CI/CD pipeline defined for the Test Center. It is an internal developer tool with no automated build, test, or deployment process.

### Build

To produce a production build (not normally needed for a dev tool):

```bash
npm run build
```

Note that a production build may fail or behave incorrectly if environment variables are not present, since credentials and IDs are currently hardcoded. This is another motivation for the Tier 1 externalization work.

---

## Appendix A — File Structure Reference

```
src/
  app/
    modules/
      financial/
        page.tsx
        components/
          FlowCanvas.tsx
          LedgerPanel.tsx
          MonitorPanel.tsx
          ScenarioPanel.tsx
          MetricsBar.tsx
          WalletTransferCard.tsx
      gate/
        page.tsx
      auth/
        page.tsx
      notifications/
        page.tsx
      admin/
        page.tsx
      pricing/
        page.tsx
      cancellation/
        page.tsx
      settlement/
        page.tsx
      api/
        page.tsx
        components/
          ApiTesterCanvas.tsx
      infra/
        page.tsx
  components/
    shell/
      ModuleSidebar.tsx
      ModuleHeader.tsx
      StatusBar.tsx
      ThemeToggle.tsx
      SettingsPanel.tsx
  lib/
    api.ts
    auth-service.ts
next.config.ts
```

---

## Appendix B — Module Summary Table

| Module | Slug | Real API Calls | Animations | PRD Reference |
|---|---|---|---|---|
| Finance | `financial` | Yes | Yes (ReactFlow) | `PRD_FINANCIAL_ARCHITECTURE.md` |
| Gate | `gate` | No (simulated) | Yes (car animation) | `PRD_GATE_V2.md` |
| Auth | `auth` | Yes | Yes (step animation) | `AUTH_NOSCERA.md` |
| Notifications | `notifications` | No (simulated) | Yes (staggered channels) | `NOTIFICATIONS.md` |
| Admin RBAC | `admin` | No (simulated) | No | `PRD_ADMIN.md` |
| Pricing | `pricing` | No (local compute) | No | `PRICING_ARCHITECTURE.md` |
| Cancellation | `cancellation` | No (local compute) | No | `CANCELLATION_POLICY.md` |
| Settlement | `settlement` | No (local compute) | No | `FINANCIAL_MODULE_PRD.md` |
| API Tester | `api` | Yes | No | `PRD_INTEGRATION.md` |
| Infra | `infra` | No (static) | No | `PRD_LAMBDA_MIGRATION.md` |

---

## Appendix C — Known Issues Summary

| # | Module | Issue | Severity | Roadmap Tier |
|---|---|---|---|---|
| 1 | All | Hardcoded credentials in `api.ts` | High | Tier 1 |
| 2 | All | Hardcoded entity IDs in `api.ts` | Medium | Tier 1 |
| 3 | Finance | MonitorPanel events are local-only | Medium | Tier 2 |
| 4 | Finance | No scenario running guard | Medium | Tier 1 |
| 5 | Finance | ScenarioPanel `getWorkflowScenarios()` non-null assertion | High | Tier 3 |
| 6 | Gate | Fares hardcoded (192 MAD, 50 MAD) | Medium | Tier 2 |
| 7 | Auth | No cross-module token propagation | Medium | Tier 2 |
| 8 | Notifications | Never triggered by other modules | Low | Tier 2 |
| 9 | Admin | RBAC does not affect shell nav | Low | Tier 2 |
| 10 | Pricing | Cross-midnight duration produces negative value | High | Tier 1 |
| 11 | Pricing | `vehicleType` parameter ignored | Low | — |
| 12 | Cancellation | Results not fed into Finance/Settlement | Medium | Tier 3 |
| 13 | Settlement | Uses hardcoded sample data | Medium | — |
| 14 | API Tester | No request history | Low | Tier 3 |
| 15 | API Tester | No environment variable support | Medium | Tier 1 |
| 16 | Infra | Static only — no live data | Low | Tier 3 |
| 17 | All | Token TTL inconsistency (driver 24h vs tenant/admin 15min) | Medium | Tier 1 |
| 18 | `ApiTesterCanvas.tsx` | `mc.text` renamed to `mc.textDark`/`mc.textLight` | High | Fixed |

---

*End of Document*
