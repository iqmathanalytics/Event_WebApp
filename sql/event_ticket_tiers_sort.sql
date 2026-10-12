-- Display order for platform ticket tiers on the event / checkout page
ALTER TABLE events
  ADD COLUMN ticket_tiers_sort ENUM('price_asc', 'price_desc') NOT NULL DEFAULT 'price_asc'
  AFTER ticket_levels_json;
