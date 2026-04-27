SET NAMES utf8mb4;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS facebook_followers_count INT NOT NULL DEFAULT 0 AFTER followers_count;
