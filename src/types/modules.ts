import type { ReactNode } from "react";
import type { MonitorEvent } from "@/components/MonitorPanel";

/** Every module in the OtoParking Test Center */
export type ModuleId =
  | "financial"
  | "gate"
  | "auth"
  | "notifications"
  | "admin"
  | "pricing"
  | "cancellation"
  | "settlement"
  | "api"
  | "infra";

/** Display metadata for a single module shown in the left sidebar */
export interface ModuleMeta {
  id: ModuleId;
  /** Short label in the sidebar (e.g. "Finance") */
  label: string;
  /** Longer label in the header (e.g. "Financial Flows") */
  headerLabel: string;
  /** One-line subtitle shown in the sidebar under the label */
  subtitle: string;
  /** Source PRD document(s) */
  prdRef: string;
  /** Icon component for the sidebar */
  icon: ReactNode;
}

/** Runtime shape of a module's exported page component */
export interface ModulePageProps {
  /** Called when a scenario/test is started — drives header updates */
  onActivity: (label: string) => void;
  /** Add an event to the global monitor panel */
  onMonitor: (
    type: MonitorEvent["type"],
    label: string,
    detail: string,
    status?: MonitorEvent["status"],
    meta?: MonitorEvent["meta"],
    durationMs?: number,
  ) => void;
}
