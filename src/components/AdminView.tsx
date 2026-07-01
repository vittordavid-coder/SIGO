import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { isPast, format } from 'date-fns';
import { Users, History, Plus, Trash2, Eye, ShieldCheck, UserPlus, Search, Database, Download, FileCode, Printer, Link, Server, Settings, Globe, AlertCircle, Building2, ChevronDown, ChevronRight, Key, Activity, CheckCircle2, XCircle, Loader2, Landmark, Percent, Clock } from 'lucide-react';
import { 
  User, Quotation, AuditLog, UserRole, Resource, ServiceComposition, Contract, Measurement, 
  HighwayLocation, StationGroup, CubationData, TransportData, CalculationMemory, 
  ServiceProduction, MeasurementTemplate, AppModule, DailyReport, PluviometryRecord, 
  TechnicalSchedule, Employee, TimeRecord, Schedule,
  ControllerTeam, ControllerEquipment, EquipmentMonthlyData, ControllerManpower,
  ManpowerMonthlyData, TeamAssignment, MarketingConfig, ModulePrice, SystemPlan, PasswordResetRequest,
  ABCConfig, BDIConfig
} from '../types';

const ALL_MODULE_OPTIONS: { id: AppModule, label: string }[] = [
  { id: 'quotations', label: 'Cotações' },
  { id: 'measurements', label: 'Sala Técnica' },
  { id: 'rh', label: 'RH' },
  { id: 'control', label: 'Controlador' },
  { id: 'purchases', label: 'Compras' },
  { id: 'project_admin', label: 'Administrador da Obra' },
  { id: 'gerencia', label: 'Gerência' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'almoxarife', label: 'Almoxarife' },
  { id: 'settings', label: 'Administrador do Sistema' },
];
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManagePermissionsDialog } from './ManagePermissionsDialog';
import { Button } from '@/components/ui/button';
import { cn, hashPassword } from '../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { generateFullSQLScript, DB_TABLES, SUPABASE_TABLE_DEFS, generateStructureSQL, generateDataSQL, generateDataPartsSQL, getSupabaseMigrationParts } from '../lib/sqlFormat';
import JSZip from 'jszip';
import { getSupabaseConfig, saveSupabaseConfig, SupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Modal } from "@/components/ui/Modal";

function EditCredentialsDialog({ user, onUpdate }: { user: User, onUpdate: (username: string, pass: string) => void }) {
  const [username, setUsername] = useState(user.username);
  const [pass, setPass] = useState(user.password || '');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-7 w-7 text-gray-400 hover:text-blue-600">
        <Key className="w-3.5 h-3.5" />
      </Button>

      <Modal hideCancel={true}
        isOpen={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        title="Alterar Credenciais"
        description={`Atualize o login e senha de ${user.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase text-sm">Cancelar</Button>
            <Button onClick={() => {
              onUpdate(username, pass);
              setOpen(false);
            }} className="rounded-xl bg-blue-600 font-bold uppercase text-sm">Salvar Alterações</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm uppercase font-bold text-gray-400">Novo Nome de Usuário</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm uppercase font-bold text-gray-400">Nova Senha</Label>
            <Input type="text" value={pass} onChange={e => setPass(e.target.value)} placeholder="Digite a nova senha" className="h-12 rounded-xl font-mono" />
          </div>
        </div>
      </Modal>
    </>
  );
}

function DeleteUserDialog({ user, onDelete }: { user: User, onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(true)}
        className="h-7 w-7 text-gray-400 hover:text-red-600"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>

      <Modal hideCancel={true}
        isOpen={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Excluir Usuário</span>
          </div>
        }
        description={
          <>
            Deseja realmente EXCLUIR PERMANENTEMENTE o usuário <strong>{user.name}</strong>? 
            Esta ação não pode ser desfeita e removerá todos os registros de acesso deste usuário.
          </>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase text-sm">Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              onDelete();
              setOpen(false);
            }} className="rounded-xl font-bold uppercase text-sm">Confirmar Exclusão</Button>
          </>
        }
      >
        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-800 font-bold uppercase tracking-tight">Todos os dados de log e permissões vinculados a este usuário serão mantidos para auditoria (ID {user.id.substring(0, 4)}...), mas o acesso será removido.</p>
        </div>
      </Modal>
    </>
  );
}

function RenewKeysDialog({ user, onUpdate }: { user: User, onUpdate: (keys: number, keysExpiresAt: string) => void }) {
  const [keys, setKeys] = useState(user.keys || 0);
  const [keysExpiresAt, setKeysExpiresAt] = useState(user.keysExpiresAt || '');
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    setKeys(user.keys || 0);
    setKeysExpiresAt(user.keysExpiresAt || '');
  }, [user]);

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(true)} 
        className="h-7 w-7 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
        title="Renovar Período / Chaves"
      >
        <Clock className="w-4 h-4" />
      </Button>

      <Modal 
        hideCancel={true}
        isOpen={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-amber-600">
            <Key className="w-5 h-5" />
            <span>Renovar Período ou Chaves</span>
          </div>
        }
        description={`Gerencie o período de expiração e chaves de acesso para ${user.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase text-sm">Cancelar</Button>
            <Button onClick={() => {
              onUpdate(keys, keysExpiresAt);
              setOpen(false);
            }} className="rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-bold uppercase text-sm">Salvar Alterações</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm uppercase font-bold text-gray-400">Quantidade de Chaves (Usuários)</Label>
            <Input 
              type="number" 
              value={keys} 
              onChange={e => setKeys(parseInt(e.target.value) || 0)} 
              className="h-12 rounded-xl" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm uppercase font-bold text-gray-400">Data de Expiração</Label>
            <Input 
              type="date" 
              value={keysExpiresAt} 
              onChange={e => setKeysExpiresAt(e.target.value)} 
              className="h-12 rounded-xl" 
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

interface AdminViewProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  quotations: Quotation[];
  currentUser: User;
  auditLogs: AuditLog[];
  resources: Resource[];
  services: ServiceComposition[];
  contracts: Contract[];
  measurements: Measurement[];
  highwayLocations: HighwayLocation[];
  stationGroups: StationGroup[];
  cubationData: CubationData[];
  transportData: TransportData[];
  memories: CalculationMemory[];
  serviceProductions: ServiceProduction[];
  templates: MeasurementTemplate[];
  dailyReports: DailyReport[];
  pluviometryRecords: PluviometryRecord[];
  technicalSchedules: TechnicalSchedule[];
  employees: Employee[];
  timeRecords: TimeRecord[];
  schedules: Schedule[];
  controllerTeams: ControllerTeam[];
  controllerEquipments: ControllerEquipment[];
  equipmentMonthly: EquipmentMonthlyData[];
  controllerManpower: ControllerManpower[];
  manpowerMonthly: ManpowerMonthlyData[];
  teamAssignments: TeamAssignment[];
  marketingConfig: MarketingConfig;
  chargesPerc: number;
  otPerc: number;
  abcConfig: ABCConfig;
  bdiConfig: BDIConfig;
  companyLogo: string;
  companyLogoRight: string;
  logoMode: string;
  defaultOrg: string;
  onUpdateMarketing: (config: MarketingConfig) => void;
  resetRequests: PasswordResetRequest[];
  onUpdateResetRequests: (requests: PasswordResetRequest[]) => void;
  onSyncAll?: () => Promise<void>;
  onSyncFromCloud?: (compId?: string) => Promise<any>;
  onUpdateMeasurement: (m: Measurement) => void;
  onDeleteMeasurement: (id: string, isApproval?: boolean) => void;
}

const TABLE_DESCRIPTIONS: Record<string, string> = {
  'app_state': 'app_state - Estado geral do aplicativo, blobs de cache e informações sobre versão.',
  'users': 'users - Usuários do sistema, níveis de permissão (master, admin, etc.) e dados de acesso.',
  'audit_logs': 'audit_logs - Registros de auditoria de ações críticas feitas pelos usuários para segurança.',
  'resources': 'resources - Insumos globais do sistema de orçamento (Materiais, Mão de Obra, Equipamentos).',
  'service_compositions': 'service_compositions - Composições de serviço, agrupando insumos para formação de preço unitário.',
  'quotations': 'quotations - Orçamentos (planilhas de custo) criados no sistema.',
  'contracts': 'contracts - Contratos firmados vinculados aos orçamentos cadastrados.',
  'measurements': 'measurements - Medições de contratos (boletins de medição) com seu avanço físico e financeiro.',
  'daily_reports': 'daily_reports - RDOs - Relatórios Diários de Obras relatando o dia a dia no canteiro.',
  'pluviometry_records': 'pluviometry_records - Registros pluviométricos e clima diários dos contratos.',
  'technical_schedules': 'technical_schedules - Cronogramas técnicos de planejamento (Gantt, prazos, frentes).',
  'calculation_memories': 'calculation_memories - Memórias de cálculo detalhando origens de quantitativos das medições.',
  'service_productions': 'service_productions - Controle de produção e apropriação dos serviços executados.',
  'highway_locations': 'highway_locations - Locais de rodovias para medições e apropriações (cadastros PNV).',
  'station_groups': 'station_groups - Grupos de estacas para controle linear das rodovias.',
  'cubation_data': 'cubation_data - Dados de cubação (cálculo de volumes de terraplenagem/pavimentação).',
  'transport_data': 'transport_data - Dados de transporte, DMTs e controle de fretes de materiais.',
  'employees': 'employees - Tabela destinada a dados dos colaboradores do setor RH.',
  'time_records': 'time_records - Registros de ponto e horas trabalhadas da equipe de RH.',
  'controller_teams': 'controller_teams - Equipes cadastradas no módulo do controlador para apropriação.',
  'equipments': 'equipments - Cadastro de equipamentos e frota alocada na obra.',
  'controller_manpower': 'controller_manpower - Saldos de Mão de obra da equipe sob o módulo do Controlador.',
  'team_assignments': 'team_assignments - Alocações de equipes e controle de vínculo nas frentes de serviço.',
  'equipment_monthly_data': 'equipment_monthly_data - Lançamentos e custos mensais de equipamentos e frota.',
  'manpower_monthly_data': 'manpower_monthly_data - Lançamentos e custos mensais da mão de obra.',
  'equipment_transfers': 'equipment_transfers - Registro de transferência de equipamentos entre contratos de obras.',
  'budget_schedules': 'budget_schedules - Cronogramas físico-financeiros originais dos orçamentos (Sconet).',
  'measurement_templates': 'measurement_templates - Templates com colunas personalizáveis para relatórios de medição.',
  'password_reset_requests': 'password_reset_requests - Controle e solicitações de redefinição de senha pendentes.',
  'chat_messages': 'chat_messages - Mensagens do sistema de chat interno entre usuários das empresas.',
  'chat_notifications': 'chat_notifications - Notificações de novas mensagens não lidas no chat.',
  'suppliers': 'suppliers - Cadastro de fornecedores ativos homologados para o módulo de compras.',
  'purchase_requests': 'purchase_requests - Solicitações de materiais feitas pela obra (Requisições de Compra).',
  'purchase_quotations': 'purchase_quotations - Pedidos e mapas de cotações enviados aos fornecedores.',
  'purchase_orders': 'purchase_orders - Ordens de compra formalizadas/emitidas.',
  'purchase_order_items': 'purchase_order_items - Itens individuais de materiais listados dentro de uma ordem de compra.',
  'purchase_order_payments': 'purchase_order_payments - Condições de pagamento e faturamento das ordens de compra.',
  'equipment_measurement_parameters': 'equipment_measurement_parameters - Parâmetros de medição de telemetria e calibração de sensores de equipamentos de obra.',
  'fuel_reservoirs': 'fuel_reservoirs - Reservatórios e postos de abastecimento de combustível de apoio da frota.',
  'fuel_logs': 'fuel_logs - Lançamentos e abastecimento individual de equipamentos e frota de apoio.',
  'rh_templates': 'rh_templates - Modelos e padrões de documentos para o módulo de recursos humanos (RH).',
  'aportes': 'aportes - Aportes financeiros, lançamentos e previsões de investimento para o setor de compras.',
  'aporte_items': 'aporte_items - Itens individuais de aportes financeiros alocados para compras específicas.'
};

export function AdminView({ 
  users, onUpdateUsers, resetRequests, onUpdateResetRequests, quotations, currentUser, auditLogs,
  resources, services, contracts, measurements, highwayLocations, stationGroups, cubationData, transportData, memories,
  serviceProductions, templates, dailyReports, pluviometryRecords, technicalSchedules, employees, timeRecords, schedules,
  controllerTeams, controllerEquipments, equipmentMonthly, controllerManpower, manpowerMonthly, teamAssignments,
  marketingConfig, chargesPerc, otPerc,
  abcConfig, bdiConfig, companyLogo, companyLogoRight, logoMode, defaultOrg,
  onUpdateMarketing,
  onSyncAll, onSyncFromCloud,
  onUpdateMeasurement, onDeleteMeasurement
}: AdminViewProps) {
  const [newUser, setNewUser] = useState({ 
    name: '', 
    username: '', 
    pass: '', 
    role: 'editor' as UserRole,
    companyId: '',
    companyName: '',
    jobFunction: '',
    allowedModules: [] as AppModule[],
    keys: 5,
    keysExpiresAt: ''
  });

  const companyUsersCount = React.useMemo(() => {
    return users.filter(u => u.companyId === currentUser.companyId).length;
  }, [users, currentUser.companyId]);

  const totalAllowed = currentUser.keys || 0;
  const remainingKeys = totalAllowed - companyUsersCount;

  const companies = React.useMemo(() => {
    const all = Array.from(new Map(users.map(u => [u.companyId, u.companyName])).entries())
      .filter(([id]) => !!id) as [string, string][];
    
    if (currentUser.role === 'master') return all;
    return all.filter(([id]) => id === currentUser.companyId);
  }, [users, currentUser]);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getSupabaseConfig());

  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [companyLogos, setCompanyLogos] = useState<Record<string, { left: string; right: string; mode: 'left' | 'right' | 'both' | 'none' }>>({});
  const [loadingLogos, setLoadingLogos] = useState<Record<string, boolean>>({});

  const [dbSchema, setDbSchema] = useState<any>(null);
  const [isFetchingSchema, setIsFetchingSchema] = useState(false);
  const [selectedCompanyIdToDelete, setSelectedCompanyIdToDelete] = useState('');
  const [selectedTableToDelete, setSelectedTableToDelete] = useState('');
  const [isDeletingCompanyData, setIsDeletingCompanyData] = useState(false);
  const [recordsCount, setRecordsCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  React.useEffect(() => {
    const fetchCount = async () => {
      if (!selectedCompanyIdToDelete || !selectedTableToDelete || !supabaseConfig.url || !supabaseConfig.key) {
        setRecordsCount(null);
        return;
      }
      setIsCounting(true);
      try {
        const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
        if (supabase) {
          let query = supabase.from(selectedTableToDelete).select('*', { count: 'exact', head: true });
          if (selectedTableToDelete === 'app_state') {
            query = query.like('id', `${selectedCompanyIdToDelete}_%`);
          } else {
            query = query.eq('company_id', selectedCompanyIdToDelete);
          }
          const { count, error } = await query;
          if (!error && count !== null) {
            setRecordsCount(count);
          } else {
            setRecordsCount(null);
          }
        }
      } catch (e) {
        setRecordsCount(null);
      } finally {
        setIsCounting(false);
      }
    };
    fetchCount();
  }, [selectedCompanyIdToDelete, selectedTableToDelete, supabaseConfig]);

  const handlePrintSchema = () => {
    const originalContent = document.body.innerHTML;
    const printContent = document.getElementById('schema-printable-area');
    if (printContent) {
      window.print();
    }
  };

  const handleExportSchema = () => {
    if (!dbSchema || dbSchema._error) return;
    import('exceljs').then(ExcelJS => {
      const workbook = new ExcelJS.Workbook();
      Object.keys(dbSchema).forEach(tableName => {
        const tableDef = dbSchema[tableName];
        if (!tableDef.properties) return;
        const sheet = workbook.addWorksheet(tableName.substring(0, 31));
        sheet.addRow(['Coluna', 'Tipo', 'Descrição']);
        Object.keys(tableDef.properties).forEach(colName => {
          const colDef = tableDef.properties[colName];
          sheet.addRow([colName, colDef.type || '', colDef.description || '']);
        });
      });
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'esquema_banco.xlsx';
        a.click();
      });
    });
  };

  const fetchDatabaseSchema = async () => {
    setIsFetchingSchema(true);
    try {
      // Simulate network delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const schema: any = {};
      Object.keys(SUPABASE_TABLE_DEFS).forEach(tableName => {
        const columnsStr = SUPABASE_TABLE_DEFS[tableName];
        // naive split by comma outside of parens/quotes, or just split by comma
        // Simple approach: split by comma, then take first word as colName, second as type
        const columns = columnsStr.split(',').map(c => c.trim()).filter(c => c);
        const properties: any = {};
        columns.forEach(col => {
          const parts = col.split(' ').filter(p => p);
          if (parts.length >= 2) {
            properties[parts[0]] = { type: parts[1], description: parts.slice(2).join(' ') };
          }
        });
        schema[tableName] = { properties };
      });
      setDbSchema(schema);
    } catch (e: any) {
      console.error(e);
      setDbSchema({ _error: 'Erro: ' + e.message });
    } finally {
      setIsFetchingSchema(false);
    }
  };

  const handleDeleteCompanyData = async () => {
    if (!selectedCompanyIdToDelete || !selectedTableToDelete) {
      alert('Selecione uma empresa e uma tabela.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja EXCLUIR TODOS OS DADOS da empresa selecionada na tabela ${selectedTableToDelete}? Esta ação é irreversível.`)) return;
    
    setIsDeletingCompanyData(true);
    const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
    if (!supabase) {
      setIsDeletingCompanyData(false);
      return;
    }

    try {
       let error;
       if (selectedTableToDelete === 'app_state') {
         // app_state table has no company_id column, delete using namespaced key prefix
         const { error: err } = await supabase.from('app_state').delete().like('id', `${selectedCompanyIdToDelete}_%`);
         error = err;
       } else {
         // Delete from the selected table
         const { error: err } = await supabase.from(selectedTableToDelete).delete().eq('company_id', selectedCompanyIdToDelete);
         error = err;

         if (!error) {
           // To maintain database integrity, we MUST also delete corresponding app_state keys,
           // otherwise subsequent client syncs will load stale JSON fallback data and restore the deleted records.
           const tableToAppStateKey: Record<string, string[]> = {
             'resources': ['sconet_resources'],
             'service_compositions': ['sconet_services'],
             'quotations': ['sconet_quotations'],
             'contracts': ['sconet_contracts'],
             'measurements': ['sconet_measurements'],
             'audit_logs': ['sigo_audit_logs'],
             'highway_locations': ['sigo_highway_locations'],
             'station_groups': ['sigo_station_groups'],
             'cubation_data': ['sigo_cubation_data'],
             'transport_data': ['sigo_transport_data'],
             'calculation_memories': ['sigo_calc_memories'],
             'service_productions': ['sigo_service_productions'],
             'daily_reports': ['sigo_daily_reports'],
             'pluviometry_records': ['sigo_pluviometry_records'],
             'technical_schedules': ['sigo_technical_schedules'],
             'employees': ['sigo_employees'],
             'time_records': ['sigo_time_records'],
             'measurement_templates': ['sigo_measurement_templates'],
             'budget_schedules': ['sconet_schedules'],
             'controller_equipments': ['sigo_controller_equipments'],
             'equipments': ['sigo_controller_equipments'],
             'equipment_maintenance': ['sigo_equipment_maintenance'],
             'equipment_monthly_data': ['sigo_equipment_monthly'],
             'controller_manpower': ['sigo_controller_manpower'],
             'manpower_monthly_data': ['sigo_manpower_monthly'],
             'equipment_transfers': ['sigo_equipment_transfers'],
             'suppliers': ['sigo_suppliers'],
             'purchase_requests': ['sigo_purchase_requests'],
             'purchase_quotations': ['sigo_purchase_quotations'],
             'purchase_orders': ['sigo_purchase_orders'],
             'fuel_reservoirs': ['sigo_fuel_tanks'],
             'fuel_logs': ['sigo_fuel_logs'],
           };

           const keysToDelete = tableToAppStateKey[selectedTableToDelete] || [];
           for (const key of keysToDelete) {
             const namespacedKey = `${selectedCompanyIdToDelete}_${key}`;
             await supabase.from('app_state').delete().eq('id', namespacedKey);
           }
         }
       }

       if (error) {
         alert('Erro ao excluir dados: ' + error.message);
       } else {
         alert(`Dados da empresa excluídos com sucesso na tabela ${selectedTableToDelete}`);
         setSelectedTableToDelete('');
       }
    } catch (e: any) {
      alert('Erro ao excluir dados: ' + e.message);
    } finally {
      setIsDeletingCompanyData(false);
      setSelectedCompanyIdToDelete('');
      setSelectedTableToDelete('');
    }
  };

  const toggleCompany = async (companyId: string) => {
    const isExpanding = !expandedCompanies.includes(companyId);
    setExpandedCompanies(prev => 
      prev.includes(companyId) ? prev.filter(c => c !== companyId) : [...prev, companyId]
    );

    if (isExpanding) {
      setLoadingLogos(prev => ({ ...prev, [companyId]: true }));
      try {
        if (supabaseConfig.url && supabaseConfig.key) {
          const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          if (supabase) {
            const { data, error } = await supabase
              .from('app_state')
              .select('id, content')
              .in('id', [
                `${companyId}_sigo_company_logo`,
                `${companyId}_sigo_company_logo_right`,
                `${companyId}_sigo_logo_mode`
              ]);
            
            if (!error && data) {
              const left = data.find(d => d.id === `${companyId}_sigo_company_logo`)?.content || '';
              const right = data.find(d => d.id === `${companyId}_sigo_company_logo_right`)?.content || '';
              const mode = data.find(d => d.id === `${companyId}_sigo_logo_mode`)?.content || 'left';
              setCompanyLogos(prev => ({
                ...prev,
                [companyId]: { left, right, mode }
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching company logos:", err);
      } finally {
        setLoadingLogos(prev => ({ ...prev, [companyId]: false }));
      }
    }
  };

  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, companyId: string, position: 'left' | 'right') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabaseConfig.url || !supabaseConfig.key) {
      alert("Configuração do Supabase pendente!");
      return;
    }

    setLoadingLogos(prev => ({ ...prev, [companyId]: true }));
    try {
      const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
      if (!supabase) throw new Error("Não foi possível criar o cliente do Supabase");

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `logos/${companyId}/${position}_${timestamp}_${cleanFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sys_adm')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
         throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('sys_adm').getPublicUrl(filePath);

      const key = `${companyId}_sigo_company_logo${position === 'right' ? '_right' : ''}`;
      const { error: dbError } = await supabase
        .from('app_state')
        .upsert({ id: key, content: publicUrl });

      if (dbError) throw dbError;

      setCompanyLogos(prev => {
        const current = prev[companyId] || { left: '', right: '', mode: 'left' };
        return {
          ...prev,
          [companyId]: {
            ...current,
            [position]: publicUrl
          }
        };
      });

      alert("Logo carregado e vinculado com sucesso!");
    } catch (err: any) {
      console.error("Logo upload failed:", err);
      alert(`Falha ao carregar logo: ${err.message || err}`);
    } finally {
      setLoadingLogos(prev => ({ ...prev, [companyId]: false }));
    }
  };

  const handleCompanyLogoClear = async (companyId: string, position: 'left' | 'right') => {
    if (!confirm("Tem certeza que deseja remover esta logo?")) return;

    if (!supabaseConfig.url || !supabaseConfig.key) return;

    setLoadingLogos(prev => ({ ...prev, [companyId]: true }));
    try {
      const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
      if (!supabase) return;

      const key = `${companyId}_sigo_company_logo${position === 'right' ? '_right' : ''}`;
      const { error: dbError } = await supabase
        .from('app_state')
        .upsert({ id: key, content: '' });

      if (dbError) throw dbError;

      setCompanyLogos(prev => {
        const current = prev[companyId] || { left: '', right: '', mode: 'left' };
        return {
          ...prev,
          [companyId]: {
            ...current,
            [position]: ''
          }
        };
      });

      alert("Logo removida com sucesso!");
    } catch (err: any) {
      console.error("Error clearing logo:", err);
      alert(`Falha ao remover logo: ${err.message}`);
    } finally {
      setLoadingLogos(prev => ({ ...prev, [companyId]: false }));
    }
  };

  const handleCompanyLogoModeChange = async (companyId: string, mode: 'left' | 'right' | 'both' | 'none') => {
    if (!supabaseConfig.url || !supabaseConfig.key) return;

    setLoadingLogos(prev => ({ ...prev, [companyId]: true }));
    try {
      const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
      if (!supabase) return;

      const key = `${companyId}_sigo_logo_mode`;
      const { error: dbError } = await supabase
        .from('app_state')
        .upsert({ id: key, content: mode });

      if (dbError) throw dbError;

      setCompanyLogos(prev => {
        const current = prev[companyId] || { left: '', right: '', mode: 'left' };
        return {
          ...prev,
          [companyId]: {
            ...current,
            mode
          }
        };
      });
    } catch (err: any) {
      console.error("Error updating logo mode:", err);
      alert(`Falha ao atualizar modo de logo: ${err.message}`);
    } finally {
      setLoadingLogos(prev => ({ ...prev, [companyId]: false }));
    }
  };
  const [selectedVerifyCompanyId, setSelectedVerifyCompanyId] = useState<string>('all');
  
  const uniqueCompanies = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    users.forEach(u => {
      if (u.companyId && !list.some(item => item.id === u.companyId)) {
        list.push({ id: u.companyId, name: u.companyName || u.name || 'Empresa Sem Nome' });
      }
    });
    return list;
  }, [users]);

  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending' | 'idle'>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [cloudCounts, setCloudCounts] = useState<Record<string, number | 'error' | null>>({});
  const [isFetchingCounts, setIsFetchingCounts] = useState(false);

  const fetchCloudCounts = async () => {
    if (!supabaseConfig.url || !supabaseConfig.key) {
      alert('Configure a URL e a Chave do Supabase primeiro.');
      return;
    }
    const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
    if (!supabase) return;

    setIsFetchingCounts(true);
    const newCounts: Record<string, number | 'error' | 'not_created'> = {};
    
    // Set pending visual state
    DB_TABLES.forEach(t => newCounts[t] = 'error');
    
    await Promise.all(DB_TABLES.map(async (table) => {
      try {
        let query = supabase.from(table).select('*', { count: 'exact', head: true });
        
        // Aplica o filtro de empresa para as tabelas que contêm o campo company_id
        if (selectedVerifyCompanyId !== 'all') {
          const nonCompanyTables = ['app_state', 'chat_messages', 'chat_notifications', 'password_reset_requests'];
          if (!nonCompanyTables.includes(table)) {
            query = query.eq('company_id', selectedVerifyCompanyId);
          }
        }

        const { count, error } = await query;
        if (error) {
          if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist') || error.message?.toLowerCase().includes('não existe')) {
            newCounts[table] = 'not_created';
          } else {
            newCounts[table] = 'error';
          }
        } else {
          newCounts[table] = count ?? 0;
        }
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('não existe')) {
          newCounts[table] = 'not_created';
        } else {
          newCounts[table] = 'error';
        }
      }
    }));
    
    setCloudCounts(newCounts);
    setIsFetchingCounts(false);
  };

  const handleSyncNow = async () => {
    if (!onSyncAll) return;
    setIsSyncing(true);
    try {
      await onSyncAll();
      alert('Sincronização manual concluída!');
    } catch (e) {
      alert('Erro na sincronização manual.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseConfig.url || !supabaseConfig.key) {
      alert('Configure a URL e a Chave do Supabase primeiro.');
      return;
    }

    if (!supabaseConfig.key.startsWith('eyJ')) {
      alert('Aviso: Sua Chave API (Key) não parece ser uma chave "anon" padrão do Supabase (que geralmente começa com "eyJ"). Verifique se copiou a chave correta no dashboard do Supabase (Project Settings > API).');
    }

    setIsTesting(true);
    const results: Record<string, 'success' | 'error' | 'pending' | 'idle'> = {};
    DB_TABLES.forEach(t => results[t] = 'pending');
    setTestResults(results);

    const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);
    if (!supabase) {
      setIsTesting(false);
      return;
    }

    // Parallelize tests for better performance
    await Promise.all(DB_TABLES.map(async (table) => {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        setTestResults(prev => ({
          ...prev,
          [table]: error ? 'error' : 'success'
        }));
      } catch (e) {
        setTestResults(prev => ({
          ...prev,
          [table]: 'error'
        }));
      }
    }));
    
    setIsTesting(false);
  };

  const handleSaveSupabase = async () => {
    const oldConfig = getSupabaseConfig();
    
    // Se o usuário está desativando o banco, perguntar se quer baixar os dados para o storage local
    if (oldConfig.enabled && !supabaseConfig.enabled && onSyncFromCloud) {
       const confirmDownload = window.confirm("Você está desativando o banco de dados nuvem. Deseja baixar todos os dados do Supabase para o seu armazenamento local (LocalStorage) antes de desconectar? Isso garante que você não perca as alterações feitas na nuvem.");
       if (confirmDownload) {
          setIsSyncing(true);
          try {
            await onSyncFromCloud(currentUser.companyId);
            alert('Dados baixados com sucesso!');
          } catch(e) {
            alert('Falha ao baixar dados da nuvem.');
          } finally {
            setIsSyncing(false);
          }
       }
    }

    saveSupabaseConfig(supabaseConfig);
    alert('Configurações do Supabase salvas com sucesso! A página será reiniciada para aplicar as mudanças.');
    window.location.reload();
  };

  const downloadSQL = (sql: string, fileName: string) => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportStructure = () => {
    downloadSQL(generateStructureSQL(), `sigo_estrutura_${new Date().toISOString().split('T')[0]}.sql`);
  };

  const getDataForExport = () => {
    const chatMessagesFromLocalStorage = JSON.parse(localStorage.getItem('chat_messages') || '[]');
    return {
      users, quotations, auditLogs, resources, services, contracts, measurements, 
      highwayLocations, stationGroups, cubationData, transportData, memories, 
      serviceProductions, dailyReports, pluviometryRecords, technicalSchedules, 
      employees, timeRecords, templates, schedules,
      chatMessages: chatMessagesFromLocalStorage,
      controllerTeams, 
      controllerEquipments: controllerEquipments.map(e => ({ ...e, chargesPercentage: chargesPerc, overtimePercentage: otPerc })), 
      equipmentMonthly: equipmentMonthly, 
      controllerManpower: controllerManpower.map(m => ({ ...m, chargesPercentage: chargesPerc, overtimePercentage: otPerc })), 
      manpowerMonthly, teamAssignments,
      passwordResetRequests: resetRequests,
      appState: [
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_ctrl_charges` : 'sigo_ctrl_charges', content: chargesPerc },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_ctrl_ot` : 'sigo_ctrl_ot', content: otPerc },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_marketing_config` : 'sigo_marketing_config', content: marketingConfig },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_abc_config` : 'sigo_abc_config', content: abcConfig },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_bdi_config` : 'sigo_bdi_config', content: bdiConfig },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_company_logo` : 'sigo_company_logo', content: companyLogo },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_company_logo_right` : 'sigo_company_logo_right', content: companyLogoRight },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_logo_mode` : 'sigo_logo_mode', content: logoMode },
        { id: currentUser.companyId ? `${currentUser.companyId}_sigo_default_org` : 'sigo_default_org', content: defaultOrg }
      ]
    };
  };

  const handleExportData = async () => {
    try {
      const zip = new JSZip();
      const parts = generateDataPartsSQL(getDataForExport());
      
      Object.entries(parts).forEach(([filename, content]) => {
        zip.file(filename, content);
      });
      
      const contentZip = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(contentZip);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sigo_dados_migracao_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate data ZIP:', error);
      alert('Erro ao gerar o arquivo ZIP com os dados.');
    }
  };

  const handleExportFullSQL = () => {
    const sql = generateFullSQLScript(getDataForExport());
    downloadSQL(sql, `sigo_full_${new Date().toISOString().split('T')[0]}.sql`);
  };

  const handleDownloadSupabaseZip = async () => {
    try {
      const zip = new JSZip();
      const parts = getSupabaseMigrationParts();
      
      Object.entries(parts).forEach(([filename, part]) => {
        zip.file(filename, part.content);
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sigo_supabase_migration_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ZIP:', error);
      alert('Erro ao gerar o arquivo ZIP. Verifique o console para mais detalhes.');
    }
  };

  const handleExportUsers = () => {
    import('exceljs').then(ExcelJS => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Usuários');
      sheet.addRow(['Nome', 'Usuário', 'Função', 'Nível de Acesso', 'Empresa', 'Status', 'Expiração de Chaves', 'Chaves', 'Plano Desejado']);
      users.forEach(u => {
        sheet.addRow([
          u.name,
          u.username,
          u.jobFunction || '',
          u.role,
          u.companyName || u.companyId,
          u.isActive !== false ? 'Ativo' : 'Inativo',
          u.keysExpiresAt ? format(new Date(u.keysExpiresAt), 'dd/MM/yyyy') : '',
          u.keys || 0,
          u.desiredPlan || ''
        ]);
      });
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'usuarios.xlsx';
        a.click();
      });
    });
  };

  const handlePrintUsers = () => {
    window.print();
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.pass) {
      alert('Preencha todos os campos do novo usuário');
      return;
    }
    if (users.some(u => u.username === newUser.username)) {
      alert('Este nome de usuário já está em uso');
      return;
    }

    if (currentUser.role !== 'master' && currentUser.keys !== undefined) {
      if (companyUsersCount >= currentUser.keys) {
        alert(`Limite de usuários atingido (${currentUser.keys}). Entre em contato com o Administrador Master para aumentar seu limite.`);
        return;
      }
    }

    const hashedPassword = await hashPassword(newUser.pass);

    const created: User = {
      id: crypto.randomUUID(),
      role: newUser.role,
      name: newUser.name,
      username: newUser.username,
      password: hashedPassword,
      jobFunction: newUser.jobFunction,
      companyId: currentUser.role === 'master' && (newUser.role === 'admin' || newUser.companyId === 'NEW') 
        ? crypto.randomUUID() 
        : (currentUser.role === 'master' ? newUser.companyId : currentUser.companyId),
      companyName: currentUser.role === 'master' && (newUser.role === 'admin' || newUser.companyId === 'NEW')
        ? (newUser.companyName || `${newUser.name} Enterprise`) 
        : (currentUser.role === 'master' 
            ? companies.find(c => c[0] === newUser.companyId)?.[1] || newUser.companyName 
            : currentUser.companyName),
      allowedQuotationIds: [],
      allowedContractIds: [],
      allowedModules: newUser.allowedModules,
      keys: newUser.role === 'admin' ? newUser.keys : undefined,
      keysExpiresAt: newUser.role === 'admin' ? newUser.keysExpiresAt : undefined,
      isApproved: true,
      isActive: true
    };
    const updatedUsers = [...users, created];
    onUpdateUsers(updatedUsers);
    
    // Immediate sync for user creation
    const config = getSupabaseConfig();
    if (config.enabled) {
      const supabase = createSupabaseClient(config.url, config.key);
      if (supabase) {
        try {
          const { error: userError } = await supabase.from('users').upsert(mapToSnake(created));
          if (userError) throw userError;
          
          const { error: blobError } = await supabase.from('app_state').upsert({ id: 'sigo_users', content: updatedUsers });
          if (blobError) throw blobError;
          
          console.log('[Supabase] User creation persisted immediately');
          const { data: verifyData, error: verifyError } = await supabase.from('users').select('id').eq('id', created.id).single();
          if (verifyError || !verifyData) {
            console.error('[Sync] Verification failed', verifyError);
            alert('Aviso: O usuário pode não ter sido salvo corretamente no banco de dados principal.');
          } else {
            alert('Usuário criado e verificado com sucesso no banco de dados!');
          }
        } catch (err) {
          console.error('[Sync] User creation persistence failed', err);
          alert('Erro ao salvar no banco de dados. O usuário foi salvo localmente, mas a sincronização falhou.');
        }
      }
    } else {
       alert('Usuário criado com sucesso (modo local)!');
    }

    setNewUser({ name: '', username: '', pass: '', role: 'editor', companyId: '', companyName: '', jobFunction: '', allowedModules: [], keys: 5, keysExpiresAt: '' });
  };

  // Helper for snake_case mapping
  function mapToSnake(obj: any) {
    const newObj: any = {};
    for (const k in obj) {
      const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[k];
    }
    return newObj;
  }

  const [searchLog, setSearchLog] = useState('');
  const filteredLogs = auditLogs.filter(log => 
    log.userName.toLowerCase().includes(searchLog.toLowerCase()) ||
    log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
    log.module.toLowerCase().includes(searchLog.toLowerCase()) ||
    log.details.toLowerCase().includes(searchLog.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Administrador Master</h3>
          <p className="text-gray-500">Gerencie contas, permissões e monitore o histórico do sistema.</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl mb-6">
          <TabsTrigger value="users" className="gap-2 px-6">
            <Users className="w-4 h-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-6">
            <History className="w-4 h-4" /> Logs de Alteração
          </TabsTrigger>
          {currentUser.role === 'master' && (
            <TabsTrigger value="database" className="gap-2 px-6">
              <Database className="w-4 h-4" /> Banco de Dados
            </TabsTrigger>
          )}
          {currentUser.role === 'master' && (
            <TabsTrigger value="marketing" className="gap-2 px-6">
              <Landmark className="w-4 h-4" /> Marketing & Planos
            </TabsTrigger>
          )}
          {currentUser.role === 'master' && (
            <TabsTrigger value="pending" className="gap-2 px-6 relative">
              <UserPlus className="w-4 h-4" /> Cadastros & Exclusões
              {(users.filter(u => u.isApproved === false && u.username !== 'vittor').length + measurements.filter(m => m.status === 'pending_deletion').length) > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-sm rounded-full">
                  {users.filter(u => u.isApproved === false && u.username !== 'vittor').length + measurements.filter(m => m.status === 'pending_deletion').length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm h-fit lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    Cadastrar Usuário
                  </div>
                  {currentUser.role !== 'master' && currentUser.keys !== undefined && (
                    <Badge variant={remainingKeys <= 0 ? "destructive" : "outline"} className="text-sm">
                      {remainingKeys} / {totalAllowed} chaves disponíveis
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Crie novas contas para sua equipe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="João Silva" />
                </div>
                <div className="space-y-2">
                  <Label>Função / Cargo</Label>
                  <Input value={newUser.jobFunction} onChange={e => setNewUser({...newUser, jobFunction: e.target.value})} placeholder="Ex: Engenheiro de Obra" />
                </div>
                <div className="space-y-2">
                  <Label>Usuário (Login)</Label>
                  <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="joao.silva" />
                </div>
                <div className="space-y-2">
                  <Label>Senha inicial</Label>
                  <Input type="password" value={newUser.pass} onChange={e => setNewUser({...newUser, pass: e.target.value})} placeholder="••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={newUser.role} onValueChange={(r: UserRole) => setNewUser({...newUser, role: r})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentUser.role === 'master' && <SelectItem value="master">Admin Master</SelectItem>}
                      {currentUser.role === 'master' && <SelectItem value="admin">Administrador (Empresa)</SelectItem>}
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="project_admin">Administrador da Obra</SelectItem>
                      <SelectItem value="reader">Leitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentUser.role === 'master' && (
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Select 
                      value={newUser.companyId} 
                      onValueChange={(id) => setNewUser({...newUser, companyId: id, companyName: id === 'NEW' ? '' : companies.find(c => c[0] === id)?.[1] || ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa">
                          {newUser.companyId === 'NEW' 
                            ? "+ Criar Nova Empresa" 
                            : (companies.find(c => c[0] === newUser.companyId)?.[1] || "Selecione uma empresa")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">+ Criar Nova Empresa</SelectItem>
                        <Separator className="my-1" />
                        {companies.map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentUser.role === 'master' && (newUser.role === 'admin' || newUser.companyId === 'NEW') && (
                  <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    {newUser.companyId === 'NEW' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Nome da Nova Empresa</Label>
                        <Input value={newUser.companyName} onChange={e => setNewUser({...newUser, companyName: e.target.value})} placeholder="Ex: Construtora Alfa LTDA" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">Chaves (Usuários) <Key className="w-3 h-3 text-amber-500" /></Label>
                      <Input type="number" value={newUser.keys} onChange={e => setNewUser({...newUser, keys: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                       <Label className="flex items-center gap-1">Expiração das Chaves <Clock className="w-3 h-3 text-amber-500" /></Label>
                       <Input type="date" value={newUser.keysExpiresAt} onChange={e => setNewUser({...newUser, keysExpiresAt: e.target.value})} />
                    </div>
                  </div>
                )}

                {(newUser.role === 'editor' || newUser.role === 'reader' || (newUser.role === 'admin' && currentUser.role === 'master')) && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm text-gray-400 uppercase tracking-wider font-bold">Módulos que pode acessar</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_MODULE_OPTIONS.map(m => (
                        <div key={m.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 transition-colors">
                          <Checkbox 
                            id={`mod-${m.id}`}
                            checked={!!newUser.allowedModules?.includes(m.id)}
                            onCheckedChange={(checked) => {
                              const modules = checked 
                                ? [...(newUser.allowedModules || []), m.id]
                                : (newUser.allowedModules || []).filter(id => id !== m.id);
                              setNewUser({ ...newUser, allowedModules: modules as AppModule[] });
                            }}
                          />
                          <Label htmlFor={`mod-${m.id}`} className="text-sm cursor-pointer">{m.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">Criar Usuário</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm lg:col-span-2 overflow-hidden">
              <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <CardTitle>Gerenciar Acessos</CardTitle>
                  <CardDescription>Acesse e controle as permissões de cada usuário.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportUsers}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrintUsers}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)] border-none">
                <div className="space-y-1" id="printable-content">
                  {users.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      Nenhum usuário disponível para visualização.
                    </div>
                  ) : (
                    companies.map(([companyId, companyName]) => {
                      const companyUsers = users.filter(u => u.companyId === companyId);
                      const isExpanded = expandedCompanies.includes(companyId);
                      
                      return (
                        <div key={companyId} className="border-b border-gray-100 last:border-0">
                          <button 
                            onClick={() => toggleCompany(companyId)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-50 p-2 rounded-lg">
                                <Building2 className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{companyName || 'Empresa Sem Nome'}</h4>
                                <p className="text-sm text-gray-500">{companyUsers.length} usuários vinculados</p>
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-4">
                              {/* Configuração de Branding da Empresa */}
                              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                                  <div>
                                    <h5 className="font-bold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                       🖼️ Configuração de Branding da Empresa
                                    </h5>
                                    <p className="text-xs text-slate-500">
                                      Carregue logos oficiais que serão salvas no bucket <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">sys_adm</code> e vinculadas a esta empresa.
                                    </p>
                                  </div>
                                  
                                  {/* Select Mode */}
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500 whitespace-nowrap">Modo de Exibição:</Label>
                                    <Select 
                                      value={companyLogos[companyId]?.mode || 'left'} 
                                      onValueChange={(val: any) => handleCompanyLogoModeChange(companyId, val)}
                                    >
                                      <SelectTrigger className="h-8 text-xs font-medium w-[180px] bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Apenas Logo 01 (Esquerdo)</SelectItem>
                                        <SelectItem value="right">Apenas Logo 02 (Direito)</SelectItem>
                                        <SelectItem value="both">Ambas as Logos</SelectItem>
                                        <SelectItem value="none">Sem Logo nas Páginas</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Logo 1 (Left) */}
                                  <div className="bg-white border border-gray-100 rounded-lg p-3 flex flex-col items-center justify-center relative min-h-[120px]">
                                    {loadingLogos[companyId] ? (
                                      <span className="text-xs text-gray-400 font-medium animate-pulse">Sincronizando...</span>
                                    ) : companyLogos[companyId]?.left ? (
                                      <div className="group relative w-full flex flex-col items-center gap-2">
                                        <img src={companyLogos[companyId].left} alt="Logo 01" className="max-h-24 object-contain rounded-md" />
                                        <Button 
                                          variant="destructive" 
                                          size="xs" 
                                          className="h-7 text-[10px] uppercase font-bold" 
                                          onClick={() => handleCompanyLogoClear(companyId, 'left')}
                                        >
                                          Remover Logo 01
                                        </Button>
                                      </div>
                                    ) : (
                                      <label className="cursor-pointer group flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 rounded-lg w-full hover:bg-slate-50 transition-colors">
                                        <div className="bg-slate-50 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
                                          <Building2 className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600">Carregar Logo 01 (Esquerda)</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleCompanyLogoUpload(e, companyId, 'left')} 
                                        />
                                      </label>
                                    )}
                                  </div>

                                  {/* Logo 2 (Right) */}
                                  <div className="bg-white border border-gray-100 rounded-lg p-3 flex flex-col items-center justify-center relative min-h-[120px]">
                                    {loadingLogos[companyId] ? (
                                      <span className="text-xs text-gray-400 font-medium animate-pulse">Sincronizando...</span>
                                    ) : companyLogos[companyId]?.right ? (
                                      <div className="group relative w-full flex flex-col items-center gap-2">
                                        <img src={companyLogos[companyId].right} alt="Logo 02" className="max-h-24 object-contain rounded-md" />
                                        <Button 
                                          variant="destructive" 
                                          size="xs" 
                                          className="h-7 text-[10px] uppercase font-bold" 
                                          onClick={() => handleCompanyLogoClear(companyId, 'right')}
                                        >
                                          Remover Logo 02
                                        </Button>
                                      </div>
                                    ) : (
                                      <label className="cursor-pointer group flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 rounded-lg w-full hover:bg-slate-50 transition-colors">
                                        <div className="bg-slate-50 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
                                          <Building2 className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600">Carregar Logo 02 (Direita)</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleCompanyLogoUpload(e, companyId, 'right')} 
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-gray-100 overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                      <TableHead className="text-sm uppercase font-bold">Usuário</TableHead>
                                      <TableHead className="text-sm uppercase font-bold text-center">Nível</TableHead>
                                      <TableHead className="text-sm uppercase font-bold text-center">Obras</TableHead>
                                      <TableHead className="text-sm uppercase font-bold text-center">Contratos</TableHead>
                                      <TableHead className="text-sm uppercase font-bold text-center">Módulos</TableHead>
                                      <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {companyUsers.map(u => (
                                      <TableRow key={u.id} className="hover:bg-gray-50/50">
                                        <TableCell>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-base text-gray-900">{u.name}</span>
                                              {u.jobFunction && <span className="text-sm text-blue-600 font-medium">({u.jobFunction})</span>}
                                              {u.role === 'admin' && u.keys !== undefined && (
                                                <div className="flex flex-col gap-1">
                                                  <Badge variant="outline" className="text-xs h-4 bg-amber-50 text-amber-600 border-amber-200 gap-1 px-1">
                                                    <Key className="w-2 h-2" /> {u.keys} chaves
                                                  </Badge>
                                                  {u.keysExpiresAt && (
                                                    <span className={cn(
                                                      "text-[10px] font-medium px-1",
                                                      isPast(new Date(u.keysExpiresAt)) ? "text-red-500 font-bold" : "text-gray-400"
                                                    )}>
                                                      Expira em: {format(new Date(u.keysExpiresAt), 'dd/MM/yyyy')}
                                                      {isPast(new Date(u.keysExpiresAt)) && " (EXPIRADO)"}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <span className="text-sm text-gray-500">@{u.username}</span>
                                            {u.lastAccessAt ? (
                                              <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
                                                Último acesso: {format(new Date(u.lastAccessAt), 'dd/MM/yyyy HH:mm')}
                                              </span>
                                            ) : (
                                              <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
                                                Último acesso: Nunca
                                              </span>
                                            )}
                                            {u.desiredPlan && (
                                               <Badge variant="outline" className="text-[10px] h-3.5 bg-blue-50 text-blue-600 border-blue-200 mt-1 w-fit">
                                                 Plano: {u.desiredPlan}
                                               </Badge>
                                            )}
                                            {u.hasCompany && (
                                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                                                <Building2 className="w-2 h-2" /> Empresa vinculada
                                              </span>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {u.role === 'master' ? (
                                             <Badge className="bg-blue-600">MASTER</Badge>
                                          ) : (
                                            <Select value={u.role} onValueChange={(role: UserRole) => {
                                              onUpdateUsers(users.map(user => user.id === u.id ? { ...user, role } : user));
                                            }}>
                                              <SelectTrigger className="h-7 w-28 text-sm">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {currentUser.role === 'master' && <SelectItem value="master">Master</SelectItem>}
                                                {currentUser.role === 'master' && <SelectItem value="admin">Admin</SelectItem>}
                                                <SelectItem value="editor">Editor</SelectItem>
                                                <SelectItem value="project_admin">Adm. Obra</SelectItem>
                                                <SelectItem value="reader">Leitor</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {(u.role === 'admin' || u.role === 'master') ? (
                                            <span className="text-sm text-green-600 font-semibold flex items-center justify-center gap-1">
                                              <ShieldCheck className="w-3 h-3" /> Acesso Total
                                            </span>
                                          ) : (
                                            <ManagePermissionsDialog
                                              title={`Permissões de Obras: ${u.name}`}
                                              description="Selecione quais planilhas este usuário pode visualizar."
                                              items={quotations.filter(q => q.companyId === companyId).map(q => ({
                                                id: q.id,
                                                title: q.budgetName,
                                                subtitle: q.organization
                                              }))}
                                              selectedIds={u.allowedQuotationIds || []}
                                              onSave={(newIds) => {
                                                onUpdateUsers(users.map(user => user.id === u.id ? { ...user, allowedQuotationIds: newIds } : user));
                                              }}
                                              triggerButton={
                                                <Button variant="outline" size="sm" className="h-7 text-sm gap-1 px-2">
                                                  <Eye className="w-3 h-3" /> {u.allowedQuotationIds?.length || 0}
                                                </Button>
                                              }
                                              emptyMessage="Nenhuma obra cadastrada para esta empresa."
                                            />
                                          )}
                                                                                  {(u.role === 'admin' || u.role === 'master') ? (
                                            <span className="text-sm text-green-600 font-semibold flex items-center justify-center gap-1">
                                              <ShieldCheck className="w-3 h-3" /> Acesso Total
                                            </span>
                                          ) : (
                                            <ManagePermissionsDialog
                                              title={`Permissões de Contratos: ${u.name}`}
                                              description="Selecione quais contratos este usuário pode visualizar."
                                              items={contracts.filter(c => c.companyId === companyId).map(c => ({
                                                id: c.id,
                                                title: `${c.contractNumber || 'S/N'} - ${c.workName || c.client || 'Sem nome'}`,
                                                subtitle: c.client || c.object || 'Sem cliente associado'
                                              }))}
                                              selectedIds={u.allowedContractIds || []}
                                              onSave={(newIds) => {
                                                onUpdateUsers(users.map(user => user.id === u.id ? { ...user, allowedContractIds: newIds } : user));
                                              }}
                                              triggerButton={
                                                <Button variant="outline" size="sm" className="h-7 text-sm gap-1 px-2">
                                                  <Link className="w-3 h-3" /> {u.allowedContractIds?.length || 0}
                                                </Button>
                                              }
                                              emptyMessage="Nenhum contrato cadastrado para esta empresa."
                                            />
                                          )}
                                         </TableCell>
                                         <TableCell className="text-center">
                                           {(u.role === 'admin' || u.role === 'master') ? (
                                             <span className="text-sm text-green-600 font-semibold flex items-center justify-center gap-1">
                                               <ShieldCheck className="w-3 h-3" /> Acesso Total
                                             </span>
                                           ) : (
                                            <ManagePermissionsDialog
                                              title={`Permissões de Módulos: ${u.name}`}
                                              description={
                                                <>
                                                  Selecione quais funcionalidades este usuário pode acessar.
                                                  {u.desiredModules && u.desiredModules.length > 0 && (
                                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                                                      <strong>Solicitado no cadastro:</strong> {(u.desiredModules || []).map(m => ALL_MODULE_OPTIONS.find(opt => opt.id === m)?.label).join(', ')}
                                                    </div>
                                                  )}
                                                </>
                                              }
                                              items={ALL_MODULE_OPTIONS.map(m => ({
                                                id: m.id,
                                                title: m.label
                                              }))}
                                              selectedIds={u.allowedModules || []}
                                              onSave={(newIds) => {
                                                onUpdateUsers(users.map(user => user.id === u.id ? { ...user, allowedModules: newIds as AppModule[] } : user));
                                              }}
                                              triggerButton={
                                                <Button variant="outline" size="sm" className="h-7 text-sm gap-1 px-2">
                                                  <Settings className="w-3 h-3" /> {u.allowedModules?.length || 0}
                                                </Button>
                                              }
                                              emptyMessage="Nenhum módulo disponível."
                                            />
                                           )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <div className="flex items-center gap-2 mr-2">
                                              <span className={cn("text-sm font-bold", u.isActive !== false ? "text-green-600" : "text-red-600")}>
                                                {u.isActive !== false ? 'Ativo' : 'Inativo'}
                                              </span>
                                              <Switch 
                                                checked={u.isActive !== false}
                                                onCheckedChange={(checked) => {
                                                  onUpdateUsers(users.map(user => user.id === u.id ? { ...user, isActive: checked } : user));
                                                }}
                                              />
                                            </div>
                                            {u.role !== 'master' && (
                                              <RenewKeysDialog 
                                                user={u} 
                                                onUpdate={(keys, keysExpiresAt) => {
                                                  onUpdateUsers(users.map(user => user.id === u.id ? { ...user, keys, keysExpiresAt } : user));
                                                }} 
                                              />
                                            )}
                                            <EditCredentialsDialog 
                                              user={u} 
                                              onUpdate={async (username, password) => {
                                                const hashedPassword = password === u.password ? password : await hashPassword(password);
                                                onUpdateUsers(users.map(user => user.id === u.id ? { ...user, username, password: hashedPassword } : user));
                                              }} 
                                            />
                                            {u.id !== currentUser.id && (
                                              <DeleteUserDialog 
                                                user={u} 
                                                onDelete={() => {
                                                  onUpdateUsers(users.filter(user => user.id !== u.id));
                                                }} 
                                              />
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
               <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Histórico de Alterações
                  </CardTitle>
                  <CardDescription>Registro completo de atividades no sistema.</CardDescription>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Pesquisar histórico..." 
                    className="pl-9 w-64 h-9 text-sm" 
                    value={searchLog}
                    onChange={e => setSearchLog(e.target.value)}
                  />
                </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-280px)] w-full">
                <Table>
                  <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[180px]">Data/Hora</TableHead>
                      <TableHead className="w-[150px]">Usuário</TableHead>
                      <TableHead className="w-[100px]">Módulo</TableHead>
                      <TableHead className="w-[120px]">Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-gray-500">
                           Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id} className="text-sm">
                          <TableCell className="text-gray-500 font-mono">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : 'Data inválida'}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-700">
                            {log.userName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-sm font-medium border-gray-200 bg-gray-50">
                              {log.module}
                            </Badge>
                          </TableCell>
                          <TableCell>
                             <span className={cn(
                               "px-2 py-0.5 rounded-full font-bold",
                               log.action === 'Exclusão' ? "text-red-600 bg-red-50" :
                               log.action === 'Adição' ? "text-green-600 bg-green-50" :
                               log.action === 'Edição' ? "text-blue-600 bg-blue-50" :
                               "text-orange-600 bg-orange-50"
                             )}>
                               {log.action}
                             </span>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Visão Geral do Banco de Dados
                </CardTitle>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                  <CardDescription>Status das tabelas e volume de registros local e na nuvem.</CardDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filtro de Empresa */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-inner">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Empresa:</span>
                      <select
                        value={selectedVerifyCompanyId}
                        onChange={(e) => setSelectedVerifyCompanyId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-0 max-w-[150px] truncate"
                        disabled={isFetchingCounts || !supabaseConfig.enabled}
                      >
                        <option value="all">Todas as Empresas</option>
                        {uniqueCompanies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchCloudCounts}
                      disabled={isFetchingCounts || !supabaseConfig.enabled}
                      className="h-8 text-sm font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
                    >
                      {isFetchingCounts ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-2" />}
                      Verificar Supabase
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Tabela (Supabase)</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Nuvem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DB_TABLES.map(table => {
                        // Map local counts
                        let localCount: number | undefined = undefined;
                        switch (table) {
                          case 'users': localCount = users.length; break;
                          case 'resources': localCount = resources.length; break;
                          case 'service_compositions': localCount = services.length; break;
                          case 'quotations': localCount = quotations.length; break;
                          case 'contracts': localCount = contracts.length; break;
                          case 'measurements': localCount = measurements.length; break;
                          case 'highway_locations': localCount = highwayLocations.length; break;
                          case 'station_groups': localCount = stationGroups.length; break;
                          case 'cubation_data': localCount = cubationData.length; break;
                          case 'transport_data': localCount = transportData.length; break;
                          case 'calculation_memories': localCount = memories.length; break;
                          case 'service_productions': localCount = serviceProductions.length; break;
                          case 'measurement_templates': localCount = templates.length; break;
                          case 'controller_teams': localCount = controllerTeams.length; break;
                          case 'equipments': localCount = controllerEquipments.length; break;
                          case 'controller_manpower': localCount = controllerManpower.length; break;
                          case 'audit_logs': localCount = auditLogs.length; break;
                          case 'daily_reports': localCount = dailyReports.length; break;
                          case 'pluviometry_records': localCount = pluviometryRecords.length; break;
                          case 'technical_schedules': localCount = technicalSchedules.length; break;
                          case 'employees': localCount = employees.length; break;
                          case 'time_records': localCount = timeRecords.length; break;
                          case 'budget_schedules': localCount = schedules.length; break;
                          case 'team_assignments': localCount = teamAssignments.length; break;
                          case 'equipment_monthly_data': localCount = equipmentMonthly.length; break;
                          case 'manpower_monthly_data': localCount = manpowerMonthly.length; break;
                        }

                        return (
                          <DBTableRow 
                            key={table} 
                            name={table} 
                            description={TABLE_DESCRIPTIONS[table] || 'Tabela do sistema'}
                            localCount={localCount} 
                            cloudCount={cloudCounts[table]} 
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
                
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                   <div className="text-sm text-gray-500 font-medium">
                      O "Verificar Supabase" consulta as tabelas diretamente na nuvem
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Schema and Cleanup Section */}
            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-red-600" />
                  Manutenção Avançada do Banco de Dados
                </CardTitle>
                <CardDescription>Visualize o esquema das tabelas e gerencie dados por empresa na nuvem.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Delete Data per Company */}
                <div className="p-4 border border-red-100 bg-red-50/30 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-bold">Excluir Dados por Empresa (Nuvem)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Selecione a Empresa</Label>
                      <Select value={selectedCompanyIdToDelete} onValueChange={setSelectedCompanyIdToDelete}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(([id, name]) => (
                            <SelectItem key={id} value={id}>{name || id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700">Selecione a Tabela</Label>
                      <Select value={selectedTableToDelete} onValueChange={setSelectedTableToDelete}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DB_TABLES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {selectedCompanyIdToDelete && selectedTableToDelete && (
                    <div className="bg-white p-3 rounded-md border flex items-center justify-between">
                      <span className="text-base font-medium text-gray-700">Registros encontrados:</span>
                      {isCounting ? (
                        <span className="flex items-center text-base text-blue-600 font-bold"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Contando...</span>
                      ) : (
                        <span className="text-base font-bold text-emerald-600">{recordsCount !== null ? recordsCount : '0'}</span>
                      )}
                    </div>
                  )}

                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleDeleteCompanyData}
                    disabled={isDeletingCompanyData || !selectedCompanyIdToDelete || !selectedTableToDelete}
                  >
                    {isDeletingCompanyData ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                    Excluir Todos os Dados da Empresa na Tabela Selecionada
                  </Button>
                </div>

                {/* Schema Viewer */}
                <div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-gray-800">Esquema das Tabelas (OpenAPI / PostgREST)</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleExportSchema} disabled={!dbSchema || !!dbSchema._error}>
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Exportar Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePrintSchema} disabled={!dbSchema || !!dbSchema._error}>
                        <Printer className="w-3.5 h-3.5 mr-2" />
                        Imprimir
                      </Button>
                      <Button variant="outline" size="sm" onClick={fetchDatabaseSchema} disabled={isFetchingSchema}>
                        {isFetchingSchema ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-2" />}
                        Buscar Esquema
                      </Button>
                    </div>
                  </div>

                  {dbSchema && !dbSchema._error && (
                    <ScrollArea className="h-[calc(100vh-280px)] border rounded-xl bg-slate-50 p-4" id="schema-printable-area">
                      <div className="space-y-6">
                        {Object.keys(dbSchema).map(tableName => {
                          const tableDef = dbSchema[tableName];
                          if (!tableDef.properties) return null;
                          
                          return (
                            <div key={tableName} className="bg-white p-4 rounded-lg border shadow-sm">
                              <h4 className="font-bold text-blue-800 mb-2">{tableName}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.keys(tableDef.properties).map(colName => {
                                  const colDef = tableDef.properties[colName];
                                  return (
                                    <div key={colName} className="text-sm p-1.5 bg-slate-50 border rounded flex flex-col">
                                      <span className="font-bold text-slate-700">{colName}</span>
                                      <span className="text-sm text-slate-500">{colDef.type || colDef.format || 'unknown'} {colDef.description && `(${colDef.description})`}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                  {dbSchema && dbSchema._error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-base">
                      {dbSchema._error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-1">
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-emerald-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Conectar Servidor Nuvem
                  </CardTitle>
                  <CardDescription className="text-emerald-100">Sincronize seus dados com o banco remoto.</CardDescription>
                </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   {import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && (
                     <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2">
                       <span className="text-sm font-bold text-blue-600 uppercase tracking-wider block mb-1">Configuração de Ambiente Ativa</span>
                       <p className="text-sm text-blue-700 leading-relaxed">
                         O sistema está rodando com credenciais de ambiente. 
                         Para sobrescrever, preencha os campos abaixo e salve.
                       </p>
                     </div>
                   )}
                   <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <Server className={cn("w-5 h-5", supabaseConfig.enabled ? "text-emerald-600" : "text-gray-400")} />
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-700">Database Online</span>
                        <span className={cn("text-sm uppercase font-bold", supabaseConfig.enabled ? "text-emerald-600" : "text-gray-400")}>
                          {supabaseConfig.enabled ? 'Sincronização Ativa' : 'Apenas LocalStorage'}
                        </span>
                      </div>
                    </div>
                    <Switch 
                      checked={supabaseConfig.enabled}
                      onCheckedChange={(enabled) => setSupabaseConfig({...supabaseConfig, enabled})}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-500">URL do Banco de Dados</Label>
                      <Input 
                        placeholder="https://sua-instancia.nuvem.com" 
                        value={supabaseConfig.url} 
                        onChange={e => setSupabaseConfig({...supabaseConfig, url: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-500">Chave de API / Token de Acesso</Label>
                      <Input 
                        type="password"
                        placeholder="Token de segurança..." 
                        value={supabaseConfig.key}
                        onChange={e => setSupabaseConfig({...supabaseConfig, key: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleSaveSupabase} className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 gap-2">
                      <Settings className="w-4 h-4" /> Salvar Configuração
                    </Button>

                    <Button 
                      onClick={handleTestSupabase} 
                      variant="outline"
                      disabled={isTesting}
                      className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-10 gap-2"
                    >
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      Testar Conexão e Tabelas
                    </Button>

                    <Button 
                      onClick={handleSyncNow} 
                      variant="outline"
                      disabled={isSyncing || !supabaseConfig.enabled}
                      className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 h-10 gap-2"
                    >
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      Sincronizar Tudo Agora
                    </Button>
                  </div>

                  {Object.keys(testResults).length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        Resultado do Teste 
                        {isTesting && <span className="text-sm font-normal text-blue-600 animate-pulse">(Validando...)</span>}
                      </h4>
                      <ScrollArea className="h-48 pr-4">
                        <div className="space-y-2">
                          {DB_TABLES.map(table => (
                            <div key={table} className="flex items-center justify-between text-sm">
                              <span className="font-mono text-gray-500">{table}</span>
                              <div className="flex items-center gap-1.5">
                                {testResults[table] === 'success' && (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                )}
                                {testResults[table] === 'error' && (
                                  <span className="text-red-500 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Ausente
                                  </span>
                                )}
                                {testResults[table] === 'pending' && (
                                  <span className="text-blue-500 animate-pulse italic">Testando...</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {!isTesting && Object.values(testResults).some(r => r === 'error') && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700 leading-tight">
                          <strong>Atenção:</strong> Algumas tabelas não foram encontradas. Certifique-se de executar o script SQL no editor do seu banco de dados.
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Globe className="w-5 h-5" />
                      <h4 className="text-base font-bold">Acesso Global para Usuários</h4>
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      A configuração salva acima fica vinculada apenas ao seu navegador (LocalStorage). 
                      Para que <strong>todos os usuários</strong> acessem o mesmo banco de dados automaticamente,
                      você deve configurar as seguintes variáveis de ambiente no seu servidor (ou arquivo .env):
                    </p>
                    <div className="bg-blue-900 text-blue-50 p-2 rounded font-mono text-sm space-y-1">
                      <div>VITE_SUPABASE_URL=seu_url</div>
                      <div>VITE_SUPABASE_ANON_KEY=sua_chave</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                      <strong>Aviso:</strong> A ativação da sincronização requer que as tabelas correspondentes existam no seu projeto remoto. 
                      Use o script SQL exportado para criar a estrutura no seu banco de dados.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-blue-600 text-white">
                <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                       <FileCode className="w-5 h-5" />
                       <h4 className="font-bold">Script de Migração SQL</h4>
                    </div>
                    <p className="text-sm text-blue-100 italic">
                       Exporte os scripts de migração por módulo ou gere o script com todos os dados do sistema.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-blue-700 text-white hover:bg-blue-800 border-none font-bold">
                            Exportar Scripts Modulares
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Download Modular Supabase</DialogTitle>
                            <DialogDescription>
                              Scripts de cada um dos módulos separados (Sistema, Chat, Cotações, Sala Técnica, RH, Controlador, Compras).
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                            {Object.entries(getSupabaseMigrationParts()).map(([filename, part], i) => (
                              <div key={filename} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group">
                                <div className="flex items-center gap-3">
                                  <div className="bg-blue-50 p-2 rounded text-blue-600">
                                    <FileCode className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-base font-medium">{filename}</span>
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Atualizado: {part.lastModified}
                                    </span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    downloadSQL(part.content, filename);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <DialogFooter>
                            <Button onClick={handleDownloadSupabaseZip} variant="outline" className="w-full gap-2 border-blue-200 text-blue-700">
                              <Download className="w-4 h-4" /> Baixar Todos (ZIP)
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button onClick={handleExportData} className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none font-bold">
                         Exportar Dados
                      </Button>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-slate-900 text-white">
                <CardContent className="p-6 space-y-3">
                   <div className="flex items-center gap-2 text-blue-400">
                      <ShieldCheck className="w-5 h-5" />
                      <h4 className="font-bold text-white">Conselho de Segurança</h4>
                   </div>
                   <p className="text-sm text-slate-300 leading-relaxed">
                     Para evitar ataques e invasões, certifique-se de ativar o <strong>Row Level Security (RLS)</strong> no console do seu banco de dados remoto. 
                     Isso garante que cada empresa acesse apenas seus próprios dados. Além disso, as senhas agora são protegidas por criptografia SHA-256.
                   </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  Preços por Módulo
                </CardTitle>
                <CardDescription>Configure o valor unitário de cada módulo do sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(marketingConfig?.modulePrices || []).map((mp, idx) => (
                  <div key={mp.moduleId} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-base font-medium">{mp.label}</Label>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-400">R$</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={mp.price} 
                        onChange={e => {
                          const newPrices = [...marketingConfig.modulePrices];
                          newPrices[idx] = { ...mp, price: parseFloat(e.target.value) || 0 };
                          onUpdateMarketing({ ...marketingConfig, modulePrices: newPrices });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Planos do Sistema
                    </CardTitle>
                    <CardDescription>Defina pacotes prontos para aquisição.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                    const newPlan: SystemPlan = {
                      id: crypto.randomUUID(),
                      name: 'Novo Plano',
                      description: 'Descrição do plano',
                      price: 0,
                      features: ['Acesso total', 'Suporte 24h']
                    };
                    onUpdateMarketing({ ...marketingConfig, plans: [...marketingConfig.plans, newPlan] });
                  }}>
                    <Plus className="w-4 h-4" /> Adicionar Plano
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(marketingConfig?.plans || []).map((plan, planIdx) => (
                    <div key={plan.id} className="p-4 border rounded-xl space-y-3 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                        onClick={() => {
                          const newPlans = marketingConfig.plans.filter(p => p.id !== plan.id);
                          onUpdateMarketing({ ...marketingConfig, plans: newPlans });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm uppercase font-bold text-gray-400">Nome do Plano</Label>
                          <Input value={plan.name} onChange={e => {
                            const newPlans = [...marketingConfig.plans];
                            newPlans[planIdx] = { ...plan, name: e.target.value };
                            onUpdateMarketing({ ...marketingConfig, plans: newPlans });
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm uppercase font-bold text-gray-400">Mensalidade (R$)</Label>
                          <Input type="number" value={plan.price} onChange={e => {
                            const newPlans = [...marketingConfig.plans];
                            newPlans[planIdx] = { ...plan, price: parseFloat(e.target.value) || 0 };
                            onUpdateMarketing({ ...marketingConfig, plans: newPlans });
                          }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm uppercase font-bold text-gray-400">Resumo/Descrição</Label>
                        <Input value={plan.description} onChange={e => {
                          const newPlans = [...marketingConfig.plans];
                          newPlans[planIdx] = { ...plan, description: e.target.value };
                          onUpdateMarketing({ ...marketingConfig, plans: newPlans });
                        }} />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-sm uppercase font-bold text-gray-400">Módulos Inclusos</Label>
                         <div className="flex flex-wrap gap-2">
                           {ALL_MODULE_OPTIONS.map(mod => (
                             <Badge 
                               key={mod.id} 
                               variant={plan.modules?.includes(mod.id) ? "default" : "outline"}
                               className="cursor-pointer hover:bg-blue-50"
                               onClick={() => {
                                 const currentMods = plan.modules || [];
                                 const newMods = currentMods.includes(mod.id)
                                   ? currentMods.filter(m => m !== mod.id)
                                   : [...currentMods, mod.id];
                                 const newPlans = [...marketingConfig.plans];
                                 newPlans[planIdx] = { ...plan, modules: newMods };
                                 onUpdateMarketing({ ...marketingConfig, plans: newPlans });
                               }}
                             >
                               {mod.label}
                             </Badge>
                           ))}
                         </div>
                      </div>
                    </div>
                  ))}
                  {marketingConfig.plans.length === 0 && (
                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                      Nenhum plano configurado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-0 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <UserPlus className="w-6 h-6" />
                 </div>
                 <div>
                    <CardTitle>Aprovação de Novos Cadastros</CardTitle>
                    <CardDescription>Analise e libere o acesso dos usuários que se registraram no sistema.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Empresa Solicitada</TableHead>
                    <TableHead>Plano / Módulos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.isApproved === false && u.username !== 'vittor').map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{u.name}</span>
                          <span className="text-sm text-gray-500">@{u.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Building2 className="w-4 h-4 text-gray-400" />
                           <span className="text-base">{u.companyName}</span>
                           {u.hasCompany && <Badge variant="outline" className="text-xs uppercase">Nova Empresa</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                           <Badge className="w-fit bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-sm">
                              {u.desiredPlan || 'Plano Padrão'}
                           </Badge>
                           <div className="flex flex-wrap gap-1">
                              {u.desiredModules?.map(mod => (
                                 <span key={mod} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {ALL_MODULE_OPTIONS.find(m => m.id === mod)?.label}
                                 </span>
                              ))}
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja recusar e excluir este cadastro?')) {
                                onUpdateUsers(users.filter(item => item.id !== u.id));
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Recusar
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 text-sm bg-emerald-600 hover:bg-emerald-700"
                            onClick={async () => {
                              const approvedUser = { ...u, isApproved: true };
                              const updated = users.map(item => item.id === u.id ? approvedUser : item);
                              onUpdateUsers(updated);
                              
                              // Immediate sync
                              const config = getSupabaseConfig();
                              if (config.enabled) {
                                const supabase = createSupabaseClient(config.url, config.key);
                                if (supabase) {
                                  try {
                                    const mapToSnake = (obj: any) => {
                                      const newObj: any = {};
                                      for (const k in obj) {
                                        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                                        newObj[snakeKey] = obj[k];
                                      }
                                      return newObj;
                                    };
                                    await supabase.from('users').upsert(mapToSnake(approvedUser));
                                    await supabase.from('app_state').upsert({ id: 'sigo_users', content: updated });
                                    console.log('[Supabase] User approval persisted immediately');
                                  } catch (err) {
                                    console.warn('[Sync] User approval persistence failed', err);
                                  }
                                }
                              }
                              
                              alert(`Usuário ${u.name} aprovado com sucesso!`);
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar Acesso
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.filter(u => u.isApproved === false && u.username !== 'vittor').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-400">
                        Nenhuma solicitação de cadastro pendente no momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm border-red-100 mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <Trash2 className="w-6 h-6" />
                 </div>
                 <div>
                    <CardTitle>Solicitações de Exclusão</CardTitle>
                    <CardDescription>Medições que aguardam autorização administrativa para serem removidas permanentemente.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Contrato</TableHead>
                    <TableHead>Nº Medição</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.filter(m => m.status === 'pending_deletion').map(m => {
                    const contract = contracts.find(c => c.id === m.contractId);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{contract?.contractNumber || '---'}</span>
                            <span className="text-sm text-gray-500">{contract?.client || '---'}</span>
                          </div>
                        </TableCell>
                        <TableCell>#{m.number.toString().padStart(2, '0')}</TableCell>
                        <TableCell>{m.period}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-8 text-sm text-gray-600 font-medium"
                               onClick={() => onUpdateMeasurement({ ...m, status: 'open' })}
                             >
                               Recusar
                             </Button>
                             <Button 
                               size="sm" 
                               className="h-8 text-sm bg-red-600 hover:bg-red-700 font-bold"
                               onClick={() => onDeleteMeasurement(m.id, true)}
                             >
                               Excluir Permanentemente
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {measurements.filter(m => m.status === 'pending_deletion').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-400">
                        Nenhuma solicitação de exclusão pendente no momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function DBTableRow({ name, description, localCount, cloudCount }: { key?: string, name: string, description: string, localCount?: number, cloudCount?: number | 'error' | 'not_created' | null }) {
  const isCloudError = cloudCount === 'error';
  const isNotCreated = cloudCount === 'not_created';
  
  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="font-medium text-sm text-gray-800">{name}</div>
        <div className="text-sm text-gray-500 mt-1 max-w-[320px] leading-tight pr-4">{description}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-gray-500 bg-gray-50">{localCount !== undefined ? localCount : '-'}</Badge>
      </TableCell>
      <TableCell>
        {isCloudError ? (
          <Badge variant="destructive" className="font-mono bg-red-50 text-red-600 border-red-200 hover:bg-red-50">Erro</Badge>
        ) : isNotCreated ? (
          <Badge className="font-mono bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" variant="outline">Não Criada</Badge>
        ) : (cloudCount !== undefined && cloudCount !== null) ? (
          <Badge className="font-mono bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" variant="outline">{cloudCount}</Badge>
        ) : (
          <span className="text-gray-400 text-sm italic">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
