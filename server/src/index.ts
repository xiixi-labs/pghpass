import 'dotenv/config';
import Fastify from 'fastify';
import { authPlugin } from './plugins/auth.js';
import { corsPlugin } from './plugins/cors.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { errorHandler } from './lib/error-handler.js';
import { redis } from './redis/client.js';
import { authRoutes } from './routes/auth.js';
import { vendorRoutes } from './routes/vendors.js';
import { transactionRoutes } from './routes/transactions.js';
import { pointRoutes } from './routes/points.js';
import { redemptionRoutes } from './routes/redemptions.js';
import { feedRoutes } from './routes/feed.js';
import { notificationRoutes } from './routes/notifications.js';
import { referralRoutes } from './routes/referrals.js';
import { challengeRoutes } from './routes/challenges.js';
import { profileRoutes } from './routes/profile.js';
import { feedbackRoutes } from './routes/feedback.js';
import { waitlistRoutes } from './routes/waitlist.js';
import { startExpiryCleanup } from './services/expiry.service.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

const app = Fastify({ logger: true });

// Error handler
app.setErrorHandler(errorHandler);

// Plugins
await app.register(corsPlugin);
await app.register(rateLimitPlugin);
await app.register(authPlugin);

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString(), dev_mode: DEV_MODE }));

// API routes — all prefixed with /v1
await app.register(
  async (v1) => {
    await v1.register(authRoutes);
    await v1.register(vendorRoutes);
    await v1.register(transactionRoutes);
    await v1.register(pointRoutes);
    await v1.register(redemptionRoutes);
    await v1.register(feedRoutes);
    await v1.register(notificationRoutes);
    await v1.register(referralRoutes);
    await v1.register(challengeRoutes);
    await v1.register(profileRoutes);
    await v1.register(feedbackRoutes);
    await v1.register(waitlistRoutes);

    // Only register Stripe webhook routes when Stripe is configured
    if (process.env.STRIPE_SECRET_KEY) {
      const { webhookRoutes } = await import('./routes/webhooks.js');
      await v1.register(webhookRoutes);
    }
  },
  { prefix: '/v1' },
);

// Start
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

try {
  await redis.connect();
  await app.listen({ port, host });
  console.log(`Server running on http://${host}:${port}`);

  // Start periodic cleanup for expired flash deals
  const stopExpiry = startExpiryCleanup();
  process.on('SIGTERM', () => stopExpiry());

  if (DEV_MODE) {
    console.log('🟢 DEV_MODE: No Postgres, Redis, Clerk, or Stripe needed');
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
