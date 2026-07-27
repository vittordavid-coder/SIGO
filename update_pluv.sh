#!/bin/bash

# Extract parts before, table content, and after from TechnicalRoomExtensions.tsx
awk 'NR<747' src/components/TechnicalRoomExtensions.tsx > pt1.txt

cat << 'INNER' > pt2.txt
          <TabsTrigger value="table" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
            <Calendar className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2 rounded-lg font-black uppercase text-xs tracking-widest px-4 py-2">
            <Activity className="w-4 h-4" /> Gráfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-2xl p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Dê um duplo-clique em um dia para editar</p>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 flex-1">
                {(() => {
                  const firstDayDate = new Date(currentYear, currentMonth, 1);
                  const startOffset = firstDayDate.getDay(); 
                  const cells = [];
                  for (let i = 0; i < startOffset; i++) {
                    cells.push(<div key={`empty-${i}`} className="border border-transparent rounded-xl p-2 bg-gray-50/50 min-h-[90px]" />);
                  }
                  
                  monthDays.forEach(day => {
                    const record = getRecordForDay(day);
                    const isRainy = (record?.morningStatus === 'Chuvoso' || record?.afternoonStatus === 'Chuvoso');
                    const isImpraticable = (record?.morningStatus === 'Impraticável' || record?.afternoonStatus === 'Impraticável');
                    const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6;
                    
                    let bgClass = "bg-white";
                    let borderClass = "border-gray-200 hover:border-blue-400";
                    if (isImpraticable) {
                      bgClass = "bg-red-50";
                      borderClass = "border-red-200 hover:border-red-400 ring-1 ring-red-100";
                    } else if (isRainy) {
                      bgClass = "bg-blue-50";
                      borderClass = "border-blue-200 hover:border-blue-400 ring-1 ring-blue-100";
                    } else if (isWeekend) {
                      bgClass = "bg-gray-50";
                    }

                    cells.push(
                      <div 
                        key={day} 
                        className={cn(
                          "border rounded-xl relative flex flex-col min-h-[90px] p-2.5 transition-all cursor-pointer group shadow-sm",
                          bgClass, borderClass
                        )}
                        onDoubleClick={() => {
                          if (!readonly) setSelectedDayModal(day);
                        }}
                      >
                        <span className={cn("text-sm font-black", isImpraticable ? "text-red-700" : isRainy ? "text-blue-700" : "text-gray-700")}>{day}</span>
                        <div className="mt-auto space-y-2 w-full">
                           <div className="flex items-center justify-between text-[10px] uppercase font-black text-gray-500">
                             <span>Chuva:</span>
                             <span className={record?.rainfallMm && record.rainfallMm > 0 ? "text-blue-600" : ""}>{record?.rainfallMm || 0}mm</span>
                           </div>
                           <div className="grid grid-cols-3 gap-1 text-center mt-1">
                              <div title={`Noite: ${record?.nightStatus || 'Bom'}`} className={cn("h-1.5 rounded-full shadow-sm", record?.nightStatus === 'Impraticável' ? "bg-red-500" : record?.nightStatus === 'Chuvoso' ? "bg-blue-500" : "bg-emerald-400")} />
                              <div title={`Manhã: ${record?.morningStatus || 'Bom'}`} className={cn("h-1.5 rounded-full shadow-sm", record?.morningStatus === 'Impraticável' ? "bg-red-500" : record?.morningStatus === 'Chuvoso' ? "bg-blue-500" : "bg-emerald-400")} />
                              <div title={`Tarde: ${record?.afternoonStatus || 'Bom'}`} className={cn("h-1.5 rounded-full shadow-sm", record?.afternoonStatus === 'Impraticável' ? "bg-red-500" : record?.afternoonStatus === 'Chuvoso' ? "bg-blue-500" : "bg-emerald-400")} />
                           </div>
                        </div>
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>
          </Card>
        </TabsContent>
INNER

awk 'NR>=857 && NR<=1054' src/components/TechnicalRoomExtensions.tsx > pt3.txt

cat << 'INNER2' > pt4.txt
      </Tabs>

      <Dialog open={selectedDayModal !== null} onOpenChange={(open) => !open && setSelectedDayModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
            <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Editar Dia {selectedDayModal}
            </DialogTitle>
          </div>
          {selectedDayModal !== null && (
            <div className="px-5 py-5">
               {(() => {
                 const record = getRecordForDay(selectedDayModal);
                 return (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Noite Anterior</Label>
                         <Select value={record?.nightStatus || 'Bom'} onValueChange={v => handleUpdate(selectedDayModal, 'nightStatus', v)}>
                           <SelectTrigger className="font-bold h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Bom" className="font-bold text-xs">☀️ Bom</SelectItem>
                             <SelectItem value="Chuvoso" className="font-bold text-xs text-blue-600">🌧️ Chuvoso</SelectItem>
                             <SelectItem value="Impraticável" className="font-bold text-xs text-red-600">🛑 Impraticável</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manhã</Label>
                         <Select value={record?.morningStatus || 'Bom'} onValueChange={v => handleUpdate(selectedDayModal, 'morningStatus', v)}>
                           <SelectTrigger className="font-bold h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Bom" className="font-bold text-xs">☀️ Bom</SelectItem>
                             <SelectItem value="Chuvoso" className="font-bold text-xs text-blue-600">🌧️ Chuvoso</SelectItem>
                             <SelectItem value="Impraticável" className="font-bold text-xs text-red-600">🛑 Impraticável</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tarde</Label>
                         <Select value={record?.afternoonStatus || 'Bom'} onValueChange={v => handleUpdate(selectedDayModal, 'afternoonStatus', v)}>
                           <SelectTrigger className="font-bold h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Bom" className="font-bold text-xs">☀️ Bom</SelectItem>
                             <SelectItem value="Chuvoso" className="font-bold text-xs text-blue-600">🌧️ Chuvoso</SelectItem>
                             <SelectItem value="Impraticável" className="font-bold text-xs text-red-600">🛑 Impraticável</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-1.5 pt-2">
                         <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chuva (mm)</Label>
                         <Input 
                           type="number" 
                           step="0.1" 
                           className="font-black h-11 text-lg rounded-xl bg-white"
                           value={record?.rainfallMm || 0}
                           onChange={e => handleUpdate(selectedDayModal, 'rainfallMm', parseFloat(e.target.value) || 0)}
                         />
                      </div>
                    </div>
                 );
               })()}
            </div>
          )}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wider text-[10px] rounded-xl h-10 px-6 shadow-sm" onClick={() => setSelectedDayModal(null)}>
               Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
INNER2

awk 'NR>1058' src/components/TechnicalRoomExtensions.tsx > pt5.txt

cat pt1.txt pt2.txt pt3.txt pt4.txt pt5.txt > new.tsx

mv new.tsx src/components/TechnicalRoomExtensions.tsx
