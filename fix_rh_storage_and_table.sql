-- ========================================================
-- SCRIPT DE CORREÇÃO PARA O MÓDULO DE RECURSOS HUMANOS (RH)
-- ========================================================

-- 1. Criação do Bucket de Storage "RH"
INSERT INTO storage.buckets (id, name, public) 
VALUES ('RH', 'RH', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Acesso Público para o Bucket "RH"
-- Isso permite visualizar e gerenciar os documentos de RH
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read RH' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Read RH" ON storage.objects FOR SELECT USING ( bucket_id = 'RH' );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload RH' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Upload RH" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'RH' );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Update RH' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Update RH" ON storage.objects FOR UPDATE USING ( bucket_id = 'RH' );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Delete RH' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Delete RH" ON storage.objects FOR DELETE USING ( bucket_id = 'RH' );
  END IF;
END $$;

-- 3. Criação da Tabela para registrar os Modelos e Documentos Salvos
CREATE TABLE IF NOT EXISTS rh_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  type TEXT,
  file_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar Segurança em Nível de Linha (RLS)
ALTER TABLE rh_templates ENABLE ROW LEVEL SECURITY;

-- 5. Permitir Acesso Público à Tabela "rh_templates"
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'rh_templates' AND schemaname = 'public') THEN
    CREATE POLICY "Public Access" ON rh_templates FOR ALL USING (true);
  END IF;
END $$;
