-- SIGO System - Update equipments table with pricing and measurements
BEGIN;

ALTER TABLE equipments ADD COLUMN IF NOT EXISTS contracted_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';

-- Update indices
CREATE INDEX IF NOT EXISTS idx_equipments_company_id ON equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_equipments_contract_id ON equipments(contract_id);

COMMIT;
