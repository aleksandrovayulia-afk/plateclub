-- Rewards are small: the built-in promo codes give at most 10 PLT.
UPDATE promo_codes SET amount = 10 WHERE code IN ('PLATECLUB', 'MINSK');
UPDATE promo_codes SET amount = 7 WHERE code = 'LUCKY7';
