import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL + '/rest/v1/app_state?select=id,updated_at&limit=1';
const key = process.env.VITE_SUPABASE_ANON_KEY;

fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
.then(r => r.json().then(j => ({status: r.status, json: j})))
.then(console.log)
.catch(console.error);
