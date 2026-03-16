-- Discovery query optimization indexes for TiDB/MySQL
-- Apply after base schema creation.

-- Events discovery
CREATE INDEX idx_events_discovery_city_category_date_price
  ON events (status, city_id, category_id, event_date, price);
CREATE INDEX idx_events_discovery_popularity
  ON events (status, city_id, popularity_score, created_at);

-- Deals discovery
CREATE INDEX idx_deals_discovery_city_category_expiry_price
  ON deals (status, city_id, category_id, expiry_date, discounted_price);
CREATE INDEX idx_deals_discovery_premium
  ON deals (status, is_premium, expiry_date);
CREATE INDEX idx_deals_discovery_popularity
  ON deals (status, city_id, popularity_score, created_at);

-- Influencers discovery
CREATE INDEX idx_influencers_discovery_city_category_created
  ON influencers (status, city_id, category_id, created_at);
CREATE INDEX idx_influencers_discovery_followers
  ON influencers (status, city_id, followers_count, created_at);

-- Services discovery
CREATE INDEX idx_services_discovery_city_category_created_price
  ON services (status, city_id, category_id, created_at, price_min);
CREATE INDEX idx_services_discovery_popularity
  ON services (status, city_id, popularity_score, created_at);
