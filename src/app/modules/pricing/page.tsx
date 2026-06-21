"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  PricingScenario,
  PricingResult,
  PricingLogEntry,
  TariffBracket,
} from "@/types/pricing";
import { OULFA_TARIFF } from "@/app/modules/pricing/scenarios";
import PricingCanvas from "@/components/PricingCanvas";
import PricingControlPanel from "@/components/PricingControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeFare(
  input: PricingScenario["input"],
  brackets: TariffBracket[],
): PricingResult {
  const durationMinutes =
    (input.exitHour - input.entryHour) * 60 +
    (input.exitMinute - input.entryMinute);
  const durationSeconds = durationMinutes * 60;

  const steps = [
    {
      id: "1",
      label: "Resolve vehicle type",
      detail: `vehicleType = "${input.vehicleType}"`,
      status: "done" as const,
    },
    {
      id: "2",
      label: "Compute duration",
      detail: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m (${durationSeconds}s)`,
      status: "done" as const,
    },
    {
      id: "3",
      label: "Query tariff",
      detail: `parking_tariffs WHERE parking_id=${input.parkingId} AND vehicle_type="${input.vehicleType}" → grace=${input.gracePeriodMinutes}m`,
      status: "done" as const,
    },
  ];

  // Grace check
  if (durationSeconds <= input.gracePeriodMinutes * 60) {
    steps.push({
      id: "4",
      label: "Grace check PASSED",
      detail: `${durationMinutes}m ≤ ${input.gracePeriodMinutes}m grace → fare = 0 MAD (free)`,
      status: "done" as const,
    });
    return {
      durationMinutes,
      withinGrace: true,
      totalFare: 0,
      bracketUsed: null,
      steps,
    };
  }

  steps.push({
    id: "4",
    label: "Grace check FAILED",
    detail: `duration ${durationMinutes}m > grace ${input.gracePeriodMinutes}m → continue to pricing`,
    status: "done" as const,
  });

  // Ceiling hours
  const ceilingHours = Math.ceil(durationMinutes / 60);
  steps.push({
    id: "5",
    label: "Ceiling hours",
    detail: `Math.ceil(${durationMinutes} / 60) = ${ceilingHours} hours`,
    status: "done" as const,
  });

  // Find bracket
  let bracketUsed: TariffBracket | null = null;
  for (const b of brackets) {
    if (ceilingHours > b.hourStart && ceilingHours <= b.hourEnd) {
      bracketUsed = b;
      break;
    }
  }
  if (!bracketUsed) bracketUsed = brackets[brackets.length - 1];

  if (bracketUsed.type === "Narrow") {
    const total = bracketUsed.price;
    steps.push({
      id: "6",
      label: "Narrow bracket",
      detail: `${bracketUsed.hourStart}h–${bracketUsed.hourEnd}h flat rate → ${total} MAD`,
      status: "done" as const,
    });
    return {
      durationMinutes,
      withinGrace: false,
      totalFare: total,
      bracketUsed,
      steps,
    };
  }

  // Wide bracket: find last narrow
  const lastNarrow = [...brackets].reverse().find((b) => b.type === "Narrow");
  if (lastNarrow) {
    const overflowHours = ceilingHours - lastNarrow.hourEnd;
    const total = lastNarrow.price + overflowHours * bracketUsed.price;
    steps.push({
      id: "6",
      label: "Wide bracket + overflow",
      detail: `lastNarrow=[${lastNarrow.hourStart}h–${lastNarrow.hourEnd}h] ${lastNarrow.price} MAD + ${overflowHours} × ${bracketUsed.price} MAD = ${total} MAD`,
      status: "done" as const,
    });
    return {
      durationMinutes,
      withinGrace: false,
      totalFare: total,
      bracketUsed,
      steps,
    };
  }

  const total = ceilingHours * bracketUsed.price;
  steps.push({
    id: "6",
    label: "Wide bracket — per hour",
    detail: `${ceilingHours} × ${bracketUsed.price} MAD = ${total} MAD`,
    status: "done" as const,
  });
  return {
    durationMinutes,
    withinGrace: false,
    totalFare: total,
    bracketUsed,
    steps,
  };
}

export default function PricingModule({ onActivity }: ModulePageProps) {
  const [result, setResult] = useState<PricingResult | null>(null);
  const [log, setLog] = useState<PricingLogEntry[]>([]);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  const runScenario = useCallback(
    (scenario: PricingScenario) => {
      onActivity(scenario.name);
      toast(scenario.name, { description: scenario.description });
      addLog(
        "COMPUTE",
        `${scenario.input.lotName} · ${scenario.input.entryHour}:${String(scenario.input.entryMinute).padStart(2, "0")} → ${scenario.input.exitHour}:${String(scenario.input.exitMinute).padStart(2, "0")}`,
      );

      const res = computeFare(scenario.input, OULFA_TARIFF);
      setResult(res);

      addLog(
        "RESULT",
        res.withinGrace
          ? "GRACE — Free"
          : `${res.totalFare} MAD · Bracket ${res.bracketUsed?.hourStart}h–${res.bracketUsed?.hourEnd}h`,
      );
      if (scenario.expectedFare === res.totalFare) {
        addLog(
          "✓ PASS",
          `Expected ${scenario.expectedFare} MAD = Got ${res.totalFare} MAD`,
        );
      } else {
        addLog(
          "✗ FAIL",
          `Expected ${scenario.expectedFare} MAD ≠ Got ${res.totalFare} MAD`,
        );
      }
    },
    [onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    setResult(null);
    setLog([]);
    onActivity(null as unknown as string);
    toast("Pricing reset", { description: "Pipeline cleared." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <PricingCanvas result={result} brackets={OULFA_TARIFF} />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <PricingControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
