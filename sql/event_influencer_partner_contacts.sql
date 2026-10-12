-- Separate contact details for influencer-partner inquiries (in addition to enabled flag).
ALTER TABLE events
  ADD COLUMN influencer_partner_contact_email VARCHAR(190) NULL,
  ADD COLUMN influencer_partner_contact_phone VARCHAR(40) NULL;
