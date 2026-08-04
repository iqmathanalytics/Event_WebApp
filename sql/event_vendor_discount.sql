-- Vendor code discount config on events + hold support for vendor applies.
ALTER TABLE events
  ADD COLUMN vendor_discount_type ENUM('percent','fixed_amount') NOT NULL DEFAULT 'percent',
  ADD COLUMN vendor_discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE event_coupon_holds
  MODIFY COLUMN coupon_id BIGINT UNSIGNED NULL,
  ADD COLUMN hold_kind ENUM('coupon','vendor') NOT NULL DEFAULT 'coupon',
  ADD COLUMN applied_code VARCHAR(40) NULL;
