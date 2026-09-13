/**
 * Supabase public configuration. Both values are safe to expose to the browser;
 * data access is protected by Row Level Security. Never put a service-role key here.
 */
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.publishableKey);
