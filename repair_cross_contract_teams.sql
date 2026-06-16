-- SCRIPT DE LIMPEZA DE ASSOCIAÇÕES CRUZADAS (CROSS-CONTRACT)
-- Remove associações de equipamentos e colaboradores (team_assignments)
-- cujo contrato base (registrado no assignment) não bate com o contrato da equipe alvo.

DELETE FROM public.team_assignments
WHERE id IN (
  SELECT ta.id
  FROM public.team_assignments ta
  JOIN public.controller_teams ct ON ct.id = ta.team_id
  WHERE ta.contract_id IS NOT NULL 
    AND ct.contract_id IS NOT NULL
    AND ta.contract_id != ct.contract_id
);

-- NOTA:
-- Após rodar este script, os equipamentos ou colaboradores que estavam "desaparecidos"
-- ou incorretos voltarão para o status de "Sem Equipe" no app.
-- Assim, bastará ir no Controlador ou no RH e re-associar à equipe "Terraplenagem 01" com segurança.
