const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(/<\/div>\s*<\/div>\s*<\/motion\.div>\s*}\s*<\/AnimatePresence>/g, 
  '</div></motion.div>)}</AnimatePresence>');

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
