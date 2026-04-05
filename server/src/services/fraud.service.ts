import { redis } from '../redis/client.js';
import { VelocityLimitError } from '../lib/errors.js';

const MAX_TXNS_PER_VENDOR_PER_DAY = 5;

/**
 * Check and increment velocity counter for a customer at a vendor.
 * Throws VelocityLimitError if limit exceeded.
 */
export async function checkVelocity(
  userId: string,
  vendorId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `velocity:${userId}:${vendorId}:${today}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // First transaction today — set 24h TTL
    await redis.expire(key, 86400);
  }

  if (count > MAX_TXNS_PER_VENDOR_PER_DAY) {
    throw new VelocityLimitError();
  }
}

/**
 * Increment failed NFC match counter. Returns the new count.
 */
export async function incrementFailedMatch(userId: string): Promise<number> {
  const key = `failmatch:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 604800); // 7 days
  }
  return count;
}
