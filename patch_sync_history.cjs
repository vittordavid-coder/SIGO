const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const targetProcessSync = `      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);`;

const replaceProcessSync = `      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      
      const downloadHistory = {
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'download' as const,
        details: \`Atualizou dados (Projetos, Serviços, Funcionários, Equipamentos)\`
      };
      setSyncHistory(prev => [downloadHistory, ...prev].slice(0, 50));`;

if (content.includes(targetProcessSync)) {
  content = content.replace(targetProcessSync, replaceProcessSync);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched handleProcessSync');
} else {
  console.log('Target not found');
}
