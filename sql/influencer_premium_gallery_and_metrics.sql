SET NAMES utf8mb4;

-- Social metrics + engagement metrics for influencer tagging
ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS youtube_subscribers_count INT NOT NULL DEFAULT 0 AFTER followers_count;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS profile_view_count INT NOT NULL DEFAULT 0 AFTER youtube_subscribers_count;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS profile_click_count INT NOT NULL DEFAULT 0 AFTER profile_view_count;

-- Dedicated gallery storage (stores image URLs)
CREATE TABLE IF NOT EXISTS influencer_gallery_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  influencer_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_influencer_gallery_influencer (influencer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

