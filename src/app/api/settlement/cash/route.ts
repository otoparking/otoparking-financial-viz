/**
 * POST /api/settlement/cash
 *
 * Dev-only cash netting execution (PRD §8.2).
 * Marks all outstanding cash commission for the current billing period
 * as collected in oto_cash_commission_tracker.
 *
 * Returns: { commissionNetted, billingPeriod }
 */
import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

const PARKING_ID = 61;

export async function POST() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Read what's outstanding
    const res = await client.query<{
      commission_owed: string;
      commission_collected: string;
    }>(
      `SELECT COALESCE(commission_owed, 0) AS commission_owed,
              COALESCE(commission_collected, 0) AS commission_collected
       FROM oto_cash_commission_tracker
       WHERE lot_id = $1 AND billing_period = $2`,
      [PARKING_ID, billingPeriod],
    );

    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: false,
        message: `No cash commission tracker record for lot ${PARKING_ID} period ${billingPeriod}`,
      });
    }

    const owed      = parseFloat(res.rows[0].commission_owed);
    const collected = parseFloat(res.rows[0].commission_collected);
    const outstanding = Math.max(0, owed - collected);

    if (outstanding === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        success: false,
        message: `No outstanding cash commission for period ${billingPeriod} (already fully collected)`,
      });
    }

    // Mark as collected
    await client.query(
      `UPDATE oto_cash_commission_tracker
       SET commission_collected = commission_owed,
           last_updated_at = NOW()
       WHERE lot_id = $1 AND billing_period = $2`,
      [PARKING_ID, billingPeriod],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Cash commission netted · ${outstanding} MAD collected for ${billingPeriod}`,
      commissionNetted: outstanding,
      billingPeriod,
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
