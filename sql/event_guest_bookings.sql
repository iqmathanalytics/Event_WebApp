-- Guest checkout: bookings without a registered user account.

ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS is_guest_booking TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE event_bookings
  MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
