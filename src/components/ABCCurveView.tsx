import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, FileSpreadsheet, Download } from 'lucide-react';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line 
} from 'recharts';
import { ServiceComposition, Resource, Quotation, BudgetGroup } from '../types';
import { formatCurrency, formatNumber, cn } from '../lib/utils';
import { calculateServiceUnitCost } from '../lib/calculations';
import { useLocalStorage } from '../lib/useLocalStorage';
import { exportABCToExcel, exportABCToPDF } from '../lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ABCCurveViewProps {
  key?: string;
  services: ServiceComposition[];
  resources: Resource[];
  quotations: Quotation[];
  budgetItems: {serviceId: string, quantity: number}[];
  budgetGroups: BudgetGroup[];
  abcConfig: { limitA: number; limitB: number };
  bdi?: number;
}

export function ABCCurveView({ services, resources, quotations, budgetItems, budgetGroups, abcConfig, bdi = 0 }: ABCCurveViewProps) {
  const [companyLogo] = useLocalStorage<string>('sigo_company_logo', '');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('current');
  const [viewType, setViewType] = useState<'services' | 'resources'>('services');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'labor' | 'material' | 'equipment' | 'service'>('all');

  const activeItems = selectedQuotationId === 'current' 
    ? [
        ...budgetItems,
        ...(budgetGroups?.flatMap(g => g.services) || [])
      ]
    : [
        ...(quotations.find(q => q.id === selectedQuotationId)?.services || []),
        ...(quotations.find(q => q.id === selectedQuotationId)?.groups?.flatMap(g => g.services) || [])
      ];

  const activeQuotationName = selectedQuotationId === 'current' 
    ? 'Planilha Atual' 
    : quotations.find(q => q.id === selectedQuotationId)?.budgetName || 'Orçamento';

  const calculateABC = (items: {id: string, code: string, name: string, unit: string, quantity: number, unitCost: number, type?: string}[]) => {
    const data = items.map(item => ({
      ...item,
      totalCost: item.quantity * item.unitCost
    })).filter(item => item.totalCost > 0);

    data.sort((a, b) => b.totalCost - a.totalCost);

    const totalBudget = data.reduce((acc, item) => acc + item.totalCost, 0);
    let cumulative = 0;

    return data.map(item => {
      const percentage = (item.totalCost / totalBudget) * 100;
      cumulative += percentage;
      let category: 'A' | 'B' | 'C' = 'C';
      if (cumulative <= abcConfig.limitA + 0.001) category = 'A';
      else if (cumulative <= (abcConfig.limitA + abcConfig.limitB) + 0.001) category = 'B';
      
      return {
        ...item,
        percentage,
        cumulativePercentage: cumulative,
        category
      };
    });
  };

  const getServicesABC = () => {
    const items = activeItems.map(bi => {
      const s = services.find(serv => serv.id === bi.serviceId);
      if (!s) return null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        unit: s.unit,
        quantity: bi.quantity,
        unitCost: calculateServiceUnitCost(s, resources, services, bdi)
      };
    }).filter(Boolean) as any[];

    return calculateABC(items);
  };

  const getResourcesABC = () => {
    const resourceTotals: Record<string, {quantity: number, totalCost: number}> = {};

    const explode = (comp: ServiceComposition, multiplier: number) => {
      comp.items.forEach(item => {
        const res = resources.find(r => r.id === item.resourceId);
        if (res) {
          const totalQty = item.consumption * multiplier;
          const totalCost = totalQty * res.basePrice;
          if (!resourceTotals[res.id]) {
            resourceTotals[res.id] = { quantity: 0, totalCost: 0 };
          }
          resourceTotals[res.id].quantity += totalQty;
          resourceTotals[res.id].totalCost += totalCost;
        } else {
          const subS = services.find(s => s.id === item.resourceId);
          if (subS) {
            explode(subS, (item.consumption * multiplier) / subS.production);
          }
        }
      });
    };

    activeItems.forEach(bi => {
      const service = services.find(s => s.id === bi.serviceId);
      if (!service) return;
      explode(service, bi.quantity / service.production);
    });

    const items = Object.entries(resourceTotals).map(([id, data]) => {
      const res = resources.find(r => r.id === id);
      return {
        id,
        code: res?.code || '',
        name: res?.name || '',
        unit: res?.unit || '',
        quantity: data.quantity,
        unitCost: res?.basePrice || 0,
        totalCost: data.totalCost,
        type: res?.type || 'service'
      };
    }).filter(item => resourceFilter === 'all' || item.type === resourceFilter);

    return calculateABC(items);
  };

  const abcData = viewType === 'services' ? getServicesABC() : getResourcesABC();
  const totalValue = abcData.reduce((acc, item) => acc + item.totalCost, 0);
  const summaryData = {
    totalValue,
    totalItems: abcData.length,
    classA: abcData.filter(i => i.category === 'A').length,
    classB: abcData.filter(i => i.category === 'B').length,
    classC: abcData.filter(i => i.category === 'C').length,
  };

  const chartData = abcData.map(item => ({
    name: item.code,
    total: item.totalCost,
    cumulative: item.cumulativePercentage
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Curva ABC</h3>
          <p className="text-gray-500">Análise de Pareto da planilha selecionada</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportABCToExcel(abcData, `${activeQuotationName} - ${viewType === 'services' ? 'Serviços' : 'Insumos'}`, summaryData)}
              disabled={abcData.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportABCToPDF(abcData, `${activeQuotationName} - ${viewType === 'services' ? 'Serviços' : 'Insumos'}`, summaryData, companyLogo)}
              disabled={abcData.length === 0}
            >
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold text-gray-400 uppercase">Planilha:</Label>
            <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
              <SelectTrigger className="w-[250px] bg-white">
                <SelectValue placeholder="Selecionar Planilha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current" textValue="Planilha Atual (Em edição)">
                  Planilha Atual (Em edição)
                </SelectItem>
                {quotations.map(q => (
                  <SelectItem key={q.id} value={q.id} textValue={q.budgetName}>
                    {q.budgetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
            <Button 
              variant={viewType === 'services' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewType('services')}
              className={cn(viewType === 'services' && "bg-blue-600")}
            >
              Serviços
            </Button>
            <Button 
              variant={viewType === 'resources' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewType('resources')}
              className={cn(viewType === 'resources' && "bg-blue-600")}
            >
              Insumos
            </Button>
          </div>
        </div>
      </div>

      {viewType === 'resources' && (
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
          <Button 
            variant={resourceFilter === 'all' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setResourceFilter('all')}
            className={cn(resourceFilter === 'all' && "bg-slate-800")}
          >
            Todos
          </Button>
          <Button 
            variant={resourceFilter === 'labor' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setResourceFilter('labor')}
            className={cn(resourceFilter === 'labor' && "bg-blue-600")}
          >
            Mão de Obra
          </Button>
          <Button 
            variant={resourceFilter === 'material' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setResourceFilter('material')}
            className={cn(resourceFilter === 'material' && "bg-purple-600")}
          >
            Material
          </Button>
          <Button 
            variant={resourceFilter === 'equipment' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setResourceFilter('equipment')}
            className={cn(resourceFilter === 'equipment' && "bg-orange-600")}
          >
            Equipamento
          </Button>
          <Button 
            variant={resourceFilter === 'service' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setResourceFilter('service')}
            className={cn(resourceFilter === 'service' && "bg-emerald-600")}
          >
            Serv. Auxiliares
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Gráfico da Curva ABC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    interval={Math.ceil(chartData.length / 15)}
                  />
                  <YAxis 
                    yAxisId="left"
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${formatNumber(value, 0)}`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'total') return [formatCurrency(value), 'Valor Total'];
                      return [`${formatNumber(value, 2)}%`, 'Acumulado'];
                    }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="total" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={{ r: 2, fill: '#ef4444' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resumo da Análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400">Valor Total da Planilha</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total de Itens</p>
                  <p className="text-xl font-semibold text-gray-700">{abcData.length}</p>
                </div>
              </div>
              
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Classe A ({abcConfig.limitA}%)</span>
                      </div>
                      <span className="text-sm font-bold">{abcData.filter(i => i.category === 'A').length} itens</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm font-medium">Classe B ({abcConfig.limitB}%)</span>
                      </div>
                      <span className="text-sm font-bold">{abcData.filter(i => i.category === 'B').length} itens</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm font-medium">Classe C ({100 - abcConfig.limitA - abcConfig.limitB}%)</span>
                      </div>
                      <span className="text-sm font-bold">{abcData.filter(i => i.category === 'C').length} itens</span>
                    </div>
                  </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Top 5 Itens (Classe A)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {abcData.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-600 truncate">{item.code}</p>
                      <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">{formatCurrency(item.totalCost)}</p>
                      <p className="text-[10px] text-gray-400">{formatNumber(item.percentage, 2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem Detalhada da Curva ABC</CardTitle>
          <CardDescription>Todos os itens classificados por importância financeira.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px] text-center">Pos.</TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[60px] text-center">Unid.</TableHead>
                  <TableHead className="w-[100px] text-right">Qtd.</TableHead>
                  <TableHead className="w-[120px] text-right">Total (R$)</TableHead>
                  {viewType === 'resources' && <TableHead className="w-[100px]">Tipo</TableHead>}
                  <TableHead className="w-[80px] text-right">%</TableHead>
                  <TableHead className="w-[80px] text-right">% Acum.</TableHead>
                  <TableHead className="w-[60px] text-center">Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abcData.map((item, idx) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="text-center text-xs text-gray-500">{idx + 1}</TableCell>
                    <TableCell className="text-xs font-bold text-blue-600">{item.code}</TableCell>
                    <TableCell className="text-xs font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-xs">{item.unit}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{formatNumber(item.quantity, 3)}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold">{formatCurrency(item.totalCost)}</TableCell>
                    {viewType === 'resources' && (
                      <TableCell className="text-[10px] uppercase font-bold text-gray-400">
                        {item.type === 'labor' ? 'Mão de Obra' : 
                         item.type === 'material' ? 'Material' : 
                         item.type === 'equipment' ? 'Equipamento' : 'Serv. Auxiliar'}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-xs font-mono">{formatNumber(item.percentage, 2)}%</TableCell>
                    <TableCell className="text-right text-xs font-mono">{formatNumber(item.cumulativePercentage, 2)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0",
                          item.category === 'A' ? "bg-green-50 text-green-700 border-green-200" :
                          item.category === 'B' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {item.category}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
