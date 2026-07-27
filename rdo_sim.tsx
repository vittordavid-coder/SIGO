        {/* ==================== 8. RDO SIMULATION ==================== */}
        {activeSim === 'rdo' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Relatório Diário de Obra</p>
                  </div>
                  <div className="relative">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      Novo RDO
                    </button>
                    {step === 0 && (
                      <motion.div 
                        initial={{ x: 120, y: 150 }}
                        animate={{ x: [120, 20], y: [150, 10] }}
                        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                        className="absolute pointer-events-none text-blue-600 drop-shadow-md z-30"
                        style={{ right: '10px', top: '10px' }}
                      >
                        <MousePointer className="w-6 h-6 fill-current" />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex-1 mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col relative shadow-sm">
                  <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4">
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                    <div className="flex-1"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded"></div>
                  </div>
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 border-b border-slate-100 flex items-center px-4 gap-4 relative">
                      <div className="w-24 h-4 bg-slate-100 rounded"></div>
                      <div className="w-40 h-4 bg-slate-100 rounded"></div>
                      <div className="flex-1"></div>
                      <div className="w-24 h-6 bg-slate-50 border border-slate-100 rounded-full"></div>
                      
                      {i === 1 && step >= 6 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                        />
                      )}
                    </div>
                  ))}
                  
                  {step >= 6 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 z-10"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      RDO assinado com sucesso.
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Diário de Obra - 15/08/2026
                    </span>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                    
                    {/* Condições Climáticas */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Condições Climáticas</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step >= 2 ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Manhã</span>
                          <span className={`text-xs font-black ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>{typedInputs.climaM || '---'}</span>
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step >= 2 ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Tarde</span>
                          <span className={`text-xs font-black ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>{typedInputs.climaT || '---'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Efetivo */}
                    <div className={`space-y-2 transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efetivo de Produção</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`h-10 rounded-lg border flex items-center justify-between px-3 transition-colors ${step === 3 ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="text-xs font-bold text-slate-600">Mão de Obra Direta</span>
                          <span className="text-sm font-black text-slate-800">{typedInputs.efetivo || '0'}</span>
                          {step === 3 && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-0.5 h-4 bg-blue-500 absolute right-4" />}
                        </div>
                        <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between px-3 opacity-60">
                          <span className="text-xs font-bold text-slate-600">Equipamentos</span>
                          <span className="text-sm font-black text-slate-800">12</span>
                        </div>
                      </div>
                    </div>

                    {/* Relato */}
                    <div className={`space-y-2 transition-opacity duration-300 ${step >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Relatório Diário</h5>
                      <div className={`p-3 rounded-lg border h-24 overflow-hidden relative transition-colors ${step === 4 ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50'}`}>
                         <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap">{typedInputs.relato}</p>
                         {step === 4 && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block w-0.5 h-3 bg-blue-500 align-middle ml-1" />}
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button className="px-4 py-1.5 font-bold text-slate-500 text-sm">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm text-sm transition-all ${step === 5 ? 'ring-4 ring-blue-100 scale-105' : ''}`}>
                      Assinar e Finalizar
                    </button>
                    {step === 5 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        className="absolute right-8 bottom-6 z-30 pointer-events-none"
                      >
                        <MousePointer className="w-6 h-6 text-blue-600 fill-current drop-shadow-md" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
