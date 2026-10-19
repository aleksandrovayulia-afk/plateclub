-- a plate can complete each collection only once, whoever owns it (stops passing the same plates between accounts)
CREATE TABLE IF NOT EXISTS set_claim_plates (
  plate_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plate_id, set_id)
);
