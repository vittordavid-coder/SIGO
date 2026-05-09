-- SIGO System - Controller Tab Database Sync Script
-- This script ensures all tables for the "Controlador" tab are correctly structured in Supabase.
-- Copy and run this in the Supabase SQL Editor.

BEGIN;

-- 1. equipments (Target for ControllerEquipment)
-- Note: 'ControllerRoom' tab uses 'equipments' table name in App.tsx
CREATE TABLE IF NOT EXISTS equipments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
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

-- Ensure all columns exist (idempotent updates)
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS situation TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS in_maintenance BOOLEAN DEFAULT false;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_entry_date TIMESTAMPTZ;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS charges_percentage NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS overtime_percentage NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurement_unit TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_reading NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';

-- 2. equipment_maintenance
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

-- 3. equipment_monthly_data
CREATE TABLE IF NOT EXISTS equipment_monthly_data (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(equipment_id, month)
);

-- 4. controller_manpower
CREATE TABLE IF NOT EXISTS controller_manpower (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    name TEXT NOT NULL,
    role TEXT,
    daily_worker TEXT,
    entry_date DATE,
    exit_date DATE,
    charges_percentage NUMERIC DEFAULT 0,
    overtime_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. manpower_monthly_data
CREATE TABLE IF NOT EXISTS manpower_monthly_data (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    manpower_id TEXT REFERENCES controller_manpower(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    salary NUMERIC DEFAULT 0,
    overtime_rate NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(manpower_id, month)
);

-- 6. controller_teams
CREATE TABLE IF NOT EXISTS controller_teams (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    name TEXT NOT NULL,
    supervisor_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. team_assignments
CREATE TABLE IF NOT EXISTS team_assignments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    team_id TEXT REFERENCES controller_teams(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL, -- Can be Equipment or Manpower ID
    type TEXT NOT NULL, -- 'equipment' | 'manpower'
    month TEXT NOT NULL, -- YYYY-MM
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, member_id, month)
);

-- 8. equipment_transfers
CREATE TABLE IF NOT EXISTS equipment_transfers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
    source_contract_id TEXT,
    target_contract_id TEXT,
    transfer_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --- SECURITY SETUP (RLS) ---

-- Enable RLS on all relevant tables
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE manpower_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_transfers ENABLE ROW LEVEL SECURITY;

-- Apply "Allow public access" policy to each table
-- This mimics the application's current open-access setup for simplicity
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_name IN (
        'equipments', 'equipment_maintenance', 'equipment_monthly_data', 
        'controller_manpower', 'manpower_monthly_data', 'controller_teams', 
        'team_assignments', 'equipment_transfers'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow public access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

COMMIT;
