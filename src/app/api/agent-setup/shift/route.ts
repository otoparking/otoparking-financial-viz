import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

export async function POST(req: Request) {
  try {
    const { agentId, lotId, floatAmount } = await req.json();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Upsert agent cash tally: create if not exists, or reopen if already reconciled
      await client.query(
        `INSERT INTO oto_agent_cash_tally
           (agent_id, lot_id, shift_date, shift_number, float_amount, total_collected, session_count, status, created_at, updated_at)
         VALUES ($1, $2, CURRENT_DATE, 1, $3, 0, 0, 'OPEN', NOW(), NOW())
         ON CONFLICT (agent_id, shift_date, shift_number)
         DO UPDATE SET float_amount = $3, status = 'OPEN', updated_at = NOW()`,
        [agentId, lotId, floatAmount],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Shift opened with ${floatAmount} MAD float`,
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
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 },
    );
  }
}
