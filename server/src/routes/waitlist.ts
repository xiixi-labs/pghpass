import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { insertWaitlistEntry, getWaitlistCount } from '../db/queries/waitlist.js';

export async function waitlistRoutes(app: FastifyInstance) {
  // POST /v1/waitlist — add email to waitlist
  app.post(
    '/waitlist',
    {
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          role: Type.Optional(
            Type.Union([Type.Literal('customer'), Type.Literal('vendor')]),
          ),
          comment: Type.Optional(Type.String({ maxLength: 500 })),
        }),
      },
      config: { public: true },
    },
    async (request, reply) => {
      const { email, role, comment } = request.body as {
        email: string;
        role?: 'customer' | 'vendor';
        comment?: string;
      };

      const { isNew } = await insertWaitlistEntry(email, role ?? 'customer', comment);

      if (isNew) {
        return reply.status(201).send({ message: "You're in! We'll be in touch." });
      }

      return reply.status(409).send({ message: "You're already on the list!" });
    },
  );

  // GET /v1/waitlist/count — public count
  app.get(
    '/waitlist/count',
    { config: { public: true } },
    async (_request, reply) => {
      const count = await getWaitlistCount();
      return reply.send({ count });
    },
  );
}
