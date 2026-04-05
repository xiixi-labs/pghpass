// Seed script — populates dev database with test data
// Run via: tsx server/src/scripts/seed.ts
// Requires DATABASE_URL and REDIS_URL in .env

import 'dotenv/config';
import { query, transaction } from '../db/client.js';
import { v4 as uuid } from 'uuid';

async function seed() {
  console.log('[seed] Seeding development database...');

  await transaction(async (client) => {
    // ── Users ──
    const customerIds = [uuid(), uuid(), uuid(), uuid(), uuid()];
    const vendorOwnerIds = [uuid(), uuid(), uuid()];

    const customers = [
      { id: customerIds[0], clerk_id: 'user_seed_cust1', phone: '+14125550101', first: 'Mike', last: 'Rivera' },
      { id: customerIds[1], clerk_id: 'user_seed_cust2', phone: '+14125550102', first: 'Sarah', last: 'Chen' },
      { id: customerIds[2], clerk_id: 'user_seed_cust3', phone: '+14125550103', first: 'Jamal', last: 'Williams' },
      { id: customerIds[3], clerk_id: 'user_seed_cust4', phone: '+14125550104', first: 'Emily', last: 'Johnson' },
      { id: customerIds[4], clerk_id: 'user_seed_cust5', phone: '+14125550105', first: 'David', last: 'Park' },
    ];

    const vendorOwners = [
      { id: vendorOwnerIds[0], clerk_id: 'user_seed_vend1', phone: '+14125550201', first: 'Tony', last: 'Moretti' },
      { id: vendorOwnerIds[1], clerk_id: 'user_seed_vend2', phone: '+14125550202', first: 'Lisa', last: 'Nguyen' },
      { id: vendorOwnerIds[2], clerk_id: 'user_seed_vend3', phone: '+14125550203', first: 'Marcus', last: 'Brown' },
    ];

    for (const c of customers) {
      await client.query(
        `INSERT INTO users (id, clerk_id, phone, role, first_name, last_name)
         VALUES ($1, $2, $3, 'customer', $4, $5)
         ON CONFLICT (clerk_id) DO NOTHING`,
        [c.id, c.clerk_id, c.phone, c.first, c.last],
      );
    }

    for (const v of vendorOwners) {
      await client.query(
        `INSERT INTO users (id, clerk_id, phone, role, first_name, last_name)
         VALUES ($1, $2, $3, 'vendor', $4, $5)
         ON CONFLICT (clerk_id) DO NOTHING`,
        [v.id, v.clerk_id, v.phone, v.first, v.last],
      );
    }

    console.log('[seed] Created 5 customers + 3 vendor owners');

    // ── Vendors ──
    const vendorIds = [uuid(), uuid(), uuid()];
    const vendors = [
      {
        id: vendorIds[0], owner: vendorOwnerIds[0],
        name: "Moretti's Coffee", slug: 'morettis-coffee',
        category: 'Coffee & Tea', neighborhood: 'Lawrenceville',
        address: '4023 Butler St, Pittsburgh, PA 15201',
        lat: 40.4680, lng: -79.9571, plan: 'pro',
      },
      {
        id: vendorIds[1], owner: vendorOwnerIds[1],
        name: 'Pho Saigon', slug: 'pho-saigon',
        category: 'Restaurant', neighborhood: 'Squirrel Hill',
        address: '5903 Forbes Ave, Pittsburgh, PA 15217',
        lat: 40.4312, lng: -79.9227, plan: 'basic',
      },
      {
        id: vendorIds[2], owner: vendorOwnerIds[2],
        name: 'Steel City Books', slug: 'steel-city-books',
        category: 'Retail', neighborhood: 'Strip District',
        address: '2101 Penn Ave, Pittsburgh, PA 15222',
        lat: 40.4518, lng: -79.9844, plan: 'premium',
      },
    ];

    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendors (id, owner_id, name, slug, category, neighborhood, address, lat, lng, status, subscription_plan, contribution_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, 0.02)
         ON CONFLICT (slug) DO NOTHING`,
        [v.id, v.owner, v.name, v.slug, v.category, v.neighborhood, v.address, v.lat, v.lng, v.plan],
      );
    }

    console.log('[seed] Created 3 vendors');

    // ── Registers ──
    const registerIds = [uuid(), uuid(), uuid(), uuid()];
    const registers = [
      { id: registerIds[0], vendor: vendorIds[0], label: 'Counter', nfc: 'NFC-MORETTI-001' },
      { id: registerIds[1], vendor: vendorIds[0], label: 'Drive-thru', nfc: 'NFC-MORETTI-002' },
      { id: registerIds[2], vendor: vendorIds[1], label: 'Main Register', nfc: 'NFC-PHO-001' },
      { id: registerIds[3], vendor: vendorIds[2], label: 'Front Desk', nfc: 'NFC-BOOKS-001' },
    ];

    for (const r of registers) {
      await client.query(
        `INSERT INTO registers (id, vendor_id, label, nfc_uid)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [r.id, r.vendor, r.label, r.nfc],
      );
    }

    console.log('[seed] Created 4 registers');

    // ── Transactions (20 claimed) ──
    const txnAmounts = [4.50, 12.99, 8.75, 3.25, 22.00, 6.50, 15.00, 9.99, 5.50, 7.25,
      11.00, 4.75, 18.50, 6.00, 3.50, 14.25, 8.00, 21.50, 5.75, 10.00];

    for (let i = 0; i < 20; i++) {
      const customerId = customerIds[i % 5];
      const vendorId = vendorIds[i % 3];
      const registerId = i % 3 === 0 ? registerIds[0] : i % 3 === 1 ? registerIds[2] : registerIds[3];
      const amount = txnAmounts[i];
      const points = Math.floor(amount * 10);
      const txnId = uuid();
      const daysAgo = 20 - i;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      await client.query(
        `INSERT INTO transactions (id, customer_id, vendor_id, register_id, source, status, amount_cents, points_awarded, token, claimed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 'claimed', $6, $7, $8, $9, $9)
         ON CONFLICT DO NOTHING`,
        [txnId, customerId, vendorId, registerId, i % 4 === 0 ? 'nfc' : 'qr', Math.round(amount * 100), points, uuid(), createdAt],
      );

      // Point ledger entry
      await client.query(
        `INSERT INTO point_ledger (id, user_id, transaction_id, delta, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [uuid(), customerId, txnId, points, 'earn', createdAt],
      );

      // Pool contribution (2%)
      await client.query(
        `INSERT INTO pool_ledger (id, vendor_id, transaction_id, entry_type, amount_cents, created_at)
         VALUES ($1, $2, $3, 'contribution', $4, $5)
         ON CONFLICT DO NOTHING`,
        [uuid(), vendorId, txnId, Math.round(amount * 2), createdAt],
      );
    }

    console.log('[seed] Created 20 transactions with ledger entries');

    // ── Point balances ──
    for (const custId of customerIds) {
      const totalPts = await client.query(
        `SELECT COALESCE(SUM(delta), 0) as total FROM point_ledger WHERE user_id = $1`,
        [custId],
      );
      const balance = parseInt(totalPts.rows[0].total, 10);

      await client.query(
        `INSERT INTO point_balances (user_id, balance, lifetime_earned, updated_at)
         VALUES ($1, $2, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET balance = $2, lifetime_earned = $2, updated_at = NOW()`,
        [custId, balance],
      );
    }

    console.log('[seed] Synced point balances');

    // ── Pool balance ──
    const poolTotal = await client.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM pool_ledger WHERE entry_type = 'contribution'`,
    );
    await client.query(
      `INSERT INTO pool_balance (id, balance_cents, updated_at)
       VALUES ('singleton', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET balance_cents = $1, updated_at = NOW()`,
      [parseInt(poolTotal.rows[0].total, 10)],
    );

    console.log('[seed] Synced pool balance');
  });

  console.log('[seed] Done!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
