import pg from 'pg';

const DEV_MODE = process.env.DEV_MODE === 'true';

// ── In-memory store for DEV_MODE ──────────────────────────────────────
const memStore: Record<string, any[]> = {
  users: [
    {
      id: 'dev-customer-1',
      clerk_id: 'dev_user_customer',
      phone: '+14125550001',
      role: 'customer',
      first_name: 'Dev',
      last_name: 'Customer',
      display_name: 'Dev Customer',
      avatar_url: null,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-1',
      clerk_id: 'dev_user_vendor',
      phone: '+14125550002',
      role: 'vendor',
      first_name: 'Dev',
      last_name: 'Vendor',
      display_name: 'Dev Vendor',
      avatar_url: null,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  vendors: [
    {
      id: 'dev-vendor-biz-1',
      owner_id: 'dev-vendor-1',
      name: 'Steel City Coffee',
      slug: 'steel-city-coffee',
      description: 'Best coffee in Pittsburgh',
      category: 'Coffee',
      neighborhood: 'Lawrenceville',
      address: '100 Butler St, Pittsburgh, PA 15201',
      lat: 40.4657,
      lng: -79.9606,
      phone: '+14125550010',
      website: 'https://steelcitycoffee.com',
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 142,
      total_pts_issued: 28500,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-2',
      owner_id: 'dev-vendor-2',
      name: 'Commonplace Coffee',
      slug: 'commonplace-coffee',
      description: 'Specialty coffee in Lawrenceville',
      category: 'Coffee',
      neighborhood: 'Lawrenceville',
      address: '4500 Butler St, Pittsburgh, PA 15201',
      lat: 40.4680,
      lng: -79.9540,
      phone: '+14125550011',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 89,
      total_pts_issued: 15200,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-3',
      owner_id: 'dev-vendor-3',
      name: 'Iron Born Pizza',
      slug: 'iron-born-pizza',
      description: 'Detroit-style pizza in the Strip',
      category: 'Restaurant',
      neighborhood: 'Strip District',
      address: '2121 Penn Ave, Pittsburgh, PA 15222',
      lat: 40.4510,
      lng: -79.9800,
      phone: '+14125550012',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
      status: 'active',
      subscription_plan: 'basic',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 215,
      total_pts_issued: 32100,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-4',
      owner_id: 'dev-vendor-4',
      name: 'Apteka',
      slug: 'apteka',
      description: 'Vegan Eastern European food & natural wine bar',
      category: 'Restaurant',
      neighborhood: 'Bloomfield',
      address: '4606 Penn Ave, Pittsburgh, PA 15224',
      lat: 40.4620,
      lng: -79.9480,
      phone: '+14125550013',
      website: 'https://aptekapgh.com',
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 178,
      total_pts_issued: 22400,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-5',
      owner_id: 'dev-vendor-5',
      name: 'Hidden Harbor',
      slug: 'hidden-harbor',
      description: 'Tropical tiki cocktails in Squirrel Hill',
      category: 'Bar',
      neighborhood: 'Squirrel Hill',
      address: '1708 Shady Ave, Pittsburgh, PA 15217',
      lat: 40.4370,
      lng: -79.9230,
      phone: '+14125550014',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 134,
      total_pts_issued: 18900,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-6',
      owner_id: 'dev-vendor-6',
      name: 'Bicycle Heaven',
      slug: 'bicycle-heaven',
      description: 'World\'s largest bicycle museum & shop',
      category: 'Shop',
      neighborhood: 'North Side',
      address: '1800 Preble Ave, Pittsburgh, PA 15233',
      lat: 40.4570,
      lng: -80.0120,
      phone: '+14125550015',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
      status: 'active',
      subscription_plan: 'basic',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 67,
      total_pts_issued: 8400,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-7',
      owner_id: 'dev-vendor-7',
      name: 'Grist House Craft Brewery',
      slug: 'grist-house',
      description: 'Craft beer in Millvale with food trucks',
      category: 'Bar',
      neighborhood: 'Millvale',
      address: '10 Sherman St, Millvale, PA 15209',
      lat: 40.4800,
      lng: -79.9780,
      phone: '+14125550016',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 245,
      total_pts_issued: 41200,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-8',
      owner_id: 'dev-vendor-8',
      name: 'Dozen Bake Shop',
      slug: 'dozen-bake-shop',
      description: 'Cupcakes and baked goods in Lawrenceville',
      category: 'Coffee',
      neighborhood: 'Lawrenceville',
      address: '3511 Butler St, Pittsburgh, PA 15201',
      lat: 40.4650,
      lng: -79.9590,
      phone: '+14125550017',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1486427944544-d2c246c4df4a?w=800&q=80',
      status: 'active',
      subscription_plan: 'basic',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 156,
      total_pts_issued: 19800,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-9',
      owner_id: 'dev-vendor-9',
      name: 'Smallman Galley',
      slug: 'smallman-galley',
      description: 'Restaurant incubator in the Strip District',
      category: 'Restaurant',
      neighborhood: 'Strip District',
      address: '54 21st St, Pittsburgh, PA 15222',
      lat: 40.4525,
      lng: -79.9770,
      phone: '+14125550018',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
      status: 'active',
      subscription_plan: 'premium',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 312,
      total_pts_issued: 52300,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-vendor-biz-10',
      owner_id: 'dev-vendor-10',
      name: 'Trace Brewing',
      slug: 'trace-brewing',
      description: 'Modern brewery & restaurant in Bloomfield',
      category: 'Bar',
      neighborhood: 'Bloomfield',
      address: '4312 Main St, Pittsburgh, PA 15224',
      lat: 40.4610,
      lng: -79.9500,
      phone: '+14125550019',
      website: null,
      logo_url: null,
      cover_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80',
      status: 'active',
      subscription_plan: 'pro',
      subscription_status: 'active',
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 198,
      total_pts_issued: 28700,
      created_at: new Date().toISOString(),
    },
  ],
  registers: [
    {
      id: 'dev-register-1',
      vendor_id: 'dev-vendor-biz-1',
      label: 'Register 1',
      nfc_uid: null,
      active: true,
      created_at: new Date().toISOString(),
    },
  ],
  transactions: (() => {
    // Seed realistic transaction data for analytics
    const txns: any[] = [];
    const customers = ['dev-customer-1', 'dev-customer-2', 'dev-customer-3', 'dev-customer-4', 'dev-customer-5'];
    const vendorId = 'dev-vendor-biz-1';
    const registerId = 'dev-register-1';
    const now = Date.now();
    const DAY = 86400000;
    let txnId = 100;

    for (let d = 0; d < 60; d++) {
      const dayCheckins = Math.floor(Math.random() * 8) + 2; // 2-9 per day
      for (let c = 0; c < dayCheckins; c++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const amount = Math.round((Math.random() * 20 + 5) * 100) / 100; // $5-$25
        const pointsValue = Math.round(amount * 10);
        txns.push({
          id: `dev-txn-${txnId++}`,
          vendor_id: vendorId,
          register_id: registerId,
          amount,
          points_value: pointsValue,
          source: 'qr',
          qr_token: null,
          qr_expires_at: null,
          status: 'claimed',
          claimed_by: customer,
          claimed_at: new Date(now - d * DAY - Math.random() * DAY).toISOString(),
          customer_entered_amount: amount,
          contribution_collected: true,
          created_at: new Date(now - d * DAY - Math.random() * DAY).toISOString(),
        });
      }
    }
    return txns;
  })(),
  point_balances: [
    {
      user_id: 'dev-customer-1',
      balance: 1250,
      lifetime_pts: 3400,
      updated_at: new Date().toISOString(),
    },
  ],
  point_ledger: [
    {
      id: 'pl-1',
      user_id: 'dev-customer-1',
      vendor_id: 'dev-vendor-biz-1',
      transaction_id: null,
      redemption_id: null,
      delta: 150,
      balance_after: 1250,
      note: 'Earned at vendor',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'pl-2',
      user_id: 'dev-customer-1',
      vendor_id: 'dev-vendor-biz-1',
      transaction_id: null,
      redemption_id: null,
      delta: 100,
      balance_after: 1100,
      note: 'Earned at vendor',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  redemptions: [] as any[],
  pool_balance: [{ id: 1, balance: 245.5, updated_at: new Date().toISOString() }],
  pool_ledger: [] as any[],
  posts: [
    {
      id: 'post-1',
      vendor_id: 'dev-vendor-biz-1',
      type: 'update',
      caption: 'New single-origin Ethiopian just landed. Light roast, fruity notes, perfect for pour-over. Come try it today!',
      photo_url: null,
      multiplier: null,
      expires_at: null,
      like_count: 23,
      comment_count: 4,
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'post-2',
      vendor_id: 'dev-vendor-biz-1',
      type: 'flash',
      caption: '2x points on all cold brew today only! Beat the heat and earn double.',
      photo_url: null,
      multiplier: 2,
      expires_at: new Date(Date.now() + 7200000).toISOString(),
      like_count: 47,
      comment_count: 8,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'post-3',
      vendor_id: 'dev-vendor-biz-2',
      type: 'update',
      caption: 'Happy hour starts at 4pm. $2 off all draft beers for PGH Pass members.',
      photo_url: null,
      multiplier: null,
      expires_at: null,
      like_count: 12,
      comment_count: 2,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'post-4',
      vendor_id: 'dev-vendor-biz-3',
      type: 'deal',
      caption: 'Show your PGH Pass for 15% off any large pizza this week. Stack with your points!',
      photo_url: null,
      multiplier: 1,
      expires_at: new Date(Date.now() + 432000000).toISOString(),
      like_count: 34,
      comment_count: 6,
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: 'post-5',
      vendor_id: 'dev-vendor-biz-2',
      type: 'flash',
      caption: '3x points for the next 3 hours! First 50 customers only.',
      photo_url: null,
      multiplier: 3,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      like_count: 58,
      comment_count: 11,
      created_at: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      id: 'post-6',
      vendor_id: 'dev-vendor-biz-3',
      type: 'update',
      caption: 'We just renovated the back patio. New string lights, more seating, same great food. Come check it out this weekend!',
      photo_url: null,
      multiplier: null,
      expires_at: null,
      like_count: 19,
      comment_count: 3,
      created_at: new Date(Date.now() - 28800000).toISOString(),
    },
  ],
  post_likes: [
    { user_id: 'dev-customer-1', post_id: 'post-1' },
    { user_id: 'dev-customer-1', post_id: 'post-2' },
    { user_id: 'dev-customer-1', post_id: 'post-5' },
  ] as any[],
  post_comments: [
    { id: 'comment-1', post_id: 'post-2', user_id: 'dev-customer-1', display_name: 'Zach S.', body: 'Love the cold brew here!', created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 'comment-2', post_id: 'post-2', user_id: 'dev-customer-2', display_name: 'Sarah M.', body: 'On my way!', created_at: new Date(Date.now() - 900000).toISOString() },
  ] as any[],
  follows: [
    { user_id: 'dev-customer-1', vendor_id: 'dev-vendor-biz-1' },
    { user_id: 'dev-customer-1', vendor_id: 'dev-vendor-biz-2' },
  ] as any[],
  bookmarks: [] as any[],
  push_tokens: [] as any[],
  notification_preferences: [] as any[],
  notifications: [
    {
      id: 'notif-1',
      user_id: 'dev-customer-1',
      title: 'Steel City Coffee — Flash Deal!',
      body: '2x points on all cold brew today only!',
      type: 'flash_deal',
      data: { vendor_id: 'dev-vendor-biz-1', post_id: 'post-2', type: 'flash_deal' },
      read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-2',
      user_id: 'dev-customer-1',
      title: 'You hit 1,000 lifetime points!',
      body: 'Your current balance is 1,250 pts. Keep earning at your favorite Pittsburgh spots!',
      type: 'milestone',
      data: { type: 'milestone', milestone: 1000, balance: 1250 },
      read: true,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'notif-3',
      user_id: 'dev-customer-1',
      title: 'Commonplace Coffee posted',
      body: 'Happy hour starts at 4pm. $2 off all draft beers for PGH Pass members.',
      type: 'new_post',
      data: { vendor_id: 'dev-vendor-biz-2', post_id: 'post-3', type: 'new_post' },
      read: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ] as any[],
  waitlist: [] as any[],
};

let idCounter = 1000;
function nextId() {
  return `dev-${++idCounter}`;
}

/**
 * Minimalist SQL pattern matcher for DEV_MODE.
 * Handles the specific queries used by the app routes/services.
 */
function memQuery<T>(text: string, params?: unknown[]): pg.QueryResult<T> {
  const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();
  const p = params ?? [];

  const makeResult = (rows: any[]): pg.QueryResult<T> =>
    ({
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }) as any;

  // ── USERS ──
  if (sql.includes('from users') && sql.includes('role = $1') && sql.includes('order by')) {
    const row = memStore.users.find((u) => u.role === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from users') && sql.includes('order by created_at limit 1')) {
    return makeResult(memStore.users.length > 0 ? [memStore.users[0]] : []);
  }
  if (sql.includes('from users') && sql.includes('clerk_id = $1')) {
    const row = memStore.users.find((u) => u.clerk_id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from users where id = $1')) {
    const row = memStore.users.find((u) => u.id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('select phone from users')) {
    const row = memStore.users.find((u) => u.id === p[0]);
    return makeResult(row ? [{ phone: row.phone }] : []);
  }
  if (sql.startsWith('insert into users')) {
    const existing = memStore.users.find((u) => u.clerk_id === p[0]);
    if (existing) {
      existing.last_active_at = new Date().toISOString();
      return makeResult([existing]);
    }
    const newUser = {
      id: nextId(),
      clerk_id: p[0],
      phone: p[1],
      role: p[2],
      first_name: p[3],
      last_name: p[4],
      display_name: `${p[3] || ''} ${p[4] || ''}`.trim(),
      avatar_url: null,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    memStore.users.push(newUser);
    return makeResult([newUser]);
  }
  if (sql.startsWith('update users set role')) {
    const user = memStore.users.find((u) => u.id === p[1]);
    if (user) user.role = p[0];
    return makeResult([]);
  }

  // ── VENDORS ──
  if (sql.includes('select name from vendors')) {
    const row = memStore.vendors.find((v) => v.id === p[0]);
    return makeResult(row ? [{ name: row.name }] : []);
  }
  if (sql.includes('from vendors') && sql.includes('slug = $1')) {
    const row = memStore.vendors.find((v) => v.slug === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from vendors') && sql.includes('owner_id = $1')) {
    const row = memStore.vendors.find((v) => v.owner_id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from vendors') && sql.includes('where id = $1')) {
    const row = memStore.vendors.find((v) => v.id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('stripe_customer_id from vendors')) {
    const row = memStore.vendors.find((v) => v.id === p[0]);
    return makeResult(row ? [{ stripe_customer_id: row.stripe_customer_id }] : []);
  }
  if (sql.includes('from vendors') && sql.includes('earth_distance') && sql.includes('count')) {
    return makeResult([{ total: memStore.vendors.length }]);
  }
  if (sql.includes('from vendors') && sql.includes('earth_distance') && sql.includes('order by')) {
    const rows = memStore.vendors.map((v) => ({ ...v, distance_km: 0.5 }));
    return makeResult(rows);
  }
  if (sql.startsWith('insert into vendors')) {
    const newVendor = {
      id: nextId(),
      owner_id: p[0],
      name: p[1],
      slug: p[2],
      description: p[3],
      category: p[4],
      neighborhood: p[5],
      address: p[6],
      lat: p[7],
      lng: p[8],
      phone: p[9],
      website: p[10],
      logo_url: null,
      status: 'active',
      subscription_plan: 'free',
      subscription_status: null,
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      contribution_rate: 0.02,
      follower_count: 0,
      total_pts_issued: 0,
      created_at: new Date().toISOString(),
    };
    memStore.vendors.push(newVendor);
    return makeResult([newVendor]);
  }
  if (sql.startsWith('update vendors set subscription_plan')) {
    const vendor = memStore.vendors.find((v) => v.id === p[1]);
    if (vendor) {
      vendor.subscription_plan = p[0];
      vendor.subscription_status = 'active';
    }
    return makeResult([]);
  }
  if (sql.startsWith('update vendors set total_pts_issued')) {
    const vendor = memStore.vendors.find((v) => v.id === p[1]);
    if (vendor) vendor.total_pts_issued += Number(p[0]);
    return makeResult([]);
  }

  // ── REGISTERS ──
  if (sql.includes('from registers') && sql.includes('vendor_id')) {
    const rows = memStore.registers.filter(
      (r) => r.vendor_id === p[0] && r.active,
    );
    return makeResult(rows);
  }
  if (sql.startsWith('insert into registers')) {
    const reg = {
      id: nextId(),
      vendor_id: p[0],
      label: p[1],
      nfc_uid: null,
      active: true,
      created_at: new Date().toISOString(),
    };
    memStore.registers.push(reg);
    return makeResult([reg]);
  }

  // ── TRANSACTIONS ──
  if (sql.includes('from transactions where id')) {
    const row = memStore.transactions.find((t) => t.id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from transactions where qr_token')) {
    const row = memStore.transactions.find((t) => t.qr_token === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('insert into transactions')) {
    const txn = {
      id: nextId(),
      vendor_id: p[0],
      register_id: p[1],
      amount: p[2],
      points_value: p[3],
      source: p[4],
      qr_token: p[5],
      qr_expires_at: p[6],
      status: 'pending',
      claimed_by: null,
      claimed_at: null,
      customer_entered_amount: null,
      contribution_collected: false,
      created_at: new Date().toISOString(),
    };
    memStore.transactions.push(txn);
    return makeResult([txn]);
  }
  if (sql.startsWith('update transactions') && sql.includes("status = 'claimed'")) {
    const txn = memStore.transactions.find((t) => t.id === p[2]);
    if (txn) {
      txn.status = 'claimed';
      txn.claimed_by = p[0];
      txn.claimed_at = new Date().toISOString();
      txn.customer_entered_amount = p[1];
    }
    return makeResult([]);
  }
  if (sql.startsWith('update transactions') && sql.includes('contribution_collected')) {
    const txn = memStore.transactions.find((t) => t.id === p[0]);
    if (txn) txn.contribution_collected = true;
    return makeResult([]);
  }
  // Vendor stats — visits today
  if (sql.includes('from transactions') && sql.includes('count') && sql.includes('current_date') && !sql.includes('interval') && !sql.includes('date_trunc')) {
    const count = memStore.transactions.filter(
      (t) => t.vendor_id === p[0] && t.status === 'claimed',
    ).length;
    return makeResult([{ count }]);
  }
  // Vendor stats — visits yesterday
  if (sql.includes('from transactions') && sql.includes("interval '1 day'")) {
    return makeResult([{ count: 3 }]);
  }
  // Vendor stats — pts month
  if (sql.includes('sum(points_value)')) {
    return makeResult([{ total: 2850 }]);
  }
  // Vendor stats — sales month
  if (sql.includes('sum(amount)') && sql.includes('date_trunc')) {
    return makeResult([{ total: 28500 }]);
  }
  // Customer history — count
  if (sql.includes('count') && sql.includes('claimed_by')) {
    return makeResult([{ total: memStore.transactions.filter((t) => t.claimed_by === p[0]).length }]);
  }
  // Customer history — join
  if (sql.includes('from transactions t') && sql.includes('join vendors v') && sql.includes('claimed_by')) {
    const rows = memStore.transactions
      .filter((t) => t.claimed_by === p[0] && t.status === 'claimed')
      .map((t) => {
        const v = memStore.vendors.find((v) => v.id === t.vendor_id);
        return {
          id: t.id,
          vendor_name: v?.name ?? '',
          vendor_logo: v?.logo_url ?? null,
          amount: t.amount,
          points_earned: t.points_value,
          claimed_at: t.claimed_at,
        };
      });
    return makeResult(rows);
  }
  // Vendor recent check-ins
  if (sql.includes('from transactions t') && sql.includes('join users u') && sql.includes('vendor_id = $1')) {
    const rows = memStore.transactions
      .filter((t) => t.vendor_id === p[0] && t.status === 'claimed')
      .slice(0, Number(p[1]) || 10)
      .map((t) => {
        const u = memStore.users.find((u) => u.id === t.claimed_by);
        const r = memStore.registers.find((r) => r.id === t.register_id);
        return {
          id: t.id,
          display_name: u?.display_name ?? 'Customer',
          amount: t.amount,
          points_issued: t.points_value,
          register_label: r?.label ?? 'Register 1',
          claimed_at: t.claimed_at,
        };
      });
    return makeResult(rows);
  }

  // ── POINT BALANCES ──
  if (sql.includes('from point_balances') && sql.includes('user_id')) {
    const row = memStore.point_balances.find((pb) => pb.user_id === p[0]);
    return makeResult(row ? [row] : []);
  }

  // ── POINT LEDGER ──
  if (sql.includes('from point_ledger') && sql.includes('count')) {
    const count = memStore.point_ledger.filter((pl) => pl.user_id === p[0]).length;
    return makeResult([{ total: count }]);
  }
  if (sql.includes('from point_ledger pl')) {
    const rows = memStore.point_ledger
      .filter((pl) => pl.user_id === p[0])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(Number(p[2]) || 0, (Number(p[2]) || 0) + (Number(p[1]) || 20))
      .map((pl) => {
        const v = memStore.vendors.find((v) => v.id === pl.vendor_id);
        return { ...pl, vendor_name: v?.name ?? null };
      });
    return makeResult(rows);
  }
  if (sql.startsWith('insert into point_ledger')) {
    const entry = {
      id: nextId(),
      user_id: p[0],
      vendor_id: p[1] ?? null,
      transaction_id: p[2] ?? null,
      redemption_id: p[1] ?? null,
      delta: p[3] ?? p[2],
      balance_after: p[4] ?? p[3],
      note: p[5] ?? p[4],
      created_at: new Date().toISOString(),
    };
    memStore.point_ledger.push(entry);

    // Also update point_balances
    const pb = memStore.point_balances.find((pb) => pb.user_id === entry.user_id);
    if (pb) {
      pb.balance = Number(entry.balance_after);
      if (Number(entry.delta) > 0) pb.lifetime_pts += Number(entry.delta);
    } else {
      memStore.point_balances.push({
        user_id: entry.user_id,
        balance: Number(entry.balance_after),
        lifetime_pts: Math.max(0, Number(entry.delta)),
        updated_at: new Date().toISOString(),
      });
    }

    return makeResult([entry]);
  }

  // ── REDEMPTIONS ──
  if (sql.includes('from redemptions r') && sql.includes('join users u')) {
    const row = memStore.redemptions.find((r) => r.id === p[0]);
    if (row && row.status === 'issued') {
      const u = memStore.users.find((u) => u.id === row.user_id);
      return makeResult([{
        id: row.id,
        reward_label: row.reward_label,
        dollar_value: row.dollar_value,
        status: row.status,
        display_name: u?.display_name ?? 'Customer',
      }]);
    }
    return makeResult([]);
  }
  if (sql.includes('from redemptions where id') && sql.includes("status = $2")) {
    const row = memStore.redemptions.find((r) => r.id === p[0] && r.status === p[1]);
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('insert into redemptions')) {
    const redemption = {
      id: nextId(),
      user_id: p[0],
      vendor_id: p[1],
      points_cost: p[2],
      dollar_value: p[3],
      reward_label: p[4],
      redeem_token: p[5],
      token_expires_at: p[6],
      status: 'issued',
      claimed_at: null,
      claimed_at_vendor_id: null,
      payout_amount: null,
      created_at: new Date().toISOString(),
    };
    memStore.redemptions.push(redemption);
    return makeResult([redemption]);
  }
  if (sql.startsWith('update redemptions')) {
    const r = memStore.redemptions.find((r) => r.id === p[2]);
    if (r) {
      r.status = 'claimed';
      r.claimed_at = new Date().toISOString();
      r.claimed_at_vendor_id = p[0];
      r.payout_amount = p[1];
    }
    return makeResult([]);
  }

  // ── POOL ──
  if (sql.includes('from pool_balance')) {
    return makeResult(memStore.pool_balance);
  }
  if (sql.startsWith('insert into pool_ledger')) {
    const entry = {
      id: nextId(),
      entry_type: p[0],
      vendor_id: p[1],
      transaction_id: p[2] ?? null,
      redemption_id: p[2] ?? null,
      amount: p[3] ?? p[2],
      balance_after: p[4] ?? p[3],
      note: p[5] ?? p[4],
      created_at: new Date().toISOString(),
    };
    memStore.pool_ledger.push(entry);
    return makeResult([entry]);
  }
  if (sql.startsWith('update pool_balance')) {
    memStore.pool_balance[0].balance = Number(p[0]);
    memStore.pool_balance[0].updated_at = new Date().toISOString();
    return makeResult([]);
  }

  // ── POSTS ──
  if (sql.includes('from posts') && sql.includes('vendor_id = $1') && sql.includes('order by')) {
    const rows = memStore.posts
      .filter((post: any) => post.vendor_id === p[0])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return makeResult(rows);
  }
  if (sql.includes('from posts') && sql.includes('id = $1') && sql.includes('vendor_id = $2')) {
    const row = memStore.posts.find((post: any) => post.id === p[0] && post.vendor_id === p[1]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from posts') && sql.includes('where id = $1') && !sql.includes('vendor_id')) {
    const row = memStore.posts.find((post: any) => post.id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('update posts set')) {
    // Dynamic update — last param is the post id
    const postId = p[p.length - 1];
    const post = memStore.posts.find((post: any) => post.id === postId);
    if (post) {
      // Parse SET clauses from the SQL to determine field mapping
      const setMatch = sql.match(/set (.+) where/);
      if (setMatch) {
        const fields = setMatch[1].split(',').map((f: string) => f.trim().split('=')[0].trim());
        fields.forEach((field: string, i: number) => {
          if (p[i] !== undefined) (post as any)[field] = p[i];
        });
      }
    }
    return makeResult(post ? [post] : []);
  }
  if (sql.startsWith('delete from posts') && sql.includes('where id')) {
    const idx = memStore.posts.findIndex((post: any) => post.id === p[0]);
    if (idx >= 0) memStore.posts.splice(idx, 1);
    return makeResult([]);
  }
  if (sql.startsWith('update posts set published') && sql.includes('expires_at')) {
    // Expiry cleanup — mark expired posts as unpublished
    let count = 0;
    const now = new Date();
    memStore.posts.forEach((post: any) => {
      if (post.expires_at && new Date(post.expires_at) < now && post.published !== false) {
        post.published = false;
        count++;
      }
    });
    return makeResult(Array(count).fill({}));
  }
  if (sql.startsWith('insert into posts')) {
    const post = {
      id: nextId(),
      vendor_id: p[0],
      type: p[1],
      caption: p[2],
      photo_url: p[3] ?? null,
      multiplier: p[4] ?? null,
      expires_at: p[5] ?? null,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
    };
    memStore.posts.unshift(post);
    return makeResult([post]);
  }

  // ── FEED (discover — all posts) ──
  if (sql.includes('from posts') && sql.includes('join vendors') && !sql.includes('follows')) {
    const rows = memStore.posts
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((post: any) => {
        const v = memStore.vendors.find((v: any) => v.id === post.vendor_id);
        const isFollowing = memStore.follows.some(
          (f: any) => f.user_id === p[0] && f.vendor_id === post.vendor_id,
        );
        const isLiked = memStore.post_likes.some(
          (l: any) => l.user_id === p[0] && l.post_id === post.id,
        );
        const isBookmarked = memStore.bookmarks.some(
          (b: any) => b.user_id === p[0] && b.post_id === post.id,
        );
        return {
          ...post,
          vendor_name: v?.name ?? '',
          vendor_slug: v?.slug ?? '',
          vendor_logo: v?.logo_url ?? null,
          vendor_neighborhood: v?.neighborhood ?? null,
          vendor_cover_url: v?.cover_url ?? null,
          is_following: isFollowing,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
        };
      });
    return makeResult(rows);
  }

  // ── FEED (following — only followed vendors) ──
  if (sql.includes('from posts') && sql.includes('follows')) {
    const followedVendorIds = memStore.follows
      .filter((f: any) => f.user_id === p[0])
      .map((f: any) => f.vendor_id);
    const rows = memStore.posts
      .filter((post: any) => followedVendorIds.includes(post.vendor_id))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((post: any) => {
        const v = memStore.vendors.find((v: any) => v.id === post.vendor_id);
        const isLiked = memStore.post_likes.some(
          (l: any) => l.user_id === p[0] && l.post_id === post.id,
        );
        const isBookmarked = memStore.bookmarks.some(
          (b: any) => b.user_id === p[0] && b.post_id === post.id,
        );
        return {
          ...post,
          vendor_name: v?.name ?? '',
          vendor_slug: v?.slug ?? '',
          vendor_logo: v?.logo_url ?? null,
          vendor_neighborhood: v?.neighborhood ?? null,
          vendor_cover_url: v?.cover_url ?? null,
          is_following: true,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
        };
      });
    return makeResult(rows);
  }

  // ── FOLLOWS ──
  if (sql.includes('from follows') && sql.includes('user_id = $1') && sql.includes('vendor_id = $2')) {
    const row = memStore.follows.find(
      (f: any) => f.user_id === p[0] && f.vendor_id === p[1],
    );
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('from follows') && sql.includes('user_id = $1') && !sql.includes('vendor_id')) {
    const rows = memStore.follows
      .filter((f: any) => f.user_id === p[0])
      .map((f: any) => {
        const v = memStore.vendors.find((v: any) => v.id === f.vendor_id);
        return { id: v?.id, name: v?.name, logo_url: v?.logo_url ?? null };
      });
    return makeResult(rows);
  }
  if (sql.startsWith('insert into follows')) {
    const existing = memStore.follows.find(
      (f: any) => f.user_id === p[0] && f.vendor_id === p[1],
    );
    if (!existing) {
      memStore.follows.push({ user_id: p[0], vendor_id: p[1] });
      const v = memStore.vendors.find((v: any) => v.id === p[1]);
      if (v) v.follower_count++;
    }
    return makeResult([{ following: true }]);
  }
  if (sql.startsWith('delete from follows')) {
    const idx = memStore.follows.findIndex(
      (f: any) => f.user_id === p[0] && f.vendor_id === p[1],
    );
    if (idx >= 0) {
      memStore.follows.splice(idx, 1);
      const v = memStore.vendors.find((v: any) => v.id === p[1]);
      if (v) v.follower_count = Math.max(0, v.follower_count - 1);
    }
    return makeResult([{ following: false }]);
  }

  // ── POST LIKES ──
  if (sql.includes('from post_likes') && sql.includes('user_id') && sql.includes('post_id')) {
    const row = memStore.post_likes.find(
      (l: any) => l.user_id === p[0] && l.post_id === p[1],
    );
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('insert into post_likes')) {
    const existing = memStore.post_likes.find(
      (l: any) => l.user_id === p[0] && l.post_id === p[1],
    );
    if (!existing) {
      memStore.post_likes.push({ user_id: p[0], post_id: p[1] });
      const post = memStore.posts.find((post: any) => post.id === p[1]);
      if (post) post.like_count++;
    }
    const post = memStore.posts.find((post: any) => post.id === p[1]);
    return makeResult([{ liked: true, like_count: post?.like_count ?? 0 }]);
  }
  if (sql.startsWith('delete from post_likes')) {
    const idx = memStore.post_likes.findIndex(
      (l: any) => l.user_id === p[0] && l.post_id === p[1],
    );
    if (idx >= 0) {
      memStore.post_likes.splice(idx, 1);
      const post = memStore.posts.find((post: any) => post.id === p[1]);
      if (post) post.like_count = Math.max(0, post.like_count - 1);
    }
    const post = memStore.posts.find((post: any) => post.id === p[1]);
    return makeResult([{ liked: false, like_count: post?.like_count ?? 0 }]);
  }

  // ── POST COMMENTS ──
  if (sql.includes('from post_comments') && sql.includes('post_id = $1')) {
    const rows = memStore.post_comments
      .filter((c: any) => c.post_id === p[0])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return makeResult(rows);
  }
  if (sql.startsWith('insert into post_comments')) {
    const comment = {
      id: nextId(),
      post_id: p[0],
      user_id: p[1],
      display_name: p[2],
      body: p[3],
      created_at: new Date().toISOString(),
    };
    memStore.post_comments.push(comment);
    const post = memStore.posts.find((post: any) => post.id === p[0]);
    if (post) post.comment_count++;
    return makeResult([comment]);
  }

  // ── BOOKMARKS ──
  if (sql.includes('from bookmarks') && sql.includes('user_id = $1') && sql.includes('post_id = $2') && !sql.includes('join')) {
    const row = memStore.bookmarks.find(
      (b: any) => b.user_id === p[0] && b.post_id === p[1],
    );
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('insert into bookmarks')) {
    const existing = memStore.bookmarks.find(
      (b: any) => b.user_id === p[0] && b.post_id === p[1],
    );
    if (!existing) {
      memStore.bookmarks.push({ user_id: p[0], post_id: p[1], created_at: new Date().toISOString() });
    }
    return makeResult([{ bookmarked: true }]);
  }
  if (sql.startsWith('delete from bookmarks')) {
    const idx = memStore.bookmarks.findIndex(
      (b: any) => b.user_id === p[0] && b.post_id === p[1],
    );
    if (idx >= 0) {
      memStore.bookmarks.splice(idx, 1);
    }
    return makeResult([{ bookmarked: false }]);
  }
  if (sql.includes('from bookmarks') && sql.includes('join posts') && sql.includes('join vendors')) {
    const userBookmarks = memStore.bookmarks
      .filter((b: any) => b.user_id === p[0])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const rows = userBookmarks
      .map((b: any) => {
        const post = memStore.posts.find((post: any) => post.id === b.post_id);
        if (!post) return null;
        const v = memStore.vendors.find((v: any) => v.id === post.vendor_id);
        return { ...post, vendor_name: v?.name ?? '' };
      })
      .filter(Boolean);
    return makeResult(rows);
  }

  // ── MAP QUERIES ──
  // All active vendors with follow status (for map endpoint)
  if (sql.includes('from vendors v') && sql.includes('exists') && sql.includes('follows') && sql.includes("status = 'active'")) {
    let filtered = memStore.vendors.filter((v: any) => v.status === 'active');
    // Optional category filter
    if (sql.includes('lower(v.category)') && p[1]) {
      const cat = (p[1] as string).toLowerCase();
      filtered = filtered.filter((v: any) => v.category?.toLowerCase() === cat);
    }
    const rows = filtered
      .sort((a: any, b: any) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
      .map((v: any) => ({
        ...v,
        is_following: memStore.follows.some(
          (f: any) => f.user_id === p[0] && f.vendor_id === v.id,
        ),
      }));
    return makeResult(rows);
  }
  // Active deals (flash/deal posts not expired)
  if (sql.includes('from posts p') && sql.includes("p.type in ('flash', 'deal')") && sql.includes('p.published = true')) {
    const now = new Date();
    const rows = memStore.posts
      .filter((post: any) => {
        if (post.published === false) return false;
        if (post.type !== 'flash' && post.type !== 'deal') return false;
        if (post.expires_at && new Date(post.expires_at) <= now) return false;
        return true;
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((post: any) => ({
        vendor_id: post.vendor_id,
        post_id: post.id,
        type: post.type,
        caption: post.caption,
        multiplier: post.multiplier,
        expires_at: post.expires_at,
      }));
    return makeResult(rows);
  }

  // ── ANALYTICS QUERIES ──
  // Check-ins count with interval-based date filter (current period)
  if (sql.includes('count') && sql.includes('from transactions') && sql.includes("status = 'claimed'") && sql.includes("interval '1 day' * $2") && !sql.includes('$3')) {
    const vendorTxns = memStore.transactions.filter((t) => {
      if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
      const daysBack = Number(p[1]);
      const cutoff = Date.now() - daysBack * 86400000;
      return new Date(t.claimed_at).getTime() >= cutoff;
    });
    return makeResult([{ count: vendorTxns.length }]);
  }
  // Check-ins count with interval-based date filter (prior period)
  if (sql.includes('count') && sql.includes('from transactions') && sql.includes("status = 'claimed'") && sql.includes("interval '1 day' * $2") && sql.includes("interval '1 day' * $3")) {
    const vendorTxns = memStore.transactions.filter((t) => {
      if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
      const start = Date.now() - Number(p[1]) * 86400000;
      const end = Date.now() - Number(p[2]) * 86400000;
      const ts = new Date(t.claimed_at).getTime();
      return ts >= start && ts < end;
    });
    return makeResult([{ count: vendorTxns.length }]);
  }
  // Revenue with interval (current)
  if (sql.includes('sum(amount)') && sql.includes("interval '1 day' * $2") && !sql.includes('$3')) {
    const total = memStore.transactions
      .filter((t) => {
        if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
        return new Date(t.claimed_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return makeResult([{ total: Math.round(total * 100) / 100 }]);
  }
  // Revenue with interval (prior)
  if (sql.includes('sum(amount)') && sql.includes("interval '1 day' * $2") && sql.includes("interval '1 day' * $3")) {
    const total = memStore.transactions
      .filter((t) => {
        if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
        const ts = new Date(t.claimed_at).getTime();
        const start = Date.now() - Number(p[1]) * 86400000;
        const end = Date.now() - Number(p[2]) * 86400000;
        return ts >= start && ts < end;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return makeResult([{ total: Math.round(total * 100) / 100 }]);
  }
  // Unique customers (distinct claimed_by) current
  if (sql.includes('count(distinct claimed_by)') && sql.includes("interval '1 day' * $2") && !sql.includes('$3')) {
    const uniqueSet = new Set(
      memStore.transactions
        .filter((t) => {
          if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
          return new Date(t.claimed_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
        })
        .map((t) => t.claimed_by),
    );
    return makeResult([{ count: uniqueSet.size }]);
  }
  // Unique customers prior
  if (sql.includes('count(distinct claimed_by)') && sql.includes("interval '1 day' * $2") && sql.includes("interval '1 day' * $3")) {
    const uniqueSet = new Set(
      memStore.transactions
        .filter((t) => {
          if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
          const ts = new Date(t.claimed_at).getTime();
          const start = Date.now() - Number(p[1]) * 86400000;
          const end = Date.now() - Number(p[2]) * 86400000;
          return ts >= start && ts < end;
        })
        .map((t) => t.claimed_by),
    );
    return makeResult([{ count: uniqueSet.size }]);
  }
  // Repeat customers (subquery with GROUP BY HAVING COUNT > 1)
  if (sql.includes('repeat_customers') || (sql.includes('group by claimed_by') && sql.includes('having count'))) {
    const counts: Record<string, number> = {};
    memStore.transactions
      .filter((t) => {
        if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
        return new Date(t.claimed_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
      })
      .forEach((t) => {
        counts[t.claimed_by] = (counts[t.claimed_by] || 0) + 1;
      });
    const repeatCount = Object.values(counts).filter((c) => c > 1).length;
    return makeResult([{ count: repeatCount }]);
  }
  // Points issued with interval
  if (sql.includes('sum(points_value)') && sql.includes("interval '1 day' * $2")) {
    const total = memStore.transactions
      .filter((t) => {
        if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
        return new Date(t.claimed_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
      })
      .reduce((sum, t) => sum + Number(t.points_value), 0);
    return makeResult([{ total }]);
  }
  // Daily check-in counts (GROUP BY DATE)
  if (sql.includes('date(claimed_at)') && sql.includes('group by') && sql.includes('order by date')) {
    const buckets: Record<string, number> = {};
    memStore.transactions
      .filter((t) => {
        if (t.vendor_id !== p[0] || t.status !== 'claimed') return false;
        return new Date(t.claimed_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
      })
      .forEach((t) => {
        const date = new Date(t.claimed_at).toISOString().split('T')[0];
        buckets[date] = (buckets[date] || 0) + 1;
      });
    const rows = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    return makeResult(rows);
  }
  // Top posts by engagement (likes + comments)
  if (sql.includes('from posts') && sql.includes('like_count + comment_count') && sql.includes('order by') && sql.includes('limit 5')) {
    const cutoff = Date.now() - Number(p[1]) * 86400000;
    const rows = memStore.posts
      .filter((post: any) => post.vendor_id === p[0] && new Date(post.created_at).getTime() >= cutoff)
      .sort((a: any, b: any) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count))
      .slice(0, 5)
      .map((post: any) => ({
        id: post.id,
        caption: post.caption,
        type: post.type,
        like_count: post.like_count,
        comment_count: post.comment_count,
        created_at: post.created_at,
      }));
    return makeResult(rows);
  }
  // Post engagement sum (current period)
  if (sql.includes('sum(like_count + comment_count)') && sql.includes("interval '1 day' * $2") && !sql.includes('$3')) {
    const total = memStore.posts
      .filter((post: any) => {
        if (post.vendor_id !== p[0]) return false;
        return new Date(post.created_at).getTime() >= Date.now() - Number(p[1]) * 86400000;
      })
      .reduce((sum: number, post: any) => sum + (post.like_count ?? 0) + (post.comment_count ?? 0), 0);
    return makeResult([{ total }]);
  }
  // Post engagement sum (prior period)
  if (sql.includes('sum(like_count + comment_count)') && sql.includes("interval '1 day' * $2") && sql.includes("interval '1 day' * $3")) {
    const total = memStore.posts
      .filter((post: any) => {
        if (post.vendor_id !== p[0]) return false;
        const ts = new Date(post.created_at).getTime();
        const start = Date.now() - Number(p[1]) * 86400000;
        const end = Date.now() - Number(p[2]) * 86400000;
        return ts >= start && ts < end;
      })
      .reduce((sum: number, post: any) => sum + (post.like_count ?? 0) + (post.comment_count ?? 0), 0);
    return makeResult([{ total }]);
  }
  // Vendor follower_count lookup
  if (sql.includes('follower_count from vendors') && sql.includes('where id')) {
    const v = memStore.vendors.find((v) => v.id === p[0]);
    return makeResult(v ? [{ follower_count: v.follower_count }] : [{ follower_count: 0 }]);
  }

  // ── PUSH TOKENS ──
  if (sql.startsWith('insert into push_tokens')) {
    const existing = memStore.push_tokens.find(
      (pt: any) => pt.user_id === p[0] && pt.token === p[1],
    );
    if (existing) {
      existing.active = true;
    } else {
      memStore.push_tokens.push({
        id: nextId(),
        user_id: p[0],
        token: p[1],
        platform: p[2],
        active: true,
        created_at: new Date().toISOString(),
      });
    }
    return makeResult([]);
  }
  if (sql.startsWith('update push_tokens') && sql.includes('active = false')) {
    const pt = memStore.push_tokens.find(
      (pt: any) => pt.user_id === p[0] && pt.token === p[1],
    );
    if (pt) pt.active = false;
    return makeResult([]);
  }
  if (sql.includes('from push_tokens') && sql.includes('active = true')) {
    const rows = memStore.push_tokens.filter(
      (pt: any) => pt.user_id === p[0] && pt.active,
    );
    return makeResult(rows.map((r: any) => ({ token: r.token })));
  }

  // ── NOTIFICATION PREFERENCES ──
  if (sql.includes('from notification_preferences') && sql.includes('user_id = $1')) {
    const row = memStore.notification_preferences.find((np: any) => np.user_id === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.startsWith('insert into notification_preferences')) {
    const existing = memStore.notification_preferences.find((np: any) => np.user_id === p[0]);
    if (existing) {
      existing.flash_deals = p[1];
      existing.points_milestones = p[2];
      existing.redemption_ready = p[3];
      existing.weekly_summary = p[4];
      existing.new_post_followed = p[5];
      existing.updated_at = new Date().toISOString();
    } else {
      memStore.notification_preferences.push({
        user_id: p[0],
        flash_deals: p[1],
        points_milestones: p[2],
        redemption_ready: p[3],
        weekly_summary: p[4],
        new_post_followed: p[5],
        updated_at: new Date().toISOString(),
      });
    }
    return makeResult([]);
  }

  // ── NOTIFICATIONS ──
  if (sql.includes('insert into notifications')) {
    const notif = {
      id: nextId(),
      user_id: p[0],
      title: p[1],
      body: p[2],
      type: p[3],
      data: p[4] ? JSON.parse(p[4] as string) : null,
      read: false,
      created_at: new Date().toISOString(),
    };
    memStore.notifications.unshift(notif);
    return makeResult([{ id: notif.id }]);
  }
  if (sql.includes('from notifications') && sql.includes('order by') && sql.includes('limit')) {
    const rows = memStore.notifications
      .filter((n: any) => n.user_id === p[0])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(Number(p[2]) || 0, (Number(p[2]) || 0) + (Number(p[1]) || 20));
    return makeResult(rows);
  }
  if (sql.includes('count') && sql.includes('from notifications') && sql.includes('read = false')) {
    const count = memStore.notifications.filter(
      (n: any) => n.user_id === p[0] && !n.read,
    ).length;
    return makeResult([{ count }]);
  }
  if (sql.startsWith('update notifications set read = true') && sql.includes('id = $1')) {
    const n = memStore.notifications.find(
      (n: any) => n.id === p[0] && n.user_id === p[1],
    );
    if (n) n.read = true;
    return makeResult([]);
  }
  if (sql.startsWith('update notifications set read = true') && sql.includes('user_id = $1') && sql.includes('read = false')) {
    let count = 0;
    memStore.notifications.forEach((n: any) => {
      if (n.user_id === p[0] && !n.read) {
        n.read = true;
        count++;
      }
    });
    return makeResult(Array(count).fill({}));
  }
  // Follows lookup for notifications (get followers of a vendor)
  if (sql.includes('select user_id from follows') && sql.includes('vendor_id = $1')) {
    const rows = memStore.follows
      .filter((f: any) => f.vendor_id === p[0])
      .map((f: any) => ({ user_id: f.user_id }));
    return makeResult(rows);
  }

  // ── VENDOR SEARCH ──
  if (sql.includes('from vendors') && sql.includes('like')) {
    const searchTerm = (p[0] as string);
    const rows = memStore.vendors.filter((v: any) =>
      v.name.toLowerCase().includes(searchTerm.replace(/%/g, '')) ||
      v.neighborhood.toLowerCase().includes(searchTerm.replace(/%/g, ''))
    );
    return makeResult(rows);
  }

  // ── WAITLIST ──
  if (sql.startsWith('insert into waitlist')) {
    const existing = memStore.waitlist.find((w) => w.email === p[0]);
    if (existing) {
      return makeResult([]); // ON CONFLICT DO NOTHING → no rows returned
    }
    const entry = {
      id: nextId(),
      email: p[0],
      role: p[1] || 'customer',
      created_at: new Date().toISOString(),
    };
    memStore.waitlist.push(entry);
    return makeResult([entry]);
  }
  if (sql.includes('from waitlist') && sql.includes('email = $1')) {
    const row = memStore.waitlist.find((w) => w.email === p[0]);
    return makeResult(row ? [row] : []);
  }
  if (sql.includes('count(*)') && sql.includes('from waitlist')) {
    return makeResult([{ count: String(memStore.waitlist.length) }]);
  }

  // ── FALLBACK ──
  console.log('[DEV_MODE] Unhandled query:', sql.slice(0, 120), '| params:', p);
  return makeResult([]);
}

// ── Production Postgres client ────────────────────────────────────────
let pool: pg.Pool | null = null;

if (!DEV_MODE) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });

  pool.on('error', (err) => {
    console.error('Unexpected Postgres pool error:', err);
  });
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  if (DEV_MODE) {
    return memQuery<T>(text, params);
  }
  return pool!.query<T>(text, params);
}

/**
 * Run multiple queries inside a single Postgres transaction.
 * In DEV_MODE, just runs the callback with a fake client.
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  if (DEV_MODE) {
    // Create a fake client that delegates to memQuery
    const fakeClient = {
      query: (text: string, params?: unknown[]) => memQuery(text, params),
    } as unknown as pg.PoolClient;
    return callback(fakeClient);
  }

  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
