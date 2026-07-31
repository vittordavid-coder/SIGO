import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, HardHat, FileSpreadsheet, 
  Settings, Briefcase, Calculator, Wallet, ArrowRight,
  TrendingUp, FileText, Pickaxe, Map, Layers, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

export function ArchitectureGraph() {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const modules = [
    {
      id: 'rh',
      icon: Users,
      title: 'RH',
      color: 'bg-indigo-500 text-white',
      desc: 'Gestão de Colaboradores e Histórico de Pagamentos',
      connectsTo: ['quotations', 'control'],
      connectionDesc: 'Alimenta Insumos de Mão de Obra e aponta presenças em Diários de Obra'
    },
    {
      id: 'control',
      icon: HardHat,
      title: 'Controlador',
      color: 'bg-emerald-500 text-white',
      desc: 'Gestão de Equipamentos e Diários',
      connectsTo: ['quotations', 'measurements'],
      connectionDesc: 'Alimenta custos operacionais e horas trabalhadas para faturamento'
    },
    {
      id: 'purchases',
      icon: Wallet,
      title: 'Compras',
      color: 'bg-orange-500 text-white',
      desc: 'Gestão de Pedidos e Almoxarifado',
      connectsTo: ['quotations', 'measurements'],
      connectionDesc: 'Fornece histórico real de preços e controle de estoque'
    },
    {
      id: 'quotations',
      icon: Calculator,
      title: 'Cotações / Custos',
      color: 'bg-blue-600 text-white',
      desc: 'Base de Preços e Composições',
      connectsTo: ['tech'],
      connectionDesc: 'Centraliza custos integrados (RH, Compras) e repassa para Sala Técnica'
    },
    {
      id: 'tech',
      icon: Building2,
      title: 'Sala Técnica',
      color: 'bg-purple-600 text-white',
      desc: 'Orçamentos e Projetos',
      connectsTo: ['measurements'],
      connectionDesc: 'Gera Planilhas e Curvas ABC e aprova orçamentos para Execução'
    },
    {
      id: 'measurements',
      icon: FileSpreadsheet,
      title: 'Medições',
      color: 'bg-teal-600 text-white',
      desc: 'Acompanhamento de Obras',
      connectsTo: ['reports'],
      connectionDesc: 'Consolida executado vs orçado e repassa dados de faturamento'
    }
  ];

  const getModuleClasses = (id: string) => {
    if (!activeModule) return 'opacity-100 scale-100';
    if (activeModule === id) return 'opacity-100 scale-105 shadow-xl ring-2 ring-blue-400';
    
    const activeData = modules.find(m => m.id === activeModule);
    if (activeData?.connectsTo.includes(id)) return 'opacity-100 scale-100 ring-2 ring-emerald-400/50';
    
    // Check if this module connects to the active one
    const connectsToActive = modules.find(m => m.id === id)?.connectsTo.includes(activeModule);
    if (connectsToActive) return 'opacity-100 scale-100 ring-2 ring-orange-400/50';

    return 'opacity-40 grayscale-[0.5] scale-95';
  };

  return (
    <div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 text-white overflow-hidden relative mb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
          <Layers className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Arquitetura de Dados Integrada</h2>
          <p className="text-slate-400 text-sm">Passe o mouse ou clique nos módulos para visualizar como a informação flui no sistema Synera.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Layer 1: Operacional / Entrada */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center mb-6">1. Captação de Dados</h3>
          {[modules[0], modules[1], modules[2]].map(m => (
            <div 
              key={m.id}
              className={cn("bg-slate-800 border border-slate-700 p-5 rounded-2xl cursor-pointer transition-all duration-300", getModuleClasses(m.id))}
              onMouseEnter={() => setActiveModule(m.id)}
              onMouseLeave={() => setActiveModule(null)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", m.color)}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{m.title}</h4>
                  <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Layer 2: Inteligência e Custos */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center mb-6">2. Planejamento & Custos</h3>
          {[modules[3], modules[4]].map(m => (
            <div 
              key={m.id}
              className={cn("bg-slate-800 border border-slate-700 p-5 rounded-2xl cursor-pointer transition-all duration-300 h-full min-h-[140px] flex flex-col justify-center", getModuleClasses(m.id))}
              onMouseEnter={() => setActiveModule(m.id)}
              onMouseLeave={() => setActiveModule(null)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", m.color)}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{m.title}</h4>
                  <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Layer 3: Execução e Controle */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center mb-6">3. Acompanhamento</h3>
          {[modules[5]].map(m => (
            <div 
              key={m.id}
              className={cn("bg-slate-800 border border-slate-700 p-5 rounded-2xl cursor-pointer transition-all duration-300 h-full min-h-[140px] flex flex-col justify-center", getModuleClasses(m.id))}
              onMouseEnter={() => setActiveModule(m.id)}
              onMouseLeave={() => setActiveModule(null)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", m.color)}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{m.title}</h4>
                  <p className="text-xs text-slate-400 leading-tight mt-1">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800/60 min-h-[80px]">
        <AnimatePresence mode="wait">
          {activeModule ? (
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"
            >
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <p className="text-sm font-medium text-slate-300">
                <strong className="text-white">{modules.find(m => m.id === activeModule)?.title}:</strong> {modules.find(m => m.id === activeModule)?.connectionDesc}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full text-slate-500 text-sm font-medium"
            >
              Interaja com o diagrama acima para ver os detalhes da integração.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
