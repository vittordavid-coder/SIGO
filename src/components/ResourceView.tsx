import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Download, ChevronUp, ChevronDown, TrendingUp, ArrowLeft } from 'lucide-react';
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
    }
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
            <Button variant="outline" onClick={() => exportResourcesToExcel(resources)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
            </Button>
            <Button variant="outline" onClick={() => exportResourcesToPDF(resources)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
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
