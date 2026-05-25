import React, { useState, useEffect } from 'react';
import { Employee, Contract, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Plus, Trash2, FileSpreadsheet, FileDown, Eye, Upload, Filter, Search, LayoutGrid, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSupabaseConfig, createSupabaseClient } from '../lib/supabaseClient';

export interface RHTemplate {
  id: string;
  name: string;
  type: 'word' | 'excel';
  fileData: string; // base64
  createdAt: string;
}

interface RHDocumentsProps {
  employees: Employee[];
  currentUser: User;
}

export function RHDocuments({ employees, currentUser }: RHDocumentsProps) {
  const [templates, setTemplates] = useState<RHTemplate[]>([]);
  const [mode, setMode] = useState<'individual' | 'malote'>('individual');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'icons' | 'list'>('icons');
  
  // Individual selection
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Batch selection
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const supabaseConfig = getSupabaseConfig();
  const supabase = createSupabaseClient(supabaseConfig.url, supabaseConfig.key);

  const loadFromSupabase = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('rh_templates')
        .select('*')
        .eq('company_id', currentUser.companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Fetch URLs for each template
        setTemplates(data.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type as 'word' | 'excel',
          fileData: t.file_data, // this will now hold the storage URL instead of base64
          createdAt: t.created_at
        })));
      }
    } catch (e) {
      console.error('Failed to load templates from supabase', e);
    }
  };

  // Load templates from local storage (to simulate bucket) or Supabase
  useEffect(() => {
    if (supabase) {
      loadFromSupabase();
    } else {
      const saved = localStorage.getItem('rh_templates');
      if (saved) {
        try {
          setTemplates(JSON.parse(saved));
        } catch (e) { console.error('Failed to parse templates'); }
      }
    }
  }, [supabase]);

  const saveTemplates = async (newTemplates: RHTemplate[], newInserted?: { template: RHTemplate, file: File }) => {
    setTemplates(newTemplates);
    if (supabase) {
      if (newInserted) {
        setLoading(true);
        try {
          const { template, file } = newInserted;
          // 1. Upload to Supabase Storage Bucket 'RH'
          const filePath = `${currentUser.companyId}/${template.id}_${template.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from('rh').upload(filePath, file);
          
          if (uploadError) {
             console.error("Storage upload error:", uploadError);
             alert(`Erro ao fazer upload para o bucket RH: ${uploadError.message}. Verifique se o bucket 'RH' existe.`);
             return;
          }

          // 2. Get Public URL
          const { data: { publicUrl } } = supabase.storage.from('rh').getPublicUrl(filePath);

          // 3. Save reference in the database table
          const updatedTemplate = { ...template, fileData: publicUrl };
          
          await supabase.from('rh_templates').insert({
            id: template.id,
            company_id: currentUser.companyId,
            name: template.name,
            type: template.type,
            file_data: publicUrl, // Save URL instead of base64
            created_at: template.createdAt
          });
          
          // Update local state with the URL version
          setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate : t));

        } catch (e) {
           console.error("Error saving on supabase:", e);
           alert("Erro ao salvar documento em nuvem.");
        } finally {
          setLoading(false);
        }
      }
    } else {
      try {
        localStorage.setItem('rh_templates', JSON.stringify(newTemplates));
      } catch (e) {
         console.error('Local Storage quota limit reached', e);
         alert("O navegador não conseguiu salvar o documento. Limite de armazenamento local atingido.");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isWord = file.name.toLowerCase().endsWith('.docx');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx');
    
    if (!isWord && !isExcel) {
      alert('Apenas arquivos WORD (.docx) ou EXCEL (.xlsx) suportados.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string; 
      const newTemplate: RHTemplate = {
        id: crypto.randomUUID(),
        name: file.name,
        type: isWord ? 'word' : 'excel',
        fileData: base64Data, // Fallback base64 for local storage, will be replaced by URL in Supabase mode
        createdAt: new Date().toISOString()
      };
      saveTemplates([...templates, newTemplate], { template: newTemplate, file: file });
      setSelectedTemplateId(newTemplate.id);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja remover este modelo?')) {
      const templateToDelete = templates.find(t => t.id === id);
      const newT = templates.filter(t => t.id !== id);
      setTemplates(newT);
      if (selectedTemplateId === id) setSelectedTemplateId('');
      
      if (supabase && templateToDelete) {
        try {
           // Delete from DB
           await supabase.from('rh_templates').delete().eq('id', id);
           
           // Extract file path from URL if it's a supabase URL
           if (templateToDelete.fileData.includes('/storage/v1/object/public/rh/')) {
              const filePath = templateToDelete.fileData.split('/storage/v1/object/public/rh/')[1];
              if (filePath) {
                 await supabase.storage.from('rh').remove([filePath]);
              }
           }
        } catch (e) {
           console.error('Delete error', e);
        }
      } else {
        localStorage.setItem('rh_templates', JSON.stringify(newT));
      }
    }
  };

  // Convert Employee to a flat object replacing fields 
  const getEmployeeContext = (emp: Employee) => {
    return {
      NOME: emp.name || '',
      CARGO: emp.role || '',
      SALARIO: emp.salary?.toLocaleString('pt-BR', {minimumFractionDigits:2}) || '0,00',
      CPF: emp.cpf || '',
      RG: emp.rgNumber || '',
      DATA_ADMISSAO: emp.admissionDate ? new Date(emp.admissionDate).toLocaleDateString('pt-BR') : '',
      CTPS: emp.workBookletNumber || '',
      PIS: emp.pis || '',
      NASCIMENTO: emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR') : '',
      TELEFONE: emp.mobile || emp.phone || '',
      ENDERECO: emp.addressLogradouro ? `${emp.addressLogradouro}, ${emp.addressNumber} - ${emp.addressNeighborhood}` : ''
    };
  };

  const getBlobFromData = async (data: string): Promise<Blob> => {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      const response = await fetch(data);
      if (!response.ok) throw new Error('Failed to fetch file from server');
      return await response.blob();
    }
    const arr = data.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mime});
  };

  const generateWordDocument = async (template: RHTemplate, context: any, outName: string) => {
    try {
      const blob = await getBlobFromData(template.fileData);
      const arrayBuffer = await blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '[', end: ']' },
      });

      doc.render(context);
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      saveAs(out, outName);
    } catch (e) {
      console.error('Word Gen Error:', e);
      alert('Erro ao gerar documento Word.');
    }
  };

  const generateExcelDocument = async (template: RHTemplate, context: any, outName: string) => {
    try {
      const blob = await getBlobFromData(template.fileData);
      const arrayBuffer = await blob.arrayBuffer();
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (typeof cell.value === 'string') {
               let str = cell.value;
               let changed = false;
               for (const key in context) {
                 const replaceKey = `[${key}]`;
                 if (str.includes(replaceKey)) {
                   str = str.split(replaceKey).join(context[key]);
                   changed = true;
                 }
               }
               if (changed) cell.value = str;
            }
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const outBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(outBlob, outName);
    } catch (e) {
      console.error('Excel Gen Error:', e);
      alert('Erro ao gerar documento Excel. Verifique se o arquivo não está corrompido.');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      alert('Selecione um modelo da lista (ou faça upload).'); return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    if (mode === 'individual') {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (!emp) { alert('Selecione o colaborador.'); return; }
      
      const ctx = getEmployeeContext(emp);
      const filename = `${template.name.split('.')[0]} - ${emp.name}.${template.type === 'word'?'docx':'xlsx'}`;
      
      if (template.type === 'word') await generateWordDocument(template, ctx, filename);
       else await generateExcelDocument(template, ctx, filename);
       
    } else {
      if (selectedEmployeeIds.length === 0) { alert('Selecione pelo menos um colaborador.'); return; }
      
      // Batch mode: in reality, malote could be one single merged document (Word) or zip.
      // But we can generate multiple files or one zip. Using file-saver 10 times triggers browser multiple-download warning.
      // For simplicity, we just trigger download for each if it's not too many (limit 20)
      if (selectedEmployeeIds.length > 20) {
         alert('Selecione no máximo 20 colaboradores por vez para não travar o navegador.'); return;
      }
      
      for (const eid of selectedEmployeeIds) {
        const emp = employees.find(e => e.id === eid);
        if (emp) {
          const ctx = getEmployeeContext(emp);
          const filename = `${template.name.split('.')[0]} - ${emp.name}.${template.type === 'word'?'docx':'xlsx'}`;
          if (template.type === 'word') await generateWordDocument(template, ctx, filename);
          else await generateExcelDocument(template, ctx, filename);
          
          await new Promise(r => setTimeout(r, 600)); // Sleep between downloads
        }
      }
    }
  };

  const downloadTagsPDF = () => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Guia de Tags para Documentos (RH)", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Utilize as tags abaixo em seus documentos Word (.docx) ou Excel (.xlsx).", 14, 28);
    doc.text("O sistema fará a substituição automática para o valor correspondente do colaborador.", 14, 33);
    
    const tableData = [
      ["[NOME]", "Nome do Colaborador"],
      ["[CARGO]", "Cargo atual"],
      ["[SALARIO]", "Salário base (ex: 2.500,00)"],
      ["[CPF]", "CPF do colaborador"],
      ["[RG]", "Número do RG"],
      ["[DATA_ADMISSAO]", "Data de admissão (formato DD/MM/AAAA)"],
      ["[CTPS]", "Número da Carteira de Trabalho"],
      ["[PIS]", "Número do PIS"],
      ["[NASCIMENTO]", "Data de Nascimento (formato DD/MM/AAAA)"],
      ["[TELEFONE]", "Telefone ou Celular de contato"],
      ["[ENDERECO]", "Endereço com número e bairro"]
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Tag a ser usada no Documento', 'Descrição / Valor Substituído']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save("Guia_de_Tags_Modelos_RH.pdf");
  };

  const filtEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
        <Button 
          variant={mode === 'individual' ? 'default' : 'ghost'} 
          className={mode === 'individual' ? 'rounded-xl bg-white text-blue-600 shadow-sm px-6' : 'rounded-xl px-6'}
          onClick={() => setMode('individual')}
        >
          Documento Individual
        </Button>
        <Button 
          variant={mode === 'malote' ? 'default' : 'ghost'} 
          className={mode === 'malote' ? 'rounded-xl bg-white text-blue-600 shadow-sm px-6' : 'rounded-xl px-6'}
          onClick={() => setMode('malote')}
        >
          Malote (Em Lote)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Select Employee(s) depending on mode */}
        <div className="md:col-span-5 space-y-6">
          <Card className="border-none shadow-sm h-[500px] flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{mode === 'individual' ? 'Selecione o Colaborador' : 'Selecione os Colaboradores'}</CardTitle>
              <CardDescription>
                Selecione para preencher o modelo.
              </CardDescription>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                   placeholder="Buscar funcionário..." 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)}
                   className="pl-9 bg-gray-50 border-transparent shadow-none rounded-xl"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0 pb-2 p-4">
              {mode === 'individual' ? (
                <div className="space-y-1">
                  {filtEmployees.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEmployeeId(e.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${selectedEmployeeId === e.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-gray-100 hover:bg-gray-50'}`}
                    >
                       <p className={`font-bold text-sm ${selectedEmployeeId===e.id ? 'text-blue-700' : 'text-gray-700'}`}>{e.name}</p>
                       <p className="text-xs text-gray-400 font-medium">{e.role}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 pb-2 pl-2">
                     <Checkbox 
                        checked={selectedEmployeeIds.length === filtEmployees.length && filtEmployees.length > 0}
                        onCheckedChange={(c) => setSelectedEmployeeIds(c ? filtEmployees.map(e=>e.id) : [])}
                     />
                     <span className="text-sm font-bold text-gray-500">Selecionar Todos</span>
                  </div>
                  {filtEmployees.map(e => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEmployeeIds(
                        selectedEmployeeIds.includes(e.id) ? selectedEmployeeIds.filter(id => id !== e.id) : [...selectedEmployeeIds, e.id]
                      )}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${selectedEmployeeIds.includes(e.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-gray-100 hover:bg-gray-50'}`}
                    >
                       <Checkbox checked={selectedEmployeeIds.includes(e.id)} />
                       <div>
                         <p className={`font-bold text-sm ${selectedEmployeeIds.includes(e.id) ? 'text-blue-700' : 'text-gray-700'}`}>{e.name}</p>
                         <p className="text-xs text-gray-400 font-medium">{e.role}</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Template Selection and Actions */}
        <div className="md:col-span-7 space-y-6">
          <Card className="border-none shadow-sm flex flex-col min-h-[500px]">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Modelos</CardTitle>
                  <CardDescription>
                    Faça o upload do Word / Excel com as tags substituíveis, ex: [NOME], [CPF]
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex bg-gray-100 p-1 rounded-xl items-center border border-gray-200">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-lg transition-all ${viewMode === 'icons' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                      onClick={() => setViewMode('icons')}
                      title="Exibição em Ícones"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                      onClick={() => setViewMode('list')}
                      title="Exibição em Lista"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold" onClick={downloadTagsPDF}>
                    <FileDown className="w-4 h-4" /> Baixar Tags (PDF)
                  </Button>
                  <input type="file" id="templateUpload" className="hidden" accept=".docx,.xlsx" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 font-bold" onClick={() => document.getElementById('templateUpload')?.click()}>
                    <Upload className="w-4 h-4" /> Importar Modelo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
               {templates.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                     <FileText className="w-12 h-12 text-gray-300 mb-4" />
                     <p className="text-gray-500 font-medium text-sm">Nenhum modelo salvo.</p>
                     <p className="text-gray-400 text-xs mt-1">Importe documentos do Word ou Excel.</p>
                  </div>
               ) : viewMode === 'icons' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {templates.map(t => (
                      <div 
                         key={t.id} 
                         onClick={() => setSelectedTemplateId(t.id)}
                         className={`relative border-2 rounded-3xl p-5 cursor-pointer transition-all ${selectedTemplateId === t.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: selectedTemplateId === t.id ? 1 : undefined }} onClick={(e) => handleDeleteTemplate(t.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${t.type === 'word' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {t.type === 'word' ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 truncate pr-8">
                            <p className="font-bold text-gray-900 truncate">{t.name}</p>
                            <p className="text-xs text-gray-400 truncate uppercase mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
               ) : (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                     <Table>
                        <TableHeader className="bg-gray-50">
                           <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead className="font-bold text-gray-700 text-xs uppercase">Nome do Modelo</TableHead>
                              <TableHead className="font-bold text-gray-700 text-xs uppercase">Tipo</TableHead>
                              <TableHead className="font-bold text-gray-700 text-xs uppercase">Criado em</TableHead>
                              <TableHead className="text-right w-[80px]"></TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {templates.map(t => (
                              <TableRow 
                                 key={t.id}
                                 onClick={() => setSelectedTemplateId(t.id)}
                                 className={`cursor-pointer transition-colors ${selectedTemplateId === t.id ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                              >
                                 <TableCell className="py-3">
                                    <div className={`p-2 rounded-xl w-fit ${t.type === 'word' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                       {t.type === 'word' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                                    </div>
                                 </TableCell>
                                 <TableCell className="font-bold text-sm text-gray-800 py-3">{t.name}</TableCell>
                                 <TableCell className="text-xs text-gray-500 font-medium py-3 uppercase">{t.type === 'word' ? 'WORD (.docx)' : 'EXCEL (.xlsx)'}</TableCell>
                                 <TableCell className="text-xs text-gray-500 font-medium py-3">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                 <TableCell className="text-right py-3" onClick={e => e.stopPropagation()}>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={(e) => handleDeleteTemplate(t.id, e)}>
                                       <Trash2 className="w-4 h-4" />
                                    </Button>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               )}
            </CardContent>
            <CardFooter className="pt-4 border-t bg-gray-50/50">
               <Button size="lg" className="w-full gap-2 text-base font-black uppercase rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerate}>
                 <Download className="w-5 h-5" /> Gerar Documento{mode==='malote' ? 's em Malote' : ''}
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
