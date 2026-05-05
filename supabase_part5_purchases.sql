-- ==============================================================================
-- PART 5: PURCHASES MODULE - Modulo de Compras
-- ==============================================================================

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    registration_number TEXT,
    supplier_code TEXT,
    activity TEXT,
    name TEXT NOT NULL,
    contact TEXT,
    nextel TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    neighborhood_city TEXT,
    zip_code TEXT,
    state TEXT,
    email_website TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    order_date DATE,
    delivery_date DATE,
    
    -- Address embedded
    delivery_street TEXT,
    delivery_number TEXT,
    delivery_complement TEXT,
    delivery_neighborhood TEXT,
    delivery_zip_code TEXT,
    delivery_city TEXT,
    delivery_state TEXT,
    
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    additions DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    
    observations TEXT,
    status TEXT DEFAULT 'draft', -- draft, approved, sent, delivered, cancelled
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Purchase Requests Table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT,
    category TEXT,
    sector TEXT,
    status TEXT DEFAULT 'Aguardando',
    delivery_deadline DATE,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Purchase Quotations Table
CREATE TABLE IF NOT EXISTS public.purchase_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    date DATE NOT NULL,
    suppliers JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    selected_supplier_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    code TEXT,
    description TEXT NOT NULL,
    unit TEXT,
    quantity DECIMAL(15,2) DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Purchase Order Payments Table
CREATE TABLE IF NOT EXISTS public.purchase_order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    due_date DATE,
    value DECIMAL(15,2) DEFAULT 0,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_po ON public.purchase_order_payments(purchase_order_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_suppliers
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_updated_at_purchase_orders
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Suppliers
CREATE POLICY "Users can view suppliers in their tenant"
    ON public.suppliers FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert suppliers in their tenant"
    ON public.suppliers FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update suppliers in their tenant"
    ON public.suppliers FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete suppliers in their tenant"
    ON public.suppliers FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Purchase Orders
CREATE POLICY "Users can view purchase orders in their tenant"
    ON public.purchase_orders FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert purchase orders in their tenant"
    ON public.purchase_orders FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update purchase orders in their tenant"
    ON public.purchase_orders FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete purchase orders in their tenant"
    ON public.purchase_orders FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Purchase Order Items (Based on PO access)
CREATE POLICY "Users can view purchase order items"
    ON public.purchase_order_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can modify purchase order items"
    ON public.purchase_order_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    ));

-- Purchase Order Payments (Based on PO access)
CREATE POLICY "Users can view purchase order payments"
    ON public.purchase_order_payments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_payments.purchase_order_id
        AND po.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can modify purchase order payments"
    ON public.purchase_order_payments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_payments.purchase_order_id
        AND po.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    ));

-- Purchase Requests
CREATE POLICY "Users can view purchase requests in their tenant"
    ON public.purchase_requests FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert purchase requests in their tenant"
    ON public.purchase_requests FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update purchase requests in their tenant"
    ON public.purchase_requests FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete purchase requests in their tenant"
    ON public.purchase_requests FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Purchase Quotations
CREATE POLICY "Users can view purchase quotations in their tenant"
    ON public.purchase_quotations FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert purchase quotations in their tenant"
    ON public.purchase_quotations FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update purchase quotations in their tenant"
    ON public.purchase_quotations FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete purchase quotations in their tenant"
    ON public.purchase_quotations FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
