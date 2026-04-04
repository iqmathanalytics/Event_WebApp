-- Additional event banner/gallery images (JSON array of HTTPS URLs). Primary cover remains `image_url`.
-- Run once; if column already exists, skip or remove duplicate statement.
ALTER TABLE events
  ADD COLUMN gallery_image_urls JSON NULL AFTER image_url;
