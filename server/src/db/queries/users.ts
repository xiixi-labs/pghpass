import { query } from '../client.js';
import type { User } from '@pgh-pass/types';

export async function upsertByClerkId(
  clerkId: string,
  phone: string,
  role: 'customer' | 'vendor',
  firstName?: string,
  lastName?: string,
): Promise<{ user: User; isNew: boolean }> {
  // Try to find existing user first
  const existing = await findByClerkId(clerkId);
  if (existing) {
    return { user: existing, isNew: false };
  }

  const { rows } = await query<User>(
    `INSERT INTO users (clerk_id, phone, role, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (clerk_id) DO UPDATE SET
       last_active_at = NOW()
     RETURNING *`,
    [clerkId, phone, role, firstName ?? null, lastName ?? null],
  );

  return { user: rows[0], isNew: true };
}

export async function findByClerkId(clerkId: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE clerk_id = $1',
    [clerkId],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}
