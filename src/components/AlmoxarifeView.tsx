import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Package, Plus, Search, Building, ArrowLeftRight, Check, Truck, 
  History, User, Calendar, DollarSign, Hammer, ClipboardList, 
  AlertCircle, MapPin, Tag, Trash2, CheckCircle2, ChevronRight,
  Sparkles, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Contract, PurchaseOrder, ServiceComposition, User as UserType,
  Warehouse, WarehouseItem, WarehouseEntry, Asset, WarehouseTransfer, WarehouseApplication,
  PurchaseRequest
} from '../types';

interface AlmoxarifeViewProps {
  contracts: Contract[];
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  services: ServiceComposition[];
  currentUser: UserType;
  
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  warehouseItems: WarehouseItem[];
  setWarehouseItems: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  warehouseEntries: WarehouseEntry[];
  setWarehouseEntries: React.Dispatch<React.SetStateAction<WarehouseEntry[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  transfers: WarehouseTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<WarehouseTransfer[]>>;
  applications: WarehouseApplication[];
  setApplications: React.Dispatch<React.SetStateAction<WarehouseApplication[]>>;
  purchaseRequests?: PurchaseRequest[];
  onUpdatePurchaseRequests?: (requests: PurchaseRequest[]) => void;
}

export default function AlmoxarifeView({
  contracts,
  purchaseOrders,
  setPurchaseOrders,
  services,
  currentUser,
  warehouses,
  setWarehouses,
  warehouseItems,
  setWarehouseItems,
  warehouseEntries,
  setWarehouseEntries,
  assets,
  setAssets,
  transfers,
  setTransfers,
  applications,
  setApplications,
  purchaseRequests = [],
  onUpdatePurchaseRequests
}: AlmoxarifeViewProps) {
  const [activeTab, setActiveTab] = useState<'estoques' | 'entradas' | 'patrimonio' | 'transferencias' | 'aplicacoes'>('estoques');
  const compId = currentUser?.companyId || 'default';

  // State for warehouse creation
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehouseContract, setNewWarehouseContract] = useState<string>('none');
  const [isNewWarehouseOpen, setIsNewWarehouseOpen] = useState(false);

  // Filter & selections
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Unified Stocks and Balances (Physical + Purchases/Controlador)
  const allStockItems = useMemo(() => {
    // 1. Physical items
    const items = warehouseItems.map(item => ({
      ...item,
      isFromRequest: false as boolean,
      sector: undefined as string | undefined,
      displayWarehouseId: item.warehouseId as string,
      requestId: undefined as string | undefined,
      requestItemIdx: undefined as number | undefined,
    }));

    // 2. Received order items from purchase requests
    const requestItems: any[] = [];
    if (purchaseRequests && purchaseRequests.length > 0) {
      purchaseRequests.forEach(r => {
        const isRequestApproved = r.status === 'Recebido' || r.status === 'Comprado';
        
        (r.items || []).forEach((item, itemIdx) => {
          const finalStatus = item.status || (isRequestApproved ? r.status : 'Pendente');
          const isReceived = finalStatus === 'Recebido' || finalStatus === 'Comprado';
          const remainingQty = item.quantity - (item.appliedQuantity || 0);

          if (isReceived && remainingQty > 0) {
            // Find physical warehouse corresponding to this contract
            const matchingWH = r.contractId ? warehouses.find(w => w.contractId === r.contractId) : null;
            
            requestItems.push({
              id: item.id || `req-item-${r.id}-${itemIdx}`,
              companyId: r.companyId || compId,
              warehouseId: matchingWH ? matchingWH.id : '',
              displayWarehouseId: matchingWH ? matchingWH.id : `req-sector-${r.sector || 'Geral'}`,
              description: item.description,
              unit: item.unit || 'UN',
              quantity: remainingQty,
              avgPrice: item.estimatedPrice || item.price || 0,
              createdAt: r.createdAt || new Date().toISOString(),
              isFromRequest: true,
              requestId: r.id,
              requestItemIdx: itemIdx,
              sector: r.sector || r.category || 'Geral',
              contractId: r.contractId
            });
          }
        });
      });
    }

    return [...items, ...requestItems];
  }, [warehouseItems, purchaseRequests, warehouses, compId]);

  // 1. STOCKS & WAREHOUSES MANAGEMENT
  const handleCreateWarehouse = () => {
    if (!newWarehouseName.trim()) {
      alert('Por favor, informe o nome do Almoxarifado.');
      return;
    }

    const newW: Warehouse = {
      id: crypto.randomUUID(),
      companyId: compId,
      name: newWarehouseName,
      contractId: newWarehouseContract === 'none' ? undefined : newWarehouseContract,
      createdAt: new Date().toISOString()
    };

    setWarehouses(prev => [...prev, newW]);
    setNewWarehouseName('');
    setNewWarehouseContract('none');
    setIsNewWarehouseOpen(false);
    setSelectedWarehouseId(newW.id);
  };

  // Safe deletion of warehouse
  const handleDeleteWarehouse = (id: string, name: string) => {
    const hasItems = allStockItems.some(i => i.displayWarehouseId === id && i.quantity > 0);
    if (hasItems) {
      alert(`Não é possível excluir o almoxarifado "${name}" porque ele possui itens em estoque.`);
      return;
    }
    if (confirm(`Deseja mesmo excluir o almoxarifado "${name}"?`)) {
      setWarehouses(prev => prev.filter(w => w.id !== id));
      if (selectedWarehouseId === id) {
        setSelectedWarehouseId('all');
      }
    }
  };

  // Filtered Warehouse Items
  const filteredStockItems = useMemo(() => {
    return allStockItems.filter(item => {
      // Filter by warehouse
      const matchesWarehouse = selectedWarehouseId === 'all' || item.displayWarehouseId === selectedWarehouseId;
      // Filter by search term
      const matchesSearch = item.description.toLowerCase().includes(stockSearchTerm.toLowerCase());
      return matchesWarehouse && matchesSearch;
    });
  }, [allStockItems, selectedWarehouseId, stockSearchTerm]);

  // Grouped Stock Items for unique display
  const groupedStockItems = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    filteredStockItems.forEach(item => {
      const key = item.description.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return Object.keys(groups).map(key => {
      const itemsInGroup = groups[key];
      const totalQty = itemsInGroup.reduce((sum, i) => sum + i.quantity, 0);
      const totalVal = itemsInGroup.reduce((sum, i) => sum + (i.quantity * i.avgPrice), 0);
      const avgPrice = totalQty > 0 ? (totalVal / totalQty) : itemsInGroup[0].avgPrice;

      // Find primary item
      const primaryItem = itemsInGroup[0];

      return {
        ...primaryItem,
        id: `grouped-${key}`,
        quantity: totalQty,
        avgPrice: avgPrice,
        originalItems: itemsInGroup,
      };
    });
  }, [filteredStockItems]);

  // Adjust stock item manually (for correcting inventory errors)
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');

  const handleAdjustStock = () => {
    if (!adjustingItem || adjustQty === '' || isNaN(Number(adjustQty))) return;
    const newQty = Number(adjustQty);
    if (newQty < 0) {
      alert('A quantidade não pode ser negativa.');
      return;
    }

    const adjItem = adjustingItem as any;
    const targetItem = adjItem.originalItems ? adjItem.originalItems[0] : adjItem;
    if (targetItem.isFromRequest) {
      if (onUpdatePurchaseRequests && purchaseRequests) {
        const updatedRequests = purchaseRequests.map(r => {
          if (r.id === targetItem.requestId) {
            return {
              ...r,
              items: r.items.map((i, idx) => {
                if (idx === targetItem.requestItemIdx) {
                  return { ...i, quantity: (i.appliedQuantity || 0) + newQty };
                }
                return i;
              })
            };
          }
          return r;
        });
        onUpdatePurchaseRequests(updatedRequests);
      }
    } else {
      setWarehouseItems(prev => prev.map(i => {
        if (i.id === targetItem.id) {
          return { ...i, quantity: newQty };
        }
        return i;
      }));
    }

    setAdjustingItem(null);
    setAdjustQty('');
    alert('Estoque ajustado com sucesso!');
  };

  // 2. ENTRADAS DE MATERIAIS (ENTRY FROM PURCHASE ORDERS)
  // List of completed/delivered/approved purchase orders waiting to be entered into stock
  const pendingOrders = useMemo(() => {
    return purchaseOrders.filter(order => 
      order.status !== 'finalizada' && 
      order.status !== 'cancelled' && 
      order.items && order.items.length > 0
    );
  }, [purchaseOrders]);

  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingWarehouseId, setReceivingWarehouseId] = useState<string>('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  const handleOpenReceiveForm = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    const initialQuantities: Record<string, number> = {};
    order.items.forEach(item => {
      initialQuantities[item.id] = item.quantity;
    });
    setReceivedQuantities(initialQuantities);
    // Auto-select linked contract's warehouse if exists, otherwise first available
    const linkedContractW = warehouses.find(w => w.contractId === order.contractId);
    if (linkedContractW) {
      setReceivingWarehouseId(linkedContractW.id);
    } else if (warehouses.length > 0) {
      setReceivingWarehouseId(warehouses[0].id);
    } else {
      setReceivingWarehouseId('');
    }
  };

  const handleConfirmReceipt = () => {
    if (!receivingOrder || !receivingWarehouseId) {
      alert('Por favor, selecione um almoxarifado de destino.');
      return;
    }

    const warehouse = warehouses.find(w => w.id === receivingWarehouseId);
    if (!warehouse) return;

    // 1. Create a Entry log
    const entryItems = receivingOrder.items.map(item => ({
      description: item.description,
      unit: item.unit || 'UN',
      quantity: receivedQuantities[item.id] || 0,
      price: item.price || 0
    })).filter(i => i.quantity > 0);

    if (entryItems.length === 0) {
      alert('Informe ao menos um item válido com quantidade recebida para dar entrada.');
      return;
    }

    const newEntry: WarehouseEntry = {
      id: crypto.randomUUID(),
      companyId: compId,
      purchaseOrderId: receivingOrder.id,
      warehouseId: receivingWarehouseId,
      date: new Date().toISOString().slice(0, 10),
      receivedBy: currentUser?.name || 'Almoxarife',
      items: entryItems,
      createdAt: new Date().toISOString()
    };

    setWarehouseEntries(prev => [...prev, newEntry]);

    // 2. Update stock items (averaging prices if item already exists)
    setWarehouseItems(prev => {
      const updated = [...prev];
      
      entryItems.forEach(entryItem => {
         const existingIndex = updated.findIndex(i => 
           i.warehouseId === receivingWarehouseId && 
           i.description.toLowerCase().trim() === entryItem.description.toLowerCase().trim()
         );

         if (existingIndex >= 0) {
           const current = updated[existingIndex];
           const currentTotal = current.quantity * current.avgPrice;
           const newTotal = entryItem.quantity * entryItem.price;
           const newQty = current.quantity + entryItem.quantity;
           const newAvg = newQty > 0 ? (currentTotal + newTotal) / newQty : 0;

           updated[existingIndex] = {
             ...current,
             quantity: newQty,
             avgPrice: Number(newAvg.toFixed(4))
           };
         } else {
           updated.push({
             id: crypto.randomUUID(),
             companyId: compId,
             warehouseId: receivingWarehouseId,
             description: entryItem.description,
             unit: entryItem.unit,
             quantity: entryItem.quantity,
             avgPrice: entryItem.price,
             createdAt: new Date().toISOString()
           });
         }
      });

      return updated;
    });

    // 3. Mark Purchase Order status as 'finalizada' (or 'delivered')
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === receivingOrder.id) {
        return { ...po, status: 'finalizada' };
      }
      return po;
    }));

    setReceivingOrder(null);
    alert('Entrada de materiais efetuada no estoque com sucesso!');
  };

  // 3. CONTROLE DE PATRIMÔNIO (ASSET PROTECTION)
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>('all');
  
  // Asset Form State
  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetCategory, setAssetCategory] = useState('Ferramentas');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [assetLocation, setAssetLocation] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.description.toLowerCase().includes(assetSearchTerm.toLowerCase()) || 
                            a.code.toLowerCase().includes(assetSearchTerm.toLowerCase());
      const matchesStatus = assetStatusFilter === 'all' || a.status === assetStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assets, assetSearchTerm, assetStatusFilter]);

  const handleCreateAsset = () => {
    if (!assetCode.trim() || !assetDesc.trim()) {
      alert('Informe o código de patrimônio (tombamento) e a descrição do bem.');
      return;
    }

    // Check duplicate code
    if (assets.some(a => a.code.toLowerCase().trim() === assetCode.toLowerCase().trim())) {
      alert('Este código de patrimônio já foi cadastrado.');
      return;
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      companyId: compId,
      code: assetCode,
      description: assetDesc,
      category: assetCategory,
      brand: assetBrand || undefined,
      serialNumber: assetSerial || undefined,
      status: 'Disponível',
      currentLocation: assetLocation || 'Almoxarifado Central',
      purchaseDate: new Date().toISOString().slice(0, 10),
      value: assetValue ? Number(assetValue) : undefined,
      createdAt: new Date().toISOString()
    };

    setAssets(prev => [newAsset, ...prev]);
    
    // Reset Form
    setAssetCode('');
    setAssetDesc('');
    setAssetCategory('Ferramentas');
    setAssetBrand('');
    setAssetSerial('');
    setAssetValue('');
    setAssetLocation('');
    setIsAssetOpen(false);
    alert('Bem patrimonial cadastrado com sucesso!');
  };

  const handleUpdateAssetStatus = (id: string, newStatus: Asset['status'], location?: string) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status: newStatus,
          currentLocation: location !== undefined ? location : a.currentLocation 
        };
      }
      return a;
    }));
  };

  // 4. TRANSFERÊNCIA DE MATERIAIS PARA OUTRAS OBRAS
  const [originWarehouseId, setOriginWarehouseId] = useState('');
  const [transferType, setTransferType] = useState<'interna' | 'outras_obras'>('interna');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [destExternalName, setDestExternalName] = useState('');
  
  // Cart for draft transfer
  const [transferItemsCart, setTransferItemsCart] = useState<Array<{description: string, unit: string, quantity: number}>>([]);
  const [selectedStockIdForCart, setSelectedStockIdForCart] = useState('');
  const [cartItemQty, setCartItemQty] = useState<string>('1');

  // Load available items of the selected origin warehouse
  const originWarehouseItems = useMemo(() => {
    if (!originWarehouseId) return [];
    return allStockItems.filter(i => i.displayWarehouseId === originWarehouseId && i.quantity > 0);
  }, [allStockItems, originWarehouseId]);

  const handleAddItemToTransferCart = () => {
    if (!selectedStockIdForCart || !cartItemQty || isNaN(Number(cartItemQty))) return;
    const qty = Number(cartItemQty);
    if (qty <= 0) return;

    const sourceItem = allStockItems.find(i => i.id === selectedStockIdForCart);
    if (!sourceItem) return;

    if (qty > sourceItem.quantity) {
      alert(`Quantidade superior ao saldo disponível em estoque (${sourceItem.quantity} ${sourceItem.unit}).`);
      return;
    }

    // Check if duplicate in cart
    const existingIndex = transferItemsCart.findIndex(i => i.description === sourceItem.description);
    if (existingIndex >= 0) {
      const newQty = transferItemsCart[existingIndex].quantity + qty;
      if (newQty > sourceItem.quantity) {
        alert(`Ao juntar, a quantidade (${newQty}) excede o saldo de estoque.`);
        return;
      }
      const updated = [...transferItemsCart];
      updated[existingIndex].quantity = newQty;
      setTransferItemsCart(updated);
    } else {
      setTransferItemsCart(prev => [...prev, {
        description: sourceItem.description,
        unit: sourceItem.unit,
        quantity: qty
      }]);
    }

    setCartItemQty('1');
  };

  const handleRemoveItemFromTransferCart = (idx: number) => {
    setTransferItemsCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTransfer = () => {
    if (!originWarehouseId) {
      alert('Selecione o almoxarifado de origem.');
      return;
    }

    if (transferType === 'interna' && !destWarehouseId) {
      alert('Selecione o almoxarifado de destino.');
      return;
    }

    if (transferType === 'outras_obras' && !destExternalName.trim()) {
      alert('Informe o nome da obra / destino externo.');
      return;
    }

    if (transferType === 'interna' && originWarehouseId === destWarehouseId) {
      alert('O almoxarifado de origem não pode ser igual ao de destino.');
      return;
    }

    if (transferItemsCart.length === 0) {
      alert('Adicione ao menos um material ao lote de transferência.');
      return;
    }

    const transferId = crypto.randomUUID();
    const newTransfer: WarehouseTransfer = {
      id: transferId,
      companyId: compId,
      originWarehouseId,
      destinationWarehouseId: transferType === 'interna' ? destWarehouseId : undefined,
      destinationName: transferType === 'outras_obras' ? destExternalName : undefined,
      date: new Date().toISOString().slice(0, 10),
      transferredBy: currentUser?.name || 'Almoxarife',
      status: 'Pendente',
      items: transferItemsCart,
      createdAt: new Date().toISOString()
    };

    setTransfers(prev => [newTransfer, ...prev]);

    // Reset Transfer draft
    setOriginWarehouseId('');
    setDestWarehouseId('');
    setDestExternalName('');
    setTransferItemsCart([]);
    alert('Lote de transferência registrado! O saldo será deduzido na confirmação de entrega.');
  };

  const handleConfirmTransferDelivery = (transferId: string) => {
    const trans = transfers.find(t => t.id === transferId);
    if (!trans) return;

    if (trans.status === 'Recebido') return;

    // Deduct quantity from origin warehouse
    setWarehouseItems(prev => {
      const updated = [...prev];

      trans.items.forEach(transferItem => {
        const originIndex = updated.findIndex(i => 
          i.warehouseId === trans.originWarehouseId && 
          i.description.toLowerCase().trim() === transferItem.description.toLowerCase().trim()
        );

        if (originIndex >= 0) {
          const current = updated[originIndex];
          const calculatedQty = Math.max(0, current.quantity - transferItem.quantity);
          updated[originIndex] = { ...current, quantity: calculatedQty };
        }
      });

      // If internal transfer, increment destination warehouse
      if (trans.destinationWarehouseId) {
        trans.items.forEach(transferItem => {
          const destIndex = updated.findIndex(i => 
            i.warehouseId === trans.destinationWarehouseId && 
            i.description.toLowerCase().trim() === transferItem.description.toLowerCase().trim()
          );

          if (destIndex >= 0) {
            const current = updated[destIndex];
            // Average pricing remains the same as transferring inside the same company
            updated[destIndex] = {
              ...current,
              quantity: current.quantity + transferItem.quantity
            };
          } else {
            updated.push({
              id: crypto.randomUUID(),
              companyId: compId,
              warehouseId: trans.destinationWarehouseId!,
              description: transferItem.description,
              unit: transferItem.unit,
              quantity: transferItem.quantity,
              avgPrice: 0, // default placeholder, could extract from origin
              createdAt: new Date().toISOString()
            });
          }
        });
      }

      return updated;
    });

    // Also deduct request-originated stock if it exists
    if (purchaseRequests && onUpdatePurchaseRequests && purchaseRequests.length > 0) {
      let updatedRequests = [...purchaseRequests];
      let requestUpdated = false;

      trans.items.forEach(transferItem => {
         const originWh = warehouses.find(w => w.id === trans.originWarehouseId);
         const matchingReqIdx = updatedRequests.findIndex(r => 
           (!originWh?.contractId || r.contractId === originWh.contractId) &&
           (r.items || []).some(item => 
             item.description.toLowerCase().trim() === transferItem.description.toLowerCase().trim() &&
             (item.quantity - (item.appliedQuantity || 0)) > 0
           )
         );

         if (matchingReqIdx >= 0) {
           const req = updatedRequests[matchingReqIdx];
           const updatedItems = req.items.map(item => {
             if (item.description.toLowerCase().trim() === transferItem.description.toLowerCase().trim()) {
               const remaining = item.quantity - (item.appliedQuantity || 0);
               const toApply = Math.min(transferItem.quantity, remaining);
               return {
                 ...item,
                 appliedQuantity: (item.appliedQuantity || 0) + toApply
               };
             }
             return item;
           });
           updatedRequests[matchingReqIdx] = { ...req, items: updatedItems };
           requestUpdated = true;
         }
      });

      if (requestUpdated) {
        onUpdatePurchaseRequests(updatedRequests);
      }
    }

    // Update transfer status
    setTransfers(prev => prev.map(t => {
      if (t.id === transferId) {
        return { ...t, status: 'Recebido' };
      }
      return t;
    }));

    alert('Transferência recebida! Saldos em estoque atualizados.');
  };

  // 5. APLICAÇÃO DE MATERIAIS NOS GRUPOS/SERVIÇOS DO CONTRATO
  const [applWarehouseId, setApplWarehouseId] = useState('');
  const [applContractId, setApplContractId] = useState('');
  const [applServiceId, setApplServiceId] = useState('');
  const [applStockItemId, setApplStockItemId] = useState('');
  const [applQty, setApplQty] = useState('');
  
  const applWarehouseItems = useMemo(() => {
    if (!applWarehouseId) return [];
    return allStockItems.filter(i => i.displayWarehouseId === applWarehouseId && i.quantity > 0);
  }, [allStockItems, applWarehouseId]);

  const selectedContractObj = useMemo(() => {
    return contracts.find(c => c.id === applContractId);
  }, [contracts, applContractId]);

  // List of services available on the selected contract
  const contractServices = useMemo(() => {
    if (!selectedContractObj) return [];
    // If services exist inside contract object, return them
    if (selectedContractObj.services && selectedContractObj.services.length > 0) {
      return selectedContractObj.services.map(s => {
        // Find name in global services if missing
        const globalS = services.find(g => g.id === s.serviceId);
        return {
          serviceId: s.serviceId,
          code: s.code || globalS?.code || 'S-COD',
          name: s.name || globalS?.name || 'Serviço do Orçamento',
          unit: globalS?.unit || 'UN'
        };
      });
    }
    // Alternatively fallback to global services
    return services.map(s => ({
      serviceId: s.id,
      code: s.code,
      name: s.name,
      unit: s.unit
    }));
  }, [selectedContractObj, services]);

  const handleRegisterApplication = () => {
    if (!applWarehouseId || !applContractId || !applServiceId || !applStockItemId) {
      alert('Preencha as informações do almoxarifado, contrato, material e serviço.');
      return;
    }

    const qty = Number(applQty);
    if (!applQty || isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade válida superior a 0.');
      return;
    }

    const sourceItem = allStockItems.find(i => i.id === applStockItemId);
    if (!sourceItem) return;

    if (qty > sourceItem.quantity) {
      alert(`Quantidade desejada excede o saldo disponível que é de ${sourceItem.quantity} ${sourceItem.unit}.`);
      return;
    }

    // Register Application
    const newApp: any = {
      id: crypto.randomUUID(),
      companyId: compId,
      warehouseId: applWarehouseId,
      contractId: applContractId,
      serviceId: applServiceId,
      quantity: qty,
      description: sourceItem.description, // Store name so we display it cleanly in applications history
      date: new Date().toISOString().slice(0, 10),
      appliedBy: currentUser?.name || 'Almoxarife',
      createdAt: new Date().toISOString()
    };

    setApplications(prev => [newApp, ...prev]);

    // Decrement stock
    if (sourceItem.isFromRequest) {
      if (onUpdatePurchaseRequests && purchaseRequests) {
        const updatedRequests = purchaseRequests.map(r => {
          if (r.id === sourceItem.requestId) {
            return {
              ...r,
              items: r.items.map((item, idx) => {
                if (idx === sourceItem.requestItemIdx) {
                  return {
                    ...item,
                    appliedQuantity: (item.appliedQuantity || 0) + qty
                  };
                }
                return item;
              })
            };
          }
          return r;
        });
        onUpdatePurchaseRequests(updatedRequests);
      }
    } else {
      setWarehouseItems(prev => prev.map(item => {
        if (item.id === applStockItemId) {
          return {
            ...item,
            quantity: Math.max(0, item.quantity - qty)
          };
        }
        return item;
      }));
    }

    // Reset Form
    setApplQty('');
    setApplStockItemId('');
    alert('Material aplicado ao serviço com sucesso! Saldo deduzido.');
  };

  // Helper getters for applications list
  const applicationsTableData = useMemo(() => {
    return applications.map(app => {
      const warehouse = warehouses.find(w => w.id === app.warehouseId);
      const contract = contracts.find(c => c.id === app.contractId);
      const service = services.find(s => s.id === app.serviceId) || contractServices.find(cs => cs.serviceId === app.serviceId);
      
      return {
        ...app,
        warehouseName: warehouse?.name || 'Almoxarifado Desconhecido',
        contractName: contract?.workName || contract?.contractNumber || 'Contrato Desconhecido',
        serviceName: service ? `[${service.code}] ${service.name}` : 'Serviço de Obra'
      };
    });
  }, [applications, warehouses, contracts, services, contractServices]);

  return (
    <div className="space-y-8 w-full max-w-[98%] mx-auto px-1 md:px-4 lg:px-6 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-emerald-950 to-emerald-800 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
            <Layers className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <span className="text-sm bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider">Setor Operacional</span>
            <h1 className="text-4xl font-black tracking-tight mt-1">Almoxarifado & Estoque</h1>
            <p className="text-emerald-100/80 text-base mt-1">Gestão de entradas, patrimônios, transferências de materiais e aplicação direta em serviços.</p>
          </div>
        </div>

        {/* Global Warehouse Shortcut Creation */}
        <Dialog open={isNewWarehouseOpen} onOpenChange={setIsNewWarehouseOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-emerald-900 font-bold hover:bg-emerald-50 rounded-xl h-11 shadow-sm gap-2 whitespace-nowrap">
              <Plus className="w-5 h-5" /> Novo Almoxarifado
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl small-app-dialog max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-950">
                <Building className="w-5 h-5 text-emerald-600" /> Cadastrar Almoxarifado / Estoque
              </DialogTitle>
              <DialogDescription>
                Crie um novo local físico de estoque para organizar seus materiais.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="wname" className="text-sm font-semibold">Nome do Almoxarifado</Label>
                <Input 
                  id="wname" 
                  placeholder="Ex: Almoxarifado Trecho 1, Geral, Central" 
                  value={newWarehouseName}
                  onChange={e => setNewWarehouseName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wcontract" className="text-sm font-semibold">Vincular a Obra / Contrato (Opcional)</Label>
                <Select value={newWarehouseContract} onValueChange={setNewWarehouseContract}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Disponível Geral)</SelectItem>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.workName || c.contractNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-lg mr-2" onClick={() => setIsNewWarehouseOpen(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" onClick={handleCreateWarehouse}>Criar Almoxarifado</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-slate-100 p-2 rounded-2xl border mb-6">
          <TabsTrigger value="estoques" className="font-extrabold py-4 px-5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md text-base transition-all">
            <Package className="w-5 h-5 mr-2 inline text-emerald-600" /> Estoques & Saldos
          </TabsTrigger>
          <TabsTrigger value="entradas" className="font-extrabold py-4 px-5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md text-base transition-all">
            <CheckCircle2 className="w-5 h-5 mr-2 inline text-emerald-600" /> Recebimentos (Entrada)
          </TabsTrigger>
          <TabsTrigger value="patrimonio" className="font-extrabold py-4 px-5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md text-base transition-all">
            <Hammer className="w-5 h-5 mr-2 inline text-emerald-600" /> Patrimônio & Ativos
          </TabsTrigger>
          <TabsTrigger value="transferencias" className="font-extrabold py-4 px-5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md text-base transition-all">
            <ArrowLeftRight className="w-5 h-5 mr-2 inline text-emerald-600" /> Transferências
          </TabsTrigger>
          <TabsTrigger value="aplicacoes" className="font-extrabold py-4 px-5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md text-base transition-all">
            <ClipboardList className="w-5 h-5 mr-2 inline text-emerald-600" /> Aplicação em Serviços
          </TabsTrigger>
        </TabsList>

        {/* 1. TAB: STOCKS & BALANCES */}
        <TabsContent value="estoques">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column: Almoxarifados List */}
            <div className="space-y-4 lg:col-span-1">
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Almoxarifados</span>
                    <Badge variant="outline" className="text-xs">{warehouses.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">Locais de estocagem cadastrados</CardDescription>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  <button 
                    onClick={() => setSelectedWarehouseId('all')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedWarehouseId === 'all' 
                      ? 'bg-emerald-50 text-emerald-800 font-extrabold' 
                      : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Todos os Estoques</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  {warehouses.map(w => (
                    <div 
                      key={w.id} 
                      className={`group w-full rounded-xl transition-all flex items-center justify-between p-1 ${
                        selectedWarehouseId === w.id ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <button 
                        onClick={() => setSelectedWarehouseId(w.id)}
                        className="flex-1 text-left px-2 py-1.5 text-xs font-bold flex flex-col"
                      >
                        <span className="truncate">{w.name}</span>
                        {w.contractId && (
                          <span className="text-[10px] text-emerald-600 font-medium truncate max-w-[150px]">
                            Obra: {contracts.find(c => c.id === w.contractId)?.workName || 'Contrato'}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => handleDeleteWarehouse(w.id, w.name)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover almoxarifado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {warehouses.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">Nenhum almoxarifado cadastrado.</p>
                  )}
                </CardContent>
              </Card>

              {/* Info panel */}
              <Card className="rounded-2xl border shadow-sm bg-slate-50 border-dashed">
                <CardContent className="p-5 text-slate-600 space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed"><strong>Sincronização de Estoques:</strong> O almoxarife possui visão unificada e direta de todos os estoques da companhia, podendo transferir materiais de forma ágil.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Inventory Items Table */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="rounded-2xl border shadow-sm overflow-hidden bg-white">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-bold">Saldo de Materiais</CardTitle>
                      <CardDescription className="text-xs">Visualização e monitoramento de saldos fisicos em estoque</CardDescription>
                    </div>
                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar item em estoque..." 
                        value={stockSearchTerm}
                        onChange={e => setStockSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-500">Material / Item</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-center">Unidade</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-right">Saldo em Estoque</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-right">Preço Médio (R$)</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-right">Valor em Estoque</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-center">Almoxarifado</TableHead>
                          <TableHead className="text-xs font-bold text-slate-500 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedStockItems.map(item => {
                          const itemWH = warehouses.find(w => w.id === item.warehouseId);
                          const whNames = Array.from(new Set(item.originalItems ? item.originalItems.map(i => {
                            const w = warehouses.find(wh => wh.id === i.warehouseId);
                            return w ? w.name : 'Geral';
                          }) : [itemWH?.name || 'Geral'])).join(', ');

                          const totalVal = item.quantity * item.avgPrice;
                          return (
                            <TableRow key={item.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-semibold text-slate-900 text-xs py-3">{item.description}</TableCell>
                              <TableCell className="text-center text-xs text-slate-500">{item.unit}</TableCell>
                              <TableCell className="text-right text-xs pr-4">
                                <Badge variant={item.quantity > 5 ? "outline" : "destructive"} className="font-bold">
                                  {item.quantity.toLocaleString('pt-BR')} {item.unit}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs text-slate-600">R$ {item.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-xs font-bold text-emerald-700">R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-center text-xs">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {whNames}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-xs font-bold text-slate-500 hover:text-emerald-700 h-8 rounded-lg"
                                  onClick={() => {
                                    setAdjustingItem(item);
                                    setAdjustQty(String(item.quantity));
                                  }}
                                >
                                  Ajustar Físico
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {groupedStockItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              Nenhum item localizado no estoque e filtros selecionados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Manual Adjustments Dialog */}
          {adjustingItem && (
            <Dialog open={!!adjustingItem} onOpenChange={(open) => !open && setAdjustingItem(null)}>
              <DialogContent className="rounded-2xl bg-white max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold">Ajuste de Saldo de Estoque</DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Insira a quantidade física real encontrada na contagem do material: <strong className="text-slate-900">{adjustingItem.description}</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label htmlFor="adjQty" className="text-xs font-bold text-slate-500">Quantidade Físico Real</Label>
                    <Input 
                      id="adjQty" 
                      type="number" 
                      value={adjustQty}
                      onChange={e => setAdjustQty(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adjNotes" className="text-xs font-bold text-slate-500">Motivo do Ajuste</Label>
                    <Input 
                      id="adjNotes" 
                      placeholder="Ex: Correção de inventário, perda, quebra"
                      value={adjustNote}
                      onChange={e => setAdjustNote(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="rounded-lg" onClick={() => setAdjustingItem(null)}>Cancelar</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={handleAdjustStock}>Salvar Ajuste</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* 2. TAB: MATERIAL ENTRYS (RECEIVING FROM COMPRAS) */}
        <TabsContent value="entradas">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Left side: Orders awaiting entry */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" /> Ordens de Compra de Compras
                </h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 font-bold border-emerald-200">
                  {pendingOrders.length} Pendentes de Entrada
                </Badge>
              </div>

              <div className="space-y-3">
                {pendingOrders.map(order => {
                  const itemsCount = order.items?.length || 0;
                  return (
                    <Card key={order.id} className="rounded-2xl border hover:border-emerald-200 transition-all shadow-sm">
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-800 font-bold">Nº {order.orderNumber || 'S/N'}</Badge>
                            <span className="text-xs text-slate-400 font-medium">{new Date(order.orderDate).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">{order.supplierName || 'Fornecedor'}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed truncate max-w-sm">Items: {(order.items || []).map(i => i.description).join(', ')}</p>
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold pt-1">
                            <span>Faturas: {itemsCount} itens</span>
                            <span>TotalPedido: R$ {order.total?.toLocaleString() || '0'}</span>
                          </div>
                        </div>

                        <Button 
                          className="bg-emerald-50 text-emerald-800 text-xs hover:bg-emerald-600 hover:text-white font-bold h-10 px-4 rounded-xl flex items-center gap-1 shrink-0"
                          onClick={() => handleOpenReceiveForm(order)}
                        >
                          <Check className="w-4 h-4" /> Dar Entrada no Estoque
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {pendingOrders.length === 0 && (
                  <Card className="rounded-2xl border border-dashed py-12 text-center text-slate-400 text-xs bg-slate-50/50">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Ótimo! Não há nenhuma compra pendente aguardando entrada de material no almoxarifado.
                  </Card>
                )}
              </div>
            </div>

            {/* Right side: Entries History */}
            <div className="space-y-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Histórico de Entrada de Materiais
              </h3>

              <div className="space-y-3">
                {warehouseEntries.map(entry => {
                  const destWh = warehouses.find(w => w.id === entry.warehouseId);
                  const relatedPO = purchaseOrders.find(po => po.id === entry.purchaseOrderId);
                  return (
                    <Card key={entry.id} className="rounded-2xl border shadow-xs">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-600" /> {destWh?.name || 'Almoxarifado'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{new Date(entry.createdAt || entry.date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Materiais Recebidos:</p>
                          <ul className="space-y-1">
                            {entry.items?.map((item, idx) => (
                              <li key={idx} className="flex items-center justify-between">
                                <span className="font-medium text-slate-800">{item.description}</span>
                                <span className="font-bold text-emerald-700">{item.quantity} {item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Recebimento por: {entry.receivedBy}</span>
                          {relatedPO && <span>Ordem de Compra: #{relatedPO.orderNumber}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {warehouseEntries.length === 0 && (
                  <Card className="rounded-2xl border border-dashed py-12 text-center text-slate-400 text-xs bg-slate-50/50">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Histórico de recebimentos vazio.
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Dialog receive items from purchase order */}
          {receivingOrder && (
            <Dialog open={!!receivingOrder} onOpenChange={(open) => !open && setReceivingOrder(null)}>
              <DialogContent className="rounded-2xl bg-white max-w-lg overflow-y-auto max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-emerald-950 flex items-center gap-1.5">
                    <Truck className="w-5 h-5 text-emerald-600" /> Receber Compra / Entrada no Almoxarifado
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Verifique os itens recebidos da compra da <strong className="text-slate-900">{receivingOrder.supplierName}</strong> e aponte o destino físico correspondente.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Select Destination Almoxarifado */}
                  <div className="space-y-1.5">
                    <Label htmlFor="destWh" className="text-xs font-bold text-slate-500 uppercase">Almoxarifado Destinatário</Label>
                    <Select value={receivingWarehouseId} onValueChange={setReceivingWarehouseId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Selecione o almoxarifado de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Items List inside purchase order */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Verificação de Amostragem / Quantidades</Label>
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                      {receivingOrder.items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 text-ellipsis overflow-hidden truncate">{item.description}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Comprado: {item.quantity} {item.unit} | Preço: R$ {(item.price || 0).toLocaleString()}</p>
                          </div>
                          <div className="w-28 shrink-0 flex items-center gap-1.5">
                            <Input 
                              type="number"
                              min="0"
                              value={receivedQuantities[item.id] !== undefined ? receivedQuantities[item.id] : item.quantity}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setReceivedQuantities(prev => ({
                                  ...prev,
                                  [item.id]: val >= 0 ? val : 0
                                }));
                              }}
                              className="rounded-lg h-9 text-xs"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setReceivingOrder(null)}>Declinar</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" onClick={handleConfirmReceipt}>Dar Entrada Físico</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* 3. TAB: ASSET PROTECTION (CONTROLE DE PATRIMÔNIO) */}
        <TabsContent value="patrimonio">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xl">Controle de Patrimônio</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gestão preventiva, registro de tombamento e verificação de bens permanentes.</p>
              </div>

              {/* Action and Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                  <Input 
                    placeholder="Filtrar tombamento/nome..."
                    value={assetSearchTerm}
                    onChange={e => setAssetSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-lg"
                  />
                </div>
                <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs rounded-lg">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="Disponível">Disponível</SelectItem>
                    <SelectItem value="Em Uso">Em Uso</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Baixado">Baixado</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={isAssetOpen} onOpenChange={setIsAssetOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 rounded-lg h-8 text-xs gap-1">
                      <Plus className="w-4 h-4" /> Cadastrar Ativo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold flex items-center gap-1.5"><Tag className="w-4 h-4 text-emerald-600" /> Novo Ativo / Patrimônio</DialogTitle>
                      <DialogDescription className="text-xs">Insira os dados corretos para controle de tombamento.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 py-4">
                      <div className="space-y-1 col-span-2">
                        <Label htmlFor="asCode" className="text-xs">Código de Tombamento *</Label>
                        <Input id="asCode" placeholder="Ex: PAT-0143, SGO-77" value={assetCode} onChange={e => setAssetCode(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label htmlFor="asDesc" className="text-xs">Descrição do Item *</Label>
                        <Input id="asDesc" placeholder="Ex: Betoneira 400L, Furadeira Bosch" value={assetDesc} onChange={e => setAssetDesc(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="asCategory" className="text-xs">Categoria</Label>
                        <Select value={assetCategory} onValueChange={setAssetCategory}>
                          <SelectTrigger className="rounded-lg text-xs h-9">
                            <SelectValue placeholder="Escolha" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                            <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                            <SelectItem value="TI/Escritório">TI / Escritório</SelectItem>
                            <SelectItem value="Segurança">Segurança (EPI)</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="asBrand" className="text-xs">Marca</Label>
                        <Input id="asBrand" placeholder="Ex: Bosch" value={assetBrand} onChange={e => setAssetBrand(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="asSerial" className="text-xs">Nº de Série</Label>
                        <Input id="asSerial" placeholder="Ex: SN-548174" value={assetSerial} onChange={e => setAssetSerial(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="asValue" className="text-xs">Valor de Compra (R$)</Label>
                        <Input id="asValue" type="number" placeholder="Ex: 1500" value={assetValue} onChange={e => setAssetValue(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label htmlFor="asLocation" className="text-xs">Localização Inicial</Label>
                        <Input id="asLocation" placeholder="Ex: Almoxarifado Central, Escritório" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} className="rounded-lg text-xs" />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" className="rounded-lg" onClick={() => setIsAssetOpen(false)}>Cancelar</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={handleCreateAsset}>Salvar Ativo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Assets Table */}
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500">Tombamento</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Descrição do Ativo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Categoria</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Marca/Série</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Localização</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Situação</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 text-center">Alterar Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map(asset => {
                      const colorMap = {
                        'Disponível': 'bg-green-100 text-green-800 border-green-200',
                        'Em Uso': 'bg-blue-100 text-blue-800 border-blue-200',
                        'Manutenção': 'bg-amber-100 text-amber-800 border-amber-200',
                        'Baixado': 'bg-red-100 text-red-800 border-red-200'
                      };
                      return (
                        <TableRow key={asset.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-xs text-emerald-950 font-mono py-4">{asset.code}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            <div>
                              <p>{asset.description}</p>
                              {asset.value && <p className="text-[10px] text-emerald-700 mt-0.5">Valor: R$ {asset.value.toLocaleString()}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{asset.category}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">
                            <span className="block">{asset.brand || '-'}</span>
                            <span className="text-[10px] block text-slate-400">{asset.serialNumber || '-'}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {asset.currentLocation}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge className={`${colorMap[asset.status]} border font-extrabold`}>{asset.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Select 
                                value={asset.status} 
                                onValueChange={(val) => {
                                  let newLocation = asset.currentLocation;
                                  if (val === 'Disponível') newLocation = 'Almoxarifado Central';
                                  handleUpdateAssetStatus(asset.id, val as any, newLocation);
                                }}
                              >
                                <SelectTrigger className="h-7 w-28 text-[10px] rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Disponível">Disponível</SelectItem>
                                  <SelectItem value="Em Uso">Em Uso</SelectItem>
                                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                                  <SelectItem value="Baixado">Baixado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredAssets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                          <Hammer className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          Nenhum bem patrimonial encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. TAB: SITE TRANSFER (TRANSFERÊNCIA DE MATERIAIS) */}
        <TabsContent value="transferencias">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left side: Register Transfer form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-1.5 pb-2">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Registrar Transferência</h3>
              </div>

              <Card className="rounded-2xl border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">1. Almoxarifado de Origem</Label>
                    <Select value={originWarehouseId} onValueChange={setOriginWarehouseId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">2. Destino de Destinação</Label>
                    <div className="flex gap-4 p-2 bg-slate-50 rounded-xl border">
                      <button 
                        type="button" 
                        onClick={() => setTransferType('interna')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${transferType === 'interna' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                      >
                        Interno
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTransferType('outras_obras')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${transferType === 'outras_obras' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                      >
                        Outra Obra/Externo
                      </button>
                    </div>

                    {transferType === 'interna' ? (
                      <Select value={destWarehouseId} onValueChange={setDestWarehouseId}>
                        <SelectTrigger className="rounded-xl h-11 mt-1">
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        placeholder="Nome da Obra ou Destino Externo" 
                        value={destExternalName}
                        onChange={e => setDestExternalName(e.target.value)}
                        className="rounded-xl h-11 mt-1"
                      />
                    )}
                  </div>

                  {/* Add materials to draft transfer */}
                  <div className="space-y-1.5 border-t pt-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase">3. Adicionar Materiais ao Envio</Label>
                    <div className="flex gap-1.5">
                      <Select value={selectedStockIdForCart} onValueChange={setSelectedStockIdForCart} disabled={!originWarehouseId}>
                        <SelectTrigger className="flex-1 rounded-xl h-11">
                          <SelectValue placeholder={originWarehouseId ? "Selecione o material" : "Primeiro selecione a origem"} />
                        </SelectTrigger>
                        <SelectContent>
                          {originWarehouseItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.description} ({item.quantity} {item.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number"
                        placeholder="Qtd"
                        value={cartItemQty}
                        onChange={e => setCartItemQty(e.target.value)}
                        className="w-16 rounded-xl h-11 text-center"
                        disabled={!selectedStockIdForCart}
                      />
                      <Button 
                        type="button" 
                        className="bg-emerald-600 text-white rounded-xl h-11 px-4 hover:bg-emerald-700 shrink-0 font-bold"
                        onClick={handleAddItemToTransferCart}
                        disabled={!selectedStockIdForCart}
                      >
                        +
                      </Button>
                    </div>

                    {/* Cart Items List */}
                    <div className="space-y-1.5 pt-3">
                      {transferItemsCart.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
                          <span className="font-semibold text-slate-800">{item.description}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800">{item.quantity} {item.unit}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveItemFromTransferCart(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold mt-2" onClick={handleSaveTransfer}>
                    Gerar Guia de Transferência
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right side: Transfers history / pending list */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-1.5 pb-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Guia/Histórico de Movimentações</h3>
              </div>

              <div className="space-y-4">
                {transfers.map(transfer => {
                  const originWh = warehouses.find(w => w.id === transfer.originWarehouseId);
                  const destWh = warehouses.find(w => w.id === transfer.destinationWarehouseId);
                  return (
                    <Card key={transfer.id} className="rounded-2xl border shadow-sm">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{originWh?.name || 'Origem Desconhecida'}</span>
                            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-md">{transfer.destinationWarehouseId ? (destWh?.name || 'Destino') : transfer.destinationName}</span>
                          </div>
                          
                          <Badge variant={transfer.status === 'Recebido' ? "default" : "destructive"} className="font-extrabold">
                            {transfer.status === 'Recebido' ? 'Recebido/Entregue' : 'Pendente de Entrega'}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-600 p-3 bg-slate-50/50 rounded-xl border">
                          <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Lote de Materiais:</p>
                          <ul className="space-y-1">
                            {transfer.items?.map((item, idx) => (
                              <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                <span>{item.description}</span>
                                <span className="font-bold text-emerald-800">{item.quantity} {item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Operador: {transfer.transferredBy} | Emitido: {new Date(transfer.createdAt || transfer.date).toLocaleDateString()}</span>
                          {transfer.status === 'Pendente' && (
                            <Button 
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-7 text-[10px] font-bold"
                              onClick={() => handleConfirmTransferDelivery(transfer.id)}
                            >
                              <Check className="w-3 h-3 mr-1" /> Confirmar Entrega
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {transfers.length === 0 && (
                  <Card className="rounded-2xl border border-dashed py-12 text-center text-slate-400 text-xs bg-slate-50/50">
                    <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhuma guia de transferência cadastrada.
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. TAB: APPLY TO CONTRACT SERVICES */}
        <TabsContent value="aplicacoes">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left side: Launch Application form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-1.5 pb-2">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Aplicar Material a Obra</h3>
              </div>

              <Card className="rounded-2xl border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  {/* Select warehouse */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Selecione Almoxarifado de Retirada</Label>
                    <Select value={applWarehouseId} onValueChange={setApplWarehouseId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Selecione o almoxarifado" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select local stock item */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Selecione o Material em Estoque</Label>
                    <Select value={applStockItemId} onValueChange={setApplStockItemId} disabled={!applWarehouseId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder={applWarehouseId ? "Escolha o material" : "Selecione o almoxarifado primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {applWarehouseItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.description} ({item.quantity} {item.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Apply Target Contract */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Obra / Contrato Beneficiado</Label>
                    <Select value={applContractId} onValueChange={setApplContractId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Qual obra receberá?" />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.workName || c.contractNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Apply Target Service */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Serviço do Contrato</Label>
                    <Select value={applServiceId} onValueChange={setApplServiceId} disabled={!applContractId}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder={applContractId ? "Qual serviço receberá?" : "Selecione o contrato primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {contractServices.map(cs => (
                          <SelectItem key={cs.serviceId} value={cs.serviceId}>{cs.code} - {cs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity and units */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Quantidade Utilizada</Label>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={applQty}
                        onChange={e => setApplQty(e.target.value)}
                        className="rounded-xl h-11"
                        disabled={!applStockItemId}
                      />
                    </div>
                    <div className="space-y-1 col-span-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Unidade</Label>
                      <Input 
                        value={allStockItems.find(i => i.id === applStockItemId)?.unit || '-'} 
                        className="rounded-xl h-11 bg-slate-50 text-slate-500 text-center text-xs font-bold" 
                        disabled 
                      />
                    </div>
                  </div>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold mt-2" onClick={handleRegisterApplication}>
                    Confirmar Aplicação de Material
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right side: Consumption History */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-1.5 pb-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Histórico de Consumo de Materiais</h3>
              </div>

              <div className="space-y-3">
                {applicationsTableData.map(app => (
                  <Card key={app.id} className="rounded-2xl border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-150 px-2 py-0.5 rounded-md">
                          Obra: {app.contractName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{new Date(app.createdAt || app.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Serviço: <span className="font-bold text-slate-900">{app.serviceName}</span></p>
                      
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border text-xs mt-1">
                        <span className="font-medium text-slate-600">Material Aplicado: {app.description || 'Material'}</span>
                        <span className="font-black text-emerald-700">{app.quantity} UN</span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between font-semibold pt-1">
                        <span>Almoxarifado Retirada: {app.warehouseName}</span>
                        <span>Aplicado por: {app.appliedBy}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {applicationsTableData.length === 0 && (
                  <Card className="rounded-2xl border border-dashed py-12 text-center text-slate-400 text-xs bg-slate-50/50">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum lançamento de consumo de materiais registrado para os serviços.
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
