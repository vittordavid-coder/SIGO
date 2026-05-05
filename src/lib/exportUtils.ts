import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Quotation, ServiceComposition, Resource, TechnicalSchedule, Contract, Schedule } from '../types';
import { calculateServiceUnitCost, calculateResourceSchedule, calculateMonthlyResourceABC, calculateProductionAndCostSummary } from './calculations';
import { formatCurrency, formatNumber } from './utils';

export function exportContractSpreadsheetToExcel(contract: Contract, services: ServiceComposition[]) {
  const data: any[][] = [
    ['Grupo', 'Código do Serviço', 'Descrição do Serviço', 'Unidade', 'Quantidade', 'Preço Unitário']
  ];

  if (contract.groups && contract.groups.length > 0) {
    contract.groups.forEach(g => {
      if (g.services && g.services.length > 0) {
        g.services.forEach(gs => {
          const s = services.find(serv => serv.id === gs.serviceId) || services.find(serv => serv.code === (gs as any).code);
          data.push([
            g.name || 'Geral',
            s?.code || (gs as any).code || '',
            s?.name || (gs as any).name || (gs as any).description || '',
            s?.unit || (gs as any).unit || (gs as any).measurementUnit || '',
            gs.quantity,
            gs.price || 0
          ]);
        });
      }
    });
  } else if (contract.services && contract.services.length > 0) {
    contract.services.forEach(gs => {
      const s = services.find(serv => serv.id === gs.serviceId) || services.find(serv => serv.code === (gs as any).code);
      data.push([
        'Principal',
        s?.code || (gs as any).code || '',
        s?.name || (gs as any).name || (gs as any).description || '',
        s?.unit || (gs as any).unit || (gs as any).measurementUnit || '',
        gs.quantity,
        gs.price || 0
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Planilha_Contratual");
  XLSX.writeFile(wb, `contrato_${contract.contractNumber || 'export'}.xlsx`);
}

export function exportTechnicalScheduleToExcel(
  schedule: TechnicalSchedule, 
  contract: Contract,
  services: ServiceComposition[], 
  resources: Resource[],
  budgetItems: { serviceId: string, quantity: number, price?: number }[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cronograma Físico-Financeiro');

  const periods = Array.from({ length: schedule.duration }, (_, i) => i);
  const start = new Date(schedule.startDate + 'T12:00:00');

  // Month Grouping
  const monthGroups: { monthYear: string; duration: number }[] = [];
  periods.forEach(idx => {
    const d = new Date(start);
    if (schedule.timeUnit === 'days') d.setDate(start.getDate() + idx);
    else if (schedule.timeUnit === 'weeks') d.setDate(start.getDate() + (idx * 7));
    else d.setMonth(start.getMonth() + idx);

    const my = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].monthYear !== my) {
      monthGroups.push({ monthYear: my, duration: 1 });
    } else {
      monthGroups[monthGroups.length - 1].duration++;
    }
  });

  // Header 1: Month Groups
  const header1 = ['', '', ''];
  monthGroups.forEach(g => {
    header1.push(g.monthYear);
    for (let i = 1; i < g.duration; i++) header1.push('');
  });
  header1.push('TOTAL', 'SALDO');
  
  const row1 = worksheet.addRow(header1);
  row1.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Merge month groups
  let currentCol = 4;
  monthGroups.forEach(g => {
    worksheet.mergeCells(1, currentCol, 1, currentCol + g.duration - 1);
    const cell = worksheet.getCell(1, currentCol);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // blue-900
    currentCol += g.duration;
  });

  // Header 2: Period Labels
  const header2 = ['CÓDIGO', 'SERVIÇO', 'TIPO'];
  periods.forEach(p => {
    const d = new Date(start);
    if (schedule.timeUnit === 'days') d.setDate(start.getDate() + p);
    else if (schedule.timeUnit === 'weeks') d.setDate(start.getDate() + (p * 7));
    else d.setMonth(start.getMonth() + p);
    
    header2.push(schedule.timeUnit === 'days' ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 
                 schedule.timeUnit === 'weeks' ? `SEM ${p+1}` : d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase());
  });
  header2.push('ACUMULADO', 'A EXECUTAR');
  const row2 = worksheet.addRow(header2);
  row2.font = { bold: true, size: 9 };
  row2.alignment = { horizontal: 'center' };
  row2.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Data Rows
  budgetItems.forEach(bi => {
    const s = services.find(serv => serv.id === bi.serviceId);
    const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
    const ss = schedule.services.find(x => x.serviceId === bi.serviceId);

    const getVal = (p: number, field: string) => {
      const d = ss?.distribution.find(dist => dist.periodIndex === p);
      return (d as any)?.[field] || 0;
    };

    const accum = (field: string) => ss?.distribution.reduce((acc, d) => acc + ((d as any)[field] || 0), 0) || 0;

    // 4 rows per service
    const rows = [
      { type: 'QTD PREV', field: 'plannedQty', color: 'FFF8FAFC', textColor: 'FF64748B' },
      { type: 'QTD EXEC', field: 'actualQty', color: 'FFEFF6FF', textColor: 'FF1E40AF' },
      { type: 'VLR PREV', field: 'plannedValue', color: 'FFF0FDF4', textColor: 'FF166534' },
      { type: 'VLR EXEC', field: 'actualValue', color: 'FFECFDF5', textColor: 'FF065F46' }
    ];

    rows.forEach((r, rIdx) => {
      const dataRow: (string | number | undefined)[] = [rIdx === 0 ? s?.code : '', rIdx === 0 ? s?.name : '', r.type];
      periods.forEach(p => dataRow.push(getVal(p, r.field)));
      
      const total = accum(r.field);
      dataRow.push(total);
      
      // Balance only for QTD PREV and VLR PREV relative to contract total
      if (r.field === 'plannedQty') dataRow.push(bi.quantity - total);
      else if (r.field === 'plannedValue') dataRow.push((bi.quantity * unitCost) - total);
      else if (r.field === 'actualQty') dataRow.push(bi.quantity - total);
      else if (r.field === 'actualValue') dataRow.push((bi.quantity * unitCost) - total);
      else dataRow.push('');

      const excelRow = worksheet.addRow(dataRow);
      excelRow.font = { size: 9, color: { argb: r.textColor } };
      if (rIdx === 0) {
        worksheet.mergeCells(excelRow.number, 1, excelRow.number + 3, 1);
        worksheet.mergeCells(excelRow.number, 2, excelRow.number + 3, 2);
      }
      
      excelRow.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.color } };
        cell.border = { bottom: { style: 'hair' }, right: { style: 'hair' } };
        if (colNum > 3) {
          cell.numFmt = colNum <= 3 + periods.length + 1 ? '#,##0.000' : '\"R$\" #,##0.00';
        }
      });
    });
  });

  // Adjust Column Widths
  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 12;
  for (let i = 0; i < periods.length + 2; i++) {
    worksheet.getColumn(4 + i).width = 15;
  }

  workbook.xlsx.writeBuffer().then(buffer => {
    saveAs(new Blob([buffer]), `Cronograma_Sala_Tecnica_${contract.contractNumber}.xlsx`);
  });
}

export function exportTechnicalScheduleToPDF(
  schedule: TechnicalSchedule, 
  contract: Contract,
  services: ServiceComposition[], 
  resources: Resource[],
  budgetItems: { serviceId: string, quantity: number, price?: number }[]
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = 45;
  
  addReportHeader(doc, { 
    reportTitle: 'Cronograma Físico-Financeiro - Sala Técnica', 
    projectName: `Contrato: ${contract.contractNumber} - ${contract.object}`,
    orientation: 'landscape'
  });

  const periods = Array.from({ length: schedule.duration }, (_, i) => i);
  // Due to space constraints in PDF Landscape, we'll chunk by 8 periods
  const chunkSize = 8;
  const chunks = [];
  for (let i = 0; i < periods.length; i += chunkSize) {
    chunks.push(periods.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) doc.addPage();
    if (chunkIdx > 0) {
      addReportHeader(doc, { 
        reportTitle: `Cronograma Físico-Financeiro (Parte ${chunkIdx + 1})`, 
        projectName: contract.contractNumber,
        orientation: 'landscape'
      });
    }

    const head = [
      ['Item / Serviço', 'Tipo', ...chunk.map(p => {
        const start = new Date(schedule.startDate + 'T12:00:00');
        const d = new Date(start);
        if (schedule.timeUnit === 'days') d.setDate(start.getDate() + p);
        else if (schedule.timeUnit === 'weeks') d.setDate(start.getDate() + (p * 7));
        else d.setMonth(start.getMonth() + p);
        return schedule.timeUnit === 'months' ? d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase() : `P${p+1}\n${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      }), 'Acumulado', 'Saldo']
    ];

    const body: any[] = [];
    budgetItems.forEach(bi => {
      const s = services.find(serv => serv.id === bi.serviceId);
      const unitCost = bi.price || (s ? calculateServiceUnitCost(s, resources, services) : 0);
      const ss = schedule.services.find(x => x.serviceId === bi.serviceId);

      const getVal = (p: number, field: string) => {
        const d = ss?.distribution.find(dist => dist.periodIndex === p);
        const val = (d as any)?.[field] || 0;
        return field.includes('Qty') ? formatNumber(val, 2) : formatCurrency(val);
      };

      const accumVal = (field: string) => {
        const val = ss?.distribution.reduce((acc, d) => acc + ((d as any)[field] || 0), 0) || 0;
        return field.includes('Qty') ? formatNumber(val, 2) : formatCurrency(val);
      };

      const balanceVal = (field: string) => {
        const total = ss?.distribution.reduce((acc, d) => acc + ((d as any)[field] || 0), 0) || 0;
        const target = field.includes('Qty') ? bi.quantity : bi.quantity * unitCost;
        const res = target - total;
        return field.includes('Qty') ? formatNumber(res, 2) : formatCurrency(res);
      };

      body.push([
        { content: `${s?.code}\n${s?.name}`, rowSpan: 4, styles: { fontStyle: 'bold', fontSize: 7 } },
        'Qtd. Prev.', ...chunk.map(p => getVal(p, 'plannedQty')), accumVal('plannedQty'), balanceVal('plannedQty')
      ]);
      body.push(['Qtd. Exec.', ...chunk.map(p => getVal(p, 'actualQty')), accumVal('actualQty'), balanceVal('actualQty')]);
      body.push(['Vlr. Prev.', ...chunk.map(p => getVal(p, 'plannedValue')), accumVal('plannedValue'), balanceVal('plannedValue')]);
      body.push(['Vlr. Exec.', ...chunk.map(p => getVal(p, 'actualValue')), accumVal('actualValue'), balanceVal('actualValue')]);
    });

    autoTable(doc, {
      startY: chunkIdx === 0 ? 55 : 45,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 15, fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index % 4 === 1) data.cell.styles.fillColor = [239, 246, 255]; // blue-50
        if (data.row.index % 4 === 2) data.cell.styles.fillColor = [240, 253, 244]; // green-50
        if (data.row.index % 4 === 3) data.cell.styles.fillColor = [236, 253, 245]; // emerald-50
      }
    });
  });

  addReportFooter(doc);
  doc.save(`Cronograma_Tecnico_${contract.contractNumber}.pdf`);
}

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

interface ReportOptions {
  companyName?: string;
  projectName?: string;
  reportTitle: string;
  orientation?: 'portrait' | 'landscape';
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
}

function addReportHeader(doc: jsPDF, options: ReportOptions) {
  const pageWidth = doc.internal.pageSize.width;
  const mode = options.logoMode || 'left';
  
  // Header Background
  doc.setFillColor(30, 58, 138); // Tailwind blue-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  const showLeft = (mode === 'left' || mode === 'both') && options.companyLogo;
  const showRight = (mode === 'right' || mode === 'both') && options.companyLogoRight;

  // Logos
  if (showLeft) {
    try {
      const imgData = options.companyLogo!;
      const props = doc.getImageProperties(imgData);
      const ratio = props.width / props.height;
      let w = 30;
      let h = 30 / ratio;
      if (h > 30) {
        h = 30;
        w = 30 * ratio;
      }
      const y = (40 - h) / 2;
      doc.addImage(imgData, 'PNG', 14, y, w, h);
    } catch (e) { 
      try { doc.addImage(options.companyLogo!, 'PNG', 14, 5, 30, 30); } catch(ex) {}
      console.error("Logo Error", e); 
    }
  }

  if (showRight) {
    try {
      const imgData = options.companyLogoRight!;
      const props = doc.getImageProperties(imgData);
      const ratio = props.width / props.height;
      let w = 30;
      let h = 30 / ratio;
      if (h > 30) {
        h = 30;
        w = 30 * ratio;
      }
      const y = (40 - h) / 2;
      doc.addImage(imgData, 'PNG', pageWidth - 14 - w, y, w, h);
    } catch (e) { 
      try { doc.addImage(options.companyLogoRight!, 'PNG', pageWidth - 44, 5, 30, 30); } catch(ex) {}
      console.error("Logo Right Error", e); 
    }
  }

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(showLeft ? 16 : 20);
  doc.setFont('helvetica', 'bold');
  
  const textX = showLeft ? 50 : 14;
  doc.text(options.companyName || 'Sistema de Orçamentos', textX, 20);
  
  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(options.reportTitle, textX, 30);
  
  // Date and Project
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const dateStr = new Date().toLocaleDateString('pt-BR');
  
  const alignX = showRight ? pageWidth - 50 : pageWidth - 14;

  doc.text(`Data: ${dateStr}`, alignX, 20, { align: 'right' });
  if (options.projectName) {
    doc.text(`Projeto: ${options.projectName}`, alignX, 30, { align: 'right' });
  }
  
  // Reset text color for body
  doc.setTextColor(0, 0, 0);
}

function addReportFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Gerado por Sistema de Orçamentos', 14, pageHeight - 10);
  }
}

function addSummaryBox(doc: jsPDF, y: number, title: string, value: string, x: number = 14, width: number = 60) {
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(x, y, width, 18, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'normal');
  doc.text(title, x + 4, y + 7);
  
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  
  const splitValue = doc.splitTextToSize(value, width - 8);
  doc.text(splitValue, x + 4, y + 13);
}

const tableStyles = {
  headStyles: { fillColor: [30, 58, 138] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.1 },
};

const planilhaColumnStyles = {
  0: { cellWidth: 22 }, // Código
  1: { cellWidth: 'auto' as const }, // Descrição
  2: { cellWidth: 15, halign: 'center' as const }, // Unid
  3: { cellWidth: 25, halign: 'right' as const }, // Qtd
  4: { cellWidth: 30, halign: 'right' as const }, // Unitário
  5: { cellWidth: 35, halign: 'right' as const }  // Total
};

export function exportServicesToExcel(services: ServiceComposition[], resources: Resource[]) {
  const data = services.map(s => ({
    Código: s.code,
    Descrição: s.name,
    Unidade: s.unit,
    'Custo Unitário': calculateServiceUnitCost(s, resources, services)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Serviços');
  XLSX.writeFile(wb, 'lista_servicos.xlsx');
}

export function exportServicesToPDF(services: ServiceComposition[], resources: Resource[], logo?: string, bdi: number = 0) {
  const doc = new jsPDF();
  addReportHeader(doc, { reportTitle: 'Relatório de Serviços' });
  
  const totalServices = services.length;
  const avgCost = services.length > 0 ? services.reduce((acc, s) => acc + calculateServiceUnitCost(s, resources, services), 0) / services.length : 0;
  
  addSummaryBox(doc, 45, 'Total de Serviços', totalServices.toString(), 14, 50);
  addSummaryBox(doc, 45, 'Custo Médio Dir.', formatCurrency(avgCost), 68, 60);
  if (bdi > 0) {
    addSummaryBox(doc, 45, 'BDI Aplicado', `${formatNumber(bdi, 2)}%`, 132, 60);
  }
  
  const tableData = services.map(s => [
    s.code,
    s.name,
    s.unit,
    formatCurrency(calculateServiceUnitCost(s, resources, services)),
    bdi > 0 ? formatCurrency(calculateServiceUnitCost(s, resources, services, bdi)) : '-'
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Descrição', 'Unid.', 'Custo Dir.', 'Preço c/ BDI']],
    body: tableData,
    ...tableStyles,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' as const },
      2: { cellWidth: 15, halign: 'center' as const },
      3: { cellWidth: 35, halign: 'right' as const },
      4: { cellWidth: 35, halign: 'right' as const }
    }
  });

  addReportFooter(doc);
  doc.save('lista_servicos.pdf');
}

export function exportAllCompositionsToExcel(services: ServiceComposition[], resources: Resource[]) {
  const wb = XLSX.utils.book_new();

  services.forEach(s => {
    const items = s.items.map(item => {
      const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
      return {
        Código: res?.code,
        Descrição: res?.name,
        Unidade: res?.unit,
        Consumo: item.consumption,
        Preço: (res as any)?.basePrice || calculateServiceUnitCost(res as any, resources, services),
        Total: item.consumption * ((res as any)?.basePrice || calculateServiceUnitCost(res as any, resources, services))
      };
    });

    const ws = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, ws, s.code.substring(0, 31));
  });

  XLSX.writeFile(wb, 'composicoes_detalhadas.xlsx');
}

export function exportQuotationToPDF(quotation: Quotation, services: ServiceComposition[], resources: Resource[], logo?: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addReportHeader(doc, { 
    reportTitle: 'Relatório de Orçamento',
    projectName: quotation.budgetName,
    orientation: 'landscape'
  });
  
  let totalCost = 0;
  const tableData: any[] = [];
  
  // Main services (without groups)
  (quotation.services || []).forEach(qs => {
    if (qs.quantity <= 0) return;
    const s = services.find(serv => serv.id === qs.serviceId);
    if (!s) return;
    
    const cost = calculateServiceUnitCost(s, resources, services);
    const total = cost * qs.quantity;
    totalCost += total;
    tableData.push([
      s.code || '',
      s.name || '',
      s.unit || '',
      formatNumber(qs.quantity, 3),
      formatCurrency(cost),
      formatCurrency(total)
    ]);
  });

  // Groups
  (quotation.groups || []).forEach(group => {
    if (!group.services || group.services.length === 0) return;
    
    const headerRowIndex = tableData.length;
    // Add group header row
    tableData.push([
      { content: '', styles: { fillColor: [241, 245, 249] } },
      { content: group.name, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: '', styles: { fillColor: [241, 245, 249], halign: 'right', fontStyle: 'bold' } }
    ]);
    
    let groupTotal = 0;
    group.services.forEach(gs => {
      if (gs.quantity <= 0) return;
      const s = services.find(serv => serv.id === gs.serviceId);
      if (!s) return;

      const cost = calculateServiceUnitCost(s, resources, services);
      const total = cost * gs.quantity;
      groupTotal += total;
      totalCost += total;
      tableData.push([
        s.code || '',
        s.name || '',
        s.unit || '',
        formatNumber(gs.quantity, 3),
        formatCurrency(cost),
        formatCurrency(total)
      ]);
    });
    
    // Update group header with total (column index 2 because of colSpan on index 1)
    if (tableData[headerRowIndex]) {
      tableData[headerRowIndex][2] = { 
        content: formatCurrency(groupTotal), 
        styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } 
      };
    }
  });

  addSummaryBox(doc, 45, 'Órgão / Cliente', quotation.organization || '', 14, 80);
  addSummaryBox(doc, 45, 'Data Base', quotation.date || '', 110, 60);
  addSummaryBox(doc, 45, 'Valor Total', formatCurrency(totalCost), 186, 60);

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Descrição', 'Unid.', 'Qtd.', 'Unitário', 'Total']],
    body: tableData,
    ...tableStyles,
    theme: 'grid',
    columnStyles: planilhaColumnStyles
  });

  addReportFooter(doc);
  doc.save(`${quotation.budgetName}.pdf`);
}

export function exportCompositionToPDF(service: ServiceComposition, resources: Resource[], allServices: ServiceComposition[], logo?: string, bdi: number = 0) {
  const doc = new jsPDF();
  addReportHeader(doc, { reportTitle: 'Composição Analítica de Serviço' });
  
  const directCost = calculateServiceUnitCost(service, resources, allServices);
  
  addSummaryBox(doc, 45, 'Código', service.code, 14, 25);
  addSummaryBox(doc, 45, 'Descrição do Serviço', service.name, 41, 130);
  addSummaryBox(doc, 45, 'Unidade', service.unit, 173, 23);
  
  const tableData = service.items.map(item => {
    const res = resources.find(r => r.id === item.resourceId) || allServices.find(s => s.id === item.resourceId);
    const price = (res as any)?.basePrice || calculateServiceUnitCost(res as any, resources, allServices);
    return [
      res?.code || '',
      res?.name || '',
      res?.unit || '',
      formatNumber(item.consumption, 6),
      formatCurrency(price),
      formatCurrency(price * item.consumption)
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Descrição', 'Unid.', 'Consumo', 'Preço', 'Total']],
    body: tableData,
    ...tableStyles,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' as const },
      2: { cellWidth: 15, halign: 'center' as const },
      3: { cellWidth: 30, halign: 'right' as const },
      4: { cellWidth: 35, halign: 'right' as const },
      5: { cellWidth: 35, halign: 'right' as const }
    }
  });

  const lastY = (doc as any).lastAutoTable.finalY + 10;
  
  // Extra Info near footer/bottom of table
  if (service.production > 0) {
    addSummaryBox(doc, lastY, 'Produção da Equipe', formatNumber(service.production, 4), 14, 50);
  }
  
  // Always show Direct Cost at bottom too for clarity, before BDI/Total
  addSummaryBox(doc, lastY, 'Custo Direto', formatCurrency(directCost), 68, 40);

  if (bdi > 0) {
    addSummaryBox(doc, lastY, 'BDI (%)', `${formatNumber(bdi, 2)}%`, 112, 35);
    addSummaryBox(doc, lastY, 'Preço com BDI', formatCurrency(directCost * (1 + bdi / 100)), 151, 45);
  }

  addReportFooter(doc);
  doc.save(`composicao_${service.code}.pdf`);
}

export function exportResourcesToExcel(resources: Resource[]) {
  const data = resources.map(r => ({
    Código: r.code,
    Nome: r.name,
    Unidade: r.unit,
    Tipo: r.type === 'labor' ? 'Mão de Obra' : r.type === 'material' ? 'Material' : 'Equipamento',
    'Preço Base': r.basePrice
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
  XLSX.writeFile(wb, 'lista_insumos.xlsx');
}

export function exportResourcesToPDF(resources: Resource[], logo?: string) {
  const doc = new jsPDF();
  addReportHeader(doc, { reportTitle: 'Relatório de Insumos' });
  
  const total = resources.length;
  const labor = resources.filter(r => r.type === 'labor').length;
  const material = resources.filter(r => r.type === 'material').length;
  const equip = resources.filter(r => r.type === 'equipment').length;
  
  addSummaryBox(doc, 45, 'Total', total.toString(), 14, 40);
  addSummaryBox(doc, 45, 'Materiais', material.toString(), 58, 40);
  addSummaryBox(doc, 45, 'Mão de Obra', labor.toString(), 102, 40);
  addSummaryBox(doc, 45, 'Equipamentos', equip.toString(), 146, 50);
  
  // Group resources by type
  const types = [
    { id: 'material', label: 'Materiais' },
    { id: 'labor', label: 'Mão de Obra' },
    { id: 'equipment', label: 'Equipamentos' }
  ];

  const tableData: any[] = [];
  
  types.forEach(type => {
    const filtered = resources.filter(r => r.type === type.id);
    if (filtered.length > 0) {
      tableData.push([
        { content: type.label, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
      ]);
      
      filtered.forEach(r => {
        tableData.push([
          r.code,
          r.name,
          r.unit,
          r.type === 'labor' ? 'Mão de Obra' : r.type === 'material' ? 'Material' : 'Equipamento',
          formatCurrency(r.basePrice)
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Nome', 'Unid.', 'Tipo', 'Preço Base']],
    body: tableData,
    ...tableStyles,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' as const },
      2: { cellWidth: 15, halign: 'center' as const },
      3: { cellWidth: 30 },
      4: { cellWidth: 40, halign: 'right' as const }
    }
  });

  addReportFooter(doc);
  doc.save('lista_insumos.pdf');
}

export function exportQuotationsToExcel(quotations: Quotation[]) {
  const data = quotations.map(q => ({
    Nome: q.budgetName,
    Órgão: q.organization,
    Data: q.date,
    Versão: q.version
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cotações');
  XLSX.writeFile(wb, 'lista_cotacoes.xlsx');
}

function getPeriodLabel(schedule: any, index: number): string {
  if (!schedule.startDate) return `P${index + 1}`;
  const start = new Date(schedule.startDate + 'T12:00:00');
  
  if (schedule.timeUnit === 'days') {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const weekday = current.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayMonth = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `Dia ${index + 1}\n${weekday.charAt(0).toUpperCase() + weekday.slice(1)}\n${dayMonth}`;
  }
  
  if (schedule.timeUnit === 'weeks') {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (index * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const format = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `Sem. ${index + 1}\n${format(weekStart)} a ${format(weekEnd)}`;
  }
  
  if (schedule.timeUnit === 'months') {
    const current = new Date(start);
    current.setMonth(start.getMonth() + index);
    const monthYear = current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return `Mês ${index + 1}\n${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}`;
  }
  
  return `P${index + 1}`;
}

export function exportScheduleToExcel(schedule: Schedule, services: ServiceComposition[], resources: Resource[], title: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cronograma');

  const periods = Array.from({ length: schedule.duration }, (_, i) => i);
  const start = new Date(schedule.startDate + 'T12:00:00');

  // Month Grouping logic for header
  const monthGroups: { monthYear: string; duration: number }[] = [];
  periods.forEach(idx => {
    const d = new Date(start);
    if (schedule.timeUnit === 'days') d.setDate(start.getDate() + idx);
    else if (schedule.timeUnit === 'weeks') d.setDate(start.getDate() + (idx * 7));
    else d.setMonth(start.getMonth() + idx);

    const my = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].monthYear !== my) {
      monthGroups.push({ monthYear: my, duration: 1 });
    } else {
      monthGroups[monthGroups.length - 1].duration++;
    }
  });

  // Header 1: Months
  const h1 = ['', '', ''];
  monthGroups.forEach(g => {
    h1.push(g.monthYear);
    for (let i = 1; i < g.duration; i++) h1.push('');
  });
  h1.push('TOTAL', 'SALDO');
  const row1 = worksheet.addRow(h1);
  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.alignment = { horizontal: 'center' };
  
  let currentCol = 4;
  monthGroups.forEach(g => {
    worksheet.mergeCells(1, currentCol, 1, currentCol + g.duration - 1);
    worksheet.getCell(1, currentCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    currentCol += g.duration;
  });

  // Header 2: Periods
  const h2 = ['CÓDIGO', 'DESCRIÇÃO', 'UNID'];
  periods.forEach(p => {
    const d = new Date(start);
    if (schedule.timeUnit === 'days') d.setDate(start.getDate() + p);
    else if (schedule.timeUnit === 'weeks') d.setDate(start.getDate() + (p * 7));
    else d.setMonth(start.getMonth() + p);
    h2.push(schedule.timeUnit === 'days' ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : `P${p+1}`);
  });
  h2.push('TOTAL DIST.', 'SALDO');
  const row2 = worksheet.addRow(h2);
  row2.font = { bold: true };
  row2.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Data
  schedule.services.forEach(ss => {
    const s = services.find(serv => serv.id === ss.serviceId);
    const rowData: (string | number | undefined)[] = [s?.code, s?.name, s?.unit];
    periods.forEach(p => {
      const val = ss.distribution.find(d => d.periodIndex === p)?.value || 0;
      rowData.push(val);
    });
    const totalDist = ss.distribution.reduce((acc, d) => acc + d.value, 0);
    rowData.push(totalDist);
    rowData.push(schedule.distributionType === 'percentage' ? 100 - totalDist : (s as any)?.quantity - totalDist || 0);

    const r = worksheet.addRow(rowData);
    r.eachCell((cell, colNum) => {
      cell.border = { bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum > 3) {
        cell.numFmt = schedule.distributionType === 'percentage' ? '0.00"%"' : '#,##0.000';
      }
    });
  });

  worksheet.getColumn(1).width = 12;
  worksheet.getColumn(2).width = 40;
  
  workbook.xlsx.writeBuffer().then(buffer => {
    saveAs(new Blob([buffer]), `Cronograma_${title}.xlsx`);
  });
}

export function exportResourceScheduleToExcel(monthlyData: any[], title: string) {
  const wb = XLSX.utils.book_new();

  monthlyData.forEach(monthData => {
    const data: any[] = [];
    (monthData.groups || []).forEach((group: any) => {
      // Add a header row for the group
      data.push({
        Posição: '',
        Código: `GRUPO: ${group.groupName}`,
        Descrição: '',
        Unidade: '',
        Quantidade: '',
        'Custo Total': group.groupCost,
        '%': '',
        Classe: '',
        'Utilizado em (Serviços)': ''
      });

      group.items.forEach((item: any, idx: number) => {
        data.push({
          Posição: idx + 1,
          Código: item.code,
          Descrição: item.name,
          Unidade: item.unit,
          Quantidade: item.quantity,
          'Custo Total': item.totalCost,
          '%': item.percentage,
          Classe: item.category,
          'Utilizado em (Serviços)': item.usedIn
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    // Sheet names cannot contain slashes, so replace them
    const sheetName = monthData.month.replace(/\//g, '-');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `insumos_por_mes_${title}.xlsx`);
}

export function exportScheduleToPDF(schedule: any, services: ServiceComposition[], resources: Resource[], title: string, logo?: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  const periods = Array.from({ length: schedule.duration }, (_, i) => i);
  const chunkSize = 12;
  const chunks = [];
  for (let i = 0; i < periods.length; i += chunkSize) {
    chunks.push(periods.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage();
    }
    
    addReportHeader(doc, { 
      reportTitle: chunks.length > 1 ? `Cronograma Físico-Financeiro (Parte ${chunkIndex + 1})` : 'Cronograma Físico-Financeiro', 
      projectName: title, 
      orientation: 'landscape' 
    });
    
    if (chunkIndex === 0) {
      addSummaryBox(doc, 45, 'Duração Total', `${schedule.duration} períodos`, 14, 60);
      addSummaryBox(doc, 45, 'Tipo de Distribuição', schedule.distributionType === 'percentage' ? 'Percentual (%)' : 'Financeiro (R$)', 78, 80);
    }

    const head = [['Código', 'Descrição', 'Unid.', ...chunk.map(p => getPeriodLabel(schedule, p))]];
    
    const body = schedule.services.map((ss: any) => {
      const s = services.find(serv => serv.id === ss.serviceId);
      return [
        s?.code || '',
        s?.name || '',
        s?.unit || '',
        ...chunk.map(p => {
          const val = ss.distribution.find((d: any) => d.periodIndex === p)?.value || 0;
          return schedule.distributionType === 'percentage' ? `${formatNumber(val, 2)}%` : formatNumber(val, 2);
        })
      ];
    });

    autoTable(doc, {
      startY: chunkIndex === 0 ? 75 : 45,
      head: head,
      body: body,
      ...tableStyles,
      theme: 'grid',
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2 }
    });
  });

  addReportFooter(doc);
  doc.save(`cronograma_${title}.pdf`);
}

export function exportABCToExcel(data: any[], title: string, summary: any) {
  const ws = XLSX.utils.json_to_sheet(data.map(item => ({
    Posição: item.category,
    Código: item.code,
    Descrição: item.name,
    Unidade: item.unit,
    Quantidade: item.quantity,
    'Custo Unitário': item.unitCost,
    'Total (R$)': item.totalCost,
    '%': item.percentage,
    '% Acumulado': item.cumulativePercentage,
    Classe: item.category
  })));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Curva ABC');
  XLSX.writeFile(wb, `curva_abc_${title}.xlsx`);
}

export function exportCustomReport(options: {
  quotation: Quotation;
  schedule: any;
  services: ServiceComposition[];
  resources: Resource[];
  abcServices: any[];
  abcResources: any[];
  summaryServices: any;
  summaryResources: any;
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
  bdi?: number;
  includePlanilha: boolean;
  includeCronograma: boolean;
  includeCronogramaInsumos?: boolean;
  includeResumoFinanceiro?: boolean;
  includeCurvaABC: boolean;
  includeCotacoes: boolean;
}) {
  const doc = new jsPDF();
  let isFirstPage = true;

  // CAPA
  if (options.includePlanilha || options.includeCronograma || options.includeCronogramaInsumos || options.includeResumoFinanceiro || options.includeCurvaABC || options.includeCotacoes) {
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(options.quotation.budgetName, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(options.quotation.organization || 'Empresa', doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2 + 10, { align: 'center' });
    
    // In a real app, we would load the logo image here if it's a URL.
    // Assuming companyLogo is a base64 string if provided.
    if (options.companyLogo) {
      try {
        const imgData = options.companyLogo;
        const props = doc.getImageProperties(imgData);
        const ratio = props.width / props.height;
        let w = 40;
        let h = 40 / ratio;
        if (h > 40) {
          h = 40;
          w = 40 * ratio;
        }
        // Center it around y=34 (roughly where it was before)
        doc.addImage(imgData, 'PNG', 14, 14, w, h);
      } catch (e) {
        try { doc.addImage(options.companyLogo, 'PNG', 14, 14, 40, 40); } catch(ex) {}
        console.error("Error adding logo to PDF", e);
      }
    }
    isFirstPage = false;
  }

  // Planilha
  if (options.includePlanilha) {
    if (!isFirstPage) doc.addPage('a4', 'landscape');
    else {
      // If it's the first page, we need to change the orientation of the first page
      // But we already created it as portrait. If we don't have a cover, we should have created it as landscape.
      // Since we always have a cover if any option is selected, isFirstPage is always false here.
    }
    
    addReportHeader(doc, { 
      reportTitle: 'Relatório de Orçamento',
      projectName: options.quotation.budgetName,
      orientation: 'landscape',
      companyLogo: options.companyLogo,
      companyLogoRight: options.companyLogoRight,
      logoMode: options.logoMode
    });
    
    let totalCost = 0;
    const tableData: any[] = [];
    
    // Process services WITHOUT groups (if they have non-zero quantities)
    (options.quotation.services || []).forEach(qs => {
      if (qs.quantity <= 0) return; // Skip zero quantity items if any
      const s = options.services.find(serv => serv.id === qs.serviceId);
      const cost = s ? calculateServiceUnitCost(s, options.resources, options.services, options.bdi) : 0;
      const total = cost * qs.quantity;
      totalCost += total;
      tableData.push([
        s?.code || '',
        s?.name || '',
        s?.unit || '',
        formatNumber(qs.quantity, 3),
        formatCurrency(cost),
        formatCurrency(total)
      ]);
    });

    // Process groups
    (options.quotation.groups || []).forEach(group => {
      // Skip empty groups
      if (!group.services || group.services.length === 0) return;
      
      const headerRowIndex = tableData.length;
      tableData.push([
        { content: '', styles: { fillColor: [241, 245, 249] } },
        { content: group.name, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: '', styles: { fillColor: [241, 245, 249], halign: 'right', fontStyle: 'bold' } }
      ]);
      
      let groupTotal = 0;
      group.services.forEach(gs => {
        if (gs.quantity <= 0) return; // Skip zero quantity items
        const s = options.services.find(serv => serv.id === gs.serviceId);
        if (!s) return; // Skip if service not found
        
        const cost = calculateServiceUnitCost(s, options.resources, options.services, options.bdi) || 0;
        const total = cost * gs.quantity;
        groupTotal += total;
        totalCost += total;
        tableData.push([
          s.code || '',
          s.name || '',
          s.unit || '',
          formatNumber(gs.quantity, 3),
          formatCurrency(cost),
          formatCurrency(total)
        ]);
      });
      
      // Update the group header row with the total in the last column
      tableData[headerRowIndex][2].content = formatCurrency(groupTotal);
    });

    addSummaryBox(doc, 45, 'Órgão / Cliente', options.quotation.organization || '', 14, 80);
    addSummaryBox(doc, 45, 'Data Base', options.quotation.baseDate || options.quotation.date || '', 110, 60);
    addSummaryBox(doc, 45, 'Valor Total', formatCurrency(totalCost), 186, 60);

    autoTable(doc, {
      startY: 75,
      head: [['Código', 'Descrição', 'Unid.', 'Qtd.', 'Unitário', 'Total']],
      body: tableData,
      ...tableStyles,
      theme: 'grid',
      margin: { left: 14, right: 14 },
      columnStyles: planilhaColumnStyles
    });
    isFirstPage = false;
  }

  // Cronograma
  if (options.includeCronograma && options.schedule) {
    const schedule = options.schedule;
    const periods = Array.from({ length: schedule.duration }, (_, i) => i);
    const chunkSize = 12;
    const chunks = [];
    for (let i = 0; i < periods.length; i += chunkSize) {
      chunks.push(periods.slice(i, i + chunkSize));
    }

    chunks.forEach((chunk, chunkIndex) => {
      if (!isFirstPage || chunkIndex > 0) {
        doc.addPage('a4', 'landscape');
      } else {
        // If it's the very first page of the document, we need to set it to landscape.
        // However, jsPDF doesn't easily allow changing the orientation of the first page after creation if it was portrait.
        // But since CAPA is always generated if any option is selected, isFirstPage will be false here.
      }
      
      addReportHeader(doc, { 
        reportTitle: chunks.length > 1 ? `Cronograma Físico-Financeiro (Parte ${chunkIndex + 1})` : 'Cronograma Físico-Financeiro', 
        projectName: options.quotation.budgetName, 
        orientation: 'landscape',
        companyLogo: options.companyLogo,
        companyLogoRight: options.companyLogoRight,
        logoMode: options.logoMode
      });
      
      if (chunkIndex === 0) {
        addSummaryBox(doc, 45, 'Duração Total', `${schedule.duration} períodos`, 14, 60);
        addSummaryBox(doc, 45, 'Tipo de Distribuição', schedule.distributionType === 'percentage' ? 'Percentual (%)' : 'Financeiro (R$)', 78, 80);
      }

      const head = [['Código', 'Descrição', 'Unid.', ...chunk.map(p => getPeriodLabel(schedule, p))]];
      
      const body = (schedule.services || [])
        .filter((ss: any) => {
          // Only show services that have at least one non-zero distribution value
          return (ss.distribution || []).some((d: any) => d.value > 0);
        })
        .map((ss: any) => {
          const s = options.services.find(serv => serv.id === ss.serviceId);
          return [
            s?.code || '',
            s?.name || '',
            s?.unit || '',
            ...chunk.map(p => {
              const val = (ss.distribution || []).find((d: any) => d.periodIndex === p)?.value || 0;
              return schedule.distributionType === 'percentage' ? `${formatNumber(val, 2)}%` : formatNumber(val, 2);
            })
          ];
        });

      autoTable(doc, {
        startY: chunkIndex === 0 ? 75 : 45,
        head: head,
        body: body,
        ...tableStyles,
        theme: 'grid',
        styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' as const },
          2: { cellWidth: 12, halign: 'center' as const }
        }
      });
    });
    isFirstPage = false;
  }

  // Cronograma de Insumos (Curva ABC por Mês)
  if (options.includeCronogramaInsumos && options.schedule) {
    const monthlyData = calculateMonthlyResourceABC(options.schedule, options.quotation, options.services, options.resources);

    if (monthlyData.length > 0) {
      monthlyData.forEach((monthData) => {
        if (!isFirstPage) {
          doc.addPage('a4', 'portrait');
        }
        
        addReportHeader(doc, { 
          reportTitle: `Insumos por Mês - ${monthData.month}`, 
          projectName: options.quotation.budgetName,
          companyLogo: options.companyLogo,
          companyLogoRight: options.companyLogoRight,
          logoMode: options.logoMode
        });
        
        addSummaryBox(doc, 45, 'Classe A (80%)', `${monthData.summary.a.count} itens (${formatNumber(monthData.summary.a.percentage, 2)}%)`, 14, 55);
        addSummaryBox(doc, 45, 'Classe B (15%)', `${monthData.summary.b.count} itens (${formatNumber(monthData.summary.b.percentage, 2)}%)`, 73, 55);
        addSummaryBox(doc, 45, 'Classe C (5%)', `${monthData.summary.c.count} itens (${formatNumber(monthData.summary.c.percentage, 2)}%)`, 132, 55);
        
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 70, 173, 40, 2, 2, 'FD');
        
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('Distribuição Financeira por Classe', 18, 80);
        
        const maxVal = Math.max(monthData.summary.a.percentage, monthData.summary.b.percentage, monthData.summary.c.percentage);
        const drawBar = (y: number, label: string, val: number, color: [number, number, number]) => {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(label, 18, y + 4);
          const width = maxVal > 0 ? (val / 100) * 100 : 0;
          doc.setFillColor(...color);
          doc.rect(35, y, width, 5, 'F');
          doc.text(`${formatNumber(val, 2)}%`, 35 + width + 2, y + 4);
        };
        
        drawBar(85, 'Classe A', monthData.summary.a.percentage, [34, 197, 94]);
        drawBar(93, 'Classe B', monthData.summary.b.percentage, [234, 179, 8]);
        drawBar(101, 'Classe C', monthData.summary.c.percentage, [239, 68, 68]);

        const head = [['Pos.', 'Código', 'Descrição', 'Unid.', 'Qtd.', 'Total', '%', 'Classe', 'Serviços']];
        
        const body: any[] = [];
        monthData.groups.forEach((group: any) => {
          body.push([
            { content: group.groupName, colSpan: 9, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
          ]);
          
          group.items.forEach((item: any, idx: number) => {
            body.push([
              idx + 1,
              item.code,
              item.name,
              item.unit,
              formatNumber(item.quantity, 3),
              formatCurrency(item.totalCost),
              `${formatNumber(item.percentage, 2)}%`,
              item.category,
              item.usedIn.length > 30 ? item.usedIn.substring(0, 30) + '...' : item.usedIn
            ]);
          });
        });

        autoTable(doc, {
          startY: 115,
          head: head,
          body: body,
          foot: [['', '', 'TOTAL DO MÊS', '', '', formatCurrency(monthData.summary.totalCost), '100%', '', '']],
          ...tableStyles,
          theme: 'grid',
          styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2 },
          footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 22 },
            2: { cellWidth: 'auto' as const },
            3: { cellWidth: 12, halign: 'center' as const },
            4: { cellWidth: 22, halign: 'right' as const },
            5: { cellWidth: 30, halign: 'right' as const },
            6: { cellWidth: 18, halign: 'right' as const },
            7: { cellWidth: 15, halign: 'center' as const },
            8: { cellWidth: 35 }
          },
          didParseCell: function(data: any) {
            if (data.section === 'body' && data.column.index === 7) {
              if (data.cell.raw === 'A') data.cell.styles.textColor = [21, 128, 61];
              if (data.cell.raw === 'B') data.cell.styles.textColor = [161, 98, 7];
              if (data.cell.raw === 'C') data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        isFirstPage = false;
      });
    } else {
      if (!isFirstPage) doc.addPage('a4', 'portrait');
      addReportHeader(doc, { 
        reportTitle: 'Insumos por Mês', 
        projectName: options.quotation.budgetName 
      });
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum insumo distribuído no cronograma.', doc.internal.pageSize.width / 2, 90, { align: 'center' });
      isFirstPage = false;
    }
  }

  // Resumo Financeiro Mensal
  if (options.includeResumoFinanceiro && options.schedule) {
    const summaryData = calculateProductionAndCostSummary(options.schedule, options.quotation, options.services, options.resources, options.bdi);
    
    if (summaryData.length > 0) {
      if (!isFirstPage) doc.addPage('a4', 'portrait');
      addReportHeader(doc, { 
        reportTitle: 'Resumo de Produção e Custo Mensal', 
        projectName: options.quotation.budgetName 
      });

      const totalProd = summaryData.reduce((acc, d) => acc + d.production, 0);
      const totalCost = summaryData.reduce((acc, d) => acc + d.cost, 0);
      const totalMargin = totalProd - totalCost;

      addSummaryBox(doc, 45, 'Produção Total', formatCurrency(totalProd), 14, 55);
      addSummaryBox(doc, 45, 'Custo Total', formatCurrency(totalCost), 73, 55);
      addSummaryBox(doc, 45, 'Margem Total', formatCurrency(totalMargin), 132, 55);

      const tableData = summaryData.map(d => [
        d.month,
        formatCurrency(d.production),
        formatCurrency(d.cost),
        formatCurrency(d.margin),
        `${formatNumber(d.production > 0 ? (d.margin / d.production) * 100 : 0, 2)}%`
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['Mês', 'Produção (Venda)', 'Custo (Insumos)', 'Margem Bruta', '% Margem']],
        body: tableData,
        foot: [['TOTAL', formatCurrency(totalProd), formatCurrency(totalCost), formatCurrency(totalMargin), `${formatNumber(totalProd > 0 ? (totalMargin / totalProd) * 100 : 0, 2)}%`]],
        ...tableStyles,
        theme: 'grid',
        footStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 'auto' as const },
          1: { cellWidth: 40, halign: 'right' as const },
          2: { cellWidth: 40, halign: 'right' as const },
          3: { cellWidth: 40, halign: 'right' as const },
          4: { cellWidth: 25, halign: 'right' as const }
        }
      });
      isFirstPage = false;
    }
  }

  // Curva ABC
  if (options.includeCurvaABC) {
    const renderABC = (data: any[], summary: any, title: string) => {
      if (!isFirstPage) doc.addPage('a4', 'portrait');
      addReportHeader(doc, { reportTitle: `Curva ABC de ${title}`, projectName: options.quotation.budgetName });
      
      addSummaryBox(doc, 45, 'Classe A (80%)', `${summary.a.count} itens (${formatNumber(summary.a.percentage, 2)}%)`, 14, 55);
      addSummaryBox(doc, 45, 'Classe B (15%)', `${summary.b.count} itens (${formatNumber(summary.b.percentage, 2)}%)`, 73, 55);
      addSummaryBox(doc, 45, 'Classe C (5%)', `${summary.c.count} itens (${formatNumber(summary.c.percentage, 2)}%)`, 132, 55);
      
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, 70, 173, 40, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição Financeira por Classe', 18, 80);
      
      const maxVal = Math.max(summary.a.percentage, summary.b.percentage, summary.c.percentage);
      const drawBar = (y: number, label: string, val: number, color: [number, number, number]) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, 18, y + 4);
        const width = maxVal > 0 ? (val / 100) * 100 : 0;
        doc.setFillColor(...color);
        doc.rect(35, y, width, 5, 'F');
        doc.text(`${formatNumber(val, 2)}%`, 35 + width + 2, y + 4);
      };
      
      drawBar(85, 'Classe A', summary.a.percentage, [34, 197, 94]);
      drawBar(93, 'Classe B', summary.b.percentage, [234, 179, 8]);
      drawBar(101, 'Classe C', summary.c.percentage, [239, 68, 68]);
      
      const tableData = data.map((item, idx) => [
        idx + 1,
        item.code,
        item.name,
        item.unit,
        formatCurrency(item.totalCost),
        `${formatNumber(item.percentage, 2)}%`,
        item.category
      ]);

      autoTable(doc, {
        startY: 115,
        head: [['Pos.', 'Código', 'Descrição', 'Unid.', 'Total', '%', 'Classe']],
        body: tableData,
        ...tableStyles,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 'auto' as const },
          3: { cellWidth: 15, halign: 'center' as const },
          4: { cellWidth: 35, halign: 'right' as const },
          5: { cellWidth: 20, halign: 'right' as const },
          6: { cellWidth: 15, halign: 'center' as const }
        },
        didParseCell: function(data: any) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'A') data.cell.styles.textColor = [34, 197, 94];
            else if (data.cell.raw === 'B') data.cell.styles.textColor = [234, 179, 8];
            else if (data.cell.raw === 'C') data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      isFirstPage = false;
    };

    if (options.abcServices.length > 0) renderABC(options.abcServices, options.summaryServices, 'Serviços');
    if (options.abcResources.length > 0) renderABC(options.abcResources, options.summaryResources, 'Insumos');
  }

  // Cotações (Composições Analíticas)
  if (options.includeCotacoes) {
    const allServicesInQuotation = new Set<string>();
    (options.quotation.services || []).forEach(s => allServicesInQuotation.add(s.serviceId));
    (options.quotation.groups || []).forEach(g => (g.services || []).forEach(s => allServicesInQuotation.add(s.serviceId)));

    Array.from(allServicesInQuotation).forEach(serviceId => {
      const service = options.services.find(s => s.id === serviceId);
      if (!service) return;

      if (!isFirstPage) doc.addPage('a4', 'portrait');
      
      addReportHeader(doc, { reportTitle: 'Composição Analítica de Serviço', projectName: options.quotation.budgetName });
      
      const directCost = calculateServiceUnitCost(service, options.resources, options.services);
      
      addSummaryBox(doc, 45, 'Código', service.code, 14, 25);
      addSummaryBox(doc, 45, 'Descrição do Serviço', service.name, 41, 130);
      addSummaryBox(doc, 45, 'Unidade', service.unit, 173, 23);
      
      const tableData = service.items.map(item => {
        const res = options.resources.find(r => r.id === item.resourceId) || options.services.find(s => s.id === item.resourceId);
        const price = (res as any)?.basePrice || calculateServiceUnitCost(res as any, options.resources, options.services);
        return [
          res?.code || '',
          res?.name || '',
          res?.unit || '',
          formatNumber(item.consumption, 6),
          formatCurrency(price),
          formatCurrency(price * item.consumption)
        ];
      });

      autoTable(doc, {
        startY: 75,
        head: [['Código', 'Descrição', 'Unid.', 'Consumo', 'Preço', 'Total']],
        body: tableData,
        ...tableStyles,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' as const },
          2: { cellWidth: 15, halign: 'center' as const },
          3: { cellWidth: 30, halign: 'right' as const },
          4: { cellWidth: 35, halign: 'right' as const },
          5: { cellWidth: 35, halign: 'right' as const }
        }
      });

      const lastY = (doc as any).lastAutoTable.finalY + 10;
      
      if (service.production > 0) {
        addSummaryBox(doc, lastY, 'Produção da Equipe', formatNumber(service.production, 4), 14, 50);
      }
      
      addSummaryBox(doc, lastY, 'Custo Direto', formatCurrency(directCost), 68, 40);

      const bdi = options.bdi || 0;
      if (bdi > 0) {
        addSummaryBox(doc, lastY, 'BDI (%)', `${formatNumber(bdi, 2)}%`, 112, 35);
        addSummaryBox(doc, lastY, 'Preço com BDI', formatCurrency(directCost * (1 + bdi / 100)), 151, 45);
      }

      isFirstPage = false;
    });
  }

  // Add footer to all pages except the cover page
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 2; i <= pageCount; i++) { // Start from page 2 to skip cover
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    // Subtract 1 from total and current because cover page doesn't count
    doc.text(`Página ${i - 1} de ${pageCount - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Gerado por Sistema de Orçamentos', 14, pageHeight - 10);
  }

  return doc;
}

export function exportABCToPDF(data: any[], title: string, summary: any, logo?: string) {
  const doc = new jsPDF();
  addReportHeader(doc, { reportTitle: 'Curva ABC de Insumos/Serviços', projectName: title });
  
  // Summary Boxes
  addSummaryBox(doc, 45, 'Classe A (80%)', `${summary.a.count} itens (${formatNumber(summary.a.percentage, 2)}%)`, 14, 55);
  addSummaryBox(doc, 45, 'Classe B (15%)', `${summary.b.count} itens (${formatNumber(summary.b.percentage, 2)}%)`, 73, 55);
  addSummaryBox(doc, 45, 'Classe C (5%)', `${summary.c.count} itens (${formatNumber(summary.c.percentage, 2)}%)`, 132, 55);
  
  // Draw a mini bar chart for the classes
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 70, 173, 40, 2, 2, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribuição Financeira por Classe', 18, 80);
  
  const maxVal = Math.max(summary.a.percentage, summary.b.percentage, summary.c.percentage);
  const drawBar = (y: number, label: string, val: number, color: [number, number, number]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 18, y + 4);
    const width = maxVal > 0 ? (val / 100) * 100 : 0; // Scale to 100 max width
    doc.setFillColor(...color);
    doc.rect(35, y, width, 5, 'F');
    doc.text(`${formatNumber(val, 2)}%`, 35 + width + 2, y + 4);
  };
  
  drawBar(85, 'Classe A', summary.a.percentage, [34, 197, 94]); // green-500
  drawBar(93, 'Classe B', summary.b.percentage, [234, 179, 8]); // yellow-500
  drawBar(101, 'Classe C', summary.c.percentage, [239, 68, 68]); // red-500
  
  const tableData = data.map((item, idx) => [
    idx + 1,
    item.code,
    item.name,
    item.unit,
    formatCurrency(item.totalCost),
    `${formatNumber(item.percentage, 2)}%`,
    item.category
  ]);

  autoTable(doc, {
    startY: 115,
    head: [['Pos.', 'Código', 'Descrição', 'Unid.', 'Total', '%', 'Classe']],
    body: tableData,
    ...tableStyles,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' as const },
      3: { cellWidth: 15, halign: 'center' as const },
      4: { cellWidth: 35, halign: 'right' as const },
      5: { cellWidth: 20, halign: 'right' as const },
      6: { cellWidth: 15, halign: 'center' as const }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'A') data.cell.styles.textColor = [21, 128, 61]; // green-700
        if (data.cell.raw === 'B') data.cell.styles.textColor = [161, 98, 7]; // yellow-700
        if (data.cell.raw === 'C') data.cell.styles.textColor = [185, 28, 28]; // red-700
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  addReportFooter(doc);
  doc.save(`curva_abc_${title}.pdf`);
}

export function exportFullReportToExcel(options: {
  quotation: Quotation;
  schedule: any;
  services: ServiceComposition[];
  resources: Resource[];
  abcServices: any[];
  abcResources: any[];
  summaryServices: any;
  summaryResources: any;
  bdi?: number;
}) {
  const wb = XLSX.utils.book_new();

  // 1. Orçamento
  const budgetData: any[] = [];
  let totalCost = 0;
  
  const addServiceRow = (s: ServiceComposition | undefined, qty: number) => {
    const cost = s ? calculateServiceUnitCost(s, options.resources, options.services, options.bdi) : 0;
    const total = cost * qty;
    totalCost += total;
    return {
      Código: s?.code || '',
      Descrição: s?.name || '',
      Unidade: s?.unit || '',
      Quantidade: qty,
      'Preço Unitário': cost,
      'Total (R$)': total
    };
  };

  (options.quotation.services || []).forEach(qs => {
    budgetData.push(addServiceRow(options.services.find(serv => serv.id === qs.serviceId), qs.quantity));
  });

  (options.quotation.groups || []).forEach(group => {
    budgetData.push({ Código: `GRUPO: ${group.name}`, Descrição: '', Unidade: '', Quantidade: '', 'Preço Unitário': '', 'Total (R$)': '' });
    let groupTotal = 0;
    group.services?.forEach(gs => {
      const s = options.services.find(serv => serv.id === gs.serviceId);
      const cost = s ? calculateServiceUnitCost(s, options.resources, options.services, options.bdi) : 0;
      const total = cost * gs.quantity;
      groupTotal += total;
      totalCost += total;
      budgetData.push({
        Código: s?.code || '',
        Descrição: s?.name || '',
        Unidade: s?.unit || '',
        Quantidade: gs.quantity,
        'Preço Unitário': cost,
        'Total (R$)': total
      });
    });
    budgetData.push({ Código: '', Descrição: `TOTAL DO GRUPO: ${group.name}`, Unidade: '', Quantidade: '', 'Preço Unitário': '', 'Total (R$)': groupTotal });
  });
  budgetData.push({ Código: '', Descrição: 'TOTAL GERAL', Unidade: '', Quantidade: '', 'Preço Unitário': '', 'Total (R$)': totalCost });
  
  const wsBudget = XLSX.utils.json_to_sheet(budgetData);
  XLSX.utils.book_append_sheet(wb, wsBudget, 'Orçamento');

  // 2. Cronograma (if exists)
  if (options.schedule) {
    const scheduleData: any[] = [];
    const periods = Array.from({ length: options.schedule.duration }, (_, i) => i);
    
    options.schedule.services?.forEach((ss: any) => {
      const s = options.services.find(serv => serv.id === ss.serviceId);
      const row: any = {
        Código: s?.code || '',
        Descrição: s?.name || '',
        Unidade: s?.unit || ''
      };
      periods.forEach(p => {
        const val = ss.distribution.find((d: any) => d.periodIndex === p)?.value || 0;
        row[`P${p + 1}`] = val;
      });
      scheduleData.push(row);
    });
    const wsSchedule = XLSX.utils.json_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(wb, wsSchedule, 'Cronograma');
  }

  // 3. Curva ABC Serviços
  if (options.abcServices.length > 0) {
    const wsABC = XLSX.utils.json_to_sheet(options.abcServices.map((item, idx) => ({
      Posição: idx + 1,
      Código: item.code,
      Descrição: item.name,
      Unidade: item.unit,
      'Total (R$)': item.totalCost,
      '%': item.percentage,
      Classe: item.category
    })));
    XLSX.utils.book_append_sheet(wb, wsABC, 'ABC Serviços');
  }

  // 4. Curva ABC Insumos
  if (options.abcResources.length > 0) {
    const wsABCRes = XLSX.utils.json_to_sheet(options.abcResources.map((item, idx) => ({
      Posição: idx + 1,
      Código: item.code,
      Descrição: item.name,
      Unidade: item.unit,
      'Total (R$)': item.totalCost,
      '%': item.percentage,
      Classe: item.category
    })));
    XLSX.utils.book_append_sheet(wb, wsABCRes, 'ABC Insumos');
  }

  XLSX.writeFile(wb, `Relatorio_Completo_${options.quotation.budgetName}.xlsx`);
}
