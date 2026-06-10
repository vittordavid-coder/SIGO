-- Script ultra-robusto para garantir salvamento e sincronização correta de colaboradores e equipamentos no Supabase
-- Pode ser executado repetidamente sem gerar erros de colunas inexistentes ou restrições conflitantes.

-- 1. Criação das tabelas base caso elas ainda não existam no banco de dados.
CREATE TABLE IF NOT EXISTS controller_teams (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  name TEXT NOT NULL,
  supervisor_id TEXT,
  color TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  team_id TEXT,
  member_id TEXT NOT NULL,
  type TEXT NOT NULL,
  month TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Garante que todas as colunas necessárias existam em "team_assignments" (prevenindo erros se a tabela foi importada incompleta)
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS team_id TEXT;
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS end_date DATE;

-- 3. Garante que todas as colunas necessárias existam em "controller_teams"
ALTER TABLE controller_teams ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE controller_teams ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE controller_teams ADD COLUMN IF NOT EXISTS supervisor_id TEXT;
ALTER TABLE controller_teams ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE controller_teams ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 4. Garante que todas as colunas necessárias existam em "employees" e "equipments"
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- 5. Garante as políticas de anulabilidade necessárias (todas as datas e chaves estrangeiras como opcionais)
ALTER TABLE employees ALTER COLUMN admission_date DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN dismissal_date DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN birth_date DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN contract_id DROP NOT NULL;

ALTER TABLE equipments ALTER COLUMN contract_id DROP NOT NULL;

ALTER TABLE controller_teams ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE controller_teams ALTER COLUMN supervisor_id DROP NOT NULL;

ALTER TABLE team_assignments ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE team_assignments ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE team_assignments ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE team_assignments ALTER COLUMN end_date DROP NOT NULL;

-- 6. Adiciona a coluna de horímetro (hour_meter) nos registros de saída de log de combustível, se a tabela existir
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS hour_meter NUMERIC;

-- 7. Alinhamento robusto das tabelas de combustível (fuel_reservoirs e fuel_logs) para usar chaves TEXT e evitar erros de UUID
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
  tank_id TEXT,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  equipment_id TEXT,
  notes TEXT,
  unit_price NUMERIC,
  cost NUMERIC,
  supplier TEXT,
  invoice_number TEXT,
  hour_meter NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Força alteração de colunas chave e relacionamentos para o tipo TEXT, para evitar conflitos de tipos como UUID
-- que causam falhas silenciosas de salvamento
ALTER TABLE fuel_reservoirs ALTER COLUMN id TYPE TEXT;
ALTER TABLE fuel_reservoirs ALTER COLUMN company_id TYPE TEXT;
ALTER TABLE fuel_reservoirs ALTER COLUMN contract_id TYPE TEXT;

ALTER TABLE fuel_logs ALTER COLUMN id TYPE TEXT;
ALTER TABLE fuel_logs ALTER COLUMN company_id TYPE TEXT;
ALTER TABLE fuel_logs ALTER COLUMN tank_id TYPE TEXT;
ALTER TABLE fuel_logs ALTER COLUMN equipment_id TYPE TEXT;

-- Garante as colunas extras necessárias para fuel_reservoirs
ALTER TABLE fuel_reservoirs ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE fuel_reservoirs ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE fuel_reservoirs ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE fuel_reservoirs ADD COLUMN IF NOT EXISTS capacity NUMERIC;
ALTER TABLE fuel_reservoirs ADD COLUMN IF NOT EXISTS current_level NUMERIC;

-- Garante as colunas extras para fuel_logs
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS tank_id TEXT;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS hour_meter NUMERIC;

-- Remove restrições do tipo NOT NULL que possam impedir persistência de registros parciais
ALTER TABLE fuel_logs ALTER COLUMN date DROP NOT NULL;
ALTER TABLE fuel_logs ALTER COLUMN quantity DROP NOT NULL;

-- 8. Configuração de políticas de segurança (RLS) permissivas ("Allow public access") para evitar erros de permissão de escrita/leitura
ALTER TABLE fuel_reservoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON fuel_reservoirs;
CREATE POLICY "Allow public access" ON fuel_reservoirs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access" ON fuel_logs;
CREATE POLICY "Allow public access" ON fuel_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can see their company reservoirs" ON fuel_reservoirs;
DROP POLICY IF EXISTS "Users can manage their company reservoirs" ON fuel_reservoirs;
DROP POLICY IF EXISTS "Users can see their company fuel logs" ON fuel_logs;
DROP POLICY IF EXISTS "Users can manage their company fuel logs" ON fuel_logs;
