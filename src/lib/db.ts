import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _db: SupabaseClient | null = null;
let _supabaseClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      '[db] Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local or Vercel environment variables.',
    );
  }
  return url;
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      '[db] Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local or Vercel environment variables.',
    );
  }
  return key;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      '[db] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set it in .env.local or Vercel environment variables.',
    );
  }
  return key;
}

// Server-side client with full permissions (lazy init)
export function getDb(): SupabaseClient {
  if (!_db) {
    _db = createClient(getSupabaseUrl(), getServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _db;
}

// Backward-compatible export
export const db = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getDb()[prop as keyof SupabaseClient];
  },
});

// Client-side client (for browser - use anon key)
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = createClient(getSupabaseUrl(), getAnonKey());
  }
  return _supabaseClient;
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

export async function ensureDbReady(): Promise<void> {
  try {
    const { error } = await getDb().from('flights').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  } catch (err) {
    console.error('[db] Connection test failed:', err);
    throw err;
  }
}

export async function persistDb(): Promise<void> {
  // Supabase handles persistence automatically
}
