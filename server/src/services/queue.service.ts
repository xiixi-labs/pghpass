import { v4 as uuidv4 } from 'uuid';
import { redis } from '../redis/client.js';
import { insertTransaction } from '../db/queries/transactions.js';
import type { QueueEntry } from '@pgh-pass/types';

const QR_TTL_SECONDS = 90;

/**
 * Generate a QR transaction: create in Postgres, store token in Redis, push to FIFO queue.
 */
export async function generateQRTransaction(
  vendorId: string,
  registerId: string,
  amount: number,
) {
  const token = uuidv4();
  const pointsValue = Math.floor(amount * 10);
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString();

  // Insert transaction into Postgres
  const txn = await insertTransaction({
    vendor_id: vendorId,
    register_id: registerId,
    amount,
    points_value: pointsValue,
    source: 'qr',
    qr_token: token,
    qr_expires_at: expiresAt,
  });

  // Store token in Redis with 90s TTL
  await redis.set(`txn:${token}`, txn.id, 'EX', QR_TTL_SECONDS);

  // Push to per-register FIFO queue
  const queueEntry: QueueEntry = {
    transaction_id: txn.id,
    amount,
    created_at: txn.created_at,
    status: 'pending',
  };
  await redis.lpush(
    `queue:register:${registerId}`,
    JSON.stringify(queueEntry),
  );

  return {
    transaction_id: txn.id,
    token,
    qr_data: `pghpass://claim/${token}`,
    points_value: pointsValue,
    expires_at: expiresAt,
    expires_in_seconds: QR_TTL_SECONDS,
  };
}
