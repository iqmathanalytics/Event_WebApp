-- Link-only vendor partners: name + tracking code, no user account / invite email.
-- Existing account invites keep working (invite_kind='account').

ALTER TABLE event_vendor_shares
  DROP FOREIGN KEY fk_event_vendor_shares_shared_with;

ALTER TABLE event_vendor_shares
  MODIFY COLUMN shared_with_user_id BIGINT UNSIGNED NULL;

ALTER TABLE event_vendor_shares
  MODIFY COLUMN shared_with_email VARCHAR(190) NULL;

ALTER TABLE event_vendor_shares
  ADD COLUMN partner_display_name VARCHAR(120) NULL AFTER shared_with_email;

ALTER TABLE event_vendor_shares
  ADD COLUMN invite_kind ENUM('account', 'link_only') NOT NULL DEFAULT 'account' AFTER partner_display_name;

ALTER TABLE event_vendor_shares
  ADD CONSTRAINT fk_event_vendor_shares_shared_with
    FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE;
