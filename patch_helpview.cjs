const fs = require('fs');
let file = fs.readFileSync('src/components/HelpView.tsx', 'utf8');

file = file.replace(
`      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">`,
`      {/* Interactive Architecture Graph */}
      <ArchitectureGraph />

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">`
);

fs.writeFileSync('src/components/HelpView.tsx', file);
