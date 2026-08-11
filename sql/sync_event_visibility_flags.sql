-- Keep organizer "Active" (show_on_events_page) and admin Active (is_listed) aligned.
-- Run once after deploying the organizer visibility sync so already-hidden events
-- drop from the hero slider / public listings immediately.

UPDATE events
SET is_listed = 0
WHERE COALESCE(show_on_events_page, 1) = 0
  AND COALESCE(is_listed, 1) = 1;

UPDATE events
SET show_on_events_page = 0
WHERE COALESCE(is_listed, 1) = 0
  AND COALESCE(show_on_events_page, 1) = 1;
