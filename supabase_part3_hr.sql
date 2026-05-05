-- SIGO System - Supabase Migration Part 3 (HR & Controller)

-- 17. Employees
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
  status TEXT DEFAULT 'active',
  dismissal_date DATE,
  commuter_benefits BOOLEAN DEFAULT false,
  commuter_value1 NUMERIC,
  commuter_city1 TEXT,
  commuter_value2 NUMERIC,
  commuter_city2 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Time Records
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

-- 19. Controller Teams
CREATE TABLE IF NOT EXISTS controller_teams (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supervisor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Controller Equipments
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
  charges_percentage NUMERIC DEFAULT 0,
  overtime_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Controller Manpower
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

-- 22. Team Assignments
CREATE TABLE IF NOT EXISTS team_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  team_id TEXT REFERENCES controller_teams(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'equipment' | 'manpower'
  month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, member_id, month)
);

-- 23. Equipment Monthly Data
CREATE TABLE IF NOT EXISTS equipment_monthly_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  equipment_id TEXT REFERENCES controller_equipments(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipment_id, month)
);

-- 24. Manpower Monthly Data
CREATE TABLE IF NOT EXISTS manpower_monthly_data (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  manpower_id TEXT REFERENCES controller_manpower(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  salary NUMERIC DEFAULT 0,
  overtime_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manpower_id, month)
);

-- 27. Equipment Transfers
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

-- 25. Budget Schedules
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

-- 26. Measurement Templates
CREATE TABLE IF NOT EXISTS measurement_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  columns JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 27. Password Reset Requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  temp_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 28. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL, -- user UUID or 'group'
  company_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sender_name TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 29. Chat Notifications
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
