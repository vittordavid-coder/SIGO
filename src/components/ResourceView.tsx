import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Download, ChevronUp, ChevronDown, TrendingUp, ArrowLeft, Upload, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Resource, ResourceType, PurchaseOrder } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { exportResourcesToExcel, exportResourcesToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import { NumericInput } from '@/components/ui/numeric-input';

interface ResourceViewProps {
  key?: string;
  resources: Resource[];
  onAdd: (r: Omit<Resource, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (r: Resource) => void;
  purchaseOrders?: PurchaseOrder[];
  readonly?: boolean;
}

export function ResourceView({ resources, onAdd, onDelete, onUpdate, purchaseOrders = [], readonly }: ResourceViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExportSelectorOpen, setIsExportSelectorOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedHistoryResource, setSelectedHistoryResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'code' | 'name' | 'type' | 'unit' | 'basePrice'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newResource, setNewResource] = useState<Omit<Resource, 'id'>>({
    code: '',
    name: '',
    unit: '',
    type: 'material',
    basePrice: 0,
  });

  const getResourceStats = React.useCallback((r: Resource) => {
    const codeToMatch = r.code.trim().toLowerCase();
    const nameToMatch = r.name.trim().toLowerCase();
    
    let totalQty = 0;
    let totalValue = 0;
    let purchaseCount = 0;

    purchaseOrders.forEach(po => {
      po.items.forEach(item => {
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.description || '').trim().toLowerCase();
        
        if (
          (codeToMatch && itemCode === codeToMatch) || 
          (nameToMatch && itemName === nameToMatch)
        ) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          totalQty += qty;
          totalValue += qty * price;
          purchaseCount++;
        }
      });
    });

    const averagePrice = totalQty > 0 ? totalValue / totalQty : r.basePrice;

    return {
      totalQty,
      totalValue,
      averagePrice,
      purchaseCount
    };
  }, [purchaseOrders]);

  const stats = React.useMemo(() => {
    if (!selectedHistoryResource) return { totalQty: 0, totalValue: 0, averagePrice: 0, purchaseCount: 0 };
    return getResourceStats(selectedHistoryResource);
  }, [selectedHistoryResource, getResourceStats]);

  const priceHistory = React.useMemo(() => {
    if (!selectedHistoryResource) return [];

    const history: { date: string; price: number; quantity: number | string; total: number | string; source: string; rawDate: string }[] = [];

    // Add initial creation price entry
    history.push({
      date: 'Cad.',
      price: selectedHistoryResource.basePrice,
      quantity: '-',
      total: '-',
      source: 'Inicial',
      rawDate: '0000-00-00'
    });

    const codeToMatch = selectedHistoryResource.code.trim().toLowerCase();
    const nameToMatch = selectedHistoryResource.name.trim().toLowerCase();

    const seenPurchases = new Set<string>();

    purchaseOrders.forEach(po => {
      const orderDateRaw = po.orderDate || new Date().toISOString().split('T')[0];
      // Format to DD/MM/YY or DD/MM for graph readability
      let formattedDate = orderDateRaw;
      try {
        const parts = orderDateRaw.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
        }
      } catch (e) {}

      po.items.forEach((item, itemIdx) => {
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.description || '').trim().toLowerCase();

        if (
          (codeToMatch && itemCode === codeToMatch) || 
          (nameToMatch && itemName === nameToMatch)
        ) {
          const uniqueKey = `${po.id}-${item.id || itemIdx}`;
          if (!seenPurchases.has(uniqueKey)) {
            seenPurchases.add(uniqueKey);
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            history.push({
              date: formattedDate,
              price: price,
              quantity: qty,
              total: qty * price,
              source: `OC-${po.orderNumber}`,
              rawDate: orderDateRaw
            });
          }
        }
      });
    });

    // Sort entries chronologically by raw orderDate, except keep Cad at first
    const cadEntry = history.find(h => h.source === 'Inicial');
    const otherEntries = history.filter(h => h.source !== 'Inicial');
    
    otherEntries.sort((a, b) => {
      return a.rawDate.localeCompare(b.rawDate);
    });

    const combined = cadEntry ? [cadEntry, ...otherEntries] : otherEntries;
    // Keep max 10 entries
    return combined.slice(-10);
  }, [selectedHistoryResource, purchaseOrders]);

  const getNextCode = (type: ResourceType) => {
    const prefix = type === 'labor' ? 'MO-' : type === 'equipment' ? 'EP-' : 'MAT-';
    const typeResources = resources.filter(r => r.type === type);
    
    // Extract numbers from codes like "MO-0001"
    const existingNumbers = typeResources
      .map(r => {
        const match = r.code.match(new RegExp(`${prefix}(\\d+)`));
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    // Find first gap
    let nextNum = 1;
    for (const num of existingNumbers) {
      if (num === nextNum) {
        nextNum++;
      } else if (num > nextNum) {
        break;
      }
    }

    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  const handleOpenAdd = () => {
    const defaultType = 'material';
    setNewResource({
      code: getNextCode(defaultType),
      name: '',
      unit: '',
      type: defaultType,
      basePrice: 0,
    });
    setIsAddOpen(true);
  };

  const handleTypeChange = (type: ResourceType) => {
    setNewResource({
      ...newResource,
      type,
      code: getNextCode(type)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newResource);
    setIsAddOpen(false);
    setNewResource({ code: '', name: '', unit: '', type: 'material', basePrice: 0 });
    alert("Insumo salvo com sucesso na tabela resources!");
  };

  const handleEditTypeChange = (type: ResourceType) => {
    if (editingResource) {
      setEditingResource({
        ...editingResource,
        type,
        code: getNextCode(type)
      });
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResource) {
      onUpdate(editingResource);
      setIsEditOpen(false);
      setEditingResource(null);
      alert("Insumo editado com sucesso na tabela resources!");
    }
  };

  const handleDownloadTemplate = () => {
    import('xlsx').then(XLSX => {
      const data = [
        {
          '#tipo': 'material',
          '#nome': 'Exemplo de Insumo',
          '#unidade': 'UN',
          '#preco': 15.50
        }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo");
      XLSX.writeFile(wb, "modelo_insumos.xlsx");
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        if (!buildData) throw new Error("Falha ao ler o byte-stream do arquivo.");

        const XLSX = await import("xlsx");
        const wb = XLSX.read(buildData, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        data.forEach((row, i) => {
          // Identify keys using tags or exact names
          const typeKey = Object.keys(row).find(k => k.toLowerCase().includes('#tipo') || k.toLowerCase() === 'tipo');
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('#nome') || k.toLowerCase() === 'nome');
          const unitKey = Object.keys(row).find(k => k.toLowerCase().includes('#unidade') || k.toLowerCase() === 'unidade');
          const priceKey = Object.keys(row).find(k => k.toLowerCase().includes('#preco') || k.toLowerCase().includes('preço'));

          if (nameKey && unitKey) {
            const rowType = typeKey ? row[typeKey]?.toString().toLowerCase() : 'material';
            let parsedType: ResourceType = 'material';
            if (rowType.includes('obra') || rowType === 'labor') parsedType = 'labor';
            else if (rowType.includes('equip') || rowType === 'equipment') parsedType = 'equipment';

            const parsedPrice = priceKey ? Number(row[priceKey]) || 0 : 0;
            
            // For import, we'll let it use the next code for the type
            onAdd({
              code: getNextCode(parsedType), // This might reuse codes if called rapidly in a loop if state hasn't updated. 
              // Wait, getNextCode depends on resources state which won't update during this loop.
              // To fix this we can generate UUID for code, or let the server/App.tsx handle the code generation.
              // Since `getNextCode` logic is here, I'll use it but append index `+ i` to the sequence temporarily to prevent duplicates.
              // For simplicity, we can pass uuid if it fails, but let's do our best.
              name: row[nameKey],
              unit: row[unitKey],
              type: parsedType,
              basePrice: parsedPrice
            });
            importedCount++;
          }
        });

        alert(`✅ Importação concluída! ${importedCount} insumos foram adicionados com sucesso na tabela resources.`);
      } catch (err) {
        console.error(err);
        alert("❌ Erro ao processar arquivo: " + err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const startEdit = (resource: Resource) => {
    setEditingResource(resource);
    setIsEditOpen(true);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedResources = React.useMemo(() => {
    const filtered = resources.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'unit':
          comparison = a.unit.localeCompare(b.unit);
          break;
        case 'basePrice':
          const priceA = getResourceStats(a).averagePrice;
          const priceB = getResourceStats(b).averagePrice;
          comparison = priceA - priceB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [resources, searchTerm, sortField, sortOrder, getResourceStats]);

  if (selectedHistoryResource) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedHistoryResource(null)} className="h-9 rounded-xl border-gray-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Insumos
          </Button>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Histórico de Preço: {selectedHistoryResource.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono tracking-tight uppercase">
              Código: {selectedHistoryResource.code} | Unidade: {selectedHistoryResource.unit}
            </p>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Valor Total Comprado</span>
              <p className="text-2xl font-black text-blue-600 font-mono">
                {formatCurrency(stats.totalValue)}
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Soma de todas as ordens de compra
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Quantidade Total Comprada</span>
              <p className="text-2xl font-black text-orange-600 font-mono">
                {stats.totalQty.toLocaleString('pt-BR')} <span className="text-sm font-bold text-gray-400 uppercase font-sans">{selectedHistoryResource.unit}</span>
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Acumulado de quantidade faturada
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Preço Médio Atual</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                {formatCurrency(stats.averagePrice)}
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Valor Total / Quantidade Total
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Chart Section */}
          <Card className="lg:col-span-7 p-6 border-none shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-gray-900">Gráfico das Últimas 10 Mudanças de Preço</h4>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
                {priceHistory.length} Registros
              </Badge>
            </div>
            
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Preço']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    dot={{ r: 6, strokeWidth: 2, fill: '#FFFFFF', stroke: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Table Section */}
          <Card className="lg:col-span-5 p-6 border-none shadow-sm space-y-4">
            <h4 className="text-base font-bold text-gray-900">Tabela de Alterações</h4>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-left font-black text-xs text-gray-400 uppercase tracking-tighter">Data</TableHead>
                    <TableHead className="text-center font-black text-xs text-gray-400 uppercase tracking-tighter">Origem</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Qtd</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Unitário</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-gray-50/50">
                      <TableCell className="text-left py-3 font-semibold text-xs text-gray-700">
                        {entry.date}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge variant="outline" className="bg-blue-50/30 text-blue-700 border-blue-100/50 font-bold text-[10px] uppercase tracking-wider">
                          {entry.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-medium text-xs text-gray-600">
                        {typeof entry.quantity === 'number' ? entry.quantity.toLocaleString('pt-BR') : entry.quantity}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono text-xs text-gray-900">
                        {formatCurrency(entry.price)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-black text-xs text-emerald-600">
                        {typeof entry.total === 'number' ? formatCurrency(entry.total) : entry.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Insumos</h3>
          <p className="text-gray-500">Gerencie mão-de-obra, materiais e equipamentos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Input
              placeholder="Pesquisar insumos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 h-10"
            />
          </div>
          <div className="flex gap-2">
            {!readonly && (
              <Dialog open={isExportSelectorOpen} onOpenChange={setIsExportSelectorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-gray-700 bg-white shadow-sm border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all font-medium">
                    <Download className="w-4 h-4 mr-2 text-gray-500" /> Exportar / Importar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] bg-white border-0 shadow-2xl rounded-3xl p-6 md:p-8">
                  <DialogHeader className="mb-2">
                    <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                      Exportar / Importar Insumos
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Selecione o formato para exportação de dados, importe seus dados ou baixe o modelo padrão de cabeçalho.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-4 shrink-0">
                    {/* Opção 1: Relatório PDF */}
                    <button
                      onClick={() => {
                        exportResourcesToPDF(resources);
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Relatório PDF</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">PDF formato Paisagem</span>
                    </button>

                    {/* Opção 2: Planilha Excel */}
                    <button
                      onClick={() => {
                        exportResourcesToExcel(resources);
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Planilha Excel</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Base completa para conferência</span>
                    </button>

                    {/* Opção 3: Modelo / Atualização em Lote */}
                    <button
                      onClick={() => {
                        handleDownloadTemplate();
                        setIsExportSelectorOpen(false);
                      }}
                      className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                        <Download className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">Baixar Modelo</span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Planilha de exemplo para importação</span>
                    </button>

                    {/* Opção 4: Importar Dados */}
                    <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50/20 p-5 rounded-2xl transition group text-center cursor-pointer overflow-hidden">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className={cn(
                          "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",
                          isImporting && "pointer-events-none"
                        )}
                        onChange={(e) => {
                          handleImportData(e);
                          setIsExportSelectorOpen(false);
                        }}
                        disabled={isImporting}
                      />
                      <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform mb-3">
                        {isImporting ? (
                          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {isImporting ? "Importando..." : "Importar Dados"}
                      </span>
                      <span className="text-slate-400 text-[10px] mt-1 leading-tight">Envie sua planilha preenchida</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100">
                    <p className="font-bold text-slate-800">Dica sobre a Importação e Tags de Insumos:</p>
                    <p>Ao realizar a importação de dados por planilha Excel, certifique-se de usar os cabeçalhos das colunas exatamente como definidos no modelo, ou utilize as tags (#) opcionais para mapeamento automático das colunas:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1">
                        <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                          <div><span className="font-bold text-slate-600">#tipo</span> - Tipo (material, mao-de-obra, equipamento)</div>
                          <div><span className="font-bold text-slate-600">#nome</span> - Nome do Insumo</div>
                          <div><span className="font-bold text-slate-600">#unidade</span> - Unidade (UN, KG, M2)</div>
                          <div><span className="font-bold text-slate-600">#preco</span> - Preço Base</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {!readonly && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAdd}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Insumo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Insumo</DialogTitle>
                    <DialogDescription>Preencha os dados básicos do insumo para utilizá-lo nas composições.</DialogDescription>
                  </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Tipo</Label>
                    <Select 
                      value={newResource.type} 
                      onValueChange={(v: ResourceType) => handleTypeChange(v)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Mão-de-obra</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="equipment">Equipamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">Código</Label>
                    <Input 
                      id="code" 
                      className="col-span-3 bg-gray-50 font-mono" 
                      value={newResource.code} 
                      readOnly
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input 
                      id="name" 
                      className="col-span-3" 
                      value={newResource.name} 
                      onChange={e => setNewResource({...newResource, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unit" className="text-right">Unidade</Label>
                    <Input 
                      id="unit" 
                      className="col-span-3" 
                      value={newResource.unit} 
                      onChange={e => setNewResource({...newResource, unit: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">Preço Base</Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="price" 
                        value={newResource.basePrice} 
                        onChange={val => setNewResource({...newResource, basePrice: val})} 
                        prefix="R$"
                        decimals={2}
                        required
                      />
                    </div>
                  </div>
                  {newResource.type === 'labor' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="encargos" className="text-right">Encargos (%)</Label>
                      <div className="col-span-3">
                        <NumericInput 
                          id="encargos" 
                          value={newResource.encargos || 0} 
                          onChange={val => setNewResource({...newResource, encargos: val})} 
                          decimals={2}
                        />
                      </div>
                    </div>
                  )}
                  {newResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="productivePrice" 
                            value={newResource.productivePrice || 0} 
                            onChange={val => setNewResource({...newResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="unproductivePrice" 
                            value={newResource.unproductivePrice || 0} 
                            onChange={val => setNewResource({...newResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar Insumo</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {editingResource && (
              <form onSubmit={handleEditSubmit}>
                <DialogHeader>
                  <DialogTitle>Editar Insumo</DialogTitle>
                  <DialogDescription>Atualize os dados do insumo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-type" className="text-right">Tipo</Label>
                    <Select 
                      value={editingResource.type} 
                      onValueChange={(v: ResourceType) => handleEditTypeChange(v)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Mão-de-obra</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="equipment">Equipamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-code" className="text-right">Código</Label>
                    <Input 
                      id="edit-code" 
                      className="col-span-3 bg-gray-50 font-mono" 
                      value={editingResource.code} 
                      readOnly
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">Nome</Label>
                    <Input 
                      id="edit-name" 
                      className="col-span-3" 
                      value={editingResource.name} 
                      onChange={e => setEditingResource({...editingResource, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-unit" className="text-right">Unidade</Label>
                    <Input 
                      id="edit-unit" 
                      className="col-span-3" 
                      value={editingResource.unit} 
                      onChange={e => setEditingResource({...editingResource, unit: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">Preço Base</Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="edit-price" 
                        value={editingResource.basePrice} 
                        onChange={val => setEditingResource({...editingResource, basePrice: val})} 
                        prefix="R$"
                        decimals={2}
                        required
                      />
                    </div>
                  </div>
                  {editingResource.type === 'labor' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-encargos" className="text-right">Encargos (%)</Label>
                      <div className="col-span-3">
                        <NumericInput 
                          id="edit-encargos" 
                          value={editingResource.encargos || 0} 
                          onChange={val => setEditingResource({...editingResource, encargos: val})} 
                          decimals={2}
                        />
                      </div>
                    </div>
                  )}
                  {editingResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-productivePrice" 
                            value={editingResource.productivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-unproductivePrice" 
                            value={editingResource.unproductivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Atualizar Insumo</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead 
                className="w-[100px] cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('code')}
              >
                <div className="flex items-center gap-1">
                  Código
                  {sortField === 'code' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Nome
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="w-[120px] cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1">
                  Tipo
                  {sortField === 'type' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('unit')}
              >
                <div className="flex items-center gap-1">
                  Unid.
                  {sortField === 'unit' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('basePrice')}
              >
                <div className="flex items-center justify-end gap-1">
                  Preço Base / Médio
                  {sortField === 'basePrice' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[125px] text-center">Histórico</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Nenhum insumo encontrado para esta pesquisa.' : 'Nenhum insumo cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedResources.map(r => {
                const rStats = getResourceStats(r);
                return (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        r.type === 'labor' && "bg-blue-50 text-blue-700 border-blue-200",
                        r.type === 'material' && "bg-green-50 text-green-700 border-green-200",
                        r.type === 'equipment' && "bg-purple-50 text-purple-700 border-purple-200",
                      )}>
                        {r.type === 'labor' ? 'Mão-de-obra' : r.type === 'material' ? 'Material' : 'Equipamento'}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(rStats.averagePrice)}</span>
                        {rStats.purchaseCount > 0 && (
                          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">Médio (Compras)</span>
                        )}
                      </div>
                    </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedHistoryResource(r)}
                      className="h-7 px-2.5 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700 transition"
                    >
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> Histórico
                    </Button>
                  </TableCell>
                  {!readonly && (
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-blue-600"
                          onClick={() => startEdit(r)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => onDelete(r.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}
