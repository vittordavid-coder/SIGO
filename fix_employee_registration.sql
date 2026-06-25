-- Esse script garante que a coluna 'registration_number' exista na tabela employees
-- e remove restrições únicas globais que possam estar causando falhas silenciosas
-- ao salvar matrículas iguais entre empresas diferentes, ou matrículas nulas.

DO $$ 
BEGIN
    -- 1. Garante que a coluna registration_number exista
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'registration_number'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN registration_number TEXT;
    END IF;

    -- 2. Remove a constraint de UNIQUE global que pode estar bloqueando os cadastros
    -- (O banco pode estar rejeitando múltiplos NULLs ou a mesma matrícula para empresas diferentes)
    ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_registration_number_key;
    
END $$;
