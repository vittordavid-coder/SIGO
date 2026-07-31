import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Edit, Trash2, FileSpreadsheet, Briefcase, Download, Upload, HelpCircle, Copy,
  ChevronDown, ChevronRight, Tag, RefreshCw, AlertCircle, FileText, ArrowLeft, Check, Search, 
  Layers, Calculator, X, Sparkles, Filter, Printer, FileDown
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { ServiceComposition, Resource, CompositionItem } from '../types';
import { formatCurrency, formatNumber } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { exportServicesToExcel, exportAllCompositionsToExcel, exportServicesToPDF } from '../lib/exportUtils';
import { printDocument, exportToPDF, exportToExcel } from '../lib/reportTemplate';
import { getCompositionReportConfig } from '../lib/getCompositionReportConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumericInput } from '@/components/ui/numeric-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { ExcavatorLoader } from './ExcavatorLoader';

interface ServiceViewProps {
  key?: string;
  services: ServiceComposition[];
  resources: Resource[];
  onAdd: (s: Omit<ServiceComposition, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (s: ServiceComposition) => void;
  onAddResource?: (r: (Omit<Resource, 'id'> & { id?: string }) | (Omit<Resource, 'id'> & { id?: string })[]) => string | void;
  onAddServices?: (s: Omit<ServiceComposition, 'id'>[]) => Promise<any[]> | any[];
  companyLogo?: string;
  bdi?: number;
  readonly?: boolean;
  selectedContractId?: string | null;
  contracts?: any[];
  quotations?: any[];
}

export function ServiceView({ 
  services, 
  resources, 
  onAdd, 
  onDelete, 
  onUpdate, 
  onAddResource,
  onAddServices,
  companyLogo, 
  bdi = 0, 
  readonly,
  selectedContractId,
  contracts,
  quotations
}: ServiceViewProps) {
  // Navigation view state: 'list' | 'add' | 'edit'
  const [activeView, setActiveView] = useState<'list' | 'add' | 'edit'>('list');
  const [showAllServices, setShowAllServices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected composition for editing
  const [editingService, setEditingService] = useState<ServiceComposition | null>(null);
  
  // New composition form state
  const [newService, setNewService] = useState<Omit<ServiceComposition, 'id'>>({
    code: '',
    name: '',
    unit: '',
    production: 1,
    fit: 0,
    items: [],
  });

  // Items handling inside composition editor
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'labor' | 'equipment' | 'material' | 'service'>('all');
  const [currentItem, setCurrentItem] = useState<CompositionItem>({ resourceId: '', consumption: 0 });

  // Modal for Export/Import Excel/JSON
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isImportFromContractModalOpen, setIsImportFromContractModalOpen] = useState(false);
  const [selectedImportContractId, setSelectedImportContractId] = useState<string | null>(null);
  const [selectedImportServiceCodes, setSelectedImportServiceCodes] = useState<Set<string>>(new Set());



  // Collapsible state for service groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const activeContract = useMemo(() => {
    if (!selectedContractId || !contracts) return null;
    return contracts.find(c => c.id === selectedContractId);
  }, [selectedContractId, contracts]);

  const contractServiceIds = useMemo(() => {
    if (!selectedContractId || !contracts) return null;
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    const serviceIds = new Set<string>();
    const serviceCodes = new Set<string>();

    const hasDirectServices = contract.services && contract.services.length > 0;
    const hasDirectGroups = contract.groups && contract.groups.length > 0;

    if (hasDirectServices) {
      (contract.services || []).forEach((s: any) => {
        if (s.serviceId) serviceIds.add(s.serviceId);
        if (s.code) serviceCodes.add(s.code.trim().toLowerCase());
      });
    }

    if (hasDirectGroups) {
      contract.groups.forEach((g: any) => {
        g.services?.forEach((s: any) => {
          if (s.serviceId) serviceIds.add(s.serviceId);
          if (s.code) serviceCodes.add(s.code.trim().toLowerCase());
        });
      });
    }

    if (contract.quotationId && contract.quotationId !== 'none' && quotations) {
      const quotation = quotations.find(q => q.id === contract.quotationId);
      if (quotation) {
        const qServices = [
          ...(quotation.services || []),
          ...(quotation.groups?.flatMap((g: any) => g.services || []) || [])
        ];
        qServices.forEach((s: any) => {
          if (s.serviceId) serviceIds.add(s.serviceId);
          if (s.code) serviceCodes.add(s.code.trim().toLowerCase());
        });
      }
    }

    return { ids: serviceIds, codes: serviceCodes };
  }, [selectedContractId, contracts, quotations]);

  const displayedServices = useMemo(() => {
    if (selectedContractId && contractServiceIds && !showAllServices) {
      return services.filter(s => 
        (s.contractId === selectedContractId) || 
        (!s.contractId && (
          contractServiceIds.ids.has(s.id) || 
          (s.code && contractServiceIds.codes.has(s.code.trim().toLowerCase()))
        ))
      );
    }
    return services;
  }, [services, selectedContractId, contractServiceIds, showAllServices]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    (services || []).forEach(s => {
      if (s.groupName) groups.add(s.groupName);
    });
    return Array.from(groups).sort();
  }, [services]);

  const groupedServices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = displayedServices.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.code.toLowerCase().includes(term)
    );

    const groupsList: { id: string; name: string; services: ServiceComposition[] }[] = [];
    const matchedServiceIds = new Set<string>();

    if (activeContract) {
      // 1. Process contract worksheet groups
      if (activeContract.groups && activeContract.groups.length > 0) {
        activeContract.groups.forEach((g: any) => {
          const groupServices: ServiceComposition[] = [];
          g.services?.forEach((gs: any) => {
            const match = filtered.find(fs => 
              (fs.contractId === selectedContractId && (fs.id === gs.serviceId || (gs.code && fs.code.trim().toLowerCase() === gs.code.trim().toLowerCase()))) ||
              (!fs.contractId && (fs.id === gs.serviceId || (gs.code && fs.code.trim().toLowerCase() === gs.code.trim().toLowerCase())))
            );
            if (match && !groupServices.some(x => x.id === match.id)) {
              groupServices.push(match);
              matchedServiceIds.add(match.id);
            }
          });

          if (groupServices.length > 0) {
            groupsList.push({
              id: g.id || `group-${g.name}`,
              name: `Grupo da Planilha: ${g.name}`,
              services: groupServices
            });
          }
        });
      }

      // 2. Process compositions that have a local groupName or are direct
      const byLocalGroup = new Map<string, ServiceComposition[]>();
      const directServices: ServiceComposition[] = [];
      const otherServices: ServiceComposition[] = [];

      filtered.forEach(fs => {
        if (matchedServiceIds.has(fs.id)) return;
        
        if (fs.contractId === selectedContractId) {
          if (fs.groupName) {
            if (!byLocalGroup.has(fs.groupName)) byLocalGroup.set(fs.groupName, []);
            byLocalGroup.get(fs.groupName)!.push(fs);
            matchedServiceIds.add(fs.id);
          } else {
            directServices.push(fs);
            matchedServiceIds.add(fs.id);
          }
        } else {
          // not for this contract
          otherServices.push(fs);
        }
      });

      byLocalGroup.forEach((svcs, gName) => {
        groupsList.push({
          id: `local-group-${gName}`,
          name: `Grupo: ${gName}`,
          services: svcs
        });
      });

      if (directServices.length > 0) {
        groupsList.push({
          id: 'direct-services',
          name: 'Serviços do Seu Contrato',
          services: directServices
        });
      }

      if (otherServices.length > 0) {
        groupsList.push({
          id: 'other-services',
          name: 'Composições de Outras Obras / Global',
          services: otherServices
        });
      }
    } else {
      const byGroup = new Map<string, ServiceComposition[]>();
      const ungrouped: ServiceComposition[] = [];
      filtered.forEach(fs => {
        if (fs.groupName) {
          if (!byGroup.has(fs.groupName)) byGroup.set(fs.groupName, []);
          byGroup.get(fs.groupName)!.push(fs);
        } else {
          ungrouped.push(fs);
        }
      });
      byGroup.forEach((svcs, gName) => {
        groupsList.push({ id: `group-${gName}`, name: `Grupo: ${gName}`, services: svcs });
      });
      if (ungrouped.length > 0) {
        groupsList.push({
          id: 'all-compositions',
          name: 'Composições sem grupo',
          services: ungrouped
        });
      }
    }

    return groupsList;
  }, [displayedServices, activeContract, searchTerm, showAllServices]);

  // Start adding new composition
  const startAdd = () => {
    setNewService({ code: `SER-${Math.floor(100 + Math.random() * 900)}`, name: '', unit: 'm³', production: 1, fit: 0, items: [] });
    setCurrentItem({ resourceId: '', consumption: 0, productiveConsumption: 0, unproductiveConsumption: 0 });
    setEditingItemIndex(null);
    setResourceSearch('');
    setActiveView('add');
  };

  // Start editing existing composition
  const startEdit = (service: ServiceComposition) => {
    setEditingService(service);
    setCurrentItem({ resourceId: '', consumption: 0, productiveConsumption: 0, unproductiveConsumption: 0 });
    setEditingItemIndex(null);
    setResourceSearch('');
    setActiveView('edit');
  };

  const addItem = (isEdit: boolean = false) => {
    const isEquip = resources.find(r => r.id === currentItem.resourceId)?.type === 'equipment';
    const isValid = currentItem.resourceId && (
      (isEquip && ((currentItem.productiveConsumption || 0) > 0 || (currentItem.unproductiveConsumption || 0) > 0)) ||
      (!isEquip && currentItem.consumption > 0)
    );

    if (isValid) {
      if (isEdit && editingService) {
        const newItems = [...editingService.items];
        if (editingItemIndex !== null) {
          newItems[editingItemIndex] = currentItem;
        } else {
          newItems.push(currentItem);
        }
        setEditingService({ ...editingService, items: newItems });
      } else {
        const newItems = [...newService.items];
        if (editingItemIndex !== null) {
          newItems[editingItemIndex] = currentItem;
        } else {
          newItems.push(currentItem);
        }
        setNewService({ ...newService, items: newItems });
      }
      setCurrentItem({ resourceId: '', consumption: 0, productiveConsumption: 0, unproductiveConsumption: 0 });
      setResourceSearch('');
      setEditingItemIndex(null);
    }
  };

  const removeItem = (index: number, isEdit: boolean = false) => {
    if (isEdit && editingService) {
      setEditingService({
        ...editingService,
        items: editingService.items.filter((_, i) => i !== index)
      });
    } else {
      setNewService({
        ...newService,
        items: newService.items.filter((_, i) => i !== index)
      });
    }
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setCurrentItem({ resourceId: '', consumption: 0 });
    }
  };

  const editItem = (index: number, isEdit: boolean = false) => {
    const item = isEdit && editingService ? editingService.items[index] : newService.items[index];
    setCurrentItem(item);
    setEditingItemIndex(index);
    const res = resources.find(r => r.id === item.resourceId) || services.find(s => s.id === item.resourceId);
    if (res) setResourceSearch(res.name);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newService.code || !newService.name || !newService.unit) {
      alert('Por favor, preencha todos os campos obrigatórios (Código, Nome e Unidade).');
      return;
    }
    const serviceWithContract = {
      ...newService,
      contractId: selectedContractId || undefined
    };
    onAdd(serviceWithContract as any);
    setActiveView('list');
    setNewService({ code: '', name: '', unit: '', production: 1, fit: 0, items: [] });
  };

  const handleEditSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingService) {
      if (!editingService.code || !editingService.name || !editingService.unit) {
        alert('Por favor, preencha todos os campos obrigatórios (Código, Nome e Unidade).');
        return;
      }
      onUpdate(editingService);
      setActiveView('list');
      setEditingService(null);
    }
  };

  const handleCloneAndImport = (service: ServiceComposition) => {
    if (!selectedContractId) {
      alert("❌ Nenhum contrato selecionado para associar a composição.");
      return;
    }

    const cleanCode = service.code.trim();
    const alreadyExists = services.some(s => 
      s.contractId === selectedContractId && 
      s.code.trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (alreadyExists) {
      if (!confirm(`Seu contrato já possui uma composição com o código "${cleanCode}". Deseja importar assim mesmo (isso criará uma cópia)?`)) {
        return;
      }
    }

    const cloned: ServiceComposition = {
      ...service,
      id: `SC-${Math.floor(100000 + Math.random() * 900000)}`,
      contractId: selectedContractId,
      name: `${service.name} (Importado)`
    };

    onAdd(cloned);
    alert(`✅ Composição "${cloned.name}" importada com sucesso para o seu contrato!`);
    
    // Open for editing
    setEditingService(cloned);
    setActiveView('edit');
  };

  // Helper calculation for breakdown by category in composition page
  const getCategoryBreakdown = (composition: ServiceComposition | Omit<ServiceComposition, 'id'>) => {
    let labor = 0;
    let equipment = 0;
    let material = 0;
    let auxiliary = 0;

    (composition.items || []).forEach(item => {
      const res = resources.find(r => r.id === item.resourceId);
      const sub = services.find(s => s.id === item.resourceId);

      if (res) {
        let itemCost = 0;
        if (res.type === 'equipment') {
          const prod = item.productiveConsumption || 0;
          const impr = item.unproductiveConsumption || 0;
          const prodPrice = res.productivePrice || (res.basePrice / (res.hoursPerMonth || 200));
          const imprPrice = (res.equipmentBaseCost || res.basePrice) / (res.hoursPerMonth || 200);
          itemCost = (prod * prodPrice) + (impr * imprPrice);
          equipment += itemCost;
        } else {
          itemCost = item.consumption * (res.basePrice || 0);
          if (res.type === 'labor') labor += itemCost;
          else if (res.type === 'material') material += itemCost;
          else auxiliary += itemCost;
        }
      } else if (sub) {
        const subUnitCost = calculateServiceUnitCost(sub, resources, services);
        const itemCost = item.consumption * subUnitCost;
        auxiliary += itemCost;
      }
    });

    const totalDirect = labor + equipment + material + auxiliary;
    return {
      labor,
      equipment,
      material,
      auxiliary,
      totalDirect,
      laborPct: totalDirect > 0 ? (labor / totalDirect) * 100 : 0,
      equipmentPct: totalDirect > 0 ? (equipment / totalDirect) * 100 : 0,
      materialPct: totalDirect > 0 ? (material / totalDirect) * 100 : 0,
      auxiliaryPct: totalDirect > 0 ? (auxiliary / totalDirect) * 100 : 0,
    };
  };

  // Download & Import Excel templates
  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Modelo Composições");
      
      worksheet.addRow([
        "#Código_Serviço",
        "#Nome_Serviço",
        "#Unidade_Serviço",
        "#Produção_Serviço",
        "#Fator_Ajuste",
        "#Código_Insumo",
        "#Consumo",
        "#Consumo_Produtivo",
        "#Consumo_Improdutivo"
      ]);

      worksheet.addRow([
        "SER-001",
        "ESCAVAÇÃO MECÂNICA DE VALA",
        "m³",
        1.0,
        1.0,
        "MO-0001",
        0.05,
        0,
        0
      ]);
      worksheet.addRow([
        "SER-001",
        "ESCAVAÇÃO MECÂNICA DE VALA",
        "m³",
        1.0,
        1.0,
        "EP-0001",
        0,
        0.02,
        0.005
      ]);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "modelo_importacao_composicoes.xlsx");
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar modelo Excel.");
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          alert("❌ Planilha não encontrada no arquivo.");
          setIsImporting(false);
          return;
        }

        const importedCompositions: Record<string, Omit<ServiceComposition, 'id'>> = {};

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Ignore header

          const serviceCode = row.getCell(1).text.trim();
          const serviceName = row.getCell(2).text.trim();
          const serviceUnit = row.getCell(3).text.trim();
          const serviceProd = parseFloat(row.getCell(4).text) || 1;
          const serviceFit = parseFloat(row.getCell(5).text) || 1;
          const resCode = row.getCell(6).text.trim();
          const consumption = parseFloat(row.getCell(7).text) || 0;
          const productive = parseFloat(row.getCell(8).text) || 0;
          const unproductive = parseFloat(row.getCell(9).text) || 0;

          if (!serviceCode || !serviceName) return;

          if (!importedCompositions[serviceCode]) {
            importedCompositions[serviceCode] = {
              code: serviceCode,
              name: serviceName,
              unit: serviceUnit || 'un',
              production: serviceProd,
              fit: serviceFit,
              items: []
            };
          }

          if (resCode) {
            const res = resources.find(r => r.code.trim().toLowerCase() === resCode.toLowerCase()) || 
                        services.find(s => s.code.trim().toLowerCase() === resCode.toLowerCase());

            if (res) {
              const isEquip = 'type' in res && res.type === 'equipment';
              importedCompositions[serviceCode].items.push({
                resourceId: res.id,
                consumption: isEquip ? 0 : consumption,
                usageType: isEquip ? 'productive' : undefined,
                productiveConsumption: isEquip ? productive : undefined,
                unproductiveConsumption: isEquip ? unproductive : undefined
              });
            }
          }
        });

        const codes = Object.keys(importedCompositions);
        if (codes.length === 0) {
          alert("❌ Nenhum serviço válido encontrado para importação.");
          setIsImporting(false);
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        codes.forEach(code => {
          const imported = importedCompositions[code];
          const existing = services.find(s => 
            s.code.trim().toLowerCase() === code.toLowerCase() &&
            (selectedContractId ? s.contractId === selectedContractId : !s.contractId)
          );

          if (existing) {
            onUpdate({
              ...existing,
              name: imported.name || existing.name,
              unit: imported.unit || existing.unit,
              production: imported.production,
              fit: imported.fit,
              items: imported.items
            });
            updatedCount++;
          } else {
            onAdd({
              ...imported,
              contractId: selectedContractId || undefined
            });
            addedCount++;
          }
        });

        alert(`✅ Importação concluída!\n\nNovas composições: ${addedCount}\nComposições atualizadas: ${updatedCount}`);
        setIsExportImportModalOpen(false);
      } catch (err) {
        console.error("[Service Import Error]", err);
        alert("❌ Erro ao processar o arquivo Excel.");
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
  };

  const getContractServices = (contract: any) => {
    const list: { code: string; name: string; unit: string; price: number; groupName?: string }[] = [];
    const seenKeys = new Set<string>();

    const processServiceItem = (s: any, defaultGroupName: string) => {
      const linkedService = services.find(serv => serv.id === s.serviceId);
      const rawCode = s.code || linkedService?.code || '';
      const rawName = s.name || linkedService?.name || '';
      const rawUnit = s.unit || linkedService?.unit || 'un';
      const rawGroup = defaultGroupName || s.groupName || s.group || s.category || linkedService?.groupName || '';
      const price = s.price || 0;

      const codeVal = rawCode.trim();
      const nameVal = rawName.trim();

      if (nameVal || codeVal) {
        const finalCode = codeVal || `SRV-${(list.length + 1).toString().padStart(4, '0')}`;
        const key = `${finalCode.toLowerCase()}___${(nameVal || finalCode).toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            code: finalCode,
            name: nameVal || finalCode,
            unit: rawUnit.trim() || 'un',
            price,
            groupName: rawGroup.trim()
          });
        }
      }
    };

    if (contract.services && Array.isArray(contract.services)) {
      contract.services.forEach((s: any) => processServiceItem(s, ''));
    }

    if (contract.groups && Array.isArray(contract.groups)) {
      contract.groups.forEach((g: any) => {
        const groupTitle = g.name || g.groupName || g.title || g.group || g.category || '';
        if (g.services && Array.isArray(g.services)) {
          g.services.forEach((s: any) => processServiceItem(s, groupTitle));
        }
      });
    }

    return list;
  };

  const handleImportFromContract = async () => {
    const targetContract = contracts?.find(c => c.id === selectedImportContractId);
    if (!targetContract) {
      alert("❌ Por favor, selecione um contrato válido.");
      return;
    }

    const contractServices = getContractServices(targetContract);
    if (contractServices.length === 0) {
      alert("❌ Nenhum serviço encontrado no contrato selecionado.");
      return;
    }

    const servicesToProcess = contractServices.filter(s => selectedImportServiceCodes.has(s.code));
    if (servicesToProcess.length === 0) {
      alert("⚠️ Nenhum serviço selecionado para importação.");
      return;
    }

    setIsSaving(true);
    try {
      const servicesToAdd: Omit<ServiceComposition, 'id'>[] = [];
      const targetContractId = selectedContractId || selectedImportContractId || undefined;
      let importedCount = 0;
      let updatedCount = 0;

      servicesToProcess.forEach(item => {
        const codeVal = item.code.trim();
        const nameVal = item.name.trim();
        const unitVal = (item.unit || "un").trim();
        const groupVal = (item.groupName || "").trim();

        // Check if service composition already exists for this contract (or globally)
        const existingService = services.find(s => 
          s.code.trim().toLowerCase() === codeVal.toLowerCase() &&
          (targetContractId ? s.contractId === targetContractId : !s.contractId)
        );

        if (existingService) {
          onUpdate({
            ...existingService,
            name: nameVal || existingService.name,
            unit: unitVal || existingService.unit,
            groupName: groupVal || existingService.groupName,
            production: existingService.production || 1,
            fit: existingService.fit || 0,
            items: existingService.items || []
          });
          updatedCount++;
        } else {
          servicesToAdd.push({
            code: codeVal,
            name: nameVal,
            unit: unitVal,
            groupName: groupVal || undefined,
            production: 1,
            fit: 0,
            items: [],
            contractId: targetContractId
          } as any);
          importedCount++;
        }
      });

      if (servicesToAdd.length > 0) {
        if (onAddServices) {
          await onAddServices(servicesToAdd);
        } else {
          for (const s of servicesToAdd) {
            const res = onAdd(s);
            if (res instanceof Promise) {
              await res;
            }
          }
        }
      }

      alert(
        `✅ Importação de serviços do contrato concluída com sucesso!\n\n` +
        `• Novos serviços adicionados: ${importedCount}\n` +
        `• Serviços existentes atualizados: ${updatedCount}`
      );

      setIsImportFromContractModalOpen(false);
      setIsExportImportModalOpen(false);
    } catch (err) {
      console.error("[Contract Import Error]", err);
      alert("❌ Erro ao processar a importação de serviços do contrato: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const activeComposition = activeView === 'add' ? newService : editingService;

  // Render Full-Page Composition View / Window
  if (activeView === 'add' || activeView === 'edit') {
    const isEditMode = activeView === 'edit';
    const isCompositionReadOnly = isEditMode && editingService && selectedContractId && (editingService.contractId !== selectedContractId);
    const currentCompositionData = activeComposition;
    const categoryStats = currentCompositionData ? getCategoryBreakdown(currentCompositionData) : null;
    const directCost = currentCompositionData ? calculateServiceUnitCost(currentCompositionData as ServiceComposition, resources, services) : 0;
    const saleCostWithBdi = currentCompositionData ? calculateServiceUnitCost(currentCompositionData as ServiceComposition, resources, services, bdi) : 0;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 max-w-[1600px] mx-auto pb-16"
      >
        {/* Top Header & Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              onClick={() => { setActiveView('list'); setEditingService(null); }}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold border border-slate-700 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
              Voltar para Lista
            </Button>
            <div className="h-8 w-px bg-slate-800 hidden md:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isCompositionReadOnly 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : isEditMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                }`}>
                  {isCompositionReadOnly ? 'Modo de Visualização' : isEditMode ? 'Editando Composição' : 'Nova Composição de Serviço'}
                </span>
                {isEditMode && editingService && (
                  <span className="text-xs font-mono font-bold text-slate-400">{editingService.code}</span>
                )}
              </div>
              <h1 className="text-xl font-black text-white tracking-tight mt-1">
                {isCompositionReadOnly ? `Visualizar: ${editingService?.name}` : isEditMode ? (editingService?.name || 'Composição de Serviço') : (newService.name || 'Nova Composição')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode && editingService && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    type="button"
                    className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    Ações / Imprimir
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700 text-slate-200 shadow-xl rounded-xl p-1 z-50">
                  <DropdownMenuItem 
                    onClick={() => printDocument(getCompositionReportConfig(editingService, resources, services, companyLogo, bdi))}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-700 focus:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    Imprimir Composição
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportToPDF(getCompositionReportConfig(editingService, resources, services, companyLogo, bdi))}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-700 focus:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    Exportar em PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => exportToExcel(getCompositionReportConfig(editingService, resources, services, companyLogo, bdi))}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-700 focus:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Exportar em Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button 
              variant="ghost" 
              type="button"
              onClick={() => { setActiveView('list'); setEditingService(null); }}
              className="h-10 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
            >
              Cancelar
            </Button>
            {isCompositionReadOnly ? (
              <Button 
                type="button"
                onClick={() => handleCloneAndImport(editingService!)}
                className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Importar para Meu Contrato
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={isEditMode ? () => handleEditSubmit() : () => handleSubmit()}
                className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {isEditMode ? 'Salvar Alterações' : 'Criar Composição'}
              </Button>
            )}
          </div>
        </div>

        {isCompositionReadOnly && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Composição Restrita a Outras Obras</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Esta composição de serviço pertence a outra obra da empresa ou é uma composição padrão global. 
                  Você possui permissão apenas para visualizá-la, mas pode importá-la para o seu contrato atual para editá-la livremente.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => handleCloneAndImport(editingService!)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Copy className="w-4 h-4" /> Importar para Meu Contrato
            </Button>
          </div>
        )}

        {/* Basic Metadata Header Card */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
          <div className="bg-slate-100 text-slate-800 px-6 py-3 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              Especificações Gerais da Composição
            </div>
            <div className="text-slate-500 font-normal normal-case text-xs">
              Configure o código, unidade e taxa de produção do serviço
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="comp-code" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Código</Label>
                <Input 
                  id="comp-code" 
                  value={isEditMode ? (editingService?.code || '') : newService.code} 
                  onChange={e => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, code: e.target.value} : null) 
                    : setNewService({...newService, code: e.target.value})} 
                  placeholder="Ex: SER-001"
                  className="font-mono font-bold bg-slate-50 border-slate-200 h-11"
                  required 
                  disabled={isCompositionReadOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-unit" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Unidade</Label>
                <Input 
                  id="comp-unit" 
                  value={isEditMode ? (editingService?.unit || '') : newService.unit} 
                  onChange={e => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, unit: e.target.value} : null) 
                    : setNewService({...newService, unit: e.target.value})} 
                  placeholder="Ex: m³, m², un, h"
                  className="font-bold bg-slate-50 border-slate-200 h-11"
                  required 
                  disabled={isCompositionReadOnly}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="comp-group" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grupo</Label>
                <Input 
                  id="comp-group" 
                  list="group-names"
                  value={isEditMode ? (editingService?.groupName || '') : (newService.groupName || '')} 
                  onChange={e => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, groupName: e.target.value} : null) 
                    : setNewService({...newService, groupName: e.target.value})} 
                  placeholder="Ex: Movimentação de Terra"
                  className="font-bold bg-slate-50 border-slate-200 h-11"
                  disabled={isCompositionReadOnly}
                />
                <datalist id="group-names">
                  {uniqueGroups.map(g => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="comp-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome / Descrição do Serviço</Label>
                <Input 
                  id="comp-name" 
                  value={isEditMode ? (editingService?.name || '') : newService.name} 
                  onChange={e => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, name: e.target.value} : null) 
                    : setNewService({...newService, name: e.target.value})} 
                  placeholder="Ex: Escavação Mecânica e Carga de Vala"
                  className="font-bold bg-slate-50 border-slate-200 h-11 text-base"
                  required 
                  disabled={isCompositionReadOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-prod" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Produção Equipe (Pr)</Label>
                <NumericInput 
                  id="comp-prod" 
                  value={isEditMode ? (editingService?.production || 1) : newService.production} 
                  onChange={val => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, production: val} : null) 
                    : setNewService({...newService, production: val})} 
                  decimals={3}
                  className="font-bold bg-slate-50 border-slate-200 h-11 text-center"
                  required 
                  disabled={isCompositionReadOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp-fit" className="text-xs font-bold text-slate-700 uppercase tracking-wider">FIT (Fator)</Label>
                <NumericInput 
                  id="comp-fit" 
                  value={isEditMode ? (editingService?.fit || 0) : newService.fit} 
                  onChange={val => isEditMode 
                    ? setEditingService(prev => prev ? {...prev, fit: val} : null) 
                    : setNewService({...newService, fit: val})} 
                  decimals={3}
                  className="font-bold bg-slate-50 border-slate-200 h-11 text-center"
                  required 
                  disabled={isCompositionReadOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main 2-Column Split View Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Insumo Selector & Interactive Items Table (8/12 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Panel 1: Adicionar Insumos à Composição */}
            {!isCompositionReadOnly && (
              <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <h3 className="font-black text-slate-900 text-base">Adicionar Insumos e Componentes</h3>
                  </div>

                  {/* Filter Category Tabs */}
                  <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
                    <button 
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all ${selectedCategoryFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Todos
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedCategoryFilter('labor')}
                      className={`px-3 py-1 rounded-lg transition-all ${selectedCategoryFilter === 'labor' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'}`}
                    >
                      Mão de Obra
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedCategoryFilter('equipment')}
                      className={`px-3 py-1 rounded-lg transition-all ${selectedCategoryFilter === 'equipment' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'}`}
                    >
                      Equipamentos
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedCategoryFilter('material')}
                      className={`px-3 py-1 rounded-lg transition-all ${selectedCategoryFilter === 'material' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'}`}
                    >
                      Materiais
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedCategoryFilter('service')}
                      className={`px-3 py-1 rounded-lg transition-all ${selectedCategoryFilter === 'service' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-amber-700'}`}
                    >
                      Auxiliares
                    </button>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    
                    {/* Combobox Search Selector */}
                    <div className="md:col-span-7 relative space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Selecionar Insumo ou Serviço Auxiliar</Label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="Pesquisar por código ou nome do insumo..."
                          value={
                            (!isDropdownOpen && currentItem.resourceId)
                              ? (() => {
                                  const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                                  return res ? `${res.code} - ${res.name}` : '';
                                })()
                              : resourceSearch
                          }
                          onChange={(e) => {
                            setResourceSearch(e.target.value);
                            setIsDropdownOpen(true);
                            if (!e.target.value) {
                              setCurrentItem(prev => ({ ...prev, resourceId: '' }));
                            }
                          }}
                          onFocus={() => {
                            setIsDropdownOpen(true);
                            if (currentItem.resourceId) {
                              const res = resources.find(r => r.id === currentItem.resourceId) || services.find(s => s.id === currentItem.resourceId);
                              if (res) setResourceSearch(res.name);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding so clicks on the dropdown items can register
                            setTimeout(() => setIsDropdownOpen(false), 200);
                          }}
                          className="pl-9 pr-8 font-medium bg-slate-50 border-slate-200 h-11"
                        />
                        {currentItem.resourceId && (
                          <button 
                            type="button" 
                            onClick={() => { setCurrentItem({ resourceId: '', consumption: 0 }); setResourceSearch(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Options List */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {(() => {
                            const searchLower = resourceSearch.toLowerCase();
                            const filterType = selectedCategoryFilter;

                            let availableResources = resources.filter(r => {
                              if (filterType === 'labor' && r.type !== 'labor') return false;
                              if (filterType === 'equipment' && r.type !== 'equipment') return false;
                              if (filterType === 'material' && r.type !== 'material') return false;
                              if (filterType === 'service' && r.type !== 'service') return false;
                              return r.name.toLowerCase().includes(searchLower) || r.code.toLowerCase().includes(searchLower);
                            });

                            let availableServices = (filterType === 'all' || filterType === 'service') ? services.filter(s => {
                              if (isEditMode && editingService && s.id === editingService.id) return false;
                              return s.name.toLowerCase().includes(searchLower) || s.code.toLowerCase().includes(searchLower);
                            }) : [];

                            if (availableResources.length === 0 && availableServices.length === 0) {
                              return <div className="p-4 text-center text-xs text-slate-400">Nenhum insumo ou serviço encontrado.</div>;
                            }

                            return (
                              <>
                                {availableResources.map(r => (
                                  <div
                                    key={r.id}
                                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                    onClick={() => {
                                      setCurrentItem({
                                        resourceId: r.id,
                                        consumption: currentItem.consumption || 1,
                                        productiveConsumption: r.type === 'equipment' ? (currentItem.productiveConsumption || 1) : undefined,
                                        unproductiveConsumption: r.type === 'equipment' ? (currentItem.unproductiveConsumption || 0) : undefined,
                                      });
                                      setResourceSearch(`${r.code} - ${r.name}`);
                                      setIsDropdownOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        r.type === 'labor' ? 'bg-emerald-100 text-emerald-800' :
                                        r.type === 'equipment' ? 'bg-purple-100 text-purple-800' :
                                        r.type === 'material' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {r.type === 'labor' ? 'M.Obra' : r.type === 'equipment' ? 'Equip' : r.type === 'material' ? 'Mat' : 'Aux'}
                                      </span>
                                      <span className="font-mono font-bold text-slate-500">{r.code}</span>
                                      <span className="font-bold text-slate-900">{r.name}</span>
                                    </div>
                                    <div className="text-right font-mono font-bold text-slate-700">
                                      {formatCurrency(r.type === 'equipment' ? (r.productivePrice || r.basePrice) : r.basePrice)} / {r.unit}
                                    </div>
                                  </div>
                                ))}

                                {availableServices.map(s => (
                                  <div
                                    key={s.id}
                                    className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                    onClick={() => {
                                      setCurrentItem({
                                        resourceId: s.id,
                                        consumption: currentItem.consumption || 1,
                                      });
                                      setResourceSearch(`${s.code} - ${s.name}`);
                                      setIsDropdownOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                                        Serv. Aux.
                                      </span>
                                      <span className="font-mono font-bold text-slate-500">{s.code}</span>
                                      <span className="font-bold text-slate-900">{s.name}</span>
                                    </div>
                                    <div className="text-right font-mono font-bold text-amber-700">
                                      {formatCurrency(calculateServiceUnitCost(s, resources, services))} / {s.unit}
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Dynamic Consumption Inputs */}
                    {(() => {
                      const selectedRes = resources.find(r => r.id === currentItem.resourceId);
                      const isEquip = selectedRes?.type === 'equipment';

                      if (isEquip) {
                        return (
                          <div className="md:col-span-5 grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-blue-700 uppercase">Cons. Produtivo (h)</Label>
                              <NumericInput
                                value={currentItem.productiveConsumption || 0}
                                onChange={val => setCurrentItem(prev => ({ ...prev, productiveConsumption: val }))}
                                decimals={6}
                                className="font-mono font-bold bg-blue-50/50 border-blue-200 h-11 text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-slate-600 uppercase">Cons. Improdutivo (h)</Label>
                              <NumericInput
                                value={currentItem.unproductiveConsumption || 0}
                                onChange={val => setCurrentItem(prev => ({ ...prev, unproductiveConsumption: val }))}
                                decimals={6}
                                className="font-mono font-bold bg-slate-50 border-slate-200 h-11 text-center"
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="md:col-span-5 grid grid-cols-1 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Coeficiente / Consumo</Label>
                            <NumericInput
                              value={currentItem.consumption}
                              onChange={val => setCurrentItem(prev => ({ ...prev, consumption: val }))}
                              decimals={6}
                              placeholder="0.000000"
                              className="font-mono font-bold bg-slate-50 border-slate-200 h-11 text-center text-base"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Add Item Action Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => addItem(isEditMode)}
                      disabled={!currentItem.resourceId}
                      className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {editingItemIndex !== null ? 'Atualizar Item na Composição' : 'Adicionar Item à Composição'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Panel 2: Interactive Composition Items Table */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-4 font-bold text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Insumos Integrantes da Composição
                </div>
                <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                  {currentCompositionData?.items.length || 0} insumo(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-[80px] font-bold text-slate-700 text-xs">Tipo</TableHead>
                      <TableHead className="w-[100px] font-bold text-slate-700 text-xs">Código</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs">Descrição do Insumo</TableHead>
                      <TableHead className="w-[80px] font-bold text-slate-700 text-xs text-center">Unid.</TableHead>
                      <TableHead className="w-[180px] font-bold text-slate-700 text-xs text-right">Coeficiente / Consumo</TableHead>
                      <TableHead className="w-[130px] font-bold text-slate-700 text-xs text-right">Custo Unit. (R$)</TableHead>
                      <TableHead className="w-[140px] font-bold text-slate-700 text-xs text-right">Custo Total (R$)</TableHead>
                      {!isCompositionReadOnly && <TableHead className="w-[90px] font-bold text-slate-700 text-xs text-center">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!currentCompositionData || currentCompositionData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isCompositionReadOnly ? 7 : 8} className="py-12 text-center text-slate-400 font-medium">
                          Nenhum insumo ou serviço adicionado a esta composição ainda. Use o painel acima para buscar e adicionar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentCompositionData.items.map((item, index) => {
                        const res = resources.find(r => r.id === item.resourceId);
                        const sub = services.find(s => s.id === item.resourceId);

                        let typeTag = 'Outro';
                        let badgeStyle = 'bg-slate-100 text-slate-700';
                        let unitPrice = 0;
                        let itemTotalCost = 0;

                        if (res) {
                          if (res.type === 'labor') {
                            typeTag = 'MO';
                            badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                            unitPrice = res.basePrice || 0;
                            itemTotalCost = item.consumption * unitPrice;
                          } else if (res.type === 'equipment') {
                            typeTag = 'EP';
                            badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
                            const prod = item.productiveConsumption || 0;
                            const impr = item.unproductiveConsumption || 0;
                            const prodPrice = res.productivePrice || (res.basePrice / (res.hoursPerMonth || 200));
                            const imprPrice = (res.equipmentBaseCost || res.basePrice) / (res.hoursPerMonth || 200);
                            unitPrice = prodPrice;
                            itemTotalCost = (prod * prodPrice) + (impr * imprPrice);
                          } else if (res.type === 'material') {
                            typeTag = 'MAT';
                            badgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
                            unitPrice = res.basePrice || 0;
                            itemTotalCost = item.consumption * unitPrice;
                          } else {
                            typeTag = 'AUX';
                            badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                            unitPrice = res.basePrice || 0;
                            itemTotalCost = item.consumption * unitPrice;
                          }
                        } else if (sub) {
                          typeTag = 'SERV';
                          badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                          unitPrice = calculateServiceUnitCost(sub, resources, services);
                          itemTotalCost = item.consumption * unitPrice;
                        }

                        return (
                          <TableRow key={index} className="hover:bg-slate-50/80 transition-colors">
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeStyle}`}>
                                {typeTag}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-xs text-slate-600">
                              {res?.code || sub?.code || '---'}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900 text-sm">
                              {res?.name || sub?.name || 'Insumo Removido'}
                            </TableCell>
                            <TableCell className="text-center text-xs font-semibold text-slate-600">
                              {res?.unit || sub?.unit || '---'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              {res?.type === 'equipment' ? (
                                <div className="flex flex-col text-xs">
                                  <span className="text-blue-700 font-bold">Prod: {formatNumber(item.productiveConsumption || 0, 6)}</span>
                                  <span className="text-slate-500 font-medium">Impr: {formatNumber(item.unproductiveConsumption || 0, 6)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-900">{formatNumber(item.consumption, 6)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-slate-700">
                              {formatCurrency(unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-black text-blue-700">
                              {formatCurrency(itemTotalCost)}
                            </TableCell>
                            {!isCompositionReadOnly && (
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" 
                                    onClick={() => editItem(index, isEditMode)}
                                    title="Editar coeficiente"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" 
                                    onClick={() => removeItem(index, isEditMode)}
                                    title="Remover insumo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

          </div>

          {/* RIGHT COLUMN: Financial Summary & Category Breakdown (4/12 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Prominent Direct Unit Cost Display */}
            <Card className="border-blue-200 shadow-md bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-300">Custo Direto Unitário</span>
                  <Calculator className="w-5 h-5 text-blue-400" />
                </div>
                
                <div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {formatCurrency(directCost)}
                  </div>
                  <div className="text-xs text-blue-200 font-medium mt-1">
                    por {currentCompositionData?.unit || 'unidade'} do serviço
                  </div>
                </div>

                {bdi > 0 && (
                  <div className="pt-3 border-t border-blue-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-emerald-400 font-bold uppercase block">Preço de Venda (BDI {formatNumber(bdi, 2)}%)</span>
                      <span className="text-xl font-black text-emerald-300">{formatCurrency(saleCostWithBdi)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown Breakdown Card */}
            {categoryStats && (
              <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-black text-sm text-slate-900">
                  Composição do Custo Direto
                </div>
                <CardContent className="p-6 space-y-5">
                  
                  {/* Category Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${categoryStats.laborPct}%` }} className="bg-emerald-500 h-full" title="Mão de Obra" />
                      <div style={{ width: `${categoryStats.equipmentPct}%` }} className="bg-purple-500 h-full" title="Equipamentos" />
                      <div style={{ width: `${categoryStats.materialPct}%` }} className="bg-blue-500 h-full" title="Materiais" />
                      <div style={{ width: `${categoryStats.auxiliaryPct}%` }} className="bg-amber-500 h-full" title="Serviços Auxiliares" />
                    </div>
                  </div>

                  {/* Individual Categories Details */}
                  <div className="space-y-3 divide-y divide-slate-100">
                    
                    {/* Mão de Obra */}
                    <div className="pt-2 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-700">Mão de Obra</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-mono">{formatCurrency(categoryStats.labor)}</span>
                        <span className="text-slate-400 font-normal ml-2">({formatNumber(categoryStats.laborPct, 1)}%)</span>
                      </div>
                    </div>

                    {/* Equipamentos */}
                    <div className="pt-2 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="text-slate-700">Equipamentos</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-mono">{formatCurrency(categoryStats.equipment)}</span>
                        <span className="text-slate-400 font-normal ml-2">({formatNumber(categoryStats.equipmentPct, 1)}%)</span>
                      </div>
                    </div>

                    {/* Materiais */}
                    <div className="pt-2 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-slate-700">Materiais</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-mono">{formatCurrency(categoryStats.material)}</span>
                        <span className="text-slate-400 font-normal ml-2">({formatNumber(categoryStats.materialPct, 1)}%)</span>
                      </div>
                    </div>

                    {/* Serviços Auxiliares */}
                    <div className="pt-2 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-700">Serviços Auxiliares</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-mono">{formatCurrency(categoryStats.auxiliary)}</span>
                        <span className="text-slate-400 font-normal ml-2">({formatNumber(categoryStats.auxiliaryPct, 1)}%)</span>
                      </div>
                    </div>

                  </div>

                </CardContent>
              </Card>
            )}

            {/* Quick Actions Panel */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl p-6 space-y-3">
              {!isCompositionReadOnly && (
                <Button 
                  type="button"
                  onClick={isEditMode ? () => handleEditSubmit() : () => handleSubmit()}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {isEditMode ? 'Salvar Alterações' : 'Concluir Composição'}
                </Button>
              )}
              <Button 
                variant="outline"
                type="button"
                onClick={() => { setActiveView('list'); setEditingService(null); }}
                className="w-full h-10 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
              >
                {!isCompositionReadOnly ? 'Cancelar e Voltar' : 'Voltar para a Lista'}
              </Button>
            </Card>

          </div>

        </div>
      </motion.div>
    );
  }

  // Render Primary List View
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="space-y-6"
    >
      <ExcavatorLoader isSaving={isSaving} message="Sincronizando serviços importados..." />
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Composições de Serviços</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Gerencie e componha custos unitários detalhados para cada serviço.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Buscar por código ou nome..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 font-medium bg-slate-50 border-slate-200"
          />

          <Button 
            variant="outline"
            onClick={() => setIsExportImportModalOpen(true)}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Importar / Exportar
          </Button>

          {!readonly && (
            <Button 
              onClick={startAdd} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Composição
            </Button>
          )}
        </div>
      </div>

      {/* Contract / Obra Banner */}
      {selectedContractId && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Obra Ativa:</span>
            <span className="text-xs font-black text-blue-700 bg-blue-100/60 px-3 py-1 rounded-xl">
              {(() => {
                const c = contracts?.find(x => x.id === selectedContractId);
                return c?.workName || c?.contractNumber || 'Sem Nome';
              })()}
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Switch 
              id="show-all-services" 
              checked={showAllServices} 
              onCheckedChange={setShowAllServices} 
            />
            <Label htmlFor="show-all-services" className="font-bold text-slate-700 cursor-pointer text-xs">
              Mostrar serviços de todas as obras (on/off)
            </Label>
          </div>
        </div>
      )}

      {/* Services List Grid */}
      <div className="grid grid-cols-1 gap-6">
        {groupedServices.reduce((acc, g) => acc + g.services.length, 0) === 0 ? (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="py-16 text-center text-slate-500 space-y-3">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">
                {searchTerm ? 'Nenhum serviço encontrado para esta pesquisa.' : 'Nenhuma composição de serviço cadastrada.'}
              </p>
              {!readonly && !searchTerm && (
                <Button onClick={startAdd} className="bg-blue-600 hover:bg-blue-700 font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Criar Primeira Composição
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          groupedServices.map(g => {
            const isCollapsed = !!collapsedGroups[g.id];
            
            return (
              <div key={g.id} className="space-y-3 bg-slate-50/40 p-3 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                {/* Group Header */}
                <div 
                  onClick={() => {
                    setCollapsedGroups(prev => ({
                      ...prev,
                      [g.id]: !prev[g.id]
                    }));
                  }}
                  className="bg-white border border-slate-200/80 p-3 px-4 rounded-xl flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">
                        {g.name}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                        {g.services.length} {g.services.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">
                      {isCollapsed ? 'Expandir' : 'Minimizar'}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Group Content */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-3.5 pt-1">
                    {g.services.map(s => {
                      const directCost = calculateServiceUnitCost(s, resources, services);
                      const saleCost = calculateServiceUnitCost(s, resources, services, bdi);

                      return (
                        <Card key={s.id} className="border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group bg-white rounded-xl overflow-hidden">
                          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600 border border-purple-100 shrink-0">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600 tracking-wider">{s.code}</span>
                                  <h4 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">{s.name}</h4>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium">
                                  <span>Unidade: <strong className="text-slate-800">{s.unit}</strong></span>
                                  <span>•</span>
                                  <span>Insumos: <strong className="text-slate-800">{s.items.length} item(ns)</strong></span>
                                  {s.production > 1 && (
                                    <>
                                      <span>•</span>
                                      <span>Produção: <strong className="text-slate-800">{s.production}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-5 self-end sm:self-auto shrink-0">
                              <div className="text-right">
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Custo Unitário Direto</p>
                                <p className="text-lg font-black text-blue-600 font-mono">{formatCurrency(directCost)}</p>
                                {bdi > 0 && (
                                  <p className="text-xs text-emerald-600 font-bold font-mono">
                                    Venda (BDI): {formatCurrency(saleCost)}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  onClick={() => startEdit(s)}
                                  title="Abrir / Editar Composição"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                      title="Exportar / Imprimir"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl rounded-xl p-1 z-50">
                                    <DropdownMenuItem 
                                      onClick={() => printDocument(getCompositionReportConfig(s, resources, services, companyLogo, bdi))}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-50 focus:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      <Printer className="w-4 h-4 text-slate-500" />
                                      Imprimir Composição
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => exportToPDF(getCompositionReportConfig(s, resources, services, companyLogo, bdi))}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-50 focus:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      <FileDown className="w-4 h-4 text-blue-500" />
                                      Exportar em PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => exportToExcel(getCompositionReportConfig(s, resources, services, companyLogo, bdi))}
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-50 focus:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                      Exportar em Excel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {!readonly && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    onClick={() => onDelete(s.id)}
                                    title="Excluir Composição"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Export / Import Modal Dialog */}
      <Dialog open={isExportImportModalOpen} onOpenChange={setIsExportImportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar / Exportar Composições</DialogTitle>
            <DialogDescription>
              Baixe o modelo Excel ou faça upload de planilhas para cadastrar composições em lote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Modelo de Planilha Excel</h4>
              <p className="text-xs text-slate-500">Baixe o modelo pré-formatado para preencher dados de composições e insumos.</p>
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full justify-start font-bold text-xs">
                <Download className="w-4 h-4 mr-2 text-blue-600" /> Baixar Modelo Excel
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Importar Planilha Excel</h4>
              <p className="text-xs text-slate-500">Selecione um arquivo .xlsx preenchido conforme o modelo.</p>
              <Input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleExcelImport}
                disabled={isImporting}
                className="cursor-pointer text-xs"
              />
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-emerald-800">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Importar da Sala Técnica (Contrato)
              </h4>
              <p className="text-xs text-slate-500">
                Selecione serviços que já estão cadastrados nas planilhas e contratos de Sala Técnica para gerar composições locais de forma direta.
              </p>
              <Button 
                onClick={() => {
                  const defaultId = selectedContractId || (contracts && contracts.length > 0 ? contracts[0].id : null);
                  setSelectedImportContractId(defaultId);
                  
                  if (defaultId) {
                    const defaultContract = contracts?.find(c => c.id === defaultId);
                    if (defaultContract) {
                      const list = getContractServices(defaultContract);
                      setSelectedImportServiceCodes(new Set(list.map(s => s.code)));
                    }
                  } else {
                    setSelectedImportServiceCodes(new Set());
                  }

                  setIsImportFromContractModalOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-emerald-100" /> Abrir Importador da Sala Técnica
              </Button>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => exportAllCompositionsToExcel(services, resources, companyLogo, bdi)}
                className="flex-1 font-bold text-xs"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Exportar Todas (Excel)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportServicesToPDF(services, resources, companyLogo, bdi)}
                className="flex-1 font-bold text-xs"
              >
                <Download className="w-4 h-4 mr-2 text-red-600" /> Exportar Relatório (PDF)
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExportImportModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação de Serviços da Sala Técnica */}
      {isImportFromContractModalOpen && (
        <Dialog
          open={isImportFromContractModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsImportFromContractModalOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-[650px] w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 text-left flex flex-col max-h-[90vh]">
            <DialogHeader className="text-left space-y-1 shrink-0">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
                <Sparkles className="w-4 h-4" /> Importador da Sala Técnica
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Importar Serviços de Planilha Ativa
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecione o contrato/obra abaixo e marque os serviços que deseja importar para sua lista de Composições.
              </DialogDescription>
            </DialogHeader>

            {/* Selector & Actions */}
            <div className="space-y-4 my-3 shrink-0">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Selecione o Contrato/Obra:</Label>
                <Select 
                  value={selectedImportContractId || ""} 
                  onValueChange={(val) => {
                    setSelectedImportContractId(val);
                    const targetContract = contracts?.find(c => c.id === val);
                    if (targetContract) {
                      const list = getContractServices(targetContract);
                      setSelectedImportServiceCodes(new Set(list.map(s => s.code)));
                    } else {
                      setSelectedImportServiceCodes(new Set());
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs font-semibold h-10 border-slate-200 bg-white">
                    <SelectValue placeholder="Selecione um contrato..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200">
                    {contracts && contracts.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.contractNumber} - {c.workName || c.client || "Contrato Sem Nome"}
                      </SelectItem>
                    ))}
                    {(!contracts || contracts.length === 0) && (
                      <div className="p-2 text-xs text-slate-400 text-center">Nenhum contrato cadastrado.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Services List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl min-h-[200px] max-h-[40vh] my-1">
              {(() => {
                const currentContract = contracts?.find(c => c.id === selectedImportContractId);
                const availableServices = currentContract ? getContractServices(currentContract) : [];

                if (availableServices.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-5 h-5 text-slate-300" />
                      <span>Nenhum serviço disponível neste contrato ou nenhum contrato selecionado.</span>
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            checked={availableServices.length > 0 && selectedImportServiceCodes.size === availableServices.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedImportServiceCodes(new Set(availableServices.map(s => s.code)));
                              } else {
                                setSelectedImportServiceCodes(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Código</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Descrição do Serviço</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-center">Unid</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right">Preço Unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableServices.map((s) => {
                        const isSelected = selectedImportServiceCodes.has(s.code);
                        const alreadyExists = services.some(es => es.code.trim().toLowerCase() === s.code.trim().toLowerCase());
                        
                        return (
                          <TableRow 
                            key={s.code} 
                            className={`hover:bg-slate-50/55 transition-colors ${isSelected ? 'bg-emerald-50/10' : ''}`}
                          >
                            <TableCell className="text-center py-2.5">
                              <input 
                                type="checkbox" 
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedImportServiceCodes);
                                  if (next.has(s.code)) {
                                    next.delete(s.code);
                                  } else {
                                    next.add(s.code);
                                  }
                                  setSelectedImportServiceCodes(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-2.5 font-mono text-xs font-bold text-slate-700">
                              {s.code}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-slate-800">
                              <div className="flex flex-col">
                                <span className="font-semibold">{s.name}</span>
                                {s.groupName && (
                                  <span className="text-[10px] text-blue-600 font-medium">Grupo: {s.groupName}</span>
                                )}
                                {alreadyExists && (
                                  <span className="text-[9px] text-amber-600 font-bold mt-0.5">⚠️ Já possui composição (será atualizada)</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-center text-slate-500 font-medium">
                              {s.unit}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-right font-mono text-emerald-700 font-bold">
                              {formatCurrency(s.price)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportFromContractModalOpen(false)}
                className="rounded-xl border-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={selectedImportServiceCodes.size === 0}
                onClick={handleImportFromContract}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" /> Confirmar e Importar {selectedImportServiceCodes.size} Serviço(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
