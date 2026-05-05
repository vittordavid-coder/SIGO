-- SIGO System - Supabase Migration Part 2 (Operational Tables)

-- 8. Daily Reports (RDO)
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

-- 9. Pluviometry Records
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

-- 10. Technical Schedules
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

-- 11. Calculation Memories
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

-- 12. Service Productions
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

-- 13. Highway Locations
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

-- 14. Station Groups
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

-- 15. Cubation Data
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

-- 16. Transport Data
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
