const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/import \{ ([^}]+)\} from "lucide-react";/, function(match, p1) {
  if (!p1.includes('Smartphone')) {
    return 'import { Smartphone, ' + p1 + '} from "lucide-react";';
  }
  return match;
});
fs.writeFileSync('src/App.tsx', content);
