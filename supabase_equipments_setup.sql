-- SQL Update to ensure equipment functionality with measurements
-- Run this in your Supabase SQL Editor

-- Ensure the equipments table has the measurements and other required columns
-- Note: 'equipments' is the table name requested by the user.

CREATE TABLE IF NOT EXISTS public.equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contract_id TEXT,
    code TEXT,
    name TEXT NOT NULL,
    type TEXT,
    brand TEXT,
    model TEXT,
    year INTEGER,
    plate TEXT,
    situation TEXT DEFAULT 'Ativo',
    entry_date DATE,
    exit_date DATE,
    observations TEXT,
    measurement_unit TEXT DEFAULT 'Horímetro',
    current_reading NUMERIC DEFAULT 0,
    contracted_price NUMERIC DEFAULT 0,
    monthly_price NUMERIC DEFAULT 0,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT '{}',
    history JSONB DEFAULT '[]'::jsonb,
    measurements JSONB DEFAULT '[]'::jsonb, -- This column stores the measurement history
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure RLS is enabled
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Allow users to see only their company's data
-- Note: Adjust based on your auth structure. Typically you want to check company_id.
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.equipments;
CREATE POLICY "Enable all for authenticated users" ON public.equipments
    FOR ALL USING (auth.role() = 'authenticated');

-- Comments on columns for clarity
COMMENT ON COLUMN public.equipments.measurements IS 'Stores JSON array of EquipmentMeasurement objects';
COMMENT ON COLUMN public.equipments.history IS 'Stores JSON array of maintenance entries';
COMMENT ON COLUMN public.equipments.custom_fields IS 'Stores dynamic technical attributes';
