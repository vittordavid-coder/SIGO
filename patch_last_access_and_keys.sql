-- Script de atualização da tabela users
-- Adiciona a coluna last_access_at de forma segura sem recriar políticas existentes

DO $$ 
BEGIN
    -- Adicionar coluna last_access_at se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_access_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_access_at TIMESTAMPTZ;
        COMMENT ON COLUMN public.users.last_access_at IS 'Data e hora do último login/acesso do usuário ao sistema';
    END IF;
END $$;
