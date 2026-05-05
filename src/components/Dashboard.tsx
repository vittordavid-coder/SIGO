import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Package, Briefcase, FileText, ChevronRight, Landmark, Users, ClipboardList, Clock, ShieldCheck, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Quotation, Resource, ServiceComposition, Contract, Measurement, DailyReport, Employee, TimeRecord, DashboardConfig, User, ControllerTeam, ControllerEquipment, ControllerManpower, Supplier, PurchaseOrder, EquipmentTransfer, PurchaseRequest } from '../types';
import { cn } from '../lib/utils';
import { HardHat, Truck, Users2, Activity, CreditCard, ShoppingBasket, ShoppingBag, History, ShoppingCart } from 'lucide-react';

interface DashboardProps {
  key?: string;
  resources: Resource[];
  services: ServiceComposition[];
  quotations: Quotation[];
  contracts: Contract[];
  measurements: Measurement[];
  dailyReports: DailyReport[];
  employees: Employee[];
  timeRecords: TimeRecord[];
  controllerTeams: ControllerTeam[];
  controllerEquipments: ControllerEquipment[];
  manpowerRecords: ControllerManpower[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
  equipmentTransfers: EquipmentTransfer[];
  currentUser: User | null;
  selectedContractId: string | null;
  onUpdateContractId: (id: string | null) => void;
  config: DashboardConfig;
  onNavigate: (tab: any) => void;
}

export function Dashboard({ 
  resources, services, quotations, contracts, measurements, dailyReports, 
  employees, timeRecords, controllerTeams, controllerEquipments, manpowerRecords,
  suppliers, purchaseOrders, purchaseRequests, equipmentTransfers,
  currentUser, selectedContractId, onUpdateContractId, config, onNavigate 
}: DashboardProps) {
  
  // -- Calculations --
  const contract = selectedContractId ? (contracts || []).find(c => c.id === selectedContractId) : null;
  
  // Sala Técnica Metrics
  const lastMeasurement = React.useMemo(() => {
    const filtered = (measurements || []).filter(m => !selectedContractId || m.contractId === selectedContractId);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => (b.number || 0) - (a.number || 0))[0];
  }, [measurements, selectedContractId]);

  const measurementValue = React.useMemo(() => {
    if (!lastMeasurement) return 0;
    const currentContract = (contracts || []).find(c => c.id === lastMeasurement.contractId);
    if (!currentContract) return 0;

    return (lastMeasurement.items || []).reduce((acc, item) => {
      const contractService = (currentContract.services || []).find(s => s.serviceId === item.serviceId);
      const price = contractService?.price || 0;
      return acc + ((item.quantity || 0) * (price || 0));
    }, 0);
  }, [lastMeasurement, contracts]);

  const teamsCount = (controllerTeams || []).filter(t => !selectedContractId || t.contractId === selectedContractId).length;
  const controlsCount = (dailyReports || []).filter(r => !selectedContractId || r.contractId === selectedContractId).length;

  // RH Metrics
  const activeEmployees = (employees || []).filter(e => (!selectedContractId || e.contractId === selectedContractId) && e.status !== 'dismissed');
  const dismissedEmployees = (employees || []).filter(e => (!selectedContractId || e.contractId === selectedContractId) && e.status === 'dismissed');
  // "Afastados" - Assuming we use a convention or if there's no data, we count 0 or total active as "Colaboradores"
  // For now let's just use what we have.
  const awayEmployeesCount = 0; 

  // Controlador Metrics
  const equipmentCount = (controllerEquipments || []).filter(e => !selectedContractId || e.contractId === selectedContractId).length;
  const maintenanceCount = (controllerEquipments || []).filter(e => (!selectedContractId || e.contractId === selectedContractId) && e.inMaintenance).length;
  const pendingTransfersCount = (equipmentTransfers || []).filter(t => t.status === 'pending' && (!selectedContractId || t.sourceContractId === selectedContractId || t.targetContractId === selectedContractId)).length;

  // Compras Metrics
  const requestsCount = (purchaseRequests || []).filter(r => !selectedContractId || r.contractId === selectedContractId).length;
  const ordersCount = (purchaseOrders || []).filter(o => !selectedContractId || o.contractId === selectedContractId).length;
  const trackingCount = (purchaseOrders || []).filter(o => (!selectedContractId || o.contractId === selectedContractId) && o.status === 'sent').length;

  const MetricCard = ({ title, icon: Icon, color, metrics, onClick }: any) => (
    <Card 
      className="border-none shadow-xl rounded-3xl overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className={cn("pb-4 flex flex-row items-center gap-4 text-white", color)}>
        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <CardTitle className="text-xl font-black tracking-tight">{title}</CardTitle>
          <CardDescription className="text-white/70 text-[10px] uppercase font-bold tracking-widest">Resumo do Setor</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {metrics.map((m: any, i: number) => (
            <div 
              key={i} 
              className={cn(
                "flex items-center justify-between group/item p-2 -mx-2 rounded-xl transition-all",
                m.onClick && "hover:bg-gray-50 cursor-pointer"
              )}
              onClick={(e) => {
                if (m.onClick) {
                  e.stopPropagation();
                  m.onClick();
                }
              }}
            >
              <span className="text-sm font-bold text-gray-400 group-hover/item:text-gray-600 transition-colors uppercase tracking-tight">
                {m.label}
              </span>
              <span className={cn(
                "text-xl font-black text-gray-900 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 transition-all duration-300",
                m.onClick ? "group-hover/item:border-blue-200 group-hover/item:bg-blue-50/50 group-hover/item:text-blue-600" : "group-hover/item:border-blue-100"
              )}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 text-blue-600">
          Ver detalhes <ChevronRight className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      {/* Header with improved selector */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-[24px] shadow-xl shadow-blue-200">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Painel Executivo</h2>
            <p className="text-gray-500 font-medium">Controle em tempo real da sua operação.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-2xl border border-blue-100">
          <Landmark className="w-5 h-5 text-blue-600 ml-2" />
          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Selecionar Obra / Contrato</Label>
            <Select value={selectedContractId || 'all'} onValueChange={val => onUpdateContractId(val === 'all' ? null : val)}>
              <SelectTrigger className="w-[450px] h-10 bg-white border-blue-200 rounded-xl font-bold text-blue-900 ring-offset-blue-50">
              <SelectValue>
                {selectedContractId ? (
                  (() => {
                    const c = contracts.find(x => x.id === selectedContractId);
                    return c ? `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})` : "Selecionar Contrato";
                  })()
                ) : "Todos os Contratos"}
              </SelectValue>
            </SelectTrigger>
              <SelectContent className="max-h-80 rounded-xl border-blue-100">
                <SelectItem value="all" className="font-bold">Todos os Contratos</SelectItem>
                {(contracts || []).map(c => {
                  const label = `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})`;
                  return (
                    <SelectItem key={c.id} value={c.id} textValue={label} className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-tight">{c.workName || c.client || 'Sem nome'}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{c.contractNumber || 'S/N'}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <MetricCard 
          title="Sala Técnica"
          icon={ClipboardList}
          color="bg-gradient-to-br from-blue-600 to-blue-800"
          onClick={() => onNavigate('measurements')}
          metrics={[
            { 
              label: 'Vlr. Medição Atual', 
              value: `R$ ${measurementValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              onClick: () => onNavigate({ tab: 'measurements', measureTab: 'measure' })
            },
            { 
              label: 'Nº Equipes', 
              value: teamsCount,
              onClick: () => onNavigate({ tab: 'measurements', measureTab: 'teams' })
            },
            { 
              label: 'Nº de Controles', 
              value: controlsCount,
              onClick: () => onNavigate({ tab: 'measurements', measureTab: 'controls' })
            }
          ]}
        />

        <MetricCard 
          title="RH"
          icon={Users}
          color="bg-gradient-to-br from-orange-500 to-orange-700"
          onClick={() => onNavigate('rh')}
          metrics={[
            { 
              label: 'Colaboradores', 
              value: activeEmployees.length,
              onClick: () => onNavigate({ tab: 'rh', rhTab: 'employees' })
            },
            { 
              label: 'Afastados', 
              value: awayEmployeesCount,
              onClick: () => onNavigate({ tab: 'rh', rhTab: 'employees' })
            },
            { 
              label: 'Dispensados', 
              value: dismissedEmployees.length,
              onClick: () => onNavigate({ tab: 'rh', rhTab: 'employees' })
            }
          ]}
        />

        <MetricCard 
          title="Controlador"
          icon={Activity}
          color="bg-gradient-to-br from-emerald-500 to-emerald-700"
          onClick={() => onNavigate('control')}
          metrics={[
            { 
              label: 'Total Equipamentos', 
              value: equipmentCount,
              onClick: () => onNavigate({ tab: 'control', controlTab: 'list' })
            },
            { 
              label: 'Em Manutenção', 
              value: maintenanceCount,
              onClick: () => onNavigate({ tab: 'control', controlTab: 'maintenance' })
            },
            { 
              label: 'Transf. Pendentes', 
              value: pendingTransfersCount,
              onClick: () => onNavigate({ tab: 'control', controlTab: 'transfers' })
            }
          ]}
        />

        <MetricCard 
          title="Compras"
          icon={ShoppingCart}
          color="bg-gradient-to-br from-purple-500 to-purple-700"
          onClick={() => onNavigate('purchases')}
          metrics={[
            { 
              label: 'Nº Solicitações', 
              value: requestsCount,
              onClick: () => onNavigate({ tab: 'purchases', purchasesTab: 'requests' })
            },
            { 
              label: 'Ordens de Compra', 
              value: ordersCount,
              onClick: () => onNavigate({ tab: 'purchases', purchasesTab: 'orders' })
            },
            { 
              label: 'Acompanhamento', 
              value: trackingCount,
              onClick: () => onNavigate({ tab: 'purchases', purchasesTab: 'tracking' })
            }
          ]}
        />
      </div>

      {currentUser?.role === 'master' && (
        <Card className="border-dashed border-4 border-gray-100 shadow-none bg-transparent rounded-[40px] overflow-hidden">
          <CardContent className="p-10 text-center">
            <div className="flex flex-col items-center gap-4">
              <ShieldCheck className="w-12 h-12 text-gray-200" />
              <p className="text-gray-400 font-medium max-w-lg">
                Este painel apresenta um resumo executivo dos principais indicadores. 
                As liberações de acesso para outros usuários podem ser configuradas em <span className="font-black text-blue-500 cursor-pointer hover:underline" onClick={() => onNavigate('settings')}>Configurações</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

