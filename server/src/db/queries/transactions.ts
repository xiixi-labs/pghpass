import { query } from '../client.js';
import type { Transaction } from '@pgh-pass/types';

export async function insertTransaction(
  data: {
    vendor_id: string;
    register_id: string;
    amount: number;
    points_value: number;
    source: 'qr' | 'nfc';
    qr_token?: string;
    qr_expires_at?: string;
  },
): Promise<Transaction> {
  const { rows } = await query<Transaction>(
    `INSERT INTO transactions (vendor_id, register_id, amount, points_value, source, qr_token, qr_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.vendor_id,
      data.register_id,
      data.amount,
      data.points_value,
      data.source,
      data.qr_token ?? null,
      data.qr_expires_at ?? null,
    ],
  );
  return rows[0];
}

export async function findById(id: string): Promise<Transaction | null> {
  const { rows } = await query<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function findByToken(token: string): Promise<Transaction | null> {
  const { rows } = await query<Transaction>(
    'SELECT * FROM transactions WHERE qr_token = $1',
    [token],
  );
  return rows[0] ?? null;
}

export async function markClaimed(
  transactionId: string,
  claimedBy: string,
  customerEnteredAmount: number,
): Promise<void> {
  await query(
    `UPDATE transactions
     SET status = 'claimed', claimed_by = $1, claimed_at = NOW(), customer_entered_amount = $2
     WHERE id = $3`,
    [claimedBy, customerEnteredAmount, transactionId],
  );
}

export async function getCustomerHistory(
  userId: string,
  limit: number,
  offset: number,
) {
  const countResult = await query(
    `SELECT COUNT(*) as total FROM transactions WHERE claimed_by = $1 AND status = 'claimed'`,
    [userId],
  );

  const { rows } = await query(
    `SELECT t.id, v.name as vendor_name, v.logo_url as vendor_logo,
            t.amount, t.points_value as points_earned, t.claimed_at
     FROM transactions t
     JOIN vendors v ON t.vendor_id = v.id
     WHERE t.claimed_by = $1 AND t.status = 'claimed'
     ORDER BY t.claimed_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return { transactions: rows, total: Number(countResult.rows[0].total) };
}

export async function getVendorRecent(vendorId: string, limit: number) {
  const { rows } = await query(
    `SELECT t.id, u.display_name, t.amount, t.points_value as points_issued,
            r.label as register_label, t.claimed_at
     FROM transactions t
     JOIN users u ON t.claimed_by = u.id
     LEFT JOIN registers r ON t.register_id = r.id
     WHERE t.vendor_id = $1 AND t.status = 'claimed'
     ORDER BY t.claimed_at DESC
     LIMIT $2`,
    [vendorId, limit],
  );
  return rows;
}
