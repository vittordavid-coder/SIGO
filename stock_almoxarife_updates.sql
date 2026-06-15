-- Script de Atualização para o Módulo Almoxarife
-- Cria as tabelas do controle de estoques, patrimônio, transferências e aplicações de materiais.

-- 1. Tabela de Almoxarifados (Estoques)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    company_id TEXT,
    contract_id UUID, -- Referência opcional à tabela de contratos/obras
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Itens de Estoque (Saldos de materiais por Almoxarifado)
CREATE TABLE IF NOT EXISTS warehouse_items (
    id UUID PRIMARY KEY,
    company_id TEXT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC DEFAULT 0,
    avg_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (warehouse_id, description)
);

-- 3. Tabela de Entradas de Materiais (Vindo das ordens de compra)
CREATE TABLE IF NOT EXISTS warehouse_entries (
    id UUID PRIMARY KEY,
    company_id TEXT,
    purchase_order_id UUID, -- Opcional link para a Ordem de Compra
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    received_by TEXT,
    items JSONB, -- Array de objetos com {description, quantity, unit, price}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Patrimônio (Ferramentas, Bens Ativos, etc.)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY,
    company_id TEXT,
    code TEXT UNIQUE NOT NULL, -- Código de tombamento/registro de patrimônio
    description TEXT NOT NULL,
    category TEXT, -- 'Ferramentas', 'Equipamentos', 'Veículos', etc.
    brand TEXT,
    serial_number TEXT,
    status TEXT DEFAULT 'Disponível', -- 'Disponível', 'Em Uso', 'Manutenção', 'Baixado'
    current_location TEXT, -- Nome ou ID do local (Almoxarifado, equipe, etc.)
    purchase_date TEXT,
    value NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Transferências de Materiais / Patrimônio
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id UUID PRIMARY KEY,
    company_id TEXT,
    origin_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    destination_warehouse_id UUID, -- Ou UUID REFERENCES warehouses(id) ou de outra obra
    destination_name TEXT, -- Nome do local/obra de destino caso seja externo
    date TEXT NOT NULL,
    transferred_by TEXT,
    status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Enviado', 'Recebido'
    items JSONB, -- Array de itens transferidos
    assets JSONB, -- Array de códigos/IDs de patrimônios transferidos
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de Aplicações de Materiais nos Serviços de Contratos
CREATE TABLE IF NOT EXISTS warehouse_applications (
    id UUID PRIMARY KEY,
    company_id TEXT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    contract_id UUID, -- ID do Contrato
    service_id UUID, -- ID do Serviço (Composition) ou de serviço do orçamento
    quantity NUMERIC DEFAULT 0,
    date TEXT NOT NULL,
    applied_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS por padrão nas tabelas novas se necessário (ou segue padrão do sistema)
-- Comentários informativos para o administrador do banco de dados:
COMMENT ON TABLE warehouses IS 'Estoques / Almoxarifados gerenciados no sistema';
COMMENT ON TABLE warehouse_items IS 'Saldo atualizado de cada material por almoxarifado';
COMMENT ON TABLE warehouse_entries IS 'Registro de recebimentos de compras';
COMMENT ON TABLE assets IS 'Controle patrimonial de bens permanentes e ferramentas';
COMMENT ON TABLE warehouse_transfers IS 'Transferência de saldo e patrimônios entre frentes de obras e almoxarifados';
COMMENT ON TABLE warehouse_applications IS 'Lançamento de consumo de materiais diretamente em serviços contratados';
