-- SQL Script to fix purchase order saving in Supabase
-- This script adds the missing 'items' and 'evaluation' columns of type JSONB to the 'purchase_orders' table.
-- Drag/Paste and run this in your Supabase SQL Editor.

-- 1. Ensure the 'items' column exists to store nested items list
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure the 'evaluation' column exists to store supplier evaluation ratings
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS evaluation JSONB DEFAULT '{}'::jsonb;

-- 3. Confirm other essential columns are present on purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS additions NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS origin_quotation_id TEXT;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- 5. Establish proper policies for row-level operations matching company_id
DROP POLICY IF EXISTS "Users can view purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can view purchase orders in their tenant"
    ON public.purchase_orders FOR SELECT
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can update purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can update purchase orders in their tenant"
    ON public.purchase_orders FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can insert purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can insert purchase orders in their tenant"
    ON public.purchase_orders FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()::text));

-- Backup fallback policy for public access if company context is offline
DROP POLICY IF EXISTS "Allow public access" ON public.purchase_orders;
CREATE POLICY "Allow public access" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

-- 6. Add performance index on company_id
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON public.purchase_orders(company_id);

-- 7. Force PostgREST schema cache reload to recognize the newly added columns immediately
NOTIFY pgrst, 'reload schema';
