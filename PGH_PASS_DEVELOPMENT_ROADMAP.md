# PGH Pass — Development Roadmap & Audit

*Generated March 26, 2026*

---

## Executive Summary

PGH Pass is a well-architected loyalty rewards platform for Pittsburgh local businesses, built as a Turborepo monorepo with React Native/Expo apps (customer + vendor), a Fastify API server, PostgreSQL via Supabase, and Redis for real-time transaction processing. The codebase is approximately 60–70% feature-complete for a Phase 1 launch, with strong foundations in transaction safety, authentication, and design system consistency.

This document covers three areas: a prioritized development roadmap, a detailed UI/UX audit, and a comprehensive server/data-layer audit. It is organized to be actionable — each section ends with specific code-level recommendations.

---

## Part 1: Prioritized Development Roadmap

### Phase 0 — Critical Fixes (Before Any New Features)

These are bugs or security gaps that should be addressed immediately.

**1. Feed Routes Missing Authentication (CRITICAL)**
All feed endpoints (`/feed/discover`, `/feed/following`, all `/posts/*` routes) have no `preHandler` auth check. They fall back to a hardcoded `dev-customer-1` userId. In production, unauthenticated users could access, create, like, and bookmark posts.

Fix: Add `preHandler: [requireAuth]` to every route in `feed.ts`.

**2. Missing Database Tables (CRITICAL)**
The `post_comments`, `bookmarks`, and `stripe_onboarding_complete` column are used in application code but not defined in `SCHEMA.sql`. Deploying to a real Postgres instance will throw errors.

Fix: Add CREATE TABLE statements for `post_comments` and `bookmarks`, and an ALTER TABLE for `stripe_onboarding_complete` on vendors.

**3. Pool Negative Balance Bug (HIGH)**
In `redemption.service.ts`, when confirming a redemption payout, there is no check that the pool balance is sufficient. If `newPoolBalance` goes negative, the UPDATE proceeds without error.

Fix: Add a guard `if (newPoolBalance < 0) throw new Error('Pool insufficient for redemption')` before the UPDATE.

**4. Vendor Slug Collision (MEDIUM)**
Two vendors with the same name produce the same slug, causing a unique constraint violation with no graceful error handling.

Fix: Add a suffix incrementer (`coffee`, `coffee-2`, `coffee-3`) or catch the conflict and retry.

**5. Hardcoded Color in Earn Screen (LOW)**
`/apps/customer/app/earn/index.tsx` line 262 uses `#2A7A4B` instead of `colors.success` (`#1A8F4B`). Small inconsistency, easy fix.

---

### Phase 1 — MVP Completion (Weeks 1–4)

Goal: Everything needed for a soft launch with 5–10 pilot businesses.

**Sprint 1 (Week 1–2): Wire Up the Feed & Posts System**

The feed UI exists on the customer side, and the post creation form exists on the vendor side, but the database integration is incomplete. Close this loop:

- Connect vendor post creation form to `POST /posts` endpoint with full validation
- Implement photo upload for posts (Expo ImagePicker → S3/Supabase Storage → URL in post record)
- Wire flash deal expiry logic (server-side scheduled check + client-side countdown)
- Add post detail view with comments
- Implement the `post_comments` table and CRUD endpoints

**Sprint 2 (Week 3–4): Vendor Analytics & Dashboard Data**

This is the feature that will convince businesses to participate. The analytics page currently shows hardcoded mock data.

- Wire `/vendors/me/analytics` endpoint returning: daily/weekly check-in counts, unique vs. repeat customer ratios, revenue attributed through PGH Pass, points issued over time, top-performing posts by engagement
- Connect analytics.tsx to real API data
- Add date range selector (7d / 30d / 90d)
- Implement trend calculations (% change vs. prior period)
- Add a simple bar/line chart library (Victory Native or react-native-chart-kit)

---

### Phase 2 — Engagement & Retention (Weeks 5–8)

Goal: Features that keep customers opening the app and businesses seeing value.

**Push Notifications**

Currently absent entirely. This is the #1 engagement lever for a loyalty app.

- Set up Expo Push Notifications service
- Notification triggers: flash deal from followed vendor, points milestone reached (100, 500, 1000), redemption available, weekly summary ("You earned X points this week")
- Server-side: Add `expo_push_token` to users table, create notification service, add notification preferences endpoint
- Client-side: Permission request flow, notification center screen

**Customer Onboarding Flow**

New users currently land on the sign-in screen with no context about what PGH Pass is.

- 3–4 onboarding screens: value prop, how earning works, how redeeming works, neighborhood/cuisine preference picker
- Store onboarding completion flag to skip on subsequent opens
- Use preferences to personalize the feed's initial state

**Profile Enhancements**

Both customer and vendor profiles are minimal.

- Customer: Edit display name, avatar upload, favorite neighborhoods, notification preferences, transaction history detail view
- Vendor: Edit business description, hours, photos, category tags, manage team members/registers

---

### Phase 3 — Growth & Monetization (Weeks 9–12)

Goal: Revenue model live, features that drive network effects.

**Vendor Subscription Management**

Stripe Connect is scaffolded but incomplete. Needed:

- Tiered plans: Free (basic listing, 5 posts/month), Pro ($29/mo: unlimited posts, analytics, flash deals, featured placement), Premium ($79/mo: everything + custom redemption tiers, priority support)
- Billing portal integration via Stripe Customer Portal
- Subscription status enforcement (gate Pro features behind plan check)
- Trial period handling (14-day free trial of Pro)

**Neighborhood Discovery & Map**

- Map view of nearby vendors using Expo MapView
- Filter by category, distance, current deals
- "Trending in [Neighborhood]" sections on home screen
- Geofence-based notifications ("You're near Steel City Coffee — they have a 2x points deal right now")

**Referral System**

- Customer referral codes (refer a friend, both get bonus points)
- Vendor referral (existing vendor refers a new business, gets month free)
- Referral tracking dashboard

---

### Phase 4 — Scale & Differentiation (Weeks 13+)

**NFC Tap-to-Earn**

Backend FIFO queue logic is already implemented. Remaining:

- Integrate `react-native-nfc-manager` for native NFC reading
- NFC tag provisioning flow for vendors (program tags with register ID)
- Fallback to QR if device doesn't support NFC

**POS Integration**

- Square SDK integration for automatic transaction detection
- Toast integration for restaurants
- Clover integration
- Auto-earn without manual QR scanning

**Admin Dashboard**

- Web-based admin panel (Next.js or similar)
- Vendor approval/suspension workflow
- System-wide analytics (total transactions, active users, pool balance)
- Content moderation for posts

**City Partnership Features**

- City-sponsored promotions ("Pittsburgh Restaurant Week" with bonus multipliers)
- Aggregate economic impact reporting for city officials
- API for city partners to sponsor point bonuses

---

## Part 2: UI/UX Audit

### Overall Design Assessment: 7.8/10

The design system is strong — the navy/gold palette with warm neutrals creates a premium feel appropriate for a city-pride brand. Typography choices (Inter + Instrument Serif) are distinctive and well-paired. The dark hero cards on both apps create a consistent brand moment. The main areas for improvement are spacing consistency, interaction polish, and accessibility.

### Design Token System: 9/10

**Strengths:**

- 40+ color tokens with clear naming (brand, neutral, semantic, surface, glass)
- Comprehensive type scale from display (52px) down to micro (8px)
- 8px grid spacing system
- Platform-aware shadow definitions
- Serif + sans font pairing adds personality

**Issue: Spacing Token Not Applied Consistently**

Both apps use `paddingHorizontal: 24` throughout, but the design token `screenPadding` is set to `18`. This creates a 33% deviation from the intended spacing system. Every screen in both apps should be audited and updated to use the `screenPadding` token.

### Component Library: 8/10

Six well-designed shared components (Button, Card, Input, ListRow, SectionHeader, Tag) with proper variant systems and platform awareness.

**Missing components that would reduce duplication:**

- SkeletonLoader — Both apps need loading states; currently using basic ActivityIndicators
- EmptyState — Pattern is repeated across screens with slight variations; should be standardized
- StatCard — Used on both dashboards; currently inline
- AvatarCircle — Repeated pattern for user/vendor avatars
- ProgressBar — Used in multiple places with different implementations

**Accessibility gaps:**

- No focus ring styles for web keyboard navigation
- Buttons lack explicit focus states
- No ARIA attributes on custom components
- Some secondary text (ink3 on white) barely meets WCAG AA contrast at 4.5:1

### Screen-by-Screen Analysis

**Customer Home Screen**

Layout hierarchy is strong: greeting → hero balance → quick actions → activity feed. The hero card with large serif numerals and progress bar is the standout element. The quick action grid (Scan, Redeem, Explore, Deals) provides clear navigation.

Recommendations: Add skeleton loading for the hero card and activity list. The progress bar could show the next reward threshold more prominently. Consider adding a "streak" indicator (consecutive weeks visiting) as a retention mechanic.

**Customer Explore/Feed Screen**

Well-implemented social feed with discover/following tabs and animated underline indicator. Post cards include vendor info, cover photo, badges (FLASH, DEAL, multiplier), caption, and action bar (like, comment, share, bookmark).

Recommendations: Cover photo opacity (0.75) could be bumped to 0.85 for better visibility. The badge system is visually strong but could benefit from consistent sizing. Add pull-to-load-more pagination. Consider adding a "stories" row at the top for time-sensitive flash deals.

**Customer Earn Flow**

Three-step flow: camera permission → QR scan → amount entry → success. The scan overlay is clean with dark background and white frame.

Recommendations: The success screen needs more celebration — this is the key reward moment. Add confetti animation (react-native-confetti-cannon), haptic feedback (Expo Haptics), and an animated counter for points earned. Add an error state UI for failed scans (currently just alerts). The amount entry ring design is creative but could feel more tactile with subtle shadow depth.

**Customer Redeem Flow**

Balance display → reward options → QR code generation for vendor scan. Clean and functional.

Recommendations: The progress bar at 2px height is too thin for mobile. Increase to 4–6px. Reward options could show visual previews (what the reward is). Add a "history" tab showing past redemptions. Consider adding a satisfaction animation when a redemption is claimed.

**Vendor Dashboard**

Hero card with visit count, mini-stats (followers, revenue, points issued), QR generation CTA, recent check-ins list.

Recommendations: The "See all" links are not yet functional — wire them up. Add sparkline trend indicators to each stat card. Consider adding a daily/weekly goal meter ("12 more check-ins to beat last week"). The recent check-ins list could show customer avatars for a more personal feel.

**Vendor QR Generator**

Three-state flow: numpad → confirm → QR display with countdown. This is one of the best-designed screens in the app. The dark-themed numpad with large amount display is clean and functional. The countdown timer with color-coded urgency (gray → gold → red) is excellent UX.

Recommendations: Add haptic feedback on numpad key presses. Consider showing a small success indicator when a customer scans the code. The 90-second timeout is good but should show a "Regenerate" option when expired rather than requiring "New Transaction."

**Vendor Analytics**

Currently scaffolded with mock data. Four stat cards in a 2-column grid, bar chart, top posts list.

Recommendations: This screen needs the most work of any screen in the app. Prioritize: real data connection, interactive chart with drill-down, date range selector, comparative metrics (vs. last period), and export functionality. Consider adding a "insights" section with AI-generated observations ("Your flash deals drive 3x more check-ins than regular posts").

**Vendor Posts Management**

List view with type badges and stats, plus a creation form with type selector (update/deal/flash), caption input, and conditional options for deals.

Recommendations: Photo upload is placeholder only — implement it. Add post preview before publishing. Add post editing and deletion. Show engagement metrics more prominently on the list view. Consider adding post scheduling for planned promotions.

### Cross-App Consistency: Strong

Both apps share the same tab bar styling, hero card treatment, button variants, and icon set (Feather). The visual language is cohesive. The vendor app feels like a natural "admin" companion to the customer experience.

### Recommended Design Improvements (Priority Order)

1. Replace ActivityIndicator loading states with skeleton screens across all data-fetching screens
2. Upgrade the earn success screen with confetti, haptics, and animated counter
3. Standardize screen padding to use the `screenPadding` token (18px)
4. Extract repeated patterns (StatCard, EmptyState, AvatarCircle) into shared components
5. Add focus states and ARIA attributes for web accessibility
6. Increase progress bar heights from 2px to 4–6px
7. Add page transition animations between screens
8. Consider replacing Feather icons with a custom icon set or SF Symbols for a more distinctive feel
9. Add pull-to-load-more pagination on feed screens
10. Implement a dark mode option (the design tokens are well-positioned for this — add a dark variant of each surface/text color)

---

## Part 3: Server & Data Layer Audit

### Security Assessment

**SQL Injection: SAFE.** All database queries use parameterized statements with `$1, $2` placeholders. No string interpolation in Redis keys. No raw SQL concatenation.

**Authentication: GOOD with one critical gap.** Clerk integration is properly configured. The `requireAuth` preHandler and `requireRole()` factory work correctly. However, as noted above, all feed routes bypass authentication entirely — this is the single most important security fix.

**Rate Limiting: WEAK.** Only a global 100 requests/minute limit exists. No per-endpoint or per-user rate limiting. Sensitive endpoints like `/redemptions/issue` and `/transactions/qr/generate` should have stricter limits. The fraud service checks velocity at the service layer (5 transactions per vendor per day), but this should also be enforced at the API layer.

**Input Validation: GOOD with gaps.** TypeBox schemas cover most endpoints. Amount validation is solid (0.01–999.99 range). Missing: max-length on vendor label and post caption fields, geographic coordinate range validation (lat -90 to 90, lng -180 to 180), and max-length on search query strings.

**Token Management: GOOD.** QR tokens use 90-second Redis TTL. Redemption tokens use 10-minute TTL. Atomic deletion before Postgres update prevents double-claims.

**Stripe Integration: GOOD.** Webhook signature verification is properly implemented. Minor concern: subscription metadata from Stripe isn't validated against the plan enum before being written to the database.

### Database Schema Analysis

**Schema design is excellent.** Append-only ledgers (point_ledger, pool_ledger) are the right pattern for financial data. Generated columns, triggers for `updated_at`, and comprehensive indexes show good database engineering. Enum types prevent invalid statuses.

**Schema-code drift issues:**

- `post_comments` table: Used in feed.ts but not defined in SCHEMA.sql
- `bookmarks` table: Used in feed.ts but not defined in SCHEMA.sql
- `stripe_onboarding_complete` column: Used in stripe.service.ts but not in schema
- `subscription_status` column: Used in code but not in schema (schema has `subscription_start`/`subscription_end` instead, which are unused)
- `post_likes` table: Missing `created_at` column that may be needed for analytics

**Missing database-level constraints:**

- No `CHECK (amount > 0)` on transactions table (app-level validation exists but defense-in-depth is better)
- No max-length enforcement matching application validation

### Concurrency & Race Conditions

**Double-claim prevention: EXCELLENT.** QR flow deletes the Redis token before updating Postgres, ensuring exactly-once semantics. NFC flow uses `SET...NX` for atomic locking with 5-second auto-expiry. Point balance updates use `FOR UPDATE` pessimistic locking inside transactions.

**One edge case: concurrent redemptions can overdraw the pool.** The pool balance is locked with `FOR UPDATE`, but there's no check that `newPoolBalance >= 0` before the UPDATE. Two simultaneous redemptions could both pass the read check and drive the balance negative.

### Error Handling

Centralized error handler with custom `AppError` class and proper HTTP status codes. No stack traces leak to clients. One area for improvement: error logging lacks request context (method, path, userId) which makes debugging production issues harder.

### Performance

No N+1 query issues found. Vendor stats use `Promise.all()` for parallel queries. Redis operations are efficient (LPUSH/LRANGE/LREM for FIFO, INCR for atomic counters). Connection pooling is properly configured (Postgres max: 20, Redis lazyConnect).

Potential optimization: Add a composite index on `(vendor_id, created_at)` for the posts table to speed up feed queries.

### Testing

**No test files exist.** No `.test.ts`, `.spec.ts`, `__tests__` directories, no test runner configuration, no test dependencies. This is the most significant gap for production readiness.

Priority test areas: QR double-claim race conditions, NFC FIFO matching with concurrent taps, point balance concurrent updates, pool negative balance prevention, velocity limit enforcement, and redemption expiry.

Recommended setup: Vitest + Supertest for API integration tests, with the existing DEV_MODE mock data as test fixtures.

### Missing Endpoints

- No user profile update endpoint (`PATCH /users/me`)
- No vendor deactivation/suspension endpoint
- No points expiry scheduled job (schema notes 12-month inactivity expiry but no implementation)
- No vendor search by category (only name and neighborhood currently)
- No notification registration or delivery endpoints

---

## Appendix: Quick-Reference Fix List

### Immediate Fixes (Can Be Done Today)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | server/src/routes/feed.ts | No auth on any route | Add `preHandler: [requireAuth]` to all routes |
| 2 | apps/customer/app/earn/index.tsx:262 | Hardcoded `#2A7A4B` | Change to `colors.success` |
| 3 | Both apps, all screens | `paddingHorizontal: 24` | Change to `spacing.screenPadding` (18) |
| 4 | server/src/services/redemption.service.ts | No negative balance check | Add guard before pool UPDATE |
| 5 | docs/SCHEMA.sql | Missing tables | Add post_comments, bookmarks, stripe columns |

### Short-Term Fixes (This Sprint)

| # | Area | Issue | Fix |
|---|------|-------|-----|
| 6 | server/routes/vendors.ts | Slug collision | Add suffix incrementer or conflict handler |
| 7 | server/db/queries/users.ts | Phone duplicate conflict | Handle UNIQUE violation on phone column |
| 8 | server/plugins/rate-limit.ts | Global-only limits | Add per-endpoint limits on sensitive routes |
| 9 | server/routes/* | Missing input max-lengths | Add maxLength to caption, label, search query schemas |
| 10 | server/routes/vendors.ts | No geo coordinate validation | Add min/max bounds on lat/lng |

### Medium-Term Improvements (Next 2 Sprints)

| # | Area | Improvement |
|---|------|-------------|
| 11 | packages/ui | Extract SkeletonLoader, EmptyState, StatCard, AvatarCircle components |
| 12 | Both apps | Replace ActivityIndicator with skeleton screens |
| 13 | Customer earn flow | Add confetti + haptics + animated counter on success |
| 14 | Server | Add Vitest + Supertest test suite for critical transaction flows |
| 15 | Server | Add structured logging with request context |
| 16 | Server | Add points expiry scheduled job |
| 17 | Both apps | Add push notification infrastructure |
| 18 | Customer app | Add onboarding flow for new users |
| 19 | Vendor app | Wire analytics to real data |
| 20 | Both apps | Add web accessibility (focus states, ARIA) |
