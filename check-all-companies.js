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
      .like('id', '%_sconet_contracts');
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${rows.length} contract state rows:`);
    for (const row of rows) {
      const companyId = row.id.split('_sconet_contracts')[0];
      const contracts = row.content || [];
      console.log(`- ID: ${row.id} (Company: ${companyId}) -> ${contracts.length} contracts.`);
      if (contracts.length > 0) {
        console.log('Contract names:', contracts.map(c => c.workName || c.name || c.description));
      }
    }

    // Let's also check for companies in other tables
    const { data: contractsTable, error: cErr } = await supabase.from('contracts').select('*');
    if (cErr) {
      console.error('Error fetching contracts table:', cErr);
    } else {
      console.log(`Contracts in table: ${contractsTable.length}`);
      console.log(contractsTable.map(c => ({ id: c.id, company_id: c.company_id, work_name: c.work_name })));
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
