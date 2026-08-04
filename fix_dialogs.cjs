const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const dialogBlockRegex = /<Dialog>\s*<DialogTrigger asChild>\s*<Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500\/25 mt-1">\s*<Download className="w-4 h-4 text-slate-950 stroke-\[3\]" \/>\s*Instalar Synera Mobile\s*<\/Button>\s*<\/DialogTrigger>\s*<DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-white rounded-2xl">\s*<DialogHeader>\s*<DialogTitle className="text-lg font-black text-white">Instalar Aplicativo<\/DialogTitle>\s*<DialogDescription className="text-slate-400 text-xs">\s*Escolha qual aplicativo do pacote Synera você deseja instalar neste dispositivo\.\s*<\/DialogDescription>\s*<\/DialogHeader>\s*<div className="flex flex-col gap-3 py-4">\s*<Button \s*onClick=\{\(\) => \{ if\(!isCamOnly\) \{ handleInstallPwa\(\); \} else \{ window\.location\.href = "\/"; \} \}\}\s*className="h-14 bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 text-white justify-start gap-4"\s*>\s*<div className="w-8 h-8 rounded-full bg-blue-500\/20 flex items-center justify-center shrink-0">\s*<LayoutDashboard className="w-4 h-4 text-blue-400" \/>\s*<\/div>\s*<div className="flex flex-col items-start">\s*<span className="font-bold text-sm">Synera Mobile \(Campo\)<\/span>\s*<span className="text-\[10px\] text-slate-400 font-normal">Apontamentos, diários e requisições<\/span>\s*<\/div>\s*<\/Button>\s*<Button \s*onClick=\{\(\) => \{ if\(isCamOnly\) \{ handleInstallPwa\(\); \} else \{ window\.location\.href = "\/cam\.html"; \} \}\}\s*className="h-14 bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 text-white justify-start gap-4"\s*>\s*<div className="w-8 h-8 rounded-full bg-emerald-500\/20 flex items-center justify-center shrink-0">\s*<Camera className="w-4 h-4 text-emerald-400" \/>\s*<\/div>\s*<div className="flex flex-col items-start">\s*<span className="font-bold text-sm">Synera Cam<\/span>\s*<span className="text-\[10px\] text-slate-400 font-normal">Fotos com coordenadas e dados da obra<\/span>\s*<\/div>\s*<\/Button>\s*<\/div>\s*<\/DialogContent>\s*<\/Dialog>/g;

const matches = content.match(dialogBlockRegex);
console.log("Found matches:", matches ? matches.length : 0);

if (matches && matches.length > 0) {
    const dialogBlock = matches[0];
    const backButton = `<button onClick={() => setActiveSector(null)} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>`;
    
    // Replace all occurrences with back button
    content = content.replace(dialogBlockRegex, backButton);

    // But wait, one of them needs to be inside the PWA Guide!
    // Let's find where the PWA guide is.
    const pwaGuideAnchor = /<div className="space-y-3 text-xs text-slate-300">[\s\S]*?<\/div>\s*<button onClick=\{\(\) => setActiveSector\(null\)\}/;
    
    content = content.replace(pwaGuideAnchor, (match) => {
        return match.replace('<button onClick={() => setActiveSector(null)}', dialogBlock + '\n                <button onClick={() => setActiveSector(null)}');
    });

    // Let's check if the one in the footer navigation was replaced
    const footerNavRegex = /<button onClick=\{\(\) => setActiveSector\(null\)\} className="p-2 rounded-xl bg-slate-700\/50 hover:bg-slate-600\/50 text-slate-300 transition-colors"><ArrowLeft className="w-5 h-5" \/><\/button>\s*<span className="text-\[10px\]">Início<\/span>\s*<\/button>/;
    
    // Actually the footer had <button onClick={() => setActiveSector(null)} className={`flex flex-col...
    // Let's just restore from git? No git.
    
    fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
    console.log("Fixed dialogs");
}
