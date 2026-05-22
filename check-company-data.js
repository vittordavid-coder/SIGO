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
      .select('id, content')
      .like('id', '8ca27221-3ba6-496f-a8a8-d3d48400cd94_%');
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${rows.length} rows for company 8ca27221-3ba6-496f-a8a8-d3d48400cd94:`);
    for (const row of rows) {
      const content = row.content;
      const isArr = Array.isArray(content);
      const len = isArr ? content.length : (content ? 1 : 0);
      console.log(`- ID: ${row.id} | Type: ${isArr ? 'Array' : 'Object'} | Length/Size: ${len}`);
      if (row.id.includes('contracts') && isArr) {
        console.log('Contracts details:', JSON.stringify(content, null, 2));
      }
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
