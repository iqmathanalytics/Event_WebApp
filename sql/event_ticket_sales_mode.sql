ALTER TABLE events
  ADD COLUMN ticket_sales_mode ENUM('external', 'platform') NOT NULL DEFAULT 'external'
  AFTER ticket_link;
