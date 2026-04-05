# PGH Pass — Claude Code Handoff
Paste this entire prompt when you first open Claude Code in your project folder.

---

I'm building **PGH Pass** — a Pittsburgh-focused local loyalty and social feed app.
All technical decisions have already been made. Please read every file in the `/docs`
folder before writing any code. The docs are the source of truth for all architecture,
schema, API design, and business logic decisions.

## Docs to read (in this order)
1. `docs/SPEC.md` — full product spec, user flows, business rules, phases
2. `docs/ARCHITECTURE.md` — monorepo structure, stack decisions, Clerk auth setup
3. `docs/SCHEMA.sql` — complete PostgreSQL schema, run this against Supabase
4. `docs/API.md` — every endpoint with request/response shapes and business logic
5. `docs/POINTS.md` — point system rules, pool mechanics, TypeScript implementations
6. `docs/QUEUE.md` — Redis FIFO transaction queue algorithm (NFC + QR matching)
7. `docs/DESIGN.md` — full design system, tokens, components, ATM numpad, tablet kiosk

## Tech stack (do not deviate)
- **Mobile:** React Native + Expo (managed workflow), Expo Router, TypeScript
- **Backend:** Node.js + TypeScript + Fastify
- **Database:** PostgreSQL via Supabase (node-postgres, no ORM)
- **Queue/cache:** Redis via Railway (ioredis)
- **Auth:** Clerk (`@clerk/clerk-expo` + `@clerk/fastify`) — no custom auth code
- **Payments:** Stripe Subscriptions + Stripe Connect
- **Monorepo:** Turborepo
- **Hosting:** Railway (API + Redis), Supabase (Postgres), Expo EAS (apps)

## What to build (Phase 1 only)
Do NOT build the social feed, posts, flash deals, or discovery features yet.
Phase 1 is the loyalty engine only:

1. Monorepo scaffold (apps/customer, apps/vendor, server/, packages/types, packages/ui)
2. Supabase: run SCHEMA.sql to create all tables
3. Backend: Fastify server with Clerk JWT verification, all Phase 1 API routes
4. Customer app: onboarding (Clerk phone OTP), home screen (balance), QR scanner, points/redeem screens
5. Vendor app: onboarding (Clerk), ATM-style numpad QR generator, dashboard, check-in feed
6. Redis FIFO queue logic (see QUEUE.md — this is the most critical piece)
7. Points ledger and balance sync (see POINTS.md)
8. Stripe subscription billing for vendors

## Critical implementation notes

### Clerk auth
- Use `@clerk/clerk-expo` on mobile — wrap both apps in `<ClerkProvider>`
- Use `@clerk/fastify` on backend — register plugin, use `getAuth(req)` in routes
- After Clerk sign-in, call `POST /auth/sync` to upsert user into your `users` table
- All protected routes: check `getAuth(request).userId` — return 401 if null

### ATM numpad (vendor QR generator — read DESIGN.md section 9)
- Store amount as integer cents internally — NEVER use floats for money
- Digits enter right-to-left: pressing 1→0→6→9 = $10.69, not $1069
- Maximum amount: $999.99 (99999 cents)
- Show confirmation screen (amount + points) before calling the generate endpoint
- Convert cents to decimal only at the API boundary: cents / 100

### Redis transaction queue (read QUEUE.md — entire file)
- Per-register FIFO list: `queue:register:{register_id}`
- QR tokens: `txn:{token}` with 90s TTL
- NFC claim lock: `claim:lock:{transaction_id}` with SET NX EX 5
- Velocity counters: `velocity:{user_id}:{vendor_id}:{date}`
- The NFC matching algorithm in QUEUE.md must be implemented exactly as specified

### Points ledger (read POINTS.md)
- Append-only — never update or delete ledger rows
- Always use database transactions when writing to point_ledger
- point_balances table is synced via Postgres trigger (already in SCHEMA.sql)
- Round points DOWN: Math.floor(amount * 10)

### Tablet vendor app
- The vendor app must support a "kiosk mode" layout for tablets
- Detect if running on tablet: screen width > 600px
- Tablet layout: QR fills center of screen, amount shown large above it
- After successful scan: show success state for 3 seconds, then return to numpad

## Start here
Scaffold the monorepo first:

```bash
npx create-turbo@latest pgh-pass
cd pgh-pass
```

Then set up:
1. `packages/types` — shared TypeScript interfaces from SCHEMA.sql table structures
2. `server/` — Fastify app with Clerk plugin, database connection, Redis connection
3. `apps/vendor/` — Expo app with Clerk, ATM numpad screen first
4. `apps/customer/` — Expo app with Clerk, home screen + QR scanner

Ask me before making any decisions not covered in the docs.
