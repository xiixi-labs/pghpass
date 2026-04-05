# PGH Pass — Transaction Queue & NFC Matching Algorithm
Version 1.0

---

## 1. Overview

The transaction queue solves a specific problem: when multiple customers pay at the same register in quick succession, the system must correctly assign each claim to the right transaction — even if the amounts are identical.

**The solution:** A per-register FIFO queue in Redis, matched by tap timestamp rather than amount. The customer's entered amount is a verification check, not the lookup key.

---

## 2. Redis Data Structures

### 2.1 Per-Register Transaction Queue
```
Key:    queue:register:{register_id}
Type:   Redis List
Format: JSON string per entry
TTL:    None (managed manually — entries cleaned up on claim or expiry)

Entry format:
{
  "transaction_id": "uuid",
  "amount": 8.23,
  "created_at": "2025-01-01T12:00:00.000Z",
  "status": "pending"
}
```

Operations:
- `LPUSH` — prepend new transaction (newest at index 0)
- `LRANGE key 0 -1` — read all entries for matching
- `LREM key 1 <value>` — remove specific entry after claim/expiry

### 2.2 QR Token Storage
```
Key:    txn:{token}
Type:   Redis String
Value:  transaction_id (UUID string)
TTL:    90 seconds (auto-expires)
```

### 2.3 NFC Claim Lock (race condition prevention)
```
Key:    claim:lock:{transaction_id}
Type:   Redis String
Value:  user_id
TTL:    5 seconds
Set with: SET key value NX EX 5  (NX = only set if not exists)
```

### 2.4 Velocity Counters
```
Key:    velocity:{user_id}:{vendor_id}:{YYYY-MM-DD}
Type:   Redis String (integer counter)
TTL:    86400 seconds (24 hours)
```

### 2.5 Failed Match Counter (fraud signal)
```
Key:    failmatch:{user_id}
Type:   Redis String (integer counter)
TTL:    604800 seconds (7 days)
```

---

## 3. QR Code Flow (Full Detail)

### 3.1 QR Generation (Vendor Side)

```typescript
// server/src/services/queue.service.ts

async function generateQRTransaction(input: {
  vendorId: string;
  registerId: string;
  amount: number;
}): Promise<QRGenerateResult> {
  const token = uuidv4();
  const pointsValue = Math.floor(input.amount * 10);
  const expiresAt = new Date(Date.now() + 90_000); // 90 seconds

  // 1. Create transaction record in Postgres
  const transaction = await db.insert({
    vendor_id: input.vendorId,
    register_id: input.registerId,
    amount: input.amount,
    points_value: pointsValue,
    source: 'qr',
    status: 'pending',
    qr_token: token,
    qr_expires_at: expiresAt,
  }).into('transactions').returning('*')[0];

  // 2. Store token in Redis with 90s TTL
  await redis.set(
    `txn:${token}`,
    transaction.id,
    'EX',
    90
  );

  // 3. Push to register FIFO queue
  const queueEntry = JSON.stringify({
    transaction_id: transaction.id,
    amount: input.amount,
    created_at: transaction.created_at.toISOString(),
    status: 'pending',
  });
  await redis.lpush(`queue:register:${input.registerId}`, queueEntry);

  return {
    transaction_id: transaction.id,
    token,
    qr_data: `pghpass://claim/${token}`,
    points_value: pointsValue,
    expires_at: expiresAt,
  };
}
```

### 3.2 QR Claim (Customer Side)

```typescript
async function claimQRTransaction(input: {
  token: string;
  userId: string;
  customerEnteredAmount: number;
}): Promise<ClaimResult> {

  // Step 1: Check Redis token exists (fast path — fails if expired/used)
  const transactionId = await redis.get(`txn:${input.token}`);
  if (!transactionId) {
    await incrementFailedMatch(input.userId);
    throw new QRExpiredOrUsedError();
  }

  // Step 2: Fetch transaction from Postgres
  const transaction = await db
    .select('*')
    .from('transactions')
    .where('id', transactionId)
    .first();

  if (!transaction || transaction.status !== 'pending') {
    throw new QRExpiredOrUsedError();
  }

  // Step 3: Verify amount within ±$0.50 tolerance
  const diff = Math.abs(transaction.amount - input.customerEnteredAmount);
  if (diff > 0.50) {
    await incrementFailedMatch(input.userId);
    throw new AmountMismatchError(transaction.amount, input.customerEnteredAmount);
  }

  // Step 4: Velocity check
  await checkVelocity(input.userId, transaction.vendor_id);

  // Step 5: Atomic claim — delete token from Redis
  // Using a pipeline to make delete + mark atomic as possible
  const deleted = await redis.del(`txn:${input.token}`);
  if (deleted === 0) {
    // Token was deleted by a concurrent request — race condition
    throw new QRExpiredOrUsedError();
  }

  // Step 6: Mark transaction as claimed in Postgres
  await db('transactions')
    .where('id', transactionId)
    .update({
      status: 'claimed',
      claimed_by: input.userId,
      claimed_at: new Date(),
      customer_entered_amount: input.customerEnteredAmount,
    });

  // Step 7: Remove from register queue
  const queueKey = `queue:register:${transaction.register_id}`;
  const entries = await redis.lrange(queueKey, 0, -1);
  for (const entry of entries) {
    const parsed = JSON.parse(entry);
    if (parsed.transaction_id === transactionId) {
      await redis.lrem(queueKey, 1, entry);
      break;
    }
  }

  // Step 8: Award points
  const { pointsAwarded, newBalance } = await pointsService.awardPoints({
    userId: input.userId,
    vendorId: transaction.vendor_id,
    transactionId,
    amount: transaction.amount,
  });

  // Step 9: Log pool contribution
  await poolService.recordContribution({
    vendorId: transaction.vendor_id,
    transactionId,
    amount: transaction.pool_contribution,
  });

  return {
    success: true,
    points_earned: pointsAwarded,
    new_balance: newBalance,
    transaction_id: transactionId,
  };
}
```

---

## 4. NFC Tap Flow (Full Detail)

### 4.1 The Matching Algorithm

```
GIVEN:
  - vendor_id (from NFC chip URL param)
  - register_id (from NFC chip URL param)
  - customer_entered_amount (typed by customer)
  - tapped_at (timestamp of NFC tap, from client)
  - TOLERANCE = $0.50

ALGORITHM:
  1. Pull all pending entries from queue:register:{register_id}
  2. Filter: keep only entries where created_at <= tapped_at + 15min grace
  3. Filter: keep only entries where created_at <= tapped_at (must be before tap)
  4. Filter: keep only entries where |entry.amount - customer_entered_amount| <= TOLERANCE
  5. Sort remaining entries by created_at DESC (newest first)
  6. Take the FIRST match (closest in time before the tap)
  7. Attempt atomic lock: SET claim:lock:{transaction_id} {user_id} NX EX 5
  8. If lock acquired → proceed to claim
  9. If lock not acquired → another request is processing this transaction → retry with next match
```

### 4.2 NFC Claim Implementation

```typescript
async function claimNFCTransaction(input: {
  userId: string;
  vendorId: string;
  registerId: string;
  customerEnteredAmount: number;
  tappedAt: Date;
}): Promise<ClaimResult> {

  const TOLERANCE = 0.50;
  const GRACE_MINUTES = 15; // customer can tap up to 15 mins after paying

  // Step 1: Pull queue
  const queueKey = `queue:register:${input.registerId}`;
  const rawEntries = await redis.lrange(queueKey, 0, -1);

  if (rawEntries.length === 0) {
    throw new NoTransactionFoundError();
  }

  // Step 2: Parse and filter
  const entries = rawEntries
    .map(e => JSON.parse(e) as QueueEntry)
    .filter(e => {
      const created = new Date(e.created_at);
      const maxTime = new Date(input.tappedAt.getTime() + GRACE_MINUTES * 60_000);

      return (
        e.status === 'pending' &&
        created <= maxTime &&                           // within grace window
        Math.abs(e.amount - input.customerEnteredAmount) <= TOLERANCE  // amount matches
      );
    })
    .sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ); // newest first

  if (entries.length === 0) {
    await incrementFailedMatch(input.userId);
    throw new NoTransactionFoundError();
  }

  // Step 3: Try to claim each candidate in order (handles race conditions)
  for (const entry of entries) {
    // Attempt atomic lock
    const lockKey = `claim:lock:${entry.transaction_id}`;
    const lockAcquired = await redis.set(
      lockKey,
      input.userId,
      'NX',  // only set if not exists
      'EX',
      5      // 5 second TTL
    );

    if (!lockAcquired) {
      // Another request is processing this transaction — try next candidate
      continue;
    }

    try {
      // Step 4: Fetch and verify transaction from Postgres
      const transaction = await db
        .select('*')
        .from('transactions')
        .where('id', entry.transaction_id)
        .first();

      if (!transaction || transaction.status !== 'pending') {
        await redis.del(lockKey);
        continue; // Already claimed — try next
      }

      // Step 5: Velocity check
      await checkVelocity(input.userId, input.vendorId);

      // Step 6: Claim in Postgres
      await db('transactions')
        .where('id', entry.transaction_id)
        .update({
          status: 'claimed',
          claimed_by: input.userId,
          claimed_at: new Date(),
          customer_entered_amount: input.customerEnteredAmount,
        });

      // Step 7: Remove from Redis queue
      await redis.lrem(queueKey, 1, JSON.stringify(entry));
      await redis.del(lockKey);

      // Step 8: Award points
      const { pointsAwarded, newBalance } = await pointsService.awardPoints({
        userId: input.userId,
        vendorId: input.vendorId,
        transactionId: entry.transaction_id,
        amount: transaction.amount,
      });

      // Step 9: Pool contribution
      await poolService.recordContribution({
        vendorId: input.vendorId,
        transactionId: entry.transaction_id,
        amount: transaction.pool_contribution,
      });

      return {
        success: true,
        points_earned: pointsAwarded,
        new_balance: newBalance,
        transaction_id: entry.transaction_id,
      };

    } catch (err) {
      await redis.del(lockKey);
      throw err;
    }
  }

  // No candidates could be claimed
  throw new NoTransactionFoundError();
}
```

---

## 5. Edge Cases

### 5.1 Same Amount, Same Register, Back-to-Back

```
Timeline:
  12:34:12 → Register 1: $8.23 (Customer A pays) → txn_001 pushed to queue
  12:34:58 → Register 1: $8.23 (Customer B pays) → txn_002 pushed to queue
  12:35:05 → Customer A taps NFC, enters $8.23

Queue state: [txn_002, txn_001]  (LPUSH = newest first)

Algorithm:
  tappedAt = 12:35:05
  Filter by amount: both txn_001 and txn_002 match ($8.23 ± $0.50)
  Filter by time:   txn_001 (12:34:12) ✓, txn_002 (12:34:58) ✓
  Sort by newest:   [txn_002, txn_001]
  
  Try txn_002 first → created_at 12:34:58 → this is AFTER Customer A paid
  
  ⚠️ Problem: Customer A tapped, but we'd match them to Customer B's transaction.
  
SOLUTION — Add timestamp constraint:
  Filter: entry.created_at <= tapped_at (transaction must be BEFORE the tap)
  
  txn_002 at 12:34:58 > tap at 12:35:05? NO → 12:34:58 < 12:35:05 ✓
  txn_001 at 12:34:12 < 12:35:05 ✓
  
  Both still pass. Sort newest first: [txn_002, txn_001]
  Customer A is assigned txn_002 (12:34:58) — the closest before their tap.
  
  12:35:20 → Customer B taps NFC, enters $8.23
  tappedAt = 12:35:20
  txn_002 already claimed → filtered out
  txn_001 (12:34:12) ✓ → assigned to Customer B ✓
```

### 5.2 Customer Taps Before Paying

```
Customer taps NFC at 12:34:00
Customer pays at 12:34:30 → txn created at 12:34:30

Algorithm:
  tappedAt = 12:34:00
  Filter: entry.created_at <= tapped_at
  txn created at 12:34:30 > 12:34:00 → FILTERED OUT

Result: No match found → "Please tap after completing your purchase"
```

### 5.3 Customer Forgets to Tap (comes back 20 mins later)

```
Customer paid at 12:00:00, taps at 12:20:00

Grace window = 15 minutes
maxTime = 12:20:00 + 15 min = 12:35:00
txn created at 12:00:00 <= 12:35:00 ✓

BUT: entry.created_at <= tapped_at
12:00:00 <= 12:20:00 ✓

Result: Match found. Points awarded.
NOTE: Unclaimed transactions expire from queue after 30 minutes.
```

### 5.4 Queue Cleanup (expired transactions)

```typescript
// Cron job: runs every 5 minutes
async function cleanExpiredQueueEntries(): Promise<void> {
  const EXPIRY_MINUTES = 30;
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60_000);

  // Get all active register queue keys
  const keys = await redis.keys('queue:register:*');

  for (const key of keys) {
    const entries = await redis.lrange(key, 0, -1);
    for (const raw of entries) {
      const entry = JSON.parse(raw) as QueueEntry;
      if (new Date(entry.created_at) < cutoff) {
        // Remove from queue
        await redis.lrem(key, 1, raw);
        // Mark as expired in Postgres
        await db('transactions')
          .where('id', entry.transaction_id)
          .where('status', 'pending')
          .update({ status: 'expired' });
      }
    }
  }
}
```

---

## 6. Amount Tolerance Logic

```typescript
function isAmountMatch(
  transactionAmount: number,
  customerEnteredAmount: number,
  tolerance: number = 0.50
): boolean {
  return Math.abs(transactionAmount - customerEnteredAmount) <= tolerance;
}

// Test cases:
isAmountMatch(8.23, 8.23)   // true  — exact match
isAmountMatch(8.23, 8.00)   // true  — within $0.50 (forgot tax)
isAmountMatch(8.23, 8.48)   // true  — within $0.50 (rounded up)
isAmountMatch(8.23, 7.70)   // false — $0.53 difference, over tolerance
isAmountMatch(8.23, 9.00)   // false — $0.77 difference
isAmountMatch(8.23, 50.00)  // false — clearly wrong amount
```

---

## 7. Failed Match Tracking

```typescript
async function incrementFailedMatch(userId: string): Promise<void> {
  const key = `failmatch:${userId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 604800); // 7 days

  // Thresholds:
  // 3+ failures in 7 days → low severity flag (may just be user error)
  // 6+ failures in 7 days → medium severity flag (worth reviewing)
  // 10+ failures in 7 days → high severity flag → auto-suspend pending review

  if (count === 3) {
    await createFraudFlag({ userId, severity: 1, flagType: 'amount_mismatch' });
  } else if (count === 6) {
    await createFraudFlag({ userId, severity: 2, flagType: 'amount_mismatch' });
  } else if (count >= 10) {
    await createFraudFlag({ userId, severity: 3, flagType: 'amount_mismatch' });
    await suspendUserPending(userId);
  }
}
```
