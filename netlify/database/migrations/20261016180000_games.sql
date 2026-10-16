-- v11: case battles, swaps between players, auction of the day.
ALTER TABLE ledger DROP CONSTRAINT ledger_kind_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('signup_bonus', 'case_open', 'market_buy', 'market_sale', 'bank_sell', 'topup', 'admin_grant', 'market_fee', 'promo', 'daily_bonus', 'reward', 'dealer_sell', 'battle_entry', 'battle_refund', 'trade', 'auction_bid', 'auction_refund'));
ALTER TABLE plates DROP CONSTRAINT plates_status_check;
ALTER TABLE plates ADD CONSTRAINT plates_status_check CHECK (status IN ('OWNED', 'LISTED', 'BANKED', 'BURNED', 'AUCTION'));

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  seats SMALLINT NOT NULL CHECK (seats BETWEEN 2 AND 4),
  rounds SMALLINT NOT NULL CHECK (rounds BETWEEN 1 AND 5),
  price BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE', 'CANCELLED')),
  creator_id BIGINT NOT NULL REFERENCES users(id),
  winner_seat SMALLINT,
  total_value BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX battles_status ON battles(status, created_at DESC);
CREATE TABLE battle_seats (
  battle_id TEXT NOT NULL REFERENCES battles(id),
  seat SMALLINT NOT NULL,
  user_id BIGINT REFERENCES users(id),
  bot_name TEXT,
  paid BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (battle_id, seat)
);
CREATE INDEX battle_seats_user ON battle_seats(user_id);
CREATE TABLE battle_drops (
  battle_id TEXT NOT NULL REFERENCES battles(id),
  round SMALLINT NOT NULL,
  seat SMALLINT NOT NULL,
  plate_id TEXT NOT NULL REFERENCES plates(id),
  value BIGINT NOT NULL,
  PRIMARY KEY (battle_id, round, seat)
);

CREATE TABLE swaps (
  id TEXT PRIMARY KEY,
  from_id BIGINT NOT NULL REFERENCES users(id),
  to_id BIGINT NOT NULL REFERENCES users(id),
  give_plates TEXT[] NOT NULL DEFAULT '{}',
  want_plates TEXT[] NOT NULL DEFAULT '{}',
  give_plt BIGINT NOT NULL DEFAULT 0 CHECK (give_plt >= 0),
  want_plt BIGINT NOT NULL DEFAULT 0 CHECK (want_plt >= 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'FAILED')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX swaps_to ON swaps(to_id, status, created_at DESC);
CREATE INDEX swaps_from ON swaps(from_id, status, created_at DESC);

CREATE TABLE auctions (
  day INT PRIMARY KEY,
  plate_id TEXT NOT NULL REFERENCES plates(id),
  start_price BIGINT NOT NULL,
  step BIGINT NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'DONE')),
  top_bid BIGINT,
  top_user BIGINT REFERENCES users(id),
  bids INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE auction_bids (
  id BIGSERIAL PRIMARY KEY,
  day INT NOT NULL REFERENCES auctions(day),
  user_id BIGINT NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auction_bids_day ON auction_bids(day, id DESC);
