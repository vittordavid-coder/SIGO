import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Resource, ResourceType } from '../types';
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

import { NumericInput } from '@/components/ui/numeric-input';

interface ResourceViewProps {
  key?: string;
  resources: Resource[];
  onAdd: (r: Omit<Resource, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (r: Resource) => void;
  readonly?: boolean;
}

export function ResourceView({ resources, onAdd, onDelete, onUpdate, readonly }: ResourceViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
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
          comparison = a.basePrice - b.basePrice;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [resources, searchTerm, sortField, sortOrder]);

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
                  Preço Base
                  {sortField === 'basePrice' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Nenhum insumo encontrado para esta pesquisa.' : 'Nenhum insumo cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedResources.map(r => (
                  <TableRow key={r.id} className="group">
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
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
                  <TableCell className="text-right font-mono">{formatCurrency(r.basePrice)}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}
