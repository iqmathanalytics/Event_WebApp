SET NAMES utf8mb4;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_yay_deal_event TINYINT(1) NOT NULL DEFAULT 0 AFTER one_of_a_kind_manual;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS deal_event_discount_code VARCHAR(80) NULL AFTER is_yay_deal_event;
