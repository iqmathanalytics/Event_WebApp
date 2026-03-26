SET NAMES utf8mb4;

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local' AFTER password_hash;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(64) NULL AFTER auth_provider;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500) NULL AFTER google_id;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_google_id (google_id);
