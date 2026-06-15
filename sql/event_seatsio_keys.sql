-- Repair partial event_seatsio migration (seating_mode without chart/event keys)
ALTER TABLE events
  ADD COLUMN seatsio_chart_key VARCHAR(80) NULL,
  ADD COLUMN seatsio_event_key VARCHAR(80) NULL;
