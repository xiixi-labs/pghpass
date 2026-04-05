# PGH Pass — API Reference
Version 1.0 | Phase 1

Base URL: `https://api.pghpass.app/v1`
Auth: `Authorization: Bearer <accessToken>` on all protected routes.

---

## AUTH

> **Authentication is handled entirely by Clerk.**
> There are no custom `/auth` endpoints to build. Clerk's SDK manages OTP sending,
> verification, session issuance, token rotation, and logout on both the client and server.
>
> **Client setup (React Native / Expo):**
> ```typescript
> import { ClerkProvider, useSignIn } from '@clerk/clerk-expo';
>
> // Wrap app in ClerkProvider with publishable key
> // Use useSignIn() hook for phone OTP flow
> // Use useAuth() hook to get userId and session token for API calls
> ```
>
> **Server setup (Fastify):**
> ```typescript
> import { clerkPlugin, getAuth } from '@clerk/fastify';
>
> // Register plugin — verifies Clerk JWTs on every request
> app.register(clerkPlugin, { publishableKey, secretKey });
>
> // In any protected route:
> const { userId } = getAuth(request);
> if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
> ```
>
> **After Clerk auth, your backend syncs the Clerk userId with your users table:**
> ```typescript
> // On first authenticated request, upsert user record
> await db('users').insert({
>   clerk_id: userId,
>   phone: clerkUser.phoneNumbers[0].phoneNumber,
>   role: 'customer',
> }).onConflict('clerk_id').ignore();
> ```

### POST /auth/sync (only custom auth endpoint needed)
Called after Clerk sign-in to sync Clerk user to your database and assign role.
```json
// Request (authenticated via Clerk JWT)
{ "role": "customer" }  // or "vendor"

// Response 200
{
  "id": "uuid",           // your internal DB user id
  "clerk_id": "user_...", // Clerk user id
  "role": "customer",
  "is_new_user": true
}
```

---

## VENDORS

### POST /vendors
Create vendor. Authenticated (customer becomes vendor owner).
```json
// Request
{
  "name": "Commonplace Coffee",
  "description": "Specialty coffee in Lawrenceville",
  "category": "coffee",
  "neighborhood": "Lawrenceville",
  "address": "5827 Penn Ave, Pittsburgh, PA 15206",
  "lat": 40.4634,
  "lng": -79.9559,
  "phone": "+14121234567",
  "website": "https://commonplacecoffee.com"
}

// Response 201
{
  "id": "uuid",
  "slug": "commonplace-coffee",
  "status": "pending",
  "stripe_onboarding_url": "https://connect.stripe.com/..."
}
```

### GET /vendors/:slug
Get vendor public profile.
```json
// Response 200
{
  "id": "uuid",
  "name": "Commonplace Coffee",
  "slug": "commonplace-coffee",
  "description": "...",
  "category": "coffee",
  "neighborhood": "Lawrenceville",
  "address": "5827 Penn Ave...",
  "logo_url": "https://...",
  "follower_count": 312,
  "subscription_plan": "pro",
  "registers": [
    { "id": "uuid", "label": "Register 1" },
    { "id": "uuid", "label": "Register 2" }
  ]
}
```

### GET /vendors/nearby
Get vendors near coordinates. Authenticated (customer).
```
Query params:
  lat: float (required)
  lng: float (required)
  radius_km: float (default: 2.0)
  limit: int (default: 20)
  offset: int (default: 0)
```
```json
// Response 200
{
  "vendors": [
    {
      "id": "uuid",
      "name": "Commonplace Coffee",
      "slug": "commonplace-coffee",
      "neighborhood": "Lawrenceville",
      "distance_km": 0.4,
      "logo_url": "https://...",
      "is_following": false,
      "active_flash_deal": null
    }
  ],
  "total": 14
}
```

### GET /vendors/me
Get authenticated vendor owner's vendor. Authenticated (vendor).
```json
// Response 200 — full vendor object including private fields
{
  "id": "uuid",
  "name": "Commonplace Coffee",
  "status": "active",
  "subscription_plan": "pro",
  "stripe_customer_id": "cus_...",
  "contribution_rate": 0.02,
  "stats": {
    "visits_today": 47,
    "visits_yesterday": 42,
    "followers": 312,
    "pts_issued_month": 4100,
    "pgh_sales_month": 824.50
  },
  "registers": [...]
}
```

### POST /vendors/:id/registers
Add a register to a vendor. Authenticated (vendor owner).
```json
// Request
{ "label": "Register 3" }

// Response 201
{ "id": "uuid", "vendor_id": "uuid", "label": "Register 3", "nfc_uid": null }
```

---

## TRANSACTIONS

### POST /transactions/qr/generate
Vendor generates a QR code for a transaction. Authenticated (vendor).

> **ATM-style numpad on the vendor tablet:**
> - Digits enter right-to-left with fixed 2-decimal places
> - Pressing 1→0→6→9 builds: $0.01 → $0.10 → $1.06 → $10.69
> - Physically impossible to enter $1069 — no way to shift the decimal
> - Confirmation screen shows amount + points preview before this endpoint is called
> - Tablet returns to home screen automatically after customer scans

```json
// Request
{
  "vendor_id": "uuid",
  "register_id": "uuid",
  "amount": 10.69  // always arrives as proper decimal — enforced by ATM numpad UI
}

// Response 201
{
  "transaction_id": "uuid",
  "token": "a3f9b2c1-...",
  "qr_data": "pghpass://claim/a3f9b2c1-...",
  "points_value": 106,
  "expires_at": "2025-01-01T12:01:30Z",
  "expires_in_seconds": 90
}

// Business logic:
// - Creates transaction record in Postgres
// - Pushes token to Redis with 90s TTL: SET txn:a3f9b2c1 <transaction_id> EX 90
// - Also pushes to register FIFO queue: LPUSH queue:register:<register_id> <transaction_id>
```

### POST /transactions/qr/claim
Customer scans QR and claims points. Authenticated (customer).
```json
// Request
{
  "token": "a3f9b2c1-...",
  "customer_entered_amount": 8.23
}

// Response 200
{
  "success": true,
  "points_earned": 82,
  "new_balance": 2840,
  "vendor_name": "Commonplace Coffee",
  "transaction_id": "uuid"
}

// Response 400
{ "error": "QR code expired or already used" }

// Business logic (see QUEUE.md for full detail):
// 1. GET txn:<token> from Redis — fail if missing (expired or used)
// 2. Fetch transaction from Postgres — fail if already claimed
// 3. Verify customer_entered_amount within ±$0.50 of transaction.amount
// 4. Mark transaction claimed in Postgres
// 5. DELETE txn:<token> from Redis
// 6. Award points via points.service.awardPoints()
// 7. Debit vendor pool contribution
```

### POST /transactions/nfc/claim
Customer taps NFC and claims points. Authenticated (customer).
```json
// Request
{
  "vendor_id": "uuid",
  "register_id": "uuid",
  "customer_entered_amount": 8.23,
  "tapped_at": "2025-01-01T12:01:15Z"  // client-reported tap time
}

// Response 200
{
  "success": true,
  "points_earned": 82,
  "new_balance": 2840,
  "vendor_name": "Commonplace Coffee",
  "transaction_id": "uuid"
}

// Response 400
{ "error": "No matching transaction found. Please check your total and try again." }

// Response 409
{ "error": "This transaction has already been claimed." }

// Business logic (see QUEUE.md for full algorithm):
// 1. Query Redis queue for register: LRANGE queue:register:<register_id> 0 -1
// 2. Find closest unclaimed transaction with created_at <= tapped_at
// 3. Verify amount within ±$0.50 tolerance
// 4. Atomic claim with Redis SETNX to prevent race conditions
// 5. Award points
```

### GET /transactions/history
Customer's transaction history. Authenticated (customer).
```
Query params:
  limit: int (default: 20)
  offset: int (default: 0)
```
```json
// Response 200
{
  "transactions": [
    {
      "id": "uuid",
      "vendor_name": "Commonplace Coffee",
      "vendor_logo": "https://...",
      "amount": 8.23,
      "points_earned": 82,
      "claimed_at": "2025-01-01T12:01:30Z"
    }
  ],
  "total": 47
}
```

### GET /transactions/vendor/recent
Vendor's recent check-ins. Authenticated (vendor).
```
Query params:
  limit: int (default: 10)
```
```json
// Response 200
{
  "check_ins": [
    {
      "id": "uuid",
      "display_name": "S***h M.",
      "amount": 8.23,
      "points_issued": 82,
      "register_label": "Register 1",
      "claimed_at": "2025-01-01T12:01:30Z"
    }
  ]
}
```

---

## POINTS

### GET /points/balance
Get authenticated customer's point balance. Authenticated (customer).
```json
// Response 200
{
  "balance": 2840,
  "lifetime_points": 5200,
  "dollar_value": 28.40,
  "next_reward_threshold": 3000,
  "points_to_next": 160
}
```

### GET /points/ledger
Customer's full point history. Authenticated (customer).
```
Query params:
  limit: int (default: 20)
  offset: int (default: 0)
```
```json
// Response 200
{
  "entries": [
    {
      "id": "uuid",
      "delta": 82,
      "balance_after": 2840,
      "note": "Earned at Commonplace Coffee",
      "vendor_name": "Commonplace Coffee",
      "created_at": "2025-01-01T12:01:30Z"
    }
  ],
  "total": 47
}
```

---

## REDEMPTIONS

### GET /redemptions/options
List available redemption options. Authenticated (customer).
```json
// Response 200
{
  "options": [
    {
      "id": "free-coffee",
      "label": "Free coffee",
      "description": "Redeemable at any participating store",
      "points_cost": 500,
      "dollar_value": 5.00,
      "vendor_id": null,
      "available": true
    },
    {
      "id": "5-off",
      "label": "$5 off your next visit",
      "points_cost": 500,
      "dollar_value": 5.00,
      "vendor_id": null,
      "available": true
    },
    {
      "id": "10-reward",
      "label": "$10 reward",
      "points_cost": 1000,
      "dollar_value": 10.00,
      "vendor_id": null,
      "available": false,  // insufficient balance
      "points_needed": 160
    }
  ],
  "current_balance": 2840
}
```

### POST /redemptions/issue
Customer requests a redemption. Authenticated (customer).
```json
// Request
{
  "option_id": "5-off",
  "vendor_id": null  // null = any vendor
}

// Response 201
{
  "redemption_id": "uuid",
  "token": "uuid-v4",
  "qr_data": "pghpass://redeem/uuid-v4",
  "label": "$5 off your next visit",
  "dollar_value": 5.00,
  "points_deducted": 500,
  "new_balance": 2340,
  "expires_at": "2025-01-01T12:11:30Z"  // 10 minutes
}

// Business logic:
// 1. Verify sufficient balance (pessimistic lock on point_balances row)
// 2. Deduct points immediately via ledger entry
// 3. Create redemption record with single-use token
// 4. Store token in Redis with 10min TTL
```

### POST /redemptions/validate
Vendor scans customer redemption QR. Authenticated (vendor).
```json
// Request
{ "token": "uuid-v4" }

// Response 200
{
  "valid": true,
  "redemption_id": "uuid",
  "label": "$5 off your next visit",
  "dollar_value": 5.00,
  "customer_display": "S***h M."
}

// Response 400
{ "error": "Redemption code expired or already used" }
```

### POST /redemptions/:id/confirm
Vendor confirms redemption was applied. Authenticated (vendor).
```json
// Request
{ "redemption_id": "uuid" }

// Response 200
{ "success": true, "payout_queued": 5.00 }

// Business logic:
// 1. Mark redemption as claimed
// 2. Queue vendor payout from pool (processed in nightly batch)
// 3. Log pool debit in pool_ledger
```

---

## FOLLOWS (Phase 2 stub)

### POST /follows/:vendor_id
Follow a vendor. Authenticated (customer).
```json
// Response 201
{ "following": true, "vendor_id": "uuid" }
```

### DELETE /follows/:vendor_id
Unfollow a vendor. Authenticated (customer).
```json
// Response 200
{ "following": false }
```

### GET /follows
Get customer's followed vendors. Authenticated (customer).
```json
// Response 200
{
  "vendors": [
    { "id": "uuid", "name": "Commonplace Coffee", "logo_url": "..." }
  ]
}
```

---

## WEBHOOKS

### POST /webhooks/stripe
Stripe webhook handler. Validates Stripe signature.
```
Events handled:
  invoice.paid              → activate/renew vendor subscription
  invoice.payment_failed    → send vendor warning notification
  customer.subscription.deleted → suspend vendor account
  account.updated           → update vendor Stripe Connect status
```

### POST /webhooks/square (Phase 2)
Square POS transaction webhook.
```json
// Square sends:
{
  "type": "payment.completed",
  "data": {
    "object": {
      "payment": {
        "id": "square_txn_id",
        "amount_money": { "amount": 823, "currency": "USD" },
        "location_id": "square_location_id",
        "device_id": "square_device_id"
      }
    }
  }
}

// Handler:
// 1. Find vendor by square_location_id
// 2. Find register by square_device_id
// 3. Create transaction record
// 4. Push to Redis FIFO queue for that register
```

---

## ADMIN (internal)

### GET /admin/vendors
List all vendors with status. Admin only.

### PATCH /admin/vendors/:id
Update vendor status, plan, or flags. Admin only.

### GET /admin/fraud-flags
List unresolved fraud flags. Admin only.

### POST /admin/fraud-flags/:id/resolve
Resolve a fraud flag. Admin only.

### GET /admin/pool
Get current pool balance and ledger. Admin only.
