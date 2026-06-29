"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchAgentCashSnapshot,
  fetchAgentStatus,
  type AgentCashSnapshot,
  type AgentStatusData,
  type CashTrackerRow,
  type AgentTallyDTO,
  type CashLedgerData,
} from "@/lib/admin-api";
import { setupAgentForShift, resetAgentShift } from "@/lib/agent-setup";
import {
  Users,
  Banknote,
  Receipt,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function MetricRow({
  label,
  value,
  unit = "MAD",
  highlight,
}: {
  label: string;
  value: number | string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          highlight
            ? "text-zinc-900 dark:text-zinc-100 font-semibold"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {typeof value === "number" ? value.toFixed(2) : value} {unit}
      </span>
    </div>
  );
}

/* ── Agent Status Card ──────────────────────────────────────────────── */

function AgentStatusCard({
  agent,
  tallyStatus,
}: {
  agent: AgentStatusData | null;
  tallyStatus?: string;
}) {
  if (!agent) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading agent data...
        </div>
      </div>
    );
  }

  const isActive = agent.status === "A";
  const hasActiveLot = agent.activeParkingId != null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {agent.firstName} {agent.lastName}
          </span>
        </div>
        <StatusBadge ok={isActive} label={isActive ? "Active" : "Inactive"} />
      </div>

      <div className="flex flex-wrap gap-1">
        {hasActiveLot ? (
          <StatusBadge
            ok={true}
            label={`Lot ${agent.activeParkingName ?? agent.activeParkingId}`}
          />
        ) : (
          <StatusBadge ok={false} label="No active lot" />
        )}
        {agent.todayCashSessions > 0 ||
        agent.todayWalletSessions > 0 ||
        tallyStatus === "OPEN" ||
        tallyStatus === "AWAITING_FLOAT" ? (
          <StatusBadge ok={true} label="Shift active" />
        ) : (
          <StatusBadge ok={false} label="Shift not started" />
        )}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
        <MetricRow
          label="Cash sessions today"
          value={agent.todayCashSessions}
          unit=""
        />
        <MetricRow
          label="Cash collected today"
          value={agent.todayCashCollected}
          highlight
        />
        <MetricRow
          label="Wallet sessions today"
          value={agent.todayWalletSessions}
          unit=""
        />
        <MetricRow
          label="Wallet fare today"
          value={agent.todayWalletCollected}
        />
      </div>
    </div>
  );
}

/* ── Cash Tally Card ────────────────────────────────────────────────── */

function CashTallyCard({ tally }: { tally: AgentTallyDTO | null }) {
  if (!tally) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Banknote className="h-4 w-4" />
          No cash tally data — agent shift may not be open
        </div>
      </div>
    );
  }

  const isReconciled = tally.status === "RECONCILED";
  const isOpen = tally.status === "OPEN" || tally.status === "AWAITING_FLOAT";
  const discrepancy =
    tally.discrepancyAmount != null && tally.discrepancyAmount !== 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Cash Tally
          </span>
        </div>
        <StatusBadge ok={isReconciled || isOpen} label={tally.status} />
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-0.5">
        <MetricRow label="Float issued" value={tally.floatAmount} />
        <MetricRow
          label="Cash collected"
          value={tally.totalCollected}
          highlight
        />
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">
            Expected ({tally.floatAmount} + {tally.totalCollected.toFixed(2)})
          </span>
          <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {(tally.floatAmount + tally.totalCollected).toFixed(2)} MAD
          </span>
        </div>
        <MetricRow label="Sessions" value={tally.sessionCount} unit="" />
        {tally.confirmedAmount != null && (
          <MetricRow
            label={discrepancy ? "Confirmed (MISMATCH!)" : "Confirmed"}
            value={tally.confirmedAmount}
            highlight={discrepancy}
          />
        )}
        {discrepancy && (
          <MetricRow
            label="Discrepancy"
            value={tally.discrepancyAmount!}
            highlight
          />
        )}
      </div>
    </div>
  );
}

/* ── Cash Tracker Card ──────────────────────────────────────────────── */

function CashTrackerCard({ tracker }: { tracker: CashTrackerRow | null }) {
  if (!tracker) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Receipt className="h-4 w-4" />
          No cash commission tracker data for this lot
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Cash Commission Tracker
          </span>
        </div>
        <span className="text-xs text-zinc-400 font-mono">
          {tracker.billingPeriod}
        </span>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-0.5">
        <MetricRow
          label="Cash sessions"
          value={tracker.totalCashSessions}
          unit=""
        />
        <MetricRow
          label="Total cash fare"
          value={tracker.totalCashFare}
          highlight
        />
        <MetricRow label="Commission owed" value={tracker.commissionOwed} />
        <MetricRow
          label="Commission collected"
          value={tracker.commissionCollected}
        />
        <MetricRow
          label="Outstanding"
          value={tracker.commissionOwed - tracker.commissionCollected}
        />
        {tracker.carryForward > 0 && (
          <MetricRow
            label="Carry forward"
            value={tracker.carryForward}
            highlight
          />
        )}
      </div>
    </div>
  );
}

/* ── Cash Ledger Card ───────────────────────────────────────────────── */

function CashLedgerCard({ ledger }: { ledger: CashLedgerData | null }) {
  if (!ledger) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4 text-teal-500" />
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Cash Ledger
        </span>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-0.5">
        <MetricRow label="Cash tally (live)" value={ledger.cashTally} />
        <MetricRow
          label="Cash collected"
          value={ledger.cashCollected}
          highlight
        />
        <MetricRow
          label="Commission owed"
          value={ledger.lotCommission.commissionOwed}
        />
        <MetricRow label="Open debts" value={ledger.openDebts.length} unit="" />
      </div>
    </div>
  );
}

/* ── Issues Alert ───────────────────────────────────────────────────── */

function IssuesAlert({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Agent Setup Issues
        </span>
      </div>
      <ul className="space-y-0.5">
        {issues.map((issue, i) => (
          <li
            key={i}
            className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1"
          >
            <span className="mt-0.5">•</span>
            {issue}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────── */

export default function AgentCashPanel() {
  const [snapshot, setSnapshot] = useState<AgentCashSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [resetting, setResetting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await fetchAgentCashSnapshot();
      setSnapshot(snap);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 30s
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSetup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingUp(true);
    try {
      const results = await setupAgentForShift();
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      if (fail === 0) toast.success(`Agent ready - ${ok} steps done`);
      else toast.warning(`${ok}/${results.length} steps passed`);
      await refresh();
    } catch (e) {
      toast.error(`Setup: ${String(e)}`);
    } finally {
      setSettingUp(false);
    }
  };

  const handleResetShift = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResetting(true);
    try {
      const results = await resetAgentShift();
      if (results[0]?.success) toast.success("Shift reset");
      else toast.error(results[0]?.detail ?? "Failed");
      await refresh();
    } catch (e) {
      toast.error(`Reset: ${String(e)}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Agent &amp; Cash Flow
          </span>
          {snapshot?.agentOperational && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              refresh();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                refresh();
              }
            }}
            className="rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400">
              Error: {error}
            </div>
          )}

          {/* Auto-setup / Reset buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSetup}
              disabled={settingUp}
              className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
            >
              {settingUp ? "Setting up..." : "Setup Agent"}
            </button>
            <button
              onClick={handleResetShift}
              disabled={resetting}
              className="flex-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
            >
              {resetting ? "Resetting..." : "Reset Shift"}
            </button>
          </div>

          {snapshot?.issues && <IssuesAlert issues={snapshot.issues} />}

          {/* Grid: Agent | Tally */}
          <div className="grid grid-cols-2 gap-2">
            <AgentStatusCard
              agent={snapshot?.agent ?? null}
              tallyStatus={snapshot?.tally?.status}
            />
            <CashTallyCard tally={snapshot?.tally ?? null} />
          </div>

          {/* Cash Tracker full width */}
          <CashTrackerCard tracker={snapshot?.cashTracker ?? null} />

          {/* Cash Ledger */}
          {snapshot?.cashLedger && (
            <CashLedgerCard ledger={snapshot.cashLedger} />
          )}
        </div>
      )}
    </div>
  );
}
