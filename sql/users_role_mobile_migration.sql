-- Update users table for new role model and mobile number support.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20) NULL AFTER email;

-- Convert old 'guest' role values to 'user' before enum update.
UPDATE users SET role = 'user' WHERE role = 'guest';

ALTER TABLE users
  MODIFY COLUMN role ENUM('user','organizer','admin') NOT NULL DEFAULT 'user';
