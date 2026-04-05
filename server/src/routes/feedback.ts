import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { query } from '../db/client.js';
import { requireAuth } from '../plugins/auth.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

export async function feedbackRoutes(app: FastifyInstance) {
  // POST /feedback — Submit feedback
  app.post(
    '/feedback',
    {
      schema: {
        body: Type.Object({
          type: Type.Union([Type.Literal('bug'), Type.Literal('feature'), Type.Literal('general')]),
          message: Type.String({ minLength: 1, maxLength: 2000 }),
          screen: Type.Optional(Type.String()),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const userId = request.userId!;
      const { type, message, screen } = request.body as {
        type: string;
        message: string;
        screen?: string;
      };

      if (DEV_MODE) {
        console.log(`[feedback] ${type}: ${message} (screen: ${screen ?? 'unknown'})`);
        return { success: true, message: 'Thank you for your feedback!' };
      }

      await query(
        'INSERT INTO feedback (user_id, type, message, screen) VALUES ($1, $2, $3, $4)',
        [userId, type, message, screen ?? null],
      );

      return { success: true, message: 'Thank you for your feedback!' };
    },
  );
}
