SET NAMES utf8mb4;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS engagement_updated_at TIMESTAMP NULL DEFAULT NULL AFTER profile_click_count;

