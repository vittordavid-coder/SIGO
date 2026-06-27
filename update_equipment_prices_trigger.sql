-- Script para garantir sincronização de preços médios dos equipamentos
-- 1. Adicionar colunas em controller_equipments se não existirem
ALTER TABLE public.controller_equipments 
ADD COLUMN IF NOT EXISTS productive_price NUMERIC DEFAULT 0;

ALTER TABLE public.controller_equipments 
ADD COLUMN IF NOT EXISTS unproductive_price NUMERIC DEFAULT 0;

-- 2. Criar função para atualizar recursos com os preços médios
CREATE OR REPLACE FUNCTION update_equipment_average_prices()
RETURNS TRIGGER AS $$
DECLARE
    avg_productive NUMERIC;
    avg_unproductive NUMERIC;
BEGIN
    -- Obter a média dos preços para o tipo de equipamento (na mesma empresa)
    SELECT 
        COALESCE(AVG(productive_price), 0),
        COALESCE(AVG(unproductive_price), 0)
    INTO 
        avg_productive,
        avg_unproductive
    FROM public.controller_equipments
    WHERE type = COALESCE(NEW.type, OLD.type) 
      AND company_id = COALESCE(NEW.company_id, OLD.company_id);

    -- Atualizar o recurso (insumo) correspondente com os novos valores médios
    UPDATE public.resources
    SET 
        productive_price = avg_productive,
        unproductive_price = avg_unproductive,
        base_price = avg_productive -- Para compatibilidade/referência
    WHERE name = COALESCE(NEW.type, OLD.type)
      AND company_id = COALESCE(NEW.company_id, OLD.company_id)
      AND type = 'equipment';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger na tabela controller_equipments
DROP TRIGGER IF EXISTS trigger_update_equipment_avg_prices ON public.controller_equipments;

CREATE TRIGGER trigger_update_equipment_avg_prices
AFTER INSERT OR UPDATE OF productive_price, unproductive_price, type, company_id OR DELETE
ON public.controller_equipments
FOR EACH ROW
EXECUTE FUNCTION update_equipment_average_prices();
