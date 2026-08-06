const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const targetSection = `
            {/* 5. DADOS A SEREM GRAVADOS */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <Label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                5. Informações Exibidas no Carimbo
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
`;

const toggle = `
                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
                  <div className={\`w-10 h-6 rounded-full p-1 transition-colors \${stampConfig.showLargeStationTopRight ? 'bg-emerald-500' : 'bg-slate-700'}\`}>
                    <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${stampConfig.showLargeStationTopRight ? 'translate-x-4' : ''}\`} />
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">Estaca Grande (Top Direito)</span>
                </label>
`;

// Insert the new toggle right after the grid container starts
const startIndex = code.indexOf(targetSection);
if (startIndex !== -1) {
  const insertionPoint = startIndex + targetSection.length;
  code = code.substring(0, insertionPoint) + toggle + code.substring(insertionPoint);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
  console.log("Toggle added.");
} else {
  console.log("Target section not found.");
}
