# PGH Pass — Product Specification
Version 1.0 | Phase 1 (Loyalty Engine)

---

## 1. Product Overview

PGH Pass is a Pittsburgh-specific loyalty and local business social platform. Residents earn points at participating local businesses, redeem them across the network, and follow their favorite shops for deals and updates. Businesses pay a monthly subscription plus a small per-transaction pool contribution in exchange for customer analytics, network exposure, and a promotional tools dashboard. The city and related agencies purchase anonymized neighborhood spending data via a separate data license.

The product has two distinct apps built from a shared React Native + Expo codebase:
- **Customer App** — for Pittsburgh residents
- **Vendor App** — for participating businesses

---

## 2. Build Phases

### Phase 1 — Loyalty Engine (Months 1–3) ← BUILD THIS FIRST
- Phone number authentication via **Clerk** (replaces Twilio — handles OTP, sessions, JWTs)
- Vendor onboarding and profile setup
- QR code transaction flow with **ATM-style numpad** (decimal-locked, right-to-left entry)
- NFC tap transaction flow (per-register)
- FIFO transaction queue and matching logic
- Points issuance and balance tracking
- Redemption flow
- Vendor dashboard (stats, check-ins, QR generation)
- Vendor display: **dedicated Android tablet (Amazon Fire 7) in kiosk mode**
- Stripe subscription billing for vendors
- Stripe Connect pool contribution (2% per transaction)

### Phase 2 — Social Layer (Months 4–6)
- Business posts and deal cards feed
- Flash deals with countdown timers and bonus point multipliers
- Follow/unfollow stores
- Discovery feed (location-aware, nearby businesses)
- Push notifications (Expo Push + FCM/APNs)
- Vendor post analytics

### Phase 3 — Platform (Months 7–12)
- Algorithmic feed ranking
- Promoted posts (paid vendor upsell)
- City data dashboard and API
- Neighborhood feeds
- Premium resident subscription tier
- Cross-vendor deal bundles
- Square and Toast POS webhook integrations

---

## 3. User Roles

| Role | Description |
|------|-------------|
| `customer` | Pittsburgh resident. Earns and redeems points. |
| `vendor` | Business owner. Pays subscription. Issues points. Posts deals. |
| `admin` | App owner. Full access. Manages vendors, reviews fraud flags. |
| `city` | Government/agency read-only data license access. |

---

## 4. Customer App — User Flows

### 4.1 Onboarding
1. Download app
2. Enter phone number
3. Receive SMS OTP via Twilio
4. Verify OTP → account created
5. Enter first name, last name
6. Optional: enable location for discovery feed
7. Home screen

### 4.2 Earning Points (QR Flow)
1. Customer pays at vendor register (existing POS — cash, card, etc.)
2. Vendor opens PGH Pass vendor app on dedicated **Amazon Fire 7 tablet** in kiosk mode
3. Vendor enters transaction total using **ATM-style decimal-locked numpad**
   - Digits enter right-to-left: pressing 1→0→6→9 builds $0.01→$0.10→$1.06→$10.69
   - Impossible to enter $1069 accidentally — decimal point is always fixed at 2 places
   - Confirmation screen shows "$10.69 — 106 points" before generating QR
4. Vendor taps "Confirm & Generate QR"
5. Backend creates transaction record, generates single-use token, renders QR full-screen on tablet
6. Customer opens PGH Pass app → taps scan icon
7. Customer scans QR code displayed on tablet
8. App sends token + customer account ID to backend
9. Backend validates: token exists, not expired (90 seconds), not already claimed
10. On valid: awards points, marks transaction claimed, notifies both parties
11. Customer sees confirmation: "X points earned at [Vendor]"
12. Tablet returns to QR generator home screen automatically

### 4.3 Earning Points (NFC Flow)
1. Customer pays at register
2. Customer taps phone to NFC stand at that register
3. NFC chip opens app to: `pghpass.app/checkin?vendor=ID&register=REG_ID`
4. App shows vendor name and register number
5. Customer enters bill total
6. Backend finds closest unclaimed transaction on that register before tap timestamp (FIFO queue)
7. Verifies entered amount matches transaction within ±$0.50 tolerance
8. On match: awards points, marks transaction claimed
9. Customer sees confirmation

### 4.4 Redeeming Points
1. Customer opens "My Points" screen
2. Views available redemption options
3. Selects a reward (e.g. "$5 off — 500 pts")
4. App generates a single-use redemption QR code
5. Customer shows QR to vendor at checkout
6. Vendor scans QR in vendor app
7. Backend validates redemption: sufficient balance, code not used
8. Deducts points, reimburses vendor from pool
9. Both parties see confirmation

### 4.5 Browsing Feed (Phase 2)
1. Home screen shows balance card + flash deals + followed store posts
2. Explore screen shows discovery feed (nearby, neighborhood-sorted)
3. Tap a business → business profile page → follow button
4. Flash deal card shows countdown timer, bonus multiplier, claim CTA
5. Tapping "Claim" initiates in-store earn flow

---

## 5. Vendor App — User Flows

### 5.1 Vendor Onboarding
1. Business owner downloads vendor app OR accesses web dashboard
2. Signs in via **Clerk** — phone number OTP
3. Enters business details: name, address, neighborhood, category, hours
4. Connects Stripe account (for pool contributions and subscription billing)
5. Chooses subscription plan (Basic $49/mo, Pro $99/mo, Premium $149/mo)
6. **Pro and Premium plans include a dedicated Amazon Fire 7 tablet + counter stand**
   - Tablet is pre-configured with PGH Pass vendor app in Android kiosk mode
   - Ships within 5 business days of onboarding
   - Staff cannot exit the app — device is locked to PGH Pass only
7. Basic plan vendors use their own phone or existing iPad
8. Dashboard unlocked immediately — tablet arrives within a week

### 5.2 Generating QR at Checkout
1. Vendor opens app → taps "Generate QR"
2. Enters transaction total on numpad
3. Taps "Generate" → QR appears full screen
4. Customer scans
5. Vendor sees real-time check-in notification in dashboard

### 5.3 Viewing Dashboard
- Today's visits count + delta vs yesterday
- Follower count + weekly change
- PGH Pass-attributed sales total
- Points issued this month
- Live check-in feed (anonymized: "S***h M. · $8.23 · 2 min ago · Reg 1")
- Monthly analytics chart (Phase 2)

### 5.4 Creating a Post (Phase 2)
1. Vendor taps "New Post"
2. Selects type: Update / Deal / Flash
3. Adds photo (optional), caption, expiry (for flash)
4. Selects bonus point multiplier (1×, 2×, 3×) — 2× and 3× incur additional pool contribution
5. Taps "Post to PGH Pass Feed"
6. Post appears in followers' feeds + discovery feed

---

## 6. Business Rules

### Points
- Earn rate: $1 spent = 10 points
- Redemption: 500 points = $5 reward
- Effective reward rate: 10% of spend
- Flash deal multiplier: 2× or 3× points — funded by vendor promotional budget
- Points expiry: 12 months of account inactivity
- Minimum redemption: 500 points

### Pool Contributions
- Standard contribution: 2% of transaction value
- Flash 2× deal: 4% contribution (vendor pays extra)
- Flash 3× deal: 6% contribution (vendor pays extra)
- Contributions billed monthly via Stripe Connect
- Pool held by PGH Pass LLC

### Fraud Prevention
- QR codes: single-use, expire in 90 seconds
- NFC: one claim per register per customer per transaction window
- Amount tolerance: ±$0.50 to account for tax rounding
- Failed match rate: 3+ failures in 7 days triggers account review
- Velocity cap: max 5 point-earning transactions per customer per vendor per day
- Vendor anomaly detection: flag if point issuance exceeds 150% of expected volume for their category

### Redemptions
- Redemption QR codes: single-use, expire in 10 minutes
- Vendor reimbursed from pool within 24 hours (batch process)
- Customer balance deducted immediately on scan
- Refund policy: if purchase refunded within 48 hours, points reversed

---

## 7. Subscription Tiers (Vendor)

| Plan | Price | Features |
|------|-------|----------|
| Basic | $49/mo | 1 register, QR flow, basic dashboard |
| Pro | $99/mo | Up to 3 registers, NFC support, full analytics, posts (Phase 2) |
| Premium | $149/mo | Unlimited registers, promoted placement, flash deals, priority support |

---

## 8. Non-Functional Requirements

- API response time: < 200ms for transaction claims (Redis-backed)
- QR token validation: < 50ms
- Uptime target: 99.9%
- All customer PII anonymized in vendor-facing views
- No individual user data sold or shared — aggregate only
- HTTPS everywhere, JWT auth with refresh tokens
- Phone number is the unique identifier — one account per number
