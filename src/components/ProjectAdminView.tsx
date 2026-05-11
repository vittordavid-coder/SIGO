import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PurchaseQuotation, Supplier, PurchaseRequest } from '../types';
import { CheckCircle, XCircle, Eye, FileText, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';

interface ProjectAdminViewProps {
  purchaseQuotations: PurchaseQuotation[];
  setPurchaseQuotations: React.Dispatch<React.SetStateAction<PurchaseQuotation[]>>;
  suppliers: Supplier[];
  requests: PurchaseRequest[];
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
}

export function ProjectAdminView({ 
  purchaseQuotations, 
  setPurchaseQuotations, 
  suppliers,
  requests,
  setRequests
}: ProjectAdminViewProps) {
  const [activeTab, setActiveTab] = useState('solicitacoes');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<PurchaseQuotation | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const pendingQuotations = purchaseQuotations.filter(q => q.status === 'awaiting_approval');

  const mapToSnake = (obj: any) => {
    const newObj: any = {};
    for (const k in obj) {
      if (k === 'selectedSupplierId') continue;
      const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[k];
    }
    return newObj;
  };

  const handleApprove = async (id: string) => {
    if (!selectedSupplierId) {
      alert('Por favor, selecione qual fornecedor foi escolhido para esta compra.');
      return;
    }

    const quotation = purchaseQuotations.find(q => q.id === id);
    if (!quotation) return;

    // 1. Prepare Updates
    const updatedQuotations = purchaseQuotations.map(q => {
      if (q.id === id) {
        const newSuppliers = q.suppliers.map(s => 
          s.supplierId === selectedSupplierId ? { ...s, selected: true } : { ...s, selected: false }
        );
        return { ...q, status: 'approved' as const, selectedSupplierId: selectedSupplierId, suppliers: newSuppliers };
      }
      return q;
    });

    const itemIdsToUpdate = quotation.items.map(i => i.itemId);
    const requestIdsToUpdate = Array.from(new Set(quotation.items.map(i => i.requestId)));

    const updatedRequests = requests.map(req => {
      if (!requestIdsToUpdate.includes(req.id)) return req;

      const updatedItems = req.items.map(item => 
        itemIdsToUpdate.includes(item.id) ? { ...item, status: 'Compra Aprovado' as const } : item
      );

      const allDone = updatedItems.every(i => i.status !== 'Pendente' && i.status !== 'Em orçamento');

      return {
        ...req,
        items: updatedItems,
        status: allDone ? 'Compra Aprovado' : req.status
      } as PurchaseRequest;
    });

    // 2. Update Local State
    setPurchaseQuotations(updatedQuotations);
    setRequests(updatedRequests);

    // 3. Sync to Supabase
    try {
      const config = getSupabaseConfig();
      if (config.enabled) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          const qUpdate = updatedQuotations.find(q => q.id === id);
          if (qUpdate) {
            await supabase.from('purchase_quotations').upsert(mapToSnake(qUpdate));
          }
          for (const rid of requestIdsToUpdate) {
            const rUpdate = updatedRequests.find(r => r.id === rid);
            if (rUpdate) {
              await supabase.from('purchase_requests').upsert(mapToSnake(rUpdate));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync approval to supabase', err);
    }
    
    setIsDetailsOpen(false);
  };

  const handleReject = async (id: string) => {
    const quotation = purchaseQuotations.find(q => q.id === id);
    const updatedQuotations = purchaseQuotations.map(q => 
      q.id === id ? { ...q, status: 'sent' as const } : q
    );
    
    setPurchaseQuotations(updatedQuotations);

    try {
      const config = getSupabaseConfig();
      if (config.enabled) {
        const supabase = createSupabaseClient(config.url, config.key);
        if (supabase) {
          const qUpdate = updatedQuotations.find(q => q.id === id);
          if (qUpdate) {
            await supabase.from('purchase_quotations').upsert(mapToSnake(qUpdate));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync rejection to supabase', err);
    }

    setIsDetailsOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            Administrador da Obra
          </h1>
          <p className="text-gray-500 font-medium">Gestão e aprovação de solicitações da obra</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 h-12 inline-flex w-auto">
          <TabsTrigger value="solicitacoes" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Solicitações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="mt-0 outline-none">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50 pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Orçamentos para Aprovação
                </CardTitle>
                <CardDescription>
                  Visualize e aprove os orçamentos preenchidos pelo departamento de compras
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Data Envio</TableHead>
                      <TableHead className="font-bold">Itens</TableHead>
                      <TableHead className="font-bold">Participantes</TableHead>
                      <TableHead className="font-bold">Menor Valor</TableHead>
                      <TableHead className="text-right font-bold">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingQuotations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-gray-400">
                          Não há solicitações aguardando aprovação no momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingQuotations.map((q) => {
                        const supplierTotals = (q.suppliers || []).map(qs => 
                          (q.items || []).reduce((acc, item) => {
                            const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                            return acc + (item.quantity * (res?.price || 0));
                          }, 0)
                        ).filter(total => total > 0);
                        
                        const lowestTotal = supplierTotals.length > 0 ? Math.min(...supplierTotals) : 0;

                        return (
                          <TableRow key={q.id} className="hover:bg-blue-50/30 transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-gray-500">
                              COT-{q.date.replace(/-/g, '')}-{q.id.substring(0, 4).toUpperCase()}
                            </TableCell>
                            <TableCell className="text-gray-600 font-medium">
                              {q.date ? new Date(q.date).toLocaleDateString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">
                              {(q.items || []).length} itens (Ex: {q.items?.[0]?.description || '-'})
                            </TableCell>
                            <TableCell>
                              <div className="flex -space-x-2">
                                {(q.suppliers || []).map((s, idx) => (
                                  <div 
                                    key={s.supplierId} 
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black uppercase text-white shadow-sm",
                                      idx % 2 === 0 ? "bg-blue-500" : "bg-emerald-500"
                                    )}
                                    title={suppliers.find(sup => sup.id === s.supplierId)?.name || 'Fornecedor'}
                                  >
                                    {suppliers.find(sup => sup.id === s.supplierId)?.name?.[0] || '?'}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-emerald-600 font-black">
                              R$ {lowestTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { 
                                  setSelectedQuotation(q); 
                                  setSelectedSupplierId(null); 
                                  setIsDetailsOpen(true); 
                                }}
                                className="text-blue-600 hover:bg-blue-50 font-bold"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Revisar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl -mr-32 -mt-32 rounded-full"></div>
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight">Revisão de Orçamento</DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-slate-400 font-medium">
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> 
                  ID: COT-{selectedQuotation?.date.replace(/-/g, '')}-{selectedQuotation?.id.substring(0, 4).toUpperCase()}
                </span>
                <span className="flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Data: {selectedQuotation ? new Date(selectedQuotation.date).toLocaleDateString('pt-BR') : ''}</span>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-white max-h-[70vh] overflow-y-auto">
            {selectedQuotation && (
              <div className="space-y-8">
                <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-bold">Item</TableHead>
                        <TableHead className="text-center font-bold">Qtd</TableHead>
                        {selectedQuotation.suppliers?.map(qs => (
                          <TableHead key={qs.supplierId} className="text-center">
                            <div className="text-xs font-black text-blue-600 uppercase">
                              {suppliers.find(s => s.id === qs.supplierId)?.name || 'Fornecedor'}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuotation.items?.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <div className="font-bold text-gray-900">{item.description}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{item.unit}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                          {selectedQuotation.suppliers?.map(qs => {
                            const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                            return (
                              <TableCell key={qs.supplierId} className="text-center font-mono text-sm text-emerald-700 font-black">
                                R$ {(res?.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50/80 font-black">
                        <TableCell colSpan={2} className="text-right text-xs uppercase text-gray-500">Forma de Pagamento</TableCell>
                        {selectedQuotation.suppliers?.map(qs => (
                          <TableCell key={qs.supplierId} className="text-center text-xs text-blue-600">
                            {qs.paymentCondition || 'Não informada'}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="bg-slate-50 font-black">
                        <TableCell colSpan={2} className="text-right text-xs uppercase text-gray-500">Investimento Total</TableCell>
                        {selectedQuotation.suppliers?.map(qs => {
                          const total = (selectedQuotation.items || []).reduce((acc, item) => {
                            const res = (qs.responses || []).find(r => r.itemId === item.itemId);
                            return acc + (item.quantity * (res?.price || 0));
                          }, 0);
                          const isSelected = selectedSupplierId === qs.supplierId;
                          return (
                            <TableCell 
                              key={qs.supplierId} 
                              onClick={() => setSelectedSupplierId(qs.supplierId)}
                              className={cn(
                                "text-center transition-all cursor-pointer hover:bg-emerald-50 relative group",
                                isSelected ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 ring-inset" : "text-blue-800"
                              )}
                            >
                              <div className="text-base font-black">
                                R$ {(total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              {isSelected ? (
                                <div className="text-[10px] text-emerald-600 uppercase font-black mt-1 flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Selecionado
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400 uppercase font-bold mt-1 opacity-0 group-hover:opacity-100 italic">
                                  Clique para selecionar
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-14 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 font-black text-lg gap-2"
                    onClick={() => selectedQuotation && handleReject(selectedQuotation.id)}
                  >
                    <XCircle className="w-6 h-6" />
                    Reprovar Orçamento
                  </Button>
                  <div className="relative group">
                    <Button 
                      disabled={!selectedSupplierId}
                      className={cn(
                        "w-full h-14 rounded-2xl text-white font-black text-lg gap-2 shadow-xl transition-all",
                        selectedSupplierId 
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                          : "bg-gray-300 shadow-none cursor-not-allowed"
                      )}
                      onClick={() => selectedQuotation && handleApprove(selectedQuotation.id)}
                    >
                      <CheckCircle className="w-6 h-6" />
                      Aprovar e Liberar Compra
                    </Button>
                    {!selectedSupplierId && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-3 rounded-lg font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        Selecione um fornecedor na tabela acima
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
