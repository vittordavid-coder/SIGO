const fs = require('fs');
const file = 'src/components/ResourceView.tsx';
let code = fs.readFileSync(file, 'utf8');

const historyEqOp = `
    // If it's equipment and has an operator, the operator's history affects the equipment
    if (selectedHistoryResource.type === 'equipment' && selectedHistoryResource.operatorId) {
      const op = augmentedResources.find(r => r.id === selectedHistoryResource.operatorId);
      if (op) {
        // Find operator history in RH
        if (op.type === 'labor') {
          const roleName = op.name.toLowerCase();
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
              
              const eqCost = selectedHistoryResource.equipmentBaseCost || 0;
              history.push({
                 date: formattedDate,
                 price: eqCost + hourlyRate,
                 quantity: 1,
                 total: eqCost + hourlyRate,
                 source: \`Colab (Op): \${emp.name}\`,
                 rawDate: dateStr
              });
            }
          });
        }
        
        // Also check operator purchases
        const opCode = op.code.trim().toLowerCase();
        const opName = op.name.trim().toLowerCase();
        purchaseOrders.forEach(po => {
           // similar to what is done below, but add eqCost
           const orderDateRaw = po.orderDate || new Date().toISOString().split('T')[0];
           let formattedDate = orderDateRaw;
           try {
             const parts = orderDateRaw.split('-');
             if (parts.length === 3) formattedDate = \`\${parts[2]}/\${parts[1]}/\${parts[0].slice(2)}\`;
           } catch(e) {}
           
           po.items.forEach(item => {
             const itemCode = (item.resourceCode || '').trim().toLowerCase();
             const itemName = (item.description || '').trim().toLowerCase();
             if ((itemCode && itemCode === opCode) || (!itemCode && itemName && itemName.includes(opName))) {
                const eqCost = selectedHistoryResource.equipmentBaseCost || 0;
                history.push({
                  date: formattedDate,
                  price: eqCost + item.unitPrice,
                  quantity: item.quantity,
                  total: eqCost + item.unitPrice,
                  source: \`Compra (Op): Pedido #\${po.id.substring(0,6)}\`,
                  rawDate: orderDateRaw
                });
             }
           });
        });
      }
    }
`;

code = code.replace(
  /const codeToMatch = selectedHistoryResource\.code\.trim\(\)\.toLowerCase\(\);/,
  historyEqOp + '\n    $&'
);

fs.writeFileSync(file, code);
