-- Adiciona a coluna custom_title na tabela service_productions
-- Este campo permite que um título personalizado substitua o nome do serviço no acompanhamento físico.

ALTER TABLE service_productions 
ADD COLUMN IF NOT EXISTS custom_title TEXT;

-- Comentário para documentação no banco de dados
COMMENT ON COLUMN service_productions.custom_title IS 'Título personalizado que substitui o nome do serviço original no acompanhamento físico.';
