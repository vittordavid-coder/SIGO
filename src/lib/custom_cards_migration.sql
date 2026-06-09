-- SIGO System - Custom Management Cards Database Sync Script
-- This script structures the table to persist the custom management dashboard configurations per contract.
-- Copy and run this in the Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.management_custom_cards (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    type TEXT NOT NULL,          -- 'Material' | 'Equipamentos' | 'Serviços'
    material_name TEXT,          -- Specific material filter if type is 'Material'
    equipment_type TEXT,         -- 'alugado' | 'proprio' | 'ambos' if type is 'Equipamentos'
    display_order INTEGER,       -- Order in which cards are displayed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure index for fast querying per company and contract
CREATE INDEX IF NOT EXISTS idx_management_custom_cards_company_contract 
ON public.management_custom_cards (company_id, contract_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.management_custom_cards ENABLE ROW LEVEL SECURITY;

-- Apply "Allow public access" policy (mirrors current database policy system for seamless access)
DROP POLICY IF EXISTS "Allow public access" ON public.management_custom_cards;
CREATE POLICY "Allow public access" ON public.management_custom_cards FOR ALL USING (true) WITH CHECK (true);

COMMIT;
