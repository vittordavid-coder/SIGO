const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const toReplace = `
    const newProd: ServiceProduction = {
      id: \`prod-appr-\${Date.now()}\`,
      contractId: report.contractId,
      serviceId: report.serviceId,
      serviceName: report.serviceName,
      unit: report.unit,
      quantity: report.qty,
      date: report.productionDate,
      notes: \`[Campo-PWA - Apontado por \${report.reportedBy}] \${report.notes || ''}\`.trim(),
      createdAt: new Date().toISOString()
    };

    setServiceProductions(prev => [newProd, ...prev]);
  };`;

const replace = `
    const newProd: ServiceProduction = {
      id: \`prod-appr-\${Date.now()}\`,
      contractId: report.contractId,
      serviceId: report.serviceId,
      serviceName: report.serviceName,
      unit: report.unit,
      quantity: report.qty,
      date: report.productionDate,
      notes: \`[Campo-PWA - Apontado por \${report.reportedBy}] \${report.notes || ''}\`.trim(),
      createdAt: new Date().toISOString()
    };

    updateServiceProduction(newProd);
  };`;

if (content.includes("setServiceProductions(prev => [newProd, ...prev]);")) {
    // wait, we can just replace that one line
    content = content.replace("setServiceProductions(prev => [newProd, ...prev]);", "updateServiceProduction(newProd);");
    fs.writeFileSync('src/App.tsx', content);
    console.log("Updated handleApproveFieldReport");
} else {
    console.log("Could not find setServiceProductions in handleApproveFieldReport");
}
