
-- SQL Patch: Fuel System Updates - Sigo
-- This script updates the fuel management system to use the term "Reservoirs" and adds fuel type support.

-- 1. Create or Rename fuel_tanks to fuel_reservoirs
-- If fuel_tanks exists, we rename it. If not, we create fuel_reservoirs.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'fuel_tanks') THEN
        ALTER TABLE fuel_tanks RENAME TO fuel_reservoirs;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS fuel_reservoirs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    name TEXT NOT NULL,
    capacity NUMERIC DEFAULT 0,
    current_level NUMERIC DEFAULT 0,
    fuel_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create fuel_logs table if not exists
CREATE TABLE IF NOT EXISTS fuel_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    tank_id TEXT REFERENCES fuel_reservoirs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'entrada' or 'saida'
    date DATE NOT NULL,
    quantity NUMERIC NOT NULL,
    equipment_id TEXT,
    notes TEXT,
    cost NUMERIC,
    supplier TEXT,
    unit_price NUMERIC,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE fuel_reservoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['fuel_reservoirs', 'fuel_logs'])
    LOOP
        EXECUTE format('DO $inner$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''Allow public access'' AND tablename = %L) THEN CREATE POLICY "Allow public access" ON %I FOR ALL USING (true); END IF; END $inner$', t, t);
    END LOOP;
END $$;

-- 5. Realtime Publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE fuel_reservoirs, fuel_logs;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Tables already in publication or publication missing';
END $$;
