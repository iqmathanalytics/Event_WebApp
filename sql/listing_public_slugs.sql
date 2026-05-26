-- SEO-friendly public URLs for events, deals, and influencers

ALTER TABLE events
  ADD COLUMN public_slug VARCHAR(240) NULL AFTER title;

ALTER TABLE deals
  ADD COLUMN public_slug VARCHAR(240) NULL AFTER title;

ALTER TABLE influencers
  ADD COLUMN public_slug VARCHAR(240) NULL AFTER name;

CREATE UNIQUE INDEX uq_events_public_slug ON events (public_slug);
CREATE UNIQUE INDEX uq_deals_public_slug ON deals (public_slug);
CREATE UNIQUE INDEX uq_influencers_public_slug ON influencers (public_slug);
