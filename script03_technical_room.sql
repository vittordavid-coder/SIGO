-- SIGO System - Supabase Migration Script 03 (Sala Técnica)

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  quotation_id TEXT,
  contract_number TEXT NOT NULL,
  work_name TEXT,
  total_value NUMERIC DEFAULT 0,
  object TEXT,
  client TEXT,
  contractor TEXT,
  start_date DATE,
  end_date DATE,
  supervisor TEXT,
  notes TEXT,
  measurement_unit TEXT,
  measurement_unit_value TEXT,
  initial_station TEXT,
  final_station TEXT,
  services JSONB DEFAULT '[]',
  groups JSONB DEFAULT '[]',
  group_adjustments JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  number INTEGER,
  period TEXT,
  date DATE,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS measurement_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  columns JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technical_schedules (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  start_date DATE,
  duration INTEGER,
  time_unit TEXT,
  services JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id)
);

CREATE TABLE IF NOT EXISTS calculation_memories (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE,
  service_id TEXT,
  rows JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, measurement_id, service_id)
);

CREATE TABLE IF NOT EXISTS service_productions (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  service_id TEXT,
  month TEXT,
  num_equip INTEGER,
  work_days INTEGER,
  hours_day NUMERIC,
  unit_hour NUMERIC,
  efficiency NUMERIC,
  rain_percent NUMERIC,
  start_date DATE,
  end_date DATE,
  prev_month_accumulated NUMERIC DEFAULT 0,
  daily_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, service_id, month)
);

CREATE TABLE IF NOT EXISTS highway_locations (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT,
  material_ids JSONB DEFAULT '[]',
  reference_station TEXT,
  lateral_distance NUMERIC,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS station_groups (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT,
  initial_station TEXT,
  final_station TEXT,
  material_ids JSONB DEFAULT '[]',
  volume NUMERIC,
  service_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cubation_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE,
  station_group_id TEXT,
  service_id TEXT,
  rows JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, measurement_id, station_group_id, service_id)
);

CREATE TABLE IF NOT EXISTS transport_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE,
  service_id TEXT,
  rows JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, measurement_id, service_id)
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE highway_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cubation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contracts in their tenant" ON contracts;
DROP POLICY IF EXISTS "Users can view measurements in their tenant" ON measurements;
DROP POLICY IF EXISTS "Users can view measurement_templates in their tenant" ON measurement_templates;
DROP POLICY IF EXISTS "Users can view technical_schedules in their tenant" ON technical_schedules;
DROP POLICY IF EXISTS "Users can view calculation_memories in their tenant" ON calculation_memories;
DROP POLICY IF EXISTS "Users can view service_productions in their tenant" ON service_productions;
DROP POLICY IF EXISTS "Users can view highway_locations in their tenant" ON highway_locations;
DROP POLICY IF EXISTS "Users can view station_groups in their tenant" ON station_groups;
DROP POLICY IF EXISTS "Users can view cubation_data in their tenant" ON cubation_data;
DROP POLICY IF EXISTS "Users can view transport_data in their tenant" ON transport_data;

DROP POLICY IF EXISTS "Users can modify contracts in their tenant" ON contracts;
DROP POLICY IF EXISTS "Users can modify measurements in their tenant" ON measurements;
DROP POLICY IF EXISTS "Users can modify measurement_templates in their tenant" ON measurement_templates;
DROP POLICY IF EXISTS "Users can modify technical_schedules in their tenant" ON technical_schedules;
DROP POLICY IF EXISTS "Users can modify calculation_memories in their tenant" ON calculation_memories;
DROP POLICY IF EXISTS "Users can modify service_productions in their tenant" ON service_productions;
DROP POLICY IF EXISTS "Users can modify highway_locations in their tenant" ON highway_locations;
DROP POLICY IF EXISTS "Users can modify station_groups in their tenant" ON station_groups;
DROP POLICY IF EXISTS "Users can modify cubation_data in their tenant" ON cubation_data;
DROP POLICY IF EXISTS "Users can modify transport_data in their tenant" ON transport_data;

CREATE POLICY "Allow public access" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON measurements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON measurement_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON technical_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON calculation_memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON service_productions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON highway_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON station_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON cubation_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON transport_data FOR ALL USING (true) WITH CHECK (true);
