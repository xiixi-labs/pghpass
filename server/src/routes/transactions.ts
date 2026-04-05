import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { generateQRTransaction } from '../services/queue.service.js';
import {
  claimQRTransaction,
  claimNFCTransaction,
} from '../services/transaction.service.js';
import {
  getCustomerHistory,
  getVendorRecent,
} from '../db/queries/transactions.js';
import { findByOwnerId } from '../db/queries/vendors.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';

export async function transactionRoutes(app: FastifyInstance) {
  // POST /transactions/qr/generate
  app.post(
    '/transactions/qr/generate',
    {
      schema: {
        body: Type.Object({
          vendor_id: Type.String(),
          register_id: Type.String(),
          amount: Type.Number({ minimum: 0.01, maximum: 999.99 }),
        }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request, reply) => {
      const { vendor_id, register_id, amount } = request.body as {
        vendor_id: string;
        register_id: string;
        amount: number;
      };

      // Verify the vendor belongs to this user
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor || vendor.id !== vendor_id) {
        throw new ForbiddenError('Not the owner of this vendor');
      }

      const result = await generateQRTransaction(vendor_id, register_id, amount);
      return reply.status(201).send(result);
    },
  );

  // POST /transactions/qr/claim
  app.post(
    '/transactions/qr/claim',
    {
      schema: {
        body: Type.Object({
          token: Type.String(),
          customer_entered_amount: Type.Number({ minimum: 0.01 }),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { token, customer_entered_amount } = request.body as {
        token: string;
        customer_entered_amount: number;
      };

      return claimQRTransaction(token, customer_entered_amount, request.userId!);
    },
  );

  // POST /transactions/nfc/claim
  app.post(
    '/transactions/nfc/claim',
    {
      schema: {
        body: Type.Object({
          vendor_id: Type.String(),
          register_id: Type.String(),
          customer_entered_amount: Type.Number({ minimum: 0.01 }),
          tapped_at: Type.String(),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { vendor_id, register_id, customer_entered_amount, tapped_at } =
        request.body as {
          vendor_id: string;
          register_id: string;
          customer_entered_amount: number;
          tapped_at: string;
        };

      return claimNFCTransaction(
        vendor_id,
        register_id,
        customer_entered_amount,
        tapped_at,
        request.userId!,
      );
    },
  );

  // GET /transactions/history
  app.get(
    '/transactions/history',
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
      return getCustomerHistory(request.userId!, limit ?? 20, offset ?? 0);
    },
  );

  // GET /transactions/vendor/recent
  app.get(
    '/transactions/vendor/recent',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Optional(Type.Integer({ default: 10 })),
        }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request) => {
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor) throw new NotFoundError('No vendor found');

      const { limit } = request.query as { limit?: number };
      const checkIns = await getVendorRecent(vendor.id, limit ?? 10);
      return { check_ins: checkIns };
    },
  );
}
