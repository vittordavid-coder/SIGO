import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, HardHat, ChevronRight, ChevronLeft, Zap, ShieldCheck, Database, Layers, Info } from 'lucide-react';
import { Button } from './ui/button';

interface ActiveSyncLoaderProps {
  progress: { percent: number; stepName: string };
  onBypass: () => void;
  customTips?: { title: string; text: string; tag: string; iconName: string }[];
}

const DEFAULT_TRIVIA_TIPS = [
  {
    title: "Apontamentos de Campo & Estacas",
    text: "Registros vinculados ao alinhamento de estacas e coordenadas GPS aceleram a aprovação e pagamento de medições.",
    tag: "Campo & Sala Técnica",
    iconName: "HardHat"
  },
  {
    title: "Relatório Diário de Obra (RDO)",
    text: "O RDO sincroniza automaticamente com a equipe de engenharia para agilizar boletins e evitar atrasos contratuais.",
    tag: "Produtividade",
    iconName: "Layers"
  },
  {
    title: "Synera Cam Off-line",
    text: "Fotografe e registre no Synera Cam mesmo em áreas sem sinal de internet. Os dados sobem assim que houver rede.",
    tag: "Mobile Off-line",
    iconName: "Zap"
  },
  {
    title: "Sincronização em Nuvem Segura",
    text: "Seus dados de contratos, memórias de cálculo e insumos ficam protegidos com criptografia de ponta a ponta.",
    tag: "Segurança de Dados",
    iconName: "ShieldCheck"
  },
  {
    title: "Integração do Banco de Dados",
    text: "Sua equipe na Sala Técnica visualiza os apontamentos em tempo real assim que o fiscal envia os registros do campo.",
    tag: "Nuvem Synera",
    iconName: "Database"
  }
];

const ICONS_MAP: Record<string, any> = {
  HardHat, Layers, Zap, ShieldCheck, Database, Info
};

export function ActiveSyncLoader({ progress, onBypass, customTips }: ActiveSyncLoaderProps) {
  const [triviaIndex, setTriviaIndex] = useState(0);
  
  const activeTips = (customTips && customTips.length > 0) ? customTips : DEFAULT_TRIVIA_TIPS;

  useEffect(() => {
    const timer = setInterval(() => {
      setTriviaIndex((prev) => (prev + 1) % activeTips.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [activeTips.length]);

  const currentTip = activeTips[triviaIndex] || activeTips[0];
  const IconComponent = ICONS_MAP[currentTip.iconName] || Info;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/70 via-slate-50 to-blue-50 text-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background grid and ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-2xl shadow-blue-500/10 relative z-10 flex flex-col items-center gap-6"
      >
        {/* Header Icon + Brand */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
              <Database className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full ring-4 ring-white shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-2">
            SYNERA <span className="text-blue-600 font-normal text-lg">| Sync Engine</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-widest font-medium">
            Sincronização Ativa em Tempo Real
          </p>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="w-full space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-700 flex items-center gap-1.5 truncate max-w-[280px]">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
              <span className="truncate">{progress.stepName || 'Sincronizando dados...'}</span>
            </span>
            <span className="text-blue-600 font-mono text-sm shrink-0 font-bold">{Math.min(100, Math.max(5, progress.percent))}%</span>
          </div>
          
          <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: `${Math.min(100, Math.max(5, progress.percent))}%` }}
              transition={{ ease: "easeOut", duration: 0.5 }}
            />
          </div>
        </div>

        {/* Trivia / Tips Carousel */}
        <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3 min-h-[120px] justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200/80 font-medium flex items-center gap-1">
              <IconComponent className="w-3.5 h-3.5 text-blue-600" />
              {currentTip.tag}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Dica {triviaIndex + 1}/{activeTips.length}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={triviaIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-1"
            >
              <h4 className="text-sm font-bold text-slate-800">{currentTip.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{currentTip.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center pt-2 border-t border-blue-100">
            <div className="flex gap-1">
              {activeTips.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTriviaIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === triviaIndex ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-1">
              <button 
                onClick={() => setTriviaIndex((prev) => (prev - 1 + activeTips.length) % activeTips.length)}
                className="p-1 hover:bg-white/80 text-slate-400 hover:text-slate-800 rounded-lg transition border border-transparent hover:border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTriviaIndex((prev) => (prev + 1) % activeTips.length)}
                className="p-1 hover:bg-white/80 text-slate-400 hover:text-slate-800 rounded-lg transition border border-transparent hover:border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Fast Bypass Action */}
        <Button 
          variant="outline" 
          onClick={onBypass}
          className="w-full bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs h-10 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          Acessar Sistema Agora com Dados Locais
        </Button>
      </motion.div>
    </div>
  );
}
