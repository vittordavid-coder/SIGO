import sys

with open('src/components/SyneraMobileView.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '{capturedPhotoUrl ? (' in line:
        new_lines.append("""              <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-2xl mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Descrição e Estaca</span>
                  <span className="text-xs text-white truncate max-w-[200px]">
                    {photoDescription || photoStation ? (
                      <>{photoStation ? `[${photoStation}] ` : ''}{photoDescription || 'Sem descrição'}</>
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
              </div>
""")
    new_lines.append(line)

with open('src/components/SyneraMobileView.tsx', 'w') as f:
    f.writelines(new_lines)
