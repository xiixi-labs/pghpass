import { query } from '../db/client.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

// ── Types ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'flash_deal'
  | 'milestone'
  | 'redemption'
  | 'weekly_summary'
  | 'new_post';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

interface SendResult {
  sent: number;
  failed: number;
}

// ── Expo Push API ────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via Expo's Push API.
 * Batches messages into groups of 100 (Expo limit).
 */
async function sendExpoPush(messages: PushMessage[]): Promise<SendResult> {
  if (DEV_MODE) {
    console.log(`[notifications] DEV_MODE: Would send ${messages.length} push(es):`,
      messages.map((m) => `→ ${m.to.slice(0, 30)}... "${m.title}"`).join('\n'),
    );
    return { sent: messages.length, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Batch in groups of 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error('[notifications] Expo push failed:', res.status, await res.text());
        failed += batch.length;
        continue;
      }

      const json = (await res.json()) as { data: Array<{ status: string; message?: string }> };
      for (const ticket of json.data) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          console.error('[notifications] Push ticket error:', ticket.message);
          failed++;
        }
      }
    } catch (err) {
      console.error('[notifications] Expo push error:', err);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

// ── Token management ─────────────────────────────────────────────────

export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await query(
    `INSERT INTO push_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, token) DO UPDATE SET active = TRUE`,
    [userId, token, platform],
  );
}

export async function removePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await query(
    `UPDATE push_tokens SET active = FALSE WHERE user_id = $1 AND token = $2`,
    [userId, token],
  );
}

async function getActiveTokens(userId: string): Promise<string[]> {
  const { rows } = await query(
    `SELECT token FROM push_tokens WHERE user_id = $1 AND active = TRUE`,
    [userId],
  );
  return rows.map((r: any) => r.token);
}

// ── Preferences ──────────────────────────────────────────────────────

export interface NotificationPreferences {
  flash_deals: boolean;
  points_milestones: boolean;
  redemption_ready: boolean;
  weekly_summary: boolean;
  new_post_followed: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  flash_deals: true,
  points_milestones: true,
  redemption_ready: true,
  weekly_summary: true,
  new_post_followed: true,
};

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const { rows } = await query(
    `SELECT flash_deals, points_milestones, redemption_ready, weekly_summary, new_post_followed
     FROM notification_preferences WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return DEFAULT_PREFS;
  return rows[0] as NotificationPreferences;
}

export async function updatePreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const current = await getPreferences(userId);
  const merged = { ...current, ...prefs };

  await query(
    `INSERT INTO notification_preferences (user_id, flash_deals, points_milestones, redemption_ready, weekly_summary, new_post_followed)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       flash_deals = $2, points_milestones = $3, redemption_ready = $4,
       weekly_summary = $5, new_post_followed = $6, updated_at = NOW()`,
    [userId, merged.flash_deals, merged.points_milestones, merged.redemption_ready, merged.weekly_summary, merged.new_post_followed],
  );

  return merged;
}

// ── In-app notification log ──────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

async function logNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, unknown>,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, body, type, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, title, body, type, data ? JSON.stringify(data) : null],
  );
  return rows[0].id;
}

export async function getNotifications(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{ notifications: Notification[]; unread_count: number }> {
  const [notifResult, countResult] = await Promise.all([
    query(
      `SELECT id, title, body, type, data, read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [userId],
    ),
  ]);

  return {
    notifications: notifResult.rows as Notification[],
    unread_count: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  );
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
    [userId],
  );
  return result.rowCount ?? 0;
}

// ── Notification triggers ────────────────────────────────────────────

/**
 * Send a flash deal notification to all followers of a vendor.
 */
export async function notifyFlashDeal(
  vendorId: string,
  vendorName: string,
  postCaption: string,
  postId: string,
): Promise<SendResult> {
  // Get all followers
  const { rows: followers } = await query(
    `SELECT user_id FROM follows WHERE vendor_id = $1`,
    [vendorId],
  );

  if (followers.length === 0) return { sent: 0, failed: 0 };

  const title = `${vendorName} — Flash Deal!`;
  const body = postCaption.length > 100 ? postCaption.slice(0, 97) + '...' : postCaption;
  const data = { vendor_id: vendorId, post_id: postId, type: 'flash_deal' as const };

  const messages: PushMessage[] = [];

  for (const f of followers) {
    const prefs = await getPreferences(f.user_id);
    if (!prefs.flash_deals) continue;

    // Log in-app notification
    await logNotification(f.user_id, title, body, 'flash_deal', data);

    // Get push tokens
    const tokens = await getActiveTokens(f.user_id);
    for (const token of tokens) {
      messages.push({ to: token, title, body, data, sound: 'default' });
    }
  }

  return sendExpoPush(messages);
}

/**
 * Send a points milestone notification.
 */
export async function notifyMilestone(
  userId: string,
  milestone: number,
  currentBalance: number,
): Promise<SendResult> {
  const prefs = await getPreferences(userId);
  if (!prefs.points_milestones) return { sent: 0, failed: 0 };

  const title = `You hit ${milestone.toLocaleString()} lifetime points!`;
  const body = `Your current balance is ${currentBalance.toLocaleString()} pts. Keep earning at your favorite Pittsburgh spots!`;
  const data = { type: 'milestone', milestone, balance: currentBalance };

  await logNotification(userId, title, body, 'milestone', data);

  const tokens = await getActiveTokens(userId);
  const messages = tokens.map((token) => ({
    to: token, title, body, data, sound: 'default' as const,
  }));

  return sendExpoPush(messages);
}

/**
 * Notify a customer when their redemption is ready/confirmed.
 */
export async function notifyRedemptionReady(
  userId: string,
  rewardLabel: string,
  vendorName: string,
): Promise<SendResult> {
  const prefs = await getPreferences(userId);
  if (!prefs.redemption_ready) return { sent: 0, failed: 0 };

  const title = 'Reward Ready!';
  const body = `Your "${rewardLabel}" at ${vendorName} is ready to use.`;
  const data = { type: 'redemption' };

  await logNotification(userId, title, body, 'redemption', data);

  const tokens = await getActiveTokens(userId);
  const messages = tokens.map((token) => ({
    to: token, title, body, data, sound: 'default' as const,
  }));

  return sendExpoPush(messages);
}

/**
 * Notify followers when a followed vendor creates a new post.
 */
export async function notifyNewPost(
  vendorId: string,
  vendorName: string,
  postCaption: string,
  postId: string,
  postType: string,
): Promise<SendResult> {
  // Skip flash deals — they have their own notification
  if (postType === 'flash') return { sent: 0, failed: 0 };

  const { rows: followers } = await query(
    `SELECT user_id FROM follows WHERE vendor_id = $1`,
    [vendorId],
  );

  if (followers.length === 0) return { sent: 0, failed: 0 };

  const title = `${vendorName} posted`;
  const body = postCaption.length > 100 ? postCaption.slice(0, 97) + '...' : postCaption;
  const data = { vendor_id: vendorId, post_id: postId, type: 'new_post' as const };

  const messages: PushMessage[] = [];

  for (const f of followers) {
    const prefs = await getPreferences(f.user_id);
    if (!prefs.new_post_followed) continue;

    await logNotification(f.user_id, title, body, 'new_post', data);

    const tokens = await getActiveTokens(f.user_id);
    for (const token of tokens) {
      messages.push({ to: token, title, body, data, sound: 'default' });
    }
  }

  return sendExpoPush(messages);
}

// ── Milestone checker ────────────────────────────────────────────────

const MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/**
 * Check if a user just crossed a lifetime points milestone.
 * Call this after adding points to the ledger.
 */
export async function checkMilestone(
  userId: string,
  prevLifetime: number,
  newLifetime: number,
  currentBalance: number,
): Promise<void> {
  for (const m of MILESTONES) {
    if (prevLifetime < m && newLifetime >= m) {
      await notifyMilestone(userId, m, currentBalance);
      break; // Only send one milestone notification at a time
    }
  }
}
