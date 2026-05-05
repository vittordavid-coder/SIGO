-- Script de atualização da Sala Técnica
-- Criação das tabelas necessárias para o pleno funcionamento dos módulos de medição e controle

-- 1. Tabela de Configurações do Sistema (Para reordenação de controles e outras preferências)
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, config_key)
);

-- Políticas RLS para system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for system_config" ON system_config;
CREATE POLICY "Allow public access for system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela de Contratos
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    quotation_id TEXT,
    contract_number TEXT,
    work_name TEXT,
    total_value NUMERIC DEFAULT 0,
    object TEXT,
    client TEXT,
    contractor TEXT,
    start_date TEXT,
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

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for contracts" ON contracts;
CREATE POLICY "Allow public access for contracts" ON contracts FOR ALL USING (true) WITH CHECK (true);

-- 3. Tabela de Medições
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    period TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for measurements" ON measurements;
CREATE POLICY "Allow public access for measurements" ON measurements FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabela de Produção de Serviços (Controles)
CREATE TABLE IF NOT EXISTS service_productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    month TEXT NOT NULL,
    num_equip NUMERIC DEFAULT 1,
    work_days NUMERIC DEFAULT 22,
    hours_day NUMERIC DEFAULT 9,
    unit_hour NUMERIC DEFAULT 100,
    efficiency NUMERIC DEFAULT 100,
    rain_percent NUMERIC DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    prev_month_accumulated NUMERIC DEFAULT 0,
    daily_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contract_id, service_id, month)
);

ALTER TABLE service_productions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for service_productions" ON service_productions;
CREATE POLICY "Allow public access for service_productions" ON service_productions FOR ALL USING (true) WITH CHECK (true);

-- 5. Tabela de Diários de Obra (RDO)
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    number INTEGER,
    weather_morning TEXT,
    weather_afternoon TEXT,
    weather_night TEXT,
    work_condition TEXT,
    comments TEXT,
    observations TEXT,
    accidents TEXT,
    visitors TEXT,
    teams JSONB DEFAULT '[]',
    equipments JSONB DEFAULT '[]',
    activities JSONB DEFAULT '[]',
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for daily_reports" ON daily_reports;
CREATE POLICY "Allow public access for daily_reports" ON daily_reports FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabela de Pluviometria
CREATE TABLE IF NOT EXISTS pluviometry_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    morning_value NUMERIC DEFAULT 0,
    afternoon_value NUMERIC DEFAULT 0,
    night_value NUMERIC DEFAULT 0,
    station_points JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pluviometry_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for pluviometry_records" ON pluviometry_records;
CREATE POLICY "Allow public access for pluviometry_records" ON pluviometry_records FOR ALL USING (true) WITH CHECK (true);

-- 7. Tabela de Memórias de Cálculo
CREATE TABLE IF NOT EXISTS calculation_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    items JSONB DEFAULT '[]',
    total_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calculation_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for calculation_memories" ON calculation_memories;
CREATE POLICY "Allow public access for calculation_memories" ON calculation_memories FOR ALL USING (true) WITH CHECK (true);

-- 8. Tabela de Locações (Equipes e Equipamentos)
CREATE TABLE IF NOT EXISTS controller_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    leader_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE controller_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for controller_teams" ON controller_teams;
CREATE POLICY "Allow public access for controller_teams" ON controller_teams FOR ALL USING (true) WITH CHECK (true);

-- Garante que service_compositions e resources têm as políticas corretas
CREATE TABLE IF NOT EXISTS service_compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE service_compositions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for service_compositions" ON service_compositions;
CREATE POLICY "Allow public access for service_compositions" ON service_compositions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    category TEXT,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for resources" ON resources;
CREATE POLICY "Allow public access for resources" ON resources FOR ALL USING (true) WITH CHECK (true);
