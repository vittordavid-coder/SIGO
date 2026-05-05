import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Download, FileSpreadsheet, Eye, 
  ClipboardList, Landmark, CloudRain, Users2, 
  BarChart3, Calendar, Activity, Briefcase
} from 'lucide-react';
import { 
  Contract, Measurement, DailyReport, PluviometryRecord, 
  TechnicalSchedule, ControllerTeam, ControllerEquipment, 
  ControllerManpower, TeamAssignment, ServiceProduction,
  ServiceComposition, Resource
} from '../types';
import { 
  exportContractSummaryPDF,
  exportMeasurementSheetPDF,
  exportFullMeasurementPDF,
  exportMonthlyRDOReportPDF,
  exportPluviometricReportPDF,
  exportScheduleExcelFormated,
  exportTeamsReportPDF,
  exportMonthlyControlReportPDF,
  exportContractSummaryExcel,
  exportMeasurementSheetExcel,
  exportMonthlyRDOReportExcel,
  exportPluviometricReportExcel,
  exportTeamsReportExcel,
  exportMonthlyControlReportExcel,
  exportMeasurementDetailsPDF,
  exportMeasurementDetailsExcel,
  exportSchedulePDF
} from '../lib/exportTechnicalUtils';
import { 
  CalculationMemory, CubationData, TransportData, 
  StationGroup, HighwayLocation 
} from '../types';

interface TechnicalReportsViewProps {
  contract: Contract;
  measurements: Measurement[];
  dailyReports: DailyReport[];
  pluviometryRecords: PluviometryRecord[];
  technicalSchedules: TechnicalSchedule[];
  controllerTeams: ControllerTeam[];
  controllerEquipments: ControllerEquipment[];
  controllerManpower: ControllerManpower[];
  teamAssignments: TeamAssignment[];
  serviceProductions: ServiceProduction[];
  services: ServiceComposition[];
  resources: Resource[];
  memories: CalculationMemory[];
  cubationData: CubationData[];
  transportData: TransportData[];
  stationGroups: StationGroup[];
  highwayLocations: HighwayLocation[];
  baseDate?: string;
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
}

export function TechnicalReportsView({
  contract, measurements, dailyReports, pluviometryRecords, 
  technicalSchedules, controllerTeams, controllerEquipments, 
  controllerManpower, teamAssignments, serviceProductions,
  services, resources, memories, cubationData, transportData,
  stationGroups, highwayLocations, baseDate,
  companyLogo, companyLogoRight, logoMode
}: TechnicalReportsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>(measurements.length > 0 ? measurements[measurements.length - 1].id : '');

  const months = Array.from(new Set([
    ...dailyReports.map(r => r.date.slice(0, 7)),
    ...pluviometryRecords.map(r => r.date.slice(0, 7)),
    new Date().toISOString().slice(0, 7)
  ])).sort().reverse();

  const handleExportResumo = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    exportContractSummaryPDF({
      contract,
      measurements,
      selectedMeasurement: measurement,
      services,
      baseDate,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportResumoExcel = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    exportContractSummaryExcel({
      contract,
      measurements,
      selectedMeasurement: measurement,
      services,
      baseDate
    });
  };

  const handleExportPlanilhaMedicao = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement) return;
    exportMeasurementSheetPDF({
      contract,
      measurement,
      allMeasurements: measurements,
      services,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportPlanilhaMedicaoExcel = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement) return;
    exportMeasurementSheetExcel({
      contract,
      measurement,
      allMeasurements: measurements,
      services
    });
  };

  const handleExportMedicaoCompleta = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement) return;
    exportFullMeasurementPDF({
      contract,
      measurement,
      allMeasurements: measurements,
      services,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportDetalhesMedicao = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement) return;
    exportMeasurementDetailsPDF({
      contract,
      measurement,
      memories,
      cubation: cubationData,
      transport: transportData,
      services,
      stationGroups,
      locations: highwayLocations
    });
  };

  const handleExportDetalhesMedicaoExcel = () => {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement) return;
    exportMeasurementDetailsExcel({
      contract,
      measurement,
      memories,
      cubation: cubationData,
      transport: transportData,
      services,
      stationGroups,
      locations: highwayLocations
    });
  };

  const handleExportRDO = () => {
    const filteredRDOs = dailyReports.filter(r => r.date.startsWith(selectedMonth));
    exportMonthlyRDOReportPDF({
      contract,
      month: selectedMonth,
      reports: filteredRDOs,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportRDOExcel = () => {
    const filteredRDOs = dailyReports.filter(r => r.date.startsWith(selectedMonth));
    exportMonthlyRDOReportExcel({
      contract,
      month: selectedMonth,
      reports: filteredRDOs
    });
  };

  const handleExportPluviometrico = () => {
    const monthRecords = pluviometryRecords.filter(r => r.date.startsWith(selectedMonth));
    exportPluviometricReportPDF({
      contract,
      month: selectedMonth,
      records: monthRecords,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportPluviometricoExcel = () => {
    const monthRecords = pluviometryRecords.filter(r => r.date.startsWith(selectedMonth));
    exportPluviometricReportExcel({
      contract,
      month: selectedMonth,
      records: monthRecords
    });
  };

  const handleExportCronograma = () => {
    const schedule = technicalSchedules[0]; 
    if (!schedule) return;
    exportScheduleExcelFormated({
      contract,
      schedule,
      services,
      resources,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportCronogramaPDF = () => {
    const schedule = technicalSchedules[0];
    if (!schedule) return;
    exportSchedulePDF({
      contract,
      schedule,
      services,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportEquipes = () => {
    exportTeamsReportPDF({
      contract,
      teams: controllerTeams,
      manpower: controllerManpower,
      equipments: controllerEquipments,
      assignments: teamAssignments,
      month: selectedMonth,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportEquipesExcel = () => {
    exportTeamsReportExcel({
      contract,
      teams: controllerTeams,
      manpower: controllerManpower,
      equipments: controllerEquipments,
      assignments: teamAssignments,
      month: selectedMonth
    });
  };

  const handleExportControles = () => {
    const filteredProductions = serviceProductions.filter(p => p.month === selectedMonth);
    exportMonthlyControlReportPDF({
      contract,
      month: selectedMonth,
      productions: filteredProductions,
      services,
      companyLogo,
      companyLogoRight,
      logoMode
    });
  };

  const handleExportControlesExcel = () => {
    const filteredProductions = serviceProductions.filter(p => p.month === selectedMonth);
    exportMonthlyControlReportExcel({
      contract,
      month: selectedMonth,
      productions: filteredProductions,
      services
    });
  };

  return (
    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
      <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black">Central de Relatórios Técnicos</CardTitle>
            <p className="text-blue-100 text-sm">Geração de documentos oficiais e planilhas de controle</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Seleção de Mês/Referência</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m} value={m}>{new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Seleção de Medição</Label>
            <Select value={selectedMeasurementId} onValueChange={setSelectedMeasurementId}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Selecione a medição" />
              </SelectTrigger>
              <SelectContent>
                {measurements.map(m => (
                  <SelectItem key={m.id} value={m.id}>Medição Nº {m.number} ({m.period})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Resumo do Contrato */}
          <ReportCard 
            icon={<Briefcase className="w-5 h-5" />}
            title="Contrato (Resumo)"
            description="Relatório consolidado do contrato e financeiro"
            onPdf={handleExportResumo}
            onExcel={handleExportResumoExcel}
            accent="blue"
          />

          {/* Planilha de Medição */}
          <ReportCard 
            icon={<Landmark className="w-5 h-5" />}
            title="Planilha de Medição"
            description="Exporta a planilha da medição selecionada"
            onPdf={handleExportPlanilhaMedicao}
            onExcel={handleExportPlanilhaMedicaoExcel}
            accent="emerald"
          />

          {/* Medição Detalhada (Antigo Medição Completa) */}
          <ReportCard 
            icon={<ClipboardList className="w-5 h-5" />}
            title="Medição (Detalhes)"
            description="Memórias, Cubação e Transportes detalhados"
            onPdf={handleExportDetalhesMedicao}
            onExcel={handleExportDetalhesMedicaoExcel}
            accent="teal"
          />

          {/* Medição Completa (Pasta) */}
          <ReportCard 
            icon={<FileText className="w-5 h-5" />}
            title="Medição Completa"
            description="Pasta completa da medição selecionada"
            onPdf={handleExportMedicaoCompleta}
            accent="blue"
          />

          {/* Diário de Obras */}
          <ReportCard 
            icon={<Calendar className="w-5 h-5" />}
            title="Diário de Obras"
            description="Relatórios diários do mês selecionado"
            onPdf={handleExportRDO}
            onExcel={handleExportRDOExcel}
            accent="indigo"
          />

          {/* Pluviométrico */}
          <ReportCard 
            icon={<CloudRain className="w-5 h-5" />}
            title="Pluviometria"
            description="Relatório de chuvas do mês"
            onPdf={handleExportPluviometrico}
            onExcel={handleExportPluviometricoExcel}
            accent="cyan"
          />

          {/* Cronograma */}
          <ReportCard 
            icon={<FileSpreadsheet className="w-5 h-5" />}
            title="Cronograma"
            description="Exporta cronograma técnico físico-financeiro"
            onPdf={handleExportCronogramaPDF}
            onExcel={handleExportCronograma}
            accent="green"
          />

          {/* Equipes */}
          <ReportCard 
            icon={<Users2 className="w-5 h-5" />}
            title="Equipes"
            description="Detalhamento e resumo das frentes de serviço"
            onPdf={handleExportEquipes}
            onExcel={handleExportEquipesExcel}
            accent="amber"
          />

          {/* Controles */}
          <ReportCard 
            icon={<Activity className="w-5 h-5" />}
            title="Controles"
            description="Relatório de monitoramentos (mês/dia)"
            onPdf={handleExportControles}
            onExcel={handleExportControlesExcel}
            accent="rose"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCard({ icon, title, description, onPdf, onExcel, accent }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onPdf?: () => void, 
  onExcel?: () => void,
  accent: 'blue' | 'emerald' | 'teal' | 'indigo' | 'cyan' | 'green' | 'amber' | 'rose'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600',
    teal: 'bg-teal-50 text-teal-600 hover:bg-teal-600',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600',
    cyan: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-600',
    green: 'bg-green-50 text-green-600 hover:bg-green-600',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-600',
    rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600'
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg transition-all p-5 group">
      <div className={`${colors[accent]} p-3 rounded-xl w-fit transition-all group-hover:text-white mb-4`}>
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{title}</h4>
      <p className="text-[11px] text-gray-500 mt-1 mb-6 flex-1 leading-relaxed">{description}</p>
      
      <div className="flex gap-2">
        {onPdf && (
          <Button size="sm" variant="outline" className="flex-1 rounded-lg h-9 text-xs gap-1.5" onClick={onPdf}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        )}
        {onExcel && (
          <Button size="sm" variant="outline" className="flex-1 border-green-200 text-green-600 hover:bg-green-50 rounded-lg h-9 text-xs gap-1.5" onClick={onExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </Button>
        )}
      </div>
    </div>
  );
}
