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
