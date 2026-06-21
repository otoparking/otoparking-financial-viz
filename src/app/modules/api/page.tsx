"use client";

import { useState, useCallback } from "react";
import type { ModulePageProps } from "@/types/modules";
import type { ApiEndpoint, ApiLogEntry } from "@/types/api-tester";
import ApiTesterCanvas from "@/components/ApiTesterCanvas";
import ApiTesterControlPanel from "@/components/ApiTesterControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ApiModule({ onActivity }: ModulePageProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    null,
  );
  const [log, setLog] = useState<ApiLogEntry[]>([]);

  const addLog = useCallback((method: string, path: string, detail: string) => {
    setLog((prev) => [
      {
        id: makeId(),
        timestamp: new Date(),
        method,
        path,
        status: 200,
        detail,
      },
      ...prev,
    ]);
  }, []);

  const selectEndpoint = useCallback(
    (ep: ApiEndpoint) => {
      setSelectedEndpoint(ep);
      onActivity(`${ep.method} ${ep.path}`);
      toast(`${ep.method} ${ep.path}`, { description: ep.description });
      addLog(ep.method, ep.path, ep.description);
    },
    [onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    setSelectedEndpoint(null);
    setLog([]);
    onActivity(null as unknown as string);
    toast("API tester cleared", { description: "Endpoint deselected." });
  }, [onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <ApiTesterCanvas selectedEndpoint={selectedEndpoint} />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <ApiTesterControlPanel
          onSelectEndpoint={selectEndpoint}
          onReset={resetSim}
          log={log}
        />
      </div>
    </div>
  );
}
