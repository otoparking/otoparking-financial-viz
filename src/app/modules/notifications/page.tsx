"use client";

import { useState, useCallback, useRef } from "react";
import type { ModulePageProps } from "@/types/modules";
import type {
  NotificationScenario,
  NotifLogEntry,
  NotificationChannel,
  ChannelAnimData,
  NotificationPayload,
} from "@/types/notifications";
import NotificationsCanvas from "@/components/NotificationsCanvas";
import NotificationsControlPanel from "@/components/NotificationsControlPanel";
import { toast } from "sonner";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function NotificationsModule({
  onActivity,
  onMonitor,
}: ModulePageProps) {
  const [log, setLog] = useState<NotifLogEntry[]>([]);
  const [activeChannels, setActiveChannels] = useState<NotificationChannel[]>(
    [],
  );
  const [activePayload, setActivePayload] =
    useState<NotificationPayload | null>(null);
  const [animations, setAnimations] = useState<ChannelAnimData[]>([]);
  const [running, setRunning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const addLog = useCallback(
    (channel: string, event: string, detail: string, success: boolean) => {
      setLog((prev) => [
        {
          id: makeId(),
          timestamp: new Date(),
          channel,
          event,
          detail,
          success,
        },
        ...prev,
      ]);
    },
    [],
  );

  const runScenario = useCallback(
    async (scenario: NotificationScenario) => {
      clearTimeouts();
      setRunning(true);
      setActivePayload(scenario.payload);
      setAnimations([]);

      onActivity(scenario.name);
      toast(scenario.name, {
        description: `Workflow: ${scenario.workflowId} · Source: ${scenario.sourceClass}`,
      });
      addLog("system", "TRIGGER", scenario.triggerEvent, true);

      // Determine channels from workflow
      const chMap: Record<string, NotificationChannel> = {
        push: "push",
        email: "email",
        sms: "sms",
        whatsapp: "whatsapp",
      };
      const channels = scenario.workflowId
        .split("-")
        .filter((c): c is NotificationChannel => c in chMap);
      setActiveChannels(channels);

      // ── Call the real Pushcaster API via our Next.js route ───────────────
      const startTime = performance.now();

      onMonitor?.(
        "api",
        `POST /api/notifications/trigger`,
        `Workflow: ${scenario.workflowId} · ${scenario.sourceClass}`,
        "pending",
        {
          workflowId: scenario.workflowId,
          sourceClass: scenario.sourceClass,
          channels: channels.join(", "),
        },
      );

      try {
        // Scenarios with a dedicated backend endpoint use `scenarioId`
        // so the backend calls the real PushcasterService.notifyXxx() method
        // (identical template rendering to production).
        // Scenarios without a dedicated endpoint use the generic trigger.
        const reqBody: Record<string, unknown> = {
          workflowId: scenario.workflowId,
          payload: {
            pushSubject: scenario.payload.pushSubject,
            pushBody: scenario.payload.pushBody,
            emailSubject: scenario.payload.emailSubject,
            emailBody: scenario.payload.emailBody,
            smsBody: scenario.payload.smsBody,
            route: scenario.payload.route,
          },
        };

        // Map of scenario IDs that have a dedicated backend endpoint
        const DEDICATED = new Set([
          "transfer-sent",
          "transfer-received",
          "transfer-pending",
          "gate-entry",
          "gate-exit",
          "gate-exit-denied",
          "gate-orphan",
        ]);

        if (DEDICATED.has(scenario.id)) {
          reqBody.scenarioId = scenario.id;
        } else if (scenario.template) {
          // Generic trigger with manual template rendering
          reqBody.template = scenario.template;
          reqBody.templateVars = scenario.templateVars ?? {};
        }

        const res = await fetch("/api/notifications/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        });

        const durationMs = Math.round(performance.now() - startTime);
        const data = await res.json();

        if (data.success) {
          addLog(
            "system",
            "PUSHCASTER",
            `✅ Delivered to ${data.channels?.join(", ") ?? scenario.workflowId} — HTTP ${data.status}`,
            true,
          );
          onMonitor?.(
            "api",
            `POST /api/notifications/trigger`,
            `✅ Delivered — HTTP ${data.status} · ${data.channels?.join(", ") ?? scenario.workflowId}`,
            "ok",
            {
              status: data.status,
              channels: data.channels?.join(", ") ?? scenario.workflowId,
              subscriberId: data.subscriberId,
              email: data.email,
            },
            durationMs,
          );
        } else {
          addLog(
            "system",
            "PUSHCASTER",
            `❌ ${data.message ?? "Unknown error"}`,
            false,
          );
          onMonitor?.(
            "api",
            `POST /api/notifications/trigger`,
            `❌ Failed: ${data.message ?? "Unknown error"}`,
            "error",
            { error: data.message ?? "unknown" },
            durationMs,
          );
        }
      } catch (err) {
        const durationMs = Math.round(performance.now() - startTime);
        const msg = err instanceof Error ? err.message : "Network error";
        addLog("system", "PUSHCASTER", `❌ ${msg}`, false);
        onMonitor?.(
          "api",
          `POST /api/notifications/trigger`,
          `❌ Exception: ${msg}`,
          "error",
          { error: msg },
          durationMs,
        );
      }

      // Animate each channel delivery with staggered delays (visual only)
      channels.forEach((ch, i) => {
        const delay = 600 + i * 500;
        const timer = setTimeout(() => {
          const anim: ChannelAnimData = {
            id: makeId(),
            fromChannel: "pushcaster",
            toChannel: ch,
            startTime: performance.now(),
            success: true,
          };
          setAnimations((prev) => [...prev, anim]);

          // Log per-channel delivery
          const chLabel = ch.charAt(0).toUpperCase() + ch.slice(1);
          let detail = "";
          if (ch === "push" && scenario.payload.pushSubject)
            detail = scenario.payload.pushSubject;
          else if (ch === "email" && scenario.payload.emailSubject)
            detail = scenario.payload.emailSubject;
          else if (ch === "sms" && scenario.payload.smsBody)
            detail = scenario.payload.smsBody;
          else if (ch === "whatsapp") detail = "WhatsApp delivery";

          addLog(chLabel, "DELIVERED", detail || "Sent", true);

          // Clean up animation after 1.5s
          setTimeout(() => {
            setAnimations((prev) => prev.filter((a) => a.id !== anim.id));
          }, 1500);
        }, delay);

        timeoutRef.current.push(timer);
      });

      // Final cleanup
      const finalDelay = 600 + channels.length * 500 + 1500;
      const finalTimer = setTimeout(() => {
        setRunning(false);
        setActiveChannels([]);
        setActivePayload(null);
        onActivity(null as unknown as string);
        addLog(
          "system",
          "DONE",
          `${scenario.name} — sent to ${channels.length} channel(s) via Pushcaster`,
          true,
        );
      }, finalDelay);

      timeoutRef.current.push(finalTimer);
    },
    [clearTimeouts, onActivity, onMonitor, addLog],
  );

  const resetSim = useCallback(() => {
    clearTimeouts();
    setRunning(false);
    setLog([]);
    setActiveChannels([]);
    setActivePayload(null);
    setAnimations([]);
    onActivity(null as unknown as string);
    toast("Notifications reset", { description: "Log cleared." });
  }, [clearTimeouts, onActivity]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[65%] relative overflow-hidden">
        <NotificationsCanvas
          activeChannels={activeChannels}
          activePayload={activePayload}
          animations={animations}
          running={running}
        />
      </div>
      <div className="w-[35%] min-w-[360px] flex flex-col overflow-hidden border-l border-border">
        <NotificationsControlPanel
          onRunScenario={runScenario}
          onReset={resetSim}
          log={log}
          running={running}
        />
      </div>
    </div>
  );
}
