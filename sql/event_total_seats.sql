-- Total seat capacity for on-site (platform) ticket events

ALTER TABLE events
  ADD COLUMN total_seats INT UNSIGNED NULL AFTER ticket_sales_mode;
