const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const newMenu = `
              {/* MENU SUPERIOR DA CÂMERA (Configurações e Alternar Câmera) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowStampSettingsModal(true)}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-emerald-400 hover:bg-slate-800 text-xs font-bold transition-all"
                  title="Configurações (Estilo e Posição)"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className={\`p-2 rounded-xl border text-xs font-bold transition-all \${
                    facingMode === 'user' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-slate-900/80 text-slate-400 border-slate-700'
                  }\`}
                  title={facingMode === 'user' ? 'Câmera Frontal Ativa (Mudar para Traseira)' : 'Câmera Traseira Ativa (Mudar para Frontal)'}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
`;

code = code.replace(/\{\/\* OPÇÕES DE QUALIDADE, GRADE, TIPO DE CÂMERA, ROTAÇÃO E FLASH \*\/\}[\s\S]*?(?=\{\/\* PREVIEW DO VÍDEO \/ FOTO CAPTURADA \/ CARD DE FALLBACK \*\/})/g, newMenu.trim() + '\n\n            ');

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
