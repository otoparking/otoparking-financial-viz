export type NotificationChannel = "push" | "email" | "sms" | "whatsapp";

export type WorkflowId =
  | "push"
  | "email"
  | "sms"
  | "whatsapp"
  | "push-email"
  | "push-sms"
  | "push-whatsapp"
  | "email-sms"
  | "email-whatsapp"
  | "whatsapp-sms"
  | "push-email-sms"
  | "push-email-whatsapp"
  | "push-whatsapp-sms"
  | "email-whatsapp-sms"
  | "push-email-whatsapp-sms";

export interface WorkflowMeta {
  id: WorkflowId;
  channels: NotificationChannel[];
  label: string;
  useCase: string;
}

export interface NotificationPayload {
  pushSubject: string;
  pushBody: string;
  emailSubject: string;
  emailBody: string;
  route: string;
  smsBody: string;
}

export interface NotificationScenario {
  id: string;
  name: string;
  description: string;
  workflowId: WorkflowId;
  /** The notification class from the backend */
  sourceClass: string;
  payload: NotificationPayload;
  triggerEvent: string;
  /** Optional email template path (classpath), e.g. "/templates/email/transfer-sent.html" */
  template?: string;
  /** Template variable substitutions */
  templateVars?: Record<string, string>;
}

export interface NotifLogEntry {
  id: string;
  timestamp: Date;
  channel: string;
  event: string;
  detail: string;
  success: boolean;
}

export interface ChannelAnimData {
  id: string;
  fromChannel: string;
  toChannel: string;
  startTime: number;
  success: boolean;
}
