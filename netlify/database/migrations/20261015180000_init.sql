-- PLATE CLUB initial schema
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_norm TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  nick_norm TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  terms_version TEXT NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_key ON auth_attempts(key, created_at);

-- Every balance change. balance_after makes the history auditable.
CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  ref TEXT,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_user ON ledger(user_id, created_at DESC);
-- The 50 PLT welcome grant can exist at most once per account.
CREATE UNIQUE INDEX ledger_one_signup_bonus ON ledger(user_id) WHERE kind = 'signup_bonus';

CREATE TABLE plates (
  id TEXT PRIMARY KEY,
  letters TEXT NOT NULL,
  digits TEXT NOT NULL,
  region TEXT NOT NULL,
  combo TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL,
  pattern TEXT NOT NULL,
  value INTEGER NOT NULL,
  owner_id BIGINT REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('OWNED', 'LISTED', 'BANKED')),
  origin TEXT NOT NULL,
  last_tx_id TEXT,
  seal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plates_owner ON plates(owner_id);

-- Append-only history with a hash chain per plate.
CREATE TABLE plate_events (
  id BIGSERIAL PRIMARY KEY,
  plate_id TEXT NOT NULL REFERENCES plates(id),
  kind TEXT NOT NULL CHECK (kind IN ('MINTED', 'LISTED', 'PRICE_CHANGED', 'DELISTED', 'TRANSFERRED', 'BANKED')),
  from_user BIGINT REFERENCES users(id),
  to_user BIGINT REFERENCES users(id),
  price BIGINT,
  tx_id TEXT,
  chain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plate_events_plate ON plate_events(plate_id, id);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  plate_id TEXT NOT NULL REFERENCES plates(id),
  seller_id BIGINT NOT NULL REFERENCES users(id),
  price BIGINT NOT NULL CHECK (price >= 1 AND price <= 10000000),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RESERVED', 'SOLD', 'CANCELLED')),
  buyer_id BIGINT REFERENCES users(id),
  fee BIGINT,
  tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX listings_one_open_per_plate ON listings(plate_id) WHERE status IN ('ACTIVE', 'RESERVED');
CREATE INDEX listings_status ON listings(status, created_at DESC);

CREATE TABLE idempotency (
  key TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_ref TEXT UNIQUE,
  package_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  plt BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  credited_tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_user ON payments(user_id, created_at DESC);
