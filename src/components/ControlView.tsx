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
  Wrench,
  XCircle,
  ArrowRightLeft,
  Fuel,
  Droplet,
  ShoppingCart,
  Check,
  ChevronsUpDown
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
  EquipmentMaintenance
} from '../types';
import { useLocalStorage } from '../lib/useLocalStorage';
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
  const [newMaterialRequestItems, setNewMaterialRequestItems] = useState<Partial<MaterialRequestItem>[]>([]);
  const [newMaterialRequestEntry, setNewMaterialRequestEntry] = useState<Partial<MaterialRequestItem>>({ quantity: 1, description: '', application: '' });
  const [newRequestCategory, setNewRequestCategory] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);


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
          category: item.CATEGORIA || '',
          model: item.MODELO || '',
          plate: item.PLACA || '',
          origin: item.ORIGEM || 'Livre',
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
    let result = equipments.filter(e => currentUser?.role === 'master' || e.companyId === currentUser?.companyId);
    if (selectedContractId) {
      result = result.filter(e => e.contractId === selectedContractId);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => (e.name || '').toLowerCase().includes(term) || (e.plate || '').toLowerCase().includes(term));
    }
    if (filterOnlyActive) result = result.filter(e => !e.exitDate);

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
    name: '', model: '', plate: '', origin: 'Próprio', category: '', measurementUnit: 'Horímetro', entryDate: new Date().toISOString().split('T')[0], contractId: ''
  });

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
      contractId: finalContractId || undefined
    }]);
    setIsAddOpen(false);
    setNewEquip({ name: '', model: '', plate: '', origin: 'Próprio', category: '', measurementUnit: 'Horímetro', entryDate: new Date().toISOString().split('T')[0], contractId: selectedContractId || '' });
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

  const handleAddMaterialItem = () => {
    if (!newMaterialRequestEntry.description || !newMaterialRequestEntry.quantity || !newMaterialRequestEntry.application) return;
    setNewMaterialRequestItems([...newMaterialRequestItems, { ...newMaterialRequestEntry }]);
    setNewMaterialRequestEntry({ ...newMaterialRequestEntry, description: '', quantity: 1 });
  };

  const handleCreateMaterialRequest = () => {
    if (newMaterialRequestItems.length === 0 || !newRequestCategory) return;
    
    const newRequest: PurchaseRequest = {
      id: crypto.randomUUID(),
      companyId: currentUser?.companyId,
      contractId: selectedContractId || undefined,
      date: new Date().toISOString().split('T')[0],
      description: `Solicitação do Controlador: ${newMaterialRequestItems.map(i => i.description).join(', ')}`,
      category: newRequestCategory,
      sector: 'CONTROLADOR',
      status: 'Pendente',
      items: newMaterialRequestItems.map(item => ({
        id: crypto.randomUUID(),
        description: `${item.description} (Aplicação: ${item.application})`,
        quantity: item.quantity || 1,
        unit: 'un'
      }))
    };

    onUpdatePurchaseRequests([newRequest, ...purchaseRequests]);
    
    // Save category if it's new
    if (newRequestCategory && !savedCategories.includes(newRequestCategory)) {
      setSavedCategories([...savedCategories, newRequestCategory]);
    }

    setIsMaterialRequestModalOpen(false);
    setNewMaterialRequestItems([]);
    setNewMaterialRequestEntry({ quantity: 1, description: '', application: '' });
    setNewRequestCategory('');
  };

  const handleUpdateEquip = () => {
    if (!equipmentToEdit || !equipmentToEdit.name || !equipmentToEdit.plate) return;
    onUpdateEquipments(equipments.map(e => e.id === equipmentToEdit.id ? equipmentToEdit : e));
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

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar Equipamentos</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Obra de Destino</Label>
            <Select value={importContractId} onValueChange={setImportContractId}>
              <SelectTrigger><SelectValue placeholder="Usar obra da planilha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Usar obra da planilha</SelectItem>
                {availableContracts.map(c => <SelectItem key={c.id} value={c.id}>{c.workName || c.contractNumber || 'Sem nome'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" /> Selecionar Arquivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintenanceModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Enviar para Manutenção
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-gray-400">
              {maintenanceEquipment?.name} - {maintenanceEquipment?.plate}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance_date" className="text-[10px] uppercase font-bold text-gray-500">Data de Entrada</Label>
                <Input
                  id="maintenance_date"
                  type="date"
                  value={maintenanceEntryDate}
                  onChange={(e) => setMaintenanceEntryDate(e.target.value)}
                  className="rounded-xl border-gray-100 h-12 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-500">Tipo de Manutenção</Label>
                <Select value={maintenanceType} onValueChange={(v: any) => setMaintenanceType(v)}>
                  <SelectTrigger className="rounded-xl border-gray-100 h-12 font-medium">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventiva</SelectItem>
                    <SelectItem value="corrective">Corretiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" />
                  Solicitar Peças / Materiais
                </Label>
                <Badge variant="outline" className="bg-white text-[9px]">Opcional</Badge>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Descrição da peça/serviço..."
                  value={newMaintenanceItem.description}
                  onChange={e => setNewMaintenanceItem({...newMaintenanceItem, description: e.target.value})}
                  className="rounded-xl border-gray-100 bg-white"
                />
                <Input 
                  type="number"
                  placeholder="Qtd"
                  className="w-20 rounded-xl border-gray-100 bg-white"
                  value={newMaintenanceItem.quantity}
                  onChange={e => setNewMaintenanceItem({...newMaintenanceItem, quantity: parseInt(e.target.value) || 1})}
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  className="rounded-xl bg-white"
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
                <div className="space-y-2 mt-2">
                  {maintenanceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100">
                      <span className="text-xs font-medium text-gray-700">{item.quantity}x {item.description}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                        onClick={() => setMaintenanceItems(maintenanceItems.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {maintenanceItems.length === 0 && (
                <div className="space-y-2">
                  <Label htmlFor="maintenance_items_legacy" className="text-[10px] uppercase font-bold text-gray-400">Ou informe em texto livre</Label>
                  <Input
                    id="maintenance_items_legacy"
                    placeholder="Ex: Óleo, Filtros, Peça X..."
                    value={maintenanceRequestedItems}
                    onChange={(e) => setMaintenanceRequestedItems(e.target.value)}
                    className="rounded-xl border-gray-100 bg-white h-10 font-medium"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsMaintenanceModalOpen(false)}>Cancelar</Button>
            <Button className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmMaintenance}>Confirmar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <SelectTrigger className="w-[550px] h-10 bg-white border-blue-200 rounded-xl font-bold text-blue-900 ring-offset-blue-50">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
        <Card className="bg-blue-600 border-none shadow-lg rounded-2xl p-5">
          <Truck className="w-8 h-8 opacity-20 absolute right-4 top-4" />
          <p className="text-[10px] font-bold uppercase opacity-70">Total Equipamentos</p>
          <h3 className="text-3xl font-black mt-1">{stats.activeEquips}</h3>
        </Card>
        <Card className="bg-emerald-600 border-none shadow-lg rounded-2xl p-5">
          <Wrench className="w-8 h-8 opacity-20 absolute right-4 top-4" />
          <p className="text-[10px] font-bold uppercase opacity-70">Em Manutenção</p>
          <h3 className="text-3xl font-black mt-1">{stats.inMaintenanceCount}</h3>
        </Card>
        <Card className="bg-orange-600 border-none shadow-lg rounded-2xl p-5">
          <ArrowRightLeft className="w-8 h-8 opacity-20 absolute right-4 top-4" />
          <p className="text-[10px] font-bold uppercase opacity-70">Transferências Pendentes</p>
          <h3 className="text-3xl font-black mt-1">
            {transfers.filter(t => 
              t.status === 'pending' && (
                currentUser?.role === 'master' || 
                !selectedContractId || 
                t.targetContractId === selectedContractId || 
                t.sourceContractId === selectedContractId
              )
            ).length}
          </h3>
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
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild><Button className="rounded-xl bg-blue-600 gap-2 font-bold text-xs"><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
                  <DialogContent className="max-w-xl rounded-3xl p-8">
                    <DialogHeader><DialogTitle className="text-2xl font-black">Novo Equipamento</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-6">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Nome</Label><Input value={newEquip.name} onChange={e => setNewEquip({...newEquip, name: e.target.value})} /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Placa</Label><Input value={newEquip.plate} onChange={e => setNewEquip({...newEquip, plate: e.target.value})} /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Modelo</Label><Input value={newEquip.model} onChange={e => setNewEquip({...newEquip, model: e.target.value})} /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Origem</Label><Select value={newEquip.origin} onValueChange={val => setNewEquip({...newEquip, origin: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Próprio">Próprio</SelectItem><SelectItem value="Alugado">Alugado</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Medição por</Label><Select value={newEquip.measurementUnit || 'Horímetro'} onValueChange={val => setNewEquip({...newEquip, measurementUnit: val as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Horímetro">Horímetro</SelectItem><SelectItem value="Quilometragem">Quilometragem</SelectItem></SelectContent></Select></div>
                      {!selectedContractId ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Obra</Label>
                          <Select value={newEquip.contractId || ''} onValueChange={val => setNewEquip({...newEquip, contractId: val})}>
                            <SelectTrigger className="w-full h-10 bg-white border-blue-100 focus:ring-blue-500 rounded-xl font-medium text-blue-900 ring-offset-blue-50">
                              <SelectValue placeholder="Selecione a obra">
                                {newEquip.contractId ? (
                                  (() => {
                                    const c = availableContracts.find(x => x.id === newEquip.contractId);
                                    return c ? `${c.workName || c.client || 'Sem nome'} (${c.contractNumber || 'S/N'})` : "Selecionar Obra";
                                  })()
                                ) : "Selecionar Obra"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-80 rounded-xl border-blue-100">
                              {availableContracts.map(c => {
                                const label = `${c.workName || 'Obra sem nome'} - ${c.client || 'Cliente não definido'} (${c.contractNumber || 'S/N'})`;
                                return (
                                  <SelectItem 
                                    key={c.id} 
                                    value={c.id} 
                                    textValue={label}
                                  >
                                    <div className="flex flex-col py-1">
                                      <span className="font-bold text-blue-900 leading-tight">{c.workName || c.client || 'Sem nome'}</span>
                                      <span className="text-[10px] text-gray-500 uppercase">{c.contractNumber || 'S/N'}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Obra Ativa</Label>
                          <div className="h-10 flex items-center px-4 bg-blue-50 rounded-xl border border-blue-100 text-xs font-bold text-blue-700">
                            {getContractName(selectedContractId)}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter><Button onClick={handleCreateEquip} className="w-full h-12 rounded-2xl bg-blue-600 font-bold">Salvar Equipamento</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead 
                      className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Equipamento
                        {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-[10px] uppercase tracking-widest text-gray-400 py-5"
                    >
                      Obra / Local
                    </TableHead>
                    <TableHead 
                      className="font-bold text-[10px] uppercase tracking-widest text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Porte / Cat.
                        {sortField === 'category' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('origin')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Origem
                        {sortField === 'origin' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Custo Mensal
                        {sortField === 'cost' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipments.filter(e => !e.inMaintenance).map(e => (
                    <TableRow key={e.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={cn("font-bold", e.exitDate ? "text-gray-400 line-through" : "text-gray-900")}>{e.name}</p>
                              {e.exitDate && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-red-50 text-red-600 border-red-100 px-1.5 h-4">Inativo</Badge>
                              )}
                              {transfers.some(t => t.equipmentId === e.id && t.status === 'pending') && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-orange-50 text-orange-600 border-orange-100 px-1.5 h-4 animated-pulse">Transferência Pendente</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase">{e.model} - {e.plate}</p>
                            {e.exitDate && (
                              <p className="text-[9px] text-red-500 font-bold uppercase mt-0.5">Saída: {new Date(e.exitDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-blue-600">{getContractName(e.contractId)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-600">{e.category}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg", e.origin === 'Próprio' ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>{e.origin}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-gray-600">
                        <NumericInput 
                          className="w-28 h-8 text-right bg-transparent border-none focus-visible:ring-0" 
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleMaintenance(e)}
                            className={cn("text-gray-300 hover:text-emerald-500", e.inMaintenance && "text-emerald-500")}
                            title={e.inMaintenance ? "Retirar de Manutenção" : "Enviar para Manutenção"}
                          >
                            <Wrench className="w-4 h-4" />
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
                            className="text-gray-300 hover:text-green-500 disabled:opacity-30"
                            title="Solicitar Transferência"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setNewMaterialRequestEntry(prev => ({ ...prev, application: `${e.name} (${e.plate})` }));
                              setIsMaterialRequestModalOpen(true);
                            }} 
                            className="text-gray-300 hover:text-emerald-500"
                            title="Solicitar Peças/Material"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setNewFuelLog(prev => ({ ...prev, equipmentId: e.id, type: 'saida' }));
                              setIsFuelLogModalOpen(true);
                            }} 
                            className="text-gray-300 hover:text-purple-500"
                            title="Abastecimento de Combustível"
                          >
                            <Fuel className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEquipmentToEdit(e);
                              setIsEditOpen(true);
                            }} 
                            className="text-gray-300 hover:text-blue-500"
                          >
                            <Edit className="w-4 h-4" />
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
                    <TableRow key={e.id} className="hover:bg-gray-50 transition-colors">
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
                              setNewMaterialRequestEntry(prev => ({ ...prev, application: `${e.name} (${e.plate})` }));
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
                      <TableRow key={t.id} className="hover:bg-gray-50 transition-colors">
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
                        {request.deliveryDeadline ? new Date(request.deliveryDeadline).toLocaleDateString('pt-BR') : '-'}
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
                        <TableRow key={m.id} className="hover:bg-gray-50 transition-colors">
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-8">
          <DialogHeader><DialogTitle className="text-2xl font-black">Editar Equipamento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Nome</Label>
              <Input value={equipmentToEdit?.name || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, name: e.target.value} : null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Placa</Label>
              <Input value={equipmentToEdit?.plate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, plate: e.target.value} : null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Modelo</Label>
              <Input value={equipmentToEdit?.model || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, model: e.target.value} : null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Categoria / Porte</Label>
              <Input value={equipmentToEdit?.category || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, category: e.target.value} : null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Origem</Label>
              <Select value={equipmentToEdit?.origin || 'Próprio'} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, origin: val} : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Próprio">Próprio</SelectItem>
                  <SelectItem value="Alugado">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Medição por</Label>
              <Select value={equipmentToEdit?.measurementUnit || 'Horímetro'} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, measurementUnit: val as any} : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Horímetro">Horímetro</SelectItem>
                  <SelectItem value="Quilometragem">Quilometragem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Obra / Contrato Alocado</Label>
              <Select value={equipmentToEdit?.contractId || ''} onValueChange={val => setEquipmentToEdit(prev => prev ? {...prev, contractId: val} : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra">
                    {equipmentToEdit?.contractId ? getContractName(equipmentToEdit.contractId) : "Sem Obra (Disponível)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" textValue="Sem Obra (Disponível)">Sem Obra (Disponível)</SelectItem>
                  {availableContracts.map(c => (
                    <SelectItem key={c.id} value={c.id} textValue={c.workName || c.contractNumber}>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-tight">{c.workName || c.client || 'Sem nome'}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{c.contractNumber || 'S/N'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Data de Entrada</Label>
              <Input type="date" value={equipmentToEdit?.entryDate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, entryDate: e.target.value} : null)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Data de Saída</Label>
              <Input type="date" value={equipmentToEdit?.exitDate || ''} onChange={e => setEquipmentToEdit(prev => prev ? {...prev, exitDate: e.target.value} : null)} />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button 
              variant="ghost" 
              onClick={handlePermanentDelete} 
              className="text-red-600 hover:text-white hover:bg-red-600 font-bold border border-red-200 rounded-2xl h-12 px-6"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Permanente
            </Button>
            <div className="flex-1" />
            <Button onClick={handleUpdateEquip} className="h-12 rounded-2xl bg-blue-600 font-bold px-8">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-green-600">Transferir Equipamento</DialogTitle>
            <DialogDescription>
              Solicite a transferência deste equipamento para outra obra. A obra de destino precisará aprovar o recebimento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-sm font-bold text-green-900">{equipmentToTransfer?.name}</p>
              <p className="text-xs text-green-700">{equipmentToTransfer?.plate}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Obra de Destino</Label>
              <Select value={targetContractId} onValueChange={setTargetContractId}>
                <SelectTrigger className="h-12 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Selecione a obra de destino">
                    {targetContractId ? (
                      (() => {
                        const c = availableContracts.find(x => x.id === targetContractId);
                        return c ? (c.workName || c.contractNumber) : "Selecionar Obra";
                      })()
                    ) : "Selecionar Obra"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableContracts
                    .filter(c => c.id !== equipmentToTransfer?.contractId)
                    .map(c => (
                    <SelectItem key={c.id} value={c.id} textValue={c.workName || c.contractNumber}>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-tight">{c.workName || c.client || 'Sem nome'}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{c.contractNumber || 'S/N'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Data da Transferência</Label>
              <Input 
                type="date" 
                value={transferDateInput} 
                onChange={e => setTransferDateInput(e.target.value)}
                className="h-12 border-gray-200 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsTransferOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button 
                onClick={handleTransferRequest} 
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-8 font-bold"
                disabled={!targetContractId}
            >
                Solicitar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-600">Dispensar Equipamento</DialogTitle>
            <DialogDescription>
              O equipamento será marcado como inativo. Seus dados históricos serão preservados no sistema para consultas futuras.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm font-bold text-orange-900">{equipmentToDelete?.name}</p>
              <p className="text-xs text-orange-700">{equipmentToDelete?.plate}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">Data de Saída</Label>
              <Input 
                type="date" 
                value={exitDateInput} 
                onChange={e => setExitDateInput(e.target.value)} 
                className="h-12 border-gray-200 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleSoftDelete} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-8 font-bold">Confirmar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTankModalOpen} onOpenChange={setIsTankModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader><DialogTitle className="text-2xl font-black">Novo Tanque de Combustível</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Nome/Identificação</Label><Input value={newTank.name} onChange={e => setNewTank({...newTank, name: e.target.value})} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Capacidade Total (Litros)</Label><Input type="number" value={newTank.capacity || ''} onChange={e => setNewTank({...newTank, capacity: Number(e.target.value)})} /></div>
            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Volume Inicial (Litros)</Label><Input type="number" value={newTank.currentLevel || ''} onChange={e => setNewTank({...newTank, currentLevel: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateTank} className="w-full h-12 rounded-2xl bg-blue-600 font-bold">Salvar Tanque</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFuelLogModalOpen} onOpenChange={setIsFuelLogModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className={cn("text-2xl font-black", newFuelLog.type === 'entrada' ? 'text-emerald-600' : 'text-orange-600')}>
              {newFuelLog.type === 'entrada' ? 'Entrada de Combustível' : 'Abastecimento de Equipamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Data</Label><Input type="date" value={newFuelLog.date} onChange={e => setNewFuelLog({...newFuelLog, date: e.target.value})} /></div>
            
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Tanque</Label>
              <Select value={newFuelLog.tankId || ''} onValueChange={val => setNewFuelLog({...newFuelLog, tankId: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tanque" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTanks.filter(t => !selectedContractId || t.contractId === selectedContractId).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.currentLevel}/{t.capacity}L)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newFuelLog.type === 'saida' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-gray-400">Equipamento ou Tanque Destino</Label>
                  <Popover open={openDest} onOpenChange={setOpenDest}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDest}
                        className="w-full justify-between h-10 px-3 font-normal"
                      >
                        {(() => {
                          if (!newFuelLog.equipmentId) return "Buscar e selecionar destino...";
                          const eq = equipments.find(e => e.id === newFuelLog.equipmentId);
                          if (eq) return `${eq.name} (${eq.plate})`;
                          const tk = fuelTanks.find(t => t.id === newFuelLog.equipmentId);
                          if (tk) return `Tanque: ${tk.name}`;
                          return "Destino selecionado";
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-w-[calc(100vw-2rem)] sm:max-w-md" align="start">
                      <Command>
                        <CommandInput placeholder="Digite para buscar..." />
                        <CommandList>
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
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", newFuelLog.equipmentId === t.id ? "opacity-100" : "opacity-0")} />
                                    Tanque: {t.name} ({t.currentLevel}/{t.capacity}L)
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
                                  value={`${e.name} ${e.plate}`}
                                  onSelect={() => {
                                    setNewFuelLog({ ...newFuelLog, equipmentId: e.id });
                                    setOpenDest(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", newFuelLog.equipmentId === e.id ? "opacity-100" : "opacity-0")} />
                                  {e.name} ({e.plate})
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

            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Quantidade (Litros)</Label><Input type="number" value={newFuelLog.quantity || ''} onChange={e => setNewFuelLog({...newFuelLog, quantity: Number(e.target.value)})} /></div>
            
            {newFuelLog.type === 'entrada' && (
              <>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Fornecedor</Label><Input value={newFuelLog.supplier || ''} onChange={e => setNewFuelLog({...newFuelLog, supplier: e.target.value})} /></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Nº da Nota Fiscal</Label><Input value={newFuelLog.invoiceNumber || ''} onChange={e => setNewFuelLog({...newFuelLog, invoiceNumber: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Preço Unitário (R$)</Label><Input type="number" step="0.01" value={newFuelLog.unitPrice || ''} onChange={e => setNewFuelLog({...newFuelLog, unitPrice: Number(e.target.value)})} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Custo Total (R$)</Label><Input type="number" step="0.01" value={newFuelLog.cost || ''} onChange={e => setNewFuelLog({...newFuelLog, cost: Number(e.target.value)})} /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCreateFuelLog} className={cn("w-full h-12 rounded-2xl font-bold", newFuelLog.type === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700')}>
              {newFuelLog.type === 'entrada' ? 'Registrar Nova Entrada' : 'Registrar Saída (Abastecimento)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaterialRequestModalOpen} onOpenChange={setIsMaterialRequestModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader><DialogTitle className="text-2xl font-black text-emerald-600">Solicitar Peças/Material</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-1 relative">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Categoria</Label>
              <Input 
                value={newRequestCategory} 
                onChange={e => {
                  setNewRequestCategory(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                placeholder="Ex. Mecânica, Elétrica, Consumo..." 
                className="h-12 border-gray-200 rounded-xl"
              />
              {showCategorySuggestions && savedCategories.filter(c => c.toLowerCase().includes(newRequestCategory.toLowerCase())).length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden py-1">
                  {savedCategories
                    .filter(c => c.toLowerCase().includes(newRequestCategory.toLowerCase()))
                    .map(cat => (
                      <div 
                        key={cat} 
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700"
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

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-400">Aplicação (Equipamento)</Label>
              <Input 
                value={newMaterialRequestEntry.application || ''} 
                onChange={e => setNewMaterialRequestEntry({...newMaterialRequestEntry, application: e.target.value})} 
                disabled
                className="bg-gray-50 max-h-12"
              />
            </div>
            
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Descrição do Produto</Label>
                <Input 
                  value={newMaterialRequestEntry.description || ''} 
                  onChange={e => setNewMaterialRequestEntry({...newMaterialRequestEntry, description: e.target.value})} 
                  placeholder="Ex. Filtro de óleo, pneu..." 
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Qtd</Label>
                <Input 
                  type="number" 
                  min={1}
                  value={newMaterialRequestEntry.quantity || ''} 
                  onChange={e => setNewMaterialRequestEntry({...newMaterialRequestEntry, quantity: Number(e.target.value)})} 
                />
              </div>
              <Button onClick={handleAddMaterialItem} variant="outline" className="h-10 w-10 p-0 shrink-0 rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {newMaterialRequestItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2 max-h-48 overflow-y-auto">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Itens Adicionados ({newMaterialRequestItems.length})</Label>
                {newMaterialRequestItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium text-gray-900 truncate pr-2">{item.description}</div>
                    <div className="font-mono font-bold text-gray-500 bg-gray-200 px-2 rounded-md">{item.quantity} un</div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
          <DialogFooter>
            <Button onClick={handleCreateMaterialRequest} disabled={newMaterialRequestItems.length === 0} className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold">
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
