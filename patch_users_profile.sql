-- Script para adicionar campos de perfil à tabela de usuários
-- Execute este script se você já possui a tabela 'users' criada.

DO $$ 
BEGIN
    -- Adiciona coluna de foto de perfil
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'profile_photo') THEN
        ALTER TABLE users ADD COLUMN profile_photo TEXT;
    END IF;

    -- Adiciona coluna de telefone
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;

    -- Adiciona coluna de endereço
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE users ADD COLUMN address TEXT;
    END IF;

    -- Adiciona coluna de configuração de e-mail (JSONB)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'email_config') THEN
        ALTER TABLE users ADD COLUMN email_config JSONB DEFAULT '{}';
    END IF;
END $$;

COMMENT ON COLUMN users.profile_photo IS 'URL ou Base64 da foto de perfil';
COMMENT ON COLUMN users.email_config IS 'Configurações SMTP para envio de e-mails pelo sistema';
