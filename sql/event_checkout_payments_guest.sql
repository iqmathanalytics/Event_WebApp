-- Allow Stripe checkout sessions for guest buyers (no user account).

ALTER TABLE event_checkout_payments
  MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
