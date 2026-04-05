// Queue cleanup job — expires register queue entries older than 30 minutes
// Run via: tsx server/src/jobs/queue-cleanup.ts
// Schedule: every 5 minutes via cron or process manager

import 'dotenv/config';
import { redis } from '../redis/client.js';
import { query } from '../db/client.js';

const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

async function cleanupQueues() {
  console.log('[queue-cleanup] Starting...');

  // Find all register queue keys
  const keys = await redis.keys('queue:register:*');

  let totalRemoved = 0;

  for (const key of keys) {
    const entries = await redis.lrange(key, 0, -1);
    const now = Date.now();

    for (const raw of entries) {
      try {
        const entry = JSON.parse(raw);
        const age = now - new Date(entry.created_at).getTime();

        if (age > MAX_AGE_MS) {
          await redis.lrem(key, 1, raw);
          totalRemoved++;

          // Mark transaction as expired if still pending
          if (entry.transaction_id) {
            await query(
              `UPDATE transactions SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
              [entry.transaction_id],
            );
          }
        }
      } catch {
        // Skip malformed entries
        await redis.lrem(key, 1, raw);
        totalRemoved++;
      }
    }
  }

  console.log(`[queue-cleanup] Removed ${totalRemoved} expired entries from ${keys.length} queues`);
}

async function main() {
  await redis.connect();
  await cleanupQueues();
  await redis.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error('[queue-cleanup] Fatal error:', err);
  process.exit(1);
});
