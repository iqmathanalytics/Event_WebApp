CREATE TABLE IF NOT EXISTS user_onboarding_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  city_id BIGINT UNSIGNED NULL,
  interests_json JSON NULL,
  wants_influencer TINYINT(1) NOT NULL DEFAULT 0,
  wants_deal TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_onboarding_profiles_user (user_id),
  KEY idx_user_onboarding_profiles_city (city_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
