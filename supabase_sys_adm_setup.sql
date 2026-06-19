-- Script de configuração do bucket 'sys_adm' no Supabase
-- Criação do bucket se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sys_adm', 'sys_adm', true) 
ON CONFLICT (id) DO NOTHING;

-- Configuração das Políticas de Segurança (Policies) para o bucket 'sys_adm'
-- Permite leitura de objetos pública
CREATE POLICY "Public Read sys_adm" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'sys_adm');

-- Permite inserção de novos arquivos no bucket sys_adm
CREATE POLICY "Public Insert sys_adm" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'sys_adm');

-- Permite atualização de arquivos existentes
CREATE POLICY "Public Update sys_adm" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'sys_adm')
WITH CHECK (bucket_id = 'sys_adm');

-- Permite exclusão de arquivos existentes
CREATE POLICY "Public Delete sys_adm" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'sys_adm');
