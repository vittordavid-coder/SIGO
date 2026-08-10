const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /await syncFieldReportsStateToSupabase\(updated, \[\]\);\n\n    if \(report && report\.status === 'approved'\)/g,
  "await syncFieldReportsStateToSupabase(updated, [updated.find(r => r.id === reportId)!]);\n\n    if (report && report.status === 'approved')"
);

fs.writeFileSync('src/App.tsx', code);
