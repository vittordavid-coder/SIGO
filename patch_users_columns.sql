-- Execute este script no SQL Editor do Supabase para adicionar as colunas que estão faltando na tabela "users"

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
