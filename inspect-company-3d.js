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
      .like('id', '3d7227cc-bc4b-40c2-9d82-486968d8986a_%');
      
    if (error) {
      console.error(error);
      return;
    }
    
    console.log(`Inspecting rows for company 3d7227cc-bc4b-40c2-9d82-486968d8986a:`);
    for (const row of rows) {
      const content = row.content;
      if (Array.isArray(content) && content.length > 0) {
        console.log(`- Row ID: ${row.id} | Array size: ${content.length}`);
        if (row.id.includes('employees')) {
          console.log('Sample Employees (first 3):', content.slice(0, 3).map(e => ({ name: e.name, cpf: e.cpf, email: e.email, contractId: e.contractId })));
        }
        if (row.id.includes('contracts')) {
          console.log('Contracts details:', content.map(c => ({ id: c.id, name: c.name, contractNumber: c.contractNumber })));
        }
      }
    }
    
    console.log('\nScanning for users with company 3d7227cc-bc4b-40c2-9d82-486968d8986a...');
    const { data: sigoUsersRow } = await supabase
      .from('app_state')
      .select('content')
      .eq('id', 'sigo_users')
      .maybeSingle();
      
    if (sigoUsersRow && sigoUsersRow.content) {
      const matched = sigoUsersRow.content.filter(u => u.companyId === '3d7227cc-bc4b-40c2-9d82-486968d8986a' || u.company_id === '3d7227cc-bc4b-40c2-9d82-486968d8986a');
      console.log('Matched users in sigo_users:', matched);
    }
    
  } catch (err) {
    console.error(err);
  }
}

run();
