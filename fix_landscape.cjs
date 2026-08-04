const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(
    /className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto"/g,
    'className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between w-full h-full"'
);

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log("Fixed landscape mode layout");
