-- Adiciona as colunas que estavam faltando na importação de equipamentos
ALTER TABLE equipments
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_cnpj TEXT,
ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
