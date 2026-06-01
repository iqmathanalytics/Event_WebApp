-- Public visibility toggle (admin): approved events can be hidden from the site without rejecting.
ALTER TABLE events
  ADD COLUMN is_listed TINYINT(1) NOT NULL DEFAULT 1 AFTER status;
