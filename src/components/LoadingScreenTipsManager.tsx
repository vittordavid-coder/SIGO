import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Zap, HardHat, Layers, ShieldCheck, Database, Info, Plus, Trash2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LoadingScreenTipsManager({ systemConfig, onSystemConfigChange }: { systemConfig: any[], onSystemConfigChange: (val: any[]) => void }) {
  const defaultTips = [
    { title: "Apontamentos de Campo & Estacas", text: "Registros vinculados ao alinhamento de estacas e coordenadas GPS aceleram a aprovação e pagamento de medições.", tag: "Campo & Sala Técnica", iconName: "HardHat" }
  ];
  
  const currentTipsConfig = systemConfig.find(c => c.configKey === 'loading_screen_tips');
  const [tips, setTips] = useState<{ title: string; text: string; tag: string; iconName: string }[]>(currentTipsConfig?.configValue || defaultTips);

  const addTip = () => {
    setTips([...tips, { title: '', text: '', tag: 'Geral', iconName: 'Info' }]);
  };

  const updateTip = (idx: number, field: string, val: string) => {
    const newTips = [...tips];
    (newTips[idx] as any)[field] = val;
    setTips(newTips);
  };

  const removeTip = (idx: number) => {
    setTips(tips.filter((_, i) => i !== idx));
  };

  const saveTips = () => {
    const newConfig = systemConfig.filter(c => c.configKey !== 'loading_screen_tips');
    newConfig.push({ configKey: 'loading_screen_tips', configValue: tips });
    onSystemConfigChange(newConfig);
    alert('Dicas da tela de carregamento salvas com sucesso.');
  };

  return (
    <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 mt-6">
      <CardHeader>
        <CardTitle className="text-indigo-800 flex items-center gap-2">
          <Info className="w-5 h-5" /> Personalização: Dicas de Carregamento
        </CardTitle>
        <CardDescription>
          Personalize as mensagens e dicas que aparecem na tela de sincronização (Exclusivo Master).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-3xl">
          {tips.map((tip, idx) => (
            <div key={idx} className="bg-white p-4 border border-indigo-100 rounded-xl shadow-sm space-y-3 relative">
              <button onClick={() => removeTip(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={tip.title} onChange={e => updateTip(idx, 'title', e.target.value)} placeholder="Título da dica" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tag / Categoria</Label>
                  <Input value={tip.tag} onChange={e => updateTip(idx, 'tag', e.target.value)} placeholder="Ex: Mobile Off-line" className="h-8 text-xs" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mr-6">
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Ícone</Label>
                  <Select value={tip.iconName} onValueChange={v => updateTip(idx, 'iconName', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Info">Informação (Info)</SelectItem>
                      <SelectItem value="HardHat">Capacete (HardHat)</SelectItem>
                      <SelectItem value="Layers">Camadas (Layers)</SelectItem>
                      <SelectItem value="Zap">Raio (Zap)</SelectItem>
                      <SelectItem value="ShieldCheck">Segurança (ShieldCheck)</SelectItem>
                      <SelectItem value="Database">Banco de Dados (Database)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs">Texto da Dica</Label>
                  <Textarea value={tip.text} onChange={e => updateTip(idx, 'text', e.target.value)} placeholder="Descrição da dica..." className="min-h-[60px] text-xs resize-none" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={addTip} variant="outline" className="border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Dica
            </Button>
            <Button onClick={saveTips} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Salvar Dicas
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
