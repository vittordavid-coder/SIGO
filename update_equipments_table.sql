-- SQL Script to update the equipments table for SIGO Control
-- This script adds the missing columns for the new Equipment Management features

ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS situation TEXT DEFAULT 'Ativo',
ADD COLUMN IF NOT EXISTS current_reading NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';

-- Rename columns if they existed with different names (optional, based on previous state)
-- ALTER TABLE equipments RENAME COLUMN horimetro TO current_reading;

-- Ensure constraints are respected
COMMENT ON COLUMN equipments.situation IS 'Ativo, Inativo, Vendido, Sucateado, Em Manutenção';
COMMENT ON COLUMN equipments.custom_fields IS 'Dynamic technical attributes (JSONB)';
COMMENT ON COLUMN equipments.photos IS 'Array of URLs from Supabase Bucket: equipments';
COMMENT ON COLUMN equipments.history IS 'Array of ServiceHistoryEntry objects (JSONB)';
