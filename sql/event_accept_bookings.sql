-- Organizer "Accept tickets" toggle (independent of website visibility).
ALTER TABLE events
  ADD COLUMN accept_bookings TINYINT(1) NOT NULL DEFAULT 1
  AFTER show_on_events_page;
