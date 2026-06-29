/**
 * POST /api/settlement/digital
 *
 * Dev-only digital payout execution (PRD §8.1).
 * Bypasses CorpoPay (not configured in dev) and performs the settlement
 * atomically in the DB:
 *   1. Reads current merchant wallet balance + cash commission owed this period
 *   2. Computes net = gross - cashCommissionOwed
 *   3. Zeroes oto_wallets_merchant.balance_available
 *   4. Sets oto_cash_commission_tracker.commission_collected = commission_owed
 *   5. Inserts a completed settlement record into adm_settlements
 *
 * Returns: { gross, commissionNetted, net, currency }
 */
import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

const PARKING_ID = 61;
const TENANT_ID = 6; // test-tenant@otoparking.com
const TENANT_USER_ID = 9;

export async function POST() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Read current lot revenue balance
    const walletRes = await client.query<{ balance_available: string }>(
      `SELECT balance_available FROM oto_wallets_merchant WHERE merchant_id = $1 FOR UPDATE`,
      [PARKING_ID],
    );
    const gross = parseFloat(walletRes.rows[0]?.balance_available ?? "0");

    if (gross <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "No available balance to settle" },
        { status: 400 },
      );
    }

    // 2. Read cash commission owed for current billing period
    const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const commRes = await client.query<{
      commission_owed: string;
      commission_collected: string;
    }>(
      `SELECT COALESCE(commission_owed, 0) AS commission_owed,
              COALESCE(commission_collected, 0) AS commission_collected
       FROM oto_cash_commission_tracker
       WHERE lot_id = $1 AND billing_period = $2`,
      [PARKING_ID, billingPeriod],
    );
    const commOwed = parseFloat(commRes.rows[0]?.commission_owed ?? "0");
    const commCollected = parseFloat(
      commRes.rows[0]?.commission_collected ?? "0",
    );
    const commissionNetted = Math.max(0, commOwed - commCollected);

    const net = Math.max(0, gross - commissionNetted);

    // 3. Zero the merchant wallet
    await client.query(
      `UPDATE oto_wallets_merchant
       SET balance_available = 0, date_update = NOW()
       WHERE merchant_id = $1`,
      [PARKING_ID],
    );

    // 4. Mark cash commission as collected
    if (commissionNetted > 0) {
      await client.query(
        `UPDATE oto_cash_commission_tracker
         SET commission_collected = commission_owed,
             last_updated_at = NOW()
         WHERE lot_id = $1 AND billing_period = $2`,
        [PARKING_ID, billingPeriod],
      );
    }

    // 5. Insert approved settlement record (dev — no real wire)
    await client.query(
      `INSERT INTO adm_settlements
         (tenant_id, requested_by_user_id, gross_amount, gross_digital_revenue,
          cash_commission_owed, commission_deducted, net_amount, net_payout_amount,
          carry_forward_from_prev, settlement_type,
          billing_period, lot_id, bank_details, tenant_note,
          status, reviewed_by_admin_id, review_note, paid_at)
       VALUES
         ($1, $2, $3, $3,
          $4, $4, $5, $5,
          0, 'STANDARD',
          $6, $7, 'DEV-DIRECT', 'VIZ dev settlement',
          'APPROVED', $2, 'VIZ dev auto-approve', NOW())`,
      [
        TENANT_ID,
        TENANT_USER_ID,
        gross,
        commissionNetted,
        net,
        billingPeriod,
        PARKING_ID,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Settled ${gross} MAD gross · ${commissionNetted} MAD cash comm netted · ${net} MAD net wire`,
      gross,
      commissionNetted,
      net,
      currency: "MAD",
    });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { success: false, message: String(e) },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
