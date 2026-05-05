-- Migration script to update Purchase Sector
-- 1. Add cost_center to purchase_requests
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS cost_center TEXT;

-- 2. Add cost_center and category to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Update status from 'Aguardando' to 'Pendente' in purchase_requests
UPDATE public.purchase_requests 
SET status = 'Pendente' 
WHERE status = 'Aguardando';

-- 4. Update status inside items JSONB array in purchase_requests
-- This will replace "status": "Aguardando" with "status": "Pendente" for all items
UPDATE public.purchase_requests 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN (elem->>'status') = 'Aguardando' 
      THEN elem || jsonb_build_object('status', 'Pendente')
      ELSE elem 
    END
  )
  FROM jsonb_array_elements(items) elem
)
WHERE items @> '[{"status": "Aguardando"}]';

-- 5. Fix possible default values
ALTER TABLE public.purchase_requests ALTER COLUMN status SET DEFAULT 'Pendente';

-- 6. Update purchase_orders status from 'delivered' to 'finalizada'
UPDATE public.purchase_orders
SET status = 'finalizada'
WHERE status = 'delivered';
