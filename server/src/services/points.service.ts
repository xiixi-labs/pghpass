import { transaction } from '../db/client.js';

/**
 * Award points to a customer for a transaction.
 * Uses pessimistic locking on point_balances to prevent race conditions.
 * The sync_point_balance trigger handles updating point_balances automatically.
 */
export async function awardPoints(
  userId: string,
  vendorId: string,
  transactionId: string,
  amount: number,
  multiplier: number = 1,
): Promise<{ pointsAwarded: number; newBalance: number }> {
  const basePoints = Math.floor(amount * 10);
  const pointsAwarded = basePoints * multiplier;

  const newBalance = await transaction(async (client) => {
    // Lock the balance row (or get 0 if it doesn't exist yet)
    const { rows: balRows } = await client.query(
      `SELECT balance FROM point_balances WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    const currentBalance = balRows.length > 0 ? Number(balRows[0].balance) : 0;
    const balanceAfter = currentBalance + pointsAwarded;

    // Insert ledger entry — the trigger will upsert point_balances
    await client.query(
      `INSERT INTO point_ledger (user_id, vendor_id, transaction_id, delta, balance_after, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        vendorId,
        transactionId,
        pointsAwarded,
        balanceAfter,
        multiplier > 1
          ? `${multiplier}× bonus earned`
          : 'Earned at vendor',
      ],
    );

    // Update vendor total points issued
    await client.query(
      `UPDATE vendors SET total_pts_issued = total_pts_issued + $1 WHERE id = $2`,
      [pointsAwarded, vendorId],
    );

    return balanceAfter;
  });

  return { pointsAwarded, newBalance };
}
