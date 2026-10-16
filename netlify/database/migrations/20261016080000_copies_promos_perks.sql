-- Each combination exists at most twice: copy 1 and copy 2.
ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_combo_key;
ALTER TABLE plates ADD COLUMN copy SMALLINT NOT NULL DEFAULT 1 CHECK (copy IN (1, 2));
CREATE UNIQUE INDEX plates_combo_copy ON plates(combo, copy);

-- New ledger kinds: promo codes, daily bonus, achievement rewards.
ALTER TABLE ledger DROP CONSTRAINT ledger_kind_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup', 'admin_grant', 'market_fee', 'promo', 'daily_bonus', 'reward'));
CREATE UNIQUE INDEX ledger_one_daily ON ledger(user_id, ref) WHERE kind = 'daily_bonus';
CREATE UNIQUE INDEX ledger_one_reward ON ledger(user_id, ref) WHERE kind = 'reward';

CREATE TABLE promo_codes (
  code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{3,24}$'),
  amount BIGINT NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  max_uses INT CHECK (max_uses IS NULL OR max_uses > 0),
  uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE promo_redemptions (
  code TEXT NOT NULL REFERENCES promo_codes(code),
  user_id BIGINT NOT NULL REFERENCES users(id),
  tx_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);
INSERT INTO promo_codes(code, amount, max_uses, note) VALUES
  ('PLATECLUB', 100, NULL, 'Стартовый промокод'),
  ('LUCKY7', 77, 1000, 'Счастливые семёрки'),
  ('MINSK', 60, 1000, 'Для белорусских кейсов');
