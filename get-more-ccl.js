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
      .in('id', [
        '3d7227cc-bc4b-40c2-9d82-486968d8986a_sigo_default_org',
        '8ca27221-3ba6-496f-a8a8-d3d48400cd94_sigo_default_org'
      ]);
      
    if (error) {
      console.error(error);
      return;
    }
    
    console.log('Default Org rows:', rows.map(r => ({ id: r.id, content: r.content })));
    
    // Let's also check if there is any user row in sigo_users matching these company IDs
    const { data: sigoUsersRow } = await supabase
      .from('app_state')
      .select('content')
      .eq('id', 'sigo_users')
      .maybeSingle();
      
    if (sigoUsersRow && sigoUsersRow.content) {
      console.log('All companies represented in sigo_users list:');
      const uniqueComps = {};
      sigoUsersRow.content.forEach(u => {
        uniqueComps[u.companyId] = u.companyName || '(no company name)';
      });
      console.log(uniqueComps);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
