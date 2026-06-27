-- Script para atualizar a tabela resources
-- Execute este script no SQL Editor do seu Supabase para adicionar as novas colunas
-- necessárias para equipamentos (hora produtiva e improdutiva).

ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS productive_price NUMERIC DEFAULT 0;

ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS unproductive_price NUMERIC DEFAULT 0;

-- A tabela onde os insumos são salvos é a "resources" (public.resources).
