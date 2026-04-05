import type { FastifyInstance } from 'fastify';
import { stripe } from '../lib/stripe.js';
import { handleWebhookEvent } from '../services/stripe.service.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Register as a sub-plugin so the raw body parser is scoped only to this route
  app.register(async (webhookApp) => {
    // Override the JSON content type parser to preserve the raw buffer
    // This is required for Stripe signature verification
    webhookApp.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => {
        done(null, body);
      },
    );

    webhookApp.post('/webhooks/stripe', async (request, reply) => {
      const sig = request.headers['stripe-signature'];
      if (!sig) {
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        request.log.error('STRIPE_WEBHOOK_SECRET is not configured');
        return reply.status(500).send({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          sig,
          webhookSecret,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        request.log.warn(`Webhook signature verification failed: ${message}`);
        return reply.status(400).send({ error: `Webhook Error: ${message}` });
      }

      try {
        await handleWebhookEvent(event);
      } catch (err) {
        request.log.error(err, 'Error processing webhook event');
        return reply.status(500).send({ error: 'Webhook handler failed' });
      }

      return reply.status(200).send({ received: true });
    });
  });
}
