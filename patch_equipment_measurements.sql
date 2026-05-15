-- SIGO System - SQL Update Script for Equipment Measurements
-- Supports the new "discount" field in daily measurement details

-- 1. Create equipment_measurements table
CREATE TABLE IF NOT EXISTS public.equipment_measurements (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    equipment_id TEXT REFERENCES public.equipments(id) ON DELETE CASCADE,
    number INTEGER,
    month TEXT,
    period TEXT,
    total_units NUMERIC DEFAULT 0,
    total_value NUMERIC DEFAULT 0,
    details JSONB DEFAULT '[]', -- Contains DailyEquipmentMeasurement[] with new "discount" field
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.equipment_measurements ENABLE ROW LEVEL SECURITY;

-- 3. Add policies (Allowing all for now as per project convention in seed scripts)
-- In production, these should be restricted by company_id or user role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'equipment_measurements') THEN
        CREATE POLICY "Allow public access" ON public.equipment_measurements FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_equipment_measurements_equipment_id ON public.equipment_measurements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_measurements_company_id ON public.equipment_measurements(company_id);

-- Documentation of JSONB structure in "details" column:
-- [
--   {
--     "date": "YYYY-MM-DD",
--     "initialReading": number,
--     "finalReading": number,
--     "discount": boolean,  -- RECENT UPDATE: If true, this day's production is not added to net total
--     "status": "Trabalhando" | "Chuva" | "Manutenção" | "Aguardando Frente" | "à Disposição"
--   },
--   ...
-- ]
