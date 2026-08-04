const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(/<\/div>\n  <\/motion\.div>\n\)}\n<\/AnimatePresence>/g, 
  '</motion.div>)}</AnimatePresence>');

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
