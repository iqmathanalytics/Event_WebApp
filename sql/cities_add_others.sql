-- Global "Others" city for dropdowns (navbar, forms, admin filters).
SET NAMES utf8mb4;

INSERT INTO cities (id, name, state, slug, is_active) VALUES
  (21, 'Others', 'US', 'others-us', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  state = VALUES(state),
  slug = VALUES(slug),
  is_active = VALUES(is_active);
