import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface ManagePermissionsDialogProps {
  title: string;
  description: string | React.ReactNode;
  items: { id: string; title: string; subtitle?: string }[];
  selectedIds: string[];
  onSave: (newIds: string[]) => void;
  triggerButton: React.ReactNode;
  emptyMessage?: string;
}

export function ManagePermissionsDialog({
  title, description, items, selectedIds, onSave, triggerButton, emptyMessage
}: ManagePermissionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setLocalSelected(selectedIds || []);
    }
  };

  const handleSave = () => {
    onSave(localSelected);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild><div>{description}</div></DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] mt-4 pr-4">
          <div className="space-y-2">
             {items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col pr-4">
                    <span className="font-medium text-sm">{item.title}</span>
                    {item.subtitle && <span className="text-[10px] text-gray-500 italic truncate max-w-[250px]">{item.subtitle}</span>}
                  </div>
                  <Checkbox 
                    checked={localSelected.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLocalSelected([...localSelected, item.id]);
                      } else {
                        setLocalSelected(localSelected.filter(id => id !== item.id));
                      }
                    }}
                  />
                </div>
             ))}
             {items.length === 0 && (
               <div className="text-center py-10 text-gray-400 text-sm">
                 {emptyMessage || "Nenhum item disponível."}
               </div>
             )}
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
