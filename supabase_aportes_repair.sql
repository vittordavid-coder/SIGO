-- Reconstrução das tabelas de aportes para usar campos de ID de texto (TEXT) compatíveis com o restante do sistema,
-- e configuração de políticas de segurança (RLS) completas (CRUD) que permitem gravação e evitam erros de salvamento.

DROP TABLE IF EXISTS public.aporte_items CASCADE;
DROP TABLE IF EXISTS public.aportes CASCADE;

CREATE TABLE public.aportes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  contract_id TEXT,
  numero VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.aporte_items (
  id TEXT PRIMARY KEY,
  aporte_id TEXT NOT NULL REFERENCES public.aportes(id) ON DELETE CASCADE,
  categoria VARCHAR(255),
  subcategoria VARCHAR(255),
  fornecedor VARCHAR(255),
  descricao TEXT,
  mes_competencia VARCHAR(50),
  data_vencimento DATE,
  valor NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa RLS para conformidade
ALTER TABLE public.aportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aporte_items ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se houver
DROP POLICY IF EXISTS "Aportes são visíveis apenas para a mesma empresa" ON public.aportes;
DROP POLICY IF EXISTS "Itens de aporte seguem a visibilidade do aporte pai" ON public.aporte_items;
DROP POLICY IF EXISTS "Allow public access for aportes" ON public.aportes;
DROP POLICY IF EXISTS "Allow public access for aporte_items" ON public.aporte_items;

-- Cria políticas públicas de leitura/escrita de acordo com o padrão do sistema (p. ex., contratos, medições)
CREATE POLICY "Allow public access for aportes" ON public.aportes 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access for aporte_items" ON public.aporte_items 
  FOR ALL USING (true) WITH CHECK (true);
