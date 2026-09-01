-- Guest checkout coupon holds (email identity when user_id is null).
ALTER TABLE event_coupon_holds
  DROP FOREIGN KEY fk_event_coupon_holds_user;

ALTER TABLE event_coupon_holds
  MODIFY COLUMN user_id BIGINT UNSIGNED NULL;

ALTER TABLE event_coupon_holds
  ADD COLUMN guest_email VARCHAR(255) NULL AFTER user_id;

ALTER TABLE event_coupon_holds
  ADD KEY idx_event_coupon_holds_guest_email (guest_email);

ALTER TABLE event_coupon_holds
  ADD CONSTRAINT fk_event_coupon_holds_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE event_coupon_redemptions
  DROP FOREIGN KEY fk_event_coupon_redemptions_user;

ALTER TABLE event_coupon_redemptions
  MODIFY COLUMN user_id BIGINT UNSIGNED NULL;

ALTER TABLE event_coupon_redemptions
  ADD CONSTRAINT fk_event_coupon_redemptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
