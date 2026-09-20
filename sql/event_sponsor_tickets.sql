-- Complimentary sponsor tickets for the owning organizer (platform checkout).
ALTER TABLE events
  ADD COLUMN sponsor_tickets_enabled TINYINT(1) NOT NULL DEFAULT 0
  AFTER sponsor_contact_phone;
