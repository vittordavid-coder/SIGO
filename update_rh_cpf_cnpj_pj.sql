-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO BANCO DE DADOS: SUPORTE A CNPJ E MODALIDADE PJ EM RH
-- ==============================================================================
-- Este script atualiza as restrições e colunas da tabela de colaboradores (employees)
-- para permitir o cadastro de Pessoas Jurídicas (CNPJ com 14 dígitos) e modalidade
-- de contratação 'pj' (Prestador de Serviço).
-- ==============================================================================

-- 1. Atualiza ou remove a restrição de verificação (CHECK constraint) do tipo de pagamento/contratação se existir
DO $$
BEGIN
    -- Se existir uma restrição no tipo de pagamento, remove para atualizar
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'employees' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_payment_type_check;
    END IF;
END $$;

-- 2. Adiciona a nova restrição permitindo 'hour', 'day', 'month' e 'pj'
ALTER TABLE employees 
ADD CONSTRAINT employees_payment_type_check 
CHECK (payment_type IN ('hour', 'day', 'month', 'pj'));

-- 3. Atualiza comentários na coluna cpf/documento para indicar suporte a CPF e CNPJ
COMMENT ON COLUMN employees.cpf IS 'Número do documento de identificação fiscal do colaborador (CPF de 11 dígitos ou CNPJ de 14 dígitos)';

-- 4. Exemplo de consulta para verificar colaboradores cadastrados como PJ
-- SELECT id, name, cpf, payment_type, salary 
-- FROM employees 
-- WHERE payment_type = 'pj' OR LENGTH(REGEXP_REPLACE(cpf, '\D', '', 'g')) = 14;
