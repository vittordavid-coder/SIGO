import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isPast, format } from 'date-fns';
import { motion } from 'motion/react';
import { 
  User as UserIcon, Settings as SettingsIcon, Upload, Download, 
  Database, CheckCircle2, AlertCircle, Users, History, Plus, 
  Trash2, Eye, ShieldCheck, UserPlus, Search, ClipboardList, Edit, Save,
  Star, LayoutDashboard, FileSpreadsheet, Landmark, Key, XCircle, CheckCircle
} from 'lucide-react';
import { User, Resource, ServiceComposition, Quotation, Schedule, BDIConfig, ABCConfig, BudgetGroup, AuditLog, UserRole, Contract, Measurement, MeasurementTemplate, TemplateColumn, DashboardConfig, DashboardSection, DashboardItem, AppModule, PasswordResetRequest, EmailConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, hashPassword } from '../lib/utils';
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ALL_MODULE_OPTIONS: { id: AppModule, label: string }[] = [
  { id: 'quotations', label: 'Cotações' },
  { id: 'measurements', label: 'Sala Técnica' },
  { id: 'rh', label: 'RH' },
  { id: 'control', label: 'Controlador' },
  { id: 'purchases', label: 'Compras' },
  { id: 'project_admin', label: 'Administrador da Obra' },
  { id: 'settings', label: 'Administrador do Sistema' },
];

import { ManagePermissionsDialog } from './ManagePermissionsDialog';

interface SettingsViewProps {
  companyLogo: string;
  companyLogoRight: string;
  logoMode: 'left' | 'right' | 'both' | 'none';
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, position: 'left' | 'right') => void;
  onLogoClear: (position: 'left' | 'right') => void;
  onLogoModeChange: (val: 'left' | 'right' | 'both' | 'none') => void;
  currentUser: User;
  defaultOrg: string;
  onDefaultOrgChange: (val: string) => void;
  abcConfig: ABCConfig;
  onABCConfigChange: (config: ABCConfig) => void;
  resources: Resource[];
  services: ServiceComposition[];
  quotations: Quotation[];
  schedules: Schedule[];
  budgetItems: {serviceId: string, quantity: number}[];
  budgetGroups: BudgetGroup[];
  bdiConfig: BDIConfig;
  contracts: Contract[];
  onAddContract: (c: Omit<Contract, 'id'>) => void;
  onUpdateContract: (c: Contract) => void;
  onDeleteContract: (id: string) => void;
  measurements: Measurement[];
  onUpdateMeasurement: (m: Measurement) => void;
  templates: MeasurementTemplate[];
  onSaveTemplate: (t: MeasurementTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onImportAll: (data: any) => void;
  dashboardConfig: DashboardConfig;
  onDashboardConfigChange: (config: DashboardConfig) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  resetRequests: PasswordResetRequest[];
  onUpdateResetRequests: (requests: PasswordResetRequest[]) => void;
  emailConfig: EmailConfig;
  onEmailConfigChange: (config: EmailConfig) => void;
  onSyncAll?: () => Promise<void>;
  onSyncFromCloud?: () => Promise<void>;
}

export function SettingsView({ 
  companyLogo, companyLogoRight, logoMode, onLogoUpload, onLogoClear, onLogoModeChange,
  currentUser, defaultOrg, onDefaultOrgChange,
  abcConfig, onABCConfigChange,
  resources, services, quotations, schedules, budgetItems, budgetGroups, bdiConfig,
  contracts, onAddContract, onUpdateContract, onDeleteContract,
  measurements, onUpdateMeasurement, templates, onSaveTemplate, onDeleteTemplate,
  onImportAll, dashboardConfig, onDashboardConfigChange,
  users, onUpdateUsers,
  resetRequests, onUpdateResetRequests,
  emailConfig, onEmailConfigChange,
  onSyncAll, onSyncFromCloud
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTypes, setSelectedTypes] = useState({
    resources: true,
    services: true,
    budget: true,
    bdi: true,
    schedule: true,
    measurements: true,
    config: true
  });

  const [pendingImport, setPendingImport] = useState<{
    data: any;
    summaries: { label: string; count: string | number; icon: any }[];
  } | null>(null);

  const [adminMeasurementId, setAdminMeasurementId] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");

  const handleExport = () => {
    const exportData: any = {
      version: "1.1",
      exportDate: new Date().toISOString(),
      data: {}
    };

    const summaries: string[] = [];

    if (selectedTypes.resources) {
      exportData.data.resources = resources;
      summaries.push(`${resources.length} insumos`);
    }
    if (selectedTypes.services) {
      exportData.data.services = services;
      summaries.push(`${services.length} composições`);
    }
    if (selectedTypes.budget) {
      exportData.data.budgetItems = budgetItems;
      exportData.data.budgetGroups = budgetGroups;
      const budgetTotal = budgetItems.length + budgetGroups.reduce((acc, g) => acc + (g.services?.length || 0), 0);
      summaries.push(`${budgetTotal} itens da planilha`);
    }
    if (selectedTypes.bdi) {
      exportData.data.bdiConfig = bdiConfig;
      summaries.push(`Configurações de BDI`);
    }
    if (selectedTypes.schedule) {
      exportData.data.schedules = schedules;
      summaries.push(`${schedules.length} cronogramas`);
    }
    if (selectedTypes.measurements) {
      exportData.data.contracts = contracts;
      exportData.data.measurements = measurements;
      exportData.data.measurementTemplates = templates;
      summaries.push(`${contracts.length} contratos, ${measurements.length} medições e ${templates.length} templates`);
    }
    if (selectedTypes.config) {
      exportData.data.abcConfig = abcConfig;
      exportData.data.companyLogo = companyLogo;
      exportData.data.companyLogoRight = companyLogoRight;
      exportData.data.logoMode = logoMode;
      exportData.data.defaultOrganization = defaultOrg;
      exportData.data.emailConfig = emailConfig;
      summaries.push(`Configurações do sistema`);
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sigo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Sucesso! Foram exportados: ${summaries.join(', ')}.`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.data) {
            const dataToImport: any = {};
            const summaries: { label: string; count: string | number; icon: any }[] = [];
            
            if (selectedTypes.resources && json.data.resources) {
              dataToImport.resources = json.data.resources;
              summaries.push({ label: 'Insumos', count: json.data.resources.length, icon: UserIcon });
            }
            if (selectedTypes.services && json.data.services) {
              dataToImport.services = json.data.services;
              summaries.push({ label: 'Composições', count: json.data.services.length, icon: SettingsIcon });
            }
            if (selectedTypes.budget) {
              if (json.data.budgetItems) dataToImport.budgetItems = json.data.budgetItems;
              if (json.data.budgetGroups) dataToImport.budgetGroups = json.data.budgetGroups;
              const budgetItemsCount = json.data.budgetItems?.length || 0;
              const budgetGroupsCount = json.data.budgetGroups?.reduce((acc: number, g: any) => acc + (g.services?.length || 0), 0) || 0;
              summaries.push({ label: 'Itens da Planilha', count: budgetItemsCount + budgetGroupsCount, icon: Database });
            }
            if (selectedTypes.bdi && json.data.bdiConfig) {
              dataToImport.bdiConfig = json.data.bdiConfig;
              summaries.push({ label: 'Configurações de BDI', count: 'Sim', icon: SettingsIcon });
            }
            if (selectedTypes.schedule && json.data.schedules) {
              dataToImport.schedules = json.data.schedules;
              summaries.push({ label: 'Cronogramas', count: json.data.schedules.length, icon: Database });
            }
            if (selectedTypes.measurements) {
              if (json.data.contracts) dataToImport.contracts = json.data.contracts;
              if (json.data.measurements) dataToImport.measurements = json.data.measurements;
              if (json.data.measurementTemplates) dataToImport.measurementTemplates = json.data.measurementTemplates;
              summaries.push({ label: 'Contratos/Medições/Templates', count: (json.data.contracts?.length || 0) + (json.data.measurements?.length || 0) + (json.data.measurementTemplates?.length || 0), icon: ClipboardList });
            }
            if (selectedTypes.config) {
              if (json.data.abcConfig) dataToImport.abcConfig = json.data.abcConfig;
              if (json.data.companyLogo) dataToImport.companyLogo = json.data.companyLogo;
              if (json.data.defaultOrganization) dataToImport.defaultOrganization = json.data.defaultOrganization;
              summaries.push({ label: 'Configurações do Sistema', count: 'Sim', icon: SettingsIcon });
            }

            if (Object.keys(dataToImport).length === 0) {
              alert("Nenhum dado compatível encontrado no arquivo para os filtros selecionados.");
              return;
            }

            setPendingImport({ data: dataToImport, summaries });
          } else {
            alert("Formato de arquivo inválido.");
          }
        } catch (error) {
          alert("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const confirmImport = () => {
    if (pendingImport) {
      onImportAll(pendingImport.data);
      const summaryText = pendingImport.summaries.map(s => `${s.count} ${s.label}`).join(', ');
      alert(`Sucesso! Foram importados: ${summaryText}.`);
      setPendingImport(null);
    }
  };

  const toggleType = (key: keyof typeof selectedTypes) => {
    setSelectedTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Administrador do Sistema</h3>
          <p className="text-gray-500">Gerencie sua conta, dados e controle de acesso.</p>
        </div>
      </div>

      <Dialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              Confirmar Importação
            </DialogTitle>
            <DialogDescription className="text-base py-2">
              Os seguintes itens serão importados e irão substituir seus dados atuais:
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {pendingImport?.summaries.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <s.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-700">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">{s.count}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPendingImport(null)} className="h-11">
              Cancelar
            </Button>
            <Button onClick={confirmImport} className="bg-blue-600 hover:bg-blue-700 h-11 px-8">
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl mb-6 flex-wrap h-auto">
          <TabsTrigger value="company" className="gap-2 px-6">
            <SettingsIcon className="w-4 h-4" /> Empresa
          </TabsTrigger>
          {currentUser.role === 'admin' && (
            <TabsTrigger value="users" className="gap-2 px-6">
              <Users className="w-4 h-4" /> Minha Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="contracts" className="gap-2 px-6">
            <Landmark className="w-4 h-4" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 px-6">
            <Database className="w-4 h-4" /> Dados & Backup
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 px-6">
            <ClipboardList className="w-4 h-4" /> Templates de Medição
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 px-6">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          {(currentUser.role === 'admin' || currentUser.role === 'master') && (
            <TabsTrigger value="requests" className="gap-2 px-6 relative">
              <Key className="w-4 h-4" /> Solicitações
              {resetRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full">
                  {resetRequests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="admin" className="gap-2 px-6 text-amber-600 data-[state=active]:text-amber-700">
            <ShieldCheck className="w-4 h-4" /> Admin. Medição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Perfil do Usuário</CardTitle>
                <CardDescription>Suas informações de acesso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{currentUser.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      @{currentUser.username} • 
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 border-blue-200 bg-blue-50 text-blue-700">
                        {currentUser.role}
                      </Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Configuração Curva ABC</CardTitle>
                <CardDescription>Percentuais para as classes A e B.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="limit-a">Classe A (%)</Label>
                    <Input 
                      id="limit-a" 
                      type="number"
                      value={abcConfig.limitA} 
                      onChange={e => onABCConfigChange({ ...abcConfig, limitA: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit-b">Classe B (%)</Label>
                    <Input 
                      id="limit-b" 
                      type="number"
                      value={abcConfig.limitB} 
                      onChange={e => onABCConfigChange({ ...abcConfig, limitB: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Identificação da Empresa</CardTitle>
                <CardDescription>Nome exibido nos relatórios.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="default-org">Nome Principal</Label>
                  <Input 
                    id="default-org" 
                    value={defaultOrg} 
                    onChange={e => onDefaultOrgChange(e.target.value)} 
                    placeholder="Ex: SIGO Engenharia"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle>Identidade Visual & Branding</CardTitle>
                <CardDescription>Configure os logotipos que aparecerão nos cabeçalhos dos relatórios (PDF e Excel).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                  <Label htmlFor="logo-mode-select" className="text-sm font-bold leading-none cursor-pointer">
                    Configuração de Visualização de Logos
                  </Label>
                  <Select value={logoMode} onValueChange={(v: any) => onLogoModeChange(v)}>
                    <SelectTrigger id="logo-mode-select" className="bg-white border-blue-100">
                      <SelectValue placeholder="Selecione o modo de logo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Ambos (Esquerdo e Direito)</SelectItem>
                      <SelectItem value="left">Apenas Logo 01 (Lado Esquerdo)</SelectItem>
                      <SelectItem value="right">Apenas Logo 02 (Lado Direito)</SelectItem>
                      <SelectItem value="none">Nenhum Logo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-600 mt-1">
                    Esta configuração define como os logos serão exibidos em todos os relatórios do sistema.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Logo Esquerdo */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-gray-400">Logo 01 (Lado Esquerdo)</Label>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 h-48">
                      {companyLogo ? (
                        <div className="relative group w-full h-full flex items-center justify-center">
                          <img src={companyLogo} alt="Logo Left" className="max-h-32 object-contain rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg cursor-pointer" onClick={() => onLogoClear('left')}>
                             <Trash2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <Label htmlFor="logo-left-upload" className="cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                            Carregar Logo Principal
                            <input id="logo-left-upload" type="file" accept="image/*" className="hidden" onChange={(e) => onLogoUpload(e, 'left')} />
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Logo Direito */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-gray-400">Logo 02 (Lado Direito)</Label>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 h-48">
                      {companyLogoRight ? (
                        <div className="relative group w-full h-full flex items-center justify-center">
                          <img src={companyLogoRight} alt="Logo Right" className="max-h-32 object-contain rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg cursor-pointer" onClick={() => onLogoClear('right')}>
                             <Trash2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <Label htmlFor="logo-right-upload" className="cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                            Carregar Logo Secundário
                            <input id="logo-right-upload" type="file" accept="image/*" className="hidden" onChange={(e) => onLogoUpload(e, 'right')} />
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(currentUser.role === 'admin' || currentUser.role === 'master') && (
              <Card className="border-none shadow-sm md:col-span-2">
                <CardHeader className="bg-slate-800 text-white rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="w-6 h-6" />
                    <div>
                      <CardTitle className="text-white">Configurações Globais de E-mail</CardTitle>
                      <CardDescription className="text-slate-300">Configuração SMTP para envio de relatórios e documentos por toda a empresa.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="global-smtp-host">Servidor SMTP (Host)</Label>
                      <Input 
                        id="global-smtp-host" 
                        value={emailConfig?.smtpHost || ''} 
                        onChange={e => onEmailConfigChange({ ...emailConfig, smtpHost: e.target.value })} 
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="global-smtp-port">Porta</Label>
                      <Input 
                        id="global-smtp-port" 
                        value={emailConfig?.smtpPort || ''} 
                        onChange={e => onEmailConfigChange({ ...emailConfig, smtpPort: parseInt(e.target.value) || 587 })} 
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="global-smtp-user">Usuário / E-mail Autenticado</Label>
                    <div className="relative">
                      <Input 
                        id="global-smtp-user" 
                        value={emailConfig?.smtpUser || ''} 
                        onChange={e => onEmailConfigChange({ ...emailConfig, smtpUser: e.target.value })} 
                        placeholder="usuario@dominio.com.br"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="global-smtp-pass">Senha de Aplicativo / SMTP</Label>
                    <div className="relative">
                      <Input 
                        id="global-smtp-pass" 
                        type="password"
                        value={emailConfig?.smtpPass || ''} 
                        onChange={e => onEmailConfigChange({ ...emailConfig, smtpPass: e.target.value })} 
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Usar Conexão Segura (SSL/TLS)</Label>
                      <p className="text-[10px] text-gray-500">Recomendado para a maioria dos provedores modernos</p>
                    </div>
                    <Checkbox 
                      checked={emailConfig?.smtpSecure || false} 
                      onCheckedChange={(c) => onEmailConfigChange({ ...emailConfig, smtpSecure: !!c })} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-0">
          <AdminContractsTab 
            contracts={contracts}
            onAdd={onAddContract}
            onUpdate={onUpdateContract}
            onDelete={onDeleteContract}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <CompanyUsersTab 
            currentUser={currentUser}
            users={users}
            onUpdateUsers={onUpdateUsers}
            quotations={quotations}
            contracts={contracts}
          />
        </TabsContent>

        <TabsContent value="backup" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Gerenciamento de Dados
                  </CardTitle>
                  <CardDescription>Exporte seus dados para backup ou importe de outros arquivos.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={!Object.values(selectedTypes).some(Boolean)}>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                  <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Importar
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { id: 'resources', label: 'Insumos', icon: UserIcon },
                  { id: 'services', label: 'Composições', icon: SettingsIcon },
                  { id: 'budget', label: 'Planilha', icon: Database },
                  { id: 'bdi', label: 'BDI', icon: SettingsIcon },
                  { id: 'schedule', label: 'Cronograma', icon: Database },
                  { id: 'measurements', label: 'Medições', icon: ClipboardList },
                  { id: 'config', label: 'Configurações', icon: SettingsIcon },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleType(item.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                      selectedTypes[item.id as keyof typeof selectedTypes]
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-100 bg-white text-gray-400 grayscale"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <MeasurementTemplatesTab 
            templates={templates}
            onSave={onSaveTemplate}
            onDelete={onDeleteTemplate}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardSettings 
            config={dashboardConfig} 
            onChange={onDashboardConfigChange}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="admin" className="mt-0">
          <Card className="border-amber-200 shadow-sm bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Administração de Medições
              </CardTitle>
              <CardDescription>Gerencie medições bloqueadas ou encerradas (Requer permissões administrativas).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="bg-white p-4 border border-amber-100 rounded-xl shadow-sm">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Reabrir Medição Encerrada</h4>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    As opções abaixo permitem reabrir uma medição previamente encerrada. Suas modificações ficarão ativas novamente para edição.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <Label>Selecione a medição</Label>
                      <Select value={adminMeasurementId} onValueChange={setAdminMeasurementId}>
                        <SelectTrigger className="bg-gray-50">
                          <SelectValue placeholder="Nenhuma selecionada..." />
                        </SelectTrigger>
                        <SelectContent>
                          {measurements.filter(m => m.status === 'closed').map(m => {
                            const c = contracts.find(x => x.id === m.contractId);
                            return (
                              <SelectItem key={m.id} value={m.id}>
                                {c?.contractNumber || '---'} | Medição Nº {m.number.toString().padStart(2, '0')} - {m.period}
                              </SelectItem>
                            );
                          })}
                          {measurements.filter(m => m.status === 'closed').length === 0 && (
                            <SelectItem value="-1" disabled>Nenhuma medição encerrada no momento.</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <Label>Senha Administrativa</Label>
                       <Input 
                         type="password" 
                         value={adminPassword} 
                         onChange={e => setAdminPassword(e.target.value)} 
                         placeholder="Insira a senha do sistema" 
                         className="bg-gray-50" 
                       />
                    </div>
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto mt-2"
                      onClick={() => {
                        if (!adminMeasurementId || adminMeasurementId === '-1') {
                          alert('Selecione uma medição.');
                          return;
                        }
                        if (adminPassword === 'admin123') {
                          const m = measurements.find(x => x.id === adminMeasurementId);
                          if (m) {
                            onUpdateMeasurement({ ...m, status: 'open' });
                            alert('Medição reaberta com sucesso e retornada para a situação Aberta.');
                            setAdminMeasurementId('');
                            setAdminPassword('');
                          }
                        } else {
                          alert('Senha incorreta.');
                        }
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" /> Autorizar e Reabrir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Key className="w-6 h-6" />
                 </div>
                 <div>
                    <CardTitle>Recuperação de Senha</CardTitle>
                    <CardDescription>Aprove solicitações de nova senha. Ao aprovar, uma senha temporária será gerada.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resetRequests.filter(r => r.status === 'pending').map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{r.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{new Date(r.timestamp).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs text-red-600 border-red-100"
                            onClick={() => {
                              const updated = resetRequests.map(item => item.id === r.id ? { ...item, status: 'rejected' as const } : item);
                              onUpdateResetRequests(updated);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Recusar
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={async () => {
                              const tempPass = Math.random().toString(36).slice(-8); 
                              const hashedTempPass = await hashPassword(tempPass);
                              const updatedRequests = resetRequests.map(item => 
                                item.id === r.id ? { ...item, status: 'approved' as const, tempPassword: tempPass, approvedBy: currentUser.id, approvedAt: new Date().toISOString() } : item
                              );
                              
                              const userToUpdate = users.find(u => u.id === r.userId);
                              if (userToUpdate) {
                                const updatedUsers = users.map(u => u.id === r.userId ? { ...u, password: hashedTempPass, mustChangePassword: true } : u);
                                onUpdateUsers(updatedUsers);
                              }
                              
                              onUpdateResetRequests(updatedRequests);
                              alert(`Solicitação aprovada! Senha temporária gerada: ${tempPass}\n\nInforme esta senha ao usuário.`);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Aprovar & Gerar Senha
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {resetRequests.filter(r => r.status === 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-400">
                        Nenhuma solicitação de recuperação de senha pendente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {resetRequests.filter(r => r.status !== 'pending').length > 0 && (
            <Card className="border-none shadow-sm opacity-60">
              <CardHeader>
                <CardTitle className="text-sm">Histórico de Solicitações</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                   <TableBody>
                     {resetRequests.filter(r => r.status !== 'pending').sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5).map(r => (
                       <TableRow key={r.id}>
                         <TableCell className="text-xs">
                           <span className="font-bold">{r.username}</span> ({r.email})
                         </TableCell>
                         <TableCell className="text-xs text-gray-500 text-right">
                           {r.status === 'approved' ? 'Aprovado' : 'Recusado'} em {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : '---'}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function AdminContractsTab({ contracts, onAdd, onUpdate, onDelete }: { contracts: Contract[], onAdd: any, onUpdate: any, onDelete: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<Contract> | null>(null);

  const handleSave = () => {
    if (!editingContract?.contractNumber) {
      alert("Nº do Contrato é obrigatório.");
      return;
    }

    if (editingContract.id) {
      onUpdate(editingContract as Contract);
    } else {
      onAdd(editingContract as Omit<Contract, 'id'>);
    }
    
    setIsModalOpen(false);
    setEditingContract(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Gestão de Contratos
            </CardTitle>
            <CardDescription>Crie e gerencie contratos para todos os setores.</CardDescription>
          </div>
          <Button onClick={() => { setEditingContract({}); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold">Nº Contrato / Obra</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold text-right">Valor Total</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(contract => (
                  <TableRow key={contract.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{contract.contractNumber}</span>
                        {contract.workName && <span className="text-xs text-blue-600 font-bold uppercase">{contract.workName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">{contract.client}</TableCell>
                    <TableCell className="text-right font-black text-emerald-700">
                      {contract.totalValue ? formatCurrency(contract.totalValue) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingContract(contract); setIsModalOpen(true); }} className="h-8 w-8 text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(contract.id); }} className="h-8 w-8 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                      Nenhum contrato cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingContract?.id ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
            <DialogDescription>Preencha as informações básicas do contrato.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nº do Contrato</Label>
              <Input 
                value={editingContract?.contractNumber || ''} 
                onChange={e => setEditingContract({...editingContract, contractNumber: e.target.value})} 
                placeholder="Ex: 001/2024"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-600 font-bold">Identificação da Obra (OBRA)</Label>
              <Input 
                value={editingContract?.workName || ''} 
                onChange={e => setEditingContract({...editingContract, workName: e.target.value})} 
                placeholder="Ex: Pavimentação Rodovia BR-101"
                className="border-blue-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente / Órgão</Label>
              <Input 
                value={editingContract?.client || ''} 
                onChange={e => setEditingContract({...editingContract, client: e.target.value})} 
                placeholder="Ex: DNIT"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total do Contrato</Label>
              <Input 
                type="number"
                value={editingContract?.totalValue || ''} 
                onChange={e => setEditingContract({...editingContract, totalValue: parseFloat(e.target.value) || 0})} 
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Objeto / Descrição</Label>
              <Input 
                value={editingContract?.object || ''} 
                onChange={e => setEditingContract({...editingContract, object: e.target.value})} 
                placeholder="Ex: Serviços de manutenção..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Salvar Contrato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSettings({ config, onChange, currentUser }: { config: DashboardConfig, onChange: (c: DashboardConfig) => void, currentUser: User }) {
  if (!config || !config.sections) {
    const fallbackConfig: DashboardConfig = {
      sections: [
        { moduleId: 'quotations', label: 'Cotações', visible: true, items: [ { id: 'total_resources', label: 'Insumos', visible: true }, { id: 'total_services', label: 'Serviços', visible: true }, { id: 'total_quotations', label: 'Cotações', visible: true } ] },
        { moduleId: 'measurements', label: 'Sala Técnica', visible: true, items: [ { id: 'open_measurements', label: 'Medição', visible: true }, { id: 'total_reports', label: 'Diário de Obra', visible: true } ] },
        { moduleId: 'rh', label: 'RH', visible: true, items: [ { id: 'total_employees', label: 'Funcionários', visible: true }, { id: 'total_records', label: 'Ponto', visible: true } ] },
        { moduleId: 'control', label: 'Controlador', visible: true, items: [ { id: 'team_summary', label: 'Equipes', visible: true }, { id: 'equipment_costs', label: 'Equipamentos', visible: true }, { id: 'manpower_costs', label: 'Mão de Obra', visible: true } ] }
      ]
    };

    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-4">
        <p>Configurações do dashboard não formatadas corretamente.</p>
        <Button onClick={() => onChange(fallbackConfig)} variant="outline">Restaurar Padrões</Button>
      </div>
    );
  }

  const toggleSection = (moduleId: string) => {
    const newSections = config.sections.map(s => 
      s.moduleId === moduleId ? { ...s, visible: !s.visible } : s
    );
    onChange({ ...config, sections: newSections });
  };

  const toggleItem = (moduleId: string, itemId: string) => {
    const newSections = config.sections.map(s => 
      s.moduleId === moduleId ? { 
        ...s, 
        items: s.items.map(i => i.id === itemId ? { ...i, visible: !i.visible } : i)
      } : s
    );
    onChange({ ...config, sections: newSections });
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            Configuração do Dashboard Inicial
          </CardTitle>
          <CardDescription>Defina quais setores e itens de resumo serão exibidos na sua tela de início.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.sections.map(section => {
              const hasAccess = currentUser.role === 'master' || currentUser.allowedModules?.includes(section.moduleId as any);
              if (!hasAccess) return null;

              return (
                <div key={section.moduleId} className={cn(
                  "p-5 rounded-2xl border transition-all space-y-4",
                  section.visible ? "bg-blue-50/50 border-blue-100" : "bg-gray-50 border-gray-100 grayscale opacity-60"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        section.visible ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"
                      )}>
                        {section.moduleId === 'quotations' && <FileSpreadsheet className="w-4 h-4" />}
                        {section.moduleId === 'measurements' && <ClipboardList className="w-4 h-4" />}
                        {section.moduleId === 'rh' && <Users className="w-4 h-4" />}
                        {section.moduleId === 'control' && <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{section.label}</h4>
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Setor</p>
                      </div>
                    </div>
                    <Checkbox 
                      checked={!!section.visible} 
                      onCheckedChange={() => toggleSection(section.moduleId)}
                    />
                  </div>

                  <div className="space-y-2">
                    {section.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-sm font-medium text-gray-600">{item.label}</span>
                        <Checkbox 
                          checked={!!item.visible} 
                          disabled={!section.visible}
                          onCheckedChange={() => toggleItem(section.moduleId, item.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MeasurementTemplatesTab({ templates, onSave, onDelete }: { templates: MeasurementTemplate[], onSave: any, onDelete: any }) {
  const [editingTemplate, setEditingTemplate] = useState<MeasurementTemplate | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const defaultColumns = [
    { id: uuidv4(), label: 'Inicial', type: 'number' as const },
    { id: uuidv4(), label: 'Frac. I', type: 'number' as const },
    { id: uuidv4(), label: 'Final', type: 'number' as const },
    { id: uuidv4(), label: 'Frac. F', type: 'number' as const },
    { id: uuidv4(), label: 'Lado', type: 'text' as const },
    { id: uuidv4(), label: 'Medição', type: 'calculated' as const, formula: '' },
    { id: uuidv4(), label: 'Observação', type: 'text' as const },
  ];

  const handleCreateNew = () => {
    setEditingTemplate({
      id: uuidv4(),
      name: 'Novo Template',
      unit: '',
      columns: defaultColumns.map(c => ({ ...c, id: uuidv4() }))
    });
  };

  const handleEdit = (t: MeasurementTemplate) => {
    // Criar uma cópia profunda das colunas para evitar referências compartilhadas
    // Se o template não tiver colunas (legado), usamos as colunas padrão com IDs novos
    const cols = (t.columns && t.columns.length > 0)
      ? t.columns.map(c => ({ ...c })) 
      : defaultColumns.map(c => ({ ...c, id: uuidv4() }));

    setEditingTemplate({
      ...t,
      columns: cols
    });
  };

  const addColumn = () => {
    if (!editingTemplate) return;
    const newCols = [...(editingTemplate.columns || [])];
    
    // Encontrar o índice da coluna "Lado" (case insensitive)
    const ladoIdx = newCols.findIndex(c => c.label.toLowerCase() === 'lado');
    
    // Encontrar colunas de fechamento (Medição/Observação) para garantir que fiquem no final
    const medIdx = newCols.findIndex(c => c.label.toLowerCase() === 'medição');
    const obsIdx = newCols.findIndex(c => c.label.toLowerCase() === 'observação');
    
    let insertIdx;
    if (ladoIdx !== -1) {
      // Se encontrar "Lado", adiciona depois dele
      insertIdx = ladoIdx + 1;
    } else if (medIdx !== -1) {
      // Caso não tenha Lado mas tenha Medição, adiciona antes da Medição
      insertIdx = medIdx;
    } else if (obsIdx !== -1) {
      // Caso não tenha Medição mas tenha Observação, adiciona antes da Observação
      insertIdx = obsIdx;
    } else {
      // Caso padrão: ao final
      insertIdx = newCols.length;
    }

    newCols.splice(insertIdx, 0, { id: uuidv4(), label: 'Nova Coluna', type: 'number' as const });
    setEditingTemplate({ ...editingTemplate, columns: newCols });
  };

  const removeColumn = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      columns: editingTemplate.columns.filter(c => c.id !== id)
    });
  };

  const updateColumn = (id: string, updates: Partial<TemplateColumn>) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      columns: editingTemplate.columns.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const setAsResultColumn = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      columns: editingTemplate.columns.map(c => ({
        ...c,
        isResult: c.id === id
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h4 className="text-xl font-bold text-gray-900">Templates de Memória de Cálculo</h4>
          <p className="text-sm text-gray-500">Personalize tabelas e fórmulas para serviços por Unidade de Medida.</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <Card key={t.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-blue-600 font-black">{t.unit}</CardTitle>
                <CardDescription className="font-semibold text-gray-900">{t.name}</CardDescription>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 bg-blue-50" onClick={() => handleEdit(t)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-600 bg-red-50" onClick={() => onDelete(t.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-wrap gap-1.5">
                {(t.columns || []).slice(0, 5).map(c => (
                  <Badge key={c.id} variant="secondary" className="text-[9px] font-bold py-0 h-5 bg-gray-50 text-gray-500">
                    {c.label}
                  </Badge>
                ))}
                {(t.columns || []).length > 5 && (
                  <Badge variant="secondary" className="text-[9px] font-bold py-0 h-5">
                    +{(t.columns || []).length - 5}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-gray-100 rounded-2xl py-24 flex flex-col items-center justify-center bg-white/50">
             <ClipboardList className="w-12 h-12 text-gray-200 mb-4" />
             <p className="text-gray-400 font-medium">Nenhum template configurado ainda.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingTemplate} onOpenChange={open => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 border border-border shadow-2xl">
          <DialogHeader className="p-8 pb-4 shrink-0 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <SettingsIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Configurar Template de Medição</DialogTitle>
                  <DialogDescription className="font-medium">Defina as colunas e fórmulas para a memória de cálculo.</DialogDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                   variant="ghost" 
                   onClick={() => setEditingTemplate(null)}
                   className="h-9 px-4 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </Button>
                <Button 
                   onClick={() => { 
                     if (!editingTemplate.name || !editingTemplate.unit) {
                       alert("Por favor, preencha o nome e a unidade do template.");
                       return;
                     }
                     onSave(editingTemplate); 
                     setStatusMessage("Template salvo com sucesso!");
                     setTimeout(() => {
                       setStatusMessage(null);
                       setEditingTemplate(null); 
                     }, 1500);
                   }} 
                   className="h-9 bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-lg shadow-blue-200"
                >
                  <Save className="w-3.5 h-3.5 mr-2" /> Salvar
                </Button>
              </div>
            </div>
          </DialogHeader>

          {editingTemplate && (
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50">
                <div className="px-8 py-6 space-y-8">
                  <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Nome do Template</Label>
                      <Input value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} placeholder="Ex: Medição por Volume" className="bg-gray-50/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Unidade de Medida</Label>
                      <Input value={editingTemplate.unit} onChange={e => setEditingTemplate({...editingTemplate, unit: e.target.value})} placeholder="Ex: m³" className="bg-gray-50/50 font-bold text-blue-600" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Colunas da Memória</Label>
                      <Button variant="outline" size="sm" onClick={addColumn} className="h-8 text-[11px] font-bold bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Coluna
                      </Button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                      <div className="grid grid-cols-[1fr_80px_200px_40px] gap-4 p-4 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <div>Rótulo / Nome da Coluna</div>
                         <div>Tipo de Dado</div>
                         <div className="text-center">Fórmula Matemática / Medição</div>
                         <div></div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {(editingTemplate.columns || []).map((col) => (
                          <div key={col.id} className="grid grid-cols-[1fr_80px_200px_40px] gap-4 p-4 items-center group/col hover:bg-gray-50/50 transition-colors">
                            <div>
                              <Input className="h-9 text-xs font-bold" value={col.label} onChange={e => updateColumn(col.id, { label: e.target.value })} />
                            </div>
                            <div>
                              <Select value={col.type} onValueChange={v => updateColumn(col.id, { type: v as any })}>
                                <SelectTrigger className="h-9 text-xs border-0 bg-transparent px-1 min-w-0" hideArrow>
                                  <SelectValue>
                                    {col.type === 'number' ? 'Num' : col.type === 'text' ? 'Txt' : 'Fórm'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="number">Numérico</SelectItem>
                                  <SelectItem value="text">Texto / Obs</SelectItem>
                                  <SelectItem value="calculated">Fórmula</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              {col.type === 'calculated' ? (
                                <Input className="h-9 text-xs font-mono font-bold text-blue-600 bg-blue-50/30 border-blue-100 flex-1" placeholder="Ex: Larg * Alt" value={col.formula || ''} onChange={e => updateColumn(col.id, { formula: e.target.value })} />
                              ) : (
                                <div className="h-9 flex-1 flex items-center justify-center bg-gray-50/50 rounded-md border border-dashed border-gray-200">
                                  <span className="text-[10px] font-bold text-gray-400 italic px-2">Entrada manual</span>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setAsResultColumn(col.id)}
                                title="Marcar como coluna de Medição"
                                className={col.isResult ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-gray-300 hover:text-amber-400"}
                              >
                                <Star className={col.isResult ? "fill-amber-500 w-5 h-5" : "w-5 h-5"} />
                              </Button>
                            </div>
                            <div className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-500 transition-colors hover:bg-red-50" onClick={() => removeColumn(col.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                      <AlertCircle className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
                      <div className="text-[11px] text-amber-800 leading-relaxed">
                        <p className="font-black mb-1 flex items-center gap-1 uppercase tracking-wider">Como funcionam as fórmulas:</p>
                        Para a coluna <b>Calculada</b>, use o nome exato dos rótulos acima (inclusive pontos e espaços). <br />
                        Exemplo: <code>((Final-Inicial)*20)+(frac.f-frac.i)</code> <br />
                        Clique na <Star className="w-3 h-3 inline-block" /> estrela para marcar qual será a coluna referente ao valor medido enviado para o orçamento.
                      </div>
                    </div>
                  </div>
                </div>
              
              <div className="p-8 bg-white border-t flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                   <Button variant="ghost" onClick={() => setEditingTemplate(null)} className="font-bold text-gray-500 hover:bg-gray-50">Descartar</Button>
                   {statusMessage && (
                     <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0 }} 
                        className="text-green-600 font-bold text-sm flex items-center gap-2"
                     >
                       <CheckCircle2 className="w-4 h-4" /> {statusMessage}
                     </motion.div>
                   )}
                 </div>
                 <Button 
                    onClick={() => { 
                      if (!editingTemplate.name || !editingTemplate.unit) {
                        alert("Por favor, preencha o nome e a unidade do template.");
                        return;
                      }
                      onSave(editingTemplate); 
                      setStatusMessage("Template salvo com sucesso!");
                      setTimeout(() => {
                        setStatusMessage(null);
                        setEditingTemplate(null); 
                      }, 1500);
                    }} 
                    className="bg-blue-600 hover:bg-blue-700 px-10 h-11 text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar Template
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyUsersTab({ currentUser, users, onUpdateUsers, quotations, contracts }: { currentUser: User, users: User[], onUpdateUsers: (u: User[]) => void, quotations: Quotation[], contracts: Contract[] }) {
  const companyUsers = users.filter(u => u.companyId === currentUser.companyId);
  // Separate contributors for display
  const contributors = companyUsers.filter(u => u.role === 'editor' || u.role === 'reader');
  
  const [newUser, setNewUser] = useState({ 
    name: '', 
    username: '', 
    pass: '', 
    jobFunction: '',
    role: 'editor' as UserRole,
    allowedModules: [] as AppModule[],
    allowedContractIds: [] as string[]
  });

  const availableModules = ALL_MODULE_OPTIONS.filter(opt => 
    currentUser.role === 'master' || currentUser.role === 'admin' || currentUser.allowedModules?.includes(opt.id) || !currentUser.allowedModules
  );

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.pass) {
      alert('Preencha todos os campos do novo usuário');
      return;
    }

    const currentKeyCount = companyUsers.length;
    const maxKeys = currentUser.keys || 0;

    if (currentKeyCount >= maxKeys && currentUser.role !== 'master') {
      alert(`Você atingiu o limite de usuários (${maxKeys} chaves). Entre em contato com o Administrador Master para aumentar seu limite.`);
      return;
    }

    if (users.some(u => u.username === newUser.username)) {
      alert('Este nome de usuário já está em uso');
      return;
    }

    const hashedPassword = await hashPassword(newUser.pass);

    const created: User = {
      id: uuidv4(),
      role: newUser.role,
      name: newUser.name,
      username: newUser.username,
      password: hashedPassword,
      jobFunction: newUser.jobFunction,
      companyId: currentUser.companyId,
      companyName: currentUser.companyName,
      allowedQuotationIds: [],
      allowedContractIds: newUser.allowedContractIds,
      allowedModules: newUser.allowedModules,
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

    setNewUser({ name: '', username: '', pass: '', jobFunction: '', role: 'editor', allowedModules: [], allowedContractIds: [] });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-none shadow-sm lg:col-span-1 h-fit">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Novo Colaborador
              </CardTitle>
              <CardDescription>Cadastre editores e leitores.</CardDescription>
            </div>
            {currentUser.role === 'admin' && currentUser.keys !== undefined && (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                  {companyUsers.length}/{currentUser.keys} Chaves
                </Badge>
                {currentUser.keysExpiresAt && (
                   <span className={cn(
                     "text-[10px] font-bold uppercase tracking-wider",
                     isPast(new Date(currentUser.keysExpiresAt)) ? "text-red-500" : "text-amber-500"
                   )}>
                     Vencimento: {format(new Date(currentUser.keysExpiresAt), 'dd/MM/yyyy')}
                     {isPast(new Date(currentUser.keysExpiresAt)) && " (EXPIRADO)"}
                   </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="João Silva" />
          </div>
          <div className="space-y-2">
            <Label>Função / Cargo</Label>
            <Input value={newUser.jobFunction} onChange={e => setNewUser({...newUser, jobFunction: e.target.value})} placeholder="Ex: Engenheiro" />
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
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="reader">Leitor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Módulos que pode acessar</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="grid grid-cols-1 gap-2">
                {availableModules.map(m => (
                  <div key={m.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
                    <Checkbox 
                      id={`local-mod-${m.id}`}
                      checked={!!newUser.allowedModules?.includes(m.id)}
                      onCheckedChange={(checked) => {
                        const modules = checked 
                          ? [...(newUser.allowedModules || []), m.id]
                          : (newUser.allowedModules || []).filter(id => id !== m.id);
                        setNewUser({ ...newUser, allowedModules: modules as AppModule[] });
                      }}
                    />
                    <Label htmlFor={`local-mod-${m.id}`} className="text-xs cursor-pointer">{m.label}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Contratos que pode acessar</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="grid grid-cols-1 gap-2">
                {contracts.map(c => (
                  <div key={c.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
                    <Checkbox 
                      id={`local-contract-${c.id}`}
                      checked={!!newUser.allowedContractIds?.includes(c.id)}
                      onCheckedChange={(checked) => {
                        const next = checked 
                          ? [...(newUser.allowedContractIds || []), c.id]
                          : (newUser.allowedContractIds || []).filter(id => id !== c.id);
                        setNewUser({ ...newUser, allowedContractIds: next });
                      }}
                    />
                    <div className="flex flex-col">
                      <Label htmlFor={`local-contract-${c.id}`} className="text-xs cursor-pointer font-bold">{c.contractNumber}</Label>
                      <span className="text-[10px] text-gray-500">{c.client}</span>
                    </div>
                  </div>
                ))}
                {contracts.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">Nenhum contrato cadastrado.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
            Criar Usuário
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Colaboradores da Empresa</CardTitle>
          <CardDescription>Gerencie as permissões da sua equipe local.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold">Usuário</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-center">Nível</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-center">Permissão: Contratos</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-center">Permissão: Módulos</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributors.map(u => (
                <TableRow key={u.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-gray-900">{u.name}</span>
                        {u.jobFunction && <span className="text-[10px] text-blue-600">({u.jobFunction})</span>}
                      </div>
                      <span className="text-[10px] text-gray-500">@{u.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Select value={u.role} onValueChange={(role: UserRole) => {
                      onUpdateUsers(users.map(user => user.id === u.id ? { ...user, role } : user));
                    }}>
                      <SelectTrigger className="h-7 w-24 text-[10px] mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="reader">Leitor</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <ManagePermissionsDialog
                      title={`Acesso a Contratos: ${u.name}`}
                      description="Selecione quais contratos este colaborador pode visualizar."
                      items={contracts.map(c => ({
                        id: c.id,
                        title: c.contractNumber,
                        subtitle: c.client
                      }))}
                      selectedIds={u.allowedContractIds || []}
                      onSave={(newIds) => {
                        onUpdateUsers(users.map(user => user.id === u.id ? { ...user, allowedContractIds: newIds } : user));
                      }}
                      triggerButton={
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
                          <Landmark className="w-3 h-3" /> Gerenciar Acessos ({u.allowedContractIds?.length || 0})
                        </Button>
                      }
                      emptyMessage="Nenhum contrato disponível."
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ManagePermissionsDialog
                      title={`Permissões de Módulos: ${u.name}`}
                      description="Selecione quais funcionalidades este colaborador pode acessar."
                      items={availableModules.map(m => ({
                        id: m.id,
                        title: m.label
                      }))}
                      selectedIds={u.allowedModules || []}
                      onSave={(newIds) => {
                        onUpdateUsers(users.map(user => user.id === u.id ? { ...user, allowedModules: newIds as AppModule[] } : user));
                      }}
                      triggerButton={
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                          <SettingsIcon className="w-3 h-3" /> Gerenciar Módulos ({u.allowedModules?.length || 0})
                        </Button>
                      }
                      emptyMessage="Nenhum módulo disponível."
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm(`Excluir o usuário ${u.name}?`)) {
                            onUpdateUsers(users.filter(user => user.id !== u.id));
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {companyUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                    Sua equipe ainda não possui colaboradores cadastrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
