-- SIGO System - Supabase Migration Script 06 (Compras)

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    order_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    order_date DATE,
    delivery_date DATE,
    
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
    status TEXT DEFAULT 'draft',
    contract_id TEXT,
    origin_quotation_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    equipment_id TEXT,
    date DATE,
    description TEXT,
    category TEXT,
    sector TEXT,
    status TEXT,
    delivery_deadline DATE,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_quotations (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    items JSONB DEFAULT '[]',
    date DATE,
    suppliers JSONB DEFAULT '[]',
    status TEXT,
    selected_supplier_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    equipment_id TEXT,
    code TEXT,
    description TEXT NOT NULL,
    unit TEXT,
    quantity DECIMAL(15,2) DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_payments (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    due_date DATE,
    value DECIMAL(15,2) DEFAULT 0,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase requests in their tenant" ON purchase_requests;
DROP POLICY IF EXISTS "Users can update purchase requests in their tenant" ON purchase_requests;
DROP POLICY IF EXISTS "Users can insert purchase requests in their tenant" ON purchase_requests;
DROP POLICY IF EXISTS "Users can view purchase quotations in their tenant" ON purchase_quotations;
DROP POLICY IF EXISTS "Users can update purchase quotations in their tenant" ON purchase_quotations;
DROP POLICY IF EXISTS "Users can insert purchase quotations in their tenant" ON purchase_quotations;
DROP POLICY IF EXISTS "Users can view purchase orders in their tenant" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase orders in their tenant" ON purchase_orders;
DROP POLICY IF EXISTS "Users can insert purchase orders in their tenant" ON purchase_orders;

CREATE POLICY "Allow public access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_order_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON purchase_quotations FOR ALL USING (true) WITH CHECK (true);
