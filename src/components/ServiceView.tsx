import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Briefcase, Download } from 'lucide-react';
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
    if (currentItem.resourceId && currentItem.consumption > 0) {
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
      setCurrentItem({ resourceId: '', consumption: 0 });
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
            <Button variant="outline" onClick={() => exportAllCompositionsToExcel(services, resources)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Tudo (Detalhado)
            </Button>
            <Button variant="outline" onClick={() => exportServicesToExcel(services, resources)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" onClick={() => exportServicesToPDF(services, resources, companyLogo, bdi)}>
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
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
                          <div className="flex-1">
                            <Select value={currentItem.resourceId} onValueChange={v => setCurrentItem({...currentItem, resourceId: v})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um insumo ou serviço" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-2">
                                  <Input 
                                    placeholder="Pesquisar..." 
                                    value={resourceSearch} 
                                    onChange={e => setResourceSearch(e.target.value)}
                                    className="h-8 text-xs"
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                  />
                                </div>
                                <Separator className="mb-1" />
                                <div className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">Insumos</div>
                                {resources
                                  .filter(r => 
                                    r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                    r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                  )
                                  .map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.code} - {r.name}</SelectItem>
                                  ))}
                                <Separator className="my-1" />
                                <div className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">Serviços</div>
                                {services
                                  .filter(s => 
                                    s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                    s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                  )
                                  .map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        <div className="w-32">
                          <NumericInput 
                            placeholder="Consumo" 
                            value={currentItem.consumption} 
                            onChange={val => setCurrentItem({...currentItem, consumption: val})} 
                            decimals={3}
                          />
                        </div>
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
                                <TableCell colSpan={4} className="text-center text-xs text-gray-400 py-4">Nenhum item adicionado.</TableCell>
                              </TableRow>
                            ) : (
                              newService.items.map((item, index) => {
                                const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
                                return (
                                  <TableRow key={`${item.resourceId}-${index}`} className={editingItemIndex === index ? "bg-orange-50" : ""}>
                                    <TableCell className="text-xs">{res?.name}</TableCell>
                                    <TableCell className="text-xs">{res?.unit}</TableCell>
                                    <TableCell className="text-right text-xs font-mono">{formatNumber(item.consumption, 6)}</TableCell>
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
                        <span className="text-xs text-gray-500 uppercase font-bold">Custo Direto:</span>
                        <span className="text-sm font-bold text-gray-700">{formatCurrency(calculateServiceUnitCost(newService, resources, services))}</span>
                      </div>
                      {bdi > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 uppercase font-bold">Venda (BDI {formatNumber(bdi, 2)}%):</span>
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
                        <div className="flex-1">
                          <Select value={currentItem.resourceId} onValueChange={v => setCurrentItem({...currentItem, resourceId: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um insumo ou serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input 
                                  placeholder="Pesquisar..." 
                                  value={resourceSearch} 
                                  onChange={e => setResourceSearch(e.target.value)}
                                  className="h-8 text-xs"
                                  onClick={e => e.stopPropagation()}
                                  onKeyDown={e => e.stopPropagation()}
                                />
                              </div>
                              <Separator className="mb-1" />
                              <div className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">Insumos</div>
                              {resources
                                .filter(r => 
                                  r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                  r.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                )
                                .map(r => (
                                  <SelectItem key={r.id} value={r.id}>{r.code} - {r.name}</SelectItem>
                                ))}
                              <Separator className="my-1" />
                              <div className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">Serviços</div>
                              {services
                                .filter(s => s.id !== editingService.id)
                                .filter(s => 
                                  s.name.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                                  s.code.toLowerCase().includes(resourceSearch.toLowerCase())
                                )
                                .map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <NumericInput 
                            placeholder="Consumo" 
                            value={currentItem.consumption} 
                            onChange={val => setCurrentItem({...currentItem, consumption: val})} 
                            decimals={3}
                          />
                        </div>
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
                                <TableCell colSpan={4} className="text-center text-xs text-gray-400 py-4">Nenhum item adicionado.</TableCell>
                              </TableRow>
                            ) : (
                              editingService.items.map((item, index) => {
                                const res = resources.find(r => r.id === item.resourceId) || services.find(serv => serv.id === item.resourceId);
                                return (
                                  <TableRow key={`${item.resourceId}-${index}`} className={editingItemIndex === index ? "bg-orange-50" : ""}>
                                    <TableCell className="text-xs">{res?.name}</TableCell>
                                    <TableCell className="text-xs">{res?.unit}</TableCell>
                                    <TableCell className="text-right text-xs font-mono">{formatNumber(item.consumption, 6)}</TableCell>
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
                        <span className="text-xs text-gray-500 uppercase font-bold">Custo Direto:</span>
                        <span className="text-sm font-bold text-gray-700">{formatCurrency(calculateServiceUnitCost(editingService, resources, services))}</span>
                      </div>
                      {bdi > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 uppercase font-bold">Venda (BDI {formatNumber(bdi, 2)}%):</span>
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
                      <span className="text-xs font-mono text-gray-400">{s.code}</span>
                      <h4 className="font-bold text-lg">{s.name}</h4>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500">Unidade: <span className="text-gray-900 font-medium">{s.unit}</span></span>
                      <span className="text-sm text-gray-500">Itens: <span className="text-gray-900 font-medium">{s.items.length}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Custo Unitário</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(calculateServiceUnitCost(s, resources, services))}</p>
                    {bdi > 0 && (
                      <p className="text-[10px] text-green-600 font-medium">
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
