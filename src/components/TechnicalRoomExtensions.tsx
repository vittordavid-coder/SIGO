import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart, Cell
} from 'recharts';
import { 
  Plus, Edit, Trash2, Download, Printer, 
  CloudRain, Calendar, BookOpen, UserCheck, HardHat,
  Construction, Map, Clock, ArrowRightLeft, Save,
  Search, ThermometerSun, AlertTriangle, FileText, FileSpreadsheet, FileDown,
  ChevronDown, ChevronRight, PanelRight, PanelRightClose, ZoomIn, ZoomOut,
  TrendingUp, BarChart3, Maximize2, Minimize2, X, Layers
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Contract, DailyReport, DailyReportActivity, 
  PluviometryRecord, TechnicalSchedule, TechnicalServiceSchedule,
  ServiceComposition, Resource, Schedule, TimeUnit, Quotation
} from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { exportTechnicalScheduleToExcel, exportTechnicalScheduleToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + '%';
};

// --- DIÁRIO DE OBRAS (RDO) ---

interface DailyReportViewProps {
  contract: Contract;
  reports: DailyReport[];
  onAdd: (r: Omit<DailyReport, 'id'>) => void;
  onUpdate: (r: DailyReport) => void;
  onDelete: (id: string) => void;
  onMoveActivity?: (activityId: string, fromId: string, toDate: string, contractId: string) => void;
  pluviometryRecords: PluviometryRecord[];
  readonly?: boolean;
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
}

export function DailyReportView({ 
  contract, reports, onAdd, onUpdate, onDelete, onMoveActivity, 
  pluviometryRecords, readonly, companyLogo, companyLogoRight, logoMode 
}: DailyReportViewProps) {
  const [activeItem, setActiveItem] = useState<'activities' | 'viewer'>('activities');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const hasAutoExpanded = React.useRef(false);
  const selectedReport = reports.find(r => r.id === selectedReportId) || (reports.length > 0 ? [...reports].sort((a,b) => b.date.localeCompare(a.date))[0] : null);

  // Group reports by month/year
  const groupedReports = React.useMemo(() => {
    const groups: Record<string, DailyReport[]> = {};
    const sortedReports = [...reports].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedReports.forEach(report => {
      const date = new Date(report.date + 'T12:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(report);
    });
    
    return groups;
  }, [reports]);

  const monthKeys = React.useMemo(() => {
    return Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));
  }, [groupedReports]);

  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Sync selectedReportId and initial expanded month
  React.useEffect(() => {
    if (reports.length > 0) {
      if (!selectedReportId) {
        const latest = [...reports].sort((a,b) => b.date.localeCompare(a.date))[0];
        setSelectedReportId(latest.id);
      }
      
      // Expand the latest month by default ONLY ONCE
      if (!hasAutoExpanded.current && monthKeys.length > 0) {
        setExpandedMonths([monthKeys[0]]);
        hasAutoExpanded.current = true;
      }
    }
  }, [reports, selectedReportId, monthKeys]);

  const allActivities = React.useMemo(() => {
    return reports.flatMap(report => 
      report.activities.map(activity => ({
        ...activity,
        date: report.date,
        reportId: report.id
      }))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [reports]);

  const handleAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    onAdd({
      contractId: contract.id,
      date: today,
      weatherMorning: 'Bom',
      weatherAfternoon: 'Bom',
      weatherNight: 'Bom',
      rainfallMm: 0,
      manpower: [],
      equipment: [],
      activities: [],
      accidents: ''
    });
  };

  const handleUpdateActivity = (reportId: string, activityId: string, field: string, value: any) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const newActivities = report.activities.map(a => 
      a.id === activityId ? { ...a, [field]: value } : a
    );
    onUpdate({ ...report, activities: newActivities });
  };

  const handleUpdateActivityDate = (reportId: string, activityId: string, newDate: string) => {
    if (!newDate || !onMoveActivity) return;
    onMoveActivity(activityId, reportId, newDate, contract.id);
  };

  const handleExportPDF = (report: DailyReport) => {
    const doc = new jsPDF() as any;
    const pluviometry = pluviometryRecords.find(p => p.date === report.date);
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // Document Frame/Border
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, doc.internal.pageSize.height - (margin * 2) + 4);

    // Header
    doc.setFillColor(30, 58, 138); // Dark Blue
    doc.rect(margin, margin, contentWidth, 12, 'F');
    
    // Logo Logic
    const mode = logoMode || 'left';
    const showLeft = (mode === 'left' || mode === 'both') && companyLogo;
    const showRight = (mode === 'right' || mode === 'both') && companyLogoRight;

    // Logos
    if (showLeft) {
      try {
        const props = doc.getImageProperties(companyLogo!);
        const ratio = props.width / props.height;
        let w = 10;
        let h = 10 / ratio;
        if (h > 10) {
          h = 10;
          w = 10 * ratio;
        }
        const y = margin + 1 + (10 - h) / 2;
        doc.addImage(companyLogo!, 'PNG', margin + 1, y, w, h);
      } catch (e) { 
        try { doc.addImage(companyLogo!, 'PNG', margin + 1, margin + 1, 15, 10); } catch(err) {}
        console.error("Logo Left add error", e); 
      }
    }
    
    if (showRight) {
      try {
        const props = doc.getImageProperties(companyLogoRight!);
        const ratio = props.width / props.height;
        let w = 10;
        let h = 10 / ratio;
        if (h > 10) {
          h = 10;
          w = 10 * ratio;
        }
        const y = margin + 1 + (10 - h) / 2;
        doc.addImage(companyLogoRight!, 'PNG', pageWidth - margin - 1 - w, y, w, h);
      } catch (e) { 
        try { doc.addImage(companyLogoRight!, 'PNG', pageWidth - margin - 16, margin + 1, 15, 10); } catch(err) {}
        console.error("Logo Right add error", e); 
      }
    }

    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DIÁRIO DE OCORRÊNCIAS - RDO', pageWidth / 2, margin + 8, { align: 'center' });
    
    doc.setTextColor(0);
    doc.setFontSize(8);
    
    const headerData = [
      ['Nº DO RDO:', `RDO-${reports.indexOf(report) + 1}`, 'DATA DO REGISTRO:', new Date(report.date + 'T12:00:00').toLocaleDateString('pt-BR')],
      ['CONTRATO:', contract.contractNumber, 'CONTRATANTE:', contract.client || 'N/A'],
      ['OBJETO:', contract.object, 'CONTRATADA:', contract.contractor || 'CONTRATADA']
    ];

    autoTable(doc, {
      startY: margin + 14,
      body: headerData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, fontStyle: 'bold' },
      columnStyles: { 
        0: { cellWidth: 35, fillColor: [245, 245, 245] }, 
        1: { cellWidth: 60 },
        2: { cellWidth: 35, fillColor: [245, 245, 245] },
        3: { cellWidth: 60 }
      }
    });

    // Sections Header Style Helper
    const sectionHeader = (title: string, startY: number) => {
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, startY, contentWidth, 6, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(title, margin + 2, startY + 4.5);
      doc.setTextColor(0);
      return startY + 6;
    };
    
    // Weather Table
    const morning = pluviometry?.morningStatus || report.weatherMorning;
    const afternoon = pluviometry?.afternoonStatus || report.weatherAfternoon;
    const night = pluviometry?.nightStatus || report.weatherNight;
    const rain = pluviometry?.rainfallMm || report.rainfallMm;

    let currentY = (doc as any).lastAutoTable.finalY + 5;
    currentY = sectionHeader('1. CONDIÇÕES CLIMÁTICAS (PLUVIOMETRIA)', currentY);

    autoTable(doc, {
        startY: currentY,
        head: [['Cenário Noite Ant.', 'Cenário Manhã', 'Cenário Tarde', 'Índice (mm)']],
        body: [[night, morning, afternoon, `${rain} mm`]],
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { halign: 'center' }
    });

    // Manpower and Equipment
    currentY = (doc as any).lastAutoTable.finalY + 5;
    currentY = sectionHeader('2. RECURSOS (MÃO DE OBRA E EQUIPAMENTOS)', currentY);

    const manpowerBody = report.manpower.map(m => [m.description, m.quantity]);
    const equipmentBody = report.equipment.map(e => [e.description, e.quantity]);
    
    // Split screen for resources
    autoTable(doc, {
        startY: currentY,
        head: [['MÃO DE OBRA', 'QTDE']],
        body: manpowerBody.length > 0 ? manpowerBody : [['Nenhum registro', '0']],
        theme: 'grid',
        headStyles: { fillColor: [40, 100, 40], textColor: [255, 255, 255] },
        margin: { left: margin, right: pageWidth / 2 + 1 }
    });

    autoTable(doc, {
        startY: currentY,
        head: [['EQUIPAMENTO', 'QTDE']],
        body: equipmentBody.length > 0 ? equipmentBody : [['Nenhum registro', '0']],
        theme: 'grid',
        headStyles: { fillColor: [120, 60, 20], textColor: [255, 255, 255] },
        margin: { left: pageWidth / 2 + 1, right: margin }
    });

    // Activities
    currentY = Math.max((doc as any).lastAutoTable.finalY + 5, currentY);
    currentY = sectionHeader('3. ATIVIDADES EXECUTADAS E PROGRESSO', currentY);

    const activitiesBody = report.activities.map(a => [a.code || '-', a.description, a.type]);
    autoTable(doc, {
        startY: currentY,
        head: [['CÓD.', 'DESCRIÇÃO DA ATIVIDADE', 'TIPO / CATEGORIA']],
        body: activitiesBody.length > 0 ? activitiesBody : [['-', 'Nenhum registro de atividade para este dia.', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 60, 100], textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 40 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Comments Sections
    if (report.accidents) {
        currentY = sectionHeader('4. OCORRÊNCIAS E ACIDENTES', currentY);
        autoTable(doc, {
          startY: currentY,
          body: [[report.accidents]],
          theme: 'grid',
          styles: { minCellHeight: 15 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 5;
    }

    if (report.fiscalizationComments) {
        currentY = sectionHeader('5. COMENTÁRIOS DA FISCALIZAÇÃO', currentY);
        autoTable(doc, {
          startY: currentY,
          body: [[report.fiscalizationComments]],
          theme: 'grid',
          styles: { minCellHeight: 15 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 5;
    }

    // Signatures
    const pageHeight = doc.internal.pageSize.height;
    if (currentY > pageHeight - 50) doc.addPage();
    
    currentY = Math.max(currentY + 10, pageHeight - 50);

    // Signature boxes
    doc.setDrawColor(180);
    doc.rect(margin, currentY, contentWidth / 2 - 2, 30);
    doc.rect(pageWidth / 2 + 2, currentY, contentWidth / 2 - 2, 30);

    doc.line(margin + 5, currentY + 22, (margin + contentWidth / 2) - 10, currentY + 22);
    doc.line(pageWidth / 2 + 7, currentY + 22, pageWidth - margin - 5, currentY + 22);
    
    doc.setFontSize(8);
    doc.text('ENGENHEIRO DA OBRA', margin + contentWidth / 4, currentY + 26, { align: 'center' });
    doc.text('FISCALIZAÇÃO', (pageWidth / 2) + (contentWidth / 4), currentY + 26, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text('Assinatura e Carimbo', margin + contentWidth / 4, currentY + 20, { align: 'center' });
    doc.text('Assinatura e Carimbo', (pageWidth / 2) + (contentWidth / 4), currentY + 20, { align: 'center' });

    doc.save(`RDO_${contract.contractNumber}_${report.date}.pdf`);
  };

  const handleExportExcel = async (report: DailyReport) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RDO');
    const pluviometry = pluviometryRecords.find(p => p.date === report.date);

    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DIÁRIO DE OCORRÊNCIA - RDO';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Info
    worksheet.addRow(['Data:', new Date(report.date + 'T12:00:00').toLocaleDateString(), 'RDO Nº:', reports.indexOf(report) + 1]);
    worksheet.addRow(['Contrato:', contract.contractNumber, 'Obra:', contract.object]);
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(3).font = { bold: true };

    worksheet.addRow([]);

    // Weather
    worksheet.addRow(['Cenário Climático']);
    worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
    worksheet.lastRow!.font = { bold: true };
    worksheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    worksheet.addRow(['Noite Anterior', 'Manhã', 'Tarde', 'Precipitação (mm)']);
    worksheet.addRow([
      pluviometry?.nightStatus || report.weatherNight,
      pluviometry?.morningStatus || report.weatherMorning,
      pluviometry?.afternoonStatus || report.weatherAfternoon,
      (pluviometry?.rainfallMm || report.rainfallMm) + ' mm'
    ]);
    worksheet.addRow([]);

    // Manpower
    worksheet.addRow(['Mão de Obra']);
    worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
    worksheet.lastRow!.font = { bold: true };
    worksheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    worksheet.addRow(['Descrição', 'Quantidade']);
    report.manpower.forEach(m => worksheet.addRow([m.description, m.quantity]));
    worksheet.addRow([]);

    // Equipment
    worksheet.addRow(['Equipamentos']);
    worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
    worksheet.lastRow!.font = { bold: true };
    worksheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    worksheet.addRow(['Descrição', 'Quantidade']);
    report.equipment.forEach(e => worksheet.addRow([e.description, e.quantity]));
    worksheet.addRow([]);

    // Activities
    worksheet.addRow(['Atividades Executadas']);
    worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
    worksheet.lastRow!.font = { bold: true };
    worksheet.lastRow!.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    worksheet.addRow(['Cód.', 'Atividade', 'Tipo']);
    report.activities.forEach(a => worksheet.addRow([a.code, a.description, a.type]));
    worksheet.addRow([]);

    // Occurrences
    if (report.accidents) {
      worksheet.addRow(['Ocorrências / Acidentes']);
      worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
      worksheet.lastRow!.font = { bold: true };
      worksheet.addRow([report.accidents]);
      worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number + 2}`);
      worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]);
    }

    // Fiscalization Comments
    if (report.fiscalizationComments) {
      worksheet.addRow(['Comentários da Fiscalização']);
      worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
      worksheet.lastRow!.font = { bold: true };
      worksheet.addRow([report.fiscalizationComments]);
      worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number + 2}`);
      worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]);
    }

    worksheet.addRow([]);
    worksheet.addRow([]);
    
    // Signatures
    const sigRow = worksheet.addRow(['__________________________________', '', '__________________________________']);
    sigRow.alignment = { horizontal: 'center' };
    const sigLabelRow = worksheet.addRow(['Engenheiro da Obra', '', 'Fiscalização']);
    sigLabelRow.alignment = { horizontal: 'center' };
    sigLabelRow.font = { size: 9 };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `RDO_${contract.contractNumber}_${report.date}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Diário de Ocorrência (RDO)</h2>
          <p className="text-gray-500">Gestão das atividades diárias e ocorrências de campo.</p>
        </div>
        <div className="flex gap-2">
            {!readonly && (
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Novo Diário
              </Button>
            )}
        </div>
      </div>

      <Tabs value={activeItem} onValueChange={v => setActiveItem(v as any)} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Atividades
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Visualizar Diário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Planilha de Atividades</CardTitle>
                <CardDescription className="text-[10px]">Todas as atividades registradas nos diários.</CardDescription>
              </div>
              {!readonly && (
                <Button size="sm" variant="outline" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => {
                  if (selectedReport) {
                    onUpdate({
                      ...selectedReport,
                      activities: [...selectedReport.activities, { id: uuidv4(), code: '', description: '', type: 'Produção', category: 'CONTRATADA' }]
                    });
                  } else {
                    handleAdd();
                  }
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Nova Atividade
                </Button>
              )}
            </CardHeader>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-32 text-[10px] uppercase font-bold text-gray-500">Data</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-gray-500">Atividade / Descrição</TableHead>
                  <TableHead className="w-48 text-[10px] uppercase font-bold text-gray-500 border-l">Tipo</TableHead>
                  {!readonly && <TableHead className="w-12 border-l"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allActivities.map((a, idx) => (
                  <TableRow key={`${a.reportId}-${a.id}-${idx}`}>
                    <TableCell className="p-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="date"
                          disabled={readonly}
                          className="h-8 text-[11px] w-32 border-transparent bg-transparent hover:border-gray-200 focus:border-blue-500 p-1"
                          value={a.date}
                          onChange={e => handleUpdateActivityDate(a.reportId, a.id, e.target.value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        disabled={readonly}
                        className="h-8 text-[11px] border-transparent hover:border-gray-200 focus:border-blue-500 transition-all" 
                        value={a.description}
                        onChange={e => handleUpdateActivity(a.reportId, a.id, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="p-2 border-l">
                      <Select 
                        disabled={readonly}
                        value={a.type} 
                        onValueChange={v => handleUpdateActivity(a.reportId, a.id, 'type', v)}
                      >
                        <SelectTrigger className="h-8 text-[11px] border-transparent"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Produção">Produção</SelectItem>
                          <SelectItem value="Projeto">Projeto</SelectItem>
                          <SelectItem value="Cronograma">Cronograma</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {!readonly && (
                      <TableCell className="p-2 border-l text-center">
                        <Button variant="ghost" size="xs" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => {
                          const report = reports.find(r => r.id === a.reportId);
                          if (report) {
                            onUpdate({
                              ...report,
                              activities: report.activities.filter(act => act.id !== a.id)
                            });
                          }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {allActivities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-gray-400 italic">
                      Nenhuma atividade registrada. Crie um RDO para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="viewer">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-3">
              <Card className="h-[calc(100vh-360px)] flex flex-col">
                <CardHeader className="p-4 border-b shrink-0">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> Histórico de Dias
                  </CardTitle>
                </CardHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-2">
                    {monthKeys.map(monthKey => {
                      const isExpanded = expandedMonths.includes(monthKey);
                      const monthReports = groupedReports[monthKey];
                      
                      return (
                        <div key={monthKey} className="space-y-1">
                          <button
                            onClick={() => toggleMonth(monthKey)}
                            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors group"
                          >
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{getMonthLabel(monthKey)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="h-4 text-[9px] px-1 font-medium">{monthReports.length}</Badge>
                              {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="pl-2 space-y-1 border-l-2 border-blue-50 ml-1">
                              {monthReports.map((r) => {
                                const reportIdx = reports.findIndex(rep => rep.id === r.id);
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => setSelectedReportId(r.id)}
                                    className={cn(
                                      "w-full text-left p-2 rounded-lg transition-all border",
                                      selectedReportId === r.id 
                                        ? "bg-blue-50 border-blue-200 shadow-sm"
                                        : "border-transparent hover:bg-gray-50"
                                    )}
                                  >
                      <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-[10px] text-blue-800">RDO #{reportIdx + 1}</span>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-gray-700 capitalize">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                        <span className="text-[9px] font-medium text-gray-500">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-400 italic truncate">
                                      {r.activities.length} atividades • {r.rainfallMm}mm
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {monthKeys.length === 0 && (
                      <div className="p-8 text-center text-gray-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum RDO</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                </div>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-9">
              {selectedReport ? (
                <div className="space-y-6">
                  {/* Report Header Card */}
                  <Card>
                    <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold">
                          Relatório de Ocorrência - {new Date(selectedReport.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          <span className="ml-2 text-blue-600 capitalize">({new Date(selectedReport.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })})</span>
                        </CardTitle>
                        <CardDescription>Resumo diário e condições de campo.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExportPDF(selectedReport)}>
                          <Printer className="w-4 h-4 mr-2" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportExcel(selectedReport)}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                        </Button>
                        {!readonly && (
                          <Button variant="destructive" size="sm" onClick={() => onDelete(selectedReport.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-4 gap-4">
                            {/* Fetch pluviometry info */}
                            {(() => {
                                const pluvi = pluviometryRecords.find(p => p.date === selectedReport.date);
                                return (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <Label className="text-[9px] uppercase text-gray-400 font-bold block mb-1">Noite Anterior</Label>
                                            <span className="text-sm font-bold flex items-center gap-2">
                                                {pluvi?.nightStatus === 'Chuvoso' ? '🌧️' : pluvi?.nightStatus === 'Impraticável' ? '🛑' : '☀️'} 
                                                {pluvi?.nightStatus || selectedReport.weatherNight}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <Label className="text-[9px] uppercase text-gray-400 font-bold block mb-1">Manhã</Label>
                                            <span className="text-sm font-bold flex items-center gap-2">
                                                {pluvi?.morningStatus === 'Chuvoso' ? '🌧️' : pluvi?.morningStatus === 'Impraticável' ? '🛑' : '☀️'} 
                                                {pluvi?.morningStatus || selectedReport.weatherMorning}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <Label className="text-[9px] uppercase text-gray-400 font-bold block mb-1">Tarde</Label>
                                            <span className="text-sm font-bold flex items-center gap-2">
                                                {pluvi?.afternoonStatus === 'Chuvoso' ? '🌧️' : pluvi?.afternoonStatus === 'Impraticável' ? '🛑' : '☀️'} 
                                                {pluvi?.afternoonStatus || selectedReport.weatherAfternoon}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <Label className="text-[9px] uppercase text-blue-400 font-bold block mb-1">Chuva (mm)</Label>
                                            <span className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                                <CloudRain className="w-4 h-4" />
                                                {pluvi?.rainfallMm || selectedReport.rainfallMm} mm
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </CardContent>
                  </Card>

                  <ScrollArea className="h-[calc(100vh-520px)]">
                    <div className="space-y-6">
                      {/* Detailed Inputs (Efetivo, Equipamento, etc) */}
                      <div className="grid grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="p-3 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-2">
                              <UserCheck className="w-3 h-3 text-emerald-600" /> Efetivo (Mão de Obra)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2">
                            {selectedReport.manpower.map((m, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <span className="text-[11px] flex-1 font-medium">{m.description}</span>
                                <Badge variant="secondary" className="font-bold">{m.quantity}</Badge>
                              </div>
                            ))}
                            {selectedReport.manpower.length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum efetivo listado.</p>}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="p-3 border-b bg-gray-50/50">
                            <CardTitle className="text-xs font-bold flex items-center gap-2">
                              <Construction className="w-3 h-3 text-orange-600" /> Equipamentos
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2">
                            {selectedReport.equipment.map((e, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <span className="text-[11px] flex-1 font-medium">{e.description}</span>
                                <Badge variant="outline" className="font-bold border-orange-200 text-orange-700">{e.quantity}</Badge>
                              </div>
                            ))}
                            {selectedReport.equipment.length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum equipamento listado.</p>}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="p-3 border-b bg-blue-50/20">
                          <CardTitle className="text-xs font-bold flex items-center gap-2">
                            <HardHat className="w-3 h-3 text-blue-600" /> Atividades do Dia
                          </CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] uppercase font-bold">Cód</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold">Descrição</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold text-right">Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReport.activities.map(a => (
                              <TableRow key={a.id}>
                                <TableCell className="py-2 text-[11px] font-mono">{a.code || '-'}</TableCell>
                                <TableCell className="py-2 text-[11px]">{a.description}</TableCell>
                                <TableCell className="py-2 text-right">
                                  <Badge variant="outline" className="text-[9px]">{a.type}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {selectedReport.activities.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4 text-gray-400 text-[11px]">Sem atividades para este dia.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 border-b bg-amber-50/10">
                          <CardTitle className="text-xs font-bold flex items-center gap-2">
                            <Search className="w-3 h-3 text-amber-600" /> Comentários da Fiscalização
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          {readonly ? (
                            <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                              {selectedReport.fiscalizationComments || "Nenhum comentário registrado."}
                            </p>
                          ) : (
                            <textarea 
                              className="w-full text-[11px] p-2 border rounded-md min-h-[80px] focus:ring-1 focus:ring-amber-500 outline-none"
                              placeholder="Insira os comentários ou apontamentos da fiscalização..."
                              value={selectedReport.fiscalizationComments || ""}
                              onChange={e => onUpdate({...selectedReport, fiscalizationComments: e.target.value})}
                            />
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 border-b bg-red-50/10">
                          <CardTitle className="text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> Ocorrências / Acidentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {selectedReport.accidents || "Nenhuma ocorrência registrada para este dia."}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-[calc(100vh-360px)] flex flex-col items-center justify-center bg-white border rounded-2xl border-dashed">
                  <Calendar className="w-16 h-16 text-gray-200 mb-4" />
                  <h3 className="text-gray-400 font-medium text-sm">Nenhum relatório selecionado</h3>
                  <p className="text-gray-300 text-xs mt-2">Crie um RDO para começar o acompanhamento diário.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- PLUVIOMETRIA ---

interface PluviometryViewProps {
  contract: Contract;
  records: PluviometryRecord[];
  onAdd: (r: Omit<PluviometryRecord, 'id'>) => void;
  onUpdate: (r: PluviometryRecord) => void;
  readonly?: boolean;
}

export function PluviometryView({ contract, records, onAdd, onUpdate, readonly }: PluviometryViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getRecordForDay = (day: number) => {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find(r => r.date === dStr) || null;
  };

  const handleUpdate = (day: number, field: keyof PluviometryRecord, value: any) => {
    if (readonly) return;
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = records.find(r => r.date === dStr);
    
    if (existing) {
      onUpdate({ ...existing, [field]: value });
    } else {
      onAdd({
        contractId: contract.id,
        date: dStr,
        nightStatus: 'Bom',
        morningStatus: 'Bom',
        afternoonStatus: 'Bom',
        rainfallMm: 0,
        [field]: value
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Controle Pluviométrico</h2>
          <p className="text-gray-500">Acompanhamento climático e medição de precipitação.</p>
        </div>
        <div className="flex gap-2">
            <Select value={currentMonth.toString()} onValueChange={v => setCurrentMonth(parseInt(v))}>
                <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                        <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={currentYear.toString()} onValueChange={v => setCurrentYear(parseInt(v))}>
                <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-20 text-center font-bold text-[10px] uppercase">Dia</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase bg-blue-50/30">Noite Anterior</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase bg-blue-50/50">Manhã</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase bg-blue-50/70">Tarde</TableHead>
                <TableHead className="w-32 text-center font-bold text-[10px] uppercase">Chuva (mm)</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Impacto na Obra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthDays.map(day => {
                const record = getRecordForDay(day);
                const isRainy = (record?.morningStatus === 'Chuvoso' || record?.afternoonStatus === 'Chuvoso');
                const isImpraticable = (record?.morningStatus === 'Impraticável' || record?.afternoonStatus === 'Impraticável');

                return (
                  <TableRow key={day} className={cn(isImpraticable ? "bg-red-50/30" : isRainy ? "bg-blue-50/20" : "")}>
                    <TableCell className="text-center font-bold text-gray-400">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] text-gray-300 uppercase leading-none mb-0.5">
                          {(() => {
                            const date = new Date(currentYear, currentMonth, day, 12);
                            return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                          })()}
                        </span>
                        <span>{String(day).padStart(2, '0')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select 
                        disabled={readonly}
                        value={record?.nightStatus || 'Bom'} 
                        onValueChange={v => handleUpdate(day, 'nightStatus', v)}
                      >
                        <SelectTrigger className="h-8 text-[11px] w-28 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bom">☀️ Bom</SelectItem>
                          <SelectItem value="Chuvoso">🌧️ Chuvoso</SelectItem>
                          <SelectItem value="Impraticável">🛑 Impraticável</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select 
                        disabled={readonly}
                        value={record?.morningStatus || 'Bom'} 
                        onValueChange={v => handleUpdate(day, 'morningStatus', v)}
                      >
                        <SelectTrigger className="h-8 text-[11px] w-28 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bom">☀️ Bom</SelectItem>
                          <SelectItem value="Chuvoso">🌧️ Chuvoso</SelectItem>
                          <SelectItem value="Impraticável">🛑 Impraticável</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select 
                        disabled={readonly}
                        value={record?.afternoonStatus || 'Bom'} 
                        onValueChange={v => handleUpdate(day, 'afternoonStatus', v)}
                      >
                        <SelectTrigger className="h-8 text-[11px] w-28 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bom">☀️ Bom</SelectItem>
                          <SelectItem value="Chuvoso">🌧️ Chuvoso</SelectItem>
                          <SelectItem value="Impraticável">🛑 Impraticável</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input 
                        disabled={readonly}
                        type="number" 
                        step="0.1"
                        className="h-8 text-center text-[11px] w-24 mx-auto font-bold" 
                        value={record?.rainfallMm || 0}
                        onChange={e => handleUpdate(day, 'rainfallMm', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      {isImpraticable ? (
                        <Badge className="bg-red-600">Paralisação Total</Badge>
                      ) : isRainy ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">Trabalho sob chuva</Badge>
                      ) : (
                        <span className="text-[10px] text-gray-300">Nenhum impacto</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// --- CRONOGRAMA TÉCNICO ---

interface TechnicalScheduleViewProps {
  contract: Contract;
  services: ServiceComposition[];
  resources: Resource[];
  quotations: Quotation[];
  technicalSchedules: TechnicalSchedule[];
  schedules: Schedule[];
  onUpdate: (s: TechnicalSchedule) => void;
  readonly?: boolean;
}

interface ScheduleCellInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const ScheduleCellInput = React.memo(({ value, onChange, disabled, className, placeholder }: ScheduleCellInputProps) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync with prop value if it changes from outside AND we are not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = localValue.replace(',', '.');
    const numericValue = normalized === '' ? 0 : parseFloat(normalized);
    if (!isNaN(numericValue) && numericValue !== value) {
      onChange(numericValue);
    } else {
      // Revert to original string if invalid or same value
      setLocalValue(value.toString());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, decimal points, commas, and negative sign
    if (/^-?[0-9.,]*$/.test(val) || val === '') {
      setLocalValue(val);
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={cn("h-7 text-right text-[11px] font-mono border-none bg-transparent focus:ring-1 px-2 select-all", className)}
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBlur();
          (e.target as HTMLInputElement).blur();
        }
      }}
      disabled={disabled}
    />
  );
});

interface ScheduleServiceRowProps {
  viewOptions: {
    plannedQty: boolean;
    actualQty: boolean;
    plannedPerc: boolean;
    actualPerc: boolean;
    plannedValue: boolean;
    actualValue: boolean;
  };
  bi: any;
  service: any;
  periods: number[];
  unitCost: number;
  updateDayValue: (serviceId: string, periodIndex: number, field: any, val: number) => void;
  serviceSchedule: TechnicalServiceSchedule | undefined;
  readonly: boolean;
  onEdit: (id: string) => void;
}

const ScheduleServiceRow = React.memo(({
  viewOptions, bi, service, periods, unitCost, updateDayValue, serviceSchedule, readonly, onEdit
}: ScheduleServiceRowProps) => {
  const getDayValue = (p: number, field: any) => {
    const dist = serviceSchedule?.distribution.find(d => d.periodIndex === p);
    return dist ? (dist as any)[field] : 0;
  };

  const getServiceAccumulated = (field: any) => {
    return serviceSchedule?.distribution.reduce((acc, d) => acc + (d as any)[field], 0) || 0;
  };

  const accumulatedPlanned = getServiceAccumulated('plannedQty');
  const accumulatedActual = getServiceAccumulated('actualQty');
  const isOverPlanned = accumulatedPlanned > bi.quantity + 0.001;
  const isOverActual = accumulatedActual > bi.quantity + 0.001;

  // Calculate rowSpan for the fixed column
  const visibleRowsCount = Object.values(viewOptions).filter(Boolean).length;

  return (
    <React.Fragment>
      {/* Row 1: Qtd. Previsto */}
      {viewOptions.plannedQty && (
        <TableRow 
          className="hover:bg-gray-50/50 border-t border-gray-100 cursor-pointer select-none"
          onDoubleClick={() => onEdit(bi.serviceId)}
        >
          <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
            <div className="flex flex-col gap-1.5 pr-1">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code || '---'}</span>
              <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{(service?.name || 'Serviço não encontrado').toLowerCase()}</span>
              <span className="text-[10px] text-gray-400 font-medium leading-tight flex items-center gap-1">
                <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm">{service?.unit || '---'}</Badge>
                <span>•</span>
                {formatCurrency(unitCost)}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-[9px] font-bold text-gray-400 uppercase border-r sticky left-[180px] bg-gray-50/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Qtd. Prev.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-gray-50/10 px-4 font-bold text-gray-600">{formatNumber(bi.quantity, 3)}</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="p-0 border-r w-[80px] min-w-[80px]">
              <ScheduleCellInput 
                value={getDayValue(p, 'plannedQty')}
                onChange={(val) => updateDayValue(bi.serviceId, p, 'plannedQty', val)}
                className="focus:ring-blue-400"
                disabled={readonly}
              />
            </TableCell>
          ))}
          <TableCell className={cn(
            "text-right text-[11px] font-mono font-bold bg-blue-50/30 px-4",
            isOverPlanned ? "text-red-600 bg-red-50" : "text-blue-700"
          )}>
            {formatNumber(accumulatedPlanned, 3)}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l px-4 text-gray-500 bg-white">
            {formatNumber(bi.quantity - accumulatedPlanned, 3)}
          </TableCell>
        </TableRow>
      )}

      {/* Row 2: Qtd. Executado */}
      {viewOptions.actualQty && (
        <TableRow 
          className="hover:bg-blue-50/30 cursor-pointer select-none border-b border-gray-100"
          onDoubleClick={() => onEdit(bi.serviceId)}
        >
          {!viewOptions.plannedQty && (
            <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
              <div className="flex flex-col gap-1.5 pr-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm">{service?.unit}</Badge>
                  <span>•</span>
                  {formatCurrency(unitCost)}
                </span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-[9px] font-bold text-blue-600 uppercase border-r sticky left-[180px] bg-blue-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Qtd. Exec.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-blue-50/5 text-blue-300 italic px-4">--</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="p-0 border-r bg-blue-50/5 w-[80px] min-w-[80px]">
              <ScheduleCellInput 
                value={getDayValue(p, 'actualQty')}
                onChange={(val) => updateDayValue(bi.serviceId, p, 'actualQty', val)}
                className="font-bold text-blue-700 focus:ring-blue-500"
                disabled={readonly}
              />
            </TableCell>
          ))}
          <TableCell className={cn(
            "text-right text-[11px] font-mono font-bold text-blue-600 bg-blue-50/40 px-4",
            isOverActual ? "text-red-600 bg-red-50" : "text-blue-800"
          )}>
            {formatNumber(accumulatedActual, 3)}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l text-blue-600/60 px-4 bg-white">
            {formatNumber(bi.quantity - accumulatedActual, 3)}
          </TableCell>
        </TableRow>
      )}

      {/* Row 5: % Previsto */}
      {viewOptions.plannedPerc && (
        <TableRow className="hover:bg-amber-50/30 border-b border-gray-50">
          {!viewOptions.plannedQty && !viewOptions.actualQty && (
            <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
              <div className="flex flex-col gap-1.5 pr-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-[9px] font-bold text-amber-600 uppercase border-r sticky left-[180px] bg-amber-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Perc. Prev.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-amber-50/5 px-4 text-amber-800 font-medium">{formatPercent(100)}</TableCell>
          {periods.map(p => {
            const qtyVal = getDayValue(p, 'plannedQty');
            const percValue = bi.quantity > 0 ? ((qtyVal / bi.quantity) * 100) : 0;
            return (
              <TableCell key={p} className="p-0 border-r bg-amber-50/5 w-[80px] min-w-[80px]">
                <ScheduleCellInput 
                  value={parseFloat(percValue.toFixed(1))}
                  onChange={(val) => updateDayValue(bi.serviceId, p, 'plannedPerc', val)}
                  className="text-amber-700 focus:ring-amber-400"
                  disabled={readonly}
                />
              </TableCell>
            );
          })}
          <TableCell className="text-right text-[11px] font-mono font-bold text-amber-700 bg-amber-50/30 px-4">
            {formatPercent((accumulatedPlanned / bi.quantity) * 100)}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l text-amber-700/50 px-4 bg-white">
            {formatPercent(((bi.quantity - accumulatedPlanned) / bi.quantity) * 100)}
          </TableCell>
        </TableRow>
      )}

      {/* Row 6: % Executado */}
      {viewOptions.actualPerc && (
        <TableRow className="hover:bg-amber-50/50 border-b border-gray-200">
          {!viewOptions.plannedQty && !viewOptions.actualQty && !viewOptions.plannedPerc && (
            <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
              <div className="flex flex-col gap-1.5 pr-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-[9px] font-bold text-amber-800 uppercase border-r sticky left-[180px] bg-amber-100/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Perc. Exec.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-amber-100/10 text-amber-400 italic px-4">--</TableCell>
          {periods.map(p => {
            const qtyVal = getDayValue(p, 'actualQty');
            const percValue = bi.quantity > 0 ? ((qtyVal / bi.quantity) * 100) : 0;
            return (
              <TableCell key={p} className="p-0 border-r bg-amber-100/10 w-[80px] min-w-[80px]">
                <ScheduleCellInput 
                  value={parseFloat(percValue.toFixed(1))}
                  onChange={(val) => updateDayValue(bi.serviceId, p, 'actualPerc', val)}
                  className="font-bold text-amber-900 focus:ring-amber-500"
                  disabled={readonly}
                />
              </TableCell>
            );
          })}
          <TableCell className="text-right text-[11px] font-mono font-bold text-amber-900 bg-amber-100/30 px-4">
            {formatPercent((accumulatedActual / bi.quantity) * 100)}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l text-amber-900/60 font-bold px-4 bg-white">
            {formatPercent(((bi.quantity - accumulatedActual) / bi.quantity) * 100)}
          </TableCell>
        </TableRow>
      )}

      {/* Row 3: Vlr. Previsto */}
      {viewOptions.plannedValue && (
        <TableRow className="hover:bg-emerald-50/30 border-b border-gray-50">
          {!viewOptions.plannedQty && !viewOptions.actualQty && !viewOptions.plannedPerc && !viewOptions.actualPerc && (
            <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
              <div className="flex flex-col gap-1.5 pr-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-[9px] font-bold text-emerald-600 uppercase border-r sticky left-[180px] bg-emerald-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Val. Prev.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-emerald-50/5 px-4 text-emerald-800 font-medium">{formatCurrency(bi.quantity * unitCost)}</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="px-3 py-1.5 border-r text-right text-[10px] font-mono text-emerald-700/70 bg-emerald-50/5">
              {formatCurrency(getDayValue(p, 'plannedValue'))}
            </TableCell>
          ))}
          <TableCell className="text-right text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50/30 px-4">
            {formatCurrency(getServiceAccumulated('plannedValue'))}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l text-emerald-700/50 px-4 bg-white">
            {formatCurrency((bi.quantity * unitCost) - getServiceAccumulated('plannedValue'))}
          </TableCell>
        </TableRow>
      )}

      {/* Row 4: Vlr. Executado */}
      {viewOptions.actualValue && (
        <TableRow className="hover:bg-emerald-50/50 border-b border-gray-200">
          {!viewOptions.plannedQty && !viewOptions.actualQty && !viewOptions.plannedPerc && !viewOptions.actualPerc && !viewOptions.plannedValue && (
            <TableCell rowSpan={visibleRowsCount} className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] w-[180px] min-w-[180px] max-w-[180px] align-top py-4 px-3 border-b">
              <div className="flex flex-col gap-1.5 pr-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-[11px] font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-[9px] font-bold text-emerald-800 uppercase border-r sticky left-[180px] bg-emerald-100/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Val. Exec.</TableCell>
          <TableCell className="text-right text-[11px] font-mono border-r bg-emerald-100/10 text-emerald-400 italic px-4">--</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="px-3 py-1.5 border-r text-right text-[11px] font-mono text-emerald-800 font-bold bg-emerald-100/10">
              {formatCurrency(getDayValue(p, 'actualValue'))}
            </TableCell>
          ))}
          <TableCell className="text-right text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100/30 px-4">
            {formatCurrency(getServiceAccumulated('actualValue'))}
          </TableCell>
          <TableCell className="text-right text-[11px] font-mono border-l text-emerald-900/60 font-bold px-4 bg-white">
            {formatCurrency((bi.quantity * unitCost) - getServiceAccumulated('actualValue'))}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
});

export function TechnicalScheduleView({ 
  contract, services, resources, quotations, technicalSchedules, schedules, onUpdate, readonly 
}: TechnicalScheduleViewProps) {
  const existingSchedule = technicalSchedules.find(s => s.contractId === contract.id);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [viewOptions, setViewOptions] = useState({
    plannedQty: true,
    actualQty: true,
    plannedPerc: false,
    actualPerc: false,
    plannedValue: false,
    actualValue: false
  });
  
  const [localSchedule, setLocalSchedule] = useState<TechnicalSchedule>(existingSchedule || {
    id: uuidv4(),
    contractId: contract.id,
    startDate: contract.startDate || new Date().toISOString().split('T')[0],
    duration: 6,
    timeUnit: 'months',
    services: []
  });
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartGroupFilter, setChartGroupFilter] = useState<'all' | string>('all');
  const [chartPeriodFilter, setChartPeriodFilter] = useState<number | null>(null);
  const [isChartMaximized, setIsChartMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = React.useRef(false);
  
  // Debounced auto-save
  React.useEffect(() => {
    if (isDirty.current && !readonly) {
      const scheduleToSave = localSchedule;
      const timer = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onUpdate(scheduleToSave);
          // Only clear dirty flag if no new changes happened during the save
          if (isDirty.current && localSchedule === scheduleToSave) {
            isDirty.current = false;
          }
        } catch (error) {
          console.error("Auto-save failed", error);
        } finally {
          setIsSaving(false);
        }
      }, 3000); // Increased debounce to 3s for better multi-field entry
      return () => clearTimeout(timer);
    }
  }, [localSchedule, onUpdate, readonly]);

  const groupsToRender = React.useMemo(() => {
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
  }, [contract.groups, contract.services, services]);

  const budgetItems = React.useMemo(() => {
    return groupsToRender.flatMap(g => g.services);
  }, [groupsToRender]);

  // Sync only if NOT dirty to prevent overwriting user input while it's being saved
  React.useEffect(() => {
    const existing = technicalSchedules.find(s => s.contractId === contract.id);
    if (existing && !isDirty.current) {
      setLocalSchedule(existing);
    } else if (!existing && !isDirty.current) {
      setLocalSchedule({
        id: uuidv4(),
        contractId: contract.id,
        startDate: contract.startDate || new Date().toISOString().split('T')[0],
        duration: 6,
        timeUnit: 'months',
        services: budgetItems.map(bi => ({ serviceId: bi.serviceId, distribution: [] }))
      });
    }
  }, [contract.id, technicalSchedules, budgetItems]);

  const updateLocalSchedule = (updates: Partial<TechnicalSchedule>) => {
    isDirty.current = true;
    setLocalSchedule(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onUpdate(localSchedule);
  };

  const handleExportExcel = () => {
    exportTechnicalScheduleToExcel(localSchedule, contract, services, resources, budgetItems);
  };

  const handleExportPDF = () => {
    exportTechnicalScheduleToPDF(localSchedule, contract, services, resources, budgetItems);
  };

  const handleImportFromQuotation = () => {
    if (!contract.quotationId) return;
    const quotationSchedule = schedules.find(s => s.quotationId === contract.quotationId);
    if (!quotationSchedule) {
      alert("Nenhum cronograma de cotação encontrado para este contrato.");
      return;
    }

    const confirm = window.confirm("Deseja importar os dados planejados do cronograma da cotação? Isso substituirá os dados planejados atuais.");
    if (!confirm) return;

    const newServices: TechnicalServiceSchedule[] = [];

    budgetItems.forEach(bi => {
      const qs = quotationSchedule.services.find(s => s.serviceId === bi.serviceId);
      const service = services.find(s => s.id === bi.serviceId);
      const unitCost = bi.price || (service ? calculateServiceUnitCost(service, resources, services) : 0);
      
      const distribution = qs ? qs.distribution.map(d => {
        const plannedQty = quotationSchedule.distributionType === 'percentage' 
          ? (d.value / 100 * bi.quantity)
          : d.value;
        
        return {
          periodIndex: d.periodIndex,
          plannedQty,
          actualQty: 0,
          plannedValue: plannedQty * unitCost,
          actualValue: 0
        };
      }) : [];

      newServices.push({
        serviceId: bi.serviceId,
        distribution
      });
    });

    updateLocalSchedule({
      startDate: quotationSchedule.startDate,
      duration: quotationSchedule.duration,
      timeUnit: quotationSchedule.timeUnit,
      services: newServices
    });
  };

  const getDayValue = React.useCallback((serviceId: string, periodIndex: number, field: 'plannedQty' | 'actualQty' | 'plannedValue' | 'actualValue') => {
    const s = localSchedule.services.find(s => s.serviceId === serviceId);
    if (!s) return 0;
    const dist = s.distribution.find(d => d.periodIndex === periodIndex);
    return dist ? dist[field] : 0;
  }, [localSchedule.services]);

  const updateDayValue = React.useCallback((serviceId: string, periodIndex: number, field: 'plannedQty' | 'actualQty' | 'plannedPerc' | 'actualPerc', value: number) => {
    if (readonly) return;
    isDirty.current = true;
    
    setLocalSchedule(prev => {
      const newServices = [...prev.services];
      let sIdx = newServices.findIndex(s => s.serviceId === serviceId);
      
      if (sIdx === -1) {
        newServices.push({ serviceId, distribution: [] });
        sIdx = newServices.length - 1;
      }
      
      const distribution = [...newServices[sIdx].distribution];
      let dIdx = distribution.findIndex(d => d.periodIndex === periodIndex);
      
      if (dIdx === -1) {
        distribution.push({ 
          periodIndex, 
          plannedQty: 0, 
          actualQty: 0, 
          plannedValue: 0, 
          actualValue: 0 
        });
        dIdx = distribution.length - 1;
      }

      const bi = budgetItems.find(i => i.serviceId === serviceId);
      const service = services.find(s => s.id === serviceId);
      const unitCost = bi?.price || (service ? calculateServiceUnitCost(service, resources, services) : 0);
      const totalQty = bi?.quantity || 1;

      let qtyValue = value;
      let fieldToUpdate: 'plannedQty' | 'actualQty' = 'plannedQty';

      if (field === 'plannedPerc') {
        qtyValue = (value / 100) * totalQty;
        fieldToUpdate = 'plannedQty';
      } else if (field === 'actualPerc') {
        qtyValue = (value / 100) * totalQty;
        fieldToUpdate = 'actualQty';
      } else {
        fieldToUpdate = field;
      }

      const updatedDist = { ...distribution[dIdx], [fieldToUpdate]: qtyValue };
      
      // Auto-calculate values
      if (fieldToUpdate === 'plannedQty') updatedDist.plannedValue = qtyValue * unitCost;
      if (fieldToUpdate === 'actualQty') updatedDist.actualValue = qtyValue * unitCost;

      distribution[dIdx] = updatedDist;
      newServices[sIdx] = { ...newServices[sIdx], distribution };
      
      return { ...prev, services: newServices };
    });
  }, [readonly, budgetItems, services, resources]);

  const periods = Array.from({ length: localSchedule.duration }, (_, i) => i);

  const monthGroups = React.useMemo(() => {
    const groups: { monthYear: string; duration: number; startIndex: number }[] = [];
    if (!localSchedule.startDate || (localSchedule.timeUnit !== 'days' && localSchedule.timeUnit !== 'weeks')) return [];

    const start = new Date(localSchedule.startDate + 'T12:00:00');
    
    periods.forEach((p, idx) => {
      let currentMonthYear = "";
      const d = new Date(start);
      if (localSchedule.timeUnit === 'days') {
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
  }, [localSchedule.startDate, localSchedule.timeUnit, periods]);

  const getPeriodLabel = (index: number) => {
    const start = new Date(localSchedule.startDate + 'T12:00:00');
    
    if (localSchedule.timeUnit === 'days') {
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
    
    if (localSchedule.timeUnit === 'weeks') {
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
    
    if (localSchedule.timeUnit === 'months') {
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

  const getServiceAccumulated = React.useCallback((serviceId: string, field: 'plannedQty' | 'actualQty' | 'plannedValue' | 'actualValue') => {
    const s = localSchedule.services.find(s => s.serviceId === serviceId);
    if (!s) return 0;
    return s.distribution.reduce((acc, d) => acc + d[field], 0);
  }, [localSchedule.services]);

  const getPeriodTotalValue = React.useCallback((periodIndex: number, field: 'plannedValue' | 'actualValue') => {
    return localSchedule.services.reduce((acc, s) => {
      const dist = s.distribution.find(d => d.periodIndex === periodIndex);
      return acc + (dist ? (dist as any)[field] : 0);
    }, 0);
  }, [localSchedule.services]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden relative">
      {/* Main Content: Header and Table */}
      <div className="flex-1 flex flex-col min-w-0 pr-4 overflow-hidden h-full">
        <div className="flex items-center justify-between shrink-0 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cronograma Físico-Financeiro</h2>
            <p className="text-sm text-gray-500">Acompanhamento temporal de planejamento vs. execução.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-red-600 border-red-200 hover:bg-red-50 h-8">
              <FileDown className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-green-600 border-green-200 hover:bg-green-50 h-8">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsChartModalOpen(true)} className="text-purple-600 border-purple-200 hover:bg-purple-50 h-8">
              <BarChart3 className="w-4 h-4 mr-2" /> Gráfico
            </Button>
            {contract.quotationId && !readonly && (
              <Button size="sm" variant="outline" onClick={handleImportFromQuotation} className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Importar do Orçamento
              </Button>
            )}
            {!readonly && (
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse h-8">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Salvando...</span>
                  </div>
                )}
                <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 h-8">
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1 bg-white border rounded-md shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono font-medium text-gray-600 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              size="sm" 
              variant={isSidebarOpen ? "secondary" : "outline"}
              onClick={() => setIsSidebarOpen(prev => !prev)} 
              className={cn("h-8 px-2", isSidebarOpen ? "bg-slate-200 text-slate-700" : "text-slate-600")}
              title={isSidebarOpen ? "Ocultar painel" : "Mostrar painel"}
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-none flex-1 min-h-0 flex flex-col bg-transparent relative">
          <div className="absolute inset-0 overflow-auto border rounded-xl shadow-md bg-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {/* Using arbitrary type cast as React typings sometimes omit zoom, but it's supported by most browsers */}
            <div style={{ zoom: zoomLevel } as React.CSSProperties}>
              <table className="w-full border-separate border-spacing-0 text-sm table-fixed">
                <thead className="bg-gray-50 border-b sticky top-0 z-40 shadow-sm">
                      {monthGroups.length > 0 && (
                        <TableRow className="bg-gray-50/80 backdrop-blur-sm hover:bg-transparent">
                          <TableHead className="w-[180px] sticky left-0 top-0 bg-gray-50/90 backdrop-blur-sm z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] h-10 border-b" />
                          <TableHead className="w-[80px] bg-gray-50/90 border-b shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" />
                          <TableHead className="w-[100px] bg-gray-50/90 border-b shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" />
                          {monthGroups.map((group, gIdx) => (
                            <TableHead key={gIdx} colSpan={group.duration} className="text-center font-bold text-[10px] uppercase text-blue-800 bg-blue-50/40 border-r border-b py-2 sticky top-0 shadow-sm">
                               <div className="flex items-center justify-center gap-2">
                                 <Calendar className="w-3 h-3" />
                                 {group.monthYear}
                               </div>
                            </TableHead>
                          ))}
                          <TableHead colSpan={2} className="bg-gray-50/50 border-b sticky top-0" />
                        </TableRow>
                      )}
                      <TableRow className="bg-gray-50/90 backdrop-blur-sm">
                        <TableHead className="w-[180px] sticky left-0 bg-gray-50/95 backdrop-blur-md z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] border-b py-3 font-bold text-gray-700">Serviço / Item</TableHead>
                        <TableHead className="w-[80px] border-r sticky left-[180px] bg-gray-50 z-30 border-b font-bold text-gray-600 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">Tipo</TableHead>
                        <TableHead className="w-[100px] text-right border-r bg-gray-50 z-30 border-b font-bold text-gray-600 px-4">Total</TableHead>
                        {periods.map(p => (
                          <TableHead key={p} className="w-[80px] min-w-[80px] text-center border-r bg-gray-50 border-b py-3 font-bold text-gray-600 px-2">
                            {getPeriodLabel(p)}
                          </TableHead>
                        ))}
                        <TableHead className="w-[100px] min-w-[100px] text-right bg-blue-50/50 border-b font-bold text-blue-800 px-4">Acum.</TableHead>
                        <TableHead className="w-[100px] min-w-[100px] text-right border-l bg-gray-50 border-b font-bold text-gray-600 px-4">Saldo</TableHead>
                      </TableRow>
                    </thead>
                <TableBody>
                  {groupsToRender.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={periods.length + 5} className="h-32 text-center text-gray-500 italic">
                        Nenhum serviço vinculado a este contrato.
                      </TableCell>
                    </TableRow>
                  )}
                  {groupsToRender.map((group) => (
                    <React.Fragment key={group.id}>
                      {/* Group Budget Header Row */}
                      <TableRow className="bg-slate-200 hover:bg-slate-200 border-y-2 border-slate-300">
                        <TableCell colSpan={3} className="sticky left-0 bg-slate-200 z-20 py-3 px-4 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-slate-900 text-white hover:bg-slate-900 text-[10px] font-black uppercase px-2 py-0.5 shadow-sm">GRUPO</Badge>
                            <span className="font-black text-[12px] text-slate-900 uppercase tracking-tight">{group.name}</span>
                          </div>
                        </TableCell>
                        <TableCell colSpan={periods.length + 2} className="bg-slate-200/50" />
                      </TableRow>

                {group.services.map((bi, biIdx) => {
                  let s = services.find(serv => serv.id === bi.serviceId);
                  // Fallback to code if ID lookup fails
                  if (!s && (bi as any).code) {
                    s = services.find(serv => serv.code === (bi as any).code);
                  }
                  
                  const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                  const serviceSchedule = localSchedule.services.find(ls => ls.serviceId === bi.serviceId);
                  
                  return (
                    <ScheduleServiceRow 
                      key={`${bi.serviceId}-${biIdx}`}
                      bi={bi}
                      service={s}
                      periods={periods}
                      viewOptions={viewOptions}
                      unitCost={unitCost}
                      readonly={readonly}
                      updateDayValue={updateDayValue}
                      serviceSchedule={serviceSchedule}
                      onEdit={setEditingServiceId}
                    />
                  );
                })}

                      {/* Group Financial Total Row (Planned) */}
                      <TableRow className="bg-slate-50 font-black border-t-2 border-slate-200">
                        <TableCell className="sticky left-0 bg-slate-50 z-20 py-2.5 px-4 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[10px] uppercase text-slate-500 font-extrabold tracking-tighter">
                          TOTAL PLANEJADO (R$): {group.name}
                        </TableCell>
                        <TableCell className="sticky left-[180px] bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[8px] font-black text-slate-400 uppercase px-3">VALOR</TableCell>
                        <TableCell className="text-right text-[11px] font-mono px-4 text-slate-800">
                          {formatCurrency(group.services.reduce((acc, bi) => {
                            const s = services.find(serv => serv.id === bi.serviceId) || services.find(serv => serv.code === (bi as any).code);
                            const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                            return acc + (bi.quantity * unitCost);
                          }, 0))}
                        </TableCell>
                        {periods.map(p => {
                          const periodPlanned = group.services.reduce((acc, s) => {
                            const ls = localSchedule.services.find(ls => ls.serviceId === s.serviceId) || 
                                       localSchedule.services.find(ls => {
                                         const foundS = services.find(serv => serv.id === ls.serviceId);
                                         return foundS && foundS.code === (s as any).code;
                                       });
                            const dist = ls?.distribution.find(d => d.periodIndex === p);
                            return acc + (dist ? dist.plannedValue : 0);
                          }, 0);
                          return (
                            <TableCell key={p} className="text-right text-[10px] font-mono border-r px-3 text-slate-700 bg-slate-100/50">
                              {formatCurrency(periodPlanned)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-[11px] font-mono bg-slate-100 px-4 text-slate-900">
                          {formatCurrency(periods.reduce((acc, p) => {
                            return acc + group.services.reduce((gAcc, s) => {
                              const ls = localSchedule.services.find(ls => ls.serviceId === s.serviceId) || 
                                         localSchedule.services.find(ls => {
                                           const foundS = services.find(serv => serv.id === ls.serviceId);
                                           return foundS && foundS.code === (s as any).code;
                                         });
                              const dist = ls?.distribution.find(d => d.periodIndex === p);
                              return gAcc + (dist ? dist.plannedValue : 0);
                            }, 0);
                          }, 0))}
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-mono px-4 text-slate-700 bg-slate-50">
                          {formatCurrency(
                            group.services.reduce((acc, bi) => {
                              const s = services.find(serv => serv.id === bi.serviceId) || services.find(serv => serv.code === (bi as any).code);
                              const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                              return acc + (bi.quantity * unitCost);
                            }, 0) - periods.reduce((acc, p) => {
                              return acc + group.services.reduce((gAcc, s) => {
                                const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === p);
                                return gAcc + (dist ? dist.plannedValue : 0);
                              }, 0);
                            }, 0)
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Group Financial Total Row (Executed) */}
                      <TableRow className="bg-blue-50 font-black border-b-2 border-blue-200">
                        <TableCell className="sticky left-0 bg-blue-50 z-20 py-2 top-auto shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[10px] uppercase text-blue-600 font-extrabold tracking-tighter">
                          TOTAL EXECUTADO (R$): {group.name}
                        </TableCell>
                        <TableCell className="sticky left-[180px] bg-blue-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[8px] font-black text-blue-400 uppercase px-3">VALOR</TableCell>
                        <TableCell className="text-right text-[11px] font-mono px-4 text-blue-400 italic">--</TableCell>
                        {periods.map(p => {
                          const periodActual = group.services.reduce((acc, s) => {
                            const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === p);
                            return acc + (dist ? dist.actualValue : 0);
                          }, 0);
                          return (
                            <TableCell key={p} className="text-right text-[10px] font-mono border-r px-3 text-blue-700 bg-blue-100/30">
                              {formatCurrency(periodActual)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-[11px] font-mono bg-blue-100 px-4 text-blue-900">
                          {formatCurrency(periods.reduce((acc, p) => {
                            return acc + group.services.reduce((gAcc, s) => {
                              const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === p);
                              return gAcc + (dist ? dist.actualValue : 0);
                            }, 0);
                          }, 0))}
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-mono px-4 text-blue-700 bg-blue-50">
                          {formatCurrency(
                            group.services.reduce((acc, bi) => {
                              const s = services.find(serv => serv.id === bi.serviceId);
                              const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                              return acc + (bi.quantity * unitCost);
                            }, 0) - periods.reduce((acc, p) => {
                              return acc + group.services.reduce((gAcc, s) => {
                                const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === p);
                                return gAcc + (dist ? dist.actualValue : 0);
                              }, 0);
                            }, 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}

                  {/* Global Footer: Totais Financeiros */}
                  <TableRow className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 z-30">
                    <TableCell colSpan={2} className="sticky left-0 bg-slate-900 z-20 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] w-[180px] min-w-[180px] max-w-[180px] uppercase text-[11px] py-4 px-4 tracking-wider">Total Planejado (R$)</TableCell>
                    <TableCell className="text-right text-xs border-r px-4">
                      {formatCurrency(budgetItems.reduce((acc, bi) => {
                        const s = services.find(serv => serv.id === bi.serviceId);
                        const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                        return acc + (bi.quantity * unitCost);
                      }, 0))}
                    </TableCell>
                    {periods.map(p => (
                      <TableCell key={p} className="text-right text-[10px] border-r text-slate-300 px-3">
                        {formatCurrency(getPeriodTotalValue(p, 'plannedValue'))}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-xs bg-slate-800 px-4">
                      {formatCurrency(periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'plannedValue'), 0))}
                    </TableCell>
                    <TableCell className="text-right text-xs border-l px-4 text-slate-400 bg-slate-900">
                      {formatCurrency(
                        budgetItems.reduce((acc, bi) => {
                          const s = services.find(serv => serv.id === bi.serviceId);
                          const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                          return acc + (bi.quantity * unitCost);
                        }, 0) - periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'plannedValue'), 0)
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-blue-900 text-white font-bold">
                    <TableCell colSpan={2} className="sticky left-0 bg-blue-900 z-10 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] w-[150px] min-w-[150px] max-w-[150px] uppercase text-xs px-4 py-4">Total Executado (R$)</TableCell>
                    <TableCell className="text-right text-xs border-r text-blue-300 italic px-4">--</TableCell>
                    {periods.map(p => (
                      <TableCell key={p} className="text-right text-[10px] border-r text-blue-200 font-extrabold italic px-3">
                        {formatCurrency(getPeriodTotalValue(p, 'actualValue'))}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-xs bg-blue-800 font-black px-4">
                      {formatCurrency(periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'actualValue'), 0))}
                    </TableCell>
                    <TableCell className="text-right text-xs border-l text-blue-200 px-4 bg-blue-800">
                      {formatCurrency(
                        budgetItems.reduce((acc, bi) => {
                          const s = services.find(serv => serv.id === bi.serviceId);
                          const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                          return acc + (bi.quantity * unitCost);
                        }, 0) - periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'actualValue'), 0)
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Sidebar: Config & Info */}
      {isSidebarOpen && (
        <aside className="w-80 shrink-0 border-l bg-gray-50/50 flex flex-col h-full overflow-y-auto">
          <div className="p-4 space-y-6">
            <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Configurações Gerais</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-gray-500">Data de Início</Label>
                <Input 
                  type="date" 
                  className="h-8 text-[11px] bg-white"
                  value={localSchedule.startDate} 
                  onChange={(e) => updateLocalSchedule({ startDate: e.target.value })}
                  disabled={readonly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-gray-500">Unidade de Tempo</Label>
                <Select 
                  value={localSchedule.timeUnit} 
                  onValueChange={(v: TimeUnit) => updateLocalSchedule({ timeUnit: v })}
                  disabled={readonly}
                >
                  <SelectTrigger className="h-8 text-[11px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Dias</SelectItem>
                    <SelectItem value="weeks">Semanas</SelectItem>
                    <SelectItem value="months">Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-gray-500">Duração ({localSchedule.timeUnit === 'months' ? 'Meses' : localSchedule.timeUnit === 'weeks' ? 'Semanas' : 'Dias'})</Label>
                <Input 
                  type="number" 
                  min={1}
                  className="h-8 text-[11px] bg-white font-mono"
                  value={localSchedule.duration} 
                  onChange={(e) => updateLocalSchedule({ duration: parseInt(e.target.value) || 1 })}
                  disabled={readonly}
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full text-blue-600 border-blue-100 hover:bg-blue-50 font-bold uppercase text-[10px] h-10 shadow-sm"
                onClick={() => setIsChartModalOpen(true)}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-2" /> Gráfico Previsto x Executado
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Opções de Visualização</h3>
            <div className="space-y-2">
              {[
                { key: 'plannedQty', label: 'Qtd. Prevista', color: 'text-gray-600', dot: 'bg-gray-400' },
                { key: 'actualQty', label: 'Qtd. Executada', color: 'text-blue-600', dot: 'bg-blue-500' },
                { key: 'plannedPerc', label: '% Previsto', color: 'text-amber-600', dot: 'bg-amber-500' },
                { key: 'actualPerc', label: '% Executado', color: 'text-amber-800', dot: 'bg-amber-600' },
                { key: 'plannedValue', label: 'Val. Prev.', color: 'text-emerald-600', dot: 'bg-emerald-500' },
                { key: 'actualValue', label: 'Val. Exec.', color: 'text-emerald-800', dot: 'bg-emerald-600' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 cursor-pointer group transition-all">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", opt.dot)} />
                    <span className={cn("text-[10px] font-bold uppercase", opt.color)}>{opt.label}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={(viewOptions as any)[opt.key]}
                    onChange={e => setViewOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
             <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
               <h4 className="text-[10px] font-black text-blue-800 uppercase mb-2">Resumo Financeiro</h4>
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] text-blue-600 font-bold uppercase">Total Contrato</span>
                   <span className="text-[11px] font-mono font-bold text-blue-900">
                     {formatCurrency(budgetItems.reduce((acc, bi) => {
                       const s = services.find(serv => serv.id === bi.serviceId);
                       const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                       return acc + (bi.quantity * unitCost);
                     }, 0))}
                   </span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] text-blue-600 font-bold uppercase">Acumulado</span>
                   <span className="text-[11px] font-mono font-bold text-amber-700">
                     {formatCurrency(periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'actualValue'), 0))}
                   </span>
                 </div>
                 <div className="h-px bg-blue-200 my-1" />
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] text-blue-800 font-black uppercase">Saldo</span>
                   <span className="text-xs font-mono font-black text-blue-900">
                     {formatCurrency(
                        budgetItems.reduce((acc, bi) => {
                          const s = services.find(serv => serv.id === bi.serviceId);
                          const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                          return acc + (bi.quantity * unitCost);
                        }, 0) - periods.reduce((acc, p) => acc + getPeriodTotalValue(p, 'actualValue'), 0)
                     )}
                   </span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </aside>
      )}

      {/* Quick Edit Dialog for a specific service */}
      <Dialog open={!!editingServiceId} onOpenChange={(open) => !open && setEditingServiceId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Edição Rápida de Distribuição</p>
                <p className="text-base font-bold text-gray-900 leading-tight">
                  {services.find(s => s.id === editingServiceId)?.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4 pr-3">
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_repeat(6,120px)] gap-4 p-2 bg-gray-50 rounded-lg sticky top-0 z-10 border border-gray-100 items-center">
                <div className="text-[10px] font-bold uppercase text-gray-400">Período</div>
                <div className="text-[10px] font-bold uppercase text-blue-600 text-center">Qtd. Prev.</div>
                <div className="text-[10px] font-bold uppercase text-amber-600 text-center">% Prev.</div>
                <div className="text-[10px] font-bold uppercase text-blue-800 text-center">Qtd. Exec.</div>
                <div className="text-[10px] font-bold uppercase text-amber-800 text-center">% Exec.</div>
                <div className="text-[10px] font-bold uppercase text-emerald-600 text-right pr-4">Vlr. Prev.</div>
                <div className="text-[10px] font-bold uppercase text-emerald-800 text-right pr-4">Vlr. Exec.</div>
              </div>
              
              {periods.map(p => {
                const bi = budgetItems.find(i => i.serviceId === editingServiceId);
                const s = services.find(serv => serv.id === editingServiceId);
                const unitCost = bi?.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
                const totalQty = bi?.quantity || 1;
                
                return (
                  <div key={p} className="grid grid-cols-[1fr_repeat(6,120px)] gap-4 items-center p-2 rounded-lg hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                    <div className="text-xs font-bold text-gray-700">{getPeriodLabel(p)}</div>
                    <div className="flex justify-center">
                      <Input 
                        type="number"
                        step="0.001"
                        className="h-10 text-center text-sm font-mono w-full"
                        value={getDayValue(editingServiceId!, p, 'plannedQty') ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDayValue(editingServiceId!, p, 'plannedQty', val === '' ? 0 : parseFloat(val));
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Input 
                        type="number"
                        step="0.1"
                        className="h-10 text-center text-sm font-mono w-full text-amber-600"
                        value={totalQty > 0 ? ((getDayValue(editingServiceId!, p, 'plannedQty') / totalQty) * 100).toFixed(1) : 0}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDayValue(editingServiceId!, p, 'plannedPerc', val === '' ? 0 : parseFloat(val));
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Input 
                        type="number"
                        step="0.001"
                        className="h-10 text-center text-sm font-mono font-bold text-blue-700 w-full"
                        value={getDayValue(editingServiceId!, p, 'actualQty') ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDayValue(editingServiceId!, p, 'actualQty', val === '' ? 0 : parseFloat(val));
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Input 
                        type="number"
                        step="0.1"
                        className="h-10 text-center text-sm font-mono font-bold text-amber-800 w-full"
                        value={totalQty > 0 ? ((getDayValue(editingServiceId!, p, 'actualQty') / totalQty) * 100).toFixed(1) : 0}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDayValue(editingServiceId!, p, 'actualPerc', val === '' ? 0 : parseFloat(val));
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="text-right text-xs font-mono text-emerald-600 pr-4">
                      {formatCurrency(getDayValue(editingServiceId!, p, 'plannedValue'))}
                    </div>
                    <div className="text-right text-xs font-mono text-emerald-800 font-bold pr-4">
                      {formatCurrency(getDayValue(editingServiceId!, p, 'actualValue'))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-1 justify-between items-center text-xs">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-400 uppercase font-bold text-[9px]">Total Contrato</span>
                  <span className="font-bold">{formatNumber(budgetItems.find(i => i.serviceId === editingServiceId)?.quantity || 0, 3)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-600 uppercase font-bold text-[9px]">Acumulado Prev.</span>
                  <span className={cn(
                    "font-bold",
                    getServiceAccumulated(editingServiceId!, 'plannedQty') > (budgetItems.find(i => i.serviceId === editingServiceId)?.quantity || 0) + 0.001 && "text-red-600"
                  )}>
                    {formatNumber(getServiceAccumulated(editingServiceId!, 'plannedQty'), 3)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-800 uppercase font-bold text-[9px]">Acumulado Exec.</span>
                  <span className={cn(
                    "font-bold",
                    getServiceAccumulated(editingServiceId!, 'actualQty') > (budgetItems.find(i => i.serviceId === editingServiceId)?.quantity || 0) + 0.001 && "text-red-600"
                  )}>
                    {formatNumber(getServiceAccumulated(editingServiceId!, 'actualQty'), 3)}
                  </span>
                </div>
              </div>
              <Button onClick={() => setEditingServiceId(null)} className="bg-blue-600">Concluir</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chart Modal: Previsto x Executado */}
      <Dialog open={isChartModalOpen} onOpenChange={(open) => {
        setIsChartModalOpen(open);
        if (!open) {
          setChartPeriodFilter(null);
          setIsChartMaximized(false);
        }
      }}>
        <DialogContent className={cn(
          "flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl transition-all duration-500",
          isChartMaximized ? "max-w-[98vw] w-[98vw] h-[95vh]" : "max-w-6xl max-h-[90vh]"
        )}>
          <DialogHeader className="p-8 pb-0 bg-white">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Análise de Desempenho</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Acompanhamento Financeiro Previsto vs. Executado</p>
                    {chartPeriodFilter !== null && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase shadow-sm border border-blue-100 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {(() => {
                            const start = new Date(localSchedule.startDate + 'T12:00:00');
                            if (localSchedule.timeUnit === 'months') {
                              const d = new Date(start); d.setMonth(start.getMonth() + chartPeriodFilter);
                              return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            }
                            return `Período ${chartPeriodFilter + 1}`;
                          })()}
                        </span>
                        <button 
                          onClick={() => setChartPeriodFilter(null)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-full transition-all text-gray-400 group"
                          title="Remover filtro de período"
                        >
                          <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )}
                    {chartGroupFilter !== 'all' && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase shadow-sm border border-slate-200 flex items-center gap-2">
                          <Layers className="w-3 h-3" />
                          {groupsToRender.find(g => g.id === chartGroupFilter)?.name || 'Grupo'}
                        </span>
                        <button 
                          onClick={() => setChartGroupFilter('all')}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-full transition-all text-gray-400 group"
                          title="Remover filtro de grupo"
                        >
                          <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  <Label className="pl-4 text-[10px] font-black uppercase text-gray-400">Filtrar por:</Label>
                  <Select value={chartGroupFilter} onValueChange={setChartGroupFilter}>
                    <SelectTrigger className="w-[400px] h-10 border-none bg-transparent font-bold text-xs shadow-none ring-0 focus:ring-0">
                      <div className="flex items-center gap-2 truncate">
                        {chartGroupFilter === 'all' ? (
                          <span className="font-bold">Total do Contrato</span>
                        ) : (
                          <span className="font-bold">
                            {groupsToRender.find(g => g.id === chartGroupFilter)?.name || (chartGroupFilter === 'standalone' ? 'Serviços Gerais' : 'Grupo Desconhecido')}
                          </span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl min-w-[400px]">
                      <SelectItem value="all" className="font-bold text-xs uppercase tracking-tight">Total do Contrato</SelectItem>
                      {groupsToRender.map(g => (
                        <SelectItem key={g.id} value={g.id} className="font-bold text-xs uppercase tracking-tight">{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsChartMaximized(!isChartMaximized)}
                  className="rounded-2xl h-11 w-11 border-gray-100 bg-gray-50 hover:bg-white transition-all shadow-sm"
                >
                  {isChartMaximized ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mt-8">
               {(() => {
                 const filterServices = chartGroupFilter === 'all' 
                   ? budgetItems 
                   : groupsToRender.find(g => g.id === chartGroupFilter)?.services || [];

                 const relevantPeriods = chartPeriodFilter !== null ? [chartPeriodFilter] : periods;

                 const currentChartData = relevantPeriods.map(p => {
                   const planned = filterServices.reduce((acc, bi) => {
                     const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === p);
                     return acc + (dist ? dist.plannedValue : 0);
                   }, 0);

                   const actual = filterServices.reduce((acc, bi) => {
                     const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === p);
                     return acc + (dist ? dist.actualValue : 0);
                   }, 0);

                   return { planned, actual };
                 });

                 const totalPlanned = currentChartData.reduce((acc, d) => acc + d.planned, 0);
                 const totalActual = currentChartData.reduce((acc, d) => acc + d.actual, 0);
                 const performance = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
                 const deviation = totalActual - totalPlanned;

                 return (
                   <>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Total Planejado</p>
                      <p className="text-xl font-black text-blue-900">{formatCurrency(totalPlanned)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Total Executado</p>
                      <p className="text-xl font-black text-emerald-900">{formatCurrency(totalActual)}</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl border transition-all", deviation >= 0 ? "bg-emerald-100/30 border-emerald-200" : "bg-red-50/50 border-red-100")}>
                      <p className={cn("text-[9px] font-black uppercase mb-1", deviation >= 0 ? "text-emerald-700" : "text-gray-500")}>Desvio Financeiro</p>
                      <p className={cn("text-xl font-black", deviation >= 0 ? "text-emerald-900" : "text-gray-900")}>{formatCurrency(deviation)}</p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-slate-100 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Performance (IDC)</p>
                      <p className={cn("text-xl font-black", performance >= 100 ? "text-emerald-400" : performance >= 80 ? "text-amber-400" : "text-red-400")}>
                        {performance.toFixed(1)}%
                      </p>
                    </div>
                   </>
                 );
               })()}
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex flex-col p-8 pt-0 overflow-y-auto">
            {periods.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Cronograma Vazio</h3>
                <p className="text-sm text-gray-500 text-center max-w-xs">Defina a duração e distribua os valores no cronograma para gerar os gráficos de acompanhamento.</p>
              </div>
            ) : (
              <Tabs defaultValue="evolution" className="flex-1 flex flex-col">
                <div className="px-0 mb-6">
                  <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 inline-flex">
                    <TabsTrigger value="evolution" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Curva de Evolução</TabsTrigger>
                    <TabsTrigger value="comparison" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Comparativo por Grupo</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="evolution" className="flex-1">
                   <div className="bg-white rounded-3xl border border-gray-100 shadow-inner p-6">
                      <div className={cn("w-full transition-all duration-500", isChartMaximized ? "h-[60vh]" : "h-[400px]")}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AnimatePresence mode="wait">
                            {chartPeriodFilter === null ? (
                              <motion.div
                                key="overall"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="w-full h-full"
                              >
                                <ComposedChart
                                    data={periods.map(p => {
                                      const filterServices = chartGroupFilter === 'all' 
                                        ? budgetItems 
                                        : groupsToRender.find(g => g.id === chartGroupFilter)?.services || [];
                                      
                                      const planned = filterServices.reduce((acc, bi) => {
                                        const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === p);
                                        return acc + (dist ? dist.plannedValue : 0);
                                      }, 0);

                                      const actual = filterServices.reduce((acc, bi) => {
                                        const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === p);
                                        return acc + (dist ? dist.actualValue : 0);
                                      }, 0);

                                      // Accumulated logic
                                      const accPlanned = periods.slice(0, p + 1).reduce((sum, sp) => {
                                        return sum + filterServices.reduce((acc, bi) => {
                                          const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === sp);
                                          return acc + (dist ? dist.plannedValue : 0);
                                        }, 0);
                                      }, 0);

                                      const accActual = periods.slice(0, p + 1).reduce((sum, sp) => {
                                        return sum + filterServices.reduce((acc, bi) => {
                                          const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId)?.distribution.find(d => d.periodIndex === sp);
                                          return acc + (dist ? dist.actualValue : 0);
                                        }, 0);
                                      }, 0);

                                      // Label logic
                                      const start = new Date(localSchedule.startDate + 'T12:00:00');
                                      let label = `${p + 1}`;
                                      if (localSchedule.timeUnit === 'months') {
                                        const d = new Date(start); d.setMonth(start.getMonth() + p);
                                        label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                                      } else if (localSchedule.timeUnit === 'weeks') {
                                        label = `S${p + 1}`;
                                      } else {
                                        label = `D${p + 1}`;
                                      }

                                      return {
                                        name: label.toUpperCase(),
                                        per_planned: planned,
                                        per_actual: actual,
                                        acc_planned: accPlanned,
                                        acc_actual: accActual,
                                        periodIndex: p
                                      };
                                    })}
                                >
                                  <defs>
                                    <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                                    dy={10}
                                  />
                                  <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                                    tickFormatter={(v) => `R$ ${formatNumber(v/1000, 0)}k`}
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    labelStyle={{ fontWeight: 'black', marginBottom: '8px', fontSize: '11px', color: '#1e293b' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                  />
                                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                  
                                  <Bar 
                                    dataKey="per_planned" 
                                    name="Previsto (Período)" 
                                    fill="#3b82f6" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                    opacity={0.3} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  />
                                  <Bar 
                                    dataKey="per_actual" 
                                    name="Executado (Período)" 
                                    fill="#10b981" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                    opacity={0.3} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="acc_planned" 
                                    name="Previsto Acum." 
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorPrev)" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={(data) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="acc_actual" 
                                    name="Realizado Acum." 
                                    stroke="#10b981" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorExec)" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={(data) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  />
                                </ComposedChart>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="period-details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full"
                              >
                                <BarChart
                                  layout="vertical"
                                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                                  data={groupsToRender.map(g => {
                                    const planned = g.services.reduce((acc, s) => {
                                      const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === chartPeriodFilter);
                                      return acc + (dist ? dist.plannedValue : 0);
                                    }, 0);
                                    const actual = g.services.reduce((acc, s) => {
                                      const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId)?.distribution.find(d => d.periodIndex === chartPeriodFilter);
                                      return acc + (dist ? dist.actualValue : 0);
                                    }, 0);
                                    return {
                                      name: g.name,
                                      planned,
                                      actual,
                                      groupId: g.id
                                    };
                                  })}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                  <XAxis 
                                    type="number"
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                                    tickFormatter={(v) => `R$ ${formatNumber(v/1000, 0)}k`}
                                  />
                                  <YAxis 
                                    dataKey="name" 
                                    type="category"
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={180}
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b', textTransform: 'uppercase'}}
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                  />
                                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                                  <Bar 
                                    dataKey="planned" 
                                    name="Previsto no Período" 
                                    fill="#3b82f6" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && data.groupId) setChartGroupFilter(data.groupId);
                                    }}
                                  />
                                  <Bar 
                                    dataKey="actual" 
                                    name="Executado no Período" 
                                    fill="#10b981" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && data.groupId) setChartGroupFilter(data.groupId);
                                    }}
                                  />
                                </BarChart>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="comparison" className="flex-1">
                   <div className="bg-white rounded-3xl border border-gray-100 shadow-inner p-6">
                      <div className={cn("w-full transition-all duration-500", isChartMaximized ? "h-[60vh]" : "h-[400px]")}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AnimatePresence mode="wait">
                            {chartGroupFilter === 'all' ? (
                              <motion.div
                                key="groups-overall"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full h-full"
                              >
                                <BarChart
                                  layout="vertical"
                                  data={groupsToRender.map(g => {
                                    const planned = g.services.reduce((acc, s) => {
                                      const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId);
                                      return acc + (dist ? dist.distribution.reduce((dAcc, d) => dAcc + d.plannedValue, 0) : 0);
                                    }, 0);
                                    const actual = g.services.reduce((acc, s) => {
                                      const dist = localSchedule.services.find(ls => ls.serviceId === s.serviceId);
                                      return acc + (dist ? dist.distribution.reduce((dAcc, d) => dAcc + d.actualValue, 0) : 0);
                                    }, 0);
                                    return {
                                      name: g.name,
                                      planned,
                                      actual,
                                      groupId: g.id
                                    };
                                  })}
                                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                  <XAxis 
                                    type="number"
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                                    tickFormatter={(v) => `R$ ${formatNumber(v/1000, 0)}k`}
                                  />
                                  <YAxis 
                                    dataKey="name" 
                                    type="category"
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={180}
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b', textTransform: 'uppercase'}}
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                  />
                                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                                  <Bar 
                                    dataKey="planned" 
                                    name="Total Planejado" 
                                    fill="#3b82f6" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && data.groupId) {
                                        setChartGroupFilter(data.groupId);
                                        // Optional: if already in a period, stay in it? Yes.
                                      }
                                    }}
                                  >
                                    {groupsToRender.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={chartGroupFilter === entry.id ? '#1e40af' : '#3b82f6'} 
                                        className="transition-all duration-300"
                                      />
                                    ))}
                                  </Bar>
                                  <Bar 
                                    dataKey="actual" 
                                    name="Total Realizado" 
                                    fill="#10b981" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && data.groupId) setChartGroupFilter(data.groupId);
                                    }}
                                  />
                                </BarChart>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="services-breakdown"
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full h-full"
                              >
                                <BarChart
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                                    data={(groupsToRender.find(g => g.id === chartGroupFilter)?.services || []).map(bi => {
                                      const dist = localSchedule.services.find(ls => ls.serviceId === bi.serviceId);
                                      const planned = dist ? dist.distribution.reduce((acc, d) => acc + d.plannedValue, 0) : 0;
                                      const actual = dist ? dist.distribution.reduce((acc, d) => acc + d.actualValue, 0) : 0;
                                      const serviceName = services.find(s => s.id === bi.serviceId)?.name || 'Serviço Desconhecido';
                                      return {
                                        name: serviceName,
                                        planned,
                                        actual
                                      };
                                    })}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                  <XAxis 
                                    type="number"
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                                    tickFormatter={(v) => `R$ ${formatNumber(v/1000, 0)}k`}
                                  />
                                  <YAxis 
                                    dataKey="name" 
                                    type="category"
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={220}
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b', textTransform: 'uppercase'}}
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                  />
                                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                                  <Bar dataKey="planned" name="Total Planejado" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20} />
                                  <Bar dataKey="actual" name="Total Realizado" fill="#10b981" radius={[0, 8, 8, 0]} barSize={20} />
                                </BarChart>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter className="p-8 pt-0 bg-white items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Fonte: Cronograma Físico-Financeiro - Sala Técnica</p>
            <Button onClick={() => setIsChartModalOpen(false)} className="rounded-2xl px-12 font-black uppercase text-xs h-12 bg-slate-900 shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all">Fechar Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
