import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

const AGENT_ID = 15;
const PARKING_ID = 61;

export async function POST() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Close tally
    await client.query(
      `UPDATE oto_agent_cash_tally
       SET total_collected = 0, session_count = 0, status = 'RECONCILED',
           confirmed_amount = 0, discrepancy_amount = 0, updated_at = NOW()
       WHERE agent_id = $1 AND lot_id = $2 AND status IN ('OPEN', 'AWAITING_FLOAT')`,
      [AGENT_ID, PARKING_ID],
    );

    // Clear active lot
    await client.query(
      `UPDATE oto_parking_guardian
       SET active_parking_id = NULL, active_parking_date = NULL, date_update = NOW()
       WHERE id = $1`,
      [AGENT_ID],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Agent shift reset — tally closed, active lot cleared",
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
