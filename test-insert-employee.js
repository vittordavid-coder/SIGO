import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.example', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch ? urlMatch[1] : '';
const key = keyMatch ? keyMatch[1] : '';

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('employees').upsert([{
    id: 'test-employee-1234',
    company_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Vitor Test',
    cpf: '12345678901',
    role: 'Test Role',
    admission_date: '2023-01-01',
    contract_id: null,
    status: 'active',
    payment_type: 'month',
    salary: 1000,
    alojamento_id: null
  }]);
  console.log('Error:', error);
}

test();
