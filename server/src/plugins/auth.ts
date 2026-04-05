import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/client.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { UserRole } from '@pgh-pass/types';

const DEV_MODE = process.env.DEV_MODE === 'true';

// Augment Fastify request to include our fields
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: UserRole;
    clerkUserId?: string;
  }
}

export async function authPlugin(app: FastifyInstance) {
  if (DEV_MODE) {
    console.log('[auth] DEV_MODE enabled — Clerk auth bypassed');
    return;
  }

  const { clerkPlugin } = await import('@clerk/fastify');
  await app.register(clerkPlugin, {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}

/**
 * PreHandler that requires a valid Clerk session.
 * In DEV_MODE, injects the first seed vendor or customer user.
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  if (DEV_MODE) {
    // In dev mode, use the first user in the DB as the authenticated user
    const { rows } = await query(
      'SELECT id, role, clerk_id FROM users ORDER BY created_at LIMIT 1',
    );
    if (rows.length > 0) {
      request.userId = rows[0].id;
      request.userRole = rows[0].role;
      request.clerkUserId = rows[0].clerk_id;
    } else {
      // No users yet — set a placeholder
      request.clerkUserId = 'dev_user';
    }
    return;
  }

  const { getAuth } = await import('@clerk/fastify');
  const { userId: clerkUserId } = getAuth(request);
  if (!clerkUserId) {
    throw new UnauthorizedError();
  }
  request.clerkUserId = clerkUserId;

  const { rows } = await query(
    'SELECT id, role FROM users WHERE clerk_id = $1',
    [clerkUserId],
  );

  if (rows.length > 0) {
    request.userId = rows[0].id;
    request.userRole = rows[0].role;
  }
}

/**
 * PreHandler factory that requires a specific role.
 * In DEV_MODE with a role query param (?as=vendor), overrides the role.
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (DEV_MODE) {
      // Allow ?as=vendor or ?as=customer to switch dev user
      const asRole = (request.query as Record<string, string>)?.as as UserRole | undefined;
      const targetRole = asRole && roles.includes(asRole) ? asRole : roles[0];

      const { rows } = await query(
        'SELECT id, role, clerk_id FROM users WHERE role = $1 ORDER BY created_at LIMIT 1',
        [targetRole],
      );
      if (rows.length > 0) {
        request.userId = rows[0].id;
        request.userRole = rows[0].role;
        request.clerkUserId = rows[0].clerk_id;
      } else {
        request.clerkUserId = 'dev_user';
        request.userRole = targetRole;
      }
      return;
    }

    await requireAuth(request, reply);
    if (!request.userRole || !roles.includes(request.userRole)) {
      throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
    }
  };
}
