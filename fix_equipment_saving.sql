
-- Ensure all columns for the Controller module exist on the equipments table
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_reading NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurement_unit TEXT DEFAULT 'Horímetro';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Próprio';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS owner_cnpj TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS situation TEXT DEFAULT 'Ativo';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS plate TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS charges_percentage NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS overtime_percentage NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS in_maintenance BOOLEAN DEFAULT FALSE;

-- Fix potential type issues for existing columns
DO $$
BEGIN
    -- If measurements exists but is not JSONB, try to convert
    -- We check the specific column type to avoid invalid casts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipments' AND column_name = 'measurements' AND data_type NOT IN ('jsonb', 'json')) THEN
        ALTER TABLE equipments ALTER COLUMN measurements DROP DEFAULT;
        ALTER TABLE equipments ALTER COLUMN measurements TYPE JSONB USING to_jsonb(measurements);
        ALTER TABLE equipments ALTER COLUMN measurements SET DEFAULT '[]'::jsonb;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipments' AND column_name = 'photos' AND data_type NOT IN ('jsonb', 'json')) THEN
        ALTER TABLE equipments ALTER COLUMN photos DROP DEFAULT;
        ALTER TABLE equipments ALTER COLUMN photos TYPE JSONB USING to_jsonb(photos);
        ALTER TABLE equipments ALTER COLUMN photos SET DEFAULT '[]'::jsonb;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipments' AND column_name = 'history' AND data_type NOT IN ('jsonb', 'json')) THEN
        ALTER TABLE equipments ALTER COLUMN history DROP DEFAULT;
        ALTER TABLE equipments ALTER COLUMN history TYPE JSONB USING to_jsonb(history);
        ALTER TABLE equipments ALTER COLUMN history SET DEFAULT '[]'::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipments' AND column_name = 'custom_fields' AND data_type NOT IN ('jsonb', 'json')) THEN
        ALTER TABLE equipments ALTER COLUMN custom_fields DROP DEFAULT;
        ALTER TABLE equipments ALTER COLUMN custom_fields TYPE JSONB USING to_jsonb(custom_fields);
        ALTER TABLE equipments ALTER COLUMN custom_fields SET DEFAULT '{}'::jsonb;
    END IF;
END $$;
