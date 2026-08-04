const fs = require('fs');
let content = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8');

content = content.replace(
    /<\/button>\s*<\/div>\s*<\/div>\s*\) : \(/,
    "                    </button>\n                  </div>\n                </div>\n              </div>\n              ) : ("
);

fs.writeFileSync('src/components/SyneraMobileView.tsx', content);
console.log("Fixed syntax error");
