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

    // 1. Insert or update cash commission tracker for current month
    await client.query(
      `INSERT INTO oto_cash_commission_tracker (lot_id, billing_period, total_cash_sessions, total_cash_fare, commission_owed, commission_collected, carry_forward, last_updated_at)
       VALUES ($1, TO_CHAR(NOW(), 'YYYY-MM'), 1, 50, 5, 0, 0, NOW())
       ON CONFLICT (lot_id, billing_period)
       DO UPDATE SET
         total_cash_sessions = oto_cash_commission_tracker.total_cash_sessions + 1,
         total_cash_fare = oto_cash_commission_tracker.total_cash_fare + 50,
         commission_owed = oto_cash_commission_tracker.commission_owed + 5,
         last_updated_at = NOW()`,
      [PARKING_ID],
    );

    // 2. Insert a session debt (5 MAD commission owed)
    await client.query(
      `INSERT INTO oto_session_debts (session_id, driver_id, lot_id, amount_owed, currency, status, created_at)
       VALUES (gen_random_uuid(), '6a33014db68486ccc9606985', $1, 5, 'MAD', 'OPEN', NOW())`,
      [PARKING_ID],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Cash session recorded — tally +5 MAD, debt +5 MAD",
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
