-- one-time starting balance for the site owner (the first admin): 50 000 000 PLT.
-- Runs once; skipped if there is no admin yet (then ADMIN_INITIAL_GRANT pays it when the code is entered) or it was already paid.
WITH a AS (SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1),
up AS (
  UPDATE users SET balance = balance + 50000000
  WHERE id IN (SELECT id FROM a) AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.user_id = users.id AND l.ref = 'admin-initial')
  RETURNING id, balance
)
INSERT INTO ledger(id, user_id, kind, amount, balance_after, ref, label)
SELECT 'TX-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4)), id, 'admin_grant', 50000000, balance, 'admin-initial', 'Стартовый баланс администратора' FROM up;
