const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. handleSaveFieldReport
code = code.replace(
  /await syncFieldReportsStateToSupabase\(updated\);\n    return true;\n  \};\n\n  const handleUpdateFieldReport/g,
  "await syncFieldReportsStateToSupabase(updated, [report]);\n    return true;\n  };\n\n  const handleUpdateFieldReport"
);

// 2. handleUpdateFieldReport
code = code.replace(
  /await syncFieldReportsStateToSupabase\(updated\);\n    if \(report\.status === 'approved'\)/g,
  "await syncFieldReportsStateToSupabase(updated, [report]);\n    if (report.status === 'approved')"
);

// 3. handleDeleteFieldReport
code = code.replace(
  /await syncFieldReportsStateToSupabase\(updated\);\n\n    if \(report && report\.status === 'approved'\)/g,
  "await syncFieldReportsStateToSupabase(updated, []);\n\n    if (report && report.status === 'approved')"
);

// 4. handleApproveFieldReport
code = code.replace(
  /await syncFieldReportsStateToSupabase\(updated\);\n      recalculateServiceProductionFromReports\(updatedReport, updated\);\n      return true;/g,
  "await syncFieldReportsStateToSupabase(updated, [updatedReport]);\n      recalculateServiceProductionFromReports(updatedReport, updated);\n      return true;"
);

// 5. handleRejectFieldReport
code = code.replace(
  /await syncFieldReportsStateToSupabase\(updatedFieldReports\);\n\n    if \(report\.status === 'approved'\)/g,
  "await syncFieldReportsStateToSupabase(updatedFieldReports, [updatedReport]);\n\n    if (report.status === 'approved')"
);

fs.writeFileSync('src/App.tsx', code);
