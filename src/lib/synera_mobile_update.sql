-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO E ATUALIZAÇÃO DO SUPABASE - SYNERA MOBILE
-- ============================================================================
-- Execute este script no Editor do Supabase (SQL Editor) para garantir que
-- todas as tabelas, colunas, índices e permissões necessárias para o Synera Mobile
-- estejam atualizados e performáticos.
-- ============================================================================

-- 1. TABELA DE APONTAMENTOS DE CAMPO (FIELD_REPORTS)
CREATE TABLE IF NOT EXISTS public.field_reports (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    contract_name TEXT,
    service_id TEXT,
    service_name TEXT,
    unit TEXT,
    qty NUMERIC DEFAULT 0,
    production_date DATE,
    synced_at TIMESTAMPTZ,
    start_station TEXT,
    end_station TEXT,
    trecho TEXT,
    notes TEXT,
    photo TEXT,
    photo_url TEXT,
    reported_by TEXT,
    reported_by_email TEXT,
    status TEXT DEFAULT 'pending',
    info_type TEXT,
    trips_qty NUMERIC,
    length_m NUMERIC,
    width_m NUMERIC,
    height_m NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir adição de colunas caso a tabela já existia sem elas
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS info_type TEXT;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS trips_qty NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS length_m NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS width_m NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS height_m NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS reported_by_email TEXT;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Índices de Alta Performance para o Synera Mobile
CREATE INDEX IF NOT EXISTS idx_field_reports_company_contract ON public.field_reports(company_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON public.field_reports(status);
CREATE INDEX IF NOT EXISTS idx_field_reports_reporter_email ON public.field_reports(reported_by_email);
CREATE INDEX IF NOT EXISTS idx_field_reports_prod_date ON public.field_reports(production_date);

-- 2. TABELA DE ESTADO GERAL DA APLICAÇÃO (APP_STATE - BLOBS DE BACKUP)
CREATE TABLE IF NOT EXISTS public.app_state (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE CONFIGURAÇÕES DE SISTEMA (SYSTEM_CONFIG - PARÂMETROS DE RH E RESPONSÁVEIS)
CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    config_key TEXT,
    config_value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Constraint de unicidade para upsert seguro no system_config
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_company_config_key'
    ) THEN
        ALTER TABLE public.system_config ADD CONSTRAINT unique_company_config_key UNIQUE (company_id, config_key);
    END IF;
END $$;

-- 4. PERMISSÕES E POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports;
CREATE POLICY "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em App State" ON public.app_state;
CREATE POLICY "Permitir Leitura e Escrita Geral em App State" ON public.app_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em System Config" ON public.system_config;
CREATE POLICY "Permitir Leitura e Escrita Geral em System Config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- Notificação de execução concluída
SELECT 'Banco de dados Supabase atualizado com sucesso para o Synera Mobile!' as status;
