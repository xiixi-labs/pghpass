import { redis } from '../redis/client.js';
import { query, transaction } from '../db/client.js';
import {
  findByToken,
  findById,
  markClaimed,
} from '../db/queries/transactions.js';
import { awardPoints } from './points.service.js';
import { recordContribution } from './pool.service.js';
import { checkVelocity, incrementFailedMatch } from './fraud.service.js';
import {
  QRExpiredOrUsedError,
  AmountMismatchError,
  NoTransactionFoundError,
  AlreadyClaimedError,
} from '../lib/errors.js';
import type { QueueEntry } from '@pgh-pass/types';

const AMOUNT_TOLERANCE = 0.5;

/**
 * Claim a QR transaction. The core transaction path.
 */
export async function claimQRTransaction(
  token: string,
  customerEnteredAmount: number,
  customerId: string,
): Promise<{
  success: true;
  points_earned: number;
  new_balance: number;
  vendor_name: string;
  transaction_id: string;
}> {
  // 1. Check Redis for token (fast fail)
  const txnId = await redis.get(`txn:${token}`);
  if (!txnId) throw new QRExpiredOrUsedError();

  // 2. Fetch transaction from Postgres
  const txn = await findByToken(token);
  if (!txn) throw new QRExpiredOrUsedError();
  if (txn.status !== 'pending') throw new AlreadyClaimedError();

  // 3. Verify amount within tolerance
  if (Math.abs(Number(txn.amount) - customerEnteredAmount) > AMOUNT_TOLERANCE) {
    throw new AmountMismatchError();
  }

  // 4. Velocity check
  await checkVelocity(customerId, txn.vendor_id);

  // 5. Atomically delete token from Redis (prevents double-claim race)
  const deleted = await redis.del(`txn:${token}`);
  if (deleted === 0) throw new QRExpiredOrUsedError();

  // 6. Mark transaction claimed in Postgres
  await markClaimed(txn.id, customerId, customerEnteredAmount);

  // 7. Remove from register queue
  if (txn.register_id) {
    const queueKey = `queue:register:${txn.register_id}`;
    const entries = await redis.lrange(queueKey, 0, -1);
    for (const entry of entries) {
      const parsed: QueueEntry = JSON.parse(entry);
      if (parsed.transaction_id === txn.id) {
        await redis.lrem(queueKey, 1, entry);
        break;
      }
    }
  }

  // 8. Check for welcome bonus multiplier (3x for first 3 check-ins)
  const { rows: userRows } = await query(
    'SELECT checkin_count FROM users WHERE id = $1',
    [customerId],
  );
  const currentCheckinCount = userRows.length > 0 ? (userRows[0].checkin_count ?? 0) : 0;
  const welcomeMultiplier = currentCheckinCount < 3 ? 3 : 1;

  // Award points with potential multiplier
  const { pointsAwarded, newBalance } = await awardPoints(
    customerId,
    txn.vendor_id,
    txn.id,
    Number(txn.amount) * welcomeMultiplier,
  );

  // Increment check-in count and update streaks
  await transaction(async (client) => {
    // Increment check-in count
    await client.query('UPDATE users SET checkin_count = checkin_count + 1 WHERE id = $1', [customerId]);

    // Update or create user streak
    const today = new Date().toISOString().split('T')[0];
    const { rows: streakRows } = await client.query(
      'SELECT current_streak, longest_streak, last_checkin_date FROM user_streaks WHERE user_id = $1',
      [customerId],
    );

    if (streakRows.length === 0) {
      // New streak record
      await client.query(
        `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_checkin_date)
         VALUES ($1, 1, 1, $2)`,
        [customerId, today],
      );
    } else {
      const streak = streakRows[0];
      const lastDate = streak.last_checkin_date ? new Date(streak.last_checkin_date).toISOString().split('T')[0] : null;
      const isConsecutive = lastDate === today || !lastDate;
      const newStreak = isConsecutive ? (streak.current_streak ?? 0) + 1 : 1;
      const newLongest = Math.max(newStreak, streak.longest_streak ?? 0);

      await client.query(
        `UPDATE user_streaks SET current_streak = $1, longest_streak = $2, last_checkin_date = $3
         WHERE user_id = $4`,
        [newStreak, newLongest, today, customerId],
      );
    }
  });

  // 9. Record pool contribution
  await recordContribution(txn.vendor_id, txn.id, Number(txn.amount));

  // Get vendor name for response
  const { rows } = await query(
    'SELECT name FROM vendors WHERE id = $1',
    [txn.vendor_id],
  );

  return {
    success: true,
    points_earned: pointsAwarded,
    new_balance: newBalance,
    vendor_name: rows[0]?.name ?? '',
    transaction_id: txn.id,
  };
}

/**
 * Claim an NFC transaction using FIFO matching algorithm.
 */
export async function claimNFCTransaction(
  vendorId: string,
  registerId: string,
  customerEnteredAmount: number,
  tappedAt: string,
  customerId: string,
): Promise<{
  success: true;
  points_earned: number;
  new_balance: number;
  vendor_name: string;
  transaction_id: string;
}> {
  const tappedTime = new Date(tappedAt).getTime();
  const graceWindow = 15 * 60 * 1000; // 15 minutes

  // 1. Pull all pending entries from register queue
  const queueKey = `queue:register:${registerId}`;
  const entries = await redis.lrange(queueKey, 0, -1);

  // 2. Parse and filter candidates
  const candidates: (QueueEntry & { raw: string })[] = entries
    .map((raw: string) => ({ ...JSON.parse(raw), raw }))
    .filter((entry: QueueEntry & { raw: string }) => {
      const createdTime = new Date(entry.created_at).getTime();
      // Must be created before tap time
      if (createdTime > tappedTime) return false;
      // Must be within grace window
      if (tappedTime - createdTime > graceWindow) return false;
      // Amount must be within tolerance
      if (Math.abs(entry.amount - customerEnteredAmount) > AMOUNT_TOLERANCE) return false;
      return true;
    })
    // Sort by newest first
    .sort((a: QueueEntry, b: QueueEntry) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  // 3. Velocity check
  await checkVelocity(customerId, vendorId);

  // 4. Try to acquire atomic lock on each candidate
  for (const candidate of candidates) {
    const lockKey = `claim:lock:${candidate.transaction_id}`;
    const locked = await redis.set(lockKey, customerId, 'EX', 5, 'NX');

    if (locked) {
      // Acquired lock — verify transaction is still pending in Postgres
      const txn = await findById(candidate.transaction_id);
      if (!txn || txn.status !== 'pending') {
        // Already claimed, remove from queue and try next
        await redis.lrem(queueKey, 1, candidate.raw);
        continue;
      }

      // Claim it
      await markClaimed(txn.id, customerId, customerEnteredAmount);

      // Remove from queue
      await redis.lrem(queueKey, 1, candidate.raw);

      // Also remove QR token if it exists
      if (txn.qr_token) {
        await redis.del(`txn:${txn.qr_token}`);
      }

      // Check for welcome bonus multiplier (3x for first 3 check-ins)
      const { rows: userRows } = await query(
        'SELECT checkin_count FROM users WHERE id = $1',
        [customerId],
      );
      const currentCheckinCount = userRows.length > 0 ? (userRows[0].checkin_count ?? 0) : 0;
      const welcomeMultiplier = currentCheckinCount < 3 ? 3 : 1;

      // Award points with potential multiplier
      const { pointsAwarded, newBalance } = await awardPoints(
        customerId,
        vendorId,
        txn.id,
        Number(txn.amount) * welcomeMultiplier,
      );

      // Increment check-in count and update streaks
      await transaction(async (client) => {
        // Increment check-in count
        await client.query('UPDATE users SET checkin_count = checkin_count + 1 WHERE id = $1', [customerId]);

        // Update or create user streak
        const today = new Date().toISOString().split('T')[0];
        const { rows: streakRows } = await client.query(
          'SELECT current_streak, longest_streak, last_checkin_date FROM user_streaks WHERE user_id = $1',
          [customerId],
        );

        if (streakRows.length === 0) {
          // New streak record
          await client.query(
            `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_checkin_date)
             VALUES ($1, 1, 1, $2)`,
            [customerId, today],
          );
        } else {
          const streak = streakRows[0];
          const lastDate = streak.last_checkin_date ? new Date(streak.last_checkin_date).toISOString().split('T')[0] : null;
          const isConsecutive = lastDate === today || !lastDate;
          const newStreak = isConsecutive ? (streak.current_streak ?? 0) + 1 : 1;
          const newLongest = Math.max(newStreak, streak.longest_streak ?? 0);

          await client.query(
            `UPDATE user_streaks SET current_streak = $1, longest_streak = $2, last_checkin_date = $3
             WHERE user_id = $4`,
            [newStreak, newLongest, today, customerId],
          );
        }
      });

      // Record pool contribution
      await recordContribution(vendorId, txn.id, Number(txn.amount));

      // Get vendor name
      const { rows } = await query(
        'SELECT name FROM vendors WHERE id = $1',
        [vendorId],
      );

      return {
        success: true,
        points_earned: pointsAwarded,
        new_balance: newBalance,
        vendor_name: rows[0]?.name ?? '',
        transaction_id: txn.id,
      };
    }
    // Lock not acquired — another request is processing this candidate, try next
  }

  // No candidate matched
  await incrementFailedMatch(customerId);
  throw new NoTransactionFoundError();
}
