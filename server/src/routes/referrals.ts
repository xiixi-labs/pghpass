import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { query, transaction } from '../db/client.js';
import { requireAuth } from '../plugins/auth.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

export async function referralRoutes(app: FastifyInstance) {
  // GET /referrals/my-code — Get or create user's referral code
  app.get(
    '/referrals/my-code',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.userId!;

      if (DEV_MODE) {
        return { code: 'PGHZACH', uses: 3, max_uses: 50, link: 'https://pghpass.app/join/PGHZACH' };
      }

      // Check if user already has a code
      const { rows } = await query(
        'SELECT code, uses, max_uses FROM referral_codes WHERE user_id = $1 AND active = true',
        [userId],
      );

      if (rows.length > 0) {
        return {
          code: rows[0].code,
          uses: rows[0].uses,
          max_uses: rows[0].max_uses,
          link: `https://pghpass.app/join/${rows[0].code}`,
        };
      }

      // Generate a new code: PGH + first 4 chars of userId + random 2 digits
      const code =
        'PGH' +
        userId.replace(/-/g, '').substring(0, 4).toUpperCase() +
        Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, '0');

      const { rows: newRows } = await query(
        'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) RETURNING code, uses, max_uses',
        [userId, code],
      );

      return {
        code: newRows[0].code,
        uses: 0,
        max_uses: 50,
        link: `https://pghpass.app/join/${newRows[0].code}`,
      };
    },
  );

  // POST /referrals/claim — Claim a referral code
  app.post(
    '/referrals/claim',
    {
      schema: {
        body: Type.Object({
          code: Type.String({ minLength: 3 }),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const userId = request.userId!;
      const { code } = request.body as { code: string };

      if (DEV_MODE) {
        return { success: true, bonus_points: 100, message: 'Referral bonus applied!' };
      }

      // Find the referral code
      const { rows: codeRows } = await query(
        'SELECT id, user_id, uses, max_uses FROM referral_codes WHERE code = $1 AND active = true',
        [code.toUpperCase()],
      );

      if (codeRows.length === 0) {
        return { success: false, message: 'Invalid referral code' };
      }

      const refCode = codeRows[0];

      // Can't refer yourself
      if (refCode.user_id === userId) {
        return { success: false, message: 'Cannot use your own referral code' };
      }

      // Check if already used a referral
      const { rows: existing } = await query(
        'SELECT id FROM referral_claims WHERE referee_id = $1',
        [userId],
      );

      if (existing.length > 0) {
        return { success: false, message: 'You have already used a referral code' };
      }

      // Check max uses
      if (refCode.uses >= refCode.max_uses) {
        return { success: false, message: 'This referral code has reached its limit' };
      }

      const bonusPoints = 100;

      await transaction(async (client) => {
        // Create claim record
        await client.query(
          'INSERT INTO referral_claims (referral_code_id, referrer_id, referee_id, bonus_points) VALUES ($1, $2, $3, $4)',
          [refCode.id, refCode.user_id, userId, bonusPoints],
        );

        // Increment uses
        await client.query('UPDATE referral_codes SET uses = uses + 1 WHERE id = $1', [refCode.id]);

        // Award points to referee
        const { rows: balRows } = await client.query(
          'SELECT balance FROM point_balances WHERE user_id = $1 FOR UPDATE',
          [userId],
        );
        const currentBalance = balRows.length > 0 ? Number(balRows[0].balance) : 0;
        await client.query(
          'INSERT INTO point_ledger (user_id, delta, balance_after, note) VALUES ($1, $2, $3, $4)',
          [userId, bonusPoints, currentBalance + bonusPoints, 'Referral bonus - welcome!'],
        );

        // Award points to referrer
        const { rows: refBalRows } = await client.query(
          'SELECT balance FROM point_balances WHERE user_id = $1 FOR UPDATE',
          [refCode.user_id],
        );
        const refBalance = refBalRows.length > 0 ? Number(refBalRows[0].balance) : 0;
        await client.query(
          'INSERT INTO point_ledger (user_id, delta, balance_after, note) VALUES ($1, $2, $3, $4)',
          [refCode.user_id, bonusPoints, refBalance + bonusPoints, 'Referral bonus - friend joined!'],
        );

        // Mark user's referral code usage
        await client.query('UPDATE users SET referral_code_used = $1 WHERE id = $2', [code.toUpperCase(), userId]);
      });

      return { success: true, bonus_points: bonusPoints, message: 'Referral bonus applied!' };
    },
  );
}
