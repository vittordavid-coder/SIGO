const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `  const handleProcessSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate download time
      await new Promise(r => setTimeout(r, 800));
      
      const downloadHistory = {
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'download' as const,
        details: \`Atualizou dados (Projetos, Serviços, Funcionários, Equipamentos)\`
      };
      setSyncHistory(prev => [downloadHistory, ...prev].slice(0, 50));

      if (offlineQueue.length === 0) {
        setSyncSuccessMsg('Dados atualizados com sucesso!');
        setTimeout(() => setSyncSuccessMsg(null), 3000);
        return;
      }
    setIsSyncing(true);

    try {`;

const replace = `  const handleProcessSync = async () => {
    setIsSyncing(true);

    try {
      // Simulate download time
      await new Promise(r => setTimeout(r, 800));
      
      const downloadHistory = {
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'download' as const,
        details: \`Atualizou dados (Projetos, Serviços, Funcionários, Equipamentos)\`
      };
      setSyncHistory(prev => [downloadHistory, ...prev].slice(0, 50));

      if (offlineQueue.length === 0) {
        setSyncSuccessMsg('Dados atualizados com sucesso!');
        setTimeout(() => setSyncSuccessMsg(null), 3000);
        setIsSyncing(false);
        return;
      }`;

if (content.includes(target)) {
  content = content.replace(target, replace);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Fixed try catch in handleProcessSync');
} else {
  console.log('Target not found');
}
