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
      console.error(error);
      return;
    }
    
    // Search for 3d7227cc-bc4b-40c2-9d82-486968d8986a
    for (const row of rows) {
      const s = JSON.stringify(row.content || {});
      if (s.includes('3d7227cc-bc4b-40c2-9d82-486968d8986a')) {
        console.log(`Found 3d7227cc-bc4b-40c2-9d82-486968d8986a in ${row.id}`);
        // Log some context
        const idx = s.indexOf('3d7227cc-bc4b-40c2-9d82-486968d8986a');
        console.log(`  Context: ${s.substring(Math.max(0, idx - 100), Math.min(s.length, idx + 200))}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
