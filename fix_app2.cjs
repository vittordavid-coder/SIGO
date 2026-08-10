const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const correctCode = `  const pendingFieldReports = useMemo(() => {
    return fieldReports.filter(r => 
      !r.id.startsWith('photo-') && 
      r.status !== 'approved' && 
      r.status !== 'rejected' &&
      (!selectedContractId || !r.contractId || r.contractId === selectedContractId)
    ).length;
  }, [fieldReports, selectedContractId]);`;

code = code.replace(/  const pendingFieldReports = useMemo\(\(\) => \{\n    return fieldReports\.filter\(r => \n      !r\.id\.startsWith\('photo-'\) && \n  \}, \[fieldReports, selectedContractId\]\);/g, correctCode);
fs.writeFileSync('src/App.tsx', code);
