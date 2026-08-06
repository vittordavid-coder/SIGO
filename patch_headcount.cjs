const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const targetSaveHeadcount = `    const newQueueItem: OfflinePendingItem = {
      id: \`pwa-team-\${Date.now()}\`,
      type: 'headcount',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        present: parsedPres,
        absent: parseInt(teamAbsent, 10) || 0,
        overtime: parseFloat(teamOvertime) || 0,
        leader: teamLeader || currentUser.name || 'Apontador',
        notes: teamNotes
      },
      synced: false
    };`;

const replaceSaveHeadcount = `    const newQueueItem: OfflinePendingItem = {
      id: \`pwa-team-\${Date.now()}\`,
      type: 'headcount',
      timestamp: new Date().toISOString(),
      contractId: activeContract.id,
      contractName: activeContract.name,
      data: {
        present: parsedPres,
        absent: parseInt(teamAbsent, 10) || 0,
        overtime: parseFloat(teamOvertime) || 0,
        leader: teamLeader || currentUser.name || 'Apontador',
        notes: teamNotes,
        records: rhEmployeeRecords
      },
      synced: false
    };`;

if (content.includes(targetSaveHeadcount)) {
  content = content.replace(targetSaveHeadcount, replaceSaveHeadcount);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched handleSaveHeadcount');
} else {
  console.log('Target not found for handleSaveHeadcount');
}
