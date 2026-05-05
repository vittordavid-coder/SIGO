-- SIGO System - Supabase Migration Script 02 (Cotações)

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  type TEXT,
  base_price NUMERIC DEFAULT 0,
  encargos NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_compositions (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  production NUMERIC DEFAULT 1,
  fit NUMERIC DEFAULT 1,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  budget_name TEXT,
  organization TEXT,
  date DATE,
  sector_responsible TEXT,
  requester_sector TEXT,
  year INTEGER,
  trecho TEXT,
  municipios TEXT,
  rodovias TEXT,
  version TEXT,
  extension TEXT,
  base_date TEXT,
  services JSONB DEFAULT '[]',
  groups JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_schedules (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  quotation_id TEXT REFERENCES quotations(id) ON DELETE CASCADE,
  start_date DATE,
  duration INTEGER,
  time_unit TEXT,
  distribution_type TEXT,
  services JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON service_compositions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON budget_schedules FOR ALL USING (true) WITH CHECK (true);
