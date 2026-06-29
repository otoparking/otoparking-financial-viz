import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

const PARKING_ID = 61;

export async function GET() {
  const client = await pool.connect();
  try {
    // Agent cash: sum of total_collected from OPEN tallies at lot 61
    const agentRes = await client.query(
      `SELECT COALESCE(SUM(total_collected), 0) as cash FROM oto_agent_cash_tally WHERE lot_id = $1 AND status = 'OPEN'`,
      [PARKING_ID],
    );
    const agentCash = parseFloat(agentRes.rows[0]?.cash ?? "0");

    // Manager cash: from our tracking table
    await client.query(
      `CREATE TABLE IF NOT EXISTS oto_test_manager_cash (id INT PRIMARY KEY DEFAULT 1, lot_id INT UNIQUE, manager_cash NUMERIC(10,2) DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())`,
    );
    await client.query(
      `INSERT INTO oto_test_manager_cash (lot_id, manager_cash) VALUES ($1, 0) ON CONFLICT (lot_id) DO NOTHING`,
      [PARKING_ID],
    );
    const mgrRes = await client.query(
      `SELECT manager_cash FROM oto_test_manager_cash WHERE lot_id = $1`,
      [PARKING_ID],
    );
    const managerCash = parseFloat(mgrRes.rows[0]?.manager_cash ?? "0");

    return NextResponse.json({ agentCash, managerCash });
  } catch (e) {
    return NextResponse.json({ agentCash: 0, managerCash: 0, error: String(e) });
  } finally {
    client.release();
  }
}
