const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let regex = /const handleSyncAllToSupabase = async \(\) => \{/g;
let replacement = `const handleSyncAllToSupabase = async (force = false) => {`;
code = code.replace(regex, replacement);

regex = /if \(\!config\.enabled \|\| \!config\.url \|\| \!config\.key \|\| \!currentUser \|\| \!isSupabaseSynced \|\| supabaseSyncError\) \{/g;
replacement = `if (!config.enabled || !config.url || !config.key || !currentUser || (!force && (!isSupabaseSynced || supabaseSyncError))) {`;
code = code.replace(regex, replacement);

regex = /const handleSyncMobileData = async \(\) => \{\s*if \(getSupabaseConfig\(\)\.enabled\) \{\s*await handleSyncAllToSupabase\(\);\s*\}\s*\};/g;
replacement = `const handleSyncMobileData = async () => {
    if (getSupabaseConfig().enabled) {
      setSupabaseSyncError(null);
      await handleSyncAllToSupabase(true);
    }
  };`;
code = code.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', code);
