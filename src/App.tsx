import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Briefcase, FileText, Search, 
  ChevronRight, LogOut, User as UserIcon, Lock, Edit, 
  FileSpreadsheet, Settings, Calendar, Percent, ShieldCheck,
  ClipboardList, Users, Calculator, BarChart3, Landmark,
  BookOpen, CloudRain, HardHat, Truck, Users2, Activity,
  RefreshCw, ShoppingCart, GripVertical, AlertCircle, Database, XCircle
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './lib/useLocalStorage';
import { Resource, ServiceComposition, Quotation, User, ABCConfig, BudgetGroup, BDIConfig, AuditLog, UserRole, Contract, Measurement, MeasurementTemplate, CalculationMemory, HighwayLocation, StationGroup, CubationData, TransportData, ServiceProduction, Employee, TimeRecord, DailyReport, DailyReportActivity, PluviometryRecord, TechnicalSchedule, DashboardConfig, ControllerTeam, ControllerEquipment, EquipmentMonthlyData, ControllerManpower, ManpowerMonthlyData, TeamAssignment, MarketingConfig, AppModule, PasswordResetRequest, EquipmentTransfer, Supplier, PurchaseOrder, EmailConfig, PurchaseRequest, PurchaseQuotation, EquipmentMaintenance } from './types';
import { cn, hashPassword } from './lib/utils';
import { calculateBDI } from './lib/calculations';
import { compressImage } from './lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Views
import { Dashboard } from './components/Dashboard';
import { ResourceView } from './components/ResourceView';
import { ServiceView } from './components/ServiceView';
import { QuotationView } from './components/QuotationView';
import { BudgetView } from './components/BudgetView';
import { BDIView } from './components/BDIView';
import { ABCCurveView } from './components/ABCCurveView';
import { ScheduleView } from './components/ScheduleView';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { MeasurementsView } from './components/MeasurementsView';
import RHView from './components/RHView';
import ControlView from './components/ControlView';
import PurchasesView from './components/PurchasesView';
import { ProjectAdminView } from './components/ProjectAdminView';
import { UserProfile } from './components/UserProfile';
import { Chat } from './components/Chat';

import { getSupabaseConfig, createSupabaseClient } from './lib/supabaseClient';

const mapToSnake = (obj: any) => {
  if (!obj) return obj;
  const result: any = {};
  for (const key in obj) {
    // Basic camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

const mapToCamel = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapToCamel);
  
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/(_\w)/g, letter => letter[1].toUpperCase());
    result[camelKey] = typeof obj[key] === 'object' ? mapToCamel(obj[key]) : obj[key];
  }
  return result;
};

export default function App() {
  // Helper for SessionStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const item = window.sessionStorage.getItem('sigo_current_user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  });

  const setAndSaveCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      // Security: Never save password or sensitive fields locally
      const secureUser = { ...user };
      delete (secureUser as any).password;
      window.sessionStorage.setItem('sigo_current_user', JSON.stringify(secureUser));
    } else {
      window.sessionStorage.removeItem('sigo_current_user');
    }
  };

  // Security: Immediate logout on internet disconnection
  React.useEffect(() => {
    const handleOffline = () => {
      if (currentUser) {
        console.warn('[Security] Connection lost. Logging out for safety.');
        setAndSaveCurrentUser(null);
        alert('Conexão com a internet perdida. Você foi desconectado por segurança.');
      }
    };

    window.addEventListener('offline', handleOffline);
    
    // Also check on interval just in case
    const interval = setInterval(() => {
      if (currentUser && !navigator.onLine) {
        handleOffline();
      }
    }, 5000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [currentUser]);

  const compId = currentUser?.companyId;

  const [mainTab, setMainTab] = useState<'home' | 'quotations' | 'measurements' | 'rh' | 'control' | 'purchases' | 'project_admin' | 'settings' | 'admin' | 'profile'>('home');
  const [activeTab, setActiveTab] = useState<'resources' | 'services' | 'quotations' | 'budget' | 'bdi' | 'abc' | 'schedule' | 'reports'>('budget');
  const [activeMeasureTab, setActiveMeasureTab] = useState<'contracts' | 'measurements' | 'measure' | 'controls' | 'rdo' | 'pluviometria' | 'schedule' | 'teams' | 'reports' | 'summary'>('contracts');
  const [activeRHTab, setActiveRHTab] = useState('employees');
  const [activeControlTab, setActiveControlTab] = useState('list');
  const [activePurchasesTab, setActivePurchasesTab] = useState('suppliers');
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false);
  const [supabaseSyncError, setSupabaseSyncError] = useState<string | null>(null);
  const lastLocalUpdate = React.useRef<number>(0);

  const defaultDashboardConfig: DashboardConfig = {
    sections: [
      {
        moduleId: 'quotations',
        label: 'Cotações',
        visible: true,
        items: [
          { id: 'total_resources', label: 'Insumos', visible: true },
          { id: 'total_services', label: 'Serviços', visible: true },
          { id: 'total_quotations', label: 'Cotações', visible: true },
        ]
      },
      {
        moduleId: 'measurements',
        label: 'Sala Técnica',
        visible: true,
        items: [
          { id: 'open_measurements', label: 'Medição', visible: true },
          { id: 'total_reports', label: 'Diário de Obra', visible: true },
        ]
      },
      {
        moduleId: 'rh',
        label: 'RH',
        visible: true,
        items: [
          { id: 'total_employees', label: 'Funcionários', visible: true },
          { id: 'total_records', label: 'Ponto', visible: true },
        ]
      },
      {
        moduleId: 'control',
        label: 'Controlador',
        visible: true,
        items: [
          { id: 'team_summary', label: 'Equipes', visible: true },
          { id: 'equipment_costs', label: 'Equipamentos', visible: true },
          { id: 'manpower_costs', label: 'Mão de Obra', visible: true }
        ]
      }
    ]
  };

  const defaultMarketingConfig: MarketingConfig = {
    modulePrices: [
      { moduleId: 'quotations', label: 'Cotações', price: 150 },
      { moduleId: 'measurements', label: 'Sala Técnica', price: 250 },
      { moduleId: 'rh', label: 'RH', price: 100 },
      { moduleId: 'control', label: 'Controlador', price: 200 },
      { moduleId: 'purchases', label: 'Compras', price: 150 },
      { moduleId: 'project_admin', label: 'Administrador da Obra', price: 150 },
      { moduleId: 'settings', label: 'Administrador', price: 50 },
    ],
    plans: [
      { id: 'p-1', name: 'Básico', description: 'Ideal para profissionais liberais', price: 199, features: ['1 Empresa', 'Cotações Ilimitadas'], modules: ['quotations'] },
      { id: 'p-2', name: 'Pro', description: 'Para pequenas construtoras', price: 499, features: ['3 Empresas', 'Cotações & Medições'], modules: ['quotations', 'measurements'] },
      { id: 'p-3', name: 'Enterprise', description: 'Gestão completa para sua obra', price: 999, features: ['Empresas Ilimitadas', 'Acesso Total'], modules: ['quotations', 'measurements', 'rh', 'control', 'purchases', 'project_admin', 'settings'] },
    ]
  };

  const [resources, setResources] = useLocalStorage<Resource[]>('sconet_resources', [], compId);
  const [services, setServices] = useLocalStorage<ServiceComposition[]>('sconet_services', [], compId);
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>('sconet_quotations', [], compId);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('sigo_employees', [], compId);
  const [timeRecords, setTimeRecords] = useLocalStorage<TimeRecord[]>('sigo_time_records', [], compId);
  const [dailyReports, setDailyReports] = useLocalStorage<DailyReport[]>('sigo_daily_reports', [], compId);
  const [pluviometryRecords, setPluviometryRecords] = useLocalStorage<PluviometryRecord[]>('sigo_pluviometry_records', [], compId);
  const [technicalSchedules, setTechnicalSchedules] = useLocalStorage<TechnicalSchedule[]>('sigo_technical_schedules', [], compId);
  const [schedules, setSchedules] = useLocalStorage<any[]>('sconet_schedules', [], compId);
  const [budgetItems, setBudgetItems] = useLocalStorage<{serviceId: string, quantity: number}[]>('sconet_current_budget', [], compId);
  const [budgetGroups, setBudgetGroups] = useLocalStorage<BudgetGroup[]>('sconet_budget_groups', [], compId);
  const [abcConfig, setAbcConfig] = useLocalStorage<ABCConfig>('sigo_abc_config', { limitA: 80, limitB: 15 }, compId);
  const [bdiConfig, setBdiConfig] = useLocalStorage<BDIConfig>('sigo_bdi_config', {
    ac: 5,
    s: 0.5,
    r: 1,
    g: 0.5,
    df: 1,
    l: 8,
    i: 13.15
  }, compId);
  const [users, setUsers] = useLocalStorage<User[]>('sigo_users', [
    {
      id: 'admin-vittor',
      name: 'Vittor David',
      username: 'vittor',
      password: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // '123' hashed
      role: 'master',
      companyId: 'root',
      companyName: 'SIGO Root'
    }
  ]);

  const [auditLogs, setAuditLogs] = useLocalStorage<AuditLog[]>('sigo_audit_logs', [], compId);
  const [passwordResetRequests, setPasswordResetRequests] = useLocalStorage<PasswordResetRequest[]>('sigo_reset_requests', []);
  const [companyLogo, setCompanyLogo] = useLocalStorage<string>('sigo_company_logo', '', compId);
  const [companyLogoRight, setCompanyLogoRight] = useLocalStorage<string>('sigo_company_logo_right', '', compId);
  const [logoMode, setLogoMode] = useLocalStorage<'left' | 'right' | 'both' | 'none'>('sigo_logo_mode', 'left', compId);
  const [contracts, setContracts] = useLocalStorage<Contract[]>('sconet_contracts', [], compId);
  const [measurements, setMeasurements] = useLocalStorage<Measurement[]>('sconet_measurements', [], compId);
  const [serviceProductions, setServiceProductions] = useLocalStorage<ServiceProduction[]>('sigo_service_productions', [], compId);
  const [measurementTemplates, setMeasurementTemplates] = useLocalStorage<MeasurementTemplate[]>('sigo_measurement_templates', [], compId);
  const [calculationMemories, setCalculationMemories] = useLocalStorage<CalculationMemory[]>('sigo_calc_memories', [], compId);
  const [highwayLocations, setHighwayLocations] = useLocalStorage<HighwayLocation[]>('sigo_highway_locations', [], compId);
  const [stationGroups, setStationGroups] = useLocalStorage<StationGroup[]>('sigo_station_groups', [], compId);
  const [cubationData, setCubationData] = useLocalStorage<CubationData[]>('sigo_cubation_data', [], compId);
  const [transportData, setTransportData] = useLocalStorage<TransportData[]>('sigo_transport_data', [], compId);
  const [controllerTeams, setControllerTeams] = useLocalStorage<ControllerTeam[]>('sigo_controller_teams', [], compId);
  const [controllerEquipments, setControllerEquipments] = useLocalStorage<ControllerEquipment[]>('sigo_controller_equipments', [], compId);
  const [equipmentMaintenance, setEquipmentMaintenance] = useLocalStorage<EquipmentMaintenance[]>('sigo_equipment_maintenance', [], compId);
  const [equipmentMonthlyData, setEquipmentMonthlyData] = useLocalStorage<EquipmentMonthlyData[]>('sigo_equipment_monthly', [], compId);
  const [equipmentTransfers, setEquipmentTransfers] = useLocalStorage<EquipmentTransfer[]>('sigo_equipment_transfers', [], compId);
  const [manpowerRecords, setManpowerRecords] = useLocalStorage<ControllerManpower[]>('sigo_controller_manpower', [], compId);
  const [manpowerMonthlyData, setManpowerMonthlyData] = useLocalStorage<ManpowerMonthlyData[]>('sigo_manpower_monthly', [], compId);
  const [teamAssignments, setTeamAssignments] = useLocalStorage<TeamAssignment[]>('sigo_team_assignments', [], compId);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('sigo_suppliers', [], compId);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('sigo_purchase_orders', [], compId);
  const [purchaseRequests, setPurchaseRequests] = useLocalStorage<PurchaseRequest[]>('sigo_purchase_requests', [], compId);
  const [purchaseQuotations, setPurchaseQuotations] = useLocalStorage<PurchaseQuotation[]>('sigo_purchase_quotations', [], compId);
  const [dashboardConfig, setDashboardConfig] = useLocalStorage<DashboardConfig>('sigo_dashboard_config', defaultDashboardConfig, compId);
  const [chargesPerc, setChargesPerc] = useLocalStorage<number>('sigo_ctrl_charges', 0, compId);
  const [otPerc, setOtPerc] = useLocalStorage<number>('sigo_ctrl_ot', 50, compId);
  const [marketingConfig, setMarketingConfig] = useLocalStorage<MarketingConfig>('sigo_marketing_config', defaultMarketingConfig);
  const [defaultOrganization, setDefaultOrganization] = useLocalStorage<string>('sigo_default_org', 'SIGO SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS', compId);
  const [systemConfig, setSystemConfig] = useLocalStorage<any[]>('sigo_system_config', [], compId);
  const [emailConfig, setEmailConfig] = useLocalStorage<EmailConfig>('sigo_email_config', {}, compId);
  
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Custom navigation helper to support sub-tabs
  const handleNavigate = (target: string | { tab: string; subTab?: string; measureTab?: string; rhTab?: string; controlTab?: string; purchasesTab?: string }) => {
    if (typeof target === 'string') {
      setMainTab(target as any);
    } else {
      if (target.tab) setMainTab(target.tab as any);
      if (target.subTab) setActiveTab(target.subTab as any);
      if (target.measureTab) setActiveMeasureTab(target.measureTab as any);
      if (target.rhTab) setActiveRHTab(target.rhTab as any);
      if (target.controlTab) setActiveControlTab(target.controlTab as any);
      if (target.purchasesTab) setActivePurchasesTab(target.purchasesTab as any);
    }
  };

  // Sync logic when user changes
  useEffect(() => {
    if (currentUser?.id) {
      const config = getSupabaseConfig();
      if (config.enabled) {
        console.log('[App] Supabase enabled, clearing local data keys to ensure fresh sync...');
        const keysToKeep = ['supabase_config'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.some(k => key === k)) {
            localStorage.removeItem(key);
          }
        }
      }
      setIsSupabaseSynced(false);
      setSupabaseSyncError(null);
      syncFromSupabase(currentUser.companyId);
    }
  }, [currentUser?.id, currentUser?.companyId]);


  const defaultTechnicalRoomOrder = [
    { id: 'contracts', label: 'Contratos', icon: 'HardHat' },
    { id: 'summary', label: 'Resumo', icon: 'ClipboardList' },
    { id: 'measurements', label: 'Planilha', icon: 'FileSpreadsheet' },
    { id: 'measure', label: 'Medir', icon: 'Calculator' },
    { id: 'rdo', label: 'Diário (RDO)', icon: 'BookOpen' },
    { id: 'pluviometria', label: 'Pluviometria', icon: 'CloudRain' },
    { id: 'schedule', label: 'Cronograma', icon: 'Calendar' },
    { id: 'teams', label: 'Equipes', icon: 'Users2' },
    { id: 'controls', label: 'Controles', icon: 'BarChart3' },
    { id: 'reports', label: 'Relatório', icon: 'FileText' }
  ];

  const technicalRoomOrder = useMemo(() => {
    const saved = systemConfig.find(c => c.configKey === 'technical_room_modules_order');
    if (saved && Array.isArray(saved.configValue)) {
      // Ensure all current modules are present in the saved order
      const savedIds = saved.configValue.map((m: any) => m.id);
      const missing = defaultTechnicalRoomOrder.filter(m => !savedIds.includes(m.id));
      return [...saved.configValue, ...missing];
    }
    return defaultTechnicalRoomOrder;
  }, [systemConfig]);

  const updateTechnicalRoomOrder = async (newOrder: any[]) => {
    const configKey = 'technical_room_modules_order';
    const existing = systemConfig.find(c => c.configKey === configKey);
    
    const newConfigItem = {
      id: existing?.id || uuidv4(),
      companyId: currentUser?.companyId || 'default',
      configKey: configKey,
      configValue: newOrder,
      updatedAt: new Date().toISOString()
    };

    const newConfigs = systemConfig.filter(c => c.configKey !== configKey);
    newConfigs.push(newConfigItem);
    setSystemConfig(newConfigs);

    // Save to Supabase
    const config = getSupabaseConfig();
    if (config.enabled && currentUser?.companyId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        await supabase
          .from('system_config')
          .upsert(mapToSnake(newConfigItem));
      }
    }
  };



  const filteredResources = currentUser?.role === 'master' ? resources : resources.filter(r => !r.companyId || r.companyId === 'default' || r.companyId === currentUser?.companyId);
  const filteredServices = currentUser?.role === 'master' ? services : services.filter(s => !s.companyId || s.companyId === 'default' || s.companyId === currentUser?.companyId);
  const filteredQuotationsList = currentUser?.role === 'master' ? quotations : quotations.filter(q => !q.companyId || q.companyId === currentUser?.companyId);
  const filteredAuditLogs = currentUser?.role === 'master' ? auditLogs : auditLogs.filter(log => !log.companyId || log.companyId === currentUser?.companyId);
  const filteredContracts = currentUser?.role === 'master' ? contracts : contracts.filter(c => !c.companyId || c.companyId === currentUser?.companyId);
  const filteredMeasurements = currentUser?.role === 'master' ? measurements : measurements.filter(m => !m.companyId || m.companyId === currentUser?.companyId);
  const filteredUsers = currentUser?.role === 'master' ? users : users.filter(u => u.companyId === currentUser?.companyId);
  const filteredDailyReports = currentUser?.role === 'master' ? dailyReports : dailyReports.filter(r => !r.companyId || r.companyId === currentUser?.companyId);
  const filteredEmployees = currentUser?.role === 'master' ? employees : employees.filter(e => !e.companyId || e.companyId === currentUser?.companyId);
  const filteredTimeRecords = currentUser?.role === 'master' ? timeRecords : timeRecords.filter(t => !t.companyId || t.companyId === currentUser?.companyId);

  const finalQuotations = (currentUser?.role === 'master' || currentUser?.role === 'admin') 
    ? filteredQuotationsList 
    : filteredQuotationsList.filter(q => currentUser?.allowedQuotationIds?.includes(q.id));

  const finalContracts = (currentUser?.role === 'master' || currentUser?.role === 'admin')
    ? filteredContracts 
    : filteredContracts.filter(c => currentUser?.allowedContractIds?.includes(c.id));

  const allowedContractIds = useMemo(() => new Set(finalContracts.map(c => c.id)), [finalContracts]);

  const finalMeasurements = useMemo(() => filteredMeasurements.filter(m => allowedContractIds.has(m.contractId)), [filteredMeasurements, allowedContractIds]);
  const finalDailyReports = useMemo(() => filteredDailyReports.filter(r => allowedContractIds.has(r.contractId)), [filteredDailyReports, allowedContractIds]);
  const finalTechnicalSchedules = useMemo(() => technicalSchedules.filter(s => allowedContractIds.has(s.contractId)), [technicalSchedules, allowedContractIds]);
  const finalControllerTeams = useMemo(() => controllerTeams.filter(t => !t.contractId || allowedContractIds.has(t.contractId)), [controllerTeams, allowedContractIds]);
  const finalControllerEquipments = useMemo(() => controllerEquipments.filter(e => !e.contractId || allowedContractIds.has(e.contractId)), [controllerEquipments, allowedContractIds]);
  const filteredControllerManpower = useMemo(() => {
    const baseManpower = manpowerRecords.filter(m => !m.contractId || allowedContractIds.has(m.contractId));
    
    // Add active employees from RH
    const rhEmployees = filteredEmployees.filter(e => 
      e.status === 'active' && 
      (!e.contractId || allowedContractIds.has(e.contractId))
    );
    
    const combined = [...baseManpower];
    const seenIds = new Set(baseManpower.map(m => m.id));
    
    rhEmployees.forEach(e => {
      if (!seenIds.has(e.id)) {
        combined.push({
          id: e.id,
          companyId: e.companyId,
          contractId: e.contractId,
          name: e.name,
          role: e.role,
          entryDate: e.admissionDate,
          exitDate: e.dismissalDate,
        } as ControllerManpower);
      }
    });
    
    return combined;
  }, [manpowerRecords, filteredEmployees, allowedContractIds]);
  const finalSuppliers = useMemo(() => suppliers.filter(s => !s.companyId || s.companyId === compId), [suppliers, compId]);
  const finalPurchaseRequests = useMemo(() => purchaseRequests.filter(r => (!r.companyId || r.companyId === compId) && (!r.contractId || allowedContractIds.has(r.contractId))), [purchaseRequests, compId, allowedContractIds]);
  const finalPurchaseQuotations = useMemo(() => purchaseQuotations.filter(q => (!q.companyId || q.companyId === compId)), [purchaseQuotations, compId]);
  const finalPurchaseOrders = useMemo(() => purchaseOrders.filter(o => !o.contractId || allowedContractIds.has(o.contractId)), [purchaseOrders, allowedContractIds]);
  const finalHighwayLocations = useMemo(() => highwayLocations.filter(l => allowedContractIds.has(l.contractId)), [highwayLocations, allowedContractIds]);
  const finalStationGroups = useMemo(() => stationGroups.filter(g => allowedContractIds.has(g.contractId)), [stationGroups, allowedContractIds]);
  const finalCubationData = useMemo(() => cubationData.filter(d => allowedContractIds.has(d.contractId)), [cubationData, allowedContractIds]);
  const finalTransportData = useMemo(() => transportData.filter(d => allowedContractIds.has(d.contractId)), [transportData, allowedContractIds]);
  const finalCalculationMemories = useMemo(() => calculationMemories.filter(m => allowedContractIds.has(m.contractId)), [calculationMemories, allowedContractIds]);
  const finalServiceProductions = useMemo(() => serviceProductions.filter(p => allowedContractIds.has(p.contractId)), [serviceProductions, allowedContractIds]);
  const finalPluviometryRecords = useMemo(() => pluviometryRecords.filter(r => allowedContractIds.has(r.contractId)), [pluviometryRecords, allowedContractIds]);
  const finalMeasurementTemplates = useMemo(() => measurementTemplates.filter(t => !t.contractId || (t.contractId && allowedContractIds.has(t.contractId))), [measurementTemplates, allowedContractIds]);

  // Helper to deduplicate arrays by ID
  const deduplicateById = <T extends { id: string | number }>(arr: T[]): T[] => {
    const seen = new Set();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const syncFromSupabase = async (targetCompanyId?: string, isPolling: boolean = false) => {
    const config = getSupabaseConfig();
    if (config.enabled && config.url && config.key) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (!supabase) {
        setIsSupabaseSynced(true);
        setSupabaseSyncError('CLIENT_INIT_FAILED');
        return null;
      }

      setSupabaseSyncError(null);
      try {
        const activeId = targetCompanyId || currentUser?.companyId;
        
        // Defer polling if we just made a local update to allow DB to catch up
        if (isPolling && Date.now() - lastLocalUpdate.current < 10000) {
          return null;
        }

        if (!isPolling) console.log(`[Database] Syncing data (Context: ${activeId || 'Initial/Users Only'})...`);
        
        // Security: Only fetch sigo_users on initial load, or company-specific data if logged in
        let blobQuery = supabase.from('app_state').select('*');
        let usersQuery = supabase.from('users').select('*');

        if (activeId) {
          // Fetch company specific blobs + global users blob
          blobQuery = blobQuery.or(`id.eq.sigo_users,id.ilike.${activeId}_%`);
          // Fetch users for this company (or everyone if master)
          if (currentUser?.role !== 'master') {
            usersQuery = usersQuery.eq('company_id', activeId);
          }
        } else {
          // Fetch ONLY global users blob on initial load
          blobQuery = blobQuery.eq('id', 'sigo_users');
        }

        const [blobRes, usersRes] = await Promise.all([
          blobQuery,
          usersQuery
        ]);

        const blobData = blobRes.data;
        const dbUsers = usersRes.data;

        // Security: Single Session Enforcement
        if (currentUser && dbUsers) {
          const dbUserObj = dbUsers.find(u => u.id === currentUser.id);
          if (dbUserObj) {
            const camelUser = mapToCamel(dbUserObj);
            // If DB has a session ID and it doesn't match ours, someone else logged in
            if (camelUser.sessionId && currentUser.sessionId && camelUser.sessionId !== currentUser.sessionId) {
              console.warn('[Security] Multiple logins detected. Session invalidated.', {
                local: currentUser.sessionId,
                db: camelUser.sessionId
              });
              setAndSaveCurrentUser(null);
              alert('Sua conta foi conectada em outro dispositivo. Você foi desconectado por segurança.');
              return null;
            }
          }
        }

        const blobMap: Record<string, any> = {};
        
        if (blobData) {
          blobData.forEach(item => {
            blobMap[item.id] = item.content;
          });
        }

        // If we got users directly from the table, merge them with the ones in the blob (table takes priority)
        if (dbUsers && dbUsers.length > 0) {
          const camelUsers = dbUsers.map(u => mapToCamel(u));
          const existingUsersBlob = blobMap['sigo_users'] || [];
          
          const combinedUsers = [...existingUsersBlob];
          camelUsers.forEach(u => {
            const idx = combinedUsers.findIndex(ex => ex.id === u.id);
            if (idx >= 0) combinedUsers[idx] = u;
            else combinedUsers.push(u);
          });
          blobMap['sigo_users'] = combinedUsers;
        }

        const tableMap: Record<string, { key: string, setter: (val: any) => void }> = {
          'resources': { key: 'sconet_resources', setter: setResources },
          'service_compositions': { key: 'sconet_services', setter: setServices },
          'quotations': { key: 'sconet_quotations', setter: setQuotations },
          'contracts': { key: 'sconet_contracts', setter: setContracts },
          'measurements': { key: 'sconet_measurements', setter: setMeasurements },
          'audit_logs': { key: 'sigo_audit_logs', setter: setAuditLogs },
          'highway_locations': { key: 'sigo_highway_locations', setter: setHighwayLocations },
          'station_groups': { key: 'sigo_station_groups', setter: setStationGroups },
          'cubation_data': { key: 'sigo_cubation_data', setter: setCubationData },
          'transport_data': { key: 'sigo_transport_data', setter: setTransportData },
          'calculation_memories': { key: 'sigo_calc_memories', setter: setCalculationMemories },
          'service_productions': { key: 'sigo_service_productions', setter: setServiceProductions },
          'daily_reports': { key: 'sigo_daily_reports', setter: setDailyReports },
          'pluviometry_records': { key: 'sigo_pluviometry_records', setter: setPluviometryRecords },
          'technical_schedules': { key: 'sigo_technical_schedules', setter: setTechnicalSchedules },
          'controller_teams': { key: 'sigo_controller_teams', setter: setControllerTeams },
          'controller_equipments': { key: 'sigo_controller_equipments', setter: setControllerEquipments },
          'equipment_maintenance': { key: 'sigo_equipment_maintenance', setter: setEquipmentMaintenance },
          'equipment_monthly_data': { key: 'sigo_equipment_monthly', setter: setEquipmentMonthlyData },
          'controller_manpower': { key: 'sigo_controller_manpower', setter: setManpowerRecords },
          'manpower_monthly_data': { key: 'sigo_manpower_monthly', setter: setManpowerMonthlyData },
          'team_assignments': { key: 'sigo_team_assignments', setter: setTeamAssignments },
          'suppliers': { key: 'sigo_suppliers', setter: setSuppliers },
          'purchase_orders': { key: 'sigo_purchase_orders', setter: setPurchaseOrders },
          'purchase_requests': { key: 'sigo_purchase_requests', setter: setPurchaseRequests },
          'purchase_quotations': { key: 'sigo_purchase_quotations', setter: setPurchaseQuotations },
          'equipment_transfers': { key: 'sigo_equipment_transfers', setter: setEquipmentTransfers },
          'employees': { key: 'sigo_employees', setter: setEmployees },
          'time_records': { key: 'sigo_time_records', setter: setTimeRecords },
          'dashboard_config': { key: 'sigo_dashboard_config', setter: setDashboardConfig },
          'ctrl_charges': { key: 'sigo_ctrl_charges', setter: setChargesPerc },
          'ctrl_ot': { key: 'sigo_ctrl_ot', setter: setOtPerc },
          'measurement_templates': { key: 'sigo_measurement_templates', setter: setMeasurementTemplates },
          'budget_schedules': { key: 'sconet_schedules', setter: setSchedules },
          'system_config': { key: 'sigo_system_config', setter: setSystemConfig },
          'users': { key: 'sigo_users', setter: setUsers }
        };

        const isMaster = currentUser?.role === 'master' && !targetCompanyId;

        // Configuration and Tables
        const finalData: Record<string, any> = { ...blobMap };

        const fetchPromises = Object.keys(tableMap).map(async (tableName) => {
          const { key, setter } = tableMap[tableName];
          const namespacedKey = activeId ? `${activeId}_${key}` : key;
          
          // Skip fetching mostly everything if no activeId (user not logged in)
          if (!activeId && tableName !== 'users') {
             return;
          }
          
          // Try individual table first for better granularity and most recent data
          let allData: any[] = [];
          let hasError = false;
          let from = 0;
          const pageSize = 1000;
          let keepFetching = true;

          while (keepFetching) {
            let query = supabase.from(tableName).select('*').range(from, from + pageSize - 1);
            if (activeId && tableName !== 'users' && !isMaster) {
              // Include items that belong to the company OR have no company (global/shared) OR are marked as 'default'
              if (tableName === 'service_compositions' || tableName === 'resources') {
                query = query.or(`company_id.eq.${activeId},company_id.is.null,company_id.eq.default`);
              } else {
                query = query.eq('company_id', activeId);
              }
            }
            
            const { data, error } = await query;
            if (error) {
              console.warn(`[Sync] Error fetching ${tableName}:`, error);
              hasError = true;
              keepFetching = false;
            } else if (data) {
              allData = [...allData, ...data];
              if (data.length < pageSize) keepFetching = false;
              else from += pageSize;
            } else {
              keepFetching = false;
            }
          }

          if (tableName === 'service_compositions' && allData.length > 0) {
            console.log(`[Sync] Fetched ${allData.length} services from Supabase`);
          }
          
          let finalVal: any[] = [];
          const blobData = blobMap[namespacedKey] || (tableName === 'users' ? blobMap[key] : null);
          const parsedBlobData = blobData ? (Array.isArray(blobData) ? blobData : [blobData]) : [];

          if (!hasError && allData.length > 0) {
            const camelData = allData.map(mapToCamel);
            
            // Union both sources: keep all from DB, and add those from Blob that are missing in DB
            const dbIds = new Set(camelData.map(item => item.id));
            const extraBlobItems = parsedBlobData.filter((b: any) => b?.id && !dbIds.has(b.id));
            
            const combined = [...camelData, ...extraBlobItems];
            
            // Merge matching items to preserve fields from both, avoiding overwriting with null/empty from DB
            finalVal = combined.map(item => {
              const blobItem = parsedBlobData.find((b: any) => b?.id === item.id);
              if (!blobItem) return item;
              
              // Start with blob data as it's often the historical source of truth
              const merged = { ...blobItem };
              // Only overwrite with database data if the value is not null/undefined
              Object.keys(item).forEach(k => {
                if (item[k] !== null && item[k] !== undefined) {
                  merged[k] = item[k];
                }
              });
              return merged;
            });
            
            finalVal = deduplicateById(finalVal);
          } else if (!hasError && allData.length === 0) {
            finalVal = deduplicateById(parsedBlobData);
          } else {
            // Table error (e.g. doesn't exist), fallback to blob
            finalVal = deduplicateById(parsedBlobData);
          }
          
          setter((prev: any) => {
            if (JSON.stringify(prev) === JSON.stringify(finalVal)) return prev;
            return finalVal;
          });
          finalData[key] = finalVal;
        });

        await Promise.all(fetchPromises);

        const loadBlob = (k: string, setter: (v: any) => void) => {
          const val = activeId ? (blobMap[`${activeId}_${k}`] || blobMap[k]) : blobMap[k];
          if (val) {
            setter((prev: any) => JSON.stringify(prev) === JSON.stringify(val) ? prev : val);
          }
        };

        loadBlob('sigo_abc_config', setAbcConfig);
        loadBlob('sigo_bdi_config', setBdiConfig);
        loadBlob('sigo_company_logo', setCompanyLogo);
        loadBlob('sigo_default_org', setDefaultOrganization);

        setIsSupabaseSynced(true);
        return finalData;
      } catch (e) {
        console.error('Supabase sync exception:', e);
        setSupabaseSyncError('CONNECTION_FAILED');
        setIsSupabaseSynced(true);
        return null;
      }
    }
    setIsSupabaseSynced(true);
    return null;
  };

  // Ensure a contract is selected by default if active tab is dashboard or measurements
  React.useEffect(() => {
    if (!selectedContractId && finalContracts.length > 0) {
      setSelectedContractId(finalContracts[0].id);
    } else if (selectedContractId && finalContracts.length > 0 && !finalContracts.some(c => c.id === selectedContractId)) {
      setSelectedContractId(finalContracts[0].id);
    }
  }, [finalContracts, selectedContractId]);

  const addAuditLog = (action: string, module: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      companyId: currentUser.companyId,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details,
      module
    };
    setAuditLogs([newLog, ...auditLogs].slice(0, 1000));
  };

  const syncFnRef = React.useRef(syncFromSupabase);
  React.useEffect(() => {
    syncFnRef.current = syncFromSupabase;
  });

  // Supabase Initial Load & Polling
  React.useEffect(() => {
    syncFnRef.current();
    
    // Poll every 10 seconds to ensure 100% cloud sync
    const interval = setInterval(() => {
      syncFnRef.current(undefined, true);
    }, 10000);
    return () => clearInterval(interval);
  }, []); // Only on mount

  // Fetch employees by contract when selecting it in RH view
  useEffect(() => {
    if (mainTab === 'rh' && selectedContractId && isSupabaseSynced) {
      const fetchEmployeesByContract = async () => {
        const config = getSupabaseConfig();
        if (!config.enabled) return;
        const supabase = createSupabaseClient(config.url, config.key);
        if (!supabase) return;

        console.log(`[Supabase] Buscando colaboradores para o contrato: ${selectedContractId}`);
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('contract_id', selectedContractId);

        if (!error && data) {
          const camelData = data.map(mapToCamel);
          setEmployees(prev => {
            // Unify: replace items for this contract with fresh ones, keep others
            const others = prev.filter(e => e.contractId !== selectedContractId);
            const newList = [...others, ...camelData];
            return JSON.stringify(prev) === JSON.stringify(newList) ? prev : newList;
          });
          
          // Also fetch time records for these employees if possible
          const employeeIds = camelData.map(e => e.id);
          if (employeeIds.length > 0) {
            const { data: recordsData, error: recordsError } = await supabase
              .from('time_records')
              .select('*')
              .in('employee_id', employeeIds);
            
            if (!recordsError && recordsData) {
              const camelRecords = recordsData.map(mapToCamel);
              setTimeRecords(prev => {
                const others = prev.filter(r => !employeeIds.includes(r.employeeId));
                const newList = [...others, ...camelRecords];
                return JSON.stringify(prev) === JSON.stringify(newList) ? prev : newList;
              });
            }
          }
        }
      };
      
      fetchEmployeesByContract();
    }
  }, [selectedContractId, mainTab, isSupabaseSynced]);

  const handleSyncAllToSupabase = async () => {
    const config = getSupabaseConfig();
    if (!config.enabled || !config.url || !config.key || !currentUser) return;
    const supabase = createSupabaseClient(config.url, config.key);
    if (!supabase) return;

    const compId = currentUser.companyId;

    const dataToSync = [
      { id: `${compId}_sconet_resources`, content: resources },
      { id: `${compId}_sconet_services`, content: services },
      { id: `${compId}_sconet_quotations`, content: quotations },
      { id: `${compId}_sconet_schedules`, content: schedules },
      { id: `${compId}_sconet_current_budget`, content: budgetItems },
      { id: `${compId}_sconet_budget_groups`, content: budgetGroups },
      { id: `${compId}_sigo_abc_config`, content: abcConfig },
      { id: `${compId}_sigo_bdi_config`, content: bdiConfig },
      { id: 'sigo_users', content: users }, // Shared
      { id: `${compId}_sigo_audit_logs`, content: auditLogs },
      { id: `${compId}_sigo_company_logo`, content: companyLogo },
      { id: `${compId}_sconet_contracts`, content: contracts },
      { id: `${compId}_sconet_measurements`, content: measurements },
      { id: `${compId}_sigo_service_productions`, content: serviceProductions },
      { id: `${compId}_sigo_measurement_templates`, content: measurementTemplates },
      { id: `${compId}_sigo_calc_memories`, content: calculationMemories },
      { id: `${compId}_sigo_highway_locations`, content: highwayLocations },
      { id: `${compId}_sigo_station_groups`, content: stationGroups },
      { id: `${compId}_sigo_cubation_data`, content: cubationData },
      { id: `${compId}_sigo_transport_data`, content: transportData },
      { id: `${compId}_sigo_default_org`, content: defaultOrganization },
      { id: `${compId}_sigo_employees`, content: employees },
      { id: `${compId}_sigo_time_records`, content: timeRecords },
      { id: `${compId}_sigo_dashboard_config`, content: dashboardConfig },
      { id: `${compId}_sigo_daily_reports`, content: dailyReports },
      { id: `${compId}_sigo_pluviometry_records`, content: pluviometryRecords },
      { id: `${compId}_sigo_technical_schedules`, content: technicalSchedules },
      { id: `${compId}_sigo_controller_teams`, content: controllerTeams },
      { id: `${compId}_sigo_controller_equipments`, content: controllerEquipments },
      { id: `${compId}_sigo_equipment_maintenance`, content: equipmentMaintenance },
      { id: `${compId}_sigo_equipment_monthly`, content: equipmentMonthlyData },
      { id: `${compId}_sigo_controller_manpower`, content: manpowerRecords },
      { id: `${compId}_sigo_manpower_monthly`, content: manpowerMonthlyData },
      { id: `${compId}_sigo_team_assignments`, content: teamAssignments },
      { id: `${compId}_sigo_suppliers`, content: suppliers },
      { id: `${compId}_sigo_purchase_orders`, content: purchaseOrders },
      { id: `${compId}_sigo_purchase_requests`, content: purchaseRequests },
      { id: `${compId}_sigo_purchase_quotations`, content: purchaseQuotations },
      { id: `${compId}_sigo_equipment_transfers`, content: equipmentTransfers },
      { id: `${compId}_sigo_ctrl_charges`, content: chargesPerc },
      { id: `${compId}_sigo_ctrl_ot`, content: otPerc },
    ];

    const tableMap: Record<string, string> = {
      'sconet_resources': 'resources',
      'sconet_services': 'service_compositions',
      'sconet_quotations': 'quotations',
      'sconet_contracts': 'contracts',
      'sconet_measurements': 'measurements',
      'sigo_audit_logs': 'audit_logs',
      'sigo_highway_locations': 'highway_locations',
      'sigo_station_groups': 'station_groups',
      'sigo_cubation_data': 'cubation_data',
      'sigo_transport_data': 'transport_data',
      'sigo_calc_memories': 'calculation_memories',
      'sigo_service_productions': 'service_productions',
      'sigo_daily_reports': 'daily_reports',
      'sigo_pluviometry_records': 'pluviometry_records',
      'sigo_technical_schedules': 'technical_schedules',
      'sigo_controller_teams': 'controller_teams',
      'sigo_controller_equipments': 'controller_equipments',
      'sigo_equipment_maintenance': 'equipment_maintenance',
      'sigo_equipment_monthly': 'equipment_monthly_data',
      'sigo_controller_manpower': 'controller_manpower',
      'sigo_manpower_monthly': 'manpower_monthly_data',
      'sigo_team_assignments': 'team_assignments',
      'sigo_suppliers': 'suppliers',
      'sigo_purchase_orders': 'purchase_orders',
      'sigo_purchase_requests': 'purchase_requests',
      'sigo_purchase_quotations': 'purchase_quotations',
      'sigo_equipment_transfers': 'equipment_transfers',
      'sigo_employees': 'employees',
      'sigo_time_records': 'time_records',
      'sigo_dashboard_config': 'dashboard_config',
      'sigo_measurement_templates': 'measurement_templates',
      'sconet_schedules': 'budget_schedules',
      'sigo_users': 'users'
    };

    const mapToSnake = (obj: any) => {
      const newObj: any = { company_id: compId };
      for (const k in obj) {
        if (k === 'selectedSupplierId' || k === 'selected_supplier_id') continue;
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[k];
      }
      return newObj;
    };

    try {
      console.log(`[Supabase] Iniciando sincronização completa para: ${compId}`);
      let successCount = 0;
      let failCount = 0;

      const syncItem = async (item: any) => {
        try {
          // 1. Sync blob
          const { error: blobError } = await supabase.from('app_state').upsert(item);
          if (blobError) {
            console.error(`Erro ao sincronizar blob ${item.id}:`, blobError);
            // We do not return here! We still MUST try to sync the individual table.
            // failCount will NOT be incremented for missing app_state so that we don't spam errors
            // if the user hasn't created the app_state table in their Supabase.
          }

          // 2. Sync individual table
          const baseId = (compId && item.id.startsWith(`${compId}_`))
            ? item.id.substring(compId.length + 1)
            : item.id;
          const targetTable = tableMap[baseId];
          
          if (targetTable && Array.isArray(item.content)) {
            // Identify and delete orphans 
            const { data: dbItems, error: fetchError } = await supabase.from(targetTable).select('id').eq('company_id', compId);
            if (fetchError) {
              console.error(`Erro ao buscar órfãos em ${targetTable}:`, fetchError);
            } else {
              const dbIds = dbItems?.map(d => d.id) || [];
              const currentIds = (item.content as any[]).map(c => c.id);
              const toDelete = dbIds.filter(id => !currentIds.includes(id));

              if (toDelete.length > 0) {
                const { error: delError } = await supabase.from(targetTable).delete().in('id', toDelete);
                if (delError) console.error(`Erro ao deletar órfãos em ${targetTable}:`, delError);
              }
            }

            if (item.content.length > 0) {
              const mappedData = item.content.map(mapToSnake);
              // Chunking for large datasets
              const chunkSize = 50;
              for (let i = 0; i < mappedData.length; i += chunkSize) {
                const chunk = mappedData.slice(i, i + chunkSize);
                const { error: tError } = await supabase.from(targetTable).upsert(chunk);
                if (tError) {
                  console.error(`Erro ao sincronizar pedaço da tabela ${targetTable}:`, tError);
                }

                if (targetTable === 'technical_schedules' && !tError) {
                  for (const schedule of chunk) {
                    if (schedule.services && Array.isArray(schedule.services)) {
                      const currentServiceIds = schedule.services.map((s: any) => s.serviceId || s.service_id);
                      if (currentServiceIds.length > 0) {
                        await supabase.from('technical_schedule_services')
                          .delete()
                          .eq('technical_schedule_id', schedule.id)
                          .not('service_id', 'in', `(${currentServiceIds.join(',')})`);
                      } else {
                        await supabase.from('technical_schedule_services')
                          .delete()
                          .eq('technical_schedule_id', schedule.id);
                      }
                      
                      const servicesToInsert = schedule.services.map((s: any) => ({
                         technical_schedule_id: schedule.id,
                         service_id: s.serviceId || s.service_id,
                         distribution: s.distribution
                      }));
                      
                      if (servicesToInsert.length > 0) {
                         const { error: tsErr } = await supabase.from('technical_schedule_services').upsert(
                            servicesToInsert,
                            { onConflict: 'technical_schedule_id, service_id' }
                         );
                         if (tsErr) console.error('Erro ao sincronizar technical_schedule_services:', tsErr);
                      }
                    }
                  }
                }
              }
            }
          }
          successCount++;
        } catch (innerErr) {
          console.error(`Erro inesperado ao sincronizar item ${item.id}:`, innerErr);
          failCount++;
        }
      };

      await Promise.all(dataToSync.map(syncItem));

      console.log(`[Supabase] Sincronização completa finalizada. Sucessos: ${successCount}, Falhas: ${failCount}`);
      if (failCount > 0) {
        console.error(`[Supabase] ${failCount} itens falharam ao sincronizar. Isso pode ocorrer devido a falta de conexao ou esquemas desatualizados. As alteracoes foram salvas localmente e serao tentadas novamente.`);
      }
    } catch (e) {
      console.error('[Supabase] Falha Crítica na Sincronização:', e);
      throw e;
    }
  };

  const handleLogout = async () => {
    // Reset all navigation states
    setMainTab('home');
    setActiveTab('budget');
    setActiveMeasureTab('contracts');
    setSelectedContractId(null);
    setSelectedMeasurementId(null);

    // Clear local storage for app data on logout
    const keysToKeep = ['supabase_config'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }

    if (currentUser) {
      // Clear sessionId in the database before logging out locally
      const config = getSupabaseConfig();
      if (config.enabled) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, sessionId: null } : u);
          await supabase.from('app_state').upsert({ id: 'sigo_users', content: updatedUsers });
          setUsers(updatedUsers);
        }
      }
    }
    setAndSaveCurrentUser(null);
  };

  // --- Realtime Session Validation ---
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.enabled || !currentUser?.sessionId) return;

    const supabase = createSupabaseClient(config.url, config.key);
    if (!supabase) return;

    // Monitor for changes in the users blob to see if our sessionId changed elsewhere
    const channel = supabase
      .channel('session-monitor')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'app_state',
        filter: 'id=eq.sigo_users'
      }, (payload: any) => {
        const latestUsers: User[] = payload.new.content;
        const myData = latestUsers.find(u => u.id === currentUser.id);
        
        if (myData && myData.sessionId && myData.sessionId !== currentUser.sessionId) {
          // New session started elsewhere!
          alert('Sua conta foi conectada em outro local. Esta sessão foi encerrada por segurança.');
          
          // Full cleanup of local state
          window.sessionStorage.removeItem('sigo_current_user');
          setAndSaveCurrentUser(null);
          setMainTab('home');
          window.location.reload();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.sessionId]);

  // Clean up session if browser is closed/refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser) {
        const config = getSupabaseConfig();
        if (config.enabled && config.url && config.key) {
           const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, sessionId: null } : u);
           
           // Use fetch with keepalive which allows custom headers (unlike sendBeacon)
           const url = `${config.url}/rest/v1/app_state?id=eq.sigo_users`;
           const payload = JSON.stringify({ id: 'sigo_users', content: updatedUsers });
           
           try {
             fetch(url, {
               method: 'PATCH', // PostgREST uses PATCH (or UPSERT via POST with Prefer headers, but we just use PATCH for simplicity of updating an existing row)
               headers: {
                 'Content-Type': 'application/json',
                 'apikey': config.key,
                 'Authorization': `Bearer ${config.key}`,
               },
               body: JSON.stringify({ content: updatedUsers }),
               keepalive: true
             });
           } catch {
             // fallback
           }
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, users]);

  // --- Technical Management (RDO, Pluviometry, Schedule) ---
  const addDailyReport = async (report: Omit<DailyReport, 'id'>) => {
    const newId = uuidv4();
    const fullReport = { ...report, id: newId, companyId: currentUser?.companyId };
    setDailyReports(prev => [...prev, fullReport]);
    addAuditLog('Adição', 'Sala Técnica', `RDO adicionado para: ${report.date}`);
    
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('daily_reports').upsert(mapToSnake(fullReport));
          console.log('[Supabase] RDO persisted immediately');
        } catch (err) {
          console.warn('[Sync] RDO persistence failed', err);
        }
      }
    }
  };

  const updateDailyReport = async (updated: DailyReport) => {
    setDailyReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('daily_reports').upsert(mapToSnake(updated), { onConflict: 'contract_id,date' });
          console.log('[Supabase] RDO updated immediately');
        } catch (err) {
          console.warn('[Sync] RDO update failed', err);
        }
      }
    }
  };

  const deleteDailyReport = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este RDO? Todos os dados vinculados serão perdidos.")) return;
    const reportToDelete = dailyReports.find(r => r.id === id);
    setDailyReports(prev => prev.filter(r => r.id !== id));
    addAuditLog('Exclusão', 'Sala Técnica', `RDO excluído para data: ${reportToDelete?.date || id}`);
  };

  const moveDailyReportActivity = (activityId: string, fromReportId: string, toDate: string, contractId: string) => {
    setDailyReports(prev => {
      let movedActivity: DailyReportActivity | null = null;
      
      const intermediateReports = prev.map(report => {
        if (report.id === fromReportId) {
          movedActivity = report.activities.find(a => a.id === activityId) || null;
          return {
            ...report,
            activities: report.activities.filter(a => a.id !== activityId)
          };
        }
        return report;
      });

      if (!movedActivity) return prev;

      const targetReportIdx = intermediateReports.findIndex(r => r.date === toDate && r.contractId === contractId);
      
      if (targetReportIdx !== -1) {
        return intermediateReports.map((r, idx) => 
          idx === targetReportIdx 
            ? { ...r, activities: [...r.activities, movedActivity!] }
            : r
        );
      } else {
        const newReport: DailyReport = {
          id: uuidv4(),
          contractId,
          date: toDate,
          weatherMorning: 'Bom',
          weatherAfternoon: 'Bom',
          weatherNight: 'Bom',
          rainfallMm: 0,
          manpower: [],
          equipment: [],
          activities: [movedActivity!],
          accidents: '',
          fiscalizationComments: ''
        };
        return [...intermediateReports, newReport];
      }
    });
  };

  const addPluviometryRecord = (record: Omit<PluviometryRecord, 'id'>) => {
    const newId = uuidv4();
    setPluviometryRecords(prev => [...prev, { ...record, id: newId, companyId: currentUser?.companyId }]);
  };

  const updatePluviometryRecord = async (updated: PluviometryRecord) => {
    setPluviometryRecords(prev => prev.map(r => r.id === updated.id ? updated : r));

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('pluviometry_records').upsert(mapToSnake(updated), { onConflict: 'contract_id,date' });
          console.log('[Supabase] Pluviometry persisted immediately');
        } catch (err) {
          console.warn('[Sync] Pluviometry persist failed', err);
        }
      }
    }
  };

  const updateTechnicalSchedule = async (schedule: TechnicalSchedule) => {
    setTechnicalSchedules(prev => {
      const idx = prev.findIndex(s => s.contractId === schedule.contractId);
      if (idx >= 0) return prev.map((s, i) => i === idx ? { ...schedule, companyId: currentUser?.companyId } : s);
      const newId = uuidv4();
      return [...prev, { ...schedule, id: newId, companyId: currentUser?.companyId }];
    });
    addAuditLog('Edição', 'Sala Técnica', `Cronograma técnico atualizado`);

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const toSync = { ...schedule, companyId: currentUser?.companyId };
          if (!toSync.id) toSync.id = uuidv4();
          await supabase.from('technical_schedules').upsert(mapToSnake(toSync));
          
          if (toSync.services && Array.isArray(toSync.services)) {
            const currentServiceIds = toSync.services.map((s: any) => s.serviceId);
            if (currentServiceIds.length > 0) {
              await supabase.from('technical_schedule_services')
                .delete()
                .eq('technical_schedule_id', toSync.id)
                .not('service_id', 'in', `(${currentServiceIds.join(',')})`);
            } else {
              await supabase.from('technical_schedule_services')
                .delete()
                .eq('technical_schedule_id', toSync.id);
            }
            
            const servicesToInsert = toSync.services.map((s: any) => ({
              technical_schedule_id: toSync.id,
              service_id: s.serviceId,
              distribution: s.distribution
            }));
            
            if (servicesToInsert.length > 0) {
              const { error: tsErr } = await supabase.from('technical_schedule_services').upsert(
                servicesToInsert,
                { onConflict: 'technical_schedule_id, service_id' }
              );
              if (tsErr) console.error('[Supabase] Technical schedule services persist failed', tsErr);
            }
          }
          
          console.log('[Supabase] Schedule persisted immediately');
        } catch (err) {
          console.warn('[Sync] Schedule persist failed', err);
        }
      }
    }
  };


  // --- Auth State ---
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regHasCompany, setRegHasCompany] = useState(false);
  const [regCompanyInfo, setRegCompanyInfo] = useState('');
  const [regDesiredPlan, setRegDesiredPlan] = useState('');
  const [regDesiredModules, setRegDesiredModules] = useState<AppModule[]>([]);
  const [resetEmail, setResetEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setSupabaseSyncError(null);
    
    try {
      let latestUsers = users;

      // 1. If Supabase is enabled, sync first to ensure we have the latest users from the CLOUD
      const config = getSupabaseConfig();
      if (config.enabled) {
        try {
          const data = await syncFromSupabase();
          if (data && data['sigo_users']) {
            latestUsers = data['sigo_users'];
          } else {
            console.warn('[Login] Supabase sync returned no users. Falling back to local/default.');
          }
        } catch (syncErr) {
          console.error('[Login] Supabase connection failed:', syncErr);
          alert('Erro de conexão com o Supabase. Não foi possível autenticar via nuvem.');
          setSupabaseSyncError('Falha na conexão');
          setIsLoggingIn(false);
          return;
        }
      }

      // 2. Now search for the user in the refreshed state
      const trimmedPassword = loginPassword.trim();
      const hashedInput = await hashPassword(trimmedPassword);
      
      let foundUser = latestUsers.find(u => 
        (u.username || '').toLowerCase() === loginUsername.toLowerCase() || 
        (u.email || '').toLowerCase() === loginUsername.toLowerCase()
      );

      // If not found in blob, try checking the table directly if Supabase is enabled
      if (!foundUser && config.enabled) {
        console.log('[Login] User not found in blob, checking users table directly...');
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          try {
            const { data: dbUser, error: dbError } = await supabase
              .from('users')
              .select('*')
              .or(`username.ilike.${loginUsername},email.ilike.${loginUsername}`)
              .maybeSingle();

            if (dbUser) {
              console.log('[Login] User found in users table:', dbUser.username);
              foundUser = mapToCamel(dbUser);
              latestUsers = [...latestUsers.filter(u => u.id !== foundUser?.id), foundUser];
            } else {
              // Check if DB is totally empty to potentially seed the master user
              const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
              if (count === 0 && loginUsername.toLowerCase() === 'vittor') {
                console.log('[Login] empty database detected. Seeding master user "vittor"...');
                const newUser: User = {
                  id: uuidv4(),
                  name: 'Administrador Master',
                  username: 'vittor',
                  password: hashedInput,
                  role: 'master',
                  isApproved: true,
                  isActive: true,
                  companyId: 'default'
                };
                await supabase.from('users').upsert(mapToSnake(newUser));
                foundUser = newUser;
                latestUsers = [newUser];
                alert('Banco de dados novo detectado. Usuário "vittor" criado com a senha informada.');
              }
            }
          } catch (err) {
            console.error('[Login] Exception during user lookup/seed:', err);
          }
        }
      }

      if (!foundUser) {
        console.warn('[Login] Authentication failed: User not found.', { username: loginUsername });
        alert('Usuário ou email não encontrado. Verifique se digitou corretamente.');
        return;
      }

      const storedPass = (foundUser.password || '').trim();
      const isPlainMatch = storedPass === trimmedPassword;
      const isHashMatch = storedPass.toLowerCase() === hashedInput.toLowerCase();
      const isValid = isPlainMatch || isHashMatch;

      if (isValid) {
        console.log('[Login] Authentication successful for:', foundUser.username);
        const user = { ...foundUser, password: hashedInput }; // Always work with hash in memory
        
        if (user.isActive === false) {
          alert('Este usuário está inativo. Entre em contato com o administrador.');
          return;
        }

        const isFirstMaster = user.role === 'master' || user.username === 'vittor';
        if (user.isApproved === false && !isFirstMaster) {
          alert('Sua conta está aguardando aprovação do Administrador Master. Por favor, tente novamente mais tarde.');
          return;
        }

        // Check for key expiration (for company admins and their users)
        if (user.role !== 'master') {
          const companyAdmin = user.role === 'admin' ? user : latestUsers.find(u => u.companyId === user.companyId && u.role === 'admin');
          if (companyAdmin && companyAdmin.keysExpiresAt) {
            const expirationDate = new Date(companyAdmin.keysExpiresAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (expirationDate < today) {
              alert('O acesso desta empresa expirou. Entre em contato com o Administrador Master.');
              return;
            }
          }
        }

        // 3. User authenticated! Now force a full sync for THIS company's data specifically
        await syncFromSupabase(user.role === 'master' ? undefined : user.companyId);

        // 4. Generate new Session ID and update users
        const newSessionId = uuidv4();
        const updatedUser = { ...user, sessionId: newSessionId };
        
        // Update users list and sync to Supabase
        const newUsers = latestUsers.map(u => u.id === user.id ? updatedUser : u);
        setUsers(newUsers);

        if (config.enabled) {
          const supabase = createSupabaseClient(config.url, config.key);
          if (supabase) {
            await Promise.all([
              supabase.from('users').upsert(mapToSnake(updatedUser)),
              supabase.from('app_state').upsert({ id: 'sigo_users', content: newUsers })
            ]);
            console.log('[Supabase] Auth state synchronized');
          }
        }

        setAndSaveCurrentUser(updatedUser);
      } else {
        alert('Usuário ou senha incorretos');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === regUsername)) {
      alert('Usuário já existe');
      return;
    }
    const hashedRegPassword = await hashPassword(regPassword);
    const newUser: User = {
      id: uuidv4(),
      name: regName,
      username: regUsername,
      password: hashedRegPassword,
      email: regEmail,
      role: users.length === 0 ? 'master' : 'admin',
      companyId: uuidv4(), // Generic new company ID for registration
      companyName: regHasCompany ? regCompanyInfo : `${regName} Co.`,
      allowedModules: regDesiredModules.length > 0 ? regDesiredModules : ['quotations'], // Default to selected or quotations
      isActive: true,
      isApproved: users.length === 0, // First user is approved as master
      desiredPlan: regDesiredPlan,
      desiredModules: regDesiredModules,
      hasCompany: regHasCompany
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    addAuditLog('Registro', 'Auth', `Novo usuário registrado: ${regUsername}`);
    
    // Immediate sync for user registration
    const config = getSupabaseConfig();
    if (config.enabled) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const { error: userError } = await supabase.from('users').upsert(mapToSnake(newUser));
          if (userError) throw userError;
          
          const { error: blobError } = await supabase.from('app_state').upsert({ id: 'sigo_users', content: updatedUsers });
          if (blobError) throw blobError;
          
          console.log('[Supabase] Registration persisted immediately');
          const { data: verifyData, error: verifyError } = await supabase.from('users').select('id').eq('id', newUser.id).single();
          if (verifyError || !verifyData) {
            console.error('[Sync] Verification failed', verifyError);
            alert('Aviso: O usuário pode não ter sido salvo corretamente no banco de dados principal.');
          } else {
            alert('Cadastro realizado e verificado com sucesso no banco de dados!');
          }
        } catch (err) {
          console.error('[Sync] Registration persistence failed', err);
          alert('Erro ao salvar no banco de dados. Verifique sua conexão e configurações do Supabase.');
          return; // Cancel registration success behavior if it fails to save
        }
      }
    } else {
       alert('Cadastro realizado (modo local).');
    }

    setIsRegistering(false);
    setRegName('');
    setRegEmail('');
    setRegUsername('');
    setRegPassword('');
    setRegHasCompany(false);
    setRegCompanyInfo('');
    setRegDesiredPlan('');
    setRegDesiredModules([]);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: 'left' | 'right' = 'left') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result as string;
          // Compress image to avoid localStorage quota issues
          const compressedDataUrl = await compressImage(originalDataUrl, 400, 400, 0.7);
          
          if (position === 'left') {
            setCompanyLogo(compressedDataUrl);
          } else {
            setCompanyLogoRight(compressedDataUrl);
          }
        } catch (error) {
          console.error('Error processing image:', error);
          alert('Erro ao processar a imagem. Tente um arquivo menor.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email?.toLowerCase() === resetEmail.toLowerCase());
    if (!user) {
      alert('Email não encontrado ou não cadastrado no sistema.');
      return;
    }

    // Check if there's already a pending request
    if (passwordResetRequests.some(r => r.userId === user.id && r.status === 'pending')) {
      alert('Já existe uma solicitação pendente para este email.');
      return;
    }

    const request: PasswordResetRequest = {
      id: uuidv4(),
      userId: user.id,
      username: user.username,
      email: resetEmail,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    const newRequests = [...passwordResetRequests, request];
    setPasswordResetRequests(newRequests);
    
    // Sync to Supabase if enabled
    const config = getSupabaseConfig();
    if (config.enabled) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        await supabase.from('app_state').upsert({ id: 'sigo_reset_requests', content: newRequests });
      }
    }

    alert('Sua solicitação de recuperação foi enviada. Após a aprovação de um administrador, você receberá uma senha temporária.');
    setIsResettingPassword(false);
    setResetEmail('');
  };

  const handleUpdateProfile = async (updated: User) => {
    setAndSaveCurrentUser(updated);
    const newUsers = users.map(u => u.id === updated.id ? updated : u);
    setUsers(newUsers);

    const config = getSupabaseConfig();
    if (config.enabled) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          // Normalize password field to skip password-less users or handle any inconsistencies
          const userToSync = { ...updated };
          const { error: userError } = await supabase.from('users').upsert(mapToSnake(userToSync));
          if (userError) throw userError;

          // Update the shared users blob
          await supabase.from('app_state').upsert({
            id: 'sigo_users',
            content: newUsers
          });
          console.log('[Supabase] Profile updated and persisted');
        } catch (err) {
          console.error('[Sync] Profile persist failed', err);
          alert('Aviso: Perfil atualizado localmente, mas a sincronização com a nuvem falhou.');
        }
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmNewPassword) {
      alert('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    const hashedNewPassword = await hashPassword(newPassword);
    const updatedUser = { 
      ...currentUser, 
      password: hashedNewPassword, 
      mustChangePassword: false 
    };

    const newUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(newUsers);
    setAndSaveCurrentUser(updatedUser);
    
    // Sync to Supabase if enabled
    const config = getSupabaseConfig();
    if (config.enabled) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        await supabase.from('app_state').upsert({ id: 'sigo_users', content: newUsers });
      }
    }

    addAuditLog('Alteração', 'Auth', `Senha alterada pelo usuário: ${currentUser.username}`);
    alert('Senha alterada com sucesso! Você já pode utilizar o sistema.');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // --- Resource Management ---
  const addResource = (resource: Omit<Resource, 'id'>) => {
    if (resources.some(r => r.code === resource.code) || services.some(s => s.code === resource.code)) {
      alert(`O código ${resource.code} já está em uso.`);
      return;
    }
    const newId = uuidv4();
    setResources([...resources, { ...resource, id: newId, companyId: currentUser?.companyId }]);
    addAuditLog('Adição', 'Insumos', `Insumo adicionado: ${resource.code} - ${resource.name}`);
  };

  const deleteResource = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este recurso?")) return;
    const resource = resources.find(r => r.id === id);
    setResources(resources.filter(r => r.id !== id));
    if (resource) addAuditLog('Exclusão', 'Insumos', `Insumo excluído: ${resource.code}`);
  };

  const updateResource = (updatedResource: Resource) => {
    if (resources.some(r => r.code === updatedResource.code && r.id !== updatedResource.id) || 
        services.some(s => s.code === updatedResource.code)) {
      alert(`O código ${updatedResource.code} já está em uso.`);
      return;
    }
    setResources(resources.map(r => r.id === updatedResource.id ? updatedResource : r));
    addAuditLog('Edição', 'Insumos', `Insumo editado: ${updatedResource.code}`);
  };

  // --- Service Management ---
  const addService = (service: Omit<ServiceComposition, 'id'>) => {
    if (services.some(s => s.code === service.code) || resources.some(r => r.code === service.code)) {
      alert(`O código ${service.code} já está em uso.`);
      return;
    }
    const newId = uuidv4();
    setServices([...services, { ...service, id: newId, companyId: currentUser?.companyId }]);
    addAuditLog('Adição', 'Serviços', `Serviço adicionado: ${service.code} - ${service.name}`);
  };

  const addServices = async (newServices: Omit<ServiceComposition, 'id'>[]) => {
    const validServices: ServiceComposition[] = [];
    const logs: string[] = [];
    
    newServices.forEach(s => {
      if (!services.some(existing => existing.code.toLowerCase() === s.code.toLowerCase())) {
        const id = uuidv4();
        validServices.push({ ...s, id, companyId: currentUser?.companyId });
        logs.push(s.code);
      }
    });

    if (validServices.length > 0) {
      setServices(prev => [...prev, ...validServices]);
      addAuditLog('Adição', 'Serviços', `Lote de ${validServices.length} serviços adicionados via importação: ${logs.join(', ')}`);
      
      const config = getSupabaseConfig();
      if (config.enabled && currentUser?.companyId) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
           const mappedData = validServices.map(s => ({
             company_id: currentUser.companyId,
             id: s.id,
             code: s.code,
             name: s.name,
             unit: s.unit,
             production: s.production,
             fit: s.fit,
             items: s.items || []
           }));
           // Chunk inserts to avoid limits
           const chunkSize = 50;
           for (let i = 0; i < mappedData.length; i += chunkSize) {
             const chunk = mappedData.slice(i, i + chunkSize);
             supabase.from('service_compositions').upsert(chunk).then(({ error }) => {
               if (error) console.error("Error inserting services batch:", error);
             });
           }
        }
      }
    }
    return validServices;
  };

  const deleteService = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este serviço?")) return;
    const service = services.find(s => s.id === id);
    setServices(services.filter(s => s.id !== id));
    if (service) addAuditLog('Exclusão', 'Serviços', `Serviço excluído: ${service.code}`);
  };

  const updateService = (updatedService: ServiceComposition) => {
    if (services.some(s => s.code === updatedService.code && s.id !== updatedService.id) || 
        resources.some(r => r.code === updatedService.code)) {
      alert(`O código ${updatedService.code} já está em uso.`);
      return;
    }
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
    addAuditLog('Edição', 'Serviços', `Serviço editado: ${updatedService.code}`);
  };

  // --- Quotation Management ---
  const addQuotation = (quotation: Omit<Quotation, 'id'>) => {
    const newId = uuidv4();
    setQuotations([...quotations, { ...quotation, id: newId, companyId: currentUser?.companyId }]);
    addAuditLog('Adição', 'Cotações', `Cotação adicionada: ${quotation.budgetName}`);
  };

  const deleteQuotation = (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta cotação?")) return;
    const quot = quotations.find(q => q.id === id);
    setQuotations(quotations.filter(q => q.id !== id));
    if (quot) addAuditLog('Exclusão', 'Cotações', `Cotação excluída: ${quot.budgetName}`);
  };

  const updateQuotation = (updatedQuotation: Quotation) => {
    setQuotations(quotations.map(q => q.id === updatedQuotation.id ? updatedQuotation : q));
    addAuditLog('Edição', 'Cotações', `Cotação editada: ${updatedQuotation.budgetName}`);
  };

  // --- Measurement Management ---
  // Automatic migration from Controller to RH
  useEffect(() => {
    if (currentUser && manpowerRecords.length > 0) {
      const unmigrated = manpowerRecords.filter(m => 
        !employees.some(e => e.name.toLowerCase() === m.name.toLowerCase())
      );
      
      if (unmigrated.length > 0) {
        const migrated: Employee[] = unmigrated.map(m => {
          const latestMonthly = [...manpowerMonthlyData]
            .filter(d => d.manpowerId === m.id)
            .sort((a, b) => b.month.localeCompare(a.month))[0];

          return {
            id: m.id,
            status: 'active' as const,
            companyId: m.companyId || currentUser?.companyId || '',
            name: m.name,
            role: m.role,
            admissionDate: m.entryDate || new Date().toISOString().split('T')[0],
            salary: m.dailyWorker ? (latestMonthly?.dailyRate || 0) : (latestMonthly?.salary || 0),
            paymentType: m.dailyWorker ? 'day' : 'month',
            cpf: '',
            rgNumber: '',
            rgAgency: null as any,
            rgIssuer: '',
            rgState: '',
            birthDate: null as any,
            birthPlace: '',
            birthState: '',
            workBookletNumber: '',
            workBookletSeries: '',
            pis: '',
            phone: '',
            mobile: '',
            email: '',
            voterIdNumber: '',
            voterZone: '',
            voterSection: '',
            fatherName: '',
            motherName: '',
            spouseName: '',
            dependents: [],
            addressLogradouro: '',
            addressNumber: '',
            addressComplement: '',
            addressNeighborhood: '',
            addressCity: '',
            addressZipCode: '',
            addressState: '',
            commuterBenefits: false,
            commuterValue1: 0,
            commuterValue2: 0,
            commuterCity1: '',
            commuterCity2: ''
          };
        });
        
        setEmployees(prev => {
          const newList = deduplicateById([...prev, ...migrated]);
          return JSON.stringify(prev) === JSON.stringify(newList) ? prev : newList;
        });
        console.log(`[Migration] Auto-migrated ${migrated.length} employees from Controller to RH.`);
      }
    }
  }, [manpowerRecords.length, employees.length, currentUser?.id]);

  const addContract = async (contract: Omit<Contract, 'id'>) => {
    console.log('[Contract] Adding contract:', contract);
    const newId = uuidv4();
    const relatedQuotation = quotations.find(q => q.id === contract.quotationId);
    
    // Create a copy of the budget from the quotation so the contract works independently
    // Prioritize services/groups already in the contract (e.g. from spreadsheet import)
    const hasImportedData = (contract.services && contract.services.length > 0) || (contract.groups && contract.groups.length > 0);
    
    const contractCopy: Contract = { 
      ...contract, 
      id: newId,
      companyId: currentUser?.companyId,
      services: hasImportedData ? (contract.services || []) : (relatedQuotation ? JSON.parse(JSON.stringify(relatedQuotation.services)) : []),
      groups: hasImportedData ? (contract.groups || []) : (relatedQuotation && relatedQuotation.groups ? JSON.parse(JSON.stringify(relatedQuotation.groups)) : undefined)
    };
    
    setContracts(prev => [...prev, contractCopy]);
    addAuditLog('Adição', 'Contratos', `Contrato adicionado: ${contract.contractNumber}`);

    // Immediate sync for critical data
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
       const supabase = createSupabaseClient(config.url, config.key);
       if (supabase) {
         try {
           const mapped = {
             company_id: compId,
             id: contractCopy.id,
             quotation_id: contractCopy.quotationId,
             contract_number: contractCopy.contractNumber,
             work_name: contractCopy.workName,
             total_value: contractCopy.totalValue,
             object: contractCopy.object,
             client: contractCopy.client,
             contractor: contractCopy.contractor,
             start_date: contractCopy.startDate,
             measurement_unit: contractCopy.measurementUnit,
             measurement_unit_value: contractCopy.measurementUnitValue,
             initial_station: contractCopy.initialStation,
             final_station: contractCopy.finalStation,
             services: contractCopy.services,
             groups: contractCopy.groups
           };
           const { error } = await supabase.from('contracts').upsert(mapped);
           if (error) {
              console.error('[Supabase] Insert error:', error);
              alert("Erro ao gravar contrato no banco de dados: " + error.message);
           } else {
              console.log('[Supabase] Contract persisted immediately');
           }
         } catch (err) {
           console.warn('[Sync] Immediate persistence failed, will retry in auto-sync', err);
         }
       }
    }
  };

  const updateContract = async (updated: Contract) => {
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    addAuditLog('Edição', 'Contratos', `Contrato editado: ${updated.contractNumber}`);

    // Immediate sync for critical data
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
       const supabase = createSupabaseClient(config.url, config.key);
       if (supabase) {
         try {
           const mapped = {
             company_id: compId,
             id: updated.id,
             quotation_id: updated.quotationId,
             contract_number: updated.contractNumber, // No changed to contract_number
             work_name: updated.workName,
             total_value: updated.totalValue,
             object: updated.object,
             client: updated.client,
             contractor: updated.contractor,
             start_date: updated.startDate,
             measurement_unit: updated.measurementUnit,
             measurement_unit_value: updated.measurementUnitValue,
             initial_station: updated.initialStation,
             final_station: updated.finalStation,
             services: updated.services,
             groups: updated.groups,
             group_adjustments: updated.groupAdjustments
           };
           const { error } = await supabase.from('contracts').upsert(mapped);
           if (error) {
              console.error('[Supabase] Update error:', error);
              alert("Erro ao gravar contrato no banco de dados: " + error.message);
           } else {
              console.log('[Supabase] Contract updated immediately');
           }
         } catch (err) {
           console.warn('[Sync] Immediate update failed, will retry in auto-sync', err);
         }
       }
    }
  };

  const deleteContract = async (id: string) => {
    if (!id) {
      alert("Erro: ID de contrato inválido.");
      return;
    }

    const contract = contracts.find(c => c.id === id);
    if (!contract) {
      console.warn('[Delete] Contract not found:', id);
      return;
    }

    // Count related items for detailed confirmation
    const countMeasurements = measurements.filter(m => m.contractId === id).length;
    const countReports = dailyReports.filter(r => r.contractId === id).length;
    const countPluvio = pluviometryRecords.filter(p => p.contractId === id).length;
    const countMemories = calculationMemories.filter(m => m.contractId === id).length;
    const countHighway = highwayLocations.filter(l => l.contractId === id).length;
    const countStations = stationGroups.filter(g => g.contractId === id).length;
    const countCubations = cubationData.filter(c => c.contractId === id).length;
    const countTransports = transportData.filter(t => t.contractId === id).length;
    const countProductions = serviceProductions.filter(p => p.contractId === id).length;
    const countSchedules = technicalSchedules.filter(s => s.contractId === id).length;

    let confirmMsg = `Deseja realmente excluir o contrato "${contract.contractNumber}"?\n\nESTA AÇÃO É IRREVERSÍVEL e removerá permanentemente:`;
    if (countMeasurements > 0) confirmMsg += `\n- ${countMeasurements} Planilha(s) de Medição`;
    if (countReports > 0) confirmMsg += `\n- ${countReports} Diário(s) de Obra (RDO)`;
    if (countPluvio > 0) confirmMsg += `\n- ${countPluvio} Registro(s) de Pluviometria`;
    if (countMemories > 0) confirmMsg += `\n- ${countMemories} Memória(s) de Cálculo`;
    if (countHighway > 0) confirmMsg += `\n- ${countHighway} Localização(ões) de Rodovia`;
    if (countStations > 0) confirmMsg += `\n- ${countStations} Grupo(s) de Estacas`;
    if (countCubations > 0) confirmMsg += `\n- ${countCubations} Dado(s) de Cubação`;
    if (countTransports > 0) confirmMsg += `\n- ${countTransports} Dado(s) de Transporte`;
    if (countProductions > 0) confirmMsg += `\n- ${countProductions} Controle(s) de Produção`;
    if (countSchedules > 0) confirmMsg += `\n- ${countSchedules} Cronograma(s) Técnico(s)`;

    if (!window.confirm(confirmMsg)) return;
    
    try {
      const config = getSupabaseConfig();
      if (config.enabled && config.url && config.key) {
        const supabaseClient = createSupabaseClient(config.url, config.key);
        if (supabaseClient) {
          console.log('[Supabase] Secure multi-table delete for contract:', id);
          
          const tablesToCleanup = [
            'measurements', 'daily_reports', 'pluviometry_records', 
            'calculation_memories', 'highway_locations', 'station_groups',
            'cubation_data', 'transport_data', 'service_productions', 
            'technical_schedules'
          ];
          
          for (const table of tablesToCleanup) {
            const { error: childError } = await supabaseClient.from(table).delete().eq('contract_id', id);
            if (childError) console.warn(`[Supabase] Non-fatal error cleaning ${table}:`, childError);
          }
          
          const { error: contractError } = await supabaseClient.from('contracts').delete().eq('id', id);
          if (contractError) {
            console.error('[Supabase] Failed to delete contract:', contractError);
            throw new Error(`O banco de dados recusou a exclusão: ${contractError.message}`);
          }
          
          const targetCompId = contract.companyId || compId;
          if (targetCompId) {
            await supabaseClient.from('app_state').delete().eq('id', `${targetCompId}_sconet_contracts`);
          }
        }
      }

      // 2. Synchronized Local state update for ALL affected collections
      setContracts(prev => prev.filter(c => c.id !== id));
      setMeasurements(prev => prev.filter(m => m.contractId !== id));
      setDailyReports(prev => prev.filter(r => r.contractId !== id));
      setPluviometryRecords(prev => prev.filter(p => p.contractId !== id));
      setCalculationMemories(prev => prev.filter(m => m.contractId !== id));
      setHighwayLocations(prev => prev.filter(l => l.contractId !== id));
      setStationGroups(prev => prev.filter(g => g.contractId !== id));
      setCubationData(prev => prev.filter(c => c.contractId !== id));
      setTransportData(prev => prev.filter(t => t.contractId !== id));
      setServiceProductions(prev => prev.filter(p => p.contractId !== id));
      setTechnicalSchedules(prev => prev.filter(s => s.contractId !== id));
      
      addAuditLog('Exclusão', 'Contratos', `Contrato e dados vinculados excluídos: ${contract.contractNumber}`);
      alert("✅ Sucesso!\n\nO contrato e todos os dados relacionados foram removidos com sucesso.");
      
      if (selectedContractId === id) {
        setSelectedContractId(null);
        setSelectedMeasurementId(null);
      }
    } catch (e: any) {
      console.error('[Delete] Failed:', e);
      alert(`❌ Erro na Exclusão:\n${e.message || 'Falha na operação.'}`);
    }
  };

  const addMeasurement = async (measurement: Omit<Measurement, 'id'>) => {
    const newId = uuidv4();
    const measurementWithId = { ...measurement, id: newId, companyId: currentUser?.companyId };
    setMeasurements([...measurements, measurementWithId]);
    addAuditLog('Adição', 'Medições', `Medição adicionada: #${measurement.number}`);

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('measurements').upsert(mapToSnake(measurementWithId));
          console.log('[Supabase] Measurement persisted immediately');
        } catch (err) {
          console.warn('[Sync] Measurement persistence failed', err);
        }
      }
    }
  };

  const updateMeasurement = async (updated: Measurement) => {
    setMeasurements(prev => prev.map(m => m.id === updated.id ? updated : m));
    
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('measurements').upsert(mapToSnake(updated));
          console.log('[Supabase] Measurement updated immediately');
        } catch (err) {
          console.warn('[Sync] Measurement update failed', err);
        }
      }
    }
  };

  const deleteMeasurement = async (id: string, isApproval: boolean = false) => {
    const measurement = measurements.find(m => m.id === id);
    if (!measurement) return;

    // If it's a request (not an approval) and user is not admin
    if (!isApproval && currentUser?.role !== 'admin' && currentUser?.role !== 'master') {
      if (!window.confirm("Deseja solicitar a exclusão desta medição? Um administrador precisará aprovar.")) return;
      
      const updated: Measurement = { ...measurement, status: 'pending_deletion' };
      await updateMeasurement(updated);
      alert("Solicitação de exclusão enviada ao administrador.");
      return;
    }

    if (!isApproval && !window.confirm("Deseja realmente excluir esta medição?")) return;
    
    // 1. Immediate Backend Sync
    const config = getSupabaseConfig();
    if (config.enabled && config.url && config.key) {
      const supabaseClient = createSupabaseClient(config.url, config.key);
      if (supabaseClient) {
        try {
           await supabaseClient.from('measurements').delete().eq('id', id);
        } catch (e) {
           console.error('[Supabase] Measurement delete exception:', e);
        }
      }
    }
    
    setMeasurements(prev => prev.filter(m => m.id !== id));
    addAuditLog('Exclusão', 'Medições', `Medição excluída: ${measurement.number} (${measurement.period})`);
    if (!isApproval) alert("Medição excluída com sucesso.");
  };

  const updateCalculationMemory = async (memory: CalculationMemory) => {
    setCalculationMemories(prev => {
      const existing = prev.findIndex(m => m.contractId === memory.contractId && m.measurementId === memory.measurementId && m.serviceId === memory.serviceId);
      if (existing >= 0) {
        return prev.map((m, i) => i === existing ? memory : m);
      }
      return [...prev, memory];
    });

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('calculation_memories').upsert(mapToSnake(memory));
          console.log('[Supabase] Memory persisted immediately');
        } catch (err) {
          console.warn('[Sync] Memory persist failed', err);
        }
      }
    }
  };

  const updateHighwayLocation = (location: HighwayLocation) => {
    setHighwayLocations(prev => {
      const existing = prev.findIndex(l => l.id === location.id);
      if (existing >= 0) return prev.map(l => l.id === location.id ? location : l);
      return [...prev, location];
    });
  };

  const deleteHighwayLocation = (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta localização?")) return;
    setHighwayLocations(prev => prev.filter(l => l.id !== id));
  };

  const updateStationGroup = (group: StationGroup) => {
    setStationGroups(prev => {
      const existing = prev.findIndex(g => g.id === group.id);
      if (existing >= 0) return prev.map(g => g.id === group.id ? group : g);
      return [...prev, group];
    });
  };

  const deleteStationGroup = (id: string) => {
    if (!window.confirm("Deseja realmente excluir este grupo de estacas?")) return;
    setStationGroups(prev => prev.filter(g => g.id !== id));
  };

  const updateCubationData = (data: CubationData) => {
    setCubationData(prev => {
      const existing = prev.findIndex(d => d.id === data.id || (d.contractId === data.contractId && d.measurementId === data.measurementId && d.stationGroupId === data.stationGroupId && d.serviceId === data.serviceId));
      if (existing >= 0) return prev.map((d, i) => i === existing ? data : d);
      return [...prev, data];
    });
  };

  const updateTransportData = (data: TransportData) => {
    setTransportData(prev => {
      const existing = prev.findIndex(d => d.id === data.id || (d.contractId === data.contractId && d.measurementId === data.measurementId && d.serviceId === data.serviceId));
      if (existing >= 0) return prev.map((d, i) => i === existing ? data : d);
      return [...prev, data];
    });
  };

  const updateServiceProduction = async (prod: ServiceProduction) => {
    const fullProd = { ...prod, companyId: currentUser?.companyId };
    
    // Clean up empty strings for dates to prevent Supabase errors
    const cleanedProd = { ...fullProd };
    if (cleanedProd.startDate === "") (cleanedProd as any).startDate = null;
    if (cleanedProd.endDate === "") (cleanedProd as any).endDate = null;

    setServiceProductions(prev => {
      const idx = prev.findIndex(p => p.id === prod.id || (p.contractId === prod.contractId && p.serviceId === prod.serviceId && p.month === prod.month));
      if (idx >= 0) {
        // Carry over the ID from existing record if we found it by contract/service/month
        if (prev[idx].id !== prod.id) {
          cleanedProd.id = prev[idx].id;
        }
        return prev.map((p, i) => i === idx ? { ...cleanedProd } as any : p);
      }
      return [...prev, cleanedProd as any];
    });

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          // Use upsert with onConflict for extra safety against duplicates
          await supabase.from('service_productions').upsert(
            mapToSnake(cleanedProd), 
            { onConflict: 'contract_id,service_id,month' }
          );
          console.log('[Supabase] Production persisted immediately');
        } catch (err) {
          console.warn('[Sync] Production persist failed', err);
        }
      }
    }
  };

  const deleteServiceProduction = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este monitoramento? Todos os dados diários serão perdidos.")) return;
    
    const prodToDelete = serviceProductions.find(p => p.id === id);
    const serviceName = services.find(s => s.id === prodToDelete?.serviceId)?.name || prodToDelete?.serviceId || id;
    
    setServiceProductions(prev => prev.filter(p => p.id !== id));
    addAuditLog('Exclusão', 'Sala Técnica', `Monitoramento de produção excluído: ${serviceName}`);

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('service_productions').delete().eq('id', id);
          console.log('[Supabase] Production deleted immediately');
        } catch (err) {
          console.warn('[Sync] Production deletion failed', err);
        }
      }
    }
  };

  const updateTechnicalTeams = async (teams: ControllerTeam[]) => {
    setControllerTeams(teams);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase && teams.length >= 0) {
        try {
          const mapped = teams.map(t => ({ ...mapToSnake(t), company_id: compId }));
          if (mapped.length > 0) {
            await supabase.from('controller_teams').upsert(mapped);
          }
        } catch (err) { console.warn('[Sync] Teams persist failed', err); }
      }
    }
  };


  const updateEquipmentTransfers = async (transfers: EquipmentTransfer[]) => {
    lastLocalUpdate.current = Date.now();
    setEquipmentTransfers(transfers);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          // Update blob for fallback FIRST!
          await supabase.from('app_state').upsert({
            id: `${compId}_sigo_equipment_transfers`,
            content: transfers
          });

          const mapped = transfers.map(t => ({ ...mapToSnake(t), company_id: compId }));
          if (mapped.length > 0) {
            await supabase.from('equipment_transfers').upsert(mapped);
          } else {
            await supabase.from('equipment_transfers').delete().eq('company_id', compId);
          }
        } catch (err) { console.warn('[Sync] Transfers persist failed', err); }
      }
    }
  };

  const updateTechnicalEquipments = async (equips: ControllerEquipment[]) => {
    lastLocalUpdate.current = Date.now();
    setControllerEquipments(equips);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = equips.map(e => {
            const m = { ...mapToSnake(e), company_id: compId };
            if (m.entry_date === "") m.entry_date = null;
            if (m.exit_date === "") m.exit_date = null;
            if (m.maintenance_entry_date === "") m.maintenance_entry_date = null;
            return m;
          });
          
          // Update blob for fallback FIRST! That way if table sync fails (e.g. missing column), local state is still persisted.
          await supabase.from('app_state').upsert({
            id: `${compId}_sigo_controller_equipments`,
            content: equips
          });

          // Handle Deletions Sync
          const { data: dbItems } = await supabase.from('controller_equipments').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = equips.map(e => e.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('controller_equipments').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('controller_equipments').upsert(mapped);
          }
        } catch (err) { console.warn('[Sync] Equipments persist failed', err); }
      }
    }
  };

  const updateEquipmentMaintenance = async (maintenance: EquipmentMaintenance[]) => {
    lastLocalUpdate.current = Date.now();
    setEquipmentMaintenance(maintenance);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = maintenance.map(m => {
            const snaked = mapToSnake(m);
            return {
              ...snaked,
              company_id: compId,
              entry_date: snaked.entry_date || null,
              exit_date: snaked.exit_date || null
            };
          });

          // Fallback blob
          await supabase.from('app_state').upsert({
            id: `${compId}_sigo_equipment_maintenance`,
            content: maintenance
          });

          // Sync deletions
          const { data: dbItems } = await supabase.from('equipment_maintenance').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = maintenance.map(m => m.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('equipment_maintenance').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('equipment_maintenance').upsert(mapped);
          }
        } catch (err) { console.warn('[Sync] Maintenance persist failed', err); }
      }
    }
  };

  const updateEquipmentMonthly = async (data: EquipmentMonthlyData[]) => {
    setEquipmentMonthlyData(data);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = data.map(d => ({ ...mapToSnake(d), company_id: compId }));
          
          // Sync Deletions
          const { data: dbItems } = await supabase.from('equipment_monthly_data').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = data.map(d => d.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('equipment_monthly_data').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('equipment_monthly_data').upsert(mapped, { onConflict: 'equipment_id,month' });
          }
        } catch (err) { console.warn('[Sync] Equipment monthly persist failed', err); }
      }
    }
  };

  const updateTechnicalManpower = async (man: ControllerManpower[]) => {
    setManpowerRecords(man);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = man.map(m => {
            const sn = { ...mapToSnake(m), company_id: compId };
            if (sn.entry_date === "") sn.entry_date = null;
            if (sn.exit_date === "") sn.exit_date = null;
            return sn;
          });

          // Sync Deletions
          const { data: dbItems } = await supabase.from('controller_manpower').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = man.map(m => m.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('controller_manpower').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('controller_manpower').upsert(mapped);
          }
        } catch (err) { console.warn('[Sync] Manpower persist failed', err); }
      }
    }
  };

  const updateManpowerMonthly = async (data: ManpowerMonthlyData[]) => {
    setManpowerMonthlyData(data);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = data.map(d => ({ ...mapToSnake(d), company_id: compId }));

          // Sync Deletions
          const { data: dbItems } = await supabase.from('manpower_monthly_data').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = data.map(d => d.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('manpower_monthly_data').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('manpower_monthly_data').upsert(mapped, { onConflict: 'manpower_id,month' });
          }
        } catch (err) { console.warn('[Sync] Manpower monthly persist failed', err); }
      }
    }
  };

  const updateTeamAssignments = async (assignments: TeamAssignment[]) => {
    setTeamAssignments(assignments);
    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = assignments.map(a => ({ ...mapToSnake(a), company_id: compId }));

          // Sync Deletions
          const { data: dbItems } = await supabase.from('team_assignments').select('id').eq('company_id', compId);
          const dbIds = dbItems?.map(d => d.id) || [];
          const currentIds = assignments.map(a => a.id);
          const toDelete = dbIds.filter(id => !currentIds.includes(id));
          if (toDelete.length > 0) {
            await supabase.from('team_assignments').delete().in('id', toDelete);
          }

          if (mapped.length > 0) {
            await supabase.from('team_assignments').upsert(mapped, { onConflict: 'team_id,member_id,month' });
          }
        } catch (err) { console.warn('[Sync] Assignments persist failed', err); }
      }
    }
  };

  // --- Template Management ---
  const saveTemplate = async (template: MeasurementTemplate) => {
    const updatedTemplates = [...measurementTemplates];
    const existing = updatedTemplates.findIndex(t => t.id === template.id);
    if (existing >= 0) {
      updatedTemplates[existing] = template;
    } else {
      updatedTemplates.push(template);
    }
    setMeasurementTemplates(updatedTemplates);

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const mapped = { ...mapToSnake(template), company_id: compId };
          await supabase.from('measurement_templates').upsert(mapped);
        } catch (err) { console.warn('[Sync] Template persist failed', err); }
      }
    }
    
    addAuditLog('Edição', 'Configurações', `Template de medição atualizado para: ${template.unit}`);
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este template de medição?")) return;
    const updated = measurementTemplates.filter(t => t.id !== id);
    setMeasurementTemplates(updated);

    const config = getSupabaseConfig();
    if (config.enabled && compId) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          await supabase.from('measurement_templates').delete().eq('id', id);
        } catch (err) { console.warn('[Sync] Template deletion failed', err); }
      }
    }
  };

  // --- Auto-Sync Logic ---
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.enabled || !currentUser) return;

    const timeout = setTimeout(() => {
      console.log('[Auto-Save] Triggering synchronization...');
      handleSyncAllToSupabase().catch(err => console.error('[Auto-Save] Fail:', err));
    }, 5000); // Wait 5 seconds of inactivity/stability

    return () => clearTimeout(timeout);
  }, [
    contracts, measurements, serviceProductions, measurementTemplates, 
    calculationMemories, highwayLocations, stationGroups, cubationData, 
    transportData, employees, dailyReports, pluviometryRecords,
    technicalSchedules, controllerTeams, controllerEquipments,
    manpowerRecords, teamAssignments, suppliers, purchaseRequests,
    purchaseQuotations, purchaseOrders,
    users, resources, services, quotations, auditLogs,
    abcConfig, bdiConfig, companyLogo, companyLogoRight,
    defaultOrganization, timeRecords, dashboardConfig,
    chargesPerc, otPerc, equipmentTransfers,
    equipmentMaintenance, equipmentMonthlyData, manpowerMonthlyData
  ]);

  if (!isSupabaseSynced && getSupabaseConfig().enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-gray-50/50">
         <div className="flex flex-col items-center gap-6 p-10 bg-white/80 backdrop-blur-md rounded-[32px] border border-blue-100 shadow-2xl shadow-blue-200/40">
           <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
           </div>
           <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">Sincronização Ativa</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 max-w-[280px]">Prioridade: **Servidor Central**</p>
                <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed">Conectando ao banco de dados para garantir que você tenha as informações mais recentes e seguras.</p>
              </div>
           </div>
           <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-blue-600"
               initial={{ width: "0%" }}
               animate={{ width: "100%" }}
               transition={{ duration: 2, repeat: Infinity }}
             />
           </div>
         </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">SIGO</h1>
            <p className="text-gray-500 mt-2 font-medium">SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS</p>
          </div>

          {!isRegistering && !isResettingPassword ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50/50 rounded-full border border-blue-100/50 mb-2">
                <div className={cn("w-2 h-2 rounded-full", getSupabaseConfig().enabled ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" : "bg-amber-500")} />
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                  {getSupabaseConfig().enabled ? (
                    `CONECTADO: ${new URL(getSupabaseConfig().url).hostname.split('.')[0].toUpperCase()}`
                  ) : (
                    "ARMAZENAMENTO LOCAL"
                  )}
                </span>
              </div>

              {!getSupabaseConfig().enabled && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 animate-in fade-in duration-500">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-[10px] text-amber-700 leading-tight">
                    <strong>Modo Offline:</strong> Nenhuma configuração de nuvem encontrada. Os dados ficam salvos apenas neste navegador.
                  </div>
                </div>
              )}
              {supabaseSyncError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="text-[10px] text-red-700 leading-tight">
                    <strong>Erro de Conexão:</strong> Não foi possível sincronizar com a nuvem. O login via Supabase está indisponível no momento.
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input 
                    id="username" 
                    className="pl-10" 
                    placeholder="Seu usuário" 
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10" 
                    placeholder="Sua senha" 
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsResettingPassword(true)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <p className="text-center text-sm text-gray-500">
                Não tem uma conta? <button type="button" onClick={() => setIsRegistering(true)} className="text-blue-600 font-semibold hover:underline">Cadastre-se</button>
              </p>
            </form>
          ) : isResettingPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1">Recuperar Senha</h2>
                <p className="text-xs text-gray-500 mt-2 italic">Insira seu e-mail cadastrado para solicitar uma senha temporária ao administrador.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail Cadastrado</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  value={resetEmail} 
                  onChange={e => setResetEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-10">
                Solicitar Nova Senha
              </Button>
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => { setIsResettingPassword(false); setIsRegistering(false); }}
                  className="text-sm text-gray-500 hover:text-blue-600 hover:underline"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pr-3 custom-scrollbar">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Nome Completo</Label>
                <Input id="reg-name" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail</Label>
                <Input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-user">Usuário (Login)</Label>
                <Input id="reg-user" value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="login.usuario" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">Senha</Label>
                <Input id="reg-pass" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Crie uma senha" required />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch id="has-company" checked={regHasCompany} onCheckedChange={setRegHasCompany} />
                <Label htmlFor="has-company" className="text-sm cursor-pointer">Faço parte de uma empresa</Label>
              </div>

              {regHasCompany && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label htmlFor="company-info">Nome da Empresa / CNPJ</Label>
                  <Input 
                    id="company-info" 
                    value={regCompanyInfo} 
                    onChange={e => setRegCompanyInfo(e.target.value)} 
                    placeholder="Ex: Construtora Alfa LTDA" 
                    required 
                  />
                </div>
              )}

              <Separator className="my-2" />

              <div className="space-y-2">
                <Label>Plano de Interesse</Label>
                <Select value={regDesiredPlan} onValueChange={setRegDesiredPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {marketingConfig.plans.map(p => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} - R$ {p.price}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Módulos Desejados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {marketingConfig.modulePrices.map(mp => (
                    <div key={mp.moduleId} className="flex items-center space-x-2 border p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <Checkbox 
                        id={`reg-mod-${mp.moduleId}`}
                        checked={!!regDesiredModules?.includes(mp.moduleId)}
                        onCheckedChange={(checked) => {
                          if (checked) setRegDesiredModules([...regDesiredModules, mp.moduleId]);
                          else setRegDesiredModules(regDesiredModules.filter(m => m !== mp.moduleId));
                        }}
                      />
                      <label htmlFor={`reg-mod-${mp.moduleId}`} className="text-[10px] font-medium cursor-pointer leading-none">
                        {mp.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                  Criar Minha Conta
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsRegistering(false)} className="w-full text-gray-500">
                  Já tenho conta? Entrar
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  if (currentUser?.mustChangePassword) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
               <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Troca Obrigatória de Senha</h2>
            <p className="text-sm text-gray-500 mt-2">Você acessou com uma senha temporária. Para sua segurança, defina uma nova senha agora.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmNewPassword} 
                onChange={e => setConfirmNewPassword(e.target.value)} 
                placeholder="Repita a nova senha" 
                required 
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
              Atualizar Senha e Entrar
            </Button>
            <Button 
               variant="ghost" 
               type="button" 
               className="w-full text-gray-400"
               onClick={handleLogout}
            >
              Cancelar e Sair
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] font-sans text-gray-900 overflow-hidden">
      {/* Superior Tab Layer */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 z-30 shrink-0">
        <div className="flex items-center gap-4 mr-8">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden md:block">SIGO</span>
        </div>
        
        <div className="flex h-full">
          <TopNavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Início" 
            active={mainTab === 'home'} 
            onClick={() => setMainTab('home')} 
          />
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('quotations')) && (
            <TopNavItem 
              icon={<Briefcase className="w-4 h-4" />} 
              label="Cotações" 
              active={mainTab === 'quotations'} 
              onClick={() => setMainTab('quotations')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('measurements')) && (
            <TopNavItem 
              icon={<ClipboardList className="w-4 h-4" />} 
              label="Sala Técnica" 
              active={mainTab === 'measurements'} 
              onClick={() => setMainTab('measurements')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('rh')) && (
            <TopNavItem 
              icon={<Users className="w-4 h-4" />} 
              label="RH" 
              active={mainTab === 'rh'} 
              onClick={() => setMainTab('rh')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('control')) && (
            <TopNavItem 
              icon={<Activity className="w-4 h-4" />} 
              label="Controlador" 
              active={mainTab === 'control'} 
              onClick={() => setMainTab('control')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('purchases')) && (
            <TopNavItem 
              icon={<ShoppingCart className="w-4 h-4" />} 
              label="Compras" 
              active={mainTab === 'purchases'} 
              onClick={() => setMainTab('purchases')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.role === 'project_admin') && (
            <TopNavItem 
              icon={<HardHat className="w-4 h-4" />} 
              label="Administrador da Obra" 
              active={mainTab === 'project_admin'} 
              onClick={() => setMainTab('project_admin')} 
            />
          )}
          {(currentUser?.role === 'master' || currentUser?.role === 'admin' || currentUser?.allowedModules?.includes('settings')) && (
            <TopNavItem 
              icon={<Settings className="w-4 h-4" />} 
              label="Administrador do Sistema" 
              active={mainTab === 'settings'} 
              onClick={() => setMainTab('settings')} 
            />
          )}
          {currentUser?.role === 'master' && (
            <TopNavItem 
              icon={<ShieldCheck className="w-4 h-4" />} 
              label="Administrador Master" 
              active={mainTab === 'admin'} 
              onClick={() => setMainTab('admin')} 
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {getSupabaseConfig().enabled ? (
            <div className={cn(
              "hidden lg:flex items-center gap-2 text-[10px] font-bold px-2.5 py-1.5 rounded-full border uppercase tracking-wider",
              supabaseSyncError 
                ? "text-red-600 bg-red-50 border-red-100" 
                : isSupabaseSynced 
                  ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                  : "text-amber-600 bg-amber-50 border-amber-100 animate-pulse"
            )}>
              {supabaseSyncError ? (
                <>
                  <XCircle className="w-3 h-3" />
                  Cloud Offline
                </>
              ) : isSupabaseSynced ? (
                <>
                  <Activity className="w-3 h-3" />
                  Cloud Online
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3 shadow-sm shadow-amber-200" />
                  Sincronizando...
                </>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full border border-gray-200 uppercase tracking-wider">
              <Database className="w-3 h-3" />
              Local Storage
            </div>
          )}
          <button 
            onClick={() => setMainTab('profile')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group",
              mainTab === 'profile' 
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" 
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white border border-gray-200 flex items-center justify-center shrink-0">
              {currentUser?.profilePhoto ? (
                <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="text-left hidden lg:block">
              <p className="leading-none">{currentUser?.name}</p>
              <p className="text-[9px] text-gray-400 font-normal mt-0.5">{currentUser?.role}</p>
            </div>
          </button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 h-8 px-2.5 gap-1.5 ml-2 transition-all shadow-sm font-semibold"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Sair</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Visible in Quotations and Measurements tab */}
        {(mainTab === 'quotations' || mainTab === 'measurements') && (
          <motion.aside 
            initial={{ x: -260 }}
            animate={{ x: 0, width: isSidebarOpen ? 240 : 80 }}
            className="bg-white border-r border-gray-200 flex flex-col z-20"
          >
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
              {mainTab === 'quotations' ? (
                <>
                  <SidebarItem 
                    icon={<Package />} 
                    label="Insumos" 
                    active={activeTab === 'resources'} 
                    onClick={() => setActiveTab('resources')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<Briefcase />} 
                    label="Serviços" 
                    active={activeTab === 'services'} 
                    onClick={() => setActiveTab('services')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<FileSpreadsheet />} 
                    label="Planilha" 
                    active={activeTab === 'budget'} 
                    onClick={() => setActiveTab('budget')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<Percent />} 
                    label="BDI" 
                    active={activeTab === 'bdi'} 
                    onClick={() => setActiveTab('bdi')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<FileText />} 
                    label="Cotações" 
                    active={activeTab === 'quotations'} 
                    onClick={() => setActiveTab('quotations')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<LayoutDashboard className="rotate-180" />} 
                    label="Curva ABC" 
                    active={activeTab === 'abc'} 
                    onClick={() => setActiveTab('abc')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<Calendar />} 
                    label="Cronograma" 
                    active={activeTab === 'schedule'} 
                    onClick={() => setActiveTab('schedule')}
                    collapsed={!isSidebarOpen}
                  />
                  <SidebarItem 
                    icon={<FileText />} 
                    label="Relatórios" 
                    active={activeTab === 'reports'} 
                    onClick={() => setActiveTab('reports')}
                    collapsed={!isSidebarOpen}
                  />
                </>
              ) : (
                <Reorder.Group 
                  axis="y" 
                  values={technicalRoomOrder} 
                  onReorder={updateTechnicalRoomOrder}
                  className="space-y-1"
                >
                  {technicalRoomOrder.map((item) => (
                    <Reorder.Item 
                      key={item.id} 
                      value={item}
                    >
                      <SidebarItem 
                        icon={(() => {
                          switch(item.icon) {
                            case 'HardHat': return <HardHat />;
                            case 'ClipboardList': return <ClipboardList />;
                            case 'FileSpreadsheet': return <FileSpreadsheet />;
                            case 'Calculator': return <Calculator />;
                            case 'BookOpen': return <BookOpen />;
                            case 'CloudRain': return <CloudRain />;
                            case 'Calendar': return <Calendar />;
                            case 'Users2': return <Users2 />;
                            case 'BarChart3': return <BarChart3 />;
                            case 'FileText': return <FileText />;
                            default: return <Package />;
                          }
                        })()} 
                        label={item.label} 
                        active={activeMeasureTab === item.id} 
                        onClick={() => setActiveMeasureTab(item.id as any)}
                        collapsed={!isSidebarOpen}
                        showHandle={isSidebarOpen}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </nav>

            {mainTab === 'measurements' && isSidebarOpen && selectedContractId && (
              <div className="p-4 bg-blue-50/50 border-t border-blue-100 flex flex-col gap-1 mx-2 mb-2 rounded-xl">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Contrato Ativo</span>
                <span className="text-xs font-bold text-blue-900 truncate" title={contracts.find(c => c.id === selectedContractId)?.contractNumber}>
                  {(() => {
                    const c = contracts.find(x => x.id === selectedContractId);
                    if (!c) return "Contrato não encontrado";
                    return c.contractNumber || 'S/N';
                  })()}
                </span>
                <span className="text-[10px] text-blue-700/70 truncate">
                  {(() => {
                    const c = contracts.find(x => x.id === selectedContractId);
                    if (!c) return "";
                    return c.workName || c.client || 'Sem nome';
                  })()}
                </span>

                {measurements.filter(m => m.contractId === selectedContractId).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-100/50">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Medição Atual</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">
                        Nº {(() => {
                          const contractMeasures = measurements.filter(m => m.contractId === selectedContractId).sort((a, b) => a.number - b.number);
                          const currentM = selectedMeasurementId ? contractMeasures.find(m => m.id === selectedMeasurementId) : contractMeasures[contractMeasures.length - 1];
                          return currentM?.number.toString().padStart(2, '0') || '00';
                        })()}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded",
                        (() => {
                          const contractMeasures = measurements.filter(m => m.contractId === selectedContractId).sort((a, b) => a.number - b.number);
                          const currentM = selectedMeasurementId ? contractMeasures.find(m => m.id === selectedMeasurementId) : contractMeasures[contractMeasures.length - 1];
                          return currentM?.status === 'closed' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                        })()
                      )}>
                        {(() => {
                          const contractMeasures = measurements.filter(m => m.contractId === selectedContractId).sort((a, b) => a.number - b.number);
                          const currentM = selectedMeasurementId ? contractMeasures.find(m => m.id === selectedMeasurementId) : contractMeasures[contractMeasures.length - 1];
                          return currentM?.status === 'closed' ? 'Fechada' : 'Aberta';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-t border-gray-100 flex justify-center">
              <Button size="icon" variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400">
                <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen && "rotate-180")} />
              </Button>
            </div>
          </motion.aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Internal Header for Breadcrumbs or Search */}
          {(mainTab === 'quotations' || mainTab === 'measurements') && (
            <div className="h-12 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between px-8 z-10 shrink-0">
               <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                {mainTab === 'quotations' ? 'Cotações' : 'Sala Técnica'} / {
                  mainTab === 'quotations' ? (
                    activeTab === 'budget' ? 'Planilha' : 
                    activeTab === 'abc' ? 'Curva ABC' :
                    activeTab === 'schedule' ? 'Cronograma' :
                    activeTab === 'reports' ? 'Relatórios' :
                    activeTab === 'resources' ? 'Insumos' :
                    activeTab === 'services' ? 'Serviços' :
                    activeTab === 'quotations' ? 'Cotações' :
                    activeTab === 'bdi' ? 'BDI' :
                    activeTab
                  ) : (
                    activeMeasureTab === 'contracts' ? 'Contratos' :
                    activeMeasureTab === 'measurements' ? 'Planilha de Medição' :
                    activeMeasureTab === 'measure' ? 'Medir' :
                    activeMeasureTab === 'controls' ? 'Controles' :
                    activeMeasureTab === 'rdo' ? 'Diário de Obra' :
                    activeMeasureTab === 'pluviometria' ? 'Pluviometria' :
                    activeMeasureTab === 'schedule' ? 'Cronograma' :
                    activeMeasureTab === 'teams' ? 'Equipes' :
                    activeMeasureTab === 'reports' ? 'Relatório' :
                    activeMeasureTab === 'summary' ? 'Resumo por Grupo' :
                    activeMeasureTab
                  )
                }
              </h2>
            </div>
          )}

          <div className={cn(
            "flex-1 custom-scrollbar",
            mainTab === 'measurements' ? "overflow-hidden flex flex-col" : "overflow-y-auto p-8"
          )}>
            <AnimatePresence mode="wait">
              {mainTab === 'home' && (
                <Dashboard 
                  key="dashboard" 
                  resources={filteredResources} 
                  services={filteredServices} 
                  quotations={finalQuotations} 
                  contracts={finalContracts}
                  measurements={finalMeasurements}
                  dailyReports={finalDailyReports}
                  employees={filteredEmployees}
                  timeRecords={filteredTimeRecords}
                  controllerTeams={finalControllerTeams}
                  controllerEquipments={finalControllerEquipments}
                  manpowerRecords={filteredControllerManpower}
                  suppliers={finalSuppliers}
                  purchaseOrders={finalPurchaseOrders}
                  purchaseRequests={finalPurchaseRequests}
                  equipmentTransfers={equipmentTransfers}
                  currentUser={currentUser}
                  selectedContractId={selectedContractId}
                  onUpdateContractId={setSelectedContractId}
                  config={dashboardConfig}
                  onNavigate={handleNavigate}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'resources' && (
                <ResourceView 
                  key="resources"
                  resources={filteredResources} 
                  onAdd={addResource} 
                  onDelete={deleteResource} 
                  onUpdate={updateResource}
                  readonly={currentUser?.role === 'reader' || currentUser?.role === 'editor'}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'services' && (
                <ServiceView 
                  key="services"
                  services={filteredServices} 
                  resources={filteredResources} 
                  onAdd={addService} 
                  onDelete={deleteService} 
                  onUpdate={updateService}
                  companyLogo={companyLogo}
                  bdi={calculateBDI(bdiConfig)}
                  readonly={currentUser?.role === 'reader' || currentUser?.role === 'editor'}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'quotations' && (
                <QuotationView 
                  key="quotations"
                  quotations={finalQuotations} 
                  services={filteredServices} 
                  resources={filteredResources}
                  onAdd={addQuotation} 
                  onDelete={deleteQuotation} 
                  onUpdate={updateQuotation}
                  companyLogo={companyLogo}
                  bdi={calculateBDI(bdiConfig)}
                  readonly={currentUser?.role === 'reader'}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'budget' && (
                <BudgetView 
                  key="budget"
                  services={filteredServices} 
                  resources={filteredResources} 
                  budgetItems={budgetItems}
                  setBudgetItems={setBudgetItems}
                  budgetGroups={budgetGroups}
                  setBudgetGroups={setBudgetGroups}
                  onSaveAsQuotation={addQuotation}
                  companyLogo={companyLogo}
                  defaultOrg={defaultOrganization}
                  bdi={calculateBDI(bdiConfig)}
                  readonly={currentUser?.role === 'reader'}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'bdi' && (
                <BDIView 
                  key="bdi"
                  bdiConfig={bdiConfig}
                  setBdiConfig={setBdiConfig}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'abc' && (
                <ABCCurveView 
                  key="abc"
                  services={filteredServices} 
                  resources={filteredResources} 
                  quotations={finalQuotations}
                  budgetItems={budgetItems}
                  budgetGroups={budgetGroups}
                  abcConfig={abcConfig}
                  bdi={calculateBDI(bdiConfig)}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'schedule' && (
                <ScheduleView 
                  key="schedule"
                  services={filteredServices} 
                  resources={filteredResources} 
                  quotations={finalQuotations}
                  schedules={schedules}
                  setSchedules={setSchedules}
                  budgetItems={budgetItems}
                  budgetGroups={budgetGroups}
                  readonly={currentUser?.role === 'reader'}
                />
              )}

              {mainTab === 'quotations' && activeTab === 'reports' && (
                <ReportsView 
                  key="reports"
                  quotations={finalQuotations}
                  services={filteredServices} 
                  resources={filteredResources} 
                  schedules={schedules}
                  budgetItems={budgetItems}
                  budgetGroups={budgetGroups}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  bdi={calculateBDI(bdiConfig)}
                />
              )}

              {mainTab === 'measurements' && (
                <MeasurementsView 
                  contracts={finalContracts}
                  onAddContract={addContract}
                  onUpdateContract={updateContract}
                  onDeleteContract={deleteContract}
                  onAddServices={addServices}
                  measurements={finalMeasurements}
                  onAddMeasurement={addMeasurement}
                  onUpdateMeasurement={updateMeasurement}
                  onDeleteMeasurement={deleteMeasurement}
                  quotations={finalQuotations}
                  services={filteredServices} 
                  resources={filteredResources} 
                  bdi={calculateBDI(bdiConfig)}
                  readonly={currentUser?.role === 'reader'}
                  templates={finalMeasurementTemplates}
                  memories={finalCalculationMemories}
                  onUpdateMemory={updateCalculationMemory}
                  highwayLocations={finalHighwayLocations}
                  onUpdateHighwayLocation={updateHighwayLocation}
                  onDeleteHighwayLocation={deleteHighwayLocation}
                  stationGroups={finalStationGroups}
                  onUpdateStationGroup={updateStationGroup}
                  onDeleteStationGroup={deleteStationGroup}
                  cubationData={finalCubationData}
                  onUpdateCubationData={updateCubationData}
                  transportData={finalTransportData}
                  onUpdateTransportData={updateTransportData}
                  serviceProductions={finalServiceProductions}
                  onUpdateServiceProduction={updateServiceProduction}
                  onDeleteServiceProduction={deleteServiceProduction}
                  dailyReports={finalDailyReports}
                  onAddDailyReport={addDailyReport}
                  onUpdateDailyReport={updateDailyReport}
                  onDeleteDailyReport={deleteDailyReport}
                  onMoveDailyReportActivity={moveDailyReportActivity}
                  pluviometryRecords={finalPluviometryRecords}
                  onAddPluviometryRecord={addPluviometryRecord}
                  onUpdatePluviometryRecord={updatePluviometryRecord}
                  technicalSchedules={finalTechnicalSchedules}
                  onUpdateTechnicalSchedule={updateTechnicalSchedule}
                  onSyncAll={handleSyncAllToSupabase}
                  schedules={schedules}
                  activeSubTab={activeMeasureTab}
                  onSetActiveSubTab={setActiveMeasureTab}
                  selectedContractId={selectedContractId}
                  onSetSelectedContractId={setSelectedContractId}
                  selectedMeasurementId={selectedMeasurementId}
                  onSetSelectedMeasurementId={setSelectedMeasurementId}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  controllerTeams={finalControllerTeams}
                  onUpdateTeams={updateTechnicalTeams}
                  controllerEquipments={finalControllerEquipments}
                  onUpdateEquipments={updateTechnicalEquipments}
                  controllerManpower={filteredControllerManpower}
                  onUpdateManpower={updateTechnicalManpower}
                  equipmentMonthly={equipmentMonthlyData}
                  manpowerMonthly={manpowerMonthlyData}
                  teamAssignments={teamAssignments}
                  onUpdateAssignments={updateTeamAssignments}
                  chargesPerc={chargesPerc}
                  otPerc={otPerc}
                  currentUser={currentUser!}
                />
              )}

              {mainTab === 'rh' && (
                <RHView 
                  currentUser={currentUser}
                  employees={employees}
                  timeRecords={timeRecords}
                  contracts={finalContracts}
                  selectedContractId={selectedContractId}
                  onUpdateContractId={(id) => setSelectedContractId(id || null)}
                  onUpdateEmployees={setEmployees}
                  onUpdateRecords={setTimeRecords}
                  initialTab={activeRHTab}
                />
              )}

              {mainTab === 'settings' && (
                <SettingsView 
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  onLogoUpload={handleLogoUpload}
                  onLogoClear={(pos) => pos === 'left' ? setCompanyLogo('') : setCompanyLogoRight('')}
                  onLogoModeChange={setLogoMode}
                  currentUser={currentUser!}
                  defaultOrg={defaultOrganization}
                  onDefaultOrgChange={setDefaultOrganization}
                  abcConfig={abcConfig}
                  onABCConfigChange={setAbcConfig}
                  dashboardConfig={dashboardConfig}
                  onDashboardConfigChange={setDashboardConfig}
                  resources={resources}
                  services={services}
                  quotations={quotations}
                  schedules={schedules}
                  budgetItems={budgetItems}
                  budgetGroups={budgetGroups}
                  bdiConfig={bdiConfig}
                  contracts={contracts}
                  measurements={measurements}
                  onUpdateMeasurement={updateMeasurement}
                  onAddContract={addContract}
                  onUpdateContract={updateContract}
                  onDeleteContract={deleteContract}
                  templates={finalMeasurementTemplates}
                  onSaveTemplate={saveTemplate}
                  onDeleteTemplate={deleteTemplate}
                  users={users}
                  onUpdateUsers={setUsers}
                  resetRequests={passwordResetRequests}
                  onUpdateResetRequests={setPasswordResetRequests}
                  emailConfig={emailConfig}
                  onEmailConfigChange={setEmailConfig}
                  onImportAll={(data) => {
                    if (data.resources) setResources(data.resources);
                    if (data.services) setServices(data.services);
                    if (data.quotations) setQuotations(data.quotations);
                    if (data.schedules) setSchedules(data.schedules);
                    if (data.budgetItems) setBudgetItems(data.budgetItems);
                    if (data.budgetGroups) setBudgetGroups(data.budgetGroups);
                    if (data.contracts) setContracts(data.contracts);
                    if (data.measurements) setMeasurements(data.measurements);
                    if (data.measurementTemplates) setMeasurementTemplates(data.measurementTemplates);
                    if (data.calculationMemories) setCalculationMemories(data.calculationMemories);
                    if (data.cubationData) setCubationData(data.cubationData);
                    if (data.transportData) setTransportData(data.transportData);
                    if (data.abcConfig) setAbcConfig(data.abcConfig);
                    if (data.bdiConfig) setBdiConfig(data.bdiConfig);
                    if (data.companyLogo) setCompanyLogo(data.companyLogo);
                    if (data.companyLogoRight) setCompanyLogoRight(data.companyLogoRight);
                    if (data.logoMode) setLogoMode(data.logoMode);
                    if (data.defaultOrganization) setDefaultOrganization(data.defaultOrganization);
                    if (data.emailConfig) setEmailConfig(data.emailConfig);
                    addAuditLog('Importação', 'Sistema', 'Importação total de dados realizada');
                    alert('Dados importados com sucesso!');
                  }}
                />
              )}

              {mainTab === 'admin' && currentUser?.role === 'master' && (
                <AdminView 
                  users={users}
                  onUpdateUsers={setUsers}
                  resetRequests={passwordResetRequests}
                  onUpdateResetRequests={setPasswordResetRequests}
                  onUpdateMeasurement={updateMeasurement}
                  onDeleteMeasurement={deleteMeasurement}
                  quotations={finalQuotations}
                  currentUser={currentUser!}
                  auditLogs={filteredAuditLogs}
                  resources={filteredResources}
                  services={filteredServices}
                  contracts={filteredContracts}
                  measurements={filteredMeasurements}
                  highwayLocations={highwayLocations}
                  stationGroups={stationGroups}
                  cubationData={cubationData}
                  transportData={transportData}
                  memories={calculationMemories}
                  serviceProductions={serviceProductions}
                  templates={measurementTemplates}
                  dailyReports={dailyReports}
                  pluviometryRecords={pluviometryRecords}
                  technicalSchedules={technicalSchedules}
                  employees={employees}
                  timeRecords={timeRecords}
                  schedules={schedules}
                  controllerTeams={controllerTeams}
                  controllerEquipments={controllerEquipments}
                  equipmentMonthly={equipmentMonthlyData}
                  controllerManpower={manpowerRecords}
                  manpowerMonthly={manpowerMonthlyData}
                  teamAssignments={teamAssignments}
                  marketingConfig={marketingConfig}
                  chargesPerc={chargesPerc}
                  otPerc={otPerc}
                  abcConfig={abcConfig}
                  bdiConfig={bdiConfig}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  defaultOrg={defaultOrganization}
                  onUpdateMarketing={setMarketingConfig}
                  onSyncAll={handleSyncAllToSupabase}
                  onSyncFromCloud={syncFromSupabase}
                />
              )}

              {mainTab === 'control' && currentUser && (
                <ControlView
                  currentUser={currentUser}
                  equipments={controllerEquipments}
                  equipmentMonthly={equipmentMonthlyData}
                  contracts={finalContracts}
                  selectedContractId={selectedContractId}
                  onUpdateContractId={(id) => setSelectedContractId(id)}
                  onUpdateEquipments={updateTechnicalEquipments}
                  onUpdateEquipmentMonthly={updateEquipmentMonthly}
                  equipmentMaintenance={equipmentMaintenance}
                  onUpdateMaintenance={updateEquipmentMaintenance}
                  transfers={equipmentTransfers}
                  onUpdateTransfers={updateEquipmentTransfers}
                  purchaseRequests={purchaseRequests}
                  onUpdatePurchaseRequests={setPurchaseRequests}
                  initialTab={activeControlTab}
                />
              )}

              {mainTab === 'purchases' && currentUser && (
                <PurchasesView 
                  suppliers={suppliers} 
                  setSuppliers={setSuppliers} 
                  orders={purchaseOrders} 
                  setOrders={(val) => {
                    lastLocalUpdate.current = Date.now();
                    setPurchaseOrders(val);
                  }}
                  requests={finalPurchaseRequests}
                  setRequests={(val) => {
                    lastLocalUpdate.current = Date.now();
                    setPurchaseRequests(val);
                  }}
                  purchaseQuotations={finalPurchaseQuotations}
                  setPurchaseQuotations={(val) => {
                    lastLocalUpdate.current = Date.now();
                    setPurchaseQuotations(val);
                  }}
                  compId={compId}
                  contracts={finalContracts}
                  initialTab={activePurchasesTab}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  defaultOrganization={defaultOrganization}
                  equipmentMaintenance={equipmentMaintenance}
                  onUpdateMaintenance={setEquipmentMaintenance}
                />
              )}
              {mainTab === 'project_admin' && currentUser && (
                <ProjectAdminView 
                  purchaseQuotations={purchaseQuotations}
                  setPurchaseQuotations={(val) => {
                    lastLocalUpdate.current = Date.now();
                    setPurchaseQuotations(val);
                  }}
                  suppliers={suppliers}
                  requests={purchaseRequests}
                  setRequests={(val) => {
                    lastLocalUpdate.current = Date.now();
                    setPurchaseRequests(val);
                  }}
                />
              )}

              {mainTab === 'profile' && currentUser && (
                <UserProfile 
                  user={currentUser} 
                  onUpdate={(updated) => {
                    handleUpdateProfile(updated);
                    addAuditLog('Edição', 'Perfil', `Perfil do usuário ${updated.username} atualizado`);
                  }} 
                />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      {currentUser && <Chat currentUser={currentUser} users={users} contracts={finalContracts} />}
    </div>
  );
}

function TopNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 h-full transition-all border-b-2 relative",
        active 
          ? "border-blue-600 text-blue-600 font-bold" 
          : "border-transparent text-gray-500 hover:text-gray-900"
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="top-nav-indicator" 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" 
        />
      )}
    </button>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed, showHandle }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean, showHandle?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full group text-left",
        active 
          ? "bg-blue-50 text-blue-600" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <div className={cn("w-5 h-5 shrink-0", active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")}>
        {icon}
      </div>
      {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
      {active && !collapsed && <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
      {showHandle && !collapsed && (
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3 h-3 text-gray-300" />
        </div>
      )}
    </button>
  );
}
