import { transaction } from '../db/client.js';

/**
 * Record a pool contribution when a transaction is claimed.
 */
export async function recordContribution(
  vendorId: string,
  transactionId: string,
  amount: number,
  contributionRate: number = 0.02,
): Promise<void> {
  const contribution = Math.round(amount * contributionRate * 100) / 100;

  await transaction(async (client) => {
    // Lock pool balance
    const { rows } = await client.query(
      'SELECT balance FROM pool_balance WHERE id = 1 FOR UPDATE',
    );
    const currentBalance = Number(rows[0].balance);
    const balanceAfter = Math.round((currentBalance + contribution) * 100) / 100;

    // Insert pool ledger entry
    await client.query(
      `INSERT INTO pool_ledger (entry_type, vendor_id, transaction_id, amount, balance_after, note)
       VALUES ('contribution', $1, $2, $3, $4, $5)`,
      [vendorId, transactionId, contribution, balanceAfter, `2% contribution`],
    );

    // Update pool balance
    await client.query(
      'UPDATE pool_balance SET balance = $1, updated_at = NOW() WHERE id = 1',
      [balanceAfter],
    );

    // Mark contribution collected on the transaction
    await client.query(
      'UPDATE transactions SET contribution_collected = TRUE WHERE id = $1',
      [transactionId],
    );
  });
}
