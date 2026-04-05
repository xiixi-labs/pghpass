import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { query } from '../db/client.js';
import { requireAuth } from '../plugins/auth.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

export async function profileRoutes(app: FastifyInstance) {
  // GET /profile — Get extended user profile
  app.get(
    '/profile',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.userId!;

      if (DEV_MODE) {
        return {
          id: 'dev-customer-1',
          first_name: 'Zach',
          last_name: 'Schultz',
          neighborhood: 'Lawrenceville',
          bio: 'Coffee enthusiast exploring the best local spots in Pittsburgh.',
          avatar_url: null,
          onboarded: true,
          checkin_count: 47,
          referral_code_used: null,
          created_at: '2024-11-15T00:00:00Z',
        };
      }

      const { rows } = await query(
        `SELECT id, first_name, last_name, neighborhood, bio, avatar_url, onboarded, checkin_count, referral_code_used, created_at
         FROM users WHERE id = $1`,
        [userId],
      );

      return rows[0] ?? null;
    },
  );

  // PATCH /profile — Update user profile
  app.patch(
    '/profile',
    {
      schema: {
        body: Type.Object({
          first_name: Type.Optional(Type.String()),
          last_name: Type.Optional(Type.String()),
          neighborhood: Type.Optional(Type.String()),
          bio: Type.Optional(Type.String()),
          avatar_url: Type.Optional(Type.String()),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const userId = request.userId!;
      const body = request.body as Record<string, string>;

      if (DEV_MODE) {
        return { success: true, ...body };
      }

      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      for (const [key, value] of Object.entries(body)) {
        if (['first_name', 'last_name', 'neighborhood', 'bio', 'avatar_url'].includes(key)) {
          fields.push(`${key} = $${i}`);
          values.push(value);
          i++;
        }
      }

      if (fields.length === 0) {
        return { success: false, message: 'No valid fields to update' };
      }

      values.push(userId);
      await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`,
        values,
      );

      return { success: true };
    },
  );

  // POST /auth/onboarded — Mark user as onboarded
  app.post(
    '/auth/onboarded',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.userId!;

      if (DEV_MODE) {
        return { success: true };
      }

      await query('UPDATE users SET onboarded = true WHERE id = $1', [userId]);
      return { success: true };
    },
  );
}
