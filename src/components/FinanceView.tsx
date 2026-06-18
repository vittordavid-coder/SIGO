import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Landmark, Plus, Edit, Trash2, Printer, FileText, Download, FileSpreadsheet, Upload, Eye, CheckCircle, ShoppingBag, Search, ExternalLink, Calculator } from 'lucide-react';
import { Aporte, AporteItem, PurchaseOrder } from '../types';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';

export const FinanceView = ({ 
  contracts, 
  selectedContractId: propSelectedContractId, 
  onUpdateContractId,
  aportes = [],
  setAportes,
  currentUser,
  purchaseOrders = [],
  setPurchaseOrders
}: any) => {
  const [localSelectedContractId, setLocalSelectedContractId] = useState<string>('all');
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId = onUpdateContractId || setLocalSelectedContractId;

  const [activeTab, setActiveTab] = useState('aportes');
  const [selectedAporteId, setSelectedAporteId] = useState<string | null>(null);
  
  const [itemsSortConfig, setItemsSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [aportesSortConfig, setAportesSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Aporte Dialog state
  const [isAporteDialogOpen, setIsAporteDialogOpen] = useState(false);
  const [editingAporte, setEditingAporte] = useState<Aporte | null>(null);
  const [aporteFormData, setAporteFormData] = useState<Partial<Aporte>>({});

  // Item Dialog state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AporteItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Partial<AporteItem>>({});

  // Confirm delete state
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [aporteToDelete, setAporteToDelete] = useState<string | null>(null);

  // Purchase Orders states
  const [searchPO, setSearchPO] = useState('');
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isPOPreviewOpen, setIsPOPreviewOpen] = useState(false);
  const [isPOIncludeOpen, setIsPOIncludeOpen] = useState(false);
  const [includePOFormData, setIncludePOFormData] = useState({
    targetAporteId: '',
    importMode: 'individual' as 'individual' | 'consolidated',
    category: 'Suprimentos',
    subcategory: 'Ordem de Compra',
    dueDate: ''
  });

  const displayedPOs = useMemo(() => {
    const list = purchaseOrders || [];
    
    // Check if PO is already in any Aporte
    const isPOInAportes = (po: any) => {
      const poNum = po.orderNumber || po.numero || '';
      return aportes.some((a: Aporte) => 
        (a.items || []).some((item: any) => 
          item.purchaseOrderId === po.id || 
          (item.descricao && (
            item.descricao === poNum ||
            item.descricao.startsWith(`${poNum}:`) ||
            item.descricao.startsWith(`Consolidado ${poNum} `)
          ))
        )
      );
    };

    // Filter to only include purchased orders (status !== 'draft' and status !== 'cancelled') and not yet in any Aporte
    const filteredList = list.filter((po: any) => {
      const isPurchased = po.status !== 'draft' && po.status !== 'cancelled';
      const hasBeenAdded = isPOInAportes(po);
      return isPurchased && !hasBeenAdded;
    });

    if (!searchPO) return filteredList;
    const lower = searchPO.toLowerCase();
    return filteredList.filter((po: any) => 
      (po.orderNumber || po.numero || '').toLowerCase().includes(lower) ||
      po.supplierName?.toLowerCase().includes(lower) ||
      po.category?.toLowerCase().includes(lower) ||
      (po.costCenter || po.centroCusto || '').toLowerCase().includes(lower)
    );
  }, [purchaseOrders, aportes, searchPO]);

  const handleIncludePOInAporte = () => {
    const { targetAporteId, importMode, category, subcategory, dueDate } = includePOFormData;
    if (!targetAporteId || !selectedPO) return;

    const targetAporte = aportes.find((a: Aporte) => a.id === targetAporteId);
    if (!targetAporte) return;

    let itemsToAdd: AporteItem[] = [];

    const orderNumber = selectedPO.orderNumber || selectedPO.numero || '';

    if (importMode === 'individual') {
      itemsToAdd = (selectedPO.items || []).map((poi: any) => ({
        id: uuidv4(),
        categoria: category || selectedPO.category || 'Compras',
        subcategoria: subcategory || poi.code || 'Ordem de Compra',
        fornecedor: selectedPO.supplierName,
        descricao: `${orderNumber}: ${poi.description || poi.descricao} (Qtd: ${poi.quantity || poi.quantidade} ${poi.unit || poi.unidade || ''})`,
        mesCompetencia: selectedPO.orderDate ? selectedPO.orderDate.substring(0, 7) : (selectedPO.dataPedido ? selectedPO.dataPedido.substring(0, 7) : ''),
        dataVencimento: dueDate || selectedPO.deliveryDate || selectedPO.orderDate || '',
        valor: ((poi.quantity || poi.quantidade || 0) * (poi.price || poi.precoUnitario || poi.valor || 0)) || 0,
        purchaseOrderId: selectedPO.id
      }));
    } else {
      itemsToAdd = [{
        id: uuidv4(),
        categoria: category || selectedPO.category || 'Compras',
        subcategoria: subcategory || 'Consolidação de OC',
        fornecedor: selectedPO.supplierName,
        descricao: `Consolidado ${orderNumber} - Ref. Suprimentos / Compras`,
        mesCompetencia: selectedPO.orderDate ? selectedPO.orderDate.substring(0, 7) : (selectedPO.dataPedido ? selectedPO.dataPedido.substring(0, 7) : ''),
        dataVencimento: dueDate || selectedPO.deliveryDate || selectedPO.orderDate || '',
        valor: selectedPO.total || selectedPO.valorTotal || 0,
        purchaseOrderId: selectedPO.id
      }];
    }

    const updatedAporte = {
      ...targetAporte,
      items: [
        ...(targetAporte.items || []),
        ...itemsToAdd
      ]
    };

    setAportes(aportes.map((a: Aporte) => a.id === updatedAporte.id ? updatedAporte : a));
    
    if (setPurchaseOrders && purchaseOrders) {
      const updatedPurchaseOrders = purchaseOrders.map((po: any) => 
        po.id === selectedPO.id ? { ...po, aporteId: targetAporteId } : po
      );
      setPurchaseOrders(updatedPurchaseOrders);
    }

    setIsPOIncludeOpen(false);
    setSelectedPO(null);
    
    // Switch to target Aporte view
    setSelectedAporteId(updatedAporte.id);
    setActiveTab('aportes');
  };

  const handlePrintPO = (po: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '1024px';
    iframe.style.height = '1024px';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    
    if (!iframe.contentWindow) return;
    
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(n => n.outerHTML).join('\n');
      
    const itemsHtml = (po.items || []).map((item: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: bold; color: #1e293b;">${item.code || item.codigo || '-'}</td>
        <td style="padding: 8px;">${item.description || item.descricao || ''}</td>
        <td style="padding: 8px; text-align: center;">${item.unit || item.unidade || ''}</td>
        <td style="padding: 8px; text-align: center;">${item.quantity || item.quantidade || 0}</td>
        <td style="padding: 8px; text-align: right;">R$ ${(item.price || item.precoUnitario || item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${((item.quantity || item.quantidade || 0) * (item.price || item.precoUnitario || item.valor || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const conditionsHtml = (po.paymentConditions || []).map((cond: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-weight: 550;">${cond.condition || cond.condicao || ''}</td>
        <td style="padding: 8px; text-align: center;">${cond.dueDate || cond.dataVencimento ? new Date(cond.dueDate || cond.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${(cond.value || cond.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; font-size: 11px; color: #64748b;">${cond.observation || cond.observacao || ''}</td>
      </tr>
    `).join('');

    const printContents = `
      <div style="font-family: system-ui, sans-serif; color: #1e293b; padding: 24px; max-width: 800px; margin: 0 auto; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a;">CONSTRUTORA MASTER S.A.</h1>
            <p style="font-size: 11px; color: #94a3b8; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">LOGÍSTICA INTEGRADA E SUPRIMENTOS</p>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 18px; font-weight: 800; color: #2563eb; margin: 0; text-transform: uppercase;">ORDEM DE COMPRA</h2>
            <p style="font-size: 12px; font-weight: bold; margin: 4px 0 0 0;">OC #${po.orderNumber || po.numero || ''}</p>
          </div>
        </div>

        <div style="background: #1e293b; color: white; padding: 6px 12px; font-weight: bold; text-transform: uppercase; border-radius: 4px; display: flex; justify-content: space-between; margin-bottom: 16px;">
          <span>Pedido de Suprimentos Oficial</span>
          <span>Status: ${po.status === 'approved' ? 'Aprovada' : po.status === 'sent' ? 'Enviada' : po.status === 'delivered' ? 'Entregue' : po.status === 'cancelled' ? 'Cancelada' : po.status === 'finalizada' ? 'Finalizada' : po.status === 'waiting_delivery' ? 'Aguardando Entrega' : 'Em Elaboração'}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
          <div>
            <div style="margin-bottom: 4px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px;">Fornecedor:</strong> <span>${po.supplierName}</span></div>
            <div style="margin-bottom: 4px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px;">Data Pedido:</strong> <span>${po.orderDate || po.dataPedido ? new Date(po.orderDate || po.dataPedido).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</span></div>
            <div style="margin-bottom: 4px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px;">Data Prevista:</strong> <span>${po.deliveryDate || po.dataEntrega ? new Date(po.deliveryDate || po.dataEntrega).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</span></div>
          </div>
          <div>
            <div style="margin-bottom: 4px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px;">Centro Custo:</strong> <span>${po.costCenter || po.centroCusto || 'Geral'}</span></div>
            <div style="margin-bottom: 4px;"><strong style="color: #64748b; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px;">Categoria:</strong> <span>${po.category || 'Suprimentos'}</span></div>
          </div>
        </div>

        <div style="background: #2563eb; color: white; padding: 4px 8px; font-weight: bold; font-size: 13px; border-radius: 2px; margin-bottom: 8px;">Itens do Pedido</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: bold; color: #1e293b;">
              <th style="padding: 8px; text-align: center; width: 40px;">Item</th>
              <th style="padding: 8px; text-align: left; width: 100px;">Código</th>
              <th style="padding: 8px; text-align: left;">Descrição</th>
              <th style="padding: 8px; text-align: center; width: 60px;">Unidade</th>
              <th style="padding: 8px; text-align: center; width: 80px;">Qtd</th>
              <th style="padding: 8px; text-align: right; width: 100px;">Preço Unit.</th>
              <th style="padding: 8px; text-align: right; width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <div style="width: 300px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;"><strong>Subtotal:</strong> <span>R$ ${(po.total || po.subtotal || po.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #ef4444;"><strong>Descontos:</strong> <span>R$ ${(po.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px;"><strong>Total Geral:</strong> <span>R$ ${(po.total || po.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        ${conditionsHtml ? `
        <div style="background: #2563eb; color: white; padding: 4px 8px; font-weight: bold; font-size: 13px; border-radius: 2px; margin-bottom: 8px;">Condições de Pagamento</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: bold; color: #1e293b;">
              <th style="padding: 8px; text-align: left;">Parcela / Condição</th>
              <th style="padding: 8px; text-align: center; width: 120px;">Vencimento</th>
              <th style="padding: 8px; text-align: right; width: 120px;">Valor</th>
              <th style="padding: 8px; text-align: left;">Observação</th>
            </tr>
          </thead>
          <tbody>
            ${conditionsHtml}
          </tbody>
        </table>
        ` : ''}

        ${po.observations || po.observacoes ? `
        <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
          <strong style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Observações Importantes:</strong>
          <span style="font-size: 12px; color: #475569; line-height: 1.5;">${po.observations || po.observacoes}</span>
        </div>
        ` : ''}

        <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8;">
          Este documento foi gerado digitalmente e é válido sem assinaturas manuais se submetido pelo sistema de aprovação integrado.
        </div>
      </div>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem_Compra_${po.orderNumber || po.numero || 'S-N'}</title>
          ${styles}
          <style>
             @page { margin: 8mm; }
             body { 
               background: white; 
               margin: 0;
               padding: 0;
             }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                document.body.removeChild(window.frameElement);
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
  };

  const aportesCompany = useMemo(() => {
    return aportes.filter((a: Aporte) => {
      const matchCompany = !currentUser?.companyId || a.companyId === currentUser.companyId;
      const matchContract = selectedContractId === 'all' || a.contractId === selectedContractId || !a.contractId;
      return matchCompany && matchContract;
    });
  }, [aportes, currentUser, selectedContractId]);

  const sortedAportesForInclusion = useMemo(() => {
    return [...aportesCompany].sort((a, b) => {
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      const numA = a.numero || '';
      const numB = b.numero || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [aportesCompany]);

  React.useEffect(() => {
    if (aportesCompany.length > 0) {
      const exists = aportesCompany.some((a: Aporte) => a.id === selectedAporteId);
      if (!exists) {
        const sortedByDate = [...aportesCompany].sort((a, b) => {
          const dateDiff = new Date(b.data).getTime() - new Date(a.data).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (b.numero || '').localeCompare(a.numero || '');
        });
        setSelectedAporteId(sortedByDate[0].id);
      }
    }
  }, [aportesCompany, selectedAporteId]);

  const selectedAporte = aportesCompany.find((a: Aporte) => a.id === selectedAporteId);

  const renderItemsSortIndicator = (key: string) => {
    if (!itemsSortConfig || itemsSortConfig.key !== key) {
      return <span className="text-slate-300 ml-1 text-xs">↕</span>;
    }
    return itemsSortConfig.direction === 'asc' ? <span className="text-blue-600 ml-1 text-xs">▲</span> : <span className="text-blue-600 ml-1 text-xs">▼</span>;
  };

  const renderAportesSortIndicator = (key: string) => {
    if (!aportesSortConfig || aportesSortConfig.key !== key) {
      return <span className="text-slate-300 ml-1 text-xs">↕</span>;
    }
    return aportesSortConfig.direction === 'asc' ? <span className="text-blue-600 ml-1 text-xs">▲</span> : <span className="text-blue-600 ml-1 text-xs">▼</span>;
  };

  const handleItemsSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (itemsSortConfig && itemsSortConfig.key === key && itemsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setItemsSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    if (!selectedAporte || !selectedAporte.items) return [];
    const sortableItems = [...selectedAporte.items];
    if (itemsSortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let valA = a[itemsSortConfig.key] || '';
        let valB = b[itemsSortConfig.key] || '';
        if (valA < valB) return itemsSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return itemsSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [selectedAporte, itemsSortConfig]);

  const handleAportesSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (aportesSortConfig && aportesSortConfig.key === key && aportesSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setAportesSortConfig({ key, direction });
  };

  const sortedAportes = useMemo(() => {
    const sortable = [...aportesCompany];
    if (aportesSortConfig !== null) {
      sortable.sort((a: any, b: any) => {
        let valA = a[aportesSortConfig.key] || '';
        let valB = b[aportesSortConfig.key] || '';
        if (aportesSortConfig.key === 'valorTotal') {
          valA = calculateTotal(a);
          valB = calculateTotal(b);
        }
        if (valA < valB) return aportesSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return aportesSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [aportesCompany, aportesSortConfig]);

  const allItems = useMemo(() => aportesCompany.flatMap((a: Aporte) => a.items || []), [aportesCompany]);
  const uniqueCategories = useMemo(() => Array.from(new Set(allItems.map((i: AporteItem) => i.categoria).filter(Boolean))), [allItems]);
  const uniqueSubcategories = useMemo(() => Array.from(new Set(allItems.map((i: AporteItem) => i.subcategoria).filter(Boolean))), [allItems]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(allItems.map((i: AporteItem) => i.fornecedor).filter(Boolean))), [allItems]);

  const generateNumeroAporte = () => {
    const year = new Date().getFullYear().toString();
    const aportesThisYear = aportesCompany.filter((a: Aporte) => a.numero?.endsWith(`/${year}`));
    if (aportesThisYear.length === 0) {
      return `001/${year}`;
    }
    const maxNumber = Math.max(...aportesThisYear.map((a: Aporte) => {
      const parts = a.numero.split('/');
      return parts.length === 2 ? parseInt(parts[0], 10) : 0;
    }).filter((n: number) => !isNaN(n)));
    
    return `${String(maxNumber + 1).padStart(3, '0')}/${year}`;
  };

  // ---- Aporte Actions ----
  const openNewAporteDialog = () => {
    setEditingAporte(null);
    setAporteFormData({
      numero: generateNumeroAporte(),
      data: new Date().toISOString().split('T')[0],
    });
    setIsAporteDialogOpen(true);
  };

  const openEditAporteDialog = (aporte: Aporte) => {
    setEditingAporte(aporte);
    setAporteFormData({ ...aporte });
    setIsAporteDialogOpen(true);
  };

  const handleSaveAporte = () => {
    const newAporte: Aporte = {
      id: editingAporte?.id || uuidv4(),
      companyId: currentUser?.companyId || '',
      contractId: selectedContractId !== 'all' ? selectedContractId : undefined,
      numero: aporteFormData.numero || '',
      data: aporteFormData.data || new Date().toISOString().split('T')[0],
      items: editingAporte?.items || []
    };

    if (editingAporte) {
      setAportes(aportes.map((a: Aporte) => a.id === editingAporte.id ? newAporte : a));
    } else {
      setAportes([...aportes, newAporte]);
      setSelectedAporteId(newAporte.id);
      setActiveTab('aportes');
    }
    setIsAporteDialogOpen(false);
  };

  const handleDeleteAporteConfirm = () => {
    if (aporteToDelete) {
      setAportes(aportes.filter((a: Aporte) => a.id !== aporteToDelete));
      if (selectedAporteId === aporteToDelete) setSelectedAporteId(null);
      setAporteToDelete(null);
    }
  };

  const requestDeleteAporte = (id: string) => {
    setAporteToDelete(id);
  };

  // ---- Item Actions ----
  const openNewItemDialog = () => {
    setEditingItem(null);
    setItemFormData({
      categoria: '',
      subcategoria: '',
      fornecedor: '',
      descricao: '',
      mesCompetencia: '',
      dataVencimento: '',
      valor: 0
    });
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: AporteItem) => {
    setEditingItem(item);
    
    const rawVencimento = item.dataVencimento || (item as any).data_vencimento || '';
    const rawCompetencia = item.mesCompetencia || (item as any).mes_competencia || '';
    
    let formattedVencimento = '';
    if (rawVencimento) {
      const isCompliant = typeof rawVencimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawVencimento.substring(0, 10));
      if (isCompliant) {
        formattedVencimento = rawVencimento.substring(0, 10);
      } else {
        try {
          formattedVencimento = new Date(rawVencimento).toISOString().substring(0, 10);
        } catch (_) {
          formattedVencimento = '';
        }
      }
    }

    let formattedCompetencia = '';
    if (rawCompetencia) {
      const isCompliant = typeof rawCompetencia === 'string' && /^\d{4}-\d{2}$/.test(rawCompetencia.substring(0, 7));
      if (isCompliant) {
        formattedCompetencia = rawCompetencia.substring(0, 7);
      } else {
        try {
          formattedCompetencia = new Date(rawCompetencia).toISOString().substring(0, 7);
        } catch (_) {
          formattedCompetencia = '';
        }
      }
    }

    setItemFormData({ 
      ...item,
      mesCompetencia: formattedCompetencia || rawCompetencia,
      dataVencimento: formattedVencimento || rawVencimento,
    });
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!selectedAporte) return;

    const newItem: any = {
      id: editingItem?.id || uuidv4(),
      categoria: itemFormData.categoria || '',
      subcategoria: itemFormData.subcategoria || '',
      fornecedor: itemFormData.fornecedor || '',
      descricao: itemFormData.descricao || '',
      mesCompetencia: itemFormData.mesCompetencia || '',
      dataVencimento: itemFormData.dataVencimento || '',
      valor: Number(itemFormData.valor) || 0,
    };

    const updatedItems = editingItem 
      ? (selectedAporte.items || []).map(i => i.id === editingItem.id ? newItem : i)
      : [...(selectedAporte.items || []), newItem];

    const updatedAporte = { ...selectedAporte, items: updatedItems };
    setAportes(aportes.map((a: Aporte) => a.id === updatedAporte.id ? updatedAporte : a));
    setIsItemDialogOpen(false);
  };

  const handleDeleteItemConfirm = () => {
    if (!selectedAporte || !itemToDelete) return;
    const updatedItems = (selectedAporte.items || []).filter(i => i.id !== itemToDelete);
    const updatedAporte = { ...selectedAporte, items: updatedItems };
    setAportes(aportes.map((a: Aporte) => a.id === updatedAporte.id ? updatedAporte : a));
    setItemToDelete(null);
  };

  const requestDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const handlePrint = (aporte: Aporte) => {
    // Basic print solution, triggering browser's print
    // For a real app, you would format a hidden print-only div and then call window.print
    window.print();
  };

  const handleExportPDF = (aporte: Aporte) => {
    try {
      const doc = new jsPDF();
      doc.text(`Aporte: ${aporte.numero}`, 14, 20);
      doc.text(`Data: ${aporte.data ? new Date(aporte.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}`, 14, 30);
      const total = calculateTotal(aporte);
      doc.text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`, 14, 40);

      const tableColumn = ["Categoria", "Subcategoria", "Fornecedor", "Descrição", "Vencimento", "Valor"];
      const tableRows: any[] = [];

      if (aporte.items) {
        aporte.items.forEach(item => {
          const itemData = [
            item.categoria || '',
            item.subcategoria || '',
            item.fornecedor || '',
            item.descricao || '',
            item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor || 0),
          ];
          tableRows.push(itemData);
        });
      }

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
      });

      doc.save(`Aporte_${aporte.numero.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF.');
    }
  };

  const handleExportExcel = (aporte: Aporte) => {
    try {
      const tableRows = (aporte.items || []).map(item => ({
        Categoria: item.categoria || '',
        Subcategoria: item.subcategoria || '',
        Fornecedor: item.fornecedor || '',
        Descrição: item.descricao || '',
        Vencimento: item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '',
        Valor: item.valor || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(tableRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Aporte");
      XLSX.writeFile(workbook, `Aporte_${aporte.numero.replace(/\//g, '-')}.xlsx`);
    } catch(err) {
      console.error(err);
      alert('Erro ao gerar Excel.');
    }
  };

  const downloadTemplate = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("Instruções de Importação de Aportes", 14, 20);
      
      doc.setFontSize(10);
      doc.text("Siga as orientações abaixo para importar seus aportes via Excel:", 14, 30);
      doc.text("1. Crie uma planilha Excel em branco.", 14, 38);
      doc.text("2. Na primeira linha (linha 1), adicione exatamente as TAGs listadas abaixo, uma em cada coluna.", 14, 46);
      doc.text("3. A ordem das colunas não importa, contanto que as TAGs estejam corretas.", 14, 54);
      doc.text("4. Nas linhas seguintes (linha 2 em diante), insira os respectivos valores.", 14, 62);
      doc.text("5. Salve o arquivo e faça o upload (.xlsx ou .xls).", 14, 70);

      autoTable(doc, {
         startY: 78,
         head: [['TAG Exata (Linha 1)', 'Descrição', 'Obrigatório?']],
         body: [
            ['[NUMERO_APORTE]', 'Número do aporte a ser vinculado ou criado (ex: 001/2026)', 'SIM'],
            ['[CATEGORIA]', 'Categoria do custo ou tipo de gasto', 'SIM'],
            ['[SUBCATEGORIA]', 'Subcategoria do item', 'NÃO'],
            ['[FORNECEDOR]', 'Nome do fornecedor', 'SIM'],
            ['[DESCRICAO]', 'Descrição detalhada do item ou serviço', 'SIM'],
            ['[MES_COMPETENCIA]', 'Mês de competência (ex: 01/2026)', 'NÃO'],
            ['[VENCIMENTO]', 'Data de vencimento (ex: 2026-12-31 ou padrão Excel)', 'SIM'],
            ['[VALOR]', 'Valor numérico (ex: 1500.50)', 'SIM']
         ]
      });

      doc.save('Instrucoes_Importacao_Aportes_TAGS.pdf');
    } catch (err) {
      console.error(err);
      alert('Erro ao baixar modelo.');
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isImporting) return;
    setIsImporting(true);

    const parseDate = (val: any) => {
      if (!val) return '';
      if (val instanceof Date) {
         return val.toISOString().split('T')[0];
      }
      if (typeof val === 'number') {
         const date = new Date(Math.round((val - 25569) * 86400 * 1000));
         return date.toISOString().split('T')[0];
      }
      if (typeof val === 'string') {
         const parts = val.split(/[\/\-]/);
         if (parts.length === 3) {
            const day = parts[0];
            const month = parts[1];
            let year = parts[2];
            if (year.length === 2) {
               year = `20${year}`;
            }
            if (year.length === 4) {
               if (day.length === 4) {
                  return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
               }
               return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
         }
         const d = new Date(val);
         if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
         }
      }
      return '';
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let newAportes = [...aportes];
        let itemsCount = 0;
        let aportesAdded = 0;

        // Group rows by new tag formatting or old as fallback
        const groupedByAporte: Record<string, any[]> = {};
        data.forEach((row: any) => {
          const numeroAporte = row['[NUMERO_APORTE]'] || row['Número do Aporte'] || row['Numero do Aporte'] || selectedAporte?.numero;
          if (!numeroAporte) return; // Skip if we have no way to link to an aporte
          if (!groupedByAporte[numeroAporte]) {
            groupedByAporte[numeroAporte] = [];
          }
          groupedByAporte[numeroAporte].push(row);
        });

        Object.keys(groupedByAporte).forEach(numeroAporte => {
          const rows = groupedByAporte[numeroAporte];
          const importedItems: AporteItem[] = rows.map((row: any) => ({
            id: uuidv4(),
            categoria: row['[CATEGORIA]'] || row.Categoria || '',
            subcategoria: row['[SUBCATEGORIA]'] || row.Subcategoria || '',
            fornecedor: row['[FORNECEDOR]'] || row.Fornecedor || '',
            descricao: row['[DESCRICAO]'] || row.Descrição || row.Descricao || '',
            mesCompetencia: row['[MES_COMPETENCIA]'] || row['Mês Competencia'] || row.MesCompetencia || '',
            dataVencimento: parseDate(row['[VENCIMENTO]'] || row.Vencimento),
            valor: Number(row['[VALOR]'] || row.Valor) || 0,
          }));

          itemsCount += importedItems.length;

          const existingIndex = newAportes.findIndex(a => a.numero === numeroAporte 
            && (!currentUser?.companyId || a.companyId === currentUser.companyId)
            && (selectedContractId === 'all' || a.contractId === selectedContractId || !a.contractId)
          );

          if (existingIndex >= 0) {
            newAportes[existingIndex] = {
              ...newAportes[existingIndex],
              items: [...(newAportes[existingIndex].items || []), ...importedItems]
            };
          } else {
            // Create new aporte
            newAportes.push({
              id: uuidv4(),
              companyId: currentUser?.companyId || '',
              contractId: selectedContractId !== 'all' ? selectedContractId : undefined,
              numero: numeroAporte,
              data: new Date().toISOString().split('T')[0], // Default data for new
              items: importedItems
            });
            aportesAdded++;
          }
        });

        if (itemsCount > 0) {
          // Set to local state so UI updates immediately
          setAportes(newAportes);

          // Force Supabase sync verification before showing success
          const config = getSupabaseConfig();
          if (config.enabled && config.url && config.key && currentUser?.companyId) {
             const supabase = createSupabaseClient(config.url, config.key);
             if (supabase) {
                const blobId = `${currentUser.companyId}_sigo_aportes`;
                
                // Using upsert with mapped snake_case data structure for backend compatibility if necessary,
                // but since these are store blobs in app_state, we just put content straight away.
                const { error: blobError } = await supabase.from('app_state').upsert({
                   id: blobId,
                   content: newAportes,
                   updated_at: new Date().toISOString()
                });
                
                if (blobError) {
                   alert("Atenção: Os dados foram processados localmente, mas ocorreu um erro ao salvar na nuvem Supabase. Verifique sua conexão e tente sincronizar manualmente.");
                   console.error("Supabase Import Error:", blobError);
                   setIsImporting(false);
                   return;
                }

                // Also persist to actual relational tables: 'aportes' and 'aporte_items'
                const aportesToUpsert = newAportes.map(a => ({
                   id: a.id,
                   company_id: a.companyId,
                   contract_id: a.contractId || null,
                   numero: a.numero,
                   data: a.data || null,
                   notes: a.notes || null,
                   status: a.status || 'Pendente',
                   total_value: a.totalValue || 0,
                   updated_at: new Date().toISOString()
                }));
                const { error: tError } = await supabase.from('aportes').upsert(aportesToUpsert);

                if (!tError) {
                   const itemsToInsert = newAportes.flatMap(a => (a.items || []).map(item => ({
                      id: item.id,
                      aporte_id: a.id,
                      categoria: item.categoria || '',
                      subcategoria: item.subcategoria || '',
                      fornecedor: item.fornecedor || '',
                      descricao: item.descricao || '',
                      mes_competencia: item.mesCompetencia || '',
                      data_vencimento: item.dataVencimento || null,
                      valor: item.valor || 0
                   })));

                   // Upsert all items
                   if (itemsToInsert.length > 0) {
                      // Process in chunks to avoid single request limits
                      const chunkSize = 100;
                      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
                         const chunk = itemsToInsert.slice(i, i + chunkSize);
                         await supabase.from('aporte_items').upsert(chunk);
                      }
                   }
                }
             }
          }
          
          alert(`${itemsCount} itens importados e salvos com sucesso! ${aportesAdded > 0 ? `(${aportesAdded} novos aportes criados)` : ''}`);
        } else {
           alert("Nenhum dado válido encontrado. Certifique-se de que a TAG '[NUMERO_APORTE]' está preenchida.");
        }
      } catch (err) {
        alert("Erro ao importar arquivo Excel. Verifique o arquivo enviado.");
        console.error(err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input
    e.target.value = '';
  };

  const calculateTotal = (aporte: Aporte) => {
    return (aporte.items || []).reduce((acc, item) => acc + (item.valor || 0), 0);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-gradient-to-r from-emerald-950 to-indigo-900 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            <Calculator className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <span className="text-sm bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider">Setor Logística Financeira</span>
            <h1 className="text-4xl font-black tracking-tight mt-1">Diretoria Financeira</h1>
            <p className="text-emerald-100/80 text-base mt-1">Controle de caixa, fluxo de pagamentos, aportes de investimentos e conciliação bancária.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border rounded-xl p-1">
          <TabsTrigger value="aportes" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Aportes</TabsTrigger>
          <TabsTrigger value="resumo-aportes" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Gestão de Aportes</TabsTrigger>
          <TabsTrigger value="caixa" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Controle de Caixa</TabsTrigger>
          <TabsTrigger value="compras" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Compras
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="aportes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gestão de Aportes</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Instruções (PDF)
                  </Button>
                  <div className="relative">
                    <Input type="file" accept=".xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImportExcel} title="Importar Planilha" disabled={isImporting} />
                    <Button variant="outline" className="flex items-center gap-2 pointer-events-none" disabled={isImporting}>
                        <Upload className="w-4 h-4" /> {isImporting ? 'Importando...' : 'Importar Planilha'}
                    </Button>
                  </div>
                  {selectedAporte && (
                    <Button onClick={openNewItemDialog} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </Button>
                  )}
                  <Button onClick={openNewAporteDialog} variant={selectedAporte ? 'outline' : 'default'} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Aporte
                  </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col gap-2 max-w-sm">
                  <Label>Selecione um Aporte para gerenciar</Label>
                  <Select value={selectedAporteId || ''} onValueChange={setSelectedAporteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum aporte selecionado" />
                    </SelectTrigger>
                    <SelectContent>
                      {aportesCompany.map((a: Aporte) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.numero} - {a.data ? new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAporte && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-blue-900">Aporte {selectedAporte.numero}</h3>
                        <p className="text-sm text-blue-700">Data: {selectedAporte.data ? new Date(selectedAporte.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-700">Valor Total</p>
                        <p className="text-xl font-bold border-t border-blue-200 mt-1 pt-1 text-blue-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal(selectedAporte))}
                        </p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead onClick={() => handleItemsSort('categoria')} className="cursor-pointer hover:bg-slate-50">Categoria / Subcategoria {renderItemsSortIndicator('categoria')}</TableHead>
                          <TableHead onClick={() => handleItemsSort('fornecedor')} className="cursor-pointer hover:bg-slate-50">Fornecedor {renderItemsSortIndicator('fornecedor')}</TableHead>
                          <TableHead onClick={() => handleItemsSort('descricao')} className="cursor-pointer hover:bg-slate-50">Descrição {renderItemsSortIndicator('descricao')}</TableHead>
                          <TableHead onClick={() => handleItemsSort('dataVencimento')} className="cursor-pointer hover:bg-slate-50">Vencimento {renderItemsSortIndicator('dataVencimento')}</TableHead>
                          <TableHead onClick={() => handleItemsSort('valor')} className="text-right cursor-pointer hover:bg-slate-50">Valor {renderItemsSortIndicator('valor')}</TableHead>
                          <TableHead className="text-center w-[120px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!selectedAporte.items || selectedAporte.items.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-500 py-6">
                              Nenhum item adicionado a este aporte.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedItems.map((item: AporteItem) => (
                            <TableRow key={item.id}>
                              <TableCell className="break-words whitespace-normal max-w-[150px]">
                                <div className="font-medium text-slate-900">{item.categoria}</div>
                                <div className="text-xs text-slate-500">{item.subcategoria}</div>
                              </TableCell>
                              <TableCell className="break-words whitespace-normal max-w-[180px]">{item.fornecedor}</TableCell>
                              <TableCell className="break-words whitespace-normal max-w-[300px]">{item.descricao}</TableCell>
                              <TableCell>
                                {item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditItemDialog(item)} title="Editar" className="h-8 w-8 p-0">
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => requestDeleteItem(item.id)} title="Excluir" className="h-8 w-8 p-0">
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo-aportes">
          <Card>
            <CardHeader>
                <CardTitle>Gestão de Aportes</CardTitle>
            </CardHeader>
            <CardContent>
              {aportesCompany.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  Nenhum aporte cadastrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleAportesSort('numero')} className="cursor-pointer hover:bg-slate-50">Número do Aporte {renderAportesSortIndicator('numero')}</TableHead>
                        <TableHead onClick={() => handleAportesSort('data')} className="cursor-pointer hover:bg-slate-50">Data {renderAportesSortIndicator('data')}</TableHead>
                        <TableHead onClick={() => handleAportesSort('valorTotal')} className="text-right cursor-pointer hover:bg-slate-50">Valor Total {renderAportesSortIndicator('valorTotal')}</TableHead>
                        <TableHead className="text-center w-[200px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAportes.map((aporte: Aporte) => (
                        <TableRow key={aporte.id}>
                          <TableCell className="font-medium">{aporte.numero}</TableCell>
                          <TableCell>
                            {aporte.data ? new Date(aporte.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal(aporte))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {/* Option to open this Aporte in the first tab to view/manage its items */}
                              <Button variant="ghost" size="icon" onClick={() => {
                                setSelectedAporteId(aporte.id);
                                setActiveTab('aportes');
                              }} title="Visualizar Itens">
                                <Plus className="w-4 h-4 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditAporteDialog(aporte)} title="Editar Aporte">
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handlePrint(aporte)} title="Imprimir">
                                <Printer className="w-4 h-4 text-slate-600" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Exportar">
                                    <Download className="w-4 h-4 text-orange-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleExportPDF(aporte)} className="gap-2">
                                    <FileText className="w-4 h-4 text-red-600" /> Exportar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportExcel(aporte)} className="gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button variant="ghost" size="icon" onClick={() => requestDeleteAporte(aporte.id)} title="Excluir">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caixa">
          <Card>
            <CardHeader>
                <CardTitle>Controle de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-500">Conteúdo para a seção de Controle de Caixa será implementado aqui.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compras">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="text-blue-600 w-5 h-5" /> Ordens de Compra (Setor de Suprimentos)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Visualizar, imprimir ou incluir ordens de compra em aportes financeiros ativos para controle consolidado.
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Pesquisar OC, Fornecedor ou Categoria..." 
                  className="pl-9 text-xs rounded-xl"
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                />
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              {displayedPOs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                  <ShoppingBag className="w-12 h-12 text-slate-300" />
                  <span className="font-semibold text-slate-600">Nenhuma Ordem de Compra localizada</span>
                  <span className="text-xs text-slate-400 max-w-sm">Tente redefinir sua busca ou gere registros no módulo de Compras para exibi-los aqui.</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[110px] font-bold">Número OC</TableHead>
                        <TableHead className="font-bold">Fornecedor</TableHead>
                        <TableHead className="w-[110px] font-bold">Data Pedido</TableHead>
                        <TableHead className="w-[150px] font-bold">Categoria</TableHead>
                        <TableHead className="text-right w-[140px] font-bold">Valor Total</TableHead>
                        <TableHead className="text-center w-[110px] font-bold">Status</TableHead>
                        <TableHead className="text-center w-[180px] font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPOs.map((po: any) => {
                        const statusColors: Record<string, string> = {
                          draft: "bg-slate-100 text-slate-700 border-slate-200",
                          approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          sent: "bg-blue-50 text-blue-700 border-blue-200",
                          delivered: "bg-purple-50 text-purple-700 border-purple-200",
                          cancelled: "bg-red-50 text-red-700 border-red-200",
                          finalizada: "bg-gray-100 text-gray-700 border-gray-200",
                          waiting_delivery: "bg-amber-50 text-amber-700 border-amber-200"
                        };
                        const statusLabels: Record<string, string> = {
                          draft: "Rascunho",
                          approved: "Aprovada",
                          sent: "Enviada",
                          delivered: "Entregue",
                          cancelled: "Cancelada",
                          finalizada: "Finalizada",
                          waiting_delivery: "Aguardando Entrega"
                        };
                        
                        const poNum = po.orderNumber || po.numero || '';
                        const poVal = po.total || po.valorTotal || 0;
                        const poDate = po.orderDate || po.dataPedido || '';

                        return (
                          <TableRow key={po.id} className="hover:bg-slate-50/40 transition-colors">
                            <TableCell className="font-bold text-blue-600">
                              {poNum}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800">
                              {po.supplierName}
                            </TableCell>
                            <TableCell>
                              {poDate ? new Date(poDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                            </TableCell>
                            <TableCell className="text-slate-500 font-medium">
                              {po.category || 'Suprimentos'}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-950">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(poVal)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide border ${statusColors[po.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {statusLabels[po.status] || po.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-indigo-600 border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50 hover:text-indigo-700 transition font-bold"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setIsPOPreviewOpen(true);
                                  }}
                                  title="Visualizar Ordem de Compra"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-slate-600 border-slate-100 hover:bg-slate-100 transition"
                                  onClick={() => handlePrintPO(po)}
                                  title="Imprimir Ordem de Compra"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-emerald-600 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 hover:text-emerald-700 transition font-bold"
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setIncludePOFormData(prev => ({
                                      ...prev,
                                      targetAporteId: sortedAportesForInclusion[0]?.id || '',
                                      dueDate: po.deliveryDate || po.orderDate || ''
                                    }));
                                    setIsPOIncludeOpen(true);
                                  }}
                                  title="Incluir no Aporte"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Aporte
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aporte Form Dialog (Just Number and Date) */}
      <Dialog open={isAporteDialogOpen} onOpenChange={setIsAporteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingAporte ? 'Editar Aporte' : 'Novo Aporte'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Número do Aporte</Label>
              <Input value={aporteFormData.numero || ''} readOnly className="bg-slate-100" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                type="date" 
                value={aporteFormData.data || ''} 
                onChange={(e) => setAporteFormData({...aporteFormData, data: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAporteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAporte}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aporte Item Form Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
               <Label>Categoria</Label>
               <Input 
                 list="categorias-list"
                 value={itemFormData.categoria || ''}
                 onChange={(e) => setItemFormData({...itemFormData, categoria: e.target.value})}
                 placeholder="Digite para filtrar ou criar nova"
               />
               <datalist id="categorias-list">
                 {uniqueCategories.map((cat: any) => <option key={cat} value={cat} />)}
               </datalist>
            </div>
            <div className="space-y-2">
               <Label>Subcategoria</Label>
               <Input 
                 list="subcategorias-list"
                 value={itemFormData.subcategoria || ''}
                 onChange={(e) => setItemFormData({...itemFormData, subcategoria: e.target.value})}
                 placeholder="Digite para filtrar ou criar nova"
               />
               <datalist id="subcategorias-list">
                 {uniqueSubcategories.map((scat: any) => <option key={scat} value={scat} />)}
               </datalist>
            </div>

            <div className="space-y-2 col-span-2">
               <Label>Fornecedor</Label>
               <Input 
                 list="fornecedores-list"
                 value={itemFormData.fornecedor || ''}
                 onChange={(e) => setItemFormData({...itemFormData, fornecedor: e.target.value})}
                 placeholder="Digite para filtrar fornecedor"
               />
               <datalist id="fornecedores-list">
                 {uniqueSuppliers.map((forn: any) => <option key={forn} value={forn} />)}
               </datalist>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Descrição</Label>
              <Input 
                value={itemFormData.descricao || ''} 
                onChange={(e) => setItemFormData({...itemFormData, descricao: e.target.value})} 
                placeholder="Descrição do item"
              />
            </div>

            <div className="space-y-2">
              <Label>Mês de Competência</Label>
              <Input 
                type="month" 
                value={itemFormData.mesCompetencia || ''} 
                onChange={(e) => setItemFormData({...itemFormData, mesCompetencia: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Vencimento</Label>
              <Input 
                type="date" 
                value={itemFormData.dataVencimento || ''} 
                onChange={(e) => setItemFormData({...itemFormData, dataVencimento: e.target.value})} 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Valor do Item</Label>
              <Input 
                type="number" 
                step="0.01"
                value={itemFormData.valor || ''} 
                onChange={(e) => setItemFormData({...itemFormData, valor: parseFloat(e.target.value)})} 
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aporteToDelete} onOpenChange={(open) => !open && setAporteToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Aporte</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza que deseja excluir este aporte? Todos os seus itens serão perdidos.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAporteToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAporteConfirm}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza que deseja excluir este item?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteItemConfirm}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog for OC detailed view */}
      <Dialog open={isPOPreviewOpen} onOpenChange={setIsPOPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" /> Detalhamento da Ordem de Compra
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                <div>
                  <p className="text-slate-500 font-medium">Ordem de Compra:</p>
                  <p className="font-bold text-sm text-slate-900">{selectedPO.orderNumber || selectedPO.numero}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium font-semibold">Valor Total Geral:</p>
                  <p className="font-extrabold text-sm text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPO.total || selectedPO.valorTotal || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Fornecedor:</p>
                  <p className="font-bold text-sm text-slate-900">{selectedPO.supplierName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Centro de Custo / Local:</p>
                  <p className="font-semibold text-slate-800">{selectedPO.costCenter || selectedPO.centroCusto || 'Geral'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Data Pedido:</p>
                  <p className="font-semibold text-slate-800">
                    {selectedPO.orderDate || selectedPO.dataPedido ? new Date(selectedPO.orderDate || selectedPO.dataPedido).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Data Prevista de Entrega:</p>
                  <p className="font-semibold text-slate-800">
                    {selectedPO.deliveryDate || selectedPO.dataEntrega ? new Date(selectedPO.deliveryDate || selectedPO.dataEntrega).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 border-b pb-1 text-xs uppercase tracking-wider">Itens do Pedido ({selectedPO.items?.length || 0})</h3>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="py-2 h-8 font-semibold">Cód</TableHead>
                        <TableHead className="py-2 h-8 font-semibold">Descrição</TableHead>
                        <TableHead className="text-center py-2 h-8 font-semibold">Un</TableHead>
                        <TableHead className="text-center py-2 h-8 font-semibold text-right">Qtd</TableHead>
                        <TableHead className="text-right py-2 h-8 font-semibold">Preço Unitário</TableHead>
                        <TableHead className="text-right py-2 h-8 font-semibold">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedPO.items || []).map((item: any, idx: number) => {
                        const qty = item.quantity || item.quantidade || 0;
                        const price = item.price || item.precoUnitario || item.valor || 0;
                        return (
                          <TableRow key={item.id || idx}>
                            <TableCell className="py-2 h-8 font-mono">{item.code || item.codigo || '-'}</TableCell>
                            <TableCell className="py-2 h-8 font-medium">{item.description || item.descricao || ''}</TableCell>
                            <TableCell className="text-center py-2 h-8">{item.unit || item.unidade || ''}</TableCell>
                            <TableCell className="text-right py-2 h-8">{qty}</TableCell>
                            <TableCell className="text-right py-2 h-8">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                            </TableCell>
                            <TableCell className="text-right py-2 h-8 font-bold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(qty * price)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedPO.paymentConditions && selectedPO.paymentConditions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 border-b pb-1 text-xs uppercase tracking-wider">Condições de Pagamento</h3>
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="py-2 h-8 font-semibold">Parcela / Condição</TableHead>
                          <TableHead className="text-center py-2 h-8 font-semibold">Vencimento</TableHead>
                          <TableHead className="text-right py-2 h-8 font-semibold">Valor</TableHead>
                          <TableHead className="py-2 h-8 font-semibold">Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.paymentConditions.map((cond: any, idx: number) => (
                          <TableRow key={cond.id || idx}>
                            <TableCell className="py-2 h-8 font-medium">{cond.condition || cond.condicao || ''}</TableCell>
                            <TableCell className="text-center py-2 h-8">
                              {cond.dueDate || cond.dataVencimento ? new Date(cond.dueDate || cond.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}
                            </TableCell>
                            <TableCell className="text-right py-2 h-8 font-bold text-slate-800">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cond.value || cond.valor || 0)}
                            </TableCell>
                            <TableCell className="py-2 h-8 text-slate-500">{cond.observation || cond.observacao || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedPO.observations && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-bold text-slate-700 mb-1">Observações:</p>
                  <p className="text-slate-600 italic leading-relaxed">{selectedPO.observations}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" className="rounded-xl px-5 text-xs font-semibold" onClick={() => setIsPOPreviewOpen(false)}>Fechar</Button>
            {selectedPO && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-1.5 text-xs"
                onClick={() => {
                  setIsPOPreviewOpen(false);
                  handlePrintPO(selectedPO);
                }}
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir OC
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for PO Include into Aporte */}
      <Dialog open={isPOIncludeOpen} onOpenChange={setIsPOIncludeOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-md font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" /> Incluir Ordem de Compra no Aporte
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 py-3 text-xs leading-normal">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-1 space-y-1">
                <div className="flex justify-between"><strong>OC Selecionada:</strong> <span className="font-bold text-blue-600">{selectedPO.orderNumber || selectedPO.numero}</span></div>
                <div className="flex justify-between"><strong>Fornecedor:</strong> <span className="font-medium">{selectedPO.supplierName}</span></div>
                <div className="flex justify-between"><strong>Valor Total Geral:</strong> <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPO.total || selectedPO.valorTotal || 0)}</span></div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Aporte de Destino *</Label>
                  {aportesCompany.length === 0 ? (
                    <p className="text-red-500 font-semibold py-1">Nenhum aporte ativo cadastrado! Crie um primeiro.</p>
                  ) : (
                    <Select 
                      value={includePOFormData.targetAporteId} 
                      onValueChange={(val) => setIncludePOFormData({ ...includePOFormData, targetAporteId: val })}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Selecione o Aporte destinar" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAportesForInclusion.map((a: Aporte) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            Aporte {a.numero} - {a.data ? new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Formato de Importação *</Label>
                  <Select 
                    value={includePOFormData.importMode} 
                    onValueChange={(val: any) => setIncludePOFormData({ ...includePOFormData, importMode: val })}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Escolha a estrutura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual" className="text-xs">Desmembrar em itens individuais (${selectedPO.items?.length || 0} itens)</SelectItem>
                      <SelectItem value="consolidated" className="text-xs">Consolidar em um único item com o valor total da OC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Categoria do Item</Label>
                    <Input 
                      value={includePOFormData.category} 
                      onChange={(e) => setIncludePOFormData({ ...includePOFormData, category: e.target.value })}
                      className="text-xs h-9"
                      placeholder="Ex: Suprimentos" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Subcategoria</Label>
                    <Input 
                      value={includePOFormData.subcategory} 
                      onChange={(e) => setIncludePOFormData({ ...includePOFormData, subcategory: e.target.value })}
                      className="text-xs h-9"
                      placeholder="Ex: Ordem de Compra" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Data de Vencimento do Item</Label>
                  <Input 
                    type="date"
                    value={includePOFormData.dueDate} 
                    onChange={(e) => setIncludePOFormData({ ...includePOFormData, dueDate: e.target.value })}
                    className="text-xs h-9" 
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" className="rounded-xl px-4 text-xs font-semibold" onClick={() => setIsPOIncludeOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 font-bold text-xs" 
              onClick={handleIncludePOInAporte}
              disabled={!includePOFormData.targetAporteId}
            >
              Confirmar Inclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


