
-- SIGO Database Fix Script - Purchases and Missing Columns

-- 1. Purchase Orders Table Fix
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT '{}';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS additions NUMERIC DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_conditions JSONB DEFAULT '[]';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS origin_quotation_id TEXT;

-- 2. Purchase Requests Table Fix
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS delivery_deadline DATE;

-- 3. Ensure RLS and Policies
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['purchase_orders', 'purchase_requests', 'purchase_quotations'])
    LOOP
        EXECUTE format('DO $inner$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''Allow public access'' AND tablename = %L) THEN CREATE POLICY "Allow public access" ON %I FOR ALL USING (true); END IF; END $inner$', t, t);
    END LOOP;
END $$;

-- 4. Realtime Publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders, purchase_requests, purchase_quotations;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Tables already in publication or publication missing';
END $$;
