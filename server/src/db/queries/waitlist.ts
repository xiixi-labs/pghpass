import { query } from '../client.js';

interface WaitlistRow {
  id: string;
  email: string;
  role: string;
  comment: string | null;
  created_at: string;
}

export async function insertWaitlistEntry(
  email: string,
  role: 'customer' | 'vendor' = 'customer',
  comment?: string,
): Promise<{ entry: WaitlistRow; isNew: boolean }> {
  // Try insert, on conflict do nothing and return existing
  const { rows } = await query<WaitlistRow>(
    `INSERT INTO waitlist (email, role, comment)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email, role, comment ?? null],
  );

  if (rows.length > 0) {
    return { entry: rows[0], isNew: true };
  }

  // Already existed
  const existing = await query<WaitlistRow>(
    `SELECT * FROM waitlist WHERE email = $1`,
    [email],
  );
  return { entry: existing.rows[0], isNew: false };
}

export async function getWaitlistCount(): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM waitlist`,
  );
  return parseInt(rows[0].count, 10);
}
