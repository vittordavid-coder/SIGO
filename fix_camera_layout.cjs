const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const regex = /\{\/\* DESCRIÇÃO DA FOTO \*\/\}[\s\S]*?\{\/\* DISPARADOR DE CAPTURA \/ SALVAR \*\/\}[\s\S]*?\{capturedPhotoUrl \? \(/;

const replace = `
              {capturedPhotoUrl ? (
                <div className="space-y-3">
                  {/* DESCRIÇÃO DA FOTO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        Descrição / Observação da Foto *
                      </label>
                      <span className="text-[10px] text-slate-400">Obrigatório</span>
                    </div>
                    <Input
                      value={photoDescription}
                      onChange={e => setPhotoDescription(e.target.value)}
                      placeholder="Escreva a descrição (ex: Concretagem, armadura, patologia...)"
                      className="bg-slate-900 border-slate-700 text-xs text-white placeholder-slate-500 rounded-xl h-10"
                    />
                  </div>

                  {/* ESTACA IDENTIFICADA */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase">Estaca Calculada / Informada:</label>
                      <Input
                        value={photoStation}
                        onChange={e => setPhotoStation(e.target.value)}
                        placeholder="Ex: Estaca 10+15,00"
                        className="bg-slate-900 border-slate-700 text-xs text-emerald-400 font-bold rounded-xl h-9"
                      />
                    </div>
                    {nearestStationInfo && (
                      <button
                        onClick={() => setPhotoStation(nearestStationInfo.station)}
                        className="mt-4 px-2.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold"
                      >
                        Usar GPS ({nearestStationInfo.station})
                      </button>
                    )}
                  </div>
`;

content = content.replace(regex, replace);
fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log("Fixed camera layout");
