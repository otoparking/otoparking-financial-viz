"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type { AdminRole, AdminScenario, AdminLogEntry } from "@/types/admin";
import { ADMIN_SCENARIOS } from "@/app/modules/admin/scenarios";
import AdminCanvas from "@/components/AdminCanvas";
import AdminControlPanel from "@/components/AdminControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminModule({ onActivity }: ModulePageProps) {
  const [activeRole, setActiveRole] = useState<AdminRole | null>(null);
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [log, setLog] = useState<AdminLogEntry[]>([]);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      { id: makeId(), timestamp: new Date(), event, detail },
      ...prev,
    ]);
  }, []);

  const runScenario = useCallback(
    (scenario: AdminScenario) => {
      setActiveRole(scenario.role);
      setVisibleModules(scenario.modules);
      onActivity(scenario.name);
      toast(scenario.name, { description: scenario.description });
      addLog(
        "ROLE",
        `${scenario.role.replace(/_/g, " ").toUpperCase()} — ${scenario.modules.length} modules`,
      );
    },
    [onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    setActiveRole(null);
    setVisibleModules([]);
    setLog([]);
    onActivity(null as unknown as string);
    toast("Admin reset", { description: "No role selected." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <AdminCanvas activeRole={activeRole} visibleModules={visibleModules} />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <AdminControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
