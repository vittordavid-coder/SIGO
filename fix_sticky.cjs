const fs = require('fs');
const content = fs.readFileSync('src/components/TechnicalRoomExtensions.tsx', 'utf8');

const updated = content
  .replace(/ sticky right-\[100px\] z-10/g, '')
  .replace(/ sticky right-0 z-10/g, '')
  .replace(/ sticky right-\[100px\] z-30/g, '')
  .replace(/ sticky right-0 z-30/g, '')
  .replace(/ shadow-\[-1px_0_0_0_rgba\(0,0,0,0\.1\)\]/g, '')
  .replace(/ shadow-\[-1px_0_0_0_rgba\(255,255,255,0\.1\)\]/g, '');

fs.writeFileSync('src/components/TechnicalRoomExtensions.tsx', updated);
console.log('done');
