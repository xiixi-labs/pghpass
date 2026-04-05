# PGH Pass — Points System & Pool Mechanics
Version 1.0

---

## 1. Core Formula

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Earn rate | $1 = 10 points | Standard industry rate |
| Redemption rate | 500 pts = $5 | 10% reward rate |
| Effective return | 10% of spend | Competitive with premium credit cards |
| Min redemption | 500 points | Reached after ~$50 spend |
| Points expiry | 12 months inactivity | Standard loyalty program policy |

**Examples:**
- $8.23 coffee → 82 pts
- $18.00 lunch → 180 pts
- $120.00 car repair → 1,200 pts
- $50.00 total spend → 500 pts → $5 reward (first redemption)

---

## 2. Rounding Rules

Points are always rounded **down** to the nearest integer to protect the pool.

```typescript
function calculatePoints(amount: number): number {
  return Math.floor(amount * 10);
}

// Examples:
// $8.23 → Math.floor(82.3) = 82 pts ✓
// $8.99 → Math.floor(89.9) = 89 pts ✓  (not 90)
// $1.05 → Math.floor(10.5) = 10 pts ✓
```

---

## 3. Pool Mechanics

### 3.1 How the Pool Works

The pool is a shared float funded by vendor transaction contributions. It is the source of funds for all customer redemption payouts. PGH Pass acts as the custodian.

```
MONEY IN:
  Vendor contribution = transaction.amount × contribution_rate (2%)
  Flash 2× deal       = transaction.amount × 4%
  Flash 3× deal       = transaction.amount × 6%

MONEY OUT:
  Redemption payout to vendor = redemption.dollar_value
  (when vendor confirms redemption was applied)

MARGIN:
  Subscription revenue  → pure margin (not pool)
  Breakage (unredeemed) → stays in pool, owned by PGH Pass
  Campaign fees         → pure margin (not pool)
```

### 3.2 Pool Contribution Calculation

```typescript
type ContributionRate = 0.02 | 0.04 | 0.06; // standard | 2x flash | 3x flash

function calculateContribution(
  amount: number,
  rate: ContributionRate = 0.02
): number {
  return parseFloat((amount * rate).toFixed(2));
}

// On a $50 transaction at standard rate:
// contribution = $50 × 0.02 = $1.00
// Points issued = 50 × 10 = 500 pts
// When redeemed: pool pays vendor $5.00
// Net pool: +$1.00 (contribution) - $5.00 (payout) = -$4.00 on this transaction
//
// BUT: 25-35% of points are never redeemed (breakage)
// Across 10 similar transactions:
//   Pool in:  10 × $1.00 = $10.00
//   Pool out: 7 × $5.00  = $35.00  (assuming 70% redemption rate)
//   Net:      -$25.00
//
// THIS IS WHY the subscription fee and higher volume are required.
// At 100 vendors × $99/mo = $9,900/mo subscription margin covers the gap.
```

### 3.3 Pool Sustainability Model

At steady state (Month 12, 100 vendors, 3,000 active customers):

```
Monthly pool inflows:
  Avg transaction: $15
  Avg transactions/customer/month: 8
  Total transactions: 3,000 × 8 = 24,000
  Total transaction volume: 24,000 × $15 = $360,000
  Pool contributions (2%): $7,200/mo

Monthly pool outflows:
  Points issued: 24,000 × 150 pts avg = 3,600,000 pts
  Redemption rate: 30% (industry avg for new programs)
  Redemptions: 3,600,000 × 0.30 / 500 × $5 = $10,800/mo
  
Pool deficit: $7,200 - $10,800 = -$3,600/mo
Covered by: subscription revenue ($9,900/mo)
Net margin before ops: $6,300/mo

As breakage increases (users forget to redeem):
  At 40% redemption rate: outflow = $8,640 → margin = $8,460/mo
  At 25% redemption rate: outflow = $5,400 → pool self-sustaining
```

---

## 4. Flash Deal Multipliers

Flash deals allow vendors to temporarily boost point earn rates to drive traffic.

```typescript
type Multiplier = 1 | 2 | 3;

function flashPointsMultiplier(
  basePoints: number,
  multiplier: Multiplier
): number {
  return basePoints * multiplier;
}

function flashContributionRate(multiplier: Multiplier): number {
  return multiplier * 0.02; // 1x=2%, 2x=4%, 3x=6%
}
```

**Important:** Flash deal multiplier costs are ALWAYS borne by the vendor, not PGH Pass. The vendor's contribution rate increases proportionally. PGH Pass never subsidizes a flash deal.

Flash deal contributions are billed as a line item in the vendor's monthly Stripe invoice.

---

## 5. Points Ledger Design

The ledger is append-only. Points are never directly mutated — every change is a new ledger entry.

```typescript
interface LedgerEntry {
  id: string;
  user_id: string;
  vendor_id: string | null;
  transaction_id: string | null;
  redemption_id: string | null;
  delta: number;           // positive = earn, negative = spend/expire
  balance_after: number;   // always computed from previous balance + delta
  note: string;            // human-readable
  created_at: Date;
}
```

**Ledger entry types:**
| Event | Delta | Note |
|-------|-------|------|
| Earn at vendor | +82 | "Earned at Commonplace Coffee" |
| Redeem $5 | -500 | "$5 reward issued" |
| Flash deal 2× | +164 | "2× bonus at Fig & Ash Bakery" |
| Refund reversal | -82 | "Reversed: refund processed" |
| Expiry | -remaining | "Points expired after 12mo inactivity" |
| Admin adjustment | ±N | "Manual adjustment: [reason]" |

**Computing balance:**
```sql
-- Authoritative balance (slow, for audits)
SELECT SUM(delta) as balance FROM point_ledger WHERE user_id = $1;

-- Fast balance (for API reads)
SELECT balance FROM point_balances WHERE user_id = $1;
```

The `point_balances` table is kept in sync via trigger on every ledger insert.

---

## 6. Awarding Points — Service Implementation

```typescript
// server/src/services/points.service.ts

interface AwardPointsInput {
  userId: string;
  vendorId: string;
  transactionId: string;
  amount: number;          // transaction dollar amount
  multiplier?: 1 | 2 | 3; // for flash deals
}

async function awardPoints(input: AwardPointsInput): Promise<{
  pointsAwarded: number;
  newBalance: number;
}> {
  const basePoints = Math.floor(input.amount * 10);
  const pointsToAward = basePoints * (input.multiplier ?? 1);

  // Use a DB transaction for atomicity
  return await db.transaction(async (trx) => {
    // 1. Get current balance with row lock
    const { balance } = await trx
      .select('balance')
      .from('point_balances')
      .where('user_id', input.userId)
      .forUpdate()
      .first() ?? { balance: 0 };

    const newBalance = balance + pointsToAward;

    // 2. Insert ledger entry
    await trx.insert({
      user_id: input.userId,
      vendor_id: input.vendorId,
      transaction_id: input.transactionId,
      delta: pointsToAward,
      balance_after: newBalance,
      note: `Earned at ${vendorName}`,
    }).into('point_ledger');

    // Trigger on point_ledger will update point_balances automatically

    return { pointsAwarded: pointsToAward, newBalance };
  });
}
```

---

## 7. Redemption — Service Implementation

```typescript
async function issueRedemption(input: {
  userId: string;
  optionId: string;
  vendorId?: string;
}): Promise<Redemption> {
  const option = REDEMPTION_OPTIONS[input.optionId]; // static config
  
  return await db.transaction(async (trx) => {
    // 1. Lock balance row — prevents double-spend
    const { balance } = await trx
      .select('balance')
      .from('point_balances')
      .where('user_id', input.userId)
      .forUpdate()
      .first();

    if (balance < option.points_cost) {
      throw new InsufficientPointsError();
    }

    const newBalance = balance - option.points_cost;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 2. Create redemption record
    const [redemption] = await trx.insert({
      user_id: input.userId,
      vendor_id: input.vendorId ?? null,
      points_cost: option.points_cost,
      dollar_value: option.dollar_value,
      reward_label: option.label,
      redeem_token: token,
      token_expires_at: expiresAt,
    }).into('redemptions').returning('*');

    // 3. Deduct points via ledger
    await trx.insert({
      user_id: input.userId,
      redemption_id: redemption.id,
      delta: -option.points_cost,
      balance_after: newBalance,
      note: `${option.label} issued`,
    }).into('point_ledger');

    // 4. Cache token in Redis with TTL
    await redis.set(
      `redeem:${token}`,
      redemption.id,
      'EX',
      600 // 10 minutes
    );

    return redemption;
  });
}
```

---

## 8. Expiry Processing

Run as a nightly cron job (e.g. 2am ET).

```typescript
// Expire points for users inactive > 12 months
async function processPointExpiry(): Promise<void> {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const inactiveUsers = await db
    .select('user_id', 'balance')
    .from('point_balances')
    .where('balance', '>', 0)
    .whereNotExists(
      db.select('id').from('point_ledger')
        .whereRaw('user_id = point_balances.user_id')
        .where('created_at', '>', cutoff)
    );

  for (const user of inactiveUsers) {
    await db.transaction(async (trx) => {
      await trx.insert({
        user_id: user.user_id,
        delta: -user.balance,
        balance_after: 0,
        note: 'Points expired after 12 months of inactivity',
      }).into('point_ledger');
    });

    // Log breakage to pool ledger
    const dollarValue = (user.balance / 500) * 5;
    await logPoolEntry({
      entry_type: 'breakage',
      amount: dollarValue,
      note: `Breakage from user ${user.user_id}`,
    });
  }
}
```

---

## 9. Fraud Velocity Checks

```typescript
// Called before every points award
async function checkVelocity(userId: string, vendorId: string): Promise<void> {
  const key = `velocity:${userId}:${vendorId}:${todayDateString()}`;
  const count = await redis.incr(key);
  await redis.expire(key, 86400); // 24 hour window

  if (count > 5) {
    await createFraudFlag({
      user_id: userId,
      vendor_id: vendorId,
      flag_type: 'velocity',
      severity: count > 10 ? 3 : 2,
      description: `${count} transactions at same vendor in one day`,
    });
    throw new VelocityLimitError();
  }
}
```
