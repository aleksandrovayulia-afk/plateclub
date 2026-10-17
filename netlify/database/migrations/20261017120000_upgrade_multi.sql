-- An upgrade may burn up to two plates for one higher chance.
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS extra_plate TEXT REFERENCES plates(id);
