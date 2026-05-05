-- SIGO System - Supabase Migration Part 1 (Core Tables)

-- DANGER: The following lines will drop all existing tables to ensure a clean slate.
DROP TABLE IF EXISTS chat_notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS measurement_templates CASCADE;
DROP TABLE IF EXISTS budget_schedules CASCADE;
DROP TABLE IF EXISTS manpower_monthly_data CASCADE;
DROP TABLE IF EXISTS equipment_monthly_data CASCADE;
DROP TABLE IF EXISTS team_assignments CASCADE;
DROP TABLE IF EXISTS controller_manpower CASCADE;
DROP TABLE IF EXISTS controller_equipments CASCADE;
DROP TABLE IF EXISTS controller_teams CASCADE;
DROP TABLE IF EXISTS time_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS transport_data CASCADE;
DROP TABLE IF EXISTS cubation_data CASCADE;
DROP TABLE IF EXISTS station_groups CASCADE;
DROP TABLE IF EXISTS highway_locations CASCADE;
DROP TABLE IF EXISTS service_productions CASCADE;
DROP TABLE IF EXISTS calculation_memories CASCADE;
DROP TABLE IF EXISTS technical_schedules CASCADE;
DROP TABLE IF EXISTS pluviometry_records CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS service_compositions CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS app_state CASCADE;

-- 0. App State (Blob Storage Fallback)
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  company_name TEXT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'editor',
  allowed_quotation_ids JSONB DEFAULT '[]',
  allowed_contract_ids JSONB DEFAULT '[]',
  allowed_modules JSONB DEFAULT '[]',
  keys INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  email TEXT,
  is_approved BOOLEAN DEFAULT false,
  job_function TEXT,
  must_change_password BOOLEAN DEFAULT false,
  session_id TEXT,
  desired_plan TEXT,
  desired_modules JSONB DEFAULT '[]',
  has_company BOOLEAN DEFAULT false,
  keys_expires_at TIMESTAMPTZ,
  profile_photo TEXT,
  phone TEXT,
  address TEXT,
  email_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  user_name TEXT,
  action TEXT,
  details TEXT,
  module TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Resources (Insumos)
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

-- 4. Service Compositions (Composições)
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

-- 5. Quotations (Orcamentos)
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

-- 6. Contracts
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

-- 7. Measurements (Medicoes)
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
