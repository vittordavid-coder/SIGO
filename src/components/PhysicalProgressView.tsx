import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Play, Pause, Activity, TrendingUp, 
  CheckCircle2, Clock, AlertCircle, ListTodo, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Contract, ServiceComposition, TechnicalSchedule } from '../types';

interface PhysicalProgressViewProps {
  contract: Contract;
  services: ServiceComposition[];
  technicalSchedules: TechnicalSchedule[];
}

export function PhysicalProgressView({ contract, services, technicalSchedules }: PhysicalProgressViewProps) {
  // Find schedule linked to this contract
  const schedule = useMemo(() => {
    return technicalSchedules.find(s => s.contractId === contract.id);
  }, [technicalSchedules, contract.id]);

  // Total duration defined in the schedule
  const duration = useMemo(() => {
    if (schedule && schedule.duration) {
      return schedule.duration;
    }
    return 0; // 0 means no active schedule
  }, [schedule]);

  const [currentPeriod, setCurrentPeriod] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Auto-play timer when playing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && duration > 0) {
      timer = setInterval(() => {
        setCurrentPeriod(prev => {
          if (prev >= duration - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  // Reset period when schedule or contract changes
  useEffect(() => {
    setCurrentPeriod(0);
    setIsPlaying(false);
  }, [contract.id, schedule]);

  // Extract groups exactly how it's done in TechnicalRoomExtensions.tsx
  const groupsToRender = useMemo(() => {
    const groups = [...(contract.groups || [])];
    const directServices = (contract.services || []).filter(item => item && item.serviceId);
    
    if (directServices.length > 0) {
      groups.push({
        id: 'standalone',
        name: 'Serviços Gerais',
        services: directServices
      });
    }
    
    return groups.filter(g => g.services.length > 0);
  }, [contract.groups, contract.services]);

  // Construct precise accumulated data directly from the schedule, month by month, grouped by physical groups
  const timelineData = useMemo(() => {
    if (!schedule || !schedule.services || schedule.services.length === 0 || duration === 0) {
      return [];
    }

    const data: {
      periodName: string;
      overallPlanned: number;
      overallActual: number;
      groupsList: {
        groupId: string;
        name: string;
        planned: number; 
        actual: number;  
        plannedVal: number;
        actualVal: number;
        totalVal: number;
        plannedQty: number;
        actualQty: number;
        totalQty: number;
      }[];
    }[] = [];

    for (let i = 0; i < duration; i++) {
      const monthNum = i + 1;
      const periodName = `Mês ${monthNum.toString().padStart(2, '0')}`;

      let globalTotalValSum = 0;
      let globalCumulativePlanVal = 0;
      let globalCumulativeActVal = 0;

      let globalTotalQtySum = 0;
      let globalCumulativePlanQty = 0;
      let globalCumulativeActQty = 0;

      const groupsList = groupsToRender.map(group => {
        let groupTotalVal = 0;
        let groupPlannedVal = 0;
        let groupActualVal = 0;

        let groupTotalQty = 0;
        let groupPlannedQty = 0;
        let groupActualQty = 0;

        group.services.forEach(gSvc => {
          const sSched = schedule.services.find(s => s.serviceId === gSvc.serviceId);
          if (!sSched) return;

          sSched.distribution.forEach(dist => {
            groupTotalVal += dist.plannedValue || 0;
            groupTotalQty += dist.plannedQty || 0;

            if (dist.periodIndex <= i) {
              groupPlannedVal += dist.plannedValue || 0;
              groupActualVal += dist.actualValue || 0;
              groupPlannedQty += dist.plannedQty || 0;
              groupActualQty += dist.actualQty || 0;
            }
          });
        });

        // Add to global totals for weighting
        globalTotalValSum += groupTotalVal;
        globalCumulativePlanVal += groupPlannedVal;
        globalCumulativeActVal += groupActualVal;

        globalTotalQtySum += groupTotalQty;
        globalCumulativePlanQty += groupPlannedQty;
        globalCumulativeActQty += groupActualQty;

        // Calculate progress up to period i
        let plannedPercent = 0;
        let actualPercent = 0;

        if (groupTotalVal > 0) {
          plannedPercent = Math.min(100, Math.round((groupPlannedVal / groupTotalVal) * 100));
          actualPercent = Math.min(100, Math.round((groupActualVal / groupTotalVal) * 100));
        } else if (groupTotalQty > 0) {
          plannedPercent = Math.min(100, Math.round((groupPlannedQty / groupTotalQty) * 100));
          actualPercent = Math.min(100, Math.round((groupActualQty / groupTotalQty) * 100));
        }

        return {
          groupId: group.id,
          name: group.name,
          planned: plannedPercent,
          actual: actualPercent,
          plannedVal: groupPlannedVal,
          actualVal: groupActualVal,
          totalVal: groupTotalVal,
          plannedQty: groupPlannedQty,
          actualQty: groupActualQty,
          totalQty: groupTotalQty,
        };
      });

      // Calculate weight-based overall progress
      let overallPlanned = 0;
      let overallActual = 0;

      if (globalTotalValSum > 0) {
        overallPlanned = Math.min(100, Math.round((globalCumulativePlanVal / globalTotalValSum) * 100));
        overallActual = Math.min(100, Math.round((globalCumulativeActVal / globalTotalValSum) * 100));
      } else if (globalTotalQtySum > 0) {
        overallPlanned = Math.min(100, Math.round((globalCumulativePlanQty / globalTotalQtySum) * 100));
        overallActual = Math.min(100, Math.round((globalCumulativeActQty / globalTotalQtySum) * 100));
      } else if (groupsList.length > 0) {
        const sumPlan = groupsList.reduce((sum, g) => sum + g.planned, 0);
        const sumAct = groupsList.reduce((sum, g) => sum + g.actual, 0);
        overallPlanned = Math.min(100, Math.round(sumPlan / groupsList.length));
        overallActual = Math.min(100, Math.round(sumAct / groupsList.length));
      }

      data.push({
        periodName,
        overallPlanned,
        overallActual,
        groupsList
      });
    }

    return data;
  }, [duration, groupsToRender, schedule]);

  // Render empty state if there's no schedule defined
  if (!schedule || timelineData.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto" id="physical-progress-empty-state">
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Sem Cronograma Físico</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider max-w-md mx-auto leading-relaxed">
              Não existe um cronograma técnico ativo estruturado para o Contrato {contract.contractNumber}.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto pt-2">
              Para visualizar a curva S e a evolução física real de cada grupo, cadastre o cronograma técnico com a distribuição de metas e valores na aba <strong>Cronograma</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activePeriodData = timelineData[currentPeriod] || { periodName: `Mês ${currentPeriod + 1}`, overallPlanned: 0, overallActual: 0, groupsList: [] };

  // Calculate status metric based on actual vs planned physical variance
  const variance = activePeriodData.overallActual - activePeriodData.overallPlanned;
  
  const statusInfo = (() => {
    if (variance >= 2) {
      return {
        label: 'Avançado',
        color: 'text-green-600 bg-green-50 border-green-100',
        textColor: 'text-green-600',
        barColor: 'bg-green-500',
        icon: CheckCircle2,
        desc: 'O progresso físico acumulado está acima da meta estabelecida no cronograma!'
      };
    } else if (variance < -4) {
      return {
        label: 'Atrasado',
        color: 'text-red-600 bg-red-50 border-red-100',
        textColor: 'text-red-600',
        barColor: 'bg-red-500',
        icon: ShieldAlert,
        desc: 'Atenção! O avanço físico real está abaixo das metas físicas pactuadas no cronograma.'
      };
    } else {
      return {
        label: 'No Cronograma',
        color: 'text-blue-600 bg-blue-50 border-blue-100',
        textColor: 'text-blue-600',
        barColor: 'bg-blue-600',
        icon: Clock,
        desc: 'Andamento das obras perfeitamente alinhado com o cronograma de produção física.'
      };
    }
  })();

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto rounded-3xl" id="physical-progress-container">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Avanço Físico do Cronograma</h3>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Evolução das Metas x Executado real por Grupo de Serviços — {contract.contractNumber}
          </p>
        </div>
        
        {/* Play/Slide controllers */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPeriod === 0}
            onClick={() => { setIsPlaying(false); setCurrentPeriod(prev => prev - 1); }}
            className="h-11 w-11 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`h-11 px-5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-50' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-50'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                Pausar Auto
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Play Avanço
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={currentPeriod === duration - 1}
            onClick={() => { setIsPlaying(false); setCurrentPeriod(prev => prev + 1); }}
            className="h-11 w-11 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Visual Timeline Stepper Bar */}
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Metas por Período</span>
          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
            {activePeriodData.periodName} de {duration} Meses
          </span>
        </div>

        {/* Dynamic Stepper Bar */}
        <div className="relative flex items-center justify-between gap-1 mt-4 overflow-x-auto py-2">
          {/* Progress Connecting Line */}
          <div className="absolute left-0 right-0 h-1 bg-gray-100 top-1/2 -translate-y-1/2 z-0 min-w-[300px]" />
          <div 
            className="absolute left-0 h-1 bg-blue-500 top-1/2 -translate-y-1/2 transition-all duration-300 z-0"
            style={{ width: `${(currentPeriod / (duration - 1)) * 100}%` }}
          />

          {timelineData.map((term, index) => {
            const isCompleted = index <= currentPeriod;
            const isCurrent = index === currentPeriod;
            return (
              <button
                key={index}
                onClick={() => { setIsPlaying(false); setCurrentPeriod(index); }}
                className="relative z-10 flex flex-col items-center group focus:outline-none flex-shrink-0"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-blue-600 border-blue-600 text-white scale-125 shadow-lg shadow-blue-100' 
                    : isCompleted 
                      ? 'bg-blue-50 border-blue-500 text-blue-600 hover:bg-blue-100' 
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter mt-1 hover:text-blue-600 transition-colors ${
                  isCurrent ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  Mês {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stats and Progress Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Stats card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-black uppercase text-gray-400 tracking-wider block">Progresso Geral Acumulado</span>
              
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-extrabold tracking-tight font-sans text-gray-900 block animate-fade-in">
                  {activePeriodData.overallActual}%
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase leading-none">
                  Físico Realizado <br/> Acumulado
                </span>
              </div>

              {/* Progress comparison visual block */}
              <div className="space-y-4 mt-4 bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase">Realizado Acumulado</span>
                    <span className="font-bold text-blue-600">{activePeriodData.overallActual}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${statusInfo.barColor}`} style={{ width: `${activePeriodData.overallActual}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase">Planejado Acumulado</span>
                    <span className="font-bold text-gray-600">{activePeriodData.overallPlanned}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 transition-all duration-500" style={{ width: `${activePeriodData.overallPlanned}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Info box */}
            <div className={`p-4 border rounded-xl space-y-2 ${statusInfo.color}`}>
              <div className="flex items-center gap-2">
                <statusInfo.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-extrabold text-sm uppercase tracking-wider">{statusInfo.label}</span>
              </div>
              <p className="text-xs leading-relaxed font-bold">{statusInfo.desc}</p>
            </div>
          </div>
        </div>

        {/* Right Details cards per scheduled group */}
        <div className="lg:col-span-2 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-500" />
              <h4 className="font-black text-base text-gray-800 uppercase tracking-tight">Grupos Ativos do Cronograma</h4>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded">
              {activePeriodData.periodName}
            </span>
          </div>

          <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
            {activePeriodData.groupsList.map((item) => {
              return (
                <div key={item.groupId} className="space-y-2 group transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                        GRUPO
                      </span>
                      <h5 className="font-black text-sm uppercase text-gray-700 tracking-tight leading-tight">
                        {item.name}
                      </h5>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-right flex-shrink-0">
                      <div>
                        <span className="text-gray-400 font-bold block text-[9px] uppercase">META ACUM.</span>
                        <span className="text-gray-600 font-bold">{item.planned}%</span>
                      </div>
                      <div className="border-l border-gray-100 pl-3">
                        <span className="text-gray-400 font-bold block text-[9px] uppercase">REAL ACUM.</span>
                        <span className="text-blue-600 font-bold">{item.actual}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Bar Graphic representation */}
                  <div className="relative bg-gray-50/50 p-3 rounded-xl border border-gray-50 flex flex-col gap-2">
                    {/* Planejado Bar (meta) */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-gray-300 transition-all duration-500 rounded-full" 
                        style={{ width: `${item.planned}%` }}
                      />
                      <div className="absolute right-2 top-0 text-[7px] font-black uppercase text-gray-400 select-none">Meta</div>
                    </div>

                    {/* Realizado Bar */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full relative overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500 rounded-full shadow-inner" 
                        style={{ width: `${item.actual}%` }}
                      />
                      <div className="absolute right-2 top-0 text-[7px] font-black uppercase text-blue-400 select-none">Real</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* S-Curve Area Plot of progress */}
      <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h4 className="font-black text-base text-gray-800 uppercase tracking-tight">Curva-S de Progresso Acumulado</h4>
          </div>
          
          <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="w-3 h-1 bg-gray-300 rounded-sm inline-block" />
              <span>Planejado</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-1 bg-blue-500 rounded-sm inline-block" />
              <span>Realizado</span>
            </div>
          </div>
        </div>

        {/* Custom SVG Line graph */}
        <div className="w-full h-44 relative bg-gray-50/40 border border-gray-50 rounded-xl overflow-hidden p-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 120" preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            <line x1="0" y1="30" x2="600" y2="30" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="60" x2="600" y2="60" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="90" x2="600" y2="90" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3" />

            {/* Curva-S Planejado path generator */}
            {(() => {
              const points = timelineData.map((d, index) => {
                const x = (index / (duration - 1)) * 600;
                const y = 110 - (d.overallPlanned / 100) * 100;
                return `${x},${y}`;
              }).join(' ');
              return <polyline fill="none" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="4,3" points={points} />;
            })()}

            {/* Curva-S Realizado path generator */}
            {(() => {
              const points = timelineData.map((d, index) => {
                const x = (index / (duration - 1)) * 600;
                const y = 110 - (d.overallActual / 100) * 100;
                return `${x},${y}`;
              }).join(' ');
              return <polyline fill="none" stroke="#2563eb" strokeWidth="4" points={points} />;
            })()}

            {/* Active Point Vertical Line and Dot Indicators */}
            {(() => {
              const activeNode = timelineData[currentPeriod];
              if (!activeNode) return null;
              const xCoord = (currentPeriod / (duration - 1)) * 600;
              const yCoord = 110 - (activeNode.overallActual / 100) * 100;
              const yPlanCoord = 110 - (activeNode.overallPlanned / 100) * 100;
              return (
                <>
                  <line x1={xCoord} y1="0" x2={xCoord} y2="120" stroke="#dbeafe" strokeWidth="2" strokeDasharray="4,4" />
                  <circle cx={xCoord} cy={yPlanCoord} r="4.5" className="fill-gray-400 stroke-white" strokeWidth="1.5" />
                  <circle cx={xCoord} cy={yCoord} r="7.5" className="fill-blue-600 stroke-white" strokeWidth="2" />
                </>
              );
            })()}
          </svg>

          {/* Month labels under chart */}
          <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[9px] font-mono font-black uppercase text-gray-400 pointer-events-none">
            {timelineData.map((d, idx) => (
              <span key={idx} className={idx === currentPeriod ? 'text-blue-600 font-bold' : ''}>
                M{idx + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
