const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

// Remove the drawing of the large station
const regex = /if \(config\.showLargeStationTopRight[\\s\\S]*?ctx\.restore\(\);\s*\}/g;
code = code.replace(regex, '');

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
