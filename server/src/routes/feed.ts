import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { query } from '../db/client.js';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { notifyFlashDeal, notifyNewPost } from '../services/notification.service.js';

export async function feedRoutes(app: FastifyInstance) {
  // GET /feed/discover — all posts, reverse-chron, ranked
  app.get('/feed/discover', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const result = await query(
      `SELECT p.*, v.name as vendor_name, v.slug as vendor_slug, v.logo_url as vendor_logo, v.neighborhood as vendor_neighborhood
       FROM posts p JOIN vendors v ON p.vendor_id = v.id
       WHERE p.published = TRUE
       ORDER BY p.created_at DESC`,
      [userId],
    );
    return { posts: result.rows, total: result.rowCount, has_more: false };
  });

  // GET /feed/following — posts from followed vendors
  app.get('/feed/following', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const result = await query(
      `SELECT p.*, v.name as vendor_name FROM posts p
       JOIN vendors v ON p.vendor_id = v.id
       JOIN follows f ON f.vendor_id = p.vendor_id AND f.user_id = $1
       WHERE p.published = TRUE
       ORDER BY p.created_at DESC`,
      [userId],
    );
    return { posts: result.rows, total: result.rowCount, has_more: false };
  });

  // POST /posts — create post (vendor)
  app.post('/posts', {
    schema: {
      body: Type.Object({
        type: Type.Union([Type.Literal('update'), Type.Literal('deal'), Type.Literal('flash')]),
        caption: Type.String({ minLength: 1, maxLength: 2000 }),
        photo_url: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        multiplier: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        expires_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    },
    preHandler: [requireRole('vendor')],
    handler: async (req) => {
      const userId = req.userId ?? (req as any).userId ?? 'dev-vendor-1';
      const { type, caption, photo_url, multiplier, expires_at } = req.body as any;
      // In prod, look up vendor by owner_id. In dev, use first vendor.
      const vendorResult = await query(
        'SELECT id FROM vendors WHERE owner_id = $1',
        [userId],
      );
      const vendorId = vendorResult.rows[0]?.id ?? 'dev-vendor-biz-1';
      const result = await query(
        'INSERT INTO posts (vendor_id, type, caption, photo_url, multiplier, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [vendorId, type, caption, photo_url ?? null, multiplier ?? null, expires_at ?? null],
      );

      const post = result.rows[0];

      // Fire push notifications (non-blocking)
      const vendorNameResult = await query('SELECT name FROM vendors WHERE id = $1', [vendorId]);
      const vendorName = vendorNameResult.rows[0]?.name ?? 'A vendor';

      if (type === 'flash') {
        notifyFlashDeal(vendorId, vendorName, caption, post.id).catch((err) =>
          console.error('[notifications] flash deal notify failed:', err),
        );
      } else {
        notifyNewPost(vendorId, vendorName, caption, post.id, type).catch((err) =>
          console.error('[notifications] new post notify failed:', err),
        );
      }

      return { id: post.id, created_at: post.created_at };
    },
  });

  // GET /posts/vendor — vendor's own posts
  app.get('/posts/vendor', { preHandler: [requireRole('vendor')] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-vendor-1';
    const vendorResult = await query(
      'SELECT id FROM vendors WHERE owner_id = $1',
      [userId],
    );
    const vendorId = vendorResult.rows[0]?.id ?? 'dev-vendor-biz-1';
    const result = await query(
      'SELECT * FROM posts WHERE vendor_id = $1 ORDER BY created_at DESC',
      [vendorId],
    );
    return { posts: result.rows, total: result.rowCount };
  });

  // PATCH /posts/:id — edit post (vendor)
  app.patch('/posts/:id', {
    schema: {
      body: Type.Object({
        caption: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
        type: Type.Optional(Type.Union([Type.Literal('update'), Type.Literal('deal'), Type.Literal('flash')])),
        multiplier: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        expires_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    },
    preHandler: [requireRole('vendor')],
    handler: async (req) => {
      const userId = req.userId ?? (req as any).userId ?? 'dev-vendor-1';
      const postId = (req.params as any).id;
      const { caption, type, multiplier, expires_at } = req.body as any;

      // Verify ownership
      const vendorResult = await query('SELECT id FROM vendors WHERE owner_id = $1', [userId]);
      const vendorId = vendorResult.rows[0]?.id;
      if (!vendorId) return { error: 'Vendor not found' };

      const postResult = await query('SELECT * FROM posts WHERE id = $1 AND vendor_id = $2', [postId, vendorId]);
      if (postResult.rows.length === 0) return { error: 'Post not found' };

      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (caption !== undefined) { sets.push(`caption = $${idx++}`); params.push(caption); }
      if (type !== undefined) { sets.push(`type = $${idx++}`); params.push(type); }
      if (multiplier !== undefined) { sets.push(`multiplier = $${idx++}`); params.push(multiplier); }
      if (expires_at !== undefined) { sets.push(`expires_at = $${idx++}`); params.push(expires_at); }

      if (sets.length === 0) return { error: 'No fields to update' };

      params.push(postId);
      const result = await query(
        `UPDATE posts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params,
      );
      return result.rows[0];
    },
  });

  // DELETE /posts/:id — delete post (vendor)
  app.delete('/posts/:id', {
    preHandler: [requireRole('vendor')],
    handler: async (req) => {
      const userId = req.userId ?? (req as any).userId ?? 'dev-vendor-1';
      const postId = (req.params as any).id;

      // Verify ownership
      const vendorResult = await query('SELECT id FROM vendors WHERE owner_id = $1', [userId]);
      const vendorId = vendorResult.rows[0]?.id;
      if (!vendorId) return { error: 'Vendor not found' };

      const postResult = await query('SELECT * FROM posts WHERE id = $1 AND vendor_id = $2', [postId, vendorId]);
      if (postResult.rows.length === 0) return { error: 'Post not found' };

      await query('DELETE FROM posts WHERE id = $1', [postId]);
      return { deleted: true, id: postId };
    },
  });

  // POST /posts/:id/like — toggle like
  app.post('/posts/:id/like', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const postId = (req.params as any).id;
    // Check if already liked
    const existing = await query(
      'SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      const result = await query(
        'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId],
      );
      return result.rows[0] ?? { liked: false, like_count: 0 };
    }
    const result = await query(
      'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)',
      [userId, postId],
    );
    return result.rows[0] ?? { liked: true, like_count: 0 };
  });

  // GET /posts/:id/comments — get comments
  app.get('/posts/:id/comments', { preHandler: [requireAuth] }, async (req) => {
    const postId = (req.params as any).id;
    const result = await query(
      'SELECT * FROM post_comments WHERE post_id = $1 ORDER BY created_at ASC',
      [postId],
    );
    return { comments: result.rows, total: result.rowCount };
  });

  // POST /posts/:id/comments — add comment
  app.post('/posts/:id/comments', {
    schema: {
      body: Type.Object({
        body: Type.String({ minLength: 1, maxLength: 1000 }),
      }),
    },
    preHandler: [requireAuth],
    handler: async (req) => {
      const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
      const postId = (req.params as any).id;
      const { body } = req.body as any;
      const result = await query(
        'INSERT INTO post_comments (post_id, user_id, display_name, body) VALUES ($1, $2, $3, $4) RETURNING *',
        [postId, userId, 'Zach S.', body],
      );
      return result.rows[0];
    },
  });

  // POST /posts/:id/bookmark — toggle bookmark
  app.post('/posts/:id/bookmark', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const postId = (req.params as any).id;
    // Check if already bookmarked
    const existing = await query('SELECT * FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    if (existing.rowCount && existing.rowCount > 0) {
      await query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      return { bookmarked: false };
    }
    await query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
    return { bookmarked: true };
  });

  // GET /posts/bookmarks — get bookmarked posts
  app.get('/posts/bookmarks', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const result = await query(
      'SELECT p.*, v.name as vendor_name FROM bookmarks b JOIN posts p ON b.post_id = p.id JOIN vendors v ON p.vendor_id = v.id WHERE b.user_id = $1 ORDER BY b.created_at DESC',
      [userId],
    );
    return { posts: result.rows, total: result.rowCount };
  });

  // GET /vendors/search — search vendors by name
  app.get('/vendors/search', {
    schema: {
      querystring: Type.Object({
        q: Type.String({ minLength: 1, maxLength: 100 }),
      }),
    },
    preHandler: [requireAuth],
    handler: async (req) => {
      const { q } = req.query as any;
      const result = await query(
        'SELECT * FROM vendors WHERE lower(name) LIKE $1 OR lower(neighborhood) LIKE $1 ORDER BY name',
        [`%${q.toLowerCase()}%`],
      );
      return { vendors: result.rows, total: result.rowCount };
    },
  });

  // POST /vendors/:id/follow — toggle follow
  app.post('/vendors/:id/follow', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.userId ?? (req as any).userId ?? 'dev-customer-1';
    const vendorId = (req.params as any).id;
    const existing = await query(
      'SELECT * FROM follows WHERE user_id = $1 AND vendor_id = $2',
      [userId, vendorId],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      const result = await query(
        'DELETE FROM follows WHERE user_id = $1 AND vendor_id = $2',
        [userId, vendorId],
      );
      return { following: false, vendor_id: vendorId };
    }
    await query(
      'INSERT INTO follows (user_id, vendor_id) VALUES ($1, $2)',
      [userId, vendorId],
    );
    return { following: true, vendor_id: vendorId };
  });
}
