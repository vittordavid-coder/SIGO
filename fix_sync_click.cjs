const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const handleSyncMobileData = async \(\) => \{\s*if \(isSupabaseSynced && getSupabaseConfig\(\)\.enabled\) \{\s*await handleSyncAllToSupabase\(\);\s*\}\s*\};/g;
const replacement = `const handleSyncMobileData = async () => {
    if (getSupabaseConfig().enabled) {
      await handleSyncAllToSupabase();
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
