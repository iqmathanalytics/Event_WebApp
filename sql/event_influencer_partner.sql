-- Optional influencer-partner inquiry CTA on the public event page (shares sponsor contact fields).
ALTER TABLE events
  ADD COLUMN influencer_partner_enabled TINYINT(1) NOT NULL DEFAULT 0;
