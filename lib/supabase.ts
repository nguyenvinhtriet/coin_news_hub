// Audit: Code file description updated for deployment - 2026-04-15
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (url: string, key: string) => {
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
};
