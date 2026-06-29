import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_1zkM7HjiCfyl@ep-fancy-cake-al921xcr-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
});

const DRIVER_ACCOUNT = "6a33014db68486ccc9606985";
const PARKING_ID = 61;

export async function POST() {
  const client = await pool.connect();
  const results: string[] = [];

  try {
    await client.query("BEGIN");

    // 1. Delete debts first (FK to gate sessions)
    const debtsDeleted = await client.query(
      `DELETE FROM oto_session_debts WHERE lot_id = $1`,
      [PARKING_ID],
    );
    results.push(`${debtsDeleted.rowCount} debts deleted`);

    // 1b. Clear cash commission tracker for lot 61
    const cashCleared = await client.query(
      `DELETE FROM oto_cash_commission_tracker WHERE lot_id = $1`,
      [PARKING_ID],
    );
    results.push(`${cashCleared.rowCount} cash tracker rows cleared`);

    // 1c. Delete cash session commission audit BEFORE gate sessions (FK constraint)
    const commAudit = await client.query(
      `DELETE FROM oto_cash_session_commissions WHERE lot_id = $1`,
      [PARKING_ID],
    );
    results.push(`${commAudit.rowCount} cash commission audit records deleted`);

    // 2. End active gate access requests (the actual table for active sessions)
    const closedAccess = await client.query(
      `UPDATE oto_parking_gate_access_requests
       SET status = 'COMPLETED', exit_time = NOW(), date_update = NOW()
       WHERE parking_id = $1 AND status = 'ACTIVE'`,
      [PARKING_ID],
    );
    results.push(`${closedAccess.rowCount} access requests closed`);

    // 2b. End active gate sessions (legacy table)
    const activeSessions = await client.query(
      `UPDATE oto_gate_sessions
       SET status = 'COMPLETED', exit_time = NOW(), updated_at = NOW()
       WHERE lot_id = $1 AND status = 'ACTIVE'`,
      [PARKING_ID],
    );
    results.push(`${activeSessions.rowCount} gate sessions closed`);

    // 2. Delete escrow records for test driver bookings
    const escrowDeleted = await client.query(
      `DELETE FROM oto_escrow_records
       WHERE booking_ref IN (
         SELECT booking_reference FROM oto_parking_booking WHERE account_id = $1
       )`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${escrowDeleted.rowCount} escrow records deleted`);

    // 3. Delete payment traces
    const paymentsDeleted = await client.query(
      `DELETE FROM oto_booking_payment
       WHERE booking_reference IN (
         SELECT booking_reference FROM oto_parking_booking WHERE account_id = $1
       )`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${paymentsDeleted.rowCount} payment traces deleted`);

    // 4. Delete booking items
    const itemsDeleted = await client.query(
      `DELETE FROM oto_parking_booking_item
       WHERE booking_id IN (
         SELECT id FROM oto_parking_booking WHERE account_id = $1
       )`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${itemsDeleted.rowCount} booking items deleted`);

    // 5. Delete booking previews
    const previewsDeleted = await client.query(
      `DELETE FROM oto_parking_booking_preview WHERE account_id = $1`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${previewsDeleted.rowCount} booking previews deleted`);

    // 6. Delete bookings
    const bookingsDeleted = await client.query(
      `DELETE FROM oto_parking_booking WHERE account_id = $1`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${bookingsDeleted.rowCount} bookings deleted`);

    // 7. Reset driver wallet to 0
    const walletReset = await client.query(
      `UPDATE oto_wallets
       SET balance_available = 0, balance_blocked = 0, balance_total = 0,
           date_update = NOW()
       WHERE account_id = $1`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${walletReset.rowCount} driver wallets reset`);

    // 8. Reset merchant wallet for lot 61
    const merchantReset = await client.query(
      `UPDATE oto_wallets_merchant
       SET balance_available = 0, balance_blocked = 0,
           total_received_from_agents = 0, total_received_from_digital = 0,
           total_commission_paid = 0, date_update = NOW()
       WHERE merchant_id = $1`,
      [PARKING_ID],
    );
    results.push(`${merchantReset.rowCount} merchant wallets reset`);

    // 9. Delete gate access requests and sessions for lot 61
    const accessDeleted = await client.query(
      `DELETE FROM oto_parking_gate_access_requests WHERE parking_id = $1`,
      [PARKING_ID],
    );
    results.push(`${accessDeleted.rowCount} access requests deleted`);

    const gateSessions = await client.query(
      `DELETE FROM oto_gate_sessions WHERE lot_id = $1`,
      [PARKING_ID],
    );
    results.push(`${gateSessions.rowCount} gate sessions deleted`);

    // 10. Delete wallet transactions for test driver
    const txDeleted = await client.query(
      `DELETE FROM oto_transactions WHERE account_id = $1`,
      [DRIVER_ACCOUNT],
    );
    results.push(`${txDeleted.rowCount} transactions deleted`);

    // 11. Delete wallet ledger entries
    const ledgerDeleted = await client.query(
      `DELETE FROM oto_wallet_ledger
       WHERE source_wallet_id = 11 OR target_wallet_id = 11
          OR source_wallet_id = (SELECT id FROM oto_wallets_merchant WHERE merchant_id = $1)
          OR target_wallet_id = (SELECT id FROM oto_wallets_merchant WHERE merchant_id = $1)`,
      [PARKING_ID],
    );
    results.push(`${ledgerDeleted.rowCount} ledger entries deleted`);

    // 12. Close agent cash tally for lot 61 (mark as COMPLETED, reset counters)
    const tallyClosed = await client.query(
      `UPDATE oto_agent_cash_tally
       SET total_collected = 0, session_count = 0, status = 'RECONCILED',
           confirmed_amount = 0, discrepancy_amount = 0, updated_at = NOW()
       WHERE lot_id = $1 AND status IN ('OPEN', 'AWAITING_FLOAT')`,
      [PARKING_ID],
    );
    results.push(`${tallyClosed.rowCount} agent tallies closed`);

    // 13. Clear agent active lot for lot 61 guardians
    const guardianCleared = await client.query(
      `UPDATE oto_parking_guardian
       SET active_parking_id = NULL, active_parking_date = NULL, date_update = NOW()
       WHERE id IN (
         SELECT guardian_id FROM oto_agent_schedule
         WHERE parking_id = $1 AND scheduled_date = CURRENT_DATE
       )`,
      [PARKING_ID],
    );
    results.push(`${guardianCleared.rowCount} guardian active lots cleared`);

    // 14. Complete today's agent schedules for lot 61
    const schedulesClosed = await client.query(
      `UPDATE oto_agent_schedule
       SET status = 'COMPLETED', updated_at = NOW()
       WHERE parking_id = $1 AND scheduled_date = CURRENT_DATE AND status = 'SCHEDULED'`,
      [PARKING_ID],
    );
    results.push(`${schedulesClosed.rowCount} agent schedules completed`);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Test accounts reset to zero",
      details: results,
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
