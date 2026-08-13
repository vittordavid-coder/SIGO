-- =====================================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO DO BANCO DE DADOS (SYNERA MOBILE)
-- =====================================================================
-- Este script realiza uma auditoria na estrutura física do seu banco de dados,
-- garantindo que todas as colunas necessárias para sincronização móvel de 
-- Diários/Relatórios de Campo e Parâmetros de Equipe (RH) estejam presentes.
--
-- Pode ser executado com total segurança na seção "SQL Editor" do Supabase.

DO $$
BEGIN
    -- -----------------------------------------------------------------
    -- 1. VERIFICAÇÃO E CORREÇÃO DA TABELA: field_reports
    -- -----------------------------------------------------------------
    -- Garante a presença das colunas de aprovação/rejeição e dimensões
    -- de cubagem adicionadas no aplicativo mas ausentes na tabela core.

    -- Colunas de Aprovação / Rejeição
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'rejected_by') THEN
        ALTER TABLE public.field_reports ADD COLUMN rejected_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.field_reports ADD COLUMN rejection_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'rejected_at') THEN
        ALTER TABLE public.field_reports ADD COLUMN rejected_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'approved_by') THEN
        ALTER TABLE public.field_reports ADD COLUMN approved_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'approved_at') THEN
        ALTER TABLE public.field_reports ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;

    -- Colunas de Cubagem / Geometria / Viagens
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'info_type') THEN
        ALTER TABLE public.field_reports ADD COLUMN info_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'trips_qty') THEN
        ALTER TABLE public.field_reports ADD COLUMN trips_qty NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'length_m') THEN
        ALTER TABLE public.field_reports ADD COLUMN length_m NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'width_m') THEN
        ALTER TABLE public.field_reports ADD COLUMN width_m NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_reports' AND column_name = 'height_m') THEN
        ALTER TABLE public.field_reports ADD COLUMN height_m NUMERIC DEFAULT 0;
    END IF;

    -- -----------------------------------------------------------------
    -- 2. VERIFICAÇÃO E GARANTIA DA TABELA: system_config
    -- -----------------------------------------------------------------
    -- Garante a tabela para armazenamento de configurações globais,
    -- incluindo parametrizações de RH / Responsáveis por Equipes.
    
    CREATE TABLE IF NOT EXISTS public.system_config (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        config_key TEXT,
        config_value JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Constraint de unicidade para permitir upsert seguro
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'system_config' AND constraint_name = 'unique_company_config_key') THEN
        ALTER TABLE public.system_config ADD CONSTRAINT unique_company_config_key UNIQUE (company_id, config_key);
    END IF;

END $$;

-- ---------------------------------------------------------------------
-- 3. AJUSTE DE SEGURANÇA E POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ---------------------------------------------------------------------
-- Garante acesso irrestrito para leitura e gravação segura via API

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports;
CREATE POLICY "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em System Config" ON public.system_config;
CREATE POLICY "Permitir Leitura e Escrita Geral em System Config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 4. CONSULTA DE VERIFICAÇÃO FINAL (INFORMATIVA)
-- ---------------------------------------------------------------------
-- Rode as seguintes queries separadamente no SQL Editor para auditar a estrutura:
--
-- A) Verificação das Colunas de Field Reports:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_name = 'field_reports' 
--    ORDER BY ordinal_position;
--
-- B) Verificação das Colunas de System Config:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_name = 'system_config';
