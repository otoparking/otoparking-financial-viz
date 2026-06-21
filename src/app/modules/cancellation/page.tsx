"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  CancellationScenario,
  CancellationResult,
  CancelLogEntry,
} from "@/types/cancellation";
import CancellationCanvas from "@/components/CancellationCanvas";
import CancellationControlPanel from "@/components/CancellationControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeCancellation(
  input: CancellationScenario["input"],
): CancellationResult {
  // Terminal states: cannot cancel
  if (input.bookingStatus === "COMPLETED")
    return {
      tier: "CANNOT_CANCEL",
      driverRecovers: 0,
      platformKeeps: 0,
      lotReceives: 0,
      reason: "Booking already completed",
    };
  if (input.bookingStatus === "CANCELLED")
    return {
      tier: "CANNOT_CANCEL",
      driverRecovers: 0,
      platformKeeps: 0,
      lotReceives: 0,
      reason: "Already cancelled",
    };
  if (input.isGateSession)
    return {
      tier: "CANNOT_CANCEL",
      driverRecovers: 0,
      platformKeeps: 0,
      lotReceives: 0,
      reason: "Gate/walk-in session — no pre-payment exists",
    };

  // Extended bookings: always cancellable, never refundable
  if (input.isExtended)
    return {
      tier: "NONE",
      driverRecovers: 0,
      platformKeeps: 0,
      lotReceives: 0,
      reason: "Extended bookings — always cancellable, never refundable",
    };

  const X = input.bookingAmount;
  const commission = X * 0.1;
  const escrow = X * 0.9;

  if (input.hoursUntilStart > 24) {
    return {
      tier: "FULL",
      driverRecovers: X,
      platformKeeps: 0,
      lotReceives: 0,
      reason: `More than 24h before start (${input.hoursUntilStart}h)`,
    };
  }

  if (input.hoursUntilStart >= 1 && input.hoursUntilStart <= 24) {
    const driverGets = X * 0.5;
    const platformKeeps = commission * 0.5;
    const lotGets = escrow * 0.5;
    return {
      tier: "PARTIAL",
      driverRecovers: driverGets,
      platformKeeps,
      lotReceives: lotGets,
      reason: `1–24h before start (${input.hoursUntilStart}h) → 50% refund`,
    };
  }

  // < 1h
  return {
    tier: "NONE",
    driverRecovers: 0,
    platformKeeps: commission,
    lotReceives: escrow,
    reason: `Less than 1h before start (${input.hoursUntilStart}h)`,
  };
}

export default function CancellationModule({ onActivity }: ModulePageProps) {
  const [result, setResult] = useState<CancellationResult | null>(null);
  const [hoursUntilStart, setHoursUntilStart] = useState(0);
  const [log, setLog] = useState<CancelLogEntry[]>([]);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  const runScenario = useCallback(
    (scenario: CancellationScenario) => {
      setHoursUntilStart(scenario.input.hoursUntilStart);
      onActivity(scenario.name);
      toast(scenario.name, { description: scenario.description });
      addLog(
        "INPUT",
        `${scenario.input.hoursUntilStart}h before · ${scenario.input.bookingStatus} · ${scenario.input.bookingAmount} MAD`,
      );

      const res = computeCancellation(scenario.input);
      setResult(res);

      addLog(
        "RESULT",
        `${res.tier} — Driver: ${res.driverRecovers} MAD · Platform: ${res.platformKeeps} MAD · Lot: ${res.lotReceives} MAD`,
      );
      if (
        res.tier === scenario.expected.tier &&
        res.driverRecovers === scenario.expected.driverRecovers
      ) {
        addLog("✓ PASS", "Matches expected outcome");
      } else {
        addLog(
          "✗ FAIL",
          `Expected ${scenario.expected.tier} / ${scenario.expected.driverRecovers} MAD`,
        );
      }
    },
    [onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    setResult(null);
    setHoursUntilStart(0);
    setLog([]);
    onActivity(null as unknown as string);
    toast("Cancellation reset", { description: "Results cleared." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <CancellationCanvas result={result} hoursUntilStart={hoursUntilStart} />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <CancellationControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
