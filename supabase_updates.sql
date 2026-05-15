-- SIGO CONTROLLER - SQL Updates for Fuel Control and Maintenance
-- Rodar no editor SQL do Supabase

-- 1. Updates for Equipments Maintenance
ALTER TABLE IF EXISTS public.equipments 
ADD COLUMN IF NOT EXISTS maintenance_exit_date TEXT;

-- 2. Fuel Reservoirs (Reservatórios)
CREATE TABLE IF NOT EXISTS public.fuel_reservoirs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    contract_id UUID,
    name TEXT NOT NULL,
    capacity NUMERIC NOT NULL DEFAULT 0,
    current_level NUMERIC NOT NULL DEFAULT 0,
    fuel_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fuel Logs (Movimentações de Combustível)
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    tank_id UUID NOT NULL REFERENCES public.fuel_reservoirs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC NOT NULL DEFAULT 0,
    equipment_id UUID,
    notes TEXT,
    cost NUMERIC,
    supplier TEXT,
    unit_price NUMERIC,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_reservoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- Policies for fuel_reservoirs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their company reservoirs') THEN
        CREATE POLICY "Users can see their company reservoirs" ON public.fuel_reservoirs
            FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their company reservoirs') THEN
        CREATE POLICY "Users can manage their company reservoirs" ON public.fuel_reservoirs
            FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
    END IF;
END $$;

-- Policies for fuel_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their company fuel logs') THEN
        CREATE POLICY "Users can see their company fuel logs" ON public.fuel_logs
            FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their company fuel logs') THEN
        CREATE POLICY "Users can manage their company fuel logs" ON public.fuel_logs
            FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
    END IF;
END $$;
