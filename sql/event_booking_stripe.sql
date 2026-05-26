-- Stripe payment tracking for platform ticket bookings

ALTER TABLE event_bookings
  ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'free', 'refunded') NOT NULL DEFAULT 'paid',
  ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL,
  ADD COLUMN stripe_charge_id VARCHAR(255) NULL,
  ADD COLUMN amount_paid_cents INT UNSIGNED NULL,
  ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  ADD COLUMN paid_at TIMESTAMP NULL;

CREATE UNIQUE INDEX uq_event_bookings_stripe_pi ON event_bookings (stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS event_checkout_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stripe_payment_intent_id VARCHAR(255) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  status ENUM('requires_payment', 'processing', 'succeeded', 'failed', 'canceled') NOT NULL DEFAULT 'requires_payment',
  amount_cents INT UNSIGNED NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  payload_json TEXT NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  stripe_charge_id VARCHAR(255) NULL,
  failure_code VARCHAR(64) NULL,
  failure_message VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkout_stripe_pi (stripe_payment_intent_id),
  KEY idx_checkout_user (user_id),
  KEY idx_checkout_event (event_id),
  KEY idx_checkout_booking (booking_id),
  CONSTRAINT fk_checkout_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_checkout_event FOREIGN KEY (event_id) REFERENCES events (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
