SET NAMES utf8mb4;

INSERT INTO cities (id, name, state, slug, is_active) VALUES
  (1, 'New York', 'NY', 'new-york-ny', 1),
  (2, 'Los Angeles', 'CA', 'los-angeles-ca', 1),
  (3, 'Miami', 'FL', 'miami-fl', 1),
  (4, 'Chicago', 'IL', 'chicago-il', 1),
  (5, 'Austin', 'TX', 'austin-tx', 1),
  (6, 'San Francisco', 'CA', 'san-francisco-ca', 1),
  (7, 'San Diego', 'CA', 'san-diego-ca', 1),
  (8, 'Seattle', 'WA', 'seattle-wa', 1),
  (9, 'Boston', 'MA', 'boston-ma', 1),
  (10, 'Dallas', 'TX', 'dallas-tx', 1),
  (11, 'Houston', 'TX', 'houston-tx', 1),
  (12, 'Las Vegas', 'NV', 'las-vegas-nv', 1),
  (13, 'Denver', 'CO', 'denver-co', 1),
  (14, 'Atlanta', 'GA', 'atlanta-ga', 1),
  (15, 'Orlando', 'FL', 'orlando-fl', 1),
  (16, 'Washington DC', 'DC', 'washington-dc', 1),
  (17, 'Phoenix', 'AZ', 'phoenix-az', 1),
  (18, 'Nashville', 'TN', 'nashville-tn', 1),
  (19, 'San Jose', 'CA', 'san-jose-ca', 1),
  (20, 'Portland', 'OR', 'portland-or', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  state = VALUES(state),
  slug = VALUES(slug),
  is_active = VALUES(is_active);

INSERT INTO categories (id, name, slug, module_type, is_active) VALUES
  (1, 'Music', 'music', 'event', 1),
  (2, 'Nightlife', 'nightlife', 'event', 1),
  (3, 'Fashion', 'fashion', 'event', 1),
  (4, 'Food & Drinks', 'food-drinks', 'event', 1),
  (5, 'Beauty & Services', 'beauty-services', 'event', 1),
  (6, 'Comedy', 'comedy', 'event', 1),
  (7, 'Technology', 'technology', 'event', 1),
  (8, 'Startup / Networking', 'startup-networking', 'event', 1),
  (9, 'Business / Conference', 'business-conference', 'event', 1),
  (10, 'Health & Wellness', 'health-wellness', 'event', 1),
  (11, 'Fitness', 'fitness', 'event', 1),
  (12, 'Art & Culture', 'art-culture', 'event', 1),
  (13, 'Festival', 'festival', 'event', 1),
  (14, 'Workshops', 'workshops', 'event', 1),
  (15, 'Education', 'education', 'event', 1),
  (16, 'Family Events', 'family-events', 'event', 1),
  (17, 'Outdoor Events', 'outdoor-events', 'event', 1),
  (18, 'Sports', 'sports', 'event', 1),
  (19, 'Influencer Meetups', 'influencer-meetups', 'event', 1),
  (20, 'Community Events', 'community-events', 'event', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  module_type = VALUES(module_type),
  is_active = VALUES(is_active);
