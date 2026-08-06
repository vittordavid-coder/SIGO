const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const targetSection = `
            {/* 5. SELEÇÃO DE CAMPOS VISÍVEIS */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Campos a Gravar na Foto
              </Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
`;

const toggle = `
                <button
                  type="button"
                  onClick={() => updateStampConfig({ showLargeStationTopRight: !stampConfig.showLargeStationTopRight })}
                  className={\`p-2.5 rounded-xl border flex items-center justify-between font-bold transition-colors \${
                    stampConfig.showLargeStationTopRight ? 'bg-slate-800 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }\`}
                >
                  <span>Estaca Grande (Top Direito)</span>
                  {stampConfig.showLargeStationTopRight ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                </button>
`;

code = code.replace(/\{\/\* 5\. SELEÇÃO DE CAMPOS VISÍVEIS \*\/\}[\s\S]*?<div className="grid grid-cols-2 gap-2 text-xs">/, match => match + toggle);

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
console.log("Toggle patched.");
