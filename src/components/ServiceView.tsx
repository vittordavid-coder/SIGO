import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Briefcase, Download, Upload, HelpCircle, ChevronDown, Tag, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { ServiceComposition, Resource, CompositionItem } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { exportServicesToExcel, exportAllCompositionsToExcel, exportCompositionToPDF, exportServicesToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumericInput } from '@/components/ui/numeric-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';

interface ServiceViewProps {
  key?: string;
  services: ServiceComposition[];
  resources: Resource[];
  onAdd: (s: Omit<ServiceComposition, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (s: ServiceComposition) => void;
  companyLogo?: string;
  bdi?: number;
  readonly?: boolean;
}

export function ServiceView({ services, resources, onAdd, onDelete, onUpdate, companyLogo, bdi = 0, readonly }: ServiceViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceComposition | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpenAdd, setIsDropdownOpenAdd] = useState(false);
  const [isDropdownOpenEdit, setIsDropdownOpenEdit] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newService, setNewService] = useState<Omit<ServiceComposition, 'id'>>({
    code: '',
    name: '',
    unit: '',
    production: 1,
    fit: 0,
    items: [],
  });

  const [currentItem, setCurrentItem] = useState<CompositionItem>({ resourceId: '', consumption: 0 });

  const addItem = (isEdit: boolean = false) => {
    const isEquip = resources.find(r => r.id === currentItem.resourceId)?.type === 'equipment';
    const isValid = currentItem.resourceId && (
      (isEquip && ((currentItem.productiveConsumption || 0) > 0 || (currentItem.unproductiveConsumption || 0) > 0)) ||
      (!isEquip && currentItem.consumption > 0)
    );

    if (isValid) {
      if (isEdit && editingService) {
        const newItems = [...editingService.items];
        if (editingItemIndex !== null) {
          newItems[editingItemIndex] = currentItem;
        } else {
          newItems.push(currentItem);
        }
        setEditingService({ ...editingService, items: newItems });
      } else {
        const newItems = [...newService.items];
        if (editingItemIndex !== null) {
          newItems[editingItemIndex] = currentItem;
        } else {
          newItems.push(currentItem);
        }
        setNewService({ ...newService, items: newItems });
      }
      setCurrentItem({ resourceId: '', consumption: 0, productiveConsumption: 0, unproductiveConsumption: 0 });
      setResourceSearch('');
      setEditingItemIndex(null);
    }
  };

  const removeItem = (index: number, isEdit: boolean = false) => {
    if (isEdit && editingService) {
      setEditingService({
        ...editingService,
        items: editingService.items.filter((_, i) => i !== index)
      });
    } else {
      setNewService({
        ...newService,
        items: newService.items.filter((_, i) => i !== index)
      });
    }
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentItem({ resourceId: '', consumption: 0 });
    }
  };

  const editItem = (index: number, isEdit: boolean = false) => {
    const item = isEdit && editingService ? editingService.items[index] : newService.items[index];
    setCurrentItem(item);
    setEditingItemIndex(index);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newService);
    setIsAddOpen(false);
    setNewService({ code: '', name: '', unit: '', production: 1, fit: 0, items: [] });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      onUpdate(editingService);
      setIsEditOpen(false);
      setEditingService(null);
    }
  };

  const startEdit = (service: ServiceComposition) => {
    setEditingService(service);
    setIsEditOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Modelo Composições");
      
      // Cabeçalho
      worksheet.addRow([
        "#Código_Serviço",
        "#Nome_Serviço",
        "#Unidade_Serviço",
        "#Produção_Serviço",
        "#Fator_Ajuste",
        "#Código_Insumo",
        "#Consumo",
        "#Consumo_Produtivo",
        "#Consumo_Improdutivo"
      ]);
      
      // Exemplos para guiar o usuário
      worksheet.addRow([
        "SER-001",
        "Concreto Usinado fck=30MPa lançado",
        "m³",
        1,
        0,
        "MAT-001",
        1.05,
        0,
        0
      ]);
      worksheet.addRow([
        "SER-001",
        "Concreto Usinado fck=30MPa lançado",
        "m³",
        1,
        0,
        "EQP-001",
        0,
        0.5,
        0.5
      ]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, "Modelo_Importacao_Composicoes.xlsx");
    } catch (e) {
      console.error("Erro ao gerar modelo: ", e);
      alert("Erro ao gerar o modelo de importação de composições.");
    }
  };

  const handleExportBatch = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Atualização de Composições");
      
      // Cabeçalho
      worksheet.addRow([
        "#Código_Serviço",
        "#Nome_Serviço",
        "#Unidade_Serviço",
        "#Produção_Serviço",
        "#Fator_Ajuste",
        "#Código_Insumo",
        "#Consumo",
        "#Consumo_Produtivo",
        "#Consumo_Improdutivo"
      ]);
      
      services.forEach(s => {
        if (s.items && s.items.length > 0) {
          s.items.forEach(item => {
            const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
            const isEquip = res && 'type' in res && res.type === 'equipment';
            worksheet.addRow([
              s.code || "",
              s.name || "",
              s.unit || "",
              s.production ?? 1,
              s.fit ?? 0,
              res?.code || "",
              isEquip ? 0 : (item.consumption ?? 0),
              item.productiveConsumption ?? 0,
              item.unproductiveConsumption ?? 0
            ]);
          });
        } else {
          worksheet.addRow([
            s.code || "",
            s.name || "",
            s.unit || "",
            s.production ?? 1,
            s.fit ?? 0,
            "",
            0,
            0,
            0
          ]);
        }
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, "Atualizacao_Lote_Composicoes.xlsx");
    } catch (e) {
      console.error("Erro ao exportar atualização em lote: ", e);
      alert("Erro ao exportar a planilha de atualização.");
    }
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsImporting(false);
      alert("❌ Erro ao ler o arquivo físico.");
    };

    reader.onload = async (evt) => {
      try {
        const buildData = evt.target?.result;
        if (!buildData) throw new Error("Falha ao ler o arquivo.");

        const XLSX = await import("xlsx");
        const wb = XLSX.read(buildData, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        if (!jsonData || jsonData.length < 2) {
          alert("❌ Arquivo vazio ou formato incompatível. É necessário ao menos 1 linha de cabeçalho e 1 de dados.");
          setIsImporting(false);
          return;
        }

        const headers = jsonData[0].map(h => (h ? String(h).toLowerCase().trim() : ""));
        const findColIndex = (possibleTags: string[]) => {
          return headers.findIndex(h => possibleTags.some(tag => h.includes(tag)));
        };

        const colServiceCode = findColIndex(["#código_serviço", "#codigo_servico", "codigo do servico", "codigo servico", "código serviço", "servico_codigo", "código_serviço", "codigo_serviço"]);
        const colServiceName = findColIndex(["#nome_serviço", "#nome_servico", "nome do servico", "nome servico", "nome serviço", "servico_nome", "nome_serviço", "nome_serviço"]);
        const colServiceUnit = findColIndex(["#unidade_serviço", "#unidade_servico", "unidade", "unidade servico", "unidade serviço", "servico_unidade", "unid", "unidade_serviço", "unidade_serviço"]);
        const colServiceProd = findColIndex(["#produção_serviço", "#producao_servico", "producao", "produção", "produção_serviço", "producao_servico"]);
        const colServiceFit = findColIndex(["#fator_ajuste", "#fator_ajuste", "fit", "fator ajuste", "fator_ajuste", "fator_ajuste"]);
        const colResourceCode = findColIndex(["#código_insumo", "#codigo_insumo", "codigo insumo", "código insumo", "insumo_codigo", "codigo_insumo", "código_insumo"]);
        const colConsumption = findColIndex(["#consumo", "consumo"]);
        const colProdConsumption = findColIndex(["#consumo_produtivo", "produtivo", "consumo produtivo", "consumo_produtivo"]);
        const colUnprodConsumption = findColIndex(["#consumo_improdutivo", "improdutivo", "consumo improdutivo", "consumo_improdutivo"]);

        if (colServiceCode === -1 || colServiceName === -1) {
          alert("❌ Cabeçalho inválido. A planilha deve conter no mínimo as colunas '#Código_Serviço' e '#Nome_Serviço'.");
          setIsImporting(false);
          return;
        }

        const importedCompositions: { [code: string]: Omit<ServiceComposition, 'id'> & { items: CompositionItem[] } } = {};

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const sCode = String(row[colServiceCode] || "").trim();
          if (!sCode) continue;

          const sName = colServiceName !== -1 ? String(row[colServiceName] || "").trim() : "";
          const sUnit = colServiceUnit !== -1 ? String(row[colServiceUnit] || "").trim() : "m³";
          
          const parseFloatSafe = (val: any, fallback: number) => {
            if (val === null || val === undefined || val === "") return fallback;
            const parsed = parseFloat(String(val).replace(",", "."));
            return isNaN(parsed) ? fallback : parsed;
          };

          const sProd = colServiceProd !== -1 ? parseFloatSafe(row[colServiceProd], 1) : 1;
          const sFit = colServiceFit !== -1 ? parseFloatSafe(row[colServiceFit], 0) : 0;

          if (!importedCompositions[sCode]) {
            importedCompositions[sCode] = {
              code: sCode,
              name: sName || sCode,
              unit: sUnit || "m³",
              production: sProd,
              fit: sFit,
              items: []
            };
          }

          const rCode = colResourceCode !== -1 ? String(row[colResourceCode] || "").trim() : "";
          if (rCode) {
            const res = resources.find(r => r.code.trim().toLowerCase() === rCode.toLowerCase()) || 
                        services.find(serv => serv.code.trim().toLowerCase() === rCode.toLowerCase());
            
            if (res) {
              const consumption = colConsumption !== -1 ? parseFloatSafe(row[colConsumption], 0) : 0;
              const productive = colProdConsumption !== -1 ? parseFloatSafe(row[colProdConsumption], 0) : 0;
              const unproductive = colUnprodConsumption !== -1 ? parseFloatSafe(row[colUnprodConsumption], 0) : 0;
              
              const isEquip = 'type' in res && res.type === 'equipment';

              importedCompositions[sCode].items.push({
                resourceId: res.id,
                consumption: isEquip ? 0 : consumption,
                usageType: isEquip ? 'productive' : undefined,
                productiveConsumption: isEquip ? productive : undefined,
                unproductiveConsumption: isEquip ? unproductive : undefined
              });
            }
          }
        }

        const codes = Object.keys(importedCompositions);
        if (codes.length === 0) {
          alert("❌ Nenhum serviço válido encontrado para importação.");
          setIsImporting(false);
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        codes.forEach(code => {
          const imported = importedCompositions[code];
          const existing = services.find(s => s.code.trim().toLowerCase() === code.toLowerCase());

          if (existing) {
            onUpdate({
              ...existing,
              name: imported.name || existing.name,
              unit: imported.unit || existing.unit,
              production: imported.production,
              fit: imported.fit,
              items: imported.items
            });
            updatedCount++;
          } else {
            onAdd(imported);
            addedCount++;
          }
        });

        alert(`✅ Importação concluída!\n\nNovas composições criadas: ${addedCount}\nComposições atualizadas: ${updatedCount}`);
        setIsExportImportModalOpen(false);
      } catch (err) {
        console.error("[Service Import Error]", err);
        alert("❌ Ocorreu um erro ao processar o arquivo Excel. Verifique as colunas.");
      } finally {
        setIsImporting(false);
        if (event.target) event.target.value = '';
      }
    };
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            data.forEach((s: any) => {
              if (s.name && s.code) {
                const serviceToImport = {
                  ...s,
                  id: crypto.randomUUID()
                };
                onAdd(serviceToImport);
              }
            });
            alert('Importação concluída com sucesso!');
          }
        } catch (error) {
          alert('Erro ao importar arquivo. Certifique-se de que é um JSON válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const generateHelpPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Guia de Ajuda - Composições de Serviços", 20, 30);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const helpText = [
      "1. Nova Composição:",
      "   Para adicionar um novo serviço, clique no botão 'Nova Composição'.",
      "   Insira o código, nome e unidade do serviço. A seguir, adicione",
      "   os insumos necessários (materiais, mão de obra, equipamentos)",
      "   e defina o consumo e o tipo de uso.",
      "",
      "2. Exportação:",
      "   Utilize o botão 'Opções' para exportar as composições:",
      "   - Exportar Tudo (Detalhado): Gera uma planilha com cada insumo.",
      "   - Excel (Resumo): Exporta a lista de serviços e seus custos.",
      "   - PDF: Gera um relatório para impressão dos serviços.",
      "",
      "3. Importação:",
      "   A importação de serviços pode ser feita através de um arquivo .json",
      "   contendo um array de objetos de composição. Utilize a opção",
      "   'Importar Serviços (JSON)' nas opções e selecione seu arquivo.",
      "",
      "4. Edição e Exclusão:",
      "   Passe o mouse sobre os itens na lista para ver as opções",
      "   de edição (lápis) ou exclusão (lixeira).",
      "",
      "Para dúvidas técnicas, contate o suporte do sistema."
    ];
    
    doc.text(helpText, 20, 50);
    doc.save("ajuda_composicoes.pdf");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Composições de Serviços</h3>
          <p className="text-gray-500">Defina a composição de custos para cada serviço.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Input
              placeholder="Pesquisar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 h-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsExportImportModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer text-sm"
              title="Exportar / Importar Composições"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Exportar / Importar
            </Button>

            <Dialog
              open={isExportImportModalOpen}
              onOpenChange={setIsExportImportModalOpen}
            >
              <DialogContent className="sm:max-w-[750px] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left flex flex-col max-h-[90vh] overflow-y-auto">
                <DialogHeader className="text-left space-y-2 shrink-0">
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Exportar / Importar Composições de Serviços
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Selecione o formato para exportação, importe seus dados de arquivo Excel (.xlsx, .xls) ou baixe o modelo padrão para preenchimento.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 py-4 shrink-0">
                  {/* Opção 1: Relatório PDF */}
                  <button
                    onClick={() => {
                      exportServicesToPDF(services, resources, companyLogo, bdi);
                      setIsExportImportModalOpen(false);
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                  >
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs">Relatório PDF</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Gera PDF de resumo dos serviços</span>
                  </button>

                  {/* Opção 2: Planilha Excel */}
                  <button
                    onClick={() => {
                      exportServicesToExcel(services, resources);
                      setIsExportImportModalOpen(false);
                    }}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs">Resumo Excel</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Exporta a lista de serviços com custos</span>
                  </button>

                  {/* Opção 3: Baixar Modelo de Importação */}
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                      <Download className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs">Baixar Modelo</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Planilha padrão Excel para importação</span>
                  </button>

                  {/* Opção 4: Atualização em Lote */}
                  <button
                    onClick={handleExportBatch}
                    className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-purple-600 hover:bg-purple-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform mb-3">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs">Atualizar em Lote</span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Gera planilha preenchida para reimportar</span>
                  </button>

                  {/* Opção 5: Importar Excel */}
                  <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50/20 p-5 rounded-2xl transition group text-center cursor-pointer overflow-hidden bg-white">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleImportExcel}
                      disabled={isImporting}
                    />
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform mb-3">
                      {isImporting ? (
                         <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                         <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs">
                      {isImporting ? "Importando..." : "Importar Excel"}
                    </span>
                    <span className="text-slate-400 text-[10px] mt-1 leading-tight">Envie sua planilha Excel (.xlsx)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100">
                  <p className="font-bold text-slate-800">Dicas para a Importação de Composições via Excel:</p>
                  <p>A importação mapeia automaticamente os campos da planilha utilizando cabeçalhos sinalizados com o caractere (#) ou identificados por aproximação:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700 text-[11px]">Campos do Serviço:</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#Código_Serviço</span> - Código único do serviço (Ex: SER-001)</div>
                        <div><span className="font-bold text-slate-600">#Nome_Serviço</span> - Descrição legível do serviço</div>
                        <div><span className="font-bold text-slate-600">#Unidade_Serviço</span> - Unidade de medida (Ex: m³, h, kg)</div>
                        <div><span className="font-bold text-slate-600">#Produção_Serviço</span> - Fator de produção (padrão: 1)</div>
                        <div><span className="font-bold text-slate-600">#Fator_Ajuste</span> - Fator de Ajuste / FIT (padrão: 0)</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-slate-700 text-[11px]">Campos do Insumo (Opcionais):</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-emerald-700 bg-white p-2 rounded-lg border border-slate-200">
                        <div><span className="font-bold text-slate-600">#Código_Insumo</span> - Código do insumo cadastrado no banco</div>
                        <div><span className="font-bold text-slate-600">#Consumo</span> - Consumo para insumos convencionais</div>
                        <div><span className="font-bold text-slate-600">#Consumo_Produtivo</span> - Consumo produtivo (para Equipamentos)</div>
                        <div><span className="font-bold text-slate-600">#Consumo_Improdutivo</span> - Consumo improdutivo (Equipamentos)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsExportImportModalOpen(false)}
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {!readonly && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Nova Composição
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Criar Composição de Serviço</DialogTitle>
                    <DialogDescription>Adicione insumos e defina o consumo para compor o custo unitário.</DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="s-code">Código</Label>
                        <Input id="s-code" value={newService.code} onChange={e => setNewService({...newService, code: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-unit">Unidade</Label>
                        <Input id="s-unit" value={newService.unit} onChange={e => setNewService({...newService, unit: e.target.value})} required />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="s-name">Nome do Serviço</Label>
                        <Input id="s-name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-prod">Produção da Equipe</Label>
                        <NumericInput 
                          id="s-prod" 
                          value={newService.production} 
                          onChange={val => setNewService({...newService, production: val})} 
                          decimals={3}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s-fit">FIT (Fator de Interferência)</Label>
                        <NumericInput 
                          id="s-fit" 
                          value={newService.fit} 
                          onChange={val => setNewService({...newService, fit: val})} 
                          decimals={3}
                          required 
                        />
                      </div>
                    </div>

                    <Separator />

                      <div className="space-y-4">
                        <Label>Adicionar Itens à Composição</Label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <div className="relative">
                              <Input
                                placeholder="Digite para buscar e selecione um insumo ou serviço..."
                                value={
                                  (!isDropdownOpenAdd && currentItem.resourceId)
                                    ? (() => {
                                        const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                                        return res ? `${res.code} - ${res.name}` : '';
                                      })()
                                    : resourceSearch
                                }
                                onChange={(e) => {
                                  setResourceSearch(e.target.value);
                                  setIsDropdownOpenAdd(true);
                                  if (!e.target.value) {
                                    setCurrentItem(prev => ({ ...prev, resourceId: '' }));
                                  }
                                }}
                                onFocus={() => {
                                  setIsDropdownOpenAdd(true);
                                  if (currentItem.resourceId) {
                                    const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                                    if (res) setResourceSearch(res.name);
                                  }
                                }}
                                className="h-10 text-sm"
                              />
                              {(currentItem.resourceId || resourceSearch) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentItem(prev => ({ ...prev, resourceId: '' }));
                                    setResourceSearch('');
                                    setIsDropdownOpenAdd(false);
                                  }}
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {isDropdownOpenAdd && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setIsDropdownOpenAdd(false)} 
                                />
                                <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                                  {/* Insumos */}
                                  <div className="px-2 py-1 flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Insumos</span>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">Total: {resources.length}</span>
                                  </div>
                                  {resources
                                    .filter(r => 
                                      r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                      r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                    )
                                    .map(r => (
                                      <button
                                        type="button"
                                        key={r.id}
                                        onClick={() => {
                                          setCurrentItem({ ...currentItem, resourceId: r.id });
                                          setResourceSearch(r.name);
                                          setIsDropdownOpenAdd(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-gray-950">{r.name}</span>
                                          <span className="text-xs font-mono text-gray-500">{r.code} • {r.unit}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Selecionar</span>
                                      </button>
                                    ))}

                                  {/* Serviços */}
                                  <div className="px-2 py-1 mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Serviços</span>
                                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">Total: {services.length}</span>
                                  </div>
                                  {services
                                    .filter(s => 
                                      s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                      s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                    )
                                    .map(s => (
                                      <button
                                        type="button"
                                        key={s.id}
                                        onClick={() => {
                                          setCurrentItem({ ...currentItem, resourceId: s.id });
                                          setResourceSearch(s.name);
                                          setIsDropdownOpenAdd(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-gray-950">{s.name}</span>
                                          <span className="text-xs font-mono text-gray-500">{s.code} • {s.unit}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 group-hover:text-purple-600">Selecionar</span>
                                      </button>
                                    ))}

                                  {(() => {
                                    const filteredResources = resources.filter(r => 
                                      r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                      r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                    );
                                    const filteredServices = services.filter(s => 
                                      s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                      s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                    );
                                    if (filteredResources.length === 0 && filteredServices.length === 0) {
                                      return <p className="text-center text-xs text-gray-400 py-4 font-medium animate-pulse">Nenhum insumo ou serviço encontrado.</p>;
                                    }
                                    return null;
                                  })()}
                                </div>
                              </>
                            )}
                          </div>
                        {resources.find(r => r.id === currentItem.resourceId)?.type === 'equipment' ? (
                          <>
                            <div className="w-24">
                              <NumericInput 
                                placeholder="Produtiva" 
                                value={currentItem.productiveConsumption || 0} 
                                onChange={val => setCurrentItem({...currentItem, productiveConsumption: val})} 
                                decimals={6}
                              />
                            </div>
                            <div className="w-24">
                              <NumericInput 
                                placeholder="Improdutiva" 
                                value={currentItem.unproductiveConsumption || 0} 
                                onChange={val => setCurrentItem({...currentItem, unproductiveConsumption: val})} 
                                decimals={6}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="w-32">
                            <NumericInput 
                              placeholder="Consumo" 
                              value={currentItem.consumption} 
                              onChange={val => setCurrentItem({...currentItem, consumption: val})} 
                              decimals={6}
                            />
                          </div>
                        )}
                        <Button type="button" variant={editingItemIndex !== null ? "default" : "outline"} onClick={() => addItem(false)} className={editingItemIndex !== null ? "bg-orange-500 hover:bg-orange-600" : ""}>
                          {editingItemIndex !== null ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Unid.</TableHead>
                              <TableHead className="text-right">Consumo</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newService.items.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-4">Nenhum item adicionado.</TableCell>
                              </TableRow>
                            ) : (
                              newService.items.map((item, index) => {
                                const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
                                return (
                                  <TableRow key={`${item.resourceId}-${index}`} className={editingItemIndex === index ? "bg-orange-50" : ""}>
                                    <TableCell className="text-sm">
                                      {res?.name}
                                    </TableCell>
                                    <TableCell className="text-sm">{res?.unit}</TableCell>
                                    <TableCell className="text-right text-sm font-mono">
                                      {res?.type === 'equipment' ? (
                                        <div className="flex flex-col text-xs">
                                          <span className="text-blue-600">Prod: {formatNumber(item.productiveConsumption || 0, 6)}</span>
                                          <span className="text-gray-500">Impr: {formatNumber(item.unproductiveConsumption || 0, 6)}</span>
                                        </div>
                                      ) : (
                                        formatNumber(item.consumption, 6)
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400" onClick={() => editItem(index, false)}>
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeItem(index, false)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <div className="flex-1 flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 uppercase font-bold">Custo Direto:</span>
                        <span className="text-base font-bold text-gray-700">{formatCurrency(calculateServiceUnitCost(newService, resources, services))}</span>
                      </div>
                      {bdi > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 uppercase font-bold">Venda (BDI {formatNumber(bdi, 2)}%):</span>
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(calculateServiceUnitCost(newService, resources, services, bdi))}</span>
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar Composição</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
              {editingService && (
                <form onSubmit={handleEditSubmit} className="flex flex-col h-full overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Editar Composição de Serviço</DialogTitle>
                    <DialogDescription>Atualize os insumos e consumos desta composição.</DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-s-code">Código</Label>
                        <Input id="edit-s-code" value={editingService.code} onChange={e => setEditingService({...editingService, code: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-s-unit">Unidade</Label>
                        <Input id="edit-s-unit" value={editingService.unit} onChange={e => setEditingService({...editingService, unit: e.target.value})} required />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="edit-s-name">Nome do Serviço</Label>
                        <Input id="edit-s-name" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-s-prod">Produção da Equipe</Label>
                        <NumericInput 
                          id="edit-s-prod" 
                          value={editingService.production} 
                          onChange={val => setEditingService({...editingService, production: val})} 
                          decimals={3}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-s-fit">FIT (Fator de Interferência)</Label>
                        <NumericInput 
                          id="edit-s-fit" 
                          value={editingService.fit} 
                          onChange={val => setEditingService({...editingService, fit: val})} 
                          decimals={3}
                          required 
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Adicionar Itens à Composição</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <div className="relative">
                            <Input
                              placeholder="Digite para buscar e selecione um insumo ou serviço..."
                              value={
                                (!isDropdownOpenEdit && currentItem.resourceId)
                                  ? (() => {
                                      const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                                      return res ? `${res.code} - ${res.name}` : '';
                                    })()
                                  : resourceSearch
                              }
                              onChange={(e) => {
                                setResourceSearch(e.target.value);
                                setIsDropdownOpenEdit(true);
                                if (!e.target.value) {
                                  setCurrentItem(prev => ({ ...prev, resourceId: '' }));
                                }
                              }}
                              onFocus={() => {
                                setIsDropdownOpenEdit(true);
                                if (currentItem.resourceId) {
                                  const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                                  if (res) setResourceSearch(res.name);
                                }
                              }}
                              className="h-10 text-sm"
                            />
                            {(currentItem.resourceId || resourceSearch) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentItem(prev => ({ ...prev, resourceId: '' }));
                                  setResourceSearch('');
                                  setIsDropdownOpenEdit(false);
                                }}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {isDropdownOpenEdit && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setIsDropdownOpenEdit(false)} 
                              />
                              <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                                {/* Insumos */}
                                <div className="px-2 py-1 flex items-center justify-between">
                                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Insumos</span>
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">Total: {resources.length}</span>
                                </div>
                                {resources
                                  .filter(r => 
                                    r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                    r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                  )
                                  .map(r => (
                                    <button
                                      type="button"
                                      key={r.id}
                                      onClick={() => {
                                        setCurrentItem({ ...currentItem, resourceId: r.id });
                                        setResourceSearch(r.name);
                                        setIsDropdownOpenEdit(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-gray-950">{r.name}</span>
                                        <span className="text-xs font-mono text-gray-500">{r.code} • {r.unit}</span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Selecionar</span>
                                    </button>
                                  ))}

                                {/* Serviços */}
                                <div className="px-2 py-1 mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Serviços</span>
                                  <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">Total: {services.length}</span>
                                </div>
                                {services
                                  .filter(s => s.id !== editingService.id)
                                  .filter(s => 
                                    s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                    s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                  )
                                  .map(s => (
                                    <button
                                      type="button"
                                      key={s.id}
                                      onClick={() => {
                                        setCurrentItem({ ...currentItem, resourceId: s.id });
                                        setResourceSearch(s.name);
                                        setIsDropdownOpenEdit(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-gray-950">{s.name}</span>
                                        <span className="text-xs font-mono text-gray-500">{s.code} • {s.unit}</span>
                                      </div>
                                      <span className="text-xs font-bold text-gray-400 group-hover:text-purple-600">Selecionar</span>
                                    </button>
                                  ))}

                                {(() => {
                                  const filteredResources = resources.filter(r => 
                                    r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                    r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                  );
                                  const filteredServices = services
                                    .filter(s => s.id !== editingService.id)
                                    .filter(s => 
                                      s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                      s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                    );
                                  if (filteredResources.length === 0 && filteredServices.length === 0) {
                                    return <p className="text-center text-xs text-gray-400 py-4 font-medium animate-pulse">Nenhum insumo ou serviço encontrado.</p>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                        {resources.find(r => r.id === currentItem.resourceId)?.type === 'equipment' ? (
                          <>
                            <div className="w-24">
                              <NumericInput 
                                placeholder="Produtiva" 
                                value={currentItem.productiveConsumption || 0} 
                                onChange={val => setCurrentItem({...currentItem, productiveConsumption: val})} 
                                decimals={6}
                              />
                            </div>
                            <div className="w-24">
                              <NumericInput 
                                placeholder="Improdutiva" 
                                value={currentItem.unproductiveConsumption || 0} 
                                onChange={val => setCurrentItem({...currentItem, unproductiveConsumption: val})} 
                                decimals={6}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="w-32">
                            <NumericInput 
                              placeholder="Consumo" 
                              value={currentItem.consumption} 
                              onChange={val => setCurrentItem({...currentItem, consumption: val})} 
                              decimals={6}
                            />
                          </div>
                        )}
                        <Button type="button" variant={editingItemIndex !== null ? "default" : "outline"} onClick={() => addItem(true)} className={editingItemIndex !== null ? "bg-orange-500 hover:bg-orange-600" : ""}>
                          {editingItemIndex !== null ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Unid.</TableHead>
                              <TableHead className="text-right">Consumo</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingService.items.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-4">Nenhum item adicionado.</TableCell>
                              </TableRow>
                            ) : (
                              editingService.items.map((item, index) => {
                                const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
                                return (
                                  <TableRow key={`${item.resourceId}-${index}`} className={editingItemIndex === index ? "bg-orange-50" : ""}>
                                    <TableCell className="text-sm">
                                      {res?.name}
                                    </TableCell>
                                    <TableCell className="text-sm">{res?.unit}</TableCell>
                                    <TableCell className="text-right text-sm font-mono">
                                      {res?.type === 'equipment' ? (
                                        <div className="flex flex-col text-xs">
                                          <span className="text-blue-600">Prod: {formatNumber(item.productiveConsumption || 0, 6)}</span>
                                          <span className="text-gray-500">Impr: {formatNumber(item.unproductiveConsumption || 0, 6)}</span>
                                        </div>
                                      ) : (
                                        formatNumber(item.consumption, 6)
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400" onClick={() => editItem(index, true)}>
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeItem(index, true)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <div className="flex-1 flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 uppercase font-bold">Custo Direto:</span>
                        <span className="text-base font-bold text-gray-700">{formatCurrency(calculateServiceUnitCost(editingService, resources, services))}</span>
                      </div>
                      {bdi > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 uppercase font-bold">Venda (BDI {formatNumber(bdi, 2)}%):</span>
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(calculateServiceUnitCost(editingService, resources, services, bdi))}</span>
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Atualizar Composição</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 gap-4">
        {services.filter(s => 
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          s.code.toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">
              {searchTerm ? 'Nenhum serviço encontrado para esta pesquisa.' : 'Nenhuma composição de serviço cadastrada.'}
            </CardContent>
          </Card>
        ) : (
          services
            .filter(s => 
              s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              s.code.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(s => (
              <Card key={s.id} className="border-none shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-400">{s.code}</span>
                      <h4 className="font-bold text-lg">{s.name}</h4>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-base text-gray-500">Unidade: <span className="text-gray-900 font-medium">{s.unit}</span></span>
                      <span className="text-base text-gray-500">Itens: <span className="text-gray-900 font-medium">{s.items.length}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-400 uppercase font-bold tracking-wider">Custo Unitário</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(calculateServiceUnitCost(s, resources, services))}</p>
                    {bdi > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        Com BDI: {formatCurrency(calculateServiceUnitCost(s, resources, services, bdi))}
                      </p>
                    )}
                  </div>
                  {!readonly ? (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-blue-600"
                        onClick={() => startEdit(s)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-blue-600"
                        onClick={() => exportCompositionToPDF(s, resources, services, companyLogo, bdi)}
                        title="Exportar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => onDelete(s.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-blue-600"
                        onClick={() => exportCompositionToPDF(s, resources, services, companyLogo, bdi)}
                        title="Exportar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}
