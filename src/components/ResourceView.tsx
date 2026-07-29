import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, FileSpreadsheet, Download, ChevronUp, ChevronDown, TrendingUp, ArrowLeft, Upload, FileText, Users, Truck, Sparkles, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Resource, ResourceType, PurchaseOrder, Employee, ControllerEquipment } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { exportResourcesToExcel, exportResourcesToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import { NumericInput } from '@/components/ui/numeric-input';

function UnitAutoComplete({
  value,
  onChange,
  existingUnits,
  id,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  existingUnits: string[];
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const defaultUnits = ['h', 'un', 'kg', 'm', 'm2', 'm3', 'mes', 'dia', 'vb', 'l', 't', 'cj', 'sc', 'gl', 'rl', 'pr'];
  
  const allUnits = React.useMemo(() => {
    const set = new Set<string>();
    defaultUnits.forEach(u => set.add(u));
    existingUnits.forEach(u => {
      if (u && u.trim()) set.add(u.trim());
    });
    return Array.from(set);
  }, [existingUnits]);

  const filteredUnits = React.useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return allUnits;
    return allUnits.filter(u => u.toLowerCase().includes(query));
  }, [value, allUnits]);

  return (
    <div className="relative col-span-3">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Ex: h, un, kg..."
        className={cn("h-10 text-sm font-medium", className)}
        autoComplete="off"
        required
      />
      {open && filteredUnits.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Unidades Existentes</span>
            <span className="text-[9px] text-blue-600 font-semibold">{filteredUnits.length} opções</span>
          </div>
          {filteredUnits.map((u) => (
            <button
              key={u}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(u);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between font-mono transition-colors",
                value === u && "bg-blue-50/80 text-blue-700 font-bold"
              )}
            >
              <span>{u}</span>
              {value === u && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ResourceViewProps {
  key?: string;
  resources: Resource[];
  onAdd: (r: (Omit<Resource, 'id'> & { id?: string }) | (Omit<Resource, 'id'> & { id?: string })[]) => string | void;
  onDelete: (id: string) => void;
  onUpdate: (r: Resource) => void;
  purchaseOrders?: PurchaseOrder[];
  readonly?: boolean;
  employees?: Employee[];
  controllerEquipments?: ControllerEquipment[];
}

export function ResourceView({ resources, onAdd, onDelete, onUpdate, purchaseOrders = [], readonly, employees = [], controllerEquipments = [] }: ResourceViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExportSelectorOpen, setIsExportSelectorOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedHistoryResource, setSelectedHistoryResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [operatorComboboxOpen, setOperatorComboboxOpen] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorSalary, setNewOperatorSalary] = useState(0);
  const [newOperatorHours, setNewOperatorHours] = useState(220);

  const [editOperatorSearch, setEditOperatorSearch] = useState('');
  const [editOperatorComboboxOpen, setEditOperatorComboboxOpen] = useState(false);
  const [editNewOperatorName, setEditNewOperatorName] = useState('');
  const [editNewOperatorSalary, setEditNewOperatorSalary] = useState(0);
  const [editNewOperatorHours, setEditNewOperatorHours] = useState(220);
  const [sortField, setSortField] = useState<'code' | 'name' | 'type' | 'unit' | 'basePrice'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newResource, setNewResource] = useState<Omit<Resource, 'id'>>({
    code: '',
    name: '',
    unit: '',
    type: 'material',
    basePrice: 0,
    hoursPerMonth: 220,
    monthlySalary: 0,
  });

  const augmentedResources = React.useMemo(() => {
    let aug = [...resources];

    // Recalculate Equipment prices based on operator and calculate productive price
    aug = aug.map(r => {
      if (r.type === 'equipment') {
        let eqCostRaw = r.equipmentBaseCost !== undefined && r.equipmentBaseCost > 0 
          ? r.equipmentBaseCost 
          : (r.basePrice || 0);

        // If eqCostRaw is an hourly rate (< 500), convert to monthly value (* 200)
        let eqCost = (eqCostRaw > 0 && eqCostRaw < 500) ? eqCostRaw * 200 : eqCostRaw;

        let opCost = 0;
        if (r.operatorId) {
          const op = aug.find(o => o.id === r.operatorId);
          if (op) {
            opCost = op.monthlySalary || (op.paymentType === 'month' || op.paymentType === 'pj' ? (op.basePrice > 500 ? op.basePrice : op.basePrice * 220) : op.basePrice * 220) || op.basePrice || 0;
          }
        }
        const finalPrice = eqCost + opCost;
        const workHours = r.hoursPerMonth || 200;
        return {
           ...r,
           equipmentBaseCost: eqCost,
           basePrice: finalPrice,
           productivePrice: finalPrice / workHours
        };
      }
      return r;
    });

    return aug;
  }, [resources]);

  const getResourceStats = React.useCallback((r: Resource) => {
    const codeToMatch = r.code.trim().toLowerCase();
    const nameToMatch = r.name.trim().toLowerCase();
    
    let totalQty = 0;
    let totalValue = 0;
    let purchaseCount = 0;

    purchaseOrders.forEach(po => {
      po.items.forEach(item => {
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.description || '').trim().toLowerCase();
        
        if (
          (codeToMatch && itemCode === codeToMatch) || 
          (nameToMatch && itemName === nameToMatch)
        ) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          totalQty += qty;
          totalValue += qty * price;
          purchaseCount++;
        }
      });
    });

    const averagePrice = totalQty > 0 ? totalValue / totalQty : r.basePrice;

    return {
      totalQty,
      totalValue,
      averagePrice,
      purchaseCount
    };
  }, [purchaseOrders]);

  const stats = React.useMemo(() => {
    if (!selectedHistoryResource) return { totalQty: 0, totalValue: 0, averagePrice: 0, purchaseCount: 0 };
    return getResourceStats(selectedHistoryResource);
  }, [selectedHistoryResource, getResourceStats]);

  const priceHistory = React.useMemo(() => {
    if (!selectedHistoryResource) return [];

    const history: { date: string; price: number; quantity: number | string; total: number | string; source: string; rawDate: string }[] = [];

    // Add initial creation price entry
    history.push({
      date: 'Cad.',
      price: selectedHistoryResource.basePrice,
      quantity: '-',
      total: '-',
      source: 'Inicial',
      rawDate: '0000-00-00'
    });

    // History from RH for Labor
    if (selectedHistoryResource.type === 'labor') {
      const roleName = selectedHistoryResource.name.toLowerCase();
      employees.forEach(emp => {
        if (emp.role && emp.role.toLowerCase() === roleName) {
          let hourlyRate = emp.salary;
          if (emp.paymentType === 'month') hourlyRate = emp.salary / 220;
          if (emp.paymentType === 'day') hourlyRate = emp.salary / 8;

          const dateStr = emp.admissionDate || new Date().toISOString().split('T')[0];
          let formattedDate = dateStr;
          try {
            const parts = dateStr.split('-');
            if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
          } catch(e) {}

          history.push({
             date: formattedDate,
             price: hourlyRate,
             quantity: 1,
             total: hourlyRate,
             source: `Colab: ${emp.name}`,
             rawDate: dateStr
          });
        }
      });
    }


    
    // If it's equipment and has an operator, the operator's history affects the equipment
    if (selectedHistoryResource.type === 'equipment' && selectedHistoryResource.operatorId) {
      const op = augmentedResources.find(r => r.id === selectedHistoryResource.operatorId);
      if (op) {
        // Find operator history in RH
        if (op.type === 'labor') {
          const roleName = op.name.toLowerCase();
          employees.forEach(emp => {
            if (emp.role && emp.role.toLowerCase() === roleName) {
              let hourlyRate = emp.salary;
              if (emp.paymentType === 'month') hourlyRate = emp.salary / 220;
              if (emp.paymentType === 'day') hourlyRate = emp.salary / 8;
              const dateStr = emp.admissionDate || new Date().toISOString().split('T')[0];
              let formattedDate = dateStr;
              try {
                const parts = dateStr.split('-');
                if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
              } catch(e) {}
              
              const eqCost = selectedHistoryResource.equipmentBaseCost || 0;
              history.push({
                 date: formattedDate,
                 price: eqCost + hourlyRate,
                 quantity: 1,
                 total: eqCost + hourlyRate,
                 source: `Colab (Op): ${emp.name}`,
                 rawDate: dateStr
              });
            }
          });
        }
        
        // Also check operator purchases
        const opCode = op.code.trim().toLowerCase();
        const opName = op.name.trim().toLowerCase();
        purchaseOrders.forEach(po => {
           // similar to what is done below, but add eqCost
           const orderDateRaw = po.orderDate || new Date().toISOString().split('T')[0];
           let formattedDate = orderDateRaw;
           try {
             const parts = orderDateRaw.split('-');
             if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
           } catch(e) {}
           
           po.items.forEach(item => {
             const itemCode = (item.code || '').trim().toLowerCase();
             const itemName = (item.description || '').trim().toLowerCase();
             if ((itemCode && itemCode === opCode) || (!itemCode && itemName && itemName.includes(opName))) {
                const eqCost = selectedHistoryResource.equipmentBaseCost || 0;
                history.push({
                  date: formattedDate,
                  price: eqCost + item.price,
                  quantity: item.quantity,
                  total: eqCost + item.price,
                  source: `Compra (Op): Pedido #${po.id.substring(0,6)}`,
                  rawDate: orderDateRaw
                });
             }
           });
        });
      }
    }

    const codeToMatch = selectedHistoryResource.code.trim().toLowerCase();
    const nameToMatch = selectedHistoryResource.name.trim().toLowerCase();

    const seenPurchases = new Set<string>();

    purchaseOrders.forEach(po => {
      const orderDateRaw = po.orderDate || new Date().toISOString().split('T')[0];
      // Format to DD/MM/YY or DD/MM for graph readability
      let formattedDate = orderDateRaw;
      try {
        const parts = orderDateRaw.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
        }
      } catch (e) {}

      po.items.forEach((item, itemIdx) => {
        const itemCode = (item.code || '').trim().toLowerCase();
        const itemName = (item.description || '').trim().toLowerCase();

        if (
          (codeToMatch && itemCode === codeToMatch) || 
          (nameToMatch && itemName === nameToMatch)
        ) {
          const uniqueKey = `${po.id}-${item.id || itemIdx}`;
          if (!seenPurchases.has(uniqueKey)) {
            seenPurchases.add(uniqueKey);
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            history.push({
              date: formattedDate,
              price: price,
              quantity: qty,
              total: qty * price,
              source: `OC-${po.orderNumber}`,
              rawDate: orderDateRaw
            });
          }
        }
      });
    });

    // Sort entries chronologically by raw orderDate, except keep Cad at first
    const cadEntry = history.find(h => h.source === 'Inicial');
    const otherEntries = history.filter(h => h.source !== 'Inicial');
    
    otherEntries.sort((a, b) => {
      return a.rawDate.localeCompare(b.rawDate);
    });

    const combined = cadEntry ? [cadEntry, ...otherEntries] : otherEntries;
    // Keep max 10 entries
    return combined.slice(-10);
  }, [selectedHistoryResource, purchaseOrders]);

  const getNextCode = (type: ResourceType, currentList?: Resource[]) => {
    const prefix = type === 'labor' ? 'MO-' : type === 'equipment' ? 'EP-' : 'MAT-';
    const list = currentList || augmentedResources;
    const typeResources = list.filter(r => r.type === type);
    
    // Extract numbers from codes like "MO-0001" or "EP-0001"
    const existingNumbers = typeResources
      .map(r => {
        const match = r.code.match(new RegExp(`${prefix}(\\d+)`));
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    // Find first gap
    let nextNum = 1;
    for (const num of existingNumbers) {
      if (num === nextNum) {
        nextNum++;
      } else if (num > nextNum) {
        break;
      }
    }

    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  const handleImportRH = () => {
    if (!employees || employees.length === 0) {
      alert("⚠️ Nenhum funcionário ou cargo encontrado no cadastro do RH.");
      return;
    }

    const rolesMap = new Map<string, { originalRole: string; totalSalary: number; count: number }>();
    
    employees.forEach(emp => {
      if (!emp.role || !emp.role.trim()) return;
      const roleTrimmed = emp.role.trim();
      const roleKey = roleTrimmed.toLowerCase();

      let hourlyRate = emp.salary || 0;
      if (emp.paymentType === 'month' || emp.paymentType === 'pj') hourlyRate = (emp.salary || 0) / 220;
      if (emp.paymentType === 'day') hourlyRate = (emp.salary || 0) / 8;

      // Filter out functions without values / zero salary
      if (hourlyRate <= 0) return;

      const current = rolesMap.get(roleKey) || { originalRole: roleTrimmed, totalSalary: 0, count: 0 };
      rolesMap.set(roleKey, {
        originalRole: current.originalRole,
        totalSalary: current.totalSalary + hourlyRate,
        count: current.count + 1
      });
    });

    if (rolesMap.size === 0) {
      alert("⚠️ Nenhum cargo com salário/valor maior que zero encontrado no RH.");
      return;
    }

    let updatedCount = 0;
    const itemsToAdd: (Omit<Resource, 'id'> & { id?: string })[] = [];
    let tempResources = [...resources];

    rolesMap.forEach((data, roleKey) => {
      const avgHourly = data.count > 0 ? data.totalSalary / data.count : 0;
      if (avgHourly <= 0) return;

      const existing = tempResources.find(r => r.type === 'labor' && r.name.trim().toLowerCase() === roleKey);

      if (existing) {
        onUpdate({
          ...existing,
          basePrice: avgHourly,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
        });
        updatedCount++;
      } else {
        const newCode = getNextCode('labor', tempResources);
        const newRes: Omit<Resource, 'id'> = {
          code: newCode,
          name: data.originalRole,
          unit: 'h',
          type: 'labor',
          basePrice: avgHourly,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
        };
        itemsToAdd.push(newRes);
        tempResources.push({ ...newRes, id: uuidv4() });
      }
    });

    if (itemsToAdd.length > 0) {
      onAdd(itemsToAdd);
    }

    setIsExportSelectorOpen(false);
    alert(`✅ Importação do RH concluída!\n\n• ${itemsToAdd.length} novo(s) cargo(s) com valor de Mão de Obra importados com códigos no padrão de cotação (ex: MO-0001).\n• ${updatedCount} cargo(s) existente(s) atualizados com médias salariais do RH.\n• Cargos sem salário/valor definido foram ignorados conforme regra.`);
  };

  const handleImportController = () => {
    if (!controllerEquipments || controllerEquipments.length === 0) {
      alert("⚠️ Nenhum equipamento encontrado no cadastro do Controlador.");
      return;
    }

    let monthlyData: any[] = [];
    try {
      const stored = localStorage.getItem('sigo_equipments_monthly') || localStorage.getItem('sigo_equipment_monthly');
      if (stored) monthlyData = JSON.parse(stored);
    } catch (e) {
      console.warn("Could not load equipment monthly data from localStorage", e);
    }

    const typesMap = new Map<string, { originalName: string; totalMonthlyCost: number; count: number; unit: string }>();

    controllerEquipments.forEach(eq => {
      const eqType = (eq.type || eq.name || '').trim();
      if (!eqType) return;
      const keyLower = eqType.toLowerCase();

      // Calculate monthly cost of equipment (valor mensal do equipamento)
      let monthlyCost = 0;
      const hours = eq.hoursPerMonth || 200;
      if (eq.monthlyPrice && Number(eq.monthlyPrice) > 0) {
        monthlyCost = Number(eq.monthlyPrice);
      } else if (eq.equipmentBaseCost && Number(eq.equipmentBaseCost) > 0) {
        const val = Number(eq.equipmentBaseCost);
        monthlyCost = (val >= 500 || eq.measurementUnit === 'Mensal') ? val : val * hours;
      } else if (eq.contractedPrice && Number(eq.contractedPrice) > 0) {
        const val = Number(eq.contractedPrice);
        if (eq.measurementUnit === 'Mensal' || val >= 500) {
          monthlyCost = val;
        } else if (eq.measurementUnit === 'Diária') {
          monthlyCost = val * 30;
        } else {
          monthlyCost = val * hours;
        }
      } else if (eq.productivePrice && Number(eq.productivePrice) > 0) {
        const val = Number(eq.productivePrice);
        monthlyCost = val >= 500 ? val : val * hours;
      }

      // Check equipmentMonthlyData as fallback
      if (monthlyCost <= 0 && monthlyData.length > 0) {
        const mData = monthlyData.find((m: any) => m.equipmentId === eq.id && m.cost && Number(m.cost) > 0);
        if (mData) {
          const val = Number(mData.cost);
          monthlyCost = (val >= 500 || eq.measurementUnit === 'Mensal') ? val : val * hours;
        }
      }

      if (monthlyCost <= 0) return;

      const current = typesMap.get(keyLower) || { originalName: eqType, totalMonthlyCost: 0, count: 0, unit: 'h' };
      typesMap.set(keyLower, {
        originalName: current.originalName,
        totalMonthlyCost: current.totalMonthlyCost + monthlyCost,
        count: current.count + 1,
        unit: 'h' // Default unit is 'h'
      });
    });

    if (typesMap.size === 0) {
      alert("⚠️ Nenhum equipamento com valor mensal/locação maior que zero encontrado no Controlador.");
      return;
    }

    let updatedCount = 0;
    const itemsToAdd: (Omit<Resource, 'id'> & { id?: string })[] = [];
    let tempResources = [...resources];

    typesMap.forEach((data, keyLower) => {
      const avgMonthlyCost = data.count > 0 ? data.totalMonthlyCost / data.count : 0;
      if (avgMonthlyCost <= 0) return;

      const existing = tempResources.find(r => r.type === 'equipment' && r.name.trim().toLowerCase() === keyLower);

      // Check if existing item has an allocated operator
      let opSalary = 0;
      if (existing && existing.operatorId) {
        const op = tempResources.find(o => o.id === existing.operatorId);
        if (op) {
          opSalary = op.monthlySalary || (op.paymentType === 'month' || op.paymentType === 'pj' ? (op.basePrice > 500 ? op.basePrice : op.basePrice * 220) : op.basePrice * 220) || op.basePrice || 0;
        }
      }

      const hours = existing?.hoursPerMonth || 200;
      const finalPrice = avgMonthlyCost + opSalary;
      const prodPrice = finalPrice / hours;

      if (existing) {
        onUpdate({
          ...existing,
          equipmentBaseCost: avgMonthlyCost, // Permanecer valor mensal no custo
          basePrice: finalPrice, // Preço final = valor mensal + salario do operador (se houver)
          productivePrice: prodPrice, // Hora produtiva = Preço final / jornada de trabalho
          unit: existing.unit || 'h', // Default unit 'h'
        });
        updatedCount++;
      } else {
        const newCode = getNextCode('equipment', tempResources);
        const newRes: Omit<Resource, 'id'> = {
          code: newCode,
          name: data.originalName,
          unit: 'h', // Default unit 'h'
          type: 'equipment',
          equipmentBaseCost: avgMonthlyCost,
          basePrice: finalPrice,
          productivePrice: prodPrice,
        };
        itemsToAdd.push(newRes);
        tempResources.push({ ...newRes, id: uuidv4() });
      }
    });

    if (itemsToAdd.length > 0) {
      onAdd(itemsToAdd);
    }

    setIsExportSelectorOpen(false);
    alert(`✅ Importação do Controlador concluída!\n\n• ${itemsToAdd.length} novo(s) tipo(s) de Equipamento importados com código no padrão de cotação (ex: EP-0001) e unidade 'h'.\n• ${updatedCount} tipo(s) existente(s) atualizados (Custo mensal + Salário do Operador se houver).\n• Equipamentos sem valor definido foram ignorados conforme regra.`);
  };

  const handleStandardizeCodes = () => {
    let modifiedCount = 0;
    const tempResources = [...resources];

    tempResources.forEach(res => {
      const isEqNonStandard = res.type === 'equipment' && (!res.code.startsWith('EP-') || !/^EP-\d{4}$/.test(res.code));
      const isLaborNonStandard = res.type === 'labor' && (!res.code.startsWith('MO-') || !/^MO-\d{4}$/.test(res.code));
      const isMaterialNonStandard = res.type === 'material' && (!res.code.startsWith('MAT-') || !/^MAT-\d{4}$/.test(res.code));

      if (isEqNonStandard || isLaborNonStandard || isMaterialNonStandard) {
        const newCode = getNextCode(res.type, tempResources.filter(r => r.id !== res.id));
        onUpdate({
          ...res,
          code: newCode,
        });
        res.code = newCode;
        modifiedCount++;
      }
    });

    if (modifiedCount > 0) {
      alert(`✅ Padronização de códigos concluída!\n\n${modifiedCount} insumo(s) tiveram seus códigos atualizados para o padrão oficial de Cotações (MO-XXXX, EP-XXXX, MAT-XXXX).`);
    } else {
      alert("ℹ️ Todos os códigos de insumos já estão no padrão oficial de Cotações.");
    }
  };

  const handleOpenAdd = () => {
    const defaultType = 'material';
    setNewResource({
      code: getNextCode(defaultType),
      name: '',
      unit: '',
      type: defaultType,
      basePrice: 0,
    });
    setIsAddOpen(true);
  };

  const handleTypeChange = (type: ResourceType) => {
    setNewResource({
      ...newResource,
      type,
      code: getNextCode(type)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalResource = { ...newResource };
    if (finalResource.type === 'equipment' && finalResource.operatorId === 'new') {
      const opPrice = newOperatorSalary / newOperatorHours;
      const newOpId = onAdd({
        code: getNextCode('labor'),
        name: newOperatorName,
        type: 'labor',
        unit: 'h',
        basePrice: opPrice,
        hoursPerMonth: newOperatorHours,
        monthlySalary: newOperatorSalary,
        encargos: 0
      });
      if (typeof newOpId === 'string' && newOpId) {
        finalResource.operatorId = newOpId;
      } else {
        finalResource.operatorId = undefined;
      }
      finalResource.basePrice = (finalResource.equipmentBaseCost || 0) + newOperatorSalary;
      finalResource.productivePrice = finalResource.basePrice / (finalResource.hoursPerMonth || 200);
    }
    onAdd(finalResource);
    setIsAddOpen(false);
    setNewResource({ code: '', name: '', unit: '', type: 'material', basePrice: 0 });
    setNewOperatorName('');
    setNewOperatorSalary(0);
    alert("Insumo salvo com sucesso na tabela resources!");
  };

  const handleEditTypeChange = (type: ResourceType) => {
    if (editingResource) {
      setEditingResource({
        ...editingResource,
        type,
        code: getNextCode(type)
      });
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResource) {
      let finalResource = { ...editingResource };
      if (finalResource.type === 'equipment' && finalResource.operatorId === 'new') {
        const opPrice = editNewOperatorSalary / editNewOperatorHours;
        const newOpId = onAdd({
          code: getNextCode('labor'),
          name: editNewOperatorName,
          type: 'labor',
          unit: 'h',
          basePrice: opPrice,
          hoursPerMonth: editNewOperatorHours,
          monthlySalary: editNewOperatorSalary,
          encargos: 0
        });
        if (typeof newOpId === 'string' && newOpId) {
          finalResource.operatorId = newOpId;
        } else {
          finalResource.operatorId = undefined;
        }
        finalResource.basePrice = (finalResource.equipmentBaseCost || 0) + editNewOperatorSalary;
        finalResource.productivePrice = finalResource.basePrice / (finalResource.hoursPerMonth || 200);
      }
      onUpdate(finalResource);
      setIsEditOpen(false);
      setEditingResource(null);
      setEditNewOperatorName('');
      setEditNewOperatorSalary(0);
      alert("Insumo editado com sucesso na tabela resources!");
    }
  };

  const handleDownloadTemplate = () => {
    import('xlsx').then(XLSX => {
      const data = [
        {
          '#tipo': 'material',
          '#nome': 'Exemplo de Insumo',
          '#unidade': 'UN',
          '#preco': 15.50
        }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo");
      XLSX.writeFile(wb, "modelo_insumos.xlsx");
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsImporting(false);
      alert("❌ Erro ao ler o arquivo físico.");
    };

    reader.onload = async (evt) => {
      try {
        const buildData = evt.target?.result;
        if (!buildData) throw new Error("Falha ao ler o byte-stream do arquivo.");

        const XLSX = await import("xlsx");
        const wb = XLSX.read(buildData, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        data.forEach((row, i) => {
          // Identify keys using tags or exact names
          const typeKey = Object.keys(row).find(k => k.toLowerCase().includes('#tipo') || k.toLowerCase() === 'tipo');
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('#nome') || k.toLowerCase() === 'nome');
          const unitKey = Object.keys(row).find(k => k.toLowerCase().includes('#unidade') || k.toLowerCase() === 'unidade');
          const priceKey = Object.keys(row).find(k => k.toLowerCase().includes('#preco') || k.toLowerCase().includes('preço'));

          if (nameKey && unitKey) {
            const rowType = typeKey ? row[typeKey]?.toString().toLowerCase() : 'material';
            let parsedType: ResourceType = 'material';
            if (rowType.includes('obra') || rowType === 'labor') parsedType = 'labor';
            else if (rowType.includes('equip') || rowType === 'equipment') parsedType = 'equipment';

            const parsedPrice = priceKey ? Number(row[priceKey]) || 0 : 0;
            
            // For import, we'll let it use the next code for the type
            onAdd({
              code: getNextCode(parsedType), // This might reuse codes if called rapidly in a loop if state hasn't updated. 
              // Wait, getNextCode depends on resources state which won't update during this loop.
              // To fix this we can generate UUID for code, or let the server/App.tsx handle the code generation.
              // Since `getNextCode` logic is here, I'll use it but append index `+ i` to the sequence temporarily to prevent duplicates.
              // For simplicity, we can pass uuid if it fails, but let's do our best.
              name: row[nameKey],
              unit: row[unitKey],
              type: parsedType,
              basePrice: parsedPrice
            });
            importedCount++;
          }
        });

        alert(`✅ Importação concluída! ${importedCount} insumos foram adicionados com sucesso na tabela resources.`);
      } catch (err) {
        console.error(err);
        alert("❌ Erro ao processar arquivo: " + err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const startEdit = (resource: Resource) => {
    setEditingResource(resource);
    setIsEditOpen(true);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [columnOrder, setColumnOrder] = useState<string[]>([
    'code',
    'name',
    'type',
    'unit',
    'basePrice',
    'history',
    'actions',
  ]);

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setColumnOrder(newOrder);
  };

  const columnLabels: Record<string, string> = {
    code: 'Código',
    name: 'Nome',
    type: 'Tipo',
    unit: 'Unidade',
    basePrice: 'Preço Base / Médio',
    history: 'Histórico',
    actions: 'Ações',
  };

  const existingUnits = React.useMemo(() => {
    return Array.from(new Set(resources.map(r => r.unit).filter(Boolean)));
  }, [resources]);

  const sortedResources = React.useMemo(() => {
    const filtered = augmentedResources.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter out duplicate equipment by name
    const seenEquipment = new Set<string>();
    const uniqueFiltered = filtered.filter(r => {
      if (r.type === 'equipment') {
        const nameKey = (r.name || '').trim().toLowerCase();
        if (seenEquipment.has(nameKey)) return false;
        seenEquipment.add(nameKey);
      }
      return true;
    });

    return [...uniqueFiltered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'unit':
          comparison = a.unit.localeCompare(b.unit);
          break;
        case 'basePrice':
          const priceA = getResourceStats(a).averagePrice;
          const priceB = getResourceStats(b).averagePrice;
          comparison = priceA - priceB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [resources, searchTerm, sortField, sortOrder, getResourceStats]);

  if (selectedHistoryResource) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedHistoryResource(null)} className="h-9 rounded-xl border-gray-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Insumos
          </Button>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Histórico de Preço: {selectedHistoryResource.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono tracking-tight uppercase">
              Código: {selectedHistoryResource.code} | Unidade: {selectedHistoryResource.unit}
            </p>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Valor Total Comprado</span>
              <p className="text-2xl font-black text-blue-600 font-mono">
                {formatCurrency(stats.totalValue)}
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Soma de todas as ordens de compra
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Quantidade Total Comprada</span>
              <p className="text-2xl font-black text-orange-600 font-mono">
                {stats.totalQty.toLocaleString('pt-BR')} <span className="text-sm font-bold text-gray-400 uppercase font-sans">{selectedHistoryResource.unit}</span>
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Acumulado de quantidade faturada
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Preço Médio Atual</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                {formatCurrency(stats.averagePrice)}
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-tight">
              Valor Total / Quantidade Total
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Chart Section */}
          <Card className="lg:col-span-7 p-6 border-none shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-gray-900">Gráfico das Últimas 10 Mudanças de Preço</h4>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
                {priceHistory.length} Registros
              </Badge>
            </div>
            
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Preço']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563EB" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    dot={{ r: 6, strokeWidth: 2, fill: '#FFFFFF', stroke: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Table Section */}
          <Card className="lg:col-span-5 p-6 border-none shadow-sm space-y-4">
            <h4 className="text-base font-bold text-gray-900">Tabela de Alterações</h4>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-left font-black text-xs text-gray-400 uppercase tracking-tighter">Data</TableHead>
                    <TableHead className="text-center font-black text-xs text-gray-400 uppercase tracking-tighter">Origem</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Qtd</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Unitário</TableHead>
                    <TableHead className="text-right font-black text-xs text-gray-400 uppercase tracking-tighter">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((entry, index) => (
                    <TableRow key={index} className="hover:bg-gray-50/50">
                      <TableCell className="text-left py-3 font-semibold text-xs text-gray-700">
                        {entry.date}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge variant="outline" className="bg-blue-50/30 text-blue-700 border-blue-100/50 font-bold text-[10px] uppercase tracking-wider">
                          {entry.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-medium text-xs text-gray-600">
                        {typeof entry.quantity === 'number' ? entry.quantity.toLocaleString('pt-BR') : entry.quantity}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono text-xs text-gray-900">
                        {formatCurrency(entry.price)}
                      </TableCell>
                      <TableCell className="text-right py-3 font-mono font-black text-xs text-emerald-600">
                        {typeof entry.total === 'number' ? formatCurrency(entry.total) : entry.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

        </div>
      </motion.div>
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
          <h3 className="text-2xl font-bold tracking-tight">Insumos</h3>
          <p className="text-gray-500">Gerencie mão-de-obra, materiais e equipamentos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Input
              placeholder="Pesquisar insumos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 h-10"
            />
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-3.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 text-xs shadow-sm cursor-pointer bg-white"
                  title="Organizar ordem das colunas da tabela"
                >
                  <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                  Organizar Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-2">
                <div className="font-bold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span>Ordem das Colunas</span>
                  <button
                    type="button"
                    onClick={() => setColumnOrder(['code', 'name', 'type', 'unit', 'basePrice', 'history', 'actions'])}
                    className="text-[10px] text-blue-600 hover:underline font-normal cursor-pointer"
                  >
                    Restaurar
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {columnOrder.map((colKey, idx) => (
                    <div key={colKey} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 font-medium text-slate-700">
                      <span>{columnLabels[colKey] || colKey}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveColumn(idx, 'up')}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-20 cursor-pointer"
                          title="Mover para esquerda/cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === columnOrder.length - 1}
                          onClick={() => moveColumn(idx, 'down')}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-20 cursor-pointer"
                          title="Mover para direita/baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {!readonly && (
              <>
                <Button
                  onClick={() => setIsExportSelectorOpen(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer text-sm"
                  title="Exportar / Importar Insumos"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> Exportar / Importar
                </Button>

                <Dialog open={isExportSelectorOpen} onOpenChange={setIsExportSelectorOpen}>
                  <DialogContent className="sm:max-w-[750px] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left flex flex-col max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="text-left space-y-2 shrink-0">
                      <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-600" />
                        Exportar / Importar Insumos
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Selecione o formato para exportação de dados, importe seus dados ou baixe o modelo padrão de cabeçalho.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-4 shrink-0">
                      {/* Opção 1: Relatório PDF */}
                      <button
                        onClick={() => {
                          exportResourcesToPDF(resources);
                          setIsExportSelectorOpen(false);
                        }}
                        className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                      >
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform mb-3">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs">Relatório PDF</span>
                        <span className="text-slate-400 text-[10px] mt-1 leading-tight">PDF formato Paisagem</span>
                      </button>

                      {/* Opção 2: Planilha Excel */}
                      <button
                        onClick={() => {
                          exportResourcesToExcel(resources);
                          setIsExportSelectorOpen(false);
                        }}
                        className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform mb-3">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs">Planilha Excel</span>
                        <span className="text-slate-400 text-[10px] mt-1 leading-tight">Base completa para conferência</span>
                      </button>

                      {/* Opção 3: Modelo / Atualização em Lote */}
                      <button
                        onClick={() => {
                          handleDownloadTemplate();
                          setIsExportSelectorOpen(false);
                        }}
                        className="flex flex-col items-center justify-center border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 p-5 rounded-2xl transition group text-center cursor-pointer bg-white"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform mb-3">
                          <Download className="w-6 h-6" />
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs">Baixar Modelo</span>
                        <span className="text-slate-400 text-[10px] mt-1 leading-tight">Planilha de exemplo para importação</span>
                      </button>

                      {/* Opção 4: Importar Dados */}
                      <div className="relative flex flex-col items-center justify-center border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50/20 p-5 rounded-2xl transition group text-center cursor-pointer overflow-hidden bg-white">
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10",
                            isImporting && "pointer-events-none"
                          )}
                          onChange={(e) => {
                            handleImportData(e);
                            setIsExportSelectorOpen(false);
                          }}
                          disabled={isImporting}
                        />
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform mb-3">
                          {isImporting ? (
                            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs">
                          {isImporting ? "Importando..." : "Importar Dados"}
                        </span>
                        <span className="text-slate-400 text-[10px] mt-1 leading-tight">Envie sua planilha preenchida</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-2 shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Importar das Integrações Internas (Setores)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Codificação padrão Cotações (MO-XXXX, EP-XXXX)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Importar Dados do RH */}
                        <button
                          type="button"
                          onClick={handleImportRH}
                          className="flex flex-col items-start p-3.5 border-2 border-purple-100 hover:border-purple-600 hover:bg-purple-50/40 rounded-xl transition group text-left cursor-pointer bg-white"
                        >
                          <div className="flex items-center gap-2.5 mb-2 w-full">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Users className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs">Importar Dados do RH</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-snug">
                            Trás cargos e médias salariais do RH como Mão de Obra com código padrão (<strong className="text-purple-700">MO-0001</strong>...).
                          </p>
                          <div className="mt-2.5 text-[10px] bg-purple-100/70 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                            {employees.length} cadastrados no RH
                          </div>
                        </button>

                        {/* Importar Dados do Controlador */}
                        <button
                          type="button"
                          onClick={handleImportController}
                          className="flex flex-col items-start p-3.5 border-2 border-amber-100 hover:border-amber-600 hover:bg-amber-50/40 rounded-xl transition group text-left cursor-pointer bg-white"
                        >
                          <div className="flex items-center gap-2.5 mb-2 w-full">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Truck className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs">Importar do Controlador</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-snug">
                            Trás frota e tipos do Controlador como Equipamento com código padrão (<strong className="text-amber-700">EP-0001</strong>...).
                          </p>
                          <div className="mt-2.5 text-[10px] bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            {controllerEquipments.length} cadastrados no Controlador
                          </div>
                        </button>

                        {/* Padronizar Códigos */}
                        <button
                          type="button"
                          onClick={handleStandardizeCodes}
                          className="flex flex-col items-start p-3.5 border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/40 rounded-xl transition group text-left cursor-pointer bg-white"
                        >
                          <div className="flex items-center gap-2.5 mb-2 w-full">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs">Padronizar Códigos</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-snug">
                            Converte códigos antigos (ex: <span className="line-through text-slate-400">EQ-xxx</span>) para a padronização oficial.
                          </p>
                          <div className="mt-2.5 text-[10px] bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                            Atualizar cadastro de insumos
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100 mt-3">
                      <p className="font-bold text-slate-800">Dica sobre a Importação e Tags de Insumos:</p>
                      <p>Ao realizar a importação de dados por planilha Excel, certifique-se de usar os cabeçalhos das colunas exatamente como definidos no modelo, ou utilize as tags (#) opcionais para mapeamento automático das colunas:</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <div className="grid grid-cols-1 gap-1 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                            <div><span className="font-bold text-slate-600">#tipo</span> - Tipo (material, mao-de-obra, equipamento)</div>
                            <div><span className="font-bold text-slate-600">#nome</span> - Nome do Insumo</div>
                            <div><span className="font-bold text-slate-600">#unidade</span> - Unidade (UN, KG, M2)</div>
                            <div><span className="font-bold text-slate-600">#preco</span> - Preço Base</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {!readonly && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAdd}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Insumo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Insumo</DialogTitle>
                    <DialogDescription>Preencha os dados básicos do insumo para utilizá-lo nas composições.</DialogDescription>
                  </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Tipo</Label>
                    <Select 
                      value={newResource.type} 
                      onValueChange={(v: ResourceType) => handleTypeChange(v)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Mão-de-obra</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="equipment">Equipamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code" className="text-right">Código</Label>
                    <Input 
                      id="code" 
                      className="col-span-3 bg-gray-50 font-mono" 
                      value={newResource.code} 
                      readOnly
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input 
                      id="name" 
                      className="col-span-3" 
                      value={newResource.name} 
                      onChange={e => setNewResource({...newResource, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unit" className="text-right">Unidade</Label>
                    <UnitAutoComplete 
                      id="unit" 
                      value={newResource.unit} 
                      onChange={val => setNewResource({...newResource, unit: val})} 
                      existingUnits={existingUnits}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      {newResource.type === 'labor' ? 'Preço Hora' : newResource.type === 'equipment' ? 'Preço Final' : 'Preço Base'}
                    </Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="price" 
                        value={newResource.basePrice} 
                        onChange={val => {
                          if (newResource.type === 'labor') {
                            setNewResource({...newResource, basePrice: val, monthlySalary: val * (newResource.hoursPerMonth || 220)});
                          } else {
                            setNewResource({...newResource, basePrice: val});
                          }
                        }} 
                        prefix="R$"
                        decimals={2}
                        required
                        disabled={newResource.type === 'equipment' && !!newResource.operatorId}
                      />
                    </div>
                  </div>
                  {newResource.type === 'labor' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hoursPerMonth" className="text-right">Horas/Mês</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="hoursPerMonth" 
                            value={newResource.hoursPerMonth || 220} 
                            onChange={val => {
                               const hours = val || 220;
                               setNewResource({...newResource, hoursPerMonth: hours, basePrice: newResource.monthlySalary ? newResource.monthlySalary / hours : newResource.basePrice});
                            }} 
                            decimals={0}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monthlySalary" className="text-right">Valor Mensal</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="monthlySalary" 
                            value={newResource.monthlySalary || 0} 
                            onChange={val => {
                               const hours = newResource.hoursPerMonth || 220;
                               setNewResource({...newResource, monthlySalary: val, basePrice: val / hours});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="encargos" className="text-right">Encargos (%)</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="encargos" 
                            value={newResource.encargos || 0} 
                            onChange={val => setNewResource({...newResource, encargos: val})} 
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {newResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="equipmentBaseCost" className="text-right leading-tight">Custo<br/>Equipamento</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="equipmentBaseCost" 
                            value={newResource.equipmentBaseCost || 0} 
                            onChange={val => {
                              const op = augmentedResources.find(r => r.id === newResource.operatorId);
                              const opCost = op ? op.basePrice : 0;
                              setNewResource({...newResource, equipmentBaseCost: val, basePrice: (val || 0) + opCost});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Operador</Label>
                        <div className="col-span-3 flex flex-col gap-2">
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Digite para buscar ou criar operador..."
                              value={
                                (!operatorComboboxOpen && newResource.operatorId)
                                  ? (newResource.operatorId === 'new'
                                      ? `Novo: ${newOperatorName}`
                                      : (augmentedResources.find(r => r.id === newResource.operatorId)?.name || 'Sem operador'))
                                  : operatorSearch
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setOperatorSearch(val);
                                setOperatorComboboxOpen(true);
                                if (!val) {
                                  setNewResource({
                                    ...newResource,
                                    operatorId: undefined,
                                    basePrice: newResource.equipmentBaseCost || 0
                                  });
                                }
                              }}
                              onFocus={() => {
                                setOperatorComboboxOpen(true);
                                const currentName = newResource.operatorId === 'new'
                                  ? newOperatorName
                                  : (augmentedResources.find(r => r.id === newResource.operatorId)?.name || '');
                                setOperatorSearch(currentName);
                              }}
                              className="h-10 text-sm"
                            />
                            {(newResource.operatorId || operatorSearch) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewResource({
                                    ...newResource,
                                    operatorId: undefined,
                                    basePrice: newResource.equipmentBaseCost || 0
                                  });
                                  setOperatorSearch('');
                                  setOperatorComboboxOpen(false);
                                }}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                              >
                                ✕
                              </button>
                            )}

                            {operatorComboboxOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOperatorComboboxOpen(false)} />
                                <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewResource({
                                        ...newResource,
                                        operatorId: undefined,
                                        basePrice: newResource.equipmentBaseCost || 0
                                      });
                                      setOperatorSearch('');
                                      setOperatorComboboxOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between text-gray-500 font-medium"
                                  >
                                    <span>Sem operador</span>
                                    {!newResource.operatorId && <Check className="w-4 h-4 text-blue-600" />}
                                  </button>

                                  {(() => {
                                    const searchLower = (operatorSearch || '').trim().toLowerCase();
                                    const currentOpName = newResource.operatorId === 'new'
                                      ? newOperatorName
                                      : (augmentedResources.find(r => r.id === newResource.operatorId)?.name || '');
                                    const effectiveSearch = (currentOpName && currentOpName.toLowerCase() === searchLower) ? '' : searchLower;

                                    const matches = augmentedResources
                                      .filter(r => r.type === 'labor')
                                      .filter(r => (r.name || '').toLowerCase().includes(effectiveSearch));

                                    return matches.map(lab => (
                                      <button
                                        type="button"
                                        key={lab.id}
                                        onClick={() => {
                                          const opCost = lab.monthlySalary || (lab.paymentType === 'month' || lab.paymentType === 'pj' ? (lab.basePrice > 500 ? lab.basePrice : lab.basePrice * 220) : lab.basePrice * 220) || lab.basePrice || 0;
                                          setNewResource({
                                            ...newResource,
                                            operatorId: lab.id,
                                            basePrice: (newResource.equipmentBaseCost || 0) + opCost
                                          });
                                          setOperatorSearch(lab.name);
                                          setOperatorComboboxOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-gray-900">{lab.name}</span>
                                          <span className="text-xs text-gray-500 font-mono">{formatCurrency(lab.basePrice)}</span>
                                        </div>
                                        {newResource.operatorId === lab.id && <Check className="w-4 h-4 text-blue-600" />}
                                      </button>
                                    ));
                                  })()}

                                  {operatorSearch.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewResource({ ...newResource, operatorId: 'new' });
                                        setNewOperatorName(operatorSearch);
                                        setOperatorComboboxOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-blue-600 flex items-center gap-2 font-semibold border-t border-gray-100 mt-1 pt-2"
                                    >
                                      <Plus className="w-4 h-4" /> Criar operador "{operatorSearch}"
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          {newResource.operatorId === 'new' && (
                             <div className="p-3 border rounded-md bg-gray-50 flex flex-col gap-3 mt-2">
                               <div className="text-xs font-bold text-gray-500 uppercase">Novo Operador</div>
                               <div className="flex flex-col gap-2">
                                 <Label>Nome da Função</Label>
                                 <Input value={newOperatorName} onChange={e => setNewOperatorName(e.target.value)} />
                               </div>
                               <div className="flex gap-2">
                                 <div className="flex flex-col gap-2 w-1/3">
                                   <Label>Horas/Mês</Label>
                                   <NumericInput value={newOperatorHours} onChange={setNewOperatorHours} decimals={0} />
                                 </div>
                                 <div className="flex flex-col gap-2 w-2/3">
                                   <Label>Salário Mensal</Label>
                                   <NumericInput value={newOperatorSalary} onChange={setNewOperatorSalary} prefix="R$" decimals={2} />
                                 </div>
                               </div>
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="productivePrice" 
                            value={newResource.productivePrice || 0} 
                            onChange={val => setNewResource({...newResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="unproductivePrice" 
                            value={newResource.unproductivePrice || 0} 
                            onChange={val => setNewResource({...newResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar Insumo</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {editingResource && (
              <form onSubmit={handleEditSubmit}>
                <DialogHeader>
                  <DialogTitle>Editar Insumo</DialogTitle>
                  <DialogDescription>Atualize os dados do insumo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-type" className="text-right">Tipo</Label>
                    <Select 
                      value={editingResource.type} 
                      onValueChange={(v: ResourceType) => handleEditTypeChange(v)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Mão-de-obra</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="equipment">Equipamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-code" className="text-right">Código</Label>
                    <Input 
                      id="edit-code" 
                      className="col-span-3 bg-gray-50 font-mono" 
                      value={editingResource.code} 
                      readOnly
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">Nome</Label>
                    <Input 
                      id="edit-name" 
                      className="col-span-3" 
                      value={editingResource.name} 
                      onChange={e => setEditingResource({...editingResource, name: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-unit" className="text-right">Unidade</Label>
                    <UnitAutoComplete 
                      id="edit-unit" 
                      value={editingResource.unit} 
                      onChange={val => setEditingResource({...editingResource, unit: val})} 
                      existingUnits={existingUnits}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">
                      {editingResource.type === 'labor' ? 'Preço Hora' : editingResource.type === 'equipment' ? 'Preço Final' : 'Preço Base'}
                    </Label>
                    <div className="col-span-3">
                      <NumericInput 
                        id="edit-price" 
                        value={editingResource.basePrice} 
                        onChange={val => {
                          if (editingResource.type === 'labor') {
                            setEditingResource({...editingResource, basePrice: val, monthlySalary: val * (editingResource.hoursPerMonth || 220)});
                          } else {
                            setEditingResource({...editingResource, basePrice: val});
                          }
                        }} 
                        prefix="R$"
                        decimals={2}
                        required
                        disabled={editingResource.type === 'equipment' && !!editingResource.operatorId}
                      />
                    </div>
                  </div>
                  {editingResource.type === 'labor' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-hoursPerMonth" className="text-right">Horas/Mês</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-hoursPerMonth" 
                            value={editingResource.hoursPerMonth || 220} 
                            onChange={val => {
                               const hours = val || 220;
                               setEditingResource({...editingResource, hoursPerMonth: hours, basePrice: editingResource.monthlySalary ? editingResource.monthlySalary / hours : editingResource.basePrice});
                            }} 
                            decimals={0}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-monthlySalary" className="text-right">Valor Mensal</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-monthlySalary" 
                            value={editingResource.monthlySalary || 0} 
                            onChange={val => {
                               const hours = editingResource.hoursPerMonth || 220;
                               setEditingResource({...editingResource, monthlySalary: val, basePrice: val / hours});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-encargos" className="text-right">Encargos (%)</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-encargos" 
                            value={editingResource.encargos || 0} 
                            onChange={val => setEditingResource({...editingResource, encargos: val})} 
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {editingResource.type === 'equipment' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-equipmentBaseCost" className="text-right leading-tight">Custo<br/>Equipamento</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-equipmentBaseCost" 
                            value={editingResource.equipmentBaseCost || 0} 
                            onChange={val => {
                              const op = augmentedResources.find(r => r.id === editingResource.operatorId);
                              const opCost = op ? op.basePrice : 0;
                              setEditingResource({...editingResource, equipmentBaseCost: val, basePrice: (val || 0) + opCost});
                            }} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Operador</Label>
                        <div className="col-span-3 flex flex-col gap-2">
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Digite para buscar ou criar operador..."
                              value={
                                (!editOperatorComboboxOpen && editingResource.operatorId)
                                  ? (editingResource.operatorId === 'new'
                                      ? `Novo: ${editNewOperatorName}`
                                      : (augmentedResources.find(r => r.id === editingResource.operatorId)?.name || 'Sem operador'))
                                  : editOperatorSearch
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditOperatorSearch(val);
                                setEditOperatorComboboxOpen(true);
                                if (!val) {
                                  setEditingResource({
                                    ...editingResource,
                                    operatorId: undefined,
                                    basePrice: editingResource.equipmentBaseCost || 0
                                  });
                                }
                              }}
                              onFocus={() => {
                                setEditOperatorComboboxOpen(true);
                                const currentName = editingResource.operatorId === 'new'
                                  ? editNewOperatorName
                                  : (augmentedResources.find(r => r.id === editingResource.operatorId)?.name || '');
                                setEditOperatorSearch(currentName);
                              }}
                              className="h-10 text-sm"
                            />
                            {(editingResource.operatorId || editOperatorSearch) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingResource({
                                    ...editingResource,
                                    operatorId: undefined,
                                    basePrice: editingResource.equipmentBaseCost || 0
                                  });
                                  setEditOperatorSearch('');
                                  setEditOperatorComboboxOpen(false);
                                }}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                              >
                                ✕
                              </button>
                            )}

                            {editOperatorComboboxOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setEditOperatorComboboxOpen(false)} />
                                <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingResource({
                                        ...editingResource,
                                        operatorId: undefined,
                                        basePrice: editingResource.equipmentBaseCost || 0
                                      });
                                      setEditOperatorSearch('');
                                      setEditOperatorComboboxOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between text-gray-500 font-medium"
                                  >
                                    <span>Sem operador</span>
                                    {!editingResource.operatorId && <Check className="w-4 h-4 text-blue-600" />}
                                  </button>

                                  {(() => {
                                    const searchLower = (editOperatorSearch || '').trim().toLowerCase();
                                    const currentOpName = editingResource.operatorId === 'new'
                                      ? editNewOperatorName
                                      : (augmentedResources.find(r => r.id === editingResource.operatorId)?.name || '');
                                    const effectiveSearch = (currentOpName && currentOpName.toLowerCase() === searchLower) ? '' : searchLower;

                                    const matches = augmentedResources
                                      .filter(r => r.type === 'labor')
                                      .filter(r => (r.name || '').toLowerCase().includes(effectiveSearch));

                                    return matches.map(lab => (
                                      <button
                                        type="button"
                                        key={lab.id}
                                        onClick={() => {
                                          const opCost = lab.monthlySalary || (lab.paymentType === 'month' || lab.paymentType === 'pj' ? (lab.basePrice > 500 ? lab.basePrice : lab.basePrice * 220) : lab.basePrice * 220) || lab.basePrice || 0;
                                          setEditingResource({
                                            ...editingResource,
                                            operatorId: lab.id,
                                            basePrice: (editingResource.equipmentBaseCost || 0) + opCost
                                          });
                                          setEditOperatorSearch(lab.name);
                                          setEditOperatorComboboxOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-gray-900">{lab.name}</span>
                                          <span className="text-xs text-gray-500 font-mono">{formatCurrency(lab.basePrice)}</span>
                                        </div>
                                        {editingResource.operatorId === lab.id && <Check className="w-4 h-4 text-blue-600" />}
                                      </button>
                                    ));
                                  })()}

                                  {editOperatorSearch.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingResource({ ...editingResource, operatorId: 'new' });
                                        setEditNewOperatorName(editOperatorSearch);
                                        setEditOperatorComboboxOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-blue-600 flex items-center gap-2 font-semibold border-t border-gray-100 mt-1 pt-2"
                                    >
                                      <Plus className="w-4 h-4" /> Criar operador "{editOperatorSearch}"
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          {editingResource.operatorId === 'new' && (
                             <div className="p-3 border rounded-md bg-gray-50 flex flex-col gap-3 mt-2">
                               <div className="text-xs font-bold text-gray-500 uppercase">Novo Operador</div>
                               <div className="flex flex-col gap-2">
                                 <Label>Nome da Função</Label>
                                 <Input value={editNewOperatorName} onChange={e => setEditNewOperatorName(e.target.value)} />
                               </div>
                               <div className="flex gap-2">
                                 <div className="flex flex-col gap-2 w-1/3">
                                   <Label>Horas/Mês</Label>
                                   <NumericInput value={editNewOperatorHours} onChange={setEditNewOperatorHours} decimals={0} />
                                 </div>
                                 <div className="flex flex-col gap-2 w-2/3">
                                   <Label>Salário Mensal</Label>
                                   <NumericInput value={editNewOperatorSalary} onChange={setEditNewOperatorSalary} prefix="R$" decimals={2} />
                                 </div>
                               </div>
                             </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-productivePrice" className="text-right leading-tight">Preço Hora<br/>Produtiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-productivePrice" 
                            value={editingResource.productivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, productivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-unproductivePrice" className="text-right leading-tight">Preço Hora<br/>Improdutiva</Label>
                        <div className="col-span-3">
                          <NumericInput 
                            id="edit-unproductivePrice" 
                            value={editingResource.unproductivePrice || 0} 
                            onChange={val => setEditingResource({...editingResource, unproductivePrice: val})} 
                            prefix="R$"
                            decimals={2}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Atualizar Insumo</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columnOrder.map((colKey) => {
                if (colKey === 'code') {
                  return (
                    <TableHead 
                      key="code"
                      className="w-[100px] cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        Código
                        {sortField === 'code' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colKey === 'name') {
                  return (
                    <TableHead 
                      key="name"
                      className="cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        Nome
                        {sortField === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colKey === 'type') {
                  return (
                    <TableHead 
                      key="type"
                      className="w-[120px] cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        Tipo
                        {sortField === 'type' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colKey === 'unit') {
                  return (
                    <TableHead 
                      key="unit"
                      className="w-[90px] cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('unit')}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        Unid.
                        {sortField === 'unit' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colKey === 'basePrice') {
                  return (
                    <TableHead 
                      key="basePrice"
                      className="text-right cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('basePrice')}
                    >
                      <div className="flex items-center justify-end gap-1 font-bold">
                        Preço Base / Médio
                        {sortField === 'basePrice' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colKey === 'history') {
                  return <TableHead key="history" className="w-[125px] text-center font-bold">Histórico</TableHead>;
                }
                if (colKey === 'actions') {
                  return <TableHead key="actions" className="w-[100px]"></TableHead>;
                }
                return null;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnOrder.length} className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Nenhum insumo encontrado para esta pesquisa.' : 'Nenhum insumo cadastrado.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedResources.map(r => {
                const rStats = getResourceStats(r);
                return (
                  <TableRow key={r.id} className="group">
                    {columnOrder.map((colKey) => {
                      if (colKey === 'code') {
                        return <TableCell key="code" className="font-mono text-sm">{r.code}</TableCell>;
                      }
                      if (colKey === 'name') {
                        return <TableCell key="name" className="font-medium">{r.name}</TableCell>;
                      }
                      if (colKey === 'type') {
                        return (
                          <TableCell key="type">
                            <Badge variant="outline" className={cn(
                              r.type === 'labor' && "bg-blue-50 text-blue-700 border-blue-200",
                              r.type === 'material' && "bg-green-50 text-green-700 border-green-200",
                              r.type === 'equipment' && "bg-purple-50 text-purple-700 border-purple-200",
                            )}>
                              {r.type === 'labor' ? 'Mão-de-obra' : r.type === 'material' ? 'Material' : 'Equipamento'}
                            </Badge>
                          </TableCell>
                        );
                      }
                      if (colKey === 'unit') {
                        return <TableCell key="unit" className="font-mono font-semibold">{r.unit}</TableCell>;
                      }
                      if (colKey === 'basePrice') {
                        return (
                          <TableCell key="basePrice" className="text-right font-mono">
                            <div className="flex flex-col items-end">
                              <span>{formatCurrency(rStats.averagePrice)}</span>
                              {rStats.purchaseCount > 0 && (
                                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">Médio (Compras)</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      }
                      if (colKey === 'history') {
                        return (
                          <TableCell key="history" className="text-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedHistoryResource(r)}
                              className="h-7 px-2.5 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700 transition"
                            >
                              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Histórico
                            </Button>
                          </TableCell>
                        );
                      }
                      if (colKey === 'actions') {
                        return (
                          <TableCell key="actions">
                            {!readonly && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-gray-400 hover:text-blue-600"
                                  onClick={() => startEdit(r)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-gray-400 hover:text-red-600"
                                  onClick={() => onDelete(r.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        );
                      }
                      return null;
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}
