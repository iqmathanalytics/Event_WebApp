-- Track whether booking confirmation emails were accepted by Brevo.
ALTER TABLE event_bookings
  ADD COLUMN guest_confirmation_email_sent_at DATETIME NULL,
  ADD COLUMN organizer_notification_email_sent_at DATETIME NULL,
  ADD COLUMN booking_email_last_error VARCHAR(500) NULL;
