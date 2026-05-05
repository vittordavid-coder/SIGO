import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileText, ChevronRight, Download, Printer, Package, FileSpreadsheet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Quotation, ServiceComposition, Resource } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { calculateServiceUnitCost, calculateQuotationTotal } from '../lib/calculations';
import { exportQuotationToPDF, exportQuotationsToExcel } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface QuotationViewProps {
  key?: string;
  quotations: Quotation[];
  services: ServiceComposition[];
  resources: Resource[];
  onAdd: (q: Omit<Quotation, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (q: Quotation) => void;
  companyLogo?: string;
  bdi?: number;
  readonly?: boolean;
}

export function QuotationView({ quotations, services, resources, onAdd, onDelete, onUpdate, companyLogo, bdi = 0, readonly = false }: QuotationViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const initialQuotationValue: Omit<Quotation, 'id'> = {
    sectorResponsible: 'DC - Diretoria de Construção e Obras Rodoviárias',
    requesterSector: 'DC - Diretoria de Construção e Obras Rodoviárias',
    year: new Date().getFullYear(),
    date: new Date().toLocaleDateString('pt-BR'),
    budgetName: '',
    organization: '',
    trecho: '',
    municipios: '',
    rodovias: '',
    version: '1 - 1ª Versão',
    extension: '0,000 km',
    baseDate: new Date().toLocaleDateString('pt-BR'),
    services: [],
  };

  const [newQuotation, setNewQuotation] = useState<Omit<Quotation, 'id'>>(initialQuotationValue);

  const [currentService, setCurrentService] = useState({ serviceId: '', quantity: 0 });

  const addServiceToQuotation = (isEdit: boolean = false) => {
    if (currentService.serviceId && currentService.quantity > 0) {
      if (isEdit && editingQuotation) {
        const newServices = [...editingQuotation.services];
        if (editingServiceIndex !== null) {
          newServices[editingServiceIndex] = currentService;
        } else {
          newServices.push(currentService);
        }
        setEditingQuotation({ ...editingQuotation, services: newServices });
      } else {
        const newServices = [...newQuotation.services];
        if (editingServiceIndex !== null) {
          newServices[editingServiceIndex] = currentService;
        } else {
          newServices.push(currentService);
        }
        setNewQuotation({ ...newQuotation, services: newServices });
      }
      setCurrentService({ serviceId: '', quantity: 0 });
      setEditingServiceIndex(null);
    }
  };

  const removeServiceFromQuotation = (index: number, isEdit: boolean = false) => {
    if (isEdit && editingQuotation) {
      setEditingQuotation({
        ...editingQuotation,
        services: editingQuotation.services.filter((_, i) => i !== index)
      });
    } else {
      setNewQuotation({
        ...newQuotation,
        services: newQuotation.services.filter((_, i) => i !== index)
      });
    }
    if (editingServiceIndex === index) {
      setEditingServiceIndex(null);
      setCurrentService({ serviceId: '', quantity: 0 });
    }
  };

  const editServiceInQuotation = (index: number, isEdit: boolean = false) => {
    const service = isEdit && editingQuotation ? editingQuotation.services[index] : newQuotation.services[index];
    setCurrentService(service);
    setEditingServiceIndex(index);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newQuotation);
    setIsAddOpen(false);
    setNewQuotation(initialQuotationValue);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuotation) {
      onUpdate(editingQuotation);
      setIsEditOpen(false);
      setEditingQuotation(null);
    }
  };

  const startEdit = (quotation: Quotation) => {
    setEditingQuotation({ ...initialQuotationValue, ...quotation });
    setIsEditOpen(true);
  };

  if (selectedQuotation) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedQuotation(null)} className="mb-4">
          <ChevronRight className="w-4 h-4 mr-2 rotate-180" /> Voltar para Lista
        </Button>
        <QuotationReport quotation={selectedQuotation} services={services} resources={resources} companyLogo={companyLogo} />
      </div>
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
          <h3 className="text-2xl font-bold tracking-tight">Cotações</h3>
          <p className="text-gray-500">Gere relatórios de orçamento completos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportQuotationsToExcel(quotations)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Lista (Excel)
          </Button>
          {!readonly && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Nova Cotação
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <DialogHeader>
                <DialogTitle>Criar Novo Orçamento</DialogTitle>
                <DialogDescription>Preencha os dados do cabeçalho e adicione os serviços cotados.</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome do Orçamento</Label>
                    <Input value={newQuotation.budgetName} onChange={e => setNewQuotation({...newQuotation, budgetName: e.target.value})} required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Órgão / Cliente</Label>
                    <Input value={newQuotation.organization} onChange={e => setNewQuotation({...newQuotation, organization: e.target.value})} placeholder="Ex: Prefeitura Municipal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor Responsável</Label>
                    <Input value={newQuotation.sectorResponsible} onChange={e => setNewQuotation({...newQuotation, sectorResponsible: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor Solicitante</Label>
                    <Input value={newQuotation.requesterSector} onChange={e => setNewQuotation({...newQuotation, requesterSector: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trecho</Label>
                    <Input value={newQuotation.trecho} onChange={e => setNewQuotation({...newQuotation, trecho: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Município(s)</Label>
                    <Input value={newQuotation.municipios} onChange={e => setNewQuotation({...newQuotation, municipios: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rodovia(s)</Label>
                    <Input value={newQuotation.rodovias} onChange={e => setNewQuotation({...newQuotation, rodovias: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Extensão</Label>
                    <Input value={newQuotation.extension} onChange={e => setNewQuotation({...newQuotation, extension: e.target.value})} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Adicionar Serviços ao Orçamento</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={currentService.serviceId} onValueChange={v => setCurrentService({...currentService, serviceId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Input 
                        type="number" 
                        placeholder="Qtd" 
                        step="0.001"
                        value={currentService.quantity ?? ''} 
                        onChange={e => setCurrentService({...currentService, quantity: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                    <Button type="button" variant={editingServiceIndex !== null ? "default" : "outline"} onClick={() => addServiceToQuotation(false)} className={editingServiceIndex !== null ? "bg-orange-500 hover:bg-orange-600" : ""}>
                      {editingServiceIndex !== null ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newQuotation.services.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs text-gray-400 py-4">Nenhum serviço adicionado.</TableCell>
                          </TableRow>
                        ) : (
                          newQuotation.services.map((qs, idx) => {
                            const s = services.find(serv => serv.id === qs.serviceId);
                            if (!s) return null;
                            const unitCost = calculateServiceUnitCost(s, resources, services);
                            return (
                              <TableRow key={idx} className={editingServiceIndex === idx ? "bg-orange-50" : ""}>
                                <TableCell className="text-xs max-w-[200px] truncate" title={s.name}>{s.name}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatNumber(qs.quantity, 3)}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatCurrency(unitCost)}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{formatCurrency(unitCost * qs.quantity)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400" onClick={() => editServiceInQuotation(idx, false)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeServiceFromQuotation(idx, false)}>
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full">Gerar Orçamento</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
            {editingQuotation && (
              <form onSubmit={handleEditSubmit} className="flex flex-col h-full overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Editar Orçamento</DialogTitle>
                  <DialogDescription>Atualize os dados e serviços deste orçamento.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Nome do Orçamento</Label>
                      <Input value={editingQuotation.budgetName} onChange={e => setEditingQuotation({...editingQuotation, budgetName: e.target.value})} required />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Órgão / Cliente</Label>
                      <Input value={editingQuotation.organization} onChange={e => setEditingQuotation({...editingQuotation, organization: e.target.value})} placeholder="Ex: Prefeitura Municipal" />
                    </div>
                    <div className="space-y-2">
                      <Label>Setor Responsável</Label>
                      <Input value={editingQuotation.sectorResponsible} onChange={e => setEditingQuotation({...editingQuotation, sectorResponsible: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Setor Solicitante</Label>
                      <Input value={editingQuotation.requesterSector} onChange={e => setEditingQuotation({...editingQuotation, requesterSector: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Trecho</Label>
                      <Input value={editingQuotation.trecho} onChange={e => setEditingQuotation({...editingQuotation, trecho: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Município(s)</Label>
                      <Input value={editingQuotation.municipios} onChange={e => setEditingQuotation({...editingQuotation, municipios: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rodovia(s)</Label>
                      <Input value={editingQuotation.rodovias} onChange={e => setEditingQuotation({...editingQuotation, rodovias: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Extensão</Label>
                      <Input value={editingQuotation.extension} onChange={e => setEditingQuotation({...editingQuotation, extension: e.target.value})} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Serviços no Orçamento</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={currentService.serviceId} onValueChange={v => setCurrentService({...currentService, serviceId: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Input 
                          type="number" 
                          placeholder="Qtd" 
                          step="0.001"
                          value={currentService.quantity ?? ''} 
                          onChange={e => setCurrentService({...currentService, quantity: parseFloat(e.target.value) || 0})} 
                        />
                      </div>
                      <Button type="button" variant={editingServiceIndex !== null ? "default" : "outline"} onClick={() => addServiceToQuotation(true)} className={editingServiceIndex !== null ? "bg-orange-500 hover:bg-orange-600" : ""}>
                        {editingServiceIndex !== null ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serviço</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-right">Custo Unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingQuotation.services.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-xs text-gray-400 py-4">Nenhum serviço adicionado.</TableCell>
                            </TableRow>
                          ) : (
                            editingQuotation.services.map((qs, idx) => {
                              const s = services.find(serv => serv.id === qs.serviceId);
                              if (!s) return null;
                              const unitCost = calculateServiceUnitCost(s, resources, services, bdi);
                              return (
                                <TableRow key={idx} className={editingServiceIndex === idx ? "bg-orange-50" : ""}>
                                  <TableCell className="text-xs py-1 max-w-[300px] truncate" title={s.name}>{s.name}</TableCell>
                                  <TableCell className="text-right text-xs font-mono py-1">{formatNumber(qs.quantity, 3)}</TableCell>
                                  <TableCell className="text-right text-xs font-mono py-1">{formatCurrency(unitCost)}</TableCell>
                                  <TableCell className="text-right text-xs font-mono py-1">{formatCurrency(unitCost * qs.quantity)}</TableCell>
                                  <TableCell className="py-1">
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400" onClick={() => editServiceInQuotation(idx, true)}>
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeServiceFromQuotation(idx, true)}>
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
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full">Atualizar Orçamento</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotations.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">Nenhuma cotação realizada.</CardContent>
          </Card>
        ) : (
          quotations.map(q => (
            <Card key={q.id} className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedQuotation(q)}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{q.budgetName}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500">Data: <span className="text-gray-900 font-medium">{q.date}</span></span>
                      <span className="text-sm text-gray-500">Serviços: <span className="text-gray-900 font-medium">{q.services.length}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Valor Total</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(calculateQuotationTotal(q, services, resources))}</p>
                  </div>
                  {!readonly && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); startEdit(q); }}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
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

function QuotationReport({ quotation, services, resources, companyLogo }: { 
  quotation: Quotation, 
  services: ServiceComposition[], 
  resources: Resource[],
  companyLogo?: string 
}) {
  return (
    <div className="bg-white shadow-lg max-w-[1000px] mx-auto p-12 space-y-8 print:shadow-none print:p-0">
      {/* Header */}
      <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-start">
        <div className="flex items-center gap-4">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-12 object-contain" />
          ) : (
            <div className="bg-blue-600 text-white px-3 py-2 font-bold text-lg rounded whitespace-nowrap">
              {quotation.organization || 'SIGO SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight">SIGO SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS</h1>
            <p className="text-sm text-gray-600">Planilha Orçamentária</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>{quotation.date}</p>
          <p>Página: 1 de 1</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Setor responsável:</span> <span>{quotation.sectorResponsible}</span></div>
        <div className="text-right font-bold">Valores expressos em Reais (R$)</div>
        
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Setor solicitante:</span> <span>{quotation.requesterSector}</span></div>
        <div className="text-right"><span className="font-bold">Data orçamento:</span> {quotation.date}</div>
        
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Ano:</span> <span>{quotation.year}</span></div>
        <div className="text-right">Região Central</div>

        <div className="flex gap-2 col-span-2"><span className="font-bold min-w-[140px]">Orçamento:</span> <span>{quotation.budgetName}</span></div>
        
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Trecho:</span> <span>{quotation.trecho}</span></div>
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Município(s):</span> <span>{quotation.municipios}</span></div>
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Rodovia(s):</span> <span>{quotation.rodovias}</span></div>
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Versão:</span> <span>{quotation.version}</span></div>
        <div className="flex gap-2"><span className="font-bold min-w-[140px]">Extensão:</span> <span>{quotation.extension}</span></div>
        <div className="text-right"><span className="font-bold">Data base:</span> {quotation.baseDate}</div>
      </div>

      {/* Services Summary Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px] text-[10px] font-bold uppercase">Código</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Descrição do Serviço</TableHead>
              <TableHead className="w-[60px] text-[10px] font-bold uppercase text-center">Unid.</TableHead>
              <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase">Quantidade</TableHead>
              <TableHead className="w-[120px] text-right text-[10px] font-bold uppercase">Unitário (R$)</TableHead>
              <TableHead className="w-[120px] text-right text-[10px] font-bold uppercase">Total (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Main Services */}
            {quotation.services.map((qs, idx) => {
              const s = services.find(serv => serv.id === qs.serviceId);
              if (!s) return null;
              const unitCost = calculateServiceUnitCost(s, resources, services);
              return (
                <TableRow key={`main-${idx}`} className="hover:bg-transparent h-10">
                  <TableCell className="text-[11px] font-bold text-blue-600">{s.code}</TableCell>
                  <TableCell className="text-[11px] max-w-[250px] truncate" title={s.name}>{s.name}</TableCell>
                  <TableCell className="text-[11px] text-center">{s.unit}</TableCell>
                  <TableCell className="text-right text-[11px] font-mono">{formatNumber(qs.quantity, 3)}</TableCell>
                  <TableCell className="text-right text-[11px] font-mono">{formatCurrency(unitCost)}</TableCell>
                  <TableCell className="text-right text-[11px] font-mono font-bold">{formatCurrency(unitCost * qs.quantity)}</TableCell>
                </TableRow>
              );
            })}

            {/* Groups */}
            {quotation.groups?.map((group) => (
              <React.Fragment key={group.id}>
                <TableRow className="bg-gray-100/50">
                  <TableCell colSpan={5} className="text-[11px] font-bold uppercase py-1 px-4">{group.name}</TableCell>
                  <TableCell className="text-right text-[11px] font-bold py-1 px-4">
                    {formatCurrency(group.services.reduce((acc, item) => {
                      const s = services.find(serv => serv.id === item.serviceId);
                      return acc + (s ? calculateServiceUnitCost(s, resources, services) * item.quantity : 0);
                    }, 0))}
                  </TableCell>
                </TableRow>
                {group.services.map((gs, idx) => {
                  const s = services.find(serv => serv.id === gs.serviceId);
                  if (!s) return null;
                  const unitCost = calculateServiceUnitCost(s, resources, services);
                  return (
                    <TableRow key={`${group.id}-${idx}`} className="hover:bg-transparent h-10">
                      <TableCell className="text-[11px] font-bold text-blue-600 pl-6">{s.code}</TableCell>
                      <TableCell className="text-[11px] max-w-[250px] truncate" title={s.name}>{s.name}</TableCell>
                      <TableCell className="text-[11px] text-center">{s.unit}</TableCell>
                      <TableCell className="text-right text-[11px] font-mono">{formatNumber(gs.quantity, 3)}</TableCell>
                      <TableCell className="text-right text-[11px] font-mono">{formatCurrency(unitCost)}</TableCell>
                      <TableCell className="text-right text-[11px] font-mono font-bold">{formatCurrency(unitCost * gs.quantity)}</TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total Summary */}
      <div className="flex justify-end">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg min-w-[250px]">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-gray-500">Total de Itens</span>
            <span className="font-bold text-sm">{quotation.services.length + (quotation.groups?.reduce((acc, g) => acc + g.services.length, 0) || 0)}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Geral</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(calculateQuotationTotal(quotation, services, resources))}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-12 flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-widest">
        <span className="font-semibold uppercase text-[10px]">SIGO SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS</span>
        <span className="font-semibold uppercase text-[10px]">{quotation.organization || 'SIGO SISTEMA INTEGRADO DE GERENCIAMENTO DE OBRAS'}</span>
      </div>

      <div className="flex justify-end gap-4 print:hidden">
        <Button variant="outline" onClick={() => exportQuotationToPDF(quotation, services, resources, companyLogo)}>
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Relatório
        </Button>
      </div>
    </div>
  );
}
