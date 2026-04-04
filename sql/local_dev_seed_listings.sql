-- Sample approved listings for local development (events, deals).
-- Requires cities_categories_expansion.sql (cities id 1–20, categories id 1–20).
-- Safe to run multiple times.

SET NAMES utf8mb4;

INSERT INTO users (name, email, password_hash, role, organizer_enabled, can_post_events, can_create_influencer_profile, can_post_deals, is_active)
VALUES (
  'Local Dev Organizer',
  'local-organizer@yay.local',
  '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'organizer',
  1,
  1,
  1,
  1,
  1
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO events (
  title,
  description,
  event_date,
  schedule_type,
  venue,
  city_id,
  category_id,
  organizer_id,
  ticket_link,
  image_url,
  price,
  status,
  popularity_score
)
SELECT
  'Sample Jazz Night (local dev)',
  'Seeded event for local testing.',
  DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  'single',
  'Downtown Music Hall',
  1,
  1,
  (SELECT id FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1),
  'https://example.com/tickets',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  29.99,
  'approved',
  10
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM events WHERE title = 'Sample Jazz Night (local dev)' LIMIT 1);

INSERT INTO events (
  title,
  description,
  event_date,
  schedule_type,
  venue,
  city_id,
  category_id,
  organizer_id,
  price,
  status,
  popularity_score
)
SELECT
  'Weekend Food Festival (local dev)',
  'Second sample event for local discovery.',
  DATE_ADD(CURDATE(), INTERVAL 21 DAY),
  'single',
  'Waterfront Park',
  3,
  4,
  (SELECT id FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1),
  0,
  'approved',
  8
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM events WHERE title = 'Weekend Food Festival (local dev)' LIMIT 1);

INSERT INTO deals (
  title,
  description,
  city_id,
  category_id,
  provider_name,
  original_price,
  discounted_price,
  is_premium,
  expiry_date,
  deal_link,
  image_url,
  offer_type,
  status,
  popularity_score,
  created_by
)
SELECT
  'Sample dining deal (local dev)',
  'Seeded deal for local testing.',
  1,
  4,
  'Demo Restaurant',
  80.00,
  55.00,
  0,
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  'https://example.com/deal',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  'percentage_off',
  'approved',
  5,
  (SELECT id FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM deals WHERE title = 'Sample dining deal (local dev)' LIMIT 1);

INSERT INTO deals (
  title,
  description,
  city_id,
  category_id,
  original_price,
  discounted_price,
  expiry_date,
  offer_type,
  status,
  popularity_score,
  created_by
)
SELECT
  'Spa day offer (local dev)',
  'Second sample deal.',
  2,
  5,
  120.00,
  89.00,
  DATE_ADD(CURDATE(), INTERVAL 45 DAY),
  'flat_off',
  'approved',
  4,
  (SELECT id FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'local-organizer@yay.local' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM deals WHERE title = 'Spa day offer (local dev)' LIMIT 1);
