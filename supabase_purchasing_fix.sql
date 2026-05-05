-- SIGO - Purchase Management Fixes
-- This script ensures all columns and policies are correctly set for the Purchasing module.

-- 1. Ensure purchase_requests has correct structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'company_id') THEN
        ALTER TABLE public.purchase_requests ADD COLUMN company_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'contract_id') THEN
        ALTER TABLE public.purchase_requests ADD COLUMN contract_id TEXT;
    END IF;
END $$;

-- 2. Ensure purchase_quotations has correct structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_quotations' AND column_name = 'company_id') THEN
        ALTER TABLE public.purchase_quotations ADD COLUMN company_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_quotations' AND column_name = 'selected_supplier_id') THEN
        ALTER TABLE public.purchase_quotations ADD COLUMN selected_supplier_id TEXT;
    END IF;
END $$;

-- 3. Ensure purchase_orders has correct structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'company_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN company_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'origin_quotation_id') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN origin_quotation_id TEXT;
    END IF;
END $$;

-- 4. Set RLS for Compras (if not already set)
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Drop and recreate to ensure they use tenant-based access)
DROP POLICY IF EXISTS "Users can view purchase requests in their tenant" ON public.purchase_requests;
CREATE POLICY "Users can view purchase requests in their tenant"
    ON public.purchase_requests FOR SELECT
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update purchase requests in their tenant" ON public.purchase_requests;
CREATE POLICY "Users can update purchase requests in their tenant"
    ON public.purchase_requests FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert purchase requests in their tenant" ON public.purchase_requests;
CREATE POLICY "Users can insert purchase requests in their tenant"
    ON public.purchase_requests FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Repeat for Quotations
DROP POLICY IF EXISTS "Users can view purchase quotations in their tenant" ON public.purchase_quotations;
CREATE POLICY "Users can view purchase quotations in their tenant"
    ON public.purchase_quotations FOR SELECT
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update purchase quotations in their tenant" ON public.purchase_quotations;
CREATE POLICY "Users can update purchase quotations in their tenant"
    ON public.purchase_quotations FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert purchase quotations in their tenant" ON public.purchase_quotations;
CREATE POLICY "Users can insert purchase quotations in their tenant"
    ON public.purchase_quotations FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Repeat for Orders
DROP POLICY IF EXISTS "Users can view purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can view purchase orders in their tenant"
    ON public.purchase_orders FOR SELECT
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can update purchase orders in their tenant"
    ON public.purchase_orders FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert purchase orders in their tenant" ON public.purchase_orders;
CREATE POLICY "Users can insert purchase orders in their tenant"
    ON public.purchase_orders FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Final check on indices
CREATE INDEX IF NOT EXISTS idx_purchase_requests_company ON public.purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotations_company ON public.purchase_quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
