-- Ticket QR / door check-in for platform bookings
ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS check_in_code VARCHAR(64) NULL;

ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP NULL;

ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS checked_in_by BIGINT UNSIGNED NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_bookings_check_in_code ON event_bookings (check_in_code);
