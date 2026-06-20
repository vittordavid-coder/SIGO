-- Atualização da tabela de funcionários
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS alojamento_id TEXT,
ADD COLUMN IF NOT EXISTS commuter_benefits BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commuter_value1 NUMERIC,
ADD COLUMN IF NOT EXISTS commuter_city1 TEXT,
ADD COLUMN IF NOT EXISTS commuter_value2 NUMERIC,
ADD COLUMN IF NOT EXISTS commuter_city2 TEXT,
ADD COLUMN IF NOT EXISTS dependents JSONB;
