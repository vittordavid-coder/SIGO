
-- SIGO Database Fix Script

-- 1. Suppliers Fixes
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS assigned_contract_ids JSONB DEFAULT '[]';

-- 2. Purchase Requests Fixes
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';

-- 3. Purchase Orders Fixes
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS request_id TEXT;

-- 4. Equipments Unification
-- Ensure the 'equipments' table exists with the full schema
CREATE TABLE IF NOT EXISTS equipments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT, -- Note: foreign key might fail if table contracts doesn't exist yet in a fresh DB, so we add it safely
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

-- Try to add the constraint if missing and possible
DO $$
BEGIN
    BEGIN
        ALTER TABLE equipments ADD CONSTRAINT equipments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN OTHERS THEN RAISE NOTICE 'Could not add foreign key constraint on equipments.contract_id';
    END;
END $$;

-- Handle existing data from controller_equipments if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'controller_equipments') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'equipments') THEN
    -- Only insert if controller_equipments has data and equipments is empty or we want to merge
    INSERT INTO equipments SELECT * FROM controller_equipments ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Migrated data from controller_equipments to equipments';
  END IF;
END $$;

-- 5. Equipment Maintenance Table
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

-- 6. RLS and Policies Fixes
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['equipments', 'equipment_maintenance', 'purchase_requests', 'purchase_quotations', 'purchase_orders', 'suppliers'])
    LOOP
        EXECUTE format('DO $inner$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''Allow public access'' AND tablename = %L) THEN CREATE POLICY "Allow public access" ON %I FOR ALL USING (true); END IF; END $inner$', t, t);
    END LOOP;
END $$;

-- 7. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Could not create publication';
END $$;

-- Try adding tables to publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE equipments, equipment_maintenance, purchase_requests, purchase_orders, suppliers;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Publication table addition failed or already present';
END $$;
