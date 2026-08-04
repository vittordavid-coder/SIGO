const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

// The replacement was missing \`</motion.div>\` correctly?
// I will just put the end correctly.

content = content.replace('</div>\\n          </div>\\n  </motion.div>', '</div>\\n  </motion.div>');
// or replace the end
fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
