-- Adiciona contract_id à tabela rh_templates
ALTER TABLE rh_templates ADD COLUMN IF NOT EXISTS contract_id TEXT;
