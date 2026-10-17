-- The market maker is a bot, never a ranked player.
UPDATE users SET role='bot' WHERE nick_norm='plateclubmarket' AND role='user';
