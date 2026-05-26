SET NAMES utf8mb4;

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS show_in_dropdown TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

UPDATE cities SET show_in_dropdown = 1 WHERE slug IN (
  'atlanta-ga',
  'austin-tx',
  'dallas-tx',
  'houston-tx',
  'san-antonio-tx',
  'simi-valley-ca',
  'boise-id',
  'phoenix-az',
  'san-francisco-ca',
  'ashburn-va',
  'raleigh-nc',
  'new-york-ny',
  'los-angeles-ca',
  'miami-fl',
  'chicago-il',
  'san-diego-ca',
  'seattle-wa',
  'boston-ma',
  'las-vegas-nv',
  'denver-co',
  'orlando-fl',
  'washington-dc',
  'nashville-tn',
  'san-jose-ca',
  'portland-or',
  'others-us'
);
