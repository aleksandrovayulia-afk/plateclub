-- Upgrades: a plate can be burned in an upgrade attempt.
ALTER TABLE plates DROP CONSTRAINT plates_status_check;
ALTER TABLE plates ADD CONSTRAINT plates_status_check CHECK (status IN ('OWNED', 'LISTED', 'BANKED', 'BURNED'));
ALTER TABLE plate_events DROP CONSTRAINT plate_events_kind_check;
ALTER TABLE plate_events ADD CONSTRAINT plate_events_kind_check CHECK (kind IN ('MINTED', 'LISTED', 'PRICE_CHANGED', 'DELISTED', 'TRANSFERRED', 'BANKED', 'UPGRADED'));
CREATE TABLE upgrades (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  from_plate TEXT NOT NULL REFERENCES plates(id),
  to_plate TEXT REFERENCES plates(id),
  target_tier TEXT NOT NULL,
  chance NUMERIC(6,4) NOT NULL,
  roll NUMERIC(8,6) NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX upgrades_user ON upgrades(user_id, created_at DESC);
