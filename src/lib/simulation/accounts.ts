/**
 * Simulation account creation — creates real Noscera accounts + provisions
 * them in OtoParking for multi-actor financial simulations.
 *
 * @module lib/simulation/accounts
 */

import {
  getToken,
  loginAdmin,
  loginDriver,
  setToken,
} from "@/lib/auth-service";
import type { SimAccount, ActorPool } from "./types";

const ADMIN_API = "/api/admin";
const MAIN_API = "/api/backend";
const ADMIN_EMAIL = "admin@otoparking.com";
const ADMIN_PASSWORD = "Admin@12345";
const PARKING_ID = 61;

async function getAdminToken(): Promise<string | null> {
  let token = await getToken("admin");
  if (!token) {
    const result = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (result.success && result.token) token = result.token;
  }
  return token;
}

/* ── Driver Creation ───────────────────────────────────────────────── */

/**
 * Creates a simulation driver account end-to-end:
 * 1. Calls admin backend POST /api/admin/simulation/create-driver
 *    → Noscera account + OtoParking users row
 * 2. Logs in through OtoParking POST /auth/login
 *    → AuthFilter lazy-provisions the wallet
 * 3. Returns the full SimAccount
 */
export async function createDriver(
  email: string,
  password: string,
  firstName: string = "Sim",
  lastName: string = "Driver",
  phone?: string,
): Promise<SimAccount> {
  const token = await getAdminToken();
  if (!token) throw new Error("Admin auth failed for driver creation");

  // Step 1: Create the account via admin backend (require unique phone per driver)
  const driverPhone = phone ?? "+212600000000";
  const createRes = await fetch(`${ADMIN_API}/simulation/create-driver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      phone: driverPhone,
    }),
  });
  const createJson = await createRes.json();
  let accountId: string | undefined;
  let driverPassword = password;

  if (createRes.ok) {
    accountId = createJson.data?.accountId as string;
  } else {
    // Creation may have failed because the account already exists.
    // Try to login and use the existing account.
    console.warn(
      `[SIM] create-driver failed (${createRes.status}), attempting login recovery: ${createJson.message}`,
    );
    const recoveryRes = await fetch(`${MAIN_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const recoveryJson = await recoveryRes.json();
    if (recoveryRes.ok) {
      const userId =
        recoveryJson.data?.user?.id ?? recoveryJson.data?.accountId;
      if (userId) {
        accountId = userId as string;
        console.log(`[SIM] Recovered existing driver: ${accountId}`);
      }
    }
    if (!accountId) {
      throw new Error(
        `Driver creation failed and recovery login also failed: ${createJson.message ?? createRes.status}`,
      );
    }
  }
  if (!accountId) throw new Error("No accountId for driver");

  // Step 2: Login through OtoParking to get a valid JWT
  const loginRes = await fetch(`${MAIN_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(
      `Driver login failed: ${loginJson.message ?? loginRes.status}`,
    );
  }
  const accessToken: string =
    loginJson.data?.accessToken ?? loginJson.accessToken;
  if (accessToken) {
    setToken("driver", accessToken, 86400);
  }

  // Step 3: Ensure wallet exists via wallet/create
  let walletId: number | undefined;
  const walletRes = await fetch(`${MAIN_API}/wallet/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const walletJson = await walletRes.json();
  if (walletRes.ok) {
    walletId = walletJson.data?.walletId as number;
    console.log(`[SIM] Wallet created: id=${walletId}`);
  } else if (walletRes.status !== 409) {
    // 409 = wallet already exists — that's fine
    console.warn(
      `[SIM] Wallet creation returned ${walletRes.status}: ${walletJson.message}`,
    );
  }

  return {
    label: `${firstName} ${lastName}`,
    accountId,
    email,
    password,
    role: "driver",
    token: accessToken,
    walletId,
  };
}

/* ── Agent Creation ────────────────────────────────────────────────── */

/**
 * Creates a simulation agent account via the admin backend's existing
 * POST /api/admin/agents endpoint. This handles Noscera account creation,
 * guardian row, and lot assignment in one transaction.
 */
export async function createAgent(
  email: string,
  firstName: string = "Sim",
  lastName: string = "Agent",
  lotIds: number[] = [PARKING_ID],
  phone?: string,
): Promise<SimAccount> {
  // Agents require TENANT_ADMIN role — use tenant token, not admin
  const {
    loginTenant,
    getToken: getAuthToken,
    setToken: setAuthToken,
  } = await import("@/lib/auth-service");
  let token = await getAuthToken("tenant");
  if (!token) {
    const result = await loginTenant(
      "test-tenant@otoparking.com",
      "Test-Tenant2026",
    );
    if (result.success && result.token) {
      token = result.token;
      setAuthToken("tenant", token, 86400);
    }
  }
  if (!token) throw new Error("Tenant auth failed for agent creation");

  // Step 1: Create agent via admin backend (password is auto-generated)
  const createRes = await fetch(`${ADMIN_API}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      phone: phone ?? "+212600000010",
      lotIds,
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok) {
    throw new Error(
      `Agent creation failed: ${createJson.message ?? createRes.status}`,
    );
  }
  const guardianId: number = createJson.data?.guardianId;
  const accountId: string = createJson.data?.accountId;
  const generatedPassword: string = createJson.data?.generatedPassword ?? "";
  if (!accountId) throw new Error("No accountId in agent creation response");

  // Step 2: Login with the auto-generated password to get token
  const loginRes = await fetch(`${MAIN_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: generatedPassword }),
  });
  const loginJson = await loginRes.json();
  const accessToken: string =
    loginJson.data?.accessToken ?? loginJson.accessToken;
  if (accessToken) {
    setToken("agent", accessToken, 86400);
  }

  return {
    label: `${firstName} ${lastName}`,
    accountId,
    email,
    password: generatedPassword,
    role: "agent",
    token: accessToken,
    guardianId,
  };
}

/* ── Bulk Seed ─────────────────────────────────────────────────────── */

const POOL_KEY = "otoparking-sim-accounts";

/**
 * Seeds N drivers + M agents. Uses localStorage to persist across sessions.
 * Idempotent — skips accounts that already exist.
 */
export async function seedSimAccounts(
  driverCount: number = 3,
  agentCount: number = 2,
): Promise<ActorPool> {
  const pool: ActorPool = { drivers: [], agents: [] };

  for (let i = 1; i <= driverCount; i++) {
    const email = `sim-driver-${i}@otoparking-test.com`;
    const pw = "Sim@12345";
    const phone = `+21260000000${i}`;
    try {
      console.log(`[SIM] Creating driver ${i}...`);
      const acc = await createDriver(email, pw, "Sim", `Driver-${i}`, phone);
      pool.drivers.push(acc);
      console.log(`[SIM] Driver ${i} created: ${acc.accountId}`);
    } catch (e) {
      console.warn(`[SIM] Driver ${i} skipped: ${e}`);
    }
  }

  for (let i = 1; i <= agentCount; i++) {
    const email = `sim-agent-${i}@otoparking-test.com`;
    try {
      console.log(`[SIM] Creating agent ${i}...`);
      const acc = await createAgent(
        email,
        "Sim",
        `Agent-${i}`,
        [PARKING_ID],
        `+21260000001${i}`,
      );
      pool.agents.push(acc);
      console.log(`[SIM] Agent ${i} created: ${acc.accountId}`);
    } catch (e) {
      console.warn(`[SIM] Agent ${i} skipped: ${e}`);
    }
  }

  // Cache to localStorage for reuse
  try {
    localStorage.setItem(POOL_KEY, JSON.stringify(pool));
  } catch {
    /* ignore */
  }

  return pool;
}

/** Load previously seeded accounts from localStorage. */
export function loadSimAccounts(): ActorPool | null {
  try {
    const raw = localStorage.getItem(POOL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
