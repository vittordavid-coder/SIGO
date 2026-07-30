const fs = require('fs');
let file = fs.readFileSync('src/components/ResourceView.tsx', 'utf8');

file = file.replace(
`    rolesMap.forEach((data, roleKey) => {
      const avgHourly = data.count > 0 ? data.totalSalary / data.count : 0;
      if (avgHourly <= 0) return;

      const existing = tempResources.find(r => r.type === 'labor' && r.name.trim().toLowerCase() === roleKey);
      if (existing) {
        onUpdate({
          ...existing,
          basePrice: avgHourly,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
        });
        updatedCount++;
      } else {
        const newCode = getNextCode('labor', tempResources);
        const newRes: Omit<Resource, 'id'> = {
          code: newCode,
          name: data.originalRole,
          unit: 'h',
          type: 'labor',
          basePrice: avgHourly,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
        };
        itemsToAdd.push(newRes);
        tempResources.push({ ...newRes, id: uuidv4() });
      }
    });`,
`    const globalEncargos = getGlobalEncargos();
    rolesMap.forEach((data, roleKey) => {
      const avgHourly = data.count > 0 ? data.totalSalary / data.count : 0;
      if (avgHourly <= 0) return;

      const existing = tempResources.find(r => r.type === 'labor' && r.name.trim().toLowerCase() === roleKey);
      if (existing) {
        onUpdate({
          ...existing,
          basePrice: avgHourly,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
          encargos: globalEncargos,
        });
        updatedCount++;
      } else {
        const newCode = getNextCode('labor', tempResources);
        const newRes: Omit<Resource, 'id'> = {
          code: newCode,
          name: data.originalRole,
          unit: 'h',
          type: 'labor',
          basePrice: avgHourly,
          encargos: globalEncargos,
          monthlySalary: avgHourly * 220,
          hoursPerMonth: 220,
        };
        itemsToAdd.push(newRes);
        tempResources.push({ ...newRes, id: uuidv4() });
      }
    });`
);
fs.writeFileSync('src/components/ResourceView.tsx', file);
