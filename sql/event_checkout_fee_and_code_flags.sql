-- Per-event checkout fees, vendor/coupon visibility, and events-page listing toggle.
ALTER TABLE events
  ADD COLUMN service_fee_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN service_fee_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  ADD COLUMN service_fee_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN platform_fee_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN platform_fee_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  ADD COLUMN platform_fee_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN vendor_code_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN vendor_code VARCHAR(40) NULL,
  ADD COLUMN coupon_codes_enabled TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN show_on_events_page TINYINT(1) NOT NULL DEFAULT 1;
