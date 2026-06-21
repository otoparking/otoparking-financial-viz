"use client";

import { useState } from "react";
import {
  ArrowRight,
  Database,
  Globe,
  Lock,
  Search,
  FilePlus,
  FileEdit,
  Trash2,
  RefreshCw,
  Zap,
  Shield,
  CircleDot,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────── */

type OpIcon = "select" | "insert" | "update" | "lock" | "delete" | "upsert";

interface TableOp {
  table: string;
  ops: OpIcon[];
  description: string;
}

interface ApiStep {
  method: string;
  path: string;
  port: string;
  description: string;
  tables: TableOp[];
}

interface ScenarioGroup {
  id: string;
  label: string;
  color: string;
  steps: ApiStep[];
}

/* ── Data ───────────────────────────────────────────────────────────── */

const SCENARIOS: ScenarioGroup[] = [
  {
    id: "auth",
    label: "Auth",
    color: "#6366F1",
    steps: [
      {
        method: "POST",
        path: "/api/auth/login",
        port: "8080",
        description: "Driver login → JWT",
        tables: [{ table: "oto_users", ops: ["select"], description: "Verify credentials, issue access + refresh token" }],
      },
      {
        method: "POST",
        path: "/api/admin/auth/login",
        port: "8082",
        description: "Admin/Tenant login → JWT",
        tables: [{ table: "admin_users", ops: ["select"], description: "Verify credentials, issue access + refresh token" }],
      },
    ],
  },
  {
    id: "poll",
    label: "Live Poll",
    color: "#0EA5E9",
    steps: [
      {
        method: "POST",
        path: "/api/wallet/info",
        port: "8080",
        description: "Driver wallet balance",
        tables: [{ table: "oto_wallets", ops: ["select"], description: "SELECT balance_available, wallet_number WHERE account_id=?" }],
      },
      {
        method: "GET",
        path: "/api/admin/tenant/financial/wallet",
        port: "8082",
        description: "Merchant wallet",
        tables: [{ table: "oto_wallets_merchant", ops: ["select"], description: "SUM balance_available per tenant's lots" }],
      },
      {
        method: "GET",
        path: "/api/admin/tenant/financial/dashboard",
        port: "8082",
        description: "Escrow + agents on shift",
        tables: [
          { table: "oto_escrow_records", ops: ["select"], description: "Total ESCROWED amount + count" },
          { table: "oto_agent_cash_tally", ops: ["select"], description: "Today's OPEN shifts + cash in agents' hands" },
        ],
      },
      {
        method: "GET",
        path: "/api/admin/tenant/financial/cash-ledger",
        port: "8082",
        description: "Cash tally + open debts",
        tables: [
          { table: "oto_cash_commission_tracker", ops: ["select"], description: "WHERE lot_id=61" },
          { table: "oto_session_debts", ops: ["select"], description: "OPEN debts for lot 61" },
        ],
      },
      {
        method: "GET",
        path: "/api/admin/financial/cash-tracker",
        port: "8082",
        description: "Cash commission tracker",
        tables: [{ table: "oto_cash_commission_tracker", ops: ["select"], description: "WHERE lot_id=61 AND billing_period=?" }],
      },
      {
        method: "GET",
        path: "/api/admin/agents/{id}",
        port: "8082",
        description: "Agent status + today stats",
        tables: [{ table: "oto_parking_guardian", ops: ["select"], description: "Profile, active lot, today cash/wallet sessions" }],
      },
    ],
  },
  {
    id: "topup",
    label: "Top-Up",
    color: "#22C55E",
    steps: [
      {
        method: "POST",
        path: "/api/admin/financial/adjust",
        port: "8082",
        description: "Credit driver wallet 20 MAD",
        tables: [
          { table: "oto_wallets", ops: ["lock", "update"], description: "🔒 FOR UPDATE → balance_available += 20" },
          { table: "oto_transactions", ops: ["insert"], description: "INSERT credit transaction record" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT double-entry ledger" },
        ],
      },
    ],
  },
  {
    id: "booking",
    label: "Booking",
    color: "#3B82F6",
    steps: [
      {
        method: "POST",
        path: "/api/pricing/preview",
        port: "8080",
        description: "Compute fare + find slot",
        tables: [
          { table: "parking_tariffs", ops: ["select"], description: "Tariff rate + grace period for lot" },
          { table: "oto_parking_floors_availability", ops: ["select"], description: "Find available slot" },
          { table: "oto_parking_booking_preview", ops: ["insert"], description: "INSERT preview record" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/confirm",
        port: "8080",
        description: "Confirm booking → debit + escrow",
        tables: [
          { table: "commission_rate", ops: ["select"], description: "Resolve lot-specific rate" },
          { table: "oto_wallets", ops: ["lock", "update"], description: "🔒 → balance_available -= 10 (DEBIT driver)" },
          { table: "oto_wallets_platform (COMMISSION)", ops: ["lock", "update"], description: "🔒 → balance_available += 1" },
          { table: "oto_wallets_platform (SETTLEMENT)", ops: ["lock", "update"], description: "🔒 → balance_blocked += 9 (ESCROW)" },
          { table: "oto_parking_booking", ops: ["insert"], description: "INSERT → CONFIRMED" },
          { table: "oto_booking_payment", ops: ["insert"], description: "INSERT (total=10, comm=1, net=9)" },
          { table: "oto_escrow_records", ops: ["insert"], description: "INSERT → ESCROWED (9 MAD)" },
          { table: "oto_wallet_transactions", ops: ["insert"], description: "INSERT ×3 (DEBIT + 2×CREDIT)" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT ×2 (commission + escrow)" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/list",
        port: "8080",
        description: "Resolve booking_id",
        tables: [{ table: "oto_parking_booking", ops: ["select"], description: "Find booking_id by reference" }],
      },
    ],
  },
  {
    id: "completed",
    label: "Completed",
    color: "#8B5CF6",
    steps: [
      {
        method: "POST",
        path: "/api/gate/sessions/start",
        port: "8080",
        description: "Gate entry (BOOKING_ACTIVATION)",
        tables: [
          { table: "oto_parking", ops: ["select"], description: "Lot details" },
          { table: "oto_vehicles", ops: ["select"], description: "Verify ownership" },
          { table: "oto_parking_booking", ops: ["update"], description: "UPDATE → ACTIVE" },
          { table: "gate_session (legacy)", ops: ["insert"], description: "INSERT session row" },
        ],
      },
      {
        method: "POST",
        path: "/api/gate/sessions/end",
        port: "8080",
        description: "Gate exit → escrow release",
        tables: [
          { table: "parking_tariffs", ops: ["select"], description: "Compute fare + grace period" },
          { table: "gate_session (legacy)", ops: ["lock", "update"], description: "🔒 → COMPLETED (PREPAID, fare=0)" },
          { table: "oto_parking_booking", ops: ["update"], description: "→ COMPLETED, escrow_released_at=NOW()" },
          { table: "oto_escrow_records", ops: ["lock", "update"], description: "🔒 → RELEASED" },
          { table: "oto_booking_payment", ops: ["lock", "update"], description: "🔒 → SETTLED" },
          { table: "oto_wallets_platform (SETTLEMENT)", ops: ["update"], description: "balance_blocked -= 9" },
          { table: "oto_wallets_merchant", ops: ["lock", "update"], description: "🔒 → balance_available += 9" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT ESCROW_RELEASE" },
          { table: "oto_wallet_transactions", ops: ["insert"], description: "INSERT" },
        ],
      },
    ],
  },
  {
    id: "gate-wallet",
    label: "Gate Wallet",
    color: "#14B8A6",
    steps: [
      {
        method: "POST",
        path: "/api/gate/sessions/start",
        port: "8080",
        description: "Walk-in entry",
        tables: [
          { table: "oto_parking", ops: ["select"], description: "Lot details" },
          { table: "oto_vehicles", ops: ["select"], description: "Verify ownership" },
          { table: "oto_parking_booking", ops: ["insert"], description: "INSERT GATE_ACCESS" },
          { table: "gate_session (legacy)", ops: ["insert"], description: "INSERT WALK_IN session" },
        ],
      },
      {
        method: "POST",
        path: "/api/gate/sessions/end",
        port: "8080",
        description: "Wallet payment at exit",
        tables: [
          { table: "parking_tariffs", ops: ["select"], description: "Compute fare" },
          { table: "oto_wallets", ops: ["lock", "update"], description: "🔒 → balance_available -= fare" },
          { table: "oto_wallets_platform (COMMISSION)", ops: ["lock", "update"], description: "🔒 → balance_available += 10%" },
          { table: "oto_wallets_merchant", ops: ["lock", "update"], description: "🔒 → balance_available += 90%" },
          { table: "oto_gate_sessions", ops: ["insert"], description: "INSERT → CLOSED_WALLET" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT ×2 (GATE_COMMISSION, GATE_PAYMENT)" },
          { table: "oto_wallet_transactions", ops: ["insert"], description: "INSERT ×2" },
        ],
      },
    ],
  },
  {
    id: "gate-cash",
    label: "Gate Cash",
    color: "#F59E0B",
    steps: [
      {
        method: "POST",
        path: "/api/admin/financial/adjust",
        port: "8082",
        description: "Credit lot revenue (MERCHANT)",
        tables: [{ table: "oto_wallets_merchant", ops: ["lock", "update"], description: "🔒 → balance_available += fare" }],
      },
      {
        method: "POST",
        path: "/api/admin/test/cash-session",
        port: "8082",
        description: "Record cash session + commission",
        tables: [
          { table: "oto_gate_sessions", ops: ["insert"], description: "INSERT → COMPLETED CASH" },
          { table: "oto_cash_commission_tracker", ops: ["upsert"], description: "UPSERT commission_owed += 5" },
          { table: "oto_session_debts", ops: ["insert"], description: "INSERT OPEN debt" },
          { table: "oto_cash_session_commissions", ops: ["insert"], description: "INSERT immutable audit" },
        ],
      },
    ],
  },
  {
    id: "cancel",
    label: "Cancel",
    color: "#EF4444",
    steps: [
      {
        method: "POST",
        path: "/api/booking/cancel/preview",
        port: "8080",
        description: "Check cancellation eligibility",
        tables: [
          { table: "oto_parking_booking", ops: ["select"], description: "Check minutes until start" },
          { table: "oto_escrow_records", ops: ["select"], description: "Verify ESCROWED exists" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/cancel/confirm",
        port: "8080",
        description: "Execute cancellation + refund",
        tables: [
          { table: "oto_wallets", ops: ["lock", "update"], description: "🔒 → balance_available += refund" },
          { table: "oto_wallets_platform", ops: ["lock", "update"], description: "🔒 → reverse commission + escrow" },
          { table: "oto_escrow_records", ops: ["lock", "update"], description: "🔒 → REVERSED" },
          { table: "oto_parking_booking", ops: ["update"], description: "→ CANCELLED_*" },
          { table: "oto_parking_booking_cancellation", ops: ["insert"], description: "INSERT" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT reversal entries" },
        ],
      },
    ],
  },
  {
    id: "overstay",
    label: "Overstay",
    color: "#EC4899",
    steps: [
      {
        method: "POST",
        path: "/api/booking/extension/preview",
        port: "8080",
        description: "Compute extension cost",
        tables: [
          { table: "parking_tariffs", ops: ["select"], description: "Extension rate" },
          { table: "oto_parking_booking", ops: ["select"], description: "Current booking state" },
        ],
      },
      {
        method: "POST",
        path: "/api/booking/extension/confirm",
        port: "8080",
        description: "Charge extension → new escrow",
        tables: [
          { table: "oto_wallets", ops: ["lock", "update"], description: "🔒 → balance_available -= extension" },
          { table: "oto_wallets_platform", ops: ["update"], description: "Commission + escrow split" },
          { table: "oto_parking_booking", ops: ["update"], description: "has_extension=Y, extension_amount_total" },
          { table: "oto_parking_booking_extension_preview", ops: ["insert"], description: "INSERT" },
          { table: "oto_escrow_records", ops: ["insert"], description: "INSERT extension escrow" },
          { table: "oto_wallet_ledger", ops: ["insert"], description: "INSERT" },
        ],
      },
    ],
  },
  {
    id: "reset",
    label: "Hard Reset",
    color: "#78716C",
    steps: [
      {
        method: "POST",
        path: "/api/reset-test-data",
        port: "3002",
        description: "Zero all test data",
        tables: [
          { table: "oto_session_debts", ops: ["delete"], description: "DELETE" },
          { table: "oto_cash_commission_tracker", ops: ["delete"], description: "DELETE lot 61 rows" },
          { table: "oto_gate_agent_entry_request", ops: ["update"], description: "Close open requests" },
          { table: "oto_gate_sessions", ops: ["update"], description: "Close open sessions" },
          { table: "oto_escrow_records", ops: ["delete"], description: "DELETE" },
          { table: "oto_booking_payment", ops: ["delete"], description: "DELETE payment traces" },
          { table: "oto_parking_booking", ops: ["delete"], description: "DELETE + items + previews" },
          { table: "oto_wallets", ops: ["update"], description: "balance_available = 0 (driver)" },
          { table: "oto_wallets_merchant", ops: ["update"], description: "balance_available = 0" },
          { table: "oto_transactions", ops: ["delete"], description: "DELETE" },
          { table: "oto_wallet_ledger", ops: ["delete"], description: "DELETE entries" },
        ],
      },
    ],
  },
];

/* ── Op Icon ─────────────────────────────────────────────────────────── */

const OP_ICONS: Record<OpIcon, { Icon: React.ElementType; label: string; className: string }> = {
  select: { Icon: Search, label: "SELECT", className: "text-blue-400" },
  insert: { Icon: FilePlus, label: "INSERT", className: "text-emerald-400" },
  update: { Icon: FileEdit, label: "UPDATE", className: "text-amber-400" },
  lock: { Icon: Lock, label: "LOCK", className: "text-red-400" },
  delete: { Icon: Trash2, label: "DELETE", className: "text-rose-400" },
  upsert: { Icon: RefreshCw, label: "UPSERT", className: "text-purple-400" },
};

function OpBadge({ op }: { op: OpIcon }) {
  const { Icon, label, className } = OP_ICONS[op];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border ${className} border-current/20 bg-current/5`}
      title={label}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/* ── Scenario Card ──────────────────────────────────────────────────── */

function ScenarioCard({ scenario }: { scenario: ScenarioGroup }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: scenario.color }}
          />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {scenario.label}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {scenario.steps.length} endpoint{scenario.steps.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {scenario.steps.map((step, si) => (
            <div
              key={si}
              className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-b-0"
            >
              {/* API row */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50/50 dark:bg-zinc-800/30">
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: scenario.color + "18",
                    color: scenario.color,
                    border: `1px solid ${scenario.color}30`,
                  }}
                >
                  {step.method}
                </span>
                <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                  :{step.port}{step.path}
                </span>
                <span className="text-[10px] text-zinc-400 ml-auto italic">
                  {step.description}
                </span>
              </div>
              {/* Table rows */}
              <div className="px-3 py-1 space-y-0.5">
                {step.tables.map((t, ti) => (
                  <div
                    key={ti}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <Database className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 min-w-[160px]">
                      {t.table}
                    </span>
                    <div className="flex gap-1">
                      {t.ops.map((op) => (
                        <OpBadge key={op} op={op} />
                      ))}
                    </div>
                    <span className="text-zinc-400 ml-auto text-right max-w-[200px] truncate">
                      {t.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────── */

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {(Object.entries(OP_ICONS) as [OpIcon, typeof OP_ICONS[OpIcon]][]).map(([key, { Icon, label, className }]) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono font-semibold border ${className} border-current/20 bg-current/5`}
        >
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */

export default function ApiDbMap() {
  const [expandAll, setExpandAll] = useState(true);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            API → DB Map
          </span>
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-mono"
        >
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <Legend />

      <div className="space-y-1.5">
        {SCENARIOS.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>

      {/* Table count */}
      <div className="text-[10px] text-zinc-400 text-center font-mono pt-1">
        10 scenarios · {SCENARIOS.reduce((sum, s) => sum + s.steps.length, 0)} endpoints · 24 tables
      </div>
    </div>
  );
}
