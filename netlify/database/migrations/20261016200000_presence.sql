-- who is online: last request time per player
ALTER TABLE users ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS users_seen ON users(seen_at DESC) WHERE seen_at IS NOT NULL;
