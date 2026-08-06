const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `              sector: 'RH',
              action: 'APONTAMENTO DE MÃO DE OBRA',
              description: \`Registro de efetivo de campo: \${item.data.present} presentes, \${item.data.absent} faltas\`,
              referenceCode: \`RH-\${item.id.slice(-4)}\`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: \`Líder: \${item.data.leader}. Horas Extras: \${item.data.overtime}h. \${item.data.notes}\`
              }`;

const replace = `              sector: 'RH',
              action: 'APONTAMENTO DE MÃO DE OBRA',
              description: \`Registro de efetivo de campo: \${item.data.present} presentes, \${item.data.absent} faltas\`,
              referenceCode: \`RH-\${item.id.slice(-4)}\`,
              contractName: item.contractName,
              responsibleUser: currentUser.name || 'Apontador de Campo',
              details: {
                notes: \`Líder: \${item.data.leader}. Horas Extras: \${item.data.overtime}h. \${item.data.notes}\`,
                records: item.data.records
              }`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched handleProcessSync for headcount records');
} else {
  console.log('Target not found for handleProcessSync headcount');
}
