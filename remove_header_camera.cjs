const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const regex = /\{\!isCamOnly && \(\s*<button\s*onClick=\{\(\) => window\.open\("\/cam\.html", "_blank"\)\}\s*className="p-1\.5 rounded-xl bg-slate-800 hover:bg-emerald-500\/20 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors"\s*title="Abrir Synera Cam"\s*>\s*<Camera className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*\)\}/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
    console.log("Removed camera button from header");
} else {
    console.log("Camera button not found");
}
