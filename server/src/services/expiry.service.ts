import { query } from '../db/client.js';

const CLEANUP_INTERVAL_MS = 60_000; // Every 60 seconds

/**
 * Marks expired flash deals and deals as unpublished.
 * Runs on a periodic interval to keep the feed clean.
 */
export async function cleanupExpiredPosts(): Promise<number> {
  const result = await query(
    `UPDATE posts SET published = FALSE
     WHERE expires_at IS NOT NULL
     AND expires_at < NOW()
     AND published = TRUE`,
  );
  return result.rowCount ?? 0;
}

/**
 * Starts the periodic expiry cleanup.
 * Returns a cleanup function to stop the interval.
 */
export function startExpiryCleanup(): () => void {
  console.log('[expiry] Starting expired post cleanup (every 60s)');

  const run = async () => {
    try {
      const count = await cleanupExpiredPosts();
      if (count > 0) {
        console.log(`[expiry] Marked ${count} expired post(s) as unpublished`);
      }
    } catch (err) {
      console.error('[expiry] Cleanup error:', err);
    }
  };

  // Run immediately on startup, then on interval
  run();
  const interval = setInterval(run, CLEANUP_INTERVAL_MS);

  return () => clearInterval(interval);
}
