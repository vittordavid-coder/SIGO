-- Script SQL para adicionar o vínculo de aporte nas Ordens de Compra (purchase_orders)
-- Permite armazenar em qual aporte a ordem de compra foi inserida.

ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS aporte_id UUID;

-- Caso a tabela public.aportes exista, podemos opcionalmente configurar a chave estrangeira:
-- ALTER TABLE public.purchase_orders ADD CONSTRAINT fk_purchase_orders_aporte FOREIGN KEY (aporte_id) REFERENCES public.aportes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.purchase_orders.aporte_id IS 'ID do Aporte Financeiro no qual esta Ordem de Compra foi inserida';
