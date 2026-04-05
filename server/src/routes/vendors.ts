import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import {
  createVendor,
  findBySlug,
  findByOwnerId,
  findNearby,
  getVendorStats,
  getRegisters,
  addRegister,
} from '../db/queries/vendors.js';
import { query } from '../db/client.js';
import { getVendorAnalytics } from '../db/queries/analytics.js';

const HAS_STRIPE = !!process.env.STRIPE_SECRET_KEY;

export async function vendorRoutes(app: FastifyInstance) {
  // POST /vendors — create vendor
  app.post(
    '/vendors',
    {
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1, maxLength: 200 }),
          description: Type.Optional(Type.String({ maxLength: 2000 })),
          category: Type.Optional(Type.String({ maxLength: 100 })),
          neighborhood: Type.Optional(Type.String({ maxLength: 100 })),
          address: Type.Optional(Type.String({ maxLength: 500 })),
          lat: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
          lng: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
          phone: Type.Optional(Type.String({ maxLength: 20 })),
          website: Type.Optional(Type.String({ maxLength: 500 })),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        description?: string;
        category?: string;
        neighborhood?: string;
        address?: string;
        lat?: number;
        lng?: number;
        phone?: string;
        website?: string;
      };

      const vendor = await createVendor(request.userId!, body);

      // Update user role to vendor
      await query('UPDATE users SET role = $1 WHERE id = $2', [
        'vendor',
        request.userId,
      ]);

      let stripeOnboardingUrl: string | null = null;

      if (HAS_STRIPE) {
        const { createConnectAccount } = await import('../services/stripe.service.js');
        const { rows: userRows } = await query(
          'SELECT phone FROM users WHERE id = $1',
          [request.userId],
        );
        const email = userRows[0]?.phone ?? '';
        stripeOnboardingUrl = await createConnectAccount(vendor.id, body.name, email);
      }

      return reply.status(201).send({
        id: vendor.id,
        slug: vendor.slug,
        status: vendor.status,
        stripe_onboarding_url: stripeOnboardingUrl,
      });
    },
  );

  // GET /vendors/:slug — public profile
  app.get(
    '/vendors/:slug',
    {
      schema: {
        params: Type.Object({
          slug: Type.String(),
        }),
      },
    },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const vendor = await findBySlug(slug);
      if (!vendor) throw new NotFoundError('Vendor not found');

      const registers = await getRegisters(vendor.id);

      return {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        description: vendor.description,
        category: vendor.category,
        neighborhood: vendor.neighborhood,
        address: vendor.address,
        logo_url: vendor.logo_url,
        follower_count: vendor.follower_count,
        subscription_plan: vendor.subscription_plan,
        registers: registers.map((r) => ({ id: r.id, label: r.label })),
      };
    },
  );

  // GET /vendors/nearby
  app.get(
    '/vendors/nearby',
    {
      schema: {
        querystring: Type.Object({
          lat: Type.Number({ minimum: -90, maximum: 90 }),
          lng: Type.Number({ minimum: -180, maximum: 180 }),
          radius_km: Type.Optional(Type.Number({ default: 2.0, minimum: 0.1, maximum: 50 })),
          limit: Type.Optional(Type.Integer({ default: 20, minimum: 1, maximum: 100 })),
          offset: Type.Optional(Type.Integer({ default: 0, minimum: 0 })),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { lat, lng, radius_km, limit, offset } = request.query as {
        lat: number;
        lng: number;
        radius_km?: number;
        limit?: number;
        offset?: number;
      };

      const result = await findNearby(
        lat,
        lng,
        radius_km ?? 2.0,
        limit ?? 20,
        offset ?? 0,
      );

      return {
        vendors: result.vendors.map((v) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          neighborhood: v.neighborhood,
          distance_km: Math.round(v.distance_km * 100) / 100,
          logo_url: v.logo_url,
          is_following: false, // Phase 2
          active_flash_deal: null, // Phase 2
        })),
        total: result.total,
      };
    },
  );

  // GET /vendors/map — all active vendors with deals and follow status for map view
  app.get(
    '/vendors/map',
    {
      schema: {
        querystring: Type.Object({
          category: Type.Optional(Type.String()),
        }),
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const userId = request.userId!;
      const { category } = request.query as { category?: string };

      // Get all active vendors with optional category filter
      const catFilter = category ? `AND LOWER(v.category) = LOWER($2)` : '';
      const params: unknown[] = [userId];
      if (category) params.push(category);

      const { rows: vendors } = await query(
        `SELECT v.id, v.name, v.slug, v.category, v.neighborhood, v.address,
                v.lat, v.lng, v.logo_url, v.cover_url, v.follower_count,
                EXISTS(SELECT 1 FROM follows WHERE user_id = $1 AND vendor_id = v.id) as is_following
         FROM vendors v
         WHERE v.status = 'active' ${catFilter}
         ORDER BY v.follower_count DESC`,
        params,
      );

      // Get active deals (flash/deal posts not expired)
      const { rows: activeDeals } = await query(
        `SELECT p.vendor_id, p.id as post_id, p.type, p.caption, p.multiplier, p.expires_at
         FROM posts p
         WHERE p.published = TRUE
         AND p.type IN ('flash', 'deal')
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
         ORDER BY p.created_at DESC`,
        [],
      );

      // Build a map of vendor_id -> active deal
      const dealMap: Record<string, any> = {};
      for (const deal of activeDeals) {
        if (!dealMap[deal.vendor_id]) {
          dealMap[deal.vendor_id] = {
            post_id: deal.post_id,
            type: deal.type,
            caption: deal.caption,
            multiplier: deal.multiplier,
            expires_at: deal.expires_at,
          };
        }
      }

      // Group by neighborhood for trending
      const neighborhoods: Record<string, number> = {};
      for (const v of vendors) {
        if (v.neighborhood) {
          neighborhoods[v.neighborhood] = (neighborhoods[v.neighborhood] || 0) + 1;
        }
      }

      return {
        vendors: vendors.map((v: any) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          category: v.category,
          neighborhood: v.neighborhood,
          address: v.address,
          lat: Number(v.lat),
          lng: Number(v.lng),
          logo_url: v.logo_url,
          cover_url: v.cover_url,
          follower_count: v.follower_count,
          is_following: v.is_following,
          active_deal: dealMap[v.id] ?? null,
        })),
        neighborhoods: Object.entries(neighborhoods)
          .map(([name, count]) => ({ name, vendor_count: count }))
          .sort((a, b) => b.vendor_count - a.vendor_count),
      };
    },
  );

  // GET /vendors/me — vendor owner dashboard
  app.get(
    '/vendors/me',
    { preHandler: [requireRole('vendor')] },
    async (request) => {
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor) throw new NotFoundError('No vendor found for this user');

      const [stats, registers] = await Promise.all([
        getVendorStats(vendor.id),
        getRegisters(vendor.id),
      ]);

      return {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        status: vendor.status,
        subscription_plan: vendor.subscription_plan,
        stripe_customer_id: vendor.stripe_customer_id,
        contribution_rate: vendor.contribution_rate,
        stats: {
          ...stats,
          followers: vendor.follower_count,
        },
        registers,
      };
    },
  );

  // POST /vendors/:id/registers
  app.post(
    '/vendors/:id/registers',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ label: Type.String({ minLength: 1, maxLength: 100 }) }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor || vendor.id !== id) {
        throw new ForbiddenError('Not the owner of this vendor');
      }

      const { label } = request.body as { label: string };
      const register = await addRegister(id, label);

      return reply.status(201).send({
        id: register.id,
        vendor_id: register.vendor_id,
        label: register.label,
        nfc_uid: register.nfc_uid,
      });
    },
  );

  // GET /vendors/me/analytics — vendor analytics dashboard
  app.get(
    '/vendors/me/analytics',
    {
      schema: {
        querystring: Type.Object({
          days: Type.Optional(
            Type.Union([
              Type.Literal(7),
              Type.Literal(30),
              Type.Literal(90),
            ], { default: 30 }),
          ),
        }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request) => {
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor) throw new NotFoundError('No vendor found for this user');

      const { days } = request.query as { days?: number };
      const analytics = await getVendorAnalytics(vendor.id, days ?? 30);

      return analytics;
    },
  );

  // POST /vendors/:id/subscribe — create a subscription
  app.post(
    '/vendors/:id/subscribe',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          plan: Type.Union([
            Type.Literal('basic'),
            Type.Literal('pro'),
            Type.Literal('premium'),
          ]),
        }),
      },
      preHandler: [requireRole('vendor')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { plan } = request.body as { plan: 'basic' | 'pro' | 'premium' };

      // Verify the requesting user owns this vendor
      const vendor = await findByOwnerId(request.userId!);
      if (!vendor || vendor.id !== id) {
        throw new ForbiddenError('Not the owner of this vendor');
      }

      if (!HAS_STRIPE) {
        // In dev mode, just update the plan directly
        await query(
          `UPDATE vendors SET subscription_plan = $1, subscription_status = 'active' WHERE id = $2`,
          [plan, id],
        );
        return reply.status(200).send({ subscription_id: 'dev_sub_' + id, plan });
      }

      const { createSubscription } = await import('../services/stripe.service.js');
      const subscriptionId = await createSubscription(id, plan);

      return reply.status(200).send({
        subscription_id: subscriptionId,
        plan,
      });
    },
  );
}
