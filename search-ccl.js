import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const { data: rows, error } = await supabase
      .from('app_state')
      .select('id, content');
      
    if (error) {
      console.error('Error fetching app_state:', error);
      return;
    }
    
    console.log(`Searching through ${rows.length} rows in app_state...`);
    let foundCount = 0;
    for (const row of rows) {
      const contentStr = JSON.stringify(row.content || {});
      if (contentStr.toLowerCase().includes('ccl')) {
        console.log(`FOUND 'ccl' in app_state row id: "${row.id}"`);
        // Let's print some preview of where it was found
        const index = contentStr.toLowerCase().indexOf('ccl');
        const start = Math.max(0, index - 100);
        const end = Math.min(contentStr.length, index + 200);
        console.log(`Preview around match: ... ${contentStr.substring(start, end)} ...`);
        foundCount++;
      }
    }
    console.log(`Completed search of app_state. Matches found: ${foundCount}`);

    // Now search "users" table
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) {
      console.error('Error fetching users:', uErr);
    } else {
      let uMatches = 0;
      for (const u of users) {
        const uStr = JSON.stringify(u);
        if (uStr.toLowerCase().includes('ccl')) {
          console.log(`FOUND 'ccl' in users table row:`, u);
          uMatches++;
        }
      }
      console.log(`Completed search of users table. Matches found: ${uMatches}`);
    }

    // Now search "contracts" table
    const { data: contracts, error: cErr } = await supabase.from('contracts').select('*');
    if (cErr) {
      console.error('Error fetching contracts:', cErr);
    } else {
      let cMatches = 0;
      for (const c of contracts) {
        const cStr = JSON.stringify(c);
        if (cStr.toLowerCase().includes('ccl')) {
          console.log(`FOUND 'ccl' in contracts table row:`, c);
          cMatches++;
        }
      }
      console.log(`Completed search of contracts table. Matches found: ${cMatches}`);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
