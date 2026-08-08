const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

code = code.replace(/\{emp\.name\.split\(' '\)\.map\(n => n\[0\]\)\.slice\(0, 2\)\.join\(''\)\}/g, "{emp.name ? emp.name.split(' ').filter(n=>n).map(n => n[0]).slice(0, 2).join('') : 'UN'}");

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
