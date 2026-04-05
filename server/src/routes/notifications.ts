import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth } from '../plugins/auth.js';
import {
  registerPushToken,
  removePushToken,
  getPreferences,
  updatePreferences,
  getNotifications,
  markRead,
  markAllRead,
} from '../services/notification.service.js';

export async function notificationRoutes(app: FastifyInstance) {
  // POST /notifications/push-token — register an Expo push token
  app.post(
    '/notifications/push-token',
    {
      schema: {
        body: Type.Object({
          token: Type.String({ minLength: 1 }),
          platform: Type.Union([Type.Literal('ios'), Type.Literal('android')]),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { token, platform } = request.body as { token: string; platform: 'ios' | 'android' };
      await registerPushToken(request.userId!, token, platform);
      return reply.status(200).send({ registered: true });
    },
  );

  // DELETE /notifications/push-token — deactivate a push token
  app.delete(
    '/notifications/push-token',
    {
      schema: {
        body: Type.Object({
          token: Type.String({ minLength: 1 }),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { token } = request.body as { token: string };
      await removePushToken(request.userId!, token);
      return reply.status(200).send({ removed: true });
    },
  );

  // GET /notifications/preferences — get notification preferences
  app.get(
    '/notifications/preferences',
    { preHandler: [requireAuth] },
    async (request) => {
      return getPreferences(request.userId!);
    },
  );

  // PATCH /notifications/preferences — update notification preferences
  app.patch(
    '/notifications/preferences',
    {
      schema: {
        body: Type.Object({
          flash_deals: Type.Optional(Type.Boolean()),
          points_milestones: Type.Optional(Type.Boolean()),
          redemption_ready: Type.Optional(Type.Boolean()),
          weekly_summary: Type.Optional(Type.Boolean()),
          new_post_followed: Type.Optional(Type.Boolean()),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const prefs = request.body as Record<string, boolean>;
      return updatePreferences(request.userId!, prefs);
    },
  );

  // GET /notifications — list notifications for the current user
  app.get(
    '/notifications',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
          offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { limit, offset } = request.query as { limit?: number; offset?: number };
      return getNotifications(request.userId!, limit ?? 20, offset ?? 0);
    },
  );

  // POST /notifications/:id/read — mark a notification as read
  app.post(
    '/notifications/:id/read',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await markRead(request.userId!, id);
      return reply.status(200).send({ read: true });
    },
  );

  // POST /notifications/read-all — mark all notifications as read
  app.post(
    '/notifications/read-all',
    { preHandler: [requireAuth] },
    async (request) => {
      const count = await markAllRead(request.userId!);
      return { marked_read: count };
    },
  );
}
