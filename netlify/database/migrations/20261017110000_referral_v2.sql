-- v15: nicer invite links, milestone bonuses and a simple guard against inviting yourself twice.
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
CREATE INDEX IF NOT EXISTS users_signup_ip ON users(signup_ip) WHERE signup_ip IS NOT NULL;
