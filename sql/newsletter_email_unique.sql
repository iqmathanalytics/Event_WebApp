-- One row per email: remove duplicates (keep lowest id), then replace (email, city_id) unique with unique on email.

DELETE ns1 FROM newsletter_subscribers ns1
INNER JOIN newsletter_subscribers ns2
  ON LOWER(TRIM(ns1.email)) = LOWER(TRIM(ns2.email)) AND ns1.id > ns2.id;

ALTER TABLE newsletter_subscribers DROP INDEX uq_newsletter_email_city;

ALTER TABLE newsletter_subscribers ADD UNIQUE KEY uq_newsletter_email (email);
