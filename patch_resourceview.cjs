const fs = require('fs');
const file = 'src/components/ResourceView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add fields to newResource initialization
code = code.replace(
  /type: 'material',\n    basePrice: 0,\n  \}\);/,
  `type: 'material',
    basePrice: 0,
    hoursPerMonth: 220,
    monthlySalary: 0,
  });`
);

// 2. Add equipment base cost to augmented resources mapping
// Wait, we can just let React handle the forms.

fs.writeFileSync(file, code);
