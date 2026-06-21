export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  module: string;
  description: string;
  requestBody?: Record<string, unknown>;
  responseExample: Record<string, unknown>;
  notes?: string;
}

export interface ApiModuleGroup {
  name: string;
  prefix: string;
  endpoints: ApiEndpoint[];
}

export interface ApiLogEntry {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  status: number;
  detail: string;
}
