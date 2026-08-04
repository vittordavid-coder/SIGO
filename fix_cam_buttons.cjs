const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

// The section is around `DISPARADOR DE CAPTURA / SALVAR`
// Let's replace the content after ` {/* DISPARADOR DE CAPTURA / SALVAR */}`
const startMarker = '{/* DISPARADOR DE CAPTURA / SALVAR */}';
const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const nextSection = content.indexOf('</motion.div>', startIndex);
  
  const originalButtons = `
              {capturedPhotoUrl ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      setPhotoDescription('');
                    }}
                    className="w-full h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider"
                  >
                    Descartar
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSavePhotoRecord}
                      className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/25"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Salvar
                    </Button>
                    <a 
                      href={capturedPhotoUrl} 
                      download={\`synera_cam_\${Date.now()}.jpg\`}
                      className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-700 text-white shrink-0"
                    >
                      <Download className="w-5 h-5 text-blue-400" />
                    </a>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleTakePhoto}
                  className="w-full h-14 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/30 gap-2 mt-1"
                >
                  <Camera className="w-6 h-6" />
                  CAPTURAR FOTO
                </Button>
              )}
            </div>
          </div>
  `;
  
  content = content.substring(0, startIndex + startMarker.length) + originalButtons + content.substring(nextSection);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
}
