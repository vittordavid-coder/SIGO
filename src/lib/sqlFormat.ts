import { 
  Resource, ServiceComposition, Quotation, User, Contract, Measurement, AuditLog, 
  HighwayLocation, StationGroup, CubationData, TransportData, CalculationMemory, 
  ServiceProduction, DailyReport, PluviometryRecord, TechnicalSchedule, Employee, 
  TimeRecord, MeasurementTemplate, Schedule,
  ControllerTeam, ControllerEquipment, EquipmentMonthlyData, ControllerManpower,
  ManpowerMonthlyData, TeamAssignment, PasswordResetRequest
} from '../types';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function escapeSQL(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') {
    let finalValue = value.trim();
    // Handle ISO strings (e.g., 2026-04-21T00:00:00.000Z) for DATE columns
    if (/^\d{4}-\d{2}-\d{2}T/.test(finalValue)) {
      return `'${finalValue.split('T')[0]}'`;
    }
    // Standardize date format: if it matches DD/MM/YYYY, convert to YYYY-MM-DD for Postgres compatibility
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(finalValue)) {
      const [day, month, year] = finalValue.split('/');
      return `'${year}-${month}-${day}'`;
    }
    return `'${finalValue.replace(/'/g, "''")}'`;
  }
  // For arrays and objects, use JSON string and cast to JSONB
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function generateInsert(tableName: string, items: any[]): string {
  if (!items || items.length === 0) return `-- No data for ${tableName}\n`;
  
  // Aggregate all unique keys from all items to handle sparse objects safely
  const allKeys = new Set<string>();
  items.forEach(item => {
    Object.keys(item).forEach(key => {
      if (typeof item[key] !== 'function') {
        allKeys.add(key);
      }
    });
  });
  
  const jsColumns = Array.from(allKeys);
  const sqlColumns = jsColumns.map(camelToSnake);
  
  const baseHeader = `INSERT INTO ${tableName} (${sqlColumns.join(', ')}) VALUES`;
  
  // Split into chunks if there are many items to avoid "Query too large" errors in Supabase dashboard
  // Reduced chunkSize = 1 for maximal safety with large JSONB fields
  const chunkSize = 1;
  let sql = '';
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const values = chunk.map(item => {
      const row = jsColumns.map(col => {
        let val = item[col];
        
        // Special handling for JSONB columns that might receive primitives (like app_state.content)
        const isJsonColumn = (tableName === 'app_state' && col === 'content') || 
                            col.toLowerCase().endsWith('modules') || 
                            col.toLowerCase().endsWith('ids') ||
                            ['services', 'groups', 'items', 'rows', 'groupAdjustments', 'dailyData', 'manpower', 'equipment', 'activities', 'columns', 'priceHistory', 'history', 'dependents', 'emailConfig'].includes(col);

        if (isJsonColumn && val !== null && val !== undefined) {
          // Compact JSON and escape single quotes for SQL
          return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        }
        
        return escapeSQL(val);
      });
      return `(${row.join(', ')})`;
    });
    const updateClauses = sqlColumns
      .filter(col => col !== 'id')
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
      
    const conflictClause = updateClauses ? ` ON CONFLICT (id) DO UPDATE SET ${updateClauses}` : ' ON CONFLICT (id) DO NOTHING';

    sql += `${baseHeader} ${values.join(', ')}${conflictClause};\n\n`;
  }

  return sql;
}

export const DB_TABLES = [
  'app_state', 'users', 'audit_logs', 'resources', 'service_compositions', 'quotations', 
  'contracts', 'measurements', 'daily_reports', 'pluviometry_records', 
  'technical_schedules', 'calculation_memories', 'service_productions', 
  'highway_locations', 'station_groups', 'cubation_data', 'transport_data', 
  'employees', 'time_records', 'controller_teams', 'equipments', 
  'controller_manpower', 'equipment_transfers', 'equipment_maintenance',
  'team_assignments', 'equipment_monthly_data', 'manpower_monthly_data', 
  'budget_schedules', 'measurement_templates', 'password_reset_requests', 
  'chat_messages', 'chat_notifications', 'suppliers', 
  'purchase_requests', 'purchase_quotations', 'purchase_orders',
  'purchase_order_items', 'purchase_order_payments', 'fuel_reservoirs', 'fuel_logs'
];

export function generateFullSQLScript(data: {
  users: User[];
  resources: Resource[];
  services: ServiceComposition[];
  quotations: Quotation[];
  contracts: Contract[];
  measurements: Measurement[];
  auditLogs: AuditLog[];
  highwayLocations: HighwayLocation[];
  stationGroups: StationGroup[];
  cubationData: CubationData[];
  transportData: TransportData[];
  memories: CalculationMemory[];
  serviceProductions: ServiceProduction[];
  dailyReports: DailyReport[];
  pluviometryRecords: PluviometryRecord[];
  technicalSchedules: TechnicalSchedule[];
  employees: Employee[];
  timeRecords: TimeRecord[];
  templates: MeasurementTemplate[];
  schedules: Schedule[];
  chatMessages?: any[];
  controllerTeams: ControllerTeam[];
  controllerEquipments: ControllerEquipment[];
  equipmentMonthly: EquipmentMonthlyData[];
  controllerManpower: ControllerManpower[];
  manpowerMonthly: ManpowerMonthlyData[];
  teamAssignments: TeamAssignment[];
  passwordResetRequests: PasswordResetRequest[];
  appState?: { id: string, content: any }[];
}): string {
  let sql = `-- SIGO System - Supabase Migration Script\n\n`;
  sql += `BEGIN;\n\n`;

  sql += `-- DANGER: The following lines will drop all existing tables to ensure a clean slate.\n`;
  [...DB_TABLES].reverse().forEach(table => {
    sql += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
  });
  sql += `\n`;

  // Tables Definitions
  const tableDefs: Record<string, string> = {
    app_state: `id TEXT PRIMARY KEY, content JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    users: `id TEXT PRIMARY KEY, company_id TEXT, company_name TEXT, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT, role TEXT DEFAULT 'editor', allowed_quotation_ids JSONB DEFAULT '[]', allowed_modules JSONB DEFAULT '[]', keys INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, email TEXT, is_approved BOOLEAN DEFAULT false, job_function TEXT, must_change_password BOOLEAN DEFAULT false, session_id TEXT, desired_plan TEXT, desired_modules JSONB DEFAULT '[]', has_company BOOLEAN DEFAULT false, keys_expires_at TIMESTAMPTZ, profile_photo TEXT, phone TEXT, address TEXT, email_config JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    audit_logs: `id TEXT PRIMARY KEY, company_id TEXT, timestamp TIMESTAMPTZ DEFAULT now(), user_id TEXT, user_name TEXT, action TEXT, details TEXT, module TEXT, created_at TIMESTAMPTZ DEFAULT now()`,
    resources: `id TEXT PRIMARY KEY, company_id TEXT, code TEXT NOT NULL, name TEXT NOT NULL, unit TEXT, type TEXT, base_price NUMERIC DEFAULT 0, encargos NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    service_compositions: `id TEXT PRIMARY KEY, company_id TEXT, code TEXT NOT NULL, name TEXT NOT NULL, unit TEXT, production NUMERIC DEFAULT 1, fit NUMERIC DEFAULT 1, items JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    quotations: `id TEXT PRIMARY KEY, company_id TEXT, budget_name TEXT, organization TEXT, date DATE, sector_responsible TEXT, requester_sector TEXT, year INTEGER, trecho TEXT, municipios TEXT, rodovias TEXT, version TEXT, extension TEXT, base_date TEXT, services JSONB DEFAULT '[]', groups JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    contracts: `id TEXT PRIMARY KEY, company_id TEXT, quotation_id TEXT, contract_number TEXT NOT NULL, work_name TEXT, total_value NUMERIC DEFAULT 0, object TEXT, client TEXT, contractor TEXT, start_date DATE, end_date DATE, supervisor TEXT, notes TEXT, measurement_unit TEXT, measurement_unit_value TEXT, initial_station TEXT, final_station TEXT, services JSONB DEFAULT '[]', groups JSONB DEFAULT '[]', group_adjustments JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    measurements: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, number INTEGER, period TEXT, date DATE, items JSONB DEFAULT '[]', status TEXT DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    daily_reports: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, date DATE NOT NULL, weather_morning TEXT, weather_afternoon TEXT, weather_night TEXT, rainfall_mm NUMERIC DEFAULT 0, manpower JSONB DEFAULT '[]', equipment JSONB DEFAULT '[]', activities JSONB DEFAULT '[]', accidents TEXT, fiscalization_comments TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    pluviometry_records: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, date DATE NOT NULL, night_status TEXT, morning_status TEXT, afternoon_status TEXT, rainfall_mm NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    technical_schedules: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, start_date DATE, duration INTEGER, time_unit TEXT, services JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    calculation_memories: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE, service_id TEXT, rows JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    service_productions: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, service_id TEXT, month TEXT, num_equip INTEGER, work_days INTEGER, hours_day NUMERIC, unit_hour NUMERIC, efficiency NUMERIC, rain_percent NUMERIC, start_date DATE, end_date DATE, prev_month_accumulated NUMERIC DEFAULT 0, daily_data JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    highway_locations: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, name TEXT, material_ids JSONB DEFAULT '[]', reference_station TEXT, lateral_distance NUMERIC, city TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    station_groups: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, name TEXT, initial_station TEXT, final_station TEXT, material_ids JSONB DEFAULT '[]', volume NUMERIC, service_id TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    cubation_data: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE, station_group_id TEXT, service_id TEXT, rows JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    transport_data: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, measurement_id TEXT REFERENCES measurements(id) ON DELETE CASCADE, service_id TEXT, rows JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    employees: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, role TEXT, admission_date DATE, salary NUMERIC DEFAULT 0, payment_type TEXT, cpf TEXT, rg_number TEXT, rg_agency TEXT, rg_issuer TEXT, rg_state TEXT, birth_date DATE, birth_place TEXT, birth_state TEXT, work_booklet_number TEXT, work_booklet_series TEXT, pis TEXT, phone TEXT, mobile TEXT, email TEXT, voter_id_number TEXT, voter_zone TEXT, voter_section TEXT, father_name TEXT, mother_name TEXT, spouse_name TEXT, dependents JSONB DEFAULT '[]', address_logradouro TEXT, address_number TEXT, address_complement TEXT, address_neighborhood TEXT, address_city TEXT, address_zip_code TEXT, address_state TEXT, contract_id TEXT, commuter_benefits BOOLEAN DEFAULT false, commuter_value1 NUMERIC, commuter_city1 TEXT, commuter_value2 NUMERIC, commuter_city2 TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    time_records: `id TEXT PRIMARY KEY, employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE, date DATE NOT NULL, entry TEXT, exit TEXT, overtime TEXT, company_id TEXT, created_at TIMESTAMPTZ DEFAULT now()`,
    controller_teams: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, name TEXT NOT NULL, supervisor_id TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    equipments: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, code TEXT, name TEXT NOT NULL, type TEXT, brand TEXT, model TEXT, year INTEGER, situation TEXT, plate TEXT, origin TEXT, category TEXT, entry_date DATE, exit_date DATE, in_maintenance BOOLEAN DEFAULT false, maintenance_entry_date TIMESTAMPTZ, maintenance_type TEXT, charges_percentage NUMERIC DEFAULT 0, overtime_percentage NUMERIC DEFAULT 0, measurement_unit TEXT, current_reading NUMERIC DEFAULT 0, observations TEXT, custom_fields JSONB DEFAULT '{}', photos JSONB DEFAULT '[]', history JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    equipment_maintenance: `id TEXT PRIMARY KEY, equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE, company_id TEXT, entry_date TIMESTAMPTZ NOT NULL, exit_date TIMESTAMPTZ, type TEXT, requested_items TEXT, days_in_maintenance INTEGER DEFAULT 0, total_cost NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    equipment_transfers: `id TEXT PRIMARY KEY, company_id TEXT, equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE, source_contract_id TEXT, target_contract_id TEXT, transfer_date DATE NOT NULL, status TEXT DEFAULT 'pending', requested_by TEXT, approved_by TEXT, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()`,
    team_assignments: `id TEXT PRIMARY KEY, company_id TEXT, team_id TEXT REFERENCES controller_teams(id) ON DELETE CASCADE, member_id TEXT NOT NULL, type TEXT NOT NULL, month TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()`,
    equipment_monthly_data: `id TEXT PRIMARY KEY, company_id TEXT, equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE, month TEXT NOT NULL, cost NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()`,
    controller_manpower: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE, name TEXT NOT NULL, role TEXT, daily_worker TEXT, entry_date DATE, exit_date DATE, charges_percentage NUMERIC DEFAULT 0, overtime_percentage NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    manpower_monthly_data: `id TEXT PRIMARY KEY, company_id TEXT, manpower_id TEXT REFERENCES controller_manpower(id) ON DELETE CASCADE, month TEXT NOT NULL, salary NUMERIC DEFAULT 0, overtime_rate NUMERIC DEFAULT 0, daily_rate NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()`,
    budget_schedules: `id TEXT PRIMARY KEY, company_id TEXT, quotation_id TEXT REFERENCES quotations(id) ON DELETE CASCADE, start_date DATE, duration INTEGER, time_unit TEXT, distribution_type TEXT, services JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    measurement_templates: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, unit TEXT NOT NULL, columns JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    password_reset_requests: `id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, email TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT now(), status TEXT DEFAULT 'pending', approved_by TEXT, approved_at TIMESTAMPTZ, temp_password TEXT, created_at TIMESTAMPTZ DEFAULT now()`,
    chat_messages: `id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, company_id TEXT NOT NULL, content TEXT NOT NULL, is_read BOOLEAN DEFAULT false, sender_name TEXT, attachment_url TEXT, attachment_name TEXT, created_at TIMESTAMPTZ DEFAULT now()`,
    chat_notifications: `id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'chat', read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()`,
    suppliers: `id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, category TEXT, activity TEXT, cnpj TEXT, contact_person TEXT, email_website TEXT, phone TEXT, mobile TEXT, address TEXT, assigned_contract_ids JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    purchase_requests: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT, equipment_id TEXT, date DATE, description TEXT, sector TEXT, category TEXT, cost_center TEXT, priority TEXT DEFAULT 'Normal', status TEXT DEFAULT 'Aguardando', delivery_deadline DATE, items JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    purchase_quotations: `id TEXT PRIMARY KEY, company_id TEXT, date DATE, items JSONB DEFAULT '[]', suppliers JSONB DEFAULT '[]', status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    purchase_orders: `id TEXT PRIMARY KEY, company_id TEXT, request_id TEXT, contract_id TEXT, equipment_id TEXT, order_number TEXT, supplier_id TEXT, supplier_name TEXT, phone TEXT, email TEXT, order_date DATE, delivery_date DATE, category TEXT, cost_center TEXT, delivery_address JSONB DEFAULT '{}', subtotal NUMERIC DEFAULT 0, discount NUMERIC DEFAULT 0, additions NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, status TEXT DEFAULT 'draft', items JSONB DEFAULT '[]', payment_conditions JSONB DEFAULT '[]', tracking_number TEXT, notes TEXT, observations TEXT, origin_quotation_id TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    fuel_reservoirs: `id TEXT PRIMARY KEY, company_id TEXT, contract_id TEXT, name TEXT NOT NULL, capacity NUMERIC DEFAULT 0, current_level NUMERIC DEFAULT 0, fuel_type TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`,
    fuel_logs: `id TEXT PRIMARY KEY, company_id TEXT, tank_id TEXT, type TEXT NOT NULL, date DATE NOT NULL, quantity NUMERIC NOT NULL, equipment_id TEXT, notes TEXT, unit_price NUMERIC, cost NUMERIC, supplier TEXT, invoice_number TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()`
  };

  DB_TABLES.forEach(table => {
    if (tableDefs[table]) {
      sql += `CREATE TABLE IF NOT EXISTS ${table} (\n  ${tableDefs[table]}\n);\n`;
    }
  });

  sql += `\n-- RLS (Row Level Security) and Policies\n`;
  DB_TABLES.forEach(table => {
    sql += `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;\n`;
    sql += `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = '${table}') THEN\n    CREATE POLICY "Allow public access" ON ${table} FOR ALL USING (true);\n  END IF;\nEND $$;\n`;
  });

  sql += `\n-- Realtime Setup\n`;
  sql += `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN\n    CREATE PUBLICATION supabase_realtime;\n  END IF;\nEND $$;\n`;
  sql += `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages, app_state;\n`;

  sql += `\n-- Storage Buckets\n`;
  sql += `INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;\n`;
  sql += `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN\n    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');\n  END IF;\nEND $$;\n`;

  sql += `\n-- Inserção de Dados\n\n`;

  if (data.appState && data.appState.length > 0) sql += generateInsert('app_state', data.appState);
  sql += generateInsert('users', data.users);
  sql += generateInsert('audit_logs', data.auditLogs);
  sql += generateInsert('resources', data.resources);
  sql += generateInsert('service_compositions', data.services);
  sql += generateInsert('quotations', data.quotations);
  sql += generateInsert('contracts', data.contracts);
  sql += generateInsert('measurements', data.measurements);
  sql += generateInsert('daily_reports', data.dailyReports);
  sql += generateInsert('pluviometry_records', data.pluviometryRecords);
  sql += generateInsert('technical_schedules', data.technicalSchedules);
  sql += generateInsert('calculation_memories', data.memories);
  sql += generateInsert('service_productions', data.serviceProductions);
  sql += generateInsert('highway_locations', data.highwayLocations);
  sql += generateInsert('station_groups', data.stationGroups);
  sql += generateInsert('cubation_data', data.cubationData);
  sql += generateInsert('transport_data', data.transportData);
  sql += generateInsert('employees', data.employees);
  sql += generateInsert('time_records', data.timeRecords);
  sql += generateInsert('controller_teams', data.controllerTeams);
  sql += generateInsert('equipments', data.controllerEquipments);
  sql += generateInsert('equipment_monthly_data', data.equipmentMonthly);
  sql += generateInsert('controller_manpower', data.controllerManpower);
  sql += generateInsert('manpower_monthly_data', data.manpowerMonthly);
  sql += generateInsert('team_assignments', data.teamAssignments);
  sql += generateInsert('budget_schedules', data.schedules);
  sql += generateInsert('measurement_templates', data.templates);
  sql += generateInsert('password_reset_requests', data.passwordResetRequests);
  sql += generateInsert('suppliers', (data as any).suppliers || []);
  sql += generateInsert('purchase_requests', (data as any).purchaseRequests || []);
  sql += generateInsert('purchase_quotations', (data as any).purchaseQuotations || []);
  sql += generateInsert('purchase_orders', (data as any).purchaseOrders || []);
  sql += generateInsert('purchase_order_items', (data as any).purchaseOrderItems || []);
  sql += generateInsert('purchase_order_payments', (data as any).purchaseOrderPayments || []);
  sql += generateInsert('fuel_reservoirs', (data as any).fuelTanks || []);
  sql += generateInsert('fuel_logs', (data as any).fuelLogs || []);
  if (data.chatMessages) sql += generateInsert('chat_messages', data.chatMessages);

  sql += `\nCOMMIT;\n`;
  return sql;
}

export function generateStructureSQL(): string {
  // Re-use logic for consistency
  const full = generateFullSQLScript({
    users: [], resources: [], services: [], quotations: [], contracts: [], measurements: [], auditLogs: [],
    highwayLocations: [], stationGroups: [], cubationData: [], transportData: [], memories: [], 
    serviceProductions: [], dailyReports: [], pluviometryRecords: [], technicalSchedules: [], 
    employees: [], timeRecords: [], templates: [], schedules: [], controllerTeams: [], 
    controllerEquipments: [], equipmentMonthly: [], controllerManpower: [], manpowerMonthly: [], 
    teamAssignments: [], passwordResetRequests: []
  });
  return full.split('-- Inserção de Dados')[0] + '\nCOMMIT;';
}

export function generateDataSQL(data: any): string {
  const full = generateFullSQLScript(data);
  const parts = full.split('-- Inserção de Dados');
  if (parts.length < 2) return full;
  return 'BEGIN;\n\n-- Inserção de Dados' + parts[1];
}

export function generateDataPartsSQL(data: any): Record<string, string> {
  const parts: Record<string, string> = {};

  const addPart = (filename: string, content: string) => {
    if (content.trim()) {
      parts[filename] = `BEGIN;\n\n${content}\nCOMMIT;\n`;
    }
  };

  // Part 01: Core & Setup
  let part01 = '';
  if (data.appState && data.appState.length > 0) part01 += generateInsert('app_state', data.appState);
  part01 += generateInsert('users', data.users);
  part01 += generateInsert('audit_logs', data.auditLogs);
  part01 += generateInsert('password_reset_requests', data.passwordResetRequests);
  addPart('01_sistema_dados.sql', part01);

  // Part 02: Chat
  let part02 = '';
  if (data.chatMessages) part02 += generateInsert('chat_messages', data.chatMessages);
  addPart('02_chat_dados.sql', part02);

  // Part 03: Cotacoes
  let part03 = '';
  part03 += generateInsert('resources', data.resources);
  part03 += generateInsert('service_compositions', data.services);
  part03 += generateInsert('quotations', data.quotations);
  part03 += generateInsert('budget_schedules', data.schedules);
  addPart('03_cotacoes_dados.sql', part03);

  // Part 04: Contratos e Sala Tecnica
  let part04 = '';
  part04 += generateInsert('contracts', data.contracts);
  part04 += generateInsert('measurements', data.measurements);
  part04 += generateInsert('technical_schedules', data.technicalSchedules);
  part04 += generateInsert('calculation_memories', data.memories);
  part04 += generateInsert('service_productions', data.serviceProductions);
  part04 += generateInsert('highway_locations', data.highwayLocations);
  part04 += generateInsert('station_groups', data.stationGroups);
  part04 += generateInsert('cubation_data', data.cubationData);
  part04 += generateInsert('transport_data', data.transportData);
  part04 += generateInsert('measurement_templates', data.templates);
  addPart('04_sala_tecnica_dados.sql', part04);

  // Part 05: RH e Controlador
  let part05 = '';
  part05 += generateInsert('employees', data.employees);
  part05 += generateInsert('time_records', data.timeRecords);
  part05 += generateInsert('daily_reports', data.dailyReports);
  part05 += generateInsert('pluviometry_records', data.pluviometryRecords);
  part05 += generateInsert('controller_teams', data.controllerTeams);
  part05 += generateInsert('equipments', data.controllerEquipments);
  part05 += generateInsert('equipment_monthly_data', data.equipmentMonthly);
  part05 += generateInsert('controller_manpower', data.controllerManpower);
  part05 += generateInsert('manpower_monthly_data', data.manpowerMonthly);
  part05 += generateInsert('team_assignments', data.teamAssignments);
  part05 += generateInsert('equipment_transfers', data.equipmentTransfers);
  part05 += generateInsert('equipment_maintenance', data.equipmentMaintenance);
  part05 += generateInsert('fuel_reservoirs', (data as any).fuelTanks || []);
  part05 += generateInsert('fuel_logs', (data as any).fuelLogs || []);
  addPart('05_rh_controlador_dados.sql', part05);

  return parts;
}


export function getSupabaseMigrationParts() {
  const parts: Record<string, { content: string, lastModified: string }> = {};

  // Part 0: Main
  parts['script00_main.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 00 (Main & Admin)

-- DANGER: The following lines will drop all existing tables to ensure a clean slate.
DROP TABLE IF EXISTS purchase_order_payments CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS fuel_reservoirs CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS chat_notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS measurement_templates CASCADE;
DROP TABLE IF EXISTS budget_schedules CASCADE;
DROP TABLE IF EXISTS manpower_monthly_data CASCADE;
DROP TABLE IF EXISTS equipment_monthly_data CASCADE;
DROP TABLE IF EXISTS team_assignments CASCADE;
DROP TABLE IF EXISTS controller_manpower CASCADE;
DROP TABLE IF EXISTS equipment_maintenance CASCADE;
DROP TABLE IF EXISTS equipment_transfers CASCADE;
DROP TABLE IF EXISTS equipments CASCADE;
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

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'app_state') THEN
    CREATE POLICY "Allow public access" ON app_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'users') THEN
    CREATE POLICY "Allow public access" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Allow public access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'password_reset_requests') THEN
    CREATE POLICY "Allow public access" ON password_reset_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 1: Chat
  parts['script01_chat.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 01 (Chat)

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

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'chat_messages') THEN
    CREATE POLICY "Allow public access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'chat_notifications') THEN
    CREATE POLICY "Allow public access" ON chat_notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 2: Quotations
  parts['script02_quotations.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 02 (Cotações)

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'resources') THEN
    CREATE POLICY "Allow public access" ON resources FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'service_compositions') THEN
    CREATE POLICY "Allow public access" ON service_compositions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'quotations') THEN
    CREATE POLICY "Allow public access" ON quotations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'budget_schedules') THEN
    CREATE POLICY "Allow public access" ON budget_schedules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 3: Technical Room
  parts['script03_technical_room.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 03 (Sala Técnica)

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'contracts') THEN
    CREATE POLICY "Allow public access" ON contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'measurements') THEN
    CREATE POLICY "Allow public access" ON measurements FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'measurement_templates') THEN
    CREATE POLICY "Allow public access" ON measurement_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'technical_schedules') THEN
    CREATE POLICY "Allow public access" ON technical_schedules FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'calculation_memories') THEN
    CREATE POLICY "Allow public access" ON calculation_memories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'service_productions') THEN
    CREATE POLICY "Allow public access" ON service_productions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'highway_locations') THEN
    CREATE POLICY "Allow public access" ON highway_locations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'station_groups') THEN
    CREATE POLICY "Allow public access" ON station_groups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'cubation_data') THEN
    CREATE POLICY "Allow public access" ON cubation_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'transport_data') THEN
    CREATE POLICY "Allow public access" ON transport_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 4: HR
  parts['script04_hr.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 04 (RH)

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

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'employees') THEN
    CREATE POLICY "Allow public access" ON employees FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 5: Controller
  parts['script05_controller.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 05 (Controlador)

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

CREATE TABLE IF NOT EXISTS equipments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
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
  equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS fuel_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    tank_id TEXT REFERENCES fuel_reservoirs(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'entrada' or 'saida'
    date DATE NOT NULL,
    quantity NUMERIC NOT NULL,
    equipment_id TEXT,
    notes TEXT,
    unit_price NUMERIC,
    cost NUMERIC,
    supplier TEXT,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pluviometry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE manpower_monthly_data ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'daily_reports') THEN
    CREATE POLICY "Allow public access" ON daily_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'pluviometry_records') THEN
    CREATE POLICY "Allow public access" ON pluviometry_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'time_records') THEN
    CREATE POLICY "Allow public access" ON time_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'controller_teams') THEN
    CREATE POLICY "Allow public access" ON controller_teams FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipments') THEN
    CREATE POLICY "Allow public access" ON equipments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipment_maintenance') THEN
    CREATE POLICY "Allow public access" ON equipment_maintenance FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipment_transfers') THEN
    CREATE POLICY "Allow public access" ON equipment_transfers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'controller_manpower') THEN
    CREATE POLICY "Allow public access" ON controller_manpower FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'team_assignments') THEN
    CREATE POLICY "Allow public access" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipment_monthly_data') THEN
    CREATE POLICY "Allow public access" ON equipment_monthly_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'manpower_monthly_data') THEN
    CREATE POLICY "Allow public access" ON manpower_monthly_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'fuel_reservoirs') THEN
    CREATE POLICY "Allow public access" ON fuel_reservoirs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'fuel_logs') THEN
    CREATE POLICY "Allow public access" ON fuel_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };

  // Part 6: Purchases
  parts['script06_purchases.sql'] = {
    content: `-- SIGO System - Supabase Migration Script 06 (Compras)

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

CREATE TABLE IF NOT EXISTS purchase_quotations (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    date DATE,
    items JSONB DEFAULT '[]',
    suppliers JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
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

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'suppliers') THEN
    CREATE POLICY "Allow public access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_quotations') THEN
    CREATE POLICY "Allow public access" ON purchase_quotations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "Allow public access" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_order_items') THEN
    CREATE POLICY "Allow public access" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_order_payments') THEN
    CREATE POLICY "Allow public access" ON purchase_order_payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "27/04/2026 19:40"
  };
  
  parts['patch_compras_v2.sql'] = {
    content: `-- Script de atualização para o módulo de Compras v3
-- Execute este script se você já possui a estrutura base de compras.

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    cnpj TEXT,
    contact_person TEXT,
    email_website TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    date DATE,
    description TEXT,
    sector TEXT,
    category TEXT,
    status TEXT DEFAULT 'Aguardando',
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_quotations (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    date DATE,
    items JSONB DEFAULT '[]',
    suppliers JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    order_number TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    order_date DATE,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    items JSONB DEFAULT '[]',
    payment_condition JSONB DEFAULT '{}',
    delivery_date DATE,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'suppliers') THEN
    CREATE POLICY "Allow public access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_requests') THEN
    CREATE POLICY "Allow public access" ON purchase_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_quotations') THEN
    CREATE POLICY "Allow public access" ON purchase_quotations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "Allow public access" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`,
    lastModified: "30/04/2026 15:40"
  };

  // Patches
  parts['patch_users_columns.sql'] = {
    content: `-- Execute este script no SQL Editor do Supabase para adicionar as colunas que estão faltando na tabela "users"

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_function TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_plan TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS desired_modules JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_company BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS keys_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_quotation_ids JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_contract_ids JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_modules JSONB DEFAULT '[]';

-- Nota: Não estamos alterando o tipo da coluna 'id' aqui para evitar erros de Foreign Key 
-- caso ela já seja utilizada em outras tabelas. Se for preciso alterar, primeiro remova a Foreign Key, 
-- mude o tipo da coluna nas duas tabelas, e crie a Foreign Key novamente.
`,
    lastModified: "28/04/2026 00:40"
  };

  parts['patch_users_contracts.sql'] = {
    content: `-- Script para adicionar campo de contratos permitidos à tabela de usuários
-- Execute este script se você já possui a tabela 'users' criada.

DO $$ 
BEGIN
    -- Adiciona coluna de ids de contratos permitidos
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'allowed_contract_ids') THEN
        ALTER TABLE users ADD COLUMN allowed_contract_ids JSONB DEFAULT '[]';
    END IF;
END $$;

COMMENT ON COLUMN users.allowed_contract_ids IS 'Lista de IDs de contratos que o usuário tem permissão para acessar';
`,
    lastModified: "28/04/2026 00:40"
  };

  parts['patch_users_profile.sql'] = {
    content: `-- Script para adicionar campos de perfil à tabela de usuários
-- Execute este script se você já possui a tabela 'users' criada.

DO $$ 
BEGIN
    -- Adiciona coluna de foto de perfil
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'profile_photo') THEN
        ALTER TABLE users ADD COLUMN profile_photo TEXT;
    END IF;

    -- Adiciona coluna de telefone
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;

    -- Adiciona coluna de endereço
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE users ADD COLUMN address TEXT;
    END IF;

    -- Adiciona coluna de configuração de e-mail (JSONB)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'email_config') THEN
        ALTER TABLE users ADD COLUMN email_config JSONB DEFAULT '{}';
    END IF;
END $$;

COMMENT ON COLUMN users.profile_photo IS 'URL ou Base64 da foto de perfil';
COMMENT ON COLUMN users.email_config IS 'Configurações SMTP para envio de e-mails pelo sistema';
`,
    lastModified: "28/04/2026 00:40"
  };

  // Instructions
  parts['INSTRUCOES_SUPABASE.md'] = {
    content: `# Instruções de Migração Supabase - Sistema SIGO

O script foi dividido em 7 partes organizadas por setores para facilitar a execução.

### Ordem de Execução

Siga exatamente esta ordem no SQL Editor do seu projeto Supabase:

1.  **'script00_main.sql'**: Principal (Tudo que o sistema precisa para funcionar, config de Admins).
2.  **'script01_chat.sql'**: Chat (Todas as configurações relativas às mensagens).
3.  **'script02_quotations.sql'**: Cotações (Insumos, Composições, Orçamentos e Cronogramas de orçamento).
4.  **'script03_technical_room.sql'**: Sala Técnica (Contratos, Medições, Diários, etc).
5.  **'script04_hr.sql'**: RH (Funcionários).
6.  **'script05_controller.sql'**: Controlador (RDO, Equipamentos, Mão de Obra, Apontamentos).
7.  **'script06_purchases.sql'**: Compras (Fornecedores e Ordens de Compra).

### Atualizações e Patches (Bancos em Produção)
Se o seu banco **já está em produção com dados que NÃO PODEM SER APAGADOS**, e você apenas precisa atualizar a estrutura para a nova versão (ex: adição de módulos de permissões ou campos no perfil de usuários):

Não rode o 'script00_main.sql' que possui os \`DROP TABLE\`. Utilize apenas os scripts de **patch**:
- **patch_users_columns.sql**: Adiciona todas as colunas de configuração exigidas para os usuários controlarem cotações, contratos e módulos, sem apagar nenhum dado.
- **patch_users_contracts.sql**: Script específico para apenas criar as tabelas ou relações dos IDs de contratos do usuário.
- **patch_users_profile.sql**: Script que insere novos campos focados no perfil do usuário, como \`profile_photo\`, telefones, e \`email_config\`.

### Observações Importantes

- Sempre execute o **Script 00** primeiro se for uma **instalação nova do zero**, pois ele recria tabelas base como users, que são vitais pro sistema.
- Se já existirem dados, a primeira execução (Script 00) os apagará (pois contém DROP TABLE). Cuidado ao rodar num banco já em produção!
`,
    lastModified: "28/04/2026 00:45"
  };

  return parts;
}
