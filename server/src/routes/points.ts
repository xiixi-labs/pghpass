import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth } from '../plugins/auth.js';
import { query } from '../db/client.js';

const REWARD_THRESHOLD = 500; // Points per reward level

export async function pointRoutes(app: FastifyInstance) {
  // GET /points/balance
  app.get(
    '/points/balance',
    { preHandler: [requireAuth] },
    async (request) => {
      const { rows } = await query(
        'SELECT balance, lifetime_pts FROM point_balances WHERE user_id = $1',
        [request.userId],
      );

      const balance = rows.length > 0 ? Number(rows[0].balance) : 0;
      const lifetimePoints = rows.length > 0 ? Number(rows[0].lifetime_pts) : 0;
      const dollarValue = balance / 100;
      const nextThreshold = Math.ceil(balance / REWARD_THRESHOLD) * REWARD_THRESHOLD;
      const pointsToNext = nextThreshold > balance ? nextThreshold - balance : REWARD_THRESHOLD;

      return {
        balance,
        lifetime_points: lifetimePoints,
        dollar_value: dollarValue,
        next_reward_threshold: nextThreshold || REWARD_THRESHOLD,
        points_to_next: pointsToNext,
      };
    },
  );

  // GET /points/ledger
  app.get(
    '/points/ledger',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Optional(Type.Integer({ default: 20 })),
          offset: Type.Optional(Type.Integer({ default: 0 })),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { limit, offset } = request.query as {
        limit?: number;
        offset?: number;
      };

      const countResult = await query(
        'SELECT COUNT(*) as total FROM point_ledger WHERE user_id = $1',
        [request.userId],
      );

      const { rows } = await query(
        `SELECT pl.id, pl.delta, pl.balance_after, pl.note, v.name as vendor_name, pl.created_at
         FROM point_ledger pl
         LEFT JOIN vendors v ON pl.vendor_id = v.id
         WHERE pl.user_id = $1
         ORDER BY pl.created_at DESC
         LIMIT $2 OFFSET $3`,
        [request.userId, limit ?? 20, offset ?? 0],
      );

      return {
        entries: rows,
        total: Number(countResult.rows[0].total),
      };
    },
  );
}
