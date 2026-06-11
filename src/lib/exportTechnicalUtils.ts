import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Contract, Measurement, DailyReport, PluviometryRecord, 
  TechnicalSchedule, ControllerTeam, ControllerEquipment, 
  ControllerManpower, TeamAssignment, ServiceProduction,
  ServiceComposition, Resource, CalculationMemory,
  CubationData, TransportData, StationGroup, HighwayLocation,
  Employee, ManpowerMonthlyData, EquipmentMonthlyData
} from '../types';
import { formatCurrency, formatNumber } from './utils';

// Helper for Header
function addTechnicalHeader(doc: jsPDF, title: string, options: { 
  contract: Contract, 
  companyLogo?: string, 
  companyLogoRight?: string, 
  logoMode?: 'left' | 'right' | 'both' | 'none' 
}) {
  const pageWidth = doc.internal.pageSize.width;
  const mode = options.logoMode || 'both';
  
  // Header Background
  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  const showLeft = (mode === 'left' || mode === 'both') && options.companyLogo;
  const showRight = (mode === 'right' || mode === 'both') && options.companyLogoRight;

  if (showLeft) {
    try { 
      const props = doc.getImageProperties(options.companyLogo!);
      const ratio = props.width / props.height;
      let h = 26;
      let w = h * ratio;
      if (w > 50) {
        w = 50;
        h = 50 / ratio;
      }
      const y = (30 - h) / 2;
      doc.addImage(options.companyLogo!, 'PNG', 14, y, w, h); 
    } catch (e) {
      try { doc.addImage(options.companyLogo!, 'PNG', 14, 2, 26, 26); } catch (err) {}
    }
  }
  if (showRight) {
    try { 
      const props = doc.getImageProperties(options.companyLogoRight!);
      const ratio = props.width / props.height;
      let h = 26;
      let w = h * ratio;
      if (w > 50) {
        w = 50;
        h = 50 / ratio;
      }
      const y = (30 - h) / 2;
      doc.addImage(options.companyLogoRight!, 'PNG', pageWidth - 14 - w, y, w, h); 
    } catch (e) {
      try { doc.addImage(options.companyLogoRight!, 'PNG', pageWidth - 40, 2, 26, 26); } catch (err) {}
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(showLeft ? 12 : 16);
  doc.text(options.contract.client || 'SISTEMA TÉCNICO', showLeft ? 68 : 14, 14);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, showLeft ? 68 : 14, 22);
  
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Contrato: ${options.contract.contractNumber}`, pageWidth - (showRight ? 68 : 14), 16, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - (showRight ? 68 : 14), 22, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
}

function addTechnicalFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Relatório Técnico Gerencial', 14, pageHeight - 10);
  }
}

function handleSaveOrPrintPDF(doc: jsPDF, filename: string, print?: boolean) {
  if (print) {
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    let opened = false;
    try {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        opened = true;
      }
    } catch (err) {
      console.warn("window.open blocked, downloading PDF as fallback", err);
    }
    
    if (!opened) {
      // Fallback: Trigger silent download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);
  } else {
    doc.save(filename);
  }
}

const tableStyles = {
  headStyles: { fillColor: [30, 58, 138] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [220, 220, 220] as [number, number, number], lineWidth: 0.1 },
};

// Helper to check reajuste eligibility
function checkAdjustmentEligibility(medDateStr?: string, baseDateStr?: string) {
  if (!medDateStr || !baseDateStr) return false;
  const medDate = new Date(medDateStr);
  const baseDate = new Date(baseDateStr);
  const months = (medDate.getFullYear() - baseDate.getFullYear()) * 12 + (medDate.getMonth() - baseDate.getMonth());
  return months >= 12;
}

// 1. Resumo do Contrato
export function exportContractSummaryPDF(options: {
  contract: Contract,
  measurements: Measurement[],
  selectedMeasurement?: Measurement,
  services: ServiceComposition[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  baseDate?: string,
  print?: boolean
}) {
  const doc = new jsPDF();
  addTechnicalHeader(doc, 'Resumo Gerencial do Contrato', options);

  const contractServices = getContractServices(options.contract);
  const sortedMeds = [...options.measurements].sort((a, b) => a.number - b.number);
  const targetGroups = options.contract.groups || [];
  const activeMed = options.selectedMeasurement || sortedMeds[sortedMeds.length - 1];
  const currentIndex = activeMed ? sortedMeds.indexOf(activeMed) : sortedMeds.length - 1;

  // Calculate summary by group logic replicate from MeasurementsView
  const summaryByGroup: any[] = [];
  
  const processGroupLogic = (name: string, groupServices: { serviceId: string; quantity: number, price?: number }[]) => {
    let contractValue = 0;
    let previousValue = 0;
    let currentValue = 0;
    let accumulatedValue = 0;
    let prevBaseValue = 0;
    let currBaseValue = 0;
    const adj = (options.contract as any).groupAdjustments?.[name] || 1;

    groupServices.forEach(gs => {
      const unitPriceBase = gs.price || 0;
      contractValue += gs.quantity * unitPriceBase;
      
      // Current Measurement
      const isCurrentEligible = checkAdjustmentEligibility(activeMed?.date, options.baseDate || options.contract.startDate);
      const currentAdj = isCurrentEligible ? adj : 1;
      const currentQty = activeMed?.items.find(i => i.serviceId === gs.serviceId)?.quantity || 0;
      currBaseValue += currentQty * unitPriceBase;
      currentValue += currentQty * unitPriceBase * currentAdj;
      
      // Previous Measurements
      const prevMeds = sortedMeds.slice(0, currentIndex === -1 ? 0 : currentIndex);
      prevMeds.forEach(med => {
        const isEligible = checkAdjustmentEligibility(med.date, options.baseDate || options.contract.startDate);
        const mAdj = isEligible ? adj : 1;
        const qty = med.items.find(i => i.serviceId === gs.serviceId)?.quantity || 0;
        prevBaseValue += qty * unitPriceBase;
        previousValue += qty * unitPriceBase * mAdj;
      });
      
      accumulatedValue = previousValue + currentValue;
    });

    if (groupServices.length > 0) {
      summaryByGroup.push({
        name,
        contractValue,
        previousValue,
        currentValue,
        accumulatedValue,
        balanceValue: contractValue - (prevBaseValue + currBaseValue),
        adjustmentIndex: adj,
        reajusteAtual: currentValue - currBaseValue,
        reajusteAcumulado: accumulatedValue - (prevBaseValue + currBaseValue)
      });
    }
  };

  if (targetGroups.length > 0) {
    targetGroups.forEach(g => processGroupLogic(g.name, g.services));
  } else if (options.contract.services) {
    processGroupLogic('Serviços Gerais', options.contract.services.map(s => ({ serviceId: s.serviceId, quantity: s.quantity, price: (s as any).price })));
  }

  const totals = summaryByGroup.reduce((acc, g) => ({
    contractValue: acc.contractValue + g.contractValue,
    previousValue: acc.previousValue + g.previousValue,
    currentValue: acc.currentValue + g.currentValue,
    accumulatedValue: acc.accumulatedValue + g.accumulatedValue,
    balanceValue: acc.balanceValue + g.balanceValue,
    reajusteAtual: acc.reajusteAtual + g.reajusteAtual,
    reajusteAcumulado: acc.reajusteAcumulado + g.reajusteAcumulado
  }), { contractValue: 0, previousValue: 0, currentValue: 0, accumulatedValue: 0, balanceValue: 0, reajusteAtual: 0, reajusteAcumulado: 0 });

  autoTable(doc, {
    startY: 50,
    head: [['Campo', 'Informação']],
    body: [
      ['Nº Contrato', options.contract.contractNumber],
      ['Cliente', options.contract.client],
      ['Obra', options.contract.workName || '-'],
      ['Medição Referência', activeMed ? `${activeMed.number}ª Medição (${activeMed.period})` : 'N/A'],
      ['Valor Total Contrato (Base)', formatCurrency(totals.contractValue)],
      ['Medição Atual (c/ Reajuste)', formatCurrency(totals.currentValue)],
      ['Reajuste na Medição Atual', formatCurrency(totals.reajusteAtual)],
      ['Total Acumulado (c/ Reajuste)', formatCurrency(totals.accumulatedValue)],
      ['Reajuste Total Acumulado', formatCurrency(totals.reajusteAcumulado)],
      ['Saldo do Contrato (Base)', formatCurrency(totals.balanceValue)],
      ['% Executado (Financeiro)', `${formatNumber(totals.contractValue > 0 ? (totals.accumulatedValue / totals.contractValue) * 100 : 0, 2)}%`],
    ],
    ...tableStyles,
    theme: 'grid',
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
  });

  if (summaryByGroup.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Resumo por Grupo de Serviços', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Grupo de Serviço', 'Índice', 'Vlr. Contratual', 'Med. Anterior', 'Med. Atual', 'Acumulado', 'Saldo', '% Fís.']],
      body: summaryByGroup.map(g => [
        g.name,
        formatNumber(g.adjustmentIndex, 4),
        formatCurrency(g.contractValue),
        formatCurrency(g.previousValue),
        formatCurrency(g.currentValue),
        formatCurrency(g.accumulatedValue),
        formatCurrency(g.balanceValue),
        `${formatNumber(g.contractValue > 0 ? (g.accumulatedValue / g.contractValue) * 100 : 0, 1)}%`
      ]),
      ...tableStyles,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { ...tableStyles.styles, fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center', cellWidth: 15 }
      }
    });

    // Add Totals row to the group table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      body: [[
        'TOTAL DO CONTRATO',
        '',
        formatCurrency(totals.contractValue),
        formatCurrency(totals.previousValue),
        formatCurrency(totals.currentValue),
        formatCurrency(totals.accumulatedValue),
        formatCurrency(totals.balanceValue),
        `${formatNumber(totals.contractValue > 0 ? (totals.accumulatedValue / totals.contractValue) * 100 : 0, 1)}%`
      ]],
      ...tableStyles,
      theme: 'grid',
      styles: { ...tableStyles.styles, fontSize: 6.5, fontStyle: 'bold', fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 0 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center', cellWidth: 15 }
      }
    });
  }

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Resumo_Contrato_${options.contract.contractNumber}.pdf`, options.print);
}

// Helper to get all services from a contract (flat or grouped)
function getContractServices(contract: Contract) {
  const allServices: { serviceId: string; quantity: number; price: number }[] = [];
  
  if (contract.groups && contract.groups.length > 0) {
    contract.groups.forEach(group => {
      group.services.forEach(s => {
        allServices.push({
          serviceId: s.serviceId,
          quantity: s.quantity,
          price: s.price || 0
        });
      });
    });
  } else if (contract.services && contract.services.length > 0) {
    contract.services.forEach(s => {
      allServices.push({
        serviceId: s.serviceId,
        quantity: s.quantity,
        price: (s as any).price || 0
      });
    });
  }
  
  return allServices;
}

// 2. Planilha de Medição
export function exportMeasurementSheetPDF(options: {
  contract: Contract,
  measurement: Measurement,
  allMeasurements: Measurement[],
  services: ServiceComposition[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean
}) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addTechnicalHeader(doc, `Planilha de Medição Nº ${options.measurement.number} - ${options.measurement.period}`, options);

  const bodyData: any[] = [];
  let totalContract = 0;
  let totalAtual = 0;
  let totalAnterior = 0;
  let totalAcumulado = 0;
  let totalSaldo = 0;

  const addServiceRow = (s: any) => {
    const fullService = options.services.find(fs => fs.id === s.serviceId);
    
    // Previous measurements
    const previousMeasurements = options.allMeasurements.filter(m => m.number < options.measurement.number);
    const previousQty = previousMeasurements.reduce((acc, m) => {
      const item = m.items.find(it => it.serviceId === s.serviceId);
      return acc + (item?.quantity || 0);
    }, 0);

    // Current measurement
    const currentItem = options.measurement.items.find(item => item.serviceId === s.serviceId);
    const currentQty = currentItem?.quantity || 0;

    const accumulatedQty = previousQty + currentQty;
    const price = s.price || 0;
    
    const vlrContract = s.quantity * price;
    const vlrAtual = currentQty * price;
    const vlrAnterior = previousQty * price;
    const vlrAcumulado = accumulatedQty * price;
    const sldQtd = s.quantity - accumulatedQty;
    const sldVlr = vlrContract - vlrAcumulado;

    totalContract += vlrContract;
    totalAtual += vlrAtual;
    totalAnterior += vlrAnterior;
    totalAcumulado += vlrAcumulado;
    totalSaldo += sldVlr;

    bodyData.push([
      fullService?.code || s.serviceId || '-',
      fullService?.name || s.description || '-',
      fullService?.unit || '-',
      formatCurrency(price),
      formatNumber(s.quantity, 3),
      formatCurrency(vlrContract),
      formatNumber(currentQty, 3),
      formatCurrency(vlrAtual),
      formatNumber(previousQty, 3),
      formatCurrency(vlrAnterior),
      formatNumber(accumulatedQty, 3),
      formatNumber(sldQtd, 3),
      formatCurrency(sldVlr),
      `${formatNumber(s.quantity > 0 ? (accumulatedQty / s.quantity) * 100 : 0, 1)}%`
    ]);
  };

  const targetGroups = options.contract.groups || [];
  const targetServices = options.contract.services || [];

  if (targetGroups.length > 0) {
    targetGroups.forEach(group => {
      bodyData.push([
        { 
          content: group.name, 
          colSpan: 14, 
          styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'left', textColor: [30, 58, 138], fontSize: 7 } 
        }
      ]);
      group.services.forEach(s => addServiceRow(s));
    });
  } else if (targetServices.length > 0) {
    targetServices.forEach(s => addServiceRow(s));
  }

  // TOTAL GERAL row
  bodyData.push([
    { 
      content: 'TOTAL GERAL', 
      colSpan: 5, 
      styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'right', fontSize: 6 } 
    },
    { content: formatCurrency(totalContract), styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'right', fontSize: 6 } },
    { content: '', styles: { fillColor: [241, 245, 249] } },
    { content: formatCurrency(totalAtual), styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'right', fontSize: 6 } },
    { content: '', styles: { fillColor: [241, 245, 249] } },
    { content: formatCurrency(totalAnterior), styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'right', fontSize: 6 } },
    { content: '', styles: { fillColor: [241, 245, 249] } },
    { content: '', styles: { fillColor: [241, 245, 249] } },
    { content: formatCurrency(totalSaldo), styles: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'right', fontSize: 6 } },
    { content: '', styles: { fillColor: [241, 245, 249] } }
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Cód', 'Discriminação', 'UM', 'P.U.', 'Qtd. Cont.', 'Total Cont.', 'Qtd. Atual', 'Vlr. Atual', 'Qtd. Ant.', 'Vlr. Ant.', 'Qtd. Acum.', 'Sld. Qtd.', 'Sld. Vlr.', '%']],
    body: bodyData,
    ...tableStyles,
    theme: 'grid',
    headStyles: { ...tableStyles.headStyles, fontSize: 6, halign: 'center' },
    styles: { ...tableStyles.styles, fontSize: 5.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 20, halign: 'right' },
      10: { cellWidth: 15, halign: 'right' },
      11: { cellWidth: 15, halign: 'right' },
      12: { cellWidth: 20, halign: 'right' },
      13: { cellWidth: 10, halign: 'center' },
    }
  });

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Planilha_Medicao_${options.measurement.number}_${options.contract.contractNumber}.pdf`, options.print);
}

// 3. Medição Completa
export function exportFullMeasurementPDF(options: {
  contract: Contract,
  measurement: Measurement,
  allMeasurements: Measurement[],
  services: ServiceComposition[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean
}) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.width;
  
  // Page 1: Planilha
  addTechnicalHeader(doc, `Medição Consolidada Nº ${options.measurement.number}`, options);
  
  const body: any[] = [];
  let totalAccumulated = 0;

  const contractServices = getContractServices(options.contract);

  contractServices.forEach(s => {
    const fullService = options.services.find(fs => fs.id === s.serviceId);
    
    // Previous measurements
    const previousMeasurements = options.allMeasurements.filter(m => m.number < options.measurement.number);
    const previousQty = previousMeasurements.reduce((acc, m) => {
      const item = m.items.find(it => it.serviceId === s.serviceId);
      return acc + (item?.quantity || 0);
    }, 0);

    // Current measurement
    const currentItem = options.measurement.items.find(item => item.serviceId === s.serviceId);
    const currentQty = currentItem?.quantity || 0;

    const accumulatedQty = previousQty + currentQty;
    const price = s.price || 0;
    const accumulatedVal = accumulatedQty * price;

    totalAccumulated += accumulatedVal;

    body.push([
      fullService?.code || s.serviceId || '-',
      fullService?.name || (s as any).description || '-',
      fullService?.unit || '-',
      formatNumber(s.quantity, 3),
      formatNumber(previousQty, 3),
      formatNumber(currentQty, 3),
      formatNumber(accumulatedQty, 3),
      formatCurrency(price),
      formatCurrency(accumulatedVal)
    ]);
  });

  autoTable(doc, {
    startY: 50,
    head: [['Código', 'Descrição', 'Unid.', 'Qtd. Contrato', 'Ant.', 'Atual', 'Acum.', 'P.U.', 'Total']],
    body: body,
    foot: [['', 'TOTAL GERAL ACUMULADO', '', '', '', '', '', '', formatCurrency(totalAccumulated)]],
    ...tableStyles,
    theme: 'grid',
    showFoot: 'lastPage',
    headStyles: { ...tableStyles.headStyles, fontSize: 7, halign: 'center' },
    styles: { ...tableStyles.styles, fontSize: 7 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    }
  });

  // Page 2: Summary / Signature
  doc.addPage();
  addTechnicalHeader(doc, `Termo de Encerramento - Medição ${options.measurement.number}`, options);
  
  const finalY = 60;
  doc.setFontSize(10);
  doc.text(`Certificamos que os serviços acima relacionados foram executados no período de ${options.measurement.period} de acordo com as normas técnicas e especificações do contrato.`, 14, finalY, { maxWidth: pageWidth - 28 });
  
  doc.line(30, finalY + 50, 90, finalY + 50);
  doc.text('Fiscalização / Cliente', 60, finalY + 55, { align: 'center' });
  
  doc.line(120, finalY + 50, 180, finalY + 50);
  doc.text('Engenheiro Responsável', 150, finalY + 55, { align: 'center' });

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Medicao_Completa_${options.measurement.number}.pdf`, options.print);
}

// 4. Diário de Obras (Mensal)
export async function exportMonthlyRDOReportPDF(options: {
  contract: Contract,
  month: string,
  reports: DailyReport[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean,
  allReports?: DailyReport[],
  pluviometryRecords?: PluviometryRecord[]
}) {
  const doc = new jsPDF() as any;
  const reportsSorted = options.allReports || options.reports;
  const sortedGlobalReports = [...reportsSorted].sort((a,b) => a.date.localeCompare(b.date));

  if (options.reports.length === 0) {
    const pageWidth = doc.internal.pageSize.width;
    addTechnicalHeader(doc, 'Relatório Mensal de Diários', options);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nenhum diário registrado para este período.', 14, 60);
  } else {
    // Sort selected reports by date
    const selectedReports = [...options.reports].sort((a,b) => a.date.localeCompare(b.date));
    
    for (let idx = 0; idx < selectedReports.length; idx++) {
      const report = selectedReports[idx];
      if (idx > 0) {
        doc.addPage();
      }

      const pluviometry = options.pluviometryRecords?.find(p => p.date === report.date);
      
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
      const mode = options.logoMode || 'left';
      const showLeft = (mode === 'left' || mode === 'both') && options.companyLogo;
      const showRight = (mode === 'right' || mode === 'both') && options.companyLogoRight;

      if (showLeft) {
        try {
          const props = doc.getImageProperties(options.companyLogo!);
          const ratio = props.width / props.height;
          let w = 8, h = 8 / ratio;
          if (h > 8) { h = 8; w = 8 * ratio; }
          doc.addImage(options.companyLogo!, 'PNG', margin + 1, margin + 1 + (8 - h) / 2, w, h);
        } catch (e) { console.error(e); }
      }
      
      if (showRight) {
        try {
          const props = doc.getImageProperties(options.companyLogoRight!);
          const ratio = props.width / props.height;
          let w = 8, h = 8 / ratio;
          if (h > 8) { h = 8; w = 8 * ratio; }
          doc.addImage(options.companyLogoRight!, 'PNG', pageWidth - margin - 1 - w, margin + 1 + (8 - h) / 2, w, h);
        } catch (e) { console.error(e); }
      }

      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DIÁRIO DE OCORRÊNCIAS - RDO', pageWidth / 2, margin + 7, { align: 'center' });
      
      doc.setTextColor(0);
      
      const rdoNumber = sortedGlobalReports.length > 0 
        ? sortedGlobalReports.findIndex(rep => rep.id === report.id) + 1 
        : indexForBackupAndDisplay(report, options.reports);

      const headerData = [
        ['Nº DO RDO:', `RDO-${rdoNumber}`, 'DATA DO REGISTRO:', new Date(report.date + 'T12:00:00').toLocaleDateString('pt-BR')],
        ['CONTRATO:', options.contract.contractNumber, 'CONTRATANTE:', options.contract.client || 'N/A'],
        ['OBJETO:', options.contract.object, 'CONTRATADA:', options.contract.contractor || 'CONTRATADA']
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
      const sectionHeader = (titleText: string, startY: number) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, startY, contentWidth, 5, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(titleText, margin + 2, startY + 3.8);
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
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = margin + 10;
      }
      
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

      // Append Photos Page for this Daily Report
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
            if (ctx) {
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
    }
  }

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `RDO_Mensal_${options.month}_${options.contract.contractNumber}.pdf`, options.print);
}

function indexForBackupAndDisplay(report: any, list: any[]): number {
  const sorted = [...list].sort((a,b) => a.date.localeCompare(b.date));
  return sorted.indexOf(report) + 1;
}

// 5. Pluviométrico
export function exportPluviometricReportPDF(options: {
  contract: Contract,
  month: string,
  records: PluviometryRecord[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean
}) {
  const doc = new jsPDF();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  addTechnicalHeader(doc, `Relatório Pluviométrico - ${monthName}`, options);

  const totalRain = options.records.reduce((acc, r) => acc + (r.rainfallMm || 0), 0);
  doc.text(`Captação Total no Mês: ${totalRain} mm`, 14, 50);

  autoTable(doc, {
    startY: 55,
    head: [['Data', 'Chuva (mm)', 'Manhã', 'Tarde', 'Noite']],
    body: options.records.map(r => [
      new Date(r.date).toLocaleDateString('pt-BR'),
      r.rainfallMm || 0,
      r.morningStatus,
      r.afternoonStatus,
      r.nightStatus
    ]),
    ...tableStyles,
    theme: 'grid'
  });

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Pluviometrico_${options.month}.pdf`, options.print);
}

// 6. Cronograma Excel Formatado
export function exportScheduleExcelFormated(options: {
  contract: Contract,
  schedule: TechnicalSchedule,
  services: ServiceComposition[],
  resources: Resource[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none'
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cronograma Técnico');

  // Basic styling and header
  worksheet.addRow(['CRONOGRAMA FÍSICO-FINANCEIRO']).font = { bold: true, size: 16 };
  worksheet.addRow([`CLIENTE: ${options.contract.client}`]);
  worksheet.addRow([`CONTRATO: ${options.contract.contractNumber}`]);
  worksheet.addRow([]);

  const periods = Array.from({ length: options.schedule.duration }, (_, i) => i);
  const headRow = ['Código', 'Descrição', 'Unid.', 'Qtd. Total', ...periods.map(p => `P${p+1}`), 'Acumulado', 'Saldo'];
  const excelHeaderRow = worksheet.addRow(headRow);
  excelHeaderRow.font = { bold: true };
  excelHeaderRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  options.schedule.services.forEach(ss => {
    const s = options.services.find(serv => serv.id === ss.serviceId);
    const cs = options.contract.services?.find(serv => serv.serviceId === ss.serviceId);
    
    // QTD PREV
    const rowData = [
      s?.code || '',
      s?.name || '',
      s?.unit || '',
      cs?.quantity || 0,
      ...periods.map(p => ss.distribution.find(d => d.periodIndex === p)?.plannedQty || 0),
      ss.distribution.reduce((acc, d) => acc + (d.plannedQty || 0), 0),
      (cs?.quantity || 0) - ss.distribution.reduce((acc, d) => acc + (d.plannedQty || 0), 0)
    ];
    worksheet.addRow(rowData);
  });

  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 40;

  workbook.xlsx.writeBuffer().then(buffer => {
    saveAs(new Blob([buffer]), `Cronograma_${options.contract.contractNumber}.xlsx`);
  });
}

// 7. Equipes
export function exportTeamsReportPDF(options: {
  contract: Contract,
  teams: ControllerTeam[],
  manpower: ControllerManpower[],
  equipments: ControllerEquipment[],
  assignments: TeamAssignment[],
  month: string,
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean
}) {
  const doc = new jsPDF();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  addTechnicalHeader(doc, `Resumo de Equipes - ${monthName}`, options);

  options.teams.forEach((t, idx) => {
    if (idx > 0) doc.addPage();
    if (idx > 0) addTechnicalHeader(doc, `Equipe: ${t.name}`, options);
    else doc.text(`Equipe: ${t.name}`, 14, 50);

    const teamAssignments = options.assignments.filter(a => a.teamId === t.id && (!a.endDate || (a.startDate || '') <= options.month + '-31'));
    
    doc.setFontSize(10);
    doc.text('Colaboradores', 14, 60);
    autoTable(doc, {
      startY: 65,
      head: [['Nome', 'Cargo']],
      body: teamAssignments.filter(a => a.type === 'manpower').map(a => {
        const mem = options.manpower.find(m => m.id === a.memberId);
        return [mem?.name, mem?.role];
      }),
      ...tableStyles
    });

    doc.text('Equipamentos', 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Modelo', 'Placa/Série']],
      body: teamAssignments.filter(a => a.type === 'equipment').map(a => {
        const eq = options.equipments.find(e => e.id === a.memberId);
        return [eq?.model, eq?.plate];
      }),
      ...tableStyles
    });
  });

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Relatorio_Equipes_${options.month}.pdf`, options.print);
}

function loadStateFromLocalStorage<T>(key: string, companyId: string | undefined, defaultValue: T): T {
  try {
    const storeKey = companyId ? `${companyId}_${key}` : key;
    const item = window.localStorage.getItem(storeKey);
    if (item) {
      return JSON.parse(item);
    }
    const fallbackItem = window.localStorage.getItem(key);
    if (fallbackItem) {
      return JSON.parse(fallbackItem);
    }
  } catch (e) {
    console.error(e);
  }
  return defaultValue;
}

// 8. Controles (Monitoramento Mensal)
export function exportMonthlyControlReportPDF(options: {
  contract: Contract,
  month: string,
  productions: ServiceProduction[],
  services: ServiceComposition[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  controllerTeams?: ControllerTeam[],
  teamAssignments?: TeamAssignment[],
  manpowerMonthly?: ManpowerMonthlyData[],
  equipmentMonthly?: EquipmentMonthlyData[],
  employees?: Employee[],
  controllerEquipments?: ControllerEquipment[],
  print?: boolean
}) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const [year, month] = options.month.split('-').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month, 0).getDate();

  const companyId = options.contract.id;
  const controllerTeams = options.controllerTeams || loadStateFromLocalStorage('sigo_controller_teams', companyId, []);
  const teamAssignments = options.teamAssignments || loadStateFromLocalStorage('sigo_team_assignments', companyId, []);
  const employees = options.employees || loadStateFromLocalStorage('sigo_employees', companyId, []);
  const manpowerMonthly = options.manpowerMonthly || loadStateFromLocalStorage('sigo_manpower_monthly', companyId, []);
  const equipmentMonthly = options.equipmentMonthly || loadStateFromLocalStorage('sigo_equipment_monthly', companyId, []);
  const controllerEquipments = options.controllerEquipments || loadStateFromLocalStorage('sigo_controller_equipments', companyId, []);

  if (options.productions.length === 0) {
    addTechnicalHeader(doc, `Monitoramento de Produção - ${monthName}`, options);
    doc.text('Nenhum monitoramento registrado para este período.', 14, 50);
  } else {
    options.productions.forEach((p, idx) => {
      const s = options.services.find(serv => serv.id === p.serviceId);
      
      if (idx > 0) {
        doc.addPage('a4', 'portrait');
      }
      
      // 1. Process Data for Table and Chart (Move up to use in header)
      const rows: any[] = [];
      let plannedAcc = 0;
      let actualAcc = 0;
      let projectedAcc = 0;
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const targetDaily = p.workDays > 0 ? (p.unitHour * p.hoursDay * p.numEquip * (p.efficiency / 100)) : 0;
      
      const startDay = p.startDate && p.startDate.startsWith(options.month) 
        ? parseInt(p.startDate.split('-')[2]) 
        : 1;

      const isAfterEndDate = (dateStr: string) => {
        if (!p.endDate) return false;
        return dateStr > p.endDate;
      };

      const actualVals = Object.values(p.dailyData).map((d: any) => d.actual || 0).filter(v => v > 0);
      const avgActualForProjection = actualVals.length ? actualVals.reduce((a,b) => a+b, 0) / actualVals.length : 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${options.month}-${i.toString().padStart(2, '0')}`;
        const dayData = p.dailyData[dateStr] || { actual: 0 };
        const dateObj = new Date(dateStr + 'T12:00:00');
        const isWeekend = dateObj.getDay() === 0;

        const isBeforeStart = i < startDay;
        const isAfterEnd = isAfterEndDate(dateStr);

        const plannedDay = (isWeekend || isBeforeStart || isAfterEnd) ? 0 : targetDaily;
        const actualDay = dayData.actual || 0;
        const isFuture = dateObj > today;
        const effectiveProjectedDay = actualDay > 0 ? actualDay : (isFuture ? avgActualForProjection : 0);

        plannedAcc += plannedDay;
        actualAcc += actualDay;
        projectedAcc += effectiveProjectedDay;

        rows.push({
          day: i,
          date: dateStr,
          planned: plannedDay,
          plannedAcc: plannedAcc,
          actual: actualDay,
          actualAcc: actualAcc,
          projected: effectiveProjectedDay,
          projectedAcc: projectedAcc,
          isWeekend
        });
      }

      // Portrait Header with Projeção
      addTechnicalHeader(doc, `Monitoramento de Produção - ${monthName}`, options);
      
      // Blue Header (UI CardHeader style)
      doc.setFillColor(30, 58, 138); // Blue 900
      doc.rect(14, 38, 182, 22, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(191, 219, 254); // Blue 200
      doc.setFont('helvetica', 'bold');
      doc.text('ACOMPANHAMENTO FÍSICO E FINANCEIRO', 18, 44);
      
      doc.setFontSize(11); // Diminuído o tamanho da fonte para não sobrepor
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      const serviceTitle = p.customTitle || s?.name || '';
      const splitServiceTitle = doc.splitTextToSize(serviceTitle, 130);
      // Limitar e garantir que o título não desça demais
      const displayedTitle = splitServiceTitle.slice(0, 2); 
      doc.text(displayedTitle, 18, 51);
      
      doc.setFontSize(8);
      doc.setTextColor(191, 219, 254);
      doc.text(`${s?.code} | Unidade: ${s?.unit} | Mês: ${options.month}`, 18, 57);

      // Final Projection (Top Right of Blue Header)
      const finalProj = projectedAcc;
      doc.setFontSize(7);
      doc.setTextColor(191, 219, 254);
      doc.text('PROJEÇÃO FINAL DO MÊS', 155, 44);
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(formatNumber(finalProj, 1), 155, 52);
      doc.setFontSize(7);
      doc.text(`${s?.unit} Estimados`, 155, 57);

      // Operational Parameters Summary
      const totalAccFinal = (p.prevMonthAccumulated || 0) + actualAcc;

      autoTable(doc, {
        startY: 63,
        body: [
          [{ content: 'Parâmetros Operacionais', colSpan: 2 }, { content: 'Metas e Previsões', colSpan: 2 }],
          ['Nº Equipes', p.numEquip, 'Meta Diária', { content: `${formatNumber(targetDaily, 2)} ${s?.unit}`, styles: { halign: 'right' } }],
          ['Dias/Mês', p.workDays, 'Previsão Mensal', { content: `${formatNumber(targetDaily * p.workDays, 2)} ${s?.unit}`, styles: { halign: 'right' } }],
          ['Horas/Dia', p.hoursDay, 'Acumulado Ant.', { content: `${formatNumber(p.prevMonthAccumulated || 0, 2)} ${s?.unit}`, styles: { halign: 'right' } }],
          ['Data Início', p.startDate ? `${p.startDate.split('-')[2]}/${p.startDate.split('-')[1]}/${p.startDate.split('-')[0]}` : '-', 'Acumul. Total', { content: `${formatNumber(totalAccFinal, 2)} ${s?.unit}`, styles: { halign: 'right' } }],
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
          1: { cellWidth: 46, halign: 'center' },
          2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
          3: { cellWidth: 46 }
        },
        didParseCell: (data) => {
          if (data.row.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 58, 138];
            data.cell.styles.textColor = 255;
            data.cell.styles.halign = 'left';
          }
        }
      });

      // Cost Calculation
      const calculateTeamCostsLocal = () => {
        if (!p.teamId || p.teamId === 'none') return { totalMonthlyCost: 0, dailyCost: 0 };
        const t = (controllerTeams || []).find(x => x.id === p.teamId);
        if (!t) return { totalMonthlyCost: 0, dailyCost: 0 };
        
        const teamAssigns = (teamAssignments || []).filter(a => a.teamId === t.id);
        let totalCostVal = 0;
        
        teamAssigns.forEach(a => {
          if (a.type === 'manpower') {
            const monthlyData = (manpowerMonthly || []).find(m => m.manpowerId === a.memberId && m.month === p.month);
            if (monthlyData && monthlyData.salary) {
              totalCostVal += monthlyData.salary;
            } else {
              const emp = (employees || []).find(e => e.id === a.memberId);
              if (emp && emp.salary) {
                totalCostVal += emp.salary;
              }
            }
          } else if (a.type === 'equipment') {
            const monthlyData = (equipmentMonthly || []).find(m => m.equipmentId === a.memberId && m.month === p.month);
            if (monthlyData && monthlyData.cost) {
              totalCostVal += monthlyData.cost;
            } else {
              const eq = (controllerEquipments || []).find(eq => eq.id === a.memberId);
              if (eq) {
                let eqCost = eq.monthlyPrice;
                if (!eqCost && eq.contractedPrice && eq.measurementUnit === 'Mensal') {
                   eqCost = eq.contractedPrice;
                }
                if (eqCost) {
                  totalCostVal += eqCost;
                } else {
                  const atts = eq.customFields ? (Object.values(eq.customFields) as any[]) : [];
                  const monthlyCostStr = atts.find((att: any) => 
                    typeof att.name === 'string' && att.name.toLowerCase().includes('mensal')
                  )?.value;
                  if (monthlyCostStr) {
                    totalCostVal += parseFloat(monthlyCostStr) || 0;
                  }
                }
              }
            }
          }
        });
        
        const days = p.workDays || 30;
        const dailyCostVal = totalCostVal / days;
        return { totalMonthlyCost: totalCostVal, dailyCost: dailyCostVal };
      };

      const cs = (options.contract.services || []).find(x => x.serviceId === p.serviceId);
      let csPrice = cs?.price || 0;
      if (!csPrice && options.contract.groups) {
        options.contract.groups.forEach(group => {
          const gs = group.services.find(sub => sub.serviceId === p.serviceId);
          if (gs && gs.price) csPrice = gs.price;
        });
      }

      const { totalMonthlyCost, dailyCost } = calculateTeamCostsLocal();
      const workDaysActualCount = rows.filter(r => r.actual > 0).length;
      const actualTeamCostIncurred = workDaysActualCount * dailyCost;
      const valorProducaoExecutado = actualAcc * csPrice;
      const valorProducaoProjetado = projectedAcc * csPrice;
      const saldoFinanceiro = valorProducaoExecutado - actualTeamCostIncurred;

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 2,
        body: [
          [{ content: 'Controle e Acompanhamento Financeiro (R$)', colSpan: 2 }, { content: 'Rentabilidade do Período', colSpan: 2 }],
          ['Preço de Venda do Serviço', { content: `R$ ${formatNumber(csPrice, 2)}`, styles: { halign: 'right' } }, 'Valor Executado', { content: `R$ ${formatNumber(valorProducaoExecutado, 2)}`, styles: { halign: 'right' } }],
          [ 'Custo da Equipe (Mês)', { content: `R$ ${formatNumber(totalMonthlyCost, 2)}`, styles: { halign: 'right', fontStyle: 'bold' } },'Custo de Equipe (Dias Trab.)', { content: `R$ ${formatNumber(actualTeamCostIncurred, 2)}`, styles: { halign: 'right', fontStyle: 'bold' } }],
          ['Valor Produzido Projetado', { content: `R$ ${formatNumber(valorProducaoProjetado, 2)}`, styles: { halign: 'right' } }, 'Resultado Operacional Estimado', { content: `R$ ${formatNumber(saldoFinanceiro, 2)}`, styles: { halign: 'right', fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
          1: { cellWidth: 46, halign: 'right' },
          2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
          3: { cellWidth: 46, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [104, 196, 142]; // Emerald light based on the image
            data.cell.styles.textColor = 255;
            data.cell.styles.halign = 'left';
          }
          if (data.row.index === 3 && data.column.index === 3) {
            if (saldoFinanceiro < 0) {
              data.cell.styles.textColor = [185, 28, 28]; // Red
            } else {
              data.cell.styles.textColor = [4, 120, 87]; // Green
            }
          }
        }
      });

      // 3. Detailed Daily Table (Portrait)
      const tableBody: any[] = rows.map(r => [
        `${r.day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
        formatNumber(r.planned, 2),
        formatNumber(r.plannedAcc, 2),
        formatNumber(r.actual, 2),
        formatNumber(r.actualAcc, 2),
        formatNumber(r.projected, 2),
        formatNumber(r.projectedAcc, 2)
      ]);

      // Add TOTAIS row
      tableBody.push([
        { content: 'TOTAIS', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'center' } },
        { content: '-', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } },
        { content: formatNumber(plannedAcc, 2), styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } },
        { content: '-', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } },
        { content: formatNumber(actualAcc, 2), styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } },
        { content: '-', styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } },
        { content: formatNumber(projectedAcc, 2), styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255, halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 4,
        head: [
          [
            { content: 'DIA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'PREVISTO', colSpan: 2, styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [37, 99, 235] } },
            { content: 'EXECUTADO', colSpan: 2, styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [5, 150, 105] } },
            { content: 'PROJEÇÃO', colSpan: 2, styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [217, 119, 6] } }
          ],
          [
            { content: 'NO DIA', styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [37, 99, 235] } }, 
            { content: 'ACUMULADO', styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [37, 99, 235] } }, 
            { content: 'NO DIA', styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [5, 150, 105] } }, 
            { content: 'ACUMULADO', styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [5, 150, 105] } }, 
            { content: 'NO DIA', styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [217, 119, 6] } }, 
            { content: 'ACUMULADO', styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [217, 119, 6] } }
          ]
        ],
        body: tableBody,
        ...tableStyles,
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 0.8 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.row.index >= 0) {
            const r = rows[data.row.index];
            if (r?.isWeekend) {
              data.cell.styles.fillColor = [248, 250, 252];
              data.cell.styles.textColor = [150, 150, 150];
            }
          }
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
          1: { halign: 'right' },
          2: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // 4. Graph Page (Landscape)
      doc.addPage('a4', 'landscape');
      addTechnicalHeader(doc, `Gráfico de Evolução - ${monthName}`, options);
      
      const lWidth = 297; // Landscape A4 Width
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const chartTitle = `Gráfico de Evolução: ${s?.code || p.serviceId?.substring(0, 8)} - ${p.customTitle || s?.name || (p as any).name || 'Serviço não encontrado'}`;
      const splitChartTitle = doc.splitTextToSize(chartTitle, 260);
      doc.text(splitChartTitle, 14, 48);

      // Legend
      const chartW = 208; // 80% of 260
      const chartH = 88;  // 80% of 110
      const chartX = (297 - chartW) / 2;
      const chartY = 80;
      
      const legendX = chartX + chartW - 50;
      let legY = chartY - 20;
      doc.setFontSize(7);
      
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
      doc.rect(legendX, legY - 3, 10, 5, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      doc.text('Executado Diário', legendX + 12, legY + 1);

      legY += 5;
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.line(legendX, legY, legendX + 10, legY);
      doc.text('Previsto Acum.', legendX + 12, legY + 1);

      legY += 5;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1.5);
      doc.line(legendX, legY, legendX + 10, legY);
      doc.text('Executado Acum.', legendX + 12, legY + 1);

      legY += 5;
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 1], 0);
      doc.line(legendX, legY, legendX + 10, legY);
      doc.text('Projetado Acum.', legendX + 12, legY + 1);
      doc.setLineDashPattern([], 0);

      // Chart setup
      // (chartX, chartY, chartW, chartH already defined above)

      // Chart Area
      doc.setFillColor(248, 250, 252);
      doc.rect(chartX, chartY, chartW, chartH, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(chartX, chartY, chartW, chartH, 'D');

      // Grid
      doc.setLineWidth(0.1);
      doc.setDrawColor(203, 213, 225);
      const gridSteps = 10;
      for (let i = 0; i <= gridSteps; i++) {
        const yLine = chartY + (chartH / gridSteps) * i;
        doc.line(chartX, yLine, chartX + chartW, yLine);
        
        const val = ((gridSteps - i) / gridSteps) * Math.max(plannedAcc, projectedAcc, 1);
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.text(formatNumber(val, 0), chartX - 12, yLine + 1);
      }

      // Primary axis label (Left)
      doc.saveGraphicsState();
      doc.setTextColor(150);
      doc.setFontSize(7);
      doc.text('Previsto Acumulado', chartX - 22, chartY + (chartH/2) + 15, { angle: 90 });
      doc.restoreGraphicsState();

      // X-axis days
      doc.setTextColor(150);
      doc.setFontSize(6);
      for (let i = 1; i <= daysInMonth; i++) {
        const xPos = chartX + ((i-1) / (daysInMonth-1)) * chartW;
        if (i === 1 || i === daysInMonth || i % 5 === 0) {
          doc.text(i.toString(), xPos, chartY + chartH + 5, { align: 'center' });
        }
      }
      
      // X-axis label
      doc.setFontSize(7);
      doc.text('Dias', chartX + (chartW / 2), chartY + chartH + 11, { align: 'center' });

      const maxVal = Math.max(plannedAcc, projectedAcc, 1);
      const getY = (val: number) => chartY + chartH - (val / maxVal) * chartH;
      const getX = (dayIdx: number) => chartX + (dayIdx / (daysInMonth - 1)) * chartW;

      // Daily bars (Secondary axis)
      const maxDaily = Math.max(...rows.map(r => r.actual), targetDaily, 1);
      const getDailyY = (val: number) => chartY + chartH - (val / maxDaily) * (chartH * 0.4); // Bars take % of height
      doc.setFillColor(16, 185, 129); 
      doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
      const barW = (chartW / daysInMonth) * 0.6;
      rows.forEach((r, i) => {
        if (r.actual > 0) {
          const x = getX(i) - (barW / 2);
          const y = getDailyY(r.actual);
          const h = (chartY + chartH) - y;
          doc.rect(x, y, barW, h, 'F');
        }
      });
      doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

      // Daily Average Lines
      const actualValsChart = rows.map(r => r.actual).filter(v => v > 0);
      const avgActualChart = actualValsChart.length ? actualValsChart.reduce((a,b) => a+b, 0) / actualValsChart.length : 0;
      
      doc.saveGraphicsState();
      if (targetDaily > 0) {
        const yAvgPlanned = getDailyY(targetDaily);
        doc.setDrawColor(59, 130, 246); 
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(chartX, yAvgPlanned, chartX + chartW, yAvgPlanned);
        doc.setFontSize(6);
        doc.setTextColor(59, 130, 246);
        doc.text(`Média Prv: ${formatNumber(targetDaily, 1)}`, chartX + chartW + 2, yAvgPlanned + 2);
      }
      if (avgActualChart > 0) {
        const yAvgActual = getDailyY(avgActualChart);
        doc.setDrawColor(16, 185, 129); 
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(chartX, yAvgActual, chartX + chartW, yAvgActual);
        doc.setFontSize(6);
        doc.setTextColor(16, 185, 129);
        doc.text(`Média Exe: ${formatNumber(avgActualChart, 1)}`, chartX + chartW + 2, yAvgActual + 2);
      }
      doc.restoreGraphicsState();

      // Lines
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      for (let i = 0; i < rows.length - 1; i++) {
        doc.line(getX(i), getY(rows[i].plannedAcc), getX(i+1), getY(rows[i+1].plannedAcc));
      }

      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1.5);
      let lastActualDay = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].actual > 0) lastActualDay = i;
      }
      if (lastActualDay > 0) {
        for (let i = 0; i < lastActualDay; i++) {
          doc.line(getX(i), getY(rows[i].actualAcc), getX(i+1), getY(rows[i+1].actualAcc));
        }
      }

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 1], 0);
      if (lastActualDay !== -1) {
        for (let i = lastActualDay; i < rows.length - 1; i++) {
          doc.line(getX(i), getY(rows[i].projectedAcc), getX(i+1), getY(rows[i+1].projectedAcc));
        }
        const lastProjY = getY(rows[rows.length - 1].projectedAcc);
        doc.setFontSize(6);
        doc.setTextColor(245, 158, 11);
        doc.text(`Proj. Final: ${formatNumber(rows[rows.length - 1].projectedAcc, 0)}`, chartX + chartW + 2, lastProjY + 2);
      }
      doc.setLineDashPattern([], 0);

      // Draw Daily values on top of lines
      rows.forEach((r, i) => {
        if (r.actual > 0) {
          const y = getDailyY(r.actual);
          doc.saveGraphicsState();
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0); // Black color
          doc.text(formatNumber(r.actual, 1), getX(i) + 1.5, y - 2, { angle: 90 });
          doc.restoreGraphicsState();
        }
      });
    });
  }

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Relatorio_Controles_${options.month}.pdf`, options.print);
}

// 9. Excel - Resumo do Contrato
export async function exportContractSummaryExcel(options: {
  contract: Contract,
  measurements: Measurement[],
  selectedMeasurement?: Measurement,
  services: ServiceComposition[],
  baseDate?: string
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumo do Contrato');

  // Header
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').value = 'RESUMO GERENCIAL DO CONTRATO';
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.addRow(['Data de Exportação:', new Date().toLocaleDateString('pt-BR')]);
  worksheet.addRow(['Nº Contrato:', options.contract.contractNumber]);
  worksheet.addRow(['Cliente:', options.contract.client]);
  worksheet.addRow(['Obra:', options.contract.workName || '-']);
  
  const sortedMeds = [...options.measurements].sort((a, b) => a.number - b.number);
  const activeMed = options.selectedMeasurement || sortedMeds[sortedMeds.length - 1];
  const currentIndex = activeMed ? sortedMeds.indexOf(activeMed) : sortedMeds.length - 1;

  worksheet.addRow(['Medição Referência:', activeMed ? `${activeMed.number}ª Medição (${activeMed.period})` : 'N/A']);
  worksheet.addRow([]);

  const targetGroups = options.contract.groups || [];
  const summaryByGroup: any[] = [];
  
  const processGroupLogic = (name: string, groupServices: { serviceId: string; quantity: number, price?: number }[]) => {
    let contractValue = 0;
    let previousValue = 0;
    let currentValue = 0;
    let accumulatedValue = 0;
    let prevBaseValue = 0;
    let currBaseValue = 0;
    const adj = (options.contract as any).groupAdjustments?.[name] || 1;

    groupServices.forEach(gs => {
      const unitPriceBase = gs.price || 0;
      contractValue += gs.quantity * unitPriceBase;
      
      // Current Measurement
      const isCurrentEligible = checkAdjustmentEligibility(activeMed?.date, options.baseDate || options.contract.startDate);
      const currentAdj = isCurrentEligible ? adj : 1;
      const currentQty = activeMed?.items.find(i => i.serviceId === gs.serviceId)?.quantity || 0;
      currBaseValue += currentQty * unitPriceBase;
      currentValue += currentQty * unitPriceBase * currentAdj;
      
      // Previous Measurements
      const prevMeds = sortedMeds.slice(0, currentIndex === -1 ? 0 : currentIndex);
      prevMeds.forEach(med => {
        const isEligible = checkAdjustmentEligibility(med.date, options.baseDate || options.contract.startDate);
        const mAdj = isEligible ? adj : 1;
        const qty = med.items.find(i => i.serviceId === gs.serviceId)?.quantity || 0;
        prevBaseValue += qty * unitPriceBase;
        previousValue += qty * unitPriceBase * mAdj;
      });
      
      accumulatedValue = previousValue + currentValue;
    });

    if (groupServices.length > 0) {
      summaryByGroup.push({
        name,
        contractValue,
        previousValue,
        currentValue,
        accumulatedValue,
        balanceValue: contractValue - (prevBaseValue + currBaseValue),
        adjustmentIndex: adj,
        reajusteAtual: currentValue - currBaseValue,
        reajusteAcumulado: accumulatedValue - (prevBaseValue + currBaseValue)
      });
    }
  };

  if (targetGroups.length > 0) {
    targetGroups.forEach(g => processGroupLogic(g.name, g.services));
  } else if (options.contract.services) {
    processGroupLogic('Serviços Gerais', options.contract.services.map(s => ({ serviceId: s.serviceId, quantity: s.quantity, price: (s as any).price })));
  }

  const totals = summaryByGroup.reduce((acc, g) => ({
    contractValue: acc.contractValue + g.contractValue,
    previousValue: acc.previousValue + g.previousValue,
    currentValue: acc.currentValue + g.currentValue,
    accumulatedValue: acc.accumulatedValue + g.accumulatedValue,
    balanceValue: acc.balanceValue + g.balanceValue,
    reajusteAtual: acc.reajusteAtual + g.reajusteAtual,
    reajusteAcumulado: acc.reajusteAcumulado + g.reajusteAcumulado
  }), { contractValue: 0, previousValue: 0, currentValue: 0, accumulatedValue: 0, balanceValue: 0, reajusteAtual: 0, reajusteAcumulado: 0 });

  worksheet.addRow(['CAMPO', 'INFORMAÇÃO']).font = { bold: true };
  worksheet.addRow(['Valor Total Contrato (Base)', totals.contractValue]);
  worksheet.addRow(['Medição Atual (c/ Reajuste)', totals.currentValue]);
  worksheet.addRow(['Reajuste na Medição Atual', totals.reajusteAtual]);
  worksheet.addRow(['Total Acumulado (c/ Reajuste)', totals.accumulatedValue]);
  worksheet.addRow(['Reajuste Total Acumulado', totals.reajusteAcumulado]);
  worksheet.addRow(['Saldo do Contrato (Base)', totals.balanceValue]);
  worksheet.addRow(['% Executado', (totals.accumulatedValue / (totals.contractValue || 1))]);

  [8, 9, 10, 11, 12, 13].forEach(rowIdx => {
    worksheet.getCell(`B${rowIdx}`).numFmt = '"R$ "#,##0.00';
  });
  worksheet.getCell('B14').numFmt = '0.00%';

  worksheet.addRow([]);
  if (summaryByGroup.length > 0) {
    worksheet.addRow(['RESUMO POR GRUPO DE SERVIÇOS']).font = { bold: true };
    const groupHeader = worksheet.addRow(['Grupo de Serviço', 'Reajuste', 'Vlr. Contratual', 'Med. Anterior', 'Med. Atual', 'Acumulado', 'Saldo', '% Fís.']);
    groupHeader.font = { bold: true };
    groupHeader.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    summaryByGroup.forEach(g => {
      const row = worksheet.addRow([
        g.name,
        g.adjustmentIndex,
        g.contractValue,
        g.previousValue,
        g.currentValue,
        g.accumulatedValue,
        g.balanceValue,
        (g.accumulatedValue / (g.contractValue || 1))
      ]);
      [3, 4, 5, 6, 7].forEach(col => row.getCell(col).numFmt = '"R$ "#,##0.00');
      row.getCell(2).numFmt = '0.0000"x"';
      row.getCell(8).numFmt = '0.0%';
    });

    const totalRow = worksheet.addRow([
      'TOTAL DO CONTRATO',
      '',
      totals.contractValue,
      totals.previousValue,
      totals.currentValue,
      totals.accumulatedValue,
      totals.balanceValue,
      (totals.accumulatedValue / (totals.contractValue || 1))
    ]);
    totalRow.font = { bold: true };
    [3, 4, 5, 6, 7].forEach(col => totalRow.getCell(col).numFmt = '"R$ "#,##0.00');
    totalRow.getCell(8).numFmt = '0.0%';
  }

  workbook.xlsx.writeBuffer().then(buffer => {
    saveAs(new Blob([buffer]), `Resumo_Contrato_${options.contract.contractNumber}.xlsx`);
  });
}

// 10. Excel - Planilha de Medição
export async function exportMeasurementSheetExcel(options: {
  contract: Contract,
  measurement: Measurement,
  allMeasurements: Measurement[],
  services: ServiceComposition[],
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Medição ${options.measurement.number}`);

  worksheet.addRow([`PLANILHA DE MEDIÇÃO Nº ${options.measurement.number} - ${options.measurement.period}`]).font = { bold: true, size: 14 };
  worksheet.addRow([`Contrato: ${options.contract.contractNumber} | Cliente: ${options.contract.client}`]);
  worksheet.addRow([]);

  const headers = [
    'Cód', 'Discriminação', 'UM', 'P.U.', 'Qtd. Contrato', 'Total Contrato', 
    'Qtd. Med. Atual', 'Vlr. Med. Atual', 'Qtd. Med. Anterior', 'Vlr. Med. Anterior', 
    'Quant. Acum. Total', 'Saldo Qtd.', 'Saldo Vlr.', '%'
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let totalContract = 0;
  let totalAtual = 0;
  let totalAnterior = 0;
  let totalAcumulado = 0;
  let totalSaldo = 0;

  const addServiceRow = (s: any) => {
    const fullService = options.services.find(fs => fs.id === s.serviceId);
    
    // Previous measurements
    const previousMeasurements = options.allMeasurements.filter(m => m.number < options.measurement.number);
    const previousQty = previousMeasurements.reduce((acc, m) => {
      const item = m.items.find(it => it.serviceId === s.serviceId);
      return acc + (item?.quantity || 0);
    }, 0);

    // Current measurement
    const currentItem = options.measurement.items.find(item => item.serviceId === s.serviceId);
    const currentQty = currentItem?.quantity || 0;

    const accumulatedQty = previousQty + currentQty;
    const price = s.price || 0;
    
    const vlrContract = s.quantity * price;
    const vlrAtual = currentQty * price;
    const vlrAnterior = previousQty * price;
    const vlrAcumulado = accumulatedQty * price;
    const sldQtd = s.quantity - accumulatedQty;
    const sldVlr = vlrContract - vlrAcumulado;

    totalContract += vlrContract;
    totalAtual += vlrAtual;
    totalAnterior += vlrAnterior;
    totalAcumulado += vlrAcumulado;
    totalSaldo += sldVlr;

    const row = worksheet.addRow([
      fullService?.code || s.serviceId || '-',
      fullService?.name || s.description || '-',
      fullService?.unit || '-',
      price,
      s.quantity,
      vlrContract,
      currentQty,
      vlrAtual,
      previousQty,
      vlrAnterior,
      accumulatedQty,
      sldQtd,
      sldVlr,
      (accumulatedQty / (s.quantity || 1))
    ]);

    // Financial columns
    [4, 6, 8, 10, 13].forEach(col => {
      row.getCell(col).numFmt = '"R$ "#,##0.00';
    });
    // Quantities
    [5, 7, 9, 11, 12].forEach(col => {
      row.getCell(col).numFmt = '#,##0.000';
    });
    // Percentage
    row.getCell(14).numFmt = '0.0%';
  };

  if (options.contract.groups && options.contract.groups.length > 0) {
    options.contract.groups.forEach(group => {
      const groupRow = worksheet.addRow([group.name]);
      groupRow.font = { bold: true };
      groupRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      group.services.forEach(s => addServiceRow(s));
    });
  } else if (options.contract.services && options.contract.services.length > 0) {
    options.contract.services.forEach(s => addServiceRow(s));
  }

  // TOTAL row
  const footRow = worksheet.addRow([
    'TOTAL GERAL', '', '', '', '', totalContract, '', totalAtual, '', totalAnterior, '', '', totalSaldo, ''
  ]);
  footRow.font = { bold: true };
  [6, 8, 10, 13].forEach(col => {
    footRow.getCell(col).numFmt = '"R$ "#,##0.00';
  });

  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 50;
  [4, 6, 8, 10, 13].forEach(col => {
    worksheet.getColumn(col).width = 15;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Planilha_Medicao_${options.measurement.number}_${options.contract.contractNumber}.xlsx`);
}

// 11. Excel - RDO Mensal
export async function exportMonthlyRDOReportExcel(options: {
  contract: Contract,
  month: string,
  reports: DailyReport[],
}) {
  const workbook = new ExcelJS.Workbook();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const worksheet = workbook.addWorksheet('Diário de Obras');

  worksheet.addRow([`RELATÓRIO MENSAL DE DIÁRIOS - ${monthName}`]).font = { bold: true, size: 14 };
  worksheet.addRow([`Contrato: ${options.contract.contractNumber}`]);
  worksheet.addRow([]);

  options.reports.forEach(r => {
    const dateRow = worksheet.addRow([`DATA: ${new Date(r.date).toLocaleDateString('pt-BR')}`]);
    dateRow.font = { bold: true };
    dateRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    worksheet.addRow(['CLIMA', 'Manhã:', r.weatherMorning, 'Tarde:', r.weatherAfternoon, 'Noite:', r.weatherNight]);
    
    const actHeader = worksheet.addRow(['ATIVIDADES EXECUTADAS']);
    actHeader.font = { bold: true };
    
    const subHeader = worksheet.addRow(['Código', 'Descrição', 'Tipo', 'Categoria']);
    subHeader.font = { bold: true, italic: true };

    (r.activities || []).forEach(a => {
      worksheet.addRow([a.code, a.description, a.type, a.category]);
    });

    worksheet.addRow(['RECURSOS', `Equipamentos: ${(r.equipment || []).length}`, `Colaboradores: ${(r.manpower || []).length}`]);
    worksheet.addRow(['OCORRÊNCIAS', r.accidents || 'Nenhuma']);
    worksheet.addRow([]);
  });

  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 40;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `RDO_Mensal_${options.month}.xlsx`);
}

// 12. Excel - Pluviométrico
export async function exportPluviometricReportExcel(options: {
  contract: Contract,
  month: string,
  records: PluviometryRecord[],
}) {
  const workbook = new ExcelJS.Workbook();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const worksheet = workbook.addWorksheet('Pluviometria');

  worksheet.addRow([`RELATÓRIO PLUVIOMÉTRICO - ${monthName}`]).font = { bold: true, size: 14 };
  worksheet.addRow([`Contrato: ${options.contract.contractNumber}`]);
  worksheet.addRow([]);

  const header = worksheet.addRow(['Data', 'Chuva (mm)', 'Manhã', 'Tarde', 'Noite']);
  header.font = { bold: true };
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  options.records.forEach(r => {
    worksheet.addRow([
      new Date(r.date).toLocaleDateString('pt-BR'),
      r.rainfallMm || 0,
      r.morningStatus,
      r.afternoonStatus,
      r.nightStatus
    ]);
  });

  const totalRain = options.records.reduce((acc, r) => acc + (r.rainfallMm || 0), 0);
  const totalRow = worksheet.addRow(['TOTAL', totalRain, '', '', '']);
  totalRow.font = { bold: true };

  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 15;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Pluviometrico_${options.month}.xlsx`);
}

// 13. Excel - Equipes
export async function exportTeamsReportExcel(options: {
  contract: Contract,
  teams: ControllerTeam[],
  manpower: ControllerManpower[],
  equipments: ControllerEquipment[],
  assignments: TeamAssignment[],
  month: string,
}) {
  const workbook = new ExcelJS.Workbook();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const worksheet = workbook.addWorksheet('Equipes');

  worksheet.addRow([`RELATÓRIO DE EQUIPES - ${monthName}`]).font = { bold: true, size: 14 };
  worksheet.addRow([`Contrato: ${options.contract.contractNumber}`]);
  worksheet.addRow([]);

  options.teams.forEach(t => {
    const teamHeader = worksheet.addRow([`EQUIPE: ${t.name}`]);
    teamHeader.font = { bold: true };
    teamHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    teamHeader.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const ta = options.assignments.filter(a => a.teamId === t.id && (!a.endDate || (a.startDate || '') <= options.month + '-31'));
    
    worksheet.addRow(['COLABORADORES']).font = { bold: true, italic: true };
    worksheet.addRow(['Nome', 'Cargo']).font = { bold: true };
    ta.filter(a => a.type === 'manpower').forEach(a => {
      const mem = options.manpower.find(m => m.id === a.memberId);
      worksheet.addRow([mem?.name || '-', mem?.role || '-']);
    });

    worksheet.addRow(['EQUIPAMENTOS']).font = { bold: true, italic: true };
    worksheet.addRow(['Modelo', 'Placa/Série']).font = { bold: true };
    ta.filter(a => a.type === 'equipment').forEach(a => {
      const eq = options.equipments.find(e => e.id === a.memberId);
      worksheet.addRow([eq?.model || '-', eq?.plate || '-']);
    });
    
    worksheet.addRow([]);
  });

  worksheet.getColumn(1).width = 40;
  worksheet.getColumn(2).width = 30;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Equipes_${options.month}.xlsx`);
}

// 14. Excel - Controles
export async function exportMonthlyControlReportExcel(options: {
  contract: Contract,
  month: string,
  productions: ServiceProduction[],
  services: ServiceComposition[],
  controllerTeams?: ControllerTeam[],
  teamAssignments?: TeamAssignment[],
  manpowerMonthly?: ManpowerMonthlyData[],
  equipmentMonthly?: EquipmentMonthlyData[],
  employees?: Employee[],
  controllerEquipments?: ControllerEquipment[]
}) {
  const workbook = new ExcelJS.Workbook();
  const [yearStr, monthStr] = options.month.split('-'); const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const [year, month] = options.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const companyId = options.contract.id;
  const controllerTeams = options.controllerTeams || loadStateFromLocalStorage('sigo_controller_teams', companyId, []);
  const teamAssignments = options.teamAssignments || loadStateFromLocalStorage('sigo_team_assignments', companyId, []);
  const employees = options.employees || loadStateFromLocalStorage('sigo_employees', companyId, []);
  const manpowerMonthly = options.manpowerMonthly || loadStateFromLocalStorage('sigo_manpower_monthly', companyId, []);
  const equipmentMonthly = options.equipmentMonthly || loadStateFromLocalStorage('sigo_equipment_monthly', companyId, []);
  const controllerEquipments = options.controllerEquipments || loadStateFromLocalStorage('sigo_controller_equipments', companyId, []);

  const worksheet = workbook.addWorksheet('Controle de Produção');

  worksheet.addRow([`CONTROLE DE PRODUÇÃO MENSAL - ${monthName}`]).font = { bold: true, size: 14 };
  worksheet.addRow([`Contrato: ${options.contract.contractNumber}`]);
  worksheet.addRow([]);

  options.productions.forEach(p => {
    const s = options.services.find(serv => serv.id === p.serviceId);
    
    // Service Header
    const servHeader = worksheet.addRow([`SERVIÇO: ${s?.code} - ${s?.name}`]);
    servHeader.font = { bold: true, size: 12 };
    servHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    servHeader.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    worksheet.addRow([]);

    // Operational Parameters
    const targetDaily = p.workDays > 0 ? (p.unitHour * p.hoursDay * p.numEquip * (p.efficiency / 100)) : 0;
    
    let plannedAcc = 0;
    let actualAcc = 0;
    let projectedAcc = 0;

    const startDay = p.startDate && p.startDate.startsWith(options.month) 
      ? parseInt(p.startDate.split('-')[2]) 
      : 1;

    const isAfterEndDate = (dateStr: string) => {
      if (!p.endDate) return false;
      return dateStr > p.endDate;
    };

    const actualVals = Object.values(p.dailyData).map((d: any) => d.actual || 0).filter(v => v > 0);
    const avgActualForProjection = actualVals.length ? actualVals.reduce((a,b) => a+b, 0) / actualVals.length : 0;

    // First loop just to get the actualAcc for the total parameter block
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${options.month}-${i.toString().padStart(2, '0')}`;
      const actualDay = p.dailyData[dateStr]?.actual || 0;
      actualAcc += actualDay;
    }
    const totalAccFinal = (p.prevMonthAccumulated || 0) + actualAcc;

    worksheet.addRow(['PARÂMETROS OPERACIONAIS']).font = { bold: true };
    worksheet.addRow(['Nº Equipamentos', p.numEquip, '', 'Meta Diária', targetDaily]);
    worksheet.addRow(['Dias/Mês', p.workDays, '', 'Previsão Mensal', targetDaily * p.workDays]);
    worksheet.addRow(['Horas/Dia', p.hoursDay, '', 'Acumulado Ant.', p.prevMonthAccumulated || 0]);
    worksheet.addRow(['Data Início', p.startDate ? `${p.startDate.split('-')[2]}/${p.startDate.split('-')[1]}/${p.startDate.split('-')[0]}` : '-', '', 'Acumul. Total', totalAccFinal]);
    worksheet.addRow([]);

    // Calculate Costs for Excel Worksheets
    const calculateTeamCostsExcel = () => {
      if (!p.teamId || p.teamId === 'none') return { totalMonthlyCost: 0, dailyCost: 0 };
      const t = (controllerTeams || []).find(x => x.id === p.teamId);
      if (!t) return { totalMonthlyCost: 0, dailyCost: 0 };
      
      const teamAssigns = (teamAssignments || []).filter(a => a.teamId === t.id);
      let totalCostVal = 0;
      
      teamAssigns.forEach(a => {
        if (a.type === 'manpower') {
          const monthlyData = (manpowerMonthly || []).find(m => m.manpowerId === a.memberId && m.month === p.month);
          if (monthlyData && monthlyData.salary) {
            totalCostVal += monthlyData.salary;
          } else {
            const emp = (employees || []).find(e => e.id === a.memberId);
            if (emp && emp.salary) {
              totalCostVal += emp.salary;
            }
          }
        } else if (a.type === 'equipment') {
          const monthlyData = (equipmentMonthly || []).find(m => m.equipmentId === a.memberId && m.month === p.month);
          if (monthlyData && monthlyData.cost) {
            totalCostVal += monthlyData.cost;
          } else {
            const eq = (controllerEquipments || []).find(eq => eq.id === a.memberId);
            if (eq) {
              let eqCost = eq.monthlyPrice;
              if (!eqCost && eq.contractedPrice && eq.measurementUnit === 'Mensal') {
                 eqCost = eq.contractedPrice;
              }
              if (eqCost) {
                totalCostVal += eqCost;
              } else {
                const atts = eq.customFields ? (Object.values(eq.customFields) as any[]) : [];
                const monthlyCostStr = atts.find((att: any) => 
                  typeof att.name === 'string' && att.name.toLowerCase().includes('mensal')
                )?.value;
                if (monthlyCostStr) {
                  totalCostVal += parseFloat(monthlyCostStr) || 0;
                }
              }
            }
          }
        }
      });
      
      const days = p.workDays || 30;
      const dailyCostVal = totalCostVal / days;
      return { totalMonthlyCost: totalCostVal, dailyCost: dailyCostVal };
    };

    const cs = (options.contract.services || []).find(x => x.serviceId === p.serviceId);
    let csPrice = cs?.price || 0;
    if (!csPrice && options.contract.groups) {
      options.contract.groups.forEach(group => {
        const gs = group.services.find(sub => sub.serviceId === p.serviceId);
        if (gs && gs.price) csPrice = gs.price;
      });
    }

    const teamCosts = calculateTeamCostsExcel();
    const countWorkDaysActual = Object.values(p.dailyData).map((d: any) => d.actual || 0).filter(v => v > 0).length;
    const actualTeamCostIncurred = countWorkDaysActual * teamCosts.dailyCost;
    const valorProducaoExecutado = actualAcc * csPrice;
    const valorProducaoProjetado = totalAccFinal * csPrice; // uses total cumulative projection or final monthly actuals
    const saldoFinanceiro = valorProducaoExecutado - actualTeamCostIncurred;

    worksheet.addRow(['ANÁLISE FINANCEIRA E VALORES (R$)']).font = { bold: true };
    worksheet.addRow(['Preço Unitário do Serviço', csPrice, '', 'Custo Mensal da Equipe', teamCosts.totalMonthlyCost]);
    worksheet.addRow(['Custo Incorrido da Equipe', actualTeamCostIncurred, '', 'Valor Produzido Executado', valorProducaoExecutado]);
    worksheet.addRow(['Resultado Operacional Estimado', saldoFinanceiro]);
    worksheet.addRow([]);

    // Table Header with groupings
    const groupRow = worksheet.addRow(['', 'PREVISTO', '', 'EXECUTADO', '', 'PROJEÇÃO', '']);
    groupRow.font = { bold: true };
    const headerRow = worksheet.addRow(['DIA', 'NO DIA', 'ACUMULADO', 'NO DIA', 'ACUMULADO', 'NO DIA', 'ACUMULADO']);
    headerRow.font = { bold: true };
    
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    // Reset counters for table building
    plannedAcc = 0;
    actualAcc = 0;
    projectedAcc = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${options.month}-${i.toString().padStart(2, '0')}`;
      const dayData = p.dailyData[dateStr] || { actual: 0 };
      const dateObj = new Date(dateStr + 'T12:00:00');
      const isWeekend = dateObj.getDay() === 0;
      
      const isBeforeStart = i < startDay;
      const isAfterEnd = isAfterEndDate(dateStr);

      const plannedDay = (isWeekend || isBeforeStart || isAfterEnd) ? 0 : targetDaily;
      const actualDay = dayData.actual || 0;
      const isFuture = dateObj > today;
      const effectiveProjectedDay = actualDay > 0 ? actualDay : (isFuture ? avgActualForProjection : 0);

      plannedAcc += plannedDay;
      actualAcc += actualDay;
      projectedAcc += effectiveProjectedDay;

      const row = worksheet.addRow([
        `${i.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
        plannedDay,
        plannedAcc,
        actualDay,
        actualAcc,
        effectiveProjectedDay,
        projectedAcc
      ]);

      if (isWeekend) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.font = { color: { argb: 'FF94A3B8' } };
        });
      }
    }
    
    // Add spacer
    worksheet.addRow([]);
    worksheet.addRow([]);
  });

  worksheet.getColumn(1).width = 12;
  [2, 3, 4, 5, 6, 7].forEach(col => {
    worksheet.getColumn(col).width = 15;
    worksheet.getColumn(col).numFmt = '#,##0.00';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Controles_${options.month}.xlsx`);
}

// 15. PDF - Detalhes da Medição (Memórias, Cubação, Transportes)
export function exportMeasurementDetailsPDF(options: {
  contract: Contract,
  measurement: Measurement,
  memories: CalculationMemory[],
  cubation: CubationData[],
  transport: TransportData[],
  services: ServiceComposition[],
  stationGroups: StationGroup[],
  locations: HighwayLocation[],
  print?: boolean
}) {
  const doc = new jsPDF();
  
  doc.setFontSize(14);
  doc.text('DETALHAMENTO TÉCNICO DA MEDIÇÃO', 14, 20);
  doc.setFontSize(10);
  doc.text(`Medição: ${options.measurement.number} | Período: ${options.measurement.period}`, 14, 28);
  doc.text(`Contrato: ${options.contract.contractNumber} | Cliente: ${options.contract.client}`, 14, 34);

  let currentY = 45;

  // 1. Memórias de Cálculo
  doc.setFontSize(12);
  doc.text('1. MEMÓRIAS DE CÁLCULO', 14, currentY);
  currentY += 8;

  const memoryData = options.memories.filter(m => m.measurementId === options.measurement.id);
  if (memoryData.length > 0) {
    memoryData.forEach(m => {
      const s = options.services.find(serv => serv.id === m.serviceId);
      doc.setFontSize(10);
      doc.text(`Serviço: ${s?.code || '-'} - ${s?.name || m.serviceId}`, 14, currentY);
      currentY += 5;

      const tableData = m.rows.map(r => [
        r.values['estaca'] || r.values['Local'] || '-',
        r.values['area']?.toString() || r.values['Área']?.toString() || '0',
        r.values['largura']?.toString() || r.values['Largura']?.toString() || '0',
        r.values['comprimento']?.toString() || r.values['Comprimento']?.toString() || '0',
        r.values['subtotal']?.toString() || r.values['Subtotal']?.toString() || '0'
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Estaca/Local', 'Área', 'Largura', 'Comp.', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 58, 138] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });
  } else {
    doc.setFontSize(9);
    doc.text('Nenhuma memória de cálculo lançada.', 14, currentY);
    currentY += 15;
  }

  // 2. Cubação
  if (currentY > 230) { doc.addPage(); currentY = 20; }
  doc.setFontSize(12);
  doc.text('2. CUBAGEM (VOLUME)', 14, currentY);
  currentY += 8;

  const cubationData = options.cubation.filter(c => c.measurementId === options.measurement.id);
  if (cubationData.length > 0) {
    cubationData.forEach(c => {
      const g = options.stationGroups.find(group => group.id === c.stationGroupId);
      doc.setFontSize(10);
      doc.text(`Grupo: ${g?.name || c.stationGroupId}`, 14, currentY);
      currentY += 5;

      const tableData = c.rows.map(r => [
        r.estaca || '-',
        r.acFc || '-',
        r.area?.toString() || '0',
        r.semiDistancia?.toString() || '0',
        r.volume?.toString() || '0'
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [['Estaca', 'Tipo', 'Área (m²)', 'Semi-Dist (m)', 'Volume (m³)']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });
  } else {
    doc.setFontSize(9);
    doc.text('Nenhuma cubagem lançada.', 14, currentY);
    currentY += 15;
  }

  // 3. Transportes
  if (currentY > 230) { doc.addPage(); currentY = 20; }
  doc.setFontSize(12);
  doc.text('3. TRANSPORTES E DMT', 14, currentY);
  currentY += 8;

  const transportData = options.transport.filter(t => t.measurementId === options.measurement.id);
  if (transportData.length > 0) {
    transportData.forEach(t => {
      doc.setFontSize(10);
      doc.text(`Serviço de Transporte (ID): ${t.serviceId}`, 14, currentY);
      currentY += 5;

      const tableData = t.rows.map(r => {
        const loc = options.locations.find(l => l.id === r.locationId);
        return [
          loc?.name || r.locationId || '-',
          r.initialStation || '-',
          r.dmt?.toString() || '0',
          r.volume?.toString() || '0',
          r.moment?.toString() || '0'
        ];
      });

      (doc as any).autoTable({
        startY: currentY,
        head: [['Local/Origem', 'Estaca Ref.', 'DMT (km)', 'Volume (m³)', 'M.T. (m³.km)']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });
  } else {
    doc.setFontSize(9);
    doc.text('Nenhum transporte lançado.', 14, currentY);
  }

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Detalhamento_Medicao_${options.measurement.number}.pdf`, options.print);
}

// 16. Excel - Detalhes da Medição
export async function exportMeasurementDetailsExcel(options: {
  contract: Contract,
  measurement: Measurement,
  memories: CalculationMemory[],
  cubation: CubationData[],
  transport: TransportData[],
  services: ServiceComposition[],
  stationGroups: StationGroup[],
  locations: HighwayLocation[]
}) {
  const workbook = new ExcelJS.Workbook();

  // Tab 1: Memórias
  const sheetMem = workbook.addWorksheet('Memórias de Cálculo');
  sheetMem.addRow(['MEMÓRIAS DE CÁLCULO']).font = { bold: true, size: 14 };
  sheetMem.addRow([`Medição ${options.measurement.number} - ${options.measurement.period}`]);
  sheetMem.addRow([]);

  const memHeader = sheetMem.addRow(['Estaca/Local', 'Área', 'Largura', 'Comprimento', 'Subtotal', 'Serviço']);
  memHeader.font = { bold: true };
  memHeader.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; });

  options.memories.filter(m => m.measurementId === options.measurement.id).forEach(m => {
    const s = options.services.find(serv => serv.id === m.serviceId);
    m.rows.forEach(r => {
      sheetMem.addRow([
        r.values['estaca'] || r.values['Local'], 
        r.values['area'] || r.values['Área'], 
        r.values['largura'] || r.values['Largura'], 
        r.values['comprimento'] || r.values['Comprimento'], 
        r.values['subtotal'] || r.values['Subtotal'], 
        `${s?.code} - ${s?.name}`
      ]);
    });
  });

  // Tab 2: Cubação
  const sheetCub = workbook.addWorksheet('Cubagem');
  sheetCub.addRow(['PLANILHA DE CUBAGEM']).font = { bold: true, size: 14 };
  sheetCub.addRow([]);
  const cubHeader = sheetCub.addRow(['Grupo', 'Estaca', 'Tipo', 'Área (m²)', 'Semi-Dist (m)', 'Volume (m³)']);
  cubHeader.font = { bold: true };
  cubHeader.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; });

  options.cubation.filter(c => c.measurementId === options.measurement.id).forEach(c => {
    const g = options.stationGroups.find(group => group.id === c.stationGroupId);
    c.rows.forEach(r => {
      sheetCub.addRow([g?.name, r.estaca, r.acFc, r.area, r.semiDistancia, r.volume]);
    });
  });

  // Tab 3: Transportes
  const sheetTransp = workbook.addWorksheet('Transportes');
  sheetTransp.addRow(['TRANSPORTES E DMT']).font = { bold: true, size: 14 };
  sheetTransp.addRow([]);
  const transHeader = sheetTransp.addRow(['Origem', 'Estaca Ref.', 'DMT (km)', 'Volume (m³)', 'Momento Transp.', 'Serviço ID']);
  transHeader.font = { bold: true };
  transHeader.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; });

  options.transport.filter(t => t.measurementId === options.measurement.id).forEach(t => {
    t.rows.forEach(r => {
      const loc = options.locations.find(l => l.id === r.locationId);
      sheetTransp.addRow([loc?.name || r.locationId, r.initialStation, r.dmt, r.volume, r.moment, t.serviceId]);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Detalhamento_Medicao_${options.measurement.number}.xlsx`);
}

// 17. PDF - Cronograma
export function exportSchedulePDF(options: {
  contract: Contract,
  schedule: TechnicalSchedule,
  services: ServiceComposition[],
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  print?: boolean
}) {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(14);
  doc.text('CRONOGRAMA FÍSICO-FINANCEIRO', 14, 20);
  doc.setFontSize(10);
  doc.text(`Contrato: ${options.contract.contractNumber} | Obra: ${options.contract.workName || '-'}`, 14, 28);

  const tableData = options.schedule.services.map(ss => {
    const s = options.services.find(serv => serv.id === ss.serviceId);
    const cs = options.contract.services?.find(serv => serv.serviceId === ss.serviceId);
    const totalQty = ss.distribution.reduce((acc, d) => acc + (d.plannedQty || 0), 0);
    const totalVal = ss.distribution.reduce((acc, d) => acc + (d.plannedValue || 0), 0);
    
    return [
      s?.code || '-',
      s?.name || '-',
      s?.unit || '-',
      totalQty.toLocaleString('pt-BR', { minimumFractionDigits: 3 }),
      `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ];
  });

  (doc as any).autoTable({
    startY: 35,
    head: [['Código', 'Descrição', 'Unid.', 'Qtd. Total Planejada', 'Valor Total Planejado']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] }
  });

  addTechnicalFooter(doc);
  handleSaveOrPrintPDF(doc, `Cronograma_${options.contract.contractNumber}.pdf`, options.print);
}
