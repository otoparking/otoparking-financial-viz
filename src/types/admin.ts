export type AdminRole = "super_admin" | "tenant_admin" | "manager";

export type AdminPermission = "read" | "write" | "delete" | "none";

export interface AdminModuleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  permissions: Record<AdminRole, AdminPermission>;
}

export interface AdminScenario {
  id: string;
  name: string;
  description: string;
  role: AdminRole;
  modules: string[];
}

export interface AdminLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}
