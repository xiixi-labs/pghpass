import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { query } from '../db/client.js';
import {
  getRedemptionOptions,
  issueRedemption,
  validateRedemption,
  confirmRedemption,
} from '../services/redemption.service.js';
import { findByOwnerId } from '../db/queries/vendors.js';
import { NotFoundError, AppError } from '../lib/errors.js';

export async function redemptionRoutes(app: FastifyInstance) {
  // GET /redemptions/options
  app.get(
    '/redemptions/options',
    { preHandler: [requireAuth] },
    async (request) => {
      const { rows } = await query(
        'SELECT balance FROM point_balances WHERE user_id = $1',
        [request.userId],
      );
      const balance = rows.length > 0 ? Number(rows[0].balance) : 0;

      return {
        options: getRedemptionOptions(balance),
        current_balance: balance,
      };
    },
  );

  // POST /redemptions/issue
  app.post(
    '/redemptions/issue',
    {
      schema: {
        body: Type.Object({
          option_id: Type.String(),
          vendor_id: Type.Union([Type.String(), Type.Null()]),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { option_id, vendor_id } = request.body as {
        option_id: string;
        vendor_id: string | null;
      };

      const result = await issueRedemption(request.userId!, option_id, vendor_id);
      return reply.status(201).send(result);
    },
  );

  // POST /redemptions/validate
  app.post(
    '/redemptions/validate',
    {
      schema: {
        body: Type.Object({
          token: Type.String(),
        }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request) => {
      const { token } = request.body as { token: string };
      const result = await validateRedemption(token);
      if (!result) {
        throw new AppError('Redemption code expired or already used', 400);
      }
      return result;
    },
  );

  // POST /redemptions/:id/confirm
  app.post(
    '/redemptions/:id/confirm',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor) throw new NotFoundError('No vendor found');

      const result = await confirmRedemption(id, vendor.id);
      if (!result) {
        throw new AppError('Redemption not found or already claimed', 400);
      }
      return result;
    },
  );
}
