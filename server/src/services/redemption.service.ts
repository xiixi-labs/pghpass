import { v4 as uuidv4 } from 'uuid';
import { redis } from '../redis/client.js';
import { query, transaction } from '../db/client.js';
import { InsufficientPointsError } from '../lib/errors.js';
import type { RedemptionOption } from '@pgh-pass/types';

const REDEMPTION_TTL_SECONDS = 600; // 10 minutes

/** Static redemption options */
const OPTIONS: Omit<RedemptionOption, 'available' | 'points_needed'>[] = [
  {
    id: 'free-coffee',
    label: 'Free coffee',
    description: 'Redeemable at any participating store',
    points_cost: 500,
    dollar_value: 5.0,
    vendor_id: null,
  },
  {
    id: '5-off',
    label: '$5 off your next visit',
    description: 'Redeemable at any participating store',
    points_cost: 500,
    dollar_value: 5.0,
    vendor_id: null,
  },
  {
    id: '10-reward',
    label: '$10 reward',
    description: 'Redeemable at any participating store',
    points_cost: 1000,
    dollar_value: 10.0,
    vendor_id: null,
  },
];

export function getRedemptionOptions(balance: number) {
  return OPTIONS.map((opt) => ({
    ...opt,
    available: balance >= opt.points_cost,
    ...(balance < opt.points_cost
      ? { points_needed: opt.points_cost - balance }
      : {}),
  }));
}

export async function issueRedemption(
  userId: string,
  optionId: string,
  vendorId: string | null,
): Promise<{
  redemption_id: string;
  token: string;
  qr_data: string;
  label: string;
  dollar_value: number;
  points_deducted: number;
  new_balance: number;
  expires_at: string;
}> {
  const option = OPTIONS.find((o) => o.id === optionId);
  if (!option) throw new Error('Invalid option');

  const token = uuidv4();
  const expiresAt = new Date(
    Date.now() + REDEMPTION_TTL_SECONDS * 1000,
  ).toISOString();

  const result = await transaction(async (client) => {
    // Lock balance
    const { rows: balRows } = await client.query(
      'SELECT balance FROM point_balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const balance = balRows.length > 0 ? Number(balRows[0].balance) : 0;

    if (balance < option.points_cost) {
      throw new InsufficientPointsError();
    }

    const newBalance = balance - option.points_cost;

    // Create redemption record
    const { rows: redemptionRows } = await client.query(
      `INSERT INTO redemptions (user_id, vendor_id, points_cost, dollar_value, reward_label, redeem_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        vendorId,
        option.points_cost,
        option.dollar_value,
        option.label,
        token,
        expiresAt,
      ],
    );
    const redemptionId = redemptionRows[0].id;

    // Deduct points via ledger
    await client.query(
      `INSERT INTO point_ledger (user_id, redemption_id, delta, balance_after, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        redemptionId,
        -option.points_cost,
        newBalance,
        `${option.label} redeemed`,
      ],
    );

    return { redemptionId, newBalance };
  });

  // Cache token in Redis
  await redis.set(`redeem:${token}`, result.redemptionId, 'EX', REDEMPTION_TTL_SECONDS);

  return {
    redemption_id: result.redemptionId,
    token,
    qr_data: `pghpass://redeem/${token}`,
    label: option.label,
    dollar_value: option.dollar_value,
    points_deducted: option.points_cost,
    new_balance: result.newBalance,
    expires_at: expiresAt,
  };
}

export async function validateRedemption(token: string) {
  const redemptionId = await redis.get(`redeem:${token}`);
  if (!redemptionId) return null;

  const { rows } = await query(
    `SELECT r.id, r.reward_label, r.dollar_value, r.status, u.display_name
     FROM redemptions r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [redemptionId],
  );

  if (rows.length === 0 || rows[0].status !== 'issued') return null;

  return {
    valid: true as const,
    redemption_id: rows[0].id,
    label: rows[0].reward_label,
    dollar_value: Number(rows[0].dollar_value),
    customer_display: rows[0].display_name,
  };
}

export async function confirmRedemption(
  redemptionId: string,
  vendorId: string,
) {
  return await transaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM redemptions WHERE id = $1 AND status = $2',
      [redemptionId, 'issued'],
    );
    if (rows.length === 0) return null;

    const redemption = rows[0];

    // Mark as claimed
    await client.query(
      `UPDATE redemptions SET status = 'claimed', claimed_at = NOW(), claimed_at_vendor_id = $1, payout_amount = $2
       WHERE id = $3`,
      [vendorId, redemption.dollar_value, redemptionId],
    );

    // Debit pool — lock and check for sufficient balance
    const { rows: poolRows } = await client.query(
      'SELECT balance FROM pool_balance WHERE id = 1 FOR UPDATE',
    );
    const poolBalance = Number(poolRows[0].balance);
    const newPoolBalance =
      Math.round((poolBalance - Number(redemption.dollar_value)) * 100) / 100;

    if (newPoolBalance < 0) {
      throw new Error(
        `Insufficient pool balance: $${poolBalance.toFixed(2)} available, $${Number(redemption.dollar_value).toFixed(2)} required`,
      );
    }

    await client.query(
      `INSERT INTO pool_ledger (entry_type, vendor_id, redemption_id, amount, balance_after, note)
       VALUES ('redemption_payout', $1, $2, $3, $4, $5)`,
      [
        vendorId,
        redemptionId,
        -Number(redemption.dollar_value),
        newPoolBalance,
        `Payout for ${redemption.reward_label}`,
      ],
    );

    await client.query(
      'UPDATE pool_balance SET balance = $1, updated_at = NOW() WHERE id = 1',
      [newPoolBalance],
    );

    // Delete token from Redis
    if (redemption.redeem_token) {
      await redis.del(`redeem:${redemption.redeem_token}`);
    }

    return { success: true as const, payout_queued: Number(redemption.dollar_value) };
  });
}
