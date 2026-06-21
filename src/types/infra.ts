export interface LambdaDef {
  id: string;
  name: string;
  handler: string;
  memory: number;
  timeout: number;
  routes: string[];
  snapStart: boolean;
  description: string;
}

export interface ExternalService {
  id: string;
  name: string;
  url: string;
  envVar: string;
  description: string;
}

export interface InfraLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}
