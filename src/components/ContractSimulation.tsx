import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Play, Pause, RotateCcw, Check, MousePointer, 
  User, Calendar, FileText, Briefcase, DollarSign, Users,
  AlertCircle, ShoppingCart, ArrowLeft, ShieldAlert,
  CreditCard, Smartphone, Heart, Landmark, HardHat,
  Receipt, Building2, UserPlus, FileEdit, HelpCircle,
  Printer, Download, BarChart3, PieChart, Layers,
  Calculator, Clock, TrendingUp, FolderPlus, Table, FileSpreadsheet
} from 'lucide-react';

interface ContractSimulationProps {
  steps?: string[];
  title?: string;
  sectorId?: string;
  tabId?: string;
}

export function ContractSimulation({ sectorId = 'measurements', tabId = 'contracts', steps = [], title = '' }: ContractSimulationProps) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // States for typed inputs in different simulations
  const [typedInputs, setTypedInputs] = useState<Record<string, string>>({});

  // Determine active simulation
  let activeSim = 'generic';
  if (sectorId === 'quotations' && tabId === 'quotations_tab') activeSim = 'none'; // Excluded as requested
  else if (sectorId === 'quotations' && tabId === 'services') activeSim = 'services';
  else if (sectorId === 'quotations' && tabId === 'budget') activeSim = 'budget';
  else if (sectorId === 'quotations' && tabId === 'bdi') activeSim = 'bdi';
  else if (sectorId === 'quotations' && tabId === 'abc') activeSim = 'abc';
  else if ((sectorId === 'quotations' || sectorId === 'measurements') && (tabId === 'schedule' || tabId === 'schedule_sub')) activeSim = 'schedule';
  else if ((sectorId === 'quotations' || sectorId === 'measurements') && (tabId === 'reports' || tabId === 'reports_sub')) activeSim = 'reports';
  else if (sectorId === 'measurements' && tabId === 'contracts') activeSim = 'contracts';
  else if (sectorId === 'quotations' && tabId === 'resources') activeSim = 'resources';
  else if (sectorId === 'rh' && tabId === 'employees') activeSim = 'employees';
  else if (sectorId === 'purchases' && tabId === 'requests') activeSim = 'requests';
  else if (sectorId === 'financeiro' && tabId === 'payables') activeSim = 'payables';
  else if (sectorId === 'measurements' && tabId === 'pluviometria') activeSim = 'pluviometria';
  else if (sectorId === 'measurements' && tabId === 'rdo') activeSim = 'rdo';

  // Define steps configurations
  const simulationsConfig: Record<string, {
    totalSteps: number;
    delays: Record<number, number>;
    labels: string[];
    browserUrl: string;
    pageTitle: string;
  }> = {
    rdo: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 1500, 2: 2500, 3: 2000, 4: 2500, 5: 1800, 6: 4000 },
      labels: [
        'Acessar e clicar em "Novo RDO"',
        'Abertura do Diário de Obra',
        'Preenchimento de Condições Climáticas',
        'Declaração de Efetivo e Equipamentos',
        'Registro do Relato Diário',
        'Finalizar e Assinar RDO',
        'RDO emitido com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/sala-tecnica/rdo',
      pageTitle: 'Sala Técnica • Diário de Obra'
    },
    pluviometria: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 1500, 2: 1800, 3: 1500, 4: 1500, 5: 1800, 6: 4000 },
      labels: [
        'Acessar aba "Pluviometria"',
        'Selecionar Data (Dia 15)',
        'Preencher Volume de Chuvas (mm)',
        'Classificar Impacto ("Trabalhável")',
        'Salvar Registro',
        'Registro concluído no calendário',
        'Controle salvo com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/sala-tecnica/pluviometria',
      pageTitle: 'Sala Técnica • Pluviometria'
    },
    generic: {
      totalSteps: Math.max(2, steps.length + 2),
      delays: { 0: 2500, [Math.max(2, steps.length + 2) - 1]: 4000 },
      labels: [
        `Acessar o módulo de ${title || 'Operações'}`,
        ...(steps.length > 0 ? steps.map(s => {
          const colonIndex = s.indexOf(':');
          return colonIndex > 0 && colonIndex < 35 ? s.substring(0, colonIndex) : s.substring(0, 45) + '...';
        }) : ['Iniciando processo principal...']),
        'Processo concluído com sucesso!'
      ],
      browserUrl: `https://sistema.synera.com/${sectorId}/${tabId}`,
      pageTitle: title || 'Módulo do Sistema'
    },
    contracts: {
      totalSteps: 8,
      delays: { 0: 2500, 1: 1500, 2: 2000, 3: 2200, 4: 2200, 5: 1800, 6: 1500, 7: 4000 },
      labels: [
        'Acessar e clicar em "+ Novo Contrato"',
        'Abertura do formulário de cadastro',
        'Preenchimento do Número do Contrato',
        'Definição do Nome da Obra e Objeto',
        'Preenchimento de Cliente e Razão Social',
        'Vinculação da Planilha Orçamentária de referência',
        'Homologação e salvamento do Contrato',
        'Contrato ativo cadastrado com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/sala-tecnica/contratos',
      pageTitle: 'Sala Técnica • Contratos'
    },
    resources: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1400, 2: 1800, 3: 2000, 4: 1600, 5: 1500, 6: 4000 },
      labels: [
        'Acessar e clicar em "+ Novo Insumo"',
        'Abertura do formulário de insumo',
        'Seleção do Tipo do Insumo (Material)',
        'Preenchimento da Descrição e Unidade',
        'Lançamento do Preço Unitário de Mercado',
        'Clique para Salvar o Insumo no Banco',
        'Insumo homologado com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/insumos',
      pageTitle: 'Cotações • Banco de Insumos'
    },
    employees: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 1500, 2: 2200, 3: 2200, 4: 1800, 5: 1500, 6: 4000 },
      labels: [
        'Acessar e clicar em "+ Novo Colaborador"',
        'Abertura da Ficha de Admissão Digital',
        'Digitação do Nome Completo e CPF oficial',
        'Atribuição de Matrícula e Data de Nascimento',
        'Aceite do Termo LGPD de Segurança de Dados',
        'Salvamento da Admissão com criptografia ativa',
        'Colaborador registrado ativamente no RH!'
      ],
      browserUrl: 'https://sistema.synera.com/rh/colaboradores',
      pageTitle: 'Recursos Humanos • Colaboradores'
    },
    requests: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1600, 2: 2200, 3: 2000, 4: 1800, 5: 1500, 6: 4000 },
      labels: [
        'Clicar em "Nova Solicitação de Compra"',
        'Abertura do painel geral de requisição',
        'Digitação do Setor e Descrição Geral do pedido',
        'Vinculação à Obra/Contrato de referência',
        'Seleção de Categoria e Prioridade de compra',
        'Clique para Confirmar e Enviar para suprimentos',
        'Solicitação pendente registrada com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/compras/requisicoes',
      pageTitle: 'Suprimentos • Solicitações de Compra'
    },
    payables: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1500, 2: 1800, 3: 2200, 4: 2000, 5: 1500, 6: 4000 },
      labels: [
        'Acessar Aportes e clicar em "+ Novo Item"',
        'Abertura do formulário de lançamento',
        'Definição de Categoria e Subcategoria de Custo',
        'Indicação do Fornecedor e Descrição Técnica',
        'Inserção do Vencimento e Valor do Título',
        'Clique para Lançar a despesa na carteira',
        'Aporte de despesa lançado no Fluxo com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/financeiro/aportes',
      pageTitle: 'Finanças • Gestão de Aportes'
    },
    quotations_tab: {
      totalSteps: 6,
      delays: { 0: 2500, 1: 1800, 2: 2500, 3: 2000, 4: 1500, 5: 4000 },
      labels: [
        'Acessar e clicar em "+ Nova Cotação"',
        'Adicionar Fornecedores Concorrentes',
        'Lançamento de Propostas de Preços',
        'Geração Automática do Mapa Comparativo',
        'Homologação e Fechamento da Cotação',
        'Cotação exportada com sucesso!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/mapas',
      pageTitle: 'Cotações • Mapas Comparativos'
    },
    services: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1800, 2: 2000, 3: 2000, 4: 2000, 5: 2200, 6: 4000 },
      labels: [
        'Acessar e clicar em "+ Novo Serviço / Composição"',
        'Preenchimento de Código (CPU-004), Descrição e Unidade (m³)',
        'Inclusão do Insumo "Pedreiro" (Coef: 0.50 h)',
        'Inclusão do Insumo "Servente" (Coef: 1.00 h)',
        'Inclusão do Material "Concreto Usinado fck=30MPa" (Coef: 1.05 m³)',
        'Cálculo Automático do Custo Direto (CUD: R$ 485,50/m³)',
        'Composição homologada e salva no banco de dados!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/servicos',
      pageTitle: 'Cotações • Composições de Preços (CPU)'
    },
    budget: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1800, 2: 2000, 3: 2000, 4: 2000, 5: 2200, 6: 4000 },
      labels: [
        'Clicar no botão "+ Adicionar Grupo de Serviços"',
        'Inserção do Nome do Grupo ("1.0 SERVIÇOS PRELIMINARES")',
        'Clicar em "+ Inserir Serviço" dentro do Grupo',
        'Seleção da Composição CPU-001 (Placa da Obra)',
        'Preenchimento da Quantidade Orçada (12.00 m²)',
        'Cálculo do Valor Total com BDI (R$ 2.689,20)',
        'Serviço e Grupos estruturados na Planilha Orçamentária!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/planilha',
      pageTitle: 'Orçamento • Planilha Orçamentária'
    },
    bdi: {
      totalSteps: 7,
      delays: { 0: 2400, 1: 1800, 2: 1800, 3: 1800, 4: 1800, 5: 2200, 6: 4000 },
      labels: [
        'Acessar Tela de Parâmetros de BDI da Obra',
        'Lançamento da Administração Central (4.50%)',
        'Lançamento de Seguros (0.80%) e Riscos (1.25%)',
        'Lançamento de Despesas Financeiras (1.00%) e Lucro (7.40%)',
        'Configuração das Alíquotas de Tributos (PIS, COFINS, ISS = 8.65%)',
        'Cálculo Automático pela Fórmula Oficial do TCU',
        'BDI de 24.50% aplicado a todos os itens orçados!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/bdi',
      pageTitle: 'Orçamento • Benefícios e Despesas Indiretas (BDI)'
    },
    abc: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 2200, 2: 2200, 3: 2200, 4: 2500, 5: 2500, 6: 4000 },
      labels: [
        'Visão Geral da Curva ABC por Relevância Financeira',
        'Campo "Posição / Rank": Ordenação do maior para o menor custo',
        'Campos "Valor Total" e "% Individual": Custo e peso no orçamento',
        'Campo "% Acumulado": Soma contínua das porcentagens',
        'Faixa "Classe A" (~80% do valor): Insumos de alta prioridade',
        'Faixas "Classe B" (~15%) e "Classe C" (~5%): Média e baixa relevância',
        'Análise de Pareto concluída para negociação com fornecedores!'
      ],
      browserUrl: 'https://sistema.synera.com/cotacoes/curva-abc',
      pageTitle: 'Orçamento • Curva ABC / Análise de Pareto'
    },
    schedule: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 2000, 2: 2000, 3: 2000, 4: 2200, 5: 2500, 6: 4000 },
      labels: [
        'Visão Geral do Cronograma Físico-Financeiro',
        'Ferramenta "Duração": Definir quantidade de dias da atividade',
        'Lançamento de Avanço do Mês 1 (60% da execução)',
        'Lançamento de Avanço do Mês 2 (40% da execução)',
        'Ferramenta "Sincronizar": Validação de fechamento acumulado em 100%',
        'Ferramenta "Curva S": Projeção do desembolso financeiro acumulado',
        'Cronograma e curva financeira configurados!'
      ],
      browserUrl: 'https://sistema.synera.com/sala-tecnica/cronograma',
      pageTitle: 'Sala Técnica • Cronograma Físico-Financeiro'
    },
    reports: {
      totalSteps: 7,
      delays: { 0: 2500, 1: 2000, 2: 2200, 3: 2200, 4: 2200, 5: 2200, 6: 4000 },
      labels: [
        'Acessar Central de Emissão de Relatórios',
        'Visualização Prévia do Relatório Formatado da Obra',
        'Ferramenta "🖨️ Imprimir": Disparo direto para impressora física',
        'Impressão acionada com cabeçalho corporativo',
        'Ferramenta "📄 Exportar PDF": Download do documento em PDF',
        'Ferramenta "📊 Exportar Excel": Download da planilha em .XLSX',
        'Relatórios gerados e prontos para distribuição!'
      ],
      browserUrl: 'https://sistema.synera.com/sala-tecnica/relatorios',
      pageTitle: 'Sala Técnica • Emissão e Exportação de Relatórios'
    }
  };

  const currentConfig = simulationsConfig[activeSim] || simulationsConfig.contracts;
  const TOTAL_STEPS = currentConfig.totalSteps;

  // Auto-player interval handler
  useEffect(() => {
    if (!isPlaying) return;

    const delay = currentConfig.delays[step] || 2000;
    const timer = setTimeout(() => {
      setStep((prev) => (prev + 1) % TOTAL_STEPS);
    }, delay);

    return () => clearTimeout(timer);
  }, [step, isPlaying, activeSim]);

  // Typing effect simulators based on steps
  useEffect(() => {
    // Clear typing states if we are at step 0 or 1
    if (step <= 1) {
      setTypedInputs({});
      return;
    }

    const typeText = (key: string, text: string, speed: number = 50) => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setTypedInputs(prev => ({ ...prev, [key]: text.slice(0, i + 1) }));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return interval;
    };

    let activeInterval: NodeJS.Timeout | null = null;

    if (activeSim === 'contracts') {
      if (step === 2) {
        activeInterval = typeText('number', 'CTR-2026/08', 80);
      } else if (step === 3) {
        setTypedInputs({ number: 'CTR-2026/08' });
        // Simulate typing for Work Name and Object
        let i = 0;
        const workName = 'Pavimentação Trecho Norte';
        const objectText = 'Pavimentação, Drenagem e Obras de Arte';
        activeInterval = setInterval(() => {
          if (i < Math.max(workName.length, objectText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              workName: workName.slice(0, i + 1),
              object: objectText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 50);
      } else if (step === 4) {
        setTypedInputs({
          number: 'CTR-2026/08',
          workName: 'Pavimentação Trecho Norte',
          object: 'Pavimentação, Drenagem e Obras de Arte'
        });
        let i = 0;
        const clientText = 'Consórcio Viário S/A';
        const contractorText = 'Synera Engenharia Ltda';
        activeInterval = setInterval(() => {
          if (i < Math.max(clientText.length, contractorText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              client: clientText.slice(0, i + 1),
              contractor: contractorText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 55);
      } else if (step >= 5) {
        setTypedInputs({
          number: 'CTR-2026/08',
          workName: 'Pavimentação Trecho Norte',
          object: 'Pavimentação, Drenagem e Obras de Arte',
          client: 'Consórcio Viário S/A',
          contractor: 'Synera Engenharia Ltda',
          measurementUnit: 'KM',
          measurementUnitValue: '25',
          initialStation: '0+000',
          finalStation: '25+000'
        });
      }
    } else if (activeSim === 'resources') {
      if (step === 2) {
        setTypedInputs({ type: 'material' });
      } else if (step === 3) {
        setTypedInputs({ type: 'material', code: 'INS-0482' });
        let i = 0;
        const nameText = 'Cimento Portland CP-II F-32';
        const unitText = 'Saco (50kg)';
        activeInterval = setInterval(() => {
          if (i < Math.max(nameText.length, unitText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              name: nameText.slice(0, i + 1),
              unit: unitText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 50);
      } else if (step >= 4) {
        setTypedInputs({
          type: 'material',
          code: 'INS-0482',
          name: 'Cimento Portland CP-II F-32',
          unit: 'Saco (50kg)',
          price: '42.50'
        });
      }
    } else if (activeSim === 'employees') {
      if (step === 2) {
        let i = 0;
        const nameText = 'Carlos Eduardo da Silva';
        const cpfText = '123.456.789-00';
        activeInterval = setInterval(() => {
          if (i < Math.max(nameText.length, cpfText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              name: nameText.slice(0, i + 1),
              cpf: cpfText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 50);
      } else if (step === 3) {
        setTypedInputs({ name: 'Carlos Eduardo da Silva', cpf: '123.456.789-00' });
        let i = 0;
        const regText = 'MAT-9812';
        const birthText = '1992-08-24';
        activeInterval = setInterval(() => {
          if (i < Math.max(regText.length, birthText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              registrationNumber: regText.slice(0, i + 1),
              birthDate: birthText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 60);
      } else if (step >= 4) {
        setTypedInputs({
          name: 'Carlos Eduardo da Silva',
          cpf: '123.456.789-00',
          registrationNumber: 'MAT-9812',
          birthDate: '1992-08-24',
          role: 'Pedreiro de Alvenaria',
          admissionDate: '2026-07-01',
          salary: '2800'
        });
      }
    } else if (activeSim === 'requests') {
      if (step === 2) {
        let i = 0;
        const descText = 'Tubos de Concreto Armado Classe PA-2 DN 800mm';
        const sectorText = 'Obras Industriais - Frente 02';
        activeInterval = setInterval(() => {
          if (i < Math.max(descText.length, sectorText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              description: descText.slice(0, i + 1),
              sector: sectorText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 40);
      } else if (step >= 3) {
        setTypedInputs({
          description: 'Tubos de Concreto Armado Classe PA-2 DN 800mm',
          sector: 'Obras Industriais - Frente 02',
          date: '2026-07-08',
          contract: 'CTR-2026/08',
          priority: 'Urgente',
          category: 'Material de Infraestrutura'
        });
      }
    } else if (activeSim === 'quotations_tab') {
      if (step === 2) {
        let i = 0;
        const p1Text = "35.50";
        const p2Text = "36.00";
        activeInterval = setInterval(() => {
          if (i < Math.max(p1Text.length, p2Text.length)) {
            setTypedInputs(prev => ({
              ...prev,
              p1: p1Text.slice(0, i + 1),
              p2: p2Text.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 50);
      } else if (step >= 3) {
        setTypedInputs({ p1: "35.50", p2: "36.00" });
      }
    } else if (activeSim === 'payables') {
      if (step === 2) {
        setTypedInputs({
          categoria: 'Insumos',
          subcategoria: 'Cimento CP-II'
        });
      } else if (step === 3) {
        setTypedInputs({
          categoria: 'Insumos',
          subcategoria: 'Cimento CP-II'
        });
        let i = 0;
        const fornText = 'Votorantim Cimentos S/A';
        const descText = 'Aquisição de cimento para concreto do viaduto';
        activeInterval = setInterval(() => {
          if (i < Math.max(fornText.length, descText.length)) {
            setTypedInputs(prev => ({
              ...prev,
              fornecedor: fornText.slice(0, i + 1),
              descricao: descText.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 50);
      } else if (step >= 4) {
        setTypedInputs({
          categoria: 'Insumos',
          subcategoria: 'Cimento CP-II',
          fornecedor: 'Votorantim Cimentos S/A',
          descricao: 'Aquisição de cimento para concreto do viaduto',
          dueDate: '2026-07-25',
          value: '6375.00'
        });
      }
    } else if (activeSim === 'pluviometria') {
      if (step === 2) {
        activeInterval = typeText('chuva', '35', 150);
      } else if (step === 3) {
        setTypedInputs({ chuva: '35', impacto: 'Trabalhável' });
      } else if (step >= 4) {
        setTypedInputs({ chuva: '35', impacto: 'Trabalhável' });
      }
    } else if (activeSim === 'rdo') {
      if (step === 2) {
        setTypedInputs({ climaM: 'Sol', climaT: 'Nublado' });
      } else if (step === 3) {
        setTypedInputs({ climaM: 'Sol', climaT: 'Nublado' });
        activeInterval = typeText('efetivo', '45', 100);
      } else if (step === 4) {
        setTypedInputs({ climaM: 'Sol', climaT: 'Nublado', efetivo: '45' });
        const textoRelato = 'Concretagem da laje nível 2. \nAvanço na alvenaria do bloco B.';
        let i = 0;
        activeInterval = setInterval(() => {
          if (i < textoRelato.length) {
            setTypedInputs(prev => ({
              ...prev,
              relato: textoRelato.slice(0, i + 1)
            }));
            i++;
          } else {
            clearInterval(activeInterval!);
          }
        }, 30);
      } else if (step >= 5) {
        setTypedInputs({
          climaM: 'Sol',
          climaT: 'Nublado',
          efetivo: '45',
          relato: 'Concretagem da laje nível 2. \nAvanço na alvenaria do bloco B.'
        });
      }
    } else if (activeSim === 'services') {
      if (step === 1) {
        activeInterval = typeText('desc', 'Concreto Usinado fck=30MPa com bomba', 40);
      } else if (step === 2) {
        setTypedInputs({ code: 'CPU-004', desc: 'Concreto Usinado fck=30MPa com bomba', unit: 'm³', ins1: 'Pedreiro (0.50 h)' });
      } else if (step === 3) {
        setTypedInputs({ code: 'CPU-004', desc: 'Concreto Usinado fck=30MPa com bomba', unit: 'm³', ins1: 'Pedreiro (0.50 h)', ins2: 'Servente (1.00 h)' });
      } else if (step >= 4) {
        setTypedInputs({ code: 'CPU-004', desc: 'Concreto Usinado fck=30MPa com bomba', unit: 'm³', ins1: 'Pedreiro (0.50 h)', ins2: 'Servente (1.00 h)', ins3: 'Concreto Usinado C30 (1.05 m³)', cud: '485.50' });
      }
    } else if (activeSim === 'budget') {
      if (step === 1) {
        activeInterval = typeText('group', '1.0 SERVIÇOS PRELIMINARES', 50);
      } else if (step >= 2) {
        setTypedInputs({ group: '1.0 SERVIÇOS PRELIMINARES', service: 'Placa de Obra Galvanizada', qty: '12.00', total: '2.689,20' });
      }
    } else if (activeSim === 'bdi') {
      if (step === 1) setTypedInputs({ adm: '4.50' });
      else if (step === 2) setTypedInputs({ adm: '4.50', seg: '0.80', risc: '1.25' });
      else if (step === 3) setTypedInputs({ adm: '4.50', seg: '0.80', risc: '1.25', df: '1.00', lucro: '7.40' });
      else if (step >= 4) setTypedInputs({ adm: '4.50', seg: '0.80', risc: '1.25', df: '1.00', lucro: '7.40', trib: '8.65', bdiTotal: '24.50' });
    } else if (activeSim === 'schedule') {
      if (step === 1) setTypedInputs({ dur: '30 dias' });
      else if (step === 2) setTypedInputs({ dur: '30 dias', m1: '60%' });
      else if (step >= 3) setTypedInputs({ dur: '30 dias', m1: '60%', m2: '40%' });
    }

    return () => {
      if (activeInterval) clearInterval(activeInterval);
    };
  }, [step, activeSim]);

  // Reset steps if we change props
  useEffect(() => {
    setStep(0);
    setIsPlaying(true);
  }, [sectorId, tabId]);

  if (activeSim === 'none') return null;

  return (
    <div className="w-full border border-slate-200 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans select-none text-slate-800">
      {/* Browser Bar Mock */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-mono text-slate-400 ml-4 hidden sm:inline">{currentConfig.browserUrl}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-700/80 px-2.5 py-0.5 rounded-md text-[9px] font-bold text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          DEMO DO SISTEMA
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative bg-slate-100 p-4 md:p-6 h-[400px] overflow-hidden">
        
        {/* ==================== 1. CONTRACTS SIMULATION ==================== */}
        {activeSim === 'contracts' && (
          <div className="w-full h-full flex flex-col justify-between">
            {/* Grid list showing contracts */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="text-left">
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Listagem de obras e vigências</p>
              </div>
              <div className="relative">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  Novo Contrato
                </button>
                {step === 0 && (
                  <motion.div 
                    initial={{ x: 120, y: 150 }}
                    animate={{ x: [120, 25], y: [150, 10] }}
                    transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                    className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                    style={{ left: '40px', top: '10px' }}
                  >
                    <MousePointer className="w-6 h-6 fill-current" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Contract list body */}
            <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
              <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                <span className="col-span-3">Nº do Contrato</span>
                <span className="col-span-4">Cliente / Nome da Obra</span>
                <span className="col-span-3">Período</span>
                <span className="col-span-2 text-right">Status</span>
              </div>

              {/* Existing Row */}
              <div className="grid grid-cols-12 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <span className="col-span-3 font-extrabold text-slate-700">CTR-2026/04</span>
                <div className="col-span-4 flex flex-col text-left">
                  <span className="font-extrabold text-slate-800 truncate">Prefeitura de Curitiba</span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Pavimentação Trecho Sul</span>
                </div>
                <span className="col-span-3 text-[10px] font-bold text-slate-500">01/04/26 - 31/12/26</span>
                <div className="col-span-2 text-right">
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-extrabold">Ativo</span>
                </div>
              </div>

              {/* Animated row added at Step 7 */}
              {step === 7 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="grid grid-cols-12 items-center bg-blue-50/50 border-2 border-blue-200 p-2.5 rounded-xl text-xs shadow-md"
                >
                  <span className="col-span-3 font-extrabold text-blue-700">CTR-2026/08</span>
                  <div className="col-span-4 flex flex-col text-left">
                    <span className="font-extrabold text-slate-800 truncate">Consórcio Viário S/A</span>
                    <span className="text-[9px] text-blue-600 font-semibold truncate">Pavimentação Trecho Norte</span>
                  </div>
                  <span className="col-span-3 text-[10px] font-bold text-slate-500">01/08/26 - 31/07/27</span>
                  <div className="col-span-2 text-right">
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-extrabold">Ativo</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Success toast overlay */}
            {step === 7 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 right-6 left-6 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-emerald-500 z-30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white stroke-[3px]" />
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-bold">Contrato salvo!</p>
                    <p className="opacity-90">Código CTR-2026/08 vinculado com sucesso.</p>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-700 px-2 py-0.5 rounded font-black">SUCESSO</span>
              </motion.div>
            )}

            {/* Dialog Modal form overlay (Steps 1 to 6) */}
            {step > 0 && step < 7 && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center p-2 z-20 backdrop-blur-[1px]">
                <motion.div 
                  initial={{ scale: 0.93, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95%]"
                >
                  {/* Modal Header */}
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Novo Contrato
                    </span>
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">&times;</div>
                  </div>

                  {/* Real form fields design */}
                  <div className="p-4 md:p-5 overflow-y-auto space-y-4 text-left text-xs flex-1">
                    {/* Budget selection dropdown */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Planilha/Orçamento Base</label>
                      <div className={`w-full h-10 px-3 rounded-lg border flex items-center justify-between font-bold text-slate-600 transition-colors ${
                        step === 5 ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <span>{step >= 5 ? 'Orçamento Ref. Pavimentação - Trecho Norte' : 'Selecione uma planilha base'}</span>
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Selecionar</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dados Principais do Contrato</span>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    {/* Nº Contrato & Nome da Obra */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Nº do Contrato <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.number || ''}
                          placeholder="Ex: CT-2023/105"
                          className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Nome da Obra</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.workName || ''}
                          placeholder="Identificação da Obra"
                          className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}
                        />
                      </div>
                    </div>

                    {/* Objeto do Contrato */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Objeto do Contrato</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.object || ''}
                        placeholder="Resumo do escopo..."
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}
                      />
                    </div>

                    {/* Cliente / Contratante & Nossa Empresa / Contratado */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Client / Contratante</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.client || ''}
                          placeholder="Para quem prestamos serviço"
                          className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Nossa Empresa / Contratado</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.contractor || ''}
                          placeholder="Nossa razão social"
                          className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}
                        />
                      </div>
                    </div>

                    {/* Gray sub box for technical measurement data */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 grid grid-cols-4 gap-3 shrink-0">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Unid. Medição ⓘ</label>
                        <input type="text" readOnly value={typedInputs.measurementUnit || ''} placeholder="Ex: KM" className="w-full h-9 px-2 rounded bg-white border border-slate-200 text-center font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Qtd. Unid.</label>
                        <input type="text" readOnly value={typedInputs.measurementUnitValue || ''} placeholder="Ex: 50" className="w-full h-9 px-2 rounded bg-white border border-slate-200 text-center font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 text-emerald-700">Estaca Inic.</label>
                        <input type="text" readOnly value={typedInputs.initialStation || ''} placeholder="Ex: 0+0" className="w-full h-9 px-2 rounded bg-white border border-slate-200 text-center font-bold border-emerald-100 text-emerald-800" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 text-emerald-700">Estaca Final</label>
                        <input type="text" readOnly value={typedInputs.finalStation || ''} placeholder="Ex: 150+0" className="w-full h-9 px-2 rounded bg-white border border-slate-200 text-center font-bold border-emerald-100 text-emerald-800" />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                    <button className="px-3 py-1.5 font-bold text-slate-500">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm ${step === 6 ? 'ring-4 ring-blue-100' : ''}`}>
                      Salvar Contrato
                    </button>
                    {step === 6 && (
                      <motion.div 
                        initial={{ x: 180, y: 60 }}
                        animate={{ x: [180, -25], y: [60, 5] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '40px', bottom: '0px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. INSUMOS (RESOURCES) SIMULATION ==================== */}
        {activeSim === 'resources' && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="text-left">
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Gerenciamento de materiais e frota</p>
              </div>
              <div className="relative">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  Novo Insumo
                </button>
                {step === 0 && (
                  <motion.div 
                    initial={{ x: 120, y: 150 }}
                    animate={{ x: [120, 20], y: [150, 10] }}
                    transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                    className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                    style={{ left: '40px', top: '10px' }}
                  >
                    <MousePointer className="w-6 h-6 fill-current" />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
              <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                <span className="col-span-2">Código</span>
                <span className="col-span-2">Tipo</span>
                <span className="col-span-4 text-left">Nome do Insumo</span>
                <span className="col-span-2">Unidade</span>
                <span className="col-span-2 text-right">Preço Base</span>
              </div>

              {/* Existing Insumo Row */}
              <div className="grid grid-cols-12 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <span className="col-span-2 font-mono text-slate-600 font-bold">INS-0021</span>
                <span className="col-span-2 text-left"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase">Material</span></span>
                <span className="col-span-4 font-bold text-slate-800 text-left truncate">Areia Média Lavada</span>
                <span className="col-span-2 text-slate-600 font-medium">m³</span>
                <span className="col-span-2 text-right font-extrabold text-slate-700">R$ 95,00</span>
              </div>

              {/* Added Row inside animation at Step 6 */}
              {step === 6 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="grid grid-cols-12 items-center bg-blue-50/50 border-2 border-blue-200 p-2.5 rounded-xl text-xs shadow-md"
                >
                  <span className="col-span-2 font-mono text-blue-700 font-black">INS-0482</span>
                  <span className="col-span-2 text-left"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] font-black uppercase">Material</span></span>
                  <span className="col-span-4 font-black text-slate-800 text-left truncate">Cimento Portland CP-II F-32</span>
                  <span className="col-span-2 text-slate-600 font-bold">Saco (50kg)</span>
                  <span className="col-span-2 text-right font-black text-blue-700">R$ 42,50</span>
                </motion.div>
              )}
            </div>

            {/* Dialog Form Overlay (Steps 1 to 5) */}
            {step > 0 && step < 6 && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center p-2 z-20 backdrop-blur-[1px]">
                <motion.div 
                  initial={{ scale: 0.93, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Adicionar Novo Insumo
                    </span>
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">&times;</div>
                  </div>

                  <div className="p-4 space-y-3.5 text-left text-xs">
                    <div className="grid grid-cols-4 items-center gap-2">
                      <label className="font-bold text-slate-500 text-right">Tipo</label>
                      <div className={`col-span-3 h-10 px-3 rounded-lg border flex items-center font-bold text-slate-700 transition-colors ${
                        step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                      }`}>
                        {step >= 2 ? 'Material' : 'Selecione o tipo'}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-2">
                      <label className="font-bold text-slate-500 text-right">Código</label>
                      <input type="text" readOnly value={typedInputs.code || ''} placeholder="INS-XXXX" className="col-span-3 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-600 font-bold" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-2">
                      <label className="font-bold text-slate-500 text-right">Nome</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.name || ''} 
                        placeholder="Nome do insumo..." 
                        className={`col-span-3 h-10 px-3 rounded-lg border font-bold transition-all ${
                          step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                        }`} 
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-2">
                      <label className="font-bold text-slate-500 text-right">Unidade</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.unit || ''} 
                        placeholder="Ex: KG, M3" 
                        className={`col-span-3 h-10 px-3 rounded-lg border font-bold transition-all ${
                          step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                        }`} 
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-2">
                      <label className="font-bold text-slate-500 text-right">Preço Base</label>
                      <div className="col-span-3 relative">
                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">R$</span>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.price || ''} 
                          placeholder="0,00" 
                          className={`w-full h-10 pl-9 pr-3 rounded-lg border font-extrabold text-emerald-700 transition-all ${
                            step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                          }`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                    <button className="px-3 py-1.5 font-bold text-slate-500">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm ${step === 5 ? 'ring-4 ring-blue-100' : ''}`}>
                      Salvar Insumo
                    </button>
                    {step === 5 && (
                      <motion.div 
                        initial={{ x: 120, y: 60 }}
                        animate={{ x: [120, -25], y: [60, 5] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '40px', bottom: '0px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. RH COLABORADORES SIMULATION ==================== */}
        {activeSim === 'employees' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Listagem e contratos de colaboradores</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <UserPlus className="w-3.5 h-3.5" />
                      Novo Colaborador
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ left: '40px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
                  <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                    <span className="col-span-3">Nome do Colaborador</span>
                    <span className="col-span-3">Cargo</span>
                    <span className="col-span-3">Matrícula / CPF</span>
                    <span className="col-span-3 text-right">Contrato Ativo</span>
                  </div>

                  {/* Existing Employee */}
                  <div className="grid grid-cols-12 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                    <div className="col-span-3 font-extrabold text-slate-800">John Doe</div>
                    <span className="col-span-3 text-slate-600 font-semibold">Apontador de Campo</span>
                    <span className="col-span-3 text-slate-500 font-mono text-[10px]">MAT-0043 / ***.350.***-**</span>
                    <div className="col-span-3 text-right">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-extrabold">CTR-2026/04</span>
                    </div>
                  </div>

                  {/* Added Employee at Step 6 */}
                  {step === 6 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="grid grid-cols-12 items-center bg-blue-50/50 border-2 border-blue-200 p-2.5 rounded-xl text-xs shadow-md"
                    >
                      <div className="col-span-3 font-black text-blue-900">Carlos Eduardo da Silva</div>
                      <span className="col-span-3 text-slate-800 font-extrabold">Pedreiro de Alvenaria</span>
                      <span className="col-span-3 text-blue-700 font-mono text-[10px] font-bold">MAT-9812 / 123.456.***-**</span>
                      <div className="col-span-3 text-right">
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-extrabold">CTR-2026/08</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Success Notification */}
                {step === 6 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-6 right-6 left-6 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-emerald-500 z-30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-white stroke-[3px]" />
                      </div>
                      <div className="text-left text-xs">
                        <p className="font-bold">Colaborador registrado!</p>
                        <p className="opacity-90">MAT-9812 vinculada à proteção LGPD do RH.</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-700 px-2 py-0.5 rounded font-black">LGPD OK</span>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Ficha de Admissão Digital (Steps 1 to 5) */
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              >
                {/* Header with LGPD Active Protection */}
                <div className="bg-blue-600 p-3.5 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4.5 h-4.5" />
                    <div>
                      <h4 className="text-xs font-black">Ficha de Admissão Digital</h4>
                      <p className="text-[9px] text-blue-100">Registro oficial de colaborador - Ambiente Criptografado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-700/60 px-2 py-0.5 rounded-full border border-blue-400/30 text-[8px] font-bold">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    PROTEÇÃO LGPD
                  </div>
                </div>

                {/* Content form area */}
                <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto text-xs">
                  {/* Tabs bar */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                    <span className="bg-white text-blue-600 px-2.5 py-1 rounded shadow-sm">Dados Pessoais</span>
                    <span className="text-slate-400 px-2 py-1">Documentação</span>
                    <span className="text-slate-400 px-2 py-1">Contrato & Benefícios</span>
                  </div>

                  {/* Personal Inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5 col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Nome Completo <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.name || ''} 
                        placeholder="Nome completo do colaborador" 
                        className={`w-full h-9 px-2.5 rounded bg-slate-50 border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase">CPF <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.cpf || ''} 
                        placeholder="000.000.000-00" 
                        className={`w-full h-9 px-2.5 rounded bg-slate-50 border font-mono transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Matrícula</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.registrationNumber || ''} 
                        placeholder="Ex: MAT-010" 
                        className={`w-full h-9 px-2.5 rounded bg-slate-50 border font-mono transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Data de Nascimento</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.birthDate || ''} 
                        placeholder="AAAA-MM-DD" 
                        className={`w-full h-9 px-2.5 rounded bg-slate-50 border transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Contrato Vinculado</label>
                      <div className="h-9 px-2.5 bg-slate-100 border border-slate-200 rounded flex items-center font-bold text-slate-700">
                        {step >= 4 ? 'CTR-2026/08' : 'Selecione...'}
                      </div>
                    </div>
                  </div>

                  {/* LGPD Acceptance Box */}
                  <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-colors shrink-0 ${
                    step === 4 ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-100' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      step >= 4 ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                    }`}>
                      {step >= 4 && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                    </div>
                    <div className="text-[9px] text-slate-500 leading-normal">
                      <span className="font-bold text-slate-700">Declaração de Consentimento de Privacidade:</span> Aceito os termos de tratamento seguro de dados confidenciais de RH e homologação profissional conforme diretrizes do sistema.
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                  <button className="px-3 h-10 border border-slate-200 rounded-lg font-bold text-slate-500 text-xs">Cancelar</button>
                  <button className={`px-4 h-10 text-white font-black rounded-lg shadow-sm flex items-center gap-1 text-xs ${
                    step >= 4 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Efetivar Registro Seguro
                  </button>
                  {step === 5 && (
                    <motion.div 
                      initial={{ x: 120, y: 40 }}
                      animate={{ x: [120, -15], y: [40, 5] }}
                      transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                      className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                      style={{ right: '40px', bottom: '0px' }}
                    >
                      <MousePointer className="w-6 h-6 fill-current" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ==================== 4. PURCHASES REQUESTS SIMULATION ==================== */}
        {activeSim === 'requests' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Solicitações de materiais e suprimentos</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <Plus className="w-3.5 h-3.5" />
                      Nova Solicitação
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ left: '40px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
                  <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                    <span className="col-span-2">Data</span>
                    <span className="col-span-5">Descrição Geral</span>
                    <span className="col-span-3">Prioridade / Categoria</span>
                    <span className="col-span-2 text-right">Status</span>
                  </div>

                  {/* Existing Requisition */}
                  <div className="grid grid-cols-12 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                    <span className="col-span-2 font-mono text-slate-500">01/07/2026</span>
                    <div className="col-span-5 text-left">
                      <span className="font-extrabold text-slate-800 block truncate">Aquisição de EPIs Diversos</span>
                      <span className="text-[9px] text-slate-400 font-medium">Capacetes, óculos e luvas de raspa</span>
                    </div>
                    <span className="col-span-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] uppercase font-bold rounded">Normal</span></span>
                    <div className="col-span-2 text-right">
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-extrabold">Pendente</span>
                    </div>
                  </div>

                  {/* Added Request at Step 6 */}
                  {step === 6 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="grid grid-cols-12 items-center bg-blue-50/50 border-2 border-blue-200 p-2.5 rounded-xl text-xs shadow-md"
                    >
                      <span className="col-span-2 font-mono text-blue-700 font-bold">08/07/2026</span>
                      <div className="col-span-5 text-left">
                        <span className="font-black text-slate-800 block truncate flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          Tubos de Concreto Armado PA-2
                        </span>
                        <span className="text-[9px] text-blue-600 font-semibold">Obras Industriais - Frente 02</span>
                      </div>
                      <span className="col-span-3">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[9px] uppercase font-black rounded-md mr-1">Urgente</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">Infra</span>
                      </span>
                      <div className="col-span-2 text-right">
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-extrabold animate-pulse">Pendente</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              /* Requisition Full Screen Form Overlay */
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              >
                {/* Header with shopping cart background */}
                <div className="bg-blue-600 p-4 text-white relative overflow-hidden shrink-0">
                  <ShoppingCart className="absolute -right-5 -bottom-5 w-20 h-20 opacity-10 rotate-12" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">Solicitação de Compra</h4>
                      <p className="text-[10px] text-blue-100 uppercase font-bold tracking-widest mt-0.5">Preenchimento de requisição de materiais</p>
                    </div>
                    <button className="bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase text-white rounded">Voltar</button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Data da Solicitação</label>
                      <input type="text" readOnly value="08/07/2026" className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Setor Solicitante</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.sector || ''} 
                        placeholder="Ex: Engenharia/Obra" 
                        className={`w-full h-9 px-3 rounded-lg border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Descrição Geral / Motivo</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={typedInputs.description || ''} 
                      placeholder="Ex: Materiais para fundação" 
                      className={`w-full h-9 px-3 rounded-lg border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Obra / Contrato Vinculado</label>
                    <div className={`h-9 px-3 rounded-lg border flex items-center font-bold text-slate-700 transition-colors ${
                      step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'
                    }`}>
                      {step >= 3 ? 'Pavimentação Trecho Norte (CTR-2026/08)' : 'Selecione o contrato...'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Prioridade</label>
                      <div className={`h-9 px-3 rounded-lg border flex items-center justify-between font-black transition-colors ${
                        step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50 text-red-600'
                      }`}>
                        <span className="flex items-center gap-1.5 font-bold">
                          {step >= 4 ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              URGENTE
                            </>
                          ) : 'NORMAL'}
                        </span>
                        <span className="text-[9px] text-slate-400">▼</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400">Categoria</label>
                      <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center font-bold text-slate-600">
                        {step >= 4 ? 'Material de Infraestrutura' : 'Selecione...'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                  <button className="px-3 h-10 border border-slate-200 rounded-lg font-bold text-slate-500 text-xs">Cancelar</button>
                  <button className={`px-5 h-10 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm ${step === 5 ? 'ring-4 ring-blue-100' : ''}`}>
                    Salvar Solicitação
                  </button>
                  {step === 5 && (
                    <motion.div 
                      initial={{ x: 120, y: 40 }}
                      animate={{ x: [120, -15], y: [40, 5] }}
                      transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                      className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                      style={{ right: '40px', bottom: '0px' }}
                    >
                      <MousePointer className="w-6 h-6 fill-current" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ==================== 5. FINANCEIRO APORTES SIMULATION ==================== */}
        {/* ==================== 4. QUOTATIONS SIMULATION ==================== */}
        {activeSim === 'quotations_tab' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 5) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Gerenciamento de cotações</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <Plus className="w-3.5 h-3.5" />
                      Nova Cotação
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ left: '40px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>
                <div className="flex-1 mt-4 grid grid-cols-1 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-xl border border-slate-100 flex items-center justify-between px-4 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="w-24 h-2 rounded bg-slate-200"></div>
                          <div className="w-16 h-1.5 rounded bg-slate-100"></div>
                        </div>
                      </div>
                      <div className="w-16 h-4 rounded-full bg-slate-200"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center p-2 z-20 backdrop-blur-[1px]">
                <motion.div 
                  initial={{ scale: 0.93, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Mapa Comparativo de Preços
                    </span>
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">&times;</div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 text-left text-xs">
                    <div className="space-y-1 col-span-2">
                      <label className="font-bold text-slate-500">Fornecedores (Passo 2)</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={step >= 1 ? 'Fornecedor A, Fornecedor B' : ' '} 
                        placeholder="Adicionar fornecedores..."
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 1 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Proposta Fornecedor A (Passo 3)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">R$</span>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.p1 || ' '} 
                          placeholder="0,00"
                          className={`w-full h-10 pl-9 pr-3 rounded-lg border font-extrabold text-emerald-700 transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Proposta Fornecedor B</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">R$</span>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.p2 || ' '} 
                          placeholder="0,00"
                          className={`w-full h-10 pl-9 pr-3 rounded-lg border font-extrabold text-rose-700 transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                        />
                      </div>
                    </div>

                    {step >= 3 && (
                      <div className="col-span-2 bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 mt-2 font-bold text-center">
                        ✓ Fornecedor A é o mais vantajoso!
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                    <button className="px-3 py-1.5 font-bold text-slate-500">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm ${step === 4 ? 'ring-4 ring-blue-100' : ' '}`}>
                      Finalizar Mapa
                    </button>
                    {step === 4 && (
                      <motion.div 
                        initial={{ x: 120, y: 60 }}
                        animate={{ x: [120, -25], y: [60, 5] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '40px', bottom: '0px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
        {activeSim === 'payables' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Lançamento de parcelas e liquidações</p>
              </div>
              <div className="relative">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  Novo Item
                </button>
                {step === 0 && (
                  <motion.div 
                    initial={{ x: 120, y: 150 }}
                    animate={{ x: [120, 20], y: [150, 10] }}
                    transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                    className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                    style={{ left: '40px', top: '10px' }}
                  >
                    <MousePointer className="w-6 h-6 fill-current" />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
              <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                <span className="col-span-3">Categoria / Fornecedor</span>
                <span className="col-span-4">Descrição</span>
                <span className="col-span-3">Vencimento</span>
                <span className="col-span-2 text-right">Valor</span>
              </div>

              {/* Existing Aporte Item */}
              <div className="grid grid-cols-12 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                <div className="col-span-3 text-left">
                  <span className="font-extrabold text-slate-800 block truncate">Mão de Obra</span>
                  <span className="text-[9px] text-slate-400 font-bold">Terceirizados Sul</span>
                </div>
                <span className="col-span-4 text-slate-600 truncate">Soma de Diárias de Carpinteiros</span>
                <span className="col-span-3 font-mono text-[10px] text-slate-500 font-bold">15/07/2026</span>
                <span className="col-span-2 text-right font-bold text-slate-700">R$ 4.200,00</span>
              </div>

              {/* Added Aporte Item at Step 6 */}
              {step === 6 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="grid grid-cols-12 items-center bg-blue-50/50 border-2 border-blue-200 p-2.5 rounded-xl text-xs shadow-md"
                >
                  <div className="col-span-3 text-left">
                    <span className="font-extrabold text-blue-900 block truncate">Insumos</span>
                    <span className="text-[9px] text-blue-500 font-bold">Votorantim S/A</span>
                  </div>
                  <span className="col-span-4 text-slate-800 font-bold truncate">Cimento para concreto do viaduto</span>
                  <span className="col-span-3 font-mono text-[10px] text-blue-700 font-black">25/07/2026</span>
                  <span className="col-span-2 text-right font-black text-emerald-700">R$ 6.375,00</span>
                </motion.div>
              )}
            </div>

            {/* Dialog Form Modal Overlay (Steps 1 to 5) */}
            {step > 0 && step < 6 && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center p-2 z-20 backdrop-blur-[1px]">
                <motion.div 
                  initial={{ scale: 0.93, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      Lançar Novo Item de Custo
                    </span>
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">&times;</div>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-3 text-left text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Categoria</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.categoria || ''} 
                        placeholder="Insumos, Serviços, Impostos..." 
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Subcategoria</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.subcategoria || ''} 
                        placeholder="Ex: Cimento, Aço" 
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="font-bold text-slate-500">Fornecedor</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.fornecedor || ''} 
                        placeholder="Digite para pesquisar fornecedor" 
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="font-bold text-slate-500">Descrição do Item</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.descricao || ''} 
                        placeholder="Descrição técnica" 
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 3 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Vencimento</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={typedInputs.dueDate || ''} 
                        placeholder="AAAA-MM-DD" 
                        className={`w-full h-10 px-3 rounded-lg border font-bold transition-all ${step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Valor Estimado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">R$</span>
                        <input 
                          type="text" 
                          readOnly 
                          value={typedInputs.value ? '6.375,00' : ''} 
                          placeholder="0,00" 
                          className={`w-full h-10 pl-9 pr-3 rounded-lg border font-extrabold text-emerald-700 transition-all ${step === 4 ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                    <button className="px-3 py-1.5 font-bold text-slate-500">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm ${step === 5 ? 'ring-4 ring-blue-100' : ''}`}>
                      Salvar Item
                    </button>
                    {step === 5 && (
                      <motion.div 
                        initial={{ x: 120, y: 60 }}
                        animate={{ x: [120, -25], y: [60, 5] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '40px', bottom: '0px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 7. PLUVIOMETRIA SIMULATION ==================== */}
        {activeSim === 'pluviometria' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Controle diário de chuvas</p>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black shadow-sm border border-slate-200">
                      <Calendar className="w-3.5 h-3.5" />
                      Agosto 2026
                    </div>
                  </div>
                </div>

                <div className="flex-1 mt-4 overflow-hidden relative flex flex-col">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 flex-1">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const day = i + 1;
                      // Just simulating month of August starting on Sat
                      const isTargetDay = day === 15;
                      const hasRain = day === 5 || day === 12;
                      
                      return (
                        <div 
                          key={day} 
                          className={`
                            border rounded-lg relative flex flex-col items-center justify-center
                            ${isTargetDay && step === 0 ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'bg-white border-slate-200'}
                            ${hasRain ? 'bg-blue-50' : ''}
                            ${step >= 6 && isTargetDay ? 'bg-amber-50 border-amber-200' : ''}
                          `}
                        >
                          <span className="text-sm font-bold text-slate-700">{day}</span>
                          {hasRain && <div className="text-[10px] font-black text-blue-600 mt-1">12mm</div>}
                          {step >= 6 && isTargetDay && <div className="text-[10px] font-black text-amber-600 mt-1">{typedInputs.chuva || '35'}mm</div>}
                          
                          {/* Animated pointer on the specific day */}
                          {isTargetDay && step === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="absolute top-1/2 left-1/2"
                            >
                              <MousePointer className="w-6 h-6 text-blue-600 fill-current drop-shadow-md z-30" />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Registro: 15 de Agosto
                    </span>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4">
                    {/* Volume de Chuvas */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Precipitação (mm)
                      </label>
                      <div className={`
                        w-full h-11 px-4 rounded-xl border flex items-center justify-between font-extrabold text-lg
                        transition-all duration-300
                        ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-4 ring-blue-100' : 'border-slate-200 bg-slate-50'}
                      `}>
                        <span className={typedInputs.chuva ? 'text-slate-800' : 'text-slate-400'}>
                          {typedInputs.chuva || '0'}
                        </span>
                        <span className="text-slate-400 text-sm">mm</span>
                        
                        {step === 2 && (
                          <motion.div 
                            animate={{ opacity: [1, 0, 1] }} 
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-0.5 h-6 bg-blue-500 absolute left-8"
                          />
                        )}
                      </div>
                    </div>

                    {/* Impacto */}
                    <div className={`space-y-1.5 transition-all duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Impacto Operacional
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Trabalhável' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Trabalhável' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Trabalhável' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Trabalhável' ? 'text-emerald-800' : 'text-slate-600'}`}>Trabalhável</span>
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Parcial' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'} ${step === 3 ? 'ring-2 ring-amber-200' : ''}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Parcial' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Parcial' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Parcial' ? 'text-amber-800' : 'text-slate-600'}`}>Parcialmente Improdutivo</span>
                          {step === 3 && (
                             <motion.div 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               className="absolute right-6"
                             >
                               <MousePointer className="w-5 h-5 text-blue-600 fill-current drop-shadow-sm" />
                             </motion.div>
                          )}
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Improdutivo' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Improdutivo' ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Improdutivo' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Improdutivo' ? 'text-rose-800' : 'text-slate-600'}`}>Improdutivo</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button className="px-4 py-2 font-bold text-slate-500 text-sm">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm text-sm transition-all ${step === 4 ? 'ring-4 ring-blue-100 scale-105' : ''}`}>
                      Salvar Registro
                    </button>
                    {step === 4 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        className="absolute right-8 bottom-6 z-30 pointer-events-none"
                      >
                        <MousePointer className="w-6 h-6 text-blue-600 fill-current drop-shadow-md" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
        {/* ==================== 8. RDO SIMULATION ==================== */}
        {activeSim === 'rdo' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Relatório Diário de Obra</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      Novo RDO
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '10px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex-1 mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col relative shadow-sm">
                  <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4">
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                    <div className="flex-1"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded"></div>
                  </div>
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 border-b border-slate-100 flex items-center px-4 gap-4 relative">
                      <div className="w-24 h-4 bg-slate-100 rounded"></div>
                      <div className="w-40 h-4 bg-slate-100 rounded"></div>
                      <div className="flex-1"></div>
                      <div className="w-24 h-6 bg-slate-50 border border-slate-100 rounded-full"></div>
                      
                      {i === 1 && step >= 6 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                        />
                      )}
                    </div>
                  ))}
                  
                  {step >= 6 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 z-10"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      RDO assinado com sucesso.
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Diário de Obra - 15/08/2026
                    </span>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                    
                    {/* Condições Climáticas */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condições Climáticas</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step >= 2 ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Manhã</span>
                          <span className={`text-xs font-black ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>{typedInputs.climaM || '---'}</span>
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step >= 2 ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Tarde</span>
                          <span className={`text-xs font-black ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>{typedInputs.climaT || '---'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Efetivo */}
                    <div className={`space-y-2 transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efetivo de Produção</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step === 3 ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Mão de Obra Direta</span>
                          <span className="text-sm font-black text-slate-800">{typedInputs.efetivo || '0'}</span>
                          {step === 3 && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-0.5 h-4 bg-blue-500 absolute right-4" />}
                        </div>
                        <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between px-3 opacity-60">
                          <span className="text-xs font-bold text-slate-600">Equipamentos</span>
                          <span className="text-sm font-black text-slate-800">12</span>
                        </div>
                      </div>
                    </div>

                    {/* Relato */}
                    <div className={`space-y-2 transition-opacity duration-300 ${step >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relatório Diário</h5>
                      <div className={`p-3 rounded-lg border h-24 overflow-hidden relative transition-colors ${step === 4 ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}>
                         <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap">{typedInputs.relato}</p>
                         {step === 4 && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block w-0.5 h-3 bg-blue-500 align-middle ml-1" />}
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button className="px-4 py-1.5 font-bold text-slate-500 text-sm">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm text-sm transition-all ${step === 5 ? 'ring-4 ring-blue-100 scale-105' : ''}`}>
                      Assinar e Finalizar
                    </button>
                    {step === 5 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        className="absolute right-8 bottom-6 z-30 pointer-events-none"
                      >
                        <MousePointer className="w-6 h-6 text-blue-600 fill-current drop-shadow-md" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
        {/* ==================== 6. GENERIC SIMULATION ==================== */}
        {activeSim === 'generic' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < currentConfig.totalSteps - 1) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Listagem e Gerenciamento</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      Novo Registro
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '10px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* Fake Data Table */}
                <div className="flex-1 mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col relative">
                  <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4">
                    <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                    <div className="flex-1"></div>
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded"></div>
                  </div>
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 border-b border-slate-100 flex items-center px-4 gap-4 relative">
                      <div className="w-8 h-4 bg-slate-100 rounded"></div>
                      <div className="w-40 h-4 bg-slate-100 rounded"></div>
                      <div className="flex-1"></div>
                      <div className="w-24 h-6 bg-slate-50 border border-slate-100 rounded-full"></div>
                      <div className="w-16 h-4 bg-slate-100 rounded"></div>
                      
                      {/* Show success indicator on the first row when finished */}
                      {i === 1 && step >= currentConfig.totalSteps - 1 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"
                        />
                      )}
                    </div>
                  ))}
                  
                  {step >= currentConfig.totalSteps - 1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 z-10"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Registro salvo com sucesso.
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center p-4 z-20 backdrop-blur-[1px]">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Formulário: {currentConfig.pageTitle}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">&times;</div>
                  </div>
                  
                  <div className="p-5 grid grid-cols-2 gap-4 text-left text-xs bg-white">
                    {steps.map((s, idx) => {
                      const colonIndex = s.indexOf(':');
                      const label = colonIndex > 0 && colonIndex < 40 ? s.substring(0, colonIndex) : `Campo ${idx + 1}`;
                      
                      // We only show up to 4 fields to fit in the modal
                      if (idx > 3) return null;
                      
                      const fieldStep = idx + 1; // steps mapping
                      const isCurrentStep = step === fieldStep;
                      const isPastStep = step > fieldStep;
                      
                      return (
                        <div key={idx} className={`space-y-1.5 ${idx === 0 || idx === 3 ? 'col-span-2' : 'col-span-1'}`}>
                          <label className="font-bold text-slate-500">{label}</label>
                          <div className={`w-full h-9 px-3 rounded-lg border flex items-center font-extrabold transition-all text-slate-700
                            ${isCurrentStep ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}
                            ${isPastStep ? 'border-slate-300 bg-white text-slate-700' : ''}
                          `}>
                            {isPastStep ? 'Preenchido ✓' : (isCurrentStep ? <span className="animate-pulse text-blue-500">|</span> : '')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 relative">
                    <button className="px-3 py-1.5 font-bold text-slate-500">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm ${step === currentConfig.totalSteps - 2 ? 'ring-4 ring-blue-100' : ''}`}>
                      Salvar Registro
                    </button>
                    {step === currentConfig.totalSteps - 2 && (
                      <motion.div 
                        initial={{ x: 120, y: 60 }}
                        animate={{ x: [120, -25], y: [60, 5] }}
                        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '40px', bottom: '0px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SERVICES (COMPOSIÇÕES CPU) SIMULATION ==================== */}
        {activeSim === 'services' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Cadastro de Composição de Preço Unitário (CPU)</p>
              </div>
              <button className={`px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 ${step === 0 ? 'ring-4 ring-blue-100' : ''}`}>
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                Novo Serviço / CPU
              </button>
            </div>

            <div className="flex-1 mt-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="col-span-3">
                  <label className="text-[9px] font-black uppercase text-slate-400">Código CPU</label>
                  <p className="font-extrabold text-blue-700 bg-white px-2 py-1 rounded border border-slate-200">{typedInputs.code || 'CPU-004'}</p>
                </div>
                <div className="col-span-7">
                  <label className="text-[9px] font-black uppercase text-slate-400">Descrição do Serviço</label>
                  <p className="font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 truncate">{typedInputs.desc || 'Digite para preencher a descrição...'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Unidade</label>
                  <p className="font-extrabold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 text-center">{typedInputs.unit || 'm³'}</p>
                </div>
              </div>

              {/* Composition Insumos Table */}
              <div className="space-y-1.5 flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Insumos da Composição (Mão de Obra e Materiais)</span>
                  <span className="text-[9px] font-bold text-blue-600">+ Adicionar Insumo</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {step >= 2 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-1.5 bg-blue-50/50 rounded border border-blue-100">
                      <span className="font-bold text-slate-700">INS-0012 • Pedreiro</span>
                      <span className="text-slate-500">Coef: <strong className="text-slate-800">0.50 h</strong></span>
                      <span className="text-slate-500">R$ 25,00/h</span>
                      <span className="font-extrabold text-slate-800">R$ 12,50</span>
                    </motion.div>
                  )}
                  {step >= 3 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-1.5 bg-blue-50/50 rounded border border-blue-100">
                      <span className="font-bold text-slate-700">INS-0015 • Servente</span>
                      <span className="text-slate-500">Coef: <strong className="text-slate-800">1.00 h</strong></span>
                      <span className="text-slate-500">R$ 18,00/h</span>
                      <span className="font-extrabold text-slate-800">R$ 18,00</span>
                    </motion.div>
                  )}
                  {step >= 4 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                      <span className="font-bold text-slate-700">INS-0420 • Concreto Usinado fck=30MPa</span>
                      <span className="text-slate-500">Coef: <strong className="text-slate-800">1.05 m³</strong></span>
                      <span className="text-slate-500">R$ 433,33/m³</span>
                      <span className="font-extrabold text-slate-800">R$ 455,00</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Direct Cost Footer */}
              <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Custo Unitário Direto (CUD):</span>
                <span className="text-sm font-black text-emerald-400">R$ {typedInputs.cud || '0,00'} / m³</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== BUDGET (PLANILHA ORÇAMENTÁRIA) SIMULATION ==================== */}
        {activeSim === 'budget' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Estruturação de Grupos e Serviços Orçados</p>
              </div>
              <div className="flex gap-1.5">
                <button className={`px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-black flex items-center gap-1 ${step === 0 ? 'ring-2 ring-blue-300' : ''}`}>
                  <FolderPlus className="w-3 h-3" /> + Adicionar Grupo
                </button>
                <button className={`px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1 ${step === 2 ? 'ring-2 ring-blue-300' : ''}`}>
                  <Plus className="w-3 h-3" /> + Inserir Serviço
                </button>
              </div>
            </div>

            <div className="flex-1 mt-2 bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm space-y-2 overflow-y-auto">
              {/* Group 1 */}
              {step >= 1 && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                  <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center justify-between font-black text-xs">
                    <span>{typedInputs.group || '1.0 SERVIÇOS PRELIMINARES'}</span>
                    <span className="text-[10px] text-slate-300 font-bold">Subtotal: R$ 2.689,20</span>
                  </div>
                  {step >= 2 && (
                    <div className="pl-2 border-l-2 border-blue-500 py-1 space-y-1">
                      <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 grid grid-cols-12 items-center text-[11px]">
                        <span className="col-span-2 font-black text-blue-700">1.1 CPU-001</span>
                        <span className="col-span-5 font-bold text-slate-800 truncate">{typedInputs.service || 'Placa de Obra Galvanizada'}</span>
                        <span className="col-span-2 text-slate-500">Qtd: <strong className="text-slate-800">{typedInputs.qty || '12.00'} m²</strong></span>
                        <span className="col-span-3 text-right font-black text-emerald-700">R$ {typedInputs.total || '2.689,20'}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Group 2 */}
              <div className="space-y-1 opacity-90">
                <div className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg flex items-center justify-between font-extrabold text-xs border border-slate-200">
                  <span>2.0 INFRAESTRUTURA E ESTRUTURA</span>
                  <span className="text-[10px] text-slate-600 font-bold">Subtotal: R$ 33.738,56</span>
                </div>
                <div className="pl-2 border-l-2 border-slate-300 py-1 space-y-1">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 grid grid-cols-12 items-center text-[11px]">
                    <span className="col-span-2 font-bold text-slate-600">2.1 CPU-002</span>
                    <span className="col-span-5 font-medium text-slate-700 truncate">Escavação mecanizada de valas</span>
                    <span className="col-span-2 text-slate-500">150.00 m³</span>
                    <span className="col-span-3 text-right font-bold text-slate-800">R$ 6.536,25</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 grid grid-cols-12 items-center text-[11px]">
                    <span className="col-span-2 font-bold text-slate-600">2.2 CPU-004</span>
                    <span className="col-span-5 font-medium text-slate-700 truncate">Concreto usinado fck=30MPa com bomba</span>
                    <span className="col-span-2 text-slate-500">45.00 m³</span>
                    <span className="col-span-3 text-right font-bold text-slate-800">R$ 27.202,31</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900 text-white p-2.5 rounded-xl flex items-center justify-between mt-2">
              <span className="text-xs font-bold text-blue-200">Total Geral da Planilha (c/ BDI 24.50%):</span>
              <span className="text-sm font-black text-amber-300">R$ 36.427,76</span>
            </div>
          </div>
        )}

        {/* ==================== BDI SIMULATION ==================== */}
        {activeSim === 'bdi' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Cálculo de BDI conforme Acórdão do Tribunal de Contas da União (TCU)</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black border border-amber-200">
                Fórmula Oficial TCU
              </span>
            </div>

            <div className="flex-1 mt-2 grid grid-cols-2 gap-2 overflow-y-auto">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase">Custos Indiretos e Margem</h5>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Administração Central</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.adm || '0.00'} %</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Seguro e Garantia</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.seg || '0.00'} %</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Riscos e Contingências</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.risc || '0.00'} %</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase">Financeiro e Lucro</h5>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Despesas Financeiras</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.df || '0.00'} %</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Lucro Operacional</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.lucro || '0.00'} %</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600">Tributos (PIS/COFINS/ISS)</span>
                    <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{typedInputs.trib || '0.00'} %</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between mt-2 border border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400">Taxa de BDI Resultante Homologada:</p>
                <p className="text-xs text-slate-300 font-medium">BDI = [((1+(AC+S+R+G))*(1+DF)*(1+L))/(1-I)] - 1</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-400">{typedInputs.bdiTotal || '0,00'}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CURVA ABC SIMULATION ==================== */}
        {activeSim === 'abc' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Classificação da curva de representatividade financeira da obra</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black">
                Análise de Pareto
              </span>
            </div>

            <div className="flex-1 mt-2 bg-white rounded-xl border border-slate-200 p-2.5 overflow-y-auto space-y-2">
              <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 border-b pb-1">
                <span className={`col-span-1 ${step === 1 ? 'text-blue-600 font-extrabold' : ''}`}>Rank</span>
                <span className="col-span-4">Insumo / Descrição</span>
                <span className={`col-span-3 text-right ${step === 2 ? 'text-blue-600 font-extrabold' : ''}`}>Valor Total (R$)</span>
                <span className={`col-span-2 text-right ${step === 3 ? 'text-blue-600 font-extrabold' : ''}`}>% Indiv. / Acum.</span>
                <span className={`col-span-2 text-center ${step >= 4 ? 'text-blue-600 font-extrabold' : ''}`}>Classe</span>
              </div>

              {/* Row 1 - Classe A */}
              <div className={`grid grid-cols-12 items-center p-2 rounded-lg border text-[11px] ${step >= 4 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="col-span-1 font-black text-slate-700">1º</span>
                <span className="col-span-4 font-extrabold text-slate-800 truncate">Aço CA-50 10mm</span>
                <span className="col-span-3 text-right font-bold text-slate-800">R$ 125.000,00</span>
                <span className="col-span-2 text-right font-medium text-slate-600">45.0% / <strong>45.0%</strong></span>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black">Classe A</span>
                </div>
              </div>

              {/* Row 2 - Classe A */}
              <div className={`grid grid-cols-12 items-center p-2 rounded-lg border text-[11px] ${step >= 4 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className="col-span-1 font-black text-slate-700">2º</span>
                <span className="col-span-4 font-extrabold text-slate-800 truncate">Concreto Usinado FCK 30</span>
                <span className="col-span-3 text-right font-bold text-slate-800">R$ 97.000,00</span>
                <span className="col-span-2 text-right font-medium text-slate-600">35.0% / <strong>80.0%</strong></span>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black">Classe A</span>
                </div>
              </div>

              {/* Row 3 - Classe B */}
              <div className="grid grid-cols-12 items-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                <span className="col-span-1 font-black text-slate-700">3º</span>
                <span className="col-span-4 font-medium text-slate-800 truncate">Formas de Madeira Resinada</span>
                <span className="col-span-3 text-right font-bold text-slate-800">R$ 32.000,00</span>
                <span className="col-span-2 text-right font-medium text-slate-600">11.5% / <strong>91.5%</strong></span>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-[9px] font-black">Classe B</span>
                </div>
              </div>

              {/* Row 4 - Classe C */}
              <div className="grid grid-cols-12 items-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                <span className="col-span-1 font-black text-slate-700">4º</span>
                <span className="col-span-4 font-medium text-slate-800 truncate">Prego c/ Cabeça 18x27</span>
                <span className="col-span-3 text-right font-bold text-slate-800">R$ 12.000,00</span>
                <span className="col-span-2 text-right font-medium text-slate-600">4.3% / <strong>95.8%</strong></span>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 bg-slate-400 text-white rounded-full text-[9px] font-black">Classe C</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-300">Resumo de Pareto: <strong className="text-amber-400">Classe A (2 itens = 80% do valor total)</strong></span>
              <span className="text-xs font-bold text-emerald-400">Orçamento Total: R$ 277.700,00</span>
            </div>
          </div>
        )}

        {/* ==================== SCHEDULE SIMULATION ==================== */}
        {activeSim === 'schedule' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Planejamento e Distribuição Físico-Financeira</p>
              </div>
              <div className="flex gap-1">
                <span className={`px-2 py-1 rounded text-[9px] font-black border flex items-center gap-1 ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Clock className="w-3 h-3" /> Duração (Dias)
                </span>
                <span className={`px-2 py-1 rounded text-[9px] font-black border flex items-center gap-1 ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Check className="w-3 h-3" /> Sincronizar 100%
                </span>
                <span className={`px-2 py-1 rounded text-[9px] font-black border flex items-center gap-1 ${step === 5 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <TrendingUp className="w-3 h-3" /> Curva S
                </span>
              </div>
            </div>

            <div className="flex-1 mt-2 bg-white rounded-xl border border-slate-200 p-2.5 overflow-y-auto space-y-2">
              <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 border-b pb-1">
                <span className="col-span-4">Atividade</span>
                <span className="col-span-2 text-center">Duração</span>
                <span className="col-span-2 text-center">Mês 1</span>
                <span className="col-span-2 text-center">Mês 2</span>
                <span className="col-span-2 text-center">Mês 3</span>
              </div>

              <div className="grid grid-cols-12 items-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                <span className="col-span-4 font-bold text-slate-800 truncate">1.1 Placa da Obra</span>
                <span className="col-span-2 text-center font-semibold text-slate-600">10d</span>
                <span className="col-span-2 text-center font-extrabold text-emerald-700 bg-emerald-50 rounded py-0.5">100%</span>
                <span className="col-span-2 text-center text-slate-400">0%</span>
                <span className="col-span-2 text-center text-slate-400">0%</span>
              </div>

              <div className="grid grid-cols-12 items-center p-2 bg-blue-50/50 rounded-lg border border-blue-200 text-[11px]">
                <span className="col-span-4 font-bold text-slate-800 truncate">2.1 Escavação</span>
                <span className="col-span-2 text-center font-bold text-blue-700">{typedInputs.dur || '20d'}</span>
                <span className="col-span-2 text-center font-extrabold text-blue-700 bg-white border border-blue-200 rounded py-0.5">{typedInputs.m1 || '0%'}</span>
                <span className="col-span-2 text-center font-extrabold text-blue-700 bg-white border border-blue-200 rounded py-0.5">{typedInputs.m2 || '0%'}</span>
                <span className="col-span-2 text-center text-slate-400">0%</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-300">Desembolso Financeiro Mês 1: <strong className="text-emerald-400">R$ 6.610,00 (18.1%)</strong></span>
              <span className="text-[10px] text-slate-300">Mês 2: <strong className="text-amber-300">R$ 16.215,00 (44.5%)</strong></span>
            </div>
          </div>
        )}

        {/* ==================== REPORTS SIMULATION ==================== */}
        {activeSim === 'reports' && (
          <div className="w-full h-full flex flex-col justify-between text-left text-xs relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">Impressão e Exportação em PDF / Excel</p>
              </div>

              {/* Action Tools Toolbar */}
              <div className="flex gap-1.5">
                <button className={`px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black flex items-center gap-1 ${step === 2 || step === 3 ? 'ring-2 ring-blue-300' : ''}`}>
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button className={`px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1 ${step === 4 ? 'ring-2 ring-rose-300' : ''}`}>
                  <Download className="w-3.5 h-3.5" /> Gerar PDF
                </button>
                <button className={`px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1 ${step === 5 ? 'ring-2 ring-emerald-300' : ''}`}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Gerar Excel
                </button>
              </div>
            </div>

            {/* Document Preview Card */}
            <div className="flex-1 mt-2 bg-white rounded-xl border border-slate-200 p-4 shadow-inner overflow-hidden flex flex-col justify-between relative">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-slate-900 text-sm">RELATÓRIO ORÇAMENTÁRIO SINTÉTICO</h5>
                  <p className="text-[9px] text-slate-500 font-bold">Obra: Pavimentação Trecho Sul • Cliente: Prefeitura de Curitiba</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">PDF</div>
              </div>

              <div className="space-y-1.5 py-2 text-[10px]">
                <div className="flex justify-between p-1 bg-slate-50 rounded"><span className="font-bold">1.0 SERVIÇOS PRELIMINARES</span><span>R$ 2.689,20</span></div>
                <div className="flex justify-between p-1 bg-slate-50 rounded"><span className="font-bold">2.0 INFRAESTRUTURA E ESTRUTURA</span><span>R$ 33.738,56</span></div>
              </div>

              <div className="border-t pt-2 flex justify-between items-center font-black text-xs text-slate-900">
                <span>VALOR TOTAL DO ORÇAMENTO:</span>
                <span className="text-emerald-700">R$ 36.427,76</span>
              </div>

              {/* Toast overlays for action triggers */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-x-4 top-1/4 bg-slate-900 text-white p-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
                  <Printer className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Diálogo de Impressão Acionado</p>
                    <p className="text-[9px] text-slate-400">Enviando documento formatado para a impressora do sistema...</p>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-x-4 top-1/4 bg-rose-900 text-white p-3 rounded-xl shadow-2xl flex items-center gap-3 border border-rose-700">
                  <Download className="w-5 h-5 text-rose-300 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Arquivo PDF Gerado!</p>
                    <p className="text-[9px] text-rose-200">Download automático: Orçamento_Sintetico_Curitiba.pdf</p>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-x-4 top-1/4 bg-emerald-900 text-white p-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-700">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Planilha Excel Exportada!</p>
                    <p className="text-[9px] text-emerald-200">Download automático: Planilha_Orcamentaria_2026.xlsx</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Control Panel Area */}
      <div className="bg-slate-850 px-5 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors shadow-inner"
            title={isPlaying ? "Pausar Guia" : "Iniciar Guia"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current text-blue-400" /> : <Play className="w-3.5 h-3.5 fill-current text-emerald-400 ml-0.5" />}
          </button>
          
          <button 
            onClick={() => { setStep(0); setIsPlaying(true); }}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors"
            title="Recomeçar Demo"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Passo {step + 1} de {TOTAL_STEPS}</span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[240px] sm:max-w-[340px]">{currentConfig.labels[step]}</span>
          </div>
        </div>

        {/* Progress Dot Indicators */}
        <div className="flex items-center gap-1.5 justify-center">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setStep(idx);
                setIsPlaying(false);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === idx 
                  ? 'w-5 bg-blue-500' 
                  : idx < step 
                    ? 'w-1.5 bg-slate-500' 
                    : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
