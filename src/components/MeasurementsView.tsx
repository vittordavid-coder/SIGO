import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  FileText, Plus, Edit, Trash2, ChevronRight, 
  Search, Download, FileSpreadsheet, Calculator,
  ClipboardList, Landmark, AlertCircle, Truck, Layers,
  Lock, Unlock, Save, Ruler, BarChart3, Settings2,
  CloudRain, Calendar, BookOpen, UserCheck, HardHat,
  Construction, Map, Clock, ArrowRightLeft, Briefcase,
  Users2, ChevronDown, ChevronUp, FileDown, RefreshCw,
  Activity
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Contract, Measurement, MeasurementItem, 
  Quotation, ServiceComposition, Resource, 
  MeasurementTemplate, CalculationMemory, MemoryRow,
  HighwayLocation, StationGroup, CubationData, CubationRow, TransportData, TransportRow,
  WorksheetType, ServiceProduction, ProductionDaily,
  DailyReport, DailyReportActivity, PluviometryRecord, TechnicalSchedule,
  BudgetGroup,
  ControllerTeam, ControllerEquipment, ControllerManpower, TeamAssignment, User,
  EquipmentMonthlyData, ManpowerMonthlyData
} from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { exportContractSpreadsheetToExcel } from '../lib/exportUtils';
import { exportMonthlyControlReportPDF } from '../lib/exportTechnicalUtils';
import { 
  DailyReportView, 
  PluviometryView, 
  TechnicalScheduleView 
} from './TechnicalRoomExtensions';
import { TechnicalReportsView } from './TechnicalReportsView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumericInput } from '@/components/ui/numeric-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  LabelList,
  ReferenceLine,
  Label as RechartsLabel
} from 'recharts';

interface MeasurementsViewProps {
  contracts: Contract[];
  onAddContract: (c: Omit<Contract, 'id'>) => void;
  onUpdateContract: (c: Contract) => void;
  onDeleteContract: (id: string) => void;
  onAddServices: (s: Omit<ServiceComposition, 'id'>[]) => Promise<ServiceComposition[]> | ServiceComposition[];
  measurements: Measurement[];
  onAddMeasurement: (m: Omit<Measurement, 'id'>) => void;
  onUpdateMeasurement: (m: Measurement) => void;
  onDeleteMeasurement: (id: string) => void;
  quotations: Quotation[];
  services: ServiceComposition[];
  resources: Resource[];
  bdi: number;
  readonly?: boolean;
  templates: MeasurementTemplate[];
  memories: CalculationMemory[];
  onUpdateMemory: (m: CalculationMemory) => void;
  highwayLocations: HighwayLocation[];
  onUpdateHighwayLocation: (l: HighwayLocation) => void;
  onDeleteHighwayLocation: (id: string) => void;
  stationGroups: StationGroup[];
  onUpdateStationGroup: (g: StationGroup) => void;
  onDeleteStationGroup: (id: string) => void;
  cubationData: CubationData[];
  onUpdateCubationData: (d: CubationData) => void;
  transportData: TransportData[];
  onUpdateTransportData: (d: TransportData) => void;
  serviceProductions: ServiceProduction[];
  onUpdateServiceProduction: (p: ServiceProduction) => void;
  onDeleteServiceProduction: (id: string) => void;
  dailyReports: DailyReport[];
  onAddDailyReport: (r: Omit<DailyReport, 'id'>) => void;
  onUpdateDailyReport: (r: DailyReport) => void;
  onDeleteDailyReport: (id: string) => void;
  onMoveDailyReportActivity: (activityId: string, fromId: string, toDate: string, contractId: string) => void;
  pluviometryRecords: PluviometryRecord[];
  onAddPluviometryRecord: (r: Omit<PluviometryRecord, 'id'>) => void;
  onUpdatePluviometryRecord: (r: PluviometryRecord) => void;
  technicalSchedules: TechnicalSchedule[];
  onUpdateTechnicalSchedule: (s: TechnicalSchedule) => void;
  onSyncAll?: () => Promise<void>;
  schedules: any[];
  activeSubTab: 'contracts' | 'measurements' | 'measure' | 'controls' | 'rdo' | 'pluviometria' | 'schedule' | 'teams' | 'reports' | 'summary';
  onSetActiveSubTab: (tab: 'contracts' | 'measurements' | 'measure' | 'controls' | 'rdo' | 'pluviometria' | 'schedule' | 'teams' | 'reports' | 'summary') => void;
  selectedContractId: string | null;
  onSetSelectedContractId: (id: string | null) => void;
  selectedMeasurementId: string | null;
  onSetSelectedMeasurementId: (id: string | null) => void;
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode: 'left' | 'right' | 'both' | 'none';
  controllerTeams: ControllerTeam[];
  onUpdateTeams: (teams: ControllerTeam[]) => void;
  controllerEquipments: ControllerEquipment[];
  onUpdateEquipments: (equips: ControllerEquipment[]) => void;
  controllerManpower: ControllerManpower[];
  onUpdateManpower: (man: ControllerManpower[]) => void;
  equipmentMonthly: EquipmentMonthlyData[];
  manpowerMonthly: ManpowerMonthlyData[];
  teamAssignments: TeamAssignment[];
  onUpdateAssignments: (assignments: TeamAssignment[]) => void;
  chargesPerc: number;
  otPerc: number;
  currentUser: User;
}

export function MeasurementsView({
  contracts, onAddContract, onUpdateContract, onDeleteContract, onAddServices,
  measurements, onAddMeasurement, onUpdateMeasurement, onDeleteMeasurement,
  quotations, services, resources, bdi, readonly = false,
  templates, memories, onUpdateMemory,
  highwayLocations, onUpdateHighwayLocation, onDeleteHighwayLocation,
  stationGroups, onUpdateStationGroup, onDeleteStationGroup,
  cubationData, onUpdateCubationData,
  transportData, onUpdateTransportData,
  serviceProductions, onUpdateServiceProduction, onDeleteServiceProduction,
  dailyReports, onAddDailyReport, onUpdateDailyReport, onDeleteDailyReport, onMoveDailyReportActivity,
  pluviometryRecords, onAddPluviometryRecord, onUpdatePluviometryRecord,
  technicalSchedules, onUpdateTechnicalSchedule,
  onSyncAll,
  schedules,
  activeSubTab, onSetActiveSubTab,
  selectedContractId, onSetSelectedContractId,
  selectedMeasurementId, onSetSelectedMeasurementId,
  companyLogo, companyLogoRight, logoMode,
  controllerTeams, onUpdateTeams,
  controllerEquipments, onUpdateEquipments,
  controllerManpower, onUpdateManpower,
  equipmentMonthly, manpowerMonthly,
  teamAssignments, onUpdateAssignments,
  chargesPerc, otPerc,
  currentUser
}: MeasurementsViewProps) {
  const [activeMeasureType, setActiveMeasureType] = useState<'services' | 'cubacao' | 'transport' | null>(null);
  const [activeControlType, setActiveControlType] = useState<'production' | null>(null);
  const [serviceCodeInput, setServiceCodeInput] = useState('');
  const [memoryModalServiceId, setMemoryModalServiceId] = useState<string | null>(null);

  const selectedContract = useMemo(() => contracts.find(c => c.id === selectedContractId), [contracts, selectedContractId]);
  const contractQuot = useMemo(() => selectedContract ? quotations.find(q => q.id === selectedContract.quotationId) : null, [selectedContract, quotations]);

  const contractMeasurements = useMemo(() => 
    measurements.filter(m => m.contractId === selectedContractId).sort((a, b) => a.number - b.number),
    [measurements, selectedContractId]
  );

  // Teams Management States
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState<{name: string; supervisorId: string}>({ name: '', supervisorId: '' });
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'manpower' | 'equipment' } | null>(null);
  const [teamsSortField, setTeamsSortField] = useState<'name' | 'supervisor' | 'manCount' | 'manValue' | 'equipCount' | 'equipValue' | 'total'>('name');
  const [teamsSortOrder, setTeamsSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleAddAssignment = (teamId: string, memberId: string, type: 'manpower' | 'equipment') => {
    if (teamAssignments.some(a => a.teamId === teamId && a.memberId === memberId && a.type === type)) return;
    onUpdateAssignments([...teamAssignments, {
      id: uuidv4(),
      teamId,
      memberId,
      type,
      companyId: currentUser?.companyId || 'default',
      contractId: selectedContractId || undefined,
      month: selectedMonth
    }]);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    onUpdateAssignments(teamAssignments.filter(a => a.id !== assignmentId));
  };

  const handleCreateTeam = () => {
    if (!newTeam.name) return;
    const teamId = uuidv4();
    onUpdateTeams([...controllerTeams, {
      id: teamId,
      name: newTeam.name,
      supervisorId: newTeam.supervisorId || undefined,
      companyId: currentUser?.companyId || 'default',
      contractId: selectedContractId || undefined
    }]);
    setIsAddTeamOpen(false);
    setNewTeam({ name: '', supervisorId: '' });
    setSelectedTeamId(teamId);
  };

  const handleTeamsSort = (field: typeof teamsSortField) => {
    if (teamsSortField === field) {
      setTeamsSortOrder(teamsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamsSortField(field);
      setTeamsSortOrder('asc');
    }
  };

  const renderTeamsTab = () => {
    const filteredManpower = controllerManpower.filter(m => !selectedContractId || !m.contractId || m.contractId === selectedContractId);
    const filteredEquipments = controllerEquipments.filter(e => !selectedContractId || !e.contractId || e.contractId === selectedContractId);
    const filteredTeams = controllerTeams.filter(t => !selectedContractId || !t.contractId || t.contractId === selectedContractId);

    const poolManpower = filteredManpower.filter(m => !m.exitDate);
    const poolEquipments = filteredEquipments.filter(e => !e.exitDate);

    const getTeamMembers = (teamId: string) => {
      return teamAssignments.filter(a => a.teamId === teamId && a.month === selectedMonth);
    };

    const currentEquipmentMonthly = equipmentMonthly.filter(d => d.month === selectedMonth);
    const currentManpowerMonthly = manpowerMonthly.filter(d => d.month === selectedMonth);

    const summaryData = filteredTeams.map(team => {
      const teamMems = getTeamMembers(team.id);
      
      const activeManAssignments = teamMems.filter(a => {
        if (a.type !== 'manpower') return false;
        const person = controllerManpower.find(m => m.id === a.memberId);
        return person && !person.exitDate;
      });

      const activeEquipAssignments = teamMems.filter(a => {
        if (a.type !== 'equipment') return false;
        const equip = controllerEquipments.find(e => e.id === a.memberId);
        return equip && !equip.exitDate;
      });

      let manCost = 0;
      activeManAssignments.forEach(assignment => {
        const data = currentManpowerMonthly.find(d => d.manpowerId === assignment.memberId);
        if (data) {
          const salary = data.salary || 0;
          const otHours = data.overtimeRate || 0;
          const daily = data.dailyRate || 0;
          
          const hourly = salary / 220;
          const otValue = hourly * (1 + (otPerc / 100)) * otHours;
          const charges = (salary + otValue) * (chargesPerc / 100);
          
          manCost += salary + otValue + daily + charges;
        }
      });

      let equipCost = 0;
      activeEquipAssignments.forEach(assignment => {
        const data = currentEquipmentMonthly.find(d => d.equipmentId === assignment.memberId);
        if (data) equipCost += data.cost;
      });

      const supervisor = controllerManpower.find(m => m.id === team.supervisorId);

      return {
        id: team.id,
        name: team.name,
        supervisor: supervisor?.name || 'N/A',
        manCount: activeManAssignments.length,
        manValue: manCost,
        equipCount: activeEquipAssignments.length,
        equipValue: equipCost,
        total: manCost + equipCost
      };
    }).sort((a, b) => {
      let comparison = 0;
      switch (teamsSortField) {
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'supervisor': comparison = a.supervisor.localeCompare(b.supervisor); break;
        case 'manCount': comparison = a.manCount - b.manCount; break;
        case 'manValue': comparison = a.manValue - b.manValue; break;
        case 'equipCount': comparison = a.equipCount - b.equipCount; break;
        case 'equipValue': comparison = a.equipValue - b.equipValue; break;
        case 'total': comparison = a.total - b.total; break;
      }
      return teamsSortOrder === 'asc' ? comparison : -comparison;
    });

    return (
      <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Team Summary Card */}
        <Card className="border-[10px] border-gray-100 shadow-xl bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Resumo por Equipe</CardTitle>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Custo total e composição</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mês:</Label>
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40 h-9 rounded-xl border-gray-200 bg-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-b border-gray-100 italic">
                  <TableHead 
                    className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Equipe
                      {teamsSortField === 'name' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('supervisor')}
                  >
                    <div className="flex items-center gap-1">
                      Encarregado
                      {teamsSortField === 'supervisor' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('manCount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Qtd. M.O.
                      {teamsSortField === 'manCount' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('manValue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valor M.O.
                      {teamsSortField === 'manValue' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('equipCount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Qtd. Equip.
                      {teamsSortField === 'equipCount' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleTeamsSort('equipValue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valor Equip.
                      {teamsSortField === 'equipValue' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-bold text-[10px] uppercase tracking-widest text-blue-600 bg-blue-50/50 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleTeamsSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total
                      {teamsSortField === 'total' && (
                        teamsSortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400 font-bold italic uppercase tracking-widest text-[10px]">Nenhuma equipe cadastrada para este contrato.</TableCell>
                  </TableRow>
                ) : summaryData.map(row => (
                  <TableRow key={row.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-50">
                    <TableCell className="font-black text-gray-900">{row.name}</TableCell>
                    <TableCell className="text-gray-600 font-medium">{row.supervisor}</TableCell>
                    <TableCell className="text-center font-bold text-gray-900">{row.manCount}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-600">R$ {row.manValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center font-bold text-gray-900">{row.equipCount}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-600">R$ {row.equipValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-black text-blue-700 bg-blue-50/20">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Resource Pool */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-[10px] border-gray-100 shadow-xl bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden sticky top-8">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Recursos Disponíveis</CardTitle>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Arraste para as equipes</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <Tabs defaultValue="manpower" className="w-full">
                  <TabsList className="w-full bg-transparent border-b border-gray-100 rounded-none h-12 p-0">
                    <TabsTrigger value="manpower" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50/30 data-[state=active]:text-blue-700 text-[10px] font-black uppercase tracking-widest">
                      Colaboradores
                    </TabsTrigger>
                    <TabsTrigger value="equipment" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50/30 data-[state=active]:text-blue-700 text-[10px] font-black uppercase tracking-widest">
                      Equipamentos
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="manpower" className="m-0">
                    <ScrollArea className="h-[600px] p-4">
                      <div className="space-y-2">
                        {poolManpower.map(person => {
                          const isAssigned = teamAssignments.some(a => a.memberId === person.id && a.type === 'manpower' && a.month === selectedMonth);
                          return (
                            <div 
                              key={person.id}
                              draggable
                              onDragStart={() => setDraggedItem({ id: person.id, type: 'manpower' })}
                              onDragEnd={() => setDraggedItem(null)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing",
                                isAssigned ? "bg-gray-50 border-gray-100 opacity-50" : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl hover:-translate-y-0.5"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Users2 className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-black text-gray-900 leading-tight">{person.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{person.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAssigned && <Badge variant="secondary" className="text-[10px] font-bold">Alocado</Badge>}
                                {!isAssigned && selectedTeamId && (
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAssignment(selectedTeamId, person.id, 'manpower');
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {poolManpower.length === 0 && (
                          <div className="text-center py-20">
                             <Users2 className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Nenhum colaborador encontrado.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="equipment" className="m-0">
                    <ScrollArea className="h-[600px] p-4">
                      <div className="space-y-2">
                        {poolEquipments.map(equip => {
                          const isAssigned = teamAssignments.some(a => a.memberId === equip.id && a.type === 'equipment' && a.month === selectedMonth);
                          return (
                            <div 
                              key={equip.id}
                              draggable
                              onDragStart={() => setDraggedItem({ id: equip.id, type: 'equipment' })}
                              onDragEnd={() => setDraggedItem(null)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing",
                                isAssigned ? "bg-gray-50 border-gray-100 opacity-50" : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl hover:-translate-y-0.5"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Truck className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-black text-gray-900 leading-tight">{equip.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{equip.plate}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAssigned && <Badge variant="secondary" className="text-[10px] font-bold">Alocado</Badge>}
                                {!isAssigned && selectedTeamId && (
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAssignment(selectedTeamId, equip.id, 'equipment');
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {poolEquipments.length === 0 && (
                          <div className="text-center py-20">
                             <Truck className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Nenhum equipamento encontrado.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
               </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Teams Management */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl">
             <div>
               <h3 className="text-2xl font-black text-gray-900 tracking-tight">Gerenciamento de Equipes</h3>
               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Mês de Competência: {selectedMonth}</p>
             </div>
             <div className="flex items-center gap-4">
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[160px] h-12 rounded-2xl border-gray-200 bg-gray-50/50 font-bold text-xs"
                />
                <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
                    <DialogTrigger asChild>
                      <Button className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-blue-100 bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 transition-all active:scale-95">
                        <Plus className="w-5 h-5" /> Nova Equipe
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-3xl p-8">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Criar Nova Equipe</DialogTitle>
                        <DialogDescription className="text-sm">Defina o nome e o encarregado da frente de trabalho.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da Equipe</Label>
                          <Input 
                            placeholder="Ex: Equipe de Pavimentação" 
                            className="h-12 rounded-xl text-sm font-medium border-gray-200 focus:ring-blue-500"
                            value={newTeam.name || ''} 
                            onChange={e => setNewTeam({...newTeam, name: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Encarregado</Label>
                          <Select value={newTeam.supervisorId || ''} onValueChange={val => setNewTeam({...newTeam, supervisorId: val})}>
                            <SelectTrigger className="h-12 rounded-xl border-gray-200">
                              <SelectValue placeholder="Selecione o encarregado">
                                {newTeam.supervisorId && controllerManpower.find(m => m.id === newTeam.supervisorId)?.name || "Selecione o encarregado"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {poolManpower.map(m => (
                                <SelectItem key={m.id} value={m.id} className="rounded-lg text-sm">{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateTeam} className="w-full h-12 rounded-2xl bg-blue-600 font-bold uppercase tracking-widest text-xs">Salvar Equipe</Button>
                      </DialogFooter>
                    </DialogContent>
                </Dialog>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTeams.map(team => {
                const teamMems = getTeamMembers(team.id).filter(a => a.month === selectedMonth);
                const isExpanded = selectedTeamId === team.id;
                const supervisor = controllerManpower.find(m => m.id === team.supervisorId);

                return (
                  <motion.div 
                    key={team.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedItem) {
                        handleAddAssignment(team.id, draggedItem.id, draggedItem.type);
                      }
                    }}
                    className={cn(
                      "bg-white rounded-[2.5rem] border-2 transition-all overflow-hidden",
                      isExpanded ? "border-blue-600 shadow-2xl shadow-blue-100" : "border-gray-100 hover:border-blue-300 shadow-sm"
                    )}
                  >
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => toggleTeam(team.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-2xl transition-colors",
                            isExpanded ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-blue-50 text-blue-600"
                          )}>
                            <Users2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900 tracking-tight">{team.name}</h4>
                            <div className="flex items-center gap-2">
                              <HardHat className="w-3 h-3 text-gray-400" />
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">{supervisor?.name || 'Não definido'}</p>
                            </div>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                      </div>

                      <div className="flex gap-6 mt-4 pt-4 border-t border-gray-50">
                        <div className="text-center bg-gray-50/50 flex-1 py-3 rounded-2xl border border-gray-100">
                          <p className="text-lg font-black text-gray-900">{teamMems.filter(m => m.type === 'manpower').length}</p>
                          <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Colaboradores</p>
                        </div>
                        <div className="text-center bg-gray-50/50 flex-1 py-3 rounded-2xl border border-gray-100">
                          <p className="text-lg font-black text-gray-900">{teamMems.filter(m => m.type === 'equipment').length}</p>
                          <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Equipamentos</p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-100 bg-gray-50/30"
                        >
                          <div className="p-6 space-y-6">
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] uppercase font-black text-gray-400 mb-3 flex items-center gap-2 tracking-[0.2em]">
                                  <HardHat className="w-3.5 h-3.5" /> Equipe de Campo
                                </h5>
                                <div className="grid grid-cols-1 gap-2">
                                  {teamMems.filter(m => m.type === 'manpower').map(m => {
                                    const person = controllerManpower.find(p => p.id === m.memberId);
                                    return (
                                      <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-blue-200 group">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                          <span className="text-xs font-bold text-gray-700">{person?.name}</span>
                                        </div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                          onClick={() => handleRemoveAssignment(m.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {teamMems.filter(m => m.type === 'manpower').length === 0 && (
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic py-4 text-center border-2 border-dashed rounded-2xl border-gray-200">Arraste colaboradores aqui</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-[10px] uppercase font-black text-gray-400 mb-3 flex items-center gap-2 tracking-[0.2em]">
                                  <Truck className="w-3.5 h-3.5" /> Equipamentos Alocados
                                </h5>
                                <div className="grid grid-cols-1 gap-2">
                                  {teamMems.filter(m => m.type === 'equipment').map(m => {
                                    const equip = controllerEquipments.find(e => e.id === m.memberId);
                                    return (
                                      <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-emerald-200 group">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          <span className="text-xs font-bold text-gray-700">{equip?.name} <span className="text-[10px] text-gray-400">({equip?.plate})</span></span>
                                        </div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                          onClick={() => handleRemoveAssignment(m.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {teamMems.filter(m => m.type === 'equipment').length === 0 && (
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic py-4 text-center border-2 border-dashed rounded-2xl border-gray-200">Arraste equipamentos aqui</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-100">
                               <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl"
                                onClick={() => {
                                  if (confirm("Excluir esta equipe permanentemente?")) {
                                    onUpdateTeams(controllerTeams.filter(t => t.id !== team.id));
                                    onUpdateAssignments(teamAssignments.filter(a => a.teamId !== team.id));
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" /> Excluir Equipe
                               </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filteredTeams.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white/50 backdrop-blur-sm border-2 border-dashed rounded-[3rem] border-gray-100">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users2 className="w-10 h-10 text-blue-200" />
                </div>
                <h5 className="text-xl font-black text-gray-300 tracking-tight">Nenhuma equipe configurada</h5>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Clique em 'Nova Equipe' para estruturar sua frente de trabalho</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const getTeamMembers = (teamId: string) => teamAssignments.filter(a => a.teamId === teamId);
  const toggleTeam = (id: string) => setSelectedTeamId(selectedTeamId === id ? null : id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex h-full">
        {/* Área de Conteúdo */}
        <div className={cn(
          "flex-1 p-8 custom-scrollbar bg-[#F5F5F5]",
          activeSubTab === 'schedule' ? "overflow-hidden flex flex-col h-full" : "overflow-y-auto"
        )}>
          <AnimatePresence mode="wait">
            {activeSubTab === 'contracts' && (
              <ContractTab 
                key="contracts"
                contracts={contracts}
                quotations={quotations}
                services={services}
                onAdd={onAddContract}
                onDelete={onDeleteContract}
                onUpdate={onUpdateContract}
                onAddServices={onAddServices}
                onSelect={(id) => {
                  onSetSelectedContractId(id);
                  onSetActiveSubTab('measurements');
                }}
                selectedId={selectedContractId}
                readonly={readonly}
              />
            )}

            {activeSubTab === 'measurements' && selectedContract && (
              <MeasurementsSpreadsheet 
                key="spreadsheet"
                contract={selectedContract}
                quotation={contractQuot || null}
                measurements={contractMeasurements}
                onAddMeasurement={onAddMeasurement}
                onUpdateMeasurement={onUpdateMeasurement}
                onDeleteMeasurement={onDeleteMeasurement}
                onUpdateContract={onUpdateContract}
                services={services}
                resources={resources}
                bdi={bdi}
                readonly={readonly}
                templates={templates}
                memories={memories}
                onUpdateMemory={onUpdateMemory}
                setMemoryModalServiceId={setMemoryModalServiceId}
                selectedMeasurementId={selectedMeasurementId}
                setSelectedMeasurementId={onSetSelectedMeasurementId}
                onSetActiveSubTab={onSetActiveSubTab}
                onSetActiveMeasureType={setActiveMeasureType}
                onSetServiceCodeInput={setServiceCodeInput}
                currentUser={currentUser}
              />
            )}

            {activeSubTab === 'measure' && selectedContract && (
              <MeasureSelectionView 
                measureType={activeMeasureType}
                onSetType={setActiveMeasureType}
                serviceCodeInput={serviceCodeInput}
                onSetServiceCode={setServiceCodeInput}
                onOpenMemory={(serviceCode) => {
                  const s = services.find(serv => serv.code === serviceCode);
                  if (s) {
                    setMemoryModalServiceId(s.id);
                  } else {
                    alert('Serviço não encontrado');
                  }
                }}
                contract={selectedContract}
                measurement={contractMeasurements[contractMeasurements.length - 1]}
                measurements={contractMeasurements}
                services={services}
                onAddMeasurement={onAddMeasurement}
                onUpdateMeasurement={onUpdateMeasurement}
                highwayLocations={highwayLocations}
                onUpdateHighwayLocation={onUpdateHighwayLocation}
                onDeleteHighwayLocation={onDeleteHighwayLocation}
                stationGroups={stationGroups}
                onUpdateStationGroup={onUpdateStationGroup}
                onDeleteStationGroup={onDeleteStationGroup}
                cubationData={cubationData}
                onUpdateCubationData={onUpdateCubationData}
                transportData={transportData}
                onUpdateTransportData={onUpdateTransportData}
                resources={resources}
              />
            )}

            {activeSubTab === 'controls' && selectedContract && (
                <ProductionControlView
                    contract={selectedContract}
                    services={services}
                    serviceProductions={serviceProductions}
                    onUpdateProduction={onUpdateServiceProduction}
                    onDeleteProduction={onDeleteServiceProduction}
                    readonly={readonly}
                    companyLogo={companyLogo}
                    companyLogoRight={companyLogoRight}
                    logoMode={logoMode}
                />
            )}

            {activeSubTab === 'rdo' && selectedContract && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8">
                  <DailyReportView
                    contract={selectedContract}
                    reports={dailyReports.filter(r => r.contractId === selectedContractId)}
                    onAdd={onAddDailyReport}
                    onUpdate={onUpdateDailyReport}
                    onDelete={onDeleteDailyReport}
                    onMoveActivity={onMoveDailyReportActivity}
                    pluviometryRecords={pluviometryRecords.filter(r => r.contractId === selectedContractId)}
                    readonly={readonly}
                    companyLogo={companyLogo}
                    companyLogoRight={companyLogoRight}
                    logoMode={logoMode}
                  />
                </motion.div>
            )}

            {activeSubTab === 'pluviometria' && selectedContract && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8">
                <PluviometryView
                  contract={selectedContract}
                  records={pluviometryRecords.filter(r => r.contractId === selectedContractId)}
                  onAdd={onAddPluviometryRecord}
                  onUpdate={onUpdatePluviometryRecord}
                  readonly={readonly}
                />
              </motion.div>
            )}

            {activeSubTab === 'schedule' && selectedContract && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                className="flex-1 flex flex-col min-h-0 pt-0"
              >
                <TechnicalScheduleView
                  contract={selectedContract}
                  services={services}
                  resources={resources}
                  quotations={quotations}
                  technicalSchedules={technicalSchedules}
                  schedules={schedules}
                  onUpdate={onUpdateTechnicalSchedule}
                  readonly={readonly}
                />
              </motion.div>
            )}

            {activeSubTab === 'teams' && selectedContract && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {renderTeamsTab()}
              </motion.div>
            )}

            {activeSubTab === 'reports' && selectedContract && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <TechnicalReportsView 
                  contract={selectedContract}
                  measurements={contractMeasurements}
                  dailyReports={dailyReports.filter(r => r.contractId === selectedContract.id)}
                  pluviometryRecords={pluviometryRecords.filter(r => r.contractId === selectedContract.id)}
                  technicalSchedules={technicalSchedules.filter(s => s.contractId === selectedContract.id)}
                  controllerTeams={controllerTeams.filter(t => t.contractId === selectedContract.id)}
                  controllerEquipments={controllerEquipments.filter(e => e.contractId === selectedContract.id)}
                  controllerManpower={controllerManpower.filter(m => m.contractId === selectedContract.id)}
                  teamAssignments={teamAssignments}
                  serviceProductions={serviceProductions.filter(p => !p.contractId || p.contractId === selectedContract.id)}
                  services={services}
                  resources={resources}
                  memories={memories}
                  cubationData={cubationData}
                  transportData={transportData}
                  stationGroups={stationGroups}
                  highwayLocations={highwayLocations}
                  baseDate={contractQuot?.baseDate}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                />
              </motion.div>
            )}

            {activeSubTab === 'summary' && selectedContract && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <MeasurementSummaryView 
                  contract={selectedContract}
                  quotation={contractQuot || null}
                  measurements={contractMeasurements}
                  services={services}
                  resources={resources}
                  bdi={bdi}
                  onUpdateContract={onUpdateContract}
                  selectedMeasurementId={selectedMeasurementId}
                  setSelectedMeasurementId={onSetSelectedMeasurementId}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {memoryModalServiceId && selectedContract && (
        <CalculationMemoryModal 
          isOpen={!!memoryModalServiceId}
          onClose={() => setMemoryModalServiceId(null)}
          serviceId={memoryModalServiceId!}
          contract={selectedContract!}
          measurementId={
            activeSubTab === 'measure' 
              ? contractMeasurements[contractMeasurements.length - 1]?.id!
              : (contractMeasurements.find(m => m.id === selectedMeasurementId)?.id || contractMeasurements[contractMeasurements.length - 1]?.id || '')
          }
          services={services}
          templates={templates}
          memories={memories}
          measurements={measurements}
          quotations={quotations}
          onUpdateMemory={(m) => {
            onUpdateMemory(m);
            // Calculate total and update measurement item in the target measurement
            const targetMeasurement = contractMeasurements.find(med => med.id === m.measurementId);
            if (targetMeasurement && targetMeasurement.status !== 'closed') {
              const serviceUnit = services.find(s => s.id === m.serviceId)?.unit;
              const template = templates.find(t => t.unit === serviceUnit);
              const medCol = template?.columns.find(c => c.isResult) || template?.columns.find(c => {
                 const normalized = c.label.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                 return normalized === 'medicao' || normalized === 'total' || normalized === 'resultado' || normalized === 'subtotal';
              });
              const total = m.rows.reduce((acc, row) => {
                if (medCol) {
                  const valStr = row.values[medCol.id]?.toString().replace(',', '.') || '0';
                  return acc + (parseFloat(valStr) || 0);
                }
                return acc;
              }, 0);
              
              const newItems = [...targetMeasurement.items];
              const idx = newItems.findIndex(i => i.serviceId === m.serviceId);
              if (idx >= 0) {
                newItems[idx].quantity = total;
              } else {
                newItems.push({ serviceId: m.serviceId, quantity: total });
              }
              onUpdateMeasurement({ ...targetMeasurement, items: newItems });
            }
          }}
          readonly={readonly}
        />
      )}
    </div>
  );
}

function MeasurementSummaryView({ 
  contract, 
  quotation, 
  measurements, 
  services, 
  resources,
  bdi,
  onUpdateContract,
  selectedMeasurementId,
  setSelectedMeasurementId,
  companyLogo,
  companyLogoRight,
  logoMode
}: { 
  contract: Contract, 
  quotation: Quotation | null, 
  measurements: Measurement[], 
  services: ServiceComposition[], 
  resources: Resource[],
  bdi: number,
  onUpdateContract: (c: Contract) => void,
  selectedMeasurementId: string | null,
  setSelectedMeasurementId: (id: string | null) => void,
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode: 'left' | 'right' | 'both' | 'none'
}) {
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const sortedMeds = useMemo(() => [...measurements].sort((a, b) => a.number - b.number), [measurements]);
  
  const checkAdjustmentEligibility = (medDateStr?: string, baseDateStr?: string) => {
    if (!medDateStr || !baseDateStr) return false;
    try {
      const medDate = new Date(medDateStr);
      const baseDate = new Date(baseDateStr);
      if (isNaN(medDate.getTime()) || isNaN(baseDate.getTime())) return false;
      
      const anniversary = new Date(baseDate);
      anniversary.setFullYear(anniversary.getFullYear() + 1);
      
      const medYear = medDate.getFullYear();
      const medMonth = medDate.getMonth();
      const annYear = anniversary.getFullYear();
      const annMonth = anniversary.getMonth();
      
      return (medYear > annYear) || (medYear === annYear && medMonth >= annMonth);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!selectedMeasurementId && sortedMeds.length > 0) {
      setSelectedMeasurementId(sortedMeds[sortedMeds.length - 1].id);
    }
  }, [selectedMeasurementId, sortedMeds, setSelectedMeasurementId]);

  const activeMed = useMemo(() => 
    sortedMeds.find(m => m.id === selectedMeasurementId) || sortedMeds[sortedMeds.length - 1], 
    [sortedMeds, selectedMeasurementId]
  );

  const currentIndex = useMemo(() => 
    activeMed ? sortedMeds.indexOf(activeMed) : -1, 
    [sortedMeds, activeMed]
  );

  const summaryByGroup = useMemo(() => {
    const groups: { 
      name: string; 
      contractValue: number; 
      previousValue: number; 
      currentValue: number; 
      accumulatedValue: number; 
      balanceValue: number; 
      adjustmentIndex: number;
    }[] = [];

    const targetServices = contract.services || quotation?.services || [];
    const targetGroups = contract.groups || quotation?.groups || [];

    const processGroup = (name: string, groupServices: { serviceId: string; quantity: number }[]) => {
      let contractValue = 0;
      let previousValue = 0;
      let currentValue = 0;
      let accumulatedValue = 0;
      let prevBaseValue = 0;
      let currBaseValue = 0;
      const adj = (contract as any).groupAdjustments?.[name] || 1;

      groupServices.forEach(cs => {
        const s = services.find(x => x.id === cs.serviceId);
        if (!s) return;
        
        const unitPriceBase = (cs as any).price !== undefined && (cs as any).price > 0 
          ? (cs as any).price 
          : calculateServiceUnitCost(s, resources, services, bdi);
        
        // Contract Total (Always base value)
        contractValue += cs.quantity * unitPriceBase;
        
        // Current Measurement
        const isCurrentEligible = checkAdjustmentEligibility(activeMed?.date, quotation?.baseDate);
        const currentAdj = isCurrentEligible ? adj : 1;
        const currentQty = activeMed?.items.find(i => i.serviceId === s.id)?.quantity || 0;
        currBaseValue += currentQty * unitPriceBase;
        currentValue += currentQty * unitPriceBase * currentAdj;
        
        // Previous Measurements
        const prevMeds = sortedMeds.slice(0, currentIndex);
        prevMeds.forEach(med => {
          const isEligible = checkAdjustmentEligibility(med.date, quotation?.baseDate);
          const mAdj = isEligible ? adj : 1;
          const qty = med.items.find(i => i.serviceId === s.id)?.quantity || 0;
          prevBaseValue += qty * unitPriceBase;
          previousValue += qty * unitPriceBase * mAdj;
        });
        
        accumulatedValue = previousValue + currentValue;
      });

      if (groupServices.length > 0) {
        groups.push({
          name,
          contractValue,
          previousValue,
          currentValue,
          accumulatedValue,
          balanceValue: contractValue - (prevBaseValue + currBaseValue),
          adjustmentIndex: adj
        });
      }
    };

    if (targetServices.length > 0) {
      processGroup('Serviços Gerais', targetServices);
    }

    targetGroups.forEach(g => {
      processGroup(g.name, g.services);
    });

    return groups;
  }, [contract, quotation, sortedMeds, services, resources, bdi, activeMed, currentIndex]);

  const totals = useMemo(() => {
    return summaryByGroup.reduce((acc, group) => ({
      contractValue: acc.contractValue + group.contractValue,
      previousValue: acc.previousValue + group.previousValue,
      currentValue: acc.currentValue + group.currentValue,
      accumulatedValue: acc.accumulatedValue + group.accumulatedValue,
      balanceValue: acc.balanceValue + group.balanceValue
    }), {
      contractValue: 0,
      previousValue: 0,
      currentValue: 0,
      accumulatedValue: 0,
      balanceValue: 0
    });
  }, [summaryByGroup]);

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Resumo de Medição - ${contract.contractNumber}`;
    const subtitle = `Cliente: ${contract.client} | Medição Ref: ${activeMed ? `${activeMed.number}ª (${activeMed.period})` : 'Período não definido'}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(subtitle, 14, 28);

    const tableData = summaryByGroup.map(g => [
      g.name,
      formatCurrency(g.contractValue),
      formatCurrency(g.previousValue),
      formatCurrency(g.currentValue),
      formatCurrency(g.accumulatedValue),
      formatCurrency(g.balanceValue),
      `${formatNumber((g.accumulatedValue / g.contractValue) * 100, 1)}%`
    ]);

    tableData.push([
      'TOTAL',
      formatCurrency(totals.contractValue),
      formatCurrency(totals.previousValue),
      formatCurrency(totals.currentValue),
      formatCurrency(totals.accumulatedValue),
      formatCurrency(totals.balanceValue),
      `${formatNumber((totals.accumulatedValue / totals.contractValue) * 100, 1)}%`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Grupo', 'Contratual', 'Ant.', 'Atual', 'Acum.', 'Saldo', '%']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      }
    });

    doc.save(`Resumo_Medicao_${contract.contractNumber}.pdf`);
  };

  const handleExportExcel = () => {
    const wsData = [
      ['RESUMO DE MEDIÇÃO'],
      [`Contrato: ${contract.contractNumber}`],
      [`Cliente: ${contract.client}`],
      [`Medição Referência: ${activeMed ? `${activeMed.number}ª (${activeMed.period})` : 'Período não definido'}`],
      [],
      ['Grupo', 'Valor Contratual', 'Medição Anterior', 'Medição Atual', 'Acumulado', 'Saldo', '% Físico']
    ];

    summaryByGroup.forEach(g => {
      wsData.push([
        g.name,
        g.contractValue,
        g.previousValue,
        g.currentValue,
        g.accumulatedValue,
        g.balanceValue,
        (g.accumulatedValue / g.contractValue)
      ]);
    });

    wsData.push([
      'TOTAL',
      totals.contractValue,
      totals.previousValue,
      totals.currentValue,
      totals.accumulatedValue,
      totals.balanceValue,
      (totals.accumulatedValue / totals.contractValue)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Resumo_Medicao_${contract.contractNumber}.xlsx`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Resumo por Grupo de Serviços</h3>
            <p className="text-sm text-gray-500">
              {contract.contractNumber} | {contract.client}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAdjustmentOpen(true)} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
            <Settings2 className="w-4 h-4" />
            Índices de Reajuste
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
        </div>

        {measurements.length > 0 && (
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Medição Referência:</span>
            <Select value={selectedMeasurementId || ''} onValueChange={setSelectedMeasurementId}>
              <SelectTrigger className="w-[240px] h-9 bg-white border-none shadow-none font-bold text-blue-600">
                <SelectValue placeholder="Selecione a medição">
                  {(selectedMeasurementId && sortedMeds.find(m => m.id === selectedMeasurementId)) 
                    ? (() => {
                        const m = sortedMeds.find(x => x.id === selectedMeasurementId);
                        return `${m?.number}ª Medição (${m?.period})`;
                      })()
                    : "Selecione a medição"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedMeds.map(m => (
                  <SelectItem key={m.id} value={m.id} className="font-medium">
                    {m.number}ª Medição ({m.period})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Índices de Reajuste por Grupo</DialogTitle>
            <DialogDescription>
              Insira o índice multiplicador para cada grupo de serviços (ex: 1.05 para 5% de reajuste).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {summaryByGroup.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <Label className="text-sm font-medium capitalize">{g.name.toLowerCase()}</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    step="0.0001"
                    className="w-24 h-8 text-right font-mono"
                    value={g.adjustmentIndex || 1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      const currentAdjustments = (contract as any).groupAdjustments || {};
                      onUpdateContract({
                        ...contract,
                        groupAdjustments: {
                          ...currentAdjustments,
                          [g.name]: val
                        }
                      });
                    }}
                  />
                  <span className="text-[10px] text-gray-400">x</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAdjustmentOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          label="Valor do Contrato" 
          value={totals.contractValue} 
          icon={<Landmark className="w-4 h-4" />} 
          color="blue"
        />
        <SummaryCard 
          label="Medição Atual" 
          value={totals.currentValue} 
          icon={<Calculator className="w-4 h-4" />} 
          color="emerald"
        />
        <SummaryCard 
          label="Total Acumulado" 
          value={totals.accumulatedValue} 
          icon={<Briefcase className="w-4 h-4" />} 
          color="indigo"
          percentage={(totals.accumulatedValue / totals.contractValue) * 100}
        />
        <SummaryCard 
          label="Saldo a Medir" 
          value={totals.balanceValue} 
          icon={<AlertCircle className="w-4 h-4" />} 
          color="amber"
          percentage={(totals.balanceValue / totals.contractValue) * 100}
        />
      </div>

      <Card className="border-[10px] border-gray-100 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-none hover:bg-gray-50">
              <TableHead className="font-bold text-gray-900 h-12">Grupo de Serviço</TableHead>
              <TableHead className="text-center font-bold text-gray-900 w-[80px]">Reajuste</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Vlr. Contratual</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Med. Anterior</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Med. Atual</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Acumulado</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Saldo</TableHead>
              <TableHead className="text-right font-bold text-gray-900 w-[100px]">% Fís.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryByGroup.map((group, idx) => {
              const physicalPerc = (group.accumulatedValue / group.contractValue) * 100;
              return (
                <TableRow key={idx} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-bold text-gray-700 py-4 capitalize">
                    {group.name.toLowerCase()}
                  </TableCell>
                  <TableCell className="text-center font-mono text-[11px] text-amber-600 bg-amber-50/30">
                    {formatNumber(group.adjustmentIndex, 4)}x
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-600">
                    {formatCurrency(group.contractValue)}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {formatCurrency(group.previousValue)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {formatCurrency(group.currentValue)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600 bg-blue-50/30">
                    {formatCurrency(group.accumulatedValue)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-amber-600">
                    {formatCurrency(group.balanceValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={cn(
                      "font-bold border-none",
                      physicalPerc >= 100 ? "bg-emerald-100 text-emerald-700" :
                      physicalPerc > 50 ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {formatNumber(physicalPerc, 1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-gray-900 hover:bg-gray-900 border-none">
              <TableCell className="font-black text-white py-4 uppercase tracking-widest text-xs">Total do Contrato</TableCell>
              <TableCell className="text-center text-gray-500">-</TableCell>
              <TableCell className="text-right font-black text-white">{formatCurrency(totals.contractValue)}</TableCell>
              <TableCell className="text-right font-bold text-gray-400">{formatCurrency(totals.previousValue)}</TableCell>
              <TableCell className="text-right font-black text-emerald-400">{formatCurrency(totals.currentValue)}</TableCell>
              <TableCell className="text-right font-black text-blue-400">{formatCurrency(totals.accumulatedValue)}</TableCell>
              <TableCell className="text-right font-bold text-amber-400">{formatCurrency(totals.balanceValue)}</TableCell>
              <TableCell className="text-right">
                <div className="text-white font-black text-xs">
                  {formatNumber((totals.accumulatedValue / totals.contractValue) * 100, 1)}%
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}

function SummaryCard({ label, value, icon, color, percentage }: { label: string, value: number, icon: React.ReactNode, color: string, percentage?: number }) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-100 border-blue-200 shadow-blue-500/10",
    emerald: "text-emerald-600 bg-emerald-100 border-emerald-200 shadow-emerald-500/10",
    amber: "text-amber-600 bg-amber-100 border-amber-200 shadow-amber-500/10",
    indigo: "text-indigo-600 bg-indigo-100 border-indigo-200 shadow-indigo-500/10",
  };

  return (
    <Card className="border-[10px] border-gray-100 shadow-sm p-4 flex items-center gap-4 bg-white hover:shadow-md transition-shadow">
      <div className={cn("p-2 rounded-lg shrink-0", colorMap[color]?.split(' ').slice(0, 2).join(' '))}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-xl font-black text-gray-900 truncate">{formatCurrency(value)}</h4>
          {percentage !== undefined && (
            <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
              {formatNumber(percentage, 1)}%
            </span>
          )}
        </div>
        {percentage !== undefined && (
          <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, percentage)}%` }}
              className={cn("h-full", color === 'blue' ? 'bg-blue-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500')}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Sub-components para Organização ---

function ContractTab({ 
  contracts, quotations, services, onAdd, onDelete, onUpdate, onAddServices, onSelect, selectedId, readonly, onSyncAll
}: { 
  key?: string, contracts: Contract[], quotations: Quotation[], services: ServiceComposition[], onAdd: any, onDelete: any, onUpdate: any, onAddServices: any, onSelect: (id: string) => void, selectedId: string | null, readonly: boolean, onSyncAll?: () => Promise<void>
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFeedbackMsg, setImportFeedbackMsg] = useState<string | null>(null);
  
  const initialContractValue: Omit<Contract, 'id'> = {
    quotationId: '',
    contractNumber: '',
    workName: '',
    totalValue: 0,
    object: '',
    client: '',
    contractor: '',
    startDate: new Date().toISOString().split('T')[0],
    measurementUnit: '',
    measurementUnitValue: '',
    initialStation: '',
    finalStation: '',
    services: [],
    groups: []
  };

  const [newContract, setNewContract] = useState<Omit<Contract, 'id'>>(initialContractValue);

  const handleDownloadTemplate = () => {
    try {
      const data = [
        ['Grupo', 'Código do Serviço', 'Descrição do Serviço', 'Unidade', 'Quantidade', 'Preço Unitário'],
        ['Infraestrutura', 'INF-001', 'Escavação mecânica de valas', 'm3', 1500.50, 45.90],
        ['Pavimentação', 'PAV-010', 'Capa asfáltica CBUQ', 't', 800.00, 120.00],
        ['Drenagem', 'DRE-005', 'Tubo em concreto D=600mm', 'm', 350.25, 88.50]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo_Contrato");
      XLSX.writeFile(wb, `modelo_importacao_contrato.xlsx`);
    } catch (err) {
      console.error('Download template error:', err);
      alert('Erro ao gerar o modelo de planilha.');
    }
  };

  const handleImportSpreadsheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[Import] Iniciando leitura do arquivo: ${file.name}`, file.size, file.type);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Falha ao ler o conteúdo do arquivo.');

        console.log('[Import] Data buffer loaded, parsing with XLSX...');
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to Array of Arrays to find header dynamically
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (!rawRows || rawRows.length === 0) {
           console.error('A planilha parece estar vazia ou o formato não foi reconhecido.');
           setImportFeedbackMsg('❌ A planilha parece estar vazia ou o formato não foi reconhecido.');
           return;
        }

        let headerRowIndex = -1;
        let headers: string[] = [];

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !Array.isArray(row)) continue;
          
          const rowStrings = row.map(cell => String(cell || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
          
          if (rowStrings.some(s => s === 'codigo do servico' || s === 'codigo' || s === 'code' || s === 'cod' || s === 'item' || s === 'servico')) {
            headerRowIndex = i;
            headers = rowStrings;
            break;
          }
        }

        if (headerRowIndex === -1) {
           console.error('❌ Não foi possível encontrar a linha de cabeçalho na planilha.');
           setImportFeedbackMsg('❌ Não foi possível encontrar a linha de cabeçalho. A planilha deve conter a coluna "Código", "Item", ou "Serviço".');
           return;
        }

        const rowsToProcess: any[] = [];
        let skippedEmptyCount = 0;
        
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
           const row = rawRows[i];
           if (!row || !Array.isArray(row)) continue;
           
           if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

           const normalizedRow: any = {};
           for (let j = 0; j < headers.length; j++) {
              if (headers[j]) {
                 normalizedRow[headers[j]] = row[j];
              }
           }
           
           const getCode = (r: any) => {
             const val = r['codigo do servico'] ?? r['codigo'] ?? r['code'] ?? r['cod'] ?? r['item'] ?? r['servico'];
             return val !== null && val !== undefined && val !== '' ? String(val).trim() : '';
           };
           const serviceCode = getCode(normalizedRow);
           if (!serviceCode) {
             skippedEmptyCount++;
             continue;
           }
           rowsToProcess.push(normalizedRow);
        }

        const importedGroups: BudgetGroup[] = [];
        const missingServicesData: Omit<ServiceComposition, 'id'>[] = [];
        
        // Phase 1: Identify those missing from the system
        rowsToProcess.forEach(normalizedRow => {
          const getCode = (r: any) => {
             const val = r['codigo do servico'] ?? r['codigo'] ?? r['code'] ?? r['cod'] ?? r['item'] ?? r['servico'];
             return val !== null && val !== undefined && val !== '' ? String(val).trim() : '';
           };
          const serviceCode = getCode(normalizedRow);
          
          const exists = services.some(s => s.code.toLowerCase() === serviceCode.toLowerCase()) || missingServicesData.some(s => s.code.toLowerCase() === serviceCode.toLowerCase());
          if (!exists) {
            missingServicesData.push({
              code: serviceCode,
              name: String(normalizedRow['descricao do servico'] || normalizedRow['descricao'] || normalizedRow['nome'] || serviceCode).trim(),
              unit: String(normalizedRow['unidade'] || normalizedRow['unid'] || 'un').trim(),
              production: 1,
              fit: 1,
              items: []
            });
          }
        });

        // Phase 2: Create any missing services in bulk
        let allServices = [...services];
        if (missingServicesData.length > 0) {
          const newServices = await onAddServices(missingServicesData);
          allServices = [...allServices, ...newServices];
          console.log(`[Import] Created ${newServices.length} missing services on the fly.`);
        }
        
        console.log('[Import] rowsToProcess count:', rowsToProcess.length, 'allServices count:', allServices.length);

        // Phase 3: Build groups with the unified service IDs
        rowsToProcess.forEach((row: any) => {
          const groupName = row['grupo'] || 'Geral';
          const getCode = (r: any) => {
             const val = r['codigo do servico'] ?? r['codigo'] ?? r['code'] ?? r['cod'] ?? r['item'] ?? r['servico'];
             return val !== null && val !== undefined && val !== '' ? String(val).trim() : '';
           };
          const serviceCode = getCode(row);
          
          const parseNum = (val: any) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const parsed = parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
            return isNaN(parsed) ? 0 : parsed;
          };

          const quantity = parseNum(row['quantidade'] || row['qtd'] || row['quant'] || 0);
          const price = parseNum(row['preco unitario'] || row['preco'] || row['valor'] || 0);

          let service = allServices.find(s => s.code.toLowerCase() === serviceCode.toLowerCase());
          
          // Se não encontrou como serviço, tenta criar um mockup temporário na memória para não perder a linha
          if (!service) {
             console.warn(`[Import] Servico não encontrado e não foi criado na fase 2: ${serviceCode}`);
             service = {
               id: uuidv4(),
               code: serviceCode,
               name: String(row['descricao do servico'] || row['descricao'] || row['nome'] || serviceCode).trim(),
               unit: String(row['unidade'] || row['unid'] || 'un').trim(),
               production: 1,
               fit: 1,
               items: []
             };
          }

          let group = importedGroups.find(g => g.name === groupName);
          if (!group) {
            group = { id: uuidv4(), name: groupName, services: [] };
            importedGroups.push(group);
          }

          group.services.push({
            serviceId: service.id,
            code: service.code,
            name: service.name, // Save name as fallback
            quantity,
            price,
            worksheetType: 'direct'
          });
        });

        if (importedGroups.length > 0) {
          const totalServicesArr = importedGroups.reduce((acc, g) => acc + g.services.length, 0);
          console.log('[Import] Processing complete. Groups:', importedGroups.length, 'Total services:', totalServicesArr);

          setNewContract(prev => {
            const updatedValues = {
              ...prev,
              groups: importedGroups,
              services: [],
              quotationId: prev.quotationId || 'none'
            };
            
            if (editingContract) {
              // Note: We use setTimeout to defer the onUpdate call out of the React rendering cycle
              setTimeout(() => {
                onUpdate({ ...editingContract, ...updatedValues } as Contract);
                console.log('[Import] Auto-saved the existing contract after import.');
              }, 100);
            }
            
            return updatedValues;
          });
          
          let feedback = `✅ SUCESSO! Importamos: ${importedGroups.length} Grupos e ${totalServicesArr} Serviços.`;
          
          if (missingServicesData.length > 0) {
            feedback += ` Foram criados ${missingServicesData.length} novos serviços no cadastro geral.`;
          }
          
          if (skippedEmptyCount > 0) {
            feedback += ` (${skippedEmptyCount} linhas ignoradas sem código).`;
          }

          if (editingContract) {
            feedback += ` A planilha foi anexada ao contrato com sucesso! O contrato foi salvo pelo sistema.`;
          } else {
            feedback += ` Lembre-se de preencher os dados restantes e clicar em "Salvar Contrato" no final desta tela!`;
          }
          
          setImportFeedbackMsg(feedback);
        } else {
          console.error('❌ Nenhum serviço válido foi encontrado na planilha.');
          setImportFeedbackMsg('❌ Nenhum serviço válido foi encontrado na planilha.');
        }
      } catch (err) {
        console.error('[Import] Critical error:', err);
        setImportFeedbackMsg('❌ Erro Fatal no Processamento da planilha.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = (e) => {
      console.error('[Import] Reader error:', e);
      setImportFeedbackMsg('❌ Erro ao carregar o arquivo físico do disco.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportFeedbackMsg(null);
    if (editingContract) {
      onUpdate({ ...editingContract, ...newContract } as Contract);
    } else {
      onAdd(newContract);
    }
    setIsAddOpen(false);
    setEditingContract(null);
    setImportFeedbackMsg(null);
    setNewContract(initialContractValue);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setNewContract({ ...initialContractValue, ...contract });
    setIsAddOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold">Gestão de Contratos</h3>
          <p className="text-gray-500">Configure as informações dos contratos para realizar medições.</p>
        </div>
        <div className="flex gap-2">
          {!readonly && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingContract(null); setNewContract({
                quotationId: '',
                contractNumber: '',
                workName: '',
                totalValue: 0,
                object: '',
                client: '',
                contractor: '',
                startDate: new Date().toISOString().split('T')[0],
                measurementUnit: '',
                measurementUnitValue: '',
                initialStation: '',
                finalStation: '',
                services: [],
                groups: []
              }); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100">
                  <DialogTitle className="text-2xl font-bold">
                    {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700">Planilha/Orçamento Base</Label>
                    <Select value={newContract.quotationId} onValueChange={v => {
                        const q = quotations.find(item => item.id === v);
                        if (q) {
                          setNewContract({
                            ...newContract,
                            quotationId: q.id,
                            contractNumber: q.budgetName,
                            services: q.services,
                            groups: q.groups || []
                          });
                        } else {
                          setNewContract({ ...newContract, quotationId: v });
                        }
                      }}>
                        <SelectTrigger className="w-full h-11 border-gray-300">
                          <SelectValue placeholder="Selecione uma planilha base" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="font-bold text-blue-600">Livre (Sem vínculo com cotações)</SelectItem>
                          {quotations.map(q => (
                            <SelectItem key={q.id} value={q.id}>{q.budgetName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                  
                  <div className="grid gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <Label className="font-bold text-blue-900">Apoio (Importação de Planilha via Excel)</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                         <Button 
                           type="button" 
                           variant="outline" 
                           className="w-full sm:flex-1 gap-2 border-dashed border-blue-300 text-blue-700 bg-white hover:bg-blue-50 h-11"
                           onClick={handleDownloadTemplate}
                         >
                            <Download className="w-4 h-4" /> Baixar Modelo
                         </Button>
                         <Button 
                           type="button" 
                           variant="outline" 
                           className="w-full sm:flex-1 gap-2 border-dashed border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 h-11"
                           onClick={() => {
                             console.log('[UI] Import request triggered');
                             if (fileInputRef.current) {
                               fileInputRef.current.click();
                             } else {
                               console.error('Erro: O seletor de arquivos não está disponível.');
                             }
                           }}
                         >
                            <FileSpreadsheet className="w-4 h-4" /> Importar Planilha (.xls/.xlsx)
                         </Button>
                    </div>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls" 
                      onChange={handleImportSpreadsheet} 
                    />
                    {importFeedbackMsg && (
                      <div className={`mt-2 p-3 text-sm font-medium rounded-lg ${importFeedbackMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {importFeedbackMsg}
                      </div>
                    )}
                    <p className="text-xs text-blue-600/70 italic text-center sm:text-left">
                      Dica: Baixe nosso modelo em Excel, preencha os serviços e import-o aqui.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Dados Principais do Contrato</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Nº do Contrato <span className="text-red-500">*</span></Label>
                      <Input className="h-11" value={newContract.contractNumber || ''} onChange={e => setNewContract({...newContract, contractNumber: e.target.value})} required placeholder="Ex: CT-2023/105" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Nome da Obra</Label>
                      <Input className="h-11 border-blue-200 bg-blue-50/30" value={newContract.workName || ''} onChange={e => setNewContract({...newContract, workName: e.target.value})} placeholder="Identificação da Obra" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-700">Objeto do Contrato</Label>
                    <Input className="h-11" value={newContract.object || ''} onChange={e => setNewContract({...newContract, object: e.target.value})} placeholder="Resumo do escopo..." />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Client / Contratante</Label>
                      <Input className="h-11" value={newContract.client || ''} onChange={e => setNewContract({...newContract, client: e.target.value})} placeholder="Para quem prestamos serviço" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Nossa Empresa / Contratado</Label>
                      <Input className="h-11" value={newContract.contractor || ''} onChange={e => setNewContract({...newContract, contractor: e.target.value})} placeholder="Nossa razão social" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Valor Total Estimado</Label>
                      <NumericInput 
                        className="h-11 font-bold text-emerald-700" 
                        value={newContract.totalValue || 0} 
                        onChange={val => setNewContract({...newContract, totalValue: val})} 
                        prefix="R$"
                        decimals={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Data de Início</Label>
                      <Input type="date" className="h-11" value={newContract.startDate || ''} onChange={e => setNewContract({...newContract, startDate: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-4 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-2 relative group">
                      <div className="flex items-center gap-1.5"><Label className="text-xs font-bold text-gray-700 uppercase tracking-tight" title="Ex: Quando o contrato possui extensão a controlar (como km ou estacas).">Unid. de Medição ⓘ</Label></div>
                      <Input className="h-10 text-sm bg-white" placeholder="Ex: KM, Estaca" value={newContract.measurementUnit || ''} onChange={e => setNewContract({...newContract, measurementUnit: e.target.value})} />
                    </div>
                    <div className="space-y-2 relative group">
                      <div className="flex items-center gap-1.5"><Label className="text-xs font-bold text-gray-700 uppercase tracking-tight">Qtd. Unid.</Label></div>
                      <Input className="h-10 text-sm bg-white" placeholder="Ex: 50" value={newContract.measurementUnitValue || ''} onChange={e => setNewContract({...newContract, measurementUnitValue: e.target.value})} />
                    </div>
                    <div className="space-y-2 relative group">
                      <Label className="text-xs font-bold text-emerald-700 uppercase tracking-tight">Estaca/KM Inic.</Label>
                      <Input className="h-10 text-sm border-emerald-200 bg-white" placeholder="Ex: 0+0,00" value={newContract.initialStation || ''} onChange={e => setNewContract({...newContract, initialStation: e.target.value})} />
                    </div>
                    <div className="space-y-2 relative group">
                      <Label className="text-xs font-bold text-emerald-700 uppercase tracking-tight">Estaca/KM Final</Label>
                      <Input className="h-10 text-sm border-emerald-200 bg-white" placeholder="Ex: 150+0,00" value={newContract.finalStation || ''} onChange={e => setNewContract({...newContract, finalStation: e.target.value})} />
                    </div>
                  </div>

                </div>
                <DialogFooter className="p-6 pt-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-end gap-3 rounded-b-lg">
                  <DialogClose asChild>
                    <Button variant="ghost" className="h-11">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" className="w-full sm:w-auto h-11 px-8 font-bold text-base shadow-md bg-blue-600 hover:bg-blue-700 transition-all rounded-xl">
                    Salvar Contrato
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      </div>

      <div className="grid gap-4">
        {contracts.map(contract => (
          <Card 
            key={contract.id} 
            className={cn(
              "cursor-pointer border-none shadow-sm transition-all hover:shadow-md",
              selectedId === contract.id && "ring-2 ring-blue-500"
            )}
            onClick={() => onSelect(contract.id)}
          >
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                  <Landmark className="w-6 h-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-lg truncate">{contract.contractNumber}</h4>
                  {contract.workName && <p className="text-sm font-bold text-blue-600 uppercase tracking-tight truncate">{contract.workName}</p>}
                  <p className="text-sm text-gray-500 truncate">{contract.client} • {contract.contractor}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(contract.measurementUnit || contract.measurementUnitValue) && (
                      <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block whitespace-nowrap">
                        {contract.measurementUnit}: {contract.measurementUnitValue}
                      </p>
                    )}
                    {(contract.initialStation || contract.finalStation) && (
                      <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block whitespace-nowrap">
                        Trecho: {contract.initialStation || 'Início'} → {contract.finalStation || 'Fim'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                {contract.totalValue !== undefined && contract.totalValue > 0 && (
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Vlr. Total Contrato</p>
                    <p className="text-lg font-black text-emerald-600 leading-none">
                      {formatCurrency(contract.totalValue)}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                {!readonly && (
                  <>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(contract); }} className="text-gray-400 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(contract.id); }} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </CardContent>
          </Card>
        ))}
        {contracts.length === 0 && (
          <div className="text-center py-12 text-gray-400">Nenhum contrato cadastrado.</div>
        )}
      </div>
    </motion.div>
  );
}

function MeasurementsSpreadsheet({ 
  contract, quotation, measurements, onAddMeasurement, onUpdateMeasurement, onDeleteMeasurement, onUpdateContract, services, resources, bdi, readonly,
  templates, memories, onUpdateMemory, setMemoryModalServiceId, selectedMeasurementId, setSelectedMeasurementId,
  onSetActiveSubTab, onSetActiveMeasureType, onSetServiceCodeInput, currentUser
}: { 
  key?: string, contract: Contract, quotation: Quotation | null, measurements: Measurement[], onAddMeasurement: any, onUpdateMeasurement: any, onDeleteMeasurement: any, 
  onUpdateContract: (c: Contract) => void,
  services: ServiceComposition[], resources: Resource[], bdi: number, readonly: boolean,
  templates: MeasurementTemplate[], memories: CalculationMemory[], onUpdateMemory: (m: CalculationMemory) => void,
  setMemoryModalServiceId: (id: string | null) => void,
  selectedMeasurementId: string | null,
  setSelectedMeasurementId: (id: string | null) => void,
  onSetActiveSubTab: (tab: 'contracts' | 'measurements' | 'measure' | 'controls') => void,
  onSetActiveMeasureType: (type: 'services' | 'cubacao' | 'transport' | null) => void,
  onSetServiceCodeInput: (code: string) => void,
  currentUser: User
}) {
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editContractData, setEditContractData] = useState<Contract>(contract);

  useEffect(() => {
    setEditContractData(contract);
  }, [contract]);

  const handleUpdateContract = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateContract(editContractData);
    setIsEditContractOpen(false);
  };

  const handleUpdateWorkshetConfig = () => {
    onUpdateContract(editContractData);
    setIsConfigOpen(false);
  };

  const updateServiceWorksheetType = (serviceId: string, type: WorksheetType) => {
    const updated = { ...editContractData };
    
    if (updated.services) {
      const idx = updated.services.findIndex(s => s.serviceId === serviceId);
      if (idx >= 0) {
        updated.services[idx] = { ...updated.services[idx], worksheetType: type };
      }
    }
    
    if (updated.groups) {
      updated.groups = updated.groups.map(g => ({
        ...g,
        services: g.services.map(s => s.serviceId === serviceId ? { ...s, worksheetType: type } as any : s)
      }));
    }
    
    setEditContractData(updated);
  };

  // Budget data for config (using editContractData to be reactive)
  const configBudgetData = useMemo(() => {
    const groups: { name: string; services: { serviceId: string; quantity: number; worksheetType?: WorksheetType }[] }[] = [];
    const targetServices = editContractData.services || [];
    const targetGroups = editContractData.groups || [];

    if (targetServices.length > 0) {
      const validServices = targetServices.filter(ts => services.some(s => s.id === ts.serviceId));
      if (validServices.length > 0) {
        groups.push({ name: 'Serviços Gerais', services: validServices });
      }
    }

    targetGroups.forEach(g => {
      const validServices = g.services.filter(ts => services.some(s => s.id === ts.serviceId));
      if (validServices.length > 0) {
        groups.push({ name: g.name, services: validServices });
      }
    });

    return groups;
  }, [editContractData, services]);

  const [lastMeasurementsLength, setLastMeasurementsLength] = useState(measurements.length);

  useEffect(() => {
    if (measurements.length > lastMeasurementsLength) {
      setSelectedMeasurementId(measurements[measurements.length - 1].id);
    }
    setLastMeasurementsLength(measurements.length);
  }, [measurements.length, lastMeasurementsLength, setSelectedMeasurementId, measurements]);

  useEffect(() => {
    if (!selectedMeasurementId && measurements.length > 0) {
      setSelectedMeasurementId(measurements[measurements.length - 1].id);
    } else if (measurements.length === 0 && selectedMeasurementId) {
      setSelectedMeasurementId(null);
    } else if (selectedMeasurementId && !measurements.find(m => m.id === selectedMeasurementId) && measurements.length > 0) {
      setSelectedMeasurementId(measurements[measurements.length - 1].id);
    }
  }, [measurements, selectedMeasurementId, setSelectedMeasurementId]);

  const selectedMeasurement = useMemo(() => measurements.find(m => m.id === selectedMeasurementId), [measurements, selectedMeasurementId]);

  // Estrutura organizada para renderizar por grupos
  const budgetData = useMemo(() => {
    const groups: { name: string; services: { serviceId: string; quantity: number; price?: number; worksheetType?: WorksheetType }[] }[] = [];
    
    // Check if contract has its own copy of the budget, otherwise fallback to quotation ONLY if quotationId != 'none'
    const targetServices = (contract.services && contract.services.length > 0) ? contract.services : (contract.quotationId !== 'none' ? quotation?.services : []) || [];
    const targetGroups = (contract.groups && contract.groups.length > 0) ? contract.groups : (contract.quotationId !== 'none' ? quotation?.groups : []) || [];

    if (targetServices.length > 0) {
      groups.push({ name: 'Serviços Gerais', services: targetServices });
    }

    targetGroups.forEach(g => {
      if (g.services.length > 0) {
        groups.push({ name: g.name, services: g.services });
      }
    });

    return groups;
  }, [quotation, contract, services]);

  const [isNewMedicaoOpen, setIsNewMedicaoOpen] = useState(false);
  const [newMedicao, setNewMedicao] = useState({
    period: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleCreateMedicao = () => {
    if (!newMedicao.period) return;
    const maxNumber = measurements.length > 0 ? Math.max(...measurements.map(m => m.number)) : 0;
    onAddMeasurement({
      contractId: contract.id,
      number: maxNumber + 1,
      period: newMedicao.period,
      date: newMedicao.date,
      items: []
    });
    // Let useEffect handle setting the ID to the newly created one, or we can't do it reliably without the id.
    setIsNewMedicaoOpen(false);
  };

  const updateMeasurementItem = (serviceId: string, quantity: number) => {
    if (!selectedMeasurement) return;
    const newItems = [...selectedMeasurement.items];
    const idx = newItems.findIndex(i => i.serviceId === serviceId);
    if (idx >= 0) {
      newItems[idx].quantity = quantity;
    } else {
      newItems.push({ serviceId, quantity });
    }
    onUpdateMeasurement({ ...selectedMeasurement, items: newItems });
  };

  const handleCloseMeasurement = () => {
    if (!selectedMeasurement) return;
    onUpdateMeasurement({ ...selectedMeasurement, status: 'closed' });
  };

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState({ groupId: '', serviceId: '', quantity: 1, price: 0, newGroupName: '' });

  const handleImportService = () => {
    if ((!importData.groupId && !importData.newGroupName) || !importData.serviceId) {
      alert("Selecione ou crie um grupo e selecione um serviço.");
      return;
    }

    const updatedContract = { ...contract };
    if (!updatedContract.groups) {
      if (quotation?.groups) {
         updatedContract.groups = JSON.parse(JSON.stringify(quotation.groups));
      } else {
         updatedContract.groups = [];
      }
    }

    let targetGroupName = importData.groupId;
    if (importData.newGroupName) {
      targetGroupName = importData.newGroupName;
    }

    let targetGroup = updatedContract.groups.find(g => g.name === targetGroupName);
    if (!targetGroup) {
      targetGroup = { id: uuidv4(), name: targetGroupName, services: [] };
      updatedContract.groups.push(targetGroup);
    }

    // Check if service already exists in this group
    const existingService = targetGroup.services.find(s => s.serviceId === importData.serviceId);
    if (existingService) {
      existingService.quantity += Number(importData.quantity);
      if (importData.price > 0) existingService.price = importData.price;
    } else {
      const service = services.find(s => s.id === importData.serviceId);
      targetGroup.services.push({ 
        serviceId: importData.serviceId, 
        code: service?.code || '',
        quantity: Number(importData.quantity),
        price: importData.price > 0 ? importData.price : undefined
      });
    }

    onUpdateContract(updatedContract);
    setIsImportOpen(false);
    setImportData({ groupId: '', serviceId: '', quantity: 1, price: 0, newGroupName: '' });
  };

  const isMeasurementClosed = selectedMeasurement?.status === 'closed';
  const hasOpenMeasurement = measurements.some(m => m.status !== 'closed');

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-blue-600 p-3 rounded-xl shrink-0">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold truncate">Planilha de Medições</h3>
            <p className="text-sm text-gray-500 truncate">
               <span className="font-semibold text-gray-700">{contract.contractNumber}</span> | {contract.client}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          {!readonly && (
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-gray-400 hover:text-emerald-600 h-9">
                    <Ruler className="w-4 h-4 mr-1" /> Configurar Planilhas
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-[900px] h-fit max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-6 pb-2">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                         <Ruler className="w-5 h-5 text-blue-600" />
                         Configuração de Planilhas por Serviço
                      </DialogTitle>
                      <DialogDescription>
                        Selecione como cada serviço deve ser medido (Memória Padrão, Cubação ou Transporte).
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <ScrollArea className="flex-1 px-6">
                    <div className="space-y-8 py-4">
                      {configBudgetData.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] whitespace-nowrap">{group.name}</h4>
                            <div className="h-px bg-blue-100 flex-1" />
                          </div>
                          <div className="grid gap-3">
                            {group.services.map(cs => {
                              const s = services.find(x => x.id === cs.serviceId);
                              if (!s) return null;
                              const currentType = cs.worksheetType || 'direct';
                              return (
                                <div key={cs.serviceId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all group/item gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{s.code}</span>
                                      <span className="text-[9px] font-semibold text-gray-400 capitalize">{s.unit}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 break-words group-hover/item:text-blue-900 transition-colors uppercase leading-tight">{s.name}</p>
                                  </div>
                                  <div className="shrink-0 w-full sm:w-[240px]">
                                    <Select 
                                      value={currentType} 
                                      onValueChange={(v: WorksheetType) => updateServiceWorksheetType(cs.serviceId, v)}
                                    >
                                      <SelectTrigger className="w-full h-10 text-xs font-medium bg-gray-50 border-gray-200 hover:bg-white transition-colors focus:ring-blue-100">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="direct">Memória Padrão (Direta)</SelectItem>
                                        <SelectItem value="cubation">Cubação (Áreas/Estacas)</SelectItem>
                                        <SelectItem value="transport">Transporte (DMT/M3)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {configBudgetData.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                           <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                           <p className="font-medium">Nenhum serviço disponível para configuração.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="bg-gray-50 p-6 border-t flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="flex-1 font-bold">Cancelar</Button>
                    <Button onClick={handleUpdateWorkshetConfig} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold transition-all hover:translate-y-[-1px] active:translate-y-[0px]">Salvar Alterações</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isEditContractOpen} onOpenChange={setIsEditContractOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-600 h-9">
                    <Edit className="w-4 h-4 mr-1" /> Editar Contrato
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleUpdateContract}>
                    <DialogHeader>
                      <DialogTitle>Editar Detalhes do Contrato</DialogTitle>
                      <DialogDescription>Atualize as informações principais do contrato.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                      <div className="space-y-2">
                         <Label>Número do Contrato</Label>
                         <Input value={editContractData.contractNumber || ''} onChange={e => setEditContractData({...editContractData, contractNumber: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                         <Label>Cliente</Label>
                         <Input value={editContractData.client || ''} onChange={e => setEditContractData({...editContractData, client: e.target.value})} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Estaca Inicial (KM+M)</Label>
                           <Input value={editContractData.initialStation || ''} onChange={e => setEditContractData({...editContractData, initialStation: e.target.value})} placeholder="0+000" />
                        </div>
                        <div className="space-y-2">
                           <Label>Estaca Final (KM+M)</Label>
                           <Input value={editContractData.finalStation || ''} onChange={e => setEditContractData({...editContractData, finalStation: e.target.value})} placeholder="10+000" />
                        </div>
                      </div>
                      <div className="space-y-2">
                         <Label className="font-bold text-blue-600">Obra / Localização</Label>
                         <Input value={editContractData.workName || ''} onChange={e => setEditContractData({...editContractData, workName: e.target.value})} className="border-blue-200" />
                      </div>
                      <div className="space-y-2">
                         <Label>Valor Total do Contrato</Label>
                         <NumericInput value={editContractData.totalValue || 0} onChange={val => setEditContractData({...editContractData, totalValue: val})} prefix="R$" decimals={2} />
                      </div>
                    </div>
                    <DialogFooter className="bg-gray-50 p-4 -mx-6 -mb-6 border-t mt-4">
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Salvar Alterações</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!readonly && !isMeasurementClosed && (
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9 mr-2">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Importar Serviço</DialogTitle>
                  <DialogDescription>Adicione um serviço extra ao orçamento deste contrato.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Grupo</Label>
                    <Select value={importData.groupId} onValueChange={v => setImportData({...importData, groupId: v, newGroupName: v === 'new' ? '' : importData.newGroupName})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetData.map(g => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                        <SelectItem value="new" className="font-bold text-blue-600">+ Criar novo grupo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {importData.groupId === 'new' && (
                    <div className="space-y-2">
                      <Label>Nome do Novo Grupo</Label>
                      <Input 
                        placeholder="Ex: Terraplenagem" 
                        value={importData.newGroupName || ''} 
                        onChange={e => setImportData({...importData, newGroupName: e.target.value})} 
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Serviço</Label>
                    <Select value={importData.serviceId} onValueChange={v => setImportData({...importData, serviceId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade Contratada</Label>
                      <Input type="number" min="0" step="0.001" value={importData.quantity} onChange={e => setImportData({...importData, quantity: e.target.valueAsNumber || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Unitário (Opcional)</Label>
                      <Input type="number" min="0" step="0.01" value={importData.price} onChange={e => setImportData({...importData, price: e.target.valueAsNumber || 0})} placeholder="Valor da planilha" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleImportService} className="bg-blue-600 hover:bg-blue-700">Importar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <div className="w-full sm:w-64">
            <Label className="text-[10px] text-gray-400 uppercase font-bold pr-1 block mb-1">Selecione o Período</Label>
            <Select 
              value={selectedMeasurementId || "-1"} 
              onValueChange={v => setSelectedMeasurementId(v === "-1" ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue>
                  {selectedMeasurementId && selectedMeasurementId !== "-1"
                    ? (() => { 
                        const m = measurements.find(x => x.id === selectedMeasurementId); 
                        return m ? `Medição ${m.number.toString().padStart(2, '0')} - ${m.period}` : "Selecione medição"; 
                      })()
                    : "Selecione medição"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {measurements.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Medição {m.number.toString().padStart(2, '0')} - {m.period}
                    {m.status === 'closed' && " (Encerrada)"}
                  </SelectItem>
                ))}
                {measurements.length === 0 && <SelectItem value="-1" disabled>Nenhuma medição</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {contract && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9 shrink-0 gap-2"
                onClick={() => exportContractSpreadsheetToExcel(contract, services)}
              >
                <FileDown className="w-4 h-4" /> Exportar (Excel)
              </Button>
            )}
            {!readonly && selectedMeasurement && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Excluir Medição</DialogTitle>
                    <DialogDescription>
                      Esta ação é irreversível. Todas as memórias de cálculo, planilhas de cubação e transporte associadas serão removidas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm border-l-4 border-red-500 pl-4 bg-red-50 py-2 text-red-800">
                      <strong>Aviso:</strong> Apenas usuários com nível de <strong>Administrador</strong> ou <strong>Master</strong> podem concluir esta exclusão conforme as políticas do sistema.
                    </p>
                    {!(currentUser.role === 'admin' || currentUser.role === 'master') && (
                      <p className="text-xs text-amber-600 font-bold italic">
                        * Sua conta atual não possui permissões suficientes para aprovar esta exclusão.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => {
                        if (currentUser.role === 'admin' || currentUser.role === 'master') {
                          onDeleteMeasurement(selectedMeasurementId);
                          setSelectedMeasurementId(null);
                        } else {
                          // IMPLEMENTATION: Mark for deletion/alert user
                          const m = measurements.find(x => x.id === selectedMeasurementId);
                          if (m) {
                            onUpdateMeasurement({ ...m, status: 'pending_deletion' });
                            alert("Sua solicitação de exclusão foi registrada e aguarda aprovação de um Administrador.");
                          }
                        }
                      }} 
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {(currentUser.role === 'admin' || currentUser.role === 'master') ? 'Confirmar Exclusão' : 'Solicitar Exclusão'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {!readonly && selectedMeasurement && !isMeasurementClosed && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 h-9 shrink-0"
                  >
                    <Lock className="w-4 h-4 mr-2" /> Encerrar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Encerrar Medição</DialogTitle>
                    <DialogDescription>
                      Tem certeza de que deseja encerrar a medição atual (Nº {selectedMeasurement.number.toString().padStart(2, '0')})?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-gray-600">
                      Após encerrada, <strong className="text-red-500">não será mais possível alterar</strong> ou adicionar serviços nesta medição, exceto por um usuário administrador.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseMeasurement} className="bg-amber-600 hover:bg-amber-700 text-white">
                      Sim, Encerrar Medição
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isMeasurementClosed && (
              <div className="flex items-center gap-2 px-3 h-9 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-[10px] font-bold uppercase shadow-sm shrink-0">
                 <Lock className="w-3.5 h-3.5" /> Encerrada
              </div>
            )}

            {!readonly && !hasOpenMeasurement && (
              <Dialog open={isNewMedicaoOpen} onOpenChange={setIsNewMedicaoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 h-9 shrink-0">
                    <Plus className="w-4 h-4 mr-2" /> Nova Medição
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Abrir Nova Medição</DialogTitle>
                    <DialogDescription>A medição será numerada sequencialmente (#{measurements.length + 1}).</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Período (Mês/Ano)</Label>
                      <Input placeholder="Ex: Abril/2026" value={newMedicao.period || ''} onChange={e => setNewMedicao({...newMedicao, period: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data da Medição</Label>
                      <Input type="date" value={newMedicao.date || ''} onChange={e => setNewMedicao({...newMedicao, date: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateMedicao}>Criar Medição</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

    <Card className="border-[10px] border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="max-h-[70vh] overflow-auto custom-scrollbar border rounded-md relative">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
              <TableRow>
                <TableHead className="w-[100px] text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Cód</TableHead>
                <TableHead className="min-w-[150px] max-w-[300px] text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Discriminação</TableHead>
                <TableHead className="text-center text-[10px] uppercase font-bold bg-gray-50 sticky top-0">UM</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Preço Unit.</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Qtd. Contrato</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Total Contrato</TableHead>
                <TableHead className="text-right bg-blue-50 text-blue-600 text-[10px] uppercase font-bold sticky top-0">Qtd. Med. Atual</TableHead>
                <TableHead className="text-right bg-blue-50 text-blue-600 text-[10px] uppercase font-bold sticky top-0">Vlr. Med. Atual</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Acum. Med. Anterior</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Vlr. Med. Anterior</TableHead>
                <TableHead className="text-right font-bold text-gray-900 text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Quant. Acum. Total</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Saldo Qtd.</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">Saldo Vlr.</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold bg-gray-50 sticky top-0">%</TableHead>
              </TableRow>
            </thead>
            <TableBody>
              {budgetData.map((group, groupIdx) => {
                let groupTotalMedAtual = 0;
                return (
                <React.Fragment key={groupIdx}>
                  <TableRow className="bg-gray-100/50">
                    <TableCell colSpan={14} className="py-2 px-4 font-bold text-blue-800 text-xs italic">
                      {group.name}
                    </TableCell>
                  </TableRow>
                      {group.services.map((qs, qsIdx) => {
                        let s = services.find(serv => serv.id === qs.serviceId);
                        // Fallback to code if ID lookup fails (handles imports/legacy data)
                        if (!s && (qs as any).code) {
                          s = services.find(serv => serv.code === (qs as any).code);
                        }
                        
                        const displayCode = s?.code || (qs as any).code || 'S/N';
                        const displayName = s?.name || (qs as any).name || (qs as any).description || 'Descrição não disponível';
                        const displayUnit = s?.unit || (qs as any).unit || (qs as any).measurementUnit || 'un';
                        
                        const unitCost = qs.price !== undefined && qs.price > 0 
                          ? qs.price 
                          : (s ? calculateServiceUnitCost(s, resources, services, bdi) : (qs.price || 0));
                        
                        const totalContracted = qs.quantity * unitCost;

                        // Medição Atual
                        const medAtual = selectedMeasurement?.items.find(i => i.serviceId === qs.serviceId)?.quantity || 0;
                        const vlrMedAtual = medAtual * unitCost;
                        groupTotalMedAtual += vlrMedAtual;

                        // Acumulado Anterior
                        const selectedIdx = measurements.findIndex(m => m.id === selectedMeasurementId);
                        const selectedNum = selectedMeasurement?.number || -1;
                        const prevMeasurements = measurements.filter((m) => m.contractId === contract.id && m.number < selectedNum);
                        const acumAnterior = prevMeasurements.reduce((acc, m) => {
                          const item = m.items.find(i => i.serviceId === qs.serviceId);
                          return acc + (item?.quantity || 0);
                        }, 0);
                        const vlrAcumAnterior = acumAnterior * unitCost;

                        const acumTotal = medAtual + acumAnterior;
                        const vlrAcumTotal = acumTotal * unitCost;
                        
                        const saldoQtd = qs.quantity - acumTotal;
                        const saldoVlr = totalContracted - vlrAcumTotal;
                        const perc = qs.quantity > 0 ? (acumTotal / qs.quantity) * 100 : 0;
                        const worksheetType = (qs as any).worksheetType || 'direct';

                        return (
                            <TableRow 
                            key={qs.serviceId} 
                            className="group cursor-pointer hover:bg-blue-50/30 transition-colors select-none active:bg-blue-100/40"
                            onDoubleClick={(e) => {
                              console.log('[UI] Double click on row', qs.serviceId);
                              if (measurements.length === 0) {
                                alert("Crie uma medição antes de abrir a memória de cálculo.");
                                return;
                              }
                              
                              if (worksheetType === 'direct') {
                                setMemoryModalServiceId(qs.serviceId);
                              } else {
                                onSetActiveSubTab('measure');
                                onSetActiveMeasureType(worksheetType === 'cubation' ? 'cubacao' : 'transport');
                                if (s?.code) onSetServiceCodeInput(s.code);
                              }
                            }}
                            title={`Clique duplo para abrir ${worksheetType === 'direct' ? 'a memória' : worksheetType === 'cubation' ? 'a cubação' : 'o transporte'}`}
                          >
                            <TableCell className="font-mono text-[10px] py-2">{displayCode}</TableCell>
                            <TableCell className="text-[11px] py-2 leading-tight min-w-[150px] max-w-[300px] whitespace-normal break-words font-medium text-gray-700 capitalize">{displayName.toLowerCase()}</TableCell>
                            <TableCell className="text-center text-xs py-2">{displayUnit}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono py-2">{formatCurrency(unitCost)}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono py-2">{formatNumber(qs.quantity, 3)}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono py-2">{formatCurrency(totalContracted)}</TableCell>
                        
                            {/* Atual */}
                            <TableCell className="text-right bg-blue-50/30 py-2">
                              <div className="flex items-center justify-end gap-1 px-1">
                                <span className="text-[10px] font-mono font-bold text-blue-600 min-w-[60px]">
                                  {formatNumber(medAtual, 3)}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (measurements.length === 0) {
                                      alert("Crie uma medição antes de abrir a memória.");
                                      return;
                                    }
                                    setMemoryModalServiceId(qs.serviceId);
                                  }}
                                  className="text-blue-400 hover:text-blue-600 p-0.5 bg-blue-100/50 rounded hover:bg-blue-200 transition-colors"
                                  title="Abrir memória de cálculo (Clique duplo na linha também abre)"
                                >
                                  <Calculator className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right bg-blue-50/30 text-[10px] font-mono text-blue-600 py-2">{formatCurrency(vlrMedAtual)}</TableCell>
                            
                            {/* Anterior */}
                            <TableCell className="text-right text-[10px] font-mono py-2">{formatNumber(acumAnterior, 3)}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono py-2">{formatCurrency(vlrAcumAnterior)}</TableCell>
                            
                            {/* Acum. Total */}
                            <TableCell className="text-right text-[10px] font-mono font-bold py-2">{formatNumber(acumTotal, 3)}</TableCell>
                            
                            {/* Saldo */}
                            <TableCell className={cn("text-right text-[10px] font-mono py-2", saldoQtd < 0 && "text-red-500")}>{formatNumber(saldoQtd, 3)}</TableCell>
                            <TableCell className={cn("text-right text-[10px] font-mono py-2", saldoVlr < 0 && "text-red-500")}>{formatCurrency(saldoVlr)}</TableCell>
                            
                            {/* % */}
                            <TableCell className="text-right py-2">
                              <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-bold">{formatNumber(perc, 1)}%</span>
                                  <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full", perc > 100 ? "bg-red-500" : "bg-blue-600")} style={{ width: `${Math.min(perc, 100)}%` }} />
                                  </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  <TableRow className="bg-blue-50/30">
                    <TableCell colSpan={7} className="py-2 px-4 text-right font-bold text-blue-800 text-[10px] uppercase">
                      Subtotal {group.name} (Medição Atual):
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-blue-800 text-[10px] py-2">
                       {formatCurrency(groupTotalMedAtual)}
                    </TableCell>
                    <TableCell colSpan={6} />
                  </TableRow>
                </React.Fragment>
              )})}

              {budgetData.length > 0 && (
                <TableRow className="bg-blue-100/50">
                   <TableCell colSpan={7} className="py-3 px-4 text-right font-black text-blue-900 text-xs uppercase">
                     Total da Medição Atual:
                   </TableCell>
                   <TableCell className="text-right font-mono font-black text-blue-900 text-xs py-3">
                     {formatCurrency(
                        budgetData.reduce((acc, group) => {
                          return acc + group.services.reduce((gAcc, qs) => {
                            const s = services.find(serv => serv.id === qs.serviceId) || services.find(serv => serv.code === (qs as any).code);
                            const unitCost = qs.price !== undefined && qs.price > 0 
                              ? qs.price 
                              : (s ? calculateServiceUnitCost(s, resources, services, bdi) : (qs.price || 0));
                            const medAtual = selectedMeasurement?.items.find(i => i.serviceId === qs.serviceId)?.quantity || 0;
                            return gAcc + (medAtual * unitCost);
                          }, 0);
                        }, 0)
                     )}
                   </TableCell>
                   <TableCell colSpan={6} />
                </TableRow>
              )}

              {budgetData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-12 text-gray-400">Nenhum serviço encontrado nesta planilha base.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </Card>

    </motion.div>
  );
}

function CalculationMemoryModal({ 
  isOpen, onClose, serviceId, contract, measurementId: initialMeasurementId, services, templates, memories, measurements, quotations, onUpdateMemory, readonly: globalReadonly 
}: { 
  isOpen: boolean, onClose: () => void, serviceId: string, contract: Contract, measurementId: string, 
  services: ServiceComposition[], templates: MeasurementTemplate[], memories: CalculationMemory[], 
  measurements: Measurement[], quotations: Quotation[],
  onUpdateMemory: (m: CalculationMemory) => void, readonly: boolean 
}) {
  const [activeMeasurementId, setActiveMeasurementId] = useState(initialMeasurementId);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, MemoryRow[]>>({});
  
  const service = services.find(s => s.id === serviceId);
  const template = useMemo(() => templates.find(t => t.unit === service?.unit), [templates, service]);
  const contractId = contract?.id;

  const currentMeasurement = useMemo(() => measurements.find(m => m.id === activeMeasurementId), [measurements, activeMeasurementId]);
  const isReadonly = globalReadonly || currentMeasurement?.status === 'closed';

  const currentMemory = useMemo(() => {
    if (!contractId || !activeMeasurementId) return {
      id: uuidv4(),
      contractId: contractId || '',
      measurementId: activeMeasurementId || '',
      serviceId,
      rows: []
    };
    return memories.find(m => m.contractId === contractId && m.measurementId === activeMeasurementId && m.serviceId === serviceId) || {
      id: uuidv4(),
      contractId,
      measurementId: activeMeasurementId,
      serviceId,
      rows: []
    };
  }, [memories, contractId, activeMeasurementId, serviceId]);

  // Load the current memory into drafts if it hasn't been loaded yet
  useEffect(() => {
    if (isOpen && activeMeasurementId) {
      setDrafts(prev => {
        if (!prev[activeMeasurementId]) {
          return { ...prev, [activeMeasurementId]: currentMemory.rows };
        }
        return prev;
      });
    }
  }, [isOpen, activeMeasurementId, currentMemory.rows]);

  const activeDraftRows = drafts[activeMeasurementId] || currentMemory.rows;

  const previousMemoryRows = useMemo(() => {
    if (!serviceId || !currentMeasurement || !contractId) return [];
    const prevMeasurements = measurements.filter(m => m.contractId === contractId && m.number < currentMeasurement.number);
    const prevIds = prevMeasurements.map(m => m.id);
    
    const prevMemories = memories.filter(m => m.contractId === contractId && m.serviceId === serviceId && prevIds.includes(m.measurementId));
    
    return prevMemories.flatMap(m => {
      const pm = prevMeasurements.find(p => p.id === m.measurementId);
      const measurementName = pm ? pm.number.toString().padStart(2, '0') : '';
      return m.rows.map(r => ({ ...r, __measurementName: measurementName }));
    });
  }, [measurements, contractId, currentMeasurement, memories, serviceId]);

  const overlappingRowIds = useMemo(() => {
    if (!template) return [];

    const cols = template.columns;
    const initCol = cols.find(c => c.label.toLowerCase().includes('inicial') || c.label.toLowerCase().includes('início') || c.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes('inicio'));
    const finalCol = cols.find(c => c.label.toLowerCase().includes('final') || c.label.toLowerCase().includes('fim'));
    const sideCol = cols.find(c => c.label.toLowerCase().includes('lado'));

    if (!initCol || !finalCol) return [];

    const allRows = [...previousMemoryRows, ...activeDraftRows];

    const parseVal = (val: any) => {
      if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
      return parseFloat(val);
    };

    const normalizeSide = (val: any) => {
      if (!val) return 'default';
      return val.toString().trim().toLowerCase();
    };

    const allSides = new Set(allRows.map(r => normalizeSide(r.values[sideCol?.id || ''])));
    const overlappingIds = new Set<string>();

    allSides.forEach(side => {
      const intervals = allRows
        .filter(r => normalizeSide(r.values[sideCol?.id || '']) === side)
        .map(r => {
          const startStr = r.values[initCol.id];
          const endStr = r.values[finalCol.id];
          
          if (startStr === undefined || endStr === undefined || startStr === '' || endStr === '') {
             return { id: r.id, min: NaN, max: NaN, isCurrent: activeDraftRows.some(cr => cr.id === r.id) };
          }
          
          let start = parseVal(startStr);
          let end = parseVal(endStr);
          
          // Se for estaca em formato "10+5" (não comum mas possível) 
          if (isNaN(start) && typeof startStr === 'string' && startStr.includes('+')) {
              const parts = startStr.split('+');
              start = parseFloat(parts[0]) * 20 + parseFloat(parts[1]);
          }
          if (isNaN(end) && typeof endStr === 'string' && endStr.includes('+')) {
              const parts = endStr.split('+');
              end = parseFloat(parts[0]) * 20 + parseFloat(parts[1]);
          }
          
          return {
             id: r.id,
             min: Math.min(start, end),
             max: Math.max(start, end),
             isCurrent: activeDraftRows.some(cr => cr.id === r.id)
          };
        }).filter(r => !isNaN(r.min) && !isNaN(r.max));

      for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
          const a = intervals[i];
          const b = intervals[j];
          if (Math.max(a.min, b.min) < Math.min(a.max, b.max)) {
            if (a.isCurrent) overlappingIds.add(a.id);
            if (b.isCurrent) overlappingIds.add(b.id);
          }
        }
      }
    });

    return Array.from(overlappingIds);
  }, [activeDraftRows, previousMemoryRows, template]);

  const attemptClose = () => {
    if (overlappingRowIds.length > 0 && !isReadonly) {
      setShowOverlapWarning(true);
    } else {
      handleSaveAndClose();
    }
  };

  const handleSaveAndClose = () => {
    if (!isReadonly) {
      Object.keys(drafts).forEach(measId => {
        const mem = memories.find(m => m.contractId === contractId && m.measurementId === measId && m.serviceId === serviceId);
        const memId = mem ? mem.id : uuidv4();
        onUpdateMemory({
          id: memId,
          contractId: contractId!,
          measurementId: measId,
          serviceId,
          rows: drafts[measId]
        });
      });
    }
    onClose();
  };

  const totalCalculated = useMemo(() => {
    return activeDraftRows.reduce((acc, row) => {
      const medCol = template?.columns.find(c => c.isResult) || template?.columns.find(c => {
        const normalized = c.label.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized === 'medicao' || normalized === 'total' || normalized === 'resultado' || normalized === 'subtotal';
      });
      if (medCol) {
        const valStr = row.values[medCol.id]?.toString().replace(',', '.') || '0';
        const val = parseFloat(valStr);
        return acc + (isNaN(val) ? 0 : val);
      }
      return acc;
    }, 0);
  }, [activeDraftRows, template]);

  // Estatísticas do Serviço
  const stats = useMemo(() => {
    if (!service || !currentMeasurement) return null;
    
    const quotation = quotations.find(q => q.id === contract.quotationId);
    
    // Attempt to find quantity in contract's services or groups, otherwise fallback to quotation
    let budgetQty = 0;
    const searchServices = contract.services || quotation?.services || [];
    const searchGroups = contract.groups || quotation?.groups || [];
    
    const foundInServices = searchServices.find(s => s.serviceId === serviceId);
    if (foundInServices) {
      budgetQty = foundInServices.quantity;
    } else {
      for (const g of searchGroups) {
        const found = g.services.find(s => s.serviceId === serviceId);
        if (found) {
          budgetQty = found.quantity;
          break;
        }
      }
    }
    
    // Acumulado anterior (medições com número menor que a atual)
    const prevMeasurements = measurements.filter(m => m.contractId === contract.id && m.number < currentMeasurement.number);
    const prevAccumulated = prevMeasurements.reduce((acc, med) => {
      const item = med.items.find(i => i.serviceId === serviceId);
      return acc + (item?.quantity || 0)
    }, 0);
    
    const totalAccumulated = prevAccumulated + totalCalculated;
    const balance = budgetQty - totalAccumulated;
    
    return {
      budgetQty,
      prevAccumulated,
      currentQty: totalCalculated,
      totalAccumulated,
      balance
    };
  }, [service, currentMeasurement, measurements, totalCalculated, quotations, contract.quotationId, serviceId, contract.id]);

  const updateDraftState = (newRows: MemoryRow[]) => {
    setDrafts(prev => ({
      ...prev,
      [activeMeasurementId]: newRows
    }));
  };

  const addRow = () => {
    const newRow: MemoryRow = { id: uuidv4(), values: {} };
    updateDraftState([...activeDraftRows, newRow]);
  };

  const deleteRow = (id: string) => {
    if (isReadonly) return;
    updateDraftState(activeDraftRows.filter(r => r.id !== id));
  };

  const updateCellValue = (rowId: string, columnId: string, value: any) => {
    if (isReadonly) return;
    // Garantir que vírgulas sejam tratadas como pontos para cálculos
    const normalizedValue = typeof value === 'string' ? value.replace(',', '.') : value;
    
    const updatedRows = activeDraftRows.map(r => {
      if (r.id === rowId) {
        const newValues = { ...r.values, [columnId]: normalizedValue };
        
        // Se a coluna não for calculada, recalculamos todas as calculadas desta linha
        if (template) {
          template.columns.forEach(col => {
            if (col.type === 'calculated' && col.formula) {
              newValues[col.id] = evaluateFormula(col.formula, newValues, template);
            }
          });
        }
        
        return { ...r, values: newValues };
      }
      return r;
    });
    updateDraftState(updatedRows);
  };

  const evaluateFormula = (formula: string, values: Record<string, any>, template: MeasurementTemplate) => {
    try {
      let expr = formula;
      // Ordenar colunas pelo comprimento do label (descendente) para evitar substituições parciais
      // Ex: Substituir "Frac. F" antes de substituir "Frac"
      const sortedCols = [...template.columns]
        .sort((a, b) => b.label.length - a.label.length);

      sortedCols.forEach(col => {
        const rawVal = values[col.id];
        const val = typeof rawVal === 'string' ? parseFloat(rawVal.replace(',', '.')) : parseFloat(rawVal);
        const finalVal = isNaN(val) ? 0 : val;
        
        // Escapar caracteres especiais para o REGEX e permitir espaços opcionais
        const escapedLabel = col.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
          
          /**
           * Estratégia de substituição:
           * Queremos substituir o label exato apenas se ele NÃO estiver cercado por outros caracteres alfanuméricos.
           * Como JS suporta Lookbehind (?<!) e Lookahead (?!) em ambientes modernos.
           * Adicionamos a flag 'i' para ser insensível a maiúsculas/minúsculas na fórmula.
           */
          const regex = new RegExp(`(?<![a-zA-Z0-9_.])${escapedLabel}(?![a-zA-Z0-9_.])`, 'gi');
          expr = expr.replace(regex, finalVal.toString());
        });

      // Limpeza simples para segurança (remover caracteres perigosos, mas permitir operadores e números)
      const sanitizedExpr = expr.replace(/[^\d\s+\-*/().,]/g, '');
      
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${sanitizedExpr.replace(/,/g, '.')})`)();
    } catch (e) {
      console.error("Erro na fórmula:", e);
      return 0;
    }
  };


  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && attemptClose()}>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col p-6">
        {showOverlapWarning && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 rounded-lg border border-red-100 shadow-2xl">
              <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-red-100 text-center space-y-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Sobreposição Detectada</h3>
                      <p className="text-sm text-gray-500">Existem trechos com estacas se sobrepondo ou em duplicidade (destacados em vermelho).</p>
                      <p className="text-sm text-gray-500 mt-2">Deseja concluir a memória mesmo assim?</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                      <Button variant="outline" className="flex-1" onClick={() => setShowOverlapWarning(false)}>Revisar</Button>
                      <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => { setShowOverlapWarning(false); onClose(); }}>Concluir Mesmo Assim</Button>
                  </div>
              </div>
          </div>
        )}
        <DialogHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center w-full min-h-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shrink-0">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm md:text-base">Memória de Cálculo: {service.name}</DialogTitle>
                <DialogDescription className="text-[10px] md:text-xs">
                  Unidade: {service.unit} | Template: {template?.name || 'Padrão'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Medição:</Label>
              <Select value={activeMeasurementId} onValueChange={setActiveMeasurementId}>
                <SelectTrigger className="w-[180px] h-8 text-xs font-bold">
                  <SelectValue placeholder="Selecione a medição">
                    {activeMeasurementId && measurements.find(m => m.id === activeMeasurementId) 
                      ? (() => {
                          const m = measurements.find(x => x.id === activeMeasurementId);
                          return `Medição ${m?.number.toString().padStart(2, '0')} - ${m?.period}`;
                        })()
                      : "Selecione a medição"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {measurements
                    .filter(m => m.contractId === contract.id)
                    .sort((a, b) => b.number - a.number)
                    .map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        Medição {m.number.toString().padStart(2, '0')} - {m.period}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

      {!template ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h4 className="text-lg font-bold">Template não encontrado</h4>
            <p className="max-w-md text-gray-500 mb-6">
              Vá em <b>Configurações &gt; Templates de Medição</b> e crie um template para a unidade <b>"{service.unit}"</b> para usar a memória detalhada.
            </p>
            <Button onClick={onClose} variant="outline">Voltar</Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Limit for validation */}
            {(() => {
              const unitLimit = parseFloat(contract.measurementUnitValue?.replace(',', '.') || '0');
              
              return (
                <>
                    <div className="flex flex-wrap gap-4 justify-between items-center py-4">
                      <div className="flex items-center gap-6">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Registros de Medição</span>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="show-previous" 
                            checked={showPrevious} 
                            onCheckedChange={(c) => setShowPrevious(!!c)} 
                          />
                          <label 
                            htmlFor="show-previous" 
                            className="text-[10px] md:text-xs font-medium text-gray-500 cursor-pointer select-none whitespace-nowrap"
                          >
                            Mostrar medições anteriores
                          </label>
                        </div>
                      </div>
                      {!isReadonly && (
                        <Button onClick={addRow} size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0">
                          <Plus className="w-4 h-4 mr-2" /> Nova Linha
                        </Button>
                      )}
                    </div>

                  <ScrollArea className="flex-1 border rounded-xl overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          {template.columns.map(col => (
                            <TableHead key={col.id} className="text-[10px] font-bold text-gray-500 uppercase px-2">
                              {col.label}
                            </TableHead>
                          ))}
                          {!isReadonly && <TableHead className="w-10 px-2"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {showPrevious && previousMemoryRows.map((row, idx) => (
                          <TableRow key={`prev-${row.id}-${idx}`} className="bg-gray-50/50 hover:bg-gray-50/80">
                            {template.columns.map((col, colIdx) => (
                              <TableCell key={col.id} className="p-2 opacity-60">
                                {colIdx === 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                      M#{row.__measurementName}
                                    </span>
                                    <span className="text-xs font-medium text-gray-600">{row.values[col.id] || '-'}</span>
                                  </div>
                                ) : col.type === 'calculated' ? (
                                  <div className="h-8 px-2 flex items-center bg-gray-100/50 rounded text-xs font-mono font-bold text-gray-500">
                                    {formatNumber(row.values[col.id] || 0, 3)}
                                  </div>
                                ) : (
                                  <div className="h-8 px-2 flex items-center bg-transparent border-transparent text-xs font-medium text-gray-500">
                                    {row.values[col.id] || '-'}
                                  </div>
                                )}
                              </TableCell>
                            ))}
                            {!isReadonly && <TableCell className="w-10 px-2" />}
                          </TableRow>
                        ))}
                        {activeDraftRows.map(row => {
                          const isOverlapping = overlappingRowIds.includes(row.id);
                          return (
                          <TableRow key={row.id} className={cn(isOverlapping && "bg-red-50/80")}>
                            {template.columns.map(col => (
                              <TableCell key={col.id} className="p-2">
                                {col.type === 'calculated' ? (
                                  <div className={cn(
                                    "h-9 px-3 flex items-center rounded-lg text-xs font-mono font-bold",
                                    isOverlapping ? "bg-red-100/50 text-red-700" : "bg-gray-50 text-blue-600"
                                  )}>
                                    {formatNumber(row.values[col.id] || 0, 3)}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <Input 
                                      type={col.type === 'number' ? 'number' : 'text'}
                                      className={cn(
                                        "h-9 text-xs font-medium",
                                        isOverlapping && "border-red-300 bg-red-50 text-red-900 focus-visible:border-red-500 focus-visible:ring-red-500",
                                        (col.label.toLowerCase().includes('frac') && 
                                          unitLimit > 0 && 
                                          (parseFloat(row.values[col.id]?.toString().replace(',', '.') || '0') >= unitLimit)) && "border-red-500 bg-red-50 text-red-600 focus-visible:ring-red-500"
                                      )}
                                      value={row.values[col.id] ?? ''}
                                      onChange={e => updateCellValue(row.id, col.id, e.target.value)}
                                      readOnly={isReadonly}
                                      step={col.type === 'number' ? "0.001" : undefined}
                                    />
                                    {(col.label.toLowerCase().includes('frac') && 
                                      unitLimit > 0 && 
                                      (parseFloat(row.values[col.id]?.toString().replace(',', '.') || '0') >= unitLimit)) && (
                                        <p className="text-[9px] text-red-500 font-bold px-1">
                                          Máx: {(unitLimit - 0.01).toFixed(2).replace('.', ',')}
                                        </p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            ))}
                            {!isReadonly && (
                              <TableCell className="p-2">
                                <Button variant="ghost" size="icon" onClick={() => deleteRow(row.id)} className="h-8 w-8 text-gray-300 hover:text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        )})}
                        {activeDraftRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={template.columns.length + (isReadonly ? 0 : 1)} className="text-center py-12 text-gray-400 italic">
                              Nenhuma linha adicionada. Clique em "Nova Linha" para começar.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              );
            })()}

            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                 <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                   <p className="text-gray-400 uppercase font-bold text-[9px] tracking-wider">Ant. Acumulado</p>
                   <p className="text-sm font-mono font-bold text-gray-600">{formatNumber(stats?.prevAccumulated || 0, 3)}</p>
                 </div>
                 <div className="space-y-1 p-3 bg-blue-50 rounded-lg border border-blue-100">
                   <p className="text-blue-400 uppercase font-bold text-[9px] tracking-wider">Medição Atual</p>
                   <p className="text-sm font-mono font-bold text-blue-700">{formatNumber(stats?.currentQty || 0, 3)}</p>
                 </div>
                 <div className="space-y-1 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                   <p className="text-indigo-400 uppercase font-bold text-[9px] tracking-wider">Total Acumulado</p>
                   <p className="text-sm font-mono font-bold text-indigo-700">{formatNumber(stats?.totalAccumulated || 0, 3)}</p>
                 </div>
                 <div className="space-y-1 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                   <p className="text-emerald-400 uppercase font-bold text-[9px] tracking-wider">Saldo do Serviço</p>
                   <p className="text-sm font-mono font-bold text-emerald-700">{formatNumber(stats?.balance || 0, 3)}</p>
                 </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                 <div className="text-xs text-gray-400">
                   Quantidade Contratada: <span className="font-bold text-gray-600">{formatNumber(stats?.budgetQty || 0, 3)} {service.unit}</span>
                 </div>
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={attemptClose} className="h-10 px-8">Concluir</Button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Mock icon for alert
function MeasureSelectionView({ 
  measureType, onSetType, serviceCodeInput, onSetServiceCode, onOpenMemory, contract, measurement, measurements, services, onAddMeasurement, onUpdateMeasurement,
  highwayLocations, onUpdateHighwayLocation, onDeleteHighwayLocation,
  stationGroups, onUpdateStationGroup, onDeleteStationGroup,
  cubationData, onUpdateCubationData,
  transportData, onUpdateTransportData,
  resources
}: { 
  measureType: 'services' | 'cubacao' | 'transport' | 'locations' | 'station-groups' | null, 
  onSetType: (t: any) => void, 
  serviceCodeInput: string, 
  onSetServiceCode: (v: string) => void, 
  onOpenMemory: (code: string) => void,
  contract: Contract,
  measurement: Measurement | undefined,
  measurements: Measurement[],
  services: ServiceComposition[],
  onAddMeasurement: any,
  onUpdateMeasurement: (m: Measurement) => void,
  highwayLocations: HighwayLocation[],
  onUpdateHighwayLocation: (l: HighwayLocation) => void,
  onDeleteHighwayLocation: (id: string) => void,
  stationGroups: StationGroup[],
  onUpdateStationGroup: (g: StationGroup) => void,
  onDeleteStationGroup: (id: string) => void,
  cubationData: CubationData[],
  onUpdateCubationData: (d: CubationData) => void,
  transportData: TransportData[],
  onUpdateTransportData: (d: TransportData) => void,
  resources: Resource[]
}) {
  const [isNewMedOpen, setIsNewMedOpen] = useState(false);
  const [newMedData, setNewMedData] = useState({ period: '', date: new Date().toISOString().split('T')[0] });

  const isClosed = measurement?.status === 'closed';

  if (!measurement || isClosed) {
    const nextNumber = measurements.length > 0 ? Math.max(...measurements.map(m => m.number)) + 1 : 1;
    
    return (
      <Card className="border-[10px] border-gray-100 shadow-sm py-12 flex flex-col items-center justify-center text-center p-8">
        <div className={cn("p-4 rounded-full mb-4", isClosed ? "bg-amber-100" : "bg-blue-100")}>
           {isClosed ? <Lock className="w-8 h-8 text-amber-600" /> : <Calculator className="w-8 h-8 text-blue-600" />}
        </div>
        <h3 className="text-lg font-bold mb-2">
          {isClosed ? `Medição ${measurement.number.toString().padStart(2, '0')} Encerrada` : "Nenhuma medição ativa"}
        </h3>
        <p className="text-gray-500 mb-6 max-w-sm">
          {isClosed 
            ? `O período de ${measurement.period} está encerrado. Crie uma nova medição para continuar lançando serviços.` 
            : "Para começar a medir serviços, você precisa criar a primeira medição deste contrato."
          }
        </p>
        
        <Dialog open={isNewMedOpen} onOpenChange={setIsNewMedOpen}>
          <DialogTrigger asChild>
             <Button className="bg-blue-600">
               {isClosed ? "Abrir Próxima Medição" : "Criar Primeira Medição"}
             </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Abrir Medição {nextNumber.toString().padStart(2, '0')}</DialogTitle>
              <DialogDescription>
                {isClosed ? "Inicie um novo período de medição." : "Inicie o ciclo de medições para este contrato."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Período (Mês/Ano)</Label>
                <Input placeholder="Ex: Abril/2026" value={newMedData.period || ''} onChange={e => setNewMedData({...newMedData, period: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={newMedData.date || ''} onChange={e => setNewMedData({...newMedData, date: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                if (!newMedData.period) return;
                onAddMeasurement({
                  contractId: contract.id,
                  number: nextNumber,
                  period: newMedData.period,
                  date: newMedData.date,
                  items: []
                });
                setIsNewMedOpen(false);
                setNewMedData({ period: '', date: new Date().toISOString().split('T')[0] });
              }}>Abrir Medição</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  if (measureType === 'locations') {
    return (
      <HighwayLocationsView 
        contract={contract}
        locations={highwayLocations.filter(l => l.contractId === contract.id)}
        onUpdate={onUpdateHighwayLocation}
        onDelete={onDeleteHighwayLocation}
        onBack={() => onSetType(null)}
        resources={resources}
      />
    );
  }

  if (measureType === 'station-groups') {
    return (
      <StationGroupsView 
        contract={contract}
        groups={stationGroups.filter(g => g.contractId === contract.id)}
        onUpdate={onUpdateStationGroup}
        onDelete={onDeleteStationGroup}
        onBack={() => onSetType(null)}
        resources={resources}
        services={services}
      />
    );
  }

  if (measureType === 'cubacao') {
    return (
      <CubationView 
        contract={contract}
        measurement={measurement}
        stationGroups={stationGroups.filter(g => g.contractId === contract.id)}
        cubationData={cubationData}
        onUpdateCubationData={onUpdateCubationData}
        onBack={() => onSetType(null)}
        services={services}
        allMeasurements={measurements}
      />
    );
  }

  if (measureType === 'transport') {
    return (
      <TransportView 
        contract={contract}
        measurement={measurement}
        locations={highwayLocations.filter(l => l.contractId === contract.id)}
        transportData={transportData}
        onUpdateTransportData={onUpdateTransportData}
        onBack={() => onSetType(null)}
        services={services}
        allMeasurements={measurements}
        resources={resources}
        onUpdateMeasurement={onUpdateMeasurement}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="min-w-[200px]">
          <h3 className="text-xl font-bold">Lançamento de Medições</h3>
          <p className="text-sm text-gray-500">Contrato: {contract.contractNumber} | Medição Ativa: {measurement?.period || 'Nenhuma'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" size="sm" onClick={() => onSetType('locations')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
             <Landmark className="w-4 h-4 mr-2" /> Locais
           </Button>
           <Button variant="outline" size="sm" onClick={() => onSetType('station-groups')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
             <Layers className="w-4 h-4 mr-2" /> Grupos de Estacas
           </Button>
        </div>
      </div>

      {!measureType ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MeasureTypeCard 
             title="Medição de Serviços" 
             description="Lance medições detalhadas usando memórias de cálculo." 
             icon={<ClipboardList className="w-8 h-8" />} 
             onClick={() => onSetType('services')}
          />
          <MeasureTypeCard 
             title="Cubação" 
             description="Medição por volume e cubagem de materiais." 
             icon={<Layers className="w-8 h-8" />} 
             onClick={() => onSetType('cubacao')}
          />
          <MeasureTypeCard 
             title="Transportes" 
             description="Medição de DMT e transporte de materiais." 
             icon={<Truck className="w-8 h-8" />} 
             onClick={() => onSetType('transport')}
          />
        </div>
      ) : measureType === 'services' ? (
        <Card className="border-[10px] border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle>Medição de Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-end max-w-md">
              <div className="flex-1 space-y-2">
                <Label>Código do Serviço</Label>
                <Input 
                   placeholder="Ex: 01.01.001" 
                   value={serviceCodeInput} 
                   onChange={e => onSetServiceCode(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && onOpenMemory(serviceCodeInput)}
                />
              </div>
              <Button onClick={() => onOpenMemory(serviceCodeInput)} className="bg-blue-600">
                 Abrir Planilha
              </Button>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Pesquisa Rápida</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {services
                  .filter(s => {
                    const term = serviceCodeInput.toLowerCase().trim();
                    return !term || s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term);
                  })
                  .slice(0, serviceCodeInput ? 12 : 6)
                  .map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => { onSetServiceCode(s.code); onOpenMemory(s.code); }}
                    className="flex text-left p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-blue-600">{s.code}</p>
                      <p className="text-xs font-semibold text-gray-700 truncate">{s.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <Separator />
          <div className="p-4 flex justify-start">
             <Button variant="ghost" onClick={() => onSetType(null)} className="text-gray-500 text-xs">← Voltar para seleção</Button>
          </div>
        </Card>
      ) : (
        <Card className="border-[10px] border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center">
            <Calculator className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-400">Funcionalidade de {measureType} em desenvolvimento.</p>
            <Button variant="ghost" onClick={() => onSetType(null)} className="mt-4">Voltar</Button>
        </Card>
      )}
    </motion.div>
  );
}

function MeasureTypeCard({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col gap-4 group">
       <div className="bg-blue-50 p-4 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors w-fit">
          {icon}
       </div>
       <div>
         <h4 className="text-lg font-bold text-gray-900">{title}</h4>
         <p className="text-sm text-gray-500">{description}</p>
       </div>
    </button>
  );
}

function CubationView({ contract, measurement, stationGroups, cubationData, onUpdateCubationData, onBack, services, allMeasurements }: {
  contract: Contract, 
  measurement: Measurement | undefined, 
  stationGroups: StationGroup[], 
  cubationData: CubationData[], 
  onUpdateCubationData: (d: CubationData) => void,
  onBack: () => void,
  services: ServiceComposition[],
  allMeasurements: Measurement[]
}) {
  const [browsingMeasurementId, setBrowsingMeasurementId] = useState<string>(measurement?.id || '');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [localCubation, setLocalCubation] = useState<CubationData | null>(null);

  // Sync browsingMeasurementId if measurement changes (e.g. on mount)
  useEffect(() => {
    if (measurement && !browsingMeasurementId) {
      setBrowsingMeasurementId(measurement.id);
    }
  }, [measurement]);

  useEffect(() => {
    if (!browsingMeasurementId || !selectedGroupId) {
      setLocalCubation(null);
      return;
    }
    const found = cubationData.find(d => d.measurementId === browsingMeasurementId && d.stationGroupId === selectedGroupId);
    if (found) {
      setLocalCubation(JSON.parse(JSON.stringify(found)));
    } else {
      setLocalCubation({
        id: uuidv4(),
        contractId: contract.id,
        measurementId: browsingMeasurementId,
        stationGroupId: selectedGroupId,
        serviceId: stationGroups.find(g => g.id === selectedGroupId)?.serviceId || '',
        rows: []
      } as CubationData);
    }
  }, [browsingMeasurementId, selectedGroupId, cubationData, contract.id, stationGroups]);

  const isBrowsingCurrent = browsingMeasurementId === measurement?.id;
  const browsingMeasurement = allMeasurements.find(m => m.id === browsingMeasurementId);

  // List of IDs that HAVE cubation data for the browsing period
  const measuredGroupIds = useMemo(() => {
    return cubationData
      .filter(d => d.measurementId === browsingMeasurementId && d.rows.length > 0)
      .map(d => d.stationGroupId);
  }, [cubationData, browsingMeasurementId]);

  const addRow = () => {
    if (!localCubation) return;
    const newRow: CubationRow = {
      id: uuidv4(),
      estaca: '',
      frac: 0,
      acFc: '',
      area: 0,
      somaAreas: 0,
      semiDistancia: 0,
      volume: 0,
      observacao: ''
    };
    setLocalCubation({
      ...localCubation,
      rows: [...localCubation.rows, newRow]
    });
  };

  const updateRow = (rowId: string, field: keyof CubationRow, value: any) => {
    if (!localCubation) return;
    const newRows = localCubation.rows.map((row, idx) => {
      if (row.id !== rowId) return row;
      
      const updatedRow = { ...row, [field]: value };
      
      // Recalculate based on previous row
      if (idx > 0) {
        const prevRow = localCubation.rows[idx - 1];
        
        // Soma das Áreas
        const somaAreas = (parseFloat(updatedRow.area.toString()) || 0) + (parseFloat(prevRow.area.toString()) || 0);
        updatedRow.somaAreas = somaAreas;
        
        // Semi-Distancia Calculation (Approximate based on stations)
        const parseStation = (s: string, f: number) => {
          const parts = (s || '0+0').split('+');
          const km = parseInt(parts[0]) || 0;
          return (km * 20) + (parseFloat(f.toString()) || 0);
        };
        
        const currentDist = parseStation(updatedRow.estaca, updatedRow.frac);
        const prevDist = parseStation(prevRow.estaca, prevRow.frac);
        const dist = Math.abs(currentDist - prevDist);
        updatedRow.semiDistancia = dist / 2;
        
        // Volume
        updatedRow.volume = updatedRow.somaAreas * updatedRow.semiDistancia;
      } else {
        updatedRow.somaAreas = 0;
        updatedRow.semiDistancia = 0;
        updatedRow.volume = 0;
      }
      
      return updatedRow;
    });

    setLocalCubation({ ...localCubation, rows: newRows });
  };

  const deleteRow = (id: string) => {
    if (!localCubation) return;
    setLocalCubation({
      ...localCubation,
      rows: localCubation.rows.filter(r => r.id !== id)
    });
  };

  const handleSave = () => {
    if (!localCubation) return;
    onUpdateCubationData(localCubation);
    alert('Cubação salva com sucesso!');
  };

  const totalVolume = localCubation?.rows.reduce((sum, r) => sum + r.volume, 0) || 0;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4 min-w-[250px]">
          <Button variant="ghost" onClick={onBack} size="icon"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
          <div>
            <h3 className="text-xl font-bold">Planilha de Cubação</h3>
            <p className="text-sm text-gray-500">
              {browsingMeasurementId === measurement?.id 
                ? "Medição Ativa" 
                : browsingMeasurement 
                  ? `Visualizando: Medição ${browsingMeasurement.number.toString().padStart(2, '0')} - ${browsingMeasurement.period}`
                  : "Medição não selecionada"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           {!selectedGroupId && (
             <div className="flex items-center gap-2 pr-4 lg:border-r">
                <Label className="text-[10px] font-bold text-gray-400 uppercase">Período:</Label>
                <Select value={browsingMeasurementId} onValueChange={(v) => { setBrowsingMeasurementId(v); setSelectedGroupId(''); }}>
                   <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Selecione a medição">
                        {browsingMeasurementId && allMeasurements.find(m => m.id === browsingMeasurementId)
                          ? (() => {
                              const m = allMeasurements.find(x => x.id === browsingMeasurementId);
                              return `Medição ${m?.number.toString().padStart(2, '0')} - ${m?.period}`;
                            })()
                          : "Selecione a medição"}
                      </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                      {allMeasurements
                        .filter(m => m.contractId === contract.id)
                        .sort((a, b) => b.number - a.number)
                        .map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            Medição {m.number.toString().padStart(2, '0')} - {m.period}
                          </SelectItem>
                        ))
                      }
                   </SelectContent>
                </Select>
             </div>
           )}

           <div className="flex items-center gap-2">
             <Label className="text-[10px] font-bold text-gray-400 uppercase">Grupo:</Label>
             <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                   <SelectValue placeholder="Selecione o grupo..." />
                </SelectTrigger>
                <SelectContent>
                   {stationGroups.map(g => (
                     <SelectItem key={g.id} value={g.id}>
                        {g.name}
                     </SelectItem>
                   ))}
                </SelectContent>
             </Select>
           </div>
           {selectedGroupId && isBrowsingCurrent && measurement?.status !== 'closed' && (
             <div className="flex gap-2">
               <Button onClick={addRow} variant="outline" size="sm" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-8">
                 <Plus className="w-4 h-4 mr-2" /> Adicionar Estaca
               </Button>
               <Button onClick={handleSave} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8">
                 <Save className="w-4 h-4 mr-2" /> Salvar
               </Button>
             </div>
           )}
           {selectedGroupId && !isBrowsingCurrent && (
             <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Visualização Histórica (Leitura)
             </div>
           )}
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
           <Card className="col-span-1 border-[10px] border-gray-100 font-sans shadow-sm flex flex-col overflow-hidden bg-gray-50/50 min-h-[300px]">
             <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grupos Medidos {isBrowsingCurrent ? "neste período" : ""}</h4>
                <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                   {measuredGroupIds.length}
                </div>
             </div>
             <ScrollArea className="flex-1 p-4">
                <div className="space-y-2 pb-4">
                   {measuredGroupIds.length === 0 ? (
                      <div className="py-12 text-center">
                         <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                         <p className="text-xs text-gray-400">Nenhum grupo medido neste período.</p>
                      </div>
                   ) : (
                      stationGroups
                        .filter(g => measuredGroupIds.includes(g.id))
                        .map(g => {
                           const cub = cubationData.find(d => d.measurementId === browsingMeasurementId && d.stationGroupId === g.id);
                           const vol = cub?.rows.reduce((sum, r) => sum + r.volume, 0) || 0;
                           return (
                             <button 
                                key={g.id}
                                onClick={() => setSelectedGroupId(g.id)}
                                className="w-full text-left p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
                             >
                                <div className="flex justify-between items-start mb-1">
                                   <p className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{g.name}</p>
                                   <p className="text-[10px] font-black text-emerald-600">{formatNumber(vol, 2)} m³</p>
                                </div>
                                <p className="text-[10px] text-gray-400">Estaca: {g.initialStation || 'N/A'} → {g.finalStation || 'N/A'}</p>
                             </button>
                           );
                        })
                   )}
                </div>
             </ScrollArea>
           </Card>

           <Card className="col-span-1 lg:col-span-2 border-[10px] border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center bg-white border-dashed min-h-[300px]">
              <Layers className="w-16 h-16 text-gray-100 mb-4" />
              <h4 className="text-lg font-bold text-gray-400 select-none">Selecione um grupo para detalhamento</h4>
              <p className="text-sm text-gray-300 max-w-xs text-center select-none">Escolha um item na lista ao lado ou na seleção acima para visualizar a planilha de cubação.</p>
           </Card>
        </div>
      ) : (
        <Card className="border-[10px] border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 bg-white min-h-0">
          <ScrollArea className="flex-1">
            <div className="min-w-[1200px]">
              <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-24 text-[10px] font-bold uppercase">Estaca</TableHead>
                  <TableHead className="w-20 text-[10px] font-bold uppercase text-center">Frac</TableHead>
                  <TableHead className="w-24 text-[10px] font-bold uppercase">AC / FC</TableHead>
                  <TableHead className="w-24 text-[10px] font-bold uppercase text-right">Área (m²)</TableHead>
                  <TableHead className="w-32 text-[10px] font-bold uppercase text-right">Soma Áreas</TableHead>
                  <TableHead className="w-32 text-[10px] font-bold uppercase text-right">Semi-Dist.</TableHead>
                  <TableHead className="w-32 text-[10px] font-bold uppercase text-right">Volume (m³)</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Observação</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localCubation?.rows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input 
                        value={row.estaca || ''} 
                        onChange={e => updateRow(row.id, 'estaca', e.target.value)} 
                        className="h-8 text-xs font-mono" 
                        placeholder="0+0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={row.frac ?? ''} 
                        onChange={e => updateRow(row.id, 'frac', e.target.value)} 
                        className="h-8 text-xs text-center font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={row.acFc} onValueChange={v => updateRow(row.id, 'acFc', v)}>
                         <SelectTrigger className="h-8 text-xs font-bold">
                            <SelectValue placeholder="-" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="NO_VALUE">Selecione...</SelectItem>
                            <SelectItem value="AC">Área Corte</SelectItem>
                            <SelectItem value="FC">Área Final</SelectItem>
                         </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="0.001" 
                        value={row.area ?? ''} 
                        onChange={e => updateRow(row.id, 'area', e.target.value)} 
                        className="h-8 text-xs text-right font-mono text-blue-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="h-8 flex items-center justify-end px-3 bg-gray-50 rounded text-xs font-mono font-bold text-gray-500">
                        {formatNumber(row.somaAreas, 3)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 flex items-center justify-end px-3 bg-gray-50 rounded text-xs font-mono font-bold text-gray-500">
                        {formatNumber(row.semiDistancia, 2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 flex items-center justify-end px-3 bg-emerald-50 rounded text-xs font-mono font-bold text-emerald-700">
                        {formatNumber(row.volume, 3)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={row.observacao || ''} 
                        onChange={e => updateRow(row.id, 'observacao', e.target.value)} 
                        className="h-8 text-xs" 
                      />
                    </TableCell>
                    <TableCell>
                       <Button variant="ghost" size="icon" onClick={() => deleteRow(row.id)} className="h-8 w-8 text-gray-300 hover:text-red-500">
                         <Trash2 className="w-3.5 h-3.5" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          <div className="bg-gray-50 p-4 border-t flex flex-wrap gap-4 justify-between items-center shrink-0">
             <div className="flex gap-8">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Serviço Vinculado</p>
                   <p className="text-sm font-bold text-gray-700">
                     {(() => {
                        const sId = stationGroups.find(g => g.id === selectedGroupId)?.serviceId;
                        const s = services.find(x => x.id === sId);
                        return s ? `${s.code} - ${s.name}` : 'Não vinculado';
                     })()}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total de Estacas</p>
                   <p className="text-sm font-bold text-gray-700">{localCubation?.rows.length || 0}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Volume Total da Cubação</p>
                <p className="text-2xl font-mono font-bold text-emerald-700">{formatNumber(totalVolume, 3)} m³</p>
             </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function HighwayLocationsView({ contract, locations, onUpdate, onDelete, onBack, resources }: { 
  contract: Contract, locations: HighwayLocation[], onUpdate: (l: HighwayLocation) => void, onDelete: (id: string) => void, onBack: () => void, resources: Resource[]
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<HighwayLocation | null>(null);
  const [formData, setFormData] = useState<Omit<HighwayLocation, 'id' | 'contractId'>>({
    name: '',
    materialIds: [],
    referenceStation: '',
    lateralDistance: 0,
    city: ''
  });
  const [searchMaterial, setSearchMaterial] = useState('');

  const filteredMaterials = useMemo(() => {
    const materials = resources.filter(r => r.type === 'material');
    if (!searchMaterial) return materials;
    return materials.filter(m => 
      m.name.toLowerCase().includes(searchMaterial.toLowerCase()) || 
      m.code.toLowerCase().includes(searchMaterial.toLowerCase())
    );
  }, [resources, searchMaterial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLoc) {
      onUpdate({ ...editingLoc, ...formData });
    } else {
      onUpdate({ ...formData, id: uuidv4(), contractId: contract.id } as HighwayLocation);
    }
    setIsAddOpen(false);
    setEditingLoc(null);
    setFormData({ name: '', materialIds: [], referenceStation: '', lateralDistance: 0, city: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} size="icon"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
          <div>
            <h3 className="text-xl font-bold">Cadastro de Locais</h3>
            <p className="text-sm text-gray-500">Defina os pontos geográficos de extração ou depósito.</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingLoc(null); setFormData({ name: '', materialIds: [], referenceStation: '', lateralDistance: 0, city: '' }); setSearchMaterial(''); }} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Novo Local
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingLoc ? 'Editar Local' : 'Novo Local'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label>Nome do Local</Label>
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Materiais (Composições de Insumo)
                    <span className="text-[10px] text-gray-400 font-normal">Selecione para adicionar</span>
                  </Label>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Pesquisar material..." 
                      className="pl-9 h-9 text-sm"
                      value={searchMaterial}
                      onChange={e => setSearchMaterial(e.target.value)}
                    />
                  </div>

                  <ScrollArea className="h-[150px] border rounded-lg p-2 bg-gray-50/30">
                    <div className="space-y-1">
                      {filteredMaterials.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (!formData.materialIds.includes(m.id)) {
                              setFormData({...formData, materialIds: [...formData.materialIds, m.id]});
                            } else {
                              setFormData({...formData, materialIds: formData.materialIds.filter(id => id !== m.id)});
                            }
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                            formData.materialIds.includes(m.id) 
                              ? "bg-blue-100 text-blue-700 font-bold border border-blue-200" 
                              : "hover:bg-gray-100 text-gray-600 border border-transparent"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span>{m.name}</span>
                            <span className="text-[10px] text-gray-400">{m.code}</span>
                          </div>
                        </button>
                      ))}
                      {filteredMaterials.length === 0 && (
                        <p className="text-center py-4 text-xs text-gray-400 italic">Nenhum material encontrado.</p>
                      )}
                    </div>
                  </ScrollArea>

                  {formData.materialIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                       {formData.materialIds.map(id => (
                         <div key={id} className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-[10px] flex items-center gap-2">
                           <span className="truncate max-w-[150px]">{resources.find(r => r.id === id)?.name}</span>
                           <button type="button" onClick={() => setFormData({...formData, materialIds: formData.materialIds.filter(x => x !== id)})} className="text-blue-500 hover:text-red-500">×</button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estaca Ref.</Label>
                    <Input placeholder="Ex: 100+0,00" value={formData.referenceStation} onChange={e => setFormData({...formData, referenceStation: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dist. Lateral (m)</Label>
                    <Input type="number" step="0.01" value={formData.lateralDistance} onChange={e => setFormData({...formData, lateralDistance: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="bg-gray-50 p-4 -mx-6 -mb-6 border-t">
                <Button type="submit" className="w-full">Salvar Local</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <Card key={loc.id} className="border-[10px] border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Landmark className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingLoc(loc); setFormData(loc); setIsAddOpen(true); }} className="h-8 w-8 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(loc.id)} className="h-8 w-8 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-1">{loc.name}</h4>
              <p className="text-xs text-gray-500 mb-4">{loc.city || 'Sem município'}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Estaca Ref.</span>
                   <span className="font-bold">{loc.referenceStation || '-'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Dist. Lateral</span>
                   <span className="font-bold">{loc.lateralDistance} m</span>
                </div>
                <div className="mt-3">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Materiais</p>
                   <div className="flex flex-wrap gap-1">
                     {loc.materialIds.map(id => (
                       <span key={id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px]">
                         {resources.find(r => r.id === id)?.name}
                       </span>
                     ))}
                     {loc.materialIds.length === 0 && <span className="text-gray-300 text-[10px] italic">Nenhum material vinculado</span>}
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function StationGroupsView({ contract, groups, onUpdate, onDelete, onBack, resources, services }: { 
  contract: Contract, groups: StationGroup[], onUpdate: (g: StationGroup) => void, onDelete: (id: string) => void, onBack: () => void, resources: Resource[], services: ServiceComposition[]
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StationGroup | null>(null);
  const [formData, setFormData] = useState<Omit<StationGroup, 'id' | 'contractId'>>({
    name: '',
    initialStation: '',
    finalStation: '',
    materialIds: [],
    volume: 0,
    serviceId: ''
  });
  const [searchMaterial, setSearchMaterial] = useState('');
  const [searchService, setSearchService] = useState('');

  const filteredMaterials = useMemo(() => {
    const materials = resources.filter(r => r.type === 'material');
    if (!searchMaterial) return materials;
    return materials.filter(m => 
      m.name.toLowerCase().includes(searchMaterial.toLowerCase()) || 
      m.code.toLowerCase().includes(searchMaterial.toLowerCase())
    );
  }, [resources, searchMaterial]);

  const contractServices = useMemo(() => {
    return (contract.services || []).map(cs => {
      const s = services.find(serv => serv.id === cs.serviceId) || services.find(serv => serv.code === (cs as any).code);
      return { ...cs, name: s?.name, code: s?.code };
    });
  }, [contract.services, services]);

  const filteredServices = useMemo(() => {
    if (!searchService) return contractServices;
    return contractServices.filter(s => 
      s.name?.toLowerCase().includes(searchService.toLowerCase()) || 
      s.code?.toLowerCase().includes(searchService.toLowerCase())
    );
  }, [contractServices, searchService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      onUpdate({ ...editingGroup, ...formData });
    } else {
      onUpdate({ ...formData, id: uuidv4(), contractId: contract.id } as StationGroup);
    }
    setIsAddOpen(false);
    setEditingGroup(null);
    setFormData({ name: '', initialStation: '', finalStation: '', materialIds: [], volume: 0, serviceId: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} size="icon"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
          <div>
            <h3 className="text-xl font-bold">Grupos de Estacas</h3>
            <p className="text-sm text-gray-500">Defina intervalos de estaqueamento para cubação.</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingGroup(null); setFormData({ name: '', initialStation: '', finalStation: '', materialIds: [], volume: 0, serviceId: '' }); setSearchMaterial(''); setSearchService(''); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label>Identificação do Grupo</Label>
                  <Input placeholder="Ex: Trecho A - Corte 01" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estaca Inicial</Label>
                    <Input placeholder="0+0,00" value={formData.initialStation || ''} onChange={e => setFormData({...formData, initialStation: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estaca Final</Label>
                    <Input placeholder="100+0,00" value={formData.finalStation || ''} onChange={e => setFormData({...formData, finalStation: e.target.value})} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Materiais (Composições de Insumo)
                    <span className="text-[10px] text-gray-400 font-normal">Selecione para adicionar</span>
                  </Label>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Pesquisar material..." 
                      className="pl-9 h-9 text-sm"
                      value={searchMaterial}
                      onChange={e => setSearchMaterial(e.target.value)}
                    />
                  </div>

                  <ScrollArea className="h-[120px] border rounded-lg p-2 bg-gray-50/30">
                    <div className="space-y-1">
                      {filteredMaterials.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (!formData.materialIds.includes(m.id)) {
                              setFormData({...formData, materialIds: [...formData.materialIds, m.id]});
                            } else {
                              setFormData({...formData, materialIds: formData.materialIds.filter(id => id !== m.id)});
                            }
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                            formData.materialIds.includes(m.id) 
                              ? "bg-emerald-100 text-emerald-700 font-bold border border-emerald-200" 
                              : "hover:bg-gray-100 text-gray-600 border border-transparent"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span>{m.name}</span>
                            <span className="text-[10px] text-gray-400">{m.code}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>

                  {formData.materialIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                       {formData.materialIds.map(id => (
                         <div key={id} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded text-[10px] flex items-center gap-2">
                           <span className="truncate max-w-[150px]">{resources.find(r => r.id === id)?.name}</span>
                           <button type="button" onClick={() => setFormData({...formData, materialIds: formData.materialIds.filter(x => x !== id)})} className="text-emerald-500 hover:text-red-500">×</button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Volume Estimado (m³)</Label>
                    <Input type="number" step="0.01" value={formData.volume} onChange={e => setFormData({...formData, volume: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Serviço Vinculado (Planilha)</Label>
                    <Select value={formData.serviceId} onValueChange={v => setFormData({...formData, serviceId: v})}>
                      <SelectTrigger><SelectValue placeholder="Vincular Serviço..." /></SelectTrigger>
                      <SelectContent>
                         <div className="p-2 border-b">
                            <Input 
                              placeholder="Pesquisar serviço..." 
                              value={searchService}
                              onChange={e => setSearchService(e.target.value)}
                              className="h-8 text-xs"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                         </div>
                         <ScrollArea className="h-[150px]">
                           {filteredServices.map(cs => (
                             <SelectItem key={cs.serviceId} value={cs.serviceId}>{cs.code} - {cs.name}</SelectItem>
                           ))}
                           {filteredServices.length === 0 && (
                             <p className="text-center py-4 text-xs text-gray-400 italic">Nenhum serviço encontrado.</p>
                           )}
                         </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-gray-50 p-4 -mx-6 -mb-6 border-t">
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Salvar Grupo</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <Card key={group.id} className="border-[10px] border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingGroup(group); setFormData(group); setIsAddOpen(true); }} className="h-8 w-8 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(group.id)} className="h-8 w-8 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-1">{group.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Serviço: {services.find(s => s.id === group.serviceId)?.code || 'Não vinculado'}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Intervalo</span>
                   <span className="font-bold">{group.initialStation} → {group.finalStation}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                   <span className="text-gray-400">Volume Est.</span>
                   <span className="font-bold">{formatNumber(group.volume, 2)} m³</span>
                </div>
                <div className="mt-3">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Materiais</p>
                   <div className="flex flex-wrap gap-1">
                     {group.materialIds.map(id => (
                       <span key={id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px]">
                         {resources.find(r => r.id === id)?.name}
                       </span>
                     ))}
                     {group.materialIds.length === 0 && <span className="text-gray-300 text-[10px] italic">Nenhum material vinculado</span>}
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed rounded-2xl">
            Clique em "Novo Grupo" para cadastrar seu primeiro trecho de estaqueamento.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TransportView({ contract, measurement, locations, transportData, onUpdateTransportData, onBack, services, allMeasurements, resources, onUpdateMeasurement }: {
  contract: Contract,
  measurement: Measurement | undefined,
  locations: HighwayLocation[],
  transportData: TransportData[],
  onUpdateTransportData: (d: TransportData) => void,
  onBack: () => void,
  services: ServiceComposition[],
  allMeasurements: Measurement[],
  resources: Resource[],
  onUpdateMeasurement: (m: Measurement) => void
}) {
  const [browsingMeasurementId, setBrowsingMeasurementId] = useState<string>(measurement?.id || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [localTransport, setLocalTransport] = useState<TransportData | null>(null);

  useEffect(() => {
    if (measurement && !browsingMeasurementId) {
      setBrowsingMeasurementId(measurement.id);
    }
  }, [measurement, browsingMeasurementId]);

  useEffect(() => {
    if (!browsingMeasurementId || !selectedServiceId) {
      setLocalTransport(null);
      return;
    }
    const found = transportData.find(d => d.measurementId === browsingMeasurementId && d.serviceId === selectedServiceId);
    if (found) {
      setLocalTransport(JSON.parse(JSON.stringify(found)));
    } else {
      setLocalTransport({
        id: uuidv4(),
        contractId: contract.id,
        measurementId: browsingMeasurementId,
        serviceId: selectedServiceId,
        rows: []
      } as TransportData);
    }
  }, [browsingMeasurementId, selectedServiceId, transportData, contract.id]);

  const isBrowsingCurrent = browsingMeasurementId === measurement?.id;
  const browsingMeasurement = allMeasurements.find(m => m.id === browsingMeasurementId);

  const addRow = () => {
    if (!localTransport) return;
    const newRow: TransportRow = {
      id: uuidv4(),
      locationId: '',
      initialStation: '',
      initialFrac: 0,
      finalStation: '',
      finalFrac: 0,
      volume: 0,
      density: 1,
      weight: 0,
      dmtCalculationMode: 'average',
      dmt: 0,
      moment: 0,
      observacao: ''
    };
    setLocalTransport({
      ...localTransport,
      rows: [...localTransport.rows, newRow]
    });
  };

  const parseStake = (s: string, f: number) => {
    const parts = (s || '0+0').split('+');
    return (parseInt(parts[0]) || 0) + (parseFloat(f.toString().replace(',', '.')) / 20 || 0);
  };

  const updateRow = (rowId: string, field: keyof TransportRow, value: any) => {
    if (!localTransport) return;
    const newRows = localTransport.rows.map(row => {
      if (row.id !== rowId) return row;
      const updated = { ...row, [field]: value };

      if (field === 'volume' || field === 'density') {
        updated.weight = (parseFloat(updated.volume.toString()) || 0) * (parseFloat(updated.density.toString()) || 0);
      }

      const loc = locations.find(l => l.id === updated.locationId);
      if (loc) {
        const locStakeVal = parseStake(loc.referenceStation, 0);
        
        let targetStakeVal = 0;
        if (updated.dmtCalculationMode === 'average') {
          const s1 = parseStake(updated.initialStation, updated.initialFrac);
          const s2 = parseStake(updated.finalStation, updated.finalFrac);
          targetStakeVal = (s1 + s2) / 2;
        } else if (updated.dmtCalculationMode === 'center_of_mass') {
          targetStakeVal = parseStake(updated.centerOfMassStake || '', updated.centerOfMassFrac || 0);
        }
        
        updated.dmt = Math.abs(locStakeVal - targetStakeVal) * 20 / 1000;
      }

      const service = services.find(s => s.id === localTransport.serviceId);
      const isWeightBased = service?.unit.toLowerCase().includes('t') || service?.unit.toLowerCase().includes('kg');
      if (isWeightBased) {
        updated.moment = updated.weight * updated.dmt;
      } else {
        updated.moment = (parseFloat(updated.volume.toString()) || 0) * updated.dmt;
      }

      return updated;
    });
    setLocalTransport({ ...localTransport, rows: newRows });
  };

  const handleSave = () => {
    if (!localTransport) return;
    const totalMoment = localTransport.rows.reduce((s, r) => s + r.moment, 0);
    onUpdateTransportData(localTransport);
    
    // Sincronizar com os itens da medição
    if (measurement) {
        const newItems = [...measurement.items];
        const idx = newItems.findIndex(i => i.serviceId === selectedServiceId);
        if (idx >= 0) {
            newItems[idx] = { ...newItems[idx], quantity: totalMoment };
        } else {
            newItems.push({ serviceId: selectedServiceId, quantity: totalMoment });
        }
        onUpdateMeasurement({ ...measurement, items: newItems });
    }
    
    alert('Transporte salvo com sucesso!');
  };

  const transportServices = useMemo(() => {
    const allContractServices: any[] = [];
    if (contract.services) {
      allContractServices.push(...contract.services);
    }
    if (contract.groups) {
      contract.groups.forEach(g => {
        allContractServices.push(...g.services);
      });
    }

    // fallback to quotation if contract services are empty
    if (allContractServices.length === 0 && !contract.groups) {
       allContractServices.push(...(services || []).map(s => ({ serviceId: s.id, quantity: 0 })));
    }

    return allContractServices.filter(cs => {
       if (cs.worksheetType === 'transport') return true;
       if (cs.worksheetType) return false; 
       
       const s = services.find(x => x.id === cs.serviceId);
       return s?.unit.toLowerCase().includes('km'); 
    });
  }, [contract.services, contract.groups, services]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 flex flex-col h-full min-h-0 overflow-hidden">
       <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4 min-w-[250px]">
          <Button variant="ghost" onClick={onBack} size="icon"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
          <div>
            <h3 className="text-xl font-bold">Planilha de Transporte</h3>
            <p className="text-sm text-gray-500">
              {browsingMeasurementId === measurement?.id 
                ? "Medição Ativa" 
                : browsingMeasurement
                  ? `Visualizando: Medição ${browsingMeasurement.number.toString().padStart(2, '0')}`
                  : "Medição não selecionada"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2 lg:pr-4 lg:border-r">
              <Label className="text-[10px] font-bold text-gray-400 uppercase">Medição:</Label>
              <Select value={browsingMeasurementId} onValueChange={setBrowsingMeasurementId}>
                 <SelectTrigger className="w-[180px] h-8 text-xs font-bold">
                    <SelectValue>
                       {browsingMeasurementId 
                         ? (allMeasurements.find(x => x.id === browsingMeasurementId) 
                            ? `Medição ${allMeasurements.find(x => x.id === browsingMeasurementId)?.number.toString().padStart(2, '0')}`
                            : "Medição não encontrada") 
                         : "Selecione..."}
                    </SelectValue>
                 </SelectTrigger>
                 <SelectContent>
                    {allMeasurements
                      .filter(m => m.contractId === contract.id)
                      .sort((a,b) => b.number - a.number)
                      .map(m => (
                         <SelectItem key={m.id} value={m.id}>
                            Medição {m.number.toString().padStart(2, '0')} - {m.period}
                         </SelectItem>
                      ))
                    }
                 </SelectContent>
              </Select>
           </div>

           <div className="flex items-center gap-2 pr-4 lg:border-r">
              <Label className="text-[10px] font-bold text-gray-400 uppercase">Serviço:</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                 <SelectTrigger className="w-[220px] h-8 text-xs">
                    <SelectValue>
                        {(() => {
                           const s = services.find(x => x.id === selectedServiceId);
                           return s ? `${s.code} - ${s.name}` : "Selecione o serviço...";
                        })()}
                     </SelectValue>
                 </SelectTrigger>
                 <SelectContent>
                    {transportServices.map(cs => {
                       const s = services.find(x => x.id === cs.serviceId);
                       return <SelectItem key={cs.serviceId} value={cs.serviceId}>{s?.code} - {s?.name}</SelectItem>
                    })}
                 </SelectContent>
              </Select>
           </div>

           {selectedServiceId && isBrowsingCurrent && measurement?.status !== 'closed' && (
             <div className="flex gap-2">
               <Button onClick={addRow} variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50 h-8">
                 <Plus className="w-4 h-4 mr-2" /> Adicionar Linha
               </Button>
               <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 h-8">
                 <Save className="w-4 h-4 mr-2" /> Salvar
               </Button>
             </div>
           )}
        </div>
      </div>

      {!selectedServiceId ? (
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
            <Card className="col-span-1 border-[10px] border-gray-100 shadow-sm flex flex-col overflow-hidden bg-gray-50/50 min-h-[300px]">
                <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Locais Cadastrados</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{locations.length}</span>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {locations.map(loc => (
                            <div key={loc.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                <p className="text-xs font-bold text-gray-700 mb-1">{loc.name}</p>
                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                    <span>Estaca Ref: {loc.referenceStation}</span>
                                    <span>{loc.city}</span>
                                </div>
                            </div>
                        ))}
                        {locations.length === 0 && (
                            <div className="text-center py-12 px-4">
                                <Landmark className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 italic">Nenhum local cadastrado para este contrato.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </Card>
            <Card className="col-span-1 lg:col-span-3 border-[10px] border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center bg-white border-dashed min-h-[300px]">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Truck className="w-10 h-10 text-gray-200" />
              </div>
              <h4 className="text-lg font-bold text-gray-400 select-none">Selecione um serviço de transporte</h4>
              <p className="text-sm text-gray-300 max-w-xs text-center select-none mt-2">Apenas serviços com unidade volumétrica ou de peso combinada com distância (ex: m³*km, t*km) são listados aqui.</p>
           </Card>
         </div>
      ) : (
        <Card className="border-[10px] border-gray-100 shadow-xl overflow-hidden flex flex-col flex-1 bg-white min-h-0 ring-1 ring-gray-100">
           <ScrollArea className="flex-1">
              <div className="min-w-[1500px]">
                 <Table>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                       <TableRow>
                          <TableHead className="w-48 text-[10px] font-bold uppercase pl-6 text-gray-500">Local de Origem</TableHead>
                          <TableHead className="w-32 text-[10px] font-bold uppercase text-center text-gray-500">Início (Estaca+Fr)</TableHead>
                          <TableHead className="w-32 text-[10px] font-bold uppercase text-center text-gray-500">Fim (Estaca+Fr)</TableHead>
                          <TableHead className="w-32 text-[10px] font-bold uppercase text-right text-gray-500">Volume (m³)</TableHead>
                          <TableHead className="w-24 text-[10px] font-bold uppercase text-right text-gray-500">Dens. (t/m³)</TableHead>
                          <TableHead className="w-32 text-[10px] font-bold uppercase text-right text-gray-500">Peso Total (t)</TableHead>
                          <TableHead className="w-48 text-[10px] font-bold uppercase text-gray-500">Cálculo DMT</TableHead>
                          <TableHead className="w-28 text-[10px] font-bold uppercase text-right text-gray-500">DMT Calc (km)</TableHead>
                          <TableHead className="w-36 text-[10px] font-bold uppercase text-right text-gray-500">Momento Transp.</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500">Observações</TableHead>
                          <TableHead className="w-14 pr-6"></TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {localTransport?.rows.map(row => (
                          <TableRow key={row.id} className="hover:bg-blue-50/20 transition-colors">
                             <TableCell className="pl-6">
                                <Select value={row.locationId} onValueChange={v => updateRow(row.id, 'locationId', v)} disabled={!isBrowsingCurrent}>
                                   <SelectTrigger className="h-8 text-[11px] bg-gray-50/50"><SelectValue placeholder="Selecione local...">
                                         {row.locationId && locations.find(l => l.id === row.locationId) 
                                           ? (() => {
                                               const l = locations.find(x => x.id === row.locationId);
                                               return `${l?.name} (${l?.referenceStation})`;
                                             })()
                                           : "Selecione local..."}
                                      </SelectValue></SelectTrigger>
                                   <SelectContent>
                                      {locations.map(l => (
                                         <SelectItem key={l.id} value={l.id}>{l.name} ({l.referenceStation})</SelectItem>
                                      ))}
                                   </SelectContent>
                                </Select>
                             </TableCell>
                             <TableCell>
                                <div className="flex gap-1 justify-center">
                                   <Input 
                                      value={row.initialStation ?? ''} 
                                      onChange={e => updateRow(row.id, 'initialStation', e.target.value)} 
                                      disabled={!isBrowsingCurrent}
                                      className="h-8 text-[11px] w-16 px-1.5 text-center bg-transparent border-gray-200" 
                                      placeholder="0+00" 
                                   />
                                   <Input 
                                      type="number" step="0.01" 
                                      value={row.initialFrac ?? ''} 
                                      onChange={e => updateRow(row.id, 'initialFrac', e.target.value)} 
                                      disabled={!isBrowsingCurrent}
                                      className="h-8 text-[11px] w-14 px-1 text-center bg-transparent border-gray-200" 
                                   />
                                </div>
                             </TableCell>
                             <TableCell>
                                <div className="flex gap-1 justify-center">
                                   <Input 
                                      value={row.finalStation ?? ''} 
                                      onChange={e => updateRow(row.id, 'finalStation', e.target.value)} 
                                      disabled={!isBrowsingCurrent}
                                      className="h-8 text-[11px] w-16 px-1.5 text-center bg-transparent border-gray-200" 
                                      placeholder="0+00" 
                                   />
                                   <Input 
                                      type="number" step="0.01" 
                                      value={row.finalFrac ?? ''} 
                                      onChange={e => updateRow(row.id, 'finalFrac', e.target.value)}
                                      disabled={!isBrowsingCurrent} 
                                      className="h-8 text-[11px] w-14 px-1 text-center bg-transparent border-gray-200" 
                                   />
                                </div>
                             </TableCell>
                             <TableCell>
                                <Input 
                                   type="number" step="0.01" 
                                   value={row.volume ?? ''} 
                                   onChange={e => updateRow(row.id, 'volume', e.target.value)} 
                                   disabled={!isBrowsingCurrent}
                                   className="h-8 text-[11px] text-right font-medium text-gray-700 bg-transparent border-gray-200 px-2" 
                                />
                             </TableCell>
                             <TableCell>
                                <Input 
                                   type="number" step="0.01" 
                                   value={row.density || 0} 
                                   onChange={e => updateRow(row.id, 'density', e.target.value)} 
                                   disabled={!isBrowsingCurrent}
                                   className="h-8 text-[11px] text-right font-medium text-gray-500 bg-transparent border-gray-200 px-2" 
                                />
                             </TableCell>
                             <TableCell className="text-right text-[11px] font-bold text-gray-500 pr-4">
                                {formatNumber(row.weight, 2)}
                             </TableCell>
                             <TableCell>
                                <div className="flex flex-col gap-1.5 py-1">
                                   <Select 
                                      value={row.dmtCalculationMode} 
                                      onValueChange={v => updateRow(row.id, 'dmtCalculationMode', v)}
                                      disabled={!isBrowsingCurrent}
                                   >
                                      <SelectTrigger className="h-7 text-[10px] font-bold uppercase bg-gray-50 ring-offset-0 focus:ring-1"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="average"><span className="text-[10px] font-bold">ESTACA MÉDIA</span></SelectItem>
                                         <SelectItem value="center_of_mass"><span className="text-[10px] font-bold">CENTRO DE MASSA</span></SelectItem>
                                      </SelectContent>
                                   </Select>
                                   {row.dmtCalculationMode === 'center_of_mass' && (
                                      <div className="flex gap-1">
                                         <Input 
                                            value={row.centerOfMassStake ?? ''} 
                                            onChange={e => updateRow(row.id, 'centerOfMassStake', e.target.value)} 
                                            disabled={!isBrowsingCurrent}
                                            className="h-6 text-[10px] w-16 px-1.5 bg-amber-50/30 border-amber-200 placeholder:text-amber-300" 
                                            placeholder="Est" 
                                         />
                                         <Input 
                                            type="number" step="0.01" 
                                            value={row.centerOfMassFrac || 0} 
                                            onChange={e => updateRow(row.id, 'centerOfMassFrac', e.target.value)} 
                                            disabled={!isBrowsingCurrent}
                                            className="h-6 text-[10px] w-12 px-1 text-center bg-amber-50/30 border-amber-200" 
                                         />
                                      </div>
                                   )}
                                </div>
                             </TableCell>
                             <TableCell className="text-right text-[11px] font-black text-blue-600 pr-4 italic">
                                {formatNumber(row.dmt, 3)}
                             </TableCell>
                             <TableCell className="text-right text-[11px] font-black text-emerald-600 bg-emerald-50/10 pr-4">
                                {formatNumber(row.moment, 2)}
                             </TableCell>
                             <TableCell>
                                <Input 
                                   value={row.observacao || ''} 
                                   onChange={e => updateRow(row.id, 'observacao', e.target.value)} 
                                   disabled={!isBrowsingCurrent}
                                   className="h-8 text-[10px] bg-transparent border-gray-100 italic" 
                                   placeholder="Notas..." 
                                />
                             </TableCell>
                             <TableCell className="pr-6">
                                {isBrowsingCurrent && (
                                  <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => {
                                        setLocalTransport({ ...localTransport, rows: localTransport.rows.filter(r => r.id !== row.id) });
                                     }} 
                                     className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50"
                                  >
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                             </TableCell>
                          </TableRow>
                       ))}
                       {localTransport?.rows.length === 0 && (
                          <TableRow>
                             <TableCell colSpan={11} className="py-20 text-center">
                                <Truck className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-400">Clique em "Adicionar Linha" para registrar o transporte.</p>
                             </TableCell>
                          </TableRow>
                       )}
                    </TableBody>
                 </Table>
              </div>
           </ScrollArea>
           
           <div className="bg-white p-6 border-t flex flex-wrap gap-6 justify-between items-center shrink-0">
              <div className="flex gap-10">
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Volume Ciclo</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(localTransport?.rows.reduce((s, r) => s + (parseFloat(r.volume.toString()) || 0), 0) || 0, 2)} <span className="text-sm font-normal text-gray-400">m³</span></p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Peso Ciclo</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(localTransport?.rows.reduce((s, r) => s + (parseFloat(r.weight.toString()) || 0), 0) || 0, 2)} <span className="text-sm font-normal text-gray-400">t</span></p>
                 </div>

                 {(() => {
                    const serviceEntry = transportServices.find(cs => cs.serviceId === selectedServiceId);
                    const contractedQty = serviceEntry?.quantity || 0;
                    
                    const prevMoment = allMeasurements
                       .filter(m => m.contractId === contract.id && m.number < (browsingMeasurement?.number || 0))
                       .reduce((acc, med) => {
                          const item = med.items.find(i => i.serviceId === selectedServiceId);
                          return acc + (item?.quantity || 0);
                       }, 0);
                    
                    const currentMoment = localTransport?.rows.reduce((s, r) => s + r.moment, 0) || 0;
                    const totalAccumulated = prevMoment + currentMoment;
                    const balance = contractedQty - totalAccumulated;
                    
                    return (
                       <>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Momento Acumulado</p>
                             <p className="text-xl font-bold text-indigo-700">{formatNumber(totalAccumulated, 2)}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Saldo Contrato</p>
                             <p className="text-xl font-bold text-emerald-700">{formatNumber(balance, 2)}</p>
                          </div>
                       </>
                    );
                 })()}
              </div>
              
              <div className="bg-blue-600 px-8 py-4 rounded-2xl text-white shadow-lg shadow-blue-100 flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-none mb-1">Momento Medição Atual</p>
                    <p className="text-2xl font-black leading-none">{formatNumber(localTransport?.rows.reduce((s, r) => s + r.moment, 0) || 0, 2)}</p>
                 </div>
                 <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                 </div>
              </div>
           </div>
        </Card>
      )}
    </motion.div>
  );
}

function ProductionControlView({ 
  contract, services, serviceProductions, onUpdateProduction, onDeleteProduction, readonly,
  companyLogo, companyLogoRight, logoMode
}: { 
  contract: Contract, services: ServiceComposition[], serviceProductions: ServiceProduction[], 
  onUpdateProduction: (p: ServiceProduction) => void, onDeleteProduction: (id: string) => void,
  readonly: boolean,
  companyLogo?: string, companyLogoRight?: string, logoMode?: 'left' | 'right' | 'both' | 'none'
}) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [listMonthFilter, setListMonthFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const contractServices = useMemo(() => {
    const s = contract.services || [];
    const g = contract.groups || [];
    const all = [...s];
    g.forEach(group => {
       group.services.forEach(gs => {
          if (!all.find(x => x.serviceId === gs.serviceId)) {
             all.push(gs as any);
          }
       });
    });
    // Filter out services with 0 quantity
    let filtered = all.filter(cs => (cs.quantity || 0) > 0);
    
    if (serviceFilter) {
      const term = serviceFilter.toLowerCase();
      filtered = filtered.filter(cs => {
        const s = services.find(x => x.id === cs.serviceId);
        return s?.code.toLowerCase().includes(term) || s?.name.toLowerCase().includes(term);
      });
    }
    
    return filtered;
  }, [contract, services, serviceFilter]);

  const activeProductions = useMemo(() => {
    return serviceProductions.filter(p => p.contractId === contract.id);
  }, [serviceProductions, contract.id]);

  const groupedProductions = useMemo(() => {
    const groups: { [key: string]: ServiceProduction[] } = {};
    activeProductions.forEach(p => {
      if (listMonthFilter && p.month !== listMonthFilter) return;
      if (!groups[p.month]) groups[p.month] = [];
      groups[p.month].push(p);
    });
    
    // Sort array by order naturally, or keep them as is
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        return orderA - orderB;
      });
    }

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [activeProductions, listMonthFilter]);

  const production = useMemo(() => {
    return serviceProductions.find(p => p.contractId === contract.id && p.serviceId === selectedServiceId && p.month === selectedMonth);
  }, [serviceProductions, contract.id, selectedServiceId, selectedMonth]);

  const calculatedAccumulated = useMemo(() => {
    if (!selectedServiceId || !selectedMonth) return 0;
    
    return serviceProductions
      .filter(p => 
        p.contractId === contract.id && 
        p.serviceId === selectedServiceId && 
        p.month < selectedMonth
      )
      .reduce((total, p) => {
        const monthTotal = Object.values(p.dailyData || {}).reduce((sum, day: any) => sum + (day.actual || 0), 0);
        return total + monthTotal;
      }, 0);
  }, [selectedServiceId, selectedMonth, contract.id, serviceProductions]);

  useEffect(() => {
    if (production && (production.prevMonthAccumulated || 0) !== calculatedAccumulated) {
      // Use a small timeout or check to avoid immediate re-render issues in some scenarios, 
      // but standard handleUpdate should be fine as it's stable.
      onUpdateProduction({ ...production, prevMonthAccumulated: calculatedAccumulated });
    }
  }, [calculatedAccumulated, production, onUpdateProduction]);

  const handleUpdate = (updates: Partial<ServiceProduction>) => {
     if (!selectedServiceId) return;
     const existing = production || {
        id: uuidv4(),
        contractId: contract.id,
        serviceId: selectedServiceId,
        month: selectedMonth,
        numEquip: 1,
        workDays: 22,
        hoursDay: 9,
        unitHour: 100,
        efficiency: 100,
        rainPercent: 0,
        startDate: "",
        endDate: "",
        prevMonthAccumulated: calculatedAccumulated,
        dailyData: {}
     };
     onUpdateProduction({ ...existing, ...updates });
  };

  const daysInMonth = useMemo(() => {
     const year = parseInt(selectedMonth.split('-')[0]);
     const month = parseInt(selectedMonth.split('-')[1]);
     return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  const dailyProcessedData = useMemo(() => {
     if (!production) return [];
     const rows: ProductionDaily[] = [];
     let plannedAcc = 0;
     let actualAcc = 0;
     let projectedAcc = 0;

     const targetDaily = production.workDays > 0 ? (production.unitHour * production.hoursDay * production.numEquip * (production.efficiency / 100)) : 0;
     
     const startDay = production.startDate && production.startDate.startsWith(selectedMonth) 
        ? parseInt(production.startDate.split('-')[2]) 
        : 1;

     const isAfterEndDate = (dateStr: string) => {
        if (!production.endDate) return false;
        return dateStr > production.endDate;
     };

     for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${selectedMonth}-${i.toString().padStart(2, '0')}`;
        const dayData = production.dailyData[dateStr] || { actual: 0 };
        
        const dateObj = new Date(dateStr + 'T12:00:00');
        const isWeekend = dateObj.getDay() === 0;
        
        const isBeforeStart = i < startDay;
        const isAfterEnd = isAfterEndDate(dateStr);

        const plannedDay = (isWeekend || isBeforeStart || isAfterEnd) ? 0 : targetDaily;
        plannedAcc += plannedDay;
        
        const actualDay = dayData.actual || 0;
        actualAcc += actualDay;
        
        const todayAtNoon = new Date();
        todayAtNoon.setHours(12, 0, 0, 0);
        const rowDate = new Date(dateStr + 'T12:00:00');
        const isFuture = rowDate > todayAtNoon;
        
        const effectiveProjectedDay = actualDay > 0 ? actualDay : (isFuture ? plannedDay : 0);
        projectedAcc += effectiveProjectedDay;

        rows.push({
           date: dateStr,
           planned: plannedDay,
           actual: actualDay,
           plannedAccumulated: plannedAcc,
           actualAccumulated: actualAcc,
           projected: effectiveProjectedDay,
           projectedAccumulated: projectedAcc
        });
     }
     return rows;
  }, [production, selectedMonth, daysInMonth]);

  const selectedService = services.find(s => s.id === selectedServiceId);

  const exportToExcel = async (type: 'active' | 'all') => {
    const ExcelJS = await import('exceljs');
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();

    if (type === 'active' && production && selectedService) {
      const sheet = workbook.addWorksheet(`${selectedService.code}`.slice(0, 31));
      
      // Header
      sheet.mergeCells('A1:G1');
      sheet.getCell('A1').value = `CONTROLE DE PRODUÇÃO: ${selectedService.name}`;
      sheet.getCell('A1').font = { size: 14, bold: true };
      
      sheet.getCell('A2').value = `Contrato: ${contract.contractNumber} | Mês: ${selectedMonth} | Código: ${selectedService.code}`;
      sheet.getCell('A2').font = { size: 10, italic: true };

      // Parameters
      sheet.addRow([]);
      sheet.addRow(['PARÂMETROS OPERACIONAIS']);
      sheet.getCell(`A${sheet.lastRow!.number}`).font = { bold: true };
      
      sheet.addRow(['Nº Equipamentos', production.numEquip, 'Horas Diárias', production.hoursDay]);
      sheet.addRow(['Dias Trabalhados', production.workDays, 'Eficiência', `${production.efficiency}%`]);
      sheet.addRow(['Produtividade (U/h)', production.unitHour, 'Previsão Chuva', `${production.rainPercent}%`]);
      
      const targetDailyValue = (production.unitHour * production.hoursDay * production.numEquip * (production.efficiency/100));
      sheet.addRow(['META DIÁRIA CALCULADA:', targetDailyValue]);
      sheet.getCell(`B${sheet.lastRow!.number}`).font = { bold: true, color: { argb: 'FF3B82F6' } };

      sheet.addRow([]);

      // Table Header
      const tableHeader = ['DIA', 'PLAN. DIA', 'PLAN. ACUM', 'EXEC. DIA', 'EXEC. ACUM', 'PROJ. DIA', 'PROJ. ACUM'];
      sheet.addRow(tableHeader);
      const headerRow = sheet.getRow(sheet.lastRow!.number);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
        cell.alignment = { horizontal: 'center' };
      });

      // Table Data
      dailyProcessedData.forEach((day, idx) => {
        sheet.addRow([
          idx + 1,
          day.planned,
          day.plannedAccumulated,
          day.actual,
          day.actualAccumulated,
          day.projected,
          day.projectedAccumulated
        ]);
      });

      // Chart Image
      if (chartRef.current) {
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const canvas = await html2canvas(chartRef.current, { 
            scale: 2.5, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
              // Standard libraries like html2canvas fail on oklch()
              // We find any element and replace oklch with fallback
              const allElements = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                if (el.style) {
                   // We aggressively search for any CSS variable or property that might contain oklch
                   // and overwrite it with something safe for the capture.
                   // Since we use hex/rgba in our index.css, this is mostly for components
                   // using tailwind classes we didn't manually clean.
                   const computed = window.getComputedStyle(el);
                   if (computed.color?.includes('oklch')) el.style.color = '#000000';
                   if (computed.backgroundColor?.includes('oklch')) el.style.backgroundColor = 'transparent';
                   if (computed.borderColor?.includes('oklch')) el.style.borderColor = '#ffffff';
                }
              }
            }
          });
          const imageBase64 = canvas.toDataURL('image/png');
          const imageId = workbook.addImage({ base64: imageBase64, extension: 'png' });
          
          sheet.addImage(imageId, {
            tl: { col: 8, row: 2 },
            ext: { width: 1400, height: 450 }
          });
        } catch (e) {
          console.error("Error adding chart to Excel:", e);
        }
      }
    } else if (type === 'all') {
      activeProductions.forEach(p => {
        const s = services.find(x => x.id === p.serviceId);
        if (!s) return;
        
        const sheet = workbook.addWorksheet(`${s.code}_${p.month}`.replace(/-/g, '').slice(0, 31));
        sheet.addRow([`Relatório: ${s.name} (${p.month})`]);
        sheet.getCell('A1').font = { bold: true, size: 12 };
        sheet.addRow(['Dia', 'Data', 'Executado', 'Acumulado']);
        sheet.getRow(2).font = { bold: true };
        
        let actualAcc = 0;
        const year = parseInt(p.month.split('-')[0]);
        const month = parseInt(p.month.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        
        for (let i = 1; i <= lastDay; i++) {
          const dateStr = `${p.month}-${i.toString().padStart(2, '0')}`;
          const actual = p.dailyData[dateStr]?.actual || 0;
          actualAcc += actual;
          sheet.addRow([i, dateStr, actual, actualAcc]);
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Controle_Producao_${contract.contractNumber}_${type}.xlsx`);
  };

  const exportToPDF = async (type: 'active' | 'all') => {
    if (type === 'active' && production && selectedService) {
      exportMonthlyControlReportPDF({
        contract,
        month: selectedMonth,
        productions: [production],
        services,
        companyLogo,
        companyLogoRight,
        logoMode
      });
    } else if (type === 'all') {
      // Group active productions by month
      const byMonth = activeProductions.reduce<Record<string, ServiceProduction[]>>((acc, p) => {
        if (!acc[p.month]) acc[p.month] = [];
        acc[p.month].push(p);
        return acc;
      }, {});

      if (Object.keys(byMonth).length === 0) {
        // Nothing to export
        return;
      }

      // If only one month or we want to export the latest month? 
      // Let's generate a report for each month that has data, or just group them all into one?
      // Since exportMonthlyControlReportPDF expects a single 'month' string for the title/filename,
      // it's best to call it for each month.
      for (const [month, prods] of (Object.entries(byMonth) as [string, ServiceProduction[]][])) {
        exportMonthlyControlReportPDF({
          contract,
          month,
          productions: prods,
          services,
          companyLogo,
          companyLogoRight,
          logoMode
        });
      }
    }
  };

  // If no service is selected AND there are active productions, show the list first
  if (!selectedServiceId) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 px-1">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-2">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Sala Técnica: Acompanhamento</h3>
            <p className="text-gray-500 text-sm">Gerencie o desempenho diário e projeções de produtividade para o contrato.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                <Calendar className="w-4 h-4 text-blue-500 ml-2" />
                <Input 
                   type="month" 
                   className="border-none shadow-none bg-transparent w-44 text-xs font-black uppercase tracking-tight h-8 focus-visible:ring-0" 
                   value={listMonthFilter} 
                   onChange={e => setListMonthFilter(e.target.value)} 
                />
                {listMonthFilter && (
                   <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-gray-100 text-gray-400" onClick={() => setListMonthFilter('')}>
                      <Plus className="w-4 h-4 rotate-45" />
                   </Button>
                )}
             </div>
             {activeProductions.length > 0 && (
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={() => exportToExcel('all')} className="gap-2 rounded-2xl border-gray-200">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel (Todos)
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => exportToPDF('all')} className="gap-2 rounded-2xl border-gray-200">
                      <Download className="w-4 h-4" />
                      PDF (Todos)
                   </Button>
                </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-6">
             <Card className="border-[10px] border-blue-500 shadow-sm bg-blue-600 text-white overflow-visible">
                <CardHeader className="pb-2 relative z-10">
                   <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-100">Controle Operacional</CardTitle>
                   <h4 className="text-lg font-bold">Novo Monitoramento</h4>
                </CardHeader>
                <CardContent className="space-y-4 overflow-visible">
                   <div className="space-y-2 relative">
                      <Label className="text-blue-100 text-[10px] font-bold uppercase">1. Selecione o Serviço</Label>
                      <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                         <Input 
                           placeholder="Buscar por código ou nome..." 
                           className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 pl-9 pr-9"
                           value={serviceFilter}
                           onChange={e => {
                              setServiceFilter(e.target.value);
                              setShowDropdown(true);
                           }}
                           onFocus={() => setShowDropdown(true)}
                         />
                         {serviceFilter && (
                            <button 
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
                              onClick={() => {
                                 setServiceFilter('');
                                 setSelectedServiceId(null);
                              }}
                            >
                               <Plus className="w-4 h-4 rotate-45" />
                            </button>
                         )}
                      </div>
                      
                      {showDropdown && serviceFilter.trim().length > 0 && (
                         <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900 max-h-[500px] overflow-y-auto min-w-[300px]">
                            {contractServices.length > 0 ? (
                               contractServices.slice(0, 100).map(cs => {
                                  const s = services.find(x => x.id === cs.serviceId);
                                  return (
                                     <button
                                        key={cs.serviceId}
                                        className="w-full text-left px-5 py-4 hover:bg-blue-50 flex flex-col border-b border-gray-50 last:border-0 transition-colors"
                                        onClick={() => {
                                           setSelectedServiceId(cs.serviceId);
                                           setServiceFilter(`${s?.code} - ${s?.name}`);
                                           setShowDropdown(false);
                                        }}
                                     >
                                        <span className="font-black text-[10px] text-blue-600 uppercase tracking-wider mb-1">{s?.code}</span>
                                        <span className="text-sm font-semibold leading-tight text-gray-800">{s?.name}</span>
                                     </button>
                                  );
                               })
                            ) : (
                               <div className="p-4 text-center text-gray-400 text-sm">
                                  Nenhum serviço encontrado
                               </div>
                            )}
                         </div>
                      )}
                      
                      {/* Overlay to close dropdown when clicking outside */}
                      {showDropdown && (
                         <div 
                           className="fixed inset-0 z-40" 
                           onClick={() => setShowDropdown(false)}
                         />
                      )}
                   </div>
                   <div className="space-y-2">
                      <Label className="text-blue-100">Mês</Label>
                      <Input 
                        type="month" 
                        className="bg-white/10 border-white/20 text-white" 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)} 
                      />
                   </div>
                   {selectedServiceId && (
                      <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold" onClick={() => handleUpdate({})}>
                        Iniciar Novo Gráfico
                      </Button>
                   )}
                </CardContent>
             </Card>

             <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-slate-800">
                <div className="p-1.5 bg-slate-200 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <p className="font-black text-xs uppercase tracking-widest">Painel de Curvas</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 font-medium">
                Monitore a evolução física comparando o <span className="text-blue-600 font-bold">previsto</span> vs <span className="text-emerald-600 font-bold">realizado</span>. 
                Defina a capacidade e acompanhe a projeção estatística automática para o fechamento do período.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-12">
            <div>
               <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest pl-1 mb-6 flex items-center gap-2">
                 <Activity className="w-4 h-4" />
                 Controles Ativos por Mês
               </h4>
               
               {groupedProductions.length > 0 ? (
                 <DragDropContext onDragEnd={(result) => {
                   if (!result.destination) return;
                   
                   const month = result.source.droppableId;
                   const sourceIndex = result.source.index;
                   const destinationIndex = result.destination.index;
                   
                   if (month !== result.destination.droppableId || sourceIndex === destinationIndex) return;
                   
                   const monthGroup = groupedProductions.find(g => g[0] === month);
                   if (!monthGroup) return;
                   const groupItems = Array.from(monthGroup[1]) as ServiceProduction[];
                   const [reorderedItem] = groupItems.splice(sourceIndex, 1);
                   groupItems.splice(destinationIndex, 0, reorderedItem);
                   
                   // Update order fields
                   groupItems.forEach((item, index) => {
                     if (item.order !== index) {
                       onUpdateProduction({ ...item, order: index });
                     }
                   });
                 }}>
                 <div className="space-y-10">
                   {groupedProductions.map(([month, productions]) => (
                     <div key={month} className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                            {new Date(month + '-01T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compilação Mensal de Dados</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100 px-3 py-1 text-[11px] font-black tracking-widest">
                        {productions.length} {productions.length === 1 ? 'ACOMPANHAMENTO' : 'ACOMPANHAMENTOS'}
                      </Badge>
                    </div>
                    <Droppable droppableId={month} direction="horizontal" isDropDisabled={readonly}>
                      {(provided) => (
                       <div 
                         className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                         {...provided.droppableProps}
                         ref={provided.innerRef}
                       >
                         {productions.map((p, index) => {
                      const s = services.find(x => x.id === p.serviceId);
                      const dailyData = p.dailyData || {};
                      let totalExec = 0;
                      Object.values(dailyData).forEach((val: any) => {
                        totalExec += val.actual || 0;
                      });
                      
                      return (
                        // @ts-ignore
                        <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={readonly}>
                          {(provided, snapshot) => (
                        <div 
                          className="relative group h-full"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.9 : 1,
                            transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                          }}
                        >
                          <Card 
                            className={`border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-white overflow-hidden flex flex-col h-full border-l-4 border-l-transparent hover:border-l-blue-500 ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-xl scale-105' : ''}`}
                            onClick={() => { setSelectedServiceId(p.serviceId); setSelectedMonth(p.month); }}
                          >
                            <CardContent className="p-0 flex flex-col flex-1">
                              <div className="p-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                                     <BarChart3 className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest truncate mb-0.5">{s?.code}</p>
                                     <h5 className="font-bold text-gray-900 text-sm truncate leading-tight mb-1" title={s?.name}>{s?.name}</h5>
                                     <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Acum: {formatNumber(totalExec, 1)} {s?.unit}</span>
                                     </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
                                  {!readonly && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteProduction(p.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-auto h-1.5 bg-gray-50 w-full overflow-hidden">
                                 <motion.div 
                                    className="h-full bg-blue-500" 
                                    initial={{ width: 0 }} 
                                    animate={{ width: '35%' }} 
                                 />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                          )}
                        </Draggable>
                      );
                    })}
                         {provided.placeholder}
                  </div>
                      )}
                    </Droppable>
                </div>
              ))}
            </div>
            </DragDropContext>
          ) : (
            <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-4">Controles em Andamento</h4>
                <div className="p-12 text-center border-2 border-dashed rounded-3xl border-gray-100 bg-white/50">
                  <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h5 className="font-bold text-gray-400">Nenhum controle iniciado</h5>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">Utilize o painel ao lado para escolher um serviço e iniciar o monitoramento.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => setSelectedServiceId(null)} className="h-8 w-8 text-gray-500 hover:text-blue-600">
              <ChevronRight className="w-5 h-5 rotate-180" />
           </Button>
           <div>
              <h3 className="text-2xl font-bold">Produção Detalhada</h3>
              <p className="text-gray-500">Gestão operacional do serviço {selectedService?.code}</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => exportToExcel('active')} className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
           </Button>
           <Button variant="outline" size="sm" onClick={() => exportToPDF('active')} className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
           </Button>
           {!readonly && production && (
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => {
                 onDeleteProduction(production.id);
                 setSelectedServiceId(null);
               }} 
               className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
             >
                <Trash2 className="w-4 h-4" />
                Excluir Monitoramento
             </Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-1 space-y-6">
           <Card className="border-[10px] border-gray-200 shadow-sm">
              <CardHeader>
                 <CardTitle className="text-xs uppercase tracking-wider text-gray-500">Parâmetros de Produção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mês Referência</Label>
                    <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                 </div>

                 {production && (
                    <div className="space-y-4 pt-2">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Nº Equip.</Label>
                             <Input type="number" className="h-9" value={production.numEquip || 0} onChange={e => handleUpdate({ numEquip: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Dias/Mês</Label>
                             <Input type="number" className="h-9" value={production.workDays || 0} onChange={e => handleUpdate({ workDays: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Horas/Dia</Label>
                             <Input type="number" className="h-9" value={production.hoursDay || 0} onChange={e => handleUpdate({ hoursDay: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Prod. ({selectedService?.unit}/h)</Label>
                             <Input type="number" className="h-9" value={production.unitHour || 0} onChange={e => handleUpdate({ unitHour: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Efic. (%)</Label>
                             <Input type="number" className="h-9" value={production.efficiency || 0} onChange={e => handleUpdate({ efficiency: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">% Chuva</Label>
                             <Input type="number" className="h-9" value={production.rainPercent || 0} onChange={e => handleUpdate({ rainPercent: e.target.valueAsNumber })} disabled={readonly} />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Data Início Serviço</Label>
                             <Input 
                                type="date" 
                                className="h-9" 
                                value={production.startDate || ''} 
                                min={`${selectedMonth}-01`}
                                max={`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`}
                                onChange={e => handleUpdate({ startDate: e.target.value })} 
                                disabled={readonly} 
                             />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-bold">Acum. Ant. ({selectedService?.unit})</Label>
                             <Input 
                                type="number" 
                                className="h-9 bg-gray-50 font-bold text-blue-600" 
                                value={production.prevMonthAccumulated || 0} 
                                readOnly={true}
                                disabled={true} 
                             />
                          </div>
                       </div>
                    </div>
                 )}

                 {!production && (
                    <Button className="w-full bg-blue-600" onClick={() => handleUpdate({})}>Iniciar Controle</Button>
                 )}
              </CardContent>
           </Card>

           <Card className="border-[10px] border-blue-200 shadow-sm bg-blue-50/50">
              <CardContent className="p-4 space-y-3">
                 <div className="flex items-center gap-2 text-blue-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Resumo Operacional</span>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-gray-500">Meta Diária:</span>
                       <span className="font-bold text-gray-900">{formatNumber(production?.unitHour ? (production.unitHour * production.hoursDay * production.numEquip * (production.efficiency/100)) : 0, 2)} {selectedService?.unit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-gray-500">Previsão Mês:</span>
                       <span className="font-bold text-blue-600">{formatNumber(dailyProcessedData[dailyProcessedData.length-1]?.plannedAccumulated || 0, 2)} {selectedService?.unit}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-blue-200/50 pt-2 mt-2">
                       <span className="text-gray-500 font-bold">Acumulado Total:</span>
                       <span className="font-bold text-emerald-600">
                           {formatNumber((production?.prevMonthAccumulated || 0) + (dailyProcessedData.length > 0 ? dailyProcessedData[dailyProcessedData.length-1].actualAccumulated : 0), 2)} {selectedService?.unit}
                       </span>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
           {selectedService && production ? (
              <>
                 <Card className="border-[10px] border-blue-100 shadow-sm overflow-hidden text-sm">
                    <CardHeader className="bg-blue-600 text-white py-6">
                       <div className="flex justify-between items-end">
                          <div>
                             <p className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Acompanhamento Físico</p>
                             <CardTitle className="text-2xl uppercase font-black">{selectedService.name}</CardTitle>
                             <div className="flex items-center gap-3 mt-2">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">{selectedService.code}</span>
                                <span className="text-blue-200 text-xs">Unidade: {selectedService.unit} | Mês: {selectedMonth}</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Projeção Final do Mês</p>
                             <p className="text-4xl font-black leading-none">{formatNumber(dailyProcessedData[dailyProcessedData.length-1]?.projectedAccumulated || 0, 2)}</p>
                             <p className="text-[10px] opacity-70 mt-1 uppercase font-bold tracking-widest">{selectedService.unit} Estimados</p>
                          </div>
                       </div>
                    </CardHeader>

                    {/* Dashboard Visual */}
                    <CardContent className="p-1 sm:p-2 lg:p-3">
                      <div className="grid grid-cols-1 gap-8">
                        <div ref={chartRef} className="h-96 xl:h-[400px]" style={{ backgroundColor: '#ffffff' }}>
                           <div className="flex justify-between items-center mb-6">
                              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Acompanhamento de Produção: Diário vs Acumulado</p>
                              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
                                 <div className="flex items-center gap-1"><div className="w-3 h-1 rounded" style={{ backgroundColor: '#3b82f6' }} /> Previsto</div>
                                 <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} /> Executado (Dia)</div>
                                 <div className="flex items-center gap-1"><div className="w-3 h-1 rounded" style={{ backgroundColor: '#10b981' }} /> Executado (Acum)</div>
                                 <div className="flex items-center gap-1"><div className="w-3 h-3 border border-dashed rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B' }} /> Projeção</div>
                              </div>
                           </div>
                           <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={dailyProcessedData} margin={{ top: 10, right: 60, left: 60, bottom: 35 }}>
                               <defs>
                                 <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                 </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                               <XAxis 
                                 dataKey="date" 
                                 tick={{ fontSize: 7, fill: '#94a3b8' }} 
                                 tickFormatter={(v) => v.split('-')[2]} 
                                 axisLine={false}
                                 tickLine={false}
                                 interval={0}
                               />
                               <YAxis 
                                 yAxisId="left"
                                 tick={{ fontSize: 9, fill: '#64748b' }} 
                                 axisLine={false}
                                 tickLine={false}
                                 label={{ value: 'Acumulado (' + selectedService.unit + ')', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                               />
                               <YAxis 
                                 yAxisId="right"
                                 orientation="right"
                                 hide={true}
                               />
                               <Tooltip 
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                 labelFormatter={(v) => `Data: ${v.split('-')[2]}/${v.split('-')[1]}/${v.split('-')[0]}`}
                               />
                               <Area yAxisId="left" type="monotone" dataKey="projectedAccumulated" name="Projeção" stroke="#F59E0B" fill="url(#colorProj)" strokeWidth={1} strokeDasharray="4 4" />
                               <Line yAxisId="left" type="monotone" dataKey="plannedAccumulated" name="Previsto (Acum)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                               <Line yAxisId="left" type="monotone" dataKey="actualAccumulated" name="Executado (Acum)" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                               <Bar yAxisId="right" dataKey="actual" name="Executado (Dia)" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} opacity={0.6}>
                                  <LabelList 
                                    dataKey="actual" 
                                    position="insideTop" 
                                    angle={-90} 
                                    offset={10}
                                    fill="#000000" 
                                    fontSize={9} 
                                    fontWeight="bold" 
                                    formatter={(v: any) => v > 0 ? formatNumber(v, 1) : ''} 
                                  />
                               </Bar>
                               {(() => {
                                 const targetDaily = production.workDays > 0 ? (production.unitHour * production.hoursDay * production.numEquip * (production.efficiency / 100)) : 0;
                                 const actualValsChart = dailyProcessedData.map(d => d.actual).filter(v => typeof v === 'number' && v > 0) as number[];
                                 const avgActualChart = actualValsChart.length ? actualValsChart.reduce((a,b) => a+b, 0) / actualValsChart.length : 0;
                                 return (
                                   <>
                                     {targetDaily > 0 && (
                                       <ReferenceLine yAxisId="right" y={targetDaily} stroke="#3b82f6" strokeDasharray="3 3">
                                          <RechartsLabel position="right" fill="#3b82f6" fontSize={10} fontWeight="bold" value={`Média Prv: ${formatNumber(targetDaily, 1)}`} />
                                       </ReferenceLine>
                                     )}
                                     {avgActualChart > 0 && (
                                       <ReferenceLine yAxisId="right" y={avgActualChart} stroke="#10b981" strokeDasharray="3 3">
                                          <RechartsLabel position="right" fill="#10b981" fontSize={10} fontWeight="bold" value={`Média Exe: ${formatNumber(avgActualChart, 1)}`} />
                                       </ReferenceLine>
                                     )}
                                     {dailyProcessedData.length > 0 && (
                                       <ReferenceLine yAxisId="left" y={dailyProcessedData[dailyProcessedData.length - 1].projectedAccumulated} stroke="#F59E0B" strokeDasharray="3 3" opacity={0.5}>
                                          <RechartsLabel position="right" fill="#F59E0B" fontSize={10} fontWeight="bold" value={`Proj. Final: ${formatNumber(dailyProcessedData[dailyProcessedData.length - 1].projectedAccumulated, 0)}`} />
                                       </ReferenceLine>
                                     )}
                                   </>
                                 );
                               })()}
                             </ComposedChart>
                           </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>

                    <Separator />

                    <div className="bg-gray-50/50">
                       <div className="p-4 border-b bg-white/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between">
                          <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tabela Mensal de Apuração</h6>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Previsto</div>
                             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Executado</div>
                             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Projeção</div>
                          </div>
                       </div>
                       <ScrollArea className="h-[50vh]">
                          <Table>
                             <TableHeader className="bg-gray-100/50">
                                <TableRow className="text-[9px] uppercase tracking-wider">
                                   <TableHead rowSpan={2} className="border-r font-bold w-20">DATA/DIA</TableHead>
                                   <TableHead colSpan={2} className="text-center border-r text-blue-600 font-bold bg-blue-50/30">PREVISTO</TableHead>
                                   <TableHead colSpan={2} className="text-center border-r text-emerald-600 font-bold bg-emerald-50/30">EXECUTADO</TableHead>
                                   <TableHead colSpan={2} className="text-center text-amber-600 font-bold bg-amber-50/30">PROJEÇÃO</TableHead>
                                </TableRow>
                                <TableRow className="text-[9px] uppercase tracking-wider">
                                   <TableHead className="text-right font-bold w-24">NO DIA</TableHead>
                                   <TableHead className="text-right font-bold border-r w-32">ACUMULADO</TableHead>
                                   <TableHead className="text-right font-bold w-24">NO DIA</TableHead>
                                   <TableHead className="text-right font-bold border-r w-32">ACUMULADO</TableHead>
                                   <TableHead className="text-right font-bold w-24">NO DIA</TableHead>
                                   <TableHead className="text-right font-bold w-32">ACUMULADO</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {dailyProcessedData.map((day, idx) => {
                                   const dayNum = idx + 1;
                                   const isWeekend = new Date(day.date + 'T12:00:00').getDay() === 0;
                                   return (
                                      <TableRow key={day.date} className={cn("text-xs transition-colors h-10 hover:bg-white", isWeekend && "bg-gray-50/30 text-gray-400 opacity-60")}>
                                         <TableCell className="font-mono border-r font-bold text-[10px] text-center">
                                            {dayNum.toString().padStart(2, '0')}/{selectedMonth.split('-')[1]}
                                         </TableCell>
                                         
                                         <TableCell className="text-right text-gray-500 font-medium">{formatNumber(day.planned, 2)}</TableCell>
                                         <TableCell className="text-right border-r font-bold text-blue-600 bg-blue-50/10">{formatNumber(day.plannedAccumulated, 2)}</TableCell>
                                         
                                         <TableCell className="text-right p-1 bg-emerald-50/5">
                                            <Input 
                                               type="number" 
                                               className="h-8 text-[11px] text-right font-bold bg-transparent border-transparent focus:border-emerald-200 focus:bg-white transition-all" 
                                               value={(day.actual === undefined || day.actual === null) ? "" : day.actual} 
                                               onChange={e => {
                                                  const val = e.target.value;
                                                  const newData = { ...production.dailyData };
                                                  newData[day.date] = { ...newData[day.date], actual: val === "" ? 0 : parseFloat(val) };
                                                  handleUpdate({ dailyData: newData });
                                               }}
                                               disabled={readonly}
                                               placeholder="0,00"
                                            />
                                         </TableCell>
                                         <TableCell className="text-right border-r font-bold text-emerald-600 bg-emerald-50/10">{formatNumber(day.actualAccumulated, 2)}</TableCell>
                                         
                                         <TableCell className={cn("text-right", day.actual > 0 ? "text-gray-300 font-normal" : "font-bold text-amber-600")}>
                                            {formatNumber(day.projected, 2)}
                                         </TableCell>
                                         <TableCell className="text-right font-bold text-amber-700 bg-amber-50/10">{formatNumber(day.projectedAccumulated, 2)}</TableCell>
                                      </TableRow>
                                   );
                                })}
                                <TableRow className="bg-gray-900 h-10">
                                   <TableCell className="border-r font-black text-white text-[10px] text-center">TOTAIS</TableCell>
                                   <TableCell className="text-right text-blue-200/50 text-[10px]">-</TableCell>
                                   <TableCell className="text-right border-r text-white font-black">{formatNumber(dailyProcessedData[dailyProcessedData.length-1]?.plannedAccumulated || 0, 2)}</TableCell>
                                   <TableCell className="text-right text-emerald-200/50 text-[10px]">-</TableCell>
                                   <TableCell className="text-right border-r text-emerald-400 font-black">{formatNumber(dailyProcessedData[dailyProcessedData.length-1]?.actualAccumulated || 0, 2)}</TableCell>
                                   <TableCell className="text-right text-amber-200/50 text-[10px]">-</TableCell>
                                   <TableCell className="text-right text-amber-400 font-black">{formatNumber(dailyProcessedData[dailyProcessedData.length-1]?.projectedAccumulated || 0, 2)}</TableCell>
                                </TableRow>
                             </TableBody>
                          </Table>
                       </ScrollArea>
                    </div>
                 </Card>
              </>
           ) : (
              <div className="p-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                 <BarChart3 className="w-16 h-16 text-gray-100 mx-auto animate-pulse" />
                 <div>
                    <h4 className="font-bold text-gray-900">Configuração de Controle</h4>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">Verifique os parâmetros operacionais no painel lateral para começar o acompanhamento mensal.</p>
                 </div>
              </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
