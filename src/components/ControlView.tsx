import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { 
  Truck, 
  Building2,
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  Upload,
  ArrowUpAZ,
  ArrowDownAZ,
  Filter,
  AlertCircle,
  Wrench,
  XCircle,
  ArrowRightLeft,
  Fuel,
  Droplet,
  ShoppingCart,
  Check,
  Package,
  ChevronsUpDown,
  Settings,
  Info,
  Archive,
  History,
  Copy,
  Hash,
  Activity,
  Layers,
  DollarSign,
  Camera
} from 'lucide-react';
import { 
  ControllerEquipment, 
  EquipmentMonthlyData, 
  User,
  Contract,
  EquipmentTransfer,
  FuelTank,
  FuelLog,
  MaterialRequest,
  MaterialRequestItem,
  PurchaseRequest,
  EquipmentMaintenance,
  EquipmentAttribute,
  ServiceHistoryEntry
} from '../types';
import { EQUIPMENT_TYPES, EQUIPMENT_TEMPLATES } from '../lib/equipmentTemplates';
import { useLocalStorage } from '../lib/useLocalStorage';
import { createSupabaseClient, getSupabaseConfig } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Modal } from "@/components/ui/Modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '../lib/utils';
import { NumericInput } from '@/components/ui/numeric-input';

interface ControlViewProps {
  currentUser: User | null;
  equipments: ControllerEquipment[];
  equipmentMonthly: EquipmentMonthlyData[];
  contracts: Contract[];
  selectedContractId: string | null;
  transfers: EquipmentTransfer[];
  purchaseRequests: PurchaseRequest[];
  equipmentMaintenance: EquipmentMaintenance[];
  onUpdatePurchaseRequests: (requests: PurchaseRequest[]) => void;
  onUpdateContractId: (id: string) => void;
  onUpdateEquipments: (equipments: ControllerEquipment[]) => void;
  onUpdateEquipmentMonthly: (data: EquipmentMonthlyData[]) => void;
  onUpdateTransfers: (transfers: EquipmentTransfer[]) => void;
  onUpdateMaintenance: (maintenance: EquipmentMaintenance[]) => void;
  initialTab?: string;
}

export default function ControlView({
  currentUser,
  equipments,
  equipmentMonthly,
  contracts,
  selectedContractId,
  transfers,
  purchaseRequests,
  equipmentMaintenance = [],
  onUpdatePurchaseRequests,
  onUpdateContractId,
  onUpdateEquipments,
  onUpdateEquipmentMonthly,
  onUpdateTransfers,
  onUpdateMaintenance,
  initialTab
}: ControlViewProps) {
  const [activeTab, setActiveTab] = React.useState(initialTab || 'list');

  const [fuelTanks, setFuelTanks] = useLocalStorage<FuelTank[]>('sigo_fuel_tanks', [], currentUser?.companyId);
  const [fuelLogs, setFuelLogs] = useLocalStorage<FuelLog[]>('sigo_fuel_logs', [], currentUser?.companyId);
  const [savedCategories, setSavedCategories] = useLocalStorage<string[]>('sigo_control_categories', [], currentUser?.companyId);

  const [isTankModalOpen, setIsTankModalOpen] = useState(false);
  const [newTank, setNewTank] = useState<Partial<FuelTank>>({ name: '', capacity: 0, currentLevel: 0 });
  const [isFuelLogModalOpen, setIsFuelLogModalOpen] = useState(false);
  const [newFuelLog, setNewFuelLog] = useState<Partial<FuelLog>>({ type: 'saida', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '' });
  const [openDest, setOpenDest] = useState(false);

  const [isMaterialRequestModalOpen, setIsMaterialRequestModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Partial<PurchaseRequest>>({
    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un' }],
    status: 'Pendente',
    priority: 'Normal'
  });
  const [newRequestCategory, setNewRequestCategory] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  
  const [isApplyStockOpen, setIsApplyStockOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<{requestId: string, itemIdx: number, item: any} | null>(null);
  const [applyQuantity, setApplyQuantity] = useState(1);
  const [applyEquipmentId, setApplyEquipmentId] = useState('');


  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'category' | 'origin' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOnlyActive, setFilterOnlyActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<ControllerEquipment | null>(null);
  const [maintenanceEntryDate, setMaintenanceEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective'>('preventive');
  const [maintenanceRequestedItems, setMaintenanceRequestedItems] = useState('');
  const [maintenanceItems, setMaintenanceItems] = useState<{description: string, quantity: number}[]>([]);
  const [newMaintenanceItem, setNewMaintenanceItem] = useState({description: '', quantity: 1});
  const [importContractId, setImportContractId] = useState<string>('');

  const availableContracts = useMemo(() => {
    const isRestricted = currentUser?.role !== 'master' && currentUser?.role !== 'admin';
    let result = contracts.filter(c => currentUser?.role === 'master' || c.companyId === currentUser?.companyId);
    
    if (isRestricted) {
      const allowedQuotes = currentUser?.allowedQuotationIds || [];
      const allowedContracts = currentUser?.allowedContractIds || [];
      
      result = result.filter(c => 
        (c.quotationId && allowedQuotes.includes(c.quotationId)) || 
        allowedContracts.includes(c.id)
      );
    }
    return result;
  }, [contracts, currentUser]);

  const downloadTemplate = () => {
    const headers = [['CONTRATO_NUMERO', 'NOME', 'CATEGORIA', 'MODELO', 'PLACA', 'ORIGEM', 'MEDICAO_POR', 'DATA_ENTRADA', 'DATA_SAIDA', 'CUSTO_MENSAL']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `modelo_importacao_equipamentos.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parseExcelDate = (val: any) => {
      if (!val) return undefined;
      if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().split('T')[0];
      }
      return val;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target?.result, { type: 'binary' }).Sheets[XLSX.read(evt.target?.result, { type: 'binary' }).SheetNames[0]]);
      const newEquips: ControllerEquipment[] = [];
      const newMonthly: EquipmentMonthlyData[] = [];

      data.forEach((item: any) => {
        const id = crypto.randomUUID();
        const targetContract = availableContracts.find(c => c.contractNumber === item.CONTRATO_NUMERO);
        newEquips.push({
          id,
          name: item.NOME || '',
          type: item.TIPO || 'Geral',
          category: item.CATEGORIA || '',
          model: item.MODELO || '',
          plate: item.PLACA || '',
          origin: item.ORIGEM || 'Próprio',
          measurementUnit: item.MEDICAO_POR || item.UNIDADE_MEDICAO || 'Horímetro',
          entryDate: parseExcelDate(item.DATA_ENTRADA) || new Date().toISOString().split('T')[0],
          exitDate: parseExcelDate(item.DATA_SAIDA),
          companyId: currentUser?.companyId,
          contractId: importContractId || targetContract?.id
        });
        if (item.CUSTO_MENSAL) {
          newMonthly.push({
            id: crypto.randomUUID(),
            equipmentId: id,
            month: selectedMonth,
            cost: Number(item.CUSTO_MENSAL),
            companyId: currentUser?.companyId,
            contractId: importContractId || targetContract?.id
          });
        }
      });

      onUpdateEquipments([...equipments, ...newEquips]);
      if (newMonthly.length > 0) onUpdateEquipmentMonthly([...equipmentMonthly, ...newMonthly]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsImportModalOpen(false);
    };
    reader.readAsBinaryString(file);
  };

  const getContractName = (id?: string) => {
    if (!id) return 'Livre / Disponível';
    const c = contracts.find(x => x.id === id);
    if (!c) return 'Obra não encontrada';
    return c.workName || c.contractNumber || 'Sem nome';
  };

  const filteredEquipments = useMemo(() => {
    let result = (equipments || []).filter(e => {
      const matchesCompany = currentUser?.role === 'master' || e.companyId === currentUser?.companyId;
      const matchesContract = !selectedContractId || e.contractId === selectedContractId;
      const matchesActive = filterOnlyActive ? !e.exitDate : true;
      
      if (!matchesCompany || !matchesContract || !matchesActive) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (e.name || '').toLowerCase().includes(term) || 
          (e.plate || '').toLowerCase().includes(term) ||
          (e.code || '').toLowerCase().includes(term) ||
          (e.type || '').toLowerCase().includes(term) ||
          (e.brand || '').toLowerCase().includes(term) ||
          (e.model || '').toLowerCase().includes(term)
        );
      }
      
      return true;
    });

    return [...result].sort((a, b) => {
      // Grouping: Active first, then Inactive
      if (!!a.exitDate !== !!b.exitDate) {
        return a.exitDate ? 1 : -1;
      }

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else if (sortField === 'origin') {
        comparison = (a.origin || '').localeCompare(b.origin || '');
      } else if (sortField === 'cost') {
        const costA = equipmentMonthly.find(d => d.equipmentId === a.id && d.month === selectedMonth)?.cost || 0;
        const costB = equipmentMonthly.find(d => d.equipmentId === b.id && d.month === selectedMonth)?.cost || 0;
        comparison = costA - costB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [equipments, currentUser, searchTerm, filterOnlyActive, sortField, sortOrder, selectedContractId, equipmentMonthly, selectedMonth]);

  const handleSort = (field: 'name' | 'category' | 'origin' | 'cost') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<ControllerEquipment | null>(null);

  const handleApplyRequestToHistory = (request: PurchaseRequest) => {
    if (!request.equipmentId) {
      alert('Esta solicitação não está vinculada a um equipamento específico.');
      return;
    }

    const equip = equipments.find(e => e.id === request.equipmentId || e.plate === request.equipmentId);
    if (!equip) {
      alert('Equipamento não encontrado.');
      return;
    }

    const newHistoryEntry: ServiceHistoryEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'part_application',
      description: `Aplicação de materiais da solicitação: ${request.description}`,
      relatedId: request.id,
      parts: request.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit
      }))
    };

    onUpdateEquipments(equipments.map(e => e.id === equip.id ? {
      ...e,
      history: [...(e.history || []), newHistoryEntry]
    } : e));

    // Update items to be marked as applied
    const updatedRequests = purchaseRequests.map(r => 
      r.id === request.id ? {
        ...r,
        items: r.items.map(item => ({ ...item, appliedQuantity: item.quantity }))
      } : r
    );
    onUpdatePurchaseRequests(updatedRequests);

    alert('Peças aplicadas ao histórico do equipamento com sucesso!');
  };

  const handleApplyStock = () => {
    if (!selectedStockItem || !applyEquipmentId || applyQuantity <= 0) return;
    
    const { requestId, itemIdx } = selectedStockItem;
    const reqIndex = purchaseRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;
    
    const updatedRequests = [...purchaseRequests];
    const targetRequest = { ...updatedRequests[reqIndex] };
    const targetItem = { ...targetRequest.items[itemIdx] };
    const currentApplied = targetItem.appliedQuantity || 0;
    
    if (applyQuantity > (targetItem.quantity - currentApplied)) {
        alert('Quantidade superior ao disponível em estoque.');
        return;
    }
    
    targetItem.appliedQuantity = currentApplied + applyQuantity;
    targetRequest.items = [...targetRequest.items];
    targetRequest.items[itemIdx] = targetItem;
    updatedRequests[reqIndex] = targetRequest;
    
    onUpdatePurchaseRequests(updatedRequests);
    
    // Update equipment history
    const equip = equipments.find(e => e.id === applyEquipmentId || e.plate === applyEquipmentId);
    if (equip) {
        const newHistoryEntry: ServiceHistoryEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            type: 'part_application',
            description: `Aplicação de material do estoque (${targetItem.description})`,
            relatedId: requestId,
            parts: [{
                description: targetItem.description,
                quantity: applyQuantity,
                unit: targetItem.unit
            }]
        };
        
        onUpdateEquipments(equipments.map(e => e.id === equip.id ? {
            ...e,
            history: [...(e.history || []), newHistoryEntry]
        } : e));
    }
    
    setIsApplyStockOpen(false);
    setSelectedStockItem(null);
    setApplyQuantity(1);
    setApplyEquipmentId('');
    alert('Material aplicado com sucesso!');
  };

  const stats = useMemo(() => ({
    activeEquips: equipments.filter(e => !e.exitDate && (!selectedContractId || e.contractId === selectedContractId)).length,
    inMaintenanceCount: equipments.filter(e => e.inMaintenance && !e.exitDate && (!selectedContractId || e.contractId === selectedContractId)).length
  }), [equipments, selectedContractId]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<ControllerEquipment | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] = useState<ControllerEquipment | null>(null);
  const [equipmentToTransfer, setEquipmentToTransfer] = useState<ControllerEquipment | null>(null);
  const [targetContractId, setTargetContractId] = useState<string>('');
  const [exitDateInput, setExitDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [transferDateInput, setTransferDateInput] = useState(new Date().toISOString().split('T')[0]);

  const [newEquip, setNewEquip] = useState<Partial<ControllerEquipment>>({
    code: '',
    name: '',
    type: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    situation: 'Ativo',
    plate: '',
    origin: 'Próprio',
    category: 'Médio',
    measurementUnit: 'Horímetro',
    entryDate: new Date().toISOString().split('T')[0],
    contractId: '',
    currentReading: 0,
    observations: '',
    customFields: {},
    photos: [],
    history: []
  });

  const handleTypeChange = (type: string) => {
    setNewEquip(prev => {
      const template = EQUIPMENT_TEMPLATES[type];
      return {
        ...prev,
        type,
        customFields: template ? JSON.parse(JSON.stringify(template.fields)) : prev.customFields
      };
    });
  };

  const addCustomField = () => {
    const fieldName = prompt('Nome do novo campo (ex: combustível, potência):');
    if (!fieldName) return;
    
    setNewEquip(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: { type: 'text', value: '' }
      }
    }));
  };

  const removeCustomField = (key: string) => {
    setNewEquip(prev => {
      const newFields = { ...prev.customFields };
      delete newFields[key];
      return { ...prev, customFields: newFields };
    });
  };

  const updateCustomField = (key: string, updates: Partial<EquipmentAttribute>) => {
    setNewEquip(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: { ...prev.customFields![key], ...updates }
      }
    }));
  };

  // Update newEquip.contractId when selectedContractId changes or modal opens
  React.useEffect(() => {
    if (isAddOpen) {
      setNewEquip(prev => ({ ...prev, contractId: selectedContractId || '' }));
    }
  }, [isAddOpen, selectedContractId]);

  const handleCreateEquip = () => {
    if (!newEquip.name || !newEquip.plate) return;
    const finalContractId = selectedContractId || newEquip.contractId;
    
    onUpdateEquipments([...equipments, {
      ...newEquip as ControllerEquipment,
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId,
      contractId: finalContractId || undefined,
      currentReading: Number(newEquip.currentReading) || 0
    }]);
    setIsAddOpen(false);
    setNewEquip({
      code: '',
      name: '',
      type: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      situation: 'Ativo',
      plate: '',
      origin: 'Próprio',
      category: 'Médio',
      measurementUnit: 'Horímetro',
      entryDate: new Date().toISOString().split('T')[0],
      contractId: selectedContractId || '',
      currentReading: 0,
      observations: '',
      customFields: {},
      photos: [],
      history: []
    });
  };

  const handleCreateTank = () => {
    if (!newTank.name || !newTank.capacity) return;
    setFuelTanks([...fuelTanks, {
      ...newTank as FuelTank,
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId,
      contractId: selectedContractId || undefined,
      currentLevel: newTank.currentLevel || 0
    }]);
    setIsTankModalOpen(false);
    setNewTank({ name: '', capacity: 0, currentLevel: 0 });
  };

  const handleCreateFuelLog = () => {
    if (!newFuelLog.tankId || !newFuelLog.quantity) return;
    
    const quantityNum = Number(newFuelLog.quantity);
    
    // Update source tank level
    const sourceTank = fuelTanks.find(t => t.id === newFuelLog.tankId);
    if (sourceTank) {
      const newLevel = newFuelLog.type === 'entrada' 
        ? sourceTank.currentLevel + quantityNum 
        : sourceTank.currentLevel - quantityNum;
        
      setFuelTanks(prev => prev.map(t => t.id === sourceTank.id ? { ...t, currentLevel: Math.max(0, newLevel) } : t));
    }

    // Update destination tank level if applicable
    if (newFuelLog.type === 'saida' && newFuelLog.equipmentId) {
      const destTank = fuelTanks.find(t => t.id === newFuelLog.equipmentId);
      if (destTank) {
        setFuelTanks(prev => prev.map(t => t.id === destTank.id ? { ...t, currentLevel: t.currentLevel + quantityNum } : t));
      }
    }

    setFuelLogs([{
      ...newFuelLog as FuelLog,
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId,
    }, ...fuelLogs]);
    setIsFuelLogModalOpen(false);
    setNewFuelLog({ type: 'saida', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '', supplier: '', invoiceNumber: '', unitPrice: 0, cost: 0 });
  };

  const addItemInput = () => {
    setCurrentRequest({
      ...currentRequest,
      items: [...(currentRequest.items || []), { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un', status: 'Pendente' }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(currentRequest.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setCurrentRequest({ ...currentRequest, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = (currentRequest.items || []).filter((_, i) => i !== index);
    setCurrentRequest({ ...currentRequest, items: newItems });
  };

  const handleCreateMaterialRequest = () => {
    if (!currentRequest.items || currentRequest.items.length === 0 || !newRequestCategory) {
      alert('Preencha os itens e a categoria da solicitação.');
      return;
    }
    
    const newRequest: PurchaseRequest = {
      ...currentRequest,
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId,
      contractId: selectedContractId || undefined,
      date: new Date().toISOString().split('T')[0],
      description: currentRequest.description || `Solicitação do Controlador: ${(currentRequest.items || []).map(i => i.description).join(', ')}`,
      category: newRequestCategory,
      sector: 'CONTROLADOR',
      status: currentRequest.status || 'Pendente',
      priority: currentRequest.priority || 'Normal',
      items: (currentRequest.items || []).map(item => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        status: item.status || 'Pendente'
      }))
    } as PurchaseRequest;

    onUpdatePurchaseRequests([newRequest, ...purchaseRequests]);
    
    if (newRequestCategory && !savedCategories.includes(newRequestCategory)) {
      setSavedCategories([...savedCategories, newRequestCategory]);
    }

    setIsMaterialRequestModalOpen(false);
    setCurrentRequest({
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un' }],
      status: 'Pendente',
      priority: 'Normal'
    });
    setNewRequestCategory('');
  };

  const handleUpdateEquip = () => {
    if (!equipmentToEdit || !equipmentToEdit.name || !equipmentToEdit.plate) return;
    onUpdateEquipments(equipments.map(e => e.id === equipmentToEdit.id ? {
      ...equipmentToEdit,
      currentReading: Number(equipmentToEdit.currentReading) || 0,
      year: Number(equipmentToEdit.year) || new Date().getFullYear()
    } : e));
    setIsEditOpen(false);
    setEquipmentToEdit(null);
  };

  const handlePermanentDelete = () => {
    if (!equipmentToEdit) return;
    if (confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o equipamento ${equipmentToEdit.name}? Esta ação não pode ser desfeita.`)) {
      onUpdateEquipments(equipments.filter(e => e.id !== equipmentToEdit.id));
      setIsEditOpen(false);
      setEquipmentToEdit(null);
    }
  };

  const handleSoftDelete = () => {
    if (!equipmentToDelete) return;
    onUpdateEquipments(equipments.map(e => 
      e.id === equipmentToDelete.id 
        ? { ...e, exitDate: exitDateInput } 
        : e
    ));
    setIsDeleteOpen(false);
    setEquipmentToDelete(null);
  };

  const handleTransferRequest = () => {
    if (!equipmentToTransfer || !targetContractId) return;
    
    const newTransfer: EquipmentTransfer = {
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId || '',
      equipmentId: equipmentToTransfer.id,
      sourceContractId: equipmentToTransfer.contractId || '',
      targetContractId: targetContractId,
      transferDate: transferDateInput,
      status: 'pending',
      requestedBy: currentUser?.name || 'Solicitante'
    };

    onUpdateTransfers([...transfers, newTransfer]);
    setIsTransferOpen(false);
    setEquipmentToTransfer(null);
    setTargetContractId('');
    setTransferDateInput(new Date().toISOString().split('T')[0]);
  };

  const handleApproveTransfer = (transfer: EquipmentTransfer) => {
    onUpdateEquipments(equipments.map(e => 
      e.id === transfer.equipmentId 
        ? { ...e, contractId: transfer.targetContractId } 
        : e
    ));
    onUpdateTransfers(transfers.map(t => 
      t.id === transfer.id 
        ? { ...t, status: 'approved', approvedBy: currentUser?.name, approvedAt: new Date().toISOString() } 
        : t
    ));
  };

  const handleRejectTransfer = (transfer: EquipmentTransfer) => {
    onUpdateTransfers(transfers.map(t => 
      t.id === transfer.id 
        ? { ...t, status: 'rejected', approvedBy: currentUser?.name, approvedAt: new Date().toISOString() } 
        : t
    ));
  };

  const handleToggleMaintenance = (equipment: ControllerEquipment) => {
    if (!equipment.inMaintenance) {
      // Opening maintenance - show modal
      setMaintenanceEquipment(equipment);
      setMaintenanceEntryDate(new Date().toISOString().split('T')[0]);
      setMaintenanceType('preventive');
      setMaintenanceRequestedItems('');
      setMaintenanceItems([]);
      setNewMaintenanceItem({description: '', quantity: 1});
      setIsMaintenanceModalOpen(true);
    } else {
      // Closing maintenance - clear fields
      const exitDate = new Date().toISOString().split('T')[0];
      
      onUpdateEquipments(equipments.map(e => 
        e.id === equipment.id ? { 
          ...e, 
          inMaintenance: false,
          maintenance_entry_date: undefined,
          maintenance_type: undefined
        } : e
      ));

      // Update maintenance record in history
      const activeMaintenance = equipmentMaintenance.find(m => m.equipmentId === equipment.id && !m.exitDate);
      if (activeMaintenance) {
        const entry = new Date(activeMaintenance.entryDate + 'T12:00:00');
        const exit = new Date(exitDate + 'T12:00:00');
        const diffTime = Math.abs(exit.getTime() - entry.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        onUpdateMaintenance(equipmentMaintenance.map(m => 
          m.id === activeMaintenance.id ? { ...m, exitDate, daysInMaintenance: diffDays } : m
        ));
      }
    }
  };

  const handleConfirmMaintenance = () => {
    if (!maintenanceEquipment || !currentUser) return;
    
    onUpdateEquipments(equipments.map(e => 
      e.id === maintenanceEquipment.id ? { 
        ...e, 
        inMaintenance: true,
        maintenance_entry_date: maintenanceEntryDate,
        maintenance_type: maintenanceType
      } : e
    ));

    const itemsSummary = maintenanceItems.length > 0 
      ? maintenanceItems.map(i => `${i.quantity}x ${i.description}`).join(', ')
      : maintenanceRequestedItems;

    // Create history record
    const newMaintenance: EquipmentMaintenance = {
      id: uuidv4(),
      equipmentId: maintenanceEquipment.id,
      companyId: currentUser.companyId || '',
      entryDate: maintenanceEntryDate,
      type: maintenanceType,
      requestedItems: itemsSummary
    };
    onUpdateMaintenance([...equipmentMaintenance, newMaintenance]);

    // Create a purchase request if there are items
    if (maintenanceItems.length > 0) {
      const newPurchaseRequest: PurchaseRequest = {
        id: crypto.randomUUID(),
        companyId: currentUser.companyId,
        contractId: maintenanceEquipment.contractId,
        equipmentId: maintenanceEquipment.id,
        date: new Date().toISOString().split('T')[0],
        description: `Manutenção ${maintenanceType === 'preventive' ? 'Preventiva' : 'Corretiva'}: ${maintenanceEquipment.name} (${maintenanceEquipment.plate})`,
        category: 'PEÇAS/MANUTENÇÃO',
        sector: 'CONTROLADOR',
        status: 'Pendente',
        items: maintenanceItems.map(item => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity,
          unit: 'un'
        }))
      };
      onUpdatePurchaseRequests([newPurchaseRequest, ...purchaseRequests]);
    }
    
    setIsMaintenanceModalOpen(false);
    setMaintenanceEquipment(null);
    setMaintenanceRequestedItems('');
    setMaintenanceItems([]);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Equipamentos"
        maxWidth="md"
        footer={
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2 w-full sm:w-auto"><Upload className="w-4 h-4" /> Selecionar Arquivo</Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-gray-400">Obra de Destino</Label>
            <Select value={importContractId} onValueChange={setImportContractId}>
              <SelectTrigger className="h-12 rounded-xl focus:ring-blue-500 transition-all">
                <SelectValue placeholder="Usar obra da planilha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="font-bold">Usar obra da planilha</SelectItem>
                {availableContracts.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.workName || c.contractNumber || 'Sem nome'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-gray-500 italic">* Certifique-se de que o arquivo segue o modelo padrão de importação do SIGO.</p>
        </div>
      </Modal>

      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        maxWidth="xl"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-emerald-600 p-6 text-white relative overflow-hidden">
          <Wrench className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-200" />
              Enviar para Manutenção
            </h2>
            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">
              {maintenanceEquipment?.name} - {maintenanceEquipment?.plate}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance_date" className="text-[10px] uppercase font-black text-gray-500 tracking-tight">Data de Entrada</Label>
              <Input
                id="maintenance_date"
                type="date"
                value={maintenanceEntryDate}
                onChange={(e) => setMaintenanceEntryDate(e.target.value)}
                className="rounded-xl border-gray-200 bg-gray-50/50 h-12 font-bold focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-gray-500 tracking-tight">Tipo de Manutenção</Label>
              <Select value={maintenanceType} onValueChange={(v: any) => setMaintenanceType(v)}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-12 font-bold focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive" className="font-bold">Preventiva</SelectItem>
                  <SelectItem value="corrective" className="font-bold">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100 border-dashed">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-black text-emerald-700 flex items-center gap-2 tracking-widest">
                <ShoppingCart className="w-3 h-3" />
                Solicitar Peças / Materiais
              </Label>
              <Badge variant="outline" className="bg-white/50 text-[9px] font-black border-emerald-100">OPCIONAL</Badge>
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Descrição da peça ou serviço..."
                value={newMaintenanceItem.description}
                onChange={e => setNewMaintenanceItem({...newMaintenanceItem, description: e.target.value})}
                className="rounded-xl border-emerald-100 bg-white h-11 text-xs font-bold"
              />
              <Input 
                type="number"
                placeholder="Qtd"
                className="w-20 rounded-xl border-emerald-100 bg-white h-11 text-xs font-bold"
                value={newMaintenanceItem.quantity}
                onChange={e => setNewMaintenanceItem({...newMaintenanceItem, quantity: parseInt(e.target.value) || 1})}
              />
              <Button 
                size="icon" 
                variant="outline"
                className="rounded-xl bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                onClick={() => {
                  if (newMaintenanceItem.description) {
                    setMaintenanceItems([...maintenanceItems, newMaintenanceItem]);
                    setNewMaintenanceItem({description: '', quantity: 1});
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {maintenanceItems.length > 0 && (
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                {maintenanceItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-50 shadow-sm animate-in slide-in-from-left duration-200">
                    <span className="text-xs font-black text-emerald-900">{item.quantity}x {item.description}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={() => setMaintenanceItems(maintenanceItems.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {maintenanceItems.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="maintenance_items_legacy" className="text-[10px] uppercase font-black text-gray-400 tracking-tighter">Ou informe em texto livre</Label>
                <Input
                  id="maintenance_items_legacy"
                  placeholder="Ex: Óleo, Filtros, Peça Específica..."
                  value={maintenanceRequestedItems}
                  onChange={(e) => setMaintenanceRequestedItems(e.target.value)}
                  className="rounded-xl border-emerald-100 bg-white h-11 text-xs font-bold"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl">
          <Button variant="ghost" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 flex-1" onClick={() => setIsMaintenanceModalOpen(false)}>Cancelar</Button>
          <Button className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 h-12 flex-[2] shadow-xl shadow-emerald-100" onClick={handleConfirmMaintenance}>
            Confirmar Envio para Oficina
          </Button>
        </div>
      </Modal>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Controlador de Equipamentos</h1>
          <p className="text-xs text-gray-500 font-medium">Gestão de frotas e manutenção preventiva/corretiva.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-2xl border border-blue-100">
          <Building2 className="w-5 h-5 text-blue-600 ml-2" />
          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Selecionar Obra / Contrato</Label>
            <Select value={selectedContractId || ''} onValueChange={id => onUpdateContractId(id)}>
              <SelectTrigger className="w-full lg:w-[400px] h-10 bg-white border-blue-200 rounded-xl font-bold text-blue-900 ring-offset-blue-50">
                <SelectValue>
                  {selectedContractId ? (
                    (() => {
                      const c = availableContracts.find(x => x.id === selectedContractId);
                      return c ? `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})` : "Selecionar Obra";
                    })()
                  ) : "Todas as Obras"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80 rounded-xl border-blue-100">
                <SelectItem value="" textValue="Todas as Obras">Todas as Obras</SelectItem>
                {availableContracts.map(c => {
                  const label = `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})`;
                  return (
                    <SelectItem key={c.id} value={c.id} textValue={label}>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-tight">{c.workName || c.client || 'Sem nome'}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{c.contractNumber || 'S/N'}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input className="pl-10 h-10 w-full rounded-xl shadow-sm bg-white" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <Label htmlFor="active-filter" className="text-[10px] font-bold uppercase text-gray-400 cursor-pointer">Apenas Ativos</Label>
            <Switch 
              id="active-filter"
              checked={filterOnlyActive} 
              onCheckedChange={setFilterOnlyActive} 
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-white">
        <Card className="bg-blue-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <Truck className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Total Equipamentos</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">{stats.activeEquips}</h3>
            <span className="text-[10px] font-bold opacity-60">unidades</span>
          </div>
        </Card>

        <Card className="bg-emerald-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <Wrench className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Em Manutenção</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">{stats.inMaintenanceCount}</h3>
            <span className="text-[10px] font-bold opacity-60">ativos</span>
          </div>
        </Card>

        <Card className="bg-orange-500 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <ArrowRightLeft className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Transf. Pendentes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black">
              {transfers.filter(t => 
                t.status === 'pending' && (
                  currentUser?.role === 'master' || 
                  !selectedContractId || 
                  t.targetContractId === selectedContractId || 
                  t.sourceContractId === selectedContractId
                )
              ).length}
            </h3>
            <span className="text-[10px] font-bold opacity-60">solicitações</span>
          </div>
        </Card>

        <Card className="bg-indigo-600 border-none shadow-lg rounded-2xl p-4 relative overflow-hidden group">
          <DollarSign className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Custo Operacional</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold opacity-70">R$</span>
            <h3 className="text-2xl font-black">
              {stats.activeEquips > 0 ? (filteredEquipments.reduce((sum, e) => {
                const cost = equipmentMonthly.find(d => d.equipmentId === e.id && d.month === selectedMonth)?.cost || 0;
                return sum + cost;
              }, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
            </h3>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-12">
          <TabsTrigger value="list" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <Truck className="w-4 h-4 mr-2" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <Wrench className="w-4 h-4 mr-2" />
            Manutenção
          </TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferências
          </TabsTrigger>
          <TabsTrigger value="fuel" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <Fuel className="w-4 h-4 mr-2" />
            Combustível
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Solicitações
          </TabsTrigger>
          <TabsTrigger value="stock" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <Archive className="w-4 h-4 mr-2" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 transition-all">
            <Calendar className="w-4 h-4 mr-2" />
            Histórico Manut.
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-50 rounded-xl"><Truck className="w-5 h-5 text-blue-600" /></div>
                 <div>
                    <CardTitle className="text-lg font-black">Lista de Equipamentos</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Controle de custos e disponibilidade</CardDescription>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="rounded-xl gap-2 font-bold text-xs"><FileDown className="w-4 h-4" /> Modelo</Button>
                <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} className="rounded-xl gap-2 font-bold text-xs"><Upload className="w-4 h-4" /> Importar</Button>
                <Button onClick={() => setIsAddOpen(true)} className="rounded-xl bg-blue-600 gap-2 font-bold text-xs"><Plus className="w-4 h-4 mr-2" /> Novo</Button>
                <Modal
                  isOpen={isAddOpen}
                  onClose={() => setIsAddOpen(false)}
                  maxWidth="5xl"
                  className="p-0 border-none"
                  headerClassName="hidden"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 flex justify-between items-center shrink-0 relative overflow-hidden">
                    <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-3xl">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white leading-tight">Adicionar Equipamento</h2>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Novo ativo SIGO Controlador</p>
                      </div>
                    </div>
                  </div>

                    <Tabs defaultValue="basic" className="w-full flex-1 flex flex-col overflow-hidden">
                      <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b px-6 h-14 gap-6 shrink-0">
                        <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Dados Principais</TabsTrigger>
                        <TabsTrigger value="technical" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Atributos Técnicos</TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Histórico</TabsTrigger>
                        <TabsTrigger value="photos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Fotos</TabsTrigger>
                        <TabsTrigger value="obs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Observações</TabsTrigger>
                      </TabsList>

                      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
                        <TabsContent value="basic" className="mt-0 space-y-8 animate-in fade-in duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 flex items-center gap-2 tracking-tight"><Hash className="w-4 h-4"/> Código de Identificação</Label>
                              <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" value={newEquip.code} onChange={e => setNewEquip({...newEquip, code: e.target.value})} placeholder="Ex: EQ-001" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 flex items-center gap-2 tracking-tight"><Info className="w-4 h-4"/> Nome Completo do Ativo</Label>
                              <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" value={newEquip.name} onChange={e => setNewEquip({...newEquip, name: e.target.value})} placeholder="Ex: Escavadeira CAT 320" />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Tipo de Equipamento</Label>
                              <Select value={newEquip.type} onValueChange={handleTypeChange}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold">
                                  <SelectValue placeholder="Selecione o tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Marca / Fabricante</Label>
                              <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.brand} onChange={e => setNewEquip({...newEquip, brand: e.target.value})} placeholder="Ex: Caterpillar" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Modelo / Versão</Label>
                              <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.model} onChange={e => setNewEquip({...newEquip, model: e.target.value})} placeholder="Ex: 320 NG" />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Ano de Fabricação</Label>
                              <Input type="number" className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.year} onChange={e => setNewEquip({...newEquip, year: parseInt(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Placa ou Serial</Label>
                              <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.plate} onChange={e => setNewEquip({...newEquip, plate: e.target.value})} placeholder="ABC-1234" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Origem do Ativo</Label>
                              <Select value={newEquip.origin} onValueChange={val => setNewEquip({...newEquip, origin: val})}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Próprio">Próprio</SelectItem>
                                  <SelectItem value="Alugado">Alugado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Situação Operacional</Label>
                              <Select value={newEquip.situation} onValueChange={(val: any) => setNewEquip({...newEquip, situation: val})}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ativo">Ativo</SelectItem>
                                  <SelectItem value="Inativo">Inativo</SelectItem>
                                  <SelectItem value="Vendido">Vendido</SelectItem>
                                  <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Medição por</Label>
                              <Select value={newEquip.measurementUnit || 'Horímetro'} onValueChange={val => setNewEquip({...newEquip, measurementUnit: val as any})}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Horímetro">Horímetro (h)</SelectItem>
                                  <SelectItem value="Quilometragem">Quilometragem (km)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Leitura Inicial</Label>
                              <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.currentReading} onChange={val => setNewEquip({...newEquip, currentReading: val})} />
                            </div>
                            
                            <div className="md:col-span-2 lg:col-span-3 space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Obra Vinculada (Centro de Custo)</Label>
                              <Select value={newEquip.contractId || ''} onValueChange={val => setNewEquip({...newEquip, contractId: val})} disabled={!!selectedContractId}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold transition-all focus:ring-2 focus:ring-blue-500/20">
                                  <SelectValue placeholder="Selecione a obra...">
                                    {newEquip.contractId ? getContractName(newEquip.contractId) : "Sem Obra (Disponível)"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="" className="font-bold py-3 uppercase text-[10px] tracking-tight">Sem Obra (Disponível)</SelectItem>
                                  {contracts.filter(c => currentUser?.role === 'master' || c.companyId === currentUser?.companyId || c.id === newEquip.contractId).map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-bold py-3 uppercase text-[10px] tracking-tight">
                                      {c.workName || c.contractNumber}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="technical" className="mt-0 space-y-4 animate-in slide-in-from-right duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-sm font-black text-gray-900 uppercase">Especificações do Equipamento</h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase">Campos personalizados salvos em JSONB</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={addCustomField} className="rounded-xl gap-2 font-bold text-xs text-blue-600 border-blue-100 hover:bg-blue-50">
                              <Plus className="w-4 h-4" /> Adicionar Campo
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 border-dashed">
                            {Object.entries(newEquip.customFields || {}).map(([key, f]) => {
                              const field = f as EquipmentAttribute;
                              return (
                                <div key={key} className="space-y-2 group relative animate-in fade-in zoom-in duration-300">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                                      <Activity className="w-3 h-3" />
                                      {key.replace(/_/g, ' ')}
                                    </Label>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => removeCustomField(key)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </div>
                                  
                                  {field.type === 'boolean' ? (
                                    <div className="flex items-center gap-2 h-10 px-4 bg-white rounded-xl border border-gray-100">
                                      <Switch checked={field.value} onCheckedChange={v => updateCustomField(key, { value: v })} />
                                      <span className="text-xs font-bold text-gray-600 uppercase">{field.value ? 'Sim' : 'Não'}</span>
                                    </div>
                                  ) : field.type === 'select' ? (
                                    <Select value={field.value} onValueChange={v => updateCustomField(key, { value: v })}>
                                      <SelectTrigger className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input 
                                      className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs" 
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      value={field.value}
                                      onChange={e => updateCustomField(key, { value: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            {Object.keys(newEquip.customFields || {}).length === 0 && (
                              <div className="col-span-2 py-10 flex flex-col items-center justify-center opacity-30">
                                <Settings className="w-10 h-10 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest text-center">Nenhum campo personalizado.<br/>Selecione um tipo ou adicione campos manuais.</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="obs" className="mt-0 space-y-4 animate-in slide-in-from-right duration-300">
                           <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-gray-400">Observações Gerais</Label>
                              <textarea 
                                className="w-full min-h-[150px] rounded-2xl border-gray-100 bg-gray-50/50 p-4 text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={newEquip.observations}
                                onChange={e => setNewEquip({...newEquip, observations: e.target.value})}
                                placeholder="Descreva aqui detalhes adicionais, histórico ou informações relevantes..."
                              />
                           </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 space-y-4 animate-in slide-in-from-bottom duration-300">
                          <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase">Histórico do Equipamento</h4>
                            <div className="space-y-3">
                              {(newEquip.history || []).map(entry => (
                                <div key={entry.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <Badge variant="outline" className="text-[8px] font-black uppercase mb-1">{entry.type}</Badge>
                                      <p className="text-xs font-black text-gray-900">{entry.description}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  {entry.parts && entry.parts.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {entry.parts.map((p, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-[9px] bg-gray-50 text-gray-500">
                                          {p.quantity} {p.unit} - {p.description}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {(!newEquip.history || newEquip.history.length === 0) && (
                                <div className="py-10 text-center opacity-30">
                                  <History className="w-10 h-10 mx-auto mb-2" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro no histórico</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="photos" className="mt-0 space-y-4 animate-in slide-in-from-top duration-300">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-gray-900 uppercase">Fotos do Equipamento</h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Armazenado em Supabase Bucket: equipments</p>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4">
                              {(newEquip.photos || []).map((url, idx) => (
                                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 relative group">
                                  <img src={url} alt={`Equip ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Button variant="destructive" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setNewEquip(prev => ({ ...prev, photos: prev.photos?.filter((_, i) => i !== idx) }))}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                                <Camera className="w-8 h-8 text-gray-300" />
                                <span className="text-[8px] font-black uppercase text-gray-400">Adicionar Foto</span>
                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const config = getSupabaseConfig();
                                      if (config.enabled) {
                                        const supabase = createSupabaseClient(config.url, config.key);
                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `${uuidv4()}.${fileExt}`;
                                        const { data, error } = await supabase.storage.from('equipamentos').upload(fileName, file);
                                        if (error) throw error;
                                        
                                        const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
                                        setNewEquip(prev => ({ ...prev, photos: [...(prev.photos || []), publicUrl] }));
                                      } else {
                                        // Fallback
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          setNewEquip(prev => ({ ...prev, photos: [...(prev.photos || []), ev.target?.result as string] }));
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    } catch (err: any) {
                                      console.error("Upload error:", err);
                                      alert(`Erro ao enviar a foto para o Supabase: ${err.message || 'Verifique se o bucket "equipamentos" foi criado. Execute supabase_storage_setup.sql.'}`);
                                    }
                                  }
                                }} />
                              </label>
                            </div>
                          </div>
                        </TabsContent>
                      </div>

                      <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl">
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-6">Cancelar</Button>
                        <Button onClick={handleCreateEquip} className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95">
                          <Check className="w-4 h-4 mr-2" /> Salvar Equipamento no SIGO
                        </Button>
                      </div>
                    </Tabs>
                </Modal>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead 
                      className="font-black text-[10px] h-8 uppercase tracking-widest text-slate-500 py-0 cursor-pointer hover:bg-slate-100/50 transition-colors min-w-[250px]"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Equipamento Ativo
                        {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-black text-[10px] h-8 uppercase tracking-widest text-slate-500 py-0 min-w-[180px]"
                    >
                      C. Custo / Obra
                    </TableHead>
                    <TableHead 
                      className="font-black text-[10px] h-8 uppercase tracking-widest text-slate-500 cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Classificação
                        {sortField === 'category' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-black text-[10px] h-8 uppercase tracking-widest text-slate-500 text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => handleSort('origin')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Origem
                        {sortField === 'origin' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-black text-[10px] h-8 uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Custo Mensal
                        {sortField === 'cost' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments.filter(e => !e.inMaintenance).map(e => (
                    <TableRow 
                      key={e.id} 
                      className="hover:bg-gray-50 transition-colors group h-11 cursor-pointer"
                      onDoubleClick={() => {
                        setEquipmentToEdit(e);
                        setIsEditOpen(true);
                      }}
                    >
                      <TableCell className="py-0.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            e.exitDate ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                          )}>
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 leading-none">
                              <p className={cn("font-bold text-[13px] tracking-tight", e.exitDate ? "text-gray-400 line-through" : "text-gray-900")}>
                                {e.name}
                              </p>
                              <Badge variant="outline" className="text-[8px] font-bold uppercase py-0 px-1.5 h-3.5 bg-slate-50 text-slate-500 border-slate-200">
                                {e.code || 'S/C'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                                {e.brand} {e.model} • <span className="text-blue-600 font-bold">{e.type}</span> • {e.plate}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-0.5">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter truncate max-w-[150px] inline-block">{getContractName(e.contractId)}</span>
                      </TableCell>
                      <TableCell className="py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">{e.category}</TableCell>
                      <TableCell className="py-0.5 text-center font-black uppercase text-[9px] tracking-widest"><Badge variant="outline" className={cn("rounded-lg h-5 px-2", e.origin === 'Próprio' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100")}>{e.origin}</Badge></TableCell>
                      <TableCell className="py-0.5 text-right font-mono text-[10px] font-black text-slate-700">
                        <NumericInput 
                          className="w-24 h-7 text-right bg-slate-50/50 rounded-lg border-transparent hover:border-slate-200 transition-all focus-visible:ring-1 focus-visible:ring-blue-500/20 text-[11px]" 
                          value={equipmentMonthly.find(d => d.equipmentId === e.id && d.month === selectedMonth)?.cost || 0} 
                          onChange={val => {
                            const idx = equipmentMonthly.findIndex(d => d.equipmentId === e.id && d.month === selectedMonth);
                            if (idx >= 0) onUpdateEquipmentMonthly(equipmentMonthly.map((d, i) => i === idx ? { ...d, cost: val } : d));
                            else onUpdateEquipmentMonthly([...equipmentMonthly, { 
                               id: crypto.randomUUID(), 
                               equipmentId: e.id, 
                               month: selectedMonth, 
                               cost: val, 
                               companyId: currentUser?.companyId,
                               contractId: e.contractId
                             }]);
                          }}
                          prefix="R$"
                        />
                      </TableCell>
                      <TableCell className="py-0.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleMaintenance(e)}
                            className={cn("h-7 w-7 text-gray-300 hover:text-emerald-500", e.inMaintenance && "text-emerald-500")}
                            title={e.inMaintenance ? "Retirar de Manutenção" : "Enviar para Manutenção"}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={transfers.some(t => t.equipmentId === e.id && t.status === 'pending')}
                            onClick={() => {
                              setEquipmentToTransfer(e);
                              setTargetContractId('');
                              setIsTransferOpen(true);
                            }} 
                            className="h-7 w-7 text-gray-300 hover:text-green-500 disabled:opacity-30"
                            title="Solicitar Transferência"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setCurrentRequest({ 
                                id: uuidv4(),
                                date: new Date().toISOString().split('T')[0],
                                status: 'Pendente',
                                priority: 'Normal',
                                sector: 'CONTROLADOR',
                                description: `${e.name} (${e.plate})`,
                                contractId: e.contractId || (selectedContractId !== 'all' ? selectedContractId : undefined),
                                items: [{ id: uuidv4(), description: '', quantity: 1, unit: 'un' }]
                              });
                              setIsMaterialRequestModalOpen(true);
                            }} 
                            className="h-7 w-7 text-gray-300 hover:text-emerald-500"
                            title="Solicitar Peças/Material"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setNewFuelLog(prev => ({ ...prev, equipmentId: e.id, type: 'saida' }));
                              setIsFuelLogModalOpen(true);
                            }} 
                            className="h-7 w-7 text-gray-300 hover:text-purple-500"
                            title="Abastecimento de Combustível"
                          >
                            <Fuel className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedEquipment(e);
                              setIsDetailOpen(true);
                            }} 
                            className="h-7 w-7 text-gray-300 hover:text-blue-500"
                            title="Ver Detalhes"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEquipmentToEdit(e);
                              setIsEditOpen(true);
                            }} 
                            className="h-7 w-7 text-gray-300 hover:text-blue-500"
                            title="Visualizar/Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEquipmentToDelete(e);
                              setExitDateInput(new Date().toISOString().split('T')[0]);
                              setIsDeleteOpen(true);
                            }} 
                            className="text-gray-300 hover:text-orange-500"
                            title="Dispensar Equipamento"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl"><Wrench className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <CardTitle className="text-lg font-black">Equipamentos em Manutenção</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Frota atualmente indisponível para operação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5">Equipamento</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Início Manut.</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Dias</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Tipo</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Obra Atual</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Porte / Cat.</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Origem</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments.filter(e => e.inMaintenance).map(e => (
                    <TableRow 
                      key={e.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onDoubleClick={() => {
                        setEquipmentToEdit(e);
                        setIsEditOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-bold text-gray-900">{e.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{e.model} - {e.plate}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-600">
                        {e.maintenance_entry_date ? new Date(e.maintenance_entry_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-gray-900">
                        {e.maintenance_entry_date ? (
                          (() => {
                            const entry = new Date(e.maintenance_entry_date + 'T12:00:00');
                            const today = new Date();
                            today.setHours(12, 0, 0, 0);
                            const diffTime = Math.abs(today.getTime() - entry.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return `${diffDays} d`;
                          })()
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {e.maintenance_type ? (
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase font-black rounded-lg",
                            e.maintenance_type === 'preventive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                          )}>
                            {e.maintenance_type === 'preventive' ? 'Preventiva' : 'Corretiva'}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-blue-600">{getContractName(e.contractId)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-600">{e.category}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg", e.origin === 'Próprio' ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>
                          {e.origin}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setCurrentRequest({ 
                                id: uuidv4(),
                                date: new Date().toISOString().split('T')[0],
                                status: 'Pendente',
                                priority: 'Normal',
                                sector: 'CONTROLADOR',
                                description: `${e.name} (${e.plate})`,
                                contractId: e.contractId || (selectedContractId !== 'all' ? selectedContractId : undefined),
                                items: [{ id: uuidv4(), description: '', quantity: 1, unit: 'un' }]
                              });
                              setIsMaterialRequestModalOpen(true);
                            }} 
                            className="text-gray-300 hover:text-emerald-500"
                            title="Solicitar Peças/Material"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleToggleMaintenance(e)}
                            className="h-8 rounded-lg bg-blue-50 text-blue-600 border-blue-100 font-bold text-[10px]"
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Finalizar Manutenção
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEquipments.filter(e => e.inMaintenance).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                         <div className="flex flex-col items-center justify-center opacity-30">
                            <Wrench className="w-10 h-10 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">Nenhum equipamento em manutenção</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-50 rounded-xl"><ArrowRightLeft className="w-5 h-5 text-orange-600" /></div>
                <div>
                  <CardTitle className="text-lg font-black">Histórico e Aprovações</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Gerencie transferências entre obras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5">Equipamento</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Origem (Obra)</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Destino (Obra)</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Data Transferência</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Status</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers
                    .filter(t => !selectedContractId || t.sourceContractId === selectedContractId || t.targetContractId === selectedContractId)
                    .sort((a,b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime())
                    .map(t => {
                    const equip = equipments.find(e => e.id === t.equipmentId);
                    const source = contracts.find(c => c.id === t.sourceContractId);
                    const target = contracts.find(c => c.id === t.targetContractId);
                    
                    return (
                      <TableRow 
                        key={t.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => {
                          if (equip) {
                            setEquipmentToEdit(equip);
                            setIsEditOpen(true);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="font-bold text-gray-900">{equip?.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{equip?.plate}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-gray-600">{source?.workName || source?.contractNumber || 'Obra não encontrada'}</TableCell>
                        <TableCell className="text-xs font-bold text-blue-600">{target?.workName || target?.contractNumber || 'Obra não encontrada'}</TableCell>
                        <TableCell className="text-xs font-medium text-gray-600 font-mono">{new Date(t.transferDate + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-black uppercase rounded-lg",
                              t.status === 'pending' ? "bg-orange-50 text-orange-600" :
                              t.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}
                          >
                            {t.status === 'pending' ? 'Pendente' : t.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.status === 'pending' && (currentUser?.role === 'master' || (selectedContractId === t.targetContractId)) && (
                            <div className="flex items-center gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleApproveTransfer(t)}
                                className="h-8 rounded-lg bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 text-[10px] font-bold"
                              >
                                Aprovar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRejectTransfer(t)}
                                className="h-8 rounded-lg bg-red-50 text-red-700 border-red-100 hover:bg-red-100 text-[10px] font-bold"
                              >
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                         <div className="flex flex-col items-center justify-center opacity-30">
                            <ArrowRightLeft className="w-10 h-10 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma transferência registrada</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 border-none shadow-xl rounded-3xl overflow-hidden self-start">
              <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-xl"><Droplet className="w-5 h-5 text-blue-600" /></div>
                  <CardTitle className="text-lg font-black">Tanques</CardTitle>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl font-bold gap-2 text-xs" onClick={() => setIsTankModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Novo
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {fuelTanks.filter(t => !selectedContractId || t.contractId === selectedContractId).map(tank => {
                  const percent = (tank.currentLevel / tank.capacity) * 100;
                  return (
                    <div key={tank.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                          <h4 className="font-bold text-gray-900">{tank.name}</h4>
                          <p className="text-[10px] uppercase font-bold text-gray-500">{getContractName(tank.contractId)}</p>
                        </div>
                        <p className="font-mono font-black text-sm">{tank.currentLevel} / {tank.capacity} L</p>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mt-3 max-w-[80%] relative z-10">
                        <motion.div 
                          className={cn("h-full", percent > 20 ? "bg-blue-500" : "bg-red-500")}
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>
                  );
                })}
                {fuelTanks.filter(t => !selectedContractId || t.contractId === selectedContractId).length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <Fuel className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">Nenhum tanque cadastrado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-2 border-none shadow-xl rounded-3xl overflow-hidden self-start">
              <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-xl"><Fuel className="w-5 h-5 text-purple-600" /></div>
                  <div>
                    <CardTitle className="text-lg font-black">Histórico de Abastecimentos</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Entradas e saídas de combustível</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl font-bold gap-2 text-xs text-purple-700 bg-purple-50 border-purple-100 hover:bg-purple-100" onClick={() => {
                    setNewFuelLog({ type: 'entrada', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '', supplier: '', invoiceNumber: '', unitPrice: undefined, cost: undefined });
                    setIsFuelLogModalOpen(true);
                  }}>
                    <Plus className="w-4 h-4" /> Nova Entrada
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl font-bold gap-2 text-xs text-orange-700 bg-orange-50 border-orange-100 hover:bg-orange-100" onClick={() => {
                    setNewFuelLog({ type: 'saida', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '', supplier: '', invoiceNumber: '', unitPrice: undefined, cost: undefined });
                    setIsFuelLogModalOpen(true);
                  }}>
                    <Fuel className="w-4 h-4" /> Nova Saída
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-4">Data</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Tipo / Ref</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Tanque</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Quantidade (L)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelLogs.slice(0, 50).map(log => {
                      const tk = fuelTanks.find(t => t.id === log.tankId);
                      const eq = equipments.find(e => e.id === log.equipmentId);
                      const destTank = fuelTanks.find(t => t.id === log.equipmentId);
                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-xs text-gray-600">{new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[9px] uppercase font-black", log.type === 'entrada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100')}>
                                {log.type === 'entrada' ? 'Entrada' : destTank ? 'Transferência' : 'Saída'}
                              </Badge>
                              {eq && <span className="text-xs font-bold text-gray-700">{eq.name} ({eq.plate})</span>}
                              {destTank && <span className="text-xs font-bold text-blue-700">Tanque: {destTank.name}</span>}
                              {!eq && !destTank && log.type === 'saida' && <span className="text-xs text-gray-400 italic">Destino não identificado</span>}
                              {log.type === 'entrada' && (log.supplier || log.invoiceNumber) && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {log.supplier} {log.invoiceNumber ? `(NF: ${log.invoiceNumber})` : ''}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-gray-900">{tk?.name}</TableCell>
                          <TableCell className={cn("text-right font-mono font-bold", log.type === 'entrada' ? 'text-emerald-600' : 'text-orange-600')}>
                            {log.type === 'entrada' ? '+' : '-'}{log.quantity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <CardTitle className="text-lg font-black">Acompanhamento de Solicitações</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Status das solicitações enviadas para compras</CardDescription>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setCurrentRequest({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().split('T')[0],
                    status: 'Pendente',
                    priority: 'Normal',
                    contractId: selectedContractId !== 'all' ? selectedContractId : undefined,
                    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un' }]
                  });
                  setIsMaterialRequestModalOpen(true);
                }} 
                className="rounded-xl bg-blue-600 gap-2 font-bold text-xs"
              >
                <Plus className="w-4 h-4" /> Nova Solicitação
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5">Data</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Descrição/Itens</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Categoria</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center">Status</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Previsão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRequests.filter(r => r.sector === 'CONTROLADOR' && (!selectedContractId || r.contractId === selectedContractId)).map(request => (
                    <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="text-xs font-medium text-gray-500">
                        {new Date(request.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.priority === 'Alta' && (
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          )}
                          {request.priority === 'Urgente' && (
                            <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                          )}
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{request.description}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {request.items.map(item => (
                                <Badge key={item.id} variant="secondary" className="text-[9px] h-4 px-1 bg-gray-100 text-gray-600 border-none">
                                  {item.quantity}x {item.description}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-100">{request.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          request.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                          request.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'Em orçamento' ? 'bg-blue-100 text-blue-700' :
                          request.status === 'Compra Aprovado' ? 'bg-indigo-100 text-indigo-700' :
                          request.status === 'Comprado' ? 'bg-emerald-100 text-emerald-700' :
                          request.status === 'Recebido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-700'
                        )}>
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-gray-600">
                        <div className="flex flex-col items-end gap-1">
                          {request.deliveryDeadline ? new Date(request.deliveryDeadline).toLocaleDateString('pt-BR') : '-'}
                          {request.status === 'Recebido' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApplyRequestToHistory(request)}
                              className="h-7 text-[9px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                            >
                              Aplicar Ativo
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchaseRequests.filter(r => r.sector === 'CONTROLADOR' && (!selectedContractId || r.contractId === selectedContractId)).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-400 font-medium">Nenhuma solicitação encontrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl"><Archive className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <CardTitle className="text-lg font-black">Estoque de Materiais</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Itens recebidos aguardando aplicação em equipamentos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5">Material / Peça</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Solicitação Origem</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center">Quantidade Total</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center">Ja Aplicado</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center">Saldo em Estoque</TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRequests
                    .filter(r => r.sector === 'CONTROLADOR' && r.status === 'Recebido' && (!selectedContractId || r.contractId === selectedContractId))
                    .flatMap(r => r.items.map((item, idx) => ({ ...item, requestId: r.id, requestDescription: r.description, itemIdx: idx })))
                    .filter(item => (item.quantity - (item.appliedQuantity || 0)) > 0)
                    .map((item, idx) => (
                      <TableRow key={`${item.requestId}-${item.itemIdx}`} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <p className="font-bold text-gray-900 text-sm">{item.description}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Unidade: {item.unit}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium text-gray-600">{item.requestDescription}</p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-gray-900">{item.quantity}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{item.appliedQuantity || 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-3 py-1 text-sm font-black">
                            {item.quantity - (item.appliedQuantity || 0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase h-8"
                            onClick={() => {
                              setSelectedStockItem({ requestId: item.requestId, itemIdx: item.itemIdx, item });
                              setIsApplyStockOpen(true);
                              setApplyQuantity(item.quantity - (item.appliedQuantity || 0));
                            }}
                          >
                            Aplicar em Equipamento
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                  {purchaseRequests
                    .filter(r => r.status === 'Recebido' && r.sector === 'CONTROLADOR').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 text-gray-400 font-medium">
                          Nenhum material no estoque.
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl"><Calendar className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <CardTitle className="text-lg font-black">Histórico Geral de Manutenções</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-gray-400">Registro completo de preventivas e corretivas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="py-5 px-4 font-bold text-[10px] uppercase tracking-widest text-gray-400">Equipamento</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Entrada</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Saída</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Dias</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Tipo</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Custo</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Itens Solicitados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentMaintenance
                    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                    .map(m => {
                      const equip = equipments.find(e => e.id === m.equipmentId);
                      return (
                        <TableRow 
                          key={m.id} 
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onDoubleClick={() => {
                            if (equip) {
                              setEquipmentToEdit(equip);
                              setIsEditOpen(true);
                            }
                          }}
                        >
                          <TableCell className="px-4">
                            <p className="font-bold text-gray-900">{equip?.name || 'Equipamento Excluído'}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{equip?.plate || '-'}</p>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gray-600">
                            {new Date(m.entryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gray-600">
                            {m.exitDate ? new Date(m.exitDate + 'T12:00:00').toLocaleDateString('pt-BR') : <Badge className="bg-blue-50 text-blue-600 border-none animate-pulse">Em aberto</Badge>}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-gray-900">
                            {m.exitDate ? `${m.daysInMaintenance} d` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-[9px] uppercase font-black rounded-lg",
                              m.type === 'preventive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                            )}>
                              {m.type === 'preventive' ? 'Preventiva' : 'Corretiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-black text-gray-900 text-right">
                            {m.totalCost ? `R$ ${m.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={m.requestedItems}>
                            <span className="text-xs text-gray-600 italic">{m.requestedItems || '-'}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {equipmentMaintenance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 opacity-30">
                        <Wrench className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum histórico registrado</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="5xl"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 flex justify-between items-center shrink-0 relative overflow-hidden">
          <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-3xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">Editar Equipamento</h2>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Alterar dados do ativo SIGO</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-none font-black text-xs px-4 py-1.5 uppercase rounded-xl backdrop-blur-md">{equipmentToEdit?.code || 'S/C'}</Badge>
        </div>

          <Tabs defaultValue="basic" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b px-6 h-14 gap-6 shrink-0">
              <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Dados Principais</TabsTrigger>
              <TabsTrigger value="technical" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Atributos Técnicos</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Histórico</TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Fotos</TabsTrigger>
              <TabsTrigger value="obs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Observações</TabsTrigger>
            </TabsList>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
              <TabsContent value="basic" className="mt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Código</Label>
                    <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={equipmentToEdit?.code || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, code: e.target.value} : null)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Nome do Equipamento</Label>
                    <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={equipmentToEdit?.name || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, name: e.target.value} : null)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Tipo de Equipamento</Label>
                    <Select value={equipmentToEdit?.type || ''} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, type: val} : null)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Marca</Label>
                    <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={equipmentToEdit?.brand || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, brand: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Modelo</Label>
                    <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={equipmentToEdit?.model || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, model: e.target.value} : null)} />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Ano</Label>
                    <Input type="number" className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.year || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, year: parseInt(e.target.value)} : null)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Placa / Serial</Label>
                    <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.plate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, plate: e.target.value} : null)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Origem</Label>
                    <Select value={equipmentToEdit?.origin || 'Próprio'} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, origin: val} : null)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Próprio">Próprio</SelectItem>
                        <SelectItem value="Alugado">Alugado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Situação</Label>
                    <Select value={equipmentToEdit?.situation || 'Ativo'} onValueChange={(val: any) => setEquipmentToEdit(prev => prev ? {...prev, situation: val} : null)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Vendido">Vendido</SelectItem>
                        <SelectItem value="Sucateado">Sucateado</SelectItem>
                        <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Entrada</Label>
                    <Input type="date" className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.entryDate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, entryDate: e.target.value} : null)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Saída</Label>
                    <Input type="date" className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.exitDate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, exitDate: e.target.value} : null)} />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Obra Vinculada (Centro de Custo)</Label>
                    <Select value={equipmentToEdit?.contractId || ''} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, contractId: val} : null)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold transition-all focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="Selecione a obra...">
                          {equipmentToEdit?.contractId ? getContractName(equipmentToEdit.contractId) : "Sem Obra (Disponível)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="font-bold py-4 uppercase text-[11px] tracking-tight">Sem Obra (Disponível)</SelectItem>
                        {contracts.filter(c => currentUser?.role === 'master' || c.companyId === currentUser?.companyId || c.id === equipmentToEdit?.contractId).map(c => (
                          <SelectItem key={c.id} value={c.id} className="font-bold py-4 uppercase text-[11px] tracking-tight">{c.workName || c.contractNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="mt-0 space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-base font-black text-gray-900 uppercase">Especificações do Equipamento</h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Atributos técnicos dinâmicos</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const fieldName = prompt('Nome do novo campo:');
                    if (!fieldName) return;
                    setEquipmentToEdit(prev => prev ? {
                      ...prev,
                      customFields: {
                        ...(prev.customFields || {}),
                        [fieldName]: { type: 'text', value: '' }
                      }
                    } : null);
                  }} className="rounded-xl gap-2 font-bold text-xs text-blue-600 border-blue-100 hover:bg-blue-50 h-10 px-4">
                    <Plus className="w-4 h-4" /> Adicionar Atributo
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
                  {Object.entries(equipmentToEdit?.customFields || {}).map(([key, f]) => {
                    const field = f as EquipmentAttribute;
                    return (
                      <div key={key} className="space-y-2 group relative">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            {key.replace(/_/g, ' ')}
                          </Label>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                            setEquipmentToEdit(prev => {
                              if (!prev) return null;
                              const newFields = { ...(prev.customFields || {}) };
                              delete newFields[key];
                              return { ...prev, customFields: newFields };
                            });
                          }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                        
                        {field.type === 'boolean' ? (
                          <div className="flex items-center gap-3 h-12 px-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <Switch checked={field.value} onCheckedChange={v => {
                              setEquipmentToEdit(prev => prev ? {
                                ...prev,
                                customFields: { ...prev.customFields, [key]: { ...field, value: v } }
                              } : null);
                            }} />
                            <span className="text-sm font-bold text-gray-600 uppercase">{field.value ? 'Sim' : 'Não'}</span>
                          </div>
                        ) : field.type === 'select' ? (
                          <Select value={field.value} onValueChange={v => {
                             setEquipmentToEdit(prev => prev ? {
                               ...prev,
                                customFields: { ...prev.customFields, [key]: { ...field, value: v } }
                             } : null);
                          }}>
                            <SelectTrigger className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm" 
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={field.value}
                            onChange={e => {
                              const val = field.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                              setEquipmentToEdit(prev => prev ? {
                                ...prev,
                                customFields: { ...prev.customFields, [key]: { ...field, value: val } }
                              } : null);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {Object.entries(equipmentToEdit?.customFields || {}).length === 0 && (
                    <div className="col-span-2 py-10 text-center opacity-20">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Nenhum atributo adicional definido</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="obs" className="mt-0 space-y-6">
                <Label className="text-xs uppercase font-bold text-gray-500">Observações do Equipamento</Label>
                <textarea 
                  className="w-full min-h-[250px] rounded-2xl border-gray-100 bg-gray-50/50 p-6 text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                  value={equipmentToEdit?.observations || ''}
                  onChange={e => setEquipmentToEdit(prev => prev ? {...prev, observations: e.target.value} : null)}
                  placeholder="Insira detalhes importantes sobre o estado, uso ou restrições do equipamento..."
                />
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase">Histórico Completo</h4>
                  <div className="space-y-3">
                    {(equipmentToEdit?.history || []).map(entry => (
                      <div key={entry.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant="outline" className="text-[8px] font-black uppercase mb-1">{entry.type}</Badge>
                            <p className="text-xs font-black text-gray-900">{entry.description}</p>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {entry.parts && entry.parts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.parts.map((p, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] bg-gray-50 text-gray-500">
                                {p.quantity} {p.unit} - {p.description}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!equipmentToEdit?.history || equipmentToEdit.history.length === 0) && (
                      <div className="py-10 text-center opacity-30">
                        <History className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-900 uppercase">Galeria de Fotos</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter shadow-sm">SIGO Bucket: equipments</p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    {(equipmentToEdit?.photos || []).map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 relative group">
                        <img src={url} alt={`Equip ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setEquipmentToEdit(prev => prev ? { ...prev, photos: prev.photos?.filter((_, i) => i !== idx) } : null)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                      <Camera className="w-8 h-8 text-gray-300" />
                      <span className="text-[8px] font-black uppercase text-gray-400">Upar Foto</span>
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const config = getSupabaseConfig();
                            if (config.enabled) {
                              const supabase = createSupabaseClient(config.url, config.key);
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${uuidv4()}.${fileExt}`;
                              const { data, error } = await supabase.storage.from('equipamentos').upload(fileName, file);
                              if (error) throw error;
                              
                              const { data: { publicUrl } } = supabase.storage.from('equipamentos').getPublicUrl(fileName);
                              setEquipmentToEdit(prev => prev ? { ...prev, photos: [...(prev.photos || []), publicUrl] } : null);
                            } else {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setEquipmentToEdit(prev => prev ? { ...prev, photos: [...(prev.photos || []), ev.target?.result as string] } : null);
                              };
                              reader.readAsDataURL(file);
                            }
                          } catch (err: any) {
                            console.error("Upload error:", err);
                            alert(`Erro ao enviar a foto para o Supabase: ${err.message || 'Verifique se o bucket "equipamentos" foi criado. Execute supabase_storage_setup.sql.'}`);
                          }
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </TabsContent>
            </div>

            <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl">
              <Button 
                variant="ghost" 
                onClick={handlePermanentDelete} 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase text-[10px] tracking-widest h-12 px-6 border border-red-100 rounded-2xl w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Ativo permanentemente
              </Button>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-6 flex-1 sm:flex-none">Cancelar</Button>
                <Button onClick={handleUpdateEquip} className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-[10px] tracking-widest px-8 flex-1 sm:flex-none transition-all active:scale-95">
                  <Check className="w-4 h-4 mr-2" /> Atualizar Dados do Equipamento
                </Button>
              </div>
            </div>
          </Tabs>
      </Modal>

      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        maxWidth="md"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
          <ArrowRightLeft className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">Transferir Equipamento</h2>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Mudança de Centro de Custo / Obra</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
                <Truck className="w-12 h-12 text-emerald-900" />
            </div>
            <div className="relative z-10">
                <p className="text-lg font-black text-emerald-900 leading-tight">{equipmentToTransfer?.name}</p>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mt-1">Série/Placa: {equipmentToTransfer?.plate || 'S/N'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Obra de Destino</Label>
            <Select value={targetContractId} onValueChange={setTargetContractId}>
              <SelectTrigger className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                <SelectValue placeholder="Selecione a obra de destino">
                  {targetContractId ? (
                    (() => {
                      const c = availableContracts.find(x => x.id === targetContractId);
                      return c ? (c.workName || c.contractNumber) : "Selecionar Obra";
                    })()
                  ) : "Selecionar Obra"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {availableContracts
                  .filter(c => c.id !== equipmentToTransfer?.contractId)
                  .map(c => (
                  <SelectItem key={c.id} value={c.id} textValue={c.workName || c.contractNumber} className="py-3 px-4 rounded-xl focus:bg-emerald-50">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 leading-tight uppercase text-[10px]">{c.workName || c.client || 'Sem nome'}</span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5 tracking-tighter italic">{c.contractNumber || 'S/N'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Data da Transferência</Label>
            <Input 
              type="date" 
              value={transferDateInput} 
              onChange={e => setTransferDateInput(e.target.value)}
              className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button 
            onClick={handleTransferRequest} 
            disabled={!targetContractId}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 font-black uppercase text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Confirmar Transferência
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setIsTransferOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-[9px] text-gray-400 tracking-widest hover:text-gray-600"
          >
            Cancelar operação
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        maxWidth="md"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-orange-600 p-8 text-white relative overflow-hidden">
          <XCircle className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">Dispensar Equipamento</h2>
            <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">O equipamento será marcado como inativo</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-lg font-black text-orange-900 leading-tight">{equipmentToDelete?.name}</p>
                <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest mt-1">Série/Placa: {equipmentToDelete?.plate || 'S/N'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Data de Saída</Label>
            <Input 
              type="date" 
              value={exitDateInput} 
              onChange={e => setExitDateInput(e.target.value)} 
              className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button 
            onClick={handleSoftDelete} 
            className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-100 font-black uppercase text-xs tracking-widest transition-all active:scale-[0.98]"
          >
            Confirmar Saída
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setIsDeleteOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-[9px] text-gray-400 tracking-widest hover:text-gray-600"
          >
            Cancelar operação
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isTankModalOpen}
        onClose={() => setIsTankModalOpen(false)}
        maxWidth="md"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <Droplet className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white leading-tight">Novo Tanque</h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Cadastro de armazenamento de combustível</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome/Identificação</Label>
            <Input 
              placeholder="Ex: Tanque Principal Obra" 
              value={newTank.name} 
              onChange={e => setNewTank({...newTank, name: e.target.value})} 
              className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacidade (L)</Label>
              <Input 
                type="number" 
                value={newTank.capacity || ''} 
                onChange={e => setNewTank({...newTank, capacity: Number(e.target.value)})} 
                className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Volume Inicial (L)</Label>
              <Input 
                type="number" 
                value={newTank.currentLevel || ''} 
                onChange={e => setNewTank({...newTank, currentLevel: Number(e.target.value)})} 
                className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button 
            onClick={handleCreateTank} 
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-xs tracking-widest transition-all active:scale-[0.98]"
          >
            Salvar Tanque
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isFuelLogModalOpen}
        onClose={() => setIsFuelLogModalOpen(false)}
        maxWidth="md"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className={cn("p-8 text-white relative overflow-hidden", newFuelLog.type === 'entrada' ? 'bg-emerald-600' : 'bg-orange-600')}>
          <Droplet className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <h2 className="text-2xl font-black text-white leading-tight">
              {newFuelLog.type === 'entrada' ? 'Entrada de Combustível' : 'Abastecimento'}
            </h2>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
              {newFuelLog.type === 'entrada' ? 'Registro de compra/carga' : 'Saída para equipamento'}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</Label>
              <Input 
                type="date" 
                value={newFuelLog.date} 
                onChange={e => setNewFuelLog({...newFuelLog, date: e.target.value})} 
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold"
              />
            </div>
            
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanque de Origem</Label>
              <Select value={newFuelLog.tankId || ''} onValueChange={val => setNewFuelLog({...newFuelLog, tankId: val})}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Selecione o tanque" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {fuelTanks.filter(t => !selectedContractId || t.contractId === selectedContractId).map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">{t.name} ({t.currentLevel}/{t.capacity}L)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newFuelLog.type === 'saida' && (
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipamento Destino</Label>
                  <Popover open={openDest} onOpenChange={setOpenDest}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-12 px-4 border-gray-100 bg-gray-50/50 rounded-xl font-bold text-sm"
                      >
                        {(() => {
                          if (!newFuelLog.equipmentId) return "Selecionar destino...";
                          const eq = equipments.find(e => e.id === newFuelLog.equipmentId);
                          if (eq) return `${eq.name} (${eq.plate})`;
                          const tk = fuelTanks.find(t => t.id === newFuelLog.equipmentId);
                          if (tk) return `Tanque: ${tk.name}`;
                          return "Destino selecionado";
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl overflow-hidden border-gray-100 shadow-2xl" align="start">
                      <Command>
                        <CommandInput placeholder="Filtrar equipamentos..." className="border-none focus:ring-0 font-bold" />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>Nenhum destino encontrado.</CommandEmpty>
                          
                          {fuelTanks.filter(t => t.id !== newFuelLog.tankId && (!selectedContractId || t.contractId === selectedContractId)).length > 0 && (
                            <CommandGroup heading="Tanques">
                              {fuelTanks
                                .filter(t => t.id !== newFuelLog.tankId)
                                .filter(t => !selectedContractId || t.contractId === selectedContractId)
                                .map(t => (
                                  <CommandItem
                                    key={t.id}
                                    value={t.name + " tanque"}
                                    onSelect={() => {
                                      setNewFuelLog({ ...newFuelLog, equipmentId: t.id });
                                      setOpenDest(false);
                                    }}
                                    className="py-3 px-4 rounded-xl cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-blue-600", newFuelLog.equipmentId === t.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-black text-gray-900 uppercase text-[10px]">Tanque: {t.name}</span>
                                      <span className="text-[9px] text-gray-500 font-bold">Nível: {t.currentLevel}L / {t.capacity}L</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                          
                          <CommandGroup heading="Equipamentos">
                            {filteredEquipments
                              .filter(e => !e.exitDate)
                              .map(e => (
                                <CommandItem
                                  key={e.id}
                                  value={e.name + " " + e.plate}
                                  onSelect={() => {
                                    setNewFuelLog({ ...newFuelLog, equipmentId: e.id });
                                    setOpenDest(false);
                                  }}
                                  className="py-3 px-4 rounded-xl cursor-pointer"
                                >
                                  <Check className={cn("mr-2 h-4 w-4 text-blue-600", newFuelLog.equipmentId === e.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span className="font-black text-gray-900 uppercase text-[10px]">{e.name}</span>
                                    <span className="text-[9px] text-gray-500 font-bold tracking-tight">PLACA: {e.plate || 'S/N'}</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade (Litros)</Label>
              <Input 
                type="number" 
                value={newFuelLog.quantity || ''} 
                onChange={e => setNewFuelLog({...newFuelLog, quantity: Number(e.target.value)})} 
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-black text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            {newFuelLog.type === 'entrada' && (
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor / Nº Nota</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Fornecedor" value={newFuelLog.supplier || ''} onChange={e => setNewFuelLog({...newFuelLog, supplier: e.target.value})} className="h-12 border-gray-100 bg-gray-50/50 rounded-xl" />
                    <Input placeholder="Nota Fiscal" value={newFuelLog.invoiceNumber || ''} onChange={e => setNewFuelLog({...newFuelLog, invoiceNumber: e.target.value})} className="h-12 border-gray-100 bg-gray-50/50 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço Un. (R$)</Label>
                    <Input type="number" step="0.01" value={newFuelLog.unitPrice || ''} onChange={e => setNewFuelLog({...newFuelLog, unitPrice: Number(e.target.value)})} className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo Total (R$)</Label>
                    <Input type="number" step="0.01" value={newFuelLog.cost || ''} onChange={e => setNewFuelLog({...newFuelLog, cost: Number(e.target.value)})} className="h-12 border-emerald-100 bg-emerald-50/50 rounded-xl font-black text-emerald-700" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button 
            onClick={handleCreateFuelLog} 
            className={cn("w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.98]", newFuelLog.type === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100')}
          >
            {newFuelLog.type === 'entrada' ? 'Registrar Nova Entrada' : 'Registrar Saída'}
          </Button>
          <Button variant="ghost" onClick={() => setIsFuelLogModalOpen(false)} className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-[9px] text-gray-400">Cancelar operação</Button>
        </div>
      </Modal>

      <Modal
        isOpen={isMaterialRequestModalOpen}
        onClose={() => setIsMaterialRequestModalOpen(false)}
        maxWidth="2xl"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden rounded-t-2xl">
          <ShoppingCart className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <h2 className="text-3xl font-black tracking-tight">Solicitação de Compra</h2>
            <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mt-1">Gerencie os detalhes e itens da solicitação para o Controlador</p>
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
                placeholder="Ex: CONTROLADOR"
                value={currentRequest.sector || 'CONTROLADOR'}
                onChange={e => setCurrentRequest({...currentRequest, sector: e.target.value})}
                className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-gray-400">Descrição Geral / Motivo</Label>
            <Input 
              placeholder="Ex: Reposição de peças para equipamentos" 
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
              <Label className="text-[10px] uppercase font-bold text-gray-400">Prioridade</Label>
              <Select 
                value={currentRequest.priority || 'Normal'}
                onValueChange={(v: any) => setCurrentRequest({ ...currentRequest, priority: v })}
              >
                <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Urgente" className="text-red-600 font-black">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      URGENTE
                    </div>
                  </SelectItem>
                  <SelectItem value="Alta" className="text-orange-600 font-bold">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      ALTA
                    </div>
                  </SelectItem>
                  <SelectItem value="Normal" className="text-blue-600 font-bold">NORMAL</SelectItem>
                  <SelectItem value="Baixa" className="text-gray-600 font-bold">BAIXA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 relative">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Categoria</Label>
              <div className="relative">
                <Input 
                  value={newRequestCategory} 
                  onChange={e => {
                    setNewRequestCategory(e.target.value);
                    setShowCategorySuggestions(true);
                  }}
                  onFocus={() => setShowCategorySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                  placeholder="Ex. Mecânica, Elétrica..." 
                  className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 font-bold"
                />
                {showCategorySuggestions && savedCategories.filter(c => c.toLowerCase().includes(newRequestCategory.toLowerCase())).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden py-2">
                    {savedCategories
                      .filter(c => c.toLowerCase().includes(newRequestCategory.toLowerCase()))
                      .map(cat => (
                        <div 
                          key={cat} 
                          className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-xs font-bold text-gray-700"
                          onClick={() => {
                            setNewRequestCategory(cat);
                            setShowCategorySuggestions(false);
                          }}
                        >
                          {cat}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Itens da Solicitação</Label>
              <Button 
                type="button" 
                size="sm" 
                onClick={addItemInput}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none h-8 font-bold text-[10px] rounded-lg"
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {(currentRequest.items || []).map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md hover:border-blue-100 relative">
                  <div className="col-span-12 sm:col-span-7 space-y-1">
                    <Label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Descrição do Item / Aplicação</Label>
                    <Input 
                      placeholder="Ex: Filtro de Óleo - Placa ABC-1234"
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Qtd</Label>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white text-center"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Unid</Label>
                    <Input 
                      placeholder="un"
                      value={item.unit}
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                      className="h-10 border-gray-200 rounded-xl focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end justify-center pb-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(idx)}
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(currentRequest.items || []).length === 0 && (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-xs font-medium">Nenhum item adicionado ainda.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addItemInput}
                    className="mt-2 text-emerald-600 border-emerald-200"
                  >
                    Clique para adicionar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <Button 
            onClick={handleCreateMaterialRequest} 
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-xs tracking-widest transition-all active:scale-[0.98]"
          >
            Enviar Solicitação
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setIsMaterialRequestModalOpen(false)}
            className="w-full mt-2 h-10 rounded-xl font-bold uppercase text-[9px] text-gray-400 tracking-widest hover:text-gray-600"
          >
            Fechar janela
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        maxWidth="2xl"
        className="p-0"
        headerClassName="hidden"
      >
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <Truck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10 text-left">
            <div className="flex items-center gap-3 mb-2">
               <Badge variant="outline" className="border-blue-400 text-blue-100 bg-blue-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{selectedEquipment?.code || 'SEM CÓDIGO'}</Badge>
               <Badge variant="outline" className="border-blue-400 text-blue-100 bg-blue-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{selectedEquipment?.situation}</Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{selectedEquipment?.name}</h2>
            <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mt-1">{selectedEquipment?.brand} {selectedEquipment?.model} • Placa: {selectedEquipment?.plate}</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Informações Base</h4>
              <div className="grid gap-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Ano</span>
                  <span className="text-[11px] font-black">{selectedEquipment?.year}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Horímetro Atual</span>
                  <span className="text-[11px] font-black text-blue-600 font-mono tracking-tighter">{selectedEquipment?.currentReading}h</span>
                </div>
                 <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Obra Atual</span>
                  <span className="text-[11px] font-black text-emerald-600">{getContractName(selectedEquipment?.contractId || '')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Status Operacional</h4>
              <div className="grid gap-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Em Manutenção?</span>
                  <Badge className={cn("text-[9px] font-black px-2", selectedEquipment?.inMaintenance ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")}>
                    {selectedEquipment?.inMaintenance ? 'SIM' : 'NÃO'}
                  </Badge>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Status do Patrimônio</span>
                  <span className="text-[11px] font-black">{selectedEquipment?.situation}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Atributos Técnicos</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(selectedEquipment?.customFields || {}).map(([key, f]) => {
                const field = f as EquipmentAttribute;
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-black text-gray-900">
                      {field.type === 'boolean' ? (field.value ? 'Sim' : 'Não') : field.value}
                    </span>
                  </div>
                );
              })}
              {(!selectedEquipment?.customFields || Object.keys(selectedEquipment.customFields).length === 0) && (
                 <div className="col-span-full py-4 text-center text-[10px] text-gray-400 font-bold uppercase italic">Sem atributos customizados</div>
              )}
            </div>
          </div>

          {selectedEquipment?.observations && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Observações Gerais</h4>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-xs font-medium text-gray-700 leading-relaxed italic">
                "{selectedEquipment.observations}"
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="rounded-xl font-bold uppercase text-[10px] h-12 px-6 flex-1">Fechar</Button>
          <Button 
              onClick={() => {
                 setEquipmentToEdit(selectedEquipment);
                 setIsEditOpen(true);
                 setIsDetailOpen(false);
              }} 
              className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest flex-[2]"
          >
              <Edit className="w-4 h-4 mr-2" /> Editar Equipamento
          </Button>
        </DialogFooter>
      </Modal>
      <Dialog open={isApplyStockOpen} onOpenChange={setIsApplyStockOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-blue-600">Aplicar Material em Equipamento</DialogTitle>
            <DialogDescription className="text-xs font-bold text-gray-400 uppercase">
              Retirada de material do estoque para manutenção
            </DialogDescription>
          </DialogHeader>
          
          {selectedStockItem && (
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Material Selecionado</span>
                <span className="text-sm font-black text-gray-900">{selectedStockItem.item.description}</span>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Saldo Disponível</span>
                  <Badge className="bg-blue-100 text-blue-700 border-none font-black">
                    {(selectedStockItem.item.quantity - (selectedStockItem.item.appliedQuantity || 0))} {selectedStockItem.item.unit}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-gray-400">Equipamento de Destino</Label>
                  <Select value={applyEquipmentId} onValueChange={setApplyEquipmentId}>
                    <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-blue-500">
                      <SelectValue placeholder="Selecione o Equipamento" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {equipments
                        .filter(e => !e.exitDate)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id} className="font-bold py-3">
                            <div className="flex flex-col">
                              <span>{e.name}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Placa: {e.plate}</span>
                            </div>
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-gray-400">Quantidade a Aplicar</Label>
                  <Input 
                    type="number"
                    value={applyQuantity}
                    onChange={e => setApplyQuantity(Number(e.target.value))}
                    max={(selectedStockItem.item.quantity - (selectedStockItem.item.appliedQuantity || 0))}
                    min={1}
                    className="h-12 border-gray-200 rounded-xl font-black text-blue-600 focus:ring-blue-500"
                  />
                  <p className="text-[9px] text-gray-400 font-medium italic">* A quantidade aplicada será registrada no histórico do equipamento.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-8">
            <Button 
              onClick={handleApplyStock} 
              disabled={!applyEquipmentId || applyQuantity <= 0 || (selectedStockItem ? applyQuantity > (selectedStockItem.item.quantity - (selectedStockItem.item.appliedQuantity || 0)) : true)}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
            >
              Confirmar Aplicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
