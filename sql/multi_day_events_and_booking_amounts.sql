SET NAMES utf8mb4;

ALTER TABLE events
  ADD COLUMN schedule_type ENUM('single','multiple','range') NOT NULL DEFAULT 'single' AFTER event_date;
ALTER TABLE events
  ADD COLUMN event_start_date DATE NULL AFTER schedule_type;
ALTER TABLE events
  ADD COLUMN event_end_date DATE NULL AFTER event_start_date;
ALTER TABLE events
  ADD COLUMN event_dates_json TEXT NULL AFTER event_end_date;

ALTER TABLE event_bookings
  ADD COLUMN selected_dates_json TEXT NULL AFTER booking_date;
ALTER TABLE event_bookings
  ADD COLUMN total_days INT NOT NULL DEFAULT 1 AFTER selected_dates_json;
ALTER TABLE event_bookings
  ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_days;
