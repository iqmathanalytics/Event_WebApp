-- Pending invites must be accepted before analytics access is granted.
ALTER TABLE event_analytics_shares
  ADD COLUMN `status` ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  ADD COLUMN invite_token CHAR(36) NULL,
  ADD COLUMN accepted_at TIMESTAMP NULL DEFAULT NULL;

-- Existing rows were immediately shared; treat them as already accepted.
UPDATE event_analytics_shares
SET `status` = 'accepted',
    accepted_at = COALESCE(accepted_at, created_at)
WHERE revoked_at IS NULL;

UPDATE event_analytics_shares
SET invite_token = UUID()
WHERE invite_token IS NULL;
