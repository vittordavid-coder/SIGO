import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  PurchaseQuotation, Supplier, PurchaseRequest, WorkMovement, 
  WorkMovementSector, Contract, User 
} from '../types';
import { 
  CheckCircle, CheckCircle2, XCircle, Eye, FileText, ClipboardList, HardHat, 
  Users, Package, ShoppingCart, Landmark, Truck, Activity, 
  Search, Filter, Plus, Database, Copy, Check, Download,
  Calendar, User as UserIcon, ArrowUpRight, ArrowDownRight, Tag, Info, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';
import { WORK_MOVEMENTS_SQL_SCRIPT, INITIAL_WORK_MOVEMENTS } from '../lib/workMovementsSql';

interface ProjectAdminViewProps {
  purchaseQuotations: PurchaseQuotation[];
  setPurchaseQuotations: React.Dispatch<React.SetStateAction<PurchaseQuotation[]>>;
  suppliers: Supplier[];
  requests: PurchaseRequest[];
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
  workMovements?: WorkMovement[];
  setWorkMovements?: React.Dispatch<React.SetStateAction<WorkMovement[]>>;
  onAddWorkMovement?: (movement: Omit<WorkMovement, 'id' | 'timestamp'>) => void;
  contracts?: Contract[];
  currentUser?: User;
}

export const SECTOR_ACTIONS_MAP: Record<WorkMovementSector, { name: string; actions: string[]; color: string; bg: string; border: string; badge: string; icon: any }> = {
  RH: {
    name: 'RH',
    actions: [
      'ADMISSÃO DE COLABORADOR',
      'DEMISSÃO DE COLABORADOR',
      'TRANSFERÊNCIA DE COLABORADOR',
      'FECHAMENTO DE JORNADA'
    ],
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: Users
  },
  ALMOXARIFE: {
    name: 'ALMOXARIFE',
    actions: [
      'SOLICITAÇÃO DE MATERIAL',
      'ENTRADA DE MATERIAL',
      'SAÍDA DE MATERIAL',
      'ATUALIZAÇÃO DE ESTOQUE',
      'RECEBIMENTO DE MATERIAL',
      'CADASTRO DE PATRIMÔNIO',
      'TRANSFERÊNCIA DE MATERIAL'
    ],
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Package
  },
  COMPRAS: {
    name: 'COMPRAS',
    actions: [
      'COTAÇÃO APROVADA',
      'COMPRA EFETUADA',
      'SOLICITAÇÃO DE COMPRA',
      'ORDEM DE COMPRA',
      'AVALIAÇÃO DE FORNECEDOR / ENTREGA'
    ],
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: ShoppingCart
  },
  FINANCEIRO: {
    name: 'FINANCEIRO',
    actions: [
      'MOVIMENTAÇÃO DE CAIXA',
      'FECHAMENTO DE APORTE',
      'CRIAÇÃO DE APORTE',
      'INCLUSÃO DE ITEM NO APORTE'
    ],
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Landmark
  },
  'SALA TÉCNICA': {
    name: 'SALA TÉCNICA',
    actions: [
      'PRODUÇÃO ATUALIZADA',
      'CRONOGRAMA ATUALIZADO',
      'MEDIÇÃO ENCERRADA'
    ],
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: FileText
  },
  CONTROLADOR: {
    name: 'CONTROLADOR',
    actions: [
      'CADASTRO DE EQUIPAMENTO',
      'ENTRADA DE EQUIPAMENTO',
      'SAÍDA DE EQUIPAMENTO',
      'TRANSFERÊNCIA DE EQUIPAMENTO',
      'INÍCIO DE MANUTENÇÃO',
      'FIM DE MANUTENÇÃO',
      'EQUIPAMENTO EM MANUTENÇÃO',
      'ENTRADA DE COMBUSTÍVEL',
      'SAÍDA DE COMBUSTÍVEL',
      'MEDIÇÃO EQUIPAMENTO'
    ],
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: Truck
  }
};

export function ProjectAdminView({ 
  purchaseQuotations, 
  setPurchaseQuotations, 
  suppliers,
  requests,
  setRequests,
  workMovements = INITIAL_WORK_MOVEMENTS,
  setWorkMovements,
  onAddWorkMovement,
  contracts = [],
  currentUser
}: ProjectAdminViewProps) {
  const [activeTab, setActiveTab] = useState('movimentacao');
  
  // Quotation state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<PurchaseQuotation | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Movements state & filters
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractFilter, setSelectedContractFilter] = useState<string>('ALL');
  
  // Date filtering state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  const maxMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next > maxMonth ? prev : next;
    });
  };
  
  // Detail Modal state
  const [selectedMovement, setSelectedMovement] = useState<WorkMovement | null>(null);
  const [isMovementDetailsOpen, setIsMovementDetailsOpen] = useState(false);

  const getMovementValue = (m: WorkMovement | null | undefined): number | null => {
    if (!m || !m.details) return null;
    const d = m.details;
    const val = d.amount ?? d.totalValue ?? d.itemValue ?? d.total ?? d.value;
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && !isNaN(parseFloat(val))) {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  
  const pendingQuotations = purchaseQuotations.filter(q => q.status === 'awaiting_approval');

  const mapToSnake = (obj: any) => {
    const newObj: any = {};
    for (const k in obj) {
      if (k === 'selectedSupplierId') continue;
      const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[k];
    }
    return newObj;
  };

  const handleApprove = async (id: string) => {
    if (!selectedSupplierId) {
      alert('Por favor, selecione qual fornecedor foi escolhido para esta compra.');
      return;
    }

    const quotation = purchaseQuotations.find(q => q.id === id);
    if (!quotation) return;

    // 1. Prepare Updates
    const updatedQuotations = purchaseQuotations.map(q => {
      if (q.id === id) {
        const newSuppliers = q.suppliers.map(s => 
          s.supplierId === selectedSupplierId ? { ...s, selected: true } : { ...s, selected: false }
        );
        return { ...q, status: 'approved' as const, selectedSupplierId: selectedSupplierId, suppliers: newSuppliers };
      }
      return q;
    });

    const itemIdsToUpdate = quotation.items.map(i => i.itemId);
    const requestIdsToUpdate = Array.from(new Set(quotation.items.map(i => i.requestId)));

    const updatedRequests = requests.map(req => {
      if (!requestIdsToUpdate.includes(req.id)) return req;

      const updatedItems = req.items.map(item => 
        itemIdsToUpdate.includes(item.id) ? { ...item, status: 'Compra Aprovado' as const } : item
      );

      const allDone = updatedItems.every(i => i.status !== 'Pendente' && i.status !== 'Em orçamento');

      return {
        ...req,
        items: updatedItems,
        status: allDone ? 'Compra Aprovado' : req.status
      } as PurchaseRequest;
    });

    // 2. Register Work Movement automatically for COMPRAS
    const chosenSup = suppliers.find(s => s.id === selectedSupplierId);
    const totalAmount = (quotation.items || []).reduce((acc, item) => {
      const res = (chosenSup?.responses || []).find((r: any) => r.itemId === item.itemId);
      return acc + (item.quantity * (res?.price || 0));
    }, 0);

    const refCode = `COT-${quotation.date.replace(/-/g, '')}-${quotation.id.substring(0, 4).toUpperCase()}`;

    if (onAddWorkMovement) {
      onAddWorkMovement({
        sector: 'COMPRAS',
        action: 'COTAÇÃO APROVADA',
        description: `Orçamento de ${quotation.items?.length || 0} itens aprovado e liberado para compra.`,
        referenceCode: refCode,
        responsibleUser: currentUser?.name || currentUser?.username || 'Administrador da Obra',
        details: {
          supplier: chosenSup?.name || 'Fornecedor Selecionado',
          amount: totalAmount,
          quantity: quotation.items?.length || 0,
          unit: 'itens',
          status: 'Aprovado para Aquisição',
          notes: `Aprovação concedida pelo Administrador da Obra para ${chosenSup?.name || 'fornecedor'}.`
        }
      });
    }

    // 3. Update Local State
    setPurchaseQuotations(updatedQuotations);
    setRequests(updatedRequests);

    // 4. Sync to Supabase
    try {
      const config = getSupabaseConfig();
      if (config.enabled) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          const qUpdate = updatedQuotations.find(q => q.id === id);
          if (qUpdate) {
            await supabase.from('purchase_quotations').upsert(mapToSnake(qUpdate));
          }
          for (const rid of requestIdsToUpdate) {
            const rUpdate = updatedRequests.find(r => r.id === rid);
            if (rUpdate) {
              await supabase.from('purchase_requests').upsert(mapToSnake(rUpdate));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync approval to supabase', err);
    }
    
    setIsDetailsOpen(false);
  };

  const handleReject = async (id: string) => {
    const updatedQuotations = purchaseQuotations.map(q => 
      q.id === id ? { ...q, status: 'sent' as const } : q
    );
    
    setPurchaseQuotations(updatedQuotations);

    try {
      const config = getSupabaseConfig();
      if (config.enabled) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          const qUpdate = updatedQuotations.find(q => q.id === id);
          if (qUpdate) {
            await supabase.from('purchase_quotations').upsert(mapToSnake(qUpdate));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync rejection to supabase', err);
    }

    setIsDetailsOpen(false);
  };

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return workMovements.filter(m => {
      // Month Filter
      const mDate = new Date(m.timestamp);
      if (mDate.getFullYear() !== selectedMonth.getFullYear() || mDate.getMonth() !== selectedMonth.getMonth()) {
        return false;
      }

      // Sector Filter
      if (selectedSectorFilter !== 'ALL' && m.sector !== selectedSectorFilter) {
        return false;
      }
      // Action Filter
      if (selectedActionFilter !== 'ALL' && m.action !== selectedActionFilter) {
        return false;
      }
      // Contract Filter
      if (selectedContractFilter !== 'ALL' && m.contractName !== selectedContractFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const inCode = m.referenceCode?.toLowerCase().includes(term);
        const inDesc = m.description.toLowerCase().includes(term);
        const inUser = m.responsibleUser.toLowerCase().includes(term);
        const inAction = m.action.toLowerCase().includes(term);
        const inCollab = m.details.collaboratorName?.toLowerCase().includes(term);
        const inMat = m.details.materialName?.toLowerCase().includes(term);
        const inEqp = m.details.equipmentName?.toLowerCase().includes(term) || m.details.equipmentCode?.toLowerCase().includes(term);
        
        return inCode || inDesc || inUser || inAction || inCollab || inMat || inEqp;
      }
      return true;
    });
  }, [workMovements, selectedSectorFilter, selectedActionFilter, selectedContractFilter, searchTerm, selectedMonth]);

  // Available actions based on current sector selection
  const availableActionsForFilter = useMemo(() => {
    if (selectedSectorFilter !== 'ALL' && selectedSectorFilter in SECTOR_ACTIONS_MAP) {
      return SECTOR_ACTIONS_MAP[selectedSectorFilter as WorkMovementSector].actions;
    }
    const allActions: string[] = [];
    Object.values(SECTOR_ACTIONS_MAP).forEach(s => {
      allActions.push(...s.actions);
    });
    return Array.from(new Set(allActions));
  }, [selectedSectorFilter]);

  // Sector Stats for selected month
  const sectorCounts = useMemo(() => {
    const monthMovements = workMovements.filter(m => {
      const mDate = new Date(m.timestamp);
      return mDate.getFullYear() === selectedMonth.getFullYear() && mDate.getMonth() === selectedMonth.getMonth();
    });
    const counts: Record<string, number> = { ALL: monthMovements.length };
    Object.keys(SECTOR_ACTIONS_MAP).forEach(sec => {
      counts[sec] = monthMovements.filter(m => m.sector === sec).length;
    });
    return counts;
  }, [workMovements, selectedMonth]);


  const handleExportCsv = () => {
    if (filteredMovements.length === 0) {
      alert('Não há movimentações para exportar.');
      return;
    }
    const headers = ['Data', 'Hora', 'Setor', 'Ação', 'Código Ref.', 'Descrição', 'Valor (R$)', 'Responsável', 'Detalhes Principal'];
    const rows = filteredMovements.map(m => {
      const dt = new Date(m.timestamp);
      const val = getMovementValue(m);
      const valFormatted = val !== null ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
      const mainDetail = m.details.collaboratorName || m.details.materialName || m.details.equipmentName || valFormatted;
      return [
        dt.toLocaleDateString('pt-BR'),
        dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        m.sector,
        m.action,
        m.referenceCode || '-',
        `"${m.description.replace(/"/g, '""')}"`,
        `"${valFormatted}"`,
        `"${m.responsibleUser.replace(/"/g, '""')}"`,
        `"${String(mainDetail).replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `movimentacao_obra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-3xl text-white shadow-xl mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 shadow-inner">
            <HardHat className="w-9 h-9 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 font-bold uppercase tracking-wider">Setor Executivo de Engenharia</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-semibold">{workMovements.length} Registros</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1 text-white">Administrador da Obra</h1>
            <p className="text-slate-300 text-sm md:text-base mt-1">
              Registro centralizado de movimentações da obra e aprovação de suprimentos e insumos.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200/80 mb-6 h-12 inline-flex w-auto">
          <TabsTrigger 
            value="movimentacao" 
            className="rounded-xl px-6 font-extrabold text-sm gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            <Activity className="w-4 h-4" />
            Movimentação da Obra
            <Badge className="ml-1 bg-slate-900 text-white font-black text-[10px] px-1.5 py-0">
              {workMovements.length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger 
            value="solicitacoes" 
            className="rounded-xl px-6 font-extrabold text-sm gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4" />
            Solicitações
            {pendingQuotations.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0 shadow-sm animate-pulse">
                {pendingQuotations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MOVIMENTAÇÃO DA OBRA */}
        <TabsContent value="movimentacao" className="mt-0 outline-none space-y-6">
          {/* Quick Sector Cards / Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <button
              onClick={() => { setSelectedSectorFilter('ALL'); setSelectedActionFilter('ALL'); }}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-sm",
                selectedSectorFilter === 'ALL'
                  ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Todos</span>
                <Activity className="w-4 h-4 opacity-70" />
              </div>
              <div className="text-2xl font-black mt-1">{sectorCounts.ALL}</div>
              <span className="text-[9px] font-bold opacity-60">Todas as Ações</span>
            </button>

            {(Object.keys(SECTOR_ACTIONS_MAP) as WorkMovementSector[]).map(sectorKey => {
              const sec = SECTOR_ACTIONS_MAP[sectorKey];
              const Icon = sec.icon;
              const isSelected = selectedSectorFilter === sectorKey;
              const count = sectorCounts[sectorKey] || 0;

              return (
                <button
                  key={sectorKey}
                  onClick={() => {
                    setSelectedSectorFilter(isSelected ? 'ALL' : sectorKey);
                    setSelectedActionFilter('ALL');
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group",
                    sec.bg,
                    sec.border,
                    isSelected
                      ? "ring-2 ring-offset-2 " + sec.color.replace('text-', 'ring-')
                      : "hover:shadow-md hover:scale-[1.02]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", sec.color)}>
                      {sec.name}
                    </span>
                    <Icon className={cn("w-4 h-4", sec.color)} />
                  </div>
                  <div className={cn("text-2xl font-black mt-1", sec.color)}>
                    {count}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 truncate">
                    {sec.actions.length} tipos de ação
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Container Card */}
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Histórico de Movimentações da Obra
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-medium text-xs mt-1">
                    Registros operacionais automatizados e manuais de RH, Almoxarife, Compras, Financeiro, Sala Técnica e Controlador.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportCsv}
                    className="h-9 font-bold text-xs rounded-xl border-slate-200 hover:bg-slate-100 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    Exportar CSV
                  </Button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    placeholder="Buscar por código, descrição, usuário, insumo..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 rounded-xl text-xs font-medium border-slate-200"
                  />
                </div>

                {/* Filter Sector */}
                <Select 
                  value={selectedSectorFilter} 
                  onValueChange={(val) => {
                    setSelectedSectorFilter(val);
                    setSelectedActionFilter('ALL');
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold border-slate-200">
                    <SelectValue placeholder="Filtrar por Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="font-bold">Todos Os Setores</SelectItem>
                    {Object.keys(SECTOR_ACTIONS_MAP).map(secKey => (
                      <SelectItem key={secKey} value={secKey} className="font-medium">
                        Setor: {secKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Action */}
                <Select value={selectedActionFilter} onValueChange={setSelectedActionFilter}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold border-slate-200">
                    <SelectValue placeholder="Filtrar por Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="font-bold">Todas as Ações</SelectItem>
                    {availableActionsForFilter.map(act => (
                      <SelectItem key={act} value={act} className="font-medium">
                        {act}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reset Filters */}
                {(selectedSectorFilter !== 'ALL' || selectedActionFilter !== 'ALL' || searchTerm !== '' || selectedContractFilter !== 'ALL') && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedSectorFilter('ALL');
                      setSelectedActionFilter('ALL');
                      setSearchTerm('');
                      setSelectedContractFilter('ALL');
                    }}
                    className="h-10 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Month Navigation Strip */}
              <div className="bg-slate-900 text-white flex items-center justify-between px-6 py-3 border-b border-slate-800 shadow-inner">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrevMonth}
                  className="h-8 px-3 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Mês Anterior
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-sm text-white uppercase tracking-widest">
                    {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= maxMonth}
                  className="h-8 px-3 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold gap-1 disabled:opacity-40"
                >
                  Próximo Mês
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="font-bold text-slate-700 text-xs uppercase w-32">Data / Hora</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase w-32">Setor</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase">Ação Registrada</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase w-32">Código Ref.</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase">Descrição do Evento</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase text-right w-36">Valor (R$)</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase">Responsável</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs uppercase w-28">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-56 text-center py-8">
                          <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <Activity className="w-10 h-10 text-slate-300" />
                            <p className="font-bold text-sm text-slate-600">Nenhuma movimentação registrada no mês selecionado.</p>
                            <p className="text-xs text-slate-400">Navegue entre os meses ou altere os filtros de busca acima.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMovements.map((mov) => {
                        const secInfo = SECTOR_ACTIONS_MAP[mov.sector] || {
                          name: mov.sector,
                          color: 'text-slate-700',
                          bg: 'bg-slate-100',
                          badge: 'bg-slate-200 text-slate-800',
                          icon: Info
                        };
                        const SecIcon = secInfo.icon;
                        const dateObj = new Date(mov.timestamp);
                        const dateFormatted = dateObj.toLocaleDateString('pt-BR');
                        const timeFormatted = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const movVal = getMovementValue(mov);

                        return (
                          <TableRow 
                            key={mov.id} 
                            className="hover:bg-slate-50/90 transition-colors group border-b border-slate-100"
                          >
                            <TableCell className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{dateFormatted}</div>
                              <div className="text-[10px] text-slate-400">{timeFormatted}</div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              <Badge className={cn("px-2.5 py-1 rounded-lg border font-black text-[10px] gap-1.5 shadow-none", secInfo.badge)}>
                                <SecIcon className="w-3 h-3" />
                                {mov.sector}
                              </Badge>
                            </TableCell>

                            <TableCell className="font-bold text-xs text-slate-900 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-[11px]">
                                {mov.action}
                              </span>
                            </TableCell>

                            <TableCell className="font-mono text-xs font-black text-slate-600 whitespace-nowrap">
                              {mov.referenceCode ? (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                                  {mov.referenceCode}
                                </span>
                              ) : '-'}
                            </TableCell>

                            <TableCell className="text-xs font-medium text-slate-700 max-w-xs truncate">
                              <span title={mov.description}>{mov.description}</span>
                            </TableCell>

                            <TableCell className="text-right whitespace-nowrap font-mono text-xs font-black">
                              {movVal !== null ? (
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-black">
                                  R$ {movVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </TableCell>

                            <TableCell className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span>{mov.responsibleUser}</span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right whitespace-nowrap">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedMovement(mov);
                                  setIsMovementDetailsOpen(true);
                                }}
                                className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-black text-xs gap-1.5 rounded-xl border border-blue-100"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SOLICITAÇÕES (EXIBIÇÃO EM BALÕES) */}
        <TabsContent value="solicitacoes" className="mt-0 outline-none space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Solicitações e Cotações Pendentes de Aprovação
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Cada solicitação é apresentada em formato de balão com os detalhes dos suprimentos solicitados.
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-black text-xs px-3 py-1">
                Total: {pendingQuotations.length} solicitação(ões)
              </Badge>
            </div>

            {pendingQuotations.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h4 className="text-base font-bold text-slate-800">Nenhuma solicitação pendente</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Todas as solicitações de compras e orçamentos foram analisadas ou aprovadas.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingQuotations.map((q) => {
                  const supplierTotals = (q.suppliers || []).map(qs => 
                    (q.items || []).reduce((acc, item) => {
                      const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                      return acc + (item.quantity * (res?.price || 0));
                    }, 0)
                  ).filter(total => total > 0);
                  
                  const lowestTotal = supplierTotals.length > 0 ? Math.min(...supplierTotals) : 0;

                  return (
                    <div 
                      key={q.id} 
                      className="relative bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border-2 border-blue-200/80 rounded-3xl rounded-tl-md p-6 shadow-md hover:shadow-xl transition-all space-y-4 group"
                    >
                      {/* Speech Bubble Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-200">
                            <ShoppingCart className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                                COT-{q.date.replace(/-/g, '')}-{q.id.substring(0, 4).toUpperCase()}
                              </span>
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-extrabold text-[10px]">
                                Suprimentos & Almoxarifado
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1">
                              Solicitação gerada em {q.date ? new Date(q.date).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        </div>

                        <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 shadow-sm">
                          Aguardando Aprovação
                        </Badge>
                      </div>

                      {/* Speech Bubble Content */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-blue-100">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Itens Solicitados</span>
                          <p className="text-xs font-bold text-slate-900">
                            {(q.items || []).length} item(ns) na lista
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Ex: {q.items?.[0]?.description || 'Material operacional'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fornecedores Cotados</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                              {(q.suppliers || []).map((s, idx) => (
                                <div 
                                  key={s.supplierId} 
                                  className={cn(
                                    "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black uppercase text-white shadow-xs",
                                    idx % 2 === 0 ? "bg-blue-500" : "bg-emerald-500"
                                  )}
                                  title={suppliers.find(sup => sup.id === s.supplierId)?.name || 'Fornecedor'}
                                >
                                  {suppliers.find(sup => sup.id === s.supplierId)?.name?.[0] || '?'}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {(q.suppliers || []).length} participante(s)
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 md:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Menor Orçamento</span>
                          <p className="text-base font-black text-emerald-600">
                            R$ {lowestTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Speech Bubble Footer / Method to View Details */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500 font-medium italic">
                          Clique para analisar propostas e autorizar pedido de compra.
                        </span>
                        <Button 
                          onClick={() => { 
                            setSelectedQuotation(q); 
                            setSelectedSupplierId(null); 
                            setIsDetailsOpen(true); 
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5 h-9 gap-1.5 shadow-md shadow-blue-200 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          Exibir Detalhes da Solicitação
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: VER DETALHES DA MOVIMENTAÇÃO DA OBRA */}
      <Dialog open={isMovementDetailsOpen} onOpenChange={setIsMovementDetailsOpen}>
        <DialogContent className="max-w-3xl p-0 rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
          {selectedMovement && (() => {
            const secInfo = SECTOR_ACTIONS_MAP[selectedMovement.sector] || {
              name: selectedMovement.sector,
              color: 'text-slate-900',
              bg: 'bg-slate-900',
              badge: 'bg-slate-100 text-slate-800',
              icon: Info
            };
            const SecIcon = secInfo.icon;
            const dateObj = new Date(selectedMovement.timestamp);

            return (
              <div>
                {/* Modal Header */}
                <div className="bg-slate-950 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl -mr-32 -mt-32 rounded-full"></div>
                  
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={cn("px-3 py-1 font-black text-xs uppercase gap-1.5 shadow-none", secInfo.badge)}>
                        <SecIcon className="w-3.5 h-3.5" />
                        Setor: {selectedMovement.sector}
                      </Badge>

                      {selectedMovement.referenceCode && (
                        <span className="font-mono text-xs bg-white/10 px-3 py-1 rounded-full text-slate-200 border border-white/10 font-bold">
                          Ref: {selectedMovement.referenceCode}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-amber-400">
                        {selectedMovement.action}
                      </h2>
                      <p className="text-slate-300 text-sm mt-1 font-medium">
                        {selectedMovement.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {dateObj.toLocaleDateString('pt-BR')} às {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                        Operador: {selectedMovement.responsibleUser}
                      </span>

                      {selectedMovement.contractName && (
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <HardHat className="w-3.5 h-3.5" />
                          Obra: {selectedMovement.contractName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Body - Summary Details */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-500" />
                      Resumo dos Atributos da Ação
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* RH Specific Details */}
                      {selectedMovement.details.collaboratorName && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-indigo-600 block">Colaborador / Funcionário</span>
                          <span className="font-extrabold text-sm text-indigo-950 block">{selectedMovement.details.collaboratorName}</span>
                          {selectedMovement.details.collaboratorRole && (
                            <span className="text-xs text-indigo-700 font-medium block">Cargo: {selectedMovement.details.collaboratorRole}</span>
                          )}
                          {selectedMovement.details.collaboratorCpf && (
                            <span className="text-[11px] text-indigo-500 font-mono block">CPF: {selectedMovement.details.collaboratorCpf}</span>
                          )}
                        </div>
                      )}

                      {/* Material / Stock Details */}
                      {selectedMovement.details.materialName && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-700 block">Material / Insumo</span>
                          <span className="font-extrabold text-sm text-amber-950 block">{selectedMovement.details.materialName}</span>
                          {selectedMovement.details.quantity !== undefined && (
                            <span className="text-xs text-amber-800 font-extrabold block">
                              Quantidade: {selectedMovement.details.quantity} {selectedMovement.details.unit || 'un'}
                            </span>
                          )}
                          {selectedMovement.details.supplier && (
                            <span className="text-[11px] text-amber-700 block">Fornecedor: {selectedMovement.details.supplier}</span>
                          )}
                          {selectedMovement.details.invoiceNumber && (
                            <span className="text-[11px] text-amber-600 font-mono block">Nota Fiscal: {selectedMovement.details.invoiceNumber}</span>
                          )}
                        </div>
                      )}

                      {/* Equipment / Controller Details */}
                      {(selectedMovement.details.equipmentName || selectedMovement.details.equipmentCode) && (
                        <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-cyan-700 block">Equipamento / Máquina</span>
                          <span className="font-extrabold text-sm text-cyan-950 block">
                            {selectedMovement.details.equipmentCode ? `[${selectedMovement.details.equipmentCode}] ` : ''}
                            {selectedMovement.details.equipmentName || 'Equipamento de Frota'}
                          </span>
                          {selectedMovement.details.hoursOrHorometer !== undefined && (
                            <span className="text-xs text-cyan-800 font-bold block">
                              Horímetro / Horas: {selectedMovement.details.hoursOrHorometer}h
                            </span>
                          )}
                        </div>
                      )}

                      {/* Financial / Cost Details */}
                      {getMovementValue(selectedMovement) !== null && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-emerald-700 block">Valor Envolvido / Operação R$</span>
                          <span className="font-mono font-black text-xl text-emerald-800 block">
                            R$ {getMovementValue(selectedMovement)?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {selectedMovement.details.unit && (
                            <span className="text-[11px] text-emerald-600 block">Unidade/Base: {selectedMovement.details.unit}</span>
                          )}
                        </div>
                      )}

                      {/* Production / Sala Técnica Details */}
                      {selectedMovement.details.productionValue !== undefined && (
                        <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 block">Volume de Produção</span>
                          <span className="font-black text-lg text-purple-900 block">
                            {selectedMovement.details.productionValue} {selectedMovement.details.unit || 'm³'}
                          </span>
                          {selectedMovement.details.progressPercentage !== undefined && (
                            <span className="text-xs text-purple-700 font-bold block">
                              Avanço Físico: {selectedMovement.details.progressPercentage}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Origin & Destination */}
                      {(selectedMovement.details.origin || selectedMovement.details.destination) && (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">Origem & Destino</span>
                          {selectedMovement.details.origin && (
                            <span className="text-xs text-slate-700 block">
                              <strong>Origem:</strong> {selectedMovement.details.origin}
                            </span>
                          )}
                          {selectedMovement.details.destination && (
                            <span className="text-xs text-slate-700 block">
                              <strong>Destino:</strong> {selectedMovement.details.destination}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Status */}
                      {selectedMovement.details.status && (
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-blue-600 block">Status Operacional</span>
                          <span className="font-extrabold text-xs text-blue-900 block">{selectedMovement.details.status}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes & Justifications */}
                    {selectedMovement.details.notes && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 mt-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Observações & Justificativas</span>
                        <p className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                          {selectedMovement.details.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-medium">
                    ID Interno: {selectedMovement.id}
                  </span>

                  <Button 
                    onClick={() => setIsMovementDetailsOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-6"
                  >
                    Fechar Resumo
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ORÇAMENTO COMPRAS REVISÃO */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-7xl p-0 rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl -mr-32 -mt-32 rounded-full"></div>
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Revisão e Aprovação de Orçamento</DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-slate-400 font-medium text-xs">
                <span className="flex items-center gap-1"><FileText className="w-4 h-4 text-blue-400" /> 
                  ID: COT-{selectedQuotation?.date.replace(/-/g, '')}-{selectedQuotation?.id.substring(0, 4).toUpperCase()}
                </span>
                <span className="flex items-center gap-1"><ClipboardList className="w-4 h-4 text-blue-400" /> Data: {selectedQuotation ? new Date(selectedQuotation.date).toLocaleDateString('pt-BR') : ''}</span>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-white max-h-[80vh] overflow-y-auto space-y-8">
            {selectedQuotation && (
              <div className="space-y-8">
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase">Item</TableHead>
                        <TableHead className="text-center font-bold text-xs uppercase">Qtd</TableHead>
                        {selectedQuotation.suppliers?.map(qs => (
                          <TableHead key={qs.supplierId} className="text-center">
                            <div className="text-xs font-black text-blue-600 uppercase">
                              {suppliers.find(s => s.id === qs.supplierId)?.name || 'Fornecedor'}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuotation.items?.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{item.unit}</div>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs">{item.quantity}</TableCell>
                          {selectedQuotation.suppliers?.map(qs => {
                            const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                            return (
                              <TableCell key={qs.supplierId} className="text-center font-mono text-xs text-emerald-700 font-black">
                                R$ {(res?.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/80 font-black">
                        <TableCell colSpan={2} className="text-right text-xs uppercase text-slate-500">Condição Pagamento</TableCell>
                        {selectedQuotation.suppliers?.map(qs => (
                          <TableCell key={qs.supplierId} className="text-center text-xs text-blue-600">
                            {qs.paymentCondition || 'Não informada'}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="bg-slate-100 font-black">
                        <TableCell colSpan={2} className="text-right text-xs uppercase text-slate-600">Investimento Total</TableCell>
                        {selectedQuotation.suppliers?.map(qs => {
                          const total = (selectedQuotation.items || []).reduce((acc, item) => {
                            const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                            return acc + (item.quantity * (res?.price || 0));
                          }, 0);
                          const isSelected = selectedSupplierId === qs.supplierId;
                          return (
                            <TableCell 
                              key={qs.supplierId} 
                              onClick={() => setSelectedSupplierId(qs.supplierId)}
                              className={cn(
                                "text-center transition-all cursor-pointer hover:bg-emerald-50 relative group p-3",
                                isSelected ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500 ring-inset" : "text-blue-900"
                              )}
                            >
                              <div className="text-sm font-black">
                                R$ {(total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              {isSelected ? (
                                <div className="text-[10px] text-emerald-700 uppercase font-black mt-1 flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Selecionado
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 uppercase font-bold mt-1 opacity-0 group-hover:opacity-100 italic">
                                  Clique para escolher
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 font-black text-sm gap-2"
                    onClick={() => selectedQuotation && handleReject(selectedQuotation.id)}
                  >
                    <XCircle className="w-5 h-5" />
                    Reprovar Orçamento
                  </Button>
                  
                  <Button 
                    disabled={!selectedSupplierId}
                    className={cn(
                      "w-full h-12 rounded-2xl text-white font-black text-sm gap-2 shadow-xl transition-all",
                      selectedSupplierId 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                        : "bg-slate-300 shadow-none cursor-not-allowed"
                    )}
                    onClick={() => selectedQuotation && handleApprove(selectedQuotation.id)}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aprovar e Liberar Compra
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
