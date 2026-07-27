        {/* ==================== 7. PLUVIOMETRIA SIMULATION ==================== */}
        {activeSim === 'pluviometria' && (
          <div className="w-full h-full flex flex-col justify-between text-left">
            {! (step > 0 && step < 6) ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">{currentConfig.pageTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Controle diário de chuvas</p>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black shadow-sm border border-slate-200">
                      <Calendar className="w-3.5 h-3.5" />
                      Agosto 2026
                    </div>
                  </div>
                </div>

                <div className="flex-1 mt-4 overflow-hidden relative flex flex-col">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 flex-1">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const day = i + 1;
                      // Just simulating month of August starting on Sat
                      const isTargetDay = day === 15;
                      const hasRain = day === 5 || day === 12;
                      
                      return (
                        <div 
                          key={day} 
                          className={`
                            border rounded-lg relative flex flex-col items-center justify-center
                            ${isTargetDay && step === 0 ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'bg-white border-slate-200'}
                            ${hasRain ? 'bg-blue-50' : ''}
                            ${step >= 6 && isTargetDay ? 'bg-amber-50 border-amber-200' : ''}
                          `}
                        >
                          <span className="text-sm font-bold text-slate-700">{day}</span>
                          {hasRain && <div className="text-[10px] font-black text-blue-600 mt-1">12mm</div>}
                          {step >= 6 && isTargetDay && <div className="text-[10px] font-black text-amber-600 mt-1">{typedInputs.chuva || '35'}mm</div>}
                          
                          {/* Animated pointer on the specific day */}
                          {isTargetDay && step === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="absolute top-1/2 left-1/2"
                            >
                              <MousePointer className="w-6 h-6 text-blue-600 fill-current drop-shadow-md z-30" />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      Registro: 15 de Agosto
                    </span>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4">
                    {/* Volume de Chuvas */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Precipitação (mm)
                      </label>
                      <div className={`
                        w-full h-11 px-4 rounded-xl border flex items-center justify-between font-extrabold text-lg
                        transition-all duration-300
                        ${step === 2 ? 'border-blue-500 bg-blue-50/20 ring-4 ring-blue-100' : 'border-slate-200 bg-slate-50'}
                      `}>
                        <span className={typedInputs.chuva ? 'text-slate-800' : 'text-slate-400'}>
                          {typedInputs.chuva || '0'}
                        </span>
                        <span className="text-slate-400 text-sm">mm</span>
                        
                        {step === 2 && (
                          <motion.div 
                            animate={{ opacity: [1, 0, 1] }} 
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-0.5 h-6 bg-blue-500 absolute left-8"
                          />
                        )}
                      </div>
                    </div>

                    {/* Impacto */}
                    <div className={`space-y-1.5 transition-all duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Impacto Operacional
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Trabalhável' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Trabalhável' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Trabalhável' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Trabalhável' ? 'text-emerald-800' : 'text-slate-600'}`}>Trabalhável</span>
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Parcial' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'} ${step === 3 ? 'ring-2 ring-amber-200' : ''}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Parcial' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Parcial' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Parcial' ? 'text-amber-800' : 'text-slate-600'}`}>Parcialmente Improdutivo</span>
                          {step === 3 && (
                             <motion.div 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               className="absolute right-6"
                             >
                               <MousePointer className="w-5 h-5 text-blue-600 fill-current drop-shadow-sm" />
                             </motion.div>
                          )}
                        </div>
                        <div className={`h-10 rounded-lg border flex items-center px-3 transition-colors ${typedInputs.impacto === 'Improdutivo' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${typedInputs.impacto === 'Improdutivo' ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>
                            {typedInputs.impacto === 'Improdutivo' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={`text-xs font-bold ${typedInputs.impacto === 'Improdutivo' ? 'text-rose-800' : 'text-slate-600'}`}>Improdutivo</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button className="px-4 py-2 font-bold text-slate-500 text-sm">Cancelar</button>
                    <button className={`px-5 py-2 text-white font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm text-sm transition-all ${step === 4 ? 'ring-4 ring-blue-100 scale-105' : ''}`}>
                      Salvar Registro
                    </button>
                    {step === 4 && (
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
