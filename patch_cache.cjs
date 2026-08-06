const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(
  "employees: (employees || []).map(emp => ({ id: emp.id, name: emp.name, role: emp.role, team: emp.team, status: emp.status }))",
  "employees: (employees || []).map(emp => ({ id: emp.id, name: emp.name, registrationNumber: emp.registrationNumber, role: emp.role, team: emp.team, status: emp.status }))"
);

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log('Patched CACHE_KEY payload');
