const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/  \};\n    const updated = \[report, \.\.\.fieldReports/g, "  };\n  const handleSaveFieldReport = async (report: FieldProductionReport): Promise<boolean> => {\n    const updated = [report, ...fieldReports");
fs.writeFileSync('src/App.tsx', code);
