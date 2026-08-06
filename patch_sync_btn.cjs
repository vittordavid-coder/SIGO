const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const targetProcessSync = `  const handleProcessSync = async () => {
    if (offlineQueue.length === 0) return;`;

const replaceProcessSync = `  const handleProcessSync = async () => {
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
      }`;

const targetButton = `                  {offlineQueue.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 mt-4">
                      <Button
                        onClick={handleProcessSync}
                        disabled={isSyncing || !isOnline}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider"
                      >
                        {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Agora'}
                      </Button>
                    </div>
                  )}`;

const replaceButton = `                  <div className="pt-2 border-t border-slate-700/60 mt-4">
                    <Button
                      onClick={handleProcessSync}
                      disabled={isSyncing || !isOnline}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider"
                    >
                      {isSyncing ? 'Sincronizando...' : (offlineQueue.length > 0 ? 'Sincronizar Envio e Recebimento' : 'Atualizar Dados Offline')}
                    </Button>
                  </div>`;

if (content.includes('if (offlineQueue.length === 0) return;')) {
  content = content.replace(targetProcessSync, replaceProcessSync);
  content = content.replace(targetButton, replaceButton);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched sync button');
} else {
  console.log('Target not found');
}
