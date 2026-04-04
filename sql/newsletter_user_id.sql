-- Tie newsletter rows to user accounts so guest signups are recognized after registration (not only by email string).
ALTER TABLE newsletter_subscribers ADD COLUMN user_id BIGINT UNSIGNED NULL DEFAULT NULL;
CREATE INDEX idx_newsletter_subscribers_user_id ON newsletter_subscribers (user_id);

UPDATE newsletter_subscribers ns
INNER JOIN users u ON LOWER(TRIM(ns.email)) = LOWER(TRIM(u.email))
SET ns.user_id = u.id
WHERE ns.user_id IS NULL;
