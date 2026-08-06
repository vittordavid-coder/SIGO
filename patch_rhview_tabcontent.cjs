const fs = require('fs');
let content = fs.readFileSync('src/components/RHView.tsx', 'utf8');

const targetEnd = `      </Tabs>
    </div>
  );
}`;
const replaceEnd = `        <TabsContent value="campo">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-indigo-600" />
              Apontamentos de Campo (Synera Mobile)
            </h2>
            
            {pendingFieldMovements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-bold text-lg">Tudo em dia!</p>
                <p className="text-sm">Não há novos apontamentos do campo para aprovação.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingFieldMovements.map(movement => (
                  <div key={movement.id} className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-indigo-900">{movement.description}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            Pendente
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Enviado por: {movement.responsibleUser} | {new Date(movement.date).toLocaleString('pt-BR')}
                        </p>
                        {movement.details?.notes && (
                          <p className="text-sm text-slate-700 mt-2 bg-white p-3 rounded-lg border border-indigo-50/50">
                            {movement.details.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            if (onUpdateWorkMovements) {
                              onUpdateWorkMovements(workMovements.map(m => 
                                m.id === movement.id ? { ...m, details: { ...m.details, status: 'rejected' } } : m
                              ));
                            }
                          }}
                          variant="outline"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Recusar
                        </Button>
                        <Button
                          onClick={() => {
                            if (onUpdateWorkMovements) {
                              onUpdateWorkMovements(workMovements.map(m => 
                                m.id === movement.id ? { ...m, details: { ...m.details, status: 'approved' } } : m
                              ));
                              // Here it should update time records!
                              // But for now we just mark as approved
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}`;

content = content.replace(targetEnd, replaceEnd);
fs.writeFileSync('src/components/RHView.tsx', content);
console.log('Patched RHView for Campo TabContent');
