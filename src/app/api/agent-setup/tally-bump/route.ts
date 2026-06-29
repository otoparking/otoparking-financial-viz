import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

export async function POST(req: Request) {
  try {
    const { agentId, lotId, amount } = await req.json();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Bump the tally for today regardless of current status, and reopen it
      // so the cash-flow/state query (WHERE status='OPEN') picks it up.
      // This handles the common test case where Agent→Manager was already
      // triggered today (status='RECONCILED') and a new cash session follows.
      const res = await client.query(
        `UPDATE oto_agent_cash_tally
         SET total_collected = total_collected + $1,
             status         = 'OPEN',
             updated_at     = NOW()
         WHERE agent_id = $2 AND lot_id = $3
           AND shift_date = CURRENT_DATE`,
        [amount, agentId, lotId],
      );

      await client.query("COMMIT");

      const updated = res.rowCount ?? 0;
      return NextResponse.json({
        success: updated > 0,
        message:
          updated > 0 ? `Tally +${amount}` : "No tally row found for today",
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
