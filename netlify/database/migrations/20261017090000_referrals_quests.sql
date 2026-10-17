-- v14: referral links and social quests (story / TikTok) reviewed by an admin.
ALTER TABLE ledger DROP CONSTRAINT ledger_kind_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup', 'admin_grant', 'market_fee', 'promo', 'daily_bonus', 'reward', 'dealer_sell', 'battle_entry', 'battle_refund', 'trade', 'auction_bid', 'auction_refund', 'referral', 'quest'));

-- every player gets a short invite code; who invited whom is stored once and never changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_ref_code ON users(ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- a player sends a link to their story / TikTok, an admin approves or rejects it
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('story', 'tiktok')),
  url TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
  views BIGINT,
  amount BIGINT,
  reason TEXT,
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quests_user ON quests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quests_status ON quests(status, created_at DESC);
