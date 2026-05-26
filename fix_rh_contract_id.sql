-- ========================================================
-- SCRIPT DE CORREÇÃO PARA O MÓDULO DE RECURSOS HUMANOS (RH)
-- Adicionando a coluna contract_id aos templates de RH
-- ========================================================

-- 1. Adicionar a coluna contract_id se ela não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'rh_templates' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE rh_templates ADD COLUMN contract_id TEXT;
  END IF;
END $$;

-- Opcionalmente, pode ser adicionada uma constraint (FOREIGN KEY) para a tabela de contracts, 
-- caso exista uma relação explícita, mas garantimos que a coluna existe para o código funcionar.
-- ALTER TABLE rh_templates ADD CONSTRAINT fk_rh_templates_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
