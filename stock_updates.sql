-- Script SQL para suporte às atualizações de Estoque e Histórico de Equipamentos

-- Adiciona campo de prioridade e status 'Recebido' às solicitações de compra
ALTER TABLE IF EXISTS purchase_requests 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente';

-- Note: A estrutura de 'items' dentro de purchase_requests geralmente é um JSONB
-- Este script assume que o sistema de sincronização lidará com o merge do JSONB
-- Mas aqui está uma estrutura sugerida para uma tabela de itens separada se necessário:

/*
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY,
    request_id UUID REFERENCES purchase_requests(id),
    description TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    unit TEXT,
    applied_quantity DECIMAL DEFAULT 0,
    status TEXT
);
*/

-- Histórico de Equipamentos (Geralmente armazenado como JSONB na coluna 'history' de 'equipments')
-- Se desejar normalizar para uma tabela:
/*
CREATE TABLE IF NOT EXISTS equipment_service_history (
    id UUID PRIMARY KEY,
    equipment_id UUID REFERENCES controller_equipments(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type TEXT, -- 'part_application', 'maintenance', etc.
    description TEXT,
    related_id UUID, -- requestId
    parts JSONB -- List of parts applied: {description, quantity, unit}
);
*/
