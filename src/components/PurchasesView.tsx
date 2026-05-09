import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Building2, 
  ShoppingCart, 
  Truck, 
  Star,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Printer,
  FileText,
  Send,
  CheckSquare,
  Package,
  Filter,
  Download
} from 'lucide-react';
import { applyPhoneMask, applyCEPMask, cn, hashPassword } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { PurchaseOrderItem, PaymentCondition, PurchaseOrder, Supplier, Contract, PurchaseRequest, PurchaseQuotation, SupplierEvaluation, EquipmentMaintenance } from '../types';

interface PurchasesViewProps {
  suppliers: Supplier[];
  setSuppliers: (val: Supplier[]) => void;
  orders: PurchaseOrder[];
  setOrders: (val: PurchaseOrder[]) => void;
  requests: PurchaseRequest[];
  setRequests: (val: PurchaseRequest[]) => void;
  purchaseQuotations: PurchaseQuotation[];
  setPurchaseQuotations: (val: PurchaseQuotation[]) => void;
  compId?: string;
  contracts: Contract[];
  equipments?: any[];
  initialTab?: 'requests' | 'suppliers' | 'orders' | 'tracking' | 'evaluation';
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
  defaultOrganization?: string;
  equipmentMaintenance?: EquipmentMaintenance[];
  onUpdateMaintenance?: (val: EquipmentMaintenance[]) => void;
}

export default function PurchasesView({ 
  suppliers, 
  setSuppliers, 
  orders, 
  setOrders, 
  requests,
  setRequests,
  purchaseQuotations,
  setPurchaseQuotations,
  compId, 
  contracts, 
  equipments = [],
  initialTab,
  companyLogo,
  companyLogoRight,
  logoMode,
  defaultOrganization,
  equipmentMaintenance = [],
  onUpdateMaintenance
}: PurchasesViewProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'suppliers' | 'quotations' | 'orders' | 'tracking' | 'evaluation'>(initialTab || 'requests');
  const [selectedContractId, setSelectedContractId] = useState<string>(contracts[0]?.id || 'all');
  
  // Ensure selectedContractId is valid when contracts change
  React.useEffect(() => {
    if (selectedContractId !== 'all' && contracts.length > 0 && !contracts.some(c => c.id === selectedContractId)) {
      setSelectedContractId(contracts[0]?.id || 'all');
    }
  }, [contracts, selectedContractId]);

  // Shared Order Dialog State
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<PurchaseOrder>>({});

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            Compras e Suprimentos
          </h1>
          <p className="text-gray-500 font-medium">Gestão de fornecedores, pedidos, entregas e avaliações.</p>
        </div>

        <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-2xl border border-blue-100">
          <Building2 className="w-5 h-5 text-blue-600 ml-2" />
          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Selecionar Obra / Contrato</Label>
            <Select value={selectedContractId} onValueChange={setSelectedContractId}>
              <SelectTrigger className="w-[450px] h-10 bg-white border-blue-200 rounded-xl font-bold text-blue-900 ring-offset-blue-50">
                <SelectValue placeholder="Selecione a obra...">
                  {selectedContractId === 'all' 
                    ? 'Todas as Obras' 
                    : (() => {
                        const c = contracts.find(curr => curr.id === selectedContractId);
                        if (!c) return null;
                        return c.workName ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ''}` : (c.contractNumber || c.client || 'Obra sem nome');
                      })()
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-blue-100">
                <SelectItem value="all" className="font-bold">Todas as Obras</SelectItem>
                {contracts.map(c => {
                  const label = c.workName ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ''}` : (c.contractNumber || c.client || 'Obra sem nome');
                  return (
                    <SelectItem key={c.id} value={c.id} textValue={label} className="font-medium">
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-[1200px] bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="requests" className="rounded-lg font-bold text-xs sm:text-sm">Solicitações</TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-lg font-bold text-xs sm:text-sm">Fornecedores</TabsTrigger>
          <TabsTrigger value="quotations" className="rounded-lg font-bold text-xs sm:text-sm">Orçamentos</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg font-bold text-xs sm:text-sm">Ordens de Compra</TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-lg font-bold text-xs sm:text-sm">Acompanhamento</TabsTrigger>
          <TabsTrigger value="evaluation" className="rounded-lg font-bold text-xs sm:text-sm">Avaliação</TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="requests" className="mt-0 outline-none">
                <RequestsTab 
                  requests={selectedContractId === 'all' ? requests : requests.filter(r => r.contractId === selectedContractId)} 
                  setRequests={setRequests} 
                  suppliers={suppliers} 
                  purchaseQuotations={purchaseQuotations}
                  setPurchaseQuotations={setPurchaseQuotations}
                  orders={orders}
                  setOrders={setOrders}
                  compId={compId}
                  selectedContractId={selectedContractId}
                  contracts={contracts}
                  setActiveTab={setActiveTab}
                  setSelectedQuotationId={(id) => {
                    // Logic to find and open the quotation could go here or in QuotationsTab
                  }}
                />
              </TabsContent>
              <TabsContent value="suppliers" className="mt-0 outline-none">
                <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} compId={compId} contracts={contracts} />
              </TabsContent>
              <TabsContent value="quotations" className="mt-0 outline-none">
                <QuotationsTab 
                  purchaseQuotations={selectedContractId === 'all' ? purchaseQuotations : purchaseQuotations.filter(q => {
                    const req = requests.find(r => r.id === q.items[0]?.requestId);
                    return req?.contractId === selectedContractId;
                  })} 
                  setPurchaseQuotations={setPurchaseQuotations} 
                  suppliers={suppliers}
                  orders={orders}
                  setOrders={setOrders}
                  requests={requests}
                  setRequests={setRequests}
                  compId={compId}
                  onOpenOrderDialog={(order) => {
                    setCurrentOrder(order);
                    setIsOrderDialogOpen(true);
                    setActiveTab('orders');
                  }}
                />
              </TabsContent>
              <TabsContent value="orders" className="mt-0 outline-none">
                <OrdersTab 
                  suppliers={suppliers} 
                  orders={selectedContractId === 'all' ? orders : orders.filter(o => o.contractId === selectedContractId)} 
                  setOrders={setOrders} 
                  contracts={contracts}
                  isDialogOpen={isOrderDialogOpen}
                  setIsDialogOpen={setIsOrderDialogOpen}
                  currentOrder={currentOrder}
                  setCurrentOrder={setCurrentOrder}
                  requests={requests}
                  setRequests={setRequests}
                  purchaseQuotations={purchaseQuotations}
                  setPurchaseQuotations={setPurchaseQuotations}
                  selectedContractId={selectedContractId}
                  companyLogo={companyLogo}
                  companyLogoRight={companyLogoRight}
                  logoMode={logoMode}
                  defaultOrganization={defaultOrganization}
                />
              </TabsContent>
              <TabsContent value="tracking" className="mt-0 outline-none">
                <TrackingTab 
                  orders={orders} 
                  setOrders={setOrders} 
                  equipmentMaintenance={equipmentMaintenance}
                  onUpdateMaintenance={onUpdateMaintenance}
                />
              </TabsContent>
              <TabsContent value="evaluation" className="mt-0 outline-none">
                <EvaluationTab suppliers={suppliers} orders={orders} />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

function RequestsTab({ 
  requests, 
  setRequests, 
  suppliers, 
  purchaseQuotations, 
  setPurchaseQuotations,
  orders,
  setOrders,
  compId,
  selectedContractId,
  contracts,
  setSelectedQuotationId,
  setActiveTab
}: { 
  requests: PurchaseRequest[], 
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>,
  suppliers: Supplier[],
  purchaseQuotations: PurchaseQuotation[],
  setPurchaseQuotations: React.Dispatch<React.SetStateAction<PurchaseQuotation[]>>,
  orders: PurchaseOrder[],
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>,
  compId?: string,
  selectedContractId: string,
  contracts: Contract[];
  setSelectedQuotationId: (id: string | null) => void;
  setActiveTab: (tab: any) => void;
}) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Partial<PurchaseRequest>>({
    items: []
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Flatten requests into items for display
  const allItems = requests.flatMap(req => 
    req.items.map(item => ({
      ...item,
      requestId: req.id,
      requestDate: req.date,
      requestDescription: req.description,
      requestCategory: req.category,
      requestSector: req.sector,
      displayStatus: item.status || req.status
    }))
  ).filter(item => item.displayStatus !== 'Cancelado' && item.displayStatus !== 'Recebido');

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllItems = () => {
    if (selectedItemIds.length === allItems.length && allItems.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allItems.map(i => i.id));
    }
  };

  const openNewRequest = () => {
    setCurrentRequest({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      contractId: selectedContractId !== 'all' ? selectedContractId : undefined,
      items: []
    });
    setIsRequestDialogOpen(true);
  };

  const handleSaveRequest = () => {
    let newRequests: PurchaseRequest[];
    if (requests.find(r => r.id === currentRequest.id)) {
      newRequests = requests.map(r => r.id === currentRequest.id ? currentRequest as PurchaseRequest : r);
    } else {
      newRequests = [...requests, { ...currentRequest, id: currentRequest.id || uuidv4(), companyId: compId } as PurchaseRequest];
    }
    setRequests(newRequests);
    setIsRequestDialogOpen(false);
  };

  const handleGenerateQuotation = () => {
    setIsQuotationDialogOpen(true);
  };

  const handleSendQuotation = () => {
    if (selectedSuppliers.length === 0) {
      alert('Selecione pelo menos um fornecedor.');
      return;
    }
    if (selectedSuppliers.length > 5) {
      alert('Selecione no máximo 5 fornecedores.');
      return;
    }

    const selectedItemsData = allItems.filter(i => selectedItemIds.includes(i.id));

    const newQuotation: PurchaseQuotation = {
      id: uuidv4(),
      companyId: compId,
      items: selectedItemsData.map(i => ({
        requestId: i.requestId,
        itemId: i.id,
        equipmentId: requests.find(r => r.id === i.requestId)?.equipmentId,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit
      })),
      date: new Date().toISOString().split('T')[0],
      suppliers: selectedSuppliers.map(sId => ({
        supplierId: sId,
        status: 'sent',
        responses: selectedItemsData.map(i => ({
          itemId: i.id,
          price: 0
        }))
      })),
      status: 'sent'
    };

    setPurchaseQuotations([...purchaseQuotations, newQuotation]);
    
    // Update status of involved items
    const updatedRequests = requests.map(r => {
      const itemsToUpdate = selectedItemsData.filter(i => i.requestId === r.id);
      if (itemsToUpdate.length === 0) return r;

      const updatedItems = r.items.map(item => 
        selectedItemIds.includes(item.id) ? { ...item, status: 'Em orçamento' as const } : item
      );

      // Update request status if all items are at least 'Em orçamento'
      const allItemsInQuotation = updatedItems.every(i => i.status && i.status !== 'Pendente' && i.status !== 'Cancelado');
      
      return { 
        ...r, 
        items: updatedItems,
        status: allItemsInQuotation ? 'Em orçamento' : (r.status as any)
      };
    });
    
    setRequests(updatedRequests);

    alert('Orçamento enviado com sucesso para os fornecedores selecionados!');
    setIsQuotationDialogOpen(false);
    setSelectedItemIds([]);
    setSelectedSuppliers([]);
  };

  const addItemInput = () => {
    setCurrentRequest({
      ...currentRequest,
      items: [...(currentRequest.items || []), { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un' }]
    });
  };

  return (
    <Card className="border-[10px] border-white shadow-xl rounded-3xl">
      <CardHeader className="border-b border-gray-50 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Solicitações de Compra
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Gerencie os itens solicitados para cotação e compra
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {selectedItemIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button 
                    onClick={handleGenerateQuotation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" /> Gerar Orçamento
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Button onClick={openNewRequest} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200">
              <Plus className="w-4 h-4 mr-2" /> Nova Solicitação
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedItemIds.length === allItems.length && allItems.length > 0}
                  onCheckedChange={handleSelectAllItems}
                />
              </TableHead>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Item / Solicitação</TableHead>
              <TableHead>Qtd / Un</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-gray-500 font-medium">
                  Nenhum item pendente para cotação.
                </TableCell>
              </TableRow>
            ) : (
              allItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-blue-50/30">
                  <TableCell>
                    <Checkbox 
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => handleToggleSelectItem(item.id)}
                    />
                  </TableCell>
                  <TableCell className="text-gray-600 text-xs">
                    {new Date(item.requestDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-900 leading-tight">{item.description}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.requestDescription}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-blue-600">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] uppercase border border-blue-200 rounded font-bold">
                      {item.requestCategory}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 text-xs">{item.requestSector}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset",
                      item.displayStatus === 'Cancelado' ? "bg-red-50 text-red-700 ring-red-600/20" :
                      item.displayStatus === 'Pendente' ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                      item.displayStatus === 'Em orçamento' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                      item.displayStatus === 'Compra Aprovado' ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20" :
                      item.displayStatus === 'Comprado' ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                      item.displayStatus === 'Recebido' ? "bg-gray-50 text-gray-700 ring-gray-600/20" :
                      "bg-gray-50 text-gray-700 ring-gray-600/20"
                    )}>
                      {item.displayStatus === 'Cancelado' ? 'Cancelado' : 
                       item.displayStatus === 'Pendente' ? 'Pendente' :
                       item.displayStatus === 'Em orçamento' ? 'Em orçamento' :
                       item.displayStatus === 'Compra Aprovado' ? 'Compra Aprovado' :
                       item.displayStatus === 'Comprado' ? 'Comprado' :
                       item.displayStatus === 'Recebido' ? 'Recebido' : item.displayStatus}
                    </span>
                  </TableCell>
                          <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {item.displayStatus === 'Compra Aprovado' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Ver Orçamento Aprovado"
                          onClick={() => {
                            const q = purchaseQuotations.find(quot => 
                              quot.status === 'approved' && 
                              quot.items.some(qi => qi.itemId === item.id)
                            );
                            if (q) {
                              setActiveTab('quotations');
                              // We'll use a hacky way to trigger opening the dialog by setting a state
                              // But since we can't easily pass it deep down without much refactoring,
                              // we'll just advise them to look in the andamento tab.
                              // Actually, I'll add a way to PurchasesView to handle this.
                            } else {
                              alert('Orçamento não encontrado ou já concluído.');
                            }
                          }} 
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { 
                          const req = requests.find(r => r.id === item.requestId);
                          if (req) {
                            setCurrentRequest(req); 
                            setIsRequestDialogOpen(true); 
                          }
                        }} 
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { 
                          if(window.confirm('Deseja excluir esta solicitação? Todos os itens deste pedido serão removidos.')) {
                            setRequests(prev => prev.filter(r => r.id !== item.requestId));
                            // Also deselect if it was selected
                            setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                          }
                        }} 
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* New/Edit Request Dialog */}
        <Modal
          isOpen={isRequestDialogOpen}
          onClose={() => setIsRequestDialogOpen(false)}
          maxWidth="2xl"
          className="p-0"
          headerClassName="hidden"
        >
          <div className="bg-blue-600 p-8 text-white relative overflow-hidden rounded-t-2xl">
            <ShoppingCart className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
            <div className="relative z-10 text-left">
              <h2 className="text-3xl font-black tracking-tight">Solicitação de Compra</h2>
              <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mt-1">Gerencie os detalhes e itens da solicitação</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Data da Solicitação</Label>
                <Input 
                  type="date" 
                  className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
                  value={currentRequest.date || ''} 
                  onChange={e => setCurrentRequest({...currentRequest, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Setor Solicitante</Label>
                <Input 
                  placeholder="Ex: Engenharia/Obra" 
                  className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
                  value={currentRequest.sector || ''} 
                  onChange={e => setCurrentRequest({...currentRequest, sector: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Descrição Geral / Motivo</Label>
              <Input 
                placeholder="Ex: Materiais para fundação" 
                className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
                value={currentRequest.description || ''} 
                onChange={e => setCurrentRequest({...currentRequest, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Obra / Contrato Vinculado</Label>
              <Select 
                value={currentRequest.contractId || (selectedContractId !== 'all' ? selectedContractId : 'none')} 
                onValueChange={v => setCurrentRequest({...currentRequest, contractId: v})}
              >
                <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold text-blue-900">
                  <SelectValue placeholder="Vincular a uma obra...">
                    {(() => {
                      const val = currentRequest.contractId || (selectedContractId !== 'all' ? selectedContractId : 'none');
                      if (val === 'none') return 'Sem vínculo específico';
                      const c = contracts.find(curr => curr.id === val);
                      if (!c) return null;
                      return c.workName ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ''}` : (c.contractNumber || c.client || 'Obra sem nome');
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-blue-100 shadow-2xl">
                  <SelectItem value="none" className="font-bold">Sem vínculo específico</SelectItem>
                  {contracts.map(c => {
                    const label = c.workName ? `${c.workName} ${c.contractNumber ? `(${c.contractNumber})` : ''}` : (c.contractNumber || c.client || 'Obra sem nome');
                    return (
                      <SelectItem key={c.id} value={c.id} textValue={label} className="font-medium">
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Categoria</Label>
                <Select 
                  value={currentRequest.category || ''}
                  onValueChange={(v) => setCurrentRequest({ ...currentRequest, category: v })}
                >
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Mão de Obra" className="font-bold">MÃO DE OBRA</SelectItem>
                    <SelectItem value="Material" className="font-bold">MATERIAL</SelectItem>
                    <SelectItem value="Equipamento" className="font-bold">EQUIPAMENTO</SelectItem>
                    <SelectItem value="Serviço" className="font-bold">SERVIÇO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Prioridade</Label>
                <Select 
                  value={currentRequest.priority || 'Normal'}
                  onValueChange={(v: any) => setCurrentRequest({ ...currentRequest, priority: v })}
                >
                  <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Urgente" className="text-red-600 font-black">URGENTE</SelectItem>
                    <SelectItem value="Alta" className="text-orange-600 font-bold">ALTA</SelectItem>
                    <SelectItem value="Normal" className="text-blue-600 font-bold">NORMAL</SelectItem>
                    <SelectItem value="Baixa" className="text-gray-600 font-bold">BAIXA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsRequestDialogOpen(false)} className="rounded-xl font-bold uppercase text-[10px] h-12 flex-1">Cancelar</Button>
            <Button onClick={handleSaveRequest} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] h-12 flex-[2] shadow-lg shadow-blue-100">
              <CheckCircle className="w-4 h-4 mr-2" /> Salvar Solicitação
            </Button>
          </DialogFooter>
        </Modal>

        {/* Quotation Dialog */}
        <Modal
          isOpen={isQuotationDialogOpen}
          onClose={() => setIsQuotationDialogOpen(false)}
          maxWidth="2xl"
          className="p-0 border-none overflow-hidden"
          headerClassName="hidden"
        >
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden rounded-t-2xl">
            <Send className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
            <div className="relative z-10 text-left">
              <h2 className="text-3xl font-black tracking-tight">Solicitação de Orçamento</h2>
              <p className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest mt-1">Selecione os fornecedores para envio de itens</p>
            </div>
          </div>
            <div className="p-6 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
                <h4 className="text-emerald-800 font-bold flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" /> Resumo do Orçamento
                </h4>
                <div className="text-sm text-emerald-700">
                  {selectedItemIds.length} item(ns) selecionado(s) para cotação.
                </div>
                {selectedItemIds.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Itens para cotação:</div>
                    <ul className="text-xs space-y-1 max-h-[150px] overflow-y-auto pr-2">
                      {allItems.filter(i => selectedItemIds.includes(i.id)).map((item, idx) => (
                        <li key={idx} className="flex justify-between border-b border-gray-50 pb-1">
                          <span>{item.description} <span className="text-[10px] text-gray-400">({item.requestDescription})</span></span>
                          <span className="font-bold whitespace-nowrap">{item.quantity} {item.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-bold text-gray-900">Selecione os Fornecedores (Máx. 3)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2">
                  {suppliers.map(supplier => (
                    <div 
                      key={supplier.id}
                      onClick={() => {
                        if (selectedSuppliers.includes(supplier.id)) {
                          setSelectedSuppliers(prev => prev.filter(id => id !== supplier.id));
                        } else if (selectedSuppliers.length < 3) {
                          setSelectedSuppliers(prev => [...prev, supplier.id]);
                        }
                      }}
                      className={cn(
                        "p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between",
                        selectedSuppliers.includes(supplier.id) 
                          ? "border-emerald-600 bg-emerald-50" 
                          : "border-gray-100 bg-gray-50 hover:border-emerald-200"
                      )}
                    >
                      <div>
                        <div className="font-bold text-gray-900">{supplier.name}</div>
                        <div className="text-xs text-gray-500">{supplier.activity}</div>
                      </div>
                      {selectedSuppliers.includes(supplier.id) && (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <div className="text-sm text-gray-500 font-medium">
                  {selectedSuppliers.length} de 3 selecionados
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setIsQuotationDialogOpen(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button 
                    disabled={selectedSuppliers.length === 0}
                    onClick={handleSendQuotation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] rounded-xl h-11 px-8 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4 mr-2" /> Enviar Cotação Agora
                  </Button>
                </div>
              </div>
            </div>
        </Modal>
      </CardContent>
    </Card>
  );
}

function SuppliersTab({ suppliers, setSuppliers, compId, contracts }: { suppliers: Supplier[], setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>, compId?: string, contracts: Contract[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({
    assignedContractIds: []
  });
  const [groupByObra, setGroupByObra] = useState(true);

  const handleSave = () => {
    if (currentSupplier.id) {
      setSuppliers(suppliers.map(s => s.id === currentSupplier.id ? { ...s, ...currentSupplier } as Supplier : s));
    } else {
      setSuppliers([...suppliers, { ...currentSupplier, id: uuidv4(), companyId: compId } as Supplier]);
    }
    setIsDialogOpen(false);
    setCurrentSupplier({});
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const openEdit = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setCurrentSupplier({ registrationNumber: (suppliers.length + 1).toString() });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 px-4">
        <Button 
          variant={groupByObra ? "default" : "outline"} 
          onClick={() => setGroupByObra(true)}
          className={cn("rounded-xl font-bold", groupByObra && "bg-blue-600")}
        >
          Agrupar por Obra
        </Button>
        <Button 
          variant={!groupByObra ? "default" : "outline"} 
          onClick={() => setGroupByObra(false)}
          className={cn("rounded-xl font-bold", !groupByObra && "bg-blue-600")}
        >
          Lista Geral
        </Button>
      </div>

      {!groupByObra ? (
        <Card className="border-[10px] border-white shadow-xl rounded-3xl">
          <CardHeader className="border-b border-gray-50 pb-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  Todos os Fornecedores
                </CardTitle>
                <CardDescription className="text-gray-500 mt-1">
                  Lista completa de fornecedores da empresa
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200">
                  <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <SupplierTable 
              suppliers={suppliers} 
              onEdit={openEdit} 
              onDelete={handleDelete} 
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {contracts.map(contract => {
            const contractSuppliers = suppliers.filter(s => s.assignedContractIds?.includes(contract.id));
            if (contractSuppliers.length === 0) return null;
            
            return (
              <Card key={contract.id} className="border-[10px] border-white shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-blue-50/50 border-b border-gray-100 py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black text-blue-900 flex items-center gap-2">
                      <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      Obra: {contract.workName || contract.contractNumber || contract.client || 'Obra sem nome'}
                    </CardTitle>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                      {contractSuppliers.length} Fornecedores
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <SupplierTable 
                    suppliers={contractSuppliers} 
                    onEdit={openEdit} 
                    onDelete={handleDelete} 
                  />
                </CardContent>
              </Card>
            );
          })}
          
          {/* Unassigned Suppliers */}
          {suppliers.filter(s => !s.assignedContractIds || s.assignedContractIds.length === 0).length > 0 && (
            <Card className="border-[10px] border-white shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-black text-gray-700 flex items-center gap-2">
                    <div className="p-2 bg-gray-400 text-white rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                    Fornecedores Gerais (Sem Obra)
                  </CardTitle>
                  <span className="text-xs font-bold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                    {suppliers.filter(s => !s.assignedContractIds || s.assignedContractIds.length === 0).length} Fornecedores
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <SupplierTable 
                  suppliers={suppliers.filter(s => !s.assignedContractIds || s.assignedContractIds.length === 0)} 
                  onEdit={openEdit} 
                  onDelete={handleDelete} 
                />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center py-4">
             <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-2xl shadow-xl font-bold flex items-center gap-3">
               <Plus className="w-5 h-5" /> Cadastrar Novo Fornecedor
             </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="3xl"
        className="p-0 border-none overflow-hidden"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden rounded-t-2xl">
          <Building2 className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <h2 className="text-3xl font-black tracking-tight">{currentSupplier.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mt-1">
              {currentSupplier.id ? 'Atualize os dados cadastrais da empresa' : 'Preencha os dados do novo fornecedor para o sistema'}
            </p>
          </div>
        </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Cadastro n° / Código</Label>
                  <div className="flex gap-2">
                    <Input 
                      className="w-24 bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                      placeholder="N°"
                      value={currentSupplier.registrationNumber || ''} 
                      onChange={e => setCurrentSupplier({...currentSupplier, registrationNumber: e.target.value})}
                    />
                    <Input 
                      className="flex-1 bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                      placeholder="Cód. Fornecedor"
                      value={currentSupplier.supplierCode || ''} 
                      onChange={e => setCurrentSupplier({...currentSupplier, supplierCode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Empresa ou Pessoa</Label>
                  <Input 
                    className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                    placeholder="Razão Social / Nome"
                    value={currentSupplier.name || ''} 
                    onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Atividade</Label>
                  <Input 
                    className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                    placeholder="Ramo de atividade"
                    value={currentSupplier.activity || ''} 
                    onChange={e => setCurrentSupplier({...currentSupplier, activity: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Contato / Representante</Label>
                  <Input 
                    className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                    placeholder="Nome do contato"
                    value={currentSupplier.contact || ''} 
                    onChange={e => setCurrentSupplier({...currentSupplier, contact: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Telefones</Label>
                  <div className="flex gap-2">
                    <Input 
                      className="flex-1 bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                      placeholder="Telefone Fixo"
                      value={currentSupplier.phone || ''} 
                      onChange={e => setCurrentSupplier({...currentSupplier, phone: applyPhoneMask(e.target.value)})}
                    />
                    <Input 
                      className="flex-1 bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                      placeholder="Celular / WhatsApp"
                      value={currentSupplier.mobile || ''} 
                      onChange={e => setCurrentSupplier({...currentSupplier, mobile: applyPhoneMask(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Vincular às Obras (Pode ser compartilhado)</Label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-[150px] overflow-y-auto">
                    {contracts.map(contract => (
                      <div key={contract.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`contract-${contract.id}`} 
                          checked={currentSupplier.assignedContractIds?.includes(contract.id)}
                          onCheckedChange={(checked) => {
                            const currentIds = currentSupplier.assignedContractIds || [];
                            if (checked) {
                              setCurrentSupplier({...currentSupplier, assignedContractIds: [...currentIds, contract.id]});
                            } else {
                              setCurrentSupplier({...currentSupplier, assignedContractIds: currentIds.filter(id => id !== contract.id)});
                            }
                          }}
                        />
                        <label htmlFor={`contract-${contract.id}`} className="text-xs font-medium text-gray-600 cursor-pointer truncate">
                          {contract.workName || contract.contractNumber || contract.client || 'Obra sem nome'}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 italic">* Fornecedores sem obras vinculadas aparecerão na lista "Gerais".</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Email / Site</Label>
                  <Input 
                    className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                    placeholder="email@empresa.com.br"
                    value={currentSupplier.emailWebsite || ''} 
                    onChange={e => setCurrentSupplier({...currentSupplier, emailWebsite: e.target.value})}
                  />
                </div>

                <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Endereço
                  </h4>
                  <div className="grid grid-cols-6 gap-x-4 gap-y-4">
                    <div className="space-y-2 col-span-4">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Logradouro</Label>
                      <Input 
                        className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                        placeholder="Rua, Av, etc"
                        value={currentSupplier.address || ''} 
                        onChange={e => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bairro / Cidade</Label>
                      <Input 
                        className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                        placeholder="Bairro - Cidade"
                        value={currentSupplier.neighborhoodCity || ''} 
                        onChange={e => setCurrentSupplier({...currentSupplier, neighborhoodCity: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CEP</Label>
                      <Input 
                        className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                        placeholder="00000-000"
                        value={currentSupplier.zipCode || ''} 
                        onChange={e => setCurrentSupplier({...currentSupplier, zipCode: applyCEPMask(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2 col-span-4">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</Label>
                      <Input 
                        className="bg-gray-50 border-gray-200 focus:border-blue-500 rounded-lg" 
                        placeholder="UF"
                        value={currentSupplier.state || ''} 
                        onChange={e => setCurrentSupplier({...currentSupplier, state: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 col-span-2 mt-2 pt-4 border-t border-gray-100">
                  <Label className="text-sm font-semibold text-gray-700">Observações adicionais</Label>
                  <textarea 
                    className="w-full h-24 p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg outline-none resize-none text-sm text-gray-700"
                    placeholder="Adicione notas, histórico de relacionamento ou condições especiais..."
                    value={currentSupplier.observations || ''}
                    onChange={e => setCurrentSupplier({...currentSupplier, observations: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button 
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl px-6 font-bold uppercase text-[10px]"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="rounded-xl px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] shadow-lg shadow-blue-100 h-11 transition-all active:scale-95"
                >
                  Salvar Cadastro
                </Button>
              </div>
            </div>
      </Modal>
    </div>
  );
}

function OrdersTab({ 
  suppliers, 
  orders, 
  setOrders, 
  contracts,
  isDialogOpen,
  setIsDialogOpen,
  currentOrder,
  setCurrentOrder,
  requests,
  setRequests,
  purchaseQuotations,
  setPurchaseQuotations,
  selectedContractId,
  companyLogo,
  companyLogoRight,
  logoMode,
  defaultOrganization
}: { 
  suppliers: Supplier[], 
  orders: PurchaseOrder[], 
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>, 
  contracts: Contract[],
  isDialogOpen: boolean,
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
  currentOrder: Partial<PurchaseOrder>,
  setCurrentOrder: React.Dispatch<React.SetStateAction<Partial<PurchaseOrder>>>,
  requests: PurchaseRequest[],
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>,
  purchaseQuotations: PurchaseQuotation[],
  setPurchaseQuotations: React.Dispatch<React.SetStateAction<PurchaseQuotation[]>>,
  selectedContractId: string,
  companyLogo?: string,
  companyLogoRight?: string,
  logoMode?: 'left' | 'right' | 'both' | 'none',
  defaultOrganization?: string
}) {
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const displayOrders = orders.filter(o => o.status === 'draft' || o.status === 'approved' || o.status === 'cancelled' || o.status === 'finalizada');

  const openNew = () => {
    setCurrentOrder({
      id: uuidv4(),
      orderNumber: (orders.length + 1).toString(),
      contractId: selectedContractId !== 'all' ? selectedContractId : '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      supplierId: '',
      supplierName: '',
      phone: '',
      email: '',
      items: [],
      paymentConditions: [],
      subtotal: 0,
      discount: 0,
      additions: 0,
      total: 0,
      deliveryAddress: { street: '', number: '', complement: '', neighborhood: '', zipCode: '', city: '', state: '' },
      observations: '',
      status: 'waiting_delivery',
      category: '',
      costCenter: ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (currentOrder.id) {
      const existingOrder = orders.find(o => o.id === currentOrder.id);
      if (existingOrder?.status === 'finalizada') {
        alert("Ordens finalizadas não podem ser editadas");
        return;
      }
    }
    let newOrders: PurchaseOrder[];
    const isNew = !orders.find(o => o.id === currentOrder.id);
    const compIdSelected = contracts.find(c => c.id === currentOrder.contractId)?.companyId || (window as any).currentUser?.companyId;
    
    const orderToSave = { 
      ...currentOrder, 
      id: currentOrder.id || uuidv4(), 
      companyId: compIdSelected 
    } as PurchaseOrder;

    if (!isNew) {
      newOrders = orders.map(o => o.id === currentOrder.id ? orderToSave : o);
    } else {
      newOrders = [...orders, orderToSave];
    }
    
    setOrders(newOrders);
    
    let updatedRequests = requests;
    let updatedQuotations = purchaseQuotations;

    // If it's a new order originating from a quotation, update the quotation and requests
    if (isNew && currentOrder.originQuotationId) {
      const quotation = purchaseQuotations.find(q => q.id === currentOrder.originQuotationId);
      if (quotation) {
        // Update requests
        updatedRequests = requests.map(r => {
          const itemsInThisOrder = (currentOrder.items || []).filter(i => i.requestId === r.id);
          if (itemsInThisOrder.length === 0) return r;
          
          const updatedItems = r.items.map(item => {
            const isBoughtInThisOrder = itemsInThisOrder.some(i => i.itemId === item.id);
            return isBoughtInThisOrder ? { ...item, status: 'Comprado' as const } : item;
          });

          const allComprado = updatedItems.every(i => i.status === 'Comprado' || i.status === 'Recebido' || i.status === 'Cancelado');
          return { ...r, items: updatedItems, status: allComprado ? 'Comprado' as any : r.status };
        });
        setRequests(updatedRequests);

        // Update quotation
        updatedQuotations = purchaseQuotations.map(q => 
          q.id === currentOrder.originQuotationId ? { ...q, status: 'completed' as const } : q
        );
        setPurchaseQuotations(updatedQuotations);
      }
    }
    
    setIsDialogOpen(false);

    // Immediate Sync
    const config = (window as any).getSupabaseConfig?.();
    if (config?.enabled && compIdSelected) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.url, config.key);
        
        const mapToSnake = (obj: any) => {
          const newObj: any = { company_id: compIdSelected };
          for (const k in obj) {
            const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            newObj[snakeKey] = obj[k];
          }
          return newObj;
        };

        // Sync order
        await supabase.from('purchase_orders').upsert(mapToSnake(orderToSave));

        // Sync affected requests and quotation
        if (isNew && currentOrder.originQuotationId) {
          const qUpdate = updatedQuotations.find(q => q.id === currentOrder.originQuotationId);
          if (qUpdate) {
            await supabase.from('purchase_quotations').upsert(mapToSnake(qUpdate));
          }
          const affectedRequestIds = Array.from(new Set((currentOrder.items || []).map(i => i.requestId)));
          for (const rid of affectedRequestIds) {
            const rUpdate = updatedRequests.find(r => r.id === rid);
            if (rUpdate) {
              await supabase.from('purchase_requests').upsert(mapToSnake(rUpdate));
            }
          }
        }
      } catch (err) {
        console.warn('[OrdersTab] Immediate sync failed', err);
      }
    }

    if (isNew && orderToSave.email) {
       alert(`Ordem de compra gerada com sucesso! Uma cópia foi enviada para o fornecedor: ${orderToSave.email}`);
    } else {
       alert('Ordem de compra salva com sucesso!');
    }
  };

  const addItem = () => {
    const newItems = [...(currentOrder.items || []), {
      id: Math.random().toString(),
      code: '',
      description: '',
      unit: 'Un',
      quantity: 1,
      price: 0
    }];
    updateTotals(newItems, currentOrder.discount || 0, currentOrder.additions || 0);
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...(currentOrder.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    updateTotals(newItems, currentOrder.discount || 0, currentOrder.additions || 0);
  };

  const removeItem = (index: number) => {
    const newItems = [...(currentOrder.items || [])];
    newItems.splice(index, 1);
    updateTotals(newItems, currentOrder.discount || 0, currentOrder.additions || 0);
  };

  const addPayment = () => {
    setCurrentOrder({
      ...currentOrder,
      paymentConditions: [...(currentOrder.paymentConditions || []), {
        id: Math.random().toString(),
        condition: '',
        dueDate: '',
        value: 0,
        observation: ''
      }]
    });
  };

  const updatePayment = (index: number, field: keyof PaymentCondition, value: any) => {
    const newPayments = [...(currentOrder.paymentConditions || [])];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setCurrentOrder({ ...currentOrder, paymentConditions: newPayments });
  };
  
  const removePayment = (index: number) => {
    const newPayments = [...(currentOrder.paymentConditions || [])];
    newPayments.splice(index, 1);
    setCurrentOrder({ ...currentOrder, paymentConditions: newPayments });
  };

  const updateTotals = (items: PurchaseOrderItem[], discount: number, additions: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const total = subtotal - discount + additions;
    setCurrentOrder({ ...currentOrder, items, subtotal, discount, additions, total });
  };

  const isReadOnly = currentOrder.status === 'finalizada';

  const handlePrintIframe = () => {
    const printContents = document.getElementById('print-area')?.outerHTML;
    if (!printContents) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    if (!iframe.contentWindow) return;
    
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(n => n.outerHTML).join('\n');
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem_Compra_${currentOrder.orderNumber || 'S-N'}</title>
          ${styles}
          <style>
             @page { margin: 8mm; }
             body { 
               -webkit-print-color-adjust: exact; 
               print-color-adjust: exact; 
               background: white; 
               margin: 0;
               padding: 0;
             }
             @media print {
               #print-area { padding: 0 !important; }
               .print-compact-header { font-size: 12pt !important; }
               .print-compact-text { font-size: 7pt !important; }
               .print-table-spacing td { padding-top: 3px !important; padding-bottom: 3px !important; }
               .print-table-spacing th { padding: 4px !important; }
             }
             .print\\:border-none { border: none !important; }
             .print\\:shadow-none { box-shadow: none !important; }
             .print\\:hidden { display: none !important; }
          </style>
        </head>
        <body>
          <div style="padding: 0;">
            ${printContents}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
    
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 10000);
  };

  return (
    <>
      <Card className="border-[10px] border-white shadow-xl rounded-3xl">
        <CardHeader className="border-b border-gray-50 pb-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
              Ordens de Compra
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Geração e histórico de pedidos
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input placeholder="Buscar pedido..." className="pl-9 bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 w-64 rounded-xl" />
            </div>
            <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200">
              <Plus className="w-4 h-4 mr-2" /> Nova Ordem
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {displayOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">Nenhuma ordem de compra</h3>
            <p className="text-gray-400 max-w-sm mt-2">Gere ordens de compra para visualizar nesta seção.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="w-[100px]">Pedido</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOrders.map((order) => (
                <TableRow 
                  key={order.id} 
                  className={cn(
                    "hover:bg-emerald-50/30",
                    order.status === 'finalizada' && "opacity-60 bg-gray-50/50"
                  )}
                >
                  <TableCell className="font-medium text-gray-600">
                    {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-bold text-gray-900">
                    #{order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-800">{order.supplierName}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                     <span className={cn(
                       "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                       order.status === 'finalizada' ? "bg-gray-100 text-gray-700 ring-gray-600/20" :
                      order.status === 'draft' ? "bg-gray-50 text-gray-700 ring-gray-600/20" :
                       order.status === 'approved' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                       order.status === 'sent' ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20" :
                       order.status === 'delivered' ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                       order.status === 'waiting_delivery' ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                       "bg-red-50 text-red-700 ring-red-600/20"
                     )}>
                       {order.status === 'finalizada' ? 'Finalizada' :
                       order.status === 'draft' ? 'Rascunho' : 
                        order.status === 'approved' ? 'Aprovado' :
                        order.status === 'sent' ? 'Enviado' :
                        order.status === 'delivered' ? 'Entregue' :
                        order.status === 'waiting_delivery' ? 'Aguardando Entrega' :
                        order.status === 'cancelled' ? 'Cancelado' : order.status}
                     </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="icon" onClick={() => { setCurrentOrder(order); setIsPrintDialogOpen(true); }} className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                          <Printer className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => { setCurrentOrder(order); setIsDialogOpen(true); }} 
                         className={cn(
                           "h-8 w-8",
                           order.status === 'finalizada' ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                         )}
                         disabled={order.status === 'finalizada'}
                         title={order.status === 'finalizada' ? "Ordens finalizadas não podem ser editadas" : "Editar"}
                       >
                          <Pencil className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Print Dialog */}
        <Modal
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          maxWidth="4xl"
          className="p-0 border-none overflow-hidden"
          headerClassName="hidden"
          footer={
            <div className="flex justify-end gap-3 w-full p-4 bg-gray-50 border-t">
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)} className="rounded-xl px-6">Fechar</Button>
              <Button onClick={handlePrintIframe} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-emerald-100">
                <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
              </Button>
            </div>
          }
        >
          <div className="flex-1 overflow-y-auto w-full max-h-[70vh]">
            <div className="p-4 bg-white min-h-[11in]" id="print-area">
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-2 mb-3">
                 <div className="flex items-center gap-3">
                   {(logoMode === 'left' || logoMode === 'both') && companyLogo && (
                     <div className="w-14 h-14 bg-white rounded-lg shadow-sm flex items-center justify-center border border-blue-600 p-1 overflow-hidden print:border-none print:shadow-none">
                       <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                     </div>
                   )}
                   {(!logoMode || logoMode === 'left' || logoMode === 'both') && !companyLogo && (
                     <div className="w-14 h-14 bg-white rounded-lg shadow-sm flex items-center justify-center border border-blue-600 p-1 overflow-hidden print:border-none print:shadow-none">
                       <Building2 className="w-6 h-6 text-blue-600" />
                     </div>
                   )}
                   <div>
                     <h1 className="text-lg font-black text-slate-900 tracking-tighter leading-tight break-words max-w-[300px] print-compact-header">
                       {defaultOrganization || "CONSTRUTORA MASTER"}
                     </h1>
                     <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">Documento de Engenharia e Suprimentos</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="text-right text-[8px] text-slate-600 leading-tight">
                     <h2 className="text-lg font-black text-blue-600 mb-0.5 uppercase tracking-tight print-compact-header">Ordem de Compra</h2>
                     <div className="font-black text-slate-900 text-[9px] mb-0.5">{defaultOrganization || "CONSTRUTORA MASTER"}</div>
                     <div>Logística Integrada e Suprimentos</div>
                     <div>Documento Gerado pelo Sistema SIGO</div>
                   </div>
                   {(logoMode === 'right' || logoMode === 'both') && companyLogoRight && (
                     <div className="w-14 h-14 bg-white rounded-lg shadow-sm flex items-center justify-center border border-blue-600 p-1 overflow-hidden print:border-none print:shadow-none">
                       <img src={companyLogoRight} alt="Logo Direito" className="max-w-full max-h-full object-contain" />
                     </div>
                   )}
                 </div>
              </div>

              <div className="bg-slate-900 text-white px-3 py-1 mb-2 rounded flex justify-between items-center print:bg-slate-900 print:text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">Documento Oficial de Pedido</span>
                <span className="text-[10px] font-black">OC #{currentOrder.orderNumber}</span>
              </div>
              
              <div className="grid grid-cols-2 text-[10px] mb-3 pb-1 border-b border-gray-200 font-medium">
                <div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Pedido:</span> <span className="font-semibold">{currentOrder.orderNumber}</span></div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Fornecedor:</span> <span className="font-semibold">{currentOrder.supplierName}</span></div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Telefone:</span> {currentOrder.phone}</div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Data de:</span> {currentOrder.orderDate ? new Date(currentOrder.orderDate).toLocaleDateString('pt-BR') : ''}</div>
                </div>
                <div>
                  <div className="flex"><span className="w-24 text-right pr-2"></span></div>
                  <div className="flex"><span className="w-24 text-right pr-2"></span></div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Email:</span> {currentOrder.email}</div>
                  <div className="flex"><span className="w-24 text-right pr-2 uppercase font-bold text-gray-400">Entrega:</span> {currentOrder.deliveryDate ? new Date(currentOrder.deliveryDate).toLocaleDateString('pt-BR') : ''}</div>
                </div>
              </div>

              <div className="border-b border-black mb-0.5 text-left">
                <span className="text-[10px] font-bold">ENDEREÇO DE ENTREGA</span>
              </div>
              <div className="grid grid-cols-3 text-[10px] mb-3 pb-1 border-b border-gray-100 gap-y-0.5 text-left">
                <div className="flex"><span className="w-14 text-right pr-2 uppercase font-bold text-gray-400">Rua:</span> <span>{currentOrder.deliveryAddress?.street}</span></div>
                <div className="flex"><span className="w-14 text-right pr-2 uppercase font-bold text-gray-400">Num:</span> <span>{currentOrder.deliveryAddress?.number}</span></div>
                <div className="flex"><span className="w-18 text-right pr-2 uppercase font-bold text-gray-400">Comp:</span> <span>{currentOrder.deliveryAddress?.complement}</span></div>
                <div className="flex"><span className="w-14 text-right pr-2 uppercase font-bold text-gray-400">Bairro:</span> <span>{currentOrder.deliveryAddress?.neighborhood}</span></div>
                <div className="flex"><span className="w-14 text-right pr-2 uppercase font-bold text-gray-400">CEP:</span> <span>{currentOrder.deliveryAddress?.zipCode}</span></div>
                <div className="flex"><span className="w-18 text-right pr-2 uppercase font-bold text-gray-400">Cidade:</span> <span>{currentOrder.deliveryAddress?.city}</span></div>
                <div className="flex"><span className="w-14 text-right pr-2 uppercase font-bold text-gray-400">UF:</span> <span>{currentOrder.deliveryAddress?.state}</span></div>
              </div>

              <div className="bg-blue-600 text-white px-2 py-0.5 mb-0.5 rounded-sm print:bg-blue-600 print:text-white text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider">Itens do Pedido</span>
              </div>
              <table className="w-full text-[10px] border-collapse border border-blue-600 mb-1 leading-tight print-table-spacing">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 text-center font-bold print:bg-blue-50">
                    <th className="border border-blue-600 p-1 w-8">#</th>
                    <th className="border border-blue-600 p-1 w-12">Cod</th>
                    <th className="border border-blue-600 p-1 text-left">Desc</th>
                    <th className="border border-blue-600 p-1 w-10">Un</th>
                    <th className="border border-blue-600 p-1 w-12">Qtde</th>
                    <th className="border border-blue-600 p-1 w-18 text-right">Preço</th>
                    <th className="border border-blue-600 p-1 w-18 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrder.items?.map((item, i) => (
                    <tr key={item.id} className="even:bg-blue-50/20 leading-snug">
                      <td className="border border-blue-200 p-1.5 text-center text-[9px]">{i + 1}</td>
                      <td className="border border-blue-200 p-1.5 text-center text-[9px] font-mono">{item.code || '-'}</td>
                      <td className="border border-blue-200 p-1.5 text-[11px] font-medium text-left">{item.description}</td>
                      <td className="border border-blue-200 p-1.5 text-center text-[9px]">{item.unit}</td>
                      <td className="border border-blue-200 p-1.5 text-center font-bold text-[10px]">{item.quantity}</td>
                      <td className="border border-blue-200 p-1.5 text-right text-[10px]">R$ {item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="border border-blue-200 p-1.5 text-right font-bold text-blue-700 text-[10px]">R$ {(item.quantity * item.price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col items-end text-[10px] mb-2 pb-1">
                <div className="flex justify-between w-64 border-b border-gray-100 text-right"><span className="text-gray-500 uppercase font-bold text-[9px]">Subtotal:</span> <span>R$ {(currentOrder.subtotal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between w-64 border-b border-gray-100 text-right"><span className="text-gray-500 uppercase font-bold text-[9px]">Desconto:</span> <span>R$ {(currentOrder.discount || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between w-64 border-b border-gray-100 text-right"><span className="text-gray-500 uppercase font-bold text-[9px]">Acréscimos:</span> <span>{(currentOrder.additions || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between w-64 mt-0.5 text-blue-800 text-right"><span className="font-bold uppercase font-bold text-[9px]">TOTAL:</span> <span className="font-black text-sm text-right">R$ {(currentOrder.total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
              </div>

              <div className="bg-blue-600 text-white px-2 py-0.5 rounded-sm mt-3 print:bg-blue-600 print:text-white text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider">Condições de Pagamento</span>
              </div>
              <table className="w-full text-[9px] border-collapse border border-blue-600 mb-2 font-medium">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 text-center font-bold print:bg-blue-50">
                    <th className="border border-blue-600 p-0.5 text-left">Condições</th>
                    <th className="border border-blue-600 p-0.5 w-20">Vencimento</th>
                    <th className="border border-blue-600 p-0.5 w-24 text-right">Valor</th>
                    <th className="border border-blue-600 p-0.5 text-left">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrder.paymentConditions?.map((pay, i) => (
                    <tr key={i} className="even:bg-blue-50/20 leading-tight">
                      <td className="border border-blue-200 p-0.5 text-left">{pay.condition}</td>
                      <td className="border border-blue-200 p-0.5 text-center">{pay.dueDate ? new Date(pay.dueDate).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="border border-blue-200 p-0.5 text-right font-bold text-blue-700 text-[10px]">R$ {pay.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="border border-blue-200 p-0.5 text-[8px] italic text-left">{pay.observation || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 mt-6 mb-4 px-10">
                <div className="text-center">
                  <div className="border-t border-slate-900 pt-1.5">
                    <div className="font-black text-slate-900 text-[8px] uppercase tracking-widest">Responsável Compras</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-900 pt-1.5">
                    <div className="font-black text-slate-900 text-[8px] uppercase tracking-widest">Aprovação Diretor</div>
                  </div>
                </div>
              </div>

               <div className="mt-4 p-2 border border-dashed border-blue-200 rounded-lg bg-blue-50/30 text-left">
                 <div className="font-black text-blue-900 text-[9px] uppercase tracking-[0.1em] mb-1">Observações</div>
                 <div className="text-[9px] text-slate-700 leading-tight min-h-[40px] whitespace-pre-wrap">
                   {currentOrder.observations || "Não existem observações adicionais para este pedido."}
                 </div>
               </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          maxWidth="5xl"
          className="p-0 border-none overflow-hidden"
          headerClassName="hidden"
        >
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden rounded-t-2xl sticky top-0 z-10 shadow-md">
            <Package className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
            <div className="relative z-10 text-left">
              <h2 className="text-3xl font-black tracking-tight">Ordem de Compra</h2>
              <p className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest mt-1">Pedido nº {currentOrder.orderNumber}</p>
            </div>
          </div>

            <div className="p-6 space-y-6 bg-gray-50/30">
              
              {/* Header Info */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Contrato / Obra</Label>
                  <Select 
                    disabled={isReadOnly}
                    value={currentOrder.contractId || ''}
                    onValueChange={(v) => setCurrentOrder({ ...currentOrder, contractId: v })}
                  >
                    <SelectTrigger className="w-full bg-white border-blue-100 focus:ring-blue-500 rounded-xl text-sm h-10 font-medium text-blue-900 ring-offset-blue-50">
                      <SelectValue placeholder="Selecione o contrato...">
                        {(() => {
                           const val = currentOrder.contractId;
                           if (!val || val === 'none') return 'Sem vínculo';
                           const c = contracts.find(curr => curr.id === val);
                           if (!c) return null;
                           return `${c.workName || 'Obra sem nome'} (${c.contractNumber || 'S/N'})`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80 rounded-xl border-blue-100">
                      <SelectItem value="none" textValue="Sem vínculo">Sem vínculo</SelectItem>
                      {contracts.map(c => {
                        const label = `${c.workName || 'Obra sem nome'} - ${c.client || 'Cliente não definido'} (${c.contractNumber || 'S/N'})`;
                        return (
                          <SelectItem key={c.id} value={c.id} textValue={label}>
                            <div className="flex flex-col py-1">
                              <span className="font-bold text-blue-900">{c.workName || 'Obra sem nome'}</span>
                              <span className="text-[10px] text-gray-500">{c.client || 'Cliente não definido'} • {c.contractNumber || 'S/N'}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Fornecedor</Label>
                  <select 
                    disabled={isReadOnly}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-lg outline-none text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    value={currentOrder.supplierId || ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      const sup = suppliers.find(s => s.id === id);
                      if (sup) {
                        setCurrentOrder({...currentOrder, supplierId: id, supplierName: sup.name, phone: sup.phone || sup.mobile, email: sup.emailWebsite});
                      }
                    }}
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Categoria</Label>
                  <Select 
                    disabled={isReadOnly}
                    value={currentOrder.category || ''}
                    onValueChange={(v) => setCurrentOrder({ ...currentOrder, category: v })}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm h-10">
                      <SelectValue placeholder="Selecione ou digite..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 border-b">
                        <Input 
                          placeholder="Nova categoria..." 
                          className="h-8 text-xs" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.currentTarget as HTMLInputElement).value;
                              if (val) {
                                setCurrentOrder({ ...currentOrder, category: val });
                                (e.currentTarget as HTMLInputElement).value = '';
                                e.preventDefault();
                              }
                            }
                          }}
                        />
                      </div>
                      {Array.from(new Set([
                        'Materiais de Construção', 'Equipamentos', 'EPIs', 'Escritório', 'Serviços',
                        ...orders.map(o => o.category).filter(Boolean),
                        ...requests.map(r => r.category).filter(Boolean)
                      ])).map(cat => (
                        <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Centro de Custo</Label>
                  <Select 
                    disabled={isReadOnly}
                    value={currentOrder.costCenter || ''}
                    onValueChange={(v) => setCurrentOrder({ ...currentOrder, costCenter: v })}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm h-10">
                      <SelectValue placeholder="Selecione ou digite..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 border-b">
                        <Input 
                          placeholder="Novo centro de custo..." 
                          className="h-8 text-xs" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.currentTarget as HTMLInputElement).value;
                              if (val) {
                                setCurrentOrder({ ...currentOrder, costCenter: val });
                                (e.currentTarget as HTMLInputElement).value = '';
                                e.preventDefault();
                              }
                            }
                          }}
                        />
                      </div>
                      {Array.from(new Set([
                        'Obra Direta', 'Manutenção', 'Administrativo', 'Logística',
                        ...orders.map(o => o.costCenter).filter(Boolean)
                      ])).map(cc => (
                        <SelectItem key={cc} value={cc!}>{cc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Data do Pedido</Label>
                    <Input 
                      disabled={isReadOnly}
                      type="date"
                      className="bg-gray-50 border-gray-200 focus:border-emerald-500 rounded-lg text-sm" 
                      value={currentOrder.orderDate || ''} 
                      onChange={e => setCurrentOrder({...currentOrder, orderDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Data de Entrega</Label>
                    <Input 
                      disabled={isReadOnly}
                      type="date"
                      className="bg-gray-50 border-gray-200 focus:border-emerald-500 rounded-lg text-sm" 
                      value={currentOrder.deliveryDate || ''} 
                      onChange={e => setCurrentOrder({...currentOrder, deliveryDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Telefone</Label>
                  <Input 
                    disabled={isReadOnly}
                    className="bg-gray-50 border-gray-200 focus:border-emerald-500 rounded-lg text-sm"
                    value={currentOrder.phone || ''}
                    onChange={e => setCurrentOrder({...currentOrder, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Email</Label>
                  <Input 
                    disabled={isReadOnly}
                    className="bg-gray-50 border-gray-200 focus:border-emerald-500 rounded-lg text-sm"
                    value={currentOrder.email || ''}
                    onChange={e => setCurrentOrder({...currentOrder, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Endereço de Entrega
                  </h4>
                  <div className="grid grid-cols-6 gap-x-4 gap-y-4">
                    <div className="col-span-3 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Endereço</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.street || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, street: e.target.value}})} />
                    </div>
                    <div className="col-span-1 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Número</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.number || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, number: e.target.value}})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Complemento</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.complement || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, complement: e.target.value}})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bairro</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.neighborhood || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, neighborhood: e.target.value}})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CEP</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.zipCode || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, zipCode: applyCEPMask(e.target.value)}})} />
                    </div>
                    <div className="col-span-1 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cidade</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.city || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, city: e.target.value}})} />
                    </div>
                    <div className="col-span-1 space-y-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UF</Label>
                      <Input disabled={isReadOnly} className="bg-gray-50 border-gray-200 h-9 text-sm rounded-lg" value={currentOrder.deliveryAddress?.state || ''} onChange={e => setCurrentOrder({...currentOrder, deliveryAddress: {...currentOrder.deliveryAddress!, state: e.target.value}})} />
                    </div>
                  </div>
              </div>

              {/* Items */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    Itens do Pedido
                  </h4>
                  <Button variant="outline" size="sm" onClick={addItem} disabled={isReadOnly} className="h-8 text-xs font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                  </Button>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100/80">
                      <TableRow>
                        <TableHead className="w-[50px] font-bold text-xs text-gray-600 uppercase">Item</TableHead>
                        <TableHead className="w-[100px] font-bold text-xs text-gray-600 uppercase">Cod</TableHead>
                        <TableHead className="font-bold text-xs text-gray-600 uppercase">Descrição dos Produtos</TableHead>
                        <TableHead className="w-[80px] font-bold text-xs text-gray-600 uppercase text-center">Un</TableHead>
                        <TableHead className="w-[100px] font-bold text-xs text-gray-600 uppercase text-center">Qtde</TableHead>
                        <TableHead className="w-[120px] font-bold text-xs text-gray-600 uppercase text-right">Preço (R$)</TableHead>
                        <TableHead className="w-[120px] font-bold text-xs text-gray-600 uppercase text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrder.items?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-400 py-6">
                            Nenhum item adicionado
                          </TableCell>
                        </TableRow>
                      )}
                      {currentOrder.items?.map((item, index) => (
                        <TableRow key={item.id} className="bg-white">
                          <TableCell className="text-center text-sm font-medium text-gray-500">{index + 1}</TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} className="h-8 text-sm bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={item.code} onChange={e => updateItem(index, 'code', e.target.value)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} className="h-8 text-sm bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} className="h-8 text-sm text-center bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} type="number" className="h-8 text-sm text-center bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={item.quantity || ''} onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} type="number" className="h-8 text-sm text-right bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={item.price || ''} onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell className="p-1 text-right text-sm font-medium pr-4">
                            R$ {(item.quantity * item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="p-1 text-center">
                            <Button disabled={isReadOnly} variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" onClick={() => removeItem(index)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Totals Section */}
                <div className="flex justify-end mt-4 text-sm">
                  <div className="w-64 space-y-2">
                     <div className="flex justify-between items-center px-2">
                       <span className="text-gray-500 font-medium">Subtotal:</span>
                       <span className="font-semibold text-gray-700">R$ {(currentOrder.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between items-center px-2">
                       <span className="text-gray-500 font-medium">Desconto:</span>
                       <Input 
                         type="number" 
                         className="h-7 w-28 text-right text-sm border-gray-200" 
                         value={currentOrder.discount || ''} 
                         onChange={e => updateTotals(currentOrder.items || [], parseFloat(e.target.value) || 0, currentOrder.additions || 0)}
                       />
                     </div>
                     <div className="flex justify-between items-center px-2">
                       <span className="text-gray-500 font-medium">Acréscimos:</span>
                       <Input 
                         type="number" 
                         className="h-7 w-28 text-right text-sm border-gray-200" 
                         value={currentOrder.additions || ''} 
                         onChange={e => updateTotals(currentOrder.items || [], currentOrder.discount || 0, parseFloat(e.target.value) || 0)}
                       />
                     </div>
                     <div className="flex justify-between items-center pt-2 px-2 border-t border-gray-200">
                       <span className="text-gray-900 font-bold text-base">TOTAL:</span>
                       <span className="text-emerald-700 font-black text-lg">R$ {(currentOrder.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                  </div>
                </div>
              </div>
              
              {/* Payments */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase">
                    Forma / Condições de Pagamento
                  </h4>
                  <Button variant="outline" size="sm" onClick={addPayment} disabled={isReadOnly} className="h-8 text-xs font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Parcela
                  </Button>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100/80">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-gray-600 uppercase">Condições de Pagamento</TableHead>
                        <TableHead className="w-[150px] font-bold text-xs text-gray-600 uppercase">Vencimento</TableHead>
                        <TableHead className="w-[150px] font-bold text-xs text-gray-600 uppercase text-right">Valor</TableHead>
                        <TableHead className="font-bold text-xs text-gray-600 uppercase">Observação</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrder.paymentConditions?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-4 text-sm">
                            Nenhuma condição informada
                          </TableCell>
                        </TableRow>
                      )}
                      {currentOrder.paymentConditions?.map((pay, index) => (
                        <TableRow key={index} className="bg-white">
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} className="h-8 text-sm bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={pay.condition} onChange={e => updatePayment(index, 'condition', e.target.value)} placeholder="Ex: DINHEIRO (À VISTA) [1 / 1]" />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} type="date" className="h-8 text-sm bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={pay.dueDate} onChange={e => updatePayment(index, 'dueDate', e.target.value)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} type="number" className="h-8 text-sm text-right bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={pay.value || ''} onChange={e => updatePayment(index, 'value', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input disabled={isReadOnly} className="h-8 text-sm bg-transparent border-transparent hover:border-gray-200 focus:border-emerald-500 focus:bg-white" value={pay.observation} onChange={e => updatePayment(index, 'observation', e.target.value)} />
                          </TableCell>
                           <TableCell className="p-1 text-center">
                            <Button disabled={isReadOnly} variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" onClick={() => removePayment(index)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

               <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <Label className="text-sm font-bold text-gray-900 uppercase">Observações Gerais</Label>
                 <textarea 
                   className="w-full h-20 p-3 mt-2 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-lg outline-none resize-none text-sm text-gray-700" 
                   value={currentOrder.observations || ''}
                   onChange={e => setCurrentOrder({...currentOrder, observations: e.target.value})}
                 />
               </div>

            </div>
             <div className="mt-0 flex justify-end gap-3 p-6 pt-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <Button 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl px-6 font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200"
                >
                  {isReadOnly ? "Visualizar Ordem" : "Salvar Ordem"}
                </Button>
              </div>
        </Modal>
      </CardContent>
    </Card>
    </>
  );
}

function QuotationsTab({ 
  purchaseQuotations, 
  setPurchaseQuotations, 
  suppliers,
  orders,
  setOrders,
  requests,
  setRequests,
  compId,
  onOpenOrderDialog
}: { 
  purchaseQuotations: PurchaseQuotation[], 
  setPurchaseQuotations: React.Dispatch<React.SetStateAction<PurchaseQuotation[]>>,
  suppliers: Supplier[],
  orders: PurchaseOrder[],
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>,
  requests: PurchaseRequest[],
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>,
  compId?: string,
  onOpenOrderDialog: (order: Partial<PurchaseOrder>) => void
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<PurchaseQuotation | null>(null);

  const handleOpenDetails = (quotation: PurchaseQuotation) => {
    setSelectedQuotation(quotation);
    setIsDetailsOpen(true);
  };

  const handleUpdatePrice = (supplierId: string, itemId: string, price: number) => {
    if (!selectedQuotation) return;

    const updatedQuotations = purchaseQuotations.map(q => {
      if (q.id === selectedQuotation.id) {
        const updatedSuppliers = q.suppliers.map(s => {
          if (s.supplierId === supplierId) {
            const updatedResponses = s.responses.map(r => 
              r.itemId === itemId ? { ...r, price } : r
            );
            return { ...s, responses: updatedResponses, status: 'responded' as const };
          }
          return s;
        });
        return { ...q, suppliers: updatedSuppliers };
      }
      return q;
    });

    setPurchaseQuotations(updatedQuotations);
    setSelectedQuotation(updatedQuotations.find(q => q.id === selectedQuotation.id) || null);
  };

  const handleUpdatePaymentCondition = (supplierId: string, condition: string) => {
    if (!selectedQuotation) return;

    const updatedQuotations = purchaseQuotations.map(q => {
      if (q.id === selectedQuotation.id) {
        const updatedSuppliers = q.suppliers.map(s => {
          if (s.supplierId === supplierId) {
            return { ...s, paymentCondition: condition, status: 'responded' as const };
          }
          return s;
        });
        return { ...q, suppliers: updatedSuppliers };
      }
      return q;
    });

    setPurchaseQuotations(updatedQuotations);
    setSelectedQuotation(updatedQuotations.find(q => q.id === selectedQuotation.id) || null);
  };

  const handleSubmitForApproval = () => {
    if (!selectedQuotation) return;
    
    const updatedQuotations = purchaseQuotations.map(q => 
      q.id === selectedQuotation.id ? { ...q, status: 'awaiting_approval' as const } : q
    );
    setPurchaseQuotations(updatedQuotations);
    alert('Orçamento enviado para aprovação do Administrador da Obra!');
    setIsDetailsOpen(false);
  };

  const handleCreateOrder = (supplierId: string) => {
    if (!selectedQuotation) return;
    const supplier = suppliers.find(s => s.id === supplierId);
    const supplierResponses = selectedQuotation.suppliers.find(s => s.supplierId === supplierId);
    
    if (!supplier || !supplierResponses) return;

    const newOrder: PurchaseOrder = {
      id: crypto.randomUUID(),
      companyId: selectedQuotation.companyId,
      orderNumber: (orders.length + 1).toString(),
      supplierId: supplierId,
      supplierName: supplier.name,
      phone: supplier.phone || supplier.mobile,
      email: supplier.emailWebsite || '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      deliveryAddress: { street: '', number: '', complement: '', neighborhood: '', zipCode: '', city: '', state: '' },
      items: selectedQuotation.items
        .filter(item => {
          const response = supplierResponses.responses.find(r => r.itemId === item.itemId);
          return response && response.price > 0;
        })
        .map(item => {
          const response = supplierResponses.responses.find(r => r.itemId === item.itemId);
          return {
            id: crypto.randomUUID(),
            requestId: item.requestId,
            itemId: item.itemId,
            equipmentId: item.equipmentId,
            code: '',
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            price: response?.price || 0
          };
        }),
      subtotal: selectedQuotation.items.reduce((acc, item) => {
        const response = supplierResponses.responses.find(r => r.itemId === item.itemId);
        return acc + (item.quantity * (response?.price || 0));
      }, 0),
      discount: 0,
      additions: 0,
      total: selectedQuotation.items.reduce((acc, item) => {
        const response = supplierResponses.responses.find(r => r.itemId === item.itemId);
        return acc + (item.quantity * (response?.price || 0));
      }, 0),
      paymentConditions: supplierResponses.paymentCondition ? [{
        id: crypto.randomUUID(),
        condition: supplierResponses.paymentCondition,
        dueDate: '',
        value: selectedQuotation.items.reduce((acc, item) => {
          const response = supplierResponses.responses.find(r => r.itemId === item.itemId);
          return acc + (item.quantity * (response?.price || 0));
        }, 0),
        observation: ''
      }] : [],
      observations: `Referente ao orçamento COT-${selectedQuotation.date.replace(/-/g, '')}-${selectedQuotation.id.substring(0, 4).toUpperCase()}`,
      status: 'waiting_delivery',
      originQuotationId: selectedQuotation.id
    };

    // Opening order dialog instead of just adding and updating everything immediately
    setIsDetailsOpen(false);
    onOpenOrderDialog(newOrder);
  };

  return (
    <Card className="border-[10px] border-white shadow-xl rounded-3xl">
      <CardHeader className="border-b border-gray-50 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-emerald-600 rotate-45" />
              Gestão de Orçamentos
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Verifique os orçamentos enviados e preencha os preços recebidos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Fornecedores Cotados</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-gray-400 font-medium">
                  Nenhum orçamento em andamento.
                </TableCell>
              </TableRow>
            ) : (
              [...purchaseQuotations].sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              }).map((q) => (
                <TableRow key={q.id} className={cn(
                  "transition-colors",
                  q.status === 'completed' ? "opacity-60 bg-gray-50/50" : "hover:bg-blue-50/30"
                )}>
                  <TableCell className="text-gray-600">
                    {new Date(q.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {q.items.map(i => i.description).join(', ')}
                    </div>
                    <div className="text-[10px] text-gray-400">{q.items.length} item(ns)</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {q.suppliers.map(qs => {
                        const sup = suppliers.find(s => s.id === qs.supplierId);
                        return (
                          <span key={qs.supplierId} className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            qs.status === 'responded' ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {sup?.name || 'Vendedor'}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset",
                      q.status === 'sent' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                      q.status === 'responded' ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                      q.status === 'awaiting_approval' ? "bg-purple-50 text-purple-700 ring-purple-600/20" :
                      q.status === 'approved' ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                      q.status === 'completed' ? "bg-slate-50 text-slate-700 ring-slate-600/20" :
                      "bg-gray-50 text-gray-700 ring-gray-600/20"
                    )}>
                      {q.status === 'sent' ? 'Enviado' : 
                       q.status === 'responded' ? 'Respondido' :
                       q.status === 'awaiting_approval' ? 'Aguardando Aprovação' :
                       q.status === 'approved' ? 'Aprovado' :
                       q.status === 'completed' ? 'Concluído' : q.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenDetails(q)}
                      className={cn(
                        "font-bold",
                        q.status === 'approved' ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : 
                        q.status === 'completed' ? "border-gray-200 text-gray-400 hover:bg-gray-50" : 
                        "border-blue-200 text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      {q.status === 'approved' ? 'Gerar Ordens' : q.status === 'completed' ? 'Ver Detalhes' : 'Preencher Preços'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          maxWidth="5xl"
          className="p-0 border-none overflow-hidden"
          headerClassName="hidden"
        >
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden rounded-t-2xl">
            <Plus className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
            <div className="relative z-10 text-left">
              <h2 className="text-3xl font-black tracking-tight">Mapa de Cotação</h2>
              <p className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest mt-1">Comparativo de fornecedores e fechamento de pedido</p>
            </div>
          </div>

          <div className="p-8">
            {selectedQuotation && (
              <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-black text-gray-900 uppercase text-[10px] tracking-widest pb-4">Item / Descrição</TableHead>
                      <TableHead className="text-center font-black text-gray-900 uppercase text-[10px] tracking-widest pb-4">Qtd</TableHead>
                      {selectedQuotation.suppliers.map(qs => {
                        const sup = suppliers.find(s => s.id === qs.supplierId);
                        return (
                          <TableHead key={qs.supplierId} className="text-center min-w-[200px] border-l border-gray-100 pb-4">
                            <div className="font-black text-blue-600 text-sm uppercase leading-tight truncate">{sup?.name}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase truncate mt-0.5">{sup?.activity}</div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuotation.items.map((item) => (
                      <TableRow key={item.itemId} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-bold text-gray-900 text-sm">{item.description}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{item.unit}</div>
                        </TableCell>
                        <TableCell className="text-center font-black text-gray-900">
                          {item.quantity}
                        </TableCell>
                        {selectedQuotation.suppliers.map(qs => {
                          const response = qs.responses.find(r => r.itemId === item.itemId);
                          return (
                            <TableCell key={qs.supplierId} className="p-3 border-l border-gray-100">
                              <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-black">R$</span>
                                <Input 
                                  type="number"
                                  className="pl-10 h-11 bg-white border-gray-100 rounded-xl focus:ring-emerald-500 font-black text-emerald-700 text-lg shadow-sm"
                                  value={response?.price || ''}
                                  onChange={(e) => handleUpdatePrice(qs.supplierId, item.itemId, parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* Subtotals Row */}
                    <TableRow className="bg-emerald-50/30 font-bold">
                      <TableCell colSpan={2} className="text-right uppercase tracking-[0.2em] font-black text-gray-400 text-[10px] py-6">Total do Fornecedor</TableCell>
                      {selectedQuotation.suppliers.map(qs => {
                        const total = selectedQuotation.items.reduce((acc, item) => {
                          const res = qs.responses.find(r => r.itemId === item.itemId);
                          return acc + (item.quantity * (res?.price || 0));
                        }, 0);
                        const isAdminSelected = selectedQuotation.selectedSupplierId === qs.supplierId || (qs as any).selected === true;
                        return (
                          <TableCell key={qs.supplierId} className={cn(
                            "text-center transition-all border-l border-emerald-100",
                            isAdminSelected ? "bg-emerald-100/50 text-emerald-800" : "text-blue-600"
                          )}>
                            <div className="text-xl font-black italic tracking-tighter">
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            {isAdminSelected && (
                              <div className="text-[9px] text-emerald-600 uppercase font-black mt-2 flex items-center justify-center gap-1 bg-white py-1 px-2 rounded-lg shadow-sm mx-auto w-fit">
                                <Star className="w-3 h-3 fill-current" /> Sugestão de Compra
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Payment Condition Row */}
                    <TableRow className="bg-white">
                      <TableCell colSpan={2} className="text-right uppercase tracking-widest font-black text-gray-400 text-[10px]">Forma de Pagamento</TableCell>
                      {selectedQuotation.suppliers.map(qs => (
                        <TableCell key={qs.supplierId} className="p-3 border-l border-gray-100">
                          <Input 
                            placeholder="Ex: 30 dias, 2x s/ juros"
                            className="h-10 text-xs bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-blue-500 font-medium"
                            value={qs.paymentCondition || ''}
                            onChange={(e) => handleUpdatePaymentCondition(qs.supplierId, e.target.value)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Action Row */}
                    <TableRow className="bg-white">
                      <TableCell colSpan={2}></TableCell>
                      {selectedQuotation.suppliers.map(qs => {
                        const total = selectedQuotation.items.reduce((acc, item) => {
                          const res = qs.responses.find(r => r.itemId === item.itemId);
                          return acc + (item.quantity * (res?.price || 0));
                        }, 0);
                        return (
                          <TableCell key={qs.supplierId} className="text-center p-6 border-l border-gray-100">
                            {selectedQuotation.status === 'approved' ? (
                              <Button 
                                disabled={total === 0}
                                onClick={() => handleCreateOrder(qs.supplierId)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] rounded-2xl h-14 shadow-xl shadow-emerald-100 transition-all hover:scale-105 active:scale-95"
                              >
                                Gerar Ordem de Compra
                              </Button>
                            ) : selectedQuotation.status === 'completed' ? (
                              <div className="text-[10px] text-emerald-600 font-black uppercase bg-emerald-50 py-3 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100">
                                <CheckCircle className="w-4 h-4" /> Ordem Gerada
                              </div>
                            ) : (
                              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center px-4 leading-relaxed">
                                Aguardando aprovação para gerar OC
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="p-8 bg-gray-50 border-t">
            <div className="flex justify-between items-center">
              <Button 
                onClick={handleSubmitForApproval}
                disabled={!selectedQuotation || selectedQuotation.status === 'awaiting_approval' || selectedQuotation.status === 'approved' || selectedQuotation.status === 'completed'}
                className={cn(
                  "flex-1 max-w-sm rounded-2xl h-14 font-black uppercase text-[10px] shadow-xl transition-all active:scale-95",
                  selectedQuotation?.status === 'awaiting_approval' ? "bg-amber-100 text-amber-700" :
                  selectedQuotation?.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                  selectedQuotation?.status === 'completed' ? "bg-blue-100 text-blue-700" :
                  "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
                )}
              >
                {selectedQuotation?.status === 'awaiting_approval' ? 'Enviado para Aprovação' : 
                 selectedQuotation?.status === 'approved' ? 'Aprovado para Compra' : 
                 selectedQuotation?.status === 'completed' ? 'Orçamento Concluído' : 'Enviar para Aprovação'}
              </Button>
              <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-2xl px-10 h-14 font-bold uppercase text-[10px]">Fechar Mapa</Button>
            </div>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}

function TrackingTab({ orders, setOrders, equipmentMaintenance, onUpdateMaintenance }: { 
  orders: PurchaseOrder[], 
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>,
  equipmentMaintenance: EquipmentMaintenance[],
  onUpdateMaintenance?: (val: EquipmentMaintenance[]) => void
}) {
  const trackingOrders = orders.filter(o => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'finalizada');
  const [evaluationOrder, setEvaluationOrder] = useState<PurchaseOrder | null>(null);
  const [scores, setScores] = useState({ punctuality: 5, quality: 5, service: 5, price: 5, deadline: 5 });
  const [comments, setComments] = useState('');

  const calculateDaysLeft = (deliveryDate: string) => {
    if (!deliveryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleFinishDelivery = (order: PurchaseOrder) => {
    setEvaluationOrder(order);
    setScores({ punctuality: 5, quality: 5, service: 5, price: 5, deadline: 5 });
    setComments('');
  };

  const saveEvaluation = () => {
    if (!evaluationOrder) return;

    const evaluation: SupplierEvaluation = {
      ...scores,
      date: new Date().toISOString(),
      comments: comments
    };

    const updatedOrders = orders.map(o => 
      o.id === evaluationOrder.id 
        ? { ...o, status: 'finalizada' as const, evaluation } 
        : o
    );

    // Record cost in equipment maintenance history if applicable
    if (onUpdateMaintenance && equipmentMaintenance.length > 0) {
      const equipmentItems = evaluationOrder.items.filter(i => i.equipmentId);
      
      if (equipmentItems.length > 0) {
        let updatedMaintenance = [...equipmentMaintenance];
        
        const costsByEquipment: Record<string, number> = {};
        equipmentItems.forEach(item => {
          if (item.equipmentId) {
            costsByEquipment[item.equipmentId] = (costsByEquipment[item.equipmentId] || 0) + (item.quantity * item.price);
          }
        });

        Object.entries(costsByEquipment).forEach(([eqId, cost]) => {
          // Find the active maintenance record (no exit date) for this equipment
          const activeMaintenance = updatedMaintenance.find(m => m.equipmentId === eqId && !m.exitDate);
          
          if (activeMaintenance) {
            updatedMaintenance = updatedMaintenance.map(m => 
              m.id === activeMaintenance.id 
                ? { ...m, totalCost: (m.totalCost || 0) + cost } 
                : m
            );
          } else {
            // If no active maintenance, find the last closed one for this equipment
            const lastMaintenance = [...updatedMaintenance]
              .filter(m => m.equipmentId === eqId)
              .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0];
            
            if (lastMaintenance) {
              updatedMaintenance = updatedMaintenance.map(m => 
                m.id === lastMaintenance.id 
                  ? { ...m, totalCost: (m.totalCost || 0) + cost } 
                  : m
              );
            }
          }
        });
        
        onUpdateMaintenance(updatedMaintenance);
      }
    }

    setOrders(updatedOrders);
    setEvaluationOrder(null);
    alert('Entrega recebida e avaliação registrada com sucesso!');
  };

  const RatingStars = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={cn(
              "p-1 transition-all hover:scale-110",
              star <= value ? "text-amber-400" : "text-gray-200"
            )}
          >
            <Star className={cn("w-6 h-6", star <= value && "fill-current")} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="border-[10px] border-white shadow-xl rounded-3xl">
      <CardHeader className="border-b border-gray-50 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              Acompanhamento de Entregas
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Status das entregas e itens a receber
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {trackingOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Truck className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">Sem entregas pendentes</h3>
            <p className="text-gray-400 max-w-sm mt-2">Acompanhe aqui o andamento de suas compras aprovadas.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackingOrders.map((order) => {
                const daysLeft = calculateDaysLeft(order.deliveryDate);
                return (
                  <TableRow key={order.id} className="hover:bg-blue-50/30">
                    <TableCell className="font-bold">#{order.orderNumber}</TableCell>
                    <TableCell className="font-medium text-gray-700">{order.supplierName}</TableCell>
                    <TableCell>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : 'A confirmar'}</TableCell>
                    <TableCell>
                      {daysLeft !== null ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          daysLeft < 0 ? "bg-red-50 text-red-600" : 
                          daysLeft <= 2 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {daysLeft < 0 ? `Atrasado ${Math.abs(daysLeft)}d` : 
                           daysLeft === 0 ? "Entrega Hoje" : `${daysLeft} dias restantes`}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <div className="space-y-1">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
                              order.status === 'delivered' ? "w-full bg-green-500" : 
                              order.status === 'sent' ? "w-2/3 bg-blue-500" : 
                              order.status === 'waiting_delivery' ? "w-1/3 bg-amber-500" : "w-1/4 bg-gray-300"
                            )} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                        order.status === 'delivered' ? "bg-green-50 text-green-700 ring-green-600/20" :
                        order.status === 'sent' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                        order.status === 'waiting_delivery' ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
                        "bg-gray-50 text-gray-700 ring-gray-600/20"
                      )}>
                        {order.status === 'approved' ? 'Aprovado' :
                         order.status === 'sent' ? 'Em Trânsito' :
                         order.status === 'waiting_delivery' ? 'Aguardando Entrega' :
                         order.status === 'delivered' ? 'Entregue' : order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => handleFinishDelivery(order)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 px-4 shadow-sm shadow-emerald-100"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Entrega Recebida
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!evaluationOrder} onOpenChange={() => setEvaluationOrder(null)}>
          <DialogContent className="max-w-xl rounded-3xl p-0 border-none shadow-2xl overflow-hidden bg-white">
            <div className="bg-emerald-600 p-6 text-white">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Recebimento de Entrega
              </DialogTitle>
              <DialogDescription className="text-emerald-100 mt-1">
                Confirme o recebimento do pedido #{evaluationOrder?.orderNumber} e avalie o fornecedor
              </DialogDescription>
            </div>
            
            <div className="p-8 space-y-8 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-8">
                <RatingStars label="Pontualidade" value={scores.punctuality} onChange={(v) => setScores({...scores, punctuality: v})} />
                <RatingStars label="Qualidade" value={scores.quality} onChange={(v) => setScores({...scores, quality: v})} />
                <RatingStars label="Atendimento" value={scores.service} onChange={(v) => setScores({...scores, service: v})} />
                <RatingStars label="Preço" value={scores.price} onChange={(v) => setScores({...scores, price: v})} />
                <RatingStars label="Prazo" value={scores.deadline} onChange={(v) => setScores({...scores, deadline: v})} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase">Observações do Recebimento</Label>
                <textarea 
                  className="w-full h-24 p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none shadow-inner"
                  placeholder="Descreva detalhes sobre a entrega, divergências ou elogios..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold" onClick={() => setEvaluationOrder(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-12 shadow-lg shadow-emerald-200" onClick={saveEvaluation}>
                  Confirmar e Salvar Avaliação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SupplierTable({ 
  suppliers, 
  onEdit, 
  onDelete 
}: { 
  suppliers: Supplier[], 
  onEdit: (s: Supplier) => void, 
  onDelete: (id: string) => void 
}) {
  if (suppliers.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 font-medium">
        Nenhum fornecedor vinculado a esta obra.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-gray-50/50">
        <TableRow>
          <TableHead className="w-[80px]">Cad nº</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Atividade</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Localização</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => (
          <TableRow key={supplier.id} className="hover:bg-blue-50/30">
            <TableCell className="font-medium text-gray-500">{supplier.registrationNumber}</TableCell>
            <TableCell>
              <div className="font-bold text-gray-900">{supplier.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" /> {supplier.emailWebsite || 'N/I'}
              </div>
            </TableCell>
            <TableCell className="text-sm text-gray-600">{supplier.activity}</TableCell>
            <TableCell>
              <div className="text-sm">{supplier.contact || 'N/I'}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" /> {supplier.phone || supplier.mobile}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">{supplier.neighborhoodCity}</div>
              <div className="text-xs text-gray-500">{supplier.state}</div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(supplier.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EvaluationTab({ suppliers, orders }: { suppliers: Supplier[], orders: PurchaseOrder[] }) {
  const getSupplierAverages = (supplierId: string) => {
    const evaluations = orders
      .filter(o => o.supplierId === supplierId && o.evaluation)
      .map(o => o.evaluation!);
    
    if (evaluations.length === 0) return null;

    const punctuality = evaluations.reduce((acc, e) => acc + e.punctuality, 0) / evaluations.length;
    const quality = evaluations.reduce((acc, e) => acc + e.quality, 0) / evaluations.length;
    const service = evaluations.reduce((acc, e) => acc + e.service, 0) / evaluations.length;
    const price = evaluations.reduce((acc, e) => acc + e.price, 0) / evaluations.length;
    const deadline = evaluations.reduce((acc, e) => acc + e.deadline, 0) / evaluations.length;
    
    const average = (punctuality + quality + service + price + deadline) / 5;

    return {
      punctuality,
      quality,
      service,
      price,
      deadline,
      average,
      count: evaluations.length
    };
  };

  const StarRating = ({ val }: { val: number }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star 
          key={i} 
          className={cn(
            "w-3 h-3", 
            i <= Math.round(val) ? "fill-amber-400 text-amber-400" : "text-gray-200"
          )} 
        />
      ))}
    </div>
  );

  return (
    <Card className="border-[10px] border-white shadow-xl rounded-3xl">
      <CardHeader className="border-b border-gray-50 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" />
              Avaliação de Fornecedor
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Desempenho e qualificação dos parceiros baseado em entregas concluídas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Pontualidade</TableHead>
              <TableHead>Qualidade</TableHead>
              <TableHead>Atendimento</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead className="text-right">Entregas</TableHead>
              <TableHead className="text-right">Média Geral</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => {
              const stats = getSupplierAverages(s.id);
              if (!stats) return (
                <TableRow key={s.id} className="opacity-40">
                  <TableCell className="font-bold text-gray-500">{s.name}</TableCell>
                  <TableCell colSpan={7} className="text-center italic text-xs py-4 text-gray-400">
                    Sem avaliações registradas para este fornecedor.
                  </TableCell>
                </TableRow>
              );

              return (
                <TableRow key={s.id} className="hover:bg-amber-50/30">
                  <TableCell className="font-bold text-gray-900">{s.name}</TableCell>
                  <TableCell><StarRating val={stats.punctuality} /></TableCell>
                  <TableCell><StarRating val={stats.quality} /></TableCell>
                  <TableCell><StarRating val={stats.service} /></TableCell>
                  <TableCell><StarRating val={stats.price} /></TableCell>
                  <TableCell><StarRating val={stats.deadline} /></TableCell>
                  <TableCell className="text-right font-medium text-gray-500">{stats.count}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "px-2 py-1 rounded font-black text-xs min-w-[32px] inline-block text-center shadow-sm",
                      stats.average >= 4.5 ? "bg-emerald-100 text-emerald-700" :
                      stats.average >= 3.5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {stats.average.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
