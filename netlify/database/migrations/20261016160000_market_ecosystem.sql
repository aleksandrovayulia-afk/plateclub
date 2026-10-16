-- v9 market ecosystem: market-maker account, dealer buy-backs, purchase price on plates, value version 3.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'bot'));
ALTER TABLE ledger DROP CONSTRAINT ledger_kind_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup', 'admin_grant', 'market_fee', 'promo', 'daily_bonus', 'reward', 'dealer_sell'));
-- What the current owner paid for the plate (case price or market price). NULL when unknown.
ALTER TABLE plates ADD COLUMN paid BIGINT;
ALTER TABLE plates ALTER COLUMN vv SET DEFAULT 3;
CREATE INDEX IF NOT EXISTS ledger_dealer ON ledger(user_id, created_at) WHERE kind = 'dealer_sell';
CREATE INDEX IF NOT EXISTS listings_seller_status ON listings(seller_id, status);
