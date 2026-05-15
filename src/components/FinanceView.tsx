import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Landmark } from 'lucide-react';

export const FinanceView = ({ contracts, selectedContractId: propSelectedContractId, onUpdateContractId }: any) => {
  const [localSelectedContractId, setLocalSelectedContractId] = useState<string>('all');
  const selectedContractId = propSelectedContractId || localSelectedContractId;
  const setSelectedContractId = onUpdateContractId || setLocalSelectedContractId;
  
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs defaultValue="aportes" className="space-y-4">
        <TabsList className="bg-white border rounded-xl p-1">
          <TabsTrigger value="aportes" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Aportes</TabsTrigger>
          <TabsTrigger value="caixa" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Controle de Caixa</TabsTrigger>
        </TabsList>
        <TabsContent value="aportes">
          <Card>
            <CardHeader>
                <CardTitle>Gestão de Aportes</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-500">Conteúdo para a seção de Aportes será implementado aqui.</p>
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
    </div>
  );
};
