-- Script to ensure all columns exist in controller_equipments
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS productive_price NUMERIC DEFAULT 0;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS unproductive_price NUMERIC DEFAULT 0;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS current_reading NUMERIC DEFAULT 0;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS situation TEXT;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS owner_cnpj TEXT;
ALTER TABLE public.controller_equipments ADD COLUMN IF NOT EXISTS team TEXT;

-- Fallback for the resources table as well
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS productive_price NUMERIC DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS unproductive_price NUMERIC DEFAULT 0;
