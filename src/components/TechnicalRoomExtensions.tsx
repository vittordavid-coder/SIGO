import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart, Cell
} from 'recharts';
import { 
  Plus, Edit, Trash2, Download, Printer, 
  CloudRain, Calendar, BookOpen, UserCheck, HardHat,
  Construction, Map as MapIcon, Clock, ArrowRightLeft, Save,
  Search, ThermometerSun, AlertTriangle, FileText, FileSpreadsheet, FileDown,
  ChevronDown, ChevronRight, PanelRight, PanelRightClose, ZoomIn, ZoomOut,
  TrendingUp, BarChart3, Maximize2, Minimize2, X, Layers, Activity
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Contract, DailyReport, DailyReportActivity, 
  PluviometryRecord, TechnicalSchedule, TechnicalServiceSchedule,
  ServiceComposition, Resource, Schedule, TimeUnit, Quotation,
  ControllerManpower, ControllerEquipment, Measurement
} from '../types';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useLocalStorage } from '../lib/useLocalStorage';
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
  controllerManpower?: ControllerManpower[];
  controllerEquipments?: ControllerEquipment[];
}

export function DailyReportView({ 
  contract, reports, onAdd, onUpdate, onDelete, onMoveActivity, 
  pluviometryRecords, readonly, companyLogo, companyLogoRight, logoMode,
  controllerManpower = [], controllerEquipments = []
}: DailyReportViewProps) {
  const [activeItem, setActiveItem] = useState<'activities' | 'viewer'>('activities');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [focusedPhotoIdx, setFocusedPhotoIdx] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasAutoExpanded = React.useRef(false);
  const selectedReport = React.useMemo(() => {
    const r = reports.find(r => r.id === selectedReportId) || (reports.length > 0 ? [...reports].sort((a,b) => b.date.localeCompare(a.date))[0] : null);
    if (!r) return null;

    const groupItems = (list: { description: string, quantity: number }[], extactor: (desc: string) => string) => {
      const map = new Map<string, number>();
      list.forEach(item => {
        const clean = extactor(item.description);
        const key = clean.toUpperCase();
        const existingKey = Array.from(map.keys()).find(k => k.toUpperCase() === key);
        if (existingKey) {
          map.set(existingKey, (map.get(existingKey) || 0) + item.quantity);
        } else {
          map.set(clean, item.quantity);
        }
      });
      return Array.from(map.entries()).map(([description, quantity]) => ({ description, quantity }));
    };

    const cleanManpower = (desc: string) => {
      const match = desc.match(/(.+)\s+\((.+)\)$/);
      const searchName = match ? match[1].trim() : desc.trim();
      const found = controllerManpower.find(m => m.name === searchName || `${m.name} (${m.role})` === desc);
      if (found && found.role) return found.role;
      return match ? match[2].trim() : desc.trim();
    };

    const cleanEquipment = (desc: string) => {
      const match = desc.match(/(.+)\s+\((.+)\)$/);
      const searchName = match ? match[1].trim() : desc.trim();
      const found = controllerEquipments.find(e => e.name === searchName || `${e.name} (${e.model})` === desc);
      if (found && found.type) return found.type;
      return match ? match[1].trim() : desc.trim();
    };

    return {
      ...r,
      manpower: groupItems(r.manpower, cleanManpower),
      equipment: groupItems(r.equipment, cleanEquipment)
    };
  }, [reports, selectedReportId]);

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
      const hasValidSelection = selectedReportId && reports.some(r => r.id === selectedReportId);
      if (!hasValidSelection) {
        const latest = [...reports].sort((a,b) => b.date.localeCompare(a.date))[0];
        setSelectedReportId(latest.id);
      }
      
      // Expand the latest month by default ONLY ONCE
      if (!hasAutoExpanded.current && monthKeys.length > 0) {
        setExpandedMonths([monthKeys[0]]);
        hasAutoExpanded.current = true;
      }
    } else {
      if (selectedReportId !== null) {
        setSelectedReportId(null);
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
    
    // Sort reports by date descending
    const contractReports = reports
      .filter(r => r.contractId === contract.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const latestReport = contractReports[0];
    
    let defaultManpower = [];
    let defaultEquipment = [];
    
    if (latestReport) {
      defaultManpower = JSON.parse(JSON.stringify(latestReport.manpower));
      defaultEquipment = JSON.parse(JSON.stringify(latestReport.equipment));
    } else {
      // Auto-populate from contract's manpower & equipments
      const filteredManpower = (controllerManpower || []).filter(m => m.contractId === contract.id);
      const mpMap = new Map<string, number>();
      filteredManpower.forEach(m => {
        mpMap.set(m.role || 'Geral', (mpMap.get(m.role || 'Geral') || 0) + 1);
      });
      defaultManpower = Array.from(mpMap.entries()).map(([desc, qty]) => ({ description: desc, quantity: qty }));

      const filteredEquipment = (controllerEquipments || []).filter(e => e.contractId === contract.id);
      const eqMapInit = new Map<string, number>();
      filteredEquipment.forEach(e => {
        eqMapInit.set(e.type || 'Equipamento', (eqMapInit.get(e.type || 'Equipamento') || 0) + 1);
      });
      defaultEquipment = Array.from(eqMapInit.entries()).map(([desc, qty]) => ({ description: desc, quantity: qty }));
    }

    onAdd({
      contractId: contract.id,
      date: today,
      weatherMorning: 'Bom',
      weatherAfternoon: 'Bom',
      weatherNight: 'Bom',
      rainfallMm: 0,
      manpower: defaultManpower,
      equipment: defaultEquipment,
      activities: [],
      accidents: '',
      photos: []
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

  const handleUpdateManpower = (updatedManpower: any[]) => {
    if (!selectedReport) return;
    onUpdate({ ...selectedReport, manpower: updatedManpower });
    
    // Cascade to subsequent dates
    const subsequentReports = reports.filter(r => r.contractId === contract.id && r.date > selectedReport.date);
    subsequentReports.forEach(r => {
      onUpdate({ ...r, manpower: updatedManpower });
    });
  };

  const handleUpdateEquipment = (updatedEquipment: any[]) => {
    if (!selectedReport) return;
    onUpdate({ ...selectedReport, equipment: updatedEquipment });
    
    // Cascade to subsequent dates
    const subsequentReports = reports.filter(r => r.contractId === contract.id && r.date > selectedReport.date);
    subsequentReports.forEach(r => {
      onUpdate({ ...r, equipment: updatedEquipment });
    });
  };

  const generateRdoPdf = async (report: DailyReport) => {
    const doc = new jsPDF() as any;
    const pluviometry = pluviometryRecords.find(p => p.date === report.date);
    
    // Dimensions and Frame
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, doc.internal.pageSize.height - (margin * 2) + 4);

    // Header Structure
    doc.setFillColor(30, 58, 138); 
    doc.rect(margin, margin, contentWidth, 10, 'F');
    
    // Logos logic
    const mode = logoMode || 'left';
    const showLeft = (mode === 'left' || mode === 'both') && companyLogo;
    const showRight = (mode === 'right' || mode === 'both') && companyLogoRight;

    if (showLeft) {
      try {
        const props = doc.getImageProperties(companyLogo!);
        const ratio = props.width / props.height;
        let w = 8, h = 8 / ratio;
        if (h > 8) { h = 8; w = 8 * ratio; }
        doc.addImage(companyLogo!, 'PNG', margin + 1, margin + 1 + (8 - h) / 2, w, h);
      } catch (e) { console.error(e); }
    }
    
    if (showRight) {
      try {
        const props = doc.getImageProperties(companyLogoRight!);
        const ratio = props.width / props.height;
        let w = 8, h = 8 / ratio;
        if (h > 8) { h = 8; w = 8 * ratio; }
        doc.addImage(companyLogoRight!, 'PNG', pageWidth - margin - 1 - w, margin + 1 + (8 - h) / 2, w, h);
      } catch (e) { console.error(e); }
    }

    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DIÁRIO DE OCORRÊNCIAS - RDO', pageWidth / 2, margin + 7, { align: 'center' });
    
    doc.setTextColor(0);
    
    const headerData = [
      ['Nº DO RDO:', `RDO-${reports.indexOf(report) + 1}`, 'DATA DO REGISTRO:', new Date(report.date + 'T12:00:00').toLocaleDateString('pt-BR')],
      ['CONTRATO:', contract.contractNumber, 'CONTRATANTE:', contract.client || 'N/A'],
      ['OBJETO:', contract.object, 'CONTRATADA:', contract.contractor || 'CONTRATADA']
    ];

    autoTable(doc, {
      startY: margin + 11,
      body: headerData,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.2, fontStyle: 'bold', textColor: [60,60,60] },
      columnStyles: { 
        0: { cellWidth: 25, fillColor: [248, 250, 252] }, 
        1: { cellWidth: 70 },
        2: { cellWidth: 30, fillColor: [248, 250, 252] },
        3: { cellWidth: 'auto' }
      }
    });

    // Helper for Section Titles
    const sectionHeader = (title: string, startY: number) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, startY, contentWidth, 5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(title, margin + 2, startY + 3.8);
      doc.setTextColor(0);
      return startY + 5;
    };
    
    // Config values
    const morning = pluviometry?.morningStatus || report.weatherMorning;
    const afternoon = pluviometry?.afternoonStatus || report.weatherAfternoon;
    const night = pluviometry?.nightStatus || report.weatherNight;
    const rain = pluviometry?.rainfallMm || report.rainfallMm;

    let currentY = (doc as any).lastAutoTable.finalY + 3;
    currentY = sectionHeader('1. CONDIÇÕES CLIMÁTICAS (PLUVIOMETRIA)', currentY);

    autoTable(doc, {
        startY: currentY,
        head: [['Noite Ant.', 'Manhã', 'Tarde', 'Índice (mm)']],
        body: [[night, morning, afternoon, `${rain} mm`]],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.5, cellPadding: 1.2 },
        styles: { halign: 'center', fontSize: 6.5, cellPadding: 1.2, textColor: [50,50,50] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;
    currentY = sectionHeader('2. EFETIVO', currentY);

    const mpMap = new Map<string, number>();
    report.manpower.forEach(m => mpMap.set(m.description.toUpperCase(), (mpMap.get(m.description.toUpperCase()) || 0) + m.quantity));
    const manpowerArr = Array.from(mpMap.entries());

    const mpBody = [];
    for (let i = 0; i < 14; i++) {
        const item1 = manpowerArr[i];
        const item2 = manpowerArr[i + 14];
        mpBody.push([
            item1 ? item1[0] : '', item1 ? item1[1] : '-',
            item2 ? item2[0] : '', item2 ? item2[1] : '-'
        ]);
    }
    
    autoTable(doc, {
        startY: currentY,
        head: [['DESCRIÇÃO', 'QTDE', 'DESCRIÇÃO', 'QTDE']],
        body: mpBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontSize: 6.5, cellPadding: 1 },
        styles: { fontSize: 6, cellPadding: 1, minCellHeight: 4, textColor: [50,50,50] },
        columnStyles: { 
            0: { cellWidth: (contentWidth / 2) - 15 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: (contentWidth / 2) - 15 },
            3: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;
    currentY = sectionHeader('3. EQUIPAMENTOS', currentY);

    const eqMap = new Map<string, number>();
    report.equipment.forEach(e => eqMap.set(e.description.toUpperCase(), (eqMap.get(e.description.toUpperCase()) || 0) + e.quantity));
    const eqArr = Array.from(eqMap.entries());

    const eqBody = [];
    for (let i = 0; i < 14; i++) {
        const item1 = eqArr[i];
        const item2 = eqArr[i + 14];
        eqBody.push([
            item1 ? item1[0] : '', item1 ? item1[1] : '-',
            item2 ? item2[0] : '', item2 ? item2[1] : '-'
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        head: [['DESCRIÇÃO', 'QTDE', 'DESCRIÇÃO', 'QTDE']],
        body: eqBody,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontSize: 6.5, cellPadding: 1 },
        styles: { fontSize: 6, cellPadding: 1, minCellHeight: 4, textColor: [50,50,50] },
        columnStyles: { 
            0: { cellWidth: (contentWidth / 2) - 15 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: (contentWidth / 2) - 15 },
            3: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;
    currentY = sectionHeader('4. ATIVIDADES EXECUTADAS E PROGRESSO', currentY);

    const activitiesBody = report.activities.map(a => [a.code || '-', a.description, a.type]);
    autoTable(doc, {
        startY: currentY,
        head: [['CÓD.', 'DESCRIÇÃO DA ATIVIDADE', 'TIPO / CATEGORIA']],
        body: activitiesBody.length > 0 ? activitiesBody : [['-', 'Nenhum registro de atividade para este dia.', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 6.5, cellPadding: 1.2 },
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 35 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;

    if (report.accidents) {
        currentY = sectionHeader('5. OCORRÊNCIAS E ACIDENTES', currentY);
        autoTable(doc, {
          startY: currentY,
          body: [[report.accidents]],
          theme: 'grid',
          styles: { minCellHeight: 12, fontSize: 6.5, cellPadding: 1.2, textColor: [220, 38, 38] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 3;
    }

    if (report.fiscalizationComments) {
        currentY = sectionHeader('6. COMENTÁRIOS DA FISCALIZAÇÃO', currentY);
        autoTable(doc, {
          startY: currentY,
          body: [[report.fiscalizationComments]],
          theme: 'grid',
          styles: { minCellHeight: 12, fontSize: 6.5, cellPadding: 1.2, fontStyle: 'italic' }
        });
        currentY = (doc as any).lastAutoTable.finalY + 3;
    }

    const pageHeight = doc.internal.pageSize.height;
    if (currentY > pageHeight - 35) doc.addPage();
    
    currentY = Math.max(currentY + 5, pageHeight - 35);

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, contentWidth / 2 - 2, 25, 'FD');
    doc.rect(pageWidth / 2 + 2, currentY, contentWidth / 2 - 2, 25, 'FD');

    doc.line(margin + 5, currentY + 18, (margin + contentWidth / 2) - 10, currentY + 18);
    doc.line(pageWidth / 2 + 7, currentY + 18, pageWidth - margin - 5, currentY + 18);
    
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('ENGENHEIRO DA OBRA', margin + contentWidth / 4, currentY + 22, { align: 'center' });
    doc.text('FISCALIZAÇÃO', (pageWidth / 2) + (contentWidth / 4), currentY + 22, { align: 'center' });
    
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura e Carimbo', margin + contentWidth / 4, currentY + 16, { align: 'center' });
    doc.text('Assinatura e Carimbo', (pageWidth / 2) + (contentWidth / 4), currentY + 16, { align: 'center' });

    // Append Photos Page
    if (report.photos && report.photos.length > 0) {
      doc.addPage();
      
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.rect(margin - 2, margin - 2, contentWidth + 4, doc.internal.pageSize.height - (margin * 2) + 4);
  
      doc.setFillColor(30, 58, 138); 
      doc.rect(margin, margin, contentWidth, 10, 'F');
      
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('REGISTRO FOTOGRÁFICO', pageWidth / 2, margin + 7, { align: 'center' });
      
      let imgY = margin + 15;
      for (const p of report.photos) {
        const url = typeof p === 'string' ? p : p.url;
        const desc = typeof p === 'string' ? '' : (p.description || '');
        if (imgY + 90 > doc.internal.pageSize.height - margin) {
          doc.addPage();
          imgY = margin + 15;
        }
        try {
          const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext('2d');
          if(ctx) {
            ctx.drawImage(loadedImg, 0, 0);
            const b64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const props = doc.getImageProperties(b64);
            const ratio = props.width / props.height;
            let imgW = contentWidth * 0.8;
            let imgH = imgW / ratio;
            if (imgH > 80) {
              imgH = 80;
              imgW = imgH * ratio;
            }
            doc.addImage(b64, 'JPEG', margin + (contentWidth - imgW) / 2, imgY, imgW, imgH);
            imgY += imgH + 2;
            if (desc) {
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(desc, pageWidth / 2, imgY + 2, { align: 'center', maxWidth: contentWidth * 0.8 });
              const lines = doc.splitTextToSize(desc, contentWidth * 0.8);
              imgY += (lines.length * 4) + 6;
            } else {
              imgY += 8;
            }
          }
        } catch(e) {
             console.error("Photo error", e);
        }
      }
    }

    return doc;
  };

  const handleExportPDF = async (report: DailyReport) => {
    const doc = await generateRdoPdf(report);
    doc.save(`RDO_${contract.contractNumber}_${report.date}.pdf`);
  };

  const handlePrintRDO = async (report: DailyReport) => {
    try {
      const doc = await generateRdoPdf(report);
      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      let printed = false;
      try {
        const printWindow = window.open(pdfUrl);
        if (printWindow) {
          printed = true;
        }
      } catch (err) {
        console.warn("window.open blocked or failed", err);
      }
      
      if (!printed) {
        console.warn("Falling back to download due to popup blocker.");
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `RDO_${contract.contractNumber}_${report.date}_print.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
    } catch (e) {
      console.error("Error generating or printing PDF", e);
    }
  };

  const handleExportExcel = async (report: DailyReport) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RDO');
    const pluviometry = pluviometryRecords.find(p => p.date === report.date);

    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RELATÓRIO DIÁRIO DE OCORRÊNCIAS - RDO';
    titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Info
    worksheet.addRow(['Data:', new Date(report.date + 'T12:00:00').toLocaleDateString('pt-BR'), 'RDO Nº:', reports.indexOf(report) + 1]);
    worksheet.addRow(['Contrato:', contract.contractNumber, 'Obra:', contract.object]);
    
    // Style Info block
    [2, 3].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.font = { size: 9 };
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      row.getCell(3).font = { bold: true };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });

    // Helper for Section Titles
    const addSectionHeader = (title: string, color: string, textColor = 'FFFFFFFF') => {
      const row = worksheet.addRow([title]);
      worksheet.mergeCells(`A${row.number}:D${row.number}`);
      row.font = { bold: true, size: 10, color: { argb: textColor } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    };

    // Weather
    addSectionHeader('1. CONDIÇÕES CLIMÁTICAS (PLUVIOMETRIA)', 'FF475569');
    const headWeather = worksheet.addRow(['Noite Anterior', 'Manhã', 'Tarde', 'Precipitação (mm)']);
    headWeather.font = { bold: true, size: 9 };
    headWeather.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    
    worksheet.addRow([
      pluviometry?.nightStatus || report.weatherNight,
      pluviometry?.morningStatus || report.weatherMorning,
      pluviometry?.afternoonStatus || report.weatherAfternoon,
      (pluviometry?.rainfallMm || report.rainfallMm) + ' mm'
    ]).font = { size: 9 };

    // Manpower and Equipment
    addSectionHeader('2. EFETIVO', 'FF16A34A');
    
    const headMp = worksheet.addRow(['Descrição', 'Quantidade', 'Descrição', 'Quantidade']);
    headMp.font = { bold: true, size: 9 };
    headMp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const mpMap = new Map<string, number>();
    report.manpower.forEach(m => mpMap.set(m.description.toUpperCase(), (mpMap.get(m.description.toUpperCase()) || 0) + m.quantity));
    const manpowerArr = Array.from(mpMap.entries());

    for (let i = 0; i < 14; i++) {
       const item1 = manpowerArr[i];
       const item2 = manpowerArr[i + 14];
       worksheet.addRow([
          item1 ? item1[0] : '', item1 ? item1[1] : '',
          item2 ? item2[0] : '', item2 ? item2[1] : ''
       ]).font = { size: 9 };
    }
    worksheet.addRow([]);

    addSectionHeader('3. EQUIPAMENTOS', 'FFEA580C');
    
    const headEq = worksheet.addRow(['Descrição', 'Quantidade', 'Descrição', 'Quantidade']);
    headEq.font = { bold: true, size: 9 };
    headEq.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const eqMapExcel = new Map<string, number>();
    report.equipment.forEach(e => eqMapExcel.set(e.description.toUpperCase(), (eqMapExcel.get(e.description.toUpperCase()) || 0) + e.quantity));
    const eqArr = Array.from(eqMapExcel.entries());
    
    for (let i = 0; i < 14; i++) {
       const item1 = eqArr[i];
       const item2 = eqArr[i + 14];
       worksheet.addRow([
          item1 ? item1[0] : '', item1 ? item1[1] : '',
          item2 ? item2[0] : '', item2 ? item2[1] : ''
       ]).font = { size: 9 };
    }

    // Activities
    addSectionHeader('4. ATIVIDADES EXECUTADAS E PROGRESSO', 'FF0F172A');
    const headAct = worksheet.addRow(['Cód.', 'Atividade', 'Tipo']);
    worksheet.mergeCells(`C${headAct.number}:D${headAct.number}`);
    headAct.font = { bold: true, size: 9 };
    headAct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    
    if (report.activities.length === 0) {
      const row = worksheet.addRow(['-', 'Nenhum registro de atividade.', '-']);
      worksheet.mergeCells(`C${row.number}:D${row.number}`);
      row.font = { size: 9 };
    } else {
      report.activities.forEach(a => {
        const row = worksheet.addRow([a.code, a.description, a.type]);
        worksheet.mergeCells(`C${row.number}:D${row.number}`);
        row.font = { size: 9 };
      });
    }

    // Occurrences
    if (report.accidents) {
      addSectionHeader('5. OCORRÊNCIAS E ACIDENTES', 'FFDC2626');
      const row = worksheet.addRow([report.accidents]);
      worksheet.mergeCells(`A${row.number}:D${row.number + 1}`);
      row.font = { size: 9, color: { argb: 'FFDC2626' } };
      worksheet.addRow([]);
    }

    // Fiscalization Comments
    if (report.fiscalizationComments) {
      addSectionHeader('6. COMENTÁRIOS DA FISCALIZAÇÃO', 'FF334155');
      const row = worksheet.addRow([report.fiscalizationComments]);
      worksheet.mergeCells(`A${row.number}:D${row.number + 1}`);
      row.font = { italic: true, size: 9 };
      worksheet.addRow([]);
    }

    worksheet.addRow([]);
    
    // Signatures
    const sigRow = worksheet.addRow(['__________________________________', '', '__________________________________']);
    worksheet.mergeCells(`A${sigRow.number}:B${sigRow.number}`);
    worksheet.mergeCells(`C${sigRow.number}:D${sigRow.number}`);
    sigRow.alignment = { horizontal: 'center' };
    
    const sigLabelRow = worksheet.addRow(['Engenheiro da Obra', '', 'Fiscalização']);
    worksheet.mergeCells(`A${sigLabelRow.number}:B${sigLabelRow.number}`);
    worksheet.mergeCells(`C${sigLabelRow.number}:D${sigLabelRow.number}`);
    sigLabelRow.alignment = { horizontal: 'center' };
    sigLabelRow.font = { size: 9, bold: true };

    worksheet.columns = [
      { width: 25 },
      { width: 45 },
      { width: 25 },
      { width: 45 }
    ];

    if (report.photos && report.photos.length > 0) {
      const photoSheet = workbook.addWorksheet('Registro Fotográfico');
      photoSheet.columns = [{ width: 45 }, { width: 45 }];
      let r = 1;
      let c = 1;
      for (const p of report.photos) {
        const url = typeof p === 'string' ? p : p.url;
        const desc = typeof p === 'string' ? '' : (p.description || '');
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: url.toLowerCase().includes('png') ? 'png' : 'jpeg',
          });
          photoSheet.addImage(imageId, {
            tl: { col: c - 1, row: r },
            ext: { width: 300, height: 300 }
          });
          if (desc) {
            const descRow = r + 15;
            photoSheet.getCell(descRow, c).value = desc;
            photoSheet.getCell(descRow, c).font = { size: 9 };
            photoSheet.getCell(descRow, c).alignment = { wrapText: true, horizontal: 'center' };
          }
          c++;
          if (c > 2) {
            c = 1;
            r += 17;
          }
        } catch (e) { console.error('Failed to attach photo', e); }
      }
    }

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
                <CardTitle className="text-base font-bold">Planilha de Atividades</CardTitle>
                <CardDescription className="text-sm">Todas as atividades registradas nos diários.</CardDescription>
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
                  <TableHead className="w-32 text-sm uppercase font-bold text-gray-500">Data</TableHead>
                  <TableHead className="text-sm uppercase font-bold text-gray-500">Atividade / Descrição</TableHead>
                  <TableHead className="w-48 text-sm uppercase font-bold text-gray-500 border-l">Tipo</TableHead>
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
                          className="h-8 text-sm w-32 border-transparent bg-transparent hover:border-gray-200 focus:border-blue-500 p-1"
                          value={a.date}
                          onChange={e => handleUpdateActivityDate(a.reportId, a.id, e.target.value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        disabled={readonly}
                        className="h-8 text-sm border-transparent hover:border-gray-200 focus:border-blue-500 transition-all" 
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
                        <SelectTrigger className="h-8 text-sm border-transparent"><SelectValue /></SelectTrigger>
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
            {/* Sidebar Histórico */}
            <div className="col-span-12 lg:col-span-3">
              <Card className="h-[calc(100vh-360px)] flex flex-col border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-4 border-b shrink-0 bg-gray-50/50">
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
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
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                          >
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{getMonthLabel(monthKey)}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="h-5 text-[10px] font-black rounded-md">{monthReports.length}</Badge>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="pl-2 space-y-1.5 border-l border-gray-200 ml-1">
                              {monthReports.map((r) => {
                                const reportIdx = reports.findIndex(rep => rep.id === r.id);
                                const pluvi = pluviometryRecords.find(p => p.date === r.date);
                                const isImp = pluvi?.morningStatus === 'Impraticável' || pluvi?.afternoonStatus === 'Impraticável' || r.weatherMorning === 'Impraticável' || r.weatherAfternoon === 'Impraticável';
                                const isRain = pluvi?.morningStatus === 'Chuvoso' || pluvi?.afternoonStatus === 'Chuvoso' || r.weatherMorning === 'Chuvoso' || r.weatherAfternoon === 'Chuvoso';
                                const weatherEmoji = isImp ? '🛑' : isRain ? '🌧️' : '☀️';

                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => setSelectedReportId(r.id)}
                                    className={cn(
                                      "w-full text-left p-3 rounded-xl transition-all border",
                                      selectedReportId === r.id 
                                        ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-100 text-white"
                                        : "border-gray-50 bg-white hover:bg-gray-50/80 text-gray-800"
                                    )}
                                  >
                                    <div className="flex justify-between items-start mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold opacity-75">{weatherEmoji}</span>
                                        <span className={cn("font-black text-xs tracking-wider uppercase", selectedReportId === r.id ? "text-white" : "text-blue-900")}>
                                          RDO #{reportIdx + 1}
                                        </span>
                                      </div>
                                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", selectedReportId === r.id ? "text-blue-100" : "text-gray-400")}>
                                        {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold opacity-80">
                                      <span className="capitalize">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                      <span>{r.activities.length} Ativ. • {pluvi?.rainfallMm || r.rainfallMm}mm</span>
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
                        <p className="text-sm font-bold uppercase tracking-wider text-gray-300">Nenhum RDO Criado</p>
                      </div>
                    )}
                  </div>
                  </ScrollArea>
                </div>
              </Card>
            </div>

            {/* Selected RDO Details Viewer Panel */}
            <div className="col-span-12 lg:col-span-9">
              {selectedReport ? (
                <div className="space-y-6">
                  {/* Modern Header Banner */}
                  <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-r from-gray-50 to-white">
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-100 text-blue-900 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            DIÁRIO OFICIAL DE OBRA
                          </span>
                          <span className="bg-gray-100 text-gray-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                            RDO #{reports.findIndex(rep => rep.id === selectedReport.id) + 1}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
                          Relatório Diário de Ocorrências
                        </h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                          {new Date(selectedReport.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} 
                          <span className="mx-1 text-gray-300">•</span>
                          <span className="text-blue-600 capitalize font-black">{new Date(selectedReport.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="font-extrabold uppercase text-[10px] tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5">
                              <Download className="w-3.5 h-3.5" /> EXPORTAR
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 border border-slate-200 shadow-xl rounded-xl bg-white p-1 z-50">
                            <DropdownMenuItem 
                              onClick={() => handleExportPDF(selectedReport)} 
                              className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-lg p-2"
                            >
                              <FileText className="w-4 h-4 text-red-500" />
                              PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExportExcel(selectedReport)} 
                              className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-lg p-2"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                              Excel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePrintRDO(selectedReport)} 
                          className="font-extrabold uppercase text-[10px] tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" /> IMPRIMIR
                        </Button>
                        {!readonly && (
                          <Button variant="destructive" size="sm" onClick={() => onDelete(selectedReport.id)} className="rounded-xl">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Bento Row of KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* Weather card */}
                    <Card className="border border-gray-100 shadow-sm rounded-2xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Status Climático</span>
                        <CloudRain className="w-4 h-4 text-blue-500" />
                      </div>
                      {(() => {
                        const pluvi = pluviometryRecords.find(p => p.date === selectedReport.date);
                        const night = pluvi?.nightStatus || selectedReport.weatherNight;
                        const morning = pluvi?.morningStatus || selectedReport.weatherMorning;
                        const afternoon = pluvi?.afternoonStatus || selectedReport.weatherAfternoon;
                        const rainfall = pluvi?.rainfallMm || selectedReport.rainfallMm;

                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-black uppercase">
                              <div className="bg-gray-50 p-1.5 rounded-lg">
                                <span className="text-gray-400 block text-[8px]">NOITE</span>
                                <span>{night === 'Bom' ? '☀️' : night === 'Chuvoso' ? '🌧️' : '🛑'}</span>
                              </div>
                              <div className="bg-gray-50 p-1.5 rounded-lg">
                                <span className="text-gray-400 block text-[8px]">MANHÃ</span>
                                <span>{morning === 'Bom' ? '☀️' : morning === 'Chuvoso' ? '🌧️' : '🛑'}</span>
                              </div>
                              <div className="bg-gray-50 p-1.5 rounded-lg">
                                <span className="text-gray-400 block text-[8px]">TARDE</span>
                                <span>{afternoon === 'Bom' ? '☀️' : afternoon === 'Chuvoso' ? '🌧️' : '🛑'}</span>
                              </div>
                            </div>
                            <div className="text-center bg-blue-50/50 p-1.5 rounded-xl border border-blue-100">
                              <span className="text-[11px] font-black text-blue-800 uppercase">Precipitação: {rainfall} mm</span>
                            </div>
                          </div>
                        );
                      })()}
                    </Card>

                    {/* Workforce KPI card */}
                    <Card className="border border-gray-100 shadow-sm rounded-2xl p-4 bg-white flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Efetivo Homens-Dia</span>
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="py-2">
                        <div className="text-2xl font-black font-mono text-gray-900 leading-none">
                          {selectedReport.manpower.reduce((acc, curr) => acc + curr.quantity, 0)}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">Colaboradores no campo</span>
                      </div>
                    </Card>

                    {/* Equipment KPI card */}
                    <Card className="border border-gray-100 shadow-sm rounded-2xl p-4 bg-white flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Frota de Máquinas</span>
                        <Construction className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="py-2">
                        <div className="text-2xl font-black font-mono text-gray-900 leading-none">
                          {selectedReport.equipment.reduce((acc, curr) => acc + curr.quantity, 0)}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">Equipamentos mobilizados</span>
                      </div>
                    </Card>

                    {/* Security KPI card */}
                    <Card className="border border-gray-100 shadow-sm rounded-2xl p-4 bg-white flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Segurança e Incidentes</span>
                        <AlertTriangle className={cn("w-4 h-4", selectedReport.accidents ? "text-red-500 animate-pulse" : "text-emerald-500")} />
                      </div>
                      <div className="py-2">
                        {selectedReport.accidents ? (
                          <div className="bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-lg p-2 text-center border border-red-200">
                            ⚠ Ocorrência Registrada
                          </div>
                        ) : (
                          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg p-2 text-center border border-emerald-200">
                            ✓ 100% Seguro / Sem Ocorrências
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block text-center mt-1">Segurança operacional</span>
                      </div>
                    </Card>
                  </div>

                  <ScrollArea className="h-[calc(100vh-520px)] pr-2">
                    <div className="space-y-6">
                      {/* Side by side: workforce & equipment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                          <CardHeader className="p-4 border-b bg-gray-50/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-600" /> Efetivo (Mão de Obra)
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono font-black text-[10px]">{selectedReport.manpower.length} Categorias</Badge>
                          </CardHeader>
                          <CardContent className="p-4 space-y-2">
                            {selectedReport.manpower.map((m, idx) => (
                              <div key={idx} className="flex gap-2 items-center justify-between p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-xs font-black uppercase text-gray-700">{m.description}</span>
                                <div className="flex items-center gap-2">
                                  {readonly ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-lg font-mono">{m.quantity}</span>
                                  ) : (
                                    <>
                                      <input 
                                        type="number" 
                                        min="0"
                                        className="h-8 w-14 text-center text-xs font-mono font-black border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={m.quantity} 
                                        onChange={e => {
                                          const val = parseInt(e.target.value) || 0;
                                          const updated = selectedReport.manpower.map((item, i) => i === idx ? { ...item, quantity: val } : item);
                                          handleUpdateManpower(updated);
                                        }}
                                      />
                                      <Button variant="ghost" size="xs" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 p-0 rounded-md" onClick={() => {
                                        const updated = selectedReport.manpower.filter((_, i) => i !== idx);
                                        handleUpdateManpower(updated);
                                      }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            {selectedReport.manpower.length === 0 && (
                              <div className="text-center py-4 space-y-2">
                                <p className="text-xs text-gray-400 italic font-bold">Nenhum profissional listado para este dia.</p>
                                {!readonly && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-[10px] font-black uppercase text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 px-4"
                                    onClick={() => {
                                      const cMan = (controllerManpower || []).filter(m => m.contractId === contract.id);
                                      const mappedMap = new Map<string, number>();
                                      cMan.forEach(m => {
                                        mappedMap.set(m.role || 'Geral', (mappedMap.get(m.role || 'Geral') || 0) + 1);
                                      });
                                      const mapped = Array.from(mappedMap.entries()).map(([desc, qty]) => ({ description: desc, quantity: qty }));
                                      const finalMapped = mapped.length > 0 ? mapped : [
                                        { description: 'Engenheiro Residente', quantity: 1 },
                                        { description: 'Encarregado Geral', quantity: 1 },
                                        { description: 'Apontador', quantity: 1 },
                                        { description: 'Auxiliar Técnico', quantity: 1 },
                                        { description: 'Operador de Máquinas', quantity: 2 },
                                        { description: 'Servente de Obras', quantity: 4 }
                                      ];
                                      handleUpdateManpower(finalMapped);
                                    }}
                                  >
                                    ⚡ Importar do Contrato
                                  </Button>
                                )}
                              </div>
                            )}
                            {!readonly && (
                              <div className="flex gap-1.5 mt-2 pt-2 border-t">
                                <Input 
                                  placeholder="Nova cat. / função..." 
                                  id="new-manpower-desc"
                                  className="h-8 text-[11px] font-semibold"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const input = e.currentTarget;
                                      const desc = input.value.trim();
                                      if (desc) {
                                        handleUpdateManpower([...selectedReport.manpower, { description: desc, quantity: 1 }]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button size="sm" className="h-8 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                                  const input = document.getElementById('new-manpower-desc') as HTMLInputElement;
                                  const desc = input?.value?.trim();
                                  if (desc) {
                                    handleUpdateManpower([...selectedReport.manpower, { description: desc, quantity: 1 }]);
                                    input.value = '';
                                  }
                                }}>
                                  +
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                          <CardHeader className="p-4 border-b bg-gray-50/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                              <Construction className="w-4 h-4 text-orange-600" /> Equipamentos
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono font-black text-[10px]">{selectedReport.equipment.length} Tipos</Badge>
                          </CardHeader>
                          <CardContent className="p-4 space-y-2">
                            {selectedReport.equipment.map((e, idx) => (
                              <div key={idx} className="flex gap-2 items-center justify-between p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-xs font-black uppercase text-gray-700">{e.description}</span>
                                <div className="flex items-center gap-2">
                                  {readonly ? (
                                    <span className="bg-orange-100 text-orange-800 text-xs font-black px-2.5 py-1 rounded-lg font-mono">{e.quantity}</span>
                                  ) : (
                                    <>
                                      <input 
                                        type="number" 
                                        min="0"
                                        className="h-8 w-14 text-center text-xs font-mono font-black border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        value={e.quantity} 
                                        onChange={val => {
                                          const value = parseInt(val.target.value) || 0;
                                          const updated = selectedReport.equipment.map((item, i) => i === idx ? { ...item, quantity: value } : item);
                                          handleUpdateEquipment(updated);
                                        }}
                                      />
                                      <Button variant="ghost" size="xs" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 p-0 rounded-md" onClick={() => {
                                        const updated = selectedReport.equipment.filter((_, i) => i !== idx);
                                        handleUpdateEquipment(updated);
                                      }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            {selectedReport.equipment.length === 0 && (
                              <div className="text-center py-4 space-y-2">
                                <p className="text-xs text-gray-400 italic font-bold">Nenhum equipamento listado para este dia.</p>
                                {!readonly && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-[10px] font-black uppercase text-orange-600 border-orange-200 hover:bg-orange-50 h-8 px-4"
                                    onClick={() => {
                                      const cEq = (controllerEquipments || []).filter(e => e.contractId === contract.id);
                                      const mappedMap = new Map<string, number>();
                                      cEq.forEach(e => {
                                        mappedMap.set(e.type || 'Equipamento', (mappedMap.get(e.type || 'Equipamento') || 0) + 1);
                                      });
                                      const mapped = Array.from(mappedMap.entries()).map(([desc, qty]) => ({ description: desc, quantity: qty }));
                                      const finalMapped = mapped.length > 0 ? mapped : [
                                        { description: 'Escavadeira Hidráulica', quantity: 1 },
                                        { description: 'Retroescavadeira', quantity: 1 },
                                        { description: 'Caminhão Caçamba', quantity: 2 },
                                        { description: 'Rolo Compactador', quantity: 1 },
                                        { description: 'Motoniveladora', quantity: 1 }
                                      ];
                                      handleUpdateEquipment(finalMapped);
                                    }}
                                  >
                                    ⚡ Importar do Contrato
                                  </Button>
                                )}
                              </div>
                            )}
                            {!readonly && (
                              <div className="flex gap-1.5 mt-2 pt-2 border-t">
                                <Input 
                                  placeholder="Novo equip. / frota..." 
                                  id="new-equipment-desc"
                                  className="h-8 text-[11px] font-semibold"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const input = e.currentTarget;
                                      const desc = input.value.trim();
                                      if (desc) {
                                        handleUpdateEquipment([...selectedReport.equipment, { description: desc, quantity: 1 }]);
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button size="sm" className="h-8 text-xs font-black bg-orange-600 hover:bg-orange-700 text-white" onClick={() => {
                                  const input = document.getElementById('new-equipment-desc') as HTMLInputElement;
                                  const desc = input?.value?.trim();
                                  if (desc) {
                                    handleUpdateEquipment([...selectedReport.equipment, { description: desc, quantity: 1 }]);
                                    input.value = '';
                                  }
                                }}>
                                  +
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Activities Block */}
                      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-4 border-b bg-gray-50/50 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                            <HardHat className="w-4 h-4 text-blue-600" /> Atividades Executadas
                          </CardTitle>
                          <Badge variant="outline" className="text-blue-600 border-blue-200 font-mono font-black text-[10px]">
                            {selectedReport.activities.length} Atividades
                          </Badge>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="text-xs uppercase font-black tracking-wider text-gray-505 w-24">Cód</TableHead>
                                <TableHead className="text-xs uppercase font-black tracking-wider text-gray-505">Descrição Geral da Atividade</TableHead>
                                <TableHead className="text-xs uppercase font-black tracking-wider text-gray-505 text-right">Classificação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedReport.activities.map(a => (
                                <TableRow key={a.id} className="hover:bg-gray-50/50">
                                  <TableCell className="py-3 text-xs font-mono font-black text-blue-600">{a.code || '-'}</TableCell>
                                  <TableCell className="py-3 text-xs font-medium text-gray-800">{a.description}</TableCell>
                                  <TableCell className="py-3 text-right">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-white rounded-lg px-2 py-0.5">
                                      {a.type}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {selectedReport.activities.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-6 text-gray-400 text-xs font-bold uppercase">
                                    Sem atividades mapeadas para este dia de obra.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>

                      {/* Comments and safety occurrences cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border border-amber-100 shadow-sm bg-amber-50/5 rounded-2xl overflow-hidden">
                          <CardHeader className="p-4 border-b border-amber-100 bg-amber-50/20">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-2">
                              <Search className="w-4 h-4 text-amber-600" /> Comentários da Fiscalização
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {readonly ? (
                              <p className="text-xs text-gray-600 leading-relaxed font-bold whitespace-pre-wrap">
                                {selectedReport.fiscalizationComments || "Nenhum apontamento inserido."}
                              </p>
                            ) : (
                              <textarea 
                                className="w-full text-xs font-medium p-3 border border-amber-100 bg-amber-50/10 rounded-xl min-h-[90px] focus:ring-1 focus:ring-amber-500 outline-none"
                                placeholder="Anotações feitas pela fiscalização..."
                                value={selectedReport.fiscalizationComments || ""}
                                onChange={e => onUpdate({...selectedReport, fiscalizationComments: e.target.value})}
                              />
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border border-red-100 shadow-sm bg-red-50/5 rounded-2xl overflow-hidden">
                          <CardHeader className="p-4 border-b border-red-100 bg-red-50/20">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" /> Relato de Ocorrências / Segurança
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {readonly ? (
                              <p className="text-xs text-gray-600 leading-relaxed font-bold whitespace-pre-wrap">
                                {selectedReport.accidents || "Nenhum incidente de segurança mapeado."}
                              </p>
                            ) : (
                              <textarea 
                                className="w-full text-xs font-medium p-3 border border-red-100 bg-red-50/10 rounded-xl min-h-[90px] focus:ring-1 focus:ring-red-500 outline-none"
                                placeholder="Registro detalhado de anomalias, acidentes ou quebras operacionais..."
                                value={selectedReport.accidents || ""}
                                onChange={e => onUpdate({...selectedReport, accidents: e.target.value})}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Photo Evidences Section (Registro Fotográfico) */}
                      <Card className="border border-blue-100 shadow-sm rounded-2xl bg-white mt-4">
                        <CardHeader className="bg-blue-50/50 rounded-t-2xl border-b border-blue-100 p-3">
                          <CardTitle className="text-[11px] font-black uppercase text-blue-800 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-600" /> Registro Fotográfico
                            {isUploading && <span className="ml-2 text-[10px] text-blue-600 font-normal">Enviando arquivos...</span>}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <DragDropContext onDragEnd={(result) => {
                            if (!result.destination) return;
                            const currentPhotos = (selectedReport.photos || []).map((p: any) => typeof p === 'string' ? { url: p, description: '' } : p);
                            const [reorderedItem] = currentPhotos.splice(result.source.index, 1);
                            currentPhotos.splice(result.destination.index, 0, reorderedItem);
                            onUpdate({...selectedReport, photos: currentPhotos});
                          }}>
                            <Droppable droppableId="photos-grid" direction="horizontal">
                              {(provided) => (
                                <div 
                                  className="flex flex-wrap gap-4" 
                                  {...provided.droppableProps} 
                                  ref={provided.innerRef}
                                >
                                  {(selectedReport.photos || []).map((photoObj: any, idx: number) => {
                                    const photo = typeof photoObj === 'string' ? { url: photoObj, description: '' } : photoObj;
                                    return (
                                      <Draggable key={photo.url || idx.toString()} draggableId={photo.url || idx.toString()} index={idx} isDragDisabled={readonly}>
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                          >
                                            <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer" onClick={() => setFocusedPhotoIdx(idx)}>
                                              <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                              {!readonly && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const updatedPhotos = selectedReport.photos!.filter((_: any, i: number) => i !== idx);
                                                    onUpdate({...selectedReport, photos: updatedPhotos as any});
                                                  }}
                                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              )}
                                              {photo.description && (
                                                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1">
                                                  <p className="text-[9px] text-white truncate text-center">{photo.description}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                  
                                  {!readonly && (
                                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-shrink-0 transition-colors">
                                      <Plus className="w-6 h-6 text-gray-400 mb-2" />
                                      <span className="text-[10px] text-gray-500 font-bold px-2 text-center uppercase">Adicionar<br />Foto</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={async e => {
                                          if (e.target.files && e.target.files.length > 0) {
                                            setIsUploading(true);
                                            const config = getSupabaseConfig();
                                            const supabase = createSupabaseClient(config.url, config.key);
                                            const newUrls: any[] = [];
                                            for (const file of Array.from(e.target.files)) {
                                              if (supabase) {
                                                const fileExt = file.name.split('.').pop() || 'jpg';
                                                const fileName = uuidv4() + '.' + fileExt;
                                                const { error } = await supabase.storage.from('rdo_photos').upload(fileName, file);
                                                if (!error) {
                                                  const { data } = supabase.storage.from('rdo_photos').getPublicUrl(fileName);
                                                  newUrls.push({ url: data.publicUrl, description: '' });
                                                } else {
                                                  console.error("error uploading photo: ", error);
                                                }
                                              } else {
                                                newUrls.push({ url: URL.createObjectURL(file), description: '' });
                                              }
                                            }
                                            if (newUrls.length > 0) {
                                              const currentPhotos = (selectedReport.photos || []).map((p: any) => typeof p === 'string' ? { url: p, description: '' } : p);
                                              onUpdate({...selectedReport, photos: [...currentPhotos, ...newUrls]});
                                            }
                                            setIsUploading(false);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                  {readonly && (!selectedReport.photos || selectedReport.photos.length === 0) && (
                                    <p className="text-xs text-gray-500 font-bold w-full text-center py-4">Nenhum registro fotográfico anexado.</p>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                        </CardContent>
                      </Card>

                      <AnimatePresence>
                        {focusedPhotoIdx !== null && (
                          <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
                            onClick={() => setFocusedPhotoIdx(null)}
                          >
                            <button className="absolute top-6 right-6 text-white hover:text-gray-300 p-2 focus:outline-none" onClick={() => setFocusedPhotoIdx(null)}>
                              <X className="w-8 h-8" />
                            </button>
                            <div className="max-w-4xl w-full h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                              <div className="flex-1 min-h-0 bg-transparent flex items-center justify-center p-4">
                                <img 
                                  src={
                                    typeof (selectedReport.photos || [])[focusedPhotoIdx] === 'string' 
                                      ? (selectedReport.photos || [])[focusedPhotoIdx] as string
                                      : ((selectedReport.photos || [])[focusedPhotoIdx] as any)?.url
                                  } 
                                  alt="Zoom" 
                                  className="max-w-full max-h-full object-contain rounded-md" 
                                />
                              </div>
                              <div className="h-40 shrink-0 p-4 w-full max-w-2xl mx-auto flex flex-col gap-2">
                                <label className="text-white text-sm font-semibold uppercase">Descrição da Foto</label>
                                <textarea
                                  disabled={readonly}
                                  placeholder={readonly ? "Sem descrição" : "Adicione uma descrição detalhada para essa foto..."}
                                  className="w-full h-24 p-3 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:bg-transparent"
                                  value={
                                    typeof (selectedReport.photos || [])[focusedPhotoIdx] === 'string' 
                                      ? ''
                                      : ((selectedReport.photos || [])[focusedPhotoIdx] as any)?.description || ''
                                  }
                                  onChange={e => {
                                    if (readonly) return;
                                    const currentPhotos = (selectedReport.photos || []).map((p: any) => typeof p === 'string' ? { url: p, description: '' } : { ...p });
                                    currentPhotos[focusedPhotoIdx].description = e.target.value;
                                    onUpdate({...selectedReport, photos: currentPhotos});
                                  }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Resident Stamp layout showing digital signatures */}
                      <Card className="border border-gray-100 bg-gray-50/30 rounded-2xl p-6">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-4 text-center">VALIDAÇÃO DIGITAL DO DIÁRIO</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-40 border-b border-gray-300 pb-1 mb-2 font-mono text-[9px] text-gray-400">
                              Validação por biometria via App
                            </div>
                            <span className="text-xs font-black uppercase text-gray-700">Engenheiro Responsável</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">RESPONSÁVEL TÉCNICO (CREA)</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-40 border-b border-gray-300 pb-1 mb-2 font-mono text-[9px] text-gray-300 italic">
                              Aguardando assinatura
                            </div>
                            <span className="text-xs font-black uppercase text-gray-400">Fiscal do Contrato</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">REPRESENTANTE DO CLIENTE</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-[calc(100vh-360px)] flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm border-dashed">
                  <Calendar className="w-16 h-16 text-gray-200 mb-4 animate-pulse" />
                  <h3 className="text-gray-500 font-black uppercase text-xs tracking-wider">Nenhum diário de obra selecionado</h3>
                  <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-wider">Selecione ou adicione um relatório no painel de controle lateral.</p>
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
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

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

  const handlePrintPluviometry = () => {
    const mNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const filterMonthText = `${mNames[currentMonth]} / ${currentYear}`;
    
    let rainyDays = 0;
    let impDays = 0;
    let bDays = 0;
    monthDays.forEach(day => {
      const rec = getRecordForDay(day);
      if ((rec?.rainfallMm || 0) > 0) rainyDays++;
      if (rec?.morningStatus === 'Impraticável' || rec?.afternoonStatus === 'Impraticável') impDays++;
      else if (rec?.morningStatus === 'Bom' && rec?.afternoonStatus === 'Bom') bDays++;
    });

    const rowsHtml = monthDays.map(day => {
      const rec = getRecordForDay(day);
      const isRainy = (rec?.morningStatus === 'Chuvoso' || rec?.afternoonStatus === 'Chuvoso');
      const isImpraticable = (rec?.morningStatus === 'Impraticável' || rec?.afternoonStatus === 'Impraticável');
      const rowBg = isImpraticable ? '#fef2f2' : isRainy ? '#f0f9ff' : 'white';
      const dayOfWeek = (() => {
        const date = new Date(currentYear, currentMonth, day, 12);
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      })();

      const getStatusBadgeHtml = (status?: string) => {
        if (status === 'Chuvoso') return `<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">Chuvoso</span>`;
        if (status === 'Impraticável') return `<span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">Impraticável</span>`;
        return `<span style="background: #eab308; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">Bom</span>`;
      };

      return `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-family: monospace;">${String(day).padStart(2, '0')} (${dayOfWeek})</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${getStatusBadgeHtml(rec?.nightStatus)}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${getStatusBadgeHtml(rec?.morningStatus)}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${getStatusBadgeHtml(rec?.afternoonStatus)}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-family: monospace; color: #1d4ed8;">${rec?.rainfallMm ? rec.rainfallMm.toFixed(1) + ' mm' : '0.0 mm'}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 10px;">${(rec as any)?.impact || '-'}</td>
        </tr>
      `;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '1024px';
    iframe.style.height = '1024px';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    
    if (!iframe.contentWindow) return;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatorio_Pluviometrico_SYNERA</title>
          <style>
            @page { margin: 10mm; size: portrait; }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: white; 
              margin: 0;
              padding: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .title-box {
              background: #1e3a8a;
              color: white;
              padding: 8px 12px;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 15px;
              border-radius: 4px;
            }
            .details-table, .main-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 11px;
            }
            .details-table td {
              padding: 4px 8px;
              border: 1px solid #e2e8f0;
            }
            .details-label {
              background: #f1f5f9;
              font-weight: bold;
              width: 15%;
            }
            .details-value {
              width: 35%;
            }
            .main-table th {
              background: #1e3a8a;
              color: white;
              padding: 8px 6px;
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              border: 1px solid #1e3a8a;
            }
            .main-table td {
              border: 1px solid #cbd5e1;
              padding: 6px;
              font-size: 11px;
            }
            .kpi-container {
              display: flex;
              gap: 10px;
              margin-bottom: 15px;
            }
            .kpi-box {
              flex: 1;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px;
              text-align: center;
            }
            .kpi-title {
              font-size: 9px;
              color: #64748b;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .kpi-val {
              font-size: 14px;
              color: #1e3a8a;
              font-weight: bold;
            }
            .signatures {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              gap: 40px;
            }
            .signature-box {
              flex: 1;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-line {
              margin: 15px auto 5px auto;
              width: 80%;
              border-bottom: 1px solid #475569;
            }
            .signature-title {
              font-size: 9px;
              font-weight: bold;
              color: #1e293b;
              text-transform: uppercase;
            }
            .signature-subtitle {
              font-size: 8px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="font-size: 16px; font-weight: bold; color: #1e3a8a; margin: 0; text-transform: uppercase;">SYNERA - Gestão e Planejamento</h1>
              <h2 style="font-size: 11px; font-weight: bold; color: #475569; margin: 2px 0 0 0;">RELATÓRIO PLUVIOMÉTRICO MENSAL</h2>
            </div>
            <div style="text-align: right; font-size: 10px; color: #64748b;">
              Referência: <strong>\${filterMonthText}</strong><br>
              Gerado em: \${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div class="title-box">REGISTRO DE PRECIPITAÇÃO E CONCORRÊNCIA CLIMÁTICA</div>

          <table class="details-table">
            <tr>
              <td class="details-label">CONTRATO:</td>
              <td class="details-value">\${contract.contractNumber || 'N/A'}</td>
              <td class="details-label">PERÍODO:</td>
              <td class="details-value">\${filterMonthText}</td>
            </tr>
            <tr>
              <td class="details-label">CONTRATANTE:</td>
              <td class="details-value">\${contract.client || 'N/A'}</td>
              <td class="details-label">CONTRATADA:</td>
              <td class="details-value">\${contract.contractor || 'N/A'}</td>
            </tr>
            <tr>
              <td class="details-label">OBJETO:</td>
              <td class="details-value" colspan="3">\${contract.object || 'N/A'}</td>
            </tr>
          </table>

          <div class="kpi-container">
            <div class="kpi-box">
              <div class="kpi-title">Precipitação Total</div>
              <div class="kpi-val">\${stats.totalRain.toFixed(1)} mm</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Dias com Chuva</div>
              <div class="kpi-val">\${rainyDays} dias</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Dias Impraticáveis</div>
              <div class="kpi-val">\${impDays} dias</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Dias 100% Limpos</div>
              <div class="kpi-val">\${bDays} dias</div>
            </div>
          </div>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 15%; text-align: center;">Dia</th>
                <th style="width: 15%; text-align: center;">Noite Anterior</th>
                <th style="width: 15%; text-align: center;">Manhã</th>
                <th style="width: 15%; text-align: center;">Tarde</th>
                <th style="width: 15%; text-align: center;">Chuva (mm)</th>
                <th style="width: 25%; text-align: left;">Impacto na Obra / Observações</th>
              </tr>
            </thead>
            <tbody>
              \${rowsHtml}
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-box">
              <div class="signature-subtitle">Assinatura e Carimbo Digital</div>
              <div class="signature-line"></div>
              <div class="signature-title">RESPONSÁVEL TÉCNICO</div>
            </div>
            <div class="signature-box">
              <div class="signature-subtitle">Assinatura e Carimbo Digital</div>
              <div class="signature-line"></div>
              <div class="signature-title">FISCALIZAÇÃO DO CONTRATO</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
    
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 15000);
  };

  const handleExportPluviometryPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // Document border
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);

    // Title banner
    doc.setFillColor(30, 58, 138); // Deep Blue
    doc.rect(margin, margin, contentWidth, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO PLUVIOMÉTRICO MENSAL', pageWidth / 2, margin + 7.5, { align: 'center' });

    // Contract details
    doc.setTextColor(0);
    doc.setFontSize(7.5);
    const mNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const filterMonthText = `${mNames[currentMonth].toUpperCase()} / ${currentYear}`;
    const detailsData = [
      ['CONTRATO:', contract.contractNumber || 'N/A', 'PERÍODO REFERÊNCIA:', filterMonthText],
      ['CONTRATANTE:', contract.client || 'N/A', 'CONTRATADA:', contract.contractor || 'N/A'],
      ['OBJETO:', contract.object || 'N/A', 'REQUISITANTE:', 'SALA TÉCNICA']
    ];
    autoTable(doc, {
      startY: margin + 14,
      body: detailsData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, fontStyle: 'bold' },
      columnStyles: { 
        0: { cellWidth: 35, fillColor: [245, 245, 245] }, 
        1: { cellWidth: 62 },
        2: { cellWidth: 35, fillColor: [245, 245, 245] },
        3: { cellWidth: 62 }
      }
    });

    let currentY = ((doc as any).lastAutoTable?.finalY ?? (margin + 30)) + 4;

    // Helper for Section Header inside Pluviometry Report
    const sectionTitle = (title: string, y: number) => {
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, y, contentWidth, 5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 2, y + 3.5);
      doc.setTextColor(0);
      return y + 5;
    };

    // 1. INDICADORES GERAIS (KPI Dashboard)
    currentY = sectionTitle('1. INDICADORES CLIMÁTICOS DO MÊS', currentY) + 2;

    const boxW = contentWidth / 4 - 2;
    const boxH = 14;
    const kpiY = currentY;

    // Calc stats on the fly to be certain
    let rainyDays = 0;
    let impDays = 0;
    let bDays = 0;
    monthDays.forEach(day => {
      const rec = getRecordForDay(day);
      if ((rec?.rainfallMm || 0) > 0) rainyDays++;
      if (rec?.morningStatus === 'Impraticável' || rec?.afternoonStatus === 'Impraticável') impDays++;
      else if (rec?.morningStatus === 'Bom' && rec?.afternoonStatus === 'Bom') bDays++;
    });

    const kpis = [
      { label: 'PRECIPITAÇÃO TOTAL', val: `${stats.totalRain.toFixed(1)} mm` },
      { label: 'DIAS COM CHUVA', val: `${rainyDays} dias` },
      { label: 'DIAS IMPRATICÁVEIS', val: `${impDays} dias` },
      { label: 'DIAS 100% LIMPOS', val: `${bDays} dias` }
    ];

    kpis.forEach((k, idx) => {
      const bx = margin + (idx * (boxW + 2.6));
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.rect(bx, kpiY, boxW, boxH, 'FD');
      
      doc.setTextColor(100);
      doc.setFontSize(6);
      doc.text(k.label, bx + boxW/2, kpiY + 4.5, { align: 'center' });
      
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(k.val, bx + boxW/2, kpiY + 10.5, { align: 'center' });
    });

    currentY = kpiY + boxH + 4;

    // 2. DAILY PRECIPITATION CHART
    currentY = sectionTitle('2. HISTÓRICO DE PRECIPITAÇÃO DIÁRIA (ÍNDICE PLUVIOMÉTRICO)', currentY) + 2;

    const chartH = 32;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(240, 240, 240);
    doc.rect(margin, currentY, contentWidth, chartH, 'FD');

    // Axes
    const axesX = margin + 12;
    const axesY = currentY + chartH - 6;
    const chartW = contentWidth - 18;
    const chartActualH = chartH - 10;

    doc.setDrawColor(180);
    doc.setLineWidth(0.1);
    doc.line(axesX, axesY, axesX + chartW, axesY); // X-axis

    // Max rain in month
    let maxRain = 10;
    monthDays.forEach(day => {
      const r = getRecordForDay(day)?.rainfallMm || 0;
      if (r > maxRain) maxRain = r;
    });
    maxRain = Math.ceil(maxRain / 10) * 10; // Round to next 10

    // Draw Y ticks and horizontal gridlines
    doc.setFontSize(5);
    doc.setTextColor(120);
    const ticksCount = 4;
    for (let i = 0; i <= ticksCount; i++) {
      const tickVal = (maxRain / ticksCount) * i;
      const ty = axesY - (chartActualH / ticksCount) * i;
      doc.text(`${tickVal.toFixed(0)} mm`, axesX - 1.5, ty + 1.5, { align: 'right' });
      
      doc.setDrawColor(240);
      if (i > 0) doc.line(axesX, ty, axesX + chartW, ty);
    }

    // Draw bars
    const barSpacing = chartW / daysInMonth;
    const barW = Math.max(1.5, barSpacing - 1.2);
    
    monthDays.forEach(day => {
      const rec = getRecordForDay(day);
      const rain = rec?.rainfallMm || 0;
      const bx = axesX + (day - 1) * barSpacing + (barSpacing - barW) / 2;
      
      // Label X axis
      if (day % 3 === 1 || day === daysInMonth) {
        doc.text(String(day), bx + barW/2, axesY + 4, { align: 'center' });
      }

      if (rain > 0) {
        const barH = (rain / maxRain) * chartActualH;
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(bx, axesY - barH, barW, barH, 'F');
      } else {
        // Tiny baseline mark for days with 0 rain
        doc.setFillColor(220, 220, 220);
        doc.rect(bx, axesY - 0.5, barW, 0.5, 'F');
      }
    });

    currentY = currentY + chartH + 4;

    // 3. MONTHLY WEATHER CALENDAR / MATRIX OVERVIEW (Elegant grid layout)
    currentY = sectionTitle('3. CALENDÁRIO OPERACIONAL ADAPTATIVO (MANHÃ / TARDE / NOITE)', currentY) + 2;

    const colWidth = contentWidth / 7;
    const rowHeight = 11;
    const gridY = currentY;

    // Calendar Header
    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    weekdays.forEach((w, idx) => {
      const wx = margin + (idx * colWidth);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(wx, gridY, colWidth, 4.5, 'FD');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(w, wx + colWidth / 2, gridY + 3.2, { align: 'center' });
    });

    // Calendar cells
    let cellY = gridY + 4.5;
    const firstDayDate = new Date(currentYear, currentMonth, 1);
    const startOffset = firstDayDate.getDay(); // 0 is Sunday, 1 Monday...

    let colIdx = startOffset;
    let currentCellY = cellY;

    // Pre-draw blank cells for previous month padding
    for (let i = 0; i < startOffset; i++) {
      const bx = margin + (i * colWidth);
      doc.setFillColor(252, 252, 252);
      doc.setDrawColor(241, 245, 249);
      doc.rect(bx, currentCellY, colWidth, rowHeight, 'FD');
    }

    monthDays.forEach(day => {
      const bx = margin + (colIdx * colWidth);
      const rec = getRecordForDay(day);
      const night = rec?.nightStatus || 'Bom';
      const morning = rec?.morningStatus || 'Bom';
      const afternoon = rec?.afternoonStatus || 'Bom';
      const rAmount = rec?.rainfallMm || 0;

      // Draw cell perimeter
      doc.setFillColor(255);
      const isWeekend = colIdx === 0 || colIdx === 6;
      if (isWeekend) doc.setFillColor(251, 252, 253);
      if (rec?.morningStatus === 'Impraticável' || rec?.afternoonStatus === 'Impraticável') {
        doc.setFillColor(254, 242, 242); // Reddish for paralysis days
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(bx, currentCellY, colWidth, rowHeight, 'FD');

      // Day label
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', isWeekend ? 'normal' : 'bold');
      doc.text(String(day), bx + 2, currentCellY + 4.5);

      // Rain indicator
      if (rAmount > 0) {
        doc.setFontSize(5);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'bold');
        doc.text(`${rAmount.toFixed(1)}mm`, bx + colWidth - 2, currentCellY + 4.5, { align: 'right' });
      }

      // We draw 3 small status indicators side-by-side representing Night, Morning, Afternoon
      const drawDotsY = currentCellY + 7.5;
      const dotRadius = 1.1;
      const dotSpacing = 3.5;
      const firstDotX = bx + (colWidth - (dotSpacing * 2)) / 2;

      const periods = [
        { label: 'N', status: night },
        { label: 'M', status: morning },
        { label: 'T', status: afternoon }
      ];

      periods.forEach((p, pIdx) => {
        const dotX = firstDotX + (pIdx * dotSpacing);
        let color = [234, 179, 8]; // Amber (Bom)
        if (p.status === 'Chuvoso') color = [59, 130, 246]; // Blue
        else if (p.status === 'Impraticável') color = [220, 38, 38]; // Red

        // Dot Circle
        doc.setFillColor(color[0], color[1], color[2]);
        doc.circle(dotX, drawDotsY, dotRadius, 'F');
      });

      // Move cell pointers
      colIdx++;
      if (colIdx > 6) {
        colIdx = 0;
        currentCellY += rowHeight;
      }
    });

    // Outer padding for following month days
    if (colIdx > 0) {
      for (let i = colIdx; i <= 6; i++) {
        const bx = margin + (i * colWidth);
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(241, 245, 249);
        doc.rect(bx, currentCellY, colWidth, rowHeight, 'FD');
      }
      currentCellY += rowHeight;
    }

    currentY = Math.max(currentCellY + 4, currentY);

    // 4. COLOR LEGEND & COMPREHENSIVE STATUS CODES
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 12, 'FD');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('LEGENDA OPERACIONAL:', margin + 3, currentY + 7.5);

    // Legends
    const legends = [
      { text: '☀️  BOM (OPERACIONAL)', color: [234, 179, 8], offset: 50 },
      { text: '🌧️  CHUVOSO (REDUZIDO)', color: [59, 130, 246], offset: 100 },
      { text: '🛑  IMPRATICÁVEL (PARADO)', color: [220, 38, 38], offset: 150 }
    ];

    legends.forEach(lg => {
      doc.setFillColor(lg.color[0], lg.color[1], lg.color[2]);
      doc.circle(margin + lg.offset - 3, currentY + 7, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(lg.text, margin + lg.offset, currentY + 7.5);
    });

    currentY += 16;

    // Stamps, sign block at bottom
    doc.setDrawColor(180);
    doc.rect(margin, pageHeight - 34, contentWidth / 2 - 2, 20);
    doc.rect(pageWidth / 2 + 2, pageHeight - 34, contentWidth / 2 - 2, 20);

    doc.line(margin + 5, pageHeight - 20, (margin + contentWidth / 2) - 10, pageHeight - 20);
    doc.line(pageWidth / 2 + 7, pageHeight - 20, pageWidth - margin - 5, pageHeight - 20);

    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSÁVEL TÉCNICO', margin + contentWidth / 4, pageHeight - 16, { align: 'center' });
    doc.text('FISCALIZAÇÃO DO CONTRATO', (pageWidth / 2) + (contentWidth / 4), pageHeight - 16, { align: 'center' });

    doc.setFontSize(5);
    doc.setTextColor(150);
    doc.text('Assinatura e Carimbo Digital', margin + contentWidth / 4, pageHeight - 22, { align: 'center' });
    doc.text('Assinatura e Carimbo Digital', (pageWidth / 2) + (contentWidth / 4), pageHeight - 22, { align: 'center' });

    doc.save(`Pluviometria_${contract.contractNumber}_${currentYear}_${currentMonth + 1}.pdf`);
  };

  const stats = React.useMemo(() => {
    let nightBom = 0, nightChuva = 0, nightImp = 0;
    let morningBom = 0, morningChuva = 0, morningImp = 0;
    let afternoonBom = 0, afternoonChuva = 0, afternoonImp = 0;
    let totalRain = 0;

    monthDays.forEach(day => {
      const rec = getRecordForDay(day);
      const night = rec?.nightStatus || 'Bom';
      const morning = rec?.morningStatus || 'Bom';
      const afternoon = rec?.afternoonStatus || 'Bom';
      
      if (night === 'Bom') nightBom++;
      else if (night === 'Chuvoso') nightChuva++;
      else if (night === 'Impraticável') nightImp++;

      if (morning === 'Bom') morningBom++;
      else if (morning === 'Chuvoso') morningChuva++;
      else if (morning === 'Impraticável') morningImp++;

      if (afternoon === 'Bom') afternoonBom++;
      else if (afternoon === 'Chuvoso') afternoonChuva++;
      else if (afternoon === 'Impraticável') afternoonImp++;

      totalRain += rec?.rainfallMm || 0;
    });

    return {
      night: { bom: nightBom, chuva: nightChuva, imp: nightImp },
      morning: { bom: morningBom, chuva: morningChuva, imp: morningImp },
      afternoon: { bom: afternoonBom, chuva: afternoonChuva, imp: afternoonImp },
      totalRain
    };
  }, [records, monthDays, currentMonth, currentYear]);

  // Polar to Cartesian Helper for SVG graphics
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Generate Arc Segment SVG Path Helper
  const describeArcSegment = (x: number, y: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, rOuter, endAngle);
    const end = polarToCartesian(x, y, rOuter, startAngle);
    const startInner = polarToCartesian(x, y, rInner, endAngle);
    const endInner = polarToCartesian(x, y, rInner, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y,
      "A", rOuter, rOuter, 0, largeArcFlag, 0, end.x, end.y,
      "L", endInner.x, endInner.y,
      "A", rInner, rInner, 0, largeArcFlag, 1, startInner.x, startInner.y,
      "Z"
    ].join(" ");
  };

  const getStatusColor = (status: 'Bom' | 'Chuvoso' | 'Impraticável') => {
    if (status === 'Bom') return '#eab308'; // Amarelo
    if (status === 'Chuvoso') return '#3b82f6'; // Azul
    return '#dc2626'; // Vermelho (Impraticável)
  };

  const hoveredRecord = hoveredDay ? getRecordForDay(hoveredDay) : null;
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
            <CloudRain className="w-6 h-6 text-blue-600 animate-bounce" />
            Controle Pluviométrico
          </h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-wider">Acompanhamento climático e medição de precipitação em tempo real.</p>
        </div>
        <div className="flex gap-2 shrink-0 self-end md:self-auto items-center">
            <Button onClick={handleExportPluviometryPDF} className="bg-blue-600 hover:bg-blue-700 text-white h-9 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm">
                <FileDown className="w-4 h-4 mr-2" /> Gerar PDF
            </Button>
            <Button onClick={handlePrintPluviometry} variant="outline" className="h-9 font-black text-xs uppercase tracking-wider rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm">
                <Printer className="w-4 h-4 mr-2 text-slate-500" /> Imprimir
            </Button>
            <Select value={currentMonth.toString()} onValueChange={v => setCurrentMonth(parseInt(v))}>
                <SelectTrigger className="w-32 h-9 text-xs font-black uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {monthNames.map((m, i) => (
                        <SelectItem key={i} value={i.toString()} className="text-xs font-bold uppercase">{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={currentYear.toString()} onValueChange={v => setCurrentYear(parseInt(v))}>
                <SelectTrigger className="w-24 h-9 text-xs font-black uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <SelectItem key={y} value={y.toString()} className="text-xs font-bold uppercase">{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
        <TabsList className="mb-4 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="table" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
            <FileSpreadsheet className="w-4 h-4" /> Planilha de Dados
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
            <Activity className="w-4 h-4" /> Gráfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-20 text-center font-black text-xs uppercase tracking-wider text-gray-505">Dia</TableHead>
                    <TableHead className="text-center font-black text-xs uppercase tracking-wider text-gray-505 bg-blue-50/20">Noite Anterior</TableHead>
                    <TableHead className="text-center font-black text-xs uppercase tracking-wider text-gray-505 bg-blue-50/40">Manhã</TableHead>
                    <TableHead className="text-center font-black text-xs uppercase tracking-wider text-gray-505 bg-blue-50/60">Tarde</TableHead>
                    <TableHead className="w-32 text-center font-black text-xs uppercase tracking-wider text-gray-505">Chuva (mm)</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider text-gray-505">Impacto na Obra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthDays.map(day => {
                    const record = getRecordForDay(day);
                    const isRainy = (record?.morningStatus === 'Chuvoso' || record?.afternoonStatus === 'Chuvoso');
                    const isImpraticable = (record?.morningStatus === 'Impraticável' || record?.afternoonStatus === 'Impraticável');

                    return (
                      <TableRow key={day} className={cn(isImpraticable ? "bg-red-50/30 font-bold" : isRainy ? "bg-blue-50/20" : "")}>
                        <TableCell className="text-center font-bold text-gray-600 border-r">
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-0.5">
                              {(() => {
                                const date = new Date(currentYear, currentMonth, day, 12);
                                return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                              })()}
                            </span>
                            <span className="text-sm font-mono font-black">{String(day).padStart(2, '0')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            disabled={readonly}
                            value={record?.nightStatus || 'Bom'} 
                            onValueChange={v => handleUpdate(day, 'nightStatus', v)}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold w-32 mx-auto rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bom" className="text-xs font-semibold">☀️ Bom</SelectItem>
                              <SelectItem value="Chuvoso" className="text-xs font-semibold text-blue-600">🌧️ Chuvoso</SelectItem>
                              <SelectItem value="Impraticável" className="text-xs font-semibold text-red-600">🛑 Impraticável</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            disabled={readonly}
                            value={record?.morningStatus || 'Bom'} 
                            onValueChange={v => handleUpdate(day, 'morningStatus', v)}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold w-32 mx-auto rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bom" className="text-xs font-semibold">☀️ Bom</SelectItem>
                              <SelectItem value="Chuvoso" className="text-xs font-semibold text-blue-600">🌧️ Chuvoso</SelectItem>
                              <SelectItem value="Impraticável" className="text-xs font-semibold text-red-600">🛑 Impraticável</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            disabled={readonly}
                            value={record?.afternoonStatus || 'Bom'} 
                            onValueChange={v => handleUpdate(day, 'afternoonStatus', v)}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold w-32 mx-auto rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bom" className="text-xs font-semibold">☀️ Bom</SelectItem>
                              <SelectItem value="Chuvoso" className="text-xs font-semibold text-blue-600">🌧️ Chuvoso</SelectItem>
                              <SelectItem value="Impraticável" className="text-xs font-semibold text-red-600">🛑 Impraticável</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center border-l">
                          <Input 
                            disabled={readonly}
                            type="number" 
                            step="0.1"
                            className="h-8 text-center text-xs w-24 mx-auto font-mono font-black" 
                            value={record?.rainfallMm || 0}
                            onChange={e => handleUpdate(day, 'rainfallMm', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="border-l">
                          {isImpraticable ? (
                            <Badge className="bg-red-600 hover:bg-red-700 font-extrabold uppercase text-[10px] tracking-wider rounded-lg px-2 py-0.5">Paralisação Total</Badge>
                          ) : isRainy ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/40 font-extrabold uppercase text-[10px] tracking-wider rounded-lg px-2 py-0.5">Trabalho sob chuva</Badge>
                          ) : (
                            <span className="text-xs text-gray-400 font-bold uppercase">Produtivo / Bom Estado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SVG Donut Wheel */}
            <div className="lg:col-span-7 bg-white p-8 border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[520px]">
              <span className="text-sm font-black uppercase text-gray-400 tracking-wider mb-8 block text-center">Gráfico Rosca Concêntrico 3 Camadas</span>
              
              <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 300">
                  {/* Central Help Circle for visual beauty */}
                  <circle cx="150" cy="150" r="50" className="fill-gray-50 stroke-gray-100" strokeWidth="1" />

                  {monthDays.map((day) => {
                    const anglePerDay = 360 / daysInMonth;
                    const gap = 1.5; // Gap for extreme professional styling grid separators
                    const startAngle = (day - 1) * anglePerDay;
                    const endAngle = day * anglePerDay - gap;

                    const rec = getRecordForDay(day);
                    const nightCol = getStatusColor(rec?.nightStatus || 'Bom');
                    const morningCol = getStatusColor(rec?.morningStatus || 'Bom');
                    const afternoonCol = getStatusColor(rec?.afternoonStatus || 'Bom');

                    return (
                      <g 
                        key={day} 
                        className="cursor-pointer transition-all duration-200 hover:opacity-80"
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        {/* Layer 1: Noite Anterior (Inner) */}
                        <path 
                          d={describeArcSegment(150, 150, 54, 78, startAngle, endAngle)}
                          fill={nightCol}
                          className="transition-all"
                        />

                        {/* Layer 2: Manhã (Middle) */}
                        <path 
                          d={describeArcSegment(150, 150, 84, 108, startAngle, endAngle)}
                          fill={morningCol}
                          className="transition-all"
                        />

                        {/* Layer 3: Tarde (Outer) */}
                        <path 
                          d={describeArcSegment(150, 150, 114, 138, startAngle, endAngle)}
                          fill={afternoonCol}
                          className="transition-all"
                        />
                      </g>
                    );
                  })}

                  {/* Centered dynamically updated tooltip */}
                  {hoveredDay ? (
                    <g pointerEvents="none">
                      <text x="150" y="118" textAnchor="middle" className="text-[11px] font-black uppercase tracking-wider fill-gray-400">Dia</text>
                      <text x="150" y="152" textAnchor="middle" className="text-3xl font-black fill-gray-900 font-mono">{String(hoveredDay).padStart(2, '0')}</text>
                      <text x="150" y="174" textAnchor="middle" className="text-[11px] font-bold fill-blue-600">{hoveredRecord?.rainfallMm || 0} mm</text>
                    </g>
                  ) : (
                    <g pointerEvents="none">
                      <text x="150" y="122" textAnchor="middle" className="text-[10px] font-black uppercase tracking-wider fill-gray-400 leading-none">Chuva Total</text>
                      <text x="150" y="152" textAnchor="middle" className="text-2xl font-black fill-blue-600 font-mono leading-none">{stats.totalRain.toFixed(1)}</text>
                      <text x="150" y="170" textAnchor="middle" className="text-[10px] font-black uppercase tracking-wider fill-gray-400 font-mono">mm</text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Graphic Info Alert details inside Dial Center */}
              <p className="text-center text-xs font-black uppercase tracking-wider text-gray-400 mt-8 leading-relaxed">
                Passe o mouse por cima dos setores para ver as condições diárias.
              </p>
            </div>

            {/* Side statistics, Color Legend & Layers Explanation */}
            <div className="lg:col-span-5 space-y-4 font-black">
              <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 p-4">
                  <h4 className="font-black text-sm uppercase text-gray-800 tracking-tight">Legenda Climática do Diário</h4>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="w-5 h-5 rounded-md inline-block" style={{ backgroundColor: '#eab308' }} />
                    <div className="leading-tight">
                      <span className="text-xs font-black uppercase text-amber-800 block">Bom</span>
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Tempo Estável</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="w-5 h-5 rounded-md inline-block" style={{ backgroundColor: '#3b82f6' }} />
                    <div className="leading-tight">
                      <span className="text-xs font-black uppercase text-blue-800 block">Chuva</span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Sob Precipitação</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                    <span className="w-5 h-5 rounded-md inline-block" style={{ backgroundColor: '#dc2626' }} />
                    <div className="leading-tight">
                      <span className="text-xs font-black uppercase text-red-800 block font-bold">Impraticável</span>
                      <span className="text-[10px] font-bold text-red-400 uppercase">Paralisação</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tiers Layers Explanation and counts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Concentric Layers breakdown */}
                <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black uppercase text-gray-500">Camada Externa (Tarde)</span>
                  </div>
                  <div className="text-xs space-y-1.5 font-bold uppercase">
                    <div className="flex justify-between">
                      <span className="text-gray-400">☀️ Bons:</span>
                      <span className="text-amber-500 font-mono font-black">{stats.afternoon.bom} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🌧️ Chuvas:</span>
                      <span className="text-blue-500 font-mono font-black">{stats.afternoon.chuva} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🛑 Imprat.:</span>
                      <span className="text-red-500 font-mono font-black">{stats.afternoon.imp} dias</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black uppercase text-gray-500">Camada Média (Manhã)</span>
                  </div>
                  <div className="text-xs space-y-1.5 font-bold uppercase">
                    <div className="flex justify-between">
                      <span className="text-gray-400">☀️ Bons:</span>
                      <span className="text-amber-500 font-mono font-black">{stats.morning.bom} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🌧️ Chuvas:</span>
                      <span className="text-blue-500 font-mono font-black">{stats.morning.chuva} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🛑 Imprat.:</span>
                      <span className="text-red-500 font-mono font-black">{stats.morning.imp} dias</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black uppercase text-gray-500">Camada Interna (Noite)</span>
                  </div>
                  <div className="text-xs space-y-1.5 font-bold uppercase">
                    <div className="flex justify-between">
                      <span className="text-gray-400">☀️ Bons:</span>
                      <span className="text-amber-500 font-mono font-black">{stats.night.bom} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🌧️ Chuvas:</span>
                      <span className="text-blue-500 font-mono font-black">{stats.night.chuva} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🛑 Imprat.:</span>
                      <span className="text-red-500 font-mono font-black">{stats.night.imp} dias</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover day detailed info card inside graph layout */}
              {hoveredDay && hoveredRecord && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Detalhamento do Dia sob o Cursor</span>
                  <div className="grid grid-cols-4 gap-2 text-xs font-black uppercase">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-50">
                      <span className="text-[9px] text-gray-400 block leading-tight">DIA</span>
                      <span className="text-blue-700 font-mono text-sm leading-tight block">{String(hoveredDay).padStart(2, '0')}/{String(currentMonth + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-50">
                      <span className="text-[9px] text-gray-400 block leading-tight">NOITE ANT.</span>
                      <span className="text-gray-800 text-sm leading-tight block">{hoveredRecord.nightStatus === 'Bom' ? '☀️ Bom' : hoveredRecord.nightStatus === 'Chuvoso' ? '🌧️ Chuva' : '🛑 Imprat.'}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-50">
                      <span className="text-[9px] text-gray-400 block leading-tight">MANHÃ</span>
                      <span className="text-gray-800 text-sm leading-tight block">{hoveredRecord.morningStatus === 'Bom' ? '☀️ Bom' : hoveredRecord.morningStatus === 'Chuvoso' ? '🌧️ Chuva' : '🛑 Imprat.'}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-50">
                      <span className="text-[9px] text-gray-400 block leading-tight">TARDE</span>
                      <span className="text-gray-800 text-sm leading-tight block">{hoveredRecord.afternoonStatus === 'Bom' ? '☀️ Bom' : hoveredRecord.afternoonStatus === 'Chuvoso' ? '🌧️ Chuva' : '🛑 Imprat.'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
  onUpdate: (s: TechnicalSchedule) => Promise<void> | void;
  readonly?: boolean;
  measurements?: Measurement[];
}

interface ScheduleCellInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  decimals?: number;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ScheduleCellInput = React.memo(({ value, onChange, disabled, className, placeholder, decimals = 3, id, onKeyDown }: ScheduleCellInputProps) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || isNaN(value)) {
        setLocalValue('');
      } else {
        setLocalValue(formatNumber(value, decimals));
      }
    }
  }, [value, isFocused, decimals]);

  const handleBlur = () => {
    setIsFocused(false);
    let cleaned = localValue
      .replace(/\./g, '')
      .replace(',', '.');

    const parsed = cleaned === '' ? 0 : parseFloat(cleaned);
    if (!isNaN(parsed)) {
      if (parsed !== value) {
        onChange(parsed);
      }
      setLocalValue(formatNumber(parsed, decimals));
    } else {
      setLocalValue(formatNumber(value || 0, decimals));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^-?[0-9.,]*$/.test(val) || val === '') {
      setLocalValue(val);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!value) {
      setLocalValue('');
    } else {
      setLocalValue(value.toString().replace('.', ','));
    }
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={cn("h-7 text-right text-sm font-mono border-none bg-transparent focus:ring-1 px-2 select-all", className)}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBlur();
          (e.target as HTMLInputElement).blur();
        }
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      disabled={disabled}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && 
         prevProps.disabled === nextProps.disabled && 
         prevProps.className === nextProps.className &&
         prevProps.id === nextProps.id &&
         prevProps.decimals === nextProps.decimals;
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
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code || '---'}</span>
              <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name || (bi as any).name}>
                {service?.name || (bi as any).name || 'Serviço não encontrado'}
              </span>
              <span className="text-sm text-gray-400 font-medium leading-tight flex items-center gap-1">
                <Badge variant="outline" className="text-xs h-4 px-1 rounded-sm">{service?.unit || '---'}</Badge>
                <span>•</span>
                {formatCurrency(unitCost)}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-xs font-bold text-gray-400 uppercase border-r sticky left-[180px] bg-gray-50/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Qtd. Prev.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-gray-50/10 px-4 font-bold text-gray-600">{formatNumber(bi.quantity, 3)}</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="p-0 border-r w-[110px] min-w-[110px]">
              <ScheduleCellInput 
                value={getDayValue(p, 'plannedQty')}
                onChange={(val) => updateDayValue(bi.serviceId, p, 'plannedQty', val)}
                className="focus:ring-blue-400"
                disabled={readonly}
                decimals={3}
              />
            </TableCell>
          ))}
          <TableCell className={cn(
            "text-right text-sm font-mono font-bold bg-blue-50/30 px-4",
            isOverPlanned ? "text-red-600 bg-red-50" : "text-blue-700"
          )}>
            {formatNumber(accumulatedPlanned, 3)}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l px-4 text-gray-500 bg-white">
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
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-sm text-gray-400 font-medium leading-tight flex items-center gap-1">
                  <Badge variant="outline" className="text-xs h-4 px-1 rounded-sm">{service?.unit}</Badge>
                  <span>•</span>
                  {formatCurrency(unitCost)}
                </span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-xs font-bold text-blue-600 uppercase border-r sticky left-[180px] bg-blue-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Qtd. Exec.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-blue-50/5 text-blue-300 italic px-4">--</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="p-0 border-r bg-blue-50/5 w-[110px] min-w-[110px]">
              <ScheduleCellInput 
                value={getDayValue(p, 'actualQty')}
                onChange={(val) => updateDayValue(bi.serviceId, p, 'actualQty', val)}
                className="font-bold text-blue-700 focus:ring-blue-500"
                disabled={readonly}
                decimals={3}
              />
            </TableCell>
          ))}
          <TableCell className={cn(
            "text-right text-sm font-mono font-bold text-blue-600 bg-blue-50/40 px-4",
            isOverActual ? "text-red-600 bg-red-50" : "text-blue-800"
          )}>
            {formatNumber(accumulatedActual, 3)}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l text-blue-600/60 px-4 bg-white">
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
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-sm text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-xs font-bold text-amber-600 uppercase border-r sticky left-[180px] bg-amber-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Perc. Prev.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-amber-50/5 px-4 text-amber-800 font-medium">{formatPercent(100)}</TableCell>
          {periods.map(p => {
            const qtyVal = getDayValue(p, 'plannedQty');
            const percValue = bi.quantity > 0 ? ((qtyVal / bi.quantity) * 100) : 0;
            return (
              <TableCell key={p} className="p-0 border-r bg-amber-50/5 w-[110px] min-w-[110px]">
                <ScheduleCellInput 
                  value={parseFloat(percValue.toFixed(1))}
                  onChange={(val) => updateDayValue(bi.serviceId, p, 'plannedPerc', val)}
                  className="text-amber-700 focus:ring-amber-400"
                  disabled={readonly}
                  decimals={1}
                />
              </TableCell>
            );
          })}
          <TableCell className="text-right text-sm font-mono font-bold text-amber-700 bg-amber-50/30 px-4">
            {formatPercent((accumulatedPlanned / bi.quantity) * 100)}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l text-amber-700/50 px-4 bg-white">
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
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-sm text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-xs font-bold text-amber-800 uppercase border-r sticky left-[180px] bg-amber-100/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Perc. Exec.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-amber-100/10 text-amber-400 italic px-4">--</TableCell>
          {periods.map(p => {
            const qtyVal = getDayValue(p, 'actualQty');
            const percValue = bi.quantity > 0 ? ((qtyVal / bi.quantity) * 100) : 0;
            return (
              <TableCell key={p} className="p-0 border-r bg-amber-100/10 w-[110px] min-w-[110px]">
                <ScheduleCellInput 
                  value={parseFloat(percValue.toFixed(1))}
                  onChange={(val) => updateDayValue(bi.serviceId, p, 'actualPerc', val)}
                  className="font-bold text-amber-900 focus:ring-amber-500"
                  disabled={readonly}
                  decimals={1}
                />
              </TableCell>
            );
          })}
          <TableCell className="text-right text-sm font-mono font-bold text-amber-900 bg-amber-100/30 px-4">
            {formatPercent((accumulatedActual / bi.quantity) * 100)}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l text-amber-900/60 font-bold px-4 bg-white">
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
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-sm text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-xs font-bold text-emerald-600 uppercase border-r sticky left-[180px] bg-emerald-50/10 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Val. Prev.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-emerald-50/5 px-4 text-emerald-800 font-medium">{formatCurrency(bi.quantity * unitCost)}</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="px-3 py-1.5 border-r text-right text-sm font-mono text-emerald-700/70 bg-emerald-50/5">
              {formatCurrency(getDayValue(p, 'plannedValue'))}
            </TableCell>
          ))}
          <TableCell className="text-right text-sm font-mono font-bold text-emerald-700 bg-emerald-50/30 px-4">
            {formatCurrency(getServiceAccumulated('plannedValue'))}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l text-emerald-700/50 px-4 bg-white">
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
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit uppercase leading-none border border-blue-100">{service?.code}</span>
                <span className="text-sm font-bold text-gray-900 leading-tight whitespace-normal" title={service?.name}>{service?.name}</span>
                <span className="text-sm text-gray-400 font-medium leading-tight">{formatCurrency(unitCost)}</span>
              </div>
            </TableCell>
          )}
          <TableCell className="text-xs font-bold text-emerald-800 uppercase border-r sticky left-[180px] bg-emerald-100/20 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] px-3">Val. Exec.</TableCell>
          <TableCell className="text-right text-sm font-mono border-r bg-emerald-100/10 text-emerald-400 italic px-4">--</TableCell>
          {periods.map(p => (
            <TableCell key={p} className="px-3 py-1.5 border-r text-right text-sm font-mono text-emerald-800 font-bold bg-emerald-100/10">
              {formatCurrency(getDayValue(p, 'actualValue'))}
            </TableCell>
          ))}
          <TableCell className="text-right text-sm font-mono font-bold text-emerald-900 bg-emerald-100/30 px-4">
            {formatCurrency(getServiceAccumulated('actualValue'))}
          </TableCell>
          <TableCell className="text-right text-sm font-mono border-l text-emerald-900/60 font-bold px-4 bg-white">
            {formatCurrency((bi.quantity * unitCost) - getServiceAccumulated('actualValue'))}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.bi === nextProps.bi &&
    prevProps.service === nextProps.service &&
    prevProps.viewOptions === nextProps.viewOptions &&
    prevProps.readonly === nextProps.readonly &&
    prevProps.unitCost === nextProps.unitCost &&
    prevProps.serviceSchedule === nextProps.serviceSchedule &&
    prevProps.periods.length === nextProps.periods.length
  );
});

const GlobalFooters = React.memo(({
  periods,
  budgetTotalSum,
  totalPlannedSum,
  totalActualSum,
  periodPlannedTotals,
  periodActualTotals
}: {
  periods: number[];
  budgetTotalSum: number;
  totalPlannedSum: number;
  totalActualSum: number;
  periodPlannedTotals: number[];
  periodActualTotals: number[];
}) => {
  return (
    <React.Fragment>
      <TableRow className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 z-30">
        <TableCell colSpan={2} className="sticky left-0 bg-slate-900 z-20 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] w-[180px] min-w-[180px] max-w-[180px] uppercase text-sm py-4 px-4 tracking-wider">Total Planejado (R$)</TableCell>
        <TableCell className="text-right text-sm border-r px-4">
          {formatCurrency(budgetTotalSum)}
        </TableCell>
        {periods.map(p => (
          <TableCell key={p} className="text-right text-sm border-r text-slate-300 px-3">
            {formatCurrency(periodPlannedTotals[p] || 0)}
          </TableCell>
        ))}
        <TableCell className="text-right text-sm bg-slate-800 px-4">
          {formatCurrency(totalPlannedSum)}
        </TableCell>
        <TableCell className="text-right text-sm border-l px-4 text-slate-400 bg-slate-900">
          {formatCurrency(budgetTotalSum - totalPlannedSum)}
        </TableCell>
      </TableRow>

      <TableRow className="bg-blue-900 text-white font-bold">
        <TableCell colSpan={2} className="sticky left-0 bg-blue-900 z-10 shadow-[1px_0_0_0_rgba(255,255,255,0.1)] w-[150px] min-w-[150px] max-w-[150px] uppercase text-sm px-4 py-4">Total Executado (R$)</TableCell>
        <TableCell className="text-right text-sm border-r text-blue-300 italic px-4">--</TableCell>
        {periods.map(p => (
          <TableCell key={p} className="text-right text-sm border-r text-blue-200 font-extrabold italic px-3">
            {formatCurrency(periodActualTotals[p] || 0)}
          </TableCell>
        ))}
        <TableCell className="text-right text-sm bg-blue-800 font-black px-4">
          {formatCurrency(totalActualSum)}
        </TableCell>
        <TableCell className="text-right text-sm border-l text-blue-200 px-4 bg-blue-800">
          {formatCurrency(budgetTotalSum - totalActualSum)}
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}, (prevProps, nextProps) => {
  return prevProps.budgetTotalSum === nextProps.budgetTotalSum &&
         prevProps.totalPlannedSum === nextProps.totalPlannedSum &&
         prevProps.totalActualSum === nextProps.totalActualSum &&
         prevProps.periods.length === nextProps.periods.length &&
         JSON.stringify(prevProps.periodPlannedTotals) === JSON.stringify(nextProps.periodPlannedTotals) &&
         JSON.stringify(prevProps.periodActualTotals) === JSON.stringify(nextProps.periodActualTotals);
});

export function TechnicalScheduleView({ 
  contract, services, resources, quotations, technicalSchedules, schedules, onUpdate, readonly, measurements = []
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
  
  // Local storage draft for better performance and resilience
  const [draftSchedule, setDraftSchedule] = useState<TechnicalSchedule | null>(() => {
    try {
      const item = window.localStorage.getItem(`sigo_tech_schedule_draft_${contract.id}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  });

  const [localSchedule, setLocalSchedule] = useState<TechnicalSchedule>(() => {
    if (draftSchedule) return draftSchedule;
    return existingSchedule || {
      id: uuidv4(),
      contractId: contract.id,
      startDate: contract.startDate || new Date().toISOString().split('T')[0],
      duration: 6,
      timeUnit: 'months',
      services: []
    };
  });
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartGroupFilter, setChartGroupFilter] = useState<'all' | string>('all');
  const [chartPeriodFilter, setChartPeriodFilter] = useState<number | null>(null);
  const [isChartMaximized, setIsChartMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isDirty = React.useRef(false);
  const scheduleRef = React.useRef(localSchedule);

  React.useEffect(() => {
    scheduleRef.current = localSchedule;
  }, [localSchedule]);

  // --- PERFORMANCE LOGS ---
  const renderCount = React.useRef(0);
  const mountTime = React.useRef(Date.now());
  
  React.useEffect(() => {
    console.log(`[Performance] Cronograma montado em ${Date.now() - mountTime.current}ms`);
    console.log(`[Performance] Tamanho do cronograma: ${localSchedule.services.length} serviços, ${localSchedule.duration} períodos`);
    return () => {
      console.log(`[Performance] Cronograma desmontado. Total de renders: ${renderCount.current}`);
    }
  }, []);

  React.useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current % 10 === 0) {
      console.log(`[Performance] Renders: ${renderCount.current}`);
    }
  });
  // ------------------------

  const onUpdateRef = React.useRef(onUpdate);
  const readonlyRef = React.useRef(readonly);

  React.useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  React.useEffect(() => {
    readonlyRef.current = readonly;
  }, [readonly]);

  // Sync to local draft every 5 seconds if dirty
  React.useEffect(() => {
    if (isDirty.current) {
      const timer = setInterval(() => {
        setDraftSchedule(localSchedule);
        try {
          window.localStorage.setItem(`sigo_tech_schedule_draft_${contract.id}`, JSON.stringify(localSchedule));
        } catch (e) {
          console.error("Local draft save failed", e);
        }
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [localSchedule, contract.id]);

  // Auto-save to Supabase after 2 minutes of idle
  React.useEffect(() => {
    if (isDirty.current && !readonly) {
      const timer = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onUpdateRef.current(localSchedule);
          if (scheduleRef.current === localSchedule) {
            isDirty.current = false;
            setHasUnsavedChanges(false);
          }
        } catch (error) {
          console.error("Auto-save failed", error);
        } finally {
          setIsSaving(false);
        }
      }, 120000); // 2 minutes
      return () => clearTimeout(timer);
    }
  }, [localSchedule, readonly]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (isDirty.current && !readonlyRef.current && scheduleRef.current) {
        const result = onUpdateRef.current(scheduleRef.current);
        if (result && result.catch) {
          result.catch(console.error);
        }
      }
    };
  }, []);

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

  const globalServicesMap = React.useMemo(() => {
    const idMap: Record<string, ServiceComposition> = {};
    const codeMap: Record<string, ServiceComposition> = {};
    services.forEach(s => {
      idMap[s.id] = s;
      if (s.code) codeMap[s.code] = s;
    });
    return { idMap, codeMap };
  }, [services]);

  const unitCostsMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    budgetItems.forEach(bi => {
      const s = globalServicesMap.idMap[bi.serviceId] || globalServicesMap.codeMap[(bi as any).code];
      map[bi.serviceId] = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
    });
    return map;
  }, [budgetItems, globalServicesMap, resources, services]);

  // Sync only if NOT dirty to prevent overwriting user input while it's being saved
  React.useEffect(() => {
    const existing = technicalSchedules.find(s => s.contractId === contract.id);
    if (!isDirty.current) {
      if (existing) {
        if (localSchedule?.id !== existing.id) {
          setLocalSchedule(existing);
        }
      } else {
        const isAlreadyInitialized = localSchedule?.contractId === contract.id;
        if (!isAlreadyInitialized) {
          setLocalSchedule({
            id: uuidv4(),
            contractId: contract.id,
            startDate: contract.startDate || new Date().toISOString().split('T')[0],
            duration: 6,
            timeUnit: 'months',
            services: budgetItems.map(bi => ({ serviceId: bi.serviceId, distribution: [] }))
          });
        }
      }
    }
  }, [contract.id, technicalSchedules, budgetItems, localSchedule?.id, localSchedule?.contractId]);

  const updateLocalSchedule = (updates: Partial<TechnicalSchedule>) => {
    isDirty.current = true;
    setHasUnsavedChanges(true);
    setLocalSchedule(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localSchedule);
      isDirty.current = false;
      setHasUnsavedChanges(false);
      setDraftSchedule(null); // Clear draft as it's saved to source of truth
      try {
        window.localStorage.removeItem(`sigo_tech_schedule_draft_${contract.id}`);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Erro ao salvar cronograma. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
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
      const unitCost = unitCostsMap[bi.serviceId] || 0;
      
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

  const computedActuals = React.useMemo(() => {
    const start = new Date(localSchedule.startDate + 'T12:00:00');
    const map: Record<string, Record<number, number>> = {};
    measurements.forEach(m => {
       const d = new Date(m.date + 'T12:00:00');
       let periodIndex = 0;
       if (localSchedule.timeUnit === 'months') {
          periodIndex = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
       } else if (localSchedule.timeUnit === 'weeks') {
          periodIndex = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
       } else {
          periodIndex = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
       }
       if (periodIndex >= 0) {
         m.items.forEach(item => {
           if (!map[item.serviceId]) map[item.serviceId] = {};
           if (!map[item.serviceId][periodIndex]) map[item.serviceId][periodIndex] = 0;
           map[item.serviceId][periodIndex] += item.quantity;
         });
       }
    });
    return map;
  }, [measurements, localSchedule.startDate, localSchedule.timeUnit]);

  const getDayValue = React.useCallback((serviceId: string, periodIndex: number, field: 'plannedQty' | 'actualQty' | 'plannedValue' | 'actualValue') => {
    const unitCost = unitCostsMap[serviceId] || 0;
    if (field === 'actualQty') return computedActuals[serviceId]?.[periodIndex] || 0;
    if (field === 'actualValue') return (computedActuals[serviceId]?.[periodIndex] || 0) * unitCost;

    const s = localSchedule.services.find(s => s.serviceId === serviceId);
    if (!s) return 0;
    const dist = s.distribution.find(d => d.periodIndex === periodIndex);
    return dist ? dist[field] : 0;
  }, [localSchedule.services, computedActuals, unitCostsMap]);

  const updateDayValue = React.useCallback((serviceId: string, periodIndex: number, field: 'plannedQty' | 'actualQty' | 'plannedPerc' | 'actualPerc', value: number) => {
    if (readonly) return;
    if (field === 'actualQty' || field === 'actualPerc') return; // Cannot edit actual quantities here
    isDirty.current = true;
    setHasUnsavedChanges(true);
    
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
      const unitCost = unitCostsMap[serviceId] || 0;
      const totalQty = bi?.quantity || 1;

      let qtyValue = value;
      let fieldToUpdate: 'plannedQty' | 'actualQty' = 'plannedQty';

      if (field === 'plannedPerc') {
        qtyValue = (value / 100) * totalQty;
        fieldToUpdate = 'plannedQty';
      } else if ((field as any) === 'actualPerc') {
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
  }, [readonly, budgetItems, unitCostsMap]);

  const periods = React.useMemo(() => Array.from({ length: localSchedule.duration }, (_, i) => i), [localSchedule.duration]);

  const handleQuickEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, col: string, periodIdx: number) => {
    if (e.key === 'Tab') {
      const direction = e.shiftKey ? -1 : 1;
      const targetPeriodIdx = periodIdx + direction;
      
      if (targetPeriodIdx >= 0 && targetPeriodIdx < periods.length) {
        e.preventDefault();
        const targetId = `quick-edit-${col}-${targetPeriodIdx}`;
        setTimeout(() => {
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            (targetElement as HTMLInputElement).focus();
            (targetElement as HTMLInputElement).select();
          }
        }, 10);
      }
    }
  };

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
          <span className="capitalize text-sm font-bold text-blue-600">{weekday}</span>
          <span className="text-sm text-gray-500">{dayMonth}</span>
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
          <span className="text-sm font-bold text-blue-600">Sem. {index + 1}</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">{format(weekStart)} a {format(weekEnd)}</span>
        </div>
      );
    }
    
    if (localSchedule.timeUnit === 'months') {
      const current = new Date(start);
      current.setMonth(start.getMonth() + index);
      const monthYear = current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="capitalize text-sm font-bold text-blue-600">{monthYear.replace('.', '')}</span>
          <span className="text-xs text-gray-500">Mês {index + 1}</span>
        </div>
      );
    }
    
    return `P ${index + 1}`;
  };

  const getServiceAccumulated = React.useCallback((serviceId: string, field: 'plannedQty' | 'actualQty' | 'plannedValue' | 'actualValue') => {
    const unitCost = unitCostsMap[serviceId] || 0;
    if (field === 'actualQty') return Object.values(computedActuals[serviceId] || {}).reduce((a, b) => a + b, 0);
    if (field === 'actualValue') return Object.values(computedActuals[serviceId] || {}).reduce((a, b) => a + b, 0) * unitCost;

    const s = localSchedule.services.find(s => s.serviceId === serviceId);
    if (!s) return 0;
    return s.distribution.reduce((acc, d) => acc + (d[field] || 0), 0);
  }, [localSchedule.services, computedActuals, unitCostsMap]);

  const { periodPlannedTotals, periodActualTotals, totalPlannedSum, totalActualSum, budgetTotalSum } = React.useMemo(() => {
    const planned = new Array(periods.length).fill(0);
    const actual = new Array(periods.length).fill(0);
    let plannedSum = 0;
    let actualSum = 0;

    localSchedule.services.forEach(s => {
      s.distribution.forEach(d => {
        if (d.periodIndex >= 0 && d.periodIndex < periods.length) {
          planned[d.periodIndex] += d.plannedValue || 0;
          plannedSum += d.plannedValue || 0;
        }
      });
    });

    Object.keys(computedActuals).forEach(serviceId => {
      const unitCost = unitCostsMap[serviceId] || 0;
      Object.entries(computedActuals[serviceId]).forEach(([pIdxStr, qty]) => {
         const pIdx = parseInt(pIdxStr);
         if (pIdx >= 0 && pIdx < periods.length) {
            const val = qty * unitCost;
            actual[pIdx] += val;
            actualSum += val;
         }
      });
    });

    let bSum = 0;
    budgetItems.forEach(bi => {
      bSum += (bi.quantity || 0) * (unitCostsMap[bi.serviceId] || 0);
    });

    return {
      periodPlannedTotals: planned,
      periodActualTotals: actual,
      totalPlannedSum: plannedSum,
      totalActualSum: actualSum,
      budgetTotalSum: bSum
    };
  }, [localSchedule.services, periods.length, budgetItems, unitCostsMap, computedActuals]);

  const getPeriodTotalValue = React.useCallback((periodIndex: number, field: 'plannedValue' | 'actualValue') => {
    if (field === 'plannedValue') return periodPlannedTotals[periodIndex] || 0;
    return periodActualTotals[periodIndex] || 0;
  }, [periodPlannedTotals, periodActualTotals]);

  const localServicesMap = React.useMemo(() => {
    const map: Record<string, TechnicalServiceSchedule> = {};
    localSchedule.services.forEach(s => map[s.serviceId] = s);
    return map;
  }, [localSchedule.services]);

  const groupTotals = React.useMemo(() => {
    const totals: Record<string, { planned: number[], actual: number[], totalPlanned: number, totalActual: number, budgetSum: number }> = {};
    
    groupsToRender.forEach(g => {
       const planned = new Array(periods.length).fill(0);
       const actual = new Array(periods.length).fill(0);
       let tPlanned = 0;
       let tActual = 0;
       let bSum = 0;
       
       g.services.forEach(bi => {
         const ls = localServicesMap[bi.serviceId];
         if (ls) {
           ls.distribution.forEach(d => {
             if (d.periodIndex >= 0 && d.periodIndex < periods.length) {
               planned[d.periodIndex] += d.plannedValue || 0;
               tPlanned += d.plannedValue || 0;
             }
           });
         }
         
         const unitCost = unitCostsMap[bi.serviceId] || 0;
         const actualsForService = computedActuals[bi.serviceId];
         if (actualsForService) {
           Object.entries(actualsForService).forEach(([pIdxStr, qty]) => {
             const pIdx = parseInt(pIdxStr);
             if (pIdx >= 0 && pIdx < periods.length) {
               const val = qty * unitCost;
               actual[pIdx] += val;
               tActual += val;
             }
           });
         }
         
         bSum += (bi.quantity || 0) * unitCost;
       });
       
       totals[g.id] = { planned, actual, totalPlanned: tPlanned, totalActual: tActual, budgetSum: bSum };
    });
    return totals;
  }, [groupsToRender, localServicesMap, periods.length, unitCostsMap, computedActuals]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden relative">
      {/* Main Content: Header and Table */}
      <div className="flex-1 flex flex-col min-w-0 pr-4 overflow-hidden h-full">
        <div className="flex items-center justify-between shrink-0 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cronograma Físico-Financeiro</h2>
            <p className="text-base text-gray-500">Acompanhamento temporal de planejamento vs. execução.</p>
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
                {isSaving ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse h-8">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold uppercase">Salvando...</span>
                  </div>
                ) : hasUnsavedChanges ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full h-8">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold uppercase">Alterações não salvas</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full h-8">
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold uppercase">Sincronizado</span>
                  </div>
                )}
                <Button size="sm" onClick={handleSave} disabled={!hasUnsavedChanges || isSaving} className="bg-blue-600 hover:bg-blue-700 h-8">
                  <Save className="w-4 h-4 mr-2" /> {hasUnsavedChanges ? "Salvar Alterações" : "Salvar"}
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
              <span className="text-sm font-mono font-medium text-gray-600 w-10 text-center">
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
              <table className="w-full border-separate border-spacing-0 text-base table-fixed">
                <thead className="bg-gray-50 border-b sticky top-0 z-40 shadow-sm">
                      {monthGroups.length > 0 && (
                        <TableRow className="bg-gray-50/80 backdrop-blur-sm hover:bg-transparent">
                          <TableHead className="w-[180px] sticky left-0 top-0 bg-gray-50/90 backdrop-blur-sm z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] h-10 border-b" />
                          <TableHead className="w-[80px] bg-gray-50/90 border-b shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" />
                          <TableHead className="w-[100px] bg-gray-50/90 border-b shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" />
                          {monthGroups.map((group, gIdx) => (
                            <TableHead key={gIdx} colSpan={group.duration} className="text-center font-bold text-sm uppercase text-blue-800 bg-blue-50/40 border-r border-b py-2 sticky top-0 shadow-sm">
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
                        {periods.map(p => {
                          const now = new Date();
                          const startDate = new Date(localSchedule.startDate + 'T12:00:00');
                          let isCurrentMonth = false;
                          if (localSchedule.timeUnit === 'months') {
                            const currentPeriodIndex = (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth();
                            isCurrentMonth = p === currentPeriodIndex;
                          } else if (localSchedule.timeUnit === 'weeks') {
                            const currentPeriodIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
                            isCurrentMonth = p === currentPeriodIndex;
                          } else {
                            const currentPeriodIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            isCurrentMonth = p === currentPeriodIndex;
                          }
                          
                          return (
                            <TableHead key={p} className={`w-[110px] min-w-[110px] text-center border-r border-b py-3 font-bold px-2 ${isCurrentMonth ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-gray-50 text-gray-600"}`}>
                              {getPeriodLabel(p)}
                              {isCurrentMonth && <div className="text-[9px] uppercase font-black text-amber-700 bg-amber-200/50 rounded-full px-2 py-0.5 w-fit mx-auto mt-1">Atual</div>}
                            </TableHead>
                          );
                        })}
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
                            <Badge variant="secondary" className="bg-slate-900 text-white hover:bg-slate-900 text-sm font-black uppercase px-2 py-0.5 shadow-sm">GRUPO</Badge>
                            <span className="font-black text-sm text-slate-900 uppercase tracking-tight">{group.name}</span>
                          </div>
                        </TableCell>
                        <TableCell colSpan={periods.length + 2} className="bg-slate-200/50" />
                      </TableRow>

                {group.services.map((bi, biIdx) => {
                  const s = globalServicesMap.idMap[bi.serviceId] || globalServicesMap.codeMap[(bi as any).code];
                  const unitCost = unitCostsMap[bi.serviceId] || 0;
                  const serviceSchedule = localServicesMap[bi.serviceId];
                  
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
                        <TableCell className="sticky left-0 bg-slate-50 z-20 py-2.5 px-4 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-sm uppercase text-slate-500 font-extrabold tracking-tighter">
                          TOTAL PLANEJADO R$
                        </TableCell>
                        <TableCell className="sticky left-[180px] bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[10px] font-black text-slate-400 uppercase px-3">VALOR</TableCell>
                        <TableCell className="text-right text-sm font-mono px-4 text-slate-800">
                          {formatCurrency(groupTotals[group.id]?.budgetSum || 0)}
                        </TableCell>
                        {periods.map(p => (
                          <TableCell key={p} className="text-right text-sm font-mono border-r px-3 text-slate-700 bg-slate-100/50">
                            {formatCurrency(groupTotals[group.id]?.planned[p] || 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-sm font-mono bg-slate-100 px-4 text-slate-900">
                          {formatCurrency(groupTotals[group.id]?.totalPlanned || 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono px-4 text-slate-700 bg-slate-50">
                          {formatCurrency((groupTotals[group.id]?.budgetSum || 0) - (groupTotals[group.id]?.totalPlanned || 0))}
                        </TableCell>
                      </TableRow>

                      {/* Group Financial Total Row (Executed) */}
                      <TableRow className="bg-blue-50 font-black border-b-2 border-blue-200">
                        <TableCell className="sticky left-0 bg-blue-50 z-20 py-2 top-auto shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-sm uppercase text-blue-600 font-extrabold tracking-tighter">
                          TOTAL EXECUTADO R$
                        </TableCell>
                        <TableCell className="sticky left-[180px] bg-blue-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[10px] font-black text-blue-400 uppercase px-3">VALOR</TableCell>
                        <TableCell className="text-right text-sm font-mono px-4 text-blue-400 italic">--</TableCell>
                        {periods.map(p => (
                          <TableCell key={p} className="text-right text-sm font-mono border-r px-3 text-blue-700 bg-blue-100/30">
                            {formatCurrency(groupTotals[group.id]?.actual[p] || 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-sm font-mono bg-blue-100 px-4 text-blue-900">
                          {formatCurrency(groupTotals[group.id]?.totalActual || 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono px-4 text-blue-700 bg-blue-50">
                          {formatCurrency((groupTotals[group.id]?.budgetSum || 0) - (groupTotals[group.id]?.totalActual || 0))}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}

                  {/* Global Footer: Totais Financeiros */}
                  <GlobalFooters 
                    periods={periods}
                    budgetTotalSum={budgetTotalSum}
                    totalPlannedSum={totalPlannedSum}
                    totalActualSum={totalActualSum}
                    periodPlannedTotals={periodPlannedTotals}
                    periodActualTotals={periodActualTotals}
                  />
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
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Configurações Gerais</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold uppercase text-gray-500">Data de Início</Label>
                <Input 
                  type="date" 
                  className="h-8 text-sm bg-white"
                  value={localSchedule.startDate} 
                  onChange={(e) => updateLocalSchedule({ startDate: e.target.value })}
                  disabled={readonly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold uppercase text-gray-500">Unidade de Tempo</Label>
                <Select 
                  value={localSchedule.timeUnit} 
                  onValueChange={(v: TimeUnit) => updateLocalSchedule({ timeUnit: v })}
                  disabled={readonly}
                >
                  <SelectTrigger className="h-8 text-sm bg-white">
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
                <Label className="text-sm font-bold uppercase text-gray-500">Duração ({localSchedule.timeUnit === 'months' ? 'Meses' : localSchedule.timeUnit === 'weeks' ? 'Semanas' : 'Dias'})</Label>
                <Input 
                  type="number" 
                  min={1}
                  className="h-8 text-sm bg-white font-mono"
                  value={localSchedule.duration} 
                  onChange={(e) => updateLocalSchedule({ duration: parseInt(e.target.value) || 1 })}
                  disabled={readonly}
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full text-blue-600 border-blue-100 hover:bg-blue-50 font-bold uppercase text-sm h-10 shadow-sm"
                onClick={() => setIsChartModalOpen(true)}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-2" /> Gráfico Previsto x Executado
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Opções de Visualização</h3>
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
                    <span className={cn("text-sm font-bold uppercase", opt.color)}>{opt.label}</span>
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
               <h4 className="text-sm font-black text-blue-800 uppercase mb-2">Resumo Financeiro</h4>
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-blue-600 font-bold uppercase">Total Contrato</span>
                   <span className="text-sm font-mono font-bold text-blue-900">
                     {formatCurrency(budgetTotalSum)}
                   </span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-blue-600 font-bold uppercase">Acumulado</span>
                   <span className="text-sm font-mono font-bold text-amber-700">
                     {formatCurrency(totalActualSum)}
                   </span>
                 </div>
                 <div className="h-px bg-blue-200 my-1" />
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-blue-800 font-black uppercase">Saldo</span>
                   <span className="text-sm font-mono font-black text-blue-900">
                     {formatCurrency(budgetTotalSum - totalActualSum)}
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
        <DialogContent className="sm:max-w-[800px] sm:h-[600px] w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-400 uppercase font-bold tracking-wider">Edição Rápida de Distribuição</p>
                <p className="text-base font-bold text-gray-900 leading-tight">
                  {(editingServiceId ? globalServicesMap.idMap[editingServiceId] : undefined)?.name}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4 pr-3">
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[700px] space-y-4">
                <div className="grid grid-cols-[1fr_repeat(6,120px)] gap-4 p-2 bg-gray-50 rounded-lg sticky top-0 z-10 border border-gray-100 items-center">
                <div className="text-sm font-bold uppercase text-gray-400">Período</div>
                <div className="text-sm font-bold uppercase text-blue-600 text-center">Qtd. Prev.</div>
                <div className="text-sm font-bold uppercase text-amber-600 text-center">% Prev.</div>
                <div className="text-sm font-bold uppercase text-blue-800 text-center">Qtd. Exec.</div>
                <div className="text-sm font-bold uppercase text-amber-800 text-center">% Exec.</div>
                <div className="text-sm font-bold uppercase text-emerald-600 text-right pr-4">Vlr. Prev.</div>
                <div className="text-sm font-bold uppercase text-emerald-800 text-right pr-4">Vlr. Exec.</div>
              </div>
              
              {periods.map((p, periodIdx) => {
                const bi = budgetItems.find(i => i.serviceId === editingServiceId);
                const s = (editingServiceId ? globalServicesMap.idMap[editingServiceId] : undefined);
                const unitCost = editingServiceId ? (unitCostsMap[editingServiceId] || 0) : 0;
                const totalQty = bi?.quantity || 1;
                
                return (
                  <div key={p} className="grid grid-cols-[1fr_repeat(6,120px)] gap-4 items-center p-2 rounded-lg hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                    <div className="text-sm font-bold text-gray-700">{getPeriodLabel(p)}</div>
                    <div className="flex justify-center">
                      <ScheduleCellInput 
                        id={`quick-edit-plannedQty-${periodIdx}`}
                        onKeyDown={(e) => handleQuickEditKeyDown(e, 'plannedQty', periodIdx)}
                        decimals={3}
                        className="h-10 text-center text-base font-mono w-full border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 rounded-md shadow-sm"
                        value={getDayValue(editingServiceId!, p, 'plannedQty') ?? 0}
                        onChange={(val) => {
                          updateDayValue(editingServiceId!, p, 'plannedQty', val);
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <ScheduleCellInput 
                        id={`quick-edit-plannedPerc-${periodIdx}`}
                        onKeyDown={(e) => handleQuickEditKeyDown(e, 'plannedPerc', periodIdx)}
                        decimals={1}
                        className="h-10 text-center text-base font-mono w-full text-amber-600 border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 rounded-md shadow-sm"
                        value={totalQty > 0 ? parseFloat(((getDayValue(editingServiceId!, p, 'plannedQty') / totalQty) * 100).toFixed(1)) : 0}
                        onChange={(val) => {
                          updateDayValue(editingServiceId!, p, 'plannedPerc', val);
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <ScheduleCellInput 
                        id={`quick-edit-actualQty-${periodIdx}`}
                        onKeyDown={(e) => handleQuickEditKeyDown(e, 'actualQty', periodIdx)}
                        decimals={3}
                        className="h-10 text-center text-base font-mono font-bold text-blue-700 w-full border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 rounded-md shadow-sm"
                        value={getDayValue(editingServiceId!, p, 'actualQty') ?? 0}
                        onChange={(val) => {
                          updateDayValue(editingServiceId!, p, 'actualQty', val);
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="flex justify-center">
                      <ScheduleCellInput 
                        id={`quick-edit-actualPerc-${periodIdx}`}
                        onKeyDown={(e) => handleQuickEditKeyDown(e, 'actualPerc', periodIdx)}
                        decimals={1}
                        className="h-10 text-center text-base font-mono font-bold text-amber-800 w-full border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 rounded-md shadow-sm"
                        value={totalQty > 0 ? parseFloat(((getDayValue(editingServiceId!, p, 'actualQty') / totalQty) * 100).toFixed(1)) : 0}
                        onChange={(val) => {
                          updateDayValue(editingServiceId!, p, 'actualPerc', val);
                        }}
                        disabled={readonly}
                      />
                    </div>
                    <div className="text-right text-sm font-mono text-emerald-600 pr-4">
                      {formatCurrency(getDayValue(editingServiceId!, p, 'plannedValue'))}
                    </div>
                    <div className="text-right text-sm font-mono text-emerald-800 font-bold pr-4">
                      {formatCurrency(getDayValue(editingServiceId!, p, 'actualValue'))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-1 justify-between items-center text-sm">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-400 uppercase font-bold text-xs">Total Contrato</span>
                  <span className="font-bold">{formatNumber(budgetItems.find(i => i.serviceId === editingServiceId)?.quantity || 0, 3)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-600 uppercase font-bold text-xs">Acumulado Prev.</span>
                  <span className={cn(
                    "font-bold",
                    getServiceAccumulated(editingServiceId!, 'plannedQty') > (budgetItems.find(i => i.serviceId === editingServiceId)?.quantity || 0) + 0.001 && "text-red-600"
                  )}>
                    {formatNumber(getServiceAccumulated(editingServiceId!, 'plannedQty'), 3)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-800 uppercase font-bold text-xs">Acumulado Exec.</span>
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
  isChartMaximized
    ? "!max-w-[99vw] !w-[99vw] h-[95vh]"
    : "!max-w-[99vw] !w-[99vw] max-h-[90vh]"
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
                    <p className="text-sm uppercase font-bold text-gray-400 tracking-wider">Acompanhamento Financeiro Previsto vs. Executado</p>
                    {chartPeriodFilter !== null && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-black uppercase shadow-sm border border-blue-100 flex items-center gap-2">
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
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-black uppercase shadow-sm border border-slate-200 flex items-center gap-2">
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
                  <Label className="pl-4 text-sm font-black uppercase text-gray-400">Filtrar por:</Label>
                  <Select value={chartGroupFilter} onValueChange={setChartGroupFilter}>
                    <SelectTrigger className="w-[400px] h-10 border-none bg-transparent font-bold text-sm shadow-none ring-0 focus:ring-0">
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
                      <SelectItem value="all" className="font-bold text-sm uppercase tracking-tight">Total do Contrato</SelectItem>
                      {groupsToRender.map(g => (
                        <SelectItem key={g.id} value={g.id} className="font-bold text-sm uppercase tracking-tight">{g.name}</SelectItem>
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
                 const now = new Date();
                 const startDate = new Date(localSchedule.startDate + 'T12:00:00');
                 let currentPeriodIndex = 0;
                 if (localSchedule.timeUnit === 'months') {
                   currentPeriodIndex = (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth();
                 } else if (localSchedule.timeUnit === 'weeks') {
                   currentPeriodIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
                 } else {
                   currentPeriodIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                 }
                 
                 const deviationPeriodMax = currentPeriodIndex - 1;

                 const filterServices = chartGroupFilter === 'all' 
                   ? budgetItems 
                   : groupsToRender.find(g => g.id === chartGroupFilter)?.services || [];

                 const relevantPeriods = chartPeriodFilter !== null ? [chartPeriodFilter] : periods;

                 const currentChartData = relevantPeriods.map(p => {
                   const planned = filterServices.reduce((acc, bi) => {
                     const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === p);
                     return acc + (dist ? dist.plannedValue : 0);
                   }, 0);

                   const actual = filterServices.reduce((acc, bi) => {
                     const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === p);
                     return acc + (dist ? dist.actualValue : 0);
                   }, 0);

                   return { p, planned, actual };
                 });

                 const totalPlanned = currentChartData.reduce((acc, d) => acc + d.planned, 0);
                 const totalActual = currentChartData.reduce((acc, d) => acc + d.actual, 0);

                 let deviationPlanned = totalPlanned;
                 let deviationActual = totalActual;
                 
                 if (chartPeriodFilter === null) {
                   const devData = periods.filter(p => p <= deviationPeriodMax).map(p => {
                     const planned = filterServices.reduce((acc, bi) => {
                       const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === p);
                       return acc + (dist ? dist.plannedValue : 0);
                     }, 0);
                     const actual = filterServices.reduce((acc, bi) => {
                       const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === p);
                       return acc + (dist ? dist.actualValue : 0);
                     }, 0);
                     return { planned, actual };
                   });
                   deviationPlanned = devData.reduce((acc, d) => acc + d.planned, 0);
                   deviationActual = devData.reduce((acc, d) => acc + d.actual, 0);
                 }

                 const performance = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
                 const deviation = deviationActual - deviationPlanned;

                 return (
                   <>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-black text-blue-600 uppercase mb-1">Total Planejado {chartPeriodFilter === null && '(Global)'}</p>
                      <p className="text-xl font-black text-blue-900">{formatCurrency(totalPlanned)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-black text-emerald-600 uppercase mb-1">Total Executado {chartPeriodFilter === null && '(Global)'}</p>
                      <p className="text-xl font-black text-emerald-900">{formatCurrency(totalActual)}</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl border transition-all relative overflow-hidden", deviation >= 0 ? "bg-emerald-100/30 border-emerald-200" : "bg-red-50/50 border-red-100")}>
                      <p className={cn("text-xs font-black uppercase mb-1", deviation >= 0 ? "text-emerald-700" : "text-gray-500")} title="Calculado até o período anterior ao atual">
                        Desvio Fin. {chartPeriodFilter === null && <span className="opacity-70 text-[9px]">(Acumulado)</span>}
                      </p>
                      <p className={cn("text-xl font-black", deviation >= 0 ? "text-emerald-900" : "text-gray-900")}>{formatCurrency(deviation)}</p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-slate-100 text-right">
                      <p className="text-xs font-black text-slate-400 uppercase mb-1">Performance (IDC)</p>
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
                <p className="text-base text-gray-500 text-center max-w-xs">Defina a duração e distribua os valores no cronograma para gerar os gráficos de acompanhamento.</p>
              </div>
            ) : (
              <Tabs defaultValue="evolution" className="flex-1 flex flex-col">
                <div className="px-0 mb-6">
                  <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 inline-flex">
                    <TabsTrigger value="evolution" className="rounded-xl px-8 font-black text-sm uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Curva de Evolução</TabsTrigger>
                    <TabsTrigger value="comparison" className="rounded-xl px-8 font-black text-sm uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Comparativo por Grupo</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="evolution" className="flex-1">
                   <div className="bg-white rounded-3xl border border-gray-100 shadow-inner p-2">
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
                                        const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === p);
                                        return acc + (dist ? dist.plannedValue : 0);
                                      }, 0);

                                      const actual = filterServices.reduce((acc, bi) => {
                                        const unitCost = unitCostsMap[bi.serviceId] || 0;
                                        const actualQty = computedActuals[bi.serviceId]?.[p] || 0;
                                        return acc + (actualQty * unitCost);
                                      }, 0);

                                      // Accumulated logic
                                      const accPlanned = periods.slice(0, p + 1).reduce((sum, sp) => {
                                        return sum + filterServices.reduce((acc, bi) => {
                                          const dist = localServicesMap[bi.serviceId]?.distribution.find(d => d.periodIndex === sp);
                                          return acc + (dist ? dist.plannedValue : 0);
                                        }, 0);
                                      }, 0);

                                      const accActual = periods.slice(0, p + 1).reduce((sum, sp) => {
                                        return sum + filterServices.reduce((acc, bi) => {
                                          const unitCost = unitCostsMap[bi.serviceId] || 0;
                                          const actualQty = computedActuals[bi.serviceId]?.[sp] || 0;
                                          return acc + (actualQty * unitCost);
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
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  >
                                    {periods.map((p, index) => {
                                      const now = new Date();
                                      const startDate = new Date(localSchedule.startDate + 'T12:00:00');
                                      let highlightIndex = 0;
                                      if (localSchedule.timeUnit === 'months') {
                                        highlightIndex = (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth() + 1;
                                      } else if (localSchedule.timeUnit === 'weeks') {
                                        highlightIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
                                      } else {
                                        highlightIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                      }
                                      return <Cell key={`planned-${index}`} fill={index === highlightIndex ? '#eab308' : '#3b82f6'} fillOpacity={index === highlightIndex ? 0.7 : 0.3} />;
                                    })}
                                  </Bar>
                                  <Bar 
                                    dataKey="per_actual" 
                                    name="Executado (Período)" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(data: any) => {
                                      if (data && typeof data.periodIndex === 'number') setChartPeriodFilter(data.periodIndex);
                                    }}
                                  >
                                    {periods.map((p, index) => {
                                      const now = new Date();
                                      const startDate = new Date(localSchedule.startDate + 'T12:00:00');
                                      let highlightIndex = 0;
                                      if (localSchedule.timeUnit === 'months') {
                                        highlightIndex = (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth() + 1;
                                      } else if (localSchedule.timeUnit === 'weeks') {
                                        highlightIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
                                      } else {
                                        highlightIndex = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                      }
                                      return <Cell key={`actual-${index}`} fill={index === highlightIndex ? '#eab308' : '#10b981'} fillOpacity={index === highlightIndex ? 0.9 : 0.3} />;
                                    })}
                                  </Bar>
                                  <Area 
                                    type="monotone" 
                                    dataKey="acc_planned" 
                                    name="Previsto Acum." 
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorPrev)" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={(data: any) => {
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
                                    onClick={(data: any) => {
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
                                      const dist = localServicesMap[s.serviceId]?.distribution.find(d => d.periodIndex === chartPeriodFilter);
                                      return acc + (dist ? dist.plannedValue : 0);
                                    }, 0);
                                    const actual = g.services.reduce((acc, s) => {
                                      const dist = localServicesMap[s.serviceId]?.distribution.find(d => d.periodIndex === chartPeriodFilter);
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
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b'}}
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
                                      const dist = localServicesMap[s.serviceId];
                                      return acc + (dist ? dist.distribution.reduce((dAcc, d) => dAcc + d.plannedValue, 0) : 0);
                                    }, 0);
                                    const actual = g.services.reduce((acc, s) => {
                                      const dist = localServicesMap[s.serviceId];
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
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b'}}
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
                                      const dist = localServicesMap[bi.serviceId];
                                      const planned = dist ? dist.distribution.reduce((acc, d) => acc + d.plannedValue, 0) : 0;
                                      const actual = dist ? dist.distribution.reduce((acc, d) => acc + d.actualValue, 0) : 0;
                                      const serviceName = globalServicesMap.idMap[bi.serviceId]?.name || 'Serviço Desconhecido';
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
                                    tick={{fontSize: 9, fontWeight: 'black', fill: '#1e293b'}}
                                  />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                  />
                                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                                  <Bar dataKey="planned" name="Total Planejado" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20} />
                                  <Bar dataKey="actual" name="Total Executado" fill="#10b981" radius={[0, 8, 8, 0]} barSize={20} />
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
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">Fonte: Cronograma Físico-Financeiro - Sala Técnica</p>
            <Button onClick={() => setIsChartModalOpen(false)} className="rounded-2xl px-12 font-black uppercase text-sm h-12 bg-slate-900 shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all">Fechar Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
