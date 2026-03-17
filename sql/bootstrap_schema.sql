SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','organizer','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS cities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cities_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  module_type ENUM('event','influencer','deal','service') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_module_slug (module_type, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  event_date DATE NOT NULL,
  schedule_type ENUM('single','multiple','range') NOT NULL DEFAULT 'single',
  event_start_date DATE NULL,
  event_end_date DATE NULL,
  event_dates_json TEXT NULL,
  event_time TIME NULL,
  venue VARCHAR(255) NOT NULL,
  venue_name VARCHAR(255) NULL,
  venue_address VARCHAR(500) NULL,
  google_maps_link VARCHAR(1000) NULL,
  city_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  ticket_link VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_hours INT NULL,
  age_limit VARCHAR(50) NULL,
  languages VARCHAR(255) NULL,
  genres VARCHAR(255) NULL,
  event_highlights TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  popularity_score INT NOT NULL DEFAULT 0,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  review_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_discovery (status, city_id, category_id, event_date, price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS influencers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  bio TEXT NULL,
  city_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  social_links JSON NULL,
  profile_image_url VARCHAR(500) NULL,
  followers_count INT NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_influencers_discovery (status, city_id, category_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS deals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  city_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  provider_name VARCHAR(180) NULL,
  original_price DECIMAL(10,2) NULL,
  discounted_price DECIMAL(10,2) NULL,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  deal_link VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  popularity_score INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_deals_discovery (status, city_id, category_id, expiry_date, discounted_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  city_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  provider_user_id BIGINT UNSIGNED NULL,
  pricing_range VARCHAR(80) NULL,
  price_min DECIMAL(10,2) NULL,
  price_max DECIMAL(10,2) NULL,
  contact_phone VARCHAR(30) NULL,
  booking_link VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count INT NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  popularity_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_discovery (status, city_id, category_id, created_at, price_min)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  listing_type ENUM('event','deal','influencer','service') NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_favorites_user_listing (user_id, listing_type, listing_id),
  KEY idx_favorites_user_type_created (user_id, listing_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  city_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_email_city (email, city_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  message TEXT NOT NULL,
  city_id BIGINT UNSIGNED NULL,
  status ENUM('new','in_progress','resolved','spam') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_admin_id BIGINT UNSIGNED NULL,
  type ENUM('event_submitted','event_reviewed','deal_submitted','service_submitted','contact_received','system') NOT NULL,
  entity_type ENUM('event','deal','service','influencer','contact','other') NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  title VARCHAR(220) NOT NULL,
  message VARCHAR(1000) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO cities (id, name, state, slug, is_active) VALUES
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
  (20, 'Portland', 'OR', 'portland-or', 1);

INSERT IGNORE INTO categories (id, name, slug, module_type, is_active) VALUES
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
  (20, 'Community Events', 'community-events', 'event', 1);

SET FOREIGN_KEY_CHECKS = 1;
