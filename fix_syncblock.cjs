const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(\!isSupabaseSynced && getSupabaseConfig\(\)\.enabled && \!isSyneraCamUrl\) \{/g;
const replacement = `if (!isSupabaseSynced && getSupabaseConfig().enabled && mainTab !== 'mobile') {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
