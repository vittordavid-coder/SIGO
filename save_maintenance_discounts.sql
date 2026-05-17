-- Script to create maintenance discounts table and save logic

-- 1. Create table
CREATE TABLE IF NOT EXISTS maintenance_discounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  maintenance_id TEXT REFERENCES equipment_maintenance(id),
  measurement_id TEXT, -- Assuming measurement might use a text ID or link
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Since the application handles measurements inside equipment as JSONB,
-- if "measurement_id" is needed, it might need to be a string or we might need to store the measurement index/date.
-- If the user wants to save this from the UI directly, you would call:
-- INSERT INTO maintenance_discounts (maintenance_id, measurement_id) VALUES ($1, $2);

-- If you want to update the maintenance table itself with the discount status:
-- ALTER TABLE equipment_maintenance ADD COLUMN IF NOT EXISTS discounted_in_measurement_id UUID;
