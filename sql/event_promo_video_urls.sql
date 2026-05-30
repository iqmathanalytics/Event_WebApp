-- YouTube promo videos for event detail pages (registered users only).
ALTER TABLE events
  ADD COLUMN promo_video_urls JSON NULL AFTER gallery_image_urls;
