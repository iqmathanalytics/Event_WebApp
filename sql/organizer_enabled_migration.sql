SET NAMES utf8mb4;

-- Enables organizer capabilities without needing a separate "organizer" role.
-- This keeps backward compatibility with the existing role ENUM.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organizer_enabled TINYINT(1) NOT NULL DEFAULT 0;

-- If any existing users already have role='organizer', treat them as enabled.
UPDATE users
  SET organizer_enabled = 1
  WHERE role = 'organizer';

