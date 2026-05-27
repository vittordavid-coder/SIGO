-- Criação da tabela de aportes
CREATE TABLE IF NOT EXISTS public.aportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contract_id UUID,
  numero VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de itens de aporte
CREATE TABLE IF NOT EXISTS public.aporte_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aporte_id UUID NOT NULL REFERENCES public.aportes(id) ON DELETE CASCADE,
  categoria VARCHAR(255),
  subcategoria VARCHAR(255),
  fornecedor VARCHAR(255),
  descricao TEXT,
  mes_competencia VARCHAR(50),
  data_vencimento DATE,
  valor NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança (RUD / RLS) simplificadas
ALTER TABLE public.aportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aporte_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aportes são visíveis apenas para a mesma empresa" ON public.aportes
  FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE company_id = aportes.company_id));

CREATE POLICY "Itens de aporte seguem a visibilidade do aporte pai" ON public.aporte_items
  FOR SELECT USING (aporte_id IN (SELECT id FROM public.aportes WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));
