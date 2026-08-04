-- Allow storing vendor codes (up to 40 chars) on bookings.
ALTER TABLE event_bookings
  MODIFY COLUMN coupon_code VARCHAR(40) NULL;
