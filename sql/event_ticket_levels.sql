-- Ticket tiers for platform checkout (General, Premium, VIP, etc.)
ALTER TABLE events
  ADD COLUMN ticket_levels_json TEXT NULL AFTER price;

ALTER TABLE event_bookings
  ADD COLUMN ticket_items_json TEXT NULL AFTER attendee_count;
