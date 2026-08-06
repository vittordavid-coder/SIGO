const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

// 1. Add state
code = code.replace(
  /const \[showStampSettingsModal, setShowStampSettingsModal\] = useState<boolean>\(false\);/,
  "const [showStampSettingsModal, setShowStampSettingsModal] = useState<boolean>(false);\n  const [showStampInfoModal, setShowStampInfoModal] = useState<boolean>(false);"
);

// 2. Remove HUD overlay
const hudRegex = /\{\/\* Overlay Info Vivo no Viewfinder \(Estilo aplicativo de câmera profissional HUD\) \*\/\}[\\s\\S]*?<\/div>\n\s*<\/>/;
code = code.replace(hudRegex, '</>');

// 3. Replace bottom bar inputs with a button
const inputsRegex = /<div className="space-y-3">\s*\{\/\* DESCRIÇÃO DA FOTO \*\/\}[\\s\\S]*?<\/div>\n\s*\{\/\* ESTACA IDENTIFICADA \*\/\}[\\s\\S]*?<\/div>\n\s*<\/div>/;

const replacementButton = `
              <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-3 rounded-2xl">
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
              </div>
`;

code = code.replace(inputsRegex, replacementButton.trim());

// 4. Add the new modal definition
const modalCode = `
      {/* ==================================================== */}
      {/* MODAL DE INFORMAÇÕES DA FOTO (ESTACA E DESCRIÇÃO)  */}
      {/* ==================================================== */}
      <Dialog open={showStampInfoModal} onOpenChange={setShowStampInfoModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-3xl p-5">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-black text-emerald-400 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-400" />
              Informações da Foto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                Descrição / Observação *
              </label>
              <Input
                value={photoDescription}
                onChange={e => setPhotoDescription(e.target.value)}
                placeholder="Ex: Concretagem, armadura..."
                className="bg-slate-950 border-slate-800 text-sm text-white placeholder-slate-500 rounded-xl h-12"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                Estaca Calculada / Informada
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={photoStation}
                  onChange={e => setPhotoStation(e.target.value)}
                  placeholder="Ex: Estaca 10+15,00"
                  className="bg-slate-950 border-slate-800 text-sm text-emerald-400 font-bold rounded-xl h-12 flex-1"
                />
                {nearestStationInfo && (
                  <button
                    onClick={() => setPhotoStation(nearestStationInfo.station)}
                    className="h-12 px-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold"
                  >
                    Usar GPS
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={() => setShowStampInfoModal(false)}
              className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
`;

// Insert it right before the stamp settings modal
code = code.replace(
  /\{\/\* ==================================================== \*\/\}\n\s*\{\/\* MODAL DE CONFIGURAÇÃO DO CARIMBO TÉCNICO DE FOTO \*\/\}/,
  match => modalCode.trim() + '\n\n      ' + match
);

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
