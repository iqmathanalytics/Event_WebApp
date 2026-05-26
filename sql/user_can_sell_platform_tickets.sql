-- Allow organizers to sell tickets on-site (platform checkout) after admin approval.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_sell_platform_tickets TINYINT(1) NOT NULL DEFAULT 0;
