import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, 
  Send, Camera, HardHat, Wrench, Users, FileText, AlertTriangle, 
  MapPin, CloudSun, Plus, Trash2, ShieldCheck, Download, Share2, 
  ChevronRight, Calendar, ArrowUpRight, Zap, Building2, Package, ArrowLeft, Layers,
  Search, Edit3, X, Eye, LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Contract, ServiceItem, ServiceProduction, ControllerEquipment, Employee, User, DailyReport, MobileSector, FieldProductionReport } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

export interface SyneraMobileViewProps {
  contracts: Contract[];
  services: ServiceItem[];
  serviceProductions: ServiceProduction[];
  equipments: ControllerEquipment[];
  employees: Employee[];
  currentUser: User;
  fieldReports?: FieldProductionReport[];
  onSaveFieldReport?: (report: FieldProductionReport) => void;
  onUpdateFieldReport?: (report: FieldProductionReport) => void;
  onUpdateServiceProduction: (p: ServiceProduction) => void;
  onAddWorkMovement?: (movement: any) => void;
  onSaveDailyReport?: (report: DailyReport) => void;
  onLogout?: () => void;
}

export interface OfflinePendingItem {
  id: string;
  type: 'production' | 'equipment' | 'headcount' | 'daily_log' | 'materials';
  timestamp: string;
  contractId: string;
  contractName: string;
  data: any;
  synced: boolean;
}

const CACHE_KEY = 'synera_mobile_cached_data_v1';
const OFFLINE_QUEUE_KEY = 'synera_mobile_offline_queue_v1';

function ServiceAutoComplete({
  services,
  selectedServiceId,
  onSelectService
}: {
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectService: (service: ServiceItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  const filteredServices = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(lower)) ||
      (s.code && s.code.toLowerCase().includes(lower))
    );
  }, [services, query]);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full min-h-[44px] rounded-2xl bg-slate-900 border border-slate-700 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
      >
        <span className={selectedService ? "font-extrabold text-xs text-blue-300 truncate max-w-[280px]" : "text-xs text-slate-400 font-medium"}>
          {selectedService ? `${selectedService.code ? `[${selectedService.code}] ` : ''}${selectedService.name} (${selectedService.unit || 'un'})` : 'Pesquisar e selecionar serviço do Controles...'}
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 right-0 top-12 z-50 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Digitar nome ou código do serviço..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 custom-scrollbar pr-1">
              {filteredServices.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">Nenhum serviço encontrado em Controles.</p>
              ) : (
                filteredServices.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectService(s);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedServiceId === s.id ? 'bg-blue-600/30 text-blue-300 font-extrabold border border-blue-500/40' : 'text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      {s.code && <span className="text-[10px] text-slate-400 font-mono">Cód: {s.code}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold shrink-0">
                      {s.unit || 'un'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SyneraMobileView({
  contracts,
  services,
  serviceProductions,
  equipments,
  employees,
  currentUser,
  fieldReports = [],
  onSaveFieldReport,
  onUpdateFieldReport,
  onUpdateServiceProduction,
  onAddWorkMovement,
  onSaveDailyReport,
  onLogout,
}: SyneraMobileViewProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  
  // Selected sector (null = Home/Landing page, or one of the 5 sector IDs or 'sincronizacao')
  const [activeSector, setActiveSector] = useState<MobileSector | 'sincronizacao' | null>(null);

  // Selected active contract in mobile
  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    return contracts[0]?.id || '';
  });

  // Offline Pending Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflinePendingItem[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // PWA Prompt event state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as any).standalone) ||
      localStorage.getItem('synera_pwa_installed') === 'true'
    );
  });
  const [showPwaGuide, setShowPwaGuide] = useState<boolean>(false);

  // Sync animation state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Modal of user's records & editing
  const [isMyRecordsOpen, setIsMyRecordsOpen] = useState<boolean>(false);
  const [editingMyRecord, setEditingMyRecord] = useState<FieldProductionReport | null>(null);

  // ----------------------------------------------------
  // Form states for field reporting
  // ----------------------------------------------------
  // 1. Produção (Sala Técnica)
  const [prodServiceId, setProdServiceId] = useState<string>('');
  const [prodQty, setProdQty] = useState<string>('');
  const [prodDate, setProdDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [prodTrecho, setProdTrecho] = useState<string>('');
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodPhoto, setProdPhoto] = useState<string>('');

  // 2. RH (Gestão de RH)
  const [teamPresent, setTeamPresent] = useState<string>('');
  const [teamAbsent, setTeamAbsent] = useState<string>('0');
  const [teamOvertime, setTeamOvertime] = useState<string>('0');
  const [teamLeader, setTeamLeader] = useState<string>('');
  const [teamNotes, setTeamNotes] = useState<string>('');

  // 3. Equipamentos (Controlador)
  const [eqId, setEqId] = useState<string>('');
  const [eqHorometer, setEqHorometer] = useState<string>('');
  const [eqFuel, setEqFuel] = useState<string>('');
  const [eqStatus, setEqStatus] = useState<string>('Em Operação');
  const [eqNotes, setEqNotes] = useState<string>('');

  // 4. Materiais (Almoxarife)
  const [matName, setMatName] = useState<string>('');
  const [matType, setMatType] = useState<'saida' | 'entrada' | 'requisicao'>('saida');
  const [matQty, setMatQty] = useState<string>('');
  const [matUnit, setMatUnit] = useState<string>('un');
  const [matNotes, setMatNotes] = useState<string>('');

  // 5. Administrador da Obra (Project Admin / Diário)
  const [logWeatherMorning, setLogWeatherMorning] = useState<string>('BOM');
  const [logWeatherAfternoon, setLogWeatherAfternoon] = useState<string>('BOM');
  const [logFiscalization, setLogFiscalization] = useState<string>('');
  const [logAccidents, setLogAccidents] = useState<string>('Sem ocorrências graves no dia.');

  // Network listeners & Cache update
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      try {
        localStorage.setItem('synera_pwa_installed', 'true');
      } catch (err) {
        console.warn('Erro ao salvar estado PWA:', err);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsPwaInstalled(true);
      try {
        localStorage.setItem('synera_pwa_installed', 'true');
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Cache dropdown metadata offline
  useEffect(() => {
    if (contracts.length > 0) {
      try {
        const cachePayload = {
          contracts: contracts.map(c => ({ id: c.id, name: c.name, code: c.code })),
          services: services.map(s => ({ id: s.id, contractId: s.contractId, name: s.name, unit: s.unit })),
          equipments: equipments.map(e => ({ id: e.id, code: e.code, name: e.name, contractId: e.contractId })),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      } catch (err) {
        console.warn('Erro ao salvar cache de metadados offline:', err);
      }
    }
  }, [contracts, services, equipments]);

  // Persist offline queue
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (err) {
      console.warn('Erro ao salvar fila offline:', err);
    }
  }, [offlineQueue]);

  // Lock contract for mobile users (they cannot choose more than 1 contract)
  useEffect(() => {
    if (currentUser?.allowedContractIds && currentUser.allowedContractIds.length > 0) {
      setSelectedContractId(currentUser.allowedContractIds[0]);
    } else if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
    }
  }, [currentUser, contracts, selectedContractId]);

  // Derived active contract
  const activeContract = useMemo(() => {
    return contracts.find(c => c.id === selectedContractId) || contracts[0] || { id: 'geral', name: 'Obra Principal' };
  }, [contracts, selectedContractId]);

  // Filtered services for current contract
  const contractServices = useMemo(() => {
    return services.filter(s => s.contractId === activeContract.id || !s.contractId);
  }, [services, activeContract]);

  // Filtered equipments
  const contractEquipments = useMemo(() => {
    return equipments.filter(e => e.contractId === activeContract.id || !e.contractId || e.contractId === 'all');
  }, [equipments, activeContract]);

  // Image Upload helper for mobile camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProdPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger PWA Install
  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        try {
          localStorage.setItem('synera_pwa_installed', 'true');
        } catch (e) {}
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaGuide(true);
    }
  };

  // Config list for the 5 requested field sectors linked to ERP modules
  const ALL_SECTORS: {
    id: MobileSector;
    name: string;
    erpLink: string;
    description: string;
    icon: React.ReactNode;
    cardBg: string;
    badgeBg: string;
  }[] = [
    {
      id: 'producao',
      name: 'Produção',
      erpLink: 'Vinculado à Sala Técnica',
      description: 'Lançamento de quantidades executadas em campo, trecho da obra e avanço de serviços.',
      icon: <HardHat className="w-6 h-6 text-blue-400" />,
      cardBg: 'from-blue-900/60 to-slate-900 border-blue-500/40 hover:border-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
      id: 'rh',
      name: 'RH',
      erpLink: 'Vinculado ao RH',
      description: 'Registro de frequência do efetivo, lançamento de faltas, presenças e horas extras.',
      icon: <Users className="w-6 h-6 text-indigo-400" />,
      cardBg: 'from-indigo-900/60 to-slate-900 border-indigo-500/40 hover:border-indigo-400',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    },
    {
      id: 'equipamentos',
      name: 'Equipamentos',
      erpLink: 'Ligado ao Controlador',
      description: 'Aferição de horímetros, consumo de combustível, lubrificantes e paradas da frota.',
      icon: <Wrench className="w-6 h-6 text-amber-400" />,
      cardBg: 'from-amber-900/60 to-slate-900 border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    {
      id: 'materiais',
      name: 'Materiais',
      erpLink: 'Ligado ao Almoxarife',
      description: 'Recebimento de insumos, romaneios, requisições de campo e saídas para aplicação.',
      icon: <Package className="w-6 h-6 text-emerald-400" />,
      cardBg: 'from-emerald-900/60 to-slate-900 border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'project_admin',
      name: 'Administrador da Obra',
      erpLink: 'Ligado ao Administrador da Obra',
      description: 'Relatório diário de obra (RDO), controle pluviométrico, clima e ocorrências graves.',
      icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
      cardBg: 'from-purple-900/60 to-slate-900 border-purple-500/40 hover:border-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    }
  ];

  // Filter sectors based on user permissions (if specific sectors are assigned)
  const visibleSectors = useMemo(() => {
    if (!currentUser?.mobileSectors || currentUser.mobileSectors.length === 0 || currentUser.role === 'master' || currentUser.role === 'admin') {
      return ALL_SECTORS;
    }
    return ALL_SECTORS.filter(s => currentUser.mobileSectors?.includes(s.id));
  }, [currentUser]);

  // Process sync offline queue
  const handleProcessSync = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    try {
      const todayStr = new Date().toISOString().slice(0, 7);

      for (const item of offlineQueue) {
        if (item.type === 'production') {
          const { serviceId, qty, trecho, notes, month } = item.data;
          
          const currentProd = serviceProductions.find(p => p.serviceId === serviceId && p.month === (month || todayStr)) || {
            id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            serviceId,
            month: month || todayStr,
            currentMonthQty: 0,
            accumulatedQty: 0,
            previousQty: 0,
            unitPrice: 0,
            dailyNotes: []
          };

          const updatedProd: ServiceProduction = {
            ...currentProd,
            currentMonthQty: (currentProd.currentMonthQty || 0) + qty,
            dailyNotes: [
              ...(currentProd.dailyNotes || []),
              {
                date: new Date().toISOString().slice(0, 10),
                qty: qty,
                note: `[SYNERA MOBILE / APONTADOR] ${trecho ? `Trecho: ${trecho}. ` : ''}${notes || ''}`,
                recordedBy: currentUser.name || 'Apontador de Campo'
              }
            ]
          };

          onUpdateServiceProduction(updatedProd);

          if (onAddWorkMovement) {
            const sName = services.find(s => s.id === serviceId)?.name || 'Serviço';
            onAddWorkMovement({
              sector: 'SALA TÉCNICA',
              action: 'APONTAMENTO DE CAMPO (PWA)',
              description: `Produção realizada no campo: ${qty} un em ${sName} (${item.contractName})`,
              referenceCode: `PWA-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Trecho/Local: ${trecho || 'Campo'}. ${notes || ''}`,
                productionValue: qty,
              }
            });
          }
        } else if (item.type === 'equipment') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'CONTROLADOR',
              action: 'MEDIÇÃO EQUIPAMENTO',
              description: `Aferição no equipamento ${item.data.equipmentName} (${item.data.horometer}h)`,
              referenceCode: `FROTA-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                equipmentName: item.data.equipmentName,
                hoursOrHorometer: item.data.horometer,
                notes: `Combustível: ${item.data.fuel}L. Status: ${item.data.status}. ${item.data.notes}`
              }
            });
          }
        } else if (item.type === 'headcount') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'RH',
              action: 'APONTAMENTO DE MÃO DE OBRA',
              description: `Registro de efetivo de campo: ${item.data.present} presentes, ${item.data.absent} faltas`,
              referenceCode: `RH-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Líder: ${item.data.leader}. Horas Extras: ${item.data.overtime}h. ${item.data.notes}`
              }
            });
          }
        } else if (item.type === 'materials') {
          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'ALMOXARIFE',
              action: item.data.type === 'entrada' ? 'RECEBIMENTO MATERIAL' : item.data.type === 'saida' ? 'SAÍDA PARA OBRA' : 'REQUISIÇÃO DE CAMPO',
              description: `Movimentação de material: ${item.data.qty} ${item.data.unit} de ${item.data.materialName}`,
              referenceCode: `ALMOX-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                materialName: item.data.materialName,
                quantity: item.data.qty,
                notes: item.data.notes
              }
            });
          }
        } else if (item.type === 'daily_log') {
          if (onSaveDailyReport) {
            const newReport: DailyReport = {
              id: `r-${Date.now()}`,
              contractId: item.contractId,
              date: new Date().toISOString().slice(0, 10),
              weatherMorning: item.data.weatherMorning,
              weatherAfternoon: item.data.weatherAfternoon,
              fiscalizationComments: item.data.fiscalization,
              accidents: item.data.accidents,
              manpower: [],
              equipment: [],
              activities: [],
              photos: []
            };
            onSaveDailyReport(newReport);
          }

          if (onAddWorkMovement) {
            onAddWorkMovement({
              sector: 'ADMINISTRADOR DA OBRA',
              action: 'DIÁRIO DE CAMPO',
              description: `Registro de diário de obra e ocorrências no campo`,
              referenceCode: `LOG-${item.id.slice(-4)}`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: `Clima: ${item.data.weatherMorning}/${item.data.weatherAfternoon}. Obs: ${item.data.fiscalization}`
              }
            });
          }
        }
      }

      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setSyncSuccessMsg('Todos os apontamentos salvos no celular foram sincronizados com o servidor!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erro na sincronização:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------
  // Form submission handlers
  // ----------------------------------------------------
  const handleSaveProduction = () => {
    if (!prodServiceId) {
      alert('Selecione o serviço para apontamento.');
      return;
    }
    const parsedQty = parseFloat(prodQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida produzida no campo.');
      return;
    }

    const serviceObj = services.find(s => s.id === prodServiceId);
    const reportDate = prodDate || new Date().toISOString().slice(0, 10);
    const isNowOnline = navigator.onLine;

    const newFieldReport: FieldProductionReport = {
      id: `f-rep-${Date.now()}`,
      contractId: activeContract.id,
      contractName: activeContract.name,
      serviceId: prodServiceId,
      serviceName: serviceObj?.name || 'Serviço',
      unit: serviceObj?.unit || 'un',
      qty: parsedQty,
      productionDate: reportDate,
      syncedAt: isNowOnline ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      trecho: prodTrecho,
      notes: prodNotes,
      photo: prodPhoto,
      reportedBy: currentUser.name || 'Apontador',
      reportedByEmail: currentUser.email,
      status: 'pending'
    };

    if (onSaveFieldReport) {
      onSaveFieldReport(newFieldReport);
    }

    const newQueueItem: OfflinePendingItem = {
      id: newFieldReport.id,
      type: 'production',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        serviceId: prodServiceId,
        serviceName: serviceObj?.name || 'Serviço',
        qty: parsedQty,
        unit: serviceObj?.unit || 'un',
        productionDate: reportDate,
        syncedAt: isNowOnline ? new Date().toISOString() : undefined,
        trecho: prodTrecho,
        notes: prodNotes,
        photo: prodPhoto
      },
      synced: isNowOnline
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setProdQty('');
    setProdTrecho('');
    setProdNotes('');
    setProdPhoto('');

    if (isNowOnline) {
      setSyncSuccessMsg('Apontamento de Produção salvo e enviado para a Sala Técnica!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } else {
      alert('Apontamento de Produção salvo OFFLINE! Será enviado para a Sala Técnica assim que reconectar.');
    }
  };

  const handleSaveEquipment = () => {
    if (!eqId) {
      alert('Selecione o equipamento/veículo.');
      return;
    }
    const parsedHoro = parseFloat(eqHorometer);
    if (isNaN(parsedHoro) || parsedHoro <= 0) {
      alert('Informe o horímetro ou quilometragem válida.');
      return;
    }

    const eqObj = equipments.find(e => e.id === eqId);
    const newQueueItem: OfflinePendingItem = {
      id: `pwa-eq-${Date.now()}`,
      type: 'equipment',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        equipmentId: eqId,
        equipmentName: `${eqObj?.code || ''} ${eqObj?.name || 'Equipamento'}`.trim(),
        horometer: parsedHoro,
        fuel: parseFloat(eqFuel) || 0,
        status: eqStatus,
        notes: eqNotes
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setEqHorometer('');
    setEqFuel('');
    setEqNotes('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Medição de Equipamento salva OFFLINE com sucesso!');
    }
  };

  const handleSaveHeadcount = () => {
    const parsedPres = parseInt(teamPresent, 10);
    if (isNaN(parsedPres) || parsedPres < 0) {
      alert('Informe o número de pessoas presentes no efetivo.');
      return;
    }

    const newQueueItem: OfflinePendingItem = {
      id: `pwa-team-${Date.now()}`,
      type: 'headcount',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        present: parsedPres,
        absent: parseInt(teamAbsent, 10) || 0,
        overtime: parseFloat(teamOvertime) || 0,
        leader: teamLeader || currentUser.name || 'Apontador',
        notes: teamNotes
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setTeamPresent('');
    setTeamAbsent('0');
    setTeamOvertime('0');
    setTeamNotes('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Registro de Efetivo salvo OFFLINE com sucesso!');
    }
  };

  const handleSaveMaterials = () => {
    if (!matName) {
      alert('Informe a descrição ou nome do material/insumo.');
      return;
    }
    const parsedQty = parseFloat(matQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida para movimentação.');
      return;
    }

    const newQueueItem: OfflinePendingItem = {
      id: `pwa-mat-${Date.now()}`,
      type: 'materials',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        materialName: matName,
        type: matType,
        qty: parsedQty,
        unit: matUnit,
        notes: matNotes
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setMatName('');
    setMatQty('');
    setMatNotes('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Movimentação de Material salva OFFLINE com sucesso!');
    }
  };

  const handleSaveDailyLog = () => {
    const newQueueItem: OfflinePendingItem = {
      id: `pwa-log-${Date.now()}`,
      type: 'daily_log',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        weatherMorning: logWeatherMorning,
        weatherAfternoon: logWeatherAfternoon,
        fiscalization: logFiscalization,
        accidents: logAccidents
      },
      synced: false
    };

    setOfflineQueue(prev => [newQueueItem, ...prev]);
    setLogFiscalization('');

    if (navigator.onLine) {
      setTimeout(() => handleProcessSync(), 300);
    } else {
      alert('Diário de Ocorrências salvo OFFLINE com sucesso!');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-slate-900 text-slate-100 font-sans shadow-2xl overflow-hidden relative border-x border-slate-800">
      
      {/* ---------------------------------------------------- */}
      {/* HEADER PRINCIPAL FIXO SYNERA MOBILE */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 p-4 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          
          {/* Official System Logo Emblem */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white">SYNERA</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 uppercase tracking-widest shadow-sm">
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400">Apontador de Campo PWA</p>
            </div>
          </div>

          {/* Connection Status Badge & Obra Vinculada */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black flex items-center gap-1.5 shadow-sm ${
                isOnline 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' 
                  : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ONLINE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    <span>OFFLINE</span>
                  </>
                )}
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors"
                  title="Sair do aplicativo"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 mt-1 text-right">
              <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black text-slate-200 truncate max-w-[150px]">
                {activeContract.name || activeContract.workName || activeContract.client || 'Obra Principal'}
              </span>
            </div>

            {offlineQueue.length > 0 && (
              <span className="text-[9px] text-amber-400 font-bold mt-0.5">
                {offlineQueue.length} pendentes
              </span>
            )}
          </div>
        </div>

        {/* Global Sync Notification Success */}
        {syncSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </motion.div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* CONTEÚDO DA PÁGINA: HOME OU SETOR SELECIONADO */}
      {/* ---------------------------------------------------- */}
      <div className="p-4 space-y-4">

        {/* ==================================================== */}
        {/* VISTA 1: PÁGINA INICIAL / LANDING PWA SYNERA MOBILE */}
        {/* ==================================================== */}
        {activeSector === null && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">

            {/* HERO CARD DE INSTALAÇÃO DO PWA COM ÍCONE DO SISTEMA */}
            {!isPwaInstalled && (
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 border border-blue-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 p-0.5 shadow-xl shadow-blue-500/20 shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-black text-sm text-white tracking-tight">Aplicativo Synera Mobile</h2>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                        PWA
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/90 leading-relaxed font-medium">
                      Instale o app direto no celular para trabalhar sem internet em locais isolados da obra.
                    </p>
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL DE INSTALAÇÃO DO PWA */}
                <Button
                  onClick={handleInstallPwa}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/25 mt-1"
                >
                  <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
                  Instalar PWA SYNERA MOBILE
                </Button>
              </div>
            )}

            {/* SEÇÃO DOS 5 SETORES DE CAMPO E SEUS VÍNCULOS COM O ERP */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Setores de Atuação no Campo
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{visibleSectors.length} Setores</span>
              </div>

              {/* GRID DOS 5 SETORES DE CAMPO */}
              <div className="grid grid-cols-1 gap-3">
                {visibleSectors.map(sector => (
                  <button
                    key={sector.id}
                    onClick={() => setActiveSector(sector.id)}
                    className={`w-full text-left p-4 rounded-3xl bg-gradient-to-r ${sector.cardBg} border transition-all duration-200 active:scale-[0.98] flex items-center justify-between shadow-xl group`}
                  >
                    <div className="flex items-start gap-3.5 pr-2">
                      <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner group-hover:scale-105 transition-transform">
                        {sector.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white group-hover:text-emerald-300 transition-colors">
                            {sector.name}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${sector.badgeBg}`}>
                            {sector.erpLink}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {sector.description}
                        </p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CARD QUICK ACCESS DA FILA DE SINCRONIZAÇÃO */}
            <div 
              onClick={() => setActiveSector('sincronizacao')}
              className="p-4 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Fila de Sincronização Offline</h4>
                  <p className="text-[11px] text-slate-400">
                    {offlineQueue.length === 0 ? 'Nenhum item pendente de envio' : `${offlineQueue.length} apontamento(s) armazenado(s) localmente`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                Ver Fila <ChevronRight className="w-4 h-4" />
              </span>
            </div>

          </motion.div>
        )}

        {/* ==================================================== */}
        {/* BARRA SUPERIOR DE NAVEGAÇÃO INTERNA DO SETOR */}
        {/* ==================================================== */}
        {activeSector !== null && (
          <div className="space-y-4">
            {/* Top Bar para Voltar à Home do PWA */}
            <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-md">
              <Button
                onClick={() => setActiveSector(null)}
                variant="ghost"
                className="h-9 px-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-xl gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Setores
              </Button>

              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Setor de Atuação</span>
                <span className="text-xs font-black text-emerald-400">
                  {activeSector === 'producao' && 'Produção • Sala Técnica'}
                  {activeSector === 'rh' && 'RH • Gestão de Pessoal'}
                  {activeSector === 'equipamentos' && 'Equipamentos • Controlador'}
                  {activeSector === 'materiais' && 'Materiais • Almoxarife'}
                  {activeSector === 'project_admin' && 'Administrador da Obra'}
                  {activeSector === 'sincronizacao' && 'Fila de Sincronização'}
                </span>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* SETOR 1: PRODUÇÃO (VINCULADO À SALA TÉCNICA) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'producao' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-5 h-5 text-blue-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Apontamento de Produção</h3>
                        <p className="text-[10px] text-blue-300">Vinculado à Sala Técnica (Controles)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Sala Técnica
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 mb-1 block">Serviço da Obra * (Controles)</Label>
                    <ServiceAutoComplete 
                      services={contractServices} 
                      selectedServiceId={prodServiceId} 
                      onSelectService={s => setProdServiceId(s.id)} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Quantidade Realizada *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.5"
                        value={prodQty}
                        onChange={e => setProdQty(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Data da Produção *</Label>
                      <Input
                        type="date"
                        value={prodDate}
                        onChange={e => setProdDate(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Estaca / Trecho / Local de Aplicação</Label>
                    <Input
                      placeholder="Ex: Estaca 120 ao 145 - Pista Esquerda"
                      value={prodTrecho}
                      onChange={e => setProdTrecho(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300 block mb-1">Observações de Campo</Label>
                    <textarea
                      rows={3}
                      placeholder="Descreva detalhes do serviço executado em campo, equipe utilizada, etc..."
                      value={prodNotes}
                      onChange={e => setProdNotes(e.target.value)}
                      className="w-full rounded-2xl bg-slate-900 border border-slate-700 text-white p-3 text-xs focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-500"
                    />
                  </div>

                  {/* Photo attachment */}
                  <div className="pt-1">
                    <Label className="text-xs font-bold text-slate-300 block mb-1">Foto da Evidência em Campo</Label>
                    <label className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 border border-dashed border-slate-700 cursor-pointer hover:border-blue-500 text-xs font-semibold text-slate-300">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>{prodPhoto ? '📷 Foto Capturada (Alterar)' : 'Tirar Foto com a Câmera'}</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handleSaveProduction}
                      className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <Send className="w-4 h-4" />
                      Registrar Produção no Celular
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsMyRecordsOpen(true)}
                      className="w-full h-10 rounded-2xl bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 font-bold text-xs gap-2"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Ver Meus Registros ({fieldReports.length})
                    </Button>
                  </div>
                </div>

                {/* MODAL MEUS REGISTROS / HISTÓRICO E EDIÇÃO */}
                <AnimatePresence>
                  {isMyRecordsOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl space-y-4"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-extrabold text-sm text-white">Meus Registros de Produção</h3>
                          </div>
                          <button onClick={() => setIsMyRecordsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
                          {fieldReports.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">Nenhum registro de campo efetuado ainda.</p>
                          ) : (
                            fieldReports.map(rep => (
                              <div key={rep.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-white truncate max-w-[200px]">{rep.serviceName}</span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                    rep.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                    rep.status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                                    'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}>
                                    {rep.status === 'approved' ? 'Aprovado' : rep.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                  <span>Qtd: <strong className="text-emerald-400 font-bold">{rep.qty} {rep.unit}</strong></span>
                                  <span>Data Prod: {new Date(rep.productionDate).toLocaleDateString('pt-BR')}</span>
                                </div>

                                {rep.trecho && <p className="text-[10px] text-slate-400">Trecho: {rep.trecho}</p>}
                                {rep.notes && <p className="text-[10px] text-slate-300 italic">"{rep.notes}"</p>}

                                <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                                  <span>Sincronizado: {rep.syncedAt ? new Date(rep.syncedAt).toLocaleTimeString('pt-BR') : 'Aguardando Sincronização'}</span>
                                  {rep.status === 'pending' && onUpdateFieldReport && (
                                    <button
                                      onClick={() => setEditingMyRecord(rep)}
                                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-[10px]"
                                    >
                                      <Edit3 className="w-3 h-3" /> Editar
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <Button onClick={() => setIsMyRecordsOpen(false)} className="w-full bg-slate-800 text-white rounded-2xl h-10 font-bold text-xs">
                          Fechar
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* MODAL DE EDIÇÃO RÁPIDA DE REGISTRO PENDENTE */}
                <AnimatePresence>
                  {editingMyRecord && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <h3 className="font-black text-sm text-white">Editar Apontamento de Produção</h3>
                          <button onClick={() => setEditingMyRecord(null)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Quantidade Realizada</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingMyRecord.qty}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, qty: parseFloat(e.target.value) || 0 })}
                              className="h-10 bg-slate-950 border-slate-800 text-white font-bold text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Data da Produção</Label>
                            <Input
                              type="date"
                              value={editingMyRecord.productionDate}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, productionDate: e.target.value })}
                              className="h-10 bg-slate-950 border-slate-800 text-white text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Estaca / Trecho</Label>
                            <Input
                              value={editingMyRecord.trecho || ''}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, trecho: e.target.value })}
                              className="h-10 bg-slate-950 border-slate-800 text-white text-xs mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-slate-300 font-bold">Observações de Campo</Label>
                            <textarea
                              rows={3}
                              value={editingMyRecord.notes || ''}
                              onChange={e => setEditingMyRecord({ ...editingMyRecord, notes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" onClick={() => setEditingMyRecord(null)} className="flex-1 bg-slate-800 text-slate-300 border-none rounded-xl text-xs font-bold">
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              if (onUpdateFieldReport) {
                                onUpdateFieldReport(editingMyRecord);
                              }
                              setEditingMyRecord(null);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black"
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 2: RH (VINCULADO AO RH) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'rh' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Apontamento de Efetivo & Presença</h3>
                        <p className="text-[10px] text-indigo-300">Vinculado ao Gestão de RH</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Gestão RH
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Presentes na Obra *</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 18"
                        value={teamPresent}
                        onChange={e => setTeamPresent(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Faltas / Ausências</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 2"
                        value={teamAbsent}
                        onChange={e => setTeamAbsent(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Horas Extras Totais (hs)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 4.5"
                        value={teamOvertime}
                        onChange={e => setTeamOvertime(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Encarregado / Líder</Label>
                      <Input
                        placeholder="Ex: Carlos M. Santos"
                        value={teamLeader}
                        onChange={e => setTeamLeader(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Observações de RH / Ocorrências</Label>
                    <Input
                      placeholder="Ex: 2 colaboradores em treinamento de NR-35."
                      value={teamNotes}
                      onChange={e => setTeamNotes(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveHeadcount}
                    className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm gap-2 shadow-lg shadow-indigo-600/30"
                  >
                    <Send className="w-4 h-4" />
                    Registrar Presença no Celular
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 3: EQUIPAMENTOS (LIGADO AO CONTROLADOR) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'equipamentos' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Medição de Equipamento & Frota</h3>
                        <p className="text-[10px] text-amber-300">Ligado ao Controlador</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Controlador
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Equipamento / Máquina *</Label>
                    <Select value={eqId} onValueChange={setEqId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1">
                        <SelectValue placeholder="Selecione o equipamento..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                        {contractEquipments.map(e => (
                          <SelectItem key={e.id} value={e.id} className="text-xs font-semibold py-2">
                            {e.code ? `[${e.code}] ` : ''}{e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Horímetro / KM Atual *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 4520.5"
                        value={eqHorometer}
                        onChange={e => setEqHorometer(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Abastecimento (Litros)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 120"
                        value={eqFuel}
                        onChange={e => setEqFuel(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Status Operacional</Label>
                    <Select value={eqStatus} onValueChange={setEqStatus}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-semibold text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                        <SelectItem value="Em Operação">🟢 Em Operação Normal</SelectItem>
                        <SelectItem value="Parado Manutenção">🔴 Parado para Manutenção</SelectItem>
                        <SelectItem value="Stand-by / Reserva">🟡 Stand-by / Reserva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Observações de Manutenção</Label>
                    <Input
                      placeholder="Ex: Troca de filtro de óleo prevista para amanhã."
                      value={eqNotes}
                      onChange={e => setEqNotes(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveEquipment}
                    className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-amber-500/30"
                  >
                    <Send className="w-4 h-4" />
                    Registrar Medição no Celular
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 4: MATERIAIS (LIGADO AO ALMOXARIFE) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'materiais' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Movimentação de Materiais</h3>
                        <p className="text-[10px] text-emerald-300">Ligado ao Almoxarife</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Almoxarife
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Tipo de Movimento *</Label>
                    <Select value={matType} onValueChange={(v: any) => setMatType(v)}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                        <SelectItem value="saida">📤 Saída para Obra / Aplicação</SelectItem>
                        <SelectItem value="entrada">📥 Entrada / Recebimento de Insumo</SelectItem>
                        <SelectItem value="requisicao">📋 Requisição de Campo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Descrição ou Código do Material *</Label>
                    <Input
                      placeholder="Ex: Cimento CP-II (Saco 50kg) ou Tubo PVC 100mm"
                      value={matName}
                      onChange={e => setMatName(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-bold text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Quantidade *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50"
                        value={matQty}
                        onChange={e => setMatQty(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-extrabold text-sm mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Unidade de Medida</Label>
                      <Input
                        placeholder="Ex: sc, m, m³, un, kg"
                        value={matUnit}
                        onChange={e => setMatUnit(e.target.value)}
                        className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Observações / Fornecedor / Destino</Label>
                    <Input
                      placeholder="Ex: Entregue à equipe de concreto do trecho 2."
                      value={matNotes}
                      onChange={e => setMatNotes(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveMaterials}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Send className="w-4 h-4" />
                    Registrar Material no Celular
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* SETOR 5: ADMINISTRADOR DA OBRA (PROJECT ADMIN / DIÁRIO) */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'project_admin' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-400" />
                      <div>
                        <h3 className="font-black text-sm text-white">Diário de Obra & Ocorrências (RDO)</h3>
                        <p className="text-[10px] text-purple-300">Ligado ao Administrador da Obra</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Admin da Obra
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-300">Clima Manhã</Label>
                      <Select value={logWeatherMorning} onValueChange={setLogWeatherMorning}>
                        <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                          <SelectItem value="BOM">☀️ Bom / Limpo</SelectItem>
                          <SelectItem value="NUBLADO">☁️ Nublado</SelectItem>
                          <SelectItem value="CHUVA_FRACA">🌧️ Chuva Fraca</SelectItem>
                          <SelectItem value="CHUVA_FORTE">⛈️ Chuva Forte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-300">Clima Tarde</Label>
                      <Select value={logWeatherAfternoon} onValueChange={setLogWeatherAfternoon}>
                        <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-2xl">
                          <SelectItem value="BOM">☀️ Bom / Limpo</SelectItem>
                          <SelectItem value="NUBLADO">☁️ Nublado</SelectItem>
                          <SelectItem value="CHUVA_FRACA">🌧️ Chuva Fraca</SelectItem>
                          <SelectItem value="CHUVA_FORTE">⛈️ Chuva Forte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Comentários da Fiscalização / Cliente</Label>
                    <Input
                      placeholder="Ex: Engenheiro fiscal inspecionou a drenagem."
                      value={logFiscalization}
                      onChange={e => setLogFiscalization(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Segurança do Trabalho & Ocorrências</Label>
                    <Input
                      value={logAccidents}
                      onChange={e => setLogAccidents(e.target.value)}
                      className="h-11 rounded-2xl bg-slate-900 border-slate-700 text-white font-medium text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleSaveDailyLog}
                    className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm gap-2 shadow-lg shadow-purple-600/30"
                  >
                    <Send className="w-4 h-4" />
                    Registrar Diário no Celular
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TELA DA FILA DE SINCRONIZAÇÃO */}
            {/* ---------------------------------------------------- */}
            {activeSector === 'sincronizacao' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-amber-400" />
                      <h3 className="font-black text-sm text-white">Fila de Armazenamento Local</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {offlineQueue.length} Registros Off-line
                    </span>
                  </div>

                  {offlineQueue.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="font-bold text-xs text-white">Todos os dados do seu celular estão sincronizados!</p>
                      <p className="text-[11px] text-slate-400">Você pode continuar apontando dados em campo mesmo sem sinal de internet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {offlineQueue.map(item => (
                        <div key={item.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                              <span className="uppercase text-[10px] font-black px-1.5 py-0.5 bg-slate-800 rounded">
                                {item.type}
                              </span>
                              <span>{item.contractName}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">
                              {item.type === 'production' && `Produção: ${item.data.qty} ${item.data.unit} (${item.data.serviceName})`}
                              {item.type === 'equipment' && `Equipamento: ${item.data.equipmentName} (${item.data.horometer}h)`}
                              {item.type === 'headcount' && `Equipe: ${item.data.present} presentes, ${item.data.absent} faltas`}
                              {item.type === 'materials' && `Material: ${item.data.qty} ${item.data.unit} de ${item.data.materialName}`}
                              {item.type === 'daily_log' && `Diário de Campo / Clima`}
                            </p>
                            <span className="text-[9px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString('pt-BR')}</span>
                          </div>

                          <button
                            onClick={() => setOfflineQueue(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {offlineQueue.length > 0 && (
                    <Button
                      disabled={!isOnline || isSyncing}
                      onClick={handleProcessSync}
                      className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-amber-500/30"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isOnline ? 'Enviar Todos para o Servidor' : 'Aguardando Sinal de Conexão'}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        )}

      </div>

      {/* PWA Manual Guide Modal / Instructions */}
      <AnimatePresence>
        {showPwaGuide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }} 
              animate={{ y: 0 }} 
              exit={{ y: 100 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 text-white space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-black text-base text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                  <span>Instalar PWA no Celular</span>
                </div>
                <button onClick={() => setShowPwaGuide(false)} className="text-slate-400 text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg">
                  Fechar
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="font-extrabold text-blue-400 block mb-1">📱 No iPhone (iOS Safari):</span>
                  <p>1. Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima).</p>
                  <p>2. Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="font-extrabold text-emerald-400 block mb-1">🤖 No Android (Google Chrome):</span>
                  <p>1. Toque nos <strong>três pontinhos (⋮)</strong> no canto superior do navegador.</p>
                  <p>2. Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</p>
                </div>
              </div>

              <Button onClick={() => setShowPwaGuide(false)} className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-slate-950">
                Entendi
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
