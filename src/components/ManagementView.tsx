import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Landmark } from 'lucide-react';

export const ManagementView = ({ 
  contracts, measurements, controllerEquipments, controllerTeams, manpowerRecords, employees,
  selectedContractId: propSelectedContractId,
  onUpdateContractId
}: any) => {
  const [localSelectedContractId, setLocalSelectedContractId] = useState<string>('all');
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId = onUpdateContractId || setLocalSelectedContractId;

  const [activeDrillDown, setActiveDrillDown] = useState<{title: string, data: any[]} | null>(null);

  const stats = useMemo(() => {
    const filteredMeasurements = selectedContractId === 'all' 
      ? measurements 
      : measurements?.filter((m: any) => m.contractId === selectedContractId);

    const equipments = controllerEquipments || [];
    const rh = employees || [];
    const revenueItems = filteredMeasurements || [];

    const equipmentCost = equipments.reduce((acc: number, e: any) => acc + (e.monthlyCost || 0), 0);
    const rhCost = rh.reduce((acc: number, e: any) => acc + (e.salary || 0), 0);
    const revenue = revenueItems.reduce((acc: number, m: any) => acc + (m.totalValue || 0), 0);

    return { 
      equipmentCost, 
      rhCost, 
      revenue,
      details: {
        'Equipamentos': equipments.map((e: any) => ({ name: e.name, value: e.monthlyCost })),
        'RH': rh.map((e: any) => ({ name: e.name, value: e.salary })),
        'Receita': revenueItems.map((m: any) => ({ name: m.contractName, value: m.totalValue }))
      }
    };
  }, [controllerEquipments, employees, measurements, selectedContractId]);

  const data = [
    { name: 'Equipamentos', value: stats.equipmentCost, color: '#3b82f6' },
    { name: 'RH', value: stats.rhCost, color: '#10b981' },
    { name: 'Receita', value: stats.revenue, color: '#f59e0b' },
  ];

  const handleChartClick = (name: string) => {
    setActiveDrillDown({ title: name, data: stats.details[name as keyof typeof stats.details] || [] });
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão Global</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <CardTitle className="text-sm uppercase text-slate-500">{item.name}</CardTitle>
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  formatter={(value: number) => `R$ ${(value ?? 0).toLocaleString()}`} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
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
                    onClick={(e) => handleChartClick(e.name)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${(value ?? 0).toLocaleString()}`} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!activeDrillDown} onOpenChange={(open) => !open && setActiveDrillDown(null)}>
        <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>Detalhes: {activeDrillDown?.title}</DialogTitle>
           </DialogHeader>
           <div className="max-h-[60vh] overflow-y-auto">
             <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Item</TableHead>
                     <TableHead className="text-right">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDrillDown?.data.map((item, idx) => (
                    <TableRow key={idx}>
                       <TableCell>{item.name}</TableCell>
                       <TableCell className="text-right">R$ {(item.value ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
