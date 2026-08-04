CREATE TABLE IF NOT EXISTS event_analytics_shares (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  shared_with_user_id BIGINT UNSIGNED NOT NULL,
  shared_with_email VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_analytics_shares_active (event_id, shared_with_user_id),
  KEY idx_event_analytics_shares_shared_with (shared_with_user_id, revoked_at),
  KEY idx_event_analytics_shares_owner (owner_user_id),
  CONSTRAINT fk_event_analytics_shares_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_analytics_shares_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_analytics_shares_shared_with FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
