const fs = require('fs');
const file = 'src/components/ResourceView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Insert augmentedResources definition after useState hooks
const hookRegex = /const \[newResource, setNewResource\] = useState<[^>]+>\(\{[\s\S]*?\}\);/;
const augmentedResourcesCode = `
  const augmentedResources = React.useMemo(() => {
    const aug = [...resources];

    // Equipment from Controller
    const existingEqTypes = new Set(aug.filter(r => r.type === 'equipment').map(r => r.name.toLowerCase()));
    controllerEquipments.forEach(eq => {
      if (eq.type && !existingEqTypes.has(eq.type.toLowerCase())) {
        existingEqTypes.add(eq.type.toLowerCase());
        aug.push({
          id: \`eq-auto-\${eq.type}\`,
          code: \`EQ-\${eq.type.substring(0, 3).toUpperCase()}\`,
          name: eq.type,
          unit: 'un',
          type: 'equipment',
          basePrice: 0,
        });
      }
    });

    // Labor from RH
    const roles = new Map<string, { totalSalary: number, count: number }>();
    employees.forEach(emp => {
      if (!emp.role) return;
      const roleKey = emp.role.toLowerCase();
      const current = roles.get(roleKey) || { totalSalary: 0, count: 0 };
      let hourlyRate = emp.salary;
      if (emp.paymentType === 'month') hourlyRate = emp.salary / 220;
      if (emp.paymentType === 'day') hourlyRate = emp.salary / 8;
      
      roles.set(roleKey, {
        totalSalary: current.totalSalary + hourlyRate,
        count: current.count + 1
      });
    });

    const existingLaborTypes = new Set(aug.filter(r => r.type === 'labor').map(r => r.name.toLowerCase()));
    
    roles.forEach((data, roleKey) => {
      if (!existingLaborTypes.has(roleKey)) {
        existingLaborTypes.add(roleKey);
        // Find original role name
        const originalRole = employees.find(e => e.role?.toLowerCase() === roleKey)?.role || roleKey;
        aug.push({
          id: \`mo-auto-\${roleKey}\`,
          code: \`MO-\${originalRole.substring(0, 3).toUpperCase()}\`,
          name: originalRole,
          unit: 'h',
          type: 'labor',
          basePrice: data.totalSalary / data.count,
        });
      } else {
        // Override base price of existing labor resources with RH average
        const existing = aug.find(r => r.type === 'labor' && r.name.toLowerCase() === roleKey);
        if (existing) {
          existing.basePrice = data.totalSalary / data.count;
        }
      }
    });

    return aug;
  }, [resources, employees, controllerEquipments]);
`;
code = code.replace(hookRegex, match => match + '\n' + augmentedResourcesCode);

// 2. Replace 'resources.filter' inside getNextCode
code = code.replace(/const typeResources = resources\.filter/g, 'const typeResources = augmentedResources.filter');

// 3. Replace 'resources.filter' inside sortedResources
code = code.replace(/const filtered = resources\.filter/g, 'const filtered = augmentedResources.filter');

// 4. Update getResourceStats to calculate averagePrice using RH for labor (wait, we already overrode it in augmentedResources! So we don't need to change getResourceStats averagePrice calculation except to use r.basePrice if there are no purchaseOrders). Wait, yes, getResourceStats already falls back to r.basePrice! So it will use the RH average if there are no purchases.

// 5. Update priceHistory to include RH history for labor
const priceHistoryRegex = /const history: \{[^}]+\}\[\] = \[\];\s*\/\/\s*Add initial creation price entry[\s\S]*?rawDate:\s*'0000-00-00'\s*\}\);/;
const historyReplacement = `$&

    // History from RH for Labor
    if (selectedHistoryResource.type === 'labor') {
      const roleName = selectedHistoryResource.name.toLowerCase();
      employees.forEach(emp => {
        if (emp.role && emp.role.toLowerCase() === roleName) {
          let hourlyRate = emp.salary;
          if (emp.paymentType === 'month') hourlyRate = emp.salary / 220;
          if (emp.paymentType === 'day') hourlyRate = emp.salary / 8;

          const dateStr = emp.admissionDate || new Date().toISOString().split('T')[0];
          let formattedDate = dateStr;
          try {
            const parts = dateStr.split('-');
            if (parts.length === 3) formattedDate = \`\${parts[2]}/\${parts[1]}/\${parts[0].slice(2)}\`;
          } catch(e) {}

          history.push({
             date: formattedDate,
             price: hourlyRate,
             quantity: 1,
             total: hourlyRate,
             source: \`Colab: \${emp.name}\`,
             rawDate: dateStr
          });
        }
      });
    }
`;
code = code.replace(priceHistoryRegex, historyReplacement);

fs.writeFileSync(file, code);
