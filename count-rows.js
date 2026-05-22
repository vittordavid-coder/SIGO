import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  'users',
  'contracts',
  'measurements',
  'employees',
  'time_records',
  'schedules',
  'controller_teams',
  'equipments',
  'equipment_maintenance',
  'equipment_monthly_data',
  'controller_manpower',
  'manpower_monthly_data',
  'team_assignments',
  'suppliers',
  'purchase_orders',
  'purchase_requests',
  'purchase_quotations',
  'equipment_transfers',
  'fuel_reservoirs',
  'fuel_logs',
  'app_state'
];

async function run() {
  try {
    console.log('Counting rows in all tables in Supabase:');
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`- ${table}: Error or not exists (${error.message})`);
        } else {
          console.log(`- ${table}: ${count} rows`);
        }
      } catch (err) {
        console.log(`- ${table}: Exception (${err.message})`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
