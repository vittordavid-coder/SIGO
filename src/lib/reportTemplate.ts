import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

/**
 * Standardized Document Report & Card Layout Utility (SYNERA ERP)
 * 
 * Provides unified styling, colors, brand identity, and multi-format exporters
 * (PDF, Print via hidden iframe, Excel with 1-page fit setup) for system sheets.
 */

export interface ReportHeaderOptions {
  companyName?: string;
  companySub?: string;
  docTitle: string;
  statusBadge?: {
    text: string;
    variant: "active" | "inactive" | "warning" | "info";
  };
  issueDate?: string;
}

export interface ReportSection {
  title: string;
  type: "grid" | "table" | "custom";
  fields?: { label: string; value: string; fullWidth?: boolean; highlightColor?: "blue" | "green" | "amber" | "red" | "default" }[];
  headers?: string[];
  rows?: string[][];
  imageUrls?: string[];
}

export interface ReportConfig {
  header: ReportHeaderOptions;
  sections: ReportSection[];
  signatures?: { leftLabel: string; rightLabel: string };
  footerText?: string;
  filename: string;
}

const BRAND_BLUE = "#1e3a8a"; // #1e3a8a
const BRAND_BLUE_RGB: [number, number, number] = [30, 58, 138];
const SLATE_50 = "#f8fafc";
const SLATE_100 = "#f1f5f9";
const SLATE_100_RGB: [number, number, number] = [241, 245, 249];
const SLATE_400 = "#94a3b8";
const SLATE_500 = "#64748b";
const SLATE_700 = "#334155";
const SLATE_900 = "#0f172a";
const SLATE_900_RGB: [number, number, number] = [15, 23, 42];

/**
 * Generates an in-page browser print without navigating away or opening new tabs.
 * Uses a temporary, invisible iframe styled specifically to fit a single A4 page width.
 */
export function printDocument(config: ReportConfig) {
  let iframe = document.getElementById("synera-print-iframe") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "synera-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);
  }

  const html = generateHTMLDocument(config, true);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;

  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Give images and styles time to load before calling print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  }
}

/**
 * Exports a PDF matching the exact visual brand guidelines and layout.
 */
export function exportToPDF(config: ReportConfig) {
  const pdf = new jsPDF("p", "mm", "a4");

  // Header Brand Logo & Subtitle
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(BRAND_BLUE_RGB[0], BRAND_BLUE_RGB[1], BRAND_BLUE_RGB[2]);
  pdf.text(config.header.companyName || "SYNERA", 14, 16);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(100, 116, 139);
  pdf.text(config.header.companySub || "GESTÃO DE RECURSOS HUMANOS & OBRAS", 14, 21);

  // Right Header: Title & Timestamp
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(SLATE_900_RGB[0], SLATE_900_RGB[1], SLATE_900_RGB[2]);
  pdf.text(config.header.docTitle.toUpperCase(), 196, 15, { align: "right" });

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    config.header.issueDate || `Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    196,
    20,
    { align: "right" }
  );

  // Status Badge
  if (config.header.statusBadge) {
    const { text, variant } = config.header.statusBadge;
    const badgeWidth = text.length * 2.2 + 8;
    const badgeX = 196 - badgeWidth;
    const badgeY = 22;

    if (variant === "active") {
      pdf.setFillColor(220, 252, 231);
      pdf.setDrawColor(187, 247, 208);
      pdf.setTextColor(22, 101, 52);
    } else if (variant === "inactive") {
      pdf.setFillColor(254, 226, 226);
      pdf.setDrawColor(254, 202, 202);
      pdf.setTextColor(153, 27, 27);
    } else {
      pdf.setFillColor(254, 243, 199);
      pdf.setDrawColor(253, 230, 138);
      pdf.setTextColor(146, 64, 14);
    }

    pdf.roundedRect(badgeX, badgeY, badgeWidth, 5, 1.5, 1.5, "FD");
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(text.toUpperCase(), badgeX + badgeWidth / 2, badgeY + 3.6, { align: "center" });
  }

  // Divider Line
  pdf.setLineWidth(0.8);
  pdf.setDrawColor(BRAND_BLUE_RGB[0], BRAND_BLUE_RGB[1], BRAND_BLUE_RGB[2]);
  pdf.line(14, 29, 196, 29);

  let currentY = 34;

  config.sections.forEach((section) => {
    // Section Header
    autoTable(pdf, {
      startY: currentY,
      head: [[section.title.toUpperCase()]],
      body: [],
      margin: { left: 14, right: 14 },
      theme: "plain",
      headStyles: {
        fillColor: SLATE_100_RGB,
        textColor: BRAND_BLUE_RGB,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 2.5,
      },
      didDrawCell: (data) => {
        if (data.section === "head") {
          pdf.setFillColor(BRAND_BLUE_RGB[0], BRAND_BLUE_RGB[1], BRAND_BLUE_RGB[2]);
          pdf.rect(data.cell.x, data.cell.y, 1.5, data.cell.height, "F");
        }
      },
    });
    currentY = (pdf as any).lastAutoTable.finalY;

    if (section.type === "grid" && section.fields) {
      const rows: string[][] = [];
      for (let i = 0; i < section.fields.length; i += 2) {
        const f1 = section.fields[i];
        const f2 = section.fields[i + 1];
        if (f1.fullWidth) {
          rows.push([f1.label.toUpperCase(), f1.value, "", ""]);
        } else {
          rows.push([
            f1.label.toUpperCase(),
            f1.value || "-",
            f2 ? f2.label.toUpperCase() : "",
            f2 ? f2.value || "-" : "",
          ]);
        }
      }

      autoTable(pdf, {
        startY: currentY,
        body: rows,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38, textColor: [100, 116, 139] },
          1: { cellWidth: 53 },
          2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38, textColor: [100, 116, 139] },
          3: { cellWidth: 53 },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowIndex = data.row.index;
            const f1 = section.fields?.[rowIndex * 2];
            if (f1 && f1.fullWidth && data.column.index === 1) {
              data.cell.colSpan = 3;
            }
          }
        },
      });
      currentY = (pdf as any).lastAutoTable.finalY + 4;
    } else if (section.type === "table" && section.headers && section.rows) {
      autoTable(pdf, {
        startY: currentY,
        head: [section.headers],
        body: section.rows,
        margin: { left: 14, right: 14 },
        theme: "grid",
        headStyles: {
          fillColor: SLATE_100_RGB,
          textColor: [51, 65, 85],
          fontStyle: "bold",
          fontSize: 8,
        },
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
      });
      currentY = (pdf as any).lastAutoTable.finalY + 4;
    }

    if (section.imageUrls !== undefined) {
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.setDrawColor(203, 213, 225);

      const photoBoxWidth = 50;
      const photoBoxHeight = 32;
      let startX = 14;

      if (section.imageUrls.length > 0) {
        section.imageUrls.slice(0, 3).forEach((_, pIdx) => {
          pdf.roundedRect(startX, currentY, photoBoxWidth, photoBoxHeight, 2, 2, "D");
          pdf.text(`[ Foto Anexada ${pIdx + 1} ]`, startX + photoBoxWidth / 2, currentY + photoBoxHeight / 2, { align: "center" });
          startX += photoBoxWidth + 8;
        });
      } else {
        pdf.roundedRect(startX, currentY, photoBoxWidth, photoBoxHeight, 2, 2, "D");
        pdf.text("[ Espaço p/ Foto 1 ]", startX + photoBoxWidth / 2, currentY + photoBoxHeight / 2, { align: "center" });
        startX += photoBoxWidth + 8;

        pdf.roundedRect(startX, currentY, photoBoxWidth, photoBoxHeight, 2, 2, "D");
        pdf.text("[ Espaço p/ Foto 2 ]", startX + photoBoxWidth / 2, currentY + photoBoxHeight / 2, { align: "center" });
        startX += photoBoxWidth + 8;

        pdf.roundedRect(startX, currentY, photoBoxWidth, photoBoxHeight, 2, 2, "D");
        pdf.text("[ Espaço p/ Foto 3 ]", startX + photoBoxWidth / 2, currentY + photoBoxHeight / 2, { align: "center" });
      }
      currentY += photoBoxHeight + 6;
    }
  });

  // Signatures
  const pageHeight = pdf.internal.pageSize.height;
  const sigs = config.signatures || { leftLabel: "ASSINATURA RESPONSÁVEL", rightLabel: "RESPONSÁVEL OPERACIONAL / EMPRESA" };
  const footerY = currentY + 25 > pageHeight - 25 ? pageHeight - 25 : currentY + 25;

  pdf.setLineWidth(0.5);
  pdf.setDrawColor(71, 85, 105);
  pdf.line(20, footerY, 90, footerY);
  pdf.line(120, footerY, 190, footerY);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(51, 65, 85);
  pdf.text(sigs.leftLabel.toUpperCase(), 55, footerY + 5, { align: "center" });
  pdf.text(sigs.rightLabel.toUpperCase(), 155, footerY + 5, { align: "center" });

  // Footer
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    config.footerText || `SYNERA ERP • Documento emitido eletronicamente em ${new Date().toLocaleDateString("pt-BR")}`,
    105,
    footerY + 12,
    { align: "center" }
  );

  pdf.save(`${config.filename.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Exports to structured Excel (.xls) with 1-page width print configuration.
 */
export function exportToExcel(config: ReportConfig) {
  const html = generateHTMLDocument(config, false);
  const blob = new Blob(["\ufeff" + html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  saveAs(blob, `${config.filename.replace(/\s+/g, "_")}.xls`);
}

/**
 * Helper to generate HTML used for print & excel export.
 */
function generateHTMLDocument(config: ReportConfig, isForPrint: boolean): string {
  const badgeText = config.header.statusBadge?.text || "";
  const variant = config.header.statusBadge?.variant || "active";
  const badgeBg = variant === "active" ? "#dcfce7" : variant === "inactive" ? "#fee2e2" : "#fef3c7";
  const badgeColor = variant === "active" ? "#166534" : variant === "inactive" ? "#991b1b" : "#92400e";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${config.header.docTitle} - ${config.filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${config.header.docTitle.substring(0, 31)}</x:Name>
              <x:WorksheetOptions>
                <x:FitToPage/>
                <x:FitWidth>1</x:FitWidth>
                <x:FitHeight>0</x:FitHeight>
                <x:Print>
                  <x:FitWidth>1</x:FitWidth>
                  <x:ValidPrinterInfo/>
                </x:Print>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            width: 100% !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: ${SLATE_900};
          background: #ffffff;
          font-size: 10pt;
          line-height: 1.35;
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          padding: 15px;
        }
        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2.5px solid ${BRAND_BLUE};
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .company-logo { font-size: 18pt; font-weight: 900; color: ${BRAND_BLUE}; letter-spacing: -0.5px; }
        .company-sub { font-size: 8pt; font-weight: 700; color: ${SLATE_500}; text-transform: uppercase; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 13pt; font-weight: 800; color: ${SLATE_900}; text-transform: uppercase; }
        .doc-title p { font-size: 8pt; color: ${SLATE_500}; }
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 7.5pt;
          font-weight: 800;
          text-transform: uppercase;
          background-color: ${badgeBg};
          color: ${badgeColor};
          margin-top: 4px;
        }
        .section { margin-bottom: 14px; page-break-inside: avoid; }
        .section-header {
          background-color: ${SLATE_100};
          border-left: 4px solid ${BRAND_BLUE};
          padding: 5px 8px;
          font-size: 9pt;
          font-weight: 800;
          color: ${BRAND_BLUE};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .grid-4 {
          display: grid;
          grid-template-columns: 1fr 1.3fr 1fr 1.3fr;
          gap: 6px 12px;
          width: 100%;
        }
        .field-label {
          font-size: 7.5pt;
          font-weight: 700;
          color: ${SLATE_500};
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .field-value {
          font-size: 9.5pt;
          font-weight: 600;
          color: ${SLATE_900};
          background-color: ${SLATE_50};
          padding: 4px 6px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          min-height: 26px;
          word-break: break-word;
        }
        .images-grid {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .image-box {
          width: 120px;
          height: 100px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          object-fit: cover;
          background-color: ${SLATE_50};
        }
        .image-placeholder {
          width: 120px;
          height: 90px;
          border: 1.5px dashed #cbd5e1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${SLATE_400};
          font-size: 7.5pt;
          font-weight: 600;
          text-align: center;
          padding: 6px;
          background: #fafafa;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; font-size: 8.5pt; }
        th { background-color: ${SLATE_100}; color: ${SLATE_700}; font-weight: 800; text-transform: uppercase; font-size: 7.5pt; }
        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-around;
          page-break-inside: avoid;
        }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-top: 1.5px solid #475569; margin-bottom: 4px; }
        .sig-text { font-size: 8pt; font-weight: 700; color: ${SLATE_700}; text-transform: uppercase; }
        .footer-note {
          margin-top: 20px;
          text-align: center;
          font-size: 7.5pt;
          color: ${SLATE_400};
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div>
          <div class="company-logo">${config.header.companyName || "SYNERA"}</div>
          <div class="company-sub">${config.header.companySub || "Gestão de Recursos Humanos & Obras"}</div>
        </div>
        <div class="doc-title">
          <h1>${config.header.docTitle}</h1>
          <p>${config.header.issueDate || `Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}</p>
          ${badgeText ? `<span class="status-badge">${badgeText}</span>` : ""}
        </div>
      </div>

      ${config.sections.map((sec, idx) => `
        <div class="section">
          <div class="section-header">${idx + 1}. ${sec.title}</div>
          ${sec.type === "grid" && sec.fields ? `
            <div class="grid-4">
              ${sec.fields.map((f) => `
                <div class="field" style="${f.fullWidth ? 'grid-column: span 4;' : 'grid-column: span 2;'}">
                  <div class="field-label">${f.label}</div>
                  <div class="field-value" style="${f.highlightColor === 'blue' ? 'font-weight: 800; color: #1e3a8a;' : f.highlightColor === 'green' ? 'font-weight: 800; color: #166534;' : f.highlightColor === 'amber' ? 'font-weight: 800; color: #b45309;' : ''}">${f.value || "-"}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${sec.imageUrls !== undefined ? `
            <div class="images-grid">
              ${sec.imageUrls.length > 0 ? sec.imageUrls.map((url) => `
                <img src="${url}" class="image-box" alt="Foto Equipamento" />
              `).join("") : `
                <div class="image-placeholder">Nenhuma foto anexada</div>
                <div class="image-placeholder">Espaço para Foto 2</div>
              `}
            </div>
          ` : ""}

          ${sec.type === "table" && sec.headers && sec.rows ? `
            <table>
              <thead>
                <tr>
                  ${sec.headers.map((h) => `<th>${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${sec.rows.map((row) => `
                  <tr>
                    ${row.map((cell) => `<td>${cell}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          ` : ""}
        </div>
      `).join("")}

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-text">${(config.signatures?.leftLabel || "Assinatura Responsável").toUpperCase()}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-text">${(config.signatures?.rightLabel || "Responsável Operacional / Empresa").toUpperCase()}</div>
        </div>
      </div>

      <div class="footer-note">
        ${config.footerText || `SYNERA ERP &bull; Documento emitido eletronicamente em ${new Date().toLocaleDateString("pt-BR")}`}
      </div>
    </body>
    </html>
  `;
}
