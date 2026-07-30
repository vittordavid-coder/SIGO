-- SCRIPT PARA VERIFICAR E CORRIGIR A TABELA service_compositions
-- Este script garante que todas as colunas necessárias para o salvamento de composições existam na tabela.

DO $$
BEGIN
    -- Cria a tabela base se não existir (apenas por segurança)
    CREATE TABLE IF NOT EXISTS service_compositions (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Verifica e adiciona colunas que podem estar faltando
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS company_id TEXT;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'un';
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS production NUMERIC DEFAULT 1;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS fit NUMERIC DEFAULT 1;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS contract_id TEXT;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS group_name TEXT;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS worksheet_type TEXT;
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
    
    -- Coluna items é crucial, pois contém o JSON dos insumos da composição
    ALTER TABLE service_compositions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

    -- Se a coluna items existir mas não for JSONB, tenta converter
    BEGIN
        ALTER TABLE service_compositions ALTER COLUMN items TYPE JSONB USING items::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'A coluna items já é JSONB ou possui dados incompatíveis para cast.';
    END;

    -- Define o default para items
    ALTER TABLE service_compositions ALTER COLUMN items SET DEFAULT '[]'::jsonb;
END $$;

-- Atualização das Políticas RLS
ALTER TABLE service_compositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON service_compositions;
CREATE POLICY "Allow public access" ON service_compositions 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Habilita o Realtime (Opcional, se precisar de atualização ao vivo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE service_compositions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'A tabela service_compositions já está no Realtime.';
    END;
  END IF;
END $$;
