import Stripe from 'stripe';
import { stripe } from '../lib/stripe.js';
import { query } from '../db/client.js';

// TODO: Replace with real Stripe Price IDs from your Stripe dashboard
const priceMap: Record<string, { amount: number; priceId: string }> = {
  basic: { amount: 4900, priceId: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder' },
  pro: { amount: 9900, priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder' },
  premium: { amount: 14900, priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_placeholder' },
};

/**
 * Create a Stripe Connect Express account and a Stripe customer for a vendor.
 * Updates the vendor row with stripe_account_id and stripe_customer_id.
 * Returns an Account Link URL for Stripe onboarding.
 */
export async function createConnectAccount(
  vendorId: string,
  vendorName: string,
  email: string,
): Promise<string> {
  // Create Connect Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    business_type: 'company',
    company: { name: vendorName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Create a Stripe customer for subscription billing
  const customer = await stripe.customers.create({
    email,
    name: vendorName,
    metadata: { vendor_id: vendorId },
  });

  // Update vendor with Stripe IDs
  await query(
    `UPDATE vendors
     SET stripe_account_id = $1, stripe_customer_id = $2
     WHERE id = $3`,
    [account.id, customer.id, vendorId],
  );

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL || 'http://localhost:3000'}/vendor/stripe/refresh`,
    return_url: `${process.env.APP_URL || 'http://localhost:3000'}/vendor/stripe/complete`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Create a Stripe subscription for a vendor.
 * Returns the subscription ID.
 */
export async function createSubscription(
  vendorId: string,
  plan: 'basic' | 'pro' | 'premium',
): Promise<string> {
  const priceInfo = priceMap[plan];
  if (!priceInfo) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  // Look up the vendor's stripe_customer_id
  const { rows } = await query(
    'SELECT stripe_customer_id FROM vendors WHERE id = $1',
    [vendorId],
  );

  if (!rows[0]?.stripe_customer_id) {
    throw new Error('Vendor does not have a Stripe customer ID. Complete Stripe onboarding first.');
  }

  const customerId = rows[0].stripe_customer_id;

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceInfo.priceId }],
    metadata: { vendor_id: vendorId, plan },
  });

  // Update vendor subscription info
  await query(
    `UPDATE vendors
     SET subscription_plan = $1, subscription_status = $2
     WHERE id = $3`,
    [plan, 'active', vendorId],
  );

  return subscription.id;
}

/**
 * Handle incoming Stripe webhook events.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

      // Get the plan from subscription metadata
      let plan: string | undefined;
      if (invoice.subscription) {
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        plan = sub.metadata?.plan;
      }

      const updateQuery = plan
        ? `UPDATE vendors SET subscription_status = 'active', subscription_plan = $1 WHERE stripe_customer_id = $2`
        : `UPDATE vendors SET subscription_status = 'active' WHERE stripe_customer_id = $1`;

      const params = plan ? [plan, customerId] : [customerId];
      await query(updateQuery, params);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

      await query(
        `UPDATE vendors SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
        [customerId],
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      await query(
        `UPDATE vendors SET status = 'suspended', subscription_status = 'canceled' WHERE stripe_customer_id = $1`,
        [customerId],
      );
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const chargesEnabled = account.charges_enabled;

      if (chargesEnabled) {
        await query(
          `UPDATE vendors SET stripe_onboarding_complete = TRUE WHERE stripe_account_id = $1`,
          [account.id],
        );
      }
      break;
    }

    default:
      // Unhandled event type — no action needed
      break;
  }
}
