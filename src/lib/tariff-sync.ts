/**
 * Lot 61 Tariff Sync — updates parking_tariffs via admin backend API.
 * Used by the SettingsPanel "Lot 61 Tariff" section to keep the DB
 * in sync with visual simulation parameters.
 *
 * @module lib/tariff-sync
 */

import { getToken, loginAdmin } from "@/lib/auth-service";

const ADMIN_API = "/api/admin";
const ADMIN_EMAIL = "admin@otoparking.com";
const ADMIN_PASSWORD = "Admin@12345";
const TARIFF_ID = 162; // parking_tariffs.id for lot 61 CAR ACTIVE

async function getAdminToken(): Promise<string | null> {
  let token = await getToken("admin");
  if (!token) {
    const result = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (result.success && result.token) token = result.token;
  }
  return token;
}

/**
 * Syncs grace period, hourly rate, and commission rate to the DB
 * via the admin backend. Updates parking_tariffs, hourly rates,
 * and oto_wallets_merchant.commission_rate for lot 61.
 */
export async function updateLot61Tariff(
  gracePeriodMinutes: number,
  hourlyRate: number,
  commissionRate: number, // 0–1, e.g. 0.1 = 10%
): Promise<void> {
  const token = await getAdminToken();
  if (!token) throw new Error("Admin auth failed");

  // 1. Update grace period
  const graceRes = await fetch(
    `${ADMIN_API}/parkings/61/tariffs/${TARIFF_ID}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gracePeriodMinutes }),
    },
  );
  if (!graceRes.ok) {
    const gj = await graceRes.json().catch(() => ({}));
    throw new Error(
      `Grace period: ${(gj as { message?: string }).message ?? graceRes.status}`,
    );
  }

  // 2. Update hourly rates (rows 401, 402, 403 for tariff 162)
  const hourlyRateRows = [
    { id: 401, hourStart: 0, hourEnd: 1 },
    { id: 402, hourStart: 1, hourEnd: 3 },
    { id: 403, hourStart: 3, hourEnd: 24 },
  ];

  for (const row of hourlyRateRows) {
    const rateRes = await fetch(
      `${ADMIN_API}/parkings/61/tariffs/${TARIFF_ID}/hourly-rates/${row.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hourStart: row.hourStart,
          hourEnd: row.hourEnd,
          price: hourlyRate,
        }),
      },
    );
    if (!rateRes.ok) {
      const rj = await rateRes.json().catch(() => ({}));
      throw new Error(
        `Rate ${row.id}: ${(rj as { message?: string }).message ?? rateRes.status}`,
      );
    }
  }

  // 3. Update commission rate on lot 61 merchant wallet
  //    PUT /api/admin/financial/lots/{lotId}/commission-rate
  //    rate is in percentage form (e.g. 20 for 20%)
  const commPercent = Math.round(commissionRate * 100);
  const commRes = await fetch(
    `${ADMIN_API}/financial/lots/61/commission-rate`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rate: commPercent }),
    },
  );
  if (!commRes.ok) {
    const cj = await commRes.json().catch(() => ({}));
    throw new Error(
      `Commission rate: ${(cj as { message?: string }).message ?? commRes.status}`,
    );
  }
}
