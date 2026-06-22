-- Script SQL de atualização do banco de dados para incluir o campo 'category' (Categoria) na tabela de fornecedores.
-- Caso esteja utilizando um banco relacional como PostgreSQL, MySQL ou SQL Server.

-- 1. Criação/Alteração da tabela de fornecedores para adicionar a coluna 'category'
ALTER TABLE suppliers ADD COLUMN category VARCHAR(150) DEFAULT NULL;

-- 2. (Opcional) Cadastro prévio de categorias comuns ou atualização de registros existentes
-- Caso queira preencher os registros antigos com base no ramo de atividade aproximado:
UPDATE suppliers 
SET category = 'Posto de Combustivel' 
WHERE LOWER(activity) LIKE '%posto%' OR LOWER(activity) LIKE '%combustiv%' OR LOWER(activity) LIKE '%diesel%';

UPDATE suppliers 
SET category = 'Equipamentos' 
WHERE LOWER(activity) LIKE '%maquina%' OR LOWER(activity) LIKE '%equipamento%' OR LOWER(activity) LIKE '%veiculo%';

UPDATE suppliers 
SET category = 'Materiais' 
WHERE LOWER(activity) LIKE '%material%' OR LOWER(activity) LIKE '%construca%' OR LOWER(activity) LIKE '%cimento%';
