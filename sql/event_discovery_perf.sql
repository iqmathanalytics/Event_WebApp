-- Discovery performance: stored GA popularity, listed-flag backfill, and covering indexes.
-- Safe to re-run: duplicate column/key errors are ignored by scripts/run-sql-migrations.js.

ALTER TABLE events
  ADD COLUMN ga_page_views_7d INT NOT NULL DEFAULT 0 AFTER view_count;

ALTER TABLE events
  ADD COLUMN ga_page_views_30d INT NOT NULL DEFAULT 0 AFTER ga_page_views_7d;

ALTER TABLE events
  ADD COLUMN ga_page_views_synced_at TIMESTAMP NULL DEFAULT NULL AFTER ga_page_views_30d;

UPDATE events SET is_listed = 1 WHERE is_listed IS NULL;
UPDATE events SET show_on_events_page = 1 WHERE show_on_events_page IS NULL;
UPDATE events SET home_featured = 0 WHERE home_featured IS NULL;

ALTER TABLE events
  ADD KEY idx_events_organizer (organizer_id);

ALTER TABLE events
  ADD KEY idx_events_home_featured (home_featured, home_featured_at);

ALTER TABLE events
  ADD KEY idx_events_listed_ga_popularity (status, is_listed, ga_page_views_30d);

ALTER TABLE event_bookings
  ADD KEY idx_event_bookings_event_payment (event_id, payment_status);

ALTER TABLE event_bookings
  ADD KEY idx_event_bookings_created (created_at);

ALTER TABLE cities
  ADD KEY idx_cities_dropdown (is_active, show_in_dropdown);
