import type { ModuleId, ModuleMeta } from "@/types/modules";
import {
  Banknote,
  DoorOpen,
  Fingerprint,
  Bell,
  Building2,
  Calculator,
  Ban,
  Landmark,
  Plug,
  Server,
} from "lucide-react";

/**
 * Master registry of all 10 OtoParking test modules.
 * Adding a new module = add one entry here + create its folder under modules/.
 */
export const MODULES: ModuleMeta[] = [
  {
    id: "financial",
    label: "Finance",
    headerLabel: "Financial Flows",
    subtitle: "Wallet architecture · 17 scenarios",
    prdRef: "PRD_FINANCIAL_ARCHITECTURE.md",
    icon: <Banknote className="size-4" />,
  },
  {
    id: "gate",
    label: "Gate",
    headerLabel: "OtoGate Simulator",
    subtitle: "QR entry/exit · 9 use cases",
    prdRef: "PRD_GATE_V2.md",
    icon: <DoorOpen className="size-4" />,
  },
  {
    id: "auth",
    label: "Auth",
    headerLabel: "Auth Flow Tester",
    subtitle: "OTP · Tokens · Noscera",
    prdRef: "AUTH_NOSCERA.md",
    icon: <Fingerprint className="size-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    headerLabel: "Notification Center",
    subtitle: "PushCaster · 15 workflows",
    prdRef: "NOTIFICATIONS.md",
    icon: <Bell className="size-4" />,
  },
  {
    id: "admin",
    label: "Admin",
    headerLabel: "Admin Portal",
    subtitle: "RBAC · 13 modules · Dashboard",
    prdRef: "PRD_ADMIN.md",
    icon: <Building2 className="size-4" />,
  },
  {
    id: "pricing",
    label: "Pricing",
    headerLabel: "Pricing Engine",
    subtitle: "Tariffs · Grace · Brackets",
    prdRef: "PRICING_ARCHITECTURE.md",
    icon: <Calculator className="size-4" />,
  },
  {
    id: "cancellation",
    label: "Cancel",
    headerLabel: "Cancellation Engine",
    subtitle: "Decision tree · Refund tiers",
    prdRef: "CANCELLATION_POLICY.md",
    icon: <Ban className="size-4" />,
  },
  {
    id: "settlement",
    label: "Settlement",
    headerLabel: "Settlement Pipeline",
    subtitle: "Month-end · Cash netting",
    prdRef: "FINANCIAL_MODULE_PRD.md",
    icon: <Landmark className="size-4" />,
  },
  {
    id: "api",
    label: "API Tester",
    headerLabel: "API Integration",
    subtitle: "Endpoints · Envelope · Mobile",
    prdRef: "PRD_INTEGRATION.md",
    icon: <Plug className="size-4" />,
  },
  {
    id: "infra",
    label: "Infra",
    headerLabel: "Infrastructure Map",
    subtitle: "Lambdas · SAM · AWS",
    prdRef: "PRD_LAMBDA_MIGRATION.md",
    icon: <Server className="size-4" />,
  },
];

/** Quick lookup by ID */
export function getModule(id: ModuleId): ModuleMeta {
  return MODULES.find((m) => m.id === id)!;
}
