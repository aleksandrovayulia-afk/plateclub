-- Values v2: rare plates are worth much more. Existing plates keep the value they were minted with (vv = 1).
ALTER TABLE plates ADD COLUMN vv SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE plates ALTER COLUMN vv SET DEFAULT 2;
