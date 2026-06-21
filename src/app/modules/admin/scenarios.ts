import type { AdminModuleDef, AdminScenario } from "@/types/admin";

/** All 13 admin modules from PRD_ADMIN.md with RBAC permissions */
export const ADMIN_MODULES: AdminModuleDef[] = [
  { id: "dashboard", name: "Dashboard", description: "KPI cards, charts, real-time metrics", icon: "📊", permissions: { super_admin: "read", tenant_admin: "read", manager: "read" } },
  { id: "tenants", name: "Tenant Management", description: "Create, suspend, delete tenants", icon: "🏢", permissions: { super_admin: "write", tenant_admin: "none", manager: "none" } },
  { id: "parking-lots", name: "Parking Lots", description: "Lot config, gates, QR codes", icon: "🅿️", permissions: { super_admin: "write", tenant_admin: "write", manager: "read" } },
  { id: "pricing", name: "Pricing & Tariffs", description: "Hourly rates, periods, special offers", icon: "💲", permissions: { super_admin: "write", tenant_admin: "write", manager: "read" } },
  { id: "bookings", name: "Booking Oversight", description: "Booking list, active sessions, details", icon: "📋", permissions: { super_admin: "read", tenant_admin: "read", manager: "read" } },
  { id: "financial", name: "Financial Operations", description: "Wallets, settlements, adjustments", icon: "💰", permissions: { super_admin: "write", tenant_admin: "read", manager: "none" } },
  { id: "drivers", name: "Driver Management", description: "Driver list, detail, status", icon: "👤", permissions: { super_admin: "read", tenant_admin: "none", manager: "none" } },
  { id: "agents", name: "Agent Management", description: "Agent list, lot assignments, shifts", icon: "🛡️", permissions: { super_admin: "read", tenant_admin: "write", manager: "write" } },
  { id: "sub-users", name: "Sub-User Management", description: "Manager creates sub-users", icon: "👥", permissions: { super_admin: "none", tenant_admin: "none", manager: "write" } },
  { id: "reviews", name: "Reviews & Quality", description: "Driver reviews, ratings, moderation", icon: "⭐", permissions: { super_admin: "read", tenant_admin: "read", manager: "read" } },
  { id: "notifications", name: "Notifications", description: "Broadcasts, lot announcements", icon: "🔔", permissions: { super_admin: "write", tenant_admin: "write", manager: "none" } },
  { id: "audit", name: "Audit Log", description: "Immutable event history", icon: "📜", permissions: { super_admin: "read", tenant_admin: "none", manager: "none" } },
  { id: "settings", name: "System Settings", description: "Platform config, feature flags", icon: "⚙️", permissions: { super_admin: "write", tenant_admin: "none", manager: "none" } },
];

export const ADMIN_SCENARIOS: AdminScenario[] = [
  {
    id: "super-admin-view",
    name: "Super Admin Dashboard",
    description: "Full platform view — all tenants, all modules, system settings",
    role: "super_admin",
    modules: ADMIN_MODULES.map((m) => m.id),
  },
  {
    id: "tenant-admin-view",
    name: "Tenant Admin Dashboard",
    description: "Tenant-scoped — own lots, bookings, agents, financials",
    role: "tenant_admin",
    modules: ["dashboard", "parking-lots", "pricing", "bookings", "financial", "agents", "reviews", "notifications"],
  },
  {
    id: "manager-view",
    name: "Manager Dashboard",
    description: "Operational — assigned lots, agents, sub-users, reviews",
    role: "manager",
    modules: ["dashboard", "parking-lots", "pricing", "bookings", "agents", "sub-users", "reviews"],
  },
];
