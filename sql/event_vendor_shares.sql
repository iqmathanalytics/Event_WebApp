-- Vendor partner link shares: invite by email, unique code per partner, soft revoke.
CREATE TABLE IF NOT EXISTS event_vendor_shares (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  shared_with_user_id BIGINT UNSIGNED NOT NULL,
  shared_with_email VARCHAR(190) NOT NULL,
  vendor_code VARCHAR(40) NOT NULL,
  status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  invite_token CHAR(36) NULL,
  accepted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_vendor_shares_user (event_id, shared_with_user_id),
  UNIQUE KEY uq_event_vendor_shares_code (event_id, vendor_code),
  KEY idx_event_vendor_shares_shared_with (shared_with_user_id, revoked_at),
  KEY idx_event_vendor_shares_owner (owner_user_id),
  KEY idx_event_vendor_shares_token (invite_token),
  CONSTRAINT fk_event_vendor_shares_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_vendor_shares_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_vendor_shares_shared_with FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- First-party visits when buyers open an embedded vendor link (?vendor=CODE).
CREATE TABLE IF NOT EXISTS event_vendor_link_hits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  vendor_code VARCHAR(40) NOT NULL,
  share_id BIGINT UNSIGNED NULL DEFAULT NULL,
  session_key VARCHAR(64) NOT NULL,
  path VARCHAR(255) NULL DEFAULT NULL,
  user_agent VARCHAR(255) NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_vendor_hits_lookup (event_id, vendor_code, created_at),
  KEY idx_event_vendor_hits_session (event_id, vendor_code, session_key, created_at),
  CONSTRAINT fk_event_vendor_hits_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_vendor_hits_share FOREIGN KEY (share_id) REFERENCES event_vendor_shares (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
