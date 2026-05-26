CREATE TABLE IF NOT EXISTS event_coupons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL,
  discount_type ENUM('percent', 'fixed_amount') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  scope ENUM('all_events', 'specific_events') NOT NULL DEFAULT 'all_events',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  max_redemptions INT UNSIGNED NULL,
  max_redemptions_per_user INT UNSIGNED NULL,
  min_ticket_count INT UNSIGNED NULL,
  min_order_amount DECIMAL(10,2) NULL,
  max_discount_amount DECIMAL(10,2) NULL,
  redemption_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_coupons_organizer_code (organizer_id, code),
  KEY idx_event_coupons_organizer (organizer_id),
  KEY idx_event_coupons_active (is_active),
  CONSTRAINT fk_event_coupons_organizer FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS event_coupon_events (
  coupon_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (coupon_id, event_id),
  KEY idx_event_coupon_events_event (event_id),
  CONSTRAINT fk_event_coupon_events_coupon FOREIGN KEY (coupon_id) REFERENCES event_coupons (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_coupon_events_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS event_coupon_holds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  hold_token CHAR(36) NOT NULL,
  attendee_count INT UNSIGNED NOT NULL,
  selected_dates_json TEXT NOT NULL,
  subtotal_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_coupon_holds_token (hold_token),
  KEY idx_event_coupon_holds_coupon (coupon_id),
  KEY idx_event_coupon_holds_user (user_id),
  KEY idx_event_coupon_holds_expires (expires_at),
  CONSTRAINT fk_event_coupon_holds_coupon FOREIGN KEY (coupon_id) REFERENCES event_coupons (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_coupon_holds_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_coupon_holds_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS event_coupon_redemptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_coupon_redemptions_booking (booking_id),
  KEY idx_event_coupon_redemptions_coupon_user (coupon_id, user_id),
  CONSTRAINT fk_event_coupon_redemptions_coupon FOREIGN KEY (coupon_id) REFERENCES event_coupons (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_coupon_redemptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_coupon_redemptions_booking FOREIGN KEY (booking_id) REFERENCES event_bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE event_bookings
  ADD COLUMN coupon_id BIGINT UNSIGNED NULL,
  ADD COLUMN subtotal_amount DECIMAL(10,2) NULL,
  ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN coupon_code VARCHAR(20) NULL;

ALTER TABLE event_bookings
  ADD KEY idx_event_bookings_coupon (coupon_id);
