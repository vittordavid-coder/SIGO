import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, HelpCircle, Edit2, Save, FileText, CheckCircle2, 
  ChevronRight, Play, Award, Layout, Briefcase, Percent, 
  FileSpreadsheet, Package, Calendar, BarChart3, Info, 
  Lock, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '../lib/utils';
import bannerImg from '../assets/images/budget_help_banner_1783521777612.jpg';
import { ContractSimulation } from './ContractSimulation';

interface HelpTab {
  id: string;
  label: string;
  title: string;
  description: string;
  steps: string[];
}

interface HelpSector {
  id: string;
  label: string;
  description: string;
  tabs: HelpTab[];
}

const DEFAULT_HELP_DATA: HelpSector[] = [
  {
    id: 'home',
    label: 'Início',
    description: 'A tela de Início apresenta o Dashboard executivo geral do sistema, centralizando indicadores operacionais e financeiros das obras, andamento físico-financeiro consolidado e atalhos de navegação rápida.',
    tabs: [
      {
        id: 'dashboard',
        label: 'Dashboard Geral',
        title: 'Acompanhamento de Indicadores do Dashboard',
        description: 'O painel unifica os indicadores mais vitais de saúde financeira e progresso físico das obras em andamento para rápida tomada de decisão da gerência.',
        steps: [
          'Visão de Indicadores Rápidos: Acompanhe os cards principais exibindo faturamento total acumulado, o valor total dos boletins de medição homologados e o saldo financeiro total de contratos ativos.',
          'Evolução da Curva S: Compare a evolução física planejada da obra (proveniente do cronograma) contra o percentual de avanço físico real medido em campo no período de referência.',
          'Alertas Críticos de Gestão: Receba avisos instantâneos de vencimento de contratos, níveis de estoque do almoxarifado abaixo do mínimo de segurança e pendências financeiras.',
          'Atalhos Rápidos: Utilize os botões interativos para acessar de forma rápida as principais funcionalidades de interesse de cada perfil de usuário.'
        ]
      }
    ]
  },
  {
    id: 'quotations',
    label: 'Cotações',
    description: 'Neste módulo você aprenderá a gerenciar o cadastro de insumos próprios ou SINAPI, a modelagem de custos unitários de engenharia (CPU), a elaboração da planilha orçamentária, a configuração do BDI, análise de Pareto com Curva ABC, planejamento físico-financeiro e geração de relatórios de orçamentos.',
    tabs: [
      {
        id: 'resources',
        label: 'Insumos',
        title: 'Gestão de Insumos (Materiais, Mão de Obra e Equipamentos)',
        description: 'O cadastro de insumos é o pilar inicial e a base de dados de todo o sistema de orçamento e planejamento. Aqui são armazenados e organizados todos os materiais, serviços terceirizados, mão de obra e frota de equipamentos necessários para a execução física das obras da empresa.',
        steps: [
          'Pesquisa e Navegação: Utilize a barra de busca no topo para pesquisar por código SINAPI/Próprio ou por termos na descrição do insumo. Filtre facilmente entre as categorias "Materiais", "Mão de Obra" e "Equipamentos" para agilizar sua análise.',
          'Novo Cadastro: Clique no botão "Novo Insumo". Defina obrigatoriamente um código identificador exclusivo (Ex: SINAPI-88248), uma descrição técnica padronizada, a unidade de medida padrão (Ex: kg, m³, h, un) e o preço unitário de mercado para a data base atual.',
          'Custos de Equipamentos (Módulo Operacional): Para insumos do tipo "Equipamento", o formulário permite cadastrar preços produtivos e improdutivos separadamente, permitindo maior precisão na apropriação linear da frota.',
          'Validação de Vínculos: Caso queira excluir um insumo, o sistema verificará se ele não está vinculado a nenhuma composição de serviço ativa. Isso evita a quebra de fórmulas e inconsistências financeiras nos orçamentos já finalizados.',
          'Atualização de Preço de Referência: Mantenha seus insumos atualizados importando planilhas oficiais (SINAPI, ORSE, SBC) ou editando-os diretamente por meio da interface se possuir perfil administrativo.'
        ]
      },
      {
        id: 'services',
        label: 'Serviços',
        title: 'Composições de Preço Unitário (CPU)',
        description: 'As Composições de Serviço (CPU) estruturam detalhadamente os custos para executar uma unidade de serviço de engenharia (Ex: Execução de 1 m³ de concreto estrutural fck=30MPa). Uma composição agrupa múltiplos insumos (materiais, mão de obra, ferramentas, etc.) calculando os custos diretos da operação.',
        steps: [
          'Novo Cadastro de CPU: Acesse a aba de Serviços e clique em "Novo Serviço". Preencha o código único da composição, descrição sumária do serviço, unidade de medida correspondente (Ex: m², m³, t) e o fator de produção planejado.',
          'Vinculação de Insumos: Abra o detalhamento da composição criada e clique em "Adicionar Insumo". Uma listagem interativa permitirá selecionar os insumos cadastrados anteriormente no banco.',
          'Definição de Coeficientes de Consumo (Índices): Insira o coeficiente de consumo ou produtividade do insumo (Ex: Para 1 h de pedreiro por m² de alvenaria, o coeficiente é 1.0). O custo individual é calculado multiplicando o preço base do insumo pelo seu coeficiente.',
          'Cálculo Automático de Custo Direto: O sistema soma dinamicamente o valor de todos os insumos vinculados e gera o Custo Unitário Direto (CUD) do serviço de engenharia de forma instantânea.',
          'Aplicação de Encargos Sociais: O sistema calcula e incorpora encargos sobre os custos de mão de obra cadastrados na composição de acordo com a região geográfica definida no projeto.'
        ]
      },
      {
        id: 'budget',
        label: 'Planilha',
        title: 'Elaboração da Planilha Orçamentária',
        description: 'A Planilha Orçamentária é a consolidação final de todos os serviços de engenharia e seus quantitativos físicos previstos no projeto. É dividida estruturalmente em etapas e subetapas para organizar e dar transparência de custos ao cliente final.',
        steps: [
          'Organização de Grupos / Etapas: Utilize o botão "Adicionar Grupo" para estruturar as macroetapas da obra (Ex: "1.0 - Serviços Preliminares", "2.0 - Infraestrutura", "3.0 - Supraestrutura").',
          'Importação de Serviços: Dentro de cada grupo, adicione os itens de serviço vinculando as Composições de Serviço (CPU) cadastradas no sistema.',
          'Lançamento de Quantitativos: Insira a quantidade exata de cada serviço conforme levantamento de projeto (Ex: Alvenaria: 350 m²). O sistema calculará o Custo Direto Total multiplicando a quantidade pela CPU.',
          'Preço de Venda com BDI: O sistema aplica automaticamente o percentual de BDI calculado na aba de BDI sobre o custo direto unitário de cada item, gerando o preço de venda e o valor total do orçamento.',
          'Reordenação Inteligente: Ajuste e mude a ordem de grupos ou itens arrastando-os de forma flexível utilizando a interface drag-and-drop para garantir que a planilha siga a lógica cronológica de execução física da obra.'
        ]
      },
      {
        id: 'bdi',
        label: 'BDI',
        title: 'Cálculo de BDI (Benefícios e Despesas Indiretas)',
        description: 'O BDI é a taxa percentual aplicada sobre o custo direto total da obra para cobrir as despesas que não estão diretamente ligadas a um serviço específico (como administração central, custos financeiros, seguros, tributos e margem de lucro operacional).',
        steps: [
          'Preenchimento de Parâmetros de Custos: Informe as alíquotas e taxas reais da sua empresa nas respectivas células: Administração Central (%), Seguro e Garantia (%), Riscos e Contingências (%), Despesas Financeiras (%) e Lucro Desejado (%).',
          'Configuração Tributária Completa: Configure os impostos aplicáveis sobre a receita bruta (Ex: PIS, COFINS, ISS, CPRB/Desoneração de Folha).',
          'Fórmula de Cálculo Oficial: O sistema calcula o BDI utilizando a fórmula oficial padronizada pelo Tribunal de Contas da União (TCU) para garantir conformidade jurídica e comercial nas suas propostas.',
          'Análise do Percentual Resultante: O percentual final de BDI gerado será exibido em destaque (Ex: BDI = 24.50%). Este valor é transmitido instantaneamente para a Planilha Orçamentária e relatórios.',
          'Simulação de Margem: Ajuste o valor de lucro operacional para verificar como o preço de venda total do orçamento reage à competitividade do mercado sem comprometer a saúde financeira da empresa.'
        ]
      },
      {
        id: 'quotations_tab',
        label: 'Cotações',
        title: 'Gerenciamento de Cotações de Fornecedores',
        description: 'O módulo de Cotações gerencia as consultas de preços feitas ao mercado para insumos e serviços, gerando mapas de comparação automáticos para selecionar o fornecedor mais vantajoso com base em preço, prazo e condições de fornecimento.',
        steps: [
          'Criação de Processo de Cotação: Clique em "Nova Cotação" e adicione os insumos ou serviços específicos que necessitam de cotação de mercado.',
          'Cadastro de Fornecedores Concorrentes: Adicione os fornecedores participantes que enviaram propostas comerciais para o processo.',
          'Lançamento de Propostas de Preços: Digite os valores unitários fornecidos por cada concorrente para cada item do mapa. O sistema fará a conversão automática para as unidades de medida padrão.',
          'Geração Automática do Mapa Comparativo: O sistema destaca visualmente em verde a melhor proposta de preço unitário e o menor preço total acumulado por fornecedor.',
          'Homologação e Fechamento: Finalize o mapa e exporte as informações consolidadas em PDF para aprovação da diretoria e posterior emissão do Pedido de Compra.'
        ]
      },
      {
        id: 'abc',
        label: 'Curva ABC',
        title: 'Análise de Curva ABC (Princípio de Pareto)',
        description: 'A Curva ABC classifica os insumos e serviços do orçamento em ordem decrescente de importância financeira. Ela divide os itens em três faixas principais: Classe A (itens de alta relevância que representam ~80% do custo), Classe B (relevância média ~15%) e Classe C (itens de baixa relevância ~5%).',
        steps: [
          'Geração Automática de Relevância: O sistema analisa todos os itens da planilha de orçamento ativa, multiplicando quantidade por preço, e ordena os itens do maior para o menor custo financeiro.',
          'Análise Percentual Acumulada: Visualize a coluna de percentual acumulado para entender instantaneamente onde o capital de giro da obra está mais concentrado.',
          'Estratégia de Negociação (Classe A): Priorize a negociação de preços e prazos com fornecedores para os itens listados na Classe A (geralmente aço, cimento, asfalto, brita), pois pequenos descontos nestes itens causam grande impacto positivo no custo total.',
          'Simplificação de Processos (Classe C): Para itens da Classe C, o sistema sugere manter um processo de compras mais ágil e automatizado, pois o esforço excessivo de negociação não gera impacto significativo no resultado geral da obra.',
          'Gráfico de Pareto Interativo: Acompanhe o gráfico de curva acumulada para ver graficamente a inclinação da curva e identificar os pontos de transição entre as faixas A, B e C.'
        ]
      },
      {
        id: 'schedule',
        label: 'Cronograma',
        title: 'Planejamento Físico-Financeiro & Gantt',
        description: 'O Cronograma Físico-Financeiro integra o planejamento de tempo com o de custos. Permite distribuir o percentual de execução física de cada serviço ao longo dos meses da obra, calculando automaticamente a projeção de desembolso financeiro periódico e acumulado.',
        steps: [
          'Definição de Prazos e Duração: Para cada serviço listado na planilha orçamentária, insira a data estimada de início e término ou a duração da atividade em dias.',
          'Distribuição Física Mensal: Insira a porcentagem prevista de execução física do serviço em cada mês do cronograma (Ex: Mês 1: 10%, Mês 2: 40%, Mês 3: 50%). O sistema valida automaticamente se a soma fecha em exatamente 100%.',
          'Cálculo de Desembolso Financeiro: O sistema calcula instantaneamente o valor monetário a ser faturado em cada período com base nos percentuais físicos informados.',
          'Visualização de Gráfico de Gantt: Acompanhe visualmente a linha do tempo das atividades e inter-relações entre frentes de serviço para otimizar a alocação de recursos e mão de obra.',
          'Curva S de Evolução Acumulada: Analise o gráfico da Curva S para monitorar o ritmo financeiro planejado da obra, o que ajuda na previsão de caixa e na medição física futura.'
        ]
      },
      {
        id: 'reports',
        label: 'Relatórios',
        title: 'Geração de Relatórios Gerenciais',
        description: 'O gerador de relatórios consolida as informações do setor de Cotações em documentos estruturados de nível executivo, ideais para aprovações internas, auditorias ou envio formal para clientes e parceiros.',
        steps: [
          'Seleção de Template: Escolha entre Relatório Sintético de Orçamento, Relatório Analítico de Composições de Serviço, Relatório de Curva ABC de Insumos ou Relatório de Cronograma Físico-Financeiro.',
          'Configurações de Cabeçalho: Personalize os dados de apresentação, incluindo o logotipo da empresa (lado esquerdo ou direito), dados da obra, cliente, engenheiro responsável e data base do orçamento.',
          'Visualização Prévia: Visualize as informações em tempo real exatamente como serão exportadas.',
          'Impressão e Salvamento em PDF: Use o botão de impressão para imprimir o relatório formatado ou salvar o arquivo em formato PDF diretamente por meio do navegador.',
          'Exportação de Dados: Para manipulações adicionais, exporte a tabela de dados em formato CSV ou planilha para que possa ser integrada a outros ERPs de forma limpa.'
        ]
      }
    ]
  },
  {
    id: 'measurements',
    label: 'Sala Técnica',
    description: 'A Sala Técnica gerencia todo o ciclo de engenharia de campo, controle de vigências de contratos, boletins de medição (BM), memorial descritivo e de cálculo de volume, avanço físico de metas, relatórios diários de obras (RDO), pluviometria técnica, planejamento de campo e distribuição de frentes operacionais.',
    tabs: [
      {
        id: 'contracts',
        label: 'Contratos',
        title: 'Gerenciamento de Contratos de Obras',
        description: 'Nesta aba você registra os contratos vigentes firmados com clientes, contendo escopo, valores e saldo financeiro contratual de referência.',
        steps: [
          'Novo Cadastro: Acesse a aba de Contratos e clique em "Novo Contrato". Insira o número do contrato, cliente, objeto, engenheiro responsável e datas de vigência.',
          'Vincular Orçamento: Associe o contrato à planilha orçamentária pré-aprovada para servir de tabela referencial de preços para futuras medições.',
          'Controle de Saldo: O sistema atualiza em tempo real o saldo contratual restante à medida que novos boletins de medição de campo são homologados e faturados.'
        ]
      },
      {
        id: 'measurements_sub',
        label: 'Medições',
        title: 'Elaboração de Boletins de Medição (BM)',
        description: 'Os boletins de medição acumulam o avanço físico real executado pelas equipes no canteiro para aprovação do cliente e emissão de notas fiscais.',
        steps: [
          'Criar Novo Período: Selecione o contrato ativo e abra um novo boletim de medição indicando o período de apropriação física.',
          'Lançar Quantidades: Preencha o volume executado no período de cada serviço contratado.',
          'Cálculo de Avanço e Saldo: O sistema calcula instantaneamente o percentual do serviço concluído, o valor faturado no período, o avanço acumulado e o saldo contratual remanescente.'
        ]
      },
      {
        id: 'measure',
        label: 'Medir',
        title: 'Assistente de Medição Ativa de Campo',
        description: 'Módulo de campo otimizado para apuração in-loco do andamento de obras e preenchimento direto de quantitativos técnicos.',
        steps: [
          'Selecione as frentes de serviço ativas para iniciar a apropriação.',
          'Lance os dados de avanço direto ou insira levantamentos topográficos.',
          'Sincronize os dados obtidos diretamente com a elaboração dos boletins de medição gerais.'
        ]
      },
      {
        id: 'controls',
        label: 'Memória de Cálculo',
        title: 'Memória de Cálculo e Cubações Técnicas',
        description: 'Módulo técnico para registrar fórmulas, cubações geométricas e detalhamentos de áreas que justificam os volumes apropriados na medição.',
        steps: [
          'Selecione o serviço e clique em "Nova Memória de Cálculo".',
          'Insira as dimensões físicas como comprimento, largura, altura e coeficientes da forma geométrica correspondente.',
          'Utilize a exportação para anexar a planilha de memória ao boletim de medição como comprovante para a fiscalização externa.'
        ]
      },
      {
        id: 'physical_progress',
        label: 'Avanço Físico',
        title: 'Análise Gráfica de Progresso Técnico',
        description: 'Painel visual para comparar a evolução das etapas físicas executadas contra as metas planejadas de engenharia.',
        steps: [
          'Visualize a árvore de etapas de obras e seus respectivos percentuais de conclusão em tempo real.',
          'Monitore indicadores visuais de progresso (verde para no prazo, vermelho para atrasado).',
          'Extraia gráficos executivos de avanço de metas para reuniões técnicas.'
        ]
      },
      {
        id: 'rdo',
        label: 'Diário de Obra (RDO)',
        title: 'Relatório Diário de Obra (RDO)',
        description: 'Documento legal de controle diário do canteiro, contendo dados climáticos, efetivo ativo, equipamentos em operação e relato descritivo.',
        steps: [
          'Abrir Diário: Selecione a data e preencha as condições climáticas e operabilidade nos períodos da manhã e tarde.',
          'Efetivo e Equipamentos: Declare o total de mão de obra direta de RH e a frota de equipamentos ativos no dia.',
          'Relato e Fotos: Insira o progresso descritivo das frentes, ocorrências importantes, visitas técnicas e registre o diário fotográfico.'
        ]
      },
      {
        id: 'pluviometria',
        label: 'Pluviometria',
        title: 'Controle de Pluviometria do Canteiro',
        description: 'Registro diário de índice pluviométrico (chuvas) em milímetros para controle e justificativa de paralisações operacionais.',
        steps: [
          'Registrar Chuva: Lance diariamente a quantidade de precipitação captada em milímetros (mm).',
          'Definir Impacto: Classifique o impacto operacional em "Trabalhável", "Parcialmente Improdutivo" ou "Improdutivo" para justificar atrasos.',
          'Gráficos Consolidados: Extraia relatórios periódicos de dias de chuva para pleitos contratuais de prorrogação de prazo.'
        ]
      },
      {
        id: 'schedule_sub',
        label: 'Cronograma',
        title: 'Cronograma Técnico de Metas Operacionais',
        description: 'Acompanhamento do andamento físico planejado das tarefas operacionais de curto prazo da engenharia.',
        steps: [
          'Verifique as tarefas agendadas para o canteiro.',
          'Distribua atribuições e datas de execução para cada equipe.',
          'Monitore o cumprimento das etapas operacionais internas do canteiro.'
        ]
      },
      {
        id: 'teams',
        label: 'Equipes',
        title: 'Distribuição Geográfica e Frentes de Serviço',
        description: 'Cadastro e coordenação das equipes e frentes de serviços de engenharia no canteiro.',
        steps: [
          'Cadastre as equipes indicando o encarregado líder e frentes de trabalho.',
          'Monitore o contingente alocado em cada frente física.',
          'Analise o rendimento e a produtividade por equipe.'
        ]
      },
      {
        id: 'reports_sub',
        label: 'Relatórios',
        title: 'Relatórios Técnicos e Consolidados',
        description: 'Geração e exportação de diários de obras e consolidados gerenciais para envio à diretoria e fiscalização.',
        steps: [
          'Selecione o período de interesse para consolidar os dados da Sala Técnica.',
          'Gere relatórios unificados contendo RDOs, medições, memórias de cálculo e fotos do canteiro.',
          'Exporte os dados consolidados em formato PDF para assinatura.'
        ]
      },
      {
        id: 'summary',
        label: 'Resumo por Grupo',
        title: 'Consolidação Executiva de Avanços por Etapas',
        description: 'Tabela agregada que agrupa medições físicas e faturamento acumulado por macroetapas de serviço.',
        steps: [
          'Acesse a tabela e verifique os valores totais medidos acumulados em cada subgrupo.',
          'Verifique o percentual global de avanço de cada grupo orçamentário.',
          'Utilize os resumos de grupo para análises rápidas de faturamento e frentes prioritárias.'
        ]
      }
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    description: 'Gestão de Recursos Humanos para obras. Permite a gestão completa de funcionários diretos e terceirizados, cálculo de fechamento de ponto mensal, geração de termos jurídicos, alojamentos de funcionários e parâmetros tributários.',
    tabs: [
      {
        id: 'employees',
        label: 'Colaboradores',
        title: 'Cadastro e Gestão de Colaboradores de Obras',
        description: 'O prontuário eletrônico unifica todas as informações cadastrais, de salários, exames e documentos dos funcionários do canteiro.',
        steps: [
          'Novo Funcionário: Clique em "Novo Colaborador". Preencha dados pessoais, CPF, RG, contatos, dados de endereço e bancários.',
          'Vincular Contrato e Equipe: Associe o colaborador a um contrato ativo e uma equipe operacional para apropriação de custos diretos.',
          'Acompanhamento Salarial: Visualize salários bases ou remunerações carregadas (aplicando percentual de encargos sociais padrão).'
        ]
      },
      {
        id: 'fechamento_jornada',
        label: 'Fechamento de Jornada',
        title: 'Apuração e Fechamento Mensal de Ponto',
        description: 'Lançamento de horas extras, faltas e controle de frequência mensal dos colaboradores para apuração de folha de pagamento.',
        steps: [
          'Selecione o mês de referência de cálculo para carregar a listagem de funcionários.',
          'Lance os dias efetivos trabalhados, quantidade de faltas injustificadas, dias de férias, atestados ou afastamentos.',
          'Insira as horas extras apuradas (50% e 100%) e adicional noturno correspondente ao ciclo de trabalho.'
        ]
      },
      {
        id: 'documents',
        label: 'Documentos',
        title: 'Geração Automática de Documentos e Termos de RH',
        description: 'Gerador integrado de termos de entrega de EPIs, acordos de compensação de banco de horas, holerites e declarações trabalhistas.',
        steps: [
          'Selecione o modelo do documento desejado no gerador.',
          'Selecione o colaborador de interesse para preenchimento de campos inteligentes de dados cadastrais.',
          'Faça o download do PDF formatado para coleta de assinatura física ou arquivamento técnico.'
        ]
      },
      {
        id: 'alojamentos',
        label: 'Alojamento',
        title: 'Gestão de Moradias e Vagas de Alojamento',
        description: 'Acompanhamento do controle de ocupação de habitações temporárias mantidas para as equipes deslocadas de suas cidades de origem.',
        steps: [
          'Cadastre as habitações ativas registrando capacidade máxima e custo de manutenção mensal.',
          'Aloque os colaboradores nos alojamentos cadastrados de forma organizada.',
          'Acompanhe o saldo de vagas livres e custos mensais por alojado.'
        ]
      },
      {
        id: 'parameters',
        label: 'Parâmetros',
        title: 'Parâmetros e Configuração de Custos Trabalhistas',
        description: 'Parametrização global de jornadas, alíquotas de encargos sociais (INSS, FGTS, provisões) e tolerâncias de horas extras do sistema.',
        steps: [
          'Defina as alíquotas oficiais de encargos e provisões que oneram o salário base na composição de custos.',
          'Configure as tolerâncias regulamentares para atrasos e multiplicadores padrão de horas adicionais.',
          'Determine o ciclo mensal de fechamento (Ex: Do dia 21 ao dia 20) para a rotina do canteiro.'
        ]
      }
    ]
  },
  {
    id: 'control',
    label: 'Controlador',
    description: 'Módulo operacional para controle cotidiano de canteiro. Gerencia alocações diárias de frentes de serviço, apropriação horária de equipamentos (produtivas e improdutivas), apropriação física de produção de serviços, tanques de abastecimento de combustíveis e fechamento de custos industriais.',
    tabs: [
      {
        id: 'teams',
        label: 'Equipes',
        title: 'Apropriação Diária de Mão de Obra por Equipes',
        description: 'Distribuição diária da força de trabalho direta nas frentes de execução física do canteiro.',
        steps: [
          'Selecione o encarregado e equipe técnica.',
          'Registre a presença física dos colaboradores e indique as atividades executadas no dia.',
          'Sincronize as informações para calcular o índice de apropriação direta de mão de obra.'
        ]
      },
      {
        id: 'equipments',
        label: 'Equipamentos',
        title: 'Apropriação Horária de Frota de Equipamentos',
        description: 'Controle operacional diário de horímetros de escavadeiras, caminhões e máquinas de pavimentação.',
        steps: [
          'Selecione o equipamento apropriado e registre o horímetro/odômetro inicial e final do dia.',
          'Classifique as horas trabalhadas entre produtivas (operando) e improdutivas (parado por quebra ou logística).',
          'Aproprie as horas na atividade de engenharia correspondente para apuração do custo real de frota.'
        ]
      },
      {
        id: 'production',
        label: 'Produção de Serviço',
        title: 'Apropriação de Produção Física de Serviços',
        description: 'Apropriação das quantidades físicas de serviços concluídas no dia nas respectivas frentes.',
        steps: [
          'Selecione o serviço de engenharia executado no dia de hoje.',
          'Insira a quantidade física real concluída (Ex: Pavimentação: 200 m²).',
          'Monitore a produtividade operacional instantânea comparada com o planejado.'
        ]
      },
      {
        id: 'fuel',
        label: 'Abastecimento',
        title: 'Controle de Combustível e Abastecimentos',
        description: 'Gestão física de estoque de diesel em tanques próprios e apropriação de consumo de combustíveis por equipamento.',
        steps: [
          'Registre entradas de cargas de combustíveis em tanques e postos de abastecimento locais.',
          'Lance os abastecimentos indicando equipamento, litros abastecidos, preço unitário e horímetro de medição.',
          'Analise o histórico de consumo médio horário (L/h) para auditoria e controle de frotas.'
        ]
      },
      {
        id: 'monthly_costs',
        label: 'Custos Mensais',
        title: 'Fechamento Operacional e Margem de Canteiro',
        description: 'Consolidação de custos apropriados (frota, diesel, mão de obra) contra a receita real medida.',
        steps: [
          'Acesse o fechamento de custos mensais operacionais.',
          'Analise a receita teórica gerada por frentes de serviço contra os custos diretos apropriados.',
          'Gere relatórios industriais para direcionamento estratégico das operações.'
        ]
      }
    ]
  },
  {
    id: 'purchases',
    label: 'Compras',
    description: 'Módulo de Compras e Suprimentos. Coordena o fluxo de requisições de materiais originados da obra, mapas de cotações, seleção de fornecedores vencedores e emissão de Ordens de Compra.',
    tabs: [
      {
        id: 'requests',
        label: 'Requisições',
        title: 'Requisições de Compra de Materiais (RC)',
        description: 'Fluxo para abertura e detalhamento de solicitações de materiais, peças de reposição e EPIs pela obra.',
        steps: [
          'Adicionar Requisição: Clique em "Nova Requisição de Compra". Insira a descrição técnica, quantidade e data limite.',
          'Verificação Orçamentária: Vincule os itens aos insumos previstos na planilha orçamentária do contrato correspondente.',
          'Liberação: Encaminhe a solicitação aprovada pela engenharia local para o setor de suprimentos da sede.'
        ]
      },
      {
        id: 'orders',
        label: 'Pedidos',
        title: 'Ordens de Compra Homologadas (OC)',
        description: 'Acompanhamento e emissão de pedidos formais de compra de materiais, registrando impostos e faturamento.',
        steps: [
          'Novo Pedido: Gere uma nova Ordem de Compra selecionando a requisição ou fornecedor vencedor.',
          'Condições Comerciais: Insira preços unitários, alíquotas de impostos (IPI, ICMS), frete, prazo e parcelamentos.',
          'Acompanhamento: Monitore as etapas de entrega (Pendente, Faturado, Recebido Parcial ou Concluído).'
        ]
      },
      {
        id: 'suppliers',
        label: 'Fornecedores',
        title: 'Cadastro e Homologação de Fornecedores',
        description: 'Cadastro geral de empresas parceiras, transportadoras, fabricantes e prestadores de serviços de engenharia.',
        steps: [
          'Novo Cadastro: Registre fornecedores preenchendo CNPJ, Razão Social, contatos e dados bancários para pagamento.',
          'Categorização Técnica: Classifique o fornecedor de acordo com a categoria de material (Aço, Madeira, Cimento, EPIs).',
          'Histórico Comercial: Visualize pedidos anteriores e consulte avaliações de pontualidade de entrega.'
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Controle de tesouraria de obras. Gerencia o fluxo de caixa integrado, contas a pagar de compras e insumos, contas a receber de medições de obras homologadas e aportes de capital de sócios.',
    tabs: [
      {
        id: 'payables',
        label: 'Contas a Pagar',
        title: 'Programação e Liquidação de Contas a Pagar',
        description: 'Gerenciamento de faturas de compras, folhas de RH, recolhimento de impostos e despesas indiretas do canteiro.',
        steps: [
          'Cadastrar Despesa: Insira contas a pagar especificando vencimento, fornecedor e forma de pagamento.',
          'Classificação de Custo: Vincule o pagamento a frentes de serviço e contratos para rastreabilidade financeira.',
          'Baixa Técnica: Efetue o registro de liquidação indicando a conta bancária de origem e anexe comprovantes bancários.'
        ]
      },
      {
        id: 'receivables',
        label: 'Contas a Receber',
        title: 'Faturamento de Medições e Contas a Receber',
        description: 'Controle de recebimentos de faturas geradas de boletins de medição aprovados pelos fiscais de contratos.',
        steps: [
          'Previsão de Receita: Registre os faturamentos de medição com as respectivas datas estimadas de liquidação.',
          'Acompanhamento de Cobrança: Monitore prazos de pagamento de órgãos públicos ou clientes privados para controle de fluxo.',
          'Liquidação de Caixa: Registre o recebimento do recurso para compensação no saldo operacional.'
        ]
      },
      {
        id: 'cash_flow',
        label: 'Fluxo de Caixa',
        title: 'Controle de Fluxo de Caixa Integrado',
        description: 'Painel gerencial que consolida faturamentos reais e previsões de gastos para projeção de saldos líquidos de caixa.',
        steps: [
          'Análise Periódica: Verifique o saldo consolidado do fluxo de caixa semanal, mensal ou trimestral.',
          'Déficits e Superávits: Analise os períodos de maior desembolso de capital para planejar captações ou adiantamentos.',
          'Ajustes de Projeção: Atualize previsões financeiras de longo prazo conforme andamento das obras.'
        ]
      },
      {
        id: 'aportes',
        label: 'Aportes',
        title: 'Aportes de Capital de Sócios',
        description: 'Registro de aportes financeiros de sócios ou investidores para custeio inicial de mobilização de canteiro.',
        steps: [
          'Lançar Aporte: Insira novos aportes de capital especificando valor, depositante e conta de destino.',
          'Distribuição de Recursos: Detalhe as contas de custos e frentes de aplicação dos recursos aportados.',
          'Prestação de Contas: Gere demonstrativos de aplicação de aportes para transparência societária.'
        ]
      }
    ]
  },
  {
    id: 'project_admin',
    label: 'Administrador da Obra',
    description: 'Gestão administrativa de apoio local. Permite a liberação técnica local de materiais comprados, conferência física de faturamento de entregas e caixa interno de pequenas despesas cotidianas.',
    tabs: [
      {
        id: 'releases',
        label: 'Liberação de Recursos',
        title: 'Liberação Física de Insumos da Obra',
        description: 'Liberação técnica local de recursos de compras autorizados para aplicação nas frentes operacionais.',
        steps: [
          'Conferência de Pedidos: Verifique as entregas agendadas de fornecedores.',
          'Aprovação Técnica: Valide as quantidades físicas e especificações técnicas dos materiais entregues.',
          'Liberação de Uso: Aprove a destinação dos insumos para as frentes ativas de campo.'
        ]
      },
      {
        id: 'local_expenses',
        label: 'Despesas Locais',
        title: 'Caixa de Pequenas Despesas Locais',
        description: 'Controle do caixa rotativo (fundo de caixinha) mantido na obra para despesas de pronto pagamento e urgências.',
        steps: [
          'Lançar Gasto: Registre despesas miúdas de canteiro preenchendo descrição, fornecedor, valor e anexo do recibo.',
          'Prestação de Contas: Feche o caixa periódico e solicite reposição de fundo junto ao setor financeiro central.',
          'Controle de Saldos: Acompanhe o saldo disponível de caixa rotativo local.'
        ]
      }
    ]
  },
  {
    id: 'almoxarife',
    label: 'Almoxarife',
    description: 'Módulo de Almoxarifado e Estoque. Gerencia saldos físicos de materiais, entradas de Notas Fiscais vinculadas a Ordens de Compra, saídas para aplicação nas frentes, transferências entre pátios de obras e inventário de ferramentas ativas.',
    tabs: [
      {
        id: 'stock',
        label: 'Estoque',
        title: 'Saldos de Estoque em Tempo Real',
        description: 'Visão unificada das quantidades físicas, custos médios e histórico de movimentações dos materiais estocados.',
        steps: [
          'Pesquisar Itens: Busque materiais por descrição técnica ou códigos específicos de almoxarifado.',
          'Conferência de Saldos: Verifique o estoque físico real disponível e os níveis mínimos de segurança de cada material.',
          'Ficha Kardex: Consulte o histórico cronológico de entradas, saídas e transferências de qualquer item estocado.'
        ]
      },
      {
        id: 'entries',
        label: 'Entradas',
        title: 'Entradas de Materiais por Nota Fiscal',
        description: 'Lançamento físico de notas fiscais de compras de fornecedores e conferência quantitativa de recebimento.',
        steps: [
          'Vincular Ordem de Compra: Crie uma nova entrada selecionando o pedido de compra correspondente.',
          'Conferência Física: Insira as quantidades entregues da Nota Fiscal do fornecedor atualizando saldos de estoque.',
          'Rastreador de Pendências: Registre avarias ou entregas menores que o faturado para abertura de pleitos com fornecedores.'
        ]
      },
      {
        id: 'applications',
        label: 'Saídas / Aplicação',
        title: 'Saídas de Materiais para Canteiro',
        description: 'Registro de requisições de retirada de materiais para consumo imediato de frentes operacionais.',
        steps: [
          'Nova Retirada: Lance a saída do material informando o encarregado ou funcionário requisitante.',
          'Apropriação de Custo: Indique a frente de serviço correspondente para debitar o custo do material aplicado.',
          'Conferência: Baixe o saldo físico do material do estoque central.'
        ]
      },
      {
        id: 'transfers',
        label: 'Transferências',
        title: 'Transferências de Insumos entre Obras',
        description: 'Remessa planejada de materiais excedentes de estoque ou equipamentos de apoio entre canteiros.',
        steps: [
          'Abertura de Guia: Registre a guia de transferência especificando o almoxarifado remetente e destinatário.',
          'Lançamento de Itens: Adicione os materiais que serão transferidos atualizando o status para "Em Trânsito".',
          'Recebimento: Confirme o recebimento técnico no almoxarifado destinatário para compensar o saldo de estoque.'
        ]
      },
      {
        id: 'assets',
        label: 'Ativos / Patrimônio',
        title: 'Controle de Ferramental e Ativos Patrimoniais',
        description: 'Cautelas eletrônicas de ferramentas de mão, furadeiras, rompedores e patrimônios duráveis da empresa.',
        steps: [
          'Cadastrar Ativo: Registre as ferramentas com códigos de identificação interna e números de série.',
          'Empréstimo (Cautela): Atribua cautelas de ferramentas para operários de obras sob termo de responsabilidade.',
          'Retorno e Danos: Registre a devolução física de ferramentas e indique extravios ou necessidades de manutenção técnica.'
        ]
      }
    ]
  },
  {
    id: 'gerencia',
    label: 'Gerência',
    description: 'Acompanhamento estratégico para gestores e diretores de engenharia. Apresenta relatórios executivos de margem operacional de contratos, logs auditados de segurança e relatórios consolidados de faturamento.',
    tabs: [
      {
        id: 'exec_reports',
        label: 'Relatórios Executivos',
        title: 'Relatórios Executivos de Desempenho de Obras',
        description: 'Painéis consolidados e planilhas de margem financeira de contratos para diretores e sócios da empresa.',
        steps: [
          'Visualização de Receita x Despesa: Compare a receita medida da Sala Técnica contra as despesas apropriadas do Controlador.',
          'Margem Bruta por Contrato: Acompanhe a margem de contribuição líquida operacional de cada obra ativa.',
          'Gráficos de Resultados: Analise relatórios financeiros unificados para reuniões societárias.'
        ]
      },
      {
        id: 'audit',
        label: 'Auditoria',
        title: 'Logs de Auditoria e Segurança de Dados',
        description: 'Registro histórico cronológico de todas as modificações críticas, alterações de orçamentos e transações efetuadas.',
        steps: [
          'Listagem de Logs: Verifique a lista cronológica de ações realizadas por usuários autenticados no sistema.',
          'Filtros Avançados: Filtre por data, usuário autor, módulo alterado ou tipo de ação realizada.',
          'Conformidade Técnica: Acompanhe a auditoria de alterações financeiras sensíveis e cadastros corporativos.'
        ]
      }
    ]
  },
  {
    id: 'settings',
    label: 'Administrador do Sistema',
    description: 'Módulo de retaguarda técnica e parametrização. Gerencia dados cadastrais da empresa, upload de logotipos corporativos, controle de credenciais e permissões de usuários e monitoramento de conexão Supabase.',
    tabs: [
      {
        id: 'general_settings',
        label: 'Configurações Gerais',
        title: 'Identidade Visual e Dados Cadastrais',
        description: 'Cadastro dos dados cadastrais gerais da empresa para cabeçalhos e upload de marcas/logotipos.',
        steps: [
          'Dados Corporativos: Insira a Razão Social, CNPJ, Inscrição Estadual e contatos de referência do escritório central.',
          'Upload de Logos: Carregue os logotipos em alta definição (lado esquerdo e direito) para incorporação automática em propostas comerciais.',
          'Aparência Visual: Parametrizar temas visuais padrão para os painéis.'
        ]
      },
      {
        id: 'user_management',
        label: 'Usuários',
        title: 'Gestão de Usuários e Níveis de Permissões',
        description: 'Criação de novos logins e definição detalhada de papéis e visibilidade de contratos e módulos.',
        steps: [
          'Novo Usuário: Clique em "Novo Usuário" e registre nome, e-mail de acesso e credenciais iniciais.',
          'Regras de Papel (Role): Classifique o acesso em "Master" (acesso irrestrito), "Administrador Geral" ou "Operador Restrito".',
          'Permissões Customizadas: Determine exatamente quais módulos específicos e contratos ativos o usuário terá visibilidade no sistema.'
        ]
      },
      {
        id: 'database',
        label: 'Banco de Dados',
        title: 'Monitoramento do Banco de Dados Supabase',
        description: 'Painel técnico de verificação do status de conexão em tempo real com as tabelas Supabase e rotinas de backup.',
        steps: [
          'Status do Barramento: Verifique a integridade de sincronização técnica em tempo real com os bancos de dados Supabase.',
          'Rotina de Backup: Execute rotinas de backup manual forçado e verifique o tamanho do armazenamento de dados da empresa.',
          'Logs de Sincronização: Acompanhe mensagens de erros de persistência offline para reestabelecer o canal de comunicação.'
        ]
      }
    ]
  }
];

interface HelpViewProps {
  currentUser: {
    role: string;
    name: string;
  };
}

export function HelpView({ currentUser }: HelpViewProps) {
  const isMaster = currentUser?.role === 'master';
  
  // Load data from localStorage or fallback to default
  const [sectors, setSectors] = useState<HelpSector[]>(() => {
    const saved = localStorage.getItem('synera_help_records_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing help records from localStorage, resetting to default', e);
      }
    }
    return DEFAULT_HELP_DATA;
  });

  const [activeSectorId, setActiveSectorId] = useState<string>('quotations');
  const [activeTabId, setActiveTabId] = useState<string>('resources');
  
  // Editing state
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [editedSteps, setEditedSteps] = useState<string>('');
  const [showSaveAlert, setShowSaveAlert] = useState<boolean>(false);

  const activeSector = sectors.find(s => s.id === activeSectorId) || sectors[0];
  const activeTab = activeSector.tabs.find(t => t.id === activeTabId) || activeSector.tabs[0] || { id: '', label: '', title: '', description: '', steps: [] };

  // Sync active sub-tab when sector changes
  useEffect(() => {
    const currentSector = sectors.find(s => s.id === activeSectorId);
    if (currentSector && currentSector.tabs.length > 0) {
      // Find matching or default first tab
      const hasMatchingTab = currentSector.tabs.some(t => t.id === activeTabId);
      if (!hasMatchingTab) {
        setActiveTabId(currentSector.tabs[0].id);
      }
    }
  }, [activeSectorId, sectors]);

  // Load editor content when tab changes or editMode is toggled
  useEffect(() => {
    if (activeTab) {
      setEditedTitle(activeTab.title || '');
      setEditedDescription(activeTab.description || '');
      setEditedSteps(activeTab.steps ? activeTab.steps.join('\n') : '');
    }
  }, [activeTabId, activeSectorId, editMode]);

  const handleSaveHelp = () => {
    const updatedSectors = sectors.map(sec => {
      if (sec.id === activeSectorId) {
        return {
          ...sec,
          tabs: sec.tabs.map(tab => {
            if (tab.id === activeTabId) {
              return {
                ...tab,
                title: editedTitle,
                description: editedDescription,
                steps: editedSteps.split('\n').filter(line => line.trim() !== '')
              };
            }
            return tab;
          })
        };
      }
      return sec;
    });

    setSectors(updatedSectors);
    localStorage.setItem('synera_help_records_v2', JSON.stringify(updatedSectors));
    setEditMode(false);
    setShowSaveAlert(true);
    setTimeout(() => setShowSaveAlert(false), 4000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Tem certeza que deseja redefinir todas as ajudas para o conteúdo padrão do sistema?')) {
      setSectors(DEFAULT_HELP_DATA);
      localStorage.setItem('synera_help_records_v2', JSON.stringify(DEFAULT_HELP_DATA));
      setEditMode(false);
      alert('Conteúdo de ajuda redefinido para o padrão com sucesso!');
    }
  };

  return (
    <div id="help_view_container" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 text-white min-h-[220px] flex flex-col md:flex-row items-center justify-between p-8 md:p-12 shadow-xl gap-6">
        <div className="z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Central de Ajuda & Conhecimento
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Como utilizar o sistema Synera</h1>
          <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed">
            Encontre guias passo a passo, boas práticas e explicações completas sobre as atividades técnicas, orçamentos, medições de obras e controle operacional do sistema.
          </p>
        </div>
        
        {/* Banner image illustration */}
        <div className="relative shrink-0 w-full md:w-[320px] lg:w-[400px] h-[160px] md:h-[200px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-800 flex items-center justify-center">
          <img 
            src={bannerImg} 
            alt="Ilustração Cotações Synera" 
            className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sectors Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-500" />
                Setores do Sistema
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selecione uma área técnica</CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => {
                    setActiveSectorId(sector.id);
                    setEditMode(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-xl transition-all font-medium text-left text-sm group",
                    activeSectorId === sector.id
                      ? "bg-blue-50/80 text-blue-700 font-bold shadow-inner"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      activeSectorId === sector.id ? "bg-blue-600" : "bg-slate-300"
                    )} />
                    <span className="truncate">{sector.label}</span>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 transition-transform",
                    activeSectorId === sector.id ? "text-blue-500 translate-x-1" : "text-slate-300 group-hover:text-slate-500"
                  )} />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Master Admin Panel Controls */}
          {isMaster && (
            <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Controle Master Admin</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Você tem permissão master para editar ou personalizar todas as descrições de ajuda e passo a passos do sistema.
              </p>
              <div className="pt-1 flex flex-col gap-2">
                <Button 
                  onClick={() => setEditMode(!editMode)} 
                  variant={editMode ? "destructive" : "outline"} 
                  size="sm"
                  className="w-full text-xs font-bold h-9 rounded-xl"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-2" />
                  {editMode ? 'Cancelar Edição' : 'Editar esta Aba'}
                </Button>
                <Button 
                  onClick={handleResetToDefault} 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold h-9 rounded-xl"
                >
                  Restaurar Padrão
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Help Content Tabs & Steps */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
            {/* Sector Summary */}
            <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-100 space-y-2">
              <div className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                {activeSector.label}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">{activeSector.label}</h2>
              <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-4xl">
                {activeSector.description}
              </p>
            </div>

            <CardContent className="p-6 md:p-8">
              {/* Tabs List */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex gap-2 border-b border-slate-100 pb-2">
                  {activeSector.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setEditMode(false);
                      }}
                      className={cn(
                        "px-4 py-2 text-sm font-bold border-b-2 transition-all shrink-0",
                        activeTabId === tab.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Mode Panel */}
              <AnimatePresence mode="wait">
                {editMode ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Edit2 className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">Editor de Ajuda (Aba: {activeTab?.label})</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">Título do Guia</label>
                      <Input 
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="bg-white rounded-xl border-slate-200"
                        placeholder="Título do guia de atividades"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">Descrição Principal</label>
                      <Textarea 
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="bg-white rounded-xl border-slate-200 min-h-[100px] leading-relaxed"
                        placeholder="Insira uma descrição explicativa abrangente e detalhada..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-500 uppercase">Passo a Passo de Atividades (Um por linha)</label>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-400">Pressione Enter para novas linhas</Badge>
                      </div>
                      <Textarea 
                        value={editedSteps}
                        onChange={(e) => setEditedSteps(e.target.value)}
                        className="bg-white rounded-xl border-slate-200 min-h-[180px] leading-relaxed"
                        placeholder="Passo 1: Fazer tal ação...&#10;Passo 2: Salvar e sincronizar...&#10;Passo 3: Visualizar resultado..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} className="rounded-xl font-bold">
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveHelp} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                        <Save className="w-4 h-4 mr-1.5" />
                        Salvar Conteúdo
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={activeTabId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Visual Tab Content */}
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{activeTab?.title || 'Sem Título'}</h3>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs font-bold w-fit rounded-full px-3 py-1">
                          Guia de Utilização
                        </Badge>
                      </div>

                      <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
                        {activeTab?.description || 'Nenhuma descrição cadastrada para esta aba.'}
                      </p>

                      {/* Animated Demonstration for Key System Operations */}
                      {((activeSectorId === 'measurements' && activeTabId === 'contracts') ||
                        (activeSectorId === 'quotations' && activeTabId === 'resources') ||
                        (activeSectorId === 'rh' && activeTabId === 'employees') ||
                        (activeSectorId === 'purchases' && activeTabId === 'requests') ||
                        (activeSectorId === 'financeiro' && activeTabId === 'payables')) && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            {activeSectorId === 'measurements' && activeTabId === 'contracts' && 'Demonstração Animada: Cadastrando um Novo Contrato'}
                            {activeSectorId === 'quotations' && activeTabId === 'resources' && 'Demonstração Animada: Cadastrando um Novo Insumo'}
                            {activeSectorId === 'rh' && activeTabId === 'employees' && 'Demonstração Animada: Ficha de Admissão Digital (RH)'}
                            {activeSectorId === 'purchases' && activeTabId === 'requests' && 'Demonstração Animada: Criando Solicitação de Compra (RC)'}
                            {activeSectorId === 'financeiro' && activeTabId === 'payables' && 'Demonstração Animada: Lançando Item no Contas a Pagar'}
                          </h4>
                          <ContractSimulation sectorId={activeSectorId} tabId={activeTabId} />
                        </div>
                      )}
                    </div>

                    {/* Step-by-Step Activities */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                        Passo a Passo e Atividades Principais
                      </h4>

                      {activeTab?.steps && activeTab.steps.length > 0 ? (
                        <div className="space-y-3">
                          {activeTab.steps.map((step, idx) => {
                            // Find the first colon to split "Passo 1: Description" elegantly
                            const colonIndex = step.indexOf(':');
                            const hasLabel = colonIndex > 0 && colonIndex < 35;
                            const label = hasLabel ? step.substring(0, colonIndex + 1) : '';
                            const desc = hasLabel ? step.substring(colonIndex + 1) : step;

                            return (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={idx} 
                                className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs shrink-0 mt-0.5 shadow-sm">
                                  {idx + 1}
                                </div>
                                <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium">
                                  {hasLabel ? (
                                    <>
                                      <strong className="text-slate-900 font-black mr-1">{label}</strong>
                                      {desc}
                                    </>
                                  ) : (
                                    step
                                  )}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 gap-2">
                          <AlertTriangle className="w-8 h-8 text-amber-500" />
                          <p className="text-sm font-bold">Nenhum passo cadastrado para esta aba.</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Tips */}
                    <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 mt-6">
                      <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-black uppercase text-emerald-900 tracking-wider">Dica Prática de Engenharia</h5>
                        <p className="text-emerald-700 text-sm font-medium mt-1 leading-relaxed">
                          Sempre verifique a base de dados de preços (SINAPI ou própria) antes de iniciar as composições na aba de Serviços. Um cadastro limpo de Insumos garante orçamentos 100% livres de erros e retrabalhos.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Save Confirmation Toast */}
      <AnimatePresence>
        {showSaveAlert && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl border border-emerald-500 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <div>
              <p className="text-sm font-black">Alterações salvas com sucesso!</p>
              <p className="text-xs text-emerald-100 font-medium">O conteúdo de ajuda foi atualizado e persistido.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
