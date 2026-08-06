const fs = require('fs');
let code = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf-8');

// Update StampConfig
code = code.replace(/customHeaderTitle: string;\n\}/g, "customHeaderTitle: string;\n  showLargeStationTopRight?: boolean;\n}");

// Update DEFAULT_STAMP_CONFIG
code = code.replace(/customHeaderTitle: 'SYNERA CAM • REGISTRO DE CAMPO',\n\};/g, "customHeaderTitle: 'SYNERA CAM • REGISTRO DE CAMPO',\n  showLargeStationTopRight: true,\n};");

fs.writeFileSync('src/components/SyneraMobileView.tsx', code);
