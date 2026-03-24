SET NAMES utf8mb4;

-- Separate analytics counters for home tags and trending logic.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS click_count INT NOT NULL DEFAULT 0 AFTER popularity_score;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0 AFTER click_count;

