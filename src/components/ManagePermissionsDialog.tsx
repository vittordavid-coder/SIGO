import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const handleOpen = () => {
    setLocalSelected(selectedIds || []);
    setOpen(true);
  };

  const handleSave = () => {
    onSave(localSelected);
    setOpen(false);
  };

  return (
    <>
      <div onClick={handleOpen} className="inline-block cursor-pointer">
        {triggerButton}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        title={title}
        description={description}
        footer={
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] h-11 px-8 shadow-lg shadow-blue-100">
            Salvar Alterações
          </Button>
        }
      >
        <ScrollArea className="h-[400px] -mx-1 pr-4">
          <div className="space-y-3">
             {items.map(item => (
                <div key={item.id} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md hover:shadow-blue-50/50 transition-all cursor-pointer" onClick={() => {
                  if (localSelected.includes(item.id)) {
                    setLocalSelected(localSelected.filter(id => id !== item.id));
                  } else {
                    setLocalSelected([...localSelected, item.id]);
                  }
                }}>
                  <div className="flex flex-col pr-4 overflow-hidden">
                    <span className="font-black text-xs text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</span>
                    {item.subtitle && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate mt-0.5">{item.subtitle}</span>}
                  </div>
                  <Checkbox 
                    checked={localSelected.includes(item.id)}
                    className="h-5 w-5 rounded-lg border-gray-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
               <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                 <div className="p-4 bg-gray-50 rounded-3xl">
                   <Checkbox disabled className="h-8 w-8 rounded-xl opacity-20" />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-widest">{emptyMessage || "Nenhum item disponível."}</p>
               </div>
             )}
          </div>
        </ScrollArea>
      </Modal>
    </>
  );
}
