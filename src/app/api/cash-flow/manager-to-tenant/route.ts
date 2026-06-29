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

    // Ensure manager table exists
    await client.query(
      `CREATE TABLE IF NOT EXISTS oto_test_manager_cash (id INT PRIMARY KEY DEFAULT 1, lot_id INT UNIQUE, manager_cash NUMERIC(10,2) DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())`,
    );
    await client.query(
      `INSERT INTO oto_test_manager_cash (lot_id, manager_cash) VALUES ($1, 0) ON CONFLICT (lot_id) DO NOTHING`,
      [PARKING_ID],
    );

    const mgrRes = await client.query(
      `SELECT manager_cash FROM oto_test_manager_cash WHERE lot_id = $1 FOR UPDATE`,
      [PARKING_ID],
    );
    const total = parseFloat(mgrRes.rows[0]?.manager_cash ?? "0");

    if (total === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "No cash to release from manager" });
    }

    // Clear manager cash
    await client.query(
      `UPDATE oto_test_manager_cash SET manager_cash = 0, updated_at = NOW() WHERE lot_id = $1`,
      [PARKING_ID],
    );

    // Credit Lot Revenue wallet
    await client.query(
      `UPDATE oto_wallets_merchant SET balance_available = balance_available + $1 WHERE merchant_id = $2`,
      [total, PARKING_ID],
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: `Released ${total} MAD from manager to Lot Revenue`, amount: total });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}
