const fs = require('fs');
let code = fs.readFileSync('src/components/RHView.tsx', 'utf-8');

const campoTab = `
        <TabsContent value="campo">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Apontamentos de Campo (Synera Mobile)</h3>
            </div>
            
            {pendingFieldMovements.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                <Smartphone className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900">Nenhum apontamento pendente</h4>
                <p className="text-gray-500">Os registros enviados do campo aparecerão aqui para aprovação.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingFieldMovements.map(mov => (
                  <Card key={mov.id} className="border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-50/50 p-4 border-b border-gray-100 flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-blue-900 mb-1">{mov.contractName}</div>
                        <div className="text-xs text-blue-600 font-medium">Por: {mov.responsibleUser} • {new Date(mov.timestamp).toLocaleString('pt-BR')}</div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Pendente</Badge>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 font-medium whitespace-pre-line">{mov.description}</p>
                        {mov.details?.notes && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 italic border border-gray-100">
                            "{mov.details.notes}"
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white"
                          onClick={() => {
                            if (onUpdateWorkMovements) {
                              const updated = workMovements.map(m => 
                                m.id === mov.id ? { ...m, details: { ...m.details, status: 'approved' } } : m
                              );
                              onUpdateWorkMovements(updated);
                              // Here it should theoretically also update the timeRecords or employee data
                            }
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" /> Aprovar
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => {
                            if (onUpdateWorkMovements) {
                              const updated = workMovements.map(m => 
                                m.id === mov.id ? { ...m, details: { ...m.details, status: 'rejected' } } : m
                              );
                              onUpdateWorkMovements(updated);
                            }
                          }}
                        >
                          <X className="w-4 h-4 mr-2" /> Rejeitar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
`;

code = code.replace("      </Tabs>\n      ) : (", campoTab + "\n      </Tabs>\n      ) : (");
fs.writeFileSync('src/components/RHView.tsx', code);
