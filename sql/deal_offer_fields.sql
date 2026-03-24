SET NAMES utf8mb4;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS offer_type ENUM('percentage_off','flat_off','bogo','bundle_price','free_item','custom') NOT NULL DEFAULT 'percentage_off' AFTER image_url,
  ADD COLUMN IF NOT EXISTS offer_meta_json TEXT NULL AFTER offer_type,
  ADD COLUMN IF NOT EXISTS terms_text TEXT NULL AFTER offer_meta_json;
