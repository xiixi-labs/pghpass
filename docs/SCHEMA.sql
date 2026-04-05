-- PGH Pass — PostgreSQL Database Schema
-- Version 1.0 | Phase 1 (Loyalty Engine)
-- Run in order. Uses UUID primary keys throughout.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin', 'city');
CREATE TYPE vendor_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'premium');
CREATE TYPE transaction_source AS ENUM ('qr', 'nfc', 'square', 'toast', 'manual');
CREATE TYPE transaction_status AS ENUM ('pending', 'claimed', 'expired', 'voided');
CREATE TYPE redemption_status AS ENUM ('issued', 'claimed', 'expired', 'reversed');
CREATE TYPE pool_entry_type AS ENUM ('contribution', 'redemption_payout', 'breakage', 'refund_reversal');
CREATE TYPE fraud_flag_type AS ENUM ('velocity', 'amount_mismatch', 'vendor_anomaly', 'multi_account');
CREATE TYPE post_type AS ENUM ('update', 'deal', 'flash');

-- ============================================================
-- USERS
-- ============================================================
-- Note: Authentication is handled entirely by Clerk.
-- clerk_id is the link between Clerk's user record and your database.
-- No OTP tables, refresh token tables, or password fields needed.
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id          VARCHAR(100) UNIQUE NOT NULL, -- Clerk user ID (user_xxxx)
  phone             VARCHAR(20) UNIQUE NOT NULL,
  role              user_role NOT NULL DEFAULT 'customer',
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  -- stored as first initial + *** + last initial for vendor display
  display_name      VARCHAR(20) GENERATED ALWAYS AS (
                      CONCAT(LEFT(first_name, 1), '***', LEFT(last_name, 1), '.')
                    ) STORED,
  avatar_url        TEXT,
  location_enabled  BOOLEAN DEFAULT FALSE,
  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE vendors (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES users(id),
  name                  VARCHAR(200) NOT NULL,
  slug                  VARCHAR(200) UNIQUE NOT NULL, -- url-safe identifier
  description           TEXT,
  category              VARCHAR(100), -- e.g. 'coffee', 'restaurant', 'automotive'
  neighborhood          VARCHAR(100), -- Pittsburgh neighborhood name
  address               TEXT,
  lat                   DECIMAL(9,6),
  lng                   DECIMAL(9,6),
  phone                 VARCHAR(20),
  website               TEXT,
  logo_url              TEXT,
  cover_url             TEXT,
  status                vendor_status DEFAULT 'pending',
  subscription_plan     subscription_plan DEFAULT 'basic',
  subscription_status   VARCHAR(20) DEFAULT 'inactive',
  subscription_start    TIMESTAMPTZ,
  subscription_end      TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_account_id     TEXT, -- Stripe Connect account for pool contributions
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  contribution_rate     DECIMAL(4,3) DEFAULT 0.020, -- 2.0%
  follower_count        INTEGER DEFAULT 0,
  total_pts_issued      BIGINT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_vendors_neighborhood ON vendors(neighborhood);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_location ON vendors USING GIST(
  ll_to_earth(lat::float8, lng::float8)
);

-- ============================================================
-- REGISTERS
-- ============================================================
-- Each physical NFC stand gets its own register record.
-- The NFC chip encodes: pghpass.app/checkin?vendor=SLUG&register=REG_ID
CREATE TABLE registers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  label       VARCHAR(100) NOT NULL DEFAULT 'Register 1', -- human-readable
  nfc_uid     VARCHAR(100) UNIQUE, -- unique ID burned into NFC chip
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registers_vendor ON registers(vendor_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
-- Core transaction record. Created when:
--   (a) Vendor generates a QR code, OR
--   (b) POS system sends a webhook (Phase 2)
--   (c) NFC tap creates a pending claim

CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id         UUID NOT NULL REFERENCES vendors(id),
  register_id       UUID REFERENCES registers(id),
  amount            DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  points_value      INTEGER NOT NULL, -- amount * 10, rounded
  source            transaction_source NOT NULL,
  status            transaction_status DEFAULT 'pending',

  -- QR-specific
  qr_token          VARCHAR(100) UNIQUE, -- single-use token encoded in QR
  qr_expires_at     TIMESTAMPTZ,

  -- Claim details
  claimed_by        UUID REFERENCES users(id),
  claimed_at        TIMESTAMPTZ,
  customer_entered_amount DECIMAL(10,2), -- what customer typed (for verification)

  -- POS-specific (Phase 2)
  pos_transaction_id TEXT, -- external POS system transaction ID
  pos_source        VARCHAR(50), -- 'square', 'toast', etc.

  -- Pool accounting
  pool_contribution DECIMAL(10,2) GENERATED ALWAYS AS (amount * 0.020) STORED,
  contribution_collected BOOLEAN DEFAULT FALSE,

  -- Metadata
  ip_address        INET,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_vendor ON transactions(vendor_id);
CREATE INDEX idx_transactions_register ON transactions(register_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_claimed_by ON transactions(claimed_by);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_qr_token ON transactions(qr_token) WHERE qr_token IS NOT NULL;

-- FIFO queue index: used by NFC matching algorithm
-- Finds closest unclaimed transaction on a register before a given timestamp
CREATE INDEX idx_transactions_fifo ON transactions(register_id, created_at DESC)
  WHERE status = 'pending';

-- ============================================================
-- POINT LEDGER
-- ============================================================
-- Append-only ledger. Never update or delete rows.
-- Balance = SUM of all entries for a user.
CREATE TABLE point_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  vendor_id       UUID REFERENCES vendors(id),
  transaction_id  UUID REFERENCES transactions(id),
  redemption_id   UUID, -- references redemptions(id), added after table exists
  delta           INTEGER NOT NULL, -- positive = earn, negative = redeem/expire
  balance_after   INTEGER NOT NULL,
  note            VARCHAR(200), -- human-readable reason
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_user ON point_ledger(user_id);
CREATE INDEX idx_ledger_user_created ON point_ledger(user_id, created_at DESC);

-- ============================================================
-- POINT BALANCES (materialized view for fast reads)
-- ============================================================
CREATE TABLE point_balances (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance       INTEGER NOT NULL DEFAULT 0,
  lifetime_pts  INTEGER NOT NULL DEFAULT 0, -- never decrements
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REDEMPTIONS
-- ============================================================
CREATE TABLE redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  vendor_id       UUID REFERENCES vendors(id), -- NULL = any vendor
  points_cost     INTEGER NOT NULL,
  dollar_value    DECIMAL(10,2) NOT NULL,
  reward_label    VARCHAR(200) NOT NULL, -- e.g. "Free coffee" or "$5 off"
  status          redemption_status DEFAULT 'issued',
  redeem_token    VARCHAR(100) UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  claimed_at      TIMESTAMPTZ,
  claimed_at_vendor_id UUID REFERENCES vendors(id),
  payout_amount   DECIMAL(10,2), -- amount reimbursed to vendor from pool
  payout_processed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_token ON redemptions(redeem_token);
CREATE INDEX idx_redemptions_status ON redemptions(status);

-- Add FK back to point_ledger now that redemptions table exists
ALTER TABLE point_ledger
  ADD CONSTRAINT fk_ledger_redemption
  FOREIGN KEY (redemption_id) REFERENCES redemptions(id);

-- ============================================================
-- POOL ACCOUNTING
-- ============================================================
CREATE TABLE pool_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type      pool_entry_type NOT NULL,
  vendor_id       UUID REFERENCES vendors(id),
  transaction_id  UUID REFERENCES transactions(id),
  redemption_id   UUID REFERENCES redemptions(id),
  amount          DECIMAL(10,2) NOT NULL, -- positive = in, negative = out
  balance_after   DECIMAL(10,2) NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pool_ledger_type ON pool_ledger(entry_type);
CREATE INDEX idx_pool_ledger_created ON pool_ledger(created_at DESC);

CREATE TABLE pool_balance (
  id          INTEGER PRIMARY KEY DEFAULT 1, -- singleton row
  balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO pool_balance (balance) VALUES (0.00);

-- ============================================================
-- FOLLOWS (Phase 2 — included in schema now for FK integrity)
-- ============================================================
CREATE TABLE follows (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, vendor_id)
);

CREATE INDEX idx_follows_vendor ON follows(vendor_id);

-- ============================================================
-- POSTS (Phase 2)
-- ============================================================
CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id         UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  post_type         post_type NOT NULL DEFAULT 'update',
  caption           TEXT,
  image_url         TEXT,
  pts_multiplier    INTEGER DEFAULT 1 CHECK (pts_multiplier IN (1, 2, 3)),
  expires_at        TIMESTAMPTZ, -- for flash deals
  contribution_rate DECIMAL(4,3), -- overrides vendor default for multiplier deals
  view_count        INTEGER DEFAULT 0,
  published         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_vendor ON posts(vendor_id);
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_expires ON posts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_posts_vendor_created ON posts(vendor_id, created_at DESC);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE post_likes (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);

-- ============================================================
-- POST COMMENTS
-- ============================================================
CREATE TABLE post_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  display_name  VARCHAR(100),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_post_comments_user ON post_comments(user_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE bookmarks (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
CREATE TABLE fraud_flags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),
  vendor_id     UUID REFERENCES vendors(id),
  flag_type     fraud_flag_type NOT NULL,
  severity      INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
  description   TEXT,
  resolved      BOOLEAN DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_user ON fraud_flags(user_id);
CREATE INDEX idx_fraud_vendor ON fraud_flags(vendor_id);
CREATE INDEX idx_fraud_resolved ON fraud_flags(resolved) WHERE resolved = FALSE;

-- ============================================================
-- NOTIFICATIONS (push token registry)
-- ============================================================
CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  flash_deals         BOOLEAN DEFAULT TRUE,
  points_milestones   BOOLEAN DEFAULT TRUE,
  redemption_ready    BOOLEAN DEFAULT TRUE,
  weekly_summary      BOOLEAN DEFAULT TRUE,
  new_post_followed   BOOLEAN DEFAULT TRUE,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS (in-app log)
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL, -- 'flash_deal', 'milestone', 'redemption', 'weekly_summary', 'new_post'
  data        JSONB,                -- arbitrary payload (vendor_id, post_id, etc.)
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-update point_balances when ledger entry added
CREATE OR REPLACE FUNCTION sync_point_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO point_balances (user_id, balance, lifetime_pts, updated_at)
  VALUES (
    NEW.user_id,
    NEW.balance_after,
    CASE WHEN NEW.delta > 0 THEN NEW.delta ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = NEW.balance_after,
    lifetime_pts = point_balances.lifetime_pts + CASE WHEN NEW.delta > 0 THEN NEW.delta ELSE 0 END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_balance AFTER INSERT ON point_ledger
  FOR EACH ROW EXECUTE FUNCTION sync_point_balance();

-- Auto-update vendor follower_count
CREATE OR REPLACE FUNCTION sync_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vendors SET follower_count = follower_count + 1 WHERE id = NEW.vendor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vendors SET follower_count = follower_count - 1 WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_count AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION sync_follower_count();

-- ============================================================
-- REFERRAL SYSTEM
-- ============================================================
CREATE TABLE referral_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(20) UNIQUE NOT NULL, -- e.g. 'ZACH2024'
  uses        INTEGER DEFAULT 0,
  max_uses    INTEGER DEFAULT 50,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

CREATE TABLE referral_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referrer_id     UUID NOT NULL REFERENCES users(id),
  referee_id      UUID NOT NULL REFERENCES users(id),
  bonus_points    INTEGER NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referee_id) -- each user can only be referred once
);

-- ============================================================
-- STREAKS & CHALLENGES
-- ============================================================
CREATE TABLE user_streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER DEFAULT 0,
  longest_streak    INTEGER DEFAULT 0,
  last_checkin_date DATE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  challenge_type  VARCHAR(50) NOT NULL, -- 'visit_count', 'vendor_variety', 'spend_amount', 'streak'
  target_value    INTEGER NOT NULL,     -- e.g. 3 visits, 5 different vendors
  reward_points   INTEGER NOT NULL,
  icon            VARCHAR(50) DEFAULT 'target',
  active          BOOLEAN DEFAULT TRUE,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress        INTEGER DEFAULT 0,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);

-- ============================================================
-- USER PROFILES (extended)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS checkin_count INTEGER DEFAULT 0;

-- ============================================================
-- FEEDBACK
-- ============================================================
CREATE TABLE feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  type        VARCHAR(50) NOT NULL DEFAULT 'general', -- 'bug', 'feature', 'general'
  message     TEXT NOT NULL,
  screen      VARCHAR(100),  -- which screen they were on
  app_version VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- ============================================================
-- VENDOR DETAIL ENHANCEMENTS
-- ============================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS hours JSONB; -- { "mon": "7am-5pm", "tue": "7am-5pm", ... }
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'; -- array of photo URLs
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS price_level INTEGER DEFAULT 2 CHECK (price_level BETWEEN 1 AND 4);
