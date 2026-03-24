SET NAMES utf8mb4;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS one_of_a_kind_manual TINYINT(1) NOT NULL DEFAULT 0 AFTER event_highlights;
