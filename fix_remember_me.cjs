const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
    /return window\.localStorage\.getItem\('sigo_remember_me'\) === 'true';/,
    "const stored = window.localStorage.getItem('sigo_remember_me'); return stored !== 'false';"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed remember me");
