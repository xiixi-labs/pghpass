# PGH Pass — System Architecture
Version 1.0 | Phase 1

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                             │
│   ┌──────────────────┐        ┌──────────────────┐         │
│   │   Customer App   │        │   Vendor App     │         │
│   │ React Native     │        │ React Native     │         │
│   │ Expo (iOS+Android│        │ Expo (iOS+Android│         │
│   └────────┬─────────┘        └────────┬─────────┘         │
└────────────┼──────────────────────────┼───────────────────┘
             │ HTTPS / REST + JWT        │
             ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                            │
│                                                             │
│   ┌──────────────────────────────────────────────────┐     │
│   │         Node.js + TypeScript + Fastify           │     │
│   │         Hosted on Railway                        │     │
│   │                                                  │     │
│   │  /auth    /vendors   /transactions   /points     │     │
│   │  /redemptions   /feed   /admin   /webhooks       │     │
│   └──────────────────────────────────────────────────┘     │
└──────────┬──────────────────────┬──────────────────────────┘
           │                      │
     ┌─────▼──────┐        ┌──────▼──────┐
     │ PostgreSQL │        │    Redis    │
     │ Supabase   │        │   Railway   │
     │            │        │             │
     │ Users      │        │ TX Queues   │
     │ Vendors    │        │ QR Tokens   │
     │ Ledger     │        │ Sessions    │
     │ Redemptions│        │ Rate limits │
     └────────────┘        └─────────────┘
           │
     ┌─────▼──────────────────────────────┐
     │         EXTERNAL SERVICES          │
     │                                    │
     │  Twilio Verify   (SMS OTP)         │
     │  Stripe          (subscriptions)   │
     │  Stripe Connect  (pool billing)    │
     │  Expo Push       (notifications)   │
     │  Square API      (Phase 2 POS)     │
     │  Toast API       (Phase 2 POS)     │
     └────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
pgh-pass/
├── apps/
│   ├── customer/          # Customer React Native app (Expo)
│   │   ├── app/           # Expo Router file-based routing
│   │   │   ├── (auth)/    # Unauthenticated screens
│   │   │   ├── (tabs)/    # Main tab navigator
│   │   │   │   ├── index.tsx       # Home feed
│   │   │   │   ├── explore.tsx     # Discovery
│   │   │   │   ├── deals.tsx       # Flash deals
│   │   │   │   └── profile.tsx     # Profile + points
│   │   │   ├── earn/      # NFC + QR earn flow
│   │   │   └── redeem/    # Redemption flow
│   │   ├── components/
│   │   ├── hooks/
│   │   └── assets/
│   │
│   └── vendor/            # Vendor React Native app (Expo)
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx       # Dashboard
│       │   │   ├── qr.tsx          # QR generator
│       │   │   ├── posts.tsx       # Post management (Phase 2)
│       │   │   └── analytics.tsx   # Analytics (Phase 2)
│       │   └── onboarding/
│       ├── components/
│       └── hooks/
│
├── packages/
│   ├── api-client/        # Shared typed API client (axios + zod)
│   ├── types/             # Shared TypeScript types
│   │   ├── user.ts
│   │   ├── vendor.ts
│   │   ├── transaction.ts
│   │   ├── points.ts
│   │   └── api.ts
│   └── ui/                # Shared design tokens + base components
│       ├── tokens.ts      # Colors, typography, spacing
│       └── components/    # Shared atomic components
│
├── server/                # Backend API
│   ├── src/
│   │   ├── index.ts       # Fastify server entry
│   │   ├── plugins/       # Fastify plugins (auth, cors, rate-limit)
│   │   ├── routes/        # Route handlers
│   │   │   ├── auth.ts
│   │   │   ├── vendors.ts
│   │   │   ├── transactions.ts
│   │   │   ├── points.ts
│   │   │   ├── redemptions.ts
│   │   │   └── webhooks.ts
│   │   ├── services/      # Business logic layer
│   │   │   ├── transaction.service.ts
│   │   │   ├── points.service.ts
│   │   │   ├── pool.service.ts
│   │   │   ├── queue.service.ts     # Redis FIFO logic
│   │   │   └── fraud.service.ts
│   │   │   # Note: no auth.service.ts — Clerk handles all auth
│   │   ├── db/
│   │   │   ├── client.ts  # Postgres client (node-postgres)
│   │   │   └── queries/   # Typed SQL queries
│   │   ├── redis/
│   │   │   └── client.ts
│   │   └── lib/
│   │       ├── clerk.ts
│   │       ├── stripe.ts
│   │       └── qr.ts
│   └── package.json
│
├── docs/                  # This folder — spec files
├── package.json           # Workspace root
├── turbo.json             # Turborepo config
└── tsconfig.base.json
```

---

## 3. Technology Decisions

### 3.1 React Native + Expo
- Single codebase for iOS and Android
- Expo managed workflow removes native build complexity for solo dev
- Expo Router for file-based navigation (same mental model as Next.js)
- `expo-local-authentication` for biometric unlock (Phase 2)
- `expo-camera` for QR scanning
- `expo-notifications` for push notifications
- NFC: `react-native-nfc-manager` (requires bare workflow or Expo dev build)

### 3.2 Node.js + TypeScript + Fastify
- Fastify chosen over Express for significantly better performance (~2× throughput)
- First-class TypeScript support via `@fastify/type-provider-typebox`
- Schema validation on every route using TypeBox (fast JSON schema)
- Shared TypeScript types between server and mobile apps via monorepo packages
- `@fastify/jwt` for JWT handling
- `@fastify/rate-limit` for rate limiting (backed by Redis)
- `@fastify/cors` for CORS

### 3.3 PostgreSQL (Supabase)
- Primary data store for all persistent data
- Supabase chosen for managed Postgres + great dashboard + built-in row-level security
- `node-postgres` (pg) for database client — not an ORM, raw typed SQL queries
- Rationale for no ORM: transaction matching logic is complex SQL that benefits from being explicit. An ORM adds abstraction overhead where precision is needed.
- Connection pooling via PgBouncer (built into Supabase)

### 3.4 Redis (Railway)
- Per-register transaction queues (FIFO lists)
- QR token storage with TTL (90 second auto-expiry)
- JWT refresh token blacklist
- API rate limiting counters
- Session data
- `ioredis` client

### 3.5 Stripe
- `stripe` npm package (server-side only — never expose secret key to client)
- Stripe Subscriptions for vendor monthly billing
- Stripe Connect (Express accounts) for pool contribution collection
- Webhook endpoint: `/webhooks/stripe` — validates signature before processing
- Events handled: `invoice.paid`, `invoice.payment_failed`, `account.updated`

### 3.6 Clerk (Authentication — replaces Twilio)
- Handles phone number OTP, session management, JWT issuance, and token refresh out of the box
- `@clerk/clerk-expo` SDK for React Native — drops directly into Expo managed workflow
- `@clerk/fastify` plugin for backend — verifies Clerk JWTs on every protected route
- Built-in rate limiting on OTP attempts, brute force protection, and session revocation
- Clerk dashboard provides user management, session visibility, and audit logs
- Rationale over Twilio: Twilio only handles SMS delivery — you'd build all JWT/session logic manually. Clerk handles the entire auth layer. Cuts auth build time from ~2 weeks to ~2 days.
- No custom OTP tables, refresh token storage, or JWT signing code needed — Clerk owns all of this.

---

## 4. Authentication Flow (Clerk)

```
Customer/Vendor App                    Clerk                    Backend API
        │                               │                            │
        │── ClerkProvider wraps app ────▶│                            │
        │                               │                            │
        │── useSignIn().signIn({         │                            │
        │    strategy: 'phone_code',     │                            │
        │    phoneNumber: '+14121234567' │── Send OTP SMS ────────────│
        │   })                          │                            │
        │                               │                            │
        │── attemptFirstFactor({         │                            │
        │    strategy: 'phone_code',     │                            │
        │    code: '123456'             │── Verify OTP ──────────────│
        │   })                          │                            │
        │◀─ Clerk session token ─────── │                            │
        │                               │                            │
        │── All API requests ────────────────────────────────────────▶│
        │   Authorization: Bearer <Clerk session token>              │
        │                               │        Verify with Clerk SDK│
        │◀─ API response ────────────────────────────────────────────│
```

- Session tokens: issued and rotated by Clerk automatically
- Backend verification: `@clerk/fastify` plugin verifies token on every request
- User ID: `req.auth.userId` available in every route handler after verification
- No custom JWT secrets, refresh token tables, or OTP storage needed
- Logout: call `clerk.signOut()` on client — Clerk revokes session server-side

---

## 5. Environment Variables

```bash
# Server
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Apps (public — safe to expose)
EXPO_PUBLIC_API_URL=https://api.pghpass.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 6. Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| API server | Railway | Auto-deploy on push to main |
| Redis | Railway | Managed Redis instance |
| PostgreSQL | Supabase | Free tier to start, Pro when needed |
| Customer app | Expo EAS | Build + submit to App Store / Play Store |
| Vendor app | Expo EAS | Separate app, same EAS project |
| Domain | Cloudflare | `pghpass.app` — DNS + SSL |

---

## 7. Security Considerations

- All secrets in environment variables — never in code
- QR tokens are UUID v4 (unpredictable), stored in Redis with 90s TTL
- Redemption tokens are UUID v4, stored in Postgres with 10min TTL
- Rate limiting on all auth endpoints: 5 requests per phone per 15 minutes
- Stripe webhook signature verification on every webhook call
- Phone numbers stored in E.164 format, normalized on input
- No raw SQL string interpolation — parameterized queries only
- Vendor-facing customer data always anonymized (display_name generated column)
- HTTPS enforced everywhere — HTTP redirects to HTTPS at Cloudflare
