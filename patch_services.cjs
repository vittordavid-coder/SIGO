const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

const target = `  // Filtered services for current contract
  const contractServices = useMemo(() => {
    return services.filter(s => s.contractId === activeContract.id || !s.contractId);
  }, [services, activeContract.id]);`;

const replacement = `  // Filtered services for current contract - ONLY show services that have controls created in Sala Técnica / Controles
  const contractServices = useMemo(() => {
    const baseServices = services.filter(s => s.contractId === activeContract.id || !s.contractId);

    // Filter by created controls in Sala Técnica / Controles
    const controlledServiceIds = new Set(
      serviceProductions
        .filter(p => p.contractId === activeContract.id || !p.contractId)
        .map(p => p.serviceId)
    );

    return baseServices.filter(s => controlledServiceIds.has(s.id));
  }, [services, serviceProductions, activeContract.id]);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
  console.log('Patched contractServices back to controlled');
} else {
  console.log('Target not found for contractServices');
}
