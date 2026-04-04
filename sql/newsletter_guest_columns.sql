-- Guest newsletter signups: names + optional interests (run once on existing DBs).
-- Appends columns (no AFTER) for broad MySQL/TiDB compatibility.

ALTER TABLE newsletter_subscribers ADD COLUMN first_name VARCHAR(80) NULL DEFAULT NULL;

ALTER TABLE newsletter_subscribers ADD COLUMN last_name VARCHAR(80) NULL DEFAULT NULL;

ALTER TABLE newsletter_subscribers ADD COLUMN interests_note VARCHAR(500) NULL DEFAULT NULL;
