-- SQL para o Bucket rdo_photos e migração no db Supabase

-- 1. Criar o bucket 'rdo_photos' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('rdo_photos', 'rdo_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de segurança do Storage (RDO Photos)
-- Permitir select público
CREATE POLICY "Fotos do RDO Publicas"
ON storage.objects FOR SELECT
USING ( bucket_id = 'rdo_photos' );

-- Permitir insert para autênticados
CREATE POLICY "Fotos do RDO Insert Authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'rdo_photos' );

-- Permitir delete para autênticados
CREATE POLICY "Fotos do RDO Delete Authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'rdo_photos' );

-- 3. Atualizar a tabela daily_reports para garantir que column photos seja JSONB default vazio
-- (Se a coluna já existe, esta operação não falhará se já for jsonb)
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
