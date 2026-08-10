const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /await supabase\.from\('field_reports'\)\.delete\(\)\.eq\('id', reportId\);\n        \} catch \(e\) \{\n          console\.warn\('\[Supabase\] Error deleting field report row:', e\);\n        \}\n      \}\n    \}\n\n    await syncFieldReportsStateToSupabase\(updated, \[updated\.find\(r => r\.id === reportId\)!\]\);/g,
  "await supabase.from('field_reports').delete().eq('id', reportId);\n        } catch (e) {\n          console.warn('[Supabase] Error deleting field report row:', e);\n        }\n      }\n    }\n\n    await syncFieldReportsStateToSupabase(updated, []);"
);

fs.writeFileSync('src/App.tsx', code);
