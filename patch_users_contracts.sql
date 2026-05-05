-- Script para adicionar campo de contratos permitidos à tabela de usuários
-- Execute este script se você já possui a tabela 'users' criada.

DO $$ 
BEGIN
    -- Adiciona coluna de ids de contratos permitidos
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'allowed_contract_ids') THEN
        ALTER TABLE users ADD COLUMN allowed_contract_ids JSONB DEFAULT '[]';
    END IF;
END $$;

COMMENT ON COLUMN users.allowed_contract_ids IS 'Lista de IDs de contratos que o usuário tem permissão para acessar';
