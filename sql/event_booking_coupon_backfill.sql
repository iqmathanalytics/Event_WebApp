UPDATE event_bookings
SET subtotal_amount = total_amount
WHERE subtotal_amount IS NULL;
