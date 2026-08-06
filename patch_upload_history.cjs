const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const targetUploadHistory = `      const newHistoryItems = offlineQueue.map(item => ({
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'upload' as const,
        details: \`Sincronizou \${item.type}: \${item.contractName}\`
      }));`;

const replaceUploadHistory = `      const newHistoryItems = offlineQueue.map(item => ({
        id: \`sh-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
        timestamp: new Date().toISOString(),
        action: 'upload' as const,
        details: \`Enviado [\${item.type === 'production' ? 'Produção' : item.type === 'equipment' ? 'Equipamento' : item.type === 'headcount' ? 'RH' : item.type === 'materials' ? 'Material' : 'Diário'}]: \${item.type === 'production' ? item.data.qty + ' ' + item.data.unit + ' de ' + (item.data.serviceName || 'Serviço') : item.type === 'equipment' ? item.data.equipmentName + ' (' + item.data.horometer + 'h)' : item.type === 'headcount' ? item.data.present + ' presentes' : item.type === 'materials' ? item.data.qty + ' ' + item.data.unit + ' de ' + item.data.materialName : 'Relatório Diário'}\`
      }));`;

if (content.includes(targetUploadHistory)) {
  content = content.replace(targetUploadHistory, replaceUploadHistory);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched upload history');
} else {
  console.log('Target not found for upload history');
}
