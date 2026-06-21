"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type { LambdaDef, InfraLogEntry } from "@/types/infra";
import InfraCanvas from "@/components/InfraCanvas";
import InfraControlPanel from "@/components/InfraControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function InfraModule({ onActivity }: ModulePageProps) {
  const [selectedLambda, setSelectedLambda] = useState<LambdaDef | null>(null);
  const [log, setLog] = useState<InfraLogEntry[]>([]);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  const selectLambda = useCallback(
    (lambda: LambdaDef) => {
      setSelectedLambda(lambda);
      onActivity(`${lambda.name} — ${lambda.handler}`);
      toast(lambda.name, { description: lambda.description });
      addLog(
        "SELECT",
        `${lambda.name} · ${lambda.memory}MB · ${lambda.routes.length} route(s)`,
      );
    },
    [onActivity, addLog],
  );

  const deselectLambda = useCallback(() => {
    setSelectedLambda(null);
    onActivity(null as unknown as string);
  }, [onActivity]);

  const resetSim = useCallback(() => {
    setSelectedLambda(null);
    setLog([]);
    onActivity(null as unknown as string);
    toast("Infra cleared", { description: "Lambda deselected." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <InfraCanvas
          selectedLambda={selectedLambda}
          onSelectLambda={selectLambda}
          onDeselect={deselectLambda}
        />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <InfraControlPanel
          onSelectLambda={selectLambda}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
