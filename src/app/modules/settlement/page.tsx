"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  SettlementScenario,
  SettlementResult,
  SettlementLogEntry,
} from "@/types/settlement";
import SettlementCanvas from "@/components/SettlementCanvas";
import SettlementControlPanel from "@/components/SettlementControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeSettlement(
  input: SettlementScenario["input"],
): SettlementResult {
  const B = input.lotRevenueBalance;
  const C = input.cashCommissionTracker;

  if (B === 0 && C === 0) {
    return {
      grossRevenue: B,
      cashOwed: C,
      netWire: 0,
      carryForward: 0,
      lotWalletAfter: 0,
      commissionAfter: 0,
      cashTrackerAfter: 0,
      status: "PENDING",
      reason: "Zero balances — nothing to settle",
    };
  }

  if (C === 0) {
    return {
      grossRevenue: B,
      cashOwed: 0,
      netWire: B,
      carryForward: 0,
      lotWalletAfter: 0,
      commissionAfter: 0,
      cashTrackerAfter: 0,
      status: "PAID",
      reason: `Full Lot Revenue (${B} MAD) wired to tenant bank`,
    };
  }

  if (C <= B) {
    const netWire = B - C;
    return {
      grossRevenue: B,
      cashOwed: C,
      netWire,
      carryForward: 0,
      lotWalletAfter: 0,
      commissionAfter: C,
      cashTrackerAfter: 0,
      status: "PAID",
      reason: `Net wire: ${B} − ${C} = ${netWire} MAD · Cash commission transferred to Commission Wallet`,
    };
  }

  // C > B — shortfall
  const shortfall = C - B;
  return {
    grossRevenue: B,
    cashOwed: C,
    netWire: 0,
    carryForward: shortfall,
    lotWalletAfter: 0,
    commissionAfter: B,
    cashTrackerAfter: shortfall,
    status: "CARRY_FORWARD",
    reason: `Cash owed (${C}) > lot revenue (${B}) → ${shortfall} MAD carried forward to next month`,
  };
}

export default function SettlementModule({ onActivity }: ModulePageProps) {
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [log, setLog] = useState<SettlementLogEntry[]>([]);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  const runScenario = useCallback(
    (scenario: SettlementScenario) => {
      onActivity(scenario.name);
      toast(scenario.name, { description: scenario.description });
      addLog(
        "INPUT",
        `B=${scenario.input.lotRevenueBalance} · C=${scenario.input.cashCommissionTracker} · ${scenario.input.month}`,
      );

      const res = computeSettlement(scenario.input);

      // Handle failed payout override
      if (scenario.id === "failed-payout") {
        res.status = "PAYOUT_FAILED";
        res.reason =
          "Bank rejects transfer → Finance retries (max 2 auto retries)";
      }
      if (scenario.id === "carry-forward-resolved") {
        res.status = "PAID";
        res.reason =
          "Carry forward from previous month cleared · Full payout this month";
      }

      setResult(res);
      addLog(
        "RESULT",
        `${res.status} · Net wire: ${res.netWire} MAD${res.carryForward > 0 ? ` · Carry forward: ${res.carryForward} MAD` : ""}`,
      );

      if (
        res.status === scenario.expected.status &&
        res.netWire === scenario.expected.netWire
      ) {
        addLog("✓ PASS", "Matches expected settlement");
      } else {
        addLog(
          "✗ MISMATCH",
          `Expected ${scenario.expected.status} / ${scenario.expected.netWire} MAD wire`,
        );
      }
    },
    [onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    setResult(null);
    setLog([]);
    onActivity(null as unknown as string);
    toast("Settlement reset", { description: "Results cleared." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <SettlementCanvas result={result} />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <SettlementControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
