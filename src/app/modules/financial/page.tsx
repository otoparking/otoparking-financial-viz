"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  WalletState,
  WalletType,
  PRDScenario,
  LogEntry,
  MetricCard,
} from "@/types/financial";
import type { ModulePageProps } from "@/types/modules";
import { WALLET_COLORS } from "@/lib/scenarios";
import {
  resetTestData,
  fetchLiveData,
  type LiveData,
  type ScenarioResult,
  releaseAllEscrow,
  fetchLatestBooking,
  checkActiveBooking,
  fetchCashLedger,
  getDriverToken,
  fetchCashFlowState,
  releaseAgentToManager,
  releaseManagerToTenant,
} from "@/lib/api";
import {
  bookingFlowAmount,
  cancelFlowAmount,
  overstayFlowAmount,
  gateFlowAmount,
  gateCashFlowAmount,
  gateFareAmount,
} from "@/lib/flow-amounts";
import {
  handleTopup,
  handleBooking,
  handleBookingCompleted,
  handleGateWallet,
  handleGateCash,
  handleOverstay,
  handleCancel,
  handleSettleDigital,
  handleSettleCash,
} from "@/lib/scenario-handlers";
import FlowCanvas from "@/components/FlowCanvas";
import ScenarioPanel from "@/components/ScenarioPanel";
import { type Workflow, getWorkflowScenarios } from "@/lib/workflows";
import MetricsBar from "@/components/MetricsBar";
import { toast } from "sonner";
import type { LedgerData } from "@/components/LedgerPanel";
import MonitorPanel from "@/components/MonitorPanel";
import type { MonitorEvent } from "@/components/MonitorPanel";
import SettingsPanel, { useTestSettings } from "@/components/SettingsPanel";
import { useTheme } from "@/hooks/useTheme";
import AgentCashPanel from "@/components/AgentCashPanel";
import { fetchCashTracker } from "@/lib/admin-api";
import ApiDbMap from "@/components/ApiDbMap";
import ApiDbFlowCanvas from "@/components/ApiDbFlowCanvas";
import SimulationPanel from "@/components/SimulationPanel";

/* ── Backend Wallet Architecture ───────────────────────────────────────
 *
 * 4 wallets mirroring the actual backend tables:
 *
 *   Driver Wallet     oto_wallets              — available balance only
 *   Commission        oto_wallets_platform      — available (earned fees)
 *   Settlement        oto_wallets_platform      — blocked  (escrowed funds)
 *   Lot Revenue       oto_wallets_merchant      — available (merchant earnings)
 *
 * ───────────────────────────────────────────────────────────────────── */

const INITIAL_WALLETS: WalletState[] = [
  {
    id: "driver",
    label: "Driver Wallet",
    subtitle: "Pre-paid credits · oto_wallets",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: WALLET_COLORS.driver,
    kind: "wallet",
    x: 55,
    y: 2,
  },
  {
    id: "commission",
    label: "Commission",
    subtitle: "Platform fees · oto_wallets_platform",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: WALLET_COLORS.commission,
    kind: "wallet",
    x: 5,
    y: 44,
  },
  {
    id: "settlement",
    label: "Settlement",
    subtitle: "Escrowed funds · oto_wallets_platform",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: WALLET_COLORS.settlement,
    kind: "wallet",
    x: 105,
    y: 44,
  },
  {
    id: "lot",
    label: "Lot Revenue",
    subtitle: "Merchant earnings · oto_wallets_merchant",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: WALLET_COLORS.lot,
    kind: "wallet",
    x: 55,
    y: 84,
  },
  {
    id: "cash-tracker",
    label: "Cash Tracker",
    subtitle: "Agent cash commissions · oto_cash_commission_tracker",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: "#A855F7",
    kind: "ledger",
    x: 160,
    y: 44,
  },
  {
    id: "agent-cash",
    label: "Agent Cash",
    subtitle: "Physical cash in agents' hands · oto_agent_cash_tally",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: "#F59E0B",
    kind: "ledger",
    x: 160,
    y: 84,
  },
  {
    id: "manager-cash",
    label: "Manager Cash",
    subtitle: "Cash collected from agents · oto_test_manager_cash",
    balance: 0,
    blocked: 0,
    previousBalance: 0,
    previousBlocked: 0,
    color: "#EC4899",
    kind: "ledger",
    x: 55,
    y: 124,
  },
];

const INITIAL_METRICS: MetricCard[] = [
  { key: "activeTickets", label: "Active Tickets", value: 0, color: "#3B82F6" },
  {
    key: "agentsOnShift",
    label: "Agents on Shift",
    value: 0,
    color: "#14B8A6",
  },
  { key: "cashInHands", label: "Cash in Hands", value: 0, color: "#F59E0B" },
  {
    key: "pendingSettlements",
    label: "Pending Settlements",
    value: 0,
    color: "#EC4899",
  },
  { key: "cashOwed", label: "Cash Owed", value: 0, color: "#A855F7" },
];

function formatMAD(n: number): string {
  if (n === 0) return "—";
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(n);
}

function makeLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function FinancialModule({
  onActivity,
  onMonitor,
}: ModulePageProps) {
  const [wallets, setWallets] = useState<WalletState[]>(INITIAL_WALLETS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeWallets, setActiveWallets] = useState<Set<WalletType>>(
    new Set(),
  );
  const [activeFlowPairs, setActiveFlowPairs] = useState<Set<string>>(
    new Set(),
  );
  const [runningScenario, setRunningScenario] = useState<PRDScenario | null>(
    null,
  );
  const [hoveredScenario, setHoveredScenario] = useState<PRDScenario | null>(
    null,
  );
  const hoveredFlowPairs = useMemo<Set<string>>(() => {
    if (!hoveredScenario) return new Set();
    const pairs = new Set<string>();
    hoveredScenario.flows.forEach((f) => {
      if (f.from !== f.to) pairs.add(`${f.from}→${f.to}`);
    });
    return pairs;
  }, [hoveredScenario]);
  const [metrics, setMetrics] = useState<MetricCard[]>(INITIAL_METRICS);
  const [ledger, setLedger] = useState<LedgerData>({
    cashCommission: 0,
    escrowActive: 0,
    escrowReleased: 0,
    cashInHands: 0,
  });
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [simStep, setSimStep] = useState<number>(0);
  const [simTotalSteps, setSimTotalSteps] = useState<number>(0);
  const [activeBooking, setActiveBooking] = useState<{
    bookingRef: string;
    escrowAmount: number;
  } | null>(null);
  const simDepthRef = useRef(0);
  const lastBookingRef = useRef<string | null>(null);
  const causeRef = useRef("🚀 initial mount");
  const overstayFareRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [settings, updateSettings] = useTestSettings();
  const T = useTheme();
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const clearMonitorEvents = useCallback(() => setMonitorEvents([]), []);

  // Wrap onMonitor so every call is also stored locally for the MonitorPanel
  const emit = useCallback(
    (
      type: MonitorEvent["type"],
      label: string,
      detail: string,
      status?: MonitorEvent["status"],
      meta?: MonitorEvent["meta"],
      durationMs?: number,
    ) => {
      const event: MonitorEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        timestamp: new Date(),
        label,
        detail,
        status,
        meta,
        durationMs,
      };
      setMonitorEvents((prev) => [event, ...prev]);
      onMonitor(type, label, detail, status, meta, durationMs);
    },
    [onMonitor],
  );
  const [rightPanel, setRightPanel] = useState<
    "scenarios" | "monitor" | "agent-cash" | "api-db" | "simulation"
  >("scenarios");
  const [canvasView, setCanvasView] = useState<"flow" | "api-map">("flow");

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const data = await fetchLiveData();
      if (!mounted) return;
      setLiveData(data);
      setLastSynced(new Date());

      // Fetch real cash ledger from backend
      const cashLedger = await fetchCashLedger();

      // Fetch cash commission tracker from admin backend
      const cashTracker = await fetchCashTracker().catch(() => null);

      // Fetch agent + manager cash flow state
      const cashFlow = await fetchCashFlowState().catch(() => ({
        agentCash: 0,
        managerCash: 0,
      }));

      // Check for active booking
      const ab = await checkActiveBooking(settings.commissionRate);
      if (ab) {
        setActiveBooking(
          ab.hasActive
            ? { bookingRef: ab.bookingRef!, escrowAmount: ab.escrowAmount }
            : null,
        );
      }

      if (data.connected && data.driver && simDepthRef.current === 0) {
        causeRef.current = "🔵 live poll";
        setWallets((prev) =>
          prev.map((w) => {
            if (w.id === "driver") {
              return {
                ...w,
                previousBalance: w.balance,
                balance: data.driver!.balance,
              };
            }
            if (w.id === "lot" && data.tenant) {
              return {
                ...w,
                previousBalance: w.balance,
                balance: data.tenant.merchantBalance,
              };
            }
            if (w.id === "settlement" && data.tenant) {
              return {
                ...w,
                previousBlocked: w.blocked,
                blocked: data.tenant.escrowTotal,
              };
            }
            if (w.id === "commission" && cashLedger) {
              return {
                ...w,
                previousBalance: w.balance,
                balance: cashLedger.lotCommission,
              };
            }
            if (w.id === "cash-tracker" && cashTracker) {
              const outstanding = Math.max(
                0,
                (cashTracker.commissionOwed ?? 0) -
                  (cashTracker.commissionCollected ?? 0),
              );
              return {
                ...w,
                previousBalance: w.balance,
                balance: outstanding,
              };
            }
            if (w.id === "agent-cash") {
              return {
                ...w,
                previousBalance: w.balance,
                balance: cashFlow.agentCash,
              };
            }
            if (w.id === "manager-cash") {
              return {
                ...w,
                previousBalance: w.balance,
                balance: cashFlow.managerCash,
              };
            }
            return w;
          }),
        );
        setMetrics([
          {
            key: "activeTickets",
            label: "Active Tickets",
            value: data.tenant?.activeTickets ?? 0,
            color: "#3B82F6",
          },
          {
            key: "agentsOnShift",
            label: "Agents on Shift",
            value: data.tenant?.agentsOnShift ?? 0,
            color: "#14B8A6",
          },
          {
            key: "cashInHands",
            label: "Cash in Hands",
            value: data.tenant?.cashInAgentsHands ?? 0,
            color: "#F59E0B",
          },
          {
            key: "pendingSettlements",
            label: "Pending Settlements",
            value: data.tenant?.pendingSettlements ?? 0,
            color: "#EC4899",
          },
          {
            key: "cashOwed",
            label: "Cash Owed",
            value: cashTracker?.commissionOwed ?? 0,
            color: "#A855F7",
          },
        ]);
        if (data.tenant) {
          setLedger((prev) => ({
            ...prev,
            escrowActive: data.tenant!.escrowTotal,
            cashCommission: cashTracker?.commissionOwed ?? 0,
            cashInHands: data.tenant!.cashInAgentsHands,
          }));
        }
      }
    };
    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Console-log all 7 values on every change
  useEffect(() => {
    const d = wallets.find((w) => w.id === "driver");
    const c = wallets.find((w) => w.id === "commission");
    const s = wallets.find((w) => w.id === "settlement");
    const l = wallets.find((w) => w.id === "lot");
    console.log(`── ${causeRef.current} ──`);
    console.log(
      JSON.stringify(
        {
          driver: d?.balance ?? 0,
          commission: c?.balance ?? 0,
          settlement_blocked: s?.blocked ?? 0,
          lot: l?.balance ?? 0,
          cashCommission: ledger.cashCommission,
          escrow: ledger.escrowActive,
          cashInHands: ledger.cashInHands,
        },
        null,
        2,
      ),
    );
  }, [wallets, ledger]);

  // ── Timing constants ─────────────────────────────────────────────────
  // Each flow step is revealed with this gap (ms) — long enough to watch
  // the edge light up and the wallet balance tick before the next step fires.
  const STEP_DURATION_MS = 1800;
  // After all steps fire, hold the fully-lit state this long before clearing.
  const HOLD_DURATION_MS = 3200;

  /** Local simulation — cinematic step-by-step playback */
  const runLocalSimulation = useCallback(
    (scenario: PRDScenario) => {
      const flows = scenario.flows;
      const totalSteps = flows.length;
      const totalVisualMs = totalSteps * STEP_DURATION_MS + HOLD_DURATION_MS;

      setRunningScenario(scenario);
      setSimStep(0);
      setSimTotalSteps(totalSteps);

      // ── Pre-compute net changes per wallet ──────────────────────────
      const netByWallet = new Map<string, number>();
      const amountsByFlowId = new Map<string, number>();
      for (const flow of flows) {
        const amt =
          scenario.id === "topup"
            ? settings.topUpAmount
            : scenario.id === "booking" || scenario.id === "booking-completed"
              ? bookingFlowAmount(flow, settings)
              : scenario.id.startsWith("cancel-")
                ? cancelFlowAmount(flow, settings)
                : scenario.id === "overstay"
                  ? overstayFlowAmount(flow, settings, overstayFareRef.current)
                  : scenario.id === "gate-wallet"
                    ? gateFlowAmount(
                        flow,
                        settings.hourlyRate,
                        settings.commissionRate,
                      )
                    : scenario.id === "gate-cash"
                      ? gateCashFlowAmount(
                          flow,
                          settings.hourlyRate,
                          settings.commissionRate,
                        )
                      : flow.amount;
        amountsByFlowId.set(flow.id, amt);
        if (flow.from !== flow.to)
          netByWallet.set(flow.from, (netByWallet.get(flow.from) ?? 0) - amt);
        netByWallet.set(flow.to, (netByWallet.get(flow.to) ?? 0) + amt);
      }

      const summaryParts: string[] = [];
      for (const [wallet, net] of netByWallet) {
        if (net !== 0) {
          const wLabel =
            INITIAL_WALLETS.find((w) => w.id === wallet)?.label ?? wallet;
          summaryParts.push(`${wLabel} ${net > 0 ? "+" : ""}${formatMAD(net)}`);
        }
      }
      const dynamicFare = settings.bookingDurationHours * 5;
      const displayFlow =
        scenario.id === "topup"
          ? settings.topUpAmount
          : scenario.id === "booking" || scenario.id === "booking-completed"
            ? dynamicFare
            : scenario.id === "gate-wallet"
              ? gateFareAmount(settings.hourlyRate)
              : scenario.id === "gate-cash"
                ? gateFareAmount(settings.hourlyRate)
                : flows.reduce((s, f) => s + f.amount, 0);

      const isHeldEscrow =
        scenario.id === "booking-completed" && !settings.autoReleaseEscrow;

      // ── Scenario-start monitor event ────────────────────────────────
      const flowPreview = flows
        .map((f) => {
          const a = amountsByFlowId.get(f.id) ?? f.amount;
          return f.from === f.to
            ? `${f.label} (${formatMAD(a)})`
            : `${f.from} → ${f.to} ${formatMAD(a)}`;
        })
        .join(" | ");
      emit(
        "step",
        `[${scenario.number}] ${scenario.name}`,
        `${scenario.prdSection} — ${scenario.description}`,
        "pending",
        {
          section: scenario.prdSection,
          steps: totalSteps,
          total: `${formatMAD(displayFlow)} MAD`,
          flows: flowPreview,
          mode: isHeldEscrow ? "escrow-held" : "normal",
        },
      );

      toast(`[${scenario.number}] ${scenario.name}`, {
        description: isHeldEscrow
          ? `${scenario.prdSection} · Escrow held, not released`
          : `${scenario.prdSection} · ${formatMAD(displayFlow)} MAD moved`,
      });
      setLog((prev) => [
        {
          id: makeLogId(),
          timestamp: new Date(),
          scenario: `[${scenario.number}] ${scenario.name}`,
          summary: isHeldEscrow
            ? "Escrow held — auto-release OFF"
            : summaryParts.join(" · "),
        },
        ...prev,
      ]);

      // ── Step-by-step reveal ──────────────────────────────────────────
      flows.forEach((flow, stepIdx) => {
        setTimeout(() => {
          const amount = amountsByFlowId.get(flow.id) ?? flow.amount;

          if (flow.from !== flow.to) {
            setActiveFlowPairs((prev) => {
              const next = new Set(prev);
              next.add(`${flow.from}→${flow.to}`);
              return next;
            });
          }

          setActiveWallets((prev) => {
            const next = new Set(prev);
            next.add(flow.from);
            next.add(flow.to);
            return next;
          });

          if (isHeldEscrow) {
            emit(
              "step",
              `Transfer: ${flow.label}`,
              `Escrow held — auto-release is OFF. Edge lit but no balance moved.`,
              "ok",
              {
                flow: `${flow.from} → ${flow.to}`,
                amount: `${formatMAD(amount)} MAD`,
                escrowHeld: true,
                step: `${stepIdx + 1}/${totalSteps}`,
              },
            );
            setSimStep(stepIdx + 1);
            return;
          }

          // Update wallet balance and capture before/after for monitor.
          // We compute the next wallets array imperatively first so we can
          // emit monitor events *outside* the setState updater — calling
          // setState (via emit → onMonitor) inside another setState updater
          // is what triggered the "update while rendering" React error.
          causeRef.current = `🎬 visual: #${scenario.number} ${scenario.name} step ${stepIdx + 1}/${totalSteps}`;

          // Read the current wallet array synchronously via a functional
          // updater that captures prev, computes next, records the diff,
          // and returns next — but emits nothing itself.
          let capturedEmits: Array<() => void> = [];

          setWallets((prev) => {
            const next = prev.map((w) => ({
              ...w,
              previousBalance: stepIdx === 0 ? w.balance : w.previousBalance,
              previousBlocked: stepIdx === 0 ? w.blocked : w.previousBlocked,
            }));

            const fromIdx = next.findIndex((w) => w.id === flow.from);
            const toIdx = next.findIndex((w) => w.id === flow.to);

            // Capture before values
            const fromBefore =
              fromIdx !== -1
                ? flow.from === "settlement"
                  ? next[fromIdx].blocked
                  : next[fromIdx].balance
                : null;
            const toBefore =
              toIdx !== -1
                ? flow.to === "settlement"
                  ? next[toIdx].blocked
                  : next[toIdx].balance
                : null;

            if (fromIdx !== -1 && flow.from !== flow.to) {
              if (flow.from === "settlement") {
                next[fromIdx] = {
                  ...next[fromIdx],
                  blocked: next[fromIdx].blocked - amount,
                };
              } else {
                next[fromIdx] = {
                  ...next[fromIdx],
                  balance: next[fromIdx].balance - amount,
                };
              }
            }
            if (toIdx !== -1) {
              if (flow.to === "settlement") {
                next[toIdx] = {
                  ...next[toIdx],
                  blocked: next[toIdx].blocked + amount,
                };
              } else {
                next[toIdx] = {
                  ...next[toIdx],
                  balance: next[toIdx].balance + amount,
                };
              }
            }

            // Scenario-level side effects on last step
            if (stepIdx === flows.length - 1) {
              if (
                scenario.id === "settle-digital" ||
                scenario.id === "settle-cash"
              ) {
                const lotIdx = next.findIndex((w) => w.id === "lot");
                if (lotIdx !== -1)
                  next[lotIdx] = { ...next[lotIdx], balance: 0 };
                if (scenario.id === "settle-cash") {
                  const ctIdx = next.findIndex((w) => w.id === "cash-tracker");
                  if (ctIdx !== -1)
                    next[ctIdx] = { ...next[ctIdx], balance: 0 };
                }
              }
            }

            // After values
            const fromAfter =
              fromIdx !== -1
                ? flow.from === "settlement"
                  ? next[fromIdx].blocked
                  : next[fromIdx].balance
                : null;
            const toAfter =
              toIdx !== -1
                ? flow.to === "settlement"
                  ? next[toIdx].blocked
                  : next[toIdx].balance
                : null;

            // Build per-wallet transfer events with before/after.
            // We capture closures here so emit() is called after setWallets
            // returns, keeping it out of the updater body.
            const fromLabel = next[fromIdx]?.label ?? flow.from;
            const toLabel = next[toIdx]?.label ?? flow.to;
            const fromField =
              flow.from === "settlement" ? "blocked" : "available";
            const toField = flow.to === "settlement" ? "blocked" : "available";

            if (flow.from !== flow.to) {
              capturedEmits = [
                () =>
                  emit(
                    "step",
                    `DEBIT  ${fromLabel}`,
                    `${flow.label} — step ${stepIdx + 1}/${totalSteps} of ${scenario.name}`,
                    "ok",
                    {
                      wallet: fromLabel,
                      field: fromField,
                      operation: "DEBIT",
                      amount: `-${formatMAD(amount)} MAD`,
                      before: `${formatMAD(fromBefore ?? 0)} MAD`,
                      after: `${formatMAD(fromAfter ?? 0)} MAD`,
                      delta: `-${formatMAD(amount)} MAD`,
                      table:
                        flow.from === "settlement"
                          ? "oto_wallets_platform (SETTLEMENT)"
                          : flow.from === "commission"
                            ? "oto_wallets_platform (COMMISSION)"
                            : flow.from === "lot"
                              ? "oto_wallets_merchant"
                              : "oto_wallets",
                      scenario: scenario.name,
                      prd: scenario.prdSection,
                    },
                  ),
                () =>
                  emit(
                    "step",
                    `CREDIT ${toLabel}`,
                    `${flow.label} — step ${stepIdx + 1}/${totalSteps} of ${scenario.name}`,
                    "ok",
                    {
                      wallet: toLabel,
                      field: toField,
                      operation: "CREDIT",
                      amount: `+${formatMAD(amount)} MAD`,
                      before: `${formatMAD(toBefore ?? 0)} MAD`,
                      after: `${formatMAD(toAfter ?? 0)} MAD`,
                      delta: `+${formatMAD(amount)} MAD`,
                      table:
                        flow.to === "settlement"
                          ? "oto_wallets_platform (SETTLEMENT)"
                          : flow.to === "commission"
                            ? "oto_wallets_platform (COMMISSION)"
                            : flow.to === "lot"
                              ? "oto_wallets_merchant"
                              : "oto_wallets",
                      scenario: scenario.name,
                      prd: scenario.prdSection,
                    },
                  ),
              ];
            } else {
              // Self-flow (top-up, cash, settlement payout)
              const selfLabel = next[toIdx]?.label ?? flow.to;
              const selfBefore = toBefore ?? 0;
              const selfAfter = toAfter ?? 0;
              capturedEmits = [
                () =>
                  emit(
                    "step",
                    `UPDATE ${selfLabel}`,
                    `${flow.label} — ${scenario.name}`,
                    "ok",
                    {
                      wallet: selfLabel,
                      field: toField,
                      operation: "UPDATE",
                      before: `${formatMAD(selfBefore)} MAD`,
                      after: `${formatMAD(selfAfter)} MAD`,
                      delta:
                        selfAfter - selfBefore >= 0
                          ? `+${formatMAD(selfAfter - selfBefore)} MAD`
                          : `${formatMAD(selfAfter - selfBefore)} MAD`,
                      table:
                        flow.to === "lot"
                          ? "oto_wallets_merchant"
                          : flow.to === "commission"
                            ? "oto_wallets_platform (COMMISSION)"
                            : "oto_wallets",
                      scenario: scenario.name,
                      prd: scenario.prdSection,
                    },
                  ),
              ];
            }

            return next;
          });

          // Fire monitor events now that setWallets has returned — safe to
          // call setState (via emit) here since we're no longer inside an
          // updater function.
          capturedEmits.forEach((fn) => fn());

          setSimStep(stepIdx + 1);

          if (stepIdx === flows.length - 1) {
            if (scenario.id === "settle-cash") {
              setLedger((prev) => ({ ...prev, cashTally: 0, openDebts: 0 }));
              setLog((prev) => [
                {
                  id: makeLogId(),
                  timestamp: new Date(),
                  scenario: "  Cash reconciliation",
                  summary:
                    "Cash tally reconciled to Commission. Net wire sent to tenant.",
                },
                ...prev,
              ]);
            }

            // Scenario-complete summary event
            emit(
              "step",
              `[${scenario.number}] ${scenario.name} — COMPLETE`,
              summaryParts.length > 0
                ? summaryParts.join(" · ")
                : "No balance changes",
              "ok",
              {
                section: scenario.prdSection,
                result: isHeldEscrow ? "escrow-held" : "committed",
                ...Object.fromEntries(
                  Array.from(netByWallet.entries())
                    .filter(([, net]) => net !== 0)
                    .map(([w, net]) => [
                      `net_${w}`,
                      `${net > 0 ? "+" : ""}${formatMAD(net)} MAD`,
                    ]),
                ),
              },
            );
          }
        }, stepIdx * STEP_DURATION_MS);
      });

      // ── Hold then clear ──────────────────────────────────────────────
      setTimeout(() => {
        setActiveWallets(new Set());
        setActiveFlowPairs(new Set());
        setRunningScenario(null);
        setSimStep(0);
        setSimTotalSteps(0);
        simDepthRef.current = Math.max(0, simDepthRef.current - 1);
        onActivity(null as unknown as string);
      }, totalVisualMs);
    },
    [onActivity, settings, emit],
  );

  const runScenario = useCallback(
    async (
      scenario: PRDScenario,
      bookToday: boolean = false,
      isCancelFlow: boolean = false,
      noMinBuffer: boolean = false,
    ): Promise<void> => {
      // Pre-fetch overstay fare from backend API so the visual uses real pricing
      if (scenario.id === "overstay") {
        const ref = lastBookingRef.current ?? (await fetchLatestBooking());
        if (ref) {
          try {
            const token = await getDriverToken();
            if (token) {
              const res = await fetch(
                "/api/backend/booking/extension/preview",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    booking_reference: ref,
                    extension_minutes: settings.overstayMinutes ?? 90,
                  }),
                },
              );
              if (res.ok) {
                const json = await res.json();
                overstayFareRef.current = json.data?.extension_amount ?? null;
              }
            }
          } catch {
            /* fall back to estimate */
          }
        }
      }

      return new Promise((resolve) => {
        const startTime = Date.now();
        simDepthRef.current += 1;
        onActivity(`#${scenario.number} ${scenario.name}`);

        // Always show visual simulation first
        runLocalSimulation(scenario);

        // Minimum time before the next scenario can start (visual playback window)
        const minVisualMs = scenario.flows.length * 1800 + 3200;

        // Resolve after API completes AND visual has had time to play out
        const finish = () => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, minVisualMs - elapsed);
          setTimeout(resolve, remaining);
        };

        // Then fire real API for supported scenarios
        const isReal =
          scenario.id === "topup" ||
          scenario.id === "booking" ||
          scenario.id === "booking-completed" ||
          scenario.id === "gate-wallet" ||
          scenario.id === "gate-cash" ||
          scenario.id === "cancel-full" ||
          scenario.id === "cancel-partial" ||
          scenario.id === "cancel-none" ||
          scenario.id === "overstay" ||
          scenario.id === "settle-digital" ||
          scenario.id === "settle-cash";

        if (!isReal) {
          finish();
          return;
        }

        /* ── Import booking ref for cancel scenarios ── */
        // Cancel uses lastBookingRef (set by booking step in same workflow)

        (async () => {
          emit(
            "step",
            `#${scenario.number} ${scenario.name}`,
            "Starting real execution",
            undefined,
            {
              scenario: scenario.id,
              flows: scenario.flows.length,
              section: scenario.prdSection,
            },
          );
          // Guard: block new entry when booking is ACTIVE (skip for cancel flows)
          const blockedScenarios = [
            "booking",
            "booking-completed",
            "gate-wallet",
            "gate-cash",
          ];
          if (blockedScenarios.includes(scenario.id) && !isCancelFlow) {
            const active = await checkActiveBooking(settings.commissionRate);
            if (active?.hasActive) {
              toast("🚫 Active booking exists", {
                description: `${active.bookingRef} is ACTIVE. Release escrow or Hard Reset first.`,
              });
              simDepthRef.current = Math.max(0, simDepthRef.current - 1);
              onActivity(null as unknown as string);
              finish();
              return;
            }
          }

          let result: ScenarioResult | null = null;

          if (scenario.id === "topup") {
            result = await handleTopup(settings, emit);
          } else if (scenario.id === "booking") {
            result = await handleBooking(
              settings,
              { bookToday, noMinBuffer },
              emit,
            );
            if (result && !result.success) {
              simDepthRef.current = Math.max(0, simDepthRef.current - 1);
              onActivity(null as unknown as string);
              finish();
              return;
            }
            if (result?.bookingReference) {
              lastBookingRef.current = result.bookingReference;
            }
          } else if (scenario.id === "booking-completed") {
            result = await handleBookingCompleted(settings);
          } else if (scenario.id === "gate-wallet") {
            result = await handleGateWallet();
          } else if (scenario.id === "gate-cash") {
            result = await handleGateCash(settings, emit);
          } else if (scenario.id === "settle-digital") {
            result = await handleSettleDigital(emit);
          } else if (scenario.id === "settle-cash") {
            result = await handleSettleCash(emit);
          } else if (scenario.id === "overstay") {
            result = await handleOverstay(
              settings,
              emit,
              lastBookingRef.current,
            );
          } else {
            result = await handleCancel(lastBookingRef.current);
            lastBookingRef.current = null;
          }

          if (result) {
            toast(
              result.success
                ? `✅ LIVE: ${result.message}`
                : `❌ LIVE: ${result.message}`,
              {
                description: result.success
                  ? "Transaction confirmed on backend"
                  : "Check the event log for details",
              },
            );
            setLog((prev) => [
              {
                id: makeLogId(),
                timestamp: new Date(),
                scenario: `[${scenario.number}] ${scenario.name} (LIVE)`,
                summary: result.message,
              },
              ...prev,
            ]);
          }

          // Refresh live data after visual sim window closes
          // Duration matches new step-based timing (flows * step + hold + buffer)
          const liveRefreshMs = scenario.flows.length * 1800 + 3200 + 800;
          setTimeout(async () => {
            // Skip if another visual sim is running (prevents mid-animation overwrite)
            // Do NOT decrement simDepthRef here — the guard only checks, it doesn't own
            // a ref count. Decrementing would consume the workflow-level increment
            // and let subsequent live-refreshes leak through mid-workflow.
            if (simDepthRef.current > 0) {
              return;
            }
            const live = await fetchLiveData();
            const cashLedger = await fetchCashLedger();
            setLiveData(live);
            setLastSynced(new Date());
            if (live.connected && live.driver) {
              causeRef.current = `🔄 live refresh: #${scenario.number} ${scenario.name}`;
              setWallets((prev) =>
                prev.map((w) => {
                  if (w.id === "driver") {
                    return {
                      ...w,
                      previousBalance: w.balance,
                      balance: live.driver!.balance,
                    };
                  }
                  if (w.id === "lot" && live.tenant) {
                    return {
                      ...w,
                      previousBalance: w.balance,
                      balance: live.tenant.merchantBalance,
                    };
                  }
                  if (w.id === "settlement" && live.tenant) {
                    return {
                      ...w,
                      previousBlocked: w.blocked,
                      blocked: live.tenant.escrowTotal,
                    };
                  }
                  if (w.id === "commission" && cashLedger) {
                    return {
                      ...w,
                      previousBalance: w.balance,
                      balance: cashLedger.lotCommission,
                    };
                  }
                  return w;
                }),
              );
              setMetrics([
                {
                  key: "activeTickets",
                  label: "Active Tickets",
                  value: live.tenant?.activeTickets ?? 0,
                  color: "#3B82F6",
                },
                {
                  key: "agentsOnShift",
                  label: "Agents on Shift",
                  value: live.tenant?.agentsOnShift ?? 0,
                  color: "#14B8A6",
                },
                {
                  key: "cashInHands",
                  label: "Cash in Hands",
                  value: live.tenant?.cashInAgentsHands ?? 0,
                  color: "#F59E0B",
                },
                {
                  key: "pendingSettlements",
                  label: "Pending Settlements",
                  value: live.tenant?.pendingSettlements ?? 0,
                  color: "#EC4899",
                },
                {
                  key: "cashOwed",
                  label: "Cash Owed",
                  value: cashLedger?.cashTally ?? 0,
                  color: "#A855F7",
                },
              ]);
              if (live.tenant) {
                setLedger((prev) => ({
                  ...prev,
                  escrowActive: live.tenant!.escrowTotal,
                  cashCommission: cashLedger?.cashTally ?? 0,
                  cashInHands: live.tenant!.cashInAgentsHands,
                }));
              }
            }
          }, liveRefreshMs);

          // API work complete — resolve so workflow can advance to next scenario.
          // finish() waits for the visual animation window if API was faster.
          finish();
        })();
      });
    },
    [onActivity, runLocalSimulation, settings, emit],
  );

  const runWorkflow = useCallback(
    (workflow: Workflow) => {
      const blocksBooking =
        workflow.steps.includes("booking") ||
        workflow.steps.includes("booking-completed") ||
        workflow.steps.includes("gate-wallet") ||
        workflow.steps.includes("gate-cash") ||
        workflow.steps.includes("overstay");

      const isCancelFlow = workflow.steps.some((s) => s.startsWith("cancel-"));

      const run = async () => {
        if (blocksBooking && !isCancelFlow) {
          const active = await checkActiveBooking(settings.commissionRate);
          if (active?.hasActive) {
            toast("🚫 Active booking exists", {
              description: `${active.bookingRef} is ACTIVE with ~${active.escrowAmount.toFixed(1)} MAD in escrow. Release escrow or Hard Reset first.`,
            });
            return;
          }
        }

        const scenarios = getWorkflowScenarios(workflow);
        simDepthRef.current += 1;
        onActivity(workflow.name);

        // Cancel Partial: book for today (3h+ ahead → PARTIAL window 60min-24h).
        // Cancel None: book for today (next hour → NONE window <60min).
        // Cancel Full: book for tomorrow (>24h → FULL window).
        const bookToday =
          workflow.id === "cancel-partial-flow" ||
          workflow.id === "cancel-none-flow";
        const noMinBuffer = workflow.id === "cancel-none-flow";

        for (const scenario of scenarios) {
          // Clear stale ref before booking step in cancel workflows
          // so a failed booking doesn't cause the wrong booking to be cancelled.
          if (isCancelFlow && scenario.id === "booking") {
            lastBookingRef.current = null;
          }
          await runScenario(scenario, bookToday, isCancelFlow, noMinBuffer);

          // For cancel workflows: if booking step didn't produce a ref, stop
          if (
            isCancelFlow &&
            scenario.id === "booking" &&
            !lastBookingRef.current
          ) {
            toast("⚠️ Workflow stopped", {
              description: "Booking failed — cancel step skipped.",
            });
            simDepthRef.current = Math.max(0, simDepthRef.current - 1);
            onActivity(null as unknown as string);
            return;
          }
        }

        setTimeout(() => {
          simDepthRef.current = Math.max(0, simDepthRef.current - 1);
        }, 5000);
      };
      run();
    },
    [runScenario, onActivity],
  );

  const resetSim = useCallback(() => {
    causeRef.current = "🔄 soft reset";
    setRunningScenario(null);
    setSimStep(0);
    setSimTotalSteps(0);
    setWallets(INITIAL_WALLETS.map((w) => ({ ...w })));
    setLog([]);
    setActiveWallets(new Set());
    setActiveFlowPairs(new Set());
    setMetrics(INITIAL_METRICS.map((m) => ({ ...m })));
    setActiveBooking(null);
    lastBookingRef.current = null;
    setLedger({
      cashCommission: 0,
      escrowActive: 0,
      escrowReleased: 0,
      cashInHands: 0,
    });
    simDepthRef.current = 0;
    onActivity(null as unknown as string);
    emit(
      "system",
      "Simulation Reset",
      "All visual balances cleared to initial state",
      "ok",
      { wallets: "reset", ledger: "cleared", log: "cleared" },
    );
    toast("Simulation reset", { description: "All balances cleared to zero." });
  }, [onActivity, emit]);

  const handleHardReset = useCallback(async () => {
    setActiveBooking(null);
    lastBookingRef.current = null;
    emit("system", "Hard Reset", "Wiping all backend test data", "pending", {
      action: "DELETE test data",
      tables: "oto_bookings, oto_wallets, oto_escrow",
    });
    try {
      const r = await resetTestData();
      toast(r.success ? "DB Reset complete" : "Reset failed", {
        description: r.message,
      });
      emit(
        "system",
        "Hard Reset",
        r.success ? r.message : `Failed: ${r.message}`,
        r.success ? "ok" : "error",
        { result: r.message },
      );
      if (r.success) {
        causeRef.current = "💣 hard reset";
        resetSim();
        const live = await fetchLiveData();
        setLiveData(live);
      }
    } catch {
      toast("Reset failed", {
        description:
          "Could not reach the server. Is the Next.js dev server running?",
      });
      emit("system", "Hard Reset", "Server unreachable", "error", {
        error: "network failure",
      });
    }
  }, [resetSim, emit]);

  const handleReleaseAgentToManager = useCallback(async () => {
    // Snapshot agent cash amount before the API call
    const cashState = await fetchCashFlowState();
    const agentAmount = cashState.agentCash;

    const r = await releaseAgentToManager();
    emit(
      "api",
      "POST /financial/cash-flow/release-to-manager",
      r.success
        ? `${formatMAD(agentAmount)} MAD released to manager`
        : (r.message ?? "Failed"),
      r.success ? "ok" : "error",
      { amount: `${agentAmount} MAD`, from: "agent-cash", to: "manager-cash" },
    );
    toast(r.success ? r.message : "No cash to release", {
      description: r.success ? undefined : "Run Gate Cash first",
    });

    if (r.success && agentAmount > 0) {
      // Animate agent-cash → manager-cash edge on the canvas
      setActiveFlowPairs(new Set(["agent-cash→manager-cash"]));
      setActiveWallets(new Set(["agent-cash", "manager-cash"]));
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === "agent-cash")
            return { ...w, previousBalance: w.balance, balance: 0 };
          if (w.id === "manager-cash")
            return {
              ...w,
              previousBalance: w.balance,
              balance: w.balance + agentAmount,
            };
          return w;
        }),
      );
      setTimeout(() => {
        setActiveFlowPairs(new Set());
        setActiveWallets(new Set());
      }, 3000);
    }
  }, [emit]);

  const handleReleaseManagerToTenant = useCallback(async () => {
    // Snapshot manager cash amount before the API call
    const cashState = await fetchCashFlowState();
    const managerAmount = cashState.managerCash;

    const r = await releaseManagerToTenant();
    emit(
      "api",
      "POST /financial/cash-flow/release-to-tenant",
      r.success
        ? `${formatMAD(managerAmount)} MAD deposited to Lot Revenue`
        : (r.message ?? "Failed"),
      r.success ? "ok" : "error",
      { amount: `${managerAmount} MAD`, from: "manager-cash", to: "lot" },
    );
    toast(r.success ? r.message : "No cash to release", {
      description: r.success ? undefined : "Release from agents first",
    });

    if (r.success && managerAmount > 0) {
      // Animate manager-cash → lot edge on the canvas
      setActiveFlowPairs(new Set(["manager-cash→lot"]));
      setActiveWallets(new Set(["manager-cash", "lot"]));
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === "manager-cash")
            return { ...w, previousBalance: w.balance, balance: 0 };
          if (w.id === "lot")
            return {
              ...w,
              previousBalance: w.balance,
              balance: w.balance + managerAmount,
            };
          return w;
        }),
      );
      setTimeout(() => {
        setActiveFlowPairs(new Set());
        setActiveWallets(new Set());
      }, 3000);
    }
  }, [emit]);

  const handleReleaseEscrow = useCallback(async () => {
    emit(
      "api",
      "POST /escrow/release-all",
      "Force-releasing all held escrow",
      "pending",
      { action: "release all", table: "oto_escrow" },
    );
    const r = await releaseAllEscrow();
    toast(r.success ? "Escrow released" : "No escrow to release", {
      description: r.message,
    });
    emit(
      "api",
      "POST /escrow/release-all",
      r.success ? r.message : "Nothing to release",
      r.success ? "ok" : "ok",
      { result: r.message },
    );
    if (r.success) {
      emit("db", "oto_escrow", "Escrow records settled and cleared", "ok", {
        table: "oto_escrow",
        operation: "UPDATE settled=true",
        affected: "all pending",
      });
      const live = await fetchLiveData();
      setLiveData(live);
    }
  }, [emit]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        {/* Canvas view toggle */}
        <div className="absolute top-3 right-3 z-10 flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <button
            onClick={() => setCanvasView("flow")}
            className="px-3 py-1.5 text-[10px] font-mono font-semibold transition-colors"
            style={{
              background:
                canvasView === "flow" ? T.accent + "18" : "transparent",
              color: canvasView === "flow" ? T.accent : T.textDim,
            }}
          >
            Flow
          </button>
          <button
            onClick={() => setCanvasView("api-map")}
            className="px-3 py-1.5 text-[10px] font-mono font-semibold transition-colors border-l border-zinc-200 dark:border-zinc-700"
            style={{
              background:
                canvasView === "api-map" ? T.accent + "18" : "transparent",
              color: canvasView === "api-map" ? T.accent : T.textDim,
            }}
          >
            API Map
          </button>
        </div>
        {canvasView === "flow" ? (
          <FlowCanvas
            wallets={wallets}
            ledger={ledger}
            liveData={liveData}
            lastSynced={lastSynced}
            activeBooking={activeBooking}
            activeWallets={activeWallets}
            activeFlowPairs={activeFlowPairs}
            hoveredFlowPairs={hoveredFlowPairs}
            hoveredScenario={hoveredScenario}
            runningScenario={runningScenario}
            simStep={simStep}
            simTotalSteps={simTotalSteps}
            formatMAD={formatMAD}
          />
        ) : (
          <ApiDbFlowCanvas />
        )}
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        {/* ── Panel switcher tab bar ── */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            borderBottom: `1px solid ${T.border}`,
            background: T.header,
          }}
        >
          {(
            [
              "scenarios",
              "monitor",
              "agent-cash",
              "api-db",
              "simulation",
            ] as const
          ).map((tab) => {
            const active = rightPanel === tab;
            const label =
              tab === "scenarios"
                ? "Scenarios"
                : tab === "monitor"
                  ? "Monitor"
                  : tab === "agent-cash"
                    ? "Agent & Cash"
                    : tab === "simulation"
                      ? "Simulation"
                      : "API→DB";
            return (
              <button
                key={tab}
                onClick={() => setRightPanel(tab)}
                style={{
                  flex: 1,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: active ? T.accent : T.textDim,
                  transition: "color 150ms ease, border-color 150ms ease",
                }}
              >
                {label}
                {tab === "monitor" && monitorEvents.length > 0 && (
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      background: T.accentBg,
                      border: `1px solid ${T.accent}44`,
                      color: T.accent,
                      borderRadius: 3,
                      padding: "0px 4px",
                    }}
                  >
                    {monitorEvents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Pinned top: settings + metrics (always visible) ── */}
        <SettingsPanel settings={settings} onChange={updateSettings} />
        <MetricsBar metrics={metrics} />

        {/* ── Swappable body ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {rightPanel === "scenarios" ? (
            <ScenarioPanel
              onRunScenario={runScenario}
              onRunWorkflow={runWorkflow}
              onHoverScenario={setHoveredScenario}
              onReset={resetSim}
              onHardReset={handleHardReset}
              onReleaseEscrow={handleReleaseEscrow}
              onReleaseAgentToManager={handleReleaseAgentToManager}
              onReleaseManagerToTenant={handleReleaseManagerToTenant}
              log={log}
            />
          ) : rightPanel === "monitor" ? (
            <MonitorPanel events={monitorEvents} onClear={clearMonitorEvents} />
          ) : rightPanel === "agent-cash" ? (
            <div className="flex-1 overflow-auto p-3">
              <AgentCashPanel />
            </div>
          ) : rightPanel === "simulation" ? (
            <div className="flex-1 overflow-auto">
              <SimulationPanel
                onLog={(label, detail, ok) =>
                  emit("step", label, detail, ok ? "ok" : "error")
                }
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3">
              <ApiDbMap />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
