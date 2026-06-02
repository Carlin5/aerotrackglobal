import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[db] Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
}

// Server-side client with full permissions
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Client-side client (for browser - use anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureDbReady(): Promise<void> {
  try {
    // Test connection
    const { error } = await db.from('flights').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, which is fine
      throw error;
    }
  } catch (err) {
    console.error('[db] Connection test failed:', err);
    throw err;
  }
}

export async function persistDb(): Promise<void> {
  // Supabase handles persistence automatically
  // This is a no-op but kept for API compatibility
}
