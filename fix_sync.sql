-- Script para garantir salvamento e sincronização correta de colaboradores e equipamentos 

-- 1. Garante que as colunas de data em colaboradores permitem nulo
ALTER TABLE employees ALTER COLUMN admission_date DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN dismissal_date DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN birth_date DROP NOT NULL;

-- 2. Garante que os identificadores de contrato (Foreign Keys) permitem nulo
ALTER TABLE employees ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE equipments ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE controller_teams ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE controller_teams ALTER COLUMN supervisor_id DROP NOT NULL;

-- 3. Adiciona a coluna de horímetro (hour_meter) nos registros de saída de log de combustível 
-- (Caso já não tenha sido criada)
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS hour_meter NUMERIC;
