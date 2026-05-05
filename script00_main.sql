-- SIGO System - Supabase Complete Migration Script (Full Schema)
-- This script contains all tables and policies for the SIGO application.

-- 1. Infrastructure Tables
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  temp_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Quotations & Technical Room Base
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

-- 3. Operations & Contracts
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

-- 4. HR & Payroll
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  role TEXT,
  admission_date DATE,
  salary NUMERIC DEFAULT 0,
  payment_type TEXT,
  cpf TEXT,
  rg_number TEXT,
  rg_agency TEXT,
  rg_issuer TEXT,
  rg_state TEXT,
  birth_date DATE,
  birth_place TEXT,
  birth_state TEXT,
  work_booklet_number TEXT,
  work_booklet_series TEXT,
  pis TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  voter_id_number TEXT,
  voter_zone TEXT,
  voter_section TEXT,
  father_name TEXT,
  mother_name TEXT,
  spouse_name TEXT,
  dependents JSONB DEFAULT '[]',
  address_logradouro TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_zip_code TEXT,
  address_state TEXT,
  contract_id TEXT,
  commuter_benefits BOOLEAN DEFAULT false,
  commuter_value1 NUMERIC,
  commuter_city1 TEXT,
  commuter_value2 NUMERIC,
  commuter_city2 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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

-- 5. Controlador (Equipment & Teams)
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
  charges_percentage NUMERIC DEFAULT 0,
  overtime_percentage NUMERIC DEFAULT 0,
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
  equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
  month TEXT NOT NULL, 
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipment_id, month)
);

CREATE TABLE IF NOT EXISTS manpower_monthly_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  manpower_id TEXT REFERENCES controller_manpower(id) ON DELETE CASCADE,
  month TEXT NOT NULL, 
  salary NUMERIC DEFAULT 0,
  overtime_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manpower_id, month)
);

-- 6. Chat & Notifications
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sender_name TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'chat',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Purchases (Suprimentos)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    registration_number TEXT,
    supplier_code TEXT,
    activity TEXT,
    name TEXT NOT NULL,
    contact TEXT,
    nextel TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    neighborhood_city TEXT,
    zip_code TEXT,
    state TEXT,
    email_website TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    order_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    order_date DATE,
    delivery_date DATE,
    delivery_street TEXT,
    delivery_number TEXT,
    delivery_complement TEXT,
    delivery_neighborhood TEXT,
    delivery_zip_code TEXT,
    delivery_city TEXT,
    delivery_state TEXT,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    additions DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    observations TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    code TEXT,
    description TEXT NOT NULL,
    unit TEXT,
    quantity DECIMAL(15,2) DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_payments (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    due_date DATE,
    value DECIMAL(15,2) DEFAULT 0,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. RLS Policies
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_schedules ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pluviometry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE manpower_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON app_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON password_reset_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON service_compositions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON budget_schedules FOR ALL USING (true) WITH CHECK (true);
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
CREATE POLICY "Allow public access" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON daily_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON pluviometry_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON controller_manpower FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON equipment_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON manpower_monthly_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON chat_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_order_payments FOR ALL USING (true) WITH CHECK (true);

