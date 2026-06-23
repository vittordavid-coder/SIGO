-- ====================================================================
-- Script SQL para criação da tabela de Fechamento de Jornada
-- Tabela Destino: period_closing_records
-- ====================================================================

-- 1. Criação da tabela period_closing_records se não existir
CREATE TABLE IF NOT EXISTS period_closing_records (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    closing_month VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    employee_role TEXT,
    worked_days INT DEFAULT 0,
    absences INT DEFAULT 0,
    medical_certificates INT DEFAULT 0,
    vacation_days INT DEFAULT 0,
    leave_days INT DEFAULT 0,
    overtime_50 DECIMAL(10, 2) DEFAULT 0,
    overtime_100 DECIMAL(10, 2) DEFAULT 0,
    night_shift DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, closing_month, employee_id)
);

-- 2. Habilitar RLS (Row Level Security) caso esteja desabilitado
ALTER TABLE period_closing_records ENABLE ROW LEVEL SECURITY;

-- 3. Inserir ou atualizar política de acesso público para manipulação do painel
DROP POLICY IF EXISTS "Allow public access on period_closing_records" ON period_closing_records;
CREATE POLICY "Allow public access on period_closing_records" ON period_closing_records FOR ALL USING (true) WITH CHECK (true);
