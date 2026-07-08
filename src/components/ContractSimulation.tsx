import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Play, Pause, RotateCcw, Check, MousePointer, 
  User, Calendar, FileText, Briefcase, DollarSign, Users,
  AlertCircle, ShoppingCart, ArrowLeft, ShieldAlert,
  CreditCard, Smartphone, Heart, Landmark, HardHat,
  Receipt, Building2, UserPlus, FileEdit, HelpCircle
} from 'lucide-react';

interface ContractSimulationProps {
  sectorId?: string;
  tabId?: string;
}

export function ContractSimulation({ sectorId = 'measurements', tabId = 'contracts' }: ContractSimulationProps) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // States for typed inputs in different simulations
  const [typedInputs, setTypedInputs] = useState<Record<string, string>>({});

  // Determine active simulation
  let activeSim = 'contracts';
  if (sectorId === 'quotations' && tabId === 'resources') activeSim = 'resources';
  if (sectorId === 'rh' && tabId === 'employees') activeSim = 'employees';
  if (sectorId === 'purchases' && tabId === 'requests') activeSim = 'requests';
  if (sectorId === 'financeiro' && tabId === 'payables') activeSim = 'payables';

  // Define steps configurations
  const simulationsConfig: Record<string, {
    totalSteps: number;
    delays: Record<number, number>;
    labels: string[];
    browserUrl: string;
    pageTitle: string;
  }> = {
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
