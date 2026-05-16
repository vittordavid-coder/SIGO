
-- Update equipments table with missing fields for Controller module
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';

-- Ensure the table name is unified if controller_equipments still exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'controller_equipments') THEN
        -- Add missing columns to controller_equipments too, just in case
        ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
        ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
        ALTER TABLE controller_equipments ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';
    END IF;
END $$;

-- Fix equipment_maintenance table if it has old date types
DO $$
BEGIN
    -- Change to standard TIMESTAMPTZ for consistency if needed
    -- (ALTER TABLE handles this if it's already compatible)
    ALTER TABLE equipment_maintenance ALTER COLUMN entry_date TYPE TIMESTAMPTZ USING entry_date::TIMESTAMPTZ;
    ALTER TABLE equipment_maintenance ALTER COLUMN exit_date TYPE TIMESTAMPTZ USING exit_date::TIMESTAMPTZ;
EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'Maintenance date types already compatible or could not be altered';
END $$;
