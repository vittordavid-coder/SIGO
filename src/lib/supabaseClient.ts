import { createClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
  enabled: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  // 1. Check LocalStorage (takes priority for user/admin overrides)
  const stored = localStorage.getItem('supabase_config');
  if (stored) {
    try {
      const config = JSON.parse(stored);
      if (config.url && config.key) return config;
    } catch (e) {
      console.error('Error parsing Supabase config', e);
    }
  }

  // 2. Check Environment Variables (useful for Vercel/Production deploys)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return { 
      url: envUrl, 
      key: envKey, 
      enabled: true 
    };
  }

  return { url: '', key: '', enabled: false };
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem('supabase_config', JSON.stringify(config));
};

let cachedClient: any = null;
let cachedConfig: string = '';

export const createSupabaseClient = (url: string, key: string) => {
  if (!url || !key) return null;
  
  const configKey = `${url}:${key}`;
  if (cachedClient && cachedConfig === configKey) {
    return cachedClient;
  }

  cachedClient = createClient(url, key);
  cachedConfig = configKey;
  return cachedClient;
};
