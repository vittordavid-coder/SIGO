-- SCRIPT DE AJUSTE AUTOMÁTICO PARA PERSISTÊNCIA DE APORTES E ITENS NO SISTEMA SIGO
-- Este script garante a criação e correção estrutural das tabelas 'aportes' e 'aporte_items'.
-- Utiliza id, company_id e contract_id do tipo TEXT para conformidade completa com chaves e UUIDs gerados no frontend.
-- Também configura as políticas de segurança de linha (RLS) corretas para garantir que as gravações do usuário funcionem.

-- 1. Criação/Correção da tabela de 'aportes'
CREATE TABLE IF NOT EXISTS public.aportes (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    contract_id TEXT,
    numero VARCHAR(255) NOT NULL,
    data DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remove a restrição NOT NULL em colunas para evitar falhas silenciosas de importação
ALTER TABLE public.aportes ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.aportes ALTER COLUMN data DROP NOT NULL;

-- 2. Criação/Correção da tabela de 'aporte_items'
CREATE TABLE IF NOT EXISTS public.aporte_items (
    id TEXT PRIMARY KEY,
    aporte_id TEXT REFERENCES public.aportes(id) ON DELETE CASCADE,
    categoria VARCHAR(255),
    subcategoria VARCHAR(255),
    fornecedor VARCHAR(255),
    descricao TEXT,
    mes_competencia VARCHAR(50),
    data_vencimento DATE,
    valor NUMERIC(12, 2) DEFAULT 0,
    purchase_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona suporte a purchase_order_id e outras colunas caso a tabela já existia sem elas
ALTER TABLE public.aporte_items ADD COLUMN IF NOT EXISTS purchase_order_id TEXT;
ALTER TABLE public.aporte_items ALTER COLUMN aporte_id DROP NOT NULL;

-- 3. Correção de segurança e políticas RLS (Row Level Security)
-- Garante que RLS está habilitado
ALTER TABLE public.aportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aporte_items ENABLE ROW LEVEL SECURITY;

-- Limpa e redefine políticas públicas irrestritas de CRUD para as duas tabelas
DROP POLICY IF EXISTS "Allow public access for aportes" ON public.aportes;
CREATE POLICY "Allow public access for aportes" ON public.aportes 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for aporte_items" ON public.aporte_items;
CREATE POLICY "Allow public access for aporte_items" ON public.aporte_items 
    FOR ALL USING (true) WITH CHECK (true);

-- Comentários úteis de auditoria técnica
COMMENT ON TABLE public.aportes IS 'Aportes financeiros importados ou inseridos no módulo Financeiro';
COMMENT ON TABLE public.aporte_items IS 'Itens detalhados pertencentes a cada aporte';
COMMENT ON COLUMN public.aporte_items.purchase_order_id IS 'ID opcional da Ordem de Compra vinculada a este item de aporte';
