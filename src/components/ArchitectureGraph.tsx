import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, HardHat, FileSpreadsheet, 
  Settings, Briefcase, Calculator, Wallet, ArrowRight,
  TrendingUp, FileText, Pickaxe, Map, Layers, RefreshCw,
  Play, Pause, SkipForward, SkipBack, Box, Sparkles, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ArchStep {
  id: number;
  moduleId: string;
  title: string;
  layerName: string;
  badgeColor: string;
  description: string;
  highlights: string[];
}

export function ArchitectureGraph() {
  const [activeModule, setActiveModule] = useState<string | null>('quotations');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [rotateX, setRotateX] = useState<number>(18);
  const [rotateY, setRotateY] = useState<number>(-10);
  
  // Animation Tour State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [animSpeed, setAnimSpeed] = useState<number>(1);

  const modules = [
    {
      id: 'rh',
      icon: Users,
      title: 'RH',
      layer: 1,
      color: 'bg-indigo-600 text-white',
      glowColor: 'rgba(99, 102, 241, 0.4)',
      desc: 'Gestão de Colaboradores e Histórico de Pagamentos',
      connectsTo: ['quotations', 'control'],
      connectionDesc: 'Alimenta Insumos de Mão de Obra e aponta presenças em Diários de Obra'
    },
    {
      id: 'control',
      icon: HardHat,
      title: 'Controlador',
      layer: 1,
      color: 'bg-emerald-600 text-white',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      desc: 'Gestão de Equipamentos e Diários',
      connectsTo: ['quotations', 'measurements'],
      connectionDesc: 'Alimenta custos operacionais e horas trabalhadas para faturamento'
    },
    {
      id: 'purchases',
      icon: Wallet,
      title: 'Compras',
      layer: 1,
      color: 'bg-orange-600 text-white',
      glowColor: 'rgba(249, 115, 22, 0.4)',
      desc: 'Gestão de Pedidos e Almoxarifado',
      connectsTo: ['quotations', 'measurements'],
      connectionDesc: 'Fornece histórico real de preços e controle de estoque'
    },
    {
      id: 'quotations',
      icon: Calculator,
      title: 'Cotações / Custos',
      layer: 2,
      color: 'bg-blue-600 text-white',
      glowColor: 'rgba(37, 99, 235, 0.5)',
      desc: 'Base de Preços e Composições',
      connectsTo: ['tech'],
      connectionDesc: 'Centraliza custos integrados (RH, Compras) e repassa para Sala Técnica'
    },
    {
      id: 'tech',
      icon: Building2,
      title: 'Sala Técnica',
      layer: 2,
      color: 'bg-purple-600 text-white',
      glowColor: 'rgba(147, 51, 234, 0.5)',
      desc: 'Orçamentos e Projetos',
      connectsTo: ['measurements'],
      connectionDesc: 'Gera Planilhas e Curvas ABC e aprova orçamentos para Execução'
    },
    {
      id: 'measurements',
      icon: FileSpreadsheet,
      title: 'Medições',
      layer: 3,
      color: 'bg-teal-600 text-white',
      glowColor: 'rgba(13, 148, 136, 0.5)',
      desc: 'Acompanhamento de Obras',
      connectsTo: ['reports'],
      connectionDesc: 'Consolida executado vs orçado e repassa dados de faturamento'
    }
  ];

  const steps: ArchStep[] = [
    {
      id: 1,
      moduleId: 'rh',
      title: '1. Captação RH: Registro de Folha e Salários',
      layerName: 'Camada Operacional',
      badgeColor: 'bg-indigo-500 text-white',
      description: 'O RH cadastra folha de pagamento e adicionais. O sistema extrai o valor-hora da mão de obra para alimentar os insumos operacionais.',
      highlights: ['rh', 'quotations']
    },
    {
      id: 2,
      moduleId: 'purchases',
      title: '2. Suprimentos: Histórico Real de Compras',
      layerName: 'Camada Operacional',
      badgeColor: 'bg-orange-500 text-white',
      description: 'Compras aprovadas atualizam o histórico de notas fiscais, ajustando o Preço Médio em tempo real.',
      highlights: ['purchases', 'quotations']
    },
    {
      id: 3,
      moduleId: 'control',
      title: '3. Controlador: Frotas e Apontamentos de Obra',
      layerName: 'Camada Operacional',
      badgeColor: 'bg-emerald-500 text-white',
      description: 'Registo de horímetros de máquinas e diários de obra fornecem produtividade e faturamento das medições.',
      highlights: ['control', 'quotations', 'measurements']
    },
    {
      id: 4,
      moduleId: 'quotations',
      title: '4. Central de Cotações & Banco Unificado',
      layerName: 'Camada de Planejamento',
      badgeColor: 'bg-blue-600 text-white',
      description: 'Harmoniza os insumos de todos os setores e recalcula as Composições de Custo Direto (CPU).',
      highlights: ['quotations', 'tech']
    },
    {
      id: 5,
      moduleId: 'tech',
      title: '5. Sala Técnica: Engenharia e Orçamentação',
      layerName: 'Camada de Planejamento',
      description: 'Valida as composições, calcula BDI/Encargos, gera curva ABC e aprova o orçamento oficial.',
      badgeColor: 'bg-purple-600 text-white',
      highlights: ['tech', 'measurements']
    },
    {
      id: 6,
      moduleId: 'measurements',
      title: '6. Medições & Consolidação Financeira',
      layerName: 'Camada de Faturamento',
      description: 'Mede o avanço físico da obra, compara executado vs orçado e consolida o faturamento final.',
      badgeColor: 'bg-teal-600 text-white',
      highlights: ['measurements', 'rh', 'purchases', 'control', 'quotations', 'tech']
    }
  ];

  // Auto animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const duration = 4000 / animSpeed;
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => {
          const next = (prev + 1) % steps.length;
          setActiveModule(steps[next].moduleId);
          return next;
        });
      }, duration);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, animSpeed, steps]);

  const activeStep = steps[currentStepIndex];

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    const next = (currentStepIndex + 1) % steps.length;
    setCurrentStepIndex(next);
    setActiveModule(steps[next].moduleId);
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    const prev = (currentStepIndex - 1 + steps.length) % steps.length;
    setCurrentStepIndex(prev);
    setActiveModule(steps[prev].moduleId);
  };

  const getModuleClasses = (id: string) => {
    const isHighlighted = activeStep?.highlights.includes(id) || activeModule === id;
    if (isHighlighted) return 'opacity-100 ring-4 ring-blue-400/60 shadow-2xl border-blue-400';
    if (activeModule && activeModule !== id) return 'opacity-40 grayscale-[0.3] scale-95 border-slate-800';
    return 'opacity-100 border-slate-700 hover:border-slate-500';
  };

  return (
    <div className="bg-slate-950 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 text-white overflow-hidden relative space-y-6">
      {/* Top Bar Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            Visão Geral da Arquitetura 3D
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Arquitetura de Dados Integrada Synera</h2>
          <p className="text-slate-400 text-xs md:text-sm font-medium">
            Visualize o fluxo completo de dados desde a captação operacional até o faturamento executivo.
          </p>
        </div>

        {/* Animation Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            onClick={handlePlayToggle}
            className={cn(
              "h-11 px-5 rounded-2xl font-black text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer",
              isPlaying
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20"
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Pausar Tour' : 'Dar Play no Tour 3D'}</span>
          </Button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={handlePrevStep}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-mono font-bold text-amber-400">
              {currentStepIndex + 1} / {steps.length}
            </span>
            <button
              onClick={handleNextStep}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => setIs3DMode(!is3DMode)}
            className={cn(
              "h-11 px-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5",
              is3DMode ? "bg-slate-800 text-blue-400 border-blue-500/50" : "bg-slate-900 text-slate-400 border-slate-800"
            )}
          >
            <Box className="w-4 h-4" />
            <span>{is3DMode ? '3D Ativo' : 'Visão Plana'}</span>
          </Button>
        </div>
      </div>

      {/* Step Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep.id}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30 shrink-0 mt-0.5">
              <Zap className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5", activeStep.badgeColor)}>
                  {activeStep.layerName}
                </Badge>
                <h4 className="text-sm font-bold text-white">{activeStep.title}</h4>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {activeStep.description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 3D Visual Stage Grid */}
      <div 
        className="relative transition-transform duration-700 ease-out py-4 min-h-[420px]"
        style={is3DMode ? {
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        } : undefined}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 transition-all duration-700"
          style={is3DMode ? {
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
          } : undefined}
        >
          {/* Layer 1: Operacional / Entrada */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              1. Entrada de Dados Operacionais
            </h3>
            {[modules[0], modules[1], modules[2]].map(m => (
              <motion.div 
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  setIsPlaying(false);
                }}
                whileHover={is3DMode ? { translateZ: 30, scale: 1.02 } : { scale: 1.02 }}
                className={cn("bg-slate-900 border p-5 rounded-2xl cursor-pointer transition-all duration-300 shadow-xl relative backdrop-blur-md", getModuleClasses(m.id))}
                style={is3DMode ? {
                  transform: `translateZ(${activeModule === m.id ? 40 : 15}px)`,
                  boxShadow: activeModule === m.id ? `0 20px 40px ${m.glowColor}` : undefined
                } : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl shadow-md", m.color)}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">{m.title}</h4>
                    <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Layer 2: Inteligência e Custos */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              2. Planejamento & Custos
            </h3>
            {[modules[3], modules[4]].map(m => (
              <motion.div 
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  setIsPlaying(false);
                }}
                whileHover={is3DMode ? { translateZ: 40, scale: 1.02 } : { scale: 1.02 }}
                className={cn("bg-slate-900 border p-5 rounded-2xl cursor-pointer transition-all duration-300 h-full min-h-[140px] flex flex-col justify-center shadow-xl backdrop-blur-md", getModuleClasses(m.id))}
                style={is3DMode ? {
                  transform: `translateZ(${activeModule === m.id ? 45 : 20}px)`,
                  boxShadow: activeModule === m.id ? `0 25px 50px ${m.glowColor}` : undefined
                } : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl shadow-md", m.color)}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">{m.title}</h4>
                    <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Layer 3: Execução e Controle */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              3. Acompanhamento & Medição
            </h3>
            {[modules[5]].map(m => (
              <motion.div 
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  setIsPlaying(false);
                }}
                whileHover={is3DMode ? { translateZ: 35, scale: 1.02 } : { scale: 1.02 }}
                className={cn("bg-slate-900 border p-5 rounded-2xl cursor-pointer transition-all duration-300 h-full min-h-[140px] flex flex-col justify-center shadow-xl backdrop-blur-md", getModuleClasses(m.id))}
                style={is3DMode ? {
                  transform: `translateZ(${activeModule === m.id ? 40 : 15}px)`,
                  boxShadow: activeModule === m.id ? `0 20px 40px ${m.glowColor}` : undefined
                } : undefined}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl shadow-md", m.color)}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">{m.title}</h4>
                    <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Description Drawer */}
      <div className="pt-4 border-t border-slate-800/80">
        <AnimatePresence mode="wait">
          {activeModule ? (
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800"
            >
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <p className="text-sm font-medium text-slate-300">
                <strong className="text-white">{modules.find(m => m.id === activeModule)?.title}:</strong> {modules.find(m => m.id === activeModule)?.connectionDesc}
              </p>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center text-slate-500 text-sm font-medium py-2">
              Clique em qualquer bloco 3D para inspecionar seus relatórios e conexões.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
