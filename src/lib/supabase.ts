import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side Supabase client
// Only create if we have valid credentials
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Server-side Supabase client with service role (for API routes)
export const createServerSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  
  return createClient(url, serviceKey);
};
