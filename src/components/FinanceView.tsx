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
import { Landmark, Plus, Edit, Trash2, Printer, FileText, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Aporte, AporteItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const FinanceView = ({ 
  contracts, 
  selectedContractId: propSelectedContractId, 
  onUpdateContractId,
  aportes = [],
  setAportes,
  currentUser
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

  const aportesCompany = useMemo(() => {
    return aportes.filter((a: Aporte) => {
      const matchCompany = !currentUser?.companyId || a.companyId === currentUser.companyId;
      const matchContract = selectedContractId === 'all' || a.contractId === selectedContractId || !a.contractId;
      return matchCompany && matchContract;
    });
  }, [aportes, currentUser, selectedContractId]);

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
    setItemFormData({ ...item });
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!selectedAporte) return;

    const newItem: AporteItem = {
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
      const templateData = [{
        'Número do Aporte': '001/2026',
        Categoria: 'Exemplo Categoria',
        Subcategoria: 'Exemplo Sub',
        Fornecedor: 'Fornecedor A',
        Descrição: 'Descrição do item',
        Vencimento: '2026-10-15',
        Valor: 1500.50
      }];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo_Importacao_Aportes");
      XLSX.writeFile(workbook, `Modelo_Importacao_Aportes.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Erro ao baixar modelo.');
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let newAportes = [...aportes];
        let itemsCount = 0;
        let aportesAdded = 0;

        // Group rows by 'Número do Aporte'
        const groupedByAporte: Record<string, any[]> = {};
        data.forEach((row: any) => {
          const numeroAporte = row['Número do Aporte'] || row['Numero do Aporte'] || selectedAporte?.numero;
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
            categoria: row.Categoria || '',
            subcategoria: row.Subcategoria || '',
            fornecedor: row.Fornecedor || '',
            descricao: row.Descrição || row.Descricao || '',
            mesCompetencia: '',
            dataVencimento: row.Vencimento || '',
            valor: Number(row.Valor) || 0,
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
          setAportes(newAportes);
          alert(`${itemsCount} itens importados com sucesso! ${aportesAdded > 0 ? `(${aportesAdded} novos aportes criados)` : ''}`);
        } else {
           alert("Nenhum dado válido encontrado. Certifique-se de que a coluna 'Número do Aporte' está preenchida.");
        }
      } catch (err) {
        alert("Erro ao importar arquivo Excel. Verifique o modelo.");
        console.error(err);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border rounded-xl p-1">
          <TabsTrigger value="aportes" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Aportes</TabsTrigger>
          <TabsTrigger value="resumo-aportes" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Gestão de Aportes</TabsTrigger>
          <TabsTrigger value="caixa" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Controle de Caixa</TabsTrigger>
        </TabsList>
        
        <TabsContent value="aportes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gestão de Aportes</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Modelo Excel
                  </Button>
                  <div className="relative">
                    <Input type="file" accept=".xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImportExcel} title="Importar Planilha" />
                    <Button variant="outline" className="flex items-center gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" /> Importar Planilha
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
                              <TableCell>
                                <div className="font-medium text-slate-900">{item.categoria}</div>
                                <div className="text-xs text-slate-500">{item.subcategoria}</div>
                              </TableCell>
                              <TableCell>{item.fornecedor}</TableCell>
                              <TableCell>{item.descricao}</TableCell>
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
    </div>
  );
};


