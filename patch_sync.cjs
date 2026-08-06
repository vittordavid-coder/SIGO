const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `                  {offlineQueue.length > 0 && (
                <button onClick={() => setActiveSector(null)} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  )}`;

const replacement = `                  {offlineQueue.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 mt-4">
                      <Button
                        onClick={handleProcessSync}
                        disabled={isSyncing || !isOnline}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider"
                      >
                        {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}
                      </Button>
                    </div>
                  )}

                  {syncHistory.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-700/60">
                      <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Histórico de Sincronização
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {syncHistory.map(hist => (
                          <div key={hist.id} className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-start gap-2 text-xs">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                              {hist.action === 'upload' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{hist.details}</p>
                              <span className="text-[10px] text-slate-500">{new Date(hist.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button onClick={() => setActiveSector(null)} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched syncHistory');
} else {
  console.log('Target not found');
}
