-- SCRIPT DE CORREÇÃO: Estrutura da Tabela de Contratos (contracts)
-- Este script garante que a tabela 'contracts' está configurada corretamente no Supabase
-- com suporte a dados de serviços, grupos e ajustes de grupo via JSONB, além de
-- resolver possíveis problemas de tipagem (como UUID vs TEXT) e políticas de RLS.

-- 1. Criação ou atualização das colunas da tabela 'contracts'
-- O comando adiciona as colunas caso não existam e garante que o tipo seja JSONB.
DO $$ 
BEGIN
    -- Garantir tabela base
    CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Tentar alterar a coluna ID para TEXT se ela existir como outro tipo (como UUID)
    -- Para evitar erros caso haja chaves estrangeiras referenciando, fazemos isso de forma segura.
    BEGIN
        ALTER TABLE contracts ALTER COLUMN id TYPE TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'A coluna ID ja esta no tipo correto ou nao pode ser alterada diretamente devido a chaves estrangeiras.';
    END;

    -- Adição de colunas básicas se não existirem
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company_id TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS quotation_id TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS work_name TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS object TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contractor TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS supervisor TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS measurement_unit TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS measurement_unit_value TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS initial_station TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS final_station TEXT;

    -- Garantir colunas cruciais para importação de serviços e grupos de medição (Sala Técnica)
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS groups JSONB DEFAULT '[]';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS group_adjustments JSONB DEFAULT '{}';

    -- Garantir que as colunas existentes sejam do tipo JSONB se já existirem com outro tipo
    BEGIN
        ALTER TABLE contracts ALTER COLUMN services TYPE JSONB USING services::jsonb;
        ALTER TABLE contracts ALTER COLUMN groups TYPE JSONB USING groups::jsonb;
        ALTER TABLE contracts ALTER COLUMN group_adjustments TYPE JSONB USING group_adjustments::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Nao foi possivel converter colunas para JSONB (talvez ja sejam JSONB ou possuam dados incompativeis).';
    END;

    -- Garantir valores padrão corretos
    ALTER TABLE contracts ALTER COLUMN services SET DEFAULT '[]'::jsonb;
    ALTER TABLE contracts ALTER COLUMN groups SET DEFAULT '[]'::jsonb;
    ALTER TABLE contracts ALTER COLUMN group_adjustments SET DEFAULT '{}'::jsonb;
END $$;

-- 2. Configurações de Segurança (Row Level Security - RLS)
-- Garante que o aplicativo front-end tem permissão total para ler/escrever na tabela.
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política existente que possa causar conflitos de inserção
DROP POLICY IF EXISTS "Allow public access" ON contracts;
DROP POLICY IF EXISTS "Allow public access for contracts" ON contracts;

-- Cria uma política de acesso público irrestrito (essencial para o funcionamento do PWA/Offline-First)
CREATE POLICY "Allow public access" ON contracts 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 3. Habilita o recurso de Realtime (opcional, mas altamente recomendado para sincronização instantânea)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Adiciona a tabela à publicação do Realtime se já existir
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'A tabela contracts ja esta na publicacao supabase_realtime.';
    END;
  END IF;
END $$;
