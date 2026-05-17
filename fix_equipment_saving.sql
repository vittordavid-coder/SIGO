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
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_entry_date TIMESTAMPTZ;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_exit_date TIMESTAMPTZ;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Convert columns to JSONB safely if they are not already
DO $$
DECLARE
    col_name TEXT;
    target_table TEXT := 'equipments';
BEGIN
    FOR col_name IN SELECT unnest(ARRAY['measurements', 'photos', 'history', 'custom_fields'])
    LOOP
        -- Check if column exists and is not JSONB/JSON
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = col_name AND data_type NOT IN ('jsonb', 'json')) THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', target_table, col_name);
            -- USE ::jsonb instead of to_jsonb to correctly parse existing string as JSON array/object
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE JSONB USING CASE WHEN %I IS NULL OR %I = '''' THEN (CASE WHEN %L = ''custom_fields'' THEN ''{}''::jsonb ELSE ''[]''::jsonb END) ELSE %I::jsonb END', target_table, col_name, col_name, col_name, col_name, col_name);
            IF col_name = 'custom_fields' THEN
                EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ''{}''::jsonb', target_table, col_name);
            ELSE
                EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', target_table, col_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Update RLS policies to ensure public access is allowed for updates
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipments') THEN
    CREATE POLICY "Allow public access" ON equipments FOR ALL USING (true) WITH CHECK (true);
  ELSE
    DROP POLICY "Allow public access" ON equipments;
    CREATE POLICY "Allow public access" ON equipments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
