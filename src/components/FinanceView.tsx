import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Landmark } from 'lucide-react';

export const FinanceView = ({ contracts }: any) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('all');
  
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-2xl border border-blue-100">
          <Landmark className="w-5 h-5 text-blue-600 ml-2" />
          <div className="space-y-0.5">
            <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Selecionar Obra / Contrato</Label>
            <Select value={selectedContractId || 'all'} onValueChange={setSelectedContractId}>
              <SelectTrigger className="w-[450px] h-10 bg-white border-blue-200 rounded-xl font-bold text-blue-900 ring-offset-blue-50">
                <SelectValue>
                  {selectedContractId === 'all'
                    ? "Todos os Contratos"
                    : contracts?.find((c: any) => c.id === selectedContractId)?.workName || "Selecione um contrato"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80 rounded-xl border-blue-100">
                <SelectItem value="all" className="font-bold">Todos os Contratos</SelectItem>
                {contracts?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} textValue={c.workName} className="font-medium">
                    {c.workName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
