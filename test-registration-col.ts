import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://p2rskmdtbgzgzasr4t5zmj-541718405857.us-east1.run.app';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'dummy'; // Actually, we should get credentials from localStorage or .env, but we don't have access...
