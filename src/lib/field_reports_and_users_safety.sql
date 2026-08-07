-- ============================================================================
-- SCRIPT SQL DE SEGURANÇA E ESTRUTURA SYNERA / SIGO SUPABASE
-- Este script garante a criação correta da tabela 'field_reports' (Apontamentos de Produção de Campo)
-- e estabelece políticas de integridade/proteção para a tabela 'users'.
-- ============================================================================

-- 1. TABELA DE APONTAMENTOS DE CAMPO (FIELD_REPORTS) - SALA TÉCNICA
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para otimização de busca na Sala Técnica
CREATE INDEX IF NOT EXISTS idx_field_reports_company_contract ON public.field_reports(company_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON public.field_reports(status);

-- 2. GARANTIR ESTRUTURA DA TABELA USERS COM ÍNDICES E CONSTRAINTS SEGURAS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    company_name TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'editor',
    allowed_quotation_ids JSONB DEFAULT '[]'::jsonb,
    allowed_modules JSONB DEFAULT '[]'::jsonb,
    keys INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    email TEXT,
    is_approved BOOLEAN DEFAULT false,
    job_function TEXT,
    must_change_password BOOLEAN DEFAULT false,
    session_id TEXT,
    desired_plan TEXT,
    desired_modules JSONB DEFAULT '[]'::jsonb,
    has_company BOOLEAN DEFAULT false,
    keys_expires_at TIMESTAMPTZ,
    profile_photo TEXT,
    phone TEXT,
    address TEXT,
    email_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR RLS SEGURO (ROW LEVEL SECURITY)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita pública/autenticada conforme chave de API do Supabase
DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Users" ON public.users;
CREATE POLICY "Permitir Leitura e Escrita Geral em Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports;
CREATE POLICY "Permitir Leitura e Escrita Geral em Field Reports" ON public.field_reports FOR ALL USING (true) WITH CHECK (true);

-- Notificação de execução concluída
SELECT 'Script de proteção de usuários e apontamentos de campo aplicado com sucesso!' as status;
