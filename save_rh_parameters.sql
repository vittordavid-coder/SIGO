-- ====================================================================
-- Script SQL para salvamento dos Parâmetros de Recursos Humanos
-- Tabela Destino: system_config
-- Chave do Config: 'rh_parameters_config'
-- ====================================================================

-- 1. Criação da tabela system_config se não existir
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, config_key)
);

-- 2. Habilitar RLS (Row Level Security) caso esteja desabilitado
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 3. Inserir ou atualizar política de acesso público para manipulação do painel
DROP POLICY IF EXISTS "Allow public access on system_config" ON system_config;
CREATE POLICY "Allow public access on system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);

-- 4. Exemplo de inserção salvando os parâmetros padrões de Recursos Humanos
-- Substituir 'default' pelo ID correto da empresa se necessário.
-- O registro usa a sintaxe de UPSERT para atualizar se já existir para a empresa corrente.
INSERT INTO system_config (id, company_id, config_key, config_value, updated_at)
VALUES (
    'default_rh_parameters_config',
    'default',
    'rh_parameters_config',
    '{
        "workEntryTime": "08:00",
        "workExitTime": "17:00",
        "lunchStart": "12:00",
        "lunchEnd": "13:00",
        "dailyHours": 8,
        "weeklyHours": 44,
        "workSchedule": "5x2",
        "delayTolerance": 5,
        "extraHoursTolerance": 10,
        "overtimeRate50": 50,
        "overtimeRate100": 100,
        "nightShiftStart": "22:00",
        "nightShiftEnd": "05:00",
        "nightShiftAllowance": 20,
        "timeBankEnabled": true,
        "timeBankMaxPositive": 40,
        "timeBankMaxNegative": -20,
        "timeBankValidityMonths": 6,
        "autoCompensate": true,
        "extraCosts": [
            {"id": "1", "name": "FGTS", "percentage": 8},
            {"id": "2", "name": "INSS Patronal", "percentage": 20},
            {"id": "3", "name": "Férias + 1/3 Proporcional", "percentage": 11.11},
            {"id": "4", "name": "13º Salário Proporcional", "percentage": 8.33}
        ]
    }'::jsonb,
    now()
)
ON CONFLICT (company_id, config_key) 
DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = now();
