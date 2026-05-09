-- Script to fix and synchronize Controller tables
-- 1. Rename controller_equipments to equipments if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'controller_equipments') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'equipments') THEN
    ALTER TABLE controller_equipments RENAME TO equipments;
  END IF;
END $$;

-- 2. Ensure equipments table has all required columns
CREATE TABLE IF NOT EXISTS equipments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  situation TEXT,
  plate TEXT,
  origin TEXT,
  category TEXT,
  entry_date DATE,
  exit_date DATE,
  in_maintenance BOOLEAN DEFAULT false,
  maintenance_entry_date TIMESTAMPTZ,
  maintenance_type TEXT,
  charges_percentage NUMERIC DEFAULT 0,
  overtime_percentage NUMERIC DEFAULT 0,
  measurement_unit TEXT,
  current_reading NUMERIC DEFAULT 0,
  observations TEXT,
  custom_fields JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to equipments if it already existed
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS situation TEXT DEFAULT 'Ativo';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_reading NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_entry_date TIMESTAMPTZ;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurement_unit TEXT;

-- 3. Fix maintenance table references
DO $$ 
BEGIN
  -- If equipment_maintenance references controller_equipments, we need to update it
  -- This is usually handled by the RENAME TO if there's a foreign key, 
  -- but sometimes it's better to be explicit if the rename didn't happen as expected.
  NULL; 
END $$;

-- Ensure equipment_maintenance uses TIMESTAMPTZ for dates and refers to correct table
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
  company_id TEXT,
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  type TEXT,
  requested_items TEXT,
  days_in_maintenance INTEGER DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS and add policies for equipments
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON equipments;
CREATE POLICY "Allow public access" ON equipments FOR ALL USING (true) WITH CHECK (true);

-- 5. Fix other controller tables
ALTER TABLE IF EXISTS controller_manpower ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE IF EXISTS controller_manpower ADD COLUMN IF NOT EXISTS exit_date DATE;

-- Ensure equipment_monthly_data references equipments
CREATE TABLE IF NOT EXISTS equipment_monthly_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
  month TEXT NOT NULL, 
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipment_id, month)
);

-- Ensure equipment_transfers references equipments
CREATE TABLE IF NOT EXISTS equipment_transfers (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
  source_contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  target_contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  transfer_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Verify and update Daily Reports (RDO)
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS rainfall_mm NUMERIC DEFAULT 0;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS manpower JSONB DEFAULT '[]';
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]';
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]';

-- 7. Verify and update Manpower
ALTER TABLE controller_manpower ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE controller_manpower ADD COLUMN IF NOT EXISTS daily_worker TEXT;
ALTER TABLE controller_manpower ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE controller_manpower ADD COLUMN IF NOT EXISTS exit_date DATE;

-- 8. Verify and update Pluviometry
ALTER TABLE pluviometry_records ADD COLUMN IF NOT EXISTS rainfall_mm NUMERIC DEFAULT 0;
