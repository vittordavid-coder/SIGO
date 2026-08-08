-- Script de atualização e conferência para as tabelas do Synera Mobile
-- Este script garante que todas as tabelas usadas pelo aplicativo móvel existam
-- e possuam as colunas necessárias para sincronização (company_id, synced_at, etc).

-- 1. field_reports (Apontamentos e Produção)
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
  trips_qty INTEGER,
  length_m NUMERIC,
  width_m NUMERIC,
  height_m NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas extras em field_reports
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS info_type TEXT;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS trips_qty INTEGER;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS length_m NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS width_m NUMERIC;
ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS height_m NUMERIC;

-- 2. daily_reports (Relatório Diário / RDO)
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  date DATE NOT NULL,
  weather_morning TEXT,
  weather_afternoon TEXT,
  weather_night TEXT,
  rainfall_mm NUMERIC DEFAULT 0,
  manpower JSONB DEFAULT '[]',
  equipment JSONB DEFAULT '[]',
  activities JSONB DEFAULT '[]',
  accidents TEXT,
  fiscalization_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 3. equipments / controller_equipments (Controle de Frota)
CREATE TABLE IF NOT EXISTS public.controller_equipments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 4. controller_manpower (Controle de Mão de Obra)
CREATE TABLE IF NOT EXISTS public.controller_manpower (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  employee_id TEXT,
  date DATE,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.controller_manpower ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.controller_manpower ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 5. purchase_requests (Solicitações/Materiais)
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  date DATE,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  requester TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 6. project_alignments (Traçado do Projeto)
CREATE TABLE IF NOT EXISTS public.project_alignments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  name TEXT,
  stations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.project_alignments ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.project_alignments ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE public.project_alignments ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- 7. work_movements (Movimentações)
CREATE TABLE IF NOT EXISTS public.work_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  contract_id TEXT,
  date DATE,
  type TEXT,
  description TEXT,
  value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.work_movements ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.work_movements ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE public.work_movements ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Habilitar RLS em todas as tabelas (Opcional, mas recomendado)
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para field_reports (exemplo de fallback)
DROP POLICY IF EXISTS "Enable public read for field_reports" ON public.field_reports;
CREATE POLICY "Enable public read for field_reports" ON public.field_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable public insert for field_reports" ON public.field_reports;
CREATE POLICY "Enable public insert for field_reports" ON public.field_reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable public update for field_reports" ON public.field_reports;
CREATE POLICY "Enable public update for field_reports" ON public.field_reports FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable public delete for field_reports" ON public.field_reports;
CREATE POLICY "Enable public delete for field_reports" ON public.field_reports FOR DELETE USING (true);
