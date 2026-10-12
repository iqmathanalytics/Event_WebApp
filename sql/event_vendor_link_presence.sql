-- Live presence for partner links (heartbeat while the event page is open).
-- Separate from event_vendor_link_hits so heartbeats do not inflate link visits.
CREATE TABLE IF NOT EXISTS event_vendor_link_presence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  vendor_code VARCHAR(40) NOT NULL,
  share_id BIGINT UNSIGNED NULL DEFAULT NULL,
  session_key VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_vendor_presence_session (event_id, vendor_code, session_key),
  KEY idx_event_vendor_presence_live (event_id, vendor_code, last_seen_at),
  CONSTRAINT fk_event_vendor_presence_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_vendor_presence_share FOREIGN KEY (share_id) REFERENCES event_vendor_shares (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
