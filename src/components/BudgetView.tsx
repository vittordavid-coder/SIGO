import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, FileText, Search, Plus, Package, X, FileSpreadsheet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ServiceComposition, Resource, BudgetGroup, Quotation } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { useLocalStorage } from '../lib/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BudgetViewProps {
  key?: string;
  services: ServiceComposition[];
  resources: Resource[];
  budgetItems: {serviceId: string, quantity: number}[];
  setBudgetItems: (items: {serviceId: string, quantity: number}[]) => void;
  budgetGroups: BudgetGroup[];
  setBudgetGroups: (groups: BudgetGroup[]) => void;
  onSaveAsQuotation: (q: Quotation) => void;
  companyLogo?: string;
  defaultOrg: string;
  bdi?: number;
  readonly?: boolean;
}

export function BudgetView({ 
  services, resources, budgetItems, setBudgetItems, budgetGroups, setBudgetGroups, onSaveAsQuotation, defaultOrg, bdi = 0, readonly
}: BudgetViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetName, setBudgetName] = useState('');
  const [organization, setOrganization] = useState(defaultOrg);
  const [newGroupName, setNewGroupName] = useState('');
  
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addServiceToGroup = (serviceId: string, groupId: string | null) => {
    if (groupId) {
      setBudgetGroups(budgetGroups.map(g => {
        if (g.id === groupId) {
          if (g.services.some(s => s.serviceId === serviceId)) return g;
          return { ...g, services: [...g.services, { serviceId, quantity: 0 }] };
        }
        return g;
      }));
    } else {
      if (budgetItems.some(item => item.serviceId === serviceId)) return;
      setBudgetItems([...budgetItems, { serviceId, quantity: 0 }]);
    }
  };

  const removeServiceFromGroup = (serviceId: string, groupId: string | null) => {
    if (groupId) {
      setBudgetGroups(budgetGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, services: g.services.filter(s => s.serviceId !== serviceId) };
        }
        return g;
      }));
    } else {
      setBudgetItems(budgetItems.filter(item => item.serviceId !== serviceId));
    }
  };

  const updateQuantityInGroup = (serviceId: string, quantity: number, groupId: string | null) => {
    if (groupId) {
      setBudgetGroups(budgetGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            services: g.services.map(s => s.serviceId === serviceId ? { ...s, quantity } : s)
          };
        }
        return g;
      }));
    } else {
      setBudgetItems(budgetItems.map(item => 
        item.serviceId === serviceId ? { ...item, quantity } : item
      ));
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: BudgetGroup = {
      id: uuidv4(),
      name: newGroupName,
      services: []
    };
    setBudgetGroups([...budgetGroups, newGroup]);
    setNewGroupName('');
  };

  const removeGroup = (groupId: string) => {
    setBudgetGroups(budgetGroups.filter(g => g.id !== groupId));
  };

  const calculateTotal = () => {
    const itemsTotal = budgetItems.reduce((acc, item) => {
      const s = services.find(serv => serv.id === item.serviceId);
      if (!s) return acc;
      return acc + (calculateServiceUnitCost(s, resources, services) * item.quantity);
    }, 0);

    const groupsTotal = budgetGroups.reduce((acc, group) => {
      return acc + group.services.reduce((gAcc, item) => {
        const s = services.find(serv => serv.id === item.serviceId);
        if (!s) return gAcc;
        return gAcc + (calculateServiceUnitCost(s, resources, services) * item.quantity);
      }, 0);
    }, 0);

    return itemsTotal + groupsTotal;
  };

  const totalBudget = calculateTotal();

  const handleSave = () => {
    const newQ: Quotation = {
      id: uuidv4(),
      budgetName: budgetName || `Planilha Gerada em ${new Date().toLocaleDateString()}`,
      organization: organization,
      date: new Date().toLocaleDateString(),
      sectorResponsible: '',
      requesterSector: '',
      year: new Date().getFullYear(),
      trecho: '',
      municipios: '',
      rodovias: '',
      version: '1.0',
      extension: '',
      baseDate: new Date().toLocaleDateString(),
      services: budgetItems,
      groups: budgetGroups
    };
    onSaveAsQuotation(newQ);
    alert('Planilha salva como Cotação!');
    setBudgetName('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex-1 mr-8">
          <h3 className="text-2xl font-bold tracking-tight">Planilha de Orçamento</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-gray-400">Nome da Planilha</Label>
              <Input 
                placeholder="Ex: Obra de Pavimentação - Lote 1" 
                value={budgetName}
                onChange={e => setBudgetName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-gray-400">Órgão / Cliente</Label>
              <Input 
                placeholder="Ex: Prefeitura Municipal" 
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-end mb-1">
          {!readonly && (
            <>
              <Button variant="outline" onClick={() => { setBudgetItems([]); setBudgetGroups([]); setBudgetName(''); }} disabled={budgetItems.length === 0 && budgetGroups.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={budgetItems.length === 0 && budgetGroups.length === 0}>
                <FileText className="w-4 h-4 mr-2" /> Salvar Cotação
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Area */}
        {!readonly && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Serviços</CardTitle>
              <CardDescription>Pesquise e adicione serviços à sua planilha.</CardDescription>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  className="pl-9" 
                  placeholder="Buscar por código ou nome..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Criar Novo Grupo</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nome do grupo (ex: Drenagem)" 
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={addGroup}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {filteredServices.map(s => {
                    const isInMain = budgetItems.some(item => item.serviceId === s.id);
                    const isInAnyGroup = budgetGroups.some(g => g.services.some(item => item.serviceId === s.id));
                    const isAdded = isInMain || isInAnyGroup;

                    return (
                      <div 
                        key={s.id} 
                        className={cn(
                          "p-3 rounded-lg border transition-all flex flex-col gap-2",
                          isAdded ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-gray-100"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-blue-600">{s.code}</p>
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.unit}</p>
                          </div>
                          {isAdded && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">Adicionado</Badge>}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-[10px] px-2"
                            onClick={() => addServiceToGroup(s.id, null)}
                            disabled={isInMain}
                          >
                            Sem Grupo
                          </Button>
                          {budgetGroups.map(g => (
                            <Button 
                              key={g.id}
                              size="sm" 
                              variant="outline" 
                              className="h-6 text-[10px] px-2"
                              onClick={() => addServiceToGroup(s.id, g.id)}
                              disabled={g.services.some(item => item.serviceId === s.id)}
                            >
                              + {g.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spreadsheet Area */}
        <Card className={cn(readonly ? "lg:col-span-3" : "lg:col-span-2")}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Itens da Planilha</CardTitle>
                <CardDescription>Informe as quantidades para cada serviço.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Estimado</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Main Items (No Group) */}
              {budgetItems.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase">Itens Gerais</div>
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="w-[120px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[80px]">Unid.</TableHead>
                        <TableHead className="w-[120px] text-right">Quantidade</TableHead>
                        <TableHead className="w-[120px] text-right">Unitário</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetItems.map((item, idx) => {
                        const s = services.find(serv => serv.id === item.serviceId);
                        if (!s) return null;
                        const unitCost = calculateServiceUnitCost(s, resources, services, bdi);
                        return (
                          <TableRow key={`${item.serviceId}-${idx}`}>
                            <TableCell className="font-bold text-xs text-blue-600 py-1">{s.code}</TableCell>
                            <TableCell className="text-sm py-1 max-w-[200px] truncate" title={s.name}>{s.name}</TableCell>
                            <TableCell className="text-xs text-gray-500 py-1">{s.unit}</TableCell>
                            <TableCell className="text-right py-1">
                              <Input 
                                type="number" 
                                step="0.001"
                                className="h-7 text-right font-mono text-xs" 
                                value={item.quantity ?? ''} 
                                onChange={e => updateQuantityInGroup(item.serviceId, parseFloat(e.target.value) || 0, null)}
                                readOnly={readonly}
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono py-1">{formatCurrency(unitCost)}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold py-1">{formatCurrency(unitCost * item.quantity)}</TableCell>
                            {!readonly && (
                              <TableCell className="py-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-300 hover:text-red-600"
                                  onClick={() => removeServiceFromGroup(item.serviceId, null)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Groups */}
              {budgetGroups.map(group => (
                <div key={group.id} className="rounded-lg border border-blue-100 overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2">
                      <Package className="w-3 h-3" /> {group.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-blue-800">
                        Subtotal: {formatCurrency(group.services.reduce((acc, item) => {
                          const s = services.find(serv => serv.id === item.serviceId);
                          return acc + (s ? calculateServiceUnitCost(s, resources, services) * item.quantity : 0);
                        }, 0))}
                      </span>
                      {!readonly && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-blue-300 hover:text-red-600"
                          onClick={() => removeGroup(group.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      {group.services.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-xs text-gray-400 italic">
                            Nenhum serviço neste grupo. Adicione serviços usando os botões ao lado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        group.services.map((item, idx) => {
                          const s = services.find(serv => serv.id === item.serviceId);
                          if (!s) return null;
                          const unitCost = calculateServiceUnitCost(s, resources, services, bdi);
                          return (
                            <TableRow key={`${item.serviceId}-${idx}`}>
                              <TableCell className="w-[100px] font-bold text-xs text-blue-600 py-1">{s.code}</TableCell>
                              <TableCell className="text-sm py-1 max-w-[200px] truncate" title={s.name}>{s.name}</TableCell>
                              <TableCell className="w-[60px] text-xs text-gray-500 py-1">{s.unit}</TableCell>
                              <TableCell className="w-[100px] text-right py-1">
                                <Input 
                                  type="number" 
                                  step="0.001"
                                  className="h-7 text-right font-mono text-xs" 
                                  value={item.quantity ?? ''} 
                                  onChange={e => updateQuantityInGroup(item.serviceId, parseFloat(e.target.value) || 0, group.id)}
                                  readOnly={readonly}
                                />
                              </TableCell>
                              <TableCell className="w-[100px] text-right text-xs font-mono py-1">{formatCurrency(unitCost)}</TableCell>
                              <TableCell className="w-[100px] text-right text-xs font-mono font-bold py-1">{formatCurrency(unitCost * item.quantity)}</TableCell>
                              {!readonly && (
                                <TableCell className="w-[40px] py-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-gray-300 hover:text-red-600"
                                    onClick={() => removeServiceFromGroup(item.serviceId, group.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              ))}

              {budgetItems.length === 0 && budgetGroups.length === 0 && (
                <div className="text-center py-12 text-gray-400 border rounded-lg border-dashed">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Sua planilha está vazia.</p>
                  <p className="text-xs">Crie grupos ou adicione serviços diretamente para começar.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
