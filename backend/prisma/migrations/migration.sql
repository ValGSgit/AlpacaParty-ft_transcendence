-- User/Farm data split migration.
-- Keeps backward compatibility for existing code while moving farm state
-- to alpaca_farms as the canonical store.

BEGIN;

CREATE TABLE IF NOT EXISTS alpaca_farms (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_data JSONB DEFAULT '{"alpacas":[],"resources":{"gold":100,"food":50},"level":1}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure every user has a farm row.
INSERT INTO alpaca_farms (user_id)
SELECT u.id
FROM users u
LEFT JOIN alpaca_farms af ON af.user_id = u.id
WHERE af.user_id IS NULL;

-- Backfill farm alpacas from legacy users.alpacas when farm_data is still empty/default.
UPDATE alpaca_farms af
SET farm_data = jsonb_set(
  COALESCE(af.farm_data, '{"alpacas":[],"resources":{"gold":100,"food":50},"level":1}'::jsonb),
  '{alpacas}',
  COALESCE(u.alpacas, '[]'::jsonb),
  true
),
updated_at = NOW()
FROM users u
WHERE af.user_id = u.id
  AND (
    af.farm_data IS NULL
    OR af.farm_data->'alpacas' IS NULL
    OR jsonb_typeof(af.farm_data->'alpacas') <> 'array'
    OR af.farm_data->'alpacas' = '[]'::jsonb
  )
  AND COALESCE(u.alpacas, '[]'::jsonb) <> '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_alpaca_farms_user_id ON alpaca_farms(user_id);

COMMIT;