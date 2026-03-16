-- Promote developer accounts to admin.
-- Accounts must already exist (users must have registered first).
-- Run via: make seed-admins
UPDATE users
SET is_admin = TRUE
WHERE username IN ('ValGSgit', 'DavidPoetsch', 'fankahou', 'LukasStefanek');

-- Show result so the caller can verify.
SELECT id, username, email, is_admin
FROM users
WHERE username IN ('ValGSgit', 'DavidPoetsch', 'fankahou', 'LukasStefanek')
ORDER BY username;
