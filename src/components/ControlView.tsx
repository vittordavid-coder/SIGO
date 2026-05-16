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
  Camera,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  ServiceHistoryEntry,
  EquipmentMeasurement,
  DailyEquipmentMeasurement
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
  fuelTanks: FuelTank[];
  setFuelTanks: (val: FuelTank[] | ((prev: FuelTank[]) => FuelTank[])) => void;
  fuelLogs: FuelLog[];
  setFuelLogs: (val: FuelLog[] | ((prev: FuelLog[]) => FuelLog[])) => void;
  onDeleteFuelLog?: (id: string) => void;
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
  fuelTanks = [],
  setFuelTanks,
  fuelLogs = [],
  setFuelLogs,
  onDeleteFuelLog,
  initialTab
}: ControlViewProps) {
  const [activeTab, setActiveTab] = React.useState(initialTab || 'list');

  const [savedCategories, setSavedCategories] = useLocalStorage<string[]>('sigo_control_categories', [], currentUser?.companyId);

  const DEFAULT_FUELS = ["Diesel S10", "Diesel S500", "Gasolina Comum", "Gasolina Aditivada", "Etanol", "Arla 32"];

  const [isTankModalOpen, setIsTankModalOpen] = useState(false);
  const [editingTankId, setEditingTankId] = useState<string | null>(null);
  const [isDeleteTankDialogOpen, setIsDeleteTankDialogOpen] = useState(false);
  const [tankToDelete, setTankToDelete] = useState<FuelTank | null>(null);
  const [newTank, setNewTank] = useState<Partial<FuelTank>>({ name: '', capacity: 0, currentLevel: 0, fuelType: 'Diesel S10' });
  const [isFuelLogModalOpen, setIsFuelLogModalOpen] = useState(false);
  const [isDeleteFuelLogDialogOpen, setIsDeleteFuelLogDialogOpen] = useState(false);
  const [fuelLogToDelete, setFuelLogToDelete] = useState<FuelLog | null>(null);
  const [editingFuelLogId, setEditingFuelLogId] = useState<string | null>(null);
  const [newFuelLog, setNewFuelLog] = useState<Partial<FuelLog>>({ type: 'saida', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '' });
  const [customFuel, setCustomFuel] = useState('');
  const [openDest, setOpenDest] = useState(false);

  const handleEditFuelLog = (log: FuelLog) => {
    setEditingFuelLogId(log.id);
    setNewFuelLog({ ...log });
    setIsFuelLogModalOpen(true);
  };

  const [isMaterialRequestModalOpen, setIsMaterialRequestModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<Partial<PurchaseRequest>>({
    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'un' }],
    status: 'Pendente',
    priority: 'Normal'
  });
  const [newRequestCategory, setNewRequestCategory] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Removed internal equipmentMeasurements state as it's now a prop
  const [isNewMeasurementModalOpen, setIsNewMeasurementModalOpen] = useState(false);
  const [isPeriodSelectionOpen, setIsPeriodSelectionOpen] = useState(false);
  const [measurementPeriod, setMeasurementPeriod] = useState({ start: '', end: '' });
  const [tempDailyData, setTempDailyData] = useState<DailyEquipmentMeasurement[]>([]);
  const [measurementMonth, setMeasurementMonth] = useState('');
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  
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
  const [priceDisplayMode, setPriceDisplayMode] = useState<'monthly' | 'measurement'>('monthly');
  const [sortField, setSortField] = useState<'name' | 'category' | 'origin' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOnlyActive, setFilterOnlyActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isExitMaintenanceModalOpen, setIsExitMaintenanceModalOpen] = useState(false);
  const [maintenanceExitDate, setMaintenanceExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [equipmentToExit, setEquipmentToExit] = useState<ControllerEquipment | null>(null);
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
      const matchesContract = !selectedContractId || selectedContractId === 'all' || e.contractId === selectedContractId;
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
        const getPrice = (e: ControllerEquipment) => {
          if (priceDisplayMode === 'monthly') {
            return e.monthlyPrice || (equipmentMonthly.find(d => d.equipmentId === e.id && d.month === selectedMonth)?.cost || 0);
          }
          return e.contractedPrice || 0;
        };
        comparison = getPrice(a) - getPrice(b);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [equipments, currentUser, searchTerm, filterOnlyActive, sortField, sortOrder, selectedContractId, equipmentMonthly, selectedMonth, priceDisplayMode]);

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
    ownerName: '',
    ownerCnpj: '',
    category: 'Médio',
    measurementUnit: 'Horímetro',
    entryDate: new Date().toISOString().split('T')[0],
    contractId: '',
    currentReading: 0,
    contractedPrice: 0,
    monthlyPrice: 0,
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
      ownerName: '',
      ownerCnpj: '',
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

  const handleEditTank = (tank: FuelTank) => {
    setEditingTankId(tank.id);
    setNewTank({ ...tank });
    setCustomFuel(!DEFAULT_FUELS.includes(tank.fuelType) ? tank.fuelType : '');
    setIsTankModalOpen(true);
  };

  const generateDailyMeasurementData = (start: string, end: string) => {
    if (!start || !end || !selectedEquipment) return;
    const startDate = new Date(start + 'T12:00:00');
    const endDate = new Date(end + 'T12:00:00');
    const dailyData: DailyEquipmentMeasurement[] = [];
    
    // Try to find the last final reading from previous measurements
    let lastKnownReading = 0;
    const sortedMeasurements = [...(selectedEquipment.measurements || [])].sort((a, b) => {
      const dateA = a.period.split(' a ')[1] || '';
      const dateB = b.period.split(' a ')[1] || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    if (sortedMeasurements.length > 0) {
      const lastM = sortedMeasurements[0];
      if (lastM.details && lastM.details.length > 0) {
        lastKnownReading = lastM.details[lastM.details.length - 1].finalReading;
      }
    }

    let current = new Date(startDate);
    while (current <= endDate) {
      dailyData.push({
        date: current.toISOString().split('T')[0],
        initialReading: dailyData.length === 0 ? lastKnownReading : 0,
        finalReading: dailyData.length === 0 ? lastKnownReading : 0,
        discount: false,
        status: 'Trabalhando'
      });
      current.setDate(current.getDate() + 1);
    }
    setTempDailyData(dailyData);
  };

  const generateMeasurementPDF = (measurement: EquipmentMeasurement, equipment: ControllerEquipment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE MEDIÇÃO", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Empresa: ${currentUser?.companyName || 'SIGO System'}`, 20, 30);
    doc.text(`Equipamento: ${equipment.code} - ${equipment.name}`, 20, 35);
    doc.text(`Série/Placa: ${equipment.plate || 'N/A'}`, 20, 40);
    const pStartDay = measurement.period.split(' a ')[0];
    const pEndDay = measurement.period.split(' a ')[1];
    doc.text(`Período: ${new Date(pStartDay + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(pEndDay + 'T12:00:00').toLocaleDateString('pt-BR')}`, 20, 45);
    doc.text(`Unidade: ${equipment.measurementUnit}`, pageWidth - 20, 30, { align: 'right' });
    doc.text(`Mês Referência: ${measurement.month}`, pageWidth - 20, 35, { align: 'right' });
    
    // Measurement Details Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento da Medição", 20, 60);
    
    const tableData = (measurement.details || []).map(day => [
      new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      day.initialReading.toLocaleString('pt-BR'),
      day.finalReading.toLocaleString('pt-BR'),
      day.discount ? "Sim" : "Não",
      (day.discount ? 0 : (day.finalReading - day.initialReading)).toLocaleString('pt-BR'),
      day.status
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Data', 'Inicial', 'Final', 'Desc.', 'Total Líquido', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 }
    });
    
    let lastY = (doc as any).lastAutoTable.finalY || 65;
    let currentY = lastY + 15;
    
    // Summary
    if (currentY > 260) { doc.addPage(); currentY = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo de Produção", 20, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const totalBruto = measurement.details?.reduce((acc, d) => acc + (d.finalReading - d.initialReading), 0) || 0;
    doc.text(`Total Lançado (Bruto): ${totalBruto.toLocaleString('pt-BR')} ${equipment.measurementUnit === 'Horímetro' ? 'h' : 'km'}`, 20, currentY);
    doc.text(`Total Líquido: ${measurement.totalUnits.toLocaleString('pt-BR')} ${equipment.measurementUnit === 'Horímetro' ? 'h' : 'km'}`, 20, currentY + 5);
    doc.text(`Valor Unitário: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(equipment.contractedPrice || 0)}`, pageWidth - 20, currentY, { align: 'right' });
    doc.text(`Valor Total Medido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(measurement.totalValue || 0)}`, pageWidth - 20, currentY + 5, { align: 'right' });
    
    currentY += 20;

    // Filter Fuel Logs
    const startRange = new Date(pStartDay + 'T00:00:00');
    const endRange = new Date(pEndDay + 'T23:59:59');
    
    const relatedFuel = fuelLogs.filter(f => 
      f.equipmentId === equipment.id && 
      new Date(f.date) >= startRange && 
      new Date(f.date) <= endRange
    );

    if (relatedFuel.length > 0) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Histórico de Abastecimentos (No Período)", 20, currentY);
      
      const fuelData = relatedFuel.map(f => [
        new Date(f.date).toLocaleDateString('pt-BR'),
        f.quantity.toLocaleString('pt-BR') + ' L',
        f.unitPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.unitPrice) : '-',
        f.cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.cost) : '-',
        f.notes || ''
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Quantidade', 'Preço Un.', 'Custo Total', 'Observações']],
        body: fuelData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8 }
      });
      lastY = (doc as any).lastAutoTable.finalY || currentY;
      currentY = lastY + 15;
    }

    // Filter Maintenance
    const relatedMaint = equipmentMaintenance.filter(m => 
      m.equipmentId === equipment.id && 
      new Date(m.entryDate) >= startRange && 
      new Date(m.entryDate) <= endRange
    );

    if (relatedMaint.length > 0) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Histórico de Manutenções (Iniciadas no Período)", 20, currentY);
      
      const maintData = relatedMaint.map(m => [
        new Date(m.entryDate).toLocaleDateString('pt-BR'),
        m.exitDate ? new Date(m.exitDate).toLocaleDateString('pt-BR') : 'Em aberto',
        m.type === 'preventive' ? 'Preventiva' : 'Corretiva',
        m.requestedItems || '',
        m.totalCost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.totalCost) : '-'
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Entrada', 'Saída', 'Tipo', 'Descrição/Itens', 'Custo']],
        body: maintData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 8 }
      });
    }

    doc.save(`Medicao_${equipment.code}_${measurement.month}.pdf`);
  };

  const handleSaveMeasurement = () => {
    if (!selectedEquipment) return;
    
    const tempMeasurements = selectedEquipment.measurements || [];
    // DESCONSIDERA DIAS NÃO PREENCHIDOS (FINAL READING <= 0)
    const filledDays = tempDailyData.filter(d => d.finalReading > 0);
    const totalUnits = filledDays.reduce((acc, curr) => acc + (curr.discount ? 0 : (curr.finalReading - curr.initialReading)), 0);
    const unitPrice = selectedEquipment.contractedPrice || 0;
    const totalValue = totalUnits * unitPrice;

    let updatedMeasurements: EquipmentMeasurement[] = [];

    if (editingMeasurementId) {
      updatedMeasurements = tempMeasurements.map(m => m.id === editingMeasurementId ? {
        ...m,
        month: measurementMonth,
        period: `${measurementPeriod.start} a ${measurementPeriod.end}`,
        totalUnits,
        totalValue,
        details: tempDailyData
      } : m);
      setEditingMeasurementId(null);
    } else {
      const newMeasurement: EquipmentMeasurement = {
        id: crypto.randomUUID(),
        equipmentId: selectedEquipment.id,
        companyId: currentUser?.companyId || '',
        number: (tempMeasurements.length + 1),
        month: measurementMonth,
        period: `${measurementPeriod.start} a ${measurementPeriod.end}`,
        totalUnits,
        totalValue,
        details: tempDailyData
      };
      updatedMeasurements = [...tempMeasurements, newMeasurement];
    }
    
    // Update the equipment in the main list
    const updatedEquipments = equipments.map(e => 
      e.id === selectedEquipment.id ? { ...e, measurements: updatedMeasurements } : e
    );
    onUpdateEquipments(updatedEquipments);

    // Also update equipmentToEdit if it's the same equipment being edited in the main modal
    if (equipmentToEdit && equipmentToEdit.id === selectedEquipment.id) {
      setEquipmentToEdit(prev => prev ? { ...prev, measurements: updatedMeasurements } : null);
    }
    
    setIsNewMeasurementModalOpen(false);
    setIsPeriodSelectionOpen(false);
  };

  const handleDeleteMeasurement = (id: string) => {
    if (!selectedEquipment) return;
    if (window.confirm('Tem certeza que deseja excluir esta medição?')) {
      const updatedMeasurements = (selectedEquipment.measurements || []).filter(m => m.id !== id);
      const updatedEquipments = equipments.map(e => 
        e.id === selectedEquipment.id ? { ...e, measurements: updatedMeasurements } : e
      );
      onUpdateEquipments(updatedEquipments);
      
      if (equipmentToEdit && equipmentToEdit.id === selectedEquipment.id) {
        setEquipmentToEdit(prev => prev ? { ...prev, measurements: updatedMeasurements } : null);
      }
    }
  };

  const handleCreateTank = () => {
    if (!newTank.name || !newTank.capacity) return;
    
    const tankData = {
      ...newTank as FuelTank,
      companyId: currentUser?.companyId,
      contractId: selectedContractId || newTank.contractId,
      currentLevel: newTank.currentLevel || 0,
      fuelType: customFuel || newTank.fuelType || 'Diesel S10'
    };

    if (editingTankId) {
      setFuelTanks(prev => prev.map(t => t.id === editingTankId ? { ...tankData, id: editingTankId } : t));
    } else {
      setFuelTanks([...fuelTanks, {
        ...tankData,
        id: crypto.randomUUID(),
      }]);
    }
    
    setIsTankModalOpen(false);
    setEditingTankId(null);
    setNewTank({ name: '', capacity: 0, currentLevel: 0, fuelType: 'Diesel S10' });
    setCustomFuel('');
  };

  const handleDeleteTankRequest = (tank: FuelTank) => {
    // Check if there are any logs for this tank
    const hasLogs = fuelLogs.some(log => log.tankId === tank.id);
    if (hasLogs) {
      alert('Não é possível excluir um reservatório que possui movimentações de entrada ou saída no histórico.');
      return;
    }
    setTankToDelete(tank);
    setIsDeleteTankDialogOpen(true);
  };

  const handleConfirmDeleteTank = () => {
    if (!tankToDelete) return;
    setFuelTanks(prev => prev.filter(t => t.id !== tankToDelete.id));
    setIsDeleteTankDialogOpen(false);
    setTankToDelete(null);
    setIsTankModalOpen(false);
    setEditingTankId(null);
  };

  const handleCreateFuelLog = () => {
    if (!newFuelLog.tankId || !newFuelLog.quantity) return;
    
    const quantityNum = Number(newFuelLog.quantity);
    let updatedTanks = [...fuelTanks];
    
    // Reverse previous level adjustments if editing
    if (editingFuelLogId) {
      const oldLog = fuelLogs.find(l => l.id === editingFuelLogId);
      if (oldLog) {
        const oldQty = Number(oldLog.quantity);
        if (oldLog.type === 'entrada') {
          updatedTanks = updatedTanks.map(t => t.id === oldLog.tankId ? { ...t, currentLevel: Math.max(0, t.currentLevel - oldQty) } : t);
        } else {
          updatedTanks = updatedTanks.map(t => t.id === oldLog.tankId ? { ...t, currentLevel: t.currentLevel + oldQty } : t);
          const oldDestId = oldLog.equipmentId;
          if (oldDestId && fuelTanks.some(t => t.id === oldDestId)) {
            updatedTanks = updatedTanks.map(t => t.id === oldDestId ? { ...t, currentLevel: Math.max(0, t.currentLevel - oldQty) } : t);
          }
        }
      }
    }
    
    // Find source tank in the fresh list
    const sourceTank = updatedTanks.find(t => t.id === newFuelLog.tankId);
    if (!sourceTank) return;

    let unitPrice = newFuelLog.unitPrice || 0;

    // Logic: for exit, use price from last entry of this tank
    if (newFuelLog.type === 'saida') {
      const lastEntry = fuelLogs.find(l => l.tankId === newFuelLog.tankId && l.type === 'entrada' && l.unitPrice);
      if (lastEntry) {
        unitPrice = lastEntry.unitPrice || 0;
      }
    }

    // Apply new level adjustments to source
    const newSourceLevel = newFuelLog.type === 'entrada' 
      ? sourceTank.currentLevel + quantityNum 
      : sourceTank.currentLevel - quantityNum;
      
    updatedTanks = updatedTanks.map(t => t.id === sourceTank.id ? { ...t, currentLevel: Math.max(0, newSourceLevel) } : t);

    // If it's a transfer, apply to destination tank too
    if (newFuelLog.type === 'saida' && newFuelLog.equipmentId) {
      const destTank = updatedTanks.find(t => t.id === newFuelLog.equipmentId);
      if (destTank) {
        updatedTanks = updatedTanks.map(t => t.id === destTank.id ? { ...t, currentLevel: t.currentLevel + quantityNum } : t);
      }
    }

    // Save the log
    const calculatedCost = newFuelLog.type === 'entrada' 
      ? (newFuelLog.cost || unitPrice * quantityNum) 
      : (unitPrice * quantityNum);

    const logToSave: FuelLog = {
      ...newFuelLog as FuelLog,
      id: editingFuelLogId || crypto.randomUUID(),
      companyId: currentUser?.companyId,
      unitPrice: unitPrice,
      cost: calculatedCost
    };

    // Update tanks first to ensure consistency
    setFuelTanks(updatedTanks);

    if (editingFuelLogId) {
      setFuelLogs(fuelLogs.map(l => l.id === editingFuelLogId ? logToSave : l));
    } else {
      setFuelLogs([logToSave, ...fuelLogs]);
    }

    setIsFuelLogModalOpen(false);
    setEditingFuelLogId(null);
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
      // Closing maintenance - show confirmation modal
      setEquipmentToExit(equipment);
      setMaintenanceExitDate(new Date().toISOString().split('T')[0]);
      setIsExitMaintenanceModalOpen(true);
    }
  };

  const handleConfirmExitMaintenance = () => {
    if (!equipmentToExit) return;

    const exitDate = maintenanceExitDate;
    
    onUpdateEquipments(equipments.map(e => 
      e.id === equipmentToExit.id ? { 
        ...e, 
        situation: 'Ativo',
        inMaintenance: false,
        maintenance_exit_date: exitDate,
        maintenance_entry_date: null as any,
        maintenance_type: null as any
      } : e
    ));

    // Update maintenance record in history
    const activeMaintenance = equipmentMaintenance.find(m => m.equipmentId === equipmentToExit.id && !m.exitDate);
    if (activeMaintenance) {
      const entry = new Date(activeMaintenance.entryDate + 'T12:00:00');
      const exit = new Date(exitDate + 'T12:00:00');
      const diffTime = Math.abs(exit.getTime() - entry.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      onUpdateMaintenance(equipmentMaintenance.map(m => 
        m.id === activeMaintenance.id ? { ...m, exitDate, daysInMaintenance: diffDays } : m
      ));
    }

    setIsExitMaintenanceModalOpen(false);
    setEquipmentToExit(null);
  };

  const handleConfirmMaintenance = () => {
    if (!maintenanceEquipment || !currentUser) return;
    
    onUpdateEquipments(equipments.map(e => 
      e.id === maintenanceEquipment.id ? { 
        ...e, 
        situation: 'Em Manutenção',
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

  const handleConfirmDeleteFuelLog = () => {
    if (!fuelLogToDelete) return;
    
    // Reverse inventory changes
    let updatedTanks = [...fuelTanks];
    const quantity = Number(fuelLogToDelete.quantity);
    
    if (fuelLogToDelete.type === 'entrada') {
      // Removed entry: subtract from tank level
      updatedTanks = updatedTanks.map(t => t.id === fuelLogToDelete.tankId ? { ...t, currentLevel: Math.max(0, t.currentLevel - quantity) } : t);
    } else {
      // Removed exit: add back to source tank level
      updatedTanks = updatedTanks.map(t => t.id === fuelLogToDelete.tankId ? { ...t, currentLevel: t.currentLevel + quantity } : t);
      
      // If it was a transfer to another reservoir, subtract from destination
      const destId = fuelLogToDelete.equipmentId;
      if (destId && fuelTanks.some(t => t.id === destId)) {
        updatedTanks = updatedTanks.map(t => t.id === destId ? { ...t, currentLevel: Math.max(0, t.currentLevel - quantity) } : t);
      }
    }
    
    setFuelTanks(updatedTanks);
    if (onDeleteFuelLog) {
      onDeleteFuelLog(fuelLogToDelete.id);
    } else {
      setFuelLogs(prev => prev.filter(fl => fl.id !== fuelLogToDelete.id));
    }
    
    setIsDeleteFuelLogDialogOpen(false);
    setFuelLogToDelete(null);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-sans">
      <Dialog open={isDeleteFuelLogDialogOpen} onOpenChange={setIsDeleteFuelLogDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium pt-2 text-center">
              Você tem certeza que deseja excluir este registro de combustível? 
              <br/>
              <span className="text-red-500 font-bold mt-2 block">O estoque do reservatório será estornado automaticamente.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-8">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteFuelLogDialogOpen(false)}
              className="flex-1 h-12 rounded-2xl border-gray-100 font-bold hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDeleteFuelLog}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-100"
            >
              Excluir Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteTankDialogOpen} onOpenChange={setIsDeleteTankDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Excluir Reservatório</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium pt-2 text-center">
              Tem certeza que deseja excluir o reservatório <span className="font-bold text-gray-900">"{tankToDelete?.name}"</span>?
              <br/>
              Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-center mt-8">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteTankDialogOpen(false)}
              className="flex-1 h-12 rounded-2xl border-gray-100 font-bold hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDeleteTank}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-100"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Modal
        isOpen={isExitMaintenanceModalOpen}
        onClose={() => setIsExitMaintenanceModalOpen(false)}
        maxWidth="md"
        className="p-0 border-none"
        headerClassName="hidden"
      >
        <div className="bg-red-600 p-6 text-white relative overflow-hidden">
          <Trash2 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Check className="w-5 h-5 text-red-200" />
              Finalizar Manutenção
            </h2>
            <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest mt-1">
              {equipmentToExit?.name} - {equipmentToExit?.plate}
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-white">
          <div className="space-y-2">
            <Label htmlFor="exit_maintenance_date" className="text-[10px] uppercase font-black text-gray-500 tracking-tight">Data de Saída</Label>
            <Input
              type="date"
              id="exit_maintenance_date"
              value={maintenanceExitDate}
              onChange={(e) => setMaintenanceExitDate(e.target.value)}
              className="h-14 rounded-xl border-gray-100 bg-gray-50 font-bold focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm font-medium text-gray-600">
              Ao confirmar, o equipamento retornará ao status de <strong>Ativo</strong> e o histórico de manutenção será encerrado.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 rounded-b-2xl">
          <Button variant="ghost" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 flex-1" onClick={() => setIsExitMaintenanceModalOpen(false)}>Cancelar</Button>
          <Button className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-700 h-12 flex-[2] shadow-xl shadow-red-100" onClick={handleConfirmExitMaintenance}>
            Confirmar Saída
          </Button>
        </div>
      </Modal>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Controlador de Equipamentos</h1>
          <p className="text-xs text-gray-500 font-medium">Gestão de frotas e manutenção preventiva/corretiva.</p>
        </div>
        <div className="flex items-center gap-3">
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
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                  <button 
                    onClick={() => setPriceDisplayMode('monthly')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      priceDisplayMode === 'monthly' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Preço Mensal
                  </button>
                  <button 
                    onClick={() => setPriceDisplayMode('measurement')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      priceDisplayMode === 'measurement' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Preço Medição
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="rounded-xl gap-2 font-bold text-xs"><FileDown className="w-4 h-4" /> Modelo</Button>
                <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} className="rounded-xl gap-2 font-bold text-xs"><Upload className="w-4 h-4" /> Importar</Button>
                <Button onClick={() => {
                  setNewEquip({
                    id: uuidv4(),
                    code: '',
                    name: '',
                    type: '',
                    brand: '',
                    model: '',
                    year: new Date().getFullYear(),
                    situation: 'Ativo',
                    plate: '',
                    origin: 'Próprio',
                    ownerName: '',
                    ownerCnpj: '',
                    category: 'Médio',
                    measurementUnit: 'Horímetro',
                    entryDate: new Date().toISOString().split('T')[0],
                    contractId: selectedContractId !== 'all' ? selectedContractId : '',
                    currentReading: 0,
                    contractedPrice: 0,
                    monthlyPrice: 0,
                    observations: '',
                    customFields: {},
                    photos: []
                  });
                  setIsAddOpen(true);
                }} className="rounded-xl bg-blue-600 gap-2 font-bold text-xs"><Plus className="w-4 h-4 mr-2" /> Novo</Button>
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
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Origem do Ativo</Label>
                              <Select value={newEquip.origin} onValueChange={val => setNewEquip({...newEquip, origin: val})}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Próprio">Próprio</SelectItem>
                                  <SelectItem value="Alugado">Alugado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {newEquip.origin === 'Alugado' && (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Proprietário / Locador</Label>
                                  <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.ownerName} onChange={e => setNewEquip({...newEquip, ownerName: e.target.value})} placeholder="Razão Social" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">CNPJ Proprietário</Label>
                                  <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.ownerCnpj} onChange={e => setNewEquip({...newEquip, ownerCnpj: e.target.value})} placeholder="00.000.000/0000-00" />
                                </div>
                              </>
                            )}

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
                                  <SelectItem value="Mensal">Mensal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Leitura Inicial</Label>
                              <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.currentReading} onChange={val => setNewEquip({...newEquip, currentReading: val})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">
                                {newEquip.measurementUnit === 'Horímetro' ? 'Preço Hora' : newEquip.measurementUnit === 'Quilometragem' ? 'Preço KM' : 'Preço Medição'}
                              </Label>
                              <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.contractedPrice} onChange={val => setNewEquip({...newEquip, contractedPrice: val})} prefix="R$" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] uppercase font-black text-slate-500 tracking-tight">Preço Mensal</Label>
                              <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-12 text-sm font-bold" value={newEquip.monthlyPrice} onChange={val => setNewEquip({...newEquip, monthlyPrice: val})} prefix="R$" />
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
                            {/* Standard Technical Fields moved from Basic */}
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-blue-600 tracking-tight">Marca / Fabricante</Label>
                              <Input className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs" value={newEquip.brand} onChange={e => setNewEquip({...newEquip, brand: e.target.value})} placeholder="Ex: Caterpillar" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-blue-600 tracking-tight">Modelo / Versão</Label>
                              <Input className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs" value={newEquip.model} onChange={e => setNewEquip({...newEquip, model: e.target.value})} placeholder="Ex: 320 NG" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-blue-600 tracking-tight">Ano de Fabricação</Label>
                              <Input type="number" className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs" value={newEquip.year} onChange={e => setNewEquip({...newEquip, year: parseInt(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-black text-blue-600 tracking-tight">Placa ou Serial</Label>
                              <Input className="rounded-xl bg-white border-gray-100 h-10 font-bold text-xs" value={newEquip.plate} onChange={e => setNewEquip({...newEquip, plate: e.target.value})} placeholder="ABC-1234" />
                            </div>

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
                        {priceDisplayMode === 'monthly' ? 'Custo Mensal' : 'Preço Medição'}
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
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          priceDisplayMode === 'monthly' 
                            ? (e.monthlyPrice || equipmentMonthly.find(d => d.equipmentId === e.id && d.month === selectedMonth)?.cost || 0)
                            : (e.contractedPrice || 0)
                        )}
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
                  <CardTitle className="text-lg font-black">Reservatórios</CardTitle>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl font-bold gap-2 text-xs" onClick={() => {
                  setEditingTankId(null);
                  setNewTank({ name: '', capacity: 0, currentLevel: 0, fuelType: 'Diesel S10' });
                  setCustomFuel('');
                  setIsTankModalOpen(true);
                }}>
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900">{tank.name}</h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50 transition-opacity"
                              onClick={() => handleEditTank(tank)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500">{getContractName(tank.contractId)}</p>
                            <Badge variant="outline" className="text-[8px] px-1 h-3.5 bg-blue-50 text-blue-600 border-blue-100 font-black">{tank.fuelType || 'Diesel S10'}</Badge>
                          </div>
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
                    <p className="text-xs font-bold uppercase">Nenhum reservatório cadastrado</p>
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
                    setEditingFuelLogId(null);
                    setNewFuelLog({ type: 'entrada', date: new Date().toISOString().split('T')[0], quantity: 0, tankId: '', equipmentId: '', supplier: '', invoiceNumber: '', unitPrice: undefined, cost: undefined });
                    setIsFuelLogModalOpen(true);
                  }}>
                    <Plus className="w-4 h-4" /> Nova Entrada
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl font-bold gap-2 text-xs text-orange-700 bg-orange-50 border-orange-100 hover:bg-orange-100" onClick={() => {
                    setEditingFuelLogId(null);
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
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Reservatório</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Quantidade (L)</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right whitespace-nowrap">Vlr. Unit.</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Total</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const tankMap = new Map(fuelTanks.map(t => [t.id, t]));
                      const equipMap = new Map(equipments.map(e => [e.id, e]));
                      
                      return fuelLogs.slice(0, 100).map(log => {
                        const tk = tankMap.get(log.tankId);
                        const eq = equipMap.get(log.equipmentId);
                        const destTank = tankMap.get(log.equipmentId);
                        
                        return (
                          <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-mono text-[10px] text-gray-600">{new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1 h-4", log.type === 'entrada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100')}>
                                    {log.type === 'entrada' ? 'Entrada' : destTank ? 'Transferência' : 'Saída'}
                                  </Badge>
                                  {eq && <span className="text-xs font-bold text-gray-700">{eq.name} ({eq.plate})</span>}
                                  {destTank && <span className="text-xs font-bold text-blue-700">Para: {destTank.name}</span>}
                                  {!eq && !destTank && log.type === 'saida' && <span className="text-xs text-gray-400 italic">Consumo Geral</span>}
                                </div>
                                {log.type === 'entrada' && (log.supplier || log.invoiceNumber) && (
                                  <span className="text-[10px] text-gray-500 font-medium">
                                    {log.supplier} {log.invoiceNumber ? `(NF: ${log.invoiceNumber})` : ''}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{tk?.name || '---'}</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{tk?.fuelType || 'Diesel'}</span>
                              </div>
                            </TableCell>
                            <TableCell className={cn("text-right font-mono font-bold", log.type === 'entrada' ? 'text-emerald-600' : 'text-orange-600')}>
                              {log.type === 'entrada' ? '+' : '-'}{log.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[10px] text-gray-500">
                              {log.unitPrice ? log.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-gray-900">
                              {log.cost ? log.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (log.unitPrice && log.quantity ? (log.unitPrice * log.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                  onClick={() => handleEditFuelLog(log)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                  onClick={() => {
                                    setFuelLogToDelete(log);
                                    setIsDeleteFuelLogDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
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
              <TabsTrigger value="measure" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-full px-0 font-black text-[11px] uppercase tracking-widest">Medição</TabsTrigger>
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

                  {equipmentToEdit?.origin === 'Alugado' && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Proprietário / Locador</Label>
                        <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.ownerName || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, ownerName: e.target.value} : null)} />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">CNPJ Proprietário</Label>
                        <Input className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.ownerCnpj || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, ownerCnpj: e.target.value} : null)} />
                      </div>
                    </>
                  )}

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

                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Medição por</Label>
                    <Select value={equipmentToEdit?.measurementUnit || 'Horímetro'} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, measurementUnit: val as any} : null)}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Horímetro">Horímetro (h)</SelectItem>
                        <SelectItem value="Quilometragem">Quilometragem (km)</SelectItem>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Leitura Atual / Inicial</Label>
                    <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.currentReading || 0} onChange={val => setEquipmentToEdit(prev => prev ? {...prev, currentReading: val} : null)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">
                      {equipmentToEdit?.measurementUnit === 'Horímetro' ? 'Preço Hora' : equipmentToEdit?.measurementUnit === 'Quilometragem' ? 'Preço KM' : 'Preço Medição'}
                    </Label>
                    <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.contractedPrice || 0} onChange={val => setEquipmentToEdit(prev => prev ? {...prev, contractedPrice: val} : null)} prefix="R$" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[12px] uppercase font-black text-slate-500 tracking-tight">Preço Mensal</Label>
                    <NumericInput className="rounded-xl border-slate-200 bg-slate-50/50 h-16 text-base font-bold" value={equipmentToEdit?.monthlyPrice || 0} onChange={val => setEquipmentToEdit(prev => prev ? {...prev, monthlyPrice: val} : null)} prefix="R$" />
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
                  {/* Standard Technical Fields moved from Basic */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Marca / Fabricante
                    </Label>
                    <Input className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm" value={equipmentToEdit?.brand || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, brand: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Modelo / Versão
                    </Label>
                    <Input className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm" value={equipmentToEdit?.model || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, model: e.target.value} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Ano de Fabricação
                    </Label>
                    <Input type="number" className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm" value={equipmentToEdit?.year || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, year: parseInt(e.target.value)} : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black text-blue-600 tracking-tight flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Placa / Serial
                    </Label>
                    <Input className="rounded-xl bg-white border-gray-100 h-12 font-bold text-sm shadow-sm" value={equipmentToEdit?.plate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, plate: e.target.value} : null)} />
                  </div>

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

              <TabsContent value="measure" className="mt-0 space-y-4">
                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-black">Número</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Mês</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Período</TableHead>
                        <TableHead className="text-[10px] uppercase font-black text-right">Total Produção</TableHead>
                        <TableHead className="text-[10px] uppercase font-black text-right">Valor Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(equipmentToEdit?.measurements || []).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-bold text-xs">{m.number}</TableCell>
                          <TableCell className="font-bold text-xs">{m.month}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {m.period.includes(' a ') ? m.period.split(' a ').map(d => {
                              const date = new Date(d + 'T12:00:00');
                              return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-BR');
                            }).join(' a ') : m.period}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {m.totalUnits || 0}{equipmentToEdit?.measurementUnit === 'Horímetro' ? 'h' : equipmentToEdit?.measurementUnit === 'Quilometragem' ? 'km' : ''}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs text-blue-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.totalValue || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  const parts = m.period.split(' a ');
                                  if (parts.length === 2) {
                                    setMeasurementPeriod({ start: parts[0], end: parts[1] });
                                  }
                                  setMeasurementMonth(m.month);
                                  setTempDailyData(m.details.map(d => ({
                                    ...d,
                                    discount: d.discount ?? false
                                  })));
                                  setEditingMeasurementId(m.id);
                                  setSelectedEquipment(equipmentToEdit);
                                  setIsNewMeasurementModalOpen(true);
                                }}
                                title="Editar Medição"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => equipmentToEdit && generateMeasurementPDF(m, equipmentToEdit)}
                                title="Gerar PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteMeasurement(m.id)}
                                title="Excluir Medição"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(equipmentToEdit?.measurements || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-slate-400">Nenhuma medição registrada</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <Button 
                    onClick={() => {
                      setMeasurementMonth(new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }));
                      setIsPeriodSelectionOpen(true);
                      setSelectedEquipment(equipmentToEdit);
                      setEditingMeasurementId(null);
                    }}
                    className="rounded-xl bg-blue-600 font-bold text-xs h-11 px-6 shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Nova Medição
                  </Button>
                </div>
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
        isOpen={isPeriodSelectionOpen} 
        onClose={() => setIsPeriodSelectionOpen(false)}
        title="Novo Período de Medição"
        description="Selecione o período para iniciar a medição"
      >
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Mês Referência</Label>
              <Input type="month" value={measurementMonth ? measurementMonth.split('/').reverse().join('-') : ''} onChange={e => {
                const [y, m] = e.target.value.split('-');
                setMeasurementMonth(`${m}/${y}`);
              }} />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={measurementPeriod.start} onChange={e => setMeasurementPeriod({...measurementPeriod, start: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={measurementPeriod.end} onChange={e => setMeasurementPeriod({...measurementPeriod, end: e.target.value})} />
            </div>
          </div>
          <Button 
            className="w-full h-12 rounded-xl bg-blue-600 font-bold"
            onClick={() => {
              generateDailyMeasurementData(measurementPeriod.start, measurementPeriod.end);
              setIsNewMeasurementModalOpen(true);
            }}
          >
            Iniciar Medição
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isNewMeasurementModalOpen} 
        onClose={() => setIsNewMeasurementModalOpen(false)}
        title={`Lançamento de Medição - ${measurementMonth}`}
        description={`Período: ${measurementPeriod.start ? new Date(measurementPeriod.start + 'T12:00:00').toLocaleDateString('pt-BR') : ''} a ${measurementPeriod.end ? new Date(measurementPeriod.end + 'T12:00:00').toLocaleDateString('pt-BR') : ''}`}
        maxWidth="5xl"
        className="h-[95vh]"
      >
        <div className="flex flex-col h-full bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
            <Table className="w-full min-w-max border-collapse">
              <TableHeader className="bg-white sticky top-0 z-20">
                <TableRow className="border-b-2 border-slate-100">
                  <TableHead className="w-24 text-[10px] font-black uppercase text-slate-500">Data</TableHead>
                  <TableHead className="w-32 text-[10px] font-black uppercase text-slate-500">Inicial</TableHead>
                  <TableHead className="w-32 text-[10px] font-black uppercase text-slate-500">Final</TableHead>
                  <TableHead className="w-24 text-[10px] font-black uppercase text-slate-500 text-center">Desc.</TableHead>
                  <TableHead className="w-24 text-[10px] font-black uppercase text-slate-500 text-center">Total</TableHead>
                  <TableHead className="w-48 text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempDailyData.map((day, idx) => (
                  <TableRow key={day.date} className="hover:bg-slate-50 transition-colors h-14">
                    <TableCell className="text-[11px] font-bold text-slate-600">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <NumericInput 
                        value={day.initialReading} 
                        onChange={val => {
                          const newDays = [...tempDailyData];
                          newDays[idx].initialReading = val;
                          setTempDailyData(newDays);
                        }}
                        className="h-9 rounded-lg text-xs font-bold border-slate-200"
                      />
                    </TableCell>
                    <TableCell>
                      <NumericInput 
                        value={day.finalReading} 
                        onChange={val => {
                          const newDays = [...tempDailyData];
                          newDays[idx].finalReading = val;
                          // AUTO PROPAGATE
                          if (idx + 1 < newDays.length) {
                             newDays[idx+1].initialReading = val;
                          }
                          setTempDailyData(newDays);
                        }}
                        className="h-9 rounded-lg text-xs font-bold border-slate-200"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center items-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={day.discount}
                          onChange={e => {
                            const newDays = [...tempDailyData];
                            newDays[idx].discount = e.target.checked;
                            setTempDailyData(newDays);
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-blue-600 text-[11px]">
                      {(day.finalReading - day.initialReading).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Select value={day.status} onValueChange={(val: any) => {
                        const newDays = [...tempDailyData];
                        newDays[idx].status = val;
                        if (val !== 'Trabalhando') {
                          newDays[idx].discount = true;
                        } else {
                          newDays[idx].discount = false;
                        }
                        setTempDailyData(newDays);
                      }}>
                        <SelectTrigger className="h-9 rounded-lg text-xs font-medium border-slate-200 px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trabalhando" className="text-xs">Trabalhando</SelectItem>
                          <SelectItem value="Chuva" className="text-xs">Chuva</SelectItem>
                          <SelectItem value="Manutenção" className="text-xs">Manutenção</SelectItem>
                          <SelectItem value="Aguardando Frente" className="text-xs">Aguardando Frente</SelectItem>
                          <SelectItem value="à Disposição" className="text-xs">à Disposição</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="p-6 bg-white border-t flex flex-col gap-4 z-30 rounded-b-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Total Líquido</span>
                  <span className="text-2xl font-black text-blue-600 leading-none">
                    {tempDailyData.filter(d => d.finalReading > 0).reduce((acc, curr) => acc + (curr.discount ? 0 : (curr.finalReading - curr.initialReading)), 0).toLocaleString('pt-BR')}
                    <span className="text-[10px] ml-1 uppercase">{selectedEquipment?.measurementUnit === 'Horímetro' ? 'h' : 'km'}</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Valor Total</span>
                  <span className="text-2xl font-black text-emerald-600 leading-none">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      tempDailyData.filter(d => d.finalReading > 0).reduce((acc, curr) => acc + (curr.discount ? 0 : (curr.finalReading - curr.initialReading)), 0) * (selectedEquipment?.contractedPrice || 0)
                    )}
                  </span>
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Média Diária</span>
                  <span className="text-2xl font-black text-slate-600 leading-none">
                    {(tempDailyData.filter(d => d.finalReading > 0).reduce((acc, curr) => acc + (curr.discount ? 0 : (curr.finalReading - curr.initialReading)), 0) / (tempDailyData.filter(d => d.finalReading > 0).length || 1)).toFixed(1).toLocaleString()}
                    <span className="text-[10px] ml-1 uppercase font-bold text-slate-400">/dia</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setIsNewMeasurementModalOpen(false)} className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-12">Descartar</Button>
                <Button onClick={handleSaveMeasurement} className="rounded-2xl bg-blue-600 px-10 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 h-12 transition-all active:scale-95 group">
                  <Check className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Confirmar e Salvar Medição
                </Button>
              </div>
            </div>
          </div>
        </div>
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
            <h2 className="text-2xl font-black text-white leading-tight">{editingTankId ? 'Editar Reservatório' : 'Novo Reservatório'}</h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{editingTankId ? 'Atualize as informações do seu ativo' : 'Cadastro de armazenamento de combustível'}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome/Identificação</Label>
              <Input 
                placeholder="Ex: Reservatório Principal Obra" 
                value={newTank.name} 
                onChange={e => setNewTank({...newTank, name: e.target.value})} 
                className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Combustível</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select value={newTank.fuelType || 'Diesel S10'} onValueChange={val => setNewTank({...newTank, fuelType: val})}>
                  <SelectTrigger className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl font-bold">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DEFAULT_FUELS.map(f => (
                      <SelectItem key={f} value={f} className="font-bold">{f}</SelectItem>
                    ))}
                    <SelectItem value="Outro" className="font-bold italic">Outro (Personalizado)</SelectItem>
                  </SelectContent>
                </Select>
                {(newTank.fuelType === 'Outro' || !DEFAULT_FUELS.includes(newTank.fuelType || '')) && (
                  <Input 
                    placeholder="Digite o combustível" 
                    value={customFuel || (DEFAULT_FUELS.includes(newTank.fuelType || '') ? '' : newTank.fuelType)} 
                    onChange={e => setCustomFuel(e.target.value)} 
                    className="h-14 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold"
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacidade (L)</Label>
              <Input 
                type="number" 
                value={newTank.capacity || ''} 
                onChange={e => setNewTank({...newTank, capacity: Number(e.target.value)})} 
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Volume Inicial (L)</Label>
              <Input 
                type="number" 
                value={newTank.currentLevel || ''} 
                onChange={e => setNewTank({...newTank, currentLevel: Number(e.target.value)})} 
                className="h-12 border-gray-100 bg-gray-50/50 rounded-xl text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 space-y-3">
          <Button 
            onClick={handleCreateTank} 
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black uppercase text-xs tracking-widest transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4 mr-2" /> {editingTankId ? 'Salvar Alterações' : 'Salvar Reservatório'}
          </Button>

          {editingTankId && (
            <Button 
              variant="outline"
              onClick={() => {
                const tank = fuelTanks.find(t => t.id === editingTankId);
                if (tank) handleDeleteTankRequest(tank);
              }}
              className="w-full h-14 rounded-2xl border-red-50 text-red-500 hover:bg-red-50 hover:text-red-600 font-black uppercase text-xs tracking-widest transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Reservatório
            </Button>
          )}
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
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reservatório de Origem</Label>
              <Select value={newFuelLog.tankId || ''} onValueChange={val => setNewFuelLog({...newFuelLog, tankId: val})}>
                <SelectTrigger className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold">
                  <SelectValue placeholder="Selecione o reservatório" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {fuelTanks.map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">{t.name} ({t.currentLevel}/{t.capacity}L) - {t.fuelType}</SelectItem>
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
                          if (tk) return `Reservatório: ${tk.name}`;
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
                            <CommandGroup heading="Reservatórios">
                              {fuelTanks
                                .filter(t => t.id !== newFuelLog.tankId)
                                .filter(t => !selectedContractId || t.contractId === selectedContractId)
                                .map(t => (
                                  <CommandItem
                                    key={t.id}
                                    value={t.name + " reservatório"}
                                    onSelect={() => {
                                      setNewFuelLog({ ...newFuelLog, equipmentId: t.id });
                                      setOpenDest(false);
                                    }}
                                    className="py-3 px-4 rounded-xl cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-blue-600", newFuelLog.equipmentId === t.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-black text-gray-900 uppercase text-[10px]">Reservatório: {t.name}</span>
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
                onChange={e => {
                  const qty = Number(e.target.value);
                  setNewFuelLog({...newFuelLog, quantity: qty, cost: qty * (newFuelLog.unitPrice || 0)});
                }} 
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
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={newFuelLog.unitPrice || ''} 
                      onChange={e => {
                        const up = Number(e.target.value);
                        setNewFuelLog({...newFuelLog, unitPrice: up, cost: up * (newFuelLog.quantity || 0)});
                      }} 
                      className="h-12 border-gray-100 bg-gray-50/50 rounded-xl font-bold" 
                    />
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
