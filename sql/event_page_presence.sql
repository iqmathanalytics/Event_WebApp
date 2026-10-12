-- First-party live presence on event detail pages (heartbeat while open).
-- Used for "Live now" instead of GA Realtime's sticky ~30 minute window.
CREATE TABLE IF NOT EXISTS event_page_presence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  session_key VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_page_presence_session (event_id, session_key),
  KEY idx_event_page_presence_live (event_id, last_seen_at),
  CONSTRAINT fk_event_page_presence_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
