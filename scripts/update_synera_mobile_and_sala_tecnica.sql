-- ====================================================================
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Synera Mobile (RH / Produção) & Sala Técnica (Controles de Produção)
-- ====================================================================

-- 1. Tabela de Parâmetros e Configurações do Sistema (RH / Synera Mobile)
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_config UNIQUE (company_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_system_config_company_key ON system_config(company_id, config_key);

-- 2. Tabela de Controles Operacionais da Sala Técnica (service_productions)
CREATE TABLE IF NOT EXISTS service_productions (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255),
    contract_id VARCHAR(255),
    service_id VARCHAR(255),
    month VARCHAR(20) NOT NULL,
    num_equip NUMERIC DEFAULT 1,
    work_days NUMERIC DEFAULT 22,
    hours_day NUMERIC DEFAULT 9,
    unit_hour NUMERIC DEFAULT 100,
    efficiency NUMERIC DEFAULT 100,
    rain_percent NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    prev_month_accumulated NUMERIC DEFAULT 0,
    daily_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_prod_company_contract ON service_productions(company_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_service_prod_service_month ON service_productions(service_id, month);

-- 3. Tabela de Apontamentos de Campo / Field Reports (Synera Mobile - Produção)
CREATE TABLE IF NOT EXISTS field_reports (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255),
    contract_name TEXT,
    service_id VARCHAR(255),
    service_name TEXT,
    unit VARCHAR(50),
    qty NUMERIC,
    info_type VARCHAR(50) DEFAULT 'qty',
    trips_qty INTEGER,
    length_m NUMERIC,
    width_m NUMERIC,
    height_m NUMERIC,
    production_date DATE,
    start_station VARCHAR(100),
    end_station VARCHAR(100),
    trecho TEXT,
    notes TEXT,
    photo TEXT,
    reported_by TEXT,
    reported_by_email TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    synced BOOLEAN DEFAULT true,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Garantir adição das novas colunas de Tipo de Informação na tabela field_reports caso a tabela já exista
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='info_type') THEN
        ALTER TABLE field_reports ADD COLUMN info_type VARCHAR(50) DEFAULT 'qty';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='trips_qty') THEN
        ALTER TABLE field_reports ADD COLUMN trips_qty INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='length_m') THEN
        ALTER TABLE field_reports ADD COLUMN length_m NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='width_m') THEN
        ALTER TABLE field_reports ADD COLUMN width_m NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_reports' AND column_name='height_m') THEN
        ALTER TABLE field_reports ADD COLUMN height_m NUMERIC;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_field_reports_contract_date ON field_reports(contract_id, production_date);
CREATE INDEX IF NOT EXISTS idx_field_reports_service ON field_reports(service_id);

-- 4. Tabela Geral de Estado dos Módulos (app_state) para Fallback Resiliente
CREATE TABLE IF NOT EXISTS app_state (
    id VARCHAR(255) PRIMARY KEY,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS e Permissões de Acesso Público para leitura e escrita na API da empresa
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_productions DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;

-- Confirmação da aplicação do script
SELECT 'Atualização do banco de dados concluída com sucesso para o Synera Mobile e Sala Técnica!' as status;
