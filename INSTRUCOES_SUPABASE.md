# Instruções de Migração Supabase - Sistema SIGO

O script foi dividido em 7 partes organizadas por setores para facilitar a execução.

### Ordem de Execução

Siga exatamente esta ordem no SQL Editor do seu projeto Supabase:

1.  **'script00_main.sql'**: Principal (Tudo que o sistema precisa para funcionar, config de Admins).
2.  **'script01_chat.sql'**: Chat (Todas as configurações relativas às mensagens).
3.  **'script02_quotations.sql'**: Cotações (Insumos, Composições, Orçamentos e Cronogramas de orçamento).
4.  **'script03_technical_room.sql'**: Sala Técnica (Contratos, Medições, Diários, etc).
5.  **'script04_hr.sql'**: RH (Funcionários).
6.  **'script05_controller.sql'**: Controlador (RDO, Equipamentos, Mão de Obra, Apontamentos).
7.  **'script06_purchases.sql'**: Compras (Fornecedores e Ordens de Compra).

### Observações Importantes

- Sempre execute o **Script 00** primeiro, pois ele recria tabelas base como users, que são vitais pro sistema.
- Se já existirem dados, a primeira execução (Script 00) os apagará (pois contém DROP TABLE). Cuidado ao rodar num banco já em produção!
