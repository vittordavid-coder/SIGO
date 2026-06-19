// test_insert.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data, error } = await supabase.from('aportes').select('*').limit(1);
  console.log("Aportes data:", data, "Error:", error);
  
  if (data && data.length > 0) {
     const pId = data[0].id;
     const { data: itemData, error: itemErr } = await supabase.from('aporte_items').insert({
        id: "123e4567-e89b-12d3-a456-426614174000",
        aporte_id: pId,
        categoria: "Test",
        subcategoria: "Test",
        fornecedor: "Test",
        descricao: "Test",
        mes_competencia: "06/2026",
        data_vencimento: "2026-06-18",
        valor: 100
     });
     console.log("Aporte Item Insert result:", itemData, "Error:", itemErr);
  }
}
run();
