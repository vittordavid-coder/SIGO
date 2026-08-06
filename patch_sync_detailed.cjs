const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `      const downloadHistory = {
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'download' as const,
        details: \`Atualizou dados (Projetos, Serviços, Funcionários, Equipamentos)\`
      };
      setSyncHistory(prev => [downloadHistory, ...prev].slice(0, 50));`;

const replace = `      const downloadHistory = [
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-1\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Baixado: Projeto \${activeContract?.name || 'Geral'}\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-2\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Baixado: \${(employees || []).length} colaboradores na Lista de Funcionários\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-3\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Baixado: \${(equipments || []).length} itens na Lista de Equipamentos\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-4\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Baixado: \${(services || []).length} itens na Lista de Serviços\`
        }
      ];
      setSyncHistory(prev => [...downloadHistory, ...prev].slice(0, 50));`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched download history');
} else {
  console.log('Target not found for download history');
}
