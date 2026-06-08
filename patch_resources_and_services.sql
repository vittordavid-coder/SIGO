-- SIGO System - SQL Update Script for Resources and Service Compositions Schema
-- Establishes proper table structures, ensures missing columns (such as encargos or prices) exist, and configures public access policies.

-- 1. Create or Patch "resources" table
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    type TEXT,
    base_price NUMERIC DEFAULT 0,
    encargos NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist individually to prevent failures on pre-existing tables
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS encargos NUMERIC DEFAULT 0;

-- 2. Create or Patch "service_compositions" table
CREATE TABLE IF NOT EXISTS public.service_compositions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    production NUMERIC DEFAULT 1,
    fit NUMERIC DEFAULT 1,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist individually for "service_compositions"
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS production NUMERIC DEFAULT 1;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS fit NUMERIC DEFAULT 1;
ALTER TABLE public.service_compositions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_compositions ENABLE ROW LEVEL SECURITY;

-- 4. Create policies allowing public/global actions as configured elsewhere in standard tables
DO $$ 
BEGIN
    -- Policy for resources
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'resources') THEN
        CREATE POLICY "Allow public access" ON public.resources FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policy for service_compositions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'service_compositions') THEN
        CREATE POLICY "Allow public access" ON public.service_compositions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Create performance indices
CREATE INDEX IF NOT EXISTS idx_resources_company_id ON public.resources(company_id);
CREATE INDEX IF NOT EXISTS idx_resources_code ON public.resources(code);
CREATE INDEX IF NOT EXISTS idx_service_compositions_company_id ON public.service_compositions(company_id);
CREATE INDEX IF NOT EXISTS idx_service_compositions_code ON public.service_compositions(code);
