export type AuthStepType =
  | "send-otp"
  | "verify-otp"
  | "otp-verified"
  | "otp-failed"
  | "resend-otp"
  | "token-issued"
  | "token-refreshed"
  | "token-expired"
  | "logout"
  | "complete-account"
  | "login-password"
  | "login-success"
  | "login-failed"
  | "info";

export interface AuthStep {
  id: string;
  type: AuthStepType;
  description: string;
  delayMs?: number;
}

export interface AuthScenario {
  id: string;
  name: string;
  description: string;
  prdSection: string;
  steps: AuthStep[];
}

export interface AuthLogEntry {
  id: string;
  timestamp: Date;
  event: string;
  detail: string;
}

/** Token state tracking during simulation */
export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  expiresIn: number;
  status: "none" | "active" | "expired" | "refreshing" | "logged-out";
}

/** OTP state tracking */
export interface OtpState {
  loginSessionId: string | null;
  email: string;
  otpSent: boolean;
  otpVerified: boolean;
  attempts: number;
  expiresAt: number | null;
}
