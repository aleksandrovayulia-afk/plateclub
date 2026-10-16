-- Belarusian plates: 4 digits, 2 Latin letters, region 1–7
ALTER TABLE plates ADD COLUMN country TEXT NOT NULL DEFAULT 'RU' CHECK (country IN ('RU', 'BY'));
