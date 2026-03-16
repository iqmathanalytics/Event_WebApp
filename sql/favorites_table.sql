-- Favorites table for user saved listings.
CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  listing_type ENUM('event', 'deal', 'influencer', 'service') NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_favorites_user_listing (user_id, listing_type, listing_id),
  KEY idx_favorites_user_type_created (user_id, listing_type, created_at),
  KEY idx_favorites_listing_lookup (listing_type, listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
