"use client";

import { useState, useCallback, useRef } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  GateScenario,
  GateSession,
  GateLogEntry,
  CarAnimData,
  GateEventType,
  GateSessionStatus,
} from "@/types/gate";
import GateCanvas from "@/components/GateCanvas";
import GateControlPanel from "@/components/GateControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Plate colors for visual variety */
const PLATE_COLORS = ["#378ADD", "#BA7517", "#8B5CF6", "#F59E0B", "#EC4899"];

function makeCarAnim(
  plate: string,
  entering: boolean,
  colorIndex: number,
): CarAnimData {
  const x = entering ? -60 : 420;
  const targetX = entering ? 80 : 500;
  return {
    id: makeId(),
    x,
    y: 80,
    targetX,
    targetY: 80,
    startTime: performance.now(),
    color: PLATE_COLORS[colorIndex % PLATE_COLORS.length],
    plate,
    entering,
  };
}

export default function GateModule({ onActivity }: ModulePageProps) {
  const [sessions, setSessions] = useState<GateSession[]>([]);
  const [log, setLog] = useState<GateLogEntry[]>([]);
  const [activeEvent, setActiveEvent] = useState<GateEventType | null>(null);
  const [currentStep, setCurrentStep] = useState("");
  const [cars, setCars] = useState<CarAnimData[]>([]);
  const [running, setRunning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const addLog = useCallback((event: string, detail: string) => {
    setLog((prev) => [
      {
        id: makeId(),
        timestamp: new Date(),
        event,
        detail,
      },
      ...prev,
    ]);
  }, []);

  const runScenario = useCallback(
    (scenario: GateScenario) => {
      clearTimeouts();
      setRunning(true);
      setActiveEvent(null);
      setCars([]);

      onActivity(`[${scenario.number}] ${scenario.name}`);
      toast(`[${scenario.number}] ${scenario.name}`, {
        description: scenario.description,
      });

      addLog(scenario.number, `Starting: ${scenario.name}`);

      let cumulativeDelay = 0;

      scenario.steps.forEach((step, stepIndex) => {
        cumulativeDelay += step.delayMs ?? 1000;

        const timer = setTimeout(() => {
          setActiveEvent(step.type);
          setCurrentStep(step.id);
          addLog(step.type.replace(/-/g, " ").toUpperCase(), step.description);

          // Car animation on scan events
          if (step.type === "entry-scan") {
            const plate =
              scenario.id === "booking-entry"
                ? "77777-B-7"
                : scenario.id === "unknown-entry"
                  ? "11111-X-9"
                  : "99999-A-1";
            setCars((prev) => [...prev, makeCarAnim(plate, true, stepIndex)]);
          }

          if (step.type === "exit-scan") {
            const plate =
              scenario.id === "exit-denied"
                ? "77777-B-7"
                : scenario.id === "cash-exit"
                  ? "11111-X-9"
                  : "99999-A-1";
            setCars((prev) => [...prev, makeCarAnim(plate, false, stepIndex)]);
          }

          // Session state changes
          if (step.type === "entry-granted") {
            const plate =
              scenario.id === "booking-entry"
                ? "77777-B-7"
                : scenario.id === "ticket-digitalize"
                  ? "T-4821"
                  : "99999-A-1";
            const newSession: GateSession = {
              id: makeId(),
              plate,
              vehicleType: "CAR",
              entryTime: Date.now(),
              exitTime: null,
              status: "active",
              paymentMethod: null,
              fare: 0,
              hasBooking: scenario.id === "booking-entry",
            };
            setSessions((prev) => [...prev, newSession]);
          }

          if (step.type === "exit-granted") {
            const plate =
              scenario.id === "cash-exit" ? "11111-X-9" : "99999-A-1";
            setSessions((prev) =>
              prev.map((s) =>
                s.plate === plate
                  ? {
                      ...s,
                      status: "completed" as GateSessionStatus,
                      exitTime: Date.now(),
                    }
                  : s,
              ),
            );
          }

          if (step.type === "orphan-detected") {
            setSessions((prev) => {
              const active = prev.filter((s) => s.status === "active");
              if (active.length === 0) {
                // Create an orphan session if none active
                const orphan: GateSession = {
                  id: makeId(),
                  plate: "99999-A-1",
                  vehicleType: "CAR",
                  entryTime: Date.now() - 25 * 3600 * 1000,
                  exitTime: null,
                  status: "orphan",
                  paymentMethod: null,
                  fare: 192,
                  hasBooking: false,
                };
                return [...prev, orphan];
              }
              return prev.map((s) =>
                s.status === "active"
                  ? { ...s, status: "orphan" as GateSessionStatus, fare: 192 }
                  : s,
              );
            });
          }

          if (step.type === "cash-payment") {
            setSessions((prev) =>
              prev.map((s) =>
                s.plate === "11111-X-9"
                  ? { ...s, paymentMethod: "cash" as const, fare: 50 }
                  : s,
              ),
            );
          }

          // Info about fare
          if (step.type === "info" && step.description.includes("Fare:")) {
            const fareMatch = step.description.match(/Fare:\s*(\d+)\s*MAD/);
            if (fareMatch) {
              const plate =
                scenario.id === "exit-denied"
                  ? "77777-B-7"
                  : scenario.id === "cash-exit"
                    ? "11111-X-9"
                    : "99999-A-1";
              setSessions((prev) =>
                prev.map((s) =>
                  s.plate === plate
                    ? { ...s, fare: parseInt(fareMatch[1]) }
                    : s,
                ),
              );
            }
          }
        }, cumulativeDelay);

        timeoutRef.current.push(timer);
      });

      // Final cleanup
      const finalTimer = setTimeout(() => {
        setRunning(false);
        setActiveEvent(null);
        setCurrentStep("");
        setCars([]);
        onActivity(null as unknown as string);
        addLog("DONE", `${scenario.number} ${scenario.name} complete`);
      }, cumulativeDelay + 1500);

      timeoutRef.current.push(finalTimer);
    },
    [clearTimeouts, onActivity, addLog],
  );

  const resetSim = useCallback(() => {
    clearTimeouts();
    setRunning(false);
    setSessions([]);
    setLog([]);
    setActiveEvent(null);
    setCurrentStep("");
    setCars([]);
    onActivity(null as unknown as string);
    toast("Gate reset", { description: "All sessions cleared." });
  }, [clearTimeouts, onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <GateCanvas
          sessions={sessions}
          activeEvent={activeEvent}
          currentStep={currentStep}
          cars={cars}
          running={running}
        />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <GateControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
          running={running}
        />
      </div>
    </div>
  );
}
