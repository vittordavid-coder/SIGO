-- SIGO System - Final Update for Equipment Measurements
BEGIN;

-- Ensure equipments table has the new pricing and measurement storage
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_equipments_company_id ON equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_equipments_contracts ON equipments(contract_id);

COMMIT;
