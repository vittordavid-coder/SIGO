-- SIGO System - Update Controller Equipments Table
-- Adding maintenance details

ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS maintenance_entry_date DATE;
ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS measurement_unit TEXT;

-- Update RLS policies if needed (usually true for these scripts)
DROP POLICY IF EXISTS "Allow public access" ON controller_equipments;
CREATE POLICY "Allow public access" ON controller_equipments FOR ALL USING (true) WITH CHECK (true);
