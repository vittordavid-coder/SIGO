import React from 'react';
import { motion } from 'motion/react';
import { Calculator, Percent, Info, Save } from 'lucide-react';
import { BDIConfig } from '../types';
import { calculateBDI } from '../lib/calculations';
import { formatNumber } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface BDIViewProps {
  key?: string;
  bdiConfig: BDIConfig;
  setBdiConfig: (config: BDIConfig) => void;
}

export function BDIView({ bdiConfig, setBdiConfig }: BDIViewProps) {
  const bdiValue = calculateBDI(bdiConfig);

  const handleChange = (field: keyof BDIConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBdiConfig({
      ...bdiConfig,
      [field]: numValue
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cálculo de BDI</h2>
          <p className="text-gray-500">Benefícios e Despesas Indiretas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Parâmetros do BDI
            </CardTitle>
            <CardDescription>
              Insira os percentuais para cada componente do BDI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Custos Indiretos e Riscos</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="ac">Administração Central (AC)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.ac}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="ac"
                      type="number"
                      step="0.01"
                      value={bdiConfig.ac}
                      onChange={(e) => handleChange('ac', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="s">Seguros (S)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.s}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="s"
                      type="number"
                      step="0.01"
                      value={bdiConfig.s}
                      onChange={(e) => handleChange('s', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="r">Riscos (R)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.r}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="r"
                      type="number"
                      step="0.01"
                      value={bdiConfig.r}
                      onChange={(e) => handleChange('r', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="g">Garantias (G)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.g}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="g"
                      type="number"
                      step="0.01"
                      value={bdiConfig.g}
                      onChange={(e) => handleChange('g', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Financeiro, Lucro e Impostos</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="df">Despesas Financeiras (DF)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.df}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="df"
                      type="number"
                      step="0.01"
                      value={bdiConfig.df}
                      onChange={(e) => handleChange('df', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="l">Lucro (L)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.l}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="l"
                      type="number"
                      step="0.01"
                      value={bdiConfig.l}
                      onChange={(e) => handleChange('l', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="i">Impostos (I)</Label>
                    <span className="text-xs text-gray-400 font-mono">{bdiConfig.i}%</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="i"
                      type="number"
                      step="0.01"
                      value={bdiConfig.i}
                      onChange={(e) => handleChange('i', e.target.value)}
                      className="pr-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Soma de PIS, COFINS, ISS, etc.</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-bold mb-1">Fórmula Utilizada:</p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                  BDI = (((1 + AC + S + R + G) * (1 + DF) * (1 + L)) / (1 - I)) - 1
                </code>
                <p className="mt-2 text-xs">
                  Esta fórmula é a recomendada pelo TCU (Tribunal de Contas da União) para obras públicas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Percent className="w-24 h-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-blue-100 text-sm uppercase tracking-widest">BDI Calculado</CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="text-5xl font-black mb-2">
                {formatNumber(bdiValue, 2)}%
              </div>
              <p className="text-blue-100 text-sm">
                Este percentual será aplicado sobre o custo direto de todas as composições.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Exemplo de Aplicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Custo Direto:</span>
                <span className="font-mono">R$ 100,00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">BDI ({formatNumber(bdiValue, 2)}%):</span>
                <span className="font-mono text-blue-600">+ R$ {formatNumber(bdiValue, 2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Preço de Venda:</span>
                <span className="text-blue-700">R$ {formatNumber(100 + bdiValue, 2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
