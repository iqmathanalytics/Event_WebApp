ALTER TABLE events
  ADD COLUMN seating_mode ENUM('general', 'reserved') NOT NULL DEFAULT 'general';

ALTER TABLE events
  ADD COLUMN seatsio_chart_key VARCHAR(80) NULL,
  ADD COLUMN seatsio_event_key VARCHAR(80) NULL;

ALTER TABLE event_bookings
  ADD COLUMN seatsio_hold_token VARCHAR(128) NULL,
  ADD COLUMN selected_seats_json JSON NULL;
