import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { upsertByClerkId } from '../db/queries/users.js';
import { UnauthorizedError } from '../lib/errors.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/sync',
    {
      schema: {
        body: Type.Object({
          role: Type.Union([Type.Literal('customer'), Type.Literal('vendor')]),
        }),
      },
    },
    async (request, reply) => {
      const { role } = request.body as { role: 'customer' | 'vendor' };

      if (DEV_MODE) {
        // In dev mode, create/return a dev user without Clerk
        const { user, isNew } = await upsertByClerkId(
          'dev_user_' + role,
          '+14125550001',
          role,
          'Dev',
          role === 'vendor' ? 'Vendor' : 'Customer',
        );
        return reply.status(isNew ? 201 : 200).send({
          id: user.id,
          clerk_id: user.clerk_id,
          role: user.role,
          is_new_user: isNew,
        });
      }

      const { getAuth, clerkClient } = await import('@clerk/fastify');
      const { userId: clerkUserId } = getAuth(request);
      if (!clerkUserId) throw new UnauthorizedError();

      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const phone =
        clerkUser.primaryPhoneNumber?.phoneNumber ??
        clerkUser.phoneNumbers[0]?.phoneNumber ??
        '';

      const { user, isNew } = await upsertByClerkId(
        clerkUserId,
        phone,
        role,
        clerkUser.firstName ?? undefined,
        clerkUser.lastName ?? undefined,
      );

      return reply.status(isNew ? 201 : 200).send({
        id: user.id,
        clerk_id: user.clerk_id,
        role: user.role,
        is_new_user: isNew,
      });
    },
  );
}
