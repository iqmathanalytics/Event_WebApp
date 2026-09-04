-- Optional sponsor inquiry contact shown on the public event page.
ALTER TABLE events
  ADD COLUMN sponsor_inquiry_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN sponsor_contact_email VARCHAR(190) NULL,
  ADD COLUMN sponsor_contact_phone VARCHAR(40) NULL;
