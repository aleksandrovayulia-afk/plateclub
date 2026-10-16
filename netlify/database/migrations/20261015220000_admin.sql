-- Admin role, admin balance adjustments and an audit log of every admin action
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

ALTER TABLE ledger DROP CONSTRAINT ledger_kind_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup', 'admin_grant'));
-- The starting admin grant can happen once per account.
CREATE UNIQUE INDEX ledger_one_admin_initial ON ledger(user_id) WHERE kind = 'admin_grant' AND ref = 'admin-initial';

CREATE TABLE admin_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target TEXT,
  amount BIGINT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_log_time ON admin_log(created_at DESC);
