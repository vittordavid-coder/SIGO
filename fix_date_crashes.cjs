const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

// Replace all instances of `new Date(...).toLocaleDateString` that might crash
code = code.replace(/new Date\((m\.date)\)\.toLocaleDateString\('pt-BR'\)/g, "($1 ? new Date($1).toLocaleDateString('pt-BR') : '')");
code = code.replace(/new Date\((report\.timestamp)\)\.toLocaleDateString\('pt-BR'\)/g, "($1 && !isNaN(new Date($1).getTime()) ? new Date($1).toLocaleDateString('pt-BR') : report.date)");

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
