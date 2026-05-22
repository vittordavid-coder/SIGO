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
    const { data: row, error } = await supabase
      .from('app_state')
      .select('*')
      .eq('id', 'sigo_current_user')
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching sigo_current_user:', error);
    } else if (row) {
      console.log('sigo_current_user content:');
      console.log(JSON.stringify(row.content, null, 2));
    } else {
      console.log('sigo_current_user row is null');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
