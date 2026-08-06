const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

const newHistory = `
      const numServices = services.filter(s => s.contractId === activeContract?.id || !s.contractId).length;
      const numEmployees = (employees || []).length;
      const numEquipments = (equipments || []).length;

      const downloadHistory = [
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
          details: \`Lista de Funcionários \${numEmployees} colaboradores\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-3\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Lista de Equipamentos \${numEquipments}\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-4\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Lista de Serviços atualizados (\${numServices})\`
        },
        {
          id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}-5\`,
          timestamp: new Date().toISOString(),
          action: 'download' as const,
          details: \`Lista de materiais atualizados\`
        }
      ];
`;

code = code.replace(/const downloadHistory = \[\s*\{\s*id: `sh-\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 7\)\}-1`,[\s\S]*?details: `Baixado: \$\{\(services \|\| \[\]\)\.length\} itens na Lista de Serviços`\s*\}\s*\];/, newHistory.trim());

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
