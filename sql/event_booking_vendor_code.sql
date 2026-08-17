-- Buyer-entered vendor attribution on bookings (no discount).
ALTER TABLE event_bookings
  ADD COLUMN vendor_code VARCHAR(40) NULL AFTER coupon_code;
