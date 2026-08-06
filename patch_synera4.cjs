const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const regex = /<div className="space-y-3">\s*\{\/\* DESCRIÇÃO DA FOTO \*\/\}[\\s\\S]*?Usar GPS \(\{nearestStationInfo\.station\}\)\n\s*<\/button>\n\s*\)\}\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/;

const replacement = `              <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-2xl mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Descrição e Estaca</span>
                  <span className="text-xs text-white truncate max-w-[200px]">
                    {photoDescription || photoStation ? (
                      <>{photoStation ? \`[\${photoStation}] \` : ''}{photoDescription || 'Sem descrição'}</>
                    ) : (
                      'Toque para adicionar informações...'
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setShowStampInfoModal(true)}
                  className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
