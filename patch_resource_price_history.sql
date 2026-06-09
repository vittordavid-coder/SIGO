-- Migração de Histórico de Preços de Insumos (Recursos)
-- Este script cria a tabela de histórico de preços para insumos e popula
-- com base no preço inicial e nas compras reais efetuadas no setor de compras.

-- 1. Criação da tabela de histórico de preços
CREATE TABLE IF NOT EXISTS public.resource_price_history (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    resource_id TEXT REFERENCES public.resources(id) ON DELETE CASCADE,
    price NUMERIC(15,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL, -- 'initial_price' | 'purchase'
    purchase_item_id TEXT, -- opcional link para item de ordem de compra
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitação de RLS (Row Level Security)
ALTER TABLE public.resource_price_history ENABLE ROW LEVEL SECURITY;

-- 3. Configuração de políticas de acesso público irrestrito (compatível com a arquitetura existente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access' AND tablename = 'resource_price_history') THEN
        CREATE POLICY "Allow public access" ON public.resource_price_history
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Inserção dos preços iniciais de cada insumo (resources.base_price)
INSERT INTO public.resource_price_history (id, company_id, resource_id, price, date, source, created_at)
SELECT 
    'init_' || r.id, 
    r.company_id, 
    r.id, 
    COALESCE(r.base_price, 0), 
    COALESCE(r.created_at, now()), 
    'initial_price', 
    now()
FROM public.resources r
WHERE NOT EXISTS (
    SELECT 1 FROM public.resource_price_history h 
    WHERE h.resource_id = r.id AND h.source = 'initial_price'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Inserção dos históricos a partir de compras realizadas pelo setor de COMPRAS (purchase_order_items)
-- Associação realizada via Código do Insumo (se houver) ou Nome do Insumo idêntico
INSERT INTO public.resource_price_history (id, company_id, resource_id, price, date, source, purchase_item_id, created_at)
SELECT 
    'purch_' || poi.id, 
    r.company_id, -- herda a empresa vinculada ao recurso correspondente
    r.id, 
    poi.price, 
    COALESCE(po.order_date::timestamptz, poi.created_at, now()), 
    'purchase', 
    poi.id, 
    now()
FROM public.purchase_order_items poi
JOIN public.purchase_orders po ON poi.purchase_order_id = po.id
JOIN public.resources r ON (
    (poi.code IS NOT NULL AND TRIM(poi.code) <> '' AND r.code = poi.code) OR 
    (LOWER(TRIM(r.name)) = LOWER(TRIM(poi.description)))
)
WHERE NOT EXISTS (
    SELECT 1 FROM public.resource_price_history h 
    WHERE h.purchase_item_id = poi.id
)
ON CONFLICT (id) DO NOTHING;
