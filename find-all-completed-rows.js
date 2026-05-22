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
    
    console.log(`Scanning ${rows.length} rows in app_state for non-empty content...`);
    for (const row of rows) {
      const content = row.content;
      if (!content) continue;
      
      if (Array.isArray(content) && content.length > 0) {
        console.log(`- ID: ${row.id} | Array length: ${content.length}`);
        if (row.id.includes('contracts')) {
          console.log(`  Contracts:`, content.map(c => c.workName || c.name));
        }
      } else if (typeof content === 'object' && !Array.isArray(content)) {
        // Only print interesting objects
        const keys = Object.keys(content);
        if (keys.length > 2) {
          console.log(`- ID: ${row.id} | Object keys: ${keys.length} (${keys.slice(0,5).join(', ')})`);
        }
      }
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
