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
