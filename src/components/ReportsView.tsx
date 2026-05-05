import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { FileText, Download, Printer, Eye, FileSpreadsheet } from 'lucide-react';
import { Quotation, ServiceComposition, Resource, BudgetGroup } from '../types';
import { exportCustomReport, exportResourceScheduleToExcel, exportFullReportToExcel } from '../lib/exportUtils';
import { calculateABCCurve, calculateMonthlyResourceABC } from '../lib/calculations';

interface ReportsViewProps {
  key?: string;
  quotations: Quotation[];
  services: ServiceComposition[];
  resources: Resource[];
  schedules: any[];
  budgetItems: {serviceId: string, quantity: number}[];
  budgetGroups: BudgetGroup[];
  companyLogo?: string;
  companyLogoRight?: string;
  logoMode?: 'left' | 'right' | 'both' | 'none';
  bdi?: number;
}

export function ReportsView({ quotations, services, resources, schedules, budgetItems, budgetGroups, companyLogo, companyLogoRight, logoMode, bdi = 0 }: ReportsViewProps) {
  const allQuotations = React.useMemo(() => {
    const list: Quotation[] = [];
    // Only add "Planilha Atual" if it has services or groups
    if (budgetItems.length > 0 || budgetGroups.length > 0) {
      list.push({ 
        id: 'current', 
        budgetName: 'Planilha Atual', 
        services: budgetItems, 
        groups: budgetGroups, 
        date: new Date().toLocaleDateString('pt-BR'), 
        organization: 'N/A' 
      } as Quotation);
    }
    return [...list, ...quotations];
  }, [budgetItems, budgetGroups, quotations]);

  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(() => {
    if (budgetItems.length > 0 || budgetGroups.length > 0) return 'current';
    return quotations.length > 0 ? quotations[0].id : '';
  });

  // Update selection if current becomes empty and was selected
  React.useEffect(() => {
    if (selectedQuotationId === 'current' && budgetItems.length === 0 && budgetGroups.length === 0) {
      if (quotations.length > 0) {
        setSelectedQuotationId(quotations[0].id);
      } else {
        setSelectedQuotationId('');
      }
    }
  }, [budgetItems, budgetGroups, quotations, selectedQuotationId]);
  const [includePlanilha, setIncludePlanilha] = useState(true);
  const [includeCronograma, setIncludeCronograma] = useState(true);
  const [includeCronogramaInsumos, setIncludeCronogramaInsumos] = useState(true);
  const [includeResumoFinanceiro, setIncludeResumoFinanceiro] = useState(true);
  const [includeCurvaABC, setIncludeCurvaABC] = useState(true);
  const [includeCotacoes, setIncludeCotacoes] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedQuotation = allQuotations.find(q => q.id === selectedQuotationId);
  const selectedSchedule = schedules.find(s => s.quotationId === selectedQuotationId);

  const validateSelection = () => {
    setValidationError(null);
    const missing = [];

    if (includePlanilha && (!selectedQuotation || (selectedQuotation.services.length === 0 && (selectedQuotation.groups?.length || 0) === 0))) {
      missing.push("Planilha de Orçamento (não há itens)");
    }

    if ((includeCronograma || includeCronogramaInsumos) && !selectedSchedule) {
      missing.push("Cronograma Físico-Financeiro (não definido para esta planilha)");
    }

    if (includeCurvaABC && (!selectedQuotation || (selectedQuotation.services.length === 0 && (selectedQuotation.groups?.length || 0) === 0))) {
      missing.push("Curva ABC (não há itens na planilha)");
    }

    if (includeCotacoes && (!selectedQuotation || (selectedQuotation.services.length === 0 && (selectedQuotation.groups?.length || 0) === 0))) {
      missing.push("Composições Analíticas (não há itens na planilha)");
    }

    if (missing.length > 0) {
      setValidationError(`Os seguintes itens não puderam ser gerados: ${missing.join(", ")}.`);
      return false;
    }

    return true;
  };

  React.useEffect(() => {
    setValidationError(null);
    if (!selectedSchedule) {
      setIncludeCronograma(false);
      setIncludeCronogramaInsumos(false);
    }
  }, [selectedSchedule, selectedQuotationId]);

  const handleSelectAll = (checked: boolean) => {
    setIncludePlanilha(checked);
    setIncludeCronograma(checked);
    setIncludeCronogramaInsumos(checked);
    setIncludeResumoFinanceiro(checked);
    setIncludeCurvaABC(checked);
    setIncludeCotacoes(checked);
  };

  const isAllSelected = includePlanilha && includeCronograma && includeCronogramaInsumos && includeResumoFinanceiro && includeCurvaABC && includeCotacoes;

  const generateDoc = () => {
    if (!selectedQuotation) return null;

    // Calculate ABC data if needed
    let abcServices = [];
    let abcResources = [];
    let summaryServices = {};
    let summaryResources = {};

    if (includeCurvaABC) {
      const abcDataServices = calculateABCCurve(selectedQuotation, services, resources, 'services');
      abcServices = abcDataServices.data;
      summaryServices = abcDataServices.summary;

      const abcDataResources = calculateABCCurve(selectedQuotation, services, resources, 'resources');
      abcResources = abcDataResources.data;
      summaryResources = abcDataResources.summary;
    }

    return exportCustomReport({
      quotation: selectedQuotation,
      schedule: selectedSchedule,
      services,
      resources,
      abcServices,
      abcResources,
      summaryServices,
      summaryResources,
      companyLogo,
      companyLogoRight,
      logoMode,
      bdi,
      includePlanilha,
      includeCronograma,
      includeCronogramaInsumos,
      includeResumoFinanceiro,
      includeCurvaABC,
      includeCotacoes
    });
  };

  const handlePreviewReport = () => {
    if (!validateSelection()) return;
    try {
      const doc = generateDoc();
      if (doc) {
        const pdfUrl = doc.output('datauristring');
        setPreviewPdfUrl(pdfUrl);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      setValidationError("Ocorreu um erro inesperado ao gerar o PDF. Verifique os dados do cronograma.");
    }
  };

  const handleDownloadReport = () => {
    if (!validateSelection()) return;
    try {
      const doc = generateDoc();
      if (doc && selectedQuotation) {
        doc.save(`Relatorio_Completo_${selectedQuotation.budgetName}.pdf`);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      setValidationError("Ocorreu um erro inesperado ao gerar o PDF. Verifique os dados do cronograma.");
    }
  };

  const handleExportExcelInsumos = () => {
    if (!validateSelection()) return;
    const monthlyData = calculateMonthlyResourceABC(selectedSchedule, selectedQuotation!, services, resources);
    exportResourceScheduleToExcel(monthlyData, selectedQuotation!.budgetName);
  };

  const handleExportExcelFull = () => {
    if (!validateSelection()) return;
    
    let abcServices = [];
    let abcResources = [];
    let summaryServices = {};
    let summaryResources = {};

    if (includeCurvaABC) {
      const abcDataServices = calculateABCCurve(selectedQuotation!, services, resources, 'services');
      abcServices = abcDataServices.data;
      summaryServices = abcDataServices.summary;

      const abcDataResources = calculateABCCurve(selectedQuotation!, services, resources, 'resources');
      abcResources = abcDataResources.data;
      summaryResources = abcDataResources.summary;
    }

    exportFullReportToExcel({
      quotation: selectedQuotation!,
      schedule: selectedSchedule,
      services,
      resources,
      abcServices,
      abcResources,
      summaryServices,
      summaryResources,
      bdi
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Relatórios</h3>
          <p className="text-gray-500">Geração de relatórios personalizados</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Configuração do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start gap-2">
              <div className="mt-0.5">⚠️</div>
              <div>{validationError}</div>
            </div>
          )}
          <div className="space-y-2 max-w-md">
            <Label>Planilha Base</Label>
            <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma planilha" />
              </SelectTrigger>
              <SelectContent>
                {allQuotations.map(q => (
                  <SelectItem key={q.id} value={q.id} textValue={q.budgetName}>
                    {q.budgetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900">Selecione os relatórios a incluir:</h4>
            
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox 
                id="all" 
                checked={isAllSelected} 
                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
              />
              <Label htmlFor="all" className="font-bold cursor-pointer">Todos (Gera todos os relatórios com Capa)</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="planilha" 
                  checked={includePlanilha} 
                  onCheckedChange={(c) => setIncludePlanilha(c as boolean)}
                />
                <Label htmlFor="planilha" className="cursor-pointer">Planilha de Quantitativos</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="cronograma" 
                  checked={includeCronograma} 
                  onCheckedChange={(c) => setIncludeCronograma(c as boolean)}
                  disabled={!selectedSchedule}
                />
                <Label htmlFor="cronograma" className="cursor-pointer">
                  Cronograma Físico-Financeiro
                  {!selectedSchedule && <span className="text-xs text-red-500 ml-2">(Não configurado)</span>}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="cronograma_insumos" 
                  checked={includeCronogramaInsumos} 
                  onCheckedChange={(c) => setIncludeCronogramaInsumos(c as boolean)}
                  disabled={!selectedSchedule}
                />
                <Label htmlFor="cronograma_insumos" className="cursor-pointer">
                  Insumos por Mês (Curva ABC)
                  {!selectedSchedule && <span className="text-xs text-red-500 ml-2">(Não configurado)</span>}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resumo_financeiro" 
                  checked={includeResumoFinanceiro} 
                  onCheckedChange={(c) => setIncludeResumoFinanceiro(c as boolean)}
                  disabled={!selectedSchedule}
                />
                <Label htmlFor="resumo_financeiro" className="cursor-pointer">
                  Resumo Produção vs Custo
                  {!selectedSchedule && <span className="text-xs text-red-500 ml-2">(Não configurado)</span>}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="abc" 
                  checked={includeCurvaABC} 
                  onCheckedChange={(c) => setIncludeCurvaABC(c as boolean)}
                />
                <Label htmlFor="abc" className="cursor-pointer">Curvas ABC (Serviços e Insumos)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="cotacoes" 
                  checked={includeCotacoes} 
                  onCheckedChange={(c) => setIncludeCotacoes(c as boolean)}
                />
                <Label htmlFor="cotacoes" className="cursor-pointer">Cotações (Composições Analíticas)</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button 
              onClick={handleExportExcelFull} 
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              disabled={!selectedQuotation}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (Completo)
            </Button>
            {includeCronogramaInsumos && selectedSchedule && (
              <Button 
                onClick={handleExportExcelInsumos} 
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (Insumos/Mês)
              </Button>
            )}
            <Button 
              onClick={handlePreviewReport} 
              disabled={!selectedQuotation || (!includePlanilha && !includeCronograma && !includeCronogramaInsumos && !includeCurvaABC && !includeCotacoes)}
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" /> Pré-visualizar
            </Button>
            <Button 
              onClick={handleDownloadReport} 
              disabled={!selectedQuotation || (!includePlanilha && !includeCronograma && !includeCronogramaInsumos && !includeCurvaABC && !includeCotacoes)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" /> Baixar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewPdfUrl} onOpenChange={(open) => !open && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Pré-visualização do Relatório</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-100">
            {previewPdfUrl && (
              <iframe 
                src={previewPdfUrl} 
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
