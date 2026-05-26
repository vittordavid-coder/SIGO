import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Treemap } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Landmark, ArrowLeft, Users, HardHat, TrendingUp } from 'lucide-react';

const CustomTreemapContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, name, onClick, onMouseEnter, onMouseLeave, activeFilter } = props;
  
  if (width < 30 || height < 30) return null;

  // The custom content sometimes receives a single color property or we can define a palette
  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
    '#64748b', '#d946ef', '#1e293b', '#0369a1', '#be123c',
    '#4d7c0f', '#a21caf', '#1d4ed8', '#0f766e', '#c2410c'
  ];
  // Stable color based on name sum to prevent flickering
  const nameHash = name ? name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : index;
  const color = COLORS[nameHash % COLORS.length];

  const [isHovered, setIsHovered] = useState(false);

  const isSelected = activeFilter === name;
  const isDimmed = activeFilter && !isSelected;

  return (
    <g 
       onClick={() => { if(onClick) onClick(name); }} 
       onMouseEnter={(e) => { setIsHovered(true); if (onMouseEnter) onMouseEnter(props, e); }}
       onMouseLeave={(e) => { setIsHovered(false); if (onMouseLeave) onMouseLeave(props, e); }}
       className="cursor-pointer transition-all duration-300 ease-out"
       style={{ 
         transform: isHovered || isSelected ? `translate(-2px, -2px)` : 'translate(0px, 0px)',
         opacity: isDimmed ? 0.3 : 1
       }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: isHovered || isSelected ? '#fff' : '#ffffff80',
          strokeWidth: isHovered || isSelected ? 3 : 1,
          filter: isHovered || isSelected ? 'drop-shadow(4px 4px 4px rgba(0,0,0,0.4))' : 'drop-shadow(1px 1px 2px rgba(0,0,0,0.15))',
          transition: 'all 0.3s ease'
        }}
        className="opacity-95 transition-opacity"
      />
      {width > 60 && height > 40 && (
        <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8} className="pointer-events-none">
          <div style={{
            color: '#fff',
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontSize: '13px',
            lineHeight: '1.2',
            wordWrap: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            <span style={{ 
               display: '-webkit-box',
               WebkitLineClamp: height > 70 ? 4 : 2,
               WebkitBoxOrient: 'vertical',
               overflow: 'hidden'
            }}>{name}</span>
            {height > 60 && (
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                {props.treeMapType === 'value' ? `R$ ${(props.size || 0).toLocaleString()}` : `${props.size || 0} ${props.treeMapSuffix || 'unid.'}`}
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export const ManagementView = ({ 
  contracts, measurements, quotations, controllerEquipments, controllerTeams, manpowerRecords, employees,
  selectedContractId: propSelectedContractId,
  onUpdateContractId
}: any) => {
  type DetailViewType = 'overview' | 'RC' | 'Equipamentos' | 'RH' | 'Receita' | 'Aporte Financeiro';
  const [activeView, setActiveView] = useState<DetailViewType>('overview');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [rhTreemapMetric, setRhTreemapMetric] = useState<'count' | 'value'>('count');
  const [eqTreemapMetric, setEqTreemapMetric] = useState<'count' | 'value'>('count');
  const [localSelectedContractId, setLocalSelectedContractId] = useState<string>('all');
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId = onUpdateContractId || setLocalSelectedContractId;

  const stats = useMemo(() => {
    const filteredMeasurements = selectedContractId === 'all' 
      ? measurements 
      : measurements?.filter((m: any) => m.contractId === selectedContractId);

    const equipments = (controllerEquipments || []).filter((e: any) => !e.situation || e.situation === 'Ativo');
    const rh = (employees || []).filter((e: any) => e.status === 'active' || e.status === 'Ativo' || !e.status);

    const equipmentCost = equipments.reduce((acc: number, e: any) => acc + (e.monthlyPrice || e.contractedPrice || 0), 0);
    const rhCost = rh.reduce((acc: number, e: any) => acc + (e.salary || 0), 0);
    
    let revenue = 0;
    const revenueDetails: any[] = [];

    (filteredMeasurements || []).forEach((m: any) => {
      let mTotal = 0;
      const contract = (contracts || []).find((c: any) => c.id === m.contractId);
      const quotation = (quotations || []).find((q: any) => q.id === contract?.quotationId);
      
      const priceMap = new Map<string, number>();
      
      const addPrices = (items: any[]) => {
        for (const item of items || []) {
          if (item.price) priceMap.set(item.serviceId || item.code, item.price);
        }
      };
      
      addPrices(quotation?.services || []);
      (quotation?.groups || []).forEach((g: any) => addPrices(g.services || []));
      addPrices(contract?.services || []);
      (contract?.groups || []).forEach((g: any) => addPrices(g.services || []));

      (m.items || []).forEach((item: any) => {
         mTotal += (item.quantity || 0) * (priceMap.get(item.serviceId) || 0);
      });

      revenue += mTotal;
      revenueDetails.push({ name: `${contract?.contractNumber || 'Sem Contrato'} - ${m.period}`, value: mTotal });
    });

    const aporte = Math.max(0, (equipmentCost + rhCost) - revenue);

    return { 
      equipmentCost, 
      rhCost, 
      revenue,
      aporte,
      details: {
        'Equipamentos': equipments.map((e: any) => ({ name: e.name, value: e.monthlyPrice || e.contractedPrice || 0, meta: e })),
        'RH': rh.map((e: any) => ({ name: e.name, value: e.salary, meta: e })),
        'Receita': revenueDetails,
        'Aporte Financeiro': [{ name: 'Valor de Aporte Necessário', value: aporte }]
      }
    };
  }, [controllerEquipments, employees, measurements, contracts, quotations, selectedContractId]);

  const data = [
    { name: 'Equipamentos', value: stats.equipmentCost, color: '#3b82f6' },
    { name: 'RH', value: stats.rhCost, color: '#10b981' },
    { name: 'Receita', value: stats.revenue, color: '#f59e0b' },
    { name: 'Aporte Financeiro', value: stats.aporte, color: '#ef4444' },
  ];

  const handleChartClick = (name: string) => {
    setActiveView(name as DetailViewType);
  };

  if (activeView === 'RH') {
    const rhData = stats.details['RH'] || [];
    const roleStatsMap = new Map<string, { count: number; value: number }>();
    rhData.forEach((item: any) => {
       const role = item.meta?.role || 'Não Informado';
       const current = roleStatsMap.get(role) || { count: 0, value: 0 };
       current.count += 1;
       current.value += (item.value || 0);
       roleStatsMap.set(role, current);
    });
    const rolesTreemapData = Array.from(roleStatsMap.entries()).map(([name, stats]) => ({
       name,
       size: rhTreemapMetric === 'count' ? stats.count : Math.round(stats.value),
       count: stats.count,
       value: stats.value
    })).filter(x => x.size > 0).sort((a,b) => b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size);

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('overview')} className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
             </button>
             <h1 className="text-2xl font-bold">Gestão Global - Detalhamento RH</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="shadow-lg border-t-4 border-emerald-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <Users className="w-4 h-4" /> Total de Colaboradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">{rhData.length}</div>
                </CardContent>
             </Card>
             <Card className="shadow-lg border-t-4 border-emerald-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <TrendingUp className="w-4 h-4" /> Custo Total (Salários)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    R$ {stats.rhCost.toLocaleString()}
                  </div>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between items-start">
                   <div className="space-y-2">
                      <CardTitle>Colaboradores por Função</CardTitle>
                      <div className="flex gap-2">
                         <button 
                             onClick={() => setRhTreemapMetric('count')}
                             className={`text-xs px-2 py-1 rounded-md transition-colors ${rhTreemapMetric === 'count' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                         >
                             Quantidade
                         </button>
                         <button 
                             onClick={() => setRhTreemapMetric('value')}
                             className={`text-xs px-2 py-1 rounded-md transition-colors ${rhTreemapMetric === 'value' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                         >
                             Valor
                         </button>
                      </div>
                   </div>
                   {selectedRoleFilter && (
                     <button onClick={() => setSelectedRoleFilter(null)} className="text-xs text-blue-600 hover:underline">
                        Limpar Filtro
                     </button>
                   )}
                </CardHeader>
                <CardContent className="h-[600px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                         data={rolesTreemapData}
                         dataKey="size"
                         aspectRatio={4/3}
                         stroke="#fff"
                         isAnimationActive={false}
                         content={
                           <CustomTreemapContent 
                              treeMapType={rhTreemapMetric} 
                              treeMapSuffix="func." 
                              activeFilter={selectedRoleFilter}
                              onClick={(name: string) => setSelectedRoleFilter(name === selectedRoleFilter ? null : name)} 
                           />
                         }
                      >
                         <Tooltip 
                            wrapperStyle={{fontFamily: 'Arial', fontSize: 12}}
                            formatter={(value: any) => rhTreemapMetric === 'value' ? `R$ ${(value || 0).toLocaleString()}` : `${value || 0} func.`}
                         />
                      </Treemap>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
             
             <Card className="shadow-lg flex flex-col">
                <CardHeader>
                   <CardTitle>{selectedRoleFilter ? `Colaboradores (${selectedRoleFilter})` : 'Lista de Colaboradores'}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[600px]">
                   <Table>
                     <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead className="text-right">Salário</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {rhData
                           .filter((item: any) => !selectedRoleFilter || (item.meta?.role || 'Não Informado') === selectedRoleFilter)
                           .map((item: any, idx: number) => (
                          <TableRow key={idx}>
                             <TableCell className="font-medium">{item.name}</TableCell>
                             <TableCell>{item.meta?.role || '-'}</TableCell>
                             <TableCell className="text-right">R$ {(item.value || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </div>
      </div>
    );
  }

  if (activeView === 'Equipamentos') {
    const eqData = stats.details['Equipamentos'] || [];
    
    const typeStatsMap = new Map<string, { count: number; value: number }>();
    eqData.forEach((item: any) => {
       const t = item.meta?.category || item.meta?.type || 'Não Informado';
       const current = typeStatsMap.get(t) || { count: 0, value: 0 };
       current.count += 1;
       current.value += (item.value || 0);
       typeStatsMap.set(t, current);
    });
    const typeTreemapData = Array.from(typeStatsMap.entries()).map(([name, stats]) => ({
       name,
       size: eqTreemapMetric === 'count' ? stats.count : Math.round(stats.value),
       count: stats.count,
       value: stats.value
    })).filter(x => x.size > 0).sort((a,b) => b.size === a.size ? a.name.localeCompare(b.name) : b.size - a.size);

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('overview')} className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
             </button>
             <h1 className="text-2xl font-bold">Gestão Global - Detalhamento Equipamentos</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="shadow-lg border-t-4 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <HardHat className="w-4 h-4" /> Total de Equipamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{eqData.length}</div>
                </CardContent>
             </Card>
             <Card className="shadow-lg border-t-4 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <TrendingUp className="w-4 h-4" /> Custo Total (Mensal)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    R$ {stats.equipmentCost.toLocaleString()}
                  </div>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between items-start">
                   <div className="space-y-2">
                      <CardTitle>Equipamentos por Categoria</CardTitle>
                      <div className="flex gap-2">
                         <button 
                             onClick={() => setEqTreemapMetric('count')}
                             className={`text-xs px-2 py-1 rounded-md transition-colors ${eqTreemapMetric === 'count' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                         >
                             Quantidade
                         </button>
                         <button 
                             onClick={() => setEqTreemapMetric('value')}
                             className={`text-xs px-2 py-1 rounded-md transition-colors ${eqTreemapMetric === 'value' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                         >
                             Valor Mensal
                         </button>
                      </div>
                   </div>
                   {selectedTypeFilter && (
                     <button onClick={() => setSelectedTypeFilter(null)} className="text-xs text-blue-600 hover:underline">
                        Limpar Filtro
                     </button>
                   )}
                </CardHeader>
                <CardContent className="h-[600px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                         data={typeTreemapData}
                         dataKey="size"
                         aspectRatio={4/3}
                         stroke="#fff"
                         isAnimationActive={false}
                         content={
                           <CustomTreemapContent 
                              treeMapType={eqTreemapMetric} 
                              treeMapSuffix="equip." 
                              activeFilter={selectedTypeFilter}
                              onClick={(name: string) => setSelectedTypeFilter(name === selectedTypeFilter ? null : name)} 
                           />
                         }
                      >
                         <Tooltip 
                            wrapperStyle={{fontFamily: 'Arial', fontSize: 12}}
                            formatter={(value: any) => eqTreemapMetric === 'value' ? `R$ ${(value || 0).toLocaleString()}` : `${value || 0} equip.`}
                         />
                      </Treemap>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
             
             <Card className="shadow-lg flex flex-col">
                <CardHeader>
                   <CardTitle>{selectedTypeFilter ? `Equipamentos (${selectedTypeFilter})` : 'Lista de Equipamentos'}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[600px]">
                   <Table>
                     <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Custo Mensal</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {eqData
                           .filter((item: any) => !selectedTypeFilter || (item.meta?.category || item.meta?.type || 'Não Informado') === selectedTypeFilter)
                           .map((item: any, idx: number) => (
                          <TableRow key={idx}>
                             <TableCell className="font-medium">{item.name}</TableCell>
                             <TableCell>{item.meta?.category || item.meta?.type || '-'}</TableCell>
                             <TableCell className="text-right">R$ {(item.value || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </div>
      </div>
    );
  }

  if (activeView === 'Receita') {
    const revData = stats.details['Receita'] || [];
    
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('overview')} className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
             </button>
             <h1 className="text-2xl font-bold">Gestão Global - Detalhamento de Receita</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="shadow-lg border-t-4 border-amber-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <Landmark className="w-4 h-4" /> Receita Total Apurada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    R$ {stats.revenue.toLocaleString()}
                  </div>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <Card className="shadow-lg flex flex-col">
                <CardHeader>
                   <CardTitle>Histórico de Medições</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[400px]">
                   <Table>
                     <TableHeader>
                        <TableRow>
                          <TableHead>Contrato e Período</TableHead>
                          <TableHead className="text-right">Valor Medido</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {revData.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                             <TableCell className="font-medium">{item.name}</TableCell>
                             <TableCell className="text-right text-emerald-600 font-bold">R$ {(item.value || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </div>
      </div>
    );
  }

  if (activeView === 'Aporte Financeiro') {
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('overview')} className="p-2 bg-white rounded-full shadow hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
             </button>
             <h1 className="text-2xl font-bold">Gestão Global - Detalhamento de Aporte Financeiro</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="shadow-lg border-t-4 border-red-500">
                <CardHeader>
                  <CardTitle className="text-base uppercase text-slate-500 flex items-center gap-2">
                     <TrendingUp className="w-4 h-4" /> Aporte Estimado Necessário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    R$ {stats.aporte.toLocaleString()}
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Fórmula base: Diferença entre os custos fixos (Equipamentos + RH) e a Receita Medida apurada e processada.
                  </p>
                </CardContent>
             </Card>
          </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão Global</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {data.map((item) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
            onClick={() => handleChartClick(item.name)}
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4" style={{borderTopColor: item.color}}>
              <CardHeader>
                <CardTitle className="text-base uppercase text-slate-500">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: item.color }}>
                  R$ {(item.value ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg border-t-4 border-slate-900">
          <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">Visão Geral (Composto)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} onClick={(e) => e && handleChartClick(String(e.activeLabel || ''))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontFamily: 'Arial', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{fontFamily: 'Arial', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  formatter={(value: number) => `R$ ${(value ?? 0).toLocaleString()}`} 
                  wrapperStyle={{fontFamily: 'Arial', fontSize: 12}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-t-4 border-slate-900">
          <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">Distribuição (Pizza)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={5}
                    fill="#8884d8" 
                    isAnimationActive={false}
                    onClick={(e) => handleChartClick(e.name)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${(value ?? 0).toLocaleString()}`} wrapperStyle={{fontFamily: 'Arial', fontSize: 12}} />
                <Legend iconType="circle" wrapperStyle={{fontFamily: 'Arial', fontSize: 12}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
