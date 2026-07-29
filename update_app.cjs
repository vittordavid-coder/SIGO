const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const updateResourceLogic = `
  const updateResource = (updatedResource: Resource) => {
    if (resources.some(r => r.code === updatedResource.code && r.id !== updatedResource.id) || 
        services.some(s => s.code === updatedResource.code)) {
      alert(\`O código \${updatedResource.code} já está em uso.\`);
      return;
    }
    
    updateResources(resources.map(r => {
      if (r.id === updatedResource.id) return updatedResource;
      
      // Cascade operator changes to equipments
      if (r.type === 'equipment' && r.operatorId === updatedResource.id) {
         return {
           ...r,
           basePrice: (r.equipmentBaseCost || 0) + updatedResource.basePrice
         };
      }
      return r;
    }));
    
    addAuditLog('Edição', 'Insumos', \`Insumo editado: \${updatedResource.code}\`);
  };
`;

code = code.replace(
  /const updateResource = \([\s\S]*?addAuditLog\('Edição', 'Insumos'[\s\S]*?\};\n/,
  updateResourceLogic.trim() + '\n'
);

fs.writeFileSync(file, code);
