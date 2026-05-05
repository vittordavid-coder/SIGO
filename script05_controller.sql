-- SIGO System - Supabase Migration Script 05 (Controlador)

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

CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry TEXT,
  exit TEXT,
  overtime TEXT,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS controller_teams (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supervisor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
  company_id TEXT,
  entry_date DATE NOT NULL,
  exit_date DATE,
  type TEXT, -- 'preventive' or 'corrective'
  requested_items TEXT,
  duration_days INTEGER,
  total_cost NUMERIC DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS team_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES controller_teams(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  type TEXT NOT NULL, 
  month TEXT NOT NULL, 
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

CREATE TABLE IF NOT EXISTS equipment_transfers (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
  source_contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  target_contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  transfer_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pluviometry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE manpower_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON daily_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON pluviometry_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_manpower FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON equipment_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON manpower_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON equipment_transfers FOR ALL USING (true) WITH CHECK (true);
