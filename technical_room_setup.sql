-- SQL Script for Technical Room Update
-- This ensures all tables for the Technical Room are present and secured.

-- 1. Main Technical Schedule
CREATE TABLE IF NOT EXISTS technical_schedules (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    start_date DATE,
    duration INTEGER,
    time_unit TEXT, -- 'days', 'weeks', 'months'
    services JSONB DEFAULT '[]', -- JSON array of {serviceId, distribution: [{periodIndex, plannedQty, actualQty, ...}]}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Daily Progress Reports (RDO)
CREATE TABLE IF NOT EXISTS daily_reports (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weather_morning TEXT,
    weather_afternoon TEXT,
    weather_night TEXT,
    rainfall_mm NUMERIC DEFAULT 0,
    manpower JSONB DEFAULT '[]',
    equipment JSONB DEFAULT '[]',
    activities JSONB DEFAULT '[]',
    accidents TEXT,
    fiscalization_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contract_id, date)
);

-- 3. Pluviometry Records
CREATE TABLE IF NOT EXISTS pluviometry_records (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    night_status TEXT,
    morning_status TEXT,
    afternoon_status TEXT,
    rainfall_mm NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contract_id, date)
);

-- 4. Teams and Manpower
CREATE TABLE IF NOT EXISTS controller_teams (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    supervisor_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS controller_manpower (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
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

-- 5. Equipments
CREATE TABLE IF NOT EXISTS controller_equipments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model TEXT,
    plate TEXT,
    origin TEXT,
    category TEXT,
    entry_date DATE,
    exit_date DATE,
    in_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_entry_date DATE,
    maintenance_type TEXT,
    measurement_unit TEXT,
    charges_percentage NUMERIC DEFAULT 0,
    overtime_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Assignments and Monthly Data
CREATE TABLE IF NOT EXISTS team_assignments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES controller_teams(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'manpower' or 'equipment'
    month TEXT NOT NULL, -- Format YYYY-MM
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, member_id, month)
);

CREATE TABLE IF NOT EXISTS equipment_monthly_data (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(equipment_id, month)
);

CREATE TABLE IF NOT EXISTS manpower_monthly_data (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    manpower_id TEXT REFERENCES controller_manpower(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    salary NUMERIC DEFAULT 0,
    overtime_rate NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(manpower_id, month)
);

-- Add support table for normalized services (optional but good for future)
CREATE TABLE IF NOT EXISTS technical_schedule_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technical_schedule_id TEXT REFERENCES technical_schedules(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    distribution JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(technical_schedule_id, service_id)
);

-- Enable RLS and add basic policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'technical_schedules', 
        'daily_reports', 
        'pluviometry_records', 
        'controller_teams', 
        'controller_manpower', 
        'controller_equipments', 
        'team_assignments', 
        'equipment_monthly_data', 
        'manpower_monthly_data',
        'technical_schedule_services'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON %I;', t);
        EXECUTE format('CREATE POLICY "Allow public access" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;
