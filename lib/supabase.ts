import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (url: string, key: string) => {
  if (!url || !key) return null;
  return createClient(url, key);
};
