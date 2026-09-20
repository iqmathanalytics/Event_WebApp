SET NAMES utf8mb4;

ALTER TABLE events
  ADD COLUMN home_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_listed;

ALTER TABLE events
  ADD COLUMN home_featured_at TIMESTAMP NULL DEFAULT NULL AFTER home_featured;
