-- Values v4: beautiful plates are worth more. Old plates keep their version.
ALTER TABLE plates ALTER COLUMN vv SET DEFAULT 4;
-- Player profile photo (small data: URL, resized in the browser).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
-- Games: first-time tutorials seen, per account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS seen_tips TEXT NOT NULL DEFAULT '';
-- New game "Дороже или дешевле": a run of guesses, banked or lost.
CREATE TABLE IF NOT EXISTS hilo_runs (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  step INT NOT NULL DEFAULT 0,
  cur JSONB NOT NULL,
  history JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CASHED', 'LOST', 'DONE')),
  bank INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hilo_user ON hilo_runs(user_id, created_at DESC);
