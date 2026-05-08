import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, FileSpreadsheet, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ServiceComposition, Resource, Quotation, Schedule, TimeUnit, BudgetGroup } from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { useLocalStorage } from '../lib/useLocalStorage';
import { exportScheduleToExcel, exportScheduleToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ScheduleViewProps {
  key?: string;
  services: ServiceComposition[];
  resources: Resource[];
  quotations: Quotation[];
  schedules: Schedule[];
  setSchedules: (schedules: Schedule[]) => void;
  budgetItems: {serviceId: string, quantity: number}[];
  budgetGroups: BudgetGroup[];
  readonly?: boolean;
}

// optimized sub-components for better performance
const ScheduleServiceRow = React.memo(({ 
  item, 
  service, 
  viewMode, 
  periods, 
  currentSchedule, 
  unitCost, 
  getPeriodValue, 
  handleValueChange, 
  readonly 
}: {
  item: { serviceId: string; quantity: number };
  service: ServiceComposition | undefined;
  viewMode: 'qty' | 'val' | 'perc' | 'all';
  periods: number[];
  currentSchedule: Schedule;
  unitCost: number;
  getPeriodValue: (serviceId: string, periodIndex: number) => number;
  handleValueChange: (serviceId: string, periodIndex: number, value: number) => void;
  readonly: boolean | undefined;
}) => {
  if (!service) return null;
  
  const isPercentage = currentSchedule.distributionType === 'percentage';
  const totalDist = periods.reduce((acc, p) => acc + getPeriodValue(item.serviceId, p), 0);
  const balance = isPercentage ? 100 - totalDist : item.quantity - totalDist;
  
  let currentCumulative = 0;
  const limit = isPercentage ? 100 : item.quantity;

  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[150px] min-w-[150px] max-w-[150px] py-1 px-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-blue-600 leading-none">{service.code}</span>
          <span className="text-[10px] font-semibold whitespace-normal leading-tight text-gray-800 line-clamp-2">{service.name}</span>
          <span className="text-[8px] text-gray-400 leading-none">{service.unit}</span>
        </div>
      </TableCell>
      <TableCell className="text-right text-[10px] font-mono p-2">
        <div className="flex flex-col gap-0.5">
          {(viewMode === 'qty' || viewMode === 'all') && (
            <div className="font-bold text-gray-600">
              {isPercentage ? '100%' : formatNumber(item.quantity, 3)}
            </div>
          )}
          {(viewMode === 'val' || viewMode === 'all') && (
            <div className="text-blue-900 font-bold">
              {formatCurrency(item.quantity * unitCost)}
            </div>
          )}
          {(viewMode === 'perc' || viewMode === 'all') && (
            <div className="text-gray-400">100%</div>
          )}
        </div>
      </TableCell>
      {periods.map(p => {
        const periodQty = getPeriodValue(item.serviceId, p);
        currentCumulative += periodQty;
        const isOverLimit = currentCumulative > limit + 0.0001;
        const periodFinancial = isPercentage ? (periodQty / 100 * item.quantity * unitCost) : (periodQty * unitCost);

        return (
          <TableCell key={p} className={cn("p-1 border-l transition-colors", isOverLimit && "bg-red-50")}>
            <div className="flex flex-col gap-0.5">
              {(viewMode === 'qty' || viewMode === 'all') && (
                <Input 
                  type="number"
                  step="0.001"
                  className={cn(
                    "h-7 text-right text-[10px] font-mono border-none focus:ring-1 focus:ring-blue-500 bg-transparent px-1",
                    isOverLimit && "text-red-600 font-bold"
                  )}
                  defaultValue={periodQty || ''}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const num = val === '' ? 0 : parseFloat(val);
                    if (num !== periodQty) {
                      handleValueChange(item.serviceId, p, num);
                    }
                  }}
                  placeholder="0"
                  readOnly={readonly}
                />
              )}
              {(viewMode === 'val' || viewMode === 'all') && periodFinancial > 0 && (
                <div className={cn(
                  "text-[9px] font-mono text-right pr-1",
                  (viewMode === 'all') ? "text-blue-600 font-medium" : "text-gray-900 text-[10px] font-bold"
                )}>
                  {formatCurrency(periodFinancial)}
                </div>
              )}
              {(viewMode === 'perc' || viewMode === 'all') && (
                <div className="text-[8px] font-mono text-right text-gray-400 pr-1">
                  {formatNumber(isPercentage ? periodQty : (periodQty / item.quantity * 100), 1)}%
                </div>
              )}
            </div>
          </TableCell>
        );
      })}
      <TableCell className={cn(
        "text-right text-[10px] font-mono font-bold border-l bg-blue-50/30",
        Math.abs(balance) < 0.01 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-blue-600"
      )}>
         <div className="flex flex-col gap-0.5">
           {(viewMode === 'qty' || viewMode === 'all') && (
             <div>{isPercentage ? `${formatNumber(totalDist, 2)}%` : formatNumber(totalDist, 3)}</div>
           )}
           {(viewMode === 'val' || viewMode === 'all') && (
             <div>{formatCurrency(isPercentage ? (totalDist/100 * item.quantity * unitCost) : (totalDist * unitCost))}</div>
           )}
           {(viewMode === 'perc' || viewMode === 'all') && (
             <div className="text-gray-400">{formatNumber(isPercentage ? totalDist : (totalDist/item.quantity*100), 1)}%</div>
           )}
         </div>
      </TableCell>
      <TableCell className={cn(
        "text-right text-[10px] font-mono border-l",
        Math.abs(balance) < 0.01 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-gray-500"
      )}>
        <div className="flex flex-col gap-0.5">
           {(viewMode === 'qty' || viewMode === 'all') && (
             <div>{isPercentage ? `${formatNumber(balance, 2)}%` : formatNumber(balance, 3)}</div>
           )}
           {(viewMode === 'val' || viewMode === 'all') && (
             <div>{formatCurrency(isPercentage ? (balance/100 * item.quantity * unitCost) : (balance * unitCost))}</div>
           )}
           {(viewMode === 'perc' || viewMode === 'all') && (
             <div className="text-gray-400">{formatNumber(isPercentage ? balance : (balance/item.quantity*100), 1)}%</div>
           )}
         </div>
      </TableCell>
    </TableRow>
  );
});

export function ScheduleView({ services, resources, quotations, schedules, setSchedules, budgetItems, budgetGroups, readonly }: ScheduleViewProps) {
  const isCurrentPopulated = budgetItems.length > 0 || budgetGroups.length > 0;
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(isCurrentPopulated ? 'current' : (quotations[0]?.id || ''));
  const [viewMode, setViewMode] = useState<'qty' | 'val' | 'perc' | 'all'>('qty');
  const [hasChanges, setHasChanges] = useState(false);

  // Drafts in LocalStorage to keep work in progress
  const [draftSchedule, setDraftSchedule] = useLocalStorage<Schedule | null>(`sigo_schedule_draft_${selectedQuotationId}`, null);
  
  // Local schedule state for active editing
  const [localSchedule, setLocalSchedule] = useState<Schedule>(() => {
    // Try to recover from draft first
    const savedDraft = window.localStorage.getItem(`sigo_schedule_draft_${selectedQuotationId}`);
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error("Error parsing schedule draft", e);
      }
    }

    // Otherwise use prop data or default
    return schedules.find(s => s.quotationId === selectedQuotationId) || {
      id: uuidv4(),
      quotationId: selectedQuotationId,
      startDate: new Date().toISOString().split('T')[0],
      duration: 6,
      timeUnit: 'months' as TimeUnit,
      distributionType: 'percentage' as const,
      services: []
    };
  });

  // Sync with prop only if we don't have unsaved local changes and quotation ID changes
  React.useEffect(() => {
    const savedDraft = window.localStorage.getItem(`sigo_schedule_draft_${selectedQuotationId}`);
    if (!savedDraft) {
      const scheduleFromProps = schedules.find(s => s.quotationId === selectedQuotationId);
      if (scheduleFromProps) {
        setLocalSchedule(scheduleFromProps);
        setHasChanges(false);
      } else {
        setLocalSchedule({
          id: uuidv4(),
          quotationId: selectedQuotationId,
          startDate: new Date().toISOString().split('T')[0],
          duration: 6,
          timeUnit: 'months' as TimeUnit,
          distributionType: 'percentage' as const,
          services: []
        });
        setHasChanges(false);
      }
    } else {
      setHasChanges(true);
    }
  }, [selectedQuotationId, schedules]);

  const activeQuotation = selectedQuotationId === 'current' 
    ? { id: 'current', budgetName: 'Planilha Atual', services: budgetItems, groups: budgetGroups }
    : quotations.find(q => q.id === selectedQuotationId);

  const groupsToRender = React.useMemo(() => [
    ...(activeQuotation?.groups || []),
    ...(activeQuotation?.services && activeQuotation.services.length > 0 
      ? [{ id: 'standalone', name: 'Serviços Gerais', services: activeQuotation.services }] 
      : [])
  ], [activeQuotation]);

  const activeItems = React.useMemo(() => groupsToRender.flatMap(g => g.services), [groupsToRender]);

  const currentSchedule = localSchedule;

  // Optimized lookups and calculations
  const serviceUnitCosts = React.useMemo(() => {
    const costMap: Record<string, number> = {};
    activeItems.forEach(item => {
      const s = services.find(serv => serv.id === item.serviceId);
      if (s) {
        costMap[item.serviceId] = calculateServiceUnitCost(s, resources, services);
      }
    });
    return costMap;
  }, [activeItems, services, resources]);

  const serviceLookup = React.useMemo(() => {
    const sMap: Record<string, ServiceComposition> = {};
    services.forEach(s => { sMap[s.id] = s; });
    return sMap;
  }, [services]);

  const scheduleDataLookup = React.useMemo(() => {
    const lookup: Record<string, Record<number, number>> = {};
    currentSchedule.services.forEach(s => {
      lookup[s.serviceId] = {};
      s.distribution.forEach(d => {
        lookup[s.serviceId][d.periodIndex] = d.value;
      });
    });
    return lookup;
  }, [currentSchedule.services]);

  const serviceTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    currentSchedule.services.forEach(s => {
      totals[s.serviceId] = s.distribution.reduce((acc, p) => acc + p.value, 0);
    });
    return totals;
  }, [currentSchedule.services]);

  const periodFinancialTotals = React.useMemo(() => {
    const totals: number[] = Array(currentSchedule.duration).fill(0);
    const isPercentage = currentSchedule.distributionType === 'percentage';

    activeItems.forEach(item => {
      const unitCost = Number(serviceUnitCosts[item.serviceId] || 0);
      const dist = scheduleDataLookup[item.serviceId] || {};
      const itemQty = Number(item.quantity || 0);
      
      Object.entries(dist).forEach(([pIdx, val]) => {
        const p = parseInt(pIdx);
        const value = Number(val || 0);
        if (p < currentSchedule.duration) {
          if (isPercentage) {
            totals[p] += (value / 100) * itemQty * unitCost;
          } else {
            totals[p] += value * unitCost;
          }
        }
      });
    });
    return totals;
  }, [currentSchedule.duration, currentSchedule.distributionType, activeItems, serviceUnitCosts, scheduleDataLookup]);

  const groupFinancialTotals = React.useMemo(() => {
    const totals: Record<string, number[]> = {};
    const isPercentage = currentSchedule.distributionType === 'percentage';

    groupsToRender.forEach(group => {
      const gTotals = Array(currentSchedule.duration).fill(0);
      group.services.forEach(item => {
        const unitCost = Number(serviceUnitCosts[item.serviceId] || 0);
        const dist = scheduleDataLookup[item.serviceId] || {};
        const itemQty = Number(item.quantity || 0);

        Object.entries(dist).forEach(([pIdx, val]) => {
          const p = parseInt(pIdx);
          const value = Number(val || 0);
          if (p < currentSchedule.duration) {
            if (isPercentage) {
              gTotals[p] += (value / 100) * itemQty * unitCost;
            } else {
              gTotals[p] += value * unitCost;
            }
          }
        });
      });
      totals[group.id] = gTotals;
    });
    return totals;
  }, [groupsToRender, currentSchedule.duration, currentSchedule.distributionType, serviceUnitCosts, scheduleDataLookup]);

  const updateSchedule = React.useCallback((updates: Partial<Schedule>) => {
    setLocalSchedule(prev => {
      const newSchedule = { ...prev, ...updates };
      setDraftSchedule(newSchedule);
      return newSchedule;
    });
    setHasChanges(true);
  }, [setDraftSchedule]);

  const handleSave = () => {
    const exists = schedules.some(s => s.quotationId === selectedQuotationId);
    const updatedSchedules = exists 
      ? schedules.map(s => s.quotationId === selectedQuotationId ? currentSchedule : s)
      : [...schedules, currentSchedule];
    
    setSchedules(updatedSchedules);
    setHasChanges(false);
    // Clear draft after successful save
    window.localStorage.removeItem(`sigo_schedule_draft_${selectedQuotationId}`);
    alert('Cronograma salvo com sucesso!');
  };

  const handleTimeUnitChange = (newUnit: TimeUnit) => {
    const oldUnit = currentSchedule.timeUnit;
    if (oldUnit === newUnit) return;

    let factor = 1;
    if (oldUnit === 'months' && newUnit === 'weeks') factor = 4;
    else if (oldUnit === 'months' && newUnit === 'days') factor = 30;
    else if (oldUnit === 'weeks' && newUnit === 'days') factor = 7;
    else if (oldUnit === 'weeks' && newUnit === 'months') factor = 1 / 4;
    else if (oldUnit === 'days' && newUnit === 'weeks') factor = 1 / 7;
    else if (oldUnit === 'days' && newUnit === 'months') factor = 1 / 30;

    const newDuration = Math.max(1, Math.ceil(currentSchedule.duration * factor));

    const newServices = currentSchedule.services.map(service => {
      const newDistribution: { periodIndex: number; value: number }[] = [];
      
      if (factor > 1) {
        // Expanding (e.g., months to days)
        service.distribution.forEach(d => {
          const splitValue = d.value / factor;
          for (let j = 0; j < factor; j++) {
            const newPeriodIndex = Math.floor(d.periodIndex * factor) + j;
            if (newPeriodIndex < newDuration) {
              newDistribution.push({ periodIndex: newPeriodIndex, value: splitValue });
            }
          }
        });
      } else {
        // Condensing (e.g., days to months)
        const condensedMap = new Map<number, number>();
        service.distribution.forEach(d => {
          const newPeriodIndex = Math.floor(d.periodIndex * factor);
          if (newPeriodIndex < newDuration) {
            condensedMap.set(newPeriodIndex, (condensedMap.get(newPeriodIndex) || 0) + d.value);
          }
        });
        condensedMap.forEach((value, periodIndex) => {
          newDistribution.push({ periodIndex, value });
        });
      }

      return { ...service, distribution: newDistribution };
    });

    updateSchedule({ 
      timeUnit: newUnit, 
      duration: newDuration,
      services: newServices 
    });
  };

  const handleValueChange = React.useCallback((serviceId: string, periodIndex: number, value: number) => {
    const serviceSchedule = currentSchedule.services.find(s => s.serviceId === serviceId) || {
      serviceId,
      distribution: []
    };

    const newDistribution = [...serviceSchedule.distribution];
    const periodIdx = newDistribution.findIndex(p => p.periodIndex === periodIndex);
    
    if (periodIdx >= 0) {
      newDistribution[periodIdx] = { ...newDistribution[periodIdx], value };
    } else {
      newDistribution.push({ periodIndex, value });
    }

    const newServices = [...currentSchedule.services];
    const sIdx = newServices.findIndex(s => s.serviceId === serviceId);
    if (sIdx >= 0) {
      newServices[sIdx] = { ...serviceSchedule, distribution: newDistribution };
    } else {
      newServices.push({ ...serviceSchedule, distribution: newDistribution });
    }

    updateSchedule({ services: newServices });
  }, [currentSchedule.services, updateSchedule]);

  const getPeriodValue = React.useCallback((serviceId: string, periodIndex: number) => {
    return scheduleDataLookup[serviceId]?.[periodIndex] ?? 0;
  }, [scheduleDataLookup]);

  const getServiceTotal = React.useCallback((serviceId: string) => {
    return serviceTotals[serviceId] || 0;
  }, [serviceTotals]);

  const getPeriodTotalValue = React.useCallback((periodIndex: number, items: {serviceId: string, quantity: number}[]) => {
    const isPercentage = currentSchedule.distributionType === 'percentage';
    return items.reduce((acc, item) => {
      const val = getPeriodValue(item.serviceId, periodIndex);
      if (val === 0) return acc;
      const unitCost = serviceUnitCosts[item.serviceId] || 0;
      
      if (isPercentage) {
        return acc + (val / 100 * item.quantity * unitCost);
      } else {
        return acc + (val * unitCost);
      }
    }, 0);
  }, [currentSchedule.distributionType, getPeriodValue, serviceUnitCosts]);

  const getPeriodTotal = React.useCallback((periodIndex: number) => {
    return periodFinancialTotals[periodIndex] || 0;
  }, [periodFinancialTotals]);

  const periods = Array.from({ length: currentSchedule.duration }, (_, i) => i);

  const monthGroups = React.useMemo(() => {
    const groups: { monthYear: string; duration: number; startIndex: number }[] = [];
    if (!currentSchedule.startDate || (currentSchedule.timeUnit !== 'days' && currentSchedule.timeUnit !== 'weeks')) return [];

    const start = new Date(currentSchedule.startDate + 'T12:00:00');
    
    periods.forEach((p, idx) => {
      let currentMonthYear = "";
      const d = new Date(start);
      if (currentSchedule.timeUnit === 'days') {
        d.setDate(start.getDate() + p);
      } else {
        d.setDate(start.getDate() + (p * 7));
      }
      currentMonthYear = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

      if (groups.length === 0 || groups[groups.length - 1].monthYear !== currentMonthYear) {
        groups.push({ monthYear: currentMonthYear, duration: 1, startIndex: idx });
      } else {
        groups[groups.length - 1].duration++;
      }
    });

    return groups;
  }, [currentSchedule.startDate, currentSchedule.timeUnit, periods]);

  const getPeriodLabel = (index: number) => {
    const start = new Date(currentSchedule.startDate + 'T12:00:00');
    
    if (currentSchedule.timeUnit === 'days') {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const weekday = current.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayMonth = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="capitalize text-[10px] font-bold text-blue-600">{weekday}</span>
          <span className="text-[10px] text-gray-500">{dayMonth}</span>
        </div>
      );
    }
    
    if (currentSchedule.timeUnit === 'weeks') {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + (index * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const format = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[10px] font-bold text-blue-600">Sem. {index + 1}</span>
          <span className="text-[9px] text-gray-500 whitespace-nowrap">{format(weekStart)} a {format(weekEnd)}</span>
        </div>
      );
    }
    
    if (currentSchedule.timeUnit === 'months') {
      const current = new Date(start);
      current.setMonth(start.getMonth() + index);
      const monthYear = current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="capitalize text-[10px] font-bold text-blue-600">{monthYear.replace('.', '')}</span>
          <span className="text-[9px] text-gray-500">Mês {index + 1}</span>
        </div>
      );
    }
    
    return `P ${index + 1}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Cronograma Físico-Financeiro</h3>
          <p className="text-gray-500">Distribuição da execução dos serviços no tempo</p>
        </div>
        <div className="flex items-center gap-4">
          {!readonly && hasChanges && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg animate-pulse"
              onClick={handleSave}
            >
              Salvar Cronograma
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportScheduleToExcel(currentSchedule, services, resources, activeQuotation?.budgetName || 'Cronograma')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportScheduleToPDF(currentSchedule, services, resources, activeQuotation?.budgetName || 'Cronograma')}>
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold text-gray-400 uppercase">Planilha:</Label>
            <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
              <SelectTrigger className="w-[250px] bg-white">
                <SelectValue>
                  {selectedQuotationId === 'current' 
                    ? 'Planilha Atual (Em edição)' 
                    : quotations.find(q => q.id === selectedQuotationId)?.budgetName || 'Selecionar Planilha'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {isCurrentPopulated && (
                  <SelectItem value="current" textValue="Planilha Atual (Em edição)">
                    Planilha Atual (Em edição)
                  </SelectItem>
                )}
                {quotations.map(q => (
                  <SelectItem key={q.id} value={q.id} textValue={q.budgetName}>
                    {q.budgetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Configuração do Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input 
                type="date" 
                value={currentSchedule.startDate} 
                onChange={(e) => updateSchedule({ startDate: e.target.value })}
                readOnly={readonly}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade de Tempo</Label>
              <Select 
                value={currentSchedule.timeUnit} 
                onValueChange={(v: TimeUnit) => handleTimeUnitChange(v)}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração ({currentSchedule.timeUnit === 'days' ? 'Dias' : currentSchedule.timeUnit === 'weeks' ? 'Semanas' : 'Meses'})</Label>
              <Input 
                type="number" 
                min={1} 
                max={60}
                value={currentSchedule.duration} 
                onChange={(e) => updateSchedule({ duration: parseInt(e.target.value) || 1 })}
                readOnly={readonly}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Distribuição</Label>
              <Select 
                value={currentSchedule.distributionType} 
                onValueChange={(v: 'quantity' | 'percentage') => updateSchedule({ distributionType: v })}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modo de Visualização</Label>
              <Select 
                value={viewMode} 
                onValueChange={(v: 'qty' | 'val' | 'perc' | 'all') => setViewMode(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Visualizar">
                    {viewMode === 'qty' ? 'Quantidade' : 
                     viewMode === 'val' ? 'Valores' : 
                     viewMode === 'perc' ? 'Percentuais' : 
                     viewMode === 'all' ? 'Tudo (Qtd/Val/%)' : 'Visualizar'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qty">Quantidade</SelectItem>
                  <SelectItem value="val">Valores</SelectItem>
                  <SelectItem value="perc">Percentuais</SelectItem>
                  <SelectItem value="all">Tudo (Qtd/Val/%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {!readonly && (
                <Button variant="outline" className="w-full" onClick={() => {
                  const confirmClear = window.confirm("Deseja limpar toda a distribuição deste cronograma?");
                  if (confirmClear) updateSchedule({ services: [] });
                }}>
                  Limpar Distribuição
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-none">
        <div className="max-h-[600px] overflow-auto relative border rounded-xl shadow-sm bg-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-40 border-b">
              {monthGroups.length > 0 && (
                <TableRow className="bg-gray-50/80 backdrop-blur-sm hover:bg-transparent">
                  <TableHead colSpan={2} className="sticky left-0 top-0 bg-gray-50/90 backdrop-blur-sm z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] h-10 border-b" />
                  {monthGroups.map((group, gIdx) => (
                    <TableHead key={gIdx} colSpan={group.duration} className="text-center font-bold text-[10px] uppercase text-blue-800 bg-blue-50/40 border-r border-b py-2 sticky top-0 shadow-sm">
                      {group.monthYear}
                    </TableHead>
                  ))}
                  <TableHead colSpan={2} className="bg-gray-50/50 border-b sticky top-0" />
                </TableRow>
              )}
              <TableRow className="bg-gray-50/90 backdrop-blur-sm">
                <TableHead className="w-[180px] min-w-[180px] max-w-[180px] sticky left-0 bg-gray-50/95 backdrop-blur-md z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] border-b py-3 font-bold text-gray-700">Serviço</TableHead>
                <TableHead className="min-w-[100px] text-right border-b sticky top-0 bg-gray-50 z-30 font-bold text-gray-600 px-4">Total Planilha</TableHead>
                {periods.map(p => (
                  <TableHead key={p} className="min-w-[120px] text-center border-l bg-gray-50/50 border-b sticky top-0 z-30 font-bold text-gray-600">
                    <div className="flex flex-col gap-1">
                      {getPeriodLabel(p)}
                      <div className="flex justify-center gap-1.5 text-[7px] uppercase text-blue-400 font-mono tracking-tighter">
                        {(viewMode === 'qty' || viewMode === 'all') && <span>Quantidade</span>}
                        {viewMode === 'all' && <span>|</span>}
                        {(viewMode === 'val' || viewMode === 'all') && <span>Valores</span>}
                        {(viewMode === 'perc' || viewMode === 'all') && <span>|</span>}
                        {(viewMode === 'perc' || viewMode === 'all') && <span>Percentuais</span>}
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="min-w-[100px] text-right border-l bg-blue-50/50 border-b sticky top-0 z-30 font-bold text-blue-800 px-4">Total Dist.</TableHead>
                <TableHead className="min-w-[100px] text-right border-l border-b sticky top-0 bg-gray-50 z-30 font-bold text-gray-600 px-4">Saldo</TableHead>
              </TableRow>
            </thead>
              <TableBody>
                {activeItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={periods.length + 4} className="h-32 text-center text-gray-500">
                      Nenhum serviço encontrado na planilha selecionada. 
                    </TableCell>
                  </TableRow>
                )}
                {groupsToRender.map((group) => (
                  <React.Fragment key={group.id}>
                    {/* Group Header */}
                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                      <TableCell colSpan={periods.length + 4} className="py-1 px-3 font-bold text-gray-700 text-[10px] uppercase tracking-wider">
                        {group.name}
                      </TableCell>
                    </TableRow>

                    {group.services.map((item) => (
                      <ScheduleServiceRow 
                        key={item.serviceId}
                        item={item}
                        service={serviceLookup[item.serviceId]}
                        viewMode={viewMode}
                        periods={periods}
                        currentSchedule={currentSchedule}
                        unitCost={serviceUnitCosts[item.serviceId] || 0}
                        getPeriodValue={getPeriodValue}
                        handleValueChange={handleValueChange}
                        readonly={readonly}
                      />
                    ))}

                    {/* Group Footer Totals */}
                    <TableRow className="bg-slate-50 border-t font-semibold">
                      <TableCell className="sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[9px] uppercase py-1.5 font-bold">
                        TOTAL: {group.name}
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-mono text-slate-700">
                        {formatCurrency(group.services.reduce((acc, item) => {
                          const unitCost = serviceUnitCosts[item.serviceId] || 0;
                          return acc + (item.quantity * unitCost);
                        }, 0))}
                      </TableCell>
                      {periods.map(p => {
                        const periodTotal = groupFinancialTotals[group.id]?.[p] || 0;
                        return (
                          <TableCell key={p} className="text-right text-[9px] font-mono border-l text-slate-700">
                            {formatCurrency(periodTotal)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right text-[10px] font-mono border-l bg-slate-100 text-slate-900">
                        {formatCurrency((groupFinancialTotals[group.id] || []).reduce((acc, val) => acc + val, 0))}
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-mono border-l text-slate-700">
                        {formatCurrency(
                          group.services.reduce((acc, item) => {
                            const unitCost = serviceUnitCosts[item.serviceId] || 0;
                            return acc + (item.quantity * unitCost);
                          }, 0) - (groupFinancialTotals[group.id] || []).reduce((acc, val) => acc + val, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                
                {/* Global Footer */}
                <TableRow className="bg-slate-900 text-white font-bold">
                  <TableCell className="sticky left-0 bg-slate-900 z-10 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] py-2 text-[10px]">TOTAL GERAL (FINANCEIRO)</TableCell>
                  <TableCell className="text-right text-[10px] font-mono">
                    {formatCurrency(activeItems.reduce((acc, item) => {
                      const unitCost = serviceUnitCosts[item.serviceId] || 0;
                      return acc + (item.quantity * unitCost);
                    }, 0))}
                  </TableCell>
                  {periods.map(p => (
                    <TableCell key={p} className="text-right text-[9px] font-mono border-l border-white/10">
                      {formatCurrency(periodFinancialTotals[p] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-[10px] font-mono border-l border-white/10 bg-slate-800">
                    {formatCurrency(periodFinancialTotals.reduce((acc, val) => acc + val, 0))}
                  </TableCell>
                  <TableCell className="text-right text-[10px] font-mono border-l border-white/10">
                    {formatCurrency(
                      activeItems.reduce((acc, item) => {
                        const unitCost = serviceUnitCosts[item.serviceId] || 0;
                        return acc + (item.quantity * unitCost);
                      }, 0) - periodFinancialTotals.reduce((acc, val) => acc + val, 0)
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </table>
        </div>
      </Card>
    </div>
  );
}
